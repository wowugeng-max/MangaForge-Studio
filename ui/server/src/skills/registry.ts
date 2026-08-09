import { lstat, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

import { readOpenAIMetadata, parseSkillDocument } from './frontmatter'
import { readPackRecord } from './pack-installer'
import { assertSafeRelativeSkillPath } from './path-safety'
import type { CanvasMediaMode, SkillCompatibility, SkillManifest } from './types'
import { builtinPromptSkill } from './builtin'

const MEDIA_MODES: CanvasMediaMode[] = ['chat', 'vision', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video']

export type SkillRegistryErrorCode = 'SKILL_AMBIGUOUS' | 'SKILL_NOT_FOUND' | 'SKILL_MODE_INCOMPATIBLE'

export class SkillRegistryError extends Error {
  readonly code: SkillRegistryErrorCode
  constructor(code: SkillRegistryErrorCode, message: string) {
    super(message)
    this.name = 'SkillRegistryError'
    this.code = code
  }
}

export type SkillClassification = {
  compatibility: SkillCompatibility
  compatibilityReason?: string
  mediaModes: CanvasMediaMode[]
}

const modePatterns: Array<[CanvasMediaMode, RegExp]> = [
  ['image_to_video', /\b(?:image[-_ ]?to[-_ ]?video|i2v|i2va|fl2va|l2va|ref2va)\b/i],
  ['text_to_video', /\b(?:text[-_ ]?to[-_ ]?video|t2v|t2va|video|motion|shot|frame|duration)\b/i],
  ['image_to_image', /\b(?:image[-_ ]?to[-_ ]?image|i2i)\b/i],
  ['text_to_image', /\b(?:text[-_ ]?to[-_ ]?image|t2i|image|illustration|photo|render)\b/i],
]

function frontmatterBlock(raw: string): string {
  return raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)?.[1] ?? ''
}

function hasWorkflowDeclaration(raw: string): string | undefined {
  const frontmatter = frontmatterBlock(raw)
  const declarations: Array<[RegExp, string]> = [
    [/allowed[-_]tools\s*:/i, 'declares external tools'],
    [/hooks\s*:/i, 'declares hooks'],
    [/\bshell\s*:/i, 'declares shell access'],
    [/\bagent\s*:/i, 'declares an agent'],
    [/context\s*:\s*fork/i, 'requests a forked context'],
  ]
  for (const [pattern, reason] of declarations) if (pattern.test(frontmatter)) return reason
  const body = raw.slice(raw.indexOf('\n---') + 4)
  if (/\b(?:multi[- ]?stage|multi[- ]?step)\s+(?:workflow|process)|\bworkflow\s+with\s+(?:tools|agents)|\bcall\s+(?:a|the)\s+tool|\bspawn\s+(?:an?\s+)?agent/i.test(body)) {
    return 'describes a multi-stage tool or agent workflow'
  }
  return undefined
}

function inferredModes(manifest: SkillManifest, raw: string): CanvasMediaMode[] {
  if (manifest.mediaModes.length) return [...manifest.mediaModes]
  const source = `${manifest.description}\n${manifest.whenToUse ?? ''}\n${manifest.body}\n${raw}`
  const modes = new Set<CanvasMediaMode>()
  for (const [mode, pattern] of modePatterns) if (pattern.test(source)) modes.add(mode)
  return MEDIA_MODES.filter((mode) => modes.has(mode))
}

/** Classifies a parsed document without executing any of its content. */
export function classifySkillCompatibility(manifest: SkillManifest, raw = ''): SkillClassification {
  const workflowReason = hasWorkflowDeclaration(raw || manifest.body)
  const mediaModes = inferredModes(manifest, raw)
  if (workflowReason) {
    return {
      compatibility: /tool|agent|hook|shell|fork|workflow/i.test(workflowReason) ? 'workflow_only' : 'prompt_partial',
      compatibilityReason: workflowReason,
      mediaModes,
    }
  }
  const promptOnly = /\bprompt[-_ ]only\b|return\s+only\s+(?:a\s+)?(?:compiled\s+)?(?:visual\s+)?prompt|prompt\s+engineer|compiled\s+visual\s+prompt|\b(?:write|generate|create|turn|convert|transform)\b[\s\S]{0,100}\bprompt\b/i.test(`${raw}\n${manifest.body}`)
  if (mediaModes.length && promptOnly) {
    return { compatibility: 'prompt_ready', mediaModes }
  }
  if (mediaModes.length) return { compatibility: 'prompt_partial', compatibilityReason: 'does not clearly declare prompt-only behavior', mediaModes }
  return { compatibility: 'prompt_partial', compatibilityReason: 'media mode and prompt capability are not explicit', mediaModes }
}

export type SkillRegistryOptions = {
  includeClaudeSkills?: boolean
  includeCodexSkills?: boolean
  includeLocalSkills?: boolean
  /** Explicit extra roots are useful for controlled tests and workspace integrations. */
  skillRoots?: string[]
}

type ScanContext = { packId: string; revision: string; sourceUrl?: string }

type RegistryCache = { signature: string; manifests: SkillManifest[] }

async function isDirectory(path: string, boundary?: string): Promise<boolean> {
  if (await hasSymlinkInPath(path, boundary)) return false
  try { const info = await lstat(path); return info.isDirectory() && !info.isSymbolicLink() } catch { return false }
}

/** Reject a root when any existing component below its workspace boundary is a symlink. */
async function hasSymlinkInPath(path: string, boundary?: string): Promise<boolean> {
  const resolved = resolve(path)
  if (!boundary) {
    try { return (await lstat(resolved)).isSymbolicLink() } catch { return false }
  }
  const resolvedBoundary = resolve(boundary)
  const childPath = relative(resolvedBoundary, resolved)
  if (childPath === '..' || childPath.startsWith(`..${sep}`) || childPath.startsWith(sep)) return false
  let current = resolvedBoundary
  const boundaryInfo = await lstat(current).catch(() => undefined)
  if (boundaryInfo?.isSymbolicLink()) return true
  for (const segment of childPath.split(sep).filter(Boolean)) {
    current = join(current, segment)
    try {
      const info = await lstat(current)
      if (info.isSymbolicLink()) return true
    } catch {
      // Missing roots are normal for optional Skill directories. Once a
      // component is missing, no later component can be an existing escape.
      return false
    }
  }
  return false
}

/** Build a cheap, deterministic fingerprint without reading Skill contents. */
async function collectSignature(root: string, entries: string[], boundary?: string): Promise<void> {
  if (await hasSymlinkInPath(root, boundary)) return
  let info
  try { info = await lstat(root) } catch { return }
  if (info.isSymbolicLink()) return
  entries.push(`${root}\0${info.isDirectory() ? 'd' : 'f'}\0${info.size}\0${info.mtimeMs}`)
  if (!info.isDirectory()) return
  let children: Awaited<ReturnType<typeof readdir>>
  try { children = await readdir(root, { withFileTypes: true }) } catch { return }
  children.sort((left, right) => left.name.localeCompare(right.name))
  for (const child of children) {
    if (child.isSymbolicLink()) continue
    await collectSignature(join(root, child.name), entries, boundary)
  }
}

async function readOptionalMetadata(skillRoot: string): Promise<Pick<SkillManifest, 'displayName' | 'shortDescription' | 'defaultPrompt'>> {
  try {
    const path = await assertSafeRelativeSkillPath(skillRoot, 'agents/openai.yaml')
    const info = await lstat(path)
    if (info.isSymbolicLink() || !info.isFile()) return {}
    return readOpenAIMetadata(await readFile(path, 'utf8'))
  } catch { return {} }
}

function invalidManifest(filePath: string, context: ScanContext, error: unknown): SkillManifest {
  const rootDir = dirname(filePath).split(sep).join('/')
  const nameMatch = String(error instanceof Error ? error.message : '').match(/requires a non-empty name|in ([^:]+):/)
  const fallbackName = basename(rootDir)
  return {
    packId: context.packId,
    directoryName: basename(rootDir),
    name: fallbackName || nameMatch?.[1] || 'invalid-skill',
    description: '', arguments: [], userInvocable: false, triggerWords: [], mediaModes: [],
    compatibility: 'invalid', compatibilityReason: error instanceof Error ? error.message : String(error),
    revision: context.revision, sourceUrl: context.sourceUrl, rootDir, body: '', references: [],
  }
}

async function parseFile(filePath: string, context: ScanContext): Promise<SkillManifest> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = parseSkillDocument(raw, filePath)
    const manifest = { ...parsed.manifest, packId: context.packId, revision: context.revision, sourceUrl: context.sourceUrl }
    const classification = classifySkillCompatibility(manifest, raw)
    Object.assign(manifest, classification)
    Object.assign(manifest, await readOptionalMetadata(dirname(filePath)))
    return manifest
  } catch (error) {
    return invalidManifest(filePath, context, error)
  }
}

