import { describe, expect, test } from 'bun:test'
import {
  DIALOGUE_PAUSE_WINDOW_VERSION,
  ensureDialoguePauseWindows,
  isShortDialogueParagraph,
  pickDualZoneParagraphTargets,
  scanDialoguePauseWindows,
} from './dialogue-pause-window'

describe('dialogue-pause-window scanner/ensure v1.6', () => {
  test('version is v1.6', () => {
    expect(DIALOGUE_PAUSE_WINDOW_VERSION).toBe('dialogue-pause-window-v1.6')
  })

  test('short cost dialogue with pause/object is dialogue_friction', () => {
    const friction = [
      '外头静了一拍。',
      '他指腹在纸边停了一下，先不往系统里写。',
      '“责任算谁的，说清楚。”',
      '“不是我的锅。”',
      '“那谁背？先别走。”',
      '“我先压一笔，别上报。”',
      '他嫌袖口黏，又把人往门口挡了半步。',
    ].join('\n\n')
    const pad = Array.from({ length: 8 }, (_, i) => `他继续检查第${i + 1}处，没有摩擦。`).join('\n\n')
    const scan = scanDialoguePauseWindows([pad, friction, pad].join('\n\n'))
    expect(scan.dialogue_friction_count).toBeGreaterThanOrEqual(1)
    expect(scan.windows.some((w) => w.kind === 'dialogue_friction')).toBe(true)
  })

  test('scan counts late incomplete-decision window', () => {
    const head = Array.from({ length: 12 }, (_, i) => `前段动作${i + 1}，没有停。`).join('\n\n')
    const late = [
      '他在窗口站了一会儿，把口袋里的纸条压了压，手掌从外面压进去，有点硌。',
      '他想去旧城看一眼。',
      '这个念头出来的时候他自己也愣了一下，然后想了想，觉得现在去不了，也不知道看什么。',
      '先等天亮。',
      '他从窗口转身，往回走，走到门口站了一下。',
      '然后抬手，推开了门。',
    ].join('\n\n')
    const scan = scanDialoguePauseWindows([head, late].join('\n\n'))
    expect(scan.incomplete_decision_count).toBeGreaterThanOrEqual(1)
  })

  test('scan counts mid-late non-blame segment_dialogue_break', () => {
    const head = Array.from({ length: 10 }, (_, i) => `前段动作${i + 1}，没有停。`).join('\n\n')
    const wall = [
      '对讲里忽然有人。',
      '“二号床呢？”',
      '“先别念了。”',
      '“知道了。”',
      '他按掉对讲，手还停在半空。',
    ].join('\n\n')
    const tail = Array.from({ length: 6 }, (_, i) => `后段动作${i + 1}，继续。`).join('\n\n')
    const scan = scanDialoguePauseWindows([head, wall, tail].join('\n\n'))
    expect(scan.segment_dialogue_break_count).toBeGreaterThanOrEqual(1)
    expect(scan.windows.some((w) => w.kind === 'segment_dialogue_break')).toBe(true)
    expect(scan.dialogue_friction_count).toBe(0)
  })

  test('ensure injects different kinds for dual function, not two blame dialogues', () => {
    const smooth = Array.from({ length: 20 }, (_, i) => {
      return `他检查了第${i + 1}处细节，把单子压好，继续往前走，没有对白摩擦。`
    }).join('\n\n')
    const out = ensureDialoguePauseWindows(smooth, { minWindows: 2 })
    expect(out.report.injected).toBeGreaterThanOrEqual(1)
    expect(out.report.kinds).toContain('dialogue_friction')
    expect(out.report.kinds).toContain('incomplete_decision')
    expect((out.text.match(/不是我的锅/g) || []).length).toBeLessThanOrEqual(1)
  })

  test('ensure on friction-only chapter injects incomplete late, not second blame set', () => {
    const friction = [
      '外头静了一拍。',
      '他指腹在纸边停了一下，先不往系统里写。',
      '“责任算谁的，说清楚。”',
      '“不是我的锅。”',
      '“那谁背？先别走。”',
      '“我先压一笔，别上报。”',
      '他嫌袖口黏，又把人往门口挡了半步。',
    ].join('\n\n')
    const mid = Array.from({ length: 24 }, (_, i) => `中段叙述${i + 1}，他继续检查现场细节，没有停。`).join('\n\n')
    const text = [friction, mid].join('\n\n')
    const out = ensureDialoguePauseWindows(text)
    expect(out.report.kinds.includes('incomplete_decision') || out.scan.incomplete_decision_count >= 1).toBe(true)
    expect((out.text.match(/不是我的锅/g) || []).length).toBe(1)
  })

  test('info Q&A short dialogue without cost friction is not a green window', () => {
    const info = [
      '他站在门口。',
      '"转悠的是谁？"',
      '"不知道。照片糊的。"',
      '他点了点头。',
    ].join('\n\n')
    const pad = Array.from({ length: 10 }, (_, i) => `他继续检查第${i + 1}处，没有摩擦。`).join('\n\n')
    const scan = scanDialoguePauseWindows([pad, info, pad].join('\n\n'))
    expect(scan.dialogue_friction_count).toBe(0)
  })

  test('ensure injects segment_dialogue_break (not second blame / incomplete monologue) when ending incomplete is too far', () => {
    const friction = [
      '外头静了一拍。',
      '他指腹在纸边停了一下，先不往系统里写。',
      '“责任算谁的，说清楚。”',
      '“不是我的锅。”',
      '“那谁背？先别走。”',
      '“我先压一笔，别上报。”',
      '他嫌袖口黏，又把人往门口挡了半步。',
    ].join('\n\n')
    const mid = Array.from({ length: 30 }, (_, i) => `中段独白推进第${i + 1}步，他把细节又看了一遍，没有停。`).join('\n\n')
    const ending = [
      '他想去那边看一眼。',
      '这个念头出来时他自己也愣了一下，觉得现在去不了，也不知道看什么。',
      '先等天亮。',
      '他走到门口站了一下，把口袋里的东西压了压。',
      '然后抬手，推开了门。',
    ].join('\n\n')
    const text = [friction, mid, ending].join('\n\n')
    const before = scanDialoguePauseWindows(text)
    expect(before.dialogue_friction_count).toBeGreaterThanOrEqual(1)
    expect(before.incomplete_decision_count).toBeGreaterThanOrEqual(1)
    const out = ensureDialoguePauseWindows(text)
    expect(out.report.injected).toBeGreaterThanOrEqual(1)
    expect(out.report.kinds).toContain('segment_dialogue_break')
    expect(out.report.kinds.includes('incomplete_decision')).toBe(false)
    expect(out.scan.segment_dialogue_break_count).toBeGreaterThanOrEqual(1)
    expect((out.text.match(/不是我的锅/g) || []).length).toBe(1)
    // non-blame wall markers
    expect(/二号床|还值班|你还在|血压呢|先别念|先别说|对讲/.test(out.text)).toBe(true)
    // no second blame pack markers unique to clone
    expect((out.text.match(/谁的责任，先讲清/g) || []).length).toBe(0)
  })

  test('ensure with injected=0 returns the source text untouched (no silent re-join)', () => {
    const filler = '天色慢慢暗下去，院里的杂草在风里晃来晃去，远处的路面还带着白天晒出来的热气。'
    const paras: string[] = [
      // early friction cluster (pos <= 0.55)
      '他把签字本合上，纸边翘了一下，他没急着抚平。',
      '“这锅谁背？”',
      '“别全推我。”',
    ]
    for (let k = 0; k < 11; k += 1) paras.push(filler)
    // non-blame short dialogue wall lands in the 0.60-0.62 skip edge of the 0.72 plan slot
    paras.push('“还值班呢？”', '“嗯。”', '他应了一声，手里的活没放下来。')
    for (let k = 0; k < 6; k += 1) paras.push(filler)
    // very late incomplete-decision band (earliest late incomplete >= 0.84)
    paras.push('他想了想，先等天亮，指腹在纸边按了一下，转身往回走。')
    paras.push('他回到值班室外面。')
    // Triple newlines: a paragraph re-join would silently normalize them to \n\n.
    const source = paras.join('\n\n\n')
    const out = ensureDialoguePauseWindows(source)
    expect(out.report.injected).toBe(0)
    expect(out.report.changed).toBe(false)
    expect(out.text).toBe(source)
  })

  test('ensure honors scan-detected late incomplete even when band midpoint is dragged below 0.68', () => {
    const filler = '天色慢慢暗下去，院里的杂草在风里晃来晃去，远处的路面还带着白天晒出来的热气。'
    const paras: string[] = [
      // early friction cluster so ensure only needs the late incomplete
      '他把签字本合上，纸边翘了一下，他没急着抚平。',
      '“这锅谁背？”',
      '“别全推我。”',
    ]
    for (let k = 0; k < 14; k += 1) paras.push(filler)
    // long paragraph right before the anchor drags the band(idx-1..idx+3) char midpoint below 0.68
    paras.push(filler.repeat(Math.ceil(150 / filler.length)).slice(0, 150))
    // anchor: unfinished close + halt + object, non-dialogue, gated by anchor midpoint >= 0.68
    paras.push('他想了想，先等天亮，指腹在纸边按了一下，转身往回走。')
    paras.push('他脚下的路比来时更黑一些。')
    paras.push('夜风把院里的草吹得伏了一层。')
    paras.push('他回到值班室外面。')
    for (let k = 0; k < 6; k += 1) paras.push(filler)
    const text = paras.join('\n\n')

    const scan = scanDialoguePauseWindows(text)
    expect(scan.incomplete_decision_count).toBeGreaterThanOrEqual(1)
    // repro premise: the stored band midpoint sits below ensure's old 0.68 filter
    expect(scan.windows.filter((w) => w.kind === 'incomplete_decision').every((w) => w.position < 0.68)).toBe(true)

    const out = ensureDialoguePauseWindows(text)
    // scan already found a real late incomplete window: no duplicate canned scaffold
    expect(out.report.kinds.includes('incomplete_decision')).toBe(false)
    expect(out.report.injected).toBe(0)
    expect(out.text).toBe(text)
  })

  test('pickDualZoneParagraphTargets returns early friction and late target', () => {
    const targets = pickDualZoneParagraphTargets(20, [])
    expect(targets.length).toBe(2)
    expect(targets[0].kind).toBe('dialogue_friction')
    expect(targets.some((t) => t.kind === 'incomplete_decision' || t.kind === 'segment_dialogue_break')).toBe(true)
  })

  test('isShortDialogueParagraph rejects long exposition quotes', () => {
    expect(isShortDialogueParagraph('“责任算谁的，说清楚。”')).toBe(true)
    expect(isShortDialogueParagraph('“这件事其实要从三个月前说起，当时医院里已经有人开始偷偷对照名单和转移路径。”')).toBe(false)
  })
})
