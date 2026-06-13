import { describe, expect, test } from 'bun:test'
import {
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewActionFeedbackKey,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRecoveryEvidenceReviewResolvedFeedback,
  buildRecoveryEvidenceReviewRowAction,
  buildRecoveryEvidenceReviewRows,
  buildRepairClosureHighlights,
  recoveryEvidenceSourceRecheckAction,
  repairTaskActionLabel,
} from './TaskCenterDrawer'

describe('buildRepairClosureHighlights', () => {
  test('summarizes resolved delivery risk repair tasks for task center closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        task_status: 'resolved',
        chapter_no: 7,
        title: '旧规反噬',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'core_drift',
        task_status: 'needs_review',
        chapter_no: 8,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '爆点风险已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['volume_beat_missed'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第7章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('groups resolved safe-batch repair aliases by longform risk category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_pull_missed',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_expectation_debt',
        task_status: 'resolved',
        chapter_no: 10,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'innovation_execution_missed',
        task_status: 'resolved',
        chapter_no: 11,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(['追读风险已清', '创新风险已清'])
    expect(highlights[0]?.count).toBe(2)
    expect(highlights[0]?.chapterNos).toEqual([9, 10])
    expect(highlights[0]?.issueTypes).toEqual(['reader_pull_missed', 'reader_expectation_debt'])
    expect(highlights[0]?.detail).toContain('第9、10章')
  })

  test('groups resolved recovery evidence repairs as closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
        task_status: 'resolved',
        chapter_no: 41,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'recovery_evidence',
        label: '恢复依据风险已清',
        count: 1,
        chapterNos: [41],
        issueTypes: ['recovery_evidence_mismatch'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('恢复依据风险已处理')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('ignores open repair tasks and non-risk maintenance tasks', () => {
    const highlights = buildRepairClosureHighlights([
      { issue_type: 'reader_pull_missed', task_status: 'needs_review', chapter_no: 9 },
      { task_type: 'repair_materials', task_status: 'resolved', chapter_no: 1 },
    ])

    expect(highlights).toEqual([])
  })
})

describe('buildRecoveryEvidenceAuditView', () => {
  test('maps recovery evidence closure into task center audit rows', () => {
    const view = buildRecoveryEvidenceAuditView({
      status: 'closed',
      governance_recheck_memory: {
        source_run_id: 44,
        status: 'closed',
        label: '治理复查已记录',
        summary: '恢复依据闭环 1/1，批次验收结果已写入次日生产记忆。',
        evidence: ['批次验收确认对白交锋已继承'],
        watch_items: ['下一批继续观察样章策略命中率'],
      },
      recovery_evidence_closure: {
        status: 'closed',
        total: 3,
        resolved: 3,
        single_chapter_count: 1,
        batch_count: 2,
        sources: ['single_chapter_governance_recheck', 'safe_batch_recovery_recheck'],
        failed_evidence: ['样章任务书复检通过 1 项'],
        repaired_evidence: ['第42章对白交锋已补回样章节奏'],
        watch_items: ['下一批继续观察样章策略命中率'],
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'resolved',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            title: '第42章恢复依据失效回修',
            summary: '恢复依据复检通过。',
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'resolved',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            title: '第43章批次恢复依据回修',
            summary: '批次恢复复查通过。',
          },
        ],
      },
    })

    expect(view).toEqual(expect.objectContaining({
      status: 'closed',
      label: '恢复依据审计',
      total: 3,
      resolved: 3,
      sourceSummary: '单章治理复查 1；批次恢复复查 2',
      sourceRunId: 44,
      memoryLabel: '治理复查已记录',
      memorySummary: '恢复依据闭环 1/1，批次验收结果已写入次日生产记忆。',
      failedEvidence: ['样章任务书复检通过 1 项'],
      repairedEvidence: ['批次验收确认对白交锋已继承', '第42章对白交锋已补回样章节奏'],
      watchItems: ['下一批继续观察样章策略命中率'],
    }))
    expect(view?.sourceGroups).toEqual([
      expect.objectContaining({
        source: 'single_chapter_governance_recheck',
        label: '单章治理复查',
        count: 1,
        taskIndexes: [0],
        chapterNos: [42],
        recheckAction: 'single_chapter_governance_recheck',
        recheckLabel: '复检单章',
      }),
      expect.objectContaining({
        source: 'safe_batch_recovery_recheck',
        label: '批次恢复复查',
        count: 1,
        taskIndexes: [1],
        chapterNos: [43],
        recheckAction: 'safe_batch_recovery_recheck',
        recheckLabel: '复盘批次',
      }),
    ])
    expect(view?.relatedTasks).toEqual([
      expect.objectContaining({
        chapterId: 420,
        chapterNo: 42,
        taskIndex: 0,
        status: 'resolved',
        source: 'single_chapter_governance_recheck',
        sourceLabel: '单章治理复查',
        title: '第42章恢复依据失效回修',
      }),
      expect.objectContaining({
        chapterId: 421,
        chapterNo: 43,
        taskIndex: 1,
        status: 'resolved',
        source: 'safe_batch_recovery_recheck',
        sourceLabel: '批次恢复复查',
        title: '第43章批次恢复依据回修',
      }),
    ])
  })

  test('merges latest task recheck results into source groups', () => {
    const audit = {
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'needs_review',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            title: '第42章恢复依据失效回修',
            recovery_evidence_review: {
              status: 'warn',
              summary: '单章仍缺少样章对白执行。',
              failed_evidence: ['样章对白执行仍未落地'],
            },
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            title: '第43章批次恢复依据回修',
            recovery_evidence_review: {
              status: 'warn',
              summary: '批次复盘仍有恢复依据未落地。',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    }
    const latestTasks = [
      {
        chapter_id: 420,
        chapter_no: 42,
        task_status: 'resolved',
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
        annotation_category: 'recovery_evidence',
        status_note: '单章治理复查通过，governance_recheck_sync failed_evidence 已清空。',
        recovery_evidence_review: {
          status: 'ok',
          summary: '单章治理复查通过，证据已写入正文。',
          failed_evidence: [],
          repaired_evidence: ['第42章对白交锋已补回样章节奏'],
        },
      },
      {
        chapter_id: 421,
        chapter_no: 43,
        task_status: 'needs_review',
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
        segment: '第43-45章',
        recovery_evidence_review: {
          status: 'warn',
          summary: '批次复盘仍有恢复依据未落地。',
          failed_evidence: ['第43章读者回报仍未继承'],
        },
      },
    ]

    const view = buildRecoveryEvidenceAuditView(audit, latestTasks)
    const singleGroup = view?.sourceGroups.find(group => group.source === 'single_chapter_governance_recheck')
    const batchGroup = view?.sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck')

    expect(singleGroup).toEqual(expect.objectContaining({
      resultStatus: 'closed',
      resultLabel: '已闭环',
      latestSummary: '单章治理复查通过，证据已写入正文。',
      residualEvidence: [],
      productionBlockStatus: 'cleared',
      productionBlockLabel: '生产阻断已解除',
      productionBlockDetail: '该来源已复检闭环，可作为恢复安全连写依据。',
    }))
    expect(batchGroup).toEqual(expect.objectContaining({
      resultStatus: 'needs_followup',
      resultLabel: '仍需复查',
      latestSummary: '批次复盘仍有恢复依据未落地。',
      residualEvidence: ['第43章读者回报仍未继承'],
      productionBlockStatus: 'blocked',
      productionBlockLabel: '暂缓安全连写',
      productionBlockDetail: '残留依据未闭环，先定位批次任务并完成批次回修，再复盘后继续安全连写。',
    }))
  })

  test('marks pending source rechecks as waiting before safe batching resumes', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 1,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
        ],
      },
    })

    expect(view?.sourceGroups[0]).toEqual(expect.objectContaining({
      resultStatus: 'pending',
      productionBlockStatus: 'pending',
      productionBlockLabel: '等待复检结论',
      productionBlockDetail: '先完成来源复检，再决定是否恢复安全连写。',
    }))
  })

  test('exposes the next residual action for each source group', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'needs_review',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['样章对白执行仍未落地'],
            },
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    })

    expect(view?.sourceGroups.find(group => group.source === 'single_chapter_governance_recheck')).toEqual(expect.objectContaining({
      residualAction: 'revision',
      residualActionLabel: '回修依据',
    }))
    expect(view?.sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck')).toEqual(expect.objectContaining({
      residualAction: 'focus_task',
      residualActionLabel: '定位批次任务',
    }))
  })

  test('exposes a single main action for unresolved recovery evidence sources', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    })

    expect(view?.nextAction).toEqual(expect.objectContaining({
      action: 'focus_task',
      label: '定位批次任务',
      source: 'safe_batch_recovery_recheck',
      sourceLabel: '批次恢复复查',
      taskIndex: 1,
      residualEvidence: ['第43章读者回报仍未继承'],
    }))
  })

  test('uses single-chapter recheck as the main action when the source is waiting for a conclusion', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 1,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
        ],
      },
    })

    expect(view?.nextAction).toEqual(expect.objectContaining({
      action: 'recheck_single_chapter',
      label: '复检单章',
      source: 'single_chapter_governance_recheck',
      taskIndex: 0,
    }))
  })

  test('hides recovery evidence audit when there is no closure payload', () => {
    expect(buildRecoveryEvidenceAuditView({ status: 'closed' })).toBeNull()
  })
})

