import { asArray } from '../../routes/novel-route-utils'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const CORE_CONTRACT_CHECK_LABELS: Record<string, string> = {
  reader_promise: '读者承诺',
  chapter_goal: '本章目标',
  chapter_objective: '本章目标',
  core_conflict: '核心冲突',
  mainline_service: '主线服务',
  reader_payoff: '读者回报',
  ending_hook: '章末钩子',
  innovation_hook: '创新卖点',
  forbidden_content: '不可偏移',
}

const OH_STORY_CORE_CONTRACT_SELLING_POINT_EXECUTION_RULES = [
  '卖点四步法：想清楚整本书卖点、书名卖点、简介卖点和每段剧情卖点，并让它们对齐同一核心情绪。',
  '卖点表达必须发现比告知爽十倍：用剧情、对话、动作结果和角色反应隐性展示，不要直接宣布“这是核心卖点/本章很爽”。',
  '卖点递进必须形成开头暗示 -> 中间深化 -> 高潮爆发；每章一句话概括内容并标注目的词，盯紧章纲目的来写。',
]

const OH_STORY_CORE_CONTRACT_REPETITION_STRATEGY_RULES = [
  '重复点是商业长篇的稳定器：人物重复点、套路重复点、剧情重复点要围绕核心看点服务同一卖点。',
  '同一卖点至少延展 3 个角度，用正写、反套路、持续反、反了再正等方式换壳换场景换人物。',
  '核心看点在当前样本/读者反馈中稳定时保持重复策略；反馈下降时升级重复方式，避免爽点重复导致审美疲劳。',
]

const OH_STORY_CORE_CONTRACT_COMMERCIAL_RHYTHM_RULES = [
  '节奏自检：写前读取追踪/上下文.md 与最近 3 章摘要；连续 2 章没有目标推进、阻碍升级或新信息时，下一章提高冲突密度。',
  '过快自检：连续 2 章只爆点不留反应余波时，插入 1-2 个承接场景，但必须推进关系、伏笔、状态或下一目标。',
  '高潮节奏标尺：大高潮 7-10 天完成，小高潮约 3 天，高潮后 1-2 章过渡；平淡过渡必须用目标或冲突拉回节奏。',
]

const OH_STORY_CORE_CONTRACT_GOLDFINGER_STRUCTURE_RULES = [
  '金手指可替换故事流程中的任一环节：建立目标、克服困难、准备环节、激励事件或收获奖励，但不能破坏行动链。',
  '金手指简单是核心，一眼就懂；系统限制必须保证故事结构完整，让主角一步步行动。',
  '给出金手指后必须有即时变化，并契合主角当前职业、生活困境或打开困境的钥匙；刚好解决当前矛盾后暴露更大矛盾。',
]

const OH_STORY_CORE_CONTRACT_LAUNCH_PRESSURE_RULES = [
  '开篇 300-500字内交代处境、危险来源和破局希望；前两万字优先解决“活下去”。',
  '优先用环境型压力开局，主角一开始不能完美，要形成否极泰来的起点。',
  '轻松向开篇也要让主角一无所有 + 金手指一眼就知道怎么用，不能先铺背景或大段世界观。',
]

export function normalizeCoreContractCheck(item: any, fallbackKey = '') {
  const key = compactBriefText(item?.key || item?.field || fallbackKey)
  const label = compactBriefText(item?.label || item?.title, CORE_CONTRACT_CHECK_LABELS[key] || key || '核心契约')
  const status = compactBriefText(item?.status || item?.state, 'ok').toLowerCase()
  const reason = compactBriefText(item?.reason || item?.detail || item?.message || item?.summary || item?.text)
  if (!key && !label && !reason) return null
  return {
    key: key || label,
    label: label || key,
    status,
    reason,
  }
}

export function normalizeCoreContractPeriodicDriftCheck(value: any) {
  const raw = value?.periodic_drift_check || value?.periodicDriftCheck || value || {}
  const sellingPoints = uniqueBriefStrings(raw.selling_points || raw.sellingPoints || raw.core_selling_points || raw.coreSellingPoints || [], 8)
  const cadence = compactBriefText(raw.cadence || raw.interval || raw.period, '每10章')
  const question = compactBriefText(raw.question || raw.prompt, '当初吸引读者的卖点还在吗？')
  const due = Boolean(raw.due || raw.is_due || raw.isDue)
  if (!due && !sellingPoints.length && !compactBriefText(raw.reason || raw.summary || raw.detail)) return null
  return {
    cadence,
    due,
    question,
    selling_points: sellingPoints,
    reason: compactBriefText(raw.reason || raw.summary || raw.detail),
  }
}

