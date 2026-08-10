import { describe, expect, test } from 'bun:test'
import type { LLMRequest } from './types'
import {
  MultiReferenceTransportError,
  resolveMultiReferenceTransport,
  type MultiReferenceTransportSelection,
} from './multi-reference-transport'

const references = [
  {
    url: '/first.png',
    reference_index: 1,
    reference_id: 'first-frame',
    reference_role: 'first_frame',
  },
  {
    url: '/last.png',
    reference_index: 2,
    reference_id: 'last-frame',
    reference_role: 'last_frame',
  },
]

function request(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    model: 'video-model',
    type: 'image_to_video',
    image_url: '/first.png',
    reference_images: references,
    messages: [{ role: 'user', content: 'animate this shot' }],
    ...overrides,
  } as LLMRequest
}

function multimodalRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return request({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'animate this shot' },
        { type: 'image_url', image_url: { url: '/first.png' } },
        { type: 'image_url', image_url: { url: '/last.png' } },
      ],
    }],
    ...overrides,
  })
}

describe('multi-reference provider transport', () => {
  test('rejects an undeclared media transport instead of silently using image_url', () => {
    expect(() => resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      contextUiParams: {},
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('uses an explicit model capability and enforces its maximum', () => {
    expect(resolveMultiReferenceTransport(request(), {
      apiFormat: 'gemini_native',
      contextUiParams: { multi_reference: { supported: true, max: 9 } },
    })).toMatchObject({ supported: true, max: 9, source: 'model_capability' })

    expect(() => resolveMultiReferenceTransport(request({
      reference_images: [...references, {
        url: '/character.png',
        reference_index: 3,
        reference_id: 'character',
        reference_role: 'character',
      }],
    }), {
      apiFormat: 'gemini_native',
      contextUiParams: { multiReference: { supported: true, max: 2 } },
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('uses provider-level capability aliases after model-level declarations', () => {
    const providerSelection: MultiReferenceTransportSelection = {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      model: { context_ui_params: {} },
      provider: {
        contextUiParams: {
          multiReference: { supported: true, field: 'providerImages', shape: 'urls', max: 2 },
        },
      },
    }
    expect(resolveMultiReferenceTransport(request(), providerSelection)).toMatchObject({
      supported: true,
      source: 'provider_capability',
      field: 'providerImages',
      shape: 'urls',
      max: 2,
    })

    expect(() => resolveMultiReferenceTransport(request({
      reference_images: [...references, {
        url: '/third.png',
        reference_index: 3,
      }],
    }), providerSelection)).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))

    expect(resolveMultiReferenceTransport(request(), {
      ...providerSelection,
      model: {
        context_ui_params: {
          multi_reference: { supported: true, field: 'modelImages', shape: 'metadata', max: 9 },
        },
      },
    })).toMatchObject({
      source: 'model_capability',
      field: 'modelImages',
      shape: 'metadata',
      max: 9,
    })
  })

  test('prioritizes nested and direct model capability entries before provider declarations', () => {
    const threeReferenceRequest = request({
      reference_images: [...references, {
        url: '/third.png',
        reference_index: 3,
      }],
    })
    const provider = {
      context_ui_params: {
        multi_reference: { supported: true, field: 'provider_images', shape: 'urls', max: 2 },
      },
    }

    expect(resolveMultiReferenceTransport(threeReferenceRequest, {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      contextUiParams: {
        multi_reference: { supported: true, field: 'model_images', shape: 'metadata', max: 9 },
      },
      provider,
    })).toMatchObject({
      source: 'model_capability',
      field: 'model_images',
      shape: 'metadata',
      max: 9,
    })

    expect(resolveMultiReferenceTransport(threeReferenceRequest, {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      model: {
        context_ui_params: {
          multi_reference: { supported: true, field: 'nested_model_images', shape: 'urls', max: 8 },
        },
      },
      context_ui_params: {
        multi_reference: { supported: true, field: 'direct_model_images', shape: 'metadata', max: 9 },
      },
      provider,
    })).toMatchObject({
      source: 'model_capability',
      field: 'nested_model_images',
      shape: 'urls',
      max: 8,
    })
  })

  test('requires an explicit array field for non-multimodal media endpoints', () => {
    expect(() => resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      contextUiParams: { multi_reference: { supported: true, max: 9 } },
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))

    expect(resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      contextUiParams: { multi_reference: { supported: true, max: 9 } },
      routeConfig: {
        payload_template: { references: '{{reference_images}}' },
      },
    })).toMatchObject({ supported: true, source: 'model_capability' })

    expect(resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      model: {
        context_ui_params: {},
        contextUiParams: {
          multiReference: { supported: true, field: 'inputImages', shape: 'urls' },
        },
      },
    })).toMatchObject({
      supported: true,
      source: 'model_capability',
      field: 'inputImages',
      shape: 'urls',
    })
  })

  test('treats a recursively nested route template token as an explicit full-array mapping', () => {
    const transport = resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      routeConfig: {
        payload_template: {
          input: {
            references: ['{{reference_images}}'],
          },
        },
      },
    })

    expect(transport).toMatchObject({ supported: true, source: 'route_template' })

    expect(() => resolveMultiReferenceTransport(request(), {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      routeConfig: { payloadTemplate: { image: '{{image_url}}' } },
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('accepts native Gemini and Anthropic message formats only when every reference survives in order', () => {
    expect(resolveMultiReferenceTransport(multimodalRequest(), {
      apiFormat: 'gemini_native',
    })).toMatchObject({ supported: true, source: 'native_multimodal' })

    expect(resolveMultiReferenceTransport(multimodalRequest(), {
      apiFormat: 'anthropic',
      endpoint: 'messages',
    })).toMatchObject({ supported: true, source: 'native_multimodal' })

    expect(() => resolveMultiReferenceTransport(multimodalRequest({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'animate this shot' },
          { type: 'image_url', image_url: { url: '/last.png' } },
          { type: 'image_url', image_url: { url: '/first.png' } },
        ],
      }],
    }), {
      apiFormat: 'gemini_native',
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('requires the exact eligible native image array instead of an ordered subsequence', () => {
    const selections = [
      { apiFormat: 'gemini_native' },
      { apiFormat: 'anthropic', endpoint: 'messages' },
      { apiFormat: 'openai_compatible', endpoint: 'chat/completions' },
    ]
    for (const selection of selections) {
      expect(resolveMultiReferenceTransport(multimodalRequest(), selection)).toMatchObject({
        supported: true,
        source: 'native_multimodal',
      })
      expect(() => resolveMultiReferenceTransport(multimodalRequest({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'animate this shot' },
            { type: 'image_url', image_url: { url: '/first.png' } },
            { type: 'image_url', image_url: { url: '/first.png' } },
            { type: 'image_url', image_url: { url: '/last.png' } },
          ],
        }],
      }), selection)).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
    }
  })

  test('does not count system-only image parts as preserved native multimodal references', () => {
    const systemOnly = request({
      messages: [
        {
          role: 'system',
          content: [
            { type: 'text', text: 'system visual context' },
            { type: 'image_url', image_url: { url: '/first.png' } },
            { type: 'image_url', image_url: { url: '/last.png' } },
          ],
        },
        { role: 'user', content: 'animate this shot' },
      ],
    })

    for (const selection of [
      { apiFormat: 'gemini_native' },
      { apiFormat: 'anthropic', endpoint: 'messages' },
      { apiFormat: 'openai_compatible', endpoint: 'chat/completions' },
    ]) {
      expect(() => resolveMultiReferenceTransport(systemOnly, selection)).toThrow(
        expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }),
      )
    }
  })

  test('preserves duplicate user reference URLs with exact multiplicity across native formats', () => {
    const duplicateReferences = [
      { url: '/same.png', reference_index: 1, reference_id: 'first' },
      { url: '/same.png', reference_index: 2, reference_id: 'character' },
    ]
    const duplicateRequest = request({
      image_url: '/same.png',
      reference_images: duplicateReferences,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'keep both bindings' },
          { type: 'image_url', image_url: { url: '/same.png' } },
          { type: 'image_url', image_url: { url: '/same.png' } },
        ],
      }],
    })
    for (const selection of [
      { apiFormat: 'gemini_native' },
      { apiFormat: 'anthropic', endpoint: 'messages' },
      { apiFormat: 'openai_compatible', endpoint: 'chat/completions' },
    ]) {
      expect(resolveMultiReferenceTransport(duplicateRequest, selection)).toMatchObject({
        supported: true,
        source: 'native_multimodal',
      })
      expect(() => resolveMultiReferenceTransport({
        ...duplicateRequest,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'only one occurrence' },
            { type: 'image_url', image_url: { url: '/same.png' } },
          ],
        }],
      }, selection)).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
      expect(() => resolveMultiReferenceTransport({
        ...duplicateRequest,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'one extra occurrence' },
            { type: 'image_url', image_url: { url: '/same.png' } },
            { type: 'image_url', image_url: { url: '/same.png' } },
            { type: 'image_url', image_url: { url: '/same.png' } },
          ],
        }],
      }, selection)).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
    }
  })

  test('accepts chat/completions only when all ordered image parts are present', () => {
    expect(resolveMultiReferenceTransport(multimodalRequest(), {
      apiFormat: 'openai_compatible',
      endpoint: 'chat/completions',
    })).toMatchObject({ supported: true, source: 'native_multimodal' })

    expect(() => resolveMultiReferenceTransport(multimodalRequest({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'animate this shot' },
          { type: 'image_url', image_url: { url: '/first.png' } },
        ],
      }],
    }), {
      apiFormat: 'openai_compatible',
      endpoint: 'chat/completions',
    })).toThrow(expect.objectContaining({ code: 'MULTI_REFERENCE_UNSUPPORTED' }))
  })

  test('keeps single-image legacy transport without requiring a declaration', () => {
    const single = request({
      image_url: '/first.png',
      reference_images: [references[0]],
    })

    expect(resolveMultiReferenceTransport(single, {
      apiFormat: 'openai_compatible',
      endpoint: 'videos/generations',
      contextUiParams: {},
    })).toEqual({
      supported: true,
      source: 'legacy_single',
      count: 1,
      max: 1,
    })
    expect((single as any).image_url).toBe('/first.png')
  })

  test('exports a typed transport error with a stable 422 code contract', () => {
    const error = new MultiReferenceTransportError(
      'MULTI_REFERENCE_UNSUPPORTED',
      'Provider does not support multiple references',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('MULTI_REFERENCE_UNSUPPORTED')
    expect(error.status).toBe(422)
  })
})
