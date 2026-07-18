import { asArray } from '../../routes/novel-route-utils'
import { normalizeChapterBenchmarkSampleBank } from '../post-delivery/asset-banks'
import { mergeSceneCardStringList } from '../post-delivery/scene-card-delivery-risk'
import { assetText } from './character-asset-contracts'
import { uniqueObjectReferences } from './pre-draft-receipt-sections'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

import {
  benchmarkRecallGapsFromContext,
  benchmarkRecallHasGap,
  benchmarkRecallIsNoBenchmark,
  buildBenchmarkRecallBrief,
  styleRecallList,
  styleRecallValueText,
} from './intent-benchmark-recall'
export {
  styleRecallValueText,
  styleRecallList,
  benchmarkRecallGapStrings,
  benchmarkRecallHasGap,
  benchmarkRecallIsNoBenchmark,
  benchmarkRecallGapsFromContext,
  benchmarkRecallExplicitBrief,
  buildBenchmarkRecallBrief,
} from './intent-benchmark-recall'

const OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS = [
  '内容概括决定起承转合，不能只按素材顺序堆事件。',
  '情节安排决定主线/辅线/事件线/感情线/逻辑线取舍；不服务本章意图的线索不要展开。',
  '人物关系和出场顺序决定镜头进入顺序，信息差必须借在场角色反应放大。',
  '情节细化决定代价兑现/收益兑现，爽点出手前先铺可指认的危机/期待。',
  '结尾设定和钩子决定章尾承接，爆发后要用一段冷却承接下一钩子。',
  '装逼/打脸/揭露章必须把视角/信息差经在场配角放大成差异化反应。',
]

const OH_STORY_INTENT_CONFIRMATION_CHECKS = [
  '意图确认清楚：正文必须能看出本章按“情绪+节奏+模块+文风指令”执行。',
  '情绪目标兑现：目标情绪不能被无关背景、均匀叙事或过早解释冲淡。',
  '节奏/爆发匹配：蓄势、爆发、冷却、章尾承接必须与本章节奏指令一致。',
  '结构输入落地：内容概括、逻辑线、出场顺序、代价/收益和结尾钩子必须有正文证据。',
  '信息差反应可见：揭露、打脸、反证或反转后，在场角色必须有差异化反应。',
  '文风召回不过界：只执行节奏、停顿、潜台词等抽象技巧，不复制对标原文或桥段。',
]

const OH_STORY_INTENT_DIALOGUE_TONE_BASELINE = [
  '高压/生死/悲痛 beat 下，搞笑担当/轻快配角声线让位，不能用吐槽冲淡本章主情绪。',
  '信息型配角不当科普嘴，信息必须通过立场、追问、误导、证据或行动承接。',
  '对话逐句承接对方情绪，每次情绪转变都要有事件触发，不能跳步换情绪。',
]

export function intentConfirmationExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.intent_confirmation_contract
    || contextPackage?.chapter_target?.intentConfirmationContract
    || contextPackage?.intent_confirmation_contract
    || contextPackage?.intentConfirmationContract
    || contextPackage?.pre_draft_brief?.intent_confirmation_contract
    || contextPackage?.preDraftBrief?.intentConfirmationContract
}

