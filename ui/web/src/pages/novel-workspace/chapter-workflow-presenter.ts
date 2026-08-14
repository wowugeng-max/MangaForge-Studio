/** Single source of truth for chapter writing closed-loop UI. */
import type { WritingCockpitActionKey } from './writingCockpitModel'

export type ChapterWorkflowPhase =
  | 'empty'
  | 'blocked_materials'
  | 'writing'
  | 'written_unchecked'
  | 'needs_revision'
  | 'needs_state_sync'
  | 'ready_next'
  | 'failed_admission'

export type ChapterWorkflowAction = {
  key: WritingCockpitActionKey | 'generate' | 'repair_generate' | 'open_versions' | 'view_quality' | 'view_brief'
  label: string
  kind?: 'primary' | 'default' | 'ghost' | 'danger'
}

export type ChapterWorkflowPresenter = {
  phase: ChapterWorkflowPhase
  phaseLabel: string
  reasonText: string
  primaryAction: ChapterWorkflowAction
  secondaryActions: ChapterWorkflowAction[]
  stepIndex: number
  stepsDone: boolean[]
  panelToOpen: 'brief' | 'quality' | 'version'
  hasProse: boolean
}

export type ChapterWorkflowInput = {
  hasChapter?: boolean
  hasProse?: boolean
  materialReady?: boolean
  materialBlockReason?: string
  acceptanceStatus?: string
  admissionStatus?: string
  admissionMessage?: string
  storyStateSynced?: boolean
  qualityScore?: number | null
  canSyncStoryState?: boolean
  revisionAvailable?: boolean
}

const STEPS = ['正文', '复检', '修订', '状态同步', '下一章'] as const

export function chapterWorkflowStepLabels() {
  return [...STEPS]
}

function phaseLabel(phase: ChapterWorkflowPhase, input: ChapterWorkflowInput = {}) {
  switch (phase) {
    case 'empty': return '未写'
    case 'blocked_materials': return '缺材料'
    case 'writing': return '写作中'
    case 'written_unchecked':
      return input.storyStateSynced ? '可复检提升' : '已写待复检'
    case 'needs_revision': return '待修订'
    case 'needs_state_sync': return '待同步状态'
    case 'ready_next': return '可写下一章'
    case 'failed_admission': return '生成被拦截'
  }
}

function acceptanceOf(input: ChapterWorkflowInput) {
  return String(input.acceptanceStatus || '')
}

function qualityChecked(input: ChapterWorkflowInput) {
  const acceptance = acceptanceOf(input)
  if (input.qualityScore != null && Number.isFinite(Number(input.qualityScore))) return true
  return Boolean(acceptance)
    && !['', 'hidden', 'needs_quality_check'].includes(acceptance)
}

function needsRevision(input: ChapterWorkflowInput) {
  return ['needs_revision', 'needs_recheck'].includes(acceptanceOf(input))
}

function revisionSettled(input: ChapterWorkflowInput) {
  // Revision step is complete when quality has been checked and no open revision remains.
  return qualityChecked(input) && !needsRevision(input)
}

function storySynced(input: ChapterWorkflowInput) {
  return input.storyStateSynced === true
}

function remainingClosedLoopPrimary(input: ChapterWorkflowInput): ChapterWorkflowAction {
  if (!storySynced(input)) {
    return { key: 'sync_story_state', label: '同步故事状态', kind: 'primary' }
  }
  return { key: 'accept_chapter_and_continue', label: '写下一章', kind: 'primary' }
}

/** Fact-based step completion — not a rigid linear cascade. */
export function buildWorkflowSteps(input: ChapterWorkflowInput = {}, phase?: ChapterWorkflowPhase) {
  const resolved = phase || resolveChapterWorkflowPhase(input)
  const proseDone = Boolean(input.hasProse)
  const qualityDone = qualityChecked(input)
  const revisionDone = revisionSettled(input)
  const syncDone = storySynced(input)
  const nextDone = resolved === 'ready_next'

  const stepsDone = [proseDone, qualityDone, revisionDone, syncDone, nextDone]

  let stepIndex = 0
  if (!proseDone) stepIndex = 0
  else if (!qualityDone) stepIndex = 1
  else if (!revisionDone) stepIndex = 2
  else if (!syncDone) stepIndex = 3
  else stepIndex = 4

  // If primary work is quality but sync already finished, keep current on 复检
  // while still highlighting completed 状态同步.
  if (resolved === 'written_unchecked' || resolved === 'writing') stepIndex = 1
  if (resolved === 'needs_revision') stepIndex = 2
  if (resolved === 'needs_state_sync') stepIndex = 3
  if (resolved === 'ready_next') stepIndex = 4
  if (resolved === 'empty' || resolved === 'blocked_materials' || resolved === 'failed_admission') stepIndex = 0

  return { stepsDone, stepIndex }
}

