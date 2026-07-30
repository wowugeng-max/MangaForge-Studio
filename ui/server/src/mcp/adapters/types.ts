import type {
  McpAgentSummary,
  McpOperationOptions,
  McpServerRecord,
  McpToolDescriptor,
  McpToolResult,
} from '../types'

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
  generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult>
}
