import { asArray } from '../../routes/novel-route-utils'
import { buildMemePolishPrompt as buildMemePolishPromptWithStrategy } from '../../novel-writing/prose-prompt-builders'
import {
  buildStyleSampleSelectionSignals,
  latestStyleSelectionReviewPayload,
  normalizeChapterBenchmarkSampleBank,
  normalizeMemeBank,
  normalizeStyleSampleBank,
  resolveChapterBenchmarkSampleBank,
  resolveMemeBank,
  resolveStyleSampleBank,
  styleSampleEffectivenessAdjustment,
  styleSampleEffectivenessForSample,
  styleSampleEffectivenessReason,
  styleSampleEffectivenessShouldAvoid,
  styleSelectionChapterQualityScore,
  styleSelectionChapterStrategy,
  styleSelectionItemSampleKey,
  styleSelectionRoundAverage,
} from '../post-delivery/asset-banks'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export function buildStyleSampleEffectivenessForSelection(styleSampleBank: any[] = [], chapters: any[] = [], reviews: any[] = []) {
  const rows = new Map<string, any>()
  const ensureRow = (sample: any) => {
    const key = String(sample?.sample_key || '').trim()
    if (!key) return null
    if (!rows.has(key)) {
      rows.set(key, {
        sample_key: key,
        usage_count: 0,
        style_scores: [],
        quality_scores: [],
        planned_count: 0,
        delivered_count: 0,
        missed_count: 0,
        copy_risk_count: 0,
      })
    }
    return rows.get(key)
  }

  normalizeStyleSampleBank(styleSampleBank).forEach(ensureRow)

  for (const chapter of asArray(chapters)) {
    const strategy = styleSelectionChapterStrategy(chapter)
    const samples = normalizeStyleSampleBank(strategy?.samples || strategy?.style_sample_bank || [])
    if (!samples.length) continue
    const syncPayload = latestStyleSelectionReviewPayload(reviews, chapter, 'style_sample_sync', 'style_sample_sync')
    const sync = syncPayload?.style_sample_sync || syncPayload || {}
    const styleScore = Number(sync?.score || 0)
    const qualityScore = styleSelectionChapterQualityScore(chapter, reviews)
    const copyRiskItems = asArray(sync?.copied_phrases || sync?.copiedPhrases)
    const planned = asArray(sync?.planned)
    const delivered = asArray(sync?.delivered)
    const missed = asArray(sync?.missed)

    for (const sample of samples) {
      const row = ensureRow(sample)
      if (!row) continue
      const key = row.sample_key
      const plannedForSample = planned.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const deliveredForSample = delivered.filter((item: any) => styleSelectionItemSampleKey(item) === key).length
      const missedForSample = missed.filter((item: any) => styleSelectionItemSampleKey(item) === key).length

      row.usage_count += 1
      if (styleScore > 0) row.style_scores.push(styleScore)
      if (qualityScore > 0) row.quality_scores.push(qualityScore)
      row.planned_count += plannedForSample
      row.delivered_count += deliveredForSample
      row.missed_count += missedForSample
      row.copy_risk_count += missedForSample > 0 ? copyRiskItems.length : 0
    }
  }

  const samples = Array.from(rows.values()).map(row => {
    const hitRate = row.planned_count > 0 ? Math.round((row.delivered_count / row.planned_count) * 100) : 0
    const riskLabel = row.usage_count === 0
      ? '待验证'
      : row.copy_risk_count > 0 || row.missed_count > 0 || (row.planned_count > 0 && hitRate < 80)
        ? '需复盘'
        : '表现稳定'
    return {
      sample_key: row.sample_key,
      usage_count: row.usage_count,
      hit_rate: hitRate,
      missed_count: row.missed_count,
      copy_risk_count: row.copy_risk_count,
      average_style_score: styleSelectionRoundAverage(row.style_scores),
      average_quality_score: styleSelectionRoundAverage(row.quality_scores),
      risk_label: riskLabel,
    }
  })

  return {
    total_samples: samples.length,
    used_sample_count: samples.filter((item: any) => item.usage_count > 0).length,
    risky_sample_count: samples.filter((item: any) => item.risk_label === '需复盘').length,
    samples,
  }
}

