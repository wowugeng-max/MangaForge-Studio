#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { types } from 'node:util'
import { pathToFileURL } from 'node:url'

const SHA256_FINGERPRINT = /^sha256:[0-9a-f]{64}$/
const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/
const OPAQUE_ID = /^[\x21-\x7e]{1,512}$/
const STAGE = /^[a-z][a-z0-9_]{0,63}$/
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,79}$/
const RECEIPT_AUTHORITY = 'chapter_generation_stage_v1'
const MAX_RECEIPTS = 128
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 1000
const REVIEW_OR_REPAIR_STAGES = new Set([
  'quality_review',
  'quality_recheck',
  'structured_review_fill',
  'quality_repair',
  'manual_recheck',
  'editor_report',
  'revision',
  'post_revision_review',
])

function safeError(message, code) {
  const error = new Error(message)
  if (SAFE_CODE.test(code || '')) {
    Object.defineProperty(error, 'code', { enumerable: true, value: code })
  }
  return error
}

function ownDataValue(value, field) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || types.isProxy(value)) {
    return undefined
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function positiveSafeInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function boundedString(value, pattern) {
  return typeof value === 'string' && pattern.test(value) ? value : undefined
}

function boundedLabel(value, maximum = 128) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maximum
    && !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : undefined
}

function receiptArrayValues(receipts, errorMessage) {
  if (!Array.isArray(receipts) || types.isProxy(receipts)) throw safeError(errorMessage, 'INVALID_RECEIPTS')
  const length = ownDataValue(receipts, 'length')
  if (!Number.isSafeInteger(length) || length < 1 || length > MAX_RECEIPTS) {
    throw safeError(errorMessage, 'INVALID_RECEIPTS')
  }
  const values = []
  for (let index = 0; index < length; index += 1) {
    const value = ownDataValue(receipts, String(index))
    if (value === undefined) throw safeError(errorMessage, 'INVALID_RECEIPTS')
    values.push(value)
  }
  return values
}

function projectAssertionReceipt(value, errorMessage) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) {
    throw safeError(errorMessage, 'INVALID_RECEIPTS')
  }
  const taskId = boundedString(ownDataValue(value, 'task_id'), TASK_ID)
  const stage = boundedString(ownDataValue(value, 'stage'), STAGE)
  const source = ownDataValue(value, 'source')
  const sourceFingerprint = boundedString(ownDataValue(value, 'source_fingerprint'), SHA256_FINGERPRINT)
  const sessionId = boundedString(ownDataValue(value, 'session_id'), OPAQUE_ID)
  if (!taskId || !stage || source !== 'mcp' || !sourceFingerprint || !sessionId) {
    throw safeError(errorMessage, 'INVALID_RECEIPTS')
  }
  return { task_id: taskId, stage, source_fingerprint: sourceFingerprint, session_id: sessionId }
}

export function assertOneTaskSession(receipts) {
  const errorMessage = 'invalid chapter task receipts'
  const projected = receiptArrayValues(receipts, errorMessage)
    .map(value => projectAssertionReceipt(value, errorMessage))
  const first = projected[0]
  if (projected.some(value => (
    value.task_id !== first.task_id
    || value.source_fingerprint !== first.source_fingerprint
    || value.session_id !== first.session_id
  ))) {
    throw safeError(errorMessage, 'INVALID_RECEIPTS')
  }
  return {
    task_id: first.task_id,
    source_fingerprint: first.source_fingerprint,
    session_id: first.session_id,
  }
}

export function assertAutomaticStageCoverage(receipts) {
  assertOneTaskSession(receipts)
  const stages = receiptArrayValues(receipts, 'automatic task stage coverage failed')
    .map(value => projectAssertionReceipt(value, 'automatic task stage coverage failed').stage)
  if (!stages.includes('draft')
    || !stages.includes('story_state_sync')
    || !stages.some(stage => REVIEW_OR_REPAIR_STAGES.has(stage))) {
    throw safeError('automatic task stage coverage failed', 'AUTOMATIC_STAGE_COVERAGE_FAILED')
  }
  return [...new Set(stages)]
}

