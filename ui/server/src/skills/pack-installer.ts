import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { lstatSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'node:path'

import JSZip from 'jszip'

import {
  MAX_SKILL_AGGREGATE_BYTES,
  MAX_SKILL_DOCUMENT_BYTES,
  MAX_SKILL_FILE_BYTES,
  SkillPathError,
  validateSkillPackArchiveEntry,
} from './path-safety'

export type SkillPackInstallErrorCode =
  | 'SKILL_GITHUB_URL_INVALID'
  | 'SKILL_PACK_DOWNLOAD_FAILED'
  | 'SKILL_PACK_ARCHIVE_INVALID'
  | 'SKILL_LOCAL_PATH_NOT_ALLOWED'
  | 'SKILL_PACK_INSTALL_FAILED'

export class SkillPackInstallError extends Error {
  readonly code: SkillPackInstallErrorCode | string
  readonly cause?: unknown

  constructor(code: SkillPackInstallErrorCode | string, message: string, cause?: unknown) {
    super(message)
    this.name = 'SkillPackInstallError'
    this.code = code
    this.cause = cause
  }
}

export type SkillPackRecord = {
  id: string
  sourceUrl: string
  owner?: string
  repo?: string
  revision: string
  installedAt: string
  status: 'installed'
}

export type SkillPackInstallResult = SkillPackRecord & { path: string }

export type PublicGitHubRepo = { owner: string; repo: string; id: string }

const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
const MAX_ENTRY_BYTES = 4 * 1024 * 1024
const MAX_EXTRACTED_BYTES = 20 * 1024 * 1024
const GITHUB_REDIRECT_STATUSES = new Set([301, 302, 307, 308])

export function parsePublicGitHubUrl(source: string): PublicGitHubRepo {
  if (
    typeof source !== 'string' ||
    source.trim() !== source ||
    /[\s\\]/.test(source) ||
    !/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\.git)?$/.test(source)
  ) {
    throw new SkillPackInstallError('SKILL_GITHUB_URL_INVALID', `Invalid GitHub repository URL: ${source}`)
  }
  let url: URL
  try { url = new URL(source) } catch { throw new SkillPackInstallError('SKILL_GITHUB_URL_INVALID', `Invalid GitHub URL: ${source}`) }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.search || url.hash || url.username || url.password) {
    throw new SkillPackInstallError('SKILL_GITHUB_URL_INVALID', `Only public github.com HTTPS URLs are allowed: ${source}`)
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*?)(?:\.git)?$/)
  if (!match || match[1] === '.' || match[1] === '..' || match[2] === '.' || match[2] === '..') {
    throw new SkillPackInstallError('SKILL_GITHUB_URL_INVALID', `Invalid GitHub repository URL: ${source}`)
  }
  const owner = match[1]
  const repo = match[2]
  return { owner, repo, id: repo }
}

export function parseGitHubArchiveRedirect(location: string, repo: PublicGitHubRepo): string {
  let url: URL
  try {
    url = new URL(location)
  } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', 'GitHub archive fallback returned an invalid redirect URL', error)
  }

  const lexical = /^https:\/\/([A-Za-z0-9.-]+)\/[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\/zip\/[0-9a-fA-F]{40}$/.exec(location)
  const parts = url.pathname.split('/')
  const [empty, owner, name, format, sha] = parts
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'codeload.github.com' ||
    url.port ||
    !lexical ||
    lexical[1].toLowerCase() !== 'codeload.github.com' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    parts.length !== 5 ||
    empty !== '' ||
    owner?.toLowerCase() !== repo.owner.toLowerCase() ||
    name?.toLowerCase() !== repo.repo.toLowerCase() ||
    format !== 'zip' ||
    !/^[0-9a-f]{40}$/i.test(sha ?? '')
  ) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', 'GitHub archive fallback returned an untrusted redirect')
  }
  return sha
}

