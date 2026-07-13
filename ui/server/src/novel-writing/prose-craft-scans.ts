import { countProseChars } from './word-target'

function compactBriefText(value: any, maxChars = 500) {
  const boundedMaxChars = Math.max(1, Math.min(1_000, Number(maxChars) || 500))
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, boundedMaxChars)
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

function proseParagraphLinesWithoutTitle(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  return lines
    .map((line, index) => ({ line: index + 1, text: String(line || '').trim(), isTitle: index === firstContentLine && isLikelyChapterTitleLine(line) }))
    .filter(item => item.text && !item.isTitle)
}

function isShortFragmentedNarrationLine(line: string) {
  const evidence = String(line || '').trim()
  if (!evidence) return false
  if (isLikelyChapterTitleLine(evidence)) return false
  if (/^[“"「].+[”"」][。！？!?，,；;：:]?$/.test(evidence)) return false
  if (/[“"「].+[”"」]/.test(evidence)) return false
  const length = countProseChars(evidence.replace(/[。！？!?，,；;：:]+$/g, ''))
  return length >= 2 && length <= 16
}

export function scanParagraphFragmentationRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  let window: Array<{ line: number; evidence: string }> = []
  const flush = () => {
    if (window.length >= 5 && hits.length === 0) {
      hits.push({
        key: 'paragraph_over_fragmented_short_lines',
        label: '段落碎片化扫描',
        status: 'warn',
        evidence: compactBriefText(window.map(item => item.evidence).join(' / '), 220),
        fix: '连续极短叙述段像提纲或诗行；按戏剧单元合并同一镜头里的动作、感知和反应，只在新动作、新信息、对话或转折处断段。',
        line: window[0].line,
      })
    }
    window = []
  }
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    if (!evidence) {
      flush()
      return
    }
    if (!isShortFragmentedNarrationLine(evidence)) {
      flush()
      return
    }
    window.push({ line: index + 1, evidence })
  })
  flush()
  return hits
}

export function scanParagraphLengthUniformityRisks(text: string) {
  const paragraphs = proseParagraphLinesWithoutTitle(text)
    .filter(item => !/[“"「].+[”"」]/.test(item.text))
    .map(item => ({
      ...item,
      length: countProseChars(item.text),
    }))
    .filter(item => item.length >= 18 && item.length <= 42)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index <= paragraphs.length - 7; index += 1) {
    const window = paragraphs.slice(index, index + 7)
    const lengths = window.map(item => item.length)
    const spread = Math.max(...lengths) - Math.min(...lengths)
    if (spread > 6) continue
    hits.push({
      key: 'paragraph_length_uniformity',
      label: '段落长短节奏扫描',
      status: 'warn',
      evidence: compactBriefText(window.map(item => item.text).join(' / '), 240),
      fix: '打破段落同长度的整齐感：按长短交错和疏密有别重排，爽点/反转压短，推理链、环境压迫和情绪沉淀保留较长段；不要把每个 beat 写成一样长。',
      line: window[0].line,
    })
    break
  }
  return hits
}

const PARAGRAPH_COMMA_CHAIN_DENSITY_MARKERS = [
  /心中涌起/,
  /说不清/,
  /这些年/,
  /走过的路/,
  /很多(?:已经)?(?:忘记|记不清)/,
  /已经忘记/,
  /这一刻/,
  /涌上心头/,
  /往事|过往|回忆|记忆/,
  /感觉|情绪|滋味/,
]

export function scanParagraphCommaChainDensityRisks(text: string) {
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  const paragraphs = proseParagraphLinesWithoutTitle(text)
    .filter(item => !/[“"「].+[”"」]/.test(item.text))

  for (const paragraph of paragraphs) {
    const proseLength = countProseChars(paragraph.text)
    if (proseLength < 38) continue
    const commaCount = (paragraph.text.match(/[，,；;]/g) || []).length
    if (commaCount < 2) continue
    const markerCount = PARAGRAPH_COMMA_CHAIN_DENSITY_MARKERS
      .filter(pattern => pattern.test(paragraph.text))
      .length
    if (markerCount < 3) continue
    hits.push({
      key: `paragraph_comma_chain_density_line_${paragraph.line}`,
      label: '段落密度换气扫描',
      status: 'warn',
      evidence: compactBriefText(paragraph.text, 260),
      fix: '按 oh-story 段落密度诊断修复：逗号串太长、多个完整动作或信息挤在一段里时，需要换气；按动作或信息变化拆开，插入动作、对白或短句。',
      line: paragraph.line,
    })
    break
  }
  return hits
}

