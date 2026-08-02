import type { Express } from 'express'
import {
  createNovelCharacter,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelCharacter,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { asArray, getNovelPayload } from './novel-route-utils'
import { applyStyleSampleStrategyAuthorAction, buildChapterPreDraftBrief } from '../novel-writing-service'

type ChapterContextRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (
    workspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[],
  ) => Promise<any>
}

export function compactContextText(value: any, limit = 700) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizeGeneratedCharacter(item: any) {
  const currentState = item?.current_state && typeof item.current_state === 'object' ? item.current_state : {}
  return {
    name: String(item?.name || '').trim(),
    role_type: String(item?.role_type || item?.role || ''),
    archetype: String(item?.archetype || ''),
    personality: asArray(item?.personality).map((value: any) => String(value || '').trim()).filter(Boolean),
    motivation: String(item?.motivation || ''),
    goal: String(item?.goal || ''),
    conflict: String(item?.conflict || ''),
    appearance: String(item?.appearance || ''),
    abilities: asArray(item?.abilities).map((value: any) => String(value || '').trim()).filter(Boolean),
    backstory: String(item?.backstory || ''),
    secret: String(item?.secret || ''),
    relationships: asArray(item?.relationships),
    growth_arc: String(item?.growth_arc || item?.arc || ''),
    current_state: {
      ...currentState,
      age: currentState.age ?? item?.age ?? '',
      gender: currentState.gender ?? item?.gender ?? '',
      identity: currentState.identity ?? item?.identity ?? '',
      faction: currentState.faction ?? item?.faction ?? '',
      items: asArray(currentState.items || item?.items),
      knowledge_scope: asArray(currentState.knowledge_scope || item?.knowledge_scope),
      information_boundaries: asArray(currentState.information_boundaries || item?.information_boundaries),
    },
    raw_payload: {
      ...(item || {}),
      profile: {
        age: item?.age || currentState.age || '',
        gender: item?.gender || currentState.gender || '',
        identity: item?.identity || currentState.identity || '',
        faction: item?.faction || currentState.faction || '',
      },
      items: asArray(currentState.items || item?.items),
    },
  }
}