describe('recoveryEvidenceSourceRecheckAction', () => {
  test('routes source groups to the natural recheck action', () => {
    expect(recoveryEvidenceSourceRecheckAction('single_chapter_governance_recheck')).toEqual({
      action: 'single_chapter_governance_recheck',
      label: '复检单章',
    })
    expect(recoveryEvidenceSourceRecheckAction('safe_batch_recovery_recheck')).toEqual({
      action: 'safe_batch_recovery_recheck',
      label: '复盘批次',
    })
    expect(recoveryEvidenceSourceRecheckAction('recovery_evidence_recheck')).toEqual({
      action: '',
      label: '',
    })
  })
})

describe('buildRecoveryEvidenceReviewRows', () => {
  test('keeps source details and source actions visible for failed recovery evidence', () => {
    const rows = buildRecoveryEvidenceReviewRows({
      issue_type: 'recovery_evidence_mismatch',
      recovery_evidence_review: {
        status: 'warn',
        failed_items: [
          {
            evidence: '单章治理复查：生产阻断已解除',
            source: 'recovery_evidence_production_gate',
            source_label: '入口生产闸门',
            source_detail: '单章治理复查 · 生产阻断已解除',
            source_action_label: '复检单章',
            risk_labels: ['恢复依据来源继承风险 2 项'],
          },
          {
            evidence: '第42章对白交锋已补回样章节奏',
            source: 'governance_recheck_memory',
            source_label: '治理复查记忆',
            source_detail: '治理复查记忆 · 修后证据',
            source_action_label: '治理复查台',
            risk_labels: ['风格样章缺口 1 项'],
          },
        ],
      },
    })

    expect(rows).toEqual([
      expect.objectContaining({
        evidence: '单章治理复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        sourceLabel: '入口生产闸门',
        sourceDetail: '单章治理复查 · 生产阻断已解除',
        sourceActionLabel: '复检单章',
        riskLabels: ['恢复依据来源继承风险 2 项'],
      }),
      expect.objectContaining({
        evidence: '第42章对白交锋已补回样章节奏',
        source: 'governance_recheck_memory',
        sourceLabel: '治理复查记忆',
        sourceDetail: '治理复查记忆 · 修后证据',
        sourceActionLabel: '治理复查台',
        riskLabels: ['风格样章缺口 1 项'],
      }),
    ])
  })
})

