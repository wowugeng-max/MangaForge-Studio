export function parseJsonLikePayload(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  const raw = String(value || '').trim()
  if (!raw) return null
  const candidates = [
    raw,
    raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || '',
    raw.match(/\{[\s\S]*\}/)?.[0] || '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next candidate
    }
  }
  return null
}

export function getNovelPayload(result: any) {
  const rawChoicesContent = result?.raw?.choices?.[0]?.message?.content
  const candidates = [result?.output, result?.parsed, result?.content, result?.raw?.content, rawChoicesContent]
  for (const candidate of candidates) {
    const payload = parseJsonLikePayload(candidate)
    if (payload && typeof payload === 'object') return payload
  }
  return {}
}

function textFromOutputParts(parts: any[]) {
  return parts
    .map((part: any) => String(part?.text || part?.content || part?.value || ''))
    .filter(Boolean)
    .join('\n')
}

function textFromOutputItems(items: any[]) {
  return items
    .map((item: any) => {
      if (typeof item?.content === 'string') return item.content
      if (Array.isArray(item?.content)) return textFromOutputParts(item.content)
      return String(item?.text || item?.value || '')
    })
    .filter(Boolean)
    .join('\n')
}

export function extractLLMText(result: any) {
  const candidates = [
    result?.content,
    result?.raw?.content,
    result?.raw?.output_text,
    result?.raw?.response?.output_text,
    result?.raw?.choices?.[0]?.message?.content,
    result?.raw?.choices?.[0]?.text,
    Array.isArray(result?.raw?.output) ? textFromOutputItems(result.raw.output) : '',
    Array.isArray(result?.raw?.response?.output) ? textFromOutputItems(result.raw.response.output) : '',
  ]
  return candidates.map(item => String(item || '').trim()).find(Boolean) || ''
}

