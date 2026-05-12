import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { getDefaultWorkspace, ensureWorkspaceStructure, loadActiveWorkspace, saveActiveWorkspace } from './workspace'
import { bootstrapMempalace } from './memory-service'
import { registerProjectRoutes } from './routes/projects'
import { registerAssetCrudRoutes } from './routes/assets-crud'
import { registerAssetMediaRoutes } from './routes/assets-media'
import { registerWorkspaceRoutes } from './routes/workspace'
import { registerPipelineRoutes } from './routes/pipeline'
import { registerTemplateRoutes } from './routes/templates'
import { registerStatusRoutes } from './routes/status'
import { registerRunRoutes } from './routes/runs'
import { registerLogRoutes } from './routes/logs'
import { registerKeyRoutes } from './routes/keys'
import { registerProviderRoutes } from './routes/providers'
import { registerModelRoutes } from './routes/models'
import { registerCanvasRoutes } from './routes/canvas'
import { registerNovelRoutes } from './routes/novel'
import { registerKnowledgeRoutes } from './routes/knowledge'
import { sseManager, unregisterTask, getTask } from './ws-manager'

// 加载 .env
// 注意：模型配置（LLM_OPENAI_ENDPOINT / LLM_LOCAL_ENDPOINT / ANTHROPIC_BASE_URL 等）
// 已从 .env 链路移除，以数据库 (models.json / providers.json / keys.json) 为唯一标准。
// 仅加载非模型配置类的环境变量（如 SQLITE_DATABASE_URL）。
function loadEnvFile(path: string) {
  // 这些环境变量已被数据库取代，不再从 .env 加载
  const blockedModelVars = new Set([
    'LLM_OPENAI_ENDPOINT', 'LLM_OPENAI_API_KEY',
    'LLM_QWEN_ENDPOINT', 'LLM_QWEN_API_KEY',
    'LLM_LOCAL_ENDPOINT', 'LLM_LOCAL_API_KEY',
    'LLM_CUSTOM_ENDPOINT', 'LLM_CUSTOM_API_KEY',
    'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN',
    'LLM_PROVIDER',
  ])
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
      if (blockedModelVars.has(key)) continue // 跳过已废弃的模型环境变量
      const value = trimmed.slice(idx + 1).trim()
      if (key && process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // ignore missing env file
  }
}

loadEnvFile('/Users/ruiyaosong/MangaForge-Studio/ui/server/.env')

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

let activeWorkspace = getDefaultWorkspace()
const getWorkspace = () => activeWorkspace
const setWorkspace = (value: string) => { activeWorkspace = value }

registerProjectRoutes(app, getWorkspace)
registerAssetCrudRoutes(app, getWorkspace)
registerAssetMediaRoutes(app, getWorkspace)
registerWorkspaceRoutes(app, getWorkspace, setWorkspace)
registerPipelineRoutes(app, getWorkspace)
registerTemplateRoutes(app)
registerStatusRoutes(app, getWorkspace)
registerRunRoutes(app, getWorkspace)
registerLogRoutes(app, getWorkspace)
registerKeyRoutes(app, getWorkspace)
registerProviderRoutes(app, getWorkspace)
registerModelRoutes(app, getWorkspace)
registerCanvasRoutes(app, getWorkspace)
registerNovelRoutes(app, getWorkspace)
registerKnowledgeRoutes(app)

// ── SSE: Real-time task progress ──
app.get('/api/sse/:clientId', (_req, res) => {
  const clientId = _req.params.clientId
  console.log(`🔗 [SSE] Client ${clientId} connected for real-time updates`)

  // Handle client disconnect
  _req.on('close', () => {
    console.log(`🛑 [SSE] Client ${clientId} disconnected`)
    sseManager.disconnect(clientId)
    unregisterTask(clientId)
  })

  // Handle errors
  _req.on('error', () => {
    sseManager.disconnect(clientId)
    unregisterTask(clientId)
  })

  // Subscribe client
  sseManager.subscribe(clientId, res)
})

// ── Task Interrupt ──
app.post('/api/interrupt/:clientId', async (_req, res) => {
  const clientId = _req.params.clientId
  console.log(`\n🛑 [Interrupt] Received interrupt request for task: ${clientId}`)

  const task = getTask(clientId)
  if (!task) {
    console.warn(`[Interrupt] No active task found for ${clientId}`)
    return res.json({
      success: false,
      message: '未找到正在运行的任务',
    })
  }

  // First strike: set cancel token (stops the adapter at the next checkpoint)
  task.cancelToken.cancelled = true
  console.log(`  👉 [Interrupt Step 1] Cancel token set for ${clientId}`)

  // Second strike: notify the client
  await sseManager.sendMessage(clientId, {
    type: 'interrupted',
    message: '任务已被手动强行终止',
  })

  // Cleanup
  unregisterTask(clientId)

  console.log(`✅ [Interrupt] Task ${clientId} terminated successfully\n`)
  res.json({
    success: true,
    message: '已斩断底层任务并释放资源',
    physical_interrupted: true,
  })
})

app.listen(8787, async () => {
  activeWorkspace = await loadActiveWorkspace()
  await ensureWorkspaceStructure(activeWorkspace)
  await saveActiveWorkspace(activeWorkspace)

  // ── Memory Palace auto-bootstrapping ──
  try {
    const ok = await bootstrapMempalace()
    if (ok) {
      console.log('🧠 Memory Palace (MemPalace) initialized and ready')
    } else {
      console.log('🧠 Memory Palace running in SQLite fallback mode (mempalace not installed)')
    }
  } catch (err) {
    console.warn('⚠️  Memory Palace bootstrap failed, falling back to SQLite:', String(err).slice(0, 200))
  }

  console.log('Manga UI server on http://localhost:8787')
})
