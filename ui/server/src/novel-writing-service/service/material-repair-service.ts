import { createHash } from 'node:crypto'
import { types } from 'node:util'
import {
  commitNovelChapterAcceptance,
  loadNovelMaterialRepairSnapshot,
  type NovelMaterialRepairSnapshot,
} from '../../novel'
import {
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
} from '../generation-source/source-config'
import { ChapterGenerationSourceError } from '../generation-source/errors'
import {
  isChapterTaskId,
  type BeginChapterTaskInput,
  type ChapterTaskExecution,
} from '../generation-source/types'
import {
  buildMaterialRepairTask,
  materialRepairExistingSnapshot,
  prepareMcpMaterialRepairMutation,
  resolveMaterialRepairPlan,
  type PreparedMaterialRepair,
  type ResolvedMaterialRepairPlan,
} from './material-repair-contract'
import {
  buildChapterContextPackage as buildChapterContextPackageFromModule,
} from './chapter-context-package'

const CANONICAL_FINGERPRINT = /^sha256:[0-9a-f]{64}$/

export type MaterialRepairRequest = {
  activeWorkspace: string
  projectId: number
  chapterId: number
  repairKeys?: string[]
  signal?: AbortSignal
}

type BuildChapterContextPackage = typeof buildChapterContextPackageFromModule

export type MaterialRepairServiceDependencies = {
  beginChapterTask: (input: BeginChapterTaskInput) => Promise<ChapterTaskExecution>
  buildChapterContextPackage: BuildChapterContextPackage
  commitAcceptance: typeof commitNovelChapterAcceptance
  loadSnapshot: typeof loadNovelMaterialRepairSnapshot
  now?: () => Date
}

function materialRepairError(code: string, message: string) {
  return Object.assign(new Error(message), { code, error_code: code })
}

