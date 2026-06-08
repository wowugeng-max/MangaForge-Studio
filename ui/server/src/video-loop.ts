import { randomUUID } from 'crypto'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { basename, dirname, isAbsolute, join } from 'path'
import { spawn } from 'child_process'
import { executeLocalComfyWorkflow, type ExecuteLocalComfyWorkflowOptions, type LocalComfyFetch, type LocalComfyOutputFile, type LocalComfyResult } from './comfy-local'
import { readAssets, writeAssets, type AssetRecord } from './assets'
import { guessAssetMimeType } from './asset-mime'

export type VideoLoopSegmentRequest = {
  frame_a_asset_id?: number
  frame_b_asset_id?: number
  prompt_asset_id?: number
  frameAAssetId?: number
  frameBAssetId?: number
  promptAssetId?: number
}

export type VideoLoopTaskRequest = {
  initial_video_path?: string
  initialVideoPath?: string
  total_seconds?: number
  totalSeconds?: number
  segment_seconds?: number
  segmentSeconds?: number
  global_prompt?: string
  globalPrompt?: string
  segment_prompts?: string[]
  segmentPrompts?: string[]
  workflow_asset_id?: number
  workflowAssetId?: number
  workflow_template_id?: string | number
  workflowTemplateId?: string | number
  runninghub_template_id?: string | number
  runninghubTemplateId?: string | number
  template_submit_path?: string
  templateSubmitPath?: string
  template_status_path?: string
  templateStatusPath?: string
  template_input_keys?: {
    frame_a?: string
    frame_b?: string
    frameA?: string
    frameB?: string
    prompt?: string
  }
  templateInputKeys?: {
    frame_a?: string
    frame_b?: string
    frameA?: string
    frameB?: string
    prompt?: string
  }
  segments?: VideoLoopSegmentRequest[] | VideoLoopSegmentRequest
  project_id?: number | null
  projectId?: number | null
  source_asset_ids?: number[]
  sourceAssetIds?: number[]
  base_url?: string
  baseUrl?: string
  comfy_base_url?: string
  comfyBaseUrl?: string
  comfy_input_dir?: string
  comfyInputDir?: string
  api_key?: string
  apiKey?: string
  runninghub_api_key?: string
  runninghubApiKey?: string
  headers?: Record<string, string>
  timeout_ms?: number
  timeoutMs?: number
  poll_interval_ms?: number
  pollIntervalMs?: number
}

export type VideoLoopResult = {
  status: 'completed'
  final_video: string
  media_url: string
  segments: string[]
  segment_outputs: LocalComfyOutputFile[]
  num_segments: number
  asset_id: number | null
}

type ExecuteRealVideoLoopOptions = {
  workspace: string
  request: VideoLoopTaskRequest
  comfyExecute?: (options: ExecuteLocalComfyWorkflowOptions) => Promise<LocalComfyResult>
  fetcher?: LocalComfyFetch
  prepareFrameInput?: (sourcePath: string, context: { index: number; role: 'frame_a' | 'frame_b' }) => Promise<string>
}

type WorkflowTemplate = {
  workflow: Record<string, any>
  parameters: Record<string, any>
}

const REQUIRED_PARAMETERS = ['frame_a', 'frame_b', 'prompt'] as const

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function normalizeSegments(raw: VideoLoopTaskRequest['segments']): VideoLoopSegmentRequest[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return [raw]
  throw new Error('segments 必须是列表或对象')
}

function firstPresent<T>(...values: T[]): T | undefined {
  return values.find(value => value !== undefined && value !== null && value !== '') as T | undefined
}

function normalizeTemplateInputKeys(keys: VideoLoopTaskRequest['template_input_keys'] | VideoLoopTaskRequest['templateInputKeys']) {
  if (!keys) return undefined
  return {
    ...keys,
    frame_a: firstPresent(keys.frame_a, keys.frameA),
    frame_b: firstPresent(keys.frame_b, keys.frameB),
    prompt: firstPresent(keys.prompt),
  }
}

