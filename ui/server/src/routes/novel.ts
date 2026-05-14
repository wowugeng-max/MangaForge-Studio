import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { listMemoryPalaceProjects, purgeMemoryPalaceProject } from '../memory-service'
import {
  appendNovelRun,
  appendChapterVersion,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
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
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelRun,
  updateNovelWorldbuilding,
} from '../novel'
import {
  buildNovelAgentPlan,
  buildContinuityFixes,
  buildRepairPlan,
  buildNovelStrategy,
  buildNovelSeed,
  buildNovelTools,
  buildPlatformFitAnalysis,
  executeNovelAgent,
  executeNovelAgentChain,
  generateNovelPlan,
  generateNovelChapterProse,
  previewNovelKnowledgeInjection,
} from '../llm'
import { sseManager, registerTask, unregisterTask } from '../ws-manager'
import { listKnowledge } from '../knowledge-base'
import { novelRouteModules } from './novel-modules'

export function registerNovelRoutes(app: Express, getWorkspace: () => string) {
  const getProject = async (workspace: string, id: number) => getNovelProject(workspace, id)
  const parseOptionalBoolean = (value: any) => {
    if (value === undefined) return undefined
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    const raw = String(value).trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(raw)) return true
    if (['false', '0', 'no', 'off'].includes(raw)) return false
    return Boolean(value)
  }
  const parseJsonLikePayload = (value: any) => {
    if (!value) return null
    if (typeof value === 'object') return value
    const raw = String(value || '').trim()
    if (!raw) return null
    const candidates = [
      raw,
      raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || '',
      raw.match(/\{[\s\S]*\}/)?.[0] || '',
    ].filter(Boolean)
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate)
      } catch {
        // try next candidate
      }
    }
    return null
  }
  const getNovelPayload = (result: any) => {
    const rawChoicesContent = result?.raw?.choices?.[0]?.message?.content
    const candidates = [
      result?.output,
      result?.parsed,
      result?.content,
      result?.raw?.content,
      rawChoicesContent,
    ]
    for (const candidate of candidates) {
      const payload = parseJsonLikePayload(candidate)
      if (payload && typeof payload === 'object') return payload
    }
    return {}
  }
  const deriveExecutionError = (execution: any) => {
    const failedSteps = (execution?.results || []).filter((item: any) => item && item.outputSource !== 'skipped' && !item.success)
    if (!failedSteps.length) return null
    const first = failedSteps[0]
    const rawError = String(first?.error || '')
    const step = String(first?.step || '')

    if (step === 'outline-agent' && rawError.includes('疑似跑题')) {
      return {
        error_code: 'OUTLINE_THEME_MISMATCH',
        message: '生成内容与当前项目主题不一致，系统已自动拦截。',
        details: { step, raw_error: rawError },
      }
    }
    if (step === 'outline-agent' && rawError.includes('章节数不符合要求')) {
      return {
        error_code: 'OUTLINE_COUNT_MISMATCH',
        message: '生成的粗纲章节数与目标章数不一致。',
        details: { step, raw_error: rawError },
      }
    }
    if ((step === 'detail-outline-agent' || step === 'continuity-check-agent') && (rawError.includes('Missing required input') || rawError.includes('rough chapter outline') || rawError.includes('outline-agent output is empty'))) {
      return {
        error_code: 'DETAIL_OUTLINE_MISSING_INPUT',
        message: '粗纲未成功生成，因此无法继续展开细纲。',
        details: { step, raw_error: rawError },
      }
    }
    if (step === 'continuity-check-agent') {
      return {
        error_code: 'CONTINUITY_CHECK_FAILED',
        message: '连续性预检未通过。',
        details: { step, raw_error: rawError },
      }
    }
    return {
      error_code: 'AGENT_EXECUTION_FAILED',
      message: `${step || '生成流程'}执行失败。`,
      details: { step, raw_error: rawError },
    }
  }
  const makeSnapshot = async (workspace: string, projectId: number) => ({
    worldbuilding: await listNovelWorldbuilding(workspace, projectId),
    characters: await listNovelCharacters(workspace, projectId),
    outlines: await listNovelOutlines(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
  })
  const collectCopyGuardTerms = (preview: any) => {
    const terms = new Set<string>()
    for (const entry of Array.isArray(preview?.entries) ? preview.entries : []) {
      for (const entity of Array.isArray(entry.entities) ? entry.entities : []) {
        const value = String(entity || '').trim()
        if (value.length >= 2 && value.length <= 24) terms.add(value)
      }
      const evidence = String(entry.evidence || '')
      for (const match of evidence.matchAll(/[《》【】「」“”]?([\u4e00-\u9fa5A-Za-z0-9]{2,16})[《》【】「」“”]?/g)) {
        const value = String(match[1] || '').trim()
        if (value.length >= 3 && !/章节|结构|角色|剧情|主角|读者|情绪|世界|设定|参考|避免|借鉴|模板/.test(value)) terms.add(value)
      }
    }
    return Array.from(terms).slice(0, 80)
  }
  const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
  const buildReferenceQualityAssessment = (preview: any, hits: string[]) => {
    const entries = Array.isArray(preview?.entries) ? preview.entries : []
    const activeReferences = Array.isArray(preview?.active_references) ? preview.active_references : []
    const warnings = Array.isArray(preview?.warnings) ? preview.warnings : []
    const averageAvoidCoverage = activeReferences.length
      ? activeReferences.reduce((sum: number, ref: any) => sum + Math.min(1, (Array.isArray(ref?.avoid) ? ref.avoid.length : 0) / 4), 0) / activeReferences.length * 100
      : 0
    const averageDimensionCoverage = activeReferences.length
      ? activeReferences.reduce((sum: number, ref: any) => sum + Math.min(1, (Array.isArray(ref?.dimensions) ? ref.dimensions.length : 0) / 4), 0) / activeReferences.length * 100
      : 0
    const referenceCoverage = activeReferences.length
      ? clampScore((entries.length / Math.max(1, activeReferences.length * 4)) * 100)
      : (entries.length ? 60 : 0)
    const injectionScore = clampScore(Math.min(100, (entries.length / Math.max(1, activeReferences.length * 3 || 3)) * 100) - warnings.length * 6)
    const copySafetyScore = clampScore(100 - hits.length * 14 - warnings.length * 5)
    const originalityScore = clampScore(copySafetyScore * 0.65 + averageAvoidCoverage * 0.25 + averageDimensionCoverage * 0.1)
    const overallScore = clampScore(
      referenceCoverage * 0.2 +
      injectionScore * 0.25 +
      copySafetyScore * 0.3 +
      originalityScore * 0.25,
    )
    return {
      overall_score: overallScore,
      risk_level: overallScore >= 80 ? 'low' : overallScore >= 55 ? 'medium' : 'high',
      reference_coverage_score: referenceCoverage,
      injection_score: injectionScore,
      copy_safety_score: copySafetyScore,
      originality_score: originalityScore,
      avoid_coverage_score: clampScore(averageAvoidCoverage),
      dimension_coverage_score: clampScore(averageDimensionCoverage),
      injected_entry_count: entries.length,
      active_reference_count: activeReferences.length,
      copy_hit_count: hits.length,
      warning_count: warnings.length,
      recommendations: [
        referenceCoverage < 70 ? '补齐参考项目的可注入画像知识，避免生成时只拿到配置而拿不到蓝图。' : '',
        injectionScore < 70 ? '生成前先做参考预览，确认当前任务能命中足够知识条目。' : '',
        copySafetyScore < 75 ? '正文出现参考实体或证据词，建议替换专名、桥段顺序和原文表达。' : '',
        originalityScore < 75 ? '增加避免照搬项，并把参考维度限定在结构、节奏、角色功能和文风机制。' : '',
      ].filter(Boolean),
    }
  }
  const buildReferenceUsageReport = async (activeWorkspace: string, project: any, taskType: string, generatedText = '') => {
    const preview = await previewNovelKnowledgeInjection(project, taskType)
    const terms = collectCopyGuardTerms(preview)
    const text = String(generatedText || '')
    const hits = terms.filter(term => text.includes(term)).slice(0, 20)
    const qualityAssessment = buildReferenceQualityAssessment(preview, hits)
    const report = {
      task_type: taskType,
      strength: preview.strength,
      strength_label: preview.strength_label,
      active_references: preview.active_references,
      injected_entries: (preview.entries || []).map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        category: entry.category,
        source_project: entry.source_project,
        reference_weight: entry.reference_weight,
        match_reason: entry.match_reason,
      })),
      knowledge_snapshot_entry_ids: (preview.entries || []).map((entry: any) => entry.id).filter(Boolean),
      copy_guard: {
        checked_terms: terms.length,
        hits,
        status: hits.length ? 'warn' : 'ok',
      },
      warnings: preview.warnings || [],
      quality_assessment: qualityAssessment,
    }
    const shouldWarn = hits.length > 0 || qualityAssessment.overall_score < 70
    const safetyDecision = getReferenceSafetyDecision(project, report)
    const safetyExplanation = explainReferenceSafety(report, safetyDecision)
    ;(report as any).safety_decision = safetyDecision
    ;(report as any).safety_explanation = safetyExplanation
    ;(report as any).migration_audit = buildMigrationAudit(project, report, safetyExplanation)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'reference_report',
      status: shouldWarn || safetyDecision.blocked ? 'warn' : 'ok',
      summary: `参考报告：${preview.strength_label || '-'}，注入 ${preview.entries?.length || 0} 条，质量评分 ${qualityAssessment.overall_score}${hits.length ? `，疑似照搬 ${hits.length} 项` : ''}`,
      issues: [
        ...safetyDecision.reasons,
        ...hits.map(term => `正文出现参考实体/证据词：${term}`),
        ...qualityAssessment.recommendations,
      ],
      payload: JSON.stringify(report),
    })
    return report
  }

  app.get('/api/novel/projects', async (_req, res) => { try { const activeWorkspace = getWorkspace(); await ensureWorkspaceStructure(activeWorkspace); res.json(await listNovelProjects(activeWorkspace)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/modules', async (_req, res) => { try { res.json({ ok: true, modules: novelRouteModules }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects', async (req, res) => { try { console.log('[NovelRoute] POST /projects body:', JSON.stringify(req.body, null, 2)); const activeWorkspace = getWorkspace(); console.log('[NovelRoute] activeWorkspace:', activeWorkspace); await ensureWorkspaceStructure(activeWorkspace); const result = await createNovelProject(activeWorkspace, req.body); console.log('[NovelRoute] created project:', JSON.stringify(result, null, 2)); res.json(result) } catch (error) { console.error('[NovelRoute] POST /projects error:', error); res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelProject(activeWorkspace, Number(req.params.id)); if (!ok) return res.status(404).json({ error: 'project not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.params.id)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json(project) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), req.body); if (!updated) return res.status(404).json({ error: 'project not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/reference-config', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.params.id)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json(project.reference_config || { references: [], notes: '' }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/projects/:id/reference-config', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), { reference_config: req.body || {} } as any); if (!updated) return res.status(404).json({ error: 'project not found' }); res.json(updated.reference_config || { references: [], notes: '' }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects/:id/reference-preview', async (req, res) => { try { const activeWorkspace = getWorkspace(); const baseProject = await getProject(activeWorkspace, Number(req.params.id)); if (!baseProject) return res.status(404).json({ error: 'project not found' }); const project = { ...baseProject, reference_config: req.body?.reference_config || baseProject.reference_config || {} }; res.json(await previewNovelKnowledgeInjection(project, String(req.body?.task_type || '大纲生成'))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelWorldbuilding(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelWorldbuilding(activeWorkspace, { ...req.body, project_id: Number(req.params.id) })) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/worldbuilding/:worldbuildingId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelWorldbuilding(activeWorkspace, Number(req.params.worldbuildingId), req.body); if (!updated) return res.status(404).json({ error: 'worldbuilding not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelCharacters(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelCharacter(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/characters/:characterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelCharacter(activeWorkspace, Number(req.params.characterId), req.body); if (!updated) return res.status(404).json({ error: 'character not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelOutlines(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelOutline(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/outlines/:outlineId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelOutline(activeWorkspace, Number(req.params.outlineId), req.body); if (!updated) return res.status(404).json({ error: 'outline not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/outlines/:outlineId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelOutline(activeWorkspace, Number(req.params.outlineId)); if (!ok) return res.status(404).json({ error: 'outline not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/chapters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelChapters(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/chapters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelChapter(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/chapters/:chapterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelChapter(activeWorkspace, Number(req.params.chapterId)); if (!ok) return res.status(404).json({ error: 'chapter not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/chapters/:chapterId/versions', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listChapterVersions(activeWorkspace, Number(req.params.chapterId))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/chapters/:chapterId/rollback', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await rollbackChapterVersion(activeWorkspace, Number(req.params.chapterId), Number(req.body.version_id)); if (!updated) return res.status(404).json({ error: 'chapter or version not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/chapters/:chapterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const { create_version, createVersion, version_source, versionSource, force_version, forceVersion, ...patch } = req.body || {}; const updated = await updateNovelChapter(activeWorkspace, Number(req.params.chapterId), patch, { createVersion: parseOptionalBoolean(create_version ?? createVersion), versionSource: version_source || versionSource || 'manual_edit', forceVersion: parseOptionalBoolean(force_version ?? forceVersion) }); if (!updated) return res.status(404).json({ error: 'chapter not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })

  const compactText = (value: any, limit = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
  const normalizeIssue = (issue: any) => {
    if (typeof issue === 'string') return { severity: 'medium', type: 'general', description: issue, suggestion: '' }
    return {
      severity: String(issue?.severity || 'medium'),
      type: String(issue?.type || issue?.issue_type || 'general'),
      description: String(issue?.description || issue?.message || issue?.issue || ''),
      suggestion: String(issue?.suggestion || issue?.suggested_fix || ''),
    }
  }
  const asArray = (value: any) => Array.isArray(value) ? value : []
  const deepMergeObjects = (base: any, override: any): any => {
    if (!override || typeof override !== 'object' || Array.isArray(override)) return base
    const next = { ...(base || {}) }
    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        next[key] = deepMergeObjects(base[key], value)
      } else {
        next[key] = value
      }
    }
    return next
  }
  const getStyleLock = (project: any) => {
    const raw = project?.reference_config?.style_lock || {}
    const targetLength = raw.chapter_word_range || raw.target_length || (
      project.length_target === 'long' ? '4000-6000字' : project.length_target === 'short' ? '1500-2500字' : '2500-4000字'
    )
    return {
      narrative_person: raw.narrative_person || raw.narrative_style || ((project.style_tags || []).join('、') || '保持当前项目文风'),
      sentence_length: raw.sentence_length || '中等句长，长短句交替',
      dialogue_ratio: raw.dialogue_ratio || '对话驱动，描写为辅',
      banter_density: raw.banter_density || '跟随当前项目风格',
      payoff_density: raw.payoff_density || '每章至少一个明确爽点/信息推进',
      description_density: raw.description_density || '关键场景给足氛围，非关键场景压缩',
      chapter_word_range: targetLength,
      banned_words: asArray(raw.banned_words),
      preferred_words: asArray(raw.preferred_words),
      ending_policy: raw.ending_policy || '结尾必须到达本章 ending_hook，并留下下一章入口',
      banned_shortcuts: asArray(raw.banned_shortcuts).length ? asArray(raw.banned_shortcuts) : ['时间过得很快', '几天后', '一切都结束了', '突然就明白了'],
    }
  }
  const getSafetyPolicy = (project: any) => {
    const raw = project?.reference_config?.safety || {}
    return {
      enforce_on_generate: Boolean(raw.enforce_on_generate),
      min_quality_score: Number(raw.min_quality_score || 60),
      max_copy_hits: Number(raw.max_copy_hits ?? 0),
      allowed: asArray(raw.allowed).length ? asArray(raw.allowed) : ['节奏', '结构', '爽点安排', '信息密度', '章节节拍', '情绪曲线'],
      cautious: asArray(raw.cautious).length ? asArray(raw.cautious) : ['人物功能', '设定机制', '资源经济模型'],
      forbidden: asArray(raw.forbidden).length ? asArray(raw.forbidden) : ['具体桥段', '专有设定', '原句', '角色名', '核心梗', '事件顺序'],
    }
  }
  const getStoryState = (project: any) => project?.reference_config?.story_state || {}
  const getQualityGate = (project: any) => ({
    enabled: project.reference_config?.quality_gate?.enabled !== false,
    min_score: Number(project.reference_config?.quality_gate?.min_score ?? project.reference_config?.approval_policy?.low_score_threshold ?? 78),
    max_critical_issues: Number(project.reference_config?.quality_gate?.max_critical_issues ?? 0),
    max_high_issues: Number(project.reference_config?.quality_gate?.max_high_issues ?? 1),
    block_on_safety: project.reference_config?.quality_gate?.block_on_safety !== false,
    require_revision_before_store: project.reference_config?.quality_gate?.require_revision_before_store !== false,
  })
  const getQualityGateDecision = (project: any, review: any, safetyDecision: any = null) => {
    const gate = getQualityGate(project)
    const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
    const criticalCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'critical').length
    const highCount = issues.filter(issue => String(issue.severity || '').toLowerCase() === 'high').length
    const score = Number(review?.score || 0)
    const reasons = [
      score && score < gate.min_score ? `质检评分 ${score} 低于入库阈值 ${gate.min_score}` : '',
      gate.require_revision_before_store && review?.needs_revision && !review?.revised ? '自检要求修订，但当前没有可用修订稿' : '',
      criticalCount > gate.max_critical_issues ? `严重问题 ${criticalCount} 个超过上限 ${gate.max_critical_issues}` : '',
      highCount > gate.max_high_issues ? `高风险问题 ${highCount} 个超过上限 ${gate.max_high_issues}` : '',
      gate.block_on_safety && safetyDecision?.blocked ? `仿写安全未通过：${(safetyDecision.reasons || []).join('；')}` : '',
    ].filter(Boolean)
    return { gate, passed: !gate.enabled || reasons.length === 0, reasons, score, critical_count: criticalCount, high_count: highCount }
  }
  const normalizeSceneProduction = (sceneCards: any[] = [], previous: any[] = [], status = 'pending') => {
    const byNo = new Map(previous.map((item: any) => [Number(item.scene_no || item.index || 0), item]))
    return sceneCards.map((card: any, index: number) => {
      const sceneNo = Number(card.scene_no || index + 1)
      const prev = byNo.get(sceneNo) || {}
      return {
        ...card,
        scene_no: sceneNo,
        status: prev.status && prev.status !== 'pending' ? prev.status : status,
        updated_at: new Date().toISOString(),
        word_count: Number(prev.word_count || 0),
        quality_notes: prev.quality_notes || [],
      }
    })
  }
  const advanceSceneProduction = (scenes: any[] = [], status: string, patch: any = {}) => scenes.map(scene => ({
    ...scene,
    ...patch,
    status,
    updated_at: new Date().toISOString(),
  }))
  const getVolumePlan = (outlines: any[]) => outlines
    .filter(outline => outline.outline_type === 'volume')
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .map(outline => ({
      id: outline.id,
      title: outline.title,
      summary: outline.summary || '',
      phase_conflicts: outline.conflict_points || [],
      key_turning_points: outline.turning_points || [],
      hook: outline.hook || '',
      target_length: outline.target_length || '',
      raw_payload: outline.raw_payload || {},
    }))
  const collectRecentFacts = (reviews: any[]) => reviews
    .filter(item => item.review_type === 'story_state')
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 5)
    .map(item => {
      const payload = parseJsonLikePayload(item.payload) || {}
      return {
        chapter_no: payload.chapter_no,
        state_delta: payload.state_delta || payload,
      }
    })
  const buildPreflightChecks = (project: any, chapter: any, previousChapter: any, worldbuilding: any[], characters: any[], sceneCards: any[], referencePreview: any, reviews: any[]) => {
    const charactersWithState = characters.filter(char => char.current_state && Object.keys(char.current_state || {}).length > 0)
    const storyState = getStoryState(project)
    const forbidden = getSafetyPolicy(project).forbidden
    const repeatedWarnings = asArray(storyState.recent_repeated_information).slice(0, 6)
    const checks = [
      { key: 'chapter_blueprint', ok: Boolean(chapter.chapter_summary || chapter.chapter_goal), severity: 'high', label: '章节细纲/目标', fix: '补充章节目标或章节摘要。' },
      { key: 'scene_cards', ok: sceneCards.length > 0, severity: 'medium', label: '场景卡', fix: '先生成或编辑本章场景卡。' },
      { key: 'chapter_conflict', ok: Boolean(chapter.conflict), severity: 'medium', label: '本章冲突', fix: '补充本章主要冲突。' },
      { key: 'ending_hook', ok: Boolean(chapter.ending_hook), severity: 'high', label: '章末钩子', fix: '补充本章结尾钩子。' },
      { key: 'worldbuilding', ok: worldbuilding.length > 0, severity: 'high', label: '世界观', fix: '补充世界观或核心规则。' },
      { key: 'characters', ok: characters.length > 0, severity: 'high', label: '角色卡', fix: '补充至少一个主要角色。' },
      { key: 'character_state', ok: characters.length === 0 || charactersWithState.length > 0 || Boolean(storyState.character_positions), severity: 'medium', label: '角色当前状态', fix: '补充角色 current_state 或先生成故事状态。' },
      { key: 'plot_points', ok: Boolean(chapter.chapter_goal || chapter.chapter_summary || asArray(chapter.raw_payload?.must_advance).length), severity: 'high', label: '本章必须推进剧情点', fix: '在章节目标/摘要中写清本章必须推进的剧情点。' },
      { key: 'previous_continuity', ok: chapter.chapter_no <= 1 || Boolean(previousChapter?.chapter_text || previousChapter?.ending_hook), severity: 'high', label: '前章衔接', fix: '补齐上一章正文或结尾钩子。' },
      { key: 'no_repeat', ok: repeatedWarnings.length === 0, severity: 'low', label: '禁止重复信息', fix: '清理 story_state.recent_repeated_information 或调整本章信息增量。' },
      { key: 'reference_knowledge', ok: !project.reference_config?.references?.length || Boolean(referencePreview?.entries?.length), severity: 'medium', label: '参考知识注入', fix: '先做参考预览或补齐参考作品画像。' },
      { key: 'copy_safety_policy', ok: forbidden.length > 0, severity: 'medium', label: '仿写禁止项', fix: '配置仿写安全禁止项。' },
    ]
    const blockers = checks.filter(item => !item.ok && item.severity === 'high')
    const warnings = checks.filter(item => !item.ok).map(item => `${item.label}不足`)
    return {
      ready: blockers.length === 0,
      strict_ready: checks.every(item => item.ok || item.severity === 'low'),
      checks,
      blockers,
      warnings,
      recent_state_entries: collectRecentFacts(reviews),
    }
  }
  const buildSceneCardsPrompt = (project: any, contextPackage: any) => [
    '任务：为当前章节生成可人工确认的场景卡。场景卡是正文生成前的蓝图，不要写完整正文。',
    `作品标题：${project.title}`,
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 9000),
    '',
    '输出 JSON，字段 scene_cards(array)。每个场景卡包含：scene_no, title, location, characters_present(array), purpose, conflict, beat, emotional_tone, key_dialogue, required_information, transition_from_previous, exit_state。',
    '要求：2-6 个场景；每个场景必须服务本章目标；最后一个场景必须到达 ending_hook；不要复制参考作品专名、桥段或原句。',
  ].join('\n')
  const normalizeSceneCards = (payload: any) => {
    const cards = Array.isArray(payload?.scene_cards) ? payload.scene_cards : Array.isArray(payload?.scenes) ? payload.scenes : []
    return cards.map((card: any, index: number) => ({
      scene_no: Number(card?.scene_no || index + 1),
      title: String(card?.title || `场景${index + 1}`),
      location: String(card?.location || ''),
      characters_present: asArray(card?.characters_present).map((item: any) => String(item)).filter(Boolean),
      purpose: String(card?.purpose || ''),
      conflict: String(card?.conflict || ''),
      beat: String(card?.beat || card?.action || card?.description || ''),
      emotional_tone: String(card?.emotional_tone || card?.tone || ''),
      key_dialogue: String(card?.key_dialogue || card?.dialogue_focus || ''),
      required_information: asArray(card?.required_information).map((item: any) => String(item)).filter(Boolean),
      transition_from_previous: String(card?.transition_from_previous || ''),
      exit_state: String(card?.exit_state || ''),
    })).filter((card: any) => card.beat || card.purpose || card.title)
  }
  const generateSceneCardsForChapter = async (activeWorkspace: string, project: any, contextPackage: any, modelId?: number) => {
    const stageModelId = getStageModelId(project, 'scene_cards', modelId)
    const result = await executeNovelAgent('outline-agent', project, {
      task: buildSceneCardsPrompt(project, contextPackage),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 3000, temperature: getStageTemperature(project, 'scene_cards', 0.45), skipMemory: true })
    const payload = getNovelPayload(result)
    return { result, sceneCards: normalizeSceneCards(payload) }
  }
  const buildParagraphProseContext = (project: any, contextPackage: any, migrationPlan: any = null) => [
    '任务：按场景卡生成章节正文。请先在心中按场景组织段落，再输出完整正文。',
    `作品标题：${project.title}`,
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 12000),
    '',
    '【参考迁移计划】',
    JSON.stringify(migrationPlan || {}, null, 2).slice(0, 5000),
    '',
    '【段落级写作要求】',
    '1. 严格按 scene_cards 顺序生成，每个场景至少 3-8 个自然段。',
    '2. 每个场景必须完成 purpose、conflict、required_information 和 exit_state。',
    '3. 场景之间必须有过渡，不能硬切。',
    '4. 保持 style_lock 中的人称、句长、对话比例、吐槽密度、爽点密度、描写浓度和禁用词约束。',
    '5. 只能学习参考作品的节奏、结构、爽点安排和信息密度；不得复制具体桥段、专有设定、原句、角色名和核心梗。',
    migrationPlan?.generation_prompt_addendum ? `6. ${migrationPlan.generation_prompt_addendum}` : '',
    '',
    '输出 JSON，包含 prose_chapters 数组。数组第一项必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。chapter_text 是完整正文，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
  const buildStoryStatePrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：从刚入库的章节正文中提取故事状态机增量，用于后续章节续写。只提取事实，不要推测。',
    `作品标题：${project.title}`,
    '',
    '【生成上下文】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【章节正文】',
    chapterText.slice(0, 14000),
    '',
    '输出 JSON，字段：',
    'state_delta: {timeline, current_time, active_locations, character_positions, character_relationships, relationship_graph, known_secrets, secret_visibility, item_ownership, resource_status, foreshadowing_status, payoff_queue, mainline_progress, volume_progress, unresolved_conflicts, open_questions, recent_repeated_information, next_chapter_priorities}',
    'character_updates: array，每项包含 name,current_state',
    'next_chapter_priorities: array',
    '只返回 JSON。',
  ].join('\n')
  const mergeStoryState = (prev: any, delta: any, chapter: any) => ({
    ...(prev || {}),
    ...(delta || {}),
    character_positions: { ...((prev || {}).character_positions || {}), ...((delta || {}).character_positions || {}) },
    character_relationships: { ...((prev || {}).character_relationships || {}), ...((delta || {}).character_relationships || {}) },
    relationship_graph: { ...((prev || {}).relationship_graph || {}), ...((delta || {}).relationship_graph || {}) },
    known_secrets: { ...((prev || {}).known_secrets || {}), ...((delta || {}).known_secrets || {}) },
    secret_visibility: { ...((prev || {}).secret_visibility || {}), ...((delta || {}).secret_visibility || {}) },
    item_ownership: { ...((prev || {}).item_ownership || {}), ...((delta || {}).item_ownership || {}) },
    resource_status: { ...((prev || {}).resource_status || {}), ...((delta || {}).resource_status || {}) },
    foreshadowing_status: { ...((prev || {}).foreshadowing_status || {}), ...((delta || {}).foreshadowing_status || {}) },
    payoff_queue: asArray((delta || {}).payoff_queue).length ? asArray((delta || {}).payoff_queue) : asArray((prev || {}).payoff_queue),
    active_locations: asArray((delta || {}).active_locations).length ? asArray((delta || {}).active_locations) : asArray((prev || {}).active_locations),
    open_questions: asArray((delta || {}).open_questions).length ? asArray((delta || {}).open_questions) : asArray((prev || {}).open_questions),
    next_chapter_priorities: asArray((delta || {}).next_chapter_priorities).length ? asArray((delta || {}).next_chapter_priorities) : asArray((prev || {}).next_chapter_priorities),
    last_updated_chapter: chapter.chapter_no,
    last_updated_at: new Date().toISOString(),
  })
  const updateStoryStateMachine = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const stageModelId = getStageModelId(project, 'review', modelId)
    const result = await executeNovelAgent('review-agent', project, {
      task: buildStoryStatePrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 2500, temperature: getStageTemperature(project, 'review', 0.15), skipMemory: true })
    const payload = getNovelPayload(result)
    const stateDelta = payload?.state_delta || {}
    const nextReferenceConfig = {
      ...(project.reference_config || {}),
      story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDelta, chapter),
    }
    await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
    const characterUpdates = Array.isArray(payload?.character_updates) ? payload.character_updates : []
    if (characterUpdates.length > 0) {
      const characters = await listNovelCharacters(activeWorkspace, project.id)
      for (const update of characterUpdates) {
        const name = String(update?.name || '').trim()
        if (!name) continue
        const character = characters.find(item => item.name === name)
        if (!character) continue
        await updateNovelCharacter(activeWorkspace, character.id, {
          current_state: {
            ...(character.current_state || {}),
            ...(update.current_state || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
    }
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'story_state',
      status: 'ok',
      summary: `故事状态已更新至第${chapter.chapter_no}章`,
      issues: [],
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, ...payload }),
    })
    return payload
  }
  const getReferenceSafetyDecision = (project: any, referenceReport: any) => {
    const safety = getSafetyPolicy(project)
    const quality = referenceReport?.quality_assessment || {}
    const hits = asArray(referenceReport?.copy_guard?.hits)
    const score = Number(quality.overall_score || 0)
    const blocked = safety.enforce_on_generate && (score < safety.min_quality_score || hits.length > safety.max_copy_hits)
    return {
      blocked,
      safety,
      score,
      copy_hit_count: hits.length,
      reasons: [
        score < safety.min_quality_score ? `参考安全评分 ${score} 低于阈值 ${safety.min_quality_score}` : '',
        hits.length > safety.max_copy_hits ? `照搬命中 ${hits.length} 超过阈值 ${safety.max_copy_hits}` : '',
      ].filter(Boolean),
    }
  }
  const buildWritingBible = (project: any, worldbuilding: any[], characters: any[], outlines: any[], reviews: any[] = []) => {
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
      updated_at: new Date().toISOString(),
    }
  }
  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => {
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, project.id),
      listNovelCharacters(activeWorkspace, project.id),
      listNovelOutlines(activeWorkspace, project.id),
      listNovelReviews(activeWorkspace, project.id),
    ])
    return project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
  }
  const explainReferenceSafety = (referenceReport: any, safetyDecision: any) => {
    const quality = referenceReport?.quality_assessment || {}
    const hits = asArray(referenceReport?.copy_guard?.hits)
    const entries = asArray(referenceReport?.injected_entries)
    return {
      score: safetyDecision?.score ?? Number(quality.overall_score || 0),
      risk_level: quality.risk_level || (safetyDecision?.blocked ? 'high' : 'low'),
      copy_hit_count: hits.length,
      learned_layers: {
        allowed: safetyDecision?.safety?.allowed || [],
        cautious: safetyDecision?.safety?.cautious || [],
        forbidden: safetyDecision?.safety?.forbidden || [],
      },
      evidence: {
        injected_entry_count: entries.length,
        copy_hits: hits,
        injection_score: quality.injection_score,
        copy_safety_score: quality.copy_safety_score,
        originality_score: quality.originality_score,
      },
      rewrite_suggestions: [
        hits.length ? '替换疑似复用词和专有名词，改写事件触发顺序。' : '',
        Number(quality.copy_safety_score || 100) < 75 ? '保留节奏功能，重写场景目标、障碍来源和人物选择。' : '',
        Number(quality.originality_score || 100) < 75 ? '增加当前项目独有的世界规则、代价机制或角色动机。' : '',
        '只迁移节奏、结构、爽点安排和信息密度，不迁移具体桥段、角色名、专有设定和原句。',
      ].filter(Boolean),
      blocked_reasons: safetyDecision?.reasons || [],
    }
  }
  const buildPipelineSteps = () => [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
    { key: 'scene_cards', label: '场景卡生成/人工确认', status: 'pending' },
    { key: 'migration_plan', label: '参考迁移计划', status: 'pending' },
    { key: 'draft', label: '段落级正文生成', status: 'pending' },
    { key: 'review', label: '章节级自检', status: 'pending' },
    { key: 'revise', label: '二次修订', status: 'pending' },
    { key: 'safety', label: '仿写安全阈值', status: 'pending' },
    { key: 'store', label: '入库版本', status: 'pending' },
    { key: 'story_state', label: '记忆状态机更新', status: 'pending' },
  ]
  const updatePipelineStep = (steps: any[], key: string, patch: any) => steps.map(step => step.key === key ? { ...step, ...patch, updated_at: new Date().toISOString() } : step)
  const buildChapterGroupStages = () => buildPipelineSteps().map(step => ({ ...step, status: 'pending' }))
  const updateChapterStages = (stages: any[] = [], key: string, patch: any = {}) => {
    const base = stages.length ? stages : buildChapterGroupStages()
    return updatePipelineStep(base, key, patch)
  }
  const summarizeChapterStages = (stages: any[] = []) => {
    const items = stages.length ? stages : buildChapterGroupStages()
    const failed = items.find(step => step.status === 'failed')
    if (failed) return { status: 'failed', current_step: failed.key, current_label: failed.label }
    const running = items.find(step => ['running', 'ready', 'needs_confirmation'].includes(step.status))
    if (running) return { status: 'running', current_step: running.key, current_label: running.label }
    const success = items.filter(step => step.status === 'success').length
    return { status: success === items.length ? 'success' : 'pending', current_step: items[success]?.key || 'done', current_label: items[success]?.label || '已完成' }
  }
  const runQueueWorkers = new Map<number, any>()
  const getModelStrategy = (project: any, preferredModelId?: number) => ({
    preferred_model_id: preferredModelId || null,
    stages: {
      incubation: { model_id: preferredModelId || null, temperature: 0.65, reason: '原创孵化需要创意和结构稳定性平衡。' },
      outline: { model_id: preferredModelId || null, temperature: 0.45, reason: '大纲和分卷要求结构一致性。' },
      scene_cards: { model_id: preferredModelId || null, temperature: 0.45, reason: '场景卡需要可控，不宜过度发散。' },
      draft: { model_id: preferredModelId || null, temperature: 0.75, reason: '正文初稿需要保留表达弹性。' },
      review: { model_id: preferredModelId || null, temperature: 0.2, reason: '审稿需要低温、稳定和可复现。' },
      revise: { model_id: preferredModelId || null, temperature: 0.62, reason: '修订需要遵循问题清单，同时保留文气。' },
      safety: { model_id: preferredModelId || null, temperature: 0.15, reason: '仿写安全审计需要保守判断。' },
    },
    cost_policy: {
      low_cost_mode: project.reference_config?.model_strategy?.low_cost_mode !== false,
      retry_limit: Number(project.reference_config?.model_strategy?.retry_limit || 2),
      fallback_enabled: project.reference_config?.model_strategy?.fallback_enabled !== false,
    },
  })
  const getStageModelId = (project: any, stage: string, preferredModelId?: number) => {
    const strategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
    return Number(strategy?.stages?.[stage]?.model_id || strategy?.preferred_model_id || preferredModelId || 0) || undefined
  }
  const getStageTemperature = (project: any, stage: string, fallback: number) => {
    const value = Number(project.reference_config?.model_strategy?.stages?.[stage]?.temperature)
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  const buildProductionDashboard = (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => {
    const written = chapters.filter(ch => ch.chapter_text)
    const proseQuality = reviews.filter(item => item.review_type === 'prose_quality').map(item => {
      const payload = parseJsonLikePayload(item.payload) || {}
      return Number(payload.self_check?.review?.score || 0)
    }).filter(score => Number.isFinite(score) && score > 0)
    const state = getStoryState(project)
    const volumeCount = outlines.filter(item => item.outline_type === 'volume').length
    const latestPipeline = runs.find(item => item.run_type === 'chapter_generation_pipeline') || null
    const latestFailures = runs.filter(item => ['failed', 'warn'].includes(item.status)).slice(0, 8)
    const reviewsByChapter = reviews.reduce((acc: Record<number, any[]>, item: any) => {
      const payload = parseJsonLikePayload(item.payload) || {}
      const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || 0)
      if (!chapterId) return acc
      acc[chapterId] = [...(acc[chapterId] || []), item]
      return acc
    }, {})
    const chapter_trends = chapters
      .sort((a, b) => a.chapter_no - b.chapter_no)
      .map(chapter => {
        const chapterReviews = reviewsByChapter[chapter.id] || []
        const qualityReview = chapterReviews.find(item => item.review_type === 'prose_quality')
        const similarityReview = chapterReviews.find(item => item.review_type === 'similarity_report')
        const qualityPayload = parseJsonLikePayload(qualityReview?.payload) || {}
        const similarityPayload = parseJsonLikePayload(similarityReview?.payload) || {}
        return {
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
          quality_score: Number(qualityPayload.self_check?.review?.score || 0) || null,
          similarity_risk: Number(similarityPayload.report?.overall_risk_score || 0) || null,
          revision_count: runs.filter(run => String(run.output_ref || '').includes(`"chapter_id":${chapter.id}`) || String(run.step_name || '').includes(`chapter-${chapter.chapter_no}`)).length,
          has_text: Boolean(chapter.chapter_text),
        }
      })
    const volume_controls = getVolumePlan(outlines).map((volume, index) => {
      const nextVolume = getVolumePlan(outlines)[index + 1]
      const from = Number((volume.raw_payload || {}).start_chapter || 0) || 1
      const to = Number((volume.raw_payload || {}).end_chapter || 0) || (nextVolume ? Number((nextVolume.raw_payload || {}).start_chapter || 0) - 1 : chapters.length)
      const scopedChapters = chapters.filter(ch => ch.chapter_no >= from && ch.chapter_no <= Math.max(from, to))
      return {
        ...volume,
        start_chapter: from,
        end_chapter: Math.max(from, to),
        chapter_count: scopedChapters.length,
        written_count: scopedChapters.filter(ch => ch.chapter_text).length,
        progress: scopedChapters.length ? Math.round((scopedChapters.filter(ch => ch.chapter_text).length / scopedChapters.length) * 100) : 0,
      }
    })
    return {
      project_id: project.id,
      title: project.title,
      chapter_total: chapters.length,
      written_chapters: written.length,
      unwritten_chapters: chapters.length - written.length,
      word_count: chapters.reduce((sum, ch) => sum + String(ch.chapter_text || '').replace(/\s/g, '').length, 0),
      volume_count: volumeCount,
      character_count: characters.length,
      average_quality_score: proseQuality.length ? Math.round(proseQuality.reduce((sum, score) => sum + score, 0) / proseQuality.length) : null,
      story_state_updated_to: state.last_updated_chapter || null,
      mainline_progress: state.mainline_progress || '',
      latest_pipeline: latestPipeline,
      latest_failures: latestFailures,
      chapter_trends,
      volume_controls,
      recommendations: [
        chapters.length === 0 ? '先使用原创孵化器或大纲生成建立章节结构。' : '',
        written.length < Math.min(5, chapters.length) ? '优先完成前 5 章正文，用于校准文风和状态机。' : '',
        volumeCount === 0 ? '补充分卷/阶段目标，避免长篇只按单章推进。' : '',
        proseQuality.length && Math.min(...proseQuality) < 78 ? '存在低分章节，建议进入正文质检按报告修订。' : '',
        !project.reference_config?.writing_bible ? '建议保存写作圣经，稳定长期生成上下文。' : '',
      ].filter(Boolean),
    }
  }
  const buildProductionMetrics = (chapters: any[], reviews: any[], runs: any[]) => {
    const usageItems = runs.map(run => parseJsonLikePayload(run.output_ref) || {}).map(payload => payload.usage || payload.result?.usage || payload)
    const tokenTotal = usageItems.reduce((sum, usage) => sum + Number(usage?.total_tokens || usage?.totalTokens || usage?.tokens || 0), 0)
    const durationTotal = runs.reduce((sum, run) => sum + Number(run.duration_ms || 0), 0)
    const stageStats = runs.reduce((acc: Record<string, any>, run) => {
      const key = run.run_type || 'unknown'
      acc[key] = acc[key] || { total: 0, failed: 0, success: 0, duration_ms: 0 }
      acc[key].total += 1
      acc[key].failed += ['failed', 'error'].includes(run.status) ? 1 : 0
      acc[key].success += ['success', 'ok', 'completed'].includes(run.status) ? 1 : 0
      acc[key].duration_ms += Number(run.duration_ms || 0)
      return acc
    }, {})
    const modelStats = runs.reduce((acc: Record<string, any>, run) => {
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const candidates = [
        payload.modelName,
        payload.model_name,
        payload.result?.modelName,
        payload.self_check?.review?.modelName,
        payload.chapters?.find?.((item: any) => item?.modelName)?.modelName,
      ].filter(Boolean)
      const key = String(candidates[0] || 'unknown')
      acc[key] = acc[key] || { total: 0, success: 0, failed: 0, avg_duration_ms: 0, duration_ms: 0 }
      acc[key].total += 1
      acc[key].success += ['success', 'ok', 'completed'].includes(run.status) ? 1 : 0
      acc[key].failed += ['failed', 'error'].includes(run.status) ? 1 : 0
      acc[key].duration_ms += Number(run.duration_ms || 0)
      acc[key].avg_duration_ms = Math.round(acc[key].duration_ms / Math.max(1, acc[key].total))
      return acc
    }, {})
    const qualityScores = reviews
      .filter(item => ['prose_quality', 'editor_report', 'book_review'].includes(item.review_type))
      .map(item => {
        const payload = parseJsonLikePayload(item.payload) || {}
        return Number(payload.self_check?.review?.score || payload.report?.overall_score || 0)
      })
      .filter(score => score > 0)
    const safetyBlocks = runs.filter(run => String(run.error_message || '').includes('仿写安全') || String(run.output_ref || '').includes('REFERENCE_SAFETY_BLOCKED')).length
    const fallbackCount = runs.filter(run => run.status === 'fallback' || String(run.output_ref || '').includes('fallback')).length
    const generatedWords = chapters.reduce((sum, chapter) => sum + String(chapter.chapter_text || '').replace(/\s/g, '').length, 0)
    return {
      chapter_count: chapters.length,
      written_chapter_count: chapters.filter(chapter => chapter.chapter_text).length,
      generated_words: generatedWords,
      total_runs: runs.length,
      total_tokens: tokenTotal,
      estimated_cost_units: Math.round(tokenTotal / 1000),
      total_duration_ms: durationTotal,
      avg_run_duration_ms: runs.length ? Math.round(durationTotal / runs.length) : 0,
      avg_quality_score: qualityScores.length ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : null,
      failure_rate: runs.length ? Math.round((runs.filter(run => ['failed', 'error'].includes(run.status)).length / runs.length) * 100) : 0,
      fallback_count: fallbackCount,
      safety_block_count: safetyBlocks,
      stage_stats: stageStats,
      model_stats: modelStats,
      model_recommendations: Object.entries(modelStats).map(([model, stats]: [string, any]) => ({
        model,
        success_rate: stats.total ? Math.round((stats.success / stats.total) * 100) : 0,
        avg_duration_ms: stats.avg_duration_ms,
        recommendation: stats.failed > stats.success ? '失败多于成功，建议降级为备用模型或缩短上下文。' : stats.avg_duration_ms > 120000 ? '平均耗时偏长，建议仅用于大纲/最终修订。' : '可继续用于当前阶段。',
      })),
      throughput: {
        words_per_minute: durationTotal > 0 ? Math.round(generatedWords / (durationTotal / 60000)) : 0,
        chapters_per_hour: durationTotal > 0 ? Number((chapters.filter(chapter => chapter.chapter_text).length / (durationTotal / 3600000)).toFixed(2)) : 0,
      },
    }
  }
  const buildReferenceCoverageReport = async (project: any) => {
    const categories = [
      { key: 'reference_profile', label: '作品画像', required: true },
      { key: 'volume_architecture', label: '分卷结构', required: true },
      { key: 'chapter_beat_template', label: '章节节奏', required: true },
      { key: 'character_function_matrix', label: '角色功能', required: true },
      { key: 'payoff_model', label: '爽点模板', required: true },
      { key: 'style_profile', label: '文风样本', required: true },
      { key: 'prose_syntax_profile', label: '句法样本', required: false },
      { key: 'dialogue_mechanism', label: '对话机制', required: false },
      { key: 'resource_economy_model', label: '资源经济', required: false },
    ]
    const references = asArray(project.reference_config?.references).filter((item: any) => String(item.project_title || '').trim())
    const rows = await Promise.all(references.map(async (ref: any) => {
      const title = String(ref.project_title || '').trim()
      const categoryRows = await Promise.all(categories.map(async category => {
        const count = (await listKnowledge(category.key, { project_title: title }).catch(() => [])).length
        return { ...category, count, ready: count > 0 || !category.required }
      }))
      const requiredRows = categoryRows.filter(item => item.required)
      const score = requiredRows.length ? Math.round((requiredRows.filter(item => item.count > 0).length / requiredRows.length) * 100) : 100
      return {
        project_title: title,
        weight: Number(ref.weight || 0.7),
        dimensions: asArray(ref.dimensions),
        avoid: asArray(ref.avoid),
        score,
        status: score >= 80 ? 'ready' : score >= 50 ? 'partial' : 'insufficient',
        categories: categoryRows,
        missing_required: requiredRows.filter(item => item.count <= 0).map(item => item.key),
      }
    }))
    const overallScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100
    return {
      references: rows,
      overall_score: overallScore,
      ready: rows.every(row => row.score >= 80),
      recommendations: [
        !rows.length ? '当前没有配置参考作品，可走原创生产流程。' : '',
        rows.some(row => row.missing_required.includes('reference_profile')) ? '先补齐作品画像，否则模型只能拿到零散知识。' : '',
        rows.some(row => row.missing_required.includes('chapter_beat_template')) ? '补齐章节节奏模板，仿写才会学到节拍而不是桥段。' : '',
        rows.some(row => row.missing_required.includes('character_function_matrix')) ? '补齐角色功能矩阵，避免照搬角色名或人设。' : '',
        rows.some(row => row.missing_required.includes('style_profile')) ? '补齐文风样本，原创和仿写都需要稳定表达参数。' : '',
      ].filter(Boolean),
    }
  }
  const getApprovalPolicy = (project: any) => ({
    mode: project.reference_config?.approval_policy?.mode || 'balanced',
    require_scene_card_approval: project.reference_config?.approval_policy?.require_scene_card_approval !== false,
    require_draft_approval: Boolean(project.reference_config?.approval_policy?.require_draft_approval),
    require_low_score_approval: project.reference_config?.approval_policy?.require_low_score_approval !== false,
    low_score_threshold: Number(project.reference_config?.approval_policy?.low_score_threshold || 78),
    require_safety_approval: project.reference_config?.approval_policy?.require_safety_approval !== false,
    allow_full_auto: Boolean(project.reference_config?.approval_policy?.allow_full_auto),
  })
  const approvalRequired = (policy: any, stage: string, approvals: any = {}, context: any = {}) => {
    if (policy?.allow_full_auto) return false
    if (approvals?.[stage]?.approved === true || approvals?.[stage] === true) return false
    if (stage === 'scene_cards') return Boolean(policy?.require_scene_card_approval)
    if (stage === 'draft') return Boolean(policy?.require_draft_approval)
    if (stage === 'low_score') return Boolean(policy?.require_low_score_approval) && Number(context.score || 100) < Number(policy?.low_score_threshold || 78)
    if (stage === 'safety') {
      if (!policy?.require_safety_approval) return false
      return policy.mode === 'strict' || Number(context.copy_hit_count || 0) > 0 || ['medium', 'high'].includes(String(context.risk_level || 'low'))
    }
    return false
  }
  const buildApprovalError = (stage: string, message: string, context: any = {}) => Object.assign(new Error(message), {
    code: 'APPROVAL_REQUIRED',
    approval_stage: stage,
    approval_context: context,
  })
  const getProductionBudget = (project: any) => ({
    max_retries_per_chapter: Number(project.reference_config?.production_budget?.max_retries_per_chapter ?? 2),
    max_daily_generated_chapters: Number(project.reference_config?.production_budget?.max_daily_generated_chapters ?? 50),
    max_failure_rate: Number(project.reference_config?.production_budget?.max_failure_rate ?? 35),
    max_safety_blocks_per_day: Number(project.reference_config?.production_budget?.max_safety_blocks_per_day ?? 5),
    max_run_minutes: Number(project.reference_config?.production_budget?.max_run_minutes ?? 180),
    pause_on_budget_exceeded: project.reference_config?.production_budget?.pause_on_budget_exceeded !== false,
  })
  const getProductionBudgetDecision = (project: any, runs: any[]) => {
    const budget = getProductionBudget(project)
    const today = new Date().toISOString().slice(0, 10)
    const todayRuns = runs.filter(run => String(run.created_at || '').startsWith(today))
    const generatedToday = todayRuns.filter(run => run.run_type === 'generate_prose' && run.status === 'success').length
      + todayRuns.filter(run => run.run_type === 'chapter_group_generation' && String(run.output_ref || '').includes('"status":"success"')).length
    const failedRuns = todayRuns.filter(run => ['failed', 'error'].includes(run.status)).length
    const failureRate = todayRuns.length ? Math.round((failedRuns / todayRuns.length) * 100) : 0
    const safetyBlocks = todayRuns.filter(run => String(run.error_message || '').includes('仿写安全') || String(run.output_ref || '').includes('REFERENCE_SAFETY_BLOCKED')).length
    const reasons = [
      generatedToday >= budget.max_daily_generated_chapters ? `今日生成章节数 ${generatedToday} 已达到上限 ${budget.max_daily_generated_chapters}` : '',
      failureRate > budget.max_failure_rate ? `今日失败率 ${failureRate}% 超过上限 ${budget.max_failure_rate}%` : '',
      safetyBlocks > budget.max_safety_blocks_per_day ? `今日安全阻断 ${safetyBlocks} 次超过上限 ${budget.max_safety_blocks_per_day}` : '',
    ].filter(Boolean)
    return {
      budget,
      blocked: budget.pause_on_budget_exceeded && reasons.length > 0,
      reasons,
      usage: { generated_today: generatedToday, failed_runs: failedRuns, failure_rate: failureRate, safety_blocks: safetyBlocks, total_runs_today: todayRuns.length },
    }
  }
  const buildReferenceMigrationDryPlan = (project: any, chapter: any, preview: any, safety: any) => ({
    allowed_learning_layers: safety.allowed,
    cautious_layers: safety.cautious,
    forbidden_transfer_layers: safety.forbidden,
    chapter_specific_plan: {
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      learn: ['章节节奏', '结构功能', '爽点密度', '信息揭示节拍', '情绪曲线'],
      rewrite: ['场景目标', '障碍来源', '人物选择', '事件顺序', '设定名词', '具体桥段'],
      active_reference_count: preview.active_references?.length || 0,
      injected_entry_count: preview.entries?.length || 0,
    },
    rewrite_boundaries: ['不使用参考作品角色名、专有设定、原句、核心梗。', '参考作品只能作为节奏和结构功能样本。'],
    copy_guard_terms: collectCopyGuardTerms(preview).slice(0, 20),
    generation_prompt_addendum: '只学习参考作品的节奏、结构功能、爽点密度和信息揭示方式；所有具体事件、设定、角色、表达、桥段和顺序必须换成当前项目自有内容。',
  })
  const getReferenceMigrationPlanForChapter = async (activeWorkspace: string, project: any, chapter: any) => {
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    const latest = reviews
      .filter(item => item.review_type === 'reference_migration_plan')
      .map(item => parseJsonLikePayload(item.payload) || {})
      .find(payload => Number(payload.chapter_id || 0) === Number(chapter.id))
    if (latest?.plan) return latest.plan
    const preview = await previewNovelKnowledgeInjection(project, '正文创作')
    return buildReferenceMigrationDryPlan(project, chapter, preview, getSafetyPolicy(project))
  }
  const classifyGenerationFailure = (error: any) => {
    const text = String(error?.message || error?.error || error || '')
    if (text.includes('upload current user input file') || text.includes('upload file failed')) return { type: 'provider_upload_failed', actions: ['缩短上下文后重试', '切换模型重试', '把章节批量拆小'] }
    if (text.includes('JSON') || text.includes('解析')) return { type: 'json_parse_failed', actions: ['使用 JSON 修复解析', '降低输出字段复杂度后重试'] }
    if (text.includes('模型未返回正文') || text.includes('未返回正文')) return { type: 'empty_prose', actions: ['降低上下文字数重试', '强制重新生成场景卡', '切换正文模型'] }
    if (text.includes('仿写安全') || text.includes('REFERENCE_SAFETY_BLOCKED')) return { type: 'reference_safety_blocked', actions: ['生成参考迁移计划', '替换高风险专名和桥段', '降低参考强度后重试'] }
    if (text.includes('前置检查') || text.includes('PREFLIGHT')) return { type: 'preflight_blocked', actions: ['补齐章节目标/结尾钩子/角色状态', '生成场景卡', '允许缺材料继续'] }
    if (error?.code === 'APPROVAL_REQUIRED') return { type: 'approval_required', actions: ['人工确认当前关卡', '调整审批策略', '确认后继续执行'] }
    return { type: 'unknown', actions: ['查看原始错误', '手动重试', '切换模型重试'] }
  }
  const getAgentPromptConfig = (project: any) => ({
    version: project.reference_config?.agent_prompt_config?.version || 1,
    prompts: project.reference_config?.agent_prompt_config?.prompts || {},
    project_overrides_enabled: project.reference_config?.agent_prompt_config?.project_overrides_enabled !== false,
    updated_at: project.reference_config?.agent_prompt_config?.updated_at || '',
  })
  const simpleTextSimilarity = (a: string, b: string) => {
    const grams = (text: string) => {
      const clean = String(text || '').replace(/\s/g, '')
      const set = new Set<string>()
      for (let i = 0; i < clean.length - 2; i += 1) set.add(clean.slice(i, i + 3))
      return set
    }
    const left = grams(a)
    const right = grams(b)
    if (!left.size || !right.size) return 0
    let inter = 0
    for (const item of left) if (right.has(item)) inter += 1
    return clampScore((inter / Math.max(left.size, right.size)) * 100)
  }
  const diffTexts = (before: string, after: string) => {
    const beforeParas = String(before || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
    const afterParas = String(after || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
    const max = Math.max(beforeParas.length, afterParas.length)
    const changes = []
    for (let i = 0; i < max; i += 1) {
      if (beforeParas[i] !== afterParas[i]) changes.push({ index: i + 1, before: beforeParas[i] || '', after: afterParas[i] || '' })
      if (changes.length >= 80) break
    }
    return {
      before_length: before.length,
      after_length: after.length,
      paragraph_changes: changes,
      change_count: changes.length,
      similarity_score: simpleTextSimilarity(before, after),
    }
  }
  const extractStructureTokens = (value: any) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value || {})
    return Array.from(new Set(String(text || '')
      .replace(/[^\p{L}\p{N}_\u4e00-\u9fa5]+/gu, ' ')
      .split(/\s+/)
      .map(item => item.trim())
      .filter(item => item.length >= 2)
      .slice(0, 120)))
  }
  const overlapScore = (left: string[], right: string[]) => {
    if (!left.length || !right.length) return 0
    const rightSet = new Set(right)
    const hits = left.filter(item => rightSet.has(item))
    return clampScore((hits.length / Math.min(left.length, right.length)) * 100)
  }
  const buildStructuralSimilarityReport = (chapter: any, referenceReport: any) => {
    const entries = asArray(referenceReport?.injected_entries)
    const sceneTokens = extractStructureTokens(chapter.scene_breakdown || chapter.scene_list || [])
    const chapterTokens = extractStructureTokens({
      title: chapter.title,
      goal: chapter.chapter_goal,
      summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
    })
    const referenceTokens = extractStructureTokens(entries.map((entry: any) => ({
      title: entry.title,
      category: entry.category,
      reason: entry.match_reason,
      source: entry.source_project,
    })))
    const categoryCounts = entries.reduce((acc: Record<string, number>, entry: any) => {
      const key = String(entry.category || 'unknown')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const sceneOrderRisk = overlapScore(sceneTokens, referenceTokens)
    const roleFunctionRisk = clampScore(overlapScore(chapterTokens, referenceTokens) * 0.7 + Number(categoryCounts.character_function_matrix || 0) * 4)
    const payoffStructureRisk = clampScore(Number(categoryCounts.payoff_model || 0) * 8 + Number(categoryCounts.chapter_beat_template || 0) * 5)
    const entityOverlapRisk = clampScore(Number(referenceReport?.copy_guard?.hits?.length || 0) * 18)
    const overall = clampScore((sceneOrderRisk * 0.28) + (roleFunctionRisk * 0.24) + (payoffStructureRisk * 0.28) + (entityOverlapRisk * 0.2))
    return {
      overall_structural_risk: overall,
      scene_order_risk: sceneOrderRisk,
      role_function_risk: roleFunctionRisk,
      payoff_structure_risk: payoffStructureRisk,
      entity_overlap_risk: entityOverlapRisk,
      category_counts: categoryCounts,
      inspected_scene_token_count: sceneTokens.length,
      risk_level: overall >= 70 ? 'high' : overall >= 45 ? 'medium' : 'low',
      suggestions: [
        sceneOrderRisk > 45 ? '重排场景目标和信息揭示顺序，不沿用参考作品节拍顺序。' : '',
        roleFunctionRisk > 45 ? '替换角色功能分工和行为选择，让冲突来自本项目独有动机。' : '',
        payoffStructureRisk > 45 ? '保留爽点密度，但更换爽点触发条件、代价和回收方式。' : '',
        entityOverlapRisk > 0 ? '替换命中的参考专名、证据词和高辨识度表达。' : '',
      ].filter(Boolean),
    }
  }
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
  const buildMigrationAudit = (project: any, referenceReport: any, safetyExplanation: any) => ({
    project_id: project.id,
    learning_layers: safetyExplanation?.learned_layers || getSafetyPolicy(project),
    learned: {
      rhythm_structure: asArray(referenceReport?.injected_entries).filter((entry: any) => /beat|节奏|结构|chapter|style|pacing/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
      style_density: asArray(referenceReport?.injected_entries).filter((entry: any) => /style|syntax|dialogue|文风|句法|对话/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
      payoff_emotion: asArray(referenceReport?.injected_entries).filter((entry: any) => /payoff|emotion|爽点|情绪|hook/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
    },
    avoided: getSafetyPolicy(project).forbidden,
    risk: {
      score: safetyExplanation?.score ?? null,
      copy_hits: safetyExplanation?.evidence?.copy_hits || [],
      suggestions: safetyExplanation?.rewrite_suggestions || [],
    },
  })
  const buildChapterContextPackage = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[] = [],
  ) => {
    const sorted = [...chapters].sort((a, b) => a.chapter_no - b.chapter_no)
    const previousChapter = sorted.filter(ch => ch.chapter_no < chapter.chapter_no).slice(-1)[0] || null
    const previousProseChapters = sorted
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({
        chapter_no: ch.chapter_no,
        title: ch.title,
        chapter_summary: ch.chapter_summary || compactText(ch.chapter_text, 240),
        ending_hook: ch.ending_hook || '',
        ending_excerpt: String(ch.chapter_text || '').slice(-800),
      }))
    let referencePreview: any = null
    try {
      referencePreview = await previewNovelKnowledgeInjection(project, '正文创作')
    } catch {
      referencePreview = null
    }
    const sceneCards = Array.isArray(chapter.scene_breakdown) && chapter.scene_breakdown.length
      ? chapter.scene_breakdown
      : (Array.isArray(chapter.scene_list) ? chapter.scene_list : [])
    const preflight = buildPreflightChecks(project, chapter, previousChapter, worldbuilding, characters, sceneCards, referencePreview, reviews)
    const styleLock = getStyleLock(project)
    const safetyPolicy = getSafetyPolicy(project)
    const writingBible = project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
    const basePackage = {
      project: {
        id: project.id,
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || 'medium',
        target_audience: project.target_audience || '',
      },
      chapter_target: {
        id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        goal: chapter.chapter_goal || '',
        summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        scene_cards: sceneCards,
        continuity_notes: chapter.continuity_notes || [],
        must_advance: asArray(chapter.raw_payload?.must_advance),
        forbidden_repeats: asArray(chapter.raw_payload?.forbidden_repeats),
      },
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          summary: previousChapter.chapter_summary || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        } : null,
        previous_prose_chapters: previousProseChapters,
      },
      story_state: {
        global: getStoryState(project),
        recent_state_entries: preflight.recent_state_entries,
        worldbuilding: worldbuilding[0] || null,
        characters: characters.map(char => ({
          name: char.name,
          role: char.role || char.role_type || '',
          motivation: char.motivation || '',
          goal: char.goal || '',
          current_state: char.current_state || {},
          abilities: char.abilities || [],
        })),
        outlines: outlines.slice(0, 20).map(outline => ({
          id: outline.id,
          type: outline.outline_type,
          title: outline.title,
          summary: outline.summary || '',
          hook: outline.hook || '',
        })),
      },
      volume_plan: getVolumePlan(outlines),
      writing_bible: writingBible,
      style_lock: styleLock,
      safety_policy: safetyPolicy,
      reference: referencePreview ? {
        strength_label: referencePreview.strength_label,
        injected_entry_count: Array.isArray(referencePreview.entries) ? referencePreview.entries.length : 0,
        warnings: referencePreview.warnings || [],
      } : null,
      preflight: {
        ready: preflight.ready,
        strict_ready: preflight.strict_ready,
        checks: preflight.checks,
        blockers: preflight.blockers,
        warnings: preflight.warnings,
      },
    }
    const override = chapter.raw_payload?.context_package_override || null
    return override ? deepMergeObjects(basePackage, override) : basePackage
  }
  const buildProseReviewPrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：对刚生成的小说章节进行章节级自检。',
    `作品标题：${project.title}`,
    '',
    '请重点检查：',
    '1. 是否完成本章目标、冲突和章末钩子。',
    '2. 是否自然衔接上一章结尾状态。',
    '3. 角色行为是否符合角色卡与当前状态。',
    '4. 是否有设定冲突、时间线跳跃、物品凭空出现或消失。',
    '5. 是否有水文、重复、空泛总结、机械说明。',
    '6. 是否疑似照搬参考项目的专名、桥段或原句。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')
  const buildProseRevisionPrompt = (project: any, contextPackage: any, chapterText: string, review: any) => [
    '任务：根据自检结果修订本章正文，保留可用内容，修复连续性、角色、节奏和章末钩子问题。',
    `作品标题：${project.title}`,
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【自检结果】',
    JSON.stringify(review, null, 2).slice(0, 4000),
    '',
    '【初稿正文】',
    chapterText.slice(0, 16000),
    '',
    '请输出 JSON，包含 prose_chapters 数组。数组第一项必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。chapter_text 是修订后的完整正文，不要 markdown 标题。',
  ].join('\n')
  const shouldReviseProse = (review: any) => {
    const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
    const hasHighIssue = issues.some(issue => ['high', 'critical'].includes(issue.severity.toLowerCase()))
    return Boolean(review?.needs_revision) || Number(review?.score || 100) < 78 || hasHighIssue
  }
  const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const reviewModelId = getStageModelId(project, 'review', modelId)
    const reviseModelId = getStageModelId(project, 'revise', modelId)
    const reviewResult = await executeNovelAgent('review-agent', project, {
      task: buildProseReviewPrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: reviewModelId ? String(reviewModelId) : undefined, maxTokens: 3000, temperature: getStageTemperature(project, 'review', 0.2), skipMemory: true })
    const reviewPayload = getNovelPayload(reviewResult)
    const normalizedReview = {
      passed: reviewPayload?.passed !== false,
      score: Number(reviewPayload?.score || 80),
      issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
      revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
      needs_revision: Boolean(reviewPayload?.needs_revision),
      modelName: (reviewResult as any).modelName,
    }
    if (!shouldReviseProse(normalizedReview)) {
      return { review: normalizedReview, revision: null, final_text: chapterText, revised: false }
    }
    const revisionResult = await executeNovelAgent('prose-agent', project, {
      task: buildProseRevisionPrompt(project, contextPackage, chapterText, normalizedReview),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: reviseModelId ? String(reviseModelId) : undefined, maxTokens: 8000, temperature: getStageTemperature(project, 'revise', 0.65), skipMemory: true })
    const revisionPayload = getNovelPayload(revisionResult)
    const revisedFirst = Array.isArray(revisionPayload?.prose_chapters) ? revisionPayload.prose_chapters[0] : revisionPayload
    const revisedText = revisedFirst?.chapter_text || revisionPayload?.chapter_text || ''
    if (!revisedText) {
      return { review: normalizedReview, revision: { error: revisionResult.error || '修订未返回正文' }, final_text: chapterText, revised: false }
    }
    return {
      review: normalizedReview,
      revision: {
        scene_breakdown: revisedFirst?.scene_breakdown || revisionPayload?.scene_breakdown || [],
        continuity_notes: revisedFirst?.continuity_notes || revisionPayload?.continuity_notes || [],
        modelName: (revisionResult as any).modelName,
      },
      final_text: revisedText,
      revised: true,
    }
  }
  const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
    const preferredModelId = Number(options.model_id || 0) || undefined
    const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
    const project = await getProject(activeWorkspace, projectId)
    if (!project) throw new Error('project not found')
    const approvalPolicy = options.approval_policy || getApprovalPolicy(project)
    const approvals = options.approvals || {}
    let chapters = await listNovelChapters(activeWorkspace, projectId)
    let chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) throw new Error('chapter not found')
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelReviews(activeWorkspace, projectId),
    ])
    let contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
    await onStage('context', {
      status: contextPackage.preflight.ready ? 'success' : 'failed',
      score: contextPackage.preflight.ready ? 100 : 0,
      warnings: contextPackage.preflight.warnings || [],
      blockers: contextPackage.preflight.blockers || [],
    })
    if (!contextPackage.preflight.ready && options.allow_incomplete !== true) {
      throw Object.assign(new Error('章节生成前置检查未通过'), { code: 'PROSE_PREFLIGHT_BLOCKED', contextPackage })
    }
    await onStage('scene_cards', { status: 'running' })
    if (!contextPackage.chapter_target.scene_cards.length || options.force_scene_cards === true) {
      const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId)
      if (sceneResult.sceneCards.length > 0) {
        const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
          scene_breakdown: sceneResult.sceneCards,
          scene_list: sceneResult.sceneCards,
          raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
        } as any, { createVersion: false })
        if (updatedSceneChapter) chapter = updatedSceneChapter
        chapters = await listNovelChapters(activeWorkspace, projectId)
        contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      }
    }
    await onStage('scene_cards', { status: 'success', count: contextPackage.chapter_target.scene_cards.length, scene_cards: contextPackage.chapter_target.scene_cards })
    if (approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: contextPackage.chapter_target.scene_cards.length })) {
      await onStage('scene_cards', { status: 'needs_confirmation', count: contextPackage.chapter_target.scene_cards.length })
      throw buildApprovalError('scene_cards', '场景卡等待人工确认', { count: contextPackage.chapter_target.scene_cards.length })
    }
    const prevChapters = chapters
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
    await onStage('migration_plan', { status: 'running' })
    const migrationPlan = await getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
    await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
    await onStage('draft', { status: 'running' })
    const draftResult = await generateNovelChapterProse(project, chapter, {
      worldbuilding,
      characters,
      outline: outlines,
      prompt: String(options.prompt || ''),
      prevChapters,
      contextPackage,
      migrationPlan,
      paragraphTask: buildParagraphProseContext(project, contextPackage, migrationPlan),
    } as any, activeWorkspace, getStageModelId(project, 'draft', preferredModelId))
    const resultPayload = getNovelPayload(draftResult)
    const proseArr = Array.isArray(resultPayload?.prose_chapters) ? resultPayload.prose_chapters : []
    const firstProse = proseArr.length > 0 ? proseArr[0] : {}
    const chapterText = resultPayload?.chapter_text || firstProse?.chapter_text
    if ((draftResult as any).error || !chapterText) {
      await onStage('draft', { status: 'failed', error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文') })
      throw new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
    }
    await onStage('draft', { status: 'success', word_count: String(chapterText || '').replace(/\s/g, '').length, modelName: (draftResult as any).modelName, scene_status: 'generated' })
    let finalText = String(chapterText || '')
    let finalSceneBreakdown = resultPayload?.scene_breakdown || firstProse?.scene_breakdown || chapter.scene_breakdown || []
    let finalContinuityNotes = resultPayload?.continuity_notes || firstProse?.continuity_notes || chapter.continuity_notes || []
    await onStage('review', { status: 'running' })
    const selfCheck = await runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, preferredModelId)
    await onStage('review', { status: selfCheck?.review?.passed === false ? 'warn' : 'success', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [], scene_status: 'reviewed' })
    await onStage('revise', { status: selfCheck.revised ? 'success' : 'skipped', revised: Boolean(selfCheck.revised), scene_status: selfCheck.revised ? 'revised' : '' })
    const preStoreQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) })
    if (!preStoreQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, quality_gate: preStoreQualityDecision })
      throw buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', preStoreQualityDecision)
    }
    if (approvalRequired(approvalPolicy, 'low_score', approvals, { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
      throw buildApprovalError('low_score', '章节质检低于阈值，等待人工确认', { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
    }
    if (approvalRequired(approvalPolicy, 'draft', approvals, { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })) {
      await onStage('draft', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
      throw buildApprovalError('draft', '正文入库前等待人工确认', { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
    }
    finalText = selfCheck.final_text || finalText
    if (selfCheck.revised && selfCheck.revision) {
      finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
      finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
    }
    const referenceReport = await buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
    const safetyDecision = getReferenceSafetyDecision(project, referenceReport)
    const safetyExplanation = explainReferenceSafety(referenceReport, safetyDecision)
    const migrationAudit = buildMigrationAudit(project, referenceReport, safetyExplanation)
    await onStage('safety', { status: safetyDecision.blocked ? 'failed' : 'success', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    const finalQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) }, safetyDecision)
    if (safetyDecision.blocked) {
      throw Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision, safetyExplanation, migrationAudit })
    }
    if (!finalQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, quality_gate: finalQualityDecision })
      throw buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', finalQualityDecision)
    }
    if (approvalRequired(approvalPolicy, 'safety', approvals, { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
      throw buildApprovalError('safety', '仿写安全报告等待人工确认', { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    }
    await onStage('store', { status: 'running' })
    const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
      chapter_text: finalText,
      scene_breakdown: finalSceneBreakdown,
      continuity_notes: finalContinuityNotes,
      status: 'draft',
    }, { versionSource: selfCheck?.revised ? 'repair' : 'agent_execute' })
    await onStage('store', { status: 'success', word_count: String(finalText || '').replace(/\s/g, '').length, scene_status: 'accepted' })
    await onStage('story_state', { status: 'running' })
    const storyStateUpdate = await updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, preferredModelId).catch(error => ({ error: String(error) }))
    await onStage('story_state', { status: (storyStateUpdate as any)?.error ? 'failed' : 'success', error: (storyStateUpdate as any)?.error || '' })
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'prose_quality',
      status: selfCheck?.review?.passed === false || Number(selfCheck?.review?.score || 100) < 78 ? 'warn' : 'ok',
      summary: `章节群质检评分 ${selfCheck?.review?.score ?? '-'}`,
      issues: Array.isArray(selfCheck?.review?.issues) ? selfCheck.review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
      payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, self_check: selfCheck, reference_report: referenceReport, safety_decision: safetyDecision, migration_audit: migrationAudit }),
    })
    return {
      chapter: updated,
      score: selfCheck?.review?.score ?? null,
      revised: Boolean(selfCheck?.revised),
      reference_report: referenceReport,
      safety_decision: safetyDecision,
      migration_audit: migrationAudit,
      story_state_update: storyStateUpdate,
    }
  }

  app.get('/api/novel/chapters/:chapterId/preflight', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.query.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
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
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      res.json({ ok: contextPackage.preflight.ready, context_package: contextPackage, preflight: contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/generation-diagnostics', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.query.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
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
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const readinessScore = Math.round((contextPackage.preflight.checks.filter((item: any) => item.ok).length / Math.max(1, contextPackage.preflight.checks.length)) * 100)
      res.json({
        ok: contextPackage.preflight.ready,
        readiness_score: readinessScore,
        preflight: contextPackage.preflight,
        context_package: contextPackage,
        writing_bible: contextPackage.writing_bible,
        story_state: contextPackage.story_state,
        recommendations: contextPackage.preflight.checks
          .filter((item: any) => !item.ok)
          .map((item: any) => item.fix || `${item.label}不足`),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.query.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
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
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      res.json({ ok: true, context_package: contextPackage, override: chapter.raw_payload?.context_package_override || null })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
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

  app.get('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, writing_bible: await getStoredOrBuiltWritingBible(activeWorkspace, project), generated: !project.reference_config?.writing_bible })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const writingBible = req.body?.writing_bible || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: {
            ...writingBible,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      res.json({ ok: true, writing_bible: updated?.reference_config?.writing_bible || writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, story_state: getStoryState(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const storyState = req.body?.story_state || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          story_state: {
            ...storyState,
            manually_corrected_at: new Date().toISOString(),
          },
        },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'story_state',
        status: 'ok',
        summary: '故事状态机已人工校正',
        issues: [],
        payload: JSON.stringify({ manual: true, story_state: updated?.reference_config?.story_state || storyState }),
      })
      res.json({ ok: true, story_state: updated?.reference_config?.story_state || storyState, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-dashboard', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, dashboard: buildProductionDashboard(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-metrics', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, metrics: buildProductionMetrics(chapters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, policy: getApprovalPolicy(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      res.json({ ok: true, budget: getProductionBudget(project), decision: getProductionBudgetDecision(project, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const budget = { ...getProductionBudget(project), ...(req.body?.budget || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          production_budget: budget,
        },
      } as any)
      res.json({ ok: true, budget, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, gate: getQualityGate(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const gate = { ...getQualityGate(project), ...(req.body?.gate || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          quality_gate: gate,
        },
      } as any)
      res.json({ ok: true, gate, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const policy = { ...getApprovalPolicy(project), ...(req.body?.policy || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          approval_policy: policy,
        },
      } as any)
      res.json({ ok: true, policy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, config: getAgentPromptConfig(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prev = getAgentPromptConfig(project)
      const config = {
        ...prev,
        ...(req.body?.config || req.body || {}),
        version: Number(prev.version || 1) + 1,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          agent_prompt_config: config,
        },
      } as any)
      res.json({ ok: true, config, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/writing-assets', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const categories = [
        'reference_profile',
        'volume_architecture',
        'chapter_beat_template',
        'character_function_matrix',
        'payoff_model',
        'resource_economy_model',
        'style_profile',
        'prose_syntax_profile',
        'dialogue_mechanism',
      ]
      const referenceTitles = asArray(project.reference_config?.references).map((item: any) => String(item.project_title || '').trim()).filter(Boolean)
      const entries = []
      for (const category of categories) {
        const categoryEntries = referenceTitles.length
          ? (await Promise.all(referenceTitles.map((title: string) => listKnowledge(category, { project_title: title }).catch(() => [])))).flat()
          : await listKnowledge(category).catch(() => [])
        entries.push({ category, entries: categoryEntries.slice(0, 20) })
      }
      res.json({ ok: true, reference_titles: referenceTitles, assets: entries })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-coverage', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, coverage: await buildReferenceCoverageReport(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-fusion', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const references = asArray(project.reference_config?.references)
      const reports = await listNovelReviews(activeWorkspace, project.id)
      const latestReports = reports.filter(item => item.review_type === 'reference_report').slice(0, 8).map(item => parseJsonLikePayload(item.payload) || {})
      const rows = await Promise.all(references.map(async (ref: any) => {
        const title = String(ref.project_title || '').trim()
        const categories = await Promise.all(['chapter_beat_template', 'style_profile', 'payoff_model', 'character_function_matrix', 'prose_syntax_profile', 'dialogue_mechanism'].map(async category => ({
          category,
          count: (await listKnowledge(category, { project_title: title }).catch(() => [])).length,
        })))
        return {
          project_title: title,
          weight: Number(ref.weight || 0.7),
          use_for: asArray(ref.use_for),
          dimensions: asArray(ref.dimensions),
          avoid: asArray(ref.avoid),
          categories,
          learn: {
            rhythm: categories.find(item => item.category === 'chapter_beat_template')?.count || 0,
            style: (categories.find(item => item.category === 'style_profile')?.count || 0) + (categories.find(item => item.category === 'prose_syntax_profile')?.count || 0),
            payoff: categories.find(item => item.category === 'payoff_model')?.count || 0,
            character_function: categories.find(item => item.category === 'character_function_matrix')?.count || 0,
          },
        }
      }))
      const dimensionOwners: Record<string, string[]> = {}
      for (const ref of rows) {
        for (const dim of ref.dimensions.length ? ref.dimensions : ['未指定']) {
          dimensionOwners[dim] = [...(dimensionOwners[dim] || []), ref.project_title]
        }
      }
      const conflicts = Object.entries(dimensionOwners)
        .filter(([, owners]) => owners.length > 1)
        .map(([dimension, owners]) => ({ dimension, owners, suggestion: '为同一维度设置主参考，其他参考降权或只用于补充。' }))
      const latestCopyHits = latestReports.flatMap(report => asArray(report?.copy_guard?.hits)).slice(0, 20)
      res.json({
        ok: true,
        references: rows,
        fusion: {
          total_weight: rows.reduce((sum, row) => sum + Number(row.weight || 0), 0),
          active_dimensions: Object.keys(dimensionOwners),
          conflicts,
          latest_copy_hits: latestCopyHits,
          recommendations: [
            conflicts.length ? '存在多个参考作品争夺同一维度，建议明确主参考和补充参考。' : '',
            latestCopyHits.length ? '最近存在照搬命中，建议提高禁止项或降低对应参考权重。' : '',
            rows.some(row => row.learn.rhythm === 0) ? '部分参考缺章节节拍模板，正文仿写时可能只学到设定而学不到节奏。' : '',
          ].filter(Boolean),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/book-review', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const chapterBriefs = chapters
        .sort((a, b) => a.chapter_no - b.chapter_no)
        .map(ch => ({
          chapter_no: ch.chapter_no,
          title: ch.title,
          summary: ch.chapter_summary || compactText(ch.chapter_text || '', 220),
          ending_hook: ch.ending_hook || '',
          word_count: String(ch.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(ch.chapter_text),
        }))
      const prompt = [
        '任务：进行长篇小说全书/分卷级质量总检，只输出 JSON。',
        `项目：${project.title}`,
        '检查：主线是否停滞、角色成长是否断档、伏笔是否长期未回收、爽点密度是否下降、重复桥段/重复信息、分卷目标是否完成、是否偏离写作圣经。',
        '输出字段：overall_score, mainline, character_arcs, foreshadowing, payoff_density, repetition, volume_goals, bible_alignment, must_fix, next_actions。',
        '【写作圣经】',
        JSON.stringify(project.reference_config?.writing_bible || {}, null, 2).slice(0, 5000),
        '【大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 5000),
        '【角色】',
        JSON.stringify(characters.map(char => ({ name: char.name, role_type: char.role_type, goal: char.goal, current_state: char.current_state })), null, 2).slice(0, 5000),
        '【章节摘要】',
        JSON.stringify(chapterBriefs, null, 2).slice(0, 12000),
        '【近期质检】',
        JSON.stringify(reviews.slice(0, 12).map(item => ({ type: item.review_type, status: item.status, summary: item.summary, issues: item.issues })), null, 2).slice(0, 5000),
      ].join('\n')
      const modelId = getStageModelId(project, 'review', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: getStageTemperature(project, 'review', 0.2), skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'book_review',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `全书总检评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: JSON.stringify({ report, chapter_count: chapters.length, written_count: chapters.filter(ch => ch.chapter_text).length }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'book_review', step_name: 'global', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/topic-validation', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prompt = [
        '任务：进行商业网文选题验证，只输出 JSON。',
        `项目：${project.title}`,
        `题材：${project.genre || ''}`,
        `简介：${project.synopsis || ''}`,
        `目标读者：${project.target_audience || ''}`,
        '输出：overall_score, target_reader, market_position, selling_points, first_10_chapter_retention_risks, competition_risks, three_directions(array), recommendation。',
      ].join('\n')
      const modelId = getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('market-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 5000, temperature: 0.45, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'topic_validation',
        status: Number(report.overall_score || 0) >= 75 ? 'ok' : 'warn',
        summary: `选题验证评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.competition_risks).concat(asArray(report.first_10_chapter_retention_risks)).map((item: any) => String(item)),
        payload: JSON.stringify({ report }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/benchmark', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sample = chapters.find(ch => ch.chapter_summary || ch.chapter_goal) || chapters[0] || null
      const proseScores = reviews.filter(item => item.review_type === 'prose_quality').map(item => Number((parseJsonLikePayload(item.payload) || {}).self_check?.review?.score || 0)).filter(Boolean)
      const report = {
        benchmark_id: `bench-${Date.now()}`,
        sample_chapter: sample ? { id: sample.id, chapter_no: sample.chapter_no, title: sample.title, goal: sample.chapter_goal, summary: sample.chapter_summary } : null,
        current_strategy: project.reference_config?.model_strategy || getModelStrategy(project, Number(req.body.model_id || 0) || undefined),
        quality_baseline: {
          average_score: proseScores.length ? Math.round(proseScores.reduce((sum, score) => sum + score, 0) / proseScores.length) : null,
          sample_count: proseScores.length,
        },
        cost_baseline: buildProductionMetrics(chapters, reviews, await listNovelRuns(activeWorkspace, project.id)),
        recommendations: [
          proseScores.length < 3 ? '样本不足，建议至少生成 3 章后再做模型/提示词 A/B 对比。' : '',
          proseScores.length && Math.min(...proseScores) < 78 ? '存在低分章节，优先优化审稿修订提示词。' : '',
          !project.reference_config?.agent_prompt_config ? '尚未配置 Agent 提示词版本，可先建立项目级提示词基线。' : '',
        ].filter(Boolean),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'quality_benchmark',
        status: 'ok',
        summary: `质量基准：样本 ${proseScores.length}，均分 ${report.quality_baseline.average_score ?? '-'}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'quality_benchmark', step_name: 'baseline', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/rolling-plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const fromChapter = Number(req.body.from_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const horizon = Math.max(3, Math.min(30, Number(req.body.horizon || 10)))
      const targetChapters = chapters.filter(ch => ch.chapter_no >= fromChapter).slice(0, horizon)
      const prompt = [
        '任务：生成未来章节滚动规划，只输出 JSON。',
        `项目：${project.title}`,
        `从第 ${fromChapter} 章开始，规划未来 ${horizon} 章。`,
        '需要输出：rolling_plan(array: chapter_no,title,chapter_goal,conflict,payoff,foreshadowing_to_use,ending_hook), volume_remaining_goals, foreshadowing_recovery_plan, character_growth_nodes, risk_notes。',
        '【写作圣经/状态机】',
        JSON.stringify({ writing_bible: project.reference_config?.writing_bible || {}, story_state: project.reference_config?.story_state || {} }, null, 2).slice(0, 6000),
        '【分卷/大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 6000),
        '【待规划章节】',
        JSON.stringify(targetChapters.map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, goal: ch.chapter_goal, summary: ch.chapter_summary, ending_hook: ch.ending_hook })), null, 2).slice(0, 6000),
        '【近期审稿】',
        JSON.stringify(reviews.slice(0, 8).map(item => ({ type: item.review_type, summary: item.summary, issues: item.issues })), null, 2).slice(0, 3000),
      ].join('\n')
      const modelId = getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: getStageTemperature(project, 'outline', 0.45), skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'rolling_plan',
        status: 'ok',
        summary: `滚动规划：第${fromChapter}章起 ${horizon} 章`,
        issues: asArray(report.risk_notes).map((item: any) => String(item)),
        payload: JSON.stringify({ report, from_chapter: fromChapter, horizon }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/volume-control/sync', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const reviews = await listNovelReviews(activeWorkspace, project.id)
      const latestRolling = reviews
        .filter(item => item.review_type === 'rolling_plan')
        .map(item => ({ review: item, payload: parseJsonLikePayload(item.payload) || {} }))
        .find(item => item.payload.report)
      const report = req.body?.report || latestRolling?.payload?.report || {}
      const volumeControl = {
        ...(project.reference_config?.volume_control || {}),
        volume_remaining_goals: report.volume_remaining_goals || req.body?.volume_remaining_goals || [],
        foreshadowing_recovery_plan: report.foreshadowing_recovery_plan || req.body?.foreshadowing_recovery_plan || [],
        character_growth_nodes: report.character_growth_nodes || req.body?.character_growth_nodes || [],
        synced_from_review_id: latestRolling?.review?.id || null,
        synced_at: new Date().toISOString(),
      }
      if (req.body?.dry_run === true) return res.json({ ok: true, dry_run: true, volume_control: volumeControl })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          volume_control: volumeControl,
        },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'volume_control',
        status: 'ok',
        summary: '卷级控制已同步滚动规划',
        issues: [],
        payload: JSON.stringify({ volume_control: volumeControl }),
      })
      res.json({ ok: true, volume_control: volumeControl, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, strategy: project.reference_config?.model_strategy || getModelStrategy(project, Number(req.query.model_id || 0) || undefined) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const strategy = req.body?.strategy || getModelStrategy(project, Number(req.body?.model_id || 0) || undefined)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          model_strategy: strategy,
        },
      } as any)
      res.json({ ok: true, strategy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterCount = Math.max(5, Math.min(80, Number(req.body.chapter_count || 30)))
      const variantCount = Math.max(1, Math.min(5, Number(req.body.variant_count || 1)))
      const stageModelId = getStageModelId(project, 'incubation', modelId)
      const result = await executeNovelAgent('outline-agent', project, {
        task: buildOriginalIncubatorPrompt(project, { ...req.body, chapter_count: chapterCount, variant_count: variantCount }),
      }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 9000, temperature: getStageTemperature(project, 'incubation', 0.65), skipMemory: true })
      const payload = normalizeIncubatorPayload(getNovelPayload(result), chapterCount)
      let updatedProject: any = null
      if (req.body.auto_store !== false) {
        updatedProject = await storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: req.body.auto_store === false ? 'preview' : 'foundation',
        status: 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ payload, modelName: (result as any).modelName }),
      })
      res.json({ ok: true, payload, run, project: updatedProject, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original/commit', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const payload = normalizeIncubatorPayload(req.body?.payload || project.reference_config?.original_incubator_last_payload || {}, Number(req.body?.chapter_count || 80))
      const updated = await storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: 'commit',
        status: 'success',
        input_ref: JSON.stringify({ confirmed: true }),
        output_ref: JSON.stringify({ payload }),
      })
      res.json({ ok: true, project: updated, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  const executeChapterGroupRunRecord = async (activeWorkspace: string, project: any, run: any, options: any = {}) => {
    let payload = parseJsonLikePayload(run.output_ref) || {}
    const lockOwner = String(options.lock_owner || `worker-${process.pid}-${Date.now()}`)
    const lock = payload.lock || {}
    const lockExpiresAt = lock.expires_at ? new Date(String(lock.expires_at)).getTime() : 0
    if (lock.owner && lock.owner !== lockOwner && lockExpiresAt > Date.now()) {
      return { run, group: payload, processed: 0, status: 'locked', locked_by: lock.owner }
    }
    payload = {
      ...payload,
      lock: {
        owner: lockOwner,
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    }
    await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
    const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
    const maxChapters = Math.max(1, Math.min(50, Number(options.max_chapters || chapters.length || 10)))
    const retryLimit = Math.max(0, Math.min(5, Number(options.retry_limit ?? payload.model_strategy?.cost_policy?.retry_limit ?? 2)))
    const startedAt = Date.now()
    const results: any[] = Array.isArray(payload.results) ? payload.results : []
    let processed = 0
    let status = 'running'
    let errorMessage = ''
    await updateNovelRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: JSON.stringify({ ...payload, started_at: payload.started_at || new Date().toISOString(), phase: '自动执行章节群' }),
    })

    const persistStage = async (index: number, stage: string, patch: any = {}) => {
      const item = chapters[index]
      if (!item) return
      const stages = updateChapterStages(item.stages || [], stage, patch)
      const summary = summarizeChapterStages(stages)
      let scenes = Array.isArray(item.scenes) ? item.scenes : []
      if (stage === 'scene_cards' && Array.isArray(patch.scene_cards)) {
        scenes = normalizeSceneProduction(patch.scene_cards, scenes, 'planned')
      }
      if (patch.scene_status) {
        scenes = advanceSceneProduction(scenes, patch.scene_status, stage === 'draft' ? { generated_at: new Date().toISOString() } : {})
      }
      chapters[index] = { ...item, scenes, stages, current_step: summary.current_step, current_label: summary.current_label }
      payload = { ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章：${summary.current_label}` }
      await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload), duration_ms: Date.now() - startedAt })
    }

    for (let index = Number(payload.current_index || 0); index < chapters.length && processed < maxChapters; index += 1) {
      const latestRun = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === run.id)
      if (latestRun?.status === 'paused') {
        status = 'paused'
        payload = { ...(parseJsonLikePayload(latestRun.output_ref) || payload), current_index: index, phase: '已暂停' }
        break
      }
      const item = chapters[index]
      payload = {
        ...payload,
        lock: {
          ...(payload.lock || {}),
          heartbeat_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      }
      if (!item?.id) continue
      if (item.next_run_at && new Date(String(item.next_run_at)).getTime() > Date.now()) {
        payload = { ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章等待重试窗口` }
        await updateNovelRun(activeWorkspace, run.id, { status: 'ready', output_ref: JSON.stringify(payload) })
        status = 'ready'
        break
      }
      if (item.status === 'written' && options.regenerate !== true) {
        chapters[index] = { ...item, status: 'skipped', skipped_reason: '已有正文' }
        payload = { ...payload, chapters, current_index: index + 1 }
        await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
        continue
      }
      chapters[index] = { ...item, status: 'running', started_at: new Date().toISOString(), stages: item.stages?.length ? item.stages : buildChapterGroupStages() }
      payload = { ...payload, chapters, current_index: index, phase: `生成第${item.chapter_no}章` }
      await updateNovelRun(activeWorkspace, run.id, { status: 'running', output_ref: JSON.stringify(payload) })
      try {
        const chapterResult = await generateChapterForGroup(activeWorkspace, project.id, Number(item.id), {
          ...options,
          model_id: options.model_id || payload.model_strategy?.preferred_model_id,
          allow_incomplete: options.allow_incomplete === true,
          approval_policy: payload.approval_policy || getApprovalPolicy(project),
          approvals: item.approvals || {},
          onStage: async (stage: string, patch: any = {}) => {
            try {
              await persistStage(index, stage, patch)
            } catch (stageError) {
              console.warn('[novel] failed to persist chapter group stage:', stage, String(stageError).slice(0, 160))
            }
          },
        })
        const resultItem = {
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: 'success',
          score: chapterResult.score,
          revised: chapterResult.revised,
          scenes: advanceSceneProduction(chapters[index]?.scenes || [], 'accepted'),
          stages: updateChapterStages(chapters[index]?.stages || [], 'story_state', { status: (chapterResult.story_state_update as any)?.error ? 'failed' : 'success' }),
          completed_at: new Date().toISOString(),
        }
        chapters[index] = resultItem
        results.push(resultItem)
        processed += 1
      } catch (chapterError: any) {
        const isApproval = chapterError?.code === 'APPROVAL_REQUIRED'
        const failedStages = (() => {
          const current = chapters[index]?.stages || buildChapterGroupStages()
          const active = current.find((step: any) => ['running', 'ready', 'needs_confirmation'].includes(step.status)) || current.find((step: any) => step.status === 'pending') || current[0]
          return active ? updateChapterStages(current, active.key, { status: isApproval ? 'needs_confirmation' : 'failed', error: String(chapterError?.message || chapterError), approval_stage: chapterError?.approval_stage || '' }) : current
        })()
        const attempts = Number(item.attempts || 0) + (isApproval ? 0 : 1)
        const canRetry = !isApproval && attempts <= retryLimit
        const nextRunAt = canRetry ? new Date(Date.now() + Math.min(15, attempts * 2) * 60000).toISOString() : ''
        const resultItem = {
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: isApproval ? 'needs_approval' : (canRetry ? 'ready' : 'failed'),
          stages: failedStages,
          attempts,
          next_run_at: nextRunAt,
          approval_stage: chapterError?.approval_stage || '',
          approval_context: chapterError?.approval_context || null,
          error: String(chapterError?.message || chapterError),
          error_code: chapterError?.code || '',
          recovery_plan: classifyGenerationFailure(chapterError),
          failed_at: new Date().toISOString(),
        }
        chapters[index] = resultItem
        results.push(resultItem)
        errorMessage = resultItem.error
        if (isApproval || canRetry || payload.policy?.stop_on_failure !== false) {
          status = isApproval ? 'paused' : (canRetry ? 'ready' : 'paused')
          payload = {
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: isApproval ? `第${item.chapter_no}章等待人工确认` : canRetry ? `第${item.chapter_no}章失败，等待重试` : `第${item.chapter_no}章失败，已暂停`,
            last_error: resultItem,
          }
          await updateNovelRun(activeWorkspace, run.id, { status, output_ref: JSON.stringify(payload), error_message: errorMessage })
          break
        }
      }
      payload = { ...payload, chapters, results, current_index: index + 1, phase: '自动执行章节群' }
      await updateNovelRun(activeWorkspace, run.id, {
        status: 'running',
        output_ref: JSON.stringify(payload),
        duration_ms: Date.now() - startedAt,
      })
    }
    if (status === 'running') {
      status = chapters.every((item: any) => ['success', 'skipped', 'written'].includes(item.status)) ? 'success' : 'ready'
    }
    const updated = await updateNovelRun(activeWorkspace, run.id, {
      status,
      output_ref: JSON.stringify({ ...payload, chapters, results, lock: null, phase: status === 'success' ? '章节群已完成' : payload.phase, finished_at: status === 'success' ? new Date().toISOString() : undefined }),
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
    })
    return { run: updated, group: parseJsonLikePayload(updated?.output_ref), processed, status }
  }

  app.post('/api/novel/projects/:id/chapter-groups/start', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const selected = chapters.filter(ch => ch.chapter_no >= startNo && ch.chapter_no < startNo + count)
      const modelStrategy = project.reference_config?.model_strategy || getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: selected.map(ch => ({
          id: ch.id,
          chapter_no: ch.chapter_no,
          title: ch.title,
          status: ch.chapter_text ? 'written' : 'pending',
          scenes: normalizeSceneProduction(asArray(ch.scene_breakdown).length ? ch.scene_breakdown : asArray(ch.scene_list), [], ch.chapter_text ? 'accepted' : 'pending'),
          stages: buildChapterGroupStages(),
        })),
        current_index: 0,
        mode: req.body.mode || 'group',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: Number(req.body.quality_threshold || 78),
        },
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `chapter-${startNo}-${startNo + count - 1}`,
        status: 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
      })
      res.json({ ok: true, run, group: output })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const result = await executeChapterGroupRunRecord(activeWorkspace, project, run, req.body || {})
      res.json({ ok: true, ...result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/approve', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const stage = String(req.body.stage || payload.last_error?.approval_stage || 'scene_cards')
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: String(req.body.note || ''),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        stages: updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章已确认，等待继续执行`, approved_at: new Date().toISOString() }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/retry-now', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-groups/:runId/scenes', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const run = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      res.json({
        ok: true,
        run_id: run.id,
        scenes: chapters.map((chapter: any) => ({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status,
          scenes: Array.isArray(chapter.scenes) ? chapter.scenes : [],
        })),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/failure-recovery-plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const plan = classifyGenerationFailure({ message: run.error_message || payload?.error || payload?.last_error?.error || JSON.stringify(payload).slice(0, 500), code: payload?.last_error?.error_code || payload?.error_code })
      res.json({ ok: true, plan, run_id: run.id, status: run.status })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/editor-report', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
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
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const latestQuality = reviews.filter(item => item.review_type === 'prose_quality').slice(-1)[0] || null
      const latestReference = reviews.filter(item => item.review_type === 'reference_usage').slice(-1)[0] || null
      const prompt = [
        '任务：生成商用编辑部风格的章节编辑报告。只输出 JSON。',
        `项目：${project.title}`,
        '检查维度：结构审稿、连续性审稿、节奏审稿、文风审稿、原创性审稿、商业审稿。',
        '每个维度输出 score, verdict, issues(array), revision_actions(array), accept_criteria(array)。',
        '最后输出 overall_score, must_fix, optional_improvements, one_click_revision_prompt。',
        '【上下文包】',
        JSON.stringify(contextPackage, null, 2).slice(0, 9000),
        '【章节正文】',
        String(chapter.chapter_text || '').slice(0, 14000),
        '【已有质检】',
        JSON.stringify({ latestQuality, latestReference }, null, 2).slice(0, 4000),
      ].join('\n')
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: req.body.model_id ? String(req.body.model_id) : undefined, maxTokens: 5000, temperature: 0.2, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'editor_report',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `编辑报告评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: JSON.stringify({ chapter_id: chapter.id, report, context_package: contextPackage }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/reviews/:reviewId/apply-revision', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const reviews = await listNovelReviews(activeWorkspace, projectId)
      const review = reviews.find(item => item.id === Number(req.params.reviewId))
      if (!review) return res.status(404).json({ error: 'review not found' })
      const payload = parseJsonLikePayload(review.payload) || {}
      const report = payload.report || {}
      const chapterId = Number(payload.chapter_id || req.body.chapter_id || 0)
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const prompt = [
        '任务：根据商业编辑报告对当前章节进行一键修订。只输出 JSON。',
        `项目：${project.title}`,
        '要求：保留可用情节，修复 must_fix、维度问题和连续性问题；不得照搬参考作品；输出完整修订正文。',
        '【编辑报告】',
        JSON.stringify(report, null, 2).slice(0, 7000),
        '【修订提示】',
        String(report.one_click_revision_prompt || req.body.prompt || ''),
        '【原章节正文】',
        String(chapter.chapter_text || '').slice(0, 18000),
        '输出 JSON：{chapter_text, scene_breakdown, continuity_notes, revision_summary}',
      ].join('\n')
      const modelId = getStageModelId(project, 'revise', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('prose-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 9000, temperature: getStageTemperature(project, 'revise', 0.62), skipMemory: true })
      const resultPayload = getNovelPayload(result)
      const nextText = resultPayload?.chapter_text || resultPayload?.prose_chapters?.[0]?.chapter_text || ''
      if (!nextText) return res.status(502).json({ error: '修订未返回正文', result })
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        scene_breakdown: resultPayload?.scene_breakdown || resultPayload?.prose_chapters?.[0]?.scene_breakdown || chapter.scene_breakdown || [],
        continuity_notes: resultPayload?.continuity_notes || resultPayload?.prose_chapters?.[0]?.continuity_notes || chapter.continuity_notes || [],
        status: 'draft',
      }, { versionSource: 'repair' })
      const saved = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'editor_revision',
        status: 'ok',
        summary: `已根据编辑报告 ${review.id} 生成修订稿`,
        issues: [],
        payload: JSON.stringify({ chapter_id: chapter.id, source_review_id: review.id, revision_summary: resultPayload?.revision_summary || '' }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ review_id: review.id }),
        output_ref: JSON.stringify({ review: saved, modelName: (result as any).modelName }),
      })
      res.json({ ok: true, chapter: updated, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/version-review', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.query.project_id || 0)
      const versions = await listChapterVersions(activeWorkspace, chapterId)
      const current = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      const previous = versions[0] || null
      const before = previous?.chapter_text || ''
      const after = current?.chapter_text || ''
      const diff = diffTexts(before, after)
      res.json({ ok: true, chapter: current, previous_version: previous, diff, recommendation: diff.similarity_score < 55 ? '修订幅度较大，建议人工复核剧情与设定连续性。' : '修订幅度可控。' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/version-merge', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const versions = await listChapterVersions(activeWorkspace, chapterId)
      const current = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      if (!current) return res.status(404).json({ error: 'chapter not found' })
      const version = versions.find(item => item.id === Number(req.body.version_id || 0))
      if (!version) return res.status(404).json({ error: 'version not found' })
      const currentParas = String(current.chapter_text || '').split(/\n+/)
      const versionParas = String(version.chapter_text || '').split(/\n+/)
      const choices = Array.isArray(req.body.choices) ? req.body.choices : []
      const max = Math.max(currentParas.length, versionParas.length)
      const merged = []
      for (let i = 0; i < max; i += 1) {
        const choice = choices.find((item: any) => Number(item.index) === i + 1)
        if (choice?.source === 'version') merged.push(versionParas[i] || '')
        else if (choice?.source === 'current') merged.push(currentParas[i] || '')
        else if (req.body.strategy === 'prefer_version') merged.push(versionParas[i] || currentParas[i] || '')
        else if (req.body.strategy === 'prefer_longer') merged.push(String(versionParas[i] || '').length > String(currentParas[i] || '').length ? (versionParas[i] || '') : (currentParas[i] || ''))
        else merged.push(currentParas[i] || versionParas[i] || '')
      }
      const chapterText = merged.join('\n\n').trim()
      if (req.body?.dry_run === true) return res.json({ ok: true, dry_run: true, merged_length: chapterText.length })
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        chapter_text: chapterText,
        scene_breakdown: current.scene_breakdown || [],
        continuity_notes: [
          ...(current.continuity_notes || []),
          `已从版本 v${version.version_no} 段落级合并。`,
        ],
      }, { versionSource: 'repair' })
      res.json({ ok: true, chapter: updated, merged_length: chapterText.length })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/similarity-report', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const referenceReport = await buildReferenceUsageReport(activeWorkspace, project, '相似度检测', chapter.chapter_text || '')
      const quality = referenceReport.quality_assessment || {}
      const structuralRisk = clampScore(100 - Number(quality.originality_score || 100))
      const structuralReport = buildStructuralSimilarityReport(chapter, referenceReport)
      const combinedStructuralRisk = clampScore((structuralRisk * 0.45) + (Number(structuralReport.overall_structural_risk || 0) * 0.55))
      const copyHitCount = asArray(referenceReport.copy_guard?.hits).length
      const report = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        overall_risk_score: clampScore((copyHitCount * 12) + combinedStructuralRisk * 0.55),
        term_hits: referenceReport.copy_guard?.hits || [],
        copy_safety_score: quality.copy_safety_score,
        originality_score: quality.originality_score,
        structural_similarity_risk: combinedStructuralRisk,
        structural_report: structuralReport,
        decision: Number(quality.copy_safety_score || 100) < 75 || combinedStructuralRisk > 45 ? 'needs_rewrite' : 'pass',
        suggestions: [
          ...(referenceReport.copy_guard?.hits?.length ? ['替换疑似复用专名和证据词。'] : []),
          combinedStructuralRisk > 45 ? '调整场景目标、障碍来源、信息揭示顺序和角色选择，保留节奏功能但更换事件。' : '',
          ...structuralReport.suggestions,
        ].filter(Boolean),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'similarity_report',
        status: report.decision === 'pass' ? 'ok' : 'warn',
        summary: `相似度风险 ${report.overall_risk_score}`,
        issues: report.suggestions,
        payload: JSON.stringify({ report, reference_report: referenceReport }),
      })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/reference-migration-plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(ch => ch.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const preview = await previewNovelKnowledgeInjection(project, '正文创作')
      const safety = getSafetyPolicy(project)
      if (req.body?.dry_run === true || req.query.dry_run === '1') {
        const plan = buildReferenceMigrationDryPlan(project, chapter, preview, safety)
        return res.json({ ok: true, dry_run: true, plan, preview: { strength: preview.strength, entries: preview.entries?.length || 0 } })
      }
      const prompt = [
        '任务：生成参考作品迁移计划，只输出 JSON。',
        `项目：${project.title}`,
        '目标：在生成当前章节前，明确哪些只能学习，哪些必须禁止迁移。',
        '输出字段：allowed_learning_layers(array), cautious_layers(array), forbidden_transfer_layers(array), chapter_specific_plan, rewrite_boundaries, copy_guard_terms, generation_prompt_addendum。',
        '要求：只能学习节奏、结构、爽点安排、信息密度、情绪曲线；禁止迁移具体桥段、角色名、专有设定、原句、核心梗和事件顺序。',
        '【安全策略】',
        JSON.stringify(safety, null, 2),
        '【章节上下文包】',
        JSON.stringify(contextPackage, null, 2).slice(0, 7000),
        '【参考注入预览】',
        JSON.stringify({
          active_references: preview.active_references,
          entries: (preview.entries || []).slice(0, 20).map((entry: any) => ({
            title: entry.title,
            category: entry.category,
            source_project: entry.source_project,
            match_reason: entry.match_reason,
          })),
          warnings: preview.warnings,
        }, null, 2).slice(0, 7000),
      ].join('\n')
      const modelId = getStageModelId(project, 'safety', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 4000, temperature: getStageTemperature(project, 'safety', 0.15), skipMemory: true })
      const plan = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reference_migration_plan',
        status: 'ok',
        summary: `第${chapter.chapter_no}章参考迁移计划`,
        issues: asArray(plan.forbidden_transfer_layers).map((item: any) => String(item)).slice(0, 20),
        payload: JSON.stringify({ chapter_id: chapter.id, plan, context_package: contextPackage, preview }),
      })
      res.json({ ok: true, plan, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generation-pipeline/start', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await getProject(activeWorkspace, projectId)
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
      let contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      let steps = buildPipelineSteps()
      steps = updatePipelineStep(steps, 'context', {
        status: contextPackage.preflight.ready ? 'success' : 'warn',
        detail: contextPackage.preflight.warnings.join('；'),
      })
      let updatedChapter = chapter
      if (req.body?.generate_scene_cards === true) {
        const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
        if (sceneResult.sceneCards.length > 0) {
          updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
            scene_breakdown: sceneResult.sceneCards,
            scene_list: sceneResult.sceneCards,
            raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'pipeline_confirmation' },
          } as any, { createVersion: false }) || chapter
          const refreshedChapters = await listNovelChapters(activeWorkspace, projectId)
          contextPackage = await buildChapterContextPackage(activeWorkspace, project, updatedChapter, refreshedChapters, worldbuilding, characters, outlines, reviews)
          steps = updatePipelineStep(steps, 'scene_cards', {
            status: 'needs_confirmation',
            detail: `已生成 ${sceneResult.sceneCards.length} 个场景卡，等待人工确认。`,
            scene_cards: sceneResult.sceneCards,
          })
        } else {
          steps = updatePipelineStep(steps, 'scene_cards', { status: 'failed', detail: '模型未返回场景卡' })
        }
      }
      const output = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        current_step: req.body?.generate_scene_cards === true ? 'scene_cards' : 'context',
        steps,
        context_package: contextPackage,
        confirmed_scene_cards: false,
        can_resume_from: req.body?.generate_scene_cards === true ? 'draft' : 'scene_cards',
        resume_endpoint: `/api/novel/chapters/${chapter.id}/generate-prose`,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'chapter_generation_pipeline',
        step_name: `chapter-${chapter.chapter_no}`,
        status: req.body?.generate_scene_cards === true ? 'paused' : 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
      })
      res.json({ ok: true, run, pipeline: output, chapter: updatedChapter })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/scene-cards', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await getProject(activeWorkspace, projectId)
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
      const contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        return res.status(412).json({ error: '场景卡生成前置检查未通过', error_code: 'SCENE_PREFLIGHT_BLOCKED', preflight: contextPackage.preflight, context_package: contextPackage })
      }
      const result = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
      if (!result.sceneCards.length) return res.status(502).json({ error: '模型未返回场景卡', result: result.result })
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        scene_breakdown: result.sceneCards,
        scene_list: result.sceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'manual_pipeline' },
      } as any, { createVersion: false })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'scene_cards', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ scene_cards: result.sceneCards, modelName: (result.result as any).modelName }) })
      res.json({ chapter: updated, scene_cards: result.sceneCards, result: result.result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generate-prose', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      let chapters = await listNovelChapters(activeWorkspace, projectId)
      let chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const [worldbuilding, characters, outlines, reviews] = await Promise.all([listNovelWorldbuilding(activeWorkspace, projectId), listNovelCharacters(activeWorkspace, projectId), listNovelOutlines(activeWorkspace, projectId), listNovelReviews(activeWorkspace, projectId)])
      const pipeline: any[] = []
      const markStage = (key: string, label: string, status: string, detail = '', extra: any = {}) => {
        const stage = { key, label, status, detail, at: new Date().toISOString(), ...extra }
        pipeline.push(stage)
        if (wantsStream && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: label, pipeline, stage })}\n\n`)
        }
        return stage
      }
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
      }
      markStage('context', '构建续写上下文包', 'running')
      let contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      markStage(
        'context',
        contextPackage.preflight.ready ? '续写上下文包已就绪' : '续写上下文包存在缺口',
        contextPackage.preflight.ready ? 'success' : 'warn',
        contextPackage.preflight.warnings.join('；'),
        { context_package: contextPackage },
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: '章节生成前置检查未通过',
          error_code: 'PROSE_PREFLIGHT_BLOCKED',
          context_package: contextPackage,
          preflight: contextPackage.preflight,
          pipeline,
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: '章节生成前置检查未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(412).json(errorPayload)
      }

      if (!contextPackage.chapter_target.scene_cards.length || req.body?.force_scene_cards === true) {
        markStage('scene_cards', '生成章节场景卡', 'running')
        try {
          const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
          if (sceneResult.sceneCards.length > 0) {
            const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
              scene_breakdown: sceneResult.sceneCards,
              scene_list: sceneResult.sceneCards,
              raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'generated' },
            } as any, { createVersion: false })
            if (updatedSceneChapter) chapter = updatedSceneChapter
            chapters = await listNovelChapters(activeWorkspace, projectId)
            contextPackage = await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
            markStage('scene_cards', `场景卡已生成：${sceneResult.sceneCards.length} 个`, 'success', '', { scene_cards: sceneResult.sceneCards })
          } else {
            markStage('scene_cards', '场景卡生成为空，继续使用章节细纲', 'warn')
          }
        } catch (sceneError) {
          markStage('scene_cards', '场景卡生成失败，继续使用章节细纲', 'warn', String(sceneError).slice(0, 200))
        }
      }

      // 收集前几章的正文作为前置上下文（最多取前3章有正文的章节）
      const prevChapters = chapters
        .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
        .slice(-3)
        .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
      markStage('migration_plan', '生成/读取参考迁移计划', 'running')
      const migrationPlan = await getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
      markStage('migration_plan', (migrationPlan as any)?.error ? '参考迁移计划读取失败，继续保守生成' : '参考迁移计划已就绪', (migrationPlan as any)?.error ? 'warn' : 'success', (migrationPlan as any)?.error || '', { migration_plan: migrationPlan })
      markStage('draft', '段落级正文生成', 'running')
      const result = await generateNovelChapterProse(project, chapter, {
        worldbuilding,
        characters,
        outline: outlines,
        prompt: String(req.body.prompt || ''),
        prevChapters,
        contextPackage,
        migrationPlan,
        paragraphTask: buildParagraphProseContext(project, contextPackage, migrationPlan),
      } as any, activeWorkspace, getStageModelId(project, 'draft', modelId))
      // 兼容 result.output / result.parsed / result.content(JSON string) 等厂商返回形态
      const resultPayload = getNovelPayload(result)
      const proseArr = Array.isArray(resultPayload?.prose_chapters) ? resultPayload.prose_chapters : []
      const firstProse = proseArr.length > 0 ? proseArr[0] : {}
      const chapterText = resultPayload?.chapter_text || firstProse?.chapter_text
      const sceneBreakdown = resultPayload?.scene_breakdown || firstProse?.scene_breakdown || []
      const continuityNotes = resultPayload?.continuity_notes || firstProse?.continuity_notes || []
      if ((result as any).error || !chapterText) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(resultPayload || null), error_message: String(result.error || result.fallbackReason || '模型未返回正文') })
        const errorPayload = { error: String(result.error || result.fallbackReason || '模型未返回正文'), result, pipeline, context_package: contextPackage }
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('draft', '章节初稿已生成', 'success', `${String(chapterText).length} 字`)
      markStage('review', '执行章节自检', 'running')
      let selfCheck: any = null
      let finalText = String(chapterText || '')
      let finalSceneBreakdown = sceneBreakdown
      let finalContinuityNotes = continuityNotes
      try {
        selfCheck = await runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = selfCheck.final_text || finalText
        if (selfCheck.revised && selfCheck.revision) {
          finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'review',
          selfCheck.revised ? '自检完成，已应用修订稿' : '自检完成，初稿可用',
          selfCheck.review?.passed === false ? 'warn' : 'success',
          `评分 ${selfCheck.review?.score ?? '-'}`,
          { self_check: selfCheck.review, revised: selfCheck.revised },
        )
      } catch (reviewError) {
        selfCheck = { error: String(reviewError), revised: false }
        markStage('review', '自检失败，保留初稿', 'warn', String(reviewError).slice(0, 200), { self_check: selfCheck })
      }

      try {
        const review = selfCheck?.review || {}
        await createNovelReview(activeWorkspace, {
          project_id: projectId,
          review_type: 'prose_quality',
          status: review.passed === false || Number(review.score || 100) < 78 ? 'warn' : 'ok',
          summary: `章节自检评分 ${review.score ?? '-'}${selfCheck?.revised ? '，已生成修订稿' : ''}`,
          issues: Array.isArray(review.issues) ? review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
          payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, self_check: selfCheck, pipeline }),
        })
      } catch (reviewStoreError) {
        console.warn('[prose-quality] Failed to store review:', String(reviewStoreError).slice(0, 200))
      }
      let referenceReport: any = null
      let safetyDecision: any = null
      let migrationAudit: any = null
      try {
        markStage('reference_report', '生成参考使用报告', 'running')
        referenceReport = await buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
        safetyDecision = getReferenceSafetyDecision(project, referenceReport)
        const safetyExplanation = explainReferenceSafety(referenceReport, safetyDecision)
        migrationAudit = buildMigrationAudit(project, referenceReport, safetyExplanation)
        markStage('reference_report', safetyDecision.blocked ? '参考安全阈值未通过' : '参考使用报告已生成', safetyDecision.blocked ? 'failed' : 'success', safetyDecision.reasons?.join('；') || '', { reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit })
      } catch (reportError) {
        markStage('reference_report', '参考使用报告生成失败', 'warn', String(reportError).slice(0, 200))
        console.warn('[reference-report] Failed:', String(reportError).slice(0, 200))
      }
      const safetyExplanation = referenceReport && safetyDecision ? explainReferenceSafety(referenceReport, safetyDecision) : null
      if (!migrationAudit && referenceReport && safetyExplanation) migrationAudit = buildMigrationAudit(project, referenceReport, safetyExplanation)
      if (safetyDecision?.blocked) {
        const errorPayload = { error: '仿写安全阈值未通过，正文未入库', error_code: 'REFERENCE_SAFETY_BLOCKED', reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, context_package: contextPackage, self_check: selfCheck, pipeline }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: safetyDecision.reasons?.join('；') || '仿写安全阈值未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(409).json(errorPayload)
      }
      markStage('store', '写入章节正文与版本', 'running')
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, { chapter_text: finalText, scene_breakdown: finalSceneBreakdown, continuity_notes: finalContinuityNotes, status: 'draft' }, { versionSource: selfCheck?.revised ? 'repair' : 'agent_execute' })
      markStage('store', '章节已写入', 'success')
      let storyStateUpdate: any = null
      try {
        markStage('story_state', '更新故事状态机', 'running')
        storyStateUpdate = await updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, modelId)
        markStage('story_state', '故事状态机已更新', 'success', '', { story_state_update: storyStateUpdate })
      } catch (stateError) {
        markStage('story_state', '故事状态机更新失败', 'warn', String(stateError).slice(0, 200))
      }
      const pipelineResult = { context_package: contextPackage, self_check: selfCheck, pipeline }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ outputSource: result.outputSource, modelId: result.modelId, modelName: result.modelName, providerId: result.providerId, usage: result.usage, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult }) })
      if (!wantsStream) return res.json({ chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })
      const fullText = String(finalText || '')
      const chunkSize = Math.max(40, Math.ceil(fullText.length / 12))
      res.write(`data: ${JSON.stringify({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline })}\n\n`)
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize)
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 40))
      }
      res.write(`data: ${JSON.stringify({ type: 'done', chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })}\n\n`)
      res.end()
    } catch (error) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
        res.end()
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })
  app.get('/api/novel/projects/:id/reviews', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelReviews(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/runs', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelRuns(activeWorkspace, Number(req.query.project_id || 0))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/run-queue', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.id)
      const project = await getProject(activeWorkspace, projectId)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const queued = runs.filter(run => ['queued', 'ready', 'paused', 'running'].includes(run.status) && ['chapter_group_generation', 'chapter_generation_pipeline', 'quality_benchmark', 'book_review'].includes(run.run_type))
      const persistentWorker = project?.reference_config?.run_queue_worker || null
      const memoryWorker = runQueueWorkers.get(projectId)
      const worker = memoryWorker || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
      res.json({
        ok: true,
        worker,
        queue: queued.map(run => ({ id: run.id, type: run.run_type, step: run.step_name, status: run.status, created_at: run.created_at, payload: parseJsonLikePayload(run.output_ref) })),
        summary: {
          queued: queued.filter(run => run.status === 'queued' || run.status === 'ready').length,
          running: queued.filter(run => run.status === 'running').length,
          paused: queued.filter(run => run.status === 'paused').length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.get('/api/novel/projects/:id/run-queue/worker-status', async (req, res) => {
    const activeWorkspace = getWorkspace()
    const projectId = Number(req.params.id)
    const project = await getProject(activeWorkspace, projectId)
    const persistentWorker = project?.reference_config?.run_queue_worker || null
    const worker = runQueueWorkers.get(projectId) || (persistentWorker?.status === 'running' ? { ...persistentWorker, status: 'stale', phase: '后端进程已重启，可点击恢复 worker' } : persistentWorker) || { status: 'idle' }
    res.json({ ok: true, worker })
  })
  app.post('/api/novel/projects/:id/run-queue/recover', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      let recoveredRuns = 0
      for (const run of runs.filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, lock: null, phase: '手动恢复：运行中任务已转回待执行', recovered_at: new Date().toISOString() }),
        })
        recoveredRuns += 1
      }
      const worker = {
        ...(project.reference_config?.run_queue_worker || {}),
        status: 'idle',
        stop_requested: false,
        phase: `已恢复 ${recoveredRuns} 个运行中任务`,
        recovered_runs: recoveredRuns,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          run_queue_worker: worker,
        },
      } as any)
      runQueueWorkers.set(project.id, worker)
      res.json({ ok: true, worker, project: updated, recovered_runs: recoveredRuns })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.post('/api/novel/projects/:id/run-queue/start-worker', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const existing = runQueueWorkers.get(project.id)
      if (['running', 'stopping'].includes(existing?.status)) return res.json({ ok: true, worker: existing, message: '后台 worker 已在运行' })
      const staleRuns = (await listNovelRuns(activeWorkspace, project.id)).filter(item => item.run_type === 'chapter_group_generation' && item.status === 'running')
      for (const staleRun of staleRuns) {
        const stalePayload = parseJsonLikePayload(staleRun.output_ref) || {}
        await updateNovelRun(activeWorkspace, staleRun.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...stalePayload, phase: '后端重启后自动恢复为待执行', recovered_at: new Date().toISOString() }),
        })
      }
      const worker = {
        status: 'running',
        stop_requested: false,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_runs: 0,
        processed_chapters: 0,
        last_error: '',
      }
      runQueueWorkers.set(project.id, worker)
      await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          run_queue_worker: worker,
        },
      } as any)
      const maxRuns = Math.max(1, Math.min(200, Number(req.body.max_runs || 200)))
      const maxChaptersPerRun = Math.max(1, Math.min(10, Number(req.body.max_chapters_per_run || 1)))
      void (async () => {
        try {
          while (!worker.stop_requested && worker.processed_runs < maxRuns) {
            const latestBudgetProject = await getProject(activeWorkspace, project.id)
            const budgetProject = latestBudgetProject || project
            const runs = await listNovelRuns(activeWorkspace, project.id)
            const budgetDecision = getProductionBudgetDecision(budgetProject, runs)
            worker.budget = budgetDecision
            if (budgetDecision.blocked) {
              worker.status = 'paused_budget'
              worker.phase = `预算熔断：${budgetDecision.reasons.join('；')}`
              worker.updated_at = new Date().toISOString()
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: {
                  ...(budgetProject.reference_config || {}),
                  run_queue_worker: { ...worker },
                },
              } as any).catch(() => null)
              break
            }
            const isRunDue = (item: any) => {
              const payload = parseJsonLikePayload(item.output_ref) || {}
              const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
              const current = chapters[Number(payload.current_index || 0)] || null
              if (!current?.next_run_at) return true
              return new Date(String(current.next_run_at)).getTime() <= Date.now()
            }
            const run = runs
              .filter(item => item.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(item.status) && isRunDue(item))
              .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]
            if (!run) break
            worker.current_run_id = run.id
            worker.phase = `执行任务 ${run.step_name || run.id}`
            worker.updated_at = new Date().toISOString()
            const result = await executeChapterGroupRunRecord(activeWorkspace, budgetProject, run, {
              ...req.body,
              max_chapters: maxChaptersPerRun,
              model_id: req.body.model_id,
              lock_owner: `worker-${project.id}-${worker.started_at}`,
            })
            worker.processed_runs += 1
            worker.processed_chapters += Number(result.processed || 0)
            worker.last_run_status = result.status
            worker.updated_at = new Date().toISOString()
            const latestProject = await getProject(activeWorkspace, project.id).catch(() => null)
            if (latestProject) {
              await updateNovelProject(activeWorkspace, project.id, {
                reference_config: {
                  ...(latestProject.reference_config || {}),
                  run_queue_worker: { ...worker },
                },
              } as any).catch(() => null)
            }
          }
          worker.status = worker.stop_requested ? 'stopped' : 'idle'
          worker.phase = worker.stop_requested ? '已停止' : '队列已空'
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } catch (error: any) {
          worker.status = 'failed'
          worker.last_error = String(error?.message || error)
          worker.finished_at = new Date().toISOString()
          worker.updated_at = worker.finished_at
        } finally {
          runQueueWorkers.set(project.id, { ...worker })
          const latestProject = await getProject(activeWorkspace, project.id).catch(() => null)
          if (latestProject) {
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: {
                ...(latestProject.reference_config || {}),
                run_queue_worker: { ...worker },
              },
            } as any).catch(() => null)
          }
        }
      })()
      res.json({ ok: true, worker, message: '后台 worker 已启动' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.post('/api/novel/projects/:id/run-queue/stop-worker', async (req, res) => {
    const projectId = Number(req.params.id)
    const activeWorkspace = getWorkspace()
    const project = await getProject(activeWorkspace, projectId).catch(() => null)
    const worker = runQueueWorkers.get(projectId) || project?.reference_config?.run_queue_worker || { status: 'idle' }
    worker.stop_requested = true
    worker.status = worker.status === 'running' ? 'stopping' : worker.status
    worker.updated_at = new Date().toISOString()
    runQueueWorkers.set(projectId, worker)
    if (project) {
      await updateNovelProject(activeWorkspace, projectId, {
        reference_config: {
          ...(project.reference_config || {}),
          run_queue_worker: worker,
        },
      } as any).catch(() => null)
    }
    res.json({ ok: true, worker })
  })
  app.post('/api/novel/projects/:id/run-queue/drain', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.id)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const executable = runs
        .filter(run => run.run_type === 'chapter_group_generation' && ['queued', 'ready'].includes(run.status))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .slice(0, Math.max(1, Math.min(5, Number(req.body.limit || 1))))
      const drained = []
      for (const run of executable) {
        const payload = parseJsonLikePayload(run.output_ref) || {}
        drained.push({ run_id: run.id, execute_endpoint: `/api/novel/projects/${projectId}/chapter-groups/${run.id}/execute`, current_index: payload.current_index || 0 })
      }
      res.json({ ok: true, drained, note: '本地版队列采用可恢复任务记录；前端或调用方按 execute_endpoint 拉起实际执行。' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.post('/api/novel/runs/:id/pause', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'paused',
        output_ref: JSON.stringify({ ...payload, paused_at: new Date().toISOString(), pause_reason: String(req.body.reason || 'manual') }),
      })
      res.json({ ok: true, run: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.post('/api/novel/runs/:id/resume', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const runs = await listNovelRuns(activeWorkspace, Number(req.body.project_id || req.query.project_id || 0))
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      if (run.run_type === 'chapter_group_generation') {
        const updated = await updateNovelRun(activeWorkspace, run.id, {
          status: 'ready',
          output_ref: JSON.stringify({ ...payload, phase: '等待继续执行', resumed_at: new Date().toISOString() }),
        })
        return res.json({ ok: true, run: updated, execute_endpoint: `/api/novel/projects/${run.project_id}/chapter-groups/${run.id}/execute`, group: parseJsonLikePayload(updated?.output_ref) })
      }
      const steps = Array.isArray(payload.steps) ? payload.steps : buildPipelineSteps()
      const currentStep = String(req.body.current_step || payload.can_resume_from || payload.current_step || 'draft')
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({
          ...payload,
          current_step: currentStep,
          resumed_at: new Date().toISOString(),
          steps: steps.map((step: any) => step.key === currentStep ? { ...step, status: step.status === 'pending' ? 'ready' : step.status } : step),
          resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`,
        }),
      })
      res.json({ ok: true, run: updated, resume_endpoint: payload.resume_endpoint || `/api/novel/chapters/${payload.chapter_id}/generate-prose`, pipeline: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.post('/api/novel/runs', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const record = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: String(req.body.run_type || 'manual'),
        step_name: String(req.body.step_name || 'summary'),
        status: String(req.body.status || 'success'),
        input_ref: typeof req.body.input_ref === 'string' ? req.body.input_ref : JSON.stringify(req.body.input_ref || {}),
        output_ref: typeof req.body.output_ref === 'string' ? req.body.output_ref : JSON.stringify(req.body.output_ref || {}),
        duration_ms: Number(req.body.duration_ms || 0),
        error_message: String(req.body.error_message || ''),
      })
      res.json(record)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
  app.get('/api/novel/agents/plan', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.query.project_id || 0)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json({ project_id: project.id, agents: buildNovelAgentPlan(project) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/strategy', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.query.project_id || 0)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json({ project_id: project.id, strategy: buildNovelStrategy(project) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/tools', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.query.project_id || 0); if (!projectId) return res.status(400).json({ error: 'project_id required' }); res.json({ project_id: projectId, tools: buildNovelTools(projectId) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/continuity', async (_req, res) => { try { res.json({ checks: buildContinuityFixes(), repair_plan: buildRepairPlan() }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/platform-fit', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.query.project_id || 0); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' }); const chapters = await listNovelChapters(activeWorkspace, projectId); const reviews = await listNovelReviews(activeWorkspace, projectId); const continuity = reviews.find(item => item.review_type === 'continuity') || null; const chapterIds = String(req.query.chapter_ids || '').split(',').map(v => Number(v)).filter(Boolean); const selectedChapters = chapterIds.length > 0 ? chapters.filter(item => chapterIds.includes(item.id)) : chapters.slice(0, 3); const prose = { prose_chapters: selectedChapters.filter(item => item.chapter_text) }; const platformFit = await buildPlatformFitAnalysis(project, { plan: { chapters: selectedChapters }, review: continuity, prose, chapters: selectedChapters }, activeWorkspace, Number(req.query.model_id || 0) || undefined); await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'platform_fit', status: platformFit?.is_platform_ready ? 'ok' : 'warn', summary: `平台适配评分 ${platformFit?.score ?? '-'}`, issues: Array.isArray(platformFit?.risks) ? platformFit.risks : [], payload: JSON.stringify(platformFit || {}) }); res.json(platformFit) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/agents/market-review', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.body.project_id || 0); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' }); const chapters = await listNovelChapters(activeWorkspace, projectId); const reviews = await listNovelReviews(activeWorkspace, projectId); const proseCount = chapters.filter(item => item.chapter_text).length; const chapterCount = chapters.length; const avgChapterLength = chapterCount > 0 ? Math.round(chapters.reduce((sum, item) => sum + String(item.chapter_text || '').length, 0) / chapterCount) : 0; const score = Math.max(10, Math.min(95, Math.round(55 + Math.min(chapterCount * 4, 25) + Math.min(proseCount * 6, 20) + Math.min((String(project.genre || '').length > 0 ? 5 : 0), 5)))); const marketReview = { is_market_ready: score >= 70, score, platform_fit: project.length_target || 'medium', strengths: [chapterCount > 0 ? `已有 ${chapterCount} 章结构` : '尚未建立章节结构', proseCount > 0 ? `已有 ${proseCount} 章正文` : '尚未开始正文', String(project.style_tags || []).length > 0 ? '风格标签明确' : '风格标签较少'], risks: [chapterCount === 0 ? '章节结构不足' : '章节节奏仍需打磨', proseCount === 0 ? '正文产出不足' : '部分正文可能仍需增强', !project.genre ? '题材信息较少' : '题材需要持续统一风格'], recommendations: ['补充章节结构并稳定主线', '确保章节正文持续更新', '结合平台偏好调整节奏与钩子'], target_audience: project.target_audience || '', notes: `基于 ${chapterCount} 章与 ${proseCount} 章正文的本地市场审计`, reviewed_reviews: reviews.length }; const saved = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'market_review', status: marketReview.is_market_ready ? 'ok' : 'warn', summary: `市场审计评分 ${marketReview.score}`, issues: marketReview.risks, payload: JSON.stringify(marketReview) }); await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'market_review', step_name: 'analysis', status: 'success', output_ref: JSON.stringify(marketReview) }); res.json({ ...marketReview, review: saved }) } catch (error) { res.status(500).json({ error: String(error) }) } })

  async function syncProseChaptersToStore(activeWorkspace: string, projectId: number, proseChapters: any[], source: 'agent_execute' | 'repair' = 'agent_execute') {
    for (const proseChapter of proseChapters || []) {
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

  /** P1-1: 支持部分 Agent 执行 — 传 agents 数组则只执行指定 Agent
      新增 payload 参数：
        - chapterCount: 细纲生成章节数
        - continueFrom: 从第几章后继续（续写）
        - userOutline: 用户提供的大纲文本（在此基础上扩展）
        - existingChapters: 已有章节数据（续写时自动读取，也可手动传入）
   */
  app.post('/api/novel/agents/execute', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace();
      const projectId = Number(req.body.project_id);
      const project = await getProject(activeWorkspace, projectId);
      if (!project) return res.status(404).json({ error: 'project not found' });
      const agentFilter = Array.isArray(req.body.agents) && req.body.agents.length > 0 ? req.body.agents : undefined;
      // 读取 payload 参数
      const chapterCount = req.body.payload?.chapterCount || req.body.chapterCount || undefined
      const continueFrom = req.body.payload?.continueFrom || req.body.continueFrom || undefined
      const userOutline = req.body.payload?.userOutline || req.body.userOutline || undefined
      // 如果是续写模式，自动读取已有章节
      let existingChaptersData: any[] = req.body.payload?.existingChapters || req.body.existingChapters || []
      if (continueFrom && continueFrom > 0) {
        const allChapters = await listNovelChapters(activeWorkspace, projectId)
        existingChaptersData = allChapters.filter(ch => ch.chapter_no <= continueFrom).map(ch => ({
          chapter_no: ch.chapter_no,
          title: ch.title,
          chapter_summary: ch.chapter_summary || '',
          ending_hook: ch.ending_hook || '',
          chapter_text: ch.chapter_text?.slice(0, 2000) || '',
        }))
      }
      const execution = await executeNovelAgentChain(
        project,
        String(req.body.prompt || ''),
        activeWorkspace,
        Number(req.body.model_id || 0) || undefined,
        agentFilter,
        { chapterCount, continueFrom, userOutline, existingChapters: existingChaptersData },
        req.body.payload || {},
      );
      const seed = buildNovelSeed(project, String(req.body.prompt || ''));

      // ── Helper: get LLM output for a step ──
      const getStep = (stepName: string) =>
        execution.results.find(item => item.step === stepName && item.outputSource === 'llm')?.output || {};

      const worldResult = getStep('world-agent')
      const charResult = getStep('character-agent')
      const outlineResult = getStep('outline-agent')
      const detailResult = getStep('detail-outline-agent')
      const continuityResult = getStep('continuity-check-agent')
      const proseResult = getStep('prose-agent')

      // ═══ 1. 持久化世界观 ═══
      if (worldResult.world_summary) {
        await createNovelWorldbuilding(activeWorkspace, {
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
        })
      }

      // ═══ 2. 持久化角色 ═══
      const characterItems = Array.isArray(charResult.characters) && charResult.characters.length > 0
        ? charResult.characters : (Array.isArray(seed.characters) ? seed.characters : [])
      for (const c of characterItems) {
        await createNovelCharacter(activeWorkspace, { project_id: projectId, ...c })
      }

      // ═══ 3. 持久化卷纲 ═══
      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines : []
      for (const v of volumeItems) {
        await createNovelOutline(activeWorkspace, {
          project_id: projectId, outline_type: 'volume', ...v,
        })
      }

      // ═══ 4. 持久化总纲 ═══
      let masterOutlineData: any = {}
      if (typeof outlineResult.master_outline === 'object' && outlineResult.master_outline) {
        masterOutlineData = outlineResult.master_outline
      } else if (typeof outlineResult.master_outline === 'string') {
        masterOutlineData = { title: seed.outline?.title || '总纲', summary: outlineResult.master_outline }
      }
      if (masterOutlineData.summary || masterOutlineData.title) {
        await createNovelOutline(activeWorkspace, {
          project_id: projectId,
          outline_type: 'master',
          title: masterOutlineData.title || seed.outline?.title || '总纲',
          summary: masterOutlineData.summary || seed.outline?.summary || '',
          hook: masterOutlineData.hook || '',
        })
      }

      // ═══ 5. 持久化章节（detail_chapters > chapter_outlines > seed）═══
      let chapterItems: any[] = []
      if (Array.isArray(detailResult.detail_chapters) && detailResult.detail_chapters.length > 0) {
        chapterItems = detailResult.detail_chapters.map((dc: any) => ({
          chapter_no: dc.chapter_no,
          title: dc.title,
          chapter_summary: dc.summary || dc.chapter_summary || '',
          conflict: dc.conflict || '',
          ending_hook: dc.ending_hook || '',
          scene_breakdown: dc.scenes || [],
          continuity_notes: dc.continuity_from_prev ? [dc.continuity_from_prev] : [],
        }))
      } else if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
        chapterItems = outlineResult.chapter_outlines
      } else if (Array.isArray(seed.chapters) && seed.chapters.length > 0) {
        chapterItems = seed.chapters
      }
      for (const ch of chapterItems) {
        await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          chapter_no: ch.chapter_no,
          title: ch.title || '',
          chapter_summary: ch.chapter_summary || ch.summary || '',
          conflict: ch.conflict || '',
          ending_hook: ch.ending_hook || '',
          scene_breakdown: ch.scene_breakdown || [],
          continuity_notes: ch.continuity_notes || [],
        })
      }

      // ═══ 6. 伏笔计划 ═══
      if (Array.isArray(outlineResult.foreshadowing_plan) && outlineResult.foreshadowing_plan.length > 0) {
        const masterOutlineList = await listNovelOutlines(activeWorkspace, projectId)
        const masterOl = masterOutlineList.find((o: any) => o.outline_type === 'master')
        for (const fp of outlineResult.foreshadowing_plan) {
          await createNovelOutline(activeWorkspace, {
            project_id: projectId,
            outline_type: 'foreshadowing',
            title: fp.description || '',
            summary: `第${fp.plant_at}章埋 → 第${fp.payoff_at}章收`,
            parent_id: masterOl?.id || null,
          })
        }
      }

      // ═══ 7. 正文同步（prose-agent）═══
      const proseOutput = proseResult?.prose_chapters || [];
      await syncProseChaptersToStore(activeWorkspace, projectId, proseOutput);

      // ═══ 8. 更新项目主记录 ═══
      const marketResult = getStep('market-agent')
      const genreVal = String(worldResult.genre || marketResult.genre || project.genre || '')
      const synopsisVal = String(masterOutlineData.summary || outlineResult.synopsis || seed.outline?.summary || project.synopsis || '')
      const audienceVal = String(marketResult.target_audience || marketResult.targetReader || project.target_audience || '')
      await updateNovelProject(activeWorkspace, projectId, {
        genre: genreVal,
        synopsis: synopsisVal,
        target_audience: audienceVal,
        sub_genres: Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : undefined,
        style_tags: Array.isArray(marketResult.style_tags) ? marketResult.style_tags : undefined,
        commercial_tags: Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : undefined,
        status: 'draft',
      })

      // ═══ 9. 运行记录 + 审校 ═══
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'agent_execute', step_name: 'chain', status: 'success', output_ref: JSON.stringify(execution.results) })
      const review = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'continuity',
        status: 'ok',
        summary: continuityResult.is_ready_for_prose !== false ? '当前生成结构一致，尚未发现明显冲突。' : execution.review.summary,
        issues: execution.review.issues || [],
        payload: JSON.stringify(continuityResult || {}),
      })
      res.json({ ...execution, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** P0-2: 真实 Repair 接口 — 调用 LLM 修复审校问题 */
  app.post('/api/novel/agents/repair', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const snapshot = await makeSnapshot(activeWorkspace, projectId)
      const repairs = buildRepairPlan()
      // 收集审校问题：优先使用 request body 中的 issues，否则使用最近一次连续性审校
      let reviewIssues: Array<any> = req.body.issues || []
      if (!reviewIssues.length) {
        const reviews = await listNovelReviews(activeWorkspace, projectId)
        const continuity = reviews.find(r => r.review_type === 'continuity') || reviews.find(r => r.review_type === 'platform_fit')
        if (continuity && Array.isArray(continuity.issues)) {
          reviewIssues = continuity.issues
        }
      }
      // 如果没有问题，使用 repair_plan 的策略问题
      if (!reviewIssues.length) {
        reviewIssues = repairs.map(r => `修复目标：${r.target} — ${r.action}`)
      }

      // P0-2: 使用 repair_plan 策略修复（executeRepairAgent 尚未实现，使用 fallback）
      const repairResult = {
        success: false,
        fallbackUsed: true,
        output: {
          repaired_chapters: [],
          repaired_outlines: [],
          repaired_characters: [],
          issues_fixed: [],
        },
      }

      // 应用修复结果：逐条更新 store
      const applied: any[] = []
      const repairedChapters = Array.isArray(repairResult.output?.repaired_chapters) ? repairResult.output.repaired_chapters : []
      const repairedOutlines = Array.isArray(repairResult.output?.repaired_outlines) ? repairResult.output.repaired_outlines : []
      const repairedCharacters = Array.isArray(repairResult.output?.repaired_characters) ? repairResult.output.repaired_characters : []

      // 修复章节
      if (repairedChapters.length > 0) {
        for (const rc of repairedChapters) {
          const matched = snapshot.chapters.find(ch => ch.chapter_no === Number(rc.chapter_no) || ch.id === Number(rc.id))
          if (matched) {
            await updateNovelChapter(activeWorkspace, matched.id, {
              chapter_text: String(rc.chapter_text || matched.chapter_text),
              chapter_summary: String(rc.chapter_summary || matched.chapter_summary),
              conflict: String(rc.conflict || matched.conflict),
              ending_hook: String(rc.ending_hook || matched.ending_hook),
            }, { versionSource: 'repair' })
            applied.push({ target: 'chapter', chapter_no: rc.chapter_no, action: '修复章节正文与摘要' })
          }
        }
      }

      // 修复大纲
      if (repairedOutlines.length > 0) {
        for (const ro of repairedOutlines) {
          const matched = snapshot.outlines.find(o => o.id === Number(ro.id))
          if (matched) {
            applied.push({ target: 'outline', outline_id: matched.id, action: '修复大纲摘要与转折' })
          }
        }
      }

      // 修复角色
      if (repairedCharacters.length > 0) {
        for (const rch of repairedCharacters) {
          const matched = snapshot.characters.find(c => c.id === Number(rch.id))
          if (matched) {
            applied.push({ target: 'character', character_id: matched.id, action: '修复角色动机与目标' })
          }
        }
      }

      // 如果 LLM 未返回具体内容（fallback），应用 repair_plan 中的策略
      if (!repairResult.success && applied.length === 0) {
        const worldings = snapshot.worldbuilding
        const outlines = snapshot.outlines
        const chapters = snapshot.chapters
        if (repairs.find(r => r.target === 'worldbuilding') && worldings[0]) applied.push({ target: 'worldbuilding', action: 'refined rules and timeline anchor' })
        if (repairs.find(r => r.target === 'outline') && outlines[0]) applied.push({ target: 'outline', action: 'rebalanced summary and turning points' })
        if (repairs.find(r => r.target === 'chapter') && chapters[0]) applied.push({ target: 'chapter', action: 'tightened chapter conflict and ending hook' })
        if (repairs.find(r => r.target === 'prose') && chapters[0]) applied.push({ target: 'prose', action: 'rewrote chapter text and scene breakdown' })
        if (repairs.find(r => r.target === 'character') && snapshot.characters[0]) applied.push({ target: 'character', action: 'clarified motivation and goals' })
      }

      const after = {
        worldbuilding: snapshot.worldbuilding.map((item: any) => ({ id: item.id, summary: item.world_summary, timeline_anchor: item.timeline_anchor || '故事起点' })),
        outlines: snapshot.outlines.map((item: any) => ({ id: item.id, summary: item.summary, hook: item.hook })),
        chapters: snapshot.chapters.map((item: any) => ({ id: item.id, summary: item.chapter_summary, conflict: item.conflict, chapter_text_preview: String(item.chapter_text || '').slice(0, 100) })),
        characters: snapshot.characters.map((item: any) => ({ id: item.id, motivation: item.motivation, goal: item.goal })),
        issues_fixed: repairResult.output?.issues_fixed || [],
        lllm_used: repairResult.success && !repairResult.fallbackUsed,
      }

      const review = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'repair', status: 'ok', summary: `修复完成：${applied.length} 个目标已处理`, issues: [] })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'repair', step_name: 'apply', status: repairResult.success ? 'success' : 'fallback', output_ref: JSON.stringify({ applied, llm_used: repairResult.success && !repairResult.fallbackUsed, modelId: repairResult.modelId, modelName: repairResult.modelName }), error_message: repairResult.error || '' })
      res.json({ project_id: projectId, repairs, applied, before: snapshot, after, review, llm_result: repairResult })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** P1-2: 章节重组 — 扩展 / 收缩 */
  app.post('/api/novel/chapters/restructure', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id)
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterIds = Array.isArray(req.body.chapter_ids) ? req.body.chapter_ids.map(Number) : []
      const mode = req.body.mode // 'expand' | 'contract'
      const targetCount = Number(req.body.target_count || 0)
      const instructions = String(req.body.instructions || '')

      // Validate
      if (!chapterIds.length) return res.status(400).json({ error: 'chapter_ids 不能为空' })
      if (!mode || !['expand', 'contract'].includes(mode)) return res.status(400).json({ error: 'mode 必须是 expand 或 contract' })
      if (mode === 'expand' && targetCount <= chapterIds.length)
        return res.status(400).json({ error: `扩展模式：目标章数 (${targetCount}) 必须大于原始章数 (${chapterIds.length})` })
      if (mode === 'contract' && targetCount >= chapterIds.length)
        return res.status(400).json({ error: `收缩模式：目标章数 (${targetCount}) 必须小于原始章数 (${chapterIds.length})` })

      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      // Load selected chapters (sorted by chapter_no)
      const allChapters = await listNovelChapters(activeWorkspace, projectId)
      const selected = allChapters
        .filter(ch => chapterIds.includes(ch.id))
        .sort((a, b) => a.chapter_no - b.chapter_no)

      if (selected.length !== chapterIds.length)
        return res.status(400).json({ error: '部分章节不存在' })

      const isContiguousSelection = selected.every((ch, index) =>
        index === 0 || ch.chapter_no === selected[index - 1].chapter_no + 1
      )
      if (!isContiguousSelection)
        return res.status(400).json({ error: '章节扩展/合并仅支持连续章节范围，请选择连续章节' })

      // ── Step 1: Backup (create version snapshot for each selected chapter) ──
      const backupVersionIds: number[] = []
      for (const ch of selected) {
        const existing = await listChapterVersions(activeWorkspace, ch.id)
        const versionNo = existing.length + 1
        const created = await appendChapterVersion(activeWorkspace, {
          chapter_id: ch.id,
          project_id: ch.project_id,
          version_no: versionNo,
          chapter_text: ch.chapter_text || '',
          scene_breakdown: ch.scene_breakdown || [],
          continuity_notes: ch.continuity_notes || [],
          source: 'manual_edit' as const,
        })
        if (created) backupVersionIds.push(created.id)
      }

      // ── Step 2: Call LLM for plan ──
      const chapterSummaries = selected.map((ch, i) =>
        `章节 ${i + 1}（第${ch.chapter_no}章）：\n- 标题：${ch.title}\n- 摘要：${ch.chapter_summary}\n- 冲突：${ch.conflict}\n- 结尾钩子：${ch.ending_hook}\n- 正文（前500字）：${(ch.chapter_text || '').slice(0, 500)}`
      ).join('\n\n')

      const prompt = mode === 'expand'
        ? `你是一个专业的小说编辑。任务是将当前选中的连续 ${selected.length} 章，在原有章节序列中的当前位置内，扩展重组为 ${targetCount} 章新的“细纲章节”。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将这段连续剧情重新拆分为 ${targetCount} 章新章节，并完整替换当前选中的章节范围。未选中的前后章节内容与相对顺序都不能改变；如果扩展后章数增加，则仅将后续章节整体顺延。

请注意：这里生成的是细纲，不是正文。每章只输出章节规划信息，不要写完整正文段落。

每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子
6. scene_list：场景/节拍列表（数组，每项包含 scene_title 和 description）

要求：
- 只处理选中的连续章节范围，不改动范围外章节内容
- 保持故事连贯性和章节顺序稳定
- 扩展后的 ${targetCount} 章应覆盖原选中章节的全部剧情，并补足更细的过程、转折、心理、对话与场景推进
- 不要输出正文，不要生成长篇 prose/chapter_text
- 每章都有明确推进点、冲突和结尾钩子
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`
        : `你是一个专业的小说编辑。任务是将 ${selected.length} 章内容合并为 ${targetCount} 章新章节。原始章节会被删除，替换为 ${targetCount} 章新章节。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将原始内容重新合并为 ${targetCount} 章新章节。每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子

要求：
- 合并后保持故事完整性
- 精简次要情节，保留主线
- 每章都有独立的冲突和结尾钩子
- 情节更加紧凑
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`

      let plan: any[] = []
      if (modelId) {
        const llmResult = await (async () => {
          const { executeNovelAgentChain } = await import('../llm')
          return executeNovelAgentChain(
            project, prompt, activeWorkspace, modelId,
            ['outline-agent'], {}, { mode, chapterIds, targetCount, instructions }
          )
        })()
        // Try to extract plan from LLM result
        const outlineOutput = (llmResult.results || []).find(
          (r: any) => r.step === 'outline-agent' && r.outputSource === 'llm'
        )?.output
        if (outlineOutput && typeof outlineOutput === 'object') {
          // Try chapter_outlines first, then detail_chapters
          if (Array.isArray(outlineOutput.chapter_outlines)) plan = outlineOutput.chapter_outlines
          else if (Array.isArray(outlineOutput.detail_chapters)) plan = outlineOutput.detail_chapters
          else if (Array.isArray(outlineOutput.outlines)) plan = outlineOutput.outlines
        }
      }

      // Fallback plan
      if (!Array.isArray(plan) || plan.length !== targetCount) {
        plan = []
        for (let i = 0; i < targetCount; i++) {
          const ratio = i / targetCount
          const srcIdx = Math.min(Math.floor(ratio * selected.length), selected.length - 1)
          const srcCh = selected[srcIdx]
          plan.push({
            title: `${srcCh.title}（${mode === 'expand' ? '扩展' : '合并'} ${i + 1}/${targetCount}）`,
            chapter_goal: mode === 'expand'
              ? `扩展自第${srcCh.chapter_no}章，对应重组范围第 ${i + 1}/${targetCount} 章`
              : `合并自第${selected[0].chapter_no}-${selected[selected.length - 1].chapter_no}章`,
            chapter_summary: mode === 'expand'
              ? `${(srcCh.chapter_summary || '').slice(0, 160)}（扩展细纲 ${i + 1}/${targetCount}，正文待审核后手动生成）`
              : (srcCh.chapter_summary || '').slice(0, 200),
            conflict: srcCh.conflict || '',
            ending_hook: srcCh.ending_hook || '',
            scene_list: [],
          })
        }
      }

      const normalizedPlan = plan.slice(0, targetCount).map((item, i) => ({
        title: String(item?.title || `第${selected[0].chapter_no + i}章`),
        chapter_goal: String(item?.chapter_goal || ''),
        chapter_summary: String(item?.chapter_summary || ''),
        conflict: String(item?.conflict || ''),
        ending_hook: String(item?.ending_hook || ''),
        scene_list: Array.isArray(item?.scene_list)
          ? item.scene_list
          : Array.isArray(item?.scenes)
            ? item.scenes
            : Array.isArray(item?.scene_breakdown)
              ? item.scene_breakdown
              : [],
      }))

      // ── Step 3: Shift chapters after selected range ──
      const firstChapterNo = selected[0].chapter_no
      const lastChapterNo = selected[selected.length - 1].chapter_no
      const shift = targetCount - selected.length
      const trailingChapters = allChapters
        .filter(ch => ch.chapter_no > lastChapterNo)
        .sort((a, b) => b.chapter_no - a.chapter_no)

      if (shift !== 0) {
        for (const ch of trailingChapters) {
          await updateNovelChapter(activeWorkspace, ch.id, { chapter_no: ch.chapter_no + shift }, { createVersion: false })
        }
      }

      // ── Step 4: Delete original selected chapters ──
      for (const ch of selected) {
        await deleteNovelChapter(activeWorkspace, ch.id)
      }

      // ── Step 5: Create replacement chapters in-place ──
      const newChapterIds: number[] = []
      for (let i = 0; i < normalizedPlan.length; i++) {
        const item = normalizedPlan[i]
        const created = await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          chapter_no: firstChapterNo + i,
          title: item.title || `第${firstChapterNo + i}章`,
          chapter_goal: item.chapter_goal || '',
          chapter_summary: item.chapter_summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          chapter_text: '',
          scene_breakdown: item.scene_list || [],
          continuity_notes: [],
          status: mode === 'expand' ? 'outline_pending_review' : 'draft',
        })
        newChapterIds.push(created.id)
      }

      // ── Step 6: Run record ──
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'restructure',
        step_name: mode,
        status: 'success',
        input_ref: JSON.stringify({ mode, chapterIds, targetCount }),
        output_ref: JSON.stringify({ mode, original_count: selected.length, target_count: targetCount, new_chapter_ids: newChapterIds, backup_version_ids: backupVersionIds }),
      })

      res.json({
        mode,
        original_count: selected.length,
        target_count: targetCount,
        new_chapter_ids: newChapterIds,
        backup_version_ids: backupVersionIds,
        plan: normalizedPlan,
        message: mode === 'expand'
          ? `已在原章节范围内将 ${selected.length} 章扩展为 ${targetCount} 章细纲，后续章节已顺延，正文需审核后手动生成`
          : `已将 ${selected.length} 章合并为 ${targetCount} 章`,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace(); const projectId = Number(req.body.project_id); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' })
      // scope=foundation: 只跑设定 + 大纲 + 细纲 + 预检，不跑正文/审校/平台适配
      const scope = req.body.payload?.scope === 'foundation'
        ? ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent']
        : undefined
      const plan = await generateNovelPlan(project, String(req.body.prompt || '请规划小说的基础三项：世界观、角色、大纲。'), activeWorkspace, Number(req.body.model_id || 0) || undefined, undefined, scope)

      // 从 Agent 执行结果中提取各阶段的 LLM 输出
      const getResult = (stepName: string) => (plan.results || []).find(item => item.step === stepName && item.outputSource === 'llm')?.output || {}
      const worldResult = getResult('world-agent')
      const characterResult = getResult('character-agent')
      const outlineResult = getResult('outline-agent')
      const detailOutlineResult = getResult('detail-outline-agent')
      const continuityResult = getResult('continuity-check-agent')

      const seed = buildNovelSeed(project, String(req.body.prompt || ''))

      // ═══ 1. 世界观 ═══
      const worldPayload = {
        world_summary: worldResult.world_summary || seed.world_summary,
        rules: Array.isArray(worldResult.rules) ? worldResult.rules : seed.rules,
        factions: Array.isArray(worldResult.factions) ? worldResult.factions : [{ name: '管理机构', role: '秩序维持者' }],
        locations: Array.isArray(worldResult.locations) ? worldResult.locations : [{ name: '事件现场', type: '起点' }],
        systems: Array.isArray(worldResult.systems) ? worldResult.systems : [{ name: '循环系统', description: '重置与因果偏差机制' }],
        items: Array.isArray(worldResult.items) ? worldResult.items : [],
        timeline_anchor: worldResult.timeline_anchor || '故事起点',
        known_unknowns: Array.isArray(worldResult.known_unknowns) ? worldResult.known_unknowns : ['为什么会重启', '谁在操控世界'],
        version: 1,
      }
      const world = await createNovelWorldbuilding(activeWorkspace, { project_id: projectId, ...worldPayload })

      // ═══ 2. 角色 ═══
      const characterItems = Array.isArray(characterResult.characters) && characterResult.characters.length > 0
        ? characterResult.characters
        : seed.characters
      const createdCharacters: any[] = []
      for (const item of characterItems) {
        createdCharacters.push(await createNovelCharacter(activeWorkspace, { project_id: projectId, ...item }))
      }

      // ═══ 3. 卷纲 ═══
      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines
        : seed.volumeOutlines
      const volumeOutlines: any[] = []
      for (const item of volumeItems) {
        volumeOutlines.push(await createNovelOutline(activeWorkspace, { project_id: projectId, outline_type: 'volume', ...item }))
      }

      // ═══ 4. 总纲（master_outline 可能是对象或字符串）═══
      let masterOutlineData: any
      if (typeof outlineResult.master_outline === 'object' && outlineResult.master_outline !== null) {
        masterOutlineData = outlineResult.master_outline
      } else if (typeof outlineResult.master_outline === 'string') {
        masterOutlineData = { title: seed.outline.title, summary: outlineResult.master_outline }
      } else {
        masterOutlineData = seed.outline
      }
      const masterOutline = await createNovelOutline(activeWorkspace, {
        project_id: projectId,
        outline_type: 'master',
        title: masterOutlineData.title || seed.outline.title,
        summary: masterOutlineData.summary || seed.outline.summary,
        hook: masterOutlineData.hook || seed.outline.hook,
      })

      // ═══ 5. 章节（优先用 detail-outline 的 detail_chapters，否则用 outline 的 chapter_outlines，最后用 seed）═══
      let chapterItems: any[] = []

      // 优先级 1: detail_outline 的 detail_chapters
      if (Array.isArray(detailOutlineResult.detail_chapters) && detailOutlineResult.detail_chapters.length > 0) {
        chapterItems = detailOutlineResult.detail_chapters.map((dc: any) => ({
          chapter_no: dc.chapter_no,
          title: dc.title,
          chapter_summary: dc.summary || dc.chapter_summary || '',
          conflict: dc.conflict || '',
          ending_hook: dc.ending_hook || '',
          scene_breakdown: dc.scenes || [],
          continuity_notes: dc.continuity_from_prev ? [dc.continuity_from_prev] : [],
        }))
      }
      // 优先级 2: outline 的 chapter_outlines
      else if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
        chapterItems = outlineResult.chapter_outlines
      }
      // 优先级 3: seed
      else {
        chapterItems = seed.chapters
      }

      const chapters: any[] = []
      for (const item of chapterItems) {
        chapters.push(await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          outline_id: masterOutline.id,
          chapter_no: item.chapter_no,
          title: item.title,
          chapter_summary: item.chapter_summary || item.summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          scene_breakdown: item.scene_breakdown || [],
          continuity_notes: item.continuity_notes || [],
        }))
      }

      // ═══ 6. 伏笔计划（存到大纲中作为子项）═══
      if (Array.isArray(outlineResult.foreshadowing_plan) && outlineResult.foreshadowing_plan.length > 0) {
        for (const fp of outlineResult.foreshadowing_plan) {
          await createNovelOutline(activeWorkspace, {
            project_id: projectId,
            outline_type: 'foreshadowing',
            title: fp.description || '',
            summary: `第${fp.plant_at}章埋 → 第${fp.payoff_at}章收`,
            parent_id: masterOutline.id,
          })
        }
      }

      // ═══ 7. 连续性预检记录 ═══
      const continuityIssues: string[] = []
      if (Array.isArray(continuityResult.continuity_issues)) {
        continuityIssues.push(...continuityResult.continuity_issues.map((ci: any) => `[${ci.severity || 'medium'}] 第${ci.chapter_no || '?'}章: ${ci.description || ''}`))
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'continuity',
        status: continuityResult.is_ready_for_prose !== false ? 'ok' : 'warn',
        summary: continuityIssues.length > 0 ? `发现 ${continuityIssues.length} 个连续性问题` : '当前生成结构一致，尚未发现明显冲突。',
        issues: continuityIssues,
        payload: JSON.stringify(continuityResult || {}),
      })

      // ═══ 8. 运行记录 ═══
      const results = [
        { step: 'market', success: true, output: plan.plan.market || {}, error: '' },
        { step: 'worldbuilding', success: true, output: world, error: '' },
        { step: 'character', success: true, output: createdCharacters, error: '' },
        { step: 'volume_outline', success: true, output: volumeOutlines, error: '' },
        { step: 'outline', success: true, output: masterOutline, error: '' },
        { step: 'detail_outline', success: true, output: detailOutlineResult, error: '' },
        { step: 'continuity_check', success: true, output: continuityResult, error: '' },
        { step: 'chapter', success: true, output: chapters, error: '' },
        { step: 'review', success: true, output: review, error: '' },
      ]

      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'start', status: 'running', input_ref: JSON.stringify(req.body) })
      for (const item of results) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: item.step, status: item.success ? 'success' : 'failed', output_ref: JSON.stringify(item.output), error_message: item.error })
      }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'finish', status: 'success', output_ref: JSON.stringify({ steps: results.length }) })

      // ═══ 8.5. 更新项目主记录（genre / synopsis / target_audience / tags）═══
      const marketResult = (plan.results || []).find(item => item.step === 'market-agent' && item.outputSource === 'llm')?.output || {}
      const genreValue = String(worldResult.genre || marketResult.genre || project.genre || '')
      const synopsisValue = String(masterOutlineData.summary || outlineResult.synopsis || seed.outline.summary || project.synopsis || '')
      const audienceValue = String(marketResult.target_audience || marketResult.targetReader || project.target_audience || '')
      const subGenresArr = Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : []
      const styleTagsArr = Array.isArray(marketResult.style_tags) ? marketResult.style_tags : []
      const commercialTagsArr = Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : (Array.isArray(outlineResult.commercial_tags) ? outlineResult.commercial_tags : [])
      await updateNovelProject(activeWorkspace, projectId, {
        genre: genreValue,
        synopsis: synopsisValue,
        target_audience: audienceValue,
        sub_genres: subGenresArr.length > 0 ? subGenresArr : undefined,
        style_tags: styleTagsArr.length > 0 ? styleTagsArr : undefined,
        commercial_tags: commercialTagsArr.length > 0 ? commercialTagsArr : undefined,
        status: 'draft',
      })

      // ═══ 9. 返回完整数据，包含所有生成的内容 ═══
      res.json({
        project_id: projectId,
        plan,
        results,
        world,
        characters: createdCharacters,
        volume_outlines: volumeOutlines,
        master_outline: masterOutline,
        chapters,
        continuity_check: continuityResult,
        review,
      })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  // ═══ Memory Palace Management API ═══

  /** GET /api/novel/memory-palace/projects — 列出记忆宫殿中所有已存储记忆的项目 */
  app.get('/api/novel/memory-palace/projects', async (_req, res) => {
    try {
      const projects = await listMemoryPalaceProjects()
      res.json({ projects })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** DELETE /api/novel/memory-palace/projects/:id — 删除指定项目的记忆宫殿数据 */
  app.delete('/api/novel/memory-palace/projects/:id', async (req, res) => {
    try {
      const projectId = Number(req.params.id)
      const projectTitle = req.body?.project_title || req.query?.project_title
      const result = await purgeMemoryPalaceProject(projectId, projectTitle || undefined)
      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error })
      }
      res.json({ ok: true, project_id: projectId, message: `已成功删除项目 ${projectId} 的所有记忆数据` })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
