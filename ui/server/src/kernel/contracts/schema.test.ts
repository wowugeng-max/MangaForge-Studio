import { describe, expect, test } from 'bun:test'
import { validateKernelContract } from './schema'

function baseContract() {
  return {
    schema_version: 1,
    id: 'oh-story-core.story-review.full',
    pack_id: 'oh-story-core',
    skill_name: 'story-review',
    variant: 'full',
    capability: 'review',
    label: 'oh-story 完整审稿',
    invoke: { mention: '$story-review', prompt: '报告写到 {{report_path}}' },
    projection: { mounts: ['current_chapter', 'outline'] },
    outputs: [{ artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', fallback: 'last_message', binding: 'reviews.oh_story_review', required: true }],
    write_scope: ['审稿/'],
    ignore: ['.story-review/'],
    gates: ['reject_solo_fallback'],
    commit: { mode: 'auto_if_single', domain_writes: ['reviews'] },
    sandbox: 'workspace-write',
    approval: 'never',
  }
}

describe('kernel contract schema', () => {
  test('valid contract passes and returns typed contract', () => {
    const result = validateKernelContract(baseContract())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.contract.id).toBe('oh-story-core.story-review.full')
  })

  test('id must equal pack_id.skill_name.variant', () => {
    const bad = { ...baseContract(), id: 'oh-story-core.other.full' }
    const result = validateKernelContract(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('id')
  })

  test('id charset enforced', () => {
    const bad = { ...baseContract(), id: 'Bad_ID.story-review.full', pack_id: 'Bad_ID' }
    expect(validateKernelContract(bad).ok).toBe(false)
  })

  test('mention must be $skill_name or empty', () => {
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '$wrong-name', prompt: 'x' } }).ok).toBe(false)
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '', prompt: 'x' } }).ok).toBe(true)
  })

  test('unknown template variable in prompt or glob fails', () => {
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '$story-review', prompt: '{{nope}}' } }).ok).toBe(false)
    const badGlob = baseContract()
    badGlob.outputs[0].glob = '审稿/{{nope}}.md'
    expect(validateKernelContract(badGlob).ok).toBe(false)
  })

  test('unregistered artifact_kind fails', () => {
    const bad = baseContract()
    ;(bad.outputs[0] as any).artifact_kind = 'mystery'
    expect(validateKernelContract(bad).ok).toBe(false)
  })

  test('unknown gate or mount fails', () => {
    expect(validateKernelContract({ ...baseContract(), gates: ['not_a_gate'] }).ok).toBe(false)
    expect(validateKernelContract({ ...baseContract(), projection: { mounts: ['not_a_mount'] } }).ok).toBe(false)
  })

  test('optional verb and new artifact kinds / gates are accepted', () => {
    const withVerb = { ...baseContract(), verb: 'review_chapter', gates: ['reject_chapter_text_artifact', 'require_outline_mix'] }
    expect(validateKernelContract(withVerb).ok).toBe(true)
    const withKind = baseContract()
    withKind.outputs[0].artifact_kind = 'world_doc'
    expect(validateKernelContract(withKind).ok).toBe(true)
  })
})
