import { createHash } from 'crypto'
import { buildAgentMessages, parseAgentOutput } from '../../llm/executor-helpers'
import { stringifyLLMMessageTextContent, type LLMResponse } from '../../llm/types'
import { appendNovelRun, getNovelProject, updateNovelRun } from '../../novel'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { isAbortRelatedError, McpError, isMcpError } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import type { McpAgentLease } from '../../mcp/agent-lease'
import type { McpGenerationReceiptStatus } from '../../mcp/types'
import type {
  McpChapterStageInput,
  McpChapterStageResult,
  McpChapterTaskSession,
} from '../../mcp/adapters/types'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { createMcpSecretScrubber } from '../../mcp/secret-scrubber'
import { readMcpServers } from '../../mcp/server-store'
import {
  chapterGenerationSourceFingerprint,
  proseGenerationSourceFingerprint,
  resolveChapterGenerationSource,
  resolveProseGenerationSource,
  validateMcpCredentialSelectionSnapshot,
  validateMcpProjectBinding,
} from './source-config'
import {
  MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
  type ChapterStageResponseContract,
  type ChapterTaskExecution,
  type ChapterTaskProvenance,
  type ChapterTaskStage,
  type GenerationSource,
  type ProseGenerationRequest,
  type ProseGenerationResult,
  type ResolvedChapterTaskInput,
} from './types'
import { attachProductionLease } from './production-lease'
import { createChapterStageRecorder, projectChapterTaskProvenance } from './stage-receipts'

const PROVENANCE_ID_MAX_CHARS = 160

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function contextSnapshotText(value: unknown) {
  if (typeof value === 'string') return value
  return `${JSON.stringify(value ?? {}, null, 2)}\n`
}

function boundedScrubbedId(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: unknown,
) {
  return scrubber.scrubText(value).slice(0, PROVENANCE_ID_MAX_CHARS)
}

function scrubbedProvenance(
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
  value: Record<string, unknown>,
  bindingFingerprint: string,
) {
  return {
    ...scrubber.scrubValue(value),
    receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
    binding_fingerprint: bindingFingerprint,
  }
}

async function readBindingCredentialSnapshot(activeWorkspace: string, binding: {
  server_id: string
  key_id: number
}) {
  const [servers, keys] = await Promise.all([
    readMcpServers(activeWorkspace),
    readMcpKeys(activeWorkspace),
  ])
  const selectedKeys = keys.filter(item => item.id === binding.key_id)
  const serverIds = new Set([
    binding.server_id,
    ...selectedKeys.map(item => item.mcp_server_id),
  ])
  return {
    records: { servers, keys },
    secrets: {
      keys: selectedKeys.map(item => item.key),
      headerValues: servers
        .filter(item => serverIds.has(item.id))
        .flatMap(item => Object.values(item.custom_headers)),
    },
  }
}

function errorReceipt(
  error: any,
  provenance: Record<string, unknown>,
  status: McpGenerationReceiptStatus,
) {
  return {
    ...provenance,
    status,
    error_code: String(error?.code || error?.error_code || 'MCP_GENERATION_FAILED').slice(0, 80),
    error: String(error?.message || error || 'MCP 正文生成失败').slice(0, 500),
  }
}

function receiptStatusForError(error: any): McpGenerationReceiptStatus {
  const explicit = String(error?.details?.receipt_status || '')
  if (error?.details?.remote_cancel_confirmed === false
    && (explicit === 'send_unknown' || explicit === 'remote_cancel_unknown')) {
    return explicit
  }
  if (error?.code === 'MCP_SEND_UNKNOWN') return 'send_unknown'
  if (error?.code === 'MCP_CANCELLED') return 'cancelled'
  if (error?.code === 'MCP_GENERATION_TIMEOUT') return 'timed_out'
  return 'failed'
}

function unresolvedStoreError(
  storeError: Error,
  causeError: unknown,
  receiptStatus: Extract<McpGenerationReceiptStatus, 'send_unknown' | 'remote_cancel_unknown'>,
  sessionId: string,
) {
  const causeCode = isMcpError(causeError)
    ? causeError.code
    : String((causeError as any)?.code || 'MCP_RUNTIME_ERROR').slice(0, 80)
  return new McpError(
    isMcpError(storeError) ? storeError.code : 'MCP_STORE_IO_FAILED',
    storeError.message,
    {
      cause_code: causeCode,
      receipt_status: receiptStatus,
      session_id: sessionId,
      remote_cancel_confirmed: false,
    },
  )
}

function blockedInvalidResidual(error: any) {
  const admissionStatus = String(error?.admission_status || error?.admissionStatus || '')
  if (admissionStatus !== 'blocked_invalid') return undefined
  return [
    error?.chapter_text,
    error?.chapterText,
    error?.finalText,
    error?.final_text,
    error?.text,
    error?.details?.chapter_text,
    error?.details?.chapterText,
    error?.admission_failure?.details?.chapter_text,
    error?.admission_failure?.details?.chapterText,
  ].find(item => typeof item === 'string' && item.trim().length > 200) as string | undefined
}

