import {
  type AnyRecord,
  arrayValue,
  firstText,
  limitedArray,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  camelFieldName,
  deterministicProseCleanupResidualsFromQuality,
  genericClosureEvidenceDetail,
  metricNumber,
  preDraftExecutionReceiptSources,
  qualityContractMissingFields,
  qualityContractResidualsFromQuality,
  sceneCardDirectiveResidualsFromQuality,
  sceneCardReceiptResidualsFromQuality,
  summarizeEvidenceItem,
} from './quality-contract'

export function isSingleChapterRecoveryEvidenceTask(task: AnyRecord) {
  if (firstText(task?.issue_type, task?.issueType) !== 'recovery_evidence_mismatch') return false
  const source = firstText(task?.source)
  const annotationSource = firstText(task?.annotation_source, task?.annotationSource)
  return source === 'review_annotation_risk' || annotationSource === 'governance_recheck_sync'
}

export function summarizeKeyValueFlags(value: any) {
  return Object.entries(objectValue(value))
    .map(([key, raw]) => {
      if (raw === null || raw === undefined || raw === '') return ''
      if (typeof raw === 'boolean' || typeof raw === 'number' || typeof raw === 'string') return `${key}=${text(raw)}`
      if (Array.isArray(raw)) {
        const items = raw.map(summarizeEvidenceItem).filter(Boolean)
        return items.length > 0 ? `${key}=${items.join('|')}` : ''
      }
      const item = objectValue(raw)
      const summary = firstText(item.label, item.message, item.reason, item.text, item.description)
      return summary ? `${key}=${summary}` : `${key}=${JSON.stringify(item).slice(0, 120)}`
    })
    .filter(Boolean)
}

export function deliveryRiskReceiptRemainingRisk(receipt: AnyRecord) {
  const remainingRisk = firstText(receipt.remaining_risk, receipt.remainingRisk, receipt.residual_risk, receipt.residualRisk)
  if (remainingRisk) return remainingRisk
  if (receipt.delivered === false) return 'delivery_risk_receipts 标记 delivered=false，仍需补正文证据。'
  return ''
}

export function inferDeliveryRiskReceiptSegment(receipt: AnyRecord) {
  const explicit = firstText(receipt.segment, receipt.stage, receipt.position, receipt.section).toLowerCase()
  const searchable = [
    explicit,
    receipt.risk_item,
    receipt.riskItem,
    receipt.required_action,
    receipt.requiredAction,
    receipt.action,
    receipt.remaining_risk,
    receipt.remainingRisk,
  ].map(item => text(item)).join(' ')
  if (/opening|start|开篇|章首|开场|起笔|前300|前三百|第一屏/.test(searchable)) return 'opening'
  if (/ending|end|章末|章尾|结尾|收束|翻页|钩子|最后300|后三百|下一章|悬念/.test(searchable)) return 'ending'
  if (/middle|mid|中段|场景|推进|冲突|反制|追查|证据|边界|关系|资产|伏笔|时间线|状态|承接|兑现|回报|对白|动作/.test(searchable)) return 'middle'
  return 'general'
}

export function normalizeFailedDeliveryRiskReceiptRepairs(...sources: any[]) {
  return sources
    .flatMap(source => arrayValue(source))
    .map(receipt => objectValue(receipt))
    .map(receipt => {
      const remainingRisk = deliveryRiskReceiptRemainingRisk(receipt)
      if (!remainingRisk) return null
      const riskItem = firstText(receipt.risk_item, receipt.riskItem, receipt.item, receipt.label, receipt.key, '交稿风险')
      const requiredAction = firstText(receipt.required_action, receipt.requiredAction, receipt.action, receipt.fix, riskItem)
      return {
        segment: inferDeliveryRiskReceiptSegment(receipt),
        riskItem,
        requiredAction,
        evidence: firstText(receipt.evidence),
        remainingRisk,
      }
    })
    .filter(Boolean)
    .slice(0, 12)
}

export function deliveryRiskReceiptSegmentRepairLines(repair: AnyRecord) {
  const segment = firstText(repair.segment, 'general')
  const action = firstText(repair.requiredAction, repair.riskItem, '补交稿风险承接')
  const heading = segment === 'opening'
    ? '开篇承接修复'
    : segment === 'ending'
      ? '章末承接修复'
      : segment === 'middle'
        ? '中段推进修复'
        : '承接修复'
  const positionRule = segment === 'opening'
    ? '位置要求：必须修到前300字；不得把开篇承接拖到中段或章末。'
    : segment === 'ending'
      ? '位置要求：必须修到最后300字；不得把章末风险挪到开篇或中段。'
      : segment === 'middle'
        ? '位置要求：必须修到中段事件推进；不得只放在开篇声明或章末补一句。'
        : '位置要求：按 required_action 指向的正文位置补可见事件，不能只在旁白中声明已处理。'
  return [
    `${heading}：${action}`,
    repair.riskItem ? `风险项：${repair.riskItem}` : '',
    repair.remainingRisk ? `残余风险：${repair.remainingRisk}` : '',
    repair.evidence ? `原证据：${repair.evidence}` : '',
    positionRule,
  ].filter(Boolean)
}

export function deliveryRiskStrategy(issueType: string, category = '') {
  const normalized = `${issueType} ${category}`.toLowerCase()
  if (normalized.includes('core_drift')) {
    return [
      '守住作品核心、读者承诺、本章目标和核心冲突。',
      '把偏离核心的段落改成服务主线压力、人物欲望或规则代价。',
      '不能用临时爽点覆盖长期矛盾，不能让能力碾压导致恐怖、悬念或规则失效。',
    ]
  }
  if (normalized.includes('runway') || normalized.includes('航线')) {
    return [
      '补齐百万字航线的本章四问，让正文可见回答为什么必须写、读者为什么翻页、主线推进了什么、这一章的新意在哪。',
      '补足 readerFuel，把缺失的追读燃料写成现场冲突、规则验证、情绪回报或章末钩子。',
      '不得触碰 redLines；已触碰的提前揭露、越级回收或长期方向偏移必须改成误导、遮挡或延迟兑现。',
    ]
  }
  if (normalized.includes('retention')) {
    return [
      '补强开篇钩子、信息缺口、短剧化场面和章末追读问题。',
      '每个新增桥段都必须制造下一页动力，不要只解释背景。',
      '章末必须留下明确的危险、选择、反转或未解答案。',
    ]
  }
  if (normalized.includes('chapter_attraction') || normalized.includes('attraction') || normalized.includes('吸引力')) {
    return [
      '按吸引力执行器重修开篇钩子、场景推进、爽点密度、章末翻页和传播场面。',
      '修订后前300字要有异常/危险/欲望，场景要有目标/阻碍/转折/回报，最后300字要有明确翻页问题。',
      '新增内容必须服务本章目标和长期主线，不能只做语言润色。',
    ]
  }
  if (normalized.includes('story_drive') || normalized.includes('故事力')) {
    return [
      '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
      '缺口必须写成现场行动、对话交锋、代价反馈或状态变化，不能只补旁白解释。',
      '新增内容必须服务本章目标和长期主线，不能临时改设定或提前消费后续高潮。',
    ]
  }
  if (normalized.includes('character_arc') || normalized.includes('character arc') || normalized.includes('人物弧光')) {
    return [
      '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
      '人物变化必须写成选择、对话、行动后果或关系反馈，不能只补心理旁白。',
      '新增弧光必须服务本章事件和长期人物线，不能临时改人物底层动机。',
    ]
  }
  if (normalized.includes('chapter_benchmark') || normalized.includes('benchmark') || normalized.includes('标杆章') || normalized.includes('质量基准')) {
    return [
      '按章节标杆重修开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读。',
      '只学习标杆章的抽象结构和读者回报节奏，把缺口写成本章自己的现场行动、对话交锋和结果变化。',
      '不得复制标杆样例的桥段、角色名、专有设定、原句和核心梗。',
    ]
  }
  if (normalized.includes('intent_confirmation') || normalized.includes('意图确认')) {
    return [
      '补齐写前确认的情绪目标、章节意图、关键承接和章尾推动力。',
      '缺口必须写成正文可见事件、选择、动作、对白、关系反馈或物品状态变化，不能只补说明。',
      '修订后必须能从 chapter_text 找到对应证据，并在 oh_story_delivery_receipts 中逐项回执。',
    ]
  }
  if (normalized.includes('write_preparation') || normalized.includes('写前准备')) {
    return [
      '补齐写前准备卡里的来源缺口、资产风险、上一轮待修复、创作契约清单、蓝图焦点、读者回报和必确认项。',
      '缺口必须写成正文可见动作、对白、信息变化、关系变化、物品状态变化或章末承接，不能只补说明。',
      '修订后必须能从 chapter_text 找到对应证据，并在 pre_draft_execution_receipts.write_preparation_checks 中逐项回执。',
    ]
  }
  if (normalized.includes('benchmark_recall') || normalized.includes('文风召回')) {
    return [
      '补齐对标模块、节奏参照、文风召回和表达方法在正文中的执行。',
      '缺口必须落到节拍分配、对白比例、动作链、情绪转折和章末压力上，不能只写抽象风格说明。',
      '只学习抽象方法，不得复制参照文本的原句、桥段、专有设定、角色名或核心梗。',
    ]
  }
  if (normalized.includes('style_sample') || normalized.includes('style') || normalized.includes('风格')) {
    return [
      '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻。',
      '只学习样章的抽象表达方法，把缺口改成本章自己的动作链、对白推进和情绪转折。',
      '不得照搬样章原句、桥段、专有设定、角色名和核心梗。',
    ]
  }
  if (normalized.includes('opening_pull')) {
    return [
      '重写或补写前 300 字，把钩子、危机、角色反应和信息增量压到开篇现场。',
      '开篇必须快速给出异常、危险、欲望或反常信息，不能只铺环境、醒来、解释设定。',
      '修订后第一屏就要让读者知道本章为什么必须继续看。',
    ]
  }
  if (normalized.includes('ending_page_turn')) {
    return [
      '重写或补写最后 300 字，把危险升级、选择压力、反转或未解答案压到最后一幕。',
      '章末必须形成下一章非看不可的问题，不能用总结、说明或普通情绪收束代替钩子。',
      '强化章末时不得开启下一章完整剧情，只留下明确的下一步压力或诱因。',
    ]
  }
  if (normalized.includes('scene_progression')) {
    return [
      '补齐每个场景的目标、阻碍、转折、回报。',
      '把纯解释、纯氛围或过场段改成行动链、对话交锋、受阻、选择代价和结果变化。',
      '不得只补说明文字；修订后读者应能看出每个场景为什么存在。',
    ]
  }
  if (normalized.includes('payoff_density')) {
    return [
      '按每 800-1200 字至少一次信息推进、能力展示、危机反制、关系变化或小回收补足短周期读者回报。',
      '新增回报必须服务本章目标和长期主线，不得提前透支后续大高潮。',
      '避免只铺垫不兑现，把爽点写成可见行动结果、信息增量或情绪回报。',
    ]
  }
  if (normalized.includes('expectation')) {
    return [
      '补齐读者期待账本中的必兑现项。',
      '把承诺写成可见行动、冲突结果、情绪回报或章末未解问题。',
      'keep_alive 中的悬念可以继续保留，但正文要维持存在感，不能遗忘或矛盾改写。',
    ]
  }
  if (normalized.includes('payoff')) {
    return [
      '补足本章承诺的爽点、惊点、信息回收或关系变化。',
      '把铺垫转成可见回报，避免只欠账不兑现。',
      '回报不能透支后续大高潮，只兑现本章应交付的短周期收益。',
    ]
  }
  if (normalized.includes('volume_beat') || normalized.includes('climax') || normalized.includes('爆点')) {
    return [
      '补足本章卷级爆点、小高潮、中高潮或卷末爆点。',
      '爆点必须落成现场冲突、选择代价、反制结果、关系变化或章末升级。',
      '不得提前消费后续卷末爆点，只兑现本章应承担的转折和读者回报。',
    ]
  }
  if (normalized.includes('signature_scene') || normalized.includes('强场面')) {
    return [
      '补回开写任务书指定的标志性场面。',
      '必须写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择。',
      '不得只补气氛描写；场面必须同时服务读者回报、剧情线推进和本章核心冲突。',
    ]
  }
  if (normalized.includes('innovation')) {
    return [
      '把创新点写成可见机制、选择、反差、代价或 IP 化场面。',
      '避免只换名词不换体验，修订后要能看出本书和普通套路章的差异。',
      '创新执行不得推翻写作圣经、世界规则或已确认设定。',
    ]
  }
  if (normalized.includes('storyline')) {
    return [
      '补回计划内剧情线的可见推进。',
      '删除或改写计划外推进。',
      '禁揭内容只能改成误导、遮挡或延迟兑现。',
    ]
  }
  if (normalized.includes('story_unit')) {
    return [
      '补足当前剧情单元职责，例如入口钩子、压力升级、小高潮兑现或出单元钩子中本章应承担的部分。',
      '单元抢跑内容只能改成暗示、误导、遮挡或延迟兑现，不能提前消费后段小高潮或出单元钩子。',
      '禁抢跑内容不得直接解决；必要时删除、遮挡或改成仍未完成的威胁。',
    ]
  }
  if (normalized.includes('readability') || normalized.includes('meme')) {
    return [
      '调整段落密度、说明比例、对话节奏和人物口吻差异。',
      '网感只保留吐槽节奏、情绪共鸣或角色口吻，不直接堆梗。',
      '严肃死亡、恐怖高压和关键情绪爆点处降低网感，避免出戏。',
    ]
  }
  return [
    '按风险证据修正文，不做无关润色。',
    '优先补齐本章目标、冲突推进、读者回报和章末钩子。',
    '修订后必须能解释风险如何被消除。',
  ]
}

