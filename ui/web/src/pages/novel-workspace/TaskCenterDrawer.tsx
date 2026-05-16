import React, { useMemo, useState } from 'react'
import { Button, Card, Drawer, Empty, List, Modal, Popconfirm, Progress, Space, Tag, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

export type WorkspaceActiveTask = {
  key: string
  title: string
  phase?: string
  progress?: number
  detail?: string
  cancelLabel?: string
  onCancel?: () => void
}

function statusTag(status?: string) {
  if (status === 'success' || status === 'ok') return <Tag color="green" bordered={false}>成功</Tag>
  if (status === 'failed' || status === 'error') return <Tag color="red" bordered={false}>失败</Tag>
  if (status === 'running') return <Tag color="blue" bordered={false}>运行中</Tag>
  if (status === 'queued') return <Tag color="cyan" bordered={false}>排队</Tag>
  if (status === 'paused') return <Tag color="gold" bordered={false}>已暂停</Tag>
  if (status === 'needs_approval') return <Tag color="gold" bordered={false}>待确认</Tag>
  if (status === 'completed') return <Tag color="green" bordered={false}>已完成</Tag>
  if (status === 'canceled') return <Tag color="default" bordered={false}>已取消</Tag>
  if (status === 'fallback' || status === 'warn') return <Tag color="gold" bordered={false}>需检查</Tag>
  return <Tag bordered={false}>{status || '未知'}</Tag>
}

function runTypeLabel(type?: string) {
  const map: Record<string, string> = {
    plan: '全案规划',
    creative_command: '创作指令',
    agent_execute: 'Agent 链',
    generate_prose: '正文生成',
    batch_generate_prose: '批量正文生成',
    repair: '连续性修复',
    restructure: '章节重组',
    market_review: '市场审计',
    scene_cards: '场景卡',
    chapter_generation_pipeline: '章节流水线',
    chapter_group_generation: '章节群生成',
    original_incubation: '原创孵化',
    editor_revision: '编辑修订',
    book_review: '全书总检',
    quality_benchmark: '质量基准',
    mechanical_qa: '机械质检',
    propagation_debt: '传播债务',
    regression_benchmark: '回归基准',
    ab_experiment: 'A/B 实验',
    ab_sandbox: 'A/B 沙盒实写',
    ab_sandbox_apply: 'A/B 沙盒采纳',
    rolling_plan: '滚动规划',
    release_repair_queue: '发布修复队列',
    release_quality_batch: '发布质检批量任务',
    release_similarity_batch: '发布相似度批量任务',
    project_backup: '项目备份',
    genre_template_apply: '类型模板',
  }
  return map[String(type || '')] || type || '任务'
}

function productionModeLabel(mode?: string) {
  const map: Record<string, string> = {
    scene_cards_only: '只场景卡',
    draft_only: '只初稿',
    draft_review: '初稿+自检',
    draft_review_revise_store: '完整流水线',
    full_auto: '全自动',
  }
  return map[String(mode || '')] || mode || ''
}

function safeJsonPreview(value: any) {
  if (!value) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const raw = String(value)
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function BatchProseRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const failedChapters = chapters.filter((chapter: any) => chapter.status === 'failed')
  const successChapters = chapters.filter((chapter: any) => chapter.status === 'success')
  const avgScore = successChapters
    .map((chapter: any) => Number(chapter.score))
    .filter((score: number) => Number.isFinite(score))
  const scoreText = avgScore.length > 0
    ? Math.round(avgScore.reduce((sum: number, score: number) => sum + score, 0) / avgScore.length)
    : null

  return (
    <Card size="small" title="批量生成摘要">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>总计 {output.total ?? chapters.length} 章</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? successChapters.length} 章</Tag>
          <Tag color={failedChapters.length > 0 ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failedChapters.length} 章</Tag>
          {output.canceled && <Tag color="default" bordered={false}>已停止</Tag>}
          {Number(output.skipped || 0) > 0 && <Tag bordered={false}>未处理 {output.skipped} 章</Tag>}
          {scoreText !== null && <Tag color={scoreText >= 78 ? 'green' : 'gold'} bordered={false}>平均质检 {scoreText} 分</Tag>}
          <Tag bordered={false}>耗时 {run.duration_ms ? `${Math.round(Number(run.duration_ms) / 1000)}s` : '-'}</Tag>
        </Space>
        {chapters.length > 0 && (
          <Space wrap size={[4, 4]}>
            {chapters.slice(0, 80).map((chapter: any) => (
              <Tag
                key={`${chapter.chapter_no}-${chapter.id || chapter.title}`}
                color={chapter.status === 'success' ? (Number(chapter.score || 0) >= 78 ? 'green' : 'gold') : 'red'}
                bordered={false}
              >
                第{chapter.chapter_no}章
                {chapter.status === 'success' ? ` ${chapter.score ?? '-'}分${chapter.revised ? ' 修订' : ''}` : ' 失败'}
              </Tag>
            ))}
            {chapters.length > 80 && <Tag bordered={false}>另有 {chapters.length - 80} 章</Tag>}
          </Space>
        )}
        {failedChapters.length > 0 && (
          <Card size="small" title="失败章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {failedChapters.slice(0, 12).map((chapter: any) => (
                <Paragraph key={`${chapter.chapter_no}-${chapter.id || chapter.title}`} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                  第{chapter.chapter_no}章《{chapter.title || '未命名'}》：{chapter.error || '生成失败'}
                </Paragraph>
              ))}
              {failedChapters.length > 12 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {failedChapters.length - 12} 个失败章节，可查看下方原始输出。</Text>}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}

function ChapterPipelineRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const steps = Array.isArray(output.steps) ? output.steps : []
  return (
    <Card size="small" title="章节流水线">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>第{output.chapter_no || '-'}章</Tag>
          <Tag bordered={false}>当前：{output.current_step || '-'}</Tag>
          {output.can_resume_from && <Tag color="green" bordered={false}>可从 {output.can_resume_from} 继续</Tag>}
          {output.confirmed_scene_cards === false && <Tag color="gold" bordered={false}>等待场景卡确认</Tag>}
        </Space>
        {steps.length > 0 && (
          <Space wrap size={[4, 4]}>
            {steps.map((step: any) => (
              <Tag key={step.key} color={step.status === 'success' ? 'green' : step.status === 'failed' ? 'red' : step.status === 'needs_confirmation' ? 'gold' : step.status === 'ready' ? 'blue' : 'default'} bordered={false}>
                {step.label || step.key} · {step.status}
              </Tag>
            ))}
          </Space>
        )}
        {Array.isArray(output.context_package?.preflight?.warnings) && output.context_package.preflight.warnings.length > 0 && (
          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
            上下文缺口：{output.context_package.preflight.warnings.join('；')}
          </Paragraph>
        )}
      </Space>
    </Card>
  )
}

function ReleaseRepairRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const relatedRuns = Array.isArray(output.related_runs) ? output.related_runs : []
  return (
    <Card size="small" title="发布修复队列">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={output.release_audit?.can_release ? 'green' : 'red'} bordered={false}>
            发布评分 {output.release_audit?.score ?? '-'}
          </Tag>
          <Tag color="blue" bordered={false}>修复任务 {tasks.length}</Tag>
          <Tag bordered={false}>子任务 {relatedRuns.length}</Tag>
          <Tag color={(output.release_audit?.blocker_count || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {output.release_audit?.blocker_count || 0}</Tag>
          <Tag color={(output.release_audit?.warning_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>警告 {output.release_audit?.warning_count || 0}</Tag>
        </Space>
        {tasks.length > 0 && (
          <List
            size="small"
            dataSource={tasks}
            renderItem={(task: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    <Tag color={task.priority === 'high' ? 'red' : 'gold'} bordered={false}>{task.priority || 'medium'}</Tag>
                    <Text>{task.title}</Text>
                    <Tag bordered={false}>{task.count || 0} 项</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {task.action}{task.chapter_nos?.length ? ` · 章节：${task.chapter_nos.slice(0, 20).join('、')}` : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
        {relatedRuns.length > 0 && (
          <Space wrap>
            {relatedRuns.map((item: any) => (
              <Tag key={`${item.run_type}-${item.run_id}`} color="blue" bordered={false}>
                子任务 #{item.run_id} · {runTypeLabel(item.run_type)}
              </Tag>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  )
}

function ReleaseBatchRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const results = Array.isArray(output.results) ? output.results : []
  const failed = results.filter((item: any) => item.status === 'failed')
  const title = run.run_type === 'release_similarity_batch' ? '发布相似度批量任务' : '发布质检批量任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          {statusTag(run.status)}
          <Tag color="blue" bordered={false}>已处理 {output.processed || results.length || 0}</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? results.length - failed.length}</Tag>
          <Tag color={failed.length ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failed.length}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{output.phase || run.step_name || '-'}</Text>
        {results.length > 0 && (
          <List
            size="small"
            dataSource={results.slice(0, 30)}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    {statusTag(item.status)}
                    <Text>第{item.chapter_no}章</Text>
                    {typeof item.score === 'number' && <Tag color={item.score >= 78 ? 'green' : 'gold'} bordered={false}>质量 {item.score}</Tag>}
                    {typeof item.risk === 'number' && <Tag color={item.risk <= 35 ? 'green' : 'gold'} bordered={false}>风险 {item.risk}</Tag>}
                    {item.review_id && <Tag bordered={false}>报告 #{item.review_id}</Tag>}
                  </Space>
                  {item.error && <Text type="danger" style={{ fontSize: 12 }}>{item.error}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  )
}

function ChapterGroupRunSummary({
  run,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
}: {
  run: any
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const success = chapters.filter((item: any) => item.status === 'success').length
  const failed = chapters.filter((item: any) => item.status === 'failed').length
  const skipped = chapters.filter((item: any) => item.status === 'skipped' || item.status === 'written').length
  const total = chapters.length
  const percent = total ? Math.round(((success + skipped) / total) * 100) : 0
  const stageColor = (status?: string) => (
    status === 'success' ? 'green'
      : status === 'failed' ? 'red'
        : status === 'running' ? 'blue'
          : status === 'warn' ? 'gold'
            : status === 'skipped' ? 'default'
              : 'default'
  )
  return (
    <Card size="small" title="章节群执行">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>进度 {success + skipped}/{total}</Tag>
          <Tag color="green" bordered={false}>成功 {success}</Tag>
          <Tag color={failed ? 'red' : 'default'} bordered={false}>失败 {failed}</Tag>
          <Tag bordered={false}>跳过 {skipped}</Tag>
          <Tag bordered={false}>当前 {output.current_index ?? 0}</Tag>
        </Space>
        <Progress percent={percent} size="small" />
        {output.phase && <Text type="secondary" style={{ fontSize: 12 }}>{output.phase}</Text>}
        <Space wrap size={[4, 4]}>
          {chapters.slice(0, 80).map((chapter: any) => (
            <Tag
              key={`${chapter.id || chapter.chapter_no}-${chapter.status}`}
              color={chapter.status === 'success' ? 'green' : chapter.status === 'failed' ? 'red' : chapter.status === 'running' ? 'blue' : chapter.status === 'skipped' ? 'default' : 'gold'}
              bordered={false}
            >
              第{chapter.chapter_no}章 · {chapter.status || 'pending'}{chapter.score ? ` · ${chapter.score}分` : ''}
            </Tag>
          ))}
        </Space>
        {chapters.some((chapter: any) => Array.isArray(chapter.stages) && chapter.stages.length > 0) && (
          <Card size="small" title="章节流水线阶段" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {chapters.slice(0, 12).map((chapter: any) => {
                const stages = Array.isArray(chapter.stages) ? chapter.stages : []
                if (!stages.length) return null
                return (
                  <div key={`stages-${chapter.id || chapter.chapter_no}`} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                    <Text strong style={{ fontSize: 12 }}>第{chapter.chapter_no}章</Text>
                    <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                      {stages.map((stage: any) => (
                        <Tag key={`${chapter.id || chapter.chapter_no}-${stage.key}`} color={stageColor(stage.status)} bordered={false}>
                          {stage.label || stage.key}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )
              })}
            </Space>
          </Card>
        )}
        {output.last_error && (
          <Paragraph type="danger" style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>
            第{output.last_error.chapter_no}章失败：{output.last_error.error}
          </Paragraph>
        )}
        {chapters.some((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)) && (
          <Card size="small" title="可操作章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {chapters.filter((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)).slice(0, 10).map((chapter: any) => (
                <Space key={`action-${chapter.id || chapter.chapter_no}`} style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12 }}>第{chapter.chapter_no}章 · {chapter.error || chapter.approval_stage || chapter.status}</Text>
                  <Space>
                    {chapter.status === 'needs_approval' && onApproveChapterGroup && <Button size="small" type="link" onClick={() => onApproveChapterGroup(run, chapter)}>确认</Button>}
                    {onRetryChapterGroup && <Button size="small" type="link" onClick={() => onRetryChapterGroup(run, chapter)}>重试</Button>}
                    {onSkipChapterGroup && <Button size="small" type="link" danger onClick={() => onSkipChapterGroup(run, chapter)}>跳过</Button>}
                  </Space>
                </Space>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}

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
}: {
  open: boolean
  activeTasks: WorkspaceActiveTask[]
  runRecords: any[]
  productionTasks?: any | null
  knowledgeIngestJobs: any[]
  loading: boolean
  knowledgeJobsLoading: boolean
  onClose: () => void
  onRefresh: () => void
  onRefreshKnowledgeJobs: () => void
  onPauseKnowledgeJob: (jobId: string) => void
  onResumeKnowledgeJob: (jobId: string) => void
  onCancelKnowledgeJob: (jobId: string) => void
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
}) {
  const [detailRun, setDetailRun] = useState<any | null>(null)
  const [detailKnowledgeJob, setDetailKnowledgeJob] = useState<any | null>(null)
  const sortedRuns = useMemo(() => (
    [...runRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [runRecords])
  const sortedKnowledgeJobs = useMemo(() => (
    [...knowledgeIngestJobs].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
  ), [knowledgeIngestJobs])
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
                  {normalizedTasks.slice(0, 8).map((task: any) => (
                    <div key={`${task.run_type}-${task.id}`} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                          <Space wrap>
                            {statusTag(task.status)}
                            <Text strong>{task.type_label || runTypeLabel(task.run_type)}</Text>
                            <Tag bordered={false}>{task.step_name || '-'}</Tag>
                            {productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode) && (
                              <Tag color="purple" bordered={false}>{productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode)}</Tag>
                            )}
                          </Space>
                          <Button size="small" type="link" onClick={() => openTaskDetail(task)}>详情</Button>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(task.progress || 0)))} size="small" />
                        <Text type="secondary" style={{ fontSize: 12 }}>{task.phase || task.created_at || '-'}</Text>
                        {task.error && <Text type="danger" style={{ fontSize: 12 }}>{task.error}</Text>}
                        {task.recovery_plan && (
                          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                            恢复方案：{safeJsonPreview(task.recovery_plan)}
                          </Paragraph>
                        )}
                        <Space wrap>
                          {task.can_pause && onPauseRun && (
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => onPauseRun(task)}>暂停</Button>
                          )}
                          {task.can_resume && onResumeRun && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onResumeRun(task)}>继续</Button>
                          )}
                          {task.can_execute && task.run_type === 'chapter_group_generation' && onExecuteChapterGroup && (
                            <Button size="small" loading={chapterGroupExecutingId === task.id} onClick={() => onExecuteChapterGroup(task)}>执行</Button>
                          )}
                          {['release_quality_batch', 'release_similarity_batch'].includes(task.run_type) && ['queued', 'ready', 'failed'].includes(task.status) && onExecuteReleaseRepairRun && (
                            <Button size="small" type="primary" loading={releaseRepairExecutingId === task.id} onClick={() => onExecuteReleaseRepairRun(task)}>执行发布批量</Button>
                          )}
                          {task.error && (
                            <Button size="small" type="link" onClick={() => openTaskDetail(task)}>查看恢复</Button>
                          )}
                        </Space>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </Space>
          </Card>

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
              <List
                size="small"
                dataSource={sortedRuns.slice(0, 80)}
                renderItem={(run: any) => (
                  <List.Item
                    actions={[
                      run.run_type === 'chapter_generation_pipeline' && run.status !== 'paused' && onPauseRun ? <Button key="pause" type="link" size="small" onClick={() => onPauseRun(run)}>暂停</Button> : null,
                      run.run_type === 'chapter_generation_pipeline' && ['paused', 'failed', 'ready'].includes(run.status) && onResumeRun ? <Button key="resume" type="link" size="small" onClick={() => onResumeRun(run)}>继续</Button> : null,
                      run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed'].includes(run.status) && onResumeRun ? <Button key="resume-group" type="link" size="small" onClick={() => onResumeRun(run)}>继续</Button> : null,
                      run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed', 'running'].includes(run.status) && onExecuteChapterGroup ? <Button key="execute-group" type="link" size="small" loading={chapterGroupExecutingId === run.id} onClick={() => onExecuteChapterGroup(run)}>执行</Button> : null,
                      ['release_quality_batch', 'release_similarity_batch'].includes(run.run_type) && ['queued', 'ready', 'failed'].includes(run.status) && onExecuteReleaseRepairRun ? <Button key="execute-release" type="link" size="small" loading={releaseRepairExecutingId === run.id} onClick={() => onExecuteReleaseRepairRun(run)}>执行发布批量</Button> : null,
                      run.run_type === 'chapter_group_generation' && run.status === 'running' && onPauseRun ? <Button key="pause-group" type="link" size="small" onClick={() => onPauseRun(run)}>暂停</Button> : null,
                      <Button key="detail" type="link" size="small" onClick={() => setDetailRun(run)}>详情</Button>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          {statusTag(run.status)}
                          <Text strong>{runTypeLabel(run.run_type)}</Text>
                          <Tag bordered={false}>{run.step_name || 'step'}</Tag>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{run.created_at || '-'}</Text>
                          {run.run_type === 'chapter_group_generation' && productionModeLabel(getRunPayload(run).production_mode || getRunPayload(run).policy?.production_mode) && (
                            <Text type="secondary" style={{ fontSize: 12 }}>模式：{productionModeLabel(getRunPayload(run).production_mode || getRunPayload(run).policy?.production_mode)}</Text>
                          )}
                          {run.error_message && <Text type="danger" style={{ fontSize: 12 }}>{run.error_message}</Text>}
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
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
