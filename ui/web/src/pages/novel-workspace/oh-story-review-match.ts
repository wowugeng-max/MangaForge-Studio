import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'

export function parseOhStoryReviewPayload(review: any): any {
  const raw = review?.payload
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return {}
  }
}

export function latestOhStoryReviewForChapter(reviews: any[], chapterId: number): any | null {
  return (reviews || [])
    .filter((review) => {
      const payload = parseOhStoryReviewPayload(review)
      return Number(payload.chapter_id || review.chapter_id || 0) === Number(chapterId)
    })
    .slice()
    .sort((left, right) => {
      const byTime = String(right.created_at || '').localeCompare(String(left.created_at || ''))
      return byTime !== 0 ? byTime : Number(right.id || 0) - Number(left.id || 0)
    })[0] || null
}

export function ohStoryReviewMatchesChapterText(review: any, chapterText: string): boolean {
  const hash = String(parseOhStoryReviewPayload(review).chapter_text_hash || '')
  return Boolean(hash) && hash === ohStoryChapterTextHash(chapterText)
}
