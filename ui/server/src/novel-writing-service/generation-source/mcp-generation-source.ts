import { createHash } from 'crypto'
import { appendNovelRun, updateNovelRun } from '../../novel'
import type { McpRuntime } from '../../mcp/runtime'
import { McpError, isMcpError } from '../../mcp/errors'
import { createMcpSecretScrubber } from '../../mcp/secret-scrubber'
import { proseGenerationSourceFingerprint, resolveProseGenerationSource, validateMcpProjectBinding } from './source-config'
import type { GenerationSource, ProseGenerationRequest, ProseGenerationResult } from './types'

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function driveText(value: unknown) {
  if (typeof value === 'string') return value
  return `${JSON.stringify(value ?? {}, null, 2)}\n`
}

function errorReceipt(error: any, provenance: Record<string, unknown>) {
  return {
    ...provenance,
    status: 'failed',
    error_code: String(error?.code || error?.error_code || 'MCP_GENERATION_FAILED'),
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
  constructor(private readonly runtime: Pick<McpRuntime, 'listAgents' | 'getAdapterForKey'>) {}

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    const source = resolveProseGenerationSource(request.project)
    if (source.type !== 'mcp') throw new Error('MCP GenerationSource 需要完整的项目 MCP 绑定')
    const binding = source.mcp
    const bindingFingerprint = proseGenerationSourceFingerprint(source)
    const baseProvenance = {
      server_id: binding.server_id,
      key_id: binding.key_id,
      adapter_id: binding.adapter_id,
      agent_id: binding.agent_id,
      binding_fingerprint: bindingFingerprint,
    }
    const receipt = await appendNovelRun(request.activeWorkspace, {
      project_id: Number(request.project?.id || 0),
      run_type: 'mcp_generate_prose',
      step_name: `chapter-${request.chapterNo}`,
      status: 'running',
      input_ref: JSON.stringify({
        request_id: request.requestId,
        project_id: Number(request.project?.id || 0),
        chapter_id: Number(request.chapter?.id || 0),
        chapter_no: request.chapterNo,
        prompt_hash: sha256(request.paragraphTask),
      }),
      output_ref: JSON.stringify({ ...baseProvenance, status: 'running' }),
    })
    let progressProvenance: Record<string, unknown> = { ...baseProvenance }
    let connected = false
    let scrubber = createMcpSecretScrubber()
    try {
      await request.onProgress?.({ stage: 'mcp_connect', status: 'running' })
      await validateMcpProjectBinding(request.activeWorkspace, request.project, binding, {
        runtime: this.runtime,
        signal: request.signal,
      })
      const resolved = await this.runtime.getAdapterForKey(binding.key_id, binding.server_id, request.signal)
      scrubber = createMcpSecretScrubber({
        keys: [resolved.key.key],
        headerValues: Object.values(resolved.server.custom_headers),
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
        signal: request.signal,
        onProgress: async event => {
          const scrubbedEvent = scrubber.scrubValue(event)
          progressProvenance = {
            ...progressProvenance,
            ...(scrubbedEvent.session_id ? { session_id: scrubbedEvent.session_id } : {}),
            ...(scrubbedEvent.snapshot_hash ? { snapshot_hash: scrubbedEvent.snapshot_hash } : {}),
          }
          await request.onProgress?.(scrubbedEvent)
        },
      })
      const output = scrubber.scrubValue({
        ...progressProvenance,
        session_id: result.session_id,
        snapshot_hash: result.snapshot_hash,
        status: 'success',
      })
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'success',
        output_ref: JSON.stringify(output),
      })
      const { prose_chapters: proseChapters, ...resultMetadata } = result
      return {
        ...scrubber.scrubValue(resultMetadata),
        ...(proseChapters !== undefined ? { prose_chapters: proseChapters } : {}),
        source_receipt: {
          request_id: request.requestId,
          receipt_run_id: receipt.id,
          ...output,
        },
      }
    } catch (error) {
      const scrubbedError = scrubGenerationError(error, scrubber)
      if (!connected) {
        await Promise.resolve(request.onProgress?.({
          stage: 'mcp_connect',
          status: 'failed',
          detail: scrubber.scrubText(scrubbedError.message).slice(0, 240),
        })).catch(() => {})
      }
      const output = scrubber.scrubValue(errorReceipt(scrubbedError, progressProvenance))
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'failed',
        output_ref: JSON.stringify(output),
        error_message: scrubber.scrubText(scrubbedError.message).slice(0, 500),
      }).catch(() => {})
      throw scrubbedError
    }
  }
}
