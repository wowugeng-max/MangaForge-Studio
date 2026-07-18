import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export function buildPunctuationToneContract(project: any = {}, contextPackage: any = {}) {
  const explicit = punctuationToneExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildPunctuationToneContract(project, {
      ...(contextPackage || {}),
      punctuation_tone_contract: null,
      punctuationToneContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitTonePunctuationMap = asArray(explicit.tone_punctuation_map || explicit.tonePunctuationMap).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenMarks = asArray(explicit.forbidden_marks || explicit.forbiddenMarks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneTonePlan = asArray(explicit.scene_tone_plan || explicit.sceneTonePlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_punctuation_tone_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      tone_punctuation_map: explicitTonePunctuationMap.length
        ? explicitTonePunctuationMap
        : (asArray(derived.tone_punctuation_map).length ? asArray(derived.tone_punctuation_map) : OH_STORY_PUNCTUATION_TONE_MAP),
      forbidden_marks: explicitForbiddenMarks.length
        ? explicitForbiddenMarks
        : (asArray(derived.forbidden_marks).length ? asArray(derived.forbidden_marks) : OH_STORY_PUNCTUATION_FORBIDDEN),
      scene_tone_plan: explicitSceneTonePlan.length ? explicitSceneTonePlan : asArray(derived.scene_tone_plan),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_PUNCTUATION_TONE_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['修通篇句号化', '清理随机标点堆砌', '删除省略号/破折号停顿', '按角色关系重排问号/感叹号', '用动作和短句替代硬停顿']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_punctuation_tone_v1',
    source: 'oh_story_embedded_fallback',
    tone_punctuation_map: OH_STORY_PUNCTUATION_TONE_MAP,
    forbidden_marks: OH_STORY_PUNCTUATION_FORBIDDEN,
    scene_tone_plan: uniqueBriefStrings(sceneCards.map(inferSceneTonePlan), 10),
    quality_checks: OH_STORY_PUNCTUATION_TONE_CHECKS,
    revision_priorities: ['修通篇句号化', '清理随机标点堆砌', '删除省略号/破折号停顿', '按角色关系重排问号/感叹号', '用动作和短句替代硬停顿'],
  }
}

function proseCraftExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.prose_craft_contract
    || contextPackage?.chapter_target?.proseCraftContract
    || contextPackage?.prose_craft_contract
    || contextPackage?.proseCraftContract
    || contextPackage?.pre_draft_brief?.prose_craft_contract
    || contextPackage?.preDraftBrief?.proseCraftContract
}

function buildProseCraftAnchors(sceneCards: any[], target: any) {
  const actionAnchors = sceneCards
    .flatMap((scene: any, index: number) => asArray(scene.action_beats || scene.required_beats || scene.requiredBeats)
      .map((beat: any) => `场景${scene.scene_no || index + 1}动作/身体锚点：${compactBriefText(beat)}`))
  const objectAnchors = sceneCards
    .flatMap((scene: any, index: number) => [
      scene.reader_payoff ? `场景${scene.scene_no || index + 1}读者回报要写成可见动作/物件：${compactBriefText(scene.reader_payoff)}` : '',
      scene.conflict ? `场景${scene.scene_no || index + 1}冲突要落到身体、空间或道具：${compactBriefText(scene.conflict)}` : '',
    ])
    .filter(Boolean)
  return uniqueBriefStrings([
    ...actionAnchors,
    ...objectAnchors,
    target.ending_hook ? `章尾钩子必须落到一个动作、物件、数字或身体反应：${compactBriefText(target.ending_hook)}` : '',
  ], 10)
}

export function buildProseCraftContract(project: any = {}, contextPackage: any = {}) {
  const explicit = proseCraftExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildProseCraftContract(project, {
      ...(contextPackage || {}),
      prose_craft_contract: null,
      proseCraftContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitPovRules = asArray(explicit.pov_rules || explicit.povRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpressionRules = asArray(explicit.expression_rules || explicit.expressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneWeavingRules = asArray(explicit.scene_weaving_rules || explicit.sceneWeavingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSubjectNameRhythmRules = asArray(explicit.subject_name_rhythm_rules || explicit.subjectNameRhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIndirectDescriptionRules = asArray(explicit.indirect_description_rules || explicit.indirectDescriptionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThreeCameraRules = asArray(explicit.three_camera_rules || explicit.threeCameraRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThenWhatRules = asArray(explicit.then_what_rules || explicit.thenWhatRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCoreEmotionAlignmentRules = asArray(explicit.core_emotion_alignment_rules || explicit.coreEmotionAlignmentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBaimiaoSensoryRules = asArray(explicit.baimiao_sensory_rules || explicit.baimiaoSensoryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDynamicDescriptionRules = asArray(explicit.dynamic_description_rules || explicit.dynamicDescriptionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitShotRhythmRules = asArray(explicit.shot_rhythm_rules || explicit.shotRhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionBridgeRules = asArray(explicit.transition_bridge_rules || explicit.transitionBridgeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRhythmRules = asArray(explicit.rhythm_rules || explicit.rhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitObjectNumberRules = asArray(explicit.object_number_rules || explicit.objectNumberRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSectionStructureRules = asArray(explicit.section_structure_rules || explicit.sectionStructureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSectionDensityRules = asArray(explicit.section_density_rules || explicit.sectionDensityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntiPaddingRules = asArray(explicit.anti_padding_rules || explicit.antiPaddingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitConceptAnchorRules = asArray(explicit.concept_anchor_rules || explicit.conceptAnchorRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDescriptionLimits = asArray(explicit.description_limits || explicit.descriptionLimits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntiAiSmellRules = asArray(explicit.anti_ai_smell_rules || explicit.antiAiSmellRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneAnchors = asArray(explicit.scene_anchors || explicit.sceneAnchors).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_prose_craft_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      pov_rules: explicitPovRules.length ? explicitPovRules : asArray(derived.pov_rules),
      expression_rules: explicitExpressionRules.length ? explicitExpressionRules : asArray(derived.expression_rules),
      scene_weaving_rules: explicitSceneWeavingRules.length ? explicitSceneWeavingRules : asArray(derived.scene_weaving_rules),
      subject_name_rhythm_rules: explicitSubjectNameRhythmRules.length ? explicitSubjectNameRhythmRules : asArray(derived.subject_name_rhythm_rules),
      indirect_description_rules: explicitIndirectDescriptionRules.length ? explicitIndirectDescriptionRules : asArray(derived.indirect_description_rules),
      three_camera_rules: explicitThreeCameraRules.length ? explicitThreeCameraRules : asArray(derived.three_camera_rules),
      then_what_rules: explicitThenWhatRules.length ? explicitThenWhatRules : asArray(derived.then_what_rules),
      core_emotion_alignment_rules: explicitCoreEmotionAlignmentRules.length ? explicitCoreEmotionAlignmentRules : asArray(derived.core_emotion_alignment_rules),
      baimiao_sensory_rules: explicitBaimiaoSensoryRules.length ? explicitBaimiaoSensoryRules : asArray(derived.baimiao_sensory_rules),
      dynamic_description_rules: explicitDynamicDescriptionRules.length ? explicitDynamicDescriptionRules : asArray(derived.dynamic_description_rules),
      shot_rhythm_rules: explicitShotRhythmRules.length ? explicitShotRhythmRules : asArray(derived.shot_rhythm_rules),
      transition_bridge_rules: explicitTransitionBridgeRules.length ? explicitTransitionBridgeRules : asArray(derived.transition_bridge_rules),
      rhythm_rules: explicitRhythmRules.length ? explicitRhythmRules : asArray(derived.rhythm_rules),
      object_number_rules: explicitObjectNumberRules.length ? explicitObjectNumberRules : asArray(derived.object_number_rules),
      section_structure_rules: explicitSectionStructureRules.length ? explicitSectionStructureRules : asArray(derived.section_structure_rules),
      section_density_rules: explicitSectionDensityRules.length ? explicitSectionDensityRules : asArray(derived.section_density_rules),
      anti_padding_rules: explicitAntiPaddingRules.length ? explicitAntiPaddingRules : asArray(derived.anti_padding_rules),
      concept_anchor_rules: explicitConceptAnchorRules.length ? explicitConceptAnchorRules : asArray(derived.concept_anchor_rules),
      description_limits: explicitDescriptionLimits.length ? explicitDescriptionLimits : asArray(derived.description_limits),
      anti_ai_smell_rules: explicitAntiAiSmellRules.length ? explicitAntiAiSmellRules : asArray(derived.anti_ai_smell_rules),
      scene_anchors: explicitSceneAnchors.length ? explicitSceneAnchors : asArray(derived.scene_anchors),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_prose_craft_v1',
    source: 'oh_story_embedded_fallback',
    pov_rules: OH_STORY_PROSE_CRAFT_POV_RULES,
    expression_rules: OH_STORY_PROSE_CRAFT_EXPRESSION_RULES,
    scene_weaving_rules: OH_STORY_PROSE_CRAFT_SCENE_WEAVING_RULES,
    subject_name_rhythm_rules: OH_STORY_PROSE_CRAFT_SUBJECT_NAME_RHYTHM_RULES,
    indirect_description_rules: OH_STORY_PROSE_CRAFT_INDIRECT_DESCRIPTION_RULES,
    three_camera_rules: OH_STORY_PROSE_CRAFT_THREE_CAMERA_RULES,
    then_what_rules: OH_STORY_PROSE_CRAFT_THEN_WHAT_RULES,
    core_emotion_alignment_rules: OH_STORY_PROSE_CRAFT_CORE_EMOTION_ALIGNMENT_RULES,
    baimiao_sensory_rules: OH_STORY_PROSE_CRAFT_BAIMIAO_SENSORY_RULES,
    dynamic_description_rules: OH_STORY_PROSE_CRAFT_DYNAMIC_DESCRIPTION_RULES,
    shot_rhythm_rules: OH_STORY_PROSE_CRAFT_SHOT_RHYTHM_RULES,
    transition_bridge_rules: OH_STORY_PROSE_CRAFT_TRANSITION_BRIDGE_RULES,
    rhythm_rules: OH_STORY_PROSE_CRAFT_RHYTHM_RULES,
    object_number_rules: OH_STORY_PROSE_CRAFT_OBJECT_NUMBER_RULES,
    section_structure_rules: OH_STORY_PROSE_CRAFT_SECTION_STRUCTURE_RULES,
    section_density_rules: OH_STORY_PROSE_CRAFT_SECTION_DENSITY_RULES,
    anti_padding_rules: OH_STORY_PROSE_CRAFT_ANTI_PADDING_RULES,
    concept_anchor_rules: OH_STORY_PROSE_CRAFT_CONCEPT_ANCHOR_RULES,
    description_limits: OH_STORY_PROSE_CRAFT_DESCRIPTION_LIMITS,
    anti_ai_smell_rules: OH_STORY_PROSE_CRAFT_ANTI_AI_SMELL_RULES,
    scene_anchors: buildProseCraftAnchors(sceneCards, target),
    forbidden_patterns: OH_STORY_PROSE_CRAFT_FORBIDDEN,
    quality_checks: OH_STORY_PROSE_CRAFT_CHECKS,
    revision_priorities: ['替换抽象情绪词', '补三维度揉进', '补间接描写/侧面反应', '补三机位法', '补“然后呢”推进', '收束核心情绪', '补白描/五感服务情绪', '补动态描写', '补镜头节奏', '补转场桥', '控水去AI味', '修深度限知', '补一动一静', '补数字/道具功能', '删上帝视角和无交互环境描写'],
  }
}
