import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, open, readFile, readdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { McpError } from './errors'
import { readJsonArrayFailClosed } from './atomic-json-store'
import {
  createMcpKey,
  deleteMcpKey,
  MCP_KEY_STORE_MAX_BYTES,
  MCP_KEY_STORE_MAX_RECORDS,
  readMcpKeys,
  toPublicMcpKey,
  updateMcpKey,
  writeMcpKeys,
} from './key-store'
import { McpAgentLeaseRegistry } from './agent-lease'
import { readMcpAgentQuarantines, upsertMcpAgentQuarantine } from './quarantine-store'
import {
  BUDA_MCP_SERVER_TEMPLATE,
  deleteMcpServer,
  MCP_SERVER_STORE_MAX_BYTES,
  MCP_SERVER_STORE_MAX_RECORDS,
  normalizeMcpServer,
  readMcpServers,
  upsertMcpServer,
  writeMcpServers,
} from './server-store'

const workspaces: string[] = []

const storedKey = (id = 1) => ({
  id,
  mcp_server_id: 'buda',
  key: 'fixture-key-' + id,
  description: '账号 ' + id,
  is_active: true,
  priority: 0,
  success_count: 0,
  failure_count: 0,
})

function padJsonArrayToBytes<T>(records: T[], targetBytes: number, append: (record: T, chunk: string) => void) {
  let remaining = targetBytes - Buffer.byteLength(JSON.stringify(records), 'utf8')
  for (const record of records) {
    if (remaining <= 0) break
    const chunk = 'x'.repeat(Math.min(remaining, 16_000))
    append(record, chunk)
    remaining -= chunk.length
  }
  const raw = JSON.stringify(records)
  expect(Buffer.byteLength(raw, 'utf8')).toBe(targetBytes)
  return raw
}

async function expectOnlyStoreFile(workspace: string, name: string) {
  expect((await readdir(workspace)).sort()).toEqual([name])
}

function restoreProperty(target: object, name: PropertyKey, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, name, descriptor)
  else Reflect.deleteProperty(target, name)
}

function singleValueIterator<T>(value: T): IterableIterator<T> {
  let emitted = false
  return {
    next() {
      if (emitted) return { done: true, value: undefined }
      emitted = true
      return { done: false, value }
    },
    [Symbol.iterator]() { return this },
  }
}