function enumerableErrorMetadata(error: unknown, excluded: Set<string>) {
  if (!error || typeof error !== 'object') return {}
  return Object.fromEntries(Object.entries(error).filter(([key]) => !excluded.has(key)))
}

function restoreBlockedInvalidResidual(error: any, residualText?: string) {
  if (typeof residualText !== 'string') return error
  error.chapter_text = residualText
  error.finalText = residualText
  error.details = {
    ...(error.details && typeof error.details === 'object' ? error.details : {}),
    chapter_text: residualText,
  }
  return error
}

function scrubGenerationError(
  error: unknown,
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
) {
  const message = scrubber.scrubText((error as any)?.message || error || 'MCP 正文生成失败')
  const residualText = blockedInvalidResidual(error)
  if (isMcpError(error)) {
    const scrubbed = new McpError(
      error.code,
      message,
      error.details ? scrubber.scrubValue(error.details) : undefined,
    )
    scrubbed.name = scrubber.scrubText(error.name || 'McpError')
    Object.assign(scrubbed, scrubber.scrubValue(enumerableErrorMetadata(
      error,
      new Set(['stack', 'name', 'message', 'code', 'error_code', 'details']),
    )))
    return restoreBlockedInvalidResidual(scrubbed, residualText)
  }
  const scrubbed = new Error(message)
  scrubbed.name = scrubber.scrubText((error as any)?.name || 'Error')
  const metadata = scrubber.scrubValue(enumerableErrorMetadata(
    error,
    new Set(['stack', 'name', 'message']),
  ))
  Object.assign(scrubbed, metadata)
  return restoreBlockedInvalidResidual(scrubbed, residualText)
}

function compileMcpAgentPrompt(
  agentId: string,
  project: Record<string, any>,
  context: Record<string, any>,
) {
  return buildAgentMessages(agentId, project, context)
    .map(message => `[${message.role.toUpperCase()}]\n${stringifyLLMMessageTextContent(message.content)}`)
    .join('\n\n')
}

function parsedDraftPayload(content: string) {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() || trimmed
  try {
    return JSON.parse(fenced)
  } catch {
    return undefined
  }
}

function normalizeDraftStageContent(content: string, chapterNo: number) {
  const trimmed = content.trim()
  if (!trimmed) throw new McpError('MCP_EMPTY_PROSE', 'MCP 章节 stage 已完成但没有返回正文')
  const payload = parsedDraftPayload(trimmed)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>
    const candidates = Array.isArray(record.prose_chapters)
      ? record.prose_chapters
      : Array.isArray(record.proseChapters)
        ? record.proseChapters
        : []
    const chapters = candidates.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const chapter = item as Record<string, unknown>
      const chapterText = typeof chapter.chapter_text === 'string'
        ? chapter.chapter_text
        : typeof chapter.chapterText === 'string'
          ? chapter.chapterText
          : ''
      if (!chapterText.trim()) return []
      const remoteChapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? chapterNo)
      return [{
        chapter_no: Number.isSafeInteger(remoteChapterNo) && remoteChapterNo > 0
          ? remoteChapterNo
          : chapterNo,
        ...(typeof chapter.title === 'string' && chapter.title.trim() ? { title: chapter.title } : {}),
        chapter_text: chapterText,
      }]
    })
    if (chapters.length) return chapters
    const directText = typeof record.chapter_text === 'string'
      ? record.chapter_text
      : typeof record.chapterText === 'string'
        ? record.chapterText
        : ''
    if (directText.trim()) return [{ chapter_no: chapterNo, chapter_text: directText }]
  }
  return [{ chapter_no: chapterNo, chapter_text: trimmed }]
}

