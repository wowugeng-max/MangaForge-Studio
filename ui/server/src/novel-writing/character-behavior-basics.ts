function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function characterBehaviorArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeCharacterBehaviorMotivationCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasCause = /起因|因为|抢先|当众|压到|逼|被迫|原本/.test(text)
  const hasIntent = /想|必须|要|意图|为了|保住|证明|逼.*说漏|争取/.test(text)
  const hasConstraint = /不能|不敢|约束|顾忌|身份|证人身份|暴露|风险|代价/.test(text)
  const hasRisk = /若|失败|否则|会重新|风险|代价|失去|倒向/.test(text)
  const explicitBreak = /忽然性格大变|什么也没想|突然(?:冲|答应|相信|放弃)|毫无理由|莫名其妙/.test(text)
  const delivered = !explicitBreak && [hasCause, hasIntent, hasConstraint, hasRisk].filter(Boolean).length >= 3
  return {
    key: 'motivation_chain',
    label: '动机链',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [hasCause, hasIntent, hasConstraint, hasRisk].filter(Boolean).length * 22),
    evidence: [hasCause ? '起因可见' : '', hasIntent ? '意图可见' : '', hasConstraint ? '约束可见' : '', hasRisk ? '风险可见' : '', explicitBreak ? '突变行为' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '角色行动缺少起因、意图、约束、风险构成的动机链，或出现无因突变行为。',
    repair_instruction: delivered ? '' : '补动机链：先写触发起因，再写角色想要什么、不能做什么、失败会损失什么，让行动由这些压力推出。',
  }
}

export function normalizeCharacterBehaviorMotivationSpecificityCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const rawVagueCause = /起因(?:就是|是|：)?[^。！？\n]{0,8}(?:被欺负|被针对|被压迫|受委屈)|因为(?:被欺负|被针对|被压迫|受委屈)|动机(?:就是|是|：)?[^。！？\n]{0,8}(?:要成为最强|想变强|变强)/.test(text)
  const negatesVagueCause = /不是因为(?:被欺负|被针对|被压迫|受委屈)|不是[^。！？\n]{0,12}(?:要成为最强|想变强|变强)/.test(text)
  const vagueCause = rawVagueCause && !negatesVagueCause
  const suddenEvolution = /毫无铺垫|说变就变|突然[^。！？\n]{0,16}变成|动机[^。！？\n]{0,16}突然改变/.test(text)
  const hasConcreteCause = /具体起因|众目睽睽|当众|母亲旧铺|伪账本|旧账|被打耳光|抢先|压到|夺走|失去|病重|亲眼|旧铺/.test(text)
  const hasEmotionalMotive = /情感驱动|羞辱|亲情|亏欠|复仇|守住|母亲|旧痛|恐惧|避免|不再|保护|愧疚|尊严/.test(text)
  const hasEvolutionSetup = /铺垫|触发|从[^。！？\n]{0,18}到|变成|后续|递上|封条|事件触发|不再/.test(text)
  const delivered = !vagueCause && !suddenEvolution && hasConcreteCause && hasEmotionalMotive && hasEvolutionSetup
  return {
    key: 'motivation_specificity_rules',
    label: '动机具体性',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [!vagueCause, !suddenEvolution, hasConcreteCause, hasEmotionalMotive, hasEvolutionSetup].filter(Boolean).length * 18),
    evidence: [
      hasConcreteCause ? '起因具体' : '',
      hasEmotionalMotive ? '情感层面动机' : '',
      hasEvolutionSetup ? '动机演变有铺垫' : '',
      vagueCause ? '模糊起因/空泛动机' : '',
      suddenEvolution ? '动机说变就变' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      vagueCause ? '起因不能只写“被欺负/被针对/被压迫”' : '',
      !hasConcreteCause ? '缺具体起因：需要可见事件、地点、人物和伤害方式' : '',
      !hasEmotionalMotive ? '缺情感层面动机，不能只写“要成为最强/想变强”' : '',
      !hasEvolutionSetup || suddenEvolution ? '动机演变缺铺垫或触发事件' : '',
    ], 8),
    issue: delivered ? '' : '角色动机不够具体：起因空泛、情感驱动不足，或动机演变缺少铺垫。',
    repair_instruction: delivered ? '' : '按 oh-story 动机检查修复：把“被欺负”改成具体事件（谁、何时、当众如何伤害）；把“要成为最强”改成情感层面的理由；每次动机变化都补触发事件、关系压力或代价。',
  }
}

