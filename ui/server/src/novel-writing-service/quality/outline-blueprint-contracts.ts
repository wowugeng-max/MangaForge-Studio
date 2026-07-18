import { asArray } from '../../routes/novel-route-utils'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import { buildMainlineDefinitionContract } from './continuity-dialogue-contracts'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

type AnyFn = (...args: any[]) => any

let buildChapterBlueprintCausalChainContract: AnyFn = (_contentOutline: any = {}, explicitValue: any = null) => explicitValue || {}
let inferBlueprintFunctionTag: AnyFn = (_scene: any = {}, index = 0, _total = 1) => `beat_${index + 1}`
let storylineUsageByType: AnyFn = (_storylineContext: any = {}, _types: any[] = []) => []

export function bindOutlineBlueprintContractDeps(deps: {
  buildChapterBlueprintCausalChainContract?: AnyFn
  inferBlueprintFunctionTag?: AnyFn
  storylineUsageByType?: AnyFn
} = {}) {
  if (deps.buildChapterBlueprintCausalChainContract) buildChapterBlueprintCausalChainContract = deps.buildChapterBlueprintCausalChainContract
  if (deps.inferBlueprintFunctionTag) inferBlueprintFunctionTag = deps.inferBlueprintFunctionTag
  if (deps.storylineUsageByType) storylineUsageByType = deps.storylineUsageByType
}

export const OH_STORY_BEAT_DENSITY_RULE = '按字数目标反推情节点数量：约 200-300 字/个情节点；下限 10 个；常规 4200 字章节 14-21 个；复杂高潮章可到 24 个；超长章硬上限 40 个。'

const OH_STORY_OUTLINE_METHOD_FIVE_STEPS = [
  '五步大纲创建法 Step1 确定高潮剧情：冲突规模最大、人物最多、情绪最强，先锁定本阶段最值得读者等待的爆点。',
  '五步大纲创建法 Step2 确定单元剧：每个单元展示不同金手指用法，相邻单元不得使用同一金手指逻辑，单元之间必须有因果关系。',
  '五步大纲创建法 Step3 八条故事线预埋：地图线、阵营线、人物线、金手指线、世界观线、矛盾线、收集线、感情线都要有提前量。',
  '五步大纲创建法 Step4 开局阶段：情节钩子 -> 迅速陷入异常状态 -> 获得/介绍金手指 -> 矛盾/欲望出现并运转金手指 -> 目标建立。',
  '五步大纲创建法 Step5 结尾设计：解决主线/支线高潮，展示影响，给奖励和下一阶段额外奖励，交代角色状态并种下下一卷/下一段钩子。',
]

const OH_STORY_OUTLINE_METHOD_STORY_LINES = [
  '地图线：每次空间/场域变化都带出新规则、新资源或新冲突。',
  '阵营线：阵营态度、利益和站队必须随事件变化，不能只当背景板。',
  '人物线：重要角色的目标、关系和状态随章节推进发生可见变化。',
  '金手指线：每个单元展示不同用法，相邻单元不得使用同一金手指逻辑。',
  '世界观线：设定通过冲突、行动和代价释放，不写背景说明书。',
  '矛盾线：本章解决一层矛盾时必须种下下一层矛盾。',
  '收集线：资源、线索、道具或资格的获得必须有代价和用途。',
  '感情线：关系变化踩在事件、选择或成长节点上，不脱离主线漂浮。',
]

const OH_STORY_OUTLINE_METHOD_OPENING_SEQUENCE = [
  '情节钩子',
  '迅速陷入异常状态',
  '获得/介绍金手指',
  '矛盾/欲望出现，主角运转金手指',
  '目标建立',
]

const OH_STORY_OUTLINE_METHOD_ENDING_RULES = [
  '结尾要解决本章主线或支线高潮，展示影响和状态变化。',
  '结尾奖励要有即时奖励，也要给下一阶段额外奖励或新门槛。',
  '章尾节奏放慢但不能总结说教，要用动作、对话、物件或信息差把读者推向下一章。',
]

const OH_STORY_OUTLINE_METHOD_EIGHT_NODES = [
  '八节点故事结构：1 开篇，建立主角处境、目标和初始不公平。',
  '八节点故事结构：2 发展，让目标、阻碍和资源开始发生因果互动。',
  '八节点故事结构：3 转折一，让局势第一次偏离原计划。',
  '八节点故事结构：4 转折二，让冲突性质升级或信息格局改变。',
  '八节点故事结构：5 高潮，释放当前阶段最大冲突和情绪。',
  '八节点故事结构：6 矛盾结果，给出胜负、代价、资源和关系变化。',
  '八节点故事结构：7 转折三，用余波或新信息把读者推向下一阶段。',
  '八节点故事结构：8 结局，收束阶段目标并种下新循环。',
]

