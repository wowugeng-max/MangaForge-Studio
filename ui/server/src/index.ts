import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import {
  createActiveWorkspaceState,
  ensureWorkspaceStructure,
  getDefaultWorkspace,
  loadActiveWorkspace,
  saveActiveWorkspace,
} from './workspace'
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
import { registerMcpRoutes } from './routes/mcp-routes'
import { createMcpRuntime } from './mcp/runtime'
import { acceptWebSocketKey, sseManager, taskMessageManager, interruptRegisteredTask, webSocketManager, webSocketClientIdFromPath } from './ws-manager'
import { keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'
import {
  attachServerCloseShutdownHandler,
  attachSignalShutdownHandlers,
  bindHttpServer,
  closeHttpServer,
  createBackgroundServiceLifecycle,
  createShutdownCoordinator,
  startServerLifecycle,
} from './server-lifecycle'

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

const workspaceState = createActiveWorkspaceState(getDefaultWorkspace())
const getWorkspace = workspaceState.getWorkspace
const setWorkspace = workspaceState.setWorkspace
let server: ReturnType<typeof app.listen> | null = null

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
const mcpRuntime = createMcpRuntime(getWorkspace)
registerMcpRoutes(app, getWorkspace, mcpRuntime)
const novelLifecycle = registerNovelRoutes(app, getWorkspace)
registerKnowledgeRoutes(app)
registerFingerprintContractRoutes(app, getWorkspace)

let shutdownRequested = false
const backgroundServices = createBackgroundServiceLifecycle({
  bootstrap: async signal => {
    const ok = await bootstrapMempalace(signal)
    if (signal.aborted || shutdownRequested) return
    if (ok) {
      console.log('🧠 Memory Palace (MemPalace) initialized and ready')
    } else {
      console.log('🧠 Memory Palace running in SQLite fallback mode (mempalace not installed)')
    }
  },
  shouldStartMonitor: () => !shutdownRequested,
  startMonitor: () => {
    const monitor = startKeyMonitor(getWorkspace, {
      enabled: keyMonitorEnabledFromEnv(process.env.KEY_MONITOR_ENABLED),
      intervalMs: Number(process.env.KEY_MONITOR_INTERVAL_MS || 60 * 60 * 1000),
      onError: error => console.warn('Key monitor error:', String(error).slice(0, 240)),
    })
    if (monitor.started) console.log('Key monitoring task started')
    console.log(`Manga UI server on http://${host}:${port}`)
    return monitor
  },
})
const shutdown = createShutdownCoordinator({
  closeServer: () => closeHttpServer(server),
  stopBackgroundServices: () => backgroundServices.stop(),
  stopNovelLifecycle: () => novelLifecycle.stop(),
  stopMcpRuntime: () => mcpRuntime.close(),
  onShutdownError: error => {
    process.exitCode = 1
    console.error('Manga UI server shutdown failed:', String(error).slice(0, 400))
  },
})
const requestShutdown = (options?: { serverAlreadyClosed?: boolean }) => {
  shutdownRequested = true
  return shutdown(options)
}
attachSignalShutdownHandlers({ signalSource: process, shutdown: requestShutdown })

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

async function listen() {
  let listeningServer: ReturnType<typeof app.listen>
  try {
    listeningServer = await bindHttpServer({
      createServer: () => app.listen(port, host),
      onServer: bindingServer => { server = bindingServer },
    })
  } catch (error) {
    server = null
    throw error
  }
  attachServerCloseShutdownHandler({ server: listeningServer, shutdown: requestShutdown })

  listeningServer.on('upgrade', (req, socket) => {
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

  void backgroundServices.start().catch(error => {
    console.warn('Server background startup failed:', String(error).slice(0, 240))
  })

  return listeningServer
}

void startServerLifecycle({
  loadActiveWorkspace,
  activateWorkspace: setWorkspace,
  ensureWorkspaceStructure,
  saveActiveWorkspace,
  startNovelLifecycle: async workspace => {
    await novelLifecycle.start(workspace)
    workspaceState.bindRevisionWorkspace(workspace)
  },
  shouldListen: () => !shutdownRequested,
  listen,
  onStartupError: async error => {
    const expectedBindingClose = shutdownRequested
      && (error as { code?: string } | null)?.code === 'SERVER_BIND_CLOSED'
    await requestShutdown().catch(() => {})
    if (expectedBindingClose) return
    process.exitCode = 1
    console.error('Manga UI server startup failed:', String(error).slice(0, 400))
  },
})
