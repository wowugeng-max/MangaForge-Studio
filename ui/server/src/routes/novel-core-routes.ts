import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../llm'
import { parseJsonLikePayload } from './novel-route-utils'

function parseOptionalBoolean(value: any) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const raw = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(raw)) return true
  if (['false', '0', 'no', 'off'].includes(raw)) return false
  return Boolean(value)
}

function asSeedArray(value: any) {
  return Array.isArray(value) ? value : []
}

function firstSeedText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function inferSeedGenre(text: string) {
  const raw = String(text || '')
  if (/修仙|仙门|仙道|天尊|长生|古神|外神|神祇|王朝|皇子/.test(raw)) return '仙侠'
  if (/异能|灵气|武魂|斗气|神魔|玄幻/.test(raw)) return '玄幻'
  if (/都市|公司|学校|职场/.test(raw)) return '都市'
  if (/末世|丧尸|灾变/.test(raw)) return '末世'
  if (/星际|飞船|AI|人工智能|科幻/.test(raw)) return '科幻'
  if (/悬疑|推理|凶案|诡案/.test(raw)) return '悬疑'
  return ''
}

function parseNestedSeed(value: any): any {
  if (typeof value === 'string') return parseJsonLikePayload(value) || {}
  if (value && typeof value === 'object') return value
  return {}
}

function normalizeProjectSeedPayload(payload: any, rawIdea: string) {
  const root = parseNestedSeed(payload)
  const candidates = [
    root.project_seed,
    root.seed,
    root.project,
    root.novel_project,
    root.data,
    root.result,
    root,
  ].map(parseNestedSeed)
  const source = candidates.find(item => item && typeof item === 'object' && !Array.isArray(item) && (
    item.title || item.project_title || item.book_title || item.synopsis || item.summary || item.logline || item.core_premise || item.worldbuilding || item.protagonist
  )) || root
  const masterOutline = parseNestedSeed(source.master_outline || root.master_outline)
  const rawForInference = JSON.stringify(root).slice(0, 5000) + rawIdea.slice(0, 5000)
  const commercial = parseNestedSeed(source.commercial_positioning || root.commercial_positioning)
  const worldbuilding = parseNestedSeed(source.worldbuilding || root.worldbuilding)
  const plotEngine = parseNestedSeed(source.plot_engine || root.plot_engine)
  const protagonist = parseNestedSeed(source.protagonist || root.protagonist)
  const antagonist = parseNestedSeed(source.antagonist || root.antagonist)
  const writingBible = parseNestedSeed(source.writing_bible || root.writing_bible)
  return {
    title: firstSeedText(source.title, source.project_title, source.book_title, source.name, source.working_title, masterOutline.title),
    genre: firstSeedText(source.genre, source.main_genre, source.category, inferSeedGenre(rawForInference)),
    sub_genres: asSeedArray(source.sub_genres).length ? asSeedArray(source.sub_genres) : asSeedArray(source.genre_tags || source.tags),
    target_audience: firstSeedText(source.target_audience, source.audience, commercial.platform),
    length_target: firstSeedText(source.length_target, source.length, 'medium'),
    style_tags: asSeedArray(source.style_tags).length ? asSeedArray(source.style_tags) : asSeedArray(source.tone_tags),
    commercial_tags: asSeedArray(source.commercial_tags).length ? asSeedArray(source.commercial_tags) : asSeedArray(commercial.tropes || commercial.selling_points),
    synopsis: firstSeedText(source.synopsis, source.project_summary, source.summary, masterOutline.summary, commercial.reader_promise, source.core_premise, source.logline),
    logline: firstSeedText(source.logline, source.hook, masterOutline.hook, commercial.reader_promise),
    core_premise: firstSeedText(source.core_premise, source.premise, source.setting, source.summary, masterOutline.summary),
    main_conflict: firstSeedText(source.main_conflict, source.conflict, plotEngine.long_term_goal, masterOutline.hook),
    protagonist,
    antagonist,
    worldbuilding,
    plot_engine: plotEngine,
    writing_bible: writingBible,
    characters: asSeedArray(source.characters).length ? asSeedArray(source.characters) : asSeedArray(root.characters),
    open_questions: asSeedArray(source.open_questions).length ? asSeedArray(source.open_questions) : asSeedArray(source.questions),
    next_steps: asSeedArray(source.next_steps).length ? asSeedArray(source.next_steps) : asSeedArray(source.suggested_next_steps),
    raw_idea: rawIdea,
    raw_payload: root,
  }
}

