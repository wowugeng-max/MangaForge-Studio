import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BUILTIN_KERNEL_CONTRACTS } from './builtin'
import { validateKernelContract } from './schema'
import { deleteUserKernelContract, loadKernelContracts, saveUserKernelContract, seedBuiltinKernelContracts } from './store'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-contracts-')) }

describe('builtin contracts', () => {
  test('all seven builtins pass validation', () => {
    for (const contract of BUILTIN_KERNEL_CONTRACTS) {
      const result = validateKernelContract(contract)
      expect(result.ok).toBe(true)
    }
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')?.verb).toBe('review_chapter')
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-deslop.file')?.verb).toBe('deslop_chapter')
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-apply.surgical')?.verb).toBe('apply_review')
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')?.verb).toBeUndefined()
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.expand')?.verb).toBe('expand_outline')
    expect(BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.chapter')?.verb).toBe('write_chapter')
    expect(BUILTIN_KERNEL_CONTRACTS.map(c => c.id)).toEqual([
      'oh-story-core.story-review.full',
      'oh-story-core.story-deslop.file',
      'oh-story-core.story-apply.surgical',
      'oh-story-core.story-long-write.outline',
      'oh-story-core.story-long-write.open',
      'oh-story-core.story-long-write.expand',
      'oh-story-core.story-long-write.chapter',
    ])
  })
})

describe('contract store', () => {
  test('seed writes builtin files, load returns views with implemented flags', () => {
    const ws = tempWs()
    seedBuiltinKernelContracts(ws)
    expect(readdirSync(join(ws, '.mangaforge', 'kernel', 'contracts')).sort()).toEqual([
      'oh-story-core.story-apply.surgical.json',
      'oh-story-core.story-deslop.file.json',
      'oh-story-core.story-long-write.chapter.json',
      'oh-story-core.story-long-write.expand.json',
      'oh-story-core.story-long-write.open.json',
      'oh-story-core.story-long-write.outline.json',
      'oh-story-core.story-review.full.json',
    ])
    const { contracts, errors } = loadKernelContracts(ws)
    expect(errors).toEqual([])
    const review = contracts.find(c => c.id === 'oh-story-core.story-review.full')!
    expect(review.builtin).toBe(true)
    expect(review.verb).toBe('review_chapter')
    expect(review.implemented).toBe(true)
    const outline = contracts.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(outline.verb).toBeUndefined()
    expect(outline.implemented).toBe(false)
    const open = contracts.find(c => c.id === 'oh-story-core.story-long-write.open')!
    expect(open.verb).toBe('open_book')
    expect(open.implemented).toBe(true)
    const expand = contracts.find(c => c.id === 'oh-story-core.story-long-write.expand')!
    expect(expand.verb).toBe('expand_outline')
    expect(expand.implemented).toBe(true)
    const chapter = contracts.find(c => c.id === 'oh-story-core.story-long-write.chapter')!
    expect(chapter.verb).toBe('write_chapter')
    expect(chapter.implemented).toBe(true)
  })

  test('user contract with same artifact kind installs without code change (扩展 8.1)', () => {
    const ws = tempWs()
    const fake = {
      ...BUILTIN_KERNEL_CONTRACTS[0],
      id: 'fake-pack.fake-review.full',
      pack_id: 'fake-pack',
      skill_name: 'fake-review',
      variant: 'full',
      verb: 'review_chapter',
      invoke: { mention: '$fake-review', prompt: '报告写到 {{report_path}}' },
      outputs: [{ artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', binding: 'reviews.kernel_review', required: true }],
    }
    const saved = saveUserKernelContract(ws, fake)
    expect(saved.ok).toBe(true)
    const { contracts } = loadKernelContracts(ws)
    expect(contracts.some(c => c.id === 'fake-pack.fake-review.full' && !c.builtin && c.implemented)).toBe(true)
  })

  test('save rejects instances that fail template validation', () => {
    const ws = tempWs()
    const bad = {
      ...BUILTIN_KERNEL_CONTRACTS[0],
      id: 'fake-pack.fake-review.full',
      pack_id: 'fake-pack',
      skill_name: 'fake-review',
      variant: 'full',
      verb: 'review_chapter',
      invoke: { mention: '$fake-review', prompt: '报告写到 {{report_path}}' },
      gates: ['reject_solo_fallback'],
    }
    const saved = saveUserKernelContract(ws, bad)
    expect(saved.ok).toBe(false)
    if (!saved.ok) expect(saved.code).toBe('TEMPLATE_UNSATISFIED')
  })

  test('load reports TEMPLATE_UNSATISFIED for on-disk instances that miss template gates', () => {
    const ws = tempWs()
    seedBuiltinKernelContracts(ws)
    const dir = join(ws, '.mangaforge', 'kernel', 'contracts')
    writeFileSync(join(dir, 'fake-pack.fake-review.full.json'), JSON.stringify({
      ...BUILTIN_KERNEL_CONTRACTS[0],
      id: 'fake-pack.fake-review.full',
      pack_id: 'fake-pack',
      skill_name: 'fake-review',
      variant: 'full',
      verb: 'review_chapter',
      invoke: { mention: '$fake-review', prompt: '报告写到 {{report_path}}' },
      gates: ['reject_solo_fallback'],
    }, null, 2))
    const { contracts, errors } = loadKernelContracts(ws)
    expect(contracts.some(c => c.id === 'fake-pack.fake-review.full')).toBe(false)
    expect(errors.some(e => e.file === 'fake-pack.fake-review.full.json' && e.errors.some(msg => msg.startsWith('TEMPLATE_UNSATISFIED:')))).toBe(true)
  })

  test('overwriting builtin id -> CONTRACT_BUILTIN; invalid json -> CONTRACT_INVALID', () => {
    const ws = tempWs()
    const clash = saveUserKernelContract(ws, BUILTIN_KERNEL_CONTRACTS[0])
    expect(clash.ok).toBe(false)
    if (!clash.ok) expect(clash.code).toBe('CONTRACT_BUILTIN')
    const invalid = saveUserKernelContract(ws, { schema_version: 1, id: 'x' })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.code).toBe('CONTRACT_INVALID')
  })

  test('delete rejects builtin, removes user contract', () => {
    const ws = tempWs()
    seedBuiltinKernelContracts(ws)
    expect(deleteUserKernelContract(ws, 'oh-story-core.story-review.full')).toEqual({ ok: false, status: 400, code: 'CONTRACT_BUILTIN' })
    expect(deleteUserKernelContract(ws, 'nope.nope.nope')).toEqual({ ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' })
  })

  test('delete rejects path-traversal ids and leaves files outside contracts dir', () => {
    const ws = tempWs()
    mkdirSync(join(ws, '.mangaforge'), { recursive: true })
    const sentinel = join(ws, '.mangaforge', 'providers.json')
    writeFileSync(sentinel, '{"ok":true}')
    expect(deleteUserKernelContract(ws, '../../providers')).toEqual({ ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' })
    expect(existsSync(sentinel)).toBe(true)
  })
})