export function extractPlainProseFallback(result: any, minChars = 800) {
  const text = extractLLMText(result)
    .replace(/^```(?!json\b)[a-zA-Z0-9_-]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (!text) return ''
  if (/^```json\b/i.test(text) || /^[{\[]/.test(text)) return ''
  const compact = text.replace(/\s/g, '')
  if (compact.length < minChars) return ''
  return text
}

export function buildLLMResultDiagnostics(result: any, limit = 1200) {
  const text = extractLLMText(result)
  const raw = result?.raw || null
  const streamTail = Array.isArray(raw?.stream_chunks_tail) ? raw.stream_chunks_tail : []
  return {
    finish_reason: result?.finish_reason || raw?.finish_reason || raw?.status || '',
    usage: result?.usage || raw?.usage || raw?.response?.usage || null,
    content_length: String(text || '').length,
    content_preview: compactText(text, limit),
    raw_keys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
    stream_tail: streamTail.slice(-5).map((chunk: any) => ({
      type: String(chunk?.type || chunk?.event || ''),
      keys: chunk && typeof chunk === 'object' ? Object.keys(chunk) : [],
      preview: compactText(JSON.stringify(chunk || {}), 500),
    })),
  }
}

export const compactText = (value: any, limit = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
export const asArray = (value: any) => Array.isArray(value) ? value : []
export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS = {
  narrative_person: '第三人称有限视角为主，紧贴主角即时判断；关键情绪段可短暂内心独白，避免全知解释。',
  sentence_length: '短中句为主，长句只用于高潮铺压；单段控制在2-4句，动作、反应、信息按快切推进。',
  dialogue_ratio: '35%-45%，对白承担冲突、信息差、笑点和推进，不写寒暄型对白。',
  banter_density: '中等偏高：紧张场景用短吐槽泄压，但不拆恐怖、战斗或悬疑张力。',
  payoff_density: '高密度：每800-1200字至少一次小爽点、反转、收获或信息差揭示，每章结尾保留升级钩子。',
  description_density: '低到中：环境描写只服务规则、危险、情绪和线索，避免静态大段铺陈。',
  chapter_word_range: '标准章2800-3500字；高潮、战斗、阶段收束可写8000-10000字长章。',
  ending_policy: '每章末必须留下选择、危机、奖励、身份、规则反转或新目标之一，推动下一章点击。',
  banned_words: [
    '一股莫名的感觉',
    '说不清道不明',
    '命运的齿轮开始转动',
    '仿佛一切都在掌控之中',
    '无意义的“只见”开头',
    '无设定支撑的“不可名状”',
    '无必要的“与此同时”切镜',
  ],
  preferred_words: [
    '规则',
    '代价',
    '倒计时',
    '奖励',
    '线索',
    '破局',
    '反转',
    '升级',
    '压迫感',
    '信息差',
    '名场面',
    '钩子',
    '爽点回收',
  ],
  banned_shortcuts: [
    '用梦境、误会或巧合取消已经发生的代价',
    '用旁白总结替代角色行动和冲突推进',
    '连续两章只解释设定不制造选择和变化',
    '为了拖字数重复同一条规则、同一段震惊或同一轮吐槽',
  ],
}

export function stableTextHash(value: any) {
  const text = String(value || '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function normalizeIssue(issue: any) {
  if (typeof issue === 'string') return { severity: 'medium', type: 'general', description: issue, suggestion: '' }
  return {
    severity: String(issue?.severity || 'medium'),
    type: String(issue?.type || issue?.issue_type || 'general'),
    description: String(issue?.description || issue?.message || issue?.issue || ''),
    suggestion: String(issue?.suggestion || issue?.suggested_fix || ''),
  }
}

export function deepMergeObjects(base: any, override: any): any {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base
  const next = { ...(base || {}) }
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      next[key] = deepMergeObjects(base[key], value)
    } else {
      next[key] = value
    }
  }
  return next
}

export function getStyleLock(project: any) {
  const raw = project?.reference_config?.style_lock || {}
  const defaults = COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS
  const targetLength = raw.chapter_word_range || raw.target_length || (
    project?.length_target === 'short' ? '1800-2500字' : defaults.chapter_word_range
  )
  return {
    narrative_person: raw.narrative_person || raw.narrative_style || defaults.narrative_person,
    sentence_length: raw.sentence_length || defaults.sentence_length,
    dialogue_ratio: raw.dialogue_ratio || defaults.dialogue_ratio,
    banter_density: raw.banter_density || defaults.banter_density,
    payoff_density: raw.payoff_density || defaults.payoff_density,
    description_density: raw.description_density || defaults.description_density,
    chapter_word_range: targetLength,
    banned_words: asArray(raw.banned_words).length ? asArray(raw.banned_words) : [...defaults.banned_words],
    preferred_words: asArray(raw.preferred_words).length ? asArray(raw.preferred_words) : [...defaults.preferred_words],
    ending_policy: raw.ending_policy || defaults.ending_policy,
    banned_shortcuts: asArray(raw.banned_shortcuts).length ? asArray(raw.banned_shortcuts) : [...defaults.banned_shortcuts],
  }
}

export function getSafetyPolicy(project: any) {
  const raw = project?.reference_config?.safety || {}
  return {
    enforce_on_generate: Boolean(raw.enforce_on_generate),
    min_quality_score: Number(raw.min_quality_score || 60),
    max_copy_hits: Number(raw.max_copy_hits ?? 0),
    allowed: asArray(raw.allowed).length ? asArray(raw.allowed) : ['节奏', '结构', '爽点安排', '信息密度', '章节节拍', '情绪曲线'],
    cautious: asArray(raw.cautious).length ? asArray(raw.cautious) : ['人物功能', '设定机制', '资源经济模型'],
    forbidden: asArray(raw.forbidden).length ? asArray(raw.forbidden) : ['具体桥段', '专有设定', '原句', '角色名', '核心梗', '事件顺序'],
  }
}

export const getStoryState = (project: any) => project?.reference_config?.story_state || {}

export function getQualityGate(project: any) {
  return {
    enabled: project.reference_config?.quality_gate?.enabled !== false,
    min_score: Number(project.reference_config?.quality_gate?.min_score ?? project.reference_config?.approval_policy?.low_score_threshold ?? 78),
    max_critical_issues: Number(project.reference_config?.quality_gate?.max_critical_issues ?? 0),
    max_high_issues: Number(project.reference_config?.quality_gate?.max_high_issues ?? 1),
    block_on_safety: project.reference_config?.quality_gate?.block_on_safety !== false,
    require_revision_before_store: project.reference_config?.quality_gate?.require_revision_before_store !== false,
  }
}

export function getQualityGateDecision(project: any, review: any, safetyDecision: any = null) {
  const gate = getQualityGate(project)
  const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
  const criticalCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'critical').length
  const highCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'high').length
  const score = Number(review?.score || 0)
  const reasons = [
    score && score < gate.min_score ? `质检评分 ${score} 低于入库阈值 ${gate.min_score}` : '',
    gate.require_revision_before_store && review?.needs_revision && !review?.revised ? '自检要求修订，但当前没有可用修订稿' : '',
    criticalCount > gate.max_critical_issues ? `严重问题 ${criticalCount} 个超过上限 ${gate.max_critical_issues}` : '',
    highCount > gate.max_high_issues ? `高风险问题 ${highCount} 个超过上限 ${gate.max_high_issues}` : '',
    gate.block_on_safety && safetyDecision?.blocked ? `仿写安全未通过：${(safetyDecision.reasons || []).join('；')}` : '',
  ].filter(Boolean)
  return { gate, passed: !gate.enabled || reasons.length === 0, reasons, score, critical_count: criticalCount, high_count: highCount }
}

export function normalizeSceneProduction(sceneCards: any[] = [], previous: any[] = [], status = 'pending') {
  const byNo = new Map(previous.map((item: any) => [Number(item.scene_no || item.index || 0), item]))
  return sceneCards.map((card: any, index: number) => {
    const sceneNo = Number(card.scene_no || index + 1)
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
  return {
    ready: blockers.length === 0,
    strict_ready: checks.every(item => item.ok || item.severity === 'low'),
    checks,
    blockers,
    warnings,
    recent_state_entries: collectRecentFacts(reviews),
  }
}
