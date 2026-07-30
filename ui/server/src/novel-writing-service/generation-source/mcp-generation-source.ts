import { createHash } from 'crypto'
import { appendNovelRun, updateNovelRun } from '../../novel'
import type { McpRuntime } from '../../mcp/runtime'
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
    try {
      await request.onProgress?.({ stage: 'mcp_connect', status: 'running' })
      await validateMcpProjectBinding(request.activeWorkspace, request.project, binding, {
        runtime: this.runtime,
        signal: request.signal,
      })
      const resolved = await this.runtime.getAdapterForKey(binding.key_id, binding.server_id, request.signal)
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
          progressProvenance = {
            ...progressProvenance,
            ...(event.session_id ? { session_id: event.session_id } : {}),
            ...(event.snapshot_hash ? { snapshot_hash: event.snapshot_hash } : {}),
          }
          await request.onProgress?.(event)
        },
      })
      const output = {
        ...progressProvenance,
        session_id: result.session_id,
        snapshot_hash: result.snapshot_hash,
        status: 'success',
      }
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'success',
        output_ref: JSON.stringify(output),
      })
      return result
    } catch (error) {
      if (!connected) {
        await Promise.resolve(request.onProgress?.({
          stage: 'mcp_connect',
          status: 'failed',
          detail: String((error as any)?.message || error).slice(0, 240),
        })).catch(() => {})
      }
      const output = errorReceipt(error, progressProvenance)
      await updateNovelRun(request.activeWorkspace, receipt.id, {
        status: 'failed',
        output_ref: JSON.stringify(output),
        error_message: String((error as any)?.message || error).slice(0, 500),
      }).catch(() => {})
      throw error
    }
  }
}
