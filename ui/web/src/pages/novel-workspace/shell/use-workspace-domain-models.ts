/** Domain model memos and cockpit report helpers for NovelProjectWorkspace. */
import { useEffect, useMemo } from 'react'
import apiClient from '../../../api/client'
import {
  buildAutoCreationDirectorModel,
} from '../autoCreationDirectorModel'
import {
  buildPlanningWorkspaceModel,
} from '../planningWorkspaceModel'
import {
  buildWritingCockpitModel,
} from '../writingCockpitModel'
import {
  buildSerialPipelineViewModel,
} from '../serialPipelineModel'

export function useNovelWorkspaceDomainModels(input: {
  selectedProject: any
  outlines: any[]
  sortedChapters: any[]
  activeChapter: any
  activeChapterDiagnosticsData: any
  commercialReadiness: any
  reviews: any[]
  projectSettings: any
  productionTasks: any[]
  activeContextPackageData: any
  activeTasks: any[]
  runRecords: any[]
  activeMemorySummary: any
  selectedModelId: any
  styleSampleEffectiveness: any
  pipeline: any
  projectId: number
  setStyleSampleEffectiveness: (value: any) => void
  stepProseLoading: boolean
  generatingProse: boolean
  generatingSceneCards: boolean
  diagnosticsLoading: boolean
  contextPackageLoading: boolean
  editorReportLoading: boolean
  proseQualityLoading: boolean
  commercialToolLoading: any
  setAutoDirectorActionLoadingKey: (value: string) => void
}) {
  const {
    selectedProject,
    outlines,
    sortedChapters,
    activeChapter,
    activeChapterDiagnosticsData,
    commercialReadiness,
    reviews,
    projectSettings,
    productionTasks,
    activeContextPackageData,
    activeTasks,
    runRecords,
    activeMemorySummary,
    selectedModelId,
    styleSampleEffectiveness,
    pipeline,
    projectId,
    setStyleSampleEffectiveness,
    stepProseLoading,
    generatingProse,
    generatingSceneCards,
    diagnosticsLoading,
    contextPackageLoading,
    editorReportLoading,
    proseQualityLoading,
    commercialToolLoading,
    setAutoDirectorActionLoadingKey,
  } = input

  const planningWorkspaceModel = useMemo(() => buildPlanningWorkspaceModel({
    selectedProject,
    outlines,
    chapters: sortedChapters,
    activeChapter,
    materialScore: activeChapterDiagnosticsData?.material_score,
    commercialReadiness,
    reviews,
    settingEntities: projectSettings,
    productionTasks,
  }), [selectedProject, outlines, sortedChapters, activeChapter, activeChapterDiagnosticsData?.material_score, commercialReadiness, reviews, projectSettings, productionTasks])

  const writingCockpitModel = useMemo(() => buildWritingCockpitModel({
    project: selectedProject,
    chapters: sortedChapters,
    outlines,
    activeChapter,
    contextPackage: activeContextPackageData,
    diagnostics: activeChapterDiagnosticsData,
    materialScore: activeChapterDiagnosticsData?.material_score || null,
    commercialReadiness,
    activeRuns: [...activeTasks, ...runRecords],
    reviews,
    memorySummary: activeMemorySummary,
  }), [
    selectedProject,
    sortedChapters,
    outlines,
    activeChapter,
    activeContextPackageData,
    activeChapterDiagnosticsData,
    commercialReadiness,
    activeTasks,
    runRecords,
    reviews,
    activeMemorySummary,
  ])

  const autoCreationDirectorModel = useMemo(() => buildAutoCreationDirectorModel({
    planning: planningWorkspaceModel,
    writing: writingCockpitModel,
    activeTasks,
    selectedModelId,
    reviews,
    runRecords,
    chapters: sortedChapters,
    storyState: selectedProject?.reference_config?.story_state || {},
    styleSampleEffectiveness,
  }), [planningWorkspaceModel, writingCockpitModel, activeTasks, selectedModelId, reviews, runRecords, sortedChapters, selectedProject?.reference_config?.story_state, styleSampleEffectiveness])
  const serialPipelineModel = useMemo(() => buildSerialPipelineViewModel(pipeline), [pipeline])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`)
      .then(res => {
        if (!cancelled) {
          setStyleSampleEffectiveness(res.data?.style_sample_effectiveness || res.data?.report || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId, selectedProject?.updated_at, reviews.length, sortedChapters.length])

  const recentFatigueRollingPlanIntent = useMemo(() => {
    const fatigue = planningWorkspaceModel.recentFatigueRadar
    const fatigueWarnings = Array.isArray(fatigue?.signals)
      ? fatigue.signals.filter((signal: any) => String(signal?.status || '') === 'warn')
      : []
    if (fatigue?.status !== 'needs_attention' && fatigueWarnings.length === 0) return null
    return {
      source: 'recent_fatigue_repair',
      recent_fatigue_radar: fatigue,
    }
  }, [planningWorkspaceModel.recentFatigueRadar])

  const autoDirectorBusy = Boolean(
    stepProseLoading
    || generatingProse
    || generatingSceneCards
    || diagnosticsLoading
    || contextPackageLoading
    || editorReportLoading
    || proseQualityLoading
    || commercialToolLoading,
  )

  useEffect(() => {
    if (!autoDirectorBusy) setAutoDirectorActionLoadingKey('')
  }, [autoDirectorBusy])

  const findReviewById = (reviewId: any) => (
    reviews.find((review: any) => String(review.id) === String(reviewId)) || null
  )

  const latestCockpitEditorReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestEditorReportId
    return reviewId ? findReviewById(reviewId) : null
  }

  const latestCockpitQualityReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestQualityReviewId
    return reviewId ? findReviewById(reviewId) : null
  }


  return {
    planningWorkspaceModel,
    writingCockpitModel,
    autoCreationDirectorModel,
    serialPipelineModel,
    recentFatigueRollingPlanIntent,
    autoDirectorBusy,
    findReviewById,
    latestCockpitEditorReport,
    latestCockpitQualityReport,
  }
}
