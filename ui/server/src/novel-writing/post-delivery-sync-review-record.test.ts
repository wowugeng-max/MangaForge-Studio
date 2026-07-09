import { describe, expect, test } from 'bun:test'
import {
  buildAssetIntakeReviewRecord,
  buildDeterministicProseCleanupReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
  buildReceiptSyncReviewRecord,
  buildRevisionCascadeImpactSyncReviewRecord,
  buildRevisionScopeGuardSyncReviewRecord,
  buildStoryStateReviewRecord,
  buildStorylineSyncReviewRecord,
} from './post-delivery-sync-review-record'

describe('post-delivery sync review record builders', () => {
  const chapter = { id: 8, chapter_no: 3 }

  test('builds common post-delivery sync review records with legacy issue formatting hooks', () => {
    const sync = {
      status: 'warn',
      label: '章级钩子',
      summary: '2 项缺口',
      missed: [
        { label: '开篇钩子', text: '前 300 字缺少异常' },
        { label: '章末拉力', expected: '留下下一章问题' },
      ],
    }

    const record = buildPostDeliverySyncReviewRecord({
      projectId: 10,
      chapter,
      sync,
      reviewType: 'chapter_hook_sync',
      payloadKey: 'chapter_hook_sync',
      issuePrefix: '章级钩子缺口',
    })

    expect(record).toEqual({
      project_id: 10,
      review_type: 'chapter_hook_sync',
      status: 'warn',
      summary: '章级钩子：2 项缺口',
      issues: [
        '章级钩子缺口：开篇钩子｜前 300 字缺少异常',
        '章级钩子缺口：章末拉力｜留下下一章问题',
      ],
      payload: JSON.stringify({
        chapter_id: 8,
        chapter_no: 3,
        chapter_hook_sync: sync,
      }),
    })
  })

  test('builds receipt sync review records and skips empty receipt checks', () => {
    expect(buildReceiptSyncReviewRecord({
      projectId: 10,
      chapter,
      sync: { status: 'ok', receipt_count: 0, missed_count: 0, label: '修订回执', summary: '无缺口', missed: [] },
      reviewType: 'prose_revision_receipt_sync',
      payloadKey: 'prose_revision_receipt_sync',
    })).toBeNull()

    const record = buildReceiptSyncReviewRecord({
      projectId: 10,
      chapter,
      sync: {
        status: 'warn',
        receipt_count: 1,
        missed_count: 1,
        label: '修订回执',
        summary: '1 项未闭环',
        missed: [
          { label: '开篇钩子', text: '未修到前300字' },
          { label: '章末拉力', text: '仍是总结体' },
        ],
      },
      reviewType: 'prose_revision_receipt_sync',
      payloadKey: 'prose_revision_receipt_sync',
    })

    expect(record).toMatchObject({
      project_id: 10,
      review_type: 'prose_revision_receipt_sync',
      status: 'warn',
      summary: '修订回执：1 项未闭环',
      issues: ['开篇钩子：未修到前300字', '章末拉力：仍是总结体'],
    })
    expect(JSON.parse(record!.payload)).toEqual({
      chapter_id: 8,
      chapter_no: 3,
      prose_revision_receipt_sync: {
        status: 'warn',
        receipt_count: 1,
        missed_count: 1,
        label: '修订回执',
        summary: '1 项未闭环',
        missed: [
          { label: '开篇钩子', text: '未修到前300字' },
          { label: '章末拉力', text: '仍是总结体' },
        ],
      },
    })
  })

  test('builds revision cascade and scope guard sync records with their legacy issue formats', () => {
    const cascade = buildRevisionCascadeImpactSyncReviewRecord({
      projectId: 10,
      chapter,
      sync: {
        status: 'warn',
        label: '级联影响',
        summary: '2 项证据缺失',
        missed_count: 2,
        missed: [
          { target: '时间线', text: '未写换防后果' },
          { target: '人物状态', text: '未写受伤影响' },
        ],
      },
    })
    expect(cascade?.issues).toEqual(['时间线：未写换防后果', '人物状态：未写受伤影响'])
    expect(JSON.parse(cascade!.payload).revision_cascade_impact_sync.missed_count).toBe(2)

    expect(buildRevisionScopeGuardSyncReviewRecord({
      projectId: 10,
      chapter,
      selfCheck: { revised: false },
      sync: { status: 'ok', label: '修订范围', summary: '无越界', missed_count: 0, missed: [] },
    })).toBeNull()

    const scope = buildRevisionScopeGuardSyncReviewRecord({
      projectId: 10,
      chapter,
      selfCheck: { revised: true },
      sync: {
        status: 'ok',
        label: '修订范围',
        summary: '有修订需留痕',
        missed_count: 0,
        missed: [],
      },
    })
    expect(scope).toMatchObject({
      review_type: 'revision_scope_guard_sync',
      status: 'ok',
      summary: '修订范围：有修订需留痕',
      issues: [],
    })
  })

  test('builds deterministic cleanup review only when cleanup or normalization changed', () => {
    expect(buildDeterministicProseCleanupReviewRecord({
      projectId: 10,
      chapter,
      deterministicProseCleanup: { status: 'ok', risk_count: 0, label: '确定性清理', summary: '无风险', required_actions: [] },
      formatNormalization: { changed: false },
      punctuationNormalization: { changed: false },
      cleanupRepairFormatNormalization: { changed: false },
      cleanupRepairPunctuationNormalization: { changed: false },
    })).toBeNull()

    const record = buildDeterministicProseCleanupReviewRecord({
      projectId: 10,
      chapter,
      deterministicProseCleanup: {
        status: 'warn',
        risk_count: 1,
        label: '确定性清理',
        summary: '残留 1 项',
        required_actions: ['删掉工程词'],
      },
      formatNormalization: { changed: true, change_count: 2 },
      punctuationNormalization: { changed: false },
      cleanupRepairFormatNormalization: { changed: false },
      cleanupRepairPunctuationNormalization: { changed: true, change_count: 1 },
    })

    expect(record).toMatchObject({
      project_id: 10,
      review_type: 'deterministic_prose_cleanup',
      status: 'warn',
      summary: '确定性清理：残留 1 项',
      issues: ['删掉工程词'],
    })
    expect(JSON.parse(record!.payload)).toMatchObject({
      chapter_id: 8,
      chapter_no: 3,
      deterministic_prose_cleanup: { risk_count: 1 },
      deterministic_format_normalization: { changed: true, change_count: 2 },
      deterministic_punctuation_normalization: { changed: false },
      deterministic_cleanup_repair_format_normalization: { changed: false },
      deterministic_cleanup_repair_punctuation_normalization: { changed: true, change_count: 1 },
    })
  })

  test('builds intake and storyline review records without legacy route object literals', () => {
    expect(buildAssetIntakeReviewRecord({ projectId: 10, chapter, discoveredAssets: [] })).toBeNull()
    expect(buildIpSceneIntakeReviewRecord({ projectId: 10, chapter, ipSceneCandidates: [] })).toBeNull()

    const assetRecord = buildAssetIntakeReviewRecord({
      projectId: 10,
      chapter,
      discoveredAssets: [
        { entity_type: 'character', name: '宋照夜' },
        { entity_type: 'foreshadowing', name: '缺页背印' },
      ],
    })
    expect(assetRecord).toMatchObject({
      project_id: 10,
      review_type: 'asset_intake',
      status: 'pending',
      summary: '发现 2 个新资产待确认',
      issues: ['character：宋照夜', 'foreshadowing：缺页背印'],
    })
    expect(JSON.parse(assetRecord!.payload)).toEqual({
      chapter_id: 8,
      chapter_no: 3,
      discovered_assets: [
        { entity_type: 'character', name: '宋照夜' },
        { entity_type: 'foreshadowing', name: '缺页背印' },
      ],
      applied_asset_names: [],
    })

    const ipRecord = buildIpSceneIntakeReviewRecord({
      projectId: 10,
      chapter,
      ipSceneCandidates: [{ title: '雨夜开门' }],
    })
    expect(ipRecord).toMatchObject({
      review_type: 'ip_scene_intake',
      status: 'ok',
      summary: '沉淀 1 个 IP 场面候选',
      issues: ['雨夜开门'],
    })

    const storylineRecord = buildStorylineSyncReviewRecord({
      projectId: 10,
      chapter,
      storylineSync: {
        status: 'warn',
        missed: [{ name: '旧案主线' }],
        unplanned: [{ name: '商会支线' }],
        forbidden_touched: [{ name: '终局真相' }],
      },
    })
    expect(storylineRecord).toMatchObject({
      review_type: 'storyline_sync',
      status: 'warn',
      summary: '剧情线同步存在风险：漏推 1，额外推进 1，禁揭风险 1',
      issues: ['漏推：旧案主线', '额外推进：商会支线', '禁揭风险：终局真相'],
    })

    const storyStateRecord = buildStoryStateReviewRecord({
      projectId: 10,
      chapter,
      payload: { chapter_title_uniqueness_sync: { status: 'ok' } },
    })
    expect(storyStateRecord).toMatchObject({
      review_type: 'story_state',
      status: 'ok',
      summary: '故事状态已更新至第3章',
      issues: [],
    })
    expect(JSON.parse(storyStateRecord.payload)).toEqual({
      chapter_id: 8,
      chapter_no: 3,
      chapter_title_uniqueness_sync: { status: 'ok' },
    })
  })
})
