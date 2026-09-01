import { describe, expect, test } from 'bun:test'
import { buildNovelDeliverySummary } from './writing-recommendation-core'
import type { NovelDeliverySummaryInput } from './writing-recommendation-types'

const baseDesk: NovelDeliverySummaryInput = {
  visible: true,
  acceptanceStatus: 'ready_to_accept',
  statusLabel: '可验收',
  acceptanceReasons: [],
  qualityScore: 88,
  storyStateSynced: true,
  recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '验收并继续' },
}

describe('buildNovelDeliverySummary characterPov contract', () => {
  test('passes desk.characterPov through in its declared string shape', () => {
    const summary = buildNovelDeliverySummary({
      ...baseDesk,
      characterPov: {
        visible: true,
        status: 'warn',
        statusLabel: '视角待优化',
        primaryPov: '林序',
        scenePreview: ['场景1 · 林序 · 选择=亲自查遗物'],
        violations: ['全知泄漏：正文含全知旁白'],
      },
    })
    expect(summary.characterPov?.scenePreview).toEqual(['场景1 · 林序 · 选择=亲自查遗物'])
    expect(summary.characterPov?.violations).toEqual(['全知泄漏：正文含全知旁白'])
  })

  test('falls back to quality findings pov and renders violations as strings', () => {
    const summary = buildNovelDeliverySummary({
      ...baseDesk,
      qualityWarnings: [{ code: 'pov_check', source: 'quality', message: '未授权视角切换' }],
    })
    expect(summary.characterPov).not.toBeNull()
    expect((summary.characterPov?.violations || []).every(item => typeof item === 'string')).toBe(true)
    expect((summary.characterPov?.violations || []).some(item => item.includes('未授权视角'))).toBe(true)
  })
})

describe('buildNovelDeliverySummary story-state contract', () => {
  test('writing delivery summary never exposes storyStateSyncAction', () => {
    const summary = buildNovelDeliverySummary({
      ...baseDesk,
      storyStateSynced: false,
      acceptanceStatus: 'needs_state_sync',
      recommendedAcceptanceAction: { key: 'sync_story_state', label: '立即同步故事状态' },
    })
    expect(summary.storyStateSyncAction).toBeNull()
    expect(summary.actionKey).not.toBe('sync_story_state')
  })
})
