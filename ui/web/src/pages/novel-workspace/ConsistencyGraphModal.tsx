import React from 'react'
import { Alert, Button, Card, Empty, List, Modal, Progress, Space, Tabs, Tag, Timeline, Typography } from 'antd'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, type Edge, type Node } from 'reactflow'
import 'reactflow/dist/style.css'
import {
  ApartmentOutlined,
  BranchesOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  GoldOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { displayPreview, displayValue, wc } from './utils'

const { Text, Paragraph } = Typography

function asArray(value: any): any[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return Object.values(value)
  return [value]
}

function objectKeys(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.keys(value).filter(key => String(displayValue(value[key])).trim())
}

function severityColor(severity?: string) {
  if (severity === 'high' || severity === 'critical') return 'red'
  if (severity === 'medium') return 'gold'
  if (severity === 'low') return 'default'
  return 'blue'
}

function statusColor(status?: string) {
  const raw = String(status || '').toLowerCase()
  if (['closed', 'resolved', 'done', '回收', '已回收', '完成'].some(item => raw.includes(item))) return 'green'
  if (['blocked', 'risk', '冲突', '高危'].some(item => raw.includes(item))) return 'red'
  if (['open', 'pending', '未回收', '待处理'].some(item => raw.includes(item))) return 'gold'
  return 'blue'
}

function resolveOutlineVolume(outlines: any[], outlineId: any) {
  const byId = new Map(outlines.map(item => [Number(item.id), item]))
  let current = byId.get(Number(outlineId || 0))
  const seen = new Set<number>()
  while (current && !seen.has(Number(current.id))) {
    seen.add(Number(current.id))
    if (current.outline_type === 'volume') return current
    current = byId.get(Number(current.parent_id || 0))
  }
  return null
}

function storyNodeStyle(kind: string, risk = false) {
  const base = {
    borderRadius: 8,
    border: '1px solid #d9d9d9',
    padding: 8,
    width: 180,
    fontSize: 12,
    color: '#1f2937',
  }
  if (risk) return { ...base, border: '1px solid #ffccc7', background: '#fff1f0' }
  if (kind === 'project') return { ...base, border: '1px solid #91caff', background: '#e6f4ff', fontWeight: 600 }
  if (kind === 'volume') return { ...base, border: '1px solid #b7eb8f', background: '#f6ffed' }
  if (kind === 'chapter') return { ...base, background: '#fff' }
  if (kind === 'character') return { ...base, border: '1px solid #adc6ff', background: '#f0f5ff' }
  if (kind === 'thread') return { ...base, border: '1px solid #ffe58f', background: '#fffbe6' }
  return base
}

function buildStoryCanvasGraph(selectedProject: any, chapters: any[], characters: any[], outlines: any[], storyState: any, issues: any[]) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const sortedChapters = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const volumes = outlines.filter(item => item.outline_type === 'volume')
  const foreshadowing = outlines.filter(item => item.outline_type === 'foreshadowing')
  const riskyChapterNos = new Set(issues.map(item => Number(item.chapter_no || 0)).filter(Boolean))
  const visibleChapters = sortedChapters.slice(0, 80)
  const visibleCharacters = characters.slice(0, 24)
  const laneWidth = Math.max(900, visibleChapters.length * 145)

  const addNode = (node: Node) => nodes.push(node)
  const addEdge = (id: string, source: string, target: string, label?: string, animated = false) => {
    if (source === target || edges.some(edge => edge.id === id)) return
    edges.push({
      id,
      source,
      target,
      label,
      animated,
      style: { stroke: animated ? '#1677ff' : '#94a3b8', strokeWidth: animated ? 2 : 1 },
      labelStyle: { fontSize: 10, fill: '#64748b' },
    })
  }

  addNode({
    id: 'project',
    type: 'default',
    position: { x: 20, y: 40 },
    data: { label: `项目\n${selectedProject?.title || '未命名'}`, kind: 'project' },
    style: storyNodeStyle('project'),
  })

  volumes.forEach((volume, index) => {
    const id = `volume-${volume.id}`
    addNode({
      id,
      type: 'default',
      position: { x: 240 + index * 240, y: 40 },
      data: { label: `分卷\n${volume.title || `第${index + 1}卷`}`, kind: 'volume', source: volume },
      style: storyNodeStyle('volume'),
    })
    addEdge(`project-${id}`, 'project', id, '分卷')
  })

  visibleChapters.forEach((chapter, index) => {
    const id = `chapter-${chapter.id}`
    const volume = resolveOutlineVolume(outlines, chapter.outline_id)
    const risk = riskyChapterNos.has(Number(chapter.chapter_no))
    addNode({
      id,
      type: 'default',
      position: { x: 80 + index * 145, y: 220 + (index % 2) * 24 },
      data: {
        label: `第${chapter.chapter_no}章\n${displayPreview(chapter.title || '未命名', 18)}\n${wc(chapter.chapter_text)}字`,
        kind: 'chapter',
        source: chapter,
      },
      style: storyNodeStyle('chapter', risk),
    })
    if (index > 0) addEdge(`chapter-seq-${visibleChapters[index - 1].id}-${chapter.id}`, `chapter-${visibleChapters[index - 1].id}`, id, '推进', true)
    if (volume) addEdge(`volume-${volume.id}-chapter-${chapter.id}`, `volume-${volume.id}`, id, '覆盖')
  })

  visibleCharacters.forEach((character, index) => {
    const id = `character-${character.id}`
    addNode({
      id,
      type: 'default',
      position: { x: 80 + (index % 8) * 170, y: 430 + Math.floor(index / 8) * 110 },
      data: {
        label: `${character.name || '未命名角色'}\n${displayPreview(character.role_type || character.role || character.goal || '', 30)}`,
        kind: 'character',
        source: character,
      },
      style: storyNodeStyle('character'),
    })
    const name = String(character.name || '').trim()
    if (!name) return
    visibleChapters.forEach(chapter => {
      const text = [
        chapter.title,
        chapter.chapter_summary,
        chapter.chapter_goal,
        chapter.conflict,
        JSON.stringify(chapter.scene_breakdown || chapter.scene_list || []),
        String(chapter.chapter_text || '').slice(0, 8000),
      ].join('\n')
      if (text.includes(name)) addEdge(`character-${character.id}-chapter-${chapter.id}`, id, `chapter-${chapter.id}`, '出现')
    })
  })

  const threadItems = [
    ...foreshadowing.slice(0, 18).map(item => ({ key: `foreshadow-${item.id}`, title: item.title, text: item.summary || item.hook || '', type: '伏笔' })),
    ...objectKeys(storyState.foreshadowing_status).slice(0, 18).map(key => ({ key: `state-foreshadow-${key}`, title: key, text: storyState.foreshadowing_status[key], type: '状态' })),
    ...asArray(storyState.open_questions).slice(0, 10).map((item, index) => ({ key: `question-${index}`, title: `问题 ${index + 1}`, text: item, type: '问题' })),
  ].slice(0, 30)
  threadItems.forEach((item, index) => {
    const id = `thread-${item.key}`
    addNode({
      id,
      type: 'default',
      position: { x: 80 + (index % 8) * 170, y: 760 + Math.floor(index / 8) * 110 },
      data: { label: `${item.type}\n${displayPreview(item.title, 22)}\n${displayPreview(displayValue(item.text), 28)}`, kind: 'thread', source: item },
      style: storyNodeStyle('thread'),
    })
    const needle = String(item.title || '').trim()
    if (!needle) return
    visibleChapters.forEach(chapter => {
      const text = [chapter.title, chapter.chapter_summary, chapter.chapter_text].join('\n')
      if (text.includes(needle)) addEdge(`${id}-chapter-${chapter.id}`, id, `chapter-${chapter.id}`, '关联')
    })
  })

  if (nodes.length > 1) {
    addNode({
      id: 'story-state',
      type: 'default',
      position: { x: Math.min(laneWidth, 1120), y: 40 },
      data: { label: `状态机\n更新到第${storyState.last_updated_chapter || 0}章`, kind: 'state' },
      style: storyNodeStyle('state', Boolean(issues.some(item => item.type === 'story_state_stale'))),
    })
    visibleCharacters.slice(0, 8).forEach(character => addEdge(`state-character-${character.id}`, 'story-state', `character-${character.id}`, '状态'))
    threadItems.slice(0, 8).forEach(item => addEdge(`state-thread-${item.key}`, 'story-state', `thread-${item.key}`, '线索'))
  }

  return { nodes, edges }
}