export function assertNewTaskSession(previousSessionId, manualReceipts, previousTaskId) {
  if (!boundedString(previousSessionId, OPAQUE_ID)) {
    throw safeError('invalid manual task receipts', 'INVALID_MANUAL_RECEIPTS')
  }
  if (previousTaskId !== undefined && !boundedString(previousTaskId, TASK_ID)) {
    throw safeError('invalid manual task receipts', 'INVALID_MANUAL_RECEIPTS')
  }
  let projected
  try {
    projected = assertOneTaskSession(manualReceipts)
  } catch {
    throw safeError('invalid manual task receipts', 'INVALID_MANUAL_RECEIPTS')
  }
  if (projected.session_id === previousSessionId) {
    throw safeError('manual task reused the previous Session', 'MANUAL_SESSION_REUSED')
  }
  if (previousTaskId !== undefined && projected.task_id === previousTaskId) {
    throw safeError('manual task reused the previous task', 'MANUAL_TASK_REUSED')
  }
  return projected
}

function parsePositiveInteger(raw) {
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) return undefined
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : undefined
}

function parseBoundedInteger(raw, minimum, maximum) {
  const value = parsePositiveInteger(raw)
  return value !== undefined && value >= minimum && value <= maximum ? value : undefined
}

function normalizeBaseUrl(raw) {
  if (typeof raw !== 'string' || raw.length < 1 || raw.length > 2048) return undefined
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return undefined
  }
  if (!['http:', 'https:'].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !['/', '/api', '/api/'].includes(parsed.pathname)) {
    return undefined
  }
  return parsed.origin
}

export function parseCliArgs(argv) {
  const fail = () => { throw safeError('invalid smoke arguments', 'INVALID_SMOKE_ARGUMENTS') }
  if (!Array.isArray(argv) || types.isProxy(argv) || argv.length > 12 || argv.length % 2 !== 0) fail()
  const allowed = new Set(['--base-url', '--project-id', '--chapter-id', '--timeout-ms', '--poll-interval-ms'])
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index]
    const value = argv[index + 1]
    if (typeof name !== 'string' || typeof value !== 'string' || !allowed.has(name) || values.has(name)) fail()
    values.set(name, value)
  }
  const baseUrl = normalizeBaseUrl(values.get('--base-url'))
  const projectId = parsePositiveInteger(values.get('--project-id'))
  const chapterId = parsePositiveInteger(values.get('--chapter-id'))
  const timeoutMs = values.has('--timeout-ms')
    ? parseBoundedInteger(values.get('--timeout-ms'), 10_000, 3_600_000)
    : DEFAULT_TIMEOUT_MS
  const pollIntervalMs = values.has('--poll-interval-ms')
    ? parseBoundedInteger(values.get('--poll-interval-ms'), 100, 10_000)
    : DEFAULT_POLL_INTERVAL_MS
  if (!baseUrl || !projectId || !chapterId || !timeoutMs || !pollIntervalMs) fail()
  return { baseUrl, projectId, chapterId, timeoutMs, pollIntervalMs }
}

function parseBoundedReceiptRef(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 16_384) return undefined
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch {
    return undefined
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
}

