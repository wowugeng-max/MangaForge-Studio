// ui/server/src/kernel/codex/events.test.ts
import { describe, expect, test } from 'bun:test'
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createKernelEventsRecorder, readKernelEvents, writeKernelLastMessage } from './events'

describe('kernel events recorder', () => {
  test('sink appends jsonl and readKernelEvents round-trips', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    const recorder = createKernelEventsRecorder(jobDir)
    recorder.sink('send', { method: 'initialize' })
    recorder.sink('recv', { id: 1, result: {} })
    const events = readKernelEvents(jobDir)
    expect(events.length).toBe(2)
    expect(events[0].direction).toBe('send')
    expect(events[0].message.method).toBe('initialize')
    expect(typeof events[0].ts).toBe('string')
  })

  test('bad line is skipped, missing file returns []', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    expect(readKernelEvents(jobDir)).toEqual([])
    const recorder = createKernelEventsRecorder(jobDir)
    recorder.sink('recv', { ok: 1 })
    appendFileSync(recorder.path, 'garbage line\n')
    recorder.sink('recv', { ok: 2 })
    expect(readKernelEvents(jobDir).map(e => e.message.ok)).toEqual([1, 2])
  })

  test('writeKernelLastMessage writes markdown', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    const path = writeKernelLastMessage(jobDir, '最终回复正文')
    expect(path.endsWith('last-message.md')).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe('最终回复正文')
  })
})