function buildProjectSeedPrompt(idea: string, requestedTitle = '') {
  return [
    '任务：把用户碎片化小说想法整理成可创建项目的结构化项目种子。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle ? `用户指定作品名：${requestedTitle}` : '',
    '',
    '用户原始想法：',
    idea.slice(0, 20000) || '用户只提供了作品名。请基于作品名生成一个原创、可商业连载的项目种子，不要套用现有作品。',
    '',
    '请输出字段：',
    'title: 作品暂定名，必须短而有辨识度；如果用户指定作品名，优先使用用户指定作品名',
    'genre: 主类型，从玄幻/仙侠/悬疑/都市/历史/科幻/奇幻/武侠/言情/末世/穿越/系统/其他中选择最接近的一项',
    'sub_genres: array，子类型标签',
    'target_audience: 男频/女频/全向/轻小说/漫剧/Z世代/其他',
    'length_target: short|medium|long|epic',
    'style_tags: array，文风标签',
    'commercial_tags: array，商业定位标签',
    'synopsis: 150-300字项目简介，清楚说明主角、世界、核心冲突和看点',
    'logline: 一句话钩子',
    'core_premise: 核心设定',
    'main_conflict: 主线矛盾',
    'protagonist: {name, identity, goal, wound_or_need, power_or_cheat, limitation}',
    'antagonist: {name, identity, goal, method, hidden_truth}',
    'worldbuilding: {world_summary, history_secret, power_system, ancient_gods, outer_gods, rules, taboos}',
    'plot_engine: {inciting_incident, long_term_goal, volume_arc_suggestions, first_10_chapters_direction}',
    'writing_bible: {promise, mainline, world_rules, style_lock, forbidden, safety_policy}',
    'characters: array，列出关键人物 name, role_type, motivation, goal, conflict, current_state',
    'master_outline: {title, summary, hook}',
    'volume_outlines: array，输出 3-5 个分卷，每项 title, summary, hook, chapter_count',
    'chapter_outlines: array，输出至少前 30 章细纲；如果故事结构已经清晰，可以输出 60 章。每项 chapter_no,title,summary,conflict,ending_hook',
    'foreshadowing_plan: array，输出关键伏笔 plant_at,payoff_at,description',
    'open_questions: array，需要用户后续确认的问题',
    'next_steps: array，进入工作台后建议优先做什么',
    '',
    '要求：保留用户设定中的核心因果；补齐缺失但不要推翻原意；如果名字缺失可以给暂定名；不要直接生成正文；避免照搬任何现有作品的专有设定、角色名、桥段或原句。',
  ].filter(Boolean).join('\n')
}

async function deriveProjectSeedWithModel(activeWorkspace: string, idea: string, modelId: string, requestedTitle = '') {
  const prompt = buildProjectSeedPrompt(idea, requestedTitle)
  const projectStub = {
    id: 0,
    title: requestedTitle || '创意草稿解析',
    genre: '',
    sub_genres: [],
    synopsis: idea.slice(0, 500),
    length_target: 'medium',
    target_audience: '',
    style_tags: [],
    commercial_tags: [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt }, {
    activeWorkspace,
    modelId,
    maxTokens: 9000,
    temperature: 0.42,
    skipMemory: true,
  })
  const seed = normalizeProjectSeedPayload((result as any).output || parseJsonLikePayload((result as any).content) || {}, idea)
  if (requestedTitle && !seed.title) seed.title = requestedTitle
  return { seed, result }
}

function getSeedRaw(seed: any) {
  const raw = parseNestedSeed(seed?.raw_payload)
  return Object.keys(raw).length ? raw : parseNestedSeed(seed)
}

