import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Assets index ComfyForge migration', () => {
  test('restores upstream project scope selection instead of loading all assets by default', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('function normalizeProjectList')
    expect(source).toContain('const [projects, setProjects]')
    expect(source).toContain('const [selectedProjectId, setSelectedProjectId]')
    expect(source).toContain("setScope('global')")
    expect(source).toContain('fetchAssets(selectedProjectId)')
    expect(source).toContain("value: 'global'")
    expect(source).toContain('...projects.map')
    expect(source).toContain("setScope('project')")
  })

  test('uses the full workflow editor from the assets index and returns to assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain("const assetsReturnUrl = '/assets'")
    expect(source).toContain('const workflowCreateUrl = `/assets/workflow-config?returnUrl=${encodeURIComponent(assetsReturnUrl)}')
    expect(source).toContain('const workflowEditUrl = editingAsset?.type === \'workflow\'')
    expect(source).toContain('/assets/workflow-config/edit/${editingAsset.id}?returnUrl=${encodeURIComponent(assetsReturnUrl)}')
    expect(source).toContain('navigate(workflowEditUrl)')
    expect(source).toContain('navigate(workflowCreateUrl)')
  })

  test('restores the upstream asset detail entry from the assets index', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('EyeOutlined')
    expect(source).toContain('onView?: (asset: Asset) => void')
    expect(source).toContain('const viewAsset = (asset: Asset) =>')
    expect(source).toContain("asset.type === 'workflow'")
    expect(source).toContain('/assets/workflow-config/view/${asset.id}?returnUrl=${encodeURIComponent(assetsReturnUrl)}')
    expect(source).toContain('navigate(`/assets/${asset.id}`)')
    expect(source).toContain('onView={viewAsset}')
  })

  test('preserves workflow metadata when saving from the assets index drawer', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('function pickWorkflowAssetMetadata')
    expect(source).toContain('return { ...pickWorkflowAssetMetadata(editingAsset.data), workflow_json:')
  })

  test('keeps quick create limited to asset types that have complete inline fields', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('const quickCreateTypeOptions')
    expect(source).toContain("navigate('/assets/create')")
    expect(source).toContain('options={quickCreateTypeOptions}')
    expect(source).not.toContain("options={[{ value: 'prompt', label: '提示词' }, { value: 'image', label: '图像' }, { value: 'video', label: '视频' }, { value: 'workflow', label: '工作流' }]}")
  })

  test('keeps upstream character assets visible in the assets index filters and cards', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('AppstoreAddOutlined')
    expect(source).toContain("asset.type === 'character'")
    expect(source).toContain("{ value: 'character', label: '角色' }")
  })

  test('keeps upstream description search for character and prompt assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain("import { assetMatchesSearch } from '../../utils/assetSearch'")
    expect(source).toContain('assetMatchesSearch(asset, searchText)')
  })

  test('keeps character core prompts searchable in the assets index', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'index.tsx'), 'utf8')

    expect(source).toContain('assetMatchesSearch(asset, searchText)')
  })
})
