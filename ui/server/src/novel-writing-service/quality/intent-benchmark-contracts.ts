import { asArray } from '../../routes/novel-route-utils'
import { normalizeChapterBenchmarkSampleBank } from '../post-delivery/asset-banks'
import { mergeSceneCardStringList } from '../post-delivery/scene-card-delivery-risk'
import { assetText } from './character-asset-contracts'
import { uniqueObjectReferences } from './pre-draft-receipt-sections'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS = [
  '内容概括决定起承转合，不能只按素材顺序堆事件。',
  '情节安排决定主线/辅线/事件线/感情线/逻辑线取舍；不服务本章意图的线索不要展开。',
  '人物关系和出场顺序决定镜头进入顺序，信息差必须借在场角色反应放大。',
  '情节细化决定代价兑现/收益兑现，爽点出手前先铺可指认的危机/期待。',
  '结尾设定和钩子决定章尾承接，爆发后要用一段冷却承接下一钩子。',
  '装逼/打脸/揭露章必须把视角/信息差经在场配角放大成差异化反应。',
]

const OH_STORY_INTENT_CONFIRMATION_CHECKS = [
  '意图确认清楚：正文必须能看出本章按“情绪+节奏+模块+文风指令”执行。',
  '情绪目标兑现：目标情绪不能被无关背景、均匀叙事或过早解释冲淡。',
  '节奏/爆发匹配：蓄势、爆发、冷却、章尾承接必须与本章节奏指令一致。',
  '结构输入落地：内容概括、逻辑线、出场顺序、代价/收益和结尾钩子必须有正文证据。',
  '信息差反应可见：揭露、打脸、反证或反转后，在场角色必须有差异化反应。',
  '文风召回不过界：只执行节奏、停顿、潜台词等抽象技巧，不复制对标原文或桥段。',
]

const OH_STORY_INTENT_DIALOGUE_TONE_BASELINE = [
  '高压/生死/悲痛 beat 下，搞笑担当/轻快配角声线让位，不能用吐槽冲淡本章主情绪。',
  '信息型配角不当科普嘴，信息必须通过立场、追问、误导、证据或行动承接。',
  '对话逐句承接对方情绪，每次情绪转变都要有事件触发，不能跳步换情绪。',
]

export function intentConfirmationExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.intent_confirmation_contract
    || contextPackage?.chapter_target?.intentConfirmationContract
    || contextPackage?.intent_confirmation_contract
    || contextPackage?.intentConfirmationContract
    || contextPackage?.pre_draft_brief?.intent_confirmation_contract
    || contextPackage?.preDraftBrief?.intentConfirmationContract
}

export function styleRecallValueText(strategy: any, key: string) {
  const camelKey = key.replace(/_([a-z])/g, (_match, letter) => String(letter || '').toUpperCase())
  return compactBriefText(
    strategy?.[key]
    || strategy?.[camelKey]
    || strategy?.style_recall?.[key]
    || strategy?.style_recall?.[camelKey]
    || strategy?.styleRecall?.[key]
    || strategy?.styleRecall?.[camelKey]
    || strategy?.benchmark_recall?.[key]
    || strategy?.benchmark_recall?.[camelKey]
    || strategy?.benchmarkRecall?.[key]
    || strategy?.benchmarkRecall?.[camelKey],
  )
}

export function styleRecallList(strategy: any, key: string) {
  const camelKey = key.replace(/_([a-z])/g, (_match, letter) => String(letter || '').toUpperCase())
  return uniqueBriefStrings([
    ...asArray(strategy?.[key]),
    ...asArray(strategy?.[camelKey]),
    ...asArray(strategy?.style_recall?.[key]),
    ...asArray(strategy?.style_recall?.[camelKey]),
    ...asArray(strategy?.styleRecall?.[key]),
    ...asArray(strategy?.styleRecall?.[camelKey]),
    ...asArray(strategy?.benchmark_recall?.[key]),
    ...asArray(strategy?.benchmark_recall?.[camelKey]),
    ...asArray(strategy?.benchmarkRecall?.[key]),
    ...asArray(strategy?.benchmarkRecall?.[camelKey]),
  ], 8)
}

export function benchmarkRecallGapStrings(...values: any[]) {
  const rows: string[] = []
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
      for (const [key, item] of Object.entries(value)) {
        visit(item, prefix ? `${prefix}.${key}` : key)
      }
    }
  }
  values.forEach(value => visit(value))
  return uniqueBriefStrings(rows, 12)
}

function benchmarkRecallAuthorityFromGaps(source: any = {}, gaps: any[] = []) {
  const explicitRules = uniqueBriefStrings(asArray(source?.authority_rules || source?.authorityRules).map(assetText).filter(Boolean), 6)
  const gapRows = uniqueBriefStrings(asArray(gaps).map(assetText).filter(Boolean), 12)
  const conflictRows = gapRows.filter(row => /module_rhythm_conflict|conflict|冲突|文风.*情绪|情绪.*文风|节奏.*文风|文风.*节奏/.test(row))
  const authorityRules = [...explicitRules]
  if (conflictRows.length > 0) {
    authorityRules.push('发生冲突时 selected_emotion_module 与 rhythm_reference 是权威：情绪模块/节奏参照优先；style_profile_summary 文风只管表达，不得压低情绪爆发或覆盖节奏。')
  }
  return {
    authority_rules: uniqueBriefStrings(authorityRules, 6),
    conflict_resolution: conflictRows.length
      ? `对标召回冲突处理：${conflictRows.join('；')}；按情绪模块/节奏参照执行，文风只管表达层。`
      : compactBriefText(source?.conflict_resolution || source?.conflictResolution),
  }
}

