import { describe, expect, test } from 'bun:test'
import { summarizeAgentChainStatus } from './novel-agent-execution-routes'

describe('summarizeAgentChainStatus', () => {
  test('marks an all-failed agent chain as failed', () => {
    const summary = summarizeAgentChainStatus([
      { step: 'market-agent', success: false, error: 'model unsupported' },
      { step: 'world-agent', success: false, error: 'model unsupported' },
    ])

    expect(summary.status).toBe('failed')
    expect(summary.success_count).toBe(0)
    expect(summary.failed_count).toBe(2)
    expect(summary.error).toContain('market-agent')
  })

  test('marks a mixed agent chain as partial', () => {
    const summary = summarizeAgentChainStatus([
      { step: 'market-agent', success: true },
      { step: 'world-agent', success: false, error: 'timeout' },
    ])

    expect(summary.status).toBe('partial')
    expect(summary.success_count).toBe(1)
    expect(summary.failed_count).toBe(1)
  })

  test('marks a successful chain as success', () => {
    const summary = summarizeAgentChainStatus([
      { step: 'market-agent', success: true },
      { step: 'world-agent', success: true },
    ])

    expect(summary.status).toBe('success')
    expect(summary.error).toBe('')
  })
})
