import type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'
import {
  NovelWorkspaceDeferredOpsCreativeModals,
} from './workspace-deferred-surfaces-ops-creative-modals'
import {
  NovelWorkspaceDeferredOpsBibleModals,
} from './workspace-deferred-surfaces-ops-bible-modals'

export function NovelWorkspaceDeferredOpsExtraModals(props: NovelWorkspaceDeferredSurfacesProps) {
  return (
    <>
      <NovelWorkspaceDeferredOpsCreativeModals {...props} />
      <NovelWorkspaceDeferredOpsBibleModals {...props} />
    </>
  )
}