export function scanParagraphWallTextRisks(text: string) {
  const paragraphs = proseParagraphLinesWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (const paragraph of paragraphs) {
    const proseLength = countProseChars(paragraph.text)
    if (proseLength < 260) continue
    hits.push({
      key: `paragraph_wall_text_line_${paragraph.line}`,
      label: '网文长段扫描',
      status: 'warn',
      evidence: `第${paragraph.line}行形成 ${proseLength} 字墙文：${compactBriefText(paragraph.text, 220)}`,
      fix: '按中文网文阅读节奏拆段：说话人变化、完整动作、信息变化、角色反应或转折出现时换段；对话尽量独立成段，不改变事件、人物状态和因果顺序。',
      line: paragraph.line,
    })
    break
  }
  return hits
}

const PROSE_MOTION_STRONG_PATTERN = /爆炸|撞|追|逃|杀|打|砍|刺|踢|砸|摔|掀|吐血|流血|冲|扑|抢|夺|撕|推开|撞开|跪|磕头|倒下|摔倒|开枪|开火|反击|阻止|扯|拽|按住|抓住|压住|砸碎|拍碎|砍断/
const PROSE_STILL_BEAT_PATTERN = /擦|理|叠|喂|吹|抚|摸|低头|抬眼|垂眼|目光|看着|望着|盯着|坐|停|沉默|安静|寂静|呼吸|袖口|衣领|灰|茶|碗|杯|灯影|墙根|窗边|门边|指腹|指尖|慢慢|一点一点/

function classifyMotionStillBeat(paragraph: string) {
  const text = String(paragraph || '')
  PROSE_MOTION_STRONG_PATTERN.lastIndex = 0
  PROSE_STILL_BEAT_PATTERN.lastIndex = 0
  const hasMotion = PROSE_MOTION_STRONG_PATTERN.test(text)
  const hasStill = PROSE_STILL_BEAT_PATTERN.test(text)
  if (hasMotion && !hasStill) return 'motion'
  if (hasStill && !hasMotion) return 'still'
  return ''
}

export function scanProseMotionStillRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
    .map((paragraph, index) => ({
      index,
      paragraph,
      beatType: classifyMotionStillBeat(paragraph),
    }))
    .filter(item => item.beatType)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length - 1; index += 1) {
    const current = paragraphs[index]
    const next = paragraphs[index + 1]
    if (current.beatType !== next.beatType) continue
    const isStill = current.beatType === 'still'
    hits.push({
      key: isStill ? 'motion_still_consecutive_still' : 'motion_still_consecutive_motion',
      label: '一动一静节奏扫描',
      status: 'warn',
      evidence: `${isStill ? '连续全静' : '连续全动'}：第${current.index + 1}-${next.index + 1}段｜${compactBriefText(`${current.paragraph} ${next.paragraph}`, 220)}`,
      fix: isStill
        ? '按 oh-story 一动一静重排：动后必静，静后可动；连续全静会拖慢节奏，补入冲突触发、动作推进、选择压力或信息变化。'
        : '按 oh-story 一动一静重排：动后必静，连续全动会造成暴力疲劳；在动作后补微小动作、观察、沉默、身体反应或余波承接。',
    })
    break
  }
  return hits
}

const PROSE_STACKED_BODY_ANCHOR_PATTERN = /手|指|腕|肘|肩|眼|嘴|唇|喉|背|膝|脚|血|汗|呼吸|笔|刀|杯|碗|文书|账本|名单|钥匙|门|纸/g
const PROSE_STACKED_REACTION_PATTERN = /抖|停|顿|偏|歪|压|重写|没稳|发颤|僵|攥|握|松|喘|咽|低|抬|垂|退|缩/
const PROSE_STACKED_NEW_EVENT_PATTERN = /突然|猛地|骤然|却|门后|身后|脚下|头顶|远处|逼近|袭来|扑来|冲来|抽向|射向|砸向|绷直|炸开|裂开|倒塌|追兵|敌人|人影|刀光|枪声|脚步声|警报|威胁|危险/

function proseStackedAnchors(paragraph: string) {
  PROSE_STACKED_BODY_ANCHOR_PATTERN.lastIndex = 0
  const anchors = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = PROSE_STACKED_BODY_ANCHOR_PATTERN.exec(String(paragraph || '')))) {
    anchors.add(match[0])
  }
  return anchors
}