async function resolveGitHubRevision(repo: PublicGitHubRepo, fetchImpl: typeof fetch): Promise<string> {
  const headUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/HEAD`
  let headResponse: Response
  try { headResponse = await fetchImpl(headUrl, { headers: { accept: 'application/vnd.github+json' } }) } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `Unable to fetch ${headUrl}`, error)
  }
  if (headResponse.ok) {
    try {
      const head = await headResponse.json() as { sha?: unknown }
      if (typeof head.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(head.sha)) throw new Error('missing sha')
      return head.sha
    } catch (error) {
      throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', 'GitHub HEAD response did not contain a valid commit SHA', error)
    }
  }
  if (headResponse.status !== 403 && headResponse.status !== 429) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `GitHub HEAD request failed: ${headResponse.status}`)
  }

  let fallbackResponse: Response
  try {
    fallbackResponse = await fetchImpl(`https://github.com/${repo.owner}/${repo.repo}/archive/HEAD.zip`, {
      method: 'HEAD',
      redirect: 'manual',
    })
  } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `Unable to resolve GitHub archive HEAD for ${repo.owner}/${repo.repo}`, error)
  }
  if (!GITHUB_REDIRECT_STATUSES.has(fallbackResponse.status)) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `GitHub archive fallback failed: ${fallbackResponse.status}`)
  }
  const location = fallbackResponse.headers.get('location')
  if (!location) {
    throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', 'GitHub archive fallback did not return a redirect location')
  }
  return parseGitHubArchiveRedirect(location, repo)
}

