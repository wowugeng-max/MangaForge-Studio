import type {
  ChapterGenerationSourceState,
  ChapterGenerationSourceView,
} from '../../api/mcp'

const INVALID_VIEW = '章节来源响应无效'
const FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/
const MCP_FIELDS = ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model'] as const

type ChapterMcpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

class ChapterSourceViewValidationError extends Error {}

function rejectInvalidView(message: string): never {
  throw new ChapterSourceViewValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactOwnKeys(record: Record<string, unknown>, expected: readonly string[]) {
  const keys = Reflect.ownKeys(record)
  return keys.length === expected.length
    && keys.every(key => typeof key === 'string' && expected.includes(key))
    && expected.every(key => Object.prototype.hasOwnProperty.call(record, key))
}

function normalizeBinding(value: unknown): ChapterMcpBinding {
  if (!isRecord(value) || !hasExactOwnKeys(value, MCP_FIELDS)) {
    rejectInvalidView('章节 MCP 绑定无效')
  }
  const serverId = value.server_id
  const keyId = value.key_id
  const adapterId = value.adapter_id
  const agentId = value.agent_id
  const model = value.model
  if (typeof serverId !== 'string' || !serverId.trim()
    || !Number.isSafeInteger(keyId) || Number(keyId) <= 0
    || typeof adapterId !== 'string' || !adapterId.trim()
    || typeof agentId !== 'string' || !agentId.trim()
    || typeof model !== 'string' || model.trim().length > 160) {
    rejectInvalidView('章节 MCP 绑定无效')
  }
  return {
    server_id: serverId.trim(),
    key_id: Number(keyId),
    adapter_id: adapterId.trim(),
    agent_id: agentId.trim(),
    model: model.trim(),
  }
}

function bindingsEqual(left: ChapterMcpBinding, right: ChapterMcpBinding) {
  return MCP_FIELDS.every(field => left[field] === right[field])
}

export function normalizeChapterSourceView(value: unknown): ChapterGenerationSourceView {
  try {
    if (!isRecord(value)
      || !hasExactOwnKeys(value, ['ok', 'source', 'fingerprint', 'locked', 'display'])) {
      rejectInvalidView(INVALID_VIEW)
    }
    if (value.ok !== true || !isRecord(value.source)) rejectInvalidView(INVALID_VIEW)
    const source = value.source
    const sourceKeys = Object.prototype.hasOwnProperty.call(source, 'mcp')
      ? ['version', 'active', 'model', 'mcp']
      : ['version', 'active', 'model']
    if (!hasExactOwnKeys(source, sourceKeys)) rejectInvalidView(INVALID_VIEW)
    if (source.version !== 'chapter_generation_source_v1') {
      rejectInvalidView('章节来源响应版本无效')
    }
    if (source.active !== 'model' && source.active !== 'mcp') {
      rejectInvalidView('章节来源活动状态无效')
    }
    if (!isRecord(source.model)) rejectInvalidView('章节模型无效')
    const modelKeys = Object.prototype.hasOwnProperty.call(source.model, 'model_id') ? ['model_id'] : []
    if (!hasExactOwnKeys(source.model, modelKeys)) rejectInvalidView('章节模型无效')
    const modelId = source.model.model_id
    if (modelId !== undefined && (!Number.isSafeInteger(modelId) || Number(modelId) <= 0)) {
      rejectInvalidView('章节模型无效')
    }

    const hasMcp = Object.prototype.hasOwnProperty.call(source, 'mcp')
    if (source.active === 'mcp' && !hasMcp) rejectInvalidView('活动 MCP 绑定缺失')
    const mcp = hasMcp ? normalizeBinding(source.mcp) : undefined

    if (typeof value.fingerprint !== 'string') rejectInvalidView('章节来源指纹无效')
    const fingerprint = value.fingerprint.trim()
    if (!FINGERPRINT_PATTERN.test(fingerprint)) rejectInvalidView('章节来源指纹无效')

    if (!isRecord(value.display)
      || !hasExactOwnKeys(value.display, ['active', 'model_id', 'mcp'])) {
      rejectInvalidView('章节来源展示无效')
    }
    const display = value.display
    if (display.active !== source.active
      || display.model_id !== (modelId === undefined ? null : modelId)) {
      rejectInvalidView('章节来源展示无效')
    }
    if (!mcp && display.mcp !== null) rejectInvalidView('章节来源展示无效')
    if (mcp) {
      let displayMcp: ChapterMcpBinding
      try {
        displayMcp = normalizeBinding(display.mcp)
      } catch {
        rejectInvalidView('章节来源展示无效')
      }
      if (!bindingsEqual(mcp, displayMcp)) rejectInvalidView('章节来源展示无效')
    }

    return {
      ok: true,
      source: {
        version: 'chapter_generation_source_v1',
        active: source.active,
        model: modelId === undefined ? {} : { model_id: Number(modelId) },
        ...(mcp ? { mcp: { ...mcp } } : {}),
      },
      fingerprint,
      locked: value.locked === true,
      display: {
        active: source.active,
        model_id: modelId === undefined ? null : Number(modelId),
        mcp: mcp ? { ...mcp } : null,
      },
    }
  } catch (error) {
    if (error instanceof ChapterSourceViewValidationError) throw error
    throw new ChapterSourceViewValidationError(INVALID_VIEW)
  }
}

export class ChapterSourceAuthorityUnknownError extends Error {
  readonly code = 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN' as const

  constructor(
    readonly previous: ChapterGenerationSourceView,
    readonly mutationTransportError: unknown,
    readonly authorityReadError: unknown,
  ) {
    super('章节来源权威状态暂时无法确认')
    this.name = 'ChapterSourceAuthorityUnknownError'
  }
}

export class StaleChapterSourceOperationError extends Error {
  constructor() {
    super('章节来源操作已失效')
    this.name = 'StaleChapterSourceOperationError'
  }
}

export type ChapterSourceAuthorityState =
  | {
      source: ChapterGenerationSourceView | null
      authorityUnknown: false
      reconciliationRequired: false
      diagnostic: null
    }
  | {
      source: ChapterGenerationSourceView
      authorityUnknown: true
      reconciliationRequired: true
      diagnostic: ChapterSourceAuthorityUnknownError
    }

export function confirmedAuthorityState(
  source: ChapterGenerationSourceView | null,
): ChapterSourceAuthorityState {
  return {
    source,
    authorityUnknown: false,
    reconciliationRequired: false,
    diagnostic: null,
  }
}

export function authorityUnknownState(
  previous: ChapterGenerationSourceView,
  diagnostic: ChapterSourceAuthorityUnknownError,
): ChapterSourceAuthorityState {
  return {
    source: previous,
    authorityUnknown: true,
    reconciliationRequired: true,
    diagnostic,
  }
}

export type ChapterSourceOperationToken = Readonly<{
  projectId: number
  loadEpoch: number
  operationEpoch: number
}>

export function createChapterSourceOperationFence() {
  let projectId: number | null = null
  let loadEpoch: number | null = null
  let operationEpoch = 0
  let mounted = true
  const rejectStale = (): never => { throw new StaleChapterSourceOperationError() }

  return {
    enterProject(nextProjectId: number, nextLoadEpoch: number) {
      mounted = true
      projectId = nextProjectId
      loadEpoch = nextLoadEpoch
      operationEpoch += 1
    },
    begin(nextProjectId: number, nextLoadEpoch: number): ChapterSourceOperationToken {
      if (!mounted || projectId === null || loadEpoch === null
        || nextProjectId !== projectId || nextLoadEpoch !== loadEpoch) rejectStale()
      operationEpoch += 1
      return Object.freeze({ projectId, loadEpoch, operationEpoch })
    },
    assertCurrent(token: ChapterSourceOperationToken) {
      if (!mounted || token.projectId !== projectId || token.loadEpoch !== loadEpoch
        || token.operationEpoch !== operationEpoch) rejectStale()
    },
    unmount() {
      mounted = false
      operationEpoch += 1
    },
  }
}

export function isNoResponseTransportError(error: unknown) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) return false
  if (error instanceof StaleChapterSourceOperationError
    || error instanceof ChapterSourceAuthorityUnknownError) return false
  const candidate = error as { response?: unknown; status?: unknown }
  if (candidate.response !== undefined && candidate.response !== null) return false
  if (candidate.status !== undefined && candidate.status !== null) return false
  return true
}

