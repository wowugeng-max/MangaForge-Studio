/** Continuity heat, plot dynamics, story power, and mainline definition contracts. */
import { asArray } from '../../routes/novel-route-utils'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { buildOhStoryMainlineDefinitionContract } from '../../routes/novel-mainline-definition-contract'
import { buildOhStoryStoryPowerContract } from '../../routes/novel-story-power-contract'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { continuityHeatExplicitContract } from './intent-benchmark-contracts'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
const OH_STORY_PLOT_DYNAMICS_CHECKS = [
  '最小剧情循环必须完整：目标→阻碍→行动→代价/反馈→新期待。',
  '高潮构建要有层次：蓄能→假胜→崩解→交叉死磕→悬置收尾。',
  '必须设计假胜：先让读者觉得稳赢，再用新阻碍击碎希望。',
  '每个场景要有目的和效果，详写卖点/回报点，略写过场。',
  '驱动方式必须匹配题材：番茄爽文/打脸文每章给一个外部结果，追妻/虐心/世情保持人物心结，混合模式主线事件推进并每 3-5 章插情感停顿。',
  'A/B节奏要交替：A负责压情绪/铺垫/伏笔，B负责抬情绪/小反转/小收获。',
  '主线和支线错开节奏推进，不能同时爆完，也不能同时空转。',
  '章末必须悬置收尾，留下下一章要继续看的问题、危险、反转或未完成收益。',
]

const OH_STORY_DRIVE_MODE_RULES = [
  '番茄爽文/打脸文使用事件驱动：每章给一个外部结果，至少赢了、升级了、对手栽了之一可见。',
  '追妻/虐心/世情使用情感驱动：事件可以少，但人物心结必须一直悬着，例如他后悔了没、她原谅了没。',
  '混合模式主线用事件往前推，每 3-5 章插一段情感停顿（独处、回忆、试探），让人物心结透口气。',
]

const OH_STORY_LINE_STAGGER_RULES = [
  '主线和支线错开节奏推进，没有同时爆，也没有同时空转。',
  '战力提升线、装备收获线、情感线、声望线不同步推进，避免同质化。',
  '每段至少让一条线推进，同时保留另一条线作为下一段燃料。',
]

const OH_STORY_CONTINUITY_HEAT_STATES = [
  'hot: 当前直接驱动冲突、选择、危险或章末钩子的元素，必须在正文中推进。',
  'warm: 最近活跃且需要保温的角色、线索、关系或伏笔，不能只点名。',
  'cold: 已超过安全间隔的开放问题、伏笔、关系或剧情线，突然回收前必须先升温。',
  'archived: 已完成或明确关闭的线，除非重新激活，否则不要抢占篇幅。',
]

const OH_STORY_CONTINUITY_HEAT_CHECKS = [
  '当前 hot 元素必须推动冲突、施压、改变关系、产生真实后果或解释合理休眠。',
  '核心人物 3-5 章内需要有效触达，重要支线 4-6 章内需要有效推进或交代休眠。',
  '活跃伏笔不能连续错过 2 次可回收机会，冷伏笔不能突然变成破局答案。',
  '不稳定关系每 2 次出场至少有一次关系变化、试探、冲突升级或信任成本。',
  '有效触达不能只是提名字、空回忆或随口 callback，必须带来推进、压力、关系变化或后果。',
  '本章要说明哪些元素继续 dormant，以及为什么暂时不推进。',
]


export function storylineUsageByAnyType(storylineContext: any, types: string[]) {
  return asArray(storylineContext?.chapter_usage)
    .filter((item: any) => types.includes(String(item?.usage_type || item?.usageType || item?.type || '').toLowerCase()))
    .map((item: any) => continuityHeatItemText(item))
    .filter(Boolean)
}