function within(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

async function ensurePackRoot(workspace: string): Promise<string> {
  let physicalWorkspace: string
  try { physicalWorkspace = await realpath(workspace) } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Workspace does not exist: ${workspace}`, error)
  }
  let current = physicalWorkspace
  for (const segment of ['.mangaforge', 'skill-packs']) {
    current = join(current, segment)
    try {
      const info = await lstat(current)
      if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('not a directory')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await mkdir(current, { recursive: true })
        const createdInfo = await lstat(current)
        if (createdInfo.isSymbolicLink() || !createdInfo.isDirectory()) {
          throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Skill Pack destination is not a safe directory: ${current}`)
        }
      } else {
        throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Skill Pack destination is not a safe directory: ${current}`, error)
      }
    }
  }
  return current
}

async function ensureSafeDirectory(directory: string): Promise<void> {
  try {
    const info = await lstat(directory)
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('not a directory')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await mkdir(directory, { recursive: true })
      const createdInfo = await lstat(directory)
      if (createdInfo.isSymbolicLink() || !createdInfo.isDirectory()) {
        throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Skill Pack destination is not a safe directory: ${directory}`)
      }
    }
    else throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Skill Pack destination is not a safe directory: ${directory}`, error)
  }
}

export function readPackRecord(root: string): SkillPackRecord | undefined {
  try {
    const metadataPath = join(root, 'pack.json')
    const metadataInfo = lstatSync(metadataPath)
    if (!metadataInfo.isFile() || metadataInfo.isSymbolicLink()) return undefined
    const raw = readFileSync(metadataPath, 'utf8')
    const value = JSON.parse(raw) as unknown
    return isValidPackRecord(value) ? value : undefined
  } catch { return undefined }
}

function isValidPackRecord(value: unknown): value is SkillPackRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (
    record.status !== 'installed' ||
    typeof record.id !== 'string' ||
    typeof record.sourceUrl !== 'string' ||
    typeof record.revision !== 'string' ||
    typeof record.installedAt !== 'string'
  ) return false
  if (!Number.isFinite(Date.parse(record.installedAt))) return false
  if (new Date(record.installedAt).toISOString() !== record.installedAt) return false
  if (record.owner !== undefined && typeof record.owner !== 'string') return false
  if (record.repo !== undefined && typeof record.repo !== 'string') return false
  return true
}

async function readExisting(
  root: string,
  expected: { id: string; sourceUrl: string; revision: string; owner?: string; repo?: string },
): Promise<SkillPackInstallResult | undefined> {
  try {
    const rootInfo = await lstat(root)
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Skill Pack destination is not a regular directory: ${root}`)
    }
    const metadataPath = join(root, 'pack.json')
    const metadataInfo = await lstat(metadataPath)
    if (metadataInfo.isSymbolicLink() || !metadataInfo.isFile()) {
      throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `pack.json is not a regular file: ${metadataPath}`)
    }
    const raw = await readFile(metadataPath, 'utf8')
    const record = JSON.parse(raw) as unknown
    if (!isValidPackRecord(record)) throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Invalid pack.json in ${root}`)
    if (
      record.status !== 'installed' ||
      record.id !== expected.id ||
      record.sourceUrl !== expected.sourceUrl ||
      record.revision !== expected.revision ||
      (expected.owner !== undefined && record.owner !== expected.owner) ||
      (expected.repo !== undefined && record.repo !== expected.repo)
    ) throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Existing Skill Pack metadata does not match ${root}`)
    return { ...record, path: root }
  } catch (error) {
    if (error instanceof SkillPackInstallError) throw error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    if (error instanceof SyntaxError) throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Invalid pack.json in ${root}`, error)
    return undefined
  }
}

function archiveType(entry: JSZip.JSZipObject): 'file' | 'directory' | 'symlink' {
  const mode = typeof entry.unixPermissions === 'number' ? entry.unixPermissions : 0
  if (mode && (mode & 0xf000) === 0xa000) return 'symlink'
  if (entry.dir) return 'directory'
  return 'file'
}

function normalizeArchiveName(name: string, commonRoot: string | undefined): string {
  const normalized = name.replaceAll('\\', '/')
  return commonRoot && normalized.startsWith(`${commonRoot}/`) ? normalized.slice(commonRoot.length + 1) : normalized
}

function isSkillPayloadPath(name: string): boolean {
  return name === 'skills' || name.startsWith('skills/')
}

async function extractArchive(bytes: Uint8Array, destination: string): Promise<void> {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Archive exceeds ${MAX_ARCHIVE_BYTES} bytes`)
  }
  let zip: JSZip
  try { zip = await JSZip.loadAsync(bytes) } catch (error) {
    throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Invalid ZIP archive', error)
  }
  const entries = Object.values(zip.files)
  const names = entries.map((entry) => entry.name.replaceAll('\\', '/'))
  const firstSegments = names.filter(Boolean).map((name) => name.split('/')[0]).filter(Boolean)
  const commonRoot = firstSegments.length === names.filter(Boolean).length && firstSegments.length > 0 && new Set(firstSegments).size === 1
    ? firstSegments[0]
    : undefined
  const seen = new Set<string>()
  let aggregate = 0
  const fileEntries: Array<{ path: string; entry: JSZip.JSZipObject }> = []
  // Pass one validates every name, entry type, and declared size before any
  // entry is decompressed or written to the destination.
  for (const entry of entries) {
    const type = archiveType(entry)
    const safeName = entry.name.replaceAll('\\', '/')
    const original = (entry.unsafeOriginalName ?? entry.name).replaceAll('\\', '/')
    const sizeHint = Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0)
    const name = normalizeArchiveName(safeName, commonRoot)
    const selected = Boolean(name && isSkillPayloadPath(name))
    // Every repository entry still receives path and symlink validation. File
    // size limits apply only to the Skill payload that can be installed.
    validateSkillPackArchiveEntry(original, type, selected ? sizeHint : 0)
    if (!name) continue
    if (seen.has(name)) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Duplicate archive entry: ${name}`)
    seen.add(name)
    if (!selected) continue
    if (type === 'directory') continue
    if (sizeHint > MAX_ENTRY_BYTES) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Archive entry too large: ${original}`)
    aggregate += sizeHint
    if (aggregate > MAX_EXTRACTED_BYTES) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Extracted archive exceeds size limit')
    fileEntries.push({ path: name, entry })
  }
  const filePaths = new Set(fileEntries.map((file) => file.path))
  for (const file of fileEntries) {
    const parts = file.path.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      if (filePaths.has(parts.slice(0, index).join('/'))) {
        throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Archive file/directory conflict: ${file.path}`)
      }
    }
  }

  // Pass two decompresses all files into memory and re-checks actual sizes.
  // Nothing is written until every decompressed entry has passed validation.
  const files: Array<{ path: string; bytes: Uint8Array }> = []
  aggregate = 0
  for (const file of fileEntries) {
    let content: Uint8Array
    try { content = await file.entry.async('uint8array') } catch (error) {
      throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Cannot read archive entry: ${file.path}`, error)
    }
    if (content.byteLength > MAX_ENTRY_BYTES) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', `Archive entry too large: ${file.path}`)
    aggregate += content.byteLength
    if (aggregate > MAX_EXTRACTED_BYTES) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Extracted archive exceeds size limit')
    files.push({ path: file.path, bytes: content })
  }
  for (const file of files) {
    const output = join(destination, file.path)
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, file.bytes, { flag: 'wx' })
  }
}

