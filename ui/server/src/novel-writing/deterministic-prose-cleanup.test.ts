import { describe, expect, test } from 'bun:test'

import {
  buildDeslopGateDiagnostics,
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
} from './deterministic-prose-cleanup'

describe('deterministic prose cleanup helpers', () => {
  test('summarizes deslop gates in a stable A-G order', () => {
    const diagnostics = buildDeslopGateDiagnostics([
      { gate: 'A', pattern: '不是A，而是B', status: 'fail', evidence: '不是害怕，而是规则变了。', fix: '直接写事实。' },
      { gate: 'A', pattern: '一丝', status: 'warn', evidence: '眼中闪过一丝光。', fix: '改成动作。' },
      { gate: 'E', pattern: '对话腔调模板化', status: 'warn', evidence: '你要明白，这件事没那么简单。', fix: '补议程。' },
    ])

    expect(diagnostics.version).toBe('oh_story_deslop_gate_diagnostics_v1')
    expect(diagnostics.gates.map(item => item.gate).join('')).toBe('ABCDEFG')
    expect(diagnostics.total).toBe(3)
    expect(diagnostics.concern_gate_count).toBe(2)
    expect(diagnostics.gates.find(item => item.gate === 'A')?.status).toBe('fail')
    expect(diagnostics.gates.find(item => item.gate === 'E')?.evidence).toContain('你要明白')
  })

  test('builds deterministic cleanup reports from prose scanners', () => {
    const report = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头，眼中闪过一丝迟疑！！！')

    expect(report.status).toBe('warn')
    expect(report.risk_count).toBeGreaterThanOrEqual(4)
    expect(report.categories.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'prose_meta',
      'deslop',
      'punctuation_tone',
    ]))
    expect(report.priority_repair).toBe('优先清理工程词')
    expect(report.required_actions.join('｜')).toContain('角色当下能感知')
  })

  test('turns cleanup residuals into quality gate review issues', () => {
    const cleanup = buildDeterministicProseCleanupReport({
      id: 42,
      chapter_no: 3,
    }, '第三章 风起\n上一章的伏笔还没有结束……他缓缓抬头。')
    const review = buildQualityGateReviewWithDeterministicCleanup({
      passed: true,
      score: 92,
      issues: [],
      revised: true,
    }, cleanup)

    expect(review.needs_revision).toBe(true)
    expect(review.issues.map((item: any) => item.severity)).toContain('critical')
    expect(review.issues.map((item: any) => item.category)).toContain('format')
    expect(review.issues.map((item: any) => item.issue).join('｜')).toContain('确定性清理残留')
  })
})
