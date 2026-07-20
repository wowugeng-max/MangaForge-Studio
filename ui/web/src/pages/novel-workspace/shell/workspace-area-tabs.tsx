/** Workspace area tab catalog for NovelProjectWorkspace. */
import React from 'react'
import {
  BookOutlined,
  DatabaseOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { WorkspaceArea } from './workspace-types'
import {
  WORKSPACE_PRIMARY_TAB_DEFS,
  type WorkspacePrimaryArea,
} from './workspace-core-area'

export const WORKSPACE_AREA_TABS: Array<{ key: WorkspaceArea; label: string; icon: React.ReactNode }> =
  WORKSPACE_PRIMARY_TAB_DEFS.map((tab) => {
    const icon = tab.key === 'storyPlanning'
      ? <BookOutlined />
      : tab.key === 'storyAssets'
        ? <DatabaseOutlined />
        : <EditOutlined />
    return { key: tab.key as WorkspaceArea, label: tab.label, icon }
  })

export type { WorkspacePrimaryArea }
