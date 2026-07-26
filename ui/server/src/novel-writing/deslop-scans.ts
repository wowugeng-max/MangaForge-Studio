import { countProseChars } from './word-target'

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n')
}

const OH_STORY_LEVEL_ONE_BANNED_WORDS = [
  '仿佛', '犹如', '宛若', '如同', '一丝', '一抹', '些许', '几分', '隐约',
  '深吸一口气', '缓缓', '不禁', '微微', '轻轻', '淡淡',
  '眼中闪过', '嘴角勾起', '眉头微皱', '眉眼低垂', '瞳孔微缩',
  '心中一动', '心头一震', '心下了然', '心中暗道', '心底泛起', '不由得',
  '不容置疑', '不容置喙', '不易察觉', '显而易见', '毫无疑问', '不可否认',
  '坚定', '闪烁着光芒', '狡黠', '深邃', '凛冽', '冰冷',
  '不由自主', '情不自禁', '自然而然',
  '映入眼帘', '只见', '此时此刻', '目光如炬', '沉声道', '淡淡地说', '脸色一变', '嘴角微扬',
  '与此同时', '不仅如此', '更为重要的是', '换句话说', '总而言之', '由此可见', '毋庸置疑',
  '心中涌起', '一股莫名', '不由自主地', '难以名状',
]

const OH_STORY_WEAK_ADVERBS = ['微微', '淡淡', '缓缓', '轻轻']
const OH_STORY_WEAK_ADVERB_THRESHOLD_PER_1000 = 3
const OH_STORY_CONTEXT_SENSITIVE_WORDS = ['突然', '好像', '瞬间']
const OH_STORY_CONTEXT_SENSITIVE_WORD_THRESHOLD_PER_1000 = 3
const OH_STORY_BOOKISH_PHRASE_REPLACEMENTS = [
  { term: '瓦解', replacement: '消失 / 散了 / 没了' },
  { term: '无名火', replacement: '烦躁' },
  { term: '往我心上捅刀子', replacement: '心烦意乱' },
  { term: '无可奈何', replacement: '没办法' },
]