export function buildIntentConfirmationContract(contextPackage: any = {}, options: any = {}) {
  const explicit = intentConfirmationExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildIntentConfirmationContract({
      ...(contextPackage || {}),
      intent_confirmation_contract: null,
      intentConfirmationContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            intent_confirmation_contract: null,
            intentConfirmationContract: null,
          }
        : contextPackage?.chapter_target,
    }, options)
    const noBenchmark = benchmarkRecallIsNoBenchmark(benchmarkRecallGapsFromContext(contextPackage, options))
    const rhythmAndStyle = asArray(explicit.rhythm_and_style || explicit.rhythmAndStyle).length
      ? asArray(explicit.rhythm_and_style || explicit.rhythmAndStyle).map(assetText).filter(Boolean)
      : asArray(derived.rhythm_and_style)
    return {
      version: explicit.version || 'oh_story_intent_confirmation_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      confirmed_intent: compactBriefText(explicit.confirmed_intent || explicit.confirmedIntent || explicit.intent) || derived.confirmed_intent,
      rhythm_and_style: noBenchmark ? uniqueBriefStrings([...rhythmAndStyle, OH_STORY_NO_BENCHMARK_INTENT_NOTE], 12) : rhythmAndStyle,
      structure_inputs: asArray(explicit.structure_inputs || explicit.structureInputs).length
        ? asArray(explicit.structure_inputs || explicit.structureInputs).map(assetText).filter(Boolean)
        : asArray(derived.structure_inputs),
      execution_focus: asArray(explicit.execution_focus || explicit.executionFocus).length
        ? asArray(explicit.execution_focus || explicit.executionFocus).map(assetText).filter(Boolean)
        : asArray(derived.execution_focus).length ? asArray(derived.execution_focus) : OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS,
      dialogue_tone_baseline: asArray(explicit.dialogue_tone_baseline || explicit.dialogueToneBaseline).length
        ? asArray(explicit.dialogue_tone_baseline || explicit.dialogueToneBaseline).map(assetText).filter(Boolean)
        : asArray(derived.dialogue_tone_baseline).length ? asArray(derived.dialogue_tone_baseline) : OH_STORY_INTENT_DIALOGUE_TONE_BASELINE,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map(assetText).filter(Boolean)
        : OH_STORY_INTENT_CONFIRMATION_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map(assetText).filter(Boolean)
        : asArray(derived.revision_priorities).length ? asArray(derived.revision_priorities) : ['重申本章意图', '校准情绪节奏', '补信息差反应', '补代价/收益', '接住章尾钩子'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const chapterBlueprint = options.chapter_blueprint || contextPackage?.chapter_target?.chapter_blueprint || contextPackage?.chapter_blueprint || {}
  const styleStrategy = options.style_sample_strategy || target.style_sample_strategy || contextPackage?.style_sample_strategy || {}
  const benchmarkStrategy = options.chapter_benchmark_strategy || target.chapter_benchmark_strategy || contextPackage?.chapter_benchmark_strategy || {}
  const stateTracking = options.state_tracking_contract || target.state_tracking_contract || contextPackage?.state_tracking_contract || {}
  const benchmarkGaps = benchmarkRecallGapsFromContext(contextPackage, options)
  const noBenchmark = benchmarkRecallIsNoBenchmark(benchmarkGaps)
  const toneMatchFailed = benchmarkRecallHasGap(benchmarkGaps, /tone_match_failed|基调匹配失败|tone match failed/i)
  const profileDegenerate = benchmarkRecallHasGap(benchmarkGaps, /profile_degenerate|文风不可用|文风画像退化|profile degenerate/i)
  const selectedEmotionModule = compactBriefText(
    styleRecallValueText(styleStrategy, 'selected_emotion_module')
    || styleRecallValueText(benchmarkStrategy, 'selected_emotion_module')
    || asArray(chapterBlueprint?.emotional_arc_contract?.scene_emotion_steps)[0]
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.emotion_modules)[0],
  )
  const rhythmReference = compactBriefText(
    styleRecallValueText(styleStrategy, 'rhythm_reference')
    || styleRecallValueText(benchmarkStrategy, 'rhythm_reference')
    || asArray(chapterBlueprint?.upgrade_rhythm_contract?.bridge_rhythm)[0]
    || asArray(chapterBlueprint?.plot_dynamics_contract?.climax_formula).join(' -> '),
  )
  const matchedTechniques = uniqueBriefStrings([
    ...styleRecallList(styleStrategy, 'matched_chapter_techniques'),
    ...styleRecallList(benchmarkStrategy, 'matched_chapter_techniques'),
    ...styleRecallList(styleStrategy, 'style_directives'),
    ...styleRecallList(benchmarkStrategy, 'style_directives'),
  ], 8)
  const usableMatchedTechniques = (toneMatchFailed || profileDegenerate) ? [] : matchedTechniques
  const targetEmotion = compactBriefText(
    chapterBlueprint?.target_emotion
    || options.emotional_curve
    || target.target_emotion
    || target.emotional_curve
    || sceneCards.map((scene: any) => scene.emotional_tone).filter(Boolean).join(' -> '),
  )
  const confirmedIntent = compactBriefText([
    targetEmotion ? `情绪：${targetEmotion}` : '',
    rhythmReference ? `节奏：${rhythmReference}` : '',
    selectedEmotionModule ? `模块：${selectedEmotionModule}` : '',
    usableMatchedTechniques.length ? `文风指令：${usableMatchedTechniques.join('、')}` : '',
    toneMatchFailed ? '基调匹配失败：只保留整书文风，不喂匹配章技法。' : '',
    profileDegenerate ? '文风不可用：跳过退化文风画像，只执行默认 Gates 和本章合同。' : '',
    target.summary || target.goal || chapterBlueprint?.writing_intent,
  ].filter(Boolean).join('；'))
  const structureInputs = uniqueBriefStrings([
    chapterBlueprint?.content_outline ? `内容概括：起因=${chapterBlueprint.content_outline.cause || ''}；发展=${chapterBlueprint.content_outline.development || ''}；转折=${chapterBlueprint.content_outline.turn || ''}；高潮=${chapterBlueprint.content_outline.climax || ''}；结尾=${chapterBlueprint.content_outline.ending || ''}` : '',
    chapterBlueprint?.plot_lines?.mainline || chapterBlueprint?.plot_lines?.logic_line ? `逻辑线：${chapterBlueprint?.plot_lines?.logic_line || chapterBlueprint?.plot_lines?.mainline}` : '',
    asArray(chapterBlueprint?.character_order).length ? `人物出场顺序：${asArray(chapterBlueprint.character_order).join(' -> ')}` : '',
    chapterBlueprint?.cost_and_reward ? `代价/收益：${chapterBlueprint.cost_and_reward}` : '',
    chapterBlueprint?.ending_contract?.next_chapter_pull ? `章尾承接：${chapterBlueprint.ending_contract.next_chapter_pull}` : '',
    asArray(stateTracking?.character_states).length ? `状态筛选：${asArray(stateTracking.character_states).slice(0, 3).join('；')}` : '',
  ], 12)
  const rhythmAndStyle = uniqueBriefStrings([
    noBenchmark ? OH_STORY_NO_BENCHMARK_INTENT_NOTE : '',
    toneMatchFailed ? 'tone_match_failed：仅用整书文风和本章合同，不带入匹配章技法、桥段、声线或节奏模板。' : '',
    profileDegenerate ? 'profile_degenerate：文风不可用，跳过文风画像和匹配章技法，只执行默认 Gates、情绪模块、节奏参照和本章合同。' : '',
    selectedEmotionModule ? `selected_emotion_module：${selectedEmotionModule}` : '',
    rhythmReference ? `rhythm_reference：${rhythmReference}` : '',
    usableMatchedTechniques.length ? `matched_chapter_techniques：${usableMatchedTechniques.join('、')}` : '',
    usableMatchedTechniques.length ? '文风召回边界：只学结构节奏、情绪模块和叙述技法，不得复制对标章节桥段、设定、角色名或原句。' : '',
    targetEmotion ? `目标情绪：${targetEmotion}` : '',
  ], 10)
  const executionFocus = uniqueBriefStrings([
    chapterBlueprint?.content_outline ? `内容概括执行：起因=${chapterBlueprint.content_outline.cause || ''}；发展=${chapterBlueprint.content_outline.development || ''}；转折=${chapterBlueprint.content_outline.turn || ''}；高潮=${chapterBlueprint.content_outline.climax || ''}；结尾=${chapterBlueprint.content_outline.ending || ''}` : '',
    chapterBlueprint?.plot_lines?.mainline || chapterBlueprint?.plot_lines?.logic_line ? `逻辑线执行：${chapterBlueprint?.plot_lines?.logic_line || chapterBlueprint?.plot_lines?.mainline}` : '',
    asArray(chapterBlueprint?.character_order).length ? `出场顺序执行：${asArray(chapterBlueprint.character_order).join(' -> ')}` : '',
    chapterBlueprint?.cost_and_reward ? `代价/收益执行：${chapterBlueprint.cost_and_reward}` : '',
    chapterBlueprint?.ending_contract?.next_chapter_pull ? `章尾承接执行：${chapterBlueprint.ending_contract.next_chapter_pull}` : '',
    ...OH_STORY_INTENT_CONFIRMATION_EXECUTION_FOCUS,
  ], 18)

  return {
    version: 'oh_story_intent_confirmation_v1',
    source: 'oh_story_embedded_fallback',
    confirmed_intent: confirmedIntent || compactBriefText(chapterBlueprint?.writing_intent || target.summary || target.goal),
    rhythm_and_style: rhythmAndStyle,
    structure_inputs: structureInputs,
    execution_focus: executionFocus,
    dialogue_tone_baseline: OH_STORY_INTENT_DIALOGUE_TONE_BASELINE,
    quality_checks: OH_STORY_INTENT_CONFIRMATION_CHECKS,
    revision_priorities: ['重申本章意图', '校准情绪节奏', '补信息差反应', '补代价/收益', '接住章尾钩子'],
  }
}

