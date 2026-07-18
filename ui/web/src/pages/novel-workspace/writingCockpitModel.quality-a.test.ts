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

describe('buildWritingCockpitModel quality a', () => {
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

})
