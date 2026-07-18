import React from 'react'
import { Button, Checkbox, Input, InputNumber, Modal, Progress, Radio, Select, Space, Tag, Typography } from 'antd'
import {
  BookOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  fieldLabelStyle,
  getBatchStatusColor,
  getIngestStatusColor,
  getSourceCacheColor,
  getSourceCacheLabel,
  inputStyle,
  knowledgeCategoryPresets,
  panelStyle,
  softPanelStyle,
} from './knowledge-ui-shared'

const { Text } = Typography
const { TextArea } = Input

export type NovelStudioFeedModalProps = {
  feedOpen: any
  handleCloseFeed: any
  feedMode: any
  handleAnalyzeFromUrl: any
  fileInputRef: any
  handleSubmitFeed: any
  feedSubmitting: any
  fileReading: any
  feedAnalyzeLoading: any
  feedFetchOnly: any
  feedSerialFetch: any
  feedFullBook: any
  feedText: any
  feedUrl: any
  feedProjectTitle: any
  setFeedProjectTitle: any
  setFeedProjectId: any
  setFeedMode: any
  feedCategory: any
  setFeedCategory: any
  feedTitle: any
  setFeedTitle: any
  feedTags: any
  setFeedTags: any
  feedSource: any
  setFeedSource: any
  setFeedText: any
  setFeedUrl: any
  feedStartChapter: any
  setFeedStartChapter: any
  feedMaxChapters: any
  setFeedMaxChapters: any
  feedBatchSize: any
  setFeedBatchSize: any
  feedFetchConcurrency: any
  setFeedFetchConcurrency: any
  setFeedSerialFetch: any
  setFeedFullBook: any
  setFeedFetchOnly: any
  feedModelId: any
  handleFeedModelChange: any
  feedModelsLoading: any
  loadAvailableModels: any
  extractionModelOptions: any
  feedIngestJob: any
  handlePauseIngestJob: any
  handleResumeIngestJob: any
  handleCancelIngestJob: any
  handleAnalyzeCachedJob: any
  handleFileUpload: any
  selectedFileName: any
}

