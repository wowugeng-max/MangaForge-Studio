import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { runProseQualityLoop } from './prose-quality-loop'

const passingReview = {
  score: 90,
  score_scale: '0-100',
  publishable: true,
  dimensions: {
    continuity: 8,
    core_promise_agency: 8,
    conflict_causality: 8,
    payoff_hook: 8,
    prose_style: 8,
    fact_setting_safety: 8,
  },
  findings: [],
}

const craftRiskText = [
  '第十一章 铁链声',
  '',
  '窗外的雨越下越密，青石板被水光铺成一片，街角的灯笼在风里轻轻晃，昏黄的光落在湿漉漉的墙面上。',
  '',
  '檐下的积水顺着瓦缝滴落，空气里浮着潮冷的味道，远处偶尔传来一声闷雷，整条街都显得空旷而沉默。',
  '',
  '桌上摊着一本旧账本，第一页写着八万块，旁边放着一把旧钥匙。银色戒指压在账角，内圈刻着三年两个小字，下面还有一张800元收据，纸边已经泛黄。',
  '',
  '沈砚停在门边。'.repeat(120),
].join('\n')

describe('prose stability quality loop', () => {
  test('classifies wall-text, static-environment, and decorative-detail scans as advisory rather than hard invalidity', () => {
    const source = readFileSync(join(import.meta.dir, '../routes/novel-writing-service.ts'), 'utf8')
    const start = source.indexOf('export function scanProseForQualityLoop')
    const end = source.indexOf('export function buildFocusedQualityCoreContract', start)
    const scanSource = source.slice(start, end)

    expect(scanSource).toContain('scanParagraph')
    expect(scanSource).toContain('scanProseStaticEnvironmentRisks(text)')
    expect(scanSource).toContain('scanProseDecorativeDetailRisks(text)')
    expect(scanSource).toContain('advisory_findings')
    expect(scanSource).not.toMatch(/hardFailures[\s\S]*scanProseStaticEnvironmentRisks/)
    expect(scanSource).not.toMatch(/hardFailures[\s\S]*scanProseDecorativeDetailRisks/)
  })

  test('offers advisory craft findings to the single optional revision without turning them into a blocking decision', async () => {
    let reviseCalls = 0
    let receivedFindings: any[] = []
    const revisedText = craftRiskText.replace(/窗外的雨[\s\S]*?空旷而沉默。/, '雨水灌进门缝，沈砚借水光看见铁链正朝老陈脚边滑来。')

    const result = await runProseQualityLoop({
      initialText: craftRiskText,
      minScore: 80,
      maxRevisionRounds: 1,
      scan: async text => ({
        hard_failures: [],
        advisory_findings: text === craftRiskText ? [
          {
            key: 'prose_static_environment',
            pattern: 'prose_static_environment',
            status: 'warn',
            evidence: '窗外的雨越下越密',
            fix: '让环境进入角色动作、压力或信息变化。',
          },
          {
            key: 'prose_decorative_detail',
            pattern: 'prose_decorative_detail',
            status: 'warn',
            evidence: '八万块、旧钥匙、银色戒指、800元收据',
            fix: '删除无功能细节，或让道具触发选择和线索。',
          },
        ] : [],
      }),
      review: async () => passingReview,
      revise: async ({ blockingFindings }) => {
        reviseCalls += 1
        receivedFindings = blockingFindings
        return { final_text: revisedText }
      },
    })

    expect(reviseCalls).toBe(1)
    expect(receivedFindings.some(item => item.key === 'prose_static_environment')).toBe(true)
    expect(result.decision.hard_failures).toEqual([])
    expect(result.decision.approvable).toBe(true)
  })
})
