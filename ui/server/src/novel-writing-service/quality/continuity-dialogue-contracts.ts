import { asArray } from '../../routes/novel-route-utils'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { buildOhStoryMainlineDefinitionContract } from '../../routes/novel-mainline-definition-contract'
import { buildOhStoryStoryPowerContract } from '../../routes/novel-story-power-contract'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { continuityHeatExplicitContract } from './intent-benchmark-contracts'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
export {
  storylineUsageByAnyType,
  buildContinuityHeatContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
  buildMainlineDefinitionContract,
} from './continuity-heat-contracts'


type AnyFn = (...args: any[]) => any

let normalizeLongformMemoryCapsule: AnyFn = (value: any = {}) => value || {}

export function bindContinuityDialogueContractDeps(deps: {
  normalizeLongformMemoryCapsule?: AnyFn
} = {}) {
  if (deps.normalizeLongformMemoryCapsule) normalizeLongformMemoryCapsule = deps.normalizeLongformMemoryCapsule
}

const OH_STORY_DIALOGUE_QUALITY_CHECKS = [
  '每句对白至少承担推进剧情、增加期待感或展示人设之一，否则删除或改写。',
  '对话长度 = 权力地位：掌控者短句冷静，被动者话多且情绪化。',
  '角色必须有议程和潜台词，真实目的不能全部浅显写在台词里。',
  '信息展示必须用角色语气和立场包裹，避免说明书式对话。',
  '主要角色声线要有差异：口癖、节奏、信息偏好、身份措辞和关系阶段不能同腔。',
  '情绪推动要有递进，不能从一种情绪跳到相反情绪而没有事件触发。',
]

const OH_STORY_DIALOGUE_MODE_PLAYBOOKS = [
  '压制模式：对方长篇大论 3-5 行 -> 主角一字回应，用短句把权力压回主角手里。',
  '反转模式：对方嚣张 2-3 行 -> 主角亮出 1 行事实 -> 对方沉默，让信息反转完成权力易主。',
  '心死模式：对话越回越短，从辩解到沉默到“随意”，不要用长解释替代关系破裂。',
]

const OH_STORY_DIALOGUE_POWER_LENGTH_RULES = [
  '掌控者/主角亮底牌时对白 ≤ 10 字，不加动作描写。',
  '被压制方对白 ≥ 20 字，可加攥拳、咬唇、站起来等动作描写。',
  '两人对话时：短句方 = 权力上位，长句方 = 权力下位；权力易主必须体现为话语长度突变。',
]

const OH_STORY_DIALOGUE_SUBTEXT_AGENDA_RULES = [
  '真实动机绝对不能浅显地写在台词里，台词只露出角色愿意暴露的借口、试探或防御。',
  '每句对白同时设计角色的动机和借口；动机可以角色自己都没意识到，借口必须能在场景里成立。',
  '每个角色进入对话时都要有自己的议程：想从这场对话中得到什么；两个角色的议程碰撞才有张力。',
  '双方议程一致或同立场复述时，对话会失去意义，必须改成信息差、立场差、利益差或关系压力。',
]

const OH_STORY_DIALOGUE_TONE_CONTEXT_RULES = [
  '关系 × 场合 × 目的 = 语气；同一句话在私人、公众、熟人场合必须有不同措辞和信息量。',
  '私人单对单适合深入、密谋、表白或内心剖白；公众场合必须考虑体面，除非要制造当众翻脸的冲击力。',
  '私密的话在公众场合说才有冲击力；不能完全表达的内容用动作、神态、环境或沉默补足。',
]

const OH_STORY_DIALOGUE_EMOTION_PUSH_RULES = [
  '命令式+否定式最能激发读者情绪，例如“我说的还不够清楚吗？”这类压迫句要服务冲突升级。',
  '打着为你好的幌子，句句不离关心但句句都是嫌弃、指责或厌恶，适合写软性压迫和关系撕裂。',
  '直接否定比含蓄暗示更伤人；强情绪对白要让读者看到被否定的目标、尊严或关系。',
]