export function normalizeCharacterBehaviorLayeredTagsCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasIdentity = /身份|学徒|长老|账房|宗祠|证人|反派|主角|旁观者|林青禾|周薄森|李玄/.test(text)
  const hasSurfaceBehavior = /克制|短句|抬眼|按住|没有立刻|只(?:抬眼|问|说|补)|先看|先按|寸步不让/.test(text)
  const hasCoreAction = /保住|证明|逼.*说漏|不让|不退|争取|公开|承认|守住/.test(text)
  const tellsOnly = /人设很复杂|性格很复杂|大家都知道他|他很聪明|他很厉害|他的人设/.test(text)
  const delivered = !tellsOnly && [hasIdentity, hasSurfaceBehavior, hasCoreAction].filter(Boolean).length >= 2
  return {
    key: 'layered_tags',
    label: '三层标签',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 84 : Math.max(16, [hasIdentity, hasSurfaceBehavior, hasCoreAction].filter(Boolean).length * 26),
    evidence: [hasIdentity ? '身份/关系语境' : '', hasSurfaceBehavior ? '表现标签行动化' : '', hasCoreAction ? '内核目标行动化' : '', tellsOnly ? '旁白贴人设' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '三层标签没有落成行动，或正文只用旁白声明角色聪明、复杂、厉害。',
    repair_instruction: delivered ? '' : '把身份标签、表现标签、内核标签写成可见行为：动作、短句、选择、拒绝、反应或代价。',
  }
}

export function normalizeCharacterBehaviorRulesCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAction = /按住|抬眼|递|放到|压到|退开|停住|看见|站住|问/.test(text)
  const hasDialogue = /[“「"][^”」"]{1,80}[”」"]/.test(text)
  const hasReaction = /停住|顿住|倒向|听见|沉默|脸色|低声|旁观者/.test(text)
  const abstractTelling = /大家都知道|人设很|性格很|内心非常|显得十分|做得对/.test(text)
  const delivered = !abstractTelling && [hasAction, hasDialogue, hasReaction].filter(Boolean).length >= 2
  return {
    key: 'behavior_rules',
    label: '行为规则',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(18, [hasAction, hasDialogue, hasReaction].filter(Boolean).length * 28),
    evidence: [hasAction ? '动作展示' : '', hasDialogue ? '对白展示' : '', hasReaction ? '反应展示' : '', abstractTelling ? '抽象告知' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '角色目的、态度或弱点没有通过行动、对话、反应展示，仍停留在抽象说明。',
    repair_instruction: delivered ? '' : '把“他很聪明/复杂/正确”改成行动证据：一句短问、一个选择、一个反应和一个后果。',
  }
}

export function normalizeCharacterBehaviorProtagonistComposureCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const rawToxicReaction = /气得要死|面红耳赤|暴怒反击|破口大骂|歇斯底里|怒吼|吼回去|立刻[^。！？!?]{0,16}(?:暴怒|失态|炸了)|被[^。！？!?]{0,20}(?:低级挑衅|挑衅|辱骂)[^。！？!?]{0,24}牵着走/.test(text)
  const negatedToxicReaction = /(?:不是|没有|禁止|删掉|避免|而不是)[^。！？!?]{0,18}(?:暴怒反击|暴怒|面红耳赤|歇斯底里|破口大骂|失态)/.test(text)
  const toxicReaction = rawToxicReaction && !negatedToxicReaction
  const lowLevelProvocation = /低级挑衅|被骂|辱骂|废物|嘲笑|挑衅|骂他/.test(text)
  const calmResponse = /轻描淡写|从容|不动声色|微微一笑|没有(?:被[^。！？!?]{0,16})?牵着走|不被[^。！？!?]{0,16}牵着走|没有争辩|没有立刻|只(?:抬眼|问|说|推|看)|短句|动作压制|一指|看字/.test(text)
  const upgradeSeparated = /升级线[^。！？!?]{0,24}反应线|升级[^。！？!?]{0,36}(?:不自动|没有|不曾|不能)[^。！？!?]{0,24}(?:改变|影响)[^。！？!?]{0,20}(?:从容|反应|性格)|升级[^。！？!?]{0,24}只(?:提升|改变)[^。！？!?]{0,24}(?:能力|实力|验印|修为)|实力[^。！？!?]{0,24}不(?:改变|影响)[^。！？!?]{0,20}(?:从容|反应|性格)/.test(text)
  const delivered = !toxicReaction && calmResponse && (!lowLevelProvocation || upgradeSeparated || /高实力|高阅历|风轻云淡|一指/.test(text))
  return {
    key: 'protagonist_composure_rules',
    label: '主角逼格反应',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [!toxicReaction, calmResponse, upgradeSeparated].filter(Boolean).length * 24),
    evidence: [
      calmResponse ? '从容/轻描淡写反应' : '',
      upgradeSeparated ? '升级线与主角反应线分开' : '',
      lowLevelProvocation ? '低级挑衅场景' : '',
      toxicReaction ? '被低级挑衅拖入暴怒失态' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      toxicReaction ? '低级挑衅不能把主角拖成暴怒、面红耳赤或歇斯底里' : '',
      !calmResponse ? '缺主角轻描淡写、短句或行动压制的从容反应' : '',
      !upgradeSeparated ? '缺升级线与主角反应线分开管理：升级提升实力，不改变从容反应' : '',
    ], 8),
    issue: delivered ? '' : '主角逼格反应不足：升级后被低级挑衅牵着走，或缺少轻描淡写、短句、行动压制等从容反应。',
    repair_instruction: delivered ? '' : '按 oh-story 角色逼格管理修复：升级只提升实力/能力，不改变主角从容反应；面对低级挑衅时删暴怒失态，改成轻描淡写、短句反锁、动作压制，必要时用旁观者反应放大爽点。',
  }
}

