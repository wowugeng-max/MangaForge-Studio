import {
  useNovelWorkspaceBaseModel,
} from './use-novel-workspace-base-model'
import {
  buildNovelWorkspaceReadyRuntime,
} from './build-novel-workspace-ready-runtime'

export function useNovelProjectWorkspaceModel() {
  const base = useNovelWorkspaceBaseModel()
  if (base.status === 'loading') {
    return {
      status: 'loading' as const,
    }
  }
  return buildNovelWorkspaceReadyRuntime(base)
}
