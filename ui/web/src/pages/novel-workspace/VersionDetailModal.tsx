import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Modal, Space, Typography } from 'antd'
import { buildDiffSummary, buildTextDiff, displayValue, versionSourceLabel } from './utils'

const { Text } = Typography

export function VersionDetailModal({
  version,
  activeChapter,
  showOnlyDiff,
  onToggleDiffMode,
  onClose,
  onMergeVersion,
}: {
  version: any | null
  activeChapter: any | null
  showOnlyDiff: boolean
  onToggleDiffMode: () => void
  onClose: () => void
  onMergeVersion?: (version: any, choices: Array<{ index: number; source: 'current' | 'version' }>) => void
}) {
  const [choices, setChoices] = useState<Record<number, 'current' | 'version'>>({})
  useEffect(() => {
    setChoices({})
  }, [version?.id])
  const paragraphRows = useMemo(() => {
    if (!version || !activeChapter) return []
    const current = String(activeChapter.chapter_text || '').split(/\n+/)
    const old = String(version.chapter_text || '').split(/\n+/)
    const max = Math.max(current.length, old.length)
    return Array.from({ length: max }, (_, index) => ({ index: index + 1, current: current[index] || '', version: old[index] || '' }))
  }, [activeChapter, version])
  return (
    <Modal
      open={version !== null}
      title={version ? `版本 v${version.version_no} · ${versionSourceLabel(version.source)}` : '版本详情'}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      {version && (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="版本号">v{version.version_no}</Descriptions.Item>
            <Descriptions.Item label="来源">{versionSourceLabel(version.source)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{version.created_at}</Descriptions.Item>
          </Descriptions>
          <Card size="small" title="正文全文"><Text style={{ whiteSpace: 'pre-wrap' }}>{version.chapter_text || '空版本'}</Text></Card>
          {activeChapter && (
            <Card size="small" title="与当前稿对比" extra={<Button size="small" onClick={onToggleDiffMode}>{showOnlyDiff ? '显示全部' : '只看差异'}</Button>}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div style={{ padding: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #eee', maxHeight: 320, overflow: 'auto' }}>
                  {buildTextDiff(activeChapter.chapter_text || '', version.chapter_text || '')
                    .filter(r => !showOnlyDiff || r.type !== 'same')
                    .map((r, i) => (
                      <div key={i} style={{
                        whiteSpace: 'pre-wrap', marginBottom: 2,
                        color: r.type === 'add' ? '#166534' : r.type === 'remove' ? '#b91c1c' : '#333',
                        background: r.type === 'add' ? '#dcfce7' : r.type === 'remove' ? '#fee2e2' : 'transparent',
                        padding: r.type === 'same' ? 0 : '2px 4px', borderRadius: 4,
                        textDecoration: r.type === 'remove' ? 'line-through' : 'none',
                      }}>{r.type === 'add' ? `+ ${r.text}` : r.type === 'remove' ? `- ${r.text}` : `  ${r.text}`}</div>
                    ))}
                </div>
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
              extra={<Button size="small" type="primary" onClick={() => onMergeVersion(version, Object.entries(choices).map(([index, source]) => ({ index: Number(index), source })))}>生成合并稿</Button>}
            >
              <Space direction="vertical" style={{ width: '100%', maxHeight: 360, overflow: 'auto' }}>
                {paragraphRows.filter(row => row.current !== row.version).slice(0, 80).map(row => (
                  <div key={row.index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                    <div>
                      <Text type="secondary">当前第{row.index}段</Text>
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
              </Space>
            </Card>
          )}
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
