import { countProseChars } from './word-target'
import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function compactBriefText(value: any, fallback = '') {
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

function mergedContextChapterTarget(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  const runtimeHas = (field: string) => Object.prototype.hasOwnProperty.call(runtimeTarget, field) && runtimeTarget[field] !== undefined
  const aliasPairs = [
    ['chapterNo', 'chapter_no'],
    ['endingHook', 'ending_hook'],
    ['previousHandoff', 'previous_handoff'],
    ['wordTarget', 'word_target'],
  ]
  for (const [camelField, snakeField] of aliasPairs) {
    if (!runtimeHas(camelField)) continue
    merged[snakeField] = runtimeTarget[camelField]
  }
  return merged
}

const ENTRY_PROMISE_SIGNAL_TERMS = [
  '系统', '面板', '金手指', '检测', '血缘', '妈妈', '母亲', '爸爸', '父亲',
  '重生', '穿越', '空间', '签到', '直播', '弹幕', '末世', '天灾', '种田',
  '修仙', '宗门', '寒门', '阵法', '诡异', '怪谈', '规则', '超人', '异能',
  '升级', '逆袭', '赘婿', '复仇', '打脸', '反派', '女配', '真假千金',
  '豪门', '娱乐圈', '探案', '悬疑', '无限流', '经营', '基建',
]

function entryPromiseSourceTexts(project: any = {}, contextPackage: any = {}) {
  const bible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = bible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const target = mergedContextChapterTarget(contextPackage)
  const brief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const genreContract = target.genre_positioning_contract || target.genrePositioningContract || contextPackage?.genre_positioning_contract || contextPackage?.genrePositioningContract || brief.genre_positioning_contract || brief.genrePositioningContract || {}
  const targetReaderContract = target.target_reader_contract || target.targetReaderContract || contextPackage?.target_reader_contract || contextPackage?.targetReaderContract || brief.target_reader_contract || brief.targetReaderContract || {}
  return [
    project?.title,
    project?.synopsis,
    bible?.promise,
    bible?.reader_promise,
    bible?.readerPromise,
    bible?.core_selling_point,
    bible?.coreSellingPoint,
    bible?.golden_finger,
    bible?.goldenFinger,
    commercial?.innovation_hook,
    commercial?.innovationHook,
    commercial?.retention_strategy,
    commercial?.retentionStrategy,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
    target?.reader_promise,
    target?.readerPromise,
    target?.payoff,
    target?.summary,
    brief?.reader_promise,
    brief?.readerPromise,
    brief?.core_selling_point,
    brief?.coreSellingPoint,
    brief?.golden_finger,
    brief?.goldenFinger,
    brief?.reader_payoff,
    brief?.readerPayoff,
    brief?.core_payoff,
    brief?.corePayoff,
    ...asArray(genreContract?.core_hook_rules || genreContract?.coreHookRules),
    ...asArray(genreContract?.goldfinger_fit_rules || genreContract?.goldfingerFitRules),
    ...asArray(genreContract?.must_have_scenes || genreContract?.mustHaveScenes),
    ...asArray(targetReaderContract?.reader_desires || targetReaderContract?.readerDesires),
    ...asArray(targetReaderContract?.chapter_attractions || targetReaderContract?.chapterAttractions),
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
}

function extractEntryPromiseSignals(project: any = {}, contextPackage: any = {}) {
  const combined = entryPromiseSourceTexts(project, contextPackage).join('。')
  const signals = new Set<string>()
  for (const term of ENTRY_PROMISE_SIGNAL_TERMS) {
    if (combined.includes(term)) signals.add(term)
  }
  return Array.from(signals).slice(0, 12)
}

export function scanEntryPromiseAlignmentRisks(project: any = {}, contextPackage: any = {}, text: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || 0)
  if (chapterNo > 3) return []
  const sourceTexts = entryPromiseSourceTexts(project, contextPackage)
  const signals = extractEntryPromiseSignals(project, contextPackage)
  if (signals.length < 2) return []
  const openingText = compactText(proseBodyWithoutTitleLine(text), 1200)
  const matched = signals.filter(signal => openingText.includes(signal))
  if (matched.length >= Math.min(2, signals.length)) return []
  return [{
    key: 'entry_promise_mismatch',
    label: '入口承诺对齐扫描',
    status: 'warn' as const,
    evidence: `入口承诺来源：${compactBriefText(sourceTexts.join('；'), 220)}；承诺信号：${signals.join('、')}；开篇1200字只命中：${matched.join('、') || '无'}。`,
    fix: '按 oh-story 书名/简介/开篇三位一体修复：前3章必须让书名和简介承诺的核心卖点进入正文证据；把核心系统、金手指、身份反差、题材事件或第一个爽点写成角色当下可见的动作、检测、选择、代价或结果。',
  }]
}

function openingCoreConflictText(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const brief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  const blueprint = target.chapter_blueprint || target.chapterBlueprint || contextPackage?.chapter_blueprint || {}
  const plotLines = blueprint?.plot_lines || blueprint?.plotLines || {}
  return compactBriefText(
    target.core_conflict
    || target.coreConflict
    || target.conflict
    || brief.core_conflict
    || brief.coreConflict
    || blueprint?.core_conflict
    || blueprint?.coreConflict
    || plotLines?.logic_line
    || plotLines?.logicLine
    || plotLines?.mainline,
  )
}

export function scanOpeningConflictAlignmentRisks(contextPackage: any = {}, text: string) {
  const conflict = openingCoreConflictText(contextPackage)
  if (countProseChars(conflict) < 8) return []
  const body = proseBodyWithoutTitleLine(text)
  if (!body) return []
  const opening = compactText(body, 300)
  const match = anchorMatchScore(conflict, opening)
  if (match.score >= 24 || match.matched.length >= 2) return []
  return [{
    key: 'opening_core_conflict_missing',
    label: '开篇核心冲突扫描',
    status: 'warn' as const,
    evidence: `计划核心冲突：${compactText(conflict, 160)}；前 300 字命中：${match.matched.join('、') || '无'}；开篇：${opening}`,
    fix: '按 oh-story 开头速查修复：前 300 字必须让读者知道本章核心矛盾或具体阻碍，把冲突写成角色当下遭遇的逼问、拦阻、危险、选择或代价，不要先铺环境、心情或过场。',
    source: 'oh_story_opening_core_conflict',
  }]
}

const ENDING_SUMMARY_PATTERN = /经历了这一切|这一切|终于|总算|明白|意识到|新的生活|新的开始|才刚刚开始|未来|命运|从此|就这样|接下来/
const ENDING_HOOK_SIGNAL_PATTERN = /死|血|敲门|门外|敲|广播|规则|倒计时|必须(?:在|去|把|拿|杀|救|选|打开|交出|找到)|不能(?:再|让|离开|进入|打开)|如果|否则|发现|看见|露出|响起|停在|名字|名单|选择|代价|真相|危机|危险|突然|问|[？！!?“「]/

export function scanEndingHookRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const compactBody = body.replace(/\s+/g, '')
  const tail = compactBody.slice(-120)
  const evidence = body.replace(/\s+/g, ' ').slice(-220).trim()
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  if (!body) return hits

  ENDING_SUMMARY_PATTERN.lastIndex = 0
  ENDING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (ENDING_SUMMARY_PATTERN.test(tail) && !ENDING_HOOK_SIGNAL_PATTERN.test(tail)) {
    hits.push({
      key: 'ending_summary_without_hook',
      label: '章尾钩子扫描',
      status: 'warn',
      evidence,
      fix: '最后100字不要落在总结、感悟或“新的开始”，改成危机、决定、发现、反转、物件变化或下一章必须处理的问题。',
    })
  }

  ENDING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (!ENDING_HOOK_SIGNAL_PATTERN.test(tail)) {
    hits.push({
      key: 'ending_hook_missing',
      label: '章尾钩子扫描',
      status: 'warn',
      evidence,
      fix: '最后100字必须留下可追读的问题、危险、决定、发现或反转，并和下一章行动直接相连。',
    })
  }
  return hits
}

