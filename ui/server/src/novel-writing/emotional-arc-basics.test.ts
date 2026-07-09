import { describe, expect, test } from 'bun:test'
import {
  emotionalArcArray,
  emotionalArcHeuristicEvidence,
  normalizeEmotionalArcCheck,
} from './emotional-arc-basics'

describe('emotional arc basic sync checks', () => {
  test('normalizes emotional arc values into compact unique strings', () => {
    expect(emotionalArcArray(['压迫调动', '释放兑现'], ' 压迫调动 ', '', null)).toEqual([
      '压迫调动',
      '释放兑现',
    ])
  })

  test('confirms emotional arc anchors when planned items land in prose', () => {
    const check = normalizeEmotionalArcCheck(
      'emotion_formula',
      '情绪公式',
      ['压迫调动', '反证释放'],
      '当众压迫调动后，他拿出旧印章完成反证释放。',
      '补情绪公式',
      30,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['压迫调动', '反证释放']))
  })

  test('uses heuristic evidence when emotion formula signals are visible', () => {
    const evidence = emotionalArcHeuristicEvidence(
      'emotion_formula',
      '众人当众逼他认罪，他冷静拿出证据反证，章尾又露出下一条线索和新的期待。',
    )

    expect(evidence).toEqual(expect.arrayContaining([
      '压迫调动',
      '安全感信号',
      '反证释放',
      '新期待',
    ]))
  })

  test('confirms missed planned anchors through heuristic emotion formula evidence', () => {
    const check = normalizeEmotionalArcCheck(
      'emotion_formula',
      '情绪公式',
      ['调动 -> 安全感 -> 爽感 -> 新期待'],
      '公开审判时所有人逼他认罪，他没有争辩，只把旧印章按到桌上完成反证，最后留下下一份账册的线索。',
      '补情绪公式',
      50,
    )

    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['压迫调动', '安全感信号', '反证释放', '新期待']))
    expect(check?.missed_items).toEqual([])
  })

  test('warns when emotional arc evidence is missing', () => {
    const check = normalizeEmotionalArcCheck(
      'scene_emotion_steps',
      '场景情绪步骤',
      ['压迫调动', '释放兑现'],
      '这一段只是安静解释设定，没有压力、动作或结果变化。',
      '补场景情绪步骤',
      30,
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toEqual(expect.arrayContaining(['压迫调动', '释放兑现']))
    expect(check?.repair_instruction).toBe('补场景情绪步骤')
  })
})
