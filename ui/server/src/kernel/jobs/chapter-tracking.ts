import { padChapterNo } from '../projection/naming'
import { writeContinueWindow } from './write-continue-params'

export const TRACKING_STATE_REL = '追踪/_tracking-state.json'

export function trackingDeltaRel(chapterNo: number): string {
  return `追踪/逐章记录/第${padChapterNo(chapterNo)}章.md`
}

export function isTrackingDeltaPlaceholder(text: string): boolean {
  const trimmed = String(text || '').trim()
  if (!trimmed) return true
  return trimmed.includes('开放项：无') && trimmed.length < 80
}

export function trackingChapterNos(
  verb: string,
  args: { chapterNo?: number; fromChapterNo?: number; count?: number },
): number[] {
  if (verb === 'write_continue') {
    const from = Number(args.fromChapterNo)
    const count = Number(args.count)
    if (!Number.isInteger(from) || !Number.isInteger(count) || from < 1 || count < 1) return []
    return writeContinueWindow(from, count)
  }
  const no = Number(args.chapterNo)
  return Number.isInteger(no) && no >= 1 ? [no] : []
}

export function evaluateChapterTrackingGate(input: {
  verb: string
  artifacts: Array<{ rel_path: string; artifact_kind: string }>
  readText: (rel: string) => string
  chapterNos: number[]
}): { ok: true } | { ok: false; code: 'TRACKING_MISSING'; message: string } {
  const json = input.artifacts.find(a => a.rel_path === TRACKING_STATE_REL)
  const jsonText = json ? input.readText(TRACKING_STATE_REL).trim() : ''
  if (!json || !jsonText) {
    return { ok: false, code: 'TRACKING_MISSING', message: 'missing 追踪/_tracking-state.json' }
  }
  if (!input.chapterNos.length) {
    return { ok: false, code: 'TRACKING_MISSING', message: 'missing tracking chapter nos' }
  }
  for (const no of input.chapterNos) {
    const rel = trackingDeltaRel(no)
    const hit = input.artifacts.find(a => a.rel_path === rel)
    const text = hit ? input.readText(rel) : ''
    if (!hit || isTrackingDeltaPlaceholder(text)) {
      return { ok: false, code: 'TRACKING_MISSING', message: `missing ${rel}` }
    }
  }
  return { ok: true }
}
