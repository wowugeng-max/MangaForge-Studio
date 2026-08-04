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

function projectIdentityChanged() {
  return new ChapterGenerationSourceError(
    'GENERATION_SOURCE_CHANGED',
    '章节生成项目已变化，请重试',
    { reason: 'project_changed' },
  )
}

function positiveModelId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function ownProjectId(value: unknown) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, 'id')
    return descriptor && 'value' in descriptor ? positiveModelId(descriptor.value) : undefined
  } catch {
    return undefined
  }
}

function assertProjectIdentity(value: unknown, expectedProjectId: number) {
  if (ownProjectId(value) !== expectedProjectId) throw projectIdentityChanged()
  return value
}

async function readMatchingProject(
  readProject: GenerationSourceResolverInput['readProject'],
  activeWorkspace: string,
  projectId: number,
) {
  const currentProject = await readProject(activeWorkspace, projectId)
  assertProjectIdentity(currentProject, projectId)
  return currentProject
}

function wrapExecution(
  execution: ChapterTaskExecution,
  resolved: ResolvedChapterTaskInput,
  projectLease: Awaited<ReturnType<ChapterSourceLeaseRegistry['acquire']>>,
): ChapterTaskExecution {
  let sourceClosePromise: Promise<void> | undefined
  let sourceCloseFailed = false
  let sourceCloseError: unknown
  let closeAttempt: Promise<void> | undefined
  let terminalClose: Promise<void> | undefined
  return {
    taskId: resolved.taskId,
    source: execution.source,
    modelId: execution.modelId,
    authorityFingerprint: resolved.authorityFingerprint,
    fingerprint: resolved.fingerprint,
    contextVersion: resolved.contextVersion,
    provenance: () => execution.provenance(),
    generateDraft: request => execution.generateDraft(request),
    executeAgent: (stage, responseContract, agentId, project, context, options) =>
      execution.executeAgent(stage, responseContract, agentId, project, context, options),
    assertCurrent: () => execution.assertCurrent(),
    close(outcome) {
      if (terminalClose) return terminalClose
      if (closeAttempt) return closeAttempt
      if (!sourceClosePromise) {
        sourceClosePromise = Promise.resolve().then(() => execution.close(outcome))
      }
      let releaseSucceeded = false
      const attempt = (async () => {
        try {
          await sourceClosePromise
        } catch (error) {
          sourceCloseFailed = true
          sourceCloseError = error
        }
        try {
          await projectLease.release()
          releaseSucceeded = true
        } catch (releaseError) {
          if (sourceCloseFailed) {
            throw new AggregateError(
              [sourceCloseError, releaseError],
              'Chapter task source close and project lease release both failed',
            )
          }
          throw releaseError
        }
        if (sourceCloseFailed) throw sourceCloseError
      })()
      closeAttempt = attempt
      void attempt.then(
        () => { terminalClose = attempt },
        () => { if (releaseSucceeded) terminalClose = attempt },
      ).finally(() => {
        if (closeAttempt === attempt) closeAttempt = undefined
      })
      return attempt
    },
  }
}

function createTaskResolver(input: GenerationSourceResolverInput): TaskGenerationSourceResolver {
  return {
    async beginTask(beginInput) {
      assertNoGenerationSourceOverride(beginInput.options)
      const taskId = randomUUID()
      const projectId = ownProjectId(beginInput.project)
      if (projectId === undefined) throw projectIdentityChanged()
      const projectLease = await input.chapterSourceLeases.acquire(
        beginInput.activeWorkspace,
        projectId,
        taskId,
      )

      try {
        const snapshot = await withMcpWorkspaceMutation(beginInput.activeWorkspace, async () => {
          const currentProject = await readMatchingProject(
            input.readProject,
            beginInput.activeWorkspace,
            projectId,
          )
          const authoritySourceState = freezeSourceState(resolveChapterGenerationSource(currentProject))
          return {
            currentProject,
            authoritySourceState,
            authorityFingerprint: chapterGenerationSourceFingerprint(authoritySourceState),
          }
        })
        const { currentProject, authoritySourceState, authorityFingerprint } = snapshot
        let sourceState = authoritySourceState
        let modelId: number | undefined
        if (authoritySourceState.active === 'model') {
          modelId = positiveModelId(authoritySourceState.model.model_id)
            ?? positiveModelId(beginInput.requestedModelId)
          if (modelId === undefined) {
            throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
          }
          sourceState = freezeSourceState({
            ...authoritySourceState,
            model: { model_id: modelId },
          })
        }
        const fingerprint = chapterGenerationSourceFingerprint(sourceState)
        const contextVersion = chapterContextVersion(beginInput.contextPackage)
        const assertCurrent = async () => {
          const currentFingerprint = await withMcpWorkspaceMutation(beginInput.activeWorkspace, async () => {
            const latestProject = await readMatchingProject(
              input.readProject,
              beginInput.activeWorkspace,
              projectId,
            )
            try {
              return chapterGenerationSourceFingerprint(resolveChapterGenerationSource(latestProject))
            } catch {
              throw activeSourceChanged()
            }
          })
          if (currentFingerprint !== authorityFingerprint) throw activeSourceChanged()
        }
        const resolved: ResolvedChapterTaskInput = {
          ...beginInput,
          project: currentProject,
          taskId,
          sourceState,
          authorityFingerprint,
          fingerprint,
          contextVersion,
          assertCurrent,
        }

        let execution: ChapterTaskExecution
        if (sourceState.active === 'model') {
          execution = input.createModelExecution({ ...resolved, modelId: modelId! })
        } else {
          if (!input.mcpSource) {
            throw new McpError('MCP_BINDING_INVALID', '服务端未配置 MCP Runtime，无法执行项目绑定的 MCP 正文源')
          }
          execution = await input.mcpSource.beginResolvedTask(resolved)
        }
        return wrapExecution(execution, resolved, projectLease)
      } catch (error) {
        try {
          await projectLease.release()
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Chapter task construction and project lease cleanup both failed',
          )
        }
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
