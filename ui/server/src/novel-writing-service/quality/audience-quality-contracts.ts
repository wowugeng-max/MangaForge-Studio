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

export function scanEconomicPowerScaleAnchorRisks(text: string) {
  const rawText = String(text || '')
  if (!rawText.trim()) return []

  const hits: string[] = []
  const patterns = [ECONOMIC_SCALE_PATTERN, POWER_SCALE_PATTERN]
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    for (const match of rawText.matchAll(pattern)) {
      const value = compactBriefText(match[0])
      if (!value) continue
      const index = typeof match.index === 'number' ? match.index : rawText.indexOf(match[0])
      const window = rawText.slice(Math.max(0, index - 80), Math.min(rawText.length, index + match[0].length + 80))
      if (SCALE_ANCHOR_TERMS.test(window)) continue
      hits.push(value)
      if (hits.length >= 4) break
    }
    if (hits.length >= 4) break
  }

  const riskyScales = uniqueBriefStrings(hits, 4)
  if (!riskyScales.length) return []
  return [{
    key: 'quality_audit_scale_anchor_missing',
    label: '经济/战力尺度锚点',
    status: 'warn',
    evidence: `出现大额经济或战力尺度但缺少普通人锚点：${riskyScales.join('、')}`,
    fix: '补普通人收入、月俸/年薪、日常成本、修炼代价或旁观者职业反应，让金额/战力有可感知的日常尺度。',
    strategy: 'polish',
  }]
}

function qualityAuditExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.quality_audit_contract
    || contextPackage?.chapter_target?.qualityAuditContract
    || contextPackage?.quality_audit_contract
    || contextPackage?.qualityAuditContract
    || contextPackage?.pre_draft_brief?.quality_audit_contract
    || contextPackage?.preDraftBrief?.qualityAuditContract
}

function buildQualityAuditChapterFocus(target: any = {}, sceneCards: any[] = []) {
  return uniqueBriefStrings([
    target.summary ? `本章核心事件：${compactBriefText(target.summary)}` : '',
    target.conflict ? `本章必须证明局势变化：${compactBriefText(target.conflict)}` : '',
    target.ending_hook ? `章尾必须落在具体变化/翻页钩子：${compactBriefText(target.ending_hook)}` : '',
    ...sceneCards.map((scene: any, index: number) => {
      const label = scene.reader_payoff || scene.purpose || scene.conflict
      return label ? `场景${scene.scene_no || index + 1}不可水：${compactBriefText(label)}` : ''
    }),
  ], 10)
}

const OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST = [
  {
    phase: '写前目的锁定',
    check: '先用一句话概括本章内容，并标注目的词：铺垫/高潮/爽点/打脸/人物塑造/设定。',
    receipt_keys: ['quality_audit_checks'],
  },
  {
    phase: '开篇抓取',
    check: '前300-500字必须有钩子、主角快速出场、卖点或危机可见，不能从天气/风景/日常开场。',
    receipt_keys: ['structure_checks', 'opening_checks'],
  },
  {
    phase: '中段推进',
    check: '中段必须有核心事件、目标、阻碍和局势变化；删掉本章会影响理解。',
    receipt_keys: ['progression_checks', 'quality_audit_checks'],
  },
  {
    phase: '信息负载',
    check: '信息跟着冲突走，一章不超过3个新概念，没有大段设定说明书。',
    receipt_keys: ['information_checks'],
  },
  {
    phase: '章尾拉力',
    check: '结尾落在具体变化、危机、决定、发现或反转上，不写总结式结尾。',
    receipt_keys: ['structure_checks', 'chapter_hook_checks'],
  },
  {
    phase: '连载连续性',
    check: '最近5章有明确进展，伏笔和状态没有遗忘，故事引擎仍在运转。',
    receipt_keys: ['longform_checks', 'state_tracking_checks'],
  },
  {
    phase: '精修策略',
    check: '按五维评分找最低分维度，选择 rewrite/compress/de_ai/polish，并给正文证据。',
    receipt_keys: ['quality_audit_checks', 'prose_craft_checks'],
  },
]

function normalizeQualityAuditPhaseChecklist(value: any) {
  return asArray(value)
    .map((item: any) => {
      const phase = compactBriefText(item?.phase || item?.label || item?.name)
      const check = compactBriefText(item?.check || item?.rule || item?.detail || item?.description)
      const receiptKeys = uniqueBriefStrings(item?.receipt_keys || item?.receiptKeys || item?.receipts || [], 6)
      if (!phase || !check || !receiptKeys.length) return null
      return {
        phase,
        check,
        receipt_keys: receiptKeys,
      }
    })
    .filter(Boolean)
    .slice(0, 10)
}

