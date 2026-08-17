import { describe, expect, test } from 'bun:test'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'
import { validateKernelContract } from './schema'
import { BUILTIN_KERNEL_CONTRACTS } from './builtin'

const open = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.open')!

describe('builtin open_book instance', () => {
  test('exists, passes schema and template validation', () => {
    expect(open).toBeTruthy()
    expect(validateKernelContract(open).ok).toBe(true)
    expect(validateInstanceAgainstTemplate(open)).toEqual({ ok: true })
  })
  test('prompt locks open-book intent and forbids prose', () => {
    expect(open.invoke.mention).toBe('$story-long-write')
    expect(open.invoke.prompt).toContain('帮我开书')
    expect(open.invoke.prompt).toContain('不要写正文')
    expect(open.invoke.prompt).toContain('{{user_brief_file}}')
  })
  test('outputs order puts narrow character glob before wide world glob', () => {
    const kinds = open.outputs.map(o => o.artifact_kind)
    expect(kinds.indexOf('character_sheet')).toBeLessThan(kinds.indexOf('world_doc'))
  })
  test('manual commit, no 正文 in write_scope', () => {
    expect(open.commit.mode).toBe('manual')
    expect(open.write_scope.some(p => p.startsWith('正文'))).toBe(false)
  })
})
