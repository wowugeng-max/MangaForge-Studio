import { describe, expect, test } from 'bun:test'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
} from './writingCockpitModel'

import {
  project,
  outlines,
  chapters,
  contextPackage,
  sceneCardChapter,
  acceptedProject,
  proseQualityReview,
  editorReportReview,
  editorRevisionReview,
  storylineSyncReview,
  qualityAuditSyncReview,
  qualityAuditRepairReceiptSyncReview,
  chapterHandoffSyncReview,
  chapterHandoffDeltaSyncReview,
  intentConfirmationSyncReview,
  benchmarkRecallSyncReview,
  storyUnitSyncReview,
  assetIntakeReview,
  ipSceneIntakeReview,
  readabilityReview,
  chapterAttractionReview,
  storyDriveSyncReview,
  characterArcSyncReview,
  coreDriftReview,
  readerPayoffSyncReview,
  readerRetentionSyncReview,
  chapterBenchmarkSyncReview,
  styleSampleSyncReview,
  readerExpectationSyncReview,
  runwaySyncReview,
  innovationSyncReview,
  signatureSceneSyncReview,
  volumeBeatSyncReview,
  first30RetentionReview,
  deliveryRiskConvergenceReview,
  governanceRecheckSyncReview,
} from './writingCockpitModel.test-fixtures'

