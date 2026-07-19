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

export function NovelWorkspaceDeferredCoreSurfaces(props: NovelWorkspaceDeferredSurfacesProps) {
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

    </>
  )
}
