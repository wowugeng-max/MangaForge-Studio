import React from 'react'
import {
  ReloadOutlined,
} from '@ant-design/icons'
import {
  rootShellClassName,
} from './workspaceShellModel'
import {
  NovelWorkspaceTopBar,
} from './shell/workspace-topbar'
import {
  NovelWorkspaceDeferredSurfaces,
} from './shell/workspace-deferred-surfaces'
import {
  NovelWorkspaceBody,
} from './shell/workspace-body'
import {
  buildNovelWorkspaceBodyProps,
  buildNovelWorkspaceDeferredSurfacesProps,
  buildNovelWorkspaceTopBarProps,
} from './shell/workspace-view-props'
import {
  useNovelProjectWorkspaceModel,
} from './shell/use-novel-project-workspace-model'
import '../NovelProjectWorkspace.css'

export default function NovelProjectWorkspace() {
  const model = useNovelProjectWorkspaceModel()

  if (model.status === 'loading') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <ReloadOutlined className="anticon" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} />
        {' '}加载中…
      </div>
    )
  }

  const { isImmersiveShell, workspaceViewDeps } = model

  return (
    <div
      className={`novel-project-workspace ${rootShellClassName(isImmersiveShell)}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#fff' }}
    >
      <NovelWorkspaceTopBar {...buildNovelWorkspaceTopBarProps(workspaceViewDeps)} />
      <NovelWorkspaceBody {...buildNovelWorkspaceBodyProps(workspaceViewDeps)} />
      <NovelWorkspaceDeferredSurfaces {...buildNovelWorkspaceDeferredSurfacesProps(workspaceViewDeps)} />
    </div>
  )
}
