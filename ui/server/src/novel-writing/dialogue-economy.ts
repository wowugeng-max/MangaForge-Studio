import { countProseChars } from './word-target'

const FACE_SLAP_PAYOFF_PATTERN = /(?:当众)?打脸|反证|翻盘|洗清|真相(?:公开|揭开|曝光|大白)|栽赃失败|证据(?:摆|甩|摊开|公开|曝光)|(?:检测|鉴定|审计|验伤|转账|亲子鉴定)?报告|录音|监控|视频|截图|账册|旧账册/
const DIALOGUE_SHORT_ANTAGONIST_PRESSURE_PATTERN = /你输了|解释(?:也)?没用|认罪|交出|跪下|废物|旧账册|证据呢|拿出证据|凭什么|不可能|闭嘴/
const DIALOGUE_PROTAGONIST_EVIDENCE_EXPLANATION_PATTERN = /(?:我|监控|账册|账本|录音|检测报告|鉴定报告|报告|转账截图|截图|旧印|编号|证据|证明|反证|因为|所以|足够|不是我)/

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n').trim()
}

function paragraphHasFaceSlapPayoff(paragraph: string) {
  FACE_SLAP_PAYOFF_PATTERN.lastIndex = 0
  return FACE_SLAP_PAYOFF_PATTERN.test(String(paragraph || ''))
}

function extractStandaloneDialogueQuote(line: string) {
  const evidence = String(line || '').trim()
  const match = evidence.match(/^[“"「]([^”"」]+)[”"」][。！？!?，,；;：:]?$/)
  return match ? String(match[1] || '').trim() : ''
}

export function scanDialogueDensityRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const rows = lines
    .map((line, index) => {
      const evidence = String(line || '').trim()
      if (!evidence) return null
      if (index === firstContentLine && isLikelyChapterTitleLine(evidence)) return null
      if (/^#{1,6}\s*\S+/.test(evidence) || /^第[一二三四五六七八九十百千万两0-9]+章/.test(evidence)) return null
      const quote = extractStandaloneDialogueQuote(evidence)
      return {
        line: index + 1,
        evidence,
        quote,
        textChars: countProseChars(evidence),
        dialogueChars: quote ? countProseChars(quote) : 0,
      }
    })
    .filter(Boolean) as Array<{ line: number; evidence: string; quote: string; textChars: number; dialogueChars: number }>

  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let start = 0; start < rows.length; start += 1) {
    let dialogueChars = 0
    let totalChars = 0
    let dialogueLines = 0
    for (let end = start; end < rows.length && end < start + 14; end += 1) {
      const row = rows[end]
      totalChars += row.textChars
      dialogueChars += row.dialogueChars
      if (row.quote) dialogueLines += 1
      const windowSize = end - start + 1
      if (windowSize < 6 || dialogueLines < 5 || dialogueChars < 180 || totalChars < 220) continue
      const ratio = dialogueChars / Math.max(1, totalChars)
      if (ratio <= 0.58) continue
      hits.push({
        key: `dialogue_density_lines_${rows[start].line}_${row.line}`,
        label: '对白篇幅控制扫描',
        status: 'warn',
        evidence: `对白占比 ${Math.round(ratio * 100)}%，连续对白 ${dialogueLines} 行：${compactBriefText(rows.slice(start, end + 1).map(item => item.evidence).join(' / '), 240)}`,
        fix: '按 oh-story 对话篇幅控制重写：单次对话不超过全节 40%；把信息揭示、态度变化和剧情推动拆进动作、环境变化、证据触发、心理判断或角色反应，避免整段像台词稿。',
        line: rows[start].line,
      })
      return hits
    }
  }
  return hits
}

function isShortAntagonistPressureLine(quote: string) {
  const text = String(quote || '').trim()
  DIALOGUE_SHORT_ANTAGONIST_PRESSURE_PATTERN.lastIndex = 0
  return countProseChars(text) <= 28 && DIALOGUE_SHORT_ANTAGONIST_PRESSURE_PATTERN.test(text)
}

