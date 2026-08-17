import type { KernelContract } from '../contracts/schema'
import { resolveContractVerb } from './infer'
import { getVerbTemplate } from './registry'

const CHAPTER_MOUNTS = ['current_chapter', 'previous_chapter', 'review_report']

export function validateInstanceAgainstTemplate(contract: KernelContract):
  | { ok: true }
  | { ok: false; code: 'TEMPLATE_UNSATISFIED'; errors: string[] } {
  const verb = resolveContractVerb(contract)
  if (!verb) return { ok: true } // 无 verb 的旧合同：不能过动词 API，但登记不因此失败
  const template = getVerbTemplate(verb)
  const errors: string[] = []
  if (!template) {
    return { ok: false, code: 'TEMPLATE_UNSATISFIED', errors: [`verb ${verb} has no template`] }
  }
  if (contract.capability !== template.capability) {
    errors.push(`capability: ${contract.capability} != template ${template.capability}`)
  }
  for (const need of template.required_kinds) {
    if (!contract.outputs.some(o => o.artifact_kind === need.kind && o.required)) {
      errors.push(`required kind ${need.kind}: no required output declares it`)
    }
  }
  for (const output of contract.outputs) {
    if (output.required && template.forbidden_required_kinds.includes(output.artifact_kind)) {
      errors.push(`kind ${output.artifact_kind} must not be required for verb ${verb}`)
    }
    if (output.binding === 'outlines.replace') {
      errors.push('binding outlines.replace is not allowed in v1')
    }
  }
  const writes = contract.commit.domain_writes
  for (const table of writes) {
    if (!template.allowed_domain_writes.includes(table) && table !== 'chapter_versions') {
      errors.push(`domain write ${table} not allowed for verb ${verb}`)
    }
    if (template.forbidden_domain_writes.includes(table)) {
      errors.push(`domain write ${table} is forbidden for verb ${verb}`)
    }
  }
  for (const gate of template.template_gates) {
    if (!contract.gates.includes(gate as any)) errors.push(`template gate ${gate} missing from instance gates`)
  }
  for (const gate of contract.gates) {
    if (!template.allowed_gates.includes(gate)) errors.push(`gate ${gate} not in allowed_gates for verb ${verb}`)
  }
  if (template.mention_policy === 'required' && !contract.invoke.mention) errors.push('mention required by template')
  if (template.mention_policy === 'forbidden' && contract.invoke.mention) errors.push('mention forbidden by template')
  if ((template.subject_type === 'project' || template.subject_type === 'pack')
    && contract.projection.mounts.some(m => CHAPTER_MOUNTS.includes(m))) {
    errors.push(`chapter-level mounts (${CHAPTER_MOUNTS.join('/')}) not allowed: current_chapter etc. require subject_type=chapter`)
  }
  if (errors.length) return { ok: false, code: 'TEMPLATE_UNSATISFIED', errors }
  return { ok: true }
}
