import React from 'react'
import { Alert, Button, Card, Input, List, Modal, Progress, Space, Tag, Typography } from 'antd'

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

export function renderReaderTrialReviewContentView(report: any) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small">
        <Space align="center" size={16}>
          <Progress
            type="circle"
            size={76}
            percent={Number(report.score || 0)}
            status={Number(report.score || 0) >= 82 ? 'success' : Number(report.score || 0) < 65 ? 'exception' : 'normal'}
          />
          <Space direction="vertical" size={4}>
            <Text strong>{report.summary || '已完成读者试读复盘'}</Text>
            <Text type="secondary">{report.quality_bar_label || '起点1万均订试读基准'} · {report.status || '-'}</Text>
            {(report.drop_points || []).length > 0 && <Tag color="red" bordered={false}>弃读点 {(report.drop_points || []).length}</Tag>}
          </Space>
        </Space>
      </Card>
      <Card size="small" title="模拟读者">
        <List
          size="small"
          dataSource={report.personas || []}
          locale={{ emptyText: '暂无模拟读者结论' }}
          renderItem={(persona: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Space wrap><Text strong>{persona.label}</Text><Tag color={persona.risk_level === 'high' ? 'red' : persona.risk_level === 'low' ? 'green' : 'gold'} bordered={false}>{persona.score || '-'}分</Tag></Space>}
                description={`${persona.focus || ''} ${persona.verdict || ''}`}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card size="small" title="弃读点与修复动作">
        <List
          size="small"
          dataSource={(report.drop_points || []).slice(0, 10)}
          locale={{ emptyText: '暂无明显弃读点' }}
          renderItem={(item: string) => <List.Item>{item}</List.Item>}
        />
        {(report.repair_actions || []).length > 0 && (
          <Space wrap style={{ marginTop: 8 }}>
            {(report.repair_actions || []).slice(0, 5).map((item: string) => <Tag key={item} color="gold" bordered={false}>{item}</Tag>)}
          </Space>
        )}
      </Card>
    </Space>
  )
}

export function renderStyleSamplePatchPreviewContentView(sampleKey: string, patchText: string) {
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message={`将调整样章：${sampleKey}`}
        description="补丁只会写回风格样章库，不会改正文；请确认 JSON 变更符合作者口吻和禁抄边界。"
      />
      <Input.TextArea value={patchText} rows={12} readOnly />
    </Space>
  )
}

