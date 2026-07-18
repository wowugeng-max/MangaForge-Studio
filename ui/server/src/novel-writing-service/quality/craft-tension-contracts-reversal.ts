import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_REVERSAL_TYPES = [
  '身份反转',
  '视角反转',
  '动机反转',
  '时间线反转',
  '信息反转',
  '认知反转',
  '无反转',
]

const OH_STORY_REVERSAL_SETUP_REQUIREMENTS = [
  '身份反转：必须埋3处暗示（行为细节），禁止靠叙述者直接说明。',
  '视角反转：所有叙述都是真实事实，但不是全部事实；引入另一角色视角打破认知。',
  '动机反转：给表面动机，同时埋下与表面动机不一致的小行为。',
  '时间线反转：不撒谎，只调整叙述顺序，用时态、季节、物品新旧做天然线索。',
  '信息反转：先给可靠来源的旧事实，再用新证据直接否定旧事实。',
  '认知反转：全程积累一种感情色彩，结尾用遗物、证据或行动翻转情感判断。',
]

const OH_STORY_REVERSAL_MISDIRECTION_METHODS = [
  '选择性叙述：主角只关注某些信息，读者跟着走错方向。',
  '情绪引导：用情绪场景引导读者判断。',
  '红鲱鱼：可疑角色或事件必须有自己的剧情功能，只是不是答案。',
  '刻板印象利用：利用社会认知偏见，但不能欺骗读者。',
  '信息分层：真相和假信息混在一起，揭示时让前文获得新解读。',
]

const OH_STORY_REVERSAL_TIMING_RULES = [
  '单层反转最优区间 70-85%，禁止50%之前揭示，禁止95%之后才揭示。',
  '双层反转：第一层55-65%，第二层80-90%。',
  '揭示不超过300字，要快速、干脆；揭示后必须展示影响。',
  '双层反转第一层后给1-2段消化时间，第二层必须能同时解释A和B。',
]

const OH_STORY_REVERSAL_FACE_SLAP_RHYTHM = [
  '打脸节奏：压抑不能太长，压的同时必须给读者信心暗示。',
  '主动挑衅->打脸：简单粗暴，适合小白爽点。',
  '对手挑衅->被打脸：压主角同时给安全感和反击暗示。',
  '借他人之手打脸：支持者代为回击，保持主角高逼格。',
  '高潮部分要拉长，最大化球迷/旁观者/赛后跟进等反应。',
]

const OH_STORY_REVERSAL_FORBIDDEN = [
  '天降反转：前面完全没铺垫。',
  '解释过多：大段文字解释反转。',
  '反转太弱：读者早就猜到且没有情绪升级。',
  '反转太多：3个以上反转堆在一起。',
  '反转无感：只改变信息，不改变情绪。',
  '反转作弊：引入前面不存在的新信息或对读者撒谎。',
]

const OH_STORY_REVERSAL_CHECKS = [
  '回看铺垫至少有3处暗示指向反转，且暗示来自行为、物件、时间线、证据或反常选择。',
  '反转不依赖巧合，必须由角色选择、证据变化、视角补全或旧信息被否定推动。',
  '反转后情绪强度必须高于反转前，并改变读者对前面剧情的理解。',
  '读者有可能在反转前猜到：没有撒谎，只是没说出全部真相。',
  '揭示方式自然，不靠角色大段独白解释；揭示不超过300字。',
  '揭示后必须有足够篇幅展示影响：关系变化、局势翻盘、身份后果或下一层冲突。',
  '误导技巧必须公平：红鲱鱼有剧情功能，选择性叙述和情绪引导不能欺骗读者。',
  '打脸节奏必须有信心暗示、压迫长度控制和高潮反应，不能让主角长时间自暴自弃。',
]

function reversalExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.reversal_contract
    || contextPackage?.chapter_target?.reversalContract
    || contextPackage?.reversal_contract
    || contextPackage?.reversalContract
    || contextPackage?.pre_draft_brief?.reversal_contract
    || contextPackage?.preDraftBrief?.reversalContract
}

