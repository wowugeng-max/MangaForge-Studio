function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function firstMatchingBrief(items: any[], pattern: RegExp) {
  return uniqueBriefStrings(items, 20).find(item => pattern.test(item)) || ''
}

export function buildReaderRetentionBrief(project: any, contextPackage: any, sceneBriefs: any[]) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const retentionContract = writingBible?.reader_retention_contract
    || writingBible?.readerRetentionContract
    || project?.reference_config?.writing_bible?.reader_retention_contract
    || project?.reference_config?.writing_bible?.readerRetentionContract
    || {}
  const firstScene = sceneBriefs[0] || {}
  const lastScene = sceneBriefs[sceneBriefs.length - 1] || {}
  const readerPayoffs = sceneBriefs.map((item: any) => item.reader_payoff).filter(Boolean)
  const informationGaps = sceneBriefs.map((item: any) => item.information_gap).filter(Boolean)
  const reversals = sceneBriefs.map((item: any) => item.reversal).filter(Boolean)
  const retentionPillars = {
    upgrade: compactBriefText(firstDefined(
      readerPayoffs.join('；'),
      chapterTarget.upgrade_payoff,
      chapterTarget.upgradePayoff,
      chapterTarget.reader_payoff,
      chapterTarget.payoff,
      writingBible?.style_lock?.payoff_density,
      retentionContract.upgrade,
      retentionContract.retention_pillars?.upgrade,
      retentionContract.retentionPillars?.upgrade,
    )),
    resource_pressure: compactBriefText(firstDefined(
      chapterTarget.resource_pressure,
      chapterTarget.resourcePressure,
      firstScene.conflict,
      chapterTarget.conflict,
      informationGaps.join('；'),
      retentionContract.resource_pressure,
      retentionContract.resourcePressure,
      retentionContract.retention_pillars?.resource_pressure,
      retentionContract.retentionPillars?.resourcePressure,
    )),
    goal_stack: compactBriefText([
      '大目标 + 小目标 + 假目标',
      firstDefined(chapterTarget.summary, project?.synopsis),
      firstDefined(chapterTarget.conflict, firstScene.purpose),
      firstDefined(chapterTarget.ending_hook, lastScene.ending_hook_seed),
    ].filter(Boolean).join('：')),
    mystery_unlock: compactBriefText(firstDefined(
      informationGaps.join('；'),
      chapterTarget.information_gap,
      chapterTarget.ending_hook,
      lastScene.ending_hook_seed,
      retentionContract.mystery_unlock,
      retentionContract.mysteryUnlock,
      retentionContract.retention_pillars?.mystery_unlock,
      retentionContract.retentionPillars?.mysteryUnlock,
    )),
  }
  const retentionStrategy = firstDefined(
    writingBible?.commercial_positioning?.retention_strategy,
    writingBible?.retention_strategy,
    project?.reference_config?.writing_bible?.commercial_positioning?.retention_strategy,
  )
  return {
    opening_hook: compactBriefText(firstDefined(
      chapterTarget.opening_hook,
      firstScene.opening_hook,
      retentionContract.opening_hook_rule,
      retentionContract.openingHookRule,
      firstScene.purpose,
      chapterTarget.summary,
    )),
    payoff_promise: compactBriefText(firstDefined(
      readerPayoffs.join('；'),
      chapterTarget.reader_payoff,
      chapterTarget.payoff,
      writingBible?.style_lock?.payoff_density,
      retentionStrategy,
    )),
    information_gap: compactBriefText(firstDefined(
      informationGaps.join('；'),
      chapterTarget.information_gap,
      chapterTarget.conflict,
    )),
    emotional_reward: compactBriefText(firstDefined(
      writingBible?.promise,
      writingBible?.reader_promise,
      project?.reference_config?.writing_bible?.promise,
      project?.synopsis,
      readerPayoffs.join('；'),
    )),
    short_drama_scene: compactBriefText([
      firstScene.title,
      firstDefined(firstScene.conflict, firstScene.reversal, firstScene.reader_payoff, reversals[0], chapterTarget.conflict),
    ].filter(Boolean).join('：')),
    ending_question: compactBriefText(firstDefined(
      chapterTarget.ending_hook,
      retentionContract.ending_hook_rule,
      retentionContract.endingHookRule,
      lastScene.ending_hook_seed,
      lastScene.reversal,
    )),
    retention_double_engine: {
      emotion_engine: compactBriefText(firstDefined(
        chapterTarget.reader_emotion_engine,
        writingBible?.promise,
        writingBible?.reader_promise,
        project?.reference_config?.writing_bible?.promise,
        project?.synopsis,
        readerPayoffs.join('；'),
      )),
      hunger_engine: compactBriefText(firstDefined(
        chapterTarget.reader_hunger_engine,
        informationGaps.join('；'),
        chapterTarget.information_gap,
        chapterTarget.ending_hook,
        lastScene.ending_hook_seed,
      )),
      onion_layers: compactBriefText([
        '简介植入核心悬念',
        '章节开头植入小问号',
        firstDefined(chapterTarget.ending_hook, lastScene.ending_hook_seed, '章节末尾卡住关键信息'),
      ].filter(Boolean).join('；')),
      policy: '留存=情绪+饥饿：情绪负责快速代入和共鸣，饥饿负责用信息差植入问号。',
    },
    retention_pillars: retentionPillars,
    hook_addiction_model: {
      trigger: compactBriefText(firstDefined(
        chapterTarget.hook_trigger,
        chapterTarget.protagonist_goal,
        firstScene.opening_hook,
        chapterTarget.summary,
      )),
      action: compactBriefText(firstDefined(
        chapterTarget.simple_action,
        firstScene.purpose,
        firstScene.conflict,
        chapterTarget.conflict,
      )),
      reward: compactBriefText(firstDefined(
        chapterTarget.surprising_reward,
        readerPayoffs.join('；'),
        chapterTarget.reader_payoff,
        chapterTarget.payoff,
      )),
      investment: compactBriefText(firstDefined(
        chapterTarget.reader_investment,
        lastScene.ending_hook_seed,
        chapterTarget.ending_hook,
        reversals.join('；'),
      )),
      reward_randomness: '奖励不能只兑现预期，至少给一次出乎意料的额外收获、身份线索、资源、关系或地位变化。',
    },
    forbidden_cliches: Array.from(new Set([
      '只写环境氛围不推进目标',
      '用长篇背景解释替代现场危机',
      '章末用模板总结代替追读问题',
      '爽点只停留在旁白承诺不落成动作',
      ...asArray(chapterTarget.forbidden_cliches),
    ].map((item: any) => String(item || '').trim()).filter(Boolean))).slice(0, 8),
  }
}

