import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../../workspace'
import { isMcpError } from '../../mcp/errors'
import { withNovelWorkspaceMutation } from '../../novel/lock'
import { assertNoGenerationSourceMutation } from '../../novel-writing-service/generation-source/source-config'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelProjectSeedDraft,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  deleteNovelProjectSeedDraft,
  getNovelChapter,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelWorkspaceChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelProjectSeedDrafts,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  syncNovelChapterPlanByNumber,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { extractLLMText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { purgeMemoryPalaceProject } from '../../memory-service'
import { buildOhStoryGenreCatalogContract, formatOhStoryGenreCatalogPrompt, listOhStoryGenreCatalogGuides, matchOhStoryGenreCatalogGuide } from '../novel-genre-catalog'
import { buildOhStoryGenreCoreMechanicsContract, formatOhStoryGenreCoreMechanicsPrompt } from '../novel-genre-core-mechanics'
import { buildOhStoryPlotSpecialTopicsContract, formatOhStoryPlotSpecialTopicsPrompt } from '../novel-plot-special-topics'
import { buildOhStoryCharacterDesignContract, formatOhStoryCharacterDesignPrompt } from '../novel-character-design-contract'
import { buildOhStoryStoryPowerContract, formatOhStoryStoryPowerPrompt } from '../novel-story-power-contract'
import { buildOhStoryMainlineDefinitionContract, formatOhStoryMainlineDefinitionPrompt } from '../novel-mainline-definition-contract'
import { buildOhStoryLongformStructureContract, formatOhStoryLongformStructurePrompt } from '../novel-longform-structure-contract'
import { buildOhStoryDirectorForProjectSeed } from '../novel-oh-story-director'
import { normalizeSettingAgentPayload } from '../novel-setting-routes'
import { safeReportProjectSeedProgress, resolvePassA3VolumeStageStatus, sseData, type ProjectSeedProgressReporter } from '../novel-project-seed-progress'
import {
  buildProjectSeedFillGapsPrompt,
  extractFillGapsPatch,
  listProjectSeedGapTargets,
  mergeSeedPreferRicher,
} from '../novel-project-seed-fill-gaps'
import {
  annotateOutlineScaffoldDiagnostics,
  attachProjectSeedDirector,
  buildMaterializedSeedCharactersForTest,
  buildProjectSeedDiagnostics,
  buildProjectSeedFirst30OutlinePrompt,
  buildProjectSeedPrompt,
  buildProjectSeedRecoveryPrompt,
  buildProjectSeedVolumeOutlineOnlyPrompt,
  buildRecoverableProjectSeed,
  createProjectFromSeed,
  deriveProjectSeedWithModel,
  ensureProjectSeedModelOutlines,
  expandThinProjectSeedWithModel,
  extractOutlineFieldsFromModelPayload,
  fillProjectSeedGapsWithModel,
  finalizeProjectSeedWithModel,
  firstSeedText,
  hasUsableProjectSeed,
  listProjectsWithWritingAggregates,
  materializeProjectSeed,
  normalizeLengthTarget,
  normalizeProjectSeedPayload,
  parseNestedSeed,
  parseOptionalBoolean,
  projectSeedNeedsOutlineExpansion,
  projectSeedNeedsReview,
  projectSeedOutlinesLookLikeLocalScaffold,
  rejectInvalidQueryView,
  repairProjectSeedGaps,
  requireProjectId,
  stripLocalScaffoldOutlines,
} from './builders'

function genericGenerationSourceMutationError(error: unknown) {
  if (
    !isMcpError(error)
    || error.code !== 'MCP_BINDING_INVALID'
    || error.details?.reason !== 'dedicated_binding_route_required'
  ) return null
  return {
    error: error.message,
    detail: error.message,
    error_code: error.code,
    field: error.details.field,
  }
}

function preserveExistingGenerationSources(currentConfig: any, replacementConfig: unknown) {
  const replacement = replacementConfig && typeof replacementConfig === 'object'
    ? replacementConfig
    : {}
  const preserved = { ...replacement }
  for (const field of ['prose_generation_source', 'chapter_generation_source']) {
    if (!Object.prototype.hasOwnProperty.call(currentConfig, field)) continue
    preserved[field] = currentConfig[field]
  }
  return preserved
}

export function registerNovelCoreRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/novel/projects', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json(await listProjectsWithWritingAggregates(activeWorkspace))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects', async (req, res) => {
    try {
      assertNoGenerationSourceMutation(req.body?.reference_config)
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const project = await createNovelProject(activeWorkspace, req.body)
      const seed = req.body?.reference_config?.project_seed
      if (seed && req.body?.auto_materialize_seed !== false) {
        const repairedSeed = repairProjectSeedGaps(seed, req.body?.raw_idea || seed.raw_idea || '')
        const materialized = await materializeProjectSeed(activeWorkspace, project, repairedSeed)
        return res.json({ ...(materialized.project || project), seed_materialization: materialized.created })
      }
      res.json(project)
    } catch (error) {
      const mutationError = genericGenerationSourceMutationError(error)
      if (mutationError) return res.status(400).json(mutationError)
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/genre-catalog', async (req, res) => {
    try {
      const query = String(req.query?.q || req.query?.idea || req.query?.genre || '').trim()
      const guides = listOhStoryGenreCatalogGuides()
      const matched = query ? matchOhStoryGenreCatalogGuide(query) : null
      res.json({
        ok: true,
        source: 'oh_story_genre_catalog_v1',
        guides,
        matched,
      })
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'failed to load genre catalog' })
    }
  })

  app.get('/api/novel/project-seed/drafts', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json({ ok: true, drafts: await listNovelProjectSeedDrafts(activeWorkspace) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/project-seed/drafts', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const seed = parseNestedSeed(req.body?.seed || {})
      if (!seed || !Object.keys(seed).length) return res.status(400).json({ error: 'seed is required' })
      const title = firstSeedText(req.body?.title, seed.title, seed.project_title, seed.book_title, '未命名孵化草稿')
      const draft = await createNovelProjectSeedDraft(activeWorkspace, {
        title,
        idea: String(req.body?.idea || seed.raw_idea || ''),
        seed,
        review_model: parseNestedSeed(req.body?.review_model || {}),
        diagnostics: parseNestedSeed(req.body?.diagnostics || seed.seed_diagnostics || {}),
        model_id: req.body?.model_id === undefined || req.body?.model_id === null ? null : Number(req.body.model_id) || null,
        source: String(req.body?.source || 'deep_draft'),
      })
      res.json({ ok: true, draft })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/project-seed/drafts/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const id = Number(req.params.id)
      if (!id) return res.status(400).json({ error: 'id is required' })
      const ok = await deleteNovelProjectSeedDraft(activeWorkspace, id)
      if (!ok) return res.status(404).json({ error: 'draft not found' })
      res.json({ ok: true })
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
      const lengthTarget = normalizeLengthTarget(req.body?.length_target) || 'medium'
      if (!idea && !title) return res.status(400).json({ error: 'title or idea is required' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const preferredGenre = String(req.body?.primary_genre || req.body?.genre || '').trim()
      const preferredFramework = String(req.body?.genre_framework || req.body?.framework || '').trim()
      let { seed, result } = await deriveProjectSeedWithModel(
        activeWorkspace,
        idea,
        modelId,
        title,
        lengthTarget,
        undefined,
        { preferredGenre, preferredFramework },
      )
      seed = stripLocalScaffoldOutlines(seed)
      let seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, buildProjectSeedDiagnostics(seed, idea, result))
      const needsExpansion = !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed) || projectSeedNeedsOutlineExpansion(seed)
      if (needsExpansion) {
        const recovered = await expandThinProjectSeedWithModel(activeWorkspace, seed, result, idea, modelId, title, lengthTarget)
        seed = stripLocalScaffoldOutlines(recovered.seed)
        result = recovered.result
        seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, recovered.seed_diagnostics)
      }
      // 分卷/前30章细纲：oh-story 思路是独立模型步骤，禁止本地模板落库。
      if (projectSeedNeedsOutlineExpansion(seed)) {
        const outlined = await ensureProjectSeedModelOutlines(activeWorkspace, seed, idea, modelId, title, lengthTarget, result)
        seed = stripLocalScaffoldOutlines(outlined.seed)
        result = outlined.result || result
        seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, outlined.seed_diagnostics)
      }
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed)) {
        return res.status(502).json({
          error: (result as any).error || '模型返回的项目种子仍不足，已保留可用信息，请补充草稿后重试',
          raw_preview: String((result as any).content || '').slice(0, 3000),
          seed,
          seed_diagnostics: seedDiagnostics,
        })
      }
      seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, seedDiagnostics || seed.seed_diagnostics)
      seed = attachProjectSeedDirector({ ...seed, seed_diagnostics: seedDiagnostics })
      res.json({ ok: true, seed, result, seed_diagnostics: seedDiagnostics })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })


  app.post('/api/novel/project-seed/derive-stream', async (req, res) => {
    const activeWorkspace = getWorkspace()
    await ensureWorkspaceStructure(activeWorkspace)
    const idea = String(req.body?.idea || '').trim()
    const title = String(req.body?.title || '').trim()
    const lengthTarget = normalizeLengthTarget(req.body?.length_target) || 'medium'
    const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
    if (!idea && !title) return res.status(400).json({ error: 'title or idea is required' })
    if (!modelId) return res.status(400).json({ error: 'model_id is required' })

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders()

    let closed = false
    const markClosed = () => { closed = true }
    req.on('close', markClosed)
    res.on('close', markClosed)

    const writeEvent = (payload: any) => {
      if (closed || res.writableEnded) return
      try {
        res.write(sseData(payload))
      } catch {
        closed = true
      }
    }

    const endStream = () => {
      if (!res.writableEnded) {
        try { res.end() } catch { /* ignore */ }
      }
    }

    const onProgress: ProjectSeedProgressReporter = (event) => writeEvent(event)
    const heartbeat = setInterval(() => {
      if (closed || res.writableEnded) return
      try { res.write(': mangaforge-project-seed-heartbeat\n\n') } catch { closed = true }
    }, 15000)

    try {
      const preferredGenre = String(req.body?.primary_genre || req.body?.genre || '').trim()
      const preferredFramework = String(req.body?.genre_framework || req.body?.framework || '').trim()
      let { seed, result } = await deriveProjectSeedWithModel(
        activeWorkspace,
        idea,
        modelId,
        title,
        lengthTarget,
        onProgress,
        { preferredGenre, preferredFramework },
      )
      seed = stripLocalScaffoldOutlines(seed)
      let seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, buildProjectSeedDiagnostics(seed, idea, result))
      const needsExpansion = !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed) || projectSeedNeedsOutlineExpansion(seed)
      if (needsExpansion) {
        const recovered = await expandThinProjectSeedWithModel(activeWorkspace, seed, result, idea, modelId, title, lengthTarget, onProgress)
        seed = stripLocalScaffoldOutlines(recovered.seed)
        result = recovered.result
        seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, recovered.seed_diagnostics)
      }
      // 分卷/前30章细纲：oh-story 思路是独立模型步骤，禁止本地模板落库。
      if (projectSeedNeedsOutlineExpansion(seed)) {
        const outlined = await ensureProjectSeedModelOutlines(activeWorkspace, seed, idea, modelId, title, lengthTarget, result, onProgress)
        seed = stripLocalScaffoldOutlines(outlined.seed)
        result = outlined.result || result
        seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, outlined.seed_diagnostics)
      }
      safeReportProjectSeedProgress(onProgress, { stage: 'assemble', status: 'running', progress: 0.92 })
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed)) {
        writeEvent({
          type: 'error',
          message: (result as any)?.error || '模型返回的项目种子仍不足',
          seed,
          seed_diagnostics: seedDiagnostics,
        })
        return
      }
      seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, seedDiagnostics || seed.seed_diagnostics)
      seed = attachProjectSeedDirector({ ...seed, seed_diagnostics: seedDiagnostics })
      safeReportProjectSeedProgress(onProgress, {
        stage: 'assemble',
        status: 'completed',
        progress: 1,
        outline_chapter_count: Array.isArray(seed.chapter_outlines) ? seed.chapter_outlines.length : 0,
        outline_volume_count: Array.isArray(seed.volume_outlines) ? seed.volume_outlines.length : 0,
        outline_foreshadowing_count: Array.isArray(seed.foreshadowing_plan) ? seed.foreshadowing_plan.length : 0,
      })
      writeEvent({ type: 'result', ok: true, seed, result, seed_diagnostics: seedDiagnostics })
    } catch (error) {
      writeEvent({ type: 'error', message: String(error) })
    } finally {
      clearInterval(heartbeat)
      req.off('close', markClosed)
      res.off('close', markClosed)
      endStream()
    }
  })


  app.post('/api/novel/project-seed/fill-gaps', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const seed = req.body?.seed
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length) {
        return res.status(400).json({ error: 'seed is required' })
      }
      const modelId = req.body?.model_id ? String(req.body.model_id) : ''
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const idea = String(req.body?.idea || seed.raw_idea || '').trim()
      const title = String(req.body?.title || seed.title || '').trim()
      const risks = Array.isArray(req.body?.risks) ? req.body.risks.map((item: any) => String(item || '').trim()).filter(Boolean) : []
      const gapHints = Array.isArray(req.body?.gaps)
        ? req.body.gaps.map((item: any) => String(item?.label || item?.key || item || '').trim()).filter(Boolean)
        : []
      const filled = await fillProjectSeedGapsWithModel(activeWorkspace, seed, idea, modelId, title, risks, gapHints)
      if ((filled.result as any)?.error && !filled.filled.length) {
        return res.status(502).json({
          error: (filled.result as any).error || '补齐缺口失败',
          seed: filled.seed,
          seed_diagnostics: filled.seed_diagnostics,
          filled_fields: filled.filled,
          skipped_fields: filled.skipped,
          gaps: filled.gaps,
        })
      }
      res.json({
        ok: true,
        seed: filled.seed,
        seed_diagnostics: filled.seed_diagnostics,
        filled_fields: filled.filled,
        skipped_fields: filled.skipped,
        gaps: filled.gaps,
        remaining_gaps: filled.remaining || [],
        result: filled.result,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/project-seed/finalize', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      const idea = String(req.body?.idea || '').trim()
      const title = String(req.body?.title || '').trim()
      const draft = parseNestedSeed(req.body?.draft || req.body?.seed || {})
      if (!draft || !Object.keys(draft).length) return res.status(400).json({ error: 'draft is required' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const authorConfirmed = Boolean(req.body?.author_confirmed || req.body?.confirmed_by_author)
      let { seed, result } = await finalizeProjectSeedWithModel(activeWorkspace, draft, idea, modelId, title)
      let seedDiagnostics = buildProjectSeedDiagnostics(seed, idea, result)
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed)) {
        const recovered = await expandThinProjectSeedWithModel(activeWorkspace, seed || draft, result, idea, modelId, title, draft?.length_target)
        seed = recovered.seed
        result = recovered.result
        seedDiagnostics = recovered.seed_diagnostics
      }
      if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length || !hasUsableProjectSeed(seed)) {
        return res.status(502).json({
          error: (result as any).error || '模型返回的确定版项目种子仍不足，已保留可用信息，请补充草稿后重试',
          raw_preview: String((result as any).content || '').slice(0, 3000),
          seed,
          seed_diagnostics: seedDiagnostics,
        })
      }
      if (req.body?.create_project) {
        if (projectSeedNeedsReview(seedDiagnostics) && !authorConfirmed) {
          return res.status(409).json({
            error: '确定版项目种子仍需要作者确认，已保留可编辑草稿，暂不创建项目',
            seed,
            seed_diagnostics: seedDiagnostics,
            raw_preview: String((result as any).content || '').slice(0, 3000),
          })
        }
        if (authorConfirmed && projectSeedNeedsReview(seedDiagnostics)) {
          seedDiagnostics = {
            ...seedDiagnostics,
            status: 'confirmed_by_author',
            confirmed_by_author: true,
            confirmed_at: new Date().toISOString(),
            suggestion: '作者已确认当前项目种子可用于创建，系统保留诊断信息并继续创建项目。',
          }
          seed = { ...seed, seed_diagnostics: seedDiagnostics }
        }
        const created = await createProjectFromSeed(activeWorkspace, seed, { title, idea })
        return res.json({
          ok: true,
          seed: created.seed,
          project: created.project,
          project_id: created.project?.id,
          seed_materialization: created.created,
          result,
          seed_diagnostics: seedDiagnostics,
        })
      }
      res.json({ ok: true, seed, result, seed_diagnostics: seedDiagnostics })
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
      const lengthTarget = normalizeLengthTarget(req.body?.length_target) || 'medium'
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      let seed = req.body?.seed ? normalizeProjectSeedPayload(req.body.seed, idea, lengthTarget) : null
      let result: any = null
      if (!seed || !Object.keys(seed).length || (!seed.title && !seed.synopsis && !seed.logline)) {
        if (!title && !idea) return res.status(400).json({ error: 'title or idea is required' })
        if (!modelId) return res.status(400).json({ error: 'model_id is required when seed is not provided' })
        const preferredGenre = String(req.body?.primary_genre || req.body?.genre || '').trim()
        const preferredFramework = String(req.body?.genre_framework || req.body?.framework || '').trim()
        const derived = await deriveProjectSeedWithModel(
          activeWorkspace,
          idea,
          modelId,
          title,
          lengthTarget,
          undefined,
          { preferredGenre, preferredFramework },
        )
        seed = derived.seed
        result = derived.result
      }
      if ((result as any)?.error || !seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length) {
        return res.status(502).json({
          error: (result as any)?.error || '模型未返回有效项目种子',
          raw_preview: String((result as any)?.content || '').slice(0, 3000),
        })
      }
      seed = stripLocalScaffoldOutlines(seed)
      let seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, buildProjectSeedDiagnostics(seed, idea, result))
      if (!hasUsableProjectSeed(seed)) {
        if (!modelId) {
          const recovered = buildRecoverableProjectSeed(seed, idea, title, lengthTarget, result)
          seed = stripLocalScaffoldOutlines(recovered.seed)
          seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, recovered.diagnostics)
        } else {
          const recovered = await expandThinProjectSeedWithModel(activeWorkspace, seed, result, idea, modelId, title, lengthTarget)
          seed = stripLocalScaffoldOutlines(recovered.seed)
          result = recovered.result
          seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, recovered.seed_diagnostics)
        }
      }
      // 有模型时，前30章细纲走独立模型步骤；无模型但种子本身可用则允许创建。
      if (modelId && projectSeedNeedsOutlineExpansion(seed)) {
        const outlined = await ensureProjectSeedModelOutlines(activeWorkspace, seed, idea, modelId, title, lengthTarget, result)
        seed = stripLocalScaffoldOutlines(outlined.seed)
        result = outlined.result || result
        seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, outlined.seed_diagnostics)
      }
      if (!hasUsableProjectSeed(seed)) {
        return res.status(502).json({
          error: '模型返回的项目种子仍不足，已保留可用信息，请补充草稿后重试',
          raw_preview: String((result as any)?.content || '').slice(0, 3000),
          seed,
          seed_diagnostics: seedDiagnostics,
        })
      }
      seedDiagnostics = annotateOutlineScaffoldDiagnostics(seed, seedDiagnostics || seed.seed_diagnostics)
      seed = attachProjectSeedDirector({ ...seed, seed_diagnostics: seedDiagnostics })
      // 作者已提交可用 seed 时，即使前30章仍待模型补强，也不阻断项目创建；仅在种子本身仍偏薄时 409。
      if (seedDiagnostics?.status === 'needs_author_review' || seedDiagnostics?.status === 'needs_model_expansion') {
        return res.status(409).json({
          error: '项目种子已恢复为可编辑草稿，但仍需要作者确认后再自动创建',
          seed,
          seed_diagnostics: seedDiagnostics,
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
        seed_diagnostics: seedDiagnostics,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.id)
      const project = await getNovelProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const memoryPurge = await purgeMemoryPalaceProject(projectId)
      const ok = await deleteNovelProject(activeWorkspace, projectId)
      if (!ok) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, memory_purge: memoryPurge })
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
      assertNoGenerationSourceMutation(req.body?.reference_config)
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.id)
      const updated = req.body?.reference_config === undefined
        ? await updateNovelProject(activeWorkspace, projectId, req.body)
        : await withNovelWorkspaceMutation(activeWorkspace, async () => {
            const current = await getNovelProject(activeWorkspace, projectId)
            if (!current) return null
            const currentConfig = current.reference_config || {}
            const requestedConfig = req.body.reference_config
            return updateNovelProject(activeWorkspace, projectId, {
              ...req.body,
              reference_config: requestedConfig === null
                ? currentConfig
                : preserveExistingGenerationSources(currentConfig, requestedConfig),
            })
          }, 'update-novel-project-preserving-prose-generation-source')
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated)
    } catch (error) {
      const mutationError = genericGenerationSourceMutationError(error)
      if (mutationError) return res.status(400).json(mutationError)
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
      assertNoGenerationSourceMutation(req.body)
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.params.id)
      const requestedConfig = req.body || {}
      const updated = await withNovelWorkspaceMutation(activeWorkspace, async () => {
        const current = await getNovelProject(activeWorkspace, projectId)
        if (!current) return null
        return updateNovelProject(activeWorkspace, projectId, {
          reference_config: preserveExistingGenerationSources(
            current.reference_config || {},
            requestedConfig,
          ),
        } as any)
      }, 'update-novel-project-reference-config-preserving-prose-generation-source')
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated.reference_config || { references: [], notes: '' })
    } catch (error) {
      const mutationError = genericGenerationSourceMutationError(error)
      if (mutationError) return res.status(400).json(mutationError)
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
    try {
      const view = String(req.query?.view || 'full')
      if (!['full', 'workspace'].includes(view)) return rejectInvalidQueryView(res, view, ['full', 'workspace'])
      res.json(view === 'workspace'
        ? await listNovelWorkspaceChapters(getWorkspace(), Number(req.params.id))
        : await listNovelChapters(getWorkspace(), Number(req.params.id)))
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.get('/api/novel/chapters/:chapterId', async (req, res) => {
    try {
      const projectId = requireProjectId(req, res)
      if (projectId === null) return
      const chapter = await getNovelChapter(getWorkspace(), Number(req.params.chapterId), projectId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      res.json(chapter)
    } catch (error) { res.status(500).json({ error: String(error) }) }
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
