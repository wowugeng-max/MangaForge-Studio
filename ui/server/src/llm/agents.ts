import type { NovelAgentSpec, NovelProjectRecord } from '../novel'

export function buildNovelAgentPlan(project: NovelProjectRecord): NovelAgentSpec[] {
  return [
    // ═══════════════════════════════════════════════════
    //  阶段一：设定锚定（市场分析 → 世界观 → 角色）
    // ═══════════════════════════════════════════════════
    {
      id: 'market-agent',
      role: '市场分析',
      goal: '从题材、风格、商业标签推导写作偏好和平台策略',
      output_schema: ['preferred_hook', 'pace_hint', 'tone_hint', 'market_tags'],
      depends_on: [],
    },
    {
      id: 'world-agent',
      role: '世界观构建',
      goal: '生成世界规则、力量体系、势力关系、关键地点、关键物品清单、时间锚点',
      output_schema: ['world_summary', 'rules', 'factions', 'locations', 'systems', 'items', 'timeline_anchor', 'known_unknowns'],
      depends_on: ['market-agent'],
    },
    {
      id: 'character-agent',
      role: '角色构建',
      goal: '生成角色卡（性格、动机、目标、能力、背景、关系网、弧光）',
      output_schema: ['characters'],
      depends_on: ['world-agent'],
    },

    // ═══════════════════════════════════════════════════
    //  阶段二：大纲生成（总纲 → 卷纲 → 粗略章纲 → 伏笔计划）
    // ═══════════════════════════════════════════════════
    {
      id: 'outline-agent',
      role: '结构规划',
      goal: '生成总纲、卷纲、粗略章纲（每章标题+摘要+冲突+结尾钩子）、伏笔计划',
      output_schema: ['master_outline', 'volume_outlines', 'chapter_outlines', 'foreshadowing_plan'],
      depends_on: ['world-agent', 'character-agent'],
    },

    // ═══════════════════════════════════════════════════
    //  阶段三：细纲分化（逐章生成场景级别的详细大纲）
    //  这是写作质量的核心——细纲决定了正文的骨架
    // ═══════════════════════════════════════════════════
    {
      id: 'detail-outline-agent',
      role: '细纲分化',
      goal: '将粗略章纲扩写为场景级别的细纲，包含场景序列、出场角色、情绪曲线、物品清单、前后章衔接',
      output_schema: ['detail_chapters'],
      depends_on: ['outline-agent', 'world-agent', 'character-agent'],
    },

    // ═══════════════════════════════════════════════════
    //  阶段四：连续性预检（在写正文之前检查细纲是否自洽）
    //  这一步可以拦截 80% 的连续性错误，避免写完后才发现
    // ═══════════════════════════════════════════════════
    {
      id: 'continuity-check-agent',
      role: '连续性预检',
      goal: '检查细纲中章节之间的衔接是否自洽：角色状态连续、物品不凭空消失、时间线合理、因果链完整',
      output_schema: ['continuity_issues', 'continuity_fixes', 'is_ready_for_prose'],
      depends_on: ['detail-outline-agent'],
    },

    // ═══════════════════════════════════════════════════
    //  阶段五：正文创作（基于细纲 + 设定 + 前章结尾）
    // ═══════════════════════════════════════════════════
    {
      id: 'prose-agent',
      role: '正文创作',
      goal: '根据细纲的场景序列、世界观约束、角色设定、前章结尾状态，创作完整的章节正文',
      output_schema: ['prose_chapters'],
      depends_on: ['detail-outline-agent', 'continuity-check-agent'],
    },

    // ═══════════════════════════════════════════════════
    //  阶段六：审校与修复
    // ═══════════════════════════════════════════════════
    {
      id: 'review-agent',
      role: '连续性审校',
      goal: '检查已完成的正文中的连续性问题：时间线、角色行为一致性、伏笔回收、设定崩塌',
      output_schema: ['issues', 'repair_suggestions'],
      depends_on: ['prose-agent'],
    },
    {
      id: 'market-review-agent',
      role: '市场适配审校',
      goal: '评估内容是否符合平台连载和上架要求',
      output_schema: ['is_market_ready', 'score', 'strengths', 'risks', 'platform_fit', 'recommendations'],
      depends_on: ['prose-agent', 'review-agent'],
    },
    {
      id: 'platform-fit-agent',
      role: '平台适配审稿',
      goal: '判断作品是否适合小说平台连载和上架，给出评分和改进建议',
      output_schema: ['is_platform_ready', 'score', 'platform_type', 'market_positioning', 'strengths', 'risks', 'blocking_issues', 'recommendations', 'launch_advice', 'chapter_checks'],
      depends_on: ['prose-agent', 'review-agent', 'market-review-agent'],
    },
  ]
}

export function validateAgentPlan(plan: NovelAgentSpec[]) {
  const ids = new Set(plan.map(item => item.id))
  const missingDependencies: Array<{ agent_id: string; missing: string[] }> = []

  for (const agent of plan) {
    const missing = agent.depends_on.filter(dep => !ids.has(dep))
    if (missing.length > 0) missingDependencies.push({ agent_id: agent.id, missing })
  }

  return { valid: missingDependencies.length === 0, missingDependencies }
}

export function getAgentDependencies(agentId: string, plan: NovelAgentSpec[]) {
  return plan.find(item => item.id === agentId)?.depends_on || []
}

export function topologicalSortAgents(plan: NovelAgentSpec[]) {
  const byId = new Map(plan.map(item => [item.id, item]))
  const visited = new Set<string>()
  const temp = new Set<string>()
  const result: NovelAgentSpec[] = []

  const visit = (id: string) => {
    if (visited.has(id) || temp.has(id)) return
    temp.add(id)
    const agent = byId.get(id)
    if (agent) {
      for (const dep of agent.depends_on) visit(dep)
      visited.add(id)
      result.push(agent)
    }
    temp.delete(id)
  }

  for (const agent of plan) visit(agent.id)
  return result
}

// ── 阶段分组：用于 UI 展示和分步执行 ──

export const AGENT_PHASES: Record<string, { label: string; agents: string[]; description: string }> = {
  setup: {
    label: '设定锚定',
    agents: ['market-agent', 'world-agent', 'character-agent'],
    description: '构建世界观、角色、市场分析等基础设定',
  },
  outline: {
    label: '大纲生成',
    agents: ['outline-agent'],
    description: '生成总纲、卷纲、粗略章纲、伏笔计划',
  },
  detail: {
    label: '细纲分化',
    agents: ['detail-outline-agent', 'continuity-check-agent'],
    description: '逐章生成场景级别细纲，并进行连续性预检',
  },
  prose: {
    label: '正文创作',
    agents: ['prose-agent'],
    description: '基于细纲和设定创作完整正文',
  },
  review: {
    label: '审校修复',
    agents: ['review-agent', 'market-review-agent', 'platform-fit-agent'],
    description: '检查连续性问题，评估市场适配度',
  },
}

/**
 * 根据阶段名获取该阶段包含的 agent 列表
 */
export function getAgentsByPhase(phase: string, plan: NovelAgentSpec[]): NovelAgentSpec[] {
  const phaseInfo = AGENT_PHASES[phase]
  if (!phaseInfo) return []
  return plan.filter(a => phaseInfo.agents.includes(a.id))
}
