import type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'
export type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'

import {
  NovelWorkspaceDeferredOpsToolbox,
} from './workspace-deferred-surfaces-ops-toolbox'
import {
  NovelWorkspaceDeferredOpsExtraModals,
} from './workspace-deferred-surfaces-ops-extra-modals'

export function NovelWorkspaceDeferredOpsSurfaces(props: NovelWorkspaceDeferredSurfacesProps) {
  return (
    <>
      <NovelWorkspaceDeferredOpsToolbox {...props} />
      <NovelWorkspaceDeferredOpsExtraModals {...props} />
    </>
  )
}
