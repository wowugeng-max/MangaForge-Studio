import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, List, Modal, Popconfirm, Progress, Space, Tag, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'
import {
  chapterGroupActionState,
  chapterGroupRunActionState,
  buildChapterAdmissionWarningCards,
  parseJsonValue,
} from './chapter-group'
import type { SafeBatchRecoveryFocusSnapshot, WorkspaceActiveTask } from './drawer-model'
import {
  BatchProseRunSummary,
  ChapterGroupRunSummary,
  ChapterPipelineRunSummary,
  ReleaseBatchRunSummary,
  ReleaseRepairRunSummary,
  RepairTaskRunSummary,
  TaskRunCard,
  buildDefaultLaneRepairTaskTags,
  buildSafeBatchRecoveryFocusReviewState,
  buildTaskRunCardModel,
  productionModeLabel,
  repairTaskActionLabel,
  runTypeLabel,
  safeBatchRecoveryFocusMatchesTask,
  safeJsonPreview,
  statusTag,
} from './drawer-model'

const { Text, Paragraph } = Typography

function sourceCacheTag(sourceCache: any) {
  if (!sourceCache?.status) return null
  const cached = Number(sourceCache.cached_chapters || 0)
  const fetched = Number(sourceCache.fetched_chapters || 0)
  if (sourceCache.status === 'hit') return <Tag color="green" bordered={false}>缓存命中 {cached}章</Tag>
  if (sourceCache.status === 'partial') return <Tag color="gold" bordered={false}>缓存 {cached}章 · 新抓 {fetched}章</Tag>
  return <Tag bordered={false}>新抓 {fetched}章</Tag>
}