function getSeedChapterOutlines(seed: any) {
  const raw = getSeedRaw(seed)
  const candidates = [
    raw.chapter_outlines,
    raw.chapters,
    seed?.chapter_outlines,
    seed?.chapters,
  ]
  return candidates.find(Array.isArray) || []
}

function getSeedVolumeOutlines(seed: any) {
  const raw = getSeedRaw(seed)
  const candidates = [
    raw.volume_outlines,
    raw.volumes,
    seed?.volume_outlines,
    seed?.volumes,
  ]
  return candidates.find(Array.isArray) || []
}

function normalizeChapterSeed(chapter: any, index: number) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.no || index + 1)
  return {
    chapter_no: chapterNo,
    title: firstSeedText(chapter?.title, `第${chapterNo}章`),
    chapter_goal: firstSeedText(chapter?.chapter_goal, chapter?.goal, chapter?.summary),
    chapter_summary: firstSeedText(chapter?.chapter_summary, chapter?.summary),
    conflict: firstSeedText(chapter?.conflict),
    ending_hook: firstSeedText(chapter?.ending_hook, chapter?.hook),
    raw_payload: chapter || {},
  }
}

async function materializeProjectSeed(activeWorkspace: string, project: any, seed: any) {
  const raw = getSeedRaw(seed)
  const master = parseNestedSeed(raw.master_outline || seed.master_outline)
  const volumeOutlines = getSeedVolumeOutlines(seed)
  const chapterOutlines = getSeedChapterOutlines(seed).map(normalizeChapterSeed)
  const created: any = { worldbuilding: 0, characters: 0, outlines: 0, chapters: 0 }

  const world = parseNestedSeed(seed.worldbuilding)
  const worldSummary = firstSeedText(world.world_summary, world.history_secret, world.power_system, seed.core_premise, master.summary, project.synopsis)
  if (worldSummary) {
    await createNovelWorldbuilding(activeWorkspace, {
      project_id: project.id,
      world_summary: worldSummary,
      rules: asSeedArray(world.rules),
      systems: [
        world.power_system ? { name: '力量体系', content: world.power_system } : null,
        world.ancient_gods ? { name: '古神', content: world.ancient_gods } : null,
        world.outer_gods ? { name: '外神', content: world.outer_gods } : null,
      ].filter(Boolean),
      known_unknowns: asSeedArray(seed.open_questions),
      raw_payload: { ...world, source: 'project_seed' },
    })
    created.worldbuilding += 1
  }

  const characters = asSeedArray(seed.characters)
  for (const character of characters) {
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
      raw_payload: { ...character, source: 'project_seed' },
    })
    created.characters += 1
  }

  const masterOutline = await createNovelOutline(activeWorkspace, {
    project_id: project.id,
    outline_type: 'master',
    title: firstSeedText(master.title, seed.title, project.title, '全书主线'),
    summary: firstSeedText(master.summary, seed.synopsis, seed.core_premise, project.synopsis),
    hook: firstSeedText(master.hook, seed.logline, seed.main_conflict),
    target_length: project.length_target || '',
    raw_payload: { ...master, source: 'project_seed' },
  })
  created.outlines += 1

  for (const volume of volumeOutlines) {
    if (!volume?.title && !volume?.summary) continue
    await createNovelOutline(activeWorkspace, {
      project_id: project.id,
      outline_type: 'volume',
      parent_id: masterOutline.id,
      title: firstSeedText(volume.title, `分卷 ${created.outlines}`),
      summary: firstSeedText(volume.summary),
      hook: firstSeedText(volume.hook),
      target_length: volume.chapter_count ? `${volume.chapter_count}章` : '',
      raw_payload: { ...volume, source: 'project_seed' },
    })
    created.outlines += 1
  }

  for (const chapter of chapterOutlines) {
    if (!chapter.chapter_no) continue
    await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      chapter_summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      raw_payload: { ...chapter.raw_payload, source: 'project_seed' },
    })
    created.chapters += 1
  }

  const nextReferenceConfig = {
    ...(project.reference_config || {}),
    project_seed: {
      ...seed,
      materialized_at: new Date().toISOString(),
      materialized_counts: created,
    },
    writing_bible: {
      ...(seed.writing_bible || {}),
      updated_at: new Date().toISOString(),
    },
    commercial_positioning: project.reference_config?.commercial_positioning || {
      reader_promise: seed.logline || seed.synopsis || '',
      selling_points: asSeedArray(seed.commercial_tags),
      seed: true,
    },
    foreshadowing_plan: raw.foreshadowing_plan || seed.foreshadowing_plan || [],
    creation_pipeline: {
      mode: 'seed_auto_materialized',
      created,
      next_steps: seed.next_steps || [],
      updated_at: new Date().toISOString(),
    },
  }
  const updated = await updateNovelProject(activeWorkspace, project.id, {
    reference_config: nextReferenceConfig,
  } as any)
  await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'project_seed_materialize',
    step_name: 'create-project-from-seed',
    status: 'success',
    input_ref: JSON.stringify({ seed_title: seed.title || '', source: 'project_seed' }),
    output_ref: JSON.stringify({ created }),
  })
  return { created, project: updated }
}

