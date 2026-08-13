/** 全书查找纯模型:章内文本匹配与结果汇总。 */

export type BookSearchHit = {
  index: number
  snippet: string
}

export type BookSearchChapterResult = {
  chapterId: number
  chapterNo: number
  title: string
  hits: BookSearchHit[]
}

const MIN_QUERY_LENGTH = 2
const SNIPPET_CONTEXT_CHARS = 18
const MAX_HITS_PER_CHAPTER = 20

export function searchChapterText(text: string, query: string): BookSearchHit[] {
  const needle = String(query || '').trim()
  if (!text || needle.length < MIN_QUERY_LENGTH) return []

  const haystack = text.toLowerCase()
  const target = needle.toLowerCase()
  const hits: BookSearchHit[] = []
  let cursor = 0
  while (hits.length < MAX_HITS_PER_CHAPTER) {
    const index = haystack.indexOf(target, cursor)
    if (index === -1) break
    const start = Math.max(0, index - SNIPPET_CONTEXT_CHARS)
    const end = Math.min(text.length, index + needle.length + SNIPPET_CONTEXT_CHARS)
    const snippet = `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`
    hits.push({ index, snippet })
    cursor = index + needle.length
  }
  return hits
}

export function buildBookSearchSummary(results: BookSearchChapterResult[]): string {
  const withHits = results.filter(result => result.hits.length > 0)
  if (withHits.length === 0) return '无命中'
  const total = withHits.reduce((sum, result) => sum + result.hits.length, 0)
  return `${withHits.length} 章命中 ${total} 处`
}
