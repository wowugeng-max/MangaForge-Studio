import { describe, expect, test } from 'vitest'
import {
  HUMANIZE_RISK_SEGMENT_VERSION,
  assessChapterShrinkGuard,
  buildAigcRiskHeatmap,
  buildEndingPackagingHardBans,
  buildHighRiskSegmentRewritePrompt,
  mapWindowRewriteToParagraphs,
  scoreParagraphAigcRisk,
  selectHighRiskRewriteWindows,
  stitchParagraphCellsWithWindows,
  acceptRiskSegmentRewrite,
} from './humanize-risk-segment'
import { sanitizeR66ZhuqueKillers, sanitizeDetectorHostileStock } from './human-webnovel-resistance'
import { buildHumanizePassADirectives } from './humanize-dual-pass'

describe('humanize risk segment (novel-writer-master path)', () => {
  test('version + ending hard bans present', () => {
    expect(HUMANIZE_RISK_SEGMENT_VERSION).toContain('risk_segment')
    const bans = buildEndingPackagingHardBans().join('\n')
    expect(bans).toContain('防夹')
    expect(bans).toContain('顺延')
    expect(bans).toContain('不可逆')
  })

  test('scores ending packaging higher than plain action', () => {
    const plain = scoreParagraphAigcRisk('林序抬脚迈进门框。\n\n“先别推。”')
    const packed = scoreParagraphAigcRisk(
      '门缝正在以不可逆的速度收窄。十厘米，十五厘米，二十厘米……防夹感应器没有任何反应。轿厢内部那片阴暗的空间里，仿佛有什么东西正在顺着风口倒灌出来。',
    )
    expect(packed.score).toBeGreaterThan(plain.score)
    expect(packed.score).toBeGreaterThanOrEqual(3)
    expect(packed.reasons.some((r) => /cm_countdown|irreversible|anti_pinch|void_lore/.test(r))).toBe(true)
  })

  test('heatmap marks high-risk ending and selects windows only there', () => {
    const text = [
      '橡胶手套内里全是汗。',
      '林序捏着听诊器压头，指尖滑开半寸。',
      '“先别签。”他说。',
      '门缝正在以不可逆的速度收窄。十厘米，十五厘米，二十厘米……防夹感应器没有任何反应。电梯内部那片黑洞洞的空间里冷风倒灌。未完结，顺延下一位。',
    ].join('\n\n')
    const heat = buildAigcRiskHeatmap(text)
    expect(heat.high_risk_count).toBeGreaterThanOrEqual(1)
    const windows = selectHighRiskRewriteWindows(heat)
    expect(windows.length).toBeGreaterThanOrEqual(1)
    expect(windows[0].text).toContain('不可逆')
    // low-risk opening should not be in window indices as sole content
    expect(windows.every((w) => !w.text.startsWith('橡胶手套') || w.text.includes('不可逆'))).toBe(true)
  })

  test('zhuque ai segment hint boosts matched paragraphs', () => {
    const text = '他推开门。\n\n电梯灯乱闪，门缝越来越窄，冷风往外灌。\n\n“站住。”'
    const heat = buildAigcRiskHeatmap(text, {
      zhuqueSegments: [{
        label: 'ai',
        text: '电梯灯乱闪，门缝越来越窄，冷风往外灌。',
      }],
    })
    expect(heat.cells.length).toBeGreaterThanOrEqual(3)
    const mid = heat.cells.find((c) => c.text.includes('电梯灯'))
    expect(mid).toBeTruthy()
    expect(mid!.reasons.join(',')).toContain('zhuque_ai_segment')
    expect(mid!.score).toBeGreaterThanOrEqual(8)
    expect(mid!.high_risk).toBe(true)
  })

  test('segment rewrite prompt is subtractive and local', () => {
    const prompt = buildHighRiskSegmentRewritePrompt({
      window: { id: 'risk_3_4', text: '门缝越收越窄。', score: 8, reasons: ['cm_countdown'] },
      round: 1,
    })
    expect(prompt).toContain('高风险')
    expect(prompt).toContain('只改本窗口')
    expect(prompt).toContain('防夹')
    expect(prompt).not.toContain('人味增强')
  })

  test('stitch keeps low-risk paragraphs intact', () => {
    const text = 'A段。\n\nB高风险门缝不可逆收窄十厘米。\n\nC段。'
    const heat = buildAigcRiskHeatmap(text)
    const map = new Map<number, string>()
    // rewrite only middle if present
    const mid = heat.cells.find((c) => c.text.includes('高风险') || c.high_risk) || heat.cells[1]
    map.set(mid.index, 'B改写后。')
    const out = stitchParagraphCellsWithWindows(text, heat, map)
    expect(out).toContain('A段')
    expect(out).toContain('B改写后')
    expect(out).toContain('C段')
  })

  test('map window rewrite handles single and multi paragraph', () => {
    const single = mapWindowRewriteToParagraphs({ indices: [2], text: '旧' }, '新文', [])
    expect(single.get(2)).toBe('新文')
    const multi = mapWindowRewriteToParagraphs(
      { indices: [0, 1], text: 'a\n\nb' },
      '甲。\n\n乙。',
      [],
    )
    expect(multi.get(0)).toContain('甲')
    expect(multi.get(1)).toContain('乙')
  })

  test('acceptRiskSegmentRewrite rejects risk rise and over-shrink', () => {
    const before = '他抬脚迈进门框。'
    const worse = '门缝正在以不可逆的速度收窄。十厘米，十五厘米，二十厘米……防夹感应器没有任何反应。'
    const bad = acceptRiskSegmentRewrite({
      beforeWindow: before,
      afterWindow: worse,
      beforeChapter: before.repeat(20),
      afterChapter: worse.repeat(20),
    })
    expect(bad.accepted).toBe(false)

    const better = '他抬脚卡在门缝里，肩一沉，没再念那些厘米数。物业在背后骂了一句。他没松手。'
    const ok = acceptRiskSegmentRewrite({
      beforeWindow: worse,
      afterWindow: better,
      beforeChapter: `${worse}\n\n${'前段动作。'.repeat(40)}`,
      afterChapter: `${better}\n\n${'前段动作。'.repeat(40)}`,
    })
    expect(ok.accepted).toBe(true)
  })

  test('chapter shrink guard blocks R67-scale collapse', () => {
    const before = '字'.repeat(3000)
    const after = '字'.repeat(2000)
    const g = assessChapterShrinkGuard(before, after, 0.18)
    expect(g.ok).toBe(false)
  })

  test('scores R69 cabin compliance packaging high', () => {
    const packed = scoreParagraphAigcRisk(
      '轿厢墙壁贴满合规告示和安全注意事项。B2按键胶布撕掉一半，残留暗红色油漆渍。他挡在感应光幕前。金属牌下粘着半折叠的白色小纸条。',
    )
    expect(packed.score).toBeGreaterThanOrEqual(3)
  })

  test('sanitizeR66 strips ending packaging tokens', () => {
    const raw = '门缝正在以不可逆的速度收窄。十厘米，十五厘米，二十厘米……防夹感应器没有任何反应。未完结，顺延下一位。石灰味的冷风。'
    const out = sanitizeR66ZhuqueKillers(raw)
    expect(out).not.toContain('不可逆的速度收窄')
    expect(out).not.toContain('十厘米')
    expect(out).not.toContain('防夹感应器')
    expect(out).not.toContain('顺延下一位')
    const stock = sanitizeDetectorHostileStock(raw)
    expect(stock).not.toContain('防夹感应器')
  })

  test('pass A directives include ending packaging bans', () => {
    const joined = buildHumanizePassADirectives().join('\n')
    expect(joined).toContain('A5j')
    expect(joined).toContain('A5k')
  })

  test('scores mid human-deficit smooth narrative and promotes windows', () => {
    const paras = [
      '橡胶手套内里全是汗。',
      '“先别签。”他说。',
      '林序把单子压在夹子下面，目光扫过走廊尽头的推车。',
      '他走过去，检查了一遍读数，又看了看门缝外的灯。',
      '走廊里有人低声说话，脚步从另一头传来又远去。',
      '他把笔帽咬住，又松开，纸页边起了一点毛刺。',
      '“这责任算谁的？”有人在门口问。',
      '门缝正在以不可逆的速度收窄。十厘米，十五厘米。',
    ]
    // build a longer mid stretch of smooth narrative without private noise
    const mid = Array.from({ length: 12 }, (_, i) => `他继续往前走，确认了一下第${i + 1}处细节，没有多说。`)
    const text = [...paras.slice(0, 2), ...mid, ...paras.slice(2)].join('\n\n')
    const heat = buildAigcRiskHeatmap(text)
    const humanCells = heat.cells.filter((c) => (c.reasons || []).some((r) => String(r).includes('human_deficit')))
    expect(humanCells.length).toBeGreaterThanOrEqual(1)
    const windows = selectHighRiskRewriteWindows(heat)
    expect(windows.some((w) => (w.reasons || []).some((r) => String(r).includes('human_deficit') || r === 'promoted_human_deficit') || /继续往前走/.test(w.text))).toBe(true)
  })

  test('human-positive rewrite prompt is additive not subtractive', () => {
    const prompt = buildHighRiskSegmentRewritePrompt({
      window: { id: 'risk_5_6', text: '他继续检查，没有多说。', score: 3, reasons: ['human_deficit'] },
      round: 1,
    })
    expect(prompt).toContain('human_positive')
    expect(prompt).toContain('私心噪声')
    expect(prompt).toContain('当面摩擦')
  })

  test('acceptRiskSegmentRewrite allows expand for human_deficit gain', () => {
    const before = '他继续检查，没有多说。'
    const after = '他嫌这事麻烦，先不往系统里写。\n\n“这责任算谁的？”\n\n他没松手，纸角被捏出毛刺。'
    const ok = acceptRiskSegmentRewrite({
      beforeWindow: before,
      afterWindow: after,
      beforeChapter: `${before}\n\n${'前段。'.repeat(50)}`,
      afterChapter: `${after}\n\n${'前段。'.repeat(50)}`,
      reasons: ['human_deficit'],
    })
    expect(ok.accepted).toBe(true)
  })

})

  test('scores process-smooth he-chain and early-mid priority as human deficit', () => {
    const pad = Array.from({ length: 4 }, (_, i) => `开场物件${i + 1}。`).join('\n\n')
    const smooth = [
      '他走过去，确认了一下读数，没有多说。',
      '他继续往前走，把单子压在夹子下面，又看了看门缝外的灯。',
      '他检查完，转身准备离开，脚步没有停。',
    ].join('\n\n')
    const tail = '门缝正在以不可逆的速度收窄。十厘米，十五厘米。'
    const text = [pad, smooth, tail].join('\n\n')
    const heat = buildAigcRiskHeatmap(text)
    const deficit = heat.cells.filter((c) => (c.reasons || []).some((r) => String(r).includes('human_deficit') || r === 'process_smooth_he_chain' || r === 'early_mid_smooth_priority'))
    expect(deficit.length).toBeGreaterThanOrEqual(1)
    expect(heat.cells.some((c) => (c.reasons || []).includes('process_smooth_he_chain') || (c.reasons || []).includes('human_deficit'))).toBe(true)
  })

  test('human-positive prompt requires dialogue-pause window recipe', () => {
    const prompt = buildHighRiskSegmentRewritePrompt({
      window: { id: 'risk_2_2', text: '他继续检查，没有多说。', score: 4, reasons: ['human_deficit', 'process_smooth_he_chain'] },
      round: 1,
    })
    expect(prompt).toContain('半拍停顿对白窗')
    expect(prompt).toContain('流程顺滑')
  })

  test('R76 prompt directives include V5 green dialogue-pause contract', async () => {
    const { buildR76PromptDirectives } = await import('./r76-zhuque-stack')
    const joined = buildR76PromptDirectives().join('\n')
    expect(joined).toContain('半拍停顿对白窗')
    expect(joined).toContain('禁流程顺滑腔')
  })
