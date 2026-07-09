import { describe, expect, test } from 'bun:test'
import {
  normalizeSignatureSceneBrief,
  normalizeSignatureSceneSyncBeat,
  signatureSceneSyncBeatMatch,
} from './signature-scene-basics'

describe('signature scene basic sync checks', () => {
  test('normalizes non-empty signature scene beats with a default threshold', () => {
    expect(normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', '  祠堂  账册  当众显影  ')).toEqual({
      key: 'signature_scene',
      label: '标志性场面',
      text: '祠堂 账册 当众显影',
      threshold: 58,
    })

    expect(normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', '')).toBeNull()
    expect(normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', null)).toBeNull()
  })

  test('respects custom thresholds when checking signature scene delivery', () => {
    const beat = normalizeSignatureSceneSyncBeat(
      'reader_payoff',
      '读者回报',
      '甲乙丙丁戊己庚辛壬癸子丑',
      42,
    )
    const checked = signatureSceneSyncBeatMatch(beat, '本章只落了甲乙x戊己y庚辛z子丑四个锚点。')

    expect(checked.delivered).toBe(true)
    expect(checked.score).toBeGreaterThanOrEqual(42)
    expect(checked.evidence.length).toBeGreaterThan(0)
  })

  test('warns when the same evidence misses a stricter threshold', () => {
    const checked = signatureSceneSyncBeatMatch(
      normalizeSignatureSceneSyncBeat('scene_repair_target', '补位目标', '甲乙丙丁戊己庚辛壬癸子丑', 50),
      '本章只落了甲乙x戊己y庚辛z子丑四个锚点。',
    )

    expect(checked.score).toBeGreaterThanOrEqual(42)
    expect(checked.score).toBeLessThan(50)
    expect(checked.delivered).toBe(false)
  })

  test('keeps beat fields and exact evidence when the signature scene lands', () => {
    const checked = signatureSceneSyncBeatMatch(
      normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', '祠堂账册当众显影', 58),
      '祠堂账册当众显影，围观者第一次看见规则代价。',
    )

    expect(checked).toMatchObject({
      key: 'signature_scene',
      label: '标志性场面',
      text: '祠堂账册当众显影',
      threshold: 58,
      score: 100,
      evidence: ['祠堂账册当众显影'],
      delivered: true,
    })
  })

  test('normalizes signature scene brief aliases and drops empty briefs', () => {
    expect(normalizeSignatureSceneBrief({
      rollingPlan: {
        ipScene: '祠堂账册当众显影',
        sceneGapRepair: '补公开场面记忆点',
        readerReward: '围观者第一次看见规则代价',
        mainlineProgress: '候选名单出现第四个名字',
      },
    })).toEqual({
      signature_scene: '祠堂账册当众显影',
      scene_repair_target: '补公开场面记忆点',
      reader_payoff: '围观者第一次看见规则代价',
      storyline_service: '候选名单出现第四个名字',
      source: 'rolling_plan',
    })

    expect(normalizeSignatureSceneBrief({ signatureSceneBrief: {} })).toBeNull()
  })
})
