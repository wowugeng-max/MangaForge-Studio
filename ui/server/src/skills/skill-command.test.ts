import { describe, expect, test } from 'bun:test'
import { parseSkillCommand, resolveSkillArguments } from './skill-command'

describe('explicit skill commands', () => {
  test('parses only a leading command token', () => {
    expect(parseSkillCommand('/h3-prompt-writing hero closeup')).toEqual({ name: 'h3-prompt-writing', argumentsText: 'hero closeup' })
    expect(parseSkillCommand('/pack-a:h3-prompt-writing hero')).toEqual({ packId: 'pack-a', name: 'h3-prompt-writing', argumentsText: 'hero' })
    expect(parseSkillCommand('draw a hero')).toBeNull()
    expect(parseSkillCommand('draw /hero')).toBeNull()
  })

  test('resolves defaults and rejects unknown or missing arguments', () => {
    const manifest: any = { arguments: [{ name: 'style', default: 'cinematic' }, { name: 'ratio', required: true }] }
    expect(resolveSkillArguments(manifest, 'ratio=16:9')).toEqual({ style: 'cinematic', ratio: '16:9' })
    expect(() => resolveSkillArguments(manifest, 'unknown=x ratio=16:9')).toThrow(expect.objectContaining({ code: 'SKILL_ARGUMENT_UNKNOWN' }))
    expect(() => resolveSkillArguments(manifest, '')).toThrow(expect.objectContaining({ code: 'SKILL_ARGUMENT_REQUIRED' }))
  })
})