export function continuityHeatExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.continuity_heat_contract
    || contextPackage?.chapter_target?.continuityHeatContract
    || contextPackage?.continuity_heat_contract
    || contextPackage?.continuityHeatContract
    || contextPackage?.pre_draft_brief?.continuity_heat_contract
    || contextPackage?.preDraftBrief?.continuityHeatContract
}

export function intentDialogueToneBaselineFromContext(contextPackage: any = {}) {
  const contract = contextPackage?.chapter_target?.intent_confirmation_contract
    || contextPackage?.chapter_target?.intentConfirmationContract
    || contextPackage?.intent_confirmation_contract
    || contextPackage?.intentConfirmationContract
    || contextPackage?.pre_draft_brief?.intent_confirmation_contract
    || contextPackage?.preDraftBrief?.intentConfirmationContract
  return uniqueBriefStrings(
    asArray(contract?.dialogue_tone_baseline || contract?.dialogueToneBaseline)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean),
    8,
  )
}

export function applyIntentDialogueBaselineToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  const baseline = intentDialogueToneBaselineFromContext(contextPackage)
  if (!sceneCards.length || !baseline.length) return sceneCards
  return sceneCards.map(card => ({
    ...card,
    dialogue_goals: mergeSceneCardStringList(card.dialogue_goals, baseline, 24),
    serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['意图确认']),
  }))
}
