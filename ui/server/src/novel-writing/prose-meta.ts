import { countProseChars } from './word-target'

const PROSE_META_TERM_PATTERN = /第[一二三四五六七八九十百千万两0-9]+章|上一章|上章|前一章|本章|这一章|前文|后文|伏笔|细纲|读者/g

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function isLikelyInWorldChapterTextReference(line: string, term: string) {
  const evidence = String(line || '')
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^第[一二三四五六七八九十百千万两0-9]+章$/.test(term) && new RegExp(`《[^》]{1,40}》\\s*${escapedTerm}`).test(evidence)) return true
  if (!/^(第[一二三四五六七八九十百千万两0-9]+章|这一章|本章)$/.test(term)) return false
  return /(翻到|翻开|读到|看到|查到|指着|写着|记着|目录|书页|卷宗|档案|册子|抄本|碑文|条文)/.test(evidence)
}

export function scanProseMetaLeaks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; term: string; line: number; status: 'warn'; evidence: string; fix: string }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    PROSE_META_TERM_PATTERN.lastIndex = 0
    const terms = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = PROSE_META_TERM_PATTERN.exec(evidence))) {
      terms.add(match[0])
    }
    for (const term of terms) {
      if (isLikelyInWorldChapterTextReference(evidence, term)) continue
      hits.push({
        key: `meta_${term}`,
        label: '正文元信息扫描',
        term,
        line: index + 1,
        status: 'warn',
        evidence,
        fix: `将“${term}”改成角色当下能感知的事件锚点或相对时间；只有故事世界内真实讨论文本/读者身份时才保留。`,
      })
    }
  })
  return hits
}

const MODEL_DEGENERATION_TERMINAL_PUNCTUATION = /[。！？!?；;」』”’）】》]$/
const MODEL_DEGENERATION_TIER1_META_PATTERN = /细纲|情节点|卷纲|功能标签|目标情绪|字数目标|章首钩子|章尾钩子|任务描述/g
const MODEL_DEGENERATION_TIER2_META_PATTERN = /第[一二三四五六七八九十百千万两0-9]+章|本章|这一章|上一章|下一章|上章|下章|前一章|后一章|前文|后文|伏笔|读者/g
const MODEL_DEGENERATION_PLACEHOLDER_PATTERNS = [
  { type: 'ai_self_reference', pattern: /作为(一个)?(AI|人工智能|大?语言模型|智能助手|聊天助手)(?=[，,。、；;：:！!？?\s）)」』"】]|我|无法|不能|没法|$)/ },
  { type: 'generation_refusal', pattern: /我(无法|不能)(继续(写|创作|生成|下去)|生成(内容|文本|正文)?|创作|续写|完成(这个|本)?(章|篇|创作|请求))/ },
  { type: 'placeholder', pattern: /[（(](此处|以下|这里|下文|后续)?\s*(省略|略)(去|过)?[^）)]{0,10}[）)]|未完待续|TODO|占位符|placeholder/ },
  { type: 'garbled_text', pattern: /�/ },
  { type: 'english_ai_voice', pattern: /^(Sure|Certainly|Here'?s|As an AI|I (?:cannot|can't|am unable|apologize))/ },
]

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n')
}

function splitProseSentences(text: string) {
  return (proseBodyWithoutTitleLine(text).replace(/\s+/g, '').match(/[^。！？!?]+[。！？!?]?/g) || [])
    .map(sentence => sentence.trim())
    .filter(sentence => countProseChars(sentence) >= 4)
}

function isLikelyDialogueOnlyLine(line: string) {
  const text = String(line || '').trim()
  return /^["“「『].*["”」』]$/.test(text)
}

