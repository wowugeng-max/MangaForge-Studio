import { basename } from 'node:path'
import { isBuiltinKernelContractId } from '../contracts/builtin'
import { validateKernelContract } from '../contracts/schema'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'

export type AdaptUnsatisfied = { rel_path: string; verb: string; errors: string[] }

const CONTRACT_JSON_RE = /^contracts\/[^/]+\.json$/

export function collapseAdaptPackArtifacts<T extends { rel_path: string; artifact_kind: string }>(input: {
  artifacts: T[]
  readText: (artifact: T) => string
}): { artifacts: T[]; unsatisfied: AdaptUnsatisfied[] } {
  const unsatisfied: AdaptUnsatisfied[] = []
  const artifacts = input.artifacts.map((artifact) => {
    if (!CONTRACT_JSON_RE.test(artifact.rel_path)) return artifact
    const text = input.readText(artifact)
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch (error: any) {
      unsatisfied.push({
        rel_path: artifact.rel_path,
        verb: basename(artifact.rel_path, '.json'),
        errors: [String(error?.message || 'JSON.parse failed')],
      })
      return { ...artifact, artifact_kind: 'attachment' as T['artifact_kind'] }
    }
    const schema = validateKernelContract(parsed)
    if (!schema.ok) {
      unsatisfied.push({
        rel_path: artifact.rel_path,
        verb: String((parsed as any)?.verb || basename(artifact.rel_path, '.json')),
        errors: schema.errors,
      })
      return { ...artifact, artifact_kind: 'attachment' as T['artifact_kind'] }
    }
    if (isBuiltinKernelContractId(schema.contract.id)) {
      unsatisfied.push({
        rel_path: artifact.rel_path,
        verb: schema.contract.verb || basename(artifact.rel_path, '.json'),
        errors: ['CONTRACT_BUILTIN'],
      })
      return { ...artifact, artifact_kind: 'attachment' as T['artifact_kind'] }
    }
    const template = validateInstanceAgainstTemplate(schema.contract)
    if (!template.ok) {
      unsatisfied.push({
        rel_path: artifact.rel_path,
        verb: schema.contract.verb || basename(artifact.rel_path, '.json'),
        errors: template.errors,
      })
      return { ...artifact, artifact_kind: 'attachment' as T['artifact_kind'] }
    }
    return { ...artifact, artifact_kind: 'contract_json' as T['artifact_kind'] }
  })
  if (!artifacts.some(a => CONTRACT_JSON_RE.test(a.rel_path)) && !unsatisfied.length) {
    unsatisfied.push({ rel_path: 'contracts/', verb: '', errors: ['未写出 contracts/*.json'] })
  }
  return { artifacts, unsatisfied }
}