function inferReversalTypes(text: string) {
  const hits: string[] = []
  if (/账本|证据|伪证|调包|旧事实|新证据|否定|DNA|遗嘱/.test(text)) hits.push('信息反转')
  if (/身份|面具|旧部|真身|马甲|证人不是|陌生人/.test(text)) hits.push('身份反转')
  if (/视角|证词|另一.*角度|没看到|旁观/.test(text)) hits.push('视角反转')
  if (/动机|二选一|真正原因|表面.*真正|选择/.test(text)) hits.push('动机反转')
  if (/时间线|时间戳|顺序|之前|之后|旧.*新/.test(text)) hits.push('时间线反转')
  if (/认知|原来一直|恨|亏欠|感情色彩|重新理解/.test(text)) hits.push('认知反转')
  return uniqueBriefStrings(hits.length ? hits : ['信息反转'], 4)
}

function buildReversalSetupPlan(types: string[], sceneCards: any[], target: any) {
  const sceneHints = sceneCards
    .flatMap((scene: any, index: number) => [
      scene.information_gap ? `铺垫${index + 1}：${compactBriefText(scene.information_gap)}` : '',
      scene.reversal ? `揭示${index + 1}：${compactBriefText(scene.reversal)}` : '',
    ])
    .filter(Boolean)
  const typeHints = types.map(type => {
    if (type === '身份反转') return '身份反转铺垫：至少3处行为细节暗示真实身份。'
    if (type === '信息反转') return '信息反转铺垫：可靠旧事实必须被后果中的矛盾证据逐步动摇。'
    if (type === '动机反转') return '动机反转铺垫：高压二选一时让角色选择暴露真动机。'
    if (type === '视角反转') return '视角反转铺垫：先给片面事实，再用另一角色视角补全。'
    return `${type}铺垫：反转前必须有公平线索，反转后能解释前文。`
  })
  return uniqueBriefStrings([...typeHints, ...sceneHints, target.ending_hook ? `章末影响：${target.ending_hook}` : ''], 10)
}

export function buildReversalContract(project: any = {}, contextPackage: any = {}) {
  const explicit = reversalExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildReversalContract(project, {
      ...(contextPackage || {}),
      reversal_contract: null,
      reversalContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitReversalTypes = asArray(explicit.reversal_types || explicit.reversalTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSetupRequirements = asArray(explicit.setup_requirements || explicit.setupRequirements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSetupPlan = asArray(explicit.setup_plan || explicit.setupPlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMisdirectionMethods = asArray(explicit.misdirection_methods || explicit.misdirectionMethods).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTimingRules = asArray(explicit.timing_rules || explicit.timingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFaceSlapRhythm = asArray(explicit.face_slap_rhythm || explicit.faceSlapRhythm).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_reversal_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      reversal_types: explicitReversalTypes.length ? explicitReversalTypes : asArray(derived.reversal_types),
      setup_requirements: explicitSetupRequirements.length ? explicitSetupRequirements : asArray(derived.setup_requirements),
      setup_plan: explicitSetupPlan.length ? explicitSetupPlan : asArray(derived.setup_plan),
      misdirection_methods: explicitMisdirectionMethods.length ? explicitMisdirectionMethods : asArray(derived.misdirection_methods),
      timing_rules: explicitTimingRules.length ? explicitTimingRules : asArray(derived.timing_rules),
      face_slap_rhythm: explicitFaceSlapRhythm.length ? explicitFaceSlapRhythm : asArray(derived.face_slap_rhythm),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.information_gap,
      scene.reversal,
      scene.reader_payoff,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  const reversalTypes = inferReversalTypes(text)
  return {
    version: 'oh_story_reversal_v1',
    source: 'oh_story_embedded_fallback',
    reversal_types: reversalTypes,
    setup_requirements: OH_STORY_REVERSAL_SETUP_REQUIREMENTS,
    setup_plan: buildReversalSetupPlan(reversalTypes, sceneCards, target),
    misdirection_methods: OH_STORY_REVERSAL_MISDIRECTION_METHODS,
    timing_rules: OH_STORY_REVERSAL_TIMING_RULES,
    face_slap_rhythm: OH_STORY_REVERSAL_FACE_SLAP_RHYTHM,
    forbidden_patterns: OH_STORY_REVERSAL_FORBIDDEN,
    quality_checks: OH_STORY_REVERSAL_CHECKS,
    revision_priorities: ['补3处暗示', '补公平误导', '压缩解释独白', '展示反转影响', '强化打脸节奏'],
  }
}

