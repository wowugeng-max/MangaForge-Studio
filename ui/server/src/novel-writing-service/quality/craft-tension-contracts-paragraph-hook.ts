import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_PARAGRAPH_HOOK_TYPES = [
  '信息差',
  '倒计时',
  '反转',
  '暗牌',
  '打脸',
  '代价',
  '弱者/孩子',
  '灵魂旁观',
  '异常物件',
  '假意顺从',
  '冷发现',
]

const OH_STORY_PARAGRAPH_HOOK_COMBINATIONS = [
  '信息差 + 暗牌',
  '倒计时 + 代价',
  '反转 + 打脸',
  '弱者 + 代价',
  '暗牌 + 打脸',
  '异常物件 + 冷发现',
  '灵魂旁观 + 弱者',
  '假意顺从 + 暗牌',
  '阶梯背叛 + 冷发现',
]

const OH_STORY_PARAGRAPH_HOOK_FORBIDDEN = [
  '假悬念：只摆姿态，不给真实问题、危险、信息差或代价。',
  '机械降神：段落制造危机，下一段靠巧合或外力无代价解除。',
  '过度留白：连续留谜但不给读者可推理的新信息。',
  '低风险钩：用无关痛痒的小事假装紧张。',
  '同类型连用：连续段落只重复同一种钩子，信息、风险和情绪没有递进。',
]

const OH_STORY_DIALOGUE_ESCALATION = [
  '对话情绪五级递增：客观陈述事实 -> 客观陈述 + 提出建议 -> 主观指责 -> 主观指责 + 强制命令 -> 主观指责 + PUA抬升自己。',
]

const OH_STORY_SPECTATOR_LAYERS = [
  '低质量：路人只喊震惊、厉害、怎么可能，不能替代剧情反应。',
  '中质量：旁观者有身份、立场和利益，反应能证明主角行动影响局面。',
  '高质量：熟人、权威、敌对者、受害者或受益者分层反应，分别改变舆论、权力、关系或下一步选择。',
]

const OH_STORY_UNFAIR_INJURY_HOOKS = [
  '利益转移型：主角被迫承担别人获利后的后果。',
  '损失转嫁型：对手把错误、成本或惩罚甩到主角身上。',
  '针锋相对型：主角被当众压迫后用证据、规则或行动反打。',
]

const OH_STORY_PARAGRAPH_HOOK_CHECKS = [
  '每 3-5 段必须出现一个段落级钩子，能归入段落级钩子 11 种之一，并带来信息、风险、情绪或关系变化。',
  '关键段落必须使用钩子组合，优先信息差 + 暗牌、倒计时 + 代价、反转 + 打脸、暗牌 + 打脸或异常物件 + 冷发现。',
  '对话冲突必须体现对话情绪五级递增，不能全程平铺直叙或只互相解释设定。',
  '打脸、揭露、反证或公开冲突场景必须有围观者质量层级，至少出现一层中/高质量旁观反应。',
  '不公平伤害必须有利益转移、损失转嫁或针锋相对的可见伤害，并让读者看到主角反击窗口。',
  '段落钩子不能是假悬念、机械降神、过度留白、低风险钩或同类型连用。',
]

function paragraphHookExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.paragraph_hook_contract
    || contextPackage?.chapter_target?.paragraphHookContract
    || contextPackage?.paragraph_hook_contract
    || contextPackage?.paragraphHookContract
    || contextPackage?.pre_draft_brief?.paragraph_hook_contract
    || contextPackage?.preDraftBrief?.paragraphHookContract
}

function inferParagraphHookTypes(text: string) {
  const hits: string[] = []
  if (/不知道|隐瞒|真相|以为|误会|信息差|是否|为什么/.test(text)) hits.push('信息差')
  if (/倒计时|还剩|零点|期限|最后|立刻|马上/.test(text)) hits.push('倒计时')
  if (/反转|竟然|却|原来|调包|证明|露出/.test(text)) hits.push('反转')
  if (/暗牌|底牌|账本|证据|屏风|藏着|后手/.test(text)) hits.push('暗牌')
  if (/打脸|反打|当众|围观|态度转变|审判|逼.*认罪/.test(text)) hits.push('打脸')
  if (/代价|损失|惩罚|承担|受伤|消耗/.test(text)) hits.push('代价')
  if (/孩子|弱者|无辜|弟子|新人|受害者/.test(text)) hits.push('弱者/孩子')
  if (/旁观|灵魂|围观者|众人|长老|熟人/.test(text)) hits.push('灵魂旁观')
  if (/物件|钥匙|账本|戒指|屏风|异常|残骨|符/.test(text)) hits.push('异常物件')
  if (/顺从|认罪|低头|假意|配合|答应/.test(text)) hits.push('假意顺从')
  if (/冷发现|忽然发现|才发现|无声|冰冷|名单/.test(text)) hits.push('冷发现')
  return uniqueBriefStrings(hits.length ? hits : ['信息差', '暗牌', '打脸'], 8)
}

function inferHookCombinations(types: string[], text: string) {
  const normalized = types.join(' ')
  const combinations = OH_STORY_PARAGRAPH_HOOK_COMBINATIONS.filter(item => {
    const [left, right] = item.split(' + ')
    return normalized.includes(left) && normalized.includes(right)
  })
  if (/暗牌|底牌|证据|账本/.test(text) && /打脸|反打|当众|态度转变/.test(text)) combinations.push('暗牌 + 打脸')
  if (/倒计时|期限|立刻/.test(text) && /代价|惩罚|损失/.test(text)) combinations.push('倒计时 + 代价')
  if (/异常|物件|账本|钥匙|戒指/.test(text) && /发现|揭示|露出/.test(text)) combinations.push('异常物件 + 冷发现')
  return uniqueBriefStrings(combinations.length ? combinations : ['信息差 + 暗牌'], 6)
}

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

