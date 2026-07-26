import { describe, expect, test } from 'bun:test'
import {
  buildResistanceAdmissionFromReport,
  buildResistanceAdmissionHardFailures,
  evaluateHumanWebnovelResistance,
  evaluateResistanceAdmission,
} from './human-webnovel-resistance'

const CLEAN_PROSE = [
  '他伸手把门推开一道缝。',
  '“先别动。”他把手电递过去。',
  '铁皮柜发出闷响，灰落在袖口上。',
  '他把纸片按住，没让风掀走。',
].join('\n\n')

describe('resistance admission shares one report', () => {
  test('evaluateResistanceAdmission returns both the report and the admission failures', () => {
    const result = evaluateResistanceAdmission(CLEAN_PROSE)
    expect(result.report.version).toBe('human_webnovel_resistance_v1')
    expect(result.report.contract_score).toBeTruthy()
    expect(Array.isArray(result.hard_failures)).toBe(true)
  })

  test('buildResistanceAdmissionFromReport matches the legacy text-based helper', () => {
    const report = evaluateHumanWebnovelResistance(CLEAN_PROSE)
    const fromReport = buildResistanceAdmissionFromReport(report).map((item) => item.code).sort()
    const legacy = buildResistanceAdmissionHardFailures(CLEAN_PROSE).map((item) => item.code).sort()
    expect(fromReport).toEqual(legacy)
  })

  test('report exposes a contract score shape the score recorder can consume', () => {
    const { report } = evaluateResistanceAdmission(CLEAN_PROSE)
    expect(typeof report.contract_score?.pass).toBe('number')
    expect(Array.isArray(report.contract_score?.checks)).toBe(true)
  })
})