const OH_STORY_OUTLINE_METHOD_SWEET_CYCLE = [
  '爽文五阶段小循环：稳定态/危机潜伏。',
  '爽文五阶段小循环：危机触发。',
  '爽文五阶段小循环：破局行动。',
  '爽文五阶段小循环：收益结算。',
  '爽文五阶段小循环：新平衡与预埋。',
]

const OH_STORY_OUTLINE_METHOD_EMOTION_ZIGZAG = [
  '情绪拉扯五折线：上行，建立期待和压力。',
  '情绪拉扯五折线：拐点+下行，危机加深但不让锅落在主角身上。',
  '情绪拉扯五折线：再上行，给主角行动、线索或底牌。',
  '情绪拉扯五折线：二次拐点+下行，让阻碍升级并扩大读者期待。',
  '情绪拉扯五折线：爽点爆发，复仇/回报/真相释放必须超过前面压迫强度。',
]

const OH_STORY_OUTLINE_METHOD_FIVE_DRIVES = [
  '五项驱动检查：压力来源是否升级。',
  '五项驱动检查：能力展示是否贴住当前矛盾。',
  '五项驱动检查：认知反转是否改变读者或角色判断。',
  '五项驱动检查：资源成长是否带来新用途或新门槛。',
  '五项驱动检查：悬念扩散是否种下下一章行动理由。',
]

const OH_STORY_OUTLINE_METHOD_DETAIL_RULES = [
  '细纲:正文 = 1:2.5~1:3，细纲只写目的、效果、详略和定位，不把正文句子提前写死。',
  '一个关键事件通常拆 3-5 章，每章必须标注钩子、伏笔、目的和读者效果。',
  '滚动写作不要过度细化，保留根据上一章正文和读者反馈调整的空间。',
  '详写核心卖点、关键揭露、打脸、高潮、关系变化和章尾钩子；略写过渡、赶路、时间跳转和重复说明。',
]

const OH_STORY_OUTLINE_METHOD_SIMILARITY_GUARDS = [
  '相似度检查维度：冲突类型、金手指用法、情节链段落和结尾形态。',
  '相同金手指逻辑禁止连续使用，连续单元必须换用法、换对手或换情绪收益。',
  '同一套路间隔至少 3 个不同剧情类型。',
  '时空关联:逻辑关联 >= 1:3，不能只靠换地点推进。',
  '后续情绪价值不得显著低于前一阶段，否则必须补奖励、反转或更高目标。',
]

const OH_STORY_OUTLINE_METHOD_REVERSE_RULES = [
  '爽点倒推：先定爽点 -> 再定期待点 -> 最后倒推铺垫。',
  '真相倒推：先定核心真相 -> 拆成碎片 -> 每个碎片触发行动或转折。',
  '锚点倒推：从开头和结尾同时确定世界锚、故事锚和角色锚，避免中段漂移。',
]

const OH_STORY_OUTLINE_METHOD_QUALITY_CHECKS = [
  '每章至少 1 个微回报，每 3 章解决 1 个冲突，每 7 章给 1 个大回报。',
  '每 3-5 章检查压力来源、能力展示、认知反转、资源成长和悬念扩散。',
  '同一套路间隔至少 3 个不同剧情类型。',
  '相同金手指逻辑禁止连续使用。',
  '后续情绪价值不得显著低于前一阶段。',
]

export function outlineMethodsObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function outlineMethodsArray(value: any, fallback: string[], limit = 12) {
  const rows = asArray(value)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  return uniqueBriefStrings(rows.length ? rows : fallback, limit)
}

export function inferOutlineEightNodeRole(chapterTarget: any = {}, contentOutline: any = {}) {
  const chapterNo = Number(chapterTarget.chapter_no || chapterTarget.chapterNo || 0)
  const text = compactBriefText([
    chapterTarget.title,
    chapterTarget.summary,
    chapterTarget.goal,
    chapterTarget.conflict,
    chapterTarget.ending_hook,
    contentOutline.cause,
    contentOutline.development,
    contentOutline.turn,
    contentOutline.climax,
    contentOutline.ending,
  ].filter(Boolean).join('；'))
  if (chapterNo > 0 && chapterNo <= 2) return '开篇'
  if (/高潮|爆发|最终|决战|收束|结局/.test(text)) return '高潮/结局'
  if (/转折|反转|质变|真相|暴露|倒戈/.test(text)) return '转折'
  return '发展'
}

