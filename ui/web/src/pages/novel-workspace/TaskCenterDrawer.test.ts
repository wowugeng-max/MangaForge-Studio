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
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildPostBatchQualityCheckSummary,
  buildNextChapterQualityPlanPreview,
  buildRepairClosureHighlights,
  buildRepairTaskIssueTagMeta,
  buildTaskRunCardModel,
  buildChapterAdmissionWarningCards,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryFocusReviewState,
  chapterGroupActionState,
  chapterGroupRunActionState,
  recoveryEvidenceSourceRecheckAction,
  repairTaskActionLabel,
  safeBatchRecoveryFocusMatchesTask,
} from './TaskCenterDrawer'

describe('buildTaskRunCardModel', () => {
  test('summarizes repair runs with lifecycle, operation mode, timeline, closure and one primary action', () => {
    const model = buildTaskRunCardModel({
      id: 17,
      run_type: 'longform_production_repair',
      status: 'ready',
      step_name: 'reader-trial-repair-1',
      created_at: '2026-06-30T08:10:00.000Z',
      updated_at: '2026-06-30T08:15:00.000Z',
      output_ref: JSON.stringify({
        tasks: [
          { task_status: 'open', title: '补章末追读' },
          { task_status: 'needs_review', title: '复查试读修复' },
          { task_status: 'resolved', title: '补开篇钩子' },
        ],
      }),
    }, { canProcessRepairTasks: true })

    expect(model.lifecycle.label).toBe('待启动')
    expect(model.execution.label).toBe('手工处理')
    expect(model.timeline).toEqual([
      { key: 'created', label: '创建', value: '2026-06-30 16:10' },
      { key: 'started', label: '开始', value: '未开始' },
      { key: 'ended', label: '结束', value: '未结束' },
      { key: 'updated', label: '更新', value: '2026-06-30 16:15' },
    ])
    expect(model.closure).toMatchObject({
      total: 3,
      pending: 1,
      needsReview: 1,
      resolved: 1,
      failed: 0,
      summary: '待处理 1 项，需复查 1 项，已完成 1/3',
    })
    expect(model.primaryAction).toEqual({ key: 'process_repair', label: '处理下一项' })
  })

  test('marks unattended and completed runs without adding a primary action', () => {
    const model = buildTaskRunCardModel({
      id: 18,
      run_type: 'chapter_group_generation',
      status: 'completed',
      step_name: 'unattended-to-10',
      input_ref: JSON.stringify({ unattended: { enabled: true } }),
      output_ref: JSON.stringify({ chapters: [{ status: 'success' }, { status: 'success' }] }),
      started_at: '2026-06-30T09:00:00.000Z',
      completed_at: '2026-06-30T09:05:00.000Z',
    })

    expect(model.lifecycle.label).toBe('已完成')
    expect(model.execution.label).toBe('自动运行')
    expect(model.closure.summary).toBe('已完成 2/2')
    expect(model.primaryAction).toEqual({ key: 'none', label: '' })
  })

  test('director stage summarizes oh-story director stage, blocking status and lifecycle metadata', () => {
    const model = buildTaskRunCardModel({
      id: 19,
      run_type: 'generate_prose',
      status: 'completed',
      created_at: '2026-06-30T08:10:00.000Z',
      started_at: '2026-06-30T08:12:00.000Z',
      completed_at: '2026-06-30T08:18:00.000Z',
      input: { unattended: true },
      payload: {
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
          required_repairs: [{ key: 'blueprint', label: '补蓝图', blocking: true }],
        },
      },
    })

    expect(model.execution.key).toBe('auto')
    expect(model.directorStage?.key).toBe('pre_draft')
    expect(model.directorStage?.label).toBe('写前准备')
    expect(model.blocking.key).toBe('blocking')
    expect(model.timeline.find(item => item.key === 'started')?.value).toContain('2026')
    expect(model.timeline.find(item => item.key === 'ended')?.value).toContain('2026')
  })

  test('director stage marks ready post-draft director runs as non-blocking', () => {
    const model = buildTaskRunCardModel({
      id: 20,
      run_type: 'generate_prose',
      status: 'completed',
      output_ref: JSON.stringify({
        ohStoryDirector: {
          stage: 'post_draft',
          readiness: 'ready',
          requiredRepairs: [],
        },
      }),
    })

    expect(model.directorStage?.label).toBe('写后诊断')
    expect(model.blocking.key).toBe('non_blocking')
    expect(model.blocking.label).toBe('不阻塞')
  })

  test('director stage reads director metadata from payload when output ref has no director', () => {
    const model = buildTaskRunCardModel({
      id: 21,
      run_type: 'generate_prose',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: [] }),
      payload: {
        oh_story_director: {
          stage: 'handoff',
          readiness: 'needs_user_confirmation',
          required_repairs: [{ blocking: true }],
        },
      },
    })

    expect(model.directorStage?.key).toBe('handoff')
    expect(model.directorStage?.label).toBe('章节交接')
    expect(model.blocking.key).toBe('blocking')
  })

  test('director stage reads director metadata from input context package when input ref has no director', () => {
    const model = buildTaskRunCardModel({
      id: 22,
      run_type: 'generate_prose',
      status: 'completed',
      input_ref: JSON.stringify({ unattended: false }),
      input: {
        contextPackage: {
          ohStoryDirector: {
            stage: 'drafting',
            readiness: 'ready',
            requiredRepairs: [],
          },
        },
      },
    })

    expect(model.directorStage?.key).toBe('drafting')
    expect(model.directorStage?.label).toBe('正文生成')
    expect(model.blocking.key).toBe('non_blocking')
  })

  test('summarizes admitted chapter warnings once per source without approval action', () => {
    const run = {
      id: 23,
      run_type: 'chapter_group_generation',
      status: 'completed',
      output_ref: JSON.stringify({
        chapters: [{
          id: 903,
          chapter_no: 23,
          status: 'success',
          admission_status: 'accepted_with_warnings',
          story_state_status: 'pending',
          quality_warnings: [
            { source: 'quality', code: 'hook_weak', message: '章尾钩子偏弱' },
            { source: 'quality', code: 'score_low', message: '评分低于建议目标' },
          ],
          warnings: [
            { source: 'quality', code: 'hook_weak', message: '章尾钩子偏弱' },
            { source: 'story_state', code: 'pending', message: 'Story State 同步待完成。' },
            { source: 'story_state', code: 'index_pending', message: '状态索引稍后补齐' },
          ],
        }],
      }),
    }

    const cards = buildChapterAdmissionWarningCards(run)
    const actionState = chapterGroupActionState(JSON.parse(run.output_ref).chapters[0])

    expect(cards).toHaveLength(2)
    expect(cards.map(card => card.source)).toEqual(['quality', 'story_state'])
    expect(cards[0]?.title).toBe('已入库，建议修订')
    expect(cards[0]?.messages).toEqual(['章尾钩子偏弱', '评分低于建议目标'])
    expect(cards[1]?.title).toBe('正文已入库，故事状态待补同步')
    expect(cards[1]?.messages).toEqual(['Story State 同步待完成。', '状态索引稍后补齐'])
    expect(actionState.canApprove).toBe(false)
  })

  test('deduplicates the same warning across chapters while retaining every chapter number', () => {
    const cards = buildChapterAdmissionWarningCards({
      run_type: 'chapter_group_generation',
      status: 'completed',
      output_ref: JSON.stringify({
        chapters: [11, 12].map(chapterNo => ({
          chapter_no: chapterNo,
          status: 'success',
          admission_status: 'accepted_with_warnings',
          story_state_status: 'pending',
          warnings: [{ source: 'story_state', code: 'pending', message: 'Story State 同步待完成。' }],
        })),
      }),
    })

    expect(cards).toHaveLength(1)
    expect(cards[0]?.messages).toEqual(['Story State 同步待完成。'])
    expect(cards[0]?.chapterNos).toEqual([11, 12])
  })
})

