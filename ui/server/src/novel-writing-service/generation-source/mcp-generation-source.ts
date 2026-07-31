import { createHash } from 'crypto'
import { appendNovelRun, updateNovelRun } from '../../novel'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { McpError, isMcpError } from '../../mcp/errors'
import { McpGenerationDeadline } from '../../mcp/deadline'
import { createMcpSecretScrubber } from '../../mcp/secret-scrubber'
import { readMcpServers } from '../../mcp/server-store'
import {
  proseGenerationSourceFingerprint,
  resolveProseGenerationSource,
  validateMcpCredentialSelectionSnapshot,
  validateMcpProjectBinding,
} from './source-config'
import {
  MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY,
  type GenerationSource,
  type ProseGenerationRequest,
  type ProseGenerationResult,
} from './types'

const PROVENANCE_ID_MAX_CHARS = 160

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function driveText(value: unknown) {
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

function errorReceipt(error: any, provenance: Record<string, unknown>) {
  return {
    ...provenance,
    status: 'failed',
    error_code: String(error?.code || error?.error_code || 'MCP_GENERATION_FAILED').slice(0, 80),
    error: String(error?.message || error || 'MCP 正文生成失败').slice(0, 500),
  }
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

export class McpGenerationSource implements GenerationSource {
  private readonly createDeadline: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline

  constructor(
    private readonly runtime: Pick<McpRuntime, 'resolveCredentialConfig' | 'listAgents' | 'getAdapterForKey'>,
    options: {
      createDeadline?: (totalMs: number, signal?: AbortSignal) => McpGenerationDeadline
    } = {},
  ) {
    this.createDeadline = options.createDeadline || ((totalMs, signal) => new McpGenerationDeadline(totalMs, signal))
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
    try {
      const selectedCredential = validateMcpCredentialSelectionSnapshot(credentialSnapshot.records, {
        serverId: binding.server_id,
        keyId: binding.key_id,
        adapterId: binding.adapter_id,
      })
      const pinnedCredential = await this.runtime.resolveCredentialConfig(
        binding.key_id,
        binding.server_id,
        selectedCredential,
      )
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
        keys: [...credentialSnapshot.secrets.keys, resolved.key.key],
        headerValues: [
          ...credentialSnapshot.secrets.headerValues,
          ...Object.values(resolved.server.custom_headers),
        ],
      })
      const validationOptions = remoteOptions(resolved.server.tool_timeout_ms)
      await validateMcpProjectBinding(request.activeWorkspace, request.project, binding, {
        runtime: {
          listAgents: async (_keyId, options) => resolved.adapter.listAgents(options),
        },
        credentialSnapshot: credentialSnapshot.records,
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
        requestId: request.requestId,
        project: request.project,
        chapter: request.chapter,
        chapterNo: request.chapterNo,
        paragraphTask: request.paragraphTask,
        promptDiagnostics: request.promptDiagnostics,
        drive: {
          writingBible: driveText(request.contextPackage?.writing_bible || {}),
          storyState: request.contextPackage?.story_state?.global || {},
          continuity: driveText(continuity),
          recentChapters: driveText(continuity?.previous_prose_chapters || []),
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
          }
          await request.onProgress?.(safeEvent)
        },
      })
      const output = scrubbedProvenance(scrubber, {
        ...progressProvenance,
        session_id: boundedScrubbedId(scrubber, result.session_id),
        snapshot_hash: boundedScrubbedId(scrubber, result.snapshot_hash),
        status: 'success',
      }, bindingFingerprint)
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'success',
        output_ref: JSON.stringify(output),
      })
      const { prose_chapters: proseChapters, ...resultMetadata } = result
      return {
        ...scrubber.scrubValue(resultMetadata),
        ...(proseChapters !== undefined ? { prose_chapters: proseChapters } : {}),
        source_receipt: {
          request_id: boundedScrubbedId(scrubber, request.requestId),
          receipt_run_id: receipt.id,
          ...output,
        },
      }
    } catch (error) {
      let exposedError = error
      if (deadline?.signal.aborted) {
        try { deadline.throwIfAborted() } catch (cause) { exposedError = cause }
      }
      const scrubbedError = scrubGenerationError(exposedError, scrubber)
      if (!connected) {
        await Promise.resolve(request.onProgress?.({
          stage: 'mcp_connect',
          status: 'failed',
          detail: scrubber.scrubText(scrubbedError.message).slice(0, 240),
        })).catch(() => {})
      }
      const output = scrubbedProvenance(
        scrubber,
        errorReceipt(scrubbedError, progressProvenance),
        bindingFingerprint,
      )
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'failed',
        output_ref: JSON.stringify(output),
        error_message: scrubber.scrubText(scrubbedError.message).slice(0, 500),
      }).catch(() => {})
      throw scrubbedError
    } finally {
      deadline?.close()
    }
  }
}
