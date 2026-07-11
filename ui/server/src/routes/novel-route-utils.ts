export function parseJsonLikePayload(value: any) {
  if (!value) return null
  if (Array.isArray(value)) {
    const text = textFromOutputParts(value)
    return text ? parseJsonLikePayload(text) : value
  }
  if (typeof value === 'object') {
    const text = textFromContentValue(value)
    const parsedText = text ? parseJsonLikePayload(text) : null
    return parsedText && typeof parsedText === 'object' && !Array.isArray(parsedText) ? parsedText : value
  }
  const raw = String(value || '').trim()
  if (!raw) return null
  const baseCandidates = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''),
    raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || '',
    raw.match(/\{[\s\S]*\}/)?.[0] || '',
  ].filter(Boolean)
  const candidates = baseCandidates.flatMap(candidate => {
    const decoded = decodeEscapedJsonCandidate(candidate)
    return decoded ? [candidate, decoded] : [candidate]
  })
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next candidate
    }
  }
  return null
}

function decodeEscapedJsonCandidate(value: string) {
  const text = String(value || '').trim()
  if (!text || !/(\\")/.test(text)) return ''
  if (!/\\?"?(prose_chapters|chapter_text|revision_mode|replacements)\\?"?/.test(text)) return ''
  const decoded = text
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
  return decoded !== text ? decoded : ''
}

export function getNovelPayload(result: any) {
  const rawChoicesContent = result?.raw?.choices?.[0]?.message?.content
  const candidates = [
    result?.output,
    result?.parsed,
    result?.content,
    result?.raw?.content,
    result?.raw?.output_text,
    result?.raw?.response?.output_text,
    rawChoicesContent,
    extractLLMText(result),
  ]
  for (const candidate of candidates) {
    const payload = parseJsonLikePayload(candidate)
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload
  }
  for (const candidate of candidates) {
    const payload = recoverPartialProseJsonPayload(candidate)
    if (payload) return payload
  }
  return {}
}

function recoverPartialProseJsonPayload(value: any) {
  const raw = typeof value === 'string' ? value : textFromContentValue(value)
  if (!raw || !/chapter_text/.test(raw)) return null
  const baseCandidates = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''),
    raw.match(/```(?:json)?\s*([\s\S]*)/i)?.[1] || '',
  ].filter(Boolean)
  const candidates = baseCandidates.flatMap(candidate => {
    const decoded = decodeEscapedJsonCandidate(candidate)
    return decoded ? [candidate, decoded] : [candidate]
  })
  for (const candidate of candidates) {
    let partialJsonOpenStringRecovered = false
    let chapterText = readClosedJsonStringField(candidate, 'chapter_text')
    if (!chapterText) {
      chapterText = readOpenJsonStringField(candidate, 'chapter_text')
      partialJsonOpenStringRecovered = Boolean(chapterText)
    }
    if (!chapterText || chapterText.replace(/\s/g, '').length < 200) continue
    const chapterNo = readJsonNumberField(candidate, 'chapter_no') || readJsonNumberField(candidate, 'chapterNo')
    const title = readClosedJsonStringField(candidate, 'title')
    return {
      recovered_from_partial_json: true,
      partial_json_open_string_recovered: partialJsonOpenStringRecovered,
      chapter_text: chapterText,
      prose_chapters: [
        {
          ...(chapterNo ? { chapter_no: chapterNo } : {}),
          ...(title ? { title } : {}),
          chapter_text: chapterText,
        },
      ],
    }
  }
  return null
}

function readJsonNumberField(text: string, field: string) {
  const match = new RegExp(`"${field}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(text)
  return match ? Number(match[1]) : 0
}

function readClosedJsonStringField(text: string, field: string) {
  const regex = new RegExp(`"${field}"\\s*:\\s*"`, 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    const quoteIndex = match.index + match[0].length - 1
    const parsed = readClosedJsonStringAt(text, quoteIndex)
    if (parsed) return parsed
  }
  return ''
}

function readClosedJsonStringAt(text: string, quoteIndex: number) {
  if (text[quoteIndex] !== '"') return ''
  let escaped = false
  for (let i = quoteIndex + 1; i < text.length; i += 1) {
    const char = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      try {
        return JSON.parse(text.slice(quoteIndex, i + 1))
      } catch {
        return ''
      }
    }
  }
  return ''
}

function readOpenJsonStringField(text: string, field: string) {
  const regex = new RegExp(`"${field}"\\s*:\\s*"`, 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    const start = match.index + match[0].length
    let escaped = false
    for (let i = start; i < text.length; i += 1) {
      const char = text[i]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') return ''
    }
    let fragment = text.slice(start)
    if (escaped) fragment = fragment.slice(0, -1)
    return decodeJsonStringFragment(fragment)
  }
  return ''
}

function decodeJsonStringFragment(fragment: string) {
  const raw = String(fragment || '')
  if (!raw) return ''
  const safe = raw.replace(/[\u0000-\u001f]/g, char => {
    if (char === '\n') return '\\n'
    if (char === '\r') return '\\r'
    if (char === '\t') return '\\t'
    return ''
  })
  try {
    return JSON.parse(`"${safe}"`)
  } catch {
    return raw
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
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

function textFromContentValue(value: any) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return textFromOutputParts(value)
  if (value && typeof value === 'object') {
    if (Array.isArray(value.content)) return textFromOutputParts(value.content)
    return String(value.text || value.content || value.value || '')
  }
  return ''
}

export function extractLLMText(result: any) {
  const candidates = [
    textFromContentValue(result?.content),
    textFromContentValue(result?.raw?.content),
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
      preview: compactText(safeJsonStringify(chunk || {}, undefined, 500), 500),
    })),
  }
}

