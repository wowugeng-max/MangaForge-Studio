import { describe, expect, test } from 'bun:test'
import {
  classifyProseAdmission,
  markBlockedInvalidError,
  validateMinimalChapterProse,
  type ProseAdmissionHardFailure,
  type ProseAdmissionWarning,
} from './prose-admission-policy'

describe('prose admission policy', () => {
  test('accepts prose when no curated evidence is supplied', () => {
    expect(classifyProseAdmission({})).toEqual({
      status: 'accepted',
      hard_failures: [],
      warnings: [],
    })
  })

  test('accepts with subjective, word-target, and story-state warnings', () => {
    const warnings: ProseAdmissionWarning[] = [
      { code: 'quality_below_preference', source: 'quality', message: 'Subjective quality score is below preference.' },
      { code: 'word_target_missed', source: 'word_target', message: 'Draft is shorter than the requested word target.' },
      { code: 'story_state_pending', source: 'story_state', message: 'Story state will be synchronized later.' },
    ]

    expect(classifyProseAdmission({ warnings })).toEqual({
      status: 'accepted_with_warnings',
      hard_failures: [],
      warnings,
    })
  })

  test('blocks a canonical continuity hard failure even when warnings also exist', () => {
    const failure: ProseAdmissionHardFailure = {
      code: 'canonical_fact_conflict',
      source: 'canonical_continuity',
      message: 'The protagonist cannot be alive in this scene.',
    }
    const warning: ProseAdmissionWarning = {
      code: 'review_unavailable',
      source: 'review',
      message: 'Optional review was unavailable.',
    }

    expect(classifyProseAdmission({ hard_failures: [failure], warnings: [warning] })).toEqual({
      status: 'blocked_invalid',
      hard_failures: [failure],
      warnings: [warning],
    })
  })

  test('deduplicates warnings by source, code, and message while preserving first-seen order', () => {
    const first: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'review',
      message: 'Tighten the opening.',
      details: { pass: 1 },
    }
    const duplicateWithDifferentDetails: ProseAdmissionWarning = {
      ...first,
      details: { pass: 2 },
    }
    const sameCodeDifferentMessage: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'review',
      message: 'Tighten the ending.',
    }
    const differentSource: ProseAdmissionWarning = {
      code: 'soft_review_note',
      source: 'memory',
      message: 'Tighten the opening.',
    }

    expect(classifyProseAdmission({
      warnings: [first, duplicateWithDifferentDetails, sameCodeDifferentMessage, differentSource, first],
    }).warnings).toEqual([first, sameCodeDifferentMessage, differentSource])
  })

  test('deduplicates hard failures consistently while preserving first-seen order', () => {
    const first: ProseAdmissionHardFailure = {
      code: 'unsafe_content',
      source: 'safety',
      message: 'Safety policy rejected the payload.',
      details: { attempt: 1 },
    }
    const duplicateWithDifferentDetails: ProseAdmissionHardFailure = {
      ...first,
      details: { attempt: 2 },
    }
    const second: ProseAdmissionHardFailure = {
      code: 'atomic_commit_failed',
      source: 'atomic',
      message: 'The chapter and state could not be committed atomically.',
    }

    expect(classifyProseAdmission({
      hard_failures: [first, duplicateWithDifferentDetails, second, first],
    }).hard_failures).toEqual([first, second])
  })
})

