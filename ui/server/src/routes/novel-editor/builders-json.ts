import { safeJsonStringify } from '../novel-route-utils'

export function editorJson(value: any, maxChars = 0) {
  return safeJsonStringify(value, 2, maxChars)
}