function normalizeVideoLoopTaskRequest(request: VideoLoopTaskRequest = {}): VideoLoopTaskRequest {
  return {
    ...request,
    initial_video_path: firstPresent(request.initial_video_path, request.initialVideoPath),
    total_seconds: firstPresent(request.total_seconds, request.totalSeconds),
    segment_seconds: firstPresent(request.segment_seconds, request.segmentSeconds),
    global_prompt: firstPresent(request.global_prompt, request.globalPrompt),
    segment_prompts: firstPresent(request.segment_prompts, request.segmentPrompts),
    workflow_asset_id: firstPresent(request.workflow_asset_id, request.workflowAssetId),
    workflow_template_id: firstPresent(request.workflow_template_id, request.workflowTemplateId),
    runninghub_template_id: firstPresent(request.runninghub_template_id, request.runninghubTemplateId),
    template_submit_path: firstPresent(request.template_submit_path, request.templateSubmitPath),
    template_status_path: firstPresent(request.template_status_path, request.templateStatusPath),
    template_input_keys: normalizeTemplateInputKeys(request.template_input_keys || request.templateInputKeys),
    project_id: request.project_id !== undefined ? request.project_id : request.projectId,
    source_asset_ids: firstPresent(request.source_asset_ids, request.sourceAssetIds),
    base_url: firstPresent(request.base_url, request.baseUrl),
    comfy_base_url: firstPresent(request.comfy_base_url, request.comfyBaseUrl),
    comfy_input_dir: firstPresent(request.comfy_input_dir, request.comfyInputDir),
    api_key: firstPresent(request.api_key, request.apiKey),
    runninghub_api_key: firstPresent(request.runninghub_api_key, request.runninghubApiKey),
    timeout_ms: firstPresent(request.timeout_ms, request.timeoutMs),
    poll_interval_ms: firstPresent(request.poll_interval_ms, request.pollIntervalMs),
  }
}

function requireAsset(assets: AssetRecord[], id: number | undefined, label: string) {
  const asset = assets.find(item => Number(item.id) === Number(id))
  if (!asset) throw new Error(`${label}资产 ${id || ''} 未找到`)
  return asset
}

function resolveWorkflowTemplate(asset: AssetRecord): WorkflowTemplate {
  if (asset.type !== 'workflow') throw new Error(`工作流资产 ${asset.id} 不存在或类型错误`)
  const workflow = asset.data?.workflow_json
  const parameters = asset.data?.parameters
  if (!workflow || typeof workflow !== 'object') throw new Error('工作流资产缺少 workflow_json')
  if (!parameters || typeof parameters !== 'object') throw new Error('工作流资产缺少 parameters')
  for (const key of REQUIRED_PARAMETERS) {
    if (!parameters[key]) throw new Error(`工作流模板必须定义参数 '${key}'`)
  }
  return { workflow: cloneJson(workflow), parameters: cloneJson(parameters) }
}

function setWorkflowParameter(workflow: Record<string, any>, paramDef: any, value: unknown) {
  const nodeId = String(paramDef?.node_id || '').trim()
  const field = String(paramDef?.field || '').trim()
  if (!nodeId || !field) return false
  const node = workflow[nodeId]
  if (!node || typeof node !== 'object') return false
  const path = field.split('/').filter(Boolean)
  if (!path.length) return false
  let target = node
  for (const part of path.slice(0, -1)) {
    if (!target[part] || typeof target[part] !== 'object') return false
    target = target[part]
  }
  target[path[path.length - 1]] = value
  return true
}