async function temporaryWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-mcp-store-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('MCP server store', () => {
  test('normalizes the built-in Buda Streamable HTTP defaults', () => {
    expect(normalizeMcpServer({ id: 'buda' })).toEqual(BUDA_MCP_SERVER_TEMPLATE)
    expect(BUDA_MCP_SERVER_TEMPLATE).toMatchObject({
      id: 'buda',
      transport: 'streamable_http',
      url: 'https://buda.im/api/mcp',
      auth_type: 'bearer',
      adapter_id: 'buda',
      startup_timeout_ms: 15_000,
      tool_timeout_ms: 60_000,
      generation_timeout_ms: 600_000,
      poll_initial_ms: 1_000,
      poll_max_ms: 5_000,
    })
  })

  test('stores server records inside the selected workspace', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])

    expect(await readMcpServers(workspace)).toEqual([BUDA_MCP_SERVER_TEMPLATE])
    expect(JSON.parse(await readFile(join(workspace, 'mcp-servers.json'), 'utf8'))).toHaveLength(1)
  })

  test('captures the complete Server bulk input at the public call boundary', async () => {
    const workspace = await temporaryWorkspace()
    const enabledTools = ['safe-tool']
    const customHeaders = { 'X-Test': 'safe-value' }
    const first = { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: enabledTools, custom_headers: customHeaders }
    const second = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'other',
      display_name: 'Other',
      url: 'https://other.invalid/mcp',
    }
    const records = [first, second]
    const expected = [
      { ...first, enabled_tools: [...enabledTools], custom_headers: { ...customHeaders } },
      { ...second },
    ]

    const pending = writeMcpServers(workspace, records)
    first.url = 'https://attacker.invalid/primitive'
    enabledTools[0] = 'rotated-tool'
    customHeaders['X-Test'] = 'rotated-value'
    records[1] = { ...second, url: 'https://attacker.invalid/outer-array' }
    await pending

    expect(await readMcpServers(workspace)).toEqual(expected)
  })

  test('preserves all concurrent server upserts', async () => {
    const workspace = await temporaryWorkspace()
    await Promise.all(Array.from({ length: 12 }, (_, index) => upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'server-' + index,
      display_name: 'Server ' + index,
    })))
    expect(await readMcpServers(workspace)).toHaveLength(12)
  })

  test('rejects malformed, aliased, coercible, and non-canonical persisted records without rewriting them', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const malformedRecords = [
      { ...BUDA_MCP_SERVER_TEMPLATE, is_active: 'true' },
      { ...BUDA_MCP_SERVER_TEMPLATE, unexpected: true },
      (() => {
        const { display_name: _, ...missingCanonicalName } = BUDA_MCP_SERVER_TEMPLATE
        return { ...missingCanonicalName, displayName: 'Buda alias' }
      })(),
      { ...BUDA_MCP_SERVER_TEMPLATE, startup_timeout_ms: '15000' },
    ]

    for (const malformed of malformedRecords) {
      const raw = JSON.stringify([malformed], null, 2) + '\n'
      await writeFile(path, raw, 'utf8')
      await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      await expect(upsertMcpServer(workspace, { ...BUDA_MCP_SERVER_TEMPLATE, display_name: 'Must not write' }))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await readFile(path, 'utf8')).toBe(raw)
      await expectOnlyStoreFile(workspace, 'mcp-servers.json')
    }
  })

  test('rejects duplicate persisted Server IDs and does not overwrite the ambiguous snapshot', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const raw = JSON.stringify([
      BUDA_MCP_SERVER_TEMPLATE,
      { ...BUDA_MCP_SERVER_TEMPLATE, display_name: 'Duplicate Buda' },
    ], null, 2) + '\n'
    await writeFile(path, raw, 'utf8')

    await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    await expect(upsertMcpServer(workspace, { ...BUDA_MCP_SERVER_TEMPLATE, display_name: 'Must not write' }))
      .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await readFile(path, 'utf8')).toBe(raw)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test('rejects persisted Server record count and maxBytes plus one limits', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const tooMany = Array.from({ length: MCP_SERVER_STORE_MAX_RECORDS + 1 }, (_, index) => ({
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'server-' + index,
      display_name: 'Server ' + index,
    }))
    await writeFile(path, JSON.stringify(tooMany), 'utf8')
    await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })

    const padded = Array.from({ length: 70 }, (_, index) => ({
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'server-' + index,
      display_name: 'Server ' + index,
      custom_headers: { ['X-Padding-' + index]: '' },
    }))
    const oversized = padJsonArrayToBytes(padded, MCP_SERVER_STORE_MAX_BYTES + 1, (record, chunk) => {
      record.custom_headers[Object.keys(record.custom_headers)[0]!] += chunk
    })
    await writeFile(path, oversized, 'utf8')
    await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })

  test('rejects non-finite Server numbers and invalid nested tool/header values on disk', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const nonFinite = JSON.stringify([{ ...BUDA_MCP_SERVER_TEMPLATE }])
      .replace('"startup_timeout_ms":15000', '"startup_timeout_ms":1e400')
    await writeFile(path, nonFinite, 'utf8')
    await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })

    await writeFile(path, JSON.stringify([{
      ...BUDA_MCP_SERVER_TEMPLATE,
      enabled_tools: ['valid-tool', { nested: true }],
      custom_headers: { 'X-Valid': { nested: true } },
    }]), 'utf8')
    await expect(readMcpServers(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })

  test('rejects oversized Server writes by count, field, and serialized bytes without replacing the old file', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')
    const assertions = [
      () => writeMcpServers(workspace, Array.from({ length: MCP_SERVER_STORE_MAX_RECORDS + 1 }, (_, index) => ({
        ...BUDA_MCP_SERVER_TEMPLATE,
        id: 'server-' + index,
        display_name: 'Server ' + index,
      }))),
      () => writeMcpServers(workspace, [{ ...BUDA_MCP_SERVER_TEMPLATE, display_name: 'x'.repeat(4097) }]),
      () => writeMcpServers(workspace, Array.from({ length: 70 }, (_, index) => ({
        ...BUDA_MCP_SERVER_TEMPLATE,
        id: 'server-' + index,
        display_name: 'Server ' + index,
        custom_headers: { ['X-Padding-' + index]: 'x'.repeat(16_000) },
      }))),
    ]
    for (const assertion of assertions) {
      await expect(assertion()).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
      expect(await readFile(path, 'utf8')).toBe(original)
      await expectOnlyStoreFile(workspace, 'mcp-servers.json')
    }
  })

  test('stops preparing a shared oversized Server snapshot before sampling a second record', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')
    const sharedTools = Array(1000).fill('t'.repeat(1024))
    let toolSamples = 0
    const guardedTools = new Proxy(sharedTools, {
      ownKeys(value) {
        toolSamples += 1
        if (toolSamples > 1) throw new Error('second oversized tool sample')
        return Reflect.ownKeys(value)
      },
    })
    const sharedHeaderValue = 'h'.repeat(16_384)
    const sharedHeaders = { 'X-One': sharedHeaderValue, 'X-Two': sharedHeaderValue }
    const records = Array.from({ length: MCP_SERVER_STORE_MAX_RECORDS }, (_, index) => ({
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'server-' + index,
      display_name: 'Server ' + index,
      enabled_tools: guardedTools,
      custom_headers: sharedHeaders,
    }))

    await expect(writeMcpServers(workspace, records))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(toolSamples).toBe(1)
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test.each([
    ['camelCase alias', () => [{ ...BUDA_MCP_SERVER_TEMPLATE, displayName: 'Alias' }]],
    ['unknown field', () => [{ ...BUDA_MCP_SERVER_TEMPLATE, unexpected: true }]],
    ['string number and boolean', () => [{
      ...BUDA_MCP_SERVER_TEMPLATE, is_active: 'true', startup_timeout_ms: '15000',
    }]],
    ['object tool', () => [{ ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: [{ nested: true }] }]],
    ['numeric header value', () => [{ ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: { 'X-Test': 7 } }]],
    ['sparse array', () => {
      const records = Array(2)
      records[0] = BUDA_MCP_SERVER_TEMPLATE
      return records
    }],
  ] as const)('rejects non-canonical Server bulk input: %s', async (_label, makeRecords) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpServers(workspace, makeRecords() as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test.each([
    ['non-enumerable toJSON', () => {
      const record: any = { ...BUDA_MCP_SERVER_TEMPLATE }
      Object.defineProperty(record, 'toJSON', {
        value: () => ({ ...BUDA_MCP_SERVER_TEMPLATE, unexpected: true }),
      })
      return record
    }],
    ['inherited toJSON', () => Object.assign(Object.create({
      toJSON: () => ({ ...BUDA_MCP_SERVER_TEMPLATE, unexpected: true }),
    }), BUDA_MCP_SERVER_TEMPLATE)],
    ['symbol field', () => {
      const record: any = { ...BUDA_MCP_SERVER_TEMPLATE }
      record[Symbol('unexpected')] = true
      return record
    }],
  ] as const)('rejects hidden Server serialization behavior: %s', async (_label, makeRecord) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpServers(workspace, [makeRecord()] as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test('rejects Server accessors without invoking a second read or changing the file', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')
    const record: any = { ...BUDA_MCP_SERVER_TEMPLATE }
    let reads = 0
    Object.defineProperty(record, 'url', {
      enumerable: true,
      get: () => (++reads === 1 ? BUDA_MCP_SERVER_TEMPLATE.url : 'https://attacker.invalid/mcp'),
    })

    await expect(writeMcpServers(workspace, [record]))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(reads).toBe(0)
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test('isolates retained Server fields before an active identity fence', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'fixture-key-retained-server', description: '账号',
    })
    const original = await readFile(path, 'utf8')
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: key.id, agentId: 'agent-1' })
    const enabledTools: string[] = []
    const customHeaders: Record<string, string> = {}
    const target: any = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      enabled_tools: enabledTools,
      custom_headers: customHeaders,
    }
    let scheduled = false
    const input = new Proxy(target, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => {
            value.url = 'https://attacker.invalid/mcp'
            enabledTools.push('rotated-tool')
            customHeaders['X-Rotated'] = 'rotated-value'
          })
        }
        return Reflect.ownKeys(value)
      },
    })

    try {
      await expect(writeMcpServers(workspace, [input])).resolves.toBeUndefined()
      expect(await readFile(path, 'utf8')).toBe(original)
      expect(await readMcpServers(workspace)).toEqual([BUDA_MCP_SERVER_TEMPLATE])
    } finally {
      await lease.release()
    }
  })

  test('does not let a post-sampling Array iterator change the fenced Server snapshot', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'fixture-key-iterator-server', description: '账号',
    })
    const original = await readFile(path, 'utf8')
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: key.id, agentId: 'agent-1' })
    const previous = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator)
    const inheritedIterator = previous?.value as (this: any[]) => IterableIterator<any>
    let scheduled = false
    const input = new Proxy({ ...BUDA_MCP_SERVER_TEMPLATE }, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => Object.defineProperty(Array.prototype, Symbol.iterator, {
            configurable: true,
            writable: true,
            value(this: any[]) {
              if (Array.isArray(this) && this.length === 1 && this[0]?.id === 'buda') {
                return singleValueIterator({
                  ...this[0],
                  url: 'https://attacker.invalid/iterator',
                  enabled_tools: ['rotated-tool'],
                  custom_headers: { 'X-Rotated': 'rotated-value' },
                })
              }
              return inheritedIterator.call(this)
            },
          }))
        }
        return Reflect.ownKeys(value)
      },
    })
    let failure: unknown

    try {
      try {
        await writeMcpServers(workspace, [input])
      } catch (error) {
        failure = error
      }
    } finally {
      restoreProperty(Array.prototype, Symbol.iterator, previous)
      await lease.release()
    }

    if (failure) expect(failure).toMatchObject({ code: 'MCP_AGENT_BUSY' })
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpServers(workspace)).toEqual([BUDA_MCP_SERVER_TEMPLATE])
  })

  test.each([
    ['outer snapshot', function (this: any) {
      if (Array.isArray(this) && this.length === 1 && this[0]?.id === 'buda') {
        return [{ ...this[0], url: 'https://attacker.invalid/outer' }]
      }
      return this
    }],
    ['enabled tools', function (this: any) {
      if (Array.isArray(this) && this.length === 1 && this[0] === 'safe-tool') return ['rotated-tool']
      return this
    }],
  ] as const)('ignores pre-existing Array.prototype.toJSON for Server %s', async (_label, hook) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, enabled_tools: ['safe-tool'] }
    await writeMcpServers(workspace, [server])
    const original = await readFile(path, 'utf8')
    const previous = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON')
    try {
      Object.defineProperty(Array.prototype, 'toJSON', { configurable: true, writable: true, value: hook })
      await expect(writeMcpServers(workspace, [server])).resolves.toBeUndefined()
    } finally {
      restoreProperty(Array.prototype, 'toJSON', previous)
    }
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpServers(workspace)).toEqual([server])
  })

  test('ignores Object.prototype.toJSON added after Server sampling for records and headers', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    const server = { ...BUDA_MCP_SERVER_TEMPLATE, custom_headers: { 'X-Test': 'safe-value' } }
    await writeMcpServers(workspace, [server])
    const original = await readFile(path, 'utf8')
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON')
    let scheduled = false
    const input = new Proxy(server, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => Object.defineProperty(Object.prototype, 'toJSON', {
            configurable: true,
            writable: true,
            value(this: any) {
              if (Object.hasOwn(this, 'url')) return { ...this, url: 'https://attacker.invalid/record' }
              if (Object.hasOwn(this, 'X-Test')) return { 'X-Test': 'rotated-value' }
              return this
            },
          }))
        }
        return Reflect.ownKeys(value)
      },
    })
    try {
      await expect(writeMcpServers(workspace, [input])).resolves.toBeUndefined()
    } finally {
      restoreProperty(Object.prototype, 'toJSON', previous)
    }
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpServers(workspace)).toEqual([server])
  })

  test.each([
    ['revoked Proxy', () => {
      const revocable = Proxy.revocable({ ...BUDA_MCP_SERVER_TEMPLATE }, {})
      revocable.revoke()
      return revocable.proxy
    }],
    ['getPrototypeOf trap', () => new Proxy({ ...BUDA_MCP_SERVER_TEMPLATE }, {
      getPrototypeOf() { throw new Error('getPrototypeOf trap') },
    })],
    ['ownKeys trap', () => new Proxy({ ...BUDA_MCP_SERVER_TEMPLATE }, {
      ownKeys() { throw new Error('ownKeys trap') },
    })],
    ['getOwnPropertyDescriptor trap', () => new Proxy({ ...BUDA_MCP_SERVER_TEMPLATE }, {
      getOwnPropertyDescriptor() { throw new Error('getOwnPropertyDescriptor trap') },
    })],
    ['forged McpError trap', () => new Proxy({ ...BUDA_MCP_SERVER_TEMPLATE }, {
      getPrototypeOf() { throw new McpError('MCP_AGENT_BUSY', 'forged busy error') },
    })],
  ] as const)('maps Server reflection failure to a typed store error: %s', async (_label, makeRecord) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-servers.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpServers(workspace, [makeRecord()] as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-servers.json')
  })

  test('fences active Server identity mutations but allows metadata and unrelated Servers', async () => {
    const workspace = await temporaryWorkspace()
    const otherServer = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'buda-other',
      display_name: 'Buda Other',
      url: 'https://other.buda.im/api/mcp',
    }
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE, otherServer])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_server', description: '账号',
    })
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: key.id, agentId: 'agent-1' })

    try {
      await expect(upsertMcpServer(workspace, {
        ...BUDA_MCP_SERVER_TEMPLATE,
        display_name: 'Buda Display Renamed',
        generation_timeout_ms: 700_000,
      })).resolves.toMatchObject({ display_name: 'Buda Display Renamed', generation_timeout_ms: 700_000 })
      await expect(upsertMcpServer(workspace, {
        ...BUDA_MCP_SERVER_TEMPLATE,
        display_name: 'Buda Display Renamed',
        generation_timeout_ms: 700_000,
        url: 'https://buda.im/api/mcp/v2',
      })).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(writeMcpServers(workspace, [
        {
          ...BUDA_MCP_SERVER_TEMPLATE,
          display_name: 'Buda Display Renamed',
          generation_timeout_ms: 700_000,
          custom_headers: { 'X-Space': 'rotated-header' },
        },
        otherServer,
      ])).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(deleteMcpServer(workspace, 'buda')).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(upsertMcpServer(workspace, {
        ...otherServer,
        custom_headers: { 'X-Other': 'isolated-header' },
      })).resolves.toMatchObject({ custom_headers: { 'X-Other': 'isolated-header' } })
    } finally {
      await lease.release()
    }
  })

  test('fences quarantined Server identity mutations but allows metadata and unrelated Servers', async () => {
    const workspace = await temporaryWorkspace()
    const otherServer = {
      ...BUDA_MCP_SERVER_TEMPLATE,
      id: 'buda-other',
      display_name: 'Buda Other',
      url: 'https://other.buda.im/api/mcp',
    }
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE, otherServer])
    const key = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_server', description: '账号',
    })
    await upsertMcpAgentQuarantine(workspace, {
      serverId: 'buda', keyId: key.id, agentId: 'agent-1',
      requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown',
    })

    await expect(upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      display_name: 'Safe Metadata',
      tool_timeout_ms: 61_000,
    })).resolves.toMatchObject({ display_name: 'Safe Metadata', tool_timeout_ms: 61_000 })
    await expect(upsertMcpServer(workspace, {
      ...BUDA_MCP_SERVER_TEMPLATE,
      display_name: 'Safe Metadata',
      tool_timeout_ms: 61_000,
      enabled_tools: ['rotated-tool'],
    })).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(deleteMcpServer(workspace, 'buda')).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(upsertMcpServer(workspace, {
      ...otherServer,
      custom_headers: { 'X-Other': 'isolated-header' },
    })).resolves.toMatchObject({ custom_headers: { 'X-Other': 'isolated-header' } })
  })
})

