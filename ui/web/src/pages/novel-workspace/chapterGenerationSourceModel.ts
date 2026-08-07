import {
  chapterSourceHttpFailureDetails,
  isChapterSourceNoResponseFailure,
  normalizeChapterSourceApiView,
  type ChapterGenerationSourceView,
} from '../../api/mcp'

export function normalizeChapterSourceView(value: unknown): ChapterGenerationSourceView {
  return normalizeChapterSourceApiView(value)
}

export type ChapterInvocationGate = Readonly<{
  allowed: boolean
  active: 'model' | 'mcp' | null
  modelId: number | undefined
  sourceLabel: '章节来源' | 'MCP' | '大模型 API'
  message: string | undefined
}>

const UNKNOWN_CHAPTER_INVOCATION_GATE: ChapterInvocationGate = Object.freeze({
  allowed: false,
  active: null,
  modelId: undefined,
  sourceLabel: '章节来源',
  message: '章节来源权威状态暂时无法确认',
})

export function resolveChapterInvocationGate(
  authority: ChapterSourceAuthorityState,
  selectedModelId?: unknown,
): ChapterInvocationGate {
  try {
    if (!authority || typeof authority !== 'object'
      || authority.authorityUnknown !== false
      || authority.reconciliationRequired !== false
      || authority.diagnostic !== null
      || !authority.source) {
      return UNKNOWN_CHAPTER_INVOCATION_GATE
    }
    const source = normalizeChapterSourceView(authority.source)
    if (source.source.active === 'mcp') {
      return {
        allowed: true,
        active: 'mcp',
        modelId: undefined,
        sourceLabel: 'MCP',
        message: undefined,
      }
    }
    if (!Number.isSafeInteger(selectedModelId) || Number(selectedModelId) <= 0) {
      return {
        allowed: false,
        active: 'model',
        modelId: undefined,
        sourceLabel: '大模型 API',
        message: '请先选择写作模型',
      }
    }
    return {
      allowed: true,
      active: 'model',
      modelId: Number(selectedModelId),
      sourceLabel: '大模型 API',
      message: undefined,
    }
  } catch {
    return UNKNOWN_CHAPTER_INVOCATION_GATE
  }
}

const chapterSourceAuthorityUnknownErrors = new WeakSet<object>()
const staleChapterSourceOperationErrors = new WeakSet<object>()
const chapterSourceAuthorityDiagnostics = new WeakMap<object, {
  mutationTransportError: unknown
  authorityReadError: unknown
}>()

function hasObjectIdentity(value: unknown): value is object {
  return ((typeof value === 'object' && value !== null) || typeof value === 'function')
}

export class ChapterSourceAuthorityUnknownError extends Error {
  readonly code = 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN' as const

  constructor(
    readonly previous: ChapterGenerationSourceView,
    mutationTransportError: unknown,
    authorityReadError: unknown,
  ) {
    super('章节来源权威状态暂时无法确认')
    this.name = 'ChapterSourceAuthorityUnknownError'
    chapterSourceAuthorityUnknownErrors.add(this)
    chapterSourceAuthorityDiagnostics.set(this, { mutationTransportError, authorityReadError })
  }

  get mutationTransportError(): unknown {
    return chapterSourceAuthorityDiagnostics.get(this)?.mutationTransportError
  }

  get authorityReadError(): unknown {
    return chapterSourceAuthorityDiagnostics.get(this)?.authorityReadError
  }
}

export class StaleChapterSourceOperationError extends Error {
  constructor() {
    super('章节来源操作已失效')
    this.name = 'StaleChapterSourceOperationError'
    staleChapterSourceOperationErrors.add(this)
  }
}

export function isChapterSourceAuthorityUnknownError(value: unknown) {
  return hasObjectIdentity(value) && chapterSourceAuthorityUnknownErrors.has(value)
}

export function isStaleChapterSourceOperationError(value: unknown) {
  return hasObjectIdentity(value) && staleChapterSourceOperationErrors.has(value)
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

export const CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE = '章节来源已变化，请重试'
export const CHAPTER_SOURCE_MUTATION_PENDING_MESSAGE = '章节来源正在切换，请稍后重试'

export type ChapterSourcePendingState = Readonly<{
  projectId: number
  pending: boolean
  token: ChapterSourceOperationToken | null
}>

export function chapterSourcePendingIsCurrent(
  state: ChapterSourcePendingState,
  projectId: number,
  assertCurrent: (token: ChapterSourceOperationToken) => void,
) {
  if (!state.pending || !state.token || state.projectId !== projectId) return false
  try {
    assertCurrent(state.token)
    return true
  } catch (error) {
    if (isStaleChapterSourceOperationError(error)) return false
    throw error
  }
}

export type ChapterInvocationFence = Readonly<{
  token: ChapterSourceOperationToken
  gate: ChapterInvocationGate
  sourceFingerprint: string
}>

export type ChapterInvocationFenceDependencies = {
  getAuthority: () => ChapterSourceAuthorityState
  selectedModelId?: unknown
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
}

function chapterInvocationAuthorityMatches(
  fence: ChapterInvocationFence,
  input: Pick<ChapterInvocationFenceDependencies, 'getAuthority' | 'selectedModelId'>,
) {
  const authority = input.getAuthority()
  const gate = resolveChapterInvocationGate(authority, input.selectedModelId)
  return gate.allowed
    && gate.active === fence.gate.active
    && gate.modelId === fence.gate.modelId
    && authority.source?.fingerprint === fence.sourceFingerprint
}

export function beginChapterInvocationFence(
  input: ChapterInvocationFenceDependencies,
): { gate: ChapterInvocationGate; fence: ChapterInvocationFence | null } {
  const authority = input.getAuthority()
  const gate = resolveChapterInvocationGate(authority, input.selectedModelId)
  if (!gate.allowed || !authority.source) return { gate, fence: null }
  const fence = Object.freeze({
    token: input.beginSourceOperation(),
    gate,
    sourceFingerprint: authority.source.fingerprint,
  })
  assertChapterInvocationFenceCurrent(fence, input)
  return { gate, fence }
}

export function assertChapterInvocationFenceCurrent(
  fence: ChapterInvocationFence,
  input: Pick<ChapterInvocationFenceDependencies, 'getAuthority' | 'selectedModelId' | 'assertSourceOperationCurrent'>,
) {
  input.assertSourceOperationCurrent(fence.token)
  assertChapterInvocationAuthorityCurrent(fence, input)
}

export function assertChapterInvocationAuthorityCurrent(
  fence: ChapterInvocationFence,
  input: Pick<ChapterInvocationFenceDependencies, 'getAuthority' | 'selectedModelId'>,
) {
  if (!chapterInvocationAuthorityMatches(fence, input)) throw new StaleChapterSourceOperationError()
}

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
  return isChapterSourceNoResponseFailure(error)
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
  if (isChapterSourceAuthorityUnknownError(error)) {
    return '章节来源权威状态暂时无法确认'
  }
  const failure = chapterSourceHttpFailureDetails(error)
  if (!failure) return '章节来源操作失败'
  const code = failure.code
  if (code === 'GENERATION_SOURCE_BUSY') return '章节来源正在被生成任务使用，请等待当前任务结束后再修改'
  if (code === 'CHAPTER_MODEL_REQUIRED') return '请先选择有效的章节模型'
  if (code === 'MCP_BINDING_INVALID') return 'MCP 绑定无效，请检查配置'
  return '章节来源操作失败'
}
