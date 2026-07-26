import React, { Suspense } from 'react'
import { ChapterDirectorySidebar } from '../ChapterDirectorySidebar'
import { CreativeAssistantPanel } from '../CreativeAssistantPanel'
import { ReferencePanel } from '../ReferencePanel'
import { WritingCockpitPanel } from '../WritingCockpitPanel'

export type NovelWorkspaceBodyProps = {
  activeChapter: any
  activeChapterDiagnosticsData: any
  activeChapterId: any
  activeContextPackageData: any
  activeKnowledgeJobCount: any
  activeTasks: any
  applyEditorRevision: any
  bookReviews: any
  chapterId: any
  chapterVersions: any
  chapterVersionsLoading: any
  characters: any
  cockpitPrimaryActionOverride: any
  commercialReadiness: any
  commercialToolLoading: any
  contextPackage: any
  contextPackageLoading: any
  copyCreativeAssistantCard: any
  creativeAssistantError: any
  creativeAssistantLoading: any
  creativeAssistantMode: any
  creativeAssistantOpen: any
  creativeAssistantResult: any
  creativeAssistantSelectedText: any
  diagnosticsLoading: any
  directoryCollapsed: any
  directoryShellClassName: any
  editorReports: any
  editorRevisionReports: any
  generatingProse: any
  generatingSceneCards: any
  handleDirectoryCollapsedChange: any
  handleWritingCockpitAction: any
  isImmersiveShell: any
  openEditor: any
  openStoryStateEditor: any
  outlines: any
  projectId: any
  proseChapters: any
  proseProgress: any
  proseQualityLoading: any
  proseQualityReports: any
  referenceReports: any
  refreshActiveProseQuality: any
  renderSerialPipeline: any
  renderWorkspaceArea: any
  reviews: any
  rightPanelOpen: any
  rightPanelTab: any
  rollbackChapterVersion: any
  rollingBackVersionId: any
  runCreativeAssistant: any
  runRecords: any
  selectChapterForWriting: any
  selectedModelId: any
  selectedProject: any
  setChapterDrawerOpen: any
  setChapterVersionDetail: any
  setCreativeAssistantMode: any
  setCreativeAssistantOpen: any
  setCreativeCardsOpen: any
  setOutlineTreeOpen: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setTaskCenterOpen: any
  setWorkspaceArea: any
  showGlobalWritingGuidance: any
  sortedChapters: any
  stepProseLoading: any
  workspaceArea: any
  worldbuilding: any
  writingCockpitModel: any
}

