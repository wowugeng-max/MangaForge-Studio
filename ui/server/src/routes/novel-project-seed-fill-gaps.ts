/**
 * Safe project-seed gap fill:
 * - only request missing / thin foundation fields from the model
 * - never overwrite existing non-empty values with empty
 * - only replace a value when the candidate is richer / better
 * - preserve good chapter/volume/foreshadowing outlines
 */

export type SeedGapTarget = {
  key: string
  label: string
  path: string
  reason: string
}

type AnyRecord = Record<string, any>

function asObject(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

function isPlainObject(value: any) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

const PLACEHOLDER_PATTERNS = [
  /^待补/,
  /^待完善/,
  /^待写/,
  /^暂无/,
  /^TBD$/i,
  /^TODO$/i,
  /^N\/?A$/i,
  /仍需模型补齐/,
  /根据已有线索建立可升级/,
  /待补齐/,
]

function looksPlaceholder(value: any): boolean {
  if (isEmptyValue(value)) return true
  if (typeof value === 'string') {
    const text = value.trim()
    if (text.length < 4) return true
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text))
  }
  if (Array.isArray(value)) return value.every(item => looksPlaceholder(item))
  if (isPlainObject(value)) {
    const entries = Object.values(value)
    if (!entries.length) return true
    return entries.every(item => looksPlaceholder(item))
  }
  return false
}

function leafScore(value: any): number {
  if (isEmptyValue(value) || looksPlaceholder(value)) return 0
  if (typeof value === 'string') {
    const text = value.trim()
    // Prefer substantive Chinese/English prose over short labels.
    return Math.min(text.length, 800) + (text.length >= 20 ? 20 : 0) + (text.length >= 80 ? 30 : 0)
  }
  if (typeof value === 'number' || typeof value === 'boolean') return 8
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + leafScore(item), 0) + value.length * 4
  }
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((sum, [key, item]) => {
      if (key === 'source' || key === 'raw_payload') return sum
      return sum + leafScore(item) + 2
    }, 0)
  }
  return 0
}

export function seedValueRichness(value: any): number {
  return leafScore(value)
}

export function isRicherSeedValue(candidate: any, existing: any): boolean {
  if (isEmptyValue(candidate) || looksPlaceholder(candidate)) return false
  if (isEmptyValue(existing) || looksPlaceholder(existing)) return true
  // Never let empty-ish arrays wipe filled arrays.
  if (Array.isArray(existing) && Array.isArray(candidate) && candidate.length < existing.length) {
    // Candidate shorter only wins if existing is clearly placeholder/template thin and candidate denser overall.
    const existingScore = seedValueRichness(existing)
    const candidateScore = seedValueRichness(candidate)
    return candidateScore > existingScore * 1.35
  }
  return seedValueRichness(candidate) > seedValueRichness(existing)
}

const OUTLINE_PROTECTED_KEYS = new Set([
  'chapter_outlines',
  'volume_outlines',
  'foreshadowing_plan',
  'master_outline',
])

const ALWAYS_PRESERVE_KEYS = new Set([
  'raw_idea',
  'derived_at',
  'seed_diagnostics',
  'oh_story_director',
  'ohStoryDirector',
  'author_confirmations',
  'id',
  'draft_id',
])

function characterKey(item: any) {
  return firstText(item?.name, item?.title, item?.alias).toLowerCase()
}

function mergeCharacterArrays(existing: any[], incoming: any[]): any[] {
  const result = existing.map(item => asObject(item))
  const indexByName = new Map<string, number>()
  result.forEach((item, index) => {
    const key = characterKey(item)
    if (key) indexByName.set(key, index)
  })
  for (const raw of incoming) {
    const item = asObject(raw)
    const key = characterKey(item)
    if (!key) continue
    const hit = indexByName.get(key)
    if (hit === undefined) {
      result.push(item)
      indexByName.set(key, result.length - 1)
      continue
    }
    result[hit] = mergePreferRicherDeep(result[hit], item).value
  }
  return result
}

