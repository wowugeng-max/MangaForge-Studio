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
    label: '质量卡',
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
