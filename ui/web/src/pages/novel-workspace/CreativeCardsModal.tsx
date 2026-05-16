import React from 'react'
import { Alert, Button, Card, Empty, Input, List, Modal, Progress, Space, Tabs, Tag, Typography } from 'antd'
import {
  ApartmentOutlined,
  BookOutlined,
  BulbOutlined,
  CompassOutlined,
  FileTextOutlined,
  FlagOutlined,
  GoldOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { displayPreview, displayValue, wc } from './utils'
import apiClient from '../../api/client'

const { Text, Paragraph } = Typography

type CardKind = 'worldbuilding' | 'character' | 'outline'

function asArray(value: any): any[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

function objectEntries(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).filter(([, item]) => item !== undefined && item !== null && String(displayValue(item)).trim())
}

function stringifySearchText(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function filterBySearch<T>(items: T[], keyword: string, picker: (item: T) => any) {
  const query = keyword.trim().toLowerCase()
  if (!query) return items
  return items.filter(item => stringifySearchText(picker(item)).toLowerCase().includes(query))
}

function SmallStat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Tag color={color} bordered={false} style={{ marginRight: 0 }}>
      {label} {value}
    </Tag>
  )
}

function SectionCard({
  title,
  icon,
  extra,
  children,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card
      size="small"
      title={<Space size={6}>{icon}{title}</Space>}
      extra={extra}
      style={{ borderRadius: 8 }}
      styles={{ body: { padding: 12 } }}
    >
      {children}
    </Card>
  )
}

function KeyValueBlock({ value }: { value: any }) {
  const entries = objectEntries(value)
  if (entries.length === 0) {
    return (
      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }} ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}>
        {displayValue(value) || '-'}
      </Paragraph>
    )
  }
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {entries.slice(0, 8).map(([key, item]) => (
        <div key={key}>
          <Text strong style={{ fontSize: 12 }}>{key}：</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: 12 }} ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
            {displayValue(item)}
          </Paragraph>
        </div>
      ))}
      {entries.length > 8 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {entries.length - 8} 项</Text>}
    </Space>
  )
}

