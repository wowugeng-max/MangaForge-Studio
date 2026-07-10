import { createHash } from 'node:crypto'
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { executeNovelAgent } from '../ui/server/src/llm/executor'
import { readKeys } from '../ui/server/src/key-store'
import { readModels } from '../ui/server/src/model-store'
import { getNovelProject, listNovelChapters, listNovelCharacters } from '../ui/server/src/novel'
import { scanRepeatedReactionRisks, scanRepeatedSubjectRisks } from '../ui/server/src/novel-writing/rhythm-scans'
import { resolveChapterWordTarget } from '../ui/server/src/novel-writing/word-target'
import { readProviders } from '../ui/server/src/provider-store'
import { getNovelPayload } from '../ui/server/src/routes/novel-route-utils'
import { scanProseForQualityLoop } from '../ui/server/src/routes/novel-writing-service'
import { loadActiveWorkspace } from '../ui/server/src/workspace'

export type DimensionScoreRow = {
  dimension: string
  scores: number[]
}

export const BLIND_REVIEW_DIMENSIONS = [
  'opening_hook',
  'causal_progress',
  'protagonist_agency',
  'conflict_payoff',
  'continuity',
  'prose_naturalness',
  'ending_hook',
] as const

type BlindReviewRun = {
  order: number[]
  payload: any
}

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function evaluateBlindScoreThresholds(
  baseline: DimensionScoreRow[],
  candidate: DimensionScoreRow[],
  publishableChecks: boolean[],
) {
  const candidateByDimension = new Map(candidate.map(row => [row.dimension, row.scores]))
  const dimensionMargins = baseline.map(row => {
    const baselineMinimum = Math.min(...row.scores)
    const candidateAverage = mean(candidateByDimension.get(row.dimension) || [])
    return {
      dimension: row.dimension,
      baseline_minimum: baselineMinimum,
      candidate_average: candidateAverage,
      required_minimum: baselineMinimum - 1,
      margin: candidateAverage - (baselineMinimum - 1),
    }
  })
  const baselineOverall = mean(baseline.flatMap(row => row.scores))
  const candidateOverall = mean(candidate.flatMap(row => row.scores))
  const overallDelta = candidateOverall - baselineOverall
  const dimensionFailures = dimensionMargins.filter(row => row.margin < 0)
  const publishablePass = publishableChecks.length >= 2 && publishableChecks.every(Boolean)
  return {
    baseline_overall: baselineOverall,
    candidate_overall: candidateOverall,
    overall_delta: overallDelta,
    dimension_margins: dimensionMargins,
    dimension_failures: dimensionFailures,
    publishable_pass: publishablePass,
    passed: overallDelta >= -0.5 && dimensionFailures.length === 0 && publishablePass,
  }
}

