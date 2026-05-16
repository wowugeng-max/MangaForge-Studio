import React from 'react'
import { Alert, Button, Card, Empty, Input, List, message, Modal, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, FileSearchOutlined, ReloadOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'
import { displayPreview, wc } from './utils'

const { Text, Paragraph } = Typography

function parsePayload(value: any) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return {}
  }
}

function scoreColor(score?: number | null) {
  if (!score) return 'default'
  if (score >= 85) return 'green'
  if (score >= 78) return 'blue'
  if (score >= 65) return 'gold'
  return 'red'
}

function progressStatus(score?: number | null) {
  if (!score) return 'normal'
  if (score >= 78) return 'success'
  if (score < 65) return 'exception'
  return 'normal'
}

function findChapterId(payload: any) {
  return Number(
    payload.chapter_id
    || payload.report?.chapter_id
    || payload.quality_card?.chapter_id
    || payload.context_package?.chapter?.id
    || payload.reference_report?.chapter_id
    || 0,
  )
}

function findChapterNo(payload: any) {
  return Number(
    payload.chapter_no
    || payload.report?.chapter_no
    || payload.quality_card?.chapter_no
    || payload.context_package?.chapter?.chapter_no
    || payload.reference_report?.chapter_no
    || 0,
  )
}

function extractQualityScore(payload: any) {
  return Number(
    payload.self_check?.review?.score
    || payload.report?.overall_score
    || payload.quality_card?.overall_score
    || 0,
  ) || null
}

function extractSafetyScore(payload: any) {
  return Number(
    payload.safety_decision?.score
    || payload.reference_report?.quality_assessment?.overall_score
    || payload.quality_assessment?.overall_score
    || 0,
  ) || null
}

function runMatchesChapter(run: any, chapter: any) {
  const step = String(run.step_name || '')
  const output = String(run.output_ref || '')
  return step.includes(`chapter-${chapter.chapter_no}`)
    || step.includes(`第${chapter.chapter_no}`)
    || output.includes(`"chapter_id":${chapter.id}`)
    || output.includes(`"id":${chapter.id}`)
}

