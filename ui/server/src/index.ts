import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { getDefaultWorkspace, ensureWorkspaceStructure, loadActiveWorkspace, saveActiveWorkspace } from './workspace'
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

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      const key = trimmed.slice(0, idx).trim()
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

console.log('[ui-server] LLM_CLAUDE_ENDPOINT =', process.env.LLM_CLAUDE_ENDPOINT || '(unset)')
console.log('[ui-server] LLM_GEMINI_ENDPOINT =', process.env.LLM_GEMINI_ENDPOINT || '(unset)')
console.log('[ui-server] LLM_QWEN_ENDPOINT =', process.env.LLM_QWEN_ENDPOINT || '(unset)')
console.log('[ui-server] LLM_LOCAL_ENDPOINT =', process.env.LLM_LOCAL_ENDPOINT || '(unset)')
console.log('[ui-server] LLM_LOCAL_API_KEY =', process.env.LLM_LOCAL_API_KEY ? '(set)' : '(unset)')

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

app.listen(8787, async () => {
  activeWorkspace = await loadActiveWorkspace()
  await ensureWorkspaceStructure(activeWorkspace)
  await saveActiveWorkspace(activeWorkspace)
  console.log('Manga UI server on http://localhost:8787')
})
