// ui/server/src/kernel/codex/events.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RpcEventSink } from './rpc'

export function createKernelEventsRecorder(jobDir: string): { sink: RpcEventSink; path: string } {
  mkdirSync(jobDir, { recursive: true })
  const path = join(jobDir, 'events.jsonl')
  const sink: RpcEventSink = (direction, message) => {
    appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), direction, message }) + '\n')
  }
  return { sink, path }
}

export function readKernelEvents(jobDir: string): Array<{ ts: string; direction: string; message: any }> {
  const path = join(jobDir, 'events.jsonl')
  if (!existsSync(path)) return []
  const events: Array<{ ts: string; direction: string; message: any }> = []
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line))
    } catch {
      continue
    }
  }
  return events
}

export function writeKernelLastMessage(jobDir: string, text: string): string {
  mkdirSync(jobDir, { recursive: true })
  const path = join(jobDir, 'last-message.md')
  writeFileSync(path, String(text ?? ''))
  return path
}