const OH_STORY_DIALOGUE_EMOTION_CONTINUITY_RULES = [
  '角色情绪必须连续、循序渐进；从生气到高兴必须经过不那么生气、不生气等过渡，不能跳步。',
  '每次转变需对应事件触发；没有新信息、新动作、新代价或新关系压力，就不能让情绪突然反向。',
  '情绪四步法：遇到事件（失衡状态）-> 情绪反应（动作/表情/语言）-> 内心思考（或明确没有思考）-> 采取行动。',
]

const OH_STORY_DIALOGUE_DRIVE_RULES = [
  '对话本身带来/强化某个核心驱动力：期待、爽感或悬念，不能只是交换已知信息。',
  '信息交流要有阻碍：隐瞒、误导、身份压力、规则限制或第三方打断；阻碍要推动新的驱动力到来。',
  '对话发展可以突然脱离读者预期，但必须合理、符合人设；上行和下行交替，让情绪像拉锯一样拉升期待。',
]

const OH_STORY_DIALOGUE_INFORMATION_EMBED_RULES = [
  '大量信息不能全靠对话展示；要拆进情节、心理描写、旁白、环境或动作里，避免对白变成设定说明书。',
  '用角色的语气和立场包裹信息，不是机械陈述设定；同一规则要带着角色利益、恐惧、误解或目的说出来。',
  '设定用到哪个稍微带出来就行，不需要完完整整讲明白前因后果；未用到的信息留到冲突触发时再释放。',
]

const OH_STORY_DIALOGUE_INFORMATION_TENSION_RULES = [
  '普通疑问先拉悬念：用“听说……”或不完整消息制造期待，不要第一句就把答案讲完。',
  '下行 + 拉期待：让质疑、否认、误判或嘲讽先压低预期，再让信息反转带来回报。',
  '展露核心信息 + 达成爽点：关键信息必须改变局势、关系或读者判断；信息释放后要有角色反应或行动后果。',
]

const OH_STORY_DIALOGUE_VOICE_DIFFERENTIATION_RULES = [
  '口癖和惯用语：给每个主要角色一个标志性用词或惯用句，但不要密集重复到像标签。',
  '说话节奏：长篇大论、短句连击、停顿试探、直接打断要随角色身份、情绪和权力位置变化。',
  '信息偏好：技术型带专业术语，江湖人带切口，务实派先讲代价，乐观派先讲可能性。',
  '立场固定：每个角色长期从自己的角度发言，悲观派、乐观派、务实派、利益派不能临场同腔。',
  '身份影响措辞：老者、少年、贵族、市井、上位者、下位者的自称、敬谦词、句式和命令感要不同。',
  '性格影响语气：智谋型话里有话，鲁莽型想到什么说什么，冷静型措辞精确，偶尔情感外露才有冲击。',
  '关系阶段不同：初见、熟悉、对立、亲密时，称呼、信息量、冒犯边界和试探方式必须改变。',
]

const OH_STORY_DIALOGUE_SPECTATOR_RULES = [
  '弹幕/群众对话只做锦上添花：推进剧情、增加期待或情绪渲染，不代替主线行动和核心对抗。',
  '设计过的递进层级：普通人震惊 -> 专业人士分析 -> 特殊身份者反应 -> 情感升华。',
  '不同人格化语气，不能每条都一个味；普通人、专业人士、特殊身份者要有不同词汇、判断依据和情绪温度。',
  '短小精悍，每条群众反应不超过一句话核心信息，避免连续空喊“厉害”“震惊”。',
  '善用递进：从最初震惊到逐渐认识全貌；可安排看似路人的反转角色，一句话改变所有人认知。',
  '不用每章都写，只在关键爽点、燃点、泪点前后集中使用，避免喧宾夺主。',
]