describe('buildPostBatchQualityCheckSummary', () => {
  test('summarizes oh-story batch quality checks from chapter group output', () => {
    const summary = buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({
        post_batch_quality_check: {
          source: 'oh_story_step_3',
          status: 'warn',
          completed_count: 3,
          chapter_nos: [21, 22, 23],
          revised_count: 1,
          average_score: 82,
          checks: [
            { key: 'title_uniqueness', label: '标题去重', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第22章仍残留作者说明'] },
            { key: 'chapter_hook', label: '章尾钩子', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'blueprint_consumption', label: '细纲兑现', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1 },
            { key: 'deterministic_cleanup', label: '确定性清理', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'story_state', label: '状态机更新', status: 'ok', checked_count: 3, warn_count: 0 },
          ],
        },
      }),
    })

    expect(summary).toMatchObject({
      visible: true,
      title: '批次质检',
      source: 'oh_story_step_3',
      status: 'warn',
      statusLabel: '需复核',
      statusColor: 'gold',
      completedCount: 3,
      chapterNos: [21, 22, 23],
      revisedCount: 1,
      averageScore: 82,
      warningCount: 2,
    })
    expect(summary?.chapterText).toBe('第21-23章')
    expect(summary?.checks).toHaveLength(7)
    expect(summary?.checks.find(check => check.key === 'prose_meta')).toMatchObject({
      label: '正文元信息',
      status: 'warn',
      statusLabel: '需复核',
      warningCount: 1,
      summaries: ['第22章仍残留作者说明'],
    })
  })

  test('stays hidden when chapter group output has no post batch quality check', () => {
    expect(buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({ chapters: [] }),
    })).toBeNull()
  })
})

