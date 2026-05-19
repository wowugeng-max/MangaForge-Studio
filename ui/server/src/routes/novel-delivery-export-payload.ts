import { exportWordCount } from './novel-delivery-export-renderer'
import { getVolumePlan } from './novel-route-utils'

export function getExportRange(query: any) {
  const start = Number(query.start_chapter || query.start || 0)
  const end = Number(query.end_chapter || query.end || 0)
  return {
    start_chapter: Number.isFinite(start) && start > 0 ? start : 0,
    end_chapter: Number.isFinite(end) && end > 0 ? end : 0,
    include_unwritten: String(query.include_unwritten ?? '1') !== '0',
  }
}

function buildOutlineAncestorVolume(outlines: any[]) {
  const byId = new Map<number, any>()
  outlines.forEach(outline => byId.set(Number(outline.id), outline))
  const resolve = (outlineId: any) => {
    let current = byId.get(Number(outlineId))
    const seen = new Set<number>()
    while (current && !seen.has(Number(current.id))) {
      seen.add(Number(current.id))
      if (current.outline_type === 'volume') return current
      current = byId.get(Number(current.parent_id || 0))
    }
    return null
  }
  return resolve
}

export function buildNovelExportPayload(project: any, chapters: any[], outlines: any[], options: any = {}) {
  const range = {
    start_chapter: Number(options.start_chapter || 0),
    end_chapter: Number(options.end_chapter || 0),
    include_unwritten: options.include_unwritten !== false,
  }
  const allSortedChapters = chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const sortedChapters = allSortedChapters
    .filter(chapter => !range.start_chapter || Number(chapter.chapter_no || 0) >= range.start_chapter)
    .filter(chapter => !range.end_chapter || Number(chapter.chapter_no || 0) <= range.end_chapter)
    .filter(chapter => range.include_unwritten || String(chapter.chapter_text || '').trim())
  const volumes = getVolumePlan(outlines)
  const resolveVolume = buildOutlineAncestorVolume(outlines)
  const volumeRows = volumes.map((volume, index) => ({
    ...volume,
    order: index + 1,
    chapters: [] as any[],
  }))
  const volumeById = new Map(volumeRows.map(volume => [Number(volume.id), volume]))
  const ungrouped = { id: 0, title: '未分卷章节', summary: '', order: volumeRows.length + 1, chapters: [] as any[] }

  for (const chapter of sortedChapters) {
    const volume = resolveVolume(chapter.outline_id)
    const target = volume ? volumeById.get(Number(volume.id)) : null
    ;(target || ungrouped).chapters.push(chapter)
  }
  const groups = [...volumeRows.filter(volume => volume.chapters.length > 0), ...(ungrouped.chapters.length ? [ungrouped] : [])]
  const written = sortedChapters.filter(chapter => String(chapter.chapter_text || '').trim())
  const placeholders = sortedChapters.filter(chapter => String(chapter.chapter_text || '').includes('【占位正文】'))
  const missing = sortedChapters.filter(chapter => !String(chapter.chapter_text || '').trim())
  const wordCount = sortedChapters.reduce((sum, chapter) => sum + exportWordCount(chapter.chapter_text), 0)
  const warnings = [
    missing.length ? `有 ${missing.length} 章缺少正文：${missing.slice(0, 12).map(chapter => `第${chapter.chapter_no}章`).join('、')}${missing.length > 12 ? '……' : ''}` : '',
    placeholders.length ? `有 ${placeholders.length} 章仍包含占位正文标记。` : '',
    sortedChapters.length === 0 ? '项目还没有章节，导出内容只包含项目信息。' : '',
    range.start_chapter || range.end_chapter ? `当前为范围导出：${range.start_chapter || '开头'}-${range.end_chapter || '末尾'}。` : '',
  ].filter(Boolean)
  const gateBlockers = [
    sortedChapters.length === 0 ? '没有可交付章节。' : '',
    missing.length ? '存在缺正文章节。' : '',
    placeholders.length ? '存在占位正文。' : '',
  ].filter(Boolean)
  return {
    project: {
      id: project.id,
      title: project.title || '未命名项目',
      genre: project.genre || '',
      target_audience: project.target_audience || '',
      length_target: project.length_target || '',
      synopsis: project.synopsis || '',
      style_tags: Array.isArray(project.style_tags) ? project.style_tags : [],
      commercial_tags: Array.isArray(project.commercial_tags) ? project.commercial_tags : [],
      status: project.status || '',
      updated_at: project.updated_at || '',
    },
    stats: {
      total_project_chapter_count: allSortedChapters.length,
      chapter_count: sortedChapters.length,
      written_count: written.length,
      missing_count: missing.length,
      placeholder_count: placeholders.length,
      word_count: wordCount,
      volume_count: groups.filter(group => group.id).length,
      completion_rate: sortedChapters.length ? Math.round((written.length / sortedChapters.length) * 100) : 0,
    },
    gate: {
      status: gateBlockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
      blockers: gateBlockers,
      warnings,
      can_export: sortedChapters.length > 0,
    },
    range,
    groups,
    warnings,
    generated_at: new Date().toISOString(),
  }
}
