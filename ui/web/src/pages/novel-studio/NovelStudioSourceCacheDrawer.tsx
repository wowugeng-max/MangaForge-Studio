import React from 'react'
import { Button, Card, Col, Drawer, Empty, Input, Row, Space, Tag, Typography } from 'antd'
import {
  FileTextOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons'
import {
  inputStyle,
  panelStyle,
  softPanelStyle,
} from './knowledge-ui-shared'

const { Text } = Typography

export type NovelStudioSourceCacheDrawerProps = {
  filteredSourceCaches: any
  handleCloseSourceCache: any
  loadSourceCacheChapter: any
  loadSourceCacheDetail: any
  loadSourceCaches: any
  selectedSourceCacheKey: any
  setSourceCacheSearch: any
  sourceCacheChapter: any
  sourceCacheChapterLoading: any
  sourceCacheDetail: any
  sourceCacheLoading: any
  sourceCacheOpen: any
  sourceCacheSearch: any
}

export function NovelStudioSourceCacheDrawer({
  filteredSourceCaches,
  handleCloseSourceCache,
  loadSourceCacheChapter,
  loadSourceCacheDetail,
  loadSourceCaches,
  selectedSourceCacheKey,
  setSourceCacheSearch,
  sourceCacheChapter,
  sourceCacheChapterLoading,
  sourceCacheDetail,
  sourceCacheLoading,
  sourceCacheOpen,
  sourceCacheSearch,
}: NovelStudioSourceCacheDrawerProps) {
  return (
      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>正文缓存总览</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>查看已抓取原文，用来和知识提炼结果互相印证</Text>
          </Space>
        }
        placement="right"
        width={1120}
        open={sourceCacheOpen}
        onClose={handleCloseSourceCache}
        destroyOnHidden={false}
        extra={
          <Button size="small" icon={<ReloadOutlined />} loading={sourceCacheLoading} onClick={() => loadSourceCaches(true)}>
            刷新
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 16, height: 'calc(100vh - 120px)' }}>
          <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(160px, 1fr) minmax(220px, 1.3fr)', gap: 12 }}>
            <Input
              value={sourceCacheSearch}
              onChange={(event) => setSourceCacheSearch(event.target.value)}
              placeholder="搜索项目名、来源、缓存键"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
            />

            <Card
              size="small"
              title={`缓存项目 ${filteredSourceCaches.length}`}
              style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
              bodyStyle={{ padding: 8, height: 'calc(100% - 38px)', overflowY: 'auto' }}
            >
              {filteredSourceCaches.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  {sourceCacheLoading ? '正在加载正文缓存...' : '还没有正文缓存'}
                </div>
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {filteredSourceCaches.map(cache => {
                    const active = cache.cache_key === selectedSourceCacheKey
                    return (
                      <div
                        key={cache.cache_key}
                        onClick={() => loadSourceCacheDetail(cache.cache_key)}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${active ? '#93c5fd' : '#e5e7eb'}`,
                          background: active ? '#eff6ff' : '#fff',
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                            <Text strong style={{ color: '#0f172a' }}>{cache.project_title || '未命名缓存'}</Text>
                            <Tag color={cache.complete ? 'green' : 'gold'} bordered={false}>
                              {cache.complete ? '完整' : '未完'}
                            </Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {cache.chapter_count || 0} 章 · 第 {cache.first_chapter || '-'}-{cache.last_chapter || '-'} 章 · {Math.round(Number(cache.total_chars || 0) / 1000)}k 字
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {truncateText(cache.source_url || cache.canonical_source_url || cache.cache_key, 54)}
                          </Text>
                        </Space>
                      </div>
                    )
                  })}
                </Space>
              )}
            </Card>

            <Card
              size="small"
              title={`章节目录 ${sourceCacheDetail?.chapter_count ? `(${sourceCacheDetail.chapter_count})` : ''}`}
              style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
              bodyStyle={{ padding: 8, height: 'calc(100% - 38px)', overflowY: 'auto' }}
            >
              {!sourceCacheDetail ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>选择一个缓存项目查看章节</div>
              ) : (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {(sourceCacheDetail.chapters || []).map((chapter: any) => {
                    const active = Number(sourceCacheChapter?.chapter || 0) === Number(chapter.chapter)
                    return (
                      <div
                        key={chapter.chapter}
                        onClick={() => loadSourceCacheChapter(sourceCacheDetail.cache_key, Number(chapter.chapter))}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${active ? '#bfdbfe' : '#e5e7eb'}`,
                          background: active ? '#eff6ff' : '#fff',
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}
                      >
                        <Text strong={active} style={{ display: 'block', fontSize: 13 }}>
                          第{chapter.chapter}章
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          {truncateText(chapter.title || '', 28)}
                        </Text>
                      </div>
                    )
                  })}
                </Space>
              )}
            </Card>
          </div>

          <Card
            style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
            bodyStyle={{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            {sourceCacheChapter ? (
              <>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', background: '#fafcff' }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <Title level={4} style={{ margin: 0 }}>{sourceCacheChapter.title || `第${sourceCacheChapter.chapter}章`}</Title>
                        <Text type="secondary">《{sourceCacheChapter.project_title || sourceCacheDetail?.project_title || '未命名缓存'}》第 {sourceCacheChapter.chapter} 章</Text>
                      </div>
                      <Space wrap>
                        <Tag bordered={false}>{Number(sourceCacheChapter.length || 0).toLocaleString()} 字</Tag>
                        {sourceCacheDetail?.complete !== undefined && (
                          <Tag color={sourceCacheDetail.complete ? 'green' : 'gold'} bordered={false}>
                            {sourceCacheDetail.complete ? '完整缓存' : '未完缓存'}
                          </Tag>
                        )}
                      </Space>
                    </Space>
                    {(sourceCacheChapter.url || sourceCacheDetail?.source_url) && (
                      <Paragraph copyable={{ text: sourceCacheChapter.url || sourceCacheDetail?.source_url }} style={{ margin: 0, fontSize: 12 }}>
                        <Text type="secondary">{sourceCacheChapter.url || sourceCacheDetail?.source_url}</Text>
                      </Paragraph>
                    )}
                  </Space>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 34px', background: '#ffffff' }}>
                  {sourceCacheChapterLoading ? (
                    <Text type="secondary">正在读取正文...</Text>
                  ) : (
                    <div
                      style={{
                        maxWidth: 760,
                        margin: '0 auto',
                        whiteSpace: 'pre-wrap',
                        fontSize: 16,
                        lineHeight: 1.82,
                        color: '#1f2937',
                      }}
                    >
                      {sourceCacheChapter.text || '该章节没有正文内容'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
                {sourceCacheLoading ? '正在加载正文缓存...' : '选择左侧项目和章节查看正文'}
              </div>
            )}
          </Card>
        </div>
      </Drawer>

  )
}
