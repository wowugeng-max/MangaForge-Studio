import type { NovelProjectRecord } from '../novel'

function joinTags(items?: string[]) {
  return (items || []).filter(Boolean).join('、') || '无'
}

export function baseNovelSystemPrompt() {
  return '你是一个严格遵守结构化输出的小说创作 agent，优先保证一致性、可追踪性和可修复性。'
}

export function baseStructuredOutputPrompt(schema: string[]) {
  return `请严格按照以下字段输出 JSON，不要输出无关内容：${schema.join(', ')}`
}

export function baseContinuityPrompt() {
  return '请重点检查时间线、角色动机、设定一致性、伏笔回收和章节衔接。'
}

// P1-3: 风格一致性 — 根据 style_tags 生成风格护栏规则
// 注入到 System Prompt 中，对每个 Agent 生效
export function buildStyleGuardrails(project: NovelProjectRecord): string {
  const tags = project.style_tags || []
  if (tags.length === 0) return ''

  // 预定义的风格映射 — 将常见标签扩展为具体的写作规则
  const STYLE_RULES: Record<string, string[]> = {
    '热血': ['战斗场景必须突出力量感与情绪张力', '主角在逆境中必须展现不屈意志', '胜利必须伴随代价或新冲突'],
    '轻松': ['对话幽默风趣但不油腻', '冲突化解方式偏向巧妙而非暴力', '允许日常片段调节节奏'],
    '暗黑': ['世界观存在灰色地带，角色动机不必完全正面', '结局不一定圆满，反转偏向残酷', '描写中可包含压抑与不安的氛围'],
    '慢热': ['前3章以铺垫世界观和人物关系为主', '冲突逐步升级而非一开始就爆发', '伏笔回收周期可以较长'],
    '快节奏': ['每章必须有一次事件推进或信息揭露', '减少长篇环境描写，用动作与对话推进', '悬念必须在章末出现'],
    '细腻': ['注重人物心理描写，展现角色内心世界', '场景描写需包含感官细节', '对话中隐含潜台词，不直白'],
    '悬疑': ['线索必须在正文中埋设，不能突兀出现', '读者信息量 < 主角信息量，制造认知差', '每个章节结尾留下未解之谜'],
    '爽文': ['主角必须在冲突中获得明显优势或成长', '反派被打脸要有铺垫，不能纯靠运气', '爽点分布均匀，每2-3章至少一次'],
    '虐心': ['角色之间存在不可调和的矛盾', '重要抉择需付出情感代价', '允许角色失去关键关系或信念'],
    '群像': ['多名角色均有独立视角和成长弧线', '角色之间的互动推动剧情而非主角独断', '避免配角沦为工具人'],
  }

  const rules: string[] = []
  for (const tag of tags) {
    const matched = STYLE_RULES[tag]
    if (matched) {
      rules.push(...matched)
    } else {
      // 未知标签：生成通用规则
      rules.push(`标签"${tag}"：写作时保持该风格的特征，确保语气、节奏、冲突方式与之吻合。`)
    }
  }

  if (rules.length === 0) return ''

  // 去重
  const unique = Array.from(new Set(rules))
  return `
### 风格护栏（Style Guardrails）
以下为项目风格要求，所有输出必须遵守：
${unique.map((r, i) => `${i + 1}. ${r}`).join('\n')}

在生成正文、大纲、角色对话、世界观设定时，请检查是否与上述风格要求一致。如有偏离，优先调整输出以符合风格。`
}

