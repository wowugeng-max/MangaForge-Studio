import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildModelEditorInitialValues } from './ModelManager'

describe('ModelManager key binding', () => {
  test('creates manual models bound to the selected API key id instead of provider only', () => {
    const source = readFileSync(join(import.meta.dir, 'ModelManager.tsx'), 'utf8')

    expect(source).toContain('api_key_id: Number(values.api_key_id || 0) || undefined')
    expect(source).toContain('name="api_key_id"')
    expect(source).toContain('value: k.id')
    expect(source).toContain('provider: selectedKeyRecord?.provider')
  })

  test('exposes model-level protocol override in the editor', () => {
    const source = readFileSync(join(import.meta.dir, 'ModelManager.tsx'), 'utf8')
    const formSource = readFileSync(join(import.meta.dir, '../components/admin/ModelRuntimeConfigForm.tsx'), 'utf8')
    const configSource = readFileSync(join(import.meta.dir, '../components/admin/modelRuntimeConfig.ts'), 'utf8')
    const runtimeConfigSource = `${formSource}\n${configSource}`

    expect(runtimeConfigSource).toContain('name="api_format"')
    expect(runtimeConfigSource).toContain('跟随厂商默认协议')
    expect(runtimeConfigSource).toContain('Claude Code / Anthropic Messages')
    expect(source).toContain('buildModelRuntimeSavePayload')
  })

  test('uses structured runtime controls instead of raw UI params JSON', () => {
    const source = readFileSync(join(import.meta.dir, 'ModelManager.tsx'), 'utf8')
    const formSource = readFileSync(join(import.meta.dir, '../components/admin/ModelRuntimeConfigForm.tsx'), 'utf8')
    const configSource = readFileSync(join(import.meta.dir, '../components/admin/modelRuntimeConfig.ts'), 'utf8')
    const runtimeConfigSource = `${formSource}\n${configSource}`
    const editorSource = readFileSync(join(import.meta.dir, '../components/admin/ModelParamEditor.tsx'), 'utf8')

    expect(source).toContain('ModelRuntimeConfigForm')
    expect(runtimeConfigSource).toContain('上下文窗口')
    expect(runtimeConfigSource).toContain('1M')
    expect(runtimeConfigSource).toContain('256K')
    expect(source).not.toContain('UI 参数 JSON')
    expect(editorSource).not.toContain('配置参数 (JSON)')
    expect(editorSource).toContain('配置参数')
  })

  test('hydrates structured runtime editor defaults instead of rendering UI params JSON strings', () => {
    expect(buildModelEditorInitialValues()).toMatchObject({
      is_manual: true,
      is_active: true,
      capabilities: '{\n  "chat": true\n}',
      api_format: '',
      context_window_preset: '1m',
      context_window: 1_000_000,
      max_tokens: 8192,
      temperature: 0.7,
    })

    expect(buildModelEditorInitialValues({
      display_name: 'Vision',
      model_name: 'vision-model',
      capabilities: { vision: true, chat: true },
      context_ui_params: {
        context_window: 256_000,
        max_tokens: 12_000,
        temperature: 0.2,
        vision: [{ name: 'image_url', type: 'image' }],
      },
    })).toMatchObject({
      capabilities: '{\n  "vision": true,\n  "chat": true\n}',
      context_window_preset: '256k',
      context_window: 256_000,
      max_tokens: 12_000,
      temperature: 0.2,
    })
  })
})
