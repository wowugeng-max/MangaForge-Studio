import { describe, expect, test } from 'bun:test'
import { buildOutlineWordBudget } from './outline-word-budget'

describe('outline word budget', () => {
  test('keeps explicit word_budget on object plot points', () => {
    const budget = buildOutlineWordBudget({
      chapter_word_target: 4200,
      plot_points: [
        { id: 'b1', label: '正面交锋', word_budget: 2100 },
        { id: 'b2', label: '余波清算', word_budget: 2100 },
      ],
    })
    expect(budget.points.map((item: any) => item.word_budget)).toEqual([2100, 2100])
    expect(budget.sum).toBe(4200)
    expect(budget.status).toBe('ok')
  })

  test('normalizes density budgets to the chapter target so status stays meaningful', () => {
    const budget = buildOutlineWordBudget({
      chapter_word_target: 4200,
      plot_points: [
        { id: 'b1', label: '开场', density_level: 'medium' },
        { id: 'b2', label: '试探', density_level: 'medium' },
        { id: 'b3', label: '高潮打脸', density_level: 'dense' },
        { id: 'b4', label: '余波', density_level: 'medium' },
        { id: 'b5', label: '钩子', density_level: 'medium' },
      ],
    })
    expect(budget.sum).toBe(4200)
    expect(budget.status).toBe('ok')
    // dense point keeps the largest proportional share after normalization
    const dense = budget.points.find((item: any) => item.density_level === 'dense')
    for (const point of budget.points) {
      if (point === dense) continue
      expect(Number(dense?.word_budget)).toBeGreaterThan(Number(point.word_budget))
    }
  })

  test('default fallback points also sum to the chapter target', () => {
    const budget = buildOutlineWordBudget({ chapter_word_target: 2000 })
    expect(budget.sum).toBe(2000)
    expect(budget.status).toBe('ok')
    expect(budget.points.length).toBe(3)
  })
})