function StoryCanvasTab({
  selectedProject,
  chapters,
  characters,
  outlines,
  storyState,
  issues,
  onSelectChapter,
}: {
  selectedProject: any | null
  chapters: any[]
  characters: any[]
  outlines: any[]
  storyState: any
  issues: any[]
  onSelectChapter: (chapterId: number) => void
}) {
  const graph = React.useMemo(
    () => buildStoryCanvasGraph(selectedProject, chapters, characters, outlines, storyState, issues),
    [selectedProject, chapters, characters, outlines, storyState, issues],
  )
  if (graph.nodes.length <= 1) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无足够材料生成剧情画布" />
  }
  return (
    <div style={{ height: 620, border: '1px solid #edf0f5', borderRadius: 8, overflow: 'hidden' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.25}
          maxZoom={1.6}
          onNodeDoubleClick={(_, node) => {
            const data: any = node.data || {}
            if (data.kind === 'chapter' && data.source?.id) onSelectChapter(data.source.id)
          }}
        >
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
          <Controls />
          <Background gap={18} color="#e5e7eb" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}

function localContinuityIssues(chapters: any[], characters: any[], storyState: any) {
  const issues: any[] = []
  const sorted = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const writtenMax = Math.max(0, ...sorted.filter(ch => ch.chapter_text).map(ch => Number(ch.chapter_no || 0)))
  if (writtenMax && Number(storyState.last_updated_chapter || 0) < writtenMax) {
    issues.push({
      type: 'story_state_stale',
      severity: 'high',
      message: `故事状态机更新到第${storyState.last_updated_chapter || 0}章，落后正文至第${writtenMax}章。`,
      action: '先运行状态机更新或人工校正。',
    })
  }
  const knownCharacters = new Set(characters.map(item => String(item.name || '').trim()).filter(Boolean))
  for (const name of objectKeys(storyState.character_positions)) {
    if (knownCharacters.size > 0 && !knownCharacters.has(name)) {
      issues.push({ type: 'unknown_character', severity: 'low', message: `状态机里有未建角色卡：${name}`, action: '创建角色卡或清理状态机。' })
    }
  }
  for (const chapter of sorted) {
    if (chapter.chapter_text && !chapter.ending_hook) {
      issues.push({ type: 'missing_hook', severity: 'medium', chapter_no: chapter.chapter_no, message: `第${chapter.chapter_no}章缺章末钩子。`, action: '补充下一章驱动力。' })
    }
    const scenes = asArray(chapter.scene_breakdown || chapter.scene_list)
    const sceneCharacters = scenes.flatMap(scene => asArray(scene.characters_present)).map(item => String(item).trim()).filter(Boolean)
    for (const name of sceneCharacters) {
      if (knownCharacters.size > 0 && !knownCharacters.has(name)) {
        issues.push({ type: 'scene_unknown_character', severity: 'low', chapter_no: chapter.chapter_no, message: `第${chapter.chapter_no}章场景卡出现未建角色：${name}`, action: '补角色卡或改场景卡角色名。' })
      }
    }
  }
  for (const item of asArray(storyState.recent_repeated_information).slice(0, 10)) {
    issues.push({ type: 'repeated_information', severity: 'medium', message: `近期重复信息：${displayValue(item)}`, action: '后续生成禁止再次解释，改为推进新信息。' })
  }
  for (const item of asArray(storyState.unresolved_conflicts || storyState.open_questions).slice(0, 10)) {
    issues.push({ type: 'open_thread', severity: 'medium', message: `未关闭线索：${displayValue(item)}`, action: '纳入滚动规划，明确回收章节。' })
  }
  return issues
}

export function ConsistencyGraphModal({
  open,
  selectedProject,
  chapters,
  characters,
  outlines,
  audit,
  auditLoading,
  onClose,
  onRefreshAudit,
  onOpenStoryState,
  onSelectChapter,
}: {
  open: boolean
  selectedProject: any | null
  chapters: any[]
  characters: any[]
  outlines?: any[]
  audit?: any
  auditLoading?: boolean
  onClose: () => void
  onRefreshAudit: () => void
  onOpenStoryState: () => void
  onSelectChapter: (chapterId: number) => void
}) {
  const storyState = selectedProject?.reference_config?.story_state || {}
  const outlineItems = Array.isArray(outlines) ? outlines : []
  const sortedChapters = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const writtenChapters = sortedChapters.filter(ch => ch.chapter_text)
  const sceneCards = sortedChapters.flatMap(ch => asArray(ch.scene_breakdown || ch.scene_list).map((scene, index) => ({ ...scene, chapter: ch, scene_index: index })))
  const localIssues = localContinuityIssues(sortedChapters, characters, storyState)
  const auditIssues = Array.isArray(audit?.issues) ? audit.issues : []
  const issues = auditIssues.length > 0 ? auditIssues : localIssues
  const highCount = issues.filter(item => item.severity === 'high' || item.severity === 'critical').length
  const mediumCount = issues.filter(item => item.severity === 'medium').length
  const score = audit?.score !== undefined
    ? Number(audit.score || 0)
    : Math.max(0, 100 - highCount * 12 - mediumCount * 6 - Math.max(0, issues.length - highCount - mediumCount) * 2)
  const characterPositions = storyState.character_positions || {}
  const characterRelationships = storyState.character_relationships || storyState.relationship_graph || {}
  const knownSecrets = storyState.known_secrets || storyState.secret_visibility || {}
  const itemOwnership = storyState.item_ownership || {}
  const resourceStatus = storyState.resource_status || {}
  const foreshadowingStatus = storyState.foreshadowing_status || {}
  const chapterTimeline = sortedChapters.map(ch => ({
    chapter: ch,
    scenes: asArray(ch.scene_breakdown || ch.scene_list),
    wordCount: wc(ch.chapter_text),
    hasHook: Boolean(ch.ending_hook),
    hasText: Boolean(ch.chapter_text),
  }))

  return (
    <Modal
      open={open}
      title={<Space><BranchesOutlined />全书一致性图谱</Space>}
      width={1040}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>关闭</Button>}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Progress type="circle" size={78} percent={score} status={score >= 80 ? 'success' : score < 65 ? 'exception' : 'normal'} />
            <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 0 }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>章节 {sortedChapters.length}</Tag>
                <Tag color="green" bordered={false}>已写 {writtenChapters.length}</Tag>
                <Tag color={sceneCards.length ? 'green' : 'default'} bordered={false}>场景卡 {sceneCards.length}</Tag>
                <Tag color={objectKeys(characterPositions).length ? 'purple' : 'default'} bordered={false}>角色位置 {objectKeys(characterPositions).length}</Tag>
                <Tag color={objectKeys(foreshadowingStatus).length ? 'gold' : 'default'} bordered={false}>伏笔 {objectKeys(foreshadowingStatus).length}</Tag>
                <Tag color={highCount ? 'red' : 'default'} bordered={false}>高危 {highCount}</Tag>
                <Tag color={mediumCount ? 'gold' : 'default'} bordered={false}>中危 {mediumCount}</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                图谱基于章节、场景卡、角色卡和故事状态机生成；刷新审计会调用后端连续性检查，结果优先显示。
              </Text>
              {audit?.recommendations?.length > 0 && (
                <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                  {audit.recommendations.join('；')}
                </Paragraph>
              )}
            </Space>
            <Space direction="vertical">
              <Button size="small" icon={<ReloadOutlined />} loading={auditLoading} onClick={onRefreshAudit}>刷新审计</Button>
              <Button size="small" onClick={onOpenStoryState}>校正状态机</Button>
            </Space>
          </div>
        </Card>

        <Tabs
          size="small"
          items={[
            {
              key: 'storyCanvas',
              label: '剧情画布',
              children: (
                <StoryCanvasTab
                  selectedProject={selectedProject}
                  chapters={sortedChapters}
                  characters={characters}
                  outlines={outlineItems}
                  storyState={storyState}
                  issues={issues}
                  onSelectChapter={onSelectChapter}
                />
              ),
            },
            {
              key: 'issues',
              label: `冲突 ${issues.length}`,
              children: issues.length === 0 ? (
                <Alert type="success" showIcon message="当前没有发现明显连续性冲突" />
              ) : (
                <List
                  size="small"
                  dataSource={issues.slice(0, 100)}
                  renderItem={(issue: any) => (
                    <List.Item
                      actions={issue.chapter_no ? [<Button key="open" size="small" type="link" onClick={() => {
                        const chapter = sortedChapters.find(ch => Number(ch.chapter_no) === Number(issue.chapter_no))
                        if (chapter) onSelectChapter(chapter.id)
                      }}>打开章节</Button>] : undefined}
                    >
                      <List.Item.Meta
                        avatar={<ExclamationCircleOutlined style={{ color: severityColor(issue.severity) === 'red' ? '#ff4d4f' : severityColor(issue.severity) === 'gold' ? '#faad14' : '#8c8c8c' }} />}
                        title={<Space wrap><Tag color={severityColor(issue.severity)} bordered={false}>{issue.severity || 'info'}</Tag><Text>{issue.chapter_no ? `第${issue.chapter_no}章 ` : ''}{issue.message}</Text></Space>}
                        description={issue.action || issue.type}
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'timeline',
              label: '时间线',
              children: chapterTimeline.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无章节时间线" />
              ) : (
                <Timeline
                  items={chapterTimeline.slice(0, 120).map(row => ({
                    color: row.hasText ? (row.hasHook ? 'green' : 'orange') : 'gray',
                    children: (
                      <Card size="small" styles={{ body: { padding: 10 } }}>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Text strong>第{row.chapter.chapter_no}章《{row.chapter.title || '未命名'}》</Text>
                            <Tag color={row.hasText ? 'green' : 'default'} bordered={false}>{row.hasText ? `${row.wordCount}字` : '未写'}</Tag>
                            <Tag color={row.hasHook ? 'blue' : 'gold'} bordered={false}>{row.hasHook ? '有钩子' : '缺钩子'}</Tag>
                            {row.scenes.length > 0 && <Tag bordered={false}>场景 {row.scenes.length}</Tag>}
                          </Space>
                          {(row.chapter.chapter_summary || row.chapter.chapter_goal) && (
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                              {displayValue(row.chapter.chapter_summary || row.chapter.chapter_goal)}
                            </Paragraph>
                          )}
                          {row.chapter.ending_hook && <Text type="secondary" style={{ fontSize: 12 }}>钩子：{displayValue(row.chapter.ending_hook)}</Text>}
                        </Space>
                      </Card>
                    ),
                  }))}
                />
              ),
            },
            {
              key: 'characters',
              label: '角色状态',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Card size="small" title={<Space><TeamOutlined />位置</Space>}>
                    {objectKeys(characterPositions).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无角色位置" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {objectKeys(characterPositions).map(name => (
                          <div key={name}>
                            <Text strong>{name}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{displayValue(characterPositions[name])}</Paragraph>
                          </div>
                        ))}
                      </Space>
                    )}
                  </Card>
                  <Card size="small" title={<Space><ApartmentOutlined />关系 / 秘密</Space>}>
                    {objectKeys(characterRelationships).length === 0 && objectKeys(knownSecrets).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关系或秘密状态" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {objectKeys(characterRelationships).slice(0, 10).map(key => (
                          <div key={key}>
                            <Text strong>{key}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{displayValue(characterRelationships[key])}</Paragraph>
                          </div>
                        ))}
                        {objectKeys(knownSecrets).slice(0, 10).map(key => (
                          <div key={`secret-${key}`}>
                            <Text strong>{key}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{displayValue(knownSecrets[key])}</Paragraph>
                          </div>
                        ))}
                      </Space>
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: 'props',
              label: '道具/伏笔',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Card size="small" title={<Space><GoldOutlined />道具与资源</Space>}>
                    {objectKeys(itemOwnership).length === 0 && objectKeys(resourceStatus).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无道具资源状态" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {[...objectKeys(itemOwnership), ...objectKeys(resourceStatus)].slice(0, 30).map(key => (
                          <div key={key}>
                            <Text strong>{key}</Text>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                              {displayValue(itemOwnership[key] ?? resourceStatus[key])}
                            </Paragraph>
                          </div>
                        ))}
                      </Space>
                    )}
                  </Card>
                  <Card size="small" title={<Space><ClockCircleOutlined />伏笔状态</Space>}>
                    {objectKeys(foreshadowingStatus).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无伏笔状态" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {objectKeys(foreshadowingStatus).slice(0, 40).map(key => {
                          const value = foreshadowingStatus[key]
                          return (
                            <div key={key}>
                              <Space wrap>
                                <Text strong>{key}</Text>
                                <Tag color={statusColor(displayValue(value))} bordered={false}>{displayPreview(displayValue(value), 18)}</Tag>
                              </Space>
                              <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{displayValue(value)}</Paragraph>
                            </div>
                          )
                        })}
                      </Space>
                    )}
                  </Card>
                </div>
              ),
            },
            {
              key: 'sceneGraph',
              label: '场景网络',
              children: sceneCards.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无场景卡网络" />
              ) : (
                <List
                  size="small"
                  grid={{ gutter: 12, column: 2 }}
                  dataSource={sceneCards.slice(0, 100)}
                  renderItem={(scene: any) => (
                    <List.Item>
                      <Card size="small" title={`第${scene.chapter.chapter_no}章 · ${displayPreview(scene.title || scene.purpose || scene.description, 32)}`} styles={{ body: { padding: 10 } }}>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            {asArray(scene.characters_present).slice(0, 6).map(name => <Tag key={name} color="blue" bordered={false}>{name}</Tag>)}
                            {scene.location && <Tag bordered={false}>{scene.location}</Tag>}
                            {scene.emotional_tone && <Tag color="purple" bordered={false}>{scene.emotional_tone}</Tag>}
                          </Space>
                          {scene.conflict && <Text type="secondary" style={{ fontSize: 12 }}>冲突：{displayValue(scene.conflict)}</Text>}
                          {scene.exit_state && <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>出场状态：{displayValue(scene.exit_state)}</Paragraph>}
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Space>
    </Modal>
  )
}