const OH_STORY_BANNED_PATTERNS: Array<{ pattern: string; regex: RegExp; status: 'fail' | 'warn'; fix: string }> = [
  { pattern: '不是A，而是B', regex: /不是[^。！？!?；;]{1,40}[，,]?(?:而)?是[^。！？!?；;]{1,40}/g, status: 'fail', fix: '直接写 B 或换成更自然的动作/事实表达。' },
  { pattern: '并非A，而是B', regex: /并非[^。！？!?；;]{1,40}[，,]?(?:而)?是[^。！？!?；;]{1,40}/g, status: 'fail', fix: '删掉对照解释，直接写可见事实、动作结果或角色选择。' },
  { pattern: '与其说A，不如说B', regex: /与其说[^。！？!?；;]{1,40}[，,]?不如说[^。！？!?；;]{1,40}/g, status: 'fail', fix: '删掉对照解释，保留真正发生的动作、判断来源或现场证据。' },
  { pattern: '看似A，实则B', regex: /看似[^。！？!?；;]{1,40}[，,]?(?:实则|实际上)[^。！？!?；;]{1,40}/g, status: 'fail', fix: '删掉对照解释，用场景细节直接暴露反差。' },
  { pattern: '万能比喻', regex: /梨花带雨|如沐春风|像[^。！？!?；;，,]{1,18}般|像(?:命运的齿轮|宿命的齿轮|上辈子的尘埃|潮水|闪电|春风|一把刀|被抛弃的野狗|一头被抛弃的野狗|这漫天的雪)[^。！？!?；;，,]{0,18}|像是要[^。！？!?；;，,]{1,30}/g, status: 'warn', fix: '删掉万能比喻，改成直接描述、动词、名词、作用、结果或白描。' },
  { pattern: 'AI风场景套话', regex: /斑驳的光影|空气中弥漫|宁静祥和|整个世界都沉浸/g, status: 'warn', fix: '按 oh-story 场景范例修复：删掉斑驳光影、空气中弥漫、宁静祥和氛围这类模板场景；改成具体时间、声音、物件或角色当下要处理的现场落点，例如“下午三点，客厅里只有钟在走”。' },
  { pattern: 'AI风天气套话', regex: /乌云密布|倾盆大雨|寒风呼啸|刺骨的?寒意/g, status: 'warn', fix: '按 oh-story 天气范例修复：删掉乌云密布、倾盆大雨、寒风呼啸、刺骨寒意这类天气套话；改成角色能碰到的现场动作或物件变化，例如“要下雨了，风把晾在外面的衣服吹得乱晃”。' },
  { pattern: 'AI风打斗套话', regex: /疾风骤雨|凌厉的?攻势|压迫性的?力量|每一击都[^。！？!?；;]{0,16}力量/g, status: 'warn', fix: '按 oh-story 打斗范例修复：删掉疾风骤雨、凌厉攻势、每一击都有力量这类模板武打；改成具体动作和结果，例如“他一拳怼过去，对方没躲开，嘴角破了”。' },
  { pattern: '总结句式', regex: /(?:^|[。！？!?；;\s])这一刻[，,][^“”"。！？!?；;]{2,40}|[他她][^。！？!?；;]{0,8}(?:终于明白|这才意识到)[^。！？!?；;]{0,40}|此刻[，,][他她][^。！？!?；;]{1,40}|一切[^。！？!?；;]{0,20}都[^。！？!?；;]{1,40}|(?:^|[。！？!?；;\s])原来[^“”"。！？!?；;]{2,40}|这就是[^。！？!?；;]{1,40}/g, status: 'warn', fix: '删掉总结/意识到句式，改成角色当下能看到、听到、触到的现场证据、动作或对白。' },
  { pattern: '他/她感到……', regex: /[他她我][^。！？!?；;]{0,8}感到(?:一阵|一种|无比|十分|非常)?(?:恐惧|害怕|愤怒|悲伤|难过|痛苦|绝望|震惊|惊讶|慌乱|紧张|不安|压迫|孤独|委屈|兴奋|喜悦|羞耻)/g, status: 'warn', fix: '删掉“感到...”告诉式心理，改成身体动作、对话反应、选择代价或可见行为。' },
  { pattern: '他/她意识到……', regex: /(?:^|[。！？!?；;，,\s])[他她我][^。！？!?；;“”"「」]{0,8}(?:意识到|明白)[^。！？!?；;“”"「」]{2,40}/g, status: 'warn', fix: '删掉“意识到/明白”直接告知，改成角色当下看到、听到、触到的现场证据、动作选择或对白反应。' },
  { pattern: '，带着……', regex: /[，,]带着/g, status: 'warn', fix: '拆短句，改成动作、语气或可见反应。' },
  { pattern: '声音不大，却带着……', regex: /声音不大[，,]却带着/g, status: 'warn', fix: '直接写声音特征、动作或现场反应。' },
  { pattern: '他/她知道……', regex: /[他她][^。！？!?；;]{0,12}知道/g, status: 'warn', fix: '用动作、选择或对话展示认知。' },
  { pattern: '仿佛/犹如/宛若……一般', regex: /(仿佛|犹如|宛若)[^。！？!?；;]{0,40}一般/g, status: 'warn', fix: '删掉比喻腔，改为白描或具体动作结果。' },
  { pattern: '眼中闪过一丝', regex: /眼中闪过一丝/g, status: 'warn', fix: '改成眼神动作或身体反应。' },
  { pattern: '嘴角勾起一抹', regex: /嘴角勾起一抹/g, status: 'warn', fix: '改成更具体的表情、动作或对白反应。' },
  { pattern: '心中涌起一股', regex: /心中涌起一股/g, status: 'warn', fix: '改成身体反应或外部动作。' },
  { pattern: '他/她不知道的是', regex: /[他她]不知道的是/g, status: 'warn', fix: '改用具体钩子物件或现场事件收束。' },
  { pattern: '禁用标点', regex: /——|—|--+|…+|\.{3,}/g, status: 'warn', fix: '改用句号、逗号、短句或动作断句。' },
]

const OH_STORY_CROSS_LINE_BANNED_PATTERNS: Array<{ pattern: string; first: RegExp; second: RegExp; status: 'fail'; fix: string }> = [
  { pattern: '不是A，而是B', first: /不是[^。！？!?；;]{1,40}[。！？!?，,]?$/, second: /^(?:而)?是[^。！？!?；;]{1,40}/, status: 'fail', fix: '直接写 B 或换成更自然的动作/事实表达；跨句/换行拆开也属于命中。' },
  { pattern: '并非A，而是B', first: /并非[^。！？!?；;]{1,40}[。！？!?，,]?$/, second: /^(?:而)?是[^。！？!?；;]{1,40}/, status: 'fail', fix: '删掉对照解释，直接写可见事实、动作结果或角色选择；跨句/换行拆开也属于命中。' },
  { pattern: '与其说A，不如说B', first: /与其说[^。！？!?；;]{1,40}[。！？!?，,]?$/, second: /^不如说[^。！？!?；;]{1,40}/, status: 'fail', fix: '删掉对照解释，保留真正发生的动作、判断来源或现场证据；跨句/换行拆开也属于命中。' },
  { pattern: '看似A，实则B', first: /看似[^。！？!?；;]{1,40}[。！？!?，,]?$/, second: /^(?:实则|实际上)[^。！？!?；;]{1,40}/, status: 'fail', fix: '删掉对照解释，用场景细节直接暴露反差；跨句/换行拆开也属于命中。' },
]