function setsIntersect(left: Set<string>, right: Set<string>) {
  for (const item of left) {
    if (right.has(item)) return true
  }
  return false
}

export function scanProseStackedDescriptionRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .map((paragraph, index) => ({
      index,
      paragraph,
      length: countProseChars(paragraph),
      anchors: proseStackedAnchors(paragraph),
    }))
    .filter(item => item.length >= 2)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 3; index += 1) {
    const first = paragraphs[index]
    const middle = paragraphs[index + 1]
    const last = paragraphs[index + 2]
    if (middle.length > 16 || last.length < 24) continue
    if (middle.anchors.size === 0 || !setsIntersect(middle.anchors, last.anchors)) continue
    if (!setsIntersect(first.anchors, last.anchors) && !setsIntersect(first.anchors, middle.anchors)) continue
    PROSE_STACKED_REACTION_PATTERN.lastIndex = 0
    if (!PROSE_STACKED_REACTION_PATTERN.test(middle.paragraph + last.paragraph)) continue
    PROSE_STACKED_NEW_EVENT_PATTERN.lastIndex = 0
    if (PROSE_STACKED_NEW_EVENT_PATTERN.test(last.paragraph)) continue
    hits.push({
      key: 'prose_stacked_description',
      label: '堆叠式描写扫描',
      status: 'warn',
      evidence: `第${first.index + 1}-${last.index + 1}段疑似把同一动作拆成发生/感知/反应三段：${compactBriefText([first.paragraph, middle.paragraph, last.paragraph].join(' / '), 240)}`,
      fix: '按 oh-story 三维度揉进重写：把发生、感知和身体反应织进同一镜头连续正文，不要把同一个动作拆成三段依次解释或重复扩写。',
    })
    break
  }
  return hits
}

const PROSE_ENVIRONMENT_DETAIL_PATTERN = /窗外|窗|雨|雪|风|雾|云|雷|天色|夜色|阳光|月光|灯|灯笼|光|影|墙|街|路|青石|地面|檐|瓦|积水|水光|空气|潮|冷|热|尘|灰|树|叶|院|厅|走廊|房间|屋|门槛|桌|椅|帘|火|烟|味道/g
const PROSE_ENVIRONMENT_INTERACTION_PATTERN = /[“「].+[”」]|我|你|他|她|少年|少女|男人|女人|老人|孩子|父亲|母亲|师兄|师姐|同伴|队友|手|指|腕|肩|背|膝|脚|眼|嘴|唇|喉|袖|衣|呼吸|心跳|推|拉|抓|握|按|抬|低头|回头|转身|走|跑|退|站|坐|跪|扑|躲|撞|贴|伸手|开门|关门|看见|听见|闻到|摸到|选择|决定|问|说|喊|吼|答|盯|望|瞥|扫/

function countEnvironmentDetails(paragraph: string) {
  PROSE_ENVIRONMENT_DETAIL_PATTERN.lastIndex = 0
  const details = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = PROSE_ENVIRONMENT_DETAIL_PATTERN.exec(String(paragraph || '')))) {
    details.add(match[0])
  }
  return details.size
}

function paragraphHasCharacterEnvironmentInteraction(paragraph: string) {
  PROSE_ENVIRONMENT_INTERACTION_PATTERN.lastIndex = 0
  return PROSE_ENVIRONMENT_INTERACTION_PATTERN.test(String(paragraph || ''))
}

export function scanProseStaticEnvironmentRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .map((paragraph, index) => ({
      index,
      paragraph,
      length: countProseChars(paragraph),
      environmentDetailCount: countEnvironmentDetails(paragraph),
      hasInteraction: paragraphHasCharacterEnvironmentInteraction(paragraph),
    }))
    .filter(item => item.length >= 24 && item.environmentDetailCount >= 3 && !item.hasInteraction)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const current = paragraphs[index]
    const next = paragraphs[index + 1]
    const isLongStaticEnvironment = current.length >= 88 && current.environmentDetailCount >= 5
    const isConsecutiveStaticEnvironment = Boolean(next && next.index === current.index + 1)
    if (!isLongStaticEnvironment && !isConsecutiveStaticEnvironment) continue
    const evidenceParagraphs = isConsecutiveStaticEnvironment && next
      ? [current.paragraph, next.paragraph]
      : [current.paragraph]
    hits.push({
      key: 'prose_static_environment',
      label: '环境交互扫描',
      status: 'warn',
      evidence: `第${current.index + 1}${isConsecutiveStaticEnvironment && next ? `-${next.index + 1}` : ''}段环境描写缺少角色当下交互：${compactBriefText(evidenceParagraphs.join(' / '), 240)}`,
      fix: '按 oh-story 深度限知重写：环境必须被角色当下感知、身体反应、行动压力或信息变化带住；删掉无人承载的风景句，把光线、声音、温度、物件位置写成角色正在注意或利用的线索。',
    })
    break
  }
  return hits
}

