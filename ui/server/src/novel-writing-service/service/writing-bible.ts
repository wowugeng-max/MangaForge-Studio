import {
  collectRecentFacts,
  getSafetyPolicy,
  getStoryState,
  getStyleLock,
  getVolumePlan,
} from '../../routes/novel-route-utils'
import { normalizeMemeBank } from '../post-delivery/asset-banks'

export function buildWritingBible(project: any, worldbuilding: any[], characters: any[], outlines: any[], reviews: any[] = []) {
  const storyState = getStoryState(project)
  const styleLock = getStyleLock(project)
  const safety = getSafetyPolicy(project)
  const masterOutline = outlines.find(outline => outline.outline_type === 'master') || null
  const volumePlan = getVolumePlan(outlines)
  return {
    project: {
      title: project.title,
      genre: project.genre || '',
      synopsis: project.synopsis || '',
      target_audience: project.target_audience || '',
      style_tags: project.style_tags || [],
      length_target: project.length_target || '',
    },
    promise: masterOutline?.summary || project.synopsis || '',
    world_rules: worldbuilding[0]?.rules || [],
    world_summary: worldbuilding[0]?.world_summary || '',
    mainline: masterOutline ? {
      title: masterOutline.title,
      hook: masterOutline.hook || '',
      conflict_points: masterOutline.conflict_points || [],
      turning_points: masterOutline.turning_points || [],
    } : null,
    volume_plan: volumePlan,
    characters: characters.map(char => ({
      name: char.name,
      role: char.role_type || char.role || '',
      goal: char.goal || '',
      motivation: char.motivation || '',
      conflict: char.conflict || '',
      growth_arc: char.growth_arc || '',
      current_state: char.current_state || {},
    })),
    style_lock: styleLock,
    safety_policy: safety,
    story_state: storyState,
    latest_state_entries: collectRecentFacts(reviews),
    forbidden: safety.forbidden,
    preferred_words: styleLock.preferred_words || [],
    banned_words: styleLock.banned_words || [],
    meme_bank: normalizeMemeBank(project.reference_config?.meme_bank || []),
    updated_at: new Date().toISOString(),
  }
}

export function hasMeaningfulWritingBible(value: any) {
  if (!value || typeof value !== 'object') return false
  return Boolean(
    String(value.promise || value.world_summary || '').trim() ||
    (Array.isArray(value.world_rules) && value.world_rules.length > 0) ||
    (Array.isArray(value.volume_plan) && value.volume_plan.length > 0) ||
    (Array.isArray(value.characters) && value.characters.length > 0) ||
    (value.mainline && Object.keys(value.mainline || {}).length > 0) ||
    (value.style_lock && Object.values(value.style_lock || {}).some(item => Array.isArray(item) ? item.length > 0 : Boolean(String(item || '').trim())))
  )
}


export async function getStoredOrBuiltWritingBible(args: {
  activeWorkspace: string
  project: any
  listNovelWorldbuilding: (workspace: string, projectId: number) => Promise<any[]>
  listNovelCharacters: (workspace: string, projectId: number) => Promise<any[]>
  listNovelOutlines: (workspace: string, projectId: number) => Promise<any[]>
  listNovelReviews: (workspace: string, projectId: number) => Promise<any[]>
}) {
  const [worldbuilding, characters, outlines, reviews] = await Promise.all([
    args.listNovelWorldbuilding(args.activeWorkspace, args.project.id),
    args.listNovelCharacters(args.activeWorkspace, args.project.id),
    args.listNovelOutlines(args.activeWorkspace, args.project.id),
    args.listNovelReviews(args.activeWorkspace, args.project.id),
  ])
  const stored = args.project.reference_config?.writing_bible
  return hasMeaningfulWritingBible(stored)
    ? stored
    : buildWritingBible(args.project, worldbuilding, characters, outlines, reviews)
}