const SUDDEN_ENDING_CLUE_TRIGGER_PATTERN = /突然|忽然|猛地|这时|正要(?:离开|关门|收手|转身)|刚要|下一刻|掉出|掉下|露出|浮出|弹出|滑出|滚出|亮起|出现/
const SUDDEN_ENDING_CLUE_ITEM_PATTERN = /第二本账册|旧账册|账册|账本|名单|名册|缺页|钥匙|禁地钥匙|门牌|编号|纸条|照片|录音|报告|档案|旧印|印章|玉牌|令牌|血字|夹页|暗格|抽屉/
const SUDDEN_CLUE_WARMUP_ANCHOR_PATTERN = /账册|账本|旧账|名单|名册|缺页|钥匙|门牌|编号|纸条|照片|录音|报告|档案|旧印|印章|玉牌|令牌|血字|夹页|暗格|抽屉|桌下|缝里|齿痕|线索|证据/

function hasSuddenEndingClue(paragraph: string) {
  const text = String(paragraph || '')
  SUDDEN_ENDING_CLUE_TRIGGER_PATTERN.lastIndex = 0
  SUDDEN_ENDING_CLUE_ITEM_PATTERN.lastIndex = 0
  return SUDDEN_ENDING_CLUE_TRIGGER_PATTERN.test(text) && SUDDEN_ENDING_CLUE_ITEM_PATTERN.test(text)
}

export function scanSuddenEndingClueRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  if (paragraphs.length < 3) return hits
  const endingStart = Math.max(0, paragraphs.length - 3)
  const endingParagraphs = paragraphs.slice(endingStart)
  const endingClueOffset = endingParagraphs.findIndex(hasSuddenEndingClue)
  if (endingClueOffset < 0) return hits
  const endingClueIndex = endingStart + endingClueOffset
  const warmupText = paragraphs.slice(0, endingClueIndex).join(' ')
  SUDDEN_CLUE_WARMUP_ANCHOR_PATTERN.lastIndex = 0
  if (SUDDEN_CLUE_WARMUP_ANCHOR_PATTERN.test(warmupText)) return hits
  hits.push({
    key: 'sudden_ending_clue_without_warmup',
    label: '章尾线索预热扫描',
    status: 'warn',
    evidence: `章尾突然出现关键线索但前文缺少预热：${compactBriefText(endingParagraphs.join(' '), 280)}`,
    fix: '按 oh-story 长篇节奏修复：重要线索不能只在章尾突然冒出来；前文至少预热一次物件位置、缺页、钥匙齿痕、异常反应或可回看的细节，再让章尾钩子升级压力。',
  })
  return hits
}

