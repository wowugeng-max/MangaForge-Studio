import {
  asArray,
  asObject,
  firstText,
  type AnyRecord,
  type SeedGapTarget,
} from './novel-project-seed-fill-gaps-merge'
import {
  listProjectSeedGapTargets,
} from './novel-project-seed-fill-gaps-targets'

export function buildProjectSeedFillGapsPrompt(args: {
  seed: any
  idea?: string
  title?: string
  gaps?: SeedGapTarget[]
  risks?: string[]
}) {
  const seed = asObject(args.seed)
  const gaps = (args.gaps && args.gaps.length)
    ? args.gaps
    : listProjectSeedGapTargets(seed, args.risks || [])
  const gapLines = gaps.length
    ? gaps.map((item, index) => `${index + 1}. [${item.path}] ${item.label} — ${item.reason}`).join('\n')
    : '未检测到明确缺口；请只补 writing_bible 中仍偏薄的契约字段。'

  // Existing good material snapshot (read-only for model)
  const preserveSnapshot = {
    title: seed.title,
    genre: seed.genre,
    sub_genres: seed.sub_genres,
    logline: seed.logline,
    synopsis: seed.synopsis,
    core_premise: seed.core_premise,
    main_conflict: seed.main_conflict,
    protagonist: seed.protagonist,
    antagonist: seed.antagonist,
    characters: asArray(seed.characters).slice(0, 12),
    character_pool: seed.character_pool,
    worldbuilding: seed.worldbuilding,
    plot_engine: seed.plot_engine,
    commercial_positioning: seed.commercial_positioning,
    writing_bible: seed.writing_bible,
    volume_outline_count: asArray(seed.volume_outlines).length,
    chapter_outline_count: asArray(seed.chapter_outlines).length,
    foreshadowing_count: asArray(seed.foreshadowing_plan).length,
    volume_outlines_preview: asArray(seed.volume_outlines).slice(0, 3),
    chapter_outlines_preview: asArray(seed.chapter_outlines).slice(0, 4),
  }

  return [
    '任务：只补齐当前小说项目种子中的「评分缺口字段」。输出一个 JSON object 补丁（patch），不要 Markdown，不要解释。',
    '绝对约束：',
    '1. 不得推翻、重写或清空已有优质内容。',
    '2. 已有非空字段若质量可用，禁止用空值、短句模板或无关新故事覆盖。',
    '3. 不得改写 chapter_outlines / volume_outlines / foreshadowing_plan（除非它们当前为空且缺口明确要求补伏笔）。',
    '4. 不得更换 title、genre、主角姓名、核心设定方向。',
    '5. 只输出需要补的字段；可嵌套 writing_bible / commercial_positioning / characters / character_pool / antagonist / worldbuilding / plot_engine。',
    '6. 若补 characters：只追加缺失角色（同盟/对手等），不要删除或改名已有角色。',
    '7. 若补 antagonist：同时尽量补 character_pool.antagonist_primary。',
    '',
    args.title ? `作品名：${args.title}` : firstText(seed.title) ? `作品名：${seed.title}` : '',
    firstText(seed.genre) ? `题材：${seed.genre}` : '',
    '',
    '【用户原始想法】',
    String(args.idea || seed.raw_idea || '').slice(0, 8000) || '（无额外想法，请基于已有种子补齐）',
    '',
    '【当前已有优质材料（只读，禁止覆盖）】',
    compactJson(preserveSnapshot, 20000),
    '',
    '【必须优先补齐的缺口】',
    gapLines,
    '',
    '字段规范（按需输出）：',
    'writing_bible.target_reader_contract: {reader_profile, reader_desires, emotional_gap, chapter_value_test, quality_checks}',
    'writing_bible.opening_strategy_contract: {hook_type, opening_flow, mainline_graft, first_5_chapter_promise, threshold_ladder, forbidden_mixing, quality_checks}；hook_type 只能是 事件噱头/金手指噱头/人设噱头 之一',
    'writing_bible.reader_retention_contract: {retention_double_engine, opening_hook_rule, ending_hook_rule, reward_randomness_rule, quality_checks}；opening_hook_rule 必须含“前300字”',
    'writing_bible.story_power_contract: 故事五维、有动作才是故事、有始有终、因果反馈、行动改变局势',
    'writing_bible.core_contract_radar: {must_serve, no_drift, theme_unity_rules, repair_focus, periodic_drift_check}',
    'writing_bible.character_design_contract / longform_structure_contract / plot_special_topics_contract / genre_positioning_contract：仅在缺口列表中时补',
    'characters: [{name, role_type, goal, identity, summary}] 至少补到 3 人',
    'antagonist: {name, identity, goal, method, hidden_truth}',
    'character_pool.antagonist_primary: [{name, antagonist_logic:{desire, method, pressure}}]',
    'commercial_positioning: {reader_promise, selling_points, risks, platform}',
    'worldbuilding: {world_summary, power_system, rules}',
    'plot_engine: {mainline_goal, long_term_conflict, growth_engine}',
    '',
    '只输出 JSON object 补丁。',
  ].filter(Boolean).join('\n')
}

function tryParseJsonObject(value: any): AnyRecord {
  if (isPlainObject(value)) return value
  if (typeof value !== 'string') return {}
  const raw = value.trim()
  if (!raw) return {}
  const candidates = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''),
    (raw.match(/```(?:json)?\s*([\s\S]*?)```/i) || [])[1] || '',
    (raw.match(/\{[\s\S]*\}/) || [])[0] || '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (isPlainObject(parsed)) return parsed
    } catch {
      // continue
    }
  }
  return {}
}

function patchSignalScore(item: AnyRecord) {
  if (!item || !Object.keys(item).length) return 0
  let score = 0
  for (const key of [
    'writing_bible',
    'characters',
    'character_pool',
    'antagonist',
    'commercial_positioning',
    'worldbuilding',
    'plot_engine',
    'foreshadowing_plan',
    'reader_promise',
    'protagonist',
    'target_reader_contract',
    'opening_strategy_contract',
    'reader_retention_contract',
    'story_power_contract',
    'core_contract_radar',
  ]) {
    if (!isEmptyValue(item[key])) score += 1 + Math.min(seedValueRichness(item[key]) / 40, 8)
  }
  return score
}

export function extractFillGapsPatch(payload: any): AnyRecord {
  const roots: AnyRecord[] = []
  const queue = [payload]
  const seen = new Set<any>()
  while (queue.length) {
    const current = queue.shift()
    if (current == null || seen.has(current)) continue
    seen.add(current)
    if (typeof current === 'string') {
      const parsed = tryParseJsonObject(current)
      if (Object.keys(parsed).length) roots.push(parsed)
      continue
    }
    if (!isPlainObject(current) && !Array.isArray(current)) continue
    if (isPlainObject(current)) {
      roots.push(current)
      for (const key of ['patch', 'seed_patch', 'updates', 'project_seed', 'seed', 'data', 'result', 'output', 'content', 'parsed', 'raw']) {
        if (current[key] !== undefined) queue.push(current[key])
      }
    }
  }

  let best: AnyRecord = {}
  let bestScore = 0
  for (const root of roots) {
    const candidates = [
      root.patch,
      root.seed_patch,
      root.updates,
      root.project_seed,
      root.seed,
      root.data,
      root.result,
      root.writing_bible ? root : null,
      root,
    ]
    for (const candidate of candidates) {
      const obj = isPlainObject(candidate) ? candidate : tryParseJsonObject(candidate)
      const score = patchSignalScore(obj)
      if (score > bestScore) {
        best = obj
        bestScore = score
      }
    }
  }
  return bestScore > 0 ? best : {}
}
