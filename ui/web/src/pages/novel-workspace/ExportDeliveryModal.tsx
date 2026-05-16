import React from 'react'
import { Alert, Button, Card, Empty, InputNumber, List, message, Modal, Progress, Space, Statistic, Switch, Tag, Typography } from 'antd'
import { BookOutlined, DownloadOutlined, FileMarkdownOutlined, FileTextOutlined, FileWordOutlined, ReloadOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'

const { Text, Paragraph } = Typography

type ExportFormat = 'txt' | 'markdown' | 'docx' | 'epub'

function buildQuery(params: Record<string, any>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  return search.toString()
}

function downloadUrl(projectId: number, format: ExportFormat, options: any) {
  const baseURL = String(apiClient.defaults.baseURL || '').replace(/\/$/, '')
  const query = buildQuery({
    format,
    start_chapter: options.startChapter || '',
    end_chapter: options.endChapter || '',
    include_unwritten: options.includeUnwritten ? 1 : 0,
  })
  return `${baseURL}/novel/projects/${projectId}/export?${query}`
}

function triggerDownload(projectId: number, format: ExportFormat, options: any) {
  const link = document.createElement('a')
  link.href = downloadUrl(projectId, format, options)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function ExportDeliveryModal({
  open,
  projectId,
  onClose,
  onOpenQualityBenchmark,
  onOpenConsistencyGraph,
  onOpenTaskCenter,
}: {
  open: boolean
  projectId: number
  onClose: () => void
  onOpenQualityBenchmark?: () => void
  onOpenConsistencyGraph?: () => void
  onOpenTaskCenter?: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [locking, setLocking] = React.useState(false)
  const [repairing, setRepairing] = React.useState(false)
  const [autoRepairing, setAutoRepairing] = React.useState(false)
  const [preview, setPreview] = React.useState<any | null>(null)
  const [startChapter, setStartChapter] = React.useState<number | null>(null)
  const [endChapter, setEndChapter] = React.useState<number | null>(null)
  const [includeUnwritten, setIncludeUnwritten] = React.useState(true)

  const loadPreview = React.useCallback(async () => {
    if (!open || !projectId) return
    setLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/export-preview`, {
        params: {
          start_chapter: startChapter || undefined,
          end_chapter: endChapter || undefined,
          include_unwritten: includeUnwritten ? 1 : 0,
        },
      })
      setPreview(res.data?.export || null)
    } finally {
      setLoading(false)
    }
  }, [endChapter, includeUnwritten, open, projectId, startChapter])

  React.useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  const stats = preview?.stats || {}
  const gate = preview?.gate || {}
  const releaseAudit = preview?.release_audit || {}
  const warnings = Array.isArray(preview?.warnings) ? preview.warnings : []
  const records = Array.isArray(preview?.records) ? preview.records : []
  const releaseLocks = Array.isArray(preview?.release_locks) ? preview.release_locks : []
  const completionRate = Number(stats.completion_rate || 0)
  const downloadOptions = { startChapter, endChapter, includeUnwritten }
  const gateType = gate.status === 'ready' ? 'success' : gate.status === 'blocked' ? 'warning' : 'info'
  const gateMessage = gate.status === 'ready' ? '交付门禁通过' : gate.status === 'blocked' ? '交付门禁有阻塞项' : '交付门禁有提示'
  const releaseChecks = Array.isArray(releaseAudit.checks) ? releaseAudit.checks : []
  const releaseBlockers = Array.isArray(releaseAudit.blockers) ? releaseAudit.blockers : []
  const releaseWarnings = Array.isArray(releaseAudit.warnings) ? releaseAudit.warnings : []

  const lockRelease = async (force = false) => {
    setLocking(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-lock`, {
        start_chapter: startChapter || undefined,
        end_chapter: endChapter || undefined,
        include_unwritten: includeUnwritten ? 1 : 0,
        force,
      })
      message.success(force ? '已强制锁定发布包' : '已锁定正式发布包')
      setPreview((prev: any) => prev ? {
        ...prev,
        release_audit: res.data?.release_audit || prev.release_audit,
        release_locks: [res.data?.review, ...(prev.release_locks || [])].filter(Boolean),
      } : prev)
      void loadPreview()
    } catch (error: any) {
      const audit = error?.response?.data?.release_audit
      if (audit) setPreview((prev: any) => prev ? { ...prev, release_audit: audit } : prev)
      message.error(error?.response?.data?.error === 'release gate blocked' ? '正式发布门禁未通过' : '锁定发布包失败')
    } finally {
      setLocking(false)
    }
  }

  const confirmForceLock = () => {
    Modal.confirm({
      title: '强制锁定发布包',
      content: '当前正式发布门禁未通过。强制锁定会保留所有失败项，适合作为内部样稿，不建议作为正式交付稿。',
      okText: '强制锁定',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => lockRelease(true),
    })
  }

  const createRepairQueue = async () => {
    setRepairing(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-repair-queue`, {
        start_chapter: startChapter || undefined,
        end_chapter: endChapter || undefined,
        include_unwritten: includeUnwritten ? 1 : 0,
      })
      const related = res.data?.repair_plan?.related_runs || []
      message.success(`已生成发布修复队列：${related.length} 个子任务`)
      onOpenTaskCenter?.()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '生成发布修复队列失败')
    } finally {
      setRepairing(false)
    }
  }

  const runAutoRepair = async () => {
    setAutoRepairing(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/release-repair-auto`, {
        start_chapter: startChapter || undefined,
        end_chapter: endChapter || undefined,
        include_unwritten: includeUnwritten ? 1 : 0,
      })
      const executed = res.data?.auto_executed_runs || []
      setPreview((prev: any) => prev ? {
        ...prev,
        release_audit: res.data?.release_audit || prev.release_audit,
      } : prev)
      message.success(`自动修复完成：执行 ${executed.length} 个批量任务，已重新审核`)
      void loadPreview()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '自动修复发布问题失败')
    } finally {
      setAutoRepairing(false)
    }
  }

  return (
    <Modal
      open={open}
      title="交付导出"
      width={760}
      onCancel={onClose}
      footer={(
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { void loadPreview() }}>刷新预览</Button>
          <Button icon={<FileTextOutlined />} onClick={() => triggerDownload(projectId, 'txt', downloadOptions)}>TXT</Button>
          <Button icon={<FileWordOutlined />} onClick={() => triggerDownload(projectId, 'docx', downloadOptions)}>DOCX</Button>
          <Button type="primary" icon={<BookOutlined />} onClick={() => triggerDownload(projectId, 'epub', downloadOptions)}>EPUB</Button>
        </Space>
      )}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="导出会使用后端统一生成的交付稿。"
          description="内容包含项目元信息、交付报告、分卷分章正文、缺章和占位正文警告。每次下载都会留下交付记录，方便追溯版本。"
        />

        {preview ? (
          <>
            <Card size="small" title="导出范围">
              <Space wrap align="center">
                <Text type="secondary">起始章</Text>
                <InputNumber min={1} value={startChapter} onChange={(value) => setStartChapter(value ? Number(value) : null)} placeholder="不限" style={{ width: 110 }} />
                <Text type="secondary">结束章</Text>
                <InputNumber min={1} value={endChapter} onChange={(value) => setEndChapter(value ? Number(value) : null)} placeholder="不限" style={{ width: 110 }} />
                <Switch checked={includeUnwritten} onChange={setIncludeUnwritten} />
                <Text type="secondary">包含缺正文占位</Text>
                <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => { void loadPreview() }}>应用范围</Button>
              </Space>
            </Card>

            <Card size="small">
              <Space align="center" size={18} wrap>
                <Progress type="circle" size={74} percent={completionRate} />
                <Statistic title="总章节" value={stats.chapter_count || 0} />
                <Statistic title="已写" value={stats.written_count || 0} valueStyle={{ color: '#3f8600' }} />
                <Statistic title="缺正文" value={stats.missing_count || 0} valueStyle={{ color: Number(stats.missing_count || 0) ? '#cf1322' : undefined }} />
                <Statistic title="占位" value={stats.placeholder_count || 0} />
                <Statistic title="字数" value={stats.word_count || 0} />
              </Space>
            </Card>

            <Alert
              type={gateType as any}
              showIcon
              message={gateMessage}
              description={(
                <Space direction="vertical" size={4}>
                  {(Array.isArray(gate.blockers) ? gate.blockers : []).map((item: string) => <Text key={item}>{item}</Text>)}
                  {gate.status !== 'ready' && <Text type="secondary">系统仍允许导出，但建议先补齐阻塞项后再交付正式稿。</Text>}
                </Space>
              )}
            />

            <Card
              size="small"
              title="正式发布审核"
              extra={(
                <Space>
                  {releaseAudit.can_release ? (
                    <Button size="small" type="primary" loading={locking} onClick={() => { void lockRelease(false) }}>锁定正式发布包</Button>
                  ) : (
                    <>
                      <Button size="small" type="primary" loading={autoRepairing} onClick={() => { void runAutoRepair() }}>自动修复并重审</Button>
                      <Button size="small" type="primary" loading={repairing} onClick={() => { void createRepairQueue() }}>生成修复队列</Button>
                      <Button size="small" danger loading={locking} onClick={confirmForceLock}>强制锁定样稿</Button>
                    </>
                  )}
                </Space>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space align="center" size={16} wrap>
                  <Progress
                    type="circle"
                    size={72}
                    percent={Number(releaseAudit.score || 0)}
                    status={releaseAudit.can_release ? 'success' : 'exception'}
                  />
                  <Space direction="vertical" size={3}>
                    <Text strong>{releaseAudit.can_release ? '可以锁定正式发布包' : '正式发布门禁未通过'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      阻塞 {releaseBlockers.length} 项 · 警告 {releaseWarnings.length} 项 · 清单 {releaseAudit.manifest?.chapters?.length || 0} 章
                    </Text>
                    {releaseAudit.manifest?.text_hash && (
                      <Text type="secondary" style={{ fontSize: 12 }}>发布包指纹：{releaseAudit.manifest.text_hash}</Text>
                    )}
                  </Space>
                </Space>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {releaseChecks.map((check: any) => (
                    <Tag
                      key={check.key}
                      color={check.status === 'pass' ? 'green' : check.status === 'blocker' ? 'red' : 'gold'}
                      bordered={false}
                    >
                      {check.label}
                    </Tag>
                  ))}
                </div>
                {(releaseBlockers.length > 0 || releaseWarnings.length > 0) && (
                  <List
                    size="small"
                    dataSource={[...releaseBlockers, ...releaseWarnings].slice(0, 8)}
                    renderItem={(item: any) => (
                      <List.Item>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space>
                            <Tag color={item.status === 'blocker' ? 'red' : 'gold'} bordered={false}>{item.status === 'blocker' ? '阻塞' : '警告'}</Tag>
                            <Text>{item.label}：{item.message}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.action}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
                <Space wrap>
                  <Button size="small" onClick={onOpenQualityBenchmark}>打开质量面板</Button>
                  <Button size="small" onClick={onOpenConsistencyGraph}>打开一致性图谱</Button>
                  <Button size="small" onClick={onOpenTaskCenter}>打开任务中心</Button>
                </Space>
              </Space>
            </Card>

            <Card size="small" title="导出格式">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <FileTextOutlined />
                        <Text strong>TXT 纯文本</Text>
                        <Tag bordered={false}>投稿初稿</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>适合快速发给编辑、转入其他写作软件或做人工校对。</Text>
                      <Button block icon={<DownloadOutlined />} onClick={() => triggerDownload(projectId, 'txt', downloadOptions)}>下载 TXT</Button>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <FileMarkdownOutlined />
                        <Text strong>Markdown</Text>
                        <Tag color="blue" bordered={false}>结构稿</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>保留标题层级，适合继续转 DOCX / EPUB 或走版本审阅。</Text>
                      <Button block icon={<DownloadOutlined />} onClick={() => triggerDownload(projectId, 'markdown', downloadOptions)}>下载 Markdown</Button>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <FileWordOutlined />
                        <Text strong>DOCX</Text>
                        <Tag color="green" bordered={false}>编辑交付</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>适合发给编辑、校对和平台运营继续批注。</Text>
                      <Button block icon={<DownloadOutlined />} onClick={() => triggerDownload(projectId, 'docx', downloadOptions)}>下载 DOCX</Button>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <BookOutlined />
                        <Text strong>EPUB</Text>
                        <Tag color="purple" bordered={false}>阅读样书</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>适合在阅读器中检查目录、阅读节奏和长篇体验。</Text>
                      <Button block type="primary" icon={<DownloadOutlined />} onClick={() => triggerDownload(projectId, 'epub', downloadOptions)}>下载 EPUB</Button>
                    </Space>
                  </Card>
                </div>
              </Space>
            </Card>

            <Card size="small" title="交付警告">
              {warnings.length ? (
                <List
                  size="small"
                  dataSource={warnings}
                  renderItem={(item: string) => (
                    <List.Item>
                      <Text type="warning">{item}</Text>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有发现缺章或占位正文" />
              )}
            </Card>

            <Card size="small" title="最近交付记录">
              {records.length ? (
                <List
                  size="small"
                  dataSource={records}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Space>
                          <Tag color={item.status === 'ok' ? 'green' : item.status === 'blocked' ? 'red' : 'gold'} bordered={false}>{item.status}</Tag>
                          <Text>{item.summary}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.created_at} · {item.payload?.filename || item.payload?.format || ''}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无交付记录" />
              )}
            </Card>

            <Card size="small" title="发布包锁定记录">
              {releaseLocks.length ? (
                <List
                  size="small"
                  dataSource={releaseLocks}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Space>
                          <Tag color={item.status === 'ok' ? 'green' : 'red'} bordered={false}>{item.status}</Tag>
                          <Text>{item.summary}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.created_at} · {item.payload?.manifest?.text_hash || item.payload?.audit?.manifest?.text_hash || ''}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无发布包锁定记录" />
              )}
            </Card>

            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
              最近生成：{preview.generated_at || '-'}
            </Paragraph>
          </>
        ) : (
          <Card size="small" loading={loading}>
            {!loading && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无导出预览" />}
          </Card>
        )}
      </Space>
    </Modal>
  )
}
