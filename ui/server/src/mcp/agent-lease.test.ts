import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { McpAgentLeaseRegistry } from './agent-lease'
import { McpError, type McpErrorCode } from './errors'
import {
  getMcpAgentQuarantinePath,
  readMcpAgentQuarantines,
  upsertMcpAgentQuarantine,
} from './quarantine-store'
import { canonicalFilesystemIdentity } from '../workspace-identity'

const workspaces: string[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

async function workspace(prefix = 'mangaforge-agent-lease-') {
  const value = await mkdtemp(join(tmpdir(), prefix))
  workspaces.push(value)
  return value
}

const binding = { serverId: 'buda', keyId: 3, agentId: 'agent-1' }
const releaseRequestedCode: McpErrorCode = 'MCP_RUNTIME_ERROR'

describe('McpAgentLeaseRegistry', () => {
  test('pins every operation to its explicit workspace instead of mutable ambient state', async () => {
    const firstWorkspace = await workspace('mangaforge-agent-lease-explicit-a-')
    const secondWorkspace = await workspace('mangaforge-agent-lease-explicit-b-')
    const registry = new McpAgentLeaseRegistry()
    const first = await registry.acquire(firstWorkspace, binding)
    const second = await registry.acquire(secondWorkspace, binding)

    expect(await registry.isActive(firstWorkspace, binding)).toBe(true)
    expect(await registry.isActive(secondWorkspace, binding)).toBe(true)
    await first.quarantine({ requestId: 'request-a', sessionId: 'session-a', reason: 'send_unknown' })
    await first.release()
    await second.release()

    expect(await registry.list(firstWorkspace)).toHaveLength(1)
    expect(await registry.list(secondWorkspace)).toEqual([])
  })

  test('treats a real workspace and symlink alias as one physical lease and store identity', async () => {
    const root = await workspace('mangaforge-agent-lease-symlink-')
    const realWorkspace = join(root, 'real')
    const aliasWorkspace = join(root, 'alias')
    await mkdir(realWorkspace)
    await symlink(realWorkspace, aliasWorkspace, 'dir')
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(realWorkspace, binding)

    await expect(registry.acquire(aliasWorkspace, binding)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    await lease.quarantine({ requestId: 'request-alias', sessionId: 'session-alias', reason: 'send_unknown' })
    await lease.release()
    await expect(new McpAgentLeaseRegistry().acquire(aliasWorkspace, binding))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    expect(getMcpAgentQuarantinePath(aliasWorkspace)).toBe(getMcpAgentQuarantinePath(realWorkspace))
  })

  test('serializes concurrent quarantine upserts through real and symlink workspace aliases', async () => {
    const root = await workspace('mangaforge-agent-store-symlink-')
    const realWorkspace = join(root, 'real')
    const aliasWorkspace = join(root, 'alias')
    await mkdir(realWorkspace)
    await symlink(realWorkspace, aliasWorkspace, 'dir')

    await Promise.all([
      upsertMcpAgentQuarantine(realWorkspace, {
        ...binding, requestId: 'request-a', sessionId: 'session-a', reason: 'send_unknown',
      }),
      upsertMcpAgentQuarantine(aliasWorkspace, {
        ...binding, agentId: 'agent-2', requestId: 'request-b', sessionId: 'session-b', reason: 'send_unknown',
      }),
    ])

    expect(await new McpAgentLeaseRegistry().list(realWorkspace)).toHaveLength(2)
  })

  test('blocks a concurrent acquire for the exact tuple and releases idempotently', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(activeWorkspace, binding)

    expect(await registry.isActive(activeWorkspace, binding)).toBe(true)
    await expect(registry.acquire(activeWorkspace, binding)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    await lease.release()
    await lease.release()

    expect(await registry.isActive(activeWorkspace, binding)).toBe(false)
    await expect(registry.acquire(activeWorkspace, binding)).resolves.toBeDefined()
  })

  test('freezes public binding and never lets staged input redirect the closed tuple', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(activeWorkspace, binding)

    expect(Object.isFrozen(lease.binding)).toBe(true)
    expect(() => { (lease.binding as any).serverId = 'redirected' }).toThrow()
    await lease.stageSessionFence({
      requestId: 'request-closed', sessionId: 'session-closed',
      serverId: 'redirected', agentId: 'redirected', keyId: 999,
    } as any)
    await lease.release()

    expect(await registry.list(activeWorkspace)).toEqual([
      expect.objectContaining({ server_id: 'buda', key_id: 3, agent_id: 'agent-1' }),
    ])
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, binding))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, {
      serverId: 'redirected', keyId: 999, agentId: 'redirected',
    })).resolves.toBeDefined()
  })

  test('serializes in-flight quarantine before release and keeps active on a fence-less write failure', async () => {
    const activeWorkspace = await workspace()
    let continueWrite!: () => void
    const writeGate = new Promise<void>(resolve => { continueWrite = resolve })
    let writeStarted!: () => void
    const started = new Promise<void>(resolve => { writeStarted = resolve })
    const registry = new McpAgentLeaseRegistry({
      read: async () => [],
      upsert: async () => {
        writeStarted()
        await writeGate
        throw new McpError('MCP_STORE_IO_FAILED', 'write failed')
      },
      clear: async () => false,
    } as any)
    const lease = await registry.acquire(activeWorkspace, binding)
    const quarantine = lease.quarantine({
      requestId: 'request-fail', sessionId: 'session-fail', reason: 'send_unknown',
    })
    await started
    const release = lease.release()
    continueWrite()

    await expect(quarantine).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    await release
    expect(await registry.isActive(activeWorkspace, binding)).toBe(true)
    await expect(registry.acquire(activeWorkspace, binding)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
  })

  test('serializes a successful in-flight fence before release and rejects operations requested after release', async () => {
    const activeWorkspace = await workspace()
    let continueWrite!: () => void
    const writeGate = new Promise<void>(resolve => { continueWrite = resolve })
    let writeStarted!: () => void
    const started = new Promise<void>(resolve => { writeStarted = resolve })
    const records: any[] = []
    const registry = new McpAgentLeaseRegistry({
      read: async () => records,
      upsert: async (_workspace: string, input: any) => {
        writeStarted()
        await writeGate
        const record = {
          id: 'fence-1', workspace_key: activeWorkspace,
          server_id: input.serverId, key_id: input.keyId, agent_id: input.agentId,
          request_id: input.requestId, session_id: input.sessionId,
          reason: input.reason, created_at: '2026-07-31T00:00:00.000Z',
        }
        records.push(record)
        return record
      },
      clear: async () => false,
    } as any)
    const lease = await registry.acquire(activeWorkspace, binding)
    const stage = lease.stageSessionFence({ requestId: 'request-stage', sessionId: 'session-stage' })
    await started
    const firstRelease = lease.release()
    const secondRelease = lease.release()
    await expect(lease.quarantine({
      requestId: 'late', sessionId: 'late', reason: 'send_unknown',
    })).rejects.toMatchObject({ code: releaseRequestedCode })
    continueWrite()

    await stage
    await Promise.all([firstRelease, secondRelease])
    expect(records).toHaveLength(1)
    expect(await registry.isActive(activeWorkspace, binding)).toBe(false)
  })

  test('lets a failed pre-send stage release safely because no remote send occurred', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry({
      read: async () => [],
      upsert: async () => { throw new McpError('MCP_STORE_IO_FAILED', 'stage failed') },
      clear: async () => false,
    } as any)
    const lease = await registry.acquire(activeWorkspace, binding)

    await expect(lease.stageSessionFence({ requestId: 'request-stage', sessionId: 'session-stage' }))
      .rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    await lease.release()
    await expect(registry.acquire(activeWorkspace, binding)).resolves.toBeDefined()
  })

  test('guards public clear while active and lets the lease clear its own exact Session fence', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(activeWorkspace, binding)
    await lease.stageSessionFence({ requestId: 'request-stage', sessionId: 'session-stage' })
    const [record] = await registry.list(activeWorkspace)

    await expect(registry.clear(activeWorkspace, record!.id)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
    expect(await registry.list(activeWorkspace)).toHaveLength(1)
    await lease.clearSessionFence()
    await lease.release()
    expect(await registry.list(activeWorkspace)).toEqual([])
    await expect(registry.acquire(activeWorkspace, binding)).resolves.toBeDefined()
  })

  test('durably quarantines an unresolved Session across registry instances', async () => {
    const activeWorkspace = await workspace()
    const first = new McpAgentLeaseRegistry()
    const lease = await first.acquire(activeWorkspace, binding)
    await lease.quarantine({
      requestId: 'request-12',
      sessionId: 'session-12',
      reason: 'remote_cancel_unknown',
    })
    await lease.release()

    const records = await first.list(activeWorkspace)
    expect(records).toEqual([expect.objectContaining({
      id: expect.any(String),
      workspace_key: canonicalFilesystemIdentity(activeWorkspace),
      server_id: 'buda',
      key_id: 3,
      agent_id: 'agent-1',
      request_id: 'request-12',
      session_id: 'session-12',
      reason: 'remote_cancel_unknown',
      created_at: expect.any(String),
    })])
    expect(JSON.stringify(records)).not.toContain('credential')

    const rebuilt = new McpAgentLeaseRegistry()
    await expect(rebuilt.acquire(activeWorkspace, binding)).rejects.toMatchObject({
      code: 'MCP_AGENT_QUARANTINED',
      details: { quarantine_id: records[0]!.id, session_id: 'session-12' },
    })
  })

  test('isolates quarantine identity by canonical workspace Server Key and Agent', async () => {
    const activeWorkspace = await workspace()
    const otherWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(activeWorkspace, binding)
    await lease.quarantine({ requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown' })
    await lease.release()

    for (const allowed of [
      { ...binding, serverId: 'other' },
      { ...binding, keyId: 4 },
      { ...binding, agentId: 'agent-2' },
    ]) {
      const acquired = await registry.acquire(activeWorkspace, allowed)
      await acquired.release()
    }
    const other = new McpAgentLeaseRegistry()
    await expect(other.acquire(otherWorkspace, binding)).resolves.toBeDefined()
  })

  test('keeps Server tuple identity beyond the first 160 characters', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const prefix = 'server-'.padEnd(160, 's')
    const first = await registry.acquire(activeWorkspace, { ...binding, serverId: `${prefix}a` })
    const second = await registry.acquire(activeWorkspace, { ...binding, serverId: `${prefix}b` })

    await first.quarantine({ requestId: 'request-a', sessionId: 'session-a', reason: 'send_unknown' })
    await first.release()
    await second.release()
    expect((await registry.list(activeWorkspace))[0]).toMatchObject({ server_id: `${prefix}a` })
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, { ...binding, serverId: `${prefix}b` }))
      .resolves.toBeDefined()
  })

  test('keeps Agent tuple identity beyond the first 160 characters', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const prefix = 'agent-'.padEnd(160, 'a')
    const first = await registry.acquire(activeWorkspace, { ...binding, agentId: `${prefix}a` })
    const second = await registry.acquire(activeWorkspace, { ...binding, agentId: `${prefix}b` })

    await first.quarantine({ requestId: 'request-a', sessionId: 'session-a', reason: 'send_unknown' })
    await first.release()
    await second.release()
    expect((await registry.list(activeWorkspace))[0]).toMatchObject({ agent_id: `${prefix}a` })
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, { ...binding, agentId: `${prefix}b` }))
      .resolves.toBeDefined()
  })

  test('upserts one stable quarantine per tuple and clears only the exact quarantine id', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const firstLease = await registry.acquire(activeWorkspace, binding)
    await firstLease.quarantine({ requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown' })
    await firstLease.release()
    const [first] = await registry.list(activeWorkspace)

    const replacement = await upsertMcpAgentQuarantine(activeWorkspace, {
      ...binding,
      requestId: 'replacement-request',
      sessionId: 'replacement-session',
      reason: 'remote_cancel_unknown',
    })
    expect(replacement.id).toBe(first!.id)
    expect(await registry.list(activeWorkspace)).toEqual([expect.objectContaining({
      id: first!.id,
      request_id: 'replacement-request',
      session_id: 'replacement-session',
    })])

    expect(await registry.clear(activeWorkspace, 'not-the-record-id')).toBe(false)
    expect(await registry.clear(activeWorkspace, first!.id)).toBe(true)
    const secondLease = await registry.acquire(activeWorkspace, binding)
    await secondLease.quarantine({ requestId: 'request-2', sessionId: 'session-2', reason: 'remote_cancel_unknown' })
    await secondLease.release()
    const [second] = await registry.list(activeWorkspace)

    expect(second).toMatchObject({ request_id: 'request-2', session_id: 'session-2' })
    expect(await registry.clear(activeWorkspace, first!.id)).toBe(false)
    expect(await registry.clear(activeWorkspace, second!.id)).toBe(true)
    expect(await registry.list(activeWorkspace)).toEqual([])
  })

  test('preserves the full canonical workspace identity beyond bounded remote ids', async () => {
    const root = await workspace()
    const activeWorkspace = join(root, 'a'.repeat(100), 'b'.repeat(100))
    await mkdir(activeWorkspace, { recursive: true })
    const first = new McpAgentLeaseRegistry()
    const lease = await first.acquire(activeWorkspace, binding)
    await lease.quarantine({ requestId: 'request-1', sessionId: 'session-1', reason: 'send_unknown' })
    await lease.release()

    const [record] = await first.list(activeWorkspace)
    expect(record!.workspace_key).toBe(canonicalFilesystemIdentity(activeWorkspace))
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, binding))
      .rejects.toMatchObject({ code: 'MCP_AGENT_QUARANTINED' })
  })

  test('rejects empty Session ids and fails closed when the durable JSON is corrupt', async () => {
    const activeWorkspace = await workspace()
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(activeWorkspace, binding)
    await expect(lease.quarantine({
      requestId: 'request-1',
      sessionId: '   ',
      reason: 'send_unknown',
    })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
    await lease.release()

    await Bun.write(getMcpAgentQuarantinePath(activeWorkspace), '{not json')
    await expect(new McpAgentLeaseRegistry().acquire(activeWorkspace, binding))
      .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await Bun.file(getMcpAgentQuarantinePath(activeWorkspace)).text()).toBe('{not json')
  })

  test('rejects every unknown durable record field without overwriting the file', async () => {
    const activeWorkspace = await workspace()
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const valid = {
      id: 'quarantine-1', workspace_key: activeWorkspace, server_id: 'buda', key_id: 3,
      agent_id: 'agent-1', request_id: 'request-1', session_id: 'session-1',
      reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }
    for (const forbidden of ['unknown', 'key', 'header', 'prompt', 'message']) {
      const raw = JSON.stringify([{ ...valid, [forbidden]: 'forbidden-value' }])
      await Bun.write(path, raw)
      await expect(new McpAgentLeaseRegistry().list(activeWorkspace))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await Bun.file(path).text()).toBe(raw)
    }
  })

  test('rejects coercible but incorrectly typed durable record fields', async () => {
    const activeWorkspace = await workspace()
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const valid = {
      id: 'quarantine-1', workspace_key: activeWorkspace, server_id: 'buda', key_id: 3,
      agent_id: 'agent-1', request_id: 'request-1', session_id: 'session-1',
      reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }
    const invalidRecords = [
      { ...valid, id: 1 },
      { ...valid, workspace_key: ['workspace'] },
      { ...valid, server_id: 3 },
      { ...valid, key_id: '3' },
      { ...valid, agent_id: true },
      { ...valid, request_id: 12 },
      { ...valid, session_id: ['session-1'] },
      { ...valid, reason: 'failed' },
      { ...valid, created_at: 0 },
    ]
    for (const record of invalidRecords) {
      const raw = JSON.stringify([record])
      await Bun.write(path, raw)
      await expect(new McpAgentLeaseRegistry().list(activeWorkspace))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await Bun.file(path).text()).toBe(raw)
    }
  })

  test('rejects duplicate escaped keys, resource overflow, and noncanonical durable values without overwrite', async () => {
    const activeWorkspace = await workspace()
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const duplicate = `[{"id":"first","\\u0069d":"second","workspace_key":${JSON.stringify(activeWorkspace)},"server_id":"buda","key_id":3,"agent_id":"agent-1","request_id":"request-1","session_id":"session-1","reason":"send_unknown","created_at":"2026-07-31T00:00:00.000Z"}]`
    await Bun.write(path, duplicate)
    await expect(new McpAgentLeaseRegistry().list(activeWorkspace))
      .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await Bun.file(path).text()).toBe(duplicate)

    const oversized = `["${'x'.repeat(5 * 1024 * 1024)}"]`
    await Bun.write(path, oversized)
    await expect(new McpAgentLeaseRegistry().list(activeWorkspace))
      .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
    expect(await Bun.file(path).text()).toBe(oversized)

    const valid = {
      id: 'quarantine-1', workspace_key: activeWorkspace, server_id: 'buda', key_id: 3,
      agent_id: 'agent-1', request_id: 'request-1', session_id: 'session-1',
      reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }
    for (const raw of [
      JSON.stringify(Array.from({ length: 10_001 }, () => valid)),
      JSON.stringify([{ ...valid, id: 'q'.repeat(16_385) }]),
      JSON.stringify([{ ...valid, created_at: '2026-07-31T00:00:00Z' }]),
    ]) {
      await Bun.write(path, raw)
      await expect(new McpAgentLeaseRegistry().list(activeWorkspace))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await Bun.file(path).text()).toBe(raw)
    }

    await expect(new McpAgentLeaseRegistry().acquire(await workspace(), {
      ...binding, serverId: 's'.repeat(16_385),
    })).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
  })

  test('rejects an API upsert that would make the quarantine store exceed its readable byte limit', async () => {
    const activeWorkspace = await workspace('mangaforge-agent-store-write-limit-')
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const workspaceKey = canonicalFilesystemIdentity(activeWorkspace)
    const record = (index: number) => ({
      id: `quarantine-${index}`,
      workspace_key: workspaceKey,
      server_id: `server-${index}`.padEnd(16_384, 's'),
      key_id: index + 1,
      agent_id: `agent-${index}`.padEnd(16_384, 'a'),
      request_id: `request-${index}`,
      session_id: `session-${index}`,
      reason: 'send_unknown',
      created_at: '2026-07-31T00:00:00.000Z',
    })
    const records = Array.from({ length: 158 }, (_, index) => record(index))
    const original = JSON.stringify(records, null, 2) + '\n'
    expect(Buffer.byteLength(original, 'utf8')).toBeLessThanOrEqual(5 * 1024 * 1024)
    await Bun.write(path, original)
    expect(await readMcpAgentQuarantines(activeWorkspace)).toHaveLength(158)

    await expect(upsertMcpAgentQuarantine(activeWorkspace, {
      serverId: `server-158`.padEnd(16_384, 's'),
      keyId: 159,
      agentId: `agent-158`.padEnd(16_384, 'a'),
      requestId: 'request-158',
      sessionId: 'session-158',
      reason: 'send_unknown',
    })).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })

    expect(await Bun.file(path).text()).toBe(original)
    expect(await readMcpAgentQuarantines(activeWorkspace)).toHaveLength(158)
  })

  test('rejects duplicate durable ids or tuples before clear and never overwrites the corrupt file', async () => {
    const activeWorkspace = await workspace('mangaforge-agent-store-uniqueness-')
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const workspaceKey = canonicalFilesystemIdentity(activeWorkspace)
    const first = {
      id: 'quarantine-duplicate', workspace_key: workspaceKey,
      server_id: 'buda', key_id: 3, agent_id: 'agent-1',
      request_id: 'request-1', session_id: 'session-1',
      reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }
    const corruptStores = [
      [first, {
        ...first,
        server_id: 'other-server', key_id: 4, agent_id: 'agent-2',
        request_id: 'request-2', session_id: 'session-2',
      }],
      [first, {
        ...first,
        id: 'quarantine-other', request_id: 'request-2', session_id: 'session-2',
      }],
    ]

    for (const records of corruptStores) {
      const raw = JSON.stringify(records, null, 2) + '\n'
      await Bun.write(path, raw)
      const registry = new McpAgentLeaseRegistry()
      await expect(registry.list(activeWorkspace)).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      await expect(registry.clear(activeWorkspace, first.id))
        .rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
      expect(await Bun.file(path).text()).toBe(raw)
    }
  })

  test('preserves long quarantine ids and clears only an exact trimmed id', async () => {
    const activeWorkspace = await workspace()
    const path = getMcpAgentQuarantinePath(activeWorkspace)
    const id = 'quarantine-'.padEnd(200, 'q')
    await Bun.write(path, JSON.stringify([{
      id, workspace_key: canonicalFilesystemIdentity(activeWorkspace), server_id: 'buda', key_id: 3,
      agent_id: 'agent-1', request_id: 'request-1', session_id: 'session-1',
      reason: 'send_unknown', created_at: '2026-07-31T00:00:00.000Z',
    }]))
    const registry = new McpAgentLeaseRegistry()

    expect((await registry.list(activeWorkspace))[0]!.id).toBe(id)
    expect(await registry.clear(activeWorkspace, id.slice(0, 160))).toBe(false)
    expect(await registry.clear(activeWorkspace, `  ${id}  `)).toBe(true)
  })

  test('keeps the active fence when quarantine persistence fails', async () => {
    const missingWorkspace = join(tmpdir(), `mangaforge-agent-lease-missing-${crypto.randomUUID()}`)
    const registry = new McpAgentLeaseRegistry()
    const lease = await registry.acquire(missingWorkspace, binding)

    await expect(lease.quarantine({
      requestId: 'request-1',
      sessionId: 'session-1',
      reason: 'remote_cancel_unknown',
    })).rejects.toMatchObject({ code: 'MCP_STORE_IO_FAILED' })
    await lease.release()

    expect(await registry.isActive(missingWorkspace, binding)).toBe(true)
    await expect(registry.acquire(missingWorkspace, binding)).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
  })
})