export function NovelStudioFeedModal({
  feedOpen,
  handleCloseFeed,
  feedMode,
  handleAnalyzeFromUrl,
  fileInputRef,
  handleSubmitFeed,
  feedSubmitting,
  fileReading,
  feedAnalyzeLoading,
  feedFetchOnly,
  feedSerialFetch,
  feedFullBook,
  feedText,
  feedUrl,
  feedProjectTitle,
  setFeedProjectTitle,
  setFeedProjectId,
  setFeedMode,
  feedCategory,
  setFeedCategory,
  feedTitle,
  setFeedTitle,
  feedTags,
  setFeedTags,
  feedSource,
  setFeedSource,
  setFeedText,
  setFeedUrl,
  feedStartChapter,
  setFeedStartChapter,
  feedMaxChapters,
  setFeedMaxChapters,
  feedBatchSize,
  setFeedBatchSize,
  feedFetchConcurrency,
  setFeedFetchConcurrency,
  setFeedSerialFetch,
  setFeedFullBook,
  setFeedFetchOnly,
  feedModelId,
  handleFeedModelChange,
  feedModelsLoading,
  loadAvailableModels,
  extractionModelOptions,
  feedIngestJob,
  handlePauseIngestJob,
  handleResumeIngestJob,
  handleCancelIngestJob,
  handleAnalyzeCachedJob,
  handleFileUpload,
  selectedFileName,
}: NovelStudioFeedModalProps) {
  return (
      <Modal
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>投喂知识</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              文本直投可立即入库；URL 和文件会先交给 AI 提炼，再预览确认。
            </Text>
          </Space>
        }
        open={feedOpen}
        width={760}
        onCancel={handleCloseFeed}
        onOk={
          feedMode === 'url'
            ? handleAnalyzeFromUrl
            : feedMode === 'file'
              ? () => fileInputRef.current?.click()
              : handleSubmitFeed
        }
        okText={
          feedMode === 'text'
            ? (feedSubmitting ? '提交中...' : '加入知识库')
            : feedMode === 'file'
              ? (fileReading ? '读取中...' : '选择文件并分析')
              : (feedAnalyzeLoading
                  ? (feedFetchOnly ? '拉取中...' : '分析中...')
                  : feedSerialFetch && feedFetchOnly
                    ? '仅拉取正文'
                    : feedSerialFetch && feedFullBook
                      ? '启动全本任务'
                      : '抓取并分析')
        }
        cancelText={feedAnalyzeLoading || fileReading ? '中断任务' : '取消'}
        confirmLoading={feedMode === 'text' ? feedSubmitting : feedMode === 'url' ? feedAnalyzeLoading : fileReading}
        okButtonProps={{
          disabled:
            feedMode === 'text'
              ? !feedText.trim()
              : feedMode === 'url'
                ? !feedUrl.trim()
                : false,
        }}
        destroyOnHidden={false}
        styles={{ body: { paddingTop: 10 } }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={softPanelStyle}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space align="center">
                <FolderOutlined style={{ color: '#1677ff' }} />
                <Text strong>投喂项目</Text>
                <Tag bordered={false}>知识隔离</Tag>
              </Space>
              <Input
                value={feedProjectTitle}
                onChange={(e) => {
                  setFeedProjectTitle(e.target.value)
                  setFeedProjectId(undefined)
                }}
                placeholder="例如：没钱修什么仙。这里是投喂分组，不绑定小说工作台项目"
                style={inputStyle}
              />
            </Space>
          </div>

          <div style={panelStyle}>
            <div style={fieldLabelStyle}>
              <BookOutlined />
              投喂方式
            </div>
            <Radio.Group
              value={feedMode}
              onChange={(e) => setFeedMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
            >
              <Radio.Button value="text" style={{ textAlign: 'center' }}>
                <FileTextOutlined /> 文本直投
              </Radio.Button>
              <Radio.Button value="url" style={{ textAlign: 'center' }}>
                <LinkOutlined /> URL 提炼
              </Radio.Button>
              <Radio.Button value="file" style={{ textAlign: 'center' }}>
                <CloudUploadOutlined /> TXT/PDF
              </Radio.Button>
            </Radio.Group>
          </div>

          {feedMode !== 'text' && (
            <div style={softPanelStyle}>
              <Row gutter={10} align="bottom">
                <Col flex="auto">
                  <div style={fieldLabelStyle}>
                    <DatabaseOutlined />
                    提炼模型
                  </div>
                  <Select
                    allowClear
                    showSearch
                    loading={feedModelsLoading}
                    value={feedModelId}
                    onChange={handleFeedModelChange}
                    optionFilterProp="label"
                    options={extractionModelOptions}
                    placeholder="默认自动选择模型"
                    notFoundContent={feedModelsLoading ? '加载中...' : '暂无可用模型'}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={feedModelsLoading}
                    onClick={loadAvailableModels}
                  />
                </Col>
              </Row>
            </div>
          )}

          {feedMode === 'text' ? (
            <div style={panelStyle}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>来源</div>
                    <Input
                      value={feedSource}
                      onChange={(e) => setFeedSource(e.target.value)}
                      placeholder="手动投喂 / 读书笔记 / 小说拆解"
                      style={inputStyle}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标题</div>
                    <Input
                      value={feedTitle}
                      onChange={(e) => setFeedTitle(e.target.value)}
                      placeholder="可选，便于以后检索"
                      style={inputStyle}
                    />
                  </Col>
                </Row>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>
                      <TagsOutlined />
                      分类
                    </div>
                    <Select
                      showSearch
                      value={feedCategory}
                      onChange={setFeedCategory}
                      onSearch={(value) => setFeedCategory(value)}
                      options={knowledgeCategoryPresets}
                      placeholder="选择、搜索或输入分类"
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标签</div>
                    <Input
                      value={feedTags}
                      onChange={(e) => setFeedTags(e.target.value)}
                      placeholder="开篇, 伏笔, 境界瓶颈"
                      style={inputStyle}
                    />
                  </Col>
                </Row>
                <div>
                  <div style={fieldLabelStyle}>知识正文</div>
                  <Input.TextArea
                    value={feedText}
                    onChange={(e) => setFeedText(e.target.value)}
                    placeholder="粘贴要沉淀的拆书笔记、设定片段、写作方法或样章分析..."
                    autoSize={{ minRows: 9, maxRows: 16 }}
                    showCount
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </Space>
            </div>
          ) : feedMode === 'url' ? (
            <div style={panelStyle}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={fieldLabelStyle}>
                  <LinkOutlined />
                  网页地址
                </div>
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://www.qute.cc/list/187949/"
                  prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                  style={inputStyle}
                />
                <Row gutter={10} align="middle">
                  <Col flex="auto">
                    <Checkbox
                      checked={feedSerialFetch}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFeedSerialFetch(checked)
                        if (!checked) {
                          setFeedFullBook(false)
                          setFeedFetchOnly(false)
                        }
                      }}
                    >
                      自动连载抓取：目录页先进入第一章，再追下一章
                    </Checkbox>
                  </Col>
                  <Col>
                    <Space size={8}>
                      <Text type="secondary">上限</Text>
                      <InputNumber
                        min={1}
                        max={5000}
                        value={feedMaxChapters}
                        onChange={(value) => setFeedMaxChapters(Number(value || 20))}
                        disabled={!feedSerialFetch || feedFullBook}
                        style={{ width: 92 }}
                      />
                      <Text type="secondary">章</Text>
                    </Space>
                  </Col>
                </Row>
                {feedSerialFetch && (
                  <Row gutter={[10, 10]} align="middle">
                    <Col xs={24} md={8}>
                      <Text type="secondary">全本模式</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Checkbox
                        checked={feedFullBook}
                        onChange={(e) => setFeedFullBook(e.target.checked)}
                      >
                        {feedFetchOnly ? '一直追章到没有下一章，只写入正文缓存' : '一直追章到没有下一章，完成后自动入库'}
                      </Checkbox>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">两阶段投喂</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Checkbox
                        checked={feedFetchOnly}
                        onChange={(e) => setFeedFetchOnly(e.target.checked)}
                      >
                        先只拉取正文缓存，完成后再手动开始提炼
                      </Checkbox>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">起始章节</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <Text type="secondary">从第</Text>
                        <InputNumber
                          min={1}
                          max={100000}
                          value={feedStartChapter}
                          onChange={(value) => setFeedStartChapter(Number(value || 1))}
                          style={{ width: 100 }}
                        />
                        <Text type="secondary">章开始</Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">拉取并发数</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <InputNumber
                          min={1}
                          max={24}
                          value={feedFetchConcurrency}
                          onChange={(value) => setFeedFetchConcurrency(Number(value || 1))}
                          style={{ width: 92 }}
                        />
                        <Text type="secondary">线程</Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">每批提炼章节数</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <InputNumber
                          min={1}
                          max={50}
                          value={feedBatchSize}
                          onChange={(value) => setFeedBatchSize(Number(value || 10))}
                          style={{ width: 92 }}
                        />
                        <Text type="secondary">章/批</Text>
                      </Space>
                    </Col>
                  </Row>
                )}
                {feedIngestJob && feedSerialFetch && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
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
                        {feedIngestJob.fetch_only ? '仅拉取正文缓存；' : ''}
                        从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始；并发 {feedIngestJob.fetch_concurrency || feedFetchConcurrency || 1}；已抓取 {feedIngestJob.fetched_chapters || 0} 章
                        {feedIngestJob.fetch_only ? '' : `，已分析 ${feedIngestJob.analyzed_batches || 0}/${feedIngestJob.total_batches || 0} 批，候选知识 ${Array.isArray(feedIngestJob.entries) ? feedIngestJob.entries.length : 0} 条`}
                      </Text>
                      {(feedIngestJob.current_range || feedIngestJob.current_chapter) && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {feedIngestJob.status === 'completed' ? '已完成到' : '当前处理'}：
                          {feedIngestJob.current_range || `第${feedIngestJob.current_chapter}章`}
                          {feedIngestJob.current_chapter_title ? ` / ${feedIngestJob.current_chapter_title}` : ''}
                        </Text>
                      )}
                      {Array.isArray(feedIngestJob.batches) && feedIngestJob.batches.length > 0 && (
                        <Space wrap size={[6, 4]}>
                          {feedIngestJob.batches.map((batch: any) => (
                            <Tag key={batch.index} color={getBatchStatusColor(batch.status)} bordered={false}>
                              {batch.first_chapter === batch.last_chapter
                                ? `第${batch.first_chapter}章`
                                : `第${batch.first_chapter}-${batch.last_chapter}章`}
                              {' '}
                              {batch.status === 'completed' ? `完成 ${Array.isArray(batch.entries) ? batch.entries.length : 0}` : batch.status}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  </div>
                )}
                <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>
                  {feedSerialFetch && feedFetchOnly
                    ? '两阶段模式会先把章节正文完整拉取到本地缓存，不调用模型。目录页会优先并发拉取；解析不到目录时自动退回串行追章。'
                    : feedSerialFetch && feedFullBook
                    ? '全本模式会启动后台任务，一直追到没有下一章，跑完后自动写入当前投喂项目。抓取和提炼都可暂停，继续时会跳过已完成批次。'
                    : feedSerialFetch
                      ? '适合小说目录页。系统会后台自动进入第一章并逐章追章；如果已经投喂到第 20 章，把起始章节设为 21，就只分析后续章节。需要逐章重提时，把每批章节数设为 1。'
                    : '适合单页文章或章节页。系统会抓取当前页面正文，再让 AI 提炼为可入库知识。'}
                </div>
              </Space>
            </div>
          ) : (
            <div style={panelStyle}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标题</div>
                    <Input
                      value={feedTitle}
                      onChange={(e) => setFeedTitle(e.target.value)}
                      placeholder="默认使用文件名"
                      style={inputStyle}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>辅助分类</div>
                    <Select
                      showSearch
                      value={feedCategory}
                      onChange={setFeedCategory}
                      onSearch={(value) => setFeedCategory(value)}
                      options={knowledgeCategoryPresets}
                      placeholder="选择、搜索或输入分类"
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
                <div>
                  <div style={fieldLabelStyle}>辅助标签</div>
                  <Input
                    value={feedTags}
                    onChange={(e) => setFeedTags(e.target.value)}
                    placeholder="标签，支持逗号分隔；AI 也会补充标签"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileReading}
                  style={{
                    width: '100%',
                    border: '1px dashed #93c5fd',
                    borderRadius: 10,
                    background: fileReading ? '#f8fafc' : '#eff6ff',
                    padding: '22px 16px',
                    cursor: fileReading ? 'default' : 'pointer',
                    color: '#1d4ed8',
                    textAlign: 'center',
                  }}
                >
                  <CloudUploadOutlined style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                  <Text strong style={{ color: '#1d4ed8' }}>
                    {selectedFileName ? `已选择：${selectedFileName}` : '选择本地 TXT/PDF 文件'}
                  </Text>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                    读取后自动提炼，随后进入预览确认
                  </div>
                </button>
              </Space>
            </div>
          )}
        </Space>
      </Modal>

  )
}
