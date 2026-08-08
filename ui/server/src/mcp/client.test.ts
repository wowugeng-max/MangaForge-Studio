import { describe, expect, test } from 'bun:test'
import {
  INTERNAL_ERROR,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { McpError, mcpFailureEvidence } from './errors'
import { buildMcpHeaders, createMcpClient, type McpSdkFactory } from './client'
import * as clientModule from './client'
import { BUDA_MCP_SERVER_TEMPLATE } from './server-store'
import type { McpKeyRecord, McpServerRecord } from './types'

const key: McpKeyRecord = {
  id: 7,
  mcp_server_id: 'buda',
  key: 'sk_test_secret',
  description: '测试账号',
  is_active: true,
  priority: 0,
  success_count: 0,
  failure_count: 0,
}

function testBoundedFetch(
  upstreamFetch: typeof fetch,
  budgets: { responseBytes: number; sseEventBytes: number },
) {
  const factory = (clientModule as any).createBoundedMcpFetch
  return typeof factory === 'function' ? factory(upstreamFetch, budgets) : upstreamFetch
}

function streamedResponse(
  chunks: string[],
  input: {
    headers?: Record<string, string>
    status?: number
    statusText?: string
    onPull?: () => void
    onCancel?: () => void
  } = {},
) {
  const encoder = new TextEncoder()
  let index = 0
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      input.onPull?.()
      if (index >= chunks.length) return controller.close()
      controller.enqueue(encoder.encode(chunks[index++]!))
    },
    cancel() { input.onCancel?.() },
  }), {
    status: input.status,
    statusText: input.statusText,
    headers: input.headers,
  })
}

function fakeSdkFactory(options: {
  toolError?: boolean
  toolErrorContent?: unknown[]
  connectError?: Error
  listError?: Error
  onList?: () => void
  callError?: Error
  callErrors?: Array<Error | undefined>
  onCall?: () => void
  tools?: any[]
  serverVersion?: Record<string, unknown>
  capabilities?: Record<string, unknown>
  instructions?: string
} = {}) {
  const capture: any = { calls: [], listCalls: 0 }
  const sdk = {
    async connect(transport: unknown, requestOptions: unknown) {
      capture.connect = { transport, requestOptions }
      if (options.connectError) throw options.connectError
    },
    async listTools(_params?: unknown, requestOptions?: unknown) {
      capture.listCalls += 1
      capture.listOptions = requestOptions
      options.onList?.()
      if (options.listError) throw options.listError
      return {
        tools: options.tools || [
          { name: 'allowed', description: 'Allowed tool', inputSchema: { type: 'object' } },
          { name: 'hidden', inputSchema: { type: 'object' } },
        ],
      }
    },
    async callTool(params: unknown, requestOptions?: unknown) {
      capture.calls.push({ params, requestOptions })
      options.onCall?.()
      const sequencedError = options.callErrors?.[capture.calls.length - 1]
      if (sequencedError) throw sequencedError
      if (options.callError) throw options.callError
      return {
        content: options.toolErrorContent || [{ type: 'text', text: options.toolError ? 'bad' : 'ok' }],
        structuredContent: { ok: !options.toolError },
        isError: Boolean(options.toolError),
        _meta: { trace: 'trace-1' },
      }
    },
    getServerVersion: () => options.serverVersion || ({ name: 'fake-server', version: '1.0.0' }),
    getServerCapabilities: () => options.capabilities || ({ tools: {} }),
    getInstructions: () => options.instructions || 'fake instructions',
    async close() { capture.closed = true },
  }
  const transport = {
    async terminateSession() { capture.terminated = true },
  }
  const factory: McpSdkFactory = {
    createClient: () => sdk as any,
    createTransport: (url, transportOptions) => {
      capture.url = url.toString()
      capture.transportOptions = transportOptions
      return transport as any
    },
  }
  return { capture, factory }
}

function sdkHttpFailure(input: {
  status: number
  id: string | number | null
  code: number
  message: string
  sdkMessage?: string
  statusText?: string
  text?: string
}) {
  return new SdkHttpError(
    SdkErrorCode.ClientHttpNotImplemented,
    input.sdkMessage || 'remote SDK message must not escape',
    {
      status: input.status,
      statusText: input.statusText || 'remote status text must not escape',
      text: input.text ?? JSON.stringify({
        jsonrpc: '2.0',
        id: input.id,
        error: { code: input.code, message: input.message },
      }),
    },
  )
}

function exactNotReadySdkHttpError() {
  return sdkHttpFailure({
    status: 400,
    id: null,
    code: -32000,
    message: 'Server not initialized',
  })
}

