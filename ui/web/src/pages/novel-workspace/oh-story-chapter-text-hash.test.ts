import { createHash } from 'node:crypto'
import { expect, test } from 'bun:test'
import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'

test('matches the server sha256 hex digest', () => {
  const text = '楚弦咽气的时候。'
  expect(ohStoryChapterTextHash(text)).toBe(
    createHash('sha256').update(text, 'utf8').digest('hex'),
  )
})