export function styleSampleSceneScore(sample: any, contextPackage: any = {}, index = 0) {
  const { text, signals } = buildStyleSampleSelectionSignals(contextPackage)
  const effectiveness = styleSampleEffectivenessForSample(sample, contextPackage)
  const applicableScenes = asArray(sample?.applicable_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const avoidScenes = asArray(sample?.avoid_scenes || sample?.forbidden_scenes)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  let score = 0
  const matchedApplicable: string[] = []
  const matchedSignals: string[] = []
  for (const scene of applicableScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) {
      score += 12
      matchedApplicable.push(scene)
    }
  }
  for (const scene of avoidScenes) {
    if (signals.has(scene) || (scene.length >= 2 && text.includes(scene))) score -= 20
  }
  const sampleText = [
    sample?.sample_key,
    sample?.scene_function,
    sample?.narrative_rhythm,
    sample?.abstract_usage,
  ].map(item => String(item || '')).join(' ')
  if (/规则|危机|压迫|反打|反制|强敌|战斗|冲突|围堵|压制|破局/.test(text) && /规则|危机|压迫|反打|反制|战斗/.test(sampleText)) score += 10
  if (/对白|交锋|试探|信息差|质问|谈判|阻止|争执|斗嘴/.test(text) && /对白|交锋|试探|信息差|关系/.test(sampleText)) score += 6
  if (String(contextPackage?.chapter_target?.ending_hook || contextPackage?.chapter_target?.endingHook || '').trim() && /章末|追读|钩子|新问题|危险/.test(sampleText)) score += 4
  for (const signal of signals) {
    if (signal.length >= 2 && sampleText.includes(signal)) {
      score += 4
      matchedSignals.push(signal)
    }
  }
  score += styleSampleEffectivenessAdjustment(effectiveness)
  if (!applicableScenes.length) score += 1
  const hitScenes = Array.from(new Set([...matchedApplicable, ...matchedSignals])).slice(0, 3)
  const effectivenessReason = styleSampleEffectivenessReason(effectiveness)
  const reasonParts = [
    hitScenes.length > 0 ? `命中${hitScenes.join('、')}` : '',
    avoidScenes.length > 0 ? `避开${avoidScenes.slice(0, 3).join('、')}` : '',
    effectivenessReason,
  ].filter(Boolean)
  const selectionReason = reasonParts.length > 0 ? `${reasonParts.join('；')}。` : '保留为通用风格策略。'
  return { sample, score, index, selectionReason, effectiveness, avoidByEffectiveness: styleSampleEffectivenessShouldAvoid(effectiveness) }
}

export function selectStyleSamplesForChapter(samples: any[] = [], contextPackage: any = {}, options: any = {}) {
  const excludeKeys = new Set(asArray(options?.exclude_keys || options?.excludeKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean))
  const ranked = samples
    .filter(sample => !excludeKeys.has(String(sample?.sample_key || '').trim()))
    .map((sample, index) => styleSampleSceneScore(sample, contextPackage, index))
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const positive = ranked.filter(item => item.score > 0)
  const preferred = positive.filter(item => !item.avoidByEffectiveness)
  const fallback = ranked.filter(item => item.score >= 0)
  const selected = preferred.length ? preferred.slice(0, 3) : (positive.length ? positive.slice(0, 3) : fallback.slice(0, 3))
  return selected.map(item => ({
    ...item.sample,
    selection_reason: item.selectionReason,
  }))
}

export function styleSampleStrategyCopyGuards(strategy: any = {}, samples: any[] = []) {
  return Array.from(new Set([
    ...asArray(strategy?.do_not_copy || strategy?.copy_guard || strategy?.forbidden_copy),
    ...samples.flatMap((sample: any) => asArray(sample?.unsafe_direct_phrases)),
    '只学习叙述节奏、句式密度、对白比例和情绪转折',
    '原句不能照搬',
    '不得复制样章桥段、专有设定、角色名和核心梗',
  ].map((item: any) => String(item || '').trim()).filter(Boolean)))
}

