import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildProviderSubmitPayload, PRESET_PROVIDERS } from './index'

describe('provider manager migration behavior', () => {
  test('normalizes provider form values into the backend payload', () => {
    const result = buildProviderSubmitPayload({
      id: 'dashscope',
      display_name: 'DashScope',
      custom_headers_list: [
        { key: 'X-Test', value: '1' },
        { key: '', value: 'ignored' },
      ],
      endpoints: {
        chat: '/chat/completions',
        text_to_image: '{ "url": "https://dashscope.example/t2i", "result_extractor": "output.url" }',
        image_to_video: '',
      },
    })

    expect(result).toEqual({
      ok: true,
      payload: {
        id: 'dashscope',
        display_name: 'DashScope',
        custom_headers: { 'X-Test': '1' },
        endpoints: {
          chat: '/chat/completions',
          text_to_image: { url: 'https://dashscope.example/t2i', result_extractor: 'output.url' },
        },
      },
    })
  })

  test('reports the exact endpoint when DSL JSON is malformed', () => {
    expect(buildProviderSubmitPayload({
      endpoints: {
        text_to_video: '{bad json',
      },
    })).toEqual({
      ok: false,
      error: '[text_to_video] 路由的 JSON 格式错误，请检查大括号和引号！',
    })
  })

  test('keeps the upstream provider active-state switch in the drawer form', () => {
    const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')

    expect(source).toContain('name="is_active"')
    expect(source).toContain('当前节点状态')
    expect(source).toContain('checkedChildren="已激活"')
    expect(source).toContain('unCheckedChildren="已休眠"')
  })

  test('offers a Gemini Native preset that matches the runtime adapter', () => {
    const preset = PRESET_PROVIDERS.find(item => item.data.api_format === 'gemini_native')

    expect(preset?.label).toContain('Gemini')
    expect(preset?.data).toMatchObject({
      id: 'gemini',
      display_name: 'Google Gemini',
      api_format: 'gemini_native',
      auth_type: 'Bearer',
      default_base_url: 'https://generativelanguage.googleapis.com/v1beta',
      supported_modalities: ['chat', 'vision'],
      response_mode: 'auto',
      is_active: true,
    })
  })
})