export function renderFirst30RetentionDiagnosisContentView(
  report: any,
  options: {
    onCreateRepairQueue: () => void
    onOpenChapter: (chapterId: number) => void
  },
) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small">
        <Space align="center" size={16}>
          <Progress
            type="circle"
            size={76}
            percent={Number(report.score || 0)}
            status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 65 ? 'exception' : 'normal'}
          />
          <Space direction="vertical" size={4}>
            <Text strong>{report.summary || '已完成前30章留存诊断'}</Text>
            <Text type="secondary">状态：{report.status || '-'}；读者承诺：{report.positioning?.promise_ready ? '已具备' : '需补强'}</Text>
            {report.positioning?.reader_promise && <Text type="secondary">{report.positioning.reader_promise}</Text>}
            <Button size="small" type="primary" onClick={() => { options.onCreateRepairQueue() }}>
              生成留存修复任务
            </Button>
          </Space>
        </Space>
      </Card>
      <Card size="small" title="分段留存">
        <List
          size="small"
          dataSource={report.segments || []}
          renderItem={(segment: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Space wrap><Text strong>{segment.label || segment.key}</Text><Tag color={segment.score >= 80 ? 'green' : segment.score < 65 ? 'red' : 'gold'} bordered={false}>{segment.score}分</Tag><Tag bordered={false}>覆盖 {segment.coverage}%</Tag><Tag bordered={false}>钩子 {segment.hook_rate}%</Tag><Tag bordered={false}>爽点/悬念 {segment.payoff_average}</Tag></Space>}
                description={`章节 ${segment.chapter_count || 0}；目标覆盖 ${segment.goal_rate || 0}%`}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card size="small" title="高优先级风险">
        <List
          size="small"
          dataSource={(report.risks || []).slice(0, 12)}
          locale={{ emptyText: '暂无明显风险' }}
          renderItem={(risk: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Space><Tag color={risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{risk.severity}</Tag><Text>{risk.segment}：{risk.issue}</Text></Space>}
                description={risk.action}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card size="small" title="章节卡片">
        <List
          size="small"
          dataSource={(report.chapter_cards || []).slice(0, 30)}
          renderItem={(row: any) => (
            <List.Item
              actions={row.chapter_id ? [<Button key="open" size="small" type="link" onClick={() => { options.onOpenChapter(Number(row.chapter_id)) }}>打开</Button>] : undefined}
            >
              <List.Item.Meta
                title={<Space wrap><Text>第{row.chapter_no}章 {row.title || '未命名'}</Text><Tag color={row.score >= 80 ? 'green' : row.score < 65 ? 'red' : 'gold'} bordered={false}>{row.score}分</Tag><Tag bordered={false}>{row.word_count || 0}字</Tag></Space>}
                description={(row.flags || []).join('、') || '基础留存信号正常'}
              />
            </List.Item>
          )}
        />
      </Card>
      {(report.next_actions || []).length > 0 && (
        <Card size="small" title="下一步">
          <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
        </Card>
      )}
    </Space>
  )
}

export function renderProductionDashboardContentView(args: {
  dashboard: any
  readiness: any
  governance: any
  materialMatrix: any
  assets: any
  strategy: any
}, options: { onOpenChapter: (chapterId: number) => void }) {
  const { dashboard, readiness, governance, materialMatrix } = args
  return (
<Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>章节 {dashboard.chapter_total || 0}</Tag>
              <Tag color="green" bordered={false}>已写 {dashboard.written_chapters || 0}</Tag>
              <Tag bordered={false}>字数 {Number(dashboard.word_count || 0).toLocaleString()}</Tag>
              <Tag color={dashboard.average_quality_score >= 78 ? 'green' : 'gold'} bordered={false}>均分 {dashboard.average_quality_score ?? '-'}</Tag>
              {readiness && <Tag color={readiness.can_batch_generate ? 'green' : 'gold'} bordered={false}>就绪 {readiness.score}%</Tag>}
              {dashboard.story_state_updated_to && <Tag color="purple" bordered={false}>状态至第{dashboard.story_state_updated_to}章</Tag>}
            </Space>
            {readiness && (
              <Card size="small" title="商业化就绪度">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Progress percent={Number(readiness.score || 0)} size="small" status={readiness.can_batch_generate ? 'success' : 'normal'} />
                  {Array.isArray(readiness.next_actions) && readiness.next_actions.length > 0 && (
                    <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2, expandable: true }}>{readiness.next_actions.join('；')}</Paragraph>
                  )}
                </Space>
              </Card>
            )}
            {Array.isArray(dashboard.recommendations) && dashboard.recommendations.length > 0 && (
              <Card size="small" title="生产建议">
                <List size="small" dataSource={dashboard.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            {governance && (
              <Card size="small" title="长线治理闭环">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={governance.latest_audit?.status === 'closed' ? 'green' : 'gold'} bordered={false}>{governance.latest_audit ? (governance.latest_audit.status === 'closed' ? '已闭环' : '需跟进') : '未审计'}</Tag>
                    <Tag bordered={false}>修复任务 {governance.latest_repair_run?.task_count || 0}</Tag>
                    <Tag bordered={false}>已确认 {governance.latest_repair_run?.resolved_count || 0}</Tag>
                    <Tag color={(governance.risk_summary?.needs_review_count || 0) ? 'gold' : 'default'} bordered={false}>需复查 {governance.risk_summary?.needs_review_count || 0}</Tag>
                    <Tag color={(governance.current_trends?.weak_count || 0) ? 'gold' : 'green'} bordered={false}>薄弱 {governance.current_trends?.weak_count || 0}</Tag>
                  </Space>
                  {(governance.latest_audit?.conclusion || governance.next_actions || []).slice(0, 3).map((item: string, index: number) => (
                    <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                  ))}
                </Space>
              </Card>
            )}
            {materialMatrix?.summary && (
              <Card size="small" title="章节材料矩阵">
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue" bordered={false}>扫描 {materialMatrix.summary.total || 0} 章</Tag>
                    <Tag color="green" bordered={false}>可生成 {materialMatrix.summary.ready || 0}</Tag>
                    <Tag color={(materialMatrix.summary.blocked || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {materialMatrix.summary.blocked || 0}</Tag>
                    <Tag color={(materialMatrix.summary.average_score || 0) >= 75 ? 'green' : 'gold'} bordered={false}>均分 {materialMatrix.summary.average_score || 0}</Tag>
                  </Space>
                  <List
                    size="small"
                    dataSource={(materialMatrix.weakest || []).slice(0, 8)}
                    renderItem={(row: any) => (
                      <List.Item
                        actions={[
                          <Button key="open" size="small" type="link" onClick={() => { options.onOpenChapter(Number(row.chapter_id)) }}>打开</Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={(
                            <Space wrap>
                              <Tag color={row.can_generate ? 'green' : Number(row.score || 0) >= 65 ? 'gold' : 'red'} bordered={false}>{row.score}%</Tag>
                              <Text>第{row.chapter_no}章《{row.title || '未命名'}》</Text>
                              {row.has_text && <Tag bordered={false}>已写</Tag>}
                            </Space>
                          )}
                          description={(row.recommendations || []).slice(0, 2).join('；') || '材料可用'}
                        />
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            )}
            <Card size="small" title="写作资产库覆盖">
              <Space wrap>
                {assets.map((group: any) => (
                  <Tag key={group.category} color={Array.isArray(group.entries) && group.entries.length ? 'green' : 'default'} bordered={false}>
                    {group.category} {Array.isArray(group.entries) ? group.entries.length : 0}
                  </Tag>
                ))}
              </Space>
            </Card>
            <Card size="small" title="模型调度策略">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: true }}>
                {JSON.stringify(strategy, null, 2)}
              </Paragraph>
            </Card>
          </Space>
  )
}

export function renderLongformCreationDiagnosisContentView(report: any) {
  return (
<Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 82 ? 'success' : Number(report.score || 0) < 68 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成长篇创作诊断'}</Text>
                  <Text type="secondary">质量线：{report.quality_bar || 'qidian_10k_subscription_baseline'}；状态：{report.status || '-'}</Text>
                  <Text type="secondary">
                    支持范围：{Number(report.support_range_words?.min || 3000000).toLocaleString()} - {Number(report.support_range_words?.max || 10000000).toLocaleString()} 字
                  </Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="创作契约四项">
              <List
                size="small"
                dataSource={report.dimensions || []}
                locale={{ emptyText: '暂无诊断维度' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Text strong>{item.label || item.key}</Text>
                          <Tag color={item.status === 'ok' ? 'green' : item.status === 'block' ? 'red' : 'gold'} bordered={false}>{item.status || '-'}</Tag>
                          <Tag bordered={false}>{Number(item.score || 0)}分</Tag>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">{item.detail || '无说明'}</Text>
                          {Array.isArray(item.evidence) && item.evidence.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>证据：{item.evidence.slice(0, 3).join('；')}</Text>
                          )}
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(report.next_actions || []).length > 0 && (
              <Card size="small" title="下一步">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
  )
}

export function renderChapterQualityCardContentView(card: any) {
  return (
<Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress type="circle" size={76} percent={Number(card.overall_score || 0)} status={card.overall_score >= 80 ? 'success' : card.overall_score < 65 ? 'exception' : 'normal'} />
                <Space direction="vertical" size={4}>
                  <Text strong>第{card.chapter_no}章《{card.title || '未命名'}》</Text>
                  <Text type="secondary">{card.word_count || 0} 字 · {card.status || '-'}</Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="质量维度">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {(card.dimensions || []).map((item: any) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 44px', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12 }}>{item.label}</Text>
                    <Progress percent={Number(item.score || 0)} size="small" status={item.score >= 80 ? 'success' : item.score < 65 ? 'exception' : 'normal'} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.score}</Text>
                  </div>
                ))}
              </Space>
            </Card>
            {Array.isArray(card.must_fix) && card.must_fix.length > 0 && (
              <Card size="small" title="必须修复">
                <List size="small" dataSource={card.must_fix} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            {Array.isArray(card.next_actions) && card.next_actions.length > 0 && (
              <Card size="small" title="下一步建议">
                <List size="small" dataSource={card.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
  )
}

export function renderLongformProductionTrendsContentView(args: {
  summary: any
  weakRows: any[]
  recommendations: any[]
  failureReasons: any[]
  repairLoading?: boolean
}, options: {
  onCreateRepairQueue: () => void
  onOpenChapter?: (chapterId: number) => void
}) {
  const { summary, weakRows, recommendations, failureReasons, repairLoading } = args
  return (
<Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>跟踪 {summary.chapter_count || 0} 章</Tag>
              <Tag color="cyan" bordered={false}>骨架 {summary.skeleton_count || 0} 章</Tag>
              <Tag color="green" bordered={false}>已写 {summary.written_count || 0} 章</Tag>
              <Tag color={(summary.failed_chapter_count || 0) > 0 ? 'red' : 'default'} bordered={false}>失败关注 {summary.failed_chapter_count || 0}</Tag>
              <Button size="small" type="primary" loading={Boolean(repairLoading)} onClick={() => { options.onCreateRepairQueue() }}>生成修复任务</Button>
            </Space>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {[
                ['骨架均分', summary.avg_skeleton_score],
                ['材料均分', summary.avg_material_score],
                ['质量均分', summary.avg_quality_score],
                ['生产就绪', summary.avg_readiness],
              ].map(([label, value]) => (
                <Card key={label as string} size="small">
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary">{label}</Text>
                    <Progress
                      percent={Number(value || 0)}
                      size="small"
                      status={Number(value || 0) >= 75 ? 'success' : Number(value || 0) < 55 ? 'exception' : 'normal'}
                    />
                  </Space>
                </Card>
              ))}
            </div>
            {recommendations.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="优先处理建议"
                description={<Space direction="vertical" size={4}>{recommendations.map((item: string, index: number) => <Text key={`${item}-${index}`}>{item}</Text>)}</Space>}
              />
            )}
            <Card size="small" title="薄弱章节">
              <List
                size="small"
                dataSource={weakRows.slice(0, 20)}
                locale={{ emptyText: '当前没有明显薄弱章节' }}
                renderItem={(row: any) => (
                  <List.Item
                    actions={row.chapter_id ? [
                      <Button key="open" size="small" type="link" onClick={() => { options.onOpenChapter?.(Number(row.chapter_id)) }}>打开</Button>,
                    ] : []}
                  >
                    <List.Item.Meta
                      title={<Space wrap><Text>第{row.chapter_no}章《{row.title || '未命名'}》</Text><Tag bordered={false}>{row.status}</Tag><Tag bordered={false}>就绪 {row.readiness || 0}</Tag></Space>}
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">骨架 {row.skeleton_score ?? '-'} / 材料 {row.material_score ?? '-'} / 质量 {row.quality_score ?? '-'} / 相似风险 {row.similarity_risk ?? '-'}</Text>
                          {(row.failures || []).length > 0 && <Text type="danger">{(row.failures || []).join('；')}</Text>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
            {failureReasons.length > 0 && (
              <Card size="small" title="失败原因">
                <List size="small" dataSource={failureReasons} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
  )
}


export function renderFuture100SkeletonContentView(data: any, options: {
  groupLoading?: boolean
  onOpenOutlineTree: (outlineIds: number[]) => void
  onStartChapterGroup: () => void
}) {
  const report = data?.report || data?.audit || {}
  const skeleton = data?.skeleton || report.rows || []
  return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Space align="center" size={16}>
              <Progress
                type="circle"
                size={76}
                percent={Number(report.score || 0)}
                status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 62 ? 'exception' : 'normal'}
              />
              <Space direction="vertical" size={4}>
                <Text strong>{report.summary || `未来100章骨架 ${skeleton.length || 0} 条`}</Text>
                <Text type="secondary">范围：第{report.from_chapter || '-'}章到第{report.to_chapter || '-'}章；状态：{report.status || '-'}</Text>
                {data?.written_outlines && <Text type="secondary">已写入章节大纲 {data.written_outlines.length} 条</Text>}
                {data?.write_summary && <Text type="secondary">写入策略：{data.write_summary.mode}；创建 {data.write_summary.created || 0}，更新 {data.write_summary.updated || 0}，跳过 {data.write_summary.skipped || 0}</Text>}
                {Array.isArray(data?.written_outlines) && data.written_outlines.length > 0 && (
                  <Space wrap>
                    <Button size="small" onClick={() => {
                      options.onOpenOutlineTree(data.written_outlines.map((item: any) => Number(item.id)).filter(Boolean))
                    }}>打开大纲树检查</Button>
                    <Button size="small" type="primary" loading={Boolean(options.groupLoading)} onClick={() => {
                      options.onStartChapterGroup()
                    }}>从骨架入队章节群</Button>
                  </Space>
                )}
              </Space>
            </Space>
          </Card>
          {report.metrics && (
            <Card size="small" title="骨架覆盖">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {[
                  ['覆盖率', report.metrics.coverage],
                  ['章节目标', report.metrics.goal_rate],
                  ['冲突压力', report.metrics.conflict_rate],
                  ['回报爽点', report.metrics.payoff_rate],
                  ['章末钩子', report.metrics.hook_rate],
                  ['阶段锚点', report.metrics.stage_anchor_rate],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{Number(value || 0)}%</Text>
                    </Space>
                    <Progress percent={Number(value || 0)} size="small" status={Number(value || 0) >= 80 ? 'success' : Number(value || 0) < 62 ? 'exception' : 'normal'} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card size="small" title="风险">
            <List
              size="small"
              dataSource={(report.risks || []).slice(0, 12)}
              locale={{ emptyText: '暂无明显风险' }}
              renderItem={(risk: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space><Tag color={risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{risk.severity}</Tag><Text>{risk.issue}</Text></Space>}
                    description={risk.action}
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card size="small" title="章节骨架预览">
            <List
              size="small"
              dataSource={skeleton.slice(0, 40)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Space wrap><Text>第{item.chapter_no}章 {item.title || '未命名'}</Text>{item.score !== undefined && <Tag color={item.score >= 80 ? 'green' : item.score < 62 ? 'red' : 'gold'} bordered={false}>{item.score}分</Tag>}{item.volume_stage && <Tag bordered={false}>{item.volume_stage}</Tag>}</Space>}
                    description={item.chapter_goal || item.conflict || (item.flags || []).join('、') || item.ending_hook || '待补齐'}
                  />
                </List.Item>
              )}
            />
            {skeleton.length > 40 && <Text type="secondary" style={{ fontSize: 12 }}>仅展示前40条，完整结果已写入审稿记录。</Text>}
          </Card>
          {(report.next_actions || []).length > 0 && (
            <Card size="small" title="下一步">
              <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          )}
        </Space>
  )
}


export function renderLongformPressureTestContentView(report: any) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space align="center" size={16}>
                <Progress
                  type="circle"
                  size={76}
                  percent={Number(report.score || 0)}
                  status={Number(report.score || 0) >= 80 ? 'success' : Number(report.score || 0) < 62 ? 'exception' : 'normal'}
                />
                <Space direction="vertical" size={4}>
                  <Text strong>{report.summary || '已完成长线压力测试'}</Text>
                  <Text type="secondary">目标 {Number(report.target_words || 3000000).toLocaleString()} 字；状态：{report.status || '-'}</Text>
                  <Text type="secondary">按当前均章估算约 {report.estimated_chapters?.based_on_current_average || '-'} 章；3000字/章约 {report.estimated_chapters?.at_3000 || '-'} 章</Text>
                </Space>
              </Space>
            </Card>
            <Card size="small" title="长篇承载力">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {[
                  ['分卷容量', report.capacity?.volume_capacity],
                  ['人物池', report.capacity?.character_capacity],
                  ['世界资产', report.capacity?.world_capacity],
                  ['冲突阶梯', report.capacity?.conflict_ladder],
                  ['扩展引擎', report.capacity?.expansion_engine],
                  ['回报循环', report.capacity?.payoff_loop],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12 }}>{label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{Number(value || 0)}</Text>
                    </Space>
                    <Progress percent={Number(value || 0)} size="small" status={Number(value || 0) >= 75 ? 'success' : Number(value || 0) < 55 ? 'exception' : 'normal'} />
                  </div>
                ))}
              </div>
              <Space wrap style={{ marginTop: 10 }}>
                <Tag bordered={false}>已写 {report.capacity?.written_chapters || 0} 章</Tag>
                <Tag bordered={false}>已写 {Number(report.capacity?.written_words || 0).toLocaleString()} 字</Tag>
                <Tag color={report.capacity?.story_state_fresh ? 'green' : 'gold'} bordered={false}>状态机{report.capacity?.story_state_fresh ? '同步' : '需同步'}</Tag>
                <Tag color={(report.capacity?.review_debt || 0) ? 'gold' : 'green'} bordered={false}>审稿债务 {report.capacity?.review_debt || 0}</Tag>
              </Space>
            </Card>
            <Card size="small" title="薄弱点">
              <List
                size="small"
                dataSource={(report.weak_points || []).slice(0, 14)}
                locale={{ emptyText: '暂无明显薄弱点' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{item.severity}</Tag><Text>{item.area}：{item.issue}</Text></Space>}
                      description={item.action}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="扩容路线">
              <List
                size="small"
                dataSource={report.expansion_plan || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta title={<Text strong>{item.stage}</Text>} description={`${item.goal} ${item.output || ''}`} />
                  </List.Item>
                )}
              />
            </Card>
            {(report.next_actions || []).length > 0 && (
              <Card size="small" title="下一步">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        
  )
}


export function renderMaterialRepairPlanContentView(data: any, options: {
  onOpenChapter?: (chapterId: number) => void
} = {}) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>扫描 {data.summary?.scanned || 0} 章</Tag>
              <Tag color="green" bordered={false}>可生成 {data.summary?.ready || 0}</Tag>
              <Tag color={(data.summary?.blocked || 0) > 0 ? 'red' : 'default'} bordered={false}>待补齐 {data.summary?.blocked || 0}</Tag>
              <Tag bordered={false}>均分 {data.summary?.average_score || 0}</Tag>
            </Space>
            {Array.isArray(data.plan?.next_actions) && data.plan.next_actions.length > 0 && (
              <Card size="small" title="推荐处理顺序">
                <List size="small" dataSource={data.plan.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Space direction="vertical" size={10} style={{ width: '100%', maxHeight: 520, overflow: 'auto' }}>
              {(data.plan?.buckets || []).map((bucket: any) => (
                <Card key={bucket.key} size="small" title={<Space><Text strong>{bucket.label}</Text><Tag bordered={false}>{bucket.count} 章</Tag></Space>}>
                  <Paragraph style={{ marginTop: 0 }}>{bucket.action}</Paragraph>
                  <List
                    size="small"
                    dataSource={(bucket.chapters || []).slice(0, 10)}
                    renderItem={(row: any) => (
                      <List.Item
                        actions={[
                          <Button key="open" size="small" type="link" onClick={() => { options.onOpenChapter?.(Number(row.chapter_id)) }}>打开</Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={`第${row.chapter_no}章《${row.title || '未命名'}》 · 总分 ${row.score}% / 分项 ${row.category_score}%`}
                          description={row.recommendation || '补齐材料'}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              ))}
              {(!data.plan?.buckets || data.plan.buckets.length === 0) && <Text type="secondary">当前扫描范围内没有明显材料缺口。</Text>}
            </Space>
          </Space>
        
  )
}


export function renderContinuityAuditContentView(audit: any, options: {
  onOpenChapterNo?: (chapterNo: number) => void
} = {}) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(audit.score || 0) >= 80 ? 'green' : 'gold'} bordered={false}>连续性 {audit.score ?? '-'}分</Tag>
              <Tag color={(audit.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {audit.high_count || 0}</Tag>
              <Tag color={(audit.medium_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>中危 {audit.medium_count || 0}</Tag>
              <Tag bordered={false}>总问题 {audit.issue_count || 0}</Tag>
            </Space>
            {Array.isArray(audit.recommendations) && audit.recommendations.length > 0 && (
              <Card size="small" title="建议">
                <List size="small" dataSource={audit.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="问题清单">
              <List
                size="small"
                dataSource={(audit.issues || []).slice(0, 80)}
                renderItem={(issue: any) => (
                  <List.Item
                    actions={issue.chapter_no ? [<Button key="open" size="small" type="link" onClick={() => { options.onOpenChapterNo?.(Number(issue.chapter_no)) }}>打开</Button>] : undefined}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{issue.severity}</Tag><Text>{issue.chapter_no ? `第${issue.chapter_no}章 ` : ''}{issue.message}</Text></Space>}
                      description={issue.action}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        
  )
}


export function renderReferenceKnowledgeDiagnosisContentView(args: {
  coverage: any
  fusion: any
  references: any[]
  assets: any
}) {
  const { coverage, fusion, references, assets } = args
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>参考 {references.length}</Tag>
              <Tag bordered={false}>活跃维度 {(fusion.active_dimensions || []).length}</Tag>
              <Tag color={(fusion.conflicts || []).length ? 'gold' : 'green'} bordered={false}>维度冲突 {(fusion.conflicts || []).length}</Tag>
              <Tag color={(fusion.latest_copy_hits || []).length ? 'red' : 'default'} bordered={false}>照搬命中 {(fusion.latest_copy_hits || []).length}</Tag>
            </Space>
            {Array.isArray(coverage.references) && (
              <Card size="small" title="知识层覆盖">
                <List
                  size="small"
                  dataSource={coverage.references}
                  renderItem={(row: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Text strong>{row.project_title}</Text><Tag color={(row.score || 0) >= 70 ? 'green' : 'gold'} bordered={false}>{row.score || 0}分</Tag><Tag bordered={false}>{row.status || '-'}</Tag></Space>}
                        description={`缺失：${(row.missing_required || []).join('、') || '无'}；可用层：${(row.categories || []).filter((item: any) => item.count > 0).map((item: any) => item.label).join('、') || '-'}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
            <Card size="small" title="资产层数量">
              <Space wrap>
                {assets.map((group: any) => <Tag key={group.category} color={(group.entries || []).length ? 'green' : 'default'} bordered={false}>{group.category} {(group.entries || []).length}</Tag>)}
              </Space>
            </Card>
            {Array.isArray(fusion.recommendations) && fusion.recommendations.length > 0 && (
              <Card size="small" title="诊断建议">
                <List size="small" dataSource={fusion.recommendations} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
          </Space>
        
  )
}

export function renderMechanicalQaContentView(report: any, options: {
  onOpenChapter?: (chapterId: number) => void
  onOpenChapterNo?: (chapterNo: number) => void
  onCreateRepairQueue?: () => void
} = {}) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(report.score || 0) >= 85 ? 'green' : Number(report.score || 0) >= 70 ? 'gold' : 'red'} bordered={false}>总分 {report.score ?? '-'}</Tag>
              <Tag color={(report.summary?.high || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.summary?.high || 0}</Tag>
              <Tag color={(report.summary?.medium || 0) > 0 ? 'gold' : 'default'} bordered={false}>中危 {report.summary?.medium || 0}</Tag>
              <Tag bordered={false}>问题 {report.summary?.issue_count || 0}</Tag>
              <Button size="small" type="primary" onClick={() => { options.onCreateRepairQueue?.() }}>生成修复任务</Button>
            </Space>
            {Array.isArray(report.next_actions) && report.next_actions.length > 0 && (
              <Card size="small" title="建议">
                <List size="small" dataSource={report.next_actions} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="问题清单">
              <List
                size="small"
                dataSource={(report.issues || []).slice(0, 80)}
                renderItem={(issue: any) => (
                  <List.Item
                    actions={issue.chapter_id ? [<Button key="open" size="small" type="link" onClick={() => { options.onOpenChapter?.(Number(issue.chapter_id)) }}>打开</Button>] : undefined}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{issue.severity}</Tag><Text>第{issue.chapter_no}章 {issue.message}</Text></Space>}
                      description={issue.title}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        
  )
}

export function renderMechanicalQaLlmReviewContentView(aiReport: any, localReport: any) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="这一步会调用当前选择的大模型，对本地规则质检结果进行编辑复核，不直接改正文。" />
            <Space wrap>
              <Tag color="blue" bordered={false}>本地分 {localReport.score ?? '-'}</Tag>
              {aiReport.score_adjustment?.suggested_score !== undefined && <Tag color="purple" bordered={false}>AI建议分 {aiReport.score_adjustment.suggested_score}</Tag>}
              <Tag bordered={false}>确认问题 {(aiReport.confirmed_issues || []).length || 0}</Tag>
              <Tag bordered={false}>漏检 {(aiReport.missed_issues || []).length || 0}</Tag>
              <Tag bordered={false}>误判 {(aiReport.false_positives || []).length || 0}</Tag>
            </Space>
            <Card size="small" title="总体判断">
              <Text>{aiReport.overall_verdict || aiReport.score_adjustment?.reason || '模型已返回复核结果。'}</Text>
            </Card>
            {(aiReport.repair_order || []).length > 0 && (
              <Card size="small" title="建议修复顺序">
                <List size="small" dataSource={aiReport.repair_order} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="AI确认/漏检问题">
              <List
                size="small"
                dataSource={[...(aiReport.confirmed_issues || []).map((item: any) => ({ ...item, bucket: '确认' })), ...(aiReport.missed_issues || []).map((item: any) => ({ ...item, bucket: '漏检' }))].slice(0, 80)}
                locale={{ emptyText: '暂无问题' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color={item.bucket === '漏检' ? 'red' : 'blue'} bordered={false}>{item.bucket}</Tag><Tag bordered={false}>{item.severity || '-'}</Tag><Text>第{item.chapter_no || '-'}章 {item.issue}</Text></Space>}
                      description={item.fix}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        
  )
}


export function renderPropagationDebtContentView(report: any, options: {
  onOpenChapterId?: (chapterId: number) => void
  onOpenChapterNo?: (chapterNo: number) => void
  onResolveDebt?: (debtId: string) => void | Promise<void>
} = {}) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={Number(report.score || 0) >= 85 ? 'green' : Number(report.score || 0) >= 70 ? 'gold' : 'red'} bordered={false}>健康度 {report.score ?? '-'}</Tag>
              <Tag color={(report.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.high_count || 0}</Tag>
              <Tag bordered={false}>活跃债务 {report.active_count || 0}</Tag>
              <Tag bordered={false}>已解决 {report.resolved_count || 0}</Tag>
            </Space>
            <Card size="small" title="待处理">
              <List
                size="small"
                dataSource={(report.debts || []).slice(0, 80)}
                locale={{ emptyText: '暂无传播债务' }}
                renderItem={(debt: any) => (
                  <List.Item
                    actions={[
                      debt.affected?.chapter_id ? <Button key="open-id" size="small" type="link" onClick={() => { options.onOpenChapterId?.(Number(debt.affected.chapter_id)) }}>打开</Button> : null,
                      debt.affected?.chapter_no ? <Button key="open-no" size="small" type="link" onClick={() => { options.onOpenChapterNo?.(Number(debt.affected.chapter_no)) }}>定位</Button> : null,
                      <Button key="resolve" size="small" type="link" onClick={() => { void options.onResolveDebt?.(String(debt.id)) }}>标记解决</Button>,
                    ].filter(Boolean) as any}
                  >
                    <List.Item.Meta
                      title={<Space><Tag color={debt.severity === 'high' ? 'red' : debt.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{debt.severity}</Tag><Text>{debt.title}</Text></Space>}
                      description={<Space direction="vertical" size={2}><Text type="secondary">{debt.message}</Text><Text>{debt.next_action}</Text></Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        
  )
}


export function renderPropagationDebtLlmPlanContentView(aiPlan: any, report: any) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="这一步会调用当前选择的大模型，把本地传播债务扫描转成可执行修复方案，不直接覆盖状态机。" />
            <Space wrap>
              <Tag color="blue" bordered={false}>本地健康度 {report.score ?? '-'}</Tag>
              <Tag color={(report.high_count || 0) > 0 ? 'red' : 'default'} bordered={false}>高危 {report.high_count || 0}</Tag>
              <Tag bordered={false}>修复项 {(aiPlan.repair_plan || []).length || 0}</Tag>
              <Tag color={(aiPlan.do_not_generate_until || []).length ? 'red' : 'green'} bordered={false}>生成前阻塞 {(aiPlan.do_not_generate_until || []).length || 0}</Tag>
            </Space>
            <Card size="small" title="总体判断">
              <Text>{aiPlan.overall_verdict || '模型已返回修复方案。'}</Text>
            </Card>
            {(aiPlan.do_not_generate_until || []).length > 0 && (
              <Card size="small" title="继续生成前必须处理">
                <List size="small" dataSource={aiPlan.do_not_generate_until} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              </Card>
            )}
            <Card size="small" title="修复计划">
              <List
                size="small"
                dataSource={(aiPlan.repair_plan || []).slice(0, 80)}
                locale={{ emptyText: '暂无修复项' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Tag color="purple" bordered={false}>P{item.priority || '-'}</Tag><Text>{item.target || item.debt_id || '修复项'}</Text></Space>}
                      description={<Space direction="vertical" size={2}><Text>{item.action}</Text><Text type="secondary">{item.reason || item.expected_result}</Text></Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(aiPlan.chapter_level_fixes || []).length > 0 && (
              <Card size="small" title="章节补丁建议">
                <List size="small" dataSource={aiPlan.chapter_level_fixes} renderItem={(item: any) => <List.Item>第{item.chapter_no || '-'}章：{item.fix}</List.Item>} />
              </Card>
            )}
          </Space>
        
  )
}

export function renderModelDiagnosticsContentView(report: any) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue" bordered={false}>模型 {report.model_count || 0}</Tag>
              <Tag color="green" bordered={false}>健康 {report.healthy_count || 0}</Tag>
              <Tag color={(report.ready_count || 0) > 0 ? 'green' : 'gold'} bordered={false}>可生产 {report.ready_count || 0}</Tag>
            </Space>
            <Alert type="info" showIcon message="此处读取模型配置、Key 状态和近期任务失败记录，不主动调用模型探针。" />
            {Array.isArray(report.next_actions) && report.next_actions.length > 0 && (
              <Alert type="warning" showIcon message={report.next_actions.join('；')} />
            )}
            <Card size="small" title="模型列表">
              <List
                size="small"
                dataSource={(report.rows || []).slice(0, 20)}
                renderItem={(row: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Text strong>{row.display_name || row.model_name}</Text><Tag color={row.score >= 70 ? 'green' : row.score >= 45 ? 'gold' : 'red'} bordered={false}>{row.score}分</Tag><Tag bordered={false}>{row.health_status}</Tag><Tag bordered={false}>{row.provider}</Tag></Space>}
                      description={<Space wrap><Tag bordered={false}>正文 {row.recommendation?.draft ? '可用' : '谨慎'}</Tag><Tag bordered={false}>审稿 {row.recommendation?.review ? '可用' : '不可用'}</Tag><Tag bordered={false}>长上下文 {row.recommendation?.long_context ? '是' : '未知'}</Tag>{row.recommendation?.risk && <Text type="warning">{row.recommendation.risk}</Text>}</Space>}
                    />
                  </List.Item>
                )}
              />
            </Card>
            {(report.recent_failures || []).length > 0 && (
              <Card size="small" title="近期失败">
                <List size="small" dataSource={report.recent_failures} renderItem={(row: any) => <List.Item><Text>{row.run_type} / {row.step_name}：{row.error}</Text></List.Item>} />
              </Card>
            )}
          </Space>
        
  )
}


export function renderGenreTemplatesContentView(templates: any[], options: {
  onApplyTemplate?: (item: any) => void | Promise<void>
} = {}) {
  return (

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert type="info" showIcon message="模板会写入写作圣经，作为无参考原创或类型化仿写的基础方法。已有字段不会被空值覆盖。" />
            <List
              size="small"
              dataSource={templates}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Button key="apply" size="small" type="primary" onClick={() => { void options.onApplyTemplate?.(item) }}}>应用</Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Space><Text strong>{item.name}</Text><Tag bordered={false}>{item.genre}</Tag></Space>}
                    description={<Space direction="vertical" size={2}><Text>{item.promise}</Text><Text type="secondary">节拍：{(item.structure?.chapter_beat || []).join(' -> ')}</Text></Space>}
                  />
                </List.Item>
              )}
            />
          </Space>
        
  )
}

