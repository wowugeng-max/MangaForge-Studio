import React from 'react'
import {
  Alert, Button, Card, Checkbox, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Tooltip, Typography, message,
} from 'antd'
import apiClient from '../../api/client'
import { ChapterManagementDrawer } from '../ChapterManagementDrawer'
import { ChapterRestructurePanel } from '../ChapterRestructurePanel'
import { OutlineControlPanel } from '../OutlineControlPanel'
import { OutlineTreeModal } from '../OutlineTreeModal'
import { VersionDetailModal } from '../VersionDetailModal'
import {
  AgentAuditDrawer,
  AgentExecutionModal,
  ConsistencyGraphModal,
  CreativeCardsModal,
  EditorModal,
  ExportDeliveryModal,
  QualityBenchmarkModal,
  ReferenceConfigModal,
  ReferenceEngineeringModal,
  ReviewAnnotationsDrawer,
  TaskCenterDrawer,
} from './workspace-lazy'
import { DeferredWorkspaceSurfaces } from './workspace-helpers'
import type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'
export type { NovelWorkspaceDeferredSurfacesProps } from './workspace-deferred-surfaces-types'


const { Text } = Typography

import { NovelWorkspaceDeferredCoreSurfaces } from './workspace-deferred-surfaces-core'
import { NovelWorkspaceDeferredOpsSurfaces } from './workspace-deferred-surfaces-ops'
import { NovelWorkspaceDeferredOutlineSurfaces } from './workspace-deferred-surfaces-outline'

export function NovelWorkspaceDeferredSurfaces(props: NovelWorkspaceDeferredSurfacesProps) {
  return (
    <DeferredWorkspaceSurfaces>
      <NovelWorkspaceDeferredCoreSurfaces {...props} />
      <NovelWorkspaceDeferredOpsSurfaces {...props} />
      <NovelWorkspaceDeferredOutlineSurfaces {...props} />
    </DeferredWorkspaceSurfaces>
  )
}