export function NovelWorkspaceBody(props: NovelWorkspaceBodyProps) {
  const {
    activeChapter,
    activeChapterDiagnosticsData,
    activeChapterId,
    activeContextPackageData,
    activeKnowledgeJobCount,
    activeTasks,
    applyEditorRevision,
    bookReviews,
    chapterId,
    chapterVersions,
    chapterVersionsLoading,
    characters,
    cockpitPrimaryActionOverride,
    commercialReadiness,
    commercialToolLoading,
    contextPackage,
    contextPackageLoading,
    copyCreativeAssistantCard,
    creativeAssistantError,
    creativeAssistantLoading,
    creativeAssistantMode,
    creativeAssistantOpen,
    creativeAssistantResult,
    creativeAssistantSelectedText,
    diagnosticsLoading,
    directoryCollapsed,
    directoryShellClassName,
    editorReports,
    editorRevisionReports,
    generatingProse,
    generatingSceneCards,
    handleDirectoryCollapsedChange,
    handleWritingCockpitAction,
    isImmersiveShell,
    openEditor,
    openStoryStateEditor,
    outlines,
    projectId,
    proseChapters,
    proseProgress,
    proseQualityLoading,
    proseQualityReports,
    referenceReports,
    refreshActiveProseQuality,
    renderSerialPipeline,
    renderWorkspaceArea,
    reviews,
    rightPanelOpen,
    rightPanelTab,
    rollbackChapterVersion,
    rollingBackVersionId,
    runCreativeAssistant,
    runRecords,
    selectChapterForWriting,
    selectedModelId,
    selectedProject,
    setChapterDrawerOpen,
    setChapterVersionDetail,
    setCreativeAssistantMode,
    setCreativeAssistantOpen,
    setCreativeCardsOpen,
    setOutlineTreeOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setTaskCenterOpen,
    setWorkspaceArea,
    showGlobalWritingGuidance,
    sortedChapters,
    stepProseLoading,
    workspaceArea,
    worldbuilding,
    writingCockpitModel,
  } = props

  return (
    <>
      {/* ═══ BODY: 3-column layout ═══ */}
      <div className="novel-workspace-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        <div className={directoryShellClassName}>
          <ChapterDirectorySidebar
            collapsed={directoryCollapsed}
            onCollapsedChange={handleDirectoryCollapsedChange}
            planningMode={workspaceArea === 'storyPlanning'}
            proseProgress={proseProgress}
            chapters={sortedChapters}
            proseChapterCount={proseChapters.length}
            activeChapterId={activeChapterId}
            materialScore={activeChapterDiagnosticsData?.material_score}
            commercialReadiness={commercialReadiness}
            activeTaskCount={activeTasks.length + activeKnowledgeJobCount}
            onOpenProductionDesk={() => navigate(`/novel/workspace/${projectId}/production`)}
            onOpenTaskCenter={() => setTaskCenterOpen(true)}
            onOpenOutlineTree={() => setOutlineTreeOpen(true)}
            onOpenChapterDrawer={() => setChapterDrawerOpen(true)}
            onCreateChapter={() => openEditor('chapter')}
            onSelectChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}
          />
        </div>

        <div className="novel-workspace-main" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showGlobalWritingGuidance && (
            <div className="novel-workspace-cockpit" style={{ flexShrink: 1, minHeight: 0 }}>
              <WritingCockpitPanel
                model={writingCockpitModel}
                loading={stepProseLoading || generatingProse || generatingSceneCards || diagnosticsLoading || contextPackageLoading || commercialToolLoading === 'storyStateSync'}
                forceCollapsed
                primaryActionOverride={cockpitPrimaryActionOverride}
                onAction={handleWritingCockpitAction}
              />
            </div>
          )}
          {showGlobalWritingGuidance && renderSerialPipeline()}
          <Suspense fallback={null}>
            {renderWorkspaceArea()}
          </Suspense>
        </div>

        <div className={rightPanelOpen ? 'novel-workspace-reference-shell is-open' : 'novel-workspace-reference-shell'}>
          <ReferencePanel
            open={rightPanelOpen}
            activeTab={rightPanelTab}
            worldbuilding={worldbuilding}
            characters={characters}
            outlines={outlines}
            selectedProject={selectedProject}
            projectId={projectId}
            selectedModelId={selectedModelId}
            referenceReports={referenceReports}
            proseQualityReports={proseQualityReports}
            editorReports={editorReports}
            editorRevisionReports={editorRevisionReports}
            bookReviews={bookReviews}
            activeChapter={activeChapter}
            activeChapterId={activeChapterId}
            activeChapterUpdatedAt={activeChapter?.updated_at || ''}
            chapterVersions={chapterVersions}
            chapterVersionsLoading={chapterVersionsLoading}
            proseQualityLoading={proseQualityLoading}
            rollingBackVersionId={rollingBackVersionId}
            onClose={() => setRightPanelOpen(false)}
            onOpen={() => setRightPanelOpen(true)}
            onTabChange={setRightPanelTab}
            onEdit={(kind, item) => openEditor(kind, item)}
            onOpenCreativeCards={() => setCreativeCardsOpen(true)}
            onOpenStoryStateEditor={openStoryStateEditor}
            onApplyEditorRevision={applyEditorRevision}
            onRefreshProseQuality={() => refreshActiveProseQuality('manual_refresh')}
            onRollbackVersion={rollbackChapterVersion}
            onOpenVersionDetail={setChapterVersionDetail}
          />
        </div>
      </div>

      <CreativeAssistantPanel
        open={creativeAssistantOpen}
        loading={creativeAssistantLoading}
        mode={creativeAssistantMode}
        result={creativeAssistantResult}
        project={selectedProject}
        activeChapter={activeChapter}
        selectedText={creativeAssistantSelectedText}
        contextPackage={activeContextPackageData}
        reviews={reviews}
        runRecords={runRecords}
        error={creativeAssistantError}
        onClose={() => setCreativeAssistantOpen(false)}
        onModeChange={setCreativeAssistantMode}
        onRun={runCreativeAssistant}
        onCopyCard={copyCreativeAssistantCard}
      />


    </>
  )
}
