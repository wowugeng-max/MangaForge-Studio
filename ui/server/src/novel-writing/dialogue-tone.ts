import { countProseChars } from './word-target'

const DIALOGUE_QUOTE_PATTERN = /[“「]([^”」]+)[”」]/g
const DIALOGUE_PRESSURE_PATTERN = /[？！!?]|为什么|凭什么|闭嘴|别废话|快|立刻|马上|否则|敢|杀|死|救|滚|放开|住手|你以为|我问你|回答我/
const DIALOGUE_GENERIC_TONE_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '你要明白', regex: /你要明白|你要知道|你应该知道/g },
  { label: '事情没有那么简单', regex: /事情没有那么简单|没那么简单|并不简单/g },
  { label: '也就是说', regex: /也就是说|换句话说|简单来说/g },
  { label: '总结腔', regex: /总而言之|归根结底|从某种意义上/g },
  { label: '解释意义', regex: /这意味着|这说明|这代表/g },
]
const DIALOGUE_FORMAL_WRITTEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '我认为此事不妥', regex: /我认为(?:此事|这事|这件事)[^。！？!?；;]{0,8}(?:不妥|欠妥|不可|不宜)/g },
  { label: '尚需从长计议', regex: /尚需|从长计议|不可轻举妄动|此事需慎重/g },
  { label: '并非如此', regex: /并非如此|未必如此|此言差矣/g },
]

function dialogueGenericToneHits(quote: string) {
  const hits: string[] = []
  for (const item of DIALOGUE_GENERIC_TONE_PATTERNS) {
    item.regex.lastIndex = 0
    if (item.regex.test(quote)) hits.push(item.label)
  }
  return hits
}

function dialogueFormalWrittenHits(quote: string) {
  const hits: string[] = []
  for (const item of DIALOGUE_FORMAL_WRITTEN_PATTERNS) {
    item.regex.lastIndex = 0
    if (item.regex.test(quote)) hits.push(item.label)
  }
  return hits
}

export function scanDialogueToneRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ gate: 'E'; pattern: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    if (!evidence) return
    DIALOGUE_QUOTE_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = DIALOGUE_QUOTE_PATTERN.exec(evidence))) {
      const quote = String(match[1] || '').trim()
      const formalHits = dialogueFormalWrittenHits(quote)
      if (formalHits.length > 0) {
        hits.push({
          gate: 'E',
          pattern: `对白书面语：${formalHits.join('/')}`,
          status: 'warn',
          evidence,
          fix: '按 oh-story 口语化规则修复：把“我认为此事不妥”这类书面腔改成角色会说出口的话，例如“我觉得不靠谱”“这事不对劲”；用身份、关系和当下压力决定语气。',
          line: index + 1,
        })
        break
      }
      if (countProseChars(quote) < 24) continue
      const toneHits = dialogueGenericToneHits(quote)
      if (toneHits.length < 2) continue
      DIALOGUE_PRESSURE_PATTERN.lastIndex = 0
      if (DIALOGUE_PRESSURE_PATTERN.test(quote)) continue
      hits.push({
        gate: 'E',
        pattern: `对话腔调模板化：${toneHits.join('/')}`,
        status: 'warn',
        evidence,
        fix: '把解释腔对白改成有角色议程、遮掩、逼问、误导、权力差或情绪动作的对话；信息只露出对方此刻需要知道的一小块。',
        line: index + 1,
      })
      break
    }
  })
  return hits
}
