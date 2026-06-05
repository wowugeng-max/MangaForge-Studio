import { afterEach, describe, expect, test } from 'bun:test'
import { ConfiguredProviderAdapter } from './adapter'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('ConfiguredProviderAdapter Codex Responses requests', () => {
  test('does not force json_object text format for plain text probes', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ output_text: 'OK', status: 'completed' }), { status: 200 })
    }) as typeof fetch

    const adapter = new ConfiguredProviderAdapter(
      {
        id: 'codex-proxy',
        display_name: 'Codex Proxy',
        service_type: 'llm',
        api_format: 'codex_responses',
        auth_type: 'bearer',
        response_mode: 'auto',
        supported_modalities: ['chat'],
        default_base_url: 'https://api.openai.com/v1',
        is_active: true,
        endpoints: { responses: '/responses' },
        custom_headers: {},
      },
      {
        id: 1,
        provider: 'codex-proxy',
        key: 'sk-test',
        description: '',
        is_active: true,
        quota_total: 0,
        quota_used: 0,
        tags: [],
      },
      {
        id: 1,
        api_key_id: 1,
        provider: 'codex-proxy',
        display_name: 'GPT Codex',
        model_name: 'gpt-5-codex',
        capabilities: { chat: true },
        health_status: 'unknown',
        is_favorite: false,
        is_manual: true,
        context_ui_params: {},
      },
    )

    await adapter.execute({
      model: 'balanced',
      messages: [{ role: 'user', content: 'Return exactly: OK' }],
      temperature: 0,
      max_tokens: 8,
      response_format: 'text',
    })

    expect(capturedBody).toMatchObject({
      model: 'gpt-5-codex',
      input: [{ role: 'user', content: 'Return exactly: OK' }],
      max_output_tokens: 8,
      temperature: 0,
    })
    expect(capturedBody).not.toHaveProperty('messages')
    expect(capturedBody).not.toHaveProperty('max_tokens')
    expect(capturedBody).not.toHaveProperty('text')
  })
})
