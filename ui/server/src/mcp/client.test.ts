import { describe, expect, test } from 'bun:test'
import {
  INTERNAL_ERROR,
  ProtocolError,
  SdkError,
  SdkErrorCode,
} from '@modelcontextprotocol/client'
import { McpError } from './errors'
import { buildMcpHeaders, createMcpClient, type McpSdkFactory } from './client'
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

function fakeSdkFactory(options: {
  toolError?: boolean
  toolErrorContent?: unknown[]
  connectError?: Error
  callError?: Error
  tools?: any[]
  serverVersion?: Record<string, unknown>
  capabilities?: Record<string, unknown>
  instructions?: string
} = {}) {
  const capture: any = { calls: [] }
  const sdk = {
    async connect(transport: unknown, requestOptions: unknown) {
      capture.connect = { transport, requestOptions }
      if (options.connectError) throw options.connectError
    },
    async listTools(_params?: unknown, requestOptions?: unknown) {
      capture.listOptions = requestOptions
      return {
        tools: options.tools || [
          { name: 'allowed', description: 'Allowed tool', inputSchema: { type: 'object' } },
          { name: 'hidden', inputSchema: { type: 'object' } },
        ],
      }
    },
    async callTool(params: unknown, requestOptions?: unknown) {
      capture.calls.push({ params, requestOptions })
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
