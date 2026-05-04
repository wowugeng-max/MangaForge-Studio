import type { Express } from 'express'
import { readAssetMediaFile } from '../asset-media'
import { normalizeUploadFilename, uploadAssetBuffer } from '../asset-upload'
import { guessAssetMimeType } from '../asset-mime'

export function registerAssetMediaRoutes(app: Express, getWorkspace: () => string) {
  app.post('/api/assets/upload/image', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const filename = normalizeUploadFilename(String(req.query.filename || 'upload.png'))
      const content = req.body
      const buffer = Buffer.isBuffer(content)
        ? content
        : typeof content === 'string'
          ? Buffer.from(content)
          : Buffer.from(JSON.stringify(content ?? {}))

      const filePath = await uploadAssetBuffer(activeWorkspace, filename, buffer)
      res.json({ file_path: filePath, width: 0, height: 0, format: 'png' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/assets/upload/video', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const filename = normalizeUploadFilename(String(req.query.filename || 'upload.mp4'))
      const content = req.body
      const buffer = Buffer.isBuffer(content)
        ? content
        : typeof content === 'string'
          ? Buffer.from(content)
          : Buffer.from(JSON.stringify(content ?? {}))

      const filePath = await uploadAssetBuffer(activeWorkspace, filename, buffer)
      res.json({ file_path: filePath, width: 0, height: 0, duration: 0, fps: 0, format: 'mp4' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/assets/media/*', async (req, res) => {
    try {
      const mediaPath = decodeURIComponent(String(req.path.replace('/api/assets/media/', '')))
      const content = await readAssetMediaFile(mediaPath)
      res.setHeader('Content-Type', guessAssetMimeType(mediaPath))
      res.send(content)
    } catch (error) {
      res.status(404).json({ error: String(error) })
    }
  })
}
