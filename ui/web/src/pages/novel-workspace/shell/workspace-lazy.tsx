import { lazy } from 'react'

const AgentExecutionModal = lazy(() => import('../AgentExecutionModal').then(module => ({ default: module.AgentExecutionModal })))
const AgentAuditDrawer = lazy(() => import('../AgentAuditDrawer').then(module => ({ default: module.AgentAuditDrawer })))
const AutoCreationDirectorWorkspace = lazy(() => import('../AutoCreationDirectorWorkspace').then(module => ({ default: module.AutoCreationDirectorWorkspace })))
const ChapterManagementDrawer = lazy(() => import('../ChapterManagementDrawer').then(module => ({ default: module.ChapterManagementDrawer })))
const ChapterRestructurePanel = lazy(() => import('../ChapterRestructurePanel').then(module => ({ default: module.ChapterRestructurePanel })))
const ConsistencyGraphModal = lazy(() => import('../ConsistencyGraphModal').then(module => ({ default: module.ConsistencyGraphModal })))
const CreativeCardsModal = lazy(() => import('../CreativeCardsModal').then(module => ({ default: module.CreativeCardsModal })))
const EditorModal = lazy(() => import('../EditorModal').then(module => ({ default: module.EditorModal })))
const ExportDeliveryModal = lazy(() => import('../ExportDeliveryModal').then(module => ({ default: module.ExportDeliveryModal })))
const OutlineControlPanel = lazy(() => import('../OutlineControlPanel').then(module => ({ default: module.OutlineControlPanel })))
const OutlineTreeModal = lazy(() => import('../OutlineTreeModal').then(module => ({ default: module.OutlineTreeModal })))
const ReferenceConfigModal = lazy(() => import('../ReferenceConfigModal').then(module => ({ default: module.ReferenceConfigModal })))
const ReferenceEngineeringModal = lazy(() => import('../ReferenceEngineeringModal').then(module => ({ default: module.ReferenceEngineeringModal })))
const QualityBenchmarkModal = lazy(() => import('../QualityBenchmarkModal').then(module => ({ default: module.QualityBenchmarkModal })))
const ReviewAnnotationsDrawer = lazy(() => import('../ReviewAnnotationsDrawer').then(module => ({ default: module.ReviewAnnotationsDrawer })))
const TaskCenterDrawer = lazy(() => import('../TaskCenterDrawer').then(module => ({ default: module.TaskCenterDrawer })))
const VersionDetailModal = lazy(() => import('../VersionDetailModal').then(module => ({ default: module.VersionDetailModal })))

export {
  AgentExecutionModal,
  AgentAuditDrawer,
  AutoCreationDirectorWorkspace,
  ChapterManagementDrawer,
  ChapterRestructurePanel,
  ConsistencyGraphModal,
  CreativeCardsModal,
  EditorModal,
  ExportDeliveryModal,
  OutlineControlPanel,
  OutlineTreeModal,
  ReferenceConfigModal,
  ReferenceEngineeringModal,
  QualityBenchmarkModal,
  ReviewAnnotationsDrawer,
  TaskCenterDrawer,
  VersionDetailModal,
}
