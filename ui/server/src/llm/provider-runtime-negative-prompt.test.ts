import { describe, expect, test } from 'bun:test'
import type { RuntimeModelSelection } from './provider-runtime'
import { prepareNegativePromptRequest } from './provider-runtime-negative-prompt'

function selection(overrides: Partial<RuntimeModelSelection> = {}): RuntimeModelSelection {
  return {
    provider: {
      id: 'provider', display_name: 'Provider', service_type: 'llm', api_format: 'openai_compatible',
      auth_type: 'bearer', supported_modalities: ['text_to_image'], is_active: true, endpoints: {},
      context_ui_params: {},
    },
    key: { id: 1, provider: 'provider', key: 'secret', is_active: true } as any,
    model: {
      id: 1, provider: 'provider', display_name: 'Image', model_name: 'image',
      capabilities: { text_to_image: true }, context_ui_params: {},
    },
    baseUrl: 'https://example.com/v1', endpoint: 'images/generations', routeType: 'text_to_image',
    routeConfig: {}, apiFormat: 'openai_compatible',
    ...overrides,
  }
}

describe('target negative-prompt transport', () => {
  test('recursively detects only an exact negative_prompt template token', () => {
    const request = {
      model: 'image', prompt: 'POS', messages: [{ role: 'user', content: 'POS' }],
      type: 'text_to_image', negative_prompt: 'NEG',
    } as any

    const exact = prepareNegativePromptRequest(request, selection(), 'text_to_image', {
      payload: { inputs: [{ negative: ' {{negative_prompt}} ' }] },
    })
    const partial = prepareNegativePromptRequest(request, selection(), 'text_to_image', {
      prompt: '{{prompt}} -- {{negative_prompt}}',
    })

    expect(exact.transport).toEqual({ source: 'template' })
    expect(exact.request).toBe(request)
    expect(partial.transport).toEqual({ source: 'merged' })
    expect(partial.request.prompt).toBe('POS\n\nNegative prompt: NEG')
  })

  test('resolves route, model, and provider declarations with mode-specific values before root values', () => {
    const request = {
      model: 'image', prompt: 'POS', messages: [{ role: 'user', content: 'POS' }],
      type: 'text_to_image', negative_prompt: 'NEG',
    } as any
    const provider = {
      ...selection().provider,
      context_ui_params: {
        text_to_image: [{ name: 'negative_prompt', field: 'provider_mode_negative' }],
        negative_prompt: { supported: true, field: 'provider_root_negative' },
      },
    } as any
    const model = {
      ...selection().model,
      context_ui_params: {
        text_to_image: [{ name: 'negative_prompt', field: 'model_mode_negative' }],
        negative_prompt: { supported: true, field: 'model_root_negative' },
      },
    } as any

    expect(prepareNegativePromptRequest(request, selection({
      provider,
      model,
      routeConfig: {
        text_to_image: [{ name: 'negative_prompt', field: 'route_mode_negative' }],
        negative_prompt: { supported: true, field: 'route_root_negative' },
      },
    }), 'text_to_image').transport).toEqual({ source: 'route', field: 'route_mode_negative' })

    expect(prepareNegativePromptRequest(request, selection({ provider, model }), 'text_to_image').transport)
      .toEqual({ source: 'model', field: 'model_mode_negative' })

    expect(prepareNegativePromptRequest(request, selection({
      provider,
      model: { ...model, context_ui_params: { negative_prompt: model.context_ui_params.negative_prompt } },
    }), 'text_to_image').transport).toEqual({ source: 'model', field: 'model_root_negative' })

    expect(prepareNegativePromptRequest(request, selection({
      provider,
      model: { ...model, capabilities: { text_to_image: true }, context_ui_params: {} },
    }), 'text_to_image').transport).toEqual({ source: 'provider', field: 'provider_mode_negative' })
  })

  test('clones fallback requests and remains idempotent while chat and empty negatives stay untouched', () => {
    const request = {
      model: 'image', prompt: 'POS',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'POS' }, { type: 'image_url', image_url: { url: 'https://example.com/ref.png' } }] }],
      type: 'text_to_image', negative_prompt: 'NEG',
    } as any
    const original = structuredClone(request)

    const first = prepareNegativePromptRequest(request, selection(), 'text_to_image')
    const repeated = prepareNegativePromptRequest(first.request, selection(), 'text_to_image')
    const chat = prepareNegativePromptRequest({ ...request, type: 'chat' }, selection(), 'chat')
    const empty = prepareNegativePromptRequest({ ...request, negative_prompt: '' }, selection(), 'text_to_image')
    const whitespaceRequest = { ...request, negative_prompt: '   ' }
    const whitespace = prepareNegativePromptRequest(whitespaceRequest, selection(), 'text_to_image')

    expect(first.transport).toEqual({ source: 'merged' })
    expect(first.request.prompt).toBe('POS\n\nNegative prompt: NEG')
    expect(first.request.negative_prompt).toBeUndefined()
    expect((first.request.messages[0].content as any[])[0].text).toBe('POS\n\nNegative prompt: NEG')
    expect(repeated.request.prompt).toBe('POS\n\nNegative prompt: NEG')
    expect(JSON.stringify(repeated.request).match(/Negative prompt: NEG/g)).toHaveLength(2)
    expect(chat.transport).toEqual({ source: 'non_media' })
    expect(chat.request.negative_prompt).toBe('NEG')
    expect(empty.transport).toEqual({ source: 'empty' })
    expect(whitespace.transport).toEqual({ source: 'empty' })
    expect(whitespace.request).toBe(whitespaceRequest)
    expect(request).toEqual(original)
  })
})
