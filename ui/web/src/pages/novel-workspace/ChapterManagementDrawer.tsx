import React from 'react'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InteractionOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { chapterStatusTag, displayValue, wc } from './utils'

const { Text, Title, Paragraph } = Typography

export type ChapterStatusFilter = 'all' | 'written' | 'unwritten' | 'placeholder'
export type ChapterSortMode = 'chapter_no_asc' | 'chapter_no_desc' | 'word_count_desc' | 'title_asc'

export function ChapterManagementDrawer({
  open,
  chapters,
  proseChapters,
  filteredChapters,
  activeChapter,
  activeChapterId,
  selectedChapterIds,
  selectMode,
  chapterSearch,
  chapterStatusFilter,
  chapterSortMode,
  generatingProse,
  onClose,
  onCreateChapter,
  onEditChapter,
  onDeleteChapter,
  onBatchDelete,
  onGenerateCurrentChapterProse,
  onOpenRestructure,
  onOpenVersionHistory,
  onSelectChapter,
  onSetSelectMode,
  onSetSelectedChapterIds,
  onSetChapterSearch,
  onSetChapterStatusFilter,
  onSetChapterSortMode,
}: {
  open: boolean
  chapters: any[]
  proseChapters: any[]
  filteredChapters: any[]
  activeChapter: any | null
  activeChapterId: number | null
  selectedChapterIds: Set<number>
  selectMode: boolean
  chapterSearch: string
  chapterStatusFilter: ChapterStatusFilter
  chapterSortMode: ChapterSortMode
  generatingProse: boolean
  onClose: () => void
  onCreateChapter: () => void
  onEditChapter: (chapter?: any) => void
  onDeleteChapter: (chapterId: number) => void
  onBatchDelete: (chapterIds: number[]) => Promise<void>
  onGenerateCurrentChapterProse: () => void
  onOpenRestructure: () => void
  onOpenVersionHistory: () => void
  onSelectChapter: (chapterId: number) => void
  onSetSelectMode: (value: boolean) => void
  onSetSelectedChapterIds: React.Dispatch<React.SetStateAction<Set<number>>>
  onSetChapterSearch: (value: string) => void
  onSetChapterStatusFilter: (value: ChapterStatusFilter) => void
  onSetChapterSortMode: (value: ChapterSortMode) => void
}) {
  const toggleChapterSelected = (chapterId: number) => {
    onSetSelectedChapterIds(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  const clearFilters = () => {
    onSetChapterSearch('')
    onSetChapterStatusFilter('all')
    onSetChapterSortMode('chapter_no_asc')
  }

  return (
    <Drawer
      title={<Space><BookOutlined /> 章节管理工作台</Space>}
      placement="left"
      width="92vw"
      styles={{ body: { padding: 0, background: '#f5f7fa' } }}
      open={open}
      onClose={onClose}
      extra={
        <Space size={12}>
          <Tooltip title={selectMode ? '退出多选' : '进入多选模式'}>
            <Switch
              size="small"
              checkedChildren="多选"
              unCheckedChildren="单选"
              checked={selectMode}
              onChange={(v) => {
                onSetSelectMode(v)
                if (!v) onSetSelectedChapterIds(new Set())
              }}
            />
          </Tooltip>
          <Button onClick={() => { onCreateChapter(); onClose() }}>
            <EditOutlined /> 新增章节
          </Button>
          <Button type="primary" disabled={selectedChapterIds.size < 2} onClick={onOpenRestructure}>
            <InteractionOutlined /> 扩展/合并章节
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        <div style={{ width: 420, flexShrink: 0, borderRight: '1px solid #eaeaea', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Tag color="blue">章 {chapters.length}</Tag>
                <Tag color="green">已写 {proseChapters.length}</Tag>
                <Tag color="orange">未写 {chapters.length - proseChapters.length}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  总计 {chapters.reduce((sum, ch) => sum + wc(ch.chapter_text), 0).toLocaleString()} 字
                </Text>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <Input allowClear value={chapterSearch} placeholder="搜索标题/摘要/章节号" onChange={(e) => onSetChapterSearch(e.target.value)} />
                <Select
                  value={chapterStatusFilter}
                  onChange={onSetChapterStatusFilter}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'written', label: '已写' },
                    { value: 'unwritten', label: '未写' },
                    { value: 'placeholder', label: '占位' },
                  ]}
                />
                <Select
                  value={chapterSortMode}
                  onChange={onSetChapterSortMode}
                  options={[
                    { value: 'chapter_no_asc', label: '章号正序' },
                    { value: 'chapter_no_desc', label: '章号倒序' },
                    { value: 'word_count_desc', label: '字数优先' },
                    { value: 'title_asc', label: '标题排序' },
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  命中 {filteredChapters.length} / {chapters.length}
                </Text>
              </div>

              {selectMode && (
                <div style={{ padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 10 }}>
                  <Text strong style={{ fontSize: 13 }}>已选 {selectedChapterIds.size} 章</Text>
                  <div style={{ flex: 1 }} />
                  {selectedChapterIds.size > 0 && (
                    <Popconfirm
                      title="批量删除"
                      description={`确定删除选中的 ${selectedChapterIds.size} 章？`}
                      onConfirm={() => onBatchDelete(Array.from(selectedChapterIds))}
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger>批量删除</Button>
                    </Popconfirm>
                  )}
                </div>
              )}
            </Space>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {filteredChapters.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <Title level={5}>{chapters.length === 0 ? '暂无章节' : '未找到匹配章节'}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  {chapters.length === 0 ? '创建第一章开始你的创作之旅' : '请调整搜索词、状态筛选或排序条件后重试'}
                </Text>
                {chapters.length === 0 ? (
                  <Button type="primary" onClick={() => { onCreateChapter(); onClose() }}>创建第一章</Button>
                ) : (
                  <Button onClick={clearFilters}>清空筛选条件</Button>
                )}
              </div>
            ) : (
              filteredChapters.map(ch => {
                const isSelected = selectedChapterIds.has(ch.id)
                const isActive = ch.id === activeChapterId
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      if (selectMode) toggleChapterSelected(ch.id)
                      else onSelectChapter(ch.id)
                    }}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #fa8c16' : isActive ? '2px solid #1677ff' : '1px solid #f0f0f0',
                      background: isActive ? '#e6f4ff' : isSelected ? '#fff7e6' : '#fff',
                      transition: 'all .15s',
                      marginBottom: 10,
                      boxShadow: isActive ? '0 4px 14px rgba(22,119,255,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {selectMode && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 4 }}>
                          <Switch size="small" checked={isSelected} onChange={() => toggleChapterSelected(ch.id)} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: 15 }}>第{ch.chapter_no}章</Text>
                          {chapterStatusTag(ch)}
                          {isActive && <Tag color="blue" style={{ fontSize: 10 }}>当前编辑</Tag>}
                        </div>
                        <Text style={{ fontSize: 14, color: '#262626', display: 'block', marginBottom: 6, lineHeight: 1.5 }}>
                          {displayValue(ch.title) || '无标题'}
                        </Text>
                        {ch.chapter_summary && (
                          <Text type="secondary" style={{ fontSize: 12, display: '-webkit-box', marginBottom: 8, lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>
                            {displayValue(ch.chapter_summary)}
                          </Text>
                        )}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{wc(ch.chapter_text)} 字</Text>
                          {displayValue(ch.status) && <Tag color="default" style={{ fontSize: 10, padding: '0 4px' }}>{displayValue(ch.status)}</Tag>}
                        </div>
                      </div>

                      <Space size={4}>
                        <Tooltip title="编辑元数据">
                          <Button type="text" size="small" onClick={e => { e.stopPropagation(); onEditChapter(ch) }}>
                            <EditOutlined />
                          </Button>
                        </Tooltip>
                        <Popconfirm
                          title="删除此章？"
                          description={`确定删除第${ch.chapter_no}章《${displayValue(ch.title)}》吗？`}
                          onConfirm={() => onDeleteChapter(ch.id)}
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="删除">
                            <Button type="text" size="small" danger onClick={e => e.stopPropagation()}>
                              <DeleteOutlined />
                            </Button>
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#f7f8fa' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeaea', background: '#fff' }}>
            {activeChapter ? (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Title level={4} style={{ margin: 0 }}>第{activeChapter.chapter_no}章《{displayValue(activeChapter.title) || '无标题'}》</Title>
                  {chapterStatusTag(activeChapter)}
                  <Tag color="blue">{wc(activeChapter.chapter_text)} 字</Tag>
                </div>
                <Text type="secondary">在这里预览章节信息与正文片段；需要深入编辑时，可直接切回主工作区正文编辑。</Text>
              </Space>
            ) : (
              <Title level={4} style={{ margin: 0 }}>章节详情预览</Title>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {activeChapter ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card size="small" title="章节信息" styles={{ body: { padding: 18 } }}>
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="章节标题">{displayValue(activeChapter.title) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="章节序号">第 {activeChapter.chapter_no} 章</Descriptions.Item>
                    <Descriptions.Item label="章节目标">{displayValue(activeChapter.chapter_goal) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="章节摘要">{displayValue(activeChapter.chapter_summary) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="冲突">{displayValue(activeChapter.conflict) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="结尾钩子">{displayValue(activeChapter.ending_hook) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">{displayValue(activeChapter.status) || '-'}</Descriptions.Item>
                    <Descriptions.Item label="正文长度">{wc(activeChapter.chapter_text)} 字</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  size="small"
                  title="正文预览"
                  extra={
                    <Space>
                      <Button size="small" onClick={onClose}>返回主编辑区</Button>
                      <Button size="small" type="primary" loading={generatingProse} onClick={onGenerateCurrentChapterProse}>
                        <PlayCircleOutlined /> 生成正文
                      </Button>
                    </Space>
                  }
                  styles={{ body: { padding: 18 } }}
                >
                  {activeChapter.chapter_text ? (
                    <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, marginBottom: 0, fontSize: 14 }}>
                      {String(activeChapter.chapter_text).slice(0, 6000)}
                      {String(activeChapter.chapter_text).length > 6000 ? '\n\n……（预览已截断，请回到主编辑区查看全文）' : ''}
                    </Paragraph>
                  ) : (
                    <Text type="secondary">当前章节还没有正文内容，可直接在这里触发生成。</Text>
                  )}
                </Card>

                <Card size="small" title="快捷操作" styles={{ body: { padding: 18 } }}>
                  <Space wrap>
                    <Button type="primary" onClick={onClose}>打开正文编辑</Button>
                    <Button onClick={() => onEditChapter(activeChapter)}>
                      <EditOutlined /> 编辑章节元数据
                    </Button>
                    <Button onClick={onOpenVersionHistory}>
                      <HistoryOutlined /> 查看版本历史
                    </Button>
                  </Space>
                </Card>
              </Space>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                <Space direction="vertical" align="center" size={16}>
                  <BookOutlined style={{ fontSize: 42, color: '#d9d9d9' }} />
                  <Text type="secondary">请选择左侧章节以查看详情预览。</Text>
                </Space>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