const PROSE_CONCRETE_NUMBER_PATTERN = /(?:\d+(?:\.\d+)?|[一二三四五六七八九十百千万亿两]+)(?:块钱|元|万|万块|年|天|个月|次|斤|两|枚|张|本|把|只|道|条|封|页|分|秒|小时)/g
const PROSE_PROP_DETAIL_PATTERN = /账本|账单|收据|钥匙|戒指|金锁|玉佩|项链|手镯|信|照片|名单|合同|文书|刀|剑|枪|药|杯|碗|伞|票|卡|印章|令牌|木马|旧疤|刻度/g
const PROSE_DETAIL_FUNCTION_PATTERN = /欠|还给|还清|偿还|转给|递给|塞给|扔|丢|摔|砸|抢|夺|藏|偷|烧|撕|签|按下|打开|关上|解开|救|杀|伤|威胁|逼|交换|抵押|赔|供|发现|看见|认出|想起|决定|选择|拒绝|承认|揭穿|反转|背叛|决裂|道歉|哭|笑|沉默|发抖|攥|握紧|松开|退后|跪|推开|挡住|证明|暴露|兑现|代价|惩罚|奖励|线索|证据|秘密|真相|关系|姐姐|母亲|父亲|姐夫|恋人|兄弟|师父|仇人/

function countConcreteNumbers(paragraph: string) {
  PROSE_CONCRETE_NUMBER_PATTERN.lastIndex = 0
  const numbers = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = PROSE_CONCRETE_NUMBER_PATTERN.exec(String(paragraph || '')))) {
    numbers.add(match[0])
  }
  return numbers.size
}

function countPropDetails(paragraph: string) {
  PROSE_PROP_DETAIL_PATTERN.lastIndex = 0
  const props = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = PROSE_PROP_DETAIL_PATTERN.exec(String(paragraph || '')))) {
    props.add(match[0])
  }
  return props.size
}

function paragraphHasDetailFunction(paragraph: string) {
  PROSE_DETAIL_FUNCTION_PATTERN.lastIndex = 0
  return PROSE_DETAIL_FUNCTION_PATTERN.test(String(paragraph || ''))
}

export function scanProseDecorativeDetailRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    const length = countProseChars(paragraph)
    const numberCount = countConcreteNumbers(paragraph)
    const propCount = countPropDetails(paragraph)
    if (length < 42 || numberCount + propCount < 4 || numberCount < 1 || propCount < 1) continue
    const nextParagraph = paragraphs[index + 1] || ''
    if (paragraphHasDetailFunction(`${paragraph} ${nextParagraph}`)) continue
    hits.push({
      key: 'prose_decorative_detail',
      label: '道具/数字功能扫描',
      status: 'warn',
      evidence: `第${index + 1}段出现具体数字/道具但缺少叙事功能：${compactBriefText(paragraph, 240)}`,
      fix: '按 oh-story 道具/数字规则重写：数字要承载情感重量、递增伤害或反差暴击；道具要建立关系、触发选择、暴露线索或形成意义翻转。不能只把账本、戒指、钥匙、金额、年限摆在画面里。',
    })
    break
  }
  return hits
}

const PROSE_VAGUE_QUANTITY_WEIGHT_PATTERN = /很多(?:钱|债|账|年|次|遍|东西|事情|怪事)?|很久|好久|多年|无数(?:次|遍|回)?|一遍遍|数不清|不知多少|说不清多少|不多|不少|大笔|一大笔|大量/
const PROSE_QUANTITY_WEIGHT_CONTEXT_PATTERN = /钱|账单|账本|债|欠|还|转来|转给|工资|月俸|收入|年|月|天|等|翻|消息|次数|几次|几遍|相恋|供(?:他|她|我|你)?(?:读书|上学)|攒|赔|利息|罚款/

export function scanVagueQuantityWeightRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 2))
    const windowText = window.join(' ')
    PROSE_VAGUE_QUANTITY_WEIGHT_PATTERN.lastIndex = 0
    PROSE_QUANTITY_WEIGHT_CONTEXT_PATTERN.lastIndex = 0
    if (!PROSE_VAGUE_QUANTITY_WEIGHT_PATTERN.test(windowText)) continue
    if (!PROSE_QUANTITY_WEIGHT_CONTEXT_PATTERN.test(windowText)) continue
    if (countConcreteNumbers(windowText) >= 2) continue
    hits.push({
      key: `prose_vague_quantity_weight_${index + 1}_${index + window.length}`,
      label: '模糊数字重量扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段用模糊数量承载情绪重量：${compactBriefText(windowText, 260)}`,
      fix: '按 oh-story 数字叙事修复：用具体金额、年限、次数、时间或数量替代“很多/很久/无数次/不多”；让数字承担情感重量、伤害递增、反差暴击或时间重量，而不是模糊带过。',
    })
    break
  }
  return hits
}

const PROSE_SPECIFIC_CHARACTER_COUNT_EXPRESSION_PATTERN = /(?:(?:这|那|短短|只|仅|不过)?[一二三四五六七八九十两0-9]{1,3}(?:个)?字(?:一落|落下|砸下去|砸下来|砸下|出口|吐出|响起|压下去|压下来|压下|浮出来|浮现|写着|写下|刻着|刻下)|(?:这|那|短短|只|仅|不过)[一二三四五六七八九十两0-9]{1,3}(?:个)?字)/g

export function scanSpecificCharacterCountExpressionRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  paragraphs.forEach((paragraph, index) => {
    const evidence = compactBriefText(paragraph, 260)
    if (!evidence) return
    PROSE_SPECIFIC_CHARACTER_COUNT_EXPRESSION_PATTERN.lastIndex = 0
    const matched = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = PROSE_SPECIFIC_CHARACTER_COUNT_EXPRESSION_PATTERN.exec(evidence))) {
      matched.add(match[0])
    }
    for (const expression of matched) {
      hits.push({
        key: `specific_character_count_expression_${index + 1}_${hits.length + 1}`,
        label: '具体字数表达扫描',
        status: 'warn',
        evidence,
        fix: `将“${expression}”改成非具体数字表达，如“这句话一落”“这一句落下”“那几个字”“这行字”“话音落下”；只有统计口径明确、已逐字核对且故事确有必要时才保留具体字数。`,
      })
    }
  })
  return hits.slice(0, 8)
}

const PROSE_ABSTRACT_CAMERALESS_PATTERN = /所谓|真相|答案|命运|欲望|选择|结局|意义|审判|宿命|注定|无法回头|一切|所有人|每个人|最终|从来|本质|证明|代价|救赎|绝望|希望|公平|规则|世界|人生/g
const PROSE_CAMERA_ANCHOR_PATTERN = /[“「].+[”」]|我|你|他|她|林|陈|张|李|王|少年|少女|男人|女人|老人|孩子|父亲|母亲|师兄|师姐|同伴|队友|手|手指|指尖|指腹|指节|腕|肩|背|膝|脚|眼|嘴|唇|喉|袖|衣|掌心|呼吸|心跳|钥匙|账本|戒指|门|窗|桌|椅|纸|笔|刀|剑|枪|血|汗|雨|风|灯|脚步|声音|看|听|闻|摸|推|拉|抓|握|按|抬|低头|转身|走|跑|退|站|坐|跪|扑|躲|撞|贴|伸手|开门|关门|问|说|喊|吼|回答|盯|望着|望向|瞥|扫/

function countAbstractCameraTerms(paragraph: string) {
  PROSE_ABSTRACT_CAMERALESS_PATTERN.lastIndex = 0
  const terms = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = PROSE_ABSTRACT_CAMERALESS_PATTERN.exec(String(paragraph || '')))) {
    terms.add(match[0])
  }
  return terms.size
}

function paragraphHasCameraAnchor(paragraph: string) {
  PROSE_CAMERA_ANCHOR_PATTERN.lastIndex = 0
  return PROSE_CAMERA_ANCHOR_PATTERN.test(String(paragraph || ''))
}

export function scanProseCameraAnchorRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    if (countProseChars(paragraph) < 42) continue
    if (countAbstractCameraTerms(paragraph) < 5) continue
    if (paragraphHasCameraAnchor(paragraph)) continue
    hits.push({
      key: 'prose_no_camera_anchor',
      label: '镜头对象扫描',
      status: 'warn',
      evidence: `第${index + 1}段只有抽象判断，缺少可见镜头对象：${compactBriefText(paragraph, 240)}`,
      fix: '按 oh-story 深度限知重写：把抽象判断压进角色身体、物件、动作、声音或现场选择里；每段至少让读者看见一个镜头对象，而不是由作者替读者总结意义。',
    })
    break
  }
  return hits
}