export function buildContinuityHeatContract(contextPackage: any = {}) {
  const explicit = continuityHeatExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildContinuityHeatContract({
      ...(contextPackage || {}),
      continuity_heat_contract: null,
      continuityHeatContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            continuity_heat_contract: null,
            continuityHeatContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            continuity_heat_contract: null,
            continuityHeatContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            continuity_heat_contract: null,
            continuityHeatContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitHeatStates = asArray(explicit.heat_states || explicit.heatStates).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitActiveExpectations = asArray(explicit.active_expectations || explicit.activeExpectations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitWatchItems = asArray(explicit.watch_items || explicit.watchItems).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDormantAllowed = asArray(explicit.dormant_allowed || explicit.dormantAllowed).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_continuity_heat_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      heat_states: explicitHeatStates.length
        ? explicitHeatStates
        : (asArray(derived.heat_states).length ? asArray(derived.heat_states) : OH_STORY_CONTINUITY_HEAT_STATES),
      active_expectations: explicitActiveExpectations.length ? explicitActiveExpectations : asArray(derived.active_expectations),
      watch_items: explicitWatchItems.length ? explicitWatchItems : asArray(derived.watch_items),
      dormant_allowed: explicitDormantAllowed.length ? explicitDormantAllowed : asArray(derived.dormant_allowed),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_CONTINUITY_HEAT_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['升温冷伏笔', '接住 hot 元素', '补角色/关系触达', '解释合理休眠', '避免空 callback']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const memoryCapsule = normalizeLongformMemoryCapsule(
    target.longform_memory_capsule
    || target.longformMemoryCapsule
    || contextPackage?.longform_memory_capsule
    || contextPackage?.longformMemoryCapsule,
  )
  const expectationDebt = normalizeReaderExpectationDebtContext(
    target.reader_expectation_debt_context
    || contextPackage?.reader_expectation_debt_context,
  )
  const storylineContext = contextPackage?.storyline_context || {}
  const characterArc = target.character_arc_brief || contextPackage?.character_arc_context || {}
  const activeExpectations = uniqueBriefStrings([
    ...asArray(expectationDebt.must_carry).map(continuityHeatItemText),
    ...asArray(expectationDebt.keep_alive).map(continuityHeatItemText),
    ...asArray(storylineContext.required).map(continuityHeatItemText),
    compactBriefText(target.ending_hook || target.endingHook),
  ], 12)
  const watchItems = uniqueBriefStrings([
    ...asArray(memoryCapsule?.open_questions).map(continuityHeatItemText),
    ...asArray(memoryCapsule?.payoff_debts).map(continuityHeatItemText),
    ...asArray(memoryCapsule?.character_states).map(continuityHeatItemText),
    ...asArray(storylineContext.required).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['plant', 'payoff', 'advance']),
    ...asArray(expectationDebt.must_carry).map(continuityHeatItemText),
    ...asArray(expectationDebt.keep_alive).map(continuityHeatItemText),
    compactBriefText(characterArc.relationship_shift || characterArc.relationshipShift || characterArc.relationship_change || characterArc.relationshipChange),
    compactBriefText(target.conflict),
  ], 18)
  const dormantAllowed = uniqueBriefStrings([
    ...asArray(storylineContext.forbidden).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['forbidden', 'dormant', 'archive', 'archived']),
    ...asArray(target.forbidden_repeats).map(continuityHeatItemText),
  ], 8)
  return {
    version: 'oh_story_continuity_heat_v1',
    source: 'oh_story_embedded_fallback',
    heat_states: OH_STORY_CONTINUITY_HEAT_STATES,
    active_expectations: activeExpectations,
    watch_items: watchItems.length ? watchItems : uniqueBriefStrings([
      target.summary,
      target.conflict,
      target.ending_hook,
    ], 8),
    dormant_allowed: dormantAllowed,
    quality_checks: OH_STORY_CONTINUITY_HEAT_CHECKS,
    revision_priorities: ['升温冷伏笔', '接住 hot 元素', '补角色/关系触达', '解释合理休眠', '避免空 callback'],
  }
}

export function buildPlotDynamicsContract(contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.plot_dynamics_contract
    || contextPackage?.chapter_target?.plotDynamicsContract
    || contextPackage?.plot_dynamics_contract
    || contextPackage?.plotDynamicsContract
    || contextPackage?.pre_draft_brief?.plot_dynamics_contract
    || contextPackage?.preDraftBrief?.plotDynamicsContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildPlotDynamicsContract({
      ...(contextPackage || {}),
      plot_dynamics_contract: null,
      plotDynamicsContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            plot_dynamics_contract: null,
            plotDynamicsContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            plot_dynamics_contract: null,
            plotDynamicsContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            plot_dynamics_contract: null,
            plotDynamicsContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitPlotLoop = asArray(explicit.plot_loop || explicit.plotLoop).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitClimaxFormula = asArray(explicit.climax_formula || explicit.climaxFormula).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAbOutline = asArray(explicit.ab_outline || explicit.abOutline).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitScenePurposeMap = asArray(explicit.scene_purpose_map || explicit.scenePurposeMap).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDriveModeRules = asArray(explicit.drive_mode_rules || explicit.driveModeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLineStaggerRules = asArray(explicit.line_stagger_rules || explicit.lineStaggerRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_plot_dynamics_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      plot_loop: explicitPlotLoop.length ? explicitPlotLoop : asArray(derived.plot_loop),
      climax_formula: explicitClimaxFormula.length ? explicitClimaxFormula : asArray(derived.climax_formula),
      ab_outline: explicitAbOutline.length ? explicitAbOutline : asArray(derived.ab_outline),
      scene_purpose_map: explicitScenePurposeMap.length ? explicitScenePurposeMap : asArray(derived.scene_purpose_map),
      drive_mode_rules: explicitDriveModeRules.length
        ? explicitDriveModeRules
        : (asArray(derived.drive_mode_rules || derived.driveModeRules).length ? asArray(derived.drive_mode_rules || derived.driveModeRules) : OH_STORY_DRIVE_MODE_RULES),
      line_stagger_rules: explicitLineStaggerRules.length
        ? explicitLineStaggerRules
        : (asArray(derived.line_stagger_rules).length ? asArray(derived.line_stagger_rules) : OH_STORY_LINE_STAGGER_RULES),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_PLOT_DYNAMICS_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['补目标阻碍行动反馈闭环', '补假胜与崩解', '强化代价/反馈', '补A/B情绪交替', '强化悬置收尾']),
    }
  }
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const firstScene = sceneCards[0] || {}
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const plotLoop = [
    `目标：${compactBriefText(target.summary || target.goal || firstScene.purpose, '完成本章目标')}`,
    `阻碍：${compactBriefText(target.conflict || firstScene.conflict, '本章必须有明确阻碍')}`,
    `行动：${compactBriefText(firstScene.action || firstScene.purpose || firstScene.beat, '主角必须采取可见行动')}`,
    `代价/反馈：${compactBriefText(lastScene.reader_payoff || lastScene.reversal || target.conflict, '行动必须产生代价、信息反馈或关系变化')}`,
    `新期待：${compactBriefText(target.ending_hook || lastScene.ending_hook_seed, '章末留下新期待')}`,
  ]
  const scenePurposeMap = sceneCards.map((scene: any, index: number) => {
    const label = index % 2 === 0 ? 'A 蓄压' : 'B 抬情绪'
    return compactBriefText(`${label}｜场景${scene.scene_no || index + 1}：${scene.purpose || scene.title || '推进剧情'} -> ${scene.reader_payoff || scene.reversal || scene.ending_hook_seed || scene.conflict || '交付可见变化'}`)
  }).filter(Boolean)
  return {
    version: 'oh_story_plot_dynamics_v1',
    source: 'oh_story_embedded_fallback',
    plot_loop: plotLoop,
    climax_formula: ['蓄能', '假胜', '崩解', '交叉死磕', '悬置收尾'],
    ab_outline: scenePurposeMap.length ? scenePurposeMap : ['A 蓄压：铺设困难、对手强势或悬念埋线', 'B 抬情绪：给小反转、小进步或阶段回报'],
    scene_purpose_map: scenePurposeMap,
    drive_mode_rules: OH_STORY_DRIVE_MODE_RULES,
    line_stagger_rules: OH_STORY_LINE_STAGGER_RULES,
    quality_checks: OH_STORY_PLOT_DYNAMICS_CHECKS,
    revision_priorities: ['补目标阻碍行动反馈闭环', '补假胜与崩解', '强化代价/反馈', '补A/B情绪交替', '强化悬置收尾'],
  }
}

export function buildStoryPowerContract(project: any = {}, contextPackage: any = {}) {
  return buildOhStoryStoryPowerContract(
    project,
    contextPackage?.writing_bible,
    contextPackage?.pre_draft_brief,
    contextPackage?.preDraftBrief,
    contextPackage?.chapter_target,
    contextPackage?.chapterTarget,
    contextPackage,
  )
}

export function buildMainlineDefinitionContract(project: any = {}, contextPackage: any = {}, explicitValue: any = null) {
  return buildOhStoryMainlineDefinitionContract(
    project,
    contextPackage?.writing_bible,
    contextPackage?.pre_draft_brief,
    contextPackage?.preDraftBrief,
    contextPackage?.chapter_target,
    contextPackage?.chapterTarget,
    contextPackage?.chapter_target?.chapter_blueprint,
    contextPackage?.chapterTarget?.chapterBlueprint,
    contextPackage?.chapter_blueprint,
    contextPackage?.chapterBlueprint,
    contextPackage,
    explicitValue ? { mainline_definition_contract: explicitValue } : {},
  )
}

