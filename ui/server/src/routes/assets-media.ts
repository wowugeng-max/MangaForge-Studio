import express, { type Express } from 'express'
import { execFile } from 'child_process'
import { readFile } from 'fs/promises'
import { isAbsolute, relative, resolve } from 'path'
import { readAssetMediaFile } from '../asset-media'
import { normalizeUploadFilename, uploadAssetBuffer, uploadAssetBufferDeduped } from '../asset-upload'
import { guessAssetMimeType } from '../asset-mime'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'])
const RAW_UPLOAD_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

export function parseMultipartFileUpload(contentType: string, body: Buffer, fallbackFilename: string) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]
  if (!boundary) return { filename: fallbackFilename, buffer: body }
  const delimiter = Buffer.from(`--${boundary}`)
  let cursor = body.indexOf(delimiter)
  while (cursor >= 0) {
    const headerStart = cursor + delimiter.length
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd < 0) break
    const headerText = body.slice(headerStart, headerEnd).toString('utf8')
    const nextDelimiter = body.indexOf(delimiter, headerEnd + 4)
    if (nextDelimiter < 0) break
    const filename = headerText.match(/filename="([^"]+)"/i)?.[1] || fallbackFilename
    const partContentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim()
    if (/name="file"/i.test(headerText) || /filename=/i.test(headerText)) {
      let fileEnd = nextDelimiter
      if (body[fileEnd - 2] === 13 && body[fileEnd - 1] === 10) fileEnd -= 2
      return { filename, buffer: body.slice(headerEnd + 4, fileEnd), contentType: partContentType }
    }
    cursor = body.indexOf(delimiter, nextDelimiter + delimiter.length)
  }
  return { filename: fallbackFilename, buffer: body }
}

function normalizeMimeType(contentType: string) {
  return String(contentType || '').split(';')[0].trim().toLowerCase()
}

function validateUploadMime(kind: 'image' | 'video', contentType: string) {
  const mime = normalizeMimeType(contentType)
  if (RAW_UPLOAD_TYPES.has(mime)) return
  const allowed = kind === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES
  if (!allowed.has(mime)) {
    const label = kind === 'image' ? '图片' : '视频'
    throw new Error(`不支持的${label}格式: ${mime || 'unknown'}`)
  }
}

function requiresStrictImageParsing(contentType: string) {
  const mime = normalizeMimeType(contentType)
  return mime.startsWith('image/') && !RAW_UPLOAD_TYPES.has(mime)
}

function assertParsableImageUpload(buffer: Buffer, filename: string) {
  const metadata = readImageMetadata(buffer, filename)
  if (!metadata.width || !metadata.height) throw new Error('无法解析图片文件')
}

function normalizeImageFormat(format: string) {
  const value = format.toLowerCase()
  return value === 'jpeg' ? 'jpg' : value
}

function readImageMetadata(buffer: Buffer, filename: string) {
  const fallbackFormat = normalizeImageFormat(filename.split('.').pop() || 'png')
  try {
    if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' }
    }
    if (buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'GIF') {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), format: 'gif' }
    }
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
      const chunk = buffer.subarray(12, 16).toString('ascii')
      if (chunk === 'VP8X' && buffer.length >= 30) {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3),
          format: 'webp',
        }
      }
      if (chunk === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21)
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
          format: 'webp',
        }
      }
      if (chunk === 'VP8 ' && buffer.length >= 30) {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
          format: 'webp',
        }
      }
    }
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1
          continue
        }
        const marker = buffer[offset + 1]
        const length = buffer.readUInt16BE(offset + 2)
        if (length < 2) break
        const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)
        if (isSof) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpg' }
        offset += 2 + length
      }
    }
  } catch {
    // Fall through to the old zero-dimension fallback for malformed or raw uploads.
  }
  return { width: 0, height: 0, format: fallbackFormat }
}

export function parseFfprobeVideoMetadata(payload: any, fallbackFormat: string) {
  const streams = Array.isArray(payload?.streams) ? payload.streams : []
  const video = streams.find((stream: any) => String(stream?.codec_type || '').toLowerCase() === 'video') || {}
  const duration = Number(video.duration ?? payload?.format?.duration ?? 0)
  const [rawNumerator, rawDenominator] = String(video.r_frame_rate || video.avg_frame_rate || '').split('/')
  const numerator = Number(rawNumerator)
  const denominator = Number(rawDenominator || 1)
  const fps = Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? Math.round((numerator / denominator) * 100) / 100
    : 0
  return {
    width: Number(video.width || 0),
    height: Number(video.height || 0),
    duration: Number.isFinite(duration) ? duration : 0,
    fps: Number.isFinite(fps) ? fps : 0,
    format: String(fallbackFormat || 'mp4').replace(/^\./, '').toLowerCase(),
  }
}

