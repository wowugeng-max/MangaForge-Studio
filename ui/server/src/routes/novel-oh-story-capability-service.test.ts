import { describe, expect, test } from 'bun:test'
import { createOhStoryCapabilityService } from './novel-oh-story-capability-service'

describe('oh-story capability surface', () => {
  test('lists p0-p2 capabilities and builds scaffold plans', () => {
    const service = createOhStoryCapabilityService()
    const caps = service.listCapabilities()
    expect(caps.p0.some((item: any) => item.key === 'reader_contract_progression')).toBe(true)
    expect(caps.p2.some((item: any) => item.key === 'long_analyze')).toBe(true)
    expect(service.buildLongAnalyzePlan({ title: '对标A' }).stages.length).toBeGreaterThan(2)
    expect(service.buildLongScanPlan({ platform: '番茄' }).platform).toContain('番茄')
    expect(service.buildImportPlan({}).steps.length).toBeGreaterThan(3)
    expect(service.buildCoverPlan({ title: '怪谈' }).title).toBe('怪谈')
    expect(service.buildShortSuitePlan({}).modules.length).toBe(3)
    const bundle = service.formatPromptBundle({ genre: '都市高武', title: '拳证' })
    expect(bundle.prompt).toContain('读者契约')
    expect(bundle.genre_prose_card_contract.matched).toBe(true)
  })
})