function isLongProtagonistEvidenceExplanationLine(quote: string) {
  const text = String(quote || '').trim()
  DIALOGUE_PROTAGONIST_EVIDENCE_EXPLANATION_PATTERN.lastIndex = 0
  return countProseChars(text) >= 42 && DIALOGUE_PROTAGONIST_EVIDENCE_EXPLANATION_PATTERN.test(text)
}

export function scanDialogueProtagonistLineEconomyRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  if (!body || !paragraphHasFaceSlapPayoff(body)) return []
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const dialogueRows = lines
    .map((line, index) => {
      if (index === firstContentLine && isLikelyChapterTitleLine(line)) return null
      const quote = extractStandaloneDialogueQuote(line)
      if (!quote) return null
      return {
        line: index + 1,
        quote,
        evidence: String(line || '').trim(),
        length: countProseChars(quote),
        shortPressure: isShortAntagonistPressureLine(quote),
        longEvidenceExplanation: isLongProtagonistEvidenceExplanationLine(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; length: number; shortPressure: boolean; longEvidenceExplanation: boolean }>
  if (dialogueRows.length < 3) return []

  for (let index = 0; index < dialogueRows.length; index += 1) {
    const row = dialogueRows[index]
    if (!row.longEvidenceExplanation) continue
    const nearbyPressure = dialogueRows
      .slice(Math.max(0, index - 2), Math.min(dialogueRows.length, index + 3))
      .find(candidate => candidate.shortPressure)
    if (!nearbyPressure) continue
    if (row.length < nearbyPressure.length + 18) continue
    return [{
      key: 'dialogue_protagonist_line_economy',
      label: '主角台词短句扫描',
      status: 'warn' as const,
      evidence: `${nearbyPressure.evidence} / ${row.evidence}`,
      fix: '按 oh-story 主角冷静度修复：主角台词要比反派更短、更冷、更有控制力；把长篇证据解释拆成短问、短句、动作亮证和对方自爆，让反派承担更长、更慌的辩解。',
      line: nearbyPressure.line,
    }]
  }
  return []
}

function isQuestionDialogueQuote(quote: string) {
  return /[？?]|为什么|凭什么|哪里|谁|什么|怎么|是不是|能不能|有没有|难道|吗$/.test(String(quote || '').trim())
}

export function scanDialogueQuestionAnswerLoopRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const rows = lines.map((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return null
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return null
    return {
      line: index + 1,
      quote,
      evidence: String(line || '').trim(),
      isQuestion: isQuestionDialogueQuote(quote),
    }
  })
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index <= rows.length - 6; index += 1) {
    const window = rows.slice(index, index + 6)
    if (window.some(row => !row)) continue
    const dialogueWindow = window as Array<{ line: number; quote: string; evidence: string; isQuestion: boolean }>
    const contiguous = dialogueWindow.every((row, rowIndex) => rowIndex === 0 || row.line - dialogueWindow[rowIndex - 1].line === 1)
    if (!contiguous) continue
    const questionCount = dialogueWindow.filter(row => row.isQuestion).length
    if (questionCount < 3) continue
    const alternatingPairs = dialogueWindow.slice(1).filter((row, rowIndex) => row.isQuestion !== dialogueWindow[rowIndex].isQuestion).length
    if (alternatingPairs < 4) continue
    hits.push({
      key: 'dialogue_question_answer_loop',
      label: '问答式对白扫描',
      status: 'warn',
      evidence: compactBriefText(dialogueWindow.map(row => row.evidence).join(' / '), 240),
      fix: '避免通篇一问一答像审讯；改为一方主动说，另一方用动作/表情/心理或半句反应承接，每轮对白必须带新信息、议程碰撞、误导、代价或关系变化。',
      line: dialogueWindow[0].line,
    })
    break
  }
  return hits
}
