import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear b', () => {
  test('keeps source readiness repair tasks open until source readiness checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'warn',
                evidence: '正文仍把黑色钥匙当成已解锁道具。',
                fix: '补角色确认钥匙来源和限制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('来源就绪仍未闭环')
    expect(residual.note).toContain('黑色钥匙状态')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('source_name')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: 'ready',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: 'ready',
                evidence: 'ready',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const shortGenericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: '已就绪',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: 'ok',
                evidence: 'ok',
                fix: '已确认。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(shortGenericEvidence.taskStatus).toBe('needs_review')
    expect(shortGenericEvidence.annotationStatus).toBe('')
    expect(shortGenericEvidence.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: '已读取并确认未解锁',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                fix: '补来源路径、读取状态、事实边界和正文证据。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('来源就绪复检通过')
    expect(cleared.note).toContain('source_readiness_checks')

    const nestedReceiptCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                source_readiness_checks: [
                  {
                    key: 'artifact_state',
                    label: '黑色钥匙状态',
                    status: 'pass',
                    source_name: '黑色钥匙',
                    source_path: '设定/资产.md',
                    read_status: '已读取并确认未解锁',
                    used_as_fact: '只能触发禁门验纹，不能直接开门',
                    chapter_evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                    evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                    fix: '补来源路径、读取状态、事实边界和正文证据。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(nestedReceiptCleared.taskStatus).toBe('resolved')
    expect(nestedReceiptCleared.annotationStatus).toBe('resolved')
    expect(nestedReceiptCleared.note).toContain('source_readiness_checks')
  })

  test('keeps state tracking repair tasks open until state tracking checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'warn',
                evidence: '正文仍让周远直接出手，但上一章状态是昏迷未醒。',
                fix: '补周远苏醒代价和行动限制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('状态跟踪仍未闭环')
    expect(residual.note).toContain('周远状态')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                evidence: '正文先写周远苏醒代价和行动限制，再让他参与本章选择。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('state_subject')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                state_subject: '周远',
                state_type: 'character',
                previous_state: '昏迷未醒',
                allowed_state: '短暂苏醒但行动受限',
                used_in_chapter: '只能提醒主角，不直接出手',
                evidence: '已确认。',
                excluded_reason: '无排除项',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const genericSourceExcerpt = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericSourceExcerpt.taskStatus).toBe('needs_review')
    expect(genericSourceExcerpt.annotationStatus).toBe('')
    expect(genericSourceExcerpt.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                state_subject: '周远',
                state_type: 'character',
                previous_state: '昏迷未醒',
                allowed_state: '短暂苏醒但行动受限',
                used_in_chapter: '只能提醒主角，不直接出手',
                evidence: '正文先写周远苏醒代价和行动限制，再让他参与本章选择。',
                excluded_reason: '无排除项',
                fix: '补苏醒代价、行动限制和本章使用边界。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('状态跟踪复检通过')
    expect(cleared.note).toContain('state_tracking_checks')
  })

  test('keeps story state update repair tasks open until tracking writes clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'warn',
                evidence: '周远伤势变化没有写入 character_updates，缺 source_excerpt。',
                fix: '补追踪/角色状态.md 对应写回证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('状态写回仍未闭环')
    expect(residual.note).toContain('角色状态未写回')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                evidence: 'character_updates 已写入周远伤势变化，并带 source_excerpt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('state_domain')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '已同步。',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const genericSourceExcerptForStateUpdate = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericSourceExcerptForStateUpdate.taskStatus).toBe('needs_review')
    expect(genericSourceExcerptForStateUpdate.annotationStatus).toBe('')
    expect(genericSourceExcerptForStateUpdate.note).toContain('证据泛化')

    const shortEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '无',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(shortEvidence.taskStatus).toBe('needs_review')
    expect(shortEvidence.annotationStatus).toBe('')
    expect(shortEvidence.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '周远醒来只撑住半句话，手臂仍不能抬。',
                evidence: 'character_updates 已写入周远伤势变化，并带 source_excerpt。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('状态写回复检通过')
    expect(cleared.note).toContain('story_state_update_checks')
  })

  test('keeps chapter handoff repair tasks open until handoff checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'warn',
                evidence: '前300字没有接住阵盘第二道裂纹。',
                fix: '开篇先写裂纹造成的现场压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章首承接仍未闭环')
    expect(residual.note).toContain('上一章最后一幕')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'pass',
                evidence: '开篇前300字先写阵盘第二道裂纹压住众人。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('章首承接仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('previous_handoff')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'pass',
                previous_handoff: '上一章阵盘裂开第二道缝，众人等待主角回应。',
                opening_obligation: '前300字必须接住裂纹压力和当场选择。',
                opening_evidence: '开篇前300字先写阵盘第二道裂纹压住众人，主角被迫当场选择。',
                location: '前300字：阵盘第二道裂纹压住众人。',
                continuity_action: '主角立刻处理裂纹造成的现场压力。',
                evidence: '开篇前300字先写阵盘第二道裂纹压住众人，主角被迫当场选择。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章首承接复检通过')
    expect(cleared.note).toContain('chapter_handoff_checks')
  })

  test('keeps reader expectation opening handoff debts open until handoff checks clear', () => {
    const task = {
      source: 'review_annotation_risk',
      issue_type: 'reader_expectation_debt',
      annotation_category: 'reader_expectation',
      annotation_key: 'reader_expectation_sync:303:3:3:reader_expectation_debt:期待欠账 1',
      payload: {
        status: 'warn',
        missed: [
          {
            key: 'opening_handoff',
            label: '上一章承接',
            text: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
            match_scope: 'opening',
          },
        ],
      },
    }

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 86,
        review: {
          chapter_handoff_checks: [
            {
              key: 'previous_handoff',
              label: '上一章最后一幕',
              status: 'warn',
              evidence: '前300字没有接住湿漉漉学生敲玻璃门。',
              fix: '开篇先写门外学生造成的直接压力。',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章首承接仍未闭环')
    expect(residual.note).toContain('上一章最后一幕')

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 90,
        review: {
          chapter_handoff_checks: [
            {
              key: 'previous_handoff',
              label: '上一章最后一幕',
              status: 'pass',
              previous_handoff: '上一章湿漉漉学生敲响玻璃门，林晓警告不能开门。',
              opening_obligation: '前300字必须接住门外学生和不能开门的选择压力。',
              opening_evidence: '开篇前300字先写门外学生敲玻璃门和林晓不能开门的直接反应。',
              location: '前300字：门外学生敲玻璃门，林晓压住门把。',
              continuity_action: '林晓立刻处理不能开门和门外求救之间的冲突。',
              evidence: '开篇前300字先写门外学生敲玻璃门和林晓不能开门的直接反应。',
              remaining_risk: '',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章首承接复检通过')
    expect(cleared.note).toContain('chapter_handoff_checks')
  })

})
