import {
  asArray,
  parseJsonLikePayload,
  compactText
} from './novel-route-utils-payload'
import {
  getSafetyPolicy,
  getStoryState
} from './novel-route-utils-quality'

const BENCHMARK_RECALL_ALWAYS_HARD_GAPS = ['missing_primary_contract', 'profile_missing']
const BENCHMARK_RECALL_V12_HARD_GAPS = ['module_missing', 'rhythm_missing']
const BENCHMARK_RECALL_LEGACY_GAPS = ['legacy_deconstruction']
const BENCHMARK_RECALL_IGNORED_GAPS = ['no_benchmark']
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

function collectBenchmarkRecallGapStrings(...values: any[]) {
  const rows: string[] = []
  const visit = (value: any, prefix = '') => {
    if (value == null || value === false) return
    if (typeof value === 'string' || typeof value === 'number') {
      const text = compactText(value, 180)
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
  return Array.from(new Set(rows.map(item => item.trim()).filter(Boolean))).slice(0, 12)
}

function benchmarkRecallGapValues(source: any = {}) {
  const target = source?.chapter_target || source?.chapterTarget || {}
  const preDraft = source?.pre_draft_brief || source?.preDraftBrief || {}
  const styleStrategy = source?.style_sample_strategy || source?.styleSampleStrategy || target?.style_sample_strategy || target?.styleSampleStrategy || preDraft?.style_sample_strategy || preDraft?.styleSampleStrategy || {}
  const benchmarkStrategy = source?.chapter_benchmark_strategy || source?.chapterBenchmarkStrategy || target?.chapter_benchmark_strategy || target?.chapterBenchmarkStrategy || preDraft?.chapter_benchmark_strategy || preDraft?.chapterBenchmarkStrategy || {}
  const briefs = [
    source,
    source?.benchmark_recall_brief,
    source?.benchmarkRecallBrief,
    target?.benchmark_recall_brief,
    target?.benchmarkRecallBrief,
    preDraft?.benchmark_recall_brief,
    preDraft?.benchmarkRecallBrief,
  ].filter(Boolean)
  return [
    ...briefs.flatMap((item: any) => [item?.gaps, item?.recall_gaps, item?.recallGaps]),
    styleStrategy?.gaps,
    styleStrategy?.style_recall?.gaps,
    styleStrategy?.styleRecall?.gaps,
    styleStrategy?.benchmark_recall?.gaps,
    styleStrategy?.benchmarkRecall?.gaps,
    benchmarkStrategy?.gaps,
    benchmarkStrategy?.benchmark_recall?.gaps,
    benchmarkStrategy?.benchmarkRecall?.gaps,
  ]
}

function benchmarkRecallTextField(source: any = {}, key: string) {
  const camelKey = key.replace(/_([a-z])/g, (_match, letter) => String(letter || '').toUpperCase())
  return source?.[key] || source?.[camelKey]
}

function benchmarkRecallListField(source: any = {}, key: string) {
  const value = benchmarkRecallTextField(source, key)
  return Array.isArray(value) ? value : value ? [value] : []
}

function benchmarkRecallNestedObjects(source: any = {}) {
  return [
    source,
    source?.style_recall,
    source?.styleRecall,
    source?.benchmark_recall,
    source?.benchmarkRecall,
  ].filter(Boolean)
}

function benchmarkRecallSourcePathValues(source: any = {}) {
  const target = source?.chapter_target || source?.chapterTarget || {}
  const preDraft = source?.pre_draft_brief || source?.preDraftBrief || {}
  const styleStrategy = source?.style_sample_strategy || source?.styleSampleStrategy || target?.style_sample_strategy || target?.styleSampleStrategy || preDraft?.style_sample_strategy || preDraft?.styleSampleStrategy || {}
  const benchmarkStrategy = source?.chapter_benchmark_strategy || source?.chapterBenchmarkStrategy || target?.chapter_benchmark_strategy || target?.chapterBenchmarkStrategy || preDraft?.chapter_benchmark_strategy || preDraft?.chapterBenchmarkStrategy || {}
  const briefs = [
    source?.benchmark_recall_brief,
    source?.benchmarkRecallBrief,
    target?.benchmark_recall_brief,
    target?.benchmarkRecallBrief,
    preDraft?.benchmark_recall_brief,
    preDraft?.benchmarkRecallBrief,
  ].filter(Boolean)
  return [
    ...briefs,
    styleStrategy,
    benchmarkStrategy,
  ].flatMap((item: any) => benchmarkRecallNestedObjects(item).flatMap((nested: any) => (
    BENCHMARK_RECALL_SOURCE_PATH_FIELDS.flatMap(field => benchmarkRecallListField(nested, field))
  )))
}

function hasBenchmarkRecallContentWithoutSourcePaths(source: any = {}) {
  const target = source?.chapter_target || source?.chapterTarget || {}
  const preDraft = source?.pre_draft_brief || source?.preDraftBrief || {}
  const briefs = [
    source?.benchmark_recall_brief,
    source?.benchmarkRecallBrief,
    target?.benchmark_recall_brief,
    target?.benchmarkRecallBrief,
    preDraft?.benchmark_recall_brief,
    preDraft?.benchmarkRecallBrief,
  ].filter(Boolean)
  const hasRecallContent = briefs.some((brief: any) => [
    'selected_emotion_module',
    'rhythm_reference',
    'style_profile_summary',
    'matched_chapter',
    'matched_chapter_techniques',
    'style_directives',
  ].some(field => benchmarkRecallListField(brief, field).some(value => compactText(value))))
  if (!hasRecallContent) return false
  return collectBenchmarkRecallGapStrings(benchmarkRecallSourcePathValues(source)).length === 0
}

export function buildBenchmarkRecallPreflightChecks(source: any = {}) {
  const rawGaps = collectBenchmarkRecallGapStrings(...benchmarkRecallGapValues(source))
  if (rawGaps.some(item => BENCHMARK_RECALL_IGNORED_GAPS.some(key => item.toLowerCase().includes(key)))) return []
  const gaps = rawGaps

  const hasLegacyFallback = gaps.some(item => {
    const normalized = item.toLowerCase()
    return BENCHMARK_RECALL_LEGACY_GAPS.some(key => normalized.includes(key))
  })
  const hardGaps = gaps.filter(item => {
    const normalized = item.toLowerCase()
    return BENCHMARK_RECALL_ALWAYS_HARD_GAPS.some(key => normalized.includes(key))
      || (!hasLegacyFallback && BENCHMARK_RECALL_V12_HARD_GAPS.some(key => normalized.includes(key)))
  })
  const softGaps = gaps.filter(item => !hardGaps.includes(item))
  const checks: any[] = []
  if (hardGaps.length) {
    checks.push({
      key: 'benchmark_recall_gate',
      ok: false,
      severity: 'high',
      label: '文风召回门禁',
      fix: '先补齐 oh-story Step 2.3 的主模块/节奏/文风画像召回，再进入正文生成。',
      gaps: hardGaps,
    })
  }
  if (softGaps.length) {
    checks.push({
      key: 'benchmark_recall_gaps',
      ok: false,
      severity: 'medium',
      label: '文风召回缺口',
      fix: '旧版模块、节奏或冲突缺口可继续写作，但必须在意图确认和自检中保留并解释优先级。',
      gaps: softGaps,
    })
  }
  if (hasBenchmarkRecallContentWithoutSourcePaths(source)) {
    checks.push({
      key: 'benchmark_recall_source_paths',
      ok: false,
      severity: 'medium',
      label: '文风召回来源缺失',
      fix: '补充 oh-story Step 2.3 实际读取的 source_paths，包括文风、情绪模块、节奏、匹配章摘要/深度拆解路径。',
      gaps: ['Step 2.3 source_paths_missing'],
    })
  }
  return checks
}

export function applyBenchmarkRecallPreflightChecks(preflight: any, source: any = {}) {
  if (!preflight) return preflight
  const checks = buildBenchmarkRecallPreflightChecks(source)
  if (!checks.length) return preflight

  const existingKeys = new Set(asArray(preflight.checks).map((item: any) => String(item?.key || '')))
  const nextChecks = checks.filter(item => !existingKeys.has(item.key))
  if (!nextChecks.length) return preflight

  preflight.checks = [...asArray(preflight.checks), ...nextChecks]
  preflight.warnings = [
    ...asArray(preflight.warnings),
    ...nextChecks.filter(item => !item.ok).map(item => `${item.label}：${asArray(item.gaps).join('、') || item.fix}`),
  ]
  preflight.blockers = [
    ...asArray(preflight.blockers),
    ...nextChecks.filter(item => !item.ok && item.severity === 'high'),
  ]
  preflight.ready = preflight.blockers.length === 0
  preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
  return preflight
}

export function normalizeSceneProduction(sceneCards: any[] = [], previous: any[] = [], status = 'pending') {
  const byNo = new Map(previous.map((item: any) => [Number(item.scene_no || item.sceneNo || item.index || 0), item]))
  return sceneCards.map((card: any, index: number) => {
    const sceneNo = Number(card.scene_no || card.sceneNo || index + 1)
    const prev = byNo.get(sceneNo) || {}
    return {
      ...card,
      scene_no: sceneNo,
      status: prev.status && prev.status !== 'pending' ? prev.status : status,
      updated_at: new Date().toISOString(),
      word_count: Number(prev.word_count || 0),
      quality_notes: prev.quality_notes || [],
    }
  })
}

export const advanceSceneProduction = (scenes: any[] = [], status: string, patch: any = {}) => scenes.map(scene => ({
  ...scene,
  ...patch,
  status,
  updated_at: new Date().toISOString(),
}))

export const getVolumePlan = (outlines: any[]) => outlines
  .filter(outline => outline.outline_type === 'volume')
  .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
  .map(outline => ({
    id: outline.id,
    title: outline.title,
    summary: outline.summary || '',
    phase_conflicts: outline.conflict_points || [],
    key_turning_points: outline.turning_points || [],
    hook: outline.hook || '',
    target_length: outline.target_length || '',
    raw_payload: outline.raw_payload || {},
  }))

export const collectRecentFacts = (reviews: any[]) => reviews
  .filter(item => item.review_type === 'story_state')
  .slice()
  .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  .slice(0, 5)
  .map(item => {
    const payload = parseJsonLikePayload(item.payload) || {}
    return {
      chapter_no: payload.chapter_no,
      state_delta: payload.state_delta || payload,
    }
  })

export function buildPreflightChecks(project: any, chapter: any, previousChapter: any, worldbuilding: any[], characters: any[], sceneCards: any[], referencePreview: any, reviews: any[]) {
  const charactersWithState = characters.filter(char => char.current_state && Object.keys(char.current_state || {}).length > 0)
  const storyState = getStoryState(project)
  const forbidden = getSafetyPolicy(project).forbidden
  const repeatedWarnings = asArray(storyState.recent_repeated_information).slice(0, 6)
  const chapterForbiddenRepeats = asArray(chapter.raw_payload?.forbidden_repeats)
  const checks = [
    { key: 'chapter_blueprint', ok: Boolean(chapter.chapter_summary || chapter.chapter_goal), severity: 'high', label: '章节细纲/目标', fix: '补充章节目标或章节摘要。' },
    { key: 'scene_cards', ok: sceneCards.length > 0, severity: 'medium', label: '场景卡', fix: '先生成或编辑本章场景卡。' },
    { key: 'chapter_conflict', ok: Boolean(chapter.conflict), severity: 'medium', label: '本章冲突', fix: '补充本章主要冲突。' },
    { key: 'ending_hook', ok: Boolean(chapter.ending_hook), severity: 'high', label: '章末钩子', fix: '补充本章结尾钩子。' },
    { key: 'worldbuilding', ok: worldbuilding.length > 0, severity: 'high', label: '世界观', fix: '补充世界观或核心规则。' },
    { key: 'characters', ok: characters.length > 0, severity: 'high', label: '角色卡', fix: '补充至少一个主要角色。' },
    { key: 'character_state', ok: characters.length === 0 || charactersWithState.length > 0 || Boolean(storyState.character_positions), severity: 'medium', label: '角色当前状态', fix: '补充角色 current_state 或先生成故事状态。' },
    { key: 'plot_points', ok: Boolean(chapter.chapter_goal || chapter.chapter_summary || asArray(chapter.raw_payload?.must_advance).length), severity: 'high', label: '本章必须推进剧情点', fix: '在章节目标/摘要中写清本章必须推进的剧情点。' },
    { key: 'previous_continuity', ok: chapter.chapter_no <= 1 || Boolean(previousChapter?.chapter_text || previousChapter?.ending_hook), severity: 'high', label: '前章衔接', fix: '补齐上一章正文或结尾钩子。' },
    { key: 'no_repeat', ok: repeatedWarnings.length === 0 || chapterForbiddenRepeats.length > 0, severity: 'low', label: '禁止重复信息', fix: '给本章补充 forbidden_repeats，明确哪些信息不要重复解释。' },
    { key: 'reference_knowledge', ok: !project.reference_config?.references?.length || Boolean(referencePreview?.entries?.length), severity: 'medium', label: '参考知识注入', fix: '先做参考预览或补齐参考作品画像。' },
    { key: 'copy_safety_policy', ok: forbidden.length > 0, severity: 'medium', label: '仿写禁止项', fix: '配置仿写安全禁止项。' },
  ]
  const blockers = checks.filter(item => !item.ok && item.severity === 'high')
  const warnings = checks.filter(item => !item.ok).map(item => `${item.label}不足`)
  return applyBenchmarkRecallPreflightChecks({
    ready: blockers.length === 0,
    strict_ready: checks.every(item => item.ok || item.severity === 'low'),
    checks,
    blockers,
    warnings,
    recent_state_entries: collectRecentFacts(reviews),
  }, chapter?.raw_payload || chapter || {})
}
