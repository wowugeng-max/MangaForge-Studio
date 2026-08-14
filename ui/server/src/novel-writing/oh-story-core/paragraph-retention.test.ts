import { expect, test } from 'bun:test'
import {
  ohStoryApplyRewroteTooMuch,
  ohStoryParagraphRetention,
  splitOhStoryParagraphs,
} from './paragraph-retention'

function chapter(changed: number, total = 10) {
  const original = Array.from({ length: total }, (_, i) => `第${i + 1}段原文。`).join('\n\n')
  const next = Array.from({ length: total }, (_, i) => (
    i < changed ? `第${i + 1}段改过了。` : `第${i + 1}段原文。`
  )).join('\n\n')
  return { original, next }
}

test('splitOhStoryParagraphs trims and drops empty blocks', () => {
  expect(splitOhStoryParagraphs('甲。\n\n\n乙。\n\n  \n\n丙。')).toEqual(['甲。', '乙。', '丙。'])
})

test('retention is the share of original paragraphs that still appear verbatim', () => {
  const { original, next } = chapter(2, 10)
  expect(ohStoryParagraphRetention(original, next)).toBe(0.8)
})

test('eight or more paragraphs reject when retention drops below 70%', () => {
  expect(ohStoryApplyRewroteTooMuch(chapter(2, 10).original, chapter(2, 10).next)).toBe(false)
  expect(ohStoryApplyRewroteTooMuch(chapter(4, 10).original, chapter(4, 10).next)).toBe(true)
  expect(ohStoryApplyRewroteTooMuch(chapter(7, 7).original, chapter(7, 7).next)).toBe(false)
})
