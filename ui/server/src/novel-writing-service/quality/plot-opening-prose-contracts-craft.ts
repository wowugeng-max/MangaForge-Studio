import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_PROSE_CRAFT_POV_RULES = [
  '深度限知：镜头锁在主视角角色的此刻感知里，只写他此刻看到、听到、闻到、摸到和身体感到的东西。',
  '读者与角色同步获知：角色不知道的不提前写，不用“他不知道的是”“如果她知道真相”等上帝预告。',
  '念头是动作的一部分：心理只允许闪念 + 身体反应，不写完整理性的内心分析。',
  '主观偏差代替客观定性：场景被角色当下情绪染色，但不能让作者跳出来盖棺断言。',
]

const OH_STORY_PROSE_CRAFT_EXPRESSION_RULES = [
  '身体细节替代情绪词：不用心痛、悲伤、愤怒、害怕、委屈、绝望直接告诉情绪。',
  '情绪表达优先级：动作 > 神态 > 思想 > 情绪词，能写手、眼、呼吸、嘴唇、肩背、伤疤就不写抽象感受。',
  '动态描写优于静态描写：人物特征用动作和反应展现，不靠形容词堆叠。',
  '环境必须与角色交互：没有物理、精神或题材功能的环境描写直接压缩。',
]

const OH_STORY_PROSE_CRAFT_SCENE_WEAVING_RULES = [
  '三维度揉进：每个详写子事件同时包含发生了什么、主角注意到什么、身体怎么回应。',
  '三个维度必须织进连续正文，不按“发生/感知/反应”分段堆叠。',
  '详写子事件约100-150字；过场、赶路、信息交代类子事件1-2句带过，把字数留给情绪节点。',
  '每个段落是一个镜头，必须有明确拍摄对象：动作、物件、表情、空间变化或关键信息。',
]

const OH_STORY_PROSE_CRAFT_SUBJECT_NAME_RHYTHM_RULES = [
  '主语与名字节奏：段首、场景切换、多人同场、视角重置时，用角色名建立主语。',
  '同一动作链/同一段内部，段中用代词/省略流动，优先用“他/她”、动作承接或省略主语。',
  '关键转折、情绪爆点、身份反差或读者需要重新盯住主角时，再点名强化。',
  '反面信号：连续多句或连续多段都以同一角色名开头，读起来像每句都在报名字。',
  '不要为了省主语造成指代不清；多人同场必须在段首、场景切换或视角重置处点名。',
]

const OH_STORY_PROSE_CRAFT_INDIRECT_DESCRIPTION_RULES = [
  '间接描写法：正面描写只是铺垫，侧面反应才是爽点；不要直接宣布“很厉害/很震撼/宇宙第一”。',
  '用配角动作、环境变化、围观者判断或对手失态证明爽点，例如嚼饼吃相、哄抢、停筷、改口、后退。',
  '强设定、强道具、强证据或强能力必须先给可见使用结果，再让懂行者/熟人/反派的差异化反应放大价值。',
  '侧面反应必须带来信息、关系、立场或风险变化，不能只写统一震惊。',
]

const OH_STORY_PROSE_CRAFT_THREE_CAMERA_RULES = [
  '三机位法：机位1近景写主角动作、表情、闪念和身体感受，负责推进主线与读者代入。',
  '三机位法：机位2远景写配角反应、环境变化和围观者判断，负责扩展信息面、制造反差并放大爽点。',
  '三机位法：机位3旁白只补必要设定、背景或人物关系；设定都由冲突引出，不能单独铺说明书。',
  '机位交替以机位1和机位2为核心，机位3穿插；每个详写小节至少有一次主角近景和一次外部反应或环境反馈。',
]

const OH_STORY_PROSE_CRAFT_THEN_WHAT_RULES = [
  '“然后呢”基点法：每一段文字都要回答读者心中的“然后呢”。',
  '写完一个信息点，立刻用下一个信息点接上：动作、发现、反应、选择、风险或新疑问。',
  '段尾不能停在静态总结、情绪判断或环境描写；必须留下可继续推进的因果钩、状态变化或下一步压力。',
  '连续信息点必须有承接关系，避免孤立设定、孤立心理和无后续的装饰句。',
]

const OH_STORY_PROSE_CRAFT_CORE_EMOTION_ALIGNMENT_RULES = [
  '围绕核心情绪设计全部情节：动笔前确定目标读者的核心情绪需求（被认可/复仇/恋爱/升级）。',
  '所有情节、人设、冲突和细节都必须围绕这根弦演奏，不能写成旁枝情绪、装饰细节或孤立互动。',
  '每个动作、物件、冲突和反应都要服务本章情绪目标、读者回报或全书核心情绪。',
  '宏观把控整体节奏和情绪走向，微观把控每段文字的细节和张力。',
]

