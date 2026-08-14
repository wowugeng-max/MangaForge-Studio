import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { SkillPathError, validateSkillPackArchiveEntry } from '../../skills/path-safety'
import { WRITING_SKILL_IDS } from './types'
import {
  MAX_INSTALLED_REFERENCE_BYTES,
  MAX_INSTALLED_REFERENCE_COUNT,
  MAX_INSTALLED_REFERENCES_TOTAL_BYTES,
  MAX_INSTALLED_SKILL_MD_BYTES,
  WRITING_SKILL_PACK_ID_RE,
  invalidateInstalledWritingSkillPackCache,
  listInstalledWritingSkillPacks,
  writingSkillPacksRoot,
  type InstalledWritingSkillPack,
} from './installed-store'

export const MAX_WRITING_SKILL_ARCHIVE_BYTES = 128 * 1024 * 1024
export const MAX_WRITING_SKILL_EXTRACTED_BYTES = 4 * 1024 * 1024
const GITHUB_REDIRECT_STATUSES = new Set([301, 302, 307, 308])

export type WritingSkillInstallErrorCode =
  | 'INVALID_URL'
  | 'ID_CONFLICT_BUILTIN'
  | 'SKILL_MD_MISSING'
  | 'BOUNDS_EXCEEDED'
  | 'DOWNLOAD_FAILED'
  | 'BUILTIN_NOT_REMOVABLE'
  | 'NOT_INSTALLED'
  | 'INSTALL_FAILED'

export class WritingSkillInstallError extends Error {
  readonly code: WritingSkillInstallErrorCode
  readonly cause?: unknown

  constructor(code: WritingSkillInstallErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'WritingSkillInstallError'
    this.code = code
    this.cause = cause
  }
}

export type WritingSkillRepoSource = {
  owner: string
  repo: string
  id: string
  canonical_url: string
}

export function normalizeWritingSkillPackId(repo: string): string {
  const id = String(repo || '')
    .toLowerCase()
    .replace(/[._]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!WRITING_SKILL_PACK_ID_RE.test(id)) {
    throw new WritingSkillInstallError('INVALID_URL', `Repository name cannot become a writing skill id: ${repo}`)
  }
  return id
}

export function parseWritingSkillGitHubUrl(source: string): WritingSkillRepoSource {
  if (
    typeof source !== 'string'
    || source.trim() !== source
    || /[\s\\]/.test(source)
    || !/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\.git)?$/.test(source)
  ) {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub repository URL: ${source}`)
  }
  let url: URL
  try {
    url = new URL(source)
  } catch {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub URL: ${source}`)
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.search || url.hash || url.username || url.password) {
    throw new WritingSkillInstallError('INVALID_URL', `Only public github.com HTTPS URLs are allowed: ${source}`)
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*?)(?:\.git)?$/)
  if (!match || match[1] === '.' || match[1] === '..' || match[2] === '.' || match[2] === '..') {
    throw new WritingSkillInstallError('INVALID_URL', `Invalid GitHub repository URL: ${source}`)
  }
  const owner = match[1]
  const repo = match[2]
  const id = normalizeWritingSkillPackId(repo)
  if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) {
    throw new WritingSkillInstallError('ID_CONFLICT_BUILTIN', `"${id}" is a builtin writing skill id`)
  }
  return { owner, repo, id, canonical_url: `https://github.com/${owner}/${repo}` }
}

function parseWritingSkillArchiveRedirect(location: string, source: WritingSkillRepoSource): string {
  let url: URL
  try {
    url = new URL(location)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback returned an invalid redirect URL', error)
  }
  const lexical = /^https:\/\/codeload\.github\.com\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\/zip\/[0-9a-fA-F]{40}$/.test(location)
  const parts = url.pathname.split('/')
  const [empty, owner, name, format, sha] = parts
  if (
    !lexical
    || url.protocol !== 'https:'
    || url.hostname !== 'codeload.github.com'
    || url.port || url.search || url.hash || url.username || url.password
    || parts.length !== 5
    || empty !== ''
    || owner?.toLowerCase() !== source.owner.toLowerCase()
    || name?.toLowerCase() !== source.repo.toLowerCase()
    || format !== 'zip'
    || !/^[0-9a-f]{40}$/i.test(sha ?? '')
  ) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback returned an untrusted redirect')
  }
  return sha
}

