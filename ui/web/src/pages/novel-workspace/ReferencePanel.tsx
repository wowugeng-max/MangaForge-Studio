import React from 'react'
import { Button, Card, Collapse, Empty, Space, Tabs, Tag, Typography } from 'antd'
import { displayPreview, displayValue, versionSourceColor, versionSourceLabel } from './utils'

const { Text, Paragraph } = Typography

function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(review.payload)
  } catch {
    return {}
  }
}

function statusColor(status?: string) {
  if (status === 'success' || status === 'ok') return 'green'
  if (status === 'warn') return 'gold'
  if (status === 'failed' || status === 'error') return 'red'
  if (status === 'running') return 'blue'
  return 'default'
}

function issueLabel(issue: any) {
  if (typeof issue === 'string') return issue
  return issue?.description || issue?.message || issue?.type || displayValue(issue)
}

function issueSeverity(issue: any) {
  if (typeof issue === 'string') {
    const severity = issue.split('｜')[0]
    return ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'medium'
  }
  return String(issue?.severity || 'medium').toLowerCase()
}

function scoreColor(score: number) {
  if (score >= 85) return 'green'
  if (score >= 78) return 'blue'
  if (score >= 65) return 'gold'
  return 'red'
}

function timeValue(value?: string) {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? time : 0
}

function currentVersionNo(chapterVersions: any[]) {
  return Math.max(0, ...chapterVersions.map(version => Number(version.version_no || 0))) + 1
}

function reviewTextSnapshot(payload: any) {
  return String(payload?.self_check?.final_text || payload?.final_text || payload?.chapter_text || '').trim()
}

function resolveReviewVersionLabel(report: any, activeChapter: any | null, activeChapterId: number | null, chapterVersions: any[]) {
  const payload = parseReviewPayload(report)
  const chapterId = Number(payload.chapter_id || payload.context_package?.chapter_target?.id || 0)
  if (!activeChapterId || chapterId !== Number(activeChapterId)) return ''
  const snapshot = reviewTextSnapshot(payload)
  if (snapshot && snapshot === String(activeChapter?.chapter_text || '').trim()) return `当前 v${currentVersionNo(chapterVersions)}`
  const textMatched = chapterVersions.find(version => snapshot && snapshot === String(version.chapter_text || '').trim())
  if (textMatched) return `v${textMatched.version_no}`
  const reportTime = timeValue(report.created_at)
  const historical = chapterVersions
    .slice()
    .sort((a, b) => timeValue(a.created_at) - timeValue(b.created_at) || Number(a.version_no || 0) - Number(b.version_no || 0))
  const matched = historical.find(version => reportTime > 0 && timeValue(version.created_at) > 0 && reportTime <= timeValue(version.created_at))
  if (matched) return `v${matched.version_no}`
  return `当前 v${currentVersionNo(chapterVersions)}`
}

function reviewMatchesCurrentText(report: any, activeChapter: any | null) {
  const snapshot = reviewTextSnapshot(parseReviewPayload(report))
  return Boolean(snapshot && snapshot === String(activeChapter?.chapter_text || '').trim())
}

function buildRevisionUsageMap(revisionReports: any[]) {
  const map = new Map<number, any[]>()
  revisionReports.forEach(report => {
    const payload = parseReviewPayload(report)
    const sourceId = Number(payload.source_review_id || 0)
    if (!sourceId) return
    const list = map.get(sourceId) || []
    list.push({ report, payload })
    map.set(sourceId, list)
  })
  return map
}