function resolveSegmentValues(assets: AssetRecord[], segment: VideoLoopSegmentRequest, index: number) {
  const frameA = requireAsset(assets, segment.frame_a_asset_id ?? segment.frameAAssetId, `第 ${index + 1} 段首帧`)
  const frameB = requireAsset(assets, segment.frame_b_asset_id ?? segment.frameBAssetId, `第 ${index + 1} 段尾帧`)
  const prompt = requireAsset(assets, segment.prompt_asset_id ?? segment.promptAssetId, `第 ${index + 1} 段提示词`)
  if (frameA.type !== 'image' || frameB.type !== 'image') throw new Error(`第 ${index + 1} 段首尾帧资产必须是 image 类型`)
  if (prompt.type !== 'prompt') throw new Error(`第 ${index + 1} 段提示词资产必须是 prompt 类型`)
  const frameAPath = String(frameA.data?.file_path || '').trim()
  const frameBPath = String(frameB.data?.file_path || '').trim()
  const promptText = String(prompt.data?.content || '').trim()
  if (!frameAPath || !frameBPath || !promptText) throw new Error(`第 ${index + 1} 段资产数据不完整`)
  return { frameAPath, frameBPath, promptText }
}

async function prepareComfyInputFile(workspace: string, sourcePath: string, comfyInputDir?: string) {
  const inputDir = String(comfyInputDir || '').trim()
  if (!inputDir) return sourcePath
  await mkdir(inputDir, { recursive: true })
  const resolvedSource = isAbsolute(sourcePath) ? sourcePath : join(workspace, sourcePath)
  const filename = `${randomUUID()}_${basename(sourcePath)}`
  await copyFile(resolvedSource, join(inputDir, filename))
  return filename
}

function resolveSourceFilePath(workspace: string, sourcePath: string) {
  return isAbsolute(sourcePath) ? sourcePath : join(workspace, sourcePath)
}

export function isLegacyVideoLoopRequest(request: VideoLoopTaskRequest = {}) {
  const normalized = normalizeVideoLoopTaskRequest(request)
  return Boolean(String(normalized.initial_video_path || '').trim())
}

function resolveCloudApiKey(request: VideoLoopTaskRequest) {
  return String(request.api_key || request.runninghub_api_key || process.env.RUNNINGHUB_API_KEY || '').trim()
}

function resolveCloudBaseUrl(request: VideoLoopTaskRequest) {
  let baseUrl = String(request.base_url || request.comfy_base_url || process.env.RUNNINGHUB_BASE_URL || process.env.COMFYUI_BASE_URL || '').replace(/\/+$/, '')
  if (!baseUrl) throw new Error('云端 ComfyUI base_url 未配置')
  const apiKey = resolveCloudApiKey(request)
  if (/runninghub/i.test(baseUrl) && apiKey && !baseUrl.endsWith(`/${apiKey}`) && !baseUrl.endsWith(apiKey)) {
    baseUrl = `${baseUrl}/${apiKey}`
  }
  return baseUrl
}

function buildCloudHeaders(request: VideoLoopTaskRequest, baseUrl: string) {
  const headers: Record<string, string> = { ...(request.headers || {}) }
  const apiKey = resolveCloudApiKey(request)
  const hasAuthorization = Object.keys(headers).some(key => key.toLowerCase() === 'authorization')
  if (apiKey && !/runninghub/i.test(baseUrl) && !hasAuthorization) {
    headers.Authorization = apiKey.toLowerCase().startsWith('bearer ') ? apiKey : `Bearer ${apiKey}`
  }
  return headers
}

function headersWithoutContentType(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'content-type'))
}

async function readUploadResponse(response: Response) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`云端 ComfyUI 上传返回了非 JSON 内容: ${text.slice(0, 200)}`)
  }
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

function extractUploadedFilename(payload: any) {
  for (const row of nestedPayloadRows(payload)) {
    const value = row.name || row.filename || row.fileName || row.file_name || row.fileId || row.file_id
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

async function readJsonResponse(response: Response, label: string) {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`${label} 返回了非 JSON 内容: ${text.slice(0, 200)}`)
  }
}

