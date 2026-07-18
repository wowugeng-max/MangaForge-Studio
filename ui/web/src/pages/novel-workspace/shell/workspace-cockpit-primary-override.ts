/** Pure cockpit primary-action override derived from writing recommendation. */
import type { WritingCockpitPrimaryActionOverride } from '../WritingCockpitPanel'

export type WorkspaceWritingRecommendationLike = {
  key: string
  label: string
  reason: string
}

export function buildWorkspaceCockpitPrimaryActionOverride(input: {
  activeChapter: unknown
  workspaceArea: string
  writingRecommendation: WorkspaceWritingRecommendationLike
  openGenerationDiagnostics: () => void | Promise<void>
  generateSceneCardsForActiveChapter: () => void | Promise<void>
  repairContextAndGenerateCurrentChapter: () => void
  generateCurrentChapterProse: () => void | Promise<void>
  openChapterQualityCard: () => void
}): WritingCockpitPrimaryActionOverride | null {
  const {
    activeChapter,
    workspaceArea,
    writingRecommendation,
    openGenerationDiagnostics,
    generateSceneCardsForActiveChapter,
    repairContextAndGenerateCurrentChapter,
    generateCurrentChapterProse,
    openChapterQualityCard,
  } = input

  if (!activeChapter || workspaceArea !== 'chapterWriting') return null

  switch (writingRecommendation.key) {
    case 'diagnostics':
      return {
        label: writingRecommendation.label,
        reason: writingRecommendation.reason,
        actionKey: 'open_generation_diagnostics',
        onClick: () => { void openGenerationDiagnostics() },
      }
    case 'scene_cards':
      return {
        label: writingRecommendation.label,
        reason: writingRecommendation.reason,
        actionKey: 'build_scene_plan',
        onClick: () => { void generateSceneCardsForActiveChapter() },
      }
    case 'repair_generate':
      return {
        label: writingRecommendation.label,
        reason: writingRecommendation.reason,
        actionKey: 'repair_materials',
        onClick: repairContextAndGenerateCurrentChapter,
      }
    case 'generate':
      return {
        label: writingRecommendation.label,
        reason: writingRecommendation.reason,
        actionKey: 'write_draft',
        onClick: () => { void generateCurrentChapterProse() },
      }
    case 'quality_card':
      return {
        label: writingRecommendation.label,
        reason: writingRecommendation.reason,
        actionKey: 'refresh_current_quality',
        onClick: openChapterQualityCard,
      }
    default:
      return null
  }
}
