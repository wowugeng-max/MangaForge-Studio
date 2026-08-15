// ui/server/src/kernel/codex/rpc.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnCodexRpc } from './rpc'

const PEER = `
const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1)
    if (!line.trim()) continue
    const msg = JSON.parse(line)
    if (msg.method === 'echo') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'progress', params: { n: 1 } }) + '\\n')
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { echoed: msg.params.x } }) + '\\n')
    }
    if (msg.method === 'boom') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'boom!' } }) + '\\n')
    if (msg.method === 'silent') { /* never answers */ }
    if (msg.method === 'garbage') process.stdout.write('not json at all\\n')
    if (msg.method === 'chinese') {
      const payload = JSON.stringify({ jsonrpc: '2.0', method: 'cjk', params: { text: '你好世界'.repeat(50) } }) + '\\n'
      const bytes = Buffer.from(payload, 'utf8')
      process.stdout.write(bytes.subarray(0, 51)); setTimeout(() => process.stdout.write(bytes.subarray(51)), 10)
    }
    if (msg.method === 'die') process.exit(0)
  }
})
`

function spawnPeer(sinkLines: Array<{ direction: string; message: any }>) {
  const dir = mkdtempSync(join(tmpdir(), 'rpc-peer-'))
  const script = join(dir, 'peer.ts')
  writeFileSync(script, PEER)
  return spawnCodexRpc({
    argv: [process.execPath, script],
    cwd: dir,
    env: {},
    sink: (direction, message) => sinkLines.push({ direction, message }),
  })
}

describe('spawnCodexRpc', () => {
  test('request resolves with result and sink records both directions', async () => {
    const lines: Array<{ direction: string; message: any }> = []
    const client = spawnPeer(lines)
    const result = await client.request('echo', { x: 42 })
    expect(result).toEqual({ echoed: 42 })
    expect(lines.some(l => l.direction === 'send' && l.message.method === 'echo')).toBe(true)
    expect(lines.some(l => l.direction === 'recv' && l.message.result?.echoed === 42)).toBe(true)
    client.kill()
  })

  test('error response rejects with message', async () => {
    const client = spawnPeer([])
    await expect(client.request('boom')).rejects.toThrow('boom!')
    client.kill()
  })

  test('notification reaches waiter; request timeout rejects', async () => {
    const client = spawnPeer([])
    const waiter = client.waitForNotification((method) => method === 'progress', 5000)
    await client.request('echo', { x: 1 })
    expect((await waiter).params).toEqual({ n: 1 })
    await expect(client.request('silent', {}, 300)).rejects.toThrow('rpc timeout')
    client.kill()
  })

  test('non-json line is recorded as meta and does not break the stream', async () => {
    const lines: Array<{ direction: string; message: any }> = []
    const client = spawnPeer(lines)
    await expect(client.request('garbage', {}, 300)).rejects.toThrow('rpc timeout')
    expect(lines.some(l => l.direction === 'meta' && String(l.message.raw).includes('not json'))).toBe(true)
    const result = await client.request('echo', { x: 2 })
    expect(result.echoed).toBe(2)
    client.kill()
  })

  test('utf-8 chunk split does not corrupt chinese text', async () => {
    const client = spawnPeer([])
    const waiter = client.waitForNotification((method) => method === 'cjk', 5000)
    const pending = client.request('chinese', {}, 5000)
    const note = await waiter
    expect(note.params.text).toBe('你好世界'.repeat(50))
    expect(String(note.params.text).includes('\uFFFD')).toBe(false)
    client.kill()
    await pending.catch(() => {})
  })

  test('kill rejects waitForNotification waiters', async () => {
    const client = spawnPeer([])
    const waiter = client.waitForNotification(() => false, 30_000)
    client.kill()
    await expect(waiter).rejects.toThrow(/rpc client killed/)
  })

  test('child exit fails in-flight requests', async () => {
    const client = spawnPeer([])
    const started = Date.now()
    await expect(client.request('die', {}, 5000)).rejects.toThrow(/rpc stdout closed/)
    expect(Date.now() - started).toBeLessThan(2000)
    client.kill()
  })
})
