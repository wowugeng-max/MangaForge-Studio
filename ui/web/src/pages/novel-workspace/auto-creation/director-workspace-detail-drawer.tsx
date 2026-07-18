import React from 'react'
import { Typography } from 'antd'
import type {
  AutoCreationDirectorAction,
  AutoCreationDirectorModel,
} from '../autoCreationDirectorModel'
import { buildDirectorWorkspaceDerived } from './director-workspace-derived'
import { DirectorWorkspaceDetailDrawerCore } from './director-workspace-detail-drawer-core'
import { DirectorWorkspaceDetailDrawerOps } from './director-workspace-detail-drawer-ops'
import { DirectorWorkspaceDetailDrawerContinuity } from './director-workspace-detail-drawer-continuity'
import { DirectorWorkspaceDetailDrawerBatch } from './director-workspace-detail-drawer-batch'

const { Text } = Typography

export function DirectorWorkspaceDetailDrawer(props: {
  model: AutoCreationDirectorModel
  loadingActionKey?: string
  onAction: (action: AutoCreationDirectorAction) => void
  onStageAction?: (action: AutoCreationDirectorAction) => void
  onSelectChapter: (chapterNo: number) => void
  derived: ReturnType<typeof buildDirectorWorkspaceDerived>
}) {
  const {
    model,
    loadingActionKey,
    onAction,
    onStageAction = onAction,
    onSelectChapter,
    derived,
  } = props

  const panelProps = {
    model,
    loadingActionKey,
    onAction,
    onStageAction,
    onSelectChapter,
    derived,
  }

  return (
    <details className="auto-director-detail-drawer">
      <summary className="auto-director-detail-summary">
        <span>展开详细依据</span>
        <Text type="secondary">查看长篇链路、作战台、生产轨道、航线守门、连续生产护栏和复盘证据。</Text>
      </summary>

      <DirectorWorkspaceDetailDrawerCore {...panelProps} />
      <DirectorWorkspaceDetailDrawerOps {...panelProps} />
      <DirectorWorkspaceDetailDrawerContinuity {...panelProps} />
      <DirectorWorkspaceDetailDrawerBatch {...panelProps} />
    </details>
  )
}
