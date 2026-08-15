// ui/server/src/kernel/codex/fixtures/fake-app-server.ts
// 假 codex app-server：仅供测试。协议形状 = 计划头部「协议形状约定」。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const skills = JSON.parse(process.env.FAKE_SKILLS || '[]')
let initialized = false

function send(message: Record<string, any>) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')
}
function reply(id: number, result: any) { send({ id, result }) }
function replyError(id: number, code: number, message: string) { send({ id, error: { code, message } }) }
function notifyPeer(method: string, params: Record<string, any>) { send({ method, params }) }

function handleTurnStart(id: number, params: any) {
  const threadId = String(params?.threadId || 'fake-thread-1')
  const turnId = 'fake-turn-1'
  reply(id, { turnId })
  if (process.env.FAKE_HANG_TURN === '1') return
  notifyPeer('turn/started', { threadId, turnId })
  if (process.env.FAKE_SPAWN === '1') {
    notifyPeer('thread/started', { threadId: 'fake-sub-1', parentThreadId: threadId, agent: 'story-architect' })
  }
  const relFile = process.env.FAKE_WRITE_FILE || ''
  if (relFile) {
    const target = join(process.cwd(), relFile)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, process.env.FAKE_WRITE_CONTENT || '')
  }
  notifyPeer('item/completed', { threadId, turnId, item: { type: 'agentMessage', text: process.env.FAKE_AGENT_MESSAGE || 'done' } })
  notifyPeer('turn/completed', { threadId, turnId })
}

const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk: Uint8Array) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg: any
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.method === 'initialize') reply(msg.id, {})
    else if (msg.method === 'initialized') initialized = true
    else if (msg.method === 'thread/start') {
      if (!initialized) replyError(msg.id, -32002, 'not initialized')
      else reply(msg.id, { threadId: 'fake-thread-1' })
    }
    else if (msg.method === 'skills/list') reply(msg.id, { skills })
    else if (msg.method === 'turn/start') handleTurnStart(msg.id, msg.params)
    else if (msg.method === 'turn/interrupt') {
      reply(msg.id, {})
      notifyPeer('turn/completed', { threadId: String(msg.params?.threadId || 'fake-thread-1'), turnId: String(msg.params?.turnId || 'fake-turn-1'), aborted: true })
    }
    else if (msg.id !== undefined) replyError(msg.id, -32601, `method not found: ${msg.method}`)
  }
})