function firstTextValue(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstTextValue(...value)
      if (nested) return nested
      continue
    }
    if (value && typeof value === 'object') {
      const nested = firstTextValue(value.name, value.title, value.label)
      if (nested) return nested
      continue
    }
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function inferLikelyCharacterName(...values: any[]) {
  const text = values.map(value => String(value || '')).join(' ').replace(/\s+/g, ' ')
  const stopNames = new Set(['主角', '主人公', '少年', '少女', '世界', '现实', '家族', '异象', '规则', '危机', '敌人', '宗门', '王朝'])
  const patterns = [
    /穿越者([\u4e00-\u9fa5]{2,4})(?:穿越|进入|发现|凭借|在|，|,)/,
    /(?:主角|主人公)(?:名叫|叫|为|是|：|:|“|")([\u4e00-\u9fa5]{2,4})/,
    /([\u4e00-\u9fa5]{2,4})(?:穿越|进入|发现|首次|被迫|利用|凭借|确认|触碰|感知|觉醒|直面)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    const name = String(match?.[1] || '').trim()
    if (name && !stopNames.has(name)) return name
  }
  return ''
}

export function buildFallbackGeneratedCharacters(project: any, chapter: any, contextPackage: any) {
  const writingBible = project?.reference_config?.writing_bible || contextPackage?.writing_bible || {}
  const storyState = contextPackage?.story_state?.global || project?.reference_config?.story_state || {}
  const chapterNo = Number(chapter?.chapter_no || contextPackage?.chapter_target?.chapter_no || 1)
  const chapterTitle = String(chapter?.title || contextPackage?.chapter_target?.title || '当前章节').trim()
  const protagonistName = firstTextValue(
    writingBible.protagonist,
    writingBible.main_character,
    writingBible.mainCharacter,
    writingBible.characters,
    storyState.protagonist,
    storyState.main_character,
    chapter?.raw_payload?.protagonist,
    chapter?.raw_payload?.main_character,
    project?.protagonist,
    inferLikelyCharacterName(chapter?.chapter_summary, chapter?.chapter_goal, project?.synopsis, project?.reference_config?.project_seed?.raw_idea),
    '主角',
  )
  const chapterLabel = `第${chapterNo}章《${chapterTitle}》`
  return [{
    name: protagonistName,
    role_type: 'protagonist',
    archetype: '被当前章推动入局的主角',
    identity: firstTextValue(writingBible.protagonist_identity, storyState.protagonist_identity, project?.genre, '核心视角人物'),
    appearance: '',
    personality: ['警觉', '目标感强'],
    abilities: [],
    items: [],
    knowledge_scope: ['只知道当前章已揭示的信息'],
    information_boundaries: ['不得提前知道后续真相'],
    motivation: firstTextValue(chapter?.chapter_goal, contextPackage?.chapter_target?.goal, project?.synopsis, '弄清当前危机并活下来'),
    goal: firstTextValue(chapter?.chapter_goal, contextPackage?.chapter_target?.goal, '完成本章目标'),
    conflict: firstTextValue(chapter?.conflict, contextPackage?.chapter_target?.conflict, '与当前章核心冲突正面相撞'),
    backstory: firstTextValue(project?.synopsis, writingBible.reader_promise, '待后续补完'),
    secret: '',
    relationships: [],
    growth_arc: firstTextValue(writingBible.character_arc, '从被动卷入到主动理解规则和代价'),
    current_state: {
      location: `${chapterLabel}开场`,
      physical_condition: '可行动',
      emotional_state: '警觉',
      items: [],
      knowledge_scope: ['只知道当前章已揭示的信息'],
      information_boundaries: ['不得提前知道后续真相'],
      ability_status: '未确认',
      relationship_attitudes: {},
      last_seen_chapter: chapterNo,
    },
    raw_payload: {
      source: 'auto_repair_context_fallback',
      fallback_reason: 'model_returned_no_usable_character_cards',
    },
  }]
}

export function fallbackForbiddenRepeats(project: any, chapter: any, contextPackage: any) {
  const storyState = contextPackage?.story_state?.global || project?.reference_config?.story_state || {}
  return [
    ...asArray(storyState.recent_repeated_information),
    ...asArray(chapter.raw_payload?.forbidden_repeats),
  ]
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

export async function loadChapterContext(ctx: ChapterContextRoutesContext, projectId: number, chapterId: number) {
  const activeWorkspace = ctx.getWorkspace()
  const project = await ctx.getProject(activeWorkspace, projectId)
  if (!project) return { activeWorkspace, status: 404, error: 'project not found' }

  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
  ])
  const chapter = chapters.find(item => item.id === chapterId)
  if (!chapter) return { activeWorkspace, project, status: 404, error: 'chapter not found' }

  const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
  return { activeWorkspace, project, chapter, contextPackage }
}

