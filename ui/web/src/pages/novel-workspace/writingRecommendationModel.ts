import type { WritingCockpitActionKey } from './writingCockpitModel'

export type NovelWritingRecommendedActionKey = 'diagnostics' | 'scene_cards' | 'repair_generate' | 'generate' | 'quality_card'
export type NovelDeliveryActionKey = WritingCockpitActionKey

export type NovelWritingRecommendation = {
  key: NovelWritingRecommendedActionKey
  phase: 'prep' | 'draft' | 'review'
  label: string
  reason: string
}

export type NovelWritingResponsibility = {
  roleLabel: string
  phaseLabel: string
  actionLabel: string
  focus: string
  tone: 'editor' | 'planner' | 'writer' | 'reviewer'
}

export type NovelDeliverySummaryInput = {
  visible: boolean
  acceptanceStatus:
    | 'hidden'
    | 'needs_quality_check'
    | 'needs_revision'
    | 'needs_recheck'
    | 'needs_state_sync'
    | 'ready_to_accept'
    | 'delivered'
  statusLabel: string
  acceptanceReasons: string[]
  qualityScore: number | null
  storyStateSynced: boolean
  recommendedAcceptanceAction: {
    key: NovelDeliveryActionKey
    label: string
  }
}

export type NovelDeliverySummary = {
  visible: boolean
  tone: 'check' | 'revision' | 'sync' | 'ready'
  statusLabel: string
  qualityLabel: string
  storyStateLabel: string
  reason: string
  actionKey: NovelDeliveryActionKey | null
  actionLabel: string
  compactActionLabel: string
}

export type NovelDraftBriefActionKey = 'metadata' | 'scene_cards' | 'build_brief' | 'confirm_brief' | 'generate'

export type NovelPreDraftBrief = {
  chapter_goal?: string
  reader_promise?: string
  core_conflict?: string
  emotional_curve?: string
  key_settings?: string[]
  forbidden_content?: string[]
  storyline_advances?: string[]
  storyline_plants?: string[]
  storyline_payoffs?: string[]
  storyline_forbidden?: string[]
  scene_briefs?: any[]
  word_budget?: string
  ending_hook?: string
  confirmed_at?: string
}

export type NovelDraftBriefSummary = {
  visible: boolean
  statusLabel: string
  focus: string
  checks: string[]
  actionKey: NovelDraftBriefActionKey | null
  actionLabel: string
  briefFields: {
    chapterGoal: string
    readerPromise: string
    coreConflict: string
    emotionalCurve: string
    keySettings: string
    forbiddenContent: string
    storylineAdvances: string
    storylinePlants: string
    storylinePayoffs: string
    storylineForbidden: string
    sceneBudget: string
    wordBudget: string
    endingHook: string
  }
}