export function normalizeCharacterBehaviorStrongAssociationCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const strongSignals = text.match(/能力|实力|钱财|资源|人脉|背景|身份|证据|线索|技能|规则|旧铺|账权|账房|审证|伪账本|录音|作证|资格|封条|核心梗|装逼爽点|人物碰撞|剧情走向|反转/g) || []
  const hasStrongFraming = /强关联|强关联设定|影响剧情走向|推动人物碰撞|核心梗|装逼爽点/.test(text)
  const hasPlotFunction = /剧情走向|核心梗|装逼爽点|人物碰撞|推动剧情|推进剧情|冲突|反转|爽点/.test(text)
  const weakOnly = /只有[^。！？!?]{0,60}(?:身高|体重|外貌|爱好|喜欢|衣着|黑衣|甜糕)[^。！？!?]{0,80}(?:弱关联|没有任何[^。！？!?]{0,12}强关联)|没有任何[^。！？!?]{0,24}(?:影响剧情走向|强关联)|弱关联[^。！？!?]{0,40}(?:喧宾夺主|抢走)/.test(text)
  const delivered = !weakOnly && hasStrongFraming && hasPlotFunction && new Set(strongSignals).size >= 3
  return {
    key: 'strong_association_rules',
    label: '人设强关联',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(14, [hasStrongFraming, hasPlotFunction, new Set(strongSignals).size >= 3, !weakOnly].filter(Boolean).length * 20),
    evidence: [
      hasStrongFraming ? '强关联框架可见' : '',
      hasPlotFunction ? '强关联影响剧情/爽点/碰撞' : '',
      new Set(strongSignals).size >= 3 ? '至少3个剧情功能关联' : '',
      weakOnly ? '只剩外貌爱好等弱关联' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasStrongFraming ? '缺人设强关联框架' : '',
      !hasPlotFunction ? '缺直接影响剧情走向、核心梗、装逼爽点或人物碰撞的功能' : '',
      new Set(strongSignals).size < 3 ? '重要角色缺至少3个强关联设定' : '',
      weakOnly ? '弱关联喧宾夺主：外貌、爱好、身高体重不能替代强关联' : '',
    ], 8),
    issue: delivered ? '' : '人设强关联不足：重要角色没有至少3个能推动剧情、核心梗、爽点或人物碰撞的设定，或弱关联喧宾夺主。',
    repair_instruction: delivered ? '' : '补人设强关联：为重要角色补至少3个会改变剧情走向的实力、资源、人脉、背景、技能、证据或关系锚点；外貌、爱好、身高体重只能做弱关联记忆点。',
  }
}

