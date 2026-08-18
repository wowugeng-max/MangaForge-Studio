import React from 'react'
import { Button, Space, Typography } from 'antd'
import type { KernelJobDetail } from '../../kernel/jobs/types'

const { Text } = Typography

export type KernelCandidatePreview = {
  content: string
  truncated: boolean
}

export function KernelCandidateCompare({
  detail,
  onPreview,
  preview = null,
  onCommit,
  committing = false,
}: {
  detail: KernelJobDetail
  onPreview: (artifactId: string) => void
  preview?: KernelCandidatePreview | null
  onCommit: (candidateId: string) => void
  committing?: boolean
}) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  const candidates = Array.isArray(detail?.candidates) ? detail.candidates : []
  const artifacts = Array.isArray(detail?.artifacts) ? detail.artifacts : []

  return (
    <div className="novel-kernel-candidate-compare">
      <Text strong>选择要采纳的候选</Text>
      {candidates.map((candidate) => {
        const succeeded = candidate.status === 'succeeded'
        const excerpt = String(candidate.last_message_excerpt || '').slice(0, 200)
        const candidateArtifacts = artifacts.filter(item => item.candidate_id === candidate.id)
        const expanded = openId === candidate.id
        return (
          <div key={candidate.id} className="novel-kernel-candidate-row" style={{ marginTop: 8, padding: 8, border: '1px solid var(--ant-color-border, #d9d9d9)', borderRadius: 6 }}>
            <Space wrap size={[8, 8]} align="start">
              <Button
                type="link"
                size="small"
                onClick={() => setOpenId(expanded ? null : candidate.id)}
              >
                {candidate.contract_id}
              </Button>
              <Text type="secondary">{candidate.status}</Text>
              {candidate.error_code ? <Text type="danger">{candidate.error_code}</Text> : null}
              {succeeded ? (
                <Button
                  size="small"
                  type="primary"
                  autoInsertSpace={false}
                  loading={committing}
                  onClick={() => onCommit(candidate.id)}
                >采纳</Button>
              ) : (
                <Button size="small" autoInsertSpace={false} disabled>采纳</Button>
              )}
            </Space>
            {excerpt ? <pre className="novel-kernel-candidate-excerpt" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{excerpt}</pre> : null}
            {expanded ? (
              <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                {candidateArtifacts.length ? candidateArtifacts.map(item => (
                  <Button
                    key={item.id}
                    type="link"
                    size="small"
                    onClick={() => onPreview(item.id)}
                  >
                    {item.rel_path || item.artifact_kind || item.id}
                  </Button>
                )) : (
                  <Text type="secondary">没有产物</Text>
                )}
              </Space>
            ) : null}
          </div>
        )
      })}
      {preview ? (
        <div className="novel-kernel-candidate-preview" style={{ marginTop: 12 }}>
          {preview.truncated ? <Text type="secondary">预览已截断（256KiB）</Text> : null}
          <pre style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{preview.content}</pre>
        </div>
      ) : null}
    </div>
  )
}
