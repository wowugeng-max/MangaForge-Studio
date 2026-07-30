import { describe, expect, test } from 'bun:test'
import { createMcpSecretScrubber } from './secret-scrubber'

describe('MCP secret scrubber', () => {
  test('recursively removes configured credentials while preserving safe metadata', () => {
    const scrubber = createMcpSecretScrubber({
      keys: ['sk_test_reflected_secret'],
      headerValues: ['private-space-token', 'session=private-cookie'],
    })
    const output = scrubber.scrubValue({
      error: 'Authorization: Bearer sk_test_reflected_secret',
      nested: ['X-Space=private-space-token', 'Cookie: session=private-cookie'],
      safe: 'agent-1',
      status: 'failed',
    })

    expect(JSON.stringify(output)).not.toContain('sk_test_reflected_secret')
    expect(JSON.stringify(output)).not.toContain('private-space-token')
    expect(JSON.stringify(output)).not.toContain('private-cookie')
    expect(output).toMatchObject({ safe: 'agent-1', status: 'failed' })
  })

  test('redacts case-insensitive sensitive fields as whole values', () => {
    const output = createMcpSecretScrubber().scrubValue({
      authorization: 'Basic public-looking-value',
      'Proxy-Authorization': { nested: 'must disappear' },
      Cookie: 'ordinary-cookie',
      'Set-Cookie': ['one', 'two'],
      api_key: 'short',
      'API-Key': 'another',
      token: 42,
      Secret: { value: 'hidden' },
      safe: 'visible',
    })

    expect(output).toEqual({
      authorization: '[REDACTED]',
      'Proxy-Authorization': '[REDACTED]',
      Cookie: '[REDACTED]',
      'Set-Cookie': '[REDACTED]',
      api_key: '[REDACTED]',
      'API-Key': '[REDACTED]',
      token: '[REDACTED]',
      Secret: '[REDACTED]',
      safe: 'visible',
    })
  })

  test('removes generic bearer, sk_, authorization, and cookie reflections without configured values', () => {
    const output = createMcpSecretScrubber().scrubText([
      'Bearer opaque-token-value',
      'sk_syntheticgeneric123',
      'Authorization=Basic reflected-auth-value',
      'Cookie: session=reflected-cookie-value',
    ].join('\n'))

    expect(output).not.toContain('opaque-token-value')
    expect(output).not.toContain('sk_syntheticgeneric123')
    expect(output).not.toContain('reflected-auth-value')
    expect(output).not.toContain('reflected-cookie-value')
  })

  test('handles nested arrays, circular objects, and Error messages without mutation', () => {
    const secret = 'synthetic-circular-secret'
    const source: any = { id: 'session-1', nested: [{ text: secret }] }
    source.self = source
    const originalError = new Error(`upstream reflected ${secret}`)
    ;(originalError as any).code = 'MCP_TOOL_ERROR'
    ;(originalError as any).details = { agent_id: 'agent-1', secret }
    source.error = originalError

    const output = createMcpSecretScrubber({ headerValues: [secret] }).scrubValue(source)

    expect(output).toMatchObject({ id: 'session-1', self: '[Circular]' })
    expect(output.nested[0].text).toBe('[REDACTED]')
    expect(output.error).toMatchObject({
      message: 'upstream reflected [REDACTED]',
      code: 'MCP_TOOL_ERROR',
      details: { agent_id: 'agent-1', secret: '[REDACTED]' },
    })
    expect(originalError.message).toContain(secret)
    expect((originalError as any).details.secret).toBe(secret)
  })

  test('replaces longer configured values before overlapping shorter ones', () => {
    const scrubber = createMcpSecretScrubber({
      headerValues: ['private-space-token', 'private-space-token-extended'],
    })

    expect(scrubber.scrubText('private-space-token-extended private-space-token'))
      .toBe('[REDACTED] [REDACTED]')
  })
})
