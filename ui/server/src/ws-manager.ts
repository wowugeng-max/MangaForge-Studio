import type { ServerResponse } from 'http'
import { createHash } from 'crypto'
import type { Duplex } from 'stream'

export interface WSClient {
  id: string
  res: ServerResponse
  write(data: string): boolean
}

type SocketLike = Pick<Duplex, 'write' | 'end' | 'on'>

export interface WebSocketClient {
  id: string
  socket: SocketLike
  write(data: Record<string, any>): boolean
}

// Global task manager: tracks active adapter tasks per client_id
export interface ActiveTask {
  adapterId: string
  cancelToken: CancelToken
}

export interface CancelToken {
  cancelled: boolean
  interrupt?: () => Promise<boolean> | boolean
}

// SSE Connection Manager
export class SSEManager {
  private clients: Map<string, WSClient> = new Map()

  has(clientId: string): boolean {
    return this.clients.has(clientId)
  }

  subscribe(clientId: string, res: ServerResponse): WSClient {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write(`data: ${JSON.stringify({ type: 'connected', client_id: clientId })}\n\n`)

    const client: WSClient = {
      id: clientId,
      res,
      write: (data: string) => {
        try {
          return res.write(`data: ${data}\n\n`)
        } catch {
          return false
        }
      },
    }

    this.clients.set(clientId, client)
    return client
  }

  disconnect(clientId: string) {
    const client = this.clients.get(clientId)
    if (client) {
      try {
        client.write(JSON.stringify({ type: 'disconnected', client_id: clientId }))
      } catch { /* ignore */ }
      this.clients.delete(clientId)
    }
  }

  async sendMessage(clientId: string, message: Record<string, any>) {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`[SSE] No connection for client ${clientId}`)
      return false
    }
    try {
      const success = client.write(JSON.stringify(message))
      if (message.type === 'result') {
        console.log(`✅ [SSE] Successfully pushed result to ${clientId}`)
      }
      return success
    } catch (error) {
      console.warn(`[SSE] Failed to send to ${clientId}:`, String(error).slice(0, 100))
      this.clients.delete(clientId)
      return false
    }
  }

  getClient(clientId: string): WSClient | undefined {
    return this.clients.get(clientId)
  }

  getAllClientIds(): string[] {
    return Array.from(this.clients.keys())
  }
}

function websocketFrame(payload: string) {
  const body = Buffer.from(payload)
  if (body.length < 126) return Buffer.concat([Buffer.from([0x81, body.length]), body])
  if (body.length < 65_536) {
    const header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(body.length, 2)
    return Buffer.concat([header, body])
  }
  const header = Buffer.alloc(10)
  header[0] = 0x81
  header[1] = 127
  header.writeBigUInt64BE(BigInt(body.length), 2)
  return Buffer.concat([header, body])
}

export class WebSocketCompatManager {
  private clients: Map<string, WebSocketClient> = new Map()

  has(clientId: string): boolean {
    return this.clients.has(clientId)
  }

  connect(clientId: string, socket: SocketLike): WebSocketClient {
    const client: WebSocketClient = {
      id: clientId,
      socket,
      write: (message: Record<string, any>) => {
        try {
          return socket.write(websocketFrame(JSON.stringify(message)))
        } catch {
          return false
        }
      },
    }
    this.clients.set(clientId, client)
    client.write({ type: 'connected', client_id: clientId })
    return client
  }

  disconnect(clientId: string, socket?: SocketLike) {
    const client = this.clients.get(clientId)
    if (!client) return
    if (socket && client.socket !== socket) return
    this.clients.delete(clientId)
  }

  async sendMessage(clientId: string, message: Record<string, any>) {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`[WS] No connection for client ${clientId}`)
      return false
    }
    const success = client.write(message)
    if (!success) this.clients.delete(clientId)
    return success
  }

  getAllClientIds(): string[] {
    return Array.from(this.clients.keys())
  }
}

export class TaskMessageManager {
  constructor(
    private sse: SSEManager,
    private ws: WebSocketCompatManager,
  ) {}

  async sendMessage(clientId: string, message: Record<string, any>) {
    const [sseSent, wsSent] = await Promise.all([
      this.sse.sendMessage(clientId, message),
      this.ws.sendMessage(clientId, message),
    ])
    return Boolean(sseSent || wsSent)
  }
}

// Global task registry
const activeTasks = new Map<string, ActiveTask>()

export function registerTask(clientId: string, adapterId: string, cancelToken: CancelToken): void {
  activeTasks.set(clientId, { adapterId, cancelToken })
  console.log(`🔗 [Task] Registered task for ${clientId} (adapter: ${adapterId})`)
}

export function getTask(clientId: string): ActiveTask | undefined {
  return activeTasks.get(clientId)
}

export function unregisterTask(clientId: string): void {
  activeTasks.delete(clientId)
  console.log(`🛑 [Task] Unregistered task for ${clientId}`)
}

export function isTaskCancelled(clientId: string): boolean {
  const task = activeTasks.get(clientId)
  return task?.cancelToken.cancelled ?? false
}

export async function interruptRegisteredTask(
  clientId: string,
  sendMessage: (clientId: string, message: Record<string, any>) => Promise<boolean> | boolean = (id, message) => sseManager.sendMessage(id, message),
) {
  const task = getTask(clientId)
  if (!task) {
    return {
      success: false,
      message: '未找到正在运行的任务',
      physical_interrupted: false,
      adapter_id: '',
    }
  }

  task.cancelToken.cancelled = true
  let physicalInterrupted = false
  if (typeof task.cancelToken.interrupt === 'function') {
    physicalInterrupted = Boolean(await task.cancelToken.interrupt())
  }

  await sendMessage(clientId, {
    type: 'interrupted',
    message: physicalInterrupted ? '任务已被手动强行终止，ComfyUI 显存释放信号已发送' : '任务已被手动强行终止',
    physical_interrupted: physicalInterrupted,
  })
  unregisterTask(clientId)

  return {
    success: true,
    message: '已斩断底层任务并释放资源',
    physical_interrupted: physicalInterrupted,
    adapter_id: task.adapterId,
  }
}

// Singleton
export const sseManager = new SSEManager()
export const webSocketManager = new WebSocketCompatManager()
export const taskMessageManager = new TaskMessageManager(sseManager, webSocketManager)

export function webSocketClientIdFromPath(pathname: string) {
  if (!pathname.startsWith('/api/ws/')) return ''
  const rawClientId = pathname.slice('/api/ws/'.length).replace(/\/+$/, '')
  if (!rawClientId) return ''
  try {
    return decodeURIComponent(rawClientId)
  } catch {
    return rawClientId
  }
}

export function acceptWebSocketKey(key: string) {
  return createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64')
}
