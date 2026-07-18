import { asArray } from '../../routes/novel-route-utils'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_TARGET_READER_QUESTIONS = [
  '我这书写给谁看？至少包括年龄段、职业、性别、常用平台、人生处境和普遍渴望。',
  '我的目标读者群体在看网文时希望看到什么内容？',
  '我的这本书和本章有哪些内容是目标读者群体想看的？',
]

const OH_STORY_TARGET_READER_CHECKS = [
  '三问必须全部回答清楚：写给谁、读者想看什么、本书本章给什么。',
  '目标读者画像必须具体到年龄段、职业/生活状态、性别倾向、常用平台和普遍渴望。',
  '情绪缺口必须明确：从核心痛苦、深层情结、高频情绪关键词和未满足需求反推本章压力与回报。',
  '题材生命力必须用当前目标平台样本验证，判断新鲜期 / 成熟期 / 审美疲劳期，不能把历史经验当作当前事实。',
  '平台适配必须以目标平台样本校准，不能用A网站的样本直接套到B网站。',
  '题材边界必须确认当前素材、知识储备和篇幅能支撑所选题材，创新题材要降低篇幅和创新数量。',
  '书名、简介和正文必须货板一致：书名3秒抓人，简介有安全感+钩子，正文兑现同一个核心卖点。',
  '代入感必须稳定，世界观自洽且画风统一，避免仙侠搞科研式塑料感。',
  '金手指必须与主角生活/职业息息相关，并服务主线，不得硬贴或频繁开新能力。',
  '私人表达不得超过全篇5%，且必须服务核心卖点和主线剧情。',
  '本章场景选择必须能反向校验目标读者想看的内容，不能只服务作者自嗨设定。',
  '章节核心卖点、开篇钩子、冲突和回报必须至少命中一个读者高频渴望。',
  '如果读者画像、平台口味和本章卖点错位，必须调整场景选择、信息释放或回报方式。',
]

const OH_STORY_TARGET_READER_GENRE_VITALITY_RULES = [
  '题材生命力必须按当前目标平台样本验证，不把历史经验或历史热度当作当前事实。',
  '写前判断题材阶段：新鲜期优先提炼创意方向，成熟期优先稳定交付边界期待，审美疲劳期必须给出新切入点。',
  '无法确认阶段时按成熟期处理：保守满足边界期待，微创新不超过 3 个。',
]

const OH_STORY_TARGET_READER_PLATFORM_FIT_RULES = [
  '不能用A网站的样本直接套到B网站；必须用目标平台样本校准读者期待、节奏和雷点。',
  '番茄优先强情绪、噱头和爽感直给；起点可以接受更慢节奏的正常剧情推进和代入感。',
  '同一题材在不同平台必须调整写法，不能只沿用旧平台经验。',
]

const OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES = [
  '确认题材边界感：当前素材、知识储备和篇幅能支撑所选题材。',
  '成熟题材优先稳定边界期待；无边界感/创新题材风险高，必须降低篇幅和创新数量。',
  '混搭题材不得突破读者对核心类型的基础期待。',
]

const OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES = [
  '书名3秒抓人：在目标平台命名规则内传递核心卖点或钩子。',
  '简介有安全感+钩子：至少暗示主角会赢，同时留下悬念。',
  '书名简介内容三位一体：书名暗示的卖点 = 简介承诺的内容 = 正文实际交付，禁止货不对板。',
]

const OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES = [
  '正文必须维持代入感：主角行动、世界规则和读者期待要同向。',
  '世界观自洽且画风统一，避免仙侠搞科研、武侠不侠等塑料感。',
  '新设定必须像真实存在于世界中，而不是纸糊的设定说明。',
]

const OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES = [
  '金手指必须与主角生活/职业息息相关，例如医生配医术秘籍，不要医生硬配隐身。',
  '金手指要服务主线，技能能升级，一个技能衍生不同效果，不要频繁开新金手指。',
  '能力反馈必须落到现实问题、职业技能、关系处境或资源变化里。',
]

const OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES = [
  '私人表达不得超过全篇5%，且不得打断叙事节奏。',
  '所有私人表达必须服务核心卖点，不得独立于主线剧情存在。',
  '商业化不是故意恶心读者，而是让表达服从目标读者的核心阅读需求。',
]

function targetReaderExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.target_reader_contract
    || contextPackage?.chapter_target?.targetReaderContract
    || contextPackage?.target_reader_contract
    || contextPackage?.targetReaderContract
    || contextPackage?.pre_draft_brief?.target_reader_contract
    || contextPackage?.preDraftBrief?.targetReaderContract
}

function buildReaderProfileText(project: any = {}, contextPackage: any = {}, configured: any = {}) {
  const platform = compactBriefText(
    configured.platform
    || configured.common_platform
    || configured.commonPlatform
    || contextPackage?.chapter_target?.target_platform
    || contextPackage?.target_platform
    || contextPackage?.writing_bible?.target_platform
    || project?.reference_config?.writing_bible?.target_platform
    || project?.target_platform
    || project?.platform,
  )
  return compactBriefText([
    configured.age_range || configured.ageRange ? `年龄：${configured.age_range || configured.ageRange}` : '',
    configured.occupation ? `职业：${configured.occupation}` : '',
    configured.gender ? `性别倾向：${configured.gender}` : '',
    platform ? `常用平台：${platform}` : '',
    configured.life_situation || configured.lifeSituation ? `人生处境：${configured.life_situation || configured.lifeSituation}` : '',
    configured.core_desire || configured.coreDesire ? `普遍渴望：${configured.core_desire || configured.coreDesire}` : '',
    project?.target_audience ? `项目读者：${project.target_audience}` : '',
    contextPackage?.project?.target_audience ? `上下文读者：${contextPackage.project.target_audience}` : '',
  ].filter(Boolean).join('；'), compactBriefText(project?.target_audience || contextPackage?.project?.target_audience || project?.genre || '通用网文读者'))
}

function buildTargetReaderEmotionalGapAnalysis(project: any = {}, contextPackage: any = {}, configured: any = {}, readerDesires: any[] = []) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const corePain = compactBriefText(firstDefined(
    configured.core_pain,
    configured.corePain,
    configured.emotional_gap,
    configured.emotionalGap,
    configured.pain_point,
    configured.painPoint,
    commercial.core_pain,
    commercial.corePain,
    commercial.emotional_gap,
    commercial.emotionalGap,
  ))
  const hiddenComplexes = uniqueBriefStrings([
    configured.hidden_complex,
    configured.hiddenComplex,
    configured.hidden_complexes,
    configured.hiddenComplexes,
    configured.deep_complexes,
    configured.deepComplexes,
    commercial.hidden_complexes,
    commercial.hiddenComplexes,
  ], 6)
  const emotionKeywords = uniqueBriefStrings([
    configured.comment_emotion_keywords,
    configured.commentEmotionKeywords,
    configured.emotion_keywords,
    configured.emotionKeywords,
    configured.high_frequency_emotions,
    configured.highFrequencyEmotions,
    commercial.comment_emotion_keywords,
    commercial.commentEmotionKeywords,
  ], 8)
  const unmetNeeds = uniqueBriefStrings([
    configured.unmet_needs,
    configured.unmetNeeds,
    configured.reader_needs,
    configured.readerNeeds,
    commercial.unmet_needs,
    commercial.unmetNeeds,
    commercial.reader_needs,
    commercial.readerNeeds,
  ], 8)
  return uniqueBriefStrings([
    corePain ? `核心痛苦：${corePain}` : '',
    hiddenComplexes.length ? `深层情结：${hiddenComplexes.join('、')}` : '',
    emotionKeywords.length ? `高频情绪关键词：${emotionKeywords.join('、')}` : '',
    unmetNeeds.length ? `未满足需求：${unmetNeeds.join('、')}` : '',
    readerDesires.length ? `对照分析：${readerDesires.slice(0, 4).join('、')} 必须对应目标读者未满足需求。` : '',
  ], 10)
}

