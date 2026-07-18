import { asArray } from '../../routes/novel-route-utils'

export const OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES = [
  '安全感优先：长篇不能让女主一直被虐，每卷和关键章节必须给可见成长、翻盘或退路锚点。',
  '代入感优先：女主处境、选择和反应要让目标读者能投射进去，不能只靠设定宣布她很惨或很强。',
  '女主主动性：金手指、男主、家族或时代红利可以帮她，但关键选择必须由女主自己做决定、自己推进。',
  '情绪即产品：甜、虐、沙雕或正剧都必须服务一条主情绪，小情绪不能散成多头并行。',
]

export const OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES = [
  '女频深层需求不是表层打脸/被宠，而是被认可、被珍视、被尊重。',
  '反抗命运、事业独立、被宠爱、虐恋反转和反差萌都要落成女主当下能感知的选择、边界或回报。',
  '安全感要通过女主的退路、能力、资源、同盟或关系边界呈现，不能只用旁白保证“她会赢”。',
]

export const OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES = [
  '女频长篇文案和正文承诺遵守状态 → 困境 → 行动 → 成功四段式。',
  '简介、开篇和正文必须给女主成功暗示或翻盘方向，不能只铺虐不给出路。',
  '事业线突出的文，正文必须给事业成功暗示，不能只写感情线消化全部期待。',
]

export const OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES = [
  '题材必须有长线骨架，能撑几十万字，不是一个短篇反转或一次打脸写完就没了。',
  '核心梗不超过 2-3 个，叠梗必须互相支撑，不能把主线冲散。',
  '重生复仇、宅斗、年代、种田经商、先婚后爱等题材要有卷级目标和对手梯度。',
]

export const OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES = [
  '感情线双轴：感情升级最好踩在女主的一次事业进展或成长节点上，避免全书只谈恋爱。',
  '卷级感情节奏按暧昧→确认→危机→升华推进，每次关系质变必须匹配剧情高潮或重大选择。',
  '男主人设决定留存，要用具体行为、边界、双标或尊重细节加分，不只堆形容词。',
]

export const OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES = [
  '长篇虐戏要分散，每段虐后必给反转或糖，让读者看到女主不会一直输。',
  '连续整卷只虐会掉追读，必须在卷内设置阶段性安全感锚点、反击、成长或被珍视证据。',
  '虐的目的必须是制造情绪波动并服务反转、关系变化或女主成长，不能为虐而虐。',
]

export const OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES = [
  '番茄女生：强钩子、强情绪、爽感直给，安全感要早给，前三章必须立住钩子和翻盘方向。',
  '起点女生：人设细、文风稳、可慢热，但长线追读仍要靠持续目标、成长和关系递进。',
  '晋江：主体性、人设细节和文案安全感要求高，人物关系细密度不能空。',
  '七猫：甜虐交替、极限推拉、情绪钩子密集，章节内要保持推拉和回报。',
]

export const OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS = [
  '女频核心四原则必须过：安全感、代入感、女主主动性、情绪即产品。',
  '感情线双轴成立：感情升级踩在事业/成长节点上，不是全书只谈恋爱。',
  '虐戏剂量可控：没有连续整卷只虐，每段虐后有反转或糖。',
  '题材有长线骨架，核心梗不超过 2-3 个，主线没被叠梗冲散。',
  '平台对位：文风、安全感密度、篇幅节奏匹配目标平台。',
  '货板一致：书名=简介承诺=正文交付三位一体，没有货不对板。',
]

export function femaleAudienceExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.female_audience_contract
    || contextPackage?.chapter_target?.femaleAudienceContract
    || contextPackage?.female_audience_contract
    || contextPackage?.femaleAudienceContract
    || contextPackage?.pre_draft_brief?.female_audience_contract
    || contextPackage?.preDraftBrief?.femaleAudienceContract
}

