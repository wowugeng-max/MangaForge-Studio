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
    const onDisk = JSON.parse(readFileSync(join(ws, '.mangaforge/kernel/verb-defaults.json'), 'utf8'))
    expect(onDisk.open_book).toEqual(['oh-story-core.story-long-write.open'])
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
    expect(loadVerbDefaults(ws).review_chapter).toBeUndefined()
  })
  test('root JSON array falls back to builtins', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-arr-'))
    writeDefaults(ws, '[]')
    expect(loadVerbDefaults(ws)).toEqual({
      review_chapter: ['oh-story-core.story-review.full'],
      apply_review: ['oh-story-core.story-apply.surgical'],
      deslop_chapter: ['oh-story-core.story-deslop.file'],
      open_book: ['oh-story-core.story-long-write.open'],
    })
  })
  test('keeps a valid array of contract ids', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-ok-'))
    writeDefaults(ws, JSON.stringify({
      review_chapter: ['my-pack.my-review.v1'],
    }))
    expect(loadVerbDefaults(ws).review_chapter).toEqual(['my-pack.my-review.v1'])
  })
})
