export type WriteContinueParams = { from_chapter_no: number; count: number }

export function parseWriteContinueParams(raw: unknown):
  | { ok: true; value: WriteContinueParams }
  | { ok: false; code: 'VERB_PARAMS_INVALID'; message: string } {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
  const from = Number((obj as any)?.from_chapter_no)
  const countRaw = (obj as any)?.count
  const count = countRaw === undefined || countRaw === null || countRaw === '' ? 2 : Number(countRaw)
  if (!Number.isInteger(from) || from < 1) {
    return { ok: false, code: 'VERB_PARAMS_INVALID', message: 'from_chapter_no 必须是 ≥1 的整数' }
  }
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    return { ok: false, code: 'VERB_PARAMS_INVALID', message: 'count 必须是 1–3 的整数' }
  }
  return { ok: true, value: { from_chapter_no: from, count } }
}

export function writeContinueWindow(from: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => from + i)
}
