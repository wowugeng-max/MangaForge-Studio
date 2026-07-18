import type { DeslopGateDiagnosticsModel } from './writingCockpitModel'
import type {
  NovelDeliveryActionKey,
  NovelDeliverySummary,
  NovelDeliverySummaryInput,
  NovelWritingRecommendedActionKey,
  NovelWritingRecommendation,
  NovelWritingResponsibility,
} from './writing-recommendation-types'

export function buildNovelWritingRecommendation({
  materialReady,
  materialRecommendations,
  sceneCardCount,
  activeWordCount,
  deliveryRiskCarryOverActionCount = 0,
  qualityContinuitySceneMapCount = 0,
}: {
  materialReady: boolean
  materialRecommendations: string[]
  sceneCardCount: number
  activeWordCount: number
  deliveryRiskCarryOverActionCount?: number
  qualityContinuitySceneMapCount?: number
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
  if (activeWordCount === 0 && deliveryRiskCarryOverActionCount > 0 && qualityContinuitySceneMapCount === 0) {
    return {
      key: 'scene_cards',
      phase: 'prep',
      label: '补续航场景',
      reason: '质量续航/交稿风险还没有落到具体场景卡，先补 serial_risk_repairs、recent_fatigue_action 和首中尾动作，再进入正文。',
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
        focus: recommendation.label === '补续航场景'
          ? '把质量续航/交稿风险挂到具体场景节拍，锁定首场承接、中段推进和章末追读。'
          : '把本章目标拆成可执行场景节拍，锁定冲突、转折和章末钩子。',
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
      storylineSync: null,
      storyUnitSync: null,
      assetIntake: null,
      ipSceneIntake: null,
      signatureSceneSync: null,
      readabilityReview: null,
      deslopGateDiagnostics: null,
      coreDrift: null,
      runwaySync: null,
      readerPayoffSync: null,
      readerExpectationSync: null,
      qualityAuditSync: null,
      qualityAuditRepairReceiptSync: null,
      chapterHandoffSync: null,
      chapterHandoffDeltaSync: null,
      writePreparation: null,
      readerRetentionSync: null,
      chapterAttraction: null,
      storyDriveSync: null,
      characterArcSync: null,
      chapterBenchmarkSync: null,
      styleSampleSync: null,
      first30RetentionRecheck: null,
      innovationSync: null,
      volumeBeatSync: null,
      blueprintReceipt: null,
      revisionReceipt: null,
      deliveryRiskReceipt: null,
      sceneCardReceipt: null,
      qualityAudit: null,
      platformRubric: null,
      approvalBlocker: null,
      deliveryRiskQueue: null,
      deliveryRiskConvergence: null,
      actionKey: null,
      actionLabel: '',
      compactActionLabel: '',
      secondaryActions: [],
      storyStatePanel: null,
      storyStateSyncAction: null,
    }
  }

  const tone: NovelDeliverySummary['tone'] = (() => {
    if (desk.acceptanceStatus === 'delivered_with_warnings') return 'warning'
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
    storyStateLabel: (() => {
      if (desk.acceptanceStatus === 'needs_state_sync' || desk.storyStateStatus === 'pending') {
        return desk.storyStatePanel?.headline || '正文已入库，故事状态待补同步'
      }
      if (desk.storyStatePanel?.status && desk.storyStatePanel.status !== 'synced') {
        return desk.storyStatePanel.headline || '故事状态待同步'
      }
      return desk.storyStateSynced ? '故事状态已同步' : '故事状态待同步'
    })(),
    reason: desk.acceptanceReasons.filter(Boolean).slice(0, 2).join('；') || '本章已有正文，请按交稿流程完成复检。',
    storylineSync: desk.storylineSync || null,
    storyUnitSync: desk.storyUnitSync || null,
    assetIntake: desk.assetIntake || null,
    ipSceneIntake: desk.ipSceneIntake || null,
    signatureSceneSync: desk.signatureSceneSync || null,
    readabilityReview: desk.readabilityReview || null,
    deslopGateDiagnostics: desk.deslopGateDiagnostics || null,
    coreDrift: desk.coreDrift || null,
    runwaySync: desk.runwaySync || null,
    readerPayoffSync: desk.readerPayoffSync || null,
    readerExpectationSync: desk.readerExpectationSync || null,
    qualityAuditSync: desk.qualityAuditSync || null,
    qualityAuditRepairReceiptSync: desk.qualityAuditRepairReceiptSync || null,
    chapterHandoffSync: desk.chapterHandoffSync || null,
    chapterHandoffDeltaSync: desk.chapterHandoffDeltaSync || null,
    writePreparation: desk.writePreparation || null,
    readerRetentionSync: desk.readerRetentionSync || null,
    chapterAttraction: desk.chapterAttraction || null,
    storyDriveSync: desk.storyDriveSync || null,
    characterArcSync: desk.characterArcSync || null,
    chapterBenchmarkSync: desk.chapterBenchmarkSync || null,
    styleSampleSync: desk.styleSampleSync || null,
    first30RetentionRecheck: desk.first30RetentionRecheck || null,
    innovationSync: desk.innovationSync || null,
    volumeBeatSync: desk.volumeBeatSync || null,
    blueprintReceipt: desk.blueprintReceipt || null,
    revisionReceipt: desk.revisionReceipt || null,
    deliveryRiskReceipt: desk.deliveryRiskReceipt || null,
    sceneCardReceipt: desk.sceneCardReceipt || null,
    qualityAudit: desk.qualityAudit || null,
    platformRubric: desk.platformRubric || null,
    approvalBlocker: desk.approvalBlocker || null,
    deliveryRiskQueue: desk.deliveryRiskQueue || null,
    deliveryRiskConvergence: desk.deliveryRiskConvergence || null,
    actionKey: desk.recommendedAcceptanceAction.key,
    actionLabel: desk.recommendedAcceptanceAction.label,
    compactActionLabel: compactDeliveryActionLabel(desk.recommendedAcceptanceAction.key, desk.recommendedAcceptanceAction.label),
    secondaryActions: desk.secondaryActions || [],
    storyStatePanel: desk.storyStatePanel || null,
    storyStateSyncAction: (() => {
      const panel = desk.storyStatePanel
      if (panel?.primaryAction && panel.status && panel.status !== 'synced') {
        return { key: panel.primaryAction.key, label: panel.primaryAction.label }
      }
      const secondary = (desk.secondaryActions || []).find(item => item.key === 'sync_story_state')
      if (secondary) return secondary
      if (!desk.storyStateSynced && desk.acceptanceStatus !== 'hidden') {
        return { key: 'sync_story_state', label: '立即同步故事状态' }
      }
      return null
    })(),
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
