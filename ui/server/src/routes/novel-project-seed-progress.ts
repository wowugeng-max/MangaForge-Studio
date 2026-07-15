export const PROJECT_SEED_UI_STEPS = [
  '整理故事骨架',
  '生成分卷与前30章细纲',
  '生成伏笔计划',
  '汇总审阅材料',
] as const

export type ProjectSeedBackendStage =
  | 'skeleton'
  | 'outlines'
  | 'volumes'
  | 'foreshadowing'
  | 'assemble'

export type ProjectSeedStageStatus = 'running' | 'completed' | 'error'

export type ProjectSeedProgressEvent = {
  type: 'stage'
  stage: ProjectSeedBackendStage
  status: ProjectSeedStageStatus
  ui_step: number
  label: string
  progress: number
  detail?: string
  outline_chapter_count?: number
  outline_volume_count?: number
  outline_foreshadowing_count?: number
  at: string
}

export type ProjectSeedProgressReporter = (event: ProjectSeedProgressEvent) => void

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function mapBackendStageToUiStep(stage: ProjectSeedBackendStage): number {
  switch (stage) {
    case 'skeleton':
      return 0
    case 'outlines':
    case 'volumes':
      return 1
    case 'foreshadowing':
      return 2
    case 'assemble':
      return 3
    default:
      return 0
  }
}

export function buildProjectSeedStageEvent(input: {
  stage: ProjectSeedBackendStage
  status: ProjectSeedStageStatus
  progress: number
  detail?: string
  outline_chapter_count?: number
  outline_volume_count?: number
  outline_foreshadowing_count?: number
  label?: string
}): ProjectSeedProgressEvent {
  const ui_step = mapBackendStageToUiStep(input.stage)
  return {
    type: 'stage',
    stage: input.stage,
    status: input.status,
    ui_step,
    label: input.label || PROJECT_SEED_UI_STEPS[ui_step],
    progress: clampProgress(input.progress),
    detail: input.detail,
    outline_chapter_count: input.outline_chapter_count,
    outline_volume_count: input.outline_volume_count,
    outline_foreshadowing_count: input.outline_foreshadowing_count,
    at: new Date().toISOString(),
  }
}

export function sseData(value: any) {
  return `data: ${JSON.stringify(value)}\n\n`
}
