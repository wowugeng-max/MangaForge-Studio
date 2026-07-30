import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { McpError } from './errors'

export async function readJsonArrayFailClosed(path: string): Promise<unknown[]> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return []
    throw new McpError('MCP_STORE_IO_FAILED', '读取 MCP 配置失败：' + basename(path))
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('top-level value is not an array')
    return parsed
  } catch {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP 配置文件损坏：' + basename(path))
  }
}

export async function writeJsonArrayAtomic(path: string, value: unknown[]) {
  const temporary = join(dirname(path), '.' + basename(path) + '.' + process.pid + '.' + randomUUID() + '.tmp')
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, path)
  } catch {
    await rm(temporary, { force: true }).catch(() => {})
    throw new McpError('MCP_STORE_IO_FAILED', '写入 MCP 配置失败：' + basename(path))
  }
}
