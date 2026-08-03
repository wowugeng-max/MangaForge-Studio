import { createHash, randomUUID } from 'node:crypto'
import { types } from 'node:util'
import { McpError } from '../../mcp/errors'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import type { ChapterSourceLeaseRegistry } from './chapter-source-lease'
import { ChapterGenerationSourceError } from './errors'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
  resolveProseGenerationSource,
  type ChapterGenerationSourceState,
} from './source-config'
import type {
  BeginChapterTaskInput,
  ChapterTaskExecution,
  GenerationSource,
  ResolvedChapterTaskInput,
} from './types'

export type GenerationSourceResolverInput = {
  chapterSourceLeases: ChapterSourceLeaseRegistry
  readProject: (activeWorkspace: string, projectId: number) => Promise<any>
  createModelExecution: (
    input: ResolvedChapterTaskInput & { modelId: number },
  ) => ChapterTaskExecution
  mcpSource?: {
    beginResolvedTask(input: ResolvedChapterTaskInput): Promise<ChapterTaskExecution>
  }
}

type LegacyGenerationSourceResolverInput = {
  modelSource: GenerationSource
  mcpSource?: GenerationSource
}

type TaskGenerationSourceResolver = {
  beginTask(input: BeginChapterTaskInput): Promise<ChapterTaskExecution>
}

type LegacyGenerationSourceResolver = {
  resolve(project: any, options?: any): {
    source: GenerationSource
    configured_type: 'model' | 'mcp'
    resolved_type: 'model' | 'mcp'
    override: 'model' | null
  }
}