describe('chapterGroupActionState', () => {
  test('does not offer manual approval for approval-blocker chapters', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
      error: '仿写安全阻断：参考桥段相似度过高',
    })

    expect(state.canApprove).toBe(false)
    expect(state.canRetry).toBe(false)
    expect(state.canSkip).toBe(false)
    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps manual confirmation available for ordinary approval stages', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'scene_cards',
    })

    expect(state.canApprove).toBe(true)
    expect(state.canRetry).toBe(true)
    expect(state.canSkip).toBe(true)
    expect(state.blockedByApprovalBlocker).toBe(false)
  })

  test('disables actions for terminal blocked invalid chapters', () => {
    const state = chapterGroupActionState({
      status: 'failed',
      admission_status: 'blocked_invalid',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canApprove).toBe(false)
    expect(state.canRetry).toBe(false)
    expect(state.canSkip).toBe(false)
    expect(state.actionHint).toContain('正文无效且未入库')
  })
})

describe('chapterGroupRunActionState', () => {
  test('does not offer run-level continue or execute for approval-blocker runs', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [
          {
            id: 901,
            chapter_no: 21,
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            error_code: 'APPROVAL_BLOCKER',
          },
        ],
        last_error: {
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
        },
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps run-level continue and execute available for ordinary paused chapter groups', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [{ id: 902, chapter_no: 22, status: 'needs_approval', approval_stage: 'scene_cards' }],
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(false)
    expect(state.canResume).toBe(true)
    expect(state.canExecute).toBe(true)
  })

  test('disables run actions for persisted blocked invalid admissions', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [{ admission_status: 'blocked_invalid', error_code: 'PROSE_ADMISSION_BLOCKED_INVALID' }],
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })

  test('disables run actions when blocked invalid exists only in last error metadata', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        error_code: 'PROSE_GENERATION_FAILED',
        current_index: 0,
        chapters: [{ chapter_no: 11, status: 'failed' }],
        last_error: { error_code: 'PROSE_ADMISSION_BLOCKED_INVALID' },
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })

  test('ignores stale top-level terminal admission when the current chapter is ordinary', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        admission_status: 'blocked_invalid',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
        current_index: 0,
        chapters: [{ chapter_no: 12, status: 'failed' }],
        last_error: { error_code: 'PROSE_GENERATION_FAILED' },
      }),
    })

    expect(state.terminalAdmission).toBe(false)
    expect(state.canResume).toBe(true)
    expect(state.canExecute).toBe(true)
  })

  test('disables resume for a standalone blocked invalid admission payload', () => {
    const state = chapterGroupRunActionState({
      run_type: 'generate_prose',
      status: 'failed',
      output_ref: JSON.stringify({
        admission_status: 'blocked_invalid',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
        chapter_id: 412,
        chapter_no: 21,
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })
})

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

  test('normalizes resolved annotation categories when issue type is missing', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'reader_payoff',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '核心偏移风险已清',
        chapterNos: [8],
        issueTypes: ['core_drift'],
      }),
      expect.objectContaining({
        label: '回报欠账风险已清',
        chapterNos: [9],
        issueTypes: ['reader_payoff_debt'],
      }),
      expect.objectContaining({
        label: '爆点风险已清',
        chapterNos: [10],
        issueTypes: ['volume_beat_missed'],
      }),
    ]))
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

  test('summarizes resolved next-chapter quality plan repairs as quality continuity closure', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'next_chapter_quality_plan',
        task_status: 'resolved',
        chapter_no: 12,
        message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'approval_blocker',
        task_status: 'resolved',
        chapter_no: 13,
        detail: '下一章质量续航计划缺失',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '质量续航风险已清',
        color: 'gold',
        count: 2,
        chapterNos: [12, 13],
        issueTypes: ['next_chapter_quality_plan'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12、13章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('groups resolved scene-card execution directive repairs as scene-card closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'scene_card_1_forbidden_directives',
        task_status: 'resolved',
        chapter_no: 12,
        message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'scene_card_directive',
        label: '场景卡执行风险已清',
        color: 'volcano',
        count: 1,
        chapterNos: [12],
        issueTypes: ['scene_card_1_forbidden_directives'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12章')
    expect(highlights[0]?.detail).toContain('场景卡执行风险已处理')
  })

  test('groups resolved safe-batch expansion segment repairs as rollback evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_segment_hotspot',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_segment',
        label: '扩批分段风险已清',
        count: 1,
        chapterNos: [10],
        issueTypes: ['safe_batch_expansion_segment_hotspot'],
      }),
    ])
  })

  test('groups resolved safe-batch expansion structure repairs as structure governance evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'resolved',
        chapter_no: 15,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_structure',
        label: '扩批结构风险已清',
        count: 1,
        chapterNos: [15],
        issueTypes: ['safe_batch_expansion_structure_repair'],
      }),
    ])
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

  test('labels resolved repair receipt and revision guard risks by concrete closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_cascade_impact',
        annotation_category: 'revision_cascade_impact',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        chapter_no: 9,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(expect.arrayContaining([
      '质量回执风险已清',
      '去AI味回执风险已清',
      '级联修订风险已清',
      '修订幅度风险已清',
    ]))
    expect(highlights).toHaveLength(4)
  })

  test('labels resolved prose revision sync and delivery receipt repairs by closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt',
        annotation_category: 'prose_revision_receipt',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt_sync',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'delivery_risk_receipts',
        annotation_category: 'delivery_risk_receipt',
        chapter_no: 12,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'prose_revision_receipt',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'prose_revision_receipt_sync',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'delivery_risk_receipt',
        label: '交稿回执风险已清',
        chapterNos: [12],
      }),
    ]))
    expect(highlights.map(item => item.detail).join('\n')).toContain('修订回执风险已处理')
    expect(highlights.map(item => item.detail).join('\n')).toContain('交稿回执风险已处理')
  })

  test('ignores open repair tasks and non-risk maintenance tasks', () => {
    const highlights = buildRepairClosureHighlights([
      { issue_type: 'reader_pull_missed', task_status: 'needs_review', chapter_no: 9 },
      { task_type: 'repair_materials', task_status: 'resolved', chapter_no: 1 },
    ])

    expect(highlights).toEqual([])
  })
})

