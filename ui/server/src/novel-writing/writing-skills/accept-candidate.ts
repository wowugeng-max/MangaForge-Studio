import { stripHumanizeChatWrapper } from '../humanize-dual-pass'
import { selectContinuitySafeProseCandidate } from '../prose-candidate-continuity'
import { countProseChars, type ChapterWordTarget } from '../word-target'
import { resolveWritingSkillLengthBounds } from './length-bounds'
import type { WritingSkillId } from './types'

const AUTHOR_SOUL_MARKERS = ['我真的不知道', '我一直在想', '让我困扰的是', '我不知道该怎么看待', '作为作者']

function hasChatShell(text: string): boolean {
  const raw = String(text || '').trim()
  if (!raw) return false
  return stripHumanizeChatWrapper(raw).trim() !== raw
}

export function hasAuthorSoulLeak(sourceText: string, candidateText: string): boolean {
  const source = String(sourceText || '')
  const candidate = String(candidateText || '')
  return AUTHOR_SOUL_MARKERS.some(marker => candidate.includes(marker) && !source.includes(marker))
}

export function acceptWritingSkillCandidate(input: {
  sourceText: string
  candidateText: string
  enabledIds: WritingSkillId[]
  wordTarget?: ChapterWordTarget | null
  contextPackage?: any
}): { text: string; accepted: boolean; reason: string } {
  const source = String(input.sourceText || '')
  const rawCandidate = String(input.candidateText || '')
  if (hasChatShell(rawCandidate) && !hasChatShell(source)) {
    return { text: source, accepted: false, reason: 'writing_skill_chat_shell' }
  }
  const candidate = stripHumanizeChatWrapper(rawCandidate).trim()
  if (!candidate) {
    return { text: source, accepted: false, reason: 'writing_skill_empty_candidate' }
  }
  if (input.enabledIds.includes('humanizer-zh') && hasAuthorSoulLeak(source, candidate)) {
    return { text: source, accepted: false, reason: 'writing_skill_author_soul' }
  }
  const chars = countProseChars(candidate)
  const bounds = resolveWritingSkillLengthBounds({
    sourceChars: countProseChars(source),
    wordTarget: input.wordTarget
      || input.contextPackage?.chapter_target?.word_target
      || input.contextPackage?.chapterTarget?.word_target
      || null,
  })
  if (chars < bounds.min || chars > bounds.max) {
    return { text: source, accepted: false, reason: 'writing_skill_length' }
  }
  if (input.contextPackage) {
    const continuity = selectContinuitySafeProseCandidate(
      source,
      candidate,
      input.contextPackage,
      { candidate_stage: 'writing_skill_humanize' },
    )
    if (!continuity.accepted) {
      return {
        text: source,
        accepted: false,
        reason: continuity.warning?.code || 'writing_skill_continuity',
      }
    }
  }
  return { text: candidate, accepted: true, reason: '' }
}
