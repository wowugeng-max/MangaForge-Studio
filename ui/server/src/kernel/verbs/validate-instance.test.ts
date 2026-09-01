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
    expect(openBook).toBeTruthy()
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
  test('expand instance upserts outlines and is implemented; replace outline variant stays unimplemented', () => {
    const expand = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.expand')!
    expect(resolveContractVerb(expand)).toBe('expand_outline')
    expect(validateInstanceAgainstTemplate(expand)).toEqual({ ok: true })
    expect(expand.commit.mode).toBe('manual')
    expect(expand.outputs.some(o => o.binding === 'outlines.replace')).toBe(false)
    const kinds = expand.outputs.map(o => o.artifact_kind)
    expect(kinds.indexOf('character_sheet')).toBeLessThan(kinds.indexOf('world_doc'))
    expect(expand.outputs.find(o => o.artifact_kind === 'character_sheet')?.glob).toBe('设定/角色/*.md')
    expect(expand.outputs.find(o => o.artifact_kind === 'world_doc')?.glob).toBe('设定/**/*.md')
    expect(expand.invoke.prompt).toContain('扩写大纲')
    expect(expand.invoke.prompt).toContain('不要写正文')
    const legacy = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(resolveContractVerb(legacy)).toBeNull()
  })
  test('write_chapter instance rewrites chapter text and stays implemented; outline variant stays unimplemented', () => {
    const write = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.chapter')!
    expect(resolveContractVerb(write)).toBe('write_chapter')
    expect(validateInstanceAgainstTemplate(write)).toEqual({ ok: true })
    expect(write.commit.mode).toBe('auto_if_single')
    expect(write.commit.source).toBe('oh_story_write')
    expect(write.gates).toEqual(['require_chapter_file', 'reject_outline_artifact', 'require_chapter_tracking'])
    expect(write.projection.mounts.includes('review_report')).toBe(false)
    expect(write.invoke.prompt).toContain('写第')
    expect(write.invoke.prompt).toContain('不要开书')
    const legacy = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(resolveContractVerb(legacy)).toBeNull()
  })
  test('rewrite_chapter instance is manual oh_story_rewrite and stays implemented; outline variant stays unimplemented', () => {
    const rewrite = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.rewrite')!
    expect(resolveContractVerb(rewrite)).toBe('rewrite_chapter')
    expect(validateInstanceAgainstTemplate(rewrite)).toEqual({ ok: true })
    expect(rewrite.commit.mode).toBe('manual')
    expect(rewrite.commit.source).toBe('oh_story_rewrite')
    expect(rewrite.gates).toEqual(['require_chapter_file', 'reject_outline_artifact', 'require_chapter_tracking'])
    expect(rewrite.gates.includes('paragraph_retention_70')).toBe(false)
    expect(rewrite.gates.includes('require_matching_review')).toBe(false)
    expect(rewrite.invoke.prompt).toContain('重写第')
    expect(rewrite.invoke.prompt).toContain('不要开书')
    const legacy = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(resolveContractVerb(legacy)).toBeNull()
  })
  test('write_continue instance is project auto_if_single oh_story_continue without chapter mounts', () => {
    const cont = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.continue')!
    expect(resolveContractVerb(cont)).toBe('write_continue')
    expect(validateInstanceAgainstTemplate(cont)).toEqual({ ok: true })
    expect(cont.commit.mode).toBe('auto_if_single')
    expect(cont.commit.source).toBe('oh_story_continue')
    expect(cont.gates).toEqual(['require_chapter_file', 'reject_outline_artifact', 'require_chapter_tracking'])
    expect(cont.projection.mounts).toContain('continue_window')
    expect(cont.projection.mounts.includes('current_chapter')).toBe(false)
    expect(cont.outputs[0].glob).toBe('正文/第*.md')
    expect(cont.invoke.prompt).toContain('续写第')
    expect(cont.invoke.prompt).toContain('不要开书')
  })
  test('adapt_pack meta satisfies template and has no chapter mounts', () => {
    const adaptPackMeta = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'mangaforge.adapt-pack.meta')!
    expect(validateInstanceAgainstTemplate(adaptPackMeta)).toEqual({ ok: true })
    expect(adaptPackMeta.projection.mounts.includes('current_chapter')).toBe(false)
  })
  test('instance commit mode must match the template commit_mode', () => {
    const expand = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.expand')!
    const auto = { ...expand, commit: { ...expand.commit, mode: 'auto_if_single' } }
    const result = validateInstanceAgainstTemplate(auto as any)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('commit.mode')
    const never = { ...expand, commit: { ...expand.commit, mode: 'never' } }
    expect(validateInstanceAgainstTemplate(never as any).ok).toBe(true)
  })
  test('deslop and review do not take require_chapter_tracking', () => {
    const deslop = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-deslop.file')!
    const review = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
    expect(deslop.gates.includes('require_chapter_tracking' as any)).toBe(false)
    expect(review.gates.includes('require_chapter_tracking' as any)).toBe(false)
  })
})
