import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  normalizeDeliveryRiskCarryOverContext,
  normalizeDeliveryRiskReceiptDelivered,
} from './delivery-risk-core'
import { reviewTimestamp, reviewBelongsToChapter, reviewPayloadForType } from '../quality/review-lookup'
import {
  deliveryRiskCountFromPayload,
  deliveryRiskEvidence,
  pendingAssetIntakeRisks,
  pendingIpSceneIntakeRisks,
  genericSyncRiskStagedActions,
  makeDeliveryRiskItem,
  readabilityAiSmellRisks,
} from '../quality/prose-quality-risks'
import {
  normalizeStoredOhStoryDeliveryReceipts,
} from './delivery-risk-carry-over'
import { appendProseQualityDeliveryRiskCarryOverRows } from './delivery-risk-carry-over-prose-quality'

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
    appendProseQualityDeliveryRiskCarryOverRows(riskRows, proseQualityEntry)
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