describe('buildRepairTaskIssueTagMeta', () => {
  test('normalizes annotation categories for task center issue tags', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'reader_retention',
    })).toEqual({ label: '追读', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'innovation',
    })).toEqual({ label: '创新/IP', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
    })).toEqual({ label: '卷级阶段', color: 'gold' })
  })

  test('labels pre-draft execution repair tasks by the missed contract', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'intent_confirmation_gap',
    })).toEqual({ label: '意图确认', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'benchmark_recall_gap',
    })).toEqual({ label: '文风召回', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'pre_draft_execution',
    })).toEqual({ label: '意图确认', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'source_readiness_gap',
    })).toEqual({ label: '来源就绪', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'source_readiness',
    })).toEqual({ label: '来源就绪', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'state_tracking_gap',
    })).toEqual({ label: '状态跟踪', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'state_tracking',
    })).toEqual({ label: '状态跟踪', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'style_boundary_gap',
    })).toEqual({ label: '风格边界', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'story_drive_gap',
    })).toEqual({ label: '故事驱动力', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_arc_gap',
    })).toEqual({ label: '人物弧光', color: 'pink' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'runway_gap',
    })).toEqual({ label: '连载航线', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'quality_audit_gap',
    })).toEqual({ label: '质量诊断', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'beat_cooling_gap',
    })).toEqual({ label: '冷却节奏', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_expectation_debt',
    })).toEqual({ label: '读者期待', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_payoff_debt',
    })).toEqual({ label: '读者回报', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'information_flow',
    })).toEqual({ label: '信息流', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'expectation_threshold_gap',
    })).toEqual({ label: '期待阈值', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'story_loop',
    })).toEqual({ label: '故事闭环', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'emotional_arc_gap',
    })).toEqual({ label: '情绪弧', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_hook_gap',
    })).toEqual({ label: '章级钩子', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'paragraph_hook_gap',
    })).toEqual({ label: '段落级钩子', color: 'lime' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'suspense_gap',
    })).toEqual({ label: '悬念编排', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'asset_linkage_gap',
    })).toEqual({ label: '资产挂钩', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'dialogue_gap',
    })).toEqual({ label: '对白质量', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'scene_card_receipts_gap',
    })).toEqual({ label: '场景回执', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'delivery_risk_receipts_gap',
    })).toEqual({ label: '交稿回执', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'revision_context_receipts_gap',
    })).toEqual({ label: '修订上下文', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'plot_dynamics_gap',
    })).toEqual({ label: '剧情动力', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_relation_gap',
    })).toEqual({ label: '角色关系', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_behavior_gap',
    })).toEqual({ label: '角色行为', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'conflict_structure_gap',
    })).toEqual({ label: '冲突结构', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'opening_gap',
    })).toEqual({ label: '开篇设计', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'bridge_unit_gap',
    })).toEqual({ label: '桥段节奏', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reversal_gap',
    })).toEqual({ label: '反转设计', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'showdown_gap',
    })).toEqual({ label: '高潮对抗', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'prose_craft_gap',
    })).toEqual({ label: '正文工艺', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_handoff_gap',
    })).toEqual({ label: '章首承接', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'payoff_setup_gap',
    })).toEqual({ label: '爽点铺垫', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'spectator_reaction_gap',
    })).toEqual({ label: '围观反应', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'punctuation_tone_gap',
    })).toEqual({ label: '语气标点', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'content_rubric_gap',
    })).toEqual({ label: '内容基准', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_retention_gap',
    })).toEqual({ label: '追读雷达', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'target_reader_gap',
    })).toEqual({ label: '目标读者', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'genre_positioning_gap',
    })).toEqual({ label: '题材定位', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'female_audience_gap',
    })).toEqual({ label: '女频长篇', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'upgrade_rhythm_gap',
    })).toEqual({ label: '升级节奏', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_structure_gap',
    })).toEqual({ label: '章节结构', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_progression_gap',
    })).toEqual({ label: '章节推进', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'information_load_gap',
    })).toEqual({ label: '信息负载', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'longform_continuity_gap',
    })).toEqual({ label: '长篇连续性', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'core_contract_gap',
    })).toEqual({ label: '核心契约', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'continuity_heat_gap',
    })).toEqual({ label: '连续性热度', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'revision_receipt_gap',
    })).toEqual({ label: '修订回执', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'deslop_repair_gap',
    })).toEqual({ label: '去AI味修复', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'prose_meta_gap',
    })).toEqual({ label: '正文元叙事', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'serial_risk_repair_gap',
    })).toEqual({ label: '连续风险修复', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_hook_quality_gap',
    })).toEqual({ label: '章钩质量', color: 'orange' })
  })

  test('labels oh-story revision closure sync tasks from annotation category fallback', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt',
    })).toEqual({ label: '修订回执', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'deslop_repair_receipt_sync',
    })).toEqual({ label: '去AI味回执', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'revision_cascade_impact_sync',
    })).toEqual({ label: '级联修订', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'revision_scope_guard_sync',
    })).toEqual({ label: '修订幅度', color: 'orange' })
  })

  test('labels missing next-chapter quality plans as quality continuity work', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toEqual({ label: '质量续航', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toEqual({ label: '质量续航', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      detail: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })).toEqual({ label: '质量续航', color: 'gold' })
  })
})

