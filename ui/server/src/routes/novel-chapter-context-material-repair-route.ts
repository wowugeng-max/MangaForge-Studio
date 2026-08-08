import { types } from 'node:util'
import { isChapterTaskId } from '../novel-writing-service/generation-source/types'

const MATERIAL_REPAIR_KEY_COUNT_LIMIT = 64
const MATERIAL_REPAIR_KEY_LENGTH_LIMIT = 160
const MATERIAL_REPAIR_AGGREGATE_ERROR_LIMIT = 16

function ownSafeDataValue(value: unknown, field: string) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || types.isProxy(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function plainArrayOwnDataValues(value: unknown, limit: number) {
  if (types.isProxy(value) || !Array.isArray(value)) return null
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
    if (!lengthDescriptor || !('value' in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) return null
    const values: unknown[] = []
    const count = Math.min(lengthDescriptor.value, limit)
    for (let index = 0; index < count; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (!descriptor || !('value' in descriptor)) continue
      values.push(descriptor.value)
    }
    return values
  } catch {
    return null
  }
}

export function normalizeMaterialRepairKeysFromBody(body: unknown) {
  const values = plainArrayOwnDataValues(
    ownSafeDataValue(body, 'repair_keys'),
    MATERIAL_REPAIR_KEY_COUNT_LIMIT,
  )
  if (!values) return undefined
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const key = value.trim().slice(0, MATERIAL_REPAIR_KEY_LENGTH_LIMIT)
    if (!key || seen.has(key)) continue
    seen.add(key)
    normalized.push(key)
  }
  return normalized
}

const MCP_MATERIAL_REPAIR_ERROR_STATUSES = new Map<string, number>([
  ['MCP_BINDING_INVALID', 400],
  ['MCP_BINDING_CHANGED', 409],
  ['MCP_REFERENCED_RECORD_CONFLICT', 409],
  ['MCP_AUTH_FAILED', 401],
  ['MCP_CONNECT_TIMEOUT', 504],
  ['MCP_CONNECTION_LOST', 503],
  ['MCP_SERVER_NOT_READY', 503],
  ['MCP_CAPABILITY_MISSING', 422],
  ['MCP_TOOL_ERROR', 502],
  ['MCP_DRIVE_SYNC_FAILED', 502],
  ['MCP_INPUT_TOO_LARGE', 413],
  ['MCP_AGENT_BUSY', 409],
  ['MCP_AGENT_QUARANTINED', 409],
  ['MCP_QUARANTINE_ACK_REQUIRED', 400],
  ['MCP_SEND_UNKNOWN', 502],
  ['MCP_SESSION_FAILED', 502],
  ['MCP_INPUT_REQUIRED', 422],
  ['MCP_GENERATION_TIMEOUT', 504],
  ['MCP_CANCELLED', 499],
  ['MCP_EMPTY_PROSE', 502],
  ['MCP_STAGE_CONTRACT_INVALID', 502],
  ['MCP_STORE_CORRUPT', 500],
  ['MCP_STORE_IO_FAILED', 500],
  ['MCP_RUNTIME_ERROR', 503],
])

const MATERIAL_REPAIR_ERROR_STATUSES = new Map<string, number>([
  ['GENERATION_SOURCE_BUSY', 409],
  ['GENERATION_SOURCE_CHANGED', 409],
  ['GENERATION_SOURCE_OVERRIDE_FORBIDDEN', 409],
  ['CHAPTER_MODEL_REQUIRED', 422],
  ['MATERIAL_REPAIR_SCOPE_NOT_FOUND', 404],
  ['MATERIAL_REPAIR_CONTEXT_CHANGED', 409],
  ['MATERIAL_REPAIR_KEY_UNSUPPORTED', 422],
  ['MATERIAL_REPAIR_KEY_NOT_FAILED', 422],
  ['MATERIAL_REPAIR_UNREPAIRABLE', 422],
  ['MATERIAL_REPAIR_INCOMPLETE', 502],
  ['MATERIAL_REPAIR_OBLIGATION_UNMET', 502],
  ['MATERIAL_REPAIR_UNRELATED_MUTATION', 502],
  ['MATERIAL_REPAIR_FORBIDDEN_FIELD', 502],
  ['MATERIAL_REPAIR_DUPLICATE', 502],
  ['MATERIAL_REPAIR_REFERENCE_INVALID', 502],
  ['MATERIAL_REPAIR_LIMIT_EXCEEDED', 502],
  ['MATERIAL_REPAIR_INVALID', 502],
  ['MATERIAL_REPAIR_SNAPSHOT_INVALID', 500],
  ['MATERIAL_REPAIR_SOURCE_INVALID', 409],
  ['MATERIAL_REPAIR_MODEL_PATH_REQUIRED', 409],
  ['MATERIAL_REPAIR_EXECUTION_IDENTITY_INVALID', 500],
  ['MATERIAL_REPAIR_CLOCK_INVALID', 500],
  ['MATERIAL_REPAIR_RESPONSE_UNSAFE', 500],
  ['MATERIAL_REPAIR_CONTEXT_VERSION_INVALID', 500],
  ['MATERIAL_REPAIR_IDENTITY_REQUIRED', 500],
  ['MATERIAL_REPAIR_CONFIRMATION_INVALID', 500],
  ['MATERIAL_REPAIR_PLAN_INVALID', 500],
  ['MATERIAL_REPAIR_TARGET_INVALID', 500],
  ['MATERIAL_REPAIR_RESULT_REFRESH_FAILED', 500],
])

