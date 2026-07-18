import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildPlotDynamicsDeterministicCheck,
  normalizeClimaxFormulaCheck,
  normalizeLineStaggerRulesCheck,
  normalizePlotAbOutlineCheck,
  normalizePlotDriveModeRulesCheck,
  normalizePlotLoopCheck,
  normalizePlotScenePurposeCheck,
  plotDynamicsPriority,
} from '../../novel-writing/plot-dynamics-basics'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  firstCompactText,
  firstSceneCardText,
  normalizeStoryDriveDimension,
  storyDrivePriority,
} from '../../novel-writing/story-drive-basics'
import {
  normalizeStoryLoopBeat,
  normalizeStoryLoopMapTransitionCheck,
  normalizeStoryLoopNestedLoopCheck,
  storyLoopPriority,
} from '../../novel-writing/story-loop-basics'
import {
  normalizeStoryPowerCheck,
  storyPowerPriority,
} from '../../novel-writing/story-power-basics'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function plotDynamicsContractForSync(contextPackage: any, chapter: any = {}) {
  return buildPlotDynamicsContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildPlotDynamicsSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = plotDynamicsContractForSync(contextPackage, chapter)
  const checks = [
    normalizePlotLoopCheck(contract.plot_loop || contract.plotLoop, chapterText),
    normalizeClimaxFormulaCheck(contract.climax_formula || contract.climaxFormula, chapterText),
    normalizePlotAbOutlineCheck(contract.ab_outline || contract.abOutline, chapterText),
    normalizePlotScenePurposeCheck(contract.scene_purpose_map || contract.scenePurposeMap, chapterText),
    normalizePlotDriveModeRulesCheck(contract.drive_mode_rules || contract.driveModeRules, chapterText),
    normalizeLineStaggerRulesCheck(contract.line_stagger_rules || contract.lineStaggerRules, chapterText),
    buildPlotDynamicsDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = plotDynamicsPriority(missed)

  return {
    report_id: `plot-dynamics-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '剧情动力未配置' : status === 'ok' ? '剧情动力 OK' : `剧情动力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 plot_dynamics_contract，建议补充目标、阻碍、行动、代价/反馈、新期待、高潮公式、驱动方式和多线错峰。'
      : status === 'ok'
        ? '正文已基本兑现目标、阻碍、行动、代价/反馈、新期待、高潮公式、A/B节奏、场景功能、驱动方式和多线错峰。'
        : `正文有 ${missedCount} 项剧情动力缺口，${priorityRepair || '优先补剧情闭环和高潮落差'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持剧情动力：目标、阻碍、行动、代价/反馈、新期待、高潮情绪落差、题材匹配的驱动方式和主线/支线错峰推进都要可见。']
      : [
          '下一章必须补剧情动力：先立清目标和阻碍，再写主角行动、代价/反馈和新的章末期待，并让主线和支线错开节奏推进。',
          '按题材修驱动方式：番茄爽文/打脸文每章给一个外部结果（赢、升级、对手栽）；情感驱动保留人物心结；混合模式主线事件推进，每 3-5 章插情感停顿。',
          '高潮必须有蓄能、假胜、崩解、交叉死磕和悬置收尾，避免顺滑解决后直接结束。',
        ],
  }
}

export function storyPowerContractForSync(contextPackage: any, chapter: any = {}) {
  return buildStoryPowerContract({}, contextWithChapterRawPreDraftForSync(contextPackage, chapter))
}

export function buildStoryPowerSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyPowerContractForSync(contextPackage, chapter)
  const checks = [
    normalizeStoryPowerCheck('story_power_dimensions', '故事五维', contract.story_power_dimensions || contract.storyPowerDimensions, chapterText),
    normalizeStoryPowerCheck('chapter_power_loop', '本章故事力循环', contract.chapter_power_loop || contract.chapterPowerLoop, chapterText),
    normalizeStoryPowerCheck('action_rules', '有动作才是故事', contract.action_rules || contract.actionRules, chapterText),
    normalizeStoryPowerCheck('beginning_end_rules', '有始有终', contract.beginning_end_rules || contract.beginningEndRules, chapterText),
    normalizeStoryPowerCheck('causal_feedback_rules', '因果反馈', contract.causal_feedback_rules || contract.causalFeedbackRules, chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyPowerPriority(missed)
  return {
    report_id: `story-power-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 story_power_contract，建议补充故事五维、可见行动、有始有终和因果反馈。'
      : status === 'ok'
        ? '正文已基本兑现故事五维、行动改变局势、有始有终和因果反馈。'
        : `正文有 ${missedCount} 项故事力缺口，${priorityRepair || '优先补可见行动和因果反馈'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持故事力：故事五维、行动改变局势、章首到章末状态变化和因果反馈都要可见。']
      : [
          '下一章必须补故事力：先补目标和阻碍，再写角色主动行动，让行动带来代价、信息、关系、规则或敌方反制反馈。',
          '开场压力必须在章末转成状态变化、下一步选择或新期待；不要用解释、旁观或内心独白替代行动。',
        ],
  }
}

export function sceneDriveExpectation(contextPackage: any, chapter: any = {}) {
  const sceneCards = storyDriveSceneCards(contextPackage, chapter)
  const card = sceneCards.find((item: any) => compactText(
    item?.goal
    || item?.purpose
    || item?.conflict
    || item?.turning_point
    || item?.turningPoint
    || item?.reader_payoff
    || item?.readerPayoff,
    80,
  )) || {}
  return [
    card?.goal || card?.purpose,
    card?.conflict,
    card?.turning_point || card?.turningPoint || card?.turn || card?.reversal,
    card?.reader_payoff || card?.readerPayoff,
  ].filter(Boolean).join('；')
}

export function storyDriveSceneCards(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(syncContextPackage?.scene_cards || syncContextPackage?.sceneCards),
    ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ...asArray(brief.scene_cards || brief.sceneCards),
  ]
}

export function buildStoryDriveSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  const sceneCards = storyDriveSceneCards(syncContextPackage, chapter)
  const dimensions = [
    normalizeStoryDriveDimension(
      'chapter_goal',
      '本章目标',
      firstCompactText(
        target.chapter_goal,
        target.chapterGoal,
        target.goal,
        target.objective,
        brief.chapter_goal,
        brief.chapterGoal,
        brief.chapter_objective,
        brief.chapterObjective,
        firstSceneCardText(sceneCards, ['goal', 'purpose', 'reader_payoff', 'payoff']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'obstacle',
      '明确阻碍',
      firstCompactText(
        target.core_conflict,
        target.coreConflict,
        target.conflict,
        brief.core_conflict,
        brief.coreConflict,
        brief.conflict,
        firstSceneCardText(sceneCards, ['conflict', 'obstacle', 'pressure']),
      ),
      chapterText,
      40,
    ),
    normalizeStoryDriveDimension(
      'protagonist_choice',
      '主角选择',
      firstCompactText(
        target.protagonist_choice,
        target.protagonistChoice,
        target.active_choice,
        target.activeChoice,
        target.main_character_choice,
        target.mainCharacterChoice,
        brief.protagonist_choice,
        brief.protagonistChoice,
        firstSceneCardText(sceneCards, ['protagonist_choice', 'protagonistChoice', 'active_choice', 'activeChoice', 'turning_point', 'turningPoint', 'turn', 'reversal']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'choice_cost',
      '选择代价',
      firstCompactText(
        target.choice_cost,
        target.choiceCost,
        target.cost,
        target.consequence,
        target.stakes,
        brief.choice_cost,
        brief.choiceCost,
        brief.cost,
        firstSceneCardText(sceneCards, ['choice_cost', 'cost', 'consequence', 'stakes', 'risk']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'state_change',
      '状态变化',
      firstCompactText(
        target.state_change,
        target.stateChange,
        target.exit_state,
        target.exitState,
        target.chapter_state_change,
        target.chapterStateChange,
        brief.state_change,
        brief.stateChange,
        firstSceneCardText(sceneCards, ['exit_state', 'exitState', 'state_change', 'stateChange', 'result', 'scene_result', 'sceneResult']),
      ),
      chapterText,
      42,
    ),
    normalizeStoryDriveDimension(
      'causal_next_step',
      '下一步因果',
      firstCompactText(
        target.causal_next_step,
        target.causalNextStep,
        target.next_step,
        target.nextStep,
        target.ending_hook,
        target.endingHook,
        brief.causal_next_step,
        brief.causalNextStep,
        brief.ending_hook,
        brief.endingHook,
        firstSceneCardText(sceneCards, ['causal_next_step', 'causalNextStep', 'next_step', 'nextStep', 'ending_hook', 'endingHook', 'exit_hook', 'exitHook']),
      ),
      chapterText,
      42,
    ),
  ].filter(Boolean)

  const delivered = dimensions.filter((item: any) => item.delivered)
  const missed = dimensions.filter((item: any) => !item.delivered)
  const score = Math.max(0, Math.min(100, Math.round(
    dimensions.length ? dimensions.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / dimensions.length : 82,
  )))
  const status = missed.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyDrivePriority(missed)

  return {
    report_id: `story-drive-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: dimensions.length === 0 ? '故事力未配置' : status === 'ok' ? '故事力 OK' : `故事力缺口 ${missed.length}`,
    summary: dimensions.length === 0
      ? '本章没有明确的故事驱动力任务书，建议补充主角选择、阻碍、代价和状态变化。'
      : status === 'ok'
        ? '本章目标、阻碍、主角选择、选择代价、状态变化和下一步因果已形成可追踪行动链。'
        : `本章有 ${missed.length} 项故事驱动力缺口，${priorityRepair || '优先补主角主动选择和代价反馈'}。`,
    missed_count: missed.length,
    priority_repair: priorityRepair,
    dimensions,
    planned: dimensions,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持本章主角主动选择、外部阻碍、选择代价、状态变化和下一步因果的连续执行。']
      : [
          '下一次修订必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果。',
          '不能只用旁白解释剧情推进；缺口必须写成现场行动、对话交锋、代价反馈或状态变化。',
          '如果本章原本只是过场，至少让主角做一个不可逆的小选择，并让下一章承接其后果。',
        ],
  }
}

export function storyLoopContractFromContext(contextPackage: any = {}, chapter: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
  }
  return target.story_loop_contract
    || target.storyLoopContract
    || brief.story_loop_contract
    || brief.storyLoopContract
    || contextPackage?.story_loop_contract
    || contextPackage?.storyLoopContract
    || {}
}

