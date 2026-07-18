import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

import {
  OH_STORY_OPENING_REQUIRED_BEATS,
  OH_STORY_OPENING_FOUNDATION_POINTS,
  OH_STORY_OPENING_FIVE_ESSENTIALS_RULES,
  OH_STORY_OPENING_FORBIDDEN,
  OH_STORY_OPENING_INFORMATION_PRIORITY,
  OH_STORY_OPENING_QUALITY_CHECKS,
} from './plot-opening-prose-contracts-plot'


function openingExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.opening_contract
    || contextPackage?.chapter_target?.openingContract
    || contextPackage?.opening_contract
    || contextPackage?.openingContract
    || contextPackage?.pre_draft_brief?.opening_contract
    || contextPackage?.preDraftBrief?.openingContract
    || contextPackage?.writing_bible?.opening_strategy_contract
    || contextPackage?.writing_bible?.openingStrategyContract
}

function inferOpeningStrategy(text: string) {
  if (/危机|倒计时|系统|裁员|压迫|生死|报名|任务|被迫/.test(text)) return '危机开局'
  if (/悬疑|怪谈|谜|缺页|身份|谁才|真相|血缘/.test(text)) return '悬疑开局'
  if (/重生|穿越|反转|回归|认知|颠覆/.test(text)) return '反转开局'
  return '危机开局'
}

function buildOpeningPlan(sceneCards: any[], target: any) {
  const firstScene = sceneCards[0] || {}
  const secondScene = sceneCards[1] || {}
  const thirdScene = sceneCards[2] || {}
  return uniqueBriefStrings([
    firstScene.opening_hook ? `300字内主角登场：${compactBriefText(firstScene.opening_hook)}` : '',
    firstScene.conflict ? `人设/处境压力：${compactBriefText(firstScene.conflict)}` : '',
    secondScene.reader_payoff || secondScene.purpose ? `1000字内爽点/期待点：${compactBriefText(secondScene.reader_payoff || secondScene.purpose)}` : '',
    target.conflict ? `切入点基点：${compactBriefText(target.conflict)}` : '',
    thirdScene.reader_payoff || thirdScene.ending_hook_seed ? `金手指/独特优势基点：${compactBriefText(thirdScene.reader_payoff || thirdScene.ending_hook_seed)}` : '',
    target.ending_hook ? `第一章翻页钩子：${compactBriefText(target.ending_hook)}` : '',
  ], 8)
}

