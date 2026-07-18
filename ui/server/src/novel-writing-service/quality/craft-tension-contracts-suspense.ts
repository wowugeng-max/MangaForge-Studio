import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { normalizeSuspenseExpectationChainContract } from './craft-tension-contracts-deps'

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

