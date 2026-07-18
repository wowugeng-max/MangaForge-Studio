import React from 'react'
import { Tag, Typography } from 'antd'
import {
  parseJsonValue,
} from './chapter-group'
import type {
  RecoveryEvidenceAuditNextAction,
  RecoveryEvidenceReviewActionFeedback,
  RecoveryEvidenceReviewRefreshAnchor,
  RecoveryEvidenceReviewRow,
  RecoveryEvidenceReviewRowAction,
  SafeBatchDefaultFiveChapterLaneRedesignSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot,
  SafeBatchDefaultFiveChapterRegressionSnapshot,
  SafeBatchExpansionFeedbackSnapshot,
  SafeBatchExpansionPolicySnapshot,
  SafeBatchExpansionStructureDecisionTrendSnapshot,
  SafeBatchExpansionStructureRepairEffectivenessSnapshot,
  SafeBatchExpansionStructureValidationResultSnapshot,
  SafeBatchExpansionStructureValidationTrendSnapshot,
  SafeBatchRecoveryFocusSnapshot,
  SafeBatchRecoveryRestoreStabilityEvidenceSnapshot,
  SafeBatchRecoveryRestoreStabilityLaneSnapshot,
  SafeBatchRecoveryRoadmapNodeSnapshot,
  SafeBatchRecoveryRoadmapSnapshot,
  SafeBatchRecoveryValidationReviewCtaSnapshot,
  SafeBatchRecoveryValidationSnapshot,
  StrengthenedRepairAcceptanceTrendSnapshot,
} from './drawer-model'
import {
  BatchPlanReviewPreview,
  DeliveryRiskReviewPreview,
  NextChapterQualityPlanPreview,
  RecoveryEvidenceRegovernancePreview,
  RecoveryEvidenceReviewPreview,
  SafeBatchExpansionSegmentPreview,
  buildDefaultLaneRepairTaskTags,
  buildPostBatchQualityCheckSummary,
  buildProductionRelapseCtaExecutionSnapshot,
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRepairClosureHighlights,
  compactAuditList,
  compactChapterNos,
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeChapterNos,
  normalizeEvidenceTextList,
  recoveryEvidenceRegovernanceQueueOfTask,
  recoveryEvidenceTaskSourceMeta,
  repairTaskActionLabel,
  repairTaskIssueTag,
  repairTaskStatusTag,
  runTypeLabel,
  safeBatchRecoveryFocusMatchesTask,
  statusTag,
} from './drawer-model'

const { Text, Paragraph } = Typography
import {
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryRestoreStabilityLaneSnapshot,
  safeBatchExpansionFeedbackColor,
} from './drawer-snapshots'

