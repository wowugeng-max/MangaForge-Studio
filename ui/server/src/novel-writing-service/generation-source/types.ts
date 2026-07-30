import type { GenerationSourceProgress } from '../../mcp/adapters/types'

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
  raw?: unknown
  [key: string]: any
}

export interface GenerationSource {
  generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult>
}
