export type MemoryCategory = 'worldbuilding' | 'character' | 'plot' | 'foreshadowing' | 'prose' | 'general'

export interface MemoryRecord {
  id: string
  project_id: string
  content: string
  tags: string[]
  category: MemoryCategory
  timestamp: string
  similarity?: number
  distance?: number
}

export interface FactRecord {
  id: string
  project_id: number
  entity: string
  attribute: string
  value: string
  source_memory_id?: string
  chapter_from?: number
  chapter_to?: number
  confidence?: number
}

export interface ContinuityIssue {
  id: string
  project_id: number
  chapter_no?: number
  issue_type: string
  description: string
  severity: string
  status: string
  resolution?: string
}

export interface VerifyResult {
  is_consistent: boolean
  issue_count: number
  issues: Array<{
    type: string
    entity: string
    attribute: string
    new_value: string
    existing_value: string
    source_chapter?: number | string
    severity: string
    description: string
  }>
  related_memories: Array<{ id: string; content: string; category: string; similarity: number }>
}

export interface ReconcileResult {
  total_facts: number
  contradiction_count: number
  contradictions: Array<{
    entity: string
    attribute: string
    values: Array<{ value: string; chapter?: number; source_id?: string }>
  }>
}

export interface MemoryInjection {
  text: string
  memories: MemoryRecord[]
  facts: FactRecord[]
  contradictions: Array<any>
}

export interface MemoryPalaceProjectSummary {
  project_id: number
  project_title: string
  memory_count: number
  fact_count: number
  continuity_issue_count: number
  last_updated_at?: string
}


