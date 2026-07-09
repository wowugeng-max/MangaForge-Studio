import { countProseChars } from './word-target'

const DIALOGUE_FUNCTIONAL_SIGNAL_PATTERN = /账本|账册|证据|线索|封条|缺页|左袖|袖口|墨点|说漏|怎么知道|谁把|为什么|凭什么|昨夜|名单|钥匙|监控|录音|血|广播|规则|倒计时|危险|消失|承认|作证|退开|站队|改口|条件|交易|代价|否则|如果|别拿|泼脏水|长老|闭嘴|够了|滚|随意|拿出|交出|藏|烧|撕|改|换|反证|露馅/
const DIALOGUE_FILLER_LINE_PATTERN = /你来了|我来了|辛苦|还好|继续吧|好[，,]?继续|真厉害|哪里哪里|谢谢|不用谢|没事|好的|嗯|是啊|对啊|原来如此|知道了|明白了|加油|放心/
const DIALOGUE_NO_CHANGE_PATTERN = /没有(?:任何)?(?:新变化|线索|行动|悬念|关系变化|新信息|证据)|情节[^。！？\n]{0,16}不受影响|删掉[^。！？\n]{0,16}不影响/

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function extractStandaloneDialogueQuote(line: string) {
  const evidence = String(line || '').trim()
  const match = evidence.match(/^[“"「]([^”"」]+)[”"」][。！？!?，,；;：:]?$/)
  return match ? String(match[1] || '').trim() : ''
}

export function scanDialogueFunctionalFillerRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  let index = 0
  while (index < lines.length) {
    const quote = extractStandaloneDialogueQuote(lines[index])
    if (!quote) {
      index += 1
      continue
    }
    const run: Array<{ line: number; quote: string; evidence: string }> = []
    let cursor = index
    while (cursor < lines.length) {
      const currentQuote = extractStandaloneDialogueQuote(lines[cursor])
      if (!currentQuote) break
      run.push({
        line: cursor + 1,
        quote: currentQuote,
        evidence: String(lines[cursor] || '').trim(),
      })
      cursor += 1
    }

    const quoteText = run.map(item => item.quote).join(' ')
    const nearbyText = lines.slice(cursor, Math.min(lines.length, cursor + 2)).map(line => String(line || '').trim()).filter(Boolean).join(' ')
    const blockText = `${quoteText} ${nearbyText}`
    const fillerCount = run.filter(item => {
      const compactLength = countProseChars(item.quote)
      return compactLength <= 12 || DIALOGUE_FILLER_LINE_PATTERN.test(item.quote)
    }).length
    const explicitNoChange = DIALOGUE_NO_CHANGE_PATTERN.test(blockText)
    const hasFunctionalSignal = DIALOGUE_FUNCTIONAL_SIGNAL_PATTERN.test(quoteText)
      || (!explicitNoChange && DIALOGUE_FUNCTIONAL_SIGNAL_PATTERN.test(nearbyText))
    if (
      run.length >= 6
      && !hasFunctionalSignal
      && (explicitNoChange || fillerCount >= Math.ceil(run.length * 0.6))
    ) {
      hits.push({
        key: 'dialogue_functional_filler',
        label: '可删除对白',
        status: 'warn',
        evidence: compactBriefText(run.map(item => item.evidence).join(' / '), 260),
        fix: '按 oh-story 对话删除测试处理：删掉这段对话后，如果情节、期待感和情绪都不受影响，就直接删；若必须保留，至少改出新信息、悬念、行动、关系变化或角色独有声线。',
        line: run[0].line,
      })
      return hits
    }
    index = Math.max(cursor, index + 1)
  }
  return hits
}