export function buildOutlineMethodsContract(contextPackage: any = {}, options: any = {}) {
  const chapterTarget = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const blueprint = options.chapter_blueprint
    || options.chapterBlueprint
    || chapterTarget.chapter_blueprint
    || chapterTarget.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || {}
  const explicit = outlineMethodsObject(
    options.explicit
    || options.outline_methods_contract
    || options.outlineMethodsContract
    || blueprint?.outline_methods_contract
    || blueprint?.outlineMethodsContract
    || chapterTarget.outline_methods_contract
    || chapterTarget.outlineMethodsContract
    || contextPackage?.outline_methods_contract
    || contextPackage?.outlineMethodsContract
    || contextPackage?.pre_draft_brief?.outline_methods_contract
    || contextPackage?.preDraftBrief?.outlineMethodsContract,
  )
  const fiveStep = outlineMethodsObject(explicit.five_step_outline || explicit.fiveStepOutline)
  const eightNode = outlineMethodsObject(explicit.eight_node_story_structure || explicit.eightNodeStoryStructure)
  const contentOutline = options.content_outline || options.contentOutline || blueprint?.content_outline || blueprint?.contentOutline || {}
  return {
    version: explicit.version || 'oh_story_outline_methods_v1',
    source: explicit.source || 'oh_story_outline_methods',
    method_route: outlineMethodsArray(explicit.method_route || explicit.methodRoute, [
      '章级规划以细纲与章纲为主，向上承接五步大纲创建法，向下约束场景卡和正文。',
      '已有框架细化时用节点设计法 + 三层结构法，先锁大纲，再拆剧情纲，最后落细节纲。',
      '卡住时用推演与逆推方法，从爽点、真相或锚点倒推铺垫。',
    ], 8),
    five_step_outline: {
      steps: outlineMethodsArray(fiveStep.steps || fiveStep.method_steps || fiveStep.methodSteps, OH_STORY_OUTLINE_METHOD_FIVE_STEPS, 8),
      story_lines: outlineMethodsArray(fiveStep.story_lines || fiveStep.storyLines, OH_STORY_OUTLINE_METHOD_STORY_LINES, 10),
      opening_sequence: outlineMethodsArray(fiveStep.opening_sequence || fiveStep.openingSequence, OH_STORY_OUTLINE_METHOD_OPENING_SEQUENCE, 8),
      ending_rules: outlineMethodsArray(fiveStep.ending_rules || fiveStep.endingRules, OH_STORY_OUTLINE_METHOD_ENDING_RULES, 8),
    },
    eight_node_story_structure: {
      selected_node: compactBriefText(eightNode.selected_node || eightNode.selectedNode || inferOutlineEightNodeRole(chapterTarget, contentOutline)),
      nodes: outlineMethodsArray(eightNode.nodes || eightNode.node_sequence || eightNode.nodeSequence, OH_STORY_OUTLINE_METHOD_EIGHT_NODES, 10),
      payoff_rhythm: outlineMethodsArray(eightNode.payoff_rhythm || eightNode.payoffRhythm, [
        '至少每章 1 个微回报。',
        '每 3 章解决 1 个冲突。',
        '每 7 章给 1 个大回报。',
      ], 8),
    },
    sweet_cycle_stages: outlineMethodsArray(explicit.sweet_cycle_stages || explicit.sweetCycleStages, OH_STORY_OUTLINE_METHOD_SWEET_CYCLE, 8),
    emotion_zigzag_stages: outlineMethodsArray(explicit.emotion_zigzag_stages || explicit.emotionZigzagStages, OH_STORY_OUTLINE_METHOD_EMOTION_ZIGZAG, 8),
    five_drive_checks: outlineMethodsArray(explicit.five_drive_checks || explicit.fiveDriveChecks, OH_STORY_OUTLINE_METHOD_FIVE_DRIVES, 8),
    detail_outline_rules: outlineMethodsArray(explicit.detail_outline_rules || explicit.detailOutlineRules, OH_STORY_OUTLINE_METHOD_DETAIL_RULES, 8),
    similarity_guardrails: outlineMethodsArray(explicit.similarity_guardrails || explicit.similarityGuardrails, OH_STORY_OUTLINE_METHOD_SIMILARITY_GUARDS, 10),
    reverse_design_rules: outlineMethodsArray(explicit.reverse_design_rules || explicit.reverseDesignRules, OH_STORY_OUTLINE_METHOD_REVERSE_RULES, 8),
    quality_checks: outlineMethodsArray(explicit.quality_checks || explicit.qualityChecks, OH_STORY_OUTLINE_METHOD_QUALITY_CHECKS, 10),
  }
}

