import React from 'react'
import { Alert, Card, List, Space, Tag, Typography } from 'antd'

const { Text, Paragraph, Title } = Typography

export function renderCommercialResult(title: string, data: any) {
  if (title.includes('长线治理') || data?.summary?.latest_audit || data?.report?.latest_audit) {
    const summary = data?.summary || data?.report || {}
    const audit = summary.latest_audit || null
    const run = summary.latest_repair_run || {}
    const risks = summary.risks || summary.risk_summary?.unresolved_tasks || []
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={audit?.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit ? (audit.status === 'closed' ? '已闭环' : '需跟进') : '未审计'}</Tag>
          <Tag bordered={false}>修复任务 {run.task_count || 0}</Tag>
          <Tag bordered={false}>已确认 {run.resolved_count || 0}</Tag>
          <Tag color={(summary.risk_summary?.needs_review_count || run.needs_review_count || 0) ? 'gold' : 'default'} bordered={false}>需复查 {summary.risk_summary?.needs_review_count || run.needs_review_count || 0}</Tag>
          {summary.current_trends && <Tag color={(summary.current_trends.weak_count || 0) ? 'gold' : 'green'} bordered={false}>薄弱 {summary.current_trends.weak_count || 0}</Tag>}
        </Space>
        {summary.summary && <Alert type="info" showIcon message={summary.summary} />}
        {(audit?.conclusion || summary.next_actions || []).length > 0 && (
          <Card size="small" title={audit ? '闭环结论' : '下一步'}>
            <List size="small" dataSource={(audit?.conclusion || summary.next_actions || []).slice(0, 8)} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
          </Card>
        )}
        {audit?.metric_deltas && (
          <Card size="small" title="指标变化">
            <Space wrap>
              {Object.entries(audit.metric_deltas).map(([key, value]: [string, any]) => (
                <Tag key={key} bordered={false}>{key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}</Tag>
              ))}
            </Space>
          </Card>
        )}
        {risks.length > 0 && (
          <Card size="small" title="剩余风险">
            <List
              size="small"
              dataSource={risks.slice(0, 12)}
              renderItem={(item: any) => <List.Item>{typeof item === 'string' ? item : `${item.chapter_no ? `第${item.chapter_no}章 ` : ''}${item.message || item.title || item.task_status || ''}`}</List.Item>}
            />
          </Card>
        )}
      </Space>
    )
  }
  if (title.includes('成本') || data?.metrics) {
    const metrics = data?.metrics || data || {}
    const stageStats = metrics.stage_stats || {}
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>章节 {metrics.written_chapter_count || 0}/{metrics.chapter_count || 0}</Tag>
          <Tag color="green" bordered={false}>字数 {Number(metrics.generated_words || 0).toLocaleString()}</Tag>
          <Tag bordered={false}>运行 {metrics.total_runs || 0} 次</Tag>
          <Tag color={Number(metrics.failure_rate || 0) > 15 ? 'red' : 'green'} bordered={false}>失败率 {metrics.failure_rate || 0}%</Tag>
          <Tag color={Number(metrics.avg_quality_score || 0) >= 78 ? 'green' : 'gold'} bordered={false}>均分 {metrics.avg_quality_score ?? '-'}</Tag>
        </Space>
        <Progress percent={Math.max(0, Math.min(100, Math.round(100 - Number(metrics.failure_rate || 0))))} size="small" />
        <Card size="small" title="阶段统计">
          <Space wrap>
            {Object.entries(stageStats).map(([key, stat]: any) => (
              <Tag key={key} bordered={false} color={Number(stat.failed || 0) > 0 ? 'gold' : 'default'}>
                {key} · {stat.success || 0}/{stat.total || 0}
              </Tag>
            ))}
          </Space>
        </Card>
      </Space>
    )
  }
  if (title.includes('队列') || data?.queue) {
    const worker = data?.worker || {}
    const queue = Array.isArray(data?.queue) ? data.queue : []
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={worker.status === 'running' ? 'blue' : worker.status === 'failed' ? 'red' : 'default'} bordered={false}>worker：{worker.status || 'idle'}</Tag>
          <Tag bordered={false}>待执行 {data?.summary?.queued || 0}</Tag>
          <Tag bordered={false}>运行中 {data?.summary?.running || 0}</Tag>
          <Tag bordered={false}>暂停 {data?.summary?.paused || 0}</Tag>
        </Space>
        {worker.phase && <Alert type={worker.status === 'failed' ? 'error' : 'info'} showIcon message={worker.phase} description={worker.last_error || ''} />}
        <List
          size="small"
          dataSource={queue.slice(0, 20)}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Space wrap><Tag bordered={false}>{item.type}</Tag><Text>{item.step}</Text><Tag color={item.status === 'running' ? 'blue' : item.status === 'paused' ? 'gold' : 'default'} bordered={false}>{item.status}</Tag></Space>}
                description={item.payload?.phase || item.created_at}
              />
            </List.Item>
          )}
        />
      </Space>
    )
  }
  if (title.includes('相似度') || data?.report?.structural_report) {
    const report = data?.report || {}
    const structural = report.structural_report || {}
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={report.decision === 'pass' ? 'green' : 'red'} bordered={false}>{report.decision === 'pass' ? '通过' : '需重写'}</Tag>
          <Tag bordered={false}>总风险 {report.overall_risk_score ?? '-'}</Tag>
          <Tag bordered={false}>结构风险 {report.structural_similarity_risk ?? '-'}</Tag>
          <Tag bordered={false}>文本安全 {report.copy_safety_score ?? '-'}</Tag>
        </Space>
        <Card size="small" title="结构风险拆解">
          <Space wrap>
            <Tag bordered={false}>场景顺序 {structural.scene_order_risk ?? 0}</Tag>
            <Tag bordered={false}>角色功能 {structural.role_function_risk ?? 0}</Tag>
            <Tag bordered={false}>爽点结构 {structural.payoff_structure_risk ?? 0}</Tag>
            <Tag bordered={false}>实体重叠 {structural.entity_overlap_risk ?? 0}</Tag>
          </Space>
        </Card>
        <List size="small" dataSource={report.suggestions || []} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
      </Space>
    )
  }
  if (title.includes('版本') || data?.diff) {
    const diff = data?.diff || {}
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag bordered={false}>相似度 {diff.similarity_score ?? '-'}</Tag>
          <Tag bordered={false}>改动段落 {diff.change_count ?? 0}</Tag>
          <Tag bordered={false}>原 {diff.before_length ?? 0} 字 / 新 {diff.after_length ?? 0} 字</Tag>
          {data?.previous_version?.id && (
            <Button
              size="small"
              danger
              onClick={async () => {
                await rollbackChapterVersion(data.previous_version.id)
                Modal.destroyAll()
              }}
            >
              回滚到上一版
            </Button>
          )}
        </Space>
        {data?.recommendation && <Alert type="info" showIcon message={data.recommendation} />}
        <List
          size="small"
          dataSource={(diff.paragraph_changes || []).slice(0, 30)}
          renderItem={(item: any) => (
            <List.Item>
              <Card size="small" title={`第 ${item.index} 段`} style={{ width: '100%' }}>
                <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true }}>{item.before || '空'}</Paragraph>
                <Paragraph ellipsis={{ rows: 3, expandable: true }}>{item.after || '空'}</Paragraph>
              </Card>
            </List.Item>
          )}
        />
      </Space>
    )
  }
  return (
    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', maxHeight: 560, overflow: 'auto' }}>
      {JSON.stringify(data, null, 2)}
    </Paragraph>
  )
}