export function projectStageReceipt(run) {
  const fail = () => { throw safeError('invalid chapter stage receipt', 'INVALID_STAGE_RECEIPT') }
  if (!run || typeof run !== 'object' || types.isProxy(run)) fail()
  const runId = positiveSafeInteger(ownDataValue(run, 'id'))
  const runProjectId = positiveSafeInteger(ownDataValue(run, 'project_id'))
  const runType = ownDataValue(run, 'run_type')
  const runStage = boundedString(ownDataValue(run, 'step_name'), STAGE)
  const runStatus = boundedString(ownDataValue(run, 'status'), STAGE)
  const input = parseBoundedReceiptRef(ownDataValue(run, 'input_ref'))
  const output = parseBoundedReceiptRef(ownDataValue(run, 'output_ref'))
  if (!runId || !runProjectId || runType !== 'chapter_generation_stage' || !runStage || !runStatus || !input || !output) fail()
  if (ownDataValue(input, 'receipt_authority') !== RECEIPT_AUTHORITY
    || ownDataValue(output, 'receipt_authority') !== RECEIPT_AUTHORITY) fail()
  const merged = {
    task_id: ownDataValue(output, 'task_id') ?? ownDataValue(input, 'task_id'),
    project_id: ownDataValue(output, 'project_id') ?? ownDataValue(input, 'project_id'),
    chapter_id: ownDataValue(output, 'chapter_id') ?? ownDataValue(input, 'chapter_id'),
    stage: ownDataValue(output, 'stage') ?? ownDataValue(input, 'stage'),
    status: ownDataValue(output, 'status') ?? runStatus,
    source: ownDataValue(output, 'source') ?? ownDataValue(input, 'source'),
    source_fingerprint: ownDataValue(output, 'source_fingerprint') ?? ownDataValue(input, 'source_fingerprint'),
    session_id: ownDataValue(output, 'session_id') ?? ownDataValue(input, 'session_id'),
  }
  const assertionReceipt = projectAssertionReceipt(merged, 'invalid chapter stage receipt')
  const projectId = positiveSafeInteger(merged.project_id)
  const chapterId = positiveSafeInteger(merged.chapter_id)
  const status = boundedString(merged.status, STAGE)
  if (!projectId || !chapterId || !status || assertionReceipt.stage !== runStage || projectId !== runProjectId) fail()
  return {
    run_id: runId,
    task_id: assertionReceipt.task_id,
    project_id: projectId,
    chapter_id: chapterId,
    stage: assertionReceipt.stage,
    status,
    source: 'mcp',
    source_fingerprint: assertionReceipt.source_fingerprint,
    session_id: assertionReceipt.session_id,
  }
}

export function maskFingerprint(value) {
  return SHA256_FINGERPRINT.test(value || '') ? `sha256:${value.slice(7, 13)}…` : 'unavailable'
}