const GENRE_TEMPLATES: Record<string, { world_hint: string; hook: string; volume_title: string; volume_summary: string; ch1: string; ch2: string; ch1_goal: string; ch2_goal: string; ch1_conflict: string; ch2_conflict: string; ch1_hook: string; ch2_hook: string; char_archetypes: string[] }> = {
  '科幻': {
    world_hint: '近未来或星际时代，科技与文明碰撞', hook: '一项技术突破彻底改写了人类对现实的认知。',
    volume_title: '第一卷：技术异变', volume_summary: '主角接触关键科技，发现其背后隐藏着颠覆性的真相。',
    ch1: '第一章：技术觉醒', ch2: '第二章：规则验证',
    ch1_goal: '用技术异变引爆悬念并展示世界观。', ch2_goal: '让主角验证技术并发现其隐藏的代价。',
    ch1_conflict: '技术带来的便利与未知的危险并存。', ch2_conflict: '越深入技术核心，越接近不可控的威胁。',
    ch1_hook: '主角发现这项技术早已存在，只是被抹去了历史记录。', ch2_hook: '主角从技术底层代码中找到了一个不属于任何人的身份标记。',
    char_archetypes: ['技术天才 / 边缘人', '理性助手', '科技寡头 / 隐秘操盘者'],
  },
  '玄幻': {
    world_hint: '修真/灵能世界，等级森严，万物有灵', hook: '一个被遗忘的力量体系在主角身上觉醒。',
    volume_title: '第一卷：觉醒之路', volume_summary: '主角意外觉醒力量，踏入修真之路，发现世界等级制度背后的真相。',
    ch1: '第一章：灵根初现', ch2: '第二章：入门试炼',
    ch1_goal: '以力量觉醒引爆期待感并展示修炼体系。', ch2_goal: '让主角通过试炼，接触更广阔的世界。',
    ch1_conflict: '天赋与出身之间的矛盾。', ch2_conflict: '实力提升带来的关注与敌意同时增加。',
    ch1_hook: '主角的灵根类型在百年间从未出现过。', ch2_hook: '试炼中遇到的老者暗示主角的身世并非普通。',
    char_archetypes: ['废柴逆袭 / 隐藏天命', '师门引路人', '天骄对手 / 宗门打压者'],
  },
  '都市': {
    world_hint: '现代都市，现实感强，人物关系复杂', hook: '一个看似平凡的人物背后隐藏着不平凡的秘密。',
    volume_title: '第一卷：暗流涌动', volume_summary: '主角在城市中卷入一场利益与情感的漩涡。',
    ch1: '第一章：暗涌', ch2: '第二章：卷入',
    ch1_goal: '用日常中的异常细节制造代入感与悬念。', ch2_goal: '让主角被迫卷入核心事件。',
    ch1_conflict: '平凡生活与暗藏危机的反差。', ch2_conflict: '介入事件后的利益冲突与道德抉择。',
    ch1_hook: '主角收到了一封来自已故亲友的神秘信件。', ch2_hook: '信件中提到的地点，恰好是城市中一个被封锁的秘密。',
    char_archetypes: ['平凡人物 / 被迫成长', '利益盟友', '幕后操控者'],
  },
  '悬疑': {
    world_hint: '推理与解谜，线索层层递进，真相隐藏在细节中', hook: '一桩看似普通的案件中隐藏着精心设计的骗局。',
    volume_title: '第一卷：迷雾初现', volume_summary: '主角接手案件，发现线索指向一个更大的阴谋。',
    ch1: '第一章：迷雾', ch2: '第二章：线索',
    ch1_goal: '以强烈悬念开场，抛出案件核心矛盾。', ch2_goal: '让主角找到第一条关键线索，同时引入误导。',
    ch1_conflict: '真相与表象的落差。', ch2_conflict: '线索指向两个矛盾的方向。',
    ch1_hook: '案发现场留下了一条与五年前悬案相同的标记。', ch2_hook: '主角发现目击证人的证词中有一个不可能的细节。',
    char_archetypes: ['侦探 / 敏锐观察者', '线索提供者 / 不可靠证人', '嫌疑人 / 幕后黑手'],
  },
  '奇幻': {
    world_hint: '魔法与冒险，多元种族，史诗感', hook: '一个古老的预言在主角身上开始应验。',
    volume_title: '第一卷：预言之始', volume_summary: '主角踏上冒险旅程，逐步发现预言背后的真相。',
    ch1: '第一章：预言降临', ch2: '第二章：启程',
    ch1_goal: '用预言的应验引爆史诗感。', ch2_goal: '让主角正式踏上旅程，遇到第一位伙伴。',
    ch1_conflict: '命运与自由意志的冲突。', ch2_conflict: '旅途中的危险与未知的诱惑。',
    ch1_hook: '预言中提到的征兆在主角面前逐一显现。', ch2_hook: '第一位伙伴的真实身份与预言中的"背叛者"吻合。',
    char_archetypes: ['被选中的冒险者', '忠诚伙伴', '暗影中的敌对势力'],
  },
  '仙侠': {
    world_hint: '仙门林立，道法自然，恩怨情仇交织', hook: '一段被封印的往事在主角身上重演。',
    volume_title: '第一卷：仙缘初启', volume_summary: '主角因缘际会踏入仙途，发现大道之争背后的因果。',
    ch1: '第一章：仙缘', ch2: '第二章：入门',
    ch1_goal: '以机缘巧合引爆期待，展示仙侠世界观。', ch2_goal: '让主角拜入仙门，初识大道。',
    ch1_conflict: '凡尘与仙道的差距。', ch2_conflict: '仙门内的派系之争与主角的清纯之道。',
    ch1_hook: '主角获得的神秘法器中封印着一段上古记忆。', ch2_hook: '主角的法器引起了门派中某位长老的强烈反应。',
    char_archetypes: ['凡人之姿 / 道心坚定', '仙门引路人', '宗门宿敌 / 前世因果者'],
  },
  '言情': {
    world_hint: '情感驱动，人物心理细腻，关系张力十足', hook: '一次相遇让两个人的人生轨迹彻底改变。',
    volume_title: '第一卷：初遇与纠葛', volume_summary: '主角在命运的安排下相遇，情感在纠葛中逐渐升温。',
    ch1: '第一章：初遇', ch2: '第二章：靠近',
    ch1_goal: '用戏剧性的相遇制造情感张力。', ch2_goal: '让两人关系产生微妙变化。',
    ch1_conflict: '心动与理智的拉扯。', ch2_conflict: '靠近过程中的误会与试探。',
    ch1_hook: '主角发现对方似乎认识自己，但自己毫无印象。', ch2_hook: '一次意外让主角看到了对方不为人知的一面。',
    char_archetypes: ['深情但不善表达', '外冷内热的吸引者', '情感阻碍者'],
  },
}