export function normalizeChapterLaunchGateChecks(gate: any) {
  if (!gate || typeof gate !== 'object') return []
  const signalChecks = asArray(gate.signals)
    .map((item: any) => normalizeCoreContractCheck(item))
    .filter(Boolean)
  const objectChecks = Object.entries(gate)
    .filter(([key, value]) => {
      if (['signals', 'summary'].includes(key)) return false
      return value && typeof value === 'object' && !Array.isArray(value)
    })
    .map(([key, value]: [string, any]) => normalizeCoreContractCheck({ key, ...value }, key))
    .filter(Boolean)
  const checks = signalChecks.length ? signalChecks : objectChecks
  if (checks.length) return checks
  const status = compactBriefText(gate.status)
  const summary = compactBriefText(gate.summary || gate.reason || gate.detail)
  return status || summary ? [normalizeCoreContractCheck({ key: 'chapter_launch_gate', label: '开写门禁', status, reason: summary })].filter(Boolean) : []
}

export function chapterLaunchGateFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.chapter_launch_gate
    || target.chapterLaunchGate
    || brief.chapter_launch_gate
    || brief.chapterLaunchGate
    || contextPackage?.chapter_launch_gate
    || contextPackage?.chapterLaunchGate
    || chapter?.raw_payload?.chapter_launch_gate
    || chapter?.raw_payload?.chapterLaunchGate
    || null
}

export function normalizeCoreContractRadar(value: any) {
  const raw = value?.core_contract_radar || value?.coreContractRadar || value || {}
  const mustServe = uniqueBriefStrings(raw.must_serve || raw.mustServe || raw.required || raw.mustServePoints || [], 12)
  const noDrift = uniqueBriefStrings(raw.no_drift || raw.noDrift || raw.red_lines || raw.redLines || raw.immutable_rules || raw.immutableRules || [], 12)
  const coreEmotion = compactBriefText(raw.core_emotion || raw.coreEmotion || raw.main_emotion || raw.mainEmotion || raw.theme_emotion || raw.themeEmotion)
  const themeUnityRules = uniqueBriefStrings([
    raw.theme_unity_rules,
    raw.themeUnityRules,
    coreEmotion ? `一本书从头到尾要有统一的核心情绪：${coreEmotion}` : '',
    coreEmotion ? '小情绪服从大情绪；随机翻开一章，情绪必须指向全书核心。' : '',
  ], 8)
  const sellingPointExecutionRules = uniqueBriefStrings(raw.selling_point_execution_rules || raw.sellingPointExecutionRules || raw.selling_point_rules || raw.sellingPointRules || [], 8)
  const repetitionStrategyRules = uniqueBriefStrings(raw.repetition_strategy_rules || raw.repetitionStrategyRules || raw.repeat_strategy_rules || raw.repeatStrategyRules || [], 8)
  const commercialRhythmRules = uniqueBriefStrings(raw.commercial_rhythm_rules || raw.commercialRhythmRules || raw.rhythm_meter_rules || raw.rhythmMeterRules || [], 8)
  const goldfingerStructureRules = uniqueBriefStrings(raw.goldfinger_structure_rules || raw.goldfingerStructureRules || raw.goldfinger_process_rules || raw.goldfingerProcessRules || [], 8)
  const launchPressureRules = uniqueBriefStrings(raw.launch_pressure_rules || raw.launchPressureRules || raw.opening_pressure_rules || raw.openingPressureRules || [], 8)
  const repairFocus = uniqueBriefStrings(raw.repair_focus || raw.repairFocus || raw.required_actions || raw.requiredActions || [], 10)
  const periodicDriftCheck = normalizeCoreContractPeriodicDriftCheck(raw.periodic_drift_check || raw.periodicDriftCheck)
  const seenCheckKeys = new Set<string>()
  const checks = [
    ...asArray(raw.checks).map((item: any) => normalizeCoreContractCheck(item)).filter(Boolean),
    themeUnityRules.length ? normalizeCoreContractCheck({
      key: 'theme_unity',
      label: '主题统一',
      status: 'ok',
      reason: themeUnityRules[0],
    }) : null,
    periodicDriftCheck?.due ? normalizeCoreContractCheck({
      key: 'ten_chapter_selling_point',
      label: '十章卖点复核',
      status: 'warn',
      reason: periodicDriftCheck.question,
    }) : null,
  ].filter((item: any) => {
    if (!item) return false
    const key = item.key || item.label
    if (seenCheckKeys.has(key)) return false
    seenCheckKeys.add(key)
    return true
  }).slice(0, 8)
  const summary = compactBriefText(raw.summary || raw.detail || raw.reason || (
    mustServe.length ? `本章必须服务：${mustServe.slice(0, 3).join('；')}` : ''
  ))
  if (
    !summary
    && !mustServe.length
    && !noDrift.length
    && !themeUnityRules.length
    && !sellingPointExecutionRules.length
    && !repetitionStrategyRules.length
    && !commercialRhythmRules.length
    && !goldfingerStructureRules.length
    && !launchPressureRules.length
    && !repairFocus.length
    && !checks.length
    && !periodicDriftCheck
  ) return null
  return {
    summary,
    must_serve: mustServe,
    no_drift: noDrift,
    theme_unity_rules: themeUnityRules,
    selling_point_execution_rules: sellingPointExecutionRules,
    repetition_strategy_rules: repetitionStrategyRules,
    commercial_rhythm_rules: commercialRhythmRules,
    goldfinger_structure_rules: goldfingerStructureRules,
    launch_pressure_rules: launchPressureRules,
    repair_focus: repairFocus,
    checks,
    periodic_drift_check: periodicDriftCheck,
  }
}

