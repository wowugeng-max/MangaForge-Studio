import {
  listNovelChapters,
  listNovelProjects,
  listNovelWorkspaceChapters,
} from '../../novel'

export function parseOptionalBoolean(value: any) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const raw = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(raw)) return true
  if (['false', '0', 'no', 'off'].includes(raw)) return false
  return Boolean(value)
}

export function rejectInvalidQueryView(res: any, view: string, allowedViews: string[]) {
  return res.status(400).json({
    error: `invalid view: ${view}`,
    error_code: 'INVALID_VIEW',
    allowed_views: allowedViews,
  })
}

export function requireProjectId(req: any, res: any) {
  const projectId = Number(req.query?.project_id)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'project_id is required', error_code: 'PROJECT_ID_REQUIRED' })
    return null
  }
  return projectId
}

export async function listProjectsWithWritingAggregates(activeWorkspace: string) {
  const projects = await listNovelProjects(activeWorkspace)
  return Promise.all(projects.map(async project => {
    const chapters = await listNovelChapters(activeWorkspace, project.id)
    const writtenChapters = chapters.filter(chapter => String(chapter.chapter_text || '').trim())
    const writtenWords = writtenChapters.reduce((total, chapter) => total + String(chapter.chapter_text || '').replace(/\s/g, '').length, 0)
    const nextUnwrittenChapter = chapters
      .slice()
      .sort((left, right) => Number(left.chapter_no || 0) - Number(right.chapter_no || 0))
      .find(chapter => !String(chapter.chapter_text || '').trim())
    return {
      ...project,
      chapter_count: chapters.length,
      written_chapter_count: writtenChapters.length,
      written_words: writtenWords,
      next_unwritten_chapter_no: nextUnwrittenChapter ? Number(nextUnwrittenChapter.chapter_no || 0) : 0,
    }
  }))
}


export * from './builders-seed-outline'
export * from './builders-seed'