function mergePool(existing: any, incoming: any): any {
  const base = asObject(existing)
  const patch = asObject(incoming)
  const out: AnyRecord = { ...base }
  for (const [tier, value] of Object.entries(patch)) {
    if (isEmptyValue(value)) continue
    const current = base[tier]
    if (Array.isArray(value) || Array.isArray(current)) {
      out[tier] = mergeCharacterArrays(asArray(current), asArray(value))
    } else if (isEmptyValue(current) || looksPlaceholder(current)) {
      out[tier] = value
    } else if (isPlainObject(current) && isPlainObject(value)) {
      out[tier] = mergePreferRicherDeep(current, value).value
    } else if (isRicherSeedValue(value, current)) {
      out[tier] = value
    }
  }
  return out
}

export function mergePreferRicherDeep(existing: any, incoming: any, path = ''): {
  value: any
  filled: string[]
  skipped: string[]
} {
  const filled: string[] = []
  const skipped: string[] = []

  if (isEmptyValue(incoming) || looksPlaceholder(incoming)) {
    if (!isEmptyValue(existing)) skipped.push(path || '(root)')
    return { value: existing, filled, skipped }
  }
  if (isEmptyValue(existing) || looksPlaceholder(existing)) {
    if (!isEmptyValue(incoming) && !looksPlaceholder(incoming)) filled.push(path || '(root)')
    return { value: incoming, filled, skipped }
  }

  // Arrays
  if (Array.isArray(existing) || Array.isArray(incoming)) {
    const existingArr = asArray(existing)
    const incomingArr = asArray(incoming)
    // Character-like arrays: merge by name
    const looksCharacters = existingArr.concat(incomingArr).some(item => characterKey(item))
    if (looksCharacters && /(^|\.)characters$/i.test(path || 'characters')) {
      const merged = mergeCharacterArrays(existingArr, incomingArr)
      if (merged.length > existingArr.length || seedValueRichness(merged) > seedValueRichness(existingArr)) {
        filled.push(path)
      } else {
        skipped.push(path)
      }
      return { value: merged, filled, skipped }
    }
    if (OUTLINE_PROTECTED_KEYS.has(path.split('.').pop() || '')) {
      // Keep good existing outlines unless empty/thin.
      if (existingArr.length > 0 && seedValueRichness(existingArr) >= seedValueRichness(incomingArr) * 0.85) {
        skipped.push(path)
        return { value: existingArr, filled, skipped }
      }
      if (isRicherSeedValue(incomingArr, existingArr)) {
        filled.push(path)
        return { value: incomingArr, filled, skipped }
      }
      skipped.push(path)
      return { value: existingArr, filled, skipped }
    }
    if (isRicherSeedValue(incomingArr, existingArr)) {
      filled.push(path)
      return { value: incomingArr, filled, skipped }
    }
    skipped.push(path)
    return { value: existingArr, filled, skipped }
  }

  // Objects
  if (isPlainObject(existing) && isPlainObject(incoming)) {
    const out: AnyRecord = { ...existing }
    for (const [key, candidate] of Object.entries(asObject(incoming))) {
      if (ALWAYS_PRESERVE_KEYS.has(key)) {
        skipped.push(path ? `${path}.${key}` : key)
        continue
      }
      const childPath = path ? `${path}.${key}` : key
      if (key === 'character_pool') {
        const before = seedValueRichness(out[key])
        out[key] = mergePool(out[key], candidate)
        const after = seedValueRichness(out[key])
        if (after > before) filled.push(childPath)
        else skipped.push(childPath)
        continue
      }
      if (key === 'characters') {
        const merged = mergeCharacterArrays(asArray(out[key]), asArray(candidate))
        if (merged.length > asArray(out[key]).length || seedValueRichness(merged) > seedValueRichness(out[key])) {
          filled.push(childPath)
        } else {
          skipped.push(childPath)
        }
        out[key] = merged
        continue
      }
      if (OUTLINE_PROTECTED_KEYS.has(key)) {
        const current = out[key]
        if (!isEmptyValue(current) && !looksPlaceholder(current) && seedValueRichness(current) >= seedValueRichness(candidate) * 0.85) {
          skipped.push(childPath)
          continue
        }
      }
      const child = mergePreferRicherDeep(out[key], candidate, childPath)
      out[key] = child.value
      filled.push(...child.filled)
      skipped.push(...child.skipped)
    }
    return { value: out, filled, skipped }
  }

  // Primitive / mismatched types
  if (isRicherSeedValue(incoming, existing)) {
    filled.push(path || '(root)')
    return { value: incoming, filled, skipped }
  }
  skipped.push(path || '(root)')
  return { value: existing, filled, skipped }
}

