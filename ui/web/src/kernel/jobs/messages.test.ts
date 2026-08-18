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
})