async function readResponseBytes(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Archive exceeds size limit')
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
        throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Archive exceeds size limit')
      }
      chunks.push(chunk)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export async function installGitHubSkillPack(
  source: string | { sourceUrl: string; workspace: string; fetchImpl?: typeof fetch; fetch?: typeof fetch },
  options?: { workspace: string; fetchImpl?: typeof fetch; fetch?: typeof fetch } | string,
): Promise<SkillPackInstallResult> {
  const sourceUrl = typeof source === 'string' ? source : source.sourceUrl
  const repo = parsePublicGitHubUrl(sourceUrl)
  const baseOptions = typeof source === 'string' ? options : source
  const normalizedOptions = typeof baseOptions === 'string' ? { workspace: baseOptions } : (baseOptions ?? { workspace: '' })
  const { workspace } = normalizedOptions
  const fetchImpl = normalizedOptions.fetchImpl ?? normalizedOptions.fetch ?? fetch
  const canonicalSource = `https://github.com/${repo.owner}/${repo.repo}`
  const revision = await resolveGitHubRevision(repo, fetchImpl)
  const destinationRoot = await ensurePackRoot(workspace)
  const destination = join(destinationRoot, repo.id, revision)
  const existing = await readExisting(destination, { id: repo.id, sourceUrl: canonicalSource, revision, owner: repo.owner, repo: repo.repo })
  if (existing) return existing
  const parent = join(destinationRoot, repo.id)
  await ensureSafeDirectory(parent)
  const temp = await mkdtemp(join(parent, `.tmp-${revision}-`))
  try {
    const archiveUrl = `https://codeload.github.com/${repo.owner}/${repo.repo}/zip/${revision}`
    let archiveResponse: Response
    try { archiveResponse = await fetchImpl(archiveUrl) } catch (error) { throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `Unable to download ${archiveUrl}`, error) }
    if (!archiveResponse.ok) throw new SkillPackInstallError('SKILL_PACK_DOWNLOAD_FAILED', `Skill Pack download failed: ${archiveResponse.status}`)
    const length = Number(archiveResponse.headers.get('content-length') ?? 0)
    if (length > MAX_ARCHIVE_BYTES) throw new SkillPackInstallError('SKILL_PACK_ARCHIVE_INVALID', 'Archive exceeds size limit')
    const bytes = await readResponseBytes(archiveResponse, MAX_ARCHIVE_BYTES)
    await extractArchive(bytes, temp)
    const record: SkillPackRecord = { id: repo.id, sourceUrl: canonicalSource, owner: repo.owner, repo: repo.repo, revision, installedAt: new Date().toISOString(), status: 'installed' }
    await writeFile(join(temp, 'pack.json'), JSON.stringify(record), 'utf8')
    try { await rename(temp, destination) } catch (error) {
      const raced = await readExisting(destination, { id: repo.id, sourceUrl: canonicalSource, revision, owner: repo.owner, repo: repo.repo })
      if (raced) return raced
      throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Unable to finalize Skill Pack installation`, error)
    }
    return { ...record, path: destination }
  } catch (error) {
    if (error instanceof SkillPathError || error instanceof SkillPackInstallError) throw error
    throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', 'Skill Pack installation failed', error)
  } finally {
    await rm(temp, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function collectLocalFiles(source: string): Promise<Array<{ relativePath: string; bytes: Uint8Array }>> {
  const result: Array<{ relativePath: string; bytes: Uint8Array }> = []
  let aggregateBytes = 0
  async function visit(current: string) {
    let entries: Awaited<ReturnType<typeof readdir>>
    try { entries = await readdir(current, { withFileTypes: true }) } catch (error) {
      throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Unable to read local Skill Pack directory: ${current}`, error)
    }
    for (const entry of entries) {
      const absolute = join(current, entry.name)
      let info
      try { info = await lstat(absolute) } catch (error) {
        throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Unable to inspect local Skill Pack file: ${absolute}`, error)
      }
      if (info.isSymbolicLink()) throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Symlink is not allowed: ${absolute}`)
      if (info.isDirectory()) await visit(absolute)
      else if (info.isFile()) {
        if ((info.mode & 0o111) !== 0) {
          throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Executable files are not allowed: ${absolute}`)
        }
        const extension = extname(entry.name).toLowerCase()
        if (new Set([
          '.zip', '.tar', '.tgz', '.gz', '.bz2', '.xz', '.7z', '.rar',
          '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sh', '.bash', '.zsh', '.fish',
          '.bat', '.cmd', '.ps1', '.py', '.pyc', '.rb', '.pl', '.php', '.lua', '.java',
          '.go', '.rs', '.c', '.cc', '.cpp', '.h', '.hpp', '.exe', '.dll', '.so', '.dylib', '.wasm',
        ]).has(extension)) {
          throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Archives and executable scripts are not allowed: ${absolute}`)
        }
        let bytes: Uint8Array
        try { bytes = new Uint8Array(await readFile(absolute)) } catch (error) {
          throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', `Unable to read local Skill Pack file: ${absolute}`, error)
        }
        if (new TextDecoder().decode(bytes.subarray(0, 2)) === '#!') {
          throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Script files are not allowed: ${absolute}`)
        }
        const relativePath = relative(source, absolute).split(sep).join('/')
        const limit = relativePath === 'SKILL.md' || relativePath.endsWith('/SKILL.md')
          ? MAX_SKILL_DOCUMENT_BYTES
          : MAX_SKILL_FILE_BYTES
        if (bytes.byteLength > limit) {
          throw new SkillPackInstallError('SKILL_FILE_TOO_LARGE', `Local Skill Pack file exceeds ${limit} bytes: ${relativePath}`)
        }
        aggregateBytes += bytes.byteLength
        if (aggregateBytes > MAX_SKILL_AGGREGATE_BYTES) {
          throw new SkillPackInstallError('SKILL_FILE_TOO_LARGE', `Local Skill Pack files exceed ${MAX_SKILL_AGGREGATE_BYTES} bytes`)
        }
        result.push({ relativePath, bytes })
      } else throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Only regular files are allowed: ${absolute}`)
    }
  }
  await visit(source)
  result.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  return result
}

