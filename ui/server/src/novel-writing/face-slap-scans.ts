import { countProseChars } from './word-target'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function proseBodyWithoutTitleLine(text: string) {
  return String(text || '').replace(/^第[^\n]{1,40}\n+/, '').trim()
}

function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function mergedContextChapterTarget(contextPackage: any = {}) {
  const legacy = contextPackage?.chapter_target && typeof contextPackage.chapter_target === 'object'
    ? contextPackage.chapter_target
    : {}
  const runtime = contextPackage?.chapterTarget && typeof contextPackage.chapterTarget === 'object'
    ? contextPackage.chapterTarget
    : {}
  return { ...legacy, ...runtime }
}

const FACE_SLAP_PAYOFF_PATTERN = /(?:当众)?打脸|反证|翻盘|洗清|真相(?:公开|揭开|曝光|大白)|栽赃失败|证据(?:摆|甩|摊开|公开|曝光)|(?:检测|鉴定|审计|验伤|转账|亲子鉴定)?报告|录音|监控|视频|截图|账册|旧账册/
const ANTAGONIST_GLOAT_OR_PRESSURE_PATTERN = /(?:反派|对手|执事|会长|长老|族长|老板|总裁|主管|审判长|管理员|台下|众人|他们|他|她)[^。！？!?]{0,36}(?:冷笑|嘲笑|讥笑|嗤笑|得意|胜券在握|逼|催|压|认罪|认输|交出|跪下|求饶|摔|起哄|指认|污蔑|栽赃|你输了|不可能|废物)|(?:冷笑|嘲笑|讥笑|嗤笑|得意|胜券在握|逼(?:他|她|主角|[一-龥]{2,4})|催(?:他|她|主角|[一-龥]{2,4})|起哄|认罪|认输|交出|跪下|求饶|你输了|废物)/

function paragraphHasFaceSlapPayoff(paragraph: string) {
  FACE_SLAP_PAYOFF_PATTERN.lastIndex = 0
  return FACE_SLAP_PAYOFF_PATTERN.test(String(paragraph || ''))
}

function textHasAntagonistGloatOrPressure(text: string) {
  ANTAGONIST_GLOAT_OR_PRESSURE_PATTERN.lastIndex = 0
  return ANTAGONIST_GLOAT_OR_PRESSURE_PATTERN.test(String(text || ''))
}

export function scanFaceSlapRhythmRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; source: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (index < 2 || !paragraphHasFaceSlapPayoff(paragraphs[index])) continue
    const priorWindow = paragraphs.slice(Math.max(0, index - 5), index).join(' ')
    const payoffWindow = paragraphs.slice(index, Math.min(paragraphs.length, index + 2)).join(' ')
    if (textHasAntagonistGloatOrPressure(priorWindow)) continue
    hits.push({
      key: 'face_slap_without_antagonist_pressure',
      label: '打脸节奏扫描',
      status: 'warn',
      evidence: `第${index + 1}段出现打脸/反证兑现，但前文缺少反派得意或压迫铺垫：${compactBriefText(`${priorWindow} ${payoffWindow}`, 280)}`,
      fix: '按 oh-story 打脸节奏修复：打脸前先让反派得意误判、公开压迫、逼主角认输/认罪或让旁观者起哄；再用证据、暗牌或短句反打，形成“先扬后抑”的爽感。',
      source: 'oh_story_face_slap_rhythm',
    })
    break
  }
  return hits
}

const EVIDENCE_CHAIN_MARKERS = [
  { key: 'recording', label: '录音', pattern: /录音|录音笔|语音|红点/ },
  { key: 'surveillance', label: '监控', pattern: /监控|视频|录像|摄像头/ },
  { key: 'report', label: '报告', pattern: /检测报告|鉴定报告|验伤报告|审计报告|报告/ },
  { key: 'transfer', label: '转账截图', pattern: /转账|流水|收款|付款|截图|账单/ },
  { key: 'ledger', label: '账册', pattern: /账册|账本|旧账|账目|缺页/ },
  { key: 'document', label: '档案', pattern: /档案|名单|遗嘱|合同|签名|印章|记录/ },
  { key: 'witness', label: '证人证词', pattern: /证人|证词|口供|作证/ },
]