function normalizeDegenerationRepeatText(text: string) {
  return String(text || '')
    .replace(/[“”"「」『』（）()《》【】\s]/g, '')
    .trim()
}

export function scanModelDegenerationRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{
    key: string
    label: string
    type: string
    severity: 'blocking' | 'advisory'
    status: 'warn'
    evidence: string
    fix: string
    line: number
  }> = []
  const bodyRows = lines
    .map((line, index) => ({ line: String(line || ''), evidence: String(line || '').trim(), index }))
    .filter(row => row.evidence && !(row.index === firstContentLine && isLikelyChapterTitleLine(row.line)))

  const sentences = splitProseSentences(bodyRows.map(row => row.evidence).join('\n'))
    .map(sentence => normalizeDegenerationRepeatText(sentence))
    .filter(sentence => countProseChars(sentence) >= 12)
  const sentenceCounts = new Map<string, number>()
  for (const sentence of sentences) sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1)
  const repeatedSentence = Array.from(sentenceCounts.entries()).find(([, count]) => count >= 3)
  if (repeatedSentence) {
    hits.push({
      key: 'model_repetition_sentence',
      label: '模型退化扫描',
      type: 'repetition',
      severity: 'blocking',
      status: 'warn',
      evidence: repeatedSentence[0],
      fix: '重写受影响段落：删除复读/打转句，把同一信息改成一次有效动作、一次新信息或一次状态变化。',
      line: 0,
    })
  }

  for (let index = 1; index < bodyRows.length; index += 1) {
    const previous = normalizeDegenerationRepeatText(bodyRows[index - 1].evidence)
    const current = normalizeDegenerationRepeatText(bodyRows[index].evidence)
    if (!previous || previous !== current || countProseChars(current) < 8) continue
    hits.push({
      key: `model_repetition_adjacent_line_${bodyRows[index].index + 1}`,
      label: '模型退化扫描',
      type: 'repetition',
      severity: 'blocking',
      status: 'warn',
      evidence: bodyRows[index].evidence,
      fix: '重写受影响段落：相邻整行复读属于模型打转，保留一次有效信息，其余改成新的动作推进或删除。',
      line: bodyRows[index].index + 1,
    })
    break
  }

  const lastRow = bodyRows[bodyRows.length - 1]
  if (lastRow && countProseChars(lastRow.evidence) >= 4 && !MODEL_DEGENERATION_TERMINAL_PUNCTUATION.test(lastRow.evidence)) {
    hits.push({
      key: `model_truncation_line_${lastRow.index + 1}`,
      label: '模型退化扫描',
      type: 'truncation',
      severity: 'blocking',
      status: 'warn',
      evidence: lastRow.evidence,
      fix: '重写受影响段落：正文末尾疑似中途截断，补成完整动作、信息变化和章尾承接后再入库。',
      line: lastRow.index + 1,
    })
  }

  for (const row of bodyRows) {
    for (const item of MODEL_DEGENERATION_PLACEHOLDER_PATTERNS) {
      if (!item.pattern.test(row.evidence)) continue
      hits.push({
        key: `model_${item.type}_line_${row.index + 1}`,
        label: '模型退化扫描',
        type: item.type,
        severity: isLikelyDialogueOnlyLine(row.evidence) ? 'advisory' : 'blocking',
        status: 'warn',
        evidence: row.evidence,
        fix: '重写受影响段落：删除 AI 自指、拒绝语、占位符或乱码，只保留故事世界内可感知的动作和信息。',
        line: row.index + 1,
      })
    }

    const tier1Terms = Array.from(row.evidence.matchAll(MODEL_DEGENERATION_TIER1_META_PATTERN)).map(match => match[0])
    const tier2Terms = Array.from(row.evidence.matchAll(MODEL_DEGENERATION_TIER2_META_PATTERN)).map(match => match[0])
    const terms = Array.from(new Set([...tier1Terms, ...tier2Terms]))
      .filter(term => !isLikelyInWorldChapterTextReference(row.evidence, term))
    if (!terms.length) continue
    const tier1TermSet = new Set(tier1Terms)
    const hasTier1 = terms.some(term => tier1TermSet.has(term))
    hits.push({
      key: `model_engineering_meta_line_${row.index + 1}`,
      label: '模型退化扫描',
      type: 'engineering_meta',
      severity: hasTier1 && !isLikelyDialogueOnlyLine(row.evidence) ? 'blocking' : 'advisory',
      status: 'warn',
      evidence: row.evidence,
      fix: `重写受影响段落：把 ${terms.join('、')} 等写作工程词改成角色当下能感知的事件锚点、物件状态、相对时间或对话信息。`,
      line: row.index + 1,
    })
  }

  return hits
}

export function buildProseMetaSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const missed = scanProseMetaLeaks(chapterText).map((item: any) => ({
    ...item,
    text: item.evidence,
    expected: item.fix,
    delivered: false,
    status: 'warn',
  }))
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, missedCount ? 100 - missedCount * 18 : 92))
  const status = missedCount > 0 ? 'warn' : 'ok'

  return {
    report_id: `prose-meta-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '正文元信息 OK' : `正文元信息缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '正文标题行以外没有发现上一章、本章、伏笔、细纲、读者等作者视角元信息。'
      : `正文有 ${missedCount} 处作者视角元信息，需要改成角色当下能感知的事件锚点或相对时间。`,
    missed_count: missedCount,
    priority_repair: missedCount > 0 ? '优先修正文元信息' : '',
    planned_count: missedCount,
    delivered_count: status === 'ok' ? 1 : 0,
    planned: missed,
    delivered: status === 'ok'
      ? [{
          key: 'prose_meta_clean',
          label: '正文元信息扫描',
          text: '标题行以外无工程词/作者视角元信息',
          expected: '标题行以外无工程词/作者视角元信息',
          delivered: true,
          status: 'ok',
        }]
      : [],
    missed,
    next_actions: status === 'ok'
      ? ['保持正文元信息清洁：标题行以外不要出现上一章、本章、前文、后文、伏笔、细纲、读者等工程词。']
      : [
          '下一章必须修正文元信息：把“上一章/本章/前文/后文/伏笔/细纲/读者/第X章”等改成角色当下能感知的事件锚点或相对时间。',
          '只有角色在故事世界内真实讨论文本、章节或读者身份时才保留相关词。',
        ],
  }
}
