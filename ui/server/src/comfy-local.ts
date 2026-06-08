import { copyFile, mkdir, realpath, writeFile } from 'fs/promises'
import { basename, extname, isAbsolute, join, relative } from 'path'
import { randomUUID } from 'crypto'
import { guessAssetMimeType } from './asset-mime'

export type LocalComfyFetch = (url: string, init?: RequestInit) => Promise<Response>

export type LocalComfyOutputFile = {
  node_id: string
  kind: 'image' | 'gif' | 'video'
  filename: string
  subfolder: string
  type: string
  path: string
  media_url: string
  mime_type: string
}

export type LocalComfyResult = {
  prompt_id: string
  output_files: LocalComfyOutputFile[]
  history: Record<string, any>
}

export type LocalComfyStatus = {
  phase: 'queued' | 'polling' | 'completed' | 'downloading'
  message: string
  prompt_id?: string
  elapsed_ms?: number
  poll_count?: number
}

export type ExecuteLocalComfyWorkflowOptions = {
  workspace: string
  baseUrl: string
  workflow: Record<string, any>
  inputFiles?: Record<string, string>
  comfyInputDir?: string
  headers?: Record<string, string>
  fetcher?: LocalComfyFetch
  pollIntervalMs?: number
  timeoutMs?: number
  abortSignal?: AbortSignal
  isCancelled?: () => boolean
  onStatus?: (status: LocalComfyStatus) => void | Promise<void>
}

export type InterruptLocalComfyOptions = {
  baseUrl: string
  headers?: Record<string, string>
  fetcher?: LocalComfyFetch
}

function normalizeBaseUrl(baseUrl: string) {
  return String(baseUrl || '').replace(/\/+$/, '')
}

type CancellationOptions = Pick<ExecuteLocalComfyWorkflowOptions, 'abortSignal' | 'isCancelled'>

function assertNotCancelled(cancellation?: CancellationOptions) {
  if (cancellation?.abortSignal?.aborted || cancellation?.isCancelled?.()) {
    throw new Error('ComfyUI task was cancelled')
  }
}

function sleep(ms: number, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const signal = cancellation?.abortSignal
    let timeout: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      if (timeout) clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(new Error('ComfyUI task was cancelled'))
    }
    timeout = setTimeout(() => {
      cleanup()
      try {
        assertNotCancelled(cancellation)
        resolve()
      } catch (error) {
        reject(error)
      }
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
  })
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}))
}

