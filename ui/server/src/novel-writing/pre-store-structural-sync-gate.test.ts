import { describe, expect, test } from 'bun:test'
import { buildPreStoreStructuralSyncChecks } from './pre-store-structural-sync-gate'

describe('pre-store structural sync gate', () => {
  test('turns critical post-delivery sync warnings into quality gate checks', () => {
    const checks = buildPreStoreStructuralSyncChecks({
      chapterBlueprintSync: {
        status: 'warn',
        label: '细纲缺口 2',
        summary: '正文有 2 项章节细纲任务未充分落地。',
        missed_count: 2,
        next_actions: ['补开篇钩子', '补核心回报'],
      },
      benchmarkRecallSync: {
        status: 'warn',
        label: '召回缺口 1',
        summary: '文风召回未落地。',
        missed_count: 1,
      },
      storyDriveSync: {
        status: 'ok',
        label: '故事力 OK',
        missed_count: 0,
      },
      chapterAttractionReview: {
        status: 'warn',
        label: '吸引力缺口 1',
        summary: '章末翻页弱。',
        weak_count: 1,
      },
      runwaySync: {
        status: 'warn',
        label: '航线风险 1',
        summary: '百万字航线四问未兑现。',
        risk_count: 1,
      },
    })

    expect(checks).toHaveLength(4)
    expect(checks.map(check => check.sync_key)).toEqual(expect.arrayContaining([
      'chapter_blueprint_sync',
      'benchmark_recall_sync',
      'chapter_attraction_review',
      'runway_sync',
    ]))
    expect(checks.every(check => check.status === 'fail')).toBe(true)
    expect(checks.map(check => check.fix).join('｜')).toContain('补开篇钩子')
  })

  test('ignores ok, skipped, or zero-count sync reports', () => {
    const checks = buildPreStoreStructuralSyncChecks({
      chapterBlueprintSync: { status: 'ok', label: '细纲 OK', missed_count: 0 },
      benchmarkRecallSync: { status: 'ok', label: '召回 OK', missed_count: 0 },
      storyDriveSync: { status: 'warn', label: '未配置', summary: '未配置', missed_count: 0 },
      chapterAttractionReview: { status: 'skipped', label: '跳过', weak_count: 0 },
      runwaySync: null,
    })

    expect(checks).toEqual([])
  })
})
