import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('setting asset relationship graph shell', () => {
  test('integrates the graph panel into the story assets workspace', () => {
    const workspace = source('StoryAssetsWorkspace.tsx')

    expect(workspace).toContain("import { SettingAssetGraphPanel } from './SettingAssetGraphPanel'")
    expect(workspace).toContain('<SettingAssetGraphPanel')
    expect(workspace).toContain('projectId={projectId}')
  })

  test('renders a relationship graph panel with diagnostics and asset metadata', () => {
    const panel = source('SettingAssetGraphPanel.tsx')

    expect(panel).toContain('/settings/relationship-graph')
    expect(panel).toContain('ReactFlow')
    expect(panel).toContain('资产关系图谱')
    expect(panel).toContain('关系诊断')
    expect(panel).toContain('年龄')
    expect(panel).toContain('境界')
    expect(panel).toContain('能力')
    expect(panel).toContain('势力')
    expect(panel).toContain('剧情线')
  })
})