export function normalizeCharacterBehaviorSupportingRoleCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasFunction = /林青禾[^。！？!?]{0,40}(?:没有替|只把|递|放|作证|给事实|封条)|证人[^。！？!?]{0,40}(?:上堂|作证|给事实)|旁观者[^。！？!?]{0,40}(?:停住|倒向|退开)/.test(text)
  const emptyPraise = /(?:只在旁边|旁边).*?[“「"]你(?:太|真)[^”」"]*(?:厉害|聪明|强)[”」"]|你(?:太|真)[^。！？!?]{0,12}(?:厉害|聪明|强)/.test(text)
  const delivered = hasFunction && !emptyPraise
  return {
    key: 'supporting_role_functions',
    label: '配角功能',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : hasFunction ? 60 : 20,
    evidence: [hasFunction ? '配角提供事实/证据/立场变化' : '', emptyPraise ? '空泛夸赞' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '配角没有承担证据、阻碍、反应、转向或代价功能，或只负责夸主角。',
    repair_instruction: delivered ? '' : '给每个有台词配角一个现场功能：提供事实、制造阻碍、改变立场、承担代价或触发反应；删掉空泛夸赞。',
  }
}

export function normalizeCharacterBehaviorRoleCardCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasPosition = /角色定位|身份标签|账房学徒|落魄|证人|主角|职业/.test(text)
  const hasAppearanceOrAnchor = /外貌特征|旧夹克|左手有疤|口头禅|标志动作|袖口|短句反问/.test(text)
  const hasCoreGoal = /核心目标|全书终点|夺回|拿回|保住|守住|证明/.test(text)
  const hasCoreMotive = /核心动机|情感驱动|亲情|尊严|羞辱|亏欠|母亲|保护/.test(text)
  const hasFatalFlaw = /致命弱点|弱点|藏招|退让|犯错|选择压力|关键情节/.test(text)
  const explicitMissing = /角色卡缺失|没有角色定位|核心目标不清|核心动机不清|致命弱点没有|口头禅和标志动作写着写着忘了/.test(text)
  const signalCount = [hasPosition, hasAppearanceOrAnchor, hasCoreGoal, hasCoreMotive, hasFatalFlaw].filter(Boolean).length
  const delivered = !explicitMissing && signalCount >= 4
  return {
    key: 'role_card_requirements',
    label: '角色卡必备项',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(14, signalCount * 18 - (explicitMissing ? 18 : 0)),
    evidence: [
      hasPosition ? '角色定位/身份标签' : '',
      hasAppearanceOrAnchor ? '外貌/口头禅/标志动作' : '',
      hasCoreGoal ? '核心目标' : '',
      hasCoreMotive ? '核心动机' : '',
      hasFatalFlaw ? '致命弱点' : '',
      explicitMissing ? '角色卡字段缺失' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasPosition ? '缺角色定位或身份标签' : '',
      !hasAppearanceOrAnchor ? '缺外貌记忆点、口头禅或标志动作' : '',
      !hasCoreGoal ? '缺核心目标' : '',
      !hasCoreMotive ? '缺情感层面的核心动机' : '',
      !hasFatalFlaw ? '缺会导致选择压力或犯错的致命弱点' : '',
      explicitMissing ? '角色卡必备项被正文显式否定' : '',
    ], 8),
    issue: delivered ? '' : '角色卡必备项没有落成正文证据或写前合同：角色定位、身份标签、核心目标、核心动机、致命弱点、口头禅/标志动作不完整。',
    repair_instruction: delivered ? '' : '补角色卡必备项：用一两处可定位文本写清角色定位/身份标签、核心目标、情感动机、致命弱点，以及读者能记住的外貌、口头禅或标志动作。',
  }
}

export function normalizeCharacterBehaviorSupportingRoleExitCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasFunction = /配角功能|事实证人|情报源|导师|盟友|同盟|牺牲品|镜像对照|阻碍|证据|核心特质|标志性特征/.test(text)
  const hasExitPlan = /退场方式|退场规划|退到|退出|下线|离场|主动退|暂退|后续退场/.test(text)
  const tooManySpeakers = /五个配角一直发言|超过\s*3\s*个有台词|同一场景[^。！？!?]{0,24}超过\s*3|配角[^。！？!?]{0,20}一直发言/.test(text)
  const forgotten = /配角退场方式没有规划|退场方式没有规划|配角[^。！？!?]{0,40}写着写着忘了|退场[^。！？!?]{0,40}写着写着忘了|没有功能的角色/.test(text)
  const delivered = !tooManySpeakers && !forgotten && hasFunction && hasExitPlan
  return {
    key: 'supporting_role_exit_rules',
    label: '配角退场规划',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(12, [hasFunction, hasExitPlan, !tooManySpeakers, !forgotten].filter(Boolean).length * 20),
    evidence: [
      hasFunction ? '配角功能/特质可见' : '',
      hasExitPlan ? '退场方式可见' : '',
      tooManySpeakers ? '同场配角发言过多' : '',
      forgotten ? '退场规划缺失' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasFunction ? '缺配角功能、关系、核心特质或标志性特征' : '',
      !hasExitPlan ? '缺配角退场方式或暂退安排' : '',
      tooManySpeakers ? '同一场景配角有台词人数超过 3 个' : '',
      forgotten ? '配角写着写着忘了或无功能占场' : '',
    ], 8),
    issue: delivered ? '' : '配角卡缺少功能、特质、退场方式，或同一场景配角台词人数失控。',
    repair_instruction: delivered ? '' : '补配角卡：明确每个有台词配角的现场功能、与主角关系、核心特质、标志性特征和退场方式；同场超过3个配角时合并为旁观反应、动作或叙事概括。',
  }
}

export function normalizeCharacterBehaviorRepeatCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const repeatedAnchorHits = (text.match(/旧夹克|袖口|短句反问|看字|标志动作|口头禅|按住/g) || []).length
  const hasRepeatFrame = /行为重复点|不同场景重复|反复写|重复出现|每到关键|开场[^。！？!?]{0,24}中段[^。！？!?]{0,24}章尾/.test(text)
  const forgotten = /没有行为重复点|口头禅和标志动作写着写着忘了|标志动作写着写着忘了/.test(text)
  const delivered = !forgotten && (hasRepeatFrame || repeatedAnchorHits >= 3)
  return {
    key: 'behavior_repeat_rules',
    label: '行为重复点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(12, (hasRepeatFrame ? 46 : 0) + Math.min(30, repeatedAnchorHits * 10) - (forgotten ? 18 : 0)),
    evidence: [
      hasRepeatFrame ? '行为重复框架可见' : '',
      repeatedAnchorHits >= 3 ? '记忆动作多次出现' : '',
      forgotten ? '行为重复点丢失' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasRepeatFrame && repeatedAnchorHits < 3 ? '缺跨场景重复的行为特质' : '',
      forgotten ? '口头禅或标志动作写着写着忘了' : '',
    ], 6),
    issue: delivered ? '' : '主要角色缺少行为重复点，长篇人设容易写散。',
    repair_instruction: delivered ? '' : '补行为重复点：选一个读者喜欢的行为特质，具体化为动作/口头禅/反应，并在开场、中段或章尾以不同功能重复。',
  }
}

export function normalizeCharacterDrivenEventCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const rawHardPlot = /剧情需要|硬编剧情|外部事件突然|外部事件硬砸|和他的动机无关|事情自己解决|莫名其妙针对/.test(text)
  const negatedHardPlot = /不是外部事件硬砸|不靠(?:作者)?硬编剧情|不要硬编剧情|不能硬编剧情|避免硬编剧情/.test(text)
  const hardPlot = rawHardPlot && !negatedHardPlot
  const hasMotive = /动机|因为|为了|保住|守住|亲情|尊严|安全|目标/.test(text)
  const hasChoice = /选择|反问|决定|行动|自然推|推出|推出来|人推事件|人物性格/.test(text)
  const delivered = !hardPlot && hasMotive && hasChoice
  return {
    key: 'character_driven_event_rules',
    label: '人推事件',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(12, [hasMotive, hasChoice, !hardPlot].filter(Boolean).length * 26 - (hardPlot ? 18 : 0)),
    evidence: [
      hasMotive ? '人物动机可见' : '',
      hasChoice ? '人物选择/行动可见' : '',
      hardPlot ? '剧情硬推或硬编' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasMotive ? '缺人物动机作为方向来源' : '',
      !hasChoice ? '缺人物选择把事件推出' : '',
      hardPlot ? '事件靠外部硬砸或作者硬编' : '',
    ], 6),
    issue: delivered ? '' : '情节没有从人物动机和选择自然推出，出现事件推人或硬编剧情风险。',
    repair_instruction: delivered ? '' : '改成人推事件：先写角色想要什么、怕失去什么，再让他的选择触发冲突、代价和后续事件。',
  }
}

export function normalizeProtagonistRedLineCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const redLineHit = /圣母型主角|无脑战斗机器|内核邪恶|因蠢(?:\/圣母)?犯错|圣母犯错|自暴自弃|让读者看不起/.test(text)
  const negated = /没有触碰主角红线|不圣母|不无脑战斗机器|不内核邪恶|不因蠢犯错|不自暴自弃|不能写圣母/.test(text)
  const violation = redLineHit && !negated
  const hasPositiveChoice = /选择|智斗|底线|尊严|从容|不被[^。！？!?]{0,16}牵着走|压势不压人/.test(text)
  const delivered = !violation
  return {
    key: 'protagonist_red_line_rules',
    label: '主角红线',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? (hasPositiveChoice ? 88 : 78) : 18,
    evidence: [
      hasPositiveChoice ? '主角选择/底线可见' : '',
      negated ? '红线规避说明' : '',
      violation ? '触碰主角红线' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['触碰圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错或自暴自弃等主角红线'],
    issue: delivered ? '' : '主角触碰红线，会削弱代入和读者认同。',
    repair_instruction: delivered ? '' : '修主角红线：删圣母、无脑、内核邪恶、因蠢犯错和自暴自弃；改成有底线、有选择、有代价的智斗或行动。',
  }
}

export function normalizeIdentityGoldfingerAlignmentCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const mismatch = /身份、身世、金手指、性格完全不统一|社会身份[^。！？!?]{0,30}不统一|金手指脱离|突然靠[^。！？!?]{0,24}系统|毫无铺垫[^。！？!?]{0,24}系统|金手指[^。！？!?]{0,24}(?:无关|不相符|不贴合)/.test(text)
  const hasAlignment = /身份\/金手指对齐|社会身份、身世、金手指、性格高度统一|显性身份[^。！？!?]{0,40}隐性身世[^。！？!?]{0,40}金手指|显性金手指[^。！？!?]{0,40}隐性金手指/.test(text)
  const mentionsGoldfinger = /金手指|系统|玉坠|重生记忆|显性身份|隐性身份|显性金手指|隐性金手指/.test(text)
  const delivered = !mismatch && (hasAlignment || !mentionsGoldfinger)
  return {
    key: 'identity_goldfinger_alignment_rules',
    label: '身份/金手指对齐',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? (hasAlignment ? 88 : 80) : 18,
    evidence: [
      hasAlignment ? '社会身份/身世/金手指/性格对齐' : '',
      !mentionsGoldfinger ? '本章未触发金手指对齐风险' : '',
      mismatch ? '身份与金手指不统一' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['社会身份、身世、金手指、性格没有和世界基调统一'],
    issue: delivered ? '' : '主角身份、身世、金手指或性格脱节，容易造成题材气质和主角逻辑漂移。',
    repair_instruction: delivered ? '' : '补身份/金手指对齐：把显性身份接到前期矛盾，把隐性身世接到中后期矛盾；金手指必须贴合主角职业、身份或生活困境，隐性金手指落到性格优势。',
  }
}

