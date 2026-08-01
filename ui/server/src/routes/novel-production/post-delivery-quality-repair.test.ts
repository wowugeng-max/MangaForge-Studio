import { describe, expect, test } from 'bun:test'
import { buildPostDeliveryQualityRepairTasks } from './post-delivery-quality-repair'

describe('post-delivery quality repair tasks', () => {
  test('maps a post-delivery check to its stable repair issue type', () => {
    const tasks = buildPostDeliveryQualityRepairTasks(
      { id: 41, chapter_no: 7 },
      {
        checks: [
          { key: 'chapter_handoff', label: '章首承接', status: 'warn', summary: '承接证据待补齐。' },
        ],
      },
      9001,
    )

    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      issue_type: 'chapter_handoff_gap',
      chapter_id: 41,
      chapter_no: 7,
      source_run_id: 9001,
    })
  })
})
