import {
  createNovelCharacter,
  createNovelOutline,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelChapters,
  listNovelOutlines,
  syncNovelChapterPlanByNumber,
  updateNovelChapter,
  updateNovelProject,
} from '../novel'
import { buildNovelSeed } from '../llm'

export function summarizeAgentChainStatus(results: Array<any> = []) {
  const failed = results.filter(item => item?.success === false || item?.outputSource === 'error' || item?.error)
  const successCount = results.length - failed.length
  const status = failed.length === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'
  const error = failed
    .map(item => `${item.step || 'agent'}：${String(item.error || '执行失败').slice(0, 160)}`)
    .join('；')
  return {
    status,
    success_count: successCount,
    failed_count: failed.length,
    error,
  }
}

export function getAgentStepOutput(execution: any, stepName: string) {
  return (execution?.results || []).find((item: any) => item.step === stepName && item.outputSource === 'llm')?.output || {}
}

export function normalizeAgentPlanningChapter(item: any) {
  const chapterNo = Number(item?.chapter_no || item?.chapterNo || 0)
  const summary = String(item?.chapter_summary || item?.summary || item?.chapterGoal || item?.chapter_goal || '')
  const sceneBreakdown = Array.isArray(item?.scene_breakdown)
    ? item.scene_breakdown
    : Array.isArray(item?.scenes)
      ? item.scenes
      : []
  const continuityNotes = Array.isArray(item?.continuity_notes)
    ? item.continuity_notes
    : item?.continuity_from_prev
      ? [String(item.continuity_from_prev)]
      : []
  return {
    chapter_no: chapterNo,
    title: String(item?.title || `第${chapterNo}章`),
    chapter_goal: String(item?.chapter_goal || item?.goal || summary),
    chapter_summary: summary,
    conflict: String(item?.conflict || item?.core_conflict || ''),
    ending_hook: String(item?.ending_hook || item?.hook || ''),
    scene_breakdown: sceneBreakdown,
    scene_list: sceneBreakdown,
    continuity_notes: continuityNotes,
  }
}

export function extractAgentPlanningChapters(execution: any, seed: any = {}) {
  const detailResult = getAgentStepOutput(execution, 'detail-outline-agent')
  if (Array.isArray(detailResult.detail_chapters) && detailResult.detail_chapters.length > 0) {
    return detailResult.detail_chapters.map(normalizeAgentPlanningChapter).filter((item: any) => item.chapter_no > 0)
  }
  const outlineResult = getAgentStepOutput(execution, 'outline-agent')
  if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
    return outlineResult.chapter_outlines.map(normalizeAgentPlanningChapter).filter((item: any) => item.chapter_no > 0)
  }
  if (Array.isArray(seed.chapters) && seed.chapters.length > 0) {
    return seed.chapters.map(normalizeAgentPlanningChapter).filter((item: any) => item.chapter_no > 0)
  }
  return []
}

export async function syncProseChaptersToStore(activeWorkspace: string, projectId: number, proseChapters: any[], source: 'agent_execute' | 'repair' = 'agent_execute', chapterFilter?: (chapter: any) => boolean) {
  for (const proseChapter of proseChapters || []) {
    if (chapterFilter && !chapterFilter(proseChapter)) continue
    const chapterList = await listNovelChapters(activeWorkspace, projectId)
    const matched = chapterList.find(item => item.chapter_no === Number(proseChapter.chapter_no))
    if (matched) {
      await updateNovelChapter(activeWorkspace, matched.id, {
        chapter_text: String(proseChapter.chapter_text || ''),
        scene_breakdown: proseChapter.scene_breakdown || [],
        continuity_notes: proseChapter.continuity_notes || [],
      }, { versionSource: source })
    }
  }
}

type SyncAgentExecutionOptions = {
  chapterFilter?: (chapter: any) => boolean
  createReview?: boolean
  runSource?: string
}