const OH_STORY_DIALOGUE_SUPPORTING_SPEAKER_LIMIT_RULES = [
  '同一场景配角不超过 3 个有台词，超过时合并为旁观反应、动作或叙事一句话概括。',
  '每个配角必须有明确功能：推动剧情、衬托主角、提供信息或制造情绪；没有功能的角色不要出场。',
  '配角退场要主动规划，临时发言角色不要写着写着忘掉。',
]

const OH_STORY_DIALOGUE_RHYTHM_RULES = [
  '不要删掉表现人物性格的语气助词来“精简”；删掉后干巴巴，说明对白本身缺信息量，需要重写而不是硬剪。',
  '大量对话段落间必须穿插动作描写、环境变化或心理活动调节节奏，避免连续对白墙。',
  '紧张段落对话短促，舒缓段落可以长一些；节奏必须跟危险、情绪和信息压力同步。',
  '关键信息放对话开头或结尾，中间用于拉扯情绪，不把核心信息埋在长篇解释中间。',
  '动作和表情只在关键转折处使用效果最好；刻意给每句对话配表情/动作会让行文机械。',
  '连续多轮对话后需要换气，插入环境描写、角色心理、动作描写、换行或短句制造停顿。',
  '适当停顿比连续输出更有张力；“你确定？”这类短句往往比长篇解释更有压迫感。',
]

const OH_STORY_DIALOGUE_VOLUME_RULES = [
  '对话过多时：读者已知信息的对话用叙事一句话概括，只保留会改变关系、信息差或行动选择的对白。',
  '能用突发状况替代的对话段落直接替换，让事件逼角色行动，不靠几页解释推动。',
  '语气词删掉后干巴巴，说明对话本身缺乏信息量；不要只删语气词，要重写对白功能。',
  '对话过少时：能用其他人物对话讲出来的东西，不要让主角旁白平铺直叙。',
  '引入配角参与冲突和对话，但新人物必须安排主线戏份，不能只当一次性说明工具。',
]

const OH_STORY_DIALOGUE_MEME_RULES = [
  '梗式对白用“说不出来但意思到了”的状态制造趣味，不写成解释梗、堆热梗或复读网络原句。',
  '在对话中融入梗或骚话，必须服务角色口吻、情绪共鸣、吐槽节奏或传播点。',
  '特别是主角或重要配角的突出对话，适合用梗强化记忆点，但不能压过冲突和人物目的。',
  '可用某个梗作为高潮点，让整段剧情围绕达成这个梗来设计；不能在高潮外硬塞无关包袱。',
  '不得直接复刻热梗原句或 meme_bank 的 unsafe_direct_phrases；只抽象为节奏、误说、反差或情绪落点。',
  '严肃死亡、高压恐怖和关键情绪爆点处不玩梗，除非 meme_strategy 明确允许且不会破坏沉浸。',
]

const OH_STORY_DIALOGUE_AUDIT_RULES = [
  '三大自查项：是否存在大量信息都必须用对话来展示；对话是否是问答式的一问一答；是否习惯依赖对话来推动剧情或人物变化。',
  '权力博弈审计：掌控者对话 <= 10 字，被压制方 >= 20 字，并确认压制/反转/心死模式在场景里明确落地。',
  '潜台词与议程审计：每个角色进入对话时必须有自己的议程，真实动机不在台词中，动机要藏在借口、试探、回避或行动里。',
  '人物差异化审计：遮住角色名后能否区分是谁在说话；按口癖、节奏、信息偏好、立场、身份、性格和关系阶段七维检查。',
  '弹幕递进审计：群众/弹幕反应是否从普通人震惊 -> 专业人士分析 -> 特殊身份反应递进，不能只有同质化惊叹。',
  '对话推动剧情审计：每段对话结束时，剧情、关系、信息差、危险或期待必须往前推一步。',
  '篇幅控制审计：单次对话不超过全节 40%，并确认信息密度足够；超过时拆成事件、动作、心理、旁白或环境承接。',
  '自然度审计：逐句检查对白是否像自然口语交流，而非书面化问答稿；对话结尾能否预示接下来的节奏变化。',
]