async function readVideoMetadata(filePath: string, filename: string) {
  const fallbackFormat = filename.split('.').pop() || 'mp4'
  try {
    const output = await new Promise<string>((resolvePromise, reject) => {
      execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', filePath], { timeout: 10000 }, (error, stdout) => {
        if (error) reject(error)
        else resolvePromise(stdout)
      })
    })
    return parseFfprobeVideoMetadata(JSON.parse(output || '{}'), fallbackFormat)
  } catch {
    return { width: 0, height: 0, duration: 0, fps: 0, format: String(fallbackFormat).toLowerCase() }
  }
}

async function uploadMeta(kind: 'image' | 'video', filePath: string, buffer: Buffer, filename: string) {
  if (kind === 'image') return { file_path: filePath, ...readImageMetadata(buffer, filename) }
  return { file_path: filePath, ...(await readVideoMetadata(filePath, filename)) }
}

export async function handleAssetUpload(req: any, res: any, activeWorkspace: string, kind: 'image' | 'video') {
  try {
    const fallbackName = kind === 'image' ? 'upload.png' : 'upload.mp4'
    const contentType = String(req.headers?.['content-type'] || req.headers?.['Content-Type'] || '')
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? Buffer.from(req.body)
        : Buffer.from(JSON.stringify(req.body ?? {}))
    const parsed = /multipart\/form-data/i.test(contentType)
      ? parseMultipartFileUpload(contentType, rawBody, fallbackName)
      : { filename: String(req.query?.filename || fallbackName), buffer: rawBody }
    const uploadContentType = /multipart\/form-data/i.test(contentType) ? (parsed.contentType || '') : contentType
    validateUploadMime(kind, uploadContentType)
    const filename = normalizeUploadFilename(parsed.filename)
    if (kind === 'image' && requiresStrictImageParsing(uploadContentType)) assertParsableImageUpload(parsed.buffer, filename)
    const filePath = String(req.query?.dedupe || '') === 'content'
      ? await uploadAssetBufferDeduped(activeWorkspace, parsed.filename, parsed.buffer)
      : await uploadAssetBuffer(activeWorkspace, filename, parsed.buffer)
    res.json(await uploadMeta(kind, filePath, parsed.buffer, filename))
  } catch (error) {
    const message = String((error as any)?.message || error)
    res.status(message.includes('不支持的') || message.includes('无法解析') ? 400 : 500).json(errorBody(message))
  }
}

async function readLegacyTempFile(activeWorkspace: string, filePath: string) {
  const tempRoot = resolve(activeWorkspace, 'data', 'temp')
  const absolutePath = resolve(tempRoot, decodeURIComponent(filePath || ''))
  const tempRelative = relative(tempRoot, absolutePath)
  if (!tempRelative || tempRelative.startsWith('..') || isAbsolute(tempRelative)) {
    throw new Error('legacy file not found')
  }
  return readFile(absolutePath)
}

export function registerAssetMediaRoutes(app: Express, getWorkspace: () => string) {
  const uploadBody = express.raw({ type: () => true, limit: '200mb' })

  app.post(['/api/assets/upload/image', '/api/assets/upload/image/'], uploadBody, async (req, res) => {
    await handleAssetUpload(req, res, getWorkspace(), 'image')
  })

  app.post(['/api/assets/upload/video', '/api/assets/upload/video/'], uploadBody, async (req, res) => {
    await handleAssetUpload(req, res, getWorkspace(), 'video')
  })

  app.get('/api/assets/media/*', async (req, res) => {
    try {
      const mediaPath = decodeURIComponent(String(req.path.replace('/api/assets/media/', '')))
      const content = await readAssetMediaFile(mediaPath, getWorkspace())
      res.setHeader('Content-Type', guessAssetMimeType(mediaPath))
      res.send(content)
    } catch (error) {
      res.status(404).json(errorBody(error))
    }
  })

  app.get('/api/files/*', async (req, res) => {
    const mediaPath = String(req.path.replace('/api/files/', ''))
    try {
      const content = await readLegacyTempFile(getWorkspace(), mediaPath)
      res.setHeader('Content-Type', guessAssetMimeType(mediaPath))
      res.send(content)
    } catch (error) {
      res.status(404).json(errorBody(error))
    }
  })
}
