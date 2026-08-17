import { z } from 'zod'
import { ALL_CAPABILITIES } from '../artifact-kinds'

export const VERB_IDS = [
  'open_book', 'expand_outline', 'write_chapter', 'write_continue',
  'review_chapter', 'apply_review', 'rewrite_chapter', 'deslop_chapter', 'adapt_pack',
] as const
export type VerbId = (typeof VERB_IDS)[number]

const templateSchema = z.object({
  schema_version: z.literal(1),
  verb: z.enum(VERB_IDS),
  label: z.string().min(1),
  subject_type: z.enum(['project', 'chapter', 'pack']),
  capability: z.enum(ALL_CAPABILITIES as unknown as [string, ...string[]]),
  required_kinds: z.array(z.object({ kind: z.string().min(1), min: z.number().int().min(1) })),
  optional_kinds: z.array(z.string()),
  forbidden_required_kinds: z.array(z.string()),
  allowed_domain_writes: z.array(z.string()),
  forbidden_domain_writes: z.array(z.string()),
  template_gates: z.array(z.string()),
  allowed_gates: z.array(z.string()),
  mention_policy: z.enum(['required', 'optional', 'forbidden']),
  commit_mode: z.enum(['manual', 'auto_if_single']),
  allowed_replace_bindings: z.literal(false),
})

export type VerbTemplate = z.infer<typeof templateSchema>

export function validateVerbTemplate(input: unknown): VerbTemplate {
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`verb template invalid: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return parsed.data
}
