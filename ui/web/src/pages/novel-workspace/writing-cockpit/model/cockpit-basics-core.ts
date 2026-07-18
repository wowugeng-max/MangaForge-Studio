import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'

export const ROLE_META: Record<WritingCockpitRole, { label: string; description: string; actionKey: WritingCockpitActionKey }> = {
  chief_editor: {
    label: '总编',
    description: '校准作品承诺、卷目标和章节入口。',
    actionKey: 'open_writing_bible',
  },
  episode_planner: {
    label: '分集策划',
    description: '补齐章节任务、冲突和材料缺口。',
    actionKey: 'build_scene_plan',
  },
  draft_writer: {
    label: '正文写手',
    description: '根据章节计划生成稳定初稿。',
    actionKey: 'write_draft',
  },
  revision_editor: {
    label: '修订编辑',
    description: '审阅已有正文并推进改稿。',
    actionKey: 'review_draft',
  },
  continuity_auditor: {
    label: '连续性审计',
    description: '同步故事状态并修补设定断点。',
    actionKey: 'update_canon',
  },
  operations_analyst: {
    label: '运营分析',
    description: '查看任务、运行和生产节奏。',
    actionKey: 'open_task_center',
  },
}

export const ACTION_LABELS: Record<WritingCockpitActionKey, string> = {
  open_writing_bible: '完善写作圣经',
  open_outline_panel: '打开大纲面板',
  repair_materials: '修复生成材料',
  build_scene_plan: '补章节场景计划',
  write_draft: '生成本章初稿',
  review_draft: '审阅修订正文',
  fix_continuity: '修复连续性',
  update_canon: '同步故事状态',
  open_task_center: '打开任务中心',
  open_story_assets: '打开设定资产',
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认计划，进入初稿',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '立即同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
}

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function normalizeOhStoryDirector(value?: AnyRecord | null): AnyRecord | null {
  if (!value || typeof value !== 'object') return null
  const director = [
    value.context_package?.oh_story_director,
    value.context_package?.ohStoryDirector,
    value.contextPackage?.oh_story_director,
    value.contextPackage?.ohStoryDirector,
    value.oh_story_director,
    value.ohStoryDirector,
  ].find(candidate => candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0)
  return director || null
}

export function directorPlannerAction(director?: AnyRecord | null): WritingCockpitActionKey | null {
  const action = director?.primary_action || director?.primaryAction || {}
  const key = text(action?.key)
  if (key === 'generate_prose' || key === 'write_chapter_prose') return 'confirm_plan_and_write_draft'
  if (key === 'repair_pre_draft_materials' || key === 'auto_repair_pre_draft' || key === 'repair_materials') {
    return 'repair_materials'
  }
  if (key === 'confirm_missing_choice' || key === 'manual_confirmation_required') return 'open_generation_diagnostics'
  return null
}

export function directorActionLabel(director: AnyRecord, actionKey: WritingCockpitActionKey) {
  const action = director.primary_action || director.primaryAction || {}
  return text(action?.label, ACTION_LABELS[actionKey])
}

export function directorPlanningReasons(director: AnyRecord, fallback: string) {
  const summary = firstNonEmpty(director.blocking_summary, director.blockingSummary)
  const repairReasons = arrayValue(director.required_repairs || director.requiredRepairs)
    .map(repair => typeof repair === 'object'
      ? firstNonEmpty(repair.detail, repair.label, repair.summary, repair.message)
      : text(repair))
    .filter(Boolean)
  const reasons = [summary, ...repairReasons].filter(Boolean)
  return reasons.length ? reasons.slice(0, 3) : [fallback]
}

export function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

export function issueText(issue: any) {
  if (typeof issue === 'string') return text(issue)
  return firstNonEmpty(issue?.message, issue?.summary, issue?.detail, issue?.text, issue?.title)
}


export function compactWordCount(value: any) {
  return String(value || '').replace(/\s/g, '').length
}

export function compactText(value: any) {
  return String(value || '').replace(/\s+/g, '').trim()
}

export function hasProse(chapter?: AnyRecord | null) {
  const chapterText = String(chapter?.chapter_text || '')
  const compact = chapterText.replace(/\s/g, '')
  if (chapterText) return Boolean(compact && !chapterText.includes('【占位正文】'))
  return Boolean(chapter?.has_prose || chapter?.hasProse || Number(chapter?.word_count ?? chapter?.wordCount ?? 0) > 0)
}

export function sortChapters(chapters: AnyRecord[]) {
  return [...chapters].sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
}

export function hasValidId(record?: AnyRecord | null) {
  return record?.id !== null && record?.id !== undefined && String(record.id).trim() !== ''
}

export function stringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  const single = text(value)
  return single ? [single] : []
}

export function labelStringArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.label, item.name, item.summary, item.detail)
  }).filter(Boolean)
}

export function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

