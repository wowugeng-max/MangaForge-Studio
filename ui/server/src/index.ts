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
import { registerGenerateRoutes } from './routes/generate'
import { registerVideoLoopRoutes } from './routes/video-loop'
import { registerDirectTaskRoutes } from './routes/direct-task'
import { registerMangaCompatRoutes } from './routes/manga-compat'
import { registerNovelRoutes } from './routes/novel'
import { registerKnowledgeRoutes } from './routes/knowledge'
import { registerFingerprintContractRoutes } from './routes/fingerprint-contracts'
import { registerRecommendationRoutes } from './routes/recommendation-rules'
import { acceptWebSocketKey, sseManager, taskMessageManager, interruptRegisteredTask, webSocketManager, webSocketClientIdFromPath } from './ws-manager'
import { keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'

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

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || 'localhost'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

let activeWorkspace = getDefaultWorkspace()
const getWorkspace = () => activeWorkspace
const setWorkspace = (value: string) => { activeWorkspace = value }
let keyMonitor: ReturnType<typeof startKeyMonitor> | null = null

registerProjectRoutes(app, getWorkspace)
registerAssetCrudRoutes(app, getWorkspace)
registerAssetMediaRoutes(app, getWorkspace)
registerWorkspaceRoutes(app, getWorkspace, setWorkspace)
registerPipelineRoutes(app, getWorkspace)
registerMangaCompatRoutes(app, getWorkspace, setWorkspace)
registerTemplateRoutes(app)
registerStatusRoutes(app, getWorkspace)
registerRunRoutes(app, getWorkspace)
registerLogRoutes(app, getWorkspace)
registerKeyRoutes(app, getWorkspace)
registerProviderRoutes(app, getWorkspace)
registerModelRoutes(app, getWorkspace)
registerCanvasRoutes(app, getWorkspace)
registerGenerateRoutes(app, getWorkspace)
registerVideoLoopRoutes(app, getWorkspace)
registerDirectTaskRoutes(app, getWorkspace)
registerRecommendationRoutes(app, getWorkspace)
registerNovelRoutes(app, getWorkspace)
registerKnowledgeRoutes(app)
registerFingerprintContractRoutes(app, getWorkspace)

// ── SSE: Real-time task progress ──
app.get('/api/sse/:clientId', (_req, res) => {
  const clientId = _req.params.clientId
  console.log(`🔗 [SSE] Client ${clientId} connected for real-time updates`)

  // Handle client disconnect
  _req.on('close', () => {
    console.log(`🛑 [SSE] Client ${clientId} disconnected`)
    sseManager.disconnect(clientId)
  })

  // Handle errors
  _req.on('error', () => {
    sseManager.disconnect(clientId)
  })

  // Subscribe client
  sseManager.subscribe(clientId, res)
})

// ── Task Interrupt ──
app.post(['/api/interrupt/:clientId', '/api/interrupt/:clientId/'], async (_req, res) => {
  const clientId = _req.params.clientId
  console.log(`\n🛑 [Interrupt] Received interrupt request for task: ${clientId}`)

  const result = await interruptRegisteredTask(clientId, (id, message) => taskMessageManager.sendMessage(id, message))
  if (!result.success) console.warn(`[Interrupt] No active task found for ${clientId}`)
  else console.log(`✅ [Interrupt] Task ${clientId} terminated successfully\n`)
  res.json(result)
})

const server = app.listen(port, host, async () => {
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

  keyMonitor = startKeyMonitor(getWorkspace, {
    enabled: keyMonitorEnabledFromEnv(process.env.KEY_MONITOR_ENABLED),
    intervalMs: Number(process.env.KEY_MONITOR_INTERVAL_MS || 60 * 60 * 1000),
    onError: error => console.warn('Key monitor error:', String(error).slice(0, 240)),
  })
  if (keyMonitor.started) console.log('Key monitoring task started')

  console.log(`Manga UI server on http://${host}:${port}`)
})

server.on('close', () => {
  keyMonitor?.stop()
})

server.on('upgrade', (req, socket) => {
  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname
  if (!pathname.startsWith('/api/ws/')) {
    socket.end('HTTP/1.1 404 Not Found\r\n\r\n')
    return
  }

  const clientId = webSocketClientIdFromPath(pathname)
  const key = String(req.headers['sec-websocket-key'] || '')
  if (!clientId || !key) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    return
  }

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptWebSocketKey(key)}`,
    '',
    '',
  ].join('\r\n'))

  webSocketManager.connect(clientId, socket)
  socket.on('close', () => {
    webSocketManager.disconnect(clientId, socket)
  })
  socket.on('error', () => {
    webSocketManager.disconnect(clientId, socket)
  })
})