export function applyStyleSampleStrategyAuthorAction(project: any, contextPackage: any = {}, currentStrategy: any = {}, request: any = {}) {
  const action = String(request?.action || 'lock').trim() || 'lock'
  const now = String(request?.now || new Date().toISOString())
  const currentSamples = normalizeStyleSampleBank(currentStrategy?.samples || currentStrategy?.style_sample_bank || [])
  const currentKeys = currentSamples.map((sample: any) => String(sample?.sample_key || '').trim()).filter(Boolean)
  const currentRound = Number(currentStrategy?.selection_round || currentStrategy?.selectionRound || 0) || 0

  if (action === 'disable' || action === 'clear') {
    return {
      ...(currentStrategy || {}),
      enabled: false,
      samples: [],
      apply_to: [],
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, []),
      locked: true,
      selection_mode: 'disabled_by_author',
      author_locked_at: now,
      selection_note: '作者确认本章不用风格样章，正文只执行任务书、场景卡和写作圣经。',
    }
  }

  if (action === 'lock') {
    return {
      ...(currentStrategy || {}),
      enabled: currentSamples.length > 0,
      samples: currentSamples,
      do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, currentSamples),
      locked: true,
      selection_mode: 'author_locked',
      author_locked_at: now,
      selection_note: '作者已确认本章使用这组风格样章策略。',
    }
  }

  const requestedKeys = asArray(request?.sample_keys || request?.sampleKeys)
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  const bank = resolveStyleSampleBank(project, contextPackage)
  const bankByKey = new Map(bank.map((sample: any) => [String(sample?.sample_key || '').trim(), sample]))
  const selected = requestedKeys.length > 0
    ? requestedKeys.map((key: string) => bankByKey.get(key)).filter(Boolean)
    : selectStyleSamplesForChapter(bank, contextPackage, { excludeKeys: currentKeys })
  const nextSamples = selected.length > 0 ? selected : currentSamples

  return {
    ...(currentStrategy || {}),
    enabled: nextSamples.length > 0,
    samples: nextSamples,
    apply_to: nextSamples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: styleSampleStrategyCopyGuards(currentStrategy, nextSamples),
    locked: false,
    selection_mode: 'author_replaced',
    selection_round: currentRound + 1,
    author_updated_at: now,
    selection_note: selected.length > 0
      ? '作者已替换本章风格样章策略，生成前需要重新确认任务书。'
      : '暂无可替换的风格样章，暂时保留当前策略。',
  }
}

export function buildMemeStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.meme_strategy || contextPackage?.pre_draft_brief?.meme_strategy || null
  if (explicit && typeof explicit === 'object') {
    return {
      intensity: String(explicit.intensity || '轻度'),
      allowed_functions: asArray(explicit.allowed_functions || explicit.functions).map((item: any) => String(item || '').trim()).filter(Boolean),
      forbidden_usage: asArray(explicit.forbidden_usage || explicit.forbidden).map((item: any) => String(item || '').trim()).filter(Boolean),
      meme_bank: normalizeMemeBank(explicit.meme_bank || []),
    }
  }
  const memeBank = resolveMemeBank(project, contextPackage)
  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const allowedFromBank = memeBank
    .filter((item: any) => !item.suitable_genres.length || !genre || item.suitable_genres.includes(genre))
    .map((item: any) => item.function)
    .filter(Boolean)
  return {
    intensity: memeBank.length > 0 ? '轻度' : '无',
    allowed_functions: Array.from(new Set(allowedFromBank.length ? allowedFromBank : ['主角吐槽', '反差打脸', '评论区爽点', '社畜共鸣', '规则怪谈弹幕感'])).slice(0, 6),
    forbidden_usage: [
      '严肃死亡场景不玩梗',
      '关键情绪爆点不插科打诨',
      '不直接复刻热梗原句',
      '不让网感表达改变剧情线、设定状态和人物状态',
    ],
    meme_bank: memeBank.slice(0, 12),
  }
}