async function cancelResponseBody(response: Response): Promise<void> {
  try { await response.body?.cancel() } catch { /* cleanup must not mask installer errors */ }
}

export async function resolveWritingSkillHeadRevision(
  source: WritingSkillRepoSource,
  fetchImpl: typeof fetch,
): Promise<string> {
  const headUrl = `https://api.github.com/repos/${source.owner}/${source.repo}/commits/HEAD`
  let headResponse: Response
  try {
    headResponse = await fetchImpl(headUrl, { headers: { accept: 'application/vnd.github+json' } })
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to fetch ${headUrl}`, error)
  }
  if (headResponse.ok) {
    try {
      const head = await headResponse.json() as { sha?: unknown }
      if (typeof head.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(head.sha)) throw new Error('missing sha')
      return head.sha
    } catch (error) {
      throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub HEAD response did not contain a valid commit SHA', error)
    }
  }
  await cancelResponseBody(headResponse)
  if (headResponse.status !== 403 && headResponse.status !== 429) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `GitHub HEAD request failed: ${headResponse.status}`)
  }
  let fallbackResponse: Response
  try {
    fallbackResponse = await fetchImpl(`https://github.com/${source.owner}/${source.repo}/archive/HEAD.zip`, {
      method: 'HEAD',
      redirect: 'manual',
    })
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to resolve GitHub archive HEAD for ${source.owner}/${source.repo}`, error)
  }
  const fallbackStatus = fallbackResponse.status
  const location = fallbackResponse.headers.get('location')
  await cancelResponseBody(fallbackResponse)
  if (!GITHUB_REDIRECT_STATUSES.has(fallbackStatus)) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `GitHub archive fallback failed: ${fallbackStatus}`)
  }
  if (!location) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'GitHub archive fallback did not return a redirect location')
  }
  return parseWritingSkillArchiveRedirect(location, source)
}

function archiveEntryType(entry: JSZip.JSZipObject): 'file' | 'directory' | 'symlink' {
  const mode = typeof entry.unixPermissions === 'number' ? entry.unixPermissions : 0
  if (mode && (mode & 0xf000) === 0xa000) return 'symlink'
  if (entry.dir) return 'directory'
  return 'file'
}

const MAX_WRITING_SKILL_PACKS_PER_REPO = 16
const MAX_NESTED_SKILL_DEPTH = 4
const RESERVED_NESTED_SKILL_FOLDERS = new Set([
  'docs', 'doc', 'documentation', 'examples', 'example', 'tests', 'test',
  'scripts', 'script', 'assets', 'images', 'img', '.github', 'node_modules',
  'dist', 'build', 'vendor', 'references', 'readme',
])
const ALLOWED_DOT_SEGMENTS = new Set(['.claude', '.cursor'])

export type ExtractedWritingSkillArchive = {
  skill_markdown_raw: string
  references: Array<{ file: string; text: string }>
  folder: string
}

export function discoverWritingSkillPackPrefixes(relativePaths: string[]): string[] {
  const files = relativePaths.filter(Boolean)
  if (files.includes('SKILL.md')) return ['']
  const prefixes: string[] = []
  const seen = new Set<string>()
  for (const path of files) {
    if (!path.endsWith('/SKILL.md') && path !== 'SKILL.md') continue
    const prefix = path === 'SKILL.md' ? '' : path.slice(0, -'SKILL.md'.length)
    const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
    if (parts.length < 1 || parts.length > MAX_NESTED_SKILL_DEPTH) continue
    if (parts.some(part => (
      RESERVED_NESTED_SKILL_FOLDERS.has(part.toLowerCase())
      || (part.startsWith('.') && !ALLOWED_DOT_SEGMENTS.has(part))
    ))) continue
    if (seen.has(prefix)) continue
    seen.add(prefix)
    prefixes.push(prefix)
  }
  return prefixes.sort((left, right) => left.localeCompare(right))
}

function isSelectedPackPath(relativePath: string, prefix: string): boolean {
  if (relativePath === `${prefix}SKILL.md`) return true
  if (!relativePath.startsWith(`${prefix}references/`)) return false
  return /^[^/]+\.md$/.test(relativePath.slice(`${prefix}references/`.length))
}

function skillFolderFromPrefix(prefix: string): string {
  const trimmed = prefix.replace(/\/$/, '')
  if (!trimmed) return ''
  const parts = trimmed.split('/')
  return parts[parts.length - 1] || ''
}

export async function extractWritingSkillArchives(bytes: Uint8Array): Promise<ExtractedWritingSkillArchive[]> {
  if (bytes.byteLength > MAX_WRITING_SKILL_ARCHIVE_BYTES) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `Archive exceeds ${MAX_WRITING_SKILL_ARCHIVE_BYTES} bytes`)
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', 'Invalid ZIP archive', error)
  }
  const entries = Object.values(zip.files)
  const names = entries.map(entry => entry.name.replaceAll('\\', '/'))
  const firstSegments = names.filter(Boolean).map(name => name.split('/')[0]).filter(Boolean)
  const commonRoot = firstSegments.length === names.filter(Boolean).length
    && firstSegments.length > 0
    && new Set(firstSegments).size === 1
    ? firstSegments[0]
    : undefined

  const relativeEntries: Array<{ name: string; entry: JSZip.JSZipObject; type: 'file' | 'directory' | 'symlink'; original: string; sizeHint: number }> = []
  for (const entry of entries) {
    const safeName = entry.name.replaceAll('\\', '/')
    const name = commonRoot && safeName.startsWith(`${commonRoot}/`) ? safeName.slice(commonRoot.length + 1) : safeName
    relativeEntries.push({
      name,
      entry,
      type: archiveEntryType(entry),
      original: (entry.unsafeOriginalName ?? entry.name).replaceAll('\\', '/'),
      sizeHint: Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0),
    })
  }
  const prefixes = discoverWritingSkillPackPrefixes(relativeEntries.map(item => item.name))
  if (!prefixes.length) {
    throw new WritingSkillInstallError('SKILL_MD_MISSING', 'Repository has no SKILL.md in a writing-skill folder')
  }
  if (prefixes.length > MAX_WRITING_SKILL_PACKS_PER_REPO) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `More than ${MAX_WRITING_SKILL_PACKS_PER_REPO} writing skills in one repository`)
  }

  const selectedNames = new Set<string>()
  for (const prefix of prefixes) {
    for (const item of relativeEntries) {
      if (item.name && isSelectedPackPath(item.name, prefix)) selectedNames.add(item.name)
    }
  }

  const seen = new Set<string>()
  const picked: Array<{ path: string; prefix: string; entry: JSZip.JSZipObject }> = []
  for (const item of relativeEntries) {
    const selected = selectedNames.has(item.name)
    try {
      // Every repository entry gets path/symlink validation; size limits apply
      // only to the markdown payload that can be installed.
      validateSkillPackArchiveEntry(item.original, item.type, selected ? item.sizeHint : 0)
    } catch (error) {
      if (error instanceof SkillPathError && error.code === 'SKILL_FILE_TOO_LARGE') {
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', error.message, error)
      }
      throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unsafe archive entry: ${item.original}`, error)
    }
    if (!item.name || !selected || item.type !== 'file') continue
    if (seen.has(item.name)) throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Duplicate archive entry: ${item.name}`)
    seen.add(item.name)
    const prefix = prefixes.find(candidate => isSelectedPackPath(item.name, candidate)) || ''
    picked.push({ path: item.name, prefix, entry: item.entry })
  }

  let extractedTotal = 0
  const packs: ExtractedWritingSkillArchive[] = []
  for (const prefix of prefixes) {
    const files = picked.filter(file => file.prefix === prefix)
    if (files.filter(file => file.path !== `${prefix}SKILL.md`).length > MAX_INSTALLED_REFERENCE_COUNT) {
      throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `More than ${MAX_INSTALLED_REFERENCE_COUNT} reference files`)
    }
    let skillMarkdownRaw: string | null = null
    let referencesTotal = 0
    const references: Array<{ file: string; text: string }> = []
    for (const file of files) {
      let content: Uint8Array
      try {
        content = await file.entry.async('uint8array')
      } catch (error) {
        throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Cannot read archive entry: ${file.path}`, error)
      }
      const limit = file.path === `${prefix}SKILL.md` ? MAX_INSTALLED_SKILL_MD_BYTES : MAX_INSTALLED_REFERENCE_BYTES
      if (content.byteLength > limit) {
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', `Archive entry exceeds ${limit} bytes: ${file.path}`)
      }
      extractedTotal += content.byteLength
      if (extractedTotal > MAX_WRITING_SKILL_EXTRACTED_BYTES) {
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Extracted archive exceeds size limit')
      }
      const text = new TextDecoder().decode(content)
      if (file.path === `${prefix}SKILL.md`) {
        skillMarkdownRaw = text
      } else {
        referencesTotal += content.byteLength
        if (referencesTotal > MAX_INSTALLED_REFERENCES_TOTAL_BYTES) {
          throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'References exceed total size limit')
        }
        references.push({ file: file.path.slice(`${prefix}references/`.length), text })
      }
    }
    if (skillMarkdownRaw === null) {
      throw new WritingSkillInstallError('SKILL_MD_MISSING', 'Repository has no SKILL.md in a writing-skill folder')
    }
    references.sort((a, b) => a.file.localeCompare(b.file))
    packs.push({
      skill_markdown_raw: skillMarkdownRaw,
      references,
      folder: skillFolderFromPrefix(prefix),
    })
  }
  return packs
}

