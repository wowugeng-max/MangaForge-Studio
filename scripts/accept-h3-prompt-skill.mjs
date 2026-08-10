#!/usr/bin/env node

import { pathToFileURL } from 'node:url'

const DEFAULT_API_BASE = 'http://127.0.0.1:8787/api'
const H3_PACK_URL = 'https://github.com/MiniMax-AI/MiniMax-H3'
const H3_SKILL_NAME = 'h3-prompt-writing'
const EXPECTED_REFERENCES = ['references/base-en.txt', 'references/ref-en.txt']
const REQUEST_TIMEOUT_MS = 15_000
const LONG_REQUEST_TIMEOUT_MS = 660_000
const MAX_API_RESPONSE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_ASSET_IDS = 9

export class H3AcceptanceError extends Error {
  constructor(code, message) {
    super(redactSensitive(message).slice(0, 600))
    this.name = 'H3AcceptanceError'
    this.code = code
  }
}

function sensitiveCredentialKey(value) {
  let normalized = String(value || '')
  try { normalized = decodeURIComponent(normalized) } catch { /* keep undecodable input for matching */ }
  return /(?:^|[_-])(?:api[_-]?key|token|access[_-]?token|secret|password|auth|authorization|credential|signature|sig)$/i.test(normalized)
}

function redactUrlCredentials(value) {
  return value.replace(/\bhttps?:\/\/[^\s<>"']+/gi, candidate => {
    try {
      const url = new URL(candidate)
      if (url.username || url.password) {
        url.username = ''
        url.password = ''
      }
      for (const key of new Set(url.searchParams.keys())) {
        if (sensitiveCredentialKey(key)) url.searchParams.set(key, '[REDACTED]')
      }
      return url.toString()
    } catch {
      return candidate.replace(/^(https?:\/\/)[^/@\s]+@/i, '$1')
    }
  })
}

export function redactSensitive(value) {
  return redactUrlCredentials(String(value ?? ''))
    .replace(/((?:api[_-]?key|token|access[_-]?token|secret|password|auth|authorization|credential|signature|sig)"?\s*:\s*")[^"]*/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|token|access[_-]?token|secret|password|auth|authorization|credential|signature|sig)'?\s*:\s*')[^']*/gi, '$1[REDACTED]')
    .replace(/\bAuthorization\s*:\s*[^\r\n]+/gi, 'Authorization: [REDACTED]')
    .replace(/((?:^|[\s;,])(?:[A-Za-z0-9]+[_-])*(?:api[_-]?key|token|access[_-]?token|secret|password|auth|authorization|credential|signature|sig)\s*:\s*)[^\r\n]*/gim, '$1[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:^|[?&\s;,])(?:[A-Za-z0-9]+[_-])*(?:api[_-]?key|token|access[_-]?token|secret|password|auth|authorization|credential|signature|sig)\s*=\s*)[^&#\s,;]+/gi, '$1[REDACTED]')
    .replace(/\b(?:sk|rk)-[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_KEY]')
}

function configurationError(message) {
  return new H3AcceptanceError('H3_E2E_CONFIGURATION', message)
}

export function normalizeLocalApiBase(value = DEFAULT_API_BASE) {
  let url
  try { url = new URL(String(value || DEFAULT_API_BASE)) } catch { throw configurationError('MANGAFORGE_H3_API_BASE must be a valid loopback API URL') }
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
  if (!['http:', 'https:'].includes(url.protocol) || !loopbackHosts.has(url.hostname)) {
    throw configurationError('MANGAFORGE_H3_API_BASE must use HTTP(S) on a loopback host')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw configurationError('MANGAFORGE_H3_API_BASE must not contain credentials, query parameters, or fragments')
  }
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  if (pathname !== '/api') throw configurationError('MANGAFORGE_H3_API_BASE must end with /api')
  url.pathname = '/api'
  return url.toString().replace(/\/$/, '')
}

function positiveAssetId(value) {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) throw configurationError('MANGAFORGE_H3_IMAGE_ASSET_IDS entries must be positive integers')
  const id = Number(normalized)
  if (!Number.isSafeInteger(id) || id <= 0) throw configurationError('MANGAFORGE_H3_IMAGE_ASSET_IDS entries must be positive integers')
  return id
}

function configuredImageAssetIds(env) {
  const plural = env.MANGAFORGE_H3_IMAGE_ASSET_IDS
  const raw = plural !== undefined ? plural : env.MANGAFORGE_H3_IMAGE_ASSET_ID
  const entries = String(raw ?? '').split(',').map(entry => entry.trim())
  if (entries.length > MAX_IMAGE_ASSET_IDS) {
    throw configurationError(`MANGAFORGE_H3_IMAGE_ASSET_IDS accepts at most ${MAX_IMAGE_ASSET_IDS} image asset ids`)
  }
  return entries.map(positiveAssetId)
}

export function localImageAssetUrl(asset, expectedId) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) throw configurationError('The configured local image asset was not returned by the API')
  if (Number(asset.id) !== Number(expectedId)) throw configurationError('The configured local image asset id did not match the API response')
  if (String(asset.type || '').toLowerCase() !== 'image') throw configurationError('MANGAFORGE_H3_IMAGE_ASSET_ID must identify an image asset')
  const data = asset.data && typeof asset.data === 'object' && !Array.isArray(asset.data) ? asset.data : {}
  const raw = String(data.file_path ?? data.filePath ?? asset.file_path ?? asset.filePath ?? '').trim()
  if (!raw) throw configurationError('The configured image asset has no local file path')
  if (/[\u0000-\u001f\u007f]/.test(raw)) throw configurationError('The configured image asset path contains invalid characters')
  if (/^\/api\/(?:assets\/media|files)\//.test(raw)) {
    const parsed = new URL(raw, DEFAULT_API_BASE)
    if (parsed.search || parsed.hash || !/^\/api\/(?:assets\/media|files)\//.test(parsed.pathname)) {
      throw configurationError('The configured image asset URL is not a safe local media URL')
    }
    return `${parsed.pathname}`
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) || raw.startsWith('//')) {
    throw configurationError('The configured image asset must use a local workspace path, not an external or file URL')
  }
  if (raw.split(/[\\/]+/).includes('..')) throw configurationError('The configured image asset path must not contain traversal segments')
  return `/api/assets/media/${encodeURIComponent(raw)}`
}

