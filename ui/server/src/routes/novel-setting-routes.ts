export * from './novel-setting-helpers'
import type { Express } from 'express'
import {
  createNovelCharacter,
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
import { formatReviewIssueForStorage, getNovelPayload, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'
import { buildSettingRelationshipGraph } from './novel-setting-relationship-graph'

import type { NovelSettingRoutesContext } from './novel-setting-helpers'
import {
  STORYLINE_TYPES,
  SETTING_TYPES,
  settingJson,
  normalizeSettingInput,
  buildSettingAgentPrompt,
  buildSettingRelationshipRepairPrompt,
  normalizeSettingRelationshipRepairPayload,
  applySettingRelationshipRepairPatches,
  normalizeSettingAgentPayload,
  normalizeUsageInput,
  normalizeSettingUsagePayload,
  heuristicUsageSuggestions,
  seedSettingsFromLocalData,
  normalizeSettingConsistencyStateUpdatesPayload,
  buildPendingStateUpdates,
  applyPendingStateUpdates,
  applyDiscoveredAssetsToProject,
} from './novel-setting-helpers'

export function registerNovelSettingRoutes(app: Express, ctx: NovelSettingRoutesContext) {
  app.get('/api/novel/projects/:id/settings/relationship-graph', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [settings, characters, chapters, usage] = await Promise.all([
      listNovelSettingEntities(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelChapters(activeWorkspace, projectId),
      listNovelChapterSettingUsage(activeWorkspace, projectId),
    ])
    res.json(buildSettingRelationshipGraph({ settings, characters, chapters, usage }))
  })

  app.post('/api/novel/projects/:id/settings/relationship-repair/suggest', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [settings, characters, chapters, usage] = await Promise.all([
      listNovelSettingEntities(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelChapters(activeWorkspace, projectId),
      listNovelChapterSettingUsage(activeWorkspace, projectId),
    ])
    const graph = buildSettingRelationshipGraph({ settings, characters, chapters, usage })
    const diagnostics = graph.diagnostics.filter(item => item.type === 'isolated_key_asset')
    if (diagnostics.length === 0) return res.json({ ok: true, patches: [], diagnostics, graph_summary: graph.summary, total: 0 })
    const modelId = Number(req.body?.model_id || 0)
    if (!modelId) return res.status(400).json({ error: 'model_id required' })
    const prompt = buildSettingRelationshipRepairPrompt(project, settings, diagnostics, graph)
    const result = await executeNovelAgent('setting-agent', project, { task: prompt }, {
      activeWorkspace,
      modelId: String(modelId),
      maxTokens: 4500,
      temperature: 0.15,
      skipMemory: true,
    })
    const payload = getNovelPayload(result)
    const patches = normalizeSettingRelationshipRepairPayload(payload, settings)
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'setting_relationship_repair_suggest',
      status: patches.length ? 'ok' : 'warn',
      summary: `模型建议资产关系补丁 ${patches.length} 项`,
      issues: patches.map(item => `${item.source_name} → ${item.target_name}｜${item.patch_type}`),
      payload: JSON.stringify({ patches, diagnostics, graph_summary: graph.summary }),
    })
    res.json({ ok: true, patches, diagnostics, graph_summary: graph.summary, total: patches.length })
  })

  app.post('/api/novel/projects/:id/settings/relationship-repair/apply', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.params.id)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const patches = Array.isArray(req.body?.patches) ? req.body.patches : []
    const result = await applySettingRelationshipRepairPatches(activeWorkspace, projectId, patches)
    res.json(result)
  })

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
      const modelUsage = normalizeSettingUsagePayload(payload)
      if (modelUsage.length > 0) suggested = modelUsage
    }
    const apply = req.body?.apply !== false
    const records = apply
      ? await replaceNovelChapterSettingUsage(activeWorkspace, projectId, chapterId, suggested as any)
      : suggested
    res.json({ ok: true, applied: apply, usage: records, total: records.length })
  })

  app.post('/api/novel/chapters/:chapterId/storylines/suggest', async (req, res) => {
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
    const storylineSettings = settings.filter(item => STORYLINE_TYPES.includes(item.entity_type))
    let suggested = heuristicUsageSuggestions(chapter, storylineSettings).map(item => ({
      ...item,
      usage_type: item.usage_type === 'required' || item.usage_type === 'allowed' ? 'advance' : item.usage_type,
      required: item.usage_type !== 'pause',
      allowed: item.usage_type !== 'forbidden',
      forbidden: item.usage_type === 'forbidden',
    }))
    const useModel = Number(req.body?.model_id || 0) > 0 && req.body?.use_model !== false
    if (useModel && storylineSettings.length > 0) {
      const prompt = [
        '任务：为当前章节匹配剧情线推进关系。只输出 JSON，不要解释。',
        '你要决定本章哪些剧情线必推 advance、只埋线 plant、需要回收 payoff、暂时暂停 pause、禁止提前揭露 forbidden。',
        'usage_type 只能是 advance/plant/payoff/pause/forbidden；reveal_level 只能是 none/hint/partial/full。',
        '原则：长期主线方向不得随意改变；禁揭线不得提前泄露；每项 expected_state_change 必须写清本章预计推进结果。',
        JSON.stringify({ chapter, storylines: storylineSettings.slice(0, 180).map(item => ({ id: item.id, type: item.entity_type, name: item.name, summary: item.summary, visibility: item.visibility, constraints: item.constraints_json, state: item.state_json, payload: item.payload_json })) }, null, 2).slice(0, 18000),
        '输出字段：usage(array)，每项包含 entity_id, usage_type, required, allowed, forbidden, reveal_level, expected_state_change。',
      ].join('\n')
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: String(req.body.model_id), maxTokens: 3500, temperature: 0.2, skipMemory: true })
      const payload = parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
      const modelUsage = normalizeSettingUsagePayload(payload)
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
      const result = await executeNovelAgent('setting-agent', project, {
        task: buildSettingAgentPrompt(project, worldbuilding, characters, outlines, existing),
      }, { activeWorkspace, modelId: String(req.body.model_id), maxTokens: 7000, temperature: 0.25, skipMemory: true })
      modelSeeds = normalizeSettingAgentPayload(getNovelPayload(result), projectId)
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

  app.post('/api/novel/projects/:id/storylines/incubate', async (req, res) => {
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
    const useModel = req.body?.use_model !== false && Number(req.body?.model_id || 0) > 0
    let modelSeeds: any[] = []
    if (useModel) {
      const result = await executeNovelAgent('setting-agent', project, {
        task: buildSettingAgentPrompt(project, worldbuilding, characters, outlines, existing),
      }, { activeWorkspace, modelId: String(req.body.model_id), maxTokens: 7000, temperature: 0.25, skipMemory: true })
      modelSeeds = normalizeSettingAgentPayload(getNovelPayload(result), projectId).filter(item => STORYLINE_TYPES.includes(item.entity_type))
    }
    const outlineSeeds = outlines
      .filter(item => ['master', 'volume', 'chapter'].includes(String(item.outline_type || '')))
      .slice(0, 80)
      .map(item => normalizeSettingInput({
        project_id: projectId,
        entity_type: item.outline_type === 'master' ? 'mainline' : item.outline_type === 'volume' ? 'subplot' : 'foreshadowing_arc',
        name: String(item.title || item.hook || `剧情线${item.id || ''}`).trim(),
        summary: [item.summary, item.hook].filter(Boolean).join('；'),
        first_chapter_no: item.chapter_no || null,
        constraints_json: { advance_rule: '按大纲节奏推进，不提前跳过关键冲突。', forbidden_reveal: '不得提前揭露后续卷核心真相。' },
        state_json: { current_state: 'planned', next_advance_chapter: item.chapter_no || null },
        payload_json: { source: 'outline_storyline_seed', outline_id: item.id, priority: item.outline_type === 'master' ? 1 : 3 },
      }, projectId))
      .filter(item => item.name)
    const candidates = [...outlineSeeds, ...modelSeeds]
    const created: any[] = []
    const updated: any[] = []
    const seen = new Set(existingKeys)
    for (const seed of candidates) {
      const key = `${seed.entity_type}:${seed.name}`
      if (seen.has(key)) continue
      seen.add(key)
      created.push(await createNovelSettingEntity(activeWorkspace, seed as any))
    }
    res.json({ ok: true, created, updated, skipped_existing: existing.length, total: created.length + updated.length })
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
      settingJson({ setting_context: contextPackage.setting_context, settings, usage }, 9000),
      '【正文】',
      String(chapter.chapter_text || '').slice(0, 16000),
      '输出字段：passed, score, issues(array severity/type/setting_name/description/suggestion), required_state_updates(array entity_id/name/actual_state_change)。',
    ].join('\n')
    const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: req.body?.model_id ? String(req.body.model_id) : undefined, maxTokens: 3000, temperature: 0.15, skipMemory: true })
    const payload = parseJsonLikePayload((result as any).output || (result as any).content || '') || {}
    const stateUpdates = normalizeSettingConsistencyStateUpdatesPayload(payload)
    const pendingStateUpdates = buildPendingStateUpdates(stateUpdates, settings, usage, chapter)
    const shouldApply = req.body?.apply_updates === true
    const appliedStateUpdates = shouldApply
      ? await applyPendingStateUpdates(activeWorkspace, projectId, chapter, settings, usage, pendingStateUpdates)
      : []
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'setting_consistency',
      status: payload?.passed === false || Number(payload?.score || 100) < 78 ? 'warn' : 'ok',
      summary: `设定一致性评分 ${payload?.score ?? '-'}`,
      issues: Array.isArray(payload?.issues) ? payload.issues.map(formatReviewIssueForStorage) : [],
      payload: JSON.stringify({ chapter_id: chapterId, pending_state_updates: pendingStateUpdates, applied_state_updates: appliedStateUpdates, auto_applied: shouldApply, ...payload }),
    })
    res.json({ ok: true, report: payload, pending_state_updates: pendingStateUpdates, applied_state_updates: appliedStateUpdates, auto_applied: shouldApply })
  })

  app.post('/api/novel/chapters/:chapterId/settings-state-updates/apply', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const [chapters, settings, usage] = await Promise.all([
      listNovelChapters(activeWorkspace, projectId),
      listNovelSettingEntities(activeWorkspace, projectId),
      listNovelChapterSettingUsage(activeWorkspace, projectId, chapterId),
    ])
    const chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) return res.status(404).json({ error: 'chapter not found' })
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : []
    const appliedStateUpdates = await applyPendingStateUpdates(activeWorkspace, projectId, chapter, settings, usage, updates)
    res.json({ ok: true, applied_state_updates: appliedStateUpdates, total: appliedStateUpdates.length })
  })

  app.post('/api/novel/chapters/:chapterId/discovered-assets/apply', async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = Number(req.body?.project_id || req.query.project_id || 0)
    const chapterId = Number(req.params.chapterId)
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })
    const chapters = await listNovelChapters(activeWorkspace, projectId)
    const chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) return res.status(404).json({ error: 'chapter not found' })
    const assets = Array.isArray(req.body?.assets) ? req.body.assets : []
    const result = await applyDiscoveredAssetsToProject(activeWorkspace, projectId, chapter, assets)
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'asset_intake_apply',
      status: 'ok',
      summary: `已确认新资产 ${result.created_settings.length} 项，合并 ${result.merged_assets.length} 项，过场 ${result.cameo_assets.length} 项`,
      issues: [
        ...result.created_settings.map((item: any) => `${item.entity_type}：${item.name}`),
        ...result.merged_assets.map((item: any) => `合并：${item.source_name} → ${item.target_name}`),
        ...result.cameo_assets.map((item: any) => `过场：${item.entity_type}：${item.name}`),
        ...result.skipped_existing.map((item: any) => `已存在：${item.entity_type}：${item.name}`),
      ],
      payload: JSON.stringify({ chapter_id: chapterId, chapter_no: chapter.chapter_no, ...result }),
    })
    res.json({ ok: true, ...result })
  })
}
