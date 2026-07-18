type AnyFn = (...args: any[]) => any

let storylineUsageByAnyTypeImpl: AnyFn = (_storylineContext: any = {}, _types: any[] = []) => []

export function bindAudienceQualityContractDeps(deps: {
  storylineUsageByAnyType?: AnyFn
} = {}) {
  if (deps.storylineUsageByAnyType) storylineUsageByAnyTypeImpl = deps.storylineUsageByAnyType
}

/** Kept for bind API compatibility; extended leaves import continuity-dialogue version. */
export function storylineUsageByAnyTypeBound(storylineContext: any = {}, types: any[] = []) {
  return storylineUsageByAnyTypeImpl(storylineContext, types)
}