const OH_STORY_THREE_PART_CROSS_LINE_BANNED_PATTERNS: Array<{ pattern: string; first: RegExp; second: RegExp; third: RegExp; status: 'fail'; fix: string }> = [
  {
    pattern: '不是A，不是B，而是C',
    first: /不是[^。！？!?；;]{1,40}[。！？!?，,]?$/,
    second: /^(?:也)?不是[^。！？!?；;]{1,40}[。！？!?，,]?$/,
    third: /^(?:而)?是[^。！？!?；;]{1,40}/,
    status: 'fail',
    fix: '删掉否定铺垫，直接写最终事实、动作结果或现场证据；跨句/换行拆开也属于命中。',
  },
]

const OH_STORY_NOT_IS_SOFT_SEPARATORS = new Set(['，', ',', '、', '；', ';', '：', ':'])
const OH_STORY_NOT_IS_HARD_SEPARATORS = new Set(['。', '.', '！', '!', '？', '?'])
const OH_STORY_NOT_IS_STOP_CHARS = new Set(['。', '！', '？', '!', '?', '\n'])
const OH_STORY_NOT_IS_COMPACT_EITHER_OR_PREV = new Set(['不', '就', '也'])
const OH_STORY_NOT_IS_TAG_PARTICLES = new Set(['吗', '吧', '嘛'])

function startsWithAt(text: string, index: number, needle: string) {
  return text.slice(index, index + needle.length) === needle
}

function skipInlineGap(text: string, index: number) {
  let next = index
  while (next < text.length && /[ \t\r]/.test(text[next] || '')) next += 1
  return next
}

function hasOhStoryNotIsComparison(text: string) {
  const source = String(text || '')
  let offset = 0
  while (offset < source.length) {
    const start = source.indexOf('不是', offset)
    if (start === -1) return false
    if (start > 0 && source[start - 1] === '是') {
      offset = start + 2
      continue
    }
    let index = start + 2
    let scanned = 0
    let crossedSeparator = false
    while (index < source.length && scanned <= 80) {
      const char = source[index] || ''
      if (startsWithAt(source, index, '而是')) return true
      if (OH_STORY_NOT_IS_SOFT_SEPARATORS.has(char)) {
        const next = skipInlineGap(source, index + 1)
        if (startsWithAt(source, next, '而是')) return true
        if (source[next] === '是' && !OH_STORY_NOT_IS_TAG_PARTICLES.has(source[next + 1] || '')) return true
        crossedSeparator = true
      }
      if (OH_STORY_NOT_IS_HARD_SEPARATORS.has(char)) {
        const next = skipInlineGap(source, index + 1)
        if (source[next] === '是' && !OH_STORY_NOT_IS_TAG_PARTICLES.has(source[next + 1] || '')) return true
        if (char !== '.') break
        crossedSeparator = true
      }
      if (OH_STORY_NOT_IS_STOP_CHARS.has(char)) break
      if (char === '是' && !OH_STORY_NOT_IS_COMPACT_EITHER_OR_PREV.has(source[index - 1] || '') && !crossedSeparator) return true
      index += 1
      scanned += 1
    }
    offset = start + 2
  }
  return false
}

function hasOhStoryLevelOneBannedTerm(text: string, term: string) {
  const source = String(text || '')
  if (term !== '如同') return source.includes(term)
  let offset = 0
  while (offset < source.length) {
    const index = source.indexOf(term, offset)
    if (index < 0) return false
    if (source[index - 1] !== '不') return true
    offset = index + term.length
  }
  return false
}

function semanticSingleLineBannedMatchText(value: string) {
  return String(value || '').replace(/^[\s。！？!?；;，,]+/, '')
}

