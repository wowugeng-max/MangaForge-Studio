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

function firstMatchingBrief(items: any[], pattern: RegExp) {
  return uniqueBriefStrings(items, 20).find(item => pattern.test(item)) || ''
}

function mergedContextChapterTarget(contextPackage: any = {}) {
  return {
    ...(contextPackage?.chapter_target || {}),
    ...(contextPackage?.chapterTarget || {}),
  }
}

export function normalizeRecentFatigueSignal(value: any) {
  const key = compactBriefText(value?.key || value?.field || value?.type)
  const label = compactBriefText(value?.label || value?.title || key)
  const status = compactBriefText(value?.status || value?.state, 'ok').toLowerCase()
  const detail = compactBriefText(value?.detail || value?.reason || value?.summary || value?.text)
  if (!key && !label && !detail) return null
  return {
    key: key || label,
    label: label || key || '疲劳风险',
    status,
    detail,
  }
}

export function normalizeRecentFatigueBrief(value: any) {
  const raw = value?.recent_fatigue_brief
    || value?.recentFatigueBrief
    || value?.recent_fatigue_radar
    || value?.recentFatigueRadar
    || value
    || {}
  const signals = asArray(raw.signals || raw.fatigue_signals || raw.fatigueSignals)
    .map((item: any) => normalizeRecentFatigueSignal(item))
    .filter(Boolean)
    .slice(0, 8)
  const warnSignals = signals.filter((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal.status || '').toLowerCase()))
  const nextActions = uniqueBriefStrings(raw.next_actions || raw.nextActions || raw.required_actions || raw.requiredActions || [], 8)
  const fatigueRisks = uniqueBriefStrings([
    raw.summary,
    raw.risk_summary,
    raw.riskSummary,
    ...warnSignals.map((signal: any) => signal.detail || signal.label),
    raw.fatigue_risks,
    raw.fatigueRisks,
  ], 10)
  const actionAndRisks = [...nextActions, ...fatigueRisks]
  const conflictVariationSource = firstMatchingBrief(actionAndRisks, /冲突|压迫|对手|来源|阻碍/)
  const payoffVariationSource = firstMatchingBrief(actionAndRisks, /回报|爽点|打脸|兑现|奖励/)
  const hookVariationSource = firstMatchingBrief(actionAndRisks, /章末|钩子|问题|悬念|翻页/)
  const sceneFreshnessSource = firstMatchingBrief(actionAndRisks, /场面|可视化|标志性|IP|画面/)
  const conflictVariation = compactBriefText(
    raw.conflict_variation
    || raw.conflictVariation
    || (conflictVariationSource ? `更换压迫来源：${conflictVariationSource}` : '')
    || '本章必须更换压迫来源或对手施压方式，不能继续复刻最近章节的同类冲突。',
  )
  const payoffVariation = compactBriefText(
    raw.payoff_variation
    || raw.payoffVariation
    || (payoffVariationSource ? `更换回报形态：${payoffVariationSource}` : '')
    || '本章必须更换回报形态，不能只重复上一轮打脸、震惊或解释。',
  )
  const hookVariation = compactBriefText(
    raw.hook_variation
    || raw.hookVariation
    || (hookVariationSource ? `更换章末问题：${hookVariationSource}` : '')
    || '本章章末问题必须换角度，不得重复最近章节已经用过的追读问题。',
  )
  const sceneFreshness = compactBriefText(
    raw.scene_freshness
    || raw.sceneFreshness
    || (sceneFreshnessSource ? `补新可视化场面：${sceneFreshnessSource}` : '')
    || '本章至少补一个新的可视化场面或空间动作，避免连续章节只有同类对话交锋。',
  )
  if (!signals.length && !fatigueRisks.length && !nextActions.length && !conflictVariation && !payoffVariation && !hookVariation && !sceneFreshness) return null
  return {
    status: compactBriefText(raw.status, warnSignals.length ? 'needs_attention' : 'ready'),
    score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : null,
    chapter_range_label: compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel),
    summary: compactBriefText(raw.summary),
    fatigue_risks: fatigueRisks,
    risk_signals: signals,
    conflict_variation: conflictVariation,
    payoff_variation: payoffVariation,
    hook_variation: hookVariation,
    scene_freshness: sceneFreshness,
    next_actions: nextActions,
    signals,
  }
}