export function buildStoryLoopSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const contract = storyLoopContractFromContext(contextPackage, chapter)
  const beats = [
    normalizeStoryLoopBeat('setup', '铺垫入局', firstCompactText(contract.setup, contract.opening_setup, contract.openingSetup), chapterText, 36),
    normalizeStoryLoopBeat('escalation', '升级阻碍', firstCompactText(contract.escalation, contract.obstacle_escalation, contract.obstacleEscalation), chapterText, 36),
    normalizeStoryLoopBeat('payoff', '兑现反馈', firstCompactText(contract.payoff, contract.feedback, contract.result), chapterText, 36),
    normalizeStoryLoopBeat('carry_over', '承接期待', firstCompactText(contract.carry_over, contract.carryOver, contract.next_expectation, contract.nextExpectation), chapterText, 36),
    normalizeStoryLoopMapTransitionCheck(contract.map_transition_rules || contract.mapTransitionRules, chapterText),
    normalizeStoryLoopNestedLoopCheck(contract.nested_loop_rules || contract.nestedLoopRules, chapterText),
  ].filter(Boolean)
  const delivered = beats.filter((item: any) => item.delivered)
  const missed = beats.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    beats.length ? beats.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / beats.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = storyLoopPriority(missed)

  return {
    report_id: `story-loop-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: beats.length === 0 ? '故事循环未配置' : status === 'ok' ? '故事循环 OK' : `故事循环缺口 ${missedCount}`,
    summary: beats.length === 0
      ? '本章没有配置 story_loop_contract，建议补充 setup、escalation、payoff 和 carry_over。'
      : status === 'ok'
        ? '本章已形成 setup -> escalation -> payoff -> carry_over 的故事循环闭环。'
        : `正文有 ${missedCount} 项故事循环缺口，${priorityRepair || '优先补兑现反馈和承接期待'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: beats,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持 setup -> escalation -> payoff -> carry_over：每章既完成本章反馈，也把下一章期待接上。']
      : [
          '下一次修订必须补足 setup -> escalation -> payoff -> carry_over，把铺垫、阻碍升级、兑现反馈和承接期待写成正文可见事件。',
          '不能只用“事情进入下一阶段”或旁白总结替代承接；章尾必须留下由本章反馈触发的新目标、新风险、新线索或新期待。',
          missed.some((item: any) => item.key === 'map_transition_rules')
            ? '补换地图承接：旧地图核心冲突先阶段性解决，再用过渡人物/旧关系/贯穿主线带出新地图五件套；必须先让人际关系动了 -> 主角再动，前5章建立代入感和期待感，避免旧线全抛和新设定一次性倒出。'
            : '',
          missed.some((item: any) => item.key === 'nested_loop_rules')
            ? '补故事循环嵌套：小循环 -> 中循环 -> 大循环必须同时可见，小循环中必须铺垫大循环的期待，并把同一核心卖点换不同角度/不同矛盾推进。'
            : '',
        ],
  }
}