function stableIdentityHash(kind: 'project' | 'chapter', values: number[]) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify([`mangaforge_${kind}_v1`, ...values]), 'utf8')
    .digest('hex')}`
}

function canonicalExecutionIdentity(execution: ChapterTaskExecution) {
  if (execution.source !== 'mcp') {
    throw materialRepairError('MATERIAL_REPAIR_SOURCE_INVALID', '材料补齐任务未使用项目 MCP 来源')
  }
  const authorityFingerprint = String(execution.authorityFingerprint || '').trim()
  const sourceFingerprint = String(execution.fingerprint || '').trim()
  const taskContextVersion = String(execution.contextVersion || '').trim()
  if (!CANONICAL_FINGERPRINT.test(authorityFingerprint)
    || !CANONICAL_FINGERPRINT.test(sourceFingerprint)
    || !CANONICAL_FINGERPRINT.test(taskContextVersion)
    || !isChapterTaskId(execution.taskId)) {
    throw materialRepairError('MATERIAL_REPAIR_EXECUTION_IDENTITY_INVALID', '材料补齐任务身份无效')
  }
  return {
    authorityFingerprint,
    sourceFingerprint,
    taskContextVersion,
    taskId: execution.taskId,
  }
}

function canonicalConfirmationTimestamp(now: MaterialRepairServiceDependencies['now']) {
  const value = now ? now() : new Date()
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw materialRepairError('MATERIAL_REPAIR_CLOCK_INVALID', '材料补齐确认时间无效')
  }
  return value.toISOString()
}

function snapshotSceneCards(snapshot: NovelMaterialRepairSnapshot) {
  const chapter = snapshot.chapter
  if (Array.isArray(chapter.scene_list) && chapter.scene_list.length) return chapter.scene_list
  return Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : []
}

function snapshotContextOptions(snapshot: NovelMaterialRepairSnapshot, deterministic: boolean) {
  const options = {
    settingEntities: snapshot.settings,
    chapterSettingUsage: snapshot.chapterSettingUsage,
    projectSettingUsage: snapshot.projectSettingUsage,
    persistSettingUsage: false,
  }
  return deterministic ? { ...options, referencePreview: null } : options
}

async function buildSnapshotContext(
  deps: MaterialRepairServiceDependencies,
  activeWorkspace: string,
  snapshot: NovelMaterialRepairSnapshot,
  deterministic: boolean,
) {
  return deps.buildChapterContextPackage(
    activeWorkspace,
    snapshot.project,
    snapshot.chapter,
    snapshot.chapters,
    snapshot.worldbuilding,
    snapshot.characters,
    snapshot.outlines,
    snapshot.reviews,
    snapshotContextOptions(snapshot, deterministic),
  )
}

function completeExistingSnapshot(snapshot: NovelMaterialRepairSnapshot, contextPackage: any) {
  return materialRepairExistingSnapshot({
    project: snapshot.project,
    chapter: snapshot.chapter,
    contextPackage,
    chapters: snapshot.chapters,
    worldbuilding: snapshot.worldbuilding,
    characters: snapshot.characters,
    sceneCards: snapshotSceneCards(snapshot),
    referencePreview: null,
    reviews: snapshot.reviews,
    settings: snapshot.settings,
    chapterSettingUsage: snapshot.chapterSettingUsage,
  })
}

const MATERIAL_REPAIR_RESPONSE_PRIVATE_FIELDS = new Set([
  'serverid',
  'keyid',
  'adapterid',
  'agentid',
  'sessionid',
  'authorization',
  'apikey',
  'prompt',
  'remotebody',
  'rawbody',
  'responsebody',
  'cookie',
  'cookies',
  'accesstoken',
  'xapikey',
  'credential',
  'credentials',
  'clientcredential',
  'clientcredentials',
  'refreshtoken',
  'authtoken',
  'bearertoken',
  'xauthtoken',
  'setcookie',
  'authorizationheader',
  'password',
  'clientsecret',
  'apisecret',
  'oauthclientsecret',
  'oauthaccesstoken',
  'oauthrefreshtoken',
  'idtoken',
  'privatekey',
  'signingkey',
  'webhooksecret',
])

type MaterialRepairResponsePath = Array<string | number>

function canonicalCharacterNarrativeSecret(field: string, parentPath: MaterialRepairResponsePath) {
  return field === 'secret'
    && parentPath.length === 2
    && parentPath[0] === 'characters'
    && typeof parentPath[1] === 'number'
}

function privateMaterialRepairResponseField(field: string, parentPath: MaterialRepairResponsePath) {
  const normalized = field.replace(/[^a-z0-9]/gi, '').toLowerCase()
  if (normalized === 'secret') return !canonicalCharacterNarrativeSecret(field, parentPath)
  return MATERIAL_REPAIR_RESPONSE_PRIVATE_FIELDS.has(normalized) || normalized.endsWith('headers')
}

function materialRepairResponseUnsafe() {
  return materialRepairError('MATERIAL_REPAIR_RESPONSE_UNSAFE', '材料补齐返回包含不安全的本地响应结构')
}

function sanitizeMaterialRepairResponseValue(
  value: any,
  path: MaterialRepairResponsePath = [],
  state = { stack: new WeakSet<object>(), nodes: 0 },
  depth = 0,
): any {
  if (!value || typeof value !== 'object') return value
  if (depth > 32 || state.nodes >= 20000 || types.isProxy(value) || state.stack.has(value)) {
    throw materialRepairResponseUnsafe()
  }
  state.nodes += 1
  state.stack.add(value)
  try {
    const prototype = Object.getPrototypeOf(value)
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) throw materialRepairResponseUnsafe()
      const descriptors = Object.getOwnPropertyDescriptors(value)
      const sanitized: any[] = []
      for (const [field, descriptor] of Object.entries(descriptors)) {
        if (field === 'length') continue
        if (!('value' in descriptor)) throw materialRepairResponseUnsafe()
        if (descriptor.enumerable !== true) continue
        if (!/^(0|[1-9][0-9]*)$/.test(field)) throw materialRepairResponseUnsafe()
        const index = Number(field)
        sanitized[index] = sanitizeMaterialRepairResponseValue(
          descriptor.value,
          [...path, index],
          state,
          depth + 1,
        )
      }
      return sanitized
    }
    if (prototype !== Object.prototype && prototype !== null) throw materialRepairResponseUnsafe()
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const sanitized = Object.create(null) as Record<string, unknown>
    for (const [field, descriptor] of Object.entries(descriptors)) {
      if (!('value' in descriptor)) throw materialRepairResponseUnsafe()
      if (descriptor.enumerable !== true) continue
      if (field === '__proto__') throw materialRepairResponseUnsafe()
      if (privateMaterialRepairResponseField(field, path)) continue
      Object.defineProperty(sanitized, field, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: sanitizeMaterialRepairResponseValue(descriptor.value, [...path, field], state, depth + 1),
      })
    }
    return sanitized
  } catch (error) {
    if (ownFailureText(error, 'code') === 'MATERIAL_REPAIR_RESPONSE_UNSAFE') throw error
    throw materialRepairResponseUnsafe()
  } finally {
    state.stack.delete(value)
  }
}

function ownFailureText(error: unknown, field: string) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function') || types.isProxy(error)) return ''
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, field)
    return descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
      ? descriptor.value
      : ''
  } catch {
    return ''
  }
}

function materialRepairCancelled(error: unknown, signal?: AbortSignal) {
  if (signal?.reason !== undefined && error === signal.reason) return true
  const code = ownFailureText(error, 'code') || ownFailureText(error, 'error_code')
  const name = ownFailureText(error, 'name')
  return ['REQUEST_CANCELED', 'MCP_CANCELLED', 'ABORT_ERR'].includes(code) || name === 'AbortError'
}

function implicitMaterialRepairPlan(contextPackage: any): ResolvedMaterialRepairPlan {
  const checks = Array.isArray(contextPackage?.preflight?.checks) ? contextPackage.preflight.checks : []
  const repairableKeys: string[] = []
  for (const check of checks) {
    if (!check || typeof check !== 'object' || check.ok === true) continue
    const key = typeof check.key === 'string' ? check.key.trim() : ''
    if (!key) continue
    try {
      resolveMaterialRepairPlan(contextPackage, [key])
      repairableKeys.push(key)
    } catch (error) {
      const code = ownFailureText(error, 'code') || ownFailureText(error, 'error_code')
      if (code !== 'MATERIAL_REPAIR_UNREPAIRABLE' && code !== 'MATERIAL_REPAIR_KEY_UNSUPPORTED') throw error
    }
  }
  return repairableKeys.length
    ? resolveMaterialRepairPlan(contextPackage, repairableKeys)
    : { targets: new Set(), obligations: [] }
}

function committedRefreshError(taskId: string) {
  return Object.assign(
    materialRepairError('MATERIAL_REPAIR_RESULT_REFRESH_FAILED', '材料补齐已提交，但最终材料状态刷新失败，请重新读取项目'),
    { committed: true as const, task_id: taskId },
  )
}

function materialRepairResponse(
  prepared: PreparedMaterialRepair,
  refreshed: NovelMaterialRepairSnapshot,
  contextPackage: any,
  executionIdentity: ReturnType<typeof canonicalExecutionIdentity>,
) {
  return {
    ok: true,
    skipped: false,
    source: 'mcp' as const,
    task_id: executionIdentity.taskId,
    source_fingerprint: executionIdentity.sourceFingerprint,
    context_version: executionIdentity.taskContextVersion,
    applied: prepared.applied,
    summary: prepared.summary,
    chapter: sanitizeMaterialRepairResponseValue(refreshed.chapter, ['chapter']),
    chapters: sanitizeMaterialRepairResponseValue(refreshed.chapters, ['chapters']),
    worldbuilding: sanitizeMaterialRepairResponseValue(refreshed.worldbuilding, ['worldbuilding']),
    characters: sanitizeMaterialRepairResponseValue(refreshed.characters, ['characters']),
    settings: sanitizeMaterialRepairResponseValue(refreshed.settings, ['settings']),
    chapter_setting_usage: sanitizeMaterialRepairResponseValue(refreshed.chapterSettingUsage, ['chapter_setting_usage']),
    project_setting_usage: sanitizeMaterialRepairResponseValue(refreshed.projectSettingUsage, ['project_setting_usage']),
    context_package: sanitizeMaterialRepairResponseValue(contextPackage, ['context_package']),
    preflight: sanitizeMaterialRepairResponseValue(contextPackage?.preflight || null, ['preflight']),
  }
}

export function createMaterialRepairService(deps: MaterialRepairServiceDependencies) {
  return {
    async repairChapterMaterials(input: MaterialRepairRequest) {
      const loaded = await deps.loadSnapshot(
        input.activeWorkspace,
        input.projectId,
        input.chapterId,
      )
      const source = resolveChapterGenerationSource(loaded.project)
      if (source.active !== 'mcp') {
        throw materialRepairError(
          'MATERIAL_REPAIR_MODEL_PATH_REQUIRED',
          '模型材料补齐必须使用现有模型路径',
        )
      }
      const loadedAuthorityFingerprint = chapterGenerationSourceFingerprint(source)

      const contextPackage = await buildSnapshotContext(deps, input.activeWorkspace, loaded, true)
      const plan = input.repairKeys?.length
        ? resolveMaterialRepairPlan(contextPackage, input.repairKeys)
        : implicitMaterialRepairPlan(contextPackage)
      if (plan.targets.size === 0) {
        const finalContext = await buildSnapshotContext(deps, input.activeWorkspace, loaded, false)
        const sanitizedContext = sanitizeMaterialRepairResponseValue(finalContext, ['context_package'])
        return {
          ok: true,
          skipped: true,
          source: 'mcp' as const,
          applied: [],
          summary: '',
          context_package: sanitizedContext,
          preflight: sanitizedContext?.preflight || null,
        }
      }

      const execution = await deps.beginChapterTask({
        activeWorkspace: input.activeWorkspace,
        project: loaded.project,
        chapter: loaded.chapter,
        contextPackage,
        options: { material_repair: true },
        signal: input.signal,
      })
      let primaryFailure: unknown
      let failed = false
      let executionIdentity: ReturnType<typeof canonicalExecutionIdentity> | undefined
      let prepared: PreparedMaterialRepair | undefined
      try {
        executionIdentity = canonicalExecutionIdentity(execution)
        if (executionIdentity.authorityFingerprint !== loadedAuthorityFingerprint) {
          throw new ChapterGenerationSourceError(
            'GENERATION_SOURCE_CHANGED',
            '项目章节生成来源已在材料快照与任务开始之间变化；旧快照不会执行',
            { reason: 'snapshot_source_changed' },
          )
        }
        const task = buildMaterialRepairTask({
          plan,
          project: loaded.project,
          chapter: loaded.chapter,
          contextPackage,
          chapters: loaded.chapters,
          worldbuilding: loaded.worldbuilding,
          characters: loaded.characters,
          outlines: loaded.outlines,
          reviews: loaded.reviews,
          settings: loaded.settings,
          chapterSettingUsage: loaded.chapterSettingUsage,
          projectSettingUsage: loaded.projectSettingUsage,
          identity: {
            project_identity_hash: stableIdentityHash('project', [loaded.project.id]),
            chapter_identity_hash: stableIdentityHash('chapter', [loaded.project.id, loaded.chapter.id]),
            source_identity_hash: executionIdentity.authorityFingerprint || executionIdentity.sourceFingerprint,
            context_identity_hash: loaded.contextVersion,
          },
        })
        const stageResult = await execution.executeAgent(
          'material_repair',
          'material_repair_json',
          'outline-agent',
          loaded.project,
          { task, authoritativeTask: true },
          { activeWorkspace: input.activeWorkspace, signal: input.signal },
        )
        prepared = prepareMcpMaterialRepairMutation({
          plan,
          payload: getNovelPayload(stageResult),
          existing: completeExistingSnapshot(loaded, contextPackage),
          confirmationTimestamp: canonicalConfirmationTimestamp(deps.now),
        })
        await execution.assertCurrent()
        await deps.commitAcceptance(input.activeWorkspace, {
          chapter_id: loaded.chapter.id,
          expected_chapter_generation_source_fingerprint: executionIdentity.authorityFingerprint,
          expected_material_repair_context_version: loaded.contextVersion,
          ...prepared.acceptance,
        })
      } catch (error) {
        failed = true
        primaryFailure = error
      }

      if (failed) {
        try {
          await execution.close({
            status: materialRepairCancelled(primaryFailure, input.signal) ? 'cancelled' : 'failed',
            error: primaryFailure,
          })
        } catch (closeError) {
          throw new AggregateError(
            [primaryFailure, closeError],
            'Material repair and task close both failed',
          )
        }
        throw primaryFailure
      }

      let result: ReturnType<typeof materialRepairResponse> | undefined
      let refreshFailure: ReturnType<typeof committedRefreshError> | undefined
      try {
        const refreshed = await deps.loadSnapshot(
          input.activeWorkspace,
          input.projectId,
          input.chapterId,
        )
        const refreshedContext = await buildSnapshotContext(deps, input.activeWorkspace, refreshed, false)
        result = materialRepairResponse(prepared!, refreshed, refreshedContext, executionIdentity!)
      } catch {
        refreshFailure = committedRefreshError(executionIdentity!.taskId)
      }

      let closeFailure: unknown
      try {
        await execution.close({ status: 'success' })
      } catch (error) {
        closeFailure = error
      }
      if (refreshFailure && closeFailure !== undefined) {
        throw new AggregateError(
          [refreshFailure, closeFailure],
          'Committed material repair refresh and task close both failed',
        )
      }
      if (refreshFailure) throw refreshFailure
      if (closeFailure !== undefined) throw closeFailure
      return result!
    },
  }
}

export type MaterialRepairService = ReturnType<typeof createMaterialRepairService>
