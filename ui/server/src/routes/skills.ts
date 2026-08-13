import type { Express } from 'express'
import { lstat, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import {
  installGitHubSkillPack as defaultInstallGitHubSkillPack,
  parsePublicGitHubUrl,
  readPackRecord,
  type SkillPackInstallResult,
  type SkillPackRecord,
} from '../skills/pack-installer'
import { createSkillRegistry, type SkillRegistry } from '../skills/registry'
import {
  compilePromptSkill as defaultCompilePromptSkill,
  SkillCompilerError,
  type PromptCompilerDeps,
} from '../skills/compiler'
import type { CanvasReferenceErrorCode } from '../skills/reference-bindings'
import { logSkillCompileFailure } from '../skills/compile-failure-log'
import { readSkillSettings as defaultReadSkillSettings, writeSkillSettings as defaultWriteSkillSettings, type SkillSettings } from '../skills/settings'
import type { CanvasMediaMode, PromptCompileInput, SkillManifest } from '../skills/types'

const MEDIA_MODES: readonly CanvasMediaMode[] = ['chat', 'vision', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video']
const MAX_INCOMING_ASSET_URL_LENGTH = 64 * 1024
const MAX_INCOMING_ASSET_CONTENT_LENGTH = 256 * 1024
const REFERENCE_VALIDATION_ERROR_CODES: ReadonlySet<CanvasReferenceErrorCode> = new Set([
  'REFERENCE_LIMIT_EXCEEDED',
  'REFERENCE_ROLE_INVALID',
  'REFERENCE_MEDIA_UNSUPPORTED',
  'REFERENCE_TYPE_INVALID',
  'REFERENCE_ASSET_INVALID',
  'REFERENCE_LINEAGE_INVALID',
  'REFERENCE_ID_INVALID',
])

type RegistryLike = Pick<SkillRegistry, 'list' | 'invalidate'>
type PackSummary = {
  id: string
  sourceUrl: string
  owner?: string
  repo?: string
  revision: string
  installedAt: string
  status: 'installed'
}

export type SkillRouteDeps = {
  getRegistry?: (workspace: string) => Promise<RegistryLike> | RegistryLike
  /** Optional pack listing override for clients/tests with a persistent registry. */
  getPacks?: (workspace: string) => Promise<unknown[]> | unknown[]
  installGitHubSkillPack?: (sourceUrl: string, options: { workspace: string }) => Promise<SkillPackInstallResult | SkillPackRecord>
  /** Local installation is deliberately opt-in and must be supplied by a safety-reviewed installer. */
  installLocalSkillPack?: (localPath: string, options: { workspace: string }) => Promise<SkillPackInstallResult | SkillPackRecord>
  compilePromptSkill?: (input: PromptCompileInput) => Promise<Awaited<ReturnType<typeof defaultCompilePromptSkill>>>
  readSkillSettings?: (workspace: string) => Promise<SkillSettings>
  writeSkillSettings?: (workspace: string, skillCompilerModelId: number | null) => Promise<SkillSettings>
  /** Optional compiler dependencies used by the default compiler fallback. */
  compilerDeps?: PromptCompilerDeps
}

type RouteResponse = {
  status(code: number): RouteResponse
  json(body: unknown): RouteResponse
}

function errorBody(errorCode: string, detail: string) {
  return { error: detail, detail, error_code: errorCode }
}

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

function parseBooleanQuery(value: unknown): boolean | undefined {
  const raw = firstQueryValue(value)
  if (raw === undefined || raw === null || raw === '') return undefined
  if (raw === true || raw === 'true' || raw === '1') return true
  if (raw === false || raw === 'false' || raw === '0') return false
  return undefined
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isMediaMode(value: unknown): value is CanvasMediaMode {
  return typeof value === 'string' && (MEDIA_MODES as readonly string[]).includes(value)
}

function publicSourceUrl(value: string): string {
  return /^file:\/\//i.test(value) ? 'local://' : value
}

function publicSkillSummary(skill: SkillManifest) {
  // Keep this allow-list deliberately explicit: Skill.md body, root paths, and
  // references are untrusted/private implementation details and must not cross
  // the API boundary.
  return {
    packId: skill.packId,
    name: skill.name,
    displayName: skill.displayName,
    description: skill.description,
    shortDescription: skill.shortDescription,
    whenToUse: skill.whenToUse,
    arguments: skill.arguments.map(argument => ({ ...argument })),
    argumentHint: skill.argumentHint,
    userInvocable: skill.userInvocable,
    triggerWords: [...skill.triggerWords],
    mediaModes: [...skill.mediaModes],
    compatibility: skill.compatibility,
    compatibilityReason: skill.compatibilityReason,
    reason: skill.compatibilityReason,
    revision: skill.revision,
    sourceUrl: typeof skill.sourceUrl === 'string' ? publicSourceUrl(skill.sourceUrl) : skill.sourceUrl,
  }
}

function publicPackSummary(value: unknown): PackSummary | undefined {
  if (!isPlainRecord(value)) return undefined
  if (typeof value.id !== 'string' || typeof value.sourceUrl !== 'string' || typeof value.revision !== 'string') return undefined
  if (typeof value.installedAt !== 'string' || value.status !== 'installed') return undefined
  return {
    id: value.id,
    sourceUrl: publicSourceUrl(value.sourceUrl),
    ...(typeof value.owner === 'string' ? { owner: value.owner } : {}),
    ...(typeof value.repo === 'string' ? { repo: value.repo } : {}),
    revision: value.revision,
    installedAt: value.installedAt,
    status: 'installed' as const,
  }
}

async function listInstalledPackSummaries(workspace: string): Promise<PackSummary[]> {
  const root = join(resolve(workspace), '.mangaforge', 'skill-packs')
  try {
    const rootInfo = await lstat(root)
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return []
  } catch { return [] }

  const summaries: PackSummary[] = []
  let packEntries: Awaited<ReturnType<typeof readdir>>
  try { packEntries = await readdir(root, { withFileTypes: true }) } catch { return [] }
  packEntries.sort((a, b) => a.name.localeCompare(b.name))
  for (const packEntry of packEntries) {
    if (!packEntry.isDirectory() || packEntry.isSymbolicLink()) continue
    const packRoot = join(root, packEntry.name)
    let revisionEntries: Awaited<ReturnType<typeof readdir>>
    try { revisionEntries = await readdir(packRoot, { withFileTypes: true }) } catch { continue }
    revisionEntries.sort((a, b) => a.name.localeCompare(b.name))
    for (const revisionEntry of revisionEntries) {
      if (!revisionEntry.isDirectory() || revisionEntry.isSymbolicLink()) continue
      const record = publicPackSummary(readPackRecord(join(packRoot, revisionEntry.name)))
      if (record) summaries.push(record)
    }
  }
  return summaries
}

function normalizePackRecord(value: unknown): PackSummary | undefined {
  return publicPackSummary(value)
}

function compilerErrorStatus(code: string): number {
  if (code === 'SKILL_COMPILER_MODEL_REQUIRED' || code === 'SKILL_COMPILER_MODEL_INCOMPATIBLE' || code === 'SKILL_COMPILER_VISION_REQUIRED' || code === 'SKILL_AMBIGUOUS') return 409
  // Upstream provider failures are not client errors and stay retryable.
  if (code === 'SKILL_COMPILER_PROVIDER_ERROR') return 502
  if (code.startsWith('SKILL_') || REFERENCE_VALIDATION_ERROR_CODES.has(code as CanvasReferenceErrorCode)) return 422
  return 500
}

function compilerErrorCode(error: unknown): string {
  if (error instanceof SkillCompilerError && error.code) return error.code
  if (error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string') return String((error as { code: string }).code)
  return 'SKILL_COMPILE_FAILED'
}

function compilerErrorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function normalizeIncomingAssets(value: unknown): PromptCompileInput['incomingAssets'] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new TypeError('assets/incoming_assets must be an array')
  return value.map((raw, index) => {
    if (!isPlainRecord(raw)) throw new TypeError(`assets[${index}] must be an object`)
    const type = raw.type ?? raw.asset_type
    if (type !== 'image' && type !== 'prompt' && type !== 'video' && type !== 'audio') throw new TypeError(`assets[${index}].type must be image, prompt, video, or audio`)
    const sourceAssetIds = raw.source_asset_ids ?? raw.sourceAssetIds
    if (sourceAssetIds !== undefined && (!Array.isArray(sourceAssetIds) || sourceAssetIds.some(item => !Number.isSafeInteger(item)))) {
      throw new TypeError(`assets[${index}].source_asset_ids must be an array of integers`)
    }
    const asset: PromptCompileInput['incomingAssets'][number] = { type }
    if (raw.reference_index !== undefined) asset.reference_index = raw.reference_index as number
    if (raw.reference_id !== undefined) asset.reference_id = raw.reference_id as string
    if (raw.reference_role !== undefined) asset.reference_role = raw.reference_role as PromptCompileInput['incomingAssets'][number]['reference_role']
    const rawUrl = raw.url ?? raw.file_path ?? raw.filePath
    if (rawUrl !== undefined) {
      if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > MAX_INCOMING_ASSET_URL_LENGTH) {
        throw new TypeError(`assets[${index}].url exceeds the allowed length`)
      }
      // The compiler may send image URLs to a model. Keep this allow-list
      // narrow so a canvas request cannot turn the preview endpoint into a
      // file reader or arbitrary HTTP proxy.
      const allowedUrl = /^https:\/\//i.test(rawUrl)
        || /^(?:data|blob):/i.test(rawUrl)
        || rawUrl.startsWith('/api/assets/media/')
        || rawUrl.startsWith('/api/files/')
      if (!allowedUrl || /[\u0000-\u0020]/.test(rawUrl)) throw new TypeError(`assets[${index}].url must use an allowed asset URL scheme`)
      asset.url = rawUrl
    }
    if (raw.content !== undefined) {
      if (typeof raw.content !== 'string' || raw.content.length > MAX_INCOMING_ASSET_CONTENT_LENGTH) {
        throw new TypeError(`assets[${index}].content exceeds the allowed length`)
      }
      asset.content = raw.content
    }
    if (sourceAssetIds !== undefined) asset.source_asset_ids = [...sourceAssetIds] as number[]
    return asset
  })
}

function normalizeArguments(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined
  if (!isPlainRecord(value)) throw new TypeError('arguments must be an object')
  for (const [key, argument] of Object.entries(value)) if (typeof argument !== 'string') throw new TypeError(`arguments.${key} must be a string`)
  return value as Record<string, string>
}

function normalizeCompilerModelId(body: Record<string, unknown>): number | null | undefined {
  const key = Object.prototype.hasOwnProperty.call(body, 'compiler_model_id') ? 'compiler_model_id' : 'compilerModelId'
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined
  const value = body[key]
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new TypeError('compiler_model_id must be a non-negative integer or null')
  return value
}

function normalizeCompileInput(body: unknown, workspace: string): PromptCompileInput {
  if (!isPlainRecord(body)) throw new TypeError('JSON body must be an object')
  const skillName = body.skill_name ?? body.skillName
  if (skillName !== undefined && (typeof skillName !== 'string' || !skillName.trim())) throw new TypeError('skill_name must be a non-empty string')
  const packId = body.pack_id ?? body.skillPackId
  if (packId !== undefined && (typeof packId !== 'string' || !packId.trim())) throw new TypeError('pack_id must be a non-empty string')
  const revision = body.skill_revision ?? body.skillRevision
  if (revision !== undefined && (typeof revision !== 'string' || !revision.trim())) throw new TypeError('skill_revision must be a non-empty string')
  const rawPrompt = body.prompt ?? body.raw_prompt
  if (typeof rawPrompt !== 'string' || !rawPrompt.trim()) throw new TypeError('prompt/raw_prompt must be a non-empty string')
  const mode = body.mode
  if (!isMediaMode(mode)) throw new TypeError(`mode must be one of ${MEDIA_MODES.join(', ')}`)
  const incomingAssets = normalizeIncomingAssets(body.assets ?? body.incoming_assets ?? body.incomingAssets)
  const argumentsValue = normalizeArguments(body.arguments)
  const compilerModelId = normalizeCompilerModelId(body)
  const nodeParamsValue = body.node_params ?? body.nodeParams ?? body.params
  if (nodeParamsValue !== undefined && !isPlainRecord(nodeParamsValue)) throw new TypeError('node_params must be an object')
  return {
    ...(typeof skillName === 'string' ? { skillName: skillName.trim() } : {}),
    ...(typeof packId === 'string' ? { packId: packId.trim() } : {}),
    ...(typeof revision === 'string' ? { revision: revision.trim() } : {}),
    rawPrompt,
    mode,
    incomingAssets,
    nodeParams: (nodeParamsValue ?? {}) as Record<string, unknown>,
    ...(argumentsValue ? { arguments: argumentsValue } : {}),
    ...(compilerModelId !== undefined ? { compilerModelId } : {}),
    activeWorkspace: workspace,
  }
}

export function registerSkillRoutes(app: Express, getWorkspace: () => string, deps: SkillRouteDeps = {}) {
  const getRegistry = deps.getRegistry ?? (workspace => createSkillRegistry(workspace))
  const installGitHub = deps.installGitHubSkillPack ?? ((sourceUrl, options) => defaultInstallGitHubSkillPack(sourceUrl, options))
  const readSettings = deps.readSkillSettings ?? defaultReadSkillSettings
  const writeSettings = deps.writeSkillSettings ?? defaultWriteSkillSettings
  const compile = deps.compilePromptSkill ?? (async (input: PromptCompileInput) => {
    const registry = await getRegistry(input.activeWorkspace)
    return defaultCompilePromptSkill(input, { ...(deps.compilerDeps ?? {}), registry })
  })

  app.get('/api/skills', async (req, res) => {
    const response = res as unknown as RouteResponse
    try {
      const modeValue = firstQueryValue(req.query?.mode)
      if (modeValue !== undefined && !isMediaMode(modeValue)) return response.status(400).json(errorBody('SKILL_MODE_INVALID', 'mode is invalid'))
      const readyRaw = firstQueryValue(req.query?.ready_only)
      if (readyRaw !== undefined && parseBooleanQuery(readyRaw) === undefined) return response.status(400).json(errorBody('SKILL_READY_ONLY_INVALID', 'ready_only must be a boolean'))
      const activeWorkspace = getWorkspace()
      const registry = await getRegistry(activeWorkspace)
      const mode = modeValue as CanvasMediaMode | undefined
      const readyOnly = parseBooleanQuery(readyRaw)
      const skills = (await registry.list({ mode, readyOnly, includeBuiltins: true })).filter(skill => (
        (!mode || skill.mediaModes.length === 0 || skill.mediaModes.includes(mode))
        && (!readyOnly || skill.compatibility === 'prompt_ready')
      ))
      const packs = deps.getPacks ? await deps.getPacks(activeWorkspace) : await listInstalledPackSummaries(activeWorkspace)
      return response.json({
        skills: skills.map(publicSkillSummary),
        packs: (packs as unknown[]).map(publicPackSummary).filter((pack): pack is PackSummary => Boolean(pack)),
        settings: await readSettings(activeWorkspace),
      })
    } catch (error) {
      return response.status(500).json(errorBody('SKILL_LIST_FAILED', compilerErrorDetail(error)))
    }
  })

  app.post('/api/skills/packs', async (req, res) => {
    const response = res as unknown as RouteResponse
    try {
      if (!isPlainRecord(req.body)) return response.status(400).json(errorBody('SKILL_PACK_REQUEST_INVALID', 'JSON body must be an object'))
      const keys = Object.keys(req.body)
      const hasUrl = typeof req.body.url === 'string'
      const hasLocalPath = typeof req.body.local_path === 'string'
      if (keys.length !== 1 || (!hasUrl && !hasLocalPath)) return response.status(400).json(errorBody('SKILL_PACK_REQUEST_INVALID', 'request must contain exactly one url or allow-listed local_path'))
      const workspace = getWorkspace()
      let record: SkillPackInstallResult | SkillPackRecord
      if (hasUrl) {
        try { parsePublicGitHubUrl(req.body.url as string) } catch (error) { return response.status(400).json(errorBody(String((error as any)?.code || 'SKILL_GITHUB_URL_INVALID'), compilerErrorDetail(error))) }
        record = await installGitHub(req.body.url as string, { workspace })
      } else {
        if (!deps.installLocalSkillPack) return response.status(400).json(errorBody('SKILL_LOCAL_PATH_NOT_ALLOWED', 'local_path installation is not enabled'))
        record = await deps.installLocalSkillPack(req.body.local_path as string, { workspace })
      }
      const publicRecord = normalizePackRecord(record)
      if (!publicRecord) return response.status(502).json(errorBody('SKILL_PACK_INSTALL_FAILED', 'installer returned an invalid Pack record'))
      const registry = await getRegistry(workspace)
      await Promise.resolve(registry.invalidate())
      const skills = await registry.list({ includeBuiltins: true })
      return response.status(201).json({ record: publicRecord, skills: skills.map(publicSkillSummary) })
    } catch (error) {
      const code = typeof (error as any)?.code === 'string' ? String((error as any).code) : 'SKILL_PACK_INSTALL_FAILED'
      const status = code === 'SKILL_GITHUB_URL_INVALID' || code === 'SKILL_LOCAL_PATH_NOT_ALLOWED' ? 400 : 502
      return response.status(status).json(errorBody(code, compilerErrorDetail(error)))
    }
  })

  app.post('/api/skills/compile-preview', async (req, res) => {
    const response = res as unknown as RouteResponse
    try {
      const workspace = getWorkspace()
      const input = normalizeCompileInput(req.body, workspace)
      // The production compiler performs the settings lookup and preflight. An
      // explicitly injected compiler owns that contract itself, which keeps
      // typed errors (including their detail) observable in route tests and in
      // future runtime adapters.
      if (!deps.compilePromptSkill && input.compilerModelId === undefined) {
        const settings = await readSettings(workspace)
        if (settings?.skill_compiler_model_id === null || settings?.skill_compiler_model_id === undefined) {
          return response.status(409).json(errorBody('SKILL_COMPILER_MODEL_REQUIRED', 'A chat compiler model is required'))
        }
      }
      const compiled = await compile(input)
      return response.json({ result: compiled.result, cache_key: compiled.inputHash, cached: compiled.cached })
    } catch (error) {
      if (error instanceof TypeError) return response.status(400).json(errorBody('SKILL_REQUEST_INVALID', error.message))
      const code = compilerErrorCode(error)
      const detail = compilerErrorDetail(error)
      const body = isPlainRecord(req.body) ? req.body : {}
      await logSkillCompileFailure(getWorkspace, 'skill compile-preview failed', code, detail, {
        skill_name: body.skillName ?? body.skill_name,
        pack_id: body.packId ?? body.pack_id,
        mode: body.mode,
      })
      return response.status(compilerErrorStatus(code)).json(errorBody(code, detail))
    }
  })

  app.get('/api/skills/settings', async (_req, res) => {
    const response = res as unknown as RouteResponse
    try { return response.json(await readSettings(getWorkspace())) }
    catch (error) { return response.status(500).json(errorBody('SKILL_SETTINGS_READ_FAILED', compilerErrorDetail(error))) }
  })

  app.put('/api/skills/settings', async (req, res) => {
    const response = res as unknown as RouteResponse
    try {
      if (!isPlainRecord(req.body)) return response.status(400).json(errorBody('SKILL_SETTINGS_INVALID', 'JSON body must be an object'))
      const keys = Object.keys(req.body)
      const hasSnake = Object.prototype.hasOwnProperty.call(req.body, 'skill_compiler_model_id')
      const hasCamel = Object.prototype.hasOwnProperty.call(req.body, 'skillCompilerModelId')
      if (keys.length !== 1 || (hasSnake === hasCamel)) return response.status(400).json(errorBody('SKILL_SETTINGS_INVALID', 'only skill_compiler_model_id is accepted'))
      const value = req.body[hasSnake ? 'skill_compiler_model_id' : 'skillCompilerModelId']
      if (value !== null && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) return response.status(400).json(errorBody('SKILL_SETTINGS_INVALID', 'skill_compiler_model_id must be a non-negative integer or null'))
      return response.json(await writeSettings(getWorkspace(), value as number | null))
    } catch (error) {
      if (error instanceof TypeError) return response.status(400).json(errorBody('SKILL_SETTINGS_INVALID', compilerErrorDetail(error)))
      return response.status(500).json(errorBody('SKILL_SETTINGS_WRITE_FAILED', compilerErrorDetail(error)))
    }
  })
}
