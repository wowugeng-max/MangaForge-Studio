import { batchStoreKnowledge, storeKnowledge } from '../knowledge-base'
import { createOhStoryCapabilityService } from '../routes/novel-oh-story-capability-service'
import { buildGenreProseCardContract } from './genre-prose-cards'
import { extractEndingReserveLedgerFromProject } from './ending-reserve-ledger'

/**
 * Integrate oh-story P2 plans with the existing knowledge-base product.
 * Knowledge base already owns: ingest jobs, source cache, semantic query, project-scoped entries.
 * This bridge standardizes categories/tags so analyze/scan/import/cover land in the same store.
 */
export const OH_STORY_KNOWLEDGE_CATEGORIES = {
  benchmark_analyze: 'benchmark_analyze',
  market_scan: 'market_scan',
  reverse_import: 'reverse_import',
  cover_brief: 'cover_brief',
  short_suite: 'short_suite',
  genre_prose_card: 'genre_prose_card',
  ending_reserve: 'ending_reserve',
} as const

function nowSource(kind: string) {
  return `oh-story/${kind}`
}

export function buildKnowledgeEntriesFromAnalyzePlan(plan: any, meta: {
  project_id?: number
  project_title?: string
  book_title?: string
} = {}) {
  const title = meta.book_title || plan?.title || '对标书'
  return (plan?.stages || []).map((stage: any, index: number) => ({
    category: OH_STORY_KNOWLEDGE_CATEGORIES.benchmark_analyze,
    title: `${title} · Stage ${stage.stage || index + 1} ${stage.name || ''}`.trim(),
    content: [
      `阶段: ${stage.name || ''}`,
      `产物: ${stage.output || ''}`,
      `是否必需: ${stage.required ? '是' : '否'}`,
      plan?.next_action ? `下一步: ${plan.next_action}` : '',
    ].filter(Boolean).join('\n'),
    source: nowSource('long-analyze'),
    source_title: title,
    tags: ['oh-story', 'long-analyze', `stage-${stage.stage || index + 1}`],
    genre_tags: [],
    trope_tags: ['拆文', '对标'],
    use_case: 'benchmark_recall',
    confidence: 0.7,
    weight: stage.required ? 1.2 : 1,
    project_id: meta.project_id,
    project_title: meta.project_title || title,
  }))
}

export function buildKnowledgeEntriesFromScanPlan(plan: any, meta: {
  project_id?: number
  project_title?: string
} = {}) {
  return [{
    category: OH_STORY_KNOWLEDGE_CATEGORIES.market_scan,
    title: `扫榜计划 · ${plan?.platform || '多平台'}`,
    content: [
      `平台: ${plan?.platform || ''}`,
      `数据源: ${(plan?.data_sources || []).join(' / ')}`,
      `字段: ${(plan?.fields || []).join('、')}`,
      plan?.next_action ? `下一步: ${plan.next_action}` : '',
    ].filter(Boolean).join('\n'),
    source: nowSource('long-scan'),
    source_title: plan?.platform || 'rank-scan',
    tags: ['oh-story', 'long-scan', 'market'],
    use_case: 'genre_positioning',
    confidence: 0.65,
    weight: 1,
    project_id: meta.project_id,
    project_title: meta.project_title,
  }]
}

export function buildKnowledgeEntriesFromImportPlan(plan: any, meta: {
  project_id?: number
  project_title?: string
} = {}) {
  return [{
    category: OH_STORY_KNOWLEDGE_CATEGORIES.reverse_import,
    title: `逆向导入计划 · ${plan?.mode || 'longform'}`,
    content: [
      `模式: ${plan?.mode || 'longform'}`,
      `步骤: ${(plan?.steps || []).join(' → ')}`,
      '说明: 实际导入优先复用知识库投喂/正文缓存/ingest job，而不是另起一套存储。',
      plan?.next_action ? `下一步: ${plan.next_action}` : '',
    ].filter(Boolean).join('\n'),
    source: nowSource('import'),
    tags: ['oh-story', 'import', 'knowledge-bridge'],
    use_case: 'project_bootstrap',
    confidence: 0.8,
    weight: 1.1,
    project_id: meta.project_id,
    project_title: meta.project_title,
  }]
}

export function buildKnowledgeEntriesFromGenreCard(contract: any, meta: {
  project_id?: number
  project_title?: string
} = {}) {
  const card = contract?.card
  if (!card) return []
  return [{
    category: OH_STORY_KNOWLEDGE_CATEGORIES.genre_prose_card,
    title: `题材散文卡 · ${card.title}`,
    content: [
      `置信度: ${card.confidence}`,
      `核心: ${card.core}`,
      `冲突: ${card.conflict_engine}`,
      `落点: ${card.prose_landing}`,
      `禁止: ${card.forbidden_drift}`,
    ].join('\n'),
    source: nowSource('genre-prose-card'),
    source_title: card.source_file || card.title,
    tags: ['oh-story', 'genre-prose-card', card.title],
    genre_tags: [card.title, ...(card.aliases || []).slice(0, 4)],
    use_case: 'prose_generation',
    confidence: card.confidence === '高' ? 0.9 : card.confidence === '中' ? 0.75 : 0.55,
    weight: 1.2,
    project_id: meta.project_id,
    project_title: meta.project_title,
  }]
}

