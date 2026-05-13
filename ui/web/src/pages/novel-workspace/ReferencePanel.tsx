import React from 'react'
import { Button, Card, Empty, Space, Tabs, Tag, Typography } from 'antd'
import { displayPreview, displayValue, versionSourceColor, versionSourceLabel } from './utils'

const { Text, Paragraph } = Typography

function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(review.payload)
  } catch {
    return {}
  }
}

export function ReferencePanel({
  open,
  activeTab,
  worldbuilding,
  characters,
  outlines,
  referenceReports,
  chapterVersions,
  chapterVersionsLoading,
  rollingBackVersionId,
  onClose,
  onOpen,
  onTabChange,
  onEdit,
  onRollbackVersion,
  onOpenVersionDetail,
}: {
  open: boolean
  activeTab: string
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  referenceReports: any[]
  chapterVersions: any[]
  chapterVersionsLoading: boolean
  rollingBackVersionId: number | null
  onClose: () => void
  onOpen: () => void
  onTabChange: (key: string) => void
  onEdit: (kind: 'worldbuilding' | 'character' | 'outline', item?: any) => void
  onRollbackVersion: (versionId: number) => void
  onOpenVersionDetail: (version: any) => void
}) {
  if (!open) {
    return (
      <div style={{ width: 28, flexShrink: 0, background: '#fafafa', borderLeft: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Button type="text" shape="circle" size="small" onClick={onOpen}>📚</Button>
      </div>
    )
  }

  return (
    <div style={{
      width: 280, flexShrink: 0, background: '#fff',
      borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 12 }}>📚 参考资料</Text>
        <Button type="text" size="small" onClick={onClose}>✕</Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tabs activeKey={activeTab} onChange={onTabChange} size="small"
          items={[
            {
              key: 'worldbuilding', label: '世界观',
              children: worldbuilding.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无世界观设定</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('worldbuilding')}>创建</Button>
                </div>
              ) : worldbuilding.map((w, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }}
                  title={displayPreview(w.world_summary)}
                  extra={<Button size="small" type="link" onClick={() => onEdit('worldbuilding', w)}>编辑</Button>}>
                  {displayValue(w.rules) && <><Text strong>规则：</Text><Text style={{ display: 'block' }}>{displayValue(w.rules)}</Text></>}
                  {displayValue(w.timeline_anchor) && <><Text strong style={{ marginTop: 4, display: 'block' }}>时间锚点：</Text><Text>{displayValue(w.timeline_anchor)}</Text></>}
                  {displayValue(w.known_unknowns) && <><Text strong style={{ display: 'block' }}>未知项：</Text><Text>{displayValue(w.known_unknowns)}</Text></>}
                </Card>
              )),
            },
            {
              key: 'characters', label: '角色',
              children: characters.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无角色设定</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('character')}>创建</Button>
                </div>
              ) : characters.map((c, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }} title={displayPreview(c.name)}
                  extra={<Button size="small" type="link" onClick={() => onEdit('character', c)}>编辑</Button>}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {displayValue(c.role_type) && <Text><Text strong>定位：</Text>{displayValue(c.role_type)}</Text>}
                    {displayValue(c.archetype) && <Text><Text strong>原型：</Text>{displayValue(c.archetype)}</Text>}
                    {displayValue(c.motivation) && <Text><Text strong>动机：</Text>{displayValue(c.motivation)}</Text>}
                    {displayValue(c.goal) && <Text><Text strong>目标：</Text>{displayValue(c.goal)}</Text>}
                    {displayValue(c.conflict) && <Text><Text strong>冲突：</Text>{displayValue(c.conflict)}</Text>}
                    {c.current_state?.information_boundaries?.length > 0 && (
                      <Text><Text strong style={{ color: '#faad14' }}>信息边界：</Text>{c.current_state.information_boundaries.length} 项限制</Text>
                    )}
                  </Space>
                </Card>
              )),
            },
            {
              key: 'outline', label: '大纲',
              children: outlines.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无大纲</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('outline')}>创建</Button>
                </div>
              ) : outlines.map((o, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }}
                  title={<Space><Tag color="purple">{o.outline_type === 'master' ? '总纲' : o.outline_type === 'volume' ? '卷纲' : '章纲'}</Tag><Text strong>{displayPreview(o.title, 40)}</Text></Space>}
                  extra={<Button size="small" type="link" onClick={() => onEdit('outline', o)}>编辑</Button>}>
                  {displayValue(o.summary) && <Paragraph ellipsis={{ rows: 3 }}>{displayValue(o.summary)}</Paragraph>}
                  {displayValue(o.hook) && <Text type="secondary"><Text strong>钩子：</Text>{displayValue(o.hook)}</Text>}
                </Card>
              )),
            },
            {
              key: 'referenceReports', label: '参考报告',
              children: referenceReports.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无参考使用报告" style={{ padding: '16px 8px' }} />
              ) : referenceReports.slice(0, 12).map((report) => {
                const payload = parseReviewPayload(report)
                const entries = Array.isArray(payload.injected_entries) ? payload.injected_entries : []
                const hits = Array.isArray(payload.copy_guard?.hits) ? payload.copy_guard.hits : []
                const quality = payload.quality_assessment || null
                const qualityScore = Number(quality?.overall_score || 0)
                const riskLabel = quality?.risk_level === 'low' ? '低风险' : quality?.risk_level === 'medium' ? '中风险' : quality?.risk_level === 'high' ? '高风险' : ''
                const riskColor = quality?.risk_level === 'low' ? 'green' : quality?.risk_level === 'medium' ? 'gold' : quality?.risk_level === 'high' ? 'red' : 'default'
                return (
                  <Card key={report.id} size="small" style={{ margin: 8, borderRadius: 8 }}
                    title={<Space wrap><Tag color={report.status === 'warn' ? 'gold' : 'green'} bordered={false}>{report.status === 'warn' ? '需检查' : '正常'}</Tag><Text strong>{payload.task_type || '生成任务'}</Text></Space>}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{report.created_at}</Text>
                      <Text style={{ fontSize: 12 }}>{report.summary}</Text>
                      <Space wrap>
                        <Tag color="purple" bordered={false}>{payload.strength_label || '参考'}</Tag>
                        <Tag color="blue" bordered={false}>注入 {entries.length} 条</Tag>
                        <Tag color={hits.length ? 'gold' : 'green'} bordered={false}>照搬命中 {hits.length}</Tag>
                        {quality && <Tag color={riskColor} bordered={false}>质量 {qualityScore} · {riskLabel}</Tag>}
                      </Space>
                      {quality && (
                        <Space wrap size={[4, 2]}>
                          <Tag bordered={false}>注入 {quality.injection_score ?? '-'}</Tag>
                          <Tag bordered={false}>照搬安全 {quality.copy_safety_score ?? '-'}</Tag>
                          <Tag bordered={false}>原创性 {quality.originality_score ?? '-'}</Tag>
                        </Space>
                      )}
                      {hits.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                          疑似复用词：{hits.join('、')}
                        </Paragraph>
                      )}
                      {Array.isArray(quality?.recommendations) && quality.recommendations.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                          质量建议：{quality.recommendations.join('；')}
                        </Paragraph>
                      )}
                      {entries.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                          注入知识：{entries.map((entry: any) => `${entry.source_project || '参考'} / ${entry.category || '未分类'} / ${entry.title || entry.id}`).join('；')}
                        </Paragraph>
                      )}
                    </Space>
                  </Card>
                )
              }),
            },
            {
              key: 'versions', label: '版本',
              children: chapterVersions.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{chapterVersionsLoading ? '加载中…' : '暂无历史版本'}</Text>
                </div>
              ) : chapterVersions.slice().sort((a, b) => b.version_no - a.version_no).map(v => (
                <Card key={v.id} size="small" style={{ margin: 8 }}
                  title={`v${v.version_no}`}
                  extra={<Space>
                    <Tag color={versionSourceColor(v.source)} bordered={false}>{versionSourceLabel(v.source)}</Tag>
                    <Button size="small" danger onClick={() => onRollbackVersion(v.id)} loading={rollingBackVersionId === v.id}>回滚</Button>
                  </Space>}
                  onClick={() => onOpenVersionDetail(v)}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{v.created_at}</Text><br />
                  <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{(v.chapter_text || '空').slice(0, 100)}</Text>
                </Card>
              )),
            },
          ]}
        />
      </div>
    </div>
  )
}
