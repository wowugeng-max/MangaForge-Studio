import type { NovelProjectRecord, NovelStrategySpec } from '../novel'
import type { NovelAgentOutputSchemas } from './types'

export function buildNovelStrategy(_project: NovelProjectRecord): NovelStrategySpec[] {
  return [
    {
      agent_id: 'market-agent',
      model_tier: 'fast',
      temperature: 0.2,
      retries: 2,
      response_schema: ['preferred_hook', 'pace_hint', 'tone_hint', 'market_tags'] satisfies NovelAgentOutputSchemas['market'],
    },
    {
      agent_id: 'world-agent',
      model_tier: 'balanced',
      temperature: 0.35,
      retries: 2,
      response_schema: ['world_summary', 'rules', 'factions', 'locations', 'systems', 'timeline_anchor', 'known_unknowns'] satisfies NovelAgentOutputSchemas['world'],
      fallback_agent: 'market-agent',
    },
    {
      agent_id: 'character-agent',
      model_tier: 'balanced',
      temperature: 0.45,
      retries: 2,
      response_schema: ['characters'] satisfies NovelAgentOutputSchemas['characters'],
    },
    {
      agent_id: 'outline-agent',
      model_tier: 'creative',
      temperature: 0.55,
      retries: 3,
      response_schema: ['master_outline', 'volume_outlines', 'chapter_outlines'] satisfies NovelAgentOutputSchemas['outline'],
    },
    {
      agent_id: 'chapter-agent',
      model_tier: 'creative',
      temperature: 0.7,
      retries: 3,
      response_schema: ['chapters'] satisfies NovelAgentOutputSchemas['chapter'],
    },
    {
      agent_id: 'prose-agent',
      model_tier: 'creative',
      temperature: 0.75,
      retries: 3,
      response_schema: ['prose_chapters'] satisfies NovelAgentOutputSchemas['prose'],
    },
    {
      agent_id: 'review-agent',
      model_tier: 'review',
      temperature: 0.05,
      retries: 1,
      response_schema: ['issues', 'repair_suggestions'] satisfies NovelAgentOutputSchemas['review'],
    },
    {
      agent_id: 'market-review-agent',
      model_tier: 'review',
      temperature: 0.05,
      retries: 1,
      response_schema: ['is_market_ready', 'score', 'strengths', 'risks', 'platform_fit', 'recommendations'] satisfies NovelAgentOutputSchemas['market_review'],
    },
  ]
}

export function buildContinuityFixes() {
  return ['检查时间线与章节编号是否递增', '检查角色目标与行为是否一致', '检查伏笔是否被合理回收', '检查风格标签与实际输出是否一致', '检查正文是否覆盖章纲目标']
}

export function buildRepairPlan() {
  return [
    { target: 'outline', action: '如果总纲/卷纲出现逻辑断层，重写摘要与转折点' },
    { target: 'chapter', action: '如果章节冲突过强，重写章节摘要与结尾钩子' },
    { target: 'prose', action: '如果正文节奏失衡，重写正文与分场结构' },
    { target: 'character', action: '如果角色行为失真，修正动机和目标描述' },
    { target: 'worldbuilding', action: '如果世界规则冲突，修正规则与时间锚点' },
  ]
}
