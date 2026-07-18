import { asArray, compactText, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizeBeatCoolingType, inferBeatCoolingTypeFromText } from '../../novel-writing/beat-cooling-basics'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewBelongsToChapter, reviewPayloadForType, reviewTimestamp } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import { inferEndingHookType } from './ending-hook-type'
import {
  paragraphHasDownwardPressure,
  paragraphHasOppressionPressure,
  textHasDownwardSafetySignal,
} from '../../novel-writing/emotional-payoff-scans'
import { anchorMatchScore, normalizedMatchText } from '../../novel-writing/text-matching'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'
import {
  serialBlueprintClimaxRewardGapRuns,
  serialChapterExpectationLadderState,
  serialChapterExpectationPayoffSetupState,
  serialChapterHasPayoff,
  serialChapterHasProgress,
  serialChapterProseCharCount,
  serialChapterProtagonistGoalState,
  serialChapterRangeLabel,
  serialCharacterMotivationChainGapRuns,
  serialConflictNoExitGlueGapRuns,
  serialConflictThrillOverrun,
  serialCoreHookAbsenceGapRuns,
  serialCoreHookAngleRepetitionGapRuns,
  serialDeceptiveMainlineHandoffGapRuns,
  serialDownwardPressureRecoveryGapRuns,
  serialEndingHarvestHandoffGapRuns,
  serialEndingSuspenseHookGapRuns,
  serialExpectationChainBreakGapRuns,
  serialExpectationLadderGapRuns,
  serialExpectationPayoffSetupGapRuns,
  serialFiveChapterTextureGap,
  serialForeshadowingStallGapRuns,
  serialLineStaggerFlatlineRuns,
  serialPayoffWithoutAftermathRuns,
  serialProtagonistGoalContinuityGapRuns,
  serialReaderNeedCoverageGapRuns,
  serialRepeatedCoreElementComboRuns,
  serialRepeatedEndingHookTypeRuns,
  serialRepeatedReaderPayoffTypeRuns,
  serialRomanceCareerBindingGapRuns,
  serialRomanceTensionLayerGapRuns,
  serialShowdownPressureShockGapRuns,
  serialSocialNetworkBlankRuns,
  serialSupportingCharacterAgencyGapRuns,
  serialTrumpCardReserveGapRuns,
  serialTwoChapterMomentumStallRuns,
  serialUpgradeRewardPointGapRuns,
  serialUpperStatusContactGapRuns,
  serialWeakConflictRuns,
  serialWorldExpansionStallGapRuns,
} from './serial-momentum'

