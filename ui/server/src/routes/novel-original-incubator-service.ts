import {
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelWorldbuilding,
  listNovelChapters,
  updateNovelProject,
} from '../novel'

export function createNovelOriginalIncubatorService() {
  const buildOriginalIncubatorPrompt = (project: any, body: any) => [
    '任务：进行原创小说项目孵化，不依赖任何指定参考作品。请产出可直接落库的商业网文创作蓝图。',
    `项目标题：${project.title}`,
    `题材：${body.genre || project.genre || '未指定'}`,
    `目标平台/读者：${body.target_audience || project.target_audience || '通用网文读者'}`,
    `创意/要求：${body.idea || project.synopsis || ''}`,
    `候选方案数：${Math.max(1, Math.min(5, Number(body.variant_count || 1)))}`,
    '',
    '请输出 JSON，字段：',
    'directions: array，当候选方案数大于 1 时输出多个方向，每项包含 direction_id,title,commercial_positioning,core_hook,differentiators,risks,first_10_chapters,score,selection_reason',
    'worldbuilding: {world_summary,rules,known_unknowns}',
    'characters: array，每项 name, role_type, archetype, motivation, goal, conflict, growth_arc, current_state',
    'outlines: array，至少包含 master 和 1-3 个 volume，每项 outline_type,title,summary,conflict_points,turning_points,hook,target_length',
    'chapters: array，生成前 30 章或指定 chapter_count 的章纲，每项 chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,must_advance,forbidden_repeats',
    'writing_bible: {promise,world_rules,mainline,volume_plan,style_lock,safety_policy,forbidden}',
    'commercial_positioning: {platform,reader_promise,selling_points,tropes,risks}',
    '',
    '要求：主角目标清晰，金手指/能力有代价，前 10 章追读钩子密集，分卷目标明确，避免空泛设定。',
  ].join('\n')

  const normalizeIncubatorPayload = (payload: any, chapterCount: number) => {
    const directions = Array.isArray(payload?.directions) ? payload.directions : []
    const selectedDirection = payload?.selected_direction || directions.slice().sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0))[0] || null
    return {
      directions,
      selected_direction: selectedDirection,
      worldbuilding: payload?.worldbuilding || selectedDirection?.worldbuilding || {},
      characters: Array.isArray(payload?.characters) ? payload.characters : (Array.isArray(selectedDirection?.characters) ? selectedDirection.characters : []),
      outlines: Array.isArray(payload?.outlines) ? payload.outlines : (Array.isArray(selectedDirection?.outlines) ? selectedDirection.outlines : []),
      chapters: (Array.isArray(payload?.chapters) ? payload.chapters : (Array.isArray(selectedDirection?.chapters) ? selectedDirection.chapters : [])).slice(0, chapterCount),
      writing_bible: payload?.writing_bible || selectedDirection?.writing_bible || {},
      commercial_positioning: payload?.commercial_positioning || selectedDirection?.commercial_positioning || {},
    }
  }

  const storeOriginalIncubatorPayload = async (activeWorkspace: string, project: any, payload: any) => {
    if (payload.worldbuilding?.world_summary || payload.worldbuilding?.rules) {
      await createNovelWorldbuilding(activeWorkspace, {
        project_id: project.id,
        world_summary: payload.worldbuilding.world_summary || '',
        rules: payload.worldbuilding.rules || [],
        known_unknowns: payload.worldbuilding.known_unknowns || [],
        raw_payload: payload.worldbuilding,
      })
    }
    for (const character of payload.characters || []) {
      if (!character?.name) continue
      await createNovelCharacter(activeWorkspace, {
        project_id: project.id,
        name: String(character.name),
        role_type: character.role_type || character.role || '',
        archetype: character.archetype || '',
        motivation: character.motivation || '',
        goal: character.goal || '',
        conflict: character.conflict || '',
        growth_arc: character.growth_arc || '',
        current_state: character.current_state || {},
        raw_payload: character,
      })
    }
    for (const outline of payload.outlines || []) {
      if (!outline?.title) continue
      await createNovelOutline(activeWorkspace, {
        project_id: project.id,
        outline_type: outline.outline_type || 'volume',
        title: String(outline.title),
        summary: outline.summary || '',
        conflict_points: outline.conflict_points || [],
        turning_points: outline.turning_points || [],
        hook: outline.hook || '',
        target_length: outline.target_length || '',
        raw_payload: outline,
      })
    }
    const existingChapters = await listNovelChapters(activeWorkspace, project.id)
    for (const chapter of payload.chapters || []) {
      const chapterNo = Number(chapter.chapter_no || 0)
      if (!chapterNo || existingChapters.some(item => item.chapter_no === chapterNo)) continue
      await createNovelChapter(activeWorkspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: chapter.title || `第${chapterNo}章`,
        chapter_goal: chapter.chapter_goal || '',
        chapter_summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        raw_payload: {
          ...chapter,
          must_advance: chapter.must_advance || [],
          forbidden_repeats: chapter.forbidden_repeats || [],
        },
      })
    }
    return await updateNovelProject(activeWorkspace, project.id, {
      synopsis: project.synopsis || payload.commercial_positioning?.reader_promise || '',
      reference_config: {
        ...(project.reference_config || {}),
        writing_bible: {
          ...payload.writing_bible,
          updated_at: new Date().toISOString(),
        },
        commercial_positioning: payload.commercial_positioning,
        original_incubator_last_payload: payload,
      },
    } as any)
  }

  return { buildOriginalIncubatorPrompt, normalizeIncubatorPayload, storeOriginalIncubatorPayload }
}

export type NovelOriginalIncubatorService = ReturnType<typeof createNovelOriginalIncubatorService>
