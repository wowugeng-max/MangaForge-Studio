import { describe, expect, test } from 'bun:test'
import {
  buildHumanFingerprintContract,
  createFingerprintSample,
  fingerprintDistance,
  measureProseFingerprintVector,
  scoreAgainstContract,
} from './prose-fingerprint-lib'

describe('prose fingerprint library', () => {
  test('measures vector fields', () => {
    const text = [
      '凌晨两点。',
      '门被推开。',
      '他先把小刘支到门外，再回头确认颈侧的温热。',
      '“时间怎么写？”',
      '他没立刻回答。',
    ].join('\n')
    const v = measureProseFingerprintVector(text)
    expect(v.para_count).toBeGreaterThan(3)
    expect(v.char_count).toBeGreaterThan(20)
    expect(v.cv_para).toBeGreaterThan(0)
  })

  test('counts 『』-opened paragraphs as dialogue paragraphs (#30)', () => {
    const kagi = [
      '『先别动。』',
      '『时间怎么写？』',
      '『按原样写。』',
      '他把笔放回桌上。',
    ].join('\n')
    const corner = kagi.replace(/『/g, '「').replace(/』/g, '」')
    expect(measureProseFingerprintVector(kagi).dialogue_para_ratio).toBe(0.75)
    expect(measureProseFingerprintVector(kagi).dialogue_para_ratio)
      .toBe(measureProseFingerprintVector(corner).dialogue_para_ratio)
  })

  test('subject opener ratio no longer hardcodes surname 林 (#28)', () => {
    // 非人名“林”起句不得计入主语起句
    const forest = [
      '林间的雾还没散。',
      '林场大门锁着。',
      '林荫道尽头停着一辆车。',
      '雨下了一夜。',
    ].join('\n')
    expect(measureProseFingerprintVector(forest).subject_ta_opener_ratio).toBe(0)
  })

  test('subject opener ratio counts explicit protagonist names when provided (#28)', () => {
    // 陈默 起句只有 2 次（低于自动推导阈值），只有显式传参才计入
    const paras = [
      '陈默推开门。',
      '陈默把伞收了。',
      '雨声很大。',
      '走廊尽头的灯闪了一下。',
      '“先别动。”',
      '水渍顺着桌沿往下淌。',
      '门轴响了一声。',
      '窗外没有人。',
      '伞架空着。',
      '灯又灭了。',
    ].join('\n')
    expect(measureProseFingerprintVector(paras).subject_ta_opener_ratio).toBe(0)
    expect(
      measureProseFingerprintVector(paras, { protagonist_names: ['陈默'] }).subject_ta_opener_ratio,
    ).toBe(0.2)
  })

  test('subject opener ratio auto-derives a recurring protagonist-name opener from the text (#28)', () => {
    const paras = [
      '陈默推开门。',
      '陈默把伞收了。',
      '陈默没接话。',
      '陈默看了眼窗外。',
      '陈默把灯关了。',
      '陈默坐回椅子上。',
      '雨声很大。',
      '“先别动。”',
      '走廊尽头的灯闪了一下。',
      '他叹了口气。',
    ].join('\n')
    const v = measureProseFingerprintVector(paras)
    // 6 个陈默起句 + 1 个“他”起句 → 0.7
    expect(v.subject_ta_opener_ratio).toBe(0.7)
  })

  test('builds contract and scores samples', () => {
    const human = createFingerprintSample({
      id: 'h1',
      label: 'human_webnovel',
      source: 'test',
      text: Array.from({ length: 40 }, (_, i) => (i % 5 === 0 ? `“先别动。”` : `他往前走了一步，看向门外的雨。`)).join('\n'),
    })
    const ai = createFingerprintSample({
      id: 'a1',
      label: 'ai_suspect',
      source: 'test',
      text: Array.from({ length: 40 }, () => '他看了一眼记录本上的空栏，又把目光挪开。').join('\n'),
    })
    const contract = buildHumanFingerprintContract([human, ai], 'test_contract')
    expect(contract.prompt_directives.length).toBeGreaterThan(2)
    const hs = scoreAgainstContract(human.vector, contract)
    const as = scoreAgainstContract(ai.vector, contract)
    expect(hs.total).toBe(as.total)
    expect(fingerprintDistance(human.vector, ai.vector)).toBeGreaterThan(0)
  })
})
