import type { Express } from 'express'
import {
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
} from '../novel'
import { asArray, compactText, getStoryState, getVolumePlan, parseJsonLikePayload } from './novel-route-utils'

type TruthRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
}

function stringifyForIndex(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function normalizeTag(value: any) {
  return String(value || '')
    .replace(/^[@#]/, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 48)
}

function extractExplicitTags(value: any) {
  const text = stringifyForIndex(value)
  const tags = new Set<string>()
  for (const match of text.matchAll(/(?:^|[\s，。；;、])[@#]([\p{L}\p{N}_\-\u4e00-\u9fff]{2,48})/gu)) {
    const tag = normalizeTag(match[1])
    if (tag) tags.add(tag)
  }
  return [...tags]
}

function pushTag(index: Map<string, any>, tag: string, source: any) {
  const normalized = normalizeTag(tag)
  if (!normalized) return
  const current = index.get(normalized) || { tag: normalized, count: 0, sources: [] }
  current.count += 1
  if (!current.sources.some((item: any) => item.kind === source.kind && Number(item.id || 0) === Number(source.id || 0))) {
    current.sources.push(source)
  }
  index.set(normalized, current)
}

function buildTagIndex(project: any, worldbuilding: any[], characters: any[], outlines: any[], chapters: any[]) {
  const index = new Map<string, any>()
  const addFromRecord = (kind: string, record: any, title: string, value: any, extra: any = {}) => {
    extractExplicitTags(value).forEach(tag => pushTag(index, tag, {
      kind,
      id: record.id,
      title,
      chapter_no: record.chapter_no || null,
      ...extra,
    }))
  }

  ;(project.style_tags || []).forEach((tag: string) => pushTag(index, tag, { kind: 'project', id: project.id, title: project.title }))
  addFromRecord('project', project, project.title, project)
  worldbuilding.forEach(item => {
    addFromRecord('worldbuilding', item, compactText(item.world_summary, 40) || '世界观', item)
    asArray(item.factions).forEach((tag: string) => pushTag(index, tag, { kind: 'worldbuilding', id: item.id, title: '势力' }))
    asArray(item.locations).forEach((tag: string) => pushTag(index, tag, { kind: 'worldbuilding', id: item.id, title: '地点' }))
    asArray(item.items).forEach((tag: string) => pushTag(index, tag, { kind: 'worldbuilding', id: item.id, title: '道具' }))
  })
  characters.forEach(character => {
    pushTag(index, character.name, { kind: 'character', id: character.id, title: character.name, role: character.role_type || character.role || '' })
    if (character.role_type || character.role) pushTag(index, character.role_type || character.role, { kind: 'character', id: character.id, title: character.name })
    addFromRecord('character', character, character.name, character)
  })
  outlines.forEach(outline => {
    pushTag(index, outline.title, { kind: 'outline', id: outline.id, title: outline.title, outline_type: outline.outline_type })
    if (outline.outline_type) pushTag(index, outline.outline_type, { kind: 'outline', id: outline.id, title: outline.title })
    addFromRecord('outline', outline, outline.title, outline)
  })
  chapters.forEach(chapter => {
    addFromRecord('chapter', chapter, chapter.title, {
      title: chapter.title,
      chapter_summary: chapter.chapter_summary,
      chapter_goal: chapter.chapter_goal,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      continuity_notes: chapter.continuity_notes,
      scene_breakdown: chapter.scene_breakdown,
    }, { chapter_no: chapter.chapter_no })
  })
  return [...index.values()]
    .map(item => ({ ...item, sources: item.sources.slice(0, 20) }))
    .sort((a, b) => b.count - a.count || String(a.tag).localeCompare(String(b.tag)))
}

function buildReferenceLinks(characters: any[], outlines: any[], chapters: any[]) {
  const characterNames = characters.map(item => String(item.name || '').trim()).filter(Boolean)
  const outlineTitles = outlines.map(item => String(item.title || '').trim()).filter(Boolean)
  const chapterLinks: any[] = []
  for (const chapter of chapters) {
    const text = stringifyForIndex({
      title: chapter.title,
      summary: chapter.chapter_summary,
      goal: chapter.chapter_goal,
      conflict: chapter.conflict,
      notes: chapter.continuity_notes,
      scenes: chapter.scene_breakdown,
      body: String(chapter.chapter_text || '').slice(0, 12000),
    })
    const linkedCharacters = characterNames.filter(name => text.includes(name)).slice(0, 12)
    const linkedOutlines = outlineTitles.filter(title => title && text.includes(title)).slice(0, 8)
    if (linkedCharacters.length || linkedOutlines.length) {
      chapterLinks.push({
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        characters: linkedCharacters,
        outlines: linkedOutlines,
      })
    }
  }
  return chapterLinks
}

function buildLedgers(project: any, worldbuilding: any[], characters: any[], outlines: any[], chapters: any[]) {
  const storyState = getStoryState(project)
  const writtenChapters = chapters.filter(chapter => String(chapter.chapter_text || '').trim())
  const latestChapter = writtenChapters.slice().sort((a, b) => Number(b.chapter_no || 0) - Number(a.chapter_no || 0))[0] || null
  return {
    timeline: {
      current_time: storyState.current_time || storyState.timeline || '',
      last_updated_chapter: storyState.last_updated_chapter || null,
      latest_written_chapter: latestChapter ? latestChapter.chapter_no : null,
      timeline_anchor: worldbuilding[0]?.timeline_anchor || '',
    },
    characters: characters.map(character => ({
      id: character.id,
      name: character.name,
      role: character.role_type || character.role || '',
      goal: character.goal || '',
      conflict: character.conflict || '',
      current_state: character.current_state || {},
      position: storyState.character_positions?.[character.name] || character.current_state?.location || '',
      relationships: storyState.character_relationships?.[character.name] || character.relationships || [],
      known_secret: storyState.known_secrets?.[character.name] || character.secret || '',
    })),
    locations: asArray(storyState.active_locations).length ? asArray(storyState.active_locations) : worldbuilding.flatMap(item => asArray(item.locations)),
    resources: {
      item_ownership: storyState.item_ownership || {},
      resource_status: storyState.resource_status || {},
      world_items: worldbuilding.flatMap(item => asArray(item.items)),
    },
    foreshadowing: {
      status: storyState.foreshadowing_status || {},
      payoff_queue: asArray(storyState.payoff_queue),
      outline_foreshadowing: outlines.filter(item => item.outline_type === 'foreshadowing').map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        hook: item.hook,
      })),
    },
    open_threads: {
      unresolved_conflicts: asArray(storyState.unresolved_conflicts),
      open_questions: asArray(storyState.open_questions),
      next_chapter_priorities: asArray(storyState.next_chapter_priorities),
    },
  }
}

function latestReviewForChapter(reviews: any[], chapter: any, reviewType: string) {
  return reviews
    .filter(review => review.review_type === reviewType)
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .filter(item => {
      const payload = item.payload
      return Number(payload.chapter_id || payload.report?.chapter_id || payload.context_package?.chapter_target?.id || 0) === Number(chapter.id)
        || Number(payload.chapter_no || payload.report?.chapter_no || payload.context_package?.chapter_target?.chapter_no || 0) === Number(chapter.chapter_no)
    })
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0] || null
}

function summarizeContextTrace(contextPackage: any, chapter: any, reviews: any[]) {
  const quality = latestReviewForChapter(reviews, chapter, 'prose_quality')?.payload || null
  const similarity = latestReviewForChapter(reviews, chapter, 'similarity_report')?.payload || null
  const migration = latestReviewForChapter(reviews, chapter, 'reference_migration_plan')?.payload || null
  const preflightChecks = asArray(contextPackage?.preflight?.checks)
  return {
    chapter: {
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
    },
    material_sources: {
      writing_bible: Boolean(contextPackage?.writing_bible),
      worldbuilding: Boolean(contextPackage?.story_state?.worldbuilding),
      character_count: asArray(contextPackage?.story_state?.characters).length,
      outline_count: asArray(contextPackage?.story_state?.outlines).length,
      previous_chapter: contextPackage?.continuity?.previous_chapter || null,
      previous_prose_chapters: asArray(contextPackage?.continuity?.previous_prose_chapters).map((item: any) => item.chapter_no),
      reference_entry_count: Number(contextPackage?.reference?.injected_entry_count || 0),
      scene_card_count: asArray(contextPackage?.chapter_target?.scene_cards).length,
    },
    preflight: {
      ready: Boolean(contextPackage?.preflight?.ready),
      strict_ready: Boolean(contextPackage?.preflight?.strict_ready),
      passed: preflightChecks.filter((item: any) => item.ok).map((item: any) => item.label),
      missing: preflightChecks.filter((item: any) => !item.ok).map((item: any) => ({ label: item.label, severity: item.severity, fix: item.fix })),
      warnings: contextPackage?.preflight?.warnings || [],
    },
    generation_constraints: {
      style_lock: contextPackage?.style_lock || {},
      safety_policy: contextPackage?.safety_policy || {},
      chapter_target: contextPackage?.chapter_target || {},
    },
    review_trace: {
      quality_score: Number(quality?.self_check?.review?.score || quality?.review?.score || 0) || null,
      quality_issues: quality?.self_check?.review?.issues || quality?.review?.issues || [],
      similarity_risk: Number(similarity?.report?.overall_risk_score || similarity?.overall_risk_score || 0) || null,
      similarity_decision: similarity?.report?.decision || similarity?.decision || '',
      migration_plan_available: Boolean(migration),
    },
  }
}

function buildTruthFile(project: any, worldbuilding: any[], characters: any[], outlines: any[], chapters: any[], reviews: any[], contextTrace: any = null) {
  const sortedChapters = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const tagIndex = buildTagIndex(project, worldbuilding, characters, outlines, sortedChapters)
  const storyState = getStoryState(project)
  const staleState = sortedChapters.some(chapter => String(chapter.chapter_text || '').trim())
    && Number(storyState.last_updated_chapter || 0) < Math.max(0, ...sortedChapters.filter(chapter => String(chapter.chapter_text || '').trim()).map(chapter => Number(chapter.chapter_no || 0)))
  return {
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre || '',
      synopsis: project.synopsis || '',
      updated_at: project.updated_at || '',
    },
    scorecard: {
      worldbuilding_count: worldbuilding.length,
      character_count: characters.length,
      outline_count: outlines.length,
      chapter_count: sortedChapters.length,
      written_chapter_count: sortedChapters.filter(chapter => String(chapter.chapter_text || '').trim()).length,
      tag_count: tagIndex.length,
      state_last_updated_chapter: storyState.last_updated_chapter || null,
      state_stale: staleState,
    },
    truth_files: {
      writing_bible: project.reference_config?.writing_bible || null,
      story_state: storyState,
      volume_plan: getVolumePlan(outlines),
      ledgers: buildLedgers(project, worldbuilding, characters, outlines, sortedChapters),
    },
    index: {
      tags: tagIndex,
      chapter_references: buildReferenceLinks(characters, outlines, sortedChapters),
    },
    context_trace: contextTrace,
    recommendations: [
      staleState ? '故事状态机落后于已写章节，建议先运行状态更新或人工校正。' : '',
      tagIndex.length < 8 ? '标签/引用索引偏少，建议给关键角色、地点、伏笔、道具补充 @标签。' : '',
      characters.some(character => !character.current_state || Object.keys(character.current_state || {}).length === 0) ? '部分角色缺少当前状态，长篇生成时容易漂移。' : '',
      outlines.filter(item => item.outline_type === 'volume').length === 0 ? '缺少分卷/阶段目标，建议补充分卷计划。' : '',
    ].filter(Boolean),
    generated_at: new Date().toISOString(),
  }
}

export function registerNovelTruthRoutes(app: Express, ctx: TruthRoutesContext) {
  app.get('/api/novel/projects/:id/truth-file', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sortedChapters = chapters.slice().sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
      const chapterId = Number(req.query.chapter_id || 0)
      const chapter = chapterId
        ? sortedChapters.find(item => Number(item.id) === chapterId)
        : sortedChapters.find(item => String(item.chapter_text || '').trim()) || sortedChapters[0]
      let contextTrace: any = null
      if (chapter) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        contextTrace = summarizeContextTrace(contextPackage, chapter, reviews)
      }
      res.json({ ok: true, truth_file: buildTruthFile(project, worldbuilding, characters, outlines, chapters, reviews, contextTrace) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
