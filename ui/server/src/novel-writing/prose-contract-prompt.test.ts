import { describe, expect, test } from 'bun:test'
import {
  compileProseContractPrompt,
  ProseCorePromptBudgetError,
} from './prose-contract-prompt'

const requiredSections = [
  { key: 'task', text: 'CORE_TASK' },
  { key: 'chapter', text: 'CORE_CHAPTER' },
  { key: 'output', text: 'CORE_OUTPUT' },
]

describe('prose contract prompt compiler', () => {
  test('keeps required sections and omits every unselected risk contract', () => {
    const result = compileProseContractPrompt({
      requiredSections,
      contractSections: [
        {
          key: 'dialogue',
          full: 'DIALOGUE_FULL',
          compact: 'DIALOGUE_COMPACT',
          reference: 'DIALOGUE_REFERENCE',
        },
        {
          key: 'quality_audit',
          full: 'QUALITY_FULL',
          compact: 'QUALITY_COMPACT',
          reference: 'QUALITY_REFERENCE',
        },
      ],
      director: {
        selected_contracts: [
          { key: 'dialogue_contract', detail_level: 'compact', reason: '对白风险' },
        ],
        prompt_budget_plan: {
          compact: ['dialogue_contract'],
          omit: ['quality_audit_contract'],
        },
      },
    })

    expect(result.prompt).toContain('CORE_TASK')
    expect(result.prompt).toContain('CORE_CHAPTER')
    expect(result.prompt).toContain('CORE_OUTPUT')
    expect(result.prompt).toContain('DIALOGUE_COMPACT')
    expect(result.prompt).not.toContain('DIALOGUE_FULL')
    expect(result.prompt).not.toContain('QUALITY_')
    expect(result.diagnostics.selected_contract_keys).toEqual(['dialogue'])
    expect(result.diagnostics.omitted_contract_keys).toContain('quality_audit')
    expect(result.diagnostics.prompt_chars).toBe(result.prompt.length)
  })

  test('downgrades optional sections but never truncates required sections', () => {
    const required = 'R'.repeat(70)
    const result = compileProseContractPrompt({
      maxChars: 120,
      requiredSections: [{ key: 'task', text: required }],
      contractSections: [{
        key: 'dialogue',
        full: 'F'.repeat(80),
        compact: 'C'.repeat(30),
        reference: 'DIALOGUE_REF',
      }],
      director: {
        selected_contracts: [{ key: 'dialogue', detail_level: 'full', reason: '对白风险' }],
      },
    })

    expect(result.prompt).toContain(required)
    expect(result.prompt).toContain('C'.repeat(30))
    expect(result.prompt).not.toContain('F'.repeat(80))
    expect(result.prompt.length).toBeLessThanOrEqual(120)
    expect(result.diagnostics.downgrades).toEqual([
      { key: 'dialogue', from: 'full', to: 'compact' },
    ])
  })

  test('fails when required sections alone exceed the budget', () => {
    let thrown: any = null
    try {
      compileProseContractPrompt({
        maxChars: 48_000,
        requiredSections: [{ key: 'chapter', text: '章'.repeat(48_001) }],
        contractSections: [],
        director: { selected_contracts: [] },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ProseCorePromptBudgetError)
    expect(thrown.code).toBe('PROSE_CORE_PROMPT_BUDGET_EXCEEDED')
    expect(thrown.diagnostics.required_chars).toBe(48_001)
    expect(thrown.diagnostics.budget_chars).toBe(48_000)
  })

  test('loads no more than four director-selected risk contracts', () => {
    const contractSections = Array.from({ length: 6 }, (_, index) => ({
      key: `risk_${index + 1}`,
      full: `FULL_${index + 1}`,
      compact: `COMPACT_${index + 1}`,
      reference: `REFERENCE_${index + 1}`,
    }))
    const result = compileProseContractPrompt({
      requiredSections,
      contractSections,
      director: {
        selected_contracts: contractSections.map(section => ({
          key: section.key,
          detail_level: 'full',
          reason: '测试风险',
        })),
      },
    })

    expect(result.diagnostics.selected_contract_keys).toHaveLength(4)
    expect(result.prompt).toContain('FULL_4')
    expect(result.prompt).not.toContain('FULL_5')
    expect(result.prompt).not.toContain('FULL_6')
  })
})
