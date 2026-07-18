import React from 'react'
import { Alert, Button, Card, List, Progress, Space, Tag, Typography } from 'antd'

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

/** Generation diagnostics modal body. */
export function renderDiagnosticsModalContentView(diagnostics: any) {
  const preflight = diagnostics?.preflight || {}
  const materialScore = diagnostics?.material_score || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const recommendations = Array.isArray(diagnostics?.recommendations) ? diagnostics.recommendations : []
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small">
        <Space align="center" size={16}>
          <Progress type="circle" size={72} percent={Number(materialScore.score ?? diagnostics?.readiness_score ?? 0)} status={materialScore.can_generate || preflight.ready ? 'success' : 'normal'} />
          <Space direction="vertical" size={4}>
            <Text strong>{materialScore.can_generate || preflight.ready ? '可以生成' : '存在材料缺口'}</Text>
            <Text type="secondary">系统会根据高危缺口决定是否阻止直接生成。</Text>
          </Space>
        </Space>
      </Card>
      {Array.isArray(materialScore.categories) && materialScore.categories.length > 0 && (
        <Card size="small" title="材料完整度">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {materialScore.categories.map((item: any) => (
              <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 42px', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12 }}>{item.label}</Text>
                <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 60 && item.required ? 'exception' : 'normal'} />
                <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {checks.map((check: any, index: number) => (
          <Tag key={`${check.key || index}`} color={check.ok ? 'green' : check.severity === 'high' ? 'red' : 'gold'} bordered={false}>
            {check.ok ? '✓' : '!'} {check.label || check.key}
          </Tag>
        ))}
      </div>
      {recommendations.length > 0 && (
        <Card size="small" title="补齐建议">
          <List size="small" dataSource={recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
        </Card>
      )}
      {diagnostics?.writing_bible && (
        <Card size="small" title="写作圣经摘要">
          <Paragraph ellipsis={{ rows: 4, expandable: true }} style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(diagnostics.writing_bible, null, 2)}
          </Paragraph>
        </Card>
      )}
    </Space>
  )
}

/** Commercial readiness modal body. */
export function renderCommercialReadinessModalContentView(readiness: any) {
  const categories = Array.isArray(readiness?.categories) ? readiness.categories : []
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small">
        <Space align="center" size={16}>
          <Progress type="circle" size={76} percent={Number(readiness?.score || 0)} status={readiness?.can_batch_generate ? 'success' : 'normal'} />
          <Space direction="vertical" size={4}>
            <Text strong>{readiness?.can_batch_generate ? '可以进入批量生产' : '建议先补齐关键材料'}</Text>
            <Text type="secondary">
              {readiness?.level || '-'} · 章节 {readiness?.summary?.chapters || 0} · 已写 {readiness?.summary?.written_chapters || 0} · 失败任务 {readiness?.summary?.failed_runs || 0}
            </Text>
          </Space>
        </Space>
      </Card>
      {categories.length > 0 && (
        <Card size="small" title="分项评分">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {categories.map((item: any) => (
              <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 44px', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 12 }}>{item.label}</Text>
                <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 60 && item.required ? 'exception' : 'normal'} />
                <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}
      {Array.isArray(readiness?.next_actions) && readiness.next_actions.length > 0 && (
        <Card size="small" title="下一步动作">
          <List size="small" dataSource={readiness.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
        </Card>
      )}
    </Space>
  )
}
