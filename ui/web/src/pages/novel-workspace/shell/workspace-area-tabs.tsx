/** Workspace area tab catalog for NovelProjectWorkspace. */
import React from 'react'
import {
  BookOutlined,
  ControlOutlined,
  DatabaseOutlined,
  EditOutlined,
  RocketOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { WorkspaceArea } from './workspace-types'

export const WORKSPACE_AREA_TABS: Array<{ key: WorkspaceArea; label: string; icon: React.ReactNode }> = [
  { key: 'autoCreation', label: '自动创作', icon: <ControlOutlined /> },
  { key: 'storyPlanning', label: '故事规划', icon: <BookOutlined /> },
  { key: 'chapterWriting', label: '章节写作', icon: <EditOutlined /> },
  { key: 'storyAssets', label: '设定资产', icon: <DatabaseOutlined /> },
  { key: 'qualityRevision', label: '质检修订', icon: <SafetyOutlined /> },
  { key: 'productionOps', label: '生产运营', icon: <RocketOutlined /> },
]
