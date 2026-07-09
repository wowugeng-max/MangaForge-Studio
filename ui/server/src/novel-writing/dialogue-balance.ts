import { countProseChars } from './word-target'

const DIALOGUE_PRESSURE_PATTERN = /[？！!?]|为什么|凭什么|闭嘴|别废话|快|立刻|马上|否则|敢|杀|死|救|滚|放开|住手|你以为|我问你|回答我/
const DIALOGUE_VOICE_SAMENESS_OPENERS = [
  '所以这件事的关键在于',
  '这件事的关键在于',
  '你要明白',
  '也就是说',
  '换句话说',
  '简单来说',
  '归根结底',
]

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function extractStandaloneDialogueQuote(line: string) {
  const evidence = String(line || '').trim()
  const match = evidence.match(/^[“"「]([^”"」]+)[”"」][。！？!?，,；;：:]?$/)
  return match ? String(match[1] || '').trim() : ''
}

function dialogueVoiceSamenessSignature(quote: string) {
  const text = String(quote || '').trim()
  const opener = DIALOGUE_VOICE_SAMENESS_OPENERS.find(item => text.startsWith(item))
  if (opener) return opener
  const firstClause = text.split(/[，,。！？!?；;]/)[0] || ''
  return countProseChars(firstClause) >= 8 ? firstClause : ''
}

function hasDialogueVoiceVariation(quote: string) {
  return /[？?!！]|滚|闭嘴|少来|老子|本座|贫道|奴家|属下|大人|师兄|师姐|兄弟|哥们|您|咱|俺|小爷/.test(String(quote || ''))
}

export function scanDialogueVoiceSamenessRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const rows = lines
    .map((line, index) => {
      if (index === firstContentLine && isLikelyChapterTitleLine(line)) return null
      const quote = extractStandaloneDialogueQuote(line)
      if (!quote) return null
      return {
        line: index + 1,
        quote,
        evidence: String(line || '').trim(),
        length: countProseChars(quote),
        signature: dialogueVoiceSamenessSignature(quote),
        hasVariation: hasDialogueVoiceVariation(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; length: number; signature: string; hasVariation: boolean }>
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index <= rows.length - 4; index += 1) {
    const window = rows.slice(index, index + 4)
    if (!window.every((row, rowIndex) => rowIndex === 0 || row.line - window[rowIndex - 1].line === 1)) continue
    if (window.some(row => row.hasVariation || !row.signature || row.length < 20)) continue
    const signatures = new Set(window.map(row => row.signature))
    if (signatures.size !== 1) continue
    const lengths = window.map(row => row.length)
    if (Math.max(...lengths) - Math.min(...lengths) > 18) continue
    hits.push({
      key: `dialogue_voice_sameness_lines_${window[0].line}_${window[window.length - 1].line}`,
      label: '角色声线趋同扫描',
      status: 'warn',
      evidence: compactBriefText(window.map(row => row.evidence).join(' / '), 240),
      fix: '按角色拆分口癖、说话节奏、信息偏好、身份措辞和立场；不要让多人对白共享同一种解释腔和句式模板，至少让一方用短句、质问、行动反应或身份化措辞改写。',
      line: window[0].line,
    })
    break
  }
  return hits
}

export function scanDialogueBreathRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  let run: Array<{ line: number; quote: string; evidence: string }> = []
  const flushRun = () => {
    if (run.length < 6) {
      run = []
      return
    }
    const totalChars = run.reduce((sum, row) => sum + countProseChars(row.quote), 0)
    if (totalChars < 80) {
      run = []
      return
    }
    const first = run[0]
    const last = run[run.length - 1]
    hits.push({
      key: `dialogue_breath_lines_${first.line}_${last.line}`,
      label: '对白呼吸感扫描',
      status: 'warn',
      evidence: compactBriefText(run.map(row => row.evidence).join(' / '), 240),
      fix: '长串对白需要换气；每 4-6 句插入动作、环境变化、身体反应或心理判断，把信息拉扯落到可见事件上，避免整段像台词稿。',
      line: first.line,
    })
    run = []
  }
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) {
      flushRun()
      return
    }
    const evidence = String(line || '').trim()
    const quote = extractStandaloneDialogueQuote(evidence)
    if (!quote) {
      flushRun()
      return
    }
    run.push({
      line: index + 1,
      quote,
      evidence,
    })
  })
  flushRun()
  return hits.slice(0, 1)
}

export function scanDialoguePowerBalanceRisks(text: string) {
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
        pressured: DIALOGUE_PRESSURE_PATTERN.test(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; length: number; pressured: boolean }>
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index < dialogueRows.length - 1; index += 1) {
    const current = dialogueRows[index]
    const next = dialogueRows[index + 1]
    if (next.line - current.line > 2) continue
    if (current.length < 42 || next.length < 42) continue
    if (!current.pressured && !next.pressured) continue
    hits.push({
      key: `dialogue_power_balance_lines_${current.line}_${next.line}`,
      label: '对白权力差扫描',
      status: 'warn',
      evidence: `${current.evidence} / ${next.evidence}`,
      fix: '按“对话长度 = 权力地位”重写压制/反转场景：掌控者或亮底牌方改成短句、冷句或一句事实，被动方保留更长、更情绪化的辩解；不要让双方都长篇解释。',
      line: current.line,
    })
  }
  return hits
}