export function normalizeCharacterBehaviorAntagonistLogicCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasGoal = /为了|保住|想要|试图|必须|先用|又急着/.test(text)
  const hasMethod = /身份压人|转移证据焦点|抢先|压到|销毁|封口|抹成私怨|威胁|逼/.test(text)
  const hasConsequence = /反倒|露出|破绽|说漏|失去|被指出|停住/.test(text)
  const dumbVillain = /明明可以[^。！？!?]{0,40}却|站在原地嘲讽|主动把秘密告诉|反派(?:突然|莫名其妙)|降智/.test(text)
  const delivered = !dumbVillain && [hasGoal, hasMethod, hasConsequence].filter(Boolean).length >= 2
  return {
    key: 'antagonist_logic',
    label: '反派逻辑',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(16, [hasGoal, hasMethod, hasConsequence].filter(Boolean).length * 28),
    evidence: [hasGoal ? '反派目标' : '', hasMethod ? '反派手段' : '', hasConsequence ? '手段后果' : '', dumbVillain ? '反派降智' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '反派行为缺少目标、手段和后果，或出现降智送赢、站桩嘲讽、主动泄密。',
    repair_instruction: delivered ? '' : '从反派视角补一条能说通的目标和手段：他为什么这样做、能得到什么、为什么不能用更简单的办法。',
  }
}

export function normalizeCharacterBehaviorAntagonistWeightCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasStrength = /实力展示|亮出(?:手段|实力|身份|底牌)|长老席|身份压人|背书|封锁令|资源封锁|压迫|展示实力|展示[^。！？!?]{0,12}手段|手段/.test(text)
  const hasMotive = /为了|保住|想要|目标|动机|从他的视角|说得通/.test(text)
  const hasRealThreat = /真实威胁|赢过主角|至少赢|逼退|压制|压住|失去主动|造成损失|资格(?:被)?封|资格封锁|证据(?:来源)?被逼|证据反咬|陷入绝境|封锁|威胁/.test(text)
  const hasHiddenPurpose = /真实目的|终极意图|关键反转|暂不暴露|没有(?:立刻|开场)[^。！？!?]{0,24}(?:说出|说尽|暴露)|留到关键/.test(text)
  const hasMirror = /镜子|照出[^。！？!?]{0,24}弱点|长处[^。！？!?]{0,24}弱点|理念冲突|借规则压人|权威[^。！？!?]{0,24}退让/.test(text)
  const weakOrDumb = /纯粹的坏|只是(?:纯粹的)?坏|莫名其妙作恶|反派很弱|赢了也没意义|主动泄密|主动把秘密告诉|站桩嘲讽|降智送赢|开场[^。！？!?]{0,24}(?:说完|说尽|暴露)[^。！？!?]{0,24}真实目的/.test(text)
  const delivered = !weakOrDumb
    && hasStrength
    && hasMotive
    && hasRealThreat
    && (hasHiddenPurpose || hasMirror)
  const signalCount = [hasStrength, hasMotive, hasRealThreat, hasHiddenPurpose, hasMirror].filter(Boolean).length
  return {
    key: 'antagonist_weight_rules',
    label: '反派分量',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(14, signalCount * 18 - (weakOrDumb ? 20 : 0)),
    evidence: [
      hasStrength ? '实力/手段展示' : '',
      hasMotive ? '动机可信' : '',
      hasRealThreat ? '真实威胁或阶段压制' : '',
      hasHiddenPurpose ? '终极意图时机' : '',
      hasMirror ? '反派照出主角弱点' : '',
      weakOrDumb ? '反派弱化或降智送赢' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '反派缺少实力展示、可信动机、真实威胁或终极意图时机，导致主角胜利含金量不足。',
    repair_instruction: delivered ? '' : '补反派分量：先展示实力/手段和可信动机，制造真实威胁或至少一次压制；真实目的留到关键反转点，反派长处要照出主角弱点。',
  }
}