export function mergeSeedPreferRicher(existingSeed: any, incomingSeed: any) {
  const existing = asObject(existingSeed)
  const incoming = asObject(incomingSeed)
  // Never allow empty full replacement
  if (!Object.keys(incoming).length) {
    return { seed: existing, filled: [] as string[], skipped: ['(empty_incoming)'] }
  }
  const merged = mergePreferRicherDeep(existing, incoming)
  // Genre hard-lock: keep existing genre if present
  if (firstText(existing.genre) && firstText(incoming.genre) && existing.genre !== incoming.genre) {
    // only replace if existing is placeholder
    if (!looksPlaceholder(existing.genre)) {
      merged.value.genre = existing.genre
      if (!merged.skipped.includes('genre')) merged.skipped.push('genre')
      merged.filled = merged.filled.filter(item => item !== 'genre' && !item.startsWith('genre.'))
    }
  }
  // Title hard-lock when existing is non-empty
  if (firstText(existing.title) && !looksPlaceholder(existing.title)) {
    merged.value.title = existing.title
  }
  return {
    seed: merged.value,
    filled: Array.from(new Set(merged.filled.filter(Boolean))),
    skipped: Array.from(new Set(merged.skipped.filter(Boolean))),
  }
}

function hasContract(value: any) {
  return seedValueRichness(value) >= 24
}

function hasAntagonist(seed: any) {
  const root = asObject(seed)
  const pool = asObject(root.character_pool)
  if (asArray(pool.antagonist_primary).length > 0) return true
  if (firstText(asObject(root.antagonist).name, asObject(root.antagonist).identity)) return true
  return asArray(root.characters).some(item => /反派|对手|敌|boss|antagonist/i.test(String(item?.role_type || item?.role || '')))
}

