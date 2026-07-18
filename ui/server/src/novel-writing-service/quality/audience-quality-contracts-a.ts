import { asArray } from '../../routes/novel-route-utils'
import {
  normalizeConflictNetworkLayersContract,
  normalizeConflictWebContract,
} from '../../novel-writing/conflict-structure-basics'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

type AnyFn = (...args: any[]) => any

let storylineUsageByAnyType: AnyFn = (_storylineContext: any = {}, _types: any[] = []) => []

export function bindAudienceQualityContractDeps(deps: {
  storylineUsageByAnyType?: AnyFn
} = {}) {
  if (deps.storylineUsageByAnyType) storylineUsageByAnyType = deps.storylineUsageByAnyType
}

export const OH_STORY_INFORMATION_FLOW_CHECKS = [
  '每个信息团必须能一句话概括这段在讲什么，不能只有气氛、闲聊或背景堆叠。',
  '信息团之间必须有逻辑递进关系：发现、验证、反转、回收、升级或推出新目标。',
  '过渡场景没有信息量就删掉或压缩，不能用纯移动、寒暄、环境描写拖字数。',
  '前一个场景留下悬念，后一个场景必须回应、升级或明确延迟，不能断裂换题。',
  '情绪衔接要自然，热血、压迫、反转、余韵不能突然掉成平淡说明。',
  '无关信息团必须砍掉，或改写成服务本章核心卖点和主线推进的证据。',
]

export const OH_STORY_INFORMATION_TRANSITION_RULES = [
  '前一个场景留下悬念，后一个场景回应悬念。',
  '前一个场景热血或高压收尾，下一场景开头要有余韵、后果或压力延续。',
  '前一个场景埋下信息差，后一个场景必须回收、验证、反转或升级。',
  '过渡场景没有信息量就直接跳过，不拖泥带水。',
  '切换视角或场景时在悬念点切出，不在平淡处切出。',
]

export const OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES = [
  '过渡不是填充，没有信息量就删掉。',
  '过渡场景该跳过就跳过，不拖泥带水。',
  '纯移动、寒暄、环境描写没有信息量时直接跳过或压缩。',
  '过场要么交付信息、风险、情绪余波或下一步目标，要么只用一句话带过。',
]

export const OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES = [
  '每次实力、身份、资源或阶段性目标提升后，必须立即引入新的挑战、目标、代价或更高门槛。',
  '兑现当前信息或胜利后，下一步干什么要在场景内可见，不能只写事情进入下一阶段。',
]

export const OH_STORY_EXPECTATION_THRESHOLD_CHECKS = [
  '两长一短必须同时在线：1个短期期待驱动当前单元，1-2个长期期待保持远期拉力。',
  '期待感 > 爽点：铺垫的篇幅不少于释放的篇幅，爽点到来前一刻才是张力最高处。',
  '设门槛必须围绕核心卖点设计，不能脱离金手指、脑洞、主线目标或本章冲突。',
  '大目标要拆成资源型、成就型、多条件型、动态门槛或收集型条件，不能一步解决。',
  '门槛要分批提出，不要一次性甩完；每跨越一个门槛就立刻设立下一个。',
  '每个低密度或过渡段至少保留一个让读者想知道后续的点。',
  '单元故事完成当前目标前，要提前插入下一个故事或更大问题的期待线。',
]

export const OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES = [
  '期待感 > 爽点：铺垫的篇幅不少于释放的篇幅。',
  '爽点到来前一刻是张力最高处，不要提前泄气。',
  '长篇关键是延迟满足：先用危机、门槛、信息差或将满未满的动作拉长需求，再释放爽点。',
]

export const OH_STORY_EXPECTATION_RELAY_RULES = [
  '期待接力法：确保读者脑中有三个好奇的东西，两长一短同时运行。',
  '当一层即将满足时，先铺好下一层的期待，形成期待链不断裂。',
  '闭环一个期待时，必须已有下一个开环在运行；在主角得到之前，先套上另一个钩子。',
  '任何时刻保持至少两条期待线并行运行，大期待与小期待来回穿插。',
]

const OH_STORY_STORY_LOOP_CHECKS = [
  '循环模式必须由题材 + 金手指 + 主角身份共同推出，三者不能互相打架。',
  '每章必须至少推进一次循环：进入问题/资源/挑战 -> 行动验证 -> 获得反馈 -> 抛出下一轮燃料。',
  '循环燃料必须清楚：信息差、资源、震惊反馈、反转收益、组织信息交换或人物塑造力至少命中一种。',
  '新手村或当前地图要有资源闭环：学习/训练、变现/补给、敌人靶子、管理/上升通道至少不互相断裂。',
  '地位升高必须同步提高环境危险度、规则复杂度、对手层级或代价，否则读者会觉得无聊。',
  '换地图或换阶段时必须保留至少一条贯穿主线，并提前铺垫新地图吸引力。',
]

const OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES = [
  '换地图前旧地图核心冲突至少阶段性解决。',
  '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
  '换地图后前5章必须快速建立新的代入感和期待感。',
  '保留至少一条贯穿主线，不能旧角色一刀切全部抛弃。',
  '新设定不能一次性全部倒出；每次换地图循环要升级：更大规模、更高门槛、更强对手。',
  '优先用过渡人物、新旧地图联动或旧日关系线连接新旧地图。',
  '人际关系先行：换地图前先让人际关系动了 -> 主角再动，不能让主角突然跳进新地图。',
]

const OH_STORY_STORY_LOOP_NESTED_LOOP_RULES = [
  '多级嵌套：小循环 -> 中循环（次级目标）-> 大循环（卷目标）。',
  '小循环中必须铺垫大循环的期待，不能只完成本章局部事件。',
  '在重复中变化：同一核心卖点的不同角度/不同矛盾要持续推进，避免只反复用同一个梗换对象。',
]

const OH_STORY_STORY_LOOP_MODES = [
  {
    mode: '案件串循环',
    pattern: /规则|案件|推理|谜|线索|真相|调查|怪谈|诡异|悬疑/,
    fuel: '信息差+推理',
    steps: ['案件', '解谜', '部分真相', '更大谜团', '新案件'],
  },
  {
    mode: '扮猪吃虎循环',
    pattern: /扮猪吃虎|挑衅|碾压|震惊|装逼|打脸|反打/,
    fuel: '读者-角色信息差',
    steps: ['默默发育', '挑衅', '碾压', '震惊', '继续发育'],
  },
  {
    mode: '资源积累循环',
    pattern: /修炼|升级|资源|境界|技能|装备|副本|地图|灵石|经验/,
    fuel: '资源与能力螺旋上升',
    steps: ['资源', '技能', '实力', '新地图', '新资源'],
  },
  {
    mode: '戏剧性反转循环',
    pattern: /亏钱|投资|经营|反转|赚钱|商业|系统奖励/,
    fuel: '不依赖数值膨胀的反转收益',
    steps: ['亏钱', '反转赚更多', '拿更多钱去亏', '又赚'],
  },
  {
    mode: '组织枢纽循环',
    pattern: /组织|公会|门派|团队|势力|信息汇聚|多线/,
    fuel: '信息交换+多线',
    steps: ['各自冒险', '信息汇聚', '衍生新剧情'],
  },
  {
    mode: '公路片循环',
    pattern: /旅行|公路|路上|走一段|新地点|遇见|游历/,
    fuel: '人物塑造力',
    steps: ['走一段路', '遇一个人', '又走', '又遇'],
  },
]





const OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS = [
  '章节结构：开头有钩子，中段有推进，局势有变化，结尾落在变化上而不是总结。',
  '开篇检查：前300-500字有钩子，不从天气/风景/日常开始，主角快速出场，卖点或危机可见。',
  '场景检查：场景有目标、阻碍、变化；人物在做事情，不是在感觉事情。',
  '章尾检查：结尾至少落在危机、决定、发现、反转之一，并拉住读者翻下一页。',
]

const OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES = [
  '章纲目的法：每章一句话概括内容，并标注目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）。',
  '盯紧章纲和目的来写，避免写作过程中跑偏。',
  '详略按目的词分配：爽点/打脸/高潮展开，铺垫/设定只保留有功能信息。',
]

const OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS = [
  '章节推进：有核心事件，局势有变化，推进主线/关系/设定中的至少一项。',
  '水文检测：删掉这章会影响理解吗？不会就是水了。',
  '没有可删除段落：每段必须推进剧情、塑造人物、传递信息、制造情绪或维持悬念。',
  '最近连续章节不能没有冲突，故事引擎必须仍在运转。',
]

const OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS = [
  '没有大段设定说明文，信息必须跟着冲突走，通过事件传递设定。',
  '设定量可控：一章不超 3 个新概念。',
  '没有突然塞入大量新设定，伏笔必须有推进或明确保温。',
  '标题行以外不得混入本章/前文/伏笔/细纲/读者等写作工程词。',
]

const OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES = [
  '事件驱动：正文章节必须由事件组成，事件内容比重不能小于一半。',
  '事件是价值改变的契机：没有事件，主角和主线不会改变。',
  '设定尽量通过事件演绎，而非旁白强塞。',
]

const OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS = [
  '黄金三章：第一章前500字有钩子，前三章至少2个爽点，每章结尾有悬念。',
  '最近 5 章是否有明确进展，爽点间隔是否过长，是否连续 2 章以上没有冲突。',
  '人物检查：主角行为符合人设，配角有存在感，反派逼格匹配当前阶段。',
  '连载连续性：没有遗忘之前承诺/伏笔，故事引擎还在运转。',
]

const OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC = [
  '核心一致度：关键冲突、关键行动、人物动机是否前后一致。',
  '表层重写度：句式与措辞是否足够自然原创，避免套路化表达和AI标志词。',
  '格式一致度：段落是否按戏剧单元/镜头自然断开，主语/角色名节奏是否自然。',
  '可读性：是否有啰嗦、AI腔、空泛总结、套路修辞和情绪标签。',
  '逻辑连贯：句间/段间是否通顺，有无设定冲突、时间线错误、角色信息不一致或因果链断裂。',
]

const OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES = [
  '卖点表达：发现比告知爽十倍，不要直接告诉读者“这是核心卖点/本章很爽”。',
  '隐性展示：通过剧情、对话、动作结果和角色反应展示卖点。',
  '三层递进：开头暗示 -> 中间深化 -> 高潮爆发，让读者在阅读中自己发现。',
]

const OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES = [
  'rewrite：核心一致度低时，围绕核心冲突重写相关段落。',
  'compress：字数超标或水文过多时，删减不推动剧情的内容。',
  'de_ai：AI腔重时，替换禁用词、改写句式、删除空泛总结。',
  'polish：小问题多时，打磨语言细节、段落节奏和信息衔接。',
]

const OH_STORY_QUALITY_AUDIT_CHECKS = [
  '必须输出五维评分：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯，每项0-100并给正文证据。',
  '章节结构必须完整：开头钩子、中段推进、局势变化、章尾翻页都要有证据。',
  '章纲必须有目的词：每章一句话概括内容，并标注铺垫/高潮/爽点/打脸/人物塑造/设定。',
  '必须执行水文检测：删掉本章/本段是否影响理解；无影响则标记为可压缩或删除。',
  '信息传递必须跟冲突走，一章新概念不得超过3个，大段设定说明必须改成事件承载。',
  '事件内容比重不能小于一半：设定、情绪和背景必须通过动作、选择、阻碍、代价或局势变化演绎。',
  '卖点表达必须隐性展示：不要直接说“这是卖点/本章很爽”，按开头暗示 -> 中间深化 -> 高潮爆发写成剧情、对话和反应。',
  '长篇连载必须检查最近5章进展、爽点间隔、连续无冲突、伏笔/承诺遗忘和故事引擎。',
  '根据最低分维度选择 rewrite/compress/de_ai/polish 精修策略，并给出可执行修订指令。',
]

const NEW_CONCEPT_USAGE_HINTS = [
  'new',
  'new_concept',
  'introduce',
  'introduced',
  'first_appearance',
  'first_introduced',
  'setup_new',
  '新增',
  '新设定',
  '首次',
  '首次引入',
  '引入',
]

function isExplicitNewConceptUsage(row: any) {
  if (!row || typeof row !== 'object') return false
  if (row.is_new === true || row.isNew === true || row.new_concept === true || row.newConcept === true || row.first_introduced === true || row.firstIntroduced === true) return true
  const fields = [
    row.usage_type,
    row.usageType,
    row.status,
    row.novelty,
    row.stage,
    row.introduction_stage,
    row.introductionStage,
    row.intent,
  ].map(value => String(value || '').toLowerCase())
  return fields.some(value => NEW_CONCEPT_USAGE_HINTS.some(hint => value.includes(hint.toLowerCase())))
}

export function scanNewConceptOverloadRisks(contextPackage: any = {}) {
  const rows = [
    ...asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage || contextPackage?.storyline_context?.chapterUsage),
  ]
  const concepts = uniqueBriefStrings(rows
    .filter((row: any) => isExplicitNewConceptUsage(row))
    .filter((row: any) => String(row?.usage_type || row?.usageType || '').toLowerCase() !== 'forbidden')
    .map((row: any) => compactBriefText(row?.name || row?.title || row?.label || row?.summary || row))
    .filter(Boolean), 12)

  if (concepts.length <= 3) return []
  return [{
    key: 'quality_audit_new_concept_overload',
    label: '新概念负载',
    status: 'fail',
    evidence: `本章明确新增概念 ${concepts.length} 个：${concepts.join('、')}`,
    fix: '最多保留 3 个本章必须新增的概念，其余改为已有资产状态变化、延后到后续章节，或并入冲突中的一句可见信息。',
    strategy: 'compress',
  }]
}

