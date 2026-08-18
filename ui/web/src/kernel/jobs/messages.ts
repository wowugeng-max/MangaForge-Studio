export function kernelJobUserMessage(code: string): { kind: 'warning' | 'error' | 'info'; text: string } | null {
  const value = String(code || '')
  if (!value) return null
  if (value === 'OH_STORY_APPLY_NO_REVIEW' || value === 'OH_STORY_APPLY_STALE_REVIEW') {
    return { kind: 'warning', text: '先对本稿重新审稿' }
  }
  if (value === 'OH_STORY_APPLY_REWROTE_TOO_MUCH') {
    return { kind: 'warning', text: '这次改动太大，像整章重写。请再试一次' }
  }
  if (value === 'KERNEL_RUNTIME_UNAVAILABLE') {
    return { kind: 'error', text: '内核不可用，装好 Codex 后再试' }
  }
  if (value === 'CANCELLED') return { kind: 'info', text: '已取消' }
  if (value === 'PROJECT_JOB_RUNNING') return { kind: 'warning', text: '同项目同动词任务未结束' }
  return { kind: 'error', text: value }
}
