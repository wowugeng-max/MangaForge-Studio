function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null || value === '' ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
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

export const SECONDARY_BENCHMARK_BOUNDARY_RULES = [
  '副对标只用于结构/情绪/设定参考，不参与文风画像和原文锚点。',
  '副书不进文风、不进原文锚点；正文 prompt 不读取副书文风.md、副书原文或副书原句。',
  '主对标最多 1 本用于文风和原文锚点；副对标只能提供可抽象复用的结构、情绪、设定或角色关系参考。',
  '若副对标与主对标口吻冲突，主对标文风和当前作品契约优先，副对标只保留结构用途。',
  '副对标执行排序：同题材 > 弱相关 > 参考；同级再按引用强度 辅 > 参考，最后按对标书列表顺序或书名稳定排序。',
  '副书数量不限；超过阶段预算时裁剪召回条目，不删除书目记录。',
  '缺少对标书列表或有副书未登记时，保留 gaps.benchmark_registry_missing，提示补全清单。',
]

function benchmarkRecallGapStrings(...values: any[]) {
  const rows: string[] = []
  const seen = new WeakSet<object>()
  const visit = (value: any, prefix = '') => {
    if (value == null || value === false) return
    if (typeof value === 'string' || typeof value === 'number') {
      const text = compactBriefText(value)
      if (text) rows.push(prefix ? `${prefix}: ${text}` : text)
      return
    }
    if (value === true) {
      if (prefix) rows.push(prefix)
      return
    }
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, prefix))
      return
    }
    if (typeof value === 'object') {
      if (seen.has(value)) return
      seen.add(value)
      for (const [key, item] of Object.entries(value)) {
        visit(item, prefix ? `${prefix}.${key}` : key)
      }
    }
  }
  values.forEach(value => visit(value))
  return uniqueBriefStrings(rows, 12)
}

function secondaryBenchmarkRecallSources(value: any) {
  return [
    value?.secondary_benchmark_recall_summary,
    value?.secondaryBenchmarkRecallSummary,
    value?.secondary_benchmark_summary,
    value?.secondaryBenchmarkSummary,
    value?.sub_benchmark_recall_summary,
    value?.subBenchmarkRecallSummary,
    value?.reference_benchmark_recall_summary,
    value?.referenceBenchmarkRecallSummary,
    value?.benchmark_recall?.secondary_benchmark_recall_summary,
    value?.benchmarkRecall?.secondaryBenchmarkRecallSummary,
    value?.style_recall?.secondary_benchmark_recall_summary,
    value?.styleRecall?.secondaryBenchmarkRecallSummary,
  ]
}

function secondaryBenchmarkRankText(value: any) {
  return compactBriefText(value).toLowerCase()
}

function secondaryBenchmarkRelevanceRank(value: any) {
  const text = secondaryBenchmarkRankText(value)
  if (/同题材|same/.test(text)) return 0
  if (/弱相关|weak/.test(text)) return 1
  if (/参考|reference|ref/.test(text)) return 2
  if (/不相关|irrelevant/.test(text)) return 9
  return 3
}

function secondaryBenchmarkStrengthRank(value: any) {
  const text = secondaryBenchmarkRankText(value)
  if (/辅|support|secondary/.test(text)) return 0
  if (/参考|reference|ref/.test(text)) return 1
  return 2
}

function secondaryBenchmarkTotalBudget(...sources: any[]) {
  const candidates = sources.flatMap(source => [
    source?.secondary_benchmark_total_budget,
    source?.secondaryBenchmarkTotalBudget,
    source?.secondary_benchmark_stage_budget,
    source?.secondaryBenchmarkStageBudget,
    source?.benchmark_recall?.secondary_benchmark_total_budget,
    source?.benchmarkRecall?.secondaryBenchmarkTotalBudget,
    source?.style_recall?.secondary_benchmark_total_budget,
    source?.styleRecall?.secondaryBenchmarkTotalBudget,
  ])
  const budget = candidates.map(value => Number(value)).find(value => Number.isFinite(value) && value >= 0)
  return budget ?? null
}

