import type { Express } from 'express'
import {
  createNovelReview,
  createNovelSettingEntity,
  deleteNovelSettingEntity,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapterSettingUsage,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { parseJsonLikePayload } from './novel-route-utils'

type NovelSettingRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews?: any[]) => Promise<any>
}

const SETTING_TYPES = ['character', 'realm', 'ability', 'item', 'boss', 'rule', 'faction', 'location', 'foreshadowing', 'timeline']

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  return parseJsonLikePayload(String(value)) || fallback
}

function normalizeSettingInput(body: any, projectId: number) {
  return {
    project_id: projectId,
    entity_type: SETTING_TYPES.includes(String(body.entity_type || body.type || '')) ? String(body.entity_type || body.type) : 'rule',
    name: String(body.name || '').trim() || '未命名设定',
    summary: String(body.summary || ''),
    status: String(body.status || 'active'),
    visibility: String(body.visibility || 'public'),
    first_chapter_no: body.first_chapter_no === undefined || body.first_chapter_no === '' ? null : Number(body.first_chapter_no),
    last_chapter_no: body.last_chapter_no === undefined || body.last_chapter_no === '' ? null : Number(body.last_chapter_no),
    related_character_ids: Array.isArray(body.related_character_ids) ? body.related_character_ids.map(Number).filter(Boolean) : [],
    related_chapter_ids: Array.isArray(body.related_chapter_ids) ? body.related_chapter_ids.map(Number).filter(Boolean) : [],
    related_entity_ids: Array.isArray(body.related_entity_ids) ? body.related_entity_ids.map(Number).filter(Boolean) : [],
    constraints_json: parseJsonField(body.constraints_json ?? body.constraints, {}),
    state_json: parseJsonField(body.state_json ?? body.state, {}),
    payload_json: parseJsonField(body.payload_json ?? body.payload, {}),
  }
}

function normalizeUsageInput(item: any) {
  const usageType = String(item.usage_type || (item.forbidden ? 'forbidden' : item.required ? 'required' : 'allowed'))
  return {
    entity_id: Number(item.entity_id || item.id || 0),
    usage_type: usageType,
    required: Boolean(item.required || usageType === 'required'),
    allowed: item.allowed === undefined ? usageType !== 'forbidden' : Boolean(item.allowed),
    forbidden: Boolean(item.forbidden || usageType === 'forbidden'),
    reveal_level: String(item.reveal_level || 'none'),
    expected_state_change: parseJsonField(item.expected_state_change, {}),
    actual_state_change: parseJsonField(item.actual_state_change, {}),
  }
}

function settingText(setting: any) {
  return [
    setting.name,
    setting.summary,
    JSON.stringify(setting.constraints_json || {}),
    JSON.stringify(setting.state_json || {}),
  ].join(' ')
}

