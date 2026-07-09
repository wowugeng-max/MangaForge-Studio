const DIALOGUE_HIGH_PRESSURE_BEAT_PATTERN = /(?:高压|生死|悲痛|严肃|血|尸|倒下|断气|呼吸只剩|伤口|死亡|死了|临死|哭|崩溃|绝望|刀|剑|枪|爆炸|威胁|认罪|审判|封条下渗|门槛边|祭坛|追杀|濒死)/
const DIALOGUE_MEME_JOKE_PATTERN = /(?:笑死|整活|翻车现场|大型[^。！？\n]{0,8}现场|开玩笑|哈哈|呵呵|太逗了|乐死|乐了|绝了|吐槽|玩梗|梗|段子|骚话|卧槽那句话|你懂我意思|这也太会)/
const DIALOGUE_SAFE_BREATH_PATTERN = /(?:安全|喘息|事后|危机解除|门已经封住|血止住|没人再追|终于能喘|暂时安全)/
const DIALOGUE_DETACHED_JOKE_PATTERN = /(?:和剧情无关|脱离剧情|只是(?:讲|说)个段子|讲个段子|说个笑话|为了搞笑|硬玩梗|硬塞梗|保证大家都笑|大家都笑死)/
const DIALOGUE_HUMOR_FUNCTION_PATTERN = /(?:想装|装作|装酷|翻车|误判|看走眼|嘴硬|逞强|偏见|固执|熟人|关系|互损|调侃|改口|作证|站队|欠了|人情|代价|后果|暴露|身份|指纹|账本|封条|下一场|审问|挡住|必须)/
const DIALOGUE_CALLBACK_REPEAT_PATTERN = /(?:同一个梗|同样的梗|老梗|上次那个梗|又讲|又说|重复了一遍|重复同一个|原样复读|说法和上次一样|和上次一样)/
const DIALOGUE_CALLBACK_NO_UPGRADE_PATTERN = /(?:没有更尴尬|没有更公开|没有更严重|没有升级|没有新后果|没有代价|原样推进|只是笑了一下)/
const DIALOGUE_CALLBACK_UPGRADE_PATTERN = /(?:更尴尬|更公开|更严重|满堂|当众|所有人|更多人|公开|失去解释权|欠下|人情|代价|后果|关系变化|站队|改口|升级|指纹|证据)/
const DIALOGUE_HUMOR_NO_AFTERMATH_PATTERN = /(?:只是笑了一下|只笑了一下|笑完(?:就)?算|笑过(?:就)?算|没有(?:任何)?关系变化|没有(?:任何)?后续代价|没有(?:任何)?新后果|没有(?:任何)?影响|审问继续原样推进|继续原样推进|原样推进)/
const DIALOGUE_HUMOR_AFTERMATH_PATTERN = /(?:笑声(?:刚起)?就停住|改口|作证|站队|退开|暴露|失去解释权|欠下|人情|代价|后果|关系变化|下一场|必须|当场|公开|指纹|证据)/

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

function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function extractStandaloneDialogueQuote(line: string) {
  const evidence = String(line || '').trim()
  const match = evidence.match(/^[“"「]([^”"」]+)[”"」][。！？!?，,；;：:]?$/)
  return match ? String(match[1] || '').trim() : ''
}

export function scanDialogueHighPressureMemeRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return
    if (!DIALOGUE_MEME_JOKE_PATTERN.test(quote)) return
    const context = lines
      .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join(' ')
    if (DIALOGUE_SAFE_BREATH_PATTERN.test(context)) return
    if (!DIALOGUE_HIGH_PRESSURE_BEAT_PATTERN.test(context)) return
    hits.push({
      key: `dialogue_high_pressure_meme_line_${index + 1}`,
      label: '高压玩梗扫描',
      status: 'warn',
      evidence: compactBriefText(context, 260),
      fix: '按 oh-story 场合例外修复：高压/生死/悲痛/严肃 beat 里，搞笑担当和轻快配角的玩笑、口头梗、插科打诨要收敛；声线让位于当前情绪基调，用短、冷、带情绪重量的反应替代。梗只在安全或喘息 beat 放。',
      line: index + 1,
    })
  })
  return hits.slice(0, 2)
}

export function scanDialogueDetachedJokeRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return
    if (!DIALOGUE_MEME_JOKE_PATTERN.test(quote) && !DIALOGUE_DETACHED_JOKE_PATTERN.test(quote)) return
    const context = lines
      .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join(' ')
    if (DIALOGUE_HIGH_PRESSURE_BEAT_PATTERN.test(context)) return
    const detached = DIALOGUE_DETACHED_JOKE_PATTERN.test(context)
    const hasFunction = DIALOGUE_HUMOR_FUNCTION_PATTERN.test(context)
    if (!detached && hasFunction) return
    hits.push({
      key: `dialogue_detached_joke_line_${index + 1}`,
      label: '脱剧情段子扫描',
      status: 'warn',
      evidence: compactBriefText(context, 260),
      fix: '按 oh-story 幽默规则修复：幽默来自角色欲望、偏见、固执或误判，不是脱离剧情的段子；包袱必须改变地位、暴露关系或制造未来代价。把段子改成装酷翻车、熟人互损、误判暴露、关系变化或后续欠账。',
      line: index + 1,
    })
  })
  return hits.slice(0, 2)
}

export function scanDialogueFlatCallbackRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  paragraphs.forEach((paragraph, index) => {
    const evidence = String(paragraph || '').trim()
    if (!DIALOGUE_CALLBACK_REPEAT_PATTERN.test(evidence)) return
    const window = paragraphs
      .slice(Math.max(0, index - 1), Math.min(paragraphs.length, index + 2))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join(' ')
    const noUpgrade = DIALOGUE_CALLBACK_NO_UPGRADE_PATTERN.test(window)
    const upgraded = DIALOGUE_CALLBACK_UPGRADE_PATTERN.test(window) && !noUpgrade
    if (!noUpgrade || upgraded) return
    hits.push({
      key: `dialogue_flat_callback_line_${index + 1}`,
      label: '回调未升级扫描',
      status: 'warn',
      evidence: compactBriefText(window, 260),
      fix: '按 oh-story 幽默回调规则修复：回调必须升级，至少更尴尬、更公开或更严重；不要原样复读同一个梗。把回调改成暴露关系、改变地位、制造未来代价，或让更多人在更高压力下看见。',
      line: index + 1,
    })
  })
  return hits.slice(0, 2)
}

export function scanDialogueHollowHumorPayoffRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    const quote = extractStandaloneDialogueQuote(line)
    if (!quote) return
    if (!DIALOGUE_MEME_JOKE_PATTERN.test(quote)) return
    const context = lines
      .slice(Math.max(0, index - 2), Math.min(lines.length, index + 4))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join(' ')
    if (!DIALOGUE_HUMOR_NO_AFTERMATH_PATTERN.test(context)) return
    const positiveAftermathContext = lines
      .slice(index + 1, Math.min(lines.length, index + 4))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .filter(item => !DIALOGUE_HUMOR_NO_AFTERMATH_PATTERN.test(item))
      .join(' ')
    if (DIALOGUE_HUMOR_AFTERMATH_PATTERN.test(positiveAftermathContext)) return
    hits.push({
      key: `dialogue_hollow_humor_payoff_line_${index + 1}`,
      label: '包袱无余波扫描',
      status: 'warn',
      evidence: compactBriefText(context, 260),
      fix: '按 oh-story 幽默规则修复：铺垫要短，回报要清晰，余波比包袱本身更重要；包袱落地后必须改变地位、暴露关系或制造未来代价。把“只是笑一下”改成改口、站队、证据暴露、关系欠账或下一场压力。',
      line: index + 1,
    })
  })
  return hits.slice(0, 2)
}
