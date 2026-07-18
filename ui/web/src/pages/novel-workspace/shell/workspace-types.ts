
export type TaskCenterActionOptions = {
  keepTaskCenterOpen?: boolean
}

export type EditorReportForChapterOptions = {
  sourceTask?: any
  sourceRun?: any
  sourceTaskIndex?: number
  autoRevision?: boolean
  skipRevisionConfirm?: boolean
}

export const productionModeOptions = [
  { value: 'scene_cards_only', label: '只生成场景卡' },
  { value: 'draft_only', label: '只生成正文初稿' },
  { value: 'draft_review', label: '生成并自检' },
  { value: 'draft_review_revise_store', label: '生成、自检、修订、入库' },
  { value: 'full_auto', label: '全自动完整流水线' },
]

export type WorkspaceArea = 'autoCreation' | 'storyPlanning' | 'chapterWriting' | 'storyAssets' | 'qualityRevision' | 'productionOps'
export type ChapterOwnedData = { chapterId: number; updatedAt: any; data: any }
export type ChapterWordTargetMode = 'standard' | 'long' | 'custom'