function evidenceMarkersInText(text: string) {
  const source = String(text || '')
  return EVIDENCE_CHAIN_MARKERS.filter(marker => {
    marker.pattern.lastIndex = 0
    return marker.pattern.test(source)
  })
}

export function scanEvidenceChainDumpRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; source: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const currentMarkers = evidenceMarkersInText(paragraphs[index])
    if (currentMarkers.length < 3) continue
    const currentPayoff = paragraphHasFaceSlapPayoff(paragraphs[index]) || /反证|真相|栽赃|大屏|公开|当场|一起|全部|所有/.test(paragraphs[index])
    if (!currentPayoff) continue
    const priorMarkers = new Set(
      paragraphs
        .slice(Math.max(0, index - 8), index)
        .flatMap(paragraph => evidenceMarkersInText(paragraph).map(marker => marker.key)),
    )
    if (priorMarkers.size >= 2) continue
    hits.push({
      key: 'evidence_chain_dumped_once',
      label: '证据链分批释放扫描',
      status: 'warn',
      evidence: `第${index + 1}段一次性释放 ${currentMarkers.map(marker => marker.label).join('、')}：${compactBriefText(paragraphs[index], 260)}`,
      fix: '按 oh-story 证据链完整性修复：证据必须分批释放，先给线索/小证据造成动摇，再让反派误判或自爆，最终证据最致命并改变全局认知；不要把录音、监控、报告、截图、账册一次性全倒出来。',
      source: 'oh_story_evidence_chain',
    })
    break
  }
  return hits
}

const FINAL_EVIDENCE_GLOBAL_IMPACT_PATTERN = /主谋|审判长|院长|会长|族长|掌门|老板|集团|官方|法院|警局|高层|幕后|背后|黑幕|资金链|交易链|规则(?:改写|改变|失效|漏洞|源头)|身份(?:曝光|反转|坐实)|资格(?:取消|改写|恢复)|全局|彻底变了性质|不再是|而是|根源|本质|推翻|牵出|逮捕|追责|封杀|开除|处分|死亡|清除|全(?:场|校|网|城)|整个(?:审判庭|家族|集团|宗门|规则)/

function paragraphHasFinalEvidenceGlobalImpact(paragraph: string) {
  FINAL_EVIDENCE_GLOBAL_IMPACT_PATTERN.lastIndex = 0
  return FINAL_EVIDENCE_GLOBAL_IMPACT_PATTERN.test(String(paragraph || ''))
}

export function scanFinalEvidenceImpactRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const evidenceRows = paragraphs
    .map((paragraph, index) => ({
      index,
      paragraph,
      markers: evidenceMarkersInText(paragraph),
    }))
    .filter(row => row.markers.length > 0)
  if (evidenceRows.length < 3) return []

  const finalRow = evidenceRows[evidenceRows.length - 1]
  const impactWindow = paragraphs
    .slice(finalRow.index, Math.min(paragraphs.length, finalRow.index + 2))
    .join(' ')
  if (paragraphHasFinalEvidenceGlobalImpact(impactWindow)) return []
  return [{
    key: 'final_evidence_lacks_global_impact',
    label: '最终证据强度扫描',
    status: 'warn' as const,
    evidence: `最终证据只停在局部反证：${compactBriefText(impactWindow, 260)}`,
    fix: '按 oh-story 证据链完整性修复：最终证据必须最致命，改变全局认知；让它牵出主谋、资金链、身份反转、规则源头、权威失格或局势性质变化，而不是只再补一份普通报告/截图。',
    source: 'oh_story_final_evidence_impact',
  }]
}

