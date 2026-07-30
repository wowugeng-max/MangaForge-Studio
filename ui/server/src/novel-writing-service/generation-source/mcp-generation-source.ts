import { createHash } from 'crypto'
import { appendNovelRun, updateNovelRun } from '../../novel'
import type { McpRuntime } from '../../mcp/runtime'
import { McpError, isMcpError } from '../../mcp/errors'
import { createMcpSecretScrubber } from '../../mcp/secret-scrubber'
import { resolveProseGenerationSource, validateMcpProjectBinding } from './source-config'
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

function scrubGenerationError(
  error: unknown,
  scrubber: ReturnType<typeof createMcpSecretScrubber>,
) {
  const message = scrubber.scrubText((error as any)?.message || error || 'MCP 正文生成失败')
  if (isMcpError(error)) {
    return new McpError(
      error.code,
      message,
      error.details ? scrubber.scrubValue(error.details) : undefined,
    )
  }
  const scrubbed = new Error(message)
  scrubbed.name = scrubber.scrubText((error as any)?.name || 'Error')
  const metadata = error && typeof error === 'object'
    ? scrubber.scrubValue({
        ...((error as any)?.code !== undefined ? { code: (error as any).code } : {}),
        ...((error as any)?.error_code !== undefined ? { error_code: (error as any).error_code } : {}),
        ...((error as any)?.details !== undefined ? { details: (error as any).details } : {}),
      })
    : {}
  Object.assign(scrubbed, metadata)
  return scrubbed
}

export class McpGenerationSource implements GenerationSource {
  constructor(private readonly runtime: Pick<McpRuntime, 'listAgents' | 'getAdapterForKey'>) {}

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    const source = resolveProseGenerationSource(request.project)
    if (source.type !== 'mcp') throw new Error('MCP GenerationSource 需要完整的项目 MCP 绑定')
    const binding = source.mcp
    const baseProvenance = {
      server_id: binding.server_id,
      key_id: binding.key_id,
      adapter_id: binding.adapter_id,
      agent_id: binding.agent_id,
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
      return {
        ...result,
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
