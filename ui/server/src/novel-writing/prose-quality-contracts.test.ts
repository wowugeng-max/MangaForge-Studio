import { describe, expect, test } from 'bun:test'
import {
  compactDeliveryRiskCarryOverText,
  getChapterLaunchGateBlocker,
  selectUsableRevisionText,
  shouldRunSynchronousReadabilityReview,
} from './prose-quality-contracts'
import {
  chapter10HandoffFixture,
  chapterScaleText,
} from './fixtures/chapter-10-11-handoff'

describe('prose quality contracts', () => {
  test('defers auxiliary readability review unless explicitly requested', () => {
    expect(shouldRunSynchronousReadabilityReview()).toBe(false)
    expect(shouldRunSynchronousReadabilityReview({ auxiliary_review_mode: 'deferred' })).toBe(false)
    expect(shouldRunSynchronousReadabilityReview({ run_readability_review: true })).toBe(true)
    expect(shouldRunSynchronousReadabilityReview({ auxiliary_review_mode: 'sync' })).toBe(true)
    expect(shouldRunSynchronousReadabilityReview({}, {
      reference_config: { quality_pipeline: { run_readability_review: true } },
    })).toBe(true)
  })

  test('blocks prose generation when chapter launch gate has hard failures', () => {
    const blocker = getChapterLaunchGateBlocker({
      status: 'ready',
      signals: [
        { key: 'reader_promise', label: '读者承诺', status: 'ok', detail: '承诺清晰。' },
        { key: 'ending_hook', label: '章末钩子', status: 'blocked', reason: '章末钩子为空，不能开写。' },
      ],
    })

    expect(blocker).toMatchObject({
      code: 'PROSE_LAUNCH_GATE_BLOCKED',
      label: '开写门禁未通过',
    })
    expect(blocker?.blocked_checks.map(item => item.key)).toContain('ending_hook')
    expect(blocker?.summary).toContain('章末钩子')
  })

  test('allows warning-only chapter launch gate to enter draft repair loop', () => {
    const blocker = getChapterLaunchGateBlocker({
      status: 'warn',
      summary: '本章钩子偏弱，但已有可写场景卡。',
      signals: [
        { key: 'reader_promise', label: '读者承诺', status: 'warn', detail: '需要在前300字强化。' },
      ],
    })

    expect(blocker).toBeNull()
  })

  test('ignores stale write-preparation launch blocks when live write prep is ready', () => {
    const blocker = getChapterLaunchGateBlocker({
      status: 'blocked',
      summary: '写前准备：来源缺口：串行连续性/状态机',
      signals: [
        {
          key: 'write_preparation',
          label: '写前准备',
          status: 'block',
          reason: '来源缺口：串行连续性/状态机｜状态=missing｜状态机只更新到第10章。',
        },
        { key: 'ending_hook', label: '章末钩子', status: 'ok', reason: '已有钩子' },
      ],
    }, {
      writePreparationBrief: { readiness_status: 'ready', source_gaps: [] },
    })

    expect(blocker).toBeNull()
  })

  test('keeps hard non-write-prep launch blocks even when write prep is ready', () => {
    const blocker = getChapterLaunchGateBlocker({
      status: 'blocked',
      signals: [
        {
          key: 'write_preparation',
          label: '写前准备',
          status: 'block',
          reason: '来源缺口：状态机',
        },
        {
          key: 'ending_hook',
          label: '章末钩子',
          status: 'blocked',
          reason: '章末钩子为空，不能开写。',
        },
      ],
    }, {
      writePreparationBrief: { readiness_status: 'ready' },
    })

    expect(blocker?.blocked_checks.map(item => item.key)).toEqual(['ending_hook'])
    expect(blocker?.summary).toContain('章末钩子')
  })

  test('rejects tiny self-review final_text so it cannot overwrite full prose', () => {
    const currentText = [
      '第八章 会长私印',
      '',
      '门槛白线往后退了一寸，玻璃门里的灯同时熄灭。',
      '',
      '李超没有急着动手。他先把那枚私印按在掌心，听见印面下面传来第二个人的呼吸。',
    ].join('\n') + '现场动作。'.repeat(480)

    const selected = selectUsableRevisionText(currentText, {
      revised: true,
      final_text: '已生成修订稿。',
      revision: null,
    })

    expect(selected.accepted).toBe(false)
    expect(selected.text).toBe(currentText)
    expect(selected.reason).toContain('过短')
  })

  test('accepts a complete self-review final_text when it preserves prose scale', () => {
    const currentText = '正文动作。'.repeat(900)
    const revisedText = `${currentText}\n\n章尾多出新的规则脚印。`

    const selected = selectUsableRevisionText(currentText, {
      revised: true,
      final_text: revisedText,
      revision: {
        revision_receipts: [
          { changed_evidence: '章尾多出新的规则脚印。' },
        ],
      },
    })

    expect(selected.accepted).toBe(true)
    expect(selected.text).toBe(revisedText)
    expect(selected.reason).toBe('')
  })

  test('strips engineering appendix before accepting self-review final_text', () => {
    const currentText = '正文动作。'.repeat(200)
    const revisedText = [
      currentText,
      '',
      '章尾多出新的规则脚印。',
      '',
      '---',
      '',
      '### oh_story_delivery_receipts',
      '- **target_emotion**: 已兑现。',
    ].join('\n')

    const selected = selectUsableRevisionText(currentText, {
      revised: true,
      final_text: revisedText,
    })

    expect(selected.accepted).toBe(true)
    expect(selected.text).toContain('章尾多出新的规则脚印。')
    expect(selected.text).not.toContain('oh_story_delivery_receipts')
    expect(selected.text).not.toContain('target_emotion')
  })

  test('strict revision selection rejects an engineering appendix', () => {
    const currentText = '江澈抬手撞开封锁线。'.repeat(180)
    const selected = selectUsableRevisionText(currentText, {
      final_text: [
        `${currentText}\n\n追兵的频道突然传出熟人的声音。`,
        '---',
        '### revision_receipts',
        '- agency: 已修复',
      ].join('\n'),
    }, { chapterNo: 10, blockingFindings: [] })

    expect(selected.accepted).toBe(false)
    expect(selected.text).toBe(currentText)
    expect(selected.reason).toContain('工程附录')
  })

  test('strict revision selection rejects continuous non-Chinese prose', () => {
    const currentText = '江澈撞开封锁线，追兵同时后撤。'.repeat(160)
    const englishParagraph = 'The protagonist waits while every surrounding officer explains the entire situation before another person resolves the central conflict without any visible choice or consequence. '
    const selected = selectUsableRevisionText(currentText, {
      final_text: englishParagraph.repeat(35),
    }, { chapterNo: 10, blockingFindings: [] })

    expect(selected.accepted).toBe(false)
    expect(selected.reason).toContain('非中文')
  })

  test('strict revision selection rejects another chapter boundary', () => {
    const currentText = '江澈撞开封锁线，追兵同时后撤。'.repeat(160)
    const selected = selectUsableRevisionText(currentText, {
      final_text: `第十一章 新的追捕\n\n${currentText}`,
    }, { chapterNo: 10, blockingFindings: [] })

    expect(selected.accepted).toBe(false)
    expect(selected.reason).toContain('其他章节')
  })

  test('strict revision selection rejects truncated output', () => {
    const currentText = '江澈撞开封锁线，追兵同时后撤。'.repeat(160)
    const selected = selectUsableRevisionText(currentText, {
      final_text: `${currentText}\n\n\`\`\`json\n{"unfinished": true`,
    }, { chapterNo: 10, blockingFindings: [] })

    expect(selected.accepted).toBe(false)
    expect(selected.reason).toContain('截断')
  })

  test('strict revision selection rejects a draft that leaves every blocking evidence unchanged', () => {
    const evidence = '江澈站在包围圈里等待。'
    const currentText = `${evidence}${'追兵没有变化。'.repeat(180)}`
    const selected = selectUsableRevisionText(currentText, {
      final_text: `${currentText}\n\n风又吹了一次。`,
    }, {
      chapterNo: 10,
      blockingFindings: [{ key: 'agency', evidence }],
    })

    expect(selected.accepted).toBe(false)
    expect(selected.reason).toContain('没有改变')
  })

  test('strict revision selection accepts a complete draft with changed blocking evidence', () => {
    const evidence = '江澈站在包围圈里等待。'
    const currentText = `${evidence}${'追兵继续收紧包围。'.repeat(180)}`
    const revisedText = `${'江澈踏碎路面，借飞石逼退第一排追兵。'.repeat(180)}\n\n通讯器里响起熟人的声音。`
    const selected = selectUsableRevisionText(currentText, {
      final_text: revisedText,
    }, {
      chapterNo: 10,
      blockingFindings: [{ key: 'agency', evidence }],
    })

    expect(selected.accepted).toBe(true)
    expect(selected.text).toBe(revisedText)
  })

  for (const candidateStage of ['editor', 'meme_polish', 'quality_revision']) {
    test(`rejects a ${candidateStage} candidate that drops the real chapter 10 handoff without a bridge`, () => {
      const currentText = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
      const disconnectedCandidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)

      const selected = selectUsableRevisionText(currentText, {
        final_text: disconnectedCandidate,
      }, {
        chapterNo: 11,
        blockingFindings: [],
        candidateStage,
        previousChapterTail: chapter10HandoffFixture.previousChapterTail,
        requiredHandoffAnchors: chapter10HandoffFixture.requiredAnchors,
      } as any)

      expect(selected.accepted).toBe(false)
      expect(selected.text).toBe(currentText)
      expect(selected.reason).toContain('承接')
    })
  }

  test('compacts recursive delivery-risk receipt noise into actionable prose tasks', () => {
    const text = compactDeliveryRiskCarryOverText(
      '修复：缺少 delivery_risk_receipts；模型自检未逐项输出 next_chapter_quality_plan_receipts；复核承接：前300字用带血腰牌直接引出阵堂旧案，中段把账册缺页变成现场阻碍。',
    )

    expect(text).toContain('前300字用带血腰牌直接引出阵堂旧案')
    expect(text).toContain('中段把账册缺页变成现场阻碍')
    expect(text).not.toContain('delivery_risk_receipts')
    expect(text).not.toContain('模型自检未逐项输出')
  })
})