export function buildQualityAuditContract(project: any = {}, contextPackage: any = {}) {
  const explicit = qualityAuditExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildQualityAuditContract(project, {
      ...(contextPackage || {}),
      quality_audit_contract: null,
      qualityAuditContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitStructureChecks = asArray(explicit.structure_checks || explicit.structureChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitChapterPurposeRules = asArray(explicit.chapter_purpose_rules || explicit.chapterPurposeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProgressionChecks = asArray(explicit.progression_checks || explicit.progressionChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationChecks = asArray(explicit.information_checks || explicit.informationChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEventContentRules = asArray(explicit.event_content_rules || explicit.eventContentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongformChecks = asArray(explicit.longform_checks || explicit.longformChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFiveDimensionRubric = asArray(explicit.five_dimension_rubric || explicit.fiveDimensionRubric).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSellingPointExpressionRules = asArray(explicit.selling_point_expression_rules || explicit.sellingPointExpressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitChapterFocus = asArray(explicit.chapter_focus || explicit.chapterFocus).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionStrategies = asArray(explicit.revision_strategies || explicit.revisionStrategies).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPhaseChecklist = normalizeQualityAuditPhaseChecklist(explicit.phase_checklist || explicit.phaseChecklist)
    const derivedPhaseChecklist = normalizeQualityAuditPhaseChecklist(derived.phase_checklist || derived.phaseChecklist)
    return {
      version: explicit.version || 'oh_story_quality_audit_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      structure_checks: explicitStructureChecks.length
        ? explicitStructureChecks
        : (asArray(derived.structure_checks).length ? asArray(derived.structure_checks) : OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS),
      chapter_purpose_rules: explicitChapterPurposeRules.length
        ? explicitChapterPurposeRules
        : (asArray(derived.chapter_purpose_rules).length ? asArray(derived.chapter_purpose_rules) : OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES),
      progression_checks: explicitProgressionChecks.length
        ? explicitProgressionChecks
        : (asArray(derived.progression_checks).length ? asArray(derived.progression_checks) : OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS),
      information_checks: explicitInformationChecks.length
        ? explicitInformationChecks
        : (asArray(derived.information_checks).length ? asArray(derived.information_checks) : OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS),
      event_content_rules: explicitEventContentRules.length
        ? explicitEventContentRules
        : (asArray(derived.event_content_rules).length ? asArray(derived.event_content_rules) : OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES),
      longform_checks: explicitLongformChecks.length
        ? explicitLongformChecks
        : (asArray(derived.longform_checks).length ? asArray(derived.longform_checks) : OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS),
      five_dimension_rubric: explicitFiveDimensionRubric.length
        ? explicitFiveDimensionRubric
        : (asArray(derived.five_dimension_rubric).length ? asArray(derived.five_dimension_rubric) : OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC),
      selling_point_expression_rules: explicitSellingPointExpressionRules.length
        ? explicitSellingPointExpressionRules
        : (asArray(derived.selling_point_expression_rules).length ? asArray(derived.selling_point_expression_rules) : OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES),
      chapter_focus: explicitChapterFocus.length ? explicitChapterFocus : asArray(derived.chapter_focus),
      revision_strategies: explicitRevisionStrategies.length
        ? explicitRevisionStrategies
        : (asArray(derived.revision_strategies).length ? asArray(derived.revision_strategies) : OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_QUALITY_AUDIT_CHECKS),
      phase_checklist: explicitPhaseChecklist.length
        ? explicitPhaseChecklist
        : (derivedPhaseChecklist.length ? derivedPhaseChecklist : OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_quality_audit_v1',
    source: 'oh_story_embedded_fallback',
    structure_checks: OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS,
    chapter_purpose_rules: OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES,
    progression_checks: OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS,
    information_checks: OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS,
    event_content_rules: OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES,
    longform_checks: OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS,
    five_dimension_rubric: OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC,
    selling_point_expression_rules: OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES,
    chapter_focus: buildQualityAuditChapterFocus(target, sceneCards),
    revision_strategies: OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES,
    quality_checks: OH_STORY_QUALITY_AUDIT_CHECKS,
    phase_checklist: OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST,
  }
}

const OH_STORY_TARGET_READER_QUESTIONS = [
  '我这书写给谁看？至少包括年龄段、职业、性别、常用平台、人生处境和普遍渴望。',
  '我的目标读者群体在看网文时希望看到什么内容？',
  '我的这本书和本章有哪些内容是目标读者群体想看的？',
]

const OH_STORY_TARGET_READER_CHECKS = [
  '三问必须全部回答清楚：写给谁、读者想看什么、本书本章给什么。',
  '目标读者画像必须具体到年龄段、职业/生活状态、性别倾向、常用平台和普遍渴望。',
  '情绪缺口必须明确：从核心痛苦、深层情结、高频情绪关键词和未满足需求反推本章压力与回报。',
  '题材生命力必须用当前目标平台样本验证，判断新鲜期 / 成熟期 / 审美疲劳期，不能把历史经验当作当前事实。',
  '平台适配必须以目标平台样本校准，不能用A网站的样本直接套到B网站。',
  '题材边界必须确认当前素材、知识储备和篇幅能支撑所选题材，创新题材要降低篇幅和创新数量。',
  '书名、简介和正文必须货板一致：书名3秒抓人，简介有安全感+钩子，正文兑现同一个核心卖点。',
  '代入感必须稳定，世界观自洽且画风统一，避免仙侠搞科研式塑料感。',
  '金手指必须与主角生活/职业息息相关，并服务主线，不得硬贴或频繁开新能力。',
  '私人表达不得超过全篇5%，且必须服务核心卖点和主线剧情。',
  '本章场景选择必须能反向校验目标读者想看的内容，不能只服务作者自嗨设定。',
  '章节核心卖点、开篇钩子、冲突和回报必须至少命中一个读者高频渴望。',
  '如果读者画像、平台口味和本章卖点错位，必须调整场景选择、信息释放或回报方式。',
]

const OH_STORY_TARGET_READER_GENRE_VITALITY_RULES = [
  '题材生命力必须按当前目标平台样本验证，不把历史经验或历史热度当作当前事实。',
  '写前判断题材阶段：新鲜期优先提炼创意方向，成熟期优先稳定交付边界期待，审美疲劳期必须给出新切入点。',
  '无法确认阶段时按成熟期处理：保守满足边界期待，微创新不超过 3 个。',
]

const OH_STORY_TARGET_READER_PLATFORM_FIT_RULES = [
  '不能用A网站的样本直接套到B网站；必须用目标平台样本校准读者期待、节奏和雷点。',
  '番茄优先强情绪、噱头和爽感直给；起点可以接受更慢节奏的正常剧情推进和代入感。',
  '同一题材在不同平台必须调整写法，不能只沿用旧平台经验。',
]

const OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES = [
  '确认题材边界感：当前素材、知识储备和篇幅能支撑所选题材。',
  '成熟题材优先稳定边界期待；无边界感/创新题材风险高，必须降低篇幅和创新数量。',
  '混搭题材不得突破读者对核心类型的基础期待。',
]

const OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES = [
  '书名3秒抓人：在目标平台命名规则内传递核心卖点或钩子。',
  '简介有安全感+钩子：至少暗示主角会赢，同时留下悬念。',
  '书名简介内容三位一体：书名暗示的卖点 = 简介承诺的内容 = 正文实际交付，禁止货不对板。',
]

const OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES = [
  '正文必须维持代入感：主角行动、世界规则和读者期待要同向。',
  '世界观自洽且画风统一，避免仙侠搞科研、武侠不侠等塑料感。',
  '新设定必须像真实存在于世界中，而不是纸糊的设定说明。',
]

const OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES = [
  '金手指必须与主角生活/职业息息相关，例如医生配医术秘籍，不要医生硬配隐身。',
  '金手指要服务主线，技能能升级，一个技能衍生不同效果，不要频繁开新金手指。',
  '能力反馈必须落到现实问题、职业技能、关系处境或资源变化里。',
]

const OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES = [
  '私人表达不得超过全篇5%，且不得打断叙事节奏。',
  '所有私人表达必须服务核心卖点，不得独立于主线剧情存在。',
  '商业化不是故意恶心读者，而是让表达服从目标读者的核心阅读需求。',
]

function storyLoopExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.story_loop_contract
    || contextPackage?.chapter_target?.storyLoopContract
    || contextPackage?.story_loop_contract
    || contextPackage?.storyLoopContract
    || contextPackage?.pre_draft_brief?.story_loop_contract
    || contextPackage?.preDraftBrief?.storyLoopContract
}

function inferStoryLoopMode(text: string) {
  return OH_STORY_STORY_LOOP_MODES.find(item => item.pattern.test(text)) || OH_STORY_STORY_LOOP_MODES[2]
}

export function buildStoryLoopContract(project: any = {}, contextPackage: any = {}) {
  const explicit = storyLoopExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildStoryLoopContract(project, {
      ...(contextPackage || {}),
      story_loop_contract: null,
      storyLoopContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const mode = compactBriefText(explicit.loop_mode || explicit.loopMode)
    const fallback = inferStoryLoopMode(mode)
    const explicitCoreElements = asArray(explicit.core_elements || explicit.coreElements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLoopSteps = asArray(explicit.loop_steps || explicit.loopSteps).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMapResourceLoop = asArray(explicit.map_resource_loop || explicit.mapResourceLoop).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEscalationRules = asArray(explicit.escalation_rules || explicit.escalationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMapTransitionRules = asArray(explicit.map_transition_rules || explicit.mapTransitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNestedLoopRules = asArray(explicit.nested_loop_rules || explicit.nestedLoopRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_story_loop_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      loop_formula: compactBriefText(explicit.loop_formula || explicit.loopFormula, '题材 + 金手指 + 主角身份 = 循环模式'),
      core_elements: explicitCoreElements.length ? explicitCoreElements : asArray(derived.core_elements),
      loop_mode: mode || derived.loop_mode || fallback.mode,
      loop_fuel: compactBriefText(explicit.loop_fuel || explicit.loopFuel, derived.loop_fuel || fallback.fuel),
      loop_steps: explicitLoopSteps.length ? explicitLoopSteps : asArray(derived.loop_steps).length ? asArray(derived.loop_steps) : fallback.steps,
      map_resource_loop: explicitMapResourceLoop.length ? explicitMapResourceLoop : asArray(derived.map_resource_loop),
      escalation_rules: explicitEscalationRules.length ? explicitEscalationRules : asArray(derived.escalation_rules),
      map_transition_rules: explicitMapTransitionRules.length
        ? explicitMapTransitionRules
        : asArray(derived.map_transition_rules).length ? asArray(derived.map_transition_rules) : OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES,
      nested_loop_rules: explicitNestedLoopRules.length
        ? explicitNestedLoopRules
        : asArray(derived.nested_loop_rules).length ? asArray(derived.nested_loop_rules) : OH_STORY_STORY_LOOP_NESTED_LOOP_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_STORY_LOOP_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['统一题材/金手指/主角身份', '补循环燃料', '补反馈与下一轮燃料', '补资源闭环', '同步提高环境危险度'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const genre = compactBriefText(project?.genre || contextPackage?.project?.genre || writingBible?.genre)
  const goldenFinger = compactBriefText(
    writingBible?.golden_finger
    || writingBible?.goldenFinger
    || writingBible?.core_hook
    || writingBible?.coreHook
    || commercial?.innovation_hook
    || asArray(commercial?.selling_points || commercial?.sellingPoints)[0],
  )
  const protagonistIdentity = compactBriefText(
    writingBible?.protagonist_identity
    || writingBible?.protagonistIdentity
    || contextPackage?.story_state?.characters?.[0]?.role
    || contextPackage?.story_state?.characters?.[0]?.profile?.identity
    || contextPackage?.story_state?.characters?.[0]?.name,
  )
  const text = [
    genre,
    goldenFinger,
    protagonistIdentity,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.information_gap, scene.reader_payoff, scene.reversal]),
  ].filter(Boolean).join(' ')
  const inferred = inferStoryLoopMode(text)
  const loopSteps = uniqueBriefStrings([
    ...inferred.steps,
    ...sceneCards.flatMap((scene: any) => [
      scene.information_gap ? `信息差：${scene.information_gap}` : '',
      scene.reader_payoff ? `反馈：${scene.reader_payoff}` : '',
      scene.ending_hook_seed ? `下一轮燃料：${scene.ending_hook_seed}` : '',
    ]),
  ], 12)
  return {
    version: 'oh_story_story_loop_v1',
    source: 'oh_story_embedded_fallback',
    loop_formula: '题材 + 金手指 + 主角身份 = 循环模式',
    core_elements: uniqueBriefStrings([
      genre ? `题材：${genre}` : '',
      goldenFinger ? `金手指/核心卖点：${goldenFinger}` : '',
      protagonistIdentity ? `主角身份：${protagonistIdentity}` : '',
    ], 8),
    loop_mode: inferred.mode,
    loop_fuel: inferred.fuel,
    loop_steps: loopSteps,
    map_resource_loop: [
      '地图资源闭环：学习/训练渠道、变现/补给渠道、敌人靶子、管理/上升通道不能全部缺席。',
      '新手村要尽量形成四势力闭环；换地图可以简化，但资源变现渠道不能丢。',
    ],
    escalation_rules: [
      '地位升高必须同步提高环境危险度、规则复杂度、对手层级或代价。',
      '每次解决一个矛盾，必须激活或加深另一个矛盾。',
      '换地图前提前铺垫吸引力，并保留至少一条贯穿主线。',
    ],
    map_transition_rules: OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES,
    nested_loop_rules: OH_STORY_STORY_LOOP_NESTED_LOOP_RULES,
    quality_checks: OH_STORY_STORY_LOOP_CHECKS,
    revision_priorities: ['统一题材/金手指/主角身份', '补循环燃料', '补反馈与下一轮燃料', '补资源闭环', '补换地图承接', '同步提高环境危险度'],
  }
}

function targetReaderExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.target_reader_contract
    || contextPackage?.chapter_target?.targetReaderContract
    || contextPackage?.target_reader_contract
    || contextPackage?.targetReaderContract
    || contextPackage?.pre_draft_brief?.target_reader_contract
    || contextPackage?.preDraftBrief?.targetReaderContract
}

function buildReaderProfileText(project: any = {}, contextPackage: any = {}, configured: any = {}) {
  const platform = compactBriefText(
    configured.platform
    || configured.common_platform
    || configured.commonPlatform
    || contextPackage?.chapter_target?.target_platform
    || contextPackage?.target_platform
    || contextPackage?.writing_bible?.target_platform
    || project?.reference_config?.writing_bible?.target_platform
    || project?.target_platform
    || project?.platform,
  )
  return compactBriefText([
    configured.age_range || configured.ageRange ? `年龄：${configured.age_range || configured.ageRange}` : '',
    configured.occupation ? `职业：${configured.occupation}` : '',
    configured.gender ? `性别倾向：${configured.gender}` : '',
    platform ? `常用平台：${platform}` : '',
    configured.life_situation || configured.lifeSituation ? `人生处境：${configured.life_situation || configured.lifeSituation}` : '',
    configured.core_desire || configured.coreDesire ? `普遍渴望：${configured.core_desire || configured.coreDesire}` : '',
    project?.target_audience ? `项目读者：${project.target_audience}` : '',
    contextPackage?.project?.target_audience ? `上下文读者：${contextPackage.project.target_audience}` : '',
  ].filter(Boolean).join('；'), compactBriefText(project?.target_audience || contextPackage?.project?.target_audience || project?.genre || '通用网文读者'))
}

function buildTargetReaderEmotionalGapAnalysis(project: any = {}, contextPackage: any = {}, configured: any = {}, readerDesires: any[] = []) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const corePain = compactBriefText(firstDefined(
    configured.core_pain,
    configured.corePain,
    configured.emotional_gap,
    configured.emotionalGap,
    configured.pain_point,
    configured.painPoint,
    commercial.core_pain,
    commercial.corePain,
    commercial.emotional_gap,
    commercial.emotionalGap,
  ))
  const hiddenComplexes = uniqueBriefStrings([
    configured.hidden_complex,
    configured.hiddenComplex,
    configured.hidden_complexes,
    configured.hiddenComplexes,
    configured.deep_complexes,
    configured.deepComplexes,
    commercial.hidden_complexes,
    commercial.hiddenComplexes,
  ], 6)
  const emotionKeywords = uniqueBriefStrings([
    configured.comment_emotion_keywords,
    configured.commentEmotionKeywords,
    configured.emotion_keywords,
    configured.emotionKeywords,
    configured.high_frequency_emotions,
    configured.highFrequencyEmotions,
    commercial.comment_emotion_keywords,
    commercial.commentEmotionKeywords,
  ], 8)
  const unmetNeeds = uniqueBriefStrings([
    configured.unmet_needs,
    configured.unmetNeeds,
    configured.reader_needs,
    configured.readerNeeds,
    commercial.unmet_needs,
    commercial.unmetNeeds,
    commercial.reader_needs,
    commercial.readerNeeds,
  ], 8)
  return uniqueBriefStrings([
    corePain ? `核心痛苦：${corePain}` : '',
    hiddenComplexes.length ? `深层情结：${hiddenComplexes.join('、')}` : '',
    emotionKeywords.length ? `高频情绪关键词：${emotionKeywords.join('、')}` : '',
    unmetNeeds.length ? `未满足需求：${unmetNeeds.join('、')}` : '',
    readerDesires.length ? `对照分析：${readerDesires.slice(0, 4).join('、')} 必须对应目标读者未满足需求。` : '',
  ], 10)
}

export function buildTargetReaderContract(project: any = {}, contextPackage: any = {}) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = targetReaderExplicitContract(contextPackage)
    || writingBible?.target_reader_contract
    || writingBible?.targetReaderContract
    || project?.reference_config?.target_reader_contract
    || project?.reference_config?.targetReaderContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derivedProject = {
      ...(project || {}),
      reference_config: {
        ...(project?.reference_config || {}),
        target_reader_contract: null,
        targetReaderContract: null,
        writing_bible: {
          ...(project?.reference_config?.writing_bible || {}),
          target_reader_contract: null,
          targetReaderContract: null,
        },
      },
    }
    const derived = buildTargetReaderContract(derivedProject, {
      ...(contextPackage || {}),
      target_reader_contract: null,
      targetReaderContract: null,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.writing_bible,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            target_reader_contract: null,
            targetReaderContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitReaderProfile = compactBriefText(explicit.reader_profile || explicit.readerProfile)
    const explicitReaderDesires = asArray(explicit.reader_desires || explicit.readerDesires || explicit.desires || explicit.desired_content || explicit.desiredContent)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitEmotionalGapAnalysis = asArray(explicit.emotional_gap_analysis || explicit.emotionalGapAnalysis || explicit.emotional_gaps || explicit.emotionalGaps)
      .concat(asArray(explicit.emotional_gap || explicit.emotionalGap))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitChapterAttractions = asArray(explicit.chapter_attractions || explicit.chapterAttractions || explicit.attractions || explicit.chapter_selling_points || explicit.chapterSellingPoints)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGenreVitalityRules = asArray(explicit.genre_vitality_rules || explicit.genreVitalityRules || explicit.genre_lifecycle_rules || explicit.genreLifecycleRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules || explicit.platform_adaptation_rules || explicit.platformAdaptationRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitBoundaryFitRules = asArray(explicit.boundary_fit_rules || explicit.boundaryFitRules || explicit.genre_boundary_rules || explicit.genreBoundaryRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitTitleBlurbAlignmentRules = asArray(explicit.title_blurb_alignment_rules || explicit.titleBlurbAlignmentRules || explicit.copy_alignment_rules || explicit.copyAlignmentRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitImmersionPlasticityRules = asArray(explicit.immersion_plasticity_rules || explicit.immersionPlasticityRules || explicit.immersion_rules || explicit.immersionRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGoldfingerLifeFitRules = asArray(explicit.goldfinger_life_fit_rules || explicit.goldfingerLifeFitRules || explicit.goldfinger_fit_rules || explicit.goldfingerFitRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitCommercialExpressionRules = asArray(explicit.commercial_expression_rules || explicit.commercialExpressionRules || explicit.private_expression_rules || explicit.privateExpressionRules)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitValidationQuestions = asArray(explicit.validation_questions || explicit.validationQuestions || explicit.chapter_value_test || explicit.chapterValueTest)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitCorrectionMethods = asArray(explicit.correction_methods || explicit.correctionMethods)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    return {
      version: explicit.version || 'oh_story_target_reader_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      reader_profile: explicitReaderProfile || derived.reader_profile,
      reader_desires: explicitReaderDesires.length ? explicitReaderDesires : asArray(derived.reader_desires),
      emotional_gap_analysis: explicitEmotionalGapAnalysis.length ? explicitEmotionalGapAnalysis : asArray(derived.emotional_gap_analysis),
      chapter_attractions: explicitChapterAttractions.length ? explicitChapterAttractions : asArray(derived.chapter_attractions),
      genre_vitality_rules: explicitGenreVitalityRules.length
        ? explicitGenreVitalityRules
        : asArray(derived.genre_vitality_rules).length ? asArray(derived.genre_vitality_rules) : OH_STORY_TARGET_READER_GENRE_VITALITY_RULES,
      platform_fit_rules: explicitPlatformFitRules.length
        ? explicitPlatformFitRules
        : asArray(derived.platform_fit_rules).length ? asArray(derived.platform_fit_rules) : OH_STORY_TARGET_READER_PLATFORM_FIT_RULES,
      boundary_fit_rules: explicitBoundaryFitRules.length
        ? explicitBoundaryFitRules
        : asArray(derived.boundary_fit_rules).length ? asArray(derived.boundary_fit_rules) : OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES,
      title_blurb_alignment_rules: explicitTitleBlurbAlignmentRules.length
        ? explicitTitleBlurbAlignmentRules
        : asArray(derived.title_blurb_alignment_rules).length ? asArray(derived.title_blurb_alignment_rules) : OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES,
      immersion_plasticity_rules: explicitImmersionPlasticityRules.length
        ? explicitImmersionPlasticityRules
        : asArray(derived.immersion_plasticity_rules).length ? asArray(derived.immersion_plasticity_rules) : OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES,
      goldfinger_life_fit_rules: explicitGoldfingerLifeFitRules.length
        ? explicitGoldfingerLifeFitRules
        : asArray(derived.goldfinger_life_fit_rules).length ? asArray(derived.goldfinger_life_fit_rules) : OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES,
      commercial_expression_rules: explicitCommercialExpressionRules.length
        ? explicitCommercialExpressionRules
        : asArray(derived.commercial_expression_rules).length ? asArray(derived.commercial_expression_rules) : OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES,
      validation_questions: explicitValidationQuestions.length
        ? explicitValidationQuestions
        : asArray(derived.validation_questions).length ? asArray(derived.validation_questions) : OH_STORY_TARGET_READER_QUESTIONS,
      correction_methods: explicitCorrectionMethods.length
        ? explicitCorrectionMethods
        : asArray(derived.correction_methods).length ? asArray(derived.correction_methods) : ['分析同类书读者评论的高频正面关键词', '对比同类书高互动与低互动段落差异', '用目标读者画像反向校验本章情节选择'],
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_TARGET_READER_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补清目标读者三问', '让本章卖点命中读者渴望', '删作者自嗨设定展示', '调整平台口味', '补可见读者回报'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const configured = writingBible?.target_reader
    || writingBible?.targetReader
    || project?.reference_config?.target_reader
    || project?.reference_config?.targetReader
    || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const readerDesires = uniqueBriefStrings([
    ...asArray(configured.desires || configured.reader_desires || configured.readerDesires),
    ...asArray(configured.desired_content || configured.desiredContent),
    ...asArray(commercial.selling_points || commercial.sellingPoints),
    commercial.retention_strategy,
    writingBible.promise,
    project?.synopsis,
  ], 12)
  const chapterAttractions = uniqueBriefStrings([
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.opening_hook,
      scene.reader_payoff,
      scene.reversal,
      scene.conflict,
      scene.purpose,
      scene.ending_hook_seed,
    ]),
  ], 18)
  return {
    version: 'oh_story_target_reader_v1',
    source: 'oh_story_embedded_fallback',
    reader_profile: buildReaderProfileText(project, contextPackage, configured),
    reader_desires: readerDesires,
    emotional_gap_analysis: buildTargetReaderEmotionalGapAnalysis(project, contextPackage, configured, readerDesires),
    chapter_attractions: chapterAttractions,
    genre_vitality_rules: OH_STORY_TARGET_READER_GENRE_VITALITY_RULES,
    platform_fit_rules: OH_STORY_TARGET_READER_PLATFORM_FIT_RULES,
    boundary_fit_rules: OH_STORY_TARGET_READER_BOUNDARY_FIT_RULES,
    title_blurb_alignment_rules: OH_STORY_TARGET_READER_TITLE_BLURB_ALIGNMENT_RULES,
    immersion_plasticity_rules: OH_STORY_TARGET_READER_IMMERSION_PLASTICITY_RULES,
    goldfinger_life_fit_rules: OH_STORY_TARGET_READER_GOLDFINGER_LIFE_FIT_RULES,
    commercial_expression_rules: OH_STORY_TARGET_READER_COMMERCIAL_EXPRESSION_RULES,
    validation_questions: OH_STORY_TARGET_READER_QUESTIONS,
    correction_methods: ['分析同类书读者评论的高频正面关键词', '对比同类书高互动与低互动段落差异', '用目标读者画像反向校验本章情节选择'],
    quality_checks: OH_STORY_TARGET_READER_CHECKS,
    revision_priorities: ['补清目标读者三问', '让本章卖点命中读者渴望', '删作者自嗨设定展示', '调整平台口味', '补可见读者回报'],
  }
}

const OH_STORY_GENRE_POSITIONING_READER_PSYCHOLOGY = [
  '题材必须对应明确读者心理：缺钱、缺尊严、缺掌控、缺安全感、缺认可或缺关系补偿。',
  '都市系统/逆袭长篇优先抓中年危机、经济压力、被轻视后的翻盘、生活技能变现和低谷反弹。',
  '每章至少让一个读者心理在正文中被压中，并用行动回报释放，不能只停留在设定说明。',
]

const OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES = [
  '核心梗必须一句话说清，并能在本章场景里被看见。',
  '核心梗要同时包含题材标签、主角处境、金手指/能力和读者情绪回报。',
  '本章场景要重复强化核心梗的可感知形态，例如系统评价+主角吐槽、现实订单验证、公开反打或生活化收益。',
]

const OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES = [
  '金手指必须贴合主角生活/职业/处境，不能像外挂说明书一样凭空降临。',
  '奖励、代价和升级反馈要落到现实问题、职业技能、关系处境或资源变化里。',
  '金手指越强，越要用具体任务、失败风险和现实后果限制它。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES = [
  '微创新最多3个，必须服务题材模板，不得推翻读者对类型文的基础期待。',
  '创新优先放在核心梗表达、职业/场景组合、反馈口吻或回报形式上。',
  '模板内创新可以新鲜，模板外炫技会造成读者误判题材。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES = [
  '70%来自过去经历和记忆：用共同代际记忆、流行文化、类型阅读记忆和熟悉生活细节稳住模板底座。',
  '20%来自当前生活状态：把工作、爱好、感情、家庭压力、消费处境或平台读者当下情绪嵌入角色处境。',
  '10%来自时事热点话题和趋势：只取能服务题材承诺的热点点缀，不能让热点盖过核心梗和类型期待。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS = [
  '精炼法：把已有套路做到极致，删掉噪音，让核心爽点更清晰、更可复述。',
  '升级法：框架不变但元素升级，把既有卖点推到更高压力、更强回报或更可见场面。',
  '加料法：在已有框架里加一个兼容元素，例如职业、关系、场景、反馈口吻或现实压力。',
  '反套路法：只反转读者熟悉套路中的一个小点，最终仍兑现类型期待。',
  '组合法：组合两个兼容套路制造新鲜感，避免引入第三个分散主线的卖点。',
]

const OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES = [
  '拉长板而非补短板：优先强化题材长板、核心卖点、目标情绪和最高频爽点。',
  '不得为补短板引入会稀释核心卖点的支线。',
  '开书前检查：核心卖点背后的情绪清晰，同一卖点能延展出至少 3 个角度，题材长板与现有素材/对标资产匹配。',
]

const OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS = [
  '书名简介内容三位一体：书名承诺、简介卖点和正文第一批场景必须指向同一题材。',
  '题材标签必须和核心桥段一致，禁止挂羊头卖狗肉。',
  '读者心理、核心梗、金手指、主角身份和平台口味必须互相支撑。',
  '本章必须出现至少一个题材必备场景或同等功能场景。',
  '微创新不得超过3个，且不能压过类型模板。',
  '公式对位：所用公式必须与题材标签、篇幅和读者期待匹配，没有混用不相关公式。',
  '情绪节拍完整：情绪曲线、必选场景、核心规则和篇幅范围必须进入本章或本批计划。',
  '钩子密度达标：按题材公式设置章节/小节钩子，开头3秒抓住核心冲突或信息炸弹。',
]

const OH_STORY_GENRE_WRITING_FORMULA_ROUTES = [
  {
    match: [/现代|都市|公司|婚礼|股东|豪门|背叛/, /复仇|打脸|证据|求饶|羞辱|背叛/],
    formula: '公式一：现代复仇/打脸（6章）：当众背叛 -> 冷静处理 -> 对方反扑 -> 揭示真相 -> 求饶 -> 加冕。',
    scenes: ['当众羞辱开场', '冷静到可怕的反击', '标志性动作', '逐层揭露证据', '反派自曝', '隐藏伏笔回收'],
    rules: ['主角永不失态；用动作替代情绪；对方越歇斯底里主角越平静；先让反派得意再翻转。'],
  },
  {
    match: [/古代|宅斗|侯府|嫡女|庶女|圣旨|后院/, /身份|反转|信物|回归|被弃|软禁/],
    formula: '公式二：古代宅斗/身份反转（8节）：被弃回归 -> 后院交锋 -> 身份初露 -> 被软禁 -> 身份揭露 -> 反击推进 -> 对方反扑 -> 最终碾压。',
    scenes: ['回归羞辱', '被冤枉被打', '信物展示', '身份揭露名场面', '妹妹恶毒递进', '父母偏心加码'],
    rules: ['分步揭露身份；压抑3节释放1节；父母用偏心写，不只写坏。'],
  },
  {
    match: [/虐恋|灵魂|魂魄|死亡证明|开棺|血书/, /复仇|渣男|小三|害死|保小不保大/],
    formula: '公式三：虐恋复仇/灵魂视角（7节）：死亡回溯 -> 虐待现场 -> 小三虚伪 -> 开棺真相 -> 舆论反转 -> 崩溃现场 -> 收尾。',
    scenes: ['保小不保大', '家人被打与小三享受的对比', '孩子一句话击穿防线', '定时发布证据', '开棺', '渣男崩溃'],
    rules: ['灵魂视角能看见但无法阻止；现在和三年前回忆交替；小三每句话都是毒。'],
  },
  {
    match: [/都市|现代|中年|维修|离婚|失业|订单|生活/, /系统|面板|奖励|任务|礼包|评价/],
    formula: '公式四：都市系统/逆袭长篇（前3章）：离婚+系统激活 -> 系统面板+新手奖励 -> 离婚后+新装备。',
    scenes: ['中年危机够惨', '系统面板讽刺数据', '新手礼包立刻见效', '前妻后悔伏笔', '隐藏装备', '子女关系'],
    rules: ['系统评价+主角吐槽是核心笑点；每章结尾必有系统奖励；生活化细节建真实感。'],
  },
  {
    match: [/玄幻|仙侠|修仙|宗门|灵根|秘境/, /重生|逆袭|前世|被害|反常/],
    formula: '公式六：玄幻仙侠/重生逆袭（19章）：前世被害 -> 重生关键节点 -> 反常行动 -> 对手自疑 -> 助力出现 -> 瓦解反派 -> 最终决战。',
    scenes: ['前世死亡详细残忍', '重生后第一件事反常', '对手自我怀疑', '逐步揭露前世真相', '关键助力者有排面'],
    rules: ['不做和前世一样的事就是最大金手指；用反常行为制造信息差。'],
  },
  {
    match: [/年代|七零|八零|大团结|赤脚医生/, /双重生|替罪羊|渣男|前世|复仇/],
    formula: '公式七：年代重生/双重复仇（19章）：前世被利用 -> 双重生 -> 选新路 -> 男主登场 -> 揭发罪行 -> 证据递进 -> 身份揭露 -> 后悔收尾。',
    scenes: ['前世付出导语交代清', '双重生博弈', '年代细节', '男主看似缺陷实则完美', '渣男崩溃'],
    rules: ['年代感靠真实历史细节；双重生=双重信息战；渣男绝望反衬女主洒脱。'],
  },
  {
    match: [/宫闱|宫斗|宅斗|女帝|替嫁|京城/, /称帝|改革|家族被害|反攻|布局/],
    formula: '公式八：宫闱宅斗/女帝逆袭（19章）：家族被害 -> 被迫替嫁 -> 暗中布局 -> 带走资源 -> 积蓄力量 -> 发现阴谋 -> 反攻京城 -> 称帝改革。',
    scenes: ['家族被害够惨', '替嫁展示智慧', '带走家产转折', '每步布局有合理动机', '反攻名场面', '称帝后改革'],
    rules: ['主角从不解释计划，让读者自己猜；布局要有回顾时恍然大悟效果。'],
  },
  {
    match: [/悬疑|超自然|鬼|怨气|犯罪|伪装成人/],
    formula: '公式九：现代悬疑/超自然视角（18章）：设定鬼伪装成人 -> 被骗入局 -> 怨气升级 -> 揭露网络 -> 找幕后 -> 前世死因 -> 双重惩罚。',
    scenes: ['设定一句话说清', '被骗后不慌反喜', '鬼视角信息差', '升级解锁前世记忆', '双重惩罚'],
    rules: ['鬼视角是独特卖点；悬疑线和复仇线交织；每章结尾有反转或新发现。'],
  },
  {
    match: [/架空|历史|性别反转|追妻|火葬场/, /不原谅|离开|配偶|偏心|白月光/],
    formula: '公式十：架空历史/性别反转（19章）：被误解 -> 配偶偏心 -> 失望放弃 -> 决定离开 -> 离开后变好 -> 配偶后悔 -> 不原谅。',
    scenes: ['开篇被冤枉或被打', '白月光型情敌', '主角离开干净利落', '配偶后悔递进', '主角不原谅'],
    rules: ['核心是不被珍惜的人选择离开；配偶后悔越详细，读者不原谅越坚决。'],
  },
  {
    match: [/重生|前世/, /离婚|前夫|投资|复仇|逆袭/],
    formula: '公式十二：重生复仇/离婚逆袭（10章）：前世被害 -> 重生关键节点 -> 冷静离婚 -> 拿走财富 -> 投资成功 -> 前夫后悔 -> 坚决拒绝 -> 华丽蜕变。',
    scenes: ['前世死法和前夫直接相关', '重生后第一反应笑了', '离婚干脆要钱要利', '投资展示智慧', '前夫后悔递进'],
    rules: ['冷静是最大武器；每个决定有前世记忆支撑；投资线和感情线分开。'],
  },
  {
    match: [/总裁|豪门|虐恋|秘书旅行/, /白月光|渣男|追悔|觉醒|死遁/],
    formula: '公式十三：总裁豪门/白月光虐恋（8-11章）：虐建立矛盾 -> 觉醒离开 -> 真相揭露 -> 追悔被拒 -> 新生活治愈。',
    scenes: ['开篇信息炸弹', '白月光羞辱女主', '临界事件', '监控/证据/白月光自曝', '渣男追悔被拒'],
    rules: ['虐30%、觉醒15%、爽35%、治愈20%；伤害递进但爽按序释放不能乱序。'],
  },
  {
    match: [/女频|男频/, /复仇|打脸|审判|碾压/],
    formula: '公式十四：女频 vs 男频复仇/打脸：女频重信息差与心声，男频重行动碾压和当众身份揭露。',
    scenes: ['女频3句内建立核心矛盾', '男频第一段最大屈辱', '公开审判式打脸', '称呼改变或身份揭露'],
    rules: ['女频反派每500字升级一次；男频隐忍短、靠行动展示能力；高潮必须有公开碾压。'],
  },
  {
    match: [/宫闱|宅斗|寡嫂|隐忍|腹黑|孩子扶养/],
    formula: '公式十五：宫闱宅斗/隐忍腹黑型（8章）：主动入局 -> 以退为进 -> 借力打力 -> 静待自毁 -> 意外之喜 -> 釜底抽薪 -> 设局收网 -> 终极反转。',
    scenes: ['开篇反常行为', '情敌自毁三连', '每次让步都是布局', '结尾内心独白揭示真相'],
    rules: ['主角从不主动出手；每次情敌犯错后主角都是受害者或好人。'],
  },
  {
    match: [/追夫|不原谅|继父|妻子|天台对峙/],
    formula: '公式十六：追夫火葬场/不原谅型（8章）：发现真相 -> 彻底死心 -> 妻子失控 -> 被虐 -> 决然离开 -> 丑闻曝光 -> 重逢 -> 不原谅。',
    scenes: ['第N次制造绝望', '撞见真相', '妻子的无所谓', '继父出卖妻子', '新恋人对比', '天台对峙BE'],
    rules: ['男主越冷静越有力；妻子后悔越详细读者越觉得活该；不原谅比强行HE更有力量。'],
  },
  {
    match: [/年代|七零|八零|冲喜|大房/, /医术|银针|植物人|公公|癌症/],
    formula: '公式十七：年代重生/医术复仇型（8章）：前世极惨 -> 金手指展示 -> 以退为进 -> 丈夫醒来 -> 感情推进 -> 收网布局 -> 复仇高潮 -> BE但圆满。',
    scenes: ['前世极惨层层递进', '医术金手指', '贵人相助', '丈夫反转', '公公葬礼抓大房', 'BE结局'],
    rules: ['年代感靠细节；医术要有专业性；BE是得到一切但失去最重要的人。'],
  },
  {
    match: [/灵魂|魂魄/, /家庭|亲情|病中|祭祖|产后|手术|面子/],
    formula: '公式十八：灵魂视角家庭虐文（5章）：病中被虐 -> 旁观真相 -> 证据浮出 -> 审判清算 -> 重生暖心。',
    scenes: ['身体最脆弱时遭最大伤害', '魂魄慢慢飘起', '配角拱火', '手机/日记/监控暴露真相', '重生到温暖家庭'],
    rules: ['灵魂视角能看到但无法阻止；身体细节必须具体；结尾用温暖对比。'],
  },
  {
    match: [/细节|线索|钥匙扣|发票|香水|避孕套|调查|证据链/, /调查|微小|钥匙扣|发票|香水|避孕套|系统取证|证据链系统/],
    formula: '公式十九：细节线索驱动型复仇（8-13章）：发现异常 -> 暗中调查 -> 布局反击 -> 公开对峙 -> 连环反击。',
    scenes: ['一个触发细节', '职业优势展示', '证据链系统构建', '笑着点头时刻', '反向利用对方棋子'],
    rules: ['超短章节制；主角永远冷静；证据逐章释放；背叛层层加码。'],
  },
  {
    match: [/嫁祸|遗产|假意顺从|给你吧|移民|既要又要/],
    formula: '公式二十：反套路嫁祸型重生（7章）：重生假意顺从 -> 暗中布局 -> 小试锋芒 -> 冲突升级 -> 身份揭露 -> 收网 -> 华丽退场。',
    scenes: ['给你吧时刻', '白月光三连试探', '渣男既要又要', '身份揭露名场面', '头也不回式离开'],
    rules: ['给你就是最好的惩罚；前世记忆每章穿插一小段；最大蔑视是漠视。'],
  },
  {
    match: [/公开|当众|股东|家族寿宴|公司大堂|婚礼|审判|监控|证据/, /打脸|审判|揭露|证据|背叛|羞辱/],
    formula: '公式二十一：公开审判式打脸：设定竞技场 -> 反派先赢 -> 主角冷静 -> 逐层揭露 -> 反派崩溃 -> 驱逐台词 -> 背影离场。',
    scenes: ['公开竞技场', '反派当众宣布胜利', '主角标志性冷静', '逐层揭露证据', '反派逐级崩溃', '背影离场'],
    rules: ['必须公开；反派先赢；证据一张一张甩；全场死寂中头也不回。'],
  },
]

function inferOhStoryGenreWritingFormulaRoutes(rawText = '') {
  return OH_STORY_GENRE_WRITING_FORMULA_ROUTES
    .filter(route => route.match.every(pattern => pattern.test(rawText)))
    .slice(0, 4)
}

function genrePositioningExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.genre_positioning_contract
    || contextPackage?.chapter_target?.genrePositioningContract
    || contextPackage?.genre_positioning_contract
    || contextPackage?.genrePositioningContract
    || contextPackage?.pre_draft_brief?.genre_positioning_contract
    || contextPackage?.preDraftBrief?.genrePositioningContract
}

function inferGenrePositioningProfile(project: any = {}, contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const genreText = compactBriefText(project?.genre || contextPackage?.project?.genre || writingBible?.genre || target.genre)
  const rawText = [
    project?.title,
    genreText,
    project?.target_audience,
    project?.synopsis,
    writingBible?.golden_finger,
    writingBible?.goldenFinger,
    writingBible?.protagonist_identity,
    writingBible?.protagonistIdentity,
    commercial?.innovation_hook,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
    target.summary,
    target.conflict,
    ...sceneCards.flatMap((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.reader_payoff, scene.ending_hook_seed]),
  ].filter(Boolean).join(' ')
  const formulaRoutes = inferOhStoryGenreWritingFormulaRoutes(rawText)
  const hasUrban = /都市|现代|职场|生活|离婚|失业|维修|订单/.test(rawText)
  const hasSystem = /系统|面板|奖励|任务|礼包|评价/.test(rawText)
  const hasComeback = /逆袭|翻盘|反打|打脸|崛起|低谷|报废|证明/.test(rawText)
  const genreLabel = hasUrban && hasSystem
    ? `都市系统/${hasComeback ? '逆袭' : '成长'}长篇`
    : compactBriefText(genreText || project?.title || '类型网文长篇')
  const readerPsychology = uniqueBriefStrings([
    /中年|离婚|失业|经济|压力|报废/.test(rawText) ? '中年危机、经济压力和被轻视后的翻盘补偿。' : '',
    /尊严|看不起|质疑|前妻|上司|客户/.test(rawText) ? '尊严修复：被质疑后用现实成果反证自己。' : '',
    /系统|面板|评价|数据/.test(rawText) ? '掌控感：把混乱生活量化成可升级、可验证、可反击的目标。' : '',
    ...OH_STORY_GENRE_POSITIONING_READER_PSYCHOLOGY,
  ], 8)
  const genreFormula = uniqueBriefStrings([
    ...formulaRoutes.map(route => route.formula),
    hasSystem ? '系统面板+新手奖励+现实任务反馈。' : '',
    hasComeback ? '低谷压迫 -> 核心梗触发 -> 小胜兑现 -> 新门槛出现。' : '',
    hasUrban ? '生活困境/职业场景 -> 金手指介入 -> 现实收益验证。' : '',
    compactBriefText(commercial?.innovation_hook),
  ], 8)
  const coreHookRules = uniqueBriefStrings([
    ...formulaRoutes.flatMap(route => route.rules),
    ...OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
    ...sceneCards.map((scene: any) => scene.purpose || scene.reader_payoff),
  ], 10)
  const mustHaveScenes = uniqueBriefStrings([
    ...formulaRoutes.flatMap(route => route.scenes),
    hasSystem ? '系统面板首次给出刺眼评价或任务。' : '',
    hasSystem ? '新手奖励立刻改变一个现实困境。' : '',
    hasComeback ? '质疑者/压力源在场，主角用结果反证。' : '',
    ...sceneCards.map((scene: any, index: number) => `场景${scene.scene_no || index + 1}：${compactBriefText(scene.title || scene.purpose || scene.reader_payoff)}`),
  ], 10)
  return {
    genre_label: genreLabel,
    reader_psychology: readerPsychology,
    genre_formula: genreFormula,
    core_hook_rules: coreHookRules,
    goldfinger_fit_rules: OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES,
    micro_innovation_rules: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES,
    micro_innovation_702010_rules: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES,
    micro_innovation_methods: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS,
    longboard_focus_rules: OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES,
    must_have_scenes: mustHaveScenes,
    platform_fit_rules: [
      '平台口味必须和章节节奏一致：番茄偏快节奏、强回报、清晰冲突和短周期爽点。',
      '题材定位必须在开篇、场景目标和章尾钩子反复被验证。',
      '禁止挂羊头卖狗肉：标题/简介承诺系统逆袭，正文就必须持续交付系统逆袭的桥段。',
    ],
  }
}

export function buildGenrePositioningContract(project: any = {}, contextPackage: any = {}) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = genrePositioningExplicitContract(contextPackage)
    || writingBible?.genre_positioning_contract
    || writingBible?.genrePositioningContract
    || project?.reference_config?.genre_positioning_contract
    || project?.reference_config?.genrePositioningContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derivedProject = {
      ...(project || {}),
      reference_config: {
        ...(project?.reference_config || {}),
        genre_positioning_contract: null,
        genrePositioningContract: null,
        writing_bible: {
          ...(project?.reference_config?.writing_bible || {}),
          genre_positioning_contract: null,
          genrePositioningContract: null,
        },
      },
    }
    const derived = buildGenrePositioningContract(derivedProject, {
      ...(contextPackage || {}),
      genre_positioning_contract: null,
      genrePositioningContract: null,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.writing_bible,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitGenreTags = uniqueBriefStrings(explicit.genre_tags || explicit.genreTags || [], 8)
    const explicitGenreLabel = compactBriefText(explicit.genre_label || explicit.genreLabel || explicitGenreTags.join('/'))
    const explicitReaderPsychology = asArray(explicit.reader_psychology || explicit.readerPsychology).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGenreFormula = asArray(explicit.genre_formula || explicit.genreFormula || explicit.type_formula || explicit.typeFormula).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCoreHookRules = asArray(explicit.core_hook_rules || explicit.coreHookRules)
      .concat(asArray(explicit.selling_points || explicit.sellingPoints))
      .concat(compactBriefText(explicit.core_hook || explicit.coreHook))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGoldfingerFitRules = asArray(explicit.goldfinger_fit_rules || explicit.goldfingerFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovationRules = asArray(explicit.micro_innovation_rules || explicit.microInnovationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovation702010Rules = asArray(explicit.micro_innovation_702010_rules || explicit.microInnovation702010Rules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovationMethods = asArray(explicit.micro_innovation_methods || explicit.microInnovationMethods).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongboardFocusRules = asArray(explicit.longboard_focus_rules || explicit.longboardFocusRules)
      .concat(compactBriefText(explicit.long_board || explicit.longBoard))
      .concat(compactBriefText(explicit.innovation_boundary || explicit.innovationBoundary))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitMustHaveScenes = asArray(explicit.must_have_scenes || explicit.mustHaveScenes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_genre_positioning_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      genre_tags: explicitGenreTags.length ? explicitGenreTags : asArray(derived.genre_tags),
      platform: compactBriefText(explicit.platform || derived.platform),
      selling_points: uniqueBriefStrings(explicit.selling_points || explicit.sellingPoints || derived.selling_points || [], 8),
      genre_label: explicitGenreLabel || derived.genre_label,
      reader_psychology: explicitReaderPsychology.length ? explicitReaderPsychology : asArray(derived.reader_psychology),
      genre_formula: explicitGenreFormula.length ? explicitGenreFormula : asArray(derived.genre_formula),
      core_hook_rules: explicitCoreHookRules.length
        ? explicitCoreHookRules
        : asArray(derived.core_hook_rules).length ? asArray(derived.core_hook_rules) : OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES,
      goldfinger_fit_rules: explicitGoldfingerFitRules.length
        ? explicitGoldfingerFitRules
        : asArray(derived.goldfinger_fit_rules).length ? asArray(derived.goldfinger_fit_rules) : OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES,
      micro_innovation_rules: explicitMicroInnovationRules.length
        ? explicitMicroInnovationRules
        : asArray(derived.micro_innovation_rules).length ? asArray(derived.micro_innovation_rules) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES,
      micro_innovation_702010_rules: explicitMicroInnovation702010Rules.length
        ? explicitMicroInnovation702010Rules
        : asArray(derived.micro_innovation_702010_rules).length ? asArray(derived.micro_innovation_702010_rules) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES,
      micro_innovation_methods: explicitMicroInnovationMethods.length
        ? explicitMicroInnovationMethods
        : asArray(derived.micro_innovation_methods).length ? asArray(derived.micro_innovation_methods) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS,
      longboard_focus_rules: explicitLongboardFocusRules.length
        ? explicitLongboardFocusRules
        : asArray(derived.longboard_focus_rules).length ? asArray(derived.longboard_focus_rules) : OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES,
      must_have_scenes: explicitMustHaveScenes.length ? explicitMustHaveScenes : asArray(derived.must_have_scenes),
      platform_fit_rules: explicitPlatformFitRules.length ? explicitPlatformFitRules : asArray(derived.platform_fit_rules),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['校准题材标签', '补核心梗场景', '让金手指贴合主角生活/职业', '压缩模板外创新', '修书名简介内容错位'],
    }
  }

  const profile = inferGenrePositioningProfile(project, contextPackage)
  return {
    version: 'oh_story_genre_positioning_v1',
    source: 'oh_story_embedded_fallback',
    ...profile,
    quality_checks: OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS,
    revision_priorities: ['校准题材标签', '补核心梗场景', '让金手指贴合主角生活/职业', '压缩模板外创新', '修书名简介内容错位'],
  }
}

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

export * from './audience-quality-contracts-extended'