const PROSE_OMNISCIENT_CROWD_CAMERA_PATTERN = /(?:整个(?:大厅|厅堂|审判厅|教室|走廊|院子|广场|会场|屋子|房间)|全(?:场|厅|班|校|院|城|街)|满(?:场|堂)|所有人|每个人|众人|旁观(?:者|弟子)|人群)[^。！？!?]{0,28}(?:陷入(?:死寂|沉默|安静)|鸦雀无声|一片(?:死寂|哗然|安静|沉默)|震惊|愣住|屏住呼吸|倒吸一口凉气|看呆|变了脸色|安静下来|沉默下来|没了声音|全都(?:愣住|震住|沉默|安静)|都被[^。！？!?]{0,12}震住)/

export function scanProseOmniscientCrowdCameraRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (hits.length > 0) return
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    PROSE_OMNISCIENT_CROWD_CAMERA_PATTERN.lastIndex = 0
    if (!PROSE_OMNISCIENT_CROWD_CAMERA_PATTERN.test(evidence)) return
    hits.push({
      key: `omniscient_crowd_camera_line_${index + 1}`,
      label: '深度限知远景扫描',
      status: 'warn',
      evidence,
      fix: '按 oh-story 深度限知重写：不要把镜头拉远成“全场/所有人/整个大厅”的客观总结；改成角色此刻能听见、看见、闻到、摸到或身体感到的局部证据，例如心跳、旁边呼吸声、手指压纸声、某个配角的退缩或一句断掉的对白。',
      line: index + 1,
    })
  })
  return hits
}

const INFODUMP_TERM_PATTERN = /规则|体系|机制|原理|设定|等级|权限|惩罚|契约|名单|身份|能力|境界|组织|历史|来源|通常|一般|所谓|也就是说|这意味着|因此|所以|根据|分为|负责|触发|绑定|自动|条件|限制|管理员/g
const INFODUMP_ACTION_DIALOGUE_PATTERN = /[“「].+[”」]|说道|说完|说着|开口|问|喊|吼|答|推|拉|抓|握|按|抬|转身|后退|冲|跑|追|躲|撞|开门|关门|敲|拿|递|放|撕|打|杀|救|看见|发现|听见|响起|出现|消失|露出|选择|决定|血|痛|伤|死|危险|威胁|反击|[？！!?]/

function countInfodumpTerms(paragraph: string) {
  INFODUMP_TERM_PATTERN.lastIndex = 0
  const terms = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = INFODUMP_TERM_PATTERN.exec(paragraph))) {
    terms.add(match[0])
  }
  return terms.size
}

function paragraphHasActionOrDialogue(paragraph: string) {
  INFODUMP_ACTION_DIALOGUE_PATTERN.lastIndex = 0
  return INFODUMP_ACTION_DIALOGUE_PATTERN.test(paragraph)
}

export function scanInfodumpRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; score?: number }> = []
  paragraphs.forEach((paragraph, index) => {
    const compactLength = countProseChars(paragraph)
    const termCount = countInfodumpTerms(paragraph)
    if (compactLength < 90 || termCount < 5 || paragraphHasActionOrDialogue(paragraph)) return
    hits.push({
      key: `infodump_paragraph_${index + 1}`,
      label: '设定说明扫描',
      status: 'warn',
      score: Math.max(0, 100 - termCount * 8),
      evidence: `第${index + 1}段像设定说明而非事件推进：${compactBriefText(paragraph, 220)}`,
      fix: '把设定信息拆进冲突、动作、对话、规则触发、代价反馈或角色判断里；删掉不影响当前选择的背景说明。',
    })
  })
  return hits
}

const RECAP_FILLER_TERM_PATTERN = /想起|记得|回忆|回想|曾经|以前|过去|之前|先前|当初|那时|那天|昨晚|上一回|从前|旧事|往事|一遍遍|脑海里|这些年|一直以来/g
const RECAP_NEW_PERSPECTIVE_PATTERN = /现在才|终于(?:明白|意识到|发现)|忽然(?:明白|意识到|发现)|线索|证据|破绽|答案|原因|指向|证明|否定|推翻|验证|改变|决定|选择|因此|所以|原来|难怪|这一次|这回|新证据|新判断|新代价|新选择|代价|危险|必须|立刻/

