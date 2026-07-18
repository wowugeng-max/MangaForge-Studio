import React from 'react'
import { Alert, Button, Card, Input, List, Progress, Space, Tag, Typography } from 'antd'

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