function resolveGenreKey(genre: string): string {
  for (const key of Object.keys(GENRE_TEMPLATES)) {
    if (genre.includes(key) || key.includes(genre)) return key
  }
  return '科幻'
}

function resolveStyleTags(styleTags: string[]): string {
  return styleTags.length > 0 ? styleTags.join('、') : '叙事流畅、节奏紧凑'
}

export function buildNovelSeed(project: NovelProjectRecord, prompt: string) {
  const genre = String(project.genre || '科幻')
  const title = String(project.title || '未命名小说')
  const hint = prompt || `围绕《${title}》生成完整小说`
  const template = GENRE_TEMPLATES[resolveGenreKey(genre)]
  const styles = resolveStyleTags(project.style_tags || [])

  const world_summary = `在《${title}》中，故事发生于一个${genre}世界，核心设定围绕"${hint}"展开。世界观基调：${template.world_hint}。写作风格：${styles}。`
  const rules = [
    `所有${genre === '玄幻' || genre === '仙侠' ? '能力与修炼' : genre === '科幻' ? '科技设定' : '设定'}必须遵循统一规则，不得随意破坏因果。`,
    '人物成长必须与事件推动同步，不允许无缘无故升级。',
    '每一卷都必须有明确目标、冲突、反转与收束。',
    `叙事风格要求：${styles}。`,
  ]
  const characters = [
    { name: '主角', role_type: '主角', archetype: template.char_archetypes[0], motivation: '从困境中找出真相并改变命运', goal: '完成自我救赎', conflict: '对未知世界的恐惧与责任并存' },
    { name: '关键伙伴', role_type: '重要配角', archetype: template.char_archetypes[1], motivation: '帮助主角活下去并揭开真相', goal: '找到线索或系统真相', conflict: '对规则与自由的冲突' },
    { name: '主要对立者', role_type: '反派', archetype: template.char_archetypes[2], motivation: '维持表面秩序或完成更大目的', goal: '阻止主角打破规则', conflict: '其目标与主角的生存目标冲突' },
  ]
  const outline = {
    outline_type: 'master', title: `${title} 总纲`,
    summary: `${hint}。主线围绕"${template.volume_summary}"展开，风格要求：${styles}。`,
    conflict_points: ['主角被卷入核心事件', '规则真相逐步揭露', '伙伴分裂与立场冲突', '反派的真实目的浮出水面', '最终决战与收束'],
    turning_points: ['发现世界/事件的真正面貌', '失去关键伙伴或关键资源', '主角第一次主动反击', '反派露出更深层的身份'],
    hook: template.hook,
  }
  const volumeOutlines = [{
    outline_type: 'volume', title: template.volume_title, summary: template.volume_summary,
    conflict_points: ['初次卷入', '伙伴加入', '规则验证', '代价显现'],
    turning_points: ['发现更大的真相', '第一次失败代价'],
    hook: '第一卷结尾必须让主角意识到更大的力量或操控者存在。', parent_id: null,
  }]
  const chapters = [
    { chapter_no: 1, title: template.ch1, chapter_goal: template.ch1_goal, chapter_summary: `主角在${genre}世界中遭遇第一轮异常事件。`, conflict: template.ch1_conflict, ending_hook: template.ch1_hook, status: 'draft', outline_id: null },
    { chapter_no: 2, title: template.ch2, chapter_goal: template.ch2_goal, chapter_summary: `主角尝试验证发现，接触${genre === '玄幻' || genre === '仙侠' ? '修炼' : '核心'}体系的第一条规则。`, conflict: template.ch2_conflict, ending_hook: template.ch2_hook, status: 'draft', outline_id: null },
  ]
  return { world_summary, rules, characters, outline, chapters, volumeOutlines }
}

