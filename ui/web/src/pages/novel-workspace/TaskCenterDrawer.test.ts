import { describe, expect, test } from 'bun:test'
import { buildRecoveryEvidenceAuditView, buildRepairClosureHighlights } from './TaskCenterDrawer'

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
      recovery_evidence_closure: {
        status: 'closed',
        total: 1,
        resolved: 1,
        failed_evidence: ['样章任务书复检通过 1 项'],
        repaired_evidence: ['第42章对白交锋已补回样章节奏'],
        watch_items: ['下一批继续观察样章策略命中率'],
      },
    })

    expect(view).toEqual(expect.objectContaining({
      status: 'closed',
      label: '恢复依据审计',
      total: 1,
      resolved: 1,
      failedEvidence: ['样章任务书复检通过 1 项'],
      repairedEvidence: ['第42章对白交锋已补回样章节奏'],
      watchItems: ['下一批继续观察样章策略命中率'],
    }))
  })

  test('hides recovery evidence audit when there is no closure payload', () => {
    expect(buildRecoveryEvidenceAuditView({ status: 'closed' })).toBeNull()
  })
})
