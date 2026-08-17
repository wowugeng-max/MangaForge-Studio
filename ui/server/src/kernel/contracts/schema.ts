import { z } from 'zod'
import { ALL_CAPABILITIES, REGISTERED_ARTIFACT_KINDS } from '../artifact-kinds'
import { findUnknownVariables } from '../template'

export const KERNEL_MOUNTS = [
  'current_chapter', 'previous_chapter', 'outline', 'characters', 'world',
  'tracking', 'skill_tree', 'agents', 'review_report', 'canvas_node',
] as const

export const KERNEL_GATES = [
  'reject_solo_fallback', 'require_reviewer_agents', 'require_chapter_file',
  'require_matching_review', 'paragraph_retention_70', 'write_outside_scope',
  'reject_chapter_text_artifact', 'reject_outline_artifact', 'require_outline_mix',
] as const

export const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{2,127}$/

const outputSchema = z.object({
  artifact_kind: z.enum(REGISTERED_ARTIFACT_KINDS as unknown as [string, ...string[]]),
  glob: z.string().min(1),
  fallback: z.literal('last_message').optional(),
  binding: z.string().min(1),
  required: z.boolean(),
})

const contractSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().regex(CONTRACT_ID_PATTERN),
  pack_id: z.string().min(1),
  skill_name: z.string().min(1),
  variant: z.string().min(1),
  capability: z.enum(ALL_CAPABILITIES as unknown as [string, ...string[]]),
  label: z.string().min(1),
  verb: z.string().min(1).optional(),
  invoke: z.object({ mention: z.string(), prompt: z.string().min(1) }),
  projection: z.object({ mounts: z.array(z.enum(KERNEL_MOUNTS)).min(1) }),
  outputs: z.array(outputSchema).min(1),
  write_scope: z.array(z.string().min(1)),
  ignore: z.array(z.string().min(1)).optional(),
  gates: z.array(z.enum(KERNEL_GATES)),
  commit: z.object({
    mode: z.enum(['manual', 'auto_if_single', 'never']),
    domain_writes: z.array(z.string()),
    source: z.string().optional(),
  }),
  sandbox: z.enum(['workspace-write', 'read-only']),
  approval: z.literal('never'),
})

export type KernelContract = z.infer<typeof contractSchema>

export function validateKernelContract(input: unknown):
  | { ok: true; contract: KernelContract }
  | { ok: false; errors: string[] } {
  const parsed = contractSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) }
  }
  const contract = parsed.data
  const errors: string[] = []
  if (contract.id !== `${contract.pack_id}.${contract.skill_name}.${contract.variant}`) {
    errors.push('id: must equal pack_id.skill_name.variant')
  }
  if (contract.invoke.mention !== '' && contract.invoke.mention !== `$${contract.skill_name}`) {
    errors.push('invoke.mention: must be empty or $skill_name')
  }
  const templates = [
    contract.invoke.prompt,
    ...contract.outputs.map(output => output.glob),
    ...contract.write_scope,
    ...(contract.ignore || []),
  ]
  for (const template of templates) {
    const unknown = findUnknownVariables(template)
    if (unknown.length) errors.push(`template: unknown variables ${unknown.join(', ')} in "${template}"`)
  }
  if (errors.length) return { ok: false, errors }
  return { ok: true, contract }
}