function apiEndpoint(baseUrl, path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function fetchWithTimeout(fetchImpl, url, init = {}, timeoutMs = REQUEST_TIMEOUT_MS, consume = response => response) {
  const controller = new AbortController()
  let timeout
  const timedOut = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort()
      reject(new H3AcceptanceError('H3_E2E_NETWORK', `Local MangaForge API request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })
  try {
    const operation = Promise.resolve(fetchImpl(url, { ...init, redirect: 'manual', signal: controller.signal }))
      .then(response => consume(response))
    return await Promise.race([operation, timedOut])
  } catch (error) {
    if (error instanceof H3AcceptanceError) throw error
    const detail = error instanceof Error ? error.message : String(error)
    throw new H3AcceptanceError('H3_E2E_NETWORK', `Local MangaForge API network error: ${detail}`)
  } finally {
    clearTimeout(timeout)
  }
}

async function readBoundedText(response) {
  const declaredBytes = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_API_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined)
    throw new H3AcceptanceError('H3_E2E_NETWORK', `Local MangaForge API response exceeded ${MAX_API_RESPONSE_BYTES} bytes`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_API_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new H3AcceptanceError('H3_E2E_NETWORK', `Local MangaForge API response exceeded ${MAX_API_RESPONSE_BYTES} bytes`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

async function requestJson(fetchImpl, baseUrl, path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const { response, text } = await fetchWithTimeout(fetchImpl, apiEndpoint(baseUrl, path), {
    method,
    ...(options.body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    }),
  }, options.timeoutMs, async response => ({ response, text: await readBoundedText(response) }))
  let body = null
  try { body = text ? JSON.parse(text) : null } catch {
    throw new H3AcceptanceError('H3_E2E_API', `${method} ${path} returned invalid JSON (HTTP ${response.status})`)
  }
  if (!response.ok) {
    const upstreamCode = body && typeof body === 'object' && typeof body.error_code === 'string' ? body.error_code : 'API_ERROR'
    const detail = body && typeof body === 'object' ? body.detail ?? body.error : undefined
    throw new H3AcceptanceError('H3_E2E_API', `${method} ${path} failed (HTTP ${response.status}, ${upstreamCode}): ${detail || 'request failed'}`)
  }
  return body
}

async function preflightLocalImage(fetchImpl, baseUrl, localUrl) {
  const origin = new URL(baseUrl).origin
  await fetchWithTimeout(fetchImpl, new URL(localUrl, origin).toString(), {}, REQUEST_TIMEOUT_MS, async response => {
    try {
      if (!response.ok) throw new H3AcceptanceError('H3_E2E_API', `Local image asset preflight failed (HTTP ${response.status})`)
      const contentType = String(response.headers.get('content-type') || '').toLowerCase()
      if (!contentType.startsWith('image/')) throw configurationError('MANGAFORGE_H3_IMAGE_ASSET_ID did not resolve to image media')
    } finally {
      await response.body?.cancel().catch(() => undefined)
    }
  })
}

function assertLockedRevision(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', 'Installed MiniMax H3 Pack revision is not a locked 40-character commit SHA')
  }
  return value
}

function assertReferences(value) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', 'Compiled H3 preview did not return a references_used string array')
  }
  for (const reference of EXPECTED_REFERENCES) {
    if (!value.includes(reference)) throw new H3AcceptanceError('H3_E2E_ASSERTION', `Compiled H3 preview did not use ${reference}`)
  }
  return [...EXPECTED_REFERENCES]
}

function imageAcceptanceAlias(assets) {
  return assets.length === 1 ? 'I2VA' : assets.length === 2 ? 'FL2VA' : 'Ref2VA'
}

function imageAcceptancePrompt(assets) {
  const alias = imageAcceptanceAlias(assets)
  const roleSummary = assets.map(asset => `reference ${asset.reference_index} (${asset.reference_role})`).join(', ')
  return `${alias}: Use every supplied image reference in this exact order: ${roleSummary}. Create a coherent 8-second cinematic action that visibly incorporates every reference.`
}

function expectedCanonicalReferenceBindings(assets) {
  return assets.map((asset, index) => ({
    reference_index: asset.reference_index,
    reference_id: `reference-${index + 1}`,
    reference_role: asset.reference_role,
    type: asset.type,
    url: asset.url,
    source_asset_ids: [...asset.source_asset_ids],
  }))
}

function assertReferenceAudit(result, expectedHint, expectedBindings) {
  if (result.reference_mode_hint !== expectedHint) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', `image_to_video preview returned mismatched reference_mode_hint; expected ${expectedHint}`)
  }
  const actualBindings = result.reference_bindings
  if (!Array.isArray(actualBindings) || actualBindings.length !== expectedBindings.length) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', 'image_to_video preview returned incomplete reference_bindings')
  }
  for (let index = 0; index < expectedBindings.length; index += 1) {
    const actual = actualBindings[index]
    const expected = expectedBindings[index]
    const lineageMatches = Array.isArray(actual?.source_asset_ids)
      && actual.source_asset_ids.length === expected.source_asset_ids.length
      && actual.source_asset_ids.every((id, lineageIndex) => id === expected.source_asset_ids[lineageIndex])
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)
      || actual.reference_index !== expected.reference_index
      || actual.reference_id !== expected.reference_id
      || actual.reference_role !== expected.reference_role
      || actual.type !== expected.type
      || actual.url !== expected.url
      || !lineageMatches) {
      throw new H3AcceptanceError('H3_E2E_ASSERTION', `image_to_video preview returned mismatched reference binding ${index + 1}`)
    }
  }
}

function assertPreview(preview, expectedMode, revision, expectedReferenceAudit) {
  const result = preview && typeof preview === 'object' ? preview.result : undefined
  if (!result || typeof result !== 'object' || typeof result.prompt !== 'string' || !result.prompt.trim()) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', `${expectedMode} preview returned an empty prompt`)
  }
  if (result.skill_name !== H3_SKILL_NAME || result.skill_version !== revision || result.mode !== expectedMode) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', `${expectedMode} preview returned mismatched Skill identity, revision, or mode`)
  }
  if (expectedReferenceAudit) {
    assertReferenceAudit(result, expectedReferenceAudit.referenceModeHint, expectedReferenceAudit.referenceBindings)
  }
  const hash = preview.cache_key
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/i.test(hash)) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', `${expectedMode} preview returned an invalid deterministic hash`)
  }
  return { hash, references: assertReferences(result.references_used) }
}

async function preflight({ env, fetchImpl, baseUrl }) {
  const imageAssetIds = configuredImageAssetIds(env)
  await requestJson(fetchImpl, baseUrl, '/status')
  const settings = await requestJson(fetchImpl, baseUrl, '/skills/settings')
  const compilerModelId = Number(settings?.skill_compiler_model_id)
  if (!Number.isSafeInteger(compilerModelId) || compilerModelId <= 0) {
    throw configurationError('Configure a canvas Skill compiler model before running MiniMax H3 acceptance')
  }
  const models = await requestJson(fetchImpl, baseUrl, '/models')
  const model = Array.isArray(models) ? models.find(item => Number(item?.id) === compilerModelId) : undefined
  if (!model) throw configurationError('The configured canvas Skill compiler model is not available from the local API')
  if (model.capabilities?.chat !== true || model.capabilities?.vision !== true) {
    throw configurationError('The configured canvas Skill compiler model must support chat and vision for T2V/I2V acceptance')
  }
  const images = []
  for (const imageAssetId of imageAssetIds) {
    const asset = await requestJson(fetchImpl, baseUrl, `/assets/${imageAssetId}`)
    images.push({ imageAssetId, imageUrl: localImageAssetUrl(asset, imageAssetId) })
  }
  for (const image of images) await preflightLocalImage(fetchImpl, baseUrl, image.imageUrl)
  return { compilerModelId, images }
}

export async function runH3Acceptance({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = message => console.log(message),
} = {}) {
  if (env.MANGAFORGE_H3_E2E !== '1') {
    log('MiniMax H3 acceptance skipped: set MANGAFORGE_H3_E2E=1 to enable the live API check.')
    return { skipped: true }
  }
  if (typeof fetchImpl !== 'function') throw configurationError('This runtime does not provide fetch')
  const baseUrl = normalizeLocalApiBase(env.MANGAFORGE_H3_API_BASE || DEFAULT_API_BASE)
  const { compilerModelId, images } = await preflight({ env, fetchImpl, baseUrl })

  const installed = await requestJson(fetchImpl, baseUrl, '/skills/packs', {
    method: 'POST',
    body: { url: H3_PACK_URL },
    timeoutMs: LONG_REQUEST_TIMEOUT_MS,
  })
  const revision = assertLockedRevision(installed?.record?.revision)
  const packId = String(installed?.record?.id || '')
  if (!packId) throw new H3AcceptanceError('H3_E2E_ASSERTION', 'MiniMax H3 installation did not return a Pack id')

  const listed = await requestJson(fetchImpl, baseUrl, '/skills')
  const skill = Array.isArray(listed?.skills)
    ? listed.skills.find(item => item?.packId === packId && item?.name === H3_SKILL_NAME && item?.revision === revision)
    : undefined
  if (!skill || skill.compatibility !== 'prompt_ready'
    || !Array.isArray(skill.mediaModes)
    || !skill.mediaModes.includes('text_to_video')
    || !skill.mediaModes.includes('image_to_video')) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', 'Installed MiniMax H3 Pack did not list h3-prompt-writing as prompt-ready for T2V and I2V')
  }

  const common = {
    pack_id: packId,
    skill_name: H3_SKILL_NAME,
    compiler_model_id: compilerModelId,
    node_params: { aspect_ratio: '16:9' },
  }
  const textBody = {
    ...common,
    prompt: 'T2VA: Create an 8-second cinematic bakery opening with synchronized ambience and music.',
    mode: 'text_to_video',
    assets: [],
  }
  const imageAssets = images.map(({ imageAssetId, imageUrl }, index) => ({
    type: 'image',
    url: imageUrl,
    source_asset_ids: [imageAssetId],
    reference_index: index + 1,
    reference_role: index === 0 ? 'first_frame' : index === images.length - 1 ? 'last_frame' : 'character',
  }))
  const imageBody = {
    ...common,
    prompt: imageAcceptancePrompt(imageAssets),
    mode: 'image_to_video',
    assets: imageAssets,
  }
  const imageReferenceAudit = {
    referenceModeHint: imageAcceptanceAlias(imageAssets),
    referenceBindings: expectedCanonicalReferenceBindings(imageAssets),
  }
  const textPreview = assertPreview(
    await requestJson(fetchImpl, baseUrl, '/skills/compile-preview', { method: 'POST', body: textBody, timeoutMs: LONG_REQUEST_TIMEOUT_MS }),
    'text_to_video',
    revision,
  )
  const imagePreview = assertPreview(
    await requestJson(fetchImpl, baseUrl, '/skills/compile-preview', { method: 'POST', body: imageBody, timeoutMs: LONG_REQUEST_TIMEOUT_MS }),
    'image_to_video',
    revision,
    imageReferenceAudit,
  )
  const repeatedImagePreview = assertPreview(
    await requestJson(fetchImpl, baseUrl, '/skills/compile-preview', { method: 'POST', body: imageBody, timeoutMs: LONG_REQUEST_TIMEOUT_MS }),
    'image_to_video',
    revision,
    imageReferenceAudit,
  )
  if (imagePreview.hash !== repeatedImagePreview.hash) {
    throw new H3AcceptanceError('H3_E2E_ASSERTION', 'Repeated I2V compile-preview returned a different deterministic hash')
  }

  const references = Array.from(new Set([...textPreview.references, ...imagePreview.references])).sort()
  log(`MiniMax H3 revision: ${revision}`)
  log(`MiniMax H3 references: ${references.join(', ')}`)
  log('MiniMax H3 acceptance: PASS')
  return {
    skipped: false,
    revision,
    references,
    hashes: { text_to_video: textPreview.hash, image_to_video: imagePreview.hash },
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (invokedPath === import.meta.url) {
  runH3Acceptance().catch(error => {
    const typed = error instanceof H3AcceptanceError
      ? error
      : new H3AcceptanceError('H3_E2E_FAILURE', error instanceof Error ? error.message : String(error))
    console.error(`${typed.code}: ${redactSensitive(typed.message)}`)
    process.exitCode = 1
  })
}