const EVIDENCE_TIME_BOMB_PATTERN = /提前|早就|开场就|从一开始|事先|预先|预设|定时(?:发送|公开|上传|触发)|倒计时|自动(?:发送|上传|公开)|备份|副本|红点|录音键|暗格|暗扣|袖口|藏(?:好|着|在)|压在|埋下|留下|只等|等(?:他|她|对方|审判长|执事)[^。！？!?]{0,18}(?:承认|否认|开口|签字)|触发条件|延迟发送/

function textHasEvidenceTimeBombSetup(text: string) {
  EVIDENCE_TIME_BOMB_PATTERN.lastIndex = 0
  return EVIDENCE_TIME_BOMB_PATTERN.test(String(text || ''))
}

export function scanEvidenceTimeBombRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  const evidenceRows = paragraphs
    .map((paragraph, index) => ({
      index,
      paragraph,
      markers: evidenceMarkersInText(paragraph),
    }))
    .filter(row => row.markers.length > 0)
  if (evidenceRows.length < 3) return []
  const evidenceWindow = paragraphs.slice(
    Math.max(0, evidenceRows[0].index - 2),
    Math.min(paragraphs.length, evidenceRows[evidenceRows.length - 1].index + 1),
  ).join(' ')
  if (textHasEvidenceTimeBombSetup(evidenceWindow)) return []
  return [{
    key: 'evidence_time_bomb_missing',
    label: '定时炸弹证据扫描',
    status: 'warn' as const,
    evidence: `证据链包含 ${evidenceRows.length} 次释放，但缺少主角提前布局的定时炸弹证据：${compactBriefText(evidenceWindow, 280)}`,
    fix: '按 oh-story 证据链完整性修复：至少安排 1 个主角提前布局的定时炸弹证据，比如录音红点、提前备份、定时发送、暗格副本或只等对方否认就触发的证据；不要让所有证据都像临场掏出来。',
    source: 'oh_story_evidence_time_bomb',
  }]
}

const ANTAGONIST_DOWNFALL_PATTERN = /(?:反派|对手|执事|会长|长老|族长|老板|总裁|主管|审判长|管理员|他|她)[^。！？!?]{0,40}(?:被(?:带走|抓走|逮捕|关押|封杀|开除|撤职|清除|处死|判刑)|当场(?:倒台|认罪|伏法)|资格被取消|身败名裂|彻底垮了|再也翻不了身|死亡|死在)|(?:资格被取消|被(?:警局|法院|执法队|审判庭|宗门|家族)[^。！？!?]{0,24}(?:带走|抓走|逮捕|关押)|再也翻不了身)/
const PROTAGONIST_CAUSAL_ACTION_PATTERN = /(?:主角|他|她|[一-龥]{2,4})[^。！？!?]{0,36}(?:亮出|摊开|推到|递交|提交|交给|放出|公开|上传|发送|按下|触发)[^。！？!?]{0,36}(?:证据|录音|监控|视频|截图|报告|账册|账本|档案|名单|合同|印章|证词|口供|红点|转账|流水)?|(?:主角|他|她|[一-龥]{2,4})[^。！？!?]{0,36}(?:提前|备份|设成|设下|埋下)[^。！？!?]{0,36}(?:证据|录音|监控|视频|截图|报告|账册|账本|档案|名单|合同|印章|证词|口供|红点|转账|流水)|(?:主角|他|她)[^。！？!?]{0,36}(?:反证|逼|诱使|让(?:反派|对手|执事|会长|长老|族长|老板|总裁|主管|审判长|管理员|他|她)[^。！？!?]{0,18}(?:承认|否认|开口|自爆|露馅)|只问|反问|追问)[^。！？!?]{0,36}(?:证据|录音|监控|视频|截图|报告|账册|账本|档案|名单|合同|印章|证词|口供|红点|转账|流水)?|(?:证据|录音|监控|视频|截图|报告|账册|账本|档案|名单|合同|印章|证词|口供|红点|转账|流水)[^。！？!?]{0,36}(?:来自|顺着|凭着|根据|因为|由于|源于|指向|坐实|证明|反证|提交|公开|触发)/
const DOWNFALL_CAUSAL_LINK_PATTERN = /(?:因为|由于|顺着|凭着|根据|靠着|沿着|正是|这才|因此|于是)[^。！？!?]{0,48}(?:主角|他|她|[一-龥]{2,4})[^。！？!?]{0,36}(?:证据|录音|监控|视频|截图|报告|账册|档案|名单|合同|印章|证词|口供|提交|公开|反证|逼供|反问)|(?:主角|他|她|[一-龥]{2,4})[^。！？!?]{0,36}(?:提交|公开|亮出|摊开|放出|触发)[^。！？!?]{0,36}(?:证据|录音|监控|视频|截图|报告|账册|档案|名单|合同|印章|证词|口供)[^。！？!?]{0,48}(?:带走|抓走|逮捕|关押|封杀|开除|撤职|清除|取消资格|倒台|伏法)/

