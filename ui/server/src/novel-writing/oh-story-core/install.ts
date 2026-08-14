import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import JSZip from 'jszip'
import { SkillPathError, validateSkillPackArchiveEntry } from '../../skills/path-safety'
import { parseWritingSkillGitHubUrl, resolveWritingSkillHeadRevision } from '../writing-skills/install-github'
import { hasStoryDeslopScripts, loadOhStoryCoreSuite, ohStoryCoreRoot } from './store'
import { OH_STORY_CORE_SKILL_IDS, OH_STORY_CORE_SOURCE_URL } from './types'

export const MAX_OH_STORY_CORE_ARCHIVE_BYTES = 64 * 1024 * 1024
export const MAX_OH_STORY_CORE_EXTRACTED_BYTES = 16 * 1024 * 1024

const SKIPPED_SKILL_FOLDERS = new Set(['tests', 'demo'])
const LOCKED_SKILL_IDS = new Set<string>(OH_STORY_CORE_SKILL_IDS)

export type InstallOhStoryCoreSuiteOptions = {
  fetchImpl?: typeof fetch
  now?: string
}

type ExtractedFile = {
  relativePath: string
  content: Uint8Array
}

function archiveEntryType(entry: JSZip.JSZipObject): 'file' | 'directory' | 'symlink' {
  const mode = typeof entry.unixPermissions === 'number' ? entry.unixPermissions : 0
  if (mode && (mode & 0xf000) === 0xa000) return 'symlink'
  if (entry.dir) return 'directory'
  return 'file'
}

function isAllowedExtractPath(relativePath: string): boolean {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts[0] !== 'skills' || !LOCKED_SKILL_IDS.has(parts[1] || '')) return false
  if (parts.some((part) => SKIPPED_SKILL_FOLDERS.has(part))) return false
  if (parts.length === 3 && parts[2] === 'SKILL.md') return true
  if (
    parts.length === 4
    && parts[2] === 'references'
    && /\.md$/i.test(parts[3])
    && !parts[3].includes('\\')
  ) return true
  return parts[1] === 'story-deslop'
    && parts.length === 4
    && parts[2] === 'scripts'
    && /\.js$/i.test(parts[3])
    && !parts[3].includes('\\')
}

async function readResponseBytes(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > limit) throw new Error('oh-story archive exceeds size limit')
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
        throw new Error('oh-story archive exceeds size limit')
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

async function extractOhStoryCoreArchive(bytes: Uint8Array): Promise<ExtractedFile[]> {
  if (bytes.byteLength > MAX_OH_STORY_CORE_ARCHIVE_BYTES) {
    throw new Error(`oh-story archive exceeds ${MAX_OH_STORY_CORE_ARCHIVE_BYTES} bytes`)
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch (error) {
    throw new Error('Invalid oh-story ZIP archive', { cause: error })
  }

  const entries = Object.values(zip.files)
  const names = entries.map((entry) => entry.name.replaceAll('\\', '/'))
  const firstSegments = names.filter(Boolean).map((name) => name.split('/')[0]).filter(Boolean)
  const commonRoot = firstSegments.length === names.filter(Boolean).length
    && firstSegments.length > 0
    && new Set(firstSegments).size === 1
    ? firstSegments[0]
    : undefined

  const relativeEntries = entries.map((entry) => {
    const safeName = entry.name.replaceAll('\\', '/')
    const stripped = commonRoot && commonRoot !== 'skills' && safeName.startsWith(`${commonRoot}/`)
      ? safeName.slice(commonRoot.length + 1)
      : safeName
    const name = stripped === 'skills' || stripped.startsWith('skills/') ? stripped : safeName
    return {
      name,
      entry,
      type: archiveEntryType(entry),
      original: (entry.unsafeOriginalName ?? entry.name).replaceAll('\\', '/'),
      sizeHint: Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0),
    }
  })

  const picked: Array<{ path: string; entry: JSZip.JSZipObject }> = []
  const seen = new Set<string>()
  for (const item of relativeEntries) {
    const selected = Boolean(item.name) && item.type === 'file' && isAllowedExtractPath(item.name)
    if (!selected) continue
    try {
      validateSkillPackArchiveEntry(item.original, item.type, item.sizeHint)
    } catch (error) {
      if (error instanceof SkillPathError && error.code === 'SKILL_ARCHIVE_SYMLINK') throw error
      throw new Error(`Unsafe oh-story archive entry: ${item.original}`, { cause: error })
    }
    if (seen.has(item.name)) throw new Error(`Duplicate oh-story archive entry: ${item.name}`)
    seen.add(item.name)
    picked.push({ path: item.name, entry: item.entry })
  }

  let extractedTotal = 0
  const files: ExtractedFile[] = []
  for (const file of picked) {
    let content: Uint8Array
    try {
      content = await file.entry.async('uint8array')
    } catch (error) {
      throw new Error(`Cannot read oh-story archive entry: ${file.path}`, { cause: error })
    }
    extractedTotal += content.byteLength
    if (extractedTotal > MAX_OH_STORY_CORE_EXTRACTED_BYTES) {
      throw new Error('Extracted oh-story archive exceeds size limit')
    }
    try {
      validateSkillPackArchiveEntry(file.path, 'file', content.byteLength)
    } catch (error) {
      throw new Error(`Unsafe oh-story archive entry: ${file.path}`, { cause: error })
    }
    files.push({ relativePath: file.path, content })
  }

  for (const id of OH_STORY_CORE_SKILL_IDS) {
    if (!files.some((file) => file.relativePath === `skills/${id}/SKILL.md`)) {
      throw new Error(`oh-story archive is missing skills/${id}/SKILL.md`)
    }
  }
  return files
}