export function inferDialogueMode(scene: any) {
  const sceneType = String(scene?.scene_type || scene?.sceneType || '').toLowerCase()
  const text = [
    scene?.purpose,
    scene?.conflict,
    scene?.reversal,
    scene?.turning_point,
    scene?.key_dialogue,
    scene?.dialogue_goal,
  ].filter(Boolean).join(' ')
  if (scene?.reversal || scene?.turning_point || scene?.key_dialogue || /反转|底牌|露馅|破绽|说漏/.test(text)) return '反转模式'
  if (/压迫|压制|打脸|碾压|身份压人/.test(text)) return '压制模式'
  if (sceneType === 'emotion' || /心死|破裂|拉扯|误解|和解/.test(text)) return '情绪推动'
  if (/设定|规则|世界观|信息|解释/.test(text)) return '信息嵌入'
  if (sceneType === 'dialogue') return '潜台词与议程'
  return '日常模式'
}

const OH_STORY_DIALOGUE_EXECUTION_LINE_FUNCTIONS = [
  '每句对白至少承担推进剧情、增加期待感或展示人设之一',
  '对话结束必须让信息差、关系、危险或下一步期待发生变化',
]

const OH_STORY_DIALOGUE_EXECUTION_EMOTION_FLOW = [
  '逐句回应上一句对方的情绪状态（承接/偏转/升级/退缩）',
  '情绪转变必须有事件、新信息、动作或代价触发',
]

const OH_STORY_DIALOGUE_EXECUTION_INFORMATION_STRATEGY = [
  '用角色语气、立场、追问、误导或动作承接信息',
  '设定只带当下用到的一点，不能一次讲完前因后果',
]

const OH_STORY_DIALOGUE_EXECUTION_FORBIDDEN_PATTERNS = [
  '说明书式对白',
  '问答式一问一答',
  '读者已知信息互相解释',
  '所有角色同腔',
  '配角无脑夸主角',
]

export function normalizeDialogueExecutionChecklist(value: any) {
  return asArray(value)
    .map((item: any, index: number) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        const text = compactBriefText(item)
        if (!text) return null
        return {
          scene_no: index + 1,
          scene: text,
          mode: '潜台词与议程',
          speaker_agendas: [],
          line_functions: OH_STORY_DIALOGUE_EXECUTION_LINE_FUNCTIONS,
          emotion_flow: OH_STORY_DIALOGUE_EXECUTION_EMOTION_FLOW,
          information_strategy: OH_STORY_DIALOGUE_EXECUTION_INFORMATION_STRATEGY,
          voice_differentiation: [],
          forbidden_patterns: OH_STORY_DIALOGUE_EXECUTION_FORBIDDEN_PATTERNS,
          receipt_keys: ['dialogue_checks', 'scene_card_receipts'],
        }
      }
      const sceneNo = Number(item.scene_no ?? item.sceneNo ?? index + 1) || index + 1
      const scene = compactBriefText(item.scene || item.title || item.scene_title || item.sceneTitle || `场景${sceneNo}`)
      const mode = compactBriefText(item.mode || item.dialogue_mode || item.dialogueMode || '潜台词与议程')
      return {
        scene_no: sceneNo,
        scene,
        mode,
        speaker_agendas: asArray(item.speaker_agendas || item.speakerAgendas).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        line_functions: asArray(item.line_functions || item.lineFunctions).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        emotion_flow: asArray(item.emotion_flow || item.emotionFlow).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        information_strategy: asArray(item.information_strategy || item.informationStrategy).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        voice_differentiation: asArray(item.voice_differentiation || item.voiceDifferentiation).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        forbidden_patterns: asArray(item.forbidden_patterns || item.forbiddenPatterns).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
        receipt_keys: asArray(item.receipt_keys || item.receiptKeys).map((row: any) => compactBriefText(row)).filter(Boolean).slice(0, 6),
      }
    })
    .filter(Boolean)
    .map((item: any, index: number) => ({
      scene_no: item.scene_no || index + 1,
      scene: item.scene || `场景${index + 1}`,
      mode: item.mode || '潜台词与议程',
      speaker_agendas: item.speaker_agendas?.length ? item.speaker_agendas : [],
      line_functions: item.line_functions?.length ? item.line_functions : OH_STORY_DIALOGUE_EXECUTION_LINE_FUNCTIONS,
      emotion_flow: item.emotion_flow?.length ? item.emotion_flow : OH_STORY_DIALOGUE_EXECUTION_EMOTION_FLOW,
      information_strategy: item.information_strategy?.length ? item.information_strategy : OH_STORY_DIALOGUE_EXECUTION_INFORMATION_STRATEGY,
      voice_differentiation: item.voice_differentiation?.length ? item.voice_differentiation : [],
      forbidden_patterns: item.forbidden_patterns?.length ? item.forbidden_patterns : OH_STORY_DIALOGUE_EXECUTION_FORBIDDEN_PATTERNS,
      receipt_keys: item.receipt_keys?.length ? item.receipt_keys : ['dialogue_checks', 'scene_card_receipts'],
    }))
}