async function scanSkillRoot(root: string, context: ScanContext, boundary?: string): Promise<SkillManifest[]> {
  if (!(await isDirectory(root, boundary))) return []
  const result: SkillManifest[] = []
  const direct = join(root, 'SKILL.md')
  try { if ((await lstat(direct)).isFile()) result.push(await parseFile(direct, context)) } catch { /* no root document */ }
  let entries: Awaited<ReturnType<typeof readdir>>
  try { entries = await readdir(root, { withFileTypes: true }) } catch { return result }
  entries.sort((left, right) => left.name.localeCompare(right.name))
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === 'references') continue
    const skillDir = join(root, entry.name)
    const filePath = join(skillDir, 'SKILL.md')
    try {
      const info = await lstat(filePath)
      if (info.isFile() && !info.isSymbolicLink()) result.push(await parseFile(filePath, context))
    } catch { /* not a Skill directory */ }
  }
  return result
}

async function scanInstalled(workspace: string): Promise<SkillManifest[]> {
  const root = join(workspace, '.mangaforge', 'skill-packs')
  if (!(await isDirectory(root, workspace))) return []
  const result: SkillManifest[] = []
  let packs: Awaited<ReturnType<typeof readdir>>
  try { packs = await readdir(root, { withFileTypes: true }) } catch { return result }
  packs.sort((left, right) => left.name.localeCompare(right.name))
  for (const pack of packs) {
    if (!pack.isDirectory() || pack.isSymbolicLink()) continue
    const packRoot = join(root, pack.name)
    let revisions: Awaited<ReturnType<typeof readdir>>
    try { revisions = await readdir(packRoot, { withFileTypes: true }) } catch { continue }
    revisions.sort((left, right) => left.name.localeCompare(right.name))
    for (const revision of revisions) {
      if (!revision.isDirectory() || revision.isSymbolicLink()) continue
      const revisionRoot = join(packRoot, revision.name)
      const record = readPackRecord(revisionRoot)
      if (!record) continue
      result.push(...await scanSkillRoot(join(revisionRoot, 'skills'), {
        packId: record.id, revision: record.revision, sourceUrl: record.sourceUrl,
      }, workspace))
    }
  }
  return result
}