export function buildChapterBlueprintBeatDensityContract(wordTarget: any, beatSequence: any[], explicitValue: any = null) {
  const explicit = explicitValue && typeof explicitValue === 'object' && !Array.isArray(explicitValue) ? explicitValue : {}
  const targetWords = Number(
    explicit.target_word_count
    || explicit.targetWordCount
    || wordTarget?.target
    || wordTarget?.target_word_count
    || wordTarget?.targetWordCount
    || 0,
  )
  if (!targetWords && !Object.keys(explicit).length) return null

  const hardMax = Number(explicit.hard_max_beat_count || explicit.hardMaxBeatCount || 40) || 40
  const lowerBound = Number(explicit.lower_bound_beat_count || explicit.lowerBoundBeatCount || 10) || 10
  const minBeatCount = Number(explicit.min_beat_count || explicit.minBeatCount)
    || Math.min(hardMax, Math.max(lowerBound, Math.ceil(targetWords / 300)))
  const targetBeatCount = Number(explicit.target_beat_count || explicit.targetBeatCount)
    || Math.min(hardMax, Math.max(minBeatCount, Math.ceil(targetWords / 250)))
  const maxBeatCount = Number(explicit.max_beat_count || explicit.maxBeatCount)
    || Math.min(hardMax, Math.max(targetBeatCount, Math.ceil(targetWords / 200)))
  const currentBeatCount = asArray(beatSequence).length

  return {
    version: explicit.version || 'oh_story_beat_density_v1',
    source: explicit.source || 'oh_story_chapter_blueprint_density',
    target_word_count: targetWords,
    lower_bound_beat_count: lowerBound,
    min_beat_count: minBeatCount,
    target_beat_count: targetBeatCount,
    max_beat_count: maxBeatCount,
    hard_max_beat_count: hardMax,
    current_beat_count: currentBeatCount,
    density_gap: Math.max(0, minBeatCount - currentBeatCount),
    rule: compactBriefText(explicit.rule || OH_STORY_BEAT_DENSITY_RULE, 320),
    execution_rules: uniqueBriefStrings([
      ...asArray(explicit.execution_rules || explicit.executionRules),
      '每个情节点必须写清“谁做了什么 + 功能标签”，例如铺垫/高潮/爽点/打脸/人物塑造/设定。',
      '情节点不足时先拆动作过程、对话交锋、信息变化、选择代价、收益兑现和章尾钩子铺垫，不得用环境描写或重复心理凑字数。',
      '过场点可以带过，卖点/回报点必须展开；不得所有情节点均匀用同样篇幅。',
    ], 8),
  }
}

export function normalizeChapterBlueprintSmallOutlineContract(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const segmentCards = asArray(value.segment_cards || value.segmentCards)
    .map((item: any, index: number) => {
      const segment = compactBriefText(item?.segment || item?.title || item?.name || item?.scene || item?.summary)
      const purpose = compactBriefText(item?.purpose || item?.goal || item?.intent)
      const intendedEffect = compactBriefText(item?.intended_effect || item?.intendedEffect || item?.effect || item?.reader_effect || item?.readerEffect)
      const detailLevel = compactBriefText(item?.detail_level || item?.detailLevel || item?.detail || item?.allocation)
      const quickLocator = compactBriefText(item?.quick_locator || item?.quickLocator || item?.locator || item?.anchor)
      if (!segment && !purpose && !intendedEffect && !quickLocator) return null
      return {
        segment_no: Number(item?.segment_no || item?.segmentNo || index + 1),
        segment,
        purpose,
        intended_effect: intendedEffect,
        detail_level: /略|压缩|带过|compress|skip/i.test(detailLevel) ? 'compress' : 'expand',
        quick_locator: quickLocator,
      }
    })
    .filter(Boolean)
  if (!segmentCards.length && !asArray(value.steps || value.method_steps || value.methodSteps).length) return null
  return {
    version: value.version || 'oh_story_small_outline_four_step_v1',
    source: value.source || 'oh_story_plot_core_methods_small_outline',
    steps: uniqueBriefStrings([
      ...asArray(value.steps || value.method_steps || value.methodSteps),
      '分段判断：把大纲按剧情节点分段。',
      '标注目的和效果：每段只写目的与读者效果，不展开情节。',
      '标注详写/略写：卖点、转折、打脸、高潮展开；过渡、赶路、信息交代带过。',
      '快速定位：每段必须有正文可定位的动作、对话、信息变化或章尾钩子。',
    ], 8),
    purpose_effect_rules: uniqueBriefStrings([
      ...asArray(value.purpose_effect_rules || value.purposeEffectRules),
      '细纲只关注目的和效果，不展开情节；正文生成时再把目的写成动作、对话和信息变化。',
      '每段都必须能回答：这一段服务什么目的，读者得到什么效果。',
      '没有目的或效果的段落要删掉、合并，或改成服务主线的信息团。',
    ], 8),
    detail_rules: uniqueBriefStrings([
      ...asArray(value.detail_rules || value.detailRules),
      '详写：核心卖点、关键揭露、打脸、高潮、强冲突、关系变化和章尾钩子。',
      '略写：过渡、赶路、时间跳转、重复说明和只承担连接功能的信息交代。',
      '详略按目的词分配，不能所有段落平均用力。',
    ], 8),
    locator_rules: uniqueBriefStrings([
      ...asArray(value.locator_rules || value.locatorRules),
      '每段必须有 quick_locator，后续写作和修订能快速定位本段要交付的目的和效果。',
      'quick_locator 必须落成正文可见证据，不能只写在任务书或回执里。',
    ], 8),
    segment_cards: segmentCards,
  }
}