export function buildDialogueExecutionChecklist(sceneCards: any[], characterArc: any = {}, target: any = {}) {
  const scenes = sceneCards.length ? sceneCards : [target].filter(Boolean)
  return normalizeDialogueExecutionChecklist(scenes.slice(0, 8).map((scene: any, index: number) => {
    const sceneNo = Number(scene?.scene_no ?? scene?.sceneNo ?? index + 1) || index + 1
    const sceneTitle = compactBriefText(scene?.title || scene?.scene_title || scene?.sceneTitle || scene?.purpose || target?.title || `场景${sceneNo}`)
    const characters = asArray(scene?.characters_present || scene?.charactersPresent || scene?.characters)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
      .slice(0, 4)
    const voiceAnchors = uniqueBriefStrings([
      scene?.character_voice,
      scene?.voice_focus,
      scene?.voice_rule,
      characterArc?.voice_anchor,
      characterArc?.voiceAnchor,
    ].map((item: any) => compactBriefText(item)).filter(Boolean), 6)
    const speakerAgendas = uniqueBriefStrings([
      scene?.dialogue_goal ? `对白目标：${compactBriefText(scene.dialogue_goal)}` : '',
      scene?.dialogueGoal ? `对白目标：${compactBriefText(scene.dialogueGoal)}` : '',
      scene?.conflict ? `议程碰撞：${compactBriefText(scene.conflict)}` : '',
      characters.length ? `出场角色：${characters.join('、')}；每人必须承担信息提供、情绪放大或冲突制造之一` : '',
    ], 6)
    return {
      scene_no: sceneNo,
      scene: sceneTitle,
      mode: inferDialogueMode(scene),
      speaker_agendas: speakerAgendas,
      line_functions: OH_STORY_DIALOGUE_EXECUTION_LINE_FUNCTIONS,
      emotion_flow: OH_STORY_DIALOGUE_EXECUTION_EMOTION_FLOW,
      information_strategy: OH_STORY_DIALOGUE_EXECUTION_INFORMATION_STRATEGY,
      voice_differentiation: voiceAnchors.length
        ? voiceAnchors
        : ['遮住角色名后仍能靠口癖、句长、信息偏好、身份措辞和关系阶段区分说话人'],
      forbidden_patterns: OH_STORY_DIALOGUE_EXECUTION_FORBIDDEN_PATTERNS,
      receipt_keys: ['dialogue_checks', 'scene_card_receipts'],
    }
  }))
}

