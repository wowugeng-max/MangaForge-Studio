import { describe, expect, test } from 'bun:test'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { resolveContractVerb } from './infer'
import { validateInstanceAgainstTemplate } from './validate-instance'

const reviewFull = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!

describe('instance vs template validation', () => {
  test('builtin ids infer their verbs; legacy .outline has none', () => {
    expect(resolveContractVerb(reviewFull)).toBe('review_chapter')
    const outline = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(resolveContractVerb(outline)).toBeNull()
  })
  test('all builtin contracts with a verb satisfy their templates', () => {
    for (const contract of BUILTIN_KERNEL_CONTRACTS) {
      if (!resolveContractVerb(contract)) continue
      expect(validateInstanceAgainstTemplate(contract)).toEqual({ ok: true })
    }
  })
  test('required kind missing a required output fails', () => {
    const bad = { ...reviewFull, outputs: reviewFull.outputs.map(o => ({ ...o, required: false })) }
    const result = validateInstanceAgainstTemplate(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TEMPLATE_UNSATISFIED')
  })
  test('forbidden required kind (chapter_text on review) fails', () => {
    const bad = {
      ...reviewFull,
      outputs: [...reviewFull.outputs, { artifact_kind: 'chapter_text', glob: '正文/*.md', binding: 'kernel_only', required: true }],
    }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('outlines.replace binding is always rejected', () => {
    const openBook = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.open')
    const bad = { ...reviewFull, outputs: [{ ...reviewFull.outputs[0], binding: 'outlines.replace' }] }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
    expect(openBook).toBeUndefined()
  })
  test('template gates must all appear in instance gates', () => {
    const bad = { ...reviewFull, gates: ['reject_solo_fallback'] }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('mention policy enforced', () => {
    const bad = { ...reviewFull, invoke: { ...reviewFull.invoke, mention: '' } }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('project-subject verbs reject chapter-level mounts', () => {
    const bad = {
      ...reviewFull,
      id: 'x-pack.x-skill.open', pack_id: 'x-pack', skill_name: 'x-skill', variant: 'open',
      verb: 'open_book', capability: 'outline',
      invoke: { mention: '$x-skill', prompt: '开书 {{user_brief_file}}' },
      projection: { mounts: ['current_chapter', 'skill_tree'] },
      outputs: [
        { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
        { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
        { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
      ],
      gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
      commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
    }
    const result = validateInstanceAgainstTemplate(bad as any)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('current_chapter')
  })
})
