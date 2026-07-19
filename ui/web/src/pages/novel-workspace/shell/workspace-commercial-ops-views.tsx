import React from 'react'
import { Alert, Button, Card, List, Progress, Space, Tag, Typography } from 'antd'

const { Text, Paragraph } = Typography

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
                    <Button key="apply" size="small" type="primary" onClick={() => { void options.onApplyTemplate?.(item) }}>应用</Button>,
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

export function renderLongformRepairAuditContentView(audit: any) {
  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Space wrap>
        <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
        <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
        <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
      </Space>
      {(audit.conclusion || []).map((item: string, index: number) => <Text key={`${item}-${index}`}>{item}</Text>)}
      <Card size="small" title="指标变化">
        <Space wrap>
          {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
            <Tag key={key} bordered={false}>{key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}</Tag>
          ))}
        </Space>
      </Card>
      {(audit.remaining_risks?.unresolved_tasks || []).length > 0 && (
        <Card size="small" title="未关闭任务">
          <List size="small" dataSource={(audit.remaining_risks.unresolved_tasks || []).slice(0, 10)} renderItem={(item: any) => <List.Item>{item.chapter_no ? `第${item.chapter_no}章 ` : ''}{item.message || item.title}</List.Item>} />
        </Card>
      )}
    </Space>
  )
}

export function renderGenerationResultDiffContentView(diff: any, previousVersion?: any) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap>
        <Tag color={Number(diff.delta_length || 0) >= 0 ? 'green' : 'gold'} bordered={false}>字数变化 {diff.delta_length >= 0 ? '+' : ''}{diff.delta_length || 0}</Tag>
        <Tag bordered={false}>原 {diff.before_length || 0} 字</Tag>
        <Tag bordered={false}>新 {diff.after_length || 0} 字</Tag>
        <Tag bordered={false}>改动段落 {diff.change_count || 0}</Tag>
        {previousVersion?.version_no && <Tag color="blue" bordered={false}>已保留 v{previousVersion.version_no}</Tag>}
      </Space>
      <Card size="small" title="段落变更预览">
        {(diff.paragraph_changes || []).length ? (
          <Space direction="vertical" size={8} style={{ width: '100%', maxHeight: 360, overflow: 'auto' }}>
            {(diff.paragraph_changes || []).slice(0, 12).map((row: any) => (
              <div key={row.index} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>第 {row.index} 段</Text>
                {row.before && <Paragraph style={{ margin: '4px 0', fontSize: 12, color: '#b42318' }} ellipsis={{ rows: 2, expandable: true }}>旧：{row.before}</Paragraph>}
                {row.after && <Paragraph style={{ margin: 0, fontSize: 12, color: '#067647' }} ellipsis={{ rows: 2, expandable: true }}>新：{row.after}</Paragraph>}
              </div>
            ))}
          </Space>
        ) : <Text type="secondary">正文差异很小或原文为空。</Text>}
      </Card>
    </Space>
  )
}
