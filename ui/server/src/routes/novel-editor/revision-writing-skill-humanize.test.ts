import { describe, expect, test } from 'bun:test'
import { revisionTextHash } from './revision-candidate-admission'
import {
  applyWritingSkillHumanizeToRevisionCandidate,
  writingSkillHumanizeFailureReport,
} from './revision-writing-skill-humanize'

const admitted = '修订正文推进。'.repeat(40)
const skilled = '去味修订正文。'.repeat(40)

function candidate(text: string) {
  return {
    text,
    hash: revisionTextHash(text),
    char_count: text.replace(/\s/g, '').length,
    applied_patches: [{ type: 'full_text' }],
    diagnostics: { source_char_count: 100 },
  }
}

describe('applyWritingSkillHumanizeToRevisionCandidate', () => {
  test('replaces the admitted candidate when a v2 report says the text changed', () => {
    const applied = applyWritingSkillHumanizeToRevisionCandidate({
      candidate: candidate(admitted),
      result: {
        final_text: skilled,
        report: {
          version: 'writing_skill_humanize_v2',
          fiction_humanizer_mode: 'polish',
          enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
          enabled: true,
          skipped: false,
          accepted: true,
          changed: true,
          warnings: [],
          before_chars: admitted.replace(/\s/g, '').length,
          after_chars: skilled.replace(/\s/g, '').length,
          chunk_count: 1,
          passes: [],
        },
      },
    })

    expect(applied.candidate).toMatchObject({
      text: skilled,
      hash: revisionTextHash(skilled),
      char_count: skilled.replace(/\s/g, '').length,
      applied_patches: [{ type: 'full_text' }],
    })
    expect(applied.candidate.diagnostics).toMatchObject({
      source_char_count: 100,
      writing_skill_humanize: true,
    })
    expect(applied.report).toMatchObject({
      accepted: true,
      skipped: false,
      enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
    })
  })

  test('keeps the admitted candidate when a v2 report says the text did not change', () => {
    const original = candidate(admitted)
    const applied = applyWritingSkillHumanizeToRevisionCandidate({
      candidate: original,
      result: {
        final_text: skilled,
        report: {
          version: 'writing_skill_humanize_v2',
          fiction_humanizer_mode: 'polish',
          enabled_ids: ['fiction-humanizer-zh'],
          enabled: true,
          skipped: false,
          accepted: true,
          changed: false,
          warnings: [],
          before_chars: admitted.replace(/\s/g, '').length,
          after_chars: admitted.replace(/\s/g, '').length,
          chunk_count: 1,
          passes: [],
        },
      },
    })

    expect(applied.candidate).toEqual(original)
    expect(applied.report).toMatchObject({ accepted: true, changed: false })
  })

  test('keeps the admitted candidate when the skill pass is skipped, rejected, or throws', () => {
    const original = candidate(admitted)
    const skipped = applyWritingSkillHumanizeToRevisionCandidate({
      candidate: original,
      result: {
        final_text: admitted,
        report: {
          version: 'writing_skill_humanize_v1',
          enabled_ids: [],
          enabled: false,
          skipped: true,
          accepted: true,
          reason: 'all_skills_disabled',
          before_chars: 10,
          after_chars: 10,
          chunk_count: 0,
        },
      },
    })
    expect(skipped.candidate).toEqual(original)
    expect(skipped.report).toMatchObject({ skipped: true, reason: 'all_skills_disabled' })

    const rejected = applyWritingSkillHumanizeToRevisionCandidate({
      candidate: original,
      result: {
        final_text: '太短。',
        report: {
          version: 'writing_skill_humanize_v1',
          enabled_ids: ['fiction-humanizer-zh'],
          enabled: true,
          skipped: false,
          accepted: false,
          reason: 'humanize_length',
          before_chars: 10,
          after_chars: 10,
          chunk_count: 1,
        },
      },
    })
    expect(rejected.candidate).toEqual(original)
    expect(rejected.report).toMatchObject({ accepted: false, reason: 'humanize_length' })

    const failed = applyWritingSkillHumanizeToRevisionCandidate({
      candidate: original,
      error: new Error(`skill unavailable ${'x'.repeat(300)}`),
    })
    expect(failed.candidate).toEqual(original)
    expect(failed.report).toMatchObject({
      accepted: false,
      skipped: false,
      reason: 'writing_skill_humanize_failed',
    })
    expect(String(failed.report.error || '')).toHaveLength(240)
  })
})

describe('writingSkillHumanizeFailureReport', () => {
  test('bounds the error text', () => {
    const report = writingSkillHumanizeFailureReport(new Error('boom'))
    expect(report).toMatchObject({
      version: 'writing_skill_humanize_v2',
      fiction_humanizer_mode: 'polish',
      accepted: false,
      skipped: false,
      changed: false,
      warnings: [],
      passes: [],
      reason: 'writing_skill_humanize_failed',
      error: 'boom',
    })
  })
})