describe('generic MCP client', () => {
  test('builds isolated authentication headers without mutating server headers', () => {
    const server: McpServerRecord = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Workspace': 'novel' },
    }
    expect(buildMcpHeaders(server, key)).toEqual({
      'X-Workspace': 'novel',
      Authorization: 'Bearer sk_test_secret',
    })
    expect(server.custom_headers).toEqual({ 'X-Workspace': 'novel' })
    expect(buildMcpHeaders({ ...server, auth_type: 'none' }, key)).toEqual({ 'X-Workspace': 'novel' })
  })

  test('rejects behavioral named-header records without executing Proxy or getter traps', () => {
    let proxyTraps = 0
    const proxyHeaders = new Proxy({ 'X-Unsafe': 'proxy-value' }, {
      ownKeys() { proxyTraps += 1; return ['X-Unsafe'] },
      getOwnPropertyDescriptor() { proxyTraps += 1; return { enumerable: true, configurable: true, value: 'proxy-value' } },
      get() { proxyTraps += 1; return 'proxy-value' },
    })
    expect(buildMcpHeaders({ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: proxyHeaders }, key)).toEqual({
      Authorization: 'Bearer sk_test_secret',
    })
    expect(proxyTraps).toBe(0)

    let getterCalls = 0
    const getterHeaders: Record<string, string> = {}
    Object.defineProperty(getterHeaders, 'X-Unsafe', {
      enumerable: true,
      get() { getterCalls += 1; return 'getter-value' },
    })
    expect(buildMcpHeaders({ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: getterHeaders }, key)).toEqual({
      Authorization: 'Bearer sk_test_secret',
    })
    expect(getterCalls).toBe(0)

    const inheritedHeaders = Object.create({ 'X-Inherited': 'inherited-value' })
    inheritedHeaders['X-Own'] = 'own-value'
    expect(buildMcpHeaders({ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: inheritedHeaders }, key)).toEqual({
      Authorization: 'Bearer sk_test_secret',
    })

    const symbolHeaders: any = { 'X-Own': 'own-value' }
    symbolHeaders[Symbol('hidden')] = 'symbol-value'
    expect(buildMcpHeaders({ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: symbolHeaders }, key)).toEqual({
      Authorization: 'Bearer sk_test_secret',
    })
  })

  test('accepts a null-prototype own-data string header record', () => {
    const headers = Object.create(null)
    headers['X-Workspace'] = 'novel'
    expect(buildMcpHeaders({ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: headers }, key)).toEqual({
      'X-Workspace': 'novel',
      Authorization: 'Bearer sk_test_secret',
    })
  })

  test('rejects an oversized trustworthy Content-Length before reading and cancels upstream', async () => {
    let pulls = 0
    let cancels = 0
    const upstreamResponse = streamedResponse(['small', 'unread'], {
      headers: { 'Content-Length': '9', 'Content-Type': 'application/json' },
      onPull: () => { pulls += 1 },
      onCancel: () => { cancels += 1 },
    })
    await Promise.resolve()
    const pullsBeforeFetch = pulls
    const boundedFetch = testBoundedFetch(async () => upstreamResponse, { responseBytes: 8, sseEventBytes: 8 })

    await expect(boundedFetch('https://mcp.invalid')).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { reason: 'response_too_large' },
    })
    expect(pulls).toBe(pullsBeforeFetch)
    expect(cancels).toBe(1)
  })

  for (const contentLength of [undefined, '2']) {
    test(`counts actual ordinary response bytes with ${contentLength ? 'forged' : 'missing'} Content-Length and cancels overflow`, async () => {
      let cancels = 0
      const headers = {
        'Content-Type': 'application/json',
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
      }
      const boundedFetch = testBoundedFetch(async () => streamedResponse(['123456789', 'unread'], {
        headers,
        onCancel: () => { cancels += 1 },
      }), { responseBytes: 8, sseEventBytes: 8 })

      const response = await boundedFetch('https://mcp.invalid')
      await expect(response.text()).rejects.toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { reason: 'response_too_large' },
      })
      expect(cancels).toBe(1)
    })
  }

  test('rejects one oversized never-delimited SSE event and cancels upstream', async () => {
    let cancels = 0
    const boundedFetch = testBoundedFetch(async () => streamedResponse(['data: 12345678901', 'unread'], {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      onCancel: () => { cancels += 1 },
    }), { responseBytes: 16, sseEventBytes: 16 })

    const response = await boundedFetch('https://mcp.invalid')
    await expect(response.text()).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { reason: 'response_too_large' },
    })
    expect(cancels).toBe(1)
  })

  test('resets the SSE budget at LF and cross-chunk CRLF delimiters without a lifetime cap', async () => {
    const body = 'data: one\n\ndata: two\r\n\r\ndata: six\n\n'
    const boundedFetch = testBoundedFetch(async () => streamedResponse([
      'data: one\n', '\n', 'data: two\r', '\n\r', '\n', 'data: six\n\n',
    ], { headers: { 'Content-Type': 'text/event-stream' } }), {
      responseBytes: 16,
      sseEventBytes: 16,
    })

    const response = await boundedFetch('https://mcp.invalid')
    expect(await response.text()).toBe(body)
  })

  for (const { name, chunks, body } of [
    {
      name: 'bare CR',
      chunks: ['data:1\r\rdata:2\r\r:'],
      body: 'data:1\r\rdata:2\r\r:',
    },
    {
      name: 'CRLF then LF',
      chunks: ['data:1\r\n', '\ndata:2\r', '\n\n'],
      body: 'data:1\r\n\ndata:2\r\n\n',
    },
    {
      name: 'LF then CRLF',
      chunks: ['data:1\n\r', '\ndata:2\n', '\r\n'],
      body: 'data:1\n\r\ndata:2\n\r\n',
    },
    {
      name: 'bare CR split at chunk boundaries',
      chunks: ['data:1\r', '\rdata:2\r', '\r'],
      body: 'data:1\r\rdata:2\r\r',
    },
  ]) {
    test(`resets the exact-limit SSE budget across ${name} event delimiters`, async () => {
      const boundedFetch = testBoundedFetch(async () => streamedResponse(chunks, {
        headers: { 'Content-Type': 'text/event-stream' },
      }), { responseBytes: 6, sseEventBytes: 6 })

      const response = await boundedFetch('https://mcp.invalid')
      expect(await response.text()).toBe(body)
    })
  }

  test('rejects an oversized SSE event before a bare CR delimiter and cancels upstream', async () => {
    let cancels = 0
    const boundedFetch = testBoundedFetch(async () => streamedResponse(['data:12\r\r', 'unread'], {
      headers: { 'Content-Type': 'text/event-stream' },
      onCancel: () => { cancels += 1 },
    }), { responseBytes: 6, sseEventBytes: 6 })

    const response = await boundedFetch('https://mcp.invalid')
    await expect(response.text()).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { reason: 'response_too_large' },
    })
    expect(cancels).toBe(1)
  })

  for (const { name, chunks, body } of [
    { name: 'LF', chunks: ['12345678\n', '\n'], body: '12345678\n\n' },
    { name: 'CRLF', chunks: ['12345678\r', '\n\r', '\n'], body: '12345678\r\n\r\n' },
  ]) {
    test(`accepts an exact-limit SSE event before a split ${name} delimiter`, async () => {
      const boundedFetch = testBoundedFetch(async () => streamedResponse(chunks, {
        headers: { 'Content-Type': 'text/event-stream' },
      }), { responseBytes: 8, sseEventBytes: 8 })

      const response = await boundedFetch('https://mcp.invalid')
      expect(await response.text()).toBe(body)
    })
  }

  test('preserves legal JSON, longer prose, and response metadata byte-exactly', async () => {
    const prose = `{"chapter":"${'正文。'.repeat(2_048)}"}`
    const boundedFetch = testBoundedFetch(async () => streamedResponse([prose.slice(0, 2_000), prose.slice(2_000)], {
      status: 202,
      statusText: 'Accepted',
      headers: { 'Content-Type': 'application/json', 'X-Trace': 'safe' },
    }), { responseBytes: new TextEncoder().encode(prose).byteLength, sseEventBytes: 16 })

    const response = await boundedFetch('https://mcp.invalid')
    expect(response.status).toBe(202)
    expect(response.statusText).toBe('Accepted')
    expect(response.headers.get('X-Trace')).toBe('safe')
    expect(await response.text()).toBe(prose)
  })

  test('installs the bounded fetch on the actual SDK transport', async () => {
    let cancels = 0
    const upstreamFetch = async () => streamedResponse(['123456789', 'unread'], {
      headers: { 'Content-Type': 'application/json' },
      onCancel: () => { cancels += 1 },
    })
    const { capture, factory } = fakeSdkFactory()
    const client = createMcpClient({
      server: BUDA_MCP_SERVER_TEMPLATE,
      key,
      sdkFactory: factory,
      fetch: upstreamFetch as typeof fetch,
      responseBudgets: { responseBytes: 8, sseEventBytes: 8 },
    })
    await client.connect()

    expect(typeof capture.transportOptions.fetch).toBe('function')
    expect(capture.transportOptions.fetch).not.toBe(upstreamFetch)
    const response = await capture.transportOptions.fetch('https://mcp.invalid')
    await expect(response.text()).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { reason: 'response_too_large' },
    })
    expect(cancels).toBe(1)
  })

  test('uses the standard initialized handshake for consecutive Buda tool calls', async () => {
    const methods: string[] = []
    let initialized = false
    const budaFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const message = JSON.parse(String(init?.body || '{}'))
      methods.push(String(message.method || ''))
      if (message.method === 'initialize') {
        return Response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'Buda MCP', version: '0.1.0' },
          },
        }, { headers: { 'Mcp-Session-Id': 'buda-session' } })
      }
      if (message.method === 'notifications/initialized') {
        initialized = true
        return new Response(null, { status: 202 })
      }
      if (message.method === 'tools/list' || message.method === 'tools/call') {
        if (!initialized) {
          return Response.json({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32000, message: 'Server not initialized' },
          }, { status: 400 })
        }
      }
      if (message.method === 'tools/list') {
        return Response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: { tools: [{ name: 'api_claw_list_api_agents', inputSchema: { type: 'object' } }] },
        })
      }
      if (message.method === 'tools/call') {
        return Response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: 'agents' }] },
        })
      }
      throw new Error(`unexpected MCP method: ${message.method}`)
    }
    const client = createMcpClient({
      server: BUDA_MCP_SERVER_TEMPLATE,
      key,
      fetch: budaFetch as typeof fetch,
    })

    await client.connect()
    await client.callTool('api_claw_list_api_agents', {}, { operation: 'read_safe' })
    await client.callTool('api_claw_list_api_agents', {}, { operation: 'read_safe' })

    expect(client.state).toBe('Ready')
    expect((client as any).transport?.constructor).toBe(StreamableHTTPClientTransport)
    expect(methods.filter(Boolean)).toEqual([
      'initialize',
      'notifications/initialized',
      'tools/list',
      'tools/call',
      'tools/call',
    ])
    await client.close()
  })

  test('uses the ordinary transport and initialized notification for a provider-neutral adapter', async () => {
    const methods: string[] = []
    const neutralFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const message = JSON.parse(String(init?.body || '{}'))
      methods.push(String(message.method || ''))
      if (message.method === 'initialize') {
        return Response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'Provider Neutral MCP', version: '1.0.0' },
          },
        }, { headers: { 'Mcp-Session-Id': 'provider-neutral-session' } })
      }
      if (message.method === 'notifications/initialized') {
        return new Response(null, { status: 202 })
      }
      if (message.method === 'tools/list') {
        return Response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: { tools: [] },
        })
      }
      throw new Error(`unexpected MCP method: ${message.method}`)
    }
    const client = createMcpClient({
      server: {
        ...BUDA_MCP_SERVER_TEMPLATE,
        id: 'provider-neutral',
        adapter_id: 'provider-neutral',
      },
      key: { ...key, mcp_server_id: 'provider-neutral' },
      fetch: neutralFetch as typeof fetch,
    })

    await client.connect()

    expect((client as any).transport?.constructor).toBe(StreamableHTTPClientTransport)
    expect(methods.filter(Boolean)).toEqual(['initialize', 'notifications/initialized', 'tools/list'])
    await client.close()
  })

  test('preserves exact pre-dispatch not-ready evidence without exposing remote text', async () => {
    const remoteSdkMessage = 'remote SDK message must not escape'
    const remoteStatusText = 'remote status text must not escape'
    const error = sdkHttpFailure({
      status: 400,
      id: null,
      code: -32000,
      message: 'Server not initialized',
      sdkMessage: remoteSdkMessage,
      statusText: remoteStatusText,
    })
    const { capture, factory } = fakeSdkFactory({ callError: error })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    const caught: any = await client.callTool('allowed', {}, { operation: 'mutation' }).catch(value => value)
    expect(caught).toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: {
        tool_name: 'allowed',
        failure_evidence: {
          kind: 'jsonrpc_http_rejection',
          http_status: 400,
          jsonrpc_code: -32000,
          response_id: null,
          reason: 'server_not_initialized',
        },
      },
    })
    const serialized = JSON.stringify({ message: caught.message, details: caught.details })
    expect(serialized).not.toContain(remoteSdkMessage)
    expect(serialized).not.toContain(remoteStatusText)
    expect(serialized).not.toContain('"jsonrpc"')
    expect(capture.calls).toHaveLength(1)
    expect(client.state).toBe('Ready')
  })

  test('preserves the current Buda bad-request pre-dispatch not-ready evidence', async () => {
    const error = sdkHttpFailure({
      status: 400,
      id: null,
      code: -32000,
      message: 'Bad Request: Server not initialized',
    })
    const { factory } = fakeSdkFactory({ callError: error })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'mutation' })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: {
        failure_evidence: {
          kind: 'jsonrpc_http_rejection',
          http_status: 400,
          jsonrpc_code: -32000,
          response_id: null,
          reason: 'server_not_initialized',
        },
      },
    })
  })

  for (const candidate of [
    { label: 'HTTP 500', status: 500, id: null, code: -32000, message: 'Server not initialized' },
    { label: 'non-null response id', status: 400, id: 7, code: -32000, message: 'Server not initialized' },
    { label: 'other JSON-RPC code', status: 400, id: null, code: -32603, message: 'Server not initialized' },
    { label: 'near-match message', status: 400, id: null, code: -32000, message: 'Bad request: Server not initialized' },
  ]) {
    test(`does not mark uncertain mutation evidence retryable: ${candidate.label}`, async () => {
      const callError = sdkHttpFailure(candidate)
      const { capture, factory } = fakeSdkFactory({ callError })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()

      const caught: any = await client.callTool('allowed', {}, { operation: 'mutation' }).catch(value => value)
      expect(caught).toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: {
          tool_name: 'allowed',
          failure_evidence: {
            kind: 'jsonrpc_http_rejection',
            http_status: candidate.status,
            jsonrpc_code: candidate.code,
            response_id: candidate.id === null ? null : 'non_null',
          },
        },
      })
      expect(caught.details.failure_evidence.reason).toBeUndefined()
      const serialized = JSON.stringify({ message: caught.message, details: caught.details })
      expect(serialized).not.toContain('remote SDK message must not escape')
      expect(serialized).not.toContain('remote status text must not escape')
      expect(capture.calls).toHaveLength(1)
      expect(client.state).toBe('Ready')
    })
  }

  test('projects a secret-bearing non-null response id to a fixed sentinel', async () => {
    const privateKey = 'sk_response_id_private_key'
    const privateHeader = 'private-response-id-header'
    const privateChapter = 'private chapter text in response id'
    const privateSession = 'full-private-session-identifier'
    const rawResponseId = [privateKey, privateHeader, privateChapter, privateSession].join('|')
    const callError = sdkHttpFailure({
      status: 400,
      id: rawResponseId,
      code: -32000,
      message: 'Server not initialized',
    })
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      enabled_tools: ['allowed'],
      custom_headers: { 'X-Private': privateHeader },
    }
    const { capture, factory } = fakeSdkFactory({ callError })
    const client = createMcpClient({
      server,
      key: { ...key, key: privateKey },
      sdkFactory: factory,
    })
    await client.connect()

    const caught: any = await client.callTool('allowed', {}, { operation: 'mutation' }).catch(value => value)
    expect(caught).toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: {
        tool_name: 'allowed',
        failure_evidence: {
          kind: 'jsonrpc_http_rejection',
          http_status: 400,
          jsonrpc_code: -32000,
          response_id: 'non_null',
        },
      },
    })
    expect(caught.details.failure_evidence.reason).toBeUndefined()
    const serialized = JSON.stringify({ message: caught.message, details: caught.details })
    for (const secret of [privateKey, privateHeader, privateChapter, privateSession, rawResponseId]) {
      expect(serialized).not.toContain(secret)
    }
    expect(capture.calls).toHaveLength(1)
    expect(client.state).toBe('Ready')
  })

  test('does not parse an oversized SDK HTTP response body', async () => {
    const text = JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32000, message: 'Server not initialized' },
      padding: 'x'.repeat(16_384),
    })
    const callError = sdkHttpFailure({
      status: 400,
      id: null,
      code: -32000,
      message: 'Server not initialized',
      text,
    })
    const { factory } = fakeSdkFactory({ callError })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    const caught: any = await client.callTool('allowed', {}, { operation: 'mutation' }).catch(value => value)
    expect(caught).toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: {
        failure_evidence: {
          kind: 'jsonrpc_http_rejection',
          http_status: 400,
        },
      },
    })
    expect(caught.details.failure_evidence.jsonrpc_code).toBeUndefined()
    expect(caught.details.failure_evidence.response_id).toBeUndefined()
    expect(caught.details.failure_evidence.reason).toBeUndefined()
    expect(JSON.stringify({ message: caught.message, details: caught.details })).not.toContain('xxxxxxxx')
  })

  for (const malformed of [
    { label: 'missing status', data: {} },
    { label: 'non-finite status', data: { status: Number.NaN } },
    { label: 'non-numeric status', data: { status: '400' } },
  ]) {
    test(`maps an SDK HTTP error with ${malformed.label} without exposing remote fields`, async () => {
      const sdkMessage = `private SDK message for ${malformed.label}`
      const statusText = `private status text for ${malformed.label}`
      const body = `private response body for ${malformed.label}`
      const createError = () => new SdkHttpError(
        SdkErrorCode.ClientHttpNotImplemented,
        sdkMessage,
        { ...malformed.data, statusText, text: body } as any,
      )

      const { factory } = fakeSdkFactory({ callError: createError() })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()
      const callFailure: any = await client.callTool('allowed', {}, { operation: 'mutation' }).catch(value => value)
      expect(callFailure).toMatchObject({
        code: 'MCP_TOOL_ERROR',
        details: { tool_name: 'allowed' },
      })
      expect(callFailure.details.failure_evidence).toBeUndefined()

      const connecting = createMcpClient({
        server: BUDA_MCP_SERVER_TEMPLATE,
        key,
        sdkFactory: fakeSdkFactory({ connectError: createError() }).factory,
      })
      const connectionFailure: any = await connecting.connect().catch(value => value)
      expect(connectionFailure).toMatchObject({ code: 'MCP_TOOL_ERROR' })
      expect(connectionFailure.details?.failure_evidence).toBeUndefined()

      for (const caught of [callFailure, connectionFailure]) {
        const serialized = JSON.stringify({ message: caught.message, details: caught.details })
        expect(serialized).not.toContain(sdkMessage)
        expect(serialized).not.toContain(statusText)
        expect(serialized).not.toContain(body)
      }
    })
  }

  test('separates a completed MCP handshake from deferred tool readiness', async () => {
    const { capture, factory } = fakeSdkFactory({ listError: exactNotReadySdkHttpError() })
    const client = createMcpClient({
      server: {
        ...BUDA_MCP_SERVER_TEMPLATE,
        startup_timeout_ms: 5,
        poll_initial_ms: 1,
        poll_max_ms: 1,
      },
      key,
      sdkFactory: factory,
    })

    await expect(client.connect()).resolves.toBe(client)
    expect(client.state).toBe('Ready')
    expect(client.diagnostics().tools).toEqual([])
    expect(capture.listCalls).toBe(1)
    await expect(client.listTools({ refreshTools: true })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { failure_evidence: { reason: 'server_not_initialized' } },
    })
    expect(capture.listCalls).toBe(2)
    expect(client.state).toBe('Ready')
  })

  test('reads only validated own-data failure evidence without invoking hostile fields', () => {
    expect(mcpFailureEvidence(new McpError('MCP_TOOL_ERROR', 'safe', {
      failure_evidence: {
        kind: 'jsonrpc_http_rejection',
        http_status: 400,
        jsonrpc_code: -32000,
        response_id: null,
        reason: 'server_not_initialized',
        ignored: 'not projected',
      },
    }))).toEqual({
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: null,
      reason: 'server_not_initialized',
    })
    expect(mcpFailureEvidence(new McpError('MCP_TOOL_ERROR', 'safe', {
      failure_evidence: {
        kind: 'jsonrpc_http_rejection',
        http_status: 400,
        jsonrpc_code: -32000,
        response_id: 'non_null',
      },
    }))).toEqual({
      kind: 'jsonrpc_http_rejection',
      http_status: 400,
      jsonrpc_code: -32000,
      response_id: 'non_null',
    })

    let getterCalls = 0
    const accessorError = {}
    Object.defineProperty(accessorError, 'details', {
      enumerable: true,
      get() { getterCalls += 1; return { failure_evidence: { kind: 'jsonrpc_http_rejection', http_status: 400 } } },
    })
    let proxyTraps = 0
    const proxyError = new Proxy({}, {
      get() { proxyTraps += 1; throw new Error('hostile get') },
      getOwnPropertyDescriptor() { proxyTraps += 1; throw new Error('hostile descriptor') },
    })

    expect(mcpFailureEvidence(accessorError)).toBeUndefined()
    expect(mcpFailureEvidence(proxyError)).toBeUndefined()
    expect(getterCalls).toBe(0)
    expect(proxyTraps).toBe(0)
  })

  for (const inconsistent of [
    {
      label: 'HTTP 500',
      evidence: { http_status: 500, jsonrpc_code: -32000, response_id: null },
    },
    {
      label: 'JSON-RPC code 123',
      evidence: { http_status: 400, jsonrpc_code: 123, response_id: null },
    },
    {
      label: 'response id 7',
      evidence: { http_status: 400, jsonrpc_code: -32000, response_id: 7 },
    },
    {
      label: 'missing exact tuple',
      evidence: { http_status: 400 },
    },
  ]) {
    test(`rejects semantically inconsistent not-ready evidence: ${inconsistent.label}`, () => {
      expect(mcpFailureEvidence(new McpError('MCP_TOOL_ERROR', 'safe', {
        failure_evidence: {
          kind: 'jsonrpc_http_rejection',
          ...inconsistent.evidence,
          reason: 'server_not_initialized',
        },
      }))).toBeUndefined()
    })
  }

  test('does not defer tool readiness for inconsistent not-ready evidence', async () => {
    const listError = new McpError('MCP_TOOL_ERROR', 'safe capability failure', {
      failure_evidence: {
        kind: 'jsonrpc_http_rejection',
        http_status: 500,
        jsonrpc_code: -32000,
        response_id: null,
        reason: 'server_not_initialized',
      },
    })
    const { capture, factory } = fakeSdkFactory({ listError })
    const client = createMcpClient({ server: BUDA_MCP_SERVER_TEMPLATE, key, sdkFactory: factory })

    await expect(client.connect()).rejects.toMatchObject({ code: 'MCP_TOOL_ERROR' })
    expect(client.state).toBe('Closed')
    expect(capture.listCalls).toBe(1)
    expect(capture.terminated).toBe(true)
    expect(capture.closed).toBe(true)
  })

  test('connects, filters tools, preserves results, diagnostics, timeout, and signal', async () => {
    const { capture, factory } = fakeSdkFactory()
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] }
    const client = createMcpClient({ server, key, sdkFactory: factory })
    const signal = new AbortController().signal

    expect(client.state).toBe('Closed')
    await client.connect(signal)
    expect(client.state).toBe('Ready')
    expect(capture.url).toBe('https://buda.im/api/mcp')
    expect(capture.transportOptions.requestInit.headers.Authorization).toBe('Bearer sk_test_secret')
    expect(capture.connect.requestOptions).toMatchObject({ timeout: 15_000, signal })
    expect((await client.listTools({ signal })).map(tool => tool.name)).toEqual(['allowed'])

    const result = await client.callTool('allowed', { value: 1 }, { signal, operation: 'read_safe' })
    expect(result).toEqual({
      content: [{ type: 'text', text: 'ok' }],
      structuredContent: { ok: true },
      isError: false,
      _meta: { trace: 'trace-1' },
    })
    expect(capture.calls[0]).toMatchObject({
      params: { name: 'allowed', arguments: { value: 1 } },
      requestOptions: { timeout: 60_000, maxTotalTimeout: 60_000, signal },
    })
    expect(client.diagnostics()).toMatchObject({
      state: 'Ready',
      server_id: 'buda',
      key_id: 7,
      server_info: { name: 'fake-server' },
      capabilities: { tools: {} },
      instructions: 'fake instructions',
    })
  })

  test('blocks undiscovered tools and maps tool-level failures to a stable error', async () => {
    const normal = createMcpClient({ server: BUDA_MCP_SERVER_TEMPLATE, key, sdkFactory: fakeSdkFactory().factory })
    await normal.connect()
    await expect(normal.callTool('missing', {}, { operation: 'read_safe' })).rejects.toMatchObject({ code: 'MCP_CAPABILITY_MISSING' })

    const failing = createMcpClient({ server: BUDA_MCP_SERVER_TEMPLATE, key, sdkFactory: fakeSdkFactory({ toolError: true }).factory })
    await failing.connect()
    await expect(failing.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toEqual(expect.objectContaining({
      code: 'MCP_TOOL_ERROR',
      details: expect.objectContaining({ tool_name: 'allowed' }),
    }))
  })

  test('preserves a typed total-deadline reason when an SDK tool call aborts', async () => {
    const controller = new AbortController()
    const deadlineError = new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限')
    const client = createMcpClient({
      server: BUDA_MCP_SERVER_TEMPLATE,
      key,
      sdkFactory: fakeSdkFactory({ callError: new DOMException('aborted', 'AbortError') }).factory,
    })
    await client.connect()
    controller.abort(deadlineError)

    await expect(client.callTool('allowed', {}, {
      operation: 'read_safe',
      signal: controller.signal,
    })).rejects.toBe(deadlineError)
  })

  test('preserves an earlier ProtocolError when the deadline aborts in a later microtask', async () => {
    const controller = new AbortController()
    const deadlineError = new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限')
    const callError = new ProtocolError(INTERNAL_ERROR, 'invalid session state')
    const client = createMcpClient({
      server: BUDA_MCP_SERVER_TEMPLATE,
      key,
      sdkFactory: fakeSdkFactory({
        callError,
        onCall: () => queueMicrotask(() => controller.abort(deadlineError)),
      }).factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, {
      operation: 'read_safe',
      signal: controller.signal,
    })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      message: expect.stringContaining('invalid session state'),
    })
    expect(controller.signal.aborted).toBe(true)
  })

  test('scrubs reflected credentials from connection and tool errors while preserving stable metadata', async () => {
    const reflectedKey = 'sk_' + 'test_reflected_client_key'
    const reflectedHeader = 'synthetic-client-header-value'
    const server = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      custom_headers: { 'X-Space': reflectedHeader, Cookie: 'session=client-cookie' },
    }
    const selectedKey = { ...key, key: reflectedKey }
    const connecting = createMcpClient({
      server,
      key: selectedKey,
      sdkFactory: fakeSdkFactory({
        connectError: new Error(`gateway echoed ${reflectedKey} and X-Space=${reflectedHeader}`),
      }).factory,
    })

    let connectionError: any
    try { await connecting.connect() } catch (error) { connectionError = error }
    expect(connectionError).toMatchObject({ code: 'MCP_TOOL_ERROR', error_code: 'MCP_TOOL_ERROR' })
    expect(connectionError.message).not.toContain(reflectedKey)
    expect(connectionError.message).not.toContain(reflectedHeader)

    const toolFailure = createMcpClient({
      server,
      key: selectedKey,
      sdkFactory: fakeSdkFactory({
        toolError: true,
        toolErrorContent: [{
          type: 'text',
          text: `Authorization: Bearer ${reflectedKey}; X-Space=${reflectedHeader}; Cookie: session=client-cookie`,
        }],
      }).factory,
    })
    await toolFailure.connect()
    let mappedToolError: any
    try { await toolFailure.callTool('allowed', {}, { operation: 'read_safe' }) } catch (error) { mappedToolError = error }
    const serializedToolError = JSON.stringify({
      message: mappedToolError?.message,
      code: mappedToolError?.code,
      details: mappedToolError?.details,
    })
    expect(mappedToolError).toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { tool_name: 'allowed' },
    })
    expect(serializedToolError).not.toContain(reflectedKey)
    expect(serializedToolError).not.toContain(reflectedHeader)
    expect(serializedToolError).not.toContain('client-cookie')

    const thrownToolError = createMcpClient({
      server,
      key: selectedKey,
      sdkFactory: fakeSdkFactory({
        callError: new Error(`tool reflected ${reflectedKey} and ${reflectedHeader}`),
      }).factory,
    })
    await thrownToolError.connect()
    await expect(thrownToolError.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      details: { tool_name: 'allowed' },
    })
    try {
      await thrownToolError.callTool('allowed', {}, { operation: 'read_safe' })
    } catch (error: any) {
      expect(JSON.stringify({ message: error.message, details: error.details })).not.toContain(reflectedKey)
      expect(JSON.stringify({ message: error.message, details: error.details })).not.toContain(reflectedHeader)
    }
  })

  test('recursively scrubs diagnostics and tool descriptors while preserving safe fields', async () => {
    const reflectedKey = 'sk_' + 'test_diagnostics_secret'
    const reflectedHeader = 'synthetic-diagnostics-header'
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: { 'X-Private': reflectedHeader } }
    const { factory } = fakeSdkFactory({
      serverVersion: { name: 'safe-server', version: `reflected ${reflectedKey}` },
      capabilities: {
        tools: { safe: true },
        nested: { authorization: `Bearer ${reflectedKey}`, note: reflectedHeader },
      },
      instructions: `Cookie: session=diagnostic-cookie; X-Private=${reflectedHeader}`,
      tools: [{
        name: 'allowed',
        description: `safe tool but ${reflectedHeader}`,
        inputSchema: { type: 'object', token: reflectedKey, safe: 'agent-1' },
      }],
    })
    const client = createMcpClient({ server, key: { ...key, key: reflectedKey }, sdkFactory: factory })
    await client.connect()

    const diagnostics = client.diagnostics()
    const serialized = JSON.stringify(diagnostics)
    expect(serialized).not.toContain(reflectedKey)
    expect(serialized).not.toContain(reflectedHeader)
    expect(serialized).not.toContain('diagnostic-cookie')
    expect(diagnostics).toMatchObject({
      state: 'Ready',
      server_id: 'buda',
      key_id: 7,
      adapter_id: 'buda',
      server_info: { name: 'safe-server' },
      capabilities: { tools: { safe: true } },
      tools: [{ name: 'allowed', inputSchema: { type: 'object', safe: 'agent-1' } }],
    })
  })

  test('terminates the transport session and closes the SDK client', async () => {
    const { capture, factory } = fakeSdkFactory()
    const client = createMcpClient({ server: BUDA_MCP_SERVER_TEMPLATE, key, sdkFactory: factory })
    await client.connect()
    await client.close()
    expect(client.state).toBe('Closed')
    expect(capture.terminated).toBe(true)
    expect(capture.closed).toBe(true)
  })

  test('maps broken transports to connection loss and closes the unusable client', async () => {
    const messages = [
      'MCP session expired',
      'MCP session closed',
      'MCP session not found',
      'transport closed unexpectedly after sk_test_secret',
      'transport terminated',
      'read ECONNRESET',
      'socket hang up',
    ]

    for (const message of messages) {
      const { capture, factory } = fakeSdkFactory({ callError: new Error(message) })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()
      expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])

      await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
        code: 'MCP_CONNECTION_LOST',
        error_code: 'MCP_CONNECTION_LOST',
        message: 'MCP 连接已失效',
        details: { tool_name: 'allowed' },
      })
      await Promise.resolve()

      expect(client.state).toBe('Closed')
      expect(client.diagnostics().tools).toEqual([])
      expect(capture.terminated).toBe(true)
      expect(capture.closed).toBe(true)
    }
  })

  test('maps an ECONNRESET error code with a generic message to connection loss', async () => {
    const callError = Object.assign(new Error('read failed with sk_test_secret'), { code: 'ECONNRESET' })
    const { capture, factory } = fakeSdkFactory({ callError })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    let mappedError: McpError | undefined
    try {
      await client.callTool('allowed', {}, { operation: 'read_safe' })
    } catch (error) {
      mappedError = error as McpError
    }
    await Promise.resolve()

    expect(mappedError).toMatchObject({
      code: 'MCP_CONNECTION_LOST',
      message: 'MCP 连接已失效',
      details: { tool_name: 'allowed' },
    })
    expect(Object.keys(mappedError?.details || {})).toEqual(['tool_name'])
    const serializedError = JSON.stringify({
      message: mappedError?.message,
      code: mappedError?.code,
      details: mappedError?.details,
    })
    expect(serializedError).not.toContain('read failed with sk_test_secret')
    expect(serializedError).not.toContain('ECONNRESET')
    expect(client.state).toBe('Closed')
    expect(client.diagnostics().tools).toEqual([])
    expect(capture.terminated).toBe(true)
    expect(capture.closed).toBe(true)
  })

  test('does not reinterpret a transport-looking MCP tool error as connection loss', async () => {
    const callError = new McpError('MCP_TOOL_ERROR', 'transport closed unexpectedly with sk_test_secret', {
      tool_name: 'allowed',
      reflected_secret: 'sk_test_secret',
    })
    const { capture, factory } = fakeSdkFactory({ callError })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    let mappedError: McpError | undefined
    try {
      await client.callTool('allowed', {}, { operation: 'read_safe' })
    } catch (error) {
      mappedError = error as McpError
    }
    await Promise.resolve()

    expect(mappedError).toMatchObject({ code: 'MCP_TOOL_ERROR' })
    expect(JSON.stringify({
      message: mappedError?.message,
      code: mappedError?.code,
      details: mappedError?.details,
    })).not.toContain('sk_test_secret')
    expect(client.state).toBe('Ready')
    expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
    expect(capture.terminated).toBeUndefined()
    expect(capture.closed).toBeUndefined()
  })

  for (const message of [
    'database not connected',
    'session not found',
    'session closed by policy',
  ]) {
    test(`keeps ProtocolError '${message}' on the tool-error path`, async () => {
      const callError = new ProtocolError(INTERNAL_ERROR, message, {
        reflected_secret: 'sk_test_secret',
      })
      const { capture, factory } = fakeSdkFactory({ callError })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()

      let mappedError: McpError | undefined
      try {
        await client.callTool('allowed', {}, { operation: 'read_safe' })
      } catch (error) {
        mappedError = error as McpError
      }

      expect(mappedError).toMatchObject({
        code: 'MCP_TOOL_ERROR',
        message: expect.stringContaining(message),
        details: { tool_name: 'allowed' },
      })
      expect(Object.keys(mappedError?.details || {})).toEqual(['tool_name'])
      expect(JSON.stringify(mappedError)).not.toContain('sk_test_secret')
      expect(client.state).toBe('Ready')
      expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
      expect(capture.terminated).toBeUndefined()
      expect(capture.closed).toBeUndefined()
    })
  }

  test('does not let a non-transport SdkError code fall through to message heuristics', async () => {
    const { capture, factory } = fakeSdkFactory({
      callError: new SdkError(
        SdkErrorCode.RequestTimeout,
        'transport closed while request timed out',
      ),
    })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      message: expect.stringContaining('request timed out'),
    })
    expect(client.state).toBe('Ready')
    expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
    expect(capture.terminated).toBeUndefined()
    expect(capture.closed).toBeUndefined()
  })

  for (const structuredCode of ['EVALIDATION', 422]) {
    test(`does not let structured code ${structuredCode} fall through to message heuristics`, async () => {
      const { capture, factory } = fakeSdkFactory({
        callError: Object.assign(new Error('transport closed after validation failed'), {
          code: structuredCode,
        }),
      })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()

      await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
        code: 'MCP_TOOL_ERROR',
        message: expect.stringContaining('validation failed'),
      })
      expect(client.state).toBe('Ready')
      expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
      expect(capture.terminated).toBeUndefined()
      expect(capture.closed).toBeUndefined()
    })
  }

  for (const { label, callError } of [
    { label: 'SDK NOT_CONNECTED', callError: new SdkError(SdkErrorCode.NotConnected, 'Not connected') },
    { label: 'SDK CONNECTION_CLOSED', callError: new SdkError(SdkErrorCode.ConnectionClosed, 'request failed') },
    { label: 'Node EPIPE', callError: Object.assign(new Error('write failed'), { code: 'EPIPE', errno: 'EPIPE' }) },
    { label: 'not-connected message', callError: new Error('Not connected') },
  ]) {
    test(`maps ${label} to connection loss`, async () => {
      const { capture, factory } = fakeSdkFactory({ callError })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()

      let mappedError: McpError | undefined
      try {
        await client.callTool('allowed', {}, { operation: 'read_safe' })
      } catch (error) {
        mappedError = error as McpError
      }
      await Promise.resolve()

      expect(mappedError).toMatchObject({
        code: 'MCP_CONNECTION_LOST',
        message: 'MCP 连接已失效',
        details: { tool_name: 'allowed' },
      })
      expect(Object.keys(mappedError?.details || {})).toEqual(['tool_name'])
      expect(client.state).toBe('Closed')
      expect(client.diagnostics().tools).toEqual([])
      expect(capture.terminated).toBe(true)
      expect(capture.closed).toBe(true)
    })
  }

  test('classifies an exact structured disconnect code before credential scrubbing', async () => {
    const { factory } = fakeSdkFactory({
      callError: Object.assign(new Error('write failed'), { code: 'EPIPE' }),
    })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key: { ...key, key: 'EPIPE' },
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_CONNECTION_LOST',
      message: 'MCP 连接已失效',
      details: { tool_name: 'allowed' },
    })
    expect(client.state).toBe('Closed')
  })

  test('classifies an unstructured disconnect message before credential scrubbing', async () => {
    const { factory } = fakeSdkFactory({ callError: new Error('Not connected') })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key: { ...key, key: 'Not connected' },
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_CONNECTION_LOST',
      message: 'MCP 连接已失效',
      details: { tool_name: 'allowed' },
    })
    expect(client.state).toBe('Closed')
  })

  test('keeps an ordinary MCP tool error without closing the client', async () => {
    const { capture, factory } = fakeSdkFactory({
      callError: new McpError('MCP_TOOL_ERROR', 'ordinary validation failed', { tool_name: 'allowed' }),
    })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      message: 'ordinary validation failed',
    })
    expect(client.state).toBe('Ready')
    expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
    expect(capture.terminated).toBeUndefined()
    expect(capture.closed).toBeUndefined()
  })

  test('keeps an ordinary MCP SDK error without closing the client', async () => {
    const { capture, factory } = fakeSdkFactory({
      callError: new SdkError(SdkErrorCode.InvalidResult, 'invalid tool response'),
    })
    const client = createMcpClient({
      server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
      key,
      sdkFactory: factory,
    })
    await client.connect()

    await expect(client.callTool('allowed', {}, { operation: 'read_safe' })).rejects.toMatchObject({
      code: 'MCP_TOOL_ERROR',
      message: expect.stringContaining('invalid tool response'),
    })
    expect(client.state).toBe('Ready')
    expect(client.diagnostics().tools.map(tool => tool.name)).toEqual(['allowed'])
    expect(capture.terminated).toBeUndefined()
    expect(capture.closed).toBeUndefined()
  })

  test('caller cancellation takes priority over SDK disconnect codes and errnos', async () => {
    const disconnectErrors = [
      new SdkError(SdkErrorCode.NotConnected, 'Not connected'),
      new SdkError(SdkErrorCode.ConnectionClosed, 'request failed'),
      Object.assign(new Error('write failed'), { code: 'EPIPE', errno: 'EPIPE' }),
      Object.assign(
        new McpError('MCP_TOOL_ERROR', 'transport closed unexpectedly'),
        { errno: 'ECONNRESET' },
      ),
    ]

    for (const callError of disconnectErrors) {
      const controller = new AbortController()
      const { capture, factory } = fakeSdkFactory({ callError })
      const client = createMcpClient({
        server: { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['allowed'] },
        key,
        sdkFactory: factory,
      })
      await client.connect()
      controller.abort()

      await expect(client.callTool('allowed', {}, {
        signal: controller.signal,
        operation: 'read_safe',
      })).rejects.toMatchObject({ code: 'MCP_CANCELLED' })
      expect(client.state).toBe('Ready')
      expect(capture.terminated).toBeUndefined()
      expect(capture.closed).toBeUndefined()
    }
  })
})
