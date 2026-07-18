import { buildNovelLobbyModel } from '../novel-lobby/novelLobbyModel'

export function filterKnowledgeEntries(entries: any[], knowledgeSearch: string) {
  const q = knowledgeSearch.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(entry => {
    return [
      entry.title,
      entry.content,
      entry.source,
      entry.project_title,
      entry.use_case,
      entry.evidence,
      entry.chapter_range,
      ...(Array.isArray(entry.tags) ? entry.tags : []),
      ...(Array.isArray(entry.genre_tags) ? entry.genre_tags : []),
      ...(Array.isArray(entry.trope_tags) ? entry.trope_tags : []),
      ...(Array.isArray(entry.entities) ? entry.entities : []),
    ]
      .filter(Boolean)
      .some((v: any) => String(v).toLowerCase().includes(q))
  })
}

export function buildKnowledgeCategoryOptions(knowledgeSummary: Record<string, { label: string; count: number }>) {
  return Object.entries(knowledgeSummary)
    .map(([key, value]) => ({ key, label: value?.label || key, count: Number(value?.count || 0) }))
    .sort((a, b) => b.count - a.count)
}

export function filterSourceCaches(sourceCaches: any[], sourceCacheSearch: string) {
  const q = sourceCacheSearch.trim().toLowerCase()
  if (!q) return sourceCaches
  return sourceCaches.filter(cache => [
    cache.project_title,
    cache.source_url,
    cache.canonical_source_url,
    cache.cache_key,
  ].filter(Boolean).some(value => String(value).toLowerCase().includes(q)))
}

export function buildExtractionModelOptions(availableModels: any[]) {
  return availableModels
    .filter(model => {
      const caps = model?.capabilities && typeof model.capabilities === 'object' ? model.capabilities : {}
      const isMediaOnly = caps.text_to_image || caps.image_to_image || caps.text_to_video || caps.image_to_video
      return !isMediaOnly || caps.chat || caps.reasoning || caps.vision
    })
    .sort((a, b) => Number(Boolean(b?.is_favorite)) - Number(Boolean(a?.is_favorite)))
    .map(model => ({
      value: Number(model.id),
      label: `${model.display_name || model.model_name || `模型 #${model.id}`}${model.provider ? ` · ${model.provider}` : ''}`,
    }))
    .filter(option => option.value)
}

export function filterProjectsBySearch(projects: any[], searchText: string) {
  const q = searchText.trim().toLowerCase()
  if (!q) return projects
  return projects.filter(project => {
    return [project.title, project.genre, project.status, project.target_audience]
      .filter(Boolean)
      .some((v: any) => String(v).toLowerCase().includes(q))
  })
}

export function buildProjectStats(projects: any[]) {
  return {
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    active: projects.filter(p => p.status && p.status !== 'draft').length,
  }
}

export function buildProjectLobbyDerived(projects: any[]) {
  const lobbyModel = buildNovelLobbyModel(projects)
  const projectCardById = new Map(lobbyModel.projectCards.map(card => [card.project.id, card]))
  return { lobbyModel, projectCardById }
}

export function getReferenceProjects(project: any) {
  return Array.isArray(project?.reference_config?.references)
    ? project.reference_config.references
        .map((item: any) => String(item?.project_title || '').trim())
        .filter(Boolean)
    : []
}
