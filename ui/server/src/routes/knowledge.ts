import type { Express } from 'express'
import {
  storeKnowledge,
  queryKnowledge,
  listKnowledge,
  purgeKnowledge,
  purgeKnowledgeBySource,
  fetchUrlText,
  analyzeKnowledge,
  batchStoreKnowledge,
  readUploadedLocalFile,
  playwrightFetchUrl,
  playwrightFetchSerial,
  startKnowledgeIngestJob,
  getKnowledgeIngestJob,
  cancelKnowledgeIngestJob,
  pauseKnowledgeIngestJob,
  resumeKnowledgeIngestJob,
  reanalyzeKnowledgeIngestBatch,
  synthesizeProjectProfileKnowledge,
  listSourceCaches,
  getSourceCache,
  getSourceCachedChapter,
} from '../knowledge-base'

export function registerKnowledgeRoutes(app: Express) {
  /** GET /api/knowledge — 列出知识库条目（可选按 category 筛选） */
  app.get('/api/knowledge', async (req, res) => {
    try {
      const category = req.query.category as string || ''
      const projectId = Number(req.query.project_id || req.query.projectId || 0) || undefined
      const projectTitle = String(req.query.project_title || req.query.projectTitle || '').trim() || undefined
      const projectScope = { project_id: projectId, project_title: projectTitle }
      const entries = await listKnowledge(category || undefined, projectScope)
      const all = await listKnowledge(undefined, projectScope)
      const projectRows = projectId || projectTitle ? await listKnowledge() : all
      const profileCategories = new Set([
        'reference_profile',
        'volume_architecture',
        'chapter_beat_template',
        'character_function_matrix',
        'resource_economy_model',
        'style_profile',
      ])
      const projectCounts = new Map<string, { title: string; count: number; categories: Record<string, number>; profile_count: number }>()
      for (const entry of projectRows) {
        const title = String(entry.project_title || '').trim()
        if (!title) continue
        const current = projectCounts.get(title) || { title, count: 0, categories: {}, profile_count: 0 }
        current.count += 1
        const cat = String(entry.category || 'general')
        current.categories[cat] = (current.categories[cat] || 0) + 1
        if (profileCategories.has(cat)) current.profile_count += 1
        projectCounts.set(title, current)
      }
      const projects = Array.from(projectCounts.values())
        .map(item => ({
          ...item,
          profile_complete: ['reference_profile', 'chapter_beat_template', 'character_function_matrix', 'style_profile']
            .every(cat => (item.categories[cat] || 0) > 0),
        }))
        .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-CN'))
      const summary: Record<string, { label: string; count: number }> = {}
      const categories = new Set(all.map(e => e.category).filter(Boolean))
      const catMap: Record<string, string> = {
        character_design: '人物设计',
        story_design: '故事设计',
        realm_design: '境界设计',
        writing_style: '写作风格',
        technique: '写作技巧',
        foreshadowing: '伏笔设计',
        worldbuilding: '世界观设计',
        ability_design: '能力体系设计',
        story_pacing: '节奏设计',
        volume_design: '分卷设计',
        character_craft: '角色塑造',
        genre_positioning: '题材定位',
        trope_design: '套路设计',
        selling_point: '卖点设计',
        reader_hook: '读者钩子',
        emotion_design: '情绪设计',
        scene_design: '场景设计',
        conflict_design: '冲突设计',
        resource_economy: '资源经济',
        reference_profile: '参考作品画像',
        volume_architecture: '分卷结构',
        chapter_beat_template: '章节节拍模板',
        character_function_matrix: '角色功能矩阵',
        resource_economy_model: '资源经济模型',
        style_profile: '文风画像',
      }
      for (const cat of categories) {
        summary[cat] = {
          label: catMap[cat] || cat,
          count: all.filter(e => e.category === cat).length,
        }
      }
      res.json({ entries, summary, projects })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/entries — 手动添加知识条目 */
  app.post('/api/knowledge/entries', async (req, res) => {
    try {
      const { category, title, content, source, source_title, tags, genre_tags, trope_tags, use_case, evidence, chapter_range, entities, confidence, weight, project_id, project_title } = req.body
      if (!category || !content) {
        return res.status(400).json({ error: 'category 和 content 不能为空' })
      }
      const result = await storeKnowledge({
        category,
        content,
        source: source || '手动添加',
        source_title: source_title || source || '手动添加',
        title: title || '',
        tags: Array.isArray(tags) ? tags : [],
        genre_tags: Array.isArray(genre_tags) ? genre_tags : [],
        trope_tags: Array.isArray(trope_tags) ? trope_tags : [],
        use_case: use_case || '',
        evidence: evidence || '',
        chapter_range: chapter_range || '',
        entities: Array.isArray(entities) ? entities : [],
        confidence: Number(confidence || 0) || undefined,
        weight: Number(weight) || 3,
        project_id: project_id ? Number(project_id) : undefined,
        project_title: project_title || undefined,
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** DELETE /api/knowledge/entries/:id — 删除单个知识条目 */
  app.delete('/api/knowledge/entries/:id', async (req, res) => {
    try {
      const result = await purgeKnowledge([req.params.id])
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/entries/purge — 批量删除知识条目 */
  app.post('/api/knowledge/entries/purge', async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map((id: any) => String(id || '').trim()).filter(Boolean)
        : []
      if (ids.length === 0) {
        return res.status(400).json({ error: 'ids 必须是非空数组' })
      }
      const result = await purgeKnowledge(ids)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** DELETE /api/knowledge/source/:source — 清理某来源的所有知识 */
  app.delete('/api/knowledge/source/:source', async (req, res) => {
    try {
      const result = await purgeKnowledgeBySource(decodeURIComponent(req.params.source))
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/fetch-url — 在线抓取网页文本 */
  app.post('/api/knowledge/fetch-url', async (req, res) => {
    try {
      const { url } = req.body
      if (!url) {
        return res.status(400).json({ error: 'url 不能为空' })
      }
      const result = await fetchUrlText(url)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/read-local-file — 读取前端上传的本地 txt/pdf 文件 */
  app.post('/api/knowledge/read-local-file', async (req, res) => {
    try {
      const { filename, mime_type, text, base64 } = req.body || {}
      if (!filename) {
        return res.status(400).json({ error: 'filename 不能为空' })
      }
      const result = await readUploadedLocalFile({ filename, mime_type, text, base64 })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/analyze — LLM 分析文本并提取知识（不存储，仅返回分析结果供用户预览编辑） */
  app.post('/api/knowledge/analyze', async (req, res) => {
    const controller = new AbortController()
    const abortIfClientClosed = () => {
      if (!res.writableEnded) controller.abort()
    }
    res.on('close', abortIfClientClosed)
    try {
      const { source, text, model_id, modelId } = req.body
      if (!source || !text) {
        return res.status(400).json({ error: 'source 和 text 不能为空' })
      }
      const entries = await analyzeKnowledge(text, source, Number(model_id || modelId || 0) || undefined, {
        signal: controller.signal,
      })
      res.json({ ok: true, entries })
    } catch (error) {
      if (controller.signal.aborted) {
        if (!res.headersSent && !res.destroyed) {
          return res.status(499).json({ error: 'Request canceled' })
        }
        return
      }
      res.status(500).json({ error: String(error) })
    } finally {
      res.off('close', abortIfClientClosed)
    }
  })

  /** POST /api/knowledge/entries/batch — 批量存储知识条目（analyze 后的确认存储） */
  app.post('/api/knowledge/entries/batch', async (req, res) => {
    try {
      const { entries, project_id, project_title } = req.body
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'entries 必须是非空数组' })
      }
      const result = await batchStoreKnowledge(entries, {
        project_id: project_id ? Number(project_id) : undefined,
        project_title: project_title || undefined,
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/projects/profile-supplement — 从已有知识中补齐仿写画像类条目 */
  app.post('/api/knowledge/projects/profile-supplement', async (req, res) => {
    try {
      const { project_title, projectTitle, missing_categories, missingCategories, model_id, modelId } = req.body || {}
      const result = await synthesizeProjectProfileKnowledge({
        project_title: String(project_title || projectTitle || '').trim(),
        missing_categories: Array.isArray(missing_categories) ? missing_categories : missingCategories,
        model_id: Number(model_id || modelId || 0) || undefined,
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/upload — 接收前端上传的纯文本（TXT / PDF 前端解析后提交） */
  app.post('/api/knowledge/upload', async (req, res) => {
    try {
      const { text, source, category, title, tags, genre_tags, trope_tags, use_case, evidence, chapter_range, entities, confidence, weight, project_id, project_title } = req.body
      if (!text) {
        return res.status(400).json({ error: 'text 不能为空' })
      }
      const result = await storeKnowledge({
        category: category || 'writing_style',
        content: text,
        source: source || '文件上传',
        source_title: source || '文件上传',
        title: title || '',
        tags: Array.isArray(tags) ? tags : [],
        genre_tags: Array.isArray(genre_tags) ? genre_tags : [],
        trope_tags: Array.isArray(trope_tags) ? trope_tags : [],
        use_case: use_case || '',
        evidence: evidence || '',
        chapter_range: chapter_range || '',
        entities: Array.isArray(entities) ? entities : [],
        confidence: Number(confidence || 0) || undefined,
        weight: Number(weight) || 3,
        project_id: project_id ? Number(project_id) : undefined,
        project_title: project_title || undefined,
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/query — 语义检索知识 */
  app.post('/api/knowledge/query', async (req, res) => {
    try {
      const { query, category, top_k, project_id, projectId, project_title } = req.body
      const results = await queryKnowledge(query, {
        category,
        top_k: Number(top_k) || 5,
        project_id: Number(project_id || projectId || 0) || undefined,
        project_title: project_title || undefined,
      })
      res.json({ results })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** GET /api/knowledge/source-caches — 查看正文缓存总览 */
  app.get('/api/knowledge/source-caches', async (_req, res) => {
    try {
      const caches = await listSourceCaches()
      res.json({ ok: true, caches })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** GET /api/knowledge/source-caches/:key — 查看某本正文缓存目录 */
  app.get('/api/knowledge/source-caches/:key', async (req, res) => {
    try {
      const cache = await getSourceCache(req.params.key)
      if (!cache) return res.status(404).json({ error: '正文缓存不存在' })
      res.json({ ok: true, cache })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** GET /api/knowledge/source-caches/:key/chapters/:chapter — 读取缓存单章正文 */
  app.get('/api/knowledge/source-caches/:key/chapters/:chapter', async (req, res) => {
    try {
      const chapter = await getSourceCachedChapter(req.params.key, Number(req.params.chapter || 0))
      if (!chapter) return res.status(404).json({ error: '缓存章节不存在' })
      res.json({ ok: true, chapter })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/playwright-fetch — Playwright 抓取 SPA 网页 */
  app.post('/api/knowledge/playwright-fetch', async (req, res) => {
    try {
      const { url } = req.body
      if (!url) {
        return res.status(400).json({ error: 'url 不能为空' })
      }
      const result = await playwrightFetchUrl(url)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/playwright-serial — Playwright 连载抓取（自动追下一章） */
  app.post('/api/knowledge/playwright-serial', async (req, res) => {
    try {
      const { url, maxChapters, start_chapter, startChapter, fetch_concurrency, fetchConcurrency } = req.body
      if (!url) {
        return res.status(400).json({ error: 'url 不能为空' })
      }
      const result = await playwrightFetchSerial(
        url,
        Number(maxChapters) || 500,
        Number(start_chapter || startChapter || 1),
        undefined,
        Number(fetch_concurrency || fetchConcurrency || 1),
      )
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/start — 后台任务：连载抓取 → 分批提炼 → 去重合并 */
  app.post('/api/knowledge/ingest/start', async (req, res) => {
    try {
      const { url, model_id, modelId, start_chapter, startChapter, max_chapters, maxChapters, batch_size, batchSize, fetch_concurrency, fetchConcurrency, full_book, fullBook, fetch_only, fetchOnly, auto_store, autoStore, project_id, projectId, project_title, projectTitle } = req.body || {}
      const job = startKnowledgeIngestJob({
        url,
        model_id: Number(model_id || modelId || 0) || undefined,
        full_book: Boolean(full_book || fullBook),
        fetch_only: Boolean(fetch_only || fetchOnly),
        auto_store: Boolean(auto_store || autoStore),
        project_id: Number(project_id || projectId || 0) || undefined,
        project_title: String(project_title || projectTitle || '').trim() || undefined,
        start_chapter: Number(start_chapter || startChapter || 1),
        max_chapters: Number(max_chapters || maxChapters || 50),
        batch_size: Number(batch_size || batchSize || 10),
        fetch_concurrency: Number(fetch_concurrency || fetchConcurrency || 1),
      })
      res.json({ ok: true, job })
    } catch (error) {
      res.status(400).json({ error: String(error) })
    }
  })

  /** GET /api/knowledge/ingest/:id — 查询后台提炼任务进度和结果 */
  app.get('/api/knowledge/ingest/:id', async (req, res) => {
    try {
      const job = getKnowledgeIngestJob(req.params.id)
      if (!job) return res.status(404).json({ error: '任务不存在或已过期' })
      res.json({ ok: true, job })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/:id/cancel — 取消后台提炼任务 */
  app.post('/api/knowledge/ingest/:id/cancel', async (req, res) => {
    try {
      const job = cancelKnowledgeIngestJob(req.params.id)
      if (!job) return res.status(404).json({ error: '任务不存在或已过期' })
      res.json({ ok: true, job })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/:id/pause — 暂停后台提炼任务，保留已完成批次 */
  app.post('/api/knowledge/ingest/:id/pause', async (req, res) => {
    try {
      const job = pauseKnowledgeIngestJob(req.params.id)
      if (!job) return res.status(404).json({ error: '任务不存在或已过期' })
      res.json({ ok: true, job })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/:id/resume — 继续后台提炼任务，从未完成批次开始 */
  app.post('/api/knowledge/ingest/:id/resume', async (req, res) => {
    try {
      const { model_id, modelId } = req.body || {}
      const job = resumeKnowledgeIngestJob(req.params.id, Number(model_id || modelId || 0) || undefined)
      if (!job) return res.status(404).json({ error: '任务不存在或已过期' })
      res.json({ ok: true, job })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/:id/reanalyze — 重新提炼指定批次 */
  app.post('/api/knowledge/ingest/:id/reanalyze', async (req, res) => {
    try {
      const { batch_index, batchIndex, model_id, modelId } = req.body || {}
      const job = await reanalyzeKnowledgeIngestBatch(
        req.params.id,
        Number(batch_index ?? batchIndex),
        Number(model_id || modelId || 0) || undefined,
      )
      res.json({ ok: true, job })
    } catch (error) {
      res.status(400).json({ error: String(error) })
    }
  })
}