async function readJson(response: Response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Invalid ComfyUI JSON response: ${text.slice(0, 200)}`)
  }
}

async function assertOk(response: Response, context: string) {
  if (response.ok) return
  const body = await response.text().catch(() => '')
  throw new Error(`${context} failed (${response.status}): ${body.slice(0, 240)}`)
}

function headersWithoutContentType(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'content-type'))
}

function parseDataImage(value: string) {
  const match = value.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const rawExt = match[1].toLowerCase()
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
  return {
    ext,
    mime: `image/${rawExt}`,
    content: Buffer.from(match[2], 'base64'),
  }
}

function parseDataOutput(value: string) {
  const match = value.match(/^data:(image|video)\/([a-zA-Z0-9.+-]+);base64,(.+)$/s)
  if (!match) return null
  const mediaType = match[1].toLowerCase()
  const rawExt = match[2].toLowerCase()
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
  return {
    kind: mediaType === 'video' ? 'video' as const : ext === 'gif' ? 'gif' as const : 'image' as const,
    ext,
    mime: `${mediaType}/${rawExt}`,
    content: Buffer.from(match[3], 'base64'),
  }
}

function imageExtFromUrl(value: string) {
  try {
    const pathname = new URL(value).pathname.toLowerCase()
    const ext = extname(pathname).replace(/^\./, '')
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext
  } catch {
    return ''
  }
  return ''
}

async function readRemoteImage(value: string, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  const ext = imageExtFromUrl(value)
  if (!ext) return null
  const response = await fetcher(value, { signal: cancellation?.abortSignal })
  await assertOk(response, 'Remote image fetch')
  return {
    ext,
    mime: guessAssetMimeType(`image.${ext}`),
    content: Buffer.from(await response.arrayBuffer()),
  }
}

async function uploadInputImage(baseUrl: string, image: { ext: string; mime: string; content: Buffer }, headers: Record<string, string>, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  const filename = `comfyforge_${randomUUID().slice(0, 8)}.${image.ext}`
  const form = new FormData()
  form.append('image', new Blob([image.content], { type: image.mime }), filename)
  const response = await fetcher(`${baseUrl}/upload/image`, {
    method: 'POST',
    headers: headersWithoutContentType(headers),
    body: form,
    signal: cancellation?.abortSignal,
  })
  await assertOk(response, 'ComfyUI image upload')
  const payload = await readJson(response)
  const uploadedName = extractUploadFilename(payload) || filename
  if (!uploadedName) throw new Error(`ComfyUI image upload returned no filename: ${JSON.stringify(payload).slice(0, 240)}`)
  return uploadedName
}

function extractUploadFilename(payload: any) {
  for (const row of nestedPayloadRows(payload)) {
    const value = row.name || row.filename || row.fileName || row.file_name || row.fileId || row.file_id
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

async function uploadInlineImages(baseUrl: string, workflow: Record<string, any>, headers: Record<string, string>, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  const next = cloneJson(workflow)
  for (const node of Object.values(next)) {
    assertNotCancelled(cancellation)
    const inputs = node && typeof node === 'object' ? (node as any).inputs : null
    if (!inputs || typeof inputs !== 'object') continue
    for (const [field, value] of Object.entries(inputs)) {
      assertNotCancelled(cancellation)
      if (typeof value !== 'string') continue
      const image = parseDataImage(value) || (value.startsWith('http') ? await readRemoteImage(value, fetcher, cancellation) : null)
      if (!image) continue
      inputs[field] = await uploadInputImage(baseUrl, image, headers, fetcher, cancellation)
    }
  }
  return next
}

async function resolveWorkspaceSourceFile(workspace: string, sourcePath: string) {
  const workspaceRoot = await realpath(workspace)
  const candidate = isAbsolute(sourcePath) ? sourcePath : join(workspaceRoot, sourcePath)
  const resolved = await realpath(candidate)
  const rel = relative(workspaceRoot, resolved)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`ComfyUI input file must be inside the active workspace: ${sourcePath}`)
  }
  return resolved
}

function normalizeInputFileSelector(selector: string) {
  const raw = String(selector || '').trim()
  const parts = raw.split(/[/.]/).filter(Boolean)
  if (parts[0] === 'inputs') {
    return { nodeId: '', field: parts.slice(1).join('.') }
  }
  if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    const fieldParts = parts[1] === 'inputs' ? parts.slice(2) : parts.slice(1)
    return { nodeId: parts[0], field: fieldParts.join('.') }
  }
  return { nodeId: '', field: parts.join('.') }
}

function setNestedInputValue(inputs: Record<string, any>, field: string, value: string) {
  const path = field.split(/[/.]/).filter(Boolean)
  if (path.length === 0) return false
  let cursor: any = inputs
  for (const key of path.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return false
    cursor = cursor[key]
  }
  const finalKey = path[path.length - 1]
  if (!cursor || typeof cursor !== 'object' || !(finalKey in cursor)) return false
  cursor[finalKey] = value
  return true
}

function applyComfyInputFilename(workflow: Record<string, any>, selector: string, filename: string) {
  const { nodeId, field } = normalizeInputFileSelector(selector)
  let applied = false
  for (const [currentNodeId, node] of Object.entries(workflow)) {
    if (nodeId && currentNodeId !== nodeId) continue
    const inputs = node && typeof node === 'object' ? (node as any).inputs : null
    if (!inputs || typeof inputs !== 'object') continue
    if (setNestedInputValue(inputs, field, filename)) applied = true
  }
  return applied
}

async function prepareInputFiles(
  workspace: string,
  workflow: Record<string, any>,
  inputFiles: Record<string, string> | undefined,
  comfyInputDir: string | undefined,
  cancellation?: CancellationOptions,
) {
  if (!inputFiles || Object.keys(inputFiles).length === 0) return workflow
  if (!comfyInputDir) throw new Error('ComfyUI input directory is required when input_files are provided')
  await mkdir(comfyInputDir, { recursive: true })
  for (const [selector, sourcePath] of Object.entries(inputFiles)) {
    assertNotCancelled(cancellation)
    const resolvedSource = await resolveWorkspaceSourceFile(workspace, sourcePath)
    const copiedName = `${randomUUID().replace(/-/g, '')}_${basename(resolvedSource)}`
    await copyFile(resolvedSource, join(comfyInputDir, copiedName))
    applyComfyInputFilename(workflow, selector, copiedName)
  }
  return workflow
}

async function queuePrompt(baseUrl: string, workflow: Record<string, any>, headers: Record<string, string>, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  const response = await fetcher(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ prompt: workflow }),
    signal: cancellation?.abortSignal,
  })
  await assertOk(response, 'ComfyUI queue prompt')
  const payload = await readJson(response)
  const promptId = extractPromptId(payload)
  if (!promptId) throw new Error(`ComfyUI queue prompt returned no prompt_id: ${JSON.stringify(payload).slice(0, 240)}`)
  return promptId
}

function extractPromptId(payload: any) {
  for (const row of nestedPayloadRows(payload)) {
    const value = row.prompt_id || row.promptId || row.task_id || row.taskId || row.id
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function nestedPayloadRows(payload: any) {
  const rows: any[] = []
  const seen = new Set<any>()
  const visit = (row: any, depth: number) => {
    if (!row || typeof row !== 'object' || seen.has(row) || depth > 4) return
    seen.add(row)
    rows.push(row)
    for (const key of ['data', 'result', 'output', 'file', 'task']) visit(row[key], depth + 1)
  }
  visit(payload, 0)
  return rows
}

function extractPromptHistory(payload: any, promptId: string) {
  for (const row of nestedPayloadRows(payload)) {
    if (row?.outputs) return row
    if (row?.[promptId]) return row[promptId]
  }
  return null
}

async function fetchHistory(baseUrl: string, promptId: string, headers: Record<string, string>, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  const direct = await fetcher(`${baseUrl}/history/${encodeURIComponent(promptId)}`, { headers, signal: cancellation?.abortSignal })
  if (direct.ok) return extractPromptHistory(await readJson(direct), promptId)
  if (direct.status !== 404) {
    const body = await direct.text().catch(() => '')
    throw new Error(`ComfyUI history failed (${direct.status}): ${body.slice(0, 240)}`)
  }

  assertNotCancelled(cancellation)
  const all = await fetcher(`${baseUrl}/history`, { headers, signal: cancellation?.abortSignal })
  await assertOk(all, 'ComfyUI history')
  return extractPromptHistory(await readJson(all), promptId)
}

async function waitForCompletion(
  baseUrl: string,
  promptId: string,
  headers: Record<string, string>,
  fetcher: LocalComfyFetch,
  timeoutMs: number,
  pollIntervalMs: number,
  onStatus?: (status: LocalComfyStatus) => void | Promise<void>,
  cancellation?: CancellationOptions,
) {
  const start = Date.now()
  let pollCount = 0
  while (Date.now() - start <= timeoutMs) {
    assertNotCancelled(cancellation)
    pollCount += 1
    await onStatus?.({
      phase: 'polling',
      message: `GPU 计算中... (已耗时 ${Math.floor((Date.now() - start) / 1000)} 秒)`,
      prompt_id: promptId,
      elapsed_ms: Date.now() - start,
      poll_count: pollCount,
    })
    assertNotCancelled(cancellation)
    const history = await fetchHistory(baseUrl, promptId, headers, fetcher, cancellation)
    assertNotCancelled(cancellation)
    if (history) {
      await onStatus?.({
        phase: 'completed',
        message: `ComfyUI 任务 ${promptId} 已完成`,
        prompt_id: promptId,
        elapsed_ms: Date.now() - start,
        poll_count: pollCount,
      })
      return history
    }
    await sleep(pollIntervalMs, cancellation)
  }
  throw new Error(`ComfyUI task ${promptId} timeout after ${timeoutMs}ms`)
}

function outputEntries(history: Record<string, any>) {
  const outputs = history?.outputs && typeof history.outputs === 'object' ? history.outputs : {}
  const entries: Array<{ node_id: string; kind: LocalComfyOutputFile['kind']; file: any }> = []
  const seen = new Set<string>()
  const addEntry = (nodeId: string, kind: LocalComfyOutputFile['kind'] | null, file: any) => {
    const normalized = normalizeOutputFile(file)
    if (!normalized) return
    const entryKind = kind || inferOutputKind(normalized)
    const key = `${nodeId}:${normalized.url || ''}:${normalized.filename || ''}`
    if (seen.has(key)) return
    seen.add(key)
    entries.push({ node_id: nodeId, kind: entryKind, file: normalized })
  }
  for (const [nodeId, nodeOutput] of Object.entries(outputs) as Array<[string, any]>) {
    for (const image of Array.isArray(nodeOutput?.images) ? nodeOutput.images : []) addEntry(nodeId, 'image', image)
    for (const gif of Array.isArray(nodeOutput?.gifs) ? nodeOutput.gifs : []) addEntry(nodeId, 'gif', gif)
    for (const video of Array.isArray(nodeOutput?.videos) ? nodeOutput.videos : []) addEntry(nodeId, 'video', video)
    for (const file of Array.isArray(nodeOutput?.files) ? nodeOutput.files : []) addEntry(nodeId, null, file)
    for (const key of ['output', 'outputs', 'data', 'result', 'media_url', 'mediaUrl', 'download_url', 'downloadUrl', 'file_url', 'fileUrl', 'url']) {
      collectDirectOutputFiles(nodeOutput?.[key], nodeId, addEntry)
    }
  }
  return entries
}

function inferOutputKind(file: any): LocalComfyOutputFile['kind'] {
  if (file?.kind === 'image' || file?.kind === 'gif' || file?.kind === 'video') return file.kind
  if (String(file?.mime_type || file?.mime || '').startsWith('video/')) return 'video'
  if (String(file?.mime_type || file?.mime || '') === 'image/gif') return 'gif'
  const name = String(file?.filename || file?.url || '').toLowerCase()
  const mime = guessAssetMimeType(name)
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'image/gif') return 'gif'
  return 'image'
}

function outputUrlFromFile(file: any) {
  for (const key of ['url', 'file_url', 'fileUrl', 'video_url', 'videoUrl', 'download_url', 'downloadUrl', 'output_url', 'outputUrl', 'media_url', 'mediaUrl']) {
    const value = file?.[key]
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value
  }
  return ''
}

function dataUrlFromFile(file: any) {
  for (const key of ['data_url', 'dataUrl', 'url', 'file_url', 'fileUrl', 'download_url', 'downloadUrl', 'output_url', 'outputUrl', 'media_url', 'mediaUrl']) {
    const value = file?.[key]
    if (typeof value === 'string' && /^data:(?:image|video)\//i.test(value)) return value
  }
  return ''
}

function filenameFromUrl(value: string) {
  try {
    const pathname = new URL(value).pathname
    const name = basename(decodeURIComponent(pathname))
    return name || ''
  } catch {
    return ''
  }
}

function normalizeOutputFile(file: any) {
  if (!file) return null
  if (typeof file === 'string') {
    const dataOutput = parseDataOutput(file)
    if (dataOutput) {
      return {
        data_url: file,
        filename: `comfy-output-${randomUUID()}.${dataOutput.ext || 'bin'}`,
        kind: dataOutput.kind,
        mime_type: dataOutput.mime,
      }
    }
    if (!/^https?:\/\//i.test(file)) return null
    return { url: file, filename: filenameFromUrl(file) || `comfy-output-${randomUUID()}.bin` }
  }
  if (typeof file !== 'object') return null
  const url = outputUrlFromFile(file)
  const dataUrl = dataUrlFromFile(file)
  const dataOutput = dataUrl ? parseDataOutput(dataUrl) : null
  const filename = String(file.filename || file.fileName || file.name || file.file_name || (url ? filenameFromUrl(url) : '') || '').trim()
  if (!filename && !url && !dataOutput) return null
  return {
    ...file,
    url,
    data_url: dataUrl,
    filename: filename || (dataOutput ? `comfy-output-${randomUUID()}.${dataOutput.ext || 'bin'}` : `comfy-output-${randomUUID()}.bin`),
    kind: file.kind || dataOutput?.kind,
    mime_type: file.mime_type || file.mime || dataOutput?.mime,
  }
}

function collectDirectOutputFiles(
  value: any,
  nodeId: string,
  addEntry: (nodeId: string, kind: LocalComfyOutputFile['kind'] | null, file: any) => void,
) {
  if (!value) return
  if (typeof value === 'string') {
    if (/^(https?:\/\/|data:(?:image|video)\/)/i.test(value)) addEntry(nodeId, null, value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectDirectOutputFiles(item, nodeId, addEntry)
    return
  }
  if (typeof value !== 'object') return
  if (outputUrlFromFile(value) || dataUrlFromFile(value) || value.filename || value.fileName || value.name || value.file_name) addEntry(nodeId, null, value)
  for (const key of ['output', 'outputs', 'files', 'videos', 'images', 'data', 'result']) {
    collectDirectOutputFiles(value[key], nodeId, addEntry)
  }
}

async function downloadOutput(baseUrl: string, file: any, headers: Record<string, string>, fetcher: LocalComfyFetch, cancellation?: CancellationOptions) {
  assertNotCancelled(cancellation)
  if (file?.data_url) {
    const parsed = parseDataOutput(String(file.data_url))
    if (!parsed) throw new Error('Invalid ComfyUI data URL output')
    return parsed.content
  }
  if (file?.url) {
    const response = await fetcher(String(file.url), { headers, signal: cancellation?.abortSignal })
    await assertOk(response, 'ComfyUI direct output download')
    return Buffer.from(await response.arrayBuffer())
  }
  const params = new URLSearchParams({
    filename: String(file?.filename || ''),
    subfolder: String(file?.subfolder || ''),
    type: String(file?.type || 'output'),
  })
  const response = await fetcher(`${baseUrl}/view?${params.toString()}`, { headers, signal: cancellation?.abortSignal })
  await assertOk(response, 'ComfyUI output download')
  return Buffer.from(await response.arrayBuffer())
}

async function saveOutputFile(workspace: string, originalFilename: string, content: Buffer) {
  const outputDir = join(workspace, 'assets', 'comfy-output')
  await mkdir(outputDir, { recursive: true })
  const ext = extname(originalFilename) || '.bin'
  const safeOriginal = basename(originalFilename || `comfy-output${ext}`)
  const filePath = join(outputDir, `${randomUUID()}-${safeOriginal}`)
  await writeFile(filePath, content)
  return filePath
}

export async function executeLocalComfyWorkflow(options: ExecuteLocalComfyWorkflowOptions): Promise<LocalComfyResult> {
  const fetcher = options.fetcher || fetch
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  if (!baseUrl) throw new Error('ComfyUI baseUrl is required')
  const headers = options.headers || {}
  const timeoutMs = Number(options.timeoutMs ?? 600_000)
  const pollIntervalMs = Number(options.pollIntervalMs ?? 1_000)
  const cancellation: CancellationOptions = {
    abortSignal: options.abortSignal,
    isCancelled: options.isCancelled,
  }

  assertNotCancelled(cancellation)
  const workflowWithUploads = await uploadInlineImages(baseUrl, options.workflow, headers, fetcher, cancellation)
  const workflow = await prepareInputFiles(options.workspace, workflowWithUploads, options.inputFiles, options.comfyInputDir, cancellation)
  const promptId = await queuePrompt(baseUrl, workflow, headers, fetcher, cancellation)
  await options.onStatus?.({ phase: 'queued', message: `ComfyUI 任务已提交: ${promptId}`, prompt_id: promptId })
  const history = await waitForCompletion(baseUrl, promptId, headers, fetcher, timeoutMs, pollIntervalMs, options.onStatus, cancellation)
  const outputFiles: LocalComfyOutputFile[] = []

  for (const entry of outputEntries(history)) {
    assertNotCancelled(cancellation)
    const originalFilename = String(entry.file?.filename || '')
    if (!originalFilename) continue
    await options.onStatus?.({ phase: 'downloading', message: `正在下载 ComfyUI 输出: ${originalFilename}`, prompt_id: promptId })
    const content = await downloadOutput(baseUrl, entry.file, headers, fetcher, cancellation)
    const path = await saveOutputFile(options.workspace, originalFilename, content)
    outputFiles.push({
      node_id: entry.node_id,
      kind: entry.kind,
      filename: originalFilename,
      subfolder: String(entry.file?.subfolder || ''),
      type: String(entry.file?.type || 'output'),
      path,
      media_url: `/api/assets/media/${encodeURIComponent(path)}`,
      mime_type: guessAssetMimeType(originalFilename),
    })
  }

  return { prompt_id: promptId, output_files: outputFiles, history }
}

export async function interruptLocalComfy(options: InterruptLocalComfyOptions): Promise<boolean> {
  const fetcher = options.fetcher || fetch
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  if (!baseUrl) return false
  try {
    const response = await fetcher(`${baseUrl}/interrupt`, {
      method: 'POST',
      headers: options.headers || {},
    })
    return response.ok
  } catch {
    return false
  }
}
