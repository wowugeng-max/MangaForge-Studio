import type React from 'react'

export const knowledgeCategoryPresets = [
  { value: 'character_design', label: '人物设计' },
  { value: 'story_design', label: '故事设计' },
  { value: 'story_pacing', label: '节奏设计' },
  { value: 'foreshadowing', label: '伏笔设计' },
  { value: 'ability_design', label: '能力体系' },
  { value: 'realm_design', label: '境界设计' },
  { value: 'worldbuilding', label: '世界观' },
  { value: 'writing_style', label: '写作风格' },
  { value: 'technique', label: '写作技巧' },
  { value: 'volume_design', label: '分卷设计' },
  { value: 'genre_positioning', label: '题材定位' },
  { value: 'trope_design', label: '套路设计' },
  { value: 'selling_point', label: '卖点设计' },
  { value: 'reader_hook', label: '读者钩子' },
  { value: 'emotion_design', label: '情绪设计' },
  { value: 'scene_design', label: '场景设计' },
  { value: 'conflict_design', label: '冲突设计' },
  { value: 'resource_economy', label: '资源经济' },
  { value: 'reference_profile', label: '参考作品画像' },
  { value: 'volume_architecture', label: '分卷结构' },
  { value: 'chapter_beat_template', label: '章节节拍模板' },
  { value: 'character_function_matrix', label: '角色功能矩阵' },
  { value: 'resource_economy_model', label: '资源经济模型' },
  { value: 'style_profile', label: '文风画像' },
  { value: 'benchmark_analyze', label: '对标拆文' },
  { value: 'market_scan', label: '市场扫榜' },
  { value: 'reverse_import', label: '逆向导入' },
  { value: 'cover_brief', label: '封面简报' },
  { value: 'short_suite', label: '短篇三件套' },
  { value: 'genre_prose_card', label: '题材散文卡' },
  { value: 'ending_reserve', label: '终局储备' },
]

export const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--novel-color-text-secondary)',
}

export const panelStyle: React.CSSProperties = {
  border: '1px solid var(--novel-color-border)',
  borderRadius: 'var(--novel-radius-lg)',
  padding: 14,
  background: 'var(--novel-color-bg)',
}

export const softPanelStyle: React.CSSProperties = {
  border: '1px solid var(--novel-color-border-strong)',
  borderRadius: 'var(--novel-radius-lg)',
  padding: 14,
  background: 'var(--novel-color-primary-soft)',
}

export const inputStyle: React.CSSProperties = { borderRadius: 'var(--novel-radius-md)' }
export const knowledgeExtractModelStorageKey = 'knowledge.extract.model_id'
export const knowledgeIngestJobStorageKey = 'knowledge.ingest.last_job_id'

export function truncateText(value: string, max = 160) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export function formatSource(entry: any) {
  return entry.source_title || entry.source || '未命名来源'
}

export function formatProjectScope(entry: any) {
  return String(entry?.project_title || '').trim()
}

export function formatKnowledgeCategory(
  entry: any,
  knowledgeSummary: Record<string, { label: string; count: number }>,
) {
  const category = String(entry?.category || '').trim()
  if (!category) return '未分类'
  const preset = knowledgeCategoryPresets.find(item => item.value === category)?.label
  return knowledgeSummary[category]?.label || preset || category
}

export function getBatchStatusColor(status?: string) {
  if (status === 'completed') return 'green'
  if (status === 'failed') return 'red'
  if (status === 'analyzing') return 'blue'
  if (status === 'pending') return 'default'
  return 'default'
}

export function getIngestStatusColor(status?: string) {
  if (status === 'completed') return 'green'
  if (status === 'failed') return 'red'
  if (status === 'paused') return 'gold'
  if (status === 'canceled') return 'default'
  return 'blue'
}

export function getSourceCacheLabel(cache?: any) {
  if (!cache) return ''
  const cached = Number(cache.cached_chapters || 0)
  const fetched = Number(cache.fetched_chapters || 0)
  if (cache.status === 'hit') return `命中正文缓存 ${cached} 章`
  if (cache.status === 'partial') return `已有缓存 ${cached} 章，新抓并缓存 ${fetched} 章`
  if (cache.status === 'miss') return fetched > 0 ? `新抓并缓存 ${fetched} 章` : '未命中缓存'
  return ''
}

export function getSourceCacheColor(status?: string) {
  if (status === 'hit') return 'green'
  if (status === 'partial') return 'gold'
  if (status === 'miss') return 'default'
  return 'default'
}