export function inferSmallOutlineDetailLevel(scene: any, index: number, total: number) {
  const text = compactBriefText([
    scene?.title,
    scene?.purpose,
    scene?.reader_payoff,
    scene?.reversal,
    scene?.turning_point,
    scene?.function_tag,
  ].filter(Boolean).join('；'))
  if (/过渡|转场|赶路|信息交代|回廊|时间跳转|铺陈/.test(text)) return 'compress'
  if (/爽点|打脸|高潮|关键|揭露|反转|回报|冲突|压迫|证明|反证|钩子/.test(text)) return 'expand'
  if (index === 0 || index === total - 1) return 'expand'
  return 'compress'
}

export function smallOutlineScenePurpose(scene: any, chapterTarget: any) {
  return compactBriefText(
    scene?.purpose
    || scene?.goal
    || scene?.beat
    || scene?.summary
    || chapterTarget?.summary
    || chapterTarget?.goal,
  )
}

export function smallOutlineSceneEffect(scene: any) {
  return compactBriefText(
    scene?.reader_payoff
    || scene?.payoff
    || scene?.reversal
    || scene?.ending_hook_seed
    || scene?.endingHookSeed
    || scene?.exit_state
    || scene?.exitState,
  )
}

export function buildChapterBlueprintSmallOutlineContract(chapterTarget: any, sceneCards: any[], contentOutline: any, explicitValue: any = null) {
  const explicit = normalizeChapterBlueprintSmallOutlineContract(explicitValue)
  if (explicit) return explicit
  const sourceScenes = asArray(sceneCards).filter((item: any) => item && typeof item === 'object')
  const segmentCards = sourceScenes.length
    ? sourceScenes.map((scene: any, index: number) => ({
        segment_no: Number(scene.scene_no || scene.sceneNo || index + 1),
        segment: compactBriefText(scene.title || `场景${index + 1}`),
        purpose: smallOutlineScenePurpose(scene, chapterTarget),
        intended_effect: smallOutlineSceneEffect(scene),
        detail_level: inferSmallOutlineDetailLevel(scene, index, sourceScenes.length),
        quick_locator: compactBriefText([
          scene.title,
          scene.opening_hook,
          asArray(scene.required_beats)[0],
          asArray(scene.action_beats)[0],
          scene.ending_hook_seed,
        ].filter(Boolean).join('：')),
      }))
    : [
        ['cause', '开局分段'],
        ['development', '发展分段'],
        ['turn', '转折分段'],
        ['climax', '高潮分段'],
        ['ending', '章尾分段'],
      ].map(([key, label], index) => {
        const text = compactBriefText(contentOutline?.[key])
        return text ? {
          segment_no: index + 1,
          segment: label,
          purpose: text,
          intended_effect: key === 'ending' ? '留下下一步期待。' : '推进本章目的和读者效果。',
          detail_level: ['turn', 'climax'].includes(key) ? 'expand' : key === 'development' ? 'compress' : 'expand',
          quick_locator: text,
        } : null
      }).filter(Boolean)
  if (!segmentCards.length) return null
  return {
    version: 'oh_story_small_outline_four_step_v1',
    source: 'oh_story_plot_core_methods_small_outline',
    steps: [
      '分段判断：把大纲按剧情节点分段。',
      '标注目的和效果：每段只写目的与读者效果，不展开情节。',
      '标注详写/略写：卖点、转折、打脸、高潮展开；过渡、赶路、信息交代带过。',
      '快速定位：每段必须有正文可定位的动作、对话、信息变化或章尾钩子。',
    ],
    purpose_effect_rules: [
      '细纲只关注目的和效果，不展开情节；正文生成时再把目的写成动作、对话和信息变化。',
      '每段都必须能回答：这一段服务什么目的，读者得到什么效果。',
      '没有目的或效果的段落要删掉、合并，或改成服务主线的信息团。',
    ],
    detail_rules: [
      '详写：核心卖点、关键揭露、打脸、高潮、强冲突、关系变化和章尾钩子。',
      '略写：过渡、赶路、时间跳转、重复说明和只承担连接功能的信息交代。',
      '详略按目的词分配，不能所有段落平均用力。',
    ],
    locator_rules: [
      '每段必须有 quick_locator，后续写作和修订能快速定位本段要交付的目的和效果。',
      'quick_locator 必须落成正文可见证据，不能只写在任务书或回执里。',
    ],
    segment_cards: segmentCards,
  }
}