export function normalizeCharacterBehaviorAntagonistSelfStoryCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasSelfStory = /反派也有梦想|自己的故事|主人公|在他眼中|在他眼里|自己才是|梦想|信念|我只是/.test(text)
  const hasOldPain = /旧痛|创伤|当年|曾经|失去|避免|不再|痛苦|被[^。！？!?]{0,18}伤害|谁伤害/.test(text)
  const hasFatalFlaw = /优势[^。！？!?]{0,24}(?:致命缺陷|弱点)|长处[^。！？!?]{0,24}(?:致命缺陷|弱点)|守规则[^。！？!?]{0,24}致命缺陷|越是[^。！？!?]{0,24}越|强化缺陷/.test(text)
  const hasSympatheticSide = /恨不起来|侧面|也曾|保护|守住|病重|不是只想|不是纯粹|他的理由/.test(text)
  const hasIdeologyConflict = /理念冲突|不只是利益|信念|秩序|规则|个人证词|证据公道|价值|权威|自由|归属/.test(text)
  const flatTool = /纯工具人|只负责阻碍|只是(?:为了)?制造障碍|没有原因|没有自己的目标|脸谱化|纯粹的坏|疯子怪物|疯子|怪物|NPC/.test(text)
  const delivered = !flatTool
    && hasSelfStory
    && (hasOldPain || hasSympatheticSide)
    && (hasFatalFlaw || hasIdeologyConflict)
  const signalCount = [hasSelfStory, hasOldPain, hasFatalFlaw, hasSympatheticSide, hasIdeologyConflict].filter(Boolean).length
  return {
    key: 'antagonist_self_story_rules',
    label: '反派自我叙事',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(14, signalCount * 18 - (flatTool ? 20 : 0)),
    evidence: [
      hasSelfStory ? '反派自己的故事/梦想' : '',
      hasOldPain ? '旧痛或避免的痛苦' : '',
      hasFatalFlaw ? '优势即致命缺陷' : '',
      hasSympatheticSide ? '让人恨不起来的侧面' : '',
      hasIdeologyConflict ? '理念冲突' : '',
      flatTool ? '反派工具人/脸谱化' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '反派缺少自己的梦想、旧痛、致命缺陷或理念冲突，容易沦为只负责阻碍主角的工具人。',
    repair_instruction: delivered ? '' : '补反派自我叙事：让反派在自己眼中是主人公，补一个旧痛/创伤、一个让人恨不起来的侧面，并把他的优势写成会继续制造冲突的致命缺陷。',
  }
}

export function normalizeCharacterBehaviorAntagonistTierExitCheck(values: any[], chapterText: string) {
  const planned = characterBehaviorArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasTier = /反派层级表|按反派层级|定位为(?:小反派|中等反派|大弧\s*Boss|最终\s*Boss)|小反派|中等反派|大弧\s*Boss|最终\s*Boss/.test(text)
  const hasScopeMatch = /篇幅与层级匹配|1-5\s*章|10-30\s*章|单个小弧线|一卷主要对手|阶段核心矛盾|全书核心矛盾|一卷|数卷/.test(text)
  const hasRoleAndMeans = /主要对手|核心矛盾|武力|权谋|资源|手段|障碍|主题反面|账房资源|长老席权谋|连续施压/.test(text)
  const hasExitPlan = /退场|退场规划|被(?:主角)?(?:正面)?击败|揭穿|打败|干脆利落|爽感|仪式感|终战|落幕|余味/.test(text)
  const mentionsFinalBoss = /最终\s*Boss/.test(text)
  const hasFinalForeshadow = /从第一章[^。！？!?]{0,18}伏笔|第一章[^。！？!?]{0,18}伏笔|早有伏笔|长期伏笔/.test(text)
  const mismatch = /层级[^。！？!?]{0,16}篇幅[^。！？!?]{0,16}不匹配|篇幅[^。！？!?]{0,16}层级[^。！？!?]{0,16}不匹配|小反派[^。！？!?]{0,20}拖成三十章|大弧\s*Boss[^。！？!?]{0,30}(?:路人|随便退场)|最终\s*Boss[^。！？!?]{0,30}(?:没有第一章伏笔|没(?:有)?伏笔|突然冒出来|没有信念)|突然冒出来的怪物/.test(text)
  const finalBossOk = !mentionsFinalBoss || hasFinalForeshadow
  const delivered = !mismatch && hasTier && hasScopeMatch && hasRoleAndMeans && hasExitPlan && finalBossOk
  const signalCount = [hasTier, hasScopeMatch, hasRoleAndMeans, hasExitPlan, finalBossOk].filter(Boolean).length
  return {
    key: 'antagonist_tier_exit_rules',
    label: '反派层级退场',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, signalCount * 17 - (mismatch ? 20 : 0)),
    evidence: [
      hasTier ? '反派层级定位' : '',
      hasScopeMatch ? '篇幅/层级匹配' : '',
      hasRoleAndMeans ? '层级功能与手段' : '',
      hasExitPlan ? '退场或击败规划' : '',
      mentionsFinalBoss && hasFinalForeshadow ? '最终 Boss 早期伏笔' : '',
      mismatch ? '层级篇幅或退场错配' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '反派层级、出场篇幅、功能或退场方式没有匹配，容易出现小反派拖太久、大 Boss 草率退场或最终 Boss 无伏笔。',
    repair_instruction: delivered ? '' : '补反派层级与退场：先判定小反派/中等反派/大弧 Boss/最终 Boss，再匹配篇幅、功能、手段和退场方式；最终 Boss 必须补早期伏笔和信念。',
  }
}