export function normalizeReaderRetentionBrief(value: any) {
  const raw = value?.reader_retention_brief || value?.readerRetentionBrief || value || {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const retentionDoubleEngine = raw.retention_double_engine || raw.retentionDoubleEngine || {}
  const hookAddictionModel = raw.hook_addiction_model || raw.hookAddictionModel || {}
  const retentionPillars = raw.retention_pillars || raw.retentionPillars || {}
  const normalized = {
    opening_hook: compactBriefText(raw.opening_hook || raw.openingHook),
    payoff_promise: compactBriefText(raw.payoff_promise || raw.payoffPromise),
    information_gap: compactBriefText(raw.information_gap || raw.informationGap),
    emotional_reward: compactBriefText(raw.emotional_reward || raw.emotionalReward),
    short_drama_scene: compactBriefText(raw.short_drama_scene || raw.shortDramaScene),
    ending_question: compactBriefText(raw.ending_question || raw.endingQuestion),
    retention_double_engine: {
      emotion_engine: compactBriefText(retentionDoubleEngine.emotion_engine || retentionDoubleEngine.emotionEngine),
      hunger_engine: compactBriefText(retentionDoubleEngine.hunger_engine || retentionDoubleEngine.hungerEngine),
      onion_layers: compactBriefText(retentionDoubleEngine.onion_layers || retentionDoubleEngine.onionLayers),
      policy: compactBriefText(retentionDoubleEngine.policy),
    },
    retention_pillars: {
      upgrade: compactBriefText(retentionPillars.upgrade || retentionPillars.growth || retentionPillars.level_up || retentionPillars.levelUp),
      resource_pressure: compactBriefText(retentionPillars.resource_pressure || retentionPillars.resourcePressure || retentionPillars.resource_dilemma || retentionPillars.resourceDilemma),
      goal_stack: compactBriefText(retentionPillars.goal_stack || retentionPillars.goalStack || retentionPillars.goals),
      mystery_unlock: compactBriefText(retentionPillars.mystery_unlock || retentionPillars.mysteryUnlock || retentionPillars.decryption),
    },
    hook_addiction_model: {
      trigger: compactBriefText(hookAddictionModel.trigger),
      action: compactBriefText(hookAddictionModel.action),
      reward: compactBriefText(hookAddictionModel.reward),
      investment: compactBriefText(hookAddictionModel.investment),
      reward_randomness: compactBriefText(hookAddictionModel.reward_randomness || hookAddictionModel.rewardRandomness),
    },
    forbidden_cliches: uniqueBriefStrings(raw.forbidden_cliches || raw.forbiddenCliches || [], 8),
  }
  const hasNestedContent = Object.values(normalized.retention_double_engine).some(Boolean)
    || Object.values(normalized.hook_addiction_model).some(Boolean)
    || Object.values(normalized.retention_pillars).some(Boolean)
  const hasContent = Object.entries(normalized)
    .filter(([key]) => key !== 'retention_double_engine' && key !== 'hook_addiction_model' && key !== 'retention_pillars')
    .some(([, item]) => Array.isArray(item) ? item.length > 0 : Boolean(item))
  return hasContent || hasNestedContent ? normalized : null
}

export function normalizeFirst30RetentionBrief(value: any) {
  const raw = value?.first30_retention_brief || value?.first30RetentionBrief || value || {}
  if (!raw || typeof raw !== 'object') return raw || null
  const flags = uniqueBriefStrings(raw.flags || raw.risk_flags || raw.riskFlags || [], 10)
  const risks = asArray(raw.risks || raw.segment_risks || raw.segmentRisks)
  const requiredActions = uniqueBriefStrings(raw.required_actions || raw.requiredActions || raw.next_actions || raw.nextActions || [], 10)
  const normalized = {
    report_score: Number(raw.report_score ?? raw.reportScore ?? 0) || null,
    report_status: compactBriefText(raw.report_status || raw.reportStatus || raw.status),
    report_summary: compactBriefText(raw.report_summary || raw.reportSummary || raw.summary),
    report_created_at: compactBriefText(raw.report_created_at || raw.reportCreatedAt || raw.created_at || raw.createdAt),
    promise_ready: Boolean(raw.promise_ready ?? raw.promiseReady ?? false),
    reader_promise: compactBriefText(raw.reader_promise || raw.readerPromise),
    chapter_no: Number(raw.chapter_no ?? raw.chapterNo ?? 0) || null,
    chapter_score: Number(raw.chapter_score ?? raw.chapterScore ?? 0) || null,
    chapter_title: compactBriefText(raw.chapter_title || raw.chapterTitle || raw.title),
    segment_key: compactBriefText(raw.segment_key || raw.segmentKey),
    segment_label: compactBriefText(raw.segment_label || raw.segmentLabel),
    segment_score: Number(raw.segment_score ?? raw.segmentScore ?? 0) || null,
    flags,
    risks,
    risk_level: compactBriefText(raw.risk_level || raw.riskLevel),
    repair_focus: compactBriefText(raw.repair_focus || raw.repairFocus),
    required_actions: requiredActions,
  }
  const hasContent = Object.values(normalized).some(item => Array.isArray(item) ? item.length > 0 : Boolean(item))
  return hasContent ? normalized : null
}

export function first30RetentionBriefFromContext(contextPackage: any = {}, preDraftBrief: any = null) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const brief = preDraftBrief || contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return normalizeFirst30RetentionBrief(chapterTarget.first30_retention_brief
    || chapterTarget.first30RetentionBrief
    || brief.first30_retention_brief
    || brief.first30RetentionBrief
    || contextPackage?.first30_retention_context
    || contextPackage?.first30RetentionContext
    || contextPackage?.first30_retention_brief
    || contextPackage?.first30RetentionBrief
    || null)
}

