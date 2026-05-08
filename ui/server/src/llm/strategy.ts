import type { NovelProjectRecord, NovelStrategySpec } from '../novel'
import type { NovelAgentOutputSchemas } from './types'

export function buildNovelStrategy(_project: NovelProjectRecord): NovelStrategySpec[] {
  return [
    // ── 阶段一：设定锚定 ──
    {
      agent_id: 'market-agent',
      model_tier: 'fast',
      temperature: 0.2,
      max_tokens: 2048,
      retries: 2,
      response_schema: ['preferred_hook', 'pace_hint', 'tone_hint', 'market_tags'] satisfies NovelAgentOutputSchemas['market'],
    },
    {
      agent_id: 'world-agent',
      model_tier: 'balanced',
      temperature: 0.35,
      max_tokens: 4096,
      retries: 2,
      response_schema: ['world_summary', 'rules', 'factions', 'locations', 'systems', 'items', 'timeline_anchor', 'known_unknowns'] satisfies NovelAgentOutputSchemas['world'],
      fallback_agent: 'market-agent',
    },
    {
      agent_id: 'character-agent',
      model_tier: 'balanced',
      temperature: 0.45,
      max_tokens: 4096,
      retries: 2,
      response_schema: ['characters'] satisfies NovelAgentOutputSchemas['characters'],
    },

    // ── 阶段二：大纲生成 ──
    {
      agent_id: 'outline-agent',
      model_tier: 'creative',
      temperature: 0.55,
      max_tokens: 6144,
      retries: 3,
      response_schema: ['master_outline', 'volume_outlines', 'chapter_outlines', 'foreshadowing_plan'] satisfies NovelAgentOutputSchemas['outline'],
    },

    // ── 阶段三：细纲分化 + 连续性预检 ──
    {
      agent_id: 'detail-outline-agent',
      model_tier: 'creative',
      temperature: 0.6,
      max_tokens: 8192,
      retries: 3,
      response_schema: ['detail_chapters'] satisfies NovelAgentOutputSchemas['detail_outline'],
      fallback_agent: 'outline-agent',
    },
    {
      agent_id: 'continuity-check-agent',
      model_tier: 'balanced',
      temperature: 0.1,
      max_tokens: 4096,
      retries: 1,
      response_schema: ['continuity_issues', 'continuity_fixes', 'is_ready_for_prose'] satisfies NovelAgentOutputSchemas['continuity_check'],
    },

    // ── 阶段四：正文创作 ──
    {
      agent_id: 'prose-agent',
      model_tier: 'creative',
      temperature: 0.75,
      max_tokens: 8192,
      retries: 3,
      response_schema: ['prose_chapters'] satisfies NovelAgentOutputSchemas['prose'],
    },

    // ── 阶段五：审校修复 ──
    {
      agent_id: 'review-agent',
      model_tier: 'review',
      temperature: 0.05,
      max_tokens: 4096,
      retries: 1,
      response_schema: ['issues', 'repair_suggestions'] satisfies NovelAgentOutputSchemas['review'],
    },
    {
      agent_id: 'market-review-agent',
      model_tier: 'review',
      temperature: 0.05,
      max_tokens: 2048,
      retries: 1,
      response_schema: ['is_market_ready', 'score', 'strengths', 'risks', 'platform_fit', 'recommendations'] satisfies NovelAgentOutputSchemas['market_review'],
    },
    {
      agent_id: 'platform-fit-agent',
      model_tier: 'review',
      temperature: 0.05,
      max_tokens: 2048,
      retries: 1,
      response_schema: ['is_platform_ready', 'score', 'platform_type', 'market_positioning', 'strengths', 'risks', 'blocking_issues', 'recommendations', 'launch_advice', 'chapter_checks'] satisfies NovelAgentOutputSchemas['platform_fit'],
    },
  ]
}

export function buildContinuityFixes() {
  return [
    '检查时间线与章节编号是否递增',
    '检查角色目标与行为是否一致',
    '检查伏笔是否被合理回收',
    '检查风格标签与实际输出是否一致',
    '检查正文是否覆盖章纲目标',
    '检查物品/道具的出入是否有交代',
    '检查每章开头是否自然衔接上一章结尾',
  ]
}

export function buildRepairPlan() {
  return [
    { target: 'worldbuilding', action: '如果世界规则冲突，修正规则与时间锚点' },
    { target: 'outline', action: '如果总纲/卷纲出现逻辑断层，重写摘要与转折点' },
    { target: 'detail_outline', action: '如果细纲衔接断裂，重写场景序列与 continuity_from_prev' },
    { target: 'chapter', action: '如果章节冲突过强或偏弱，重写章节摘要与结尾钩子' },
    { target: 'prose', action: '如果正文节奏失衡或与前章断层，重写正文与分场结构' },
    { target: 'character', action: '如果角色行为失真(OOC)，修正动机和目标描述' },
  ]
}