export function TaskCenterDrawer({
  open,
  activeTasks,
  runRecords,
  productionTasks,
  knowledgeIngestJobs,
  loading,
  knowledgeJobsLoading,
  onClose,
  onRefresh,
  onRefreshKnowledgeJobs,
  onPauseKnowledgeJob,
  onResumeKnowledgeJob,
  onCancelKnowledgeJob,
  chapterGroupExecutingId,
  releaseRepairExecutingId,
  onExecuteChapterGroup,
  onPauseRun,
  onResumeRun,
  onRecoverRunQueue,
  onExecuteReleaseRepairRun,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
}: {
  open: boolean
  activeTasks: WorkspaceActiveTask[]
  runRecords: any[]
  productionTasks?: any | null
  knowledgeIngestJobs: any[]
  loading: boolean
  knowledgeJobsLoading: boolean
  onClose: () => void
  onRefresh: () => void | Promise<void>
  onRefreshKnowledgeJobs: () => void | Promise<void>
  onPauseKnowledgeJob: (jobId: string) => void | Promise<void>
  onResumeKnowledgeJob: (jobId: string) => void | Promise<void>
  onCancelKnowledgeJob: (jobId: string) => void | Promise<void>
  chapterGroupExecutingId?: number | null
  releaseRepairExecutingId?: number | null
  onExecuteChapterGroup?: (run: any) => void
  onPauseRun?: (run: any) => void
  onResumeRun?: (run: any) => void
  onRecoverRunQueue?: () => void
  onExecuteReleaseRepairRun?: (run: any) => void
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
}) {
  const [detailRun, setDetailRun] = useState<any | null>(null)
  const [detailKnowledgeJob, setDetailKnowledgeJob] = useState<any | null>(null)
  const sortedRuns = useMemo(() => (
    [...runRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [runRecords])
  const sortedKnowledgeJobs = useMemo(() => (
    [...knowledgeIngestJobs].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
  ), [knowledgeIngestJobs])
  useEffect(() => {
    if (!detailRun?.id) return
    const nextRun = runRecords.find((run: any) => Number(run.id) === Number(detailRun.id))
    if (nextRun && nextRun !== detailRun) setDetailRun(nextRun)
  }, [runRecords, detailRun?.id])
  const normalizedTasks = Array.isArray(productionTasks?.tasks) ? productionTasks.tasks : []
  const activeNormalizedTasks = Array.isArray(productionTasks?.active) ? productionTasks.active : []
  const taskSummary = productionTasks?.summary || {}
  const openTaskDetail = (task: any) => {
    const matched = runRecords.find((run: any) => run.id === task.id)
    setDetailRun(matched || {
      ...task,
      input_ref: task.input_ref || '',
      output_ref: JSON.stringify(task.payload || {}, null, 2),
      error_message: task.error || '',
    })
  }
  const getRunPayload = (run: any) => parseJsonValue(run.output_ref) || run.payload || {}
  const reviewTasks = useMemo(() => sortedRuns.flatMap((run: any) => {
    if (!['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(run.run_type)) return []
    const payload = getRunPayload(run)
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    return tasks
      .map((task: any, taskIndex: number) => ({ run, task, taskIndex }))
      .filter((item: any) => item.task?.task_status === 'needs_review')
  }), [sortedRuns])
  const styleSampleReviewTasks = reviewTasks.filter((item: any) => String(item.task?.issue_type || '') === 'style_sample_task_book_rebuild')
  const repairTaskItems = useMemo(() => {
    return sortedRuns.flatMap((run: any) => {
      if (!['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(run.run_type)) return []
      const payload = getRunPayload(run)
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      return tasks
        .map((task: any, taskIndex: number) => ({ run, task, taskIndex }))
    })
  }, [sortedRuns])
  const safeBatchRecoveryFocusReviewState = useMemo(() => (
    buildSafeBatchRecoveryFocusReviewState(safeBatchRecoveryFocus, repairTaskItems)
  ), [safeBatchRecoveryFocus, repairTaskItems])
  const safeBatchRecoveryFocusTasks = safeBatchRecoveryFocusReviewState.activeItems.length > 0
    ? safeBatchRecoveryFocusReviewState.activeItems
    : safeBatchRecoveryFocusReviewState.resolvedItems
  const handleUpdateRepairTaskStatus = async (task: any, run: any, status: string, taskIndex: number) => {
    const shouldRefreshRoadmap = status === 'resolved' && safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
    await Promise.resolve(onUpdateRepairTaskStatus?.(task, run, status, taskIndex))
    if (shouldRefreshRoadmap) await Promise.resolve(onRefresh())
  }

  useEffect(() => {
    if (!open || !safeBatchRecoveryFocus || detailRun) return
    const focusedTask = safeBatchRecoveryFocusTasks[0]
    if (focusedTask?.run) setDetailRun(focusedTask.run)
  }, [open, detailRun, safeBatchRecoveryFocus, safeBatchRecoveryFocusTasks])

  return (
    <>
      <Drawer
        open={open}
        title="任务中心"
        width={520}
        onClose={onClose}
        extra={<Button size="small" icon={<ReloadOutlined />} loading={loading || knowledgeJobsLoading} onClick={() => { onRefresh(); onRefreshKnowledgeJobs() }}>刷新</Button>}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Card size="small" title="正在运行">
            {activeTasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有运行中的工作台任务" />
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {activeTasks.map(task => (
                  <div key={task.key} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{task.title}</Text>
                        <Tag color="blue" bordered={false}>运行中</Tag>
                      </Space>
                      {task.phase && <Text type="secondary" style={{ fontSize: 12 }}>{task.phase}</Text>}
                      {typeof task.progress === 'number' && <Progress percent={Math.max(0, Math.min(100, Math.round(task.progress)))} size="small" />}
                      {task.detail && <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{task.detail}</Paragraph>}
                      {task.onCancel && (
                        <Button size="small" danger icon={<StopOutlined />} onClick={task.onCancel}>
                          {task.cancelLabel || '停止'}
                        </Button>
                      )}
                    </Space>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          <Card size="small" title="生产任务总览">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>活动 {taskSummary.active || activeNormalizedTasks.length || 0}</Tag>
                <Tag bordered={false}>运行 {taskSummary.running || 0}</Tag>
                <Tag bordered={false}>暂停 {taskSummary.paused || 0}</Tag>
                <Tag color={(taskSummary.failed || 0) > 0 ? 'red' : 'default'} bordered={false}>失败 {taskSummary.failed || 0}</Tag>
                <Tag color={(taskSummary.needs_approval || 0) > 0 ? 'gold' : 'default'} bordered={false}>待确认 {taskSummary.needs_approval || 0}</Tag>
                <Tag color={productionTasks?.worker?.status === 'running' ? 'green' : productionTasks?.worker?.status === 'stale' ? 'gold' : 'default'} bordered={false}>
                  worker {productionTasks?.worker?.status || 'idle'}
                </Tag>
                {productionTasks?.worker?.status === 'stale' && onRecoverRunQueue && (
                  <Button size="small" type="link" onClick={onRecoverRunQueue}>恢复队列</Button>
                )}
              </Space>
              {normalizedTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无生产任务" />
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {normalizedTasks.slice(0, 8).map((task: any) => {
                    const runActionState = chapterGroupRunActionState(task)
                    const canResume = Boolean(task.can_resume && !runActionState.terminalAdmission && (task.run_type !== 'chapter_group_generation' || runActionState.canResume) && onResumeRun)
                    const canExecute = Boolean(
                      task.can_execute && runActionState.canExecute && onExecuteChapterGroup
                      || ['release_quality_batch', 'release_similarity_batch'].includes(task.run_type) && ['queued', 'ready', 'failed'].includes(task.status) && onExecuteReleaseRepairRun,
                    )
                    const model = buildTaskRunCardModel(task, {
                      canProcessRepairTasks: Boolean(task.can_process_repair_tasks),
                      canResume,
                      canExecute,
                    })
                    const handlePrimaryAction = () => {
                      if (model.primaryAction.key === 'process_repair' || model.primaryAction.key === 'recheck' || model.primaryAction.key === 'view_failure') {
                        openTaskDetail(task)
                        return
                      }
                      if (model.primaryAction.key === 'resume' && onResumeRun) {
                        onResumeRun(task)
                        return
                      }
                      if (model.primaryAction.key === 'execute') {
                        if (task.run_type === 'chapter_group_generation' && onExecuteChapterGroup) onExecuteChapterGroup(task)
                        else if (['release_quality_batch', 'release_similarity_batch'].includes(task.run_type) && onExecuteReleaseRepairRun) onExecuteReleaseRepairRun(task)
                      }
                    }
                    return (
                      <TaskRunCard
                        key={`${task.run_type}-${task.id}`}
                        run={task}
                        model={model}
                        errorText={task.error || (runActionState.blockedByApprovalBlocker ? runActionState.actionHint : '')}
                        recoveryPlan={task.recovery_plan}
                        extraTags={(
                          <>
                            {productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode) && (
                              <Tag color="purple" bordered={false}>{productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode)}</Tag>
                            )}
                            {runActionState.blockedByApprovalBlocker && <Tag color="red" bordered={false}>入库阻断</Tag>}
                          </>
                        )}
                        onDetail={() => openTaskDetail(task)}
                        onPrimaryAction={handlePrimaryAction}
                        onPause={task.can_pause && onPauseRun ? () => onPauseRun(task) : undefined}
                      />
                    )
                  })}
                </Space>
              )}
            </Space>
          </Card>

          {safeBatchRecoveryFocus && (
            <Card size="small" title="路线图聚焦">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue" bordered={false}>{safeBatchRecoveryFocus.layerLabel || '安全连写恢复'}</Tag>
                  <Tag color={safeBatchRecoveryFocusReviewState.status === 'ready_for_recheck' ? 'green' : 'gold'} bordered={false}>
                    {safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '待处理'}
                  </Tag>
                  {safeBatchRecoveryFocusReviewState.matchedCount > 0 && <Tag color="green" bordered={false}>命中 {safeBatchRecoveryFocusReviewState.matchedCount}</Tag>}
                  {safeBatchRecoveryFocusReviewState.activeCount > 0 && <Tag color="gold" bordered={false}>待处理 {safeBatchRecoveryFocusReviewState.activeCount}</Tag>}
                  {safeBatchRecoveryFocusReviewState.resolvedCount > 0 && <Tag color="green" bordered={false}>已处理 {safeBatchRecoveryFocusReviewState.resolvedCount}</Tag>}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {safeBatchRecoveryFocusReviewState.summary}
                </Text>
                {safeBatchRecoveryFocusReviewState.obligationStatuses.length > 0 && (
                  <Space wrap>
                    {safeBatchRecoveryFocusReviewState.obligationStatuses.map(item => (
                      <Tag key={item.key} color={item.color} bordered={false}>{item.text}</Tag>
                    ))}
                  </Space>
                )}
                <Space wrap>
                  <Button
                    size="small"
                    type={safeBatchRecoveryFocusReviewState.status === 'ready_for_recheck' ? 'primary' : 'default'}
                    icon={<ReloadOutlined />}
                    onClick={() => onRefresh()}
                  >
                    {safeBatchRecoveryFocusReviewState.nextActionLabel}
                  </Button>
                </Space>
                {safeBatchRecoveryFocusTasks.length > 0 ? (
                  <List
                    size="small"
                    dataSource={safeBatchRecoveryFocusTasks.slice(0, 5)}
                    renderItem={(item: any) => (
                      <List.Item actions={[<Button key="open" size="small" type="link" onClick={() => setDetailRun(item.run)}>打开</Button>]}>
                        <List.Item.Meta
                          title={<Text>{item.task?.chapter_no ? `第${item.task.chapter_no}章 ` : ''}{item.task?.title || item.task?.message || '路线图任务'}</Text>}
                          description={<Text type="secondary" style={{ fontSize: 12 }}>{runTypeLabel(item.run?.run_type)} · {repairTaskActionLabel(item.task) || item.task?.action || '-'}</Text>}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂未找到匹配的待复查任务，可打开最近的安全连写/修复历史查看复盘记录。</Text>
                )}
              </Space>
            </Card>
          )}


          {reviewTasks.length > 0 && (
            <Card
              size="small"
              title={`复查清单 ${reviewTasks.length}`}
              extra={(
                <Space>
                  {styleSampleReviewTasks.length > 0 && onRecheckStyleSampleTaskBooks && (
                    <Button size="small" onClick={() => onRecheckStyleSampleTaskBooks(styleSampleReviewTasks)}>
                      复检样章任务书
                    </Button>
                  )}
                  {onBulkUpdateRepairTaskStatus ? (
                    <Popconfirm
                      title={`确认通过 ${reviewTasks.length} 个需复查任务？`}
                      onConfirm={() => onBulkUpdateRepairTaskStatus(reviewTasks, 'resolved')}
                    >
                      <Button size="small" type="primary"> 批量确认通过</Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              )}
            >
              <List
                size="small"
                dataSource={reviewTasks.slice(0, 30)}
                renderItem={(item: any) => (
                  <List.Item
                    style={safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, item.task) ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
                    actions={[
                      item.task?.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(item.task.chapter_id))}>定位</Button> : null,
                      item.task?.chapter_id && onRecheckRepairTask ? <Button key="recheck" size="small" type="link" onClick={() => onRecheckRepairTask(item.task, item.run, item.taskIndex)}>复检收敛</Button> : null,
                      onUpdateRepairTaskStatus ? <Button key="resolve" size="small" type="link" onClick={() => handleUpdateRepairTaskStatus(item.task, item.run, 'resolved', item.taskIndex)}>确认通过</Button> : null,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Tag color="gold" bordered={false}>需复查</Tag>
                          {buildDefaultLaneRepairTaskTags(item.task).map(tag => (
                            <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                          ))}
                          <Text>{item.task?.chapter_no ? `第${item.task.chapter_no}章 ` : ''}{item.task?.title || item.task?.message || '修复任务'}</Text>
                        </Space>
                      )}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{runTypeLabel(item.run?.run_type)} · {item.task?.action || item.task?.message || '-'}</Text>}
                    />
                  </List.Item>
                )}
              />
              {reviewTasks.length > 30 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {reviewTasks.length - 30} 个需复查任务，可批量确认或打开对应队列查看。</Text>}
            </Card>
          )}

          <Card size="small" title={`全本抓取/提炼 ${sortedKnowledgeJobs.length}`}>
            {sortedKnowledgeJobs.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无全本抓取或提炼任务" />
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {sortedKnowledgeJobs.slice(0, 40).map((job: any) => {
                  const canPause = ['queued', 'running'].includes(job.status)
                  const canResume = ['paused', 'failed', 'canceled'].includes(job.status)
                  const canCancel = !['completed', 'canceled'].includes(job.status)
                  return (
                    <div key={job.id} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                          <Space direction="vertical" size={2}>
                            <Space wrap>
                              {statusTag(job.status)}
                              <Text strong>{job.project_title || '未命名投喂项目'}</Text>
                              {job.fetch_only && <Tag color="blue" bordered={false}>仅拉取</Tag>}
                              {sourceCacheTag(job.source_cache)}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>{job.phase || '-'}</Text>
                          </Space>
                          <Button size="small" type="link" onClick={() => setDetailKnowledgeJob(job)}>详情</Button>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(job.progress || 0)))} size="small" />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已抓取 {job.fetched_chapters || 0} 章
                          {job.fetch_only ? '' : ` · 已提炼 ${job.analyzed_batches || 0}/${job.total_batches || 0} 批 · 候选知识 ${job.entry_count ?? job.entries?.length ?? 0} 条`}
                        </Text>
                        {(job.current_range || job.current_chapter) && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            当前：{job.current_range || `第${job.current_chapter}章`}{job.current_chapter_title ? ` / ${job.current_chapter_title}` : ''}
                          </Text>
                        )}
                        <Space wrap>
                          {canPause && (
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => onPauseKnowledgeJob(job.id)}>暂停</Button>
                          )}
                          {canResume && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onResumeKnowledgeJob(job.id)}>继续</Button>
                          )}
                          {canCancel && (
                            <Popconfirm title="确定取消这个全本任务？" okText="取消任务" cancelText="返回" onConfirm={() => onCancelKnowledgeJob(job.id)}>
                              <Button size="small" danger icon={<StopOutlined />}>取消</Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </Space>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>

          <Card size="small" title={`历史记录 ${sortedRuns.length}`}>
            {sortedRuns.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史运行记录" />
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {sortedRuns.slice(0, 80).map((run: any) => {
                  const runActionState = chapterGroupRunActionState(run)
                  const canResume = Boolean(
                    (run.run_type === 'chapter_generation_pipeline' && ['paused', 'failed', 'ready'].includes(run.status) && onResumeRun)
                    || (runActionState.canResume && onResumeRun),
                  )
                  const canExecute = Boolean(
                    (runActionState.canExecute && onExecuteChapterGroup)
                    || (['release_quality_batch', 'release_similarity_batch'].includes(run.run_type) && ['queued', 'ready', 'failed'].includes(run.status) && onExecuteReleaseRepairRun),
                  )
                  const canProcessRepairTasks = ['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(run.run_type) && ['ready', 'paused', 'failed', 'running'].includes(run.status)
                  const model = buildTaskRunCardModel(run, { canProcessRepairTasks, canResume, canExecute })
                  const payload = getRunPayload(run)
                  const modeLabel = run.run_type === 'chapter_group_generation'
                    ? productionModeLabel(payload.production_mode || payload.policy?.production_mode)
                    : ''
                  const handlePrimaryAction = () => {
                    if (model.primaryAction.key === 'process_repair' || model.primaryAction.key === 'recheck' || model.primaryAction.key === 'view_failure') {
                      setDetailRun(run)
                      return
                    }
                    if (model.primaryAction.key === 'resume' && onResumeRun) {
                      onResumeRun(run)
                      return
                    }
                    if (model.primaryAction.key === 'execute') {
                      if (run.run_type === 'chapter_group_generation' && onExecuteChapterGroup) onExecuteChapterGroup(run)
                      else if (['release_quality_batch', 'release_similarity_batch'].includes(run.run_type) && onExecuteReleaseRepairRun) onExecuteReleaseRepairRun(run)
                    }
                  }
                  return (
                    <TaskRunCard
                      key={`${run.run_type}-${run.id}`}
                      run={run}
                      model={model}
                      errorText={run.error_message || (runActionState.blockedByApprovalBlocker ? runActionState.actionHint : '')}
                      extraTags={(
                        <>
                          {modeLabel && <Tag color="purple" bordered={false}>{modeLabel}</Tag>}
                          {runActionState.blockedByApprovalBlocker && <Tag color="red" bordered={false}>入库阻断</Tag>}
                        </>
                      )}
                      onDetail={() => setDetailRun(run)}
                      onPrimaryAction={handlePrimaryAction}
                      onPause={
                        (
                          run.run_type === 'chapter_generation_pipeline' && run.status !== 'paused' && onPauseRun
                          || run.run_type === 'chapter_group_generation' && run.status === 'running' && onPauseRun
                        )
                          ? () => onPauseRun?.(run)
                          : undefined
                      }
                    />
                  )
                })}
              </Space>
            )}
          </Card>
        </Space>
      </Drawer>

      <Modal
        open={!!detailRun}
        title={detailRun ? `${runTypeLabel(detailRun.run_type)} · ${detailRun.step_name || 'step'}` : '任务详情'}
        onCancel={() => setDetailRun(null)}
        footer={<Button type="primary" onClick={() => setDetailRun(null)}>关闭</Button>}
        width={820}
      >
        {detailRun && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              {statusTag(detailRun.status)}
              <Tag bordered={false}>{detailRun.created_at || '-'}</Tag>
              {detailRun.duration_ms ? <Tag bordered={false}>{detailRun.duration_ms}ms</Tag> : null}
            </Space>
            {detailRun.error_message && (
              <Card size="small" title="错误信息">
                <Text type="danger">{detailRun.error_message}</Text>
              </Card>
            )}
            {detailRun.run_type === 'batch_generate_prose' && <BatchProseRunSummary run={detailRun} />}
            {detailRun.run_type === 'chapter_generation_pipeline' && <ChapterPipelineRunSummary run={detailRun} />}
            {detailRun.run_type === 'release_repair_queue' && <ReleaseRepairRunSummary run={detailRun} />}
            {['mechanical_qa_repair', 'first30_retention_repair'].includes(detailRun.run_type) && (
              <RepairTaskRunSummary
                run={detailRun}
                runRecords={runRecords}
                safeBatchRecoveryFocus={safeBatchRecoveryFocus}
                onRefresh={onRefresh}
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  return onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  return onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onStartRepairTaskRevision?.(task, run, taskIndex, options)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onExecuteTypedRepairTask?.(task, run, taskIndex, options)
                }}
                onRecheckRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onRecheckRepairTask?.(task, run, taskIndex, options)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  return handleUpdateRepairTaskStatus(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onGenerateRepairAuditSummary?.(run, options)
                }}
                onCreateRecoveryEvidenceGovernanceQueue={(payload, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onCreateRecoveryEvidenceGovernanceQueue?.(payload, run, taskIndex, options)
                }}
              />
            )}
            {detailRun.run_type === 'longform_production_repair' && (
              <RepairTaskRunSummary
                run={detailRun}
                runRecords={runRecords}
                safeBatchRecoveryFocus={safeBatchRecoveryFocus}
                onRefresh={onRefresh}
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  return onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  return onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onStartRepairTaskRevision?.(task, run, taskIndex, options)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onExecuteTypedRepairTask?.(task, run, taskIndex, options)
                }}
                onRecheckRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onRecheckRepairTask?.(task, run, taskIndex, options)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  return handleUpdateRepairTaskStatus(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onGenerateRepairAuditSummary?.(run, options)
                }}
                onCreateRecoveryEvidenceGovernanceQueue={(payload, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onCreateRecoveryEvidenceGovernanceQueue?.(payload, run, taskIndex, options)
                }}
              />
            )}
            {['release_quality_batch', 'release_similarity_batch'].includes(detailRun.run_type) && <ReleaseBatchRunSummary run={detailRun} />}
            {detailRun.run_type === 'chapter_group_generation' && <ChapterGroupRunSummary run={detailRun} onApproveChapterGroup={onApproveChapterGroup} onRetryChapterGroup={onRetryChapterGroup} onSkipChapterGroup={onSkipChapterGroup} />}
            <Card size="small" title="输入">
              <Paragraph style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', marginBottom: 0 }}>
                {safeJsonPreview(detailRun.input_ref) || '无'}
              </Paragraph>
            </Card>
            <Card size="small" title="输出">
              <Paragraph style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto', marginBottom: 0 }}>
                {safeJsonPreview(detailRun.output_ref) || '无'}
              </Paragraph>
            </Card>
          </Space>
        )}
      </Modal>

      <Modal
        open={!!detailKnowledgeJob}
        title={detailKnowledgeJob ? `全本任务 · ${detailKnowledgeJob.project_title || detailKnowledgeJob.id}` : '全本任务详情'}
        onCancel={() => setDetailKnowledgeJob(null)}
        footer={<Button type="primary" onClick={() => setDetailKnowledgeJob(null)}>关闭</Button>}
        width={860}
      >
        {detailKnowledgeJob && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              {statusTag(detailKnowledgeJob.status)}
              <Tag bordered={false}>{detailKnowledgeJob.phase || '-'}</Tag>
              <Tag bordered={false}>并发 {detailKnowledgeJob.fetch_concurrency || 1}</Tag>
              <Tag bordered={false}>批量 {detailKnowledgeJob.batch_size || 0} 章</Tag>
              {sourceCacheTag(detailKnowledgeJob.source_cache)}
            </Space>
            <Progress percent={Math.max(0, Math.min(100, Number(detailKnowledgeJob.progress || 0)))} size="small" />
            <Card size="small" title="来源">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailKnowledgeJob.url || '无'}</Paragraph>
            </Card>
            {Array.isArray(detailKnowledgeJob.errors) && detailKnowledgeJob.errors.length > 0 && (
              <Card size="small" title="错误">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailKnowledgeJob.errors.join('\n')}</Paragraph>
              </Card>
            )}
            <Card size="small" title="批次">
              {Array.isArray(detailKnowledgeJob.batches) && detailKnowledgeJob.batches.length > 0 ? (
                <Space wrap>
                  {detailKnowledgeJob.batches.map((batch: any) => (
                    <Tag key={batch.index} bordered={false} color={batch.status === 'completed' ? 'green' : batch.status === 'failed' ? 'red' : batch.status === 'analyzing' ? 'blue' : 'default'}>
                      {batch.first_chapter === batch.last_chapter ? `第${batch.first_chapter}章` : `第${batch.first_chapter}-${batch.last_chapter}章`}
                      {' '}
                      {batch.status}
                      {typeof batch.entry_count === 'number' ? ` ${batch.entry_count}条` : ''}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">暂无批次</Text>
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </>
  )
}