export async function extractWritingSkillArchive(bytes: Uint8Array): Promise<ExtractedWritingSkillArchive> {
  const packs = await extractWritingSkillArchives(bytes)
  return packs[0]
}

export function parseWritingSkillFrontmatterMeta(raw: string): { name?: string; description?: string } {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}
  const meta: { name?: string; description?: string } = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^(name|description):\s*(.+?)\s*$/)
    if (!pair) continue
    const value = pair[2].replace(/^["']|["']$/g, '').trim()
    if (!value) continue
    if (pair[1] === 'name' && meta.name === undefined) meta.name = value.slice(0, 120)
    if (pair[1] === 'description' && meta.description === undefined) meta.description = value.slice(0, 500)
  }
  return meta
}

async function readResponseBytes(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
    return bytes
  }
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      const chunk = next.value instanceof Uint8Array ? next.value : new Uint8Array(next.value)
      total += chunk.byteLength
      if (total > limit) {
        await reader.cancel()
        throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
      }
      chunks.push(chunk)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function installWritingSkillPackFromGitHub(input: {
  url: string
  workspace: string
  fetchImpl?: typeof fetch
}): Promise<InstalledWritingSkillPack> {
  const fetchImpl = input.fetchImpl ?? fetch
  const source = parseWritingSkillGitHubUrl(input.url)
  const revision = await resolveWritingSkillHeadRevision(source, fetchImpl)
  const installedPacks = await listInstalledWritingSkillPacks(input.workspace)
  const existingSameRevision = installedPacks.filter(pack => (
    pack.source_url === source.canonical_url && pack.revision === revision
  ))
  if (existingSameRevision.length) return existingSameRevision[0]

  const archiveUrl = `https://codeload.github.com/${source.owner}/${source.repo}/zip/${revision}`
  let archiveResponse: Response
  try {
    archiveResponse = await fetchImpl(archiveUrl)
  } catch (error) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Unable to download ${archiveUrl}`, error)
  }
  if (!archiveResponse.ok) {
    throw new WritingSkillInstallError('DOWNLOAD_FAILED', `Archive download failed: ${archiveResponse.status}`)
  }
  const contentLength = Number(archiveResponse.headers.get('content-length') ?? 0)
  if (contentLength > MAX_WRITING_SKILL_ARCHIVE_BYTES) {
    throw new WritingSkillInstallError('BOUNDS_EXCEEDED', 'Archive exceeds size limit')
  }
  const bytes = await readResponseBytes(archiveResponse, MAX_WRITING_SKILL_ARCHIVE_BYTES)
  const extractedPacks = await extractWritingSkillArchives(bytes)
  const planned = extractedPacks.flatMap(extracted => {
    const id = extractedPacks.length === 1
      ? source.id
      : normalizeWritingSkillPackId(extracted.folder || source.repo)
    if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) {
      if (extractedPacks.length === 1) {
        throw new WritingSkillInstallError('ID_CONFLICT_BUILTIN', `"${id}" is a builtin writing skill id`)
      }
      return []
    }
    return [{ id, extracted }]
  })
  if (!planned.length) {
    throw new WritingSkillInstallError('ID_CONFLICT_BUILTIN', 'All nested writing skills collide with builtin ids')
  }

  const root = writingSkillPacksRoot(input.workspace)
  await mkdir(root, { recursive: true })
  const written: InstalledWritingSkillPack[] = []
  try {
    for (const item of planned) {
      const existing = installedPacks.find(pack => pack.id === item.id)
      const meta = parseWritingSkillFrontmatterMeta(item.extracted.skill_markdown_raw)
      const record = {
        id: item.id,
        source_url: source.canonical_url,
        owner: source.owner,
        repo: source.repo,
        revision,
        // Keep the original install time on re-install so catalog order is stable.
        installed_at: existing?.installed_at ?? new Date().toISOString(),
        name: meta.name || item.extracted.folder || source.repo,
        description: meta.description || '',
      }
      const temp = await mkdtemp(join(root, `.tmp-${item.id}-`))
      try {
        await writeFile(join(temp, 'SKILL.md'), item.extracted.skill_markdown_raw, 'utf8')
        if (item.extracted.references.length) {
          await mkdir(join(temp, 'references'), { recursive: true })
          for (const reference of item.extracted.references) {
            await writeFile(join(temp, 'references', reference.file), reference.text, 'utf8')
          }
        }
        await writeFile(join(temp, 'pack.json'), JSON.stringify(record, null, 2), 'utf8')
        const destination = join(root, item.id)
        let displaced: string | null = null
        if (existing) {
          displaced = join(root, `.tmp-replace-${item.id}-${Date.now()}`)
          await rename(destination, displaced)
        }
        await rename(temp, destination)
        if (displaced) await rm(displaced, { recursive: true, force: true }).catch(() => undefined)
        written.push({
          ...record,
          dir: destination,
          reference_files: item.extracted.references.map(reference => reference.file),
        })
      } catch (error) {
        await rm(temp, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
    }
    invalidateInstalledWritingSkillPackCache()
    return written[0]
  } catch (error) {
    if (error instanceof WritingSkillInstallError) throw error
    throw new WritingSkillInstallError('INSTALL_FAILED', 'Writing skill installation failed', error)
  }
}

export async function uninstallWritingSkillPack(workspace: string, id: string): Promise<void> {
  if ((WRITING_SKILL_IDS as readonly string[]).includes(id)) {
    throw new WritingSkillInstallError('BUILTIN_NOT_REMOVABLE', `Builtin writing skill cannot be removed: ${id}`)
  }
  if (!WRITING_SKILL_PACK_ID_RE.test(String(id || ''))) {
    throw new WritingSkillInstallError('NOT_INSTALLED', `Writing skill is not installed: ${id}`)
  }
  const root = writingSkillPacksRoot(workspace)
  const displaced = join(root, `.tmp-remove-${id}-${Date.now()}`)
  try {
    await rename(join(root, id), displaced)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new WritingSkillInstallError('NOT_INSTALLED', `Writing skill is not installed: ${id}`)
    }
    throw new WritingSkillInstallError('INSTALL_FAILED', `Unable to remove writing skill: ${id}`, error)
  }
  await rm(displaced, { recursive: true, force: true }).catch(() => undefined)
  invalidateInstalledWritingSkillPackCache()
}
