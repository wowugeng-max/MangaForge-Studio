import React from 'react'
import { Button, Card, Col, Drawer, Empty, Input, Popconfirm, Progress, Row, Select, Space, Tag, Typography } from 'antd'
import {
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  formatProjectScope,
  formatSource,
  getIngestStatusColor,
  getSourceCacheColor,
  getSourceCacheLabel,
  inputStyle,
  knowledgeCategoryPresets,
  panelStyle,
  softPanelStyle,
  truncateText,
} from './knowledge-ui-shared'

const { Text } = Typography

export type NovelStudioKnowledgeDrawerProps = {
  categoryOptions: any
  feedFetchConcurrency: any
  feedIngestJob: any
  feedSerialFetch: any
  feedStartChapter: any
  filteredKnowledgeEntries: any
  formatKnowledgeCategory: any
  handleAnalyzeCachedJob: any
  handleCancelIngestJob: any
  handleCloseKnowledge: any
  handleDeleteKnowledge: any
  handleDeleteVisibleKnowledge: any
  handleKnowledgeProjectChange: any
  handleOpenFeed: any
  handlePauseIngestJob: any
  handleQueryKnowledge: any
  handleRefreshKnowledge: any
  handleResumeIngestJob: any
  knowledgeBulkDeleting: any
  knowledgeCategory: any
  knowledgeCategoryLabel: any
  knowledgeCountText: any
  knowledgeEmpty: any
  knowledgeLoading: any
  knowledgeOpen: any
  knowledgeProjectDraft: any
  knowledgeProjectLabel: any
  knowledgeProjectOptions: any
  knowledgeProjectTitle: any
  knowledgeQuery: any
  knowledgeQueryLoading: any
  knowledgeQueryResults: any
  knowledgeSearch: any
  knowledgeStats: any
  renderKnowledgeTag: any
  renderMetaTags: any
  setKnowledgeCategory: any
  setKnowledgeDetailEntry: any
  setKnowledgeProjectDraft: any
  setKnowledgeQuery: any
  setKnowledgeSearch: any
}

