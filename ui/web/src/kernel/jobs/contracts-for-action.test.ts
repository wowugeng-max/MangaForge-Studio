import { describe, expect, test } from 'bun:test'
import { contractsForAction, resolveContractIdsForCreate } from './contracts-for-action'

const contracts = [
  { id: 'oh-story-core.story-review.full', label: '完整审稿', verb: 'review_chapter', implemented: true },
  { id: 'user.review.fast', label: '假审稿', verb: 'review_chapter', implemented: true },
  { id: 'oh-story-core.story-deslop.file', label: '去AI', verb: 'deslop_chapter', implemented: true },
  { id: 'pending.review', label: '未实现', verb: 'review_chapter', implemented: false },
]

describe('contractsForAction', () => {
  test('lists implemented contracts for the same verb only', () => {
    expect(contractsForAction(contracts, 'review').map(c => c.id)).toEqual([
      'oh-story-core.story-review.full',
      'user.review.fast',
    ])
  })
})

describe('resolveContractIdsForCreate', () => {
  test('omits contract_ids when only the default is selected', () => {
    expect(resolveContractIdsForCreate(['oh-story-core.story-review.full'], 'oh-story-core.story-review.full')).toBeUndefined()
  })
  test('sends up to 8 ids when competing', () => {
    expect(resolveContractIdsForCreate(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(resolveContractIdsForCreate(Array.from({ length: 9 }, (_, i) => `c${i}`), 'c0')).toHaveLength(8)
  })
})