const OH_STORY_PROSE_CRAFT_BAIMIAO_SENSORY_RULES = [
  '白描：用最少的字 + 最准确的信息和情绪勾勒画面，优先精准动词和名词。',
  '五感描写法：每个关键场景至少调动两到三种感官（视觉/听觉/触觉/嗅觉/味觉），但只写主角此刻主动感受到的细节。',
  '五感必须服务情绪：恐惧写冷、暗、静；兴奋写亮、快、响；感官锚点必须推动动作、规则、危险或对话判断。',
  '感官细节不能当装饰风景或堆砌氛围；删掉不改变信息、情绪或选择的描写。',
]

const OH_STORY_PROSE_CRAFT_DYNAMIC_DESCRIPTION_RULES = [
  '动态描写优于静态描写：人物特征必须用动作和反应展现，不用形容词堆。',
  '角色能力、身份、压力或魅力要通过他人停顿、退让、误判、抢答、改口或行动变化显出来。',
  '环境不要大段铺陈，必须在角色行动中穿插点染：碰到、推开、踩过、闻到、被光线拦住或被声音逼停。',
  '静态描述必须转成动作链、反应链或环境交互；删掉不改变局势、关系、信息或情绪的形容词堆叠。',
]

const OH_STORY_PROSE_CRAFT_SHOT_RHYTHM_RULES = [
  '镜头与分镜思维：每个段落 = 一个镜头，必须有明确拍摄对象。',
  '镜头类型要按功能切换：远景写环境/氛围，中景写人物关系，近景写表情/身体细节，特写写关键物品或情绪触发点。',
  '快节奏场面用短句、短段、密集动作和快速切换，适合冲突、追逐、打脸、揭露和危险升级。',
  '慢节奏场面可用长句、环境交互、心理闪念和静止镜头，适合余波、试探、关系变化和情绪沉淀。',
  '禁止连续远景铺环境或连续特写堆情绪；镜头变化必须带来信息、关系、风险或情绪强度变化。',
]

const OH_STORY_PROSE_CRAFT_TRANSITION_BRIDGE_RULES = [
  '场景切换与转场：用相似物、相似五感或相似情绪把两个场景接起来。',
  '时间跳转必须用动作或物件衔接，例如推门、翻账本、封条变软、钥匙落入掌心。',
  '空间跳转必须用声音或光影衔接，例如铃声、脚步声、门缝光、灯影或风声把镜头带到新地点。',
  '转场句必须带来位移、时间变化、情绪余波或新风险；没有功能的过渡句压缩或删除。',
]

const OH_STORY_PROSE_CRAFT_RHYTHM_RULES = [
  '一动一静：每个小节至少有1个动和1个静，动后必静，静后可动。',
  '不连续两节全动，避免暴力疲劳；不连续两节全静，避免节奏拖沓。',
  '情绪最高点用动：打脸、反转、揭露、冲突爆发要写具体动作。',
  '情绪最低点用静：心死、余韵、释然要写日常微动作或安静观察。',
]

const OH_STORY_PROSE_CRAFT_OBJECT_NUMBER_RULES = [
  '具体数字替代模糊描述：金额、年限、次数和时间要承载情感重量。',
  '数字变化推动情节：建立重量、伤害递增、反差暴击或时间重量必须有可见变化。',
  '贯穿道具三次出现：前1/4建立初始意义，中段转折颠覆意义，结尾形成情感暴击。',
  '道具类型可用信物型、工具型、痕迹型、数字型；每次出现都要改变读者理解。',
]

const OH_STORY_PROSE_CRAFT_SECTION_STRUCTURE_RULES = [
  '小节内部结构：每个小节必须有一个主事件 + 3-5 个子事件；主事件推进核心情节，子事件丰富层次。',
  '小节内部结构：每个小节必须有一个情绪变化和一条读者新获知的信息，不能只有环境、心情或设定说明。',
  '小节内部结构：常规冲突小节需要 3-5 轮对话交锋；独自发现、翻阅材料等场景可标零，但必须用动作/发现/反应补足。',
  '小节之间衔接：小节结尾留一个钩子，下一节开头快速接续，不重新铺垫，不另起无关天气、环境或背景。',
  '小节之间衔接：情绪跨节递进，每一节情绪强度不低于上一节；峰值后最多维持一节，不允许骤降。',
]

const OH_STORY_PROSE_CRAFT_SECTION_DENSITY_RULES = [
  '小节密度诊断：场景或小节偏短时先查子事件三维度、感官细节、身体动作和对话交锋是否缺失。',
  '冲突/对抗偏短时补阻碍；涉及配角时补反应；空间移动时补发现；连续动作时补递进。',
  '只有主事件触发回忆时，才补 2-3 句简短回忆；回忆必须服务当下选择或信息变化。',
  '扩写优先补动作过程、选择代价、信息增量和关系变化，不把字数摊给无功能描写。',
]

