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

export const compactText = (value: any, limit = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
export const asArray = (value: any) => Array.isArray(value) ? value : []
export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

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
  const targetLength = raw.chapter_word_range || raw.target_length || (
    project.length_target === 'long' ? '4000-6000字' : project.length_target === 'short' ? '1500-2500字' : '2500-4000字'
  )
  return {
    narrative_person: raw.narrative_person || raw.narrative_style || ((project.style_tags || []).join('、') || '保持当前项目文风'),
    sentence_length: raw.sentence_length || '中等句长，长短句交替',
    dialogue_ratio: raw.dialogue_ratio || '对话驱动，描写为辅',
    banter_density: raw.banter_density || '跟随当前项目风格',
    payoff_density: raw.payoff_density || '每章至少一个明确爽点/信息推进',
    description_density: raw.description_density || '关键场景给足氛围，非关键场景压缩',
    chapter_word_range: targetLength,
    banned_words: asArray(raw.banned_words),
    preferred_words: asArray(raw.preferred_words),
    ending_policy: raw.ending_policy || '结尾必须到达本章 ending_hook，并留下下一章入口',
    banned_shortcuts: asArray(raw.banned_shortcuts).length ? asArray(raw.banned_shortcuts) : ['时间过得很快', '几天后', '一切都结束了', '突然就明白了'],
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
    { key: 'no_repeat', ok: repeatedWarnings.length === 0, severity: 'low', label: '禁止重复信息', fix: '清理 story_state.recent_repeated_information 或调整本章信息增量。' },
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