export function benchmarkRecallHasGap(gaps: any[], pattern: RegExp) {
  return asArray(gaps).some((gap: any) => pattern.test(assetText(gap)))
}

const OH_STORY_NO_BENCHMARK_INTENT_NOTE = '无对标参考：按本书设定、章节合同和默认 Gates 写作，不读不存在的文风样章，不把缺少对标当作阻塞或警告。'

export function benchmarkRecallIsNoBenchmark(gaps: any[]) {
  return benchmarkRecallHasGap(gaps, /no_benchmark|无对标参考|无对标项目|没有对标/i)
}

export function benchmarkRecallGapsFromContext(contextPackage: any = {}, options: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const preDraft = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const styleStrategies = [
    options.style_sample_strategy,
    target.style_sample_strategy,
    target.styleSampleStrategy,
    preDraft.style_sample_strategy,
    preDraft.styleSampleStrategy,
    contextPackage?.style_sample_strategy,
    contextPackage?.styleSampleStrategy,
  ].filter(Boolean)
  const benchmarkStrategies = [
    options.chapter_benchmark_strategy,
    target.chapter_benchmark_strategy,
    target.chapterBenchmarkStrategy,
    preDraft.chapter_benchmark_strategy,
    preDraft.chapterBenchmarkStrategy,
    contextPackage?.chapter_benchmark_strategy,
    contextPackage?.chapterBenchmarkStrategy,
  ].filter(Boolean)
  return benchmarkRecallGapStrings(
    contextPackage?.gaps,
    contextPackage?.benchmark_recall_gaps,
    contextPackage?.benchmarkRecallGaps,
    contextPackage?.benchmark_recall_brief?.gaps,
    contextPackage?.benchmarkRecallBrief?.gaps,
    target?.benchmark_recall_gaps,
    target?.benchmarkRecallGaps,
    target?.benchmark_recall_brief?.gaps,
    target?.benchmarkRecallBrief?.gaps,
    preDraft?.benchmark_recall_gaps,
    preDraft?.benchmarkRecallGaps,
    preDraft?.benchmark_recall_brief?.gaps,
    preDraft?.benchmarkRecallBrief?.gaps,
    ...styleStrategies.flatMap((styleStrategy: any) => [
      styleStrategy?.gaps,
      styleStrategy?.style_recall?.gaps,
      styleStrategy?.styleRecall?.gaps,
      styleStrategy?.benchmark_recall?.gaps,
      styleStrategy?.benchmarkRecall?.gaps,
    ]),
    ...benchmarkStrategies.flatMap((benchmarkStrategy: any) => [
      benchmarkStrategy?.gaps,
      benchmarkStrategy?.benchmark_recall?.gaps,
      benchmarkStrategy?.benchmarkRecall?.gaps,
    ]),
  )
}

export function benchmarkRecallExplicitBrief(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.benchmark_recall_brief
    || contextPackage?.chapter_target?.benchmarkRecallBrief
    || contextPackage?.benchmark_recall_brief
    || contextPackage?.benchmarkRecallBrief
    || contextPackage?.pre_draft_brief?.benchmark_recall_brief
    || contextPackage?.pre_draft_brief?.benchmarkRecallBrief
    || contextPackage?.preDraftBrief?.benchmark_recall_brief
    || contextPackage?.preDraftBrief?.benchmarkRecallBrief
}

const BENCHMARK_RECALL_SOURCE_PATH_FIELDS = [
  'source_paths',
  'style_profile_path',
  'module_source_path',
  'rhythm_source_path',
  'matched_chapter_path',
  'matched_chapter_source_path',
  'matched_chapter_summary_path',
  'matched_chapter_deep_dive_path',
  'matched_deep_dive_path',
  'fallback_deep_dive_path',
  'summary_source_path',
  'deep_dive_source_path',
  'anchor_excerpt_paths',
]

const BENCHMARK_RECALL_NAMED_SOURCE_PATH_FIELDS = [
  { key: 'style_profile_path', aliases: ['style_profile_path'] },
  { key: 'module_source_path', aliases: ['module_source_path'] },
  { key: 'rhythm_source_path', aliases: ['rhythm_source_path'] },
  { key: 'matched_chapter_summary_path', aliases: ['matched_chapter_summary_path', 'summary_source_path'] },
  { key: 'matched_chapter_deep_dive_path', aliases: ['matched_chapter_deep_dive_path', 'matched_deep_dive_path', 'deep_dive_source_path'] },
  { key: 'fallback_deep_dive_path', aliases: ['fallback_deep_dive_path'] },
]

const SECONDARY_BENCHMARK_BOUNDARY_RULES = [
  '副对标只用于结构/情绪/设定参考，不参与文风画像和原文锚点。',
  '副书不进文风、不进原文锚点；正文 prompt 不读取副书文风.md、副书原文或副书原句。',
  '主对标最多 1 本用于文风和原文锚点；副对标只能提供可抽象复用的结构、情绪、设定或角色关系参考。',
  '若副对标与主对标口吻冲突，主对标文风和当前作品契约优先，副对标只保留结构用途。',
  '副对标执行排序：同题材 > 弱相关 > 参考；同级再按引用强度 辅 > 参考，最后按对标书列表顺序或书名稳定排序。',
  '副书数量不限；超过阶段预算时裁剪召回条目，不删除书目记录。',
  '缺少对标书列表或有副书未登记时，保留 gaps.benchmark_registry_missing，提示补全清单。',
]

