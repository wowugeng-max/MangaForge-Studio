import { describe, expect, test } from 'bun:test'
import { countProseChars } from '../word-target'
import { chunkWritingSkillChapter } from './chunk-chapter'

describe('chunkWritingSkillChapter', () => {
  test('keeps a normal chapter as one chunk', () => {
    const text = '林序把门带上。\n\n走廊里只剩灯管声。'.repeat(80)
    expect(countProseChars(text)).toBeLessThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ index: 0, total: 1, text })
  })

  test('splits a 13000-char chapter on blank lines into 6000-8000 char pieces', () => {
    const block = `${'林序继续往前走，纸条边角硌着手指。'.repeat(40)}\n\n`
    const text = block.repeat(20)
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].total).toBe(chunks.length)
    for (const chunk of chunks) {
      const chars = countProseChars(chunk.text)
      expect(chars).toBeGreaterThanOrEqual(4000)
      expect(chars).toBeLessThanOrEqual(8000)
    }
    expect(chunks.map(item => item.text).join('\n\n')).toContain('林序继续往前走')
  })

  test('splits on whitespace-only blank lines', () => {
    const block = `${'林序继续往前走，纸条边角硌着手指。'.repeat(40)}\n  \n`
    const text = block.repeat(20)
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBeGreaterThan(1)
  })

  test('merges a tiny trailing chunk into the previous chunk', () => {
    const sentence = '林序继续往前走，纸条边角硌着手指。'
    const bigPara = sentence.repeat(Math.ceil(3500 / countProseChars(sentence)))
    const text = [bigPara, bigPara, bigPara, bigPara, '林'].join('\n\n')
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(countProseChars(chunk.text)).toBeGreaterThanOrEqual(4000)
    }
  })

  test('terminates when an oversized paragraph precedes a tiny tail', () => {
    const sentence = '林序继续往前走，纸条边角硌着手指。'
    const hugePara = sentence.repeat(Math.ceil(13000 / countProseChars(sentence)))
    const text = `${hugePara}\n\n林`
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks[0].total).toBe(chunks.length)
  })

  test('does not steal when it would shrink the previous chunk below 4000', () => {
    const sentence = '林序继续往前走，纸条边角硌着手指。'
    const para3500 = sentence.repeat(Math.ceil(3500 / countProseChars(sentence)))
    const para3000 = sentence.repeat(Math.ceil(3000 / countProseChars(sentence)))
    const text = [para3500, para3500, para3500, para3500, para3000].join('\n\n')
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBe(3)
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(countProseChars(chunks[i].text)).toBeGreaterThanOrEqual(4000)
      expect(countProseChars(chunks[i].text)).toBeLessThanOrEqual(8000)
    }
  })
})