const OH_STORY_PROSE_CRAFT_ANTI_PADDING_RULES = [
  '不得为凑字数加环境描写、天气风景、室内摆设或氛围句。',
  '不得为凑字数重复已表达的情绪、重复已知信息或复述上一段结论。',
  '不得为凑字数追加角色内心独白总结、自言自语解释或作者评语。',
  '不得让角色做无意义动作；动作必须改变空间、信息、关系、情绪或危险判断。',
]

const OH_STORY_PROSE_CRAFT_CONCEPT_ANCHOR_RULES = [
  '新名词/新设定/新道具首次出现时，必须靠角色动作反应、对话半句或场景物理后果给读者一个当下作用锚点。',
  '删解释腔不等于把读者读懵：不要整段讲来历/原理/等级，也不要只甩零信息生词。',
  '锚点必须是角色此刻撞上的可感知后果：按上、触发、炸开、浮出、刺痛、亮起、暴露证据或改变选择。',
]

const OH_STORY_PROSE_CRAFT_DESCRIPTION_LIMITS = [
  '水分控制：水分 = 不推动剧情也不塑造人物的内容；合理的水必须承担伏笔铺垫、氛围营造或角色互动中的暗流。',
  '检验法：删掉这段后读者会不会困惑；如果读者不会困惑 = 水，必须删除或压缩。',
  '环境、心理、旁白和回忆都必须服务动作、信息、关系、风险或情绪变化；不能单独成装饰段。',
  '一个词能说清的不用一句话；描写优先保留精准动词、名词和有效感官。',
]

const OH_STORY_PROSE_CRAFT_ANTI_AI_SMELL_RULES = [
  '高危词扫描：仿佛、犹如、一丝、一抹、深吸一口气、缓缓、不禁、眼中闪过、嘴角勾起、眉头微皱、不容置疑、不易察觉高频出现时必须替换或删除。',
  '章末总结体禁止：不用总结性感悟、升华式感叹、哲理式收尾或“他不知道的是/更大的风暴”预告，章尾用动作、对话或悬念收束。',
  '叠加式描写禁止：不要把同一动作拆成发生、感知、身体反应三段重复，必须揉进同一段连续画面。',
  '心理告知和公式化对话标签要降频：不用“他感到/他觉得/带着一丝...”替代表现，普通“说”可保留，高频机械标签用动作、语气或上下文承接。',
]

const OH_STORY_PROSE_CRAFT_FORBIDDEN = [
  '他不知道的是、如果她知道真相、此时的他还不知道等上帝视角预告。',
  '直接写心痛、悲伤、愤怒、害怕、委屈、绝望等抽象情绪词替代正文证据。',
  '堆叠式描写：发生、感知、反应拆成三段依次解释，同一个动作被掰开写三遍。',
  '无意义环境描写、重复已知信息、角色自言自语总结、万能比喻和作者下场解释。',
  '高频公式词：仿佛、犹如、一丝、一抹、深吸一口气、缓缓、不禁、眼中闪过、嘴角勾起、眉头微皱。',
]

const OH_STORY_PROSE_CRAFT_CHECKS = [
  '每个详写子事件必须完成三维度揉进：发生、感知、身体反应都有正文证据。',
  '正文必须保持深度限知，不能出现角色不知道的信息、上帝预告或作者总结式解释。',
  '情绪必须落到身体细节、动作、对话或场面反应，不能用抽象情绪词替代。',
  '强度、爽点、设定价值和证据价值必须用间接描写法证明，先给可见结果，再给侧面反应，不能直接宣布很厉害。',
  '三机位法必须可见：机位1贴主角近景，机位2给外部反应或环境变化，机位3只在冲突触发时补必要旁白。',
  '每段必须执行“然后呢”基点法，信息点之后立刻接下一动作、发现、反应、选择、风险或新疑问。',
  '每个动作、物件、冲突和反应都必须服务核心情绪、读者回报或本章情绪目标，不能脱线成旁枝情绪。',
  '白描与五感必须服务正文功能：用最少的字写准信息和情绪，关键场景至少调动两到三种感官但不得装饰化。',
  '动态描写优于静态描写：人物特征必须用动作和反应展现，环境必须在角色行动中穿插点染。',
  '镜头与分镜思维必须可见：段落有明确拍摄对象，远景/中景/近景/特写服务信息、关系、风险或情绪变化。',
  '场景切换与转场必须有桥：相似物/相似五感/相似情绪、动作或物件、声音或光影至少一项可见。',
  '一动一静节奏必须可见，不能连续全动造成疲劳，也不能连续全静拖沓。',
  '关键物件或具体数字必须承担剧情/情绪功能，不能只是装饰性细节。',
  '小节内部结构必须可见：一个主事件、3-5 个子事件、一个情绪变化、一条新信息和必要的 3-5 轮对话交锋。',
  '小节之间必须钩子接续：上一节末尾留问题/动作/情绪钩子，下一节开头快速接住，不重新铺垫，情绪跨节递进。',
  '偏短小节必须先执行小节密度诊断，只能补感官细节、身体动作、对话交锋、阻碍/反应/发现/递进或简短回忆。',
  '新概念首次出现必须有当下作用锚点：动作反应、对话半句或物理后果至少一项可见。',
  '环境描写必须与角色行动、危险、规则、关系或情绪发生交互；无交互环境要删或压缩。',
  '水分控制必须可见：删掉后读者不会困惑的环境、心理、旁白、回忆或重复信息必须删除或压缩。',
  'anti_ai_smell_rules 必须执行：高危词、章末总结体、叠加式描写和心理告知不得残留为正文主要表达方式。',
  '段落镜头必须有明确拍摄对象，不能连续空泛解释、心理总结或信息水文。',
]

