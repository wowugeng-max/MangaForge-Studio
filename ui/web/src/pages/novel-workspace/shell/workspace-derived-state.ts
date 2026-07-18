import { buildNovelWritingRecommendation } from '../writingRecommendationModel'
import { chapterWordCount } from '../utils'

export function filterReviewsByType(reviews: any[], reviewType: string) {
  return reviews
    .filter((item: any) => item.review_type === reviewType)
    .slice()
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export function resolveActiveChapterOwnedData(owned: any, chapterId: number, updatedAt: any) {
  if (!owned) return null
  if (owned.chapterId !== chapterId || owned.updatedAt !== updatedAt) return null
  return owned.data
}

export function resolveActiveMemorySummary(memoryPalaceProjects: any[] | null | undefined, projectId: number) {
  if (!projectId) return null
  if (!Array.isArray(memoryPalaceProjects)) return null
  return memoryPalaceProjects.find((item: any) => Number(item?.project_id || 0) === projectId) || {
    project_id: projectId,
    memory_count: 0,
    fact_count: 0,
    continuity_issue_count: 0,
    missing: true,
  }
}

export function resolveActiveChapterSceneCards(activeChapter: any) {
  if (!activeChapter) return []
  if (Array.isArray(activeChapter.scene_list) && activeChapter.scene_list.length > 0) return activeChapter.scene_list
  if (Array.isArray(activeChapter.scene_breakdown)) return activeChapter.scene_breakdown
  return []
}

export function buildWorkspaceWritingRecommendation(args: {
  activeChapterDiagnosticsData: any
  activeChapterSceneCards: any[]
  activeChapter: any
  writingCockpitModel: any
}) {
  const materialScore = args.activeChapterDiagnosticsData?.material_score
  const materialReady = !materialScore || Boolean(materialScore.can_generate)
  const materialRecommendations = Array.isArray(materialScore?.recommendations)
    ? materialScore.recommendations.filter(Boolean)
    : []

  return buildNovelWritingRecommendation({
    materialReady,
    materialRecommendations,
    sceneCardCount: args.activeChapterSceneCards.length,
    activeWordCount: chapterWordCount(args.activeChapter),
    deliveryRiskCarryOverActionCount: [
      ...(args.writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.requiredActions || []),
      ...(args.writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions || []),
      ...(args.writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions || []),
      ...(args.writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions || []),
      ...(args.writingCockpitModel.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.forbiddenRepeats || []),
    ].length,
    qualityContinuitySceneMapCount: args.writingCockpitModel.chapterPlanningDesk.qualityContinuitySceneMap.length,
  })
}