function ownMaterialRepairErrorValue(error: unknown, field: string) {
  if (types.isProxy(error) || !types.isNativeError(error)) return undefined
  return ownSafeDataValue(error, field)
}

function publicMaterialRepairErrorMessage(code: string) {
  if (code === 'MCP_BINDING_INVALID') return 'MCP 来源配置无效'
  if (code === 'MCP_AUTH_FAILED') return 'MCP 认证失败'
  if (code === 'MCP_CAPABILITY_MISSING' || code === 'MCP_SERVER_NOT_READY') return 'MCP 服务未就绪'
  if (code.startsWith('MCP_')) return 'MCP 材料补齐失败'
  if (code === 'GENERATION_SOURCE_BUSY') return '章节生成来源正在使用中'
  if (code === 'GENERATION_SOURCE_CHANGED'
    || code === 'MATERIAL_REPAIR_CONTEXT_CHANGED'
    || code === 'MATERIAL_REPAIR_SOURCE_INVALID'
    || code === 'MATERIAL_REPAIR_MODEL_PATH_REQUIRED') {
    return '材料或来源已变化，请重新读取项目状态后重试'
  }
  if (code === 'MATERIAL_REPAIR_SCOPE_NOT_FOUND') return '项目或章节不存在'
  if (code === 'MATERIAL_REPAIR_KEY_UNSUPPORTED'
    || code === 'MATERIAL_REPAIR_KEY_NOT_FAILED'
    || code === 'MATERIAL_REPAIR_UNREPAIRABLE') {
    return '请求的材料补齐项无效'
  }
  if (code === 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED') return '材料补齐已提交，请重新读取项目状态'
  if (MATERIAL_REPAIR_ERROR_STATUSES.get(code) === 502) return 'MCP 返回的材料补齐结果无效'
  return '材料补齐失败'
}

function projectDirectMaterialRepairRouteError(error: unknown) {
  const codeValue = ownMaterialRepairErrorValue(error, 'code')
    || ownMaterialRepairErrorValue(error, 'error_code')
  if (typeof codeValue !== 'string') return null
  const code = codeValue.trim()
  const status = MCP_MATERIAL_REPAIR_ERROR_STATUSES.get(code) || MATERIAL_REPAIR_ERROR_STATUSES.get(code)
  if (!status) return null
  const committedRefresh = code === 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED'
  if (committedRefresh && ownMaterialRepairErrorValue(error, 'committed') !== true) return null
  const body: Record<string, unknown> = {
    error: publicMaterialRepairErrorMessage(code),
    error_code: code,
  }
  if (committedRefresh) {
    body.committed = true
    const taskId = ownMaterialRepairErrorValue(error, 'task_id')
    if (isChapterTaskId(taskId)) body.task_id = taskId
  }
  return { status, body }
}

export function projectMaterialRepairRouteError(error: unknown) {
  const direct = projectDirectMaterialRepairRouteError(error)
  if (direct) return direct
  if (types.isProxy(error) || !types.isNativeError(error) || !(error instanceof AggregateError)) return null
  const children = plainArrayOwnDataValues(
    ownMaterialRepairErrorValue(error, 'errors'),
    MATERIAL_REPAIR_AGGREGATE_ERROR_LIMIT,
  )
  if (!children) return null
  for (const child of children) {
    const projected = projectDirectMaterialRepairRouteError(child)
    if (projected?.body.error_code === 'MATERIAL_REPAIR_RESULT_REFRESH_FAILED'
      && projected.body.committed === true) return projected
  }
  return null
}