export function chapterContextVersion(contextPackage: unknown) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(contextPackage ?? {}), 'utf8')
    .digest('hex')}`
}

function overrideForbidden() {
  return new ChapterGenerationSourceError(
    'GENERATION_SOURCE_OVERRIDE_FORBIDDEN',
    '章节任务不允许覆盖项目生成来源',
  )
}

function assertNoGenerationSourceOverride(options: unknown) {
  if (options === null || options === undefined) return
  if ((typeof options !== 'object' && typeof options !== 'function') || types.isProxy(options)) {
    if (types.isProxy(options)) throw overrideForbidden()
    return
  }
  try {
    if (Object.getOwnPropertyDescriptor(options, 'generation_source_override')) {
      throw overrideForbidden()
    }
  } catch (error) {
    if (error instanceof ChapterGenerationSourceError) throw error
    throw overrideForbidden()
  }
}

function legacyModelOverride(options: unknown): 'model' | null {
  if (!options || (typeof options !== 'object' && typeof options !== 'function') || types.isProxy(options)) {
    return null
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(options, 'generation_source_override')
    return descriptor && 'value' in descriptor && descriptor.value === 'model' ? 'model' : null
  } catch {
    return null
  }
}

function freezeSourceState(sourceState: ChapterGenerationSourceState): ChapterGenerationSourceState {
  const frozenModel = Object.freeze({ ...sourceState.model })
  const frozenMcp = sourceState.mcp ? Object.freeze({ ...sourceState.mcp }) : undefined
  return Object.freeze({
    ...sourceState,
    model: frozenModel,
    ...(frozenMcp ? { mcp: frozenMcp } : {}),
  })
}

function activeSourceChanged() {
  return new ChapterGenerationSourceError(
    'GENERATION_SOURCE_CHANGED',
    '章节生成来源已变化，请重试',
    { reason: 'source_changed' },
  )
}

function positiveModelId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function wrapExecution(
  execution: ChapterTaskExecution,
  resolved: ResolvedChapterTaskInput,
  projectLease: Awaited<ReturnType<ChapterSourceLeaseRegistry['acquire']>>,
): ChapterTaskExecution {
  let closePromise: Promise<void> | undefined
  return {
    taskId: resolved.taskId,
    source: execution.source,
    modelId: execution.modelId,
    fingerprint: resolved.fingerprint,
    contextVersion: resolved.contextVersion,
    provenance: () => execution.provenance(),
    generateDraft: request => execution.generateDraft(request),
    executeAgent: (stage, responseContract, agentId, project, context, options) =>
      execution.executeAgent(stage, responseContract, agentId, project, context, options),
    assertCurrent: () => execution.assertCurrent(),
    close(outcome) {
      if (!closePromise) {
        closePromise = (async () => {
          let sourceError: unknown
          try {
            await execution.close(outcome)
          } catch (error) {
            sourceError = error
          }
          try {
            await projectLease.release()
          } catch (error) {
            if (!sourceError) throw error
          }
          if (sourceError) throw sourceError
        })()
      }
      return closePromise
    },
  }
}

function createTaskResolver(input: GenerationSourceResolverInput): TaskGenerationSourceResolver {
  return {
    async beginTask(beginInput) {
      assertNoGenerationSourceOverride(beginInput.options)
      const taskId = randomUUID()
      const projectId = Number(beginInput.project?.id)
      const projectLease = await input.chapterSourceLeases.acquire(
        beginInput.activeWorkspace,
        projectId,
        taskId,
      )

      try {
        const snapshot = await withMcpWorkspaceMutation(beginInput.activeWorkspace, async () => {
          const currentProject = await input.readProject(beginInput.activeWorkspace, projectId)
          if (!currentProject) throw new Error('project not found')
          const sourceState = freezeSourceState(resolveChapterGenerationSource(currentProject))
          return {
            currentProject,
            sourceState,
            fingerprint: chapterGenerationSourceFingerprint(sourceState),
          }
        })
        const { currentProject, sourceState, fingerprint } = snapshot
        const contextVersion = chapterContextVersion(beginInput.contextPackage)
        const assertCurrent = async () => {
          const currentFingerprint = await withMcpWorkspaceMutation(beginInput.activeWorkspace, async () => {
            const latestProject = await input.readProject(beginInput.activeWorkspace, projectId)
            if (!latestProject) throw activeSourceChanged()
            try {
              return chapterGenerationSourceFingerprint(resolveChapterGenerationSource(latestProject))
            } catch {
              throw activeSourceChanged()
            }
          })
          if (currentFingerprint !== fingerprint) throw activeSourceChanged()
        }
        const resolved: ResolvedChapterTaskInput = {
          ...beginInput,
          project: currentProject,
          taskId,
          sourceState,
          fingerprint,
          contextVersion,
          assertCurrent,
        }

        let execution: ChapterTaskExecution
        if (sourceState.active === 'model') {
          const configuredModelId = sourceState.model.model_id
          const requestedModelId = beginInput.requestedModelId
          const modelId = positiveModelId(configuredModelId) ?? positiveModelId(requestedModelId)
          if (modelId === undefined) {
            throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
          }
          execution = input.createModelExecution({ ...resolved, modelId })
        } else {
          if (!input.mcpSource) {
            throw new McpError('MCP_BINDING_INVALID', '服务端未配置 MCP Runtime，无法执行项目绑定的 MCP 正文源')
          }
          execution = await input.mcpSource.beginResolvedTask(resolved)
        }
        return wrapExecution(execution, resolved, projectLease)
      } catch (error) {
        await projectLease.release()
        throw error
      }
    },
  }
}

function createLegacyResolver(input: LegacyGenerationSourceResolverInput): LegacyGenerationSourceResolver {
  return {
    resolve(project: any, options: any = {}) {
      const configured = resolveProseGenerationSource(project)
      const override = legacyModelOverride(options)
      if (override === 'model' || configured.type === 'model') {
        return {
          source: input.modelSource,
          configured_type: configured.type,
          resolved_type: 'model' as const,
          override,
        }
      }
      if (!input.mcpSource) {
        throw new McpError('MCP_BINDING_INVALID', '服务端未配置 MCP Runtime，无法执行项目绑定的 MCP 正文源')
      }
      return {
        source: input.mcpSource,
        configured_type: configured.type,
        resolved_type: 'mcp' as const,
        override,
      }
    },
  }
}

export function createGenerationSourceResolver(input: GenerationSourceResolverInput): TaskGenerationSourceResolver
export function createGenerationSourceResolver(input: LegacyGenerationSourceResolverInput): LegacyGenerationSourceResolver
export function createGenerationSourceResolver(
  input: GenerationSourceResolverInput | LegacyGenerationSourceResolverInput,
): TaskGenerationSourceResolver | LegacyGenerationSourceResolver {
  return 'chapterSourceLeases' in input ? createTaskResolver(input) : createLegacyResolver(input)
}
