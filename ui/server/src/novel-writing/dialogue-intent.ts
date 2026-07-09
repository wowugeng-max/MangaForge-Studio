import { countProseChars } from './word-target'

const FACE_SLAP_PAYOFF_PATTERN = /(?:当众)?打脸|反证|翻盘|洗清|真相(?:公开|揭开|曝光|大白)|栽赃失败|证据(?:摆|甩|摊开|公开|曝光)|(?:检测|鉴定|审计|验伤|转账|亲子鉴定)?报告|录音|监控|视频|截图|账册|旧账册/
const DIALOGUE_JUDGMENT_QUESTION_PATTERN = /[？?]|谁(?:撕|拿|改|删|换|让|收|藏|烧)|为什么|凭什么|哪(?:一|几)?页|第[一二三四五六七八九十百千万两0-9]+页|旧印|账册|账本|录音|监控|报告|截图|转账|签名|证据/
const DIALOGUE_SELF_INCRIMINATION_PATTERN = /不可能|我怎么知道|你怎么知道|明明|早就|已经|烧了|删了|改了|换了|藏了|收进|收在|撕了|没人知道|不该|怎么会|我只是|是我|我让|我拿|我换|我藏|我删|我收/
const DIALOGUE_SUBTEXT_AGENDA_PATTERN = /(?:我的|我真正的|真正的)?(?:目的|目标|打算|计划|真实目的|真正目的|真正想要|想要的就是|就是想让你|就是要让你|我想让你|我要你)(?:是|就是|其实是|为了|把|交|开|离开|留下|承认|相信|放弃|害怕|知道)?/
const DIALOGUE_EMPTY_PRAISE_PATTERN = /(?:你|您|他|她|李辰|主角)?(?:太厉害了|真厉害|真是厉害|太强了|真强|太牛了|不愧是你|全靠你|多亏了你|没人比得上你|谁都比不上你|你真是(?:天才|神了)|你简直(?:是)?(?:天才|神了))/

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

function isJudgmentDialogueQuestion(quote: string) {
  const text = String(quote || '').trim()
  if (!text) return false
  DIALOGUE_JUDGMENT_QUESTION_PATTERN.lastIndex = 0
  return countProseChars(text) <= 32 && DIALOGUE_JUDGMENT_QUESTION_PATTERN.test(text)
}

function isSelfIncriminationDialogue(quote: string) {
  DIALOGUE_SELF_INCRIMINATION_PATTERN.lastIndex = 0
  return DIALOGUE_SELF_INCRIMINATION_PATTERN.test(String(quote || '').trim())
}

export function scanDialogueJudgmentQuestionRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  if (!body || !paragraphHasFaceSlapPayoff(body)) return []
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const dialogueRows = lines
    .map((line, index) => {
      if (index === firstContentLine && isLikelyChapterTitleLine(line)) return null
      const evidence = String(line || '').trim()
      const quote = extractStandaloneDialogueQuote(evidence)
      if (!quote) return null
      return {
        line: index + 1,
        quote,
        evidence,
        judgmentQuestion: isJudgmentDialogueQuestion(quote),
        selfIncrimination: isSelfIncriminationDialogue(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; judgmentQuestion: boolean; selfIncrimination: boolean }>
  if (dialogueRows.length < 4) return []

  let judgmentTurns = 0
  for (let index = 0; index < dialogueRows.length; index += 1) {
    const row = dialogueRows[index]
    if (!row.judgmentQuestion) continue
    const responseWindow = dialogueRows.slice(index + 1, Math.min(dialogueRows.length, index + 3))
    if (responseWindow.some(response => response.selfIncrimination)) judgmentTurns += 1
  }
  if (judgmentTurns >= 2) return []

  return [{
    key: 'dialogue_judgment_questions_missing',
    label: '审判式对白扫描',
    status: 'warn' as const,
    evidence: compactBriefText(dialogueRows.map(row => row.evidence).join(' / '), 260),
    fix: '按 oh-story 主角冷静度修复：复仇/打脸场景至少安排 2 处审判式提问（主角短问 -> 对方露怯/自爆）；不要让主角长篇解释证据，用问题逼反派承认可被报告、录音、账册或截图反证的事实。',
    line: dialogueRows[0].line,
  }]
}

export function scanDialogueSubtextAgendaRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return
    DIALOGUE_SUBTEXT_AGENDA_PATTERN.lastIndex = 0
    if (!DIALOGUE_SUBTEXT_AGENDA_PATTERN.test(quote)) return
    hits.push({
      key: `dialogue_subtext_agenda_line_${index + 1}`,
      label: '潜台词与议程扫描',
      status: 'warn',
      evidence: String(line || '').trim(),
      fix: '不要让角色在台词里直说真实动机；把真实动机藏进借口、试探、误导、反问、条件交换、动作反应或对方误判里，让双方议程发生碰撞。',
      line: index + 1,
    })
  })
  return hits
}

export function scanDialogueEmptyPraiseRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return
    DIALOGUE_EMPTY_PRAISE_PATTERN.lastIndex = 0
    if (!DIALOGUE_EMPTY_PRAISE_PATTERN.test(quote)) return
    hits.push({
      key: `dialogue_empty_praise_line_${index + 1}`,
      label: '空泛夸赞对白扫描',
      status: 'warn',
      evidence: String(line || '').trim(),
      fix: '删掉配角无脑夸主角式对白；把认可改成有证据、有代价、有利益立场或有反应差异的动作/质疑/让步，不要用空泛夸赞替代剧情推进。',
      line: index + 1,
    })
  })
  return hits
}
