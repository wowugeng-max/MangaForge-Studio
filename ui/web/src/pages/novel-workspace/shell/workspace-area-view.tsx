import React from 'react'
import { Button, Card, InputNumber, Space, Tag, Typography } from 'antd'
import { AutoCreationDirectorWorkspace } from '../AutoCreationDirectorWorkspace'
import { StoryPlanningWorkspace } from '../StoryPlanningWorkspace'
import { WorkspaceCenter } from '../WorkspaceCenter'
import { StoryAssetsWorkspace } from '../StoryAssetsWorkspace'
import type { WorkspaceArea } from './workspace-types'
import apiClient from '../../../api/client'
import { useChapterKernelJob } from './use-chapter-kernel-job'
import type { ChapterRewriteSelection } from './use-chapter-rewrite-job'

const { Text, Title, Paragraph } = Typography

export type NovelWorkspaceAreaViewProps = {
  activeChapter: any
  activeChapterDiagnosticsData: any
  activeChapterId: any
  applyStyleSampleActionForActiveChapter: any
  autoCreationDirectorModel: any
  autoDirectorActionLoadingKey: any
  bookReviewLoading: any
  buildPreDraftBriefForActiveChapter: any
  chapterTargetWordCount: any
  chapterWordTargetMode: any
  writingSkillsEnabled: any
  setWritingSkillsEnabled: any
  writingSkillsCatalog: any
  fictionHumanizerMode: any
  setFictionHumanizerMode: any
  characters: any
  commercialToolLoading: any
  confirmPreDraftBriefForActiveChapter: any
  continuityAudit: any
  createEditorReport: any
  dashboardLoading: any
  diagnosticsLoading: any
  editorReportLoading: any
  editorRevisionTask: any
  cancelEditorRevision: any
  retryEditorRevision: any
  loadEditorRevisionDiagnostics: any
  generateCurrentChapterProse: any
  generateSceneCardsForActiveChapter: any
  generatingProse: any
  rewriteSelection?: ChapterRewriteSelection | null
  onWriteContinue?: () => void
  onCancelContinue?: () => void
  generatingSceneCards: any
  generationPipeline: any
  handleAutoCreationDirectorAction: any
  handlePlanningAction: any
  handleWritingCockpitAction: any
  id: any
  incubatingOriginal: any
  isEmptyProject: any
  isImmersiveShell: any
  loadProjectModules: any
  openChapterQualityCard: any
  openContinuityAudit: any
  openEditor: any
  openGenerationDiagnostics: any
  openProductionDashboard: any
  openProductionDesk: any
  openProductionMetrics: any
  openRunQueue: any
  openStoryAssetsWorkspace: any
  openStoryStateEditor: any
  openWritingBibleEditor: any
  outlines: any
  pipelineLoading: any
  planning: any
  planningLoadingKey: any
  planningWorkspaceModel: any
  projectId: any
  projectSettings: any
  proseEditorRef: any
  proseQualityLoading: any
  proseQualityReports: any
  ohStoryReviews?: any
  editorRevisionReports: any
  applyEditorRevision: any
  ohStoryReview?: any
  ohStoryDeslop?: any
  ohStoryApply?: any
  flushPendingSave?: any
  refreshActiveProseQuality: any
  repairActiveDeslopGate: any
  repairChapterPreflightMaterials: any
  repairContextAndGenerateCurrentChapter: any
  repairWritingQueuePlan: any
  repairWritingQueuePlanBatch: any
  runBookReview: any
  runOriginalIncubator: any
  runPlan: any
  runReferenceMigrationPlan: any
  savePreDraftBriefForActiveChapter: any
  saveStatus: any
  scheduleSave: any
  selectChapterForWriting: any
  selectedModelId: any
  selectedProject: any
  setAgentAuditOpen: any
  setChapterTargetWordCount: any
  setChapterWordTargetMode: any
  setChapters: any
  setCommercialToolsOpen: any
  setConsistencyGraphOpen: any
  setCreativeCardsOpen: any
  setExportDeliveryOpen: any
  setQualityBenchmarkOpen: any
  setReferenceConfigOpen: any
  setReferenceEngineeringOpen: any
  setReviewAnnotationsOpen: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setTaskCenterOpen: any
  setUnattendedTargetChapter: any
  setWorkspaceArea: any
  sortedChapters: any
  startChapterGroupGeneration: any
  startChapterPipeline: any
  startReadyChapterGroupGeneration: any
  startUnattendedWritingGoal: any
  storyAssetsFocusDiscoveredToken: any
  streamingChapterId: any
  streamingEndRef: any
  streamingPercent: any
  streamingProgress: any
  streamingText: any
  unattendedTargetChapter: any
  workspaceArea: any
  worldbuilding: any
  writingCockpitModel: any
  writingRecommendation: any
}

