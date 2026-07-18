type AnyFn = (...args: any[]) => any

export let buildCharacterArcBriefFromContext: AnyFn = (..._args: any[]) => null
export let mergedContextChapterTargetPreferRuntime: AnyFn = (..._args: any[]) => null

export function bindPreDraftBriefDeps(deps: {
  buildCharacterArcBriefFromContext?: AnyFn
  mergedContextChapterTargetPreferRuntime?: AnyFn
} = {}) {
  if (deps.buildCharacterArcBriefFromContext) buildCharacterArcBriefFromContext = deps.buildCharacterArcBriefFromContext
  if (deps.mergedContextChapterTargetPreferRuntime) mergedContextChapterTargetPreferRuntime = deps.mergedContextChapterTargetPreferRuntime
}
