import { formatAdmissionError } from '../../novel-writing-service/quality/admission-error'
import {
  WRITING_SKILL_HUMANIZE_VERSION,
  type WritingSkillHumanizeReport,
} from '../../novel-writing-service/service/writing-skill-humanize-methods'
import { revisionTextHash } from './revision-candidate-admission'

export type RevisionSkillCandidate = {
  text: string
  hash: string
  char_count: number
  applied_patches: unknown[]
  diagnostics: Record<string, unknown>
}

export function writingSkillHumanizeFailureReport(error: unknown): WritingSkillHumanizeReport {
  return {
    version: WRITING_SKILL_HUMANIZE_VERSION,
    fiction_humanizer_mode: 'polish',
    enabled_ids: [],
    enabled: true,
    skipped: false,
    accepted: false,
    changed: false,
    warnings: [],
    reason: 'writing_skill_humanize_failed',
    error: formatAdmissionError(error, 240),
    before_chars: 0,
    after_chars: 0,
    chunk_count: 0,
    passes: [],
  }
}

export function applyWritingSkillHumanizeToRevisionCandidate(input: {
  candidate: RevisionSkillCandidate
  result?: {
    final_text: string
    report: WritingSkillHumanizeReport
  } | null
  error?: unknown
}): {
  candidate: RevisionSkillCandidate
  report: WritingSkillHumanizeReport
} {
  if (input.error) {
    return {
      candidate: input.candidate,
      report: writingSkillHumanizeFailureReport(input.error),
    }
  }
  const report = input.result?.report
  const finalText = String(input.result?.final_text || '')
  const changed = Boolean(
    report?.changed
    ?? (report?.accepted && !report?.skipped && finalText && finalText !== input.candidate.text),
  )
  if (!report || !changed || !finalText) {
    return {
      candidate: input.candidate,
      report: report || writingSkillHumanizeFailureReport(new Error('writing skill humanize result missing')),
    }
  }
  return {
    candidate: {
      ...input.candidate,
      text: finalText,
      hash: revisionTextHash(finalText),
      char_count: finalText.replace(/\s/g, '').length,
      diagnostics: {
        ...input.candidate.diagnostics,
        writing_skill_humanize: true,
      },
    },
    report,
  }
}
