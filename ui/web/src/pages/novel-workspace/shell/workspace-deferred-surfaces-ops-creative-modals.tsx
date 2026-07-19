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

export function NovelWorkspaceDeferredOpsCreativeModals(props: NovelWorkspaceDeferredSurfacesProps) {
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
    commercialToolLoading,
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
    creativeCommandPlan,
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
    loading,
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
    productionTasksLoading,
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
    styleSampleEffectiveness,
    styleSampleEffectivenessItems,
    styleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey,
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
    chapterId,
    future100Draft,
    future100SelectedNos,
    id,
  } = props




  return (
    <>
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

    </>
  )
}