describe('buildNextChapterQualityPlanPreview', () => {
  test('extracts nested next-chapter quality plans for task detail previews', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      payload: {
        oh_story_delivery_receipts: {
          next_chapter_quality_plan: {
            quality_focus: ['守住上章公审后的压迫余波'],
            opening_actions: ['前300字先让证据反噬到家族长辈'],
            middle_actions: ['中段必须让女主主动选择公开下一份证据'],
            ending_actions: ['章末留下新证人倒戈钩子'],
            avoid_repetition: ['不要再用“这只是开始”收尾'],
            evidence_basis: ['第12章结尾证据链已公开但代价未落地'],
          },
        },
      },
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      qualityFocus: ['守住上章公审后的压迫余波'],
      openingActions: ['前300字先让证据反噬到家族长辈'],
      middleActions: ['中段必须让女主主动选择公开下一份证据'],
      endingActions: ['章末留下新证人倒戈钩子'],
      avoidRepetition: ['不要再用“这只是开始”收尾'],
      evidenceBasis: ['第12章结尾证据链已公开但代价未落地'],
    })
  })

  test('keeps the missing quality plan reason visible when no plan exists yet', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      missingReason: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })
    expect(preview?.qualityFocus).toEqual([])
  })

  test('keeps the missing quality receipt reason visible when no receipt exists yet', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      detail: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      missingReason: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })
    expect(preview?.qualityFocus).toEqual([])
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

