import React from 'react'
import {
  Alert, Button, Card, Checkbox, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Tooltip, Typography, message,
} from 'antd'
import apiClient from '../../api/client'
import { ChapterManagementDrawer } from '../ChapterManagementDrawer'
import { ChapterRestructurePanel } from '../ChapterRestructurePanel'
import { OutlineControlPanel } from '../OutlineControlPanel'
import { OutlineTreeModal } from '../OutlineTreeModal'
import { VersionDetailModal } from '../VersionDetailModal'
import {
  AgentAuditDrawer,
  AgentExecutionModal,
  ConsistencyGraphModal,
  CreativeCardsModal,
  EditorModal,
  ExportDeliveryModal,
  QualityBenchmarkModal,
  ReferenceConfigModal,
  ReferenceEngineeringModal,
  ReviewAnnotationsDrawer,
  TaskCenterDrawer,
} from './workspace-lazy'
import { DeferredWorkspaceSurfaces } from './workspace-helpers'
import type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'
export type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'


const { Text } = Typography

export function NovelWorkspaceDeferredSurfaces(props: NovelWorkspaceDeferredSurfacesProps) {
  const {
    acceptChapterVersion,
    activeChapter,
    activeChapterId,
    activeTasks,
    agentAuditOpen,
    agentExecution,
    applyEditorRevision,
    applyFuture100SkeletonDraft,
    approveChapterGroupStage,
    backupImportOpen,
    backupImportText,
    bulkUpdateRepairTaskStatus,
    cancelKnowledgeIngestJob,
    chapterDrawerOpen,
    chapterGroupExecutingId,
    chapterSearch,
    chapterSortMode,
    chapterStatusFilter,
    chapterTreeData,
    chapterVersionDetail,
    chapters,
    characters,
    commercialToolsOpen,
    consistencyGraphOpen,
    continuityAudit,
    continuityAuditLoading,
    createBackupSnapshot,
    createFirst30RetentionRepairQueue,
    createLongformProductionRepairQueue,
    createMechanicalQaRepairQueue,
    createRecoveryEvidenceGovernanceQueue,
    creativeCardsOpen,
    creativeCommandOpen,
    creativeCommandText,
    deleteChapter,
    downloadBackupPackage,
    editorForm,
    editorKind,
    executeChapterGroupRun,
    executeReleaseRepairRun,
    executeTypedRepairTask,
    exportDeliveryOpen,
    extractStyleSampleCandidates,
    fillDefaultStyleSampleBank,
    filteredChapters,
    flushPendingSave,
    future100ApplyLoading,
    future100FocusOutlineIds,
    generateCurrentChapterProse,
    generateFuture100Skeleton,
    generateLongformRepairAuditSummary,
    generateWritingBibleEditor,
    generatingProse,
    handleOutlineGenerate,
    handleRestructure,
    importBackupPackage,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    loadProductionTasks,
    loadProjectModules,
    locateRepairTaskChapter,
    mergeChapterVersion,
    openAgentConfigEditor,
    openApprovalPolicyEditor,
    openChapterQualityCard,
    openContinuityAudit,
    openEditor,
    openGenreTemplates,
    openLongformProductionTrends,
    openMaterialRepairPlan,
    openModelDiagnostics,
    openProductionDesk,
    openProductionMetrics,
    openReferenceKnowledgeDiagnosis,
    openRepairTaskChapterEditor,
    openRunQueue,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlinePanelOpen,
    outlineTreeOpen,
    outlines,
    pauseKnowledgeIngestJob,
    previewStyleSampleAdjustmentBatch,
    previewStyleSampleAdjustmentPatch,
    productionMode,
    productionModeOptions,
    productionTasks,
    projectId,
    proseChapters,
    qualityBenchmarkOpen,
    recheckRepairTaskConvergence,
    recheckStyleSampleTaskBookReviewTasks,
    recoverRunQueue,
    referenceConfigOpen,
    referenceEngineeringOpen,
    referenceReports,
    refreshConsistencyAudit,
    refreshPropagationDebt,
    releaseRepairExecutingId,
    restructurePanelOpen,
    resumeKnowledgeIngestJob,
    retryChapterGroupStage,
    reviewAnnotationsOpen,
    reviewStyleSampleAdjustmentPatch,
    reviews,
    rollingBackVersionId,
    runCreativeCommand,
    runFirst30RetentionDiagnosis,
    runFuture100SkeletonAudit,
    runLongformCreationDiagnosis,
    runLongformPressureTest,
    runMechanicalQa,
    runMechanicalQaLlmReview,
    runPropagationDebtLlmPlan,
    runQualityBenchmark,
    runRecords,
    runReferenceMigrationPlan,
    runRollingPlan,
    runSimilarityForActiveChapter,
    runTopicValidation,
    runVersionReviewForActiveChapter,
    saveStoryStateEditor,
    saveWritingBibleEditor,
    selectChapterForWriting,
    selectMode,
    selectedChapterIds,
    selectedChaptersList,
    selectedModelId,
    selectedProject,
    setAgentAuditOpen,
    setAgentExecution,
    setBackupImportOpen,
    setBackupImportText,
    setChapterDrawerOpen,
    setChapterSearch,
    setChapterSortMode,
    setChapterStatusFilter,
    setChapterVersionDetail,
    setCommercialToolsOpen,
    setConsistencyGraphOpen,
    setCreativeCardsOpen,
    setCreativeCommandOpen,
    setCreativeCommandText,
    setEditorItem,
    setEditorKind,
    setExportDeliveryOpen,
    setFuture100Draft,
    setFuture100FocusOutlineIds,
    setFuture100SelectedNos,
    setOutlinePanelOpen,
    setOutlineTreeOpen,
    setProductionMode,
    setQualityBenchmarkOpen,
    setReferenceConfigOpen,
    setReferenceEngineeringOpen,
    setRestructurePanelOpen,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setSelectMode,
    setSelectedChapterIds,
    setSelectedProject,
    setShowOnlyDiff,
    setStoryStateOpen,
    setTaskCenterOpen,
    setTaskCenterRecoveryFocus,
    setUnattendedTargetChapter,
    setWritingBibleOpen,
    showOnlyDiff,
    skipChapterGroupStage,
    sortedChapters,
    startFuture100ChapterGroupGeneration,
    startReadyChapterGroupGeneration,
    startRepairTaskRevision,
    startRunQueueWorker,
    startUnattendedWritingGoal,
    stopRunQueueWorker,
    storyStateForm,
    storyStateOpen,
    styleSampleCandidateLoading,
    submitEditor,
    taskCenterOpen,
    taskCenterRecoveryFocus,
    unattendedTargetChapter,
    undoStyleSampleAdjustmentPatch,
    updateRepairTaskStatus,
    worldbuilding,
    writingBibleForm,
    writingBibleGenerating,
    writingBibleOpen,
  } = props

  return (
      <DeferredWorkspaceSurfaces>
        <EditorModal
          editorKind={editorKind}
          form={editorForm}
          onCancel={() => { setEditorKind(null); setEditorItem(null) }}
          onSubmit={submitEditor}
        />

        <VersionDetailModal
          version={chapterVersionDetail}
          activeChapter={activeChapter}
          showOnlyDiff={showOnlyDiff}
          onToggleDiffMode={() => setShowOnlyDiff(prev => !prev)}
          onClose={() => setChapterVersionDetail(null)}
          onAcceptVersion={acceptChapterVersion}
          onMergeVersion={mergeChapterVersion}
          acceptingVersionId={rollingBackVersionId}
        />

        <AgentExecutionModal
          execution={agentExecution}
          onClose={() => setAgentExecution(null)}
        />

        <ReferenceConfigModal
          open={referenceConfigOpen}
          projectId={projectId}
          config={selectedProject?.reference_config || {}}
          onClose={() => setReferenceConfigOpen(false)}
          onSaved={(config) => setSelectedProject((prev: any) => prev ? { ...prev, reference_config: config } : prev)}
        />

      <ReferenceEngineeringModal
        open={referenceEngineeringOpen}
        projectId={projectId}
        referenceConfig={selectedProject?.reference_config || {}}
        referenceReports={referenceReports}
        onClose={() => setReferenceEngineeringOpen(false)}
        onOpenReferenceConfig={() => {
          setReferenceEngineeringOpen(false)
          setReferenceConfigOpen(true)
        }}
      />

      <CreativeCardsModal
        open={creativeCardsOpen}
        selectedProject={selectedProject}
        worldbuilding={worldbuilding}
        characters={characters}
        outlines={outlines}
        chapters={sortedChapters}
        activeChapterId={activeChapterId}
        onClose={() => setCreativeCardsOpen(false)}
        onEdit={(kind, item) => {
          setCreativeCardsOpen(false)
          openEditor(kind, item)
        }}
        onOpenWritingBible={() => {
          setCreativeCardsOpen(false)
          void openWritingBibleEditor()
        }}
        onOpenStoryState={() => {
          setCreativeCardsOpen(false)
          openStoryStateEditor()
        }}
      />

      <ConsistencyGraphModal
        open={consistencyGraphOpen}
        selectedProject={selectedProject}
        chapters={sortedChapters}
        characters={characters}
        outlines={outlines}
        audit={continuityAudit}
        auditLoading={continuityAuditLoading}
        onClose={() => setConsistencyGraphOpen(false)}
        onRefreshAudit={refreshConsistencyAudit}
        onOpenStoryState={() => {
          setConsistencyGraphOpen(false)
          openStoryStateEditor()
        }}
        onSelectChapter={(chapterId) => {
          setConsistencyGraphOpen(false)
          void selectChapterForWriting(chapterId)
        }}
      />

      <QualityBenchmarkModal
        open={qualityBenchmarkOpen}
        projectId={projectId}
        selectedModelId={selectedModelId}
        chapters={sortedChapters}
        reviews={reviews}
        runRecords={runRecords}
        continuityAudit={continuityAudit}
        benchmarkLoading={commercialToolLoading === 'benchmark'}
        onClose={() => setQualityBenchmarkOpen(false)}
        onRunBenchmark={runQualityBenchmark}
        onRefreshContinuity={refreshConsistencyAudit}
        onSelectChapter={(chapterId) => {
          setQualityBenchmarkOpen(false)
          void selectChapterForWriting(chapterId)
        }}
        onChanged={() => { void loadProjectModules() }}
      />

      <ReviewAnnotationsDrawer
        open={reviewAnnotationsOpen}
        projectId={projectId}
        onClose={() => setReviewAnnotationsOpen(false)}
        onSelectChapter={(chapterId) => {
          void selectChapterForWriting(chapterId)
        }}
        onApplyEditorRevision={applyEditorRevision}
        onChanged={() => { void loadProjectModules() }}
      />

      <AgentAuditDrawer
        open={agentAuditOpen}
        projectId={projectId}
        onClose={() => setAgentAuditOpen(false)}
        onSelectChapter={(chapterId) => {
          void selectChapterForWriting(chapterId)
        }}
        onOpenTaskCenter={() => setTaskCenterOpen(true)}
      />

      <ExportDeliveryModal
        open={exportDeliveryOpen}
        projectId={projectId}
        onClose={() => setExportDeliveryOpen(false)}
        onOpenQualityBenchmark={() => {
          setExportDeliveryOpen(false)
          setQualityBenchmarkOpen(true)
        }}
        onOpenConsistencyGraph={() => {
          setExportDeliveryOpen(false)
          setConsistencyGraphOpen(true)
        }}
        onOpenTaskCenter={() => {
          setExportDeliveryOpen(false)
          setTaskCenterOpen(true)
        }}
      />

      <Modal
        open={commercialToolsOpen}
        title="商业级自动写作工具箱"
        width={920}
        onCancel={() => setCommercialToolsOpen(false)}
        footer={<Button type="primary" onClick={() => setCommercialToolsOpen(false)}>关闭</Button>}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="这些工具用于生产治理：稳定性、成本、质量、审批、相似度、滚动规划和提示词版本。"
            description="核心写作、审稿、规划、参考迁移会调用大模型；机械质检、传播债务、模型诊断、备份和模板默认是本地规则/配置工具，带 AI 前缀的按钮才会调用当前选择的大模型。"
          />
          <Card size="small" title="自然语言创作指令台">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>输入一句操作意图，系统会用本地指令解析器转成生产步骤；低风险检查类任务可以直接执行。</Text>
              <Button block type="primary" loading={commercialToolLoading === 'creativeCommand'} onClick={() => setCreativeCommandOpen(true)}>打开本地创作指令台</Button>
            </Space>
          </Card>
          <Card size="small" title="批量生产模式">
            <Space wrap align="center">
              <Text type="secondary">章节群执行策略</Text>
              <Select
                size="small"
                value={productionMode}
                style={{ width: 220 }}
                options={productionModeOptions}
                onChange={setProductionMode}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                该模式会写入章节群任务，并在任务中心按失败点继续。
              </Text>
            </Space>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Card size="small" title="生产稳定性">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title="无人值守到目标章">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>从当前章开始自动补材料、写正文、复检，达标后进入下一章。</Text>
                    <Space.Compact style={{ width: '100%' }}>
                      <InputNumber
                        min={1}
                        precision={0}
                        value={unattendedTargetChapter}
                        onChange={(value) => setUnattendedTargetChapter(Number(value || 1))}
                        style={{ width: '45%' }}
                        addonBefore="到第"
                        addonAfter="章"
                      />
                      <Button
                        type="primary"
                        loading={commercialToolLoading === 'unattendedGoal'}
                        disabled={!selectedModelId}
                        onClick={startUnattendedWritingGoal}
                      >
                        启动无人值守
                      </Button>
                    </Space.Compact>
                  </Space>
                </Card>
                <Button block loading={commercialToolLoading === 'productionDesk'} onClick={openProductionDesk}>章节生产台</Button>
                <Button block loading={commercialToolLoading === 'materialRepair'} onClick={openMaterialRepairPlan}>材料补齐计划</Button>
                <Button block loading={commercialToolLoading === 'readyGroup'} onClick={startReadyChapterGroupGeneration}>智能章节群入队</Button>
                <Button block loading={commercialToolLoading === 'future100Group'} onClick={startFuture100ChapterGroupGeneration}>从未来100章骨架入队</Button>
                <Button block loading={commercialToolLoading === 'queue'} onClick={openRunQueue}>后台任务队列</Button>
                <Button block loading={commercialToolLoading === 'queueWorker'} onClick={startRunQueueWorker}>启动后台 worker</Button>
                <Button block loading={commercialToolLoading === 'queueStop'} onClick={stopRunQueueWorker}>停止后台 worker</Button>
                <Button block loading={commercialToolLoading === 'queueRecover'} onClick={recoverRunQueue}>恢复后台队列</Button>
                <Button block loading={commercialToolLoading === 'metrics'} onClick={openProductionMetrics}>成本质量仪表盘</Button>
                <Button block loading={commercialToolLoading === 'longformTrends'} onClick={openLongformProductionTrends}>长线生产趋势报表</Button>
                <Button block loading={commercialToolLoading === 'longformRepair'} onClick={createLongformProductionRepairQueue}>生成长线生产修复任务</Button>
                <Button block loading={commercialToolLoading === 'modelDiagnostics'} onClick={openModelDiagnostics}>模型服务诊断（配置）</Button>
                <Button block onClick={() => setAgentAuditOpen(true)}>Agent 调用审计</Button>
                <Button block loading={commercialToolLoading === 'approval'} onClick={openApprovalPolicyEditor}>审批关卡策略</Button>
              </Space>
            </Card>
            <Card size="small" title="质量基准">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={openChapterQualityCard}>当前章交稿质检</Button>
                <Button block onClick={() => setQualityBenchmarkOpen(true)}>质量评测基准面板</Button>
                <Button block onClick={() => setReviewAnnotationsOpen(true)}>章节审阅批注</Button>
                <Button block onClick={() => setConsistencyGraphOpen(true)}>全书一致性图谱</Button>
                <Button block loading={commercialToolLoading === 'continuityAudit'} onClick={openContinuityAudit}>全书连续性检查</Button>
                <Button block loading={commercialToolLoading === 'first30Retention'} onClick={runFirst30RetentionDiagnosis}>前30章留存诊断</Button>
                <Button block loading={commercialToolLoading === 'first30Repair'} onClick={createFirst30RetentionRepairQueue}>生成前30章留存修复任务</Button>
                <Button block loading={commercialToolLoading === 'mechanicalQa'} onClick={runMechanicalQa}>机械质检规则引擎（本地）</Button>
                <Button block type="primary" loading={commercialToolLoading === 'mechanicalQaLlm'} onClick={runMechanicalQaLlmReview}>AI 复核机械质检</Button>
                <Button block loading={commercialToolLoading === 'mechanicalRepair'} onClick={createMechanicalQaRepairQueue}>机械质检修复任务</Button>
                <Button block loading={commercialToolLoading === 'propagationDebt'} onClick={refreshPropagationDebt}>传播债务队列（本地）</Button>
                <Button block type="primary" loading={commercialToolLoading === 'propagationDebtLlm'} onClick={runPropagationDebtLlmPlan}>AI 生成传播债务修复方案</Button>
                <Button block loading={commercialToolLoading === 'benchmark'} onClick={runQualityBenchmark}>项目质量基准测试</Button>
                <Button block loading={commercialToolLoading === 'versionReview'} onClick={runVersionReviewForActiveChapter}>当前章版本评审</Button>
                <Button block loading={commercialToolLoading === 'similarity'} onClick={runSimilarityForActiveChapter}>当前章相似度检测</Button>
                <Button block loading={commercialToolLoading === 'migrationPlan'} onClick={runReferenceMigrationPlan}>当前章参考迁移计划</Button>
              </Space>
            </Card>
            <Card size="small" title="规划与选题">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block loading={commercialToolLoading === 'topic'} onClick={runTopicValidation}>原创选题验证</Button>
                <Button block loading={commercialToolLoading === 'longformCreationDiagnosis'} onClick={runLongformCreationDiagnosis}>长篇创作诊断</Button>
                <Button block loading={commercialToolLoading === 'longformPressure'} onClick={runLongformPressureTest}>300万字长线压力测试</Button>
                <Button block loading={commercialToolLoading === 'future100Audit'} onClick={runFuture100SkeletonAudit}>未来100章骨架检查</Button>
                <Button block type="primary" loading={commercialToolLoading === 'future100Generate'} onClick={generateFuture100Skeleton}>AI 生成未来100章骨架</Button>
                <Button block loading={commercialToolLoading === 'rollingPlan'} onClick={runRollingPlan}>未来 10 章滚动规划</Button>
                <Button block loading={commercialToolLoading === 'referenceDiagnosis'} onClick={openReferenceKnowledgeDiagnosis}>参考知识诊断</Button>
                <Button block onClick={() => { setCommercialToolsOpen(false); setReferenceEngineeringOpen(true) }}>多参考融合控制台</Button>
                <Button block loading={commercialToolLoading === 'genreTemplates'} onClick={openGenreTemplates}>类型模板方法库（模板）</Button>
              </Space>
            </Card>
            <Card size="small" title="Agent 配置">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block loading={commercialToolLoading === 'agentConfig'} onClick={openAgentConfigEditor}>提示词与 Agent 配置</Button>
                <Button block onClick={openWritingBibleEditor}>结构化写作圣经</Button>
                <Button block onClick={openStoryStateEditor}>状态机人工校正</Button>
              </Space>
            </Card>
            <Card size="small" title="交付导出">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => setExportDeliveryOpen(true)}>导出 TXT / Markdown</Button>
                <Button block loading={commercialToolLoading === 'backup'} onClick={createBackupSnapshot}>创建项目备份快照</Button>
                <Button block onClick={downloadBackupPackage}>下载完整项目包 JSON</Button>
                <Button block loading={commercialToolLoading === 'backupImport'} onClick={() => setBackupImportOpen(true)}>导入项目备份 JSON</Button>
                <Button block onClick={() => setQualityBenchmarkOpen(true)}>导出前质量基准</Button>
                <Button block onClick={() => setConsistencyGraphOpen(true)}>导出前一致性图谱</Button>
              </Space>
            </Card>
          </div>
        </Space>
      </Modal>

      <Modal
        open={creativeCommandOpen}
        title="本地自然语言创作指令台"
        width={820}
        onCancel={() => setCreativeCommandOpen(false)}
        footer={(
          <Space>
            <Button onClick={() => setCreativeCommandOpen(false)}>关闭</Button>
            <Button loading={commercialToolLoading === 'creativeCommand'} onClick={() => { void runCreativeCommand(false) }}>解析指令</Button>
            <Button type="primary" loading={commercialToolLoading === 'creativeCommand'} onClick={() => { void runCreativeCommand(true) }}>执行安全步骤</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="当前指令台使用本地规则解析，不调用大模型；生成、发布、覆盖正文这类高风险动作只会给出操作计划，不会绕过现有确认流程。"
          />
          <Input.TextArea
            rows={4}
            value={creativeCommandText}
            onChange={(event) => setCreativeCommandText(event.target.value)}
            placeholder="例如：帮我检查全书有没有水文和重复，再看一下状态机是否落后；或者：我想继续写第12章，但先确认材料是否完整。"
          />
          {creativeCommandPlan && (
            <Card size="small" title="解析结果">
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue" bordered={false}>置信度 {Math.round(Number(creativeCommandPlan.plan?.confidence || 0) * 100)}%</Tag>
                  <Tag bordered={false}>下一入口 {creativeCommandPlan.plan?.next_ui || '-'}</Tag>
                  <Tag color={(creativeCommandPlan.executed || []).length ? 'green' : 'default'} bordered={false}>已执行 {(creativeCommandPlan.executed || []).length}</Tag>
                </Space>
                {(creativeCommandPlan.plan?.warnings || []).map((item: string) => <Alert key={item} type="warning" showIcon message={item} />)}
                <List
                  size="small"
                  dataSource={creativeCommandPlan.plan?.actions || []}
                  renderItem={(action: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space><Text strong>{action.label}</Text><Tag color={action.executable ? 'green' : 'gold'} bordered={false}>{action.executable ? '可安全执行' : '需人工确认'}</Tag><Tag bordered={false}>{action.method}</Tag></Space>}
                        description={<Space direction="vertical" size={2}><Text type="secondary">{action.reason}</Text><Text type="secondary" style={{ fontSize: 12 }}>{action.endpoint}</Text></Space>}
                      />
                    </List.Item>
                  )}
                />
                {(creativeCommandPlan.executed || []).length > 0 && (
                  <Card size="small" title="执行结果">
                    <List
                      size="small"
                      dataSource={creativeCommandPlan.executed}
                      renderItem={(item: any) => (
                        <List.Item>
                          <Space direction="vertical" size={2}>
                            <Text>{item.key}：{item.status}{item.report?.score !== undefined ? `，评分 ${item.report.score}` : ''}</Text>
                            {item.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{item.report.summary}</Text>}
                            {Array.isArray(item.report?.risks) && item.report.risks.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>风险：{item.report.risks.slice(0, 2).join('；')}</Text>}
                            {Array.isArray(item.report?.next_actions) && item.report.next_actions.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>下一步：{item.report.next_actions.slice(0, 2).join('；')}</Text>}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Modal>

      <Modal
        open={backupImportOpen}
        title="导入项目备份 JSON"
        width={760}
        onCancel={() => setBackupImportOpen(false)}
        confirmLoading={commercialToolLoading === 'backupImport'}
        okText="导入为新项目"
        cancelText="取消"
        onOk={() => { void importBackupPackage() }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="导入会创建一个新项目，不会覆盖当前项目。"
            description="请粘贴通过“下载完整项目包 JSON”导出的内容。导入后会自动跳转到新项目。"
          />
          <Input.TextArea
            rows={12}
            value={backupImportText}
            onChange={(event) => setBackupImportText(event.target.value)}
            placeholder='{"package_type":"novel_project_backup", ...}'
          />
        </Space>
      </Modal>

      <Modal
        open={writingBibleOpen}
        title="写作圣经"
        width={860}
        onCancel={() => setWritingBibleOpen(false)}
        footer={[
          <Button key="generate" onClick={generateWritingBibleEditor} loading={writingBibleGenerating}>
            自动生成
          </Button>,
          <Button key="cancel" onClick={() => setWritingBibleOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={saveWritingBibleEditor}>
            保存
          </Button>,
        ]}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="可以从项目简介、世界观、角色、大纲、章节和参考配置自动生成写作圣经；风格锁定会先按当前商业网文阅读习惯填入默认值，生成后仍可人工微调。"
        />
        <Form form={writingBibleForm} layout="vertical">
          <Card size="small" title="创建契约" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item name="reader_promise" label="读者承诺" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="protagonist_drive" label="主角驱动力" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="core_conflict" label="核心矛盾" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="current_volume_goal" label="当前卷目标" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="innovation_hook" label="创新钩子" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="first30_plan" label="前30章策略" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
            <Form.Item name="longform_capacity" label="长篇容量" style={{ marginTop: 12, marginBottom: 0 }}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Card>
          <Form.Item name="promise" label="读者承诺 / 核心卖点">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Card size="small" title="风格锁定" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <Form.Item name="narrative_person" label="叙事人称" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="sentence_length" label="句长倾向" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="dialogue_ratio" label="对话比例" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="payoff_density" label="爽点密度" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="description_density" label="描写浓度" style={{ marginBottom: 0 }}><Input /></Form.Item>
              <Form.Item name="chapter_word_range" label="章节字数范围" style={{ marginBottom: 0 }}><Input /></Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
              <Form.Item name="banned_words" label="禁用词/句式" style={{ marginBottom: 0 }}><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="preferred_words" label="常用词/风格词" style={{ marginBottom: 0 }}><Input.TextArea rows={3} /></Form.Item>
            </div>
          </Card>
          <Form.Item name="world_rules" label="世界规则 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="mainline" label="主线 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="volume_plan" label="分卷计划 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="style_lock" label="风格锁定 JSON">
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="safety_policy" label="仿写安全策略 JSON">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="forbidden" label="禁止项 JSON">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="meme_bank" label="网感素材池 JSON">
            <Input.TextArea
              rows={5}
              placeholder='[{"meme_key":"社畜共鸣","function":"高压后的半拍吐槽","tone":"轻度","suitable_genres":["规则怪谈"],"abstract_usage":"只转化为角色口吻，不直接复刻原句"}]'
            />
          </Form.Item>
          <Card
            size="small"
            title="风格样章库"
            style={{ marginBottom: 12 }}
            extra={(
              <Space size={8} wrap>
                <Button size="small" onClick={fillDefaultStyleSampleBank}>填入默认风格样本库</Button>
                <Button size="small" loading={styleSampleCandidateLoading} onClick={extractStyleSampleCandidates}>从高分章节提炼样本候选</Button>
              </Space>
            )}
          >
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message="只学习抽象策略，不复制样章原句"
              description="样本库只描述场景功能、适用/不适用场景、叙述节奏、句式密度、对白比例和角色口吻；unsafe_direct_phrases 会作为禁抄短语进入生成和复盘。"
            />
            <div style={{ marginBottom: 10, padding: '8px 10px', background: '#f7f9fc', border: '1px solid #e5eaf3', borderRadius: 6 }}>
              <Space size={6} wrap style={{ marginBottom: styleSampleEffectivenessItems.length ? 6 : 0 }}>
                <Text strong style={{ fontSize: 13 }}>样章效果回收</Text>
                {styleSampleEffectivenessLoading ? (
                  <Tag bordered={false}>加载中</Tag>
                ) : styleSampleEffectiveness ? (
                  <>
                    <Tag bordered={false}>已用 {styleSampleEffectiveness.used_sample_count || 0}/{styleSampleEffectiveness.total_samples || 0}</Tag>
                    <Tag color={styleSampleEffectiveness.risky_sample_count > 0 ? 'orange' : 'green'} bordered={false}>需复盘 {styleSampleEffectiveness.risky_sample_count || 0}</Tag>
                    {styleSampleEffectiveness.risky_sample_count > 0 && (
                      <Button
                        size="small"
                        type="link"
                        loading={styleSamplePatchLoadingKey === 'batch'}
                        onClick={() => { void previewStyleSampleAdjustmentBatch() }}
                      >
                        批量预览补丁
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="link"
                      loading={styleSamplePatchLoadingKey === 'undo'}
                      onClick={() => { void undoStyleSampleAdjustmentPatch() }}
                    >
                      撤销上次补丁
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      loading={styleSamplePatchLoadingKey === 'review'}
                      onClick={() => { void reviewStyleSampleAdjustmentPatch() }}
                    >
                      应用后复检
                    </Button>
                  </>
                ) : (
                  <Tag bordered={false}>暂无回收数据</Tag>
                )}
              </Space>
              {styleSampleEffectivenessItems.length > 0 && (
                <Space size={6} wrap>
                  {styleSampleEffectivenessItems.map((item: any) => {
                    const riskLabel = item.risk_label || '表现稳定'
                    const adjustment = item.adjustment_suggestion || {}
                    const adjustmentLabel = adjustment.label || (riskLabel === '需复盘' ? '补禁抄短语' : '保留策略')
                    const adjustmentText = `调整建议：${adjustmentLabel}${adjustment.detail ? `｜${adjustment.detail}` : ''}`
                    const chapterTitle = Array.isArray(item.chapter_refs) && item.chapter_refs.length
                      ? `关联章节：${item.chapter_refs.map((ref: any) => `第${ref.chapter_no || '?'}章`).join('、')}`
                      : '还没有关联章节'
                    const title = `${chapterTitle}；${adjustmentText}`
                    return (
                      <Space key={item.sample_key} size={4} wrap={false}>
                        <Tooltip title={title}>
                          <Tag color={riskLabel === '需复盘' ? 'orange' : riskLabel === '表现稳定' ? 'green' : 'default'} bordered={false}>
                            {item.sample_key} · 使用 {item.usage_count || 0} · 命中率 {item.hit_rate || 0}% · 风格 {item.average_style_score || '-'} · {riskLabel}
                            {riskLabel === '需复盘' ? ` · 调整建议 ${adjustmentLabel}` : ''}
                          </Tag>
                        </Tooltip>
                        {riskLabel === '需复盘' && (
                          <Button
                            size="small"
                            type="link"
                            loading={styleSamplePatchLoadingKey === item.sample_key}
                            onClick={() => { void previewStyleSampleAdjustmentPatch(item) }}
                          >
                            预览补丁
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </div>
            <Form.Item name="style_sample_bank" label="风格样章库 JSON" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={5}
                placeholder='[{"sample_key":"规则危机反打","scene_function":"规则压力下的动作反制","applicable_scenes":["高压反打","规则压迫"],"avoid_scenes":["纯背景说明","低压日常过场"],"narrative_rhythm":"先压迫，再拆规则，再小反打","sentence_pattern":"短中句为主，解释压短","dialogue_ratio":"35%-45%","abstract_usage":"只学习节奏、句式密度、对白比例和情绪转折","unsafe_direct_phrases":["原句不能照搬"]}]'
              />
            </Form.Item>
          </Card>
          <Form.Item name="chapter_benchmark_sample_bank" label="章节质量基准样例库 JSON">
            <Input.TextArea
              rows={5}
              placeholder='[{"sample_key":"规则怪谈第一夜","genre":"规则怪谈","opening_hook":"开篇300字出现死亡规则和反常边界","conflict_pattern":"主角冲动试探规则，智者低成本验证边界","payoff_pattern":"规则反制蛮力，同时给出可学习生路","ending_hook_pattern":"章末出现救或不救的选择","scene_budget_pattern":"边界验证/队友分歧/外部威胁敲门","do_not_copy":["不得复制样例桥段、角色名、设定和原句"]}]'
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={storyStateOpen}
        title="故事状态机校正"
        width={860}
        onCancel={() => setStoryStateOpen(false)}
        onOk={saveStoryStateEditor}
        okText="保存校正"
      >
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="这里用于人工修正角色位置、关系、秘密、道具、伏笔、主线进度和时间线。保存后后续生成会优先读取这个状态。" />
        <Form form={storyStateForm} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Form.Item name="character_positions" label="角色位置 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="character_relationships" label="角色关系 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="known_secrets" label="已知秘密 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="item_ownership" label="道具归属 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="foreshadowing_status" label="伏笔状态 JSON"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="timeline" label="时间线 JSON"><Input.TextArea rows={4} /></Form.Item>
          </div>
          <Form.Item name="mainline_progress" label="主线进度">
            <Input />
          </Form.Item>
          <Form.Item name="story_state" label="故事状态 JSON" rules={[{ required: true, message: '请输入故事状态 JSON' }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!future100Draft}
        title="确认未来100章骨架写入"
        width={980}
        onCancel={() => {
          setFuture100Draft(null)
          setFuture100SelectedNos([])
        }}
        confirmLoading={future100ApplyLoading}
        okText={`写入选中 ${future100SelectedNos.length} 章`}
        cancelText="暂不写入"
        onOk={applyFuture100SkeletonDraft}
      >
        {future100Draft && (() => {
          const rows = future100Draft.write_preview?.rows || []
          const selectableNos = rows.filter((row: any) => row.action !== 'skipped').map((row: any) => Number(row.chapter_no)).filter(Boolean)
          const selectedSet = new Set(future100SelectedNos)
          const allChecked = selectableNos.length > 0 && selectableNos.every((chapterNo: number) => selectedSet.has(chapterNo))
          const partialChecked = selectableNos.some((chapterNo: number) => selectedSet.has(chapterNo)) && !allChecked
          return (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="生成结果尚未写入。请确认要创建或覆盖的章节骨架。"
                description={`创建 ${future100Draft.write_preview?.created || 0}，覆盖 ${future100Draft.write_preview?.updated || 0}，跳过 ${future100Draft.write_preview?.skipped || 0}`}
              />
              <Space wrap>
                <Checkbox
                  checked={allChecked}
                  indeterminate={partialChecked}
                  onChange={(event) => setFuture100SelectedNos(event.target.checked ? selectableNos : [])}
                >
                  全选可写入章节
                </Checkbox>
                <Tag color="blue" bordered={false}>已选 {future100SelectedNos.length}</Tag>
                <Tag color="green" bordered={false}>新建 {rows.filter((row: any) => row.action === 'create' && selectedSet.has(Number(row.chapter_no))).length}</Tag>
                <Tag color="gold" bordered={false}>覆盖 {rows.filter((row: any) => row.action === 'update' && selectedSet.has(Number(row.chapter_no))).length}</Tag>
              </Space>
              <Card size="small" title="差异列表">
                <List
                  size="small"
                  dataSource={rows.slice(0, 120)}
                  renderItem={(row: any) => {
                    const chapterNo = Number(row.chapter_no)
                    const disabled = row.action === 'skipped'
                    const checked = selectedSet.has(chapterNo)
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={(
                            <Checkbox
                              checked={checked}
                              onChange={(event) => {
                                setFuture100SelectedNos(prev => {
                                  const next = new Set(prev)
                                  if (event.target.checked) next.add(chapterNo)
                                  else next.delete(chapterNo)
                                  return Array.from(next).sort((a, b) => a - b)
                                })
                              }}
                            />
                          )}
                          title={(
                            <Space wrap>
                              <Tag color={row.action === 'create' ? 'green' : row.action === 'update' ? 'gold' : 'default'} bordered={false}>
                                {row.action === 'create' ? '新建' : row.action === 'update' ? '覆盖' : '跳过'}
                              </Tag>
                              <Text>第{row.chapter_no}章 {row.title || '未命名'}</Text>
                              {row.existing_outline_id && <Tag bordered={false}>原大纲 #{row.existing_outline_id}</Tag>}
                              {row.changed === false && <Tag color="default" bordered={false}>内容接近</Tag>}
                            </Space>
                          )}
                          description={(
                            <Space direction="vertical" size={2}>
                              {row.existing_summary && <Text type="secondary">原：{row.existing_summary}</Text>}
                              <Text>新：{row.next_summary || '待补齐'}</Text>
                            </Space>
                          )}
                        />
                      </List.Item>
                    )
                  }}
                />
              </Card>
            </Space>
          )
        })()}
      </Modal>

      <TaskCenterDrawer
        open={taskCenterOpen}
        activeTasks={activeTasks}
        runRecords={runRecords}
        productionTasks={productionTasks}
        knowledgeIngestJobs={knowledgeIngestJobs}
        loading={loading || productionTasksLoading}
        knowledgeJobsLoading={knowledgeJobsLoading}
        safeBatchRecoveryFocus={taskCenterRecoveryFocus}
        onClose={() => {
          setTaskCenterOpen(false)
          setTaskCenterRecoveryFocus(null)
        }}
        onRefresh={async () => { if (await flushPendingSave()) { await loadProjectModules(); await loadProductionTasks() } }}
        onRefreshKnowledgeJobs={loadKnowledgeIngestJobs}
        onPauseKnowledgeJob={(jobId) => { void pauseKnowledgeIngestJob(jobId) }}
        onResumeKnowledgeJob={(jobId) => { void resumeKnowledgeIngestJob(jobId) }}
        onCancelKnowledgeJob={(jobId) => { void cancelKnowledgeIngestJob(jobId) }}
        chapterGroupExecutingId={chapterGroupExecutingId}
        releaseRepairExecutingId={releaseRepairExecutingId}
        onExecuteChapterGroup={executeChapterGroupRun}
        onExecuteReleaseRepairRun={executeReleaseRepairRun}
        onRecoverRunQueue={() => { void recoverRunQueue() }}
        onApproveChapterGroup={approveChapterGroupStage}
        onRetryChapterGroup={retryChapterGroupStage}
        onSkipChapterGroup={skipChapterGroupStage}
        onSelectChapter={(chapterId) => { void locateRepairTaskChapter(chapterId) }}
        onOpenChapterEditor={(chapterId) => { void openRepairTaskChapterEditor(chapterId) }}
        onStartRepairTaskRevision={(task, run, taskIndex, options) => startRepairTaskRevision(task, run, taskIndex, options)}
        onExecuteTypedRepairTask={(task, run, taskIndex, options) => executeTypedRepairTask(task, run, taskIndex, options)}
        onRecheckRepairTask={(task, run, taskIndex, options) => recheckRepairTaskConvergence(task, run, taskIndex, options)}
        onUpdateRepairTaskStatus={(task, run, status, taskIndex) => { void updateRepairTaskStatus(run, taskIndex, status, task?.message || task?.title || '') }}
        onBulkUpdateRepairTaskStatus={(items, status) => { void bulkUpdateRepairTaskStatus(items, status) }}
        onRecheckStyleSampleTaskBooks={(items) => { void recheckStyleSampleTaskBookReviewTasks(items) }}
        onGenerateRepairAuditSummary={(run, options) => generateLongformRepairAuditSummary(run, options)}
        onCreateRecoveryEvidenceGovernanceQueue={async (payload, run, taskIndex) => {
          await createRecoveryEvidenceGovernanceQueue(payload)
          if (run?.id && taskIndex >= 0) {
            await updateRepairTaskStatus(run, taskIndex, 'needs_review', '已生成放行摘要再治理队列，等待治理闭环后复盘')
          }
        }}
        onPauseRun={async (run) => {
          await apiClient.post(`/novel/runs/${run.id}/pause`, { project_id: projectId })
          await loadProjectModules()
          await loadProductionTasks()
          message.success('任务已暂停')
        }}
        onResumeRun={async (run) => {
          try {
            const res = await apiClient.post(`/novel/runs/${run.id}/resume`, { project_id: projectId })
            await loadProjectModules()
            await loadProductionTasks()
            message.success(res.data?.execute_endpoint ? '章节群已标记可继续，可点击执行' : res.data?.resume_endpoint ? '任务已标记可继续，请从当前章节继续生成正文' : '任务已继续')
          } catch (error: any) {
            message.error(formatRunResumeErrorMessage(error))
          }
        }}
      />

      <OutlineTreeModal
        open={outlineTreeOpen}
        treeData={chapterTreeData}
        activeChapterId={activeChapterId}
        activeOutlineIds={future100FocusOutlineIds}
        onClose={() => {
          setOutlineTreeOpen(false)
          setFuture100FocusOutlineIds([])
        }}
        onCreateOutline={() => { setOutlineTreeOpen(false); setFuture100FocusOutlineIds([]); openEditor('outline') }}
        onSelectOutline={(outlineId) => {
          const outline = outlines.find(item => Number(item.id) === Number(outlineId))
          if (outline) {
            setOutlineTreeOpen(false)
            setFuture100FocusOutlineIds([])
            openEditor('outline', outline)
          }
        }}
        onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId).then((saved) => { if (saved) { setOutlineTreeOpen(false); setFuture100FocusOutlineIds([]) } }) }}
      />

      {/* ═══ Outline Control Panel ═══ */}
      <OutlineControlPanel
        open={outlinePanelOpen}
        onClose={() => setOutlinePanelOpen(false)}
        onGenerate={handleOutlineGenerate}
        existingChapters={chapters}
        existingOutlines={outlines}
      />

      {/* ═══ Chapter Restructure Panel ═══ */}
      <ChapterRestructurePanel
        open={restructurePanelOpen}
        onClose={() => setRestructurePanelOpen(false)}
        selectedChapters={selectedChaptersList}
        onRestructure={handleRestructure}
      />

        <ChapterManagementDrawer
          open={chapterDrawerOpen}
          onClose={() => setChapterDrawerOpen(false)}
          chapters={chapters}
          proseChapters={proseChapters}
          filteredChapters={filteredChapters}
          activeChapter={activeChapter}
          activeChapterId={activeChapterId}
          selectedChapterIds={selectedChapterIds}
          selectMode={selectMode}
          chapterSearch={chapterSearch}
          chapterStatusFilter={chapterStatusFilter}
          chapterSortMode={chapterSortMode}
          generatingProse={generatingProse}
          onCreateChapter={() => openEditor('chapter')}
          onEditChapter={(chapter) => openEditor('chapter', chapter)}
          onDeleteChapter={deleteChapter}
          onBatchDelete={async (chapterIds) => {
            for (const cid of chapterIds) await apiClient.delete(`/novel/chapters/${cid}`)
            setSelectedChapterIds(new Set())
            await loadProjectModules()
            message.success('已批量删除')
          }}
          onGenerateCurrentChapterProse={generateCurrentChapterProse}
          onOpenRestructure={() => { setSelectMode(true); setRestructurePanelOpen(true) }}
          onOpenVersionHistory={() => { setRightPanelOpen(true); setRightPanelTab('versions'); setChapterDrawerOpen(false) }}
          onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
          onSetSelectMode={setSelectMode}
          onSetSelectedChapterIds={setSelectedChapterIds}
          onSetChapterSearch={setChapterSearch}
          onSetChapterStatusFilter={setChapterStatusFilter}
          onSetChapterSortMode={setChapterSortMode}
        />
      </DeferredWorkspaceSurfaces>
  )
}
