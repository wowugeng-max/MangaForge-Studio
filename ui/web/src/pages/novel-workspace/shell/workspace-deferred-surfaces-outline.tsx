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

export function NovelWorkspaceDeferredOutlineSurfaces(props: NovelWorkspaceDeferredSurfacesProps) {
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
    </>
  )
}