describe('buildRecoveryEvidenceReviewRowAction', () => {
  test('routes recovery evidence source rows to the natural clickable action', () => {
    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    })).toEqual({
      action: 'recheck_single_chapter',
      label: '复检单章',
      focusSource: 'single_chapter_governance_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '批次恢复复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '批次恢复复查 · 生产阻断已解除',
      sourceAction: 'safe_batch_recovery_recheck',
      sourceActionLabel: '复盘批次',
      productionGateSource: 'safe_batch_recovery_recheck',
    })).toEqual({
      action: 'recheck_safe_batch',
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '第42章对白交锋已补回样章节奏',
      riskLabels: [],
      source: 'governance_recheck_memory',
      sourceLabel: '治理复查记忆',
      sourceDetail: '治理复查记忆 · 修后证据',
      sourceAction: 'review_governance_closure',
      sourceActionLabel: '治理复查台',
      productionGateSource: '',
    })).toEqual({
      action: 'review_governance_closure',
      label: '治理复查台',
      focusSource: '',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '样章任务书复检通过 1 项',
      riskLabels: [],
      source: 'recovery_evidence',
      sourceLabel: '恢复放行依据',
      sourceDetail: '安全连写预检 · 恢复放行依据',
      sourceAction: 'create_safe_batch_risk_repair',
      sourceActionLabel: '按批次修订',
      productionGateSource: '',
    })).toEqual({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    })
  })
})