async function writeSuiteAtomically(
  workspace: string,
  files: ExtractedFile[],
  record: {
    source_url: string
    revision: string
    installed_at: string
    skills: readonly string[]
  },
): Promise<void> {
  const dest = ohStoryCoreRoot(workspace)
  const parent = dirname(dest)
  await mkdir(parent, { recursive: true })
  const temp = await mkdtemp(join(parent, '.tmp-oh-story-core-'))
  let displaced: string | null = null
  try {
    for (const file of files) {
      const path = join(temp, file.relativePath)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, file.content)
    }
    await writeFile(join(temp, 'pack.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8')

    try {
      displaced = join(parent, `.tmp-replace-oh-story-core-${Date.now()}`)
      await rename(dest, displaced)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      displaced = null
    }
    await rename(temp, dest)
    if (displaced) await rm(displaced, { recursive: true, force: true }).catch(() => undefined)
  } catch (error) {
    await rm(temp, { recursive: true, force: true }).catch(() => undefined)
    if (displaced) {
      await rename(displaced, dest).catch(() => undefined)
    }
    throw error
  }
}

export async function installOhStoryCoreSuite(
  workspace: string,
  options?: InstallOhStoryCoreSuiteOptions,
): Promise<void> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const source = parseWritingSkillGitHubUrl(OH_STORY_CORE_SOURCE_URL)
  const revision = await resolveWritingSkillHeadRevision(source, fetchImpl)
  const existing = loadOhStoryCoreSuite(workspace)
  if (existing?.revision === revision && hasStoryDeslopScripts(workspace)) return

  const archiveUrl = `https://codeload.github.com/${source.owner}/${source.repo}/zip/${revision}`
  let archiveResponse: Response
  try {
    archiveResponse = await fetchImpl(archiveUrl)
  } catch (error) {
    throw new Error(`Unable to download ${archiveUrl}`, { cause: error })
  }
  if (!archiveResponse.ok) {
    throw new Error(`oh-story archive download failed: ${archiveResponse.status}`)
  }
  const contentLength = Number(archiveResponse.headers.get('content-length') ?? 0)
  if (contentLength > MAX_OH_STORY_CORE_ARCHIVE_BYTES) {
    throw new Error('oh-story archive exceeds size limit')
  }
  const bytes = await readResponseBytes(archiveResponse, MAX_OH_STORY_CORE_ARCHIVE_BYTES)
  const files = await extractOhStoryCoreArchive(bytes)
  await writeSuiteAtomically(workspace, files, {
    source_url: OH_STORY_CORE_SOURCE_URL,
    revision,
    installed_at: options?.now || new Date().toISOString(),
    skills: [...OH_STORY_CORE_SKILL_IDS],
  })
}