export function buildRollingRhythmPreflight(contextPackage: any = {}, options: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const recentFatigueSource = options.recent_fatigue_brief
    || options.recentFatigueBrief
    || target.recent_fatigue_brief
    || target.recentFatigueBrief
    || target.recent_fatigue_radar
    || target.recentFatigueRadar
    || contextPackage?.recent_fatigue_brief
    || contextPackage?.recentFatigueBrief
    || contextPackage?.recent_fatigue_radar
    || contextPackage?.recentFatigueRadar
  const rawRecentFatigue = recentFatigueSource?.recent_fatigue_brief
    || recentFatigueSource?.recentFatigueBrief
    || recentFatigueSource?.recent_fatigue_radar
    || recentFatigueSource?.recentFatigueRadar
    || recentFatigueSource
  const hasConcreteRecentFatigue = Boolean(
    typeof rawRecentFatigue === 'string'
      ? compactBriefText(rawRecentFatigue)
      : compactBriefText(rawRecentFatigue?.summary || rawRecentFatigue?.risk_summary || rawRecentFatigue?.riskSummary)
        || asArray(rawRecentFatigue?.signals || rawRecentFatigue?.risk_signals || rawRecentFatigue?.fatigue_signals || rawRecentFatigue?.fatigueSignals).length
        || uniqueBriefStrings([
          rawRecentFatigue?.fatigue_risks,
          rawRecentFatigue?.fatigueRisks,
          rawRecentFatigue?.next_actions,
          rawRecentFatigue?.nextActions,
          rawRecentFatigue?.required_actions,
          rawRecentFatigue?.requiredActions,
        ].flat(), 1).length,
  )
  const recentFatigueBrief = hasConcreteRecentFatigue ? normalizeRecentFatigueBrief(rawRecentFatigue) : null
  const batchPreflight = options.batch_preflight
    || options.batchPreflight
    || target.batch_preflight
    || target.batchPreflight
    || contextPackage?.batch_preflight
    || contextPackage?.batchPreflight
    || {}
  const readerExpectationDebt = options.reader_expectation_debt_context
    || options.readerExpectationDebtContext
    || target.reader_expectation_debt_context
    || target.readerExpectationDebtContext
    || contextPackage?.reader_expectation_debt_context
    || contextPackage?.readerExpectationDebtContext
    || {}
  const signalRows = asArray(recentFatigueBrief?.signals || recentFatigueBrief?.risk_signals)
    .map((signal: any) => normalizeRecentFatigueSignal(signal))
    .filter(Boolean)
  const recentFatigueHasRisk = signalRows.some((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal?.status || '').toLowerCase()))
    || !['', 'ok', 'ready', 'pass', 'passed'].includes(String(recentFatigueBrief?.status || '').toLowerCase())
    || uniqueBriefStrings([
      recentFatigueBrief?.summary,
      recentFatigueBrief?.fatigue_risks,
      recentFatigueBrief?.next_actions,
    ].flat(), 1).length > 0
  const batchGuardrailTexts = [
    ...asArray(batchPreflight?.guardrails),
    ...asArray(batchPreflight?.warnings),
    ...asArray(batchPreflight?.warning),
  ]
    .map((item: any) => compactBriefText(typeof item === 'string' ? item : [item?.label, item?.status, item?.detail || item?.summary || item?.text].filter(Boolean).join('：')))
    .filter(Boolean)
  const debtTexts = uniqueBriefStrings([
    readerExpectationDebt?.summary,
    readerExpectationDebt?.risk_summary,
    readerExpectationDebt?.riskSummary,
    readerExpectationDebt?.status,
    readerExpectationDebt?.overdue,
    readerExpectationDebt?.keep_alive,
    readerExpectationDebt?.keepAlive,
    readerExpectationDebt?.must_deliver,
    readerExpectationDebt?.mustDeliver,
  ].flat(), 8)
  const signalTexts = uniqueBriefStrings([
    recentFatigueBrief?.summary,
    recentFatigueBrief?.fatigue_risks,
    recentFatigueBrief?.next_actions,
    recentFatigueHasRisk ? recentFatigueBrief?.conflict_variation : '',
    recentFatigueHasRisk ? recentFatigueBrief?.payoff_variation : '',
    recentFatigueHasRisk ? recentFatigueBrief?.hook_variation : '',
    recentFatigueHasRisk ? recentFatigueBrief?.scene_freshness : '',
    ...signalRows.map((signal: any) => [signal.key, signal.label, signal.detail].filter(Boolean).join('：')),
    ...batchGuardrailTexts,
    ...debtTexts,
  ].flat(), 18)
  const signalBlob = signalTexts.join('；')
  const signalKeys = signalRows.map((signal: any) => String(signal?.key || '')).join('；')
  const hasRisk = signalRows.some((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal?.status || '').toLowerCase()))
    || signalTexts.some(text => /warn|needs_attention|风险|缺口|断期待|期待真空|卖点偏移|重复|疲劳|同质|缺少/.test(text))
  if (!hasRisk) return null

  const expectationVacuumRough = /expectation_chain_break|ending_suspense_hook_gap|ending_harvest_handoff_gap|expectation_ladder_gap|payoff_interval|recent_payoff_drought|断期待|期待真空|期待清空|没有新期待|缺少明确章末钩子|章末钩子缺|延迟满足|爽点间隔|回报不足/.test(`${signalKeys}；${signalBlob}`)
  const sellingPointDriftRough = /reader_need_coverage_gap|core_hook_absence_gap|core_hook_angle_repetition_gap|genre_positioning|target_reader|卖点偏移|核心梗|核心卖点|题材长板|读者需求|偏离/.test(`${signalKeys}；${signalBlob}`)
  const repetitionBoundaryRough = /repeated_reader_payoff_type|repeated_ending_hook_type|repeated_core_element_combo|core_hook_angle_repetition_gap|同一核心梗|连续3次|连续三次|连续.*无差异化|重复|同质化|回报形态重复|钩子类型重复/.test(`${signalKeys}；${signalBlob}`)
  const expectationVacuumRisks = uniqueBriefStrings([
    expectationVacuumRough ? `期待真空：${firstMatchingBrief(signalTexts, /断期待|期待真空|期待清空|没有新期待|缺少明确章末钩子|延迟满足|爽点间隔|回报不足/) || '当前目标兑现、延迟满足或章末钩子缺口会让读者短期期待断线。'}` : '',
    expectationVacuumRough ? '拉期待速度 > 断期待速度：当前目标完成前提前铺设下一目标线索，满足当前期待后迅速给出新期待。' : '',
  ], 4)
  const sellingPointDriftRisks = uniqueBriefStrings([
    sellingPointDriftRough ? `卖点偏移：${firstMatchingBrief(signalTexts, /卖点偏移|核心梗|核心卖点|题材长板|读者需求|偏离/) || '爽点满足的需求可能偏离题材卖点或本书核心承诺。'}` : '',
  ], 4)
  const repetitionBoundaryRisks = uniqueBriefStrings([
    repetitionBoundaryRough ? `同一核心梗连续3次以上无差异化：${firstMatchingBrief(signalTexts, /同一核心梗|连续3次|连续三次|连续.*无差异化|重复|同质化|回报形态重复|钩子类型重复/) || '连续同类回报、同类钩子或同一核心梗角度会触发审美疲劳。'}` : '',
  ], 4)
  const expectationFirstAid = expectationVacuumRisks.length
    ? [
      '反派视角转接：展示反派行动或误判，制造读者知道而主角暂未知的信息差。',
      '突发意外：让不按计划发展的事件强行介入，立刻恢复现场压力。',
      '配角杠杆：用配角危机、立场变化或主动求助重新制造紧迫感。',
      '超额收获：给出远超预期的额外奖励、线索或代价，把旧期待兑现转成新期待。',
    ]
    : []
  const nextActions = uniqueBriefStrings([
    recentFatigueBrief?.next_actions,
    '先执行拉期待速度 > 断期待速度：当前目标完成前提前铺设下一目标线索。',
    expectationVacuumRisks.length ? '期待真空期急救至少选一项：反派视角转接、突发意外、配角杠杆或超额收获。' : '',
    sellingPointDriftRisks.length ? '卖点偏移纠偏：把本章爽点重新接回题材卖点、书籍卖点和目标读者需求。' : '',
    repetitionBoundaryRisks.length ? '重复边界纠偏：同一核心梗连续3次以上无差异化时，必须更换冲突来源、回报形态、影响范围或章末问题。' : '',
  ].flat(), 10)
  return {
    version: 'oh_story_rolling_rhythm_preflight_v1',
    status: 'needs_attention',
    source: 'outline-rhythm.md',
    principle: '拉期待速度 > 断期待速度',
    risk_signals: signalRows,
    risk_summary: signalTexts,
    expectation_vacuum_risks: expectationVacuumRisks,
    expectation_first_aid: expectationFirstAid,
    selling_point_drift_risks: sellingPointDriftRisks,
    repetition_boundary_risks: repetitionBoundaryRisks,
    next_actions: nextActions,
    execution_order: [
      'Step 2.35 滚动节奏预检：先判断期待真空、卖点偏移和重复边界，再生成场景卡。',
      '当前目标完成前提前铺设下一目标线索；满足当前期待后迅速给出新期待。',
      '如果触发期待真空期急救，场景卡必须把反派视角转接、突发意外、配角杠杆或超额收获拆成可见事件。',
      '如果触发卖点偏移或同一核心梗连续3次以上无差异化，场景卡必须更换冲突来源、回报形态、影响范围或章末问题。',
    ],
  }
}

