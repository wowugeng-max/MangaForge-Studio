import React from 'react'
import { Alert, Button, Card, Space, Spin, Tooltip, Typography } from 'antd'
import type { ExpandOutlineJobState } from './shell/use-expand-outline-job'
import {
  EXPAND_OUTLINE_NEED_LEDGER,
  expandOutlineCancelVisible,
  expandOutlineHasLedger,
  expandOutlinePreviewRows,
  loadExpandOutlinePreviews,
  type ExpandOutlinePreview,
} from './expand-outline-ui'
import { kernelJobUserMessage } from '../../kernel/jobs/messages'

const { Text, Paragraph } = Typography

export type ExpandOutlineCardProps = {
  outlines: unknown
  selectedModelId?: number
  state: ExpandOutlineJobState
  getArtifactContent: (id: string) => Promise<
    | { ok: true; content: string; truncated?: boolean }
    | { ok: false }
  >
  onStart: () => void
  onResume: () => void
  onCancel: () => void
  onCommit: () => void
  onDiscard: () => void
}

export function ExpandOutlineCard({
  outlines,
  selectedModelId,
  state,
  getArtifactContent,
  onStart,
  onResume,
  onCancel,
  onCommit,
  onDiscard,
}: ExpandOutlineCardProps) {
  const hasOutlines = expandOutlineHasLedger(outlines)
  const [previews, setPreviews] = React.useState<ExpandOutlinePreview[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const detail = state.phase === 'awaiting_selection' ? state.detail : null

  React.useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'failed') onResume()
    // mount-only: do not resume when writing just started a running job
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!detail) {
      setPreviews([])
      return
    }
    const rows = expandOutlinePreviewRows(detail)
    let cancelled = false
    setPreviewLoading(true)
    void loadExpandOutlinePreviews(rows, getArtifactContent).then((next) => {
      if (cancelled) return
      setPreviews(next)
      setPreviewLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [detail, getArtifactContent])

  const startDisabled = !hasOutlines || !selectedModelId || state.phase === 'running'
  const startTitle = !hasOutlines
    ? EXPAND_OUTLINE_NEED_LEDGER
    : !selectedModelId
      ? '请先选择模型'
      : undefined
  const failedText = state.phase === 'failed'
    ? (kernelJobUserMessage(state.errorCode)?.text || state.errorCode)
    : ''

  return (
    <Card className="expand-outline-card" title="扩纲" size="small">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">用内核合同扩写大纲。采纳只写大纲账本，不改正文。下面的「大纲扩写流程」仍是旧链路。</Text>
        {state.phase === 'failed' ? (
          <Alert type="error" showIcon message={failedText} />
        ) : null}
        {state.phase === 'running' ? (
          <Alert
            type="info"
            showIcon
            message={state.hint || '扩纲中'}
            description={`已进行 ${state.elapsedSec}s`}
          />
        ) : null}
        <Space wrap>
          <Tooltip title={startTitle}>
            <Button
              type="primary"
              disabled={startDisabled}
              loading={state.phase === 'running'}
              onClick={() => {
                if (state.phase === 'awaiting_selection' || state.phase === 'running') return
                onStart()
              }}
            >
              {state.phase === 'running' ? '扩纲中' : state.phase === 'awaiting_selection' ? '去预览' : '扩纲'}
            </Button>
          </Tooltip>
          {expandOutlineCancelVisible(state) ? (
            <Button onClick={onCancel}>取消</Button>
          ) : null}
        </Space>
        {state.phase === 'awaiting_selection' ? (
          <div>
            {previewLoading ? <Spin size="small" /> : null}
            {previews.map(item => (
              <div key={item.id} style={{ marginTop: 8 }}>
                <Text strong>{item.rel_path}</Text>
                <Paragraph
                  ellipsis={{ rows: 8, expandable: true }}
                  style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}
                >
                  {item.content || '（空）'}
                </Paragraph>
                {item.truncated ? <Text type="secondary">已截断</Text> : null}
              </div>
            ))}
            <Space>
              <Button type="primary" onClick={onCommit}>采纳</Button>
              <Button onClick={onDiscard}>丢弃</Button>
            </Space>
          </div>
        ) : null}
      </Space>
    </Card>
  )
}