function TruthFileTab({
  truthFile,
  loading,
  onRefresh,
  onOpenStoryState,
}: {
  truthFile: any | null
  loading: boolean
  onRefresh: () => void
  onOpenStoryState: () => void
}) {
  if (loading && !truthFile) {
    return <Card size="small" loading />
  }
  if (!truthFile) {
    return (
      <Card size="small">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无真相文件" />
      </Card>
    )
  }
  const scorecard = truthFile.scorecard || {}
  const tags = Array.isArray(truthFile.index?.tags) ? truthFile.index.tags : []
  const links = Array.isArray(truthFile.index?.chapter_references) ? truthFile.index.chapter_references : []
  const ledgers = truthFile.truth_files?.ledgers || {}
  const trace = truthFile.context_trace || null
  const recommendations = Array.isArray(truthFile.recommendations) ? truthFile.recommendations : []
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {scorecard.state_stale && (
        <Alert
          type="warning"
          showIcon
          message="故事状态机落后"
          description="已有正文比状态机更新得更靠后。继续自动生成前，建议先校正状态机，避免角色位置、道具归属和伏笔状态漂移。"
          action={<Button size="small" onClick={onOpenStoryState}>校正</Button>}
        />
      )}
      <Card
        size="small"
        title="项目真相文件"
        extra={<Button size="small" loading={loading} onClick={onRefresh}>刷新</Button>}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space wrap>
            <SmallStat label="世界观" value={scorecard.worldbuilding_count || 0} color={scorecard.worldbuilding_count ? 'green' : 'red'} />
            <SmallStat label="角色" value={scorecard.character_count || 0} color={scorecard.character_count ? 'green' : 'red'} />
            <SmallStat label="大纲" value={scorecard.outline_count || 0} color={scorecard.outline_count ? 'green' : 'gold'} />
            <SmallStat label="已写章节" value={scorecard.written_chapter_count || 0} color={scorecard.written_chapter_count ? 'green' : 'gold'} />
            <SmallStat label="标签" value={scorecard.tag_count || 0} color={scorecard.tag_count ? 'blue' : 'default'} />
            <SmallStat label="状态更新到" value={scorecard.state_last_updated_chapter ? `第${scorecard.state_last_updated_chapter}章` : '-'} color={scorecard.state_stale ? 'red' : 'green'} />
          </Space>
          {recommendations.length > 0 && (
            <Space direction="vertical" size={4}>
              {recommendations.map((item: string) => <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>)}
            </Space>
          )}
        </Space>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
        <SectionCard title="事实账本" icon={<ApartmentOutlined />}>
          <KeyValueBlock value={{
            timeline: ledgers.timeline,
            locations: ledgers.locations,
            resources: ledgers.resources,
            foreshadowing: ledgers.foreshadowing,
            open_threads: ledgers.open_threads,
          }} />
        </SectionCard>
        <SectionCard title="上下文追踪" icon={<CompassOutlined />}>
          {trace ? (
            <KeyValueBlock value={{
              chapter: trace.chapter,
              material_sources: trace.material_sources,
              preflight: trace.preflight,
              review_trace: trace.review_trace,
            }} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无章节上下文追踪" />
          )}
        </SectionCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
        <SectionCard title={`标签/引用索引 ${tags.length}`} icon={<BookOutlined />}>
          {tags.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无标签索引" />
          ) : (
            <Space wrap size={[6, 6]}>
              {tags.slice(0, 80).map((item: any) => (
                <Tag key={item.tag} color={item.count > 2 ? 'blue' : 'default'} bordered={false}>
                  @{item.tag} · {item.count}
                </Tag>
              ))}
            </Space>
          )}
        </SectionCard>
        <SectionCard title={`章节引用关系 ${links.length}`} icon={<FileTextOutlined />}>
          {links.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无章节引用关系" />
          ) : (
            <List
              size="small"
              dataSource={links.slice(0, 16)}
              renderItem={(item: any) => (
                <List.Item>
                  <Space direction="vertical" size={3}>
                    <Text>第{item.chapter_no}章 {item.title || '未命名'}</Text>
                    <Space wrap size={[4, 4]}>
                      {asArray(item.characters).slice(0, 8).map((name: string) => <Tag key={`c-${item.chapter_id}-${name}`} color="blue" bordered={false}>{name}</Tag>)}
                      {asArray(item.outlines).slice(0, 5).map((title: string) => <Tag key={`o-${item.chapter_id}-${title}`} bordered={false}>{title}</Tag>)}
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </SectionCard>
      </div>
      <SectionCard title="角色状态账本" icon={<TeamOutlined />}>
        {asArray(ledgers.characters).length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无角色状态" />
        ) : (
          <List
            size="small"
            dataSource={asArray(ledgers.characters).slice(0, 24)}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={3} style={{ width: '100%' }}>
                  <Space wrap>
                    <Text strong>{item.name}</Text>
                    {item.role && <Tag color="blue" bordered={false}>{item.role}</Tag>}
                    {item.position && <Tag bordered={false}>位置：{displayPreview(item.position, 24)}</Tag>}
                  </Space>
                  <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                    {displayValue(item.current_state) || item.goal || item.conflict || '-'}
                  </Paragraph>
                </Space>
              </List.Item>
            )}
          />
        )}
      </SectionCard>
    </Space>
  )
}

