/** Platform fit, analysis, and knowledge injection prompt builders. */
import type { NovelProjectRecord } from '../novel'

export function buildPlatformFitPrompt(
  project: NovelProjectRecord,
  context: { plan?: any; review?: any; prose?: any; chapters?: any[] },
): string {
  const chapters = context.chapters || []
  return [
    '任务：评估当前小说的平台适配度和市场潜力。',
    `作品标题：${project.title}`,
    project.genre ? `题材：${project.genre}` : '',
    `当前章节数：${chapters.length}`,
    `已产出正文章节：${chapters.filter((c: any) => c.chapter_text).length}`,
    '',
    '请评估以下维度：',
    '1. 题材在目标平台的匹配度',
    '2. 目标受众的精准度',
    '3. 开篇抓力（前3章的吸引力）',
    '4. 节奏和连载友好度',
    '5. 每章的质量检查（开头、冲突、悬念、留存）',
    '',
    '输出 JSON 格式：',
    baseStructuredOutputPrompt(['is_platform_ready', 'score', 'platform_type', 'market_positioning', 'strengths', 'risks', 'blocking_issues', 'recommendations', 'launch_advice', 'chapter_checks']),
  ].filter(Boolean).join('\n')
}

// ── Novel Seed (Fallback Content) ──

export function buildNovelSeed(project: NovelProjectRecord, prompt: string) {
  const requestedChapterCount = (() => {
    const m = String(prompt || '').match(/(\d{1,3})\s*章/)
    return m ? Number(m[1]) : 10
  })()

  return {
    world_summary: project.synopsis || `${project.title}的核心世界观待生成。`,
    rules: [],
    factions: [],
    locations: [],
    systems: [],
    timeline_anchor: '故事起点',
    known_unknowns: [],
    outline: {
      title: `${project.title}·暂定总纲`,
      summary: project.synopsis || '待根据项目设定生成完整故事总纲。',
      hook: `${project.title}的核心悬念待生成。`,
      chapter_count: requestedChapterCount,
    },
    volumeOutlines: [],
    chapters: [],
    characters: [],
    prompt,
    chapter_outlines: [],
    foreshadowing_plan: [],
  }
}

// ═══════════════════════════════════════════════════════════
// ── Knowledge Base: Writing Skill Extraction Prompts ──
// ═══════════════════════════════════════════════════════════