describe('minimal chapter prose validation', () => {
  test('rejects empty and whitespace-only inputs', () => {
    for (const input of ['', ' \n\t ', null, undefined]) {
      const result = validateMinimalChapterProse(input)
      expect(result.valid).toBe(false)
      expect(result.failures.map(item => item.code)).toContain('prose_empty')
      expect(result.failures.every(item => item.source === 'prose_shape')).toBe(true)
    }
  })

  test('rejects a short payload', () => {
    const result = validateMinimalChapterProse('雨停了。门开了！他回头？她没有回答。')

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_too_short')
  })

  test('rejects title-only and label-only payloads', () => {
    const title = validateMinimalChapterProse('第一章：雨夜归人')
    const label = validateMinimalChapterProse('小说正文：')

    expect(title.failures.map(item => item.code)).toContain('prose_title_only')
    expect(label.failures.map(item => item.code)).toContain('prose_label_only')
  })

  test('rejects explanation-only and error payloads even when they are long', () => {
    const explanation = validateMinimalChapterProse(
      '下面是根据你的要求生成的小说正文，内容将围绕雨夜重逢展开。'.repeat(12),
    )
    const error = validateMinimalChapterProse(
      '生成失败：模型调用超时，请稍后重试。'.repeat(18),
    )

    expect(explanation.failures.map(item => item.code)).toContain('prose_explanation_only')
    expect(error.failures.map(item => item.code)).toContain('prose_error_payload')
  })

  test('rejects a long refusal payload that otherwise meets the shape thresholds', () => {
    const result = validateMinimalChapterProse(
      '抱歉，我不能提供该内容，请稍后重试。'.repeat(20),
    )

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_error_payload')
  })

  test('rejects JSON-like payloads', () => {
    const result = validateMinimalChapterProse(JSON.stringify({
      chapter_text: '雨落在长街上。门后没有人回答！旧钟敲了三次？他终于推门而入。'.repeat(8),
      status: 'ok',
    }))

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_json_payload')
  })

  test('rejects long prose with fewer than four sentence terminators', () => {
    const result = validateMinimalChapterProse('雨水沿着瓦檐落下他沿长街一路追到城门却始终没有看见那盏约定的灯'.repeat(8))

    expect(result.valid).toBe(false)
    expect(result.failures.map(item => item.code)).toContain('prose_too_few_sentences')
  })

  test('accepts compact real Chinese prose without consulting quality or word targets', () => {
    const prose = [
      '雨从子夜下到黎明，青石巷被洗得发亮，沈砚踩过积水时没有放慢脚步，因为怀里的旧信正在一点点洇开墨迹。',
      '他赶到城南药铺，木门只留着一道缝，门槛内侧压着母亲惯用的银针，针尾却缠着陌生的红线！',
      '柜台后的药香早已散尽，地上横着半盏冷茶，墙上的影子随着灯芯摇晃，像有人刚从暗门里退了进去。',
      '沈砚没有出声，只把湿透的信塞进袖中，顺手扣住门边那枚生锈铜铃，铃舌竟带着尚未凝固的血？',
      '后院忽然传来瓦片碎裂的轻响，他越过柜台追出去，看见一道灰衣身影翻上墙头，而墙根留下了父亲失踪前佩过的木牌。',
      '他握紧木牌，终于明白这封迟到十年的信不是求救，而是有人故意把他引回这座从不肯遗忘旧债的城。',
    ].join('')
    expect(prose.replace(/\s+/g, '').length).toBeGreaterThanOrEqual(200)

    expect(validateMinimalChapterProse(prose)).toEqual({ valid: true, failures: [] })
  })
})

describe('blocked invalid error marking', () => {
  const failure: ProseAdmissionHardFailure = {
    code: 'invalid_prose_shape',
    source: 'prose_shape',
    message: 'Generated payload is not chapter prose.',
  }

  test('preserves an Error instance and attaches admission evidence', () => {
    const original = new Error('provider returned a title')
    const marked = markBlockedInvalidError(original, failure)

    expect(marked).toBe(original)
    expect(marked.message).toBe('provider returned a title')
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })

  test('creates a stable Error for non-Error input', () => {
    const marked = markBlockedInvalidError({ message: 'plain-object failure' }, failure)

    expect(marked).toBeInstanceOf(Error)
    expect(marked.message).toBe('plain-object failure')
    expect(marked.admission_status).toBe('blocked_invalid')
    expect(marked.admission_failure).toBe(failure)
  })
})
