import { describe, expect, test } from 'bun:test'
import {
  FALLBACK_GENRE_CATALOG_GUIDES,
  buildGenreGuideIdeaPrefix,
  filterGenreCatalogGuidesByPrimary,
  genreFrameworkToPrimaryGenre,
  isSeedGenreAligned,
  matchGenreCatalogGuide,
  primaryGenreLockText,
} from './genreCatalogGuide'

describe('genreCatalogGuide', () => {
  test('matches rule-horror idea to 规则怪谈 framework', () => {
    const matched = matchGenreCatalogGuide(
      FALLBACK_GENRE_CATALOG_GUIDES,
      '我想写规则怪谈副本求生，主角靠找漏洞通关',
    )
    expect(matched?.framework).toBe('规则怪谈')
    expect(buildGenreGuideIdeaPrefix(matched)).toContain('规则怪谈')
  })

  test('maps framework to primary genre tags used by create form', () => {
    expect(genreFrameworkToPrimaryGenre('仙侠/玄幻')).toBe('玄幻')
    expect(genreFrameworkToPrimaryGenre('规则怪谈')).toBe('悬疑')
    expect(genreFrameworkToPrimaryGenre('霸总/甜宠')).toBe('言情')
  })
})


  test('filters frameworks by primary genre so urban does not show xianxia first', () => {
    const urban = filterGenreCatalogGuidesByPrimary(FALLBACK_GENRE_CATALOG_GUIDES, '都市')
    expect(urban.some(item => item.framework === '都市高武')).toBe(true)
    expect(urban.some(item => /仙侠/.test(item.framework))).toBe(false)
  })

  test('primary genre lock forbids xianxia drift for urban', () => {
    const lock = primaryGenreLockText('都市')
    expect(lock).toContain('主题材硬约束：都市')
    expect(lock).toContain('禁止写成仙侠')
    expect(buildGenreGuideIdeaPrefix(null, '悬疑')).toContain('悬疑')
  })

  test('seed genre alignment treats 玄幻/仙侠 as close family', () => {
    expect(isSeedGenreAligned('都市', '都市')).toBe(true)
    expect(isSeedGenreAligned('仙侠', '玄幻')).toBe(true)
    expect(isSeedGenreAligned('仙侠', '都市')).toBe(false)
  })
