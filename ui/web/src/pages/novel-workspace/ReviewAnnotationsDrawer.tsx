import React from 'react'
import { Button, Card, Drawer, Empty, Input, List, Progress, Select, Space, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, FileSearchOutlined, ReloadOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const { Text, Paragraph } = Typography

function severityColor(severity?: string) {
  if (severity === 'high' || severity === 'critical') return 'red'
  if (severity === 'medium') return 'gold'
  if (severity === 'low') return 'default'
  return 'blue'
}

function categoryLabel(category?: string) {
  const map: Record<string, string> = {
    quality: '质量',
    editorial: '编辑',
    safety: '仿写安全',
    release: '发布',
    continuity: '连续性',
  }
  return map[String(category || '')] || category || '通用'
}

export function ReviewAnnotationsDrawer({
  open,
  projectId,
  onClose,
  onSelectChapter,
  onApplyEditorRevision,
  onChanged,
}: {
  open: boolean
  projectId: number
  onClose: () => void
  onSelectChapter: (chapterId: number) => void
  onApplyEditorRevision?: (review: any) => void
  onChanged?: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [resolvingKey, setResolvingKey] = React.useState('')
  const [payload, setPayload] = React.useState<any | null>(null)
  const [statusFilter, setStatusFilter] = React.useState('open')
  const [severityFilter, setSeverityFilter] = React.useState('all')
  const [keyword, setKeyword] = React.useState('')

  const loadAnnotations = React.useCallback(async () => {
    if (!open || !projectId) return
    setLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/review-annotations`)
      setPayload(res.data || null)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '批注加载失败')
    } finally {
      setLoading(false)
    }
  }, [open, projectId])

  React.useEffect(() => {
    void loadAnnotations()
  }, [loadAnnotations])

  const annotations = Array.isArray(payload?.annotations) ? payload.annotations : []
  const summary = payload?.summary || {}
  const filtered = annotations.filter((item: any) => {
    if (statusFilter === 'open' && item.status === 'resolved') return false
    if (statusFilter === 'resolved' && item.status !== 'resolved') return false
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false
    const text = [item.title, item.message, item.action, item.source_label, item.chapter_no].join('\n').toLowerCase()
    return !keyword.trim() || text.includes(keyword.trim().toLowerCase())
  })

  const resolveAnnotation = async (item: any) => {
    setResolvingKey(item.key)
    try {
      await apiClient.post(`/novel/projects/${projectId}/review-annotations/status`, {
        annotation_key: item.key,
        status: 'resolved',
      })
      message.success('批注已标记处理')
      await loadAnnotations()
      onChanged?.()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '批注状态更新失败')
    } finally {
      setResolvingKey('')
    }
  }

  const openChapter = (item: any) => {
    if (!item.chapter_id) return
    onClose()
    onSelectChapter(Number(item.chapter_id))
  }

  const applyRevision = (item: any) => {
    if (!item.review_id || !onApplyEditorRevision) return
    onApplyEditorRevision({
      id: item.review_id,
      payload: JSON.stringify({ chapter_id: item.chapter_id }),
    })
  }

  return (
    <Drawer
      open={open}
      title="章节审阅批注"
      width={620}
      onClose={onClose}
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => { void loadAnnotations() }}>刷新</Button>}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card size="small">
          <Space align="center" size={18} wrap>
            <Progress
              type="circle"
              size={72}
              percent={summary.total ? Math.round((Number(summary.resolved || 0) / Number(summary.total || 1)) * 100) : 0}
            />
            <Space direction="vertical" size={6}>
              <Space wrap>
                <Tag color="blue" bordered={false}>总数 {summary.total || 0}</Tag>
                <Tag color="red" bordered={false}>高危 {summary.high || 0}</Tag>
                <Tag color="gold" bordered={false}>中危 {summary.medium || 0}</Tag>
                <Tag bordered={false}>低危 {summary.low || 0}</Tag>
                <Tag color="green" bordered={false}>已处理 {summary.resolved || 0}</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                批注来自正文质检、编辑报告、相似度报告、发布审核和本地连续性扫描。
              </Text>
            </Space>
          </Space>
        </Card>

        <Card size="small" styles={{ body: { padding: 10 } }}>
          <Space wrap>
            <Select
              size="small"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 110 }}
              options={[
                { value: 'open', label: '未处理' },
                { value: 'resolved', label: '已处理' },
                { value: 'all', label: '全部' },
              ]}
            />
            <Select
              size="small"
              value={severityFilter}
              onChange={setSeverityFilter}
              style={{ width: 110 }}
              options={[
                { value: 'all', label: '全部等级' },
                { value: 'high', label: '高危' },
                { value: 'medium', label: '中危' },
                { value: 'low', label: '低危' },
              ]}
            />
            <Input.Search
              allowClear
              size="small"
              placeholder="搜索批注、动作、章节"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              style={{ width: 240 }}
            />
          </Space>
        </Card>

        {filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的审阅批注" />
        ) : (
          <List
            size="small"
            dataSource={filtered}
            renderItem={(item: any) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }} styles={{ body: { padding: 10 } }}>
                  <Space direction="vertical" size={7} style={{ width: '100%' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                      <Space wrap>
                        <Tag color={severityColor(item.severity)} bordered={false}>{item.severity || 'info'}</Tag>
                        <Tag bordered={false}>{categoryLabel(item.category)}</Tag>
                        <Tag color={item.status === 'resolved' ? 'green' : 'blue'} bordered={false}>{item.status === 'resolved' ? '已处理' : '未处理'}</Tag>
                        {item.chapter_no && <Tag color="purple" bordered={false}>第{item.chapter_no}章</Tag>}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.source_label}</Text>
                    </Space>
                    <Text strong>{item.title}</Text>
                    {item.message && (
                      <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                        {item.message}
                      </Paragraph>
                    )}
                    {item.action && (
                      <Paragraph style={{ marginBottom: 0, fontSize: 12 }} type="secondary" ellipsis={{ rows: 2, expandable: true }}>
                        建议：{item.action}
                      </Paragraph>
                    )}
                    <Space wrap>
                      {item.chapter_id && <Button size="small" icon={<FileSearchOutlined />} onClick={() => openChapter(item)}>打开章节</Button>}
                      {item.source === 'editor_report' && item.review_id && onApplyEditorRevision && (
                        <Button size="small" type="primary" onClick={() => applyRevision(item)}>按报告修订</Button>
                      )}
                      {item.status !== 'resolved' && (
                        <Button
                          size="small"
                          icon={<CheckCircleOutlined />}
                          loading={resolvingKey === item.key}
                          onClick={() => { void resolveAnnotation(item) }}
                        >
                          标记处理
                        </Button>
                      )}
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Drawer>
  )
}
