import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('novel run task center source guards', () => {
  test('treats repair task runs as actionable repair queues instead of resumable worker jobs', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-run-routes.ts'), 'utf8')

    expect(source).toContain('REPAIR_TASK_RUN_TYPES')
    expect(source).toContain('can_process_repair_tasks')
    expect(source).toContain('!isRepairTaskRun && [\'paused\', \'failed\', \'ready\'].includes(run.status)')
    expect(source).toContain('REPAIR_TASK_RUN_NOT_RESUMABLE')
  })
})
