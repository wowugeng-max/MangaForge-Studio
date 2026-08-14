import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Form } from 'antd'
import type {
  CreativeAssistResult,
  CreativeAssistantModeKey,
} from './creativeAssistantModel'
import type { SafeBatchRecoveryFocusSnapshot } from './TaskCenterDrawer'
import type { ChapterSortMode, ChapterStatusFilter } from './useNovelWorkspaceData'
import type { EditorKind } from './EditorModal'
import type {
  ChapterOwnedData,
  ChapterWordTargetMode,
  WorkspaceArea,
} from './shell/workspace-types'
import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  writingSkillsPayload,
  type FictionHumanizerMode,
  type WritingSkillEnabledMap,
} from './writingSkillsModel'
import {
  immersiveEnterPanelDefaults,
  isImmersiveShell as deriveIsImmersiveShell,
  loadWorkbenchDirectoryCollapsed,
  loadWorkspaceShellMode,
  saveWorkbenchDirectoryCollapsed,
  saveWorkspaceShellMode,
  shellModeForWorkspaceArea,
  type WorkspaceShellMode,
} from './workspaceShellModel'

export function useNovelProjectWorkspaceUiState() {
  // ── 3-step writing flow ──
  const [stepOutlineLoading, setStepOutlineLoading] = useState(false)
  const [stepProseLoading, setStepProseLoading] = useState(false)
  const [stepRepairLoading, setStepRepairLoading] = useState(false)
  const [proseProgress, setProseProgress] = useState({ current: 0, total: 0 })
  const [proseBatchStatus, setProseBatchStatus] = useState<any>(null)
  const [planProgress, setPlanProgress] = useState<any>(null)
  const [planning, setPlanning] = useState(false)
  const [executingAgents, setExecutingAgents] = useState(false)
  const [generatingProse, setGeneratingProse] = useState(false)
  const [generatingSceneCards, setGeneratingSceneCards] = useState(false)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [incubatingOriginal, setIncubatingOriginal] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [editorReportLoading, setEditorReportLoading] = useState(false)
  const [proseQualityLoading, setProseQualityLoading] = useState(false)
  const [bookReviewLoading, setBookReviewLoading] = useState(false)
  const [writingBibleOpen, setWritingBibleOpen] = useState(false)
  const [writingBibleGenerating, setWritingBibleGenerating] = useState(false)
  const [styleSampleCandidateLoading, setStyleSampleCandidateLoading] = useState(false)
  const [styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading] = useState(false)
  const [styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey] = useState('')
  const [styleSampleEffectiveness, setStyleSampleEffectiveness] = useState<any | null>(null)
  const [storyStateOpen, setStoryStateOpen] = useState(false)
  const [commercialToolsOpen, setCommercialToolsOpen] = useState(false)
  const [creativeCommandOpen, setCreativeCommandOpen] = useState(false)
  const [creativeCommandText, setCreativeCommandText] = useState('')
  const [creativeCommandPlan, setCreativeCommandPlan] = useState<any | null>(null)
  const [creativeAssistantOpen, setCreativeAssistantOpen] = useState(false)
  const [creativeAssistantMode, setCreativeAssistantMode] = useState<CreativeAssistantModeKey>('prose_review')
  const [creativeAssistantLoading, setCreativeAssistantLoading] = useState(false)
  const [creativeAssistantResult, setCreativeAssistantResult] = useState<CreativeAssistResult | null>(null)
  const [creativeAssistantError, setCreativeAssistantError] = useState('')
  const [creativeAssistantSelectedText, setCreativeAssistantSelectedText] = useState('')
  const [backupImportOpen, setBackupImportOpen] = useState(false)
  const [backupImportText, setBackupImportText] = useState('')
  const [chapterGroupExecutingId, setChapterGroupExecutingId] = useState<number | null>(null)
  const [releaseRepairExecutingId, setReleaseRepairExecutingId] = useState<number | null>(null)
  const [commercialToolLoading, setCommercialToolLoading] = useState('')
  const [productionMode, setProductionMode] = useState('draft_review_revise_store')
  const [unattendedTargetChapter, setUnattendedTargetChapter] = useState(10)
  const [chapterWordTargetMode, setChapterWordTargetMode] = useState<ChapterWordTargetMode>('standard')
  const [chapterTargetWordCount, setChapterTargetWordCount] = useState(3000)
  const [writingSkillsEnabled, setWritingSkillsEnabled] = useState<WritingSkillEnabledMap>(DEFAULT_WRITING_SKILLS_ENABLED)
  const [fictionHumanizerMode, setFictionHumanizerMode] = useState<FictionHumanizerMode>(DEFAULT_FICTION_HUMANIZER_MODE)
  const [activeChapterDiagnostics, setActiveChapterDiagnostics] = useState<ChapterOwnedData | null>(null)
  const diagnosticsRequestRef = useRef(0)
  const [activeChapterContextPackage, setActiveChapterContextPackage] = useState<ChapterOwnedData | null>(null)
  const [contextPackageLoading, setContextPackageLoading] = useState(false)
  const contextPackageRequestRef = useRef(0)
  const [commercialReadiness, setCommercialReadiness] = useState<any | null>(null)
  const [future100Draft, setFuture100Draft] = useState<any | null>(null)
  const [future100SelectedNos, setFuture100SelectedNos] = useState<number[]>([])
  const [future100ApplyLoading, setFuture100ApplyLoading] = useState(false)
  const [future100FocusOutlineIds, setFuture100FocusOutlineIds] = useState<number[]>([])
  const [projectSettings, setProjectSettings] = useState<any[]>([])
  const [memoryPalaceProjects, setMemoryPalaceProjects] = useState<any[] | null>(null)

  const chapterWordTargetPayload = () => ({
    word_target_mode: chapterWordTargetMode,
    ...(chapterWordTargetMode === 'custom' ? { target_word_count: chapterTargetWordCount } : {}),
    ...writingSkillsPayload(writingSkillsEnabled, fictionHumanizerMode),
  })

  const styleSampleEffectivenessItems = useMemo(() => (
    Array.isArray(styleSampleEffectiveness?.samples)
      ? styleSampleEffectiveness.samples.slice(0, 4)
      : []
  ), [styleSampleEffectiveness])

  // ── 大纲生成控制面板 ──
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [referenceConfigOpen, setReferenceConfigOpen] = useState(false)
  const [referenceEngineeringOpen, setReferenceEngineeringOpen] = useState(false)
  const [creativeCardsOpen, setCreativeCardsOpen] = useState(false)
  const [consistencyGraphOpen, setConsistencyGraphOpen] = useState(false)
  const [qualityBenchmarkOpen, setQualityBenchmarkOpen] = useState(false)
  const [exportDeliveryOpen, setExportDeliveryOpen] = useState(false)
  const [reviewAnnotationsOpen, setReviewAnnotationsOpen] = useState(false)
  const [agentAuditOpen, setAgentAuditOpen] = useState(false)
  const [continuityAudit, setContinuityAudit] = useState<any | null>(null)
  const [continuityAuditLoading, setContinuityAuditLoading] = useState(false)

  // ── 章节弹出面板 ──
  const [chapterDrawerOpen, setChapterDrawerOpen] = useState(false)
  const [outlineTreeOpen, setOutlineTreeOpen] = useState(false)
  const [taskCenterOpen, setTaskCenterOpen] = useState(false)
  const [taskCenterRecoveryFocus, setTaskCenterRecoveryFocus] = useState<SafeBatchRecoveryFocusSnapshot | null>(null)

  // ── 章节多选 + 章节重组 ──
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [restructurePanelOpen, setRestructurePanelOpen] = useState(false)
  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterStatusFilter, setChapterStatusFilter] = useState<ChapterStatusFilter>('all')
  const [chapterSortMode, setChapterSortMode] = useState<ChapterSortMode>('chapter_no_asc')

  // ── streaming ──
  const [streamingChapterId, setStreamingChapterId] = useState<number | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingProgress, setStreamingProgress] = useState('')
  const [streamingPercent, setStreamingPercent] = useState(0)
  const [generationPipeline, setGenerationPipeline] = useState<any[]>([])
  const streamingEndRef = useRef<HTMLDivElement | null>(null)
  const proseBatchCancelRef = useRef(false)

  // ── editors / modals ──
  const [editorKind, setEditorKind] = useState<EditorKind | null>(null)
  const [editorItem, setEditorItem] = useState<any | null>(null)
  const [editorForm] = Form.useForm()
  const [writingBibleForm] = Form.useForm()
  const [storyStateForm] = Form.useForm()
  const [approvalPolicyForm] = Form.useForm()
  const [agentConfigForm] = Form.useForm()

  // ── right reference panel ──
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('worldbuilding')
  const [workspaceArea, setWorkspaceArea] = useState<WorkspaceArea>('chapterWriting')
  const [writingShellMode, setWritingShellMode] = useState<WorkspaceShellMode>(() => loadWorkspaceShellMode())
  const [directoryCollapsed, setDirectoryCollapsed] = useState(() => loadWorkbenchDirectoryCollapsed())
  const [storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken] = useState(0)
  const [autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey] = useState('')

  const shellMode = shellModeForWorkspaceArea(workspaceArea, writingShellMode)
  const isImmersiveShell = deriveIsImmersiveShell(shellMode, workspaceArea)
  const showGlobalWritingGuidance = workspaceArea !== 'chapterWriting' && workspaceArea !== 'storyAssets'
  const directoryShellClassName = directoryCollapsed
    ? 'novel-workspace-directory-shell is-collapsed'
    : 'novel-workspace-directory-shell'

  const setShellMode = useCallback((mode: WorkspaceShellMode) => {
    setWritingShellMode(mode)
    saveWorkspaceShellMode(mode)
    if (mode === 'immersive') {
      const defaults = immersiveEnterPanelDefaults()
      setDirectoryCollapsed(defaults.directoryCollapsed)
      setRightPanelOpen(defaults.rightPanelOpen)
    } else {
      // restore workbench directory preference when leaving immersive
      setDirectoryCollapsed(loadWorkbenchDirectoryCollapsed())
    }
  }, [])

  // Apply immersive panel defaults only on false→true edge (e.g. restored preference
  // + land on chapterWriting). On true→false (area change OR toggle), restore workbench
  // directory preference so leaving chapterWriting while immersive does not keep the
  // directory collapsed. setShellMode('workbench') also restores — both are idempotent.
  const wasImmersiveRef = useRef(false)
  useEffect(() => {
    if (isImmersiveShell && !wasImmersiveRef.current) {
      const defaults = immersiveEnterPanelDefaults()
      setDirectoryCollapsed(defaults.directoryCollapsed)
      setRightPanelOpen(defaults.rightPanelOpen)
    } else if (!isImmersiveShell && wasImmersiveRef.current) {
      setDirectoryCollapsed(loadWorkbenchDirectoryCollapsed())
    }
    wasImmersiveRef.current = isImmersiveShell
  }, [isImmersiveShell])

  // Persist workbench directory fold when user toggles while not immersive
  const handleDirectoryCollapsedChange = useCallback((collapsed: boolean) => {
    setDirectoryCollapsed(collapsed)
    if (!isImmersiveShell) {
      saveWorkbenchDirectoryCollapsed(collapsed)
    }
  }, [isImmersiveShell])


  return {
    stepOutlineLoading, setStepOutlineLoading,
    stepProseLoading, setStepProseLoading,
    stepRepairLoading, setStepRepairLoading,
    proseProgress, setProseProgress,
    proseBatchStatus, setProseBatchStatus,
    planProgress, setPlanProgress,
    planning, setPlanning,
    executingAgents, setExecutingAgents,
    generatingProse, setGeneratingProse,
    generatingSceneCards, setGeneratingSceneCards,
    diagnosticsLoading, setDiagnosticsLoading,
    pipelineLoading, setPipelineLoading,
    incubatingOriginal, setIncubatingOriginal,
    dashboardLoading, setDashboardLoading,
    editorReportLoading, setEditorReportLoading,
    proseQualityLoading, setProseQualityLoading,
    bookReviewLoading, setBookReviewLoading,
    writingBibleOpen, setWritingBibleOpen,
    writingBibleGenerating, setWritingBibleGenerating,
    styleSampleCandidateLoading, setStyleSampleCandidateLoading,
    styleSampleEffectivenessLoading, setStyleSampleEffectivenessLoading,
    styleSamplePatchLoadingKey, setStyleSamplePatchLoadingKey,
    styleSampleEffectiveness, setStyleSampleEffectiveness,
    storyStateOpen, setStoryStateOpen,
    commercialToolsOpen, setCommercialToolsOpen,
    creativeCommandOpen, setCreativeCommandOpen,
    creativeCommandText, setCreativeCommandText,
    creativeCommandPlan, setCreativeCommandPlan,
    creativeAssistantOpen, setCreativeAssistantOpen,
    creativeAssistantMode, setCreativeAssistantMode,
    creativeAssistantLoading, setCreativeAssistantLoading,
    creativeAssistantResult, setCreativeAssistantResult,
    creativeAssistantError, setCreativeAssistantError,
    creativeAssistantSelectedText, setCreativeAssistantSelectedText,
    backupImportOpen, setBackupImportOpen,
    backupImportText, setBackupImportText,
    chapterGroupExecutingId, setChapterGroupExecutingId,
    releaseRepairExecutingId, setReleaseRepairExecutingId,
    commercialToolLoading, setCommercialToolLoading,
    productionMode, setProductionMode,
    unattendedTargetChapter, setUnattendedTargetChapter,
    chapterWordTargetMode, setChapterWordTargetMode,
    chapterTargetWordCount, setChapterTargetWordCount,
    writingSkillsEnabled, setWritingSkillsEnabled,
    fictionHumanizerMode, setFictionHumanizerMode,
    activeChapterDiagnostics, setActiveChapterDiagnostics,
    diagnosticsRequestRef,
    activeChapterContextPackage, setActiveChapterContextPackage,
    contextPackageLoading, setContextPackageLoading,
    contextPackageRequestRef,
    commercialReadiness, setCommercialReadiness,
    future100Draft, setFuture100Draft,
    future100SelectedNos, setFuture100SelectedNos,
    future100ApplyLoading, setFuture100ApplyLoading,
    future100FocusOutlineIds, setFuture100FocusOutlineIds,
    projectSettings, setProjectSettings,
    memoryPalaceProjects, setMemoryPalaceProjects,
    chapterWordTargetPayload,
    styleSampleEffectivenessItems,
    outlinePanelOpen, setOutlinePanelOpen,
    referenceConfigOpen, setReferenceConfigOpen,
    referenceEngineeringOpen, setReferenceEngineeringOpen,
    creativeCardsOpen, setCreativeCardsOpen,
    consistencyGraphOpen, setConsistencyGraphOpen,
    qualityBenchmarkOpen, setQualityBenchmarkOpen,
    exportDeliveryOpen, setExportDeliveryOpen,
    reviewAnnotationsOpen, setReviewAnnotationsOpen,
    agentAuditOpen, setAgentAuditOpen,
    continuityAudit, setContinuityAudit,
    continuityAuditLoading, setContinuityAuditLoading,
    chapterDrawerOpen, setChapterDrawerOpen,
    outlineTreeOpen, setOutlineTreeOpen,
    taskCenterOpen, setTaskCenterOpen,
    taskCenterRecoveryFocus, setTaskCenterRecoveryFocus,
    selectedChapterIds, setSelectedChapterIds,
    selectMode, setSelectMode,
    restructurePanelOpen, setRestructurePanelOpen,
    chapterSearch, setChapterSearch,
    chapterStatusFilter, setChapterStatusFilter,
    chapterSortMode, setChapterSortMode,
    streamingChapterId, setStreamingChapterId,
    streamingText, setStreamingText,
    streamingProgress, setStreamingProgress,
    streamingPercent, setStreamingPercent,
    generationPipeline, setGenerationPipeline,
    streamingEndRef,
    proseBatchCancelRef,
    editorKind, setEditorKind,
    editorItem, setEditorItem,
    editorForm,
    writingBibleForm,
    storyStateForm,
    approvalPolicyForm,
    agentConfigForm,
    rightPanelOpen, setRightPanelOpen,
    rightPanelTab, setRightPanelTab,
    workspaceArea, setWorkspaceArea,
    writingShellMode, setWritingShellMode,
    directoryCollapsed, setDirectoryCollapsed,
    storyAssetsFocusDiscoveredToken, setStoryAssetsFocusDiscoveredToken,
    autoDirectorActionLoadingKey, setAutoDirectorActionLoadingKey,
    shellMode,
    isImmersiveShell,
    showGlobalWritingGuidance,
    directoryShellClassName,
    setShellMode,
    handleDirectoryCollapsedChange,
  }
}