const LABEL_TO_TARGET: Array<{ match: RegExp; target: Omit<SeedGapTarget, 'reason'> & { reason: string } }> = [
  {
    match: /追读|留存/,
    target: {
      key: 'reader_retention_contract',
      label: '追读留存契约',
      path: 'writing_bible.reader_retention_contract',
      reason: '缺少追读留存契约',
    },
  },
  {
    match: /开篇策略|开篇噱头|opening_strategy/,
    target: {
      key: 'opening_strategy_contract',
      label: '开篇策略契约',
      path: 'writing_bible.opening_strategy_contract',
      reason: '缺少开篇策略契约',
    },
  },
  {
    match: /故事力/,
    target: {
      key: 'story_power_contract',
      label: '故事力合同',
      path: 'writing_bible.story_power_contract',
      reason: '缺少故事力合同',
    },
  },
  {
    match: /核心承诺|承诺雷达|core_contract/,
    target: {
      key: 'core_contract_radar',
      label: '核心承诺雷达',
      path: 'writing_bible.core_contract_radar',
      reason: '缺少核心承诺雷达',
    },
  },
  {
    match: /目标读者/,
    target: {
      key: 'target_reader_contract',
      label: '目标读者契约',
      path: 'writing_bible.target_reader_contract',
      reason: '缺少目标读者契约',
    },
  },
  {
    match: /角色设计合同|角色合同/,
    target: {
      key: 'character_design_contract',
      label: '角色设计合同',
      path: 'writing_bible.character_design_contract',
      reason: '缺少角色设计合同',
    },
  },
  {
    match: /长篇结构/,
    target: {
      key: 'longform_structure_contract',
      label: '长篇结构合同',
      path: 'writing_bible.longform_structure_contract',
      reason: '缺少长篇结构合同',
    },
  },
  {
    match: /情节专题/,
    target: {
      key: 'plot_special_topics_contract',
      label: '情节专题合同',
      path: 'writing_bible.plot_special_topics_contract',
      reason: '缺少情节专题合同',
    },
  },
  {
    match: /题材定位/,
    target: {
      key: 'genre_positioning_contract',
      label: '题材定位合同',
      path: 'writing_bible.genre_positioning_contract',
      reason: '缺少题材定位合同',
    },
  },
  {
    match: /关键人物|人物阵容|角色阵容/,
    target: {
      key: 'characters',
      label: '关键人物阵容',
      path: 'characters',
      reason: '关键人物不足 3 人',
    },
  },
  {
    match: /主要对手|反派|对手/,
    target: {
      key: 'antagonist',
      label: '主要对手',
      path: 'antagonist',
      reason: '缺少主要对手',
    },
  },
  {
    match: /读者承诺/,
    target: {
      key: 'reader_promise',
      label: '读者承诺',
      path: 'commercial_positioning.reader_promise',
      reason: '缺少读者承诺',
    },
  },
  {
    match: /核心卖点|卖点/,
    target: {
      key: 'selling_points',
      label: '核心卖点',
      path: 'commercial_positioning.selling_points',
      reason: '缺少核心卖点',
    },
  },
  {
    match: /伏笔/,
    target: {
      key: 'foreshadowing_plan',
      label: '伏笔计划',
      path: 'foreshadowing_plan',
      reason: '伏笔计划偏薄',
    },
  },
  {
    match: /世界观/,
    target: {
      key: 'world_summary',
      label: '世界观摘要',
      path: 'worldbuilding.world_summary',
      reason: '世界观摘要偏薄',
    },
  },
  {
    match: /力量|规则体系|成长引擎/,
    target: {
      key: 'power_system',
      label: '力量/规则体系',
      path: 'worldbuilding.power_system',
      reason: '力量/规则体系偏薄',
    },
  },
  {
    match: /主线目标|长篇主线/,
    target: {
      key: 'mainline_goal',
      label: '长篇主线目标',
      path: 'plot_engine.mainline_goal',
      reason: '缺少长篇主线目标',
    },
  },
  {
    match: /长线冲突/,
    target: {
      key: 'long_term_conflict',
      label: '长线冲突引擎',
      path: 'plot_engine.long_term_conflict',
      reason: '缺少长线冲突引擎',
    },
  },
]

function pushUniqueTarget(list: SeedGapTarget[], target: SeedGapTarget) {
  if (list.some(item => item.key === target.key || item.path === target.path)) return
  list.push(target)
}