export async function installLocalSkillPack(
  source: string,
  options: { workspace: string; allowedRoots: string[]; packId?: string; sourceUrl?: string },
): Promise<SkillPackInstallResult> {
  const { workspace, allowedRoots, packId = basename(source) } = options
  let sourcePhysical: string
  try { sourcePhysical = await realpath(source) } catch (error) { throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Local Skill Pack does not exist: ${source}`, error) }
  const sourceInfo = await stat(sourcePhysical)
  if (!sourceInfo.isDirectory()) throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', 'Local Skill Pack source must be a directory')
  let allowed = false
  for (const root of allowedRoots) {
    try {
      const rootPhysical = await realpath(root)
      if (within(rootPhysical, sourcePhysical)) { allowed = true; break }
    } catch { /* ignore missing allow-list entries */ }
  }
  if (!allowed) throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Source is outside the allow-list: ${source}`)
  const files = await collectLocalFiles(sourcePhysical)
  const hash = createHash('sha256')
  for (const file of files) hash.update(file.relativePath).update('\0').update(file.bytes).update('\0')
  const revision = `local-${hash.digest('hex')}`
  const id = packId
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new SkillPackInstallError('SKILL_LOCAL_PATH_NOT_ALLOWED', `Invalid pack id: ${id}`)
  const destinationRoot = await ensurePackRoot(workspace)
  const destination = join(destinationRoot, id, revision)
  const sourceUrl = options.sourceUrl ?? `file://${sourcePhysical}`
  const existing = await readExisting(destination, { id, sourceUrl, revision })
  if (existing) return existing
  const parent = join(destinationRoot, id)
  await ensureSafeDirectory(parent)
  const temp = await mkdtemp(join(parent, `.tmp-${revision}-`))
  try {
    for (const file of files) {
      const output = join(temp, file.relativePath)
      await mkdir(dirname(output), { recursive: true })
      await writeFile(output, file.bytes, { flag: 'wx' })
    }
    const record: SkillPackRecord = { id, sourceUrl, revision, installedAt: new Date().toISOString(), status: 'installed' }
    await writeFile(join(temp, 'pack.json'), JSON.stringify(record), 'utf8')
    try { await rename(temp, destination) } catch (error) {
      const raced = await readExisting(destination, { id, sourceUrl, revision })
      if (raced) return raced
      throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', 'Unable to finalize local Skill Pack installation', error)
    }
    return { ...record, path: destination }
  } catch (error) {
    if (error instanceof SkillPackInstallError) throw error
    throw new SkillPackInstallError('SKILL_PACK_INSTALL_FAILED', 'Local Skill Pack installation failed', error)
  } finally { await rm(temp, { recursive: true, force: true }).catch(() => undefined) }
}
