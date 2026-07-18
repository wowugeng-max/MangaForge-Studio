import {
  GENERIC_GENRE_CATALOG_CONTRACT,
  GENRE_CATALOG_ROUTES,
  type GenreCatalogRoute,
  type OhStoryGenreCatalogContract,
} from './novel-genre-catalog-data'

export type { OhStoryGenreCatalogContract } from './novel-genre-catalog-data'

function normalizeGenreText(value: string) {
  return value.toLowerCase()
}

function firstMatchedRoute(input: string) {
  const normalized = normalizeGenreText(input)
  const scoredRoutes = GENRE_CATALOG_ROUTES
    .map((route, index) => ({
      route,
      index,
      score: route.keywords.reduce((total, keyword) => {
        const normalizedKeyword = keyword.toLowerCase()
        return normalized.includes(normalizedKeyword) ? total + normalizedKeyword.length : total
      }, 0),
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
  return scoredRoutes[0]?.route
}

export function findGenreCatalogRouteByFramework(framework: string) {
  const key = String(framework || '').trim()
  if (!key) return null
  return GENRE_CATALOG_ROUTES.find(route => route.framework === key) || null
}

export function buildOhStoryGenreCatalogContract(
  ...inputs: any[]
): OhStoryGenreCatalogContract {
  const forceFramework = (() => {
    for (const input of inputs) {
      if (input && typeof input === 'object' && !Array.isArray(input) && input.force_framework) {
        return String(input.force_framework || '').trim()
      }
    }
    return ''
  })()
  if (forceFramework) {
    const forced = findGenreCatalogRouteByFramework(forceFramework)
    if (forced) {
      return {
        source: 'oh_story_genre_catalog_v1',
        matched_framework: forced.framework,
        route_reason: `作者指定类型框架：${forced.framework}`,
        ...forced.contract,
      }
    }
  }
  const text = inputs
    .flatMap(input => Array.isArray(input) ? input : [input])
    .filter(input => input !== undefined && input !== null)
    .map(input => {
      if (typeof input === 'string') return input
      if (input && typeof input === 'object' && !Array.isArray(input) && input.force_framework) {
        return String(input.force_framework)
      }
      return JSON.stringify(input)
    })
    .join('\n')
  const route = firstMatchedRoute(text)
  if (!route) return { ...GENERIC_GENRE_CATALOG_CONTRACT }
  return {
    source: 'oh_story_genre_catalog_v1',
    matched_framework: route.framework,
    route_reason: `命中 ${route.framework} 题材目录路由。`,
    ...route.contract,
  }
}

export function formatOhStoryGenreCatalogPrompt(contract: OhStoryGenreCatalogContract) {
  return [
    '【oh-story 题材目录契约】',
    '请把下列内容写入 writing_bible.genre_positioning_contract.genre_catalog_contract，并让 commercial_positioning、volume_outlines、chapter_outlines 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}


export type OhStoryGenreCatalogGuide = {
  framework: string
  keywords: string[]
  reader_promise: string
  structure_beats: string[]
  must_have_scenes: string[]
  emotional_rhythm: string[]
  pitfalls: string[]
  quality_checks: string[]
  category_hint: string
}

function categoryHintForFramework(framework: string) {
  if (/婚恋|小三|甜宠|霸总|追妻|后悔|死人/.test(framework)) return '女频/情感'
  if (/规则怪谈|无限|悬疑|死人/.test(framework)) return '高压求生/智斗'
  if (/仙侠|玄幻|凡人|都市高武|西幻|长生/.test(framework)) return '升级成长'
  if (/历史|文娱|新媒体|同人|脑洞|搞笑|世情/.test(framework)) return '题材外壳/脑洞'
  return '通用长篇'
}

export function listOhStoryGenreCatalogGuides(): OhStoryGenreCatalogGuide[] {
  return GENRE_CATALOG_ROUTES.map(route => ({
    framework: route.framework,
    keywords: [...route.keywords],
    reader_promise: route.contract.reader_promise,
    structure_beats: [...route.contract.structure_beats],
    must_have_scenes: [...route.contract.must_have_scenes],
    emotional_rhythm: [...route.contract.emotional_rhythm],
    pitfalls: [...route.contract.pitfalls],
    quality_checks: [...route.contract.quality_checks],
    category_hint: categoryHintForFramework(route.framework),
  }))
}

export function matchOhStoryGenreCatalogGuide(...inputs: any[]): OhStoryGenreCatalogGuide | null {
  const text = inputs
    .flatMap(input => Array.isArray(input) ? input : [input])
    .filter(input => input !== undefined && input !== null)
    .map(input => typeof input === 'string' ? input : JSON.stringify(input))
    .join('\n')
  const route = firstMatchedRoute(text)
  if (!route) return null
  return {
    framework: route.framework,
    keywords: [...route.keywords],
    reader_promise: route.contract.reader_promise,
    structure_beats: [...route.contract.structure_beats],
    must_have_scenes: [...route.contract.must_have_scenes],
    emotional_rhythm: [...route.contract.emotional_rhythm],
    pitfalls: [...route.contract.pitfalls],
    quality_checks: [...route.contract.quality_checks],
    category_hint: categoryHintForFramework(route.framework),
  }
}
