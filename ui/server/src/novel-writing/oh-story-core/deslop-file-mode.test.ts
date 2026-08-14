import { expect, test } from 'bun:test'
import { parseDeslopAiGrade, requiredDeslopRounds } from './deslop-file-mode'

test('parseDeslopAiGrade reads the skill grade line', () => {
  expect(parseDeslopAiGrade('## AI味检测报告\n- AI味等级：中度\n')).toBe('中度')
  expect(parseDeslopAiGrade('AI味等级：重度')).toBe('重度')
  expect(parseDeslopAiGrade('没有等级')).toBe('')
})

test('requiredDeslopRounds follows the skill pass table', () => {
  expect(requiredDeslopRounds('轻度')).toBe(1)
  expect(requiredDeslopRounds('中度')).toBe(2)
  expect(requiredDeslopRounds('重度')).toBe(3)
  expect(requiredDeslopRounds('')).toBe(1)
})