export function buildOpeningContract(project: any = {}, contextPackage: any = {}) {
  const explicit = openingExplicitContract(contextPackage)
    || (!contextPackage?.__ignoreProjectOpeningStrategy
      ? (
          project?.reference_config?.writing_bible?.opening_strategy_contract
          || project?.reference_config?.writing_bible?.openingStrategyContract
        )
      : null)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildOpeningContract(project, {
      ...(contextPackage || {}),
      __ignoreProjectOpeningStrategy: true,
      opening_contract: null,
      openingContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.chapter_target,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            opening_strategy_contract: null,
            openingStrategyContract: null,
          }
        : contextPackage?.writing_bible,
    }) || {}
    const explicitRequiredBeats = asArray(explicit.required_beats || explicit.requiredBeats).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFoundationPoints = asArray(explicit.foundation_points || explicit.foundationPoints).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitOpeningPlan = asArray(explicit.opening_plan || explicit.openingPlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFiveEssentialsRules = asArray(explicit.five_essentials_rules || explicit.fiveEssentialsRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationPriority = asArray(explicit.information_priority || explicit.informationPriority).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenMixing = asArray(explicit.forbidden_mixing || explicit.forbiddenMixing).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFirst5Promise = asArray(explicit.first_5_chapter_promise || explicit.first5ChapterPromise || explicit.first_five_chapter_promise || explicit.firstFiveChapterPromise).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThresholdLadder = asArray(explicit.threshold_ladder || explicit.thresholdLadder).map((item: any) => compactBriefText(item)).filter(Boolean)
    const hookType = compactBriefText(explicit.hook_type || explicit.hookType)
    const openingFlow = compactBriefText(explicit.opening_flow || explicit.openingFlow)
    return {
      version: explicit.version || 'oh_story_opening_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      activation_scope: compactBriefText(explicit.activation_scope || explicit.activationScope, derived.activation_scope || '前3章强制执行；第4章后仅作为新书承诺记忆。'),
      hook_type: hookType,
      opening_flow: openingFlow,
      mainline_graft: compactBriefText(explicit.mainline_graft || explicit.mainlineGraft),
      first_5_chapter_promise: explicitFirst5Promise,
      threshold_ladder: explicitThresholdLadder,
      opening_strategy: compactBriefText(explicit.opening_strategy || explicit.openingStrategy || openingFlow || hookType, derived.opening_strategy || '危机开局'),
      required_beats: explicitRequiredBeats.length ? explicitRequiredBeats : (asArray(derived.required_beats).length ? asArray(derived.required_beats) : OH_STORY_OPENING_REQUIRED_BEATS),
      foundation_points: explicitFoundationPoints.length ? explicitFoundationPoints : (asArray(derived.foundation_points).length ? asArray(derived.foundation_points) : OH_STORY_OPENING_FOUNDATION_POINTS),
      opening_plan: explicitOpeningPlan.length ? explicitOpeningPlan : uniqueBriefStrings([
        ...explicitFirst5Promise,
        openingFlow,
        explicit.mainline_graft || explicit.mainlineGraft,
      ], 8).length ? uniqueBriefStrings([
          ...explicitFirst5Promise,
          openingFlow,
          explicit.mainline_graft || explicit.mainlineGraft,
        ], 8) : asArray(derived.opening_plan),
      five_essentials_rules: explicitFiveEssentialsRules.length ? explicitFiveEssentialsRules : (asArray(derived.five_essentials_rules).length ? asArray(derived.five_essentials_rules) : OH_STORY_OPENING_FIVE_ESSENTIALS_RULES),
      information_priority: explicitInformationPriority.length ? explicitInformationPriority : (asArray(derived.information_priority).length ? asArray(derived.information_priority) : OH_STORY_OPENING_INFORMATION_PRIORITY),
      forbidden_patterns: uniqueBriefStrings([
        ...(explicitForbiddenPatterns.length ? explicitForbiddenPatterns : (asArray(derived.forbidden_patterns).length ? asArray(derived.forbidden_patterns) : OH_STORY_OPENING_FORBIDDEN)),
        ...explicitForbiddenMixing,
      ], 12),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_OPENING_QUALITY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['重做前300字主角登场', '补1000字内爽点/期待点', '补三大基点', '删背景和世界观水文', '明确主角目标和本文卖点']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const chapterNo = Number(target.chapter_no || target.chapterNo || 0)
  if (chapterNo > 3) return null
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.title,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.opening_hook,
      scene.reader_payoff,
      scene.information_gap,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  return {
    version: 'oh_story_opening_v1',
    source: 'oh_story_embedded_fallback',
    activation_scope: '前3章强制执行；第4章后仅作为新书承诺记忆。',
    opening_strategy: inferOpeningStrategy(text),
    required_beats: OH_STORY_OPENING_REQUIRED_BEATS,
    foundation_points: OH_STORY_OPENING_FOUNDATION_POINTS,
    opening_plan: buildOpeningPlan(sceneCards, target),
    five_essentials_rules: OH_STORY_OPENING_FIVE_ESSENTIALS_RULES,
    information_priority: OH_STORY_OPENING_INFORMATION_PRIORITY,
    forbidden_patterns: OH_STORY_OPENING_FORBIDDEN,
    quality_checks: OH_STORY_OPENING_QUALITY_CHECKS,
    revision_priorities: ['重做前300字主角登场', '补1000字内爽点/期待点', '补三大基点', '删背景和世界观水文', '明确主角目标和本文卖点'],
  }
}

