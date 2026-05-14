import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Empty, Form, Input, List, message, Modal, Progress, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'

const { Title, Text, Paragraph } = Typography

function statusColor(status?: string) {
  if (status === 'success') return 'green'
  if (status === 'running') return 'blue'
  if (status === 'paused' || status === 'needs_approval' || status === 'paused_budget') return 'gold'
  if (status === 'failed' || status === 'error') return 'red'
  return 'default'
}

export default function NovelProductionDesk() {
  const navigate = useNavigate()
  const { id } = useParams()
  const projectId = Number(id)
  const [loading, setLoading] = useState(false)
  const [dashboard, setDashboard] = useState<any>({})
  const [queue, setQueue] = useState<any>({})
  const [budget, setBudget] = useState<any>({})
  const [runs, setRuns] = useState<any[]>([])
  const [selectedRun, setSelectedRun] = useState<any | null>(null)
  const [budgetForm] = Form.useForm()

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [dashboardRes, queueRes, budgetRes, runsRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/production-dashboard`),
        apiClient.get(`/novel/projects/${projectId}/run-queue`),
        apiClient.get(`/novel/projects/${projectId}/production-budget`),
        apiClient.get('/novel/runs', { params: { project_id: projectId } }),
      ])
      setDashboard(dashboardRes.data?.dashboard || {})
      setQueue(queueRes.data || {})
      setBudget(budgetRes.data || {})
      setRuns(Array.isArray(runsRes.data) ? runsRes.data : [])
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生产台加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [projectId])

  const chapterGroupRuns = useMemo(() => (
    runs.filter(run => run.run_type === 'chapter_group_generation')
  ), [runs])

  const startWorker = async () => {
    await apiClient.post(`/novel/projects/${projectId}/run-queue/start-worker`, { max_chapters_per_run: 1 })
    message.success('worker 已启动')
    await load()
  }

  const stopWorker = async () => {
    await apiClient.post(`/novel/projects/${projectId}/run-queue/stop-worker`)
    message.success('worker 已请求停止')
    await load()
  }

  const approveChapter = async (run: any, chapter: any) => {
    await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/approve`, {
      chapter_id: chapter.id,
      stage: chapter.approval_stage || 'scene_cards',
    })
    message.success(`第${chapter.chapter_no}章已确认`)
    await load()
  }

  const retryChapter = async (run: any, chapter: any) => {
    await apiClient.post(`/novel/projects/${projectId}/chapter-groups/${run.id}/retry-now`, { chapter_id: chapter.id })
    message.success(`第${chapter.chapter_no}章已加入立即重试`)
    await load()
  }

  const syncVolumeControl = async () => {
    await apiClient.post(`/novel/projects/${projectId}/volume-control/sync`)
    message.success('已同步滚动规划到卷级控制')
    await load()
  }

  const openBudgetEditor = () => {
    budgetForm.setFieldsValue({ budget: JSON.stringify(budget.budget || {}, null, 2) })
    Modal.confirm({
      title: '生产预算控制',
      width: 720,
      content: (
        <Form form={budgetForm} layout="vertical">
          <Form.Item name="budget" label="预算 JSON">
            <Input.TextArea rows={12} />
          </Form.Item>
        </Form>
      ),
      okText: '保存',
      onOk: async () => {
        const values = await budgetForm.validateFields()
        await apiClient.put(`/novel/projects/${projectId}/production-budget`, { budget: JSON.parse(values.budget || '{}') })
        message.success('生产预算已保存')
        await load()
      },
    })
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ height: 48, flexShrink: 0, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/novel/workspace/${projectId}`)} />
        <Title level={5} style={{ margin: 0, flex: 1 }}>{dashboard.title || '章节生产台'}</Title>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新</Button>
        <Button size="small" onClick={openBudgetEditor}>预算</Button>
        <Button size="small" onClick={syncVolumeControl}>同步卷级规划</Button>
        <Button size="small" type="primary" onClick={startWorker}>启动 worker</Button>
        <Button size="small" danger onClick={stopWorker}>停止 worker</Button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr) 320px', gap: 12, padding: 12 }}>
        <Card size="small" title="章节队列" styles={{ body: { height: 'calc(100vh - 126px)', overflow: 'auto' } }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {(dashboard.chapter_trends || []).map((chapter: any) => (
              <div key={chapter.chapter_id} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
                <Space wrap>
                  <Tag bordered={false}>第{chapter.chapter_no}章</Tag>
                  <Tag color={chapter.has_text ? 'green' : 'default'} bordered={false}>{chapter.has_text ? '已写' : '未写'}</Tag>
                  {chapter.quality_score && <Tag color={chapter.quality_score >= 78 ? 'green' : 'gold'} bordered={false}>{chapter.quality_score}分</Tag>}
                  {chapter.similarity_risk && <Tag color={chapter.similarity_risk > 45 ? 'red' : 'default'} bordered={false}>风险 {chapter.similarity_risk}</Tag>}
                </Space>
                <Paragraph style={{ margin: '4px 0 0', fontSize: 12 }} ellipsis={{ rows: 2 }}>{chapter.title}</Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>字数 {chapter.word_count || 0} · 修订 {chapter.revision_count || 0}</Text>
              </div>
            ))}
          </Space>
        </Card>

        <Card size="small" title="任务流水线" styles={{ body: { height: 'calc(100vh - 126px)', overflow: 'auto' } }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {budget?.decision?.blocked && <Alert type="warning" showIcon message="预算熔断" description={budget.decision.reasons?.join('；')} />}
            <Space wrap>
              <Tag color={statusColor(queue.worker?.status)} bordered={false}>worker：{queue.worker?.status || 'idle'}</Tag>
              <Tag bordered={false}>待执行 {queue.summary?.queued || 0}</Tag>
              <Tag bordered={false}>运行中 {queue.summary?.running || 0}</Tag>
              <Tag bordered={false}>暂停 {queue.summary?.paused || 0}</Tag>
            </Space>
            <List
              size="small"
              dataSource={chapterGroupRuns}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无章节群任务" /> }}
              renderItem={(run: any) => {
                const payload = (() => { try { return JSON.parse(run.output_ref || '{}') } catch { return {} } })()
                const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
                return (
                  <List.Item actions={[<Button key="detail" type="link" size="small" onClick={() => setSelectedRun(run)}>详情</Button>]}>
                    <List.Item.Meta
                      title={<Space wrap><Tag color={statusColor(run.status)} bordered={false}>{run.status}</Tag><Text strong>{run.step_name}</Text></Space>}
                      description={(
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{payload.phase || run.created_at}</Text>
                          <Progress percent={chapters.length ? Math.round((chapters.filter((ch: any) => ['success', 'skipped', 'written'].includes(ch.status)).length / chapters.length) * 100) : 0} size="small" />
                          <Space wrap size={[4, 4]}>
                            {chapters.slice(0, 20).map((chapter: any) => (
                              <Tag key={chapter.id || chapter.chapter_no} color={statusColor(chapter.status)} bordered={false}>第{chapter.chapter_no}章</Tag>
                            ))}
                          </Space>
                        </Space>
                      )}
                    />
                  </List.Item>
                )
              }}
            />
          </Space>
        </Card>

        <Card size="small" title="卷级控制" styles={{ body: { height: 'calc(100vh - 126px)', overflow: 'auto' } }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {(dashboard.volume_controls || []).length ? dashboard.volume_controls.map((volume: any) => (
              <div key={volume.id || volume.title} style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                <Text strong>{volume.title}</Text>
                <Progress percent={volume.progress || 0} size="small" />
                <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3 }}>{volume.summary}</Paragraph>
              </div>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分卷目标" />}
          </Space>
        </Card>
      </div>

      <Modal open={!!selectedRun} title={selectedRun?.step_name || '任务详情'} width={860} onCancel={() => setSelectedRun(null)} footer={<Button type="primary" onClick={() => setSelectedRun(null)}>关闭</Button>}>
        {selectedRun && (() => {
          const payload = (() => { try { return JSON.parse(selectedRun.output_ref || '{}') } catch { return {} } })()
          const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
          return (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={statusColor(selectedRun.status)} bordered={false}>{selectedRun.status}</Tag>
                <Tag bordered={false}>{payload.phase || '-'}</Tag>
                {payload.lock?.owner && <Tag color="blue" bordered={false}>锁 {payload.lock.owner}</Tag>}
              </Space>
              {chapters.map((chapter: any) => (
                <div key={chapter.id || chapter.chapter_no} style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space wrap>
                      <Tag color={statusColor(chapter.status)} bordered={false}>第{chapter.chapter_no}章 · {chapter.status}</Tag>
                      {chapter.attempts ? <Tag bordered={false}>重试 {chapter.attempts}</Tag> : null}
                    </Space>
                    <Space>
                      {chapter.status === 'needs_approval' && <Button size="small" type="link" onClick={() => approveChapter(selectedRun, chapter)}>确认</Button>}
                      {['ready', 'failed', 'needs_approval'].includes(chapter.status) && <Button size="small" type="link" onClick={() => retryChapter(selectedRun, chapter)}>立即重试</Button>}
                    </Space>
                  </Space>
                  {chapter.error && <Paragraph type="danger" style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>{chapter.error}</Paragraph>}
                  {chapter.recovery_plan?.actions?.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>建议：{chapter.recovery_plan.actions.join(' / ')}</Text>}
                </div>
              ))}
            </Space>
          )
        })()}
      </Modal>
    </div>
  )
}