export function ReferencePanel({
  open,
  activeTab,
  worldbuilding,
  characters,
  outlines,
  selectedProject,
  referenceReports,
  proseQualityReports,
  editorReports,
  editorRevisionReports,
  bookReviews,
  activeChapter,
  activeChapterId,
  activeChapterUpdatedAt,
  chapterVersions,
  chapterVersionsLoading,
  rollingBackVersionId,
  proseQualityLoading,
  onClose,
  onOpen,
  onTabChange,
  onEdit,
  onOpenCreativeCards,
  onOpenStoryStateEditor,
  onApplyEditorRevision,
  onRefreshProseQuality,
  onRollbackVersion,
  onOpenVersionDetail,
}: {
  open: boolean
  activeTab: string
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  selectedProject: any | null
  referenceReports: any[]
  proseQualityReports: any[]
  editorReports: any[]
  editorRevisionReports?: any[]
  bookReviews: any[]
  activeChapter?: any | null
  activeChapterId: number | null
  activeChapterUpdatedAt?: string
  chapterVersions: any[]
  chapterVersionsLoading: boolean
  rollingBackVersionId: number | null
  proseQualityLoading?: boolean
  onClose: () => void
  onOpen: () => void
  onTabChange: (key: string) => void
  onEdit: (kind: 'worldbuilding' | 'character' | 'outline', item?: any) => void
  onOpenCreativeCards?: () => void
  onOpenStoryStateEditor?: () => void
  onApplyEditorRevision?: (report: any) => void
  onRefreshProseQuality?: () => void
  onRollbackVersion: (versionId: number) => void
  onOpenVersionDetail: (version: any) => void
}) {
  if (!open) {
    return (
      <div style={{ width: 28, flexShrink: 0, background: '#fafafa', borderLeft: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Button type="text" shape="circle" size="small" onClick={onOpen}>📚</Button>
      </div>
    )
  }
  const storyState = selectedProject?.reference_config?.story_state || {}
  const writingBible = selectedProject?.reference_config?.writing_bible || null
  const revisionUsageMap = buildRevisionUsageMap(editorRevisionReports || [])

  return (
    <div style={{
      width: 280, flexShrink: 0, background: '#fff',
      borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 12 }}>📚 参考资料</Text>
        <Space size={4}>
          {onOpenCreativeCards && <Button type="text" size="small" onClick={onOpenCreativeCards}>卡片</Button>}
          <Button type="text" size="small" onClick={onClose}>✕</Button>
        </Space>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tabs activeKey={activeTab} onChange={onTabChange} size="small"
          items={[
            {
              key: 'storyMemory', label: '故事记忆',
              children: (
                <Space direction="vertical" size={8} style={{ width: '100%', padding: 8 }}>
                  <Button size="small" block onClick={onOpenStoryStateEditor}>校正故事状态机</Button>
                  {!storyState || Object.keys(storyState).length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无故事状态机；生成章节入库后会自动更新。" />
                  ) : (
                    <>
                      <Space wrap>
                        {storyState.last_updated_chapter && <Tag color="blue" bordered={false}>更新至第{storyState.last_updated_chapter}章</Tag>}
                        {storyState.last_updated_at && <Tag bordered={false}>{storyState.last_updated_at}</Tag>}
                      </Space>
                      {[
                        ['character_positions', '角色位置'],
                        ['character_relationships', '角色关系'],
                        ['known_secrets', '已知秘密'],
                        ['item_ownership', '道具归属'],
                        ['foreshadowing_status', '伏笔状态'],
                        ['mainline_progress', '主线进度'],
                        ['timeline', '当前时间线'],
                        ['unresolved_conflicts', '未解冲突'],
                        ['recent_repeated_information', '近期重复信息'],
                      ].map(([key, label]) => storyState[key] !== undefined && (
                        <Card key={key} size="small" title={label}>
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                            {displayValue(storyState[key]) || '-'}
                          </Paragraph>
                        </Card>
                      ))}
                    </>
                  )}
                  {characters.some(char => char.current_state && Object.keys(char.current_state).length > 0) && (
                    <Card size="small" title="角色当前状态">
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        {characters.filter(char => char.current_state && Object.keys(char.current_state).length > 0).map(char => (
                          <Paragraph key={char.id || char.name} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                            <Text strong>{char.name}：</Text>{displayValue(char.current_state)}
                          </Paragraph>
                        ))}
                      </Space>
                    </Card>
                  )}
                </Space>
              ),
            },
            {
              key: 'writingBible', label: '写作圣经',
              children: (
                <Space direction="vertical" size={8} style={{ width: '100%', padding: 8 }}>
                  {!writingBible ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未保存写作圣经；生成时会自动构建临时圣经。" />
                  ) : (
                    <>
                      <Space wrap>
                        {writingBible.updated_at && <Tag bordered={false}>{writingBible.updated_at}</Tag>}
                        {writingBible.project?.genre && <Tag color="purple" bordered={false}>{writingBible.project.genre}</Tag>}
                      </Space>
                      {[
                        ['promise', '读者承诺'],
                        ['world_summary', '世界摘要'],
                        ['world_rules', '世界规则'],
                        ['mainline', '主线'],
                        ['volume_plan', '分卷计划'],
                        ['style_lock', '风格锁定'],
                        ['safety_policy', '仿写安全策略'],
                        ['forbidden', '禁止项'],
                      ].map(([key, label]) => writingBible[key] !== undefined && (
                        <Card key={key} size="small" title={label}>
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                            {displayValue(writingBible[key]) || '-'}
                          </Paragraph>
                        </Card>
                      ))}
                    </>
                  )}
                </Space>
              ),
            },
            {
              key: 'worldbuilding', label: '世界观',
              children: worldbuilding.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无世界观设定</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('worldbuilding')}>创建</Button>
                </div>
              ) : worldbuilding.map((w, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }}
                  title={displayPreview(w.world_summary)}
                  extra={<Button size="small" type="link" onClick={() => onEdit('worldbuilding', w)}>编辑</Button>}>
                  {displayValue(w.rules) && <><Text strong>规则：</Text><Text style={{ display: 'block' }}>{displayValue(w.rules)}</Text></>}
                  {displayValue(w.timeline_anchor) && <><Text strong style={{ marginTop: 4, display: 'block' }}>时间锚点：</Text><Text>{displayValue(w.timeline_anchor)}</Text></>}
                  {displayValue(w.known_unknowns) && <><Text strong style={{ display: 'block' }}>未知项：</Text><Text>{displayValue(w.known_unknowns)}</Text></>}
                </Card>
              )),
            },
            {
              key: 'characters', label: '角色',
              children: characters.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无角色设定</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('character')}>创建</Button>
                </div>
              ) : characters.map((c, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }} title={displayPreview(c.name)}
                  extra={<Button size="small" type="link" onClick={() => onEdit('character', c)}>编辑</Button>}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {displayValue(c.role_type) && <Text><Text strong>定位：</Text>{displayValue(c.role_type)}</Text>}
                    {displayValue(c.archetype) && <Text><Text strong>原型：</Text>{displayValue(c.archetype)}</Text>}
                    {displayValue(c.motivation) && <Text><Text strong>动机：</Text>{displayValue(c.motivation)}</Text>}
                    {displayValue(c.goal) && <Text><Text strong>目标：</Text>{displayValue(c.goal)}</Text>}
                    {displayValue(c.conflict) && <Text><Text strong>冲突：</Text>{displayValue(c.conflict)}</Text>}
                    {c.current_state?.information_boundaries?.length > 0 && (
                      <Text><Text strong style={{ color: '#faad14' }}>信息边界：</Text>{c.current_state.information_boundaries.length} 项限制</Text>
                    )}
                  </Space>
                </Card>
              )),
            },
            {
              key: 'outline', label: '大纲',
              children: outlines.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无大纲</Text><br />
                  <Button size="small" type="link" onClick={() => onEdit('outline')}>创建</Button>
                </div>
              ) : outlines.map((o, idx) => (
                <Card key={idx} size="small" style={{ margin: 8 }}
                  title={<Space><Tag color="purple">{o.outline_type === 'master' ? '总纲' : o.outline_type === 'volume' ? '卷纲' : '章纲'}</Tag><Text strong>{displayPreview(o.title, 40)}</Text></Space>}
                  extra={<Button size="small" type="link" onClick={() => onEdit('outline', o)}>编辑</Button>}>
                  {displayValue(o.summary) && <Paragraph ellipsis={{ rows: 3 }}>{displayValue(o.summary)}</Paragraph>}
                  {displayValue(o.hook) && <Text type="secondary"><Text strong>钩子：</Text>{displayValue(o.hook)}</Text>}
                </Card>
              )),
            },
            {
              key: 'referenceReports', label: '参考报告',
              children: referenceReports.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无参考使用报告" style={{ padding: '16px 8px' }} />
              ) : referenceReports.slice(0, 12).map((report) => {
                const payload = parseReviewPayload(report)
                const entries = Array.isArray(payload.injected_entries) ? payload.injected_entries : []
                const hits = Array.isArray(payload.copy_guard?.hits) ? payload.copy_guard.hits : []
                const quality = payload.quality_assessment || null
                const migrationAudit = payload.migration_audit || null
                const qualityScore = Number(quality?.overall_score || 0)
                const riskLabel = quality?.risk_level === 'low' ? '低风险' : quality?.risk_level === 'medium' ? '中风险' : quality?.risk_level === 'high' ? '高风险' : ''
                const riskColor = quality?.risk_level === 'low' ? 'green' : quality?.risk_level === 'medium' ? 'gold' : quality?.risk_level === 'high' ? 'red' : 'default'
                const learnedCount = migrationAudit
                  ? ['rhythm_structure', 'style_density', 'payoff_emotion'].reduce((sum, key) => sum + (Array.isArray(migrationAudit.learned?.[key]) ? migrationAudit.learned[key].length : 0), 0)
                  : 0
                return (
                  <Card key={report.id} size="small" style={{ margin: 8, borderRadius: 8 }}
                    title={<Space wrap><Tag color={report.status === 'warn' ? 'gold' : 'green'} bordered={false}>{report.status === 'warn' ? '需检查' : '正常'}</Tag><Text strong>{payload.task_type || '生成任务'}</Text></Space>}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{report.created_at}</Text>
                      <Text style={{ fontSize: 12 }}>{report.summary}</Text>
                      <Space wrap>
                        <Tag color="purple" bordered={false}>{payload.strength_label || '参考'}</Tag>
                        <Tag color="blue" bordered={false}>注入 {entries.length} 条</Tag>
                        <Tag color={hits.length ? 'gold' : 'green'} bordered={false}>照搬命中 {hits.length}</Tag>
                        {quality && <Tag color={riskColor} bordered={false}>质量 {qualityScore} · {riskLabel}</Tag>}
                      </Space>
                      {quality && (
                        <Space wrap size={[4, 2]}>
                          <Tag bordered={false}>注入 {quality.injection_score ?? '-'}</Tag>
                          <Tag bordered={false}>照搬安全 {quality.copy_safety_score ?? '-'}</Tag>
                          <Tag bordered={false}>原创性 {quality.originality_score ?? '-'}</Tag>
                        </Space>
                      )}
                      {hits.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                          疑似复用词：{hits.join('、')}
                        </Paragraph>
                      )}
                      {Array.isArray(quality?.recommendations) && quality.recommendations.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                          质量建议：{quality.recommendations.join('；')}
                        </Paragraph>
                      )}
                      {migrationAudit && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                          迁移审计：学习节奏/文风/爽点资产 {learnedCount} 条；规避 {Array.isArray(migrationAudit.avoided) ? migrationAudit.avoided.length : 0} 项；建议：{Array.isArray(migrationAudit.risk?.suggestions) ? migrationAudit.risk.suggestions.join('；') : '-'}
                        </Paragraph>
                      )}
                      {entries.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                          注入知识：{entries.map((entry: any) => `${entry.source_project || '参考'} / ${entry.category || '未分类'} / ${entry.title || entry.id}`).join('；')}
                        </Paragraph>
                      )}
                    </Space>
                  </Card>
                )
              }),
            },
            {
              key: 'editorReports', label: '编辑报告',
              children: editorReports.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无编辑报告" style={{ padding: '16px 8px' }} />
              ) : editorReports.slice(0, 12).map((report) => {
                const payload = parseReviewPayload(report)
                const body = payload.report || {}
                const dimensions = ['structure', 'continuity', 'pacing', 'style', 'originality', 'commercial']
                return (
                  <Card key={report.id} size="small" style={{ margin: 8, borderRadius: 8 }}
                    title={<Space wrap><Tag color={report.status === 'ok' ? 'green' : 'gold'} bordered={false}>{body.overall_score ?? '-'}分</Tag><Text strong>编辑报告</Text></Space>}>
                    <Space direction="vertical" size={7} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{report.created_at}</Text>
                      <Space wrap size={[4, 2]}>
                        {dimensions.map(key => body[key] && (
                          <Tag key={key} color={Number(body[key]?.score || 0) >= 78 ? 'green' : 'gold'} bordered={false}>
                            {key} {body[key]?.score ?? '-'}
                          </Tag>
                        ))}
                      </Space>
                      {Array.isArray(body.must_fix) && body.must_fix.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                          必修：{body.must_fix.join('；')}
                        </Paragraph>
                      )}
                      {body.one_click_revision_prompt && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
                          修订提示：{body.one_click_revision_prompt}
                        </Paragraph>
                      )}
                      {onApplyEditorRevision && (
                        <Button size="small" block onClick={() => onApplyEditorRevision(report)}>按报告修订</Button>
                      )}
                    </Space>
                  </Card>
                )
              }),
            },
            {
              key: 'bookReviews', label: '全书总检',
              children: bookReviews.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无全书总检" style={{ padding: '16px 8px' }} />
              ) : bookReviews.slice(0, 8).map((review) => {
                const payload = parseReviewPayload(review)
                const body = payload.report || payload || {}
                return (
                  <Card key={review.id} size="small" style={{ margin: 8, borderRadius: 8 }}
                    title={<Space wrap><Tag color={review.status === 'ok' ? 'green' : 'gold'} bordered={false}>{body.overall_score ?? '-'}分</Tag><Text strong>全书总检</Text></Space>}>
                    <Space direction="vertical" size={7} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{review.created_at}</Text>
                      {Array.isArray(body.must_fix) && body.must_fix.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>
                          必修：{body.must_fix.join('；')}
                        </Paragraph>
                      )}
                      {Array.isArray(body.next_actions) && body.next_actions.length > 0 && (
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 4, expandable: true, symbol: '展开' }}>
                          下一步：{body.next_actions.join('；')}
                        </Paragraph>
                      )}
                      {['mainline', 'character_arcs', 'foreshadowing', 'payoff_density', 'repetition', 'volume_goals', 'bible_alignment'].map(key => body[key] && (
                        <Paragraph key={key} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                          <Text strong>{key}：</Text>{displayValue(body[key])}
                        </Paragraph>
                      ))}
                    </Space>
                  </Card>
                )
              }),
            },
            {
              key: 'proseQuality', label: '正文质检',
              children: proseQualityReports.length === 0 ? (
                <div style={{ padding: 8 }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无正文质检" style={{ padding: '16px 8px' }} />
                  {onRefreshProseQuality && (
                    <Button size="small" block loading={proseQualityLoading} onClick={onRefreshProseQuality}>
                      复检当前版本
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {onRefreshProseQuality && (
                    <div style={{ padding: '8px 8px 0' }}>
                      <Button size="small" block loading={proseQualityLoading} onClick={onRefreshProseQuality}>
                        复检当前版本
                      </Button>
                    </div>
                  )}
                  <Collapse
                    size="small"
                    bordered={false}
                    style={{ background: 'transparent', margin: 8 }}
                    items={proseQualityReports.slice(0, 16).map((report) => {
                      const payload = parseReviewPayload(report)
                      const selfCheck = payload.self_check || {}
                      const review = selfCheck.review || {}
                      const score = Number(review.score ?? 0)
                      const issues = Array.isArray(review.issues) ? review.issues : (Array.isArray(report.issues) ? report.issues : [])
                      const pipeline = Array.isArray(payload.pipeline) ? payload.pipeline : []
                      const contextPackage = payload.context_package || {}
                      const chapterTarget = contextPackage.chapter_target || {}
                      const preflight = contextPackage.preflight || {}
                      const checks = Array.isArray(preflight.checks) ? preflight.checks : []
                      const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
                      const previousChapter = contextPackage.continuity?.previous_chapter || null
                      const isCurrent = activeChapterId !== null && Number(payload.chapter_id) === Number(activeChapterId)
                      const reportTime = timeValue(report.created_at)
                      const chapterTime = timeValue(activeChapterUpdatedAt)
                      const payloadChapterTime = timeValue(payload.chapter_updated_at)
                      const matchesCurrentText = reviewMatchesCurrentText(report, activeChapter || null)
                      const isStale = Boolean(isCurrent && !matchesCurrentText && chapterTime && reportTime && reportTime < chapterTime && (!payloadChapterTime || payloadChapterTime < chapterTime))
                      const usedByRevisions = revisionUsageMap.get(Number(report.id)) || []
                      const versionLabel = resolveReviewVersionLabel(report, activeChapter || null, activeChapterId, chapterVersions)
                      const revisionState = usedByRevisions.length
                        ? '已用于修订'
                        : selfCheck.revised
                          ? '已自动修订'
                          : payload.source === 'post_revision'
                            ? '修订后复检'
                            : '未修订'
                      const revisionStateColor = usedByRevisions.length || selfCheck.revised ? 'purple' : payload.source === 'post_revision' ? 'blue' : 'default'
                      return {
                        key: String(report.id),
                        label: (
                          <Space wrap size={4}>
                            {versionLabel && <Tag color="geekblue" bordered={false}>{versionLabel}</Tag>}
                            {isCurrent && <Tag color="blue" bordered={false}>当前章</Tag>}
                            {isStale && <Tag color="red" bordered={false}>旧报告</Tag>}
                            <Tag color={report.status === 'warn' ? 'gold' : 'green'} bordered={false}>{report.status === 'warn' ? '需检查' : '通过'}</Tag>
                            <Tag color={scoreColor(score)} bordered={false}>{score || '-'}分</Tag>
                            <Tag color={revisionStateColor} bordered={false}>{revisionState}</Tag>
                            <Text strong>{chapterTarget.chapter_no ? `第${chapterTarget.chapter_no}章` : '章节'}</Text>
                          </Space>
                        ),
                        children: (
                          <Space direction="vertical" size={7} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{report.created_at}</Text>
                            {isStale && (
                              <Text type="danger" style={{ fontSize: 12 }}>
                                这份报告对应 {versionLabel || '旧版本'}，早于当前正文，只能作为旧版本参考。
                              </Text>
                            )}
                            {usedByRevisions.length > 0 && (
                              <Text style={{ fontSize: 12 }}>
                                已用于生成修订稿：{usedByRevisions.map(item => `#${item.report.id}`).join('、')}
                              </Text>
                            )}
                            <Space wrap size={[4, 2]}>
                              <Tag color={preflight.ready ? 'green' : 'gold'} bordered={false}>{preflight.ready ? '上下文完整' : '上下文缺口'}</Tag>
                              {payload.source === 'post_revision' && <Tag color="blue" bordered={false}>修订后复检</Tag>}
                              {payload.content_hash && <Tag bordered={false}>正文指纹 {String(payload.content_hash).slice(0, 8)}</Tag>}
                            </Space>
                            {chapterTarget.title && (
                              <Text style={{ fontSize: 12 }}><Text strong>目标章：</Text>{displayPreview(chapterTarget.title, 40)}</Text>
                            )}
                            {previousChapter && (
                              <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                                前章衔接：第{previousChapter.chapter_no}章《{displayPreview(previousChapter.title, 32)}》；钩子：{displayValue(previousChapter.ending_hook) || '未记录'}
                              </Paragraph>
                            )}
                            {checks.length > 0 && (
                              <Space wrap size={[4, 2]}>
                                {checks.map((check: any) => (
                                  <Tag key={check.key || check.label} color={check.ok ? 'green' : 'gold'} bordered={false}>{check.label}</Tag>
                                ))}
                              </Space>
                            )}
                            {warnings.length > 0 && (
                              <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                                上下文缺口：{warnings.join('；')}
                              </Paragraph>
                            )}
                            {issues.length > 0 && (
                              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                {issues.slice(0, 6).map((issue: any, index: number) => (
                                  <Tag key={`${report.id}-issue-${index}`} color={statusColor(issueSeverity(issue) === 'high' || issueSeverity(issue) === 'critical' ? 'failed' : 'warn')} style={{ whiteSpace: 'normal', lineHeight: '18px' }}>
                                    {issueSeverity(issue)}｜{issueLabel(issue)}
                                  </Tag>
                                ))}
                              </Space>
                            )}
                            {pipeline.length > 0 && (
                              <Space wrap size={[4, 2]}>
                                {pipeline.map((stage: any, index: number) => (
                                  <Tag key={`${stage.key || stage.label}-${index}`} color={statusColor(stage.status)} bordered={false}>
                                    {stage.label || stage.key}
                                  </Tag>
                                ))}
                              </Space>
                            )}
                            {Array.isArray(review.revision_directives) && review.revision_directives.length > 0 && (
                              <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                                修订指令：{review.revision_directives.join('；')}
                              </Paragraph>
                            )}
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                              {isCurrent && onRefreshProseQuality && (
                                <Button size="small" block loading={proseQualityLoading} onClick={onRefreshProseQuality}>
                                  {isStale ? '复检当前版本' : '重新质检当前版本'}
                                </Button>
                              )}
                              {onApplyEditorRevision && (
                                <Button size="small" block disabled={isStale || usedByRevisions.length > 0} onClick={() => onApplyEditorRevision(report)}>
                                  {usedByRevisions.length ? '已用于修订' : isStale ? '旧报告不可直接修订' : '按自检修订'}
                                </Button>
                              )}
                            </Space>
                          </Space>
                        ),
                      }
                    })}
                  />
                </>
              ),
            },
            {
              key: 'versions', label: '版本',
              children: !activeChapter && chapterVersions.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{chapterVersionsLoading ? '加载中…' : '暂无历史版本'}</Text>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 8 }}>
                    当前正文显示为当前 v{currentVersionNo(chapterVersions)}；{chapterVersions.length > 0 ? `下方 v1-v${currentVersionNo(chapterVersions) - 1} 是被替换前保留下来的历史快照。` : '暂无历史快照。'}
                  </Text>
                  <Collapse
                    size="small"
                    bordered={false}
                    style={{ background: 'transparent' }}
                    items={[
                      ...(activeChapter ? [{
                        key: 'current',
                        label: (
                          <Space wrap size={4}>
                            <Tag color="blue" bordered={false}>当前 v{currentVersionNo(chapterVersions)}</Tag>
                            <Tag color="green" bordered={false}>当前正文</Tag>
                            <Text strong>{activeChapter.title || '当前章节'}</Text>
                          </Space>
                        ),
                        children: (
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{activeChapter.updated_at || ''}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                              {activeChapter.chapter_text || '空'}
                            </Paragraph>
                          </Space>
                        ),
                      }] : []),
                      ...chapterVersions.slice().sort((a, b) => b.version_no - a.version_no).map(v => ({
                        key: String(v.id),
                        label: (
                          <Space wrap size={4}>
                            <Tag color="geekblue" bordered={false}>v{v.version_no}</Tag>
                            <Tag color={versionSourceColor(v.source)} bordered={false}>{versionSourceLabel(v.source)}</Tag>
                          </Space>
                        ),
                        children: (
                          <Space direction="vertical" size={7} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{v.created_at}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
                              {v.chapter_text || '空'}
                            </Paragraph>
                            <Space>
                              <Button size="small" onClick={() => onOpenVersionDetail(v)}>对比</Button>
                              <Button size="small" danger onClick={() => onRollbackVersion(v.id)} loading={rollingBackVersionId === v.id}>回滚</Button>
                            </Space>
                          </Space>
                        ),
                      })),
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