export function buildNovelAnalysisPrompt(novelTitle: string, novelText: string): string {
  return `你是一位资深的文学评论家和写作导师，精通网络小说和商业文学的写作技法。

任务：深入分析以下小说文本，提取其写作技巧、风格特征、结构设计等可复用的写作知识。

小说名称：${novelTitle}
分析文本（节选）：
"""
${novelText.slice(0, 12000)}
"""

优先从以下固定维度提炼，也允许你根据文本发现新的可复用维度并返回自定义 category：

1. character_design（人物设计）：人设模板、角色欲望、角色缺陷、人物关系、角色弧光、群像处理
2. story_design（故事设计）：核心矛盾、主线推进、阶段目标、爽点结构、冲突升级、反转设计
3. story_pacing（节奏设计）：起承转合、章节断点、高潮安排、情绪曲线、张弛节奏
4. foreshadowing（伏笔设计）：埋线手法、回收时机、多层伏笔嵌套、悬念钩子
5. ability_design（能力体系设计）：能力来源、成长曲线、能力限制、克制关系、体系层次
6. realm_design（境界设计）：境界命名、晋升条件、瓶颈机制、境界差距、资源消耗
7. worldbuilding（世界观设计）：世界规则、势力架构、地理/历史、社会秩序、制度设定
8. writing_style（写作风格）：语言质感、叙事视角、句式特征、修辞手法、叙述节奏
9. technique（写作技巧）：开篇钩子、场景切换、对话设计、信息披露、视角控制
10. volume_design（分卷设计）：卷结构规划、卷目标、跨卷衔接手法
11. genre_positioning（题材定位）：题材/子类型、平台气质、目标读者、商业卖点、读者期待
12. trope_design（套路设计）：流派套路、反套路、金手指模板、升级模板、日常模板
13. selling_point（卖点设计）：核心爽点、差异化卖点、标题/简介可提炼卖点、读者记忆点
14. reader_hook（读者钩子）：开章钩子、章末钩子、期待管理、追读驱动
15. emotion_design（情绪设计）：爽感、笑点、压抑释放、打脸、温情、紧张感
16. scene_design（场景设计）：高频场景、场景功能、场景调度、对话/动作组织
17. conflict_design（冲突设计）：人物冲突、制度冲突、资源冲突、价值观冲突、冲突升级
18. resource_economy（资源经济）：金钱、装备、修炼成本、价格梯度、资源获取与消耗闭环
19. reference_profile（参考作品画像）：全书核心公式、读者承诺、差异化卖点、可迁移结构
20. volume_architecture（分卷结构）：卷目标、卷内升级、阶段冲突、跨卷衔接
21. chapter_beat_template（章节节拍模板）：开章钩子、场景推进、爽点/笑点/压抑释放、章末钩子
22. character_function_matrix（角色功能矩阵）：主角、配角、对手、工具人、情绪承载者的功能位与关系张力
23. resource_economy_model（资源经济模型）：资源来源、价格梯度、消耗闭环、贫穷/稀缺如何驱动剧情
24. style_profile（文风画像）：叙述视角、句式密度、吐槽/幽默机制、心理描写与对白比例
25. payoff_model（爽点模型）：爽点触发条件、兑现节奏、压抑释放、奖励类型、追读驱动
26. prose_syntax_profile（文风句法）：句长分布、段落密度、修辞偏好、信息句/动作句比例
27. dialogue_mechanism（对话机制）：对话如何承载笑点、信息差、人设、冲突和节奏转场

输出 JSON 格式，是一个数组，每个元素包含以下字段：
  - category: 优先使用上述固定类别；如果文本出现更准确的新类别，也可以返回模型自定义类别（如 "faction_design"）
  - title: 知识条目的简短标题（如"开篇三行钩子法"）
  - content: 详细的分析内容和具体示例（200-500字）
  - tags: 相关标签数组（如 ["开篇", "钩子", "悬念"]）
  - genre_tags: 题材/子类型标签数组（如 ["都市修仙", "校园", "系统流"]）
  - trope_tags: 套路/卖点标签数组（如 ["贫穷流", "扮猪吃虎", "资源经济"]）
  - use_case: 这条知识适合用于什么写作任务（如 "开篇", "升级", "日常笑点", "能力设定", "章末钩子"）
  - evidence: 支撑分析的原文短证据或情节依据（不要超过 120 字）
  - chapter_range: 当前分析来源章节范围；如果无法判断，用空字符串
  - entities: 涉及的角色、势力、能力、物品、地点数组
  - confidence: 0-1 的置信度；文本证据越直接越高
  - weight: 重要程度 1-5（5 为最重要）

示例输出格式：
[
  {
    "category": "technique",
    "title": "开篇三行钩子法",
    "content": "该小说在开篇前三行即通过...（详细分析）",
    "tags": ["开篇", "钩子", "悬念"],
    "genre_tags": ["都市修仙"],
    "trope_tags": ["反差开局"],
    "use_case": "开篇",
    "evidence": "原文中主角一登场就遭遇...",
    "chapter_range": "第1章",
    "entities": ["主角"],
    "confidence": 0.82,
    "weight": 5
  },
  ...
]

⚠️ 绝对不要返回 markdown 格式，必须是纯 JSON 数组。
⚠️ 固定类别中凡是文本有依据的类别至少产出 1 条知识点，总共产出 14-32 条；不要为了凑类别编造文本不存在的内容。
⚠️ 如果文本来自连续多章或整本书，必须至少产出 reference_profile、chapter_beat_template、character_function_matrix、style_profile、payoff_model、prose_syntax_profile；如有分卷/阶段推进证据，产出 volume_architecture；如有金钱、装备、修炼成本、资源稀缺，产出 resource_economy_model；如对话承担笑点/信息差/冲突推进，产出 dialogue_mechanism。
⚠️ 新增 profile 类知识必须写成“可迁移蓝图”，不要只复述原剧情；同时在 content 里标明“可借鉴结构”和“避免照搬点”。
⚠️ tags 支持自由标签：请加入文本中真实出现或可概括出的标签，例如"人物设计"、"境界瓶颈"、"能力代价"、"章节钩子"。
⚠️ genre_tags/trope_tags 必须服务于后续创作检索，不要只复制 category 名称。
⚠️ 分析必须基于文本中的具体内容，引用原文片段作为佐证。`
}