export function buildMaterialScore(contextPackage: any) {
  const preflight = contextPackage?.preflight || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const chapter = contextPackage?.chapter_target || {}
  const storyState = contextPackage?.story_state || {}
  const writingBible = contextPackage?.writing_bible || {}
  const reference = contextPackage?.reference || null
  const referenceCheck = checks.find((item: any) => item?.key === 'reference_knowledge')
  const usesReference = Boolean(referenceCheck && !referenceCheck.ok) || Number(reference?.injected_entry_count || 0) > 0
  const hasSceneCards = Array.isArray(chapter.scene_cards) && chapter.scene_cards.length > 0
  const hasPrevious = Boolean(contextPackage?.continuity?.previous_chapter)
  const categories = [
    {
      key: 'detail_outline',
      label: '章节细纲',
      score: [chapter.goal, chapter.summary, chapter.conflict, chapter.ending_hook].filter(Boolean).length * 25,
      required: true,
      fix: '补齐章节目标、摘要、冲突和结尾钩子。',
    },
    {
      key: 'scene_cards',
      label: '场景卡',
      score: hasSceneCards ? Math.min(100, chapter.scene_cards.length * 25) : 0,
      required: true,
      fix: '先生成或人工确认 2-6 个场景卡。',
    },
    {
      key: 'continuity',
      label: '续写衔接',
      score: hasPrevious || Number(chapter.chapter_no || 1) <= 1 ? 100 : 35,
      required: false,
      fix: '补齐上一章结尾钩子或上一章正文。',
    },
    {
      key: 'character_state',
      label: '角色状态',
      score: Array.isArray(storyState.characters) && storyState.characters.length > 0 ? 100 : 30,
      required: true,
      fix: '补齐角色卡或状态机角色信息。',
    },
    {
      key: 'writing_bible',
      label: '写作圣经',
      score: writingBible?.promise || writingBible?.style_lock ? 100 : 35,
      required: false,
      fix: '保存写作圣经，锁定读者承诺、文风和禁止项。',
    },
    ...(usesReference ? [{
      key: 'reference',
      label: '参考知识',
      score: Math.min(100, Number(reference?.injected_entry_count || 0) * 12),
      required: false,
      fix: '参考写作时先补齐参考知识画像；原创项目可忽略。',
    }] : []),
  ].map(item => ({
    ...item,
    score: Math.max(0, Math.min(100, Math.round(Number(item.score || 0)))),
  }))
  const checkScore = checks.length ? Math.round((checks.filter((item: any) => item.ok).length / checks.length) * 100) : 100
  const weightedScore = Math.round(categories.reduce((sum, item) => sum + item.score, 0) / Math.max(1, categories.length) * 0.7 + checkScore * 0.3)
  const blockers = categories.filter(item => item.required && item.score < 60)
  return {
    score: weightedScore,
    level: weightedScore >= 85 ? 'ready' : weightedScore >= 65 ? 'usable' : 'blocked',
    can_generate: preflight.ready && blockers.length === 0,
    check_score: checkScore,
    categories,
    blockers,
    recommendations: [
      ...blockers.map(item => item.fix),
      ...categories.filter(item => !item.required && item.score < 60).map(item => item.fix),
      ...(Array.isArray(preflight.warnings) ? preflight.warnings : []),
    ].filter(Boolean).slice(0, 8),
  }
}

export function buildMaterialRepairPlan(rows: any[]) {
  const buckets = [
    { key: 'detail_outline', label: '补章节细纲', chapters: [] as any[], action: '补齐章节目标、摘要、冲突、结尾钩子。' },
    { key: 'scene_cards', label: '生成场景卡', chapters: [] as any[], action: '为章节生成或确认 2-6 个场景卡。' },
    { key: 'character_state', label: '补角色状态', chapters: [] as any[], action: '补齐角色 current_state 或先校正故事状态机。' },
    { key: 'continuity', label: '补前章衔接', chapters: [] as any[], action: '补齐上一章正文、上一章结尾钩子或续写摘要。' },
    { key: 'writing_bible', label: '补写作圣经', chapters: [] as any[], action: '保存读者承诺、文风锁定、禁止项和安全策略。' },
    { key: 'reference', label: '补参考知识', chapters: [] as any[], action: '补齐参考作品画像、参考预览或关闭参考模式。' },
  ]
  const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]))
  for (const row of rows) {
    const categories = Array.isArray(row.material_score?.categories) ? row.material_score.categories : []
    const weakCategories = categories.filter((item: any) => Number(item.score || 0) < 60)
    for (const category of weakCategories) {
      const bucket = bucketMap.get(category.key)
      if (!bucket) continue
      bucket.chapters.push({
        chapter_id: row.chapter_id,
        chapter_no: row.chapter_no,
        title: row.title,
        score: row.score,
        category_score: category.score,
        recommendation: category.fix,
      })
    }
  }
  const orderedBuckets = buckets
    .map(bucket => ({
      ...bucket,
      chapters: bucket.chapters.sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0)).slice(0, 30),
      count: bucket.chapters.length,
    }))
    .filter(bucket => bucket.count > 0)
  return {
    buckets: orderedBuckets,
    next_actions: orderedBuckets.slice(0, 5).map(bucket => `${bucket.label}：${bucket.count} 章。${bucket.action}`),
    ready_chapter_ids: rows.filter(row => row.can_generate).map(row => row.chapter_id),
    blocked_chapter_ids: rows.filter(row => !row.can_generate).map(row => row.chapter_id),
  }
}

