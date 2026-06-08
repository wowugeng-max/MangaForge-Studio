import type { Express } from 'express'
import { executeCloudVideoLoop, executeLegacyVideoLoop, executeRealVideoLoop, isLegacyVideoLoopRequest, type VideoLoopResult, type VideoLoopTaskRequest } from '../video-loop'

type VideoLoopRouteDeps = {
  realExecute?: (options: { workspace: string; request: VideoLoopTaskRequest }) => Promise<VideoLoopResult>
  cloudExecute?: (options: { workspace: string; request: VideoLoopTaskRequest }) => Promise<VideoLoopResult>
  legacyExecute?: (options: { workspace: string; request: VideoLoopTaskRequest }) => Promise<VideoLoopResult>
}

function errorStatus(error: unknown) {
  const text = String(error)
  if (/缺少|不能为空|必须|不存在|未找到|类型错误|不完整|invalid/i.test(text)) return 400
  return 500
}

function sanitizeError(error: unknown) {
  return String(error).replace(/^Error:\s*/, '')
}

function errorBody(error: unknown) {
  const message = sanitizeError(error)
  return { error: message, detail: message }
}

export function registerVideoLoopRoutes(app: Express, getWorkspace: () => string, deps: VideoLoopRouteDeps = {}) {
  const realExecute = deps.realExecute || executeRealVideoLoop
  const cloudExecute = deps.cloudExecute || executeCloudVideoLoop
  const legacyExecute = deps.legacyExecute || executeLegacyVideoLoop

  app.post(['/api/tasks/video_loop', '/api/tasks/video_loop/'], async (req, res) => {
    try {
      const request = req.body || {}
      const execute = isLegacyVideoLoopRequest(request) ? legacyExecute : realExecute
      const result = await execute({ workspace: getWorkspace(), request })
      res.json(result)
    } catch (error) {
      res.status(errorStatus(error)).json(errorBody(error))
    }
  })

  app.post(['/api/tasks/real_video_loop', '/api/tasks/real_video_loop/'], async (req, res) => {
    try {
      const result = await realExecute({ workspace: getWorkspace(), request: req.body || {} })
      res.json(result)
    } catch (error) {
      res.status(errorStatus(error)).json(errorBody(error))
    }
  })

  app.post(['/api/tasks/cloud_video_loop', '/api/tasks/cloud_video_loop/'], async (req, res) => {
    try {
      const result = await cloudExecute({ workspace: getWorkspace(), request: req.body || {} })
      res.json(result)
    } catch (error) {
      res.status(errorStatus(error)).json(errorBody(error))
    }
  })
}
