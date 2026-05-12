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
  reanalyzeKnowledgeIngestBatch,
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
      const projectCounts = new Map<string, number>()
      for (const entry of projectRows) {
        const title = String(entry.project_title || '').trim()
        if (!title) continue
        projectCounts.set(title, (projectCounts.get(title) || 0) + 1)
      }
      const projects = Array.from(projectCounts.entries())
        .map(([title, count]) => ({ title, count }))
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
      const { category, title, content, source, source_title, tags, weight, project_id, project_title } = req.body
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
    try {
      const { source, text, model_id, modelId } = req.body
      if (!source || !text) {
        return res.status(400).json({ error: 'source 和 text 不能为空' })
      }
      const entries = await analyzeKnowledge(text, source, Number(model_id || modelId || 0) || undefined)
      res.json({ ok: true, entries })
    } catch (error) {
      res.status(500).json({ error: String(error) })
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

  /** POST /api/knowledge/upload — 接收前端上传的纯文本（TXT / PDF 前端解析后提交） */
  app.post('/api/knowledge/upload', async (req, res) => {
    try {
      const { text, source, category, title, tags, weight, project_id, project_title } = req.body
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
      const { url, maxChapters } = req.body
      if (!url) {
        return res.status(400).json({ error: 'url 不能为空' })
      }
      const result = await playwrightFetchSerial(url, Number(maxChapters) || 500)
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** POST /api/knowledge/ingest/start — 后台任务：连载抓取 → 分批提炼 → 去重合并 */
  app.post('/api/knowledge/ingest/start', async (req, res) => {
    try {
      const { url, model_id, modelId, start_chapter, startChapter, max_chapters, maxChapters, batch_size, batchSize } = req.body || {}
      const job = startKnowledgeIngestJob({
        url,
        model_id: Number(model_id || modelId || 0) || undefined,
        start_chapter: Number(start_chapter || startChapter || 1),
        max_chapters: Number(max_chapters || maxChapters || 50),
        batch_size: Number(batch_size || batchSize || 10),
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
