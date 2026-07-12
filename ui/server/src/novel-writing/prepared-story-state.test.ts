import { describe, expect, test } from 'bun:test'
import {
  buildPendingPreparedStoryStateUpdate,
  buildPreparedStoryStateHardFailures,
} from './prepared-story-state'

describe('prepared story state hard failures', () => {
  test('builds a bounded pending update that preserves the prior reference config', () => {
    const referenceConfig = { story_state: { open_questions: ['旧问题'] }, quality_gate: { min_score: 78 } }
    const failures = [{ key: 'story_state_invalid_payload', message: '无效状态', source: 'story_state' as const }]
    const pending = buildPendingPreparedStoryStateUpdate({
      reference_config: referenceConfig,
      failures,
      error: new Error('x'.repeat(1200)),
    })

    expect(pending).toMatchObject({
      state_delta: {},
      next_reference_config: referenceConfig,
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: {},
      hard_failures: failures,
      payload: { pending: true, skipped: true, hard_failures: failures },
    })
    expect(pending.next_reference_config).not.toBe(referenceConfig)
    expect(pending.payload.error.length).toBeLessThanOrEqual(500)
  })

  test('blocks missed current-chapter character, asset, handoff, and timeline changes', () => {
    const failures = buildPreparedStoryStateHardFailures({
      character_state_delta_sync: { missed: [{ name: '李玄', text: '计划受伤' }] },
      asset_state_delta_sync: { missed: [{ name: '旧印章', text: '计划破损' }] },
      chapter_handoff_delta_sync: { missed: [{ label: '章末问题', text: '未记录' }] },
      timeline_delta_sync: { missed: [{ label: '子时', text: '未记录' }] },
    }, {})

    expect(failures.map(item => item.key)).toEqual([
      'character_state_delta_sync',
      'asset_state_delta_sync',
      'chapter_handoff_delta_sync',
      'timeline_delta_sync',
    ])
  })

  test('blocks heuristic current-chapter state completeness gaps', () => {
    expect(buildPreparedStoryStateHardFailures({
      state_delta_completeness: { missed_count: 2, blocking_missed: [{ key: 'relationship', blocking: true }] },
    }, {})).toContainEqual(expect.objectContaining({ key: 'state_delta_completeness' }))
  })

  test('keeps broad completeness misses advisory when none are high confidence', () => {
    expect(buildPreparedStoryStateHardFailures({
      state_delta_completeness: { missed_count: 3, missed: [{ key: 'timeline' }, { key: 'foreshadowing_or_handoff' }] },
    }, {})).toEqual([])
  })

  test('keeps next-chapter strengthening and document-only sync advisory', () => {
    expect(buildPreparedStoryStateHardFailures({
      reader_retention_sync: { missed: [{ text: '下一章强化追读' }] },
      artifact_protocol_sync: { missed: [{ text: '同步追踪文档' }] },
    }, {})).toEqual([])
  })

  test('fails closed for invalid or transport-incomplete payloads', () => {
    expect(buildPreparedStoryStateHardFailures({}, { invalid_payload: true, transport_incomplete: true }).map(item => item.key))
      .toEqual(['story_state_invalid_payload', 'story_state_transport_incomplete'])
  })

  test('treats empty, array, and scalar state deltas as invalid diagnostics', () => {
    for (const stateDelta of [{}, [], 'bad']) {
      const valid = stateDelta && typeof stateDelta === 'object' && !Array.isArray(stateDelta) && Object.keys(stateDelta).length > 0
      expect(buildPreparedStoryStateHardFailures({}, { invalid_payload: !valid })).toContainEqual(
        expect.objectContaining({ key: 'story_state_invalid_payload' }),
      )
    }
  })
})
