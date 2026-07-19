import React from 'react'
import {
  Alert, Button, Card, Checkbox, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Tooltip, Typography, message,
} from 'antd'
import apiClient from '../../../api/client'
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

export function NovelWorkspaceDeferredOpsToolbox(props: NovelWorkspaceDeferredSurfacesProps) {
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
    <>
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

    </>
  )
}
