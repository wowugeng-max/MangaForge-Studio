import { parseJsonLikePayload } from '../../routes/novel-route-utils'

export function reviewTimestamp(review: any) {
  const raw = String(review?.created_at || review?.updated_at || '')
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function reviewPayloadForType(review: any, reviewType: string) {
  const payload = parseJsonLikePayload(review?.payload) || {}
  const typedPayload = payload?.[reviewType] || payload?.result?.[reviewType]
  if (typedPayload && typeof typedPayload === 'object') {
    return {
      chapter_id: payload?.chapter_id ?? payload?.result?.chapter_id ?? typedPayload?.chapter_id,
      chapter_no: payload?.chapter_no ?? payload?.result?.chapter_no ?? typedPayload?.chapter_no,
      ...typedPayload,
    }
  }
  return payload?.result || payload || {}
}

export function reviewBelongsToChapter(review: any, payload: any, chapter: any) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  const payloadChapterNo = Number(payload?.chapter_no || review?.chapter_no || 0)
  const payloadChapterId = Number(payload?.chapter_id || review?.chapter_id || 0)
  return (chapterNo > 0 && payloadChapterNo === chapterNo) || (chapterId > 0 && payloadChapterId === chapterId)
}