const OH_STORY_BENCHMARK_CANONICAL_SOURCE_RULES = [
  'selected_emotion_module 必须优先来自 对标/{书名}/剧情/情绪模块.md；它决定本章情绪目标，不由 文风.md 改写。',
  'rhythm_reference 必须优先来自 对标/{书名}/剧情/节奏.md；它决定蓄势、爆发、冷却和章尾承接，不由 文风.md 改写。',
  'style_profile_summary / 文风.md 只管表达层：句长、标点、留白、潜台词和叙述密度，不改变剧情情绪或节奏意图。',
  '发生冲突时以情绪模块/节奏为准；冲突必须保留在 gaps 或 benchmark_recall_checks 中，不能用“文风接近”掩盖。',
]

function benchmarkRecallFallbackReceiptRequirements(brief: any = {}) {
  const sourcePaths = asArray(brief?.source_paths || brief?.sourcePaths).map(assetText).filter(Boolean)
  const modulePath = compactBriefText(
    brief?.module_source_path
    || brief?.moduleSourcePath
    || sourcePaths.find(path => /情绪模块|emotion.*module/i.test(path)),
    '对标/{书名}/剧情/情绪模块.md',
  )
  const rhythmPath = compactBriefText(
    brief?.rhythm_source_path
    || brief?.rhythmSourcePath
    || sourcePaths.find(path => /节奏|rhythm/i.test(path)),
    '对标/{书名}/剧情/节奏.md',
  )
  const matchedPath = compactBriefText(
    brief?.matched_chapter_summary_path
    || brief?.matchedChapterSummaryPath
    || brief?.matched_chapter_deep_dive_path
    || brief?.matchedChapterDeepDivePath
    || brief?.fallback_deep_dive_path
    || brief?.fallbackDeepDivePath
    || sourcePaths.find(path => /章节|摘要|深度拆解|chapter|deep/i.test(path)),
    '对标/{书名}/章节/第K章_摘要.md 或 第1-3章_深度拆解.md',
  )
  const gaps = uniqueBriefStrings([
    ...benchmarkRecallGapStrings(brief?.gaps, brief?.recall_gaps, brief?.recallGaps),
  ], 8).join('；') || '无'
  return uniqueBriefStrings([
    ...asArray(brief?.fallback_receipt_requirements || brief?.fallbackReceiptRequirements).map(assetText).filter(Boolean),
    compactBriefText(brief?.selected_emotion_module || brief?.selectedEmotionModule)
      ? `module_usage_receipt：fallback_usage_receipts 必须在 benchmark_recall_checks 中证明情绪模块被使用；key=module_usage_receipt, source_type=emotion_module, source_path=${modulePath}, expected_application=把 selected_emotion_module 写成本章情绪目标和回报触发, delivered_evidence 必须引用 chapter_text 动作/对话/反应, gaps_preserved=${gaps}。`
      : '',
    compactBriefText(brief?.rhythm_reference || brief?.rhythmReference)
      ? `rhythm_usage_receipt：fallback_usage_receipts 必须在 benchmark_recall_checks 中证明节奏参照被使用；key=rhythm_usage_receipt, source_type=rhythm, source_path=${rhythmPath}, expected_application=把 rhythm_reference 写成蓄势/爆发/冷却/章尾承接, delivered_evidence 必须引用 chapter_text 节奏证据, gaps_preserved=${gaps}。`
      : '',
    asArray(brief?.matched_chapter_techniques || brief?.matchedChapterTechniques).length || compactBriefText(brief?.matched_chapter || brief?.matchedChapter)
      ? `matched_chapter_usage_receipt：fallback_usage_receipts 必须在 benchmark_recall_checks 中证明匹配章只被抽象学习；key=matched_chapter_usage_receipt, source_type=matched_chapter, source_path=${matchedPath}, expected_application=把 matched_chapter_techniques 改写为本书可见压迫/停顿/潜台词/反应/钩子, delivered_evidence 必须引用 chapter_text 且不得复述对标原句, gaps_preserved=${gaps}。`
      : '',
  ], 8)
}

function benchmarkRecallSourcePaths(...strategies: any[]) {
  return uniqueBriefStrings(strategies.flatMap(strategy => (
    BENCHMARK_RECALL_SOURCE_PATH_FIELDS.flatMap(field => [
      styleRecallValueText(strategy, field),
      ...styleRecallList(strategy, field),
    ])
  )), 12)
}

function benchmarkRecallNamedSourcePaths(...strategies: any[]) {
  return Object.fromEntries(
    BENCHMARK_RECALL_NAMED_SOURCE_PATH_FIELDS
      .map(({ key, aliases }) => {
        const value = compactBriefText(strategies.map(strategy => (
          aliases.map(alias => styleRecallValueText(strategy, alias)).find(Boolean)
        )).find(Boolean))
        return [key, value]
      })
      .filter(([, value]) => Boolean(value)),
  )
}