export async function commitConfirmedSource(input: {
  current: ChapterGenerationSourceView
  request: () => Promise<ChapterGenerationSourceView>
  readAuthoritative: () => Promise<ChapterGenerationSourceView>
  assertCurrent: () => void
}) {
  let source: ChapterGenerationSourceView
  try {
    source = await input.request()
  } catch (mutationError) {
    input.assertCurrent()
    if (!isNoResponseTransportError(mutationError)) throw mutationError
    try {
      source = await input.readAuthoritative()
    } catch (authorityReadError) {
      input.assertCurrent()
      throw new ChapterSourceAuthorityUnknownError(
        input.current,
        mutationError,
        authorityReadError,
      )
    }
    input.assertCurrent()
    return { previous: input.current, source, reconciled: true as const }
  }
  input.assertCurrent()
  return { previous: input.current, source, reconciled: false as const }
}

export async function refreshChapterSourceAuthority(input: {
  current: ChapterSourceAuthorityState
  readAuthoritative: () => Promise<ChapterGenerationSourceView>
  assertCurrent: () => void
}) {
  let source: ChapterGenerationSourceView
  try {
    source = await input.readAuthoritative()
  } catch (readError) {
    input.assertCurrent()
    return { state: input.current, readError }
  }
  input.assertCurrent()
  return { state: confirmedAuthorityState(source), readError: null }
}

export function formatChapterSourceFailure(error: unknown) {
  if (error instanceof ChapterSourceAuthorityUnknownError
    || (isRecord(error) && error.code === 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN')) {
    return '章节来源权威状态暂时无法确认'
  }
  const response = isRecord(error) && isRecord(error.response) ? error.response : null
  const payload = response && isRecord(response.data) ? response.data : null
  const code = payload && typeof payload.error_code === 'string'
    ? payload.error_code
    : payload && typeof payload.code === 'string'
      ? payload.code
    : isRecord(error) && typeof error.code === 'string' ? error.code : ''
  if (code === 'GENERATION_SOURCE_BUSY') return '章节来源正在被生成任务使用，请等待当前任务结束后再修改'
  if (code === 'CHAPTER_MODEL_REQUIRED') return '请先选择有效的章节模型'
  if (code === 'MCP_BINDING_INVALID') {
    return payload && typeof payload.error === 'string' && payload.error
      ? payload.error
      : 'MCP 绑定无效，请检查配置'
  }
  if (payload && typeof payload.error === 'string') return payload.error
  if (payload && typeof payload.message === 'string') return payload.message
  if (error instanceof Error) return error.message
  return '章节来源操作失败'
}