export function normalizeFemaleAudienceActivationMode(value: any) {
  if (value === true) return 'enabled'
  if (value === false) return 'disabled'
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw || raw === 'auto' || raw === 'detect' || raw === 'keyword' || raw === 'keyword_detection') return 'auto'
  if (['enabled', 'enable', 'on', 'true', 'yes', 'force', 'forced', 'always', 'confirmed'].includes(raw)) return 'enabled'
  if (['disabled', 'disable', 'off', 'false', 'no', 'never', 'disabled_by_author'].includes(raw)) return 'disabled'
  return 'auto'
}

function femaleAudienceActivationCandidates(project: any = {}, contextPackage: any = {}) {
  const projectConfig = project?.reference_config || project?.referenceConfig || {}
  const projectControls = projectConfig?.oh_story_controls || projectConfig?.ohStoryControls || {}
  const contextControls = contextPackage?.oh_story_controls || contextPackage?.ohStoryControls || {}
  const writingBible = contextPackage?.writing_bible
    || contextPackage?.writingBible
    || projectConfig?.writing_bible
    || projectConfig?.writingBible
    || {}
  const chapterTarget = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  return [
    ['chapter_target.female_audience_mode', chapterTarget?.female_audience_mode ?? chapterTarget?.femaleAudienceMode],
    ['context.oh_story_controls.female_audience_mode', contextControls?.female_audience_mode ?? contextControls?.femaleAudienceMode],
    ['project.reference_config.oh_story_controls.female_audience_mode', projectControls?.female_audience_mode ?? projectControls?.femaleAudienceMode],
    ['project.reference_config.oh_story_controls.female_audience_enabled', projectControls?.female_audience_enabled ?? projectControls?.femaleAudienceEnabled],
    ['writing_bible.female_audience_mode', writingBible?.female_audience_mode ?? writingBible?.femaleAudienceMode],
    ['writing_bible.female_audience_enabled', writingBible?.female_audience_enabled ?? writingBible?.femaleAudienceEnabled],
  ]
}

export function resolveFemaleAudienceActivation(project: any = {}, contextPackage: any = {}) {
  for (const [source, value] of femaleAudienceActivationCandidates(project, contextPackage)) {
    if (value === undefined || value === null || String(value).trim() === '') continue
    const mode = normalizeFemaleAudienceActivationMode(value)
    if (mode === 'enabled') {
      return {
        mode,
        source,
        reason: '作者已在项目级配置中确认启用女频长篇口径。',
      }
    }
    if (mode === 'disabled') {
      return {
        mode,
        source,
        reason: '作者已在项目级配置中关闭女频长篇口径，跳过关键词自动识别。',
      }
    }
    return {
      mode: 'auto',
      source,
      reason: '作者选择自动识别女频长篇口径。',
    }
  }
  return {
    mode: 'auto',
    source: 'keyword_detection',
    reason: '未设置项目级女频长篇开关，使用关键词自动识别。',
  }
}

export function detectFemaleAudienceContext(project: any = {}, contextPackage: any = {}) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const rawText = [
    project?.title,
    project?.genre,
    project?.target_platform,
    project?.target_audience,
    project?.synopsis,
    contextPackage?.project?.genre,
    contextPackage?.project?.target_audience,
    contextPackage?.chapter_target?.summary,
    contextPackage?.chapter_target?.conflict,
    writingBible?.protagonist_identity,
    writingBible?.relationship_core,
    writingBible?.target_platform,
    writingBible?.target_audience,
    ...asArray(writingBible?.commercial_positioning?.selling_points || writingBible?.commercial_positioning?.sellingPoints),
  ].filter(Boolean).join(' ')
  return /女频|女生|女性|女主|番茄女生|起点女生|晋江|七猫|先婚后爱|追妻|火葬场|强取豪夺|宅斗|宫斗|换亲|萌宝|带球跑/.test(rawText)
}

function isFemaleAudienceContext(project: any = {}, contextPackage: any = {}) {
  const activation = resolveFemaleAudienceActivation(project, contextPackage)
  if (activation.mode === 'enabled') return true
  if (activation.mode === 'disabled') return false
  return detectFemaleAudienceContext(project, contextPackage)
}

