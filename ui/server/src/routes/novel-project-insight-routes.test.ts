import { describe, expect, test } from 'bun:test'
import { buildLongformRepairAuditSummary } from './novel-project-insight-routes'

describe('longform repair audit summary', () => {
  test('records recovery evidence closure for day-end batch repair audit', () => {
    const run = {
      id: 42,
      output_ref: JSON.stringify({
        report: {
          summary: {
            avg_skeleton_score: 76,
            avg_material_score: 72,
            avg_quality_score: 79,
            avg_readiness: 75,
            failed_chapter_count: 0,
          },
          weak_count: 2,
        },
        tasks: [
          {
            source: 'auto_creation_safe_batch_risk',
            task_type: 'repair_quality',
            issue_type: 'recovery_evidence_mismatch',
            task_status: 'resolved',
            chapter_no: 42,
            title: '第42章恢复依据失效回修',
            message: '样章任务书复检通过，但正文仍有风格样章缺口。',
            recovery_evidence_review: {
              status: 'ok',
              summary: '恢复依据复检通过。',
              evidence: ['样章任务书复检通过 1 项', '第42章样章已重审', '读者回报已明确'],
              failed_items: [
                {
                  evidence: '样章任务书复检通过 1 项',
                  risk_labels: ['风格样章缺口 1 项'],
                },
              ],
              failed_evidence: [],
              repaired_evidence: ['第42章对白交锋已补回样章节奏', '章末读者回报已兑现'],
              watch_items: ['下一批继续观察样章策略命中率'],
            },
          },
          {
            source: 'auto_creation_safe_batch_risk',
            task_type: 'repair_quality',
            issue_type: 'reader_pull_missed',
            task_status: 'resolved',
            chapter_no: 43,
          },
        ],
      }),
    }
    const trends = {
      summary: {
        avg_skeleton_score: 78,
        avg_material_score: 77,
        avg_quality_score: 84,
        avg_readiness: 81,
        failed_chapter_count: 0,
      },
      weak_rows: [],
      recommendations: [],
    }

    const audit = buildLongformRepairAuditSummary(run, trends)

    expect(audit.recovery_evidence_closure).toEqual(expect.objectContaining({
      status: 'closed',
      total: 1,
      resolved: 1,
    }))
    expect(audit.recovery_evidence_closure.failed_evidence).toContain('样章任务书复检通过 1 项')
    expect(audit.recovery_evidence_closure.repaired_evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(audit.recovery_evidence_closure.repaired_evidence).toContain('章末读者回报已兑现')
    expect(audit.recovery_evidence_closure.watch_items).toContain('下一批继续观察样章策略命中率')
    expect(audit.recovery_evidence_closure.tasks[0]).toEqual(expect.objectContaining({
      chapter_no: 42,
      task_status: 'resolved',
    }))
    expect(audit.conclusion.join('')).toContain('恢复依据闭环 1/1')
  })

  test('emits governance recheck memory from recovery evidence audit for next-day preflight', () => {
    const run = {
      id: 44,
      output_ref: JSON.stringify({
        report: {
          summary: {
            avg_quality_score: 79,
            avg_readiness: 76,
            failed_chapter_count: 0,
          },
          weak_count: 1,
        },
        tasks: [
          {
            source: 'auto_creation_safe_batch_risk',
            task_type: 'repair_quality',
            issue_type: 'recovery_evidence_mismatch',
            task_status: 'resolved',
            chapter_no: 42,
            title: '第42章治理复查记忆回修',
            recovery_evidence_review: {
              status: 'ok',
              summary: '治理复查记忆已被本批正文继承。',
              failed_items: [
                {
                  evidence: '第42章对白交锋已补回样章节奏',
                  risk_labels: ['风格样章缺口 1 项'],
                },
              ],
              failed_evidence: [],
              repaired_evidence: ['批次验收确认对白交锋已继承'],
              watch_items: ['下一批继续观察样章策略命中率'],
            },
          },
        ],
      }),
    }
    const trends = {
      summary: {
        avg_quality_score: 86,
        avg_readiness: 83,
        failed_chapter_count: 0,
      },
      weak_rows: [],
      recommendations: [],
    }

    const audit = buildLongformRepairAuditSummary(run, trends)

    expect(audit.governance_recheck_memory).toEqual(expect.objectContaining({
      source_run_id: 44,
      status: 'closed',
      label: '治理复查已记录',
    }))
    expect(audit.governance_recheck_memory.summary).toContain('恢复依据闭环 1/1')
    expect(audit.governance_recheck_memory.evidence).toContain('批次验收确认对白交锋已继承')
    expect(audit.governance_recheck_memory.failed_evidence).toEqual([])
    expect(audit.governance_recheck_memory.watch_items).toContain('下一批继续观察样章策略命中率')
  })

  test('deposits single-chapter governance recheck repairs into governance memory audit', () => {
    const run = {
      id: 45,
      output_ref: JSON.stringify({
        report: {
          summary: {
            avg_quality_score: 80,
            avg_readiness: 78,
            failed_chapter_count: 0,
          },
          weak_count: 1,
        },
        tasks: [
          {
            source: 'review_annotation_risk',
            task_type: 'repair_quality',
            issue_type: 'recovery_evidence_mismatch',
            annotation_source: 'governance_recheck_sync',
            annotation_category: 'recovery_evidence',
            task_status: 'resolved',
            chapter_no: 42,
            title: '第42章单章恢复依据回修',
            recovery_evidence_review: {
              status: 'ok',
              summary: '单章治理复查已接住修后证据。',
              failed_evidence: [],
              repaired_evidence: ['第42章对白交锋已补回样章节奏'],
              watch_items: ['下一章继续观察样章策略命中率'],
            },
          },
        ],
      }),
    }
    const trends = {
      summary: {
        avg_quality_score: 87,
        avg_readiness: 84,
        failed_chapter_count: 0,
      },
      weak_rows: [],
      recommendations: [],
    }

    const audit = buildLongformRepairAuditSummary(run, trends)

    expect(audit.recovery_evidence_closure).toEqual(expect.objectContaining({
      status: 'closed',
      total: 1,
      resolved: 1,
      single_chapter_count: 1,
      batch_count: 0,
    }))
    expect(audit.recovery_evidence_closure.sources).toContain('single_chapter_governance_recheck')
    expect(audit.recovery_evidence_closure.tasks[0]).toEqual(expect.objectContaining({
      source: 'single_chapter_governance_recheck',
      source_label: '单章治理复查',
      chapter_no: 42,
    }))
    expect(audit.governance_recheck_memory.summary).toContain('单章治理复查')
    expect(audit.governance_recheck_memory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(audit.governance_recheck_memory.watch_items).toContain('下一章继续观察样章策略命中率')
    expect(audit.governance_recheck_memory.source_modes).toContain('single_chapter_governance_recheck')
    expect(audit.conclusion.join('')).toContain('单章治理复查')
  })

  test('keeps recovery evidence audit open when residual failed evidence remains', () => {
    const run = {
      id: 43,
      output_ref: JSON.stringify({
        report: { summary: {}, weak_count: 1 },
        tasks: [
          {
            task_type: 'repair_quality',
            issue_type: 'recovery_evidence_mismatch',
            task_status: 'needs_review',
            chapter_no: 45,
            message: '主线闭环依据没有兑现。',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['主线焦点已明确'],
              failed_items: [
                {
                  evidence: '主线焦点已明确',
                  risk_labels: ['主线/剧情线风险 1 项'],
                },
              ],
            },
          },
        ],
      }),
    }
    const trends = {
      summary: {},
      weak_rows: [
        {
          chapter_no: 45,
          title: '暗线失焦',
          status: 'quality_attention',
          readiness: 62,
          quality_score: 68,
        },
      ],
      recommendations: ['先复查剧情线兑现。'],
    }

    const audit = buildLongformRepairAuditSummary(run, trends)

    expect(audit.recovery_evidence_closure.status).toBe('needs_followup')
    expect(audit.recovery_evidence_closure.failed_evidence).toContain('主线焦点已明确')
    expect(audit.recovery_evidence_closure.watch_items.join('')).toContain('第45章仍需关注')
    expect(audit.recovery_evidence_closure.watch_items.join('')).toContain('主线/剧情线风险 1 项')
  })
})