export function buildBlindScoreInputs(runs: BlindReviewRun[]) {
  const baseline = BLIND_REVIEW_DIMENSIONS.map(dimension => ({ dimension, scores: [] as number[] }))
  const candidate = BLIND_REVIEW_DIMENSIONS.map(dimension => ({ dimension, scores: [] as number[] }))
  const baselineByDimension = new Map(baseline.map(row => [row.dimension, row.scores]))
  const candidateByDimension = new Map(candidate.map(row => [row.dimension, row.scores]))
  const publishableChecks: boolean[] = []
  const labels = ['A', 'B', 'C', 'D']

  if (runs.length !== 2) throw new Error(`匿名评审次数必须为 2，实际为 ${runs.length}`)
  for (const [runIndex, run] of runs.entries()) {
    if (!Array.isArray(run.order) || run.order.length !== labels.length) {
      throw new Error(`第 ${runIndex + 1} 次匿名评审顺序无效`)
    }
    const samples = Array.isArray(run.payload?.samples) ? run.payload.samples : []
    const sampleByLabel = new Map(samples.map((sample: any) => [String(sample?.label || ''), sample]))
    for (const [sampleIndex, label] of labels.entries()) {
      const chapterNo = Number(run.order[sampleIndex])
      const sample: any = sampleByLabel.get(label)
      if (!sample) throw new Error(`第 ${runIndex + 1} 次匿名评审缺少样本 ${label}`)
      if (typeof sample.publishable !== 'boolean' || typeof sample.materially_below_publishable_baseline !== 'boolean') {
        throw new Error(`第 ${runIndex + 1} 次匿名评审样本 ${label} 缺少发布判断`)
      }
      for (const dimension of BLIND_REVIEW_DIMENSIONS) {
        const score = Number(sample?.scores?.[dimension])
        const evidence = String(sample?.evidence?.[dimension] || '').trim()
        if (!Number.isFinite(score) || score < 1 || score > 10) {
          throw new Error(`第 ${runIndex + 1} 次匿名评审样本 ${label} 的 ${dimension} 分数无效`)
        }
        if (!evidence) throw new Error(`第 ${runIndex + 1} 次匿名评审样本 ${label} 的 ${dimension} 缺少正文证据`)
        if (chapterNo === 10) candidateByDimension.get(dimension)?.push(score)
        else if ([1, 2, 3].includes(chapterNo)) baselineByDimension.get(dimension)?.push(score)
        else throw new Error(`匿名评审包含未授权章节 ${chapterNo}`)
      }
      if (chapterNo === 10) {
        publishableChecks.push(sample.publishable === true && sample.materially_below_publishable_baseline === false)
      }
    }
  }

  if (baseline.some(row => row.scores.length !== 6)) throw new Error('匿名评审没有为基线章节生成完整的六组分数')
  if (candidate.some(row => row.scores.length !== 2)) throw new Error('匿名评审没有为候选章节生成完整的两组分数')
  return { baseline, candidate, publishable_checks: publishableChecks }
}

export function hasChapterNinePursuitHandoff(tail: string, opening: string, names: string[]) {
  const tailNames = names.map(name => String(name || '').trim()).filter(name => name && tail.includes(name))
  const sharesCharacter = tailNames.some(name => opening.includes(name))
  const crisisPattern = /追捕|包围|合围|封锁|围住|退路|追兵/
  return sharesCharacter && crisisPattern.test(tail) && crisisPattern.test(opening)
}

const SENSITIVE_REPORT_KEY = /^(?:api[_-]?key|authorization|provider[_-]?secret|client[_-]?secret|access[_-]?token|prompt|full[_-]?prompt|task)$/i

export function sanitizeValidationValue(value: any, seen = new WeakSet<object>()): any {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
  if (typeof value !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map(item => sanitizeValidationValue(item, seen))
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_REPORT_KEY.test(key)) continue
    output[key] = sanitizeValidationValue(item, seen)
  }
  return output
}

