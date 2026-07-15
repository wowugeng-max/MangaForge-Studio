import { describe, expect, test } from 'bun:test'
import {
  FALLBACK_GENRE_CATALOG_GUIDES,
  buildGenreGuideIdeaPrefix,
  genreFrameworkToPrimaryGenre,
  matchGenreCatalogGuide,
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
