import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskItemText,
  normalizeDeliveryRiskCarryOverContext,
  normalizeDeliveryRiskReceiptDelivered,
} from './delivery-risk-core'
import {
  artifactProtocolReceiptsFromSource,
  normalizeArtifactProtocolReceipt,
} from './artifact-protocol'
import { reviewTimestamp, reviewBelongsToChapter, reviewPayloadForType } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import {
  deliveryRiskCountFromPayload,
  deliveryRiskEvidence,
  pendingAssetIntakeRisks,
  pendingIpSceneIntakeRisks,
  makeDeliveryRiskItem,
  genericSyncRiskStagedActions,
  proseQualityAssetLinkageRisks,
  proseQualityAuditRepairReceiptRisks,
  proseQualityBannedWordRisks,
  proseQualityBenchmarkRecallRisks,
  proseQualityBlueprintConsumptionRisks,
  proseQualityBridgeUnitRisks,
  proseQualityChapterBenchmarkRisks,
  proseQualityChapterHandoffRisks,
  proseQualityChapterHookRisks,
  proseQualityCharacterBehaviorRisks,
  proseQualityCharacterRelationRisks,
  proseQualityConflictStructureRisks,
  proseQualityContentRubricRisks,
  proseQualityContinuityHeatRisks,
  proseQualityCoreContractRisks,
  proseQualityCraftMetricRisks,
  proseQualityDeliveryRiskReceiptRisks,
  proseQualityDeslopRepairCheckRisks,
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityDialogueRisks,
  proseQualityEmotionalArcRisks,
  proseQualityExpectationThresholdRisks,
  proseQualityFemaleAudienceRisks,
  proseQualityFiveDimensionRisks,
  proseQualityFocusedRevisionModeRisks,
  proseQualityForeshadowingDeltaRisks,
  proseQualityGateFailureRisks,
  proseQualityGenrePositioningRisks,
  proseQualityHighSeverityFindings,
  proseQualityInformationFlowRisks,
  proseQualityIntentConfirmationRisks,
  proseQualityNextChapterPlanRisks,
  proseQualityOpeningRisks,
  proseQualityParagraphHookRisks,
  proseQualityPerspectiveVerdictRisks,
  proseQualityPlatformRubricRisks,
  proseQualityPlotDynamicsRisks,
  proseQualityPlotSpecialTopicsRisks,
  proseQualityProseCraftRisks,
  proseQualityProseMetaRisks,
  proseQualityPunctuationToneRisks,
  proseQualityQualityAuditRisks,
  proseQualityQualitySpecialtyRisks,
  proseQualityReaderRetentionRisks,
  proseQualityReversalRisks,
  proseQualityRevisionContextRisks,
  proseQualityRevisionDirectiveRisks,
  proseQualityRevisionReceiptCheckRisks,
  proseQualityRevisionReceiptRisks,
  proseQualitySettingViolationRisks,
  proseQualityShowdownRisks,
  proseQualitySourceReadinessRisks,
  proseQualityStateTrackingRisks,
  proseQualityStoryLoopRisks,
  proseQualityStoryStateUpdateRisks,
  proseQualityStructuredCheckRisks,
  proseQualityStyleBoundaryRisks,
  proseQualityStyleSampleRisks,
  proseQualitySuspenseRisks,
  proseQualityTargetReaderRisks,
  proseQualityTitleUniquenessRisks,
  proseQualityUpgradeRhythmRisks,
  proseQualityWordCountRisks,
  proseQualityWritePreparationRisks,
  readabilityAiSmellRisks,
} from '../quality/prose-quality-risks'
import {
  normalizeStoredOhStoryDeliveryReceipts,
} from './delivery-risk-carry-over'

export function buildDeliveryRiskCarryOverContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  if (!chapterNo) return null
  const previousChapter = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-1)[0]
  if (!previousChapter) return null

  const rules = [
    { type: 'chapter_core_drift', prefix: '守核心', priority: '优先补核心', countKeys: ['risk_count', 'riskCount'] },
    { type: 'runway_sync', prefix: '补航线', priority: '优先补航线', countKeys: ['risk_count', 'riskCount'] },
    { type: 'story_unit_sync', prefix: '校剧情单元', priority: '优先校单元', countKeys: ['risk_count', 'riskCount'] },
    { type: 'signature_scene_sync', prefix: '补强场面', priority: '优先补强场面', countKeys: ['missed_count', 'missedCount'] },
    { type: 'timeline_delta_sync', prefix: '补时间线', priority: '优先补时间线', countKeys: ['missed_count', 'missedCount'] },
    { type: 'character_state_delta_sync', prefix: '补角色状态', priority: '优先补角色状态', countKeys: ['missed_count', 'missedCount'] },
    { type: 'asset_state_delta_sync', prefix: '补资产状态', priority: '优先补资产状态', countKeys: ['missed_count', 'missedCount'] },
    { type: 'relationship_delta_sync', prefix: '补关系', priority: '优先补关系', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_handoff_delta_sync', prefix: '补章末交接', priority: '优先补章末交接', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_handoff_sync', prefix: '接章首', priority: '优先补章首承接', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_title_uniqueness_sync', prefix: '修标题', priority: '优先修章节标题', countKeys: ['missed_count', 'missedCount'] },
    { type: 'prose_revision_receipt_sync', prefix: '复核修订', priority: '优先复核修订', countKeys: ['missed_count', 'missedCount'] },
    { type: 'revision_cascade_impact_sync', prefix: '级联修订', priority: '优先级联修订', countKeys: ['missed_count', 'missedCount'] },
    { type: 'revision_scope_guard_sync', prefix: '稳修订幅度', priority: '优先稳修订幅度', countKeys: ['missed_count', 'missedCount'] },
    { type: 'core_contract_sync', prefix: '创作契约', priority: '优先修创作契约', countKeys: ['missed_count', 'missedCount'] },
    { type: 'deterministic_prose_cleanup', prefix: '确定性清理', priority: '优先确定性清理', countKeys: ['risk_count', 'riskCount'] },
    { type: 'foreshadowing_delta_sync', prefix: '补伏笔增量', priority: '优先补伏笔增量', countKeys: ['missed_count', 'missedCount'] },
    { type: 'reader_expectation_sync', prefix: '补期待', priority: '优先补期待', countKeys: ['missed_count', 'missedCount'] },
    { type: 'reader_retention_sync', prefix: '补追读', priority: '优先补追读', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_attraction_review', prefix: '修吸引力', priority: '', countKeys: ['weak_count', 'weakCount'] },
    { type: 'story_drive_sync', prefix: '补故事力', priority: '', countKeys: ['missed_count', 'missedCount'] },
    { type: 'story_loop_sync', prefix: '补循环', priority: '优先补故事循环', countKeys: ['missed_count', 'missedCount'] },
    { type: 'information_flow_sync', prefix: '补信息流', priority: '优先补信息流', countKeys: ['missed_count', 'missedCount'] },
    { type: 'expectation_threshold_sync', prefix: '补期待阈值', priority: '优先补期待阈值', countKeys: ['missed_count', 'missedCount'] },
    { type: 'emotional_arc_sync', prefix: '补情绪弧', priority: '优先补情绪弧', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_hook_sync', prefix: '补章钩子', priority: '优先补章级钩子', countKeys: ['missed_count', 'missedCount'] },
    { type: 'paragraph_hook_sync', prefix: '补段钩子', priority: '优先补段落钩子', countKeys: ['missed_count', 'missedCount'] },
    { type: 'suspense_sync', prefix: '补悬念', priority: '优先补悬念编排', countKeys: ['missed_count', 'missedCount'] },
    { type: 'reversal_sync', prefix: '补反转', priority: '优先补反转设计', countKeys: ['missed_count', 'missedCount'] },
    { type: 'showdown_sync', prefix: '补高潮', priority: '优先补高潮对抗', countKeys: ['missed_count', 'missedCount'] },
    { type: 'spectator_reaction_sync', prefix: '补围观', priority: '优先补围观反应', countKeys: ['missed_count', 'missedCount'] },
    { type: 'payoff_setup_sync', prefix: '补铺垫', priority: '优先补爽点铺垫', countKeys: ['missed_count', 'missedCount'] },
    { type: 'bridge_unit_sync', prefix: '补桥段', priority: '优先补桥段节奏', countKeys: ['missed_count', 'missedCount'] },
    { type: 'beat_cooling_sync', prefix: '换节奏', priority: '优先轮换桥段类型', countKeys: ['missed_count', 'missedCount'] },
    { type: 'opening_sync', prefix: '补开篇', priority: '优先补开篇设计', countKeys: ['missed_count', 'missedCount'] },
    { type: 'prose_craft_sync', prefix: '补工艺', priority: '优先补正文工艺', countKeys: ['missed_count', 'missedCount'] },
    { type: 'punctuation_tone_sync', prefix: '补标点', priority: '优先补语气标点', countKeys: ['missed_count', 'missedCount'] },
    { type: 'quality_audit_sync', prefix: '补诊断', priority: '优先补质量诊断', countKeys: ['missed_count', 'missedCount'] },
    { type: 'dialogue_sync', prefix: '修对白', priority: '优先修对白', countKeys: ['missed_count', 'missedCount'] },
    { type: 'character_behavior_sync', prefix: '补行为', priority: '优先补角色行为', countKeys: ['missed_count', 'missedCount'] },
    { type: 'asset_linkage_sync', prefix: '挂资产', priority: '优先补资产挂钩', countKeys: ['missed_count', 'missedCount'] },
    { type: 'state_tracking_sync', prefix: '补状态', priority: '优先补状态跟踪', countKeys: ['missed_count', 'missedCount'] },
    { type: 'source_readiness_sync', prefix: '补来源', priority: '优先补来源就绪', countKeys: ['missed_count', 'missedCount'] },
    { type: 'prose_meta_sync', prefix: '修元信息', priority: '优先修正文元信息', countKeys: ['missed_count', 'missedCount'] },
    { type: 'intent_confirmation_sync', prefix: '修意图', priority: '优先修意图确认', countKeys: ['missed_count', 'missedCount'] },
    { type: 'continuity_heat_sync', prefix: '补热度', priority: '优先补连续性热度', countKeys: ['missed_count', 'missedCount'] },
    { type: 'conflict_structure_sync', prefix: '补冲突', priority: '优先补冲突结构', countKeys: ['missed_count', 'missedCount'] },
    { type: 'upgrade_rhythm_sync', prefix: '补升级', priority: '优先补升级节奏', countKeys: ['missed_count', 'missedCount'] },
    { type: 'target_reader_sync', prefix: '补读者', priority: '优先补目标读者', countKeys: ['missed_count', 'missedCount'] },
    { type: 'genre_positioning_sync', prefix: '补题材', priority: '优先补题材定位', countKeys: ['missed_count', 'missedCount'] },
    { type: 'plot_special_topics_sync', prefix: '补特殊题材', priority: '优先补特殊题材', countKeys: ['missed_count', 'missedCount'] },
    { type: 'female_audience_sync', prefix: '补女频', priority: '优先补女频长篇', countKeys: ['missed_count', 'missedCount'] },
    { type: 'plot_dynamics_sync', prefix: '补动力', priority: '优先补剧情动力', countKeys: ['missed_count', 'missedCount'] },
    { type: 'story_power_sync', prefix: '补故事力', priority: '优先补故事力', countKeys: ['missed_count', 'missedCount'] },
    { type: 'character_relation_sync', prefix: '补关系线', priority: '优先补角色关系', countKeys: ['missed_count', 'missedCount'] },
    { type: 'character_arc_sync', prefix: '补人物弧光', priority: '', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_blueprint_sync', prefix: '补细纲', priority: '优先补细纲', countKeys: ['missed_count', 'missedCount'] },
    { type: 'chapter_benchmark_sync', prefix: '补基准', priority: '优先补基准', countKeys: ['missed_count', 'missedCount'] },
    { type: 'benchmark_recall_sync', prefix: '补召回', priority: '优先补召回', countKeys: ['missed_count', 'missedCount'] },
    { type: 'style_boundary_sync', prefix: '补文风边界', priority: '优先修文风边界', countKeys: ['missed_count', 'missedCount'] },
    { type: 'style_sample_sync', prefix: '校风格', priority: '优先校风格', countKeys: ['missed_count', 'missedCount', 'copy_risk_count', 'copyRiskCount'] },
    { type: 'innovation_sync', prefix: '补创新', priority: '优先补创新', countKeys: ['missed_count', 'missedCount'] },
    { type: 'volume_beat_sync', prefix: '补爆点', priority: '优先补爆点', countKeys: ['missed_count', 'missedCount'] },
    { type: 'governance_recheck_sync', prefix: '验恢复依据', priority: '优先验恢复依据', countKeys: ['missed_count', 'missedCount'] },
    { type: 'readability_review', prefix: '调可读性', priority: '优先调可读性', countKeys: ['risk_count', 'riskCount'] },
  ]
  const latestByType = new Map<string, any>()
  for (const review of asArray(reviews)) {
    const type = String(review?.review_type || '')
    if (!rules.some(rule => rule.type === type) && type !== 'storyline_sync' && type !== 'prose_quality' && type !== 'asset_intake' && type !== 'ip_scene_intake') continue
    const payload = reviewPayloadForType(review, type)
    if (!reviewBelongsToChapter(review, payload, previousChapter)) continue
    const existing = latestByType.get(type)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByType.set(type, { review, payload })
    }
  }

  const riskRows: Array<{
    count: number
    item: string
    priorityLabel: string
    evidence: string[]
    sourceReviewId: any
    openingActions?: string[]
    middleActions?: string[]
    endingActions?: string[]
    forbiddenRepeats?: string[]
  }> = []
  const previousChapterDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts(previousChapter?.raw_payload || previousChapter?.rawPayload || {})
  const previousChapterDeliveryRiskRows = asArray(previousChapterDeliveryReceipts?.delivery_risk_receipts)
    .map((receipt: any) => {
      const delivered = normalizeDeliveryRiskReceiptDelivered(receipt?.delivered)
      const remainingRisk = compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
      if (delivered && !remainingRisk) return null
      const riskItem = compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label, '上一章交稿风险')
      const requiredAction = compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action)
      const evidence = uniqueBriefStrings([
        requiredAction,
        remainingRisk,
        receipt?.evidence,
        receipt?.changed_evidence,
        receipt?.changedEvidence,
      ], 8)
      return {
        count: 1,
        item: `复核承接：${riskItem}`,
        priorityLabel: '优先复核承接',
        evidence: evidence.length ? evidence : [riskItem],
        openingActions: [
          `已存回执开篇承接：前300字先执行上一章 delivery_risk_receipts 的 required_action，把未交付风险转成当前场景目标、追证压力或阻碍；${requiredAction || evidence[0] || riskItem}`,
        ],
        middleActions: [
          `已存回执中段兑现：中段必须把上一章 required_action/remaining_risk 写成可见行动、证据变化、角色选择或关系变化，不能只声明已处理；${requiredAction || evidence[0] || riskItem}；${remainingRisk || ''}`,
        ],
        endingActions: [
          `已存回执章尾复核：章尾检查上一章 delivery_risk_receipts 是否闭环，并把剩余风险转成新状态、余波或下一章钩子；${remainingRisk || evidence[0] || riskItem}`,
        ],
        sourceReviewId: null,
      }
    })
    .filter(Boolean)
  riskRows.push(...previousChapterDeliveryRiskRows)
  for (const rule of rules) {
    const entry = latestByType.get(rule.type)
    if (!entry) continue
    const payload = entry.payload || {}
    const count = deliveryRiskCountFromPayload(payload, rule.countKeys)
    if (count <= 0 || String(payload?.status || '').toLowerCase() === 'ok') continue
    if (rule.type === 'core_contract_sync') {
      const coreContractEvidence = deliveryRiskEvidence(payload)
      riskRows.push({
        count,
        item: `创作契约：核心承诺缺口 ${count}`,
        priorityLabel: '优先修创作契约',
        evidence: coreContractEvidence,
        openingActions: [
          `创作契约开篇修复：前300字必须先把核心承诺、核心冲突或不得漂移红线压回当前事件；${coreContractEvidence[0] || '先把核心承诺缺口变成开篇可见压力。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用现场判定、角色选择、冲突结果、规则反制或读者回报兑现核心承诺；${coreContractEvidence[0] || '把核心契约写成中段事件结果。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：章尾必须继续服务核心承诺，并转成主线推进或下一章新问题；${coreContractEvidence[0] || '章尾继续强化核心承诺。'}`,
        ],
        sourceReviewId: entry.review?.id || null,
      })
      continue
    }
    if (rule.type === 'chapter_attraction_review') {
      const attractionEvidence = deliveryRiskEvidence(payload)
      const attractionOpeningEvidence = attractionEvidence.find((item: string) => /开篇|开头|钩子|第一幕|直接接住/i.test(item))
      const attractionEndingEvidence = attractionEvidence.find((item: string) => /章末|结尾|翻页|身份问题|下一章|钩子/i.test(item))
      riskRows.push({
        count,
        item: makeDeliveryRiskItem(rule.prefix, payload, count),
        priorityLabel: compactBriefText(payload?.priority_repair || payload?.priorityRepair || payload?.priority_label || payload?.priorityLabel, '优先修章节吸引力'),
        evidence: attractionEvidence,
        openingActions: [
          `吸引力开篇修复：前300字先处理 chapter_attraction_review 的开篇钩子、强目标或异常触发，让读者立刻知道本章问题；${attractionOpeningEvidence || attractionEvidence[0] || '开篇先补章节吸引力。'}`,
        ],
        middleActions: [
          `吸引力中段修复：中段必须把吸引力缺口写成目标、阻碍、转折、回报或可复述场面，不能停在说明；${attractionEvidence[0] || '中段用事件变化补章节吸引力。'}`,
        ],
        endingActions: [
          `吸引力章尾修复：章尾按 chapter_attraction_review 的章末翻页/身份问题/下一章拉力收束，留下可追读问题；${attractionEndingEvidence || attractionEvidence[0] || '章尾补足翻页吸引力。'}`,
        ],
        sourceReviewId: entry.review?.id || null,
      })
      continue
    }
    if (rule.type === 'innovation_sync') {
      const innovationEvidence = deliveryRiskEvidence(payload)
      const innovationContrastEvidence = innovationEvidence.find((item: string) => /创新|规则反差|新鲜|差异|机制|反差/i.test(item))
      riskRows.push({
        count,
        item: makeDeliveryRiskItem(rule.prefix, payload, count),
        priorityLabel: '优先补创新',
        evidence: innovationEvidence,
        openingActions: [
          `创新开篇修复：前300字先把 innovation_sync 的创新缺口转成可见机制、规则反差或异常场面，避免只换名词；${innovationContrastEvidence || innovationEvidence[0] || '开篇先亮出创新机制。'}`,
        ],
        middleActions: [
          `创新中段修复：中段必须让规则反差或差异机制参与行动、阻碍、反制或读者回报，形成可复述桥段；${innovationContrastEvidence || innovationEvidence[0] || '中段把创新写成事件机制。'}`,
        ],
        endingActions: [
          `创新章尾修复：章尾复核创新点是否改变状态或抛出新问题，让创新机制继续拉动下一章；${innovationEvidence[0] || '章尾用创新机制留下新拉力。'}`,
        ],
        sourceReviewId: entry.review?.id || null,
      })
      continue
    }
    const priorityLabel = compactBriefText(
      payload?.priority_repair || payload?.priorityRepair || payload?.priority_label || payload?.priorityLabel,
      rule.type === 'reader_expectation_sync' && Number(payload?.opening_handoff_missed_count || payload?.openingHandoffMissedCount || 0) > 0
        ? '优先修开篇'
        : rule.priority || '优先复盘上一章',
    )
    const evidence = deliveryRiskEvidence(payload)
    const stagedActions = genericSyncRiskStagedActions(rule.type, evidence)
    riskRows.push({
      count,
      item: makeDeliveryRiskItem(rule.prefix, payload, count),
      priorityLabel,
      evidence,
      openingActions: stagedActions.openingActions,
      middleActions: stagedActions.middleActions,
      endingActions: stagedActions.endingActions,
      sourceReviewId: entry.review?.id || null,
    })
  }
  const storylineEntry = latestByType.get('storyline_sync')
  if (storylineEntry) {
    const payload = storylineEntry.payload || {}
    const count = Number(payload?.missed_count || payload?.missedCount || asArray(payload?.missed).length)
      + Number(payload?.unplanned_count || payload?.unplannedCount || asArray(payload?.unplanned).length)
      + Number(payload?.forbidden_count || payload?.forbiddenCount || asArray(payload?.forbidden_touched || payload?.forbiddenTouched).length)
    if (count > 0 && String(payload?.status || '').toLowerCase() !== 'ok') {
      const evidence = deliveryRiskEvidence(payload)
      const stagedActions = genericSyncRiskStagedActions('storyline_sync', evidence)
      riskRows.push({
        count,
        item: makeDeliveryRiskItem('校剧情线', payload, count),
        priorityLabel: '优先校剧情线',
        evidence,
        openingActions: stagedActions.openingActions,
        middleActions: stagedActions.middleActions,
        endingActions: stagedActions.endingActions,
        sourceReviewId: storylineEntry.review?.id || null,
      })
    }
  }
  const assetIntakeEntry = latestByType.get('asset_intake')
  if (assetIntakeEntry && String(assetIntakeEntry.review?.status || assetIntakeEntry.payload?.status || '').toLowerCase() !== 'applied') {
    const pendingAssets = pendingAssetIntakeRisks(assetIntakeEntry.payload || {})
    if (pendingAssets.length > 0) {
      const assetEvidence = uniqueBriefStrings(pendingAssets
        .flatMap((item: any) => [
          item.fix,
          `${item.type}：${item.name}${item.summary ? `｜${item.summary}` : ''}`,
          item.evidence,
        ])
        .filter(Boolean), 10)
      const assetOpeningEvidence = assetEvidence.find((item: string) => /出场|站在|门口|新资产|角色|item|character|钥匙|掌握/i.test(item))
      const assetMiddleEvidence = assetEvidence.find((item: string) => /状态、归属、限制或关系变化|状态|归属|限制|关系变化|触发|广播/i.test(item))
      const assetEndingEvidence = assetEvidence.find((item: string) => /钥匙|编号|限制|不要反向改写|暂不使用|状态/i.test(item))
      riskRows.push({
        count: pendingAssets.length,
        item: `新资产入库：待确认 ${pendingAssets.length}`,
        priorityLabel: '优先确认新资产',
        evidence: assetEvidence,
        openingActions: [
          `新资产开篇确认：前300字先承认 asset_intake 中待确认资产已经出场，点明名称、类型和当下可见状态，不能当作未出现；${assetOpeningEvidence || assetEvidence[0] || '开篇先确认新资产。'}`,
        ],
        middleActions: [
          `新资产中段挂钩：中段必须让新资产参与目标、阻碍、证据、状态、归属、限制或关系变化，避免只做名词备案；${assetMiddleEvidence || assetEvidence[0] || '中段把新资产挂到冲突推进。'}`,
        ],
        endingActions: [
          `新资产章尾固化：章尾复核新资产的状态、归属、限制或后续用途，若暂不使用也不能反向改写，并留下可追踪状态；${assetEndingEvidence || assetEvidence[0] || '章尾固化新资产状态。'}`,
        ],
        sourceReviewId: assetIntakeEntry.review?.id || null,
      })
    }
  }
  const ipSceneIntakeEntry = latestByType.get('ip_scene_intake')
  if (ipSceneIntakeEntry && String(ipSceneIntakeEntry.review?.status || ipSceneIntakeEntry.payload?.status || '').toLowerCase() !== 'applied') {
    const pendingScenes = pendingIpSceneIntakeRisks(ipSceneIntakeEntry.payload || {})
    if (pendingScenes.length > 0) {
      const ipSceneEvidence = uniqueBriefStrings(pendingScenes
        .flatMap((item: any) => [
          item.fix,
          item.visualHook ? `强画面：${item.title}｜${item.visualHook}` : '',
          item.adaptationValue ? `改编价值：${item.adaptationValue}` : '',
          item.spreadPoint ? `传播点：${item.spreadPoint}` : '',
          item.summary,
          item.evidence,
          item.sourceExcerpt,
          item.tags?.length ? `标签：${item.tags.join('、')}` : '',
        ])
        .filter(Boolean), 10)
      const ipSceneOpeningEvidence = ipSceneEvidence.find((item: string) => /强画面|视觉|黑暗|玻璃|门槛白线|画面/i.test(item))
      const ipSceneMiddleEvidence = ipSceneEvidence.find((item: string) => /行动、冲突或章末钩子|行动|冲突|边界|救不救|规则/i.test(item))
      const ipSceneEndingEvidence = ipSceneEvidence.find((item: string) => /改编价值|短剧|第一集结尾|传播点|评论区|章末|钩子/i.test(item))
      riskRows.push({
        count: pendingScenes.length,
        item: `IP场面延展：待延展 ${pendingScenes.length}`,
        priorityLabel: '优先延展IP场面',
        evidence: ipSceneEvidence,
        openingActions: [
          `IP场面开篇延展：前300字先回声 ip_scene_candidates 的 visual_hook/强画面，把视觉记忆落到当前场景空间和异常上；${ipSceneOpeningEvidence || ipSceneEvidence[0] || '开篇先延展IP强画面。'}`,
        ],
        middleActions: [
          `IP场面中段调度：中段必须把 IP 场面转成新的行动、冲突或章末钩子，利用规则边界、人物站位、证据变化或选择压力推进剧情；${ipSceneMiddleEvidence || ipSceneEvidence[0] || '中段把IP场面写成行动调度。'}`,
        ],
        endingActions: [
          `IP场面章尾放大：章尾按 adaptation_value/spread_point 留下短剧、漫剧或传播友好的翻页画面，不能机械复述上一章；${ipSceneEndingEvidence || ipSceneEvidence[0] || '章尾放大IP场面的改编钩子。'}`,
        ],
        sourceReviewId: ipSceneIntakeEntry.review?.id || null,
      })
    }
  }
  const readabilityEntry = latestByType.get('readability_review')
  if (readabilityEntry) {
    const aiSmellRisk = readabilityAiSmellRisks(readabilityEntry.payload || {})
    if (aiSmellRisk) {
      const aiSmellOpeningEvidence = aiSmellRisk.evidence.find((item: string) => /动作|具体物件|抽象心理|心理|可见/i.test(item))
      const aiSmellEndingEvidence = aiSmellRisk.evidence.find((item: string) => /他知道|这只是开始|章末|总结|收束|反转|新证据/i.test(item))
      riskRows.push({
        count: aiSmellRisk.count,
        item: aiSmellRisk.item,
        priorityLabel: aiSmellRisk.priorityLabel,
        evidence: aiSmellRisk.evidence,
        openingActions: [
          `可读性开篇去AI味：前300字先执行 readability_review.ai_smell 的 rewrite_tactics，用可见动作、具体物件、短对白或现场反应替代抽象心理和解释腔；${aiSmellOpeningEvidence || aiSmellRisk.evidence[0] || '开篇先去除 AI 味。'}`,
        ],
        middleActions: [
          `可读性中段去AI味：中段必须把 pattern_hits 暴露的套话改成行动推进、信息变化、关系变化或具体物件反馈，不能继续抽象总结；${aiSmellOpeningEvidence || aiSmellRisk.evidence[0] || '中段用具体事件替代 AI 味表达。'}`,
        ],
        endingActions: [
          `可读性章尾去AI味：章尾复核“他知道，这只是开始”等总结体、作者预告和抽象升华不再复现，用现场反转、新证据或新阻碍收束；${aiSmellEndingEvidence || aiSmellRisk.evidence[0] || '章尾用故事内后果替代总结体。'}`,
        ],
        sourceReviewId: readabilityEntry.review?.id || null,
      })
    }
  }
  const proseQualityEntry = latestByType.get('prose_quality')
  if (proseQualityEntry) {
    const nextChapterPlanRisks = proseQualityNextChapterPlanRisks(proseQualityEntry.payload || {})
    if (nextChapterPlanRisks) {
      riskRows.push({
        count: nextChapterPlanRisks.count,
        item: `质量续航：下一章计划 ${nextChapterPlanRisks.count}`,
        priorityLabel: '优先执行质量续航',
        evidence: [
          ...nextChapterPlanRisks.qualityFocus,
          ...nextChapterPlanRisks.endingContractEvidence,
          ...nextChapterPlanRisks.avoidRepetition,
          ...nextChapterPlanRisks.evidenceBasis,
        ].slice(0, 8),
        openingActions: [
          ...nextChapterPlanRisks.endingContractOpeningActions,
          ...nextChapterPlanRisks.openingActions,
        ],
        middleActions: [
          ...nextChapterPlanRisks.endingContractMiddleActions,
          ...nextChapterPlanRisks.middleActions,
        ],
        endingActions: [
          ...nextChapterPlanRisks.endingContractEndingActions,
          ...nextChapterPlanRisks.endingActions,
        ],
        forbiddenRepeats: nextChapterPlanRisks.avoidRepetition,
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const receiptRisks = proseQualityRevisionReceiptRisks(proseQualityEntry.payload || {})
    if (receiptRisks.length > 0) {
      const revisionReceiptEvidence = uniqueBriefStrings(receiptRisks
        .flatMap((item: any) => [
          item.risk,
          item.evidence,
        ])
        .filter(Boolean), 8)
      const revisionReceiptRiskEvidence = revisionReceiptEvidence.find((item: string) => /证据|补证据|动机|局势|状态|下一章/i.test(item))
      riskRows.push({
        count: receiptRisks.length,
        item: `复核修订：修订残留 ${receiptRisks.length}`,
        priorityLabel: '优先复核修订',
        evidence: revisionReceiptEvidence,
        openingActions: [
          `复核修订开篇修复：前300字先承接 revision_receipts 的 remaining_risk，把上一章修订后仍悬空的问题转成当前场景目标或阻碍；${revisionReceiptEvidence[0] || '开篇先复核修订残留。'}`,
        ],
        middleActions: [
          `复核修订中段修复：中段必须补证据、动机、行动后果或局势变化，让 revision_receipts 的残留风险有可定位正文证据；${revisionReceiptRiskEvidence || revisionReceiptEvidence[0] || '中段补足修订后的正文证据。'}`,
        ],
        endingActions: [
          `复核修订章尾修复：章尾复核 remaining_risk 是否清零，并把修订后的新状态、新压力或下一章问题落到正文；${revisionReceiptRiskEvidence || revisionReceiptEvidence[0] || '章尾确认修订残留闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const revisionReceiptCheckRisks = proseQualityRevisionReceiptCheckRisks(proseQualityEntry.payload || {})
    if (revisionReceiptCheckRisks.length > 0) {
      const revisionReceiptCheckEvidence = uniqueBriefStrings(revisionReceiptCheckRisks
        .flatMap((item: any) => [
          item.action,
          item.required_action,
          item.fix,
          item.remaining_risk,
          item.changed_evidence,
          item.evidence,
        ])
        .filter(Boolean), 8)
      const revisionReceiptSegmentEvidence = revisionReceiptCheckEvidence.find((item: string) => /repair_segment|middle|中段|动作|破局|权限/i.test(item))
      const revisionReceiptChangedEvidence = revisionReceiptCheckEvidence.find((item: string) => /changed_evidence|changedEvidence|证据|回执/i.test(item))
      riskRows.push({
        count: revisionReceiptCheckRisks.length,
        item: `修订回执检查：检查缺口 ${revisionReceiptCheckRisks.length}`,
        priorityLabel: '优先复核修订',
        evidence: revisionReceiptCheckEvidence,
        openingActions: [
          `修订回执检查开篇修复：前300字先核对 revision_receipt_checks 的 required_action、applied_fix 和上一章已改内容，把缺口转成当前场景目标或阻碍；${revisionReceiptCheckEvidence[0] || '开篇先复核修订回执缺口。'}`,
        ],
        middleActions: [
          `修订回执检查中段修复：按 repair_segment/required_action 把缺口写成可定位动作、证据变化或权限变化，不能只写“已解决”；${revisionReceiptSegmentEvidence || revisionReceiptCheckEvidence[0] || '中段把修订回执落成可见事件。'}`,
        ],
        endingActions: [
          `修订回执检查章尾修复：章尾必须回填 changed_evidence 并复核 remaining_risk 是否清零，留下修订后的状态变化或下一章问题；${revisionReceiptChangedEvidence || revisionReceiptCheckEvidence[0] || '章尾确认修订回执闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const revisionContextRisks = proseQualityRevisionContextRisks(proseQualityEntry.payload || {})
    if (revisionContextRisks.length > 0) {
      const revisionContextEvidence = uniqueBriefStrings(revisionContextRisks
        .flatMap((item: any) => [item.fix, item.evidence, item.key, item.label])
        .filter(Boolean), 8)
      const revisionContextOpeningEvidence = revisionContextEvidence.find((item: string) => /开篇|归属|旧印章|同步|半枚|next_chapter_context/i.test(item))
      const revisionContextBoundaryEvidence = revisionContextEvidence.find((item: string) => /边界|角色卡|有限作证|无条件|character_cards/i.test(item))
      const revisionContextKeyEvidence = revisionContextEvidence.find((item: string) => /next_chapter_context|character_cards|timeline|foreshadowing|上下文/i.test(item))
      riskRows.push({
        count: revisionContextRisks.length,
        item: `修订上下文：上下文缺口 ${revisionContextRisks.length}`,
        priorityLabel: '优先复核修订上下文',
        evidence: revisionContextEvidence,
        openingActions: [
          `修订上下文开篇修复：前300字先同步 revision_context_receipts 指出的归属、时间线、角色状态或后续章节衔接，不能沿用修订前版本；${revisionContextOpeningEvidence || revisionContextEvidence[0] || '开篇先同步修订上下文。'}`,
        ],
        middleActions: [
          `修订上下文中段修复：中段按 evidence/fix 维持角色边界、资产归属和情节因果，把上下文差异写成可见选择或限制；${revisionContextBoundaryEvidence || revisionContextEvidence[0] || '中段把上下文修复落成行动限制。'}`,
        ],
        endingActions: [
          `修订上下文章尾修复：章尾按 revision_context_receipts 的 key 复核 next_chapter_context、character_cards 等衔接项是否闭环，并留下新状态或下一章钩子；${revisionContextKeyEvidence || revisionContextEvidence[0] || '章尾确认修订上下文闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const findings = proseQualityHighSeverityFindings(proseQualityEntry.payload || {})
    if (findings.length > 0) {
      const findingRawEvidence = uniqueBriefStrings(findings.map((item: any) => item.evidence), 8)
      const findingEvidence = uniqueBriefStrings([
        ...findings.map((item: any) => item.fix),
        ...findings.map((item: any) => item.evidence),
        ...findings.map((item: any) => [item.severity, item.category].filter(Boolean).join(' ')),
      ], 8)
      const openingFindingEvidence = findingEvidence.find((item: string) => /开篇|前300|前三百|主角|追查|验证|身份|目标|冲突/i.test(item))
      const middleFindingEvidence = findingEvidence.find((item: string) => /证据|阻拦|阻碍|行动|选择|信息|关系|追问|来历/i.test(item))
      const endingFindingEvidence = uniqueBriefStrings([...findingRawEvidence, ...findingEvidence], 8)
        .find((item: string) => /章末|章尾|突然消失|钩子|下一章|收束|压力|没有|没人/i.test(item))
      riskRows.push({
        count: findings.length,
        item: `复盘审稿：${findings[0]?.severity || '高危'}问题 ${findings.length}`,
        priorityLabel: findings.some((item: any) => item.severity === 'S1') ? '优先处理S1审稿问题' : '优先处理S2审稿问题',
        evidence: findingEvidence,
        openingActions: [
          `复盘审稿开篇修复：前300字先执行 S1/S2 finding 的 fix，把高危问题转成当前场景目标、冲突或调查动作；${openingFindingEvidence || findingEvidence[0] || '开篇先处理高危审稿问题。'}`,
        ],
        middleActions: [
          `复盘审稿中段修复：按 finding evidence 补正文证据、阻碍升级、信息变化或角色选择，不能只口头声明已修；${middleFindingEvidence || findingEvidence[0] || '中段把高危问题写成可见证据。'}`,
        ],
        endingActions: [
          `复盘审稿章尾修复：章尾复核上一章 S1/S2 evidence 不再复现，并把修复结果转成新压力、状态变化或下一章钩子；${endingFindingEvidence || findingEvidence[0] || '章尾确认高危问题不再残留。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const qualityGateFailureRisks = proseQualityGateFailureRisks(proseQualityEntry.payload || {})
    if (qualityGateFailureRisks.length > 0) {
      const hasLowQualityGateScore = qualityGateFailureRisks.some((item: any) => {
        const itemScore = Number(item?.score)
        const itemThreshold = Number(item?.threshold)
        return Number.isFinite(itemScore) && Number.isFinite(itemThreshold) && itemScore < itemThreshold
      })
      const qualityGateEvidence = uniqueBriefStrings(qualityGateFailureRisks
        .flatMap((item: any) => {
          const itemScore = Number(item?.score)
          const itemThreshold = Number(item?.threshold)
          const scoreEvidence = Number.isFinite(itemScore) && Number.isFinite(itemThreshold)
            ? itemScore < itemThreshold
              ? `质量分 ${item.score} 低于 ${item.threshold}`
              : `质量门禁评分 ${item.score}，阈值 ${item.threshold}`
            : ''
          return [
            item.fix,
            item.evidence,
            item.category,
            scoreEvidence,
          ]
        })
        .filter(Boolean), 8)
      const qualityGateOpeningEvidence = qualityGateEvidence.find((item: string) => /开篇|前300|前三百|冲突|触发|对抗|目标/i.test(item))
      const qualityGateMiddleEvidence = qualityGateEvidence.find((item: string) => /背景|证据|冲突|短周期|回报|角色选择|可见|信息变化/i.test(item))
      const qualityGateEndingEvidence = qualityGateEvidence.find((item: string) => /质量分|低于|阈值|章末|章尾|读者回报|复核/i.test(item))
      riskRows.push({
        count: qualityGateFailureRisks.length,
        item: `质量门禁：${hasLowQualityGateScore ? '低分未过' : '门禁未过'} ${qualityGateFailureRisks.length}`,
        priorityLabel: '优先修质量门禁',
        evidence: qualityGateEvidence,
        openingActions: [
          `质量门禁开篇修复：前300字先执行 prose_quality 失败项，把低分原因转成清晰冲突、可见目标或对抗触发；${qualityGateOpeningEvidence || qualityGateEvidence[0] || '开篇先补质量门禁缺口。'}`,
        ],
        middleActions: [
          `质量门禁中段修复：按失败 evidence 补短周期回报、可见角色选择、信息变化或冲突升级，不能继续背景说明和低密度推进；${qualityGateMiddleEvidence || qualityGateEvidence[0] || '中段把质量门禁缺口写成事件变化。'}`,
        ],
        endingActions: [
          `质量门禁章尾修复：章尾按质量分和阈值复核本章是否过门禁，必须给出可复核读者回报、新压力或下一章钩子；${qualityGateEndingEvidence || qualityGateEvidence[0] || '章尾确认质量门禁修复结果。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const fiveDimensionRisks = proseQualityFiveDimensionRisks(proseQualityEntry.payload || {})
    if (fiveDimensionRisks.length > 0) {
      const fiveDimensionEvidence = uniqueBriefStrings([
        ...fiveDimensionRisks.map((item: any) => item.fix),
        ...fiveDimensionRisks.map((item: any) => item.evidence),
        ...fiveDimensionRisks.map((item: any) => item.key),
        ...fiveDimensionRisks.map((item: any) => `${item.label} ${item.score}分`),
      ], 8)
      const coreDimensionEvidence = fiveDimensionEvidence.find((item: string) => /core_consistency|核心一致度|核心冲突|正面冲突|读者回报|守规救人/i.test(item))
      const surfaceDimensionEvidence = fiveDimensionEvidence.find((item: string) => /surface_rewrite|readability|表层重写度|可读性|AI 腔|解释腔|总结|句式|他知道/i.test(item))
      const logicDimensionEvidence = fiveDimensionEvidence.find((item: string) => /format_consistency|logic_coherence|格式一致度|逻辑连贯|因果|现场证据|动作反转|状态变化|线索/i.test(item))
      riskRows.push({
        count: fiveDimensionRisks.length,
        item: `质量五维：低分维度 ${fiveDimensionRisks.length}`,
        priorityLabel: fiveDimensionRisks.some((item: any) => item.strategy === 'de_ai') ? '优先修可读性' : '优先修五维质量',
        evidence: fiveDimensionEvidence,
        openingActions: [
          `质量五维开篇修复：前300字先处理 core_consistency/核心一致度低分，把核心冲突、规则压力和读者回报压回当前事件；${coreDimensionEvidence || fiveDimensionEvidence[0] || '开篇先把五维低分转成核心冲突。'}`,
        ],
        middleActions: [
          `质量五维中段修复：按 surface_rewrite/readability 低分清理总结腔、解释腔和 AI 腔，把静态说明改成动作、短对白、信息变化或关系变化；${surfaceDimensionEvidence || fiveDimensionEvidence[0] || '中段修复五维低分暴露的可读性问题。'}`,
        ],
        endingActions: [
          `质量五维章尾修复：按 logic_coherence/readability 低分检查因果、状态变化和收束方式，章尾必须用现场证据、动作反转或新压力收束；${logicDimensionEvidence || surfaceDimensionEvidence || fiveDimensionEvidence[0] || '章尾确认五维修复后的状态变化。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const deliveryRiskReceiptRisks = proseQualityDeliveryRiskReceiptRisks(proseQualityEntry.payload || {})
    if (deliveryRiskReceiptRisks.length > 0) {
      const deliveryReceiptEvidence = uniqueBriefStrings(deliveryRiskReceiptRisks
        .flatMap((item: any) => [
          item.required_action,
          item.remaining_risk,
          item.risk_item,
          item.evidence,
          item.repair_segment,
        ])
        .filter(Boolean), 8)
      const openingReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /opening_actions|开篇|章首|前300|前三百|追查|承接|目标/i.test(item))
      const middleReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /middle_actions|中段|事件推进|只写|环境|证据|改变|行动|信息|关系/i.test(item))
      const endingReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /ending_actions|章末|章尾|最后300|remaining_risk|剩余|仍|未|没有|缺口|残留|新风险|钩子|余波/i.test(item))
      riskRows.push({
        count: deliveryRiskReceiptRisks.length,
        item: `复核承接：承接残留 ${deliveryRiskReceiptRisks.length}`,
        priorityLabel: '优先复核承接',
        evidence: deliveryReceiptEvidence,
        openingActions: [
          `复核承接开篇修复：前300字按 delivery_risk_receipts 的 risk_item/required_action 补可见承接，不能只声明已处理；${openingReceiptEvidence || deliveryReceiptEvidence[0] || '开篇先修未闭环承接回执。'}`,
        ],
        middleActions: [
          `复核承接中段修复：按 remaining_risk 和 repair_segment 写成中段事件推进、证据变化、角色选择或关系变化，避免继续空转；${middleReceiptEvidence || deliveryReceiptEvidence[0] || '中段把承接残留写成事件变化。'}`,
        ],
        endingActions: [
          `复核承接章尾修复：章尾复核 delivery_risk_receipts 的 remaining_risk 是否归零，并留下新风险、状态余波或下一章钩子；${endingReceiptEvidence || deliveryReceiptEvidence[0] || '章尾确认承接回执闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const serialRiskRepairRisks = proseQualitySerialRiskRepairRisks(proseQualityEntry.payload || {})
    if (serialRiskRepairRisks.length > 0) {
      const serialRiskRepairEvidence = serialRiskRepairRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.risk_type,
          item.repair_receipt,
          item.continuity_change,
          item.state_change,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: serialRiskRepairRisks.length,
        item: `近章风险修复：修复缺口 ${serialRiskRepairRisks.length}`,
        priorityLabel: '优先修近章风险',
        evidence: serialRiskRepairEvidence,
        openingActions: [
          `近章风险修复开篇修复：前300字先回应 serial_risk_repair_checks 指出的 risk_type/repair_receipt，把上一章未落成风险转成当前场景明确目标或阻碍；${serialRiskRepairEvidence[0] || '开篇先把近章风险修复落成目标推进。'}`,
        ],
        middleActions: [
          `近章风险修复中段修复：按 repair_receipt 和 continuity_change 写成目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却，必须有可见事件证据；${serialRiskRepairEvidence[0] || '中段把修复写成事件变化。'}`,
        ],
        endingActions: [
          `近章风险修复章尾修复：检查 state_change 和 remaining_risk，章尾必须给出状态变化后的新压力或下一章问题，不能只复述旧风险；${serialRiskRepairEvidence[0] || '章尾确认修复后的状态变化。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const revisionDirectiveRisks = proseQualityRevisionDirectiveRisks(proseQualityEntry.payload || {})
    if (revisionDirectiveRisks.length > 0) {
      const revisionDirectiveEvidence = uniqueBriefStrings(revisionDirectiveRisks, 8)
      const coreDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /ten_chapter_selling_point|核心卖点|能力使用|规则限制|读者回报/i.test(item))
      const compressionDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /压缩|环境描写|不推动剧情|节奏|空泛/i.test(item))
      const hookDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /章末|新期待|钩子|下一章|追读/i.test(item))
      riskRows.push({
        count: revisionDirectiveRisks.length,
        item: `修订指令：明确指令 ${revisionDirectiveRisks.length}`,
        priorityLabel: '优先执行修订指令',
        evidence: revisionDirectiveEvidence,
        openingActions: [
          `修订指令开篇修复：前300字先执行 revision_directives 中的核心卖点、能力使用、规则限制或读者回报指令，把修订目标写成当前场景压力；${coreDirectiveEvidence || revisionDirectiveEvidence[0] || '开篇先把修订指令落成可见目标。'}`,
        ],
        middleActions: [
          `修订指令中段修复：按 revision_directives 压缩不推动剧情、信息或情绪变化的环境描写，改成行动、选择、信息变化或关系变化；${compressionDirectiveEvidence || revisionDirectiveEvidence[0] || '中段用事件推进执行修订指令。'}`,
        ],
        endingActions: [
          `修订指令章尾修复：检查 revision_directives 的章末新期待、钩子或读者回报，章尾必须留下故事内新问题、代价或追读压力；${hookDirectiveEvidence || revisionDirectiveEvidence[0] || '章尾把修订指令转成下一章拉力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const focusedRevisionModeRisks = proseQualityFocusedRevisionModeRisks(proseQualityEntry.payload || {})
    if (focusedRevisionModeRisks.length > 0) {
      const focusedRevisionEvidence = uniqueBriefStrings([
        ...focusedRevisionModeRisks.map((item: any) => item.fix),
        ...focusedRevisionModeRisks.map((item: any) => item.mode),
        ...focusedRevisionModeRisks.map((item: any) => item.label),
      ], 8)
      const actionModeEvidence = focusedRevisionEvidence.find((item: string) => /expand_action|add_consequence|repair_setting_violation|动作链|行动后果|设定/i.test(item))
      const compressionModeEvidence = focusedRevisionEvidence.find((item: string) => /cut_description|tighten_pacing|环境描写|事件密度|节奏/i.test(item))
      const hookModeEvidence = focusedRevisionEvidence.find((item: string) => /restore_hook|章末钩子|下一章推动力|钩子/i.test(item))
      riskRows.push({
        count: focusedRevisionModeRisks.length,
        item: `定向修订：修订模式 ${focusedRevisionModeRisks.length}`,
        priorityLabel: '优先执行定向修订',
        evidence: focusedRevisionEvidence,
        openingActions: [
          `定向修订开篇修复：前300字先执行 focused_revision_modes 的 expand_action/add_consequence/repair_setting_violation，把上一章问题写成动作链、代价或设定边界；${actionModeEvidence || focusedRevisionEvidence[0] || '开篇先把定向修订落成可见动作。'}`,
        ],
        middleActions: [
          `定向修订中段修复：按 cut_description/tighten_pacing 压缩不推动剧情的环境描写，提高事件密度，让每个场景都有行动、选择、信息或关系变化；${compressionModeEvidence || focusedRevisionEvidence[0] || '中段用事件推进完成定向修订。'}`,
        ],
        endingActions: [
          `定向修订章尾修复：按 restore_hook 和 remaining_risk 保留章末钩子，把修订结果转成下一章新问题、代价或追读压力；${hookModeEvidence || focusedRevisionEvidence[0] || '章尾把定向修订转成下一章拉力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const craftMetricRisks = proseQualityCraftMetricRisks(proseQualityEntry.payload || {})
    if (craftMetricRisks.length > 0) {
      const craftMetricEvidence = uniqueBriefStrings([
        ...craftMetricRisks.map((item: any) => item.fix),
        ...craftMetricRisks.map((item: any) => item.key),
        ...craftMetricRisks.map((item: any) => item.label),
        ...craftMetricRisks.map((item: any) => item.evidence),
        ...craftMetricRisks.map((item: any) => Number.isFinite(Number(item.score)) ? `${item.key} ${item.score}，阈值 ${item.threshold}` : ''),
      ], 8)
      const actionMetricEvidence = craftMetricEvidence.find((item: string) => /action_detail_score|combat_process_score|动作细节|战斗过程/i.test(item))
      const densityMetricEvidence = craftMetricEvidence.find((item: string) => /event_density_score|description_overuse_score|事件密度|环境描写过量/i.test(item))
      const settingMetricEvidence = craftMetricEvidence.find((item: string) => /setting_consistency_score|设定一致性/i.test(item))
      riskRows.push({
        count: craftMetricRisks.length,
        item: `正文工艺指标：指标风险 ${craftMetricRisks.length}`,
        priorityLabel: '优先修正文工艺指标',
        evidence: craftMetricEvidence,
        openingActions: [
          actionMetricEvidence
            ? `正文工艺指标开篇修复：前300字先处理 action_detail_score/combat_process_score，写出起手、反应、空间变化、受伤或资源损耗、反制和结果；${actionMetricEvidence}`
            : `正文工艺指标开篇修复：前300字先把 craft_metrics 指标风险转成可见动作链或现场压力；${craftMetricEvidence[0] || '开篇先把工艺风险落成可见动作。'}`,
        ],
        middleActions: [
          densityMetricEvidence
            ? `正文工艺指标中段修复：按 event_density_score/description_overuse_score 提高事件密度，压缩不推动剧情、信息或情绪变化的环境描写；${densityMetricEvidence}`
            : `正文工艺指标中段修复：中段必须让 craft_metrics 风险变成行动、选择、信息变化或关系变化，不能停在静态解释；${craftMetricEvidence[0] || '中段用事件变化修正文工艺。'}`,
        ],
        endingActions: [
          settingMetricEvidence
            ? `正文工艺指标章尾修复：按 setting_consistency_score 检查能力代价、物品归属、规则触发和角色认知边界，章尾必须留下设定一致的后果或新压力；${settingMetricEvidence}`
            : `正文工艺指标章尾修复：章尾检查 craft_metrics 残留风险，把修复结果转成明确后果、状态变化或下一章问题；${craftMetricEvidence[0] || '章尾确认正文工艺修复后的后果。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const settingViolationRisks = proseQualitySettingViolationRisks(proseQualityEntry.payload || {})
    if (settingViolationRisks.length > 0) {
      const settingViolationEvidence = uniqueBriefStrings([
        ...settingViolationRisks.map((item: any) => item.fix),
        ...settingViolationRisks.map((item: any) => item.evidence),
        ...settingViolationRisks.map((item: any) => item.key),
        ...settingViolationRisks.map((item: any) => item.label),
      ], 8)
      const settingObjectEvidence = settingViolationEvidence.find((item: string) => /setting_violations|设定违规|设定|印章|钥匙|账本|规则|资产/i.test(item))
      const settingRuleEvidence = settingViolationEvidence.find((item: string) => /能力|代价|物品归属|归属|规则触发|触发|认知边界|半枚|残留规则/i.test(item))
      const settingBoundaryEvidence = settingViolationEvidence.find((item: string) => /禁揭|不得泄露|不能提前|封存|边界|祠堂|仍在/i.test(item))
      riskRows.push({
        count: settingViolationRisks.length,
        item: `设定违规：违规风险 ${settingViolationRisks.length}`,
        priorityLabel: '优先修设定违规',
        evidence: settingViolationEvidence,
        openingActions: [
          `设定违规开篇修复：前300字先锁定 setting_violations 的设定对象、归属和可用边界，不得把上一章违规版本当成事实；${settingObjectEvidence || settingViolationEvidence[0] || '开篇先确认设定对象和可用边界。'}`,
        ],
        middleActions: [
          `设定违规中段修复：按 fix 写清能力代价、物品归属、规则触发和角色认知边界，让修复落成行动限制或反制条件；${settingRuleEvidence || settingViolationEvidence[0] || '中段把设定修复写成规则执行。'}`,
        ],
        endingActions: [
          `设定违规章尾修复：章尾复核禁揭设定、封存状态和 remaining_risk，不能提前泄露或改写设定边界；${settingBoundaryEvidence || settingViolationEvidence[0] || '章尾确认设定边界没有漂移。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const deslopRepairReceiptRisks = proseQualityDeslopRepairReceiptRisks(proseQualityEntry.payload || {})
    if (deslopRepairReceiptRisks.length > 0) {
      const deslopRepairReceiptEvidence = uniqueBriefStrings(deslopRepairReceiptRisks
        .flatMap((item: any) => [
          item.risk,
          item.gate || item.label ? `不能复现上一章残留的 ${item.gate} ${item.label} 表达问题` : '',
          item.evidence,
        ])
        .filter(Boolean), 8)
      const deslopReceiptGateEvidence = deslopRepairReceiptEvidence.find((item: string) => /Gate|gate|AI味|总结|解释腔|升华/i.test(item))
      const deslopReceiptActionEvidence = deslopRepairReceiptEvidence.find((item: string) => /现场动作|动作|对白|承接|可见/i.test(item))
      riskRows.push({
        count: deslopRepairReceiptRisks.length,
        item: `去AI味闭环：去AI味残留 ${deslopRepairReceiptRisks.length}`,
        priorityLabel: '优先去AI味',
        evidence: deslopRepairReceiptEvidence,
        openingActions: [
          `去AI味闭环开篇修复：前300字先承接 deslop_repair_receipts 的 remaining_risk，用具体动作、短对白或现场物象替代总结升华；${deslopReceiptActionEvidence || deslopRepairReceiptEvidence[0] || '开篇先处理去AI味残留。'}`,
        ],
        middleActions: [
          `去AI味闭环中段修复：中段必须把残留表达问题改成现场动作、人物选择、信息变化或关系变化，禁止抽象解释和作者预告；${deslopReceiptActionEvidence || deslopRepairReceiptEvidence[0] || '中段用事件变化替代抽象表达。'}`,
        ],
        endingActions: [
          `去AI味闭环章尾修复：章尾按 Gate A-G 和 label 复核同类表达不再复现，用可见后果或新压力收束；${deslopReceiptGateEvidence || deslopRepairReceiptEvidence[0] || '章尾确认去AI味闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const deslopRepairCheckRisks = proseQualityDeslopRepairCheckRisks(proseQualityEntry.payload || {})
    if (deslopRepairCheckRisks.length > 0) {
      const deslopRepairCheckEvidence = uniqueBriefStrings(deslopRepairCheckRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.original_risk,
          item.rewritten_evidence,
          item.changed_evidence,
          item.receipt_synced,
        ])
        .filter(Boolean), 8)
      const deslopCheckRewriteEvidence = deslopRepairCheckEvidence.find((item: string) => /rewritten_evidence|changed_evidence|短对白|动作|水迹|门卡/i.test(item))
      const deslopCheckReceiptEvidence = deslopRepairCheckEvidence.find((item: string) => /receipt_synced=false|remaining_risk|回执|Gate/i.test(item))
      riskRows.push({
        count: deslopRepairCheckRisks.length,
        item: `去AI味检查：闭环缺口 ${deslopRepairCheckRisks.length}`,
        priorityLabel: '优先去AI味',
        evidence: deslopRepairCheckEvidence,
        openingActions: [
          `去AI味检查开篇修复：前300字先执行 deslop_repair_checks 的 fix，把 Gate 残留改成可见动作、短对白或现场物象；${deslopRepairCheckEvidence[0] || '开篇先修去AI味检查缺口。'}`,
        ],
        middleActions: [
          `去AI味检查中段修复：中段必须交付 rewritten_evidence/changed_evidence 对应的事件变化，不能用“已经去AI味”替代正文证据；${deslopCheckRewriteEvidence || deslopRepairCheckEvidence[0] || '中段补可定位改写证据。'}`,
        ],
        endingActions: [
          `去AI味检查章尾修复：章尾复核 receipt_synced=false 和 remaining_risk，确认 Gate 残留不再复现并形成新的可见后果；${deslopCheckReceiptEvidence || deslopRepairCheckEvidence[0] || '章尾确认去AI味回执同步。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const qualityAuditRepairReceiptRisks = proseQualityAuditRepairReceiptRisks(proseQualityEntry.payload || {})
    if (qualityAuditRepairReceiptRisks.length > 0) {
      const qualityAuditRepairReceiptEvidence = uniqueBriefStrings(qualityAuditRepairReceiptRisks
        .flatMap((item: any) => [
          item.risk,
          item.check_key || item.label ? `下一章必须补质量诊断残留：${[item.check_key, item.label].filter(Boolean).join(' ')}` : '',
          item.strategy,
          item.evidence,
        ])
        .filter(Boolean), 8)
      const qualityAuditRepairRiskEvidence = qualityAuditRepairReceiptEvidence.find((item: string) => /remaining_risk|新阻碍|空转|局势|推进|变化/i.test(item))
      const qualityAuditRepairKeyEvidence = qualityAuditRepairReceiptEvidence.find((item: string) => /check_key|chapter_progress|质量诊断|章节推进/i.test(item))
      riskRows.push({
        count: qualityAuditRepairReceiptRisks.length,
        item: `质量诊断闭环：质量诊断残留 ${qualityAuditRepairReceiptRisks.length}`,
        priorityLabel: '优先修质量诊断',
        evidence: qualityAuditRepairReceiptEvidence,
        openingActions: [
          `质量诊断闭环开篇修复：前300字先按 quality_audit_repair_receipts 的 check_key/label 承接上一章诊断残留，把它变成当前场景阻碍或目标；${qualityAuditRepairKeyEvidence || qualityAuditRepairReceiptEvidence[0] || '开篇先承接质量诊断残留。'}`,
        ],
        middleActions: [
          `质量诊断闭环中段修复：中段必须把 remaining_risk 写成局势变化、新阻碍、行动代价或读者可见回报，证明上一章修改没有空转；${qualityAuditRepairRiskEvidence || qualityAuditRepairReceiptEvidence[0] || '中段把质量诊断残留落成事件变化。'}`,
        ],
        endingActions: [
          `质量诊断闭环章尾修复：章尾按 check_key 复核 changed_evidence 和 remaining_risk 是否闭环，并留下新的状态变化或下一章钩子；${qualityAuditRepairKeyEvidence || qualityAuditRepairReceiptEvidence[0] || '章尾确认质量诊断闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const platformRubricRisks = proseQualityPlatformRubricRisks(proseQualityEntry.payload || {})
    if (platformRubricRisks.length > 0) {
      const platformRubricEvidence = platformRubricRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.key,
          item.platform,
          item.opening_pace,
          item.payoff_density,
          item.reader_expectation,
          item.page_turn_pull,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: platformRubricRisks.length,
        item: `平台适配：平台缺口 ${platformRubricRisks.length}`,
        priorityLabel: '优先修平台适配',
        evidence: platformRubricEvidence,
        openingActions: [
          `平台适配开篇修复：前300字按 platform_checks 的 opening_pace/key 执行目标平台节奏，先给现场事件、冲突或压力，不用平台说明替代正文；${platformRubricEvidence[0] || '开篇先满足平台节奏。'}`,
        ],
        middleActions: [
          `平台适配中段修复：按 payoff_density 和 reader_expectation 提供主角反击、情绪反馈、信息收益或爽点回报，避免只分析规则；${platformRubricEvidence[0] || '中段补平台需要的回报密度。'}`,
        ],
        endingActions: [
          `平台适配章尾修复：章尾按 page_turn_pull/remaining_risk 给出下一章拉力，必须是故事内新问题、新证据或新阻碍；${platformRubricEvidence[0] || '章尾补清楚翻页拉力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const contentRubricRisks = proseQualityContentRubricRisks(proseQualityEntry.payload || {})
    if (contentRubricRisks.length > 0) {
      const contentRubricEvidence = contentRubricRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.core_selling_point,
          item.conflict_progression,
          item.chapter_change,
          item.page_turn_reason,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: contentRubricRisks.length,
        item: `内容基准：基准缺口 ${contentRubricRisks.length}`,
        priorityLabel: '优先修内容基准',
        evidence: contentRubricEvidence,
        openingActions: [
          `内容基准开篇修复：前300字先兑现 content_rubric_checks 的 core_selling_point，让当前事件立刻服务核心卖点和读者期待；${contentRubricEvidence[0] || '开篇先把核心卖点写成可见事件。'}`,
        ],
        middleActions: [
          `内容基准中段修复：按 conflict_progression 和 chapter_change 推进最小剧情循环，必须写出目标、阻碍、行动、反馈和不可删除变化；${contentRubricEvidence[0] || '中段让本章发生明确变化。'}`,
        ],
        endingActions: [
          `内容基准章尾修复：章尾必须回答 page_turn_reason，把本章改变转成下一章问题、代价或新证据，不能停在规则说明；${contentRubricEvidence[0] || '章尾给清楚翻页理由。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const titleUniquenessRisks = proseQualityTitleUniquenessRisks(proseQualityEntry.payload || {})
    if (titleUniquenessRisks.length > 0) {
      const titleUniquenessEvidence = titleUniquenessRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence, item.new_title, item.old_title])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: titleUniquenessRisks.length,
        item: `章节标题：标题缺口 ${titleUniquenessRisks.length}`,
        priorityLabel: '优先修章节标题',
        evidence: titleUniquenessEvidence,
        openingActions: [
          `章节标题开篇修复：前300字先用 old_title/new_title 对照，把新标题承诺写成差异化画面、核心事件或关键资产，不能沿用旧标题气质；${titleUniquenessEvidence[0] || '开篇先兑现新标题承诺。'}`,
        ],
        middleActions: [
          `章节标题中段修复：按 new_title 同步本章主事件、冲突转折和标题关键词，确保正文中段能证明新标题不是只改显示名；${titleUniquenessEvidence[0] || '中段让新标题对应真实事件。'}`,
        ],
        endingActions: [
          `章节标题章尾修复：检查大纲标题、文件名和正文标题行是否同步，章尾继续承接新标题的钩子或关键资产，不回到旧标题问题；${titleUniquenessEvidence[0] || '章尾同步并承接标题承诺。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const blueprintConsumptionRisks = proseQualityBlueprintConsumptionRisks(proseQualityEntry.payload || {})
    if (blueprintConsumptionRisks.length > 0) {
      const blueprintConsumptionEvidence = blueprintConsumptionRisks
        .flatMap((item: any) => [item.action, item.fix, item.missing_gap, item.delivered_evidence, item.remaining_risk])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: blueprintConsumptionRisks.length,
        item: `细纲兑现：执行缺口 ${blueprintConsumptionRisks.length}`,
        priorityLabel: '优先补细纲兑现',
        evidence: blueprintConsumptionEvidence,
        openingActions: [
          `细纲兑现开篇修复：前300字先执行 blueprint_consumption_checks 的 blueprint_field/expected，把漏掉的细纲字段变成当前场景目标、阻碍或必须兑现的动作；${blueprintConsumptionEvidence[0] || '开篇先把细纲缺口落成事件目标。'}`,
        ],
        middleActions: [
          `细纲兑现中段修复：按 expected 和 missing_gap 补齐行动、代价、收益、信息变化或关系变化，不能只写结果或概括已完成；${blueprintConsumptionEvidence[0] || '中段补齐细纲执行证据。'}`,
        ],
        endingActions: [
          `细纲兑现章尾修复：检查 remaining_risk，把未兑现的章尾承接、代价余波或下一章压力写成故事内钩子；${blueprintConsumptionEvidence[0] || '章尾补细纲承接。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const wordCountRisks = proseQualityWordCountRisks(proseQualityEntry.payload || {})
    if (wordCountRisks.length > 0) {
      const wordCountEvidence = wordCountRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: wordCountRisks.length,
        item: `字数执行：扩写缺口 ${wordCountRisks.length}`,
        priorityLabel: '优先补字数执行',
        evidence: wordCountEvidence,
        openingActions: [
          `字数执行开篇修复：前300字先按 word_count_checks 的 current_count/target_count/min_required_count 判断缺口，用一个可见事件或明确阻碍打开扩写，不靠说明和环境水文；${wordCountEvidence[0] || '开篇先把字数缺口变成事件压力。'}`,
        ],
        middleActions: [
          `字数执行中段修复：按 target_count 补足动作过程、选择代价、对话交锋、信息变化和场景反馈，每段扩写都必须推动剧情或情绪变化；${wordCountEvidence[0] || '中段用功能内容补字数。'}`,
        ],
        endingActions: [
          `字数执行章尾修复：检查 min_required_count 和 remaining_risk，章尾补钩子铺垫、代价余波或下一章动作压力，不得用重复情绪/内心独白凑字；${wordCountEvidence[0] || '章尾补功能性钩子而不是凑字。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const bannedWordRisks = proseQualityBannedWordRisks(proseQualityEntry.payload || {})
    if (bannedWordRisks.length > 0) {
      const bannedWordEvidence = bannedWordRisks
        .flatMap((item: any) => [item.action, item.fix, item.replacement, item.remaining_risk, item.evidence])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: bannedWordRisks.length,
        item: `禁用词：硬禁缺口 ${bannedWordRisks.length}`,
        priorityLabel: '优先修禁用词',
        evidence: bannedWordEvidence,
        openingActions: [
          `禁用词开篇修复：前300字先执行 banned_words_checks 的 matched_word/location 扫描，标题行以外不得复现硬禁词或模板表达；${bannedWordEvidence[0] || '开篇先清掉硬禁词。'}`,
        ],
        middleActions: [
          `禁用词中段修复：按 replacement 把禁用词改成角色动作、物件反馈、短对白或现场反应，不用抽象升华和模板句；${bannedWordEvidence[0] || '中段用具体动作替换禁用词。'}`,
        ],
        endingActions: [
          `禁用词章尾修复：检查 remaining_risk，章尾不能复现命中词、作者预告或总结升华，要用故事内动作/新证据/新阻碍收束；${bannedWordEvidence[0] || '章尾继续清理硬禁残留。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const chapterBenchmarkRisks = proseQualityChapterBenchmarkRisks(proseQualityEntry.payload || {})
    if (chapterBenchmarkRisks.length > 0) {
      const chapterBenchmarkEvidence = chapterBenchmarkRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.delivered_evidence, item.originality_guard])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: chapterBenchmarkRisks.length,
        item: `章节基准：基准缺口 ${chapterBenchmarkRisks.length}`,
        priorityLabel: '优先补章节基准',
        evidence: chapterBenchmarkEvidence,
        openingActions: [
          `章节基准开篇修复：前300字先执行 chapter_benchmark_checks 的 benchmark_dimension，提取对标章的节奏/场面/情绪功能，不复制桥段或原句；${chapterBenchmarkEvidence[0] || '开篇先把章节基准落成当前事件。'}`,
        ],
        middleActions: [
          `章节基准中段修复：按 expected_method 把对标方法改成本书目标、阻碍、升级、反转或回报，必须有 delivered_evidence 可定位；${chapterBenchmarkEvidence[0] || '中段用本书事件执行对标方法。'}`,
        ],
        endingActions: [
          `章节基准章尾修复：检查 originality_guard 和 remaining_risk，章尾只保留功能性回收和下一层问题，不得复刻对标章桥段/原句/专有设定；${chapterBenchmarkEvidence[0] || '章尾守住原创边界。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const longformRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
      snakeField: 'longform_checks',
      camelField: 'longformChecks',
      actionPrefix: 'longform_checks',
      fallbackLabel: '长篇专项',
      detailFields: [
        ['recent_5_chapter_progress', 'recent5ChapterProgress'],
        ['payoff_interval', 'payoffInterval'],
        ['stage_goal_shift', 'stageGoalShift'],
        ['next_stage_pull', 'nextStagePull'],
        ['context_layer', 'contextLayer'],
      ],
    })
    if (longformRisks.length > 0) {
      const longformEvidence = uniqueBriefStrings(longformRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean), 8)
      const longformOpeningEvidence = longformEvidence.find((item: string) => /recent_5_chapter_progress|最近5章|主线|stage_goal_shift|阶段目标/i.test(item))
      const longformMiddleEvidence = longformEvidence.find((item: string) => /payoff_interval|爽点|回报|context_layer|当前场景/i.test(item))
      const longformEndingEvidence = longformEvidence.find((item: string) => /next_stage_pull|下一阶段|牵引|下一章|航点/i.test(item))
      riskRows.push({
        count: longformRisks.length,
        item: `长篇专项：长线缺口 ${longformRisks.length}`,
        priorityLabel: '优先补长篇专项',
        evidence: longformEvidence,
        openingActions: [
          `长篇专项开篇修复：前300字先处理 longform_checks 的 recent_5_chapter_progress/stage_goal_shift，把最近5章停滞改成当前章明确航点或阶段目标推进；${longformOpeningEvidence || longformEvidence[0] || '开篇先把长线目标压回当前章。'}`,
        ],
        middleActions: [
          `长篇专项中段修复：中段必须按 payoff_interval/context_layer 给阶段爽点、上下文层进入场景和不可删除变化，不能继续原地解释；${longformMiddleEvidence || longformEvidence[0] || '中段补长线回报和场景推进。'}`,
        ],
        endingActions: [
          `长篇专项章尾修复：章尾按 next_stage_pull 留下下一阶段入口、新代价或新航点，证明长线推进已经换挡；${longformEndingEvidence || longformEvidence[0] || '章尾给下一阶段牵引。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const innovationRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
      snakeField: 'innovation_checks',
      camelField: 'innovationChecks',
      actionPrefix: 'innovation_checks',
      fallbackLabel: '创新执行',
      detailFields: [
        ['innovation_type', 'innovationType'],
        ['differentiating_mechanism', 'differentiatingMechanism'],
        ['visualized_scene', 'visualizedScene'],
        ['reader_retellable_hook', 'readerRetellableHook'],
        ['long_term_fit', 'longTermFit'],
      ],
    })
    if (innovationRisks.length > 0) {
      const innovationEvidence = uniqueBriefStrings(innovationRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean), 8)
      const innovationMechanismEvidence = innovationEvidence.find((item: string) => /innovation_type|differentiating_mechanism|创新|机制|反差|差异/i.test(item))
      const innovationVisualEvidence = innovationEvidence.find((item: string) => /visualized_scene|reader_retellable_hook|可视|可复述|场面/i.test(item))
      const innovationFitEvidence = innovationEvidence.find((item: string) => /long_term_fit|长期|下一章|牵引|后续/i.test(item))
      riskRows.push({
        count: innovationRisks.length,
        item: `创新：创新缺口 ${innovationRisks.length}`,
        priorityLabel: '优先补创新',
        evidence: innovationEvidence,
        openingActions: [
          `创新开篇修复：前300字先执行 innovation_checks 的 innovation_type/differentiating_mechanism，把创新点写成可见规则、异常或选择压力；${innovationMechanismEvidence || innovationEvidence[0] || '开篇先亮出创新机制。'}`,
        ],
        middleActions: [
          `创新中段修复：中段必须交付 visualized_scene/reader_retellable_hook，让创新点参与行动、反制、场面或读者可复述回报；${innovationVisualEvidence || innovationEvidence[0] || '中段把创新点变成可复述场面。'}`,
        ],
        endingActions: [
          `创新章尾修复：章尾按 long_term_fit 复核创新点是否能继续服务长线，并抛出由创新机制带来的下一章问题；${innovationFitEvidence || innovationEvidence[0] || '章尾让创新机制继续拉动后续。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const chapterAttractionRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
      snakeField: 'chapter_attraction_checks',
      camelField: 'chapterAttractionChecks',
      actionPrefix: 'chapter_attraction_checks',
      fallbackLabel: '吸引力缺口',
      detailFields: [
        ['attraction_dimension', 'attractionDimension'],
        ['opening_hook', 'openingHook'],
        ['scene_goal_obstacle_turn_reward', 'sceneGoalObstacleTurnReward'],
        ['payoff_density', 'payoffDensity'],
        ['ending_page_turn', 'endingPageTurn'],
        ['spreadable_scene', 'spreadableScene'],
      ],
    })
    if (chapterAttractionRisks.length > 0) {
      const chapterAttractionEvidence = uniqueBriefStrings(chapterAttractionRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean), 8)
      const attractionOpeningEvidence = chapterAttractionEvidence.find((item: string) => /opening_hook|开篇|开头|第一幕|触发/i.test(item))
      const attractionMiddleEvidence = chapterAttractionEvidence.find((item: string) => /scene_goal_obstacle_turn_reward|payoff_density|目标|阻碍|回报|密度/i.test(item))
      const attractionEndingEvidence = chapterAttractionEvidence.find((item: string) => /ending_page_turn|章末|翻页|下一章|spreadable_scene|传播/i.test(item))
      riskRows.push({
        count: chapterAttractionRisks.length,
        item: `修吸引力：吸引力缺口 ${chapterAttractionRisks.length}`,
        priorityLabel: '优先修章节吸引力',
        evidence: chapterAttractionEvidence,
        openingActions: [
          `吸引力开篇修复：前300字先执行 chapter_attraction_checks 的 opening_hook/attraction_dimension，让异常、目标或矛盾直接出现；${attractionOpeningEvidence || chapterAttractionEvidence[0] || '开篇先补章节吸引力。'}`,
        ],
        middleActions: [
          `吸引力中段修复：中段必须落实 scene_goal_obstacle_turn_reward/payoff_density，把目标、阻碍、转折、回报写成连锁事件；${attractionMiddleEvidence || chapterAttractionEvidence[0] || '中段用目标阻碍回报补吸引力。'}`,
        ],
        endingActions: [
          `吸引力章尾修复：章尾按 ending_page_turn/spreadable_scene 留下可复述强画面、翻页问题或下一章行动方向；${attractionEndingEvidence || chapterAttractionEvidence[0] || '章尾补足翻页拉力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const storyDriveRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
      snakeField: 'story_drive_checks',
      camelField: 'storyDriveChecks',
      actionPrefix: 'story_drive_checks',
      fallbackLabel: '故事驱动',
      detailFields: [
        ['protagonist_choice', 'protagonistChoice'],
        ['obstacle'],
        ['cost'],
        ['state_change', 'stateChange'],
        ['next_causality', 'nextCausality'],
      ],
    })
    if (storyDriveRisks.length > 0) {
      const storyDriveEvidence = uniqueBriefStrings(storyDriveRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean), 8)
      const storyDriveOpeningEvidence = storyDriveEvidence.find((item: string) => /protagonist_choice|主角|主动|选择|目标/i.test(item))
      const storyDriveMiddleEvidence = storyDriveEvidence.find((item: string) => /obstacle|cost|阻碍|代价|暴露|选择代价/i.test(item))
      const storyDriveEndingEvidence = storyDriveEvidence.find((item: string) => /state_change|next_causality|状态变化|因果|下一步|明日/i.test(item))
      riskRows.push({
        count: storyDriveRisks.length,
        item: `故事力：驱动缺口 ${storyDriveRisks.length}`,
        priorityLabel: '优先补故事力',
        evidence: storyDriveEvidence,
        openingActions: [
          `故事力开篇修复：前300字先执行 story_drive_checks 的 protagonist_choice，让主角带着明确选择、目标或主动押注进入场景；${storyDriveOpeningEvidence || storyDriveEvidence[0] || '开篇先让主角主动选择。'}`,
        ],
        middleActions: [
          `故事力中段修复：中段必须落实 obstacle/cost，把阻碍、选择代价、资源损耗或关系代价写成可见事件；${storyDriveMiddleEvidence || storyDriveEvidence[0] || '中段把故事驱动写成阻碍和代价。'}`,
        ],
        endingActions: [
          `故事力章尾修复：章尾按 state_change/next_causality 给出状态变化和下一步因果，不能只停在局势说明；${storyDriveEndingEvidence || storyDriveEvidence[0] || '章尾交付状态变化和下一步因果。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const characterArcRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
      snakeField: 'character_arc_checks',
      camelField: 'characterArcChecks',
      actionPrefix: 'character_arc_checks',
      fallbackLabel: '人物弧光',
      detailFields: [
        ['character'],
        ['desire'],
        ['flaw_pressure', 'flawPressure'],
        ['relationship_change', 'relationshipChange'],
        ['growth_beat', 'growthBeat'],
        ['voice_anchor', 'voiceAnchor'],
      ],
    })
    if (characterArcRisks.length > 0) {
      const characterArcEvidence = uniqueBriefStrings(characterArcRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
        .filter(Boolean), 8)
      const characterArcOpeningEvidence = characterArcEvidence.find((item: string) => /character|desire|人物|欲望|资格|目标/i.test(item))
      const characterArcMiddleEvidence = characterArcEvidence.find((item: string) => /flaw_pressure|relationship_change|缺陷|关系变化|求证|压力/i.test(item))
      const characterArcEndingEvidence = characterArcEvidence.find((item: string) => /growth_beat|voice_anchor|成长|口吻|短句|承认/i.test(item))
      riskRows.push({
        count: characterArcRisks.length,
        item: `人物弧光：弧光缺口 ${characterArcRisks.length}`,
        priorityLabel: '优先补人物弧光',
        evidence: characterArcEvidence,
        openingActions: [
          `人物弧光开篇修复：前300字先执行 character_arc_checks 的 character/desire，让人物欲望和本章目标进入当前压力；${characterArcOpeningEvidence || characterArcEvidence[0] || '开篇先让人物欲望显形。'}`,
        ],
        middleActions: [
          `人物弧光中段修复：中段必须落实 flaw_pressure/relationship_change，把缺陷受压、关系变化或主动求证写成可见互动；${characterArcMiddleEvidence || characterArcEvidence[0] || '中段把弧光写成关系和缺陷压力。'}`,
        ],
        endingActions: [
          `人物弧光章尾修复：章尾按 growth_beat/voice_anchor 交付成长节点和口吻锚点，让变化留在动作或对白里；${characterArcEndingEvidence || characterArcEvidence[0] || '章尾交付成长节点和声音变化。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const qualitySpecialtyRisks = proseQualityQualitySpecialtyRisks(proseQualityEntry.payload || {})
    if (qualitySpecialtyRisks.length > 0) {
      const qualitySpecialtyEvidence = uniqueBriefStrings([
        ...qualitySpecialtyRisks.map((item: any) => item.action),
        ...qualitySpecialtyRisks.map((item: any) => item.evidence),
        ...qualitySpecialtyRisks.map((item: any) => item.label),
      ].filter(Boolean), 8)
      const qualitySpecialtyOpeningEvidence = qualitySpecialtyEvidence.find((item: string) => /structure_checks|opening_hook|开篇|开头|第一幕/i.test(item))
      const qualitySpecialtyMiddleEvidence = qualitySpecialtyEvidence.find((item: string) => /progression_checks|non_deletable_change|不可删除|关系|主线状态|中段/i.test(item))
      const qualitySpecialtyEndingEvidence = qualitySpecialtyEvidence.find((item: string) => /information_checks|new_concept_count|信息|概念|章尾|延后/i.test(item))
      riskRows.push({
        count: qualitySpecialtyRisks.length,
        item: `质量专项：结构推进信息缺口 ${qualitySpecialtyRisks.length}`,
        priorityLabel: '优先修质量专项',
        evidence: qualitySpecialtyEvidence,
        openingActions: [
          `质量专项开篇修复：前300字先处理 structure_checks/opening_hook，把目标触发、异常或冲突放到第一幕，不再复述背景；${qualitySpecialtyOpeningEvidence || qualitySpecialtyEvidence[0] || '开篇先补结构缺口。'}`,
        ],
        middleActions: [
          `质量专项中段修复：中段必须执行 progression_checks/non_deletable_change，让关系、主线状态、资源或目标发生不可删除变化；${qualitySpecialtyMiddleEvidence || qualitySpecialtyEvidence[0] || '中段补不可删除变化。'}`,
        ],
        endingActions: [
          `质量专项章尾修复：章尾按 information_checks/new_concept_count 控制信息负载，只保留必要信息点，并把剩余概念转成动作延后或下一章问题；${qualitySpecialtyEndingEvidence || qualitySpecialtyEvidence[0] || '章尾控制信息负载并留下问题。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const coreContractRisks = proseQualityCoreContractRisks(proseQualityEntry.payload || {})
    if (coreContractRisks.length > 0) {
      const coreContractEvidence = coreContractRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence, item.core_promise, item.mainline_service, item.rule_judgement, item.ending_question])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: coreContractRisks.length,
        item: `创作契约：核心承诺缺口 ${coreContractRisks.length}`,
        priorityLabel: '优先修创作契约',
        evidence: coreContractEvidence,
        openingActions: [
          `创作契约开篇修复：前300字先把 core_contract_checks 指出的核心承诺、核心冲突或漂移红线压回当前事件；${coreContractEvidence[0] || '先让核心承诺进入开篇压力。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用规则判定、角色选择、反制代价或读者回报兑现核心承诺；${coreContractEvidence[0] || '把核心承诺写成中段胜负变化。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：章尾必须把核心承诺转成下一章新问题、升级压力或追读钩子；${coreContractEvidence[0] || '章尾继续服务核心承诺。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const readerRetentionRisks = proseQualityReaderRetentionRisks(proseQualityEntry.payload || {})
    if (readerRetentionRisks.length > 0) {
      const readerRetentionEvidence = readerRetentionRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.retention_engine,
          item.emotional_payoff,
          item.information_hunger,
          item.page_turn_question,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: readerRetentionRisks.length,
        item: `创作契约：追读留存缺口 ${readerRetentionRisks.length}`,
        priorityLabel: '优先修创作契约',
        evidence: readerRetentionEvidence,
        openingActions: [
          `创作契约开篇修复：前300字必须执行 reader_retention_checks 的 retention_engine，让读者立刻知道本章还有未解压力；${readerRetentionEvidence[0] || '先把追读留存缺口变成开篇触发。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用 emotional_payoff 和 information_hunger 补足行动、奖励、奖励随机性或沉没投入；${readerRetentionEvidence[0] || '把追读留存写成中段事件推进。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：最后300字必须用 page_turn_question、信息差、剥洋葱、危险升级或新问题形成下一章拉力；${readerRetentionEvidence[1] || readerRetentionEvidence[0] || '章尾必须留下可追读的问题。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const perspectiveVerdictRisks = proseQualityPerspectiveVerdictRisks(proseQualityEntry.payload || {})
    if (perspectiveVerdictRisks.length > 0) {
      const perspectiveVerdictEvidence = uniqueBriefStrings(perspectiveVerdictRisks
        .flatMap((item: any) => [
          ...item.evidence,
          `${item.reviewer} ${item.verdict}`,
        ])
        .filter(Boolean), 8)
      const perspectiveOpeningEvidence = perspectiveVerdictEvidence.find((item: string) => /开篇|对上|目标|名单|身份|追查/i.test(item))
      const perspectiveMiddleEvidence = perspectiveVerdictEvidence.find((item: string) => /隔物|验证|动作|证据|规则|触碰|统一/i.test(item))
      const perspectiveEndingEvidence = perspectiveVerdictEvidence.find((item: string) => /章末|钩子|下一章|结构|CONCERNS|REJECT/i.test(item))
      riskRows.push({
        count: perspectiveVerdictRisks.length,
        item: `多视角审查：视角风险 ${perspectiveVerdictRisks.length}`,
        priorityLabel: '优先处理多视角审查',
        evidence: perspectiveVerdictEvidence,
        openingActions: [
          `多视角审查开篇修复：前300字先处理 perspective_verdicts 的 CONCERNS/REJECT，把结构、设定或一致性意见转成当前场景目标；${perspectiveOpeningEvidence || perspectiveVerdictEvidence[0] || '开篇先处理多视角审查风险。'}`,
        ],
        middleActions: [
          `多视角审查中段修复：中段必须按 findings/recommendations 写出验证动作、规则约束、证据变化或角色选择，不能只口头解释；${perspectiveMiddleEvidence || perspectiveVerdictEvidence[0] || '中段把多视角意见落成可见事件。'}`,
        ],
        endingActions: [
          `多视角审查章尾修复：章尾复核 REJECT/CONCERNS 是否闭环，并把结构钩子、一致性后果或下一章目标写成新压力；${perspectiveEndingEvidence || perspectiveVerdictEvidence[0] || '章尾确认多视角审查闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const deslopRisks = proseQualityDeslopRisks(proseQualityEntry.payload || {})
    if (deslopRisks.length > 0) {
      const hasDeslopDiagnostics = deslopRisks.some((item: any) => item.diagnostic)
      const deslopEvidence = uniqueBriefStrings(deslopRisks
        .flatMap((item: any) => [
          item.fix,
          item.evidence,
          `${/^gate/i.test(String(item.gate || '')) ? item.gate : `Gate ${item.gate}`} ${item.pattern}`,
        ])
        .filter(Boolean), 8)
      const deslopRewriteEvidence = deslopEvidence.find((item: string) => /水迹|倒流|逼问|遮掩|短对白|可见|直接写/i.test(item))
      const deslopGateEvidence = deslopEvidence.find((item: string) => /Gate A|Gate B|不是A|禁用词|模板|否定铺垫/i.test(item))
      const deslopEndingEvidence = deslopEvidence.find((item: string) => /Gate G|Gate E|解释腔|对话|上帝视角|作者预告|悬念|名单缺页/i.test(item))
      riskRows.push({
        count: deslopRisks.length,
        item: `去AI味：${hasDeslopDiagnostics ? '门禁摘要' : '门禁缺口'} ${deslopRisks.length}`,
        priorityLabel: '优先去AI味',
        evidence: deslopEvidence,
        openingActions: [
          `去AI味门禁开篇修复：前300字先处理 deslop_checks/deslop_gate_diagnostics 的 fail/warn Gate，把模板表达改成现场物象、动作或短对白；${deslopRewriteEvidence || deslopEvidence[0] || '开篇先处理去AI味门禁缺口。'}`,
        ],
        middleActions: [
          `去AI味门禁中段修复：按 Gate A-G 的 fix 改写 AI 味模式，让每个修复都落成事件推进、信息变化或人物交锋；${deslopGateEvidence || deslopRewriteEvidence || deslopEvidence[0] || '中段用可见事件替代模板表达。'}`,
        ],
        endingActions: [
          `去AI味门禁章尾修复：章尾复核 Gate E、Gate G 等对话腔、解释腔、上帝视角和作者预告不再复现，用故事内悬念或后果收束；${deslopEndingEvidence || deslopEvidence[0] || '章尾确认去AI味门禁闭环。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const dialogueRisks = proseQualityDialogueRisks(proseQualityEntry.payload || {})
    if (dialogueRisks.length > 0) {
      const dialogueEvidence = dialogueRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.speaker,
          item.agenda,
          item.subtext,
          item.power_shift,
          item.information_delta,
          item.character_voice,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: dialogueRisks.length,
        item: `修对白：对白缺口 ${dialogueRisks.length}`,
        priorityLabel: '优先修对白',
        evidence: dialogueEvidence,
        openingActions: [
          `对白开篇修复：开篇必须执行 dialogue_checks 的 speaker、agenda 和 character_voice，让说话人、真实诉求和声线先分清；${dialogueEvidence[0] || '开篇先锁定对白双方和各自诉求。'}`,
        ],
        middleActions: [
          `对白中段修复：中段必须落实 subtext 和 power_shift，让潜台词推动权力变化，不能让角色轮流解释剧情；${dialogueEvidence[0] || '中段用潜台词推动权力变化。'}`,
        ],
        endingActions: [
          `对白章尾修复：章尾必须给出 information_delta 或声线差异带来的新压力，把对白转成信息增量、关系变化或下一步行动；${dialogueEvidence[0] || '章尾用对白交付信息增量。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const plotDynamicsRisks = proseQualityPlotDynamicsRisks(proseQualityEntry.payload || {})
    if (plotDynamicsRisks.length > 0) {
      const plotDynamicsEvidence = plotDynamicsRisks
        .flatMap((item: any) => [
          item.action_directive,
          item.fix,
          item.remaining_risk,
          item.goal,
          item.obstacle,
          item.action,
          item.cost_or_feedback,
          item.new_expectation,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: plotDynamicsRisks.length,
        item: `修剧情动力：动力缺口 ${plotDynamicsRisks.length}`,
        priorityLabel: '优先修剧情动力',
        evidence: plotDynamicsEvidence,
        openingActions: [
          `剧情动力开篇修复：开篇必须执行 plot_dynamics_checks 的 goal 和 obstacle，让本章目标与阻碍先成立；${plotDynamicsEvidence[0] || '开篇先立目标和阻碍。'}`,
        ],
        middleActions: [
          `剧情动力中段修复：中段必须落实 action 和 cost_or_feedback，让主角行动产生代价、反馈或非可删变化；${plotDynamicsEvidence[0] || '中段用行动和反馈推进。'}`,
        ],
        endingActions: [
          `剧情动力章尾修复：章尾必须抬出 new_expectation，把本章行动结果转成下一步期待，不能原地发现线索；${plotDynamicsEvidence[0] || '章尾给出新的行动期待。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const continuityHeatRisks = proseQualityContinuityHeatRisks(proseQualityEntry.payload || {})
    if (continuityHeatRisks.length > 0) {
      const continuityHeatEvidence = continuityHeatRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.heat_state,
          item.hot_progress,
          item.warm_keepalive,
          item.cold_warmup,
          item.archived_boundary,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: continuityHeatRisks.length,
        item: `连续性热度：热度缺口 ${continuityHeatRisks.length}`,
        priorityLabel: '优先修连续性热度',
        evidence: continuityHeatEvidence,
        openingActions: [
          `连续性热度开篇修复：开篇必须执行 continuity_heat_checks 的 heat_state 和 hot_progress，先标清 hot/warm/cold/archived 状态，并推进 hot 元素；${continuityHeatEvidence[0] || '开篇先标清热度状态并推进热线。'}`,
        ],
        middleActions: [
          `连续性热度中段修复：中段必须落实 warm_keepalive 和 cold_warmup，让 warm 元素有效触达、cold 元素回收前先升温；${continuityHeatEvidence[0] || '中段保温温线并预热冷线。'}`,
        ],
        endingActions: [
          `连续性热度章尾修复：章尾必须兑现 archived_boundary，并把本章热度变化交接到下一章，避免误激活已休眠线；${continuityHeatEvidence[0] || '章尾说明归档边界和下一步热度。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const characterRelationRisks = proseQualityCharacterRelationRisks(proseQualityEntry.payload || {})
    if (characterRelationRisks.length > 0) {
      const characterRelationEvidence = characterRelationRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.relation_type,
          item.protagonist_goal,
          item.agency_choice,
          item.cost,
          item.relation_shift,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: characterRelationRisks.length,
        item: `角色关系：关系缺口 ${characterRelationRisks.length}`,
        priorityLabel: '优先修角色关系',
        evidence: characterRelationEvidence,
        openingActions: [
          `角色关系开篇修复：开篇必须执行 character_relation_checks 的 relation_type 和 protagonist_goal，让关系类型、主角自己的目标和目标归属先成立；${characterRelationEvidence[0] || '开篇先明确关系类型和主角目标。'}`,
        ],
        middleActions: [
          `角色关系中段修复：中段必须落实 agency_choice 和 cost，让主角主动选择并付出代价，不能让关系角色只递线索或发糖；${characterRelationEvidence[0] || '中段用主动选择和代价推进关系。'}`,
        ],
        endingActions: [
          `角色关系章尾修复：章尾必须兑现 relation_shift，让关系态度、信任、利益或阶段发生可见变化；${characterRelationEvidence[0] || '章尾交付关系变化。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const characterBehaviorRisks = proseQualityCharacterBehaviorRisks(proseQualityEntry.payload || {})
    if (characterBehaviorRisks.length > 0) {
      const characterBehaviorEvidence = characterBehaviorRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.character,
          item.concrete_motive,
          item.emotional_reason,
          item.trigger_change,
          item.visible_choice,
          item.cost,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: characterBehaviorRisks.length,
        item: `角色行为：人设缺口 ${characterBehaviorRisks.length}`,
        priorityLabel: '优先修角色行为',
        evidence: characterBehaviorEvidence,
        openingActions: [
          `角色行为开篇修复：开篇必须执行 character_behavior_checks 的 character、concrete_motive 和 emotional_reason，让角色、具体动机与情感理由先站住；${characterBehaviorEvidence[0] || '开篇先建立角色和具体动机。'}`,
        ],
        middleActions: [
          `角色行为中段修复：中段必须落实 trigger_change 和 visible_choice，用事件触发行为变化，并让角色做出可见选择；${characterBehaviorEvidence[0] || '中段让触发事件带出可见选择。'}`,
        ],
        endingActions: [
          `角色行为章尾修复：章尾必须兑现 cost，让角色选择承担代价，不能只做工具化动作；${characterBehaviorEvidence[0] || '章尾交付行为代价。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const assetLinkageRisks = proseQualityAssetLinkageRisks(proseQualityEntry.payload || {})
    if (assetLinkageRisks.length > 0) {
      const assetLinkageEvidence = assetLinkageRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.asset_name,
          item.asset_function,
          item.ownership,
          item.trigger_condition,
          item.limitation,
          item.consequence,
          item.story_link,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: assetLinkageRisks.length,
        item: `资产挂钩：孤立资产 ${assetLinkageRisks.length}`,
        priorityLabel: '优先修资产挂钩',
        evidence: assetLinkageEvidence,
        openingActions: [
          `资产挂钩开篇修复：开篇必须执行 asset_linkage_checks 的 asset_name、function 和 ownership，让关键资产的名称、功能和归属先可见；${assetLinkageEvidence[0] || '开篇先明确关键资产的功能和归属。'}`,
        ],
        middleActions: [
          `资产挂钩中段修复：中段必须落实 trigger_condition 和 limitation，让资产在冲突中被触发，并暴露使用限制，不能只点名设定；${assetLinkageEvidence[0] || '中段让资产触发并显示限制。'}`,
        ],
        endingActions: [
          `资产挂钩章尾修复：章尾必须兑现 consequence 和 story_link，把资产使用后果接到主线、关系线或下一条线索；${assetLinkageEvidence[0] || '章尾交付资产后果和故事连接。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const stateTrackingRisks = proseQualityStateTrackingRisks(proseQualityEntry.payload || {})
    if (stateTrackingRisks.length > 0) {
      const stateTrackingEvidence = stateTrackingRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.state_subject,
          item.state_type,
          item.previous_state,
          item.allowed_state,
          item.used_in_chapter,
          item.excluded_reason,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: stateTrackingRisks.length,
        item: `状态筛选：上下文缺口 ${stateTrackingRisks.length}`,
        priorityLabel: '优先修状态筛选',
        evidence: stateTrackingEvidence,
        openingActions: [
          `状态筛选开篇修复：开篇必须执行 state_tracking_checks 的 state_subject、state_type、previous_state 和 allowed_state，先确认可用状态边界；${stateTrackingEvidence[0] || '开篇先确认状态主体和允许状态。'}`,
        ],
        middleActions: [
          `状态筛选中段修复：中段必须落实 used_in_chapter，只按 allowed_state 使用状态，并避免把未触发状态写成事实；${stateTrackingEvidence[0] || '中段只按允许状态使用上下文。'}`,
        ],
        endingActions: [
          `状态筛选章尾修复：章尾必须交代 excluded_reason 或 remaining_risk，把被排除状态、来源边界和下一章状态交接清楚；${stateTrackingEvidence[0] || '章尾交代排除理由和状态交接。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const storyStateUpdateRisks = proseQualityStoryStateUpdateRisks(proseQualityEntry.payload || {})
    if (storyStateUpdateRisks.length > 0) {
      const storyStateEvidence = storyStateUpdateRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.source_excerpt, item.target_file, item.update_path])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: storyStateUpdateRisks.length,
        item: `状态写回：状态缺口 ${storyStateUpdateRisks.length}`,
        priorityLabel: '优先修状态写回',
        evidence: storyStateEvidence,
        openingActions: [
          `状态写回开篇修复：前300字先承接 story_state_update_checks 指出的状态变化、状态缺口或状态边界；${storyStateEvidence[0] || '先让状态变化影响当前事件。'}`,
        ],
        middleActions: [
          `状态写回中段修复：用行动后果、选择限制、关系反应或物件状态证明状态已经改变，并能写回 update_path；${storyStateEvidence[0] || '中段把状态变化写成行动后果。'}`,
        ],
        endingActions: [
          `状态写回章尾修复：章尾把状态变化转成下一章可追踪的限制、风险或目标，不得让角色/资产状态回滚；${storyStateEvidence[0] || '章尾保留状态后果。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const foreshadowingDeltaRisks = proseQualityForeshadowingDeltaRisks(proseQualityEntry.payload || {})
    if (foreshadowingDeltaRisks.length > 0) {
      const foreshadowingEvidence = foreshadowingDeltaRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.source_excerpt, item.ledger_path, item.current_status])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: foreshadowingDeltaRisks.length,
        item: `伏笔增量：台账缺口 ${foreshadowingDeltaRisks.length}`,
        priorityLabel: '优先补伏笔增量',
        evidence: foreshadowingEvidence,
        openingActions: [
          `伏笔增量开篇修复：前300字先让 foreshadowing_delta_checks 指出的新伏笔或待推进伏笔以可见线索入场；${foreshadowingEvidence[0] || '先给可见伏笔线索。'}`,
        ],
        middleActions: [
          `伏笔增量中段修复：用行动、对话、物件状态或风险判断推进伏笔当前状态，并同步台账路径；${foreshadowingEvidence[0] || '中段推进伏笔状态。'}`,
        ],
        endingActions: [
          `伏笔增量章尾修复：把伏笔状态转成下一章问题或回收压力，不能只停留在台账说明；${foreshadowingEvidence[0] || '章尾留下伏笔新问题。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const sourceReadinessRisks = proseQualitySourceReadinessRisks(proseQualityEntry.payload || {})
    if (sourceReadinessRisks.length > 0) {
      const sourceReadinessEvidence = sourceReadinessRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.source_name,
          item.source_path,
          item.read_status,
          item.used_as_fact,
          item.chapter_evidence,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: sourceReadinessRisks.length,
        item: `来源就绪：来源缺口 ${sourceReadinessRisks.length}`,
        priorityLabel: '优先补来源就绪',
        evidence: sourceReadinessEvidence,
        openingActions: [
          `来源就绪开篇修复：前300字先处理 source_readiness_checks 指出的 missing/warn 来源，未确认来源不得被当作既定事实；${sourceReadinessEvidence[0] || '先把来源缺口写成可见取证动作。'}`,
        ],
        middleActions: [
          `来源就绪中段修复：用查证、对话、物件证据或角色认知边界证明来源状态，未就绪来源只能作为疑问、误导或待验证线索；${sourceReadinessEvidence[0] || '中段补足来源证据。'}`,
        ],
        endingActions: [
          `来源就绪章尾修复：章尾把来源确认结果转成下一章可追踪的新证据、限制或未解问题；${sourceReadinessEvidence[0] || '章尾交代来源确认后的新压力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const writePreparationRisks = proseQualityWritePreparationRisks(proseQualityEntry.payload || {})
    if (writePreparationRisks.length > 0) {
      const creationContractRisks = writePreparationRisks.filter((item: any) => item?.is_creation_contract)
      const otherWritePreparationRisks = writePreparationRisks.filter((item: any) => !item?.is_creation_contract)
      if (creationContractRisks.length > 0) {
        const creationContractEvidence = creationContractRisks
          .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.expected, item.delivered_evidence, item.chapter_location, item.evidence, item.label])
          .filter(Boolean)
          .slice(0, 8)
        riskRows.push({
          count: creationContractRisks.length,
          item: `创作契约：执行缺口 ${creationContractRisks.length}`,
          priorityLabel: '优先修创作契约',
          evidence: creationContractEvidence,
          openingActions: [
            `创作契约开篇修复：前300字承接上一章未兑现的目标读者、题材定位、核心承诺或追读留存压力；${creationContractEvidence[0] || '先把上一章创作契约缺口变成可见目标和即时压力。'}`,
          ],
          middleActions: [
            `创作契约中段修复：用动作、对话、反制代价或信息变化兑现创作契约，不得只在旁白中说明；${creationContractEvidence[1] || creationContractEvidence[0] || '把缺口写成正文证据。'}`,
          ],
          endingActions: [
            `创作契约章尾修复：把本章修复结果转成新问题、升级压力或下一章钩子，保证追读留存继续成立；${creationContractEvidence[2] || creationContractEvidence[0] || '章末必须留下可追的下一步。'}`,
          ],
          sourceReviewId: proseQualityEntry.review?.id || null,
        })
      }
      if (otherWritePreparationRisks.length > 0) {
        const writePreparationEvidence = otherWritePreparationRisks
          .flatMap((item: any) => [
            item.action,
            item.fix,
            item.remaining_risk,
            item.preparation_type,
            item.expected,
            item.delivered_evidence,
            item.chapter_location,
            item.evidence,
            item.label,
          ])
          .filter(Boolean)
          .slice(0, 8)
        riskRows.push({
          count: otherWritePreparationRisks.length,
          item: `写前准备：执行缺口 ${otherWritePreparationRisks.length}`,
          priorityLabel: '优先修写前准备',
          evidence: writePreparationEvidence,
          openingActions: [
            `写前准备开篇修复：前300字先把 write_preparation_checks 指出的来源缺口、资产风险、上一轮待修复或必确认项变成可见动作；${writePreparationEvidence[0] || '先把写前准备缺口落到第一场。'}`,
          ],
          middleActions: [
            `写前准备中段修复：按 preparation_type 执行 expected，补齐 delivered_evidence 和 chapter_location，不能只在旁白中声明已处理；${writePreparationEvidence[0] || '中段把准备项写成正文证据。'}`,
          ],
          endingActions: [
            `写前准备章尾修复：章尾把准备项修复结果转成读者回报、主线证据或下一章待确认项；${writePreparationEvidence[0] || '章尾交代写前准备的后续压力。'}`,
          ],
          sourceReviewId: proseQualityEntry.review?.id || null,
        })
      }
    }
    const chapterHandoffRisks = proseQualityChapterHandoffRisks(proseQualityEntry.payload || {})
    if (chapterHandoffRisks.length > 0) {
      const chapterHandoffEvidence = chapterHandoffRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.opening_obligation,
          item.continuity_action,
          item.previous_handoff,
          item.opening_evidence,
          item.location,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: chapterHandoffRisks.length,
        item: `章首承接：承接缺口 ${chapterHandoffRisks.length}`,
        priorityLabel: '优先修章首承接',
        evidence: chapterHandoffEvidence,
        openingActions: [
          `章首承接开篇修复：前300字必须兑现 chapter_handoff_checks 指出的 previous_handoff、opening_obligation 和 opening_evidence；${chapterHandoffEvidence[0] || '先把上一章章末钩子接成当前场景压力。'}`,
        ],
        middleActions: [
          `章首承接中段修复：按 continuity_action 把上一章余波转成新目标、阻碍、信息变化或角色/资产状态变化；${chapterHandoffEvidence[0] || '中段让承接事项改变当前行动。'}`,
        ],
        endingActions: [
          `章首承接章尾修复：章尾必须交代承接后的新状态、未解问题和下一章动作压力，不能让上一章钩子沉没；${chapterHandoffEvidence[0] || '章尾补清下一章交接。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const intentConfirmationRisks = proseQualityIntentConfirmationRisks(proseQualityEntry.payload || {})
    if (intentConfirmationRisks.length > 0) {
      const intentConfirmationEvidence = intentConfirmationRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.intent_field,
          item.expected_intent,
          item.delivered_evidence,
          item.blueprint_link,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: intentConfirmationRisks.length,
        item: `意图确认：执行偏移 ${intentConfirmationRisks.length}`,
        priorityLabel: '优先修意图确认',
        evidence: intentConfirmationEvidence,
        openingActions: [
          `意图确认开篇修复：前300字先把 intent_confirmation_checks 指出的章节目标、情绪目标或蓝图焦点压回当前事件；${intentConfirmationEvidence[0] || '先把章节意图写成可见目标。'}`,
        ],
        middleActions: [
          `意图确认中段修复：按 intent_field 和 expected_intent 推进场景，每场必须有 delivered_evidence，不能偏去解释无关设定；${intentConfirmationEvidence[0] || '中段让场景服务章节意图。'}`,
        ],
        endingActions: [
          `意图确认章尾修复：章尾把蓝图焦点转成下一章动作压力或问题，确保 blueprint_link 对应目标闭环；${intentConfirmationEvidence[0] || '章尾承接本章意图。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const benchmarkRecallRisks = proseQualityBenchmarkRecallRisks(proseQualityEntry.payload || {})
    if (benchmarkRecallRisks.length > 0) {
      const benchmarkRecallEvidence = benchmarkRecallRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.source_type,
          item.source_path,
          item.expected_application,
          item.delivered_evidence,
          item.gaps_preserved,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: benchmarkRecallRisks.length,
        item: `文风召回：召回缺口 ${benchmarkRecallRisks.length}`,
        priorityLabel: '优先修文风召回',
        evidence: benchmarkRecallEvidence,
        openingActions: [
          `文风召回开篇修复：前300字先执行 benchmark_recall_checks 指出的 source_type/source_path 对应技法，只学节奏、情绪模块或表达功能，不复制桥段/原句；${benchmarkRecallEvidence[0] || '开篇先把文风召回落成正文动作。'}`,
        ],
        middleActions: [
          `文风召回中段修复：按 expected_application 把节奏参照、情绪模块或匹配章技法写成压迫、停顿、爆发、冷却或反应；${benchmarkRecallEvidence[0] || '中段把召回要求变成可见技法。'}`,
        ],
        endingActions: [
          `文风召回章尾修复：检查 gaps_preserved 和 delivered_evidence，保留未完成召回缺口到下一道问题，不能用“文风接近”掩盖未执行；${benchmarkRecallEvidence[0] || '章尾保留并说明未兑现召回缺口。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const styleBoundaryRisks = proseQualityStyleBoundaryRisks(proseQualityEntry.payload || {})
    if (styleBoundaryRisks.length > 0) {
      const styleBoundaryEvidence = styleBoundaryRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.reference_risk,
          item.rewritten_with_local_action,
          item.voice_anchor,
          item.copied_phrase_removed,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: styleBoundaryRisks.length,
        item: `文风边界：边界缺口 ${styleBoundaryRisks.length}`,
        priorityLabel: '优先修文风边界',
        evidence: styleBoundaryEvidence,
        openingActions: [
          `文风边界开篇修复：前300字先执行 style_boundary_checks 指出的 reference_risk 清理，硬约束永远赢，不能让样章/副对标口吻覆盖本书事实和角色声音；${styleBoundaryEvidence[0] || '开篇先守住文风边界。'}`,
        ],
        middleActions: [
          `文风边界中段修复：按 rewritten_with_local_action 和 voice_anchor 把借鉴内容改成本书动作、证据、代价和人物口吻，不复制桥段、原句或万能比喻；${styleBoundaryEvidence[0] || '中段用本书动作替代样章痕迹。'}`,
        ],
        endingActions: [
          `文风边界章尾修复：检查 copied_phrase_removed 和 remaining_risk，章尾不得出现 Gate F 升华、作者预告或副对标口吻收束；${styleBoundaryEvidence[0] || '章尾继续守住不可复制边界。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const styleSampleRisks = proseQualityStyleSampleRisks(proseQualityEntry.payload || {})
    if (styleSampleRisks.length > 0) {
      const styleSampleEvidence = styleSampleRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.style_dimension,
          item.source_technique,
          item.adapted_evidence,
          item.copied_phrase_rewritten,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: styleSampleRisks.length,
        item: `样章策略：策略缺口 ${styleSampleRisks.length}`,
        priorityLabel: '优先修样章策略',
        evidence: styleSampleEvidence,
        openingActions: [
          `样章策略开篇修复：前300字按 style_sample_checks 指出的 style_dimension/source_technique 取技法功能，不照搬样章桥段、原句或比喻；${styleSampleEvidence[0] || '开篇先把样章策略改成本书动作。'}`,
        ],
        middleActions: [
          `样章策略中段修复：按 adapted_evidence 把样章技法转成本书资产、冲突动作、对话节奏或反应层次，必须看得见改写后的正文证据；${styleSampleEvidence[0] || '中段让样章技法本土化。'}`,
        ],
        endingActions: [
          `样章策略章尾修复：检查 copied_phrase_rewritten 和 remaining_risk，章尾不得保留样章原句、桥段模板或不适用场景；${styleSampleEvidence[0] || '章尾继续清理样章复制痕迹。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const proseMetaRisks = proseQualityProseMetaRisks(proseQualityEntry.payload || {})
    if (proseMetaRisks.length > 0) {
      const proseMetaEvidence = proseMetaRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.matched_term,
          item.location,
          item.replacement,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: proseMetaRisks.length,
        item: `正文元信息：工程词泄露 ${proseMetaRisks.length}`,
        priorityLabel: '优先修工程词',
        evidence: proseMetaEvidence,
        openingActions: [
          `正文元信息开篇修复：前300字先清理 prose_meta_checks 指出的 matched_term/location，标题行以外不得出现上一章、本章、伏笔、细纲、读者等工程词；${proseMetaEvidence[0] || '开篇先把工程词改成现场事件锚点。'}`,
        ],
        middleActions: [
          `正文元信息中段修复：按 replacement 把工程词改成角色当下能感知的动作、物件、时间差或对话信息，不用作者视角解释；${proseMetaEvidence[0] || '中段继续用角色感知替代元叙述。'}`,
        ],
        endingActions: [
          `正文元信息章尾修复：检查 remaining_risk，章尾不能用“本章/下一章/读者/伏笔”等工程词收束，只能用故事内新证据或问题翻页；${proseMetaEvidence[0] || '章尾用故事内问题替代工程词。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const informationFlowRisks = proseQualityInformationFlowRisks(proseQualityEntry.payload || {})
    if (informationFlowRisks.length > 0) {
      const informationFlowEvidence = informationFlowRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.reveal_order,
          item.withheld_question,
          item.action_bound_release,
          item.conflict_or_cost,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: informationFlowRisks.length,
        item: `信息团衔接：信息缺口 ${informationFlowRisks.length}`,
        priorityLabel: '优先修信息团衔接',
        evidence: informationFlowEvidence,
        openingActions: [
          `信息团衔接开篇修复：前300字先回应 information_flow_checks 指出的 withheld_question 或上一场悬念，不得用无关背景/纯过渡开场；${informationFlowEvidence[0] || '先把信息缺口接成动作。'}`,
        ],
        middleActions: [
          `信息团衔接中段修复：按 reveal_order 和 action_bound_release 释放信息，每个信息团必须绑定动作、冲突或代价，纯移动/寒暄/环境描写要压缩；${informationFlowEvidence[0] || '中段按动作释放信息。'}`,
        ],
        endingActions: [
          `信息团衔接章尾修复：章尾把已释放信息转成下一章明确问题、代价或新证据，不能把信息流停在解释段；${informationFlowEvidence[0] || '章尾延续信息问题。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const expectationThresholdRisks = proseQualityExpectationThresholdRisks(proseQualityEntry.payload || {})
    if (expectationThresholdRisks.length > 0) {
      const expectationThresholdEvidence = expectationThresholdRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.reader_question,
          item.stakes,
          item.choice_pressure,
          item.payoff_promise,
          item.next_chapter_pull,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: expectationThresholdRisks.length,
        item: `期待门槛：门槛缺口 ${expectationThresholdRisks.length}`,
        priorityLabel: '优先修期待门槛',
        evidence: expectationThresholdEvidence,
        openingActions: [
          `期待门槛开篇修复：前300字先提出 expectation_threshold_checks 指出的 reader_question 或新门槛，不得先发放爽点/答案；${expectationThresholdEvidence[0] || '开篇先把期待门槛立住。'}`,
        ],
        middleActions: [
          `期待门槛中段修复：按 stakes 和 choice_pressure 把目标拆成条件、选择或代价，爽点释放前必须先让门槛升级；${expectationThresholdEvidence[0] || '中段用选择压力拉高期待。'}`,
        ],
        endingActions: [
          `期待门槛章尾修复：用 next_chapter_pull 或 payoff_promise 把已释放信息转成下一道门槛，不能让本章爽点后期待归零；${expectationThresholdEvidence[0] || '章尾必须挂住下一道期待。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const targetReaderRisks = proseQualityTargetReaderRisks(proseQualityEntry.payload || {})
    if (targetReaderRisks.length > 0) {
      const targetReaderEvidence = targetReaderRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.target_reader_profile,
          item.reader_desire,
          item.emotion_gap,
          item.chapter_hit,
          item.platform_taste,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: targetReaderRisks.length,
        item: `创作契约：目标读者缺口 ${targetReaderRisks.length}`,
        priorityLabel: '优先修创作契约',
        evidence: targetReaderEvidence,
        openingActions: [
          `创作契约开篇修复：前300字必须执行 target_reader_checks 的 target_reader_profile 和 emotion_gap，让目标读者立刻看到本章承诺的压力、欲望或回报；${targetReaderEvidence[0] || '先把目标读者缺口变成可见开篇压力。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用 reader_desire 和 platform_taste 指向的动作、选择、对话或反制结果兑现目标读者想看的核心爽点；${targetReaderEvidence[0] || '把目标读者想看的内容写成正文证据。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：把 chapter_hit 和目标读者回报转成下一章仍想追的更高问题或新代价；${targetReaderEvidence[1] || targetReaderEvidence[0] || '章尾继续抬高目标读者期待。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const genrePositioningRisks = proseQualityGenrePositioningRisks(proseQualityEntry.payload || {})
    if (genrePositioningRisks.length > 0) {
      const genrePositioningEvidence = genrePositioningRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.genre_tag,
          item.core_hook,
          item.type_formula,
          item.genre_strength,
          item.book_title_blurb_alignment,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: genrePositioningRisks.length,
        item: `创作契约：题材定位缺口 ${genrePositioningRisks.length}`,
        priorityLabel: '优先修创作契约',
        evidence: genrePositioningEvidence,
        openingActions: [
          `创作契约开篇修复：前300字先把 genre_positioning_checks 的 genre_tag、core_hook 或 book_title_blurb_alignment 压回正文第一屏；${genrePositioningEvidence[0] || '先让题材长板进入开篇事件。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用 type_formula、题材长板、金手指贴合或必备场景兑现题材定位；${genrePositioningEvidence[0] || '把题材定位写成中段事件推进。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：章尾钩子必须继续服务 genre_strength 和题材长板，不能转成无关支线；${genrePositioningEvidence[1] || genrePositioningEvidence[0] || '章尾继续强化题材定位。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const plotSpecialTopicsRisks = proseQualityPlotSpecialTopicsRisks(proseQualityEntry.payload || {})
    if (plotSpecialTopicsRisks.length > 0) {
      const plotSpecialTopicsEvidence = plotSpecialTopicsRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          ...(item.matched_topics || []),
          item.goldfinger_execution,
          item.genre_boundary_execution,
          item.market_benchmark_execution,
          item.urban_high_martial_execution,
          item.launch_checkpoint_execution,
          item.faction_hand_execution,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: plotSpecialTopicsRisks.length,
        item: `创作契约：特殊题材缺口 ${plotSpecialTopicsRisks.length}`,
        priorityLabel: '优先修特殊题材',
        evidence: plotSpecialTopicsEvidence,
        openingActions: [
          `特殊题材开篇修复：前300字必须执行 plot_special_topics_checks 指出的 matched_topics，把金手指、题材边界、三万字卡点或阵营手牌缺口转成当前场景目标/压力；${plotSpecialTopicsEvidence[0] || '先把特殊题材缺口变成开篇可见压力。'}`,
        ],
        middleActions: [
          `特殊题材中段修复：用金手指反馈、题材边界内的核心期待、都市高武钱/资源/资格目标或阵营逐级出牌推进事件，不能只解释规则；${plotSpecialTopicsEvidence[0] || '把特殊题材规则写成中段事件结果。'}`,
        ],
        endingActions: [
          `特殊题材章尾修复：章尾必须回扣三万字卡点、阶段目标、阵营手牌或金手指下一反馈，形成下一章追读压力；${plotSpecialTopicsEvidence[1] || plotSpecialTopicsEvidence[0] || '章尾继续强化特殊题材承诺。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const femaleAudienceRisks = proseQualityFemaleAudienceRisks(proseQualityEntry.payload || {})
    if (femaleAudienceRisks.length > 0) {
      const femaleAudienceEvidence = femaleAudienceRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.security_anchor,
          item.reader_identification,
          item.heroine_agency,
          item.relationship_axis,
          item.post_abuse_payoff,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: femaleAudienceRisks.length,
        item: `女频长篇：女频缺口 ${femaleAudienceRisks.length}`,
        priorityLabel: '优先修女频长篇',
        evidence: femaleAudienceEvidence,
        openingActions: [
          `女频长篇开篇修复：前300字必须执行 female_audience_checks 的 security_anchor 和 reader_identification，让读者先看到安全感、代入感或尊严感；${femaleAudienceEvidence[0] || '开篇先给女主可感知的安全锚点。'}`,
        ],
        middleActions: [
          `女频长篇中段修复：中段必须落实 heroine_agency 和 relationship_axis，让关键选择、行动推进和关系变化由女主自己完成；${femaleAudienceEvidence[0] || '中段让女主主动做决定。'}`,
        ],
        endingActions: [
          `女频长篇章尾修复：章尾必须兑现 post_abuse_payoff，压迫后给反转、糖、安全感或尊严回报，不能连续只虐；${femaleAudienceEvidence[0] || '章尾给压迫后的回报。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const upgradeRhythmRisks = proseQualityUpgradeRhythmRisks(proseQualityEntry.payload || {})
    if (upgradeRhythmRisks.length > 0) {
      const upgradeRhythmEvidence = upgradeRhythmRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.before_after_contrast,
          item.instant_feedback,
          item.delayed_feedback,
          item.new_threshold,
          item.cheat_rule,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: upgradeRhythmRisks.length,
        item: `升级节奏：升级缺口 ${upgradeRhythmRisks.length}`,
        priorityLabel: '优先修升级节奏',
        evidence: upgradeRhythmEvidence,
        openingActions: [
          `升级节奏开篇修复：开篇必须执行 upgrade_rhythm_checks 的 before_after_contrast 和 cheat_rule，让升级前状态、规则代价或限制先可见；${upgradeRhythmEvidence[0] || '开篇先建立升级前后对比。'}`,
        ],
        middleActions: [
          `升级节奏中段修复：中段必须落实 instant_feedback 和 delayed_feedback，让能力、资源或身份变化产生即时反馈与延迟代价；${upgradeRhythmEvidence[0] || '中段写出升级反馈和代价。'}`,
        ],
        endingActions: [
          `升级节奏章尾修复：章尾必须抬出 new_threshold，把升级回报转成下一阶段门槛，不能停在系统提示；${upgradeRhythmEvidence[0] || '章尾给出新门槛。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const conflictStructureRisks = proseQualityConflictStructureRisks(proseQualityEntry.payload || {})
    if (conflictStructureRisks.length > 0) {
      const conflictStructureEvidence = conflictStructureRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.blocker,
          item.no_exit_condition,
          item.stakes_or_exit_cost,
          item.action_block,
          item.win_loss_result,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: conflictStructureRisks.length,
        item: `冲突结构：冲突缺口 ${conflictStructureRisks.length}`,
        priorityLabel: '优先修冲突结构',
        evidence: conflictStructureEvidence,
        openingActions: [
          `冲突结构开篇修复：开篇必须执行 conflict_structure_checks 的 blocker、no_exit_condition 和 stakes_or_exit_cost，让阻止者、无法退出条件和退出代价先压到现场；${conflictStructureEvidence[0] || '开篇先建立阻止者和有进无出的代价。'}`,
        ],
        middleActions: [
          `冲突结构中段修复：中段必须落实 action_block，让阻止者从口头压力升级为行动阻拦，并逼主角主动破局；${conflictStructureEvidence[0] || '中段把冲突写成行动阻拦。'}`,
        ],
        endingActions: [
          `冲突结构章尾修复：章尾必须兑现 win_loss_result，并把胜负结果转成下一冲突种子，不能停在嘴炮或胜负不明；${conflictStructureEvidence[0] || '章尾给出明确胜负和下一冲突种子。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const storyLoopRisks = proseQualityStoryLoopRisks(proseQualityEntry.payload || {})
    if (storyLoopRisks.length > 0) {
      const storyLoopEvidence = storyLoopRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.setup_question,
          item.obstacle,
          item.choice,
          item.cost,
          item.payoff_or_answer_fragment,
          item.new_question,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: storyLoopRisks.length,
        item: `故事循环：循环缺口 ${storyLoopRisks.length}`,
        priorityLabel: '优先修故事循环',
        evidence: storyLoopEvidence,
        openingActions: [
          `故事循环开篇修复：开篇必须执行 story_loop_checks 的 setup_question 和 obstacle，先把本轮循环问题与阻碍摆到现场；${storyLoopEvidence[0] || '开篇先抛出本轮循环问题和阻碍。'}`,
        ],
        middleActions: [
          `故事循环中段修复：中段必须落实 choice 和 cost，让主角做选择并付出代价，不能只介绍新设定；${storyLoopEvidence[0] || '中段用选择和代价推进循环。'}`,
        ],
        endingActions: [
          `故事循环章尾修复：章尾必须兑现 payoff_or_answer_fragment 并抛出 new_question，把本轮回收转成下一轮燃料；${storyLoopEvidence[0] || '章尾给部分答案并抛出新问题。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const emotionalArcRisks = proseQualityEmotionalArcRisks(proseQualityEntry.payload || {})
    if (emotionalArcRisks.length > 0) {
      const emotionalArcEvidence = emotionalArcRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.calm_or_pressure,
          item.mobilization,
          item.counteraction,
          item.release,
          item.reader_payoff,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: emotionalArcRisks.length,
        item: `情绪弧：情绪缺口 ${emotionalArcRisks.length}`,
        priorityLabel: '优先修情绪弧',
        evidence: emotionalArcEvidence,
        openingActions: [
          `情绪弧开篇修复：开篇必须执行 emotional_arc_checks 的 calm_or_pressure 和 mobilization，让压力、期待或情绪调动先可感知；${emotionalArcEvidence[0] || '开篇先建立压力和情绪调动。'}`,
        ],
        middleActions: [
          `情绪弧中段修复：中段必须落实 counteraction 和 release，让情绪由事件触发并转成反制、释放或爽点，不只写心理说明；${emotionalArcEvidence[0] || '中段用反制和释放推进情绪弧。'}`,
        ],
        endingActions: [
          `情绪弧章尾修复：章尾必须兑现 reader_payoff，把负面情绪转成安全感、尊严感、爽点或余韵钝痛；${emotionalArcEvidence[0] || '章尾给读者明确情绪回报。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const chapterHookRisks = proseQualityChapterHookRisks(proseQualityEntry.payload || {})
    if (chapterHookRisks.length > 0) {
      const chapterHookEvidence = chapterHookRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.hook_position,
          item.trigger,
          item.reader_question,
          item.next_chapter_pressure,
          item.delivered_evidence,
          item.trigger_type,
          item.concrete_question,
          item.danger_or_choice,
          item.next_action_link,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: chapterHookRisks.length,
        item: `章级钩子：钩子缺口 ${chapterHookRisks.length}`,
        priorityLabel: '优先修章级钩子',
        evidence: chapterHookEvidence,
        openingActions: [
          `章级钩子开篇修复：前100-300字必须执行 chapter_hook_checks/chapter_hook_quality_checks 指出的 hook_position=opening、trigger 或 trigger_type，用现场异常、危险、选择或对话逼问开场；${chapterHookEvidence[0] || '开篇先给可见钩子触发。'}`,
        ],
        middleActions: [
          `章级钩子中段修复：按 reader_question、danger_or_choice 和 next_chapter_pressure 推进冲突，不得把钩子停成空悬念或口头预告；${chapterHookEvidence[0] || '中段把钩子压力变成行动选择。'}`,
        ],
        endingActions: [
          `章级钩子章尾修复：最后300字必须给 concrete_question、danger_or_choice 或 next_action_link，直接连到下一章行动压力，不能再用低风险空钩子；${chapterHookEvidence[0] || '章尾必须挂住下一章行动。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const paragraphHookRisks = proseQualityParagraphHookRisks(proseQualityEntry.payload || {})
    if (paragraphHookRisks.length > 0) {
      const paragraphHookEvidence = paragraphHookRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.paragraph_range,
          item.hook_type,
          item.micro_change,
          item.information_or_risk_delta,
          item.emotion_or_relation_delta,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: paragraphHookRisks.length,
        item: `段落级钩子：微钩子缺口 ${paragraphHookRisks.length}`,
        priorityLabel: '优先修段落级钩子',
        evidence: paragraphHookEvidence,
        openingActions: [
          `段落级钩子开篇修复：前300字就按 paragraph_hook_checks 指出的 paragraph_range/hook_type 放入可见微推进，不能连续铺环境、姿态或背景；${paragraphHookEvidence[0] || '开篇先给段落级微钩子。'}`,
        ],
        middleActions: [
          `段落级钩子中段修复：每3-5段必须产生 micro_change 或 information_or_risk_delta，用信息差、暗牌、代价、反转、打脸、异常物件或对话压迫推动正文；${paragraphHookEvidence[0] || '中段保持段落级推进。'}`,
        ],
        endingActions: [
          `段落级钩子章尾修复：把 emotion_or_relation_delta 或未解微变化收束成下一段/下一章追问，不能让连续段落停在解释和静态说明；${paragraphHookEvidence[0] || '章尾保留段落级牵引。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const suspenseRisks = proseQualitySuspenseRisks(proseQualityEntry.payload || {})
    if (suspenseRisks.length > 0) {
      const suspenseEvidence = suspenseRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.question,
          item.misdirect,
          item.partial_answer,
          item.new_expectation,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: suspenseRisks.length,
        item: `悬念编排：悬念缺口 ${suspenseRisks.length}`,
        priorityLabel: '优先修悬念编排',
        evidence: suspenseEvidence,
        openingActions: [
          `悬念编排开篇修复：前300字必须执行 suspense_checks 指出的 question 和 misdirect，提出清晰疑问并给可信提示或误导；${suspenseEvidence[0] || '开篇先建立疑问与误导。'}`,
        ],
        middleActions: [
          `悬念编排中段修复：中段必须用 partial_answer 给出可验证的部分答案，让读者看到答案路径而不是只听谜面；${suspenseEvidence[0] || '中段给出部分答案。'}`,
        ],
        endingActions: [
          `悬念编排章尾修复：最后300字必须用 new_expectation 接上新期待，当前疑问解决后还要留下新门槛或新困境；${suspenseEvidence[0] || '章尾挂住新期待。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const reversalRisks = proseQualityReversalRisks(proseQualityEntry.payload || {})
    if (reversalRisks.length > 0) {
      const reversalEvidence = reversalRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.reversal_type,
          item.fair_clues,
          item.misdirect,
          item.reveal_timing,
          item.impact_after_reveal,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: reversalRisks.length,
        item: `反转设计：反转缺口 ${reversalRisks.length}`,
        priorityLabel: '优先修反转设计',
        evidence: reversalEvidence,
        openingActions: [
          `反转设计开篇修复：开篇必须按 reversal_checks 的 fair_clues 和 misdirect 预埋公平暗示，不能等揭示时才补新信息；${reversalEvidence[0] || '开篇先埋公平暗示。'}`,
        ],
        middleActions: [
          `反转设计中段修复：中段必须控制 reversal_type 与 reveal_timing，让误导有剧情功能，揭示前至少能回看出暗示链；${reversalEvidence[0] || '中段推进反转暗示链。'}`,
        ],
        endingActions: [
          `反转设计章尾修复：揭示后必须落实 impact_after_reveal，改变局势、关系、证据或读者期待，不能只给身份解释；${reversalEvidence[0] || '章尾让反转改变局势。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const showdownRisks = proseQualityShowdownRisks(proseQualityEntry.payload || {})
    if (showdownRisks.length > 0) {
      const showdownEvidence = showdownRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.payoff_release,
          item.trump_card_used,
          item.pressure_layers,
          item.audience_reactions,
          item.consequence,
          item.next_threshold,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: showdownRisks.length,
        item: `高潮对抗：爽点缺口 ${showdownRisks.length}`,
        priorityLabel: '优先修高潮对抗',
        evidence: showdownEvidence,
        openingActions: [
          `高潮对抗开篇修复：开篇必须按 showdown_checks 的 pressure_layers 建立友方、敌方、中立方或场域压力，不能直接跳到主角出牌；${showdownEvidence[0] || '开篇先压出对抗压力。'}`,
        ],
        middleActions: [
          `高潮对抗中段修复：中段必须执行 trump_card_used 和 payoff_release，每次只出一个底牌，并让底牌产生对应压制；${showdownEvidence[0] || '中段让底牌释放爽点。'}`,
        ],
        endingActions: [
          `高潮对抗章尾修复：章尾必须落地 audience_reactions、consequence 和 next_threshold，把三方震动、结果后果和下一门槛写成可见变化；${showdownEvidence[0] || '章尾给结果和下一门槛。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const bridgeUnitRisks = proseQualityBridgeUnitRisks(proseQualityEntry.payload || {})
    if (bridgeUnitRisks.length > 0) {
      const bridgeUnitEvidence = bridgeUnitRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.bridge_position,
          item.old_expectation_payoff,
          item.new_expectation_seed,
          item.goal_progression,
          item.climax_hook,
          item.stage_handoff,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: bridgeUnitRisks.length,
        item: `桥段节奏：节奏缺口 ${bridgeUnitRisks.length}`,
        priorityLabel: '优先修桥段节奏',
        evidence: bridgeUnitEvidence,
        openingActions: [
          `桥段节奏开篇修复：开篇必须按 bridge_unit_checks 的 bridge_position 和 old_expectation_payoff 承接旧期待，不能把过渡章写成复盘；${bridgeUnitEvidence[0] || '开篇先兑现旧期待。'}`,
        ],
        middleActions: [
          `桥段节奏中段修复：中段必须执行 new_expectation_seed、goal_progression 和 climax_hook，让目标推进并在高潮中挂新期待；${bridgeUnitEvidence[0] || '中段推进新目标。'}`,
        ],
        endingActions: [
          `桥段节奏章尾修复：章尾必须落实 stage_handoff，交接下一阶段行动地点、代价或目标，不能只收束旧线；${bridgeUnitEvidence[0] || '章尾交接下一阶段。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const openingRisks = proseQualityOpeningRisks(proseQualityEntry.payload || {})
    if (openingRisks.length > 0) {
      const openingEvidence = openingRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.first_300_goal,
          item.first_1000_expectation,
          item.protagonist_entry,
          item.opening_principle,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: openingRisks.length,
        item: `开篇设计：开篇缺口 ${openingRisks.length}`,
        priorityLabel: '优先修开篇设计',
        evidence: openingEvidence,
        openingActions: [
          `开篇设计开篇修复：前300字必须修复 opening_checks 指出的主角登场、300字目标、开头五要诀或慢热说明问题；${openingEvidence[0] || '先把开篇缺口变成第一屏可见压力。'}`,
        ],
        middleActions: [
          `开篇设计中段修复：1000字内兑现 opening_checks 指出的期待点、三大基点、本文卖点或主线嫁接，不得只铺说明；${openingEvidence[0] || '中段补出可见期待点。'}`,
        ],
        endingActions: [
          `开篇设计章尾修复：章尾把开篇期待点转成下一章可追的问题、代价或升级压力；${openingEvidence[0] || '章尾延续开篇承诺。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const proseCraftRisks = proseQualityProseCraftRisks(proseQualityEntry.payload || {})
    if (proseCraftRisks.length > 0) {
      const proseCraftEvidence = proseCraftRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.pov_depth,
          item.body_detail,
          item.environment_interaction,
          item.action_stillness_balance,
          item.crowd_reaction_layering,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: proseCraftRisks.length,
        item: `正文工艺：行文缺口 ${proseCraftRisks.length}`,
        priorityLabel: '优先修正文工艺',
        evidence: proseCraftEvidence,
        openingActions: [
          `正文工艺开篇修复：开篇必须执行 prose_craft_checks 的 pov_depth 和 body_detail，用角色可见动作、身体细节和感知替代上帝视角或抽象情绪；${proseCraftEvidence[0] || '开篇先用限知镜头和身体细节落地。'}`,
        ],
        middleActions: [
          `正文工艺中段修复：中段必须落实 environment_interaction 和 action_stillness_balance，让物件、环境、动作和停顿承担剧情功能；${proseCraftEvidence[0] || '中段把环境交互和一动一静写成事件推进。'}`,
        ],
        endingActions: [
          `正文工艺章尾修复：章尾必须处理 crowd_reaction_layering 和 remaining_risk，让旁观反应分层，并避免继续用上帝视角、抽象情绪或统一震惊收尾；${proseCraftEvidence[0] || '章尾用分层反应和可见动作收束。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const punctuationToneRisks = proseQualityPunctuationToneRisks(proseQualityEntry.payload || {})
    if (punctuationToneRisks.length > 0) {
      const punctuationToneEvidence = punctuationToneRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.speaker,
          item.punctuation_issue,
          item.tone_intent,
          item.replacement,
          item.voice_difference,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: punctuationToneRisks.length,
        item: `语气标点：标点缺口 ${punctuationToneRisks.length}`,
        priorityLabel: '优先修语气标点',
        evidence: punctuationToneEvidence,
        openingActions: [
          `语气标点开篇修复：开篇对白必须执行 punctuation_tone_checks 的 speaker、punctuation_issue 和 tone_intent，先让人物声线和追问/试探/爆发意图成立；${punctuationToneEvidence[0] || '开篇先校准人物语气。'}`,
        ],
        middleActions: [
          `语气标点中段修复：中段必须按 replacement 改写标点功能，用短句、换行、动作打断或冒号落点替代省略号/破折号硬停顿；${punctuationToneEvidence[0] || '中段用功能性标点服务对话交锋。'}`,
        ],
        endingActions: [
          `语气标点章尾修复：章尾必须保留 voice_difference，并避免统一句号、统一感叹或硬停顿抹平角色声线；${punctuationToneEvidence[0] || '章尾保持声线差异。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    const qualityAuditRisks = proseQualityQualityAuditRisks(proseQualityEntry.payload || {})
    if (qualityAuditRisks.length > 0) {
      const qualityAuditEvidence = qualityAuditRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.strategy,
          item.purpose_tag,
          item.density_change,
          item.conflict_bound_info,
          item.changed_evidence,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: qualityAuditRisks.length,
        item: `质量诊断：诊断缺口 ${qualityAuditRisks.length}`,
        priorityLabel: '优先修质量诊断',
        evidence: qualityAuditEvidence,
        openingActions: [
          `质量诊断开篇修复：开篇必须执行 quality_audit_checks 的 strategy 和 purpose_tag，先明确本章目的词、读者期待和不可删除变化；${qualityAuditEvidence[0] || '开篇先建立本章目的词。'}`,
        ],
        middleActions: [
          `质量诊断中段修复：中段必须落实 density_change 和 conflict_bound_info，把详略分配、事件内容比重和信息释放绑定到冲突推进；${qualityAuditEvidence[0] || '中段让信息跟冲突走。'}`,
        ],
        endingActions: [
          `质量诊断章尾修复：章尾必须交付 changed_evidence 或 remaining_risk 对应的局势变化、读者回报和下一阶段钩子，不能用摘要解释替代事件推进；${qualityAuditEvidence[0] || '章尾给可定位局势变化。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
  }

  riskRows.sort((left, right) => {
    const leftRank = left.priorityLabel === '优先修创作契约' || /^创作契约/.test(left.item) ? 0 : 1
    const rightRank = right.priorityLabel === '优先修创作契约' || /^创作契约/.test(right.item) ? 0 : 1
    return leftRank - rightRank
  })

  const totalCount = riskRows.reduce((sum, row) => sum + row.count, 0)
  if (totalCount <= 0) return null
  return normalizeDeliveryRiskCarryOverContext({
    source_chapter_no: Number(previousChapter.chapter_no || 0) || null,
    total_count: totalCount,
    label: `待修复 ${totalCount}`,
    priority_label: riskRows[0]?.priorityLabel || '优先复盘上一章',
    items: riskRows.map(row => row.item),
    required_actions: [
      `第${previousChapter.chapter_no}章交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接。`,
      ...riskRows.flatMap(row => row.evidence.map(item => `修复：${item}`)),
    ],
    opening_actions: riskRows.flatMap(row => row.openingActions || []),
    middle_actions: riskRows.flatMap(row => row.middleActions || []),
    ending_actions: riskRows.flatMap(row => row.endingActions || []),
    forbidden_repeats: uniqueBriefStrings(riskRows.flatMap(row => row.forbiddenRepeats || []), 12),
    evidence: riskRows.flatMap(row => row.evidence),
    source_review_ids: riskRows.map(row => row.sourceReviewId).filter(Boolean),
  })
}
