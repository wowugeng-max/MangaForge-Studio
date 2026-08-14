import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'
import {
  latestOhStoryReviewForChapter,
  ohStoryReviewMatchesChapterText,
  parseOhStoryReviewPayload,
} from './oh-story-review-match'

const text = '楚弦咽气的时候。'

test('parses object or json payload', () => {
  expect(parseOhStoryReviewPayload({ payload: { chapter_id: 61 } }).chapter_id).toBe(61)
  expect(parseOhStoryReviewPayload({ payload: '{"chapter_id":61}' }).chapter_id).toBe(61)
})

test('picks the newest review for the chapter', () => {
  const latest = latestOhStoryReviewForChapter([
    { id: 1, created_at: '2026-08-14T12:00:00.000Z', payload: { chapter_id: 61 } },
    { id: 3, created_at: '2026-08-14T13:00:00.000Z', payload: { chapter_id: 61 } },
    { id: 2, created_at: '2026-08-14T14:00:00.000Z', payload: { chapter_id: 8 } },
  ], 61)
  expect(latest.id).toBe(3)
})

test('matches only when chapter_text_hash equals the current text hash', () => {
  const review = { payload: { chapter_text_hash: ohStoryChapterTextHash(text) } }
  expect(ohStoryReviewMatchesChapterText(review, text)).toBe(true)
  expect(ohStoryReviewMatchesChapterText(review, `${text}改`)).toBe(false)
  expect(ohStoryReviewMatchesChapterText({ payload: {} }, text)).toBe(false)
})
