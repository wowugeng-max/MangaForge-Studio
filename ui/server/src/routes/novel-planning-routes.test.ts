import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('novel rolling planning routes', () => {
  test('rolling plan prompt preserves batch brief repair intent', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-planning-routes.ts'), 'utf8')

    expect(source).toContain('const rollingPlanIntent = req.body.rolling_plan_intent || req.body.rollingPlanIntent || null')
    expect(source).toContain('【滚动规划意图】')
    expect(source).toContain('batch_brief_repair')
    expect(source).toContain('缺逐章职责、冲突落点、主线推进或章末钩子')
    expect(source).toContain('rolling_plan_intent: rollingPlanIntent')
  })
})