async function uploadComfyInputImage(options: {
  workspace: string
  baseUrl: string
  headers: Record<string, string>
  fetcher: LocalComfyFetch
  sourcePath: string
}) {
  const resolvedSource = resolveSourceFilePath(options.workspace, options.sourcePath)
  const content = await readFile(resolvedSource)
  const filename = `${randomUUID()}_${basename(options.sourcePath)}`
  const form = new FormData()
  form.append('image', new Blob([content], { type: guessAssetMimeType(options.sourcePath) }), filename)
  const response = await options.fetcher(`${options.baseUrl}/upload/image`, {
    method: 'POST',
    headers: headersWithoutContentType(options.headers),
    body: form,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`云端 ComfyUI 输入文件上传失败 (${response.status}): ${body.slice(0, 240)}`)
  }
  const payload = await readUploadResponse(response)
  const uploadedName = extractUploadedFilename(payload)
  if (!uploadedName) throw new Error(`云端 ComfyUI 上传未返回文件名: ${JSON.stringify(payload).slice(0, 240)}`)
  return uploadedName
}

function apiPath(value: unknown, fallback: string) {
  const path = String(value || fallback).trim() || fallback
  return path.startsWith('/') ? path : `/${path}`
}

async function postCloudJson(options: {
  fetcher: LocalComfyFetch
  baseUrl: string
  headers: Record<string, string>
  path: string
  body: Record<string, any>
  label: string
}) {
  const response = await options.fetcher(`${options.baseUrl}${options.path}`, {
    method: 'POST',
    headers: { ...options.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`${options.label} 失败 (${response.status}): ${body.slice(0, 240)}`)
  }
  return readJsonResponse(response, options.label)
}

function extractTemplateTaskId(payload: any) {
  for (const row of nestedPayloadRows(payload)) {
    const value = row.taskId || row.task_id || row.id || row.prompt_id
    if (value != null && String(value).trim()) return String(value).trim()
  }
  throw new Error(`云端模板任务未返回 taskId: ${JSON.stringify(payload).slice(0, 240)}`)
}

function extractTemplateStatus(payload: any) {
  for (const row of nestedPayloadRows(payload)) {
    const status = row?.status || row?.state || row?.taskStatus || row?.task_status
    if (status != null && String(status).trim()) return String(status).trim().toUpperCase()
  }
  return ''
}

function isFailedTemplateStatus(status: string) {
  const normalized = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return [
    'failed',
    'failure',
    'fail',
    'error',
    'errored',
    'cancelled',
    'canceled',
    'aborted',
    'abort',
    'rejected',
    'reject',
    'timeout',
    'timed_out',
    'expired',
  ].includes(normalized)
}

function collectOutputUrls(value: any, urls: string[] = []) {
  if (!value) return urls
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) urls.push(value)
  if (Array.isArray(value)) {
    for (const item of value) collectOutputUrls(item, urls)
    return urls
  }
  if (typeof value === 'object') {
    for (const key of ['url', 'file_url', 'fileUrl', 'video_url', 'videoUrl', 'download_url', 'downloadUrl', 'output_url', 'outputUrl']) {
      if (typeof value[key] === 'string' && /^https?:\/\//i.test(value[key])) urls.push(value[key])
    }
    for (const key of ['outputs', 'output', 'files', 'videos', 'data', 'result']) collectOutputUrls(value[key], urls)
  }
  return urls
}

async function downloadRemoteSegment(options: {
  workspace: string
  fetcher: LocalComfyFetch
  url: string
  index: number
}) {
  const response = await options.fetcher(options.url)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`云端模板输出下载失败 (${response.status}): ${body.slice(0, 240)}`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  const outputPath = join(options.workspace, 'assets', 'comfy-output', `runninghub_segment_${options.index}_${randomUUID()}.mp4`)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, bytes)
  return outputPath
}

function buildTemplateTaskBody(request: VideoLoopTaskRequest, values: { frameAInput: string; frameBInput: string; promptText: string; index: number }) {
  const templateId = String(request.workflow_template_id || request.runninghub_template_id || '').trim()
  const keys = {
    frame_a: request.template_input_keys?.frame_a || 'frame_a',
    frame_b: request.template_input_keys?.frame_b || 'frame_b',
    prompt: request.template_input_keys?.prompt || 'prompt',
  }
  return {
    workflow_template_id: templateId,
    workflowTemplateId: templateId,
    template_id: templateId,
    segment_index: values.index,
    inputs: {
      [keys.frame_a]: values.frameAInput,
      [keys.frame_b]: values.frameBInput,
      [keys.prompt]: values.promptText,
    },
  }
}