export async function syncAgentExecutionToNovelStore(
  activeWorkspace: string,
  project: any,
  prompt: string,
  execution: any,
  options: SyncAgentExecutionOptions = {},
) {
  const projectId = Number(project.id)
  const seed = buildNovelSeed(project, String(prompt || ''))
  const worldResult = getAgentStepOutput(execution, 'world-agent')
  const charResult = getAgentStepOutput(execution, 'character-agent')
  const outlineResult = getAgentStepOutput(execution, 'outline-agent')
  const detailResult = getAgentStepOutput(execution, 'detail-outline-agent')
  const continuityResult = getAgentStepOutput(execution, 'continuity-check-agent')
  const proseResult = getAgentStepOutput(execution, 'prose-agent')
  const marketResult = getAgentStepOutput(execution, 'market-agent')
  const synced: any = {
    worldbuilding: [],
    characters: [],
    outlines: [],
    chapters: [],
    reviews: [],
    project: null,
  }

  if (worldResult.world_summary) {
    synced.worldbuilding.push(await createNovelWorldbuilding(activeWorkspace, {
      project_id: projectId,
      world_summary: worldResult.world_summary || seed.world_summary,
      rules: Array.isArray(worldResult.rules) ? worldResult.rules : seed.rules,
      factions: Array.isArray(worldResult.factions) ? worldResult.factions : [],
      locations: Array.isArray(worldResult.locations) ? worldResult.locations : [],
      systems: Array.isArray(worldResult.systems) ? worldResult.systems : [],
      items: Array.isArray(worldResult.items) ? worldResult.items : [],
      timeline_anchor: worldResult.timeline_anchor || '故事起点',
      known_unknowns: Array.isArray(worldResult.known_unknowns) ? worldResult.known_unknowns : [],
      version: 1,
    }))
  }

  const characterItems = Array.isArray(charResult.characters) && charResult.characters.length > 0
    ? charResult.characters
    : (Array.isArray(seed.characters) ? seed.characters : [])
  for (const character of characterItems) {
    synced.characters.push(await createNovelCharacter(activeWorkspace, { project_id: projectId, ...character }))
  }

  const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
    ? outlineResult.volume_outlines
    : []
  for (const volume of volumeItems) {
    synced.outlines.push(await createNovelOutline(activeWorkspace, { project_id: projectId, outline_type: 'volume', ...volume }))
  }

  let masterOutlineData: any = {}
  if (typeof outlineResult.master_outline === 'object' && outlineResult.master_outline) {
    masterOutlineData = outlineResult.master_outline
  } else if (typeof outlineResult.master_outline === 'string') {
    masterOutlineData = { title: seed.outline?.title || '总纲', summary: outlineResult.master_outline }
  }
  if (masterOutlineData.summary || masterOutlineData.title) {
    synced.outlines.push(await createNovelOutline(activeWorkspace, {
      project_id: projectId,
      outline_type: 'master',
      title: masterOutlineData.title || seed.outline?.title || '总纲',
      summary: masterOutlineData.summary || seed.outline?.summary || '',
      hook: masterOutlineData.hook || '',
    }))
  }

  const chapterItems = extractAgentPlanningChapters(execution, seed)
    .filter(chapter => !options.chapterFilter || options.chapterFilter(chapter))
  for (const chapter of chapterItems) {
    const stored = await syncNovelChapterPlanByNumber(activeWorkspace, {
      project_id: projectId,
      chapter_no: chapter.chapter_no,
      title: chapter.title || '',
      chapter_goal: chapter.chapter_goal || chapter.chapter_summary || '',
      chapter_summary: chapter.chapter_summary || '',
      conflict: chapter.conflict || '',
      ending_hook: chapter.ending_hook || '',
      scene_breakdown: chapter.scene_breakdown || [],
      scene_list: chapter.scene_list || chapter.scene_breakdown || [],
      continuity_notes: chapter.continuity_notes || [],
      raw_payload: {
        agent_sync: {
          source: options.runSource || 'agent_execute',
          synced_at: new Date().toISOString(),
        },
      },
    } as any, { source: options.runSource || 'agent_execute' })
    if (stored?.outline) synced.outlines.push(stored.outline)
    if (stored?.chapter) synced.chapters.push(stored.chapter)
  }

  if (Array.isArray(outlineResult.foreshadowing_plan) && outlineResult.foreshadowing_plan.length > 0) {
    const masterOutlineList = await listNovelOutlines(activeWorkspace, projectId)
    const masterOl = masterOutlineList.find((outline: any) => outline.outline_type === 'master')
    for (const foreshadowing of outlineResult.foreshadowing_plan) {
      synced.outlines.push(await createNovelOutline(activeWorkspace, {
        project_id: projectId,
        outline_type: 'foreshadowing',
        title: foreshadowing.description || '',
        summary: `第${foreshadowing.plant_at}章埋 → 第${foreshadowing.payoff_at}章收`,
        parent_id: masterOl?.id || null,
      }))
    }
  }

  await syncProseChaptersToStore(activeWorkspace, projectId, proseResult?.prose_chapters || [], 'agent_execute', options.chapterFilter)

  synced.project = await updateNovelProject(activeWorkspace, projectId, {
    genre: String(worldResult.genre || marketResult.genre || project.genre || ''),
    synopsis: String(masterOutlineData.summary || outlineResult.synopsis || seed.outline?.summary || project.synopsis || ''),
    target_audience: String(marketResult.target_audience || marketResult.targetReader || project.target_audience || ''),
    sub_genres: Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : undefined,
    style_tags: Array.isArray(marketResult.style_tags) ? marketResult.style_tags : undefined,
    commercial_tags: Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : undefined,
    status: 'draft',
  })

  if (options.createReview !== false) {
    const review = await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'continuity',
      status: 'ok',
      summary: continuityResult.is_ready_for_prose !== false ? '当前生成结构一致，尚未发现明显冲突。' : String(execution?.review?.summary || '连续性预检发现风险。'),
      issues: execution?.review?.issues || continuityResult.issues || [],
      payload: JSON.stringify(continuityResult || {}),
    })
    synced.reviews.push(review)
  }

  return {
    synced,
    seed,
    marketResult,
    worldResult,
    charResult,
    outlineResult,
    detailResult,
    continuityResult,
    proseResult,
  }
}