export function isOpeningHandoffMiss(value: any) {
  const item = objectValue(value)
  const haystack = [
    item.key,
    item.type,
    item.label,
    item.name,
    item.text,
    item.description,
    item.match_scope,
    item.matchScope,
  ].map(part => text(part).toLowerCase()).join(' ')
  return haystack.includes('opening_handoff')
    || haystack.includes('上一章承接')
    || (haystack.includes('handoff') && haystack.includes('opening'))
}

export const REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES: Record<string, string> = {
  chapter_attraction: 'chapter_attraction_gap',
  chapter_benchmark: 'chapter_benchmark_gap',
  chapter_handoff: 'chapter_handoff_missed',
  character_arc: 'character_arc_gap',
  delivery_core: 'core_drift',
  innovation: 'innovation_missed',
  pre_draft_execution: 'intent_confirmation_gap',
  reader_expectation: 'reader_expectation_debt',
  reader_payoff: 'reader_payoff_debt',
  reader_retention: 'reader_retention_missed',
  signature_scene: 'signature_scene_missed',
  story_drive: 'story_drive_gap',
  story_state: 'story_state_update_gap',
  story_state_update: 'story_state_update_gap',
  storyline: 'storyline_sync_risk',
  story_unit: 'story_unit_sync_risk',
  state_delta: 'story_state_update_gap',
  style_sample: 'style_sample_gap',
  volume_beat: 'volume_beat_missed',
  write_preparation: 'write_preparation_gap',
  word_count: 'word_count_gap',
  title_uniqueness: 'title_uniqueness_gap',
  chapter_title_uniqueness: 'title_uniqueness_gap',
  banned_words: 'banned_words_gap',
  blueprint_consumption: 'blueprint_consumption_gap',
  chapter_blueprint: 'blueprint_consumption_gap',
  foreshadowing_delta: 'foreshadowing_delta_gap',
  deterministic_cleanup: 'deterministic_cleanup_gap',
  deterministic_prose_cleanup: 'deterministic_cleanup_gap',
}

export function repairTaskIssueType(task: AnyRecord) {
  const explicit = firstText(task.issue_type, task.issueType)
  if (explicit) return explicit
  const category = firstText(task.annotation_category, task.annotationCategory, task.category)
  return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category] || category
}

export function normalizeDeliveryRiskContext(task: AnyRecord) {
  const issueType = repairTaskIssueType(task)
  const normalizedKind = `${issueType} ${firstText(task.annotation_category)}`.toLowerCase()
  const chapterHandoffReview = objectValue(task.chapter_handoff_review || task.chapterHandoffReview)
  const isBatchHandoffRisk = normalizedKind.includes('chapter_handoff')
    || arrayValue(chapterHandoffReview.missed).length > 0
  const isDeliveryRisk = task.source === 'review_annotation_risk'
    || Boolean(task.annotation_key)
    || Boolean(task.annotation_source)
    || isBatchHandoffRisk
  if (!isDeliveryRisk) return null
  const taskPayload = objectValue(task.payload)
  const payload = isBatchHandoffRisk
    ? {
      ...chapterHandoffReview,
      ...taskPayload,
      missed: [
        ...arrayValue(chapterHandoffReview.missed),
        ...arrayValue(taskPayload.missed),
      ],
    }
    : taskPayload
  const isStoryUnit = normalizedKind.includes('story_unit')
  const openingHookScore = metricNumber(payload.opening_hook_score ?? payload.openingHookScore)
  const openingPullRisk = normalizedKind.includes('opening_pull')
    || (openingHookScore !== null && openingHookScore > 0 && openingHookScore < 70)
  const endingHookScore = metricNumber(payload.ending_hook_score ?? payload.endingHookScore)
  const endingPageTurnRisk = normalizedKind.includes('ending_page_turn')
    || (endingHookScore !== null && endingHookScore > 0 && endingHookScore < 70)
  const sceneReadabilityScore = metricNumber(payload.scene_readability_score ?? payload.sceneReadabilityScore)
  const sceneProgressionRisk = normalizedKind.includes('scene_progression')
    || (sceneReadabilityScore !== null && sceneReadabilityScore > 0 && sceneReadabilityScore < 70)
  const payoffDensityScore = metricNumber(payload.payoff_density_score ?? payload.payoffDensityScore)
  const payoffDensityRisk = normalizedKind.includes('payoff_density')
    || (payoffDensityScore !== null && payoffDensityScore > 0 && payoffDensityScore < 70)
  const evidenceGroups = [
    { label: '计划要求', items: limitedArray(payload.planned, payload.required, payload.plan) },
    { label: '已完成', items: limitedArray(payload.completed) },
    {
      label: '漏推',
      items: [
        ...limitedArray(payload.missed, payload.debts),
        ...arrayValue(payload.four_question_missed),
        ...arrayValue(payload.reader_fuel_missed),
      ].slice(0, 6),
    },
    { label: '额外推进', items: limitedArray(payload.unplanned) },
    { label: '单元抢跑', items: isStoryUnit ? limitedArray(payload.rushed_ahead, payload.rushedAhead) : [] },
    { label: '禁抢跑', items: isStoryUnit ? limitedArray(payload.forbidden_touched, payload.forbiddenTouched) : [] },
    { label: '禁揭风险', items: isStoryUnit ? limitedArray(payload.redline_touched, payload.redlineTouched) : limitedArray(payload.forbidden_touched, payload.forbiddenTouched, payload.redline_touched, payload.redlineTouched) },
    { label: '核心偏移', items: limitedArray(payload.drift_risks, payload.risks) },
    { label: '开篇吸引力', items: openingPullRisk ? [`开篇评分：${openingHookScore ?? '-'}`] : [] },
    { label: '章末翻页', items: endingPageTurnRisk ? [`章末评分：${endingHookScore ?? '-'}`] : [] },
    { label: '场景推进', items: sceneProgressionRisk ? [`场景评分：${sceneReadabilityScore ?? '-'}`] : [] },
    { label: '爽点密度', items: payoffDensityRisk ? [`爽点密度评分：${payoffDensityScore ?? '-'}`] : [] },
    { label: '故事力缺口', items: limitedArray(payload.missed, payload.dimensions) },
    { label: '可读性/出戏', items: limitedArray(payload.meme_sense?.immersion_risks, payload.immersion_risks, payload.issues) },
    { label: '建议', items: limitedArray(payload.suggestions, payload.recommendations) },
  ]
    .map(group => ({
      ...group,
      items: group.items.map(summarizeEvidenceItem).filter(Boolean),
    }))
    .filter(group => group.items.length > 0)
  const openingHandoffMissed = arrayValue(payload.missed)
    .filter(isOpeningHandoffMiss)
    .map(summarizeEvidenceItem)
    .filter(Boolean)
  const payloadDeliveryReceipts = objectValue(payload.oh_story_delivery_receipts || payload.ohStoryDeliveryReceipts)
  const taskDeliveryReceipts = objectValue(task.oh_story_delivery_receipts || task.ohStoryDeliveryReceipts)
  const failedReceiptRepairs = normalizeFailedDeliveryRiskReceiptRepairs(
    payloadDeliveryReceipts.delivery_risk_receipts,
    payloadDeliveryReceipts.deliveryRiskReceipts,
    payload.delivery_risk_receipts,
    payload.deliveryRiskReceipts,
    taskDeliveryReceipts.delivery_risk_receipts,
    taskDeliveryReceipts.deliveryRiskReceipts,
    task.delivery_risk_receipts,
    task.deliveryRiskReceipts,
  )

  return {
    source_label: firstText(task.source_label, task.annotation_source, task.annotation_category, '交稿风险'),
    severity: firstText(task.severity),
    annotation_key: firstText(task.annotation_key),
    issue_type: issueType,
    category: firstText(task.annotation_category),
    openingHandoffMissed,
    openingPullRisk,
    openingHookScore,
    endingPageTurnRisk,
    endingHookScore,
    sceneProgressionRisk,
    sceneReadabilityScore,
    payoffDensityRisk,
    payoffDensityScore,
    evidenceGroups,
    failedReceiptRepairs,
    strategy: deliveryRiskStrategy(issueType, firstText(task.annotation_category)),
  }
}

export function normalizeApprovalBlockerRepairContext(task: AnyRecord) {
  const normalizedKind = `${firstText(task.issue_type, task.issueType)} ${firstText(task.annotation_category, task.annotationCategory)}`.toLowerCase()
  const payload = objectValue(task.payload)
  const isApprovalBlocker = normalizedKind.includes('approval_blocker')
    || firstText(task.source_label, task.sourceLabel) === '入库阻断'
    || Boolean(payload.type && firstText(payload.label, payload.type))
  if (!isApprovalBlocker) return null
  const safetyDecision = objectValue(payload.safety_decision || payload.safetyDecision)
  const reasons = [
    ...arrayValue(payload.reasons),
    ...arrayValue(safetyDecision.reasons),
  ].map(item => text(item)).filter(Boolean)
  const copyHitCount = metricNumber(payload.copy_hit_count ?? payload.copyHitCount ?? safetyDecision.copy_hit_count ?? safetyDecision.copyHitCount)
  return {
    type: firstText(payload.type, task.issue_type, task.issueType, 'approval_blocker'),
    label: firstText(payload.label, task.title, task.source_label, task.sourceLabel, '入库阻断'),
    detail: firstText(payload.detail, task.message),
    scoreLabel: firstText(payload.score_label, payload.scoreLabel),
    copyHitCount,
    reasons,
  }
}

export function approvalBlockerNeedsNextChapterQualityPlan(approvalBlocker: ReturnType<typeof normalizeApprovalBlockerRepairContext>) {
  if (!approvalBlocker) return false
  return [
    approvalBlocker.detail,
    approvalBlocker.label,
    approvalBlocker.type,
    ...approvalBlocker.reasons,
  ].some(item => /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失/.test(text(item)))
}

