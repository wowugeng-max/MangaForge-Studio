import { describe, expect, test } from 'bun:test'
import { createMcpSecretScrubber } from './secret-scrubber'

describe('MCP secret scrubber', () => {
  test('recursively removes configured credentials while preserving safe metadata', () => {
    const reflectedKey = 'sk_' + 'test_reflected_secret'
    const scrubber = createMcpSecretScrubber({
      keys: [reflectedKey],
      headerValues: ['private-space-token', 'session=private-cookie'],
    })
    const output = scrubber.scrubValue({
      error: `Authorization: Bearer ${reflectedKey}`,
      nested: ['X-Space=private-space-token', 'Cookie: session=private-cookie'],
      safe: 'agent-1',
      status: 'failed',
    })

    expect(JSON.stringify(output)).not.toContain(reflectedKey)
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

  test('redacts complete Cookie and Set-Cookie lines without consuming the next safe line', () => {
    const output = createMcpSecretScrubber().scrubText([
      'Cookie: first=secret-one; second=secret-two; third=secret-three',
      'Set-Cookie: fourth=secret-four; Path=/; HttpOnly',
      'Safe: keep-me',
    ].join('\n'))

    expect(output).not.toContain('secret-one')
    expect(output).not.toContain('secret-two')
    expect(output).not.toContain('secret-three')
    expect(output).not.toContain('secret-four')
    expect(output).toContain('Safe: keep-me')
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

  test('removes prefix-stripped authentication and cookie payloads without hiding unrelated fragments', () => {
    const scrubber = createMcpSecretScrubber({
      keys: ['Bearer configured-key-payload'],
      headers: {
        Authorization: 'Basic configured-auth-payload',
        'Proxy-Authorization': 'Bearer configured-proxy-payload',
        Cookie: 'sid=configured-cookie-payload; ui=xyz',
        'Set-Cookie': 'session=configured-set-cookie-payload; Path=/; HttpOnly; SameSite=Lax',
      },
    })

    const output = scrubber.scrubText([
      'configured-key-payload',
      'configured-auth-payload',
      'configured-proxy-payload',
      'configured-cookie-payload',
      'configured-set-cookie-payload',
      'normal agent-id abc xyz sid Path HttpOnly SameSite Lax',
    ].join('\n'))

    for (const secret of [
      'configured-key-payload',
      'configured-auth-payload',
      'configured-proxy-payload',
      'configured-cookie-payload',
      'configured-set-cookie-payload',
    ]) expect(output).not.toContain(secret)
    expect(output).toContain('normal agent-id abc')
    expect(output).not.toContain('xyz')
    expect(output).toContain('sid Path HttpOnly SameSite Lax')
  })

  test('derives short, quoted, and attribute-named credentials with Cookie and Set-Cookie semantics', () => {
    const scrubber = createMcpSecretScrubber({
      keys: ['Bearer k1'],
      headers: {
        Authorization: 'Basic a2',
        Cookie: 'Path=p3; sid="q4"; Secure=s5',
        'Set-Cookie': 'Path=t6; Secure=u7; HttpOnly; SameSite=Lax',
      },
    })

    const output = scrubber.scrubText('k1 a2 p3 "q4" q4 s5 t6 u7 ordinary')

    for (const secret of ['k1', 'a2', 'p3', 'q4', 's5', 't6']) {
      expect(output).not.toContain(secret)
    }
    expect(output).toContain('u7 ordinary')
  })

  test('replaces all configured secrets in one pass without reprocessing the placeholder', () => {
    const scrubber = createMcpSecretScrubber({
      headers: Object.fromEntries(['x', '[', 'R', 'E', 'D', 'A', 'C', 'T', ']']
        .map((value, index) => [`X-Test-${index}`, value])),
    })
    const input = 'x'.repeat(64)
    const output = scrubber.scrubText(input)

    expect(output).toBe('[REDACTED]'.repeat(input.length))
    expect(output.length).toBeLessThanOrEqual(input.length * '[REDACTED]'.length)
  })

  test('rejects Proxy, accessor, symbol, and inherited named-header records without executing behavior', () => {
    let proxyTraps = 0
    const proxyHeaders = new Proxy({ Authorization: 'Basic proxy-secret' }, {
      ownKeys() { proxyTraps += 1; return ['Authorization'] },
      getOwnPropertyDescriptor() { proxyTraps += 1; return { enumerable: true, configurable: true, value: 'Basic proxy-secret' } },
      get() { proxyTraps += 1; return 'Basic proxy-secret' },
    })
    const proxyScrubber = createMcpSecretScrubber({ headers: proxyHeaders })
    expect(proxyScrubber.scrubText('proxy-secret')).toBe('proxy-secret')
    expect(proxyTraps).toBe(0)

    let getterCalls = 0
    const getterHeaders: Record<string, string> = {}
    Object.defineProperty(getterHeaders, 'Authorization', {
      enumerable: true,
      get() { getterCalls += 1; return 'Basic getter-secret' },
    })
    expect(createMcpSecretScrubber({ headers: getterHeaders }).scrubText('getter-secret')).toBe('getter-secret')
    expect(getterCalls).toBe(0)

    const symbolHeaders: any = { Authorization: 'Basic own-secret' }
    symbolHeaders[Symbol('hidden')] = 'symbol-secret'
    expect(createMcpSecretScrubber({ headers: symbolHeaders }).scrubText('own-secret')).toBe('own-secret')

    const inheritedHeaders = Object.create({ Authorization: 'Basic inherited-secret' })
    inheritedHeaders['X-Own'] = 'own-header-secret'
    const inheritedScrubber = createMcpSecretScrubber({ headers: inheritedHeaders })
    expect(inheritedScrubber.scrubText('inherited-secret own-header-secret'))
      .toBe('inherited-secret own-header-secret')
  })

  test('clones shared references independently while still marking true ancestor cycles', () => {
    const shared = { status: 'ready', nested: { id: 'agent-1' } }
    const source: any = { left: shared, right: shared }
    source.self = source

    const output = createMcpSecretScrubber().scrubValue(source)

    expect(output.left).toEqual({ status: 'ready', nested: { id: 'agent-1' } })
    expect(output.right).toEqual({ status: 'ready', nested: { id: 'agent-1' } })
    expect(output.left).not.toBe('[Circular]')
    expect(output.right).not.toBe('[Circular]')
    expect(output.self).toBe('[Circular]')
  })
})
