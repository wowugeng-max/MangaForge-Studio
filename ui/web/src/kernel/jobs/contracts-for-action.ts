import { CHAPTER_KERNEL_VERBS, type KernelJobAction } from './types'

export const DEFAULT_CHAPTER_CONTRACT_IDS: Record<KernelJobAction, string> = {
  review: 'oh-story-core.story-review.full',
  deslop: 'oh-story-core.story-deslop.file',
  apply: 'oh-story-core.story-apply.surgical',
}

export type KernelContractOption = {
  id: string
  label: string
  verb?: string
  implemented: boolean
}

export function contractsForAction(
  contracts: KernelContractOption[] | undefined,
  action: KernelJobAction,
): KernelContractOption[] {
  const verb = CHAPTER_KERNEL_VERBS[action]
  return (contracts || []).filter(item => item.implemented && item.verb === verb)
}

export function resolveContractIdsForCreate(
  selected: string[] | undefined,
  defaultId: string,
): string[] | undefined {
  const ids = [...new Set((selected || []).map(id => String(id || '')).filter(Boolean))].slice(0, 8)
  if (ids.length === 0) return undefined
  if (ids.length === 1 && ids[0] === defaultId) return undefined
  return ids
}
