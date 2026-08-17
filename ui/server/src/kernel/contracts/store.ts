import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { kernelContractsDir } from '../paths'
import { IMPLEMENTED_VERBS } from '../verbs/registry'
import { resolveContractVerb } from '../verbs/infer'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'
import { BUILTIN_KERNEL_CONTRACTS, isBuiltinKernelContractId } from './builtin'
import { CONTRACT_ID_PATTERN, validateKernelContract, type KernelContract } from './schema'

export type KernelContractView = KernelContract & { builtin: boolean; implemented: boolean }

function toView(contract: KernelContract): KernelContractView {
  const verb = resolveContractVerb(contract)
  return {
    ...contract,
    verb: verb || undefined,
    builtin: isBuiltinKernelContractId(contract.id),
    implemented: !!verb && (IMPLEMENTED_VERBS as readonly string[]).includes(verb),
  }
}

export function seedBuiltinKernelContracts(activeWorkspace: string) {
  const dir = kernelContractsDir(activeWorkspace)
  mkdirSync(dir, { recursive: true })
  for (const contract of BUILTIN_KERNEL_CONTRACTS) {
    writeFileSync(join(dir, `${contract.id}.json`), JSON.stringify(contract, null, 2))
  }
}

export function loadKernelContracts(activeWorkspace: string): {
  contracts: KernelContractView[]
  errors: Array<{ file: string; errors: string[] }>
} {
  seedBuiltinKernelContracts(activeWorkspace)
  const dir = kernelContractsDir(activeWorkspace)
  const contracts: KernelContractView[] = []
  const errors: Array<{ file: string; errors: string[] }> = []
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'))
      const result = validateKernelContract(parsed)
      if (result.ok) {
        const templateCheck = validateInstanceAgainstTemplate(result.contract)
        if (templateCheck.ok) contracts.push(toView(result.contract))
        else errors.push({ file, errors: templateCheck.errors.map(e => `TEMPLATE_UNSATISFIED: ${e}`) })
      } else errors.push({ file, errors: result.errors })
    } catch (error: any) {
      errors.push({ file, errors: [String(error?.message || error)] })
    }
  }
  return { contracts, errors }
}

export function saveUserKernelContract(activeWorkspace: string, input: unknown):
  | { ok: true; contract: KernelContractView }
  | { ok: false; status: 400; code: 'CONTRACT_INVALID' | 'CONTRACT_BUILTIN' | 'TEMPLATE_UNSATISFIED'; errors?: string[] } {
  const result = validateKernelContract(input)
  if (!result.ok) return { ok: false, status: 400, code: 'CONTRACT_INVALID', errors: result.errors }
  if (isBuiltinKernelContractId(result.contract.id)) return { ok: false, status: 400, code: 'CONTRACT_BUILTIN' }
  const templateCheck = validateInstanceAgainstTemplate(result.contract)
  if (!templateCheck.ok) return { ok: false, status: 400, code: 'TEMPLATE_UNSATISFIED', errors: templateCheck.errors }
  const dir = kernelContractsDir(activeWorkspace)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${result.contract.id}.json`), JSON.stringify(result.contract, null, 2))
  return { ok: true, contract: toView(result.contract) }
}

export function deleteUserKernelContract(activeWorkspace: string, id: string):
  | { ok: true }
  | { ok: false; status: 400 | 404; code: string } {
  if (!CONTRACT_ID_PATTERN.test(id)) return { ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' }
  if (isBuiltinKernelContractId(id)) return { ok: false, status: 400, code: 'CONTRACT_BUILTIN' }
  const path = join(kernelContractsDir(activeWorkspace), `${id}.json`)
  if (!existsSync(path)) return { ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' }
  rmSync(path)
  return { ok: true }
}