function paragraphHasAntagonistDownfall(paragraph: string) {
  ANTAGONIST_DOWNFALL_PATTERN.lastIndex = 0
  return ANTAGONIST_DOWNFALL_PATTERN.test(String(paragraph || ''))
}

function textHasProtagonistCausedDownfall(text: string) {
  const source = String(text || '')
  PROTAGONIST_CAUSAL_ACTION_PATTERN.lastIndex = 0
  DOWNFALL_CAUSAL_LINK_PATTERN.lastIndex = 0
  return PROTAGONIST_CAUSAL_ACTION_PATTERN.test(source) || DOWNFALL_CAUSAL_LINK_PATTERN.test(source)
}

export function scanAntagonistDownfallAgencyRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 12)
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (!paragraphHasAntagonistDownfall(paragraphs[index])) continue
    const agencyWindow = paragraphs.slice(Math.max(0, index - 4), Math.min(paragraphs.length, index + 1)).join(' ')
    if (textHasProtagonistCausedDownfall(agencyWindow)) continue
    return [{
      key: 'antagonist_downfall_without_protagonist_agency',
      label: '反派结局因果扫描',
      status: 'warn' as const,
      evidence: `反派/对手结局发生了，但缺少由主角行动导致的因果链：${compactBriefText(agencyWindow, 280)}`,
      fix: '按 oh-story 毒点检查修复：反派结局必须由主角行动导致。让主角提前设局、提交证据、逼对方自爆、用审判式反问触发承认，或让执法/惩罚顺着主角证据链发生；不要让外部力量突然替主角完成清算。',
      source: 'oh_story_antagonist_downfall_agency',
    }]
  }
  return []
}

const FACE_SLAP_REVENGE_CONTEXT_PATTERN = /复仇|打脸|反证|翻盘|洗清|公审|审判|认罪|诬告|冤枉|栽赃|当众|公开/
const PROTAGONIST_CALM_ANCHOR_PATTERN = /没有争辩|没有解释|没(?:有)?说话|冷静|平静|淡淡|(?:只把|按住|压住|压平|整理|扣上|抚平|推到|放在|摊开|递出|亮出)[^。！？!?]{0,24}(?:备份|录音|报告|账册|证据|袖口|领带|水杯|杯子|手机|红点|指尖|缺页)|(?:备份|录音|报告|账册|证据|缺页)[^。！？!?]{0,24}(?:推到|放在|摊开|递出|亮出|按住)/
const PROTAGONIST_OUTBURST_PATTERN = /(?:猛地|突然|当场|立刻)?(?:吼|喊|怒吼|大叫|咆哮|崩溃|失控|发抖|眼眶发红|冲上去|扑上去|争抢|气得|哭|慌|急了|歇斯底里)/
const ANTAGONIST_CALM_OR_PRESSURE_PATTERN = /(?:执事|反派|对手|会长|长老|族长|老板|总裁|主管|审判长|管理员|他|她)[^。！？!?]{0,28}(?:冷笑|靠在|仍旧|依旧|慢条斯理|平静|淡淡|只说|逼|压|摔|催|认罪|输了)/

