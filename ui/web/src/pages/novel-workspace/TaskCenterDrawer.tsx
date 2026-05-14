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
  if (status === 'completed') return <Tag color="green" bordered={false}>已完成</Tag>
  if (status === 'canceled') return <Tag color="default" bordered={false}>已取消</Tag>
  if (status === 'fallback' || status === 'warn') return <Tag color="gold" bordered={false}>需检查</Tag>
  return <Tag bordered={false}>{status || '未知'}</Tag>
}

function runTypeLabel(type?: string) {
  const map: Record<string, string> = {
    plan: '全案规划',
    agent_execute: 'Agent 链',
    generate_prose: '正文生成',
    batch_generate_prose: '批量正文生成',
    repair: '连续性修复',
    restructure: '章节重组',
    market_review: '市场审计',
  }
  return map[String(type || '')] || type || '任务'
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
  knowledgeIngestJobs,
  loading,
  knowledgeJobsLoading,
  onClose,
  onRefresh,
  onRefreshKnowledgeJobs,
  onPauseKnowledgeJob,
  onResumeKnowledgeJob,
  onCancelKnowledgeJob,
}: {
  open: boolean
  activeTasks: WorkspaceActiveTask[]
  runRecords: any[]
  knowledgeIngestJobs: any[]
  loading: boolean
  knowledgeJobsLoading: boolean
  onClose: () => void
  onRefresh: () => void
  onRefreshKnowledgeJobs: () => void
  onPauseKnowledgeJob: (jobId: string) => void
  onResumeKnowledgeJob: (jobId: string) => void
  onCancelKnowledgeJob: (jobId: string) => void
}) {
  const [detailRun, setDetailRun] = useState<any | null>(null)
  const [detailKnowledgeJob, setDetailKnowledgeJob] = useState<any | null>(null)
  const sortedRuns = useMemo(() => (
    [...runRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [runRecords])
  const sortedKnowledgeJobs = useMemo(() => (
    [...knowledgeIngestJobs].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
  ), [knowledgeIngestJobs])

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
                    actions={[<Button key="detail" type="link" size="small" onClick={() => setDetailRun(run)}>详情</Button>]}
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