const OH_STORY_PUNCTUATION_TONE_MAP = [
  '压迫 / 冷静 / 克制：用短句、逗号、句号或冒号压出判断落点；不为了变化乱加感叹号。',
  '质问 / 试探 / 反问：关键问题用问号和短促追问片段，配合动作停顿；避免连续多句全以问号结尾。',
  '惊讶 / 爆发 / 打脸：真正爆点只保留少量感叹号，爆点前后用短句或单句成段承接；禁止整段喊叫。',
  '犹豫 / 吞咽 / 未说完：用逗号、句号、短句、换行或动作 beat 表达停顿；不用省略号或破折号硬造停顿。',
]

const OH_STORY_PUNCTUATION_FORBIDDEN = [
  '正文不使用 ……、...、——、—、-- 或独立行 --- 作为停顿工具。',
  '禁止无功能堆砌 ???、！！！、?!、!?；问号和感叹号必须服务质问、爆发或人物声线。',
  '不要把质问、爆发、迟疑全部压成句号；通篇句号化会抹平人物声线和情绪节奏。',
  '对话被打断、吞回去或拖长时，优先用动作停顿、短句断开或换行承接。',
]

const OH_STORY_PUNCTUATION_TONE_CHECKS = [
  '标点必须服务语气、人物声线和情绪节奏，不能通篇句号化。',
  '质问、试探、反问必须有功能性问号或短促追问，不能被全部压平成陈述句。',
  '爆发、打脸和揭露只在峰值保留少量感叹号，不能随机标点堆砌或整段喊叫。',
  '犹豫、打断和未尽必须改成动作、短句、逗号、句号或换行，不得残留 ……、——、—、--。',
  '每个关键对话 beat 的标点要匹配关系、场合和目的；不同角色不能说话节奏完全一样。',
]

function punctuationToneExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.punctuation_tone_contract
    || contextPackage?.chapter_target?.punctuationToneContract
    || contextPackage?.punctuation_tone_contract
    || contextPackage?.punctuationToneContract
    || contextPackage?.pre_draft_brief?.punctuation_tone_contract
    || contextPackage?.preDraftBrief?.punctuationToneContract
}

function inferSceneTonePlan(scene: any, index: number) {
  const text = [
    scene?.title,
    scene?.purpose,
    scene?.conflict,
    scene?.reader_payoff,
    scene?.reversal,
    scene?.turning_point,
    scene?.key_dialogue,
  ].filter(Boolean).join(' ')
  let tone = '压迫 / 冷静 / 克制'
  let instruction = '用短句、逗号和句号压出现场判断，不把克制写成通篇平铺句号。'
  if (/问|质问|反问|试探|逼问|追问|盘问/.test(text)) {
    tone = '质问 / 试探 / 反问'
    instruction = '关键问题保留功能性问号，追问用短句或动作停顿承接，避免连续满屏问号。'
  } else if (/爆发|打脸|揭露|反杀|失控|震惊|怒|喊|崩/.test(text)) {
    tone = '惊讶 / 爆发 / 打脸'
    instruction = '只在情绪峰值保留少量感叹号，爆点前后用短句或单句成段承接。'
  } else if (/犹豫|迟疑|吞|不敢|心虚|打断|沉默/.test(text)) {
    tone = '犹豫 / 吞咽 / 未说完'
    instruction = '用动作、短句、逗号、句号或换行表现停顿，不用省略号或破折号。'
  }
  return `场景${scene?.scene_no || index + 1}：${tone}；${instruction}`
}

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
