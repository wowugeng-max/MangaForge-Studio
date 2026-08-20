import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadVerbDefaults, saveVerbDefaults } from './defaults'

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
})
