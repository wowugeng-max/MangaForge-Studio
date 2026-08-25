export type KernelJobAction = 'review' | 'deslop' | 'apply'

export const CHAPTER_KERNEL_VERBS: Record<KernelJobAction, string> = {
  review: 'review_chapter',
  deslop: 'deslop_chapter',
  apply: 'apply_review',
}

export type KernelRequest = (
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
) => Promise<{ status: number; data: any }>

export type CreateKernelJobInput = {
  projectId: number
  chapterId: number
  modelId: number
  action: KernelJobAction
  contractIds?: string[]
}

export type KernelJobProgress = {
  job_id: string
  candidate_id: string
  phase: string
  elapsed_ms: number
  hint: string
  error_code: string
}

export type KernelJobDetail = {
  ok: boolean
  job: { id: string; status: string; error_code?: string; verb?: string; subject_key?: string }
  candidates: Array<{
    id: string
    contract_id: string
    status: string
    error_code?: string
    last_message_excerpt?: string
    metadata?: string
  }>
  artifacts: Array<{
    id: string
    candidate_id: string
    rel_path: string
    artifact_kind: string
    byte_size?: number
  }>
  progress?: KernelJobProgress
}

export type KernelContractListItem = {
  id: string
  label: string
  verb?: string
  implemented: boolean
}

export type KernelApiError = { ok: false; status: number; code: string; message: string }