export function buildNovelDraftBriefSummary({
  activeWordCount,
  chapterGoal,
  conflict,
  endingHook,
  sceneCardCount,
  preDraftBrief,
}: {
  activeWordCount: number
  chapterGoal?: string | null
  conflict?: string | null
  endingHook?: string | null
  sceneCardCount: number
  preDraftBrief?: NovelPreDraftBrief | null
}): NovelDraftBriefSummary {
  const briefFields = {
    chapterGoal: preDraftBrief?.chapter_goal?.trim() || chapterGoal?.trim() || '',
    readerPromise: preDraftBrief?.reader_promise?.trim() || '',
    coreConflict: preDraftBrief?.core_conflict?.trim() || conflict?.trim() || '',
    emotionalCurve: preDraftBrief?.emotional_curve?.trim() || '',
    keySettings: Array.isArray(preDraftBrief?.key_settings) ? preDraftBrief.key_settings.filter(Boolean).join('、') : '',
    forbiddenContent: Array.isArray(preDraftBrief?.forbidden_content) ? preDraftBrief.forbidden_content.filter(Boolean).join('、') : '',
    storylineAdvances: Array.isArray(preDraftBrief?.storyline_advances) ? preDraftBrief.storyline_advances.filter(Boolean).join('、') : '',
    storylinePlants: Array.isArray(preDraftBrief?.storyline_plants) ? preDraftBrief.storyline_plants.filter(Boolean).join('、') : '',
    storylinePayoffs: Array.isArray(preDraftBrief?.storyline_payoffs) ? preDraftBrief.storyline_payoffs.filter(Boolean).join('、') : '',
    storylineForbidden: Array.isArray(preDraftBrief?.storyline_forbidden) ? preDraftBrief.storyline_forbidden.filter(Boolean).join('、') : '',
    sceneBudget: Array.isArray(preDraftBrief?.scene_briefs) && preDraftBrief.scene_briefs.length > 0 ? `${preDraftBrief.scene_briefs.length} 个场景已写入任务书` : '',
    wordBudget: preDraftBrief?.word_budget?.trim() || '',
    endingHook: preDraftBrief?.ending_hook?.trim() || endingHook?.trim() || '',
  }

  if (activeWordCount > 0) {
    return {
      visible: false,
      statusLabel: '',
      focus: '',
      checks: [],
      actionKey: null,
      actionLabel: '',
      briefFields,
    }
  }

  const hasGoal = Boolean(chapterGoal?.trim())
  const hasHook = Boolean(endingHook?.trim())
  const hasScenes = sceneCardCount > 0
  const checks = [
    hasGoal ? '目标已定' : '缺目标',
    conflict?.trim() ? '冲突已定' : '缺冲突',
    hasHook ? '钩子已定' : '缺钩子',
    hasScenes ? `场景 ${sceneCardCount}` : '缺场景卡',
  ]
  const focus = [
    chapterGoal?.trim() || '本章目标待补齐',
    conflict?.trim() ? `冲突：${conflict.trim()}` : '',
    endingHook?.trim() ? `钩子：${endingHook.trim()}` : '',
  ].filter(Boolean).join('；')

  if (!hasGoal || !hasHook) {
    return {
      visible: true,
      statusLabel: '待补目标',
      focus,
      checks,
      actionKey: 'metadata',
      actionLabel: '补章节目标',
      briefFields,
    }
  }
  if (!hasScenes) {
    return {
      visible: true,
      statusLabel: '待补场景',
      focus,
      checks,
      actionKey: 'scene_cards',
      actionLabel: '补场景卡',
      briefFields,
    }
  }
  if (!preDraftBrief) {
    return {
      visible: true,
      statusLabel: '待生成任务书',
      focus,
      checks: [...checks, '缺任务书'],
      actionKey: 'build_brief',
      actionLabel: '生成任务书',
      briefFields,
    }
  }
  if (!preDraftBrief.confirmed_at) {
    return {
      visible: true,
      statusLabel: '待确认任务书',
      focus: [briefFields.readerPromise, briefFields.coreConflict, briefFields.endingHook ? `钩子：${briefFields.endingHook}` : ''].filter(Boolean).join('；') || focus,
      checks: [...checks, '任务书待确认'],
      actionKey: 'confirm_brief',
      actionLabel: '确认任务书',
      briefFields,
    }
  }
  if (preDraftBrief?.confirmed_at) {
    return {
      visible: true,
      statusLabel: '任务书已确认',
      focus: [briefFields.readerPromise, briefFields.coreConflict, briefFields.endingHook ? `钩子：${briefFields.endingHook}` : ''].filter(Boolean).join('；') || focus,
      checks: [...checks, '任务书已确认'],
      actionKey: 'generate',
      actionLabel: '确认并生成',
      briefFields,
    }
  }
  return {
    visible: true,
    statusLabel: '可进入初稿',
    focus,
    checks,
    actionKey: 'generate',
    actionLabel: '确认并生成',
    briefFields,
  }
}