describe('buildRecoveryEvidenceRegovernanceSummary', () => {
  test('summarizes release summary regovernance queue drafts on recovery evidence tasks', () => {
    expect(buildRecoveryEvidenceRegovernanceSummary({
      issue_type: 'recovery_evidence_mismatch',
      recovery_evidence_regovernance_queue: {
        label: '安全连写放行摘要再治理',
        summary: '第41-43章 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
        task_count: 3,
        tasks: [
          { action_label: '治理复查台' },
          { action_label: '复检单章' },
          { action_label: '复盘批次' },
        ],
      },
    })).toEqual({
      label: '安全连写放行摘要再治理',
      summary: '第41-43章 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
      taskCount: 3,
      actionLabel: '生成再治理队列',
      actionLabels: ['治理复查台', '复检单章', '复盘批次'],
    })

    expect(buildRecoveryEvidenceRegovernanceSummary({
      issue_type: 'core_drift',
    })).toBeNull()
  })
})

describe('buildRecoveryEvidenceSourceRiskProfileSnapshot', () => {
  test('summarizes safe-batch preflight recovery evidence source trend for task details', () => {
    const snapshot = buildRecoveryEvidenceSourceRiskProfileSnapshot({
      recovery_evidence_source_risk_profile: {
        status: 'warn',
        total_failure_count: 3,
        repeat_source_count: 1,
        sources: [
          {
            source: 'single_chapter_governance_recheck',
            label: '单章治理复查',
            release_failure_count: 2,
            evidence: ['单章治理复查：生产阻断已解除'],
            deep_repair_effect: {
              status: 'observing',
              label: '深修后暂无再失效',
              summary: '单章治理复查最近一次深修后暂无新的放行后失效，继续观察下一批正文继承。',
              latest_repair_action_label: '深修单章任务书',
              post_repair_failure_count: 0,
              strengthened_repair_closure: {
                status: 'converged',
                label: '强化深修已收敛',
                summary: '单章治理复查强化深修后暂无新的同源放行后失效，可恢复小批量安全连写。',
              },
            },
          },
          {
            source: 'safe_batch_recovery_recheck',
            label: '批次恢复复查',
            release_failure_count: 1,
            evidence: ['批次恢复复查：生产阻断已解除'],
          },
        ],
      },
    })
    const singleDeepRepairDirection = snapshot?.sources[0]?.deepRepairDirection || ''
    const batchDeepRepairDirection = snapshot?.sources[1]?.deepRepairDirection || ''

    expect(snapshot).toMatchObject({
      visible: true,
      status: 'warn',
      label: '恢复依据画像趋势',
      summary: '单章治理复查近2轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          label: '单章治理复查',
          releaseFailureCount: 2,
          trendLabel: '近2轮失败',
          deepRepairEffect: expect.objectContaining({
            status: 'observing',
            label: '深修后暂无再失效',
            latestRepairActionLabel: '深修单章任务书',
            postRepairFailureCount: 0,
            strengthenedClosure: expect.objectContaining({
              status: 'converged',
              label: '强化深修已收敛',
            }),
          }),
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          label: '批次恢复复查',
          releaseFailureCount: 1,
          trendLabel: '近1轮失败',
        }),
      ],
    })
    expect(singleDeepRepairDirection.includes('回到单章任务书')).toBe(true)
    expect(batchDeepRepairDirection.includes('批次任务书')).toBe(true)
  })

  test('keeps strengthened recovery acceptance trend in batch task details', () => {
    const snapshot = buildRecoveryEvidenceSourceRiskProfileSnapshot({
      recovery_evidence_source_risk_profile: {
        status: 'ok',
        total_failure_count: 2,
        repeat_source_count: 1,
        sources: [
          {
            source: 'single_chapter_governance_recheck',
            label: '单章治理复查',
            release_failure_count: 2,
          },
        ],
      },
      strengthened_repair_acceptance_trend: {
        visible: true,
        status: 'warn',
        label: '强化恢复验收趋势',
        summary: '强化恢复验收最近 1 批未通过：核心守恒风险 1 项、读者拉力风险 2 项；本轮回到单章治理。',
        accepted_batch_count: 2,
        failed_batch_count: 1,
        pass_streak: 0,
        latest_status: 'warn',
        latest_batch_label: '第41-43章',
        latest_run_id: 9001,
        source_evidence: ['单章治理复查：强化深修已收敛'],
        dimensions: {
          core: { label: '核心守恒', failed_count: 1 },
          payoff: { label: '读者回报', failed_count: 0 },
          reader_pull: { label: '读者拉力', failed_count: 2 },
        },
      },
    })

    expect(snapshot?.strengthenedAcceptanceTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '强化恢复验收趋势',
      acceptedBatchCount: 2,
      failedBatchCount: 1,
      passStreak: 0,
      latestStatus: 'warn',
      latestBatchLabel: '第41-43章',
      latestRunId: 9001,
      sourceEvidence: ['单章治理复查：强化深修已收敛'],
      dimensions: {
        core: { label: '核心守恒', failedCount: 1 },
        payoff: { label: '读者回报', failedCount: 0 },
        readerPull: { label: '读者拉力', failedCount: 2 },
      },
    })
  })
})