export function QualityBenchmarkModal({
  open,
  projectId,
  selectedModelId,
  chapters,
  reviews,
  runRecords,
  continuityAudit,
  benchmarkLoading,
  onClose,
  onRunBenchmark,
  onRefreshContinuity,
  onSelectChapter,
}: {
  open: boolean
  projectId: number
  selectedModelId?: number | null
  chapters: any[]
  reviews: any[]
  runRecords: any[]
  continuityAudit?: any
  benchmarkLoading?: boolean
  onClose: () => void
  onRunBenchmark: () => void
  onRefreshContinuity: () => void
  onSelectChapter: (chapterId: number) => void
}) {
  const [keyword, setKeyword] = React.useState('')
  const [regressionLoading, setRegressionLoading] = React.useState(false)
  const [regression, setRegression] = React.useState<any | null>(null)
  const [abLoading, setAbLoading] = React.useState(false)
  const [abData, setAbData] = React.useState<any | null>(null)
  const [candidateConfigText, setCandidateConfigText] = React.useState('')

  const loadRegressionSuite = React.useCallback(async () => {
    if (!open || !projectId) return
    setRegressionLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/regression-suite`)
      setRegression(res.data || null)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '回归样本集加载失败')
    } finally {
      setRegressionLoading(false)
    }
  }, [open, projectId])

  React.useEffect(() => {
    void loadRegressionSuite()
  }, [loadRegressionSuite])

  const loadAbExperiments = React.useCallback(async () => {
    if (!open || !projectId) return
    setAbLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/ab-experiments`, { params: { model_id: selectedModelId || undefined } })
      setAbData(res.data || null)
      setCandidateConfigText(prev => prev.trim() ? prev : JSON.stringify(res.data?.suggested_candidate_config || {}, null, 2))
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || 'A/B 实验加载失败')
    } finally {
      setAbLoading(false)
    }
  }, [open, projectId, selectedModelId])

  React.useEffect(() => {
    void loadAbExperiments()
  }, [loadAbExperiments])

  const saveRegressionSuite = async () => {
    if (!projectId) return
    setRegressionLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/regression-suite`, {
        suite: regression?.suggested_suite || regression?.suite || {},
      })
      message.success('回归样本集已固化')
      setRegression((prev: any) => ({ ...(prev || {}), suite: res.data?.suite || null }))
      await loadRegressionSuite()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '回归样本集保存失败')
    } finally {
      setRegressionLoading(false)
    }
  }

  const runRegressionSuite = async () => {
    if (!projectId) return
    setRegressionLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/regression-suite/run`, { model_id: selectedModelId || undefined })
      message.success('回归基准已完成')
      setRegression((prev: any) => ({ ...(prev || {}), latest_run: res.data?.report || null }))
      await loadRegressionSuite()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '回归基准运行失败')
    } finally {
      setRegressionLoading(false)
    }
  }

  const createAbExperiment = async () => {
    if (!projectId) return
    setAbLoading(true)
    try {
      const candidateConfig = JSON.parse(candidateConfigText || '{}')
      await apiClient.post(`/novel/projects/${projectId}/ab-experiments`, {
        name: `配置实验 ${new Date().toLocaleString()}`,
        model_id: selectedModelId || undefined,
        candidate_config: candidateConfig,
      })
      message.success('A/B 实验已创建')
      await loadAbExperiments()
    } catch (error: any) {
      message.error(error?.message?.includes('JSON') ? '候选配置必须是合法 JSON' : (error?.response?.data?.error || error?.message || 'A/B 实验创建失败'))
    } finally {
      setAbLoading(false)
    }
  }

  const runAbExperiment = async (experiment: any) => {
    setAbLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/ab-experiments/${experiment.id}/run`, { model_id: selectedModelId || undefined })
      message.success('A/B 实验已完成')
      await loadAbExperiments()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || 'A/B 实验运行失败')
    } finally {
      setAbLoading(false)
    }
  }

  const promoteAbExperiment = async (experiment: any) => {
    setAbLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/ab-experiments/${experiment.id}/promote`, { model_id: selectedModelId || undefined })
      message.success('候选配置已提升为正式配置')
      await loadAbExperiments()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '候选配置提升失败')
    } finally {
      setAbLoading(false)
    }
  }

  const runAbSandbox = async (experiment: any) => {
    setAbLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/ab-experiments/${experiment.id}/sandbox`, {
        model_id: selectedModelId || undefined,
        sample_count: 2,
      })
      message.success('A/B 沙盒稿已生成')
      await loadAbExperiments()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || 'A/B 沙盒实写失败')
    } finally {
      setAbLoading(false)
    }
  }
  const reviewBuckets = React.useMemo(() => {
    const byChapter = new Map<number, any[]>()
    const byChapterNo = new Map<number, any[]>()
    for (const review of reviews) {
      const payload = parsePayload(review.payload)
      const chapterId = findChapterId(payload)
      const chapterNo = findChapterNo(payload)
      if (chapterId) byChapter.set(chapterId, [...(byChapter.get(chapterId) || []), { review, payload }])
      if (chapterNo) byChapterNo.set(chapterNo, [...(byChapterNo.get(chapterNo) || []), { review, payload }])
    }
    return { byChapter, byChapterNo }
  }, [reviews])

  const auditIssues = Array.isArray(continuityAudit?.issues) ? continuityAudit.issues : []
  const rows = React.useMemo(() => chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .map(chapter => {
      const chapterReviews = [
        ...(reviewBuckets.byChapter.get(chapter.id) || []),
        ...(reviewBuckets.byChapterNo.get(chapter.chapter_no) || []),
      ]
      const proseQuality = chapterReviews
        .filter(item => item.review.review_type === 'prose_quality')
        .map(item => extractQualityScore(item.payload))
        .filter(Boolean) as number[]
      const editorScores = chapterReviews
        .filter(item => item.review.review_type === 'editor_report')
        .map(item => extractQualityScore(item.payload))
        .filter(Boolean) as number[]
      const similarityRisks = chapterReviews
        .filter(item => item.review.review_type === 'similarity_report')
        .map(item => Number(item.payload.report?.overall_risk_score || item.payload.overall_risk_score || 0))
        .filter(score => Number.isFinite(score) && score > 0)
      const safetyScores = chapterReviews
        .map(item => extractSafetyScore(item.payload))
        .filter(Boolean) as number[]
      const chapterIssues = auditIssues.filter((issue: any) => Number(issue.chapter_no || 0) === Number(chapter.chapter_no || 0))
      const runs = runRecords.filter(run => runMatchesChapter(run, chapter))
      const qualityScore = proseQuality[0] || null
      const editorScore = editorScores[0] || null
      const similarityRisk = similarityRisks[0] || null
      const safetyScore = safetyScores[0] || null
      const issuePenalty = chapterIssues.reduce((sum: number, issue: any) => sum + (issue.severity === 'high' ? 14 : issue.severity === 'medium' ? 7 : 3), 0)
      const missingPenalty = [
        chapter.chapter_text ? 0 : 28,
        chapter.chapter_goal || chapter.chapter_summary ? 0 : 10,
        chapter.ending_hook ? 0 : 8,
        Array.isArray(chapter.scene_breakdown) && chapter.scene_breakdown.length > 0 ? 0 : 8,
        qualityScore ? 0 : 8,
      ].reduce((sum, item) => sum + item, 0)
      const base = qualityScore || (chapter.chapter_text ? 72 : 35)
      const finalScore = Math.max(0, Math.min(100, Math.round(base - issuePenalty - missingPenalty + (editorScore ? Math.min(8, (editorScore - 70) / 4) : 0) - (similarityRisk ? Math.min(16, similarityRisk / 4) : 0))))
      const actions = [
        !chapter.chapter_text ? '生成正文' : '',
        !qualityScore && chapter.chapter_text ? '生成质量卡/自检' : '',
        !chapter.ending_hook && chapter.chapter_text ? '补章末钩子' : '',
        !(Array.isArray(chapter.scene_breakdown) && chapter.scene_breakdown.length > 0) ? '补场景卡' : '',
        similarityRisk && similarityRisk >= 35 ? '重写高相似桥段' : '',
        chapterIssues.some((issue: any) => issue.severity === 'high') ? '修复连续性高危问题' : '',
        finalScore < 70 && chapter.chapter_text ? '进入修订' : '',
      ].filter(Boolean)
      return {
        key: chapter.id,
        chapter,
        chapter_no: chapter.chapter_no,
        title: chapter.title || '未命名',
        has_text: Boolean(chapter.chapter_text),
        word_count: wc(chapter.chapter_text),
        final_score: finalScore,
        quality_score: qualityScore,
        editor_score: editorScore,
        similarity_risk: similarityRisk,
        safety_score: safetyScore,
        issue_count: chapterIssues.length,
        high_issue_count: chapterIssues.filter((issue: any) => issue.severity === 'high').length,
        run_count: runs.length,
        review_count: chapterReviews.length,
        actions,
        issues: chapterIssues,
      }
    }), [auditIssues, chapters, reviewBuckets.byChapter, reviewBuckets.byChapterNo, runRecords])

  const filteredRows = rows.filter(row => {
    const query = keyword.trim().toLowerCase()
    if (!query) return true
    return `${row.chapter_no} ${row.title} ${row.actions.join(' ')}`.toLowerCase().includes(query)
  })
  const writtenRows = rows.filter(row => row.has_text)
  const avgScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.final_score, 0) / rows.length) : 0
  const lowRows = rows.filter(row => row.final_score < 70)
  const highRiskRows = rows.filter(row => row.high_issue_count > 0 || Number(row.similarity_risk || 0) >= 45)
  const missingQualityRows = rows.filter(row => row.has_text && !row.quality_score)
  const regressionSuite = regression?.suite || null
  const suggestedSuite = regression?.suggested_suite || null
  const latestRegressionRun = regression?.latest_run || null
  const abExperiments = Array.isArray(abData?.experiments) ? abData.experiments : []

  const columns: ColumnsType<any> = [
    {
      title: '章节',
      dataIndex: 'chapter_no',
      width: 210,
      fixed: 'left',
      render: (_value, row) => (
        <Space direction="vertical" size={2}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onSelectChapter(row.chapter.id)}>
            第{row.chapter_no}章《{displayPreview(row.title, 24)}》
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.word_count || 0} 字 · {row.has_text ? '已写' : '未写'}</Text>
        </Space>
      ),
    },
    {
      title: '综合',
      dataIndex: 'final_score',
      width: 140,
      sorter: (a, b) => a.final_score - b.final_score,
      render: score => <Progress percent={score} size="small" status={progressStatus(score)} />,
    },
    {
      title: '正文质量',
      dataIndex: 'quality_score',
      width: 96,
      sorter: (a, b) => Number(a.quality_score || 0) - Number(b.quality_score || 0),
      render: score => <Tag color={scoreColor(score)} bordered={false}>{score ?? '缺'}</Tag>,
    },
    {
      title: '编辑审稿',
      dataIndex: 'editor_score',
      width: 96,
      render: score => <Tag color={scoreColor(score)} bordered={false}>{score ?? '缺'}</Tag>,
    },
    {
      title: '相似风险',
      dataIndex: 'similarity_risk',
      width: 96,
      sorter: (a, b) => Number(a.similarity_risk || 0) - Number(b.similarity_risk || 0),
      render: risk => <Tag color={risk >= 45 ? 'red' : risk >= 25 ? 'gold' : risk ? 'green' : 'default'} bordered={false}>{risk ?? '缺'}</Tag>,
    },
    {
      title: '仿写安全',
      dataIndex: 'safety_score',
      width: 96,
      render: score => <Tag color={scoreColor(score)} bordered={false}>{score ?? '缺'}</Tag>,
    },
    {
      title: '连续性',
      dataIndex: 'issue_count',
      width: 110,
      render: (_value, row) => (
        <Space size={4}>
          <Tag color={row.high_issue_count ? 'red' : row.issue_count ? 'gold' : 'green'} bordered={false}>{row.issue_count}</Tag>
          {row.high_issue_count > 0 && <Tag color="red" bordered={false}>高危 {row.high_issue_count}</Tag>}
        </Space>
      ),
    },
    {
      title: '记录',
      width: 110,
      render: (_value, row) => <Text type="secondary">{row.review_count} 评测 / {row.run_count} 运行</Text>,
    },
    {
      title: '建议',
      dataIndex: 'actions',
      render: actions => actions.length ? <Space wrap size={[4, 4]}>{actions.slice(0, 4).map((item: string) => <Tag key={item} color="blue" bordered={false}>{item}</Tag>)}</Space> : <Tag color="green" bordered={false}>可用</Tag>,
    },
  ]

  return (
    <Modal
      open={open}
      title={<Space><BarChartOutlined />质量评测基准面板</Space>}
      width={1160}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>关闭</Button>}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Progress type="circle" size={78} percent={avgScore} status={progressStatus(avgScore)} />
            <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 0 }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>章节 {rows.length}</Tag>
                <Tag color="green" bordered={false}>已写 {writtenRows.length}</Tag>
                <Tag color={lowRows.length ? 'red' : 'default'} bordered={false}>低分 {lowRows.length}</Tag>
                <Tag color={highRiskRows.length ? 'red' : 'default'} bordered={false}>高风险 {highRiskRows.length}</Tag>
                <Tag color={missingQualityRows.length ? 'gold' : 'default'} bordered={false}>缺质量样本 {missingQualityRows.length}</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                综合分由正文质量、编辑审稿、相似风险、连续性问题和材料完整度推导，用于快速定位最需要返工的章节。
              </Text>
            </Space>
            <Space direction="vertical" align="end">
              <Button size="small" icon={<FileSearchOutlined />} loading={benchmarkLoading} onClick={onRunBenchmark}>生成项目基准</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={onRefreshContinuity}>刷新连续性</Button>
              <Input.Search allowClear size="small" placeholder="搜索章节或建议" value={keyword} onChange={event => setKeyword(event.target.value)} style={{ width: 220 }} />
            </Space>
          </div>
        </Card>

        {(lowRows.length > 0 || highRiskRows.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Card size="small" title="优先返工章节" style={{ borderRadius: 8 }}>
              <List
                size="small"
                dataSource={lowRows.slice().sort((a, b) => a.final_score - b.final_score).slice(0, 6)}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无低分章节" /> }}
                renderItem={row => (
                  <List.Item actions={[<Button key="open" size="small" type="link" onClick={() => onSelectChapter(row.chapter.id)}>打开</Button>]}>
                    <List.Item.Meta
                      title={<Space><Tag color={scoreColor(row.final_score)} bordered={false}>{row.final_score}</Tag><Text>第{row.chapter_no}章《{displayPreview(row.title, 28)}》</Text></Space>}
                      description={row.actions.join('；') || '建议人工复核'}
                    />
                  </List.Item>
                )}
              />
            </Card>
            <Card size="small" title="风险来源" style={{ borderRadius: 8 }}>
              <List
                size="small"
                dataSource={highRiskRows.slice(0, 6)}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无高风险章节" /> }}
                renderItem={row => (
                  <List.Item actions={[<Button key="open" size="small" type="link" onClick={() => onSelectChapter(row.chapter.id)}>打开</Button>]}>
                    <List.Item.Meta
                      title={<Space><Text>第{row.chapter_no}章《{displayPreview(row.title, 28)}》</Text>{row.high_issue_count > 0 && <Tag color="red" bordered={false}>连续性</Tag>}{Number(row.similarity_risk || 0) >= 45 && <Tag color="red" bordered={false}>相似风险</Tag>}</Space>}
                      description={<Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>{row.issues.map((issue: any) => issue.message).join('；') || row.actions.join('；')}</Paragraph>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </div>
        )}

        <Card size="small" title="回归样本集" style={{ borderRadius: 8 }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Alert
              type={latestRegressionRun?.passed === false ? 'warning' : regressionSuite ? 'success' : 'info'}
              showIcon
              message={regressionSuite ? `已固化 ${regressionSuite.samples?.length || 0} 个样本` : `建议固化 ${suggestedSuite?.samples?.length || 0} 个样本`}
              description={latestRegressionRun
                ? `最近回归：均分 ${latestRegressionRun.average_score}，相对基线 ${latestRegressionRun.delta_average_score >= 0 ? '+' : ''}${latestRegressionRun.delta_average_score}，配置 ${latestRegressionRun.config_snapshot?.snapshot_id || '-'}`
                : '固化样本后，每次改提示词、模型策略或写作圣经，都可以用同一批章节做回归对比。'}
            />
            <Space wrap>
              <Button size="small" loading={regressionLoading} onClick={saveRegressionSuite}>
                {regressionSuite ? '重建样本集' : '固化建议样本'}
              </Button>
              <Button size="small" type="primary" loading={regressionLoading} disabled={!regressionSuite && !(suggestedSuite?.samples || []).length} onClick={runRegressionSuite}>
                运行回归基准
              </Button>
              <Button size="small" icon={<ReloadOutlined />} loading={regressionLoading} onClick={() => { void loadRegressionSuite() }}>刷新样本集</Button>
            </Space>
            <List
              size="small"
              dataSource={(regressionSuite?.samples || suggestedSuite?.samples || []).slice(0, 8)}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用回归样本" /> }}
              renderItem={(sample: any) => (
                <List.Item actions={[
                  <Button key="open" size="small" type="link" onClick={() => onSelectChapter(sample.chapter_id)}>打开</Button>,
                ]}>
                  <List.Item.Meta
                    title={<Space><Tag bordered={false}>第{sample.chapter_no}章</Tag><Text>{displayPreview(sample.title, 34)}</Text><Tag color="blue" bordered={false}>{sample.baseline_score ?? '-'}</Tag></Space>}
                    description={sample.reason || '回归样本'}
                  />
                </List.Item>
              )}
            />
            {latestRegressionRun?.recommendations?.length > 0 && (
              <Space direction="vertical" size={4}>
                {latestRegressionRun.recommendations.map((item: string, index: number) => (
                  <Text key={index} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                ))}
              </Space>
            )}
          </Space>
        </Card>

        <Card size="small" title="A/B 配置实验" style={{ borderRadius: 8 }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="用同一批回归样本对比当前配置 A 和候选配置 B"
              description="当前版本采用离线配置投影，不会改写章节正文；通过后可以把候选配置提升为正式配置，再进入小批量实写验证。"
            />
            <Input.TextArea
              rows={7}
              value={candidateConfigText}
              onChange={event => setCandidateConfigText(event.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="候选配置 JSON"
            />
            <Space wrap>
              <Button size="small" loading={abLoading} onClick={() => { void loadAbExperiments() }}>刷新实验</Button>
              <Button size="small" type="primary" loading={abLoading} onClick={createAbExperiment}>创建候选实验</Button>
            </Space>
            <List
              size="small"
              dataSource={abExperiments.slice(0, 6)}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 A/B 实验" /> }}
              renderItem={(experiment: any) => {
                const report = experiment.latest_report || {}
                const candidate = report.candidate || {}
                const current = report.current || {}
                return (
                  <List.Item
                    actions={[
                      <Button key="run" size="small" type="link" loading={abLoading} onClick={() => { void runAbExperiment(experiment) }}>运行</Button>,
                      <Button key="sandbox" size="small" type="link" loading={abLoading} onClick={() => { void runAbSandbox(experiment) }}>沙盒</Button>,
                      <Button key="promote" size="small" type="link" disabled={!['passed', 'neutral', 'sandboxed'].includes(experiment.status)} loading={abLoading} onClick={() => { void promoteAbExperiment(experiment) }}>提升</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Text>{experiment.name}</Text>
                          <Tag color={experiment.status === 'passed' ? 'green' : experiment.status === 'risky' ? 'red' : experiment.status === 'promoted' ? 'purple' : 'blue'} bordered={false}>
                            {experiment.status || 'draft'}
                          </Tag>
                          {report.decision && <Tag bordered={false}>{report.decision}</Tag>}
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            A 均分 {current.average_score ?? '-'} / B 投影 {candidate.average_score ?? '-'} / 变化 {candidate.delta_average_score >= 0 ? '+' : ''}{candidate.delta_average_score ?? '-'}
                          </Text>
                          {candidate.config_snapshot?.snapshot_id && (
                            <Text type="secondary" style={{ fontSize: 12 }}>候选快照：{candidate.config_snapshot.snapshot_id}</Text>
                          )}
                          {Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2 }}>
                              {report.recommendations.join('；')}
                            </Paragraph>
                          )}
                          {experiment.latest_sandbox && (
                            <Card size="small" styles={{ body: { padding: 8 } }}>
                              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Space wrap>
                                  <Tag color={experiment.latest_sandbox.passed ? 'green' : 'gold'} bordered={false}>
                                    沙盒 {experiment.latest_sandbox.success_count}/{experiment.latest_sandbox.sample_count}
                                  </Tag>
                                  <Tag bordered={false}>{experiment.latest_sandbox.config_snapshot?.snapshot_id || '-'}</Tag>
                                </Space>
                                {(experiment.latest_sandbox.drafts || []).slice(0, 2).map((draft: any) => (
                                  <div key={`${experiment.id}-${draft.chapter_id}`} style={{ borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                                    <Space wrap>
                                      <Text strong style={{ fontSize: 12 }}>第{draft.chapter_no}章</Text>
                                      <Tag color={draft.status === 'success' ? 'green' : 'red'} bordered={false}>{draft.status}</Tag>
                                      {draft.diff && <Tag bordered={false}>字数 {draft.diff.after_chars} / 变化 {draft.diff.delta_chars >= 0 ? '+' : ''}{draft.diff.delta_chars}</Tag>}
                                      {draft.projected_score && <Tag color={scoreColor(draft.projected_score)} bordered={false}>投影 {draft.projected_score}</Tag>}
                                    </Space>
                                    <Paragraph style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                                      {draft.candidate_preview || draft.error || '无预览'}
                                    </Paragraph>
                                  </div>
                                ))}
                              </Space>
                            </Card>
                          )}
                        </Space>
                      )}
                    />
                  </List.Item>
                )
              }}
            />
          </Space>
        </Card>

        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={filteredRows}
          scroll={{ x: 1040, y: 460 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Space>
    </Modal>
  )
}
