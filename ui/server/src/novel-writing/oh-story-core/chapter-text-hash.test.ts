import { createHash } from 'node:crypto'
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './chapter-text-hash'

test('hashes the exact chapter_text bytes with sha256 hex', () => {
  expect(ohStoryChapterTextHash('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  const text = '楚弦咽气的时候。'
  expect(ohStoryChapterTextHash(text)).toBe(
    createHash('sha256').update(text, 'utf8').digest('hex'),
  )
  expect(ohStoryChapterTextHash(`${text} `)).not.toBe(ohStoryChapterTextHash(text))
})