export const compactText = (value: any, limit = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
export const asArray = (value: any) => Array.isArray(value) ? value : []
export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export function compactPreviousChaptersForProse(chapters: any[] = [], targetChapterNo?: any, limit = 3) {
  const targetNo = Number(targetChapterNo || 0)
  return asArray(chapters)
    .filter(chapter => (!targetNo || Number(chapter?.chapter_no || 0) < targetNo) && String(chapter?.chapter_text || chapter?.chapterText || '').trim())
    .slice(-Math.max(1, Math.min(5, Number(limit || 3))))
    .map(chapter => {
      const chapterText = String(chapter.chapter_text || chapter.chapterText || '')
      const endingExcerpt = compactText(chapter.ending_excerpt || chapter.endingExcerpt || chapterText.slice(-800), 900)
      return {
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        chapter_summary: chapter.chapter_summary || chapter.summary || compactText(chapterText, 240),
        ending_hook: chapter.ending_hook || chapter.endingHook || '',
        ending_excerpt: endingExcerpt,
        chapter_text: endingExcerpt,
      }
    })
}

export const COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS = {
  narrative_person: '第三人称有限视角为主，紧贴主角即时判断；关键情绪段可短暂内心独白，避免全知解释。',
  sentence_length: '短中句为主，长句只用于高潮铺压；单段控制在2-4句，动作、反应、信息按快切推进。',
  dialogue_ratio: '35%-45%，对白承担冲突、信息差、笑点和推进，不写寒暄型对白。',
  banter_density: '中等偏高：紧张场景用短吐槽泄压，但不拆恐怖、战斗或悬疑张力。',
  payoff_density: '高密度：每800-1200字至少一次小爽点、反转、收获或信息差揭示，每章结尾保留升级钩子。',
  description_density: '低到中：环境描写只服务规则、危险、情绪和线索，避免静态大段铺陈。',
  chapter_word_range: '标准章3200-5200字；高潮、战斗、阶段收束可写8000-10000字长章。',
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
  const category = String(issue?.category || issue?.type || issue?.issue_type || issue?.label || issue?.key || 'general')
  const fix = String(issue?.fix || issue?.suggestion || issue?.suggested_fix || '')
  const sceneNo = Number(issue?.scene_no || issue?.sceneNo || 0)
  const fields = Array.isArray(issue?.fields) ? issue.fields.map((item: any) => String(item)).filter(Boolean) : []
  const location = String(issue?.location || issue?.segment || (sceneNo ? `场景${sceneNo}` : ''))
  const descriptionParts = [
    issue?.description || issue?.message || issue?.issue || issue?.reason || issue?.label || issue?.key || '',
    issue?.key && issue?.label ? issue.key : '',
    fields.length ? `字段：${fields.join('、')}` : '',
  ].filter(Boolean)
  return {
    severity: String(issue?.severity || issue?.status || 'medium'),
    type: category,
    category,
    location,
    evidence: Array.isArray(issue?.evidence) ? issue.evidence.map((item: any) => String(item)).join('；') : String(issue?.evidence || issue?.quote || ''),
    description: descriptionParts.join('｜'),
    fix,
    suggestion: fix,
  }
}

export function formatReviewIssueForStorage(issue: any) {
  const normalized = normalizeIssue(issue)
  return [
    normalized.severity || 'medium',
    normalized.category || normalized.type || 'general',
    normalized.location,
    normalized.description || String(issue || ''),
    normalized.evidence ? `证据：${normalized.evidence}` : '',
    normalized.fix ? `修法：${normalized.fix}` : '',
  ].filter(Boolean).join('｜')
}

export function sanitizeJsonValue(value: any, options: { maxDepth?: number; maxArrayLength?: number; maxObjectKeys?: number } = {}, seen = new WeakSet<object>(), depth = 0): any {
  const maxDepth = options.maxDepth ?? 24
  const maxArrayLength = options.maxArrayLength ?? 200
  const maxObjectKeys = options.maxObjectKeys ?? 200
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= maxDepth) return '[MaxDepth]'
  seen.add(value)
  if (Array.isArray(value)) {
    const items = value.slice(0, maxArrayLength).map(item => sanitizeJsonValue(item, options, seen, depth + 1))
    if (value.length > maxArrayLength) items.push(`[Truncated ${value.length - maxArrayLength} items]`)
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  const entries = Object.entries(value).slice(0, maxObjectKeys)
  for (const [key, item] of entries) output[key] = sanitizeJsonValue(item, options, seen, depth + 1)
  const extraKeyCount = Object.keys(value).length - entries.length
  if (extraKeyCount > 0) output.__truncated_keys = extraKeyCount
  seen.delete(value)
  return output
}

export function safeJsonStringify(value: any, space?: number, maxChars = 8000) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value), null, space)
    if (text === undefined) return 'null'
    return maxChars > 0 && text.length > maxChars ? text.slice(0, maxChars) : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

