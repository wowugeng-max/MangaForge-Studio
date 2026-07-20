import { describe, expect, test } from 'bun:test'
import {
  WORKSPACE_AREA_TABS,
} from './workspace-area-tabs'
import {
  defaultWorkspaceArea,
  normalizeWorkspaceArea,
  primaryTabForArea,
  WORKSPACE_PRIMARY_TAB_DEFS,
  WORKSPACE_TOOL_MENU_DEFS,
} from './workspace-core-area'

describe('workspace core area IA', () => {
  test('primary tabs are only outline/writing/assets', () => {
    expect(WORKSPACE_PRIMARY_TAB_DEFS.map(item => item.key)).toEqual([
      'storyPlanning',
      'chapterWriting',
      'storyAssets',
    ])
    expect(WORKSPACE_AREA_TABS.map(item => item.key)).toEqual([
      'storyPlanning',
      'chapterWriting',
      'storyAssets',
    ])
    expect(WORKSPACE_AREA_TABS.map(item => item.label)).toEqual(['大纲', '写作', '资产'])
  })

  test('tool areas remain reachable via more menu', () => {
    expect(WORKSPACE_TOOL_MENU_DEFS.map(item => item.key).sort()).toEqual([
      'autoCreation',
      'productionOps',
      'qualityRevision',
    ].sort())
  })

  test('legacy aliases normalize without dropping tools', () => {
    expect(normalizeWorkspaceArea('outline')).toBe('storyPlanning')
    expect(normalizeWorkspaceArea('writing')).toBe('chapterWriting')
    expect(normalizeWorkspaceArea('assets')).toBe('storyAssets')
    expect(normalizeWorkspaceArea('qualityRevision')).toBe('qualityRevision')
    expect(normalizeWorkspaceArea('autoCreation')).toBe('autoCreation')
    expect(defaultWorkspaceArea()).toBe('chapterWriting')
  })

  test('tool pages still highlight a primary writing/outline context', () => {
    expect(primaryTabForArea('qualityRevision')).toBe('chapterWriting')
    expect(primaryTabForArea('productionOps')).toBe('chapterWriting')
    expect(primaryTabForArea('storyPlanning')).toBe('storyPlanning')
  })
})