export function resolveEffectiveQualityThreshold(baseThreshold: any, contextPackage: any = {}) {
  const base = Math.max(0, Number(baseThreshold || 0))
  const target = mergedContextChapterTarget(contextPackage)
  const fatigueBriefs = [
    target?.recent_fatigue_brief,
    target?.recentFatigueBrief,
    target?.recent_fatigue_radar,
    target?.recentFatigueRadar,
    contextPackage?.recent_fatigue_brief,
    contextPackage?.recentFatigueBrief,
    contextPackage?.recent_fatigue_radar,
    contextPackage?.recentFatigueRadar,
  ]
    .map(item => item ? normalizeRecentFatigueBrief(item) : null)
    .filter(Boolean)

  const hasQualityRegression = fatigueBriefs.some((brief: any) => {
    const signals = asArray(brief?.signals)
    const signalHit = signals.some((signal: any) => String(signal?.key || '').trim() === 'recent_delivery_quality_regression')
    const text = [
      brief?.summary,
      brief?.risk_summary,
      brief?.riskSummary,
      brief?.fatigue_risks,
      brief?.fatigueRisks,
      brief?.next_actions,
      brief?.nextActions,
      ...signals.map((signal: any) => [signal?.label, signal?.detail].join('：')),
    ].flat().map(item => String(item || '')).join('；')
    return signalHit || /连续交稿质量退化|交稿质量退化|质量退化/.test(text)
  })

  return hasQualityRegression ? Math.max(base, 85) : base
}