export function maskSessionId(value) {
  if (!boundedString(value, OPAQUE_ID)) return 'unavailable'
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 6)}…`
}

function remainingTime(deadline) {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw safeError('smoke timeout', 'SMOKE_TIMEOUT')
  return remaining
}

function sleepPoll(milliseconds, deadline) {
  const duration = Math.min(milliseconds, remainingTime(deadline))
  return new Promise(resolve => setTimeout(resolve, duration))
}

async function readBoundedText(response) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    try { await response.body?.cancel() } catch {}
    throw safeError('HTTP response too large', 'HTTP_RESPONSE_TOO_LARGE')
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        try { await reader.cancel() } catch {}
        throw safeError('HTTP response too large', 'HTTP_RESPONSE_TOO_LARGE')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw safeError('invalid HTTP response encoding', 'INVALID_HTTP_ENCODING')
  }
}

export async function requestJson(baseUrl, path, options, deadline, fetchImpl = fetch) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), remainingTime(deadline))
  let response
  let text
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method: options?.method || 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      redirect: 'error',
    })
    text = await readBoundedText(response)
  } catch (error) {
    if (controller.signal.aborted) throw safeError('request timeout', 'REQUEST_TIMEOUT')
    const safeCode = ownDataValue(error, 'code')
    if (safeCode === 'HTTP_RESPONSE_TOO_LARGE') {
      throw safeError('HTTP response too large', 'HTTP_RESPONSE_TOO_LARGE')
    }
    if (safeCode === 'INVALID_HTTP_ENCODING') {
      throw safeError('invalid HTTP response encoding', 'INVALID_HTTP_ENCODING')
    }
    throw safeError('request failed', 'REQUEST_FAILED')
  } finally {
    clearTimeout(timer)
  }
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw safeError('invalid JSON response', 'INVALID_JSON_RESPONSE')
  }
  if (!response.ok) {
    const responseCode = boundedString(ownDataValue(data, 'error_code'), SAFE_CODE)
    const code = responseCode || `HTTP_${response.status}`
    throw safeError(`HTTP ${response.status}${responseCode ? ` (${responseCode})` : ''}`, code)
  }
  return data
}

export function projectSourceAuthority(value) {
  const source = ownDataValue(value, 'source')
  const display = ownDataValue(value, 'display')
  const binding = ownDataValue(source, 'mcp')
  const fingerprint = boundedString(ownDataValue(value, 'fingerprint'), SHA256_FINGERPRINT)
  if (ownDataValue(value, 'ok') !== true
    || ownDataValue(source, 'active') !== 'mcp'
    || ownDataValue(display, 'active') !== 'mcp'
    || ownDataValue(binding, 'adapter_id') !== 'buda'
    || !fingerprint) {
    throw safeError('active chapter source is not Buda MCP', 'CHAPTER_SOURCE_NOT_BUDA_MCP')
  }
  return { fingerprint }
}

function projectChapter(value, expectedProjectId, expectedChapterId) {
  const id = positiveSafeInteger(ownDataValue(value, 'id'))
  const projectId = positiveSafeInteger(ownDataValue(value, 'project_id'))
  const chapterNo = positiveSafeInteger(ownDataValue(value, 'chapter_no'))
  const chapterText = ownDataValue(value, 'chapter_text')
  if (id !== expectedChapterId || projectId !== expectedProjectId || !chapterNo || typeof chapterText !== 'string') {
    throw safeError('invalid chapter projection', 'INVALID_CHAPTER_PROJECTION')
  }
  return { id, project_id: projectId, chapter_no: chapterNo, has_prose: chapterText.trim().length > 0 }
}

export function projectRunSummaryList(value) {
  if (!Array.isArray(value) || types.isProxy(value) || value.length > 5000) {
    throw safeError('invalid run summaries', 'INVALID_RUN_SUMMARIES')
  }
  const summaries = []
  for (let index = 0; index < value.length; index += 1) {
    const row = ownDataValue(value, String(index))
    const id = positiveSafeInteger(ownDataValue(row, 'id'))
    const projectId = positiveSafeInteger(ownDataValue(row, 'project_id'))
    const runType = boundedString(ownDataValue(row, 'run_type'), STAGE)
    const stepName = boundedLabel(ownDataValue(row, 'step_name'))
    const status = boundedString(ownDataValue(row, 'status'), STAGE)
    const chapterIdValue = ownDataValue(row, 'chapter_id')
    const chapterId = chapterIdValue === null ? null : positiveSafeInteger(chapterIdValue)
    if (!id || !projectId || !runType || !stepName || !status || chapterId === undefined) {
      throw safeError('invalid run summaries', 'INVALID_RUN_SUMMARIES')
    }
    summaries.push({ id, project_id: projectId, run_type: runType, step_name: stepName, status, chapter_id: chapterId })
  }
  return summaries
}

function projectRunState(value, expectedRunId, expectedProjectId, expectedRunType) {
  const id = positiveSafeInteger(ownDataValue(value, 'id'))
  const projectId = positiveSafeInteger(ownDataValue(value, 'project_id'))
  const runType = boundedString(ownDataValue(value, 'run_type'), STAGE)
  const status = boundedString(ownDataValue(value, 'status'), STAGE)
  if (id !== expectedRunId || projectId !== expectedProjectId || runType !== expectedRunType || !status) {
    throw safeError('invalid run projection', 'INVALID_RUN_PROJECTION')
  }
  return { id, project_id: projectId, run_type: runType, status }
}

function projectStartedGroup(value, expectedProjectId, expectedChapterId) {
  const run = ownDataValue(value, 'run')
  const group = ownDataValue(value, 'group')
  const runId = positiveSafeInteger(ownDataValue(run, 'id'))
  const runProjectId = positiveSafeInteger(ownDataValue(run, 'project_id'))
  const runType = ownDataValue(run, 'run_type')
  const chapterIds = ownDataValue(group, 'chapter_ids')
  const chapterIdsLength = ownDataValue(chapterIds, 'length')
  const selectedChapterId = ownDataValue(chapterIds, '0')
  if (ownDataValue(value, 'ok') !== true
    || !runId
    || runProjectId !== expectedProjectId
    || runType !== 'chapter_group_generation'
    || !Array.isArray(chapterIds)
    || types.isProxy(chapterIds)
    || chapterIdsLength !== 1
    || selectedChapterId !== expectedChapterId) {
    throw safeError('invalid automatic run projection', 'INVALID_AUTOMATIC_RUN_PROJECTION')
  }
  return { run_id: runId }
}

function projectOperationOk(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || ownDataValue(value, 'ok') !== true) {
    throw safeError('manual operation failed', 'MANUAL_OPERATION_FAILED')
  }
  return true
}

async function listRunSummaries(baseUrl, projectId, deadline) {
  const data = await requestJson(
    baseUrl,
    `/api/novel/runs?project_id=${projectId}&view=summary&limit=1000`,
    undefined,
    deadline,
  )
  const projected = projectRunSummaryList(data)
  if (projected.some(run => run.project_id !== projectId)) {
    throw safeError('invalid run summaries', 'INVALID_RUN_SUMMARIES')
  }
  return projected
}

async function maxRunId(baseUrl, projectId, deadline) {
  const summaries = await listRunSummaries(baseUrl, projectId, deadline)
  return summaries.reduce((maximum, run) => Math.max(maximum, run.id), 0)
}

async function readStageReceiptsSince(baseUrl, projectId, chapterId, afterRunId, deadline) {
  const summaries = await listRunSummaries(baseUrl, projectId, deadline)
  const candidates = summaries
    .filter(run => run.id > afterRunId
      && run.run_type === 'chapter_generation_stage'
      && (run.chapter_id === null || run.chapter_id === chapterId))
    .sort((a, b) => a.id - b.id)
  if (candidates.length > MAX_RECEIPTS) {
    throw safeError('too many chapter stage receipts', 'TOO_MANY_STAGE_RECEIPTS')
  }
  const receipts = []
  for (const candidate of candidates) {
    const detail = await requestJson(
      baseUrl,
      `/api/novel/runs/${candidate.id}?project_id=${projectId}`,
      undefined,
      deadline,
    )
    const receipt = projectStageReceipt(detail)
    if (receipt.chapter_id === chapterId) receipts.push(receipt)
  }
  return receipts
}

async function pollRunSuccess(baseUrl, projectId, runId, deadline, pollIntervalMs) {
  while (true) {
    const detail = await requestJson(
      baseUrl,
      `/api/novel/runs/${runId}?project_id=${projectId}`,
      undefined,
      deadline,
    )
    const run = projectRunState(detail, runId, projectId, 'chapter_group_generation')
    if (run.status === 'success') return run
    if (['failed', 'canceled', 'paused'].includes(run.status)) {
      throw safeError('automatic run did not succeed', `AUTOMATIC_RUN_${run.status.toUpperCase()}`)
    }
    await sleepPoll(pollIntervalMs, deadline)
  }
}

function safeOutputCode(error) {
  const code = ownDataValue(error, 'code')
  return boundedString(code, SAFE_CODE) || 'SMOKE_FAILED'
}

export async function main(argv = process.argv.slice(2)) {
  let stage = 'arguments'
  try {
    const options = parseCliArgs(argv)
    const deadline = Date.now() + options.timeoutMs

    stage = 'source_authority'
    const authority = projectSourceAuthority(await requestJson(
      options.baseUrl,
      `/api/novel/projects/${options.projectId}/chapter-generation-source`,
      undefined,
      deadline,
    ))

    stage = 'chapter_preflight'
    const chapter = projectChapter(await requestJson(
      options.baseUrl,
      `/api/novel/chapters/${options.chapterId}?project_id=${options.projectId}`,
      undefined,
      deadline,
    ), options.projectId, options.chapterId)
    if (chapter.has_prose) throw safeError('chapter already has prose', 'CHAPTER_NOT_EMPTY')

    stage = 'automatic_baseline'
    const automaticBaseline = await maxRunId(options.baseUrl, options.projectId, deadline)

    stage = 'automatic_start'
    const automatic = projectStartedGroup(await requestJson(
      options.baseUrl,
      `/api/novel/projects/${options.projectId}/chapter-groups/start`,
      {
        method: 'POST',
        body: {
          start_chapter: chapter.chapter_no,
          count: 1,
          mode: 'task_session_acceptance',
          production_mode: 'full_auto',
          require_scene_confirmation: false,
        },
      },
      deadline,
    ), options.projectId, options.chapterId)

    stage = 'automatic_execute'
    projectOperationOk(await requestJson(
      options.baseUrl,
      `/api/novel/projects/${options.projectId}/chapter-groups/${automatic.run_id}/execute`,
      {
        method: 'POST',
        body: {
          max_chapters: 1,
          production_mode: 'full_auto',
          force_scene_cards: true,
          allow_incomplete: false,
          auto_repair_missing_material: true,
        },
      },
      deadline,
    ))

    stage = 'automatic_poll'
    await pollRunSuccess(
      options.baseUrl,
      options.projectId,
      automatic.run_id,
      deadline,
      options.pollIntervalMs,
    )

    stage = 'automatic_receipts'
    const automaticReceipts = await readStageReceiptsSince(
      options.baseUrl,
      options.projectId,
      options.chapterId,
      automaticBaseline,
      deadline,
    )
    const automaticSession = assertOneTaskSession(automaticReceipts)
    const automaticStages = assertAutomaticStageCoverage(automaticReceipts)
    if (automaticSession.source_fingerprint !== authority.fingerprint) {
      throw safeError('automatic source fingerprint mismatch', 'AUTOMATIC_FINGERPRINT_MISMATCH')
    }

    stage = 'manual_baseline'
    const manualBaseline = await maxRunId(options.baseUrl, options.projectId, deadline)

    stage = 'manual_quality'
    projectOperationOk(await requestJson(
      options.baseUrl,
      `/api/novel/chapters/${options.chapterId}/prose-quality`,
      { method: 'POST', body: { project_id: options.projectId, source: 'task_session_acceptance' } },
      deadline,
    ))

    stage = 'manual_receipts'
    const manualReceipts = await readStageReceiptsSince(
      options.baseUrl,
      options.projectId,
      options.chapterId,
      manualBaseline,
      deadline,
    )
    const manualSession = assertNewTaskSession(
      automaticSession.session_id,
      manualReceipts,
      automaticSession.task_id,
    )
    if (manualSession.source_fingerprint !== authority.fingerprint) {
      throw safeError('manual source fingerprint mismatch', 'MANUAL_FINGERPRINT_MISMATCH')
    }

    const manualStages = [...new Set(manualReceipts.map(receipt => receipt.stage))]
    const manualStageRunIds = manualReceipts.map(receipt => receipt.run_id)
    console.log(JSON.stringify({
      ok: true,
      project_id: options.projectId,
      chapter_id: options.chapterId,
      source: 'mcp',
      source_fingerprint: maskFingerprint(authority.fingerprint),
      automatic: {
        run_id: automatic.run_id,
        stage_run_ids: automaticReceipts.map(receipt => receipt.run_id),
        stages: automaticStages,
        session: maskSessionId(automaticSession.session_id),
        passed: true,
      },
      manual: {
        operation_run_id: manualStageRunIds[manualStageRunIds.length - 1],
        stage_run_ids: manualStageRunIds,
        stages: manualStages,
        session: maskSessionId(manualSession.session_id),
        passed: true,
      },
      sessions_different: manualSession.session_id !== automaticSession.session_id,
      tasks_different: manualSession.task_id !== automaticSession.task_id,
    }))
    return 0
  } catch (error) {
    console.error(JSON.stringify({ ok: false, stage, error_code: safeOutputCode(error) }))
    return 1
  }
}

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectInvocation) {
  process.exitCode = await main()
}
