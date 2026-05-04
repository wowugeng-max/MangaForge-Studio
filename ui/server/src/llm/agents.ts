import type { NovelAgentSpec, NovelProjectRecord } from '../novel'

export function buildNovelAgentPlan(project: NovelProjectRecord): NovelAgentSpec[] {
  return [
    {
      id: 'market-agent',
      role: '市场分析',
      goal: '从题材、风格、商业标签推导写作偏好',
      output_schema: ['preferred_hook', 'pace_hint', 'tone_hint', 'market_tags'],
      depends_on: [],
    },
    {
      id: 'world-agent',
      role: '世界观构建',
      goal: '生成世界规则与结构化设定',
      output_schema: ['world_summary', 'rules', 'factions', 'locations', 'systems', 'timeline_anchor', 'known_unknowns'],
      depends_on: ['market-agent'],
    },
    {
      id: 'character-agent',
      role: '角色构建',
      goal: '生成角色卡和关系动力',
      output_schema: ['characters'],
      depends_on: ['world-agent'],
    },
    {
      id: 'outline-agent',
      role: '结构规划',
      goal: '生成总纲、卷纲、章纲树',
      output_schema: ['master_outline', 'volume_outlines', 'chapter_outlines'],
      depends_on: ['world-agent', 'character-agent'],
    },
    {
      id: 'chapter-agent',
      role: '章节生成',
      goal: '把章纲扩写成章节草稿',
      output_schema: ['chapters'],
      depends_on: ['outline-agent'],
    },
    {
      id: 'prose-agent',
      role: '正文扩写',
      goal: '把章节草稿扩写成完整正文',
      output_schema: ['prose_chapters'],
      depends_on: ['chapter-agent'],
    },
    {
      id: 'review-agent',
      role: '连续性审校',
      goal: '检查冲突并输出修复建议',
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
      goal: '判断作品是否适合小说平台连载和上架',
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
