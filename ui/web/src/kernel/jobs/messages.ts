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
  if (value === 'CHAPTER_HAS_PROSE') {
    return { kind: 'warning', text: '本章已有正文，请用回炉或按建议改稿' }
  }
  if (value === 'OUTLINE_MISSING') {
    return { kind: 'warning', text: '本章还没有细纲' }
  }
  if (value === 'CHAPTER_NOT_FOUND') {
    return { kind: 'error', text: '找不到该章' }
  }
  if (value === 'CHAPTER_NO_PROSE') {
    return { kind: 'warning', text: '本章还没有正文，请先写草稿' }
  }
  if (value === 'VERB_PARAMS_INVALID') {
    return { kind: 'warning', text: '续写参数无效' }
  }
  if (value === 'ADAPT_TARGET_INVALID') return { kind: 'warning', text: '不能适配内置写作 skill 或 oh-story' }
  if (value === 'SKILL_NOT_FOUND') return { kind: 'warning', text: '还没有安装这份写作 skill' }
  if (value === 'FOUNDATION_PRECONDITION') {
    return { kind: 'warning', text: '扩纲需要账本里已有大纲' }
  }
  if (value === 'ADAPT_NO_VALID_CONTRACT') return { kind: 'warning', text: '这份 skill 填不满工作台合同' }
  return { kind: 'error', text: value }
}
