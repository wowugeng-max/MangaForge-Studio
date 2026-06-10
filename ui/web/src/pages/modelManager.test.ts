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

    expect(source).toContain('name="api_format"')
    expect(source).toContain('跟随厂商默认协议')
    expect(source).toContain('Claude Code / Anthropic Messages')
    expect(source).toContain('api_format: values.api_format || undefined')
  })

  test('serializes JSON editor defaults instead of rendering object values', () => {
    expect(buildModelEditorInitialValues()).toMatchObject({
      is_manual: true,
      is_active: true,
      capabilities: '{\n  "chat": true\n}',
      context_ui_params: '{}',
    })

    expect(buildModelEditorInitialValues({
      display_name: 'Vision',
      model_name: 'vision-model',
      capabilities: { vision: true, chat: true },
      context_ui_params: { vision: [{ name: 'image_url', type: 'image' }] },
    })).toMatchObject({
      capabilities: '{\n  "vision": true,\n  "chat": true\n}',
      context_ui_params: '{\n  "vision": [\n    {\n      "name": "image_url",\n      "type": "image"\n    }\n  ]\n}',
    })
  })
})
