import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Asset edit ComfyForge migration', () => {
  test('preserves AI source lineage when saving image and video assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Edit.tsx'), 'utf8')

    expect(source).toContain('function pickAssetSourceMetadata')
    expect(source).toContain("key.startsWith('source_')")
    expect(source).toContain('const sourceMetadata = pickAssetSourceMetadata(originalData)')
    expect(source).toContain('data = { ...sourceMetadata, file_path: uploadedImageInfo.file_path')
    expect(source).toContain('data = { ...sourceMetadata, file_path: values.file_path')
    expect(source).toContain('data = { ...sourceMetadata, file_path: uploadedVideoInfo.file_path')
    expect(source).toContain('data = { ...sourceMetadata, file_path: values.file_path')
  })

  test('preserves workflow metadata when saving workflow assets through generic edit route', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Edit.tsx'), 'utf8')

    expect(source).toContain('function pickWorkflowAssetMetadata')
    expect(source).toContain('const workflowMetadata = pickWorkflowAssetMetadata(originalData)')
    expect(source).toContain('data = {')
    expect(source).toContain('...workflowMetadata,')
    expect(source).toContain('workflow_json: values.workflow_json ? JSON.parse(values.workflow_json) : {},')
    expect(source).toContain('parameters: values.parameters ? JSON.parse(values.parameters) : {},')
  })

  test('preserves direct character core prompt metadata when saving character assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Edit.tsx'), 'utf8')

    expect(source).toContain('function pickCharacterAssetMetadata')
    expect(source).toContain('const characterMetadata = pickCharacterAssetMetadata(originalData)')
    expect(source).toContain('...characterMetadata,')
    expect(source).toContain('core_prompt_asset_id: values.core_prompt_asset_id,')
  })

  test('supports editing node config and node template assets', () => {
    const source = readFileSync(join(import.meta.dir, 'Assets', 'Edit.tsx'), 'utf8')

    expect(source).toContain('function pickNodeConfigAssetMetadata')
    expect(source).toContain('function pickNodeTemplateAssetMetadata')
    expect(source).toContain("asset.type === 'node_config'")
    expect(source).toContain("asset.type === 'node_template'")
    expect(source).toContain("assetType === 'node_config'")
    expect(source).toContain("assetType === 'node_template'")
    expect(source).toContain("case 'node_config':")
    expect(source).toContain("case 'node_template':")
    expect(source).toContain('nodeType: values.nodeType,')
    expect(source).toContain('config: values.config ? JSON.parse(values.config) : {},')
    expect(source).toContain('nodes: values.nodes ? JSON.parse(values.nodes) : [],')
    expect(source).toContain('edges: values.edges ? JSON.parse(values.edges) : [],')
  })
})