export function createSkillRegistry(workspace: string, options: SkillRegistryOptions = {}) {
  let cached: RegistryCache | undefined
  const rootsForOptions = (): string[] => {
    const roots: string[] = [join(workspace, '.mangaforge', 'skill-packs')]
    if (options.includeLocalSkills !== false) roots.push(join(workspace, '.mangaforge', 'skills'))
    if (options.includeClaudeSkills) roots.push(join(workspace, '.claude', 'skills'))
    if (options.includeCodexSkills) roots.push(join(workspace, '.codex', 'skills'))
    roots.push(...(options.skillRoots ?? []))
    return roots
  }
  const scan = async (): Promise<SkillManifest[]> => {
    const signatureEntries: string[] = []
    for (const root of rootsForOptions()) await collectSignature(root, signatureEntries, workspace)
    const signature = signatureEntries.sort().join('\n')
    if (cached?.signature === signature) return cached.manifests
    const manifests = await scanInstalled(workspace)
    const roots: Array<{ root: string; packId: string }> = []
    if (options.includeLocalSkills !== false) roots.push({ root: join(workspace, '.mangaforge', 'skills'), packId: 'local' })
    if (options.includeClaudeSkills) roots.push({ root: join(workspace, '.claude', 'skills'), packId: 'claude' })
    if (options.includeCodexSkills) roots.push({ root: join(workspace, '.codex', 'skills'), packId: 'codex' })
    for (const root of options.skillRoots ?? []) roots.push({ root, packId: basename(root) || 'local' })
    for (const item of roots) manifests.push(...await scanSkillRoot(item.root, { packId: item.packId, revision: 'workspace', sourceUrl: `file://${item.root}` }, workspace))
    manifests.sort((left, right) => `${left.packId}\0${left.name}\0${left.revision}\0${left.directoryName}`.localeCompare(`${right.packId}\0${right.name}\0${right.revision}\0${right.directoryName}`))
    cached = { signature, manifests }
    return manifests
  }
  return {
    async list(filter: { mode?: CanvasMediaMode; readyOnly?: boolean; includeBuiltins?: boolean } = {}): Promise<SkillManifest[]> {
      const manifests = [...await scan()]
      if (filter.includeBuiltins !== false) manifests.unshift({ ...builtinPromptSkill, mediaModes: [...builtinPromptSkill.mediaModes], references: [] })
      return manifests.filter((manifest) => {
        if (filter.mode && manifest.mediaModes.length && !manifest.mediaModes.includes(filter.mode)) return false
        if (filter.readyOnly && manifest.compatibility !== 'prompt_ready') return false
        if (filter.readyOnly && filter.mode && !manifest.mediaModes.includes(filter.mode)) return false
        return true
      })
    },
    async resolve(query: { packId?: string; name: string; revision?: string; mode?: CanvasMediaMode; readyOnly?: boolean }): Promise<SkillManifest> {
      const candidates = await this.list({ includeBuiltins: true })
      const matches = candidates.filter((manifest) => manifest.name === query.name && (!query.packId || manifest.packId === query.packId) && (!query.revision || manifest.revision === query.revision))
      if (!matches.length) throw new SkillRegistryError('SKILL_NOT_FOUND', `Skill not found: ${query.packId ? `${query.packId}:` : ''}${query.name}`)
      if (matches.length > 1) throw new SkillRegistryError('SKILL_AMBIGUOUS', `Skill name is ambiguous: ${query.name}`)
      const manifest = matches[0]
      if (query.mode && (manifest.mediaModes.length === 0 || !manifest.mediaModes.includes(query.mode))) {
        throw new SkillRegistryError('SKILL_MODE_INCOMPATIBLE', `Skill ${query.name} is not compatible with ${query.mode}`)
      }
      if (query.readyOnly && manifest.compatibility !== 'prompt_ready') throw new SkillRegistryError('SKILL_MODE_INCOMPATIBLE', `Skill ${query.name} is not prompt-ready`)
      return manifest
    },
    invalidate() { cached = undefined },
  }
}

export type SkillRegistry = ReturnType<typeof createSkillRegistry>
