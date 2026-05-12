import React from 'react'
import { Button, Card, Descriptions, Modal, Space, Typography } from 'antd'
import { buildDiffSummary, buildTextDiff, displayValue, versionSourceLabel } from './utils'

const { Text } = Typography

export function VersionDetailModal({
  version,
  activeChapter,
  showOnlyDiff,
  onToggleDiffMode,
  onClose,
}: {
  version: any | null
  activeChapter: any | null
  showOnlyDiff: boolean
  onToggleDiffMode: () => void
  onClose: () => void
}) {
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