export function buildCharacterBehaviorDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /忽然性格大变|什么也没想|突然(?:冲|答应|相信|放弃)|毫无理由|莫名其妙/.test(text) ? {
      key: 'sudden_behavior_shift',
      label: '行为突变',
      evidence: '正文出现无动机的突然转向或性格大变。',
      fix: '补起因、意图、约束和风险，让行动被压力推出。',
    } : null,
    /人设很复杂|性格很复杂|大家都知道他|他很聪明|他很厉害|他的人设/.test(text) ? {
      key: 'abstract_character_telling',
      label: '旁白贴人设',
      evidence: '正文用抽象评价替代行动证据。',
      fix: '把人设评价改成动作、对白、选择、代价和旁观者反应。',
    } : null,
    /(?:只在旁边|旁边).*?[“「"]你(?:太|真)[^”」"]*(?:厉害|聪明|强)[”」"]|你(?:太|真)[^。！？!?]{0,12}(?:厉害|聪明|强)/.test(text) ? {
      key: 'empty_supporting_role',
      label: '配角空夸',
      evidence: '配角只负责夸主角，没有提供证据、阻碍、反应或代价。',
      fix: '给配角现场功能，删掉空泛夸赞。',
    } : null,
    /明明可以[^。！？!?]{0,40}却|站在原地嘲讽|主动把秘密告诉|反派(?:突然|莫名其妙)|降智/.test(text) ? {
      key: 'dumb_antagonist',
      label: '反派降智',
      evidence: '反派选择明显更差方案、站桩嘲讽或主动泄密。',
      fix: '补反派目标、约束、手段和误判原因，主角破局要赢在策略而非反派送赢。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'character_behavior_forbidden',
    label: '角色行为硬伤',
    text: '角色行为不得无动机突变、旁白贴人设、配角空夸或反派降智送赢。',
    expected: '角色行为不得无动机突变、旁白贴人设、配角空夸或反派降智送赢。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项角色行为确定性风险。`,
    repair_instruction: '按 oh-story 角色行为口径修复：先补动机链，再用动作、对白、反应展示人设；配角必须有功能，反派必须有内在逻辑。',
  }
}

export function characterBehaviorPriority(missed: any[]) {
  if (missed.some(item => item.key === 'character_behavior_forbidden')) return '优先清角色行为硬伤'
  if (missed.some(item => item.key === 'protagonist_composure_rules')) return '优先修主角逼格反应'
  if (missed.some(item => item.key === 'motivation_specificity_rules')) return '优先补动机具体性'
  if (missed.some(item => item.key === 'motivation_chain')) return '优先补动机链'
  if (missed.some(item => item.key === 'antagonist_weight_rules')) return '优先补反派分量'
  if (missed.some(item => item.key === 'antagonist_self_story_rules')) return '优先补反派自我叙事'
  if (missed.some(item => item.key === 'antagonist_tier_exit_rules')) return '优先补反派层级退场'
  if (missed.some(item => item.key === 'antagonist_logic')) return '优先补反派逻辑'
  if (missed.some(item => item.key === 'character_driven_event_rules')) return '优先改成人推事件'
  if (missed.some(item => item.key === 'protagonist_red_line_rules')) return '优先修主角红线'
  if (missed.some(item => item.key === 'identity_goldfinger_alignment_rules')) return '优先校准身份/金手指'
  if (missed.some(item => item.key === 'behavior_repeat_rules')) return '优先补行为重复点'
  if (missed.some(item => item.key === 'supporting_role_exit_rules')) return '优先补配角退场'
  if (missed.some(item => item.key === 'role_card_requirements')) return '优先补角色卡'
  if (missed.some(item => item.key === 'supporting_role_functions')) return '优先补配角功能'
  if (missed.some(item => item.key === 'strong_association_rules')) return '优先补人设强关联'
  if (missed.some(item => item.key === 'memory_anchors')) return '优先补记忆锚点'
  if (missed.some(item => item.key === 'layered_tags')) return '优先补三层标签'
  return ''
}