function benchmarkRecallAnchorExcerpts(...strategies: any[]) {
  return uniqueBriefStrings(strategies.flatMap(strategy => [
    ...styleRecallList(strategy, 'anchor_excerpts'),
    ...styleRecallList(strategy, 'anchor_excerpt'),
    ...styleRecallList(strategy, 'original_anchor_excerpts'),
    ...styleRecallList(strategy, 'source_anchor_excerpts'),
  ]), 3)
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

function secondaryBenchmarkRegistryMissing(...sources: any[]) {
  return sources.some(source => {
    if (!source || typeof source !== 'object') return false
    if (source.benchmark_registry_missing || source.benchmarkRegistryMissing || source.registry_missing || source.registryMissing) return true
    if (benchmarkRecallHasGap(benchmarkRecallGapStrings(source.gaps || source.recall_gaps || source.recallGaps), /benchmark_registry_missing|对标书列表.*缺|未登记/)) return true
    return secondaryBenchmarkRecallSources(source)
      .flatMap(item => asArray(item))
      .some((row: any) => row?.benchmark_registry_missing || row?.benchmarkRegistryMissing || row?.registry_order_missing || row?.registryOrderMissing)
  })
}

function normalizeSecondaryBenchmarkRecallSummary(...sources: any[]) {
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

export function buildBenchmarkRecallBrief(contextPackage: any = {}, options: any = {}) {
  const explicit = benchmarkRecallExplicitBrief(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const gaps = benchmarkRecallGapStrings(explicit.gaps || explicit.recall_gaps || explicit.recallGaps)
    const derived = buildBenchmarkRecallBrief({
      ...(contextPackage || {}),
      benchmark_recall_brief: null,
      benchmarkRecallBrief: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            benchmark_recall_brief: null,
            benchmarkRecallBrief: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            benchmark_recall_brief: null,
            benchmarkRecallBrief: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            benchmark_recall_brief: null,
            benchmarkRecallBrief: null,
          }
        : contextPackage?.chapter_target,
    }, options) || {}
    const authority = benchmarkRecallAuthorityFromGaps(explicit, gaps.length ? gaps : asArray(derived.gaps))
    const effectiveGaps = uniqueBriefStrings([
      ...(gaps.length ? gaps : asArray(derived.gaps)),
      secondaryBenchmarkRegistryMissing(explicit, derived) ? 'benchmark_registry_missing' : '',
    ], 12)
    if (benchmarkRecallIsNoBenchmark(effectiveGaps)) return null
    const toneMatchFailed = benchmarkRecallHasGap(effectiveGaps, /tone_match_failed|基调匹配失败|tone match failed/i)
    const profileDegenerate = benchmarkRecallHasGap(effectiveGaps, /profile_degenerate|文风不可用|文风画像退化|profile degenerate/i)
    const secondaryBenchmarkRecallSummary = normalizeSecondaryBenchmarkRecallSummary(explicit, derived)
    const anchorExcerpts = benchmarkRecallAnchorExcerpts(explicit, derived)
    const namedSourcePaths = benchmarkRecallNamedSourcePaths(explicit, derived)
    const secondaryBenchmarkBoundaryRules = secondaryBenchmarkRecallSummary.length
      ? uniqueBriefStrings([
          ...asArray(explicit.secondary_benchmark_boundary_rules || explicit.secondaryBenchmarkBoundaryRules),
          ...asArray(derived.secondary_benchmark_boundary_rules),
          ...SECONDARY_BENCHMARK_BOUNDARY_RULES,
        ], 8)
      : []
    return {
      version: explicit.version || 'oh_story_benchmark_recall_v1',
      source: explicit.source || 'oh_story_workflow_daily_step_2_3',
      selected_emotion_module: compactBriefText(explicit.selected_emotion_module || explicit.selectedEmotionModule) || derived.selected_emotion_module || '',
      rhythm_reference: compactBriefText(explicit.rhythm_reference || explicit.rhythmReference) || derived.rhythm_reference || '',
      style_profile_summary: profileDegenerate ? '' : compactBriefText(explicit.style_profile_summary || explicit.styleProfileSummary) || derived.style_profile_summary || '',
      matched_chapter: (toneMatchFailed || profileDegenerate) ? '' : compactBriefText(explicit.matched_chapter || explicit.matchedChapter || explicit.matched_chapter_K || explicit.matchedChapterK) || derived.matched_chapter || '',
      matched_chapter_techniques: (toneMatchFailed || profileDegenerate)
        ? []
        : asArray(explicit.matched_chapter_techniques || explicit.matchedChapterTechniques).length
        ? uniqueBriefStrings(asArray(explicit.matched_chapter_techniques || explicit.matchedChapterTechniques), 8)
        : asArray(derived.matched_chapter_techniques),
      style_directives: profileDegenerate
        ? []
        : asArray(explicit.style_directives || explicit.styleDirectives).length
        ? uniqueBriefStrings(asArray(explicit.style_directives || explicit.styleDirectives), 8)
        : asArray(derived.style_directives),
      ...namedSourcePaths,
      source_paths: uniqueBriefStrings([
        ...asArray(explicit.source_paths || explicit.sourcePaths),
        ...Object.values(namedSourcePaths),
        ...asArray(derived.source_paths),
      ], 12),
      anchor_excerpts: anchorExcerpts,
      canonical_source_rules: uniqueBriefStrings([
        ...asArray(explicit.canonical_source_rules || explicit.canonicalSourceRules),
        ...asArray(derived.canonical_source_rules),
        ...OH_STORY_BENCHMARK_CANONICAL_SOURCE_RULES,
      ], 8),
      fallback_receipt_requirements: benchmarkRecallFallbackReceiptRequirements({
        fallback_receipt_requirements: explicit.fallback_receipt_requirements || explicit.fallbackReceiptRequirements || derived.fallback_receipt_requirements,
        selected_emotion_module: compactBriefText(explicit.selected_emotion_module || explicit.selectedEmotionModule) || derived.selected_emotion_module || '',
        rhythm_reference: compactBriefText(explicit.rhythm_reference || explicit.rhythmReference) || derived.rhythm_reference || '',
        matched_chapter: (toneMatchFailed || profileDegenerate) ? '' : compactBriefText(explicit.matched_chapter || explicit.matchedChapter || explicit.matched_chapter_K || explicit.matchedChapterK) || derived.matched_chapter || '',
        matched_chapter_techniques: (toneMatchFailed || profileDegenerate)
          ? []
          : asArray(explicit.matched_chapter_techniques || explicit.matchedChapterTechniques).length
          ? uniqueBriefStrings(asArray(explicit.matched_chapter_techniques || explicit.matchedChapterTechniques), 8)
          : asArray(derived.matched_chapter_techniques),
        ...namedSourcePaths,
        source_paths: uniqueBriefStrings([
          ...asArray(explicit.source_paths || explicit.sourcePaths),
          ...Object.values(namedSourcePaths),
          ...asArray(derived.source_paths),
        ], 12),
        gaps: effectiveGaps,
      }),
      secondary_benchmark_recall_summary: secondaryBenchmarkRecallSummary,
      secondary_benchmark_boundary_rules: secondaryBenchmarkBoundaryRules,
      gaps: effectiveGaps,
      authority_rules: authority.authority_rules.length ? authority.authority_rules : asArray(derived.authority_rules),
      conflict_resolution: authority.conflict_resolution || derived.conflict_resolution || '',
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map(assetText).filter(Boolean)
        : [
            'selected_emotion_module 必须进入情绪目标。',
            'rhythm_reference 必须进入蓄势、爆发、冷却和章尾承接。',
            'matched_chapter_techniques 只能作为抽象技法，不得复制原文桥段或原句。',
            ...(secondaryBenchmarkRecallSummary.length ? ['副对标召回摘要只能作为结构/情绪/设定参考，必须检查 secondary_benchmark_boundary，禁止副书文风污染。'] : []),
            'gaps 必须在写前或自检中保留，不得假装缺口已经消失。',
          ],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const chapterBlueprint = options.chapter_blueprint || target.chapter_blueprint || contextPackage?.chapter_blueprint || {}
  const styleStrategy = options.style_sample_strategy || target.style_sample_strategy || contextPackage?.style_sample_strategy || {}
  const benchmarkStrategy = options.chapter_benchmark_strategy || target.chapter_benchmark_strategy || contextPackage?.chapter_benchmark_strategy || {}
  const benchmarkSamples = normalizeChapterBenchmarkSampleBank(benchmarkStrategy?.samples || benchmarkStrategy?.chapter_benchmark_sample_bank || [])
  const selectedEmotionModule = compactBriefText(
    styleRecallValueText(styleStrategy, 'selected_emotion_module')
    || styleRecallValueText(benchmarkStrategy, 'selected_emotion_module')
    || asArray(chapterBlueprint?.emotional_arc_contract?.scene_emotion_steps)[0]
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.emotion_modules)[0],
  )
  const rhythmReference = compactBriefText(
    styleRecallValueText(styleStrategy, 'rhythm_reference')
    || styleRecallValueText(benchmarkStrategy, 'rhythm_reference')
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.bridge_rhythm)[0]
    || asArray(chapterBlueprint?.plot_dynamics_contract?.climax_formula).join(' -> '),
  )
  const styleProfileSummary = compactBriefText(
    styleRecallValueText(styleStrategy, 'style_profile_summary')
    || styleRecallValueText(benchmarkStrategy, 'style_profile_summary')
    || benchmarkSamples.map((sample: any) => sample.abstract_usage).filter(Boolean).join('；')
    || asArray(styleStrategy?.samples).map((sample: any) => sample?.abstract_usage || sample?.narrative_rhythm).filter(Boolean).join('；'),
  )
  const matchedChapter = compactBriefText(
    styleRecallValueText(styleStrategy, 'matched_chapter_K')
    || styleRecallValueText(styleStrategy, 'matched_chapter')
    || styleRecallValueText(benchmarkStrategy, 'matched_chapter_K')
    || styleRecallValueText(benchmarkStrategy, 'matched_chapter')
    || benchmarkSamples.map((sample: any) => sample.sample_key).filter(Boolean).join('、'),
  )
  const matchedTechniques = uniqueBriefStrings([
    ...styleRecallList(styleStrategy, 'matched_chapter_techniques'),
    ...styleRecallList(benchmarkStrategy, 'matched_chapter_techniques'),
    ...benchmarkSamples.flatMap((sample: any) => [
      sample.opening_hook,
      sample.conflict_pattern,
      sample.payoff_pattern,
      sample.scene_budget_pattern,
    ]),
  ], 8)
  const styleDirectives = uniqueBriefStrings([
    ...styleRecallList(styleStrategy, 'style_directives'),
    ...styleRecallList(benchmarkStrategy, 'style_directives'),
    ...benchmarkSamples.flatMap((sample: any) => [
      sample.abstract_usage,
      sample.ending_hook_pattern,
      sample.dialogue_pattern,
      sample.visual_pattern,
    ]),
  ], 8)
  const namedSourcePaths = benchmarkRecallNamedSourcePaths(styleStrategy, benchmarkStrategy)
  const sourcePaths = uniqueBriefStrings([
    ...Object.values(namedSourcePaths),
    ...benchmarkRecallSourcePaths(styleStrategy, benchmarkStrategy),
  ], 12)
  const anchorExcerpts = benchmarkRecallAnchorExcerpts(styleStrategy, benchmarkStrategy)
  const secondaryBenchmarkRecallSummary = normalizeSecondaryBenchmarkRecallSummary(styleStrategy, benchmarkStrategy)
  const secondaryBenchmarkBoundaryRules = secondaryBenchmarkRecallSummary.length ? SECONDARY_BENCHMARK_BOUNDARY_RULES : []
  const gaps = benchmarkRecallGapStrings(
    styleStrategy?.gaps,
    styleStrategy?.style_recall?.gaps,
    styleStrategy?.styleRecall?.gaps,
    benchmarkStrategy?.gaps,
    benchmarkStrategy?.benchmark_recall?.gaps,
    benchmarkStrategy?.benchmarkRecall?.gaps,
  )
  const effectiveGaps = uniqueBriefStrings([
    ...gaps,
    secondaryBenchmarkRegistryMissing(styleStrategy, benchmarkStrategy) ? 'benchmark_registry_missing' : '',
  ], 12)
  if (benchmarkRecallIsNoBenchmark(effectiveGaps)) return null
  const toneMatchFailed = benchmarkRecallHasGap(effectiveGaps, /tone_match_failed|基调匹配失败|tone match failed/i)
  const profileDegenerate = benchmarkRecallHasGap(effectiveGaps, /profile_degenerate|文风不可用|文风画像退化|profile degenerate/i)
  const hasRecall = Boolean(selectedEmotionModule || rhythmReference || styleProfileSummary || matchedChapter || matchedTechniques.length || styleDirectives.length || sourcePaths.length || anchorExcerpts.length || effectiveGaps.length)
  if (!hasRecall) return null
  const authority = benchmarkRecallAuthorityFromGaps({
    selected_emotion_module: selectedEmotionModule,
    rhythm_reference: rhythmReference,
    style_profile_summary: styleProfileSummary,
  }, effectiveGaps)
  return {
    version: 'oh_story_benchmark_recall_v1',
    source: 'oh_story_workflow_daily_step_2_3',
    selected_emotion_module: selectedEmotionModule,
    rhythm_reference: rhythmReference,
    style_profile_summary: profileDegenerate ? '' : styleProfileSummary,
    matched_chapter: (toneMatchFailed || profileDegenerate) ? '' : matchedChapter,
    matched_chapter_techniques: (toneMatchFailed || profileDegenerate) ? [] : matchedTechniques,
    style_directives: profileDegenerate ? [] : styleDirectives,
    ...namedSourcePaths,
    source_paths: sourcePaths,
    anchor_excerpts: (toneMatchFailed || profileDegenerate) ? [] : anchorExcerpts,
    canonical_source_rules: OH_STORY_BENCHMARK_CANONICAL_SOURCE_RULES,
    fallback_receipt_requirements: benchmarkRecallFallbackReceiptRequirements({
      selected_emotion_module: selectedEmotionModule,
      rhythm_reference: rhythmReference,
      matched_chapter: (toneMatchFailed || profileDegenerate) ? '' : matchedChapter,
      matched_chapter_techniques: (toneMatchFailed || profileDegenerate) ? [] : matchedTechniques,
      ...namedSourcePaths,
      source_paths: sourcePaths,
      gaps: effectiveGaps,
    }),
    secondary_benchmark_recall_summary: secondaryBenchmarkRecallSummary,
    secondary_benchmark_boundary_rules: secondaryBenchmarkBoundaryRules,
    gaps: effectiveGaps,
    authority_rules: authority.authority_rules,
    conflict_resolution: authority.conflict_resolution,
    quality_checks: [
      'selected_emotion_module 必须进入情绪目标。',
      'rhythm_reference 必须进入蓄势、爆发、冷却和章尾承接。',
      'matched_chapter_techniques 只能作为抽象技法，不得复制原文桥段或原句。',
      ...(secondaryBenchmarkRecallSummary.length ? ['副对标召回摘要只能作为结构/情绪/设定参考，必须检查 secondary_benchmark_boundary，禁止副书文风污染。'] : []),
      'gaps 必须在写前或自检中保留，不得假装缺口已经消失。',
    ],
  }
}

export function buildIntentConfirmationContract(contextPackage: any = {}, options: any = {}) {
  const explicit = intentConfirmationExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildIntentConfirmationContract({
      ...(contextPackage || {}),
      intent_confirmation_contract: null,
      intentConfirmationContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.chapter_target,
    }, options)
    const noBenchmark = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, options))
    const rhythmAndStyle = asArray(explicit.rhythm_and_style || explicit.rhythmAndStyle).length
      ? asArray(explicit.rhythm_and_style || explicit.rhythmAndStyle).map(assetText).filter(Boolean)
      : asArray(derived.rhythm_and_style)
    return {
      version: explicit.version || 'oh_story_intent_confirmation_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      confirmed_intent: compactBriefText(explicit.confirmed_intent || explicit.confirmedIntent || explicit.intent) || derived.confirmed_intent,
      rhythm_and_style: noBenchmark ? uniqueBriefStrings([...rhythmAndStyle, OH_STORY_NO_BENCHMARK_INTENT_NOTE], 12) : rhythmAndStyle,
      structure_inputs: asArray(explicit.structure_inputs || explicit.structureInputs).length
        ? asArray(explicit.structure_inputs || explicit.structureInputs).map(assetText).filter(Boolean)
        : asArray(derived.structure_inputs),
      execution_focus: asArray(explicit.execution_focus || explicit.executionFocus).length
        ? asArray(explicit.execution_focus || explicit.executionFocus).map(assetText).filter(Boolean)
        : asArray(derived.execution_focus).length ? asArray(derived.execution_focus) : OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS,
      dialogue_tone_baseline: asArray(explicit.dialogue_tone_baseline || explicit.dialogueToneBaseline).length
        ? asArray(explicit.dialogue_tone_baseline || explicit.dialogueToneBaseline).map(assetText).filter(Boolean)
        : asArray(derived.dialogue_tone_baseline).length ? asArray(derived.dialogue_tone_baseline) : OH_STORY_INTENT_DIALOGUE_TONE_BASELINE,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map(assetText).filter(Boolean)
        : OH_STORY_INTENT_CONFIRMATION_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map(assetText).filter(Boolean)
        : asArray(derived.revision_priorities).length ? asArray(derived.revision_priorities) : ['重申本章意图', '校准情绪节奏', '补信息差反应', '补代价/收益', '接住章尾钩子'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const chapterBlueprint = options.chapter_blueprint || contextPackage?.chapter_target?.chapter_blueprint || contextPackage?.chapter_blueprint || {}
  const styleStrategy = options.style_sample_strategy || target.style_sample_strategy || contextPackage?.style_sample_strategy || {}
  const benchmarkStrategy = options.chapter_benchmark_strategy || target.chapter_benchmark_strategy || contextPackage?.chapter_benchmark_strategy || {}
  const stateTracking = options.state_tracking_contract || target.state_tracking_contract || contextPackage?.state_tracking_contract || {}
  const benchmarkGaps = benchmarkRecallGapsFromContext(contextPackage, options)
  const noBenchmark = benchmarkRecallIsNoBenchmark(benchmarkGaps)
  const toneMatchFailed = benchmarkRecallHasGap(benchmarkGaps, /tone_match_failed|基调匹配失败|tone match failed/i)
  const profileDegenerate = benchmarkRecallHasGap(benchmarkGaps, /profile_degenerate|文风不可用|文风画像退化|profile degenerate/i)
  const selectedEmotionModule = compactBriefText(
    styleRecallValueText(styleStrategy, 'selected_emotion_module')
    || styleRecallValueText(benchmarkStrategy, 'selected_emotion_module')
    || asArray(chapterBlueprint?.emotional_arc_contract?.scene_emotion_steps)[0]
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.emotion_modules)[0],
  )
  const rhythmReference = compactBriefText(
    styleRecallValueText(styleStrategy, 'rhythm_reference')
    || styleRecallValueText(benchmarkStrategy, 'rhythm_reference')
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.bridge_rhythm)[0]
    || asArray(chapterBlueprint?.plot_dynamics_contract?.climax_formula).join(' -> '),
  )
  const matchedTechniques = uniqueBriefStrings([
    ...styleRecallList(styleStrategy, 'matched_chapter_techniques'),
    ...styleRecallList(benchmarkStrategy, 'matched_chapter_techniques'),
    ...styleRecallList(styleStrategy, 'style_directives'),
    ...styleRecallList(benchmarkStrategy, 'style_directives'),
  ], 8)
  const usableMatchedTechniques = (toneMatchFailed || profileDegenerate) ? [] : matchedTechniques
  const targetEmotion = compactBriefText(
    chapterBlueprint?.target_emotion
    || options.emotional_curve
    || target.target_emotion
    || target.emotional_curve
    || sceneCards.map((scene: any) => scene.emotional_tone).filter(Boolean).join(' -> '),
  )
  const confirmedIntent = compactBriefText([
    targetEmotion ? `情绪：${targetEmotion}` : '',
    rhythmReference ? `节奏：${rhythmReference}` : '',
    selectedEmotionModule ? `模块：${selectedEmotionModule}` : '',
    usableMatchedTechniques.length ? `文风指令：${usableMatchedTechniques.join('、')}` : '',
    toneMatchFailed ? '基调匹配失败：只保留整书文风，不喂匹配章技法。' : '',
    profileDegenerate ? '文风不可用：跳过退化文风画像，只执行默认 Gates 和本章合同。' : '',
    target.summary || target.goal || chapterBlueprint?.writing_intent,
  ].filter(Boolean).join('；'))
  const structureInputs = uniqueBriefStrings([
    chapterBlueprint?.content_outline ? `内容概括：起因=${chapterBlueprint.content_outline.cause || ''}；发展=${chapterBlueprint.content_outline.development || ''}；转折=${chapterBlueprint.content_outline.turn || ''}；高潮=${chapterBlueprint.content_outline.climax || ''}；结尾=${chapterBlueprint.content_outline.ending || ''}` : '',
    chapterBlueprint?.plot_lines?.mainline || chapterBlueprint?.plot_lines?.logic_line ? `逻辑线：${chapterBlueprint?.plot_lines?.logic_line || chapterBlueprint?.plot_lines?.mainline}` : '',
    asArray(chapterBlueprint?.character_order).length ? `人物出场顺序：${asArray(chapterBlueprint.character_order).join(' -> ')}` : '',
    chapterBlueprint?.cost_and_reward ? `代价/收益：${chapterBlueprint.cost_and_reward}` : '',
    chapterBlueprint?.ending_contract?.next_chapter_pull ? `章尾承接：${chapterBlueprint.ending_contract.next_chapter_pull}` : '',
    asArray(stateTracking?.character_states).length ? `状态筛选：${asArray(stateTracking.character_states).slice(0, 3).join('；')}` : '',
  ], 12)
  const rhythmAndStyle = uniqueBriefStrings([
    noBenchmark ? OH_STORY_NO_BENCHMARK_INTENT_NOTE : '',
    toneMatchFailed ? 'tone_match_failed：仅用整书文风和本章合同，不带入匹配章技法、桥段、声线或节奏模板。' : '',
    profileDegenerate ? 'profile_degenerate：文风不可用，跳过文风画像和匹配章技法，只执行默认 Gates、情绪模块、节奏参照和本章合同。' : '',
    selectedEmotionModule ? `selected_emotion_module：${selectedEmotionModule}` : '',
    rhythmReference ? `rhythm_reference：${rhythmReference}` : '',
    usableMatchedTechniques.length ? `matched_chapter_techniques：${usableMatchedTechniques.join('、')}` : '',
    usableMatchedTechniques.length ? '文风召回边界：只学结构节奏、情绪模块和叙述技法，不得复制对标章节桥段、设定、角色名或原句。' : '',
    targetEmotion ? `目标情绪：${targetEmotion}` : '',
  ], 10)
  const executionFocus = uniqueBriefStrings([
    chapterBlueprint?.content_outline ? `内容概括执行：起因=${chapterBlueprint.content_outline.cause || ''}；发展=${chapterBlueprint.content_outline.development || ''}；转折=${chapterBlueprint.content_outline.turn || ''}；高潮=${chapterBlueprint.content_outline.climax || ''}；结尾=${chapterBlueprint.content_outline.ending || ''}` : '',
    chapterBlueprint?.plot_lines?.mainline || chapterBlueprint?.plot_lines?.logic_line ? `逻辑线执行：${chapterBlueprint?.plot_lines?.logic_line || chapterBlueprint?.plot_lines?.mainline}` : '',
    asArray(chapterBlueprint?.character_order).length ? `出场顺序执行：${asArray(chapterBlueprint.character_order).join(' -> ')}` : '',
    chapterBlueprint?.cost_and_reward ? `代价/收益执行：${chapterBlueprint.cost_and_reward}` : '',
    chapterBlueprint?.ending_contract?.next_chapter_pull ? `章尾承接执行：${chapterBlueprint.ending_contract.next_chapter_pull}` : '',
    ...OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS,
  ], 18)

  return {
    version: 'oh_story_intent_confirmation_v1',
    source: 'oh_story_embedded_fallback',
    confirmed_intent: confirmedIntent || compactBriefText(chapterBlueprint?.writing_intent || target.summary || target.goal),
    rhythm_and_style: rhythmAndStyle,
    structure_inputs: structureInputs,
    execution_focus: executionFocus,
    dialogue_tone_baseline: OH_STORY_INTENT_DIALOGUE_TONE_BASELINE,
    quality_checks: OH_STORY_INTENT_CONFIRMATION_CHECKS,
    revision_priorities: ['重申本章意图', '校准情绪节奏', '补信息差反应', '补代价/收益', '接住章尾钩子'],
  }
}