function selectedTaskCredential(snapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>, binding: {
  server_id: string
  key_id: number
  adapter_id: string
}) {
  const server = snapshot.records.servers.find(item => item.id === binding.server_id)
  const key = snapshot.records.keys.find(item => item.id === binding.key_id)
  if (!server || !server.is_active) {
    throw new McpError('MCP_BINDING_INVALID', `MCP Server 不存在或已禁用：${binding.server_id}`)
  }
  if (!key || !key.is_active) {
    throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在或已禁用：${binding.key_id}`)
  }
  if (key.mcp_server_id !== server.id) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Key 不属于项目绑定的 Server')
  }
  if (server.transport !== 'streamable_http') {
    throw new McpError('MCP_BINDING_INVALID', '章节 MCP 生成只支持 Streamable HTTP')
  }
  if (server.adapter_id !== binding.adapter_id) {
    throw new McpError('MCP_BINDING_INVALID', '项目 Adapter 与 Server Adapter 不一致')
  }
  return { server, key }
}

type ChapterTaskRuntime = Pick<McpRuntime,
  'resolveCredentialConfig' | 'getAdapterForKey' | 'acquireAgentLease'
>

class McpChapterTaskExecution implements ChapterTaskExecution {
  readonly taskId: string
  readonly source = 'mcp' as const
  readonly fingerprint: string
  readonly contextVersion: string

  private readonly binding: NonNullable<ResolvedChapterTaskInput['sourceState']['mcp']>
  private readonly recordStage: ReturnType<typeof createChapterStageRecorder>
  private scrubber: ReturnType<typeof createMcpSecretScrubber>
  private sessionPromise?: Promise<McpChapterTaskSession>
  private session?: McpChapterTaskSession
  private lease?: McpAgentLease
  private deadline?: McpGenerationDeadline
  private taskReceiptId?: number
  private sessionId = ''
  private snapshotHash = ''
  private sessionFenceStaged = false
  private stageSequence = 0
  private deadlineClosed = false
  private releasePromise?: Promise<void>
  private failurePromise?: Promise<never>
  private closePromise?: Promise<void>

  constructor(
    private readonly runtime: ChapterTaskRuntime,
    private readonly input: ResolvedChapterTaskInput,
    private readonly credentialSnapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>,
    private readonly createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline,
  ) {
    if (input.sourceState.active !== 'mcp' || !input.sourceState.mcp) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP 章节任务需要完整的项目绑定')
    }
    this.binding = input.sourceState.mcp
    this.taskId = input.taskId
    this.fingerprint = input.fingerprint
    this.contextVersion = input.contextVersion
    this.scrubber = createMcpSecretScrubber(credentialSnapshot.secrets)
    this.recordStage = createChapterStageRecorder({
      activeWorkspace: input.activeWorkspace,
      provenance: () => this.provenance(),
      scrubError: error => {
        const scrubbed = scrubGenerationError(error, this.scrubber)
        return {
          code: String((scrubbed as any)?.code || (scrubbed as any)?.error_code || 'MCP_STAGE_FAILED'),
          message: this.scrubber.scrubText((scrubbed as any)?.message || scrubbed || 'MCP stage failed').slice(0, 500),
        }
      },
    })
  }

  provenance(): ChapterTaskProvenance {
    return projectChapterTaskProvenance({
      task_id: this.taskId,
      project_id: Number(this.input.project?.id || 0),
      chapter_id: Number(this.input.chapter?.id || 0),
      source: 'mcp',
      source_fingerprint: this.fingerprint,
      context_version: this.contextVersion,
      server_id: boundedScrubbedId(this.scrubber, this.binding.server_id),
      key_id: this.binding.key_id,
      adapter_id: boundedScrubbedId(this.scrubber, this.binding.adapter_id),
      agent_id: boundedScrubbedId(this.scrubber, this.binding.agent_id),
      model: boundedScrubbedId(this.scrubber, this.binding.model || 'MCP Auto'),
      ...(this.sessionId ? { session_id: boundedScrubbedId(this.scrubber, this.sessionId) } : {}),
    })
  }

  private rotateScrubber(snapshot: Awaited<ReturnType<typeof readBindingCredentialSnapshot>>, resolved?: {
    server?: { custom_headers?: Record<string, string> }
    key?: { key?: string }
  }) {
    this.scrubber = createMcpSecretScrubber({
      keys: [
        ...this.credentialSnapshot.secrets.keys,
        ...snapshot.secrets.keys,
        ...(resolved?.key?.key ? [resolved.key.key] : []),
      ],
      headerValues: [
        ...this.credentialSnapshot.secrets.headerValues,
        ...snapshot.secrets.headerValues,
        ...Object.values(resolved?.server?.custom_headers || {}),
      ],
    })
  }

  private remoteOptions(configuredMs: number) {
    const deadline = this.deadline
    if (!deadline) throw new McpError('MCP_RUNTIME_ERROR', 'MCP 章节任务 deadline 尚未建立')
    return {
      signal: deadline.signal,
      get timeoutMs() { return deadline.timeoutMs(configuredMs) },
    }
  }

  private taskReceiptOutput(status: string, error?: unknown) {
    const provenance = this.provenance()
    const scrubbed = error ? scrubGenerationError(error, this.scrubber) : undefined
    return {
      receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
      ...provenance,
      binding_fingerprint: this.fingerprint,
      ...(this.snapshotHash ? { snapshot_hash: boundedScrubbedId(this.scrubber, this.snapshotHash) } : {}),
      status,
      ...(scrubbed ? {
        error_code: String((scrubbed as any)?.code || (scrubbed as any)?.error_code || 'MCP_STAGE_FAILED').slice(0, 80),
        error: this.scrubber.scrubText((scrubbed as any)?.message || scrubbed).slice(0, 500),
      } : {}),
    }
  }

  private async persistTaskReceipt(status: string, error?: unknown) {
    if (!this.taskReceiptId) return
    const output = this.taskReceiptOutput(status, error)
    const updated = await updateNovelRun(this.input.activeWorkspace, this.taskReceiptId, {
      status,
      output_ref: JSON.stringify(output),
      ...(error ? { error_message: String(output.error || '').slice(0, 500) } : {}),
    })
    if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 章节任务回执持久化失败')
  }

  private async onSessionProgress(event: any) {
    const scrubbedEvent = this.scrubber.scrubValue(event)
    if (scrubbedEvent?.session_id) {
      this.sessionId = boundedScrubbedId(this.scrubber, scrubbedEvent.session_id)
    }
    if (scrubbedEvent?.snapshot_hash) {
      this.snapshotHash = boundedScrubbedId(this.scrubber, scrubbedEvent.snapshot_hash)
    }
    if (scrubbedEvent?.stage === 'session_created') {
      if (!this.sessionId) throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 未提供 Session 标识')
      await this.persistTaskReceipt('session_created')
      await this.lease!.stageSessionFence({
        requestId: boundedScrubbedId(this.scrubber, this.taskId),
        sessionId: this.sessionId,
      })
      this.sessionFenceStaged = true
    }
    await this.input.onProgress?.(scrubbedEvent)
  }

  private async openSession() {
    return withMcpWorkspaceMutation(this.input.activeWorkspace, async () => {
      const currentSnapshot = await readBindingCredentialSnapshot(this.input.activeWorkspace, this.binding)
      this.rotateScrubber(currentSnapshot)
      const latestProject = await getNovelProject(
        this.input.activeWorkspace,
        Number(this.input.project?.id || 0),
      )
      let currentFingerprint = ''
      try {
        currentFingerprint = latestProject
          ? chapterGenerationSourceFingerprint(resolveChapterGenerationSource(latestProject))
          : ''
      } catch {}
      if (currentFingerprint !== this.fingerprint) {
        throw new McpError('MCP_BINDING_CHANGED', '项目 MCP 章节生成绑定已变化，请重新发起任务')
      }
      const selected = selectedTaskCredential(currentSnapshot, this.binding)
      const pinnedCredential = await this.runtime.resolveCredentialConfig(
        this.binding.key_id,
        this.binding.server_id,
        { ...selected, activeWorkspace: this.input.activeWorkspace },
      )
      this.lease = await this.runtime.acquireAgentLease(this.input.activeWorkspace, {
        serverId: this.binding.server_id,
        keyId: this.binding.key_id,
        agentId: this.binding.agent_id,
      })
      this.deadline = this.createDeadline(pinnedCredential.server.generation_timeout_ms, this.input.signal)
      this.deadline.throwIfAborted()
      const resolved = await this.runtime.getAdapterForKey(
        this.binding.key_id,
        this.binding.server_id,
        this.remoteOptions(pinnedCredential.server.startup_timeout_ms),
        pinnedCredential,
      )
      this.rotateScrubber(currentSnapshot, resolved)
      if (resolved.server.adapter_id !== this.binding.adapter_id
        || resolved.adapter.id !== this.binding.adapter_id) {
        throw new McpError('MCP_BINDING_INVALID', 'Runtime 返回的 MCP Adapter 与项目绑定不一致')
      }
      const agents = await resolved.adapter.listAgents(
        this.remoteOptions(resolved.server.tool_timeout_ms),
      )
      if (!agents.some(agent => String(agent.id) === this.binding.agent_id)) {
        throw new McpError('MCP_BINDING_INVALID', '项目绑定的 MCP Agent 不存在或不可访问')
      }
      const taskRun = await appendNovelRun(this.input.activeWorkspace, {
        project_id: Number(this.input.project?.id || 0),
        run_type: 'mcp_chapter_task',
        step_name: this.taskId,
        status: 'running',
        input_ref: JSON.stringify({
          receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
          ...this.provenance(),
          binding_fingerprint: this.fingerprint,
        }),
        output_ref: JSON.stringify(this.taskReceiptOutput('running')),
      })
      this.taskReceiptId = taskRun.id
      const continuity = this.input.contextPackage?.continuity || {}
      const session = await resolved.adapter.openChapterTask({
        activeWorkspace: this.input.activeWorkspace,
        server: resolved.server,
        keyId: this.binding.key_id,
        agentId: this.binding.agent_id,
        ...(this.binding.model ? { model: this.binding.model } : {}),
        taskId: this.taskId,
        project: this.input.project,
        chapter: this.input.chapter,
        chapterNo: Number(this.input.chapter?.chapter_no || 0),
        context: {
          writingBible: contextSnapshotText(this.input.contextPackage?.writing_bible || {}),
          storyState: this.input.contextPackage?.story_state?.global
            || this.input.contextPackage?.story_state
            || {},
          continuity: contextSnapshotText(continuity),
          recentChapters: contextSnapshotText(continuity?.previous_prose_chapters || []),
        },
        deadline: this.deadline,
        signal: this.deadline.signal,
        onProgress: event => this.onSessionProgress(event),
      })
      this.session = session
      const returnedSessionId = boundedScrubbedId(this.scrubber, session.sessionId)
      const returnedSnapshotHash = boundedScrubbedId(this.scrubber, session.snapshotHash)
      if (this.sessionId && this.sessionId !== returnedSessionId) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter Session 标识在创建期间发生变化')
      }
      if (this.snapshotHash && this.snapshotHash !== returnedSnapshotHash) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter snapshot fingerprint 在创建期间发生变化')
      }
      this.sessionId = returnedSessionId
      this.snapshotHash = returnedSnapshotHash
      if (!this.sessionFenceStaged) {
        await this.persistTaskReceipt('session_created')
        await this.lease.stageSessionFence({
          requestId: boundedScrubbedId(this.scrubber, this.taskId),
          sessionId: this.sessionId,
        })
        this.sessionFenceStaged = true
      }
      return session
    })
  }

  private getSession() {
    if (this.closePromise || this.failurePromise) {
      return Promise.reject(new McpError('MCP_RUNTIME_ERROR', 'MCP 章节任务已经终止'))
    }
    if (this.sessionPromise) return this.sessionPromise
    const opening = this.openSession()
    this.sessionPromise = opening
    void opening.catch(() => {
      if (this.sessionPromise === opening) this.sessionPromise = undefined
    })
    return opening
  }

  private releaseLease() {
    if (!this.lease) return Promise.resolve()
    if (!this.releasePromise) this.releasePromise = this.lease.release()
    return this.releasePromise
  }

  private closeDeadline() {
    if (this.deadlineClosed) return
    this.deadlineClosed = true
    this.deadline?.close()
  }

  private async terminalCleanup(error?: unknown, status = 'failed') {
    let primaryError = error ? scrubGenerationError(error, this.scrubber) : undefined
    let terminalError = primaryError
    let receiptPersistenceError: Error | undefined
    let receiptStatus = error ? receiptStatusForError(primaryError) : status
    try {
      await this.persistTaskReceipt(receiptStatus, terminalError)
    } catch (receiptError) {
      receiptPersistenceError = scrubGenerationError(receiptError, this.scrubber)
      terminalError = receiptPersistenceError
    }
    if (this.session) {
      try {
        await this.session.close()
      } catch (closeError) {
        primaryError = scrubGenerationError(closeError, this.scrubber)
        terminalError = primaryError
        receiptStatus = receiptStatusForError(primaryError)
        try {
          await this.persistTaskReceipt(receiptStatus, primaryError)
        } catch (receiptError) {
          receiptPersistenceError = scrubGenerationError(receiptError, this.scrubber)
          terminalError = receiptPersistenceError
        }
      }
    }
    const ambiguous = this.lease
      && (primaryError as any)?.details?.remote_cancel_confirmed !== true
      && (receiptStatus === 'send_unknown' || receiptStatus === 'remote_cancel_unknown')
    if (ambiguous) {
      try {
        await this.lease!.quarantine({
          requestId: boundedScrubbedId(this.scrubber, this.taskId),
          sessionId: boundedScrubbedId(
            this.scrubber,
            (primaryError as any)?.details?.session_id || this.sessionId,
          ),
          reason: receiptStatus as 'send_unknown' | 'remote_cancel_unknown',
        })
      } catch (quarantineError) {
        this.closeDeadline()
        const persistenceError = scrubGenerationError(quarantineError, this.scrubber)
        throw unresolvedStoreError(
          persistenceError,
          primaryError,
          receiptStatus as 'send_unknown' | 'remote_cancel_unknown',
          boundedScrubbedId(
            this.scrubber,
            (primaryError as any)?.details?.session_id || this.sessionId,
          ),
        )
      }
      try {
        await this.releaseLease()
      } finally {
        this.closeDeadline()
      }
      if (receiptPersistenceError) {
        terminalError = unresolvedStoreError(
          receiptPersistenceError,
          primaryError,
          receiptStatus as 'send_unknown' | 'remote_cancel_unknown',
          boundedScrubbedId(
            this.scrubber,
            (primaryError as any)?.details?.session_id || this.sessionId,
          ),
        )
      }
    } else if (this.lease) {
      let clearError: unknown
      try {
        await this.lease.clearSessionFence()
      } catch (error) {
        clearError = error
      }
      let releaseError: unknown
      try {
        await this.releaseLease()
      } catch (error) {
        releaseError = error
      }
      if (clearError && releaseError) {
        terminalError = new AggregateError(
          [clearError, releaseError],
          'MCP Agent fence clear and lease release both failed',
        )
      } else if (clearError || releaseError) {
        terminalError = (clearError || releaseError) as Error
      }
    }
    this.closeDeadline()
    if (terminalError) throw terminalError
  }

  private failRemote(error: unknown): Promise<never> {
    if (this.failurePromise) return this.failurePromise
    this.failurePromise = this.terminalCleanup(error, receiptStatusForError(error)).then(
      () => { throw scrubGenerationError(error, this.scrubber) },
      cleanupError => { throw cleanupError },
    )
    return this.failurePromise
  }

  private async runRemoteStage(input: McpChapterStageInput): Promise<McpChapterStageResult> {
    try {
      await this.input.assertCurrent()
      this.deadline?.throwIfAborted()
      const session = await this.getSession()
      this.deadline?.throwIfAborted()
      const result = await session.runStage(input)
      this.deadline?.throwIfAborted()
      if (result.status !== 'completed'
        || boundedScrubbedId(this.scrubber, result.session_id) !== this.sessionId
        || boundedScrubbedId(this.scrubber, result.snapshot_hash) !== this.snapshotHash) {
        throw new McpError('MCP_SESSION_FAILED', 'MCP Adapter 返回了不属于当前任务 Session 的 stage 结果')
      }
      await this.input.assertCurrent()
      return result
    } catch (error) {
      return this.failRemote(error)
    }
  }

  async generateDraft(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    return this.recordStage('draft', {
      prompt: request.paragraphTask,
      responseContract: 'draft_prose',
    }, async () => {
      const stage = await this.runRemoteStage({
        requestId: request.requestId,
        stage: 'draft',
        responseContract: 'draft_prose',
        prompt: request.paragraphTask,
      })
      return {
        prose_chapters: normalizeDraftStageContent(stage.content, request.chapterNo),
        source: 'mcp',
        adapter_id: this.binding.adapter_id,
        agent_id: this.binding.agent_id,
        session_id: stage.session_id,
        snapshot_hash: stage.snapshot_hash,
        completed: true,
        modelName: this.binding.model || 'MCP Auto',
        source_receipt: {
          receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
          request_id: boundedScrubbedId(this.scrubber, request.requestId),
          ...this.provenance(),
          binding_fingerprint: this.fingerprint,
          snapshot_hash: boundedScrubbedId(this.scrubber, stage.snapshot_hash),
          status: 'success',
        },
      }
    })
  }

  async executeAgent(
    stage: ChapterTaskStage,
    responseContract: ChapterStageResponseContract,
    agentId: string,
    project: any,
    context: Record<string, any>,
    _options: Record<string, any> = {},
  ) {
    const prompt = compileMcpAgentPrompt(agentId, project, context)
    return this.recordStage(stage, { prompt, responseContract }, async () => {
      const result = await this.runRemoteStage({
        requestId: `${this.taskId}:${stage}:${++this.stageSequence}`,
        stage,
        responseContract,
        prompt,
      })
      const response: LLMResponse = { content: result.content }
      return {
        ...response,
        output: parseAgentOutput(response),
        modelName: this.binding.model || 'MCP Auto',
      }
    })
  }

  assertCurrent() {
    return this.input.assertCurrent()
  }

  close(outcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'success' }) {
    if (this.failurePromise) return this.failurePromise.then(() => {})
    if (this.closePromise) return this.closePromise
    this.closePromise = this.sessionPromise || this.session
      ? this.terminalCleanup(outcome.error, outcome.status)
      : Promise.resolve()
    return this.closePromise
  }
}

export class McpGenerationSource implements GenerationSource {
  private readonly createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline

  constructor(
    private readonly runtime: Pick<McpRuntime,
      'resolveCredentialConfig' | 'listAgents' | 'getAdapterForKey' | 'acquireAgentLease'>,
    options: {
      createDeadline?: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline
    } = {},
  ) {
    this.createDeadline = options.createDeadline || ((totalMs, signal) => new McpGenerationDeadline(totalMs, signal))
  }

  async beginResolvedTask(input: ResolvedChapterTaskInput): Promise<ChapterTaskExecution> {
    if (input.sourceState.active !== 'mcp' || !input.sourceState.mcp) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP 章节任务需要完整的项目绑定')
    }
    const credentialSnapshot = await readBindingCredentialSnapshot(
      input.activeWorkspace,
      input.sourceState.mcp,
    )
    return new McpChapterTaskExecution(
      this.runtime,
      input,
      credentialSnapshot,
      this.createDeadline,
    )
  }

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    const source = resolveProseGenerationSource(request.project)
    if (source.type !== 'mcp') throw new Error('MCP GenerationSource 需要完整的项目 MCP 绑定')
    const binding = source.mcp
    const bindingFingerprint = proseGenerationSourceFingerprint(source)
    const credentialSnapshot = await readBindingCredentialSnapshot(request.activeWorkspace, binding)
    let scrubber = createMcpSecretScrubber(credentialSnapshot.secrets)
    const baseProvenance = {
      receipt_authority: MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
      server_id: boundedScrubbedId(scrubber, binding.server_id),
      key_id: binding.key_id,
      adapter_id: boundedScrubbedId(scrubber, binding.adapter_id),
      agent_id: boundedScrubbedId(scrubber, binding.agent_id),
      model: boundedScrubbedId(scrubber, binding.model || 'Auto'),
      binding_fingerprint: bindingFingerprint,
    }
    const receipt = await appendNovelRun(request.activeWorkspace, {
      project_id: Number(request.project?.id || 0),
      run_type: 'mcp_generate_prose',
      step_name: `chapter-${request.chapterNo}`,
      status: 'running',
      input_ref: JSON.stringify({
        request_id: boundedScrubbedId(scrubber, request.requestId),
        project_id: Number(request.project?.id || 0),
        chapter_id: Number(request.chapter?.id || 0),
        chapter_no: request.chapterNo,
        prompt_hash: sha256(request.paragraphTask),
      }),
      output_ref: JSON.stringify({ ...baseProvenance, status: 'running' }),
    })
    let progressProvenance: Record<string, unknown> = { ...baseProvenance }
    let connected = false
    let deadline: McpGenerationDeadline | undefined
    let lease: McpAgentLease | undefined
    let releaseAttempted = false
    const releaseLease = async () => {
      if (!lease || releaseAttempted) return
      releaseAttempted = true
      await lease.release()
    }
    try {
      const admitted = await withMcpWorkspaceMutation(request.activeWorkspace, async () => {
        const currentCredentialSnapshot = await readBindingCredentialSnapshot(request.activeWorkspace, binding)
        scrubber = createMcpSecretScrubber({
          keys: [...credentialSnapshot.secrets.keys, ...currentCredentialSnapshot.secrets.keys],
          headerValues: [
            ...credentialSnapshot.secrets.headerValues,
            ...currentCredentialSnapshot.secrets.headerValues,
          ],
        })
        const latestProject = await getNovelProject(request.activeWorkspace, Number(request.project?.id || 0))
        let latestFingerprint = ''
        try {
          latestFingerprint = latestProject
            ? proseGenerationSourceFingerprint(resolveProseGenerationSource(latestProject))
            : ''
        } catch {}
        if (latestFingerprint !== bindingFingerprint) {
          throw new McpError('MCP_BINDING_CHANGED', '项目 MCP 正文生成绑定已变化，请重新发起生成')
        }
        const selectedCredential = validateMcpCredentialSelectionSnapshot(currentCredentialSnapshot.records, {
          serverId: binding.server_id,
          keyId: binding.key_id,
          adapterId: binding.adapter_id,
        })
        const pinnedCredential = await this.runtime.resolveCredentialConfig(
          binding.key_id,
          binding.server_id,
          { ...selectedCredential, activeWorkspace: request.activeWorkspace },
        )
        const acquiredLease = await this.runtime.acquireAgentLease(request.activeWorkspace, {
          serverId: binding.server_id,
          keyId: binding.key_id,
          agentId: binding.agent_id,
        })
        return { lease: acquiredLease, pinnedCredential, currentCredentialSnapshot }
      })
      lease = admitted.lease
      const pinnedCredential = admitted.pinnedCredential
      const currentCredentialSnapshot = admitted.currentCredentialSnapshot
      deadline = this.createDeadline(pinnedCredential.server.generation_timeout_ms, request.signal)
      deadline.throwIfAborted()
      const remoteOptions = (configuredMs: number) => ({
        signal: deadline!.signal,
        get timeoutMs() { return deadline!.timeoutMs(configuredMs) },
      })
      await request.onProgress?.({ stage: 'mcp_connect', status: 'running' })
      const resolved = await this.runtime.getAdapterForKey(
        binding.key_id,
        binding.server_id,
        remoteOptions(pinnedCredential.server.startup_timeout_ms),
        pinnedCredential,
      )
      scrubber = createMcpSecretScrubber({
        keys: [
          ...credentialSnapshot.secrets.keys,
          ...currentCredentialSnapshot.secrets.keys,
          resolved.key.key,
        ],
        headerValues: [
          ...credentialSnapshot.secrets.headerValues,
          ...currentCredentialSnapshot.secrets.headerValues,
          ...Object.values(resolved.server.custom_headers),
        ],
      })
      const validationOptions = remoteOptions(resolved.server.tool_timeout_ms)
      await validateMcpProjectBinding(request.activeWorkspace, request.project, binding, {
        runtime: {
          listAgents: async (_keyId, options) => resolved.adapter.listAgents(options),
        },
        credentialSnapshot: currentCredentialSnapshot.records,
        signal: validationOptions.signal,
        get timeoutMs() { return validationOptions.timeoutMs },
      })
      await request.onProgress?.({ stage: 'mcp_connect', status: 'success' })
      connected = true
      const continuity = request.contextPackage?.continuity || {}
      const result = await resolved.adapter.generateProse({
        activeWorkspace: request.activeWorkspace,
        server: resolved.server,
        keyId: binding.key_id,
        agentId: binding.agent_id,
        model: binding.model,
        requestId: request.requestId,
        project: request.project,
        chapter: request.chapter,
        chapterNo: request.chapterNo,
        paragraphTask: request.paragraphTask,
        promptDiagnostics: request.promptDiagnostics,
        context: {
          writingBible: contextSnapshotText(request.contextPackage?.writing_bible || {}),
          storyState: request.contextPackage?.story_state?.global || {},
          continuity: contextSnapshotText(continuity),
          recentChapters: contextSnapshotText(continuity?.previous_prose_chapters || []),
        },
        deadline,
        signal: deadline.signal,
        onProgress: async event => {
          const scrubbedEvent = scrubber.scrubValue(event)
          const safeEvent = {
            ...scrubbedEvent,
            ...(scrubbedEvent.session_id ? { session_id: boundedScrubbedId(scrubber, scrubbedEvent.session_id) } : {}),
            ...(scrubbedEvent.snapshot_hash ? { snapshot_hash: boundedScrubbedId(scrubber, scrubbedEvent.snapshot_hash) } : {}),
          }
          progressProvenance = {
            ...progressProvenance,
            ...(safeEvent.session_id ? { session_id: safeEvent.session_id } : {}),
            ...(safeEvent.snapshot_hash ? { snapshot_hash: safeEvent.snapshot_hash } : {}),
          }
          if (safeEvent.stage === 'session_created') {
            const sessionReceipt = scrubbedProvenance(scrubber, {
              ...progressProvenance,
              request_id: boundedScrubbedId(scrubber, request.requestId),
              receipt_run_id: receipt.id,
              status: 'session_created',
            }, bindingFingerprint)
            const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
              status: 'session_created',
              output_ref: JSON.stringify(sessionReceipt),
            })
            if (!updated) {
              throw new McpError('MCP_STORE_IO_FAILED', 'MCP Session 创建回执持久化失败')
            }
            await lease!.stageSessionFence({
              requestId: boundedScrubbedId(scrubber, request.requestId),
              sessionId: String(safeEvent.session_id || ''),
            })
          }
          await request.onProgress?.(safeEvent)
        },
      })
      deadline.throwIfAborted()
      const output = scrubbedProvenance(scrubber, {
        ...progressProvenance,
        session_id: boundedScrubbedId(scrubber, result.session_id),
        snapshot_hash: boundedScrubbedId(scrubber, result.snapshot_hash),
        status: 'success',
      }, bindingFingerprint)
      const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'success',
        output_ref: JSON.stringify(output),
      })
      if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 成功回执持久化失败')
      deadline.throwIfAborted()
      const { prose_chapters: proseChapters, ...resultMetadata } = result
      const response = {
        ...scrubber.scrubValue(resultMetadata),
        ...(proseChapters !== undefined ? { prose_chapters: proseChapters } : {}),
        source_receipt: {
          request_id: boundedScrubbedId(scrubber, request.requestId),
          receipt_run_id: receipt.id,
          ...output,
        },
      }
      await lease.clearSessionFence()
      return attachProductionLease(response, lease)
    } catch (error) {
      let exposedError = error
      if (deadline?.signal.aborted && isAbortRelatedError(error, deadline.signal)) {
        try {
          deadline.throwIfAborted()
        } catch (cause) {
          const sameTypedCause = isMcpError(error) && isMcpError(cause) && error.code === cause.code
          if (!sameTypedCause) exposedError = cause
        }
      }
      const scrubbedError = scrubGenerationError(exposedError, scrubber)
      const receiptStatus = receiptStatusForError(scrubbedError)
      if (!connected) {
        await Promise.resolve(request.onProgress?.({
          stage: 'mcp_connect',
          status: 'failed',
          detail: scrubber.scrubText(scrubbedError.message).slice(0, 240),
        })).catch(() => {})
      }
      const output = scrubbedProvenance(
        scrubber,
        errorReceipt(scrubbedError, progressProvenance, receiptStatus),
        bindingFingerprint,
      )
      let finalError: unknown = scrubbedError
      let receiptPersistenceError: Error | undefined
      try {
        const updated = await updateNovelRun(request.activeWorkspace, receipt.id, {
          status: receiptStatus,
          output_ref: JSON.stringify(output),
          error_message: scrubber.scrubText(scrubbedError.message).slice(0, 500),
        })
        if (!updated) throw new McpError('MCP_STORE_IO_FAILED', 'MCP 失败回执持久化失败')
      } catch (receiptError) {
        receiptPersistenceError = scrubGenerationError(receiptError, scrubber)
        finalError = receiptPersistenceError
      }
      if (lease && (scrubbedError as any)?.details?.remote_cancel_confirmed !== true
        && (receiptStatus === 'send_unknown' || receiptStatus === 'remote_cancel_unknown')) {
        const sessionId = boundedScrubbedId(
          scrubber,
          (scrubbedError as any)?.details?.session_id || progressProvenance.session_id || '',
        )
        try {
          await lease.quarantine({
            requestId: boundedScrubbedId(scrubber, request.requestId),
            sessionId,
            reason: receiptStatus,
          })
          if (receiptPersistenceError) {
            finalError = unresolvedStoreError(
              receiptPersistenceError,
              scrubbedError,
              receiptStatus,
              sessionId,
            )
          }
        } catch (quarantineError) {
          const persistenceError = scrubGenerationError(quarantineError, scrubber)
          finalError = unresolvedStoreError(
            persistenceError,
            scrubbedError,
            receiptStatus,
            sessionId,
          )
        }
      } else if (lease) {
        try {
          await lease.clearSessionFence()
        } catch (clearError) {
          finalError = scrubGenerationError(clearError, scrubber)
        }
      }
      await releaseLease()
      throw finalError
    } finally {
      deadline?.close()
    }
  }
}