function countRecapFillerTerms(paragraph: string) {
  RECAP_FILLER_TERM_PATTERN.lastIndex = 0
  let count = 0
  while (RECAP_FILLER_TERM_PATTERN.exec(paragraph)) count += 1
  return count
}

export function scanRecapFillerRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; score?: number }> = []
  paragraphs.forEach((paragraph, index) => {
    const compactLength = countProseChars(paragraph)
    const recapTermCount = countRecapFillerTerms(paragraph)
    RECAP_NEW_PERSPECTIVE_PATTERN.lastIndex = 0
    if (compactLength < 80 || recapTermCount < 4) return
    if (RECAP_NEW_PERSPECTIVE_PATTERN.test(paragraph)) return
    hits.push({
      key: `recap_filler_paragraph_${index + 1}`,
      label: '回忆复述水字数扫描',
      status: 'warn',
      score: Math.max(0, 100 - recapTermCount * 10),
      evidence: `第${index + 1}段反复复述前事但缺少新视角：${compactBriefText(paragraph, 240)}`,
      fix: '删掉单纯回忆/复述，或把它改成本章当前冲突中的新证据、新判断、新代价、新选择；每次回看前事都必须改变角色当下行动或读者认知。',
    })
  })
  return hits
}

const EMOTION_TELLING_PATTERN = /感到(?:一阵|一种|无比|十分|非常)?(?:恐惧|害怕|愤怒|悲伤|难过|痛苦|绝望|震惊|惊讶|慌乱|紧张|不安|压迫|孤独|委屈|兴奋|喜悦|羞耻)|心里(?:很|一阵|有些|突然)?(?:慌|怕|疼|酸|沉|乱|空|冷|紧|堵|难受|不安|绝望|委屈)|(?:心中|心里|内心)[^。！？!?；;]{0,12}(?:复杂的?情绪|说不清的?滋味|难以言说的?情绪|五味杂陈)|(?:复杂的?情绪|说不清的?滋味|难以言说的?情绪|五味杂陈)(?:涌上|涌起|泛起|袭来|蔓延|扩散|占据|笼罩|堵在)|(?:恐惧|愤怒|悲伤|绝望|震惊|慌乱|紧张|不安|压迫感|孤独感|羞耻感)(?:涌上|涌起|袭来|蔓延|扩散|占据|笼罩)/
const EMOTION_GROUNDING_PATTERN = /攥|抓|握|按|咬|抖|退|跪|撞|扶|捂|低头|抬头|转身|呼吸|喘|汗|血|指节|喉咙|眼眶|牙|手腕|脚步|肩|背|声音|开口|说道|问|喊|吼|[“「]/

export function scanEmotionTellingRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    EMOTION_TELLING_PATTERN.lastIndex = 0
    EMOTION_GROUNDING_PATTERN.lastIndex = 0
    if (!EMOTION_TELLING_PATTERN.test(evidence) || EMOTION_GROUNDING_PATTERN.test(evidence)) return
    hits.push({
      key: `emotion_telling_line_${index + 1}`,
      label: '情绪动作化扫描',
      status: 'warn',
      evidence,
      fix: '把抽象情绪标签改成身体动作、对话反应、选择代价或可见行为；保留情绪结果，但不要只说“感到/心里很”。',
      line: index + 1,
    })
  })
  return hits
}

const EMOTIONAL_STASIS_CATEGORIES: Array<{ key: string; label: string; regex: RegExp }> = [
  { key: 'fear', label: '恐惧', regex: /恐惧|害怕|怕|惊惧|惊恐|慌乱|紧张|不安|心慌|发慌|压迫感/ },
  { key: 'anger', label: '愤怒', regex: /愤怒|怒火|恼怒|暴怒|火气|气得|恨意|怨恨|不甘/ },
  { key: 'grief', label: '悲伤', regex: /悲伤|难过|痛苦|心酸|酸涩|哽咽|眼眶发热|委屈|孤独/ },
  { key: 'despair', label: '绝望', regex: /绝望|无望|崩溃|麻木|空洞|喘不过气|完了|没有退路/ },
]
const EMOTIONAL_STASIS_PROGRESS_PATTERN = /[“「].+[”」]|问|喊|吼|答|说|抓|握|按|推|拉|抬|低头|转身|后退|冲|跑|追|躲|撞|开门|关门|敲|拿|递|放|撕|打|杀|救|看见|发现|听见|响起|出现|消失|露出|选择|决定|必须|不能|否则|代价|线索|真相|身份|危险|威胁|阻止|反击|成功|解决|通过|拿到|改变|[？！!?]/

