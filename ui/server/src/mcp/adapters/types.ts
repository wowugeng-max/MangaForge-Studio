import type {
  McpAgentSummary,
  McpGenerationReceiptStatus,
  McpOperationOptions,
  McpServerRecord,
  McpToolDescriptor,
  McpToolResult,
} from '../types'
import type { McpGenerationDeadline } from '../deadline'

export type McpAdapterOperationOptions = Omit<McpOperationOptions, 'operation'>

export type McpClientPort = {
  listTools(options: McpAdapterOperationOptions): Promise<McpToolDescriptor[]>
  callTool(
    name: string,
    args: Record<string, unknown>,
    options: McpOperationOptions,
  ): Promise<McpToolResult>
}

export type GenerationSourceProgress = {
  stage: string
  status: 'running' | 'success' | 'warn' | 'failed'
  detail?: string
  elapsed_ms?: number
  session_id?: string
  snapshot_hash?: string
}

export type BudaDriveInput = {
  writingBible: string
  storyState: unknown
  continuity: string
  recentChapters: string
}

export type BudaRemoteCleanupDetails = {
  session_id: string
  remote_cancel_confirmed: boolean
  receipt_status?: Extract<McpGenerationReceiptStatus, 'send_unknown' | 'remote_cancel_unknown'>
}

export type BudaProseGenerationInput = {
  activeWorkspace: string
  server: McpServerRecord
  keyId: number
  agentId: string
  requestId: string
  project: Record<string, any>
  chapter: Record<string, any>
  chapterNo: number
  paragraphTask: string
  promptDiagnostics?: unknown
  drive: BudaDriveInput
  deadline: McpGenerationDeadline
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type BudaProseGenerationResult = {
  prose_chapters: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'mcp'
  adapter_id: 'buda'
  agent_id: string
  session_id: string
  snapshot_hash: string
  completed: true
  raw: {
    request_id: string
    session_status: string
  }
}

export interface ProseMcpAdapter {
  readonly id: string
  listAgents(options: McpAdapterOperationOptions): Promise<McpAgentSummary[]>
  createAgent(input: { name: string; spaceId?: string; instructions?: string }, options: McpAdapterOperationOptions): Promise<McpAgentSummary>
  inspectSession(
    input: { agentId: string; sessionId: string },
    options: McpAdapterOperationOptions,
  ): Promise<{ status: string; terminal: boolean }>
  generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult>
}
