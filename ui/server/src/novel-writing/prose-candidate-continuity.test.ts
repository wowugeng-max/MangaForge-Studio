import { describe, expect, test } from 'bun:test'
import { chapter10HandoffFixture, chapterScaleText } from './fixtures/chapter-10-11-handoff'
import { selectContinuitySafeProseCandidate } from './prose-candidate-continuity'

const context = {
  previous_handoff: chapter10HandoffFixture.previousChapterTail,
  requiredHandoffAnchors: chapter10HandoffFixture.requiredAnchors,
  scene_cards: [{ transition_from_previous: '暗金绢册继续发热，沈砚和老陈在地下通道处理逼近的铁链声。' }],
}

describe('continuity-safe prose candidate selection', () => {
  test('derives generic handoff anchors across short web-fiction paragraphs', () => {
    const genericContext = {
      previous_handoff: '苏禾留在临江车站，青铜罗盘突然倒转，站台广播开始念她的名字。',
    }
    const original = chapterScaleText('广播又念了一遍。\n\n苏禾攥紧青铜罗盘。\n\n临江车站的出口同时落锁。')
    const candidate = chapterScaleText('晨光落进陌生客厅。\n\n她睁开眼，觉得昨夜像一场梦。')

    expect(selectContinuitySafeProseCandidate(original, candidate, genericContext).accepted).toBe(false)
  })

  test('does not treat a one-word flashback as a causal bridge', () => {
    const genericContext = {
      previous_handoff: '苏禾留在临江车站，青铜罗盘突然倒转。',
      requiredHandoffAnchors: ['临江车站', '苏禾', '青铜罗盘', '罗盘倒转'],
    }
    const original = chapterScaleText('苏禾还在临江车站。\n\n青铜罗盘倒转得越来越快。')
    const candidate = chapterScaleText('三小时后，他想起“罗盘”两个字，随即推开陌生公寓的门。')

    expect(selectContinuitySafeProseCandidate(original, candidate, genericContext).accepted).toBe(false)
  })

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

    const aliasedContext = {
      ...context,
      requiredHandoffAnchorGroups: [
        ['地下通道', '地底甬道'],
        ['老陈', '陈叔'],
        ['暗金绢册', '金色旧册'],
        ['铁链', '锁链'],
        ['发热', '升温'],
      ],
    }

    expect(selectContinuitySafeProseCandidate(original, synonym, aliasedContext).accepted).toBe(true)
    expect(selectContinuitySafeProseCandidate(original, bridged, context).accepted).toBe(true)
  })

  test('accepts the production-shaped synonym rewrite without hand-authored alias groups', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const synonym = chapterScaleText('金色旧册贴着胸口再次升温，沈砚扶住陈叔，在地底甬道循着锁链摩擦声后退。')
    expect(selectContinuitySafeProseCandidate(original, synonym, context).accepted).toBe(true)
  })

  test('does not accept merely similar words when two independent handoff states are not preserved', () => {
    const original = chapterScaleText('苏禾守在临江车站。\n\n青铜罗盘正在倒转。')
    const candidate = chapterScaleText('苏青走进临江商场。\n\n她拿起铜色餐盘。')
    const similarContext = { requiredHandoffAnchors: ['苏禾', '临江车站', '青铜罗盘', '罗盘倒转'] }
    expect(selectContinuitySafeProseCandidate(original, candidate, similarContext).accepted).toBe(false)
  })

  test('rejects underground-market and decorative-book word-shape bypasses', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔走进地下商道，暗金花册压在婚礼签到台上，主持人宣布仪式开始。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  test('rejects above-ground passage and picture-book event-name bypasses', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔站在地上通道，暗金画册摆在发布会讲台上，灯光随即亮起。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  test('does not police a weak original opening that never established two handoff anchors', () => {
    const original = chapterScaleText('沈砚向前走去。')
    const candidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(true)
  })

  test('does not accept a bare time jump that explains none of the established handoff state', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('三小时后，剧痛从骨髓深处炸开，他在陌生白房间里醒来。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })
})
