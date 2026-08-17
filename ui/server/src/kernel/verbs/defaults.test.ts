import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadVerbDefaults, saveVerbDefaults } from './defaults'

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
})