async function createProjectFromSeed(activeWorkspace: string, seed: any, options: { title?: string; idea?: string } = {}) {
  const title = firstSeedText(options.title, seed.title, seed.logline, '未命名小说').slice(0, 64)
  const seedForProject = {
    ...seed,
    title,
    raw_idea: options.idea || seed.raw_idea || '',
    derived_at: seed.derived_at || new Date().toISOString(),
  }
  const project = await createNovelProject(activeWorkspace, {
    title,
    genre: seed.genre || '',
    sub_genres: asSeedArray(seed.sub_genres),
    length_target: seed.length_target || 'medium',
    target_audience: seed.target_audience || '',
    style_tags: asSeedArray(seed.style_tags),
    commercial_tags: asSeedArray(seed.commercial_tags),
    synopsis: seed.synopsis || seed.logline || seed.core_premise || '',
    status: 'draft',
    reference_config: {
      project_seed: seedForProject,
      writing_bible: seed.writing_bible || {},
      commercial_positioning: {
        reader_promise: seed.logline || seed.synopsis || '',
        selling_points: asSeedArray(seed.commercial_positioning?.selling_points).length
          ? asSeedArray(seed.commercial_positioning?.selling_points)
          : asSeedArray(seed.commercial_tags),
        seed: true,
      },
    },
  })
  const materialized = await materializeProjectSeed(activeWorkspace, project, seedForProject)
  return { project: materialized.project || project, seed: seedForProject, created: materialized.created }
}