function regexEscapeLiteral(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function explicitNewConceptNames(contextPackage: any = {}) {
  const rows = [
    ...asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage || contextPackage?.storyline_context?.chapterUsage),
    ...asArray(contextPackage?.chapter_target?.setting_usage || contextPackage?.chapter_target?.settingUsage),
    ...asArray(contextPackage?.chapterTarget?.setting_usage || contextPackage?.chapterTarget?.settingUsage),
  ]
  return uniqueBriefStrings(rows
    .filter((row: any) => isExplicitNewConceptUsage(row))
    .filter((row: any) => String(row?.usage_type || row?.usageType || '').toLowerCase() !== 'forbidden')
    .map((row: any) => compactBriefText(row?.name || row?.title || row?.label || row?.summary || row))
    .filter(Boolean), 8)
}

function newConceptHasImmediateAnchor(name: string, chapterText: string) {
  const text = String(chapterText || '')
  const escaped = regexEscapeLiteral(name)
  if (!escaped || !text.includes(name)) return true
  const firstIndex = text.indexOf(name)
  const windowText = text.slice(Math.max(0, firstIndex - 90), firstIndex + name.length + 140)
  const actionBefore = new RegExp(`(?:把|将|用|拿起|握住|按住|贴上|碰到|触到|递出|塞进|嵌进)[^。！？\\n]{0,24}${escaped}`).test(windowText)
  const actionAfter = new RegExp(`${escaped}[^。！？\\n]{0,36}(?:按|贴|嵌|亮|烫|裂|炸|浮出|显出|响|刺|割|锁住|打开|吐出|弹出|改变|暴露|找回)`).test(windowText)
  const consequence = /(?:记忆碎片|画面|鼻血|血|红光|冷光|裂纹|倒计时|印记|缺页|证据|位置)[^。！？\n]{0,36}(?:炸开|浮出|显出|亮起|烫|刺|锁住|打开|改变|暴露)/.test(windowText)
  const usefulDialogue = /“[^”]{0,60}(?:能|会|用来|可以|拿它|靠它|找回|打开|封住|锁住|证明|定位|暴露)[^”]{0,30}”/.test(windowText)
  return actionBefore || actionAfter || consequence || usefulDialogue
}

export function scanNewConceptAnchorRisks(contextPackage: any = {}, chapterText = '') {
  const names = explicitNewConceptNames(contextPackage)
  if (!names.length) return []
  const text = String(chapterText || '')
  const risks = names
    .filter(name => text.includes(name))
    .filter(name => !newConceptHasImmediateAnchor(name, text))
  if (!risks.length) return []
  const explanationOnly = /(?:源于|来历|原理|分为|等级|制度|设定以后|后续再解释|以后会有用)/.test(text)
  return [{
    key: 'prose_craft_new_concept_anchor_missing',
    label: '新概念锚点缺失',
    status: 'warn',
    evidence: `本章新增概念缺少动作/对话/物理后果锚点：${risks.join('、')}${explanationOnly ? '；正文偏向来历/原理解释' : ''}`,
    fix: '给新名词/新设定补当下作用锚点：用角色动作反应、对话半句或物理后果带出功能，例如按上、触发、炸开、浮出、刺痛、亮起、暴露证据或改变选择；删掉整段来历/原理/等级说明。',
  }]
}

const SCALE_ANCHOR_TERMS = /月俸|年薪|工资|房租|米价|饭钱|普通人|外门弟子|杂役|伙计|账房|凡人|庶民|散修|一天|一年|十年|百年|三百年|家产|铺子|一顿饭|一间房|一条街|收入|成本|代价|日常|饭馆|客栈|入门丹|养活|倾家荡产/
const ECONOMIC_SCALE_PATTERN = /[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)?(?:灵石|金币|银票|银子|铜钱|两|积分|贡献点|现金|存款|资产|债务|元|块)/g
const POWER_SCALE_PATTERN = /(?:战力|境界|等级|修为|气血|灵力|武力|精神力|评级|品阶)[^。！？\n，,；;]{0,18}[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)?(?:点|级|阶|品|星|层)?|[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)(?:点|级|阶|品|星)/g

