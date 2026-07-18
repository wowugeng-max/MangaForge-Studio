import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { inferEndingHookType } from '../batch-serial/ending-hook-type'

type AnyFn = (...args: any[]) => any

let nextBatchBriefFromContext: AnyFn = (_contextPackage: any = {}) => null
let normalizeSuspenseExpectationChainContract: AnyFn = (value: any = {}) => value || {}

export function buildParagraphHookContract(project: any = {}, contextPackage: any = {}) {
  const explicit = paragraphHookExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildParagraphHookContract(project, {
      ...(contextPackage || {}),
      paragraph_hook_contract: null,
      paragraphHookContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitMicroHookTypes = asArray(explicit.micro_hook_types || explicit.microHookTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitHookCombinations = asArray(explicit.hook_combinations || explicit.hookCombinations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueEscalation = asArray(explicit.dialogue_escalation || explicit.dialogueEscalation).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSpectatorLayers = asArray(explicit.spectator_layers || explicit.spectatorLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitUnfairInjuryHooks = asArray(explicit.unfair_injury_hooks || explicit.unfairInjuryHooks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_paragraph_hook_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      micro_hook_types: explicitMicroHookTypes.length ? explicitMicroHookTypes : asArray(derived.micro_hook_types),
      hook_combinations: explicitHookCombinations.length ? explicitHookCombinations : asArray(derived.hook_combinations),
      dialogue_escalation: explicitDialogueEscalation.length ? explicitDialogueEscalation : asArray(derived.dialogue_escalation),
      spectator_layers: explicitSpectatorLayers.length ? explicitSpectatorLayers : asArray(derived.spectator_layers),
      unfair_injury_hooks: explicitUnfairInjuryHooks.length ? explicitUnfairInjuryHooks : asArray(derived.unfair_injury_hooks),
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
      scene.key_dialogue,
      scene.ending_hook_seed,
      ...asArray(scene.characters_present),
    ]),
  ].filter(Boolean).join(' ')
  const microHookTypes = inferParagraphHookTypes(text)
  return {
    version: 'oh_story_paragraph_hook_v1',
    source: 'oh_story_embedded_fallback',
    micro_hook_types: microHookTypes,
    hook_combinations: inferHookCombinations(microHookTypes, text),
    dialogue_escalation: OH_STORY_DIALOGUE_ESCALATION,
    spectator_layers: OH_STORY_SPECTATOR_LAYERS,
    unfair_injury_hooks: OH_STORY_UNFAIR_INJURY_HOOKS,
    forbidden_patterns: OH_STORY_PARAGRAPH_HOOK_FORBIDDEN,
    quality_checks: OH_STORY_PARAGRAPH_HOOK_CHECKS,
    revision_priorities: ['补段落级钩子', '补钩子组合', '补对话情绪递进', '补围观者分层反应', '修假悬念/低风险钩'],
  }
}

const OH_STORY_SUSPENSE_INFORMATION_TEMPLATES = [
  '直白剧情：提出疑问 -> 公布答案。',
  '探索剧情：提出疑问 -> 正常提示 -> 公布答案。',
  '意外剧情：提出疑问 -> 虚假提示 -> 公布答案。',
  '意外+反转：提出疑问 -> 虚假提示1 -> 虚假对立提示2 -> 公布答案。',
]

const OH_STORY_SUSPENSE_STRENGTH_LEVELS = [
  '1 微悬念：好奇，过渡章至少达到。',
  '2 小悬念：想看下一段，正文章至少达到。',
  '3 中悬念：想看下一章，关键章至少达到。',
  '4 大悬念：放不下书，爆发章使用。',
  '5 极悬念：睡不着，卷末高潮使用。',
]

const OH_STORY_SUSPENSE_TRIGGER_LAYERS = [
  '第1层：展示初步成果 -> 观众初步反应。',
  '第2层：揭示这还不是最终结果 -> 观众期待升级。',
  '第3层：展示超出预期的元素 -> 观众震惊。',
  '第4层：主角还能进一步提升 -> 留下钩子，开启下一段。',
]

const OH_STORY_SUSPENSE_EXPECTATION_LAYERS = [
  '两长一短：短期下章期待、中期本卷期待、远期全书期待必须同时至少保留两条。',
  '期待接力：长期待回收前先铺好下一层期待，短期期待爆发后立刻生成新问题。',
  '不间断钩子链：主角得到答案、资源或爽点之前，必须套上另一个更具体的钩子。',
]

const OH_STORY_SUSPENSE_MULTI_LINE_RULES = [
  '多线悬念：短弧2-3章，中弧5-8章，长弧贯穿整卷。',
  '任何时刻至少两条悬念线运行，不能在当前谜题兑现后清空期待。',
  '短弧给下章翻页，中弧给剧情单元牵引，长弧给卷目标或主线谜团持续存在感。',
]

const OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES = [
  '读者预知法：提前告诉读者将发生大事件，让读者知道但主角不知道。',
  '倒计时变体：每隔1-2章放一小段进展，让读者持续等主角撞上真相。',
  '预知信息必须转化为压力、误判或行动选择，不能只做旁白剧透。',
]

const OH_STORY_SUSPENSE_INFORMATION_GAP_RULES = [
  '信息差运用：读者知道主角获得强力物品或底牌，但配角/反派不知道。',
  '反派恰好被主角底牌或规则理解克制，读者提前知道克制关系。',
  '别人拿更好装备却失败，主角用信息差或规则理解反杀。',
  '信息差抹平时 = 爽点爆发，必须让角色反应和局势变化同时兑现。',
]

const OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES = [
  '底牌前置法：先展示主角底牌，再安排找事冲突。',
  '必须同时准备两对信息组合：底牌 + 即将发生的冲突。',
  '底牌展示不能直接剧透结果，要让读者知道有反制可能，但还想看怎样兑现。',
]

const OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES = [
  '谜语人是故意不说明，伏笔是巧妙融入剧情、自然不刻意。',
  '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
  '短期紧张用悬念，长期线索用伏笔，两者不能混淆。',
  '伏笔要藏进动作、物件、误判、环境回声或角色习惯里，后续揭示时让读者觉得原来如此。',
]

const OH_STORY_SUSPENSE_SHOCK_LAYERS = [
  '点震惊：单个角色出现即时反应。',
  '网震惊：关系网多人、多立场反应，证明事件影响面。',
  '深度震惊：成就1震惊 -> 成就2震惊 -> 更强成就3引爆，并伴随道具、环境或权力结构变化。',
  '高位者震惊：权威/高阶角色反应拉高读者对主角后续的期待。',
]

const OH_STORY_SUSPENSE_FORBIDDEN = [
  '悬念和伏笔不能混淆：短期紧张是悬念，长期线索才是伏笔。',
  '虚假提示必须可信，不能为了反转而硬骗读者。',
  '每个悬念点必须有角色反应验证力度，没有反应等于落空。',
  '下行只制造小波折，不能让主角真憋屈到读者弃读。',
  '解决一个麻烦后必须引出新困境，不能让麻烦消失。',
]

const OH_STORY_SUSPENSE_CHECKS = [
  '悬念等级必须达标：过渡章至少微悬念，正文章至少小悬念，关键章至少中悬念，爆发章至少大悬念。',
  '四种悬念信息顺序模板必须清晰，疑问、提示、虚假提示、答案不能乱序或缺失。',
  '期待链不能断裂：章末至少保留一个未解问题或未达成期待，并维持短/中/远至少两条期待线。',
  '三段钩子要完成种、养、收：前30%埋种，中50%加压，末20%引爆或延迟引爆。',
  '伏笔不是谜语人：长期线索要自然融入并持续推进，信息延迟超过3章且中间无推进时必须提前给或删除。',
  '触发型分层钩子必须有角色反应验证力度，不能只靠旁白说紧张。',
  '震惊分层必须从点、网、深度或高位者反应中选择合适层级，并用可视化变化支撑。',
  '信息差必须存在且有兑现路径，读者/角色/反派之间的信息差抹平时要形成爽点释放。',
  '读者预知法必须给出“读者知道但主角不知道”的压力，并在1-2章内推进倒计时或后果。',
  '底牌前置法必须同时交代底牌 + 即将发生的冲突，让读者期待底牌如何兑现。',
  '多线悬念必须保持短弧、中弧、长弧至少两条同时运行。',
  '麻烦不能消失：每次解决后必须留下新困境、新问题或更高层期待。',
]

function suspenseExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.suspense_contract
    || contextPackage?.chapter_target?.suspenseContract
    || contextPackage?.suspense_contract
    || contextPackage?.suspenseContract
    || contextPackage?.pre_draft_brief?.suspense_contract
    || contextPackage?.preDraftBrief?.suspenseContract
}

function inferSuspenseInformationTemplates(text: string) {
  const hits: string[] = []
  if (/假提示|虚假|误导|以为|伪装/.test(text)) hits.push('意外剧情')
  if (/反转|对立提示|却|原来|背面|第二行/.test(text)) hits.push('意外+反转')
  if (/线索|追查|提示|探索|调查|缺页/.test(text)) hits.push('探索剧情')
  if (/疑问|问题|答案|公布|揭示|发现/.test(text)) hits.push('直白剧情')
  return uniqueBriefStrings(hits.length ? hits : ['探索剧情'], 4)
}

function inferSuspenseStrength(chapterNo: number, text: string) {
  if (/卷末|决战|终极|大反转|睡不着/.test(text)) return '5 极悬念'
  if (/爆发|高潮|大危机/.test(text)) return '4 大悬念'
  if (chapterNo <= 3 || /关键|缺页|规则|身份|反转|谜题|真相|零点|倒计时/.test(text)) return '3 中悬念'
  if (/过渡|日常|赶路/.test(text)) return '1 微悬念'
  return '2 小悬念'
}

function buildSuspenseCycle(sceneCards: any[], target: any) {
  const first = sceneCards[0] || {}
  const middle = sceneCards.length > 2 ? sceneCards[Math.floor(sceneCards.length / 2)] : sceneCards[1] || first
  const last = sceneCards[sceneCards.length - 1] || middle || first
  return [
    `种：${compactBriefText(first.information_gap || first.opening_hook || first.purpose || target.summary, '前30%提出读者要追的问题')}`,
    `养：${compactBriefText(middle.reversal || middle.conflict || middle.reader_payoff || target.conflict, '中50%用提示/误导/加压让读者意识到不对劲')}`,
    `收：${compactBriefText(last.ending_hook_seed || target.ending_hook || last.reversal, '末20%引爆或延迟引爆到下一章')}`,
  ]
}

export function buildSuspenseContract(project: any = {}, contextPackage: any = {}) {
  const explicit = suspenseExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildSuspenseContract(project, {
      ...(contextPackage || {}),
      suspense_contract: null,
      suspenseContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitInformationOrderTemplates = asArray(explicit.information_order_templates || explicit.informationOrderTemplates).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSuspenseCycle = asArray(explicit.suspense_cycle || explicit.suspenseCycle).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTriggerLayers = asArray(explicit.trigger_layers || explicit.triggerLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationLayers = asArray(explicit.expectation_layers || explicit.expectationLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationChain = normalizeSuspenseExpectationChainContract(explicit.expectation_chain || explicit.expectationChain)
    const explicitMultiLineSuspenseRules = asArray(explicit.multi_line_suspense_rules || explicit.multiLineSuspenseRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReaderPreknowledgeRules = asArray(explicit.reader_preknowledge_rules || explicit.readerPreknowledgeRules || explicit.reader_precognition_rules || explicit.readerPrecognitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationGapRules = asArray(explicit.information_gap_rules || explicit.informationGapRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTrumpCardPrepositionRules = asArray(explicit.trump_card_preposition_rules || explicit.trumpCardPrepositionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForeshadowingBoundaryRules = asArray(explicit.foreshadowing_boundary_rules || explicit.foreshadowingBoundaryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitShockLayers = asArray(explicit.shock_layers || explicit.shockLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_suspense_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      information_order_templates: explicitInformationOrderTemplates.length ? explicitInformationOrderTemplates : asArray(derived.information_order_templates),
      suspense_strength: compactBriefText(explicit.suspense_strength || explicit.suspenseStrength, derived.suspense_strength || '2 小悬念'),
      suspense_cycle: explicitSuspenseCycle.length ? explicitSuspenseCycle : asArray(derived.suspense_cycle),
      trigger_layers: explicitTriggerLayers.length ? explicitTriggerLayers : asArray(derived.trigger_layers),
      expectation_layers: explicitExpectationLayers.length ? explicitExpectationLayers : asArray(derived.expectation_layers),
      expectation_chain: explicitExpectationChain || normalizeSuspenseExpectationChainContract(derived.expectation_chain || derived.expectationChain),
      multi_line_suspense_rules: explicitMultiLineSuspenseRules.length
        ? explicitMultiLineSuspenseRules
        : asArray(derived.multi_line_suspense_rules).length ? asArray(derived.multi_line_suspense_rules) : OH_STORY_SUSPENSE_MULTI_LINE_RULES,
      reader_preknowledge_rules: explicitReaderPreknowledgeRules.length
        ? explicitReaderPreknowledgeRules
        : asArray(derived.reader_preknowledge_rules).length ? asArray(derived.reader_preknowledge_rules) : OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES,
      information_gap_rules: explicitInformationGapRules.length
        ? explicitInformationGapRules
        : asArray(derived.information_gap_rules).length ? asArray(derived.information_gap_rules) : OH_STORY_SUSPENSE_INFORMATION_GAP_RULES,
      trump_card_preposition_rules: explicitTrumpCardPrepositionRules.length
        ? explicitTrumpCardPrepositionRules
        : asArray(derived.trump_card_preposition_rules).length ? asArray(derived.trump_card_preposition_rules) : OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES,
      foreshadowing_boundary_rules: explicitForeshadowingBoundaryRules.length
        ? explicitForeshadowingBoundaryRules
        : asArray(derived.foreshadowing_boundary_rules).length ? asArray(derived.foreshadowing_boundary_rules) : OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES,
      shock_layers: explicitShockLayers.length ? explicitShockLayers : asArray(derived.shock_layers),
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
      scene.opening_hook,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  return {
    version: 'oh_story_suspense_v1',
    source: 'oh_story_embedded_fallback',
    information_order_templates: inferSuspenseInformationTemplates(text),
    suspense_strength: inferSuspenseStrength(Number(target.chapter_no || 0), text),
    suspense_cycle: buildSuspenseCycle(sceneCards, target),
    trigger_layers: OH_STORY_SUSPENSE_TRIGGER_LAYERS,
    expectation_layers: OH_STORY_SUSPENSE_EXPECTATION_LAYERS,
    expectation_chain: {
      active_lines: [
        '短期期待：解决本章当前疑问或危险。',
        '中期期待：追查当前线索背后的更大规则、名单、势力或资源。',
        '长期期待：保留主线谜团、身份真相、旧案、终极敌人或终局目标。',
      ],
      carry_rules: ['至少两条期待线必须同时运行，当前谜题兑现后不能清空期待。'],
      next_open_loop: ['每章结尾至少留下一个未解决问题、未达成期待、新门槛、新线索或新困境。'],
    },
    multi_line_suspense_rules: OH_STORY_SUSPENSE_MULTI_LINE_RULES,
    reader_preknowledge_rules: OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES,
    information_gap_rules: OH_STORY_SUSPENSE_INFORMATION_GAP_RULES,
    trump_card_preposition_rules: OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES,
    foreshadowing_boundary_rules: OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES,
    shock_layers: OH_STORY_SUSPENSE_SHOCK_LAYERS,
    forbidden_patterns: OH_STORY_SUSPENSE_FORBIDDEN,
    quality_checks: OH_STORY_SUSPENSE_CHECKS,
    revision_priorities: ['补悬念等级', '重排信息顺序', '补期待接力', '修悬念伏笔边界', '补角色反应', '补震惊分层', '防止麻烦消失'],
  }
}

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

const OH_STORY_SHOWDOWN_PAYOFF_RELEASE_RULES = [
  '该爽不爽，比毒点还毒；主角该赢、该亮底牌、该压制时必须让读者看到结果。',
  '底牌释放后，反派就要受到对应的压制，不能立刻反打主角或让主角继续委屈。',
  '寸止可以，拉扯可以，但别让主角委屈；延迟释放必须同时给读者明确胜利信号。',
  '爽点不是解释设定，而是压迫解除、地位反转、证据落地、资源到手或关系态度改变。',
]

const OH_STORY_SHOWDOWN_TRUMP_CARD_RESERVE_RULES = [
  '底牌管理：手里始终保持2-3个未揭示的底牌，不能把后续章节的牌一次性倒空。',
  '每次只出1个底牌；一次出牌只解决当前矛盾的关键扣，不顺手清掉所有后续期待。',
  '出牌后必须补新牌、新技能、新资源、新限制或更高门槛，让读者知道下一轮还有可期待的后手。',
  '底牌释放后既要有压制效果，也要留下未揭示底牌或新后手，避免爽点落地后长线期待断档。',
]

const OH_STORY_SHOWDOWN_INVINCIBLE_PROTAGONIST_RULES = [
  '无敌文唯一铁律：主角登场时一点都不能拖拉，该出手就直接压制。',
  '开头塑造主角杀伐果断的性格 + 战力前置无敌，形成主角登场就会大杀四方的期待。',
  '不一击必杀时必须有明确理由：保留线索、钓出幕后、规则限制或更大目标，不能嘴炮磨叽。',
  '读者已经不爽时，主角登场必须给强势解决信号，不能为了拖字数降智绕圈。',
]

const OH_STORY_SHOWDOWN_THREE_PRESSURE_SHOCK_RULES = [
  '三压一爆三震：一压友好势力，让他们先觉得主角是大佬或值得期待。',
  '二压敌方势力，至少两次铺垫不服、挑衅或逼主角上场，压力要递进。',
  '三压中立势力，让评判者、旁观权威或规则方观望/加压，形成第三重压力。',
  '一爆是主角出手碾压；三震必须分别写友方、敌方、中立方的不同震动，不能只写“众人震惊”。',
]

const OH_STORY_SHOWDOWN_STAGE_CHAIN_RULES = [
  '装逼打脸要有舞台：先铺人际关系铺垫，再铺利益压力，再让主角在公开场合完成反压。',
  '围观层级按群众层 -> 中间层 -> 核心层递进；每一层反应必须推动声望、利益或局势变化。',
  '群众层负责直观震惊，中间层负责专业判断，核心层负责权力/资源/规则层面的重新评估。',
  '公开审判、擂台、会议、直播、宗门大殿、宴会和比赛等场景必须让舞台服务爽点，而不是只当背景。',
]

const OH_STORY_SHOWDOWN_TRANSMISSION_CHANNEL_RULES = [
  '装逼前必须先铺设人际关系，否则没有传递通道。',
  '主角与群众层、中间层或核心层至少建立一种可见联系：救助、利益、师承、欠债、旧情、认可或共同目标。',
  '爽点释放后，传递通道必须让态度、利益计算、声望、资源或规则评价发生变化。',
  '震惊不仅正向上行，也可以由核心层反向传回群众层，形成装逼闭环。',
]

const OH_STORY_SHOWDOWN_SHOCK_CHAIN_RULES = [
  '主角行动 -> 第一层震惊 -> 传递到第二层 -> 传递到核心层；震惊必须形成传递链。',
  '震惊不只是“好厉害”，而是“这跟我有关系”；每层反应要基于自身利益和目标。',
  '震惊不是统一的“倒吸一口凉气”；不同身份、知识水平和利害关系的人必须有不同反应。',
  '震惊反应要反过来放大主角收益：名望、资源、关系、规则权限或敌人破防。',
]

const OH_STORY_SHOWDOWN_COMBAT_DESIGN_RULES = [
  '打斗是一场表演，是主角展示收获的舞台，必须服务于爽点。',
  '动作过程必须让读者看懂：起手、试探、受阻、代价、反制、结果至少形成清晰链条。',
  '战斗/智斗不只写输赢，要写主角新能力、新资源、新认知或新关系如何改变局面。',
  '智斗的本质是信息差的博弈；证据、时机、视角、规则、心理和利益计算都要进入对抗。',
]

const OH_STORY_SHOWDOWN_WEAK_OVER_STRONG_RULES = [
  '以弱胜强必须有逻辑：信息差、环境利用、心理博弈至少命中一项。',
  '可以超越极限强行使用高阶能力，但要付出明确代价，并让代价进入后续状态。',
  '强敌不能降智送赢；主角赢要来自准备、规则理解、证据链、资源调度或关键选择。',
  '反派压迫越强，主角反制越要给可见依据，不能靠天降设定或旁白宣布。',
]

const OH_STORY_SHOWDOWN_COUNTERPLAY_LAYERS = [
  '反派强时三层破局：硬碰硬、预判反制、反预判。',
  '预判反制：反派出A，主角早准备B克制A。',
  '反预判：反派精心准备针对A，主角不仅避开A，还利用A作陷阱引导反派落入预设B。',
  '核心爽点是主角在更高层面的思考、准备和掌控力；计谋要比反派更早一层。',
]

const OH_STORY_SHOWDOWN_EMOTION_RHYTHM_RULES = [
  '情绪节奏执行急 -> 缓 -> 急：先压迫，再给短暂判断/铺垫，最后集中释放。',
  '压迫段不能过长；压的同时必须给读者信心暗示、底牌影子或反制可能。',
  '释放后要有回响：群众、对手、核心人物和主角状态都要发生变化。',
  '高潮后需要短冷却承接下一钩子，不能爽点落地后直接散场。',
]

const OH_STORY_SHOWDOWN_QUALITY_CHECKS = [
  '爽点到位：该赢、该压、该亮底牌时必须给足结果。',
  '底牌管理：每次只出1个底牌，保留2-3个未揭示后手，并在出牌后补新技能、新资源或新门槛。',
  '三压一爆三震：友方、敌方、中立方先各自形成压力，主角一爆碾压后，三方都要有差异震动。',
  '主角不委屈：拉扯可以，但不能长期让主角被动挨打或被反派反压。',
  '铺垫充分：舞台、人际关系、利益压力和反制依据必须提前落地。',
  '传递通道：装逼前必须有人际关系或利益关系，爽点释放后能改变他人态度、利益或规则评价。',
  '震惊分层：群众层、中间层、核心层反应必须不同，并基于各自利益。',
  '舞台够大：公开场合、权力结构或关系网络必须放大结果。',
  '战斗服务于爽点：打斗/智斗展示主角收获，而不是空转动作。',
  '三层破局：强敌越强，越要写出主角提前准备、预判反制和反预判陷阱。',
  '无敌文主角不拖拉：该压制时直接压制，不能为了拖字数降智绕圈。',
  '情绪节奏：急 -> 缓 -> 急，压迫、判断、释放和回响要清楚。',
  '以弱胜强有逻辑：信息差、环境利用、心理博弈或明确代价必须成立。',
  '装逼闭环：挑衅、压迫、亮点、反打、反应、局势变化必须闭环。',
]

