import { describe, expect, test } from 'bun:test'
import { chapter10HandoffFixture, chapterScaleText } from './fixtures/chapter-10-11-handoff'
import { selectContinuitySafeProseCandidate } from './prose-candidate-continuity'

const context = {
  previous_handoff: chapter10HandoffFixture.previousChapterTail,
  scene_cards: [{ transition_from_previous: '暗金绢册继续发热，沈砚和老陈在地下通道处理逼近的铁链声。' }],
}

describe('continuity-safe prose candidate selection', () => {
  test('keeps the chapter-10/11 connected draft when a rewrite drops the established opening handoff', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    const selection = selectContinuitySafeProseCandidate(original, candidate, context, { candidate_stage: 'editor' })

    expect(selection.text).toBe(original)
    expect(selection.accepted).toBe(false)
    expect(selection.warning?.code).toBe('opening_continuity_regression')
  })

  test('accepts a synonym-preserving rewrite and a clearly bridged time transition', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const synonym = chapterScaleText('金色旧册贴着胸口再次升温，沈砚扶住陈叔，在地底甬道循着锁链摩擦声后退。')
    const bridged = chapterScaleText('三小时后，沈砚才从地下通道转移到医院。老陈守在门外，暗金绢册仍隔着衣襟发热。')

    expect(selectContinuitySafeProseCandidate(original, synonym, context).accepted).toBe(true)
    expect(selectContinuitySafeProseCandidate(original, bridged, context).accepted).toBe(true)
  })

  test('does not police a weak original opening that never established two handoff anchors', () => {
    const original = chapterScaleText('沈砚向前走去。')
    const candidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(true)
  })
})