export function RepairTaskRunSummary({
  run,
  runRecords = [],
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onRecheckStyleSampleTaskBooks,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
  onRefresh,
}: {
  run: any
  runRecords?: any[]
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onRecheckStyleSampleTaskBooks?: (items: any[]) => void
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
  onRefresh?: () => void | Promise<void>
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const audit = output.audit_summary || null
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number | null>(null)
  const [focusedTaskSource, setFocusedTaskSource] = useState<string>('')
  const [recoveryEvidenceActionFeedbackByKey, setRecoveryEvidenceActionFeedbackByKey] = useState<Record<string, RecoveryEvidenceReviewActionFeedback>>({})
  const [recoveryEvidenceRefreshAnchor, setRecoveryEvidenceRefreshAnchor] = useState<RecoveryEvidenceReviewRefreshAnchor | null>(null)
  const high = tasks.filter((task: any) => task.severity === 'high').length
  const medium = tasks.filter((task: any) => task.severity === 'medium').length
  const resolved = tasks.filter((task: any) => task.task_status === 'resolved').length
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review').length
  const closureHighlights = buildRepairClosureHighlights(tasks, audit)
  const recoveryEvidenceAudit = buildRecoveryEvidenceAuditView(audit, tasks)
  const sourceTaskForRecoveryEvidenceRow = (focusSource: string) => {
    const group = recoveryEvidenceAudit?.sourceGroups.find(item => item.source === focusSource)
    const taskIndex = group?.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
      ?? group?.taskIndexes[0]
      ?? null
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : null,
    }
  }
  useEffect(() => {
    if (!safeBatchRecoveryFocus) return
    const taskIndex = tasks.findIndex((task: any) => safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task))
    if (taskIndex < 0) return
    setFocusedTaskSource('')
    setFocusedTaskIndex(taskIndex)
  }, [run?.id, safeBatchRecoveryFocus?.layerKey, safeBatchRecoveryFocus?.issueType, safeBatchRecoveryFocus?.source])
  const sourceTaskForRecoveryEvidenceAuditAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const groupedTask = sourceTaskForRecoveryEvidenceRow(nextAction.source)
    const taskIndex = nextAction.taskIndex ?? groupedTask.taskIndex
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : groupedTask.task,
    }
  }
  const recoveryEvidenceAuditNextActionDisabled = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    if (nextAction.action === 'revision') return !sourceTask.task || !onStartRepairTaskRevision
    if (nextAction.action === 'recheck_single_chapter') return !sourceTask.task || !onRecheckRepairTask
    if (nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') return !onGenerateRepairAuditSummary
    return false
  }
  const handleRecoveryEvidenceAuditNextAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    setFocusedTaskSource(nextAction.source)
    setFocusedTaskIndex(sourceTask.taskIndex)
    if (nextAction.action === 'revision' && sourceTask.task && onStartRepairTaskRevision) {
      onStartRepairTaskRevision(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if (nextAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
      onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if ((nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') && onGenerateRepairAuditSummary) {
      onGenerateRepairAuditSummary(run)
    }
  }
  const focusRecoveryEvidenceAnchor = (anchor: RecoveryEvidenceReviewRefreshAnchor) => {
    setFocusedTaskSource(anchor.focusSource)
    setFocusedTaskIndex(anchor.sourceTaskIndex ?? anchor.taskIndex)
  }
  const runRecoveryEvidenceActionWithRefresh = async (
    actionFeedback: RecoveryEvidenceReviewActionFeedback,
    refreshAnchor: RecoveryEvidenceReviewRefreshAnchor,
    action: () => void | Promise<void>,
  ) => {
    setRecoveryEvidenceRefreshAnchor(refreshAnchor)
    focusRecoveryEvidenceAnchor(refreshAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => ({ ...prev, [refreshAnchor.feedbackKey]: actionFeedback }))
    await Promise.resolve(action())
    if (onRefresh) await Promise.resolve(onRefresh())
    const refreshedAnchor = { ...refreshAnchor, refreshedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
    setRecoveryEvidenceRefreshAnchor(refreshedAnchor)
    focusRecoveryEvidenceAnchor(refreshedAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => {
      const refreshedFeedback = buildRecoveryEvidenceReviewRefreshFeedback(prev[refreshAnchor.feedbackKey] || actionFeedback, refreshedAnchor)
      return refreshedFeedback ? { ...prev, [refreshAnchor.feedbackKey]: refreshedFeedback } : prev
    })
  }
  const handleRecoveryEvidenceReviewRowAction = async (
    task: any,
    taskIndex: number,
    row: RecoveryEvidenceReviewRow,
    rowAction: RecoveryEvidenceReviewRowAction,
  ) => {
    const triggeredAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const actionFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, triggeredAt)
    const runActionOptions = { keepTaskCenterOpen: true }
    if (rowAction.focusSource) {
      const sourceTask = sourceTaskForRecoveryEvidenceRow(rowAction.focusSource)
      const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
        taskIndex,
        row,
        rowAction,
        sourceTaskIndex: sourceTask.taskIndex,
        refreshedAt: triggeredAt,
      })
      if (rowAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0, runActionOptions))
      }
      if (rowAction.action === 'recheck_safe_batch' && onGenerateRepairAuditSummary) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      }
      return
    }
    const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex,
      row,
      rowAction,
      sourceTaskIndex: taskIndex,
      refreshedAt: triggeredAt,
    })
    if (rowAction.action === 'review_governance_closure' && onGenerateRepairAuditSummary) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      return
    }
    if (rowAction.action === 'execute_typed_repair' && onExecuteTypedRepairTask) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onExecuteTypedRepairTask(task, run, taskIndex, runActionOptions))
    }
  }
  const title = run.run_type === 'first30_retention_repair'
    ? '前30章留存修复任务'
    : run.run_type === 'longform_production_repair'
      ? output.report?.source === 'auto_creation_safe_batch_risk'
        ? '安全连写风险修复任务'
        : output.report?.source === 'review_annotation_risk'
          ? '交稿风险修复任务'
          : output.report?.source === 'rolling_script_room'
            ? '百章剧本室修复任务'
            : output.report?.source === 'reader_trial_review'
              ? '读者试读修复任务'
              : output.report?.source === 'recovery_evidence_governance_queue'
                ? '恢复依据治理队列'
                : '长线生产修复任务'
      : '机械质检修复任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>任务 {tasks.length}</Tag>
          <Tag color={high ? 'red' : 'default'} bordered={false}>高危 {high}</Tag>
          <Tag color={medium ? 'gold' : 'default'} bordered={false}>中危 {medium}</Tag>
          <Tag color={resolved ? 'green' : 'default'} bordered={false}>已处理 {resolved}</Tag>
          <Tag color={needsReview ? 'gold' : 'default'} bordered={false}>需复查 {needsReview}</Tag>
          {output.report?.score !== undefined && <Tag bordered={false}>诊断分 {output.report.score}</Tag>}
          {output.report?.weak_count !== undefined && <Tag bordered={false}>薄弱章节 {output.report.weak_count}</Tag>}
          {output.report?.status && <Tag bordered={false}>{output.report.status}</Tag>}
          {run.run_type === 'longform_production_repair' && onGenerateRepairAuditSummary && (
            <Button size="small" type="primary" onClick={() => onGenerateRepairAuditSummary(run)}>生成审计摘要</Button>
          )}
        </Space>
        {audit && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
                <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
                <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
              </Space>
              {(audit.conclusion || []).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
              <Space wrap size={[4, 4]}>
                {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>
                    {key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}
                  </Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {closureHighlights.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>风险闭环记录</Text>
                <Tag color="green" bordered={false}>已清 {closureHighlights.reduce((sum, item) => sum + item.count, 0)}</Tag>
              </Space>
              {closureHighlights.map(item => (
                <Space key={item.key} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={item.color} bordered={false}>{item.label}</Tag>
                    <Tag color="green" bordered={false}>{item.count}</Tag>
                    {item.chapterNos.length > 0 && <Tag bordered={false}>第{item.chapterNos.slice(0, 6).join('、')}章</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                </Space>
              ))}
            </Space>
          </div>
        )}
        {recoveryEvidenceAudit && (
          <div style={{ padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.label}</Text>
                <Tag color={recoveryEvidenceAudit.status === 'closed' ? 'green' : 'gold'} bordered={false}>
                  {recoveryEvidenceAudit.status === 'closed' ? '已闭环' : '需跟进'}
                </Tag>
                <Tag bordered={false}>已确认 {recoveryEvidenceAudit.resolved}/{recoveryEvidenceAudit.total}</Tag>
                {recoveryEvidenceAudit.sourceRunId && <Tag bordered={false}>来源 #{recoveryEvidenceAudit.sourceRunId}</Tag>}
                {recoveryEvidenceAudit.memoryLabel && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.memoryLabel}</Tag>}
                {recoveryEvidenceAudit.sourceSummary && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.sourceSummary}</Tag>}
              </Space>
              {recoveryEvidenceAudit.nextAction && (
                <Space wrap size={[4, 4]} style={{ padding: 6, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
                  <Tag color="gold" bordered={false}>下一步</Tag>
                  <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.label}</Text>
                  {recoveryEvidenceAudit.nextAction.sourceLabel && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.sourceLabel}</Text>
                  )}
                  {recoveryEvidenceAudit.nextAction.residualEvidence.length > 0 && (
                    <Text type="danger" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.residualEvidence.join('；')}</Text>
                  )}
                  <Button
                    size="small"
                    type="primary"
                    icon={['recheck_single_chapter', 'recheck_safe_batch', 'review_governance_closure'].includes(recoveryEvidenceAudit.nextAction.action) ? <ReloadOutlined /> : undefined}
                    disabled={recoveryEvidenceAuditNextActionDisabled(recoveryEvidenceAudit.nextAction)}
                    onClick={() => handleRecoveryEvidenceAuditNextAction(recoveryEvidenceAudit.nextAction!)}
                  >
                    {recoveryEvidenceAudit.nextAction.label}
                  </Button>
                </Space>
              )}
              {recoveryEvidenceAudit.sourceGroups.length > 0 && (
                <Space wrap size={[4, 4]}>
                  <Text strong style={{ fontSize: 12 }}>按来源定位</Text>
                  {recoveryEvidenceAudit.sourceGroups.map(group => {
                    const sourceTaskIndex = group.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
                      ?? group.taskIndexes[0]
                      ?? null
                    const sourceTask = sourceTaskIndex !== null ? tasks[sourceTaskIndex] : null
                    return (
                      <Space key={group.source} size={[2, 2]} wrap>
                        <Button
                          size="small"
                          type={focusedTaskSource === group.source ? 'primary' : 'default'}
                          onClick={() => {
                            setFocusedTaskSource(group.source)
                            setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                          }}
                        >
                          {group.label} {group.count}
                        </Button>
                        {group.recheckAction === 'single_chapter_governance_recheck' && sourceTask && onRecheckRepairTask && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onRecheckRepairTask?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        {group.recheckAction === 'safe_batch_recovery_recheck' && onGenerateRepairAuditSummary && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                              onGenerateRepairAuditSummary?.(run)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        <Tag color={group.resultStatus === 'closed' ? 'green' : group.resultStatus === 'needs_followup' ? 'gold' : 'default'} bordered={false}>
                          {group.resultLabel}
                        </Tag>
                        <Tag color={group.productionBlockStatus === 'cleared' ? 'green' : group.productionBlockStatus === 'blocked' ? 'red' : 'default'} bordered={false}>
                          {group.productionBlockLabel}
                        </Tag>
                        <Text type={group.productionBlockStatus === 'blocked' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                          {group.productionBlockDetail}
                        </Text>
                        {group.latestSummary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{group.latestSummary}</Text>
                        )}
                        {group.residualEvidence.length > 0 && (
                          <Text type="danger" style={{ fontSize: 12 }}>残留依据：{group.residualEvidence.join('；')}</Text>
                        )}
                        {group.residualAction === 'revision' && sourceTask && onStartRepairTaskRevision && (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onStartRepairTaskRevision?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                        {group.residualAction === 'focus_task' && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
              {recoveryEvidenceAudit.memorySummary && (
                <Text type="secondary" style={{ fontSize: 12 }}>治理记忆：{recoveryEvidenceAudit.memorySummary}</Text>
              )}
              {recoveryEvidenceAudit.failedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{recoveryEvidenceAudit.failedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.repairedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>修后证据：{recoveryEvidenceAudit.repairedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.watchItems.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>仍需观察：{recoveryEvidenceAudit.watchItems.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.relatedTasks.length > 0 && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12 }}>关联批次修复任务</Text>
                  {recoveryEvidenceAudit.relatedTasks.map((task, index) => {
                    const sourceTask = task.taskIndex !== null ? tasks[task.taskIndex] : null
                    const chapterId = task.chapterId || Number(sourceTask?.chapter_id || sourceTask?.chapterId || 0) || null
                    return (
                      <Space key={`${task.chapterNo || 'task'}-${index}`} wrap size={[4, 2]}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.chapterNo ? `第${task.chapterNo}章 ` : ''}{task.title}{task.status ? ` · ${task.status}` : ''}{task.summary ? ` · ${task.summary}` : ''}
                        </Text>
                        {task.taskIndex !== null && (
                          <Button size="small" type="link" onClick={() => {
                            setFocusedTaskSource('')
                            setFocusedTaskIndex(task.taskIndex)
                          }}>定位任务</Button>
                        )}
                        {chapterId && onSelectChapter && (
                          <Button size="small" type="link" onClick={() => onSelectChapter(chapterId)}>打开章节</Button>
                        )}
                        {sourceTask && onStartRepairTaskRevision && (
                          <Button size="small" type="link" onClick={() => onStartRepairTaskRevision(sourceTask, run, task.taskIndex ?? index)}>生成修订稿</Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </Space>
          </div>
        )}
        {Array.isArray(output.recommendations) && output.recommendations.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 12 }}>处理建议</Text>
              {output.recommendations.slice(0, 4).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
            </Space>
          </div>
        )}
        {output.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{output.report.summary}</Text>}
        {safeBatchRecoveryFocus && (
          <Alert
            type="info"
            showIcon
            message={`路线图聚焦：${safeBatchRecoveryFocus.actionLabel || safeBatchRecoveryFocus.layerLabel}`}
            description={safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '按安全连写恢复路线图定位下一层修复任务。'}
          />
        )}
        <List
          size="small"
          dataSource={tasks.slice(0, 40)}
          locale={{ emptyText: '暂无修复任务' }}
          renderItem={(task: any, taskIndex: number) => {
            const sourceFocused = Boolean(focusedTaskSource && recoveryEvidenceTaskSourceMeta(task).source === focusedTaskSource)
            const regovernanceQueue = recoveryEvidenceRegovernanceQueueOfTask(task)
            const regovernanceSummary = buildRecoveryEvidenceRegovernanceSummary(task)
            const refreshAnchorFocused = Boolean(
              recoveryEvidenceRefreshAnchor
              && (recoveryEvidenceRefreshAnchor.taskIndex === taskIndex || recoveryEvidenceRefreshAnchor.sourceTaskIndex === taskIndex),
            )
            const roadmapFocused = safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
            const defaultLaneTags = buildDefaultLaneRepairTaskTags(task)
            const focused = focusedTaskIndex === taskIndex || sourceFocused || refreshAnchorFocused || roadmapFocused
            return (
              <List.Item
                style={focused ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
              actions={[
                regovernanceQueue && regovernanceSummary && onCreateRecoveryEvidenceGovernanceQueue && task.task_status !== 'resolved' ? (
                  <Button
                    key="regovernance"
                    size="small"
                    type="primary"
                    onClick={() => onCreateRecoveryEvidenceGovernanceQueue({
                      recoveryEvidenceGovernanceQueue: regovernanceQueue,
                      sourceTask: task,
                      sourceRunId: run?.id,
                      sourceTaskIndex: taskIndex,
                    }, run, taskIndex, { keepTaskCenterOpen: true })}
                  >
                    {regovernanceSummary.actionLabel}
                  </Button>
                ) : null,
                repairTaskActionLabel(task) && onExecuteTypedRepairTask && task.task_status !== 'resolved' ? <Button key="typed" size="small" type="primary" onClick={() => onExecuteTypedRepairTask(task, run, taskIndex)}>{repairTaskActionLabel(task)}</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'resolved' ? <Button key="resolved" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'resolved', taskIndex)}>已处理</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'needs_review' ? <Button key="review" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'needs_review', taskIndex)}>需复查</Button> : null,
                task.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(task.chapter_id))}>定位</Button> : null,
                task.chapter_id && onOpenChapterEditor ? <Button key="edit" size="small" type="link" onClick={() => onOpenChapterEditor(Number(task.chapter_id))}>手动编辑</Button> : null,
                task.chapter_id && onStartRepairTaskRevision ? <Button key="revise" size="small" type="link" onClick={() => onStartRepairTaskRevision(task, run, taskIndex)}>生成修订稿</Button> : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={(
                  <Space wrap>
                    <Tag color={task.severity === 'high' ? 'red' : task.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{task.severity || 'task'}</Tag>
                    {repairTaskIssueTag(task)}
                    {defaultLaneTags.map(tag => (
                      <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                    ))}
                    {repairTaskStatusTag(task.task_status)}
                    <Text>{task.chapter_no ? `第${task.chapter_no}章 ` : ''}{task.title || task.message}</Text>
                    {task.segment && <Tag bordered={false}>{task.segment}</Tag>}
                  </Space>
                )}
                description={(
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">{task.message}</Text>
                    <Text>{task.action}</Text>
                    {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>验收：{task.acceptance_criteria.slice(0, 2).join('；')}</Text>
                    )}
                    <BatchPlanReviewPreview task={task} />
                    <RecoveryEvidenceReviewPreview
                      task={task}
                      taskIndex={taskIndex}
                      currentRun={run}
                      runRecords={runRecords}
                      actionFeedbackByKey={recoveryEvidenceActionFeedbackByKey}
                      onRecoveryEvidenceReviewRowAction={(row, rowAction) => handleRecoveryEvidenceReviewRowAction(task, taskIndex, row, rowAction)}
                    />
                    <RecoveryEvidenceRegovernancePreview task={task} />
                    <SafeBatchExpansionSegmentPreview task={task} />
                    <NextChapterQualityPlanPreview task={task} />
                    <DeliveryRiskReviewPreview task={task} />
                  </Space>
                )}
              />
            </List.Item>
            )
          }}
        />
      </Space>
    </Card>
  )
}