const EXPECTED_PROJECT_TITLE = '怪谈世界：我是超人，怪谈你随意'
const BLIND_REVIEW_ORDERS = [
  [10, 1, 3, 2],
  [2, 10, 1, 3],
]

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function compactText(value: any, maxChars = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function normalizeUrl(value: any) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function requireCondition(condition: any, message: string, details: any = {}) {
  if (condition) return
  throw Object.assign(new Error(message), details)
}

function reportStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

export function buildGenerationRequestBody(projectId: number, modelId: number) {
  return {
    project_id: projectId,
    model_id: modelId,
    auto_repair_missing_material: true,
    auto_repair_quality_gate: true,
  }
}

async function resolveValidationWorkspace(root: string) {
  if (process.env.MANGAFORGE_WORKSPACE) return resolve(process.env.MANGAFORGE_WORKSPACE)
  const active = await loadActiveWorkspace()
  const activeDatabase = join(active, 'novel.sqlite')
  try {
    await access(activeDatabase)
    return resolve(active)
  } catch {
    return resolve(join(root, 'workspace'))
  }
}

async function backupNovelDatabase(workspace: string, backupRoot: string, stamp: string) {
  const backupDir = join(backupRoot, stamp)
  await mkdir(backupDir, { recursive: true })
  const sourcePath = join(workspace, 'novel.sqlite')
  const db = new Database(sourcePath, { readonly: true })
  try {
    await writeFile(join(backupDir, 'novel.sqlite'), Buffer.from(db.serialize()))
  } finally {
    db.close()
  }
  for (const file of ['novel.sqlite-wal', 'novel.sqlite-shm']) {
    await copyFile(join(workspace, file), join(backupDir, file)).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
  return backupDir
}

async function requestJson(path: string, init: RequestInit = {}) {
  const baseUrl = normalizeUrl(process.env.MANGAFORGE_API_URL || 'http://127.0.0.1:8787/api')
  const timeoutMs = Math.max(60_000, Number(process.env.PROSE_VALIDATION_HTTP_TIMEOUT_MS || 1_800_000))
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  })
  const text = await response.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw Object.assign(new Error(`HTTP ${response.status} 返回了非 JSON 响应：${text.slice(0, 500)}`), {
      status: response.status,
    })
  }
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}：${compactText(payload?.error || text, 600)}`), {
      status: response.status,
      error_code: payload?.error_code,
      response: sanitizeValidationValue(payload),
    })
  }
  return payload
}

function parseSseData(frame: string) {
  const dataLines: string[] = []
  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    if (field !== 'data') continue
    let value = separator === -1 ? '' : line.slice(separator + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    dataLines.push(value)
  }
  return dataLines.length ? dataLines.join('\n') : null
}

export async function readProseGenerationSse(response: Response) {
  if (!response.ok) {
    const text = await response.text()
    let payload: any = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = text
    }
    throw Object.assign(new Error(`HTTP ${response.status}: ${compactText(payload?.error || text, 600)}`), {
      status: response.status,
      error_code: payload?.error_code,
      response: sanitizeValidationValue(payload),
    })
  }
  if (!response.body) {
    throw Object.assign(new Error('SSE response did not include a readable body'), {
      status: response.status,
      error_code: 'PROSE_GENERATION_STREAM_MISSING',
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastPayload: any = null

  const consumeFrame = (frame: string) => {
    const data = parseSseData(frame)
    if (data == null) return null
    let payload: any
    try {
      payload = JSON.parse(data)
    } catch {
      throw Object.assign(new Error(`SSE event returned invalid JSON: ${compactText(data, 500)}`), {
        status: response.status,
        error_code: 'PROSE_GENERATION_STREAM_INVALID_JSON',
        response: sanitizeValidationValue({ data }),
      })
    }
    lastPayload = payload
    if (payload?.type === 'error') {
      throw Object.assign(new Error(`SSE generation failed: ${compactText(payload?.error || payload?.message, 600)}`), {
        status: response.status,
        error_code: payload?.error_code,
        response: sanitizeValidationValue(payload),
      })
    }
    return payload?.type === 'done' ? payload : null
  }

  while (true) {
    const chunk = await reader.read()
    buffer += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true })
    let boundary = buffer.match(/\r?\n\r?\n/)
    while (boundary?.index != null) {
      const frame = buffer.slice(0, boundary.index)
      buffer = buffer.slice(boundary.index + boundary[0].length)
      const donePayload = consumeFrame(frame)
      if (donePayload) return donePayload
      boundary = buffer.match(/\r?\n\r?\n/)
    }
    if (chunk.done) break
  }

  if (buffer.trim()) {
    const donePayload = consumeFrame(buffer)
    if (donePayload) return donePayload
  }
  throw Object.assign(new Error('SSE stream ended before a done event'), {
    status: response.status,
    error_code: 'PROSE_GENERATION_STREAM_INCOMPLETE',
    response: sanitizeValidationValue(lastPayload),
  })
}

export async function requestProseGenerationSse(
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
) {
  const baseUrl = normalizeUrl(process.env.MANGAFORGE_API_URL || 'http://127.0.0.1:8787/api')
  const timeoutMs = Math.max(60_000, Number(process.env.PROSE_VALIDATION_HTTP_TIMEOUT_MS || 1_800_000))
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'text/event-stream')
  const url = new URL(`${baseUrl}${path}`)
  url.searchParams.set('stream', '1')
  const response = await fetchImpl(url.toString(), {
    ...init,
    headers,
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  })
  return readProseGenerationSse(response)
}

function compactDeterministicCheck(item: any) {
  return {
    key: compactText(item?.key || item?.pattern || item?.gate || 'deterministic_prose', 120),
    label: compactText(item?.label || item?.pattern, 160),
    status: compactText(item?.status, 40),
    severity: compactText(item?.severity, 40),
    blocking: item?.blocking === true,
    message: compactText(item?.message || item?.evidence || item?.fix, 300),
  }
}

function summarizeBlindReview(run: any) {
  const labels = ['A', 'B', 'C', 'D']
  const sampleByLabel = new Map(
    (Array.isArray(run?.payload?.samples) ? run.payload.samples : [])
      .map((sample: any) => [String(sample?.label || ''), sample]),
  )
  return {
    order: run.order,
    model_name: run.model_name,
    usage: run.usage || null,
    samples: labels.map((label, index) => {
      const sample: any = sampleByLabel.get(label) || {}
      return {
        label,
        chapter_no: run.order[index],
        scores: Object.fromEntries(BLIND_REVIEW_DIMENSIONS.map(dimension => [dimension, Number(sample?.scores?.[dimension])])),
        evidence: Object.fromEntries(BLIND_REVIEW_DIMENSIONS.map(dimension => [dimension, compactText(sample?.evidence?.[dimension], 300)])),
        publishable: sample?.publishable === true,
        materially_below_publishable_baseline: sample?.materially_below_publishable_baseline === true,
      }
    }),
  }
}

async function runBlindReview(input: {
  order: number[]
  project: any
  chapterByNo: Map<number, any>
  workspace: string
  modelId: string
}) {
  const labels = ['A', 'B', 'C', 'D']
  const samples = input.order.map((chapterNo, index) => ({
    label: labels[index],
    text: String(input.chapterByNo.get(chapterNo)?.chapter_text || ''),
  }))
  const task = [
    '你是中文商业网文终审。以下四个匿名章节来自同一作品，不得猜测生成方式或章节序号。',
    `按 ${BLIND_REVIEW_DIMENSIONS.join('、')} 七维各给 1-10 分。`,
    '每个维度必须引用对应正文中的可定位短句；不得以生成方式、章节序号或模型身份作为评分依据。',
    '另给 publishable(boolean) 和 materially_below_publishable_baseline(boolean)。',
    JSON.stringify(samples),
    `只输出 JSON：{"samples":[{"label":"A","scores":${JSON.stringify(Object.fromEntries(BLIND_REVIEW_DIMENSIONS.map(key => [key, 0])))} ,"evidence":${JSON.stringify(Object.fromEntries(BLIND_REVIEW_DIMENSIONS.map(key => [key, '正文短句'])))} ,"publishable":false,"materially_below_publishable_baseline":false}]}`,
  ].join('\n')
  const result = await executeNovelAgent('review-agent', input.project, { task }, {
    activeWorkspace: input.workspace,
    modelId: input.modelId,
    temperature: 0.1,
    maxTokens: 5000,
    skipMemory: true,
    responseMode: 'non_stream',
    timeoutMs: 300_000,
  })
  return {
    order: input.order,
    payload: getNovelPayload(result),
    usage: (result as any).usage || (result as any).raw?.usage || null,
    model_name: (result as any).modelName || (result as any).model_name || '',
  }
}

async function writeValidationReport(reportPath: string, report: any) {
  const sanitized = sanitizeValidationValue(report)
  await writeFile(reportPath, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8')
}

export async function runNovelProseQualityRecoveryValidation() {
  const startedAt = new Date()
  const stamp = reportStamp(startedAt)
  const root = resolve(import.meta.dir, '..')
  const workspace = await resolveValidationWorkspace(root)
  const artifactDir = resolve(process.env.PROSE_VALIDATION_DIR || join(root, 'artifacts/novel-prose-quality-recovery'))
  const backupRoot = resolve(process.env.PROSE_VALIDATION_BACKUP_DIR || '/private/tmp/mangaforge-prose-validation-backups')
  const projectId = Number(process.env.PROSE_VALIDATION_PROJECT_ID || 1)
  const modelId = String(process.env.PROSE_VALIDATION_MODEL_ID || 217)
  const expectedKeyId = Number(process.env.PROSE_VALIDATION_KEY_ID || 5)
  const expectedModelName = String(process.env.PROSE_VALIDATION_MODEL_NAME || 'gemini-3.5-flash')
  const expectedProxyUrl = normalizeUrl(process.env.PROSE_VALIDATION_PROXY_URL || 'http://localhost:7860/v1')
  await mkdir(artifactDir, { recursive: true })
  const reportPath = join(artifactDir, `validation-${stamp}.json`)
  const report: any = {
    status: 'running',
    started_at: startedAt.toISOString(),
    project_id: projectId,
    model_id: Number(modelId),
    workspace,
  }
  let reportWritten = false
  let summaryPrinted = false

  try {
    const [project, beforeChapters, models, keys, providers] = await Promise.all([
      getNovelProject(workspace, projectId),
      listNovelChapters(workspace, projectId),
      readModels(workspace),
      readKeys(workspace),
      readProviders(workspace),
    ])
    requireCondition(project, `项目 ${projectId} 不存在`)
    requireCondition(project.title === EXPECTED_PROJECT_TITLE, `项目标题不匹配：${project.title}`)

    const model = models.find(item => String(item.id) === modelId)
    requireCondition(model, `模型 ${modelId} 不存在`)
    requireCondition(model.model_name === expectedModelName, `模型 ${modelId} 不是 ${expectedModelName}`)
    requireCondition(Number(model.api_key_id) === expectedKeyId, `模型 ${modelId} 未绑定 key ${expectedKeyId}`)
    requireCondition(model.is_active !== false, `模型 ${modelId} 未启用`)
    const key = keys.find(item => Number(item.id) === expectedKeyId)
    requireCondition(key && key.is_active !== false, `key ${expectedKeyId} 不存在或未启用`)
    const provider = providers.find(item => String(item.id) === String(model.provider))
    requireCondition(provider, `provider ${model.provider} 不存在`)
    const runtimeBaseUrl = normalizeUrl(key?.base_url || provider?.default_base_url)
    requireCondition(runtimeBaseUrl === expectedProxyUrl, `真实模型 proxy 不匹配：${runtimeBaseUrl}`)
    report.runtime = {
      model_name: model.model_name,
      model_display_name: model.display_name,
      provider: model.provider,
      key_id: expectedKeyId,
      proxy_url: runtimeBaseUrl,
    }

    const chapterByNoBefore = new Map(beforeChapters.map(chapter => [Number(chapter.chapter_no), chapter]))
    for (let chapterNo = 1; chapterNo <= 10; chapterNo += 1) {
      requireCondition(chapterByNoBefore.has(chapterNo), `缺少第 ${chapterNo} 章记录`)
    }
    for (let chapterNo = 1; chapterNo <= 9; chapterNo += 1) {
      requireCondition(String(chapterByNoBefore.get(chapterNo)?.chapter_text || '').trim(), `第 ${chapterNo} 章正文为空`)
    }
    const chapter10 = chapterByNoBefore.get(10)
    requireCondition(!String(chapter10?.chapter_text || '').trim(), '第 10 章已存在正文，拒绝覆盖真实候选')
    const beforeHashes = Array.from({ length: 9 }, (_, index) => {
      const chapterNo = index + 1
      const text = String(chapterByNoBefore.get(chapterNo)?.chapter_text || '')
      return { chapter_no: chapterNo, sha256: hashText(text), chars: text.replace(/\s/g, '').length }
    })
    report.history_hashes = { before: beforeHashes }

    const backupDir = await backupNovelDatabase(workspace, backupRoot, stamp)
    report.backup_dir = backupDir

    const generatedResponse = await requestProseGenerationSse(`/novel/chapters/${chapter10.id}/generate-prose`, {
      method: 'POST',
      body: JSON.stringify(buildGenerationRequestBody(projectId, Number(modelId))),
    })
    const generated = generatedResponse?.result || generatedResponse
    const promptChars = Number(generated?.prompt_diagnostics?.prompt_chars || 0)
    requireCondition(promptChars > 0 && promptChars <= 48_000, `正文 prompt 字符数无效：${promptChars}`)
    requireCondition(generated?.quality_loop?.decision?.passed === true, '正常链路没有返回通过的正文质量决定')
    requireCondition(String(generated?.chapter?.chapter_text || '').trim(), '正常链路没有返回已入库正文')
    report.generation = {
      chapter: {
        id: generated.chapter.id,
        chapter_no: generated.chapter.chapter_no,
        title: generated.chapter.title,
        chars: String(generated.chapter.chapter_text || '').replace(/\s/g, '').length,
      },
      prompt_diagnostics: generated.prompt_diagnostics,
      quality_loop: generated.quality_loop,
      post_draft_director: generated.post_draft_director,
    }

    const afterChapters = await listNovelChapters(workspace, projectId)
    const chapterByNo = new Map(afterChapters.map(chapter => [Number(chapter.chapter_no), chapter]))
    const afterHashes = beforeHashes.map(row => {
      const text = String(chapterByNo.get(row.chapter_no)?.chapter_text || '')
      return { chapter_no: row.chapter_no, sha256: hashText(text), chars: text.replace(/\s/g, '').length }
    })
    report.history_hashes.after = afterHashes
    report.history_hashes.unchanged = beforeHashes.every((row, index) => row.sha256 === afterHashes[index]?.sha256)
    for (const [index, row] of beforeHashes.entries()) {
      requireCondition(row.sha256 === afterHashes[index]?.sha256, `历史正文哈希改变：第 ${row.chapter_no} 章`)
    }

    const storedCandidate = chapterByNo.get(10)
    const candidateText = String(storedCandidate?.chapter_text || '')
    requireCondition(candidateText.trim(), '第 10 章没有通过正常链路入库')
    const candidateWordTarget = resolveChapterWordTarget(project, storedCandidate, {})
    const qualityScan = scanProseForQualityLoop(candidateText, { chapter_target: storedCandidate }, candidateWordTarget)
    const repeatedChecks = [
      ...scanRepeatedSubjectRisks(candidateText),
      ...scanRepeatedReactionRisks(candidateText),
    ]
    const hardChecks = [
      ...(qualityScan.hard_failures || []),
      ...repeatedChecks.map(item => ({
        key: `repetition_${item.gate || 'rhythm'}`,
        message: item.evidence || item.fix || item.pattern,
        source: 'deterministic',
      })),
    ]
    const chapter9Tail = String(chapterByNo.get(9)?.chapter_text || '').slice(-1200)
    const chapter10Opening = candidateText.slice(0, 600)
    const characterNames = (await listNovelCharacters(workspace, projectId)).map(character => String(character.name || '')).filter(Boolean)
    const handoffPassed = hasChapterNinePursuitHandoff(chapter9Tail, chapter10Opening, characterNames)
    report.deterministic_validation = {
      passed: hardChecks.length === 0 && qualityScan.word_target?.passed === true && handoffPassed,
      hard_failure_count: hardChecks.length,
      hard_failures: hardChecks.map(compactDeterministicCheck),
      cleanup: {
        risk_count: Number(qualityScan.cleanup?.risk_count || 0),
        categories: (Array.isArray(qualityScan.cleanup?.categories) ? qualityScan.cleanup.categories : []).map((category: any) => ({
          type: category?.type,
          label: category?.label,
          count: Number(category?.count || 0),
          has_blocking: category?.has_blocking === true,
        })),
      },
      word_target: qualityScan.word_target,
      chapter_9_handoff: {
        passed: handoffPassed,
        shared_character_candidates: characterNames.filter(name => chapter9Tail.includes(name) && chapter10Opening.includes(name)),
      },
    }
    requireCondition(hardChecks.length === 0, '第 10 章仍有确定性硬失败')
    requireCondition(qualityScan.word_target?.passed === true, `第 10 章字数 ${qualityScan.word_target?.actual} 不在 ${qualityScan.word_target?.min}-${qualityScan.word_target?.max}`)
    requireCondition(handoffPassed, '第 10 章开篇没有可定位的第 9 章合围承接证据')

    const blindReviews = []
    for (const order of BLIND_REVIEW_ORDERS) {
      blindReviews.push(await runBlindReview({
        order,
        project,
        chapterByNo,
        workspace,
        modelId,
      }))
    }
    const blindInputs = buildBlindScoreInputs(blindReviews)
    const thresholds = evaluateBlindScoreThresholds(
      blindInputs.baseline,
      blindInputs.candidate,
      blindInputs.publishable_checks,
    )
    report.blind_reviews = blindReviews.map(summarizeBlindReview)
    report.thresholds = thresholds
    report.status = thresholds.passed ? 'passed' : 'failed'
    report.completed_at = new Date().toISOString()
    if (!thresholds.passed) {
      report.error = {
        code: 'BLIND_QUALITY_THRESHOLD_FAILED',
        message: '第 10 章没有达到前三章匿名质量基线',
      }
    }
    await writeValidationReport(reportPath, report)
    reportWritten = true
    const minimumMargin = Math.min(...thresholds.dimension_margins.map(row => row.margin))
    console.log(JSON.stringify({
      report_path: reportPath,
      status: report.status,
      prompt_chars: promptChars,
      revision_rounds: generated?.quality_loop?.rounds?.length || 0,
      overall_delta: thresholds.overall_delta,
      minimum_dimension_margin: minimumMargin,
      history_hashes_unchanged: report.history_hashes.unchanged,
    }))
    summaryPrinted = true
    requireCondition(thresholds.passed, '第 10 章没有达到前三章匿名质量基线', {
      code: 'BLIND_QUALITY_THRESHOLD_FAILED',
      thresholds,
      report_path: reportPath,
    })
    return { report_path: reportPath, report: sanitizeValidationValue(report) }
  } catch (error: any) {
    report.status = 'failed'
    report.completed_at = report.completed_at || new Date().toISOString()
    report.error = report.error || {
      code: compactText(error?.code || error?.error_code || 'PROSE_VALIDATION_FAILED', 120),
      message: compactText(error?.message || error, 800),
    }
    if (!reportWritten) {
      await writeValidationReport(reportPath, report)
      reportWritten = true
    }
    if (!summaryPrinted) {
      console.error(JSON.stringify({
        report_path: reportPath,
        status: 'failed',
        error_code: report.error.code,
        error: report.error.message,
      }))
    }
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { report_path: reportPath })
  }
}

if (import.meta.main) {
  runNovelProseQualityRecoveryValidation().catch(error => {
    console.error(compactText(error?.message || error, 800))
    process.exitCode = 1
  })
}
