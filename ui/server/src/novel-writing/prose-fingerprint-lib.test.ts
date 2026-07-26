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