export function buildNovelWritingRecommendation({
  materialReady,
  materialRecommendations,
  sceneCardCount,
  activeWordCount,
}: {
  materialReady: boolean
  materialRecommendations: string[]
  sceneCardCount: number
  activeWordCount: number
}): NovelWritingRecommendation {
  if (!materialReady) {
    return {
      key: 'repair_generate',
      phase: 'draft',
      label: '补齐并生成',
      reason: materialRecommendations[0] || '材料不足，先补齐上下文再进入正文更稳。',
    }
  }
  if (sceneCardCount === 0) {
    return {
      key: 'scene_cards',
      phase: 'prep',
      label: '场景卡',
      reason: '当前章缺少场景节拍，先拆场景能降低正文跑偏。',
    }
  }
  if (activeWordCount === 0) {
    return {
      key: 'generate',
      phase: 'draft',
      label: '生成',
      reason: '材料和场景已具备，可以进入正文初稿。',
    }
  }
  return {
    key: 'quality_card',
    phase: 'review',
    label: '交稿质检',
    reason: '当前章已有正文，下一步适合检查爽点、节奏和连续性。',
  }
}

export function buildNovelWritingResponsibility(recommendation: NovelWritingRecommendation): NovelWritingResponsibility {
  switch (recommendation.key) {
    case 'diagnostics':
      return {
        roleLabel: '总编',
        phaseLabel: '写前诊断',
        actionLabel: recommendation.label,
        focus: '判断本章是否具备开写条件，先指出阻塞项和材料缺口。',
        tone: 'editor',
      }
    case 'scene_cards':
      return {
        roleLabel: '分集策划',
        phaseLabel: '写前准备',
        actionLabel: recommendation.label,
        focus: '把本章目标拆成可执行场景节拍，锁定冲突、转折和章末钩子。',
        tone: 'planner',
      }
    case 'repair_generate':
      return {
        roleLabel: '分集策划',
        phaseLabel: '材料修复',
        actionLabel: recommendation.label,
        focus: '补齐本章上下文、人物状态和场景节拍缺口，再交给正文写手。',
        tone: 'planner',
      }
    case 'generate':
      return {
        roleLabel: '正文写手',
        phaseLabel: '正文生成',
        actionLabel: recommendation.label,
        focus: '按已确认材料和场景卡生成正文初稿，不擅自改长期设定。',
        tone: 'writer',
      }
    case 'quality_card':
      return {
        roleLabel: '修订编辑',
        phaseLabel: '写后复检',
        actionLabel: recommendation.label,
        focus: '检查已有正文的爽点、节奏、连续性和章末钩子，给出改稿依据。',
        tone: 'reviewer',
      }
  }
}

export function buildNovelDeliverySummary(desk?: NovelDeliverySummaryInput | null): NovelDeliverySummary {
  if (!desk?.visible || desk.acceptanceStatus === 'hidden') {
    return {
      visible: false,
      tone: 'check',
      statusLabel: '',
      qualityLabel: '质量待复检',
      storyStateLabel: '故事状态待同步',
      reason: '',
      actionKey: null,
      actionLabel: '',
      compactActionLabel: '',
    }
  }

  const tone: NovelDeliverySummary['tone'] = (() => {
    if (desk.acceptanceStatus === 'needs_revision') return 'revision'
    if (desk.acceptanceStatus === 'needs_state_sync') return 'sync'
    if (desk.acceptanceStatus === 'ready_to_accept' || desk.acceptanceStatus === 'delivered') return 'ready'
    return 'check'
  })()

  return {
    visible: true,
    tone,
    statusLabel: desk.statusLabel,
    qualityLabel: desk.qualityScore === null ? '质量待复检' : `质量 ${desk.qualityScore}`,
    storyStateLabel: desk.storyStateSynced ? '故事状态已同步' : '故事状态待同步',
    reason: desk.acceptanceReasons.filter(Boolean).slice(0, 2).join('；') || '本章已有正文，请按交稿流程完成复检。',
    actionKey: desk.recommendedAcceptanceAction.key,
    actionLabel: desk.recommendedAcceptanceAction.label,
    compactActionLabel: compactDeliveryActionLabel(desk.recommendedAcceptanceAction.key, desk.recommendedAcceptanceAction.label),
  }
}

function compactDeliveryActionLabel(key: NovelDeliveryActionKey, label: string) {
  switch (key) {
    case 'refresh_current_quality':
      return '复检'
    case 'create_editor_report':
      return '编辑报告'
    case 'apply_editor_revision':
      return '修订'
    case 'sync_story_state':
      return '同步状态'
    case 'accept_chapter_and_continue':
      return '验收'
    default:
      return label
  }
}
