import type { GenerationSourceProgress } from '../../mcp/adapters/types'

export const MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY = 'mcp_generation_source_v1' as const

export function acceptanceBindingFingerprintFromGenerationSource(generationSource: any) {
  if (
    generationSource?.resolved_type !== 'mcp'
    || generationSource?.receipt_authority !== MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
    || typeof generationSource?.binding_fingerprint !== 'string'
  ) return ''
  const fingerprint = generationSource.binding_fingerprint.trim()
  return /^sha256:[0-9a-f]{64}$/.test(fingerprint) ? fingerprint : ''
}

export type ProseGenerationRequest = {
  requestId: string
  activeWorkspace: string
  project: any
  chapter: any
  chapterNo: number
  paragraphTask: string
  promptDiagnostics?: any
  contextPackage?: any
  modelContext: Record<string, any>
  modelId?: number | string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type ProseGenerationResult = {
  prose_chapters?: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'model' | 'mcp'
  completed?: boolean
  modelName?: string
  adapter_id?: string
  agent_id?: string
  session_id?: string
  snapshot_hash?: string
  source_receipt?: Record<string, unknown> & {
    receipt_authority?: typeof MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
  }
  raw?: unknown
  [key: string]: any
}

export interface GenerationSource {
  generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult>
}