// ── Knowledge Injection: Inject knowledge base into creation prompts ──

export function buildKnowledgeInjectionPrompt(
  projectGenre: string,
  taskType: string,
  knowledgeEntries: Array<{
    category: string
    title: string
    content: string
    weight: number
    genre_tags?: string[]
    trope_tags?: string[]
    use_case?: string
    evidence?: string
    chapter_range?: string
    source_project?: string
    reference_weight?: number
  }>,
): string {
  if (!knowledgeEntries.length) return ''

  const parts: string[] = []
  parts.push(`\n\n📚【写作知识库参考 — 根据你的题材"${projectGenre}"和当前任务"${taskType}"，以下是从优秀作品中提炼的写作知识：】\n`)

  // Group by category
  const groups: Record<string, typeof knowledgeEntries> = {}
  for (const entry of knowledgeEntries) {
    if (!groups[entry.category]) groups[entry.category] = []
    groups[entry.category].push(entry)
  }

  const categoryLabels: Record<string, string> = {
    character_design: '人物设计',
    story_design: '故事设计',
    realm_design: '境界设计',
    writing_style: '写作风格',
    technique: '写作技巧',
    foreshadowing: '伏笔设计',
    worldbuilding: '世界观设计',
    ability_design: '能力体系设计',
    story_pacing: '节奏设计',
    volume_design: '分卷设计',
    character_craft: '角色塑造',
    genre_positioning: '题材定位',
    trope_design: '套路设计',
    selling_point: '卖点设计',
    reader_hook: '读者钩子',
    emotion_design: '情绪设计',
    scene_design: '场景设计',
    conflict_design: '冲突设计',
    resource_economy: '资源经济',
    reference_profile: '参考作品画像',
    volume_architecture: '分卷结构',
    chapter_beat_template: '章节节拍模板',
    character_function_matrix: '角色功能矩阵',
    resource_economy_model: '资源经济模型',
    style_profile: '文风画像',
  }

  for (const [cat, entries] of Object.entries(groups)) {
    parts.push(`— ${categoryLabels[cat] || cat} —`)
    for (const entry of entries) {
      parts.push(`  💡 ${entry.title}（重要度: ${entry.weight}/5）`)
      const meta: string[] = []
      if (entry.source_project) meta.push(`参考:${entry.source_project}`)
      if (entry.reference_weight) meta.push(`权重:${Math.round(entry.reference_weight * 100)}%`)
      if (entry.use_case) meta.push(`用途:${entry.use_case}`)
      if (entry.genre_tags?.length) meta.push(`题材:${entry.genre_tags.join('、')}`)
      if (entry.trope_tags?.length) meta.push(`套路:${entry.trope_tags.join('、')}`)
      if (entry.chapter_range) meta.push(`依据:${entry.chapter_range}`)
      if (meta.length) parts.push(`    ${meta.join('；')}`)
      parts.push(`    ${entry.content.slice(0, 300)}`)
      if (entry.evidence) parts.push(`    证据：${entry.evidence.slice(0, 120)}`)
      parts.push('')
    }
  }

  parts.push('⚠️ 请注意：以上知识是参考蓝图，不是模板。只能借鉴结构、功能和节奏，禁止照搬原作品角色名、专有名词、具体桥段顺序和原文表达。')

  return parts.join('\n')
}