export function buildTargetReaderContract(project: any = {}, contextPackage: any = {}) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = targetReaderExplicitContract(contextPackage)
    || writingBible?.target_reader_contract
    || writingBible?.targetReaderContract
    || project?.reference_config?.target_reader_contract
    || project?.reference_config?.targetReaderContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derivedProject = {
      ...(project || {}),
      reference_config: {
        ...(project?.reference_config || {}),
        target_reader_contract: null,
        targetReaderContract: null,
        writing_bible: {
          ...(project?.reference_config?.writing_bible || {}),
          target_reader_contract: null,
          targetReaderContract: null,
        },
      },
    }
    const derived = buildTargetReaderContract(derivedProject, {
      ...(contextPackage || {}),
      target_reader_contract: null,
      targetReaderContract: null,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.writing_bible,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitReaderProfile = compactBriefText(explicit.reader_profile || explicit.readerProfile)
    const explicitReaderDesires = asArray(explicit.reader_desires || explicit.readerDesires || explicit.desires || explicit.desired_content || explicit.desiredContent)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitEmotionalGapAnalysis = asArray(explicit.emotional_gap_analysis || explicit.emotionalGapAnalysis || explicit.emotional_gaps || explicit.emotionalGaps)
      .concat(asArray(explicit.emotional_gap || explicit.emotionalGap))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitChapterAttractions = asArray(explicit.chapter_attractions || explicit.chapterAttractions || explicit.attractions || explicit.chapter_selling_points || explicit.chapterSellingPoints)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGenreVitalityRules = asArray(explicit.genre_vitality_rules || explicit.genreVitalityRules || explicit.genre_lifecycle_rules || explicit.genreLifecycleRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules || explicit.platform_adaptation_rules || explicit.platformAdaptationRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitBoundaryFitRules = asArray(explicit.boundary_fit_rules || explicit.boundaryFitRules || explicit.genre_boundary_rules || explicit.genreBoundaryRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitTitleBlurbAlignmentRules = asArray(explicit.title_blurb_alignment_rules || explicit.titleBlurbAlignmentRules || explicit.copy_alignment_rules || explicit.copyAlignmentRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitImmersionPlasticityRules = asArray(explicit.immersion_plasticity_rules || explicit.immersionPlasticityRules || explicit.immersion_rules || explicit.immersionRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGoldfingerLifeFitRules = asArray(explicit.goldfinger_life_fit_rules || explicit.goldfingerLifeFitRules || explicit.goldfinger_fit_rules || explicit.goldfingerFitRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitCommercialExpressionRules = asArray(explicit.commercial_expression_rules || explicit.commercialExpressionRules || explicit.private_expression_rules || explicit.privateExpressionRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitValidationQuestions = asArray(explicit.validation_questions || explicit.validationQuestions || explicit.chapter_value_test || explicit.chapterValueTest)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitCorrectionMethods = asArray(explicit.correction_methods || explicit.correctionMethods)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    return {
      version: explicit.version || 'oh_story_target_reader_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      reader_profile: explicitReaderProfile || derived.reader_profile,
      reader_desires: explicitReaderDesires.length ? explicitReaderDesires : asArray(derived.reader_desires),
      emotional_gap_analysis: explicitEmotionalGapAnalysis.length ? explicitEmotionalGapAnalysis : asArray(derived.emotional_gap_analysis),
      chapter_attractions: explicitChapterAttractions.length ? explicitChapterAttractions : asArray(derived.chapter_attractions),
      genre_vitality_rules: explicitGenreVitalityRules.length
        ? explicitGenreVitalityRules
        : asArray(derived.genre_vitality_rules).length ? asArray(derived.genre_vitality_rules) : OH_STORY_TARGET_READER_GENRE_VITALITY_RULES,
      platform_fit_rules: explicitPlatformFitRules.length
        ? explicitPlatformFitRules
        : asArray(derived.platform_fit_rules).length ? asArray(derived.platform_fit_rules) : OH_STORY_TARGET_READER_PLATFORM_FIT_RULES,
      boundary_fit_rules: explicitBoundaryFitRules.length
        ? explicitBoundaryFitRules
        : asArray(derived.boundary_fit_rules).length ? asArray(derived.boundary_fit_rules) : OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES,
      title_blurb_alignment_rules: explicitTitleBlurbAlignmentRules.length
        ? explicitTitleBlurbAlignmentRules
        : asArray(derived.title_blurb_alignment_rules).length ? asArray(derived.title_blurb_alignment_rules) : OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES,
      immersion_plasticity_rules: explicitImmersionPlasticityRules.length
        ? explicitImmersionPlasticityRules
        : asArray(derived.immersion_plasticity_rules).length ? asArray(derived.immersion_plasticity_rules) : OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES,
      goldfinger_life_fit_rules: explicitGoldfingerLifeFitRules.length
        ? explicitGoldfingerLifeFitRules
        : asArray(derived.goldfinger_life_fit_rules).length ? asArray(derived.goldfinger_life_fit_rules) : OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES,
      commercial_expression_rules: explicitCommercialExpressionRules.length
        ? explicitCommercialExpressionRules
        : asArray(derived.commercial_expression_rules).length ? asArray(derived.commercial_expression_rules) : OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES,
      validation_questions: explicitValidationQuestions.length
        ? explicitValidationQuestions
        : asArray(derived.validation_questions).length ? asArray(derived.validation_questions) : OH_STORY_TARGET_READER_QUESTIONS,
      correction_methods: explicitCorrectionMethods.length
        ? explicitCorrectionMethods
        : asArray(derived.correction_methods).length ? asArray(derived.correction_methods) : ['分析同类书读者评论的高频正面关键词', '对比同类书高互动与低互动段落差异', '用目标读者画像反向校验本章情节选择'],
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_TARGET_READER_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补清目标读者三问', '让本章卖点命中读者渴望', '删作者自嗨设定展示', '调整平台口味', '补可见读者回报'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const configured = writingBible?.target_reader
    || writingBible?.targetReader
    || project?.reference_config?.target_reader
    || project?.reference_config?.targetReader
    || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const readerDesires = uniqueBriefStrings([
    ...asArray(configured.desires || configured.reader_desires || configured.readerDesires),
    ...asArray(configured.desired_content || configured.desiredContent),
    ...asArray(commercial.selling_points || commercial.sellingPoints),
    commercial.retention_strategy,
    writingBible.promise,
    project?.synopsis,
  ], 12)
  const chapterAttractions = uniqueBriefStrings([
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.opening_hook,
      scene.reader_payoff,
      scene.reversal,
      scene.conflict,
      scene.purpose,
      scene.ending_hook_seed,
    ]),
  ], 18)
  return {
    version: 'oh_story_target_reader_v1',
    source: 'oh_story_embedded_fallback',
    reader_profile: buildReaderProfileText(project, contextPackage, configured),
    reader_desires: readerDesires,
    emotional_gap_analysis: buildTargetReaderEmotionalGapAnalysis(project, contextPackage, configured, readerDesires),
    chapter_attractions: chapterAttractions,
    genre_vitality_rules: OH_STORY_TARGET_READER_GENRE_VITALITY_RULES,
    platform_fit_rules: OH_STORY_TARGET_READER_PLATFORM_FIT_RULES,
    boundary_fit_rules: OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES,
    title_blurb_alignment_rules: OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES,
    immersion_plasticity_rules: OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES,
    goldfinger_life_fit_rules: OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES,
    commercial_expression_rules: OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES,
    validation_questions: OH_STORY_TARGET_READER_QUESTIONS,
    correction_methods: ['分析同类书读者评论的高频正面关键词', '对比同类书高互动与低互动段落差异', '用目标读者画像反向校验本章情节选择'],
    quality_checks: OH_STORY_TARGET_READER_CHECKS,
    revision_priorities: ['补清目标读者三问', '让本章卖点命中读者渴望', '删作者自嗨设定展示', '调整平台口味', '补可见读者回报'],
  }
}

