import { createHash } from 'node:crypto'
import {
  commitNovelChapterAcceptance,
  loadNovelMaterialRepairSnapshot,
  type NovelMaterialRepairSnapshot,
} from '../../novel'
import {
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  resolveChapterGenerationSource,
} from '../generation-source/source-config'
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

function deterministicContextOptions(snapshot: NovelMaterialRepairSnapshot) {
  return {
    settingEntities: snapshot.settings,
    chapterSettingUsage: snapshot.chapterSettingUsage,
    projectSettingUsage: snapshot.projectSettingUsage,
    persistSettingUsage: false,
    referencePreview: null,
  }
}

async function buildSnapshotContext(
  deps: MaterialRepairServiceDependencies,
  activeWorkspace: string,
  snapshot: NovelMaterialRepairSnapshot,
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
    deterministicContextOptions(snapshot),
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
])

function privateMaterialRepairResponseField(field: string) {
  const normalized = field.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return MATERIAL_REPAIR_RESPONSE_PRIVATE_FIELDS.has(normalized) || normalized.endsWith('headers')
}

function sanitizeMaterialRepairResponseValue(value: any, seen = new WeakMap<object, any>()): any {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value)
    const sanitized: any[] = []
    seen.set(value, sanitized)
    for (const item of value) sanitized.push(sanitizeMaterialRepairResponseValue(item, seen))
    return sanitized
  }
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return seen.get(value)
  const sanitized: Record<string, unknown> = {}
  seen.set(value, sanitized)
  for (const [field, item] of Object.entries(value)) {
    if (privateMaterialRepairResponseField(field)) continue
    sanitized[field] = sanitizeMaterialRepairResponseValue(item, seen)
  }
  return sanitized
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
    chapter: sanitizeMaterialRepairResponseValue(refreshed.chapter),
    chapters: sanitizeMaterialRepairResponseValue(refreshed.chapters),
    worldbuilding: sanitizeMaterialRepairResponseValue(refreshed.worldbuilding),
    characters: sanitizeMaterialRepairResponseValue(refreshed.characters),
    settings: sanitizeMaterialRepairResponseValue(refreshed.settings),
    chapter_setting_usage: sanitizeMaterialRepairResponseValue(refreshed.chapterSettingUsage),
    project_setting_usage: sanitizeMaterialRepairResponseValue(refreshed.projectSettingUsage),
    context_package: sanitizeMaterialRepairResponseValue(contextPackage),
    preflight: sanitizeMaterialRepairResponseValue(contextPackage?.preflight || null),
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

      const contextPackage = await buildSnapshotContext(deps, input.activeWorkspace, loaded)
      const plan = resolveMaterialRepairPlan(contextPackage, input.repairKeys)
      if (plan.targets.size === 0) {
        return {
          ok: true,
          skipped: true,
          source: 'mcp' as const,
          applied: [],
          summary: '',
          context_package: contextPackage,
          preflight: contextPackage?.preflight || null,
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
      let result: ReturnType<typeof materialRepairResponse> | undefined
      let primaryFailure: unknown
      let failed = false
      try {
        const executionIdentity = canonicalExecutionIdentity(execution)
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
          { task },
          { activeWorkspace: input.activeWorkspace, signal: input.signal },
        )
        const prepared = prepareMcpMaterialRepairMutation({
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
        const refreshed = await deps.loadSnapshot(
          input.activeWorkspace,
          input.projectId,
          input.chapterId,
        )
        const refreshedContext = await buildSnapshotContext(deps, input.activeWorkspace, refreshed)
        result = materialRepairResponse(prepared, refreshed, refreshedContext, executionIdentity)
      } catch (error) {
        failed = true
        primaryFailure = error
      }

      if (failed) {
        try {
          await execution.close({
            status: input.signal?.aborted === true ? 'cancelled' : 'failed',
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

      await execution.close({ status: 'success' })
      return result!
    },
  }
}

export type MaterialRepairService = ReturnType<typeof createMaterialRepairService>