export function continuityHeatExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.continuity_heat_contract
    || contextPackage?.chapter_target?.continuityHeatContract
    || contextPackage?.continuity_heat_contract
    || contextPackage?.continuityHeatContract
    || contextPackage?.pre_draft_brief?.continuity_heat_contract
    || contextPackage?.preDraftBrief?.continuityHeatContract
}

export function intentDialogueToneBaselineFromContext(contextPackage: any = {}) {
  const contract = contextPackage?.chapter_target?.intent_confirmation_contract
    || contextPackage?.chapter_target?.intentConfirmationContract
    || contextPackage?.intent_confirmation_contract
    || contextPackage?.intentConfirmationContract
    || contextPackage?.pre_draft_brief?.intent_confirmation_contract
    || contextPackage?.preDraftBrief?.intentConfirmationContract
  return uniqueBriefStrings(
    asArray(contract?.dialogue_tone_baseline || contract?.dialogueToneBaseline)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean),
    8,
  )
}

export function applyIntentDialogueBaselineToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  const baseline = intentDialogueToneBaselineFromContext(contextPackage)
  if (!sceneCards.length || !baseline.length) return sceneCards
  return sceneCards.map(card => ({
    ...card,
    dialogue_goals: mergeSceneCardStringList(card.dialogue_goals, baseline, 24),
    serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['意图确认']),
  }))
}