function heuristicUsageSuggestions(chapter: any, settings: any[]) {
  const chapterText = [
    chapter.title,
    chapter.chapter_goal,
    chapter.chapter_summary,
    chapter.conflict,
    chapter.ending_hook,
    JSON.stringify(chapter.raw_payload || {}),
  ].join(' ')
  const scored = settings.map(setting => {
    const text = settingText(setting)
    const name = String(setting.name || '')
    let score = 0
    if (name && chapterText.includes(name)) score += 40
    for (const token of text.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
      if (chapterText.includes(token)) score += 2
    }
    if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
    if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
    return { setting, score }
  }).filter(item => item.score >= 6).sort((a, b) => b.score - a.score)
  return scored.slice(0, 12).map(({ setting, score }, index) => ({
    entity_id: setting.id,
    usage_type: index < 4 || score >= 30 ? 'required' : 'allowed',
    required: index < 4 || score >= 30,
    allowed: true,
    forbidden: false,
    reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
    expected_state_change: { reason: `自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
  }))
}

function seedSettingsFromLocalData(worldbuilding: any[], characters: any[], outlines: any[], projectId: number) {
  const firstWorld = worldbuilding[0] || {}
  const seeds: any[] = []
  for (const char of characters) {
    seeds.push({
      project_id: projectId,
      entity_type: char.role_type === 'antagonist' || /反派|boss|敌/.test(String(char.role || char.role_type || '')) ? 'boss' : 'character',
      name: char.name,
      summary: [char.role || char.role_type, char.motivation, char.goal].filter(Boolean).join('；'),
      constraints_json: { knowledge_scope: char.current_state?.knowledge_scope || [], information_boundaries: char.current_state?.information_boundaries || [] },
      state_json: { ...(char.current_state || {}), appearance: char.appearance || '', abilities: char.abilities || [], relationships: char.relationships || [] },
      related_character_ids: [char.id],
      payload_json: { source: 'character_card', character_id: char.id },
    })
    for (const ability of Array.isArray(char.abilities) ? char.abilities : []) {
      const abilityName = typeof ability === 'string' ? ability : ability?.name
      if (!abilityName) continue
      seeds.push({
        project_id: projectId,
        entity_type: 'ability',
        name: String(abilityName),
        summary: typeof ability === 'string' ? ability : String(ability?.summary || ability?.description || ''),
        constraints_json: typeof ability === 'object' ? { cost: ability.cost, limit: ability.limit, condition: ability.condition } : {},
        state_json: { owner: char.name, status: 'known' },
        related_character_ids: [char.id],
        payload_json: { source: 'character_ability', raw: ability },
      })
    }
  }
  for (const rule of Array.isArray(firstWorld.rules) ? firstWorld.rules : []) {
    const name = typeof rule === 'string' ? rule.slice(0, 30) : String(rule?.name || rule?.title || '世界规则')
    seeds.push({ project_id: projectId, entity_type: 'rule', name, summary: typeof rule === 'string' ? rule : String(rule?.summary || rule?.description || ''), constraints_json: typeof rule === 'object' ? rule : {}, state_json: {}, payload_json: { source: 'worldbuilding_rule', raw: rule } })
  }
  for (const item of Array.isArray(firstWorld.items) ? firstWorld.items : []) {
    const name = typeof item === 'string' ? item.slice(0, 30) : String(item?.name || item?.title || '关键物品')
    seeds.push({ project_id: projectId, entity_type: 'item', name, summary: typeof item === 'string' ? item : String(item?.summary || item?.description || ''), constraints_json: typeof item === 'object' ? { owner_rule: item.owner_rule, limitation: item.limitation } : {}, state_json: typeof item === 'object' ? { owner: item.owner, status: item.status } : {}, payload_json: { source: 'worldbuilding_item', raw: item } })
  }
  for (const faction of Array.isArray(firstWorld.factions) ? firstWorld.factions : []) {
    const name = typeof faction === 'string' ? faction.slice(0, 30) : String(faction?.name || faction?.title || '势力')
    seeds.push({ project_id: projectId, entity_type: 'faction', name, summary: typeof faction === 'string' ? faction : String(faction?.summary || faction?.description || ''), constraints_json: typeof faction === 'object' ? faction : {}, state_json: {}, payload_json: { source: 'worldbuilding_faction', raw: faction } })
  }
  for (const location of Array.isArray(firstWorld.locations) ? firstWorld.locations : []) {
    const name = typeof location === 'string' ? location.slice(0, 30) : String(location?.name || location?.title || '地点')
    seeds.push({ project_id: projectId, entity_type: 'location', name, summary: typeof location === 'string' ? location : String(location?.summary || location?.description || ''), constraints_json: typeof location === 'object' ? location : {}, state_json: {}, payload_json: { source: 'worldbuilding_location', raw: location } })
  }
  for (const outline of outlines.filter(item => item.outline_type === 'chapter').slice(0, 120)) {
    if (outline.hook) seeds.push({ project_id: projectId, entity_type: 'foreshadowing', name: `${outline.title}钩子`, summary: outline.hook, related_chapter_ids: [], payload_json: { source: 'outline_hook', outline_id: outline.id } })
  }
  return seeds
}

export function registerNovelSettingRoutes(app: Express, ctx: NovelSettingRoutesContext) {
  app.get('/api/novel/projects/:id/settings', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const items = await listNovelSettingEntities(activeWorkspace, projectId, req.query.type ? String(req.query.type) : undefined)
    const grouped = items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.entity_type || 'rule'
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
    res.json({ items, grouped, types: SETTING_TYPES })
  })

  app.post('/api/novel/projects/:id/settings', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const record = await createNovelSettingEntity(activeWorkspace, normalizeSettingInput(req.body || {}, projectId) as any)
    res.json(record)
  })

  app.put('/api/novel/settings/:settingId', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const id = Number(req.params.settingId)
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const updated = await updateNovelSettingEntity(activeWorkspace, id, normalizeSettingInput(req.body || {}, projectId) as any)
    if (!updated) return res.status(404).json({ error: 'setting not found' })
    res.json(updated)
  })

  app.delete('/api/novel/settings/:settingId', async (req, res) => {
    const ok = await deleteNovelSettingEntity(ctx.getWorkspace(), Number(req.params.settingId))
    res.json({ ok })
  })

  app.get('/api/novel/chapters/:chapterId/settings-usage', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const [settings, usage] = await Promise.all([
      listNovelSettingEntities(activeWorkspace, projectId),
      listNovelChapterSettingUsage(activeWorkspace, projectId, chapterId),
    ])
    res.json({ settings, usage })
  })

  app.put('/api/novel/chapters/:chapterId/settings-usage', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const usage = Array.isArray(req.body?.usage) ? req.body.usage.map(normalizeUsageInput) : []
    const records = await replaceNovelChapterSettingUsage(activeWorkspace, projectId, chapterId, usage as any)
    res.json({ ok: true, usage: records })
  })

  app.post('/api/novel/chapters/:chapterId/settings-usage/suggest', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [chapters, settings] = await Promise.all([
      listNovelChapters(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId),
    ])
    const chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) return res.status(404).json({ error: 'chapter not found' })
    let suggested = heuristicUsageSuggestions(chapter, settings)
    const useModel = Number(req.body?.model_id || 0) > 0 && req.body?.use_model !== false
    if (useModel && settings.length > 0) {
      const prompt = [
        '任务：为当前章节自动匹配设定工坊调用。只输出 JSON，不要解释。',
        '你要决定本章哪些设定必须使用、哪些允许使用、哪些禁止揭露，并给出揭示级别和预期状态变化。',
        'usage_type 只能是 required/allowed/forbidden；reveal_level 只能是 none/hint/partial/full。',
        '原则：本章目标、冲突、章末钩子中明确需要的设定标 required；剧透、隐藏真相或不该提前暴露的设定标 forbidden 或 hint；无关设定不要输出。',
        JSON.stringify({ chapter, settings: settings.slice(0, 180).map(item => ({ id: item.id, type: item.entity_type, name: item.name, summary: item.summary, visibility: item.visibility, constraints: item.constraints_json, state: item.state_json })) }, null, 2).slice(0, 18000),
        '输出字段：usage(array)，每项包含 entity_id, usage_type, required, allowed, forbidden, reveal_level, expected_state_change。',
      ].join('\n')
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: String(req.body.model_id), maxTokens: 3500, temperature: 0.2, skipMemory: true })
      const payload = parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
      const modelUsage = (Array.isArray(payload?.usage) ? payload.usage : []).map(normalizeUsageInput).filter((item: any) => item.entity_id)
      if (modelUsage.length > 0) suggested = modelUsage
    }
    const apply = req.body?.apply !== false
    const records = apply
      ? await replaceNovelChapterSettingUsage(activeWorkspace, projectId, chapterId, suggested as any)
      : suggested
    res.json({ ok: true, applied: apply, usage: records, total: records.length })
  })

  app.post('/api/novel/projects/:id/settings/incubate-from-project', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [worldbuilding, characters, outlines, existing] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId),
    ])
    const existingKeys = new Set(existing.map(item => `${item.entity_type}:${item.name}`))
    const localSeeds = seedSettingsFromLocalData(worldbuilding, characters, outlines, projectId).filter(item => !existingKeys.has(`${item.entity_type}:${item.name}`))
    const useModel = req.body?.use_model !== false && Number(req.body?.model_id || 0) > 0
    let modelSeeds: any[] = []
    if (useModel) {
      const prompt = [
        '任务：根据小说项目资料，提炼“设定工坊”实体。只输出 JSON，不要解释。',
        '实体类型只能是 character/realm/ability/item/boss/rule/faction/location/foreshadowing/timeline。',
        '每个实体包含 entity_type,name,summary,constraints_json,state_json,payload_json。',
        '要求记录精细控制信息：能力代价/限制、物品归属、境界上限、Boss行动逻辑、角色认知边界、伏笔触发与回收、时间线约束。',
        JSON.stringify({ project, worldbuilding, characters, outlines: outlines.slice(0, 80) }, null, 2).slice(0, 16000),
      ].join('\n')
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: String(req.body.model_id), maxTokens: 5000, temperature: 0.25, skipMemory: true })
      const payload = parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
      modelSeeds = (Array.isArray(payload?.settings) ? payload.settings : Array.isArray(payload?.entities) ? payload.entities : []).map((item: any) => normalizeSettingInput(item, projectId))
    }
    const candidates = [...localSeeds, ...modelSeeds].filter(item => item.name)
    const created: any[] = []
    const seen = new Set(existingKeys)
    for (const seed of candidates) {
      const key = `${seed.entity_type}:${seed.name}`
      if (seen.has(key)) continue
      seen.add(key)
      created.push(await createNovelSettingEntity(activeWorkspace, seed as any))
    }
    res.json({ ok: true, created, skipped_existing: existing.length, total: created.length })
  })

  app.post('/api/novel/chapters/:chapterId/settings-consistency-check', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [chapters, worldbuilding, characters, outlines, settings, usage] = await Promise.all([
      listNovelChapters(activeWorkspace, projectId),
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId),
      listNovelChapterSettingUsage(activeWorkspace, projectId, chapterId),
    ])
    const chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) return res.status(404).json({ error: 'chapter not found' })
    const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, [])
    const prompt = [
      '任务：检查章节正文是否违反设定工坊约束。只输出 JSON。',
      '检查项：境界/战力矛盾、能力非法使用、物品归属或状态错误、Boss行动逻辑不一致、禁揭设定泄漏、规则触发没有代价、角色知道了不该知道的信息、伏笔误用、预期状态变化未发生。',
      JSON.stringify({ setting_context: contextPackage.setting_context, settings, usage }, null, 2).slice(0, 9000),
      '【正文】',
      String(chapter.chapter_text || '').slice(0, 16000),
      '输出字段：passed, score, issues(array severity/type/setting_name/description/suggestion), required_state_updates(array entity_id/name/actual_state_change)。',
    ].join('\n')
    const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: req.body?.model_id ? String(req.body.model_id) : undefined, maxTokens: 3000, temperature: 0.15, skipMemory: true })
    const payload = parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
    const stateUpdates = Array.isArray(payload?.required_state_updates) ? payload.required_state_updates : []
    const appliedStateUpdates: any[] = []
    if (req.body?.apply_updates !== false && stateUpdates.length > 0) {
      for (const update of stateUpdates) {
        const entityId = Number(update?.entity_id || 0)
        const name = String(update?.name || '').trim()
        const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name))
        if (!entity) continue
        const actual = parseJsonField(update.actual_state_change || update.state_delta, {})
        const updated = await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(actual || {}),
            last_checked_chapter_id: chapterId,
            last_checked_chapter_no: chapter.chapter_no,
          },
        } as any)
        const matchedUsage = usage.find(item => item.entity_id === entity.id)
        if (matchedUsage) {
          await updateNovelChapterSettingUsage(activeWorkspace, matchedUsage.id, {
            actual_state_change: {
              ...(matchedUsage.actual_state_change || {}),
              ...(actual || {}),
            },
          } as any)
        }
        appliedStateUpdates.push({ entity_id: entity.id, name: entity.name, actual_state_change: actual, updated: Boolean(updated) })
      }
    }
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'setting_consistency',
      status: payload?.passed === false || Number(payload?.score || 100) < 78 ? 'warn' : 'ok',
      summary: `设定一致性评分 ${payload?.score ?? '-'}`,
      issues: Array.isArray(payload?.issues) ? payload.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
      payload: JSON.stringify({ chapter_id: chapterId, applied_state_updates: appliedStateUpdates, ...payload }),
    })
    res.json({ ok: true, report: payload, applied_state_updates: appliedStateUpdates })
  })
}
