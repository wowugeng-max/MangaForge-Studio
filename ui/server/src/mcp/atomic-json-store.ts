import { randomUUID } from 'node:crypto'
import { open, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { McpError } from './errors'

function validateJsonObjectKeys(raw: string) {
  let index = 0
  const whitespace = () => {
    while (/\s/.test(raw[index] || '')) index += 1
  }
  const string = () => {
    const start = index
    if (raw[index++] !== '"') throw new Error('expected string')
    while (index < raw.length) {
      const character = raw[index++]!
      if (character === '"') return JSON.parse(raw.slice(start, index)) as string
      if (character === '\\') {
        if (raw[index] === 'u') index += 5
        else index += 1
      } else if (character.charCodeAt(0) < 0x20) {
        throw new Error('invalid string')
      }
    }
    throw new Error('unterminated string')
  }
  const value = (): void => {
    whitespace()
    if (raw[index] === '"') { string(); return }
    if (raw[index] === '[') {
      index += 1
      whitespace()
      if (raw[index] === ']') { index += 1; return }
      while (true) {
        value()
        whitespace()
        if (raw[index] === ']') { index += 1; return }
        if (raw[index++] !== ',') throw new Error('expected array delimiter')
      }
    }
    if (raw[index] === '{') {
      index += 1
      whitespace()
      if (raw[index] === '}') { index += 1; return }
      const keys = new Set<string>()
      while (true) {
        whitespace()
        const key = string()
        if (keys.has(key)) throw new Error('duplicate object key')
        keys.add(key)
        whitespace()
        if (raw[index++] !== ':') throw new Error('expected object colon')
        value()
        whitespace()
        if (raw[index] === '}') { index += 1; return }
        if (raw[index++] !== ',') throw new Error('expected object delimiter')
      }
    }
    const start = index
    while (index < raw.length && !/[\s,\]}]/.test(raw[index]!)) index += 1
    const primitive = raw.slice(start, index)
    if (!primitive || !['true', 'false', 'null'].includes(primitive)) {
      const parsed = JSON.parse(primitive)
      if (typeof parsed !== 'number') throw new Error('invalid primitive')
    }
  }
  value()
  whitespace()
  if (index !== raw.length) throw new Error('trailing JSON')
}

export async function readJsonArrayFailClosed(
  path: string,
  options: { maxBytes?: number; openFile?: typeof open } = {},
): Promise<unknown[]> {
  let raw: string
  try {
    const handle = await (options.openFile || open)(path, 'r')
    try {
      if (options.maxBytes === undefined) {
        raw = (await handle.readFile()).toString('utf8')
      } else {
        const maxBytes = Math.max(0, Math.floor(options.maxBytes))
        const chunks: Buffer[] = []
        let total = 0
        while (total <= maxBytes) {
          const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1 - total))
          const { bytesRead } = await handle.read(chunk, 0, chunk.byteLength, total)
          if (!bytesRead) break
          chunks.push(chunk.subarray(0, bytesRead))
          total += bytesRead
        }
        if (total > maxBytes) {
          throw new McpError('MCP_STORE_CORRUPT', 'MCP 配置文件超过大小限制：' + basename(path))
        }
        raw = Buffer.concat(chunks, total).toString('utf8')
      }
    } finally {
      await handle.close()
    }
  } catch (error: any) {
    if (error?.code === 'ENOENT') return []
    if (error instanceof McpError) throw error
    throw new McpError('MCP_STORE_IO_FAILED', '读取 MCP 配置失败：' + basename(path))
  }
  try {
    validateJsonObjectKeys(raw)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('top-level value is not an array')
    return parsed
  } catch {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP 配置文件损坏：' + basename(path))
  }
}

export async function writeJsonArrayAtomic(
  path: string,
  value: unknown[],
  options: { maxBytes?: number } = {},
) {
  const temporary = join(dirname(path), '.' + basename(path) + '.' + process.pid + '.' + randomUUID() + '.tmp')
  try {
    const serialized = JSON.stringify(value, null, 2) + '\n'
    if (options.maxBytes !== undefined && Buffer.byteLength(serialized, 'utf8') > options.maxBytes) {
      throw new McpError('MCP_STORE_IO_FAILED', 'MCP 配置文件超过写入大小限制：' + basename(path))
    }
    await writeFile(temporary, serialized, { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, path)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    if (error instanceof McpError) throw error
    throw new McpError('MCP_STORE_IO_FAILED', '写入 MCP 配置失败：' + basename(path))
  }
}
