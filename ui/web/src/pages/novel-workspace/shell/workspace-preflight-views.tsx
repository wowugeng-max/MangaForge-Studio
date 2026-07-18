import React from 'react'
import { Alert, Button, Card, List, Space, Tag, Typography } from 'antd'

const { Text, Paragraph } = Typography

/** Preflight gap repair action buttons for generation blocked modal. */
export function renderGenerationPreflightRepairActionsView(actions: any[]) {
  if (!actions.length) {
    return (
      <Alert
        type="info"
        showIcon
        message="当前缺口需要人工处理"
        description="下方阻断项暂无一对一自动动作。可先打开资料设定台或章节编辑器补齐，再回来继续生成。"
      />
    )
  }
  return (
    <div>
      <Text strong>立刻补齐（直接点按钮）</Text>
      <Paragraph type="secondary" style={{ margin: '4px 0 8px' }}>
        不用再去侧栏找入口：按阻断原因点对应动作即可。
      </Paragraph>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {actions.map(action => (
          <Card
            key={action.key}
            size="small"
            styles={{ body: { padding: '10px 12px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Space direction="vertical" size={2} style={{ flex: '1 1 320px' }}>
                <Space size={6} wrap>
                  <Text strong>{action.label}</Text>
                  <Tag color={action.modelCall ? 'blue' : 'default'} bordered={false}>{action.modelCall ? '调用大模型' : '本地入口'}</Tag>
                  {action.primary ? <Tag color="green" bordered={false}>推荐先做</Tag> : null}
                </Space>
                <Text type="secondary">{action.description}</Text>
              </Space>
              <Button type={action.primary ? 'primary' : 'default'} onClick={() => { void action.run() }}>
                {action.label}
              </Button>
            </div>
          </Card>
        ))}
      </Space>
    </div>
  )
}

export function renderPreflightModalContentView(payload: any, repairActions: any[] = []) {
  const preflight = payload?.preflight || payload?.context_package?.preflight || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const blockers = Array.isArray(preflight.blockers) ? preflight.blockers : []
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
  const safetyDecision = payload?.safety_decision
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type={payload?.error_code === 'REFERENCE_SAFETY_BLOCKED' ? 'error' : 'warning'}
        showIcon
        message={payload?.error || '生成条件未满足'}
        description="系统没有直接写入正文，避免整章生成失败后污染当前版本。请直接点下方按钮补齐对应材料；补齐后可重新生成，或选择允许缺材料继续。"
      />
      {renderGenerationPreflightRepairActionsView(repairActions)}
      {blockers.length > 0 && (
        <div>
          <Text strong>阻塞项</Text>
          <List
            size="small"
            dataSource={blockers}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Text>{item.label || item.key || item}</Text>
                  {item.fix && <Text type="secondary">{item.fix}</Text>}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
      {checks.length > 0 && (
        <div>
          <Text strong>预检清单</Text>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {checks.map((check: any, index: number) => (
              <Tag key={`${check.key || check.label || index}`} color={check.ok ? 'green' : check.severity === 'high' ? 'red' : 'gold'} bordered={false}>
                {check.ok ? '✓' : '!'} {check.label || check.key}
              </Tag>
            ))}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {warnings.join('\n')}
        </Paragraph>
      )}
      {safetyDecision && (
        <Alert
          type={safetyDecision.blocked ? 'error' : 'info'}
          showIcon
          message={`仿写安全评分：${safetyDecision.score ?? '-'}，照搬命中：${safetyDecision.copy_hit_count ?? 0}`}
          description={(safetyDecision.reasons || []).join('；') || '未发现阻塞项'}
        />
      )}
    </Space>
  )
}
