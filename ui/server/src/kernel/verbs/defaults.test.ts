import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveUserKernelContract } from '../contracts/store'
import { loadVerbDefaults, saveVerbDefaults, validateVerbDefaultsPayload } from './defaults'

function userWriteChapterContract() {
  return {
    schema_version: 1,
    id: 'my-style.write-chapter.v1',
    pack_id: 'my-style',
    skill_name: 'write-chapter',
    variant: 'v1',
    verb: 'write_chapter',
    capability: 'rewrite',
    label: '风格写章',
    invoke: { mention: '$write-chapter', prompt: '写第 {{chapter_no}} 章。只改 {{scope_files}}。' },
    projection: { mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'user_brief'] },
    outputs: [{ artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true }],
    write_scope: ['正文/'],
    ignore: ['.story-review/'],
    gates: ['require_chapter_file', 'reject_outline_artifact'],
    commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'user_write' },
    sandbox: 'workspace-write',
    approval: 'never',
  }
}

function writeDefaults(ws: string, json: string): void {
  mkdirSync(join(ws, '.mangaforge/kernel'), { recursive: true })
  writeFileSync(join(ws, '.mangaforge/kernel/verb-defaults.json'), json)
}

describe('verb defaults', () => {
  test('seeds builtin defaults on first load and persists them', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-'))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['oh-story-core.story-review.full'])
    expect(defaults.apply_review).toEqual(['oh-story-core.story-apply.surgical'])
    expect(defaults.deslop_chapter).toEqual(['oh-story-core.story-deslop.file'])
    expect(defaults.open_book).toEqual(['oh-story-core.story-long-write.open'])
    expect(defaults.expand_outline).toEqual(['oh-story-core.story-long-write.expand'])
    expect(defaults.write_chapter).toEqual(['oh-story-core.story-long-write.chapter'])
    expect(defaults.rewrite_chapter).toEqual(['oh-story-core.story-long-write.rewrite'])
    expect(defaults.write_continue).toEqual(['oh-story-core.story-long-write.continue'])
    expect(defaults.adapt_pack).toEqual(['mangaforge.adapt-pack.meta'])
    const onDisk = JSON.parse(readFileSync(join(ws, '.mangaforge/kernel/verb-defaults.json'), 'utf8'))
    expect(onDisk.open_book).toEqual(['oh-story-core.story-long-write.open'])
    expect(onDisk.expand_outline).toEqual(['oh-story-core.story-long-write.expand'])
    expect(onDisk.write_chapter).toEqual(['oh-story-core.story-long-write.chapter'])
  })
  test('user edits survive reload (seed does not overwrite)', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-2-'))
    loadVerbDefaults(ws)
    saveVerbDefaults(ws, { ...loadVerbDefaults(ws), review_chapter: ['my-pack.my-review.v1'] })
    expect(loadVerbDefaults(ws).review_chapter).toEqual(['my-pack.my-review.v1'])
  })
  test('ignores string verb default so the key is missing', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-str-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: 'oh-story-core.story-review.full',
    }))
    expect(loadVerbDefaults(ws).review_chapter).toEqual(['oh-story-core.story-review.full'])
  })
  test('root JSON array falls back to builtins', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-arr-'))
    writeDefaults(ws, '[]')
    expect(loadVerbDefaults(ws)).toEqual({
      review_chapter: ['oh-story-core.story-review.full'],
      apply_review: ['oh-story-core.story-apply.surgical'],
      deslop_chapter: ['oh-story-core.story-deslop.file'],
      open_book: ['oh-story-core.story-long-write.open'],
      expand_outline: ['oh-story-core.story-long-write.expand'],
      write_chapter: ['oh-story-core.story-long-write.chapter'],
      rewrite_chapter: ['oh-story-core.story-long-write.rewrite'],
      write_continue: ['oh-story-core.story-long-write.continue'],
      adapt_pack: ['mangaforge.adapt-pack.meta'],
    })
  })
  test('keeps a valid array of contract ids', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-ok-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    expect(loadVerbDefaults(ws).review_chapter).toEqual(['my-pack.my-review.v1'])
  })
  test('fills missing expand_outline without overwriting user review_chapter', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-fill-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['my-pack.my-review.v1'])
    expect(defaults.expand_outline).toEqual(['oh-story-core.story-long-write.expand'])
  })
  test('fills missing write_chapter without overwriting user review_chapter', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-fill-write-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['my-pack.my-review.v1'])
    expect(defaults.write_chapter).toEqual(['oh-story-core.story-long-write.chapter'])
  })
  test('fills missing rewrite_chapter without overwriting user review_chapter', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-fill-rewrite-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['my-pack.my-review.v1'])
    expect(defaults.rewrite_chapter).toEqual(['oh-story-core.story-long-write.rewrite'])
  })
  test('fills missing write_continue without overwriting user review_chapter', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-fill-continue-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['my-pack.my-review.v1'])
    expect(defaults.write_continue).toEqual(['oh-story-core.story-long-write.continue'])
  })
  test('fills missing adapt_pack when disk only has review_chapter', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-fill-adapt-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['my-pack.my-review.v1'])
    expect(defaults.adapt_pack).toEqual(['mangaforge.adapt-pack.meta'])
  })
  test('preserves an empty review_chapter array for the missing-default fixture', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-empty-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: [],
    }))
    expect(loadVerbDefaults(ws).review_chapter).toEqual([])
  })
})

