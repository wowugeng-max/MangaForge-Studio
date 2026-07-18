export type WorkspaceActiveTask = {
  key: string
  title: string
  phase?: string
  progress?: number
  detail?: string
  cancelLabel?: string
  onCancel?: () => void
}

export * from './drawer-model-helpers'
export * from './drawer-model-tags'
export * from './drawer-default-lane'
export * from './drawer-task-run-card'
export * from './drawer-previews'
export * from './drawer-recovery-evidence'
export * from './drawer-safe-batch'
export * from './drawer-snapshots'