export function buildDialogueContract(contextPackage: any = {}) {
  const explicit = contextPackage?.chapter_target?.dialogue_contract
    || contextPackage?.chapter_target?.dialogueContract
    || contextPackage?.dialogue_contract
    || contextPackage?.dialogueContract
    || contextPackage?.pre_draft_brief?.dialogue_contract
    || contextPackage?.preDraftBrief?.dialogueContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildDialogueContract({
      ...(contextPackage || {}),
      dialogue_contract: null,
      dialogueContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            dialogue_contract: null,
            dialogueContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            dialogue_contract: null,
            dialogueContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            dialogue_contract: null,
            dialogueContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitSceneModes = asArray(explicit.scene_modes || explicit.sceneModes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitVoiceAnchors = asArray(explicit.voice_anchors || explicit.voiceAnchors).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueGoals = asArray(explicit.dialogue_goals || explicit.dialogueGoals).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitKeyLines = asArray(explicit.key_lines || explicit.keyLines).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRelationshipMoves = asArray(explicit.relationship_moves || explicit.relationshipMoves).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitModePlaybooks = asArray(explicit.mode_playbooks || explicit.modePlaybooks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPowerLengthRules = asArray(explicit.power_length_rules || explicit.powerLengthRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSubtextAgendaRules = asArray(explicit.subtext_agenda_rules || explicit.subtextAgendaRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitToneContextRules = asArray(explicit.tone_context_rules || explicit.toneContextRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionPushRules = asArray(explicit.emotion_push_rules || explicit.emotionPushRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionContinuityRules = asArray(explicit.emotion_continuity_rules || explicit.emotionContinuityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueDriveRules = asArray(explicit.dialogue_drive_rules || explicit.dialogueDriveRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationEmbedRules = asArray(explicit.information_embed_rules || explicit.informationEmbedRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationTensionRules = asArray(explicit.information_tension_rules || explicit.informationTensionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitVoiceDifferentiationRules = asArray(explicit.voice_differentiation_rules || explicit.voiceDifferentiationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSpectatorDialogueRules = asArray(explicit.spectator_dialogue_rules || explicit.spectatorDialogueRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportingSpeakerLimitRules = asArray(explicit.supporting_speaker_limit_rules || explicit.supportingSpeakerLimitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueRhythmRules = asArray(explicit.dialogue_rhythm_rules || explicit.dialogueRhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueVolumeRules = asArray(explicit.dialogue_volume_rules || explicit.dialogueVolumeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueMemeRules = asArray(explicit.dialogue_meme_rules || explicit.dialogueMemeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueAuditRules = asArray(explicit.dialogue_audit_rules || explicit.dialogueAuditRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueExecutionChecklist = normalizeDialogueExecutionChecklist(explicit.dialogue_execution_checklist || explicit.dialogueExecutionChecklist)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_dialogue_contract_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      scene_modes: explicitSceneModes.length ? explicitSceneModes : asArray(derived.scene_modes),
      voice_anchors: explicitVoiceAnchors.length ? explicitVoiceAnchors : asArray(derived.voice_anchors),
      dialogue_goals: explicitDialogueGoals.length ? explicitDialogueGoals : asArray(derived.dialogue_goals),
      key_lines: explicitKeyLines.length ? explicitKeyLines : asArray(derived.key_lines),
      relationship_moves: explicitRelationshipMoves.length ? explicitRelationshipMoves : asArray(derived.relationship_moves),
      mode_playbooks: explicitModePlaybooks.length
        ? explicitModePlaybooks
        : (asArray(derived.mode_playbooks).length ? asArray(derived.mode_playbooks) : OH_STORY_DIALOGUE_MODE_PLAYBOOKS),
      power_length_rules: explicitPowerLengthRules.length
        ? explicitPowerLengthRules
        : (asArray(derived.power_length_rules).length ? asArray(derived.power_length_rules) : OH_STORY_DIALOGUE_POWER_LENGTH_RULES),
      subtext_agenda_rules: explicitSubtextAgendaRules.length
        ? explicitSubtextAgendaRules
        : (asArray(derived.subtext_agenda_rules).length ? asArray(derived.subtext_agenda_rules) : OH_STORY_DIALOGUE_SUBTEXT_AGENDA_RULES),
      tone_context_rules: explicitToneContextRules.length
        ? explicitToneContextRules
        : (asArray(derived.tone_context_rules).length ? asArray(derived.tone_context_rules) : OH_STORY_DIALOGUE_TONE_CONTEXT_RULES),
      emotion_push_rules: explicitEmotionPushRules.length
        ? explicitEmotionPushRules
        : (asArray(derived.emotion_push_rules).length ? asArray(derived.emotion_push_rules) : OH_STORY_DIALOGUE_EMOTION_PUSH_RULES),
      emotion_continuity_rules: explicitEmotionContinuityRules.length
        ? explicitEmotionContinuityRules
        : (asArray(derived.emotion_continuity_rules).length ? asArray(derived.emotion_continuity_rules) : OH_STORY_DIALOGUE_EMOTION_CONTINUITY_RULES),
      dialogue_drive_rules: explicitDialogueDriveRules.length
        ? explicitDialogueDriveRules
        : (asArray(derived.dialogue_drive_rules).length ? asArray(derived.dialogue_drive_rules) : OH_STORY_DIALOGUE_DRIVE_RULES),
      information_embed_rules: explicitInformationEmbedRules.length
        ? explicitInformationEmbedRules
        : (asArray(derived.information_embed_rules).length ? asArray(derived.information_embed_rules) : OH_STORY_DIALOGUE_INFORMATION_EMBED_RULES),
      information_tension_rules: explicitInformationTensionRules.length
        ? explicitInformationTensionRules
        : (asArray(derived.information_tension_rules).length ? asArray(derived.information_tension_rules) : OH_STORY_DIALOGUE_INFORMATION_TENSION_RULES),
      voice_differentiation_rules: explicitVoiceDifferentiationRules.length
        ? explicitVoiceDifferentiationRules
        : (asArray(derived.voice_differentiation_rules).length ? asArray(derived.voice_differentiation_rules) : OH_STORY_DIALOGUE_VOICE_DIFFERENTIATION_RULES),
      spectator_dialogue_rules: explicitSpectatorDialogueRules.length
        ? explicitSpectatorDialogueRules
        : (asArray(derived.spectator_dialogue_rules).length ? asArray(derived.spectator_dialogue_rules) : OH_STORY_DIALOGUE_SPECTATOR_RULES),
      supporting_speaker_limit_rules: explicitSupportingSpeakerLimitRules.length
        ? explicitSupportingSpeakerLimitRules
        : (asArray(derived.supporting_speaker_limit_rules).length ? asArray(derived.supporting_speaker_limit_rules) : OH_STORY_DIALOGUE_SUPPORTING_SPEAKER_LIMIT_RULES),
      dialogue_rhythm_rules: explicitDialogueRhythmRules.length
        ? explicitDialogueRhythmRules
        : (asArray(derived.dialogue_rhythm_rules).length ? asArray(derived.dialogue_rhythm_rules) : OH_STORY_DIALOGUE_RHYTHM_RULES),
      dialogue_volume_rules: explicitDialogueVolumeRules.length
        ? explicitDialogueVolumeRules
        : (asArray(derived.dialogue_volume_rules).length ? asArray(derived.dialogue_volume_rules) : OH_STORY_DIALOGUE_VOLUME_RULES),
      dialogue_meme_rules: explicitDialogueMemeRules.length
        ? explicitDialogueMemeRules
        : (asArray(derived.dialogue_meme_rules).length ? asArray(derived.dialogue_meme_rules) : OH_STORY_DIALOGUE_MEME_RULES),
      dialogue_audit_rules: explicitDialogueAuditRules.length
        ? explicitDialogueAuditRules
        : (asArray(derived.dialogue_audit_rules).length ? asArray(derived.dialogue_audit_rules) : OH_STORY_DIALOGUE_AUDIT_RULES),
      dialogue_execution_checklist: explicitDialogueExecutionChecklist.length
        ? explicitDialogueExecutionChecklist
        : normalizeDialogueExecutionChecklist(derived.dialogue_execution_checklist || derived.dialogueExecutionChecklist),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_DIALOGUE_QUALITY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['修角色声线差异', '删说明书式对话', '补潜台词与议程', '强化权力博弈', '补情绪递进']),
    }
  }
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const characterArc = target.character_arc_brief || contextPackage?.character_arc_context || {}
  const sceneModes = uniqueBriefStrings(sceneCards.map(inferDialogueMode), 8)
  const voiceAnchors = uniqueBriefStrings([
    characterArc.voice_anchor,
    characterArc.voiceAnchor,
    ...sceneCards.flatMap((scene: any) => [scene.character_voice, scene.voice_focus, scene.voice_rule]),
  ], 12)
  const dialogueGoals = uniqueBriefStrings(sceneCards.flatMap((scene: any) => [scene.dialogue_goal, scene.dialogueGoal, scene.purpose]).filter(Boolean), 12)
  const keyLines = uniqueBriefStrings(sceneCards.flatMap((scene: any) => [scene.key_dialogue, scene.keyDialogue]).filter(Boolean), 8)
  const relationshipMoves = uniqueBriefStrings([
    characterArc.relationship_shift,
    characterArc.relationshipShift,
    characterArc.relationship_change,
    characterArc.relationshipChange,
    ...sceneCards.flatMap((scene: any) => [scene.relationship_shift, scene.relationship_change, scene.reader_payoff]).filter(Boolean),
  ], 10)
  return {
    version: 'oh_story_dialogue_contract_v1',
    source: 'oh_story_embedded_fallback',
    scene_modes: sceneModes.length ? sceneModes : ['潜台词与议程'],
    voice_anchors: voiceAnchors,
    dialogue_goals: dialogueGoals,
    key_lines: keyLines,
    relationship_moves: relationshipMoves,
    mode_playbooks: OH_STORY_DIALOGUE_MODE_PLAYBOOKS,
    power_length_rules: OH_STORY_DIALOGUE_POWER_LENGTH_RULES,
    subtext_agenda_rules: OH_STORY_DIALOGUE_SUBTEXT_AGENDA_RULES,
    tone_context_rules: OH_STORY_DIALOGUE_TONE_CONTEXT_RULES,
    emotion_push_rules: OH_STORY_DIALOGUE_EMOTION_PUSH_RULES,
    emotion_continuity_rules: OH_STORY_DIALOGUE_EMOTION_CONTINUITY_RULES,
    dialogue_drive_rules: OH_STORY_DIALOGUE_DRIVE_RULES,
    information_embed_rules: OH_STORY_DIALOGUE_INFORMATION_EMBED_RULES,
    information_tension_rules: OH_STORY_DIALOGUE_INFORMATION_TENSION_RULES,
    voice_differentiation_rules: OH_STORY_DIALOGUE_VOICE_DIFFERENTIATION_RULES,
    spectator_dialogue_rules: OH_STORY_DIALOGUE_SPECTATOR_RULES,
    supporting_speaker_limit_rules: OH_STORY_DIALOGUE_SUPPORTING_SPEAKER_LIMIT_RULES,
    dialogue_rhythm_rules: OH_STORY_DIALOGUE_RHYTHM_RULES,
    dialogue_volume_rules: OH_STORY_DIALOGUE_VOLUME_RULES,
    dialogue_meme_rules: OH_STORY_DIALOGUE_MEME_RULES,
    dialogue_audit_rules: OH_STORY_DIALOGUE_AUDIT_RULES,
    dialogue_execution_checklist: buildDialogueExecutionChecklist(sceneCards, characterArc, target),
    quality_checks: OH_STORY_DIALOGUE_QUALITY_CHECKS,
    revision_priorities: ['修角色声线差异', '删说明书式对话', '补潜台词与议程', '强化权力博弈', '补情绪递进'],
  }
}
