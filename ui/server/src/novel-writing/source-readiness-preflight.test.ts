import { describe, expect, test } from 'bun:test'

import {
  getChapterBlueprintForReadiness,
  legacyChapterOutlineForReadiness,
  missingChapterBlueprintSections,
  sourceReadinessMatchingRows,
  sourceReadinessReadyRowGenericEvidence,
  sourceReadinessReadyRowMissingEvidence,
} from './source-readiness-preflight'

describe('source readiness preflight helpers', () => {
  test('matches source-readiness rows by key or label', () => {
    const rows = [
      { key: 'previous_chapter', label: '上一章正文' },
      { key: 'style_sample', label: '文风样章' },
      { key: 'timeline_tracking', label: '追踪/时间线' },
    ]

    expect(sourceReadinessMatchingRows(rows, /上一章|previous[\s_-]*chapter/)).toEqual([rows[0]])
    expect(sourceReadinessMatchingRows(rows, /time_line|timeline|时间线/)).toEqual([rows[2]])
  })

  test('flags ready rows with missing or generic evidence', () => {
    expect(sourceReadinessReadyRowMissingEvidence([{ key: 'previous_chapter', status: 'ready' }])).toBe(true)
    expect(sourceReadinessReadyRowMissingEvidence([{ key: 'previous_chapter', ready: true, evidence: '第1章章尾：账册被夺走' }])).toBe(false)

    expect(sourceReadinessReadyRowGenericEvidence([{ status: 'ready', evidence: '已确认' }])).toBe(true)
    expect(sourceReadinessReadyRowGenericEvidence([{ status: 'ready', evidence: '读取第1章章尾：账册被夺走，第二章前300字必须承接追问' }])).toBe(false)
  })

  test('resolves runtime chapter blueprint before stale context aliases', () => {
    const runtimeBlueprint = { targetEmotion: '压迫感' }

    expect(getChapterBlueprintForReadiness({
      chapter_target: { chapter_blueprint: { target_emotion: '旧情绪' } },
      chapterTarget: { chapterBlueprint: runtimeBlueprint },
    })).toBe(runtimeBlueprint)
  })

  test('backfills a minimal legacy outline only when enough fields exist', () => {
    expect(legacyChapterOutlineForReadiness({
      chapterGoal: '追到账册来源',
      targetEmotion: '紧张',
      openingHook: '章首发现封条',
      endingHook: '章尾出现新名单',
    })).toEqual({
      target_emotion: '紧张',
      opening_hook: '章首发现封条',
      core_payoff: undefined,
      ending_contract: {
        next_chapter_pull: '章尾出现新名单',
      },
    })

    expect(legacyChapterOutlineForReadiness({ chapterGoal: '追到账册来源' })).toBeNull()
  })

  test('reports missing blueprint sections with snake and camel aliases', () => {
    expect(missingChapterBlueprintSections({
      targetEmotion: '紧张',
      openingHook: '章首发现封条',
      corePayoff: '确认账册来源',
      contentOutline: {
        cause: '封条异常',
        development: '执事阻拦',
        turn: '旧证据失效',
        climax: '主角改用残片',
        ending: '新名单出现',
      },
      plotLines: {
        mainLine: '查账册',
        logicLine: '封条到残片',
      },
      characterOrder: ['主角', '执事'],
      beatSequence: [{ functionTag: '铺垫' }],
      costAndReward: '丢矿票但拿到残片',
      endingContract: {
        nextChapterPull: '新名单提前生效',
      },
    })).toEqual([])

    expect(missingChapterBlueprintSections({ targetEmotion: '紧张' })).toEqual([
      '开篇钩子',
      '核心回报',
      '五段式内容概括',
      '多线推进',
      '人物出场顺序',
      '情节点功能标签',
      '代价/收益',
      '章尾承接',
    ])
  })
})