const OPENING_HOOK_ECHO_MARKERS = [
  { key: 'evidence', label: '证据钩子', pattern: /证据|报告|录音|监控|视频|截图|账册|账本|档案|名单|合同|印章|证词|口供|碎纸|缺页|转账|流水/ },
  { key: 'threat', label: '威胁钩子', pattern: /警报|广播|倒计时|规则|惩罚|死亡|清除|禁止|必须|不能|否则|威胁|逼(?:他|她|主角|[一-龥]{2,4})/ },
  { key: 'missing', label: '失踪/异常钩子', pattern: /失踪|不见|消失|门外|敲门|尖叫|血迹|尸体|黑影|陌生人|第二个人/ },
  { key: 'identity', label: '身份钩子', pattern: /身份|名字|名单|父亲|母亲|哥哥|姐姐|妹妹|弟弟|主谋|幕后|背后的人|真正的(?:凶手|主人|继承人)/ },
]
const OPENING_HOOK_CARRY_FORWARD_PATTERN = /指向|背后|还(?:没|未)|没有结束|没完|下一步|必须|只能|否则|真相|露出|名字|名单|源头|主谋|幕后|审判长|父亲|母亲|另一份|第二份|真正的/

function openingHookEchoMarker(text: string) {
  const source = String(text || '')
  return OPENING_HOOK_ECHO_MARKERS.find(marker => {
    marker.pattern.lastIndex = 0
    return marker.pattern.test(source)
  }) || null
}

export function scanOpeningHookEchoRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  if (paragraphs.length < 4) return []
  const openingWindow = paragraphs.slice(0, 2).join(' ')
  const marker = openingHookEchoMarker(openingWindow)
  if (!marker) return []
  const endingWindow = paragraphs.slice(Math.max(0, paragraphs.length - 3)).join(' ')
  marker.pattern.lastIndex = 0
  if (marker.pattern.test(endingWindow)) return []
  OPENING_HOOK_CARRY_FORWARD_PATTERN.lastIndex = 0
  if (OPENING_HOOK_CARRY_FORWARD_PATTERN.test(endingWindow)) return []
  return [{
    key: 'opening_hook_not_echoed',
    label: '开篇钩子回收扫描',
    status: 'warn' as const,
    evidence: `开篇抛出${marker.label}，但章尾没有回收或转成下一章债务：开篇=${compactBriefText(openingWindow, 160)}；章尾=${compactBriefText(endingWindow, 180)}`,
    fix: '按 oh-story 章尾和钩子回收规则修复：开篇钩子必须在章尾被回收、升级、反转或明确转成下一章要处理的问题；不要让证据、警报、失踪、身份疑点在中途消失。',
    source: 'oh_story_opening_hook_echo',
  }]
}

const PARAGRAPH_HOOK_SIGNAL_PATTERN = /[“「].+[”」]|[？！!?]|不知道|秘密|真相|名单|身份|遗嘱|死亡证明|亲子鉴定|录音|证据|倒计时|还剩|最后(?:三|两|一|\d+)|十秒|期限|立刻|马上|突然|竟然|反而|下一页|不是[^。！？!?]{0,18}而是|没说话|藏|暗牌|打脸|报告|举报|代价|失去|完了|孩子|女儿|儿子|四岁|不该|异常|变了|钥匙|纸条|血|芒果味|月子中心|冷静|笑着点头|必须|不能|如果|否则|威胁|逼|选择|决定|发现|看见|听见|问|喊|吼|骂|滚|闭嘴|放开|按下|发送|打开|拿出|抢|夺|拦|阻止|反击|失败/

function paragraphHasHookSignal(paragraph: string) {
  PARAGRAPH_HOOK_SIGNAL_PATTERN.lastIndex = 0
  return PARAGRAPH_HOOK_SIGNAL_PATTERN.test(String(paragraph || ''))
}

export function scanParagraphHookStallRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index <= paragraphs.length - 4; index += 1) {
    const window = paragraphs.slice(index, index + 4)
    if (window.some(paragraphHasHookSignal)) continue
    hits.push({
      key: `paragraph_hook_stall_${index + 1}_${index + 4}`,
      label: '段落级钩子扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + 4}段缺少信息/风险/选择/异常推进：${compactBriefText(window.join(' '), 240)}`,
      fix: '按 oh-story 段落级钩子补微推进：至少加入信息差、倒计时、反转、暗牌、打脸、代价、弱者、异常物件、冷发现、对话压迫或不公平伤害之一；不要让连续段落只停在环境、姿态或静态说明。',
    })
    break
  }
  return hits
}
