import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Modal, Popconfirm, Progress, Segmented, Space, Statistic, Tag, Typography } from 'antd'
import { buildDiffSummary, buildTextDiff, displayValue, versionSourceLabel } from './utils'

const { Text, Paragraph } = Typography

type ParagraphChoice = 'current' | 'version'

function splitParagraphs(text: string) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean)
}

function wordCount(text?: string) {
  return text ? String(text).replace(/\s/g, '').length : 0
}

function paragraphStatus(current: string, version: string) {
  if (current === version) return 'same'
  if (!current && version) return 'version_only'
  if (current && !version) return 'current_only'
  return 'changed'
}

function statusTag(status: string) {
  if (status === 'same') return <Tag bordered={false}>未变</Tag>
  if (status === 'version_only') return <Tag color="purple" bordered={false}>历史新增</Tag>
  if (status === 'current_only') return <Tag color="blue" bordered={false}>当前新增</Tag>
  return <Tag color="gold" bordered={false}>已改写</Tag>
}

export function VersionDetailModal({
  version,
  activeChapter,
  showOnlyDiff,
  onToggleDiffMode,
  onClose,
  onAcceptVersion,
  onMergeVersion,
  acceptingVersionId,
}: {
  version: any | null
  activeChapter: any | null
  showOnlyDiff: boolean
  onToggleDiffMode: () => void
  onClose: () => void
  onAcceptVersion?: (version: any) => void
  onMergeVersion?: (version: any, choices: Array<{ index: number; source: ParagraphChoice }>) => void
  acceptingVersionId?: number | null
}) {
  const [choices, setChoices] = useState<Record<number, ParagraphChoice>>({})
  const [compareMode, setCompareMode] = useState<'side' | 'inline'>('side')
  useEffect(() => {
    setChoices({})
  }, [version?.id])
  const paragraphRows = useMemo(() => {
    if (!version || !activeChapter) return []
    const current = splitParagraphs(activeChapter.chapter_text || '')
    const old = splitParagraphs(version.chapter_text || '')
    const max = Math.max(current.length, old.length)
    return Array.from({ length: max }, (_, index) => {
      const currentText = current[index] || ''
      const versionText = old[index] || ''
      return {
        index: index + 1,
        current: currentText,
        version: versionText,
        status: paragraphStatus(currentText, versionText),
      }
    })
  }, [activeChapter, version])
  const changedRows = paragraphRows.filter(row => row.status !== 'same')
  const selectedRows = changedRows.filter(row => choices[row.index])
  const currentWordCount = wordCount(activeChapter?.chapter_text)
  const versionWordCount = wordCount(version?.chapter_text)
  const diffPercent = paragraphRows.length ? Math.round((changedRows.length / paragraphRows.length) * 100) : 0
  const chooseAll = (source: ParagraphChoice) => {
    setChoices(Object.fromEntries(changedRows.map(row => [row.index, source])))
  }
  const mergeWithChoices = () => {
    if (!version || !onMergeVersion) return
    onMergeVersion(version, Object.entries(choices).map(([index, source]) => ({ index: Number(index), source })))
  }

  return (
    <Modal
      open={version !== null}
      title={version ? `版本 v${version.version_no} · ${versionSourceLabel(version.source)}` : '版本详情'}
      onCancel={onClose}
      footer={null}
      width={1080}
    >
      {version && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="版本号">v{version.version_no}</Descriptions.Item>
            <Descriptions.Item label="来源">{versionSourceLabel(version.source)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{version.created_at}</Descriptions.Item>
          </Descriptions>
          {activeChapter && (
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) auto', gap: 12, alignItems: 'center' }}>
                <Statistic title="当前正文" value={currentWordCount} suffix="字" />
                <Statistic title="历史版本" value={versionWordCount} suffix="字" />
                <Statistic title="差异段落" value={changedRows.length} suffix={`/ ${paragraphRows.length}`} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>改写比例</Text>
                  <Progress percent={diffPercent} size="small" status={diffPercent >= 60 ? 'exception' : diffPercent >= 30 ? 'normal' : 'success'} />
                </div>
                <Space direction="vertical" align="end">
                  {onAcceptVersion && (
                    <Popconfirm
                      title="采纳历史版本"
                      description="这会把当前正文回滚到该历史版本，并保留当前稿为新版本记录。"
                      okText="采纳"
                      cancelText="取消"
                      onConfirm={() => onAcceptVersion(version)}
                    >
                      <Button danger size="small" loading={acceptingVersionId === version.id}>整章采纳历史版本</Button>
                    </Popconfirm>
                  )}
                  <Button size="small" onClick={onToggleDiffMode}>{showOnlyDiff ? '显示全部' : '只看差异'}</Button>
                </Space>
              </div>
            </Card>
          )}
          {activeChapter && (
            <Card
              size="small"
              title="与当前稿对比"
              extra={<Segmented size="small" value={compareMode} onChange={value => setCompareMode(value as 'side' | 'inline')} options={[{ value: 'side', label: '双栏' }, { value: 'inline', label: '行内' }]} />}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {compareMode === 'inline' ? (
                  <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #eee', maxHeight: 360, overflow: 'auto' }}>
                    {buildTextDiff(activeChapter.chapter_text || '', version.chapter_text || '')
                      .filter(r => !showOnlyDiff || r.type !== 'same')
                      .map((r, i) => (
                        <div key={i} style={{
                          whiteSpace: 'pre-wrap', marginBottom: 2,
                          color: r.type === 'add' ? '#166534' : r.type === 'remove' ? '#b91c1c' : '#333',
                          background: r.type === 'add' ? '#dcfce7' : r.type === 'remove' ? '#fee2e2' : 'transparent',
                          padding: r.type === 'same' ? 0 : '2px 4px', borderRadius: 4,
                          textDecoration: r.type === 'remove' ? 'line-through' : 'none',
                        }}>{r.type === 'add' ? `+ 当前：${r.text}` : r.type === 'remove' ? `- 历史：${r.text}` : `  ${r.text}`}</div>
                      ))}
                  </div>
                ) : (
                  <div style={{ maxHeight: 440, overflow: 'auto', display: 'grid', gap: 8 }}>
                    {paragraphRows
                      .filter(row => !showOnlyDiff || row.status !== 'same')
                      .slice(0, 120)
                      .map(row => (
                        <div
                          key={row.index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '48px minmax(0, 1fr) minmax(0, 1fr)',
                            gap: 8,
                            border: '1px solid #edf0f5',
                            borderRadius: 8,
                            padding: 8,
                            background: row.status === 'same' ? '#fff' : '#fffdf5',
                          }}
                        >
                          <Space direction="vertical" size={4} align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>#{row.index}</Text>
                            {statusTag(row.status)}
                          </Space>
                          <div style={{ background: row.status === 'version_only' ? '#fff7e6' : '#f8fafc', borderRadius: 6, padding: 8, minHeight: 64 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>当前稿</Text>
                            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 0 }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                              {row.current || '空'}
                            </Paragraph>
                          </div>
                          <div style={{ background: row.status === 'current_only' ? '#fff1f0' : '#f6ffed', borderRadius: 6, padding: 8, minHeight: 64 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>历史版本</Text>
                            <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 0 }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                              {row.version || '空'}
                            </Paragraph>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {(() => {
                  const summary = buildDiffSummary(buildTextDiff(activeChapter.chapter_text || '', version.chapter_text || ''))
                  return <Text>新增 {summary.added} 行，删除 {summary.removed} 行，未变 {summary.unchanged} 行</Text>
                })()}
              </Space>
            </Card>
          )}
          {activeChapter && onMergeVersion && (
            <Card
              size="small"
              title="段落级采纳"
              extra={(
                <Space>
                  <Button size="small" onClick={() => chooseAll('current')}>全部当前</Button>
                  <Button size="small" onClick={() => chooseAll('version')}>全部历史</Button>
                  <Button size="small" type="primary" disabled={selectedRows.length === 0} onClick={mergeWithChoices}>生成合并稿</Button>
                </Space>
              )}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选择 {selectedRows.length}/{changedRows.length} 个差异段落。未选择的段落默认保留当前稿。
                </Text>
                <div style={{ width: '100%', maxHeight: 360, overflow: 'auto', display: 'grid', gap: 8 }}>
                {changedRows.slice(0, 100).map(row => (
                  <div key={row.index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                    <div>
                      <Space size={6}><Text type="secondary">当前第{row.index}段</Text>{statusTag(row.status)}</Space>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{row.current || '空'}</div>
                    </div>
                    <div>
                      <Text type="secondary">历史版本</Text>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{row.version || '空'}</div>
                    </div>
                    <Space direction="vertical">
                      <Button size="small" type={choices[row.index] === 'current' ? 'primary' : 'default'} onClick={() => setChoices(prev => ({ ...prev, [row.index]: 'current' }))}>当前</Button>
                      <Button size="small" type={choices[row.index] === 'version' ? 'primary' : 'default'} onClick={() => setChoices(prev => ({ ...prev, [row.index]: 'version' }))}>历史</Button>
                    </Space>
                  </div>
                ))}
                </div>
              </Space>
            </Card>
          )}
          <Card size="small" title="历史版本全文"><Text style={{ whiteSpace: 'pre-wrap' }}>{version.chapter_text || '空版本'}</Text></Card>
          <Card size="small" title="分场结构">
            {Array.isArray(version.scene_breakdown) && version.scene_breakdown.length > 0 ?
              version.scene_breakdown.map((scene: any, index: number) => (
                <Card key={index} size="small" style={{ marginBottom: 8 }} title={displayValue(scene.title) || `场景 ${index + 1}`}><Text style={{ whiteSpace: 'pre-wrap' }}>{displayValue(scene.summary) || JSON.stringify(scene)}</Text></Card>
              )) : <Text type="secondary">暂无分场结构。</Text>}
          </Card>
          <Card size="small" title="连贯性备注">
            {Array.isArray(version.continuity_notes) && version.continuity_notes.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{version.continuity_notes.map((note: any, index: number) => <li key={index}>{displayValue(note)}</li>)}</ul>
            ) : <Text type="secondary">暂无连贯性备注。</Text>}
          </Card>
        </Space>
      )}
    </Modal>
  )
}
