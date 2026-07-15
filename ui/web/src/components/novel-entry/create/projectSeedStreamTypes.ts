export const PROJECT_SEED_UI_STEPS = [
  '整理故事骨架',
  '生成分卷与前30章细纲',
  '生成伏笔计划',
  '汇总审阅材料',
] as const

export type StreamStepStatus = 'pending' | 'running' | 'completed' | 'error'

export type ProjectSeedStreamStep = {
  key: string
  label: string
  status: StreamStepStatus
  detail?: string
}

export type ProjectSeedStreamState = {
  progress: number
  steps: ProjectSeedStreamStep[]
  currentLabel: string
  done: boolean
  error?: string
  seed?: any
  seed_diagnostics?: any
}