export function buildMarketPrompt(project: NovelProjectRecord, context?: { hint?: string; upstreamContext?: string }) {
  const hint = context?.hint || ''
  return [
    baseNovelSystemPrompt(),
    '任务：分析作品市场方向并输出写作偏好。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    `子题材：${joinTags(project.sub_genres)}`,
    `风格标签：${joinTags(project.style_tags)}`,
    `商业标签：${joinTags(project.commercial_tags)}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['preferred_hook', 'pace_hint', 'tone_hint', 'market_tags']),
  ].filter(Boolean).join('\n')
}

export function buildWorldPrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    '任务：生成世界观设定。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['world_summary', 'rules', 'factions', 'locations', 'systems', 'timeline_anchor', 'known_unknowns']),
  ].filter(Boolean).join('\n')
}

export function buildCharacterPrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    '任务：生成角色卡和关系动力。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['characters']),
  ].filter(Boolean).join('\n')
}

export function buildOutlinePrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    '任务：生成总纲、卷纲和章纲结构。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['master_outline', 'volume_outlines', 'chapter_outlines']),
  ].filter(Boolean).join('\n')
}

export function buildChapterPrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    '任务：把章纲扩写成章节草稿。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['chapters']),
  ].filter(Boolean).join('\n')
}

export function buildProsePrompt(project: NovelProjectRecord, chapter: Record<string, any>, context: { worldbuilding?: any; characters?: any; outline?: any; prevChapters?: Array<Record<string, any>>; }) {
  const prevChapterTexts = (context.prevChapters || [])
    .filter((ch: Record<string, any>) => ch.chapter_text)
    .slice(-2)
    .map((ch: Record<string, any>) => `  ${ch.title || '第' + ch.chapter_no + '章'}：${(ch.chapter_text || '').slice(0, 500)}`)
    .join('\n')

  return [
    baseNovelSystemPrompt(),
    '任务：把章节草稿扩写成完整正文。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    `风格标签：${joinTags(project.style_tags)}`,
    `章节标题：${chapter.title || ''}`,
    `章节编号：${chapter.chapter_no || '?'}`,
    `章节目标：${chapter.chapter_goal || ''}`,
    `章节摘要：${chapter.chapter_summary || ''}`,
    `冲突：${chapter.conflict || ''}`,
    `结尾钩子：${chapter.ending_hook || ''}`,
    ...(prevChapterTexts ? [`前置章节正文（用于保持叙事连贯）：\n${prevChapterTexts}`] : []),
    `世界观：${JSON.stringify(context.worldbuilding || {})}`,
    `角色：${JSON.stringify(context.characters || {})}`,
    `总纲：${JSON.stringify(context.outline || {})}`,
    '要求：输出完整正文、保持角色语气一致、包含场景推进和对话、注意与前置章节的叙事衔接，不要只写摘要。',
    baseStructuredOutputPrompt(['prose_chapters']),
  ].filter(Boolean).join('\n')
}

export function buildReviewPrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    baseContinuityPrompt(),
    '任务：审查连续性问题并输出修复建议。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['issues', 'repair_suggestions']),
  ].filter(Boolean).join('\n')
}

export function buildRepairPrompt(
  project: NovelProjectRecord,
  reviewIssues: Array<any>,
  originalContent: {
    worldbuilding?: any;
    characters?: any[];
    outlines?: any[];
    chapters?: any[];
  },
) {
  return [
    baseNovelSystemPrompt(),
    baseContinuityPrompt(),
    '任务：根据审校指出的具体问题，逐一修复并输出修复后的完整内容。',
    '你必须对每个问题给出修复后的原文（不是只加后缀），修复内容必须保持原有风格与叙事连贯性。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    `风格标签：${joinTags(project.style_tags)}`,
    `审校问题（${reviewIssues.length} 个）：`,
    reviewIssues.map((issue, i) => `  ${i + 1}. ${typeof issue === 'string' ? issue : JSON.stringify(issue)}`).join('\n') || '  （无具体问题）',
    `当前世界观：${JSON.stringify(originalContent.worldbuilding || {})}`,
    `当前角色：${JSON.stringify(originalContent.characters || [])}`,
    `当前大纲：${JSON.stringify(originalContent.outlines || [])}`,
    `当前章节（${(originalContent.chapters || []).length} 章）：`,
    (originalContent.chapters || []).map((ch) => `  第${ch.chapter_no || '?'}章「${ch.title || ''}」：${(ch.chapter_summary || ch.chapter_text || '').slice(0, 200)}`).join('\n'),
    '输出要求：对每个问题输出修复后的完整内容（章节正文、大纲摘要等），不要只写"已修订"。',
    baseStructuredOutputPrompt(['issues_fixed', 'repaired_chapters', 'repaired_outlines', 'repaired_characters', 'repaired_worldbuilding'] as const),
  ].filter(Boolean).join('\n')
}

export function buildMarketReviewPrompt(project: NovelProjectRecord, plan: Record<string, any>, review: Record<string, any>, prose: Record<string, any>) {
  return [
    baseNovelSystemPrompt(),
    '任务：评估作品是否适合小说平台连载与上架。',
    '请从市场适配、开篇抓力、连载续航、角色记忆点、平台风险五个维度给出判断。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    `子题材：${joinTags(project.sub_genres)}`,
    `风格标签：${joinTags(project.style_tags)}`,
    `商业标签：${joinTags(project.commercial_tags)}`,
    `规划结果：${JSON.stringify(plan || {})}`,
    `连续性审校：${JSON.stringify(review || {})}`,
    `正文样本：${JSON.stringify(prose || {})}`,
    '输出要求：is_market_ready, score(0-100), strengths, risks, platform_fit, recommendations',
    baseStructuredOutputPrompt(['is_market_ready', 'score', 'strengths', 'risks', 'platform_fit', 'recommendations'] as const),
  ].filter(Boolean).join('\n')
}

export function buildPlatformFitPrompt(project: NovelProjectRecord, context: { plan?: Record<string, any>; review?: Record<string, any> | null; prose?: Record<string, any>; chapters?: Array<Record<string, any>> } = {}) {
  const firstThreeChapters = Array.isArray(context.chapters) ? context.chapters.slice(0, 3) : []
  return [
    baseNovelSystemPrompt(),
    '任务：判断作品是否适合小说平台连载与上架。',
    '请从商业化、平台化、连载节奏、开篇抓力、冲突推进、角色记忆点、风险控制几个维度进行判断。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    `子题材：${joinTags(project.sub_genres)}`,
    `风格标签：${joinTags(project.style_tags)}`,
    `商业标签：${joinTags(project.commercial_tags)}`,
    `长度目标：${project.length_target || '未知'}`,
    `目标读者：${project.target_audience || '未知'}`,
    `规划结果：${JSON.stringify(context.plan || {})}`,
    `连续性审校：${JSON.stringify(context.review || {})}`,
    `正文样本：${JSON.stringify(context.prose || {})}`,
    `前3章样本：${JSON.stringify(firstThreeChapters)}`,
    '输出要求：is_platform_ready, score, platform_type, market_positioning, strengths, risks, blocking_issues, recommendations, launch_advice, chapter_checks',
    baseStructuredOutputPrompt(['is_platform_ready', 'score', 'platform_type', 'market_positioning', 'strengths', 'risks', 'blocking_issues', 'recommendations', 'launch_advice', 'chapter_checks'] as const),
  ].filter(Boolean).join('\n')
}