describe('validateVerbDefaultsPayload', () => {
  test('rejects non-object payloads', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-val-'))
    expect(validateVerbDefaultsPayload(ws, null)).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'defaults 必须是对象',
    })
    expect(validateVerbDefaultsPayload(ws, [])).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'defaults 必须是对象',
    })
    expect(validateVerbDefaultsPayload(ws, { defaults: [] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'defaults 必须是对象',
    })
  })

  test('rejects unknown verb and invalid id lists', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-val-ids-'))
    expect(validateVerbDefaultsPayload(ws, { nope: ['oh-story-core.story-long-write.chapter'] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: '未知动词 nope',
    })
    expect(validateVerbDefaultsPayload(ws, { write_chapter: [] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'write_chapter 需要 1..8 个合同 id',
    })
    expect(validateVerbDefaultsPayload(ws, {
      write_chapter: Array(9).fill('oh-story-core.story-long-write.chapter'),
    })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'write_chapter 需要 1..8 个合同 id',
    })
    expect(validateVerbDefaultsPayload(ws, { write_chapter: [''] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'write_chapter 需要 1..8 个合同 id',
    })
  })

  test('rejects missing contract, verb mismatch, and unimplemented outline', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-val-miss-'))
    expect(validateVerbDefaultsPayload(ws, { write_chapter: ['missing.id'] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'contract not found: missing.id',
    })
    expect(validateVerbDefaultsPayload(ws, { write_chapter: ['oh-story-core.story-review.full'] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'oh-story-core.story-review.full 不是 write_chapter',
    })
    expect(validateVerbDefaultsPayload(ws, { write_chapter: ['oh-story-core.story-long-write.outline'] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'oh-story-core.story-long-write.outline 不是 write_chapter',
    })
  })

  test('rejects adapt_pack bound to a user write_chapter contract', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-val-adapt-'))
    expect(saveUserKernelContract(ws, userWriteChapterContract()).ok).toBe(true)
    expect(validateVerbDefaultsPayload(ws, { adapt_pack: ['my-style.write-chapter.v1'] })).toEqual({
      ok: false, code: 'CONTRACT_INVALID', message: 'adapt_pack 默认必须是元合同',
    })
  })

  test('accepts write_chapter user contract as raw or wrapped defaults', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-val-ok-'))
    expect(saveUserKernelContract(ws, userWriteChapterContract()).ok).toBe(true)
    const expected = { ok: true as const, defaults: { write_chapter: ['my-style.write-chapter.v1'] } }
    expect(validateVerbDefaultsPayload(ws, { write_chapter: ['my-style.write-chapter.v1'] })).toEqual(expected)
    expect(validateVerbDefaultsPayload(ws, { defaults: { write_chapter: ['my-style.write-chapter.v1'] } })).toEqual(expected)
  })
})
