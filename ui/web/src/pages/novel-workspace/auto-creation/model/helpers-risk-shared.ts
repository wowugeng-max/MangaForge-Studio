import type { AnyRecord } from './types'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import { firstText, text } from './helpers-basics'

export function parsePayload(value: any, options: WorkspacePayloadParseOptions = {}) {
  return parseWorkspacePayload(value, options)
}

export function issueText(value: any) {
  if (typeof value === 'string') return text(value)
  return firstText(value?.description, value?.issue, value?.message, value?.suggestion, value?.title, value?.name)
}

export function issueTexts(values: any[], limit = 6) {
  return Array.from(new Set(values.map(issueText).filter(Boolean))).slice(0, limit)
}

export function recordTime(record: AnyRecord) {
  const timestamp = Date.parse(text(record?.created_at || record?.updated_at))
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function numberValue(value: any) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

export const BATCH_DELIVERY_QUALITY_THRESHOLD = 78

