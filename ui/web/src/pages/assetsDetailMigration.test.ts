import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Asset detail ComfyForge migration', () => {
  test('keeps TS API envelope compatibility for asset and project detail responses', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Detail.tsx'), 'utf8')

    expect(source).toContain('const assetData = res.data?.asset || res.data')
    expect(source).toContain('const projectData = projRes.data?.project || projRes.data')
    expect(source).toContain("setProjectName(projectData?.name || '未知项目')")
  })

  test('opens workflow assets in the dedicated workflow editor from the detail page', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Detail.tsx'), 'utf8')

    expect(source).toContain("const editPath = asset.type === 'workflow'")
    expect(source).toContain("`/assets/workflow-config/edit/${asset.id}`")
    expect(source).toContain("`/assets/${asset.id}/edit`")
    expect(source).toContain('navigate(editPath)')
  })
})