export function listProjectSeedGapTargets(seed: any, hints: string[] = []): SeedGapTarget[] {
  const root = asObject(seed)
  const bible = asObject(root.writing_bible)
  const commercial = asObject(root.commercial_positioning)
  const world = asObject(root.worldbuilding)
  const plot = asObject(root.plot_engine)
  const targets: SeedGapTarget[] = []

  const autoChecks: Array<[boolean, SeedGapTarget]> = [
    [!hasContract(bible.reader_retention_contract), {
      key: 'reader_retention_contract',
      label: '追读留存契约',
      path: 'writing_bible.reader_retention_contract',
      reason: 'writing_bible.reader_retention_contract 缺失或偏薄',
    }],
    [!hasContract(bible.opening_strategy_contract), {
      key: 'opening_strategy_contract',
      label: '开篇策略契约',
      path: 'writing_bible.opening_strategy_contract',
      reason: 'writing_bible.opening_strategy_contract 缺失或偏薄',
    }],
    [!hasContract(bible.story_power_contract), {
      key: 'story_power_contract',
      label: '故事力合同',
      path: 'writing_bible.story_power_contract',
      reason: 'writing_bible.story_power_contract 缺失或偏薄',
    }],
    [!hasContract(bible.core_contract_radar), {
      key: 'core_contract_radar',
      label: '核心承诺雷达',
      path: 'writing_bible.core_contract_radar',
      reason: 'writing_bible.core_contract_radar 缺失或偏薄',
    }],
    [!hasContract(bible.target_reader_contract), {
      key: 'target_reader_contract',
      label: '目标读者契约',
      path: 'writing_bible.target_reader_contract',
      reason: 'writing_bible.target_reader_contract 缺失或偏薄',
    }],
    [!hasContract(bible.character_design_contract), {
      key: 'character_design_contract',
      label: '角色设计合同',
      path: 'writing_bible.character_design_contract',
      reason: 'writing_bible.character_design_contract 缺失或偏薄',
    }],
    [!hasContract(bible.longform_structure_contract), {
      key: 'longform_structure_contract',
      label: '长篇结构合同',
      path: 'writing_bible.longform_structure_contract',
      reason: 'writing_bible.longform_structure_contract 缺失或偏薄',
    }],
    [!hasContract(bible.plot_special_topics_contract), {
      key: 'plot_special_topics_contract',
      label: '情节专题合同',
      path: 'writing_bible.plot_special_topics_contract',
      reason: 'writing_bible.plot_special_topics_contract 缺失或偏薄',
    }],
    [!hasContract(bible.genre_positioning_contract) && !firstText(root.genre), {
      key: 'genre_positioning_contract',
      label: '题材定位合同',
      path: 'writing_bible.genre_positioning_contract',
      reason: '题材定位合同缺失',
    }],
    [asArray(root.characters).length < 3, {
      key: 'characters',
      label: '关键人物阵容',
      path: 'characters',
      reason: `当前人物 ${asArray(root.characters).length} 人，至少需要 3 人`,
    }],
    [!hasAntagonist(root), {
      key: 'antagonist',
      label: '主要对手',
      path: 'antagonist',
      reason: '缺少主要对手 / antagonist_primary',
    }],
    [!firstText(commercial.reader_promise, root.reader_promise, root.logline), {
      key: 'reader_promise',
      label: '读者承诺',
      path: 'commercial_positioning.reader_promise',
      reason: '缺少读者承诺',
    }],
    [asArray(commercial.selling_points).length === 0 && !firstText(root.core_selling_point, root.hook), {
      key: 'selling_points',
      label: '核心卖点',
      path: 'commercial_positioning.selling_points',
      reason: '缺少核心卖点',
    }],
    [!firstText(world.world_summary, world.summary), {
      key: 'world_summary',
      label: '世界观摘要',
      path: 'worldbuilding.world_summary',
      reason: '世界观摘要偏薄',
    }],
    [!firstText(world.power_system), {
      key: 'power_system',
      label: '力量/规则体系',
      path: 'worldbuilding.power_system',
      reason: '力量/规则体系偏薄',
    }],
    [!firstText(plot.mainline_goal, root.mainline_goal), {
      key: 'mainline_goal',
      label: '长篇主线目标',
      path: 'plot_engine.mainline_goal',
      reason: '缺少长篇主线目标',
    }],
    [!firstText(plot.long_term_conflict, root.long_term_conflict, root.main_conflict), {
      key: 'long_term_conflict',
      label: '长线冲突引擎',
      path: 'plot_engine.long_term_conflict',
      reason: '缺少长线冲突引擎',
    }],
    [asArray(root.foreshadowing_plan).length === 0, {
      key: 'foreshadowing_plan',
      label: '伏笔计划',
      path: 'foreshadowing_plan',
      reason: '伏笔计划为空',
    }],
  ]

  for (const [missing, target] of autoChecks) {
    if (missing) pushUniqueTarget(targets, target)
  }

  for (const hint of hints.map(item => String(item || '').trim()).filter(Boolean)) {
    for (const rule of LABEL_TO_TARGET) {
      if (rule.match.test(hint)) {
        pushUniqueTarget(targets, { ...rule.target, reason: `评分缺口：${hint}` })
      }
    }
  }

  return targets
}

function compactJson(value: any, max = 18000) {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > max ? `${text.slice(0, max)}\n/* truncated */` : text
  } catch {
    return '{}'
  }
}

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