export function buildStyleSampleStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.style_sample_strategy
    || contextPackage?.chapter_target?.styleSampleStrategy
    || contextPackage?.style_sample_strategy
    || contextPackage?.styleSampleStrategy
    || contextPackage?.pre_draft_brief?.style_sample_strategy
    || contextPackage?.pre_draft_brief?.styleSampleStrategy
    || contextPackage?.preDraftBrief?.style_sample_strategy
    || contextPackage?.preDraftBrief?.styleSampleStrategy
    || null
  if (explicit && typeof explicit === 'object') {
    const explicitSamples = normalizeStyleSampleBank(explicit.samples || explicit.style_sample_bank || explicit.styleSampleBank || [])
    const shouldHydrateSamples = explicitSamples.length === 0 && explicit.enabled !== false && explicit.selection_mode !== 'disabled_by_author'
    const samples = shouldHydrateSamples
      ? selectStyleSamplesForChapter(resolveStyleSampleBank(project, {
          ...(contextPackage || {}),
          pre_draft_brief: contextPackage?.pre_draft_brief
            ? { ...(contextPackage.pre_draft_brief || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.pre_draft_brief,
          preDraftBrief: contextPackage?.preDraftBrief
            ? { ...(contextPackage.preDraftBrief || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.preDraftBrief,
          chapter_target: contextPackage?.chapter_target
            ? { ...(contextPackage.chapter_target || {}), style_sample_strategy: null, styleSampleStrategy: null }
            : contextPackage?.chapter_target,
        }), contextPackage)
      : explicitSamples
    return {
      enabled: Boolean(explicit.enabled ?? samples.length > 0) && samples.length > 0,
      samples,
      apply_to: asArray(explicit.apply_to || explicit.applyTo).length
        ? asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean)
        : samples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.doNotCopy || explicit.copy_guard || explicit.copyGuard || explicit.forbidden_copy || explicit.forbiddenCopy),
        ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
        '只学习叙述节奏、句式密度、对白比例和情绪转折',
        '原句不能照搬',
        '不得复制样章桥段、专有设定、角色名和核心梗',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const samples = selectStyleSamplesForChapter(resolveStyleSampleBank(project, contextPackage), contextPackage)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇钩子', '高压冲突', '对白推进', '章末钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.unsafe_direct_phrases)),
      '只学习叙述节奏、句式密度、对白比例和情绪转折',
      '原句不能照搬',
      '不得复制样章桥段、专有设定、角色名和核心梗',
    ].filter(Boolean))),
  }
}

const OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES = [
  '文风可覆盖默认 Gate D 短句拆分习惯：当样章有更具体的句长、段落和停顿节奏时，按样章抽象节奏执行。',
  '文风可覆盖默认 Gate B 句式去套路习惯：当样章提供更具体的句式密度、对白比例或节奏模式时，按本章场景功能取用。',
  '文风可覆盖默认标点习惯：只在服务人物声线、停顿节奏和情绪转折时保留更具体的标点节奏。',
  '覆盖只发生在表达层：叙述节奏、句式密度、对白比例、情绪转折和停顿，不得覆盖剧情事实、设定状态、人物状态和质量门禁。',
]

const OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS = [
  '禁用词 / banned_words 永远优先；样章出现过也不能复制或合理化。',
  'Gate F 章末禁升华永远优先；不得为了模仿文风写章末总结体、作者升华或空泛余韵。',
  '禁止万能比喻、命运感套话、作者预告和解释腔；文风示范不能覆盖去 AI 味硬门禁。',
  '禁止章末预告式写法：不得用“更大的风暴即将来临”等作者预告代替现场钩子。',
  '字数下限和场景功能优先；不能为了模仿短句或冷文风把计划情节点、动作过程、对话交锋和章尾钩子写丢。',
  '不得改变剧情线、设定状态、人物状态、伏笔状态、资产归属、关系边界和时间线。',
]

const OH_STORY_STYLE_BOUNDARY_COPY_RULES = [
  '只学习抽象技法：叙述节奏、句式密度、对白比例、情绪转折、停顿位置和信息释放顺序。',
  '不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
  'unsafe_direct_phrases、do_not_copy 和 forbidden_copy 中的内容必须进入禁用边界。',
  'matched_chapter_techniques 只能转化为本章动作、对话、信息差和章末钩子的执行方式。',
]

const OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES = [
  '样章风格与质量门禁冲突时，质量门禁赢；硬约束永远赢。',
  'profile_degenerate、tone_match_failed 或文风不可用时，跳过文风，只执行默认 Gates 和本章合同。',
  'gaps 必须如实保留：不能在正文、自检或修订报告中假装缺失的模块/节奏/深拆已经存在。',
  '为了模仿文风引入禁用词、章末升华、万能比喻、空钩子或复制桥段时，必须按风格越界修复。',
]

const OH_STORY_STYLE_BOUNDARY_CHECKS = [
  '硬约束永远赢：禁用词、Gate F、万能比喻、章末预告、字数下限和剧情事实不能被文风覆盖。',
  '文风只覆盖表达层：句长、段落、停顿、对白比例和情绪转折可以调整，但不得改剧情和状态。',
  '样章不复制：不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻。',
  '文风可用性清楚：profile_degenerate、tone_match_failed、module/rhythm gaps 必须保留并按降级规则处理。',
  '质量门禁不退让：为了模仿文风导致开篇钩子、爽点、章尾钩子、状态写回或字数下限变弱时必须修复。',
]

export function styleBoundaryExplicitContract(contextPackage: any = {}, chapter: any = {}) {
  return contextPackage?.chapter_target?.style_boundary_contract
    || contextPackage?.chapter_target?.styleBoundaryContract
    || contextPackage?.chapterTarget?.style_boundary_contract
    || contextPackage?.chapterTarget?.styleBoundaryContract
    || contextPackage?.chapter_target?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.chapter_target?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.chapter_target?.preDraftBrief?.style_boundary_contract
    || contextPackage?.chapter_target?.preDraftBrief?.styleBoundaryContract
    || contextPackage?.chapterTarget?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.chapterTarget?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.chapterTarget?.preDraftBrief?.style_boundary_contract
    || contextPackage?.chapterTarget?.preDraftBrief?.styleBoundaryContract
    || contextPackage?.style_boundary_contract
    || contextPackage?.styleBoundaryContract
    || contextPackage?.pre_draft_brief?.style_boundary_contract
    || contextPackage?.pre_draft_brief?.styleBoundaryContract
    || contextPackage?.preDraftBrief?.style_boundary_contract
    || contextPackage?.preDraftBrief?.styleBoundaryContract
    || chapter?.raw_payload?.pre_draft_brief?.style_boundary_contract
    || chapter?.raw_payload?.pre_draft_brief?.styleBoundaryContract
    || chapter?.raw_payload?.preDraftBrief?.style_boundary_contract
    || chapter?.raw_payload?.preDraftBrief?.styleBoundaryContract
}

export function styleBoundaryHasStyleInput(styleStrategy: any, benchmarkStrategy: any, benchmarkRecall: any) {
  return Boolean(
    styleStrategy?.enabled
    || asArray(styleStrategy?.samples).length
    || compactBriefText(styleStrategy?.selected_emotion_module || styleStrategy?.selectedEmotionModule)
    || compactBriefText(styleStrategy?.rhythm_reference || styleStrategy?.rhythmReference)
    || asArray(styleStrategy?.matched_chapter_techniques || styleStrategy?.matchedChapterTechniques).length
    || benchmarkStrategy?.enabled
    || asArray(benchmarkStrategy?.samples).length
    || benchmarkRecall,
  )
}

export function styleBoundaryCopyRules(styleStrategy: any, benchmarkStrategy: any) {
  return uniqueBriefStrings([
    ...OH_STORY_STYLE_BOUNDARY_COPY_RULES,
    ...asArray(styleStrategy?.do_not_copy || styleStrategy?.doNotCopy),
    ...asArray(benchmarkStrategy?.do_not_copy || benchmarkStrategy?.doNotCopy),
    ...asArray(styleStrategy?.samples).flatMap((sample: any) => asArray(sample?.unsafe_direct_phrases || sample?.unsafeDirectPhrases || sample?.forbidden_copy || sample?.forbiddenCopy)),
    ...asArray(benchmarkStrategy?.samples).flatMap((sample: any) => asArray(sample?.do_not_copy || sample?.doNotCopy)),
  ], 18)
}

