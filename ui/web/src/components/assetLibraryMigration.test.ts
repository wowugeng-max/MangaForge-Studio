import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('AssetLibrary ComfyForge migration', () => {
  test('restores image and video upload-backed asset creation and editing', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain("apiClient.post('/assets/upload/image'")
    expect(source).toContain("apiClient.post('/assets/upload/video'")
    expect(source).toContain('setCreateUploadedImage')
    expect(source).toContain('setCreateUploadedVideo')
    expect(source).toContain('setUploadedImageInfo')
    expect(source).toContain('setUploadedVideoInfo')
    expect(source).toContain("message.warning('请先上传图片')")
    expect(source).toContain("message.warning('请先上传视频')")
    expect(source).toContain('file_path: createUploadedImage.file_path')
    expect(source).toContain('file_path: createUploadedVideo.file_path')
    expect(source).toContain('negative_prompt')
  })

  test('restores upstream tag input and AI generation lineage display', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain("import TagsInput from './TagsInput'")
    expect(source).toContain('<TagsInput />')
    expect(source).toContain('AI 生成溯源')
    expect(source).toContain('source_provider')
    expect(source).toContain('source_model')
    expect(source).toContain('source_mode')
    expect(source).toContain('source_aspect_ratio')
    expect(source).toContain('source_size')
    expect(source).toContain('source_prompt')
    expect(source).toContain('source_camera_params')
  })

  test('restores workflow full-editor navigation with canvas return url', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain("const canvasReturnUrl = projectId ? `/project/${projectId}` : '/'")
    expect(source).toContain('/assets/workflow-config/edit/${editingAsset.id}?returnUrl=${encodeURIComponent(canvasReturnUrl)}')
    expect(source).toContain("const workflowCreateUrl = `/assets/workflow-config?returnUrl=${encodeURIComponent(canvasReturnUrl)}${projectId ? `&projectId=${projectId}` : ''}`")
    expect(source).toContain('navigate(workflowCreateUrl)')
    expect(source).toContain('在完整编辑器中打开')
  })

  test('keeps canvas asset sidebar in project scope when projectId is provided and global when absent', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain("setScope(projectId ? 'project' : 'global')")
    expect(source).toContain('fetchAssets(projectId)')
  })

  test('preserves workflow metadata when saving from the canvas asset sidebar drawer', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain('function pickWorkflowAssetMetadata')
    expect(source).toContain('return { ...pickWorkflowAssetMetadata(editingAsset.data), workflow_json:')
  })

  test('keeps sidebar quick create limited to asset types with complete inline fields', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain('const quickCreateTypeOptions')
    expect(source).toContain("const [createType, setCreateType] = useState<(typeof quickCreateTypeOptions)[number]['value']>('prompt')")
    expect(source).toContain("{ value: 'node_config', label: '节点配置' }")
    expect(source).toContain("{ value: 'node_template', label: '节点模板' }")
    expect(source).toContain('options={quickCreateTypeOptions}')
  })

  test('keeps upstream character assets visible in the canvas asset sidebar filters and cards', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain('AppstoreAddOutlined')
    expect(source).toContain("asset.type === 'character'")
    expect(source).toContain("{ value: 'character', label: '角色' }")
  })

  test('searches asset descriptions in the canvas asset sidebar', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain("import { assetMatchesSearch } from '../utils/assetSearch'")
    expect(source).toContain('assetMatchesSearch(asset, searchText)')
  })

  test('searches character core prompts in the canvas asset sidebar', () => {
    const source = readFileSync(join(import.meta.dir, 'AssetLibrary.tsx'), 'utf8')

    expect(source).toContain('assetMatchesSearch(asset, searchText)')
  })
})
