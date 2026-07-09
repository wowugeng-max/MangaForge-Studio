import { anchorMatchScore, anchorTerms } from './text-matching'
import { countProseChars } from './word-target'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
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

const UPGRADE_SIGNAL_PATTERN = /系统提示|面板提示|等级提升|升级|突破|进阶|境界提升|升到|升入|二阶|三阶|四阶|筑基|炼气|金丹|元婴|熟练度\s*[+＋]\s*\d+|经验值|解锁(?:了|出|新)?|获得[^。！？!?]{0,18}(?:新能力|新技能|权限|称号|奖励)/
const UPGRADE_NEW_EFFECT_PATTERN = /新能力|新技能|威力|第一次|以前做不到|看见|识别|判断出|修好|修复|治好|压制|反制|破开|打开|解开|刷新(?:记录)?|改写|拿到资格|通过|完成|当场(?:改口|加价|站起|震惊)|客户[^。！？!?]{0,24}(?:改口|加价)|三秒|十秒|一眼|一掌|一指|一刀/
const UPGRADE_NEXT_THRESHOLD_PATTERN = /但|却|然而|随即|下一|新的|更高|更大|更难|更强|红色警报|警报|门槛|危机|敌人|对手|任务|目标|名单|规则|倒计时|必须|不能|否则|资格赛|下一轮|第二份|医院设备|病房|断电|代价|追杀|审查|考核/

