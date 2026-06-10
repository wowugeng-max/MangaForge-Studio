type AnyRecord = Record<string, any>

function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function objectValue(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function limitedArray(...values: any[]) {
  for (const value of values) {
    const items = arrayValue(value).filter(Boolean)
    if (items.length > 0) return items.slice(0, 6)
  }
  return []
}

function summarizeEvidenceItem(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const item = objectValue(value)
  const label = firstText(item.name, item.label, item.title, item.key, item.type, item.text, item.description)
  const detail = firstText(
    item.expected_state_change,
    item.expectedStateChange,
    item.actual_state_change,
    item.actualStateChange,
    item.reason,
    item.message,
    item.description,
    item.text,
    item.action,
  )
  if (label && detail && label !== detail) return `${label}：${detail}`
  return label || detail || JSON.stringify(item).slice(0, 240)
}

function deliveryRiskStrategy(issueType: string, category = '') {
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

function isOpeningHandoffMiss(value: any) {
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

function metricNumber(value: any) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeDeliveryRiskContext(task: AnyRecord) {
  const isDeliveryRisk = task.source === 'review_annotation_risk'
    || Boolean(task.annotation_key)
    || Boolean(task.annotation_source)
  if (!isDeliveryRisk) return null
  const payload = objectValue(task.payload)
  const normalizedKind = `${firstText(task.issue_type)} ${firstText(task.annotation_category)}`.toLowerCase()
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

  return {
    source_label: firstText(task.source_label, task.annotation_source, task.annotation_category, '交稿风险'),
    severity: firstText(task.severity),
    annotation_key: firstText(task.annotation_key),
    issue_type: firstText(task.issue_type),
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
    strategy: deliveryRiskStrategy(firstText(task.issue_type), firstText(task.annotation_category)),
  }
}

export function buildDeliveryRiskRevisionClosurePlan(task: AnyRecord, revisionResult: AnyRecord = {}) {
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

function batchBriefFromRun(run?: AnyRecord | null) {
  const input = parseJsonValue(run?.input_ref) || {}
  const output = parseJsonValue(run?.output_ref) || {}
  return input.next_batch_brief || input.nextBatchBrief || output.next_batch_brief || output.nextBatchBrief || null
}

function normalizeChapterPlan(value: any) {
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

function normalizeBatchPlanContext(task: AnyRecord, run?: AnyRecord | null) {
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

export function buildRepairTaskRevisionPrompt(task: AnyRecord, run?: AnyRecord | null) {
  const batchPlan = normalizeBatchPlanContext(task, run)
  const chapterPlan = batchPlan?.chapter_plan
  const deliveryRisk = normalizeDeliveryRiskContext(task)
  const serialRhythmReview = task.serial_rhythm_review || task.serialRhythmReview || null
  const volumeSegmentReview = task.volume_segment_review || task.volumeSegmentReview || null
  const readerPullReview = task.reader_pull_review || task.readerPullReview || null
  const innovationReview = task.innovation_review || task.innovationReview || null
  const chapterAttractionReview = task.chapter_attraction_review || task.chapterAttractionReview || null
  const storyDriveSync = task.story_drive_sync || task.storyDriveSync || null
  const characterArcSync = task.character_arc_sync || task.characterArcSync || null
  const styleSampleSync = task.style_sample_sync || task.styleSampleSync || null
  const readerTrialReview = task.reader_trial_review || task.readerTrialReview || null
  const lines = [
    '本次修订来自任务中心的商业留存/质检修复任务。',
    task.segment ? `分段：${task.segment}` : '',
    task.issue_type ? `问题类型：${task.issue_type}` : '',
    task.message ? `问题：${task.message}` : '',
    task.action ? `修复动作：${task.action}` : '',
    Array.isArray(task.acceptance_criteria) ? `验收标准：${task.acceptance_criteria.join('；')}` : '',
  ]
  if (batchPlan) {
    lines.push(
      '【批次任务书兑现】',
      batchPlan.batch_goal ? `本批目标：${batchPlan.batch_goal}` : '',
      batchPlan.reader_payoff_plan ? `读者回报：${batchPlan.reader_payoff_plan}` : '',
      batchPlan.mainline_focus ? `主线焦点：${batchPlan.mainline_focus}` : '',
      batchPlan.forbidden_boundary ? `禁抢跑边界：${batchPlan.forbidden_boundary}` : '',
      chapterPlan?.chapter_task ? `本章职责：${chapterPlan.chapter_task}` : '',
      chapterPlan?.conflict ? `本章冲突：${chapterPlan.conflict}` : '',
      chapterPlan?.mainline_progress ? `本章主线进度：${chapterPlan.mainline_progress}` : '',
      chapterPlan?.ending_hook ? `章末钩子：${chapterPlan.ending_hook}` : '',
      '修订要求：只补齐本章漏兑现内容，不新增长期方向，不提前揭示禁抢跑边界。',
    )
  }
  if (serialRhythmReview) {
    lines.push(
      '【连载节奏疲劳】',
      serialRhythmReview.score !== undefined ? `节奏评分：${serialRhythmReview.score}` : '',
      Array.isArray(serialRhythmReview.risks) && serialRhythmReview.risks.length > 0 ? `重复风险：${serialRhythmReview.risks.join('；')}` : '',
      Array.isArray(serialRhythmReview.evidence) && serialRhythmReview.evidence.length > 0 ? `批次证据：${serialRhythmReview.evidence.join('；')}` : '',
      '修订要求：必须轮换冲突来源、读者回报、章末追读问题和可视化场面；保留本章主线职责，但删改重复的压迫方式、重复打脸方式和重复章末悬念。',
    )
  }
  if (volumeSegmentReview) {
    const missed = arrayValue(volumeSegmentReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【卷级阶段验收】',
      Array.isArray(volumeSegmentReview.planned) && volumeSegmentReview.planned.length > 0 ? `阶段要求：${volumeSegmentReview.planned.join('；')}` : '',
      Array.isArray(volumeSegmentReview.actual) && volumeSegmentReview.actual.length > 0 ? `实际呈现：${volumeSegmentReview.actual.join('；')}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      volumeSegmentReview.gate_summary ? `卷段提示：${volumeSegmentReview.gate_summary}` : '',
      '修订要求：必须补成可见的阶段结果，例如身份变化、资源入场、关系改写、势力态度转变、阶段反派败退或新门槛开启。',
      '不能把阶段结算继续后移，不能用解释性旁白代替现场冲突和结果兑现，不能提前消费后续卷末爆点。',
    )
  }
  if (readerPullReview) {
    const missed = arrayValue(readerPullReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【读者拉力修复】',
      readerPullReview.expectation_label ? `期待兑现：${readerPullReview.expectation_label}` : '',
      readerPullReview.retention_label ? `追读钩子：${readerPullReview.retention_label}` : '',
      missed.length > 0 ? `漏兑现：${missed.join('；')}` : '',
      '修订要求：必须补出下一页动力，把承诺写成可见行动、冲突结果、情绪回报、危险选择或章末未解问题。',
      '不能只解释背景，不能用无关插科打诨稀释高压场景，不能把本章承诺继续拖成空头支票。',
    )
  }
  if (innovationReview) {
    const missed = arrayValue(innovationReview.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【创新/IP化执行】',
      innovationReview.label ? `创新复盘：${innovationReview.label}` : '',
      missed.length > 0 ? `漏执行：${missed.join('；')}` : '',
      '修订要求：必须写成读者能复述的差异化体验，例如独特机制、反差选择、可视化反制、关系翻转或适合短剧/漫剧化的场面。',
      '不得只换名词不换体验；创新执行必须服务本章冲突、读者回报和长期设定，不能临时改主线方向。',
    )
  }
  if (chapterAttractionReview) {
    const weakDimensions = arrayValue(chapterAttractionReview.weak_dimensions || chapterAttractionReview.weakDimensions || chapterAttractionReview.dimensions)
      .filter((item: any) => !firstText(item?.status) || firstText(item?.status) === 'warn')
      .map((item: any) => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '吸引力缺口')
        const issue = firstText(value.issue, value.text, value.expected, value.repair_instruction, value.repairInstruction)
        return issue ? `${label}：${issue}` : label
      })
      .filter(Boolean)
    lines.push(
      '【章节吸引力修复】',
      chapterAttractionReview.score !== undefined && chapterAttractionReview.score !== null ? `吸引力评分：${chapterAttractionReview.score}` : '',
      firstText(chapterAttractionReview.label) ? `吸引力结论：${firstText(chapterAttractionReview.label)}` : '',
      firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair) ? `优先项：${firstText(chapterAttractionReview.priority_repair, chapterAttractionReview.priorityRepair)}` : '',
      weakDimensions.length > 0 ? `缺口维度：${weakDimensions.join('；')}` : '',
      '修订要求：必须同时补强开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面。',
      '不能只做语言润色；每一处新增内容都要转成现场行动、冲突结果、信息增量、情绪回报或下一章压力。',
    )
  }
  if (storyDriveSync) {
    const missed = arrayValue(storyDriveSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【故事驱动力修复】',
      storyDriveSync.score !== undefined && storyDriveSync.score !== null ? `故事力评分：${storyDriveSync.score}` : '',
      firstText(storyDriveSync.label) ? `故事力结论：${firstText(storyDriveSync.label)}` : '',
      firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair) ? `优先项：${firstText(storyDriveSync.priority_repair, storyDriveSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
      '不能只补旁白解释；新增内容必须写成现场行动、对话交锋、代价反馈或状态变化。',
    )
  }
  if (characterArcSync) {
    const missed = arrayValue(characterArcSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    lines.push(
      '【人物弧光修复】',
      characterArcSync.score !== undefined && characterArcSync.score !== null ? `人物弧光评分：${characterArcSync.score}` : '',
      firstText(characterArcSync.label) ? `人物弧光结论：${firstText(characterArcSync.label)}` : '',
      firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair) ? `优先项：${firstText(characterArcSync.priority_repair, characterArcSync.priorityRepair)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      '修订要求：必须补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
      '不能只补心理旁白；新增内容必须落到选择、对话、行动后果或关系反馈上。',
    )
  }
  if (styleSampleSync) {
    const missed = arrayValue(styleSampleSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const copied = arrayValue(styleSampleSync.copied_phrases || styleSampleSync.copiedPhrases)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【风格样章修复】',
      styleSampleSync.score !== undefined && styleSampleSync.score !== null ? `风格评分：${styleSampleSync.score}` : '',
      firstText(styleSampleSync.label) ? `风格结论：${firstText(styleSampleSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      copied.length > 0 ? `照搬风险：${copied.join('；')}` : '',
      '修订要求：必须重写为作者口吻的节奏、句式、对白比例和情绪转折，不得照搬样章原句。',
      '不要改变剧情线、设定状态、人物状态和章节事件；只修表达方式、节奏分配和角色口吻。',
    )
  }
  if (readerTrialReview || task.source === 'reader_trial_review' || task.issue_type === 'reader_trial_drop_point') {
    const trial = objectValue(readerTrialReview)
    const dropPoints = arrayValue(trial.drop_points || trial.dropPoints)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const repairActions = arrayValue(trial.repair_actions || trial.repairActions)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const personas = arrayValue(trial.personas)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.name, value.key, '模拟读者')
        const verdict = firstText(value.verdict, value.focus, value.text, value.description)
        return verdict ? `${label}：${verdict}` : label
      })
      .filter(Boolean)
    const segments = arrayValue(trial.segments)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '试读分段')
        const score = value.score === undefined || value.score === null ? '' : ` ${value.score}分`
        const verdict = firstText(value.verdict, value.summary, value.text, value.description)
        return verdict ? `${label}${score}：${verdict}` : `${label}${score}`
      })
      .filter(Boolean)
    lines.push(
      '【读者试读修复】',
      trial.score !== undefined && trial.score !== null ? `试读评分：${trial.score}` : '',
      firstText(trial.status) ? `试读状态：${firstText(trial.status)}` : '',
      firstText(trial.summary) ? `试读结论：${firstText(trial.summary)}` : '',
      ...dropPoints.map(item => `弃读点：${item}`),
      ...personas.map(item => `模拟读者：${item}`),
      ...segments.map(item => `试读分段：${item}`),
      ...repairActions.map(item => `修复动作：${item}`),
      '修订要求：只修当前章节，把弃读点改成可见的目标推进、爽点回报、情绪反转、信息增量、创新场面或章末钩子。',
      '不得改长期主线方向，不得新增未确认设定，不得把试读问题转嫁到后续章节。',
    )
  }
  if (deliveryRisk) {
    lines.push(
      '【交稿风险证据】',
      deliveryRisk.source_label ? `风险来源：${deliveryRisk.source_label}` : '',
      deliveryRisk.severity ? `严重级别：${deliveryRisk.severity}` : '',
      deliveryRisk.annotation_key ? `批注键：${deliveryRisk.annotation_key}` : '',
    )
    for (const group of deliveryRisk.evidenceGroups) {
      for (const item of group.items) {
        lines.push(`${group.label}：${item}`)
      }
    }
    if (deliveryRisk.openingHandoffMissed.length > 0) {
      lines.push(
        '【开篇承接修复】',
        `承接欠账：${deliveryRisk.openingHandoffMissed.join('；')}`,
        '修订要求：重写或补写本章前 300-500 字，开篇先写角色对上一章钩子、危机、欠账或未解问题的直接反应。',
        '必须让上一章最后一幕在开篇形成连续行动、选择压力、危险反馈或信息增量，再展开本章新场景。',
        '不得从泛环境描写、空泛醒来或无关解释重新开场；不得把上一章钩子拖到中后段才提一句。',
      )
    }
    if (deliveryRisk.openingPullRisk) {
      lines.push(
        '【开篇吸引力修复】',
        `开篇评分：${deliveryRisk.openingHookScore ?? '-'}`,
        '修订要求：重写或补写本章前 300 字，第一屏必须出现异常、危险、欲望或反常信息。',
        '必须把钩子、危机反馈、角色反应或信息增量写成现场动作/对话/选择压力。',
        '不得从泛环境描写或设定解释开场；不得把真正的钩子拖到中后段。',
      )
    }
    if (deliveryRisk.endingPageTurnRisk) {
      lines.push(
        '【章末翻页修复】',
        `章末评分：${deliveryRisk.endingHookScore ?? '-'}`,
        '修订要求：重写或补写本章最后 300 字，把危险升级、选择压力、反转、未解答案或利益诱惑压到最后一幕。',
        '必须让最后一段形成下一章非看不可的问题，同时保持本章事件已经交付。',
        '不得用总结、说明或情绪收束代替章末钩子；不得提前展开下一章完整剧情。',
      )
    }
    if (deliveryRisk.sceneProgressionRisk) {
      lines.push(
        '【场景推进修复】',
        `场景评分：${deliveryRisk.sceneReadabilityScore ?? '-'}`,
        '修订要求：补齐每个场景的目标、阻碍、转折、回报，把中段改成可见行动链和选择压力。',
        '必须让场景中的行动、对话或危机带来信息变化、关系变化、资源代价或局面转折。',
        '不得只补说明文字、环境描写或旁白总结；不得把场景修成设定大纲。',
      )
    }
    if (deliveryRisk.payoffDensityRisk) {
      lines.push(
        '【爽点密度修复】',
        `爽点密度评分：${deliveryRisk.payoffDensityScore ?? '-'}`,
        '修订要求：按每 800-1200 字至少一次信息推进、能力展示、危机反制、关系变化或小回收补足短周期回报。',
        '必须把读者回报写成可见行动结果、信息增量、情绪反转或小兑现。',
        '不得提前透支后续大高潮；新增爽点必须服务本章目标和长期主线。',
      )
    }
    lines.push(
      '【分类修订策略】',
      ...deliveryRisk.strategy,
      '不得改长期主线方向、不得新增未确认设定、不得提前揭示禁揭信息。',
      '修订范围只限当前章节正文；需要新增人物、物品、势力或能力时，只能以本章已出现内容补清楚，不能扩写成新设定大纲。',
    )
  }
  return lines.filter(Boolean).join('\n')
}