function isMergeableObject(value: any) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function deepMergeObjects(base: any, override: any): any {
  if (!isMergeableObject(override)) return base
  const seen = new WeakSet<object>()
  const merge = (currentBase: any, currentOverride: any, depth = 0): any => {
    if (!isMergeableObject(currentOverride)) return sanitizeJsonValue(currentOverride)
    if (seen.has(currentOverride)) return '[Circular]'
    if (depth >= 24) return sanitizeJsonValue(currentOverride, { maxDepth: 2 })
    seen.add(currentOverride)
    const next = isMergeableObject(currentBase) ? { ...sanitizeJsonValue(currentBase) } : {}
    for (const [key, value] of Object.entries(currentOverride)) {
      if (value && typeof value === 'object' && seen.has(value)) {
        next[key] = '[Circular]'
      } else if (isMergeableObject(value) && isMergeableObject(currentBase?.[key])) {
        next[key] = merge(currentBase[key], value, depth + 1)
      } else {
        next[key] = sanitizeJsonValue(value)
      }
    }
    seen.delete(currentOverride)
    return next
  }
  return merge(base, override)
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

const QUALITY_GATE_STRUCTURED_CHECK_FIELDS = [
  ['platform_checks', 'platformChecks'],
  ['content_rubric_checks', 'contentRubricChecks'],
  ['target_reader_checks', 'targetReaderChecks'],
  ['genre_positioning_checks', 'genrePositioningChecks'],
  ['upgrade_rhythm_checks', 'upgradeRhythmChecks'],
  ['conflict_structure_checks', 'conflictStructureChecks'],
  ['deslop_checks', 'deslopChecks'],
  ['prose_meta_checks', 'proseMetaChecks'],
  ['dialogue_checks', 'dialogueChecks'],
  ['plot_dynamics_checks', 'plotDynamicsChecks'],
  ['continuity_heat_checks', 'continuityHeatChecks'],
  ['character_relation_checks', 'characterRelationChecks'],
  ['character_behavior_checks', 'characterBehaviorChecks'],
  ['asset_linkage_checks', 'assetLinkageChecks'],
  ['state_tracking_checks', 'stateTrackingChecks'],
  ['source_readiness_checks', 'sourceReadinessChecks'],
  ['intent_confirmation_checks', 'intentConfirmationChecks'],
  ['benchmark_recall_checks', 'benchmarkRecallChecks'],
  ['information_flow_checks', 'informationFlowChecks'],
  ['expectation_threshold_checks', 'expectationThresholdChecks'],
  ['story_loop_checks', 'storyLoopChecks'],
  ['emotional_arc_checks', 'emotionalArcChecks'],
  ['chapter_hook_checks', 'chapterHookChecks'],
  ['paragraph_hook_checks', 'paragraphHookChecks'],
  ['suspense_checks', 'suspenseChecks'],
  ['reversal_checks', 'reversalChecks'],
  ['opening_checks', 'openingChecks'],
  ['prose_craft_checks', 'proseCraftChecks'],
  ['punctuation_tone_checks', 'punctuationToneChecks'],
  ['quality_audit_checks', 'qualityAuditChecks'],
  ['revision_receipt_checks', 'revisionReceiptChecks'],
  ['deslop_repair_checks', 'deslopRepairChecks'],
]

const QUALITY_GATE_STRUCTURED_CHECK_LABELS: Record<string, string> = {
  platform_checks: '平台检查',
  content_rubric_checks: '内容基准',
  target_reader_checks: '目标读者',
  genre_positioning_checks: '题材定位',
  upgrade_rhythm_checks: '升级节奏',
  conflict_structure_checks: '冲突结构',
  deslop_checks: '去AI味',
  prose_meta_checks: '正文元信息',
  dialogue_checks: '对白质量',
  plot_dynamics_checks: '剧情动力',
  continuity_heat_checks: '连续性热度',
  character_relation_checks: '角色关系',
  character_behavior_checks: '角色行为',
  asset_linkage_checks: '资产挂钩',
  state_tracking_checks: '状态跟踪',
  source_readiness_checks: '来源就绪',
  intent_confirmation_checks: '意图确认',
  benchmark_recall_checks: '文风召回',
  information_flow_checks: '信息流',
  expectation_threshold_checks: '期待阈值',
  story_loop_checks: '故事循环',
  emotional_arc_checks: '情绪弧',
  chapter_hook_checks: '章级钩子',
  paragraph_hook_checks: '段落钩子',
  suspense_checks: '悬念编排',
  reversal_checks: '反转设计',
  opening_checks: '开篇设计',
  prose_craft_checks: '正文工艺',
  punctuation_tone_checks: '语气标点',
  quality_audit_checks: '质量诊断',
  revision_receipt_checks: '修订回执',
  deslop_repair_checks: '去AI味修复回执',
  deslop_gate_diagnostics: '去AI味门禁',
}

function structuredReviewCheckSummary(check: any, field: string) {
  return compactText(
    check?.label
    || check?.key
    || check?.name
    || QUALITY_GATE_STRUCTURED_CHECK_LABELS[field]
    || field
    || '结构化自检失败',
    80,
  )
}

function isPostRepairCarryOverStructuredCheck(check: any, field: string) {
  const status = String(check?.status || '').toLowerCase()
  if (status !== 'fail') return false
  const key = String(check?.key || '').trim()
  const syncKey = String(check?.sync_key || check?.syncKey || '').trim()
  const label = compactText(check?.label || check?.name || '', 120)
  const evidence = compactText(check?.evidence || check?.summary || check?.reason || '', 240)
  const fix = compactText(check?.fix || check?.suggestion || '', 240)
  const remainingRisk = compactText(check?.remaining_risk || check?.remainingRisk || check?.risk || '', 240)
  const text = [key, syncKey, label, evidence, fix, remainingRisk].filter(Boolean).join('；')
  const postRepairCarryOver = /轻度|残留|下一章|下一轮|下一次|后续|继续|继续压|非阻塞|仍需|未完全|下轮|同步|写入|追踪|台账|状态/.test(text)
  const evidenceLocationMiss = /changed_evidence|changedEvidence|旧回执|证据片段|无法定位到修订后正文|定位不到修订后正文|证据未落在|evidence\s*未落在/i.test(text)
  const postDeliverySyncLike = postRepairCarryOver
    || evidenceLocationMiss
    || /状态写回|状态同步|资产状态|角色状态|增量缺口|台账|追踪|文档|入库|后续需|需同步|需要同步/.test(text)
  const hardCurrentFailure = /正文(?:没有|缺少|未写出|没有写出|未呈现|没有呈现|未兑现|没有兑现)|没有执行|未执行|未落成正文|没有落成正文/.test(text)
  const hardProofFailure = /无法证明|证据不足/.test(text) && !evidenceLocationMiss && !postDeliverySyncLike
  const deslopGateSignal = /Gate\s*(?:A|C|D|E|F|G)|章末总结体|模板表达|解释腔|上帝视角|AI味硬伤|禁用词/.test(text)
  const deslopResidualSignal = /仍残留|仍有|仍存在|仍未|未消除|没有消除|未修掉|未修复|未清理|正文仍|正文有|正文出现|硬伤仍|依然|残留风险/.test(text)
  const hardDeslopFailure = deslopGateSignal && deslopResidualSignal
  const hardBenchmarkSourceMissing = /source_paths_missing|missing_primary_contract|profile_missing|module_missing|rhythm_missing|来源缺失|文风召回来源缺失/i.test(text)
  if (/未生成|缺少|missing/i.test(key)) return false
  if (/未生成|没有输出|无可用/.test(text)) return false
  if (hardBenchmarkSourceMissing) return false
  if (/缺少|缺失/.test(text) && !postDeliverySyncLike && key !== 'pre_store_structural_sync') return false
  if (hardCurrentFailure || hardProofFailure) return false
  if (key === 'pre_store_structural_sync') return true
  if (key === 'revision_cascade_impact_evidence') return true
  if (key === 'quality_audit_repair_receipt_sync') return true
  if ((key === 'benchmark_recall_sync' || syncKey === 'benchmark_recall_sync' || field === 'benchmark_recall_checks') && postRepairCarryOver) return true
  if (key === 'prose_revision_receipt_sync' && postRepairCarryOver) return true
  if (key === 'deslop_repair_receipt_sync' && (postRepairCarryOver || evidenceLocationMiss) && !hardDeslopFailure) return true
  if (field === 'quality_audit_checks' && /_sync$/.test(syncKey)) return true
  return false
}

function collectFailedStructuredReviewChecks(review: any, options: { requireCarryOverEvidence?: boolean } = {}) {
  const directChecks = QUALITY_GATE_STRUCTURED_CHECK_FIELDS
    .flatMap(([snakeField, camelField]) => asArray(review?.[snakeField] || review?.[camelField])
      .map((check: any) => ({ check, field: snakeField })))
  const diagnostics = review?.deslop_gate_diagnostics || review?.deslopGateDiagnostics || {}
  const diagnosticGates = asArray(diagnostics?.gates)
    .map((check: any) => ({ check, field: 'deslop_gate_diagnostics' }))
  return [...directChecks, ...diagnosticGates]
    .filter((item: any) => String(item?.check?.status || '').toLowerCase() === 'fail')
    .filter((item: any) => {
      if (!isPostRepairCarryOverStructuredCheck(item.check, item.field)) return true
      if (!options.requireCarryOverEvidence) return false
      return !compactText(
        item?.check?.evidence
        || item?.check?.changed_evidence
        || item?.check?.changedEvidence
        || item?.check?.source_evidence
        || item?.check?.sourceEvidence
        || item?.check?.source_excerpt
        || item?.check?.sourceExcerpt
        || '',
        240,
      )
    })
    .map((item: any) => structuredReviewCheckSummary(item.check, item.field))
    .filter(Boolean)
}

function collectUndeliveredDeliveryRiskReceipts(review: any) {
  return asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
    .filter((receipt: any) => {
      const remainingRisk = compactText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk || '', 120)
      const normalizedRemainingRisk = remainingRisk.toLowerCase()
      const hasRemainingRisk = Boolean(remainingRisk) && !['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalizedRemainingRisk)
      if (!(receipt?.delivered === false || hasRemainingRisk)) return false
      return !isPostDeliveryOnlyDeliveryRiskReceipt(receipt, remainingRisk)
    })
    .map((receipt: any) => compactText(
      receipt?.risk_item
      || receipt?.riskItem
      || receipt?.required_action
      || receipt?.requiredAction
      || receipt?.remaining_risk
      || receipt?.remainingRisk
      || '上一章承接风险未兑现',
      80,
    ))
    .filter(Boolean)
}

function isPostDeliveryOnlyDeliveryRiskReceipt(receipt: any, remainingRisk = '') {
  const evidence = compactText(
    receipt?.evidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
    240,
  )
  if (!evidence) return false
  const risk = compactText(remainingRisk || receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk || '', 240)
  if (!risk) return false
  if (/正文(没有|未|缺少)|无法证明|证据不足|未落成正文|没有落成正文/.test(risk)) return false
  const qualityContinuationCarryOver = /承接回执缺失：(?:补追读|修吸引力|补循环|补期待|补故事力|补章末交接)|漏追读|吸引力缺口|故事循环缺口|期待欠账|故事力缺口/.test(risk)
  if (qualityContinuationCarryOver) return true
  return /(?:资产台账|资产文档|状态更新|状态写回|追踪\/|追踪\\|追踪\/|追踪|伏笔\.md|时间线\.md|角色状态|资产状态|文档|台账|入库|后续需|后续|下一章|下一轮|下轮|状态同步|同步状态|同步资产|需同步|需要同步|需更新|需要更新|写回状态|补更强|evidence\s*未落在|证据未落在)/i.test(risk)
}

function hasUsableNextChapterQualityPlan(review: any) {
  const deliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const plan = review?.next_chapter_quality_plan
    || review?.nextChapterQualityPlan
    || deliveryReceipts?.next_chapter_quality_plan
    || deliveryReceipts?.nextChapterQualityPlan
    || null
  if (!plan || typeof plan !== 'object') return false
  const qualityFocus = asArray(plan?.quality_focus || plan?.qualityFocus)
  const openingActions = asArray(plan?.opening_actions || plan?.openingActions)
  const middleActions = asArray(plan?.middle_actions || plan?.middleActions)
  const endingActions = asArray(plan?.ending_actions || plan?.endingActions)
  const avoidRepetition = asArray(plan?.avoid_repetition || plan?.avoidRepetition)
  const evidenceBasis = asArray(plan?.evidence_basis || plan?.evidenceBasis)
  return [
    qualityFocus,
    openingActions,
    middleActions,
    endingActions,
    avoidRepetition,
    evidenceBasis,
  ].every(items => items.some((item: any) => compactText(item, 120)))
}

function dedupeQualityHardFailures(items: any[]) {
  const seen = new Set<string>()
  return asArray(items)
    .filter((item: any) => {
      const message = compactText(typeof item === 'string' ? item : item?.message || item?.key || '', 240)
      if (!message) return false
      const key = compactText(typeof item === 'object' ? item?.key : '', 80) || 'quality_gate'
      const signature = `${key}\u0000${message}`
      if (seen.has(signature)) return false
      seen.add(signature)
      return true
    })
}

export function getQualityGateDecision(project: any, review: any, safetyDecision: any = null) {
  const gate = getQualityGate(project)
  const v2Decision = review?.prose_quality_v2?.decision || null
  const failedStructuredChecks = collectFailedStructuredReviewChecks(review, {
    requireCarryOverEvidence: Boolean(v2Decision),
  })
  const undeliveredDeliveryRiskReceipts = collectUndeliveredDeliveryRiskReceipts(review)
  const missingNextChapterQualityPlan = !hasUsableNextChapterQualityPlan(review)
  const safetyReasons = safetyDecision?.blocked
    ? [`仿写安全未通过：${(safetyDecision.reasons || []).join('；')}`]
    : []
  if (v2Decision) {
    const supplementalHardFailures = [
      ...failedStructuredChecks.map(message => ({
        key: 'structured_quality_gate',
        message: `结构化自检失败：${message}`,
        source: 'deterministic',
      })),
      ...undeliveredDeliveryRiskReceipts.map(message => ({
        key: 'delivery_risk_receipt',
        message: `承接回执未兑现：${message}`,
        source: 'deterministic',
      })),
      ...(missingNextChapterQualityPlan
        ? [{
            key: 'next_chapter_quality_plan',
            message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan',
            source: 'deterministic',
          }]
        : []),
      ...safetyReasons.map(message => ({
        key: 'reference_safety',
        message,
        source: 'deterministic',
      })),
    ]
    const hardFailures = dedupeQualityHardFailures([
      ...asArray(v2Decision.hard_failures),
      ...supplementalHardFailures,
    ])
    return {
      ...v2Decision,
      gate,
      hard_failures: hardFailures,
      passed: v2Decision.passed === true && hardFailures.length === 0,
      approvable: v2Decision.approvable === true && hardFailures.length === 0,
      reasons: [
        ...hardFailures
          .map((item: any) => typeof item === 'string' ? item : item?.message || item?.key)
          .filter(Boolean),
        ...asArray(v2Decision.advisory_failures)
          .map((item: any) => item?.message || item?.key || item)
          .filter(Boolean),
      ],
    }
  }
  const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
  const criticalCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'critical').length
  const highCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'high').length
  const score = Number(review?.score || 0)
  const reasons = [
    score && score < gate.min_score ? `质检评分 ${score} 低于入库阈值 ${gate.min_score}` : '',
    gate.require_revision_before_store && review?.needs_revision && !review?.revised ? '自检要求修订，但当前没有可用修订稿' : '',
    criticalCount > gate.max_critical_issues ? `严重问题 ${criticalCount} 个超过上限 ${gate.max_critical_issues}` : '',
    highCount > gate.max_high_issues ? `高风险问题 ${highCount} 个超过上限 ${gate.max_high_issues}` : '',
    failedStructuredChecks.length ? `结构化自检失败 ${failedStructuredChecks.length} 项：${failedStructuredChecks.slice(0, 5).join('；')}` : '',
    undeliveredDeliveryRiskReceipts.length ? `承接回执未兑现 ${undeliveredDeliveryRiskReceipts.length} 项：${undeliveredDeliveryRiskReceipts.slice(0, 5).join('；')}` : '',
    missingNextChapterQualityPlan ? '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan，包含质量目标、开篇/中段/章末动作、禁用重复和证据依据' : '',
    gate.block_on_safety && safetyDecision?.blocked ? `仿写安全未通过：${(safetyDecision.reasons || []).join('；')}` : '',
  ].filter(Boolean)
  return { gate, passed: !gate.enabled || reasons.length === 0, reasons, score, critical_count: criticalCount, high_count: highCount }
}

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