describe('buildRecoveryEvidenceReviewActionFeedback', () => {
  test('summarizes the triggered action and next closure condition for a recovery evidence row', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewActionFeedbackKey(2, row, rowAction)).toBe(
      '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
    )
    expect(buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')).toEqual({
      statusLabel: '已触发复检单章',
      triggeredAt: '14:20',
      closureCondition: '关闭条件：单章复查为 ok 或 failed_evidence 为空。',
      detail: '最近动作：复检单章 · 14:20 · 已触发，等待复检结果回填。',
    })
  })

  test('uses batch repair closure wording for release evidence revision actions', () => {
    expect(buildRecoveryEvidenceReviewActionFeedback({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    }, '15:05')).toEqual(expect.objectContaining({
      statusLabel: '已触发按批次修订',
      triggeredAt: '15:05',
      closureCondition: '关闭条件：完成批次修订并重新运行批次交稿复盘，recovery_evidence_review 为 ok。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewRefreshAnchor', () => {
  test('records the row and source task focus after refreshing a recovery evidence action', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex: 2,
      row,
      rowAction,
      sourceTaskIndex: 5,
      refreshedAt: '14:22',
    })).toEqual({
      feedbackKey: '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
      taskIndex: 2,
      sourceTaskIndex: 5,
      focusSource: 'single_chapter_governance_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })
  })
})

describe('buildRecoveryEvidenceReviewRefreshFeedback', () => {
  test('turns local action feedback into a refreshed inline status while keeping closure guidance', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')
    const feedback = buildRecoveryEvidenceReviewRefreshFeedback(localFeedback, {
      feedbackKey: 'feedback-key',
      taskIndex: 3,
      sourceTaskIndex: 4,
      focusSource: 'safe_batch_recovery_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已刷新结果',
      triggeredAt: '14:22',
      closureCondition: localFeedback.closureCondition,
    }))
    expect(feedback.detail).toContain('已刷新结果')
    expect(feedback.detail).toContain('刷新后继续定位此依据')
  })

  test('does not override a real running status with the refreshed local status', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewRefreshFeedback(
      buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20'),
      {
        feedbackKey: 'feedback-key',
        taskIndex: 3,
        sourceTaskIndex: 4,
        focusSource: 'safe_batch_recovery_recheck',
        refreshedAt: '14:22',
        statusLabel: '已刷新结果',
      },
    )

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewResolvedFeedback', () => {
  test('marks a recovery evidence row as running from a matching repair audit run', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          step_name: 'repair-audit',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      triggeredAt: '实时状态',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })

  test('keeps local feedback when a completed repair run has no audit refresh payload', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'completed',
          output_ref: JSON.stringify({ tasks: [{ issue_type: 'recovery_evidence_mismatch' }] }),
          created_at: '2026-06-13T09:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(localFeedback)
  })

  test('marks a recovery evidence row as backfilled after the task review clears failed evidence', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          failed_items: [],
        },
      },
      rowAction: {
        action: 'execute_typed_repair' as const,
        label: '按批次修订',
        focusSource: '',
      },
      runRecords: [],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      detail: '最近动作：按批次修订 · 已回填 · 恢复依据复盘已清空失效项。',
    }))
  })

  test('marks a single-chapter recheck row as retryable when the matching quality run fails', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        chapter_id: 42,
        annotation_source: 'governance_recheck_sync',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章对白交锋未继承'],
        },
      },
      rowAction: {
        action: 'recheck_single_chapter' as const,
        label: '复检单章',
        focusSource: 'single_chapter_governance_recheck',
      },
      runRecords: [
        {
          id: 92,
          run_type: 'prose_quality',
          status: 'failed',
          input_ref: JSON.stringify({ chapter_id: 42, source: 'governance_recheck_sync' }),
          error_message: '模型超时',
          created_at: '2026-06-13T10:03:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '失败需重试',
      triggeredAt: '实时状态',
      detail: '最近动作：复检单章 · 失败需重试 · 模型超时',
    }))
  })
})

describe('repairTaskActionLabel', () => {
  test('labels single-chapter governance recheck recovery evidence tasks as evidence repair', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'recovery_evidence_mismatch',
      annotation_source: 'governance_recheck_sync',
      annotation_category: 'recovery_evidence',
      chapter_no: 42,
    })).toBe('回修依据')
  })

  test('keeps batch recovery evidence repairs on the batch revision action', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'recovery_evidence_mismatch',
      segment: '第41-43章',
    })).toBe('按批次修订')
  })

  test('labels recovery evidence governance queue actions by their closure flow', () => {
    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'revision',
    })).toBe('回修依据并复检')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_single_chapter',
    })).toBe('复检单章')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_safe_batch',
    })).toBe('复盘批次')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'focus_task',
    })).toBe('已处理并复盘')
  })
})