export function stripStyleBoundaryExplicitContract(contextPackage: any = {}) {
  const stripBrief = (brief: any) => (
    brief && typeof brief === 'object' && !Array.isArray(brief)
      ? {
          ...brief,
          style_boundary_contract: null,
          styleBoundaryContract: null,
        }
      : brief
  )
  const stripTarget = (target: any) => (
    target && typeof target === 'object' && !Array.isArray(target)
      ? {
          ...target,
          style_boundary_contract: null,
          styleBoundaryContract: null,
          pre_draft_brief: stripBrief(target.pre_draft_brief),
          preDraftBrief: stripBrief(target.preDraftBrief),
        }
      : target
  )
  return {
    ...(contextPackage || {}),
    style_boundary_contract: null,
    styleBoundaryContract: null,
    pre_draft_brief: stripBrief(contextPackage?.pre_draft_brief),
    preDraftBrief: stripBrief(contextPackage?.preDraftBrief),
    chapter_target: stripTarget(contextPackage?.chapter_target),
    chapterTarget: stripTarget(contextPackage?.chapterTarget),
  }
}

export function buildStyleBoundaryContract(project: any = {}, contextPackage: any = {}, options: any = {}) {
  const explicit = options.ignoreExplicit === true ? null : styleBoundaryExplicitContract(contextPackage)
  const contextWithoutExplicit = stripStyleBoundaryExplicitContract(contextPackage)
  const styleStrategy = options.style_sample_strategy
    || contextPackage?.chapter_target?.style_sample_strategy
    || contextPackage?.style_sample_strategy
    || contextPackage?.pre_draft_brief?.style_sample_strategy
    || buildStyleSampleStrategy(project, contextWithoutExplicit)
  const benchmarkStrategy = options.chapter_benchmark_strategy
    || contextPackage?.chapter_target?.chapter_benchmark_strategy
    || contextPackage?.chapter_benchmark_strategy
    || contextPackage?.pre_draft_brief?.chapter_benchmark_strategy
    || {}
  const benchmarkRecall = options.benchmark_recall_brief
    || contextPackage?.chapter_target?.benchmark_recall_brief
    || contextPackage?.benchmark_recall_brief
    || contextPackage?.pre_draft_brief?.benchmark_recall_brief
    || null
  const hasStyleInput = styleBoundaryHasStyleInput(styleStrategy, benchmarkStrategy, benchmarkRecall)
  if (!explicit && !hasStyleInput) return null

  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = hasStyleInput ? buildStyleBoundaryContract(project, contextWithoutExplicit, {
      ...options,
      ignoreExplicit: true,
      style_sample_strategy: styleStrategy,
      chapter_benchmark_strategy: benchmarkStrategy,
      benchmark_recall_brief: benchmarkRecall,
    }) || {} : {}
    const list = (snake: string, camel: string, fallback: any[]) => {
      const explicitList = asArray(explicit?.[snake] || explicit?.[camel]).map((item: any) => compactBriefText(item)).filter(Boolean)
      return explicitList.length ? explicitList : (asArray(derived?.[snake]).length ? asArray(derived?.[snake]) : fallback)
    }
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_style_boundary_v1',
      source: explicit.source || 'oh_story_style_profile_protocol',
      activation_reason: compactBriefText(explicit.activation_reason || explicit.activationReason, derived.activation_reason || '存在样章策略或对标召回，必须声明文风覆盖边界。'),
      style_override_rules: list('style_override_rules', 'styleOverrideRules', OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES),
      hard_constraints: list('hard_constraints', 'hardConstraints', OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS),
      copy_boundary_rules: list('copy_boundary_rules', 'copyBoundaryRules', styleBoundaryCopyRules(styleStrategy, benchmarkStrategy)),
      conflict_resolution_rules: list('conflict_resolution_rules', 'conflictResolutionRules', OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_STYLE_BOUNDARY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['删风格越界禁用词', '修 Gate F 章末总结体', '删万能比喻和作者预告', '恢复字数/场景功能', '移除样章复制痕迹']),
    }
  }

  return {
    version: 'oh_story_style_boundary_v1',
    source: 'oh_story_style_profile_protocol',
    activation_reason: '存在样章策略或对标召回，必须声明文风覆盖边界。',
    style_override_rules: OH_STORY_STYLE_BOUNDARY_OVERRIDE_RULES,
    hard_constraints: OH_STORY_STYLE_BOUNDARY_HARD_CONSTRAINTS,
    copy_boundary_rules: styleBoundaryCopyRules(styleStrategy, benchmarkStrategy),
    conflict_resolution_rules: OH_STORY_STYLE_BOUNDARY_CONFLICT_RULES,
    quality_checks: OH_STORY_STYLE_BOUNDARY_CHECKS,
    revision_priorities: ['删风格越界禁用词', '修 Gate F 章末总结体', '删万能比喻和作者预告', '恢复字数/场景功能', '移除样章复制痕迹'],
  }
}