export function qualityContractClosurePlan(
  task: AnyRecord,
  revisionResult: AnyRecord,
  snakeKey: string,
  camelKey: string,
  label: string,
) {
  const annotationKey = firstText(task.annotation_key)
  const quality = objectValue(revisionResult.quality_refresh)
  const qualityOk = quality.ok === true
  const residuals = qualityContractResidualsFromQuality(quality, snakeKey, camelKey, label)
  const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
  if (!qualityOk) {
    return {
      taskStatus: 'needs_review' as const,
      annotationStatus: '' as const,
      annotationKey,
      note: `${label}已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
    }
  }
  if (!residuals.length) {
    return {
      taskStatus: 'resolved' as const,
      annotationStatus: annotationKey ? 'resolved' as const : '' as const,
      annotationKey,
      note: `${label}复检通过${scoreText}，${snakeKey} 已清空。`,
    }
  }
  return {
    taskStatus: 'needs_review' as const,
    annotationStatus: '' as const,
    annotationKey,
    note: `${label}仍未闭环：${residuals.slice(0, 3).join('；')}。`,
  }
}

export function buildDeliveryRiskRevisionClosurePlan(task: AnyRecord, revisionResult: AnyRecord = {}) {
  const isStorylineDecision = task?.source === 'storyline_diff_decision' || Boolean(task?.decision_key)
  if (isStorylineDecision) {
    const quality = objectValue(revisionResult.quality_refresh)
    const storyStateUpdate = objectValue(revisionResult.story_state_update)
    const storylineSync = objectValue(storyStateUpdate.storyline_sync || revisionResult.storyline_sync)
    const missedCount = arrayValue(storylineSync.missed).length
    const unplannedCount = arrayValue(storylineSync.unplanned).length
    const forbiddenCount = arrayValue(storylineSync.forbidden_touched || storylineSync.forbiddenTouched).length
    const diffCount = missedCount + unplannedCount + forbiddenCount
    const qualityOk = quality.ok !== false
    const status = firstText(storylineSync.status)
    const cleared = qualityOk && (status === 'ok' || diffCount === 0)
    const decisionKey = firstText(task.decision_key)
    const diffSummary = [
      missedCount ? `漏推 ${missedCount}` : '',
      unplannedCount ? `额外推进 ${unplannedCount}` : '',
      forbiddenCount ? `禁揭 ${forbiddenCount}` : '',
    ].filter(Boolean).join('，')
    if (cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `剧情线决策复检通过${decisionKey ? `：${decisionKey}` : ''}。`,
      }
    }
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `剧情线决策已执行，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `剧情线仍有差异：${diffSummary || firstText(storylineSync.label, status, '需要人工复查')}。`,
    }
  }

  const isRecoveryEvidenceMismatch = firstText(task?.issue_type, task?.issueType) === 'recovery_evidence_mismatch'
  if (isRecoveryEvidenceMismatch) {
    const singleChapterRecoveryEvidence = isSingleChapterRecoveryEvidenceTask(task)
    const quality = objectValue(revisionResult.quality_refresh)
    const recoveryReview = objectValue(revisionResult.recovery_evidence_review || revisionResult.recoveryEvidenceReview)
    const convergence = objectValue(revisionResult.delivery_risk_convergence)
    const qualityOk = quality.ok === true
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    const hasRecoveryReview = Object.keys(recoveryReview).length > 0
    const hasFailedEvidenceField = Array.isArray(recoveryReview.failed_evidence) || Array.isArray(recoveryReview.failedEvidence)
    const failedEvidence = arrayValue(recoveryReview.failed_evidence || recoveryReview.failedEvidence)
      .map(item => summarizeEvidenceItem(item))
      .filter(Boolean)
    const reviewStatus = firstText(recoveryReview.status)
    const convergenceStatus = firstText(convergence.status)
    const hasConvergence = Object.keys(convergence).length > 0
    const hasResidualField = convergence.residual_count !== undefined || convergence.residualCount !== undefined
    const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? 0) || 0)
    const clearedByRecoveryReview = hasRecoveryReview && (reviewStatus === 'ok' || (hasFailedEvidenceField && failedEvidence.length === 0))
    const clearedByConvergence = !hasRecoveryReview && hasConvergence && (convergenceStatus === 'cleared' || (hasResidualField && residualCount === 0))
    const cleared = qualityOk && (clearedByRecoveryReview || clearedByConvergence)
    if (cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: singleChapterRecoveryEvidence
          ? `单章治理复查通过${scoreText}，governance_recheck_sync failed_evidence 已清空。`
          : `恢复依据复检通过${scoreText}，failed_evidence 已清空。`,
      }
    }
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: singleChapterRecoveryEvidence
          ? `单章恢复依据已回修，但治理复查未通过：${firstText(quality.error, '需要人工复查')}。`
          : `恢复依据已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    const evidenceSummary = failedEvidence.length > 0
      ? failedEvidence.slice(0, 3).join('；')
      : firstText(recoveryReview.summary, convergence.label, convergence.summary, reviewStatus, convergenceStatus, '需要人工复查')
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `${singleChapterRecoveryEvidence ? '单章恢复依据' : '恢复依据'}仍有失效项：${evidenceSummary}${residualCount ? `，残留 ${residualCount} 项` : ''}。`,
    }
  }

  const isPostBatchQualityWarning = firstText(task?.issue_type, task?.issueType) === 'post_batch_quality_warning'
  if (isPostBatchQualityWarning) {
    const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
    const qualityOk = quality.ok === true
    const qualityResult = normalizePostBatchQualityClosureResult(revisionResult)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `批次质检已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (qualityResult.cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `批次质检复检通过${scoreText}，post_batch_quality_check 已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `批次质检仍未闭环：${qualityResult.residuals.slice(0, 4).join('；')}。`,
    }
  }

  const postDeliveryQualityRepair = normalizePostDeliveryQualityRepair(task || {})
  if (postDeliveryQualityRepair) {
    const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
    const qualityOk = quality.ok === true
    const qualityResult = normalizePostDeliveryQualityClosureResult(task || {}, revisionResult)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `单章交付后质检已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (qualityResult.cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `单章交付后质检复检通过${scoreText}，post_delivery_quality 已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `单章交付后质检仍未闭环：${qualityResult.residuals.slice(0, 4).join('；')}。`,
    }
  }

  const approvalBlocker = normalizeApprovalBlockerRepairContext(task || {})
  if (approvalBlocker) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const convergence = objectValue(revisionResult.delivery_risk_convergence)
    const after = objectValue(convergence.after)
    const afterHasBlockerField = Object.prototype.hasOwnProperty.call(after, 'approval_blocker')
      || Object.prototype.hasOwnProperty.call(after, 'approvalBlocker')
    const afterBlocker = after.approval_blocker || after.approvalBlocker || null
    const qualityOk = quality.ok === true
    const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? after.total_count ?? after.totalCount ?? 0) || 0)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `入库阻断已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (afterHasBlockerField && !afterBlocker) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}${residualCount ? `，仍有其他交稿风险 ${residualCount} 项需继续处理` : ''}。`,
      }
    }
    if (!afterHasBlockerField && (firstText(convergence.status) === 'cleared' || residualCount === 0)) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}，交稿风险已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `入库阻断仍未解除：${firstText(afterBlocker?.label, afterBlocker?.detail, convergence.label, convergence.summary, '需要人工复查')}。`,
    }
  }

  const sceneCardReceiptRepair = normalizeSceneCardReceiptRepair(task || {})
  if (sceneCardReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sceneCardReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `场景卡回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `场景卡回执复检通过${scoreText}，scene_card_receipt 相关残留已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `场景卡回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const sceneCardDirectiveRepair = normalizeSceneCardDirectiveRepair(task || {})
  if (sceneCardDirectiveRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sceneCardDirectiveResidualsFromQuality(quality, sceneCardDirectiveRepair.issueType)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `场景卡执行禁令已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `场景卡执行禁令复检通过${scoreText}，scene_card_*_execution_directives / forbidden_directives 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `场景卡执行禁令仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const deslopRepairReceiptRepair = normalizeDeslopRepairReceiptRepair(task || {})
  if (deslopRepairReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = deslopRepairReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `去AI味修复回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `去AI味修复回执复检通过${scoreText}，deslop_repair_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `去AI味修复回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionCascadeImpactRepair = normalizeRevisionCascadeImpactRepair(task || {})
  if (revisionCascadeImpactRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionCascadeImpactResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订级联影响已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订级联影响复检通过${scoreText}，revision_cascade_impact_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订级联影响仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionScopeGuardRepair = normalizeRevisionScopeGuardRepair(task || {})
  if (revisionScopeGuardRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionScopeGuardResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订幅度已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订幅度复检通过${scoreText}，revision_scope_guard_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订幅度仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionContextReceiptRepair = normalizeRevisionContextReceiptRepair(task || {})
  if (revisionContextReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionContextReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订上下文已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订上下文复检通过${scoreText}，revision_context_receipts_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订上下文仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const proseRevisionReceiptRepair = normalizeProseRevisionReceiptSyncRepair(task || {})
  if (proseRevisionReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = proseRevisionReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订回执复检通过${scoreText}，prose_revision_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityAuditRepairReceiptRepair = normalizeQualityAuditRepairReceiptRepair(task || {})
  if (qualityAuditRepairReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityAuditRepairReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `质量诊断修复回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `质量诊断修复回执复检通过${scoreText}，quality_audit_repair_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `质量诊断修复回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityAuditRepair = normalizeQualityAuditRepair(task || {})
  if (qualityAuditRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityAuditResidualsFromQuality(quality, qualityAuditRepair.issueType)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `质量诊断已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `质量诊断复检通过${scoreText}，quality_audit_checks 相关 fail/warn 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `质量诊断仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSourceReadinessRepair = firstText(task?.issue_type, task?.issueType) === 'source_readiness_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'source_readiness'
  if (isSourceReadinessRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sourceReadinessResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `来源就绪已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `来源就绪复检通过${scoreText}，source_readiness_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `来源就绪仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStateTrackingRepair = firstText(task?.issue_type, task?.issueType) === 'state_tracking_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'state_tracking'
  if (isStateTrackingRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = stateTrackingResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `状态跟踪已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `状态跟踪复检通过${scoreText}，state_tracking_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `状态跟踪仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStoryStateUpdateRepair = repairTaskIssueType(task || {}) === 'story_state_update_gap'
    || repairTaskIssueType(task || {}) === 'state_delta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_state'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_state_update'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'state_delta'
  if (isStoryStateUpdateRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'story_state_update_checks', 'storyStateUpdateChecks', '状态写回')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `状态写回已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `状态写回复检通过${scoreText}，story_state_update_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `状态写回仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityContractRepairIssueType = repairTaskIssueType(task || {})
  const qualityContractRepairCategory = firstText(task?.annotation_category, task?.annotationCategory, task?.category)
  const qualityContractRepair = [
    {
      issueTypes: ['innovation_missed', 'innovation_execution_missed'],
      categories: ['innovation'],
      snakeKey: 'innovation_checks',
      camelKey: 'innovationChecks',
      label: '创新执行',
    },
    {
      issueTypes: ['chapter_attraction_gap'],
      categories: ['chapter_attraction'],
      snakeKey: 'chapter_attraction_checks',
      camelKey: 'chapterAttractionChecks',
      label: '章节吸引力',
    },
    {
      issueTypes: ['story_drive_gap'],
      categories: ['story_drive'],
      snakeKey: 'story_drive_checks',
      camelKey: 'storyDriveChecks',
      label: '故事驱动力',
    },
    {
      issueTypes: ['character_arc_gap'],
      categories: ['character_arc'],
      snakeKey: 'character_arc_checks',
      camelKey: 'characterArcChecks',
      label: '人物弧光',
    },
    {
      issueTypes: ['chapter_benchmark_gap'],
      categories: ['chapter_benchmark'],
      snakeKey: 'chapter_benchmark_checks',
      camelKey: 'chapterBenchmarkChecks',
      label: '章节标杆',
    },
    {
      issueTypes: ['style_sample_gap'],
      categories: ['style_sample'],
      snakeKey: 'style_sample_checks',
      camelKey: 'styleSampleChecks',
      label: '样章风格',
    },
  ].find(config => config.issueTypes.includes(qualityContractRepairIssueType) || config.categories.includes(qualityContractRepairCategory))
  if (qualityContractRepair) {
    return qualityContractClosurePlan(
      task,
      revisionResult,
      qualityContractRepair.snakeKey,
      qualityContractRepair.camelKey,
      qualityContractRepair.label,
    )
  }

  const deliveryRiskForClosure = normalizeDeliveryRiskContext(task || {})
  const issueTypeForClosure = firstText(task?.issue_type, task?.issueType)
  const isChapterHandoffRepair = issueTypeForClosure === 'chapter_handoff_missed'
    || issueTypeForClosure === 'opening_handoff_debt'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_handoff'
    || Boolean(deliveryRiskForClosure?.openingHandoffMissed?.length)
  if (isChapterHandoffRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章首承接已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章首承接复检通过${scoreText}，chapter_handoff_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章首承接仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const issueTypeForWordCountClosure = repairTaskIssueType(task || {})
  const isWordCountRepair = issueTypeForWordCountClosure === 'word_count_gap'
    || issueTypeForWordCountClosure === 'chapter_word_count_gap'
    || issueTypeForWordCountClosure === 'chapter_length_gap'
    || issueTypeForWordCountClosure === 'length_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'word_count'
  if (isWordCountRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'word_count_checks', 'wordCountChecks', '字数验证')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `字数验证已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `字数验证复检通过${scoreText}，word_count_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `字数验证仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStyleBoundaryRepair = firstText(task?.issue_type, task?.issueType) === 'style_boundary_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'style_boundary'
  if (isStyleBoundaryRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `风格边界已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `风格边界复检通过${scoreText}，style_boundary_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `风格边界仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isInformationFlowRepair = firstText(task?.issue_type, task?.issueType) === 'information_flow_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'information_flow'
  if (isInformationFlowRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'information_flow_checks', 'informationFlowChecks', '信息流')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `信息流已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `信息流复检通过${scoreText}，information_flow_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `信息流仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isExpectationThresholdRepair = firstText(task?.issue_type, task?.issueType) === 'expectation_threshold_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'expectation_threshold'
  if (isExpectationThresholdRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `期待阈值已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `期待阈值复检通过${scoreText}，expectation_threshold_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `期待阈值仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStoryLoopRepair = firstText(task?.issue_type, task?.issueType) === 'story_loop_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_loop'
  if (isStoryLoopRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `故事闭环已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `故事闭环复检通过${scoreText}，story_loop_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `故事闭环仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isEmotionalArcRepair = firstText(task?.issue_type, task?.issueType) === 'emotional_arc_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'emotional_arc'
  if (isEmotionalArcRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `情绪弧已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `情绪弧复检通过${scoreText}，emotional_arc_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `情绪弧仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterHookRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_hook_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_hook'
  if (isChapterHookRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章级钩子已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章级钩子复检通过${scoreText}，chapter_hook_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章级钩子仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isParagraphHookRepair = firstText(task?.issue_type, task?.issueType) === 'paragraph_hook_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'paragraph_hook'
  if (isParagraphHookRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `段落级钩子已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `段落级钩子复检通过${scoreText}，paragraph_hook_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `段落级钩子仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSuspenseRepair = firstText(task?.issue_type, task?.issueType) === 'suspense_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'suspense'
  if (isSuspenseRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'suspense_checks', 'suspenseChecks', '悬念编排')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `悬念编排已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `悬念编排复检通过${scoreText}，suspense_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `悬念编排仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isAssetLinkageRepair = firstText(task?.issue_type, task?.issueType) === 'asset_linkage_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'asset_linkage'
  if (isAssetLinkageRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `资产挂钩已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `资产挂钩复检通过${scoreText}，asset_linkage_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `资产挂钩仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDialogueRepair = firstText(task?.issue_type, task?.issueType) === 'dialogue_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'dialogue'
  if (isDialogueRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'dialogue_checks', 'dialogueChecks', '对白质量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `对白质量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `对白质量复检通过${scoreText}，dialogue_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `对白质量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPlotDynamicsRepair = firstText(task?.issue_type, task?.issueType) === 'plot_dynamics_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'plot_dynamics'
  if (isPlotDynamicsRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `剧情动力已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `剧情动力复检通过${scoreText}，plot_dynamics_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `剧情动力仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterRelationRepair = firstText(task?.issue_type, task?.issueType) === 'character_relation_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_relation'
  if (isCharacterRelationRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_relation_checks', 'characterRelationChecks', '角色关系')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色关系已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色关系复检通过${scoreText}，character_relation_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色关系仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterBehaviorRepair = firstText(task?.issue_type, task?.issueType) === 'character_behavior_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_behavior'
  if (isCharacterBehaviorRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色行为已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色行为复检通过${scoreText}，character_behavior_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色行为仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isConflictStructureRepair = firstText(task?.issue_type, task?.issueType) === 'conflict_structure_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'conflict_structure'
  if (isConflictStructureRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `冲突结构已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `冲突结构复检通过${scoreText}，conflict_structure_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `冲突结构仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBridgeUnitRepair = firstText(task?.issue_type, task?.issueType) === 'bridge_unit_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'bridge_unit'
  if (isBridgeUnitRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `桥段节奏已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `桥段节奏复检通过${scoreText}，bridge_unit_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `桥段节奏仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isReversalRepair = firstText(task?.issue_type, task?.issueType) === 'reversal_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'reversal'
  if (isReversalRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'reversal_checks', 'reversalChecks', '反转设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `反转设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `反转设计复检通过${scoreText}，reversal_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `反转设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isShowdownRepair = firstText(task?.issue_type, task?.issueType) === 'showdown_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'showdown'
  if (isShowdownRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'showdown_checks', 'showdownChecks', '高潮对抗')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `高潮对抗已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `高潮对抗复检通过${scoreText}，showdown_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `高潮对抗仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isOpeningRepair = firstText(task?.issue_type, task?.issueType) === 'opening_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'opening'
  if (isOpeningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'opening_checks', 'openingChecks', '开篇设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `开篇设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `开篇设计复检通过${scoreText}，opening_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `开篇设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isProseCraftRepair = firstText(task?.issue_type, task?.issueType) === 'prose_craft_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'prose_craft'
  if (isProseCraftRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `正文工艺已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `正文工艺复检通过${scoreText}，prose_craft_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `正文工艺仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPunctuationToneRepair = firstText(task?.issue_type, task?.issueType) === 'punctuation_tone_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'punctuation_tone'
  if (isPunctuationToneRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `语气标点已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `语气标点复检通过${scoreText}，punctuation_tone_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `语气标点仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isContentRubricRepair = firstText(task?.issue_type, task?.issueType) === 'content_rubric_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'content_rubric'
  if (isContentRubricRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `内容基准已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `内容基准复检通过${scoreText}，content_rubric_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `内容基准仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isTargetReaderRepair = firstText(task?.issue_type, task?.issueType) === 'target_reader_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'target_reader'
  if (isTargetReaderRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'target_reader_checks', 'targetReaderChecks', '目标读者')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `目标读者已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `目标读者复检通过${scoreText}，target_reader_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `目标读者仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isGenrePositioningRepair = firstText(task?.issue_type, task?.issueType) === 'genre_positioning_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'genre_positioning'
  if (isGenrePositioningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `题材定位已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `题材定位复检通过${scoreText}，genre_positioning_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `题材定位仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isFemaleAudienceRepair = firstText(task?.issue_type, task?.issueType) === 'female_audience_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'female_audience'
  if (isFemaleAudienceRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `女频长篇已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `女频长篇复检通过${scoreText}，female_audience_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `女频长篇仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isUpgradeRhythmRepair = firstText(task?.issue_type, task?.issueType) === 'upgrade_rhythm_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'upgrade_rhythm'
  if (isUpgradeRhythmRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `升级节奏已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `升级节奏复检通过${scoreText}，upgrade_rhythm_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `升级节奏仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterStructureRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_structure_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_structure'
  if (isChapterStructureRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'structure_checks', 'structureChecks', '章节结构')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章节结构已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章节结构复检通过${scoreText}，structure_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章节结构仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterProgressionRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_progression_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_progression'
  if (isChapterProgressionRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'progression_checks', 'progressionChecks', '章节推进')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章节推进已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章节推进复检通过${scoreText}，progression_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章节推进仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isInformationLoadRepair = firstText(task?.issue_type, task?.issueType) === 'information_load_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'information_load'
  if (isInformationLoadRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'information_checks', 'informationChecks', '信息负载')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `信息负载已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `信息负载复检通过${scoreText}，information_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `信息负载仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isLongformContinuityRepair = firstText(task?.issue_type, task?.issueType) === 'longform_continuity_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'longform_continuity'
  if (isLongformContinuityRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'longform_checks', 'longformChecks', '长篇连续性')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `长篇连续性已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `长篇连续性复检通过${scoreText}，longform_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `长篇连续性仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCoreContractRepair = firstText(task?.issue_type, task?.issueType) === 'core_contract_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'core_contract'
  if (isCoreContractRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'core_contract_checks', 'coreContractChecks', '核心契约')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `核心契约已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `核心契约复检通过${scoreText}，core_contract_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `核心契约仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isContinuityHeatRepair = firstText(task?.issue_type, task?.issueType) === 'continuity_heat_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'continuity_heat'
  if (isContinuityHeatRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `连续性热度已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `连续性热度复检通过${scoreText}，continuity_heat_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `连续性热度仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isRevisionReceiptRepair = firstText(task?.issue_type, task?.issueType) === 'revision_receipt_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'revision_receipt'
  if (isRevisionReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订回执复检通过${scoreText}，revision_receipt_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeslopRepairCheckRepair = firstText(task?.issue_type, task?.issueType) === 'deslop_repair_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deslop_repair'
  if (isDeslopRepairCheckRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `去AI味修复已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `去AI味修复复检通过${scoreText}，deslop_repair_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `去AI味修复仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isProseMetaRepair = firstText(task?.issue_type, task?.issueType) === 'prose_meta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'prose_meta'
  if (isProseMetaRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `正文元叙事已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `正文元叙事复检通过${scoreText}，prose_meta_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `正文元叙事仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBannedWordsRepair = repairTaskIssueType(task || {}) === 'banned_words_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'banned_words'
  if (isBannedWordsRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'banned_words_checks', 'bannedWordsChecks', '禁用词扫描')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `禁用词扫描已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `禁用词扫描复检通过${scoreText}，banned_words_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `禁用词扫描仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isTitleUniquenessRepair = repairTaskIssueType(task || {}) === 'title_uniqueness_gap'
    || repairTaskIssueType(task || {}) === 'chapter_title_uniqueness'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'title_uniqueness'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_title_uniqueness'
  if (isTitleUniquenessRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'title_uniqueness_checks', 'titleUniquenessChecks', '标题去重')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `标题去重已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `标题去重复检通过${scoreText}，title_uniqueness_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `标题去重仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBlueprintConsumptionRepair = repairTaskIssueType(task || {}) === 'blueprint_consumption_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'blueprint_consumption'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_blueprint'
  if (isBlueprintConsumptionRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'blueprint_consumption_checks', 'blueprintConsumptionChecks', '细纲兑现')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `细纲兑现已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `细纲兑现复检通过${scoreText}，blueprint_consumption_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `细纲兑现仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isForeshadowingDeltaRepair = repairTaskIssueType(task || {}) === 'foreshadowing_delta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'foreshadowing_delta'
  if (isForeshadowingDeltaRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'foreshadowing_delta_checks', 'foreshadowingDeltaChecks', '伏笔增量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `伏笔增量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `伏笔增量复检通过${scoreText}，foreshadowing_delta_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `伏笔增量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeterministicCleanupRepair = repairTaskIssueType(task || {}) === 'deterministic_cleanup_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deterministic_cleanup'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deterministic_prose_cleanup'
  if (isDeterministicCleanupRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = deterministicProseCleanupResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `确定性清理已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `确定性清理复检通过${scoreText}，deterministic_prose_cleanup.risk_count 为 0。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `确定性清理仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSerialRiskRepair = firstText(task?.issue_type, task?.issueType) === 'serial_risk_repair_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'serial_risk_repair'
  if (isSerialRiskRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `连续风险修复已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `连续风险修复复检通过${scoreText}，serial_risk_repair_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `连续风险修复仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterHookQualityRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_hook_quality_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_hook_quality'
  if (isChapterHookQualityRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章钩质量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章钩质量复检通过${scoreText}，chapter_hook_quality_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章钩质量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isReaderRetentionCheckRepair = firstText(task?.issue_type, task?.issueType) === 'reader_retention_gap'
    || Boolean(task?.reader_retention_check_sync || task?.readerRetentionCheckSync)
  if (isReaderRetentionCheckRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `追读雷达已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `追读雷达复检通过${scoreText}，reader_retention_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `追读雷达仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const preDraftExecutionKey = preDraftExecutionReceiptKeyForTask(task || {})
  if (preDraftExecutionKey) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = preDraftExecutionResidualsFromQuality(quality, preDraftExecutionKey.snake, preDraftExecutionKey.camel)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `${preDraftExecutionKey.label}已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `${preDraftExecutionKey.label}写前执行回执复检通过${scoreText}，${preDraftExecutionKey.snake} 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `写前执行回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeliveryRisk = task?.source === 'review_annotation_risk' || Boolean(task?.annotation_key)
  if (!isDeliveryRisk) {
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: '非交稿风险任务，修订后等待人工复查。',
    }
  }
  const annotationKey = firstText(task.annotation_key)
  const quality = objectValue(revisionResult.quality_refresh)
  const convergence = objectValue(revisionResult.delivery_risk_convergence)
  const qualityOk = quality.ok === true
  const convergenceStatus = firstText(convergence.status)
  const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? 0) || 0)
  const cleared = qualityOk && (convergenceStatus === 'cleared' || residualCount === 0)
  const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
  const convergenceLabel = firstText(convergence.label, convergence.summary, convergenceStatus || '风险收敛结果未知')
  if (cleared) {
    return {
      taskStatus: 'resolved',
      annotationStatus: annotationKey ? 'resolved' : '',
      annotationKey,
      note: `修订后自动复检通过${scoreText}，${convergenceLabel}。`,
    }
  }
  if (!qualityOk) {
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订稿已生成，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
    }
  }
  return {
    taskStatus: 'needs_review',
    annotationStatus: '',
    annotationKey,
    note: `修订后仍需复查：${convergenceLabel}${residualCount ? `，残留 ${residualCount} 项` : ''}。`,
  }
}

export function batchBriefFromRun(run?: AnyRecord | null) {
  const input = parseJsonValue(run?.input_ref) || {}
  const output = parseJsonValue(run?.output_ref) || {}
  return input.next_batch_brief || input.nextBatchBrief || output.next_batch_brief || output.nextBatchBrief || null
}

export function normalizeChapterPlan(value: any) {
  if (!value) return null
  return {
    chapter_no: Number(value.chapter_no ?? value.chapterNo ?? 0) || null,
    title: firstText(value.title),
    chapter_task: firstText(value.chapter_task, value.chapterTask, value.task),
    conflict: firstText(value.conflict),
    ending_hook: firstText(value.ending_hook, value.endingHook),
    mainline_progress: firstText(value.mainline_progress, value.mainlineProgress),
  }
}

export function normalizeBatchPlanContext(task: AnyRecord, run?: AnyRecord | null) {
  const embedded = task.batch_plan_context || task.batchPlanContext || null
  const batchBrief = embedded || batchBriefFromRun(run) || null
  if (!batchBrief) return null
  const chapterNo = Number(task.chapter_no ?? task.chapterNo ?? 0)
  const embeddedChapterPlan = embedded?.chapter_plan || embedded?.chapterPlan || null
  const briefChapterPlan = arrayValue(batchBrief.chapters)
    .find(item => Number(item?.chapter_no ?? item?.chapterNo ?? 0) === chapterNo)
  return {
    batch_goal: firstText(batchBrief.batch_goal, batchBrief.batchGoal),
    reader_payoff_plan: firstText(batchBrief.reader_payoff_plan, batchBrief.readerPayoffPlan),
    mainline_focus: firstText(batchBrief.mainline_focus, batchBrief.mainlineFocus),
    forbidden_boundary: firstText(batchBrief.forbidden_boundary, batchBrief.forbiddenBoundary),
    chapter_plan: normalizeChapterPlan(embeddedChapterPlan || briefChapterPlan),
  }
}

export function normalizeRecoveryEvidenceReview(task: AnyRecord) {
  const review = objectValue(task.recovery_evidence_review || task.recoveryEvidenceReview)
  const failedItems = arrayValue(review.failed_items || review.failedItems)
    .map(item => {
      const value = objectValue(item)
      return {
        evidence: firstText(value.evidence, value.text, value.label, value.summary, summarizeEvidenceItem(item)),
        riskLabels: arrayValue(value.risk_labels || value.riskLabels)
          .map(label => text(label))
          .filter(Boolean),
      }
    })
    .filter(item => item.evidence)
  const failedEvidence = arrayValue(review.failed_evidence || review.failedEvidence)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const rows = failedItems.length > 0
    ? failedItems
    : failedEvidence.map(item => ({ evidence: item, riskLabels: [] }))
  const allEvidence = arrayValue(review.evidence)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const watchItems = arrayValue(review.watch_items || review.watchItems)
    .map(item => summarizeEvidenceItem(item))
    .filter(Boolean)
  const summary = firstText(review.summary, task.issue_type === 'recovery_evidence_mismatch' ? task.message : '')
  if (!rows.length && !summary && !allEvidence.length && !watchItems.length && task.issue_type !== 'recovery_evidence_mismatch') return null
  return {
    status: firstText(review.status),
    summary,
    rows,
    allEvidence,
    watchItems,
  }
}

export function normalizeExpansionStructureValidationTrend(task: AnyRecord, review: AnyRecord) {
  const trend = objectValue(
    review.expansion_structure_validation_trend
    || review.expansionStructureValidationTrend
    || task.expansion_structure_validation_trend
    || task.expansionStructureValidationTrend,
  )
  if (!Object.keys(trend).length || trend.visible === false) return null
  const validationBatchCount = Number(trend.validation_batch_count ?? trend.validationBatchCount ?? 0)
  const passedBatchCount = Number(trend.passed_batch_count ?? trend.passedBatchCount ?? 0)
  const failedBatchCount = Number(trend.failed_batch_count ?? trend.failedBatchCount ?? 0)
  const latestChapterNos = arrayValue(trend.latest_chapter_nos || trend.latestChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const failureReasons = arrayValue(trend.failure_reasons || trend.failureReasons)
    .map(item => objectValue(item))
    .map(item => ({
      label: firstText(item.label, item.key),
      count: Number(item.count || 0),
    }))
    .filter(item => item.label && item.count > 0)
  const recurrence = objectValue(trend.recurrence_after_restore || trend.recurrenceAfterRestore)
  const recurrenceChapterNos = arrayValue(recurrence.recurrence_chapter_nos || recurrence.recurrenceChapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)

  return {
    status: firstText(trend.status),
    label: firstText(trend.label, '扩批结构验证趋势'),
    summary: firstText(trend.summary),
    segmentLabel: firstText(trend.segment_label, trend.segmentLabel, '复发段位'),
    passRate: Number(trend.pass_rate ?? trend.passRate ?? 0),
    validationBatchCount,
    passedBatchCount,
    failedBatchCount,
    latestStatus: firstText(trend.latest_status, trend.latestStatus),
    latestChapterNos,
    failureReasons,
    recurrence: {
      visible: Boolean(recurrence.visible),
      intervalBatchCount: Number(recurrence.interval_batch_count ?? recurrence.intervalBatchCount ?? 0),
      intervalLabel: firstText(recurrence.interval_label, recurrence.intervalLabel),
      recurrenceChapterNos,
    },
  }
}

export function compactChapterNosForPrompt(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  return `第${chapterNos.slice(0, 6).join('、')}章${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

export function defaultLaneTemplateRepairActionForPrompt(requirement: AnyRecord) {
  const key = firstText(requirement.key)
  const label = firstText(requirement.label, requirement.key, '模板缺项')
  const chapterText = compactChapterNosForPrompt(arrayValue(requirement.chapter_nos || requirement.chapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0))
  if (key === 'default_lane_segment_duty') return `段位职责修复：${chapterText}必须明确本章在默认5章档位里的段位职责，不能只写单章事件。`
  if (key === 'default_lane_conflict_rotation') return `冲突轮换修复：${chapterText}必须更换冲突来源，写清规则压迫、人物对抗或信息误导的轮换位置。`
  if (key === 'default_lane_payoff_density') return `回报密度修复：${chapterText}必须补出显性回报，让读者看到收益、反制结果或阶段结算。`
  if (key === 'default_lane_ending_hook_template') return `章末追读模板修复：${chapterText}最后300字必须落触发事件、读者问题和下一章风险。`
  return `${label}修复：${chapterText}必须补成正文可见模板回执。`
}

export function defaultLaneTemplateRedesignInstructionForPrompt(requirement: AnyRecord) {
  const key = firstText(requirement.key)
  if (key === 'default_lane_segment_duty') return '重写每章在5章档位中的前段/中段/后段职责。'
  if (key === 'default_lane_conflict_rotation') return '重写规则压迫、人物对抗、信息误导的轮换顺序。'
  if (key === 'default_lane_payoff_density') return '重写每章显性回报预算，避免连续铺垫。'
  if (key === 'default_lane_ending_hook_template') return '重写最后300字触发事件、读者问题和下一章风险。'
  return '重写该模板项，并给下一轮验证批设置逐章可回填标准。'
}

export function normalizeDefaultLaneTemplateProductionFailedRequirements(source: AnyRecord, fallback: AnyRecord | null = null) {
  return arrayValue(
    source.production_failed_requirements
    || source.productionFailedRequirements
    || fallback?.failed_requirements
    || fallback?.failedRequirements,
  )
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.name, item.key, '模板要求'),
      failureReason: firstText(item.failure_reason, item.failureReason),
      chapterNos: arrayValue(item.chapter_nos || item.chapterNos)
        .map(chapterNo => Number(chapterNo))
        .filter(chapterNo => chapterNo > 0),
    }))
    .filter(item => item.key || item.label || item.failureReason || item.chapterNos.length)
}

export function normalizeDefaultLaneTemplateProductionRelapseVerdict(source: AnyRecord) {
  const verdict = objectValue(source.production_relapse_verdict || source.productionRelapseVerdict)
  if (!Object.keys(verdict).length || verdict.visible === false) return null
  return {
    status: firstText(verdict.status),
    label: firstText(verdict.label, '默认档位模板生产后验判定'),
    templateVersionId: firstText(verdict.template_version_id, verdict.templateVersionId),
    defaultBatchChapterNos: arrayValue(verdict.default_batch_chapter_nos || verdict.defaultBatchChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    restoreChapterNos: arrayValue(verdict.restore_chapter_nos || verdict.restoreChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    previousValidationChapterNos: arrayValue(verdict.previous_validation_chapter_nos || verdict.previousValidationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validationChapterNos: arrayValue(verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    failureReasons: arrayValue(verdict.failure_reasons || verdict.failureReasons).map(item => text(item)).filter(Boolean),
    clearedFailureReasons: arrayValue(verdict.cleared_failure_reasons || verdict.clearedFailureReasons).map(item => text(item)).filter(Boolean),
    remainingFailureReasons: arrayValue(verdict.remaining_failure_reasons || verdict.remainingFailureReasons).map(item => text(item)).filter(Boolean),
    failedCount: Number(verdict.failed_count ?? verdict.failedCount ?? 0),
    failedRequirements: normalizeDefaultLaneTemplateProductionFailedRequirements({}, verdict),
    summary: firstText(verdict.summary),
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRepair(review: AnyRecord) {
  const explicit = objectValue(
    review.default_five_chapter_lane_template_repair
    || review.defaultFiveChapterLaneTemplateRepair,
  )
  const validationResult = objectValue(review.validation_result || review.validationResult)
  const verdict = objectValue(
    validationResult.default_five_chapter_lane_template_verdict
    || validationResult.defaultFiveChapterLaneTemplateVerdict,
  )
  const source = Object.keys(explicit).length ? explicit : verdict
  if (!Object.keys(source).length || source.visible === false) return null
  const missingRequirements = arrayValue(source.missing_requirements || source.missingRequirements)
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.name, item.key, '模板缺项'),
      chapterNos: arrayValue(item.chapter_nos || item.chapterNos)
        .map(chapterNo => Number(chapterNo))
        .filter(chapterNo => chapterNo > 0),
    }))
    .filter(item => item.key || item.label || item.chapterNos.length)
  const productionRelapseVerdict = normalizeDefaultLaneTemplateProductionRelapseVerdict(source)
  const productionFailedRequirements = normalizeDefaultLaneTemplateProductionFailedRequirements(source, productionRelapseVerdict as any)
  if (!missingRequirements.length && !productionFailedRequirements.length && productionRelapseVerdict?.status !== 'failed') return null
  const repairActions = arrayValue(source.repair_actions || source.repairActions)
    .map(item => text(item))
    .filter(Boolean)
  const missingText = firstText(source.repair_summary, source.repairSummary)
    || missingRequirements.map(item => `${compactChapterNosForPrompt(item.chapterNos)}缺${item.label}`).join('；')
  return {
    label: firstText(source.label, verdict.label, '默认档位模板验证缺项'),
    summary: firstText(source.summary, verdict.summary),
    validationChapterNos: arrayValue(source.validation_chapter_nos || source.validationChapterNos || verdict.validation_chapter_nos || verdict.validationChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    missingCount: Number(source.missing_count ?? source.missingCount ?? verdict.missing_count ?? verdict.missingCount ?? missingRequirements.length),
    missingRequirements,
    missingText,
    repairActions: repairActions.length
      ? repairActions
      : missingRequirements.map(defaultLaneTemplateRepairActionForPrompt),
    productionRelapseVerdict,
    productionFailedCount: Number(source.production_failed_count ?? source.productionFailedCount ?? productionRelapseVerdict?.failedCount ?? productionFailedRequirements.length),
    productionFailedRequirements,
  }
}

export function normalizeDefaultFiveChapterLaneTemplateRedesignQueue(review: AnyRecord) {
  const source = objectValue(
    review.default_five_chapter_lane_template_redesign_queue
    || review.defaultFiveChapterLaneTemplateRedesignQueue,
  )
  if (!Object.keys(source).length || source.visible === false) return null
  const topSource = objectValue(source.top_failed_requirement || source.topFailedRequirement)
  const topFailedRequirement = Object.keys(topSource).length ? {
    key: firstText(topSource.key),
    label: firstText(topSource.label, topSource.key, '模板缺项'),
    failedCount: Number(topSource.failed_count ?? topSource.failedCount ?? 0),
  } : null
  const redesignRequirements = arrayValue(source.redesign_requirements || source.redesignRequirements)
    .map(item => objectValue(item))
    .map(item => ({
      key: firstText(item.key),
      label: firstText(item.label, item.key, '模板项'),
      instruction: firstText(item.instruction, item.action, item.description, defaultLaneTemplateRedesignInstructionForPrompt(item)),
    }))
    .filter(item => item.key || item.label || item.instruction)
  const validationStandard = arrayValue(source.validation_standard || source.validationStandard)
    .map(item => text(item))
    .filter(Boolean)
  return {
    label: firstText(source.label, '默认档位模板重构队列'),
    summary: firstText(source.summary),
    status: firstText(source.status),
    source: firstText(source.source),
    recommendation: firstText(source.recommendation),
    latestChapterNos: arrayValue(source.latest_chapter_nos || source.latestChapterNos)
      .map(chapterNo => Number(chapterNo))
      .filter(chapterNo => chapterNo > 0),
    validationBatchCount: Number(source.validation_batch_count ?? source.validationBatchCount ?? 0),
    failedBatchCount: Number(source.failed_batch_count ?? source.failedBatchCount ?? 0),
    topFailedRequirement,
    redesignRequirements,
    validationStandard,
  }
}

export function normalizePostBatchQualityRepair(task: AnyRecord) {
  const raw = objectValue(task.post_batch_quality_check || task.postBatchQualityCheck)
  if (!Object.keys(raw).length && firstText(task.issue_type, task.issueType) !== 'post_batch_quality_warning') return null
  const checks = arrayValue(raw.checks)
    .map(item => objectValue(item))
    .map(item => {
      const status = firstText(item.status).toLowerCase()
      const warnCount = Number(item.warn_count ?? item.warnCount ?? 0)
      const unknownCount = Number(item.unknown_count ?? item.unknownCount ?? 0)
      const isWarning = warnCount > 0 || unknownCount > 0 || ['warn', 'warning', 'failed', 'error', 'unknown'].includes(status)
      return {
        key: firstText(item.key),
        label: firstText(item.label, item.key, '批次质检'),
        status,
        warnCount: warnCount || (isWarning ? 1 : 0),
        checkedCount: Number(item.checked_count ?? item.checkedCount ?? 0) || 0,
        summaries: arrayValue(item.summaries).map(summary => text(summary)).filter(Boolean),
        isWarning,
      }
    })
    .filter(item => item.isWarning)
  const chapterNos = arrayValue(raw.chapter_nos || raw.chapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const hasContent = checks.length > 0
    || firstText(raw.source)
    || firstText(raw.status)
    || firstText(task.message)
  if (!hasContent) return null
  return {
    source: firstText(raw.source),
    status: firstText(raw.status),
    chapterNos,
    averageScore: raw.average_score ?? raw.averageScore ?? null,
    revisedCount: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    checks,
  }
}

export function normalizePostDeliveryQualityRepair(task: AnyRecord) {
  const raw = objectValue(task.post_delivery_quality || task.postDeliveryQuality)
  if (!Object.keys(raw).length) return null
  const check = objectValue(
    raw.check
      || arrayValue(raw.checks).find((item: any) => {
        const status = firstText(item?.status).toLowerCase()
        const warnCount = Number(item?.warn_count ?? item?.warnCount ?? 0) || 0
        const unknownCount = Number(item?.unknown_count ?? item?.unknownCount ?? 0) || 0
        return status !== 'ok' || warnCount > 0 || unknownCount > 0
      })
      || raw.checks?.[0],
  )
  const summaries = [
    ...arrayValue(check.summaries).map(item => text(item)),
    firstText(check.summary, check.message, check.reason, check.detail, task.message),
  ].filter(Boolean)
  const acceptanceCriteria = arrayValue(task.acceptance_criteria || task.acceptanceCriteria)
    .map(item => text(item))
    .filter(Boolean)
  const checkKey = firstText(check.key, task.annotation_category, task.annotationCategory, task.issue_type, task.issueType)
  const checkLabel = firstText(check.label, checkKey, '交付后质检项')
  const hasContent = firstText(raw.source, raw.status, task.message, task.action)
    || checkKey
    || summaries.length > 0
    || acceptanceCriteria.length > 0
  if (!hasContent) return null
  return {
    source: firstText(raw.source),
    status: firstText(raw.status),
    score: raw.score ?? raw.review_score ?? raw.reviewScore ?? null,
    chapterNo: Number(raw.chapter_no ?? raw.chapterNo ?? task.chapter_no ?? task.chapterNo ?? 0) || null,
    checkKey,
    checkLabel,
    checkStatus: firstText(check.status),
    warnCount: Number(check.warn_count ?? check.warnCount ?? 0) || 0,
    unknownCount: Number(check.unknown_count ?? check.unknownCount ?? 0) || 0,
    summaries,
    action: firstText(task.action),
    acceptanceCriteria,
  }
}

export function normalizePostDeliveryQualityClosureResult(task: AnyRecord, revisionResult: AnyRecord) {
  const target = normalizePostDeliveryQualityRepair(task)
  const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
  const qualityReview = objectValue(quality.review)
  const raw = objectValue(
    revisionResult.post_delivery_quality
      || revisionResult.postDeliveryQuality
      || quality.post_delivery_quality
      || quality.postDeliveryQuality
      || qualityReview.post_delivery_quality
      || qualityReview.postDeliveryQuality,
  )
  if (!Object.keys(raw).length) {
    return {
      cleared: false,
      residuals: ['post_delivery_quality 未返回'],
    }
  }
  const rawChecks = [
    ...arrayValue(raw.checks),
    raw.check,
  ].filter(Boolean).map(item => objectValue(item))
  if (rawChecks.length === 0) {
    return {
      cleared: false,
      residuals: ['post_delivery_quality.checks 未返回'],
    }
  }
  const targetKey = firstText(target?.checkKey)
  const targetLabel = firstText(target?.checkLabel)
  const residuals = rawChecks
    .map(check => {
      const status = firstText(check.status).toLowerCase()
      const warnCount = Number(check.warn_count ?? check.warnCount ?? 0) || 0
      const unknownCount = Number(check.unknown_count ?? check.unknownCount ?? 0) || 0
      const failCount = Number(check.fail_count ?? check.failCount ?? check.failed_count ?? check.failedCount ?? 0) || 0
      const errorCount = Number(check.error_count ?? check.errorCount ?? 0) || 0
      const badStatus = status && status !== 'ok' && status !== 'pass' && status !== 'passed'
      if (!badStatus && warnCount <= 0 && unknownCount <= 0 && failCount <= 0 && errorCount <= 0) return ''
      const label = firstText(check.label, check.key, targetLabel, targetKey, '交付后质检项')
      const summary = firstText(
        ...arrayValue(check.summaries).map(summaryItem => text(summaryItem)),
        check.summary,
        check.message,
        check.reason,
        check.detail,
        status,
      )
      const countText = [
        warnCount > 0 ? `warn ${warnCount}` : '',
        unknownCount > 0 ? `unknown ${unknownCount}` : '',
        failCount > 0 ? `fail ${failCount}` : '',
        errorCount > 0 ? `error ${errorCount}` : '',
      ].filter(Boolean).join('，')
      return `${label}${countText ? `（${countText}）` : ''}${summary ? `：${summary}` : ''}`
    })
    .filter(Boolean)
  const status = firstText(raw.status).toLowerCase()
  if (status && status !== 'ok') residuals.unshift(`post_delivery_quality.status=${status}`)
  if (!status) residuals.unshift('post_delivery_quality.status 缺失')

  return {
    cleared: residuals.length === 0,
    residuals: residuals.length > 0 ? residuals : ['仍需人工复查'],
  }
}

export function normalizePostBatchQualityClosureResult(revisionResult: AnyRecord) {
  const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
  const qualityReview = objectValue(quality.review)
  const raw = objectValue(
    revisionResult.post_batch_quality_check
      || revisionResult.postBatchQualityCheck
      || quality.post_batch_quality_check
      || quality.postBatchQualityCheck
      || qualityReview.post_batch_quality_check
      || qualityReview.postBatchQualityCheck,
  )
  if (!Object.keys(raw).length) {
    return {
      cleared: false,
      residuals: ['post_batch_quality_check 未返回'],
    }
  }

  const status = firstText(raw.status).toLowerCase()
  const rawChecks = arrayValue(raw.checks).map(item => objectValue(item))
  if (rawChecks.length === 0) {
    return {
      cleared: false,
      residuals: ['post_batch_quality_check.checks 未返回'],
    }
  }
  const residuals = rawChecks
    .map(item => {
      const checkStatus = firstText(item.status).toLowerCase()
      const warnCount = Number(item.warn_count ?? item.warnCount ?? 0) || 0
      const unknownCount = Number(item.unknown_count ?? item.unknownCount ?? 0) || 0
      const failCount = Number(item.fail_count ?? item.failCount ?? item.failed_count ?? item.failedCount ?? 0) || 0
      const errorCount = Number(item.error_count ?? item.errorCount ?? 0) || 0
      const badStatus = ['warn', 'warning', 'failed', 'fail', 'error', 'unknown'].includes(checkStatus)
      if (!badStatus && warnCount <= 0 && unknownCount <= 0 && failCount <= 0 && errorCount <= 0) return ''
      const label = firstText(item.label, item.key, '批次质检')
      const summary = firstText(
        ...arrayValue(item.summaries).map(summaryItem => text(summaryItem)),
        item.summary,
        item.message,
        item.reason,
        item.detail,
        checkStatus,
      )
      const countText = [
        warnCount > 0 ? `warn ${warnCount}` : '',
        unknownCount > 0 ? `unknown ${unknownCount}` : '',
        failCount > 0 ? `fail ${failCount}` : '',
        errorCount > 0 ? `error ${errorCount}` : '',
      ].filter(Boolean).join('，')
      return `${label}${countText ? `（${countText}）` : ''}${summary ? `：${summary}` : ''}`
    })
    .filter(Boolean)

  if (status && status !== 'ok') residuals.unshift(`post_batch_quality_check.status=${status}`)
  if (!status) residuals.unshift('post_batch_quality_check.status 缺失')

  return {
    cleared: residuals.length === 0,
    residuals: residuals.length > 0 ? residuals : ['仍需人工复查'],
  }
}

export function normalizeSceneCardReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const issueType = firstText(task.issue_type, task.issueType, task.key, task.annotation_key, payload.key)
  const haystack = [
    issueType,
    task.message,
    task.action,
    task.evidence,
    payload.message,
    payload.evidence,
  ].map(item => text(item).toLowerCase()).join(' ')
  if (!haystack.includes('scene_card_receipt') && !haystack.includes('scene_card_receipts')) return null
  const sceneNo = Number(task.scene_no ?? task.sceneNo ?? payload.scene_no ?? payload.sceneNo ?? 0)
  const fields = limitedArray(task.fields, payload.fields)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType,
    severity: firstText(task.severity, task.status, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, task.label, payload.label, '场景卡回执证据复核'),
    sceneNo,
    fields,
    evidence: firstText(task.evidence, payload.evidence, task.message, payload.message),
    fix: firstText(task.action, task.fix, payload.fix, payload.action),
  }
}

export function normalizeSceneCardDirectiveRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const issueType = firstText(task.issue_type, task.issueType, task.key, task.annotation_key, payload.key)
  const haystack = [
    issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.message,
    task.action,
    task.evidence,
    payload.key,
    payload.label,
    payload.message,
    payload.evidence,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isSceneCardDirective = /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(haystack)
    || /场景卡(执行|禁令)/.test(haystack)
  if (!isSceneCardDirective) return null
  const sceneNo = Number(task.scene_no ?? task.sceneNo ?? payload.scene_no ?? payload.sceneNo ?? issueType.match(/scene[_-]card[_-](\d+)/i)?.[1] ?? 0)
  const conceptAnchorRules = limitedArray(
    task.concept_anchor_rules,
    task.conceptAnchorRules,
    payload.concept_anchor_rules,
    payload.conceptAnchorRules,
  ).map(item => text(item)).filter(Boolean)
  const proseCraftDirectives = limitedArray(
    task.prose_craft_directives,
    task.proseCraftDirectives,
    payload.prose_craft_directives,
    payload.proseCraftDirectives,
  ).map(item => text(item)).filter(Boolean)
  return {
    issueType,
    severity: firstText(task.severity, task.status, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, task.label, payload.label, '场景卡执行禁令'),
    sceneNo,
    evidence: firstText(task.evidence, payload.evidence, task.message, payload.message),
    fix: firstText(task.action, task.fix, payload.fix, payload.action),
    conceptAnchorRules,
    proseCraftDirectives,
  }
}

export function qualityAuditCheckLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, '质量诊断')
  const status = firstText(item.status, item.result)
  const statusKey = status.toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(statusKey)
  const missingFields = qualityContractMissingFields(item, 'quality_audit_checks')
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const evidence = firstText(item.evidence, item.message, item.summary, item.text)
  const fix = firstText(item.fix, item.action)
  const strategy = firstText(item.strategy)
  return [
    status ? `${status}` : '',
    label,
    passedLike && missingDetail ? missingDetail : '',
    evidence ? `证据：${evidence}` : '',
    fix ? `修法：${fix}` : '',
    strategy ? `策略：${strategy}` : '',
    !passedLike && missingDetail ? missingDetail : '',
  ].filter(Boolean).join('｜')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return /fail|failed|warn|warning|missing|missed|block|阻|缺|未/.test(value.toLowerCase())
  const item = objectValue(value)
  const status = firstText(item.status, item.result, item.severity).toLowerCase()
  const score = Number(item.score)
  const missingFields = qualityContractMissingFields(item, 'quality_audit_checks')
  if (missingFields.length > 0) return true
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocker', 'blocked', 'error'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function normalizeQualityAuditRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  if (normalizedKind.includes('quality_audit_repair_receipt')) return null
  const isQualityAudit = normalizedKind.includes('quality_audit')
    || text(task.annotation_category, task.annotationCategory) === 'quality_audit'
    || text(task.source_label, task.sourceLabel) === '质量诊断'
    || text(task.action).includes('quality_audit_checks')
  if (!isQualityAudit) return null
  const checks = limitedArray(payload.checks, task.checks, payload.quality_audit_checks, payload.qualityAuditChecks)
    .map(qualityAuditCheckLine)
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'quality_audit_gap'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '质量诊断'),
    strategy: firstText(payload.strategy, task.strategy),
    message: firstText(task.message, payload.evidence, payload.message),
    action: firstText(task.action, payload.fix, payload.action),
    checks,
  }
}

export function qualityAuditRepairReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.check_key, item.checkKey, '质量诊断修复回执')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  return [label, detail ? `证据：${detail}` : ''].filter(Boolean).join('｜')
}

export function deslopRepairReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.gate, item.key, item.check_key, item.checkKey, '去AI味修复回执')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  return [label, detail ? `证据：${detail}` : ''].filter(Boolean).join('｜')
}

export function normalizeDeslopRepairReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isRepairReceipt = normalizedKind.includes('deslop_repair_receipt')
    || text(task.annotation_category, task.annotationCategory) === 'deslop_repair_receipt'
    || text(task.source_label, task.sourceLabel) === '去AI味回执'
    || text(task.action).includes('deslop_repair_receipts')
  if (!isRepairReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(deslopRepairReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'deslop_repair_receipt'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '去AI味回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function revisionCascadeImpactLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const target = firstText(item.target, item.label, item.key, item.type, '级联影响')
  const detail = firstText(item.text, item.impact, item.evidence, item.message, item.summary, item.risk)
  const action = firstText(item.required_action, item.requiredAction, item.action, item.fix)
  return [
    target,
    detail ? `影响：${detail}` : '',
    action ? `后续动作：${action}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionCascadeImpactRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isCascade = normalizedKind.includes('revision_cascade_impact')
    || text(task.annotation_category, task.annotationCategory) === 'revision_cascade_impact'
    || text(task.source_label, task.sourceLabel) === '级联修订'
    || text(task.action).includes('cascade_impacts')
  if (!isCascade) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing, task.missed, task.gaps, task.issues)
    .map(revisionCascadeImpactLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_cascade_impact'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '级联修订'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function revisionScopeGuardLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, '修订幅度')
  const detail = firstText(item.text, item.evidence, item.message, item.summary, item.risk)
  const fix = firstText(item.fix, item.action, item.required_action, item.requiredAction)
  return [
    label,
    detail ? `证据：${detail}` : '',
    fix ? `修法：${fix}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionScopeGuardRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isScopeGuard = normalizedKind.includes('revision_scope_guard')
    || text(task.annotation_category, task.annotationCategory) === 'revision_scope_guard'
    || text(task.source_label, task.sourceLabel) === '修订幅度'
    || text(task.action).includes('不要重写整章')
  if (!isScopeGuard) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(revisionScopeGuardLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_scope_guard'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订幅度'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function revisionContextReceiptLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.key, item.type, item.category, '修订上下文')
  const detail = firstText(item.text, item.evidence, item.source_excerpt, item.sourceExcerpt, item.message, item.summary, item.risk)
  const fix = firstText(item.fix, item.action, item.required_action, item.requiredAction)
  return [
    label,
    detail ? `证据：${detail}` : '',
    fix ? `修法：${fix}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeRevisionContextReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isContextReceipt = normalizedKind.includes('revision_context_receipts')
    || text(task.annotation_category, task.annotationCategory) === 'revision_context_receipts'
    || text(task.source_label, task.sourceLabel) === '修订上下文'
  if (!isContextReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(revisionContextReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'revision_context_receipts_sync'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订上下文'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function proseRevisionReceiptSyncLine(value: any) {
  if (typeof value === 'string') return value
  const item = objectValue(value)
  const label = firstText(item.label, item.category, item.key, item.type, '修订回执')
  const detail = firstText(item.text, item.risk, item.remaining_risk, item.remainingRisk, item.message, item.summary)
  const evidence = firstText(item.evidence, item.changed_evidence, item.changedEvidence, item.applied_fix, item.appliedFix)
  return [
    label,
    detail ? `缺口：${detail}` : '',
    evidence ? `证据：${evidence}` : '',
  ].filter(Boolean).join('｜')
}

export function normalizeProseRevisionReceiptSyncRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isRevisionReceiptSync = normalizedKind.includes('prose_revision_receipt_sync')
    || text(task.annotation_category, task.annotationCategory) === 'prose_revision_receipt_sync'
    || text(task.annotation_category, task.annotationCategory) === 'prose_revision_receipt'
    || text(task.source_label, task.sourceLabel) === '修订回执'
    || text(task.action).includes('revision_receipts')
  if (!isRevisionReceiptSync) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(proseRevisionReceiptSyncLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'prose_revision_receipt_sync'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '修订回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function normalizeQualityAuditRepairReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const normalizedKind = [
    task.issue_type,
    task.issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.action,
    task.message,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isRepairReceipt = normalizedKind.includes('quality_audit_repair_receipt')
    || text(task.annotation_category, task.annotationCategory) === 'quality_audit_repair_receipt'
    || text(task.source_label, task.sourceLabel) === '质量回执'
    || text(task.action).includes('quality_audit_repair_receipts')
  if (!isRepairReceipt) return null
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, task.missed, task.gaps, task.issues)
    .map(qualityAuditRepairReceiptLine)
    .filter(Boolean)
  const nextActions = limitedArray(payload.next_actions, payload.nextActions, task.next_actions, task.nextActions)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType: firstText(task.issue_type, task.issueType, payload.key, 'quality_audit_repair_receipt'),
    severity: firstText(task.severity, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, payload.label, '质量回执'),
    message: firstText(task.message, payload.summary, payload.message),
    action: firstText(task.action, payload.fix, payload.action, ...nextActions),
    missed,
    nextActions,
  }
}

export function deslopRepairReceiptSyncPayload(value: any) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source.deslop_repair_receipt_sync
    || source.deslopRepairReceiptSync
    || review.deslop_repair_receipt_sync
    || review.deslopRepairReceiptSync
    || result.deslop_repair_receipt_sync
    || result.deslopRepairReceiptSync
    || result,
  )
}

export function deslopRepairReceiptResidualsFromQuality(value: any): string[] {
  const payload = deslopRepairReceiptSyncPayload(value)
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(deslopRepairReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'deslop_repair_receipts',
    'deslopRepairReceipts',
    'repair_receipts',
    'repairReceipts',
    'receipts',
  ], deslopRepairReceiptLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`去AI味修复回执残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'deslop_repair_receipt_sync 未通过')] : []
}

export function revisionSyncPayload(value: any, snakeKey: string, camelKey: string) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source[snakeKey]
    || source[camelKey]
    || review[snakeKey]
    || review[camelKey]
    || result[snakeKey]
    || result[camelKey]
    || result,
  )
}

export function revisionCascadeImpactResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_cascade_impact_sync', 'revisionCascadeImpactSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing)
    .map(revisionCascadeImpactLine)
    .filter(Boolean)
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订级联影响 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_cascade_impact_sync 未通过')] : []
}

export function revisionScopeGuardResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_scope_guard_sync', 'revisionScopeGuardSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(revisionScopeGuardLine)
    .filter(Boolean)
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订幅度风险 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_scope_guard_sync 未通过')] : []
}

export function revisionContextReceiptResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'revision_context_receipts_sync', 'revisionContextReceiptsSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(revisionContextReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'revision_context_receipts',
    'revisionContextReceipts',
    'context_receipts',
    'contextReceipts',
    'receipts',
  ], revisionContextReceiptLine, { requiredFields: ['key', 'label', 'status', 'evidence', 'fix', 'source_excerpt'] })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订上下文残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'revision_context_receipts_sync 未通过')] : []
}

export function proseRevisionReceiptResidualsFromQuality(value: any): string[] {
  const payload = revisionSyncPayload(value, 'prose_revision_receipt_sync', 'proseRevisionReceiptSync')
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues, payload.evidence_missing, payload.evidenceMissing)
    .map(proseRevisionReceiptSyncLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'revision_receipts',
    'revisionReceipts',
    'prose_revision_receipts',
    'proseRevisionReceipts',
    'receipts',
  ], proseRevisionReceiptSyncLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`修订回执残留 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'prose_revision_receipt_sync 未通过')] : []
}

export function qualityAuditRepairReceiptSyncPayload(value: any) {
  const source = objectValue(value)
  const review = objectValue(source.review)
  const result = objectValue(source.result)
  return objectValue(
    source.quality_audit_repair_receipt_sync
    || source.qualityAuditRepairReceiptSync
    || review.quality_audit_repair_receipt_sync
    || review.qualityAuditRepairReceiptSync
    || result.quality_audit_repair_receipt_sync
    || result.qualityAuditRepairReceiptSync
    || result,
  )
}

export function qualityAuditRepairReceiptResidualsFromQuality(value: any): string[] {
  const payload = qualityAuditRepairReceiptSyncPayload(value)
  const status = firstText(payload.status).toLowerCase()
  const missedCount = Number(payload.missed_count ?? payload.missedCount)
  const missed = limitedArray(payload.missed, payload.gaps, payload.issues)
    .map(qualityAuditRepairReceiptLine)
    .filter(Boolean)
  const genericReceiptEvidence = syncReceiptGenericEvidenceResiduals(payload, [
    'quality_audit_repair_receipts',
    'qualityAuditRepairReceipts',
    'repair_receipts',
    'repairReceipts',
    'receipts',
  ], qualityAuditRepairReceiptLine, { keyedReceiptsRequireChangedEvidence: true })
  if (genericReceiptEvidence.length > 0) return genericReceiptEvidence
  if (status === 'ok' && (!Number.isFinite(missedCount) || missedCount <= 0) && missed.length === 0) return []
  if (Number.isFinite(missedCount) && missedCount <= 0 && missed.length === 0) return []
  if (missed.length > 0) return missed
  if (Number.isFinite(missedCount) && missedCount > 0) return [`质量诊断修复回执缺口 ${missedCount}`]
  return status && status !== 'ok' ? [firstText(payload.label, payload.summary, 'quality_audit_repair_receipt_sync 未通过')] : []
}

export function qualityAuditResidualsFromQuality(value: any, issueType = ''): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const normalizedIssueType = text(issueType).toLowerCase()
  const candidates = [
    ...arrayValue(review.quality_audit_checks || review.qualityAuditChecks),
    ...arrayValue(quality.quality_audit_checks || quality.qualityAuditChecks),
    ...arrayValue(payload.self_check?.review?.quality_audit_checks),
    ...arrayValue(payload.self_check?.quality_audit_checks),
    ...arrayValue(payload.quality_audit_checks),
  ]
  return candidates
    .filter(item => {
      if (!qualityAuditCheckFailed(item)) return false
      if (!normalizedIssueType) return true
      const itemKey = firstText(item?.key, item?.type).toLowerCase()
      const itemText = qualityAuditCheckLine(item).toLowerCase()
      return itemKey === normalizedIssueType || itemText.includes(normalizedIssueType)
    })
    .map(qualityAuditCheckLine)
    .filter(Boolean)
}

export function preDraftExecutionReceiptKeyForTask(task: AnyRecord) {
  const issueType = firstText(task.issue_type, task.issueType).toLowerCase()
  const category = firstText(task.annotation_category, task.annotationCategory, task.category).toLowerCase()
  if (issueType.includes('next_chapter_quality_plan_receipts') || category.includes('next_chapter_quality_plan_receipts')) {
    return {
      snake: 'next_chapter_quality_plan_receipts',
      camel: 'nextChapterQualityPlanReceipts',
      label: '质量续航回执',
    }
  }
  if (issueType.includes('status_filter') || category.includes('status_filter')) {
    return {
      snake: 'status_filter_receipts',
      camel: 'statusFilterReceipts',
      label: '状态筛选',
    }
  }
  if (issueType.includes('intent_confirmation') || category.includes('intent_confirmation')) {
    return {
      snake: 'intent_confirmation_checks',
      camel: 'intentConfirmationChecks',
      label: '写前意图确认',
    }
  }
  if (issueType.includes('write_preparation') || category.includes('write_preparation')) {
    return {
      snake: 'write_preparation_checks',
      camel: 'writePreparationChecks',
      label: '写前准备',
    }
  }
  if (issueType.includes('benchmark_recall') || category.includes('benchmark_recall')) {
    return {
      snake: 'benchmark_recall_checks',
      camel: 'benchmarkRecallChecks',
      label: '文风召回',
    }
  }
  return null
}

export const BENCHMARK_RECALL_HARD_GAP_KEYS = [
  'missing_primary_contract',
  'profile_missing',
  'module_missing',
  'rhythm_missing',
  'conflict',
  'module_rhythm_conflict',
]

export function truthyGapValue(value: any) {
  if (value === false || value === null || value === undefined || value === 0) return false
  const normalized = text(value).toLowerCase()
  return !['', 'false', '0', 'no', 'none', 'null', 'undefined', '已关闭', '已解决'].includes(normalized)
}

export function syncReceiptGenericEvidenceResiduals(payload: AnyRecord, receiptKeys: string[], line: (value: any) => string, options: { keyedReceiptsRequireChangedEvidence?: boolean, requiredFields?: string[] } = {}) {
  return [
    ...receiptKeys,
    'completed',
    'completed_receipts',
    'completedReceipts',
  ]
    .flatMap(key => arrayValue(payload[key]))
    .filter(Boolean)
    .map(receipt => {
      const missingRequiredFields = receiptMissingRequiredFieldsDetail(receipt, options.requiredFields || [])
      if (missingRequiredFields) {
        const receiptLine = line(receipt)
        return receiptLine ? `${receiptLine}｜${missingRequiredFields}` : missingRequiredFields
      }
      const missingChangedEvidence = revisionReceiptMissingChangedEvidenceDetail(receipt, options)
      if (missingChangedEvidence) {
        const receiptLine = line(receipt)
        return receiptLine ? `${receiptLine}｜${missingChangedEvidence}` : missingChangedEvidence
      }
      const genericEvidence = genericClosureEvidenceDetail(receipt)
      if (!genericEvidence) return ''
      const receiptLine = line(receipt)
      return receiptLine ? `${receiptLine}｜${genericEvidence}` : genericEvidence
    })
    .filter(Boolean)
    .slice(0, 6)
}

export function receiptMissingRequiredFieldsDetail(item: any, requiredFields: string[] = []) {
  if (requiredFields.length === 0) return ''
  const receipt = objectValue(item)
  const missing = requiredFields.filter(field => {
    if (field === 'source_excerpt') return !firstText(receipt.source_excerpt, receipt.sourceExcerpt)
    if (field === 'changed_evidence') return !firstText(receipt.changed_evidence, receipt.changedEvidence)
    return !firstText(receipt[field])
  })
  return missing.length > 0 ? `缺少 ${missing.join('/')}` : ''
}

export function revisionReceiptMissingChangedEvidenceDetail(item: any, options: { keyedReceiptsRequireChangedEvidence?: boolean } = {}) {
  const receipt = objectValue(item)
  const looksLikeRevisionReceipt = Boolean(
    firstText(receipt.applied_fix, receipt.appliedFix)
    || firstText(receipt.original_evidence, receipt.originalEvidence)
    || firstText(receipt.check_key, receipt.checkKey)
    || (options.keyedReceiptsRequireChangedEvidence ? firstText(receipt.key) : '')
    || (options.keyedReceiptsRequireChangedEvidence ? firstText(receipt.label, receipt.name) : '')
    || firstText(receipt.gate)
    || Number.isFinite(Number(receipt.issue_index ?? receipt.issueIndex)),
  )
  if (!looksLikeRevisionReceipt) return ''
  return firstText(receipt.changed_evidence, receipt.changedEvidence) ? '' : '缺少 changed_evidence，无法定位修订后正文证据'
}

export function benchmarkRecallPreservedHardGaps(item: any) {
  const check = objectValue(item)
  const raw = check.gaps_preserved ?? check.gapsPreserved ?? check.gaps
  const gapObject = objectValue(raw)
  if (Object.keys(gapObject).length > 0) {
    const noBenchmark = truthyGapValue(gapObject.no_benchmark ?? gapObject.noBenchmark)
    if (noBenchmark) return []
    const legacyDeconstruction = truthyGapValue(gapObject.legacy_deconstruction ?? gapObject.legacyDeconstruction)
    return BENCHMARK_RECALL_HARD_GAP_KEYS
      .filter(key => !(legacyDeconstruction && ['module_missing', 'rhythm_missing'].includes(key)))
      .filter(key => truthyGapValue(gapObject[key] ?? gapObject[camelFieldName(key)]))
  }
  const gapItems = Array.isArray(raw) ? raw.map(item => text(item).toLowerCase()).filter(Boolean) : []
  const gapText = gapItems.length > 0 ? gapItems.join(' ') : text(raw).toLowerCase()
  if (!gapText || gapText.includes('no_benchmark')) return []
  const legacyDeconstruction = gapText.includes('legacy_deconstruction')
  return BENCHMARK_RECALL_HARD_GAP_KEYS
    .filter(key => !(legacyDeconstruction && ['module_missing', 'rhythm_missing'].includes(key)))
    .filter(key => {
      if (!gapText.includes(key)) return false
      if (gapText.includes(`${key}=false`) || gapText.includes(`${key}:false`)) return false
      return true
    })
}

export function preDraftExecutionHardGapDetail(item: any, snakeKey = '') {
  if (snakeKey !== 'benchmark_recall_checks') return ''
  const hardGaps = benchmarkRecallPreservedHardGaps(item)
  return hardGaps.length > 0 ? `硬缺口仍未闭环 ${hardGaps.join(', ')}` : ''
}

export function preDraftExecutionCheckFailed(item: any, snakeKey = '') {
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const contractKey = firstText(snakeKey, check.contract_key, check.contractKey, check.check_group, check.checkGroup)
  const missingFields = contractKey ? qualityContractMissingFields(item, contractKey) : []
  const hardGapDetail = preDraftExecutionHardGapDetail(item, contractKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return check.delivered === false
    || Boolean(remainingRisk)
    || missingFields.length > 0
    || Boolean(hardGapDetail)
    || Boolean(genericEvidenceDetail)
    || ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)
}

export function preDraftExecutionCheckLine(item: any, snakeKey = '') {
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '写前执行回执')
  const missingFields = snakeKey ? qualityContractMissingFields(item, snakeKey) : []
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(status) || check.delivered === true
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const hardGapDetail = preDraftExecutionHardGapDetail(item, snakeKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  const detail = firstText(
    hardGapDetail,
    genericEvidenceDetail,
    passedLike ? missingDetail : '',
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    !passedLike ? missingDetail : '',
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function preDraftExecutionResidualsFromQuality(value: any, snakeKey: string, camelKey: string): string[] {
  const candidates = preDraftExecutionReceiptSources(value)
    .flatMap(source => arrayValue(source[snakeKey] || source[camelKey]))
    .map(item => typeof item === 'string' ? item : { ...objectValue(item), contract_key: snakeKey })
  if (candidates.length === 0) return [`缺少 ${snakeKey} 写前执行回执`]
  return candidates
    .filter(item => preDraftExecutionCheckFailed(item, snakeKey))
    .map(item => preDraftExecutionCheckLine(item, snakeKey))
    .filter(Boolean)
}

export function sourceReadinessCheckFailed(item: any) {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, 'source_readiness_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || check.ready === false
    || check.delivered === false
    || missingFields.length > 0
    || Boolean(genericEvidenceDetail)
    || Boolean(remainingRisk)
}

export function sourceReadinessCheckLine(item: any) {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '来源就绪')
  const missingFields = qualityContractMissingFields(item, 'source_readiness_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  if (missingFields.length > 0) return `${label}：缺少字段 ${missingFields.join(', ')}`
  if (genericEvidenceDetail) return `${label}：${genericEvidenceDetail}`
  const detail = firstText(
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function sourceReadinessResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.source_readiness_checks || review.sourceReadinessChecks),
    ...arrayValue(quality.source_readiness_checks || quality.sourceReadinessChecks),
    ...arrayValue(result.source_readiness_checks || result.sourceReadinessChecks),
    ...arrayValue(payload.source_readiness_checks || payload.sourceReadinessChecks),
    ...arrayValue(selfCheck.source_readiness_checks || selfCheck.sourceReadinessChecks),
    ...arrayValue(selfCheckReview.source_readiness_checks || selfCheckReview.sourceReadinessChecks),
    ...preDraftExecutionReceiptSources(value)
      .flatMap(source => arrayValue(source.source_readiness_checks || source.sourceReadinessChecks)),
  ]
  if (candidates.length === 0) return ['缺少 source_readiness_checks 复检结果']
  return candidates
    .filter(sourceReadinessCheckFailed)
    .map(sourceReadinessCheckLine)
    .filter(Boolean)
}

export function stateTrackingCheckFailed(item: any) {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, 'state_tracking_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || check.ready === false
    || check.delivered === false
    || missingFields.length > 0
    || Boolean(genericEvidenceDetail)
    || Boolean(remainingRisk)
}

export function stateTrackingCheckLine(item: any) {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, '状态跟踪')
  const missingFields = qualityContractMissingFields(item, 'state_tracking_checks')
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  if (missingFields.length > 0) return `${label}：缺少字段 ${missingFields.join(', ')}`
  if (genericEvidenceDetail) return `${label}：${genericEvidenceDetail}`
  const detail = firstText(
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function stateTrackingResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.state_tracking_checks || review.stateTrackingChecks),
    ...arrayValue(quality.state_tracking_checks || quality.stateTrackingChecks),
    ...arrayValue(result.state_tracking_checks || result.stateTrackingChecks),
    ...arrayValue(payload.state_tracking_checks || payload.stateTrackingChecks),
    ...arrayValue(selfCheck.state_tracking_checks || selfCheck.stateTrackingChecks),
    ...arrayValue(selfCheckReview.state_tracking_checks || selfCheckReview.stateTrackingChecks),
  ]
  if (candidates.length === 0) return ['缺少 state_tracking_checks 复检结果']
  return candidates
    .filter(stateTrackingCheckFailed)
    .map(stateTrackingCheckLine)
    .filter(Boolean)
}

export {
  QUALITY_CONTRACT_REQUIRED_FIELDS,
  camelFieldName,
  deterministicProseCleanupFailed,
  deterministicProseCleanupLine,
  deterministicProseCleanupResidualsFromQuality,
  genericClosureEvidenceDetail,
  genericEvidenceSearchText,
  hasContractField,
  listQualityContractRequiredFieldKeys,
  listQualityContractRequiredFields,
  metricNumber,
  preDraftExecutionReceiptSources,
  qualityContractCheckFailed,
  qualityContractCheckLine,
  qualityContractMissingFields,
  qualityContractResidualsFromQuality,
  sceneCardDirectiveCheckMatches,
  sceneCardDirectiveCheckText,
  sceneCardDirectiveResidualsFromQuality,
  sceneCardReceiptResidualsFromQuality,
  summarizeEvidenceItem,
} from './quality-contract'
