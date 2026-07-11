import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  buildCanonicalSurfaceIndex,
  scanCanonicalContinuityConflicts,
} from './canonical-continuity'
import { buildProsePromptContextSnapshot } from './prose-prompt-context'

describe('canonical continuity', () => {
  let mempalaceDir = ''
  let previousMempalaceDir: string | undefined

  beforeEach(() => {
    previousMempalaceDir = process.env.MEMPALACE_DIR
    mempalaceDir = mkdtempSync(join(tmpdir(), 'mangaforge-canonical-continuity-'))
    process.env.MEMPALACE_DIR = mempalaceDir
  })

  afterEach(() => {
    if (previousMempalaceDir === undefined) delete process.env.MEMPALACE_DIR
    else process.env.MEMPALACE_DIR = previousMempalaceDir
    rmSync(mempalaceDir, { recursive: true, force: true })
  })

  test('stabilizes a supported surface only after it appears in two distinct prior chapters', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 7, chapterText: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
        { chapter_no: 8, chapter_text: '临江市战略防卫局只在这一章被提到两次：临江市战略防卫局。' },
      ],
    })

    expect(index.stable_entities).toContainEqual({
      surface: '临江市第一人民医院',
      suffix: '第一人民医院',
      chapters: [2, 7],
      source: 'previous_chapters',
    })
    expect(index.stable_entities.some(item => item.surface === '临江市战略防卫局')).toBe(false)
  })

  test('accepts canon facts and setting entities as single-source stable names and keeps the index bounded', () => {
    const index = buildCanonicalSurfaceIndex({
      canon_facts: [{ fact: '临江市战略防卫局负责本地战略防务。', canonical_unique: true }],
      setting_entities: [
        { name: '东港制药厂' },
        ...Array.from({ length: 150 }, (_, index) => ({ name: `第${index}区制药厂` })),
      ],
    })

    expect(index.stable_entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ surface: '临江市战略防卫局', suffix: '战略防卫局', source: 'canon_fact:unique' }),
      expect.objectContaining({ surface: '东港制药厂', suffix: '制药厂', source: 'setting_entity' }),
    ]))
    expect(index.stable_entities.length).toBeLessThanOrEqual(24)
  })

  test('does not infer unconditional uniqueness from natural-language uses of unique', () => {
    const index = buildCanonicalSurfaceIndex({
      canon_facts: [
        '临江市战略防卫局不是唯一幸存者所在的机构。',
        '唯一幸存者曾路过临江市第一人民医院。',
      ],
    })

    expect(index.stable_entities.every(item => item.source === 'canon_fact')).toBe(true)
    expect(scanCanonicalContinuityConflicts('调令由江城市战略防卫局签发。', index)).toEqual([])
  })

  test('allows only an explicit structured canonical-unique flag to block without identity language', () => {
    const index = buildCanonicalSurfaceIndex({
      canon_facts: [{ fact: '临江市战略防卫局负责本地防务。', canonical_unique: true }],
    })

    expect(scanCanonicalContinuityConflicts('调令由江城市战略防卫局签发。', index)).toEqual([
      expect.objectContaining({ canonical: '临江市战略防卫局', observed: '江城市战略防卫局' }),
    ])
  })

  test('extracts a defense-bureau surface without swallowing syntactic lead words across chapters', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 1, chapter_text: '调令由江城市战略防卫局签发。' },
        { chapter_no: 2, chapter_text: '档案在江城市战略防卫局封存。' },
      ],
    })

    expect(index.stable_entities).toContainEqual(expect.objectContaining({
      surface: '江城市战略防卫局',
      chapters: [1, 2],
    }))
    expect(index.stable_entities.some(item => item.surface.includes('调令由') || item.surface.includes('档案在'))).toBe(false)
  })

  test('blocks the chapter-11 hospital substitution when the prose asserts it is the same hospital', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 4, chapter_text: '车最终停在【临江市第一人民医院】急诊入口。' },
        { chapter_no: 9, chapter_text: '临江市第一人民医院的旧住院楼仍留着封条。' },
      ],
    })
    const candidateExcerpt = [
      '【蓝星华夏国，江城市第一人民医院】',
      '【精神科副主任医师：林建国】',
      '江城市第一人民医院精神科。这正是他进入怪谈世界前在现实蓝星中待过的那家诡异医院，也是他抚平的体检单最下方抠出“001”猩红血字的地方。',
    ].join('\n')

    expect(scanCanonicalContinuityConflicts(candidateExcerpt, index)).toEqual([
      expect.objectContaining({
        key: 'canonical_proper_noun_conflict',
        canonical: '临江市第一人民医院',
        observed: '江城市第一人民医院',
        evidence: expect.stringContaining('这正是'),
        status: 'fail',
        severity: 'blocking',
      }),
    ])
  })

  test('does not confuse a second hospital or a newly introduced first hospital with the canonical one', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 1, chapter_text: '临江市第一人民医院接收了伤员。' },
        { chapter_no: 3, chapter_text: '临江市第一人民医院的院长封存了病历。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts('这就是江城市第二人民医院，和旧案没有关系。', index)).toEqual([])
    expect(scanCanonicalContinuityConflicts('他们抵达【江城市第一人民医院】，这是新设的调查点。', index)).toEqual([])
  })

  test('does not attach an unrelated identity assertion for another place in the same window', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '他们抵达江城市第一人民医院，这是新设的调查点。走廊尽头的旧楼正是档案馆。',
      index,
    )).toEqual([])
  })

  test('does not treat another hospital beside the observed hospital as a cross-sentence back-reference', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '他们抵达江城市第一人民医院。顾遥指向旁边楼：这就是另一家医院。',
      index,
    )).toEqual([])
  })

  test('does not treat a category comparison as a cross-sentence identity assertion', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '他们抵达江城市第一人民医院。这就是医院与档案馆的区别。',
      index,
    )).toEqual([])
  })

  test('does not attach a same-sentence assertion whose subject has shifted to a bus stop', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '他们抵达江城市第一人民医院，门前就是公交站。',
      index,
    )).toEqual([])
  })

  test('does not attach a same-sentence assertion about the building opposite the hospital', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '江城市第一人民医院对面就是档案馆。',
      index,
    )).toEqual([])
  })

  test('keeps a direct same-sentence back-reference to the observed hospital blocking', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '江城市第一人民医院正是档案里那家诡异医院。',
      index,
    )).toEqual([expect.objectContaining({ key: 'canonical_proper_noun_conflict' })])
  })

  test('supports an identity assertion immediately before the observed surface', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '这正是我们曾经到过的江城市第一人民医院。',
      index,
    )).toEqual([expect.objectContaining({
      key: 'canonical_proper_noun_conflict',
      observed: '江城市第一人民医院',
    })])
    expect(scanCanonicalContinuityConflicts(
      '这正是档案馆，旁边是江城市第一人民医院。',
      index,
    )).toEqual([])
  })

  test('does not let a preceding assertion jump from the hospital to its entrance bus stop', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '这正是我们曾经到过的江城市第一人民医院门前公交站。',
      index,
    )).toEqual([])
  })

  test('does not let a preceding assertion jump from the hospital to the archive beside it', () => {
    const index = buildCanonicalSurfaceIndex({
      previous_chapters: [
        { chapter_no: 2, chapter_text: '那是临江市第一人民医院的旧址。' },
        { chapter_no: 3, chapter_text: '江哲踩在了临江市第一人民医院大厅的旧石板上。' },
      ],
    })

    expect(scanCanonicalContinuityConflicts(
      '这正是江城市第一人民医院旁边的档案馆。',
      index,
    )).toEqual([])
  })

  test('blocks a direct conflict with an explicitly unique canon name without an identity phrase', () => {
    const index = buildCanonicalSurfaceIndex({
      canon_facts: [{ official_name: '临江市战略防卫局', is_unique: true }],
    })

    expect(scanCanonicalContinuityConflicts('调令由【江城市战略防卫局】签发。', index)).toEqual([
      expect.objectContaining({
        canonical: '临江市战略防卫局',
        observed: '江城市战略防卫局',
        status: 'fail',
      }),
    ])
  })

  test('carries only the bounded canonical index into prose prompt context', () => {
    const snapshot = buildProsePromptContextSnapshot({
      canonical_surface_index: {
        stable_entities: [{
          surface: '临江市第一人民医院',
          suffix: '第一人民医院',
          chapters: [1, 2],
          source: 'previous_chapters',
        }],
      },
      continuity: {
        previous_chapter: { ending_excerpt: '不应代替索引扩张成全部历史正文' },
      },
    })

    expect(snapshot.canonical_surface_index).toEqual(expect.objectContaining({
      stable_entities: [expect.objectContaining({ surface: '临江市第一人民医院' })],
    }))
  })

  test('keeps the same 24-entry bound in the generated index and prose prompt snapshot', () => {
    const index = buildCanonicalSurfaceIndex({
      setting_entities: Array.from({ length: 40 }, (_, item) => ({ name: `东港${item}制药厂` })),
    })
    const snapshot = buildProsePromptContextSnapshot({ canonical_surface_index: index })

    expect(index.stable_entities).toHaveLength(24)
    expect(snapshot.canonical_surface_index.stable_entities).toHaveLength(24)
  })
})
