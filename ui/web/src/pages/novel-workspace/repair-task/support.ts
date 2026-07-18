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

export * from './support-normalize'