function contextTextForProtagonistComposure(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const genreContract = target.genre_positioning_contract || target.genrePositioningContract || contextPackage?.genre_positioning_contract || contextPackage?.genrePositioningContract || {}
  const characterContract = target.character_behavior_contract || target.characterBehaviorContract || contextPackage?.character_behavior_contract || contextPackage?.characterBehaviorContract || {}
  const blueprint = target.chapter_blueprint || target.chapterBlueprint || contextPackage?.chapter_blueprint || {}
  return compactBriefText([
    contextPackage?.genre,
    contextPackage?.project?.genre,
    target?.genre,
    target?.summary,
    target?.conflict,
    target?.reader_payoff,
    target?.payoff,
    blueprint?.summary,
    blueprint?.core_payoff,
    characterContract?.protagonist_name,
    ...asArray(genreContract?.genre_tags || genreContract?.genreTags),
    ...asArray(genreContract?.must_have_scenes || genreContract?.mustHaveScenes),
    ...asArray(genreContract?.core_hook_rules || genreContract?.coreHookRules),
  ].filter(Boolean).join('；'), 1200)
}

function protagonistNameForComposure(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const contract = target.character_behavior_contract || target.characterBehaviorContract || contextPackage?.character_behavior_contract || contextPackage?.characterBehaviorContract || {}
  const name = compactBriefText(contract?.protagonist_name || contract?.protagonistName || target?.protagonist_name || target?.protagonistName)
  return name || '主角'
}

function paragraphHasProtagonistOutburst(paragraph: string, protagonistName: string) {
  const text = String(paragraph || '')
  const subjectPattern = protagonistName && protagonistName !== '主角'
    ? new RegExp(`(?:${protagonistName}|主角|他|她)[^。！？!?]{0,40}${PROTAGONIST_OUTBURST_PATTERN.source}`)
    : new RegExp(`(?:主角|他|她)[^。！？!?]{0,40}${PROTAGONIST_OUTBURST_PATTERN.source}`)
  return subjectPattern.test(text) || PROTAGONIST_OUTBURST_PATTERN.test(text)
}

export function scanProtagonistComposureRisks(contextPackage: any = {}, text: string) {
  const body = proseBodyWithoutTitleLine(text)
  if (!body) return []
  const contextText = `${contextTextForProtagonistComposure(contextPackage)} ${compactBriefText(body, 800)}`
  FACE_SLAP_REVENGE_CONTEXT_PATTERN.lastIndex = 0
  if (!FACE_SLAP_REVENGE_CONTEXT_PATTERN.test(contextText)) return []
  PROTAGONIST_CALM_ANCHOR_PATTERN.lastIndex = 0
  if (PROTAGONIST_CALM_ANCHOR_PATTERN.test(body)) return []

  const protagonistName = protagonistNameForComposure(contextPackage)
  const paragraphs = proseParagraphsWithoutTitle(text).filter(paragraph => countProseChars(paragraph) >= 10)
  const outburstIndex = paragraphs.findIndex(paragraph => paragraphHasProtagonistOutburst(paragraph, protagonistName))
  if (outburstIndex < 0) return []
  const pressureWindow = paragraphs.slice(Math.max(0, outburstIndex - 1), Math.min(paragraphs.length, outburstIndex + 3)).join(' ')
  ANTAGONIST_CALM_OR_PRESSURE_PATTERN.lastIndex = 0
  const hasAntagonistPressure = ANTAGONIST_CALM_OR_PRESSURE_PATTERN.test(pressureWindow)
  if (!hasAntagonistPressure && countProseChars(paragraphs[outburstIndex]) < 36) return []

  return [{
    key: 'protagonist_composure_missing',
    label: '主角冷静度扫描',
    status: 'warn' as const,
    evidence: `复仇/打脸场景里主角先失控，缺少冷静动作锚点：${compactBriefText(pressureWindow, 260)}`,
    fix: '按 oh-story 主角冷静度修复：主角用冷静动作、短句、暗牌或审判式提问掌控节奏；让反派比主角更情绪化、更急于辩解或更先露怯，爽感来自反差而不是主角喊赢。',
    source: 'oh_story_protagonist_composure',
  }]
}