export function NovelWorkspaceAreaView(props: NovelWorkspaceAreaViewProps) {
  const {
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    applyStyleSampleActionForActiveChapter,
    autoCreationDirectorModel,
    autoDirectorActionLoadingKey,
    bookReviewLoading,
    buildPreDraftBriefForActiveChapter,
    chapterTargetWordCount,
    chapterWordTargetMode,
    writingSkillsEnabled,
    setWritingSkillsEnabled,
    writingSkillsCatalog,
    fictionHumanizerMode,
    setFictionHumanizerMode,
    characters,
    commercialToolLoading,
    confirmPreDraftBriefForActiveChapter,
    continuityAudit,
    createEditorReport,
    dashboardLoading,
    diagnosticsLoading,
    editorReportLoading,
    editorRevisionTask,
    cancelEditorRevision,
    retryEditorRevision,
    loadEditorRevisionDiagnostics,
    generateCurrentChapterProse,
    generateSceneCardsForActiveChapter,
    generatingProse,
    rewriteSelection,
    onWriteContinue,
    onCancelContinue,
    generatingSceneCards,
    generationPipeline,
    handleAutoCreationDirectorAction,
    handlePlanningAction,
    handleWritingCockpitAction,
    id,
    incubatingOriginal,
    isEmptyProject,
    isImmersiveShell,
    loadProjectModules,
    openChapterQualityCard,
    openContinuityAudit,
    openEditor,
    openGenerationDiagnostics,
    openProductionDashboard,
    openProductionDesk,
    openProductionMetrics,
    openRunQueue,
    openStoryAssetsWorkspace,
    openStoryStateEditor,
    openWritingBibleEditor,
    outlines,
    pipelineLoading,
    planning,
    planningLoadingKey,
    planningWorkspaceModel,
    projectId,
    projectSettings,
    proseEditorRef,
    proseQualityLoading,
    proseQualityReports,
    ohStoryReviews,
    editorRevisionReports,
    applyEditorRevision,
    ohStoryReview,
    ohStoryDeslop,
    ohStoryApply,
    flushPendingSave,
    refreshActiveProseQuality,
    repairActiveDeslopGate,
    repairChapterPreflightMaterials,
    repairContextAndGenerateCurrentChapter,
    repairWritingQueuePlan,
    repairWritingQueuePlanBatch,
    runBookReview,
    runOriginalIncubator,
    runPlan,
    runReferenceMigrationPlan,
    savePreDraftBriefForActiveChapter,
    saveStatus,
    scheduleSave,
    selectChapterForWriting,
    selectedModelId,
    selectedProject,
    setAgentAuditOpen,
    setChapterTargetWordCount,
    setChapterWordTargetMode,
    setChapters,
    setCommercialToolsOpen,
    setConsistencyGraphOpen,
    setCreativeCardsOpen,
    setExportDeliveryOpen,
    setQualityBenchmarkOpen,
    setReferenceConfigOpen,
    setReferenceEngineeringOpen,
    setReviewAnnotationsOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setTaskCenterOpen,
    setUnattendedTargetChapter,
    setWorkspaceArea,
    sortedChapters,
    startChapterGroupGeneration,
    startChapterPipeline,
    startReadyChapterGroupGeneration,
    startUnattendedWritingGoal,
    storyAssetsFocusDiscoveredToken,
    streamingChapterId,
    streamingEndRef,
    streamingPercent,
    streamingProgress,
    streamingText,
    unattendedTargetChapter,
    workspaceArea,
    worldbuilding,
    writingCockpitModel,
    writingRecommendation,
  } = props

  const kernelJob = useChapterKernelJob({
    apiClient,
    projectId: Number(projectId || 0),
    chapterId: Number(activeChapterId || activeChapter?.id || 0),
    modelId: Number(selectedModelId || 0),
    reviews: Array.isArray(ohStoryReviews) ? ohStoryReviews : [],
    chapter: activeChapter,
    flushPendingSave: async () => {
      if (typeof flushPendingSave !== 'function') return true
      return Boolean(await flushPendingSave())
    },
    loadProjectModules: async () => {
      await loadProjectModules?.()
    },
  })
  const kernelBusyAction = kernelJob.state.phase === 'running' ? kernelJob.state.action : null
  const kernelBusyElapsedSec = kernelJob.state.phase === 'running' ? kernelJob.state.elapsedSec : undefined
  const kernelBusyHint = kernelJob.state.phase === 'running' ? kernelJob.state.hint : ''
  const [kernelPreview, setKernelPreview] = React.useState<{ content: string; truncated: boolean } | null>(null)
  const [kernelCommitBusy, setKernelCommitBusy] = React.useState(false)
  const kernelJobDetail = kernelJob.state.phase === 'awaiting_selection' ? kernelJob.state.detail : null

  React.useEffect(() => {
    if (kernelJob.state.phase === 'awaiting_selection') return
    setKernelPreview(null)
    setKernelCommitBusy(false)
  }, [kernelJob.state.phase])

  if (workspaceArea === 'autoCreation') {
    return (
      <AutoCreationDirectorWorkspace
        model={autoCreationDirectorModel}
        loadingActionKey={autoDirectorActionLoadingKey}
        onAction={handleAutoCreationDirectorAction}
        onStageAction={handleAutoCreationDirectorAction}
        onSelectChapter={(chapterNo) => {
          const chapter = sortedChapters.find(item => Number(item.chapter_no) === Number(chapterNo))
          if (!chapter) return
          void selectChapterForWriting(chapter.id)
        }}
      />
    )
  }

  if (workspaceArea === 'storyPlanning') {
    return (
      <StoryPlanningWorkspace
        model={planningWorkspaceModel}
        selectedModelId={selectedModelId}
        loadingKey={planningLoadingKey}
        onAction={handlePlanningAction}
        onSelectChapter={(chapterNo) => {
          const chapter = sortedChapters.find(item => Number(item.chapter_no) === Number(chapterNo))
          if (!chapter) return
          void selectChapterForWriting(chapter.id)
        }}
      />
    )
  }

  if (workspaceArea === 'chapterWriting') {
    return (
      <WorkspaceCenter
        isEmptyProject={isEmptyProject}
        selectedProject={selectedProject}
        activeChapter={activeChapter}
        materialScore={activeChapterDiagnosticsData?.material_score}
        worldbuildingCount={worldbuilding.length}
        characterCount={characters.length}
        outlineCount={outlines.length}
        streamingChapterId={streamingChapterId}
        streamingText={streamingText}
        streamingProgress={streamingProgress}
        streamingPercent={streamingPercent}
        generationPipeline={generationPipeline}
        streamingEndRef={streamingEndRef}
        proseEditorRef={proseEditorRef}
        saveStatus={saveStatus}
        planning={planning}
        incubatingOriginal={incubatingOriginal}
        generatingProse={generatingProse}
        rewriteSelection={rewriteSelection}
        onWriteContinue={onWriteContinue}
        onCancelContinue={onCancelContinue}
        generatingSceneCards={generatingSceneCards}
        preDraftBriefLoading={commercialToolLoading === 'preDraftBrief' || commercialToolLoading === 'preDraftBriefConfirm'}
        styleSampleActionLoading={['styleSampleLock', 'styleSampleReplace', 'styleSampleDisable'].includes(commercialToolLoading)}
        diagnosticsLoading={diagnosticsLoading}
        pipelineLoading={pipelineLoading}
        editorReportLoading={editorReportLoading}
        onRunPlan={runPlan}
        onCreateOutline={() => openEditor('outline')}
        onCreateChapter={() => openEditor('chapter')}
        onRunOriginalIncubator={() => { void runOriginalIncubator() }}
        onOpenReferenceConfig={() => setReferenceConfigOpen(true)}
        onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
        onGenerateCurrentChapterProse={() => generateCurrentChapterProse()}
        onRepairAndGenerateCurrentChapter={repairContextAndGenerateCurrentChapter}
        onGenerateSceneCards={() => generateSceneCardsForActiveChapter()}
        onBuildPreDraftBrief={() => { void buildPreDraftBriefForActiveChapter() }}
        onConfirmPreDraftBrief={() => { void confirmPreDraftBriefForActiveChapter() }}
        onSavePreDraftBrief={(brief) => savePreDraftBriefForActiveChapter(brief)}
        onLockStyleSamples={() => { void applyStyleSampleActionForActiveChapter('lock') }}
        onReplaceStyleSamples={() => { void applyStyleSampleActionForActiveChapter('replace') }}
        onDisableStyleSamples={() => { void applyStyleSampleActionForActiveChapter('disable') }}
        onOpenGenerationDiagnostics={openGenerationDiagnostics}
        onOpenQualityCard={openChapterQualityCard}
        onStartChapterPipeline={startChapterPipeline}
        onCreateEditorReport={createEditorReport}
        onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
        onOpenStoryAssets={openStoryAssetsWorkspace}
        generationWordTargetMode={chapterWordTargetMode}
        generationTargetWordCount={chapterTargetWordCount}
        onGenerationWordTargetModeChange={setChapterWordTargetMode}
        onGenerationTargetWordCountChange={setChapterTargetWordCount}
        writingSkillsEnabled={writingSkillsEnabled}
        onWritingSkillsEnabledChange={setWritingSkillsEnabled}
        writingSkillsCatalog={writingSkillsCatalog}
        fictionHumanizerMode={fictionHumanizerMode}
        onFictionHumanizerModeChange={setFictionHumanizerMode}
        writingRecommendation={writingRecommendation}
        writingQueue={writingCockpitModel.writingQueue}
        onSelectWritingQueueChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
        onRepairWritingQueuePlan={repairWritingQueuePlan}
        onRepairWritingQueuePlanBatch={repairWritingQueuePlanBatch}
        chapterAcceptanceDesk={writingCockpitModel.chapterAcceptanceDesk}
        chapterHandoffDesk={writingCockpitModel.chapterHandoffDesk}
        deliveryActionLoading={proseQualityLoading || editorReportLoading || generatingProse}
        onDeliveryAction={handleWritingCockpitAction}
        onRepairDeslopGate={repairActiveDeslopGate}
        onOpenVersionHistory={() => {
          setRightPanelOpen?.(true)
          setRightPanelTab?.('versions')
        }}
        onFocusQualityPanel={() => {
          setRightPanelOpen?.(true)
          setRightPanelTab?.('proseQuality')
        }}
        proseQualityReports={proseQualityReports}
        ohStoryReviews={ohStoryReviews}
        editorRevisionReports={editorRevisionReports}
        editorRevisionTask={editorRevisionTask}
        proseQualityLoading={proseQualityLoading}
        onRefreshProseQuality={() => { void refreshActiveProseQuality?.('manual_refresh') }}
        onRepairPreflightGaps={async () => {
          const repaired = await repairChapterPreflightMaterials?.()
          if (repaired) void refreshActiveProseQuality?.('preflight_repair')
        }}
        onApplyEditorRevision={applyEditorRevision}
        onOhStoryReview={() => { void kernelJob.start('review') }}
        onOhStoryApply={() => { void kernelJob.start('apply') }}
        onOhStoryDeslop={() => { void kernelJob.start('deslop') }}
        kernelJobAction={kernelBusyAction}
        kernelJobElapsedSec={kernelBusyElapsedSec}
        kernelJobHint={kernelBusyHint}
        ohStoryAction={kernelBusyAction}
        ohStoryElapsedSec={kernelBusyElapsedSec}
        onCancelKernelJob={() => { void kernelJob.cancel() }}
        kernelContracts={kernelJob.contracts}
        kernelSelectedContractIds={kernelJob.selectedContractIds.review}
        kernelSelectedContractIdsByAction={kernelJob.selectedContractIds}
        onKernelSelectedContractIdsChange={kernelJob.setSelectedContractIds}
        kernelJobDetail={kernelJobDetail}
        kernelCandidatePreview={kernelPreview}
        kernelCommitBusy={kernelCommitBusy}
        onKernelPreviewArtifact={(artifactId) => {
          void kernelJob.loadArtifact(artifactId).then((result) => {
            setKernelPreview(result)
          })
        }}
        onKernelCommitCandidate={(candidateId) => {
          setKernelCommitBusy(true)
          void kernelJob.commit(candidateId).finally(() => setKernelCommitBusy(false))
        }}
        onCancelEditorRevision={cancelEditorRevision}
        onRetryEditorRevision={retryEditorRevision}
        onLoadEditorRevisionDiagnostics={loadEditorRevisionDiagnostics}
        isImmersiveShell={isImmersiveShell}
        onChapterTextChange={(next) => {
          const chapterId = activeChapterId
          setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, chapter_text: next } : c))
          scheduleSave(chapterId, next)
        }}
      />
    )
  }

  if (workspaceArea === 'storyAssets') {
    return (
      <StoryAssetsWorkspace
        projectId={projectId}
        activeChapter={activeChapter}
        selectedModelId={selectedModelId}
        projectSettings={projectSettings}
        worldbuildingCount={worldbuilding.length}
        characterCount={characters.length}
        outlineCount={outlines.length}
        hasWritingBible={Boolean(selectedProject?.reference_config?.writing_bible)}
        focusDiscoveredAssetsToken={storyAssetsFocusDiscoveredToken}
        onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
        onOpenStoryStateEditor={openStoryStateEditor}
        onOpenCreativeCards={() => setCreativeCardsOpen(true)}
        onOpenReferenceEngineering={() => setReferenceEngineeringOpen(true)}
        onAssetsApplied={() => { void loadProjectModules() }}
      />
    )
  }

  const groups: Record<Exclude<WorkspaceArea, 'autoCreation' | 'storyPlanning' | 'chapterWriting' | 'storyAssets'>, {
    title: string
    desc: string
    highlightTitle?: string
    highlightDesc?: string
    highlightTarget?: number
    highlightAction?: () => void
    highlightLoading?: boolean
    highlightDisabled?: boolean
    actions: Array<{ label: string; onClick: () => void; loading?: boolean; primary?: boolean; disabled?: boolean }>
  }> = {
    qualityRevision: {
      title: '质检修订',
      desc: '检查当前章、前后文连续性、全书一致性、审阅批注和质量基准。',
      actions: [
        { label: '当前章交稿质检', onClick: openChapterQualityCard, primary: true, disabled: !activeChapter },
        { label: '编辑报告', onClick: createEditorReport, loading: editorReportLoading, disabled: !activeChapter || !selectedModelId },
        { label: '章节审阅批注', onClick: () => setReviewAnnotationsOpen(true) },
        { label: '全书一致性图谱', onClick: () => setConsistencyGraphOpen(true) },
        { label: '质量评测基准', onClick: () => setQualityBenchmarkOpen(true) },
        { label: '全书连续性检查', onClick: () => { void openContinuityAudit() }, loading: commercialToolLoading === 'continuityAudit' },
        { label: '全书总检', onClick: () => { void runBookReview() }, loading: bookReviewLoading, disabled: !selectedModelId },
        { label: '当前章参考迁移计划', onClick: () => { void runReferenceMigrationPlan() }, loading: commercialToolLoading === 'migrationPlan', disabled: !activeChapter },
      ],
    },
    productionOps: {
      title: '生产运营',
      desc: '管理章节群、任务队列、生产趋势、Agent 审计、模型诊断和交付导出。',
      highlightTitle: '无人值守到目标章',
      highlightDesc: '按写前蓝图、场景卡、正文、复检和任务中心自动推进；达标后进入下一章。',
      highlightTarget: unattendedTargetChapter,
      highlightAction: startUnattendedWritingGoal,
      highlightLoading: commercialToolLoading === 'unattendedGoal',
      highlightDisabled: !selectedModelId,
      actions: [
        { label: '章节生产台', onClick: openProductionDesk, primary: true, loading: commercialToolLoading === 'productionDesk' },
        { label: '生产看板', onClick: () => { void openProductionDashboard() }, loading: dashboardLoading },
        { label: '任务中心', onClick: () => setTaskCenterOpen(true) },
        { label: '智能章节群入队', onClick: () => { void startReadyChapterGroupGeneration() }, loading: commercialToolLoading === 'readyGroup', disabled: !selectedModelId },
        { label: '普通章节群入队', onClick: () => { void startChapterGroupGeneration() }, disabled: !selectedModelId },
        { label: '后台任务队列', onClick: openRunQueue, loading: commercialToolLoading === 'queue' },
        { label: '成本质量仪表盘', onClick: openProductionMetrics, loading: commercialToolLoading === 'metrics' },
        { label: 'Agent 调用审计', onClick: () => setAgentAuditOpen(true) },
        { label: '商业工具箱', onClick: () => setCommercialToolsOpen(true) },
        { label: '交付导出', onClick: () => setExportDeliveryOpen(true) },
      ],
    },
  }
  const group = groups[workspaceArea]
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb', padding: 20 }}>
      <Card title={group.title} extra={<Space><Button onClick={() => setWorkspaceArea('chapterWriting')}>返回写作</Button><Button onClick={() => setWorkspaceArea('storyPlanning')}>返回大纲</Button></Space>}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">{group.desc}</Text>
          {group.highlightTitle && (
            <Card size="small" title={group.highlightTitle}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{group.highlightDesc}</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber
                    min={1}
                    precision={0}
                    value={group.highlightTarget}
                    onChange={(value) => setUnattendedTargetChapter(Number(value || 1))}
                    style={{ width: 160 }}
                    addonBefore="到第"
                    addonAfter="章"
                  />
                  <Button
                    type="primary"
                    loading={group.highlightLoading}
                    disabled={group.highlightDisabled}
                    onClick={group.highlightAction}> 启动无人值守
                  </Button>
                </Space.Compact>
              </Space>
            </Card>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {group.actions.map(action => (
              <Button
                key={action.label}
                block
                type={action.primary ? 'primary' : 'default'}
                loading={action.loading}
                disabled={action.disabled}
                onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          </div>
        </Space>
      </Card>
    </div>
  )
}