function applySecondaryBenchmarkBudget(rows: any[], totalBudget: number | null) {
  if (totalBudget === null) return rows
  let remaining = Math.max(0, Math.floor(totalBudget))
  return rows.map(row => {
    const requested = Math.max(0, Number(row.recall_count || 0) || 0)
    const allowed = Math.min(requested, remaining)
    remaining -= allowed
    return {
      ...row,
      recall_count: allowed,
      requested_recall_count: requested,
      budget_trimmed: allowed < requested,
      budget_note: allowed < requested ? `阶段总预算剩余不足，按 oh-story 跨书召回规则裁剪 ${requested - allowed} 条召回内容但保留书目记录。` : '',
    }
  })
}

function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  const rows: any[] = []
  values.forEach(value => {
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)
    rows.push(value)
  })
  return rows
}

export function normalizeSecondaryBenchmarkRecallSummary(...sources: any[]) {
  const totalBudget = secondaryBenchmarkTotalBudget(...sources)
  const rows = uniqueObjectReferences(
    sources.flatMap(source => secondaryBenchmarkRecallSources(source).flatMap(item => asArray(item))),
  )
    .map((row: any, index: number) => {
      const bookTitle = compactBriefText(row?.book_title || row?.bookTitle || row?.book || row?.title || row?.name)
      const usage = compactBriefText(row?.usage || row?.usage_method || row?.usageMethod || row?.use || row?.summary || row?.note)
      if (!bookTitle && !usage) return null
      const registryOrder = Number(row?.registry_order ?? row?.registryOrder ?? row?.benchmark_order ?? row?.benchmarkOrder ?? row?.order)
      return {
        book_title: bookTitle || '副对标',
        citation_strength: compactBriefText(row?.citation_strength || row?.citationStrength || row?.reference_strength || row?.referenceStrength || row?.strength, '参考'),
        relevance: compactBriefText(row?.relevance || row?.relatedness || row?.topic_relevance || row?.topicRelevance, '同题材'),
        recall_stage: compactBriefText(row?.recall_stage || row?.recallStage || row?.stage, '正文'),
        recall_count: Number(row?.recall_count ?? row?.recallCount ?? row?.count ?? 0) || 0,
        usage,
        registry_order: Number.isFinite(registryOrder) ? registryOrder : null,
        _source_index: index,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (
      secondaryBenchmarkRelevanceRank(a.relevance) - secondaryBenchmarkRelevanceRank(b.relevance)
      || secondaryBenchmarkStrengthRank(a.citation_strength) - secondaryBenchmarkStrengthRank(b.citation_strength)
      || (a.registry_order ?? Number.MAX_SAFE_INTEGER) - (b.registry_order ?? Number.MAX_SAFE_INTEGER)
      || String(a.book_title || '').localeCompare(String(b.book_title || ''), 'zh-Hans-CN')
      || Number(a._source_index || 0) - Number(b._source_index || 0)
    ))
    .map(({ _source_index, ...row }: any) => row)
    .slice(0, 8)
  return applySecondaryBenchmarkBudget(rows, totalBudget)
}

function secondaryBenchmarkRegistryMissing(...sources: any[]) {
  return sources.some(source => {
    if (!source || typeof source !== 'object') return false
    if (source.benchmark_registry_missing || source.benchmarkRegistryMissing || source.registry_missing || source.registryMissing) return true
    if (benchmarkRecallGapStrings(source.gaps || source.recall_gaps || source.recallGaps).some(gap => /benchmark_registry_missing|对标书列表.*缺|未登记/.test(gap))) return true
    return secondaryBenchmarkRecallSources(source)
      .flatMap(item => asArray(item))
      .some((row: any) => row?.benchmark_registry_missing || row?.benchmarkRegistryMissing || row?.registry_order_missing || row?.registryOrderMissing)
  })
}

export function normalizeWritePreparationBenchmarkRecallContext(benchmarkRecallBrief: any, options: any = {}) {
  if (!benchmarkRecallBrief) {
    return {
      source_gaps: [],
      must_confirm: [],
      execution_order: [],
    }
  }
  const secondaryBenchmarkRecallSummary = normalizeSecondaryBenchmarkRecallSummary(benchmarkRecallBrief)
  const secondaryBenchmarkBoundaryRules = uniqueBriefStrings([
    ...asArray(benchmarkRecallBrief.secondary_benchmark_boundary_rules || benchmarkRecallBrief.secondaryBenchmarkBoundaryRules),
    ...(secondaryBenchmarkRecallSummary.length ? SECONDARY_BENCHMARK_BOUNDARY_RULES : []),
  ], 8)
  const benchmarkRecallGaps = uniqueBriefStrings([
    ...benchmarkRecallGapStrings(
      options.benchmark_recall_gaps,
      options.benchmarkRecallGaps,
      benchmarkRecallBrief.gaps,
      benchmarkRecallBrief.recall_gaps,
      benchmarkRecallBrief.recallGaps,
      benchmarkRecallBrief.benchmark_recall_gaps,
      benchmarkRecallBrief.benchmarkRecallGaps,
    ),
    secondaryBenchmarkRegistryMissing(benchmarkRecallBrief) ? 'benchmark_registry_missing' : '',
  ], 8)
  return {
    source_gaps: uniqueBriefStrings(
      benchmarkRecallGaps.map(gap => `文风召回：${gap}`),
      8,
    ),
    must_confirm: uniqueBriefStrings([
      ...benchmarkRecallGaps.map(gap => `文风召回缺口：${gap}`),
      ...secondaryBenchmarkBoundaryRules.slice(0, 4).map(rule => `副对标边界：${rule}`),
      secondaryBenchmarkRecallSummary.length
        ? `副对标召回摘要：${secondaryBenchmarkRecallSummary.map((row: any) => row.book_title).filter(Boolean).join('、')} 只作为结构/情绪/设定参考。`
        : '',
    ], 8),
    execution_order: secondaryBenchmarkBoundaryRules.length
      ? ['Step 2.3 文风召回：先确认主对标最多 1 本，保留 secondary_benchmark_boundary；副对标召回摘要只进结构/情绪/设定，不进文风、不进原文锚点。']
      : [],
  }
}

export function buildCreationContractChecklist(options: any = {}) {
  const targetReaderContract = options.target_reader_contract || options.targetReaderContract || {}
  const genrePositioningContract = options.genre_positioning_contract || options.genrePositioningContract || {}
  const plotSpecialTopicsContract = options.plot_special_topics_contract || options.plotSpecialTopicsContract || {}
  const storyPowerContract = options.story_power_contract || options.storyPowerContract || {}
  const coreContractRadar = options.core_contract_radar || options.coreContractRadar || {}
  const readerRetentionBrief = options.reader_retention_brief || options.readerRetentionBrief || {}
  const targetReader = compactBriefText(
    targetReaderContract.reader_profile
    || targetReaderContract.readerProfile
    || asArray(targetReaderContract.reader_desires || targetReaderContract.readerDesires)[0],
  )
  const genrePositioning = compactBriefText(
    genrePositioningContract.genre_label
    || genrePositioningContract.genreLabel
    || asArray(genrePositioningContract.genre_tags || genrePositioningContract.genreTags)[0]
    || asArray(genrePositioningContract.selling_points || genrePositioningContract.sellingPoints)[0],
  )
  const plotSpecialTopics = compactBriefText(
    asArray(plotSpecialTopicsContract.matched_topics || plotSpecialTopicsContract.matchedTopics)[0]
    || asArray(plotSpecialTopicsContract.goldfinger_design_rules || plotSpecialTopicsContract.goldfingerDesignRules)[0]
    || asArray(plotSpecialTopicsContract.launch_checkpoint_rules || plotSpecialTopicsContract.launchCheckpointRules)[0]
    || asArray(plotSpecialTopicsContract.faction_hand_rules || plotSpecialTopicsContract.factionHandRules)[0]
    || asArray(plotSpecialTopicsContract.quality_checks || plotSpecialTopicsContract.qualityChecks)[0],
  )
  const storyPower = compactBriefText(
    asArray(storyPowerContract.story_power_dimensions || storyPowerContract.storyPowerDimensions)[0]
    || asArray(storyPowerContract.action_rules || storyPowerContract.actionRules)[0]
    || asArray(storyPowerContract.causal_feedback_rules || storyPowerContract.causalFeedbackRules)[0]
    || asArray(storyPowerContract.quality_checks || storyPowerContract.qualityChecks)[0],
  )
  const coreContract = compactBriefText(
    asArray(coreContractRadar.must_serve || coreContractRadar.mustServe)[0]
    || coreContractRadar.summary,
  )
  const retentionContract = compactBriefText(
    readerRetentionBrief.opening_hook
    || readerRetentionBrief.openingHook
    || readerRetentionBrief.opening_hook_rule
    || readerRetentionBrief.openingHookRule
    || readerRetentionBrief.ending_question
    || readerRetentionBrief.endingQuestion
    || readerRetentionBrief.ending_hook_rule
    || readerRetentionBrief.endingHookRule,
  )
  return uniqueBriefStrings([
    targetReader ? `目标读者：${targetReader}` : '',
    genrePositioning ? `题材定位：${genrePositioning}` : '',
    plotSpecialTopics ? `特殊题材：${plotSpecialTopics}` : '',
    storyPower ? `故事力：${storyPower}` : '',
    coreContract ? `核心承诺：${coreContract}` : '',
    retentionContract ? `追读留存：${retentionContract}` : '',
  ], 8)
}

export function buildWritePreparationBriefFromParts(parts: any = {}) {
  const benchmarkRecallPreparation = parts.benchmark_recall_preparation || parts.benchmarkRecallPreparation || {
    source_gaps: [],
    must_confirm: [],
    execution_order: [],
  }
  const sourceRows = asArray(parts.state_source_rows || parts.stateSourceRows)
  const stateSourceGaps = sourceRows
    .filter((row: any) => !['ready', 'optional', 'pass', 'ok'].includes(String(row?.status || '').toLowerCase()))
    .map((row: any) => compactBriefText([
      row.label || row.key,
      row.status ? `状态=${row.status}` : '',
      row.evidence,
    ].filter(Boolean).join('｜')))
    .filter(Boolean)
  const sourceGaps = uniqueBriefStrings([
    ...stateSourceGaps,
    ...asArray(benchmarkRecallPreparation.source_gaps || benchmarkRecallPreparation.sourceGaps),
  ], 12)
  const assetLinkageContract = parts.asset_linkage_contract || parts.assetLinkageContract || {}
  const assetRisks = uniqueBriefStrings(asArray(assetLinkageContract.relationship_graph_risks || assetLinkageContract.relationshipGraphRisks)
    .map(assetText)
    .filter(Boolean), 8)
  const deliveryRiskCarryOver = parts.delivery_risk_carry_over || parts.deliveryRiskCarryOver || {}
  const deliveryActions = uniqueBriefStrings([
    deliveryRiskCarryOver?.required_actions,
    asArray(deliveryRiskCarryOver?.opening_actions).map((item: any) => `开篇动作：${item}`),
    asArray(deliveryRiskCarryOver?.middle_actions).map((item: any) => `中段动作：${item}`),
    asArray(deliveryRiskCarryOver?.ending_actions).map((item: any) => `章末动作：${item}`),
    asArray(deliveryRiskCarryOver?.forbidden_repeats).map((item: any) => `禁用重复：${item}`),
    deliveryRiskCarryOver?.items,
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 12)
  const chapterBlueprint = parts.chapter_blueprint || parts.chapterBlueprint || {}
  const beatDensityContract = chapterBlueprint?.beat_density_contract || chapterBlueprint?.beatDensityContract || null
  const blueprintFocus = uniqueBriefStrings([
    chapterBlueprint?.opening_hook ? `开篇钩子：${chapterBlueprint.opening_hook}` : '',
    chapterBlueprint?.core_payoff ? `核心回报：${chapterBlueprint.core_payoff}` : '',
    chapterBlueprint?.target_emotion ? `目标情绪：${chapterBlueprint.target_emotion}` : '',
    beatDensityContract?.min_beat_count ? `情节点密度：本章目标 ${beatDensityContract.target_word_count || '?'} 字，建议 ${beatDensityContract.min_beat_count}-${beatDensityContract.max_beat_count} 个情节点，当前 ${beatDensityContract.current_beat_count || 0} 个，缺口 ${beatDensityContract.density_gap || 0} 个` : '',
    chapterBlueprint?.ending_contract?.next_chapter_pull ? `章尾拉力：${chapterBlueprint.ending_contract.next_chapter_pull}` : '',
    chapterBlueprint?.writing_intent ? `写作意图：${chapterBlueprint.writing_intent}` : '',
  ], 8)
  const readerRetentionBrief = parts.reader_retention_brief || parts.readerRetentionBrief || {}
  const readerPayoffFocus = uniqueBriefStrings([
    readerRetentionBrief?.opening_hook,
    readerRetentionBrief?.hook_signal,
    readerRetentionBrief?.reader_payoff,
    readerRetentionBrief?.ending_pull,
    readerRetentionBrief?.page_turn_question,
    readerRetentionBrief?.core_question,
    asArray(readerRetentionBrief?.must_deliver || readerRetentionBrief?.mustDeliver),
  ].flat().map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const rollingRhythmPreflight = parts.rolling_rhythm_preflight || parts.rollingRhythmPreflight || null
  const creationContractChecklist = uniqueBriefStrings(parts.creation_contract_checklist || parts.creationContractChecklist || [], 12)
  const mustConfirm = uniqueBriefStrings([
    ...creationContractChecklist.map(item => `创作契约：${item}`),
    ...asArray(benchmarkRecallPreparation.must_confirm || benchmarkRecallPreparation.mustConfirm),
    ...sourceGaps.map(item => `来源就绪：${item}`),
    ...assetRisks.map(item => `关系图风险：${item}`),
    ...deliveryActions,
    rollingRhythmPreflight?.principle ? `滚动节奏预检：${rollingRhythmPreflight.principle}` : '',
    rollingRhythmPreflight?.next_actions || rollingRhythmPreflight?.nextActions,
    ...blueprintFocus.slice(0, 2),
    ...readerPayoffFocus.slice(0, 2).map(item => `读者回报：${item}`),
  ].flat(), 22)
  const readinessStatus = sourceGaps.length || assetRisks.length || deliveryActions.length || rollingRhythmPreflight ? 'needs_context' : 'ready'
  return {
    version: 'oh_story_write_preparation_v1',
    source: 'mangaforge_pre_draft_brief',
    readiness_status: readinessStatus,
    source_gaps: sourceGaps,
    asset_risks: assetRisks,
    delivery_risk_actions: deliveryActions,
    rolling_rhythm_preflight: rollingRhythmPreflight,
    creation_contract_checklist: creationContractChecklist,
    blueprint_focus: blueprintFocus,
    reader_payoff_focus: readerPayoffFocus,
    must_confirm: mustConfirm,
    execution_order: [
      'Step 2.2 状态筛选：上一章承接、角色状态、伏笔/时间线和世界约束只保留会影响本章正确性的内容。',
      'Step 2.3 文风召回：确认情绪模块、节奏参照、文风摘要、匹配章技巧和 gaps；无对标时明确标记，不让文风覆盖情绪/节奏目标。',
      ...asArray(benchmarkRecallPreparation.execution_order || benchmarkRecallPreparation.executionOrder),
      'Step 2.4 意图确认：用一句话锁定本章情绪、节奏、模块、文风边界、内容概括、逻辑线、出场顺序、代价收益和章尾承接。',
      ...asArray(rollingRhythmPreflight?.execution_order || rollingRhythmPreflight?.executionOrder),
      '再锁定章节蓝图与资产：目标、冲突、开篇钩子、核心回报、关键资产归属/触发/代价和角色状态变化必须接到现场功能。',
      '最后生成正文：按场景卡顺序写可见行动、对话压力、信息变化和回执证据。',
    ],
  }
}
