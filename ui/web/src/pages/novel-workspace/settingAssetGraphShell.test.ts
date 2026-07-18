import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

function panelSource() {
  return [
    source('SettingAssetGraphPanel.tsx'),
    source('setting-asset-graph-helpers.tsx'),
  ].join('\n')
}

describe('setting asset relationship graph shell', () => {
  test('integrates the graph panel into the story assets workspace', () => {
    const workspace = source('StoryAssetsWorkspace.tsx')

    expect(workspace).toContain("import { SettingAssetGraphPanel } from './SettingAssetGraphPanel'")
    expect(workspace).toContain('<SettingAssetGraphPanel')
    expect(workspace).toContain('projectId={projectId}')
  })

  test('renders a relationship graph panel with diagnostics and asset metadata', () => {
    const panel = panelSource()

    expect(panel).toContain('/settings/relationship-graph')
    expect(panel).toContain('ReactFlow')
    expect(panel).toContain('资产关系图谱')
    expect(panel).toContain('关系诊断')
    expect(panel).toContain('年龄')
    expect(panel).toContain('境界')
    expect(panel).toContain('能力')
    expect(panel).toContain('功法')
    expect(panel).toContain('势力')
    expect(panel).toContain('剧情线')
    expect(panel).toContain('开始章节')
    expect(panel).toContain('关系状态')
    expect(panel).toContain('状态变化')
    expect(panel).toContain('合理性')
    expect(panel).toContain('证据')
    expect(panel).toContain('时间冲突')
    expect(panel).toContain('归属冲突')
    expect(panel).toContain('定位资产')
    expect(panel).toContain('graphMode')
    expect(panel).toContain('角色中心')
    expect(panel).toContain('风险')
    expect(panel).toContain('diagnosticEntityIds')
  })

  test('offers a large modal view for reading dense relationship graphs', () => {
    const panel = panelSource()
    const css = source('SettingAssetGraphPanel.css')

    expect(panel).toContain('Modal')
    expect(panel).toContain('FullscreenOutlined')
    expect(panel).toContain('graphExpandedOpen')
    expect(panel).toContain('setGraphExpandedOpen')
    expect(panel).toContain('renderGraphWorkspace')
    expect(panel).toContain('大窗口查看')
    expect(panel).toContain('setting-asset-graph-modal')
    expect(panel).toContain('setting-asset-graph-modal-canvas')
    expect(css).toContain('.setting-asset-graph-modal')
    expect(css).toContain('.setting-asset-graph-modal-body')
    expect(css).toContain('.setting-asset-graph-modal-canvas')
    expect(css).toContain('height: min(72vh, 760px)')
  })

  test('supports model-assisted relationship repair for isolated assets', () => {
    const workspace = source('StoryAssetsWorkspace.tsx')
    const panel = panelSource()

    expect(workspace).toContain('selectedModelId={selectedModelId}')
    expect(panel).toContain('selectedModelId')
    expect(panel).toContain('relationship-repair/suggest')
    expect(panel).toContain('relationship-repair/apply')
    expect(panel).toContain('repairPatches')
    expect(panel).toContain('selectedRepairPatchKeys')
    expect(panel).toContain('模型挂钩孤立资产')
    expect(panel).toContain('关系补丁确认')
    expect(panel).toContain('applySelectedRelationshipPatches')
    expect(panel).toContain('patchTypeLabel')
  })

  test('lets both embedded and modal graph details collapse for a wider canvas', () => {
    const panel = panelSource()
    const css = source('SettingAssetGraphPanel.css')

    expect(panel).toContain('EyeInvisibleOutlined')
    expect(panel).toContain('EyeOutlined')
    expect(panel).toContain('graphDetailCollapsed')
    expect(panel).toContain('modalGraphDetailCollapsed')
    expect(panel).toContain('toggleDetailLabel')
    expect(panel).toContain('隐藏详情')
    expect(panel).toContain('显示详情')
    expect(panel).toContain('is-detail-collapsed')
    expect(panel).toContain('!detailCollapsed && renderGraphDetail')
    expect(css).toContain('.setting-asset-graph-body.is-detail-collapsed')
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(css).toContain('.setting-asset-graph-toolbar')
  })
})