export function coreContractRadarFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.core_contract_radar
    || target.coreContractRadar
    || brief.core_contract_radar
    || brief.coreContractRadar
    || contextPackage?.core_contract_radar
    || contextPackage?.coreContractRadar
    || chapter?.raw_payload?.core_contract_radar
    || chapter?.raw_payload?.coreContractRadar
    || null
}

export function buildCoreContractRadar(project: any, contextPackage: any, sceneBriefs: any[], longformCompass: any, longformBattleContext: any = null) {
  const existing = normalizeCoreContractRadar(
    coreContractRadarFromContext(contextPackage)
    || contextPackage?.writing_bible?.core_contract_radar
    || contextPackage?.writing_bible?.coreContractRadar
    || project?.reference_config?.writing_bible?.core_contract_radar
    || project?.reference_config?.writing_bible?.coreContractRadar,
  )
  if (existing) return existing
  const target = contextPackage?.chapter_target || {}
  const bible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const axes = asArray(longformCompass?.axes)
  const axisValue = (key: string) => axes.find((axis: any) => axis?.key === key)?.value
  const gateChecks = normalizeChapterLaunchGateChecks(chapterLaunchGateFromContext(contextPackage))
  const drift = contextPackage?.chapter_core_drift || contextPackage?.core_drift || target.core_drift || {}
  const driftRisks = uniqueBriefStrings([drift.drift_risks, drift.risks, drift.issues], 8)
  const riskLaneActions = uniqueBriefStrings(asArray(longformBattleContext?.risk_lanes).map((lane: any) => lane?.required_action || lane?.detail), 6)
  const gateRepair = uniqueBriefStrings(
    gateChecks
      .filter((check: any) => ['warn', 'warning', 'block', 'blocked', 'risk', 'needs_action'].includes(String(check.status).toLowerCase()))
      .map((check: any) => check.reason || check.label),
    8,
  )
  const mustServe = uniqueBriefStrings([
    longformCompass?.reader_promise,
    axisValue('reader_promise'),
    axisValue('core_conflict'),
    axisValue('innovation_hook'),
    axisValue('payoff_loop'),
    bible.reader_promise,
    bible.promise,
    target.summary || target.goal || target.chapter_goal,
    target.conflict || target.core_conflict,
    sceneBriefs.map(item => item.reader_payoff),
  ], 12)
  const coreEmotion = compactBriefText(firstDefined(
    contextPackage?.longform_compass?.core_emotion,
    contextPackage?.longform_compass?.coreEmotion,
    contextPackage?.longform_compass?.main_emotion,
    contextPackage?.longform_compass?.mainEmotion,
    contextPackage?.longformCompass?.coreEmotion,
    contextPackage?.longformCompass?.mainEmotion,
    longformCompass?.core_emotion,
    longformCompass?.coreEmotion,
    longformCompass?.main_emotion,
    longformCompass?.mainEmotion,
    axisValue('core_emotion'),
    axisValue('theme_emotion'),
    bible.core_emotion,
    bible.coreEmotion,
    bible.main_emotion,
    bible.mainEmotion,
    bible.commercial_positioning?.core_emotion,
    bible.commercialPositioning?.coreEmotion,
    bible.commercial_positioning?.main_emotion,
    bible.commercialPositioning?.mainEmotion,
    mustServe[0],
  ))
  const themeUnityRules = uniqueBriefStrings([
    coreEmotion ? `一本书从头到尾要有统一的核心情绪：${coreEmotion}` : '',
    coreEmotion ? '小情绪服从大情绪；随机翻开一章，情绪必须指向全书核心。' : '',
    coreEmotion ? '升级/复仇/寻宝等小情绪必须统一到主情绪之下，砍掉旁枝情绪线。' : '',
  ], 8)
  const noDrift = uniqueBriefStrings([
    longformCompass?.immutable_rules,
    bible.immutable_rules,
    bible.red_lines,
    target.forbidden_content,
    target.forbidden_repeats,
  ], 12)
  const repairFocus = uniqueBriefStrings([
    gateRepair,
    driftRisks,
    riskLaneActions,
  ], 10)
  const chapterNo = Number(target.chapter_no || target.chapterNo || contextPackage?.chapter_no || contextPackage?.chapterNo || 0)
  const periodicSellingPoints = uniqueBriefStrings([
    longformCompass?.reader_promise,
    axisValue('reader_promise'),
    axisValue('innovation_hook'),
    axisValue('payoff_loop'),
    bible.commercial_positioning?.selling_points,
    bible.commercialPositioning?.sellingPoints,
    bible.selling_points,
    bible.sellingPoints,
    bible.promise,
  ], 8)
  const periodicDriftCheck = chapterNo > 0 && chapterNo % 10 === 0
    ? {
        cadence: '每10章',
        due: true,
        question: '当初吸引读者的卖点还在吗？',
        selling_points: periodicSellingPoints,
        reason: '按 oh-story 核心卖点偏移诊断，第10/20/30章必须复核核心吸引元素是否被稀释或替换。',
      }
    : null
  const checks = gateChecks.length
    ? gateChecks
    : [
        mustServe.length ? normalizeCoreContractCheck({ key: 'reader_promise', label: '读者承诺', status: 'ok', reason: mustServe[0] }) : null,
        themeUnityRules.length ? normalizeCoreContractCheck({ key: 'theme_unity', label: '主题统一', status: 'ok', reason: themeUnityRules[0] }) : null,
        target.summary ? normalizeCoreContractCheck({ key: 'chapter_goal', label: '本章目标', status: 'ok', reason: target.summary }) : null,
        target.conflict ? normalizeCoreContractCheck({ key: 'core_conflict', label: '核心冲突', status: 'ok', reason: target.conflict }) : null,
        periodicDriftCheck ? normalizeCoreContractCheck({ key: 'ten_chapter_selling_point', label: '十章卖点复核', status: 'warn', reason: periodicDriftCheck.question }) : null,
      ].filter(Boolean)
  const summary = compactBriefText(
    repairFocus.length
      ? `本章必须修正：${repairFocus.slice(0, 2).join('；')}`
      : mustServe.length
        ? `本章必须服务：${mustServe.slice(0, 3).join('；')}`
        : '',
  )
  return normalizeCoreContractRadar({
    summary,
    must_serve: mustServe,
    no_drift: noDrift,
    theme_unity_rules: themeUnityRules,
    selling_point_execution_rules: OH_STORY_CORE_CONTRACT_SELLING_POINT_EXECUTION_RULES,
    repetition_strategy_rules: OH_STORY_CORE_CONTRACT_REPETITION_STRATEGY_RULES,
    commercial_rhythm_rules: OH_STORY_CORE_CONTRACT_COMMERCIAL_RHYTHM_RULES,
    goldfinger_structure_rules: OH_STORY_CORE_CONTRACT_GOLDFINGER_STRUCTURE_RULES,
    launch_pressure_rules: OH_STORY_CORE_CONTRACT_LAUNCH_PRESSURE_RULES,
    repair_focus: repairFocus,
    checks,
    periodic_drift_check: periodicDriftCheck,
  })
}

