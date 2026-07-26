import { describe, expect, test } from 'bun:test'
import {
  buildKnowledgeEntriesFromAnalyzePlan,
  buildKnowledgeEntriesFromGenreCard,
  describeKnowledgeIntegration,
} from './oh-story-knowledge-bridge'
import { buildGenreProseCardContract, listGenreProseCards } from './genre-prose-cards'
import { createOhStoryCapabilityService } from '../routes/novel-oh-story-capability-service'

describe('oh-story knowledge bridge', () => {
  test('describes integration with existing knowledge base', () => {
    const info = describeKnowledgeIntegration()
    expect(info.can_integrate).toBe(true)
    expect(info.existing_assets.some((item: string) => item.includes('知识库'))).toBe(true)
    expect(info.mapping.some((item: any) => item.p2 === 'import')).toBe(true)
  })

  test('maps analyze plan and genre card into knowledge entries', () => {
    const service = createOhStoryCapabilityService()
    const plan = service.buildLongAnalyzePlan({ title: '规则怪谈对标' })
    const entries = buildKnowledgeEntriesFromAnalyzePlan(plan, { project_title: '规则怪谈对标', project_id: 9 })
    expect(entries.length).toBeGreaterThan(2)
    expect(entries[0].category).toBe('benchmark_analyze')
    expect(entries[0].project_id).toBe(9)

    const contract = buildGenreProseCardContract({ genre: '规则怪谈' })
    const genreEntries = buildKnowledgeEntriesFromGenreCard(contract, { project_id: 9, project_title: '测试书' })
    expect(genreEntries[0].category).toBe('genre_prose_card')
    expect(genreEntries[0].title).toContain('悬疑灵异')
  })

  test('loads full oh-story genre prose card corpus', () => {
    const cards = listGenreProseCards()
    expect(cards.length).toBe(32)
    expect(cards.some(card => card.title === '都市脑洞')).toBe(true)
    expect(cards.some(card => card.title === '悬疑灵异')).toBe(true)
    expect(cards.every(card => card.conflict_engine && card.forbidden_drift)).toBe(true)
  })
})
