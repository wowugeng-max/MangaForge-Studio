import { describe, expect, test } from 'bun:test'
import {
  buildStyleFingerprintPromptHandoff,
  buildStyleFingerprintStateSnapshot,
  styleFingerprintSceneDirective,
  styleFingerprintSentenceBeat,
} from './style-fingerprint'

describe('style fingerprint helpers', () => {
  test('builds durable story-state snapshots from nested style sources', () => {
    const cyclicStrategy: any = {
      style_profile_summary: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
    }
    cyclicStrategy.self = cyclicStrategy

    const snapshot = buildStyleFingerprintStateSnapshot({
      chapter_target: {
        style_sample_strategy: cyclicStrategy,
      },
    })

    expect(snapshot?.style_fingerprint).toContain('目标句长带 18-36 字')
    expect(snapshot?.style_fingerprint_contract?.target_sentence_band).toBe('18-36字')
    expect(snapshot?.style_fingerprint_contract?.policy).toContain('不以可能已漂移的上一章句式节奏为准')
  })

  test('prefers existing story-state fingerprints and builds prompt handoff contracts', () => {
    const handoff = buildStyleFingerprintPromptHandoff({
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 20-42 字，旧上下文已锁定，中长句呼吸为主。',
      },
    }, {
      reference_config: {
        story_state: {
          style_fingerprint_contract: {
            source: 'existing_story_state',
            target_sentence_band: '20-42字',
            source_excerpt: '旧上下文已锁定。',
          },
        },
      },
    })

    expect(handoff?.source).toBe('existing_story_state')
    expect(handoff?.target_sentence_band).toBe('20-42字')
    expect(handoff?.style_fingerprint).toContain('20-42 字')
    expect(handoff?.policy).toContain('文风指纹')
  })

  test('builds scene directives and sync beats from sentence-band fingerprints', () => {
    const contextPackage = {
      story_state: {
        style_fingerprint: '文风指纹：目标句长带 18-36 字，允许半拍停顿，但整体保持中长句呼吸。',
      },
    }
    const directive = styleFingerprintSceneDirective(contextPackage)
    const beat = styleFingerprintSentenceBeat(contextPackage, null)

    expect(directive).toContain('目标句长带 18-36 字')
    expect(directive).toContain('不要模仿可能已漂移的上一章句式节奏')
    expect(beat?.key).toBe('style_drift_sentence_fingerprint')
    expect(beat?.min_sentence_chars).toBe(18)
    expect(beat?.max_sentence_chars).toBe(36)
  })
})
