import React from 'react'
import { Alert, Button, Card, Drawer, Empty, Input, List, Select, Space, Statistic, Tag, Typography, message } from 'antd'
import { FileSearchOutlined, ReloadOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const { Text, Paragraph } = Typography

function statusColor(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (['success', 'ok', 'completed'].includes(normalized)) return 'green'
  if (['failed', 'error'].includes(normalized)) return 'red'
  if (['warn', 'fallback', 'needs_approval', 'needs_confirmation'].includes(normalized)) return 'gold'
  if (['running', 'queued', 'ready', 'paused'].includes(normalized)) return 'blue'
  return 'default'
}

function sourceColor(source?: string) {
  if (String(source || '').includes('generate')) return 'blue'
  if (String(source || '').includes('quality') || String(source || '').includes('review')) return 'green'
  if (String(source || '').includes('similarity') || String(source || '').includes('safety')) return 'red'
  if (String(source || '').includes('agent')) return 'purple'
  return 'default'
}

function gapLabel(type?: string) {
  const map: Record<string, string> = {
    missing_context: '缺上下文',
    missing_config_snapshot: '缺配置快照',
    missing_model_trace: '缺模型',
    missing_safety_trace: '缺安全',
    failed_event: '失败',
  }
  return map[String(type || '')] || type || '缺口'
}

export function AgentAuditDrawer({
  open,
  projectId,
  onClose,
  onSelectChapter,
  onOpenTaskCenter,
}: {
  open: boolean
  projectId: number
  onClose: () => void
  onSelectChapter: (chapterId: number) => void
  onOpenTaskCenter?: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [audit, setAudit] = React.useState<any | null>(null)
  const [filter, setFilter] = React.useState('all')
  const [keyword, setKeyword] = React.useState('')

  const loadAudit = React.useCallback(async () => {
    if (!open || !projectId) return
    setLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/agent-audit`)
      setAudit(res.data?.audit || null)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || 'Agent 审计加载失败')
    } finally {
      setLoading(false)
    }
  }, [open, projectId])

  React.useEffect(() => {
    void loadAudit()
  }, [loadAudit])

  const gapMap = React.useMemo(() => {
    const map = new Map<string, any[]>()
    for (const gap of audit?.gaps || []) {
      const list = map.get(gap.event_key) || []
      list.push(gap)
      map.set(gap.event_key, list)
    }
    return map
  }, [audit])

  const events = Array.isArray(audit?.events) ? audit.events : []
  const filteredEvents = events.filter((event: any) => {
    const gaps = gapMap.get(event.key) || []
    if (filter === 'failed' && !event.error && !['failed', 'error'].includes(String(event.status || '').toLowerCase())) return false
    if (filter === 'missing_context' && !gaps.some(gap => gap.type === 'missing_context')) return false
    if (filter === 'missing_config' && !gaps.some(gap => gap.type === 'missing_config_snapshot')) return false
    if (filter === 'missing_model' && !gaps.some(gap => gap.type === 'missing_model_trace')) return false
    if (filter === 'missing_safety' && !gaps.some(gap => gap.type === 'missing_safety_trace')) return false
    const text = [
      event.title,
      event.source_label,
      event.status,
      event.chapter_no,
      event.model?.model_name,
      event.output_summary,
      event.error,
      ...(event.warnings || []),
    ].join('\n').toLowerCase()
    return !keyword.trim() || text.includes(keyword.trim().toLowerCase())
  })

  const openChapter = (chapterId: number) => {
    onClose()
    onSelectChapter(chapterId)
  }

  const openTasks = () => {
    onClose()
    onOpenTaskCenter?.()
  }

  const summary = audit?.summary || {}

  return (
    <Drawer
      open={open}
      title="Agent 调用审计"
      width={760}
      onClose={onClose}
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => { void loadAudit() }}>刷新</Button>}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type={summary.gap_count ? 'warning' : 'success'}
          showIcon
          message={summary.gap_count ? `发现 ${summary.gap_count} 个可追踪性缺口` : '当前可追踪性良好'}
          description="这里汇总长任务、章节生成、质检、修订、相似度和状态机记录，用于排查某次生成使用了哪些材料、模型与安全检查。"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
          <Card size="small"><Statistic title="事件" value={summary.total_events || 0} /></Card>
          <Card size="small"><Statistic title="配置快照" value={summary.config_traced || 0} /></Card>
          <Card size="small"><Statistic title="上下文追踪" value={summary.context_traced || 0} /></Card>
          <Card size="small"><Statistic title="安全检查" value={summary.safety_checks || 0} /></Card>
          <Card size="small"><Statistic title="失败" value={summary.failed_events || 0} valueStyle={{ color: summary.failed_events ? '#cf1322' : undefined }} /></Card>
        </div>

        {Array.isArray(audit?.recommendations) && audit.recommendations.length > 0 && (
          <Card size="small" title="审计建议">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {audit.recommendations.map((item: string, index: number) => (
                <Text key={index} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
            </Space>
          </Card>
        )}

        <Card size="small" styles={{ body: { padding: 10 } }}>
          <Space wrap>
            <Select
              size="small"
              value={filter}
              onChange={setFilter}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: '全部事件' },
                { value: 'failed', label: '失败事件' },
                { value: 'missing_context', label: '缺上下文' },
                { value: 'missing_config', label: '缺配置快照' },
                { value: 'missing_model', label: '缺模型记录' },
                { value: 'missing_safety', label: '缺安全追踪' },
              ]}
            />
            <Input.Search
              allowClear
              size="small"
              placeholder="搜索章节、模型、警告"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              style={{ width: 260 }}
            />
            <Button size="small" onClick={openTasks}>打开任务中心</Button>
          </Space>
        </Card>

        {filteredEvents.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的审计事件" />
        ) : (
          <List
            size="small"
            dataSource={filteredEvents}
            renderItem={(event: any) => {
              const gaps = gapMap.get(event.key) || []
              return (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }} styles={{ body: { padding: 10 } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                        <Space wrap>
                          <Tag color={sourceColor(event.source)} bordered={false}>{event.source_label || event.source}</Tag>
                          <Tag color={statusColor(event.status)} bordered={false}>{event.status || '-'}</Tag>
                          {event.chapter_no && <Tag color="purple" bordered={false}>第{event.chapter_no}章</Tag>}
                          {event.model?.model_name || event.model?.model_id ? (
                            <Tag bordered={false}>{event.model?.model_name || `模型 ${event.model?.model_id}`}</Tag>
                          ) : (
                            <Tag color="gold" bordered={false}>模型未记录</Tag>
                          )}
                          {event.materials?.has_context_package ? <Tag color="green" bordered={false}>有上下文</Tag> : <Tag color="gold" bordered={false}>无上下文</Tag>}
                          {event.config?.has_snapshot ? <Tag color="green" bordered={false}>配置 v{event.config?.agent_prompt_version || '-'}</Tag> : <Tag color="gold" bordered={false}>无配置快照</Tag>}
                          {event.safety?.has_reference_report || event.safety?.has_safety_decision ? <Tag color={event.safety?.blocked ? 'red' : 'green'} bordered={false}>安全已检</Tag> : null}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</Text>
                      </Space>

                      <Text strong>{event.title}</Text>
                      {event.output_summary && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                          {event.output_summary}
                        </Paragraph>
                      )}

                      {gaps.length > 0 && (
                        <Space wrap>
                          {gaps.map((gap: any) => (
                            <Tag key={`${event.key}-${gap.type}`} color={gap.severity === 'high' ? 'red' : 'gold'} bordered={false}>
                              {gapLabel(gap.type)}
                            </Tag>
                          ))}
                        </Space>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                        <Card size="small" styles={{ body: { padding: 8 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>材料</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag bordered={false}>场景 {event.materials?.scene_cards_count || 0}</Tag>
                            <Tag bordered={false}>参考 {event.materials?.reference_entries_count || 0}</Tag>
                            <Tag bordered={false}>角色 {event.materials?.character_count || 0}</Tag>
                          </div>
                        </Card>
                        <Card size="small" styles={{ body: { padding: 8 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>前置检查</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag color={event.materials?.preflight_ready === false ? 'red' : event.materials?.preflight_ready === true ? 'green' : 'default'} bordered={false}>
                              {event.materials?.preflight_ready === false ? '未通过' : event.materials?.preflight_ready === true ? '通过' : '未记录'}
                            </Tag>
                            <Tag bordered={false}>阻断 {event.materials?.blocker_count || 0}</Tag>
                          </div>
                        </Card>
                        <Card size="small" styles={{ body: { padding: 8 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>安全</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag color={event.safety?.blocked ? 'red' : event.safety?.has_safety_decision ? 'green' : 'default'} bordered={false}>
                              {event.safety?.blocked ? '阻断' : event.safety?.has_safety_decision ? '通过' : '未记录'}
                            </Tag>
                            <Tag bordered={false}>照搬 {event.safety?.copy_hit_count || 0}</Tag>
                          </div>
                        </Card>
                        <Card size="small" styles={{ body: { padding: 8 } }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>配置</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag color={event.config?.has_snapshot ? 'green' : 'default'} bordered={false}>
                              {event.config?.has_snapshot ? `v${event.config?.agent_prompt_version || '-'}` : '未记录'}
                            </Tag>
                            <Tag bordered={false}>{event.config?.fingerprint || '-'}</Tag>
                          </div>
                        </Card>
                      </div>

                      {(event.error || (event.warnings || []).length > 0) && (
                        <Alert
                          type={event.error ? 'error' : 'warning'}
                          showIcon
                          message={event.error || (event.warnings || []).slice(0, 3).join('；')}
                        />
                      )}

                      <Space wrap>
                        {event.chapter_id && <Button size="small" icon={<FileSearchOutlined />} onClick={() => openChapter(Number(event.chapter_id))}>打开章节</Button>}
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )
            }}
          />
        )}
      </Space>
    </Drawer>
  )
}
