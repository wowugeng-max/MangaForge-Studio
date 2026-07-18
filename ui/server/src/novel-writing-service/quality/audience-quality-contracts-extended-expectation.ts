import { asArray } from '../../routes/novel-route-utils'
import {
  normalizeConflictNetworkLayersContract,
  normalizeConflictWebContract,
} from '../../novel-writing/conflict-structure-basics'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { storylineUsageByAnyType } from './continuity-dialogue-contracts'

import {
  OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
  OH_STORY_EXPECTATION_RELAY_RULES,
  OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES,
  OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES,
  OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES,
  OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES,
  OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES,
  OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES,
  OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES,
  OH_STORY_INFORMATION_FLOW_CHECKS,
  OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
  OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
  OH_STORY_INFORMATION_TRANSITION_RULES,
  detectFemaleAudienceContext,
  femaleAudienceExplicitContract,
  normalizeFemaleAudienceActivationMode,
  resolveFemaleAudienceActivation
} from './audience-quality-contracts'

function expectationThresholdExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.expectation_threshold_contract
    || contextPackage?.chapter_target?.expectationThresholdContract
    || contextPackage?.expectation_threshold_contract
    || contextPackage?.expectationThresholdContract
    || contextPackage?.pre_draft_brief?.expectation_threshold_contract
    || contextPackage?.preDraftBrief?.expectationThresholdContract
}