export function buildKnowledgeEntriesFromEndingReserve(ledger: any, meta: {
  project_id?: number
  project_title?: string
} = {}) {
  return [{
    category: OH_STORY_KNOWLEDGE_CATEGORIES.ending_reserve,
    title: '终局储备账本',
    content: [
      `底牌 reserved/unlocked/spent: ${ledger?.summary?.trump_reserved || 0}/${ledger?.summary?.trump_unlocked || 0}/${ledger?.summary?.trump_spent || 0}`,
      `台阶 open/spent: ${ledger?.summary?.steps_open || 0}/${ledger?.summary?.steps_spent || 0}`,
      `容量: ${ledger?.capacity_check?.note || ''}`,
      `解锁日志: ${(ledger?.unlock_log || []).slice(-5).map((row: any) => `${row.item_id}@v${row.volume}`).join('；') || '无'}`,
    ].join('\n'),
    source: nowSource('ending-reserve'),
    tags: ['oh-story', 'ending-reserve', 'reader-contract'],
    use_case: 'longform_progression',
    confidence: 0.85,
    weight: 1.1,
    project_id: meta.project_id,
    project_title: meta.project_title,
  }]
}

export async function publishOhStoryPlanToKnowledge(args: {
  kind: 'long_analyze' | 'long_scan' | 'import' | 'cover' | 'short_suite' | 'genre_card' | 'ending_reserve'
  project?: any
  project_id?: number
  project_title?: string
  input?: any
  auto_store?: boolean
}) {
  const service = createOhStoryCapabilityService()
  const projectId = Number(args.project_id || args.project?.id || 0) || undefined
  const projectTitle = String(args.project_title || args.project?.title || '').trim() || undefined
  const meta = { project_id: projectId, project_title: projectTitle }
  let entries: any[] = []
  let plan: any = null

  if (args.kind === 'long_analyze') {
    plan = service.buildLongAnalyzePlan(args.input || {})
    entries = buildKnowledgeEntriesFromAnalyzePlan(plan, { ...meta, book_title: args.input?.title || args.input?.book_title })
  } else if (args.kind === 'long_scan') {
    plan = service.buildLongScanPlan(args.input || {})
    entries = buildKnowledgeEntriesFromScanPlan(plan, meta)
  } else if (args.kind === 'import') {
    plan = service.buildImportPlan(args.input || {})
    entries = buildKnowledgeEntriesFromImportPlan(plan, meta)
  } else if (args.kind === 'cover') {
    plan = service.buildCoverPlan(args.input || {})
    entries = [{
      category: OH_STORY_KNOWLEDGE_CATEGORIES.cover_brief,
      title: `封面简报 · ${plan.title || ''}`,
      content: `风格提示: ${(plan.style_hints || []).join('、')}\n下一步: ${plan.next_action || ''}`,
      source: nowSource('cover'),
      tags: ['oh-story', 'cover'],
      use_case: 'cover_generation',
      confidence: 0.6,
      weight: 1,
      project_id: projectId,
      project_title: projectTitle,
    }]
  } else if (args.kind === 'short_suite') {
    plan = service.buildShortSuitePlan(args.input || {})
    entries = [{
      category: OH_STORY_KNOWLEDGE_CATEGORIES.short_suite,
      title: '短篇三件套计划',
      content: (plan.modules || []).map((item: any) => `${item.label}: ${(item.platforms || item.focus || []).join('/')}`).join('\n'),
      source: nowSource('short-suite'),
      tags: ['oh-story', 'short'],
      use_case: 'short_form',
      confidence: 0.6,
      weight: 1,
      project_id: projectId,
      project_title: projectTitle,
    }]
  } else if (args.kind === 'genre_card') {
    plan = buildGenreProseCardContract(args.input || args.project || {})
    entries = buildKnowledgeEntriesFromGenreCard(plan, meta)
  } else if (args.kind === 'ending_reserve') {
    plan = extractEndingReserveLedgerFromProject(args.project || args.input || {})
    entries = buildKnowledgeEntriesFromEndingReserve(plan, meta)
  }

  let stored: any = null
  if (args.auto_store && entries.length) {
    if (entries.length === 1) {
      stored = await storeKnowledge(entries[0])
    } else {
      stored = await batchStoreKnowledge(entries as any, { project_id: projectId, project_title: projectTitle })
    }
  }

  return {
    version: 'oh_story_knowledge_bridge_v1',
    kind: args.kind,
    plan,
    entries,
    stored,
    integration: {
      knowledge_base: true,
      note: 'P2 产物写入既有知识库；正文投喂/章节缓存继续走 /api/knowledge ingest 与 source cache。',
      suggested_ui: 'NovelStudio 知识库面板 + 工作台参考工程',
    },
  }
}

export function describeKnowledgeIntegration() {
  return {
    version: 'oh_story_knowledge_integration_v1',
    can_integrate: true,
    existing_assets: [
      '知识库条目 store/query/list',
      '投喂弹窗与 ingest job',
      '正文 source cache',
      '参考工程 ReferenceEngineeringModal',
      '记忆宫殿同步',
    ],
    mapping: [
      { p2: 'long-analyze', knowledge: 'benchmark_analyze 条目 + 可挂 source cache 章节' },
      { p2: 'long-scan', knowledge: 'market_scan 条目' },
      { p2: 'import', knowledge: 'reverse_import 计划 + 复用 ingest/投喂落地正文' },
      { p2: 'cover', knowledge: 'cover_brief 条目（图资产仍走素材库）' },
      { p2: 'short-suite', knowledge: 'short_suite 条目' },
      { p2: 'genre cards / ending reserve', knowledge: 'genre_prose_card / ending_reserve 条目，服务创作召回' },
    ],
    principle: '不另起知识中台；oh-story P2 作为知识库的生产管道与分类约定。',
  }
}
