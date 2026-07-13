export type NovelMutationTestEvent = {
  activeWorkspace: string
  phase: 'after_mutation_lock_acquired' | 'before_full_store_write'
  operation?: string
}

type NovelMutationTestHook = (event: NovelMutationTestEvent) => void | Promise<void>

let mutationTestHook: NovelMutationTestHook | null = null

export function setNovelMutationTestHook(hook: NovelMutationTestHook | null) {
  mutationTestHook = hook
}

export function getNovelMutationTestHook() {
  return mutationTestHook
}
