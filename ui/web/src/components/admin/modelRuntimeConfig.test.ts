import { describe, expect, test } from 'bun:test'
import {
  buildModelRuntimeInitialValues,
  buildModelRuntimeSavePayload,
  CONTEXT_WINDOW_PRESETS,
} from './modelRuntimeConfig'

describe('model runtime config helpers', () => {
  test('defaults new models to provider protocol and 1M context window', () => {
    expect(buildModelRuntimeInitialValues()).toMatchObject({
      api_format: '',
      context_window_preset: '1m',
      context_window: 1_000_000,
      max_tokens: 8192,
      temperature: 0.7,
    })
    expect(CONTEXT_WINDOW_PRESETS.map(item => item.value)).toEqual(['1m', '256k', '128k', '32k', 'custom'])
  })

  test('hydrates structured controls from existing runtime params', () => {
    expect(buildModelRuntimeInitialValues({
      api_format: 'claude_code',
      context_ui_params: {
        context_window: 256_000,
        max_tokens: 12_000,
        temperature: 0.35,
      },
    })).toMatchObject({
      api_format: 'claude_code',
      context_window_preset: '256k',
      context_window: 256_000,
      max_tokens: 12_000,
      temperature: 0.35,
    })
  })

  test('hydrates model-level response mode and custom headers from runtime params', () => {
    expect(buildModelRuntimeInitialValues({
      context_ui_params: {
        response_mode: 'non_stream',
        custom_headers: {
          'X-Client': 'model-client',
          'X-Model-Only': 'model-header',
        },
      },
    })).toMatchObject({
      response_mode: 'non_stream',
      custom_headers_list: [
        { key: 'X-Client', value: 'model-client' },
        { key: 'X-Model-Only', value: 'model-header' },
      ],
    })
  })

  test('serializes structured runtime fields into model payload while preserving custom params', () => {
    const payload = buildModelRuntimeSavePayload({
      api_format: 'claude_code',
      context_window_preset: '1m',
      context_window: 1_000_000,
      max_tokens: 16_384,
      temperature: 0.6,
      response_mode: 'stream',
      custom_headers_list: [
        { key: 'User-Agent', value: 'ModelUA/2.0' },
        { key: 'X-Model-Route', value: 'opus-only' },
        { key: '', value: 'ignored' },
      ],
    }, {
      context_ui_params: {
        text_to_image: [{ name: 'size', type: 'select' }],
      },
      capabilities: { chat: true, vision: true, text_to_image: true },
    })

    expect(payload.api_format).toBe('claude_code')
    expect(payload.context_ui_params).toMatchObject({
      context_window: 1_000_000,
      max_context: 1_000_000,
      context_window_preset: '1m',
      max_tokens: 16_384,
      temperature: 0.6,
      response_mode: 'stream',
      custom_headers: {
        'User-Agent': 'ModelUA/2.0',
        'X-Model-Route': 'opus-only',
      },
      text_to_image: [{ name: 'size', type: 'select' }],
    })
    expect(payload.context_ui_params.chat).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'context_window', default: 1_000_000 }),
      expect.objectContaining({ name: 'max_tokens', default: 16_384 }),
      expect.objectContaining({ name: 'temperature', default: 0.6 }),
    ]))
    expect(payload.context_ui_params.vision).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'context_window', default: 1_000_000 }),
    ]))
  })

  test('uses custom preset when context window is not an industry preset', () => {
    const payload = buildModelRuntimeSavePayload({
      api_format: '',
      context_window_preset: 'custom',
      context_window: 512_000,
      max_tokens: 10_000,
      temperature: 0.2,
    }, {
      capabilities: { chat: true },
    })

    expect(payload.api_format).toBe('')
    expect(payload.context_ui_params.context_window_preset).toBe('custom')
    expect(payload.context_ui_params.context_window).toBe(512_000)
  })
})