describe('buildWritingCockpitModel quality', () => {
  test('style sample sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        styleSampleSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.label).toBe('风格缺口 2')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.scoreLabel).toBe('风格 61')
    expect(model.chapterAcceptanceDesk.styleSampleSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.styleSampleSync?.copyRiskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('校风格：风格缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先校风格')
  })

  test('front30 prose changed after retention diagnosis asks for retention recheck without blocking acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [
        {
          ...chapters[0],
          updated_at: '2026-05-24T00:40:00.000Z',
        },
      ],
      activeChapterId: 101,
      materialScore: { score: 82, can_generate: true },
      activeRuns: [],
      contextPackages: { 101: contextPackage },
      reviews: [
        first30RetentionReview({ created_at: '2026-05-24T00:05:00.000Z' }),
        proseQualityReview({ created_at: '2026-05-24T00:20:00.000Z' }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.first30RetentionRecheck?.label).toBe('留存需复诊')
    expect(model.chapterAcceptanceDesk.first30RetentionRecheck?.reason).toContain('前30章诊断后更新')
  })

  test('delivery risk queue aggregates soft risks without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerRetentionSyncReview(),
        readerPayoffSyncReview(),
        coreDriftReview(),
        readabilityReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.label).toBe('待修复 9')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补核心')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('守核心：核心偏移 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补追读：漏追读 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补创新：创新缺口 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('governance recheck memory misses are summarized as single-chapter recovery evidence risks', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        governanceRecheckSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.label).toBe('恢复依据缺口 2')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.failedEvidence).toContain('第42章对白交锋已补回样章节奏')
    expect(model.chapterAcceptanceDesk.governanceRecheckSync?.watchItems).toContain('下一章继续观察样章策略命中率')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('验恢复依据：恢复依据缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先验恢复依据')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('innovation sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.innovationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.innovationSync?.label).toBe('创新缺口 2')
    expect(model.chapterAcceptanceDesk.innovationSync?.scoreLabel).toBe('创新兑现 58')
    expect(model.chapterAcceptanceDesk.innovationSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('signature scene sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        signatureSceneSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.label).toBe('强场面漏写 2')
    expect(model.chapterAcceptanceDesk.signatureSceneSync?.scoreLabel).toBe('强场面兑现 50')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补强场面：强场面漏写 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补强场面')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('volume beat sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        volumeBeatSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.label).toBe('爆点漏兑现 2')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.scoreLabel).toBe('爆点兑现 52')
    expect(model.chapterAcceptanceDesk.volumeBeatSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补爆点：爆点漏兑现 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('delivery risk convergence is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        deliveryRiskConvergenceReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.status).toBe('improved')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.label).toBe('风险收敛 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskConvergence?.residualCount).toBe(2)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('zero quality score requires revision instead of being treated as missing', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 0,
                status: 'fail',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(0)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('must-fix quality issues require revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [{ severity: 'high', message: '主角决策动机断裂' }],
                must_fix: ['主角决策动机断裂'],
                optional_improvements: [],
                revision_directives: ['补足主角决策动机'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.mustFix).toContain('主角决策动机断裂')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('latest editor report with must-fix issues recommends applying revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [],
                must_fix: ['章末钩子不足'],
                optional_improvements: [],
                revision_directives: ['强化章末钩子'],
                needs_revision: true,
              },
            },
          },
        }),
        editorReportReview({ id: 301 }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.latestEditorReportId).toBe(301)
    expect(model.chapterAcceptanceDesk.latestEditorReportSummary).toContain('章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('apply_editor_revision')
  })

  test('revision after latest quality review requires a fresh recheck', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({ created_at: '2026-05-24T00:00:00.000Z' }),
        editorReportReview({ created_at: '2026-05-24T00:10:00.000Z' }),
        editorRevisionReview({ created_at: '2026-05-24T00:20:00.000Z' }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_recheck')
    expect(model.chapterAcceptanceDesk.latestRevisionSummary).toContain('强化章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
  })

  test('revision later in review order requires recheck when timestamps are invalid', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({ record: { created_at: 'not-a-date', updated_at: null } }),
        editorRevisionReview({ record: { created_at: null, updated_at: 'invalid-date' } }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_recheck')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
  })

  test('stale editor report fixes do not block acceptance after revision and passing recheck', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          id: 201,
          created_at: '2026-05-24T00:00:00.000Z',
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [],
                must_fix: ['章末钩子不足'],
                optional_improvements: [],
                revision_directives: ['强化章末钩子'],
                needs_revision: true,
              },
            },
          },
        }),
        editorReportReview({ id: 301, created_at: '2026-05-24T00:10:00.000Z' }),
        editorRevisionReview({ id: 401, created_at: '2026-05-24T00:20:00.000Z' }),
        proseQualityReview({
          id: 202,
          created_at: '2026-05-24T00:30:00.000Z',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.mustFix).toEqual([])
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('summarizes prose revision receipts and routes residual risk into delivery queue', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'prose',
                    original_evidence: '眼神复杂',
                    applied_fix: '改成具体动作和对白反应',
                    changed_evidence: '谢怀安把腰牌翻到血迹那面，直接问管事认不认。',
                    remaining_risk: '',
                  },
                  {
                    issue_index: 1,
                    severity: 'S2',
                    category: 'structure',
                    original_evidence: '章末只总结局势',
                    applied_fix: '补章末现场钩子',
                    changed_evidence: '第三声钟响后，守将闯入。',
                    remaining_risk: '守将动机仍需下一章补证据。',
                  },
                ],
              },
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('修订闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.closedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌翻到血迹')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('守将动机仍需下一章补证据。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订残留 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核修订')
  })

  test('summarizes nested oh-story revision receipts and routes residual risk into delivery queue', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  revision_receipts: [
                    {
                      issue_index: 0,
                      severity: 'S2',
                      category: 'prose',
                      applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                      changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                      remaining_risk: '',
                    },
                    {
                      issue_index: 1,
                      severity: 'S2',
                      category: 'structure',
                      applied_fix: '补章末现场钩子',
                      changed_evidence: '第三声钟响后，守将闯入。',
                      remaining_risk: '守将动机仍需下一章补证据。',
                    },
                  ],
                },
              },
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('修订闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.closedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('带血腰牌翻到背面')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('守将动机仍需下一章补证据。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订残留 1')
  })

  test('surfaces prose revision receipt sync misses even when revision receipts look closed', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              revision: {
                revision_receipts: [
                  {
                    issue_index: 0,
                    severity: 'S2',
                    category: 'prose',
                    original_evidence: '解释偏长',
                    applied_fix: '压缩说明',
                    changed_evidence: '三句压成一句。',
                    remaining_risk: '无',
                  },
                ],
              },
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
        {
          id: 233,
          review_type: 'prose_revision_receipt_sync',
          status: 'warn',
          summary: '缺少交稿风险修订回执。',
          created_at: '2026-05-24T00:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            prose_revision_receipt_sync: {
              status: 'warn',
              label: '修订回执残留 1',
              missed_count: 1,
              receipt_count: 1,
              missed: [
                {
                  category: 'delivery_risk_receipt',
                  label: '交稿风险修订回执缺失',
                  text: '缺少对应交稿风险修订回执：章末翻页风险｜章末把带血腰牌变成新的未解问题。',
                  evidence: 'ending_actions｜最后300字没有形成追读钩子。',
                },
              ],
              next_actions: [
                '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('修订回执残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks.join('；')).toContain('章末把带血腰牌')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：修订回执残留 1')
  })

  test('summarizes deslop repair receipts as a de-ai revision closure signal', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              revision: {
                deslop_repair_receipts: [
                  {
                    gate: 'B',
                    label: '主语重复',
                    original_evidence: '谢怀安看着钟。谢怀安抬手。',
                    applied_fix: '把第二句改为动作承接。',
                    changed_evidence: '钟声压过席面时，他把腰牌按在桌上。',
                    remaining_risk: '',
                  },
                  {
                    gate: 'G',
                    label: '解释腔',
                    original_evidence: '这意味着更大的危机即将到来。',
                    applied_fix: '改成现场可见危机。',
                    changed_evidence: '城门方向的火把忽然连成一条线。',
                    remaining_risk: '结尾仍有一句偏总结。',
                  },
                ],
              },
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌按在桌上')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('结尾仍有一句偏总结。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：去AI味残留 1')
  })

  test('summarizes nested oh-story deslop repair receipts as a de-ai closure signal', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              revision: {
                oh_story_delivery_receipts: {
                  deslop_repair_receipts: [
                    {
                      gate: 'F',
                      label: '章末总结升华',
                      original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                      applied_fix: '改成章末可见压力。',
                      changed_evidence: '城门方向的火把忽然断成两截，他把腰牌压进掌心。',
                      remaining_risk: '',
                    },
                    {
                      gate: 'G',
                      label: '解释腔',
                      original_evidence: '这意味着更大的危机即将到来。',
                      applied_fix: '改成现场可见危机。',
                      changed_evidence: '城门方向的火把忽然连成一条线。',
                      remaining_risk: '结尾仍有一句偏总结。',
                    },
                  ],
                },
              },
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味残留 1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 1/2')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('腰牌压进掌心')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.risks).toContain('结尾仍有一句偏总结。')
  })

  test('summarizes stored deslop repair receipt sync when quality payload lacks receipts', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        {
          id: 260,
          review_type: 'deslop_repair_receipt_sync',
          status: 'warn',
          summary: '去AI味修复回执未生成：本章存在去AI味门禁缺口且已执行修订，但没有生成逐项去AI味修复回执。',
          created_at: '2026-05-24T00:30:00.000Z',
          payload: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            deslop_repair_receipt_sync: {
              status: 'warn',
              label: '去AI味修复回执未生成',
              receipt_count: 0,
              missed_count: 1,
              completed_count: 0,
              missed: [
                {
                  gate: 'Gate F',
                  label: '去AI味修复回执未生成',
                  text: '本章已执行去AI味修复，但没有生成逐项 deslop_repair_receipts。',
                  evidence: 'Gate F｜章末总结升华｜真正的成长不是赢，而是学会承担。',
                },
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.label).toBe('去AI味修复回执未生成')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.scoreLabel).toBe('去AI味闭环 0/1')
    expect(model.chapterAcceptanceDesk.revisionReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.revisionReceipt?.evidence.join('；')).toContain('Gate F')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核修订：去AI味修复回执未生成')
  })

  test('surfaces prose quality approval blockers as delivery repair work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          summary: '章节群质检评分 84，仿写安全阈值未通过',
          payload: {
            approval_type: 'reference_safety_blocked',
            quality_gate: {
              passed: false,
              reasons: ['仿写安全阈值未通过：相似片段过高'],
            },
            safety_decision: {
              blocked: true,
              score: 45,
              copy_hit_count: 3,
              reasons: ['连续三段与参考材料高度相似'],
            },
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.type).toBe('reference_safety_blocked')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.label).toBe('仿写安全阻断')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.detail).toContain('连续三段与参考材料高度相似')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先处理入库阻断')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items[0]).toContain('处理入库阻断：仿写安全阻断')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('summarizes delivery risk receipts and routes missed carry-over into delivery queue', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
                delivery_risk_receipts: [
                  {
                    risk_item: '去AI味：AI味中度 2',
                    required_action: '章末必须用现场反转或新证据收束。',
                    delivered: true,
                    evidence: '水迹在玻璃上拼出第二个名字。',
                    remaining_risk: '',
                  },
                  {
                    risk_item: '复盘审稿：S2问题 1',
                    required_action: '下一章开篇必须让主角追查湿漉漉学生身份。',
                    delivered: false,
                    evidence: '',
                    remaining_risk: '开篇仍只写宿舍环境，没有追查湿漉漉学生身份。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.scoreLabel).toBe('承接闭环 1/2')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.risks).toContain('开篇仍只写宿舍环境，没有追查湿漉漉学生身份。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核承接：承接残留 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核承接')
  })

  test('summarizes nested oh-story delivery risk receipts and routes missed carry-over into delivery queue', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
            oh_story_delivery_receipts: {
              delivery_risk_receipts: [
                {
                  risk_item: '质量诊断闭环：质量诊断残留 1',
                  required_action: '下一章必须写出换防令造成的新阻碍。',
                  delivered: false,
                  evidence: '',
                  remaining_risk: '换防令造成的新阻碍还没有进入下一章开篇。',
                },
              ],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.scoreLabel).toBe('承接闭环 0/1')
    expect(model.chapterAcceptanceDesk.deliveryRiskReceipt?.risks).toContain('换防令造成的新阻碍还没有进入下一章开篇。')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核承接：承接残留 1')
  })

  test('summarizes platform rubric checks and routes failed platform fit into delivery queue', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                rubric: 'fanqie',
                rubric_source: 'oh_story_embedded_fallback',
                platform_checks: [
                  {
                    key: 'opening_hook',
                    label: '前三段钩子',
                    status: 'fail',
                    evidence: '前三段都在解释背景。',
                    fix: '开篇改成对手当众撕毁证据。',
                  },
                  {
                    key: 'ending_pull',
                    label: '章末翻页',
                    status: 'pass',
                    evidence: '最后一份证据指向身边人。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.platformRubric?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.platformRubric?.label).toBe('平台基准：番茄')
    expect(model.chapterAcceptanceDesk.platformRubric?.scoreLabel).toBe('平台达标 1/2')
    expect(model.chapterAcceptanceDesk.platformRubric?.missed).toContain('前三段钩子')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('平台适配：平台缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修平台适配')
  })

  test('passing quality with stale story state needs state sync', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.primaryActionKey).toBe('sync_story_state')
  })

  test('passing quality with synchronized story state is ready to accept', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(true)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.primaryActionKey).toBe('accept_chapter_and_continue')
  })

  test('summarizes chapter blueprint receipts from generated scene breakdown', () => {
    const chapterWithReceipts = {
      ...chapters[0],
      scene_breakdown: [
        {
          scene_no: 1,
          title: '审判开场',
          blueprint_receipts: {
            target_emotion: { delivered: true, evidence: '开场压迫，中段反证，结尾释放爽感。' },
            opening_hook: { delivered: true, evidence: '第一段直接抛出认罪书。' },
            core_payoff: { delivered: false, evidence: '反证完成了，但没有写出夺回主动权后的在场反应。' },
            content_outline: { delivered: true, evidence: '先被伪证逼到绝境，再用账本反证。' },
            beat_sequence: { delivered: true, evidence: '场景完成开篇钩子和反证转折。' },
            ending_contract: { delivered: false, evidence: '章尾没有抛出第二本账册。' },
          },
        },
      ],
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [chapterWithReceipts, chapters[1]],
      activeChapter: chapterWithReceipts,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.label).toBe('蓝图缺口 2')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.scoreLabel).toBe('蓝图兑现 4/6')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.deliveredCount).toBe(4)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.totalCount).toBe(6)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.evidence.join('；')).toContain('先被伪证逼到绝境')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('核心回报')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补蓝图：蓝图缺口 2')
  })

  test('summarizes nested oh-story chapter blueprint receipts from raw payload', () => {
    const chapterWithNestedBlueprintReceipts = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        oh_story_delivery_receipts: {
          chapter_blueprint: {
            receipts: {
              opening_hook: { delivered: true, evidence: '前三百字落下认罪书。' },
              core_payoff: { delivered: false, evidence: '反证后没有写出读者期待的夺权爽点。' },
              ending_contract: { delivered: false, evidence: '章尾没有把下一章钩子递出去。' },
            },
          },
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [chapterWithNestedBlueprintReceipts, chapters[1]],
      activeChapter: chapterWithNestedBlueprintReceipts,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.blueprintReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.label).toBe('蓝图缺口 2')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.scoreLabel).toBe('蓝图兑现 1/3')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('核心回报')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.missed).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.blueprintReceipt?.evidence.join('；')).toContain('前三百字落下认罪书')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补蓝图：蓝图缺口 2')
  })

  test('shows storyline sync warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), storylineSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.storylineSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storylineSync?.label).toBe('漏推 1 · 额外推进 1 · 禁揭风险 1')
  })

  test('shows story unit sync warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), storyUnitSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.label).toBe('单元漏写 1 · 单元抢跑 2 · 禁抢跑 1')
    expect(model.chapterAcceptanceDesk.storyUnitSync?.riskCount).toBe(4)
  })

  test('shows discovered asset intake without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), assetIntakeReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.assetIntake?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.assetIntake?.label).toBe('新资产 2 待确认')
  })

  test('shows IP scene intake without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), ipSceneIntakeReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.status).toBe('ready')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.label).toBe('IP场面 2')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidateCount).toBe(2)
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].title).toBe('玻璃门内外对峙')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].visualHook).toContain('判定边界')
    expect(model.chapterAcceptanceDesk.ipSceneIntake?.candidates[0].adaptationValue).toContain('短剧')
  })

  test('shows core drift warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), coreDriftReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.coreDrift?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.coreDrift?.label).toBe('核心偏移 2')
    expect(model.chapterAcceptanceDesk.coreDrift?.scoreLabel).toBe('核心守恒 73')
  })

  test('shows million word runway warning without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), runwaySyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.runwaySync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.runwaySync?.label).toBe('航线风险 2')
    expect(model.chapterAcceptanceDesk.runwaySync?.scoreLabel).toBe('航线兑现 64')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items.join('｜')).toContain('补航线')
  })

  test('shows reader payoff debt without blocking ready acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview(), readerPayoffSyncReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.label).toBe('回报欠账 2')
    expect(model.chapterAcceptanceDesk.readerPayoffSync?.scoreLabel).toBe('回报兑现 64')
  })

  test('summarizes deslop gate diagnostics from the current prose quality review', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          self_check: {
            review: {
              score: 82,
              passed: true,
              status: 'pass',
              deslop_gate_diagnostics: {
                version: 'oh_story_deslop_gate_diagnostics_v1',
                total: 2,
                concern_gate_count: 1,
                summary: 'A-G 门禁 1 项需处理',
                gates: [
                  {
                    gate: 'B',
                    label: '主语重复',
                    status: 'warn',
                    count: 2,
                    evidence: ['连续三句都以谢怀安开头'],
                    fix: '把第二句改成动作或环境承接。',
                    patterns: ['谢怀安'],
                  },
                  {
                    gate: 'F',
                    label: '结尾总结',
                    status: 'pass',
                    count: 0,
                    evidence: [],
                    fix: '',
                    patterns: [],
                  },
                ],
              },
            },
          },
        },
      })],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.summary).toBe('A-G 门禁 1 项需处理')
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.concernGateCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates).toHaveLength(2)
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates[0]).toMatchObject({
      gate: 'B',
      label: '主语重复',
      status: 'warn',
      count: 2,
      fix: '把第二句改成动作或环境承接。',
    })
    expect(model.chapterAcceptanceDesk.deslopGateDiagnostics?.gates[0].evidence).toContain('连续三句都以谢怀安开头')
  })

  test('omits storyline sync summary when no storyline review exists', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storylineSync).toBeNull()
    expect(model.chapterAcceptanceDesk.assetIntake).toBeNull()
    expect(model.chapterAcceptanceDesk.coreDrift).toBeNull()
    expect(model.chapterAcceptanceDesk.readerPayoffSync).toBeNull()
  })

  test('passing quality for old prose needs current quality check after text changes', () => {
    const oldText = chapters[0].chapter_text
    const editedChapter = {
      ...chapters[0],
      chapter_text: `${oldText} 新增一段验收前自动保存的正文。`,
    }

    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [editedChapter, chapters[1]],
      activeChapter: editedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: oldText,
              review: {
                score: 82,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.latestQualityReviewId).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('passing quality with mismatched chapter updated time needs current quality check', () => {
    const updatedChapter = {
      ...chapters[0],
      updated_at: '2026-05-24T01:00:00.000Z',
    }

    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [updatedChapter, chapters[1]],
      activeChapter: updatedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            chapter_updated_at: '2026-05-24T00:00:00.000Z',
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.latestQualityReviewId).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
  })

  test('accepted prose chapter does not route back to draft generation', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.primaryActionKey).not.toBe('write_draft')
    expect(model.topStatus.primaryActionKey).toBe('accept_chapter_and_continue')
  })
})
