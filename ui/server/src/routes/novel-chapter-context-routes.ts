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
import { applyStyleSampleStrategyAuthorAction, buildChapterPreDraftBrief } from './novel-writing-service'

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

function compactContextText(value: any, limit = 700) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function normalizeGeneratedCharacter(item: any) {
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

function fallbackForbiddenRepeats(project: any, chapter: any, contextPackage: any) {
  const storyState = contextPackage?.story_state?.global || project?.reference_config?.story_state || {}
  return [
    ...asArray(storyState.recent_repeated_information),
    ...asArray(chapter.raw_payload?.forbidden_repeats),
  ]
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

async function loadChapterContext(ctx: ChapterContextRoutesContext, projectId: number, chapterId: number) {
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

function buildMaterialRepairPlan(rows: any[]) {
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

export function registerNovelChapterContextRoutes(app: Express, ctx: ChapterContextRoutesContext) {
  app.get('/api/novel/chapters/:chapterId/preflight', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: loaded.contextPackage.preflight.ready, context_package: loaded.contextPackage, preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/generation-diagnostics', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const preflight = loaded.contextPackage.preflight
      const readinessScore = Math.round((preflight.checks.filter((item: any) => item.ok).length / Math.max(1, preflight.checks.length)) * 100)
      const materialScore = buildMaterialScore(loaded.contextPackage)
      res.json({
        ok: preflight.ready,
        readiness_score: readinessScore,
        material_score: materialScore,
        preflight,
        context_package: loaded.contextPackage,
        writing_bible: loaded.contextPackage.writing_bible,
        story_state: loaded.contextPackage.story_state,
        recommendations: materialScore.recommendations.length
          ? materialScore.recommendations
          : preflight.checks.filter((item: any) => !item.ok).map((item: any) => item.fix || `${item.label}不足`),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/material-score', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, material_score: buildMaterialScore(loaded.contextPackage), preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/auto-repair-context', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapterId = Number(req.params.chapterId)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const checks = Array.isArray(contextPackage?.preflight?.checks) ? contextPackage.preflight.checks : []
      const missingKeys = checks.filter((item: any) => !item.ok).map((item: any) => item.key)
      const needsCharacters = missingKeys.includes('characters') || characters.length === 0
      const needsCharacterState = missingKeys.includes('character_state')
      const needsForbiddenRepeats = missingKeys.includes('no_repeat') || !asArray(chapter.raw_payload?.forbidden_repeats).length
      if (!needsCharacters && !needsCharacterState && !needsForbiddenRepeats) {
        return res.json({ ok: true, applied: [], skipped: true, context_package: contextPackage })
      }

      let payload: any = {}
      let repairError = ''
      const modelId = req.body?.model_id ? String(req.body.model_id) : ''
      if (modelId && (needsCharacters || needsCharacterState)) {
        const prompt = [
          '任务：为当前小说章节自动补齐生成前上下文材料。只输出 JSON。',
          '只补材料，不生成正文。优先解决：角色卡不足、角色当前状态不足、禁止重复信息不足。',
          '输出字段：',
          '{',
          '  "characters": [{"name","role_type","archetype","age","gender","identity","faction","appearance","personality":[],"abilities":[],"items":[],"knowledge_scope":[],"information_boundaries":[],"motivation","goal","conflict","backstory","secret","relationships":[],"growth_arc","current_state":{}}],',
          '  "character_updates": [{"name","current_state":{}}],',
          '  "forbidden_repeats": ["本章禁止重复解释的信息"],',
          '  "must_advance": ["本章必须推进的剧情点"],',
          '  "repair_summary": "补齐说明"',
          '}',
          '角色 current_state 要尽量结构化，包含 location, physical_condition, emotional_state, items, knowledge_scope, information_boundaries, ability_status, relationship_attitudes, last_seen_chapter 等可由材料确定的字段。',
          '要求：角色卡只创建对当前章和后续 5 章有用的主要/关键角色；不要编造与项目核心冲突相违背的人设；禁止重复信息要具体到本章写作可执行。',
          '【项目】',
          JSON.stringify({
            title: project.title,
            genre: project.genre,
            synopsis: project.synopsis,
            style_tags: project.style_tags,
          }, null, 2),
          '【当前章】',
          JSON.stringify({
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            goal: chapter.chapter_goal,
            summary: chapter.chapter_summary,
            conflict: chapter.conflict,
            ending_hook: chapter.ending_hook,
            must_advance: chapter.raw_payload?.must_advance || [],
            forbidden_repeats: chapter.raw_payload?.forbidden_repeats || [],
          }, null, 2),
          '【已有角色】',
          JSON.stringify(characters.slice(0, 20).map(char => ({
            name: char.name,
            role: char.role_type || char.role,
            archetype: char.archetype,
            appearance: char.appearance,
            abilities: char.abilities,
            motivation: char.motivation,
            goal: char.goal,
            conflict: char.conflict,
            current_state: char.current_state || {},
            profile: char.raw_payload?.profile || {},
          })), null, 2),
          '【世界观/大纲/近期章节】',
          JSON.stringify({
            worldbuilding: worldbuilding.slice(0, 2).map(item => ({
              world_summary: compactContextText(item.world_summary, 500),
              rules: asArray(item.rules).slice(0, 8),
              timeline_anchor: item.timeline_anchor || '',
            })),
            outlines: outlines.slice(0, 15).map(item => ({ type: item.outline_type, title: item.title, summary: compactContextText(item.summary, 400), hook: item.hook })),
            recent_chapters: chapters
              .filter(item => item.chapter_no <= chapter.chapter_no)
              .slice(-3)
              .map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook, excerpt: compactContextText(item.chapter_text, 260) })),
            story_state: contextPackage.story_state?.global || {},
            preflight_warnings: contextPackage.preflight?.warnings || [],
          }, null, 2).slice(0, 6500),
        ].join('\n')
        try {
          const result = await executeNovelAgent('outline-agent', project, { task: prompt }, {
            activeWorkspace,
            modelId,
            maxTokens: 2200,
            temperature: 0.35,
            responseMode: 'stream',
            skipMemory: true,
          })
          if ((result as any).error) {
            repairError = String((result as any).error || '上下文补齐模型调用失败')
          } else {
            payload = getNovelPayload(result)
          }
        } catch (error) {
          repairError = String(error || '上下文补齐模型调用失败')
        }
        if (repairError) {
          payload = {
            characters: [],
            character_updates: [],
            forbidden_repeats: fallbackForbiddenRepeats(project, chapter, contextPackage),
            must_advance: asArray(chapter.raw_payload?.must_advance),
            repair_summary: `模型补齐失败，已降级为本地可推断补齐：${repairError.slice(0, 240)}`,
          }
        }
      } else {
        payload = {
          characters: [],
          character_updates: [],
          forbidden_repeats: fallbackForbiddenRepeats(project, chapter, contextPackage),
          must_advance: asArray(chapter.raw_payload?.must_advance),
          repair_summary: modelId ? '当前缺口无需调用模型，仅执行本地可推断补齐。' : '未指定模型，仅执行本地可推断补齐。',
        }
      }

      const applied: any[] = []
      const existingByName = new Map(characters.map(char => [String(char.name || '').trim(), char]).filter(([name]) => Boolean(name)) as any)
      if (needsCharacters) {
        let characterCandidates = asArray(payload.characters)
          .map(normalizeGeneratedCharacter)
          .filter((item: any) => item.name && !existingByName.has(item.name))
        if (characterCandidates.length === 0) {
          characterCandidates = buildFallbackGeneratedCharacters(project, chapter, contextPackage)
            .map(normalizeGeneratedCharacter)
            .filter((item: any) => item.name && !existingByName.has(item.name))
          payload.characters = [
            ...asArray(payload.characters),
            ...characterCandidates.map((item: any) => ({ ...item.raw_payload, ...item })),
          ]
          payload.repair_summary = [
            payload.repair_summary,
            '模型未返回可入库角色卡，已创建本地兜底主角卡。',
          ].filter(Boolean).join('；')
        }
        for (const normalized of characterCandidates.slice(0, 8)) {
          const created = await createNovelCharacter(activeWorkspace, {
            project_id: projectId,
            ...normalized,
            status: 'active',
          } as any)
          existingByName.set(created.name, created)
          applied.push({ type: 'character_created', id: created.id, name: created.name })
        }
      }
      if (needsCharacterState) {
        for (const raw of asArray(payload.character_updates).slice(0, 12)) {
          const name = String(raw?.name || '').trim()
          const current = existingByName.get(name)
          if (!name || !current || !raw?.current_state || typeof raw.current_state !== 'object') continue
          const updated = await updateNovelCharacter(activeWorkspace, current.id, {
            current_state: {
              ...(current.current_state || {}),
              ...(raw.current_state || {}),
              last_seen_chapter: chapter.chapter_no,
            },
          } as any)
          if (updated) applied.push({ type: 'character_state_updated', id: updated.id, name: updated.name })
        }
      }
      const nextForbiddenRepeats = [
        ...asArray(chapter.raw_payload?.forbidden_repeats),
        ...asArray(payload.forbidden_repeats),
        ...fallbackForbiddenRepeats(project, chapter, contextPackage),
      ].map((item: any) => String(item || '').trim()).filter(Boolean)
      const nextMustAdvance = [
        ...asArray(chapter.raw_payload?.must_advance),
        ...asArray(payload.must_advance),
      ].map((item: any) => String(item || '').trim()).filter(Boolean)
      if (needsForbiddenRepeats || nextMustAdvance.length !== asArray(chapter.raw_payload?.must_advance).length) {
        const uniqueForbidden = [...new Set(nextForbiddenRepeats)].slice(0, 12)
        const uniqueAdvance = [...new Set(nextMustAdvance)].slice(0, 12)
        const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
          raw_payload: {
            ...(chapter.raw_payload || {}),
            forbidden_repeats: uniqueForbidden,
            must_advance: uniqueAdvance,
            context_auto_repair_summary: payload.repair_summary || '',
            context_auto_repaired_at: new Date().toISOString(),
          },
        } as any, { createVersion: false })
        applied.push({ type: 'chapter_context_updated', chapter_id: chapter.id, forbidden_repeats: uniqueForbidden.length, must_advance: uniqueAdvance.length })
        Object.assign(chapter, updated || chapter)
      }
      const refreshed = await loadChapterContext(ctx, projectId, chapter.id)
      res.json({
        ok: true,
        applied,
        payload,
        warnings: repairError ? [`上下文补齐模型调用失败，已降级处理并允许继续生成：${repairError.slice(0, 240)}`] : [],
        context_package: 'error' in refreshed ? null : refreshed.contextPackage,
        preflight: 'error' in refreshed ? null : refreshed.contextPackage.preflight,
        material_score: 'error' in refreshed ? null : buildMaterialScore(refreshed.contextPackage),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-material-matrix', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const unwrittenOnly = String(req.query.unwritten_only || '') === '1'
      const scopedChapters = chapters
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status || '',
          word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(chapter.chapter_text),
          material_score: materialScore,
          score: materialScore.score,
          level: materialScore.level,
          can_generate: materialScore.can_generate,
          blockers: materialScore.blockers,
          recommendations: materialScore.recommendations,
        })
      }
      const blocked = rows.filter(row => !row.can_generate)
      res.json({
        ok: true,
        rows,
        summary: {
          total: rows.length,
          ready: rows.filter(row => row.can_generate).length,
          blocked: blocked.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          low_score: rows.filter(row => Number(row.score || 0) < 65).length,
        },
        weakest: [...rows].sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 12),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/material-repair-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const startNo = Math.max(1, Number(req.query.start_chapter || 1))
      const unwrittenOnly = String(req.query.unwritten_only ?? '1') !== '0'
      const scopedChapters = chapters
        .filter(chapter => Number(chapter.chapter_no || 0) >= startNo)
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          has_text: Boolean(chapter.chapter_text),
          score: materialScore.score,
          can_generate: materialScore.can_generate,
          material_score: materialScore,
        })
      }
      const plan = buildMaterialRepairPlan(rows)
      res.json({
        ok: true,
        rows,
        plan,
        summary: {
          scanned: rows.length,
          ready: plan.ready_chapter_ids.length,
          blocked: plan.blocked_chapter_ids.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          bucket_count: plan.buckets.length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, context_package: loaded.contextPackage, override: loaded.chapter.raw_payload?.context_package_override || null })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/pre-draft-brief', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const stored = loaded.chapter.raw_payload ? loaded.chapter.raw_payload.pre_draft_brief : null
      const brief = stored || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      res.json({ ok: true, brief, stored: Boolean(stored), confirmed: Boolean(brief?.confirmed_at), context_package: loaded.contextPackage })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/pre-draft-brief', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapterId = Number(req.params.chapterId)
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const brief = req.body?.brief || req.body?.pre_draft_brief || {}
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          pre_draft_brief: {
            ...(chapter.raw_payload?.pre_draft_brief || {}),
            ...(brief || {}),
            updated_at: new Date().toISOString(),
          },
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, brief: updated?.raw_payload?.pre_draft_brief || brief })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const existing = req.body?.brief || loaded.chapter.raw_payload?.pre_draft_brief || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      const brief = {
        ...(existing || {}),
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelChapter(loaded.activeWorkspace, loaded.chapter.id, {
        raw_payload: {
          ...(loaded.chapter.raw_payload || {}),
          pre_draft_brief: brief,
        },
      } as any, { createVersion: false })
      const storedBrief = updated?.raw_payload?.pre_draft_brief || null
      res.json({ ok: true, chapter: updated, brief: storedBrief, confirmed: Boolean(storedBrief?.confirmed_at) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const action = String(req.body?.action || 'lock').trim() || 'lock'
      const existing = loaded.chapter.raw_payload?.pre_draft_brief || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      const styleSampleStrategy = applyStyleSampleStrategyAuthorAction(
        loaded.project,
        loaded.contextPackage,
        existing?.style_sample_strategy || {},
        {
          action,
          sample_keys: req.body?.sample_keys || req.body?.sampleKeys || [],
        },
      )
      const brief = {
        ...(existing || {}),
        style_sample_strategy: styleSampleStrategy,
        updated_at: new Date().toISOString(),
      }
      if (action !== 'lock') {
        delete (brief as any).confirmed_at
      }
      const updated = await updateNovelChapter(loaded.activeWorkspace, loaded.chapter.id, {
        raw_payload: {
          ...(loaded.chapter.raw_payload || {}),
          pre_draft_brief: brief,
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, brief, style_sample_strategy: styleSampleStrategy })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const override = req.body?.override || req.body?.context_package_override || {}
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          context_package_override: override,
          context_package_override_updated_at: new Date().toISOString(),
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, override })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
