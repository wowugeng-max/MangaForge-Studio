type AnyFn = (...args: any[]) => any

let nextBatchBriefFromContextImpl: AnyFn = (_contextPackage: any = {}) => null
let normalizeSuspenseExpectationChainContractImpl: AnyFn = (value: any = {}) => value || {}

export function bindCraftTensionContractDeps(deps: {
  nextBatchBriefFromContext?: AnyFn
  normalizeSuspenseExpectationChainContract?: AnyFn
} = {}) {
  if (deps.nextBatchBriefFromContext) nextBatchBriefFromContextImpl = deps.nextBatchBriefFromContext
  if (deps.normalizeSuspenseExpectationChainContract) normalizeSuspenseExpectationChainContractImpl = deps.normalizeSuspenseExpectationChainContract
}

export function nextBatchBriefFromContext(contextPackage: any = {}) {
  return nextBatchBriefFromContextImpl(contextPackage)
}

export function normalizeSuspenseExpectationChainContract(value: any = {}) {
  return normalizeSuspenseExpectationChainContractImpl(value)
}