function sceneThresholds(scene: any) {
  return [
    ...asArray(scene?.required_thresholds || scene?.requiredThresholds),
    scene?.threshold,
    scene?.threshold_gate,
    scene?.thresholdGate,
    scene?.condition,
    scene?.condition_gate,
    scene?.conditionGate,
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function buildExpectationThresholdContract(contextPackage: any = {}) {
  const explicit = expectationThresholdExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildExpectationThresholdContract({
      ...(contextPackage || {}),
      expectation_threshold_contract: null,
      expectationThresholdContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitShortExpectation = compactBriefText(explicit.short_expectation || explicit.shortExpectation)
    const explicitMediumExpectations = asArray(explicit.medium_expectations || explicit.mediumExpectations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongExpectations = asArray(explicit.long_expectations || explicit.longExpectations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThresholds = asArray(explicit.thresholds || explicit.gates || explicit.conditions).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDynamicThresholds = asArray(explicit.dynamic_thresholds || explicit.dynamicThresholds).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNestedUnits = asArray(explicit.nested_units || explicit.nestedUnits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationBeforePayoffRules = asArray(explicit.expectation_before_payoff_rules || explicit.expectationBeforePayoffRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationRelayRules = asArray(explicit.expectation_relay_rules || explicit.expectationRelayRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThreeLines = explicit.three_expectation_lines || explicit.threeExpectationLines || {}
    return {
      version: explicit.version || 'oh_story_expectation_threshold_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      short_expectation: explicitShortExpectation || derived.short_expectation,
      medium_expectations: explicitMediumExpectations.length ? explicitMediumExpectations : asArray(derived.medium_expectations),
      long_expectations: explicitLongExpectations.length ? explicitLongExpectations : asArray(derived.long_expectations),
      thresholds: explicitThresholds.length ? explicitThresholds : asArray(derived.thresholds),
      dynamic_thresholds: explicitDynamicThresholds.length ? explicitDynamicThresholds : asArray(derived.dynamic_thresholds),
      nested_units: explicitNestedUnits.length ? explicitNestedUnits : asArray(derived.nested_units),
      expectation_before_payoff_rules: explicitExpectationBeforePayoffRules.length
        ? explicitExpectationBeforePayoffRules
        : asArray(derived.expectation_before_payoff_rules).length
          ? asArray(derived.expectation_before_payoff_rules)
          : OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
      expectation_relay_rules: explicitExpectationRelayRules.length
        ? explicitExpectationRelayRules
        : asArray(derived.expectation_relay_rules).length
          ? asArray(derived.expectation_relay_rules)
          : OH_STORY_EXPECTATION_RELAY_RULES,
      three_expectation_lines: {
        plot_expectation: compactBriefText(explicitThreeLines.plot_expectation || explicitThreeLines.plotExpectation || explicitThreeLines.story_expectation || explicitThreeLines.storyExpectation)
          || derived.three_expectation_lines?.plot_expectation
          || '',
        theme_payoff: compactBriefText(explicitThreeLines.theme_payoff || explicitThreeLines.themePayoff || explicitThreeLines.theme_sweetener || explicitThreeLines.themeSweetener)
          || derived.three_expectation_lines?.theme_payoff
          || '',
        freshness_hook: compactBriefText(explicitThreeLines.freshness_hook || explicitThreeLines.freshnessHook || explicitThreeLines.novelty_hook || explicitThreeLines.noveltyHook)
          || derived.three_expectation_lines?.freshness_hook
          || '',
      },
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补两长一短期待', '拆分系统性门槛', '补动态加码', '补跨单元期待线', '避免一步解决'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const expectationDebt = normalizeReaderExpectationDebtContext(
    target.reader_expectation_debt_context
    || contextPackage?.reader_expectation_debt_context,
  )
  const storylineContext = contextPackage?.storyline_context || {}
  const shortExpectation = compactBriefText(
    sceneCards.map((scene: any) => scene.reader_payoff || scene.readerPayoff).filter(Boolean)[0]
    || target.short_expectation
    || target.shortExpectation
    || target.summary
    || target.goal,
  )
  const mediumExpectations = uniqueBriefStrings([
    ...asArray(storylineContext.required).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['advance']),
    target.conflict,
  ], 10)
  const longExpectations = uniqueBriefStrings([
    ...asArray(expectationDebt.keep_alive).map(continuityHeatItemText),
    ...asArray(expectationDebt.must_carry).map(continuityHeatItemText),
    ...asArray(expectationDebt.overdue).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['plant']),
    target.ending_hook,
  ], 10)
  const thresholds = uniqueBriefStrings([
    ...sceneCards.flatMap(sceneThresholds),
    ...asArray(target.thresholds || target.gates || target.conditions),
    target.conflict && /条件|资格|门槛|达标|收集|取回|证明|验明|比赛|前五|资源|灵石|气血/.test(String(target.conflict)) ? target.conflict : '',
  ], 16)
  const dynamicThresholds = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => [
      scene.dynamic_threshold,
      scene.dynamicThreshold,
      scene.escalation_gate,
      scene.escalationGate,
      scene.reversal,
    ]),
    ...asArray(target.dynamic_thresholds || target.dynamicThresholds),
  ], 10)
  const nestedUnits = uniqueBriefStrings([
    target.summary,
    ...sceneCards.map((scene: any) => scene.title || scene.purpose),
    target.ending_hook ? `完成当前目标前提前露出下一步：${target.ending_hook}` : '',
  ], 12)
  const threeExpectationLines = {
    plot_expectation: compactBriefText(firstDefined(
      longExpectations.find((item: string) => /谁|为何|为什么|真相|幕后|来源|背后|第三|源头|答案/.test(item)),
      longExpectations[0],
      target.ending_hook,
      target.summary,
    )),
    theme_payoff: compactBriefText(firstDefined(
      shortExpectation,
      sceneCards.map((scene: any) => scene.reader_payoff || scene.readerPayoff).filter(Boolean)[0],
      target.reader_payoff,
      target.payoff,
    )),
    freshness_hook: compactBriefText(firstDefined(
      dynamicThresholds[0],
      thresholds.find((item: string) => /暴露|新|反转|异常|第一次|未知|旧案|血缘|规则|源头/.test(item)),
      target.innovation_hook,
      target.ending_hook,
    )),
  }
  return {
    version: 'oh_story_expectation_threshold_v1',
    source: 'oh_story_embedded_fallback',
    short_expectation: shortExpectation,
    medium_expectations: mediumExpectations,
    long_expectations: longExpectations,
    thresholds: thresholds.length ? thresholds : uniqueBriefStrings([target.conflict, target.summary], 8),
    dynamic_thresholds: dynamicThresholds,
    nested_units: nestedUnits,
    expectation_before_payoff_rules: OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
    expectation_relay_rules: OH_STORY_EXPECTATION_RELAY_RULES,
    three_expectation_lines: threeExpectationLines,
    quality_checks: OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
    revision_priorities: ['补期待铺垫', '补两长一短期待', '拆分系统性门槛', '补动态加码', '补跨单元期待线', '避免一步解决'],
  }
}

function informationFlowExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.information_flow_contract
    || contextPackage?.chapter_target?.informationFlowContract
    || contextPackage?.information_flow_contract
    || contextPackage?.informationFlowContract
    || contextPackage?.pre_draft_brief?.information_flow_contract
    || contextPackage?.preDraftBrief?.informationFlowContract
}

function sceneInformationUnit(scene: any, index: number) {
  return compactBriefText(
    scene?.information_unit
    || scene?.informationUnit
    || scene?.reader_payoff
    || scene?.readerPayoff
    || scene?.reversal
    || scene?.turning_point
    || scene?.turningPoint
    || asArray(scene?.required_information || scene?.requiredInformation).join('；')
    || scene?.purpose
    || scene?.title
    || `场景${index + 1}信息团`,
  )
}

export function buildInformationFlowContract(contextPackage: any = {}) {
  const explicit = informationFlowExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildInformationFlowContract({
      ...(contextPackage || {}),
      information_flow_contract: null,
      informationFlowContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitInformationUnits = asArray(explicit.information_units || explicit.informationUnits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProgressionChain = asArray(explicit.progression_chain || explicit.progressionChain).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionRules = asArray(explicit.transition_rules || explicit.transitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionCompressionRules = asArray(explicit.transition_compression_rules || explicit.transitionCompressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNextObjectiveRules = asArray(explicit.next_objective_rules || explicit.nextObjectiveRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitWaterRiskGuards = asArray(explicit.water_risk_guards || explicit.waterRiskGuards).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_information_flow_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      information_units: explicitInformationUnits.length ? explicitInformationUnits : asArray(derived.information_units),
      progression_chain: explicitProgressionChain.length ? explicitProgressionChain : asArray(derived.progression_chain),
      transition_rules: explicitTransitionRules.length
        ? explicitTransitionRules
        : asArray(derived.transition_rules).length ? asArray(derived.transition_rules) : OH_STORY_INFORMATION_TRANSITION_RULES,
      transition_compression_rules: explicitTransitionCompressionRules.length
        ? explicitTransitionCompressionRules
        : asArray(derived.transition_compression_rules).length ? asArray(derived.transition_compression_rules) : OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
      next_objective_rules: explicitNextObjectiveRules.length
        ? explicitNextObjectiveRules
        : asArray(derived.next_objective_rules).length ? asArray(derived.next_objective_rules) : OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
      water_risk_guards: explicitWaterRiskGuards.length ? explicitWaterRiskGuards : asArray(derived.water_risk_guards),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_INFORMATION_FLOW_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['压缩无关信息团', '补场景间递进', '回应上一场悬念', '修情绪衔接', '删无信息量过渡'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const informationUnits = uniqueBriefStrings(sceneCards.map(sceneInformationUnit), 16)
  const progressionChain = sceneCards.map((scene: any, index: number) => {
    const unit = sceneInformationUnit(scene, index)
    const nextScene = sceneCards[index + 1]
    const nextUnit = nextScene ? sceneInformationUnit(nextScene, index + 1) : compactBriefText(target.ending_hook || target.endingHook)
    const bridge = compactBriefText(
      scene?.ending_hook_seed
      || scene?.endingHookSeed
      || scene?.information_gap
      || scene?.informationGap
      || scene?.reversal
      || scene?.reader_payoff
      || '',
    )
    return compactBriefText([
      `场景${scene.scene_no || index + 1}`,
      scene?.title,
      unit,
      nextUnit ? `递进到：${nextUnit}` : '',
      bridge ? `衔接点：${bridge}` : '',
    ].filter(Boolean).join('｜'))
  }).filter(Boolean)
  const waterRiskGuards = uniqueBriefStrings([
    target.conflict && /背景|解释|闲聊|环境|寒暄|拖延/.test(String(target.conflict)) ? target.conflict : '',
    ...sceneCards.flatMap((scene: any) => [
      scene.water_risk,
      scene.waterRisk,
      scene.forbidden_filler,
      scene.forbiddenFiller,
      scene.background_dump,
      scene.backgroundDump,
    ]),
    '无关背景必须改成证据、压力、代价或下一步目标。',
    '纯过渡、纯移动、纯寒暄和纯环境描写没有信息量时直接删除或压缩。',
  ], 10)
  return {
    version: 'oh_story_information_flow_v1',
    source: 'oh_story_embedded_fallback',
    information_units: informationUnits.length ? informationUnits : uniqueBriefStrings([target.summary, target.conflict, target.ending_hook], 8),
    progression_chain: progressionChain,
    transition_rules: OH_STORY_INFORMATION_TRANSITION_RULES,
    transition_compression_rules: OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
    next_objective_rules: OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
    water_risk_guards: waterRiskGuards,
    quality_checks: OH_STORY_INFORMATION_FLOW_CHECKS,
    revision_priorities: ['压缩无关信息团', '补场景间递进', '回应上一场悬念', '修情绪衔接', '删无信息量过渡'],
  }
}
