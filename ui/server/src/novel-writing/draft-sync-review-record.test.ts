import { describe, expect, test } from 'bun:test'
import {
  buildChapterAttractionDraftReviewRecord,
  buildChapterHandoffDraftReviewRecord,
  buildChapterTitleUniquenessDraftReviewRecord,
  buildCoreContractDraftReviewRecord,
  buildDeliveryRiskReceiptsDraftReviewRecord,
  buildDraftSyncReviewRecord,
  buildReaderPayoffDraftReviewRecord,
  buildSignatureSceneDraftReviewRecord,
  buildStoryUnitDraftReviewRecord,
  buildChapterCoreDriftDraftReviewRecord,
  buildPlotSpecialTopicsDraftReviewRecord,
  buildSceneCardReceiptsDraftReviewRecord,
  buildStyleSampleDraftReviewRecord,
} from './draft-sync-review-record'

describe('draft sync review record builders', () => {
  test('builds a stable sync review record from missed item fields', () => {
    const sync = {
      label: '对白同步',
      summary: '缺 2 个对白执行点',
      status: 'warn',
      missed: [
        { label: '台词推进', text: '对白没有推动信息变化' },
        { label: '配角人数', expected: '同场景最多 3 个配角发言' },
      ],
    }

    const record = buildDraftSyncReviewRecord({
      projectId: 12,
      chapter: { id: 34, chapter_no: 5 },
      sync,
      reviewType: 'dialogue_sync',
      payloadKey: 'dialogue_sync',
      issuePrefix: '对白缺口',
    })

    expect(record).toEqual({
      project_id: 12,
      review_type: 'dialogue_sync',
      status: 'warn',
      summary: '对白同步：缺 2 个对白执行点',
      issues: [
        '对白缺口：台词推进｜对白没有推动信息变化',
        '对白缺口：配角人数｜同场景最多 3 个配角发言',
      ],
      payload: JSON.stringify({
        chapter_id: 34,
        chapter_no: 5,
        dialogue_sync: sync,
      }),
    })
  })

  test('supports custom missed item formatting and ok status mapping', () => {
    const sync = {
      label: '正文元信息 OK',
      summary: '未发现出戏元信息',
      status: 'ok',
      missed: [{ term: '读者', evidence: '这句会跳出角色视角' }],
    }

    const record = buildDraftSyncReviewRecord({
      projectId: 7,
      chapter: { id: 8, chapter_no: 2 },
      sync,
      reviewType: 'prose_meta_sync',
      payloadKey: 'prose_meta_sync',
      formatIssue: item => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
    })

    expect(record.status).toBe('ok')
    expect(record.issues).toEqual(['正文元信息缺口：读者｜这句会跳出角色视角'])
    expect(JSON.parse(record.payload).prose_meta_sync).toEqual(sync)
  })

  test('supports custom issue list formatting for syncs without a missed array', () => {
    const sync = {
      label: '长线铺垫',
      summary: '存在长线铺垫缺口',
      status: 'warn',
      four_question_missed: [{ label: '主问题', text: '本章没有推进终局问题' }],
      reader_fuel_missed: [{ text: '缺少下一章追读燃料' }],
      redline_touched: [{ text: '提前揭开终局秘密' }],
    }

    const record = buildDraftSyncReviewRecord({
      projectId: 9,
      chapter: { id: 10, chapter_no: 3 },
      sync,
      reviewType: 'runway_sync',
      payloadKey: 'runway_sync',
      formatIssues: source => [
        ...source.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
        ...source.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
        ...source.redline_touched.map((item: any) => `触碰红线：${item.text}`),
      ],
    })

    expect(record.issues).toEqual([
      '四问未兑现：主问题｜本章没有推进终局问题',
      '读者燃料未兑现：缺少下一章追读燃料',
      '触碰红线：提前揭开终局秘密',
    ])
  })

  test('builds specialized draft review records with legacy issue formatting', () => {
    const chapter = { id: 10, chapter_no: 3 }
    const baseSync = { label: '诊断', summary: '发现缺口', status: 'warn' }

    expect(buildPlotSpecialTopicsDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ label: '规则可视化', expected: '规则应转化为行动压力' }] },
    }).issues).toEqual(['特殊题材缺口：规则可视化｜规则应转化为行动压力'])

    expect(buildChapterAttractionDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, weak_dimensions: [{ label: '开篇钩子', issue: '进入太慢' }] },
    }).issues).toEqual(['开篇钩子｜进入太慢'])

    expect(buildSceneCardReceiptsDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ label: '场景 1', evidence: '缺少目标变化' }] },
    }).issues).toEqual(['场景回执缺口：场景 1｜缺少目标变化'])

    expect(buildDeliveryRiskReceiptsDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ risk_item: 'AI味', remaining_risk: '语气仍机械' }] },
    }).issues).toEqual(['交稿回执缺口：AI味｜语气仍机械'])

    expect(buildStyleSampleDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: {
        ...baseSync,
        missed: [{ label: '句式', text: '缺少样本节奏' }],
        copied_phrases: ['原句照搬'],
      },
    }).issues).toEqual(['风格缺口：句式｜缺少样本节奏', '照搬风险：原句照搬'])

    expect(buildChapterTitleUniquenessDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ chapter_no: 2, title: '同名标题' }] },
    }).issues).toEqual(['标题重复：第2章《同名标题》'])

    expect(buildChapterHandoffDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ label: '上一章钩子', expected: '承接门外敲门' }] },
    }).issues).toEqual(['章首承接缺口：上一章钩子｜承接门外敲门'])
  })

  test('builds remaining draft sync review records with legacy payload keys', () => {
    const chapter = { id: 10, chapter_no: 3 }
    const baseSync = { label: '诊断', summary: '发现缺口', status: 'warn' }

    expect(buildReaderPayoffDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: {
        ...baseSync,
        missed: [{ text: '承诺的反制爽点没有兑现' }],
        debts: [{ text: '妹妹线索需要下一章回收' }],
      },
    }).issues).toEqual(['未兑现：承诺的反制爽点没有兑现', '待回收：妹妹线索需要下一章回收'])

    expect(buildSignatureSceneDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, planned_count: 0, missed: [{ label: '镜头', text: '缺少大场面' }] },
    })).toBeNull()

    expect(buildSignatureSceneDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, planned_count: 1, missed: [{ label: '镜头', text: '缺少大场面' }] },
    })?.issues).toEqual(['未兑现：镜头｜缺少大场面'])

    expect(buildStoryUnitDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: {
        ...baseSync,
        missed: [{ label: 'A 单元', text: '没有收束' }],
        rushed_ahead: [{ label: 'B 单元', text: '提前揭露' }],
        forbidden_touched: [{ label: '终局', text: '触碰禁揭' }],
      },
    }).issues).toEqual(['单元漏写：A 单元｜没有收束', '单元抢跑：B 单元｜提前揭露', '禁抢跑：终局｜触碰禁揭'])

    expect(buildChapterCoreDriftDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, drift_risks: ['读者承诺偏移'] },
    }).payload).toBe(JSON.stringify({
      chapter_id: 10,
      chapter_no: 3,
      core_drift: { ...baseSync, drift_risks: ['读者承诺偏移'] },
    }))

    expect(buildCoreContractDraftReviewRecord({
      projectId: 9,
      chapter,
      sync: { ...baseSync, missed: [{ label: '核心契约', expected: '必须兑现职业优势' }] },
    }).issues).toEqual(['核心契约缺口：核心契约｜必须兑现职业优势'])
  })
})
