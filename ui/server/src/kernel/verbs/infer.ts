import type { KernelContract } from '../contracts/schema'

export const BUILTIN_VERB_BY_ID: Record<string, string> = {
  'oh-story-core.story-review.full': 'review_chapter',
  'oh-story-core.story-deslop.file': 'deslop_chapter',
  'oh-story-core.story-apply.surgical': 'apply_review',
  'oh-story-core.story-long-write.open': 'open_book',
}

export function resolveContractVerb(contract: Pick<KernelContract, 'id'> & { verb?: string }): string | null {
  return contract.verb || BUILTIN_VERB_BY_ID[contract.id] || null
}
