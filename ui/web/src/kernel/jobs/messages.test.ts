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
    expect(kernelJobUserMessage('CHAPTER_NO_PROSE')).toEqual({
      kind: 'warning',
      text: '本章还没有正文，请先写草稿',
    })
    expect(kernelJobUserMessage('VERB_PARAMS_INVALID')).toEqual({
      kind: 'warning',
      text: '续写参数无效',
    })
  })

  test('maps adapt_pack gate codes to toast copy', () => {
    expect(kernelJobUserMessage('ADAPT_TARGET_INVALID')).toEqual({
      kind: 'warning',
      text: '不能适配内置写作 skill 或 oh-story',
    })
    expect(kernelJobUserMessage('SKILL_NOT_FOUND')).toEqual({
      kind: 'warning',
      text: '还没有安装这份写作 skill',
    })
    expect(kernelJobUserMessage('ADAPT_NO_VALID_CONTRACT')).toEqual({
      kind: 'warning',
      text: '这份 skill 填不满工作台合同',
    })
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')).toEqual({
      kind: 'warning',
      text: '同项目同动词任务未结束',
    })
  })

  test('maps TRACKING_MISSING to oh-story tracking warning', () => {
    expect(kernelJobUserMessage('TRACKING_MISSING')).toEqual({
      kind: 'warning',
      text: '写章未提交 oh-story 追踪',
    })
  })

  test('maps FOUNDATION_PRECONDITION to expand ledger copy', () => {
    expect(kernelJobUserMessage('FOUNDATION_PRECONDITION')).toEqual({
      kind: 'warning',
      text: '扩纲需要账本里已有大纲',
    })
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')).toEqual({
      kind: 'warning',
      text: '同项目同动词任务未结束',
    })
    expect(kernelJobUserMessage('VERB_PARAMS_INVALID')).toEqual({
      kind: 'warning',
      text: '续写参数无效',
    })
  })
})