describe('MCP key store', () => {
  test('allocates workspace-local numeric IDs and never exposes a raw secret', async () => {
    const workspace = await temporaryWorkspace()
    const first = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_1234567890',
      description: '账号一',
    })
    const second = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_abcdefghij',
      description: '账号二',
    })

    expect([first.id, second.id]).toEqual([1, 2])
    expect(toPublicMcpKey(first)).toEqual(expect.objectContaining({
      id: 1,
      masked_key: 'sk_1***7890',
      has_key: true,
    }))
    expect(toPublicMcpKey(first)).not.toHaveProperty('key')
  })

  test('captures the complete Key bulk input at the public call boundary', async () => {
    const workspace = await temporaryWorkspace()
    const first = { ...storedKey(1), key: 'fixture-key-call-boundary' }
    const second = { ...storedKey(2), key: 'fixture-key-second-boundary' }
    const records = [first, second]
    const expected = [{ ...first }, { ...second }]

    const pending = writeMcpKeys(workspace, records)
    first.key = 'fixture-key-rotated-primitive'
    records[1] = { ...second, key: 'fixture-key-rotated-outer-array' }
    await pending

    expect(await readMcpKeys(workspace)).toEqual(expected)
  })

  test('keeps the previous secret when an update omits key and overwrites it when supplied', async () => {
    const workspace = await temporaryWorkspace()
    const created = await createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_original',
      description: '初始账号',
    })

    await updateMcpKey(workspace, created.id, { description: '改名账号' })
    expect((await readMcpKeys(workspace))[0]).toMatchObject({ key: 'sk_original', description: '改名账号' })

    await updateMcpKey(workspace, created.id, { key: '   ' })
    expect((await readMcpKeys(workspace))[0]?.key).toBe('sk_original')

    await updateMcpKey(workspace, created.id, { key: 'sk_replaced' })
    expect((await readMcpKeys(workspace))[0]?.key).toBe('sk_replaced')
  })

  test('serializes concurrent key allocation without duplicate IDs or lost records', async () => {
    const workspace = await temporaryWorkspace()
    const created = await Promise.all(Array.from({ length: 20 }, (_, index) => createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_concurrent_' + index,
      description: '账号' + index,
    })))
    expect(new Set(created.map(item => item.id)).size).toBe(20)
    expect(await readMcpKeys(workspace)).toHaveLength(20)
  })

  test('fences active Key identity mutations but allows health metadata and unrelated Keys', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [
      BUDA_MCP_SERVER_TEMPLATE,
      { ...BUDA_MCP_SERVER_TEMPLATE, id: 'buda-other', display_name: 'Buda Other' },
    ])
    const target = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_target', description: '目标账号',
    })
    const other = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_active_other', description: '其他账号',
    })
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: target.id, agentId: 'agent-1' })

    try {
      await expect(updateMcpKey(workspace, target.id, {
        description: '健康字段可写', success_count: 7, last_checked: '2026-07-31T00:00:00.000Z',
      })).resolves.toMatchObject({ description: '健康字段可写', success_count: 7 })
      await expect(updateMcpKey(workspace, target.id, { key: 'sk_rotated_target' }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, target.id, { mcp_server_id: 'buda-other' }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, target.id, { is_active: false }))
        .rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      const keys = await readMcpKeys(workspace)
      await expect(writeMcpKeys(workspace, keys.map(item => item.id === target.id
        ? { ...item, key: 'sk_bulk_rotated_target' }
        : item))).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(deleteMcpKey(workspace, target.id)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
      await expect(updateMcpKey(workspace, other.id, { key: 'sk_isolated_other' }))
        .resolves.toMatchObject({ key: 'sk_isolated_other' })
    } finally {
      await lease.release()
    }
  })

  test('fences quarantined Key identity mutations but allows health metadata and unrelated Keys', async () => {
    const workspace = await temporaryWorkspace()
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const target = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_target', description: '目标账号',
    })
    const other = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'sk_quarantined_other', description: '其他账号',
    })
    await upsertMcpAgentQuarantine(workspace, {
      serverId: 'buda', keyId: target.id, agentId: 'agent-1',
      requestId: 'request-1', sessionId: 'session-1', reason: 'remote_cancel_unknown',
    })

    await expect(updateMcpKey(workspace, target.id, {
      priority: 9, failure_count: 3, avg_latency: 18,
    })).resolves.toMatchObject({ priority: 9, failure_count: 3, avg_latency: 18 })
    await expect(updateMcpKey(workspace, target.id, { key: 'sk_rotated_target' }))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(deleteMcpKey(workspace, target.id)).rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(updateMcpKey(workspace, other.id, { key: 'sk_isolated_other' }))
      .resolves.toMatchObject({ key: 'sk_isolated_other' })
  })

  test('reports corrupt JSON and never replaces it with an empty collection', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeFile(path, '{broken', 'utf8')

    await expect(readMcpKeys(workspace)).rejects.toMatchObject({
      code: 'MCP_STORE_CORRUPT',
    } satisfies Partial<McpError>)
    await expect(createMcpKey(workspace, {
      mcp_server_id: 'buda',
      key: 'sk_must_not_write',
      description: '不得覆盖',
    })).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await readFile(path, 'utf8')).toBe('{broken')
  })

  test('rejects malformed persisted Key records and never rewrites them during create or update', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    const malformedRecords = [
      { ...storedKey(), id: '1' },
      { ...storedKey(), unknown: 'field' },
      (() => {
        const { description: _, ...missingDescription } = storedKey()
        return missingDescription
      })(),
      (() => {
        const { mcp_server_id: _, ...missingCanonicalServerId } = storedKey()
        return { ...missingCanonicalServerId, mcpServerId: 'buda' }
      })(),
    ]

    for (const malformed of malformedRecords) {
      const raw = JSON.stringify([malformed], null, 2) + '\n'
      await writeFile(path, raw, 'utf8')
      await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      await expect(createMcpKey(workspace, {
        mcp_server_id: 'buda', key: 'fixture-key-new', description: 'Must not write',
      })).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      await expect(updateMcpKey(workspace, 1, { description: 'Must not update' }))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await readFile(path, 'utf8')).toBe(raw)
      await expectOnlyStoreFile(workspace, 'mcp-keys.json')
    }
  })

  test('rejects duplicate persisted Key IDs and does not overwrite the ambiguous snapshot', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    const raw = JSON.stringify([storedKey(), { ...storedKey(), key: 'fixture-key-duplicate' }], null, 2) + '\n'
    await writeFile(path, raw, 'utf8')

    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    await expect(updateMcpKey(workspace, 1, { description: 'Must not update' }))
      .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await readFile(path, 'utf8')).toBe(raw)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })

  test('rejects persisted Key record count and maxBytes plus one limits', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeFile(path, JSON.stringify(Array.from(
      { length: MCP_KEY_STORE_MAX_RECORDS + 1 }, (_, index) => storedKey(index + 1),
    )), 'utf8')
    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })

    const padded = Array.from({ length: 70 }, (_, index) => storedKey(index + 1))
    const oversized = padJsonArrayToBytes(padded, MCP_KEY_STORE_MAX_BYTES + 1, (record, chunk) => {
      record.key += chunk
    })
    await writeFile(path, oversized, 'utf8')
    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })

  test('rejects non-finite Key numbers, invalid dates, and array records on disk', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    const nonFinite = JSON.stringify([{ ...storedKey(), avg_latency: 1 }])
      .replace('"avg_latency":1', '"avg_latency":1e400')
    await writeFile(path, nonFinite, 'utf8')
    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })

    await writeFile(path, JSON.stringify([{ ...storedKey(), last_checked: 'not-a-date' }]), 'utf8')
    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })

    await writeFile(path, JSON.stringify([[1, 'buda', 'fixture-key']]), 'utf8')
    await expect(readMcpKeys(workspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })

  test('rejects oversized Key writes by count, field, bytes, and finite numeric bounds without replacing the old file', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')
    const assertions = [
      () => writeMcpKeys(workspace, Array.from(
        { length: MCP_KEY_STORE_MAX_RECORDS + 1 }, (_, index) => storedKey(index + 1),
      )),
      () => writeMcpKeys(workspace, [{ ...storedKey(), key: 'x'.repeat(16_385) }]),
      () => writeMcpKeys(workspace, Array.from({ length: 70 }, (_, index) => ({
        ...storedKey(index + 1), key: 'x'.repeat(16_000),
      }))),
      () => writeMcpKeys(workspace, [{ ...storedKey(), success_count: Number.POSITIVE_INFINITY }]),
    ]
    for (const assertion of assertions) {
      await expect(assertion()).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
      expect(await readFile(path, 'utf8')).toBe(original)
      await expectOnlyStoreFile(workspace, 'mcp-keys.json')
    }
  })

  test('stops preparing an oversized Key snapshot before sampling all records', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')
    const sharedKey = 'k'.repeat(16_384)
    const sharedDescription = 'd'.repeat(4096)
    let recordSamples = 0
    const records = Array.from({ length: MCP_KEY_STORE_MAX_RECORDS }, (_, index) => new Proxy({
      ...storedKey(index + 1),
      key: sharedKey,
      description: sharedDescription,
    }, {
      ownKeys(value) {
        recordSamples += 1
        if (recordSamples >= 60) throw new Error('sixtieth oversized Key sample')
        return Reflect.ownKeys(value)
      },
    }))

    await expect(writeMcpKeys(workspace, records))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(recordSamples).toBeLessThan(60)
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })

  test.each([
    ['camelCase alias', () => [{ ...storedKey(), mcpServerId: 'buda' }]],
    ['unknown field', () => [{ ...storedKey(), unexpected: true }]],
    ['string number and boolean', () => [{
      ...storedKey(), id: '1', is_active: 'true', success_count: '0',
    }]],
    ['non-canonical optional fields', () => [{
      ...storedKey(), lastChecked: '2026-07-31T00:00:00.000Z', avg_latency: '12',
    }]],
    ['sparse array', () => {
      const records = Array(2)
      records[0] = storedKey()
      return records
    }],
  ] as const)('rejects non-canonical Key bulk input: %s', async (_label, makeRecords) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpKeys(workspace, makeRecords() as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })

  test.each([
    ['non-enumerable toJSON', () => {
      const record: any = storedKey()
      Object.defineProperty(record, 'toJSON', {
        value: () => ({ ...storedKey(), unexpected: true }),
      })
      return record
    }],
    ['inherited toJSON', () => Object.assign(Object.create({
      toJSON: () => ({ ...storedKey(), unexpected: true }),
    }), storedKey())],
    ['symbol field', () => {
      const record: any = storedKey()
      record[Symbol('unexpected')] = true
      return record
    }],
  ] as const)('rejects hidden Key serialization behavior: %s', async (_label, makeRecord) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpKeys(workspace, [makeRecord()] as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })

  test('rejects Key accessors without invoking a second read or changing the file', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')
    const record: any = storedKey()
    let reads = 0
    Object.defineProperty(record, 'key', {
      enumerable: true,
      get: () => (++reads === 1 ? 'fixture-key-1' : 'fixture-key-accessor-rotated'),
    })

    await expect(writeMcpKeys(workspace, [record]))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(reads).toBe(0)
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })

  test('isolates retained Key primitives before an active identity fence', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const created = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'fixture-key-retained-key', description: '账号',
    })
    const original = await readFile(path, 'utf8')
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: created.id, agentId: 'agent-1' })
    const target: any = { ...created }
    let scheduled = false
    const input = new Proxy(target, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => {
            value.mcp_server_id = 'attacker-server'
            value.key = 'fixture-key-rotated-after-fence'
            value.is_active = false
          })
        }
        return Reflect.ownKeys(value)
      },
    })

    try {
      await expect(writeMcpKeys(workspace, [input])).resolves.toBeUndefined()
      expect(await readFile(path, 'utf8')).toBe(original)
      expect(await readMcpKeys(workspace)).toEqual([created])
    } finally {
      await lease.release()
    }
  })

  test('does not let a post-sampling Array iterator change the fenced Key snapshot', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
    const created = await createMcpKey(workspace, {
      mcp_server_id: 'buda', key: 'fixture-key-iterator-key', description: '账号',
    })
    const original = await readFile(path, 'utf8')
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(workspace, { serverId: 'buda', keyId: created.id, agentId: 'agent-1' })
    const previous = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator)
    const inheritedIterator = previous?.value as (this: any[]) => IterableIterator<any>
    let scheduled = false
    const input = new Proxy({ ...created }, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => Object.defineProperty(Array.prototype, Symbol.iterator, {
            configurable: true,
            writable: true,
            value(this: any[]) {
              if (Array.isArray(this) && this.length === 1 && this[0]?.mcp_server_id === 'buda') {
                return singleValueIterator({
                  ...this[0],
                  mcp_server_id: 'attacker-server',
                  key: 'fixture-key-rotated-iterator',
                  is_active: false,
                })
              }
              return inheritedIterator.call(this)
            },
          }))
        }
        return Reflect.ownKeys(value)
      },
    })
    let failure: unknown

    try {
      try {
        await writeMcpKeys(workspace, [input])
      } catch (error) {
        failure = error
      }
    } finally {
      restoreProperty(Array.prototype, Symbol.iterator, previous)
      await lease.release()
    }

    if (failure) expect(failure).toMatchObject({ code: 'MCP_AGENT_BUSY' })
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpKeys(workspace)).toEqual([created])
  })

  test('ignores pre-existing Object.prototype.toJSON for Key records', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON')
    try {
      Object.defineProperty(Object.prototype, 'toJSON', {
        configurable: true,
        writable: true,
        value(this: any) {
          return Object.hasOwn(this, 'mcp_server_id') ? { ...this, unexpected: true } : this
        },
      })
      await expect(writeMcpKeys(workspace, [storedKey()])).resolves.toBeUndefined()
    } finally {
      restoreProperty(Object.prototype, 'toJSON', previous)
    }
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpKeys(workspace)).toEqual([storedKey()])
  })

  test('ignores Array.prototype.toJSON added after Key sampling for the outer snapshot', async () => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')
    const previous = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON')
    const target: any = storedKey()
    let scheduled = false
    const input = new Proxy(target, {
      ownKeys(value) {
        if (!scheduled) {
          scheduled = true
          queueMicrotask(() => Object.defineProperty(Array.prototype, 'toJSON', {
            configurable: true,
            writable: true,
            value(this: any) {
              if (Array.isArray(this) && this.length === 1 && this[0]?.mcp_server_id === 'buda') {
                return [{ ...this[0], unexpected: true }]
              }
              return this
            },
          }))
        }
        return Reflect.ownKeys(value)
      },
    })
    try {
      await expect(writeMcpKeys(workspace, [input])).resolves.toBeUndefined()
    } finally {
      restoreProperty(Array.prototype, 'toJSON', previous)
    }
    expect(await readFile(path, 'utf8')).toBe(original)
    expect(await readMcpKeys(workspace)).toEqual([storedKey()])
  })

  test.each([
    ['revoked Proxy', () => {
      const revocable = Proxy.revocable(storedKey(), {})
      revocable.revoke()
      return revocable.proxy
    }],
    ['getPrototypeOf trap', () => new Proxy(storedKey(), {
      getPrototypeOf() { throw new Error('getPrototypeOf trap') },
    })],
    ['ownKeys trap', () => new Proxy(storedKey(), {
      ownKeys() { throw new Error('ownKeys trap') },
    })],
    ['getOwnPropertyDescriptor trap', () => new Proxy(storedKey(), {
      getOwnPropertyDescriptor() { throw new Error('getOwnPropertyDescriptor trap') },
    })],
    ['forged McpError trap', () => new Proxy(storedKey(), {
      getPrototypeOf() { throw new McpError('MCP_AGENT_BUSY', 'forged busy error') },
    })],
  ] as const)('maps Key reflection failure to a typed store error: %s', async (_label, makeRecord) => {
    const workspace = await temporaryWorkspace()
    const path = join(workspace, 'mcp-keys.json')
    await writeMcpKeys(workspace, [storedKey()])
    const original = await readFile(path, 'utf8')

    await expect(writeMcpKeys(workspace, [makeRecord()] as any))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    expect(await readFile(path, 'utf8')).toBe(original)
    await expectOnlyStoreFile(workspace, 'mcp-keys.json')
  })
})