export function resolveChapterWorkflowPhase(input: ChapterWorkflowInput = {}): ChapterWorkflowPhase {
  const admission = String(input.admissionStatus || '')
  if (admission === 'blocked_invalid') return 'failed_admission'

  if (!input.hasChapter) return 'empty'
  if (!input.hasProse) {
    if (input.materialReady === false) return 'blocked_materials'
    return 'empty'
  }

  const acceptance = acceptanceOf(input)
  if (['needs_revision', 'needs_recheck'].includes(acceptance)) return 'needs_revision'
  if (acceptance === 'needs_quality_check' || !acceptance || acceptance === 'hidden') return 'written_unchecked'
  if (acceptance === 'needs_state_sync' || (input.storyStateSynced === false && ['ready_to_accept', 'delivered_with_warnings', 'delivered'].includes(acceptance))) {
    return 'needs_state_sync'
  }
  if (['ready_to_accept', 'delivered', 'delivered_with_warnings'].includes(acceptance)) {
    if (input.storyStateSynced === false) return 'needs_state_sync'
    return 'ready_next'
  }
  return 'writing'
}

export function buildChapterWorkflowPresenter(input: ChapterWorkflowInput = {}): ChapterWorkflowPresenter {
  const phase = resolveChapterWorkflowPhase(input)
  const hasProse = Boolean(input.hasProse)
  const { stepsDone, stepIndex } = buildWorkflowSteps(input, phase)

  const base = {
    phase,
    phaseLabel: phaseLabel(phase, input),
    hasProse,
    stepsDone,
    stepIndex,
  }

  if (phase === 'failed_admission') {
    return {
      ...base,
      reasonText: input.admissionMessage || '正文生成被准入拦截，当前版本未被污染。请按原因修复后再生成。',
      primaryAction: { key: 'repair_generate', label: '按原因修复后再生成', kind: 'danger' },
      secondaryActions: [
        { key: 'view_brief', label: '查看交接要点', kind: 'ghost' },
        { key: 'open_generation_diagnostics', label: '查看拦截详情', kind: 'ghost' },
      ],
      panelToOpen: 'brief',
    }
  }

  if (phase === 'blocked_materials') {
    return {
      ...base,
      reasonText: input.materialBlockReason || '材料不足，直接生成容易断章。先补齐材料。',
      primaryAction: { key: 'repair_materials', label: '补齐材料', kind: 'primary' },
      secondaryActions: [
        { key: 'view_brief', label: '查看缺口', kind: 'ghost' },
        { key: 'open_story_assets', label: '打开资产', kind: 'ghost' },
      ],
      panelToOpen: 'brief',
    }
  }

  if (phase === 'empty') {
    return {
      ...base,
      reasonText: '本章还没有正文。确认任务要点后生成初稿。',
      primaryAction: { key: 'generate', label: '生成正文', kind: 'primary' },
      secondaryActions: [
        { key: 'repair_materials', label: '补齐材料', kind: 'default' },
        { key: 'view_brief', label: '看任务', kind: 'ghost' },
      ],
      panelToOpen: 'brief',
    }
  }

  if (phase === 'written_unchecked' || phase === 'writing') {
    const synced = storySynced(input)
    return {
      ...base,
      reasonText: synced
        ? '正文已具备，故事状态已同步。质检修订请用下方 oh-story。'
        : '正文已具备。先同步故事状态，质检修订请用下方 oh-story。',
      primaryAction: remainingClosedLoopPrimary(input),
      secondaryActions: [
        { key: 'generate', label: '重写', kind: 'default' },
        { key: 'open_versions', label: '版本', kind: 'ghost' },
      ],
      panelToOpen: 'quality',
    }
  }

  if (phase === 'needs_revision') {
    return {
      ...base,
      reasonText: storySynced(input)
        ? '旧质检仍标了待修订。改稿请用下方 oh-story，或进入下一章。'
        : '旧质检仍标了待修订。先同步故事状态，改稿请用下方 oh-story。',
      primaryAction: remainingClosedLoopPrimary(input),
      secondaryActions: [
        { key: 'view_quality', label: '查看问题', kind: 'default' },
        { key: 'open_versions', label: '版本', kind: 'ghost' },
      ],
      panelToOpen: 'quality',
    }
  }

  if (phase === 'needs_state_sync') {
    return {
      ...base,
      reasonText: '质检已过，但故事状态机尚未同步。现在写下一章可能继续漂移。',
      primaryAction: { key: 'sync_story_state', label: '同步故事状态', kind: 'primary' },
      secondaryActions: [
        { key: 'view_quality', label: '查看状态差', kind: 'ghost' },
        { key: 'open_versions', label: '版本', kind: 'ghost' },
      ],
      panelToOpen: 'quality',
    }
  }

  return {
    ...base,
    reasonText: '本章闭环完成。可以进入下一章，或回看版本。',
    primaryAction: { key: 'accept_chapter_and_continue', label: '写下一章', kind: 'primary' },
    secondaryActions: [
      { key: 'open_versions', label: '版本', kind: 'ghost' },
      { key: 'view_quality', label: '回看质检', kind: 'ghost' },
    ],
    panelToOpen: 'version',
  }
}
