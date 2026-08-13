import { describe, expect, test } from 'bun:test'
import { buildChapterHeaderStatus } from './chapter-header-status'

describe('buildChapterHeaderStatus', () => {
  test('状态行只含阶段/字数/保存点,无重复的已写未写', () => {
    const status = buildChapterHeaderStatus({
      phase: 'written_unchecked',
      phaseLabel: '已写待复检',
      wordCount: 3204,
      wordTarget: 4000,
      saveStatus: 'saved',
    })
    expect(status.phaseLabel).toBe('已写待复检')
    expect(status.phaseTone).toBe('blue')
    expect(status.wordLabel).toBe('3,204 / 4,000 字')
    expect(status.saveDot).toBe('saved')
  })

  test('无目标字数时只显示当前字数', () => {
    const status = buildChapterHeaderStatus({ phase: 'empty', phaseLabel: '未写', wordCount: 0 })
    expect(status.wordLabel).toBe('0 字')
  })

  test('阶段色调映射', () => {
    expect(buildChapterHeaderStatus({ phase: 'ready_next', phaseLabel: 'x' }).phaseTone).toBe('green')
    expect(buildChapterHeaderStatus({ phase: 'failed_admission', phaseLabel: 'x' }).phaseTone).toBe('red')
    expect(buildChapterHeaderStatus({ phase: 'blocked_materials', phaseLabel: 'x' }).phaseTone).toBe('red')
    expect(buildChapterHeaderStatus({ phase: 'needs_revision', phaseLabel: 'x' }).phaseTone).toBe('gold')
    expect(buildChapterHeaderStatus({ phase: 'needs_state_sync', phaseLabel: 'x' }).phaseTone).toBe('gold')
  })

  test('详情项聚合材料/队列/交稿,空值不产出', () => {
    const status = buildChapterHeaderStatus({
      phase: 'empty',
      phaseLabel: '未写',
      material: { score: 72, canGenerate: false, recommendations: ['补世界观', '补人物'] },
      queue: { readyCount: 3, blockedCount: 1, draftedCount: 0 },
      delivery: { statusLabel: '需复检' },
    })
    expect(status.detailItems.map(item => item.key)).toEqual(['material', 'queue-ready', 'queue-blocked', 'delivery'])
    expect(status.detailItems[0]).toMatchObject({ label: '材料 72%', tone: 'warning', tooltip: '补世界观；补人物' })
    expect(status.detailItems[1].label).toBe('可写 3')
    expect(status.detailItems[2].label).toBe('待补 1')
    expect(status.detailItems[3].label).toBe('交稿 需复检')
  })

  test('无任何详情来源时 detailItems 为空', () => {
    expect(buildChapterHeaderStatus({ phase: 'empty', phaseLabel: '未写' }).detailItems).toEqual([])
  })

  test('会话统计输出 sessionLabel,未提供则为空串', () => {
    const status = buildChapterHeaderStatus({
      phase: 'writing',
      phaseLabel: '写作中',
      session: { sessionAdded: 820, wordsPerHour: 2400 },
    })
    expect(status.sessionLabel).toBe('本次 +820 字 · 2,400 字/时')
    expect(buildChapterHeaderStatus({ phase: 'empty', phaseLabel: '未写' }).sessionLabel).toBe('')
  })
})