export function NovelStudioKnowledgeDrawer({
  categoryOptions,
  feedFetchConcurrency,
  feedIngestJob,
  feedSerialFetch,
  feedStartChapter,
  filteredKnowledgeEntries,
  formatKnowledgeCategory,
  handleAnalyzeCachedJob,
  handleCancelIngestJob,
  handleCloseKnowledge,
  handleDeleteKnowledge,
  handleDeleteVisibleKnowledge,
  handleKnowledgeProjectChange,
  handleOpenFeed,
  handlePauseIngestJob,
  handleQueryKnowledge,
  handleRefreshKnowledge,
  handleResumeIngestJob,
  knowledgeBulkDeleting,
  knowledgeCategory,
  knowledgeCategoryLabel,
  knowledgeCountText,
  knowledgeEmpty,
  knowledgeLoading,
  knowledgeOpen,
  knowledgeProjectDraft,
  knowledgeProjectLabel,
  knowledgeProjectOptions,
  knowledgeProjectTitle,
  knowledgeQuery,
  knowledgeQueryLoading,
  knowledgeQueryResults,
  knowledgeSearch,
  knowledgeStats,
  renderKnowledgeTag,
  renderMetaTags,
  setKnowledgeCategory,
  setKnowledgeDetailEntry,
  setKnowledgeProjectDraft,
  setKnowledgeQuery,
  setKnowledgeSearch,
}: NovelStudioKnowledgeDrawerProps) {
  return (
      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <ReadOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>写作知识库</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>沉淀拆书知识，并同步到项目记忆宫殿</Text>
          </Space>
        }
        placement="right"
        width={640}
        open={knowledgeOpen}
        onClose={handleCloseKnowledge}
        destroyOnHidden={false}
        extra={
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={handleOpenFeed}>投喂</Button>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={filteredKnowledgeEntries.length === 0}
              loading={knowledgeBulkDeleting}
              onClick={handleDeleteVisibleKnowledge}
            >
              清空当前结果
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRefreshKnowledge} loading={knowledgeLoading}>刷新</Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)' }}>
            <Row gutter={12}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>知识条目</Text>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{knowledgeStats.total}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>分类数量</Text>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#4f46e5' }}>{knowledgeStats.categories}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>当前项目</Text>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 4 }}>{knowledgeProjectLabel}</div>
              </Col>
            </Row>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{knowledgeCategoryLabel} · {knowledgeCountText}</Text>
          </Card>

          {feedIngestJob && feedSerialFetch && (
            <Card size="small" title="后台投喂任务" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text strong>{feedIngestJob.phase || '后台任务'}</Text>
                  <Space size={6}>
                    <Tag color={getIngestStatusColor(feedIngestJob.status)} bordered={false}>
                      {feedIngestJob.status || 'running'}
                    </Tag>
                    {getSourceCacheLabel(feedIngestJob.source_cache) && (
                      <Tag color={getSourceCacheColor(feedIngestJob.source_cache?.status)} bordered={false}>
                        {getSourceCacheLabel(feedIngestJob.source_cache)}
                      </Tag>
                    )}
                    {feedIngestJob.fetch_only && feedIngestJob.status === 'completed' && (
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyzeCachedJob}>
                        从缓存开始提炼
                      </Button>
                    )}
                    {['queued', 'running'].includes(feedIngestJob.status) && (
                      <Button size="small" icon={<PauseCircleOutlined />} onClick={handlePauseIngestJob}>
                        暂停
                      </Button>
                    )}
                    {['paused', 'failed', 'canceled'].includes(feedIngestJob.status) && (
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleResumeIngestJob}>
                        继续
                      </Button>
                    )}
                    {!['completed', 'canceled'].includes(feedIngestJob.status) && (
                      <Popconfirm title="确定取消当前后台提炼任务？" okText="取消任务" cancelText="返回" onConfirm={handleCancelIngestJob}>
                        <Button size="small" danger icon={<StopOutlined />}>
                          取消
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Space>
                <Progress percent={Math.max(0, Math.min(100, Number(feedIngestJob.progress || 0)))} size="small" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {feedIngestJob.full_book ? '全本模式；' : ''}
                  {feedIngestJob.fetch_only ? '仅拉取正文缓存；' : ''}
                  从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始；并发 {feedIngestJob.fetch_concurrency || feedFetchConcurrency || 1}；已抓取 {feedIngestJob.fetched_chapters || 0} 章
                  {feedIngestJob.fetch_only ? '' : `，已分析 ${feedIngestJob.analyzed_batches || 0}/${feedIngestJob.total_batches || 0} 批，候选知识 ${Array.isArray(feedIngestJob.entries) ? feedIngestJob.entries.length : 0} 条`}
                  {feedIngestJob.stored_count ? `，已入库 ${feedIngestJob.stored_count} 条` : ''}
                </Text>
                {(feedIngestJob.current_range || feedIngestJob.current_chapter) && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {feedIngestJob.status === 'completed' ? '已完成到' : '当前处理'}：
                    {feedIngestJob.current_range || `第${feedIngestJob.current_chapter}章`}
                    {feedIngestJob.current_chapter_title ? ` / ${feedIngestJob.current_chapter_title}` : ''}
                  </Text>
                )}
              </Space>
            </Card>
          )}

          <Card size="small" title="筛选与检索" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Input.Search
                value={knowledgeProjectDraft}
                onChange={(e) => {
                  const next = e.target.value
                  setKnowledgeProjectDraft(next)
                  if (!next.trim()) handleKnowledgeProjectChange('')
                }}
                onSearch={handleKnowledgeProjectChange}
                placeholder="输入投喂项目名，例如：没钱修什么仙；留空查看全局混合视图"
                enterButton="筛选"
                allowClear
                style={inputStyle}
              />
              {knowledgeProjectOptions.length > 0 ? (
                <Space wrap>
                  <Tag
                    color={!knowledgeProjectTitle ? 'purple' : 'default'}
                    bordered={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleKnowledgeProjectChange('')}
                  >
                    全部投喂项目
                  </Tag>
                  {knowledgeProjectOptions.map(option => (
                    <Tag
                      key={option.value}
                      color={knowledgeProjectTitle === option.value ? 'purple' : 'default'}
                      bordered={false}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleKnowledgeProjectChange(option.value)}
                    >
                      {option.label}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  还没有带投喂项目名的知识条目；投喂时填入项目名后会出现在这里。
                </Text>
              )}
              <Input
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="搜索标题、内容、来源、标签"
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                allowClear
                style={inputStyle}
              />
              <Space wrap>
                <Tag
                  color={!knowledgeCategory ? 'blue' : 'default'}
                  bordered={false}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setKnowledgeCategory('')}
                >
                  全部分类
                </Tag>
                {categoryOptions.map(option => (
                  <Tag
                    key={option.key}
                    color={knowledgeCategory === option.key ? 'blue' : 'default'}
                    bordered={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setKnowledgeCategory(option.key)}
                  >
                    {option.label} {option.count}
                  </Tag>
                ))}
              </Space>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={knowledgeQuery}
                  onChange={(e) => setKnowledgeQuery(e.target.value)}
                  placeholder="按语义检索知识库，例如：悬念、伏笔、开篇钩子"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  onPressEnter={handleQueryKnowledge}
                />
                <Button type="primary" loading={knowledgeQueryLoading} onClick={handleQueryKnowledge}>检索</Button>
              </Space.Compact>
            </Space>
          </Card>

          {knowledgeQuery.trim() && (
            <Card size="small" title={`语义检索结果 ${knowledgeQueryResults.length ? `(${knowledgeQueryResults.length})` : ''}`} style={{ borderRadius: 8 }}>
              {knowledgeQueryResults.length === 0 ? (
                <Text type="secondary">暂无命中结果</Text>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {knowledgeQueryResults.map((entry: any, index: number) => (
                    <Card
                      key={entry.id || `${entry.title}-${index}`}
                      size="small"
                      hoverable
                      onClick={() => setKnowledgeDetailEntry(entry)}
                      style={{ borderRadius: 8, background: '#fafcff' }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Space wrap>
                            <Text strong>{entry.title || '未命名知识'}</Text>
                            {typeof entry.score === 'number' && <Tag color="cyan" bordered={false}>相关度 {entry.score.toFixed(3)}</Tag>}
                          </Space>
                          <Button
                            size="small"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={(event) => {
                              event.stopPropagation()
                              setKnowledgeDetailEntry(entry)
                            }}
                          >
                            详情
                          </Button>
                        </Space>
                        <Space wrap>
                          <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(entry)}</Tag>
                          {formatProjectScope(entry) && <Tag color="purple" bordered={false}>{formatProjectScope(entry)}</Tag>}
                          <Tag bordered={false}>{formatSource(entry)}</Tag>
                          {renderMetaTags(entry)}
                        </Space>
                        <Text>{truncateText(entry.content || '', 220)}</Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          )}

          {knowledgeEmpty ? (
            <Card style={{ borderRadius: 8, textAlign: 'center', borderStyle: 'dashed', background: '#fafcff' }}>
              <Space direction="vertical" size={10}>
                <DatabaseOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                <Text strong>知识库还是空的</Text>
                <Text type="secondary">先投喂文本、导入 TXT/PDF，或用 URL 抓取后交给 AI 提炼。</Text>
                <Button type="primary" icon={<EditOutlined />} onClick={handleOpenFeed}>投喂第一条知识</Button>
              </Space>
            </Card>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {filteredKnowledgeEntries.map((entry: any) => (
                <Card
                  key={entry.id}
                  size="small"
                  hoverable
                  onClick={() => setKnowledgeDetailEntry(entry)}
                  title={entry.title || '未命名知识'}
                  extra={
                    <Space size={4} onClick={(event) => event.stopPropagation()}>
                      <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setKnowledgeDetailEntry(entry)}>
                        详情
                      </Button>
                      <Popconfirm
                        title="删除知识条目"
                        description="确定删除这条知识吗？"
                        okText="删除"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteKnowledge(entry.id)}
                      >
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                  style={{ borderRadius: 8 }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(entry)}</Tag>
                      {formatProjectScope(entry) && <Tag color="purple" bordered={false}>{formatProjectScope(entry)}</Tag>}
                      <Tag bordered={false}>{formatSource(entry)}</Tag>
                      {renderMetaTags(entry)}
                    </Space>
                    <Text>{truncateText(entry.content || '')}</Text>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                      <Space wrap>
                        {entry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                      </Space>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Space>
      </Drawer>

  )
}
