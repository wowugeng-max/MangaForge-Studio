import { kernelJobUserMessage } from '../../kernel/jobs/messages'
import type { KernelJobDetail } from '../../kernel/jobs/types'

export const EXPAND_OUTLINE_NEED_LEDGER = '扩纲需要账本里已有大纲'
export const EXPAND_OUTLINE_JOB_RUNNING = '该项目扩纲未结束'
export const EXPAND_OUTLINE_COMMIT_OK = '已写入大纲，正文未改'

export function expandOutlineHasLedger(outlines: unknown): boolean {
  return Array.isArray(outlines) && outlines.length > 0
}

export function expandOutlineCancelVisible(state: { phase: string; jobId?: string | null }): boolean {
  return state.phase === 'running' && Boolean(String(state.jobId || '').trim())
}

export function expandOutlineCreateFailureText(code: string): string | null {
  if (code === 'PROJECT_JOB_RUNNING') return EXPAND_OUTLINE_JOB_RUNNING
  return kernelJobUserMessage(code)?.text || null
}

export function expandOutlineFailedAlertText(code: string): string {
  return expandOutlineCreateFailureText(code) || String(code || '')
}

export function expandOutlineCommitSuccessText() {
  return EXPAND_OUTLINE_COMMIT_OK
}

export function expandOutlinePreviewRows(detail: KernelJobDetail | null | undefined) {
  return (detail?.artifacts || []).filter(item => item.artifact_kind === 'outline_doc')
}

export type ExpandOutlinePreview = {
  id: string
  rel_path: string
  content: string
  truncated: boolean
}

export async function loadExpandOutlinePreviews(
  artifacts: Array<{ id?: string; rel_path?: string }>,
  getArtifactContent: (id: string) => Promise<
    | { ok: true; content: string; truncated?: boolean }
    | { ok: false }
  >,
): Promise<ExpandOutlinePreview[]> {
  return Promise.all(artifacts.map(async (artifact) => {
    const id = String(artifact.id || '')
    const rel_path = String(artifact.rel_path || '')
    try {
      const result = await getArtifactContent(id)
      return {
        id,
        rel_path,
        content: result.ok ? String(result.content || '') : '',
        truncated: result.ok ? Boolean(result.truncated) : false,
      }
    } catch {
      return { id, rel_path, content: '', truncated: false }
    }
  }))
}

export function openExpandOutlineFromWriting(input: {
  phase: 'idle' | 'running' | 'awaiting_selection' | 'failed'
  setWorkspaceArea: (area: 'storyPlanning') => void
  start: () => void
}) {
  input.setWorkspaceArea('storyPlanning')
  if (input.phase === 'awaiting_selection' || input.phase === 'running') return
  input.start()
}