export function buildSerialMomentumBrief(chapter: any, chapters: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  const recent = [...asArray(chapters)]
    .filter((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) > 0)
    .filter((item: any) => !chapterNo || Number(item?.chapter_no || item?.chapterNo || 0) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || a.chapterNo || 0) - Number(b.chapter_no || b.chapterNo || 0))
    .slice(-5)
  if (recent.length < 2) return null

  const progressChapters = recent.filter(serialChapterHasProgress)
  const payoffChapters = recent.filter(serialChapterHasPayoff)
  const weakConflictRuns = serialWeakConflictRuns(recent)
  const twoChapterMomentumStallRuns = serialTwoChapterMomentumStallRuns(recent)
  const lineStaggerFlatlineRuns = serialLineStaggerFlatlineRuns(recent)
  const repeatedCoreElementComboRuns = serialRepeatedCoreElementComboRuns(recent)
  const coreHookAbsenceGapRuns = serialCoreHookAbsenceGapRuns(recent)
  const coreHookAngleRepetitionGapRuns = serialCoreHookAngleRepetitionGapRuns(recent)
  const worldExpansionStallGapRuns = serialWorldExpansionStallGapRuns(recent)
  const readerNeedCoverageGapRuns = serialReaderNeedCoverageGapRuns(recent)
  const expectationLadderGapRuns = serialExpectationLadderGapRuns(recent)
  const foreshadowingStallGapRuns = serialForeshadowingStallGapRuns(recent)
  const fiveChapterTextureGap = serialFiveChapterTextureGap(recent)
  const conflictThrillOverrun = serialConflictThrillOverrun(recent)
  const blueprintClimaxRewardGapRuns = serialBlueprintClimaxRewardGapRuns(recent)
  const endingHarvestHandoffGapRuns = serialEndingHarvestHandoffGapRuns(recent)
  const endingSuspenseHookGapRuns = serialEndingSuspenseHookGapRuns(recent)
  const expectationChainBreakGapRuns = serialExpectationChainBreakGapRuns(recent)
  const expectationPayoffSetupGapRuns = serialExpectationPayoffSetupGapRuns(recent)
  const deceptiveMainlineHandoffGapRuns = serialDeceptiveMainlineHandoffGapRuns(recent)
  const upgradeRewardPointGapRuns = serialUpgradeRewardPointGapRuns(recent)
  const romanceTensionLayerGapRuns = serialRomanceTensionLayerGapRuns(recent)
  const romanceCareerBindingGapRuns = serialRomanceCareerBindingGapRuns(recent)
  const trumpCardReserveGapRuns = serialTrumpCardReserveGapRuns(recent)
  const showdownPressureShockGapRuns = serialShowdownPressureShockGapRuns(recent)
  const characterMotivationChainGapRuns = serialCharacterMotivationChainGapRuns(recent)
  const supportingCharacterAgencyGapRuns = serialSupportingCharacterAgencyGapRuns(recent)
  const conflictNoExitGlueGapRuns = serialConflictNoExitGlueGapRuns(recent)
  const socialNetworkBlankRuns = serialSocialNetworkBlankRuns(recent)
  const upperStatusContactGapRuns = serialUpperStatusContactGapRuns(recent)
  const downwardPressureRecoveryGapRuns = serialDownwardPressureRecoveryGapRuns(recent)
  const protagonistGoalContinuityGapRuns = serialProtagonistGoalContinuityGapRuns(recent)
  const repeatedHookTypeRuns = serialRepeatedEndingHookTypeRuns(recent)
  const repeatedPayoffTypeRuns = serialRepeatedReaderPayoffTypeRuns(recent)
  const payoffWithoutAftermathRuns = serialPayoffWithoutAftermathRuns(recent)
  const lastPayoffIndex = (() => {
    for (let index = recent.length - 1; index >= 0; index -= 1) {
      if (serialChapterHasPayoff(recent[index])) return index
    }
    return -1
  })()
  const noPayoffSinceLast = lastPayoffIndex >= 0 ? recent.slice(lastPayoffIndex + 1) : recent
  const noPayoffCharCount = noPayoffSinceLast.reduce((sum, item) => sum + serialChapterProseCharCount(item), 0)
  const signals: any[] = []
  const fatigueRisks: string[] = []
  const nextActions: string[] = []
  const rangeLabel = serialChapterRangeLabel(recent)

  if (recent.length >= 5 && progressChapters.length <= 1) {
    signals.push({
      key: 'recent_five_low_progress',
      label: '最近5章进展',
      status: 'warn',
      detail: `${rangeLabel}只有 ${progressChapters.length} 章有明确进展，读者可能感觉主线停滞。`,
    })
    fatigueRisks.push(`${rangeLabel}最近5章明确进展不足：读完章节后世界、关系、主线或信息状态变化不够。`)
    nextActions.push('下一章必须让读完本章世界或关系必须不同：至少完成一个新发现、反制、胜负结果、关系变化或主线推进。')
  }

  if (weakConflictRuns.length > 0) {
    const longestRun = weakConflictRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'consecutive_weak_conflict',
      label: '连续弱冲突',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章弱冲突或过场，缺少明确阻力。`,
    })
    fatigueRisks.push(`${runLabel}连续弱冲突：冲突停在等待、观察、复盘、转场或说明，没有可见阻力和胜负变化。`)
    nextActions.push('下一章必须给出明确阻力：有人、规则、资源、时间限制或代价真正挡住主角，并写出行动阻拦和胜负变化。')
  }

  if (twoChapterMomentumStallRuns.length > 0) {
    const longestRun = twoChapterMomentumStallRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'two_chapter_momentum_stall',
      label: '两章动能拖沓',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章没有目标推进、阻碍升级或新信息，触发 oh-story 写前节奏自检。`,
    })
    fatigueRisks.push(`${runLabel}连续两章缺目标推进、阻碍升级或新信息：章节在整理、等待、复看或解释中原地打转，读者看不到局势变化。`)
    nextActions.push('下一章必须提高冲突密度：让目标推进一步，或让阻碍升级成新门槛/倒计时/代价，或抛出能改变判断的新信息。')
  }

  if (lineStaggerFlatlineRuns.length > 0) {
    const longestRun = lineStaggerFlatlineRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'line_stagger_flatline',
      label: '主支线同时空转',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章主线和支线都停在等待、观察、整理、复盘或铺垫。`,
    })
    fatigueRisks.push(`${runLabel}主线和支线同时空转：两条线都没有错开推进，读者会感觉章节只在等信息而不是往前走。`)
    nextActions.push('下一章必须错开节奏：主线和支线至少推进一条，另一条只保留钩子、代价或伏笔；不要两条线一起等待、复盘或铺垫。')
  }

  if (repeatedCoreElementComboRuns.length > 0) {
    const longestRun = repeatedCoreElementComboRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const comboLabel = longestRun[0]?.combo?.label || '同一核心要素组合'
    signals.push({
      key: 'repeated_core_element_combo',
      label: '核心要素组合重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${comboLabel}」核心要素组合，套路轮廓过于相同。`,
    })
    fatigueRisks.push(`${runLabel}核心要素组合重复：连续章节都在使用「${comboLabel}」，读者容易看出模板。`)
    nextActions.push(`下一章必须更换场景、人物或情绪中的至少一项，并轮换核心事件要素；不要继续使用「${comboLabel}」的完整组合。`)
  }

  if (coreHookAbsenceGapRuns.length > 0) {
    const longestRun = coreHookAbsenceGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'core_hook_absence_gap',
      label: '核心梗空白',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有核心梗/卖点合同，但章节摘要和章尾没有交付相关期待点、爽点或核心卖点回报。`,
    })
    fatigueRisks.push(`${runLabel}核心梗连续空白：写了流程、排队、整理或普通对话，但没有让读者看到核心卖点、金手指/能力使用、期待点、爽点或题材长板回报。`)
    nextActions.push('下一章必须回到核心梗：至少写一个核心卖点相关期待点或爽点，例如金手指/能力使用、规则反制、客户态度反转、订单/奖励到账，且换一个角度推进。')
  }

  if (coreHookAngleRepetitionGapRuns.length > 0) {
    const longestRun = coreHookAngleRepetitionGapRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const angleLabel = longestRun[0]?.angle || '同一角度'
    signals.push({
      key: 'core_hook_angle_repetition_gap',
      label: '核心梗角度重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章都用「${angleLabel}」交付核心卖点，缺少不同角度或不同矛盾。`,
    })
    fatigueRisks.push(`${runLabel}同一核心卖点角度重复：核心梗有出现，但连续落在「${angleLabel}」，读者会感觉只是换设备、换对象、换壳重复同一小循环。`)
    nextActions.push('下一章必须把同一核心卖点换成不同角度/不同矛盾：从检测定位切到规则反制、修复交付、客户订单回报、系统奖励反馈或信息差反转之一。')
  }

  if (worldExpansionStallGapRuns.length > 0) {
    const longestRun = worldExpansionStallGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'world_expansion_stall_gap',
      label: '世界扩展停滞',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有地图/循环扩展合同，但章节摘要、蓝图和章尾没有打开新地图、新势力、新规则或大循环期待。`,
    })
    fatigueRisks.push(`${runLabel}世界观扩展停滞：长篇循环仍停在同一小场景、同类客户/设备或同一窗口流程，没有让地图、势力、规则层或大循环变大。`)
    nextActions.push('下一章必须显性打开世界扩展：新地图、新势力、新规则/资源门槛或大循环期待至少落一个，并把它接到当前小循环的下一目标。')
  }

  if (readerNeedCoverageGapRuns.length > 0) {
    const longestRun = readerNeedCoverageGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'reader_need_coverage_gap',
      label: '读者需求命中缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有目标读者/情绪缺口合同，但章节没有落到尊严、掌控感、认可、反制、收益或可感知回报。`,
    })
    fatigueRisks.push(`${runLabel}读者需求连续未命中：章节在流程、设定或材料处理中推进，却没有满足目标读者想看的尊严补偿、掌控感、被认可、翻盘、即时收益或可见回报。`)
    nextActions.push('下一章必须把卖点重新对准读者需求：从尊严、掌控感、安全感、认可、反制翻盘或可感知回报里至少落一个，并写成现场行动、角色反应和结果。')
  }

  if (expectationLadderGapRuns.length > 0) {
    const longestRun = expectationLadderGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const missingKinds = uniqueBriefStrings(longestRun.flatMap((item: any) => serialChapterExpectationLadderState(item).missing), 6)
    signals.push({
      key: 'expectation_ladder_gap',
      label: '期待层级断线',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有两长一短/期待阈值合同，但缺少${missingKinds.join('、') || '短中长期待'}的正文证据。`,
    })
    fatigueRisks.push(`${runLabel}两长一短断线：章节只处理眼前流程或当前材料，短期下一章、中期剧情单元、长期卷/全书期待没有同时在线。`)
    nextActions.push('下一章必须恢复三层期待：短期写下一章会发生什么，中期写这个剧情单元怎么收，长期写父亲旧案/幕后势力/卷目标等远期悬念，并在章尾同时保温。')
  }

  if (foreshadowingStallGapRuns.length > 0) {
    const longestRun = foreshadowingStallGapRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const clueLabel = longestRun[0]?.label || '同一伏笔'
    signals.push({
      key: 'foreshadowing_stall_gap',
      label: '伏笔推进停滞',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章重复「${clueLabel}」，但没有信息增量、答案路径、半回收或新门槛。`,
    })
    fatigueRisks.push(`${runLabel}伏笔不是谜语人：同一长期线索「${clueLabel}」连续出现却不推进，读者会感觉作者只是在拖延信息。`)
    nextActions.push(`下一章必须推进「${clueLabel}」：提前给一部分答案、打开答案路径、让线索对应具体门锁/人物/地点，或删掉重复提醒并换成新的可追踪伏笔。`)
  }

  if (fiveChapterTextureGap) {
    const runLabel = serialChapterRangeLabel(fiveChapterTextureGap)
    signals.push({
      key: 'five_chapter_texture_gap',
      label: '五章调剂缺口',
      status: 'warn',
      detail: `${runLabel}最近5章缺少关系深化或世界观展开，连续流程/冲突会削弱连载层次。`,
    })
    fatigueRisks.push(`${runLabel}缺少关系深化或世界观展开：最近5章都在推进流程、压迫、追查或反制，人物关系和世界层次没有给读者新的可感知变化。`)
    nextActions.push('下一章必须补关系深化或世界观展开：让信任、同盟、承诺、担保发生质变，或打开新地图、新势力、新规则/资源门槛；世界观展开要绑定剧情推进，不搞说明文。')
  }

  if (conflictThrillOverrun) {
    const runLabel = serialChapterRangeLabel(conflictThrillOverrun)
    signals.push({
      key: 'conflict_thrill_overrun',
      label: '大冲突冷却',
      status: 'warn',
      detail: `${runLabel}连续 ${conflictThrillOverrun.length} 章是大冲突/打斗/公开压迫节拍，超过 oh-story 连续 2 章冷却线。`,
    })
    fatigueRisks.push(`${runLabel}大冲突连续超出冷却线：连续审问、打斗、对抗或压迫会让爽点疲劳，读者需要看到关系、世界、势力或余波层面的变化。`)
    nextActions.push('下一章必须轮换桥段类型：优先写关系深化、世界观展开、势力建设或冲突余波，不要继续开打或继续会审压问。')
  }

  if (blueprintClimaxRewardGapRuns.length > 0) {
    const longestRun = blueprintClimaxRewardGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'blueprint_climax_reward_gap',
      label: '蓝图闭环缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章蓝图缺少明确高潮和收获闭环，容易写成只有起因、发展和铺垫。`,
    })
    fatigueRisks.push(`${runLabel}缺少高潮和收获闭环：章节蓝图没有把起因、发展推到可见高潮，也没有清点收获或下一目标。`)
    nextActions.push('下一章蓝图必须补完整闭环：起因 -> 发展 -> 高潮 -> 收获，并在结尾清点收益、代价、下一目标或新门槛。')
  }

  if (endingHarvestHandoffGapRuns.length > 0) {
    const longestRun = endingHarvestHandoffGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'ending_harvest_handoff_gap',
      label: '章尾交接缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章章尾没有同时完成收获清点和铺垫下一段，结尾容易只结账或只开新坑。`,
    })
    fatigueRisks.push(`${runLabel}章尾没有同时完成收获清点和铺垫下一段：读者看不到本章到手的结果，或不知道下一段为什么必须继续追。`)
    nextActions.push('下一章结尾必须同时完成两件事：先做收获清点（收益、代价、状态或线索），再铺垫下一段（下一目标、新风险、未解决问题或新门槛）。')
  }

  if (endingSuspenseHookGapRuns.length > 0) {
    const longestRun = endingSuspenseHookGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'ending_suspense_hook_gap',
      label: '章尾悬念缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章结尾平静收束，没有留下未解决悬念、危险、倒计时或新门槛。`,
    })
    fatigueRisks.push(`${runLabel}断章追读不足：章尾把旧案、禁库或账册处理成完成、整理、恢复平静，但没有未解决问题、危险触发、倒计时压力或下一层新门槛。`)
    nextActions.push('下一章结尾必须留下具体追读钩子：未解决问题、可见危险、倒计时、新门槛或现场触发物至少落一个，不能只写整理完毕、恢复平静或回房休息。')
  }

  if (expectationChainBreakGapRuns.length > 0) {
    const longestRun = expectationChainBreakGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'expectation_chain_break_gap',
      label: '连续断期待',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章闭合旧期待或兑现当前目标，但没有先立起下一开环。`,
    })
    fatigueRisks.push(`${runLabel}断期待风险：旧目标、证人答案、资格门槛或父亲旧案被连续兑现后，文本把期待清空或让麻烦消失，读者会觉得赢完就空。`)
    nextActions.push('下一章必须先补下一开环再兑现旧期待：至少挂一个下一目标、新门槛、新线索、新困境或长期期待，并让它在高潮前或章尾可见。')
  }

  if (expectationPayoffSetupGapRuns.length > 0) {
    const longestRun = expectationPayoffSetupGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const states = longestRun.map((item: any) => serialChapterExpectationPayoffSetupState(item))
    const setupChars = states.reduce((sum, item) => sum + Number(item.setup_chars || 0), 0)
    const payoffChars = states.reduce((sum, item) => sum + Number(item.payoff_chars || 0), 0)
    signals.push({
      key: 'expectation_payoff_setup_gap',
      label: '期待铺垫不足',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章爽点/高潮释放前铺垫不足，铺垫约 ${setupChars} 字，释放约 ${payoffChars} 字。`,
    })
    fatigueRisks.push(`${runLabel}期待感小于爽点释放：爽点、打脸或揭露前的危机、期待、信息差或代价铺垫短于释放段。`)
    nextActions.push('下一章必须先铺期待再释放爽点：危机、压迫、信息差、误判、暗牌或代价的铺垫篇幅不少于释放篇幅，再进入打脸、揭露、反制或收获。')
  }

  if (deceptiveMainlineHandoffGapRuns.length > 0) {
    const longestRun = deceptiveMainlineHandoffGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'deceptive_mainline_handoff_gap',
      label: '欺骗式主线交接缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章把主线写成彻底收束，但没有留下接近完成又差一点的继续追读缺口。`,
    })
    fatigueRisks.push(`${runLabel}欺骗式主线不足：主线看起来已经完成、真相大白或彻底解决，却没有留下最后一块证据、更高一层阻碍或新的门槛。`)
    nextActions.push('下一章必须补欺骗式主线交接：让主线看似接近完成又差一点，明确最后一块证据、未开的入口、更高一层人物、新门槛或新代价，避免把阶段主线关死。')
  }

  if (upgradeRewardPointGapRuns.length > 0) {
    const longestRun = upgradeRewardPointGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'upgrade_reward_point_gap',
      label: '升级奖励点缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章处在升级/试炼/榜单/成长阶段，但缺少明确奖励点。`,
    })
    fatigueRisks.push(`${runLabel}升级文奖励点不足：阶段推进停在试炼、境界、榜单或系统条件里，读者没有拿到升级、装备、认可或揭秘的明确回报。`)
    nextActions.push('下一章必须落一个阶段奖励点：升级/装备/认可/揭秘至少一项要可见，并把奖励点接到下一门槛、下一排名、下一能力用途或下一条主线线索。')
  }

  if (romanceTensionLayerGapRuns.length > 0) {
    const longestRun = romanceTensionLayerGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'romance_tension_layer_gap',
      label: '感情线拉扯缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有感情/暧昧桥段，但缺少拉扯、边界、选择或代价层次。`,
    })
    fatigueRisks.push(`${runLabel}感情线只有陪伴或甜味堆叠：关系在递茶、照顾、并肩等桥段里重复，但没有试探、误会、边界、主动选择、事业节点或代价变化。`)
    nextActions.push('下一章感情线必须补拉扯和层次：把一个甜/陪伴桥段改成试探、误会、边界、主动选择、代价或事业/成长节点绑定，做到有拉扯有层次，不是堆砌桥段。')
  }

  if (romanceCareerBindingGapRuns.length > 0) {
    const longestRun = romanceCareerBindingGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'romance_career_binding_gap',
      label: '感情事业绑定缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有感情/关系桥段，但没有牵动事业线、主线调查、资格资源或角色选择后果。`,
    })
    fatigueRisks.push(`${runLabel}感情线和事业线脱钩：关系有试探、误会、确认或陪伴，但没有改写主线进度、调查资源、资格名额、证人立场或下一章门槛。`)
    nextActions.push('下一章必须让感情线绑定事业线或主线：一次亲密、误会、试探或共同承担，要改变主线线索、调查入口、资格资源、证人立场、事业选择或下一章门槛。')
  }

  if (trumpCardReserveGapRuns.length > 0) {
    const longestRun = trumpCardReserveGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'trump_card_reserve_gap',
      label: '底牌储备缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章释放底牌后没有保留未揭示底牌或补入新后手，后续期待会被摊空。`,
    })
    fatigueRisks.push(`${runLabel}底牌管理不足：连续亮底牌、摊底牌或用尽后手，但没有让读者看到仍有2-3个未揭示底牌、新后手、新技能、新目标或更高门槛。`)
    nextActions.push('下一章必须修底牌储备：每次只出1个底牌，并明确保留2-3个未揭示底牌；如果已经摊空，就立刻补新后手、新技能、新目标或更高门槛。')
  }

  if (showdownPressureShockGapRuns.length > 0) {
    const longestRun = showdownPressureShockGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'showdown_pressure_shock_gap',
      label: '三压三震缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有装逼/反制/高潮爽点，但缺少友方、敌方、中立三路铺压和爆后三方震动。`,
    })
    fatigueRisks.push(`${runLabel}三压一爆三震不足：爽点连续落成主角拿证据、反制或翻盘后统一震惊，缺少友方期待、敌方不服、中立观望加压，以及友方/敌方/中立爆后不同震动。`)
    nextActions.push('下一章必须补三压一爆三震：先铺友方期待或站队、敌方两次不服或逼迫、中立方观望加压；主角一爆后分别写友方传话/站队、敌方破防/改口、中立方改判/重审。')
  }

  if (characterMotivationChainGapRuns.length > 0) {
    const longestRun = characterMotivationChainGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'character_motivation_chain_gap',
      label: '角色动机链缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章角色行动依赖突然决定、剧情需要或方便主线，但缺少可见动机链。`,
    })
    fatigueRisks.push(`${runLabel}角色动机链缺失，行为像被剧情倒推：主角、配角或反派在突然决定、交证据、改口、退场或改判，但看不到起因、情感动机、约束、风险、代价和行为变化。`)
    nextActions.push('下一章必须补角色动机链：关键行动前先写具体起因，再写情感动机、约束/风险、选择代价和行为变化；不要再用“突然”“剧情需要”“方便主线”推动角色。')
  }

  if (supportingCharacterAgencyGapRuns.length > 0) {
    const longestRun = supportingCharacterAgencyGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'supporting_character_agency_gap',
      label: '配角能动性缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章有配角参与推进，但缺少自己的立场、动机、利益或代价。`,
    })
    fatigueRisks.push(`${runLabel}配角工具人化：配角连续承担递证据、提醒、阻止、传令或交钥匙等功能位，但看不到自己的目标、立场、利益、压力或代价。`)
    nextActions.push('下一章必须补配角能动性：至少给一个关键配角明确立场、动机、利益或代价，并让这个配角的选择改变主角方案、冲突走向或下一章门槛，避免单纯工具人。')
  }

  if (conflictNoExitGlueGapRuns.length > 0) {
    const longestRun = conflictNoExitGlueGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'conflict_no_exit_glue_gap',
      label: '冲突黏结剂缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章已有阻力或对抗，但缺少让主角不能抽身的黏结剂。`,
    })
    fatigueRisks.push(`${runLabel}缺少冲突黏结剂：虽然有人阻止主角，但读者还看不出主角为什么不能随时退出，冲突紧张感会变松。`)
    nextActions.push('下一章必须补冲突黏结剂：让读者相信主角不能随时退出，并至少使用杀人理由、工作职责、道德责任或实体场所之一绑定对立双方。')
  }

  if (socialNetworkBlankRuns.length > 0) {
    const longestRun = socialNetworkBlankRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'protagonist_social_network_blank',
      label: '主角社会关系空白',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章缺少能改变立场、关系、资源或规则评价的人际互动。`,
    })
    fatigueRisks.push(`${runLabel}社会关系不空白要求未满足：主角连续独自推进，缺少互动人际网络，读者看不到关系、立场和声望如何变化。`)
    nextActions.push('下一章必须补互动人际网络：安排至少一个有立场、有利益或有权威的人与主角互动，并让互动改变关系、立场、资源、声望或规则评价。')
  }

  if (upperStatusContactGapRuns.length > 0) {
    const longestRun = upperStatusContactGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'upper_status_contact_gap',
      label: '上层地位触点缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章停留在低层组织/阶层规则里，没有触碰上位者、资格门槛或地位收获。`,
    })
    fatigueRisks.push(`${runLabel}上层地位不缺失要求未满足：外门、杂役、低层规则持续循环，但缺少上位者、资格、名额、晋升或更高规则的牵引。`)
    nextActions.push('下一章必须补上行触点：让上位者、资格/名额、晋升门槛、审判庭/长老席规则或地位收获至少落一个，并让它改变主角下一段目标。')
  }

  if (downwardPressureRecoveryGapRuns.length > 0) {
    const longestRun = downwardPressureRecoveryGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'downward_pressure_recovery_gap',
      label: '下压回收缺口',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章让主角承压或吃瘪，但缺少安全感、反制窗口或意外收获。`,
    })
    fatigueRisks.push(`${runLabel}主角吃瘪没有从其他角度拉回：连续下压缺少深层逻辑、潜在解法、暗牌证据、盟友动作、规则漏洞或意外收获。`)
    nextActions.push('下一章必须拉回情绪：在继续施压前先给读者看见潜在解法、暗牌/证据、盟友动作、规则漏洞、深层逻辑或意外收获，避免只让主角受辱受损。')
  }

  if (protagonistGoalContinuityGapRuns.length > 0) {
    const longestRun = protagonistGoalContinuityGapRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    const missingKinds = uniqueBriefStrings(longestRun.flatMap((item: any) => serialChapterProtagonistGoalState(item).missing), 4)
    signals.push({
      key: 'protagonist_goal_continuity_gap',
      label: '主角目标断线',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章缺少${missingKinds.join('、') || '当前小目标或长线大目标'}，主角行动容易变成被剧情推着走。`,
    })
    fatigueRisks.push(`${runLabel}当前小目标和长线大目标不够清晰：读者不知道主角眼前要拿什么、长线为什么非走不可。`)
    nextActions.push('下一章必须同时写清短线行动目标和长线大目标：先让主角主动选择眼前要拿到的结果，再把它挂回长期追求、卷级目标或主线终局。')
  }

  if (noPayoffSinceLast.length > 0 && noPayoffCharCount > 5000) {
    const noPayoffRangeLabel = serialChapterRangeLabel(noPayoffSinceLast)
    signals.push({
      key: 'payoff_interval_over_5000_chars',
      label: '爽点间隔',
      status: 'warn',
      detail: `${noPayoffRangeLabel || rangeLabel}距上次可见回报后累计约 ${noPayoffCharCount} 字没有新爽点，超过 oh-story 5000 字警戒线。`,
    })
    fatigueRisks.push(`${noPayoffRangeLabel || rangeLabel}爽点间隔超过5000字：读者长时间没有看到收益、反制、升级、信息解锁或阶段结算。`)
    nextActions.push('下一章必须交付显性回报：不要只继续铺垫或复盘，必须让主角获得收益、完成反制、逼对手改口、解锁关键信息或完成阶段结算。')
  }

  if (recent.length >= 3 && payoffChapters.length === 0) {
    signals.push({
      key: 'recent_payoff_drought',
      label: '回报间隔',
      status: 'warn',
      detail: `${rangeLabel}缺少可见读者回报，爽点、收益、反制结果或阶段结算间隔过长。`,
    })
    fatigueRisks.push(`${rangeLabel}可见读者回报不足：最近章节没有明确爽点、收益、反制结果、阶段结算或关系回报。`)
    nextActions.push('下一章必须交付显性回报：让主角拿到收益、完成反制、逼对手改口、解锁信息、推进关系或完成阶段结算。')
  }

  if (repeatedPayoffTypeRuns.length > 0) {
    const longestRun = repeatedPayoffTypeRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const payoffType = longestRun[0]?.payoff_type || '同类回报'
    signals.push({
      key: 'repeated_reader_payoff_type',
      label: '回报形态重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${payoffType}」回报形态，容易形成爽点重复和审美疲劳。`,
    })
    fatigueRisks.push(`${runLabel}连续回报形态重复：连续 ${longestRun.length} 章都用「${payoffType}」，需要按 oh-story 爽点递增对比更换角度。`)
    nextActions.push(`下一章必须避开「${payoffType}」回报形态，改用信息解锁、关系回报、资源收益、能力升级、阶段结算或反制翻盘之一，并在影响范围、揭示深度或身份落差上至少升级一项。`)
  }

  if (repeatedHookTypeRuns.length > 0) {
    const longestRun = repeatedHookTypeRuns.sort((a, b) => b.length - a.length)[0]
    const runChapters = longestRun.map(row => row.chapter)
    const runLabel = serialChapterRangeLabel(runChapters)
    const hookType = longestRun[0]?.hook_type || '同类钩子'
    signals.push({
      key: 'repeated_ending_hook_type',
      label: '章末钩子类型重复',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章使用「${hookType}」章末钩子，容易让翻页期待疲劳。`,
    })
    fatigueRisks.push(`${runLabel}连续章尾钩子类型重复：连续 ${longestRun.length} 章都用「${hookType}」，违反 oh-story 连续两章不用同一种钩子的规则。`)
    nextActions.push(`下一章必须避开「${hookType}」章末钩子，改用新的选择、危险、倒计时、未完成动作、神秘物品或承诺/威胁，并让新钩子改变信息、风险或情绪角度。`)
  }

  if (payoffWithoutAftermathRuns.length > 0) {
    const longestRun = payoffWithoutAftermathRuns.sort((a, b) => b.length - a.length)[0]
    const runLabel = serialChapterRangeLabel(longestRun)
    signals.push({
      key: 'consecutive_payoff_without_aftermath',
      label: '连续爆点无余波',
      status: 'warn',
      detail: `${runLabel}连续 ${longestRun.length} 章交付爆点或回报，但缺少关系、伏笔、状态或下一目标承接。`,
    })
    fatigueRisks.push(`${runLabel}连续只爆点不留反应余波：读者看到赢点后，没有看到关系、伏笔、状态或新门槛被推进。`)
    nextActions.push('下一章必须插入1-2个承接余波场景：让关系、伏笔、状态、新目标或新代价至少推进一项，再进入下一个爆点。')
  }

  if (!signals.length) return null
  const hasPayoffDrought = signals.some((signal: any) => signal.key === 'recent_payoff_drought' || signal.key === 'payoff_interval_over_5000_chars')
  const repeatedHookTypeSignal = signals.find((signal: any) => signal.key === 'repeated_ending_hook_type')
  const repeatedPayoffTypeSignal = signals.find((signal: any) => signal.key === 'repeated_reader_payoff_type')
  const payoffWithoutAftermathSignal = signals.find((signal: any) => signal.key === 'consecutive_payoff_without_aftermath')
  return {
    version: 'oh_story_serial_momentum_v1',
    status: 'needs_attention',
    score: Math.max(0, 100 - signals.length * 18 - Math.max(0, 2 - progressChapters.length) * 8 - (hasPayoffDrought ? 6 : 0)),
    chapter_range_label: rangeLabel,
    summary: `${rangeLabel}连载动能需要修复：${signals.map(signal => signal.label).join('、')}。`,
    signals,
    fatigue_risks: uniqueBriefStrings(fatigueRisks, 8),
    next_actions: uniqueBriefStrings(nextActions, 8),
    conflict_variation: '本章必须更换冲突来源，并让阻力从背景说明升级为可见行动阻拦。',
    payoff_variation: repeatedPayoffTypeSignal
      ? `更换回报形态：${repeatedPayoffTypeSignal.detail} 下一章必须按影响范围、揭示深度或身份落差升级爽点。`
      : hasPayoffDrought
      ? '本章必须交付显性回报：收益、反制结果、阶段结算、信息解锁或关系变化至少落一个。'
      : '本章必须给出明确状态变化或读者回报，不能只复盘、等待或解释。',
    hook_variation: repeatedHookTypeSignal
      ? `更换章末钩子类型：${repeatedHookTypeSignal.detail}`
      : '章末必须留下新的选择、危险、发现或反转，不能用氛围句收束。',
    scene_freshness: payoffWithoutAftermathSignal
      ? '至少补一个承接场景，把上一轮爆点后的关系余波、伏笔线索、状态变化或新目标写成读者能复述的可视化场面。'
      : '至少补一个能被读者复述的可视化场面，证明连载动能恢复。',
  }
}

function serialQualityRiskFromReview(review: any, chapter: any) {
  const type = String(review?.review_type || '')
  const payload = reviewPayloadForType(review, type)
  if (!reviewBelongsToChapter(review, payload, chapter)) return null
  const status = String(payload?.status || review?.status || '').toLowerCase()
  const countFrom = (...keys: string[]) => keys.reduce((max, key) => {
    const value = Number(payload?.[key])
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  const score = Number(
    payload?.score
    ?? payload?.self_check?.review?.score
    ?? payload?.selfCheck?.review?.score
    ?? payload?.readability_score
    ?? payload?.readabilityScore,
  )
  const needsRevision = Boolean(
    payload?.needs_revision
    || payload?.needsRevision
    || payload?.self_check?.review?.needs_revision
    || payload?.selfCheck?.review?.needsRevision,
  )
  const serialRiskRepairRisks = type === 'prose_quality'
    ? proseQualitySerialRiskRepairRisks(payload)
    : []
  const riskCount = (() => {
    if (type === 'prose_quality') return serialRiskRepairRisks.length || ((status === 'warn' || needsRevision || (Number.isFinite(score) && score > 0 && score < 78)) ? 1 : 0)
    if (type === 'deterministic_prose_cleanup') return countFrom('risk_count', 'riskCount')
    if (type === 'state_delta_completeness') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_blueprint_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'core_contract_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'benchmark_recall_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'style_boundary_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_loop_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'information_flow_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'expectation_threshold_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'emotional_arc_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'paragraph_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'suspense_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reversal_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'showdown_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'spectator_reaction_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'payoff_setup_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'bridge_unit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'beat_cooling_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'opening_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_craft_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'punctuation_tone_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'quality_audit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_handoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_title_uniqueness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'dialogue_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_behavior_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'asset_linkage_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'state_tracking_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'source_readiness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_meta_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'intent_confirmation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'continuity_heat_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'conflict_structure_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'upgrade_rhythm_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'target_reader_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'genre_positioning_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'female_audience_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'plot_dynamics_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_power_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_relation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reader_retention_sync') return countFrom('missed_count', 'missedCount', 'weak_count', 'weakCount')
    if (type === 'reader_payoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'readability_review') return countFrom('risk_count', 'riskCount') || ((Number.isFinite(score) && score > 0 && score < 78) ? 1 : 0)
    return 0
  })()
  if (riskCount <= 0 || (status === 'ok' && serialRiskRepairRisks.length <= 0)) return null
  const labels: Record<string, string> = {
    prose_quality: '质量门禁',
    deterministic_prose_cleanup: '确定性清理',
    state_delta_completeness: '状态漏记',
    chapter_blueprint_sync: '细纲兑现',
    core_contract_sync: '核心契约',
    benchmark_recall_sync: '文风召回',
    style_boundary_sync: '文风边界',
    story_loop_sync: '故事循环',
    information_flow_sync: '信息流',
    expectation_threshold_sync: '期待阈值',
    emotional_arc_sync: '情绪弧',
    chapter_hook_sync: '章级钩子',
    paragraph_hook_sync: '段落钩子',
    suspense_sync: '悬念编排',
    reversal_sync: '反转设计',
    showdown_sync: '高潮对抗',
    spectator_reaction_sync: '围观反应',
    payoff_setup_sync: '爽点铺垫',
    bridge_unit_sync: '桥段节奏',
    beat_cooling_sync: '节奏冷却',
    opening_sync: '开篇设计',
    prose_craft_sync: '正文工艺',
    punctuation_tone_sync: '语气标点',
    quality_audit_sync: '质量诊断',
    chapter_handoff_sync: '章首承接',
    chapter_title_uniqueness_sync: '章节标题',
    dialogue_sync: '对白质量',
    character_behavior_sync: '角色行为',
    asset_linkage_sync: '资产挂钩',
    state_tracking_sync: '状态跟踪',
    source_readiness_sync: '来源就绪',
    prose_meta_sync: '正文元信息',
    intent_confirmation_sync: '意图确认',
    continuity_heat_sync: '连续性热度',
    conflict_structure_sync: '冲突结构',
    upgrade_rhythm_sync: '升级节奏',
    target_reader_sync: '目标读者',
    genre_positioning_sync: '题材定位',
    female_audience_sync: '女频长篇',
    plot_dynamics_sync: '剧情动力',
    story_power_sync: '故事力',
    character_relation_sync: '角色关系',
    reader_retention_sync: '追读留存',
    reader_payoff_sync: '读者回报',
    readability_review: '可读性',
  }
  return {
    type,
    label: serialRiskRepairRisks.length ? '近章风险修复' : labels[type] || type,
    count: riskCount,
    evidence: serialRiskRepairRisks.length
      ? uniqueBriefStrings(serialRiskRepairRisks.flatMap((item: any) => [item.fix, item.evidence, item.label]), 6).join('；')
      : compactBriefText(payload?.label || payload?.summary || payload?.message || payload?.error || ''),
  }
}

function serialQualityRiskRuns(rows: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  for (const row of rows) {
    if (row.risks.length) {
      current.push(row)
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = []
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

export function buildSerialQualityRegressionBrief(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  const recent = [...asArray(chapters)]
    .filter((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) > 0)
    .filter((item: any) => !chapterNo || Number(item?.chapter_no || item?.chapterNo || 0) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || a.chapterNo || 0) - Number(b.chapter_no || b.chapterNo || 0))
    .slice(-5)
  if (recent.length < 2) return null
  const riskRows = recent.map((item: any) => ({
    chapter: item,
    risks: asArray(reviews).map(review => serialQualityRiskFromReview(review, item)).filter(Boolean),
  }))
  const riskyRows = riskRows.filter(row => row.risks.length)
  const runs = serialQualityRiskRuns(riskRows)
  if (riskyRows.length < 3 && !runs.length) return null
  const longestRun = runs.sort((a, b) => b.length - a.length)[0] || riskyRows
  const rangeLabel = serialChapterRangeLabel(recent)
  const runLabel = serialChapterRangeLabel(longestRun.map(row => row.chapter))
  const riskLabels = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.label)), 8)
  const riskEvidence = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.evidence || `${risk.label} ${risk.count}`)), 8)
  const serialRepairRegression = riskLabels.includes('近章风险修复')
  return {
    version: 'oh_story_serial_quality_regression_v1',
    status: 'needs_attention',
    score: Math.max(0, 70 - riskyRows.length * 8 - Math.max(0, longestRun.length - 1) * 6),
    chapter_range_label: rangeLabel,
    summary: `${rangeLabel}出现连续交稿质量退化：${riskLabels.join('、')}。`,
    signals: [{
      key: 'recent_delivery_quality_regression',
      label: '连续交稿质量退化',
      status: 'warn',
      detail: `${runLabel || rangeLabel}连续出现 ${riskLabels.join('、')} 等交稿风险。`,
    }],
    fatigue_risks: uniqueBriefStrings([
      `${runLabel || rangeLabel}连续交稿质量退化：${riskLabels.join('、')}。`,
      ...riskEvidence,
    ], 8),
    next_actions: [
      '无人值守连写必须降速：下一轮优先缩小到1-2章验证，不要继续扩批。',
      ...(serialRepairRegression ? ['下一章必须优先补近章风险修复：把失败的 scene_cards.serial_risk_repairs 和 recent_fatigue_action 写成目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却的可见事件。'] : []),
      '下一章必须先修复最近章节的质量债，再推进新冲突；质量门禁、状态增量、文风召回和细纲兑现不得继续累计。',
      '恢复扩批前必须证明本章有可见回报、状态写回、章末追读和确定性清理通过。',
    ],
    conflict_variation: '降速后先换冲突来源，并把阻力写成可见行动阻拦，避免继续复制上一批弱冲突。',
    payoff_variation: '降速验证章必须交付显性回报，用收益、反制结果、关系变化或阶段结算证明质量恢复。',
    hook_variation: '章末必须留下新的、可追问的问题，并写入下一章优先事项，不能继续制造空钩子。',
    scene_freshness: '本章至少放入一个验证修复的可视化场面，用正文证据证明状态、回报和风险债务已落地。',
  }
}

export function mergeRecentFatigueBriefs(...briefs: any[]) {
  const normalized = briefs
    .map(brief => brief ? normalizeRecentFatigueBrief(brief) : null)
    .filter(Boolean)
  if (!normalized.length) return null
  if (normalized.length === 1) return normalized[0]
  const warningBriefs = normalized.filter((brief: any) => String(brief.status || '').toLowerCase() !== 'ready')
  const source = warningBriefs[0] || normalized[0]
  return {
    status: warningBriefs.length ? 'needs_attention' : 'ready',
    score: Math.min(...normalized.map((brief: any) => Number.isFinite(Number(brief.score)) ? Number(brief.score) : 100)),
    chapter_range_label: uniqueBriefStrings(normalized.map((brief: any) => brief.chapter_range_label), 3).join('；'),
    summary: uniqueBriefStrings(normalized.map((brief: any) => brief.summary), 3).join('；'),
    fatigue_risks: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.fatigue_risks), 12),
    next_actions: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.next_actions), 12),
    signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    risk_signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.risk_signals || brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    conflict_variation: source.conflict_variation,
    payoff_variation: source.payoff_variation,
    hook_variation: source.hook_variation,
    scene_freshness: source.scene_freshness,
  }
}

export function normalizeExpectationItem(value: any, fallback: { key: string; label: string; type: string }) {
  const text = compactBriefText(typeof value === 'string' ? value : value?.text || value?.summary || value?.description || value?.name || value?.title)
  if (!text) return null
  return {
    key: compactBriefText(typeof value === 'object' ? value?.key : '', fallback.key),
    label: compactBriefText(typeof value === 'object' ? value?.label : '', fallback.label),
    type: compactBriefText(typeof value === 'object' ? value?.type : '', fallback.type),
    text,
  }
}

export function uniqueExpectationItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    if (!item?.text) continue
    const key = `${item.type || 'expectation'}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function normalizeDebtExpectationItem(value: any, fallback: { key: string; label: string; type: string }, extra: any = {}) {
  const normalized = normalizeExpectationItem(value, fallback)
  if (!normalized) return null
  const raw = typeof value === 'object' && value ? value : {}
  return {
    ...extra,
    age_chapters: Number(raw.age_chapters ?? raw.ageChapters ?? extra.age_chapters ?? 0) || null,
    overdue: Boolean(raw.overdue ?? extra.overdue ?? false),
    urgency: compactBriefText(raw.urgency || extra.urgency),
    ...normalized,
  }
}

const EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS = 2
const EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS = 4

export function applyReaderExpectationDebtAging(context: any, currentChapterNo: number) {
  const chapterNo = Number(currentChapterNo || 0)
  const decorate = (item: any, kind: 'must_carry' | 'keep_alive') => {
    const fromChapterNo = Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null
    const explicitAge = Number(item?.age_chapters ?? item?.ageChapters ?? 0) || null
    const age = chapterNo && fromChapterNo ? Math.max(0, chapterNo - fromChapterNo) : explicitAge
    const overdueAfter = kind === 'keep_alive'
      ? EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS
      : EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS
    const overdue = Boolean(item?.overdue) || (age !== null && age >= overdueAfter)
    return {
      ...item,
      from_chapter_no: fromChapterNo,
      age_chapters: age,
      overdue,
      urgency: overdue ? 'overdue' : age !== null && age > 0 ? 'due' : compactBriefText(item?.urgency),
    }
  }
  const mustCarry = uniqueExpectationItems(asArray(context?.must_carry).map((item: any) => decorate(item, 'must_carry')))
  const keepAlive = uniqueExpectationItems(asArray(context?.keep_alive).map((item: any) => decorate(item, 'keep_alive')))
  const overdue = uniqueExpectationItems([
    ...asArray(context?.overdue),
    ...mustCarry.filter((item: any) => item.overdue),
    ...keepAlive.filter((item: any) => item.overdue),
  ]).slice(0, 12)
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  const summary = [
    mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
    keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
    overdue.length ? `逾期 ${overdue.length} 项` : '',
  ].filter(Boolean).join('，')
  return {
    ...(context || {}),
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue,
    overdue_count: overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(summary || context?.summary || ''),
  }
}

export function normalizeReaderExpectationDebtContext(value: any) {
  const raw = value || {}
  const mustCarry = uniqueExpectationItems(asArray(raw.must_carry || raw.mustCarry || raw.carry_over || raw.carryOver)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const keepAlive = uniqueExpectationItems(asArray(raw.keep_alive || raw.keepAlive)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `debt_keep_alive_${index + 1}`, label: '继续悬念', type: 'question' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const overdue = uniqueExpectationItems(asArray(raw.overdue || raw.overdue_items || raw.overdueItems)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `overdue_${index + 1}`, label: '逾期待补', type: 'overdue' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
      overdue: true,
      urgency: 'overdue',
    }))
    .filter(Boolean))
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...overdue.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  return {
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue: overdue.slice(0, 12),
    overdue_count: Number(raw.overdue_count ?? raw.overdueCount ?? overdue.length) || overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(raw.summary || [
      mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
      keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
      overdue.length ? `逾期 ${overdue.length} 项` : '',
    ].filter(Boolean).join('，')),
  }
}

export function normalizeReaderExpectationLedgerContract(explicit: any, target: any = {}, brief: any = {}, debtContext: any = {}) {
  if (!explicit || typeof explicit !== 'object') return null
  const carryOver = uniqueExpectationItems([
    ...asArray(explicit.carry_over || explicit.carryOver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' })),
    ...asArray(debtContext?.must_carry),
  ].filter(Boolean))
  return {
    chapter_promise: compactBriefText(explicit.chapter_promise || explicit.chapterPromise || target.reader_promise || target.readerPromise || brief.reader_promise || brief.readerPromise),
    carry_over: carryOver,
    must_deliver: uniqueExpectationItems([
      ...carryOver,
      ...asArray(explicit.must_deliver || explicit.mustDeliver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `expectation_${index + 1}`, label: '读者期待', type: 'expectation' })),
    ].filter(Boolean)),
    keep_alive: uniqueExpectationItems([
      ...asArray(debtContext?.keep_alive),
      ...asArray(explicit.keep_alive || explicit.keepAlive).map((item: any, index: number) => normalizeExpectationItem(item, { key: `keep_alive_${index + 1}`, label: '保留悬念', type: 'question' })),
    ].filter(Boolean)),
    must_not_break: asArray(explicit.must_not_break || explicit.mustNotBreak).map((item: any) => compactBriefText(item)).filter(Boolean),
  }
}

export function buildReaderExpectationDebtContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  if (!chapterNo && !chapterId) return normalizeReaderExpectationDebtContext(null)
  const previousChapters = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-6)
  const previousChapterNos = new Set(previousChapters.map((item: any) => Number(item.chapter_no || 0)).filter(Boolean))
  const previousChapterIds = new Set(previousChapters.map((item: any) => Number(item.id || 0)).filter(Boolean))
  const latestByChapter = new Map<string, any>()
  for (const review of asArray(reviews)) {
    if (String(review?.review_type || '') !== 'reader_expectation_sync') continue
    const payload = parseJsonLikePayload(review?.payload) || {}
    const reviewChapterNo = Number(payload?.chapter_no || payload?.reader_expectation_sync?.chapter_no || review?.chapter_no || 0)
    const reviewChapterId = Number(payload?.chapter_id || payload?.reader_expectation_sync?.chapter_id || review?.chapter_id || 0)
    const isPrevious = previousChapterNos.has(reviewChapterNo) || previousChapterIds.has(reviewChapterId)
    if (!isPrevious) continue
    const key = reviewChapterId ? `id:${reviewChapterId}` : `no:${reviewChapterNo}`
    const existing = latestByChapter.get(key)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByChapter.set(key, { review, payload, chapter_no: reviewChapterNo || previousChapters.find((item: any) => Number(item.id || 0) === reviewChapterId)?.chapter_no || null })
    }
  }
  const mustCarry: any[] = []
  const keepAlive: any[] = []
  for (const item of Array.from(latestByChapter.values()).sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))) {
    const sync = item.payload?.reader_expectation_sync || item.payload?.result?.reader_expectation_sync || item.payload?.result || item.payload || {}
    const fromChapterNo = Number(sync?.chapter_no || item.chapter_no || 0) || null
    for (const missed of asArray(sync?.missed)) {
      const normalized = normalizeDebtExpectationItem(missed, { key: 'missed_expectation', label: '待补期待', type: 'carry_over' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) mustCarry.push(normalized)
    }
    for (const alive of asArray(sync?.keep_alive)) {
      const normalized = normalizeDebtExpectationItem(alive, { key: 'keep_alive', label: '继续悬念', type: 'question' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) keepAlive.push(normalized)
    }
  }
  return applyReaderExpectationDebtAging(normalizeReaderExpectationDebtContext({ must_carry: mustCarry, keep_alive: keepAlive }), chapterNo)
}