export function normalizeReaderDropRiskBrief(value: any, readerRetentionBrief: any = null, first30RetentionBrief: any = null) {
  const raw = value?.reader_drop_risk_brief || value?.readerDropRiskBrief || value || {}
  const dropPoints = uniqueBriefStrings(raw.drop_points || raw.dropPoints || raw.risks || [], 10)
  const pullPoints = uniqueBriefStrings(raw.pull_points || raw.pullPoints || raw.reader_pull || raw.readerPull || [], 8)
  const repairActions = uniqueBriefStrings(raw.repair_actions || raw.repairActions || raw.required_actions || raw.requiredActions || [], 10)
  const first30Flags = uniqueBriefStrings(first30RetentionBrief?.flags || [], 6)
  const first30Actions = uniqueBriefStrings(first30RetentionBrief?.required_actions || first30RetentionBrief?.requiredActions || [], 6)
  const openingGuardrail = compactBriefText(
    raw.opening_guardrail
    || raw.openingGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /开篇|开场|前\s*300|前三章|第1章|第一章|起手/)
    || (readerRetentionBrief?.opening_hook ? `开篇 300 字必须落地：${readerRetentionBrief.opening_hook}` : ''),
  )
  const middleGuardrail = compactBriefText(
    raw.middle_guardrail
    || raw.middleGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /中段|解释|设定|节奏|场景|试读十章|第4-10|掉速|水/)
    || repairActions.find((item: string) => item !== openingGuardrail && !/章末|钩子|结尾|翻页/.test(item))
    || '',
  )
  const endingGuardrail = compactBriefText(
    raw.ending_guardrail
    || raw.endingGuardrail
    || firstMatchingBrief([...repairActions, ...dropPoints, ...first30Actions, ...first30Flags], /章末|钩子|结尾|翻页|未解|下一章|最后/)
    || (readerRetentionBrief?.ending_question ? `章末必须压出追读问题：${readerRetentionBrief.ending_question}` : ''),
  )
  const status = compactBriefText(raw.status, dropPoints.length || repairActions.length || first30Flags.length ? 'needs_repair' : 'ready')
  const qualityBar = compactBriefText(raw.quality_bar || raw.qualityBar || raw.quality_bar_label || raw.qualityBarLabel, '起点1万均订试读基准')
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  if (!dropPoints.length && !pullPoints.length && !repairActions.length && !openingGuardrail && !middleGuardrail && !endingGuardrail) return null
  return {
    status,
    score,
    quality_bar: qualityBar,
    drop_points: dropPoints,
    pull_points: pullPoints,
    repair_actions: repairActions,
    opening_guardrail: openingGuardrail,
    middle_guardrail: middleGuardrail,
    ending_guardrail: endingGuardrail,
  }
}