export function buildChapterBenchmarkStrategy(project: any, contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.chapter_benchmark_strategy
    || contextPackage?.chapter_target?.chapterBenchmarkStrategy
    || contextPackage?.chapter_benchmark_strategy
    || contextPackage?.chapterBenchmarkStrategy
    || contextPackage?.pre_draft_brief?.chapter_benchmark_strategy
    || contextPackage?.pre_draft_brief?.chapterBenchmarkStrategy
    || contextPackage?.preDraftBrief?.chapter_benchmark_strategy
    || contextPackage?.preDraftBrief?.chapterBenchmarkStrategy
    || null
  if (explicit && typeof explicit === 'object') {
    const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
    const explicitSamples = normalizeChapterBenchmarkSampleBank(explicit.samples || explicit.chapter_benchmark_sample_bank || explicit.chapterBenchmarkSampleBank || [])
    const shouldHydrateSamples = explicitSamples.length === 0 && explicit.enabled !== false && explicit.selection_mode !== 'disabled_by_author'
    const samples = shouldHydrateSamples
      ? resolveChapterBenchmarkSampleBank(project, contextPackage)
          .filter((sample: any) => !sample.genre || !genre || sample.genre === genre)
          .slice(0, 6)
      : explicitSamples
    const explicitApplyTo = asArray(explicit.apply_to || explicit.applyTo).map((item: any) => String(item || '').trim()).filter(Boolean)
    return {
      ...(explicit || {}),
      enabled: Boolean(explicit.enabled ?? samples.length > 0) && samples.length > 0,
      samples,
      apply_to: explicitApplyTo.length
        ? explicitApplyTo
        : samples.length > 0 ? ['开篇300字', '场景目标/阻碍/转折/回报', '爽点兑现', '章末追读钩子'] : [],
      do_not_copy: Array.from(new Set([
        ...asArray(explicit.do_not_copy || explicit.doNotCopy || explicit.copy_guard || explicit.copyGuard || explicit.forbidden_copy || explicit.forbiddenCopy),
        ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
        '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
        '不得复制样例桥段、角色名、专有设定和原句',
        '不得把样例剧情替换成本章剧情',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
    }
  }

  const genre = String(project?.genre || contextPackage?.project?.genre || '').trim()
  const samples = resolveChapterBenchmarkSampleBank(project, contextPackage)
    .filter((sample: any) => !sample.genre || !genre || sample.genre === genre)
    .slice(0, 6)
  return {
    enabled: samples.length > 0,
    samples,
    apply_to: samples.length > 0 ? ['开篇300字', '场景目标/阻碍/转折/回报', '爽点兑现', '章末追读钩子'] : [],
    do_not_copy: Array.from(new Set([
      ...samples.flatMap((sample: any) => asArray(sample.do_not_copy)),
      '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子',
      '不得复制样例桥段、角色名、专有设定和原句',
      '不得把样例剧情替换成本章剧情',
    ].filter(Boolean))),
  }
}

export function buildMemePolishPrompt(project: any, contextPackage: any, chapterText: string) {
  const memeStrategy = contextPackage?.chapter_target?.meme_strategy
    || contextPackage?.chapter_target?.memeStrategy
    || contextPackage?.chapterTarget?.meme_strategy
    || contextPackage?.chapterTarget?.memeStrategy
    || buildMemeStrategy(project, contextPackage)
  return buildMemePolishPromptWithStrategy(project, contextPackage, chapterText, { memeStrategy })
}

