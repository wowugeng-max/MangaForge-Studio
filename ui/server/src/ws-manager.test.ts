import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { WebSocketCompatManager, interruptRegisteredTask, registerTask, unregisterTask, webSocketClientIdFromPath } from './ws-manager'

afterEach(() => {
  unregisterTask('task-physical')
  unregisterTask('task-missing')
})

describe('task interrupt registry', () => {
  test('sets cancel token, calls the physical interrupt hook, notifies client, and unregisters task', async () => {
    const messages: any[] = []
    let physicalCalls = 0
    registerTask('task-physical', 'local-comfy', {
      cancelled: false,
      interrupt: async () => {
        physicalCalls += 1
        return true
      },
    })

    const result = await interruptRegisteredTask('task-physical', async (clientId, message) => {
      messages.push({ clientId, message })
      return true
    })

    expect(result).toMatchObject({
      success: true,
      physical_interrupted: true,
      adapter_id: 'local-comfy',
    })
    expect(physicalCalls).toBe(1)
    expect(messages[0]).toMatchObject({
      clientId: 'task-physical',
      message: { type: 'interrupted' },
    })
    expect(await interruptRegisteredTask('task-physical')).toMatchObject({ success: false })
  })
})

describe('upstream WebSocket compatibility manager', () => {
  test('sends JSON messages to the active client and keeps newer sockets on stale disconnect', async () => {
    const manager = new WebSocketCompatManager()
    const firstWrites: string[] = []
    const secondWrites: string[] = []
    const firstSocket = {
      write: (chunk: string | Buffer) => {
        firstWrites.push(Buffer.isBuffer(chunk) ? chunk.toString('hex') : chunk)
        return true
      },
    }
    const secondSocket = {
      write: (chunk: string | Buffer) => {
        secondWrites.push(Buffer.isBuffer(chunk) ? chunk.toString('hex') : chunk)
        return true
      },
    }

    manager.connect('node-1', firstSocket as any)
    manager.connect('node-1', secondSocket as any)
    manager.disconnect('node-1', firstSocket as any)

    expect(manager.has('node-1')).toBe(true)
    expect(await manager.sendMessage('node-1', { type: 'result', data: { ok: true } })).toBe(true)
    expect(firstWrites).toHaveLength(1)
    expect(secondWrites.length).toBeGreaterThan(1)
    expect(secondWrites.at(-1)).toContain(Buffer.from('"result"').toString('hex'))
  })

  test('server entry exposes the upstream /api/ws/:clientId compatibility endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')

    expect(source).toContain("listeningServer.on('upgrade'")
    expect(source).toContain('/api/ws/')
    expect(source).toContain('acceptWebSocketKey')
    expect(source).toContain('webSocketManager.connect(clientId, socket)')
    expect(source).toContain('webSocketManager.disconnect(clientId, socket)')
  })

  test('normalizes upstream websocket client ids with optional trailing slash', () => {
    expect(webSocketClientIdFromPath('/api/ws/node-1')).toBe('node-1')
    expect(webSocketClientIdFromPath('/api/ws/node-1/')).toBe('node-1')
    expect(webSocketClientIdFromPath('/api/ws/node%201/')).toBe('node 1')
    expect(webSocketClientIdFromPath('/api/sse/node-1')).toBe('')
  })

  test('transport disconnect does not unregister still-running background tasks', () => {
    const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')

    expect(source).toContain('sseManager.disconnect(clientId)')
    expect(source).toContain('webSocketManager.disconnect(clientId, socket)')
    expect(source).not.toContain('unregisterTask(clientId)')
  })

  test('server entry exposes trailing slash compatibility for upstream interrupt route', () => {
    const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')

    expect(source).toContain("app.post(['/api/interrupt/:clientId', '/api/interrupt/:clientId/']")
    expect(source).toContain('interruptRegisteredTask(clientId')
  })
})
