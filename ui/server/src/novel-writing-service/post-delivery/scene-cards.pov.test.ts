import { describe, expect, test } from 'bun:test'
import { normalizeSceneCardsPayload } from './scene-cards'

describe('normalizeSceneCardsPayload character pov', () => {
  test('keeps model pov_lens and backfills when missing', () => {
    const withLens = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 1,
          title: '查尸',
          purpose: '确认异常',
          conflict: '死因不对',
          beat: '发现温尸',
          pov_lens: {
            pov_character: '林序',
            want_now: '先确认异常',
            fear_or_cost_now: '怕背锅',
            decision_in_scene: '亲自查遗物',
            emotion_from_pov: '烦躁',
            emotion_tell: '手套又戴紧一圈',
          },
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        summary: '查尸',
        conflict: '死因异常',
      },
      characters: [{ name: '林序', role_type: 'protagonist' }],
    })
    expect(withLens[0].pov_lens?.pov_character).toBe('林序')
    expect(withLens[0].pov_character).toBe('林序')
    expect(withLens[0].decision_in_scene).toContain('遗物')

    const withoutLens = normalizeSceneCardsPayload({
      scene_cards: [
        {
          scene_no: 1,
          title: '查尸',
          purpose: '确认异常',
          conflict: '死因不对',
          beat: '发现温尸',
          characters_present: ['林序'],
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        summary: '查尸',
        conflict: '死因异常',
        goal: '查出名单',
      },
      characters: [{ name: '林序', role_type: 'protagonist' }],
    })
    expect(withoutLens[0].pov_lens?.pov_character).toBeTruthy()
    expect(withoutLens[0].pov_lens?.decision_in_scene).toBeTruthy()
  })
})