export function scanUpgradeAftermathRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    UPGRADE_SIGNAL_PATTERN.lastIndex = 0
    if (!UPGRADE_SIGNAL_PATTERN.test(paragraph)) continue
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    UPGRADE_NEW_EFFECT_PATTERN.lastIndex = 0
    UPGRADE_NEXT_THRESHOLD_PATTERN.lastIndex = 0
    const hasNewEffect = UPGRADE_NEW_EFFECT_PATTERN.test(windowText)
    const hasNextThreshold = UPGRADE_NEXT_THRESHOLD_PATTERN.test(windowText)
    if (hasNewEffect && hasNextThreshold) continue
    hits.push({
      key: `upgrade_aftermath_missing_${index + 1}`,
      label: '升级后果扫描',
      status: 'warn',
      evidence: `第${index + 1}段出现升级/突破但缺少升级后果闭环：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 升级节奏修复：升级后必须展示新能力威力或以前做不到的事，并立刻引入更高门槛、新危机或下一目标；不要只写奖励到账/众人点头/事情结束。',
    })
    break
  }
  return hits
}

export function upgradeRhythmArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function upgradeRhythmAnchorScore(values: string[], chapterText: string, threshold = 22) {
  const checked = values.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  return {
    checked,
    missed: checked.filter(item => !item.delivered),
    score: checked.length ? Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / checked.length) : 82,
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
  }
}

export function normalizeUpgradeGapCheck(values: any[], chapterText: string) {
  const planned = upgradeRhythmArray(values)
  if (!planned.length) return null
  const anchor = upgradeRhythmAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasGap = /升级前缺口|质疑[^。！？!?]{0,20}资格|没有资格|权限[^。！？!?]{0,12}卡住|被[^。！？!?]{0,16}看不起|资源获取难度|升级前/.test(text)
  const sudden = /突然升级|直接升级|毫无铺垫/.test(text)
  const delivered = !sudden && (anchor.missed.length === 0 || hasGap)
  return {
    key: 'upgrade_gap',
    label: '升级前缺口',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, sudden ? 16 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasGap ? '升级前缺口可见' : '', sudden ? '升级突然发生' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '升级前缺口、待遇差距、资源难度或情绪压力没有铺垫，升级显得突然。',
    repair_instruction: delivered ? '' : '补升级前缺口：先写清主角缺什么、被什么卡住、读者为什么期待升级。',
  }
}

export function normalizeUpgradeGainCheck(values: any[], chapterText: string) {
  const planned = upgradeRhythmArray(values)
  if (!planned.length) return null
  const anchor = upgradeRhythmAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasGain = /解锁|隐藏工具箱|客户主动加价|恢复授权|获得|新能力|新技能|权限|称号|奖励/.test(text)
  const rewardOnly = /奖励到账|大家都点头|觉得不错/.test(text) && !/隐藏工具箱|新能力|以前做不到|识别|修复/.test(text)
  const delivered = !rewardOnly && (anchor.missed.length === 0 || hasGain)
  return {
    key: 'upgrade_gain_plan',
    label: '升级收获',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, rewardOnly ? 20 : 52),
    evidence: uniqueBriefStrings([...anchor.evidence, hasGain ? '升级收获可见' : '', rewardOnly ? '只有奖励到账' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '升级收获只写成奖励到账或众人认可，没有变成能力、权限、资源、地位或目标推进。',
    repair_instruction: delivered ? '' : '补升级收获：写清主角获得了什么能力/权限/资源，以及它如何改变当前局势。',
  }
}

export function normalizeUpgradeFeedbackCheck(values: any[], chapterText: string) {
  const planned = upgradeRhythmArray(values)
  if (!planned.length) return null
  const anchor = upgradeRhythmAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasImmediate = /即时反馈|系统提示|熟练度\s*[+＋]\s*\d+|当场识别|第一次|一眼|直接看见|当场修复/.test(text)
  const hasNewEffect = /以前做不到|新能力|看见隐藏|识别出|修复|反制|压制|第一次/.test(text)
  const hasDelayed = /延迟反馈|第二份封单|医院设备|红色警报|更高门槛|新门槛|下一目标|新的危机/.test(text)
  const deterministicRisks = scanUpgradeAftermathRisks(chapterText)
  const explicitNoEffect = /没有展示新能力|没有以前做不到的事|没有新门槛|事情到这里结束/.test(text)
  const delivered = deterministicRisks.length === 0 && !explicitNoEffect && hasImmediate && hasNewEffect && hasDelayed
  return {
    key: 'feedback_loop',
    label: '反馈闭环',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, explicitNoEffect ? 12 : 48),
    evidence: uniqueBriefStrings([
      ...anchor.evidence,
      hasImmediate ? '即时反馈可见' : '',
      hasNewEffect ? '新能力/以前做不到的事可见' : '',
      hasDelayed ? '延迟反馈/新门槛可见' : '',
      explicitNoEffect ? '显式缺少升级后果' : '',
      ...deterministicRisks.map((item: any) => item.evidence),
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasImmediate ? '缺即时反馈' : '',
      !hasNewEffect ? '缺新能力展示' : '',
      !hasDelayed ? '缺延迟反馈/新门槛' : '',
      ...deterministicRisks.map((item: any) => item.label),
    ], 8),
    issue: delivered ? '' : '升级后果闭环不完整：缺即时反馈、新能力展示、以前做不到的事或更高门槛。',
    repair_instruction: delivered ? '' : '补反馈闭环：升级后必须马上展示新能力威力，并引入更高门槛、延迟奖励或下一目标。',
  }
}

export function normalizeUpgradeEmotionModuleCheck(values: any[], chapterText: string) {
  const planned = upgradeRhythmArray(values)
  if (!planned.length) return null
  const anchor = upgradeRhythmAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasEmotion = /被质疑|展示能力|打造落差|旁观者震惊|震惊|改口|装逼|爽点|从被质疑转成/.test(text)
  const bland = /大家都点头|觉得不错|很满意|没有波澜/.test(text)
  const delivered = !bland && (anchor.missed.length === 0 || hasEmotion)
  return {
    key: 'emotion_modules',
    label: '情绪模块',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, bland ? 24 : 52),
    evidence: uniqueBriefStrings([...anchor.evidence, hasEmotion ? '情绪模块/爽点落差可见' : '', bland ? '情绪反馈平淡' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '升级没有形成明确情绪模块，爽点落差、展示能力或旁观者反应不足。',
    repair_instruction: delivered ? '' : '补情绪模块：按被质疑、展示能力、打造落差、旁观者反应释放爽感。',
  }
}

export function normalizeUpgradeBridgeRhythmCheck(values: any[], chapterText: string) {
  const planned = upgradeRhythmArray(values)
  if (!planned.length) return null
  const anchor = upgradeRhythmAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasBridge = /桥段|兑现爽感|承上启下|医院设备|第二份封单|红色警报|下一目标|更高门槛/.test(text)
  const closed = /事情到这里结束|没有新门槛|到此结束|没有下一目标/.test(text)
  const delivered = !closed && (anchor.missed.length === 0 || hasBridge)
  return {
    key: 'bridge_rhythm',
    label: '桥段节奏',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, closed ? 18 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasBridge ? '桥段承接/新门槛可见' : '', closed ? '升级后闭合无承接' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '本章升级没有接到桥段功能位、承上启下或下一门槛。',
    repair_instruction: delivered ? '' : '补桥段节奏：兑现爽感后必须承上启下，把升级结果接到更高挑战或下一目标。',
  }
}

export function normalizeGoldfingerEvolutionContract(value: any) {
  const raw = typeof value === 'object' && value ? value : {}
  const coreFunction = compactBriefText(raw.core_function || raw.coreFunction || raw.core || raw.function || raw.summary || (typeof value === 'string' ? value : ''))
  const allowedExtensions = uniqueBriefStrings(raw.allowed_extensions || raw.allowedExtensions || raw.extensions || raw.development_paths || raw.developmentPaths || [], 8)
  const forbiddenDrifts = uniqueBriefStrings(raw.forbidden_drifts || raw.forbiddenDrifts || raw.red_lines || raw.redLines || [], 8)
  const currentStage = compactBriefText(raw.current_stage || raw.currentStage || raw.stage)
  const foreshadowing = uniqueBriefStrings(raw.foreshadowing || raw.setup || raw.prior_setup || raw.priorSetup || [], 8)
  if (!coreFunction && !allowedExtensions.length && !forbiddenDrifts.length && !currentStage && !foreshadowing.length) return null
  return {
    core_function: coreFunction,
    current_stage: currentStage,
    allowed_extensions: allowedExtensions,
    forbidden_drifts: forbiddenDrifts,
    foreshadowing,
  }
}

export function normalizeGoldfingerEvolutionCheck(contractValue: any, chapterText: string) {
  const contract = normalizeGoldfingerEvolutionContract(contractValue)
  if (!contract) return null
  const text = String(chapterText || '')
  const coreMatch = contract.core_function ? anchorMatchScore(contract.core_function, text) : { score: 0, matched: [] }
  const hasCoreFunction = !contract.core_function || coreMatch.score >= 18 || anchorTerms(contract.core_function).some(term => term.length >= 2 && text.includes(term))
  const allowedMatches = contract.allowed_extensions
    .map(item => ({ text: item, match: anchorMatchScore(item, text) }))
    .filter(item => item.match.score >= 18 || anchorTerms(item.text).some(term => term.length >= 2 && text.includes(term)))
  const hasAllowedExtension = contract.allowed_extensions.length === 0 || allowedMatches.length > 0
  const touchedForbidden = contract.forbidden_drifts.filter(item => {
    const phrase = compactBriefText(item)
    return phrase && (text.includes(phrase) || anchorTerms(phrase).some(term => term.length >= 2 && text.includes(term)))
  })
  const hasWorldScaleJump = /掌控天道|成为世界规则|改写天道|万物可签|人人信仰|世界规则都(?:跪伏|臣服|改写)|天道层级/.test(text)
  const hasForeshadowing = contract.foreshadowing.length > 0
    ? contract.foreshadowing.some(item => anchorMatchScore(item, text).score >= 18)
    : /伏笔|此前铺垫|早已埋下|上一章|前文|规则源头|地脉|世界规则/.test(text)
  const hasNoForeshadowing = /没有任何伏笔|此前没有伏笔|毫无伏笔/.test(text)
  const delivered = hasCoreFunction && hasAllowedExtension && touchedForbidden.length === 0 && (!hasWorldScaleJump || (hasForeshadowing && !hasNoForeshadowing))
  return {
    key: 'goldfinger_evolution_drift',
    label: '金手指演进',
    text: contract.core_function || contract.allowed_extensions.join('；') || '金手指核心作用必须持续。',
    expected: '金手指核心作用可发展但不能换赛道；升华到世界/规则层级必须有伏笔。',
    score: delivered ? 88 : Math.max(12, [hasCoreFunction, hasAllowedExtension, touchedForbidden.length === 0, !hasWorldScaleJump || hasForeshadowing].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      ...asArray(coreMatch.matched),
      ...allowedMatches.flatMap(item => item.match.matched),
      hasCoreFunction ? '核心作用仍在' : '',
      hasAllowedExtension ? '允许扩展可见' : '',
      touchedForbidden.length ? `触碰禁漂移：${touchedForbidden.join('、')}` : '',
      hasWorldScaleJump && !hasForeshadowing ? '世界/天道层级跳跃缺少伏笔' : '',
      hasNoForeshadowing ? '正文承认没有伏笔' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasCoreFunction ? '核心作用丢失' : '',
      !hasAllowedExtension ? '缺少允许的发展方向' : '',
      ...touchedForbidden,
      hasWorldScaleJump && (!hasForeshadowing || hasNoForeshadowing) ? '升华缺少伏笔' : '',
    ], 8),
    issue: delivered ? '' : '金手指演进偏离核心作用、触碰禁漂移，或在缺少伏笔时突然升华到世界/规则层级。',
    repair_instruction: delivered ? '' : '校准金手指演进：保留核心作用，只增加新的使用方式；如果要升华到世界/规则层级，先补足伏笔和阶段递增。',
  }
}

export function normalizeGoldfingerConflictBalanceCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasGoldfinger = /金手指|系统|面板|能力|技能|隐藏工具箱|维修系统|超人力量|规则漏洞|底牌/.test(text)
  const hasCurrentConflict = /质疑|没有资格|权限|阻碍|卡住|危机|矛盾|对手|协会|客户|规则|封锁|门槛/.test(text)
  const changesSituation = /刚好|识别|拆解|修好|反制|改变局势|阶段收益|熟练度|加价|授权|震惊|压制|拿到|发现|打开/.test(text)
  const exposesBiggerConflict = /更大矛盾|更高门槛|新门槛|下一目标|下一章|新危机|红色警报|医院设备|新封单|延迟反馈|代价|风险|暴露/.test(text)
  const overpoweredText = text.replace(/没有一键清场|不是一键清场|并非一键清场/g, '')
  const overpowered = /一键解决所有问题|一键清场|全部自动(?:修好|解决)|所有问题都(?:解决|消失)|所有对手全部认输|矛盾彻底消失|没有更大矛盾|没有新门槛|事情到这里结束/.test(overpoweredText)
  const tooWeak = /毫无作用|没有任何作用|无法改变局势|完全没用|读者焦虑/.test(text)
  const delivered = hasGoldfinger && hasCurrentConflict && changesSituation && exposesBiggerConflict && !overpowered && !tooWeak
  return {
    key: 'goldfinger_conflict_balance',
    label: '金手指矛盾匹配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasGoldfinger, hasCurrentConflict, changesSituation, exposesBiggerConflict, !overpowered, !tooWeak].filter(Boolean).length * 14),
    evidence: uniqueBriefStrings([
      hasGoldfinger ? '金手指/能力进入正文' : '',
      hasCurrentConflict ? '当前矛盾可见' : '',
      changesSituation ? '能力改变局势或拿到阶段收益' : '',
      exposesBiggerConflict ? '解决后暴露更大矛盾/新门槛' : '',
      overpowered ? '金手指过强或一键清场' : '',
      tooWeak ? '金手指过弱无法改变局势' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasGoldfinger ? '缺金手指/能力使用' : '',
      !hasCurrentConflict ? '缺当前矛盾' : '',
      !changesSituation ? '能力没有改变局势' : '',
      !exposesBiggerConflict ? '缺更大矛盾/新门槛' : '',
      overpowered ? '金手指太强导致无聊' : '',
      tooWeak ? '金手指太弱导致焦虑' : '',
    ], 8),
    issue: delivered ? '' : '金手指与当前矛盾强弱不匹配，可能一键清场、无法改变局势，或解决后没有暴露更大矛盾。',
    repair_instruction: delivered ? '' : '按 oh-story 金手指 + 矛盾法修复：让金手指刚好解决当前矛盾，拿到阶段收益，同时暴露更大矛盾、更高门槛或下一目标。',
  }
}

export function normalizeGoldfingerSimplicityCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasSimpleCore = /金手指简单|简单清晰|一眼就懂|面板只显示|只展示一种核心用法|仍然围绕|同一套(?:维修)?逻辑|核心作用/.test(text)
  const hasFunction = /功能|核心用法|错误码|拆解路线|识别|检测|修复|反证|面板/.test(text)
  const hasTrigger = /触发条件|接触设备|接触|靠近|扫描|检测到|启动条件|当场识别|识别[^。！？!?]{0,16}(?:设备|错误码|错误链)/.test(text)
  const hasReward = /奖励反馈|熟练度\+?10|经验值|阶段收益|奖励|反馈|收益/.test(text)
  const hasUpgradeRule = /升级规则|下一门槛|新门槛|熟练度|升级|门槛/.test(text)
  const manualText = text.replace(/不是说明书|不能写成说明书|避免.*说明书|删掉说明书/g, '')
  const hasOverloadedSystem = /十几种模块|天赋|羁绊|规则树|隐藏权限|没人知道触发条件|没人知道.*升级规则|说明书|万能外挂/.test(manualText)
  const delivered = hasSimpleCore && hasFunction && hasTrigger && hasReward && hasUpgradeRule && !hasOverloadedSystem
  return {
    key: 'goldfinger_simplicity_rules',
    label: '金手指简单清晰',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasSimpleCore, hasFunction, hasTrigger, hasReward, hasUpgradeRule, !hasOverloadedSystem].filter(Boolean).length * 14),
    evidence: uniqueBriefStrings([
      hasSimpleCore ? '金手指简单清晰/一眼就懂' : '',
      hasFunction ? '功能可见' : '',
      hasTrigger ? '触发条件可见' : '',
      hasReward ? '奖励反馈可见' : '',
      hasUpgradeRule ? '升级规则/下一门槛可见' : '',
      hasOverloadedSystem ? '规则过载或说明书式系统' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasSimpleCore ? '缺一眼就懂的简单核心' : '',
      !hasFunction ? '缺功能说明' : '',
      !hasTrigger ? '缺触发条件' : '',
      !hasReward ? '缺奖励反馈' : '',
      !hasUpgradeRule ? '缺升级规则/下一门槛' : '',
      hasOverloadedSystem ? '系统写成说明书、规则树或万能外挂' : '',
    ], 8),
    issue: delivered ? '' : '金手指不够简单清晰，功能、触发条件、奖励反馈或升级规则缺少正文证据，或系统规则过载。',
    repair_instruction: delivered ? '' : '简化金手指：功能、触发条件、奖励反馈和升级规则必须一眼就懂；本章只展示一种核心用法，删掉说明书式规则树和万能外挂。',
  }
}

export function normalizeGoldfingerMultiDimensionGrowthCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasTermLine = /词条|标签|特性|属性|静音校准|掠夺词条|词条可融合/.test(text)
  const hasFunctionLine = /功能|新功能|子能力|工具箱|解锁|联动|应用场景|使用方式|识别隐藏|隐藏错误链|拆解路线/.test(text)
  const hasQualityLine = /品质|品阶|A档|S档|SS|质量|装备|零件|资源|加价|授权|报废/.test(text)
  const hasProgressionLine = /熟练度|经验值|等级|进度条|不倒退|不会衰减|重复提升|阶段|升级|发展/.test(text)
  const hasConditionFeedbackLine = /条件-反馈|条件|反馈|完成[^。！？!?]{0,18}(?:订单|任务|维修)|做[^。！？!?]{0,12}获得|触发|阶段反馈|条件升级|概率性反馈|延迟反馈/.test(text)
  const oneDimensionTrap = /只(?:把|剩|靠)?[^。！？!?]{0,18}(?:品质|数值|等级)[^。！？!?]{0,24}(?:提升|升到|升级)|只剩[^。！？!?]{0,18}(?:品质|数值|等级)[^。！？!?]{0,18}(?:一个维度|单一维度)|单一维度|其他词条、功能、条件反馈都没有变化|词条、功能、条件反馈都没有变化/.test(text)
  const dimensionCount = [hasTermLine, hasFunctionLine, hasQualityLine, hasProgressionLine, hasConditionFeedbackLine].filter(Boolean).length
  const delivered = dimensionCount >= 2 && !oneDimensionTrap
  return {
    key: 'goldfinger_multi_dimension_growth_rules',
    label: '金手指多维成长',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, dimensionCount * 18 - (oneDimensionTrap ? 20 : 0)),
    evidence: uniqueBriefStrings([
      hasTermLine ? '词条/特性成长可见' : '',
      hasFunctionLine ? '功能/子能力成长可见' : '',
      hasQualityLine ? '品质/资源成长可见' : '',
      hasProgressionLine ? '熟练度/等级/阶段成长可见' : '',
      hasConditionFeedbackLine ? '条件-反馈链可见' : '',
      oneDimensionTrap ? '升级只剩单一维度' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      dimensionCount < 2 ? '金手指成长维度不足' : '',
      !hasTermLine ? '缺词条/特性线' : '',
      !hasFunctionLine ? '缺功能/子能力线' : '',
      !hasConditionFeedbackLine ? '缺条件-反馈链' : '',
      oneDimensionTrap ? '只靠品质/数值/等级单线提升' : '',
    ], 8),
    issue: delivered ? '' : '金手指成长缺少多维度，可能只剩品质、数值或等级提升，后期提升感会消失。',
    repair_instruction: delivered ? '' : '补金手指多维成长：至少让词条、功能、品质、熟练度或条件-反馈中的两条线同步变化；条件升级后，反馈可解锁新功能、子能力或新的应用场景。',
  }
}

export function normalizeUpgradeRankingLadderCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasRankingContext = /排行榜|榜单|排名|名次|维修榜|战力榜|榜外|入榜|冲榜|升到第|第[一二三四五六七八九十百千万\d]+名/.test(text)
  if (!hasRankingContext) return null
  const hasRankMotion = /(?:排名|名次|榜单|维修榜)[^。！？!?]{0,40}(?:提升|上升|刷新|提高|变化|升到|入榜)|从榜外升到|榜外[^。！？!?]{0,24}第[一二三四五六七八九十百千万\d]+名|冲(?:榜|第[一二三四五六七八九十百千万\d]+名)|下一(?:名|名次|目标)|期待[^。！？!?]{0,24}(?:下一名|名次|冲榜)/.test(text)
  const hasNewOpponent = /新对手|同榜竞争者|下一(?:名|位)|前一(?:名|位)|上一(?:名|位)|第[一二三四五六七八九十百千万\d]+名[^。！？!?]{0,40}(?:名字|对手|师|敌|高手|竞争者|接下|亮出|出现)|榜单[^。！？!?]{0,48}(?:介绍|亮出|露出|出现)[^。！？!?]{0,40}(?:对手|名字|竞争者|下一名)|排名碰撞|榜单碰撞/.test(text)
  const hasAftershock = /余震|传开|重新(?:报价|评估|排队)|客户群|订单[^。！？!?]{0,20}(?:上涨|增加|重新)|态度[^。！？!?]{0,20}(?:转变|变化|改口)|资源[^。！？!?]{0,20}(?:倾斜|增加|到手)|权限[^。！？!?]{0,20}(?:变化|开放|提高)|规则评价[^。！？!?]{0,20}(?:改写|改变|重评)|协会[^。！？!?]{0,40}(?:重评|改写|重新评价)|声望|名望|后续挑战|下一章[^。！？!?]{0,32}(?:排名|碰撞|榜单)/.test(text)
  const hollowRanking = /排名提升[^。！？!?]{0,30}(?:事情结束|到此结束)|榜单[^。！？!?]{0,30}事情结束|只写(?:排名|名次)|只是(?:排名|名次)|没有(?:新对手|余震|后续挑战)/.test(text)
  const delivered = hasRankMotion && hasNewOpponent && hasAftershock && !hollowRanking
  return {
    key: 'ranking_ladder_rules',
    label: '榜单升级动力',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, [hasRankMotion, hasNewOpponent, hasAftershock, !hollowRanking].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasRankMotion ? '排名/名次变化可见' : '',
      hasNewOpponent ? '榜单带出新对手/下一名' : '',
      hasAftershock ? '装逼余震影响态度/资源/规则评价' : '',
      hollowRanking ? '榜单只做数字结算' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasRankMotion ? '缺排名提升带来的升级动力' : '',
      !hasNewOpponent ? '缺新对手/下一名碰撞期待' : '',
      !hasAftershock ? '缺榜单余震对态度、资源、权限或规则评价的影响' : '',
      hollowRanking ? '榜单只写成结算数字' : '',
    ], 8),
    issue: delivered ? '' : '榜单没有发挥升级动力：排名变化缺新对手、后续碰撞或装逼余震。',
    repair_instruction: delivered ? '' : '补榜单升级动力：排名提升后立刻给下一名次/下一目标；通过排行榜介绍新对手；让榜单余震改变他人态度、报价、资源、权限或规则评价。',
  }
}

export function buildUpgradeRhythmDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /突然升级|直接升级|毫无铺垫/.test(text) ? {
      key: 'sudden_upgrade',
      label: '突然升级',
      evidence: '升级前缺少情绪缺口、资源难度或待遇差距铺垫。',
      fix: '先补升级前缺口，再给即时反馈和升级后变化。',
    } : null,
    /奖励到账|大家都点头|客户觉得不错/.test(text) && !/新能力|以前做不到|识别|修复|反制|更高门槛/.test(text) ? {
      key: 'reward_only',
      label: '只有奖励',
      evidence: '升级只写成奖励到账或众人认可。',
      fix: '补新能力威力、以前做不到的事和阶段收益。',
    } : null,
    /没有展示新能力|没有以前做不到的事/.test(text) ? {
      key: 'no_new_effect',
      label: '缺新能力展示',
      evidence: '正文直接承认没有展示新能力或以前做不到的事。',
      fix: '让升级后能力改变现场判断、行动、结果或门槛。',
    } : null,
    /没有新门槛|事情到这里结束|没有下一目标/.test(text) ? {
      key: 'no_next_threshold',
      label: '缺新门槛',
      evidence: '升级后没有更高门槛、延迟反馈或下一目标。',
      fix: '升级后立刻引入更高挑战、新危机、延迟奖励或下一任务。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'upgrade_rhythm_forbidden',
    label: '升级节奏硬伤',
    text: '升级节奏不得突然升级、只奖励到账、缺新能力展示或缺下一门槛。',
    expected: '升级节奏不得突然升级、只奖励到账、缺新能力展示或缺下一门槛。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项升级节奏确定性风险。`,
    repair_instruction: '按 oh-story 升级感三步法修复：补升级前缺口、即时反馈、新能力展示、延迟反馈和更高门槛。',
  }
}

export function upgradeRhythmPriority(missed: any[]) {
  if (missed.some(item => item.key === 'ranking_ladder_rules')) return '优先补榜单升级动力'
  if (missed.some(item => item.key === 'goldfinger_evolution_drift')) return '优先校准金手指演进'
  if (missed.some(item => item.key === 'goldfinger_conflict_balance')) return '优先校准金手指矛盾'
  if (missed.some(item => item.key === 'goldfinger_simplicity_rules')) return '优先简化金手指'
  if (missed.some(item => item.key === 'goldfinger_multi_dimension_growth_rules')) return '优先扩展金手指成长维度'
  if (missed.some(item => item.key === 'upgrade_rhythm_forbidden')) return '优先清升级硬伤'
  if (missed.some(item => item.key === 'feedback_loop')) return '优先补反馈闭环'
  if (missed.some(item => item.key === 'upgrade_gap')) return '优先补升级前缺口'
  if (missed.some(item => item.key === 'upgrade_gain_plan')) return '优先补升级收获'
  if (missed.some(item => item.key === 'bridge_rhythm')) return '优先补桥段承接'
  if (missed.some(item => item.key === 'emotion_modules')) return '优先补情绪模块'
  return ''
}
