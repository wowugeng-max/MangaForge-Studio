import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizeStoryUnitSyncBeat(key: string, label: string, text: any, source = 'story_unit', threshold = 58) {
  const normalizedText = compactText(text, 180)
  return normalizedText ? { key, label, text: normalizedText, source, threshold } : null
}

export function storyUnitSyncBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const delivered = match.score >= Number(beat.threshold || 58)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}

export function storyUnitForbiddenTouched(beat: any, chapterText: string) {
  const match = anchorMatchScore(String(beat.text || '').replace(/^不得|禁止|不可/, ''), chapterText)
  const touched = match.score >= 42
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    touched,
  }
}
