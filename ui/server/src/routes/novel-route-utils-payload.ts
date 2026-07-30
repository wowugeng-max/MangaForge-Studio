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
    let chapterText = pickLongestText([
      readClosedJsonStringField(candidate, 'chapter_text'),
      recoverStructuredJsonStringField(candidate, 'chapter_text'),
    ])
    if (compactLen(chapterText) < 200) {
      const openText = readOpenJsonStringField(candidate, 'chapter_text')
      if (compactLen(openText) > compactLen(chapterText)) {
        chapterText = openText
        partialJsonOpenStringRecovered = Boolean(openText)
      }
    }
    if (!chapterText || compactLen(chapterText) < 200) continue
    const chapterNo = readJsonNumberField(candidate, 'chapter_no') || readJsonNumberField(candidate, 'chapterNo')
    const title = readClosedJsonStringField(candidate, 'title') || recoverStructuredJsonStringField(candidate, 'title')
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

function compactLen(value: string) {
  return String(value || '').replace(/\s/g, '').length
}

function pickLongestText(values: Array<string | null | undefined>) {
  return values
    .map(value => String(value || ''))
    .sort((left, right) => right.length - left.length)[0] || ''
}

function readJsonNumberField(text: string, field: string) {
  const match = new RegExp(`"${field}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(text)
  return match ? Number(match[1]) : 0
}

function readClosedJsonStringField(text: string, field: string) {
  const regex = new RegExp(`"${field}"\\s*:\\s*"`, 'g')
  let match: RegExpExecArray | null
  let best = ''
  while ((match = regex.exec(text))) {
    const quoteIndex = match.index + match[0].length - 1
    const parsed = readClosedJsonStringAt(text, quoteIndex)
    if (parsed && parsed.length > best.length) best = parsed
  }
  return best
}

function recoverStructuredJsonStringField(text: string, field: string) {
  const regex = new RegExp(`"${field}"\\s*:\\s*"`, 'g')
  let match: RegExpExecArray | null
  let best = ''
  while ((match = regex.exec(text))) {
    const start = match.index + match[0].length
    const rest = text.slice(start)
    const endRegex = /"(?:\s*,\s*"(?:scene_breakdown|continuity_notes|expansion_blueprint_patch|chapter_summary|chapter_no|title|chapter_text)"|\s*\}\s*(?:,|\]|$)|\s*\]\s*(?:,|\}|$))/g
    const endMatch = endRegex.exec(rest)
    // First structural terminator is the chapter_text closer; later JSON fields can look similar.
    if (!endMatch) continue
    const decoded = decodeJsonStringFragment(rest.slice(0, endMatch.index))
    if (decoded.length > best.length) best = decoded
  }
  return best
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
      const slice = text.slice(quoteIndex, i + 1)
      try {
        return JSON.parse(slice)
      } catch {
        // Closed-but-invalid JSON strings (raw newlines / bad escapes) still carry prose.
        return decodeJsonStringFragment(text.slice(quoteIndex + 1, i))
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
