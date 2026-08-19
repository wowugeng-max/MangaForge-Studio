import { describe, expect, test } from 'bun:test'
import { kernelJobUserMessage } from './messages'

describe('kernelJobUserMessage', () => {
  test('maps apply gates to the live warning copy', () => {
    expect(kernelJobUserMessage('OH_STORY_APPLY_NO_REVIEW')).toEqual({ kind: 'warning', text: '先对本稿重新审稿' })
    expect(kernelJobUserMessage('OH_STORY_APPLY_REWROTE_TOO_MUCH')).toEqual({
      kind: 'warning',
      text: '这次改动太大，像整章重写。请再试一次',
    })
  })
  test('maps runtime unavailable', () => {
    expect(kernelJobUserMessage('KERNEL_RUNTIME_UNAVAILABLE')?.kind).toBe('error')
  })

  test('maps write_chapter gate codes to toast copy', () => {
    expect(kernelJobUserMessage('CHAPTER_HAS_PROSE')).toEqual({
      kind: 'warning',
      text: '本章已有正文，请用回炉或按建议改稿',
    })
    expect(kernelJobUserMessage('OUTLINE_MISSING')).toEqual({
      kind: 'warning',
      text: '本章还没有细纲',
    })
    expect(kernelJobUserMessage('CHAPTER_NOT_FOUND')).toEqual({
      kind: 'error',
      text: '找不到该章',
    })
  })
})