describe('atomic JSON store resource bounds', () => {
  test('reads the bounded snapshot from one file descriptor and rejects maxBytes plus one', async () => {
    const workspace = await temporaryWorkspace()
    const visiblePath = join(workspace, 'visible.json')
    const expandedPath = join(workspace, 'expanded.json')
    await writeFile(visiblePath, '[]', 'utf8')
    await writeFile(expandedPath, `["${'x'.repeat(64)}"]`, 'utf8')

    await expect(readJsonArrayFailClosed(visiblePath, {
      maxBytes: 16,
      openFile: async () => open(expandedPath, 'r'),
    } as any)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  })
})

describe('MCP Agent quarantine store', () => {
  test('persists session_create_unknown without a fabricated Session identity', async () => {
    const workspace = await temporaryWorkspace()

    await upsertMcpAgentQuarantine(workspace, {
      serverId: 'buda',
      keyId: 1,
      agentId: 'agent-1',
      requestId: 'invocation-1',
      reason: 'session_create_unknown',
    })

    const [record] = await readMcpAgentQuarantines(workspace)
    expect(record).toMatchObject({ request_id: 'invocation-1', reason: 'session_create_unknown' })
    expect(record?.session_id).toBeUndefined()
  })

  test.each(['', '   '])(
    'rejects session_create_unknown with an explicitly supplied empty Session id %#',
    async sessionId => {
      const workspace = await temporaryWorkspace()

      await expect(upsertMcpAgentQuarantine(workspace, {
        serverId: 'buda',
        keyId: 1,
        agentId: 'agent-1',
        requestId: 'invocation-1',
        sessionId,
        reason: 'session_create_unknown',
      })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })

      expect(await readdir(workspace)).not.toContain('mcp-agent-quarantines.json')
    },
  )
})