export function CreativeCardsModal({
  open,
  selectedProject,
  worldbuilding,
  characters,
  outlines,
  chapters,
  activeChapterId,
  onClose,
  onEdit,
  onOpenWritingBible,
  onOpenStoryState,
}: {
  open: boolean
  selectedProject: any | null
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  chapters: any[]
  activeChapterId: number | null
  onClose: () => void
  onEdit: (kind: CardKind, item?: any) => void
  onOpenWritingBible: () => void
  onOpenStoryState: () => void
}) {
  const [keyword, setKeyword] = React.useState('')
  const [truthFile, setTruthFile] = React.useState<any | null>(null)
  const [truthFileLoading, setTruthFileLoading] = React.useState(false)
  const writingBible = selectedProject?.reference_config?.writing_bible || {}
  const storyState = selectedProject?.reference_config?.story_state || {}
  const volumeControl = selectedProject?.reference_config?.volume_control || {}
  const masterOutlines = outlines.filter(item => item.outline_type === 'master')
  const volumeOutlines = outlines.filter(item => item.outline_type === 'volume')
  const chapterOutlines = outlines.filter(item => item.outline_type === 'chapter')
  const foreshadowingOutlines = outlines.filter(item => item.outline_type === 'foreshadowing')
  const sceneCards = chapters.flatMap(ch => asArray(ch.scene_breakdown || ch.scene_list).map((scene, index) => ({ ...scene, chapter: ch, scene_index: index })))
  const itemState = {
    item_ownership: storyState.item_ownership,
    resource_status: storyState.resource_status,
    active_locations: storyState.active_locations,
    open_questions: storyState.open_questions,
    unresolved_conflicts: storyState.unresolved_conflicts,
  }
  const cardTotal = worldbuilding.length + characters.length + outlines.length + sceneCards.length
  const foundationScore = Math.min(100, Math.round(
    (worldbuilding.length > 0 ? 22 : 0)
    + (characters.length > 0 ? 22 : 0)
    + (masterOutlines.length > 0 ? 16 : 0)
    + (volumeOutlines.length > 0 ? 16 : 0)
    + (chapters.length > 0 ? 12 : 0)
    + (Object.keys(storyState || {}).length > 0 ? 12 : 0),
  ))

  const filteredCharacters = filterBySearch(characters, keyword, item => item)
  const filteredVolumes = filterBySearch(volumeOutlines, keyword, item => item)
  const filteredChapterOutlines = filterBySearch(chapterOutlines, keyword, item => item)
  const filteredForeshadowing = filterBySearch([...foreshadowingOutlines, ...(objectEntries(storyState.foreshadowing_status).map(([key, value]) => ({ title: key, summary: value, source: 'story_state' })))], keyword, item => item)
  const filteredScenes = filterBySearch(sceneCards, keyword, item => item)

  const loadTruthFile = React.useCallback(async () => {
    if (!open || !selectedProject?.id) return
    setTruthFileLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${selectedProject.id}/truth-file`, {
        params: { chapter_id: activeChapterId || undefined },
      })
      setTruthFile(res.data?.truth_file || null)
    } finally {
      setTruthFileLoading(false)
    }
  }, [activeChapterId, open, selectedProject?.id])

  React.useEffect(() => {
    void loadTruthFile()
  }, [loadTruthFile])

  return (
    <Modal
      open={open}
      title={<Space><BookOutlined />创作资料卡中心</Space>}
      width={1040}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>关闭</Button>}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 132 }}>
              <Progress type="circle" size={74} percent={foundationScore} />
            </div>
            <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 0 }}>
              <Space wrap>
                <SmallStat label="总卡片" value={cardTotal} color="blue" />
                <SmallStat label="世界观" value={worldbuilding.length} color={worldbuilding.length ? 'green' : 'red'} />
                <SmallStat label="角色" value={characters.length} color={characters.length ? 'green' : 'red'} />
                <SmallStat label="分卷" value={volumeOutlines.length} color={volumeOutlines.length ? 'green' : 'gold'} />
                <SmallStat label="章节" value={chapters.length} color={chapters.length ? 'green' : 'gold'} />
                <SmallStat label="场景卡" value={sceneCards.length} color={sceneCards.length ? 'green' : 'default'} />
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                这里统一展示生成时会用到的结构化材料。卡片越完整，章节流水线越容易保持长篇连续性。
              </Text>
              <Space>
                <Button size="small" onClick={onOpenWritingBible}>编辑写作圣经</Button>
                <Button size="small" onClick={onOpenStoryState}>校正状态机</Button>
              </Space>
            </Space>
            <Input.Search
              allowClear
              size="small"
              placeholder="搜索角色、伏笔、场景、规则"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              style={{ width: 240 }}
            />
          </div>
        </Card>

        <Tabs
          size="small"
          items={[
            {
              key: 'truth',
              label: '真相文件',
              children: (
                <TruthFileTab
                  truthFile={truthFile}
                  loading={truthFileLoading}
                  onRefresh={() => { void loadTruthFile() }}
                  onOpenStoryState={onOpenStoryState}
                />
              ),
            },
            {
              key: 'foundation',
              label: '项目底座',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <SectionCard
                    title="写作圣经"
                    icon={<BookOutlined />}
                    extra={<Button size="small" type="link" onClick={onOpenWritingBible}>编辑</Button>}
                  >
                    {Object.keys(writingBible || {}).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未保存写作圣经" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {writingBible.promise && <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: true }}>{displayValue(writingBible.promise)}</Paragraph>}
                        <Space wrap>
                          {writingBible.project?.genre && <Tag color="purple" bordered={false}>{writingBible.project.genre}</Tag>}
                          {writingBible.style_lock?.narrative_person && <Tag bordered={false}>{writingBible.style_lock.narrative_person}</Tag>}
                          {writingBible.style_lock?.chapter_word_range && <Tag bordered={false}>{writingBible.style_lock.chapter_word_range}</Tag>}
                        </Space>
                        <KeyValueBlock value={{
                          world_rules: writingBible.world_rules,
                          mainline: writingBible.mainline,
                          style_lock: writingBible.style_lock,
                          forbidden: writingBible.forbidden,
                        }} />
                      </Space>
                    )}
                  </SectionCard>
                  <SectionCard
                    title="世界观"
                    icon={<CompassOutlined />}
                    extra={<Button size="small" type="link" onClick={() => onEdit('worldbuilding')}>新增</Button>}
                  >
                    {worldbuilding.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无世界观卡" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {worldbuilding.map(item => (
                          <Card key={item.id || item.world_summary} size="small" styles={{ body: { padding: 8 } }}
                            title={displayPreview(item.world_summary, 36)}
                            extra={<Button size="small" type="link" onClick={() => onEdit('worldbuilding', item)}>编辑</Button>}>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 4, expandable: true }}>
                              {displayValue(item.rules) || displayValue(item.known_unknowns) || '-'}
                            </Paragraph>
                          </Card>
                        ))}
                      </Space>
                    )}
                  </SectionCard>
                  <SectionCard title="总纲" icon={<FlagOutlined />}>
                    {masterOutlines.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无总纲" />
                    ) : masterOutlines.map(item => (
                      <Card key={item.id || item.title} size="small" style={{ marginBottom: 8 }} styles={{ body: { padding: 8 } }}
                        title={displayPreview(item.title, 36)}
                        extra={<Button size="small" type="link" onClick={() => onEdit('outline', item)}>编辑</Button>}>
                        <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 4, expandable: true }}>{displayValue(item.summary)}</Paragraph>
                      </Card>
                    ))}
                  </SectionCard>
                  <SectionCard
                    title="长期状态"
                    icon={<ApartmentOutlined />}
                    extra={<Button size="small" type="link" onClick={onOpenStoryState}>校正</Button>}
                  >
                    {Object.keys(storyState || {}).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无故事状态机" />
                    ) : (
                      <KeyValueBlock value={{
                        last_updated_chapter: storyState.last_updated_chapter,
                        timeline: storyState.timeline,
                        mainline_progress: storyState.mainline_progress,
                        volume_progress: storyState.volume_progress,
                        next_chapter_priorities: storyState.next_chapter_priorities,
                      }} />
                    )}
                  </SectionCard>
                </div>
              ),
            },
            {
              key: 'characters',
              label: `角色 ${characters.length}`,
              children: filteredCharacters.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配角色卡" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  {filteredCharacters.map(character => (
                    <SectionCard
                      key={character.id || character.name}
                      title={displayPreview(character.name, 24)}
                      icon={<TeamOutlined />}
                      extra={<Button size="small" type="link" onClick={() => onEdit('character', character)}>编辑</Button>}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          {character.role_type && <Tag color="blue" bordered={false}>{character.role_type}</Tag>}
                          {character.archetype && <Tag bordered={false}>{character.archetype}</Tag>}
                        </Space>
                        {character.goal && <Text style={{ fontSize: 12 }}><Text strong>目标：</Text>{displayValue(character.goal)}</Text>}
                        {character.motivation && <Text style={{ fontSize: 12 }}><Text strong>动机：</Text>{displayValue(character.motivation)}</Text>}
                        {character.conflict && <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}><Text strong>冲突：</Text>{displayValue(character.conflict)}</Paragraph>}
                        {character.current_state && Object.keys(character.current_state).length > 0 && (
                          <Card size="small" title="当前状态" styles={{ body: { padding: 8 } }}>
                            <KeyValueBlock value={character.current_state} />
                          </Card>
                        )}
                      </Space>
                    </SectionCard>
                  ))}
                </div>
              ),
            },
            {
              key: 'volumes',
              label: `分卷/阶段 ${volumeOutlines.length}`,
              children: (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {filteredVolumes.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分卷卡" />
                  ) : filteredVolumes.map((volume, index) => (
                    <SectionCard
                      key={volume.id || volume.title}
                      title={`${index + 1}. ${displayPreview(volume.title, 42)}`}
                      icon={<FlagOutlined />}
                      extra={<Button size="small" type="link" onClick={() => onEdit('outline', volume)}>编辑</Button>}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: true }}>{displayValue(volume.summary)}</Paragraph>
                        <Space wrap>
                          {volume.raw_payload?.start_chapter && <Tag bordered={false}>起始 {volume.raw_payload.start_chapter}</Tag>}
                          {volume.raw_payload?.end_chapter && <Tag bordered={false}>结束 {volume.raw_payload.end_chapter}</Tag>}
                          {volume.target_length && <Tag bordered={false}>{volume.target_length}</Tag>}
                        </Space>
                        <KeyValueBlock value={{
                          conflict_points: volume.conflict_points,
                          turning_points: volume.turning_points,
                          hook: volume.hook,
                          volume_remaining_goals: asArray(volumeControl.volume_remaining_goals).filter((item: any) => stringifySearchText(item).includes(volume.title)),
                        }} />
                      </Space>
                    </SectionCard>
                  ))}
                  {filteredChapterOutlines.length > 0 && (
                    <SectionCard title={`章节章纲 ${filteredChapterOutlines.length}`} icon={<FileTextOutlined />}>
                      <List
                        size="small"
                        dataSource={filteredChapterOutlines.slice(0, 30)}
                        renderItem={(item: any) => (
                          <List.Item actions={[<Button key="edit" size="small" type="link" onClick={() => onEdit('outline', item)}>编辑</Button>]}>
                            <List.Item.Meta
                              title={displayPreview(item.title, 48)}
                              description={<Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>{displayValue(item.summary)}</Paragraph>}
                            />
                          </List.Item>
                        )}
                      />
                    </SectionCard>
                  )}
                </Space>
              ),
            },
            {
              key: 'continuity',
              label: '伏笔/道具/状态',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <SectionCard title={`伏笔 ${filteredForeshadowing.length}`} icon={<BulbOutlined />}>
                    {filteredForeshadowing.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无伏笔卡" />
                    ) : (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {filteredForeshadowing.slice(0, 20).map((item: any) => (
                          <Card key={item.id || item.title} size="small" styles={{ body: { padding: 8 } }}
                            title={displayPreview(item.title || item.summary, 36)}
                            extra={item.id ? <Button size="small" type="link" onClick={() => onEdit('outline', item)}>编辑</Button> : <Tag bordered={false}>状态机</Tag>}>
                            <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>
                              {displayValue(item.summary || item.hook || item)}
                            </Paragraph>
                          </Card>
                        ))}
                      </Space>
                    )}
                  </SectionCard>
                  <SectionCard title="道具 / 资源 / 位置" icon={<GoldOutlined />} extra={<Button size="small" type="link" onClick={onOpenStoryState}>校正</Button>}>
                    {objectEntries(itemState).length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无状态卡" />
                    ) : (
                      <KeyValueBlock value={itemState} />
                    )}
                  </SectionCard>
                  <SectionCard title="角色关系" icon={<TeamOutlined />} extra={<Button size="small" type="link" onClick={onOpenStoryState}>校正</Button>}>
                    {storyState.character_relationships || storyState.relationship_graph ? (
                      <KeyValueBlock value={{
                        character_relationships: storyState.character_relationships,
                        relationship_graph: storyState.relationship_graph,
                        secret_visibility: storyState.secret_visibility,
                      }} />
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无角色关系状态" />
                    )}
                  </SectionCard>
                  <SectionCard title="风险提示" icon={<BulbOutlined />}>
                    <KeyValueBlock value={{
                      unresolved_conflicts: storyState.unresolved_conflicts,
                      open_questions: storyState.open_questions,
                      recent_repeated_information: storyState.recent_repeated_information,
                      foreshadowing_recovery_plan: volumeControl.foreshadowing_recovery_plan,
                    }} />
                  </SectionCard>
                </div>
              ),
            },
            {
              key: 'scenes',
              label: `场景卡 ${sceneCards.length}`,
              children: filteredScenes.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配场景卡" />
              ) : (
                <List
                  size="small"
                  grid={{ gutter: 12, column: 2 }}
                  dataSource={filteredScenes.slice(0, 80)}
                  renderItem={(scene: any) => (
                    <List.Item>
                      <SectionCard
                        title={`第${scene.chapter?.chapter_no || '-'}章 · ${displayPreview(scene.title || scene.purpose || scene.description, 34)}`}
                        icon={<FileTextOutlined />}
                        extra={scene.chapter?.id === activeChapterId ? <Tag color="blue" bordered={false}>当前章</Tag> : <Tag bordered={false}>{wc(scene.chapter?.chapter_text)}字</Tag>}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap size={[4, 4]}>
                            <Tag color="blue" bordered={false}>场景 {scene.scene_no || scene.scene_index + 1}</Tag>
                            {scene.location && <Tag bordered={false}>{scene.location}</Tag>}
                            {scene.emotional_tone && <Tag color="purple" bordered={false}>{scene.emotional_tone}</Tag>}
                          </Space>
                          {(scene.purpose || scene.description) && <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>{displayValue(scene.purpose || scene.description)}</Paragraph>}
                          {scene.conflict && <Text type="secondary" style={{ fontSize: 12 }}>冲突：{displayValue(scene.conflict)}</Text>}
                          {scene.exit_state && <Text type="secondary" style={{ fontSize: 12 }}>出场状态：{displayValue(scene.exit_state)}</Text>}
                        </Space>
                      </SectionCard>
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