function selectVideoOutput(result: LocalComfyResult): LocalComfyOutputFile {
  const output = result.output_files.find(file => file.kind === 'video' || file.kind === 'gif') || result.output_files[0]
  if (!output?.path) throw new Error('视频段未生成输出文件')
  return output
}

function resolveBaseUrl(request: VideoLoopTaskRequest) {
  return String(request.base_url || request.comfy_base_url || process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188').replace(/\/+$/, '')
}

function mediaUrlForPath(path: string) {
  return `/api/assets/media/${encodeURIComponent(path)}`
}

async function runFfmpegConcat(segments: string[], outputPath: string) {
  await mkdir(dirname(outputPath), { recursive: true })
  const listPath = join(dirname(outputPath), `concat_${randomUUID()}.txt`)
  await writeFile(listPath, segments.map(segment => `file '${segment.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8')
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-y', outputPath])
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`视频拼接失败: ${stderr.slice(0, 500)}`))
    })
  })
}

async function stitchSegments(workspace: string, segments: string[]) {
  if (segments.length <= 1) return segments[0] || ''
  const outputPath = join(workspace, 'assets', 'comfy-output', `final_${randomUUID()}.mp4`)
  await runFfmpegConcat(segments, outputPath)
  return outputPath
}

async function saveVideoAsset(workspace: string, request: VideoLoopTaskRequest, finalVideo: string, mediaUrl: string) {
  if (request.project_id == null) return null
  const assets = await readAssets(workspace)
  const id = assets.reduce((max, asset) => Math.max(max, Number(asset.id) || 0), 0) + 1
  const now = new Date().toISOString()
  const asset: AssetRecord = {
    id,
    name: `视频循环 ${new Date().toLocaleString('zh-CN')}`,
    type: 'video',
    project_id: request.project_id,
    tags: ['video-loop', 'comfyui'],
    source_asset_ids: Array.isArray(request.source_asset_ids) ? request.source_asset_ids : [],
    file_path: finalVideo,
    data: {
      file_path: finalVideo,
      media_url: mediaUrl,
      source_asset_ids: Array.isArray(request.source_asset_ids) ? request.source_asset_ids : [],
      workflow_asset_id: request.workflow_asset_id,
    },
    updated_at: now,
  }
  await writeAssets(workspace, [...assets, asset])
  return id
}

export async function executeLegacyVideoLoop(options: ExecuteRealVideoLoopOptions): Promise<VideoLoopResult> {
  const request = normalizeVideoLoopTaskRequest(options.request)
  const initialPath = String(request.initial_video_path || '').trim()
  if (!initialPath) throw new Error('缺少 initial_video_path')
  const totalSeconds = Number(request.total_seconds)
  const segmentSeconds = Number(request.segment_seconds)
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) throw new Error('total_seconds 必须是正数')
  if (!Number.isFinite(segmentSeconds) || segmentSeconds <= 0) throw new Error('segment_seconds 必须是正数')

  const numSegments = Math.max(1, Math.ceil(totalSeconds / segmentSeconds))
  const outputDir = join(options.workspace, 'assets', 'comfy-output')
  await mkdir(outputDir, { recursive: true })

  let currentInput = resolveSourceFilePath(options.workspace, initialPath)
  const segmentPaths: string[] = []
  const outputs: LocalComfyOutputFile[] = []
  const prompts = Array.isArray(request.segment_prompts) ? request.segment_prompts : []

  for (let index = 0; index < numSegments; index += 1) {
    const segmentPrompt = String(prompts[index] || request.global_prompt || '').trim()
    const outputPath = join(outputDir, `legacy_segment_${index}_${randomUUID()}.mp4`)
    try {
      await copyFile(currentInput, outputPath)
    } catch (error) {
      throw new Error(`初始视频文件未找到或不可读: ${initialPath}`)
    }
    segmentPaths.push(outputPath)
    outputs.push({
      node_id: `legacy-${index}`,
      kind: 'video',
      filename: basename(outputPath),
      subfolder: '',
      type: 'output',
      path: outputPath,
      media_url: mediaUrlForPath(outputPath),
      mime_type: 'video/mp4',
      ...(segmentPrompt ? { prompt: segmentPrompt } as any : {}),
    })
    currentInput = outputPath
  }

  const finalVideo = segmentPaths[0] || ''
  const mediaUrl = mediaUrlForPath(finalVideo)
  const assetId = await saveVideoAsset(options.workspace, request, finalVideo, mediaUrl)

  return {
    status: 'completed',
    final_video: finalVideo,
    media_url: mediaUrl,
    segments: segmentPaths,
    segment_outputs: outputs,
    num_segments: numSegments,
    asset_id: assetId,
  }
}

export async function executeRealVideoLoop(options: ExecuteRealVideoLoopOptions): Promise<VideoLoopResult> {
  const request = normalizeVideoLoopTaskRequest(options.request)
  if (!request.workflow_asset_id) throw new Error('缺少 workflow_asset_id')
  const segments = normalizeSegments(request.segments)
  if (segments.length === 0) throw new Error('segments 不能为空')

  const assets = await readAssets(options.workspace)
  const workflowAsset = requireAsset(assets, request.workflow_asset_id, '工作流')
  const template = resolveWorkflowTemplate(workflowAsset)
  const comfyExecute = options.comfyExecute || executeLocalComfyWorkflow
  const outputs: LocalComfyOutputFile[] = []
  const segmentPaths: string[] = []

  for (const [index, segment] of segments.entries()) {
    const { frameAPath, frameBPath, promptText } = resolveSegmentValues(assets, segment, index)
    const frameAInput = options.prepareFrameInput
      ? await options.prepareFrameInput(frameAPath, { index, role: 'frame_a' })
      : await prepareComfyInputFile(options.workspace, frameAPath, request.comfy_input_dir)
    const frameBInput = options.prepareFrameInput
      ? await options.prepareFrameInput(frameBPath, { index, role: 'frame_b' })
      : await prepareComfyInputFile(options.workspace, frameBPath, request.comfy_input_dir)
    const workflow = cloneJson(template.workflow)
    setWorkflowParameter(workflow, template.parameters.frame_a, frameAInput)
    setWorkflowParameter(workflow, template.parameters.frame_b, frameBInput)
    setWorkflowParameter(workflow, template.parameters.prompt, promptText)
    const result = await comfyExecute({
      workspace: options.workspace,
      baseUrl: resolveBaseUrl(request),
      workflow,
      headers: request.headers || {},
      timeoutMs: request.timeout_ms,
      pollIntervalMs: request.poll_interval_ms,
    })
    const output = selectVideoOutput(result)
    outputs.push(output)
    segmentPaths.push(output.path)
  }

  const stitched = await stitchSegments(options.workspace, segmentPaths)
  const firstOutput = outputs[0]
  const mediaUrl = stitched === firstOutput?.path ? firstOutput.media_url : mediaUrlForPath(stitched)
  const assetId = await saveVideoAsset(options.workspace, request, stitched, mediaUrl)

  return {
    status: 'completed',
    final_video: stitched,
    media_url: mediaUrl,
    segments: segmentPaths,
    segment_outputs: outputs,
    num_segments: segments.length,
    asset_id: assetId,
  }
}

export async function executeCloudVideoLoop(options: ExecuteRealVideoLoopOptions): Promise<VideoLoopResult> {
  const request = normalizeVideoLoopTaskRequest(options.request)
  if (
    isLegacyVideoLoopRequest(request)
    && !request.workflow_asset_id
    && !request.workflow_template_id
    && !request.runninghub_template_id
  ) {
    return executeLegacyVideoLoop({ ...options, request })
  }
  const baseUrl = resolveCloudBaseUrl(request)
  const headers = buildCloudHeaders(request, baseUrl)
  const fetcher = options.fetcher || fetch
  const templateId = String(request.workflow_template_id || request.runninghub_template_id || '').trim()
  if (templateId) {
    return executeCloudTemplateVideoLoop({ ...options, request, fetcher }, baseUrl, headers, fetcher)
  }
  const cloudRequest = {
    ...request,
    base_url: baseUrl,
    headers,
  }
  return executeRealVideoLoop({
    ...options,
    request: cloudRequest,
    prepareFrameInput: (sourcePath) => uploadComfyInputImage({
      workspace: options.workspace,
      baseUrl,
      headers,
      fetcher,
      sourcePath,
    }),
    comfyExecute: options.comfyExecute || ((executeOptions) => executeLocalComfyWorkflow({ ...executeOptions, fetcher })),
  })
}

async function executeCloudTemplateVideoLoop(
  options: ExecuteRealVideoLoopOptions,
  baseUrl: string,
  headers: Record<string, string>,
  fetcher: LocalComfyFetch,
): Promise<VideoLoopResult> {
  const request = options.request || {}
  const segments = normalizeSegments(request.segments)
  if (segments.length === 0) throw new Error('segments 不能为空')
  const assets = await readAssets(options.workspace)
  const segmentPaths: string[] = []
  const outputs: LocalComfyOutputFile[] = []
  const submitPath = apiPath(request.template_submit_path, '/task/openapi/create')
  const statusPath = apiPath(request.template_status_path, '/task/openapi/status')
  const timeoutMs = Math.max(1, Number(request.timeout_ms || 600000))
  const pollIntervalMs = Math.max(1, Number(request.poll_interval_ms ?? 5000))

  for (const [index, segment] of segments.entries()) {
    const { frameAPath, frameBPath, promptText } = resolveSegmentValues(assets, segment, index)
    const frameAInput = await uploadComfyInputImage({ workspace: options.workspace, baseUrl, headers, fetcher, sourcePath: frameAPath })
    const frameBInput = await uploadComfyInputImage({ workspace: options.workspace, baseUrl, headers, fetcher, sourcePath: frameBPath })
    const taskBody = buildTemplateTaskBody(request, { frameAInput, frameBInput, promptText, index })
    const created = await postCloudJson({ fetcher, baseUrl, headers, path: submitPath, body: taskBody, label: '云端模板任务创建' })
    const taskId = extractTemplateTaskId(created)
    const startedAt = Date.now()
    let outputUrl = ''
    while (Date.now() - startedAt <= timeoutMs) {
      const statusPayload = await postCloudJson({
        fetcher,
        baseUrl,
        headers,
        path: statusPath,
        body: { taskId, task_id: taskId },
        label: '云端模板任务状态查询',
      })
      const status = extractTemplateStatus(statusPayload)
      outputUrl = collectOutputUrls(statusPayload)[0] || ''
      if (outputUrl) break
      if (isFailedTemplateStatus(status)) {
        throw new Error(`云端模板任务失败: ${JSON.stringify(statusPayload).slice(0, 240)}`)
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
    if (!outputUrl) throw new Error(`云端模板任务未返回输出 URL: taskId=${taskId}`)
    const outputPath = await downloadRemoteSegment({ workspace: options.workspace, fetcher, url: outputUrl, index })
    segmentPaths.push(outputPath)
    outputs.push({
      node_id: `template-${index}`,
      kind: 'video',
      filename: basename(outputPath),
      subfolder: '',
      type: 'output',
      path: outputPath,
      media_url: mediaUrlForPath(outputPath),
      mime_type: 'video/mp4',
    })
  }

  const stitched = await stitchSegments(options.workspace, segmentPaths)
  const firstOutput = outputs[0]
  const mediaUrl = stitched === firstOutput?.path ? firstOutput.media_url : mediaUrlForPath(stitched)
  const assetId = await saveVideoAsset(options.workspace, request, stitched, mediaUrl)

  return {
    status: 'completed',
    final_video: stitched,
    media_url: mediaUrl,
    segments: segmentPaths,
    segment_outputs: outputs,
    num_segments: segments.length,
    asset_id: assetId,
  }
}