export function buildChapterBlueprintFromContext(contextPackage: any, options: any = {}) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const explicitBlueprint = chapterTarget.chapter_blueprint
    || chapterTarget.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || {}
  const explicitContentOutline = explicitBlueprint.content_outline || explicitBlueprint.contentOutline || {}
  const explicitCausalChainContract = explicitBlueprint.causal_chain_contract || explicitBlueprint.causalChainContract
  const explicitPlotLines = explicitBlueprint.plot_lines || explicitBlueprint.plotLines || {}
  const explicitEndingContract = explicitBlueprint.ending_contract || explicitBlueprint.endingContract || {}
  const explicitBeatDensityContract = explicitBlueprint.beat_density_contract || explicitBlueprint.beatDensityContract
  const explicitSmallOutlineContract = explicitBlueprint.small_outline_contract || explicitBlueprint.smallOutlineContract
  const explicitMainlineDefinitionContract = explicitBlueprint.mainline_definition_contract || explicitBlueprint.mainlineDefinitionContract
  const explicitOutlineMethodsContract = explicitBlueprint.outline_methods_contract || explicitBlueprint.outlineMethodsContract
  const wordTarget = options.word_target
    || options.wordTarget
    || explicitBlueprint.word_target
    || explicitBlueprint.wordTarget
    || chapterTarget.word_target
    || chapterTarget.wordTarget
  const sceneCards = asArray(chapterTarget.scene_cards || options.scene_cards || options.sceneCards)
  const sceneBriefs = asArray(options.scene_briefs || options.sceneBriefs).length
    ? asArray(options.scene_briefs || options.sceneBriefs)
    : sceneCards.map(sceneBriefFromCard)
  const firstScene = sceneCards[0] || sceneBriefs[0] || {}
  const middleScene = sceneCards.length > 2 ? sceneCards[Math.floor(sceneCards.length / 2)] : sceneCards[1] || sceneBriefs[1] || firstScene
  const lastScene = sceneCards[sceneCards.length - 1] || sceneBriefs[sceneBriefs.length - 1] || firstScene
  const storyDrive = options.story_drive_brief || contextPackage?.chapter_target?.story_drive_brief || contextPackage?.story_drive_brief || {}
  const pageTurn = options.page_turn_hook_brief || contextPackage?.chapter_target?.page_turn_hook_brief || contextPackage?.page_turn_hook_brief || {}
  const serialRhythm = options.serial_rhythm_brief || contextPackage?.chapter_target?.serial_rhythm_brief || contextPackage?.serial_rhythm_brief || {}
  const characterArc = options.character_arc_brief || contextPackage?.chapter_target?.character_arc_brief || contextPackage?.character_arc_context || {}
  const storylineContext = contextPackage?.storyline_context || {}
  const characterOrder = uniqueBriefStrings([
    ...asArray(explicitBlueprint.character_order || explicitBlueprint.characterOrder),
    ...sceneCards.flatMap((scene: any) => [
      ...asArray(scene.characters_present),
      ...asArray(scene.characters),
    ]),
  ], 12)
  const scenePurposes = sceneCards.map((scene: any) => compactBriefText(scene.purpose || scene.beat || scene.title)).filter(Boolean)
  const sceneConflicts = sceneCards.map((scene: any) => compactBriefText(scene.conflict)).filter(Boolean)
  const readerPayoffs = sceneCards.map((scene: any) => compactBriefText(scene.reader_payoff)).filter(Boolean)
  const reversals = sceneCards.map((scene: any) => compactBriefText(scene.reversal || scene.turning_point)).filter(Boolean)
  const endingHook = compactBriefText(chapterTarget.ending_hook || pageTurn.next_chapter_pull || pageTurn.core_question || lastScene.ending_hook_seed)
  const fallbackBeatSequence = sceneCards.map((scene: any, index: number) => {
    const action = compactBriefText([
      scene.purpose || scene.beat || scene.title,
      asArray(scene.required_beats).join('；'),
      asArray(scene.action_beats).join('；'),
    ].filter(Boolean).join('；'))
    return {
      beat_no: index + 1,
      scene_no: Number(scene.scene_no || index + 1),
      title: compactBriefText(scene.title || `场景${index + 1}`),
      action,
      function_tag: inferBlueprintFunctionTag(scene, index, sceneCards.length),
      payoff: compactBriefText(scene.reader_payoff || scene.reversal || scene.ending_hook_seed),
    }
  })
  const explicitBeatSequence = asArray(explicitBlueprint.beat_sequence || explicitBlueprint.beatSequence)
  const beatSequence = explicitBeatSequence.length ? explicitBeatSequence : fallbackBeatSequence
  const beatDensityContract = buildChapterBlueprintBeatDensityContract(wordTarget, beatSequence, explicitBeatDensityContract)
  const storylineAdvances = uniqueBriefStrings([
    ...asArray(storylineContext.required),
    ...storylineUsageByType(storylineContext, ['advance']).map((item: any) => item?.name || item?.summary || item),
  ], 8)
  const storylinePayoffs = uniqueBriefStrings([
    ...storylineUsageByType(storylineContext, ['payoff']).map((item: any) => item?.name || item?.summary || item),
  ], 8)
  const cause = compactBriefText([
    firstScene.title,
    firstScene.purpose || chapterTarget.summary || chapterTarget.goal,
  ].filter(Boolean).join('：'))
  const development = compactBriefText(sceneConflicts.join('；') || middleScene.conflict || chapterTarget.conflict)
  const turn = compactBriefText(reversals.join('；') || middleScene.reversal || middleScene.turning_point || storyDrive.protagonist_choice)
  const climax = compactBriefText(lastScene.reader_payoff || lastScene.reversal || readerPayoffs.slice(-1)[0] || chapterTarget.conflict)
  const ending = compactBriefText(endingHook || lastScene.ending_hook_seed)
  const contentOutline = {
    cause: compactBriefText(explicitContentOutline.cause || cause),
    development: compactBriefText(explicitContentOutline.development || development),
    turn: compactBriefText(explicitContentOutline.turn || turn),
    climax: compactBriefText(explicitContentOutline.climax || climax),
    ending: compactBriefText(explicitContentOutline.ending || ending),
  }
  const resolvedPlotLines = {
    mainline: compactBriefText(explicitPlotLines.mainline || explicitPlotLines.main_line || explicitPlotLines.mainLine || chapterTarget.summary || chapterTarget.goal),
    subplot: compactBriefText(explicitPlotLines.subplot || storylineAdvances.join('；')),
    event_line: compactBriefText(explicitPlotLines.event_line || explicitPlotLines.eventLine || scenePurposes.join(' -> ')),
    relationship_line: compactBriefText(explicitPlotLines.relationship_line || explicitPlotLines.relationshipLine || characterArc.relationship_change || characterArc.growth_node || characterArc.arc_hint || ''),
    logic_line: compactBriefText(explicitPlotLines.logic_line || explicitPlotLines.logicLine || [
      storyDrive.obstacle || development,
      storyDrive.protagonist_choice || turn,
      storyDrive.state_change || climax,
      storyDrive.causal_next_step || ending,
    ].filter(Boolean).join(' -> ')),
  }
  const smallOutlineContract = buildChapterBlueprintSmallOutlineContract(chapterTarget, sceneCards, contentOutline, explicitSmallOutlineContract)
  const mainlineDefinitionContract = buildMainlineDefinitionContract({}, {
    ...contextPackage,
    chapter_target: {
      ...chapterTarget,
      chapter_blueprint: {
        ...explicitBlueprint,
        content_outline: contentOutline,
        plot_lines: resolvedPlotLines,
      },
    },
    chapter_blueprint: {
      ...explicitBlueprint,
      content_outline: contentOutline,
      plot_lines: resolvedPlotLines,
    },
  }, explicitMainlineDefinitionContract)
  const writingIntent = compactBriefText([
    chapterTarget.title ? `第${chapterTarget.chapter_no || '?'}章《${chapterTarget.title}》` : '',
    chapterTarget.summary || chapterTarget.goal,
    storyDrive.protagonist_choice ? `主角选择：${storyDrive.protagonist_choice}` : '',
    endingHook ? `章尾钩子：${endingHook}` : '',
  ].filter(Boolean).join('；'))
  const outlineMethodsContract = buildOutlineMethodsContract({
    ...contextPackage,
    chapter_target: {
      ...chapterTarget,
      chapter_blueprint: {
        ...explicitBlueprint,
        content_outline: contentOutline,
        plot_lines: resolvedPlotLines,
      },
    },
    chapter_blueprint: {
      ...explicitBlueprint,
      content_outline: contentOutline,
      plot_lines: resolvedPlotLines,
    },
  }, {
    explicit: explicitOutlineMethodsContract,
    content_outline: contentOutline,
    scene_cards: sceneCards,
  })

  return {
    version: 'oh_story_chapter_blueprint_v1',
    source: 'mangaforge_pre_draft_brief',
    platform_rubric: options.platform_rubric || null,
    content_rubric: options.content_rubric || null,
    dialogue_contract: options.dialogue_contract || null,
    plot_dynamics_contract: options.plot_dynamics_contract || null,
    continuity_heat_contract: options.continuity_heat_contract || null,
    character_relation_contract: options.character_relation_contract || null,
    character_behavior_contract: options.character_behavior_contract || null,
    asset_linkage_contract: options.asset_linkage_contract || null,
    state_tracking_contract: options.state_tracking_contract || null,
    intent_confirmation_contract: options.intent_confirmation_contract || null,
    information_flow_contract: options.information_flow_contract || null,
    expectation_threshold_contract: options.expectation_threshold_contract || null,
    target_reader_contract: options.target_reader_contract || null,
    genre_positioning_contract: options.genre_positioning_contract || null,
    female_audience_contract: options.female_audience_contract || null,
    upgrade_rhythm_contract: options.upgrade_rhythm_contract || null,
    conflict_structure_contract: options.conflict_structure_contract || null,
    story_loop_contract: options.story_loop_contract || null,
    emotional_arc_contract: options.emotional_arc_contract || null,
    chapter_hook_contract: options.chapter_hook_contract || null,
    paragraph_hook_contract: options.paragraph_hook_contract || null,
    suspense_contract: options.suspense_contract || null,
    reversal_contract: options.reversal_contract || null,
    showdown_contract: options.showdown_contract || null,
    bridge_unit_contract: options.bridge_unit_contract || null,
    style_boundary_contract: options.style_boundary_contract || null,
    opening_contract: options.opening_contract || null,
    prose_craft_contract: options.prose_craft_contract || null,
    punctuation_tone_contract: options.punctuation_tone_contract || null,
    quality_audit_contract: options.quality_audit_contract || null,
    target_emotion: compactBriefText(
      explicitBlueprint.target_emotion
      || explicitBlueprint.targetEmotion
      || options.emotional_curve
      || chapterTarget.target_emotion
      || chapterTarget.emotional_curve
      || sceneCards.map((scene: any) => scene.emotional_tone).filter(Boolean).join(' -> '),
    ),
    opening_hook: compactBriefText(explicitBlueprint.opening_hook || explicitBlueprint.openingHook || firstScene.opening_hook || serialRhythm.opening_hook_deadline || chapterTarget.opening_hook),
    core_payoff: compactBriefText(explicitBlueprint.core_payoff || explicitBlueprint.corePayoff || readerPayoffs.join('；') || options.reader_promise || chapterTarget.reader_promise),
    content_outline: contentOutline,
    causal_chain_contract: buildChapterBlueprintCausalChainContract(contentOutline, explicitCausalChainContract),
    plot_lines: resolvedPlotLines,
    character_order: characterOrder,
    relationship_change: compactBriefText(characterArc.relationship_change || characterArc.growth_node || ''),
    information_gap: compactBriefText(sceneCards.map((scene: any) => scene.information_gap).filter(Boolean).join('；') || pageTurn.core_question),
    beat_sequence: beatSequence,
    beat_density_contract: beatDensityContract,
    small_outline_contract: smallOutlineContract,
    mainline_definition_contract: mainlineDefinitionContract,
    cost_and_reward: compactBriefText(explicitBlueprint.cost_and_reward || explicitBlueprint.costAndReward || [
      storyDrive.choice_cost ? `代价：${storyDrive.choice_cost}` : '',
      readerPayoffs.length ? `收益：${readerPayoffs.join('；')}` : '',
      storylinePayoffs.length ? `回收：${storylinePayoffs.join('；')}` : '',
      asArray(lastScene.state_changes_expected).length ? `状态变化：${asArray(lastScene.state_changes_expected).join('；')}` : '',
    ].filter(Boolean).join('；')),
    ending_contract: {
      final_state: compactBriefText(explicitEndingContract.final_state || explicitEndingContract.finalState || lastScene.exit_state || ending),
      unresolved_question: compactBriefText(explicitEndingContract.unresolved_question || explicitEndingContract.unresolvedQuestion || pageTurn.core_question || lastScene.information_gap || endingHook),
      next_chapter_pull: compactBriefText(explicitEndingContract.next_chapter_pull || explicitEndingContract.nextChapterPull || endingHook),
      forbidden_resolution: asArray(explicitEndingContract.forbidden_resolution || explicitEndingContract.forbiddenResolution).length
        ? asArray(explicitEndingContract.forbidden_resolution || explicitEndingContract.forbiddenResolution)
        : asArray(pageTurn.forbidden_resolution),
    },
    writing_intent: compactBriefText(explicitBlueprint.writing_intent || explicitBlueprint.writingIntent || writingIntent),
    outline_methods_contract: outlineMethodsContract,
  }
}