function classifyEmotionalStasisParagraph(paragraph: string) {
  const text = String(paragraph || '')
  return EMOTIONAL_STASIS_CATEGORIES.find(category => {
    category.regex.lastIndex = 0
    return category.regex.test(text)
  }) || null
}

function paragraphHasEmotionalProgress(paragraph: string) {
  EMOTIONAL_STASIS_PROGRESS_PATTERN.lastIndex = 0
  return EMOTIONAL_STASIS_PROGRESS_PATTERN.test(String(paragraph || ''))
}

export function scanEmotionalStasisRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 18)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  let run: Array<{ paragraph: string; index: number; category: { key: string; label: string; regex: RegExp } }> = []
  const flush = () => {
    if (run.length >= 3 && hits.length === 0) {
      const window = run.slice(0, 3)
      hits.push({
        key: `emotional_stasis_${window[0].category.key}_${window[0].index}_${window[window.length - 1].index}`,
        label: '情绪原地打转扫描',
        status: 'warn',
        evidence: `第${window[0].index}-${window[window.length - 1].index}段连续${window[0].category.label}但缺少推进：${compactBriefText(window.map(item => item.paragraph).join(' '), 260)}`,
        fix: '按 oh-story 情绪弧修复：连续同一情绪不能只换说法重复；把其中至少两段改成动作、对白、新信息、选择代价、关系变化或阶段性释放，让情绪完成调动 -> 行动/转折 -> 释放。',
      })
    }
    run = []
  }
  paragraphs.forEach((paragraph, index) => {
    const category = classifyEmotionalStasisParagraph(paragraph)
    if (!category || paragraphHasEmotionalProgress(paragraph)) {
      flush()
      return
    }
    if (run.length > 0 && run[run.length - 1].category.key !== category.key) {
      flush()
    }
    run.push({ paragraph, index: index + 1, category })
  })
  flush()
  return hits
}

const INTERNAL_MONOLOGUE_PATTERN = /(?:突然|终于|这才|猛地|渐渐|慢慢)?(?:明白|懂了|意识到|知道|发现|想起|想明白|反应过来)|心里(?:想|想着|明白|清楚|知道)|脑子里(?:闪过|想起|冒出)|(?:他|她|我)[^。！？!?]{0,8}(?:想|明白|意识到|知道|发现|想起)/
const PARENTHETICAL_INTERNAL_MONOLOGUE_PATTERN = /[（(][^）)]{0,80}(?:心想|内心|心理活动|OS|os|想道|想着|暗想)[^）)]{0,120}[）)]/

function isInternalMonologueSentence(line: string) {
  const evidence = String(line || '').trim()
  if (!evidence || isLikelyChapterTitleLine(evidence)) return false
  if (/[“"「].+[”"」]/.test(evidence)) return false
  if (countProseChars(evidence) < 8) return false
  INTERNAL_MONOLOGUE_PATTERN.lastIndex = 0
  return INTERNAL_MONOLOGUE_PATTERN.test(evidence)
}

export function scanInternalMonologueRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  let run: Array<{ line: number; evidence: string }> = []
  const flush = () => {
    if (run.length >= 3 && hits.length === 0) {
      hits.push({
        key: `internal_monologue_run_${run[0].line}_${run[run.length - 1].line}`,
        label: '内心独白压缩扫描',
        status: 'warn',
        evidence: compactBriefText(run.map(item => item.evidence).join(' / '), 260),
        fix: '按 oh-story 可读性门禁：连续3句以上内心独白要压缩为1句，或拆成动作、对白、物件触感、身体反应和现场选择；不要让角色在脑内完整解释动机和局势。',
        line: run[0].line,
      })
    }
    run = []
  }
  lines.forEach((line, index) => {
    const evidence = String(line || '').trim()
    if (!evidence) {
      return
    }
    if (hits.length === 0 && PARENTHETICAL_INTERNAL_MONOLOGUE_PATTERN.test(evidence)) {
      hits.push({
        key: `parenthetical_internal_monologue_line_${index + 1}`,
        label: '括号内心活动扫描',
        status: 'warn',
        evidence,
        fix: '按 oh-story 心理描写规则修复：不要用括号标注内心活动，这会破坏代入感；把心声自然融入叙事，用行为暗示心理，用沉默、动作、物件触感或反常行为表达内心。',
        line: index + 1,
      })
    }
    if (!isInternalMonologueSentence(evidence)) {
      flush()
      return
    }
    run.push({ line: index + 1, evidence })
  })
  flush()
  return hits
}
