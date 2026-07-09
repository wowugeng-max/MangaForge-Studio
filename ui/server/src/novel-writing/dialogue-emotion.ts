import { countProseChars } from './word-target'

const DIALOGUE_NEGATIVE_EMOTION_PATTERN = /(?:撑不住|害怕|怕|恐惧|崩溃|绝望|完了|死定了|救命|别过来|受不了|不敢|发抖|哭|窒息|疯了|心慌)/
const DIALOGUE_LIGHT_EMOTION_PATTERN = /(?:哈哈|呵呵|有意思|好玩|轻松|别紧张|开玩笑|没事|不算什么|挺有趣|太逗了|笑死|随便)/
const DIALOGUE_EMOTION_TRANSITION_PATTERN = /(?:停了|沉默|吸气|呼吸|攥|松开|低头|抬头|看着|移开|退后|靠墙|闭眼|咽了|顿了|缓了|声音|手指|肩膀|眼神|脸色)/
const DIALOGUE_PROCEDURAL_RESPONSE_PATTERN = /(?:按流程|流程|编号|记录|门牌|名单|下一步|计划|步骤|规则|证据|逻辑|结论|先把|先去|现在必须|必须先|应该先|照做|执行|登记|归档|排查|核对)/
const DIALOGUE_EMOTION_ACK_RESPONSE_PATTERN = /(?:我知道你(?:怕|慌|撑不住|害怕)|知道你(?:怕|慌|害怕)|别怕|别慌|别急|看着我|听我说|先呼吸|慢慢说|我在|我来|不会让|稳住|扶住|按住|压住|退后|别开门|不马上开|先别开|你先)/
const DIALOGUE_EXPLANATION_PERSUASION_SETUP_PATTERN = /(?:因为|所以|只要|必须|应该|你想想|换句话说|也就是说|逻辑|规则|证据|证明|原因|结论|如果|否则)/
const DIALOGUE_EASY_PERSUASION_PATTERN = /(?:你说得对|你说的对|我被你说服了|你说服我了|我明白了|我懂了|就按你说的办|听你的|我相信你|我同意了|你有道理)/
const DIALOGUE_PERSUASION_EVENT_TRIGGER_PATTERN = /(?:广播|警报|铃声|门|窗|墙|地面|灯|血|影子|脚步|裂开|倒下|冲进|响起|亮起|熄灭|掉下|出现|消失|炸开|砸|撞|名单|钥匙|证据|账册|监控|照片|录音|尸体)/

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

function classifyDialogueEmotionJump(quote: string) {
  const text = String(quote || '').trim()
  if (DIALOGUE_NEGATIVE_EMOTION_PATTERN.test(text)) return 'negative'
  if (DIALOGUE_LIGHT_EMOTION_PATTERN.test(text)) return 'light'
  return ''
}

export function scanDialogueEmotionContinuityRisks(text: string) {
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
        emotion: classifyDialogueEmotionJump(quote),
        evidence: String(line || '').trim(),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; emotion: string; evidence: string }>
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index < dialogueRows.length - 1; index += 1) {
    const current = dialogueRows[index]
    const next = dialogueRows[index + 1]
    if (next.line - current.line > 2) continue
    const betweenLines = lines.slice(current.line, next.line - 1).map(line => String(line || '').trim()).filter(Boolean)
    const hasTransition = betweenLines.some(line => DIALOGUE_EMOTION_TRANSITION_PATTERN.test(line))
    if (
      current.emotion === 'negative'
      && !next.emotion
      && DIALOGUE_PROCEDURAL_RESPONSE_PATTERN.test(next.quote)
      && !DIALOGUE_EMOTION_ACK_RESPONSE_PATTERN.test(next.quote)
      && !hasTransition
    ) {
      hits.push({
        key: `dialogue_emotion_nonresponse_lines_${current.line}_${next.line}`,
        label: '对白情绪承接扫描',
        status: 'warn',
        evidence: `${current.evidence} / ${next.evidence}`,
        fix: '按 oh-story 对话规则修复：情绪场景里，每句都要回应上一句对方的情绪状态（承接/偏转/升级/退缩）；不要在对方恐惧、崩溃或求助后直接切流程/科普/任务。先补一拍安抚、承认、压住情绪或动作反应，再推进信息。',
        line: current.line,
      })
      continue
    }
    if (!current.emotion || !next.emotion || current.emotion === next.emotion) continue
    if (hasTransition) continue
    hits.push({
      key: `dialogue_emotion_continuity_lines_${current.line}_${next.line}`,
      label: '对白情绪连续性扫描',
      status: 'warn',
      evidence: `${current.evidence} / ${next.evidence}`,
      fix: '不要让角色情绪从恐惧/崩溃直接跳到轻松调侃或反向突变；补一拍过渡动作、身体反应、误判信息或情绪台阶，让转折有原因和过程。',
      line: current.line,
    })
  }
  return hits
}

export function scanDialogueEasyPersuasionRisks(text: string) {
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
        isExplanation: DIALOGUE_EXPLANATION_PERSUASION_SETUP_PATTERN.test(quote) || countProseChars(quote) >= 34,
        isEasyPersuasion: DIALOGUE_EASY_PERSUASION_PATTERN.test(quote),
      }
    })
    .filter(Boolean) as Array<{ line: number; quote: string; evidence: string; isExplanation: boolean; isEasyPersuasion: boolean }>
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (const row of dialogueRows) {
    if (!row.isEasyPersuasion) continue
    const priorRows = dialogueRows
      .filter(candidate => candidate.line < row.line && row.line - candidate.line <= 4)
      .slice(-3)
    const explanationRows = priorRows.filter(candidate => candidate.isExplanation)
    if (explanationRows.length < 2) continue
    const firstLine = explanationRows[0].line
    const bridgeLines = lines.slice(firstLine, row.line - 1).map(line => String(line || '').trim()).filter(Boolean)
    if (bridgeLines.some(line => DIALOGUE_PERSUASION_EVENT_TRIGGER_PATTERN.test(line) && !extractStandaloneDialogueQuote(line))) continue
    hits.push({
      key: `dialogue_easy_persuasion_lines_${firstLine}_${row.line}`,
      label: '对白说服人物扫描',
      status: 'warn',
      evidence: compactBriefText([...explanationRows.map(item => item.evidence), row.evidence].join(' / '), 240),
      fix: '不要让人物被几句抽象解释直接说服；用突发状况、可见证据、代价兑现、利益交换或行动结果迫使其改变态度，再让对白承接变化。',
      line: firstLine,
    })
  }
  return hits
}
