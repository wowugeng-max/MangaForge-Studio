import React from 'react'
import { Card, Modal, Typography } from 'antd'
import { sourceLabel } from './utils'

const { Text } = Typography

export function AgentExecutionModal({
  execution,
  onClose,
}: {
  execution: any | null
  onClose: () => void
}) {
  if (!execution) return null

  return (
    <Modal title="Agent 执行结果" open={!!execution} onCancel={onClose} footer={null} width={800}>
      {(execution.results || []).map((item: any) => (
        <Card key={item.agent_id || item.step} size="small" title={item.agent_id || item.step} extra={sourceLabel(item)} style={{ marginBottom: 8 }}>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.output, null, 2)}</Text>
        </Card>
      ))}
    </Modal>
  )
}
