import { countProseChars } from './word-target'

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

const REPEATED_SUBJECT_ACTION_PREFIX_PATTERN = /^(他|她|它|他们|她们|少年|少女|男人|女人|老人|孩子|主角|[\u4e00-\u9fa5]{2,4}?)(?=(?:把|被|将|向|从|在|对|给|跟|和|与|也|又|却|仍|正|便|就|才|再|还|只|不|没|没有|会|要|想|看|听|发现|知道|抬|低|转|伸|按|抓|握|推|拉|走|站|坐|说|问|喊|闭|开|关|拿|递|放|盯|望|沉默|摇|点|呼|退|冲|跑|停|笑|皱|咬|攥|松|摸|拍|踢|撞|踩|捡|翻|合|打开|收起|忽然|突然|终于|已经))/

function splitProseSentences(text: string) {
  return (proseBodyWithoutTitleLine(text).replace(/\s+/g, '').match(/[^。！？!?]+[。！？!?]?/g) || [])
    .map(sentence => sentence.trim())
    .filter(sentence => countProseChars(sentence) >= 4)
}

function extractSentenceSubjectOpener(sentence: string) {
  const normalized = String(sentence || '').trim().replace(/^[“「『（(《【\[]+/, '')
  const match = normalized.match(REPEATED_SUBJECT_ACTION_PREFIX_PATTERN)
  return match?.[1] || ''
}

export function scanRepeatedSubjectRisks(text: string) {
  const sentences = splitProseSentences(text).map((sentence, index) => ({
    sentence,
    opener: extractSentenceSubjectOpener(sentence),
    index,
  })).filter(item => item.opener)
  const hits: Array<{ gate: 'B'; pattern: string; status: 'warn'; evidence: string; fix: string; sentence_start: number }> = []
  for (let index = 0; index <= sentences.length - 4; index += 1) {
    const window = sentences.slice(index, index + 4)
    const opener = window[0].opener
    if (!opener || window.some(item => item.opener !== opener)) continue
    hits.push({
      gate: 'B',
      pattern: '主语重复/句式机械',
      status: 'warn',
      evidence: compactBriefText(window.map(item => item.sentence).join(''), 220),
      fix: `连续句子都以“${opener}”开头；改用动作开句、物件开句、感官开句、对白打断、省略主语或反应节拍，让句式节奏变自然。`,
      sentence_start: window[0].index + 1,
    })
    break
  }
  return hits
}

export function scanTripleParallelRisks(text: string) {
  const sentences = splitProseSentences(text)
  const hits: Array<{ gate: 'B'; pattern: string; status: 'warn'; evidence: string; fix: string; sentence_start: number }> = []
  sentences.forEach((sentence, index) => {
    if (hits.length > 0) return
    const clean = sentence.replace(/[。！？!?]+$/, '').trim()
    if (!clean || /[“"「」]/.test(clean)) return
    const explicitParallelMatch = clean.match(/有的[^，,。！？!?；;]{2,28}[，,；;]有的[^，,。！？!?；;]{2,28}[，,；;]有的[^。！？!?；;]{2,40}|一边[^，,。！？!?；;]{2,28}[，,；;]一边[^，,。！？!?；;]{2,28}[，,；;]一边[^。！？!?；;]{2,40}/)
    if (explicitParallelMatch) {
      hits.push({
        gate: 'B',
        pattern: '三连排比/机械完整感',
        status: 'warn',
        evidence: compactBriefText(explicitParallelMatch[0], 220),
        fix: 'oh-story 模式7：砍到只剩最有力的一条；其余信息改成动作后果、对白冲突、物件变化或后续段落里的真实推进。',
        sentence_start: index + 1,
      })
      return
    }
    const clauses = clean.split(/[，,；;]/).map(item => item.trim()).filter(Boolean)
    if (clauses.length < 3) return
    for (let offset = 0; offset <= clauses.length - 3; offset += 1) {
      const window = clauses.slice(offset, offset + 3)
      const lengths = window.map(clause => countProseChars(clause))
      const compactEnough = lengths.every(length => length >= 4 && length <= 28)
      const actionLikeCount = window.filter(clause => /了|到|住|出|进|回|开|起|下/.test(clause.slice(0, 12))).length
      if (!compactEnough || actionLikeCount < 2) continue
      hits.push({
        gate: 'B',
        pattern: '三连排比/机械完整感',
        status: 'warn',
        evidence: compactBriefText(window.join('，'), 220),
        fix: 'oh-story 模式7：砍到只剩最有力的一条；其余信息改成动作后果、对白冲突、物件变化或后续段落里的真实推进。',
        sentence_start: index + 1,
      })
      break
    }
  })
  return hits
}

const REPEATED_REACTION_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: '沉默', regex: /沉默/g },
  { label: '皱眉', regex: /皱(?:起)?眉|眉头(?:一)?皱/g },
  { label: '攥紧拳头', regex: /攥紧(?:了)?拳头|握紧(?:了)?拳头/g },
  { label: '咬牙', regex: /咬(?:了)?咬牙|咬紧(?:了)?牙/g },
  { label: '低头', regex: /低下(?:了)?头|垂下(?:了)?眼/g },
  { label: '抬头', regex: /抬起(?:了)?头|猛地抬头/g },
]

export function scanRepeatedReactionRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const hits: Array<{ gate: 'C'; pattern: string; status: 'warn'; evidence: string; fix: string; count: number }> = []
  if (!body) return hits
  for (const item of REPEATED_REACTION_PATTERNS) {
    item.regex.lastIndex = 0
    const matches = body.match(item.regex) || []
    if (matches.length < 3) continue
    hits.push({
      gate: 'C',
      pattern: `重复反应：${item.label}`,
      status: 'warn',
      count: matches.length,
      evidence: `“${item.label}”类反应出现 ${matches.length} 次：${compactBriefText(body, 220)}`,
      fix: '删掉重复的心理/身体垫句，把每一次反应改成不同功能：选择、误判、代价、动作推进、对话交锋或新信息变化。',
    })
  }
  return hits
}

const RHYTHM_VARIATION_SIGNAL_PATTERN = /[“「？！!?]|但是|可是|然而|却|突然|忽然|必须|不能|否则|如果|为什么|怎么|立刻|马上|转身|冲|撞|砸|喊|吼|问/

export function scanUniformRhythmRisks(text: string) {
  const sentences = splitProseSentences(text)
  const hits: Array<{ gate: 'D'; pattern: string; status: 'warn'; evidence: string; fix: string; sentence_start: number }> = []
  for (let index = 0; index <= sentences.length - 8; index += 1) {
    const window = sentences.slice(index, index + 8)
    const lengths = window.map(sentence => countProseChars(sentence.replace(/[。！？!?]+$/, '')))
    const allShort = lengths.every(length => length >= 5 && length <= 18)
    const spread = Math.max(...lengths) - Math.min(...lengths)
    const hasVariation = window.some(sentence => {
      RHYTHM_VARIATION_SIGNAL_PATTERN.lastIndex = 0
      return RHYTHM_VARIATION_SIGNAL_PATTERN.test(sentence)
    })
    if (!allShort || spread > 8 || hasVariation) continue
    hits.push({
      gate: 'D',
      pattern: '节奏均匀/短句平铺',
      status: 'warn',
      evidence: compactBriefText(window.join(''), 220),
      fix: '打破连续短陈述句：混入长短句变化、对白交锋、动作后果、信息转折、情绪落差或段落停顿，让节奏有压缩、爆点和余波。',
      sentence_start: index + 1,
    })
    break
  }
  return hits
}
