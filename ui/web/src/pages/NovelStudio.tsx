import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Checkbox, Col, Drawer, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Row, Select, Space, Tag, Typography, message } from 'antd'
import { BookOutlined, CloudUploadOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined, FolderOutlined, LinkOutlined, PauseCircleOutlined, PlayCircleOutlined, PlusOutlined, ReadOutlined, ReloadOutlined, SearchOutlined, StopOutlined, TagsOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import MemoryPalacePanel from '../components/MemoryPalacePanel'
import NovelCreateWizard from '../components/NovelCreateWizard'
import NovelLobbyDashboard from './novel-lobby/NovelLobbyDashboard'
import { buildNovelLobbyModel } from './novel-lobby/novelLobbyModel'
import './NovelStudio.css'

const { Title, Text, Paragraph } = Typography

import {
  fieldLabelStyle,
  formatKnowledgeCategory as formatKnowledgeCategoryShared,
  formatProjectScope,
  formatSource,
  getBatchStatusColor,
  getIngestStatusColor,
  getSourceCacheColor,
  getSourceCacheLabel,
  inputStyle,
  knowledgeCategoryPresets,
  knowledgeExtractModelStorageKey,
  knowledgeIngestJobStorageKey,
  panelStyle,
  softPanelStyle,
  truncateText,
} from './novel-studio/knowledge-ui-shared'
import { NovelStudioFeedModal } from './novel-studio/NovelStudioFeedModal'
import { useNovelStudioController } from './novel-studio/useNovelStudioController'

export default function NovelStudio() {
  const {
navigate,
    searchParams,
    setSearchParams,
    projects,
    setProjects,
    loading,
    setLoading,
    wizardOpen,
    setWizardOpen,
    searchText,
    setSearchText,
    knowledgeOpen,
    setKnowledgeOpen,
    knowledgeLoading,
    setKnowledgeLoading,
    knowledgeBulkDeleting,
    setKnowledgeBulkDeleting,
    knowledgeEntries,
    setKnowledgeEntries,
    knowledgeSummary,
    setKnowledgeSummary,
    knowledgeSearch,
    setKnowledgeSearch,
    knowledgeCategory,
    setKnowledgeCategory,
    knowledgeProjectTitle,
    setKnowledgeProjectTitle,
    knowledgeProjectDraft,
    setKnowledgeProjectDraft,
    knowledgeProjectOptions,
    setKnowledgeProjectOptions,
    knowledgeLoadedOnce,
    setKnowledgeLoadedOnce,
    knowledgeQuery,
    setKnowledgeQuery,
    knowledgeQueryLoading,
    setKnowledgeQueryLoading,
    knowledgeQueryResults,
    setKnowledgeQueryResults,
    knowledgeDetailEntry,
    setKnowledgeDetailEntry,
    memoryPalaceOpen,
    setMemoryPalaceOpen,
    sourceCacheOpen,
    setSourceCacheOpen,
    sourceCacheLoading,
    setSourceCacheLoading,
    sourceCaches,
    setSourceCaches,
    sourceCacheSearch,
    setSourceCacheSearch,
    selectedSourceCacheKey,
    setSelectedSourceCacheKey,
    sourceCacheDetail,
    setSourceCacheDetail,
    sourceCacheChapter,
    setSourceCacheChapter,
    sourceCacheChapterLoading,
    setSourceCacheChapterLoading,
    feedOpen,
    setFeedOpen,
    feedText,
    setFeedText,
    feedSource,
    setFeedSource,
    feedSubmitting,
    setFeedSubmitting,
    feedCategory,
    setFeedCategory,
    feedTitle,
    setFeedTitle,
    feedTags,
    setFeedTags,
    feedMode,
    setFeedMode,
    feedUrl,
    setFeedUrl,
    feedSerialFetch,
    setFeedSerialFetch,
    feedStartChapter,
    setFeedStartChapter,
    feedFullBook,
    setFeedFullBook,
    feedFetchOnly,
    setFeedFetchOnly,
    feedMaxChapters,
    setFeedMaxChapters,
    feedBatchSize,
    setFeedBatchSize,
    feedFetchConcurrency,
    setFeedFetchConcurrency,
    availableModels,
    setAvailableModels,
    feedModelsLoading,
    setFeedModelsLoading,
    feedModelId,
    setFeedModelId,
    feedIngestJob,
    setFeedIngestJob,
    feedAnalyzeLoading,
    setFeedAnalyzeLoading,
    feedAnalyzePreviewOpen,
    setFeedAnalyzePreviewOpen,
    feedAnalyzeSource,
    setFeedAnalyzeSource,
    feedAnalyzedEntries,
    setFeedAnalyzedEntries,
    feedAnalyzeSaving,
    setFeedAnalyzeSaving,
    feedReanalyzingBatch,
    setFeedReanalyzingBatch,
    feedProjectId,
    setFeedProjectId,
    feedProjectTitle,
    setFeedProjectTitle,
    fileReading,
    setFileReading,
    selectedFileName,
    setSelectedFileName,
    fileInputRef,
    feedAbortControllerRef,
    loadKnowledge,
    handleDeleteKnowledge,
    handleDeleteVisibleKnowledge,
    handleRefreshKnowledge,
    handleQueryKnowledge,
    filteredKnowledgeEntries,
    categoryOptions,
    knowledgeStats,
    knowledgeCategoryLabel,
    knowledgeProjectLabel,
    knowledgeCountText,
    filteredSourceCaches,
    extractionModelOptions,
    knowledgePanelFromUrl,
    memoryPalacePanelFromUrl,
    sourceCachePanelFromUrl,
    knowledgeActionFromUrl,
    knowledgeProjectFromUrl,
    sourceCacheProjectFromUrl,
    loadAvailableModels,
    updateKnowledgeRoute,
    renderKnowledgeTag,
    renderMetaTags,
    formatKnowledgeCategory,
    knowledgeEmpty,
    resetFeedForm,
    handleOpenKnowledge,
    handleCloseKnowledge,
    handleOpenMemoryPalace,
    handleCloseMemoryPalace,
    loadSourceCacheChapter,
    loadSourceCacheDetail,
    loadSourceCaches,
    handleOpenSourceCache,
    handleCloseSourceCache,
    handleOpenFeed,
    handleCloseFeed,
    handleFeedModelChange,
    handleKnowledgeProjectChange,
    buildTags,
    buildKnowledgePayload,
    handleSubmitFeed,
    openAnalyzePreview,
    handlePauseIngestJob,
    handleResumeIngestJob,
    handleCancelIngestJob,
    handleAnalyzeCachedJob,
    handleReanalyzeBatch,
    waitForIngestJob,
    monitorAutoIngestJob,
    handleAnalyzeFromUrl,
    handleFileUpload,
    handleSaveAnalyzedEntries,
    loadProjects,
    handleWizardSuccess,
    handleWizardCancel,
    handleDeleteProject,
    filteredProjects,
    stats,
    lobbyModel,
    projectCardById,
    getReferenceProjects
  } = useNovelStudioController()

  return (
    <div className="novel-studio-page" style={{ minHeight: '100vh', padding: 24, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <Card bordered={false} className="novel-studio-page__shell" bodyStyle={{ padding: 0 }}>
        <div style={{ padding: 28, borderBottom: '1px solid rgba(148,163,184,0.16)', background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))' }}>
          <Row justify="space-between" align="middle" gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Space align="center" size={10}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #60a5fa, #7c3aed)', color: '#fff', boxShadow: '0 12px 24px rgba(99,102,241,0.24)' }}>📚</div>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>小说创作大厅</Title>
                    <Text type="secondary">优先继续写作和处理治理提醒，项目列表用于管理所有作品。</Text>
                  </div>
                </Space>
                <Space wrap>
                  <Tag color="blue" bordered={false}>项目总数 {stats.total}</Tag>
                  <Tag color="gold" bordered={false}>草稿 {stats.draft}</Tag>
                  <Tag color="green" bordered={false}>进行中 {stats.active}</Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button className="novel-studio-page__toolbar-btn" icon={<ReadOutlined />} onClick={handleOpenKnowledge}>知识库</Button>
                <Button className="novel-studio-page__toolbar-btn" icon={<FileTextOutlined />} onClick={handleOpenSourceCache}>正文缓存</Button>
                <Button className="novel-studio-page__toolbar-btn" icon={<DatabaseOutlined />} onClick={handleOpenMemoryPalace}>记忆宫殿</Button>
                <Button className="novel-studio-page__toolbar-btn" icon={<ReloadOutlined />} onClick={loadProjects} loading={loading}>刷新</Button>
                <Button className="novel-studio-page__primary-cta" type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)}>新建商业长篇</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 24 }}>
          <NovelLobbyDashboard
            projects={projects}
            onOpenProject={(projectId) => navigate(`/novel/workspace/${projectId}`)}
            onCreateProject={() => setWizardOpen(true)}
          />

          <Card size="small" title="项目检索" className="novel-studio-page__search-card">
            <Input prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索项目标题、题材、状态、目标读者" allowClear />
          </Card>

          {projects.length > 0 && filteredProjects.length === 0 ? (
            <Card className="novel-studio-page__project-card" style={{ textAlign: 'center', padding: 40 }}>
              <Title level={5}>未找到匹配项目</Title>
              <Text type="secondary">调整搜索条件后重试。</Text>
            </Card>
          ) : filteredProjects.length > 0 ? (
            <Row gutter={16}>
              {filteredProjects.map(project => (
                <Col xs={24} md={12} xl={8} key={project.id} style={{ marginBottom: 16 }}>
                  <Card
                    hoverable
                    className="novel-studio-page__project-card"
                    bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    onClick={() => navigate(`/novel/workspace/${project.id}`)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Title level={5} style={{ margin: 0 }}>{project.title}</Title>
                        <Tag color={project.status === 'draft' ? 'gold' : 'green'} bordered={false}>{project.status || 'draft'}</Tag>
                      </Space>
                      <Space wrap size={[4, 4]}>
                        <Text type="secondary">{project.genre || '未设置题材'}</Text>
                        {projectCardById.get(project.id)?.riskTags.slice(0, 3).map(tag => (
                          <Tag key={tag} color={tag === '规划可继续' ? 'green' : 'gold'} bordered={false}>{tag}</Tag>
                        ))}
                      </Space>
                    </Space>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                      <div>篇幅目标：{project.length_target || '-'}</div>
                      <div>目标读者：{project.target_audience || '-'}</div>
                      <div>风格标签：{Array.isArray(project.style_tags) ? project.style_tags.join(' / ') : '-'}</div>
                    </div>
                    {getReferenceProjects(project).length > 0 && (
                      <Space wrap size={4}>
                        <Tag color="purple" bordered={false}>参考 {getReferenceProjects(project).length}</Tag>
                        {getReferenceProjects(project).slice(0, 2).map(title => (
                          <Tag key={title} bordered={false}>{title}</Tag>
                        ))}
                        {getReferenceProjects(project).length > 2 && (
                          <Tag bordered={false}>+{getReferenceProjects(project).length - 2}</Tag>
                        )}
                      </Space>
                    )}
                    {project.synopsis && (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                        "{project.synopsis}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{projectCardById.get(project.id)?.nextAction || '点击进入工作台'}</Text>
                      <Space>
                        <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/novel/workspace/${project.id}`) }}>进入</Button>
                        <Popconfirm
                          title="删除项目"
                          description={`确定删除《${project.title}》吗？此操作不可撤销。`}
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          onConfirm={(e) => { e?.stopPropagation(); handleDeleteProject(project.id) }}
                        >
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>删除</Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : null}
        </div>
      </Card>

      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>全局记忆宫殿</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>跨项目查看、进入和清理记忆数据</Text>
          </Space>
        }
        placement="right"
        width={640}
        open={memoryPalaceOpen}
        onClose={handleCloseMemoryPalace}
        destroyOnHidden={false}
      >
        <MemoryPalacePanel
          onOpenProject={(projectId) => {
            setMemoryPalaceOpen(false)
            updateKnowledgeRoute({ panel: null, action: null })
            navigate(`/novel/workspace/${projectId}`)
          }}
        />
      </Drawer>

      <NovelStudioSourceCacheDrawer
        filteredSourceCaches={filteredSourceCaches}
        handleCloseSourceCache={handleCloseSourceCache}
        loadSourceCacheChapter={loadSourceCacheChapter}
        loadSourceCacheDetail={loadSourceCacheDetail}
        loadSourceCaches={loadSourceCaches}
        selectedSourceCacheKey={selectedSourceCacheKey}
        setSourceCacheSearch={setSourceCacheSearch}
        sourceCacheChapter={sourceCacheChapter}
        sourceCacheChapterLoading={sourceCacheChapterLoading}
        sourceCacheDetail={sourceCacheDetail}
        sourceCacheLoading={sourceCacheLoading}
        sourceCacheOpen={sourceCacheOpen}
        sourceCacheSearch={sourceCacheSearch}
      />

      <NovelStudioKnowledgeDrawer
        feedFetchConcurrency={feedFetchConcurrency}
        feedIngestJob={feedIngestJob}
        feedSerialFetch={feedSerialFetch}
        feedStartChapter={feedStartChapter}
        filteredKnowledgeEntries={filteredKnowledgeEntries}
        formatKnowledgeCategory={formatKnowledgeCategory}
        handleAnalyzeCachedJob={handleAnalyzeCachedJob}
        handleCancelIngestJob={handleCancelIngestJob}
        handleCloseKnowledge={handleCloseKnowledge}
        handleDeleteKnowledge={handleDeleteKnowledge}
        handleDeleteVisibleKnowledge={handleDeleteVisibleKnowledge}
        handleKnowledgeProjectChange={handleKnowledgeProjectChange}
        handleOpenFeed={handleOpenFeed}
        handlePauseIngestJob={handlePauseIngestJob}
        handleQueryKnowledge={handleQueryKnowledge}
        handleRefreshKnowledge={handleRefreshKnowledge}
        handleResumeIngestJob={handleResumeIngestJob}
        knowledgeBulkDeleting={knowledgeBulkDeleting}
        knowledgeCategory={knowledgeCategory}
        knowledgeCategoryLabel={knowledgeCategoryLabel}
        knowledgeCountText={knowledgeCountText}
        knowledgeEmpty={knowledgeEmpty}
        knowledgeLoading={knowledgeLoading}
        knowledgeOpen={knowledgeOpen}
        knowledgeProjectDraft={knowledgeProjectDraft}
        knowledgeProjectLabel={knowledgeProjectLabel}
        knowledgeProjectOptions={knowledgeProjectOptions}
        knowledgeProjectTitle={knowledgeProjectTitle}
        knowledgeQuery={knowledgeQuery}
        knowledgeQueryLoading={knowledgeQueryLoading}
        knowledgeQueryResults={knowledgeQueryResults}
        knowledgeSearch={knowledgeSearch}
        knowledgeStats={knowledgeStats}
        renderKnowledgeTag={renderKnowledgeTag}
        renderMetaTags={renderMetaTags}
        setKnowledgeCategory={setKnowledgeCategory}
        setKnowledgeDetailEntry={setKnowledgeDetailEntry}
        setKnowledgeProjectDraft={setKnowledgeProjectDraft}
        setKnowledgeQuery={setKnowledgeQuery}
        setKnowledgeSearch={setKnowledgeSearch}
      />

      <Modal
        title={
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 18 }}>{knowledgeDetailEntry?.title || '未命名知识'}</Text>
            {knowledgeDetailEntry && (
              <Space wrap>
                <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(knowledgeDetailEntry)}</Tag>
                <Tag bordered={false}>权重 {Number(knowledgeDetailEntry.weight || 3)}</Tag>
                {typeof knowledgeDetailEntry.score === 'number' && (
                  <Tag color="cyan" bordered={false}>相关度 {knowledgeDetailEntry.score.toFixed(3)}</Tag>
                )}
              </Space>
            )}
          </Space>
        }
        open={Boolean(knowledgeDetailEntry)}
        width={760}
        onCancel={() => setKnowledgeDetailEntry(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setKnowledgeDetailEntry(null)}>
            关闭
          </Button>,
        ]}
        destroyOnHidden={false}
      >
        {knowledgeDetailEntry && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Card size="small" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">来源</Text>
                  <Paragraph copyable style={{ margin: '4px 0 0' }}>{formatSource(knowledgeDetailEntry)}</Paragraph>
                </div>
                {knowledgeDetailEntry.created_at && (
                  <div>
                    <Text type="secondary">创建时间</Text>
                    <div style={{ marginTop: 4 }}>{knowledgeDetailEntry.created_at}</div>
                  </div>
                )}
                {(knowledgeDetailEntry.use_case || knowledgeDetailEntry.chapter_range || knowledgeDetailEntry.confidence) && (
                  <Space wrap>
                    {renderMetaTags(knowledgeDetailEntry)}
                  </Space>
                )}
              </Space>
            </Card>

            {(knowledgeDetailEntry.evidence || Array.isArray(knowledgeDetailEntry.entities) && knowledgeDetailEntry.entities.length > 0) && (
              <Card size="small" title="证据与实体" style={{ borderRadius: 8 }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {knowledgeDetailEntry.evidence && (
                    <div>
                      <Text type="secondary">证据</Text>
                      <Paragraph copyable style={{ margin: '4px 0 0' }}>{knowledgeDetailEntry.evidence}</Paragraph>
                    </div>
                  )}
                  {Array.isArray(knowledgeDetailEntry.entities) && knowledgeDetailEntry.entities.length > 0 && (
                    <div>
                      <Text type="secondary">实体</Text>
                      <Space wrap style={{ display: 'flex', marginTop: 6 }}>
                        {knowledgeDetailEntry.entities.map((entity: string, idx: number) => (
                          <Tag key={`${entity}-${idx}`} bordered={false}>{entity}</Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </Space>
              </Card>
            )}

            <div>
              <Text strong>完整内容</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  maxHeight: 420,
                  overflow: 'auto',
                }}
              >
                <Paragraph
                  copyable
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.85,
                    fontSize: 15,
                  }}
                >
                  {knowledgeDetailEntry.content || '暂无内容'}
                </Paragraph>
              </div>
            </div>

            {Array.isArray(knowledgeDetailEntry.tags) && knowledgeDetailEntry.tags.length > 0 && (
              <div>
                <Text strong>标签</Text>
                <Space wrap style={{ display: 'flex', marginTop: 8 }}>
                  {knowledgeDetailEntry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                </Space>
              </div>
            )}

            {(Array.isArray(knowledgeDetailEntry.genre_tags) && knowledgeDetailEntry.genre_tags.length > 0
              || Array.isArray(knowledgeDetailEntry.trope_tags) && knowledgeDetailEntry.trope_tags.length > 0) && (
              <div>
                <Text strong>题材与套路</Text>
                <Space wrap style={{ display: 'flex', marginTop: 8 }}>
                  {Array.isArray(knowledgeDetailEntry.genre_tags) && knowledgeDetailEntry.genre_tags.map((tag: string, idx: number) => (
                    <Tag key={`genre-detail-${tag}-${idx}`} color="cyan" bordered={false}>{tag}</Tag>
                  ))}
                  {Array.isArray(knowledgeDetailEntry.trope_tags) && knowledgeDetailEntry.trope_tags.map((tag: string, idx: number) => (
                    <Tag key={`trope-detail-${tag}-${idx}`} color="volcano" bordered={false}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </Space>
        )}
      </Modal>

      <NovelStudioFeedModal
        feedOpen={feedOpen}
        handleCloseFeed={handleCloseFeed}
        feedMode={feedMode}
        handleAnalyzeFromUrl={handleAnalyzeFromUrl}
        fileInputRef={fileInputRef}
        handleSubmitFeed={handleSubmitFeed}
        feedSubmitting={feedSubmitting}
        fileReading={fileReading}
        feedAnalyzeLoading={feedAnalyzeLoading}
        feedFetchOnly={feedFetchOnly}
        feedSerialFetch={feedSerialFetch}
        feedFullBook={feedFullBook}
        feedText={feedText}
        feedUrl={feedUrl}
        feedProjectTitle={feedProjectTitle}
        setFeedProjectTitle={setFeedProjectTitle}
        setFeedProjectId={setFeedProjectId}
        setFeedMode={setFeedMode}
        feedCategory={feedCategory}
        setFeedCategory={setFeedCategory}
        feedTitle={feedTitle}
        setFeedTitle={setFeedTitle}
        feedTags={feedTags}
        setFeedTags={setFeedTags}
        feedSource={feedSource}
        setFeedSource={setFeedSource}
        setFeedText={setFeedText}
        setFeedUrl={setFeedUrl}
        feedStartChapter={feedStartChapter}
        setFeedStartChapter={setFeedStartChapter}
        feedMaxChapters={feedMaxChapters}
        setFeedMaxChapters={setFeedMaxChapters}
        feedBatchSize={feedBatchSize}
        setFeedBatchSize={setFeedBatchSize}
        feedFetchConcurrency={feedFetchConcurrency}
        setFeedFetchConcurrency={setFeedFetchConcurrency}
        setFeedSerialFetch={setFeedSerialFetch}
        setFeedFullBook={setFeedFullBook}
        setFeedFetchOnly={setFeedFetchOnly}
        feedModelId={feedModelId}
        handleFeedModelChange={handleFeedModelChange}
        feedModelsLoading={feedModelsLoading}
        loadAvailableModels={loadAvailableModels}
        extractionModelOptions={extractionModelOptions}
        feedIngestJob={feedIngestJob}
        handlePauseIngestJob={handlePauseIngestJob}
        handleResumeIngestJob={handleResumeIngestJob}
        handleCancelIngestJob={handleCancelIngestJob}
        handleAnalyzeCachedJob={handleAnalyzeCachedJob}
        handleFileUpload={handleFileUpload}
        selectedFileName={selectedFileName}
      />

      <Modal
        title="AI 提炼结果预览"
        open={feedAnalyzePreviewOpen}
        onCancel={() => setFeedAnalyzePreviewOpen(false)}
        onOk={handleSaveAnalyzedEntries}
        okText={feedAnalyzeSaving ? '保存中...' : `批量保存 ${feedAnalyzedEntries.length} 条`}
        cancelText="取消"
        confirmLoading={feedAnalyzeSaving}
        width={760}
        destroyOnHidden={false}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">来源：{feedAnalyzeSource || '未命名来源'}</Text>
          {feedProjectTitle.trim() && (
            <Text type="secondary">将保存到投喂项目：{feedProjectTitle.trim()}</Text>
          )}
          {Array.isArray(feedIngestJob?.batches) && feedIngestJob.batches.length > 0 && (
            <Card size="small" title="分批提炼进度" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当前任务从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始，共抓取 {feedIngestJob.fetched_chapters || 0} 章，{feedIngestJob.total_batches || feedIngestJob.batches.length} 批。
                  如果需要精确到单章重新提炼，下次把“每批提炼章节数”设为 1。
                </Text>
                <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 4 }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {feedIngestJob.batches.map((batch: any) => {
                      const label = batch.first_chapter === batch.last_chapter
                        ? `第${batch.first_chapter}章`
                        : `第${batch.first_chapter}-${batch.last_chapter}章`
                      const entryCount = Array.isArray(batch.entries) ? batch.entries.length : 0
                      return (
                        <Card key={batch.index} size="small" style={{ borderRadius: 8 }}>
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                              <Space direction="vertical" size={2}>
                                <Space wrap>
                                  <Text strong>{label}</Text>
                                  <Tag color={getBatchStatusColor(batch.status)} bordered={false}>{batch.status || 'pending'}</Tag>
                                  <Tag bordered={false}>候选 {entryCount}</Tag>
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>{batch.title || batch.source || ''}</Text>
                              </Space>
                              <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                loading={feedReanalyzingBatch === batch.index}
                                disabled={feedReanalyzingBatch !== null || feedAnalyzeSaving}
                                onClick={() => handleReanalyzeBatch(batch.index)}
                              >
                                重新提炼
                              </Button>
                            </Space>
                            {batch.error && (
                              <Text type="danger" style={{ fontSize: 12 }}>{batch.error}</Text>
                            )}
                          </Space>
                        </Card>
                      )
                    })}
                  </Space>
                </div>
              </Space>
            </Card>
          )}
          {feedAnalyzedEntries.length === 0 ? (
            <Text type="secondary">暂无可保存条目</Text>
          ) : (
            <div style={{ maxHeight: 460, overflow: 'auto', paddingRight: 4 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {feedAnalyzedEntries.map((entry: any, index: number) => (
                  <Card key={`${entry.title || 'entry'}-${index}`} size="small" style={{ borderRadius: 12 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Text strong>{entry.title || '未命名知识'}</Text>
                        <Tag color="geekblue" bordered={false}>{entry.category || '未分类'}</Tag>
                        {typeof entry.weight === 'number' && <Tag bordered={false}>权重 {entry.weight}</Tag>}
                        {renderMetaTags(entry)}
                      </Space>
                      <Text>{entry.content || ''}</Text>
                      {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                        <Space wrap>
                          {entry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                        </Space>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            </div>
          )}
        </Space>
      </Modal>

      <NovelCreateWizard
        open={wizardOpen}
        onCancel={handleWizardCancel}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
