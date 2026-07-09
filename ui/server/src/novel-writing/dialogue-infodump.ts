import { countProseChars } from './word-target'

const INFODUMP_TERM_PATTERN = /规则|体系|机制|原理|设定|等级|权限|惩罚|契约|名单|身份|能力|境界|组织|历史|来源|通常|一般|所谓|也就是说|这意味着|因此|所以|根据|分为|负责|触发|绑定|自动|条件|限制|管理员/g
const DIALOGUE_QUOTE_PATTERN = /[“「]([^”」]+)[”」]/g
const DIALOGUE_PRESSURE_PATTERN = /[？！!?]|为什么|凭什么|闭嘴|别废话|快|立刻|马上|否则|敢|杀|死|救|滚|放开|住手|你以为|我问你|回答我/
const DIALOGUE_SCIENCE_MOUTH_EMBED_PATTERN = /(?:为什么|凭什么|我问你|回答我|看见了吗|广播|警报|响起|亮起|变红|红灯|证据|钥匙|账本|名单变|门锁|血|伤|痛|退后|按住|抓住|冲进|倒下|裂开|出现|消失|[？！!?])/

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function countInfodumpTerms(paragraph: string) {
  INFODUMP_TERM_PATTERN.lastIndex = 0
  const terms = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = INFODUMP_TERM_PATTERN.exec(paragraph))) {
    terms.add(match[0])
  }
  return terms.size
}

function extractStandaloneDialogueQuote(line: string) {
  const evidence = String(line || '').trim()
  const match = evidence.match(/^[“"「]([^”"」]+)[”"」][。！？!?，,；;：:]?$/)
  return match ? String(match[1] || '').trim() : ''
}

export function scanDialogueInfodumpRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    if (!evidence) return
    DIALOGUE_QUOTE_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = DIALOGUE_QUOTE_PATTERN.exec(evidence))) {
      const quote = String(match[1] || '').trim()
      if (countProseChars(quote) < 80) continue
      if (countInfodumpTerms(quote) < 5) continue
      DIALOGUE_PRESSURE_PATTERN.lastIndex = 0
      if (DIALOGUE_PRESSURE_PATTERN.test(quote)) continue
      hits.push({
        key: `dialogue_infodump_line_${index + 1}`,
        label: '说明书式对白扫描',
        status: 'warn',
        evidence,
        fix: '把说明书式对白改成有议程、有遮掩、有逼问或有权力博弈的对白；设定信息拆进对方追问、现场规则触发、代价反馈和角色反应里。',
        line: index + 1,
      })
      break
    }
  })
  const dialogueRows = lines
    .map((line, index) => {
      const quote = extractStandaloneDialogueQuote(line)
      if (!quote) return null
      return {
        line: index + 1,
        quote,
        evidence: String(line || '').trim(),
        terms: countInfodumpTerms(quote),
        length: countProseChars(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; terms: number; length: number }>
  for (let index = 0; index <= dialogueRows.length - 3; index += 1) {
    const rows = dialogueRows.slice(index, index + 3)
    if (rows[1].line - rows[0].line > 1 || rows[2].line - rows[1].line > 1) continue
    const combined = rows.map(row => row.quote).join(' ')
    if (rows.reduce((sum, row) => sum + row.length, 0) < 70) continue
    if (countInfodumpTerms(combined) < 8) continue
    if (rows.some(row => DIALOGUE_PRESSURE_PATTERN.test(row.quote) || DIALOGUE_SCIENCE_MOUTH_EMBED_PATTERN.test(row.quote))) continue
    hits.push({
      key: `dialogue_science_mouth_lines_${rows[0].line}_${rows[2].line}`,
      label: '信息型配角科普嘴扫描',
      status: 'warn',
      evidence: compactBriefText(rows.map(row => row.evidence).join(' / '), 260),
      fix: '按 oh-story 信息展示规则修复：信息型配角不能整段当科普嘴；把设定/原理/前因后果拆成角色在压力下挤出的半句话、身体反应、追问、证据触发和留白，用到哪带哪点。',
      line: rows[0].line,
    })
    break
  }
  return hits
}
