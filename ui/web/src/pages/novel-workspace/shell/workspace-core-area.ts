/** Core workspace IA: primary tabs + demoted tool areas. */
import type { WorkspaceArea } from './workspace-types'

export const WORKSPACE_PRIMARY_AREAS = ['storyPlanning', 'chapterWriting', 'storyAssets'] as const
export type WorkspacePrimaryArea = (typeof WORKSPACE_PRIMARY_AREAS)[number]

export const WORKSPACE_TOOL_AREAS = ['autoCreation', 'qualityRevision', 'productionOps'] as const
export type WorkspaceToolArea = (typeof WORKSPACE_TOOL_AREAS)[number]

export const WORKSPACE_PRIMARY_TAB_DEFS: Array<{ key: WorkspacePrimaryArea; label: string }> = [
  { key: 'storyPlanning', label: '大纲' },
  { key: 'chapterWriting', label: '写作' },
  { key: 'storyAssets', label: '资产' },
]

export const WORKSPACE_TOOL_MENU_DEFS: Array<{ key: WorkspaceToolArea; label: string; group: string }> = [
  { key: 'autoCreation', label: '自动创作', group: '生产与自动化' },
  { key: 'productionOps', label: '生产运营 / 无人值守', group: '生产与自动化' },
  { key: 'qualityRevision', label: '质检工具箱', group: '诊断' },
]

export const WORKSPACE_AREA_LABELS: Record<WorkspaceArea, string> = {
  autoCreation: '自动创作',
  storyPlanning: '大纲',
  chapterWriting: '写作',
  storyAssets: '资产',
  qualityRevision: '质检工具箱',
  productionOps: '生产运营',
}

export function isWorkspacePrimaryArea(area: string | null | undefined): area is WorkspacePrimaryArea {
  return WORKSPACE_PRIMARY_AREAS.includes(area as WorkspacePrimaryArea)
}

export function isWorkspaceToolArea(area: string | null | undefined): area is WorkspaceToolArea {
  return WORKSPACE_TOOL_AREAS.includes(area as WorkspaceToolArea)
}

/** Map legacy/deep-link areas onto the simplified shell without dropping capabilities. */
export function normalizeWorkspaceArea(area: string | null | undefined): WorkspaceArea {
  const value = String(area || '')
  switch (value) {
    case 'outline':
    case 'planning':
    case 'storyPlanning':
      return 'storyPlanning'
    case 'writing':
    case 'chapterWriting':
    case 'quality':
    case 'qualityRevision':
      // quality is part of writing closed loop; keep dedicated tool page only when explicitly opened as tool
      return value === 'qualityRevision' ? 'qualityRevision' : 'chapterWriting'
    case 'assets':
    case 'storyAssets':
      return 'storyAssets'
    case 'autoCreation':
    case 'director':
      return 'autoCreation'
    case 'productionOps':
    case 'ops':
      return 'productionOps'
    default:
      return 'chapterWriting'
  }
}

export function primaryTabForArea(area: WorkspaceArea): WorkspacePrimaryArea {
  if (area === 'storyPlanning') return 'storyPlanning'
  if (area === 'storyAssets') return 'storyAssets'
  // writing + demoted tools still highlight 写作 when user is in quality toolbox mid-flow? prefer writing
  if (area === 'qualityRevision') return 'chapterWriting'
  if (area === 'autoCreation' || area === 'productionOps') return 'chapterWriting'
  return 'chapterWriting'
}

export function defaultWorkspaceArea(): WorkspaceArea {
  return 'chapterWriting'
}