export function scanBannedWordLeaks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ gate: 'A'; pattern: string; matched_text: string; status: 'fail' | 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    if (!evidence) return
    for (const item of OH_STORY_BANNED_PATTERNS) {
      item.regex.lastIndex = 0
      const match = item.regex.exec(evidence)
      if (match) {
        if (item.pattern === '不是A，而是B' && !hasOhStoryNotIsComparison(evidence)) continue
        hits.push({
          gate: 'A',
          pattern: item.pattern,
          matched_text: semanticSingleLineBannedMatchText(match[0]),
          status: item.status,
          evidence,
          fix: item.fix,
          line: index + 1,
        })
      }
    }
    for (const term of OH_STORY_LEVEL_ONE_BANNED_WORDS) {
      if (!hasOhStoryLevelOneBannedTerm(evidence, term)) continue
      hits.push({
        gate: 'A',
        pattern: term,
        matched_text: term,
        status: 'warn',
        evidence,
        fix: `替换一级禁用词“${term}”，改成更具体的动作、事实或口语化表达。`,
        line: index + 1,
      })
    }
    for (const item of OH_STORY_BOOKISH_PHRASE_REPLACEMENTS) {
      if (!evidence.includes(item.term)) continue
      hits.push({
        gate: 'A',
        pattern: '书面腔口语化',
        matched_text: item.term,
        status: 'warn',
        evidence,
        fix: `把书面腔“${item.term}”改成更口语和现场的表达，可替换为：${item.replacement}。`,
        line: index + 1,
      })
    }
  })
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    const nextEvidence = String(lines[index + 1] || '').trim()
    if (!evidence || !nextEvidence) return
    for (const item of OH_STORY_CROSS_LINE_BANNED_PATTERNS) {
      item.first.lastIndex = 0
      item.second.lastIndex = 0
      const firstMatch = item.first.exec(evidence)
      const secondMatch = item.second.exec(nextEvidence)
      if (!firstMatch || !secondMatch) continue
      hits.push({
        gate: 'A',
        pattern: item.pattern,
        matched_text: `${firstMatch[0]}\n${secondMatch[0]}`,
        status: item.status,
        evidence: `${evidence}\n${nextEvidence}`,
        fix: item.fix,
        line: index + 1,
      })
    }
  })
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    const secondEvidence = String(lines[index + 1] || '').trim()
    const thirdEvidence = String(lines[index + 2] || '').trim()
    if (!evidence || !secondEvidence || !thirdEvidence) return
    for (const item of OH_STORY_THREE_PART_CROSS_LINE_BANNED_PATTERNS) {
      item.first.lastIndex = 0
      item.second.lastIndex = 0
      item.third.lastIndex = 0
      const firstMatch = item.first.exec(evidence)
      const secondMatch = item.second.exec(secondEvidence)
      const thirdMatch = item.third.exec(thirdEvidence)
      if (!firstMatch || !secondMatch || !thirdMatch) continue
      hits.push({
        gate: 'A',
        pattern: item.pattern,
        matched_text: `${firstMatch[0]}\n${secondMatch[0]}\n${thirdMatch[0]}`,
        status: item.status,
        evidence: `${evidence}\n${secondEvidence}\n${thirdEvidence}`,
        fix: item.fix,
        line: index + 1,
      })
    }
  })
  return hits
}

export function scanWeakAdverbDensityRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const charCount = Math.max(1, countProseChars(body))
  const counts = OH_STORY_WEAK_ADVERBS
    .map(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const count = (body.match(new RegExp(escaped, 'g')) || []).length
      return { term, count }
    })
    .filter(item => item.count > 0)
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const density = total / charCount * 1000
  if (total <= OH_STORY_WEAK_ADVERB_THRESHOLD_PER_1000 || density <= OH_STORY_WEAK_ADVERB_THRESHOLD_PER_1000) return []
  return [{
    gate: 'A' as const,
    pattern: '弱化副词密度：微微/淡淡/缓缓/轻轻',
    status: 'warn' as const,
    evidence: `弱化副词 ${total} 次，正文约 ${charCount} 字，密度 ${density.toFixed(1)} 次/1000字；${counts.map(item => `${item.term} ${item.count}`).join('，')}。`,
    fix: '按 oh-story 模式2清理弱化副词：每1000字不超过 3 个；能删就删，必须保留时改成具体动作力度、速度、表情或声音变化。',
    line: 0,
  }]
}

export function scanContextSensitiveWordDensityRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const charCount = Math.max(1, countProseChars(body))
  const counts = OH_STORY_CONTEXT_SENSITIVE_WORDS
    .map(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const count = (body.match(new RegExp(escaped, 'g')) || []).length
      return { term, count }
    })
    .filter(item => item.count > 0)
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  const density = total / charCount * 1000
  if (total <= OH_STORY_CONTEXT_SENSITIVE_WORD_THRESHOLD_PER_1000 || density <= OH_STORY_CONTEXT_SENSITIVE_WORD_THRESHOLD_PER_1000) return []
  return [{
    gate: 'A' as const,
    pattern: '语境敏感词密度：突然/好像/瞬间',
    status: 'warn' as const,
    evidence: `语境敏感词 ${total} 次，正文约 ${charCount} 字，密度 ${density.toFixed(1)} 次/1000字；${counts.map(item => `${item.term} ${item.count}`).join('，')}。`,
    fix: '按 oh-story 二级敏感词清理：突然/好像/瞬间不是单次禁用，角色口语、真实突发、时间压缩、视角不确定时可保留；高频时删除偷懒转折，改成动作触发、现场证据、时间推进或角色判断。',
    line: 0,
  }]
}
