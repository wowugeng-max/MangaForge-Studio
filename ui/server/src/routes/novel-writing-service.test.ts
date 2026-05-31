import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  createNovelWritingService,
  normalizeSceneCardsPayload,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
} from './novel-writing-service'

describe('normalizeSceneCardsPayload', () => {
  test('converts target chapter outlines into fallback scene cards', () => {
    const sceneCards = normalizeSceneCardsPayload({
      master_outline: { title: '超人的规则怪谈世界' },
      chapter_outlines: [
        {
          chapter_no: 1,
          title: '双魂降临',
          summary: '李辰和林智同时醒来在诡异公寓中。',
          conflict: '初次面对禁止单独行动规则的考验',
          ending_hook: '广播响起：今晚零点前必须选定房间。',
        },
        {
          chapter_no: 2,
          title: '守则初读',
          summary: '两人找到公寓守则册。',
        },
      ],
    }, {
      chapter_target: {
        chapter_no: 1,
        title: '双魂降临',
      },
    })

    expect(sceneCards).toHaveLength(1)
    expect(sceneCards[0].scene_no).toBe(1)
    expect(sceneCards[0].title).toBe('双魂降临')
    expect(sceneCards[0].purpose).toContain('李辰和林智')
    expect(sceneCards[0].conflict).toContain('禁止单独行动')
    expect(sceneCards[0].turning_point).toContain('广播响起')
    expect(sceneCards[0].scene_type).toBe('investigation')
  })
})

describe('chapter prose word target', () => {
  test('defaults normal chapters to roughly 3000 Chinese characters', () => {
    const target = resolveChapterWordTarget({ length_target: 'epic' }, { chapter_no: 1 }, {})

    expect(target.mode).toBe('standard')
    expect(target.target).toBe(3000)
    expect(target.min).toBe(2800)
    expect(target.max).toBe(3500)
    expect(target.label).toContain('标准章')
  })

  test('injects long chapter target into paragraph prose prompt and raises token budget', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 12 }, { word_target_mode: 'long' })
    const service = createNovelWritingService({
      getProject: async () => null,
      production: {} as any,
      reference: {} as any,
    })

    const prompt = service.buildParagraphProseContext(
      { title: '测试长篇' },
      {
        chapter_target: {
          chapter_no: 12,
          title: '长章测试',
          summary: '主角进入核心冲突。',
          conflict: '必须正面解决一次重大危机。',
          ending_hook: '新的规则出现。',
          scene_cards: [],
          word_target: target,
        },
        style_lock: { chapter_word_range: target.rangeText },
      },
      null,
      { chapter_no: 12, title: '长章测试' },
    )

    expect(target.mode).toBe('long')
    expect(target.target).toBe(10000)
    expect(prompt).toContain('本章目标字数：约 10000 字')
    expect(prompt).toContain('可接受范围：9000-11000 字')
    expect(prompt).toContain('每个场景分配明确字数预算')
    expect(proseMaxTokensForWordTarget(target)).toBeGreaterThan(14000)
  })

  test('supports a manually edited chapter word target', () => {
    const target = resolveChapterWordTarget({}, { chapter_no: 8 }, { word_target_mode: 'custom', target_word_count: 5200 })

    expect(target.mode).toBe('custom')
    expect(target.target).toBe(5200)
    expect(target.min).toBe(4680)
    expect(target.max).toBe(5720)
    expect(target.rangeText).toBe('4680-5720 字')
  })
})

describe('chapter context word target source guards', () => {
  test('declares word target inside chapter context builder instead of writing bible builder', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-writing-service.ts'), 'utf8')
    const bibleStart = source.indexOf('const buildWritingBible =')
    const bibleEnd = source.indexOf('const hasMeaningfulWritingBible =', bibleStart)
    const contextStart = source.indexOf('const buildChapterContextPackage =')
    const basePackageStart = source.indexOf('const basePackage =', contextStart)
    const bibleBlock = source.slice(bibleStart, bibleEnd)
    const contextSetupBlock = source.slice(contextStart, basePackageStart)

    expect(bibleStart).toBeGreaterThanOrEqual(0)
    expect(contextStart).toBeGreaterThanOrEqual(0)
    expect(bibleBlock).not.toContain('resolveChapterWordTarget(project, chapter')
    expect(contextSetupBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, {})')
    expect(contextSetupBlock).toContain('const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }')
  })
})