export function registerNovelCoreRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/novel/projects', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json(await listNovelProjects(activeWorkspace))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const project = await createNovelProject(activeWorkspace, req.body)
      const seed = req.body?.reference_config?.project_seed
      if (seed && req.body?.auto_materialize_seed !== false) {
        const materialized = await materializeProjectSeed(activeWorkspace, project, seed)
        return res.json({ ...(materialized.project || project), seed_materialization: materialized.created })
      }
      res.json(project)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/project-seed/derive', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const idea = String(req.body?.idea || '').trim()
      const title = String(req.body?.title || '').trim()
      if (!idea && !title) return res.status(400).json({ error: 'title or idea is required' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const { seed, result } = await deriveProjectSeedWithModel(activeWorkspace, idea, modelId, title)
      if ((result as any).error || !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length) {
        return res.status(502).json({
          error: (result as any).error || '模型未返回有效项目种子',
          raw_preview: String((result as any).content || '').slice(0, 3000),
        })
      }
      res.json({ ok: true, seed, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/auto-create', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const title = String(req.body?.title || '').trim()
      const idea = String(req.body?.idea || '').trim()
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      let seed = req.body?.seed ? normalizeProjectSeedPayload(req.body.seed, idea) : null
      let result: any = null
      if (!seed || !Object.keys(seed).length || (!seed.title && !seed.synopsis && !seed.logline)) {
        if (!title && !idea) return res.status(400).json({ error: 'title or idea is required' })
        if (!modelId) return res.status(400).json({ error: 'model_id is required when seed is not provided' })
        const derived = await deriveProjectSeedWithModel(activeWorkspace, idea, modelId, title)
        seed = derived.seed
        result = derived.result
      }
      if ((result as any)?.error || !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length) {
        return res.status(502).json({
          error: (result as any)?.error || '模型未返回有效项目种子',
          raw_preview: String((result as any)?.content || '').slice(0, 3000),
        })
      }
      const created = await createProjectFromSeed(activeWorkspace, seed, { title, idea })
      res.json({
        ok: true,
        project: created.project,
        seed: created.seed,
        seed_materialization: created.created,
        result,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const ok = await deleteNovelProject(activeWorkspace, Number(req.params.id))
      if (!ok) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json(project)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), req.body)
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json(project.reference_config || { references: [], notes: '' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/reference-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), { reference_config: req.body || {} } as any)
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated.reference_config || { references: [], notes: '' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reference-preview', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const baseProject = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!baseProject) return res.status(404).json({ error: 'project not found' })
      const project = { ...baseProject, reference_config: req.body?.reference_config || baseProject.reference_config || {} }
      res.json(await previewNovelKnowledgeInjection(project, String(req.body?.task_type || '大纲生成')))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/worldbuilding', async (req, res) => {
    try { res.json(await listNovelWorldbuilding(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/projects/:id/worldbuilding', async (req, res) => {
    try { res.json(await createNovelWorldbuilding(getWorkspace(), { ...req.body, project_id: Number(req.params.id) })) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/worldbuilding/:worldbuildingId', async (req, res) => {
    try {
      const updated = await updateNovelWorldbuilding(getWorkspace(), Number(req.params.worldbuildingId), req.body)
      if (!updated) return res.status(404).json({ error: 'worldbuilding not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/characters', async (req, res) => {
    try { res.json(await listNovelCharacters(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/characters', async (req, res) => {
    try { res.json(await createNovelCharacter(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/characters/:characterId', async (req, res) => {
    try {
      const updated = await updateNovelCharacter(getWorkspace(), Number(req.params.characterId), req.body)
      if (!updated) return res.status(404).json({ error: 'character not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/outlines', async (req, res) => {
    try { res.json(await listNovelOutlines(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/outlines', async (req, res) => {
    try { res.json(await createNovelOutline(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/outlines/:outlineId', async (req, res) => {
    try {
      const updated = await updateNovelOutline(getWorkspace(), Number(req.params.outlineId), req.body)
      if (!updated) return res.status(404).json({ error: 'outline not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.delete('/api/novel/outlines/:outlineId', async (req, res) => {
    try {
      const ok = await deleteNovelOutline(getWorkspace(), Number(req.params.outlineId))
      if (!ok) return res.status(404).json({ error: 'outline not found' })
      res.json({ ok: true })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/chapters', async (req, res) => {
    try { res.json(await listNovelChapters(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/chapters', async (req, res) => {
    try { res.json(await createNovelChapter(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.delete('/api/novel/chapters/:chapterId', async (req, res) => {
    try {
      const ok = await deleteNovelChapter(getWorkspace(), Number(req.params.chapterId))
      if (!ok) return res.status(404).json({ error: 'chapter not found' })
      res.json({ ok: true })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.get('/api/novel/chapters/:chapterId/versions', async (req, res) => {
    try { res.json(await listChapterVersions(getWorkspace(), Number(req.params.chapterId))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/chapters/:chapterId/rollback', async (req, res) => {
    try {
      const updated = await rollbackChapterVersion(getWorkspace(), Number(req.params.chapterId), Number(req.body.version_id))
      if (!updated) return res.status(404).json({ error: 'chapter or version not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/chapters/:chapterId', async (req, res) => {
    try {
      const { create_version, createVersion, version_source, versionSource, force_version, forceVersion, ...patch } = req.body || {}
      const updated = await updateNovelChapter(getWorkspace(), Number(req.params.chapterId), patch, {
        createVersion: parseOptionalBoolean(create_version ?? createVersion),
        versionSource: version_source || versionSource || 'manual_edit',
        forceVersion: parseOptionalBoolean(force_version ?? forceVersion),
      })
      if (!updated) return res.status(404).json({ error: 'chapter not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
