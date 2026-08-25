import type { WritingSkillCatalogItem } from './writingSkillsModel'
import type { KernelContractListItem, KernelJobDetail } from '../../kernel/jobs/types'

export const KERNEL_DEFAULT_PICKER_VERBS = [
  'open_book', 'expand_outline', 'write_chapter', 'write_continue',
  'rewrite_chapter', 'review_chapter', 'apply_review', 'deslop_chapter',
] as const

export function defaultPickerVerbs() {
  return KERNEL_DEFAULT_PICKER_VERBS
}

export function installedAdaptTargets(catalog: WritingSkillCatalogItem[]): WritingSkillCatalogItem[] {
  return catalog.filter(item => item.builtin === false)
}

export type AdaptUnsatisfied = { rel_path: string; verb: string; errors: string[] }

export function parseAdaptUnsatisfied(detail: KernelJobDetail | null | undefined): AdaptUnsatisfied[] {
  const raw = detail?.candidates?.[0]?.metadata
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.adapt_unsatisfied) ? parsed.adapt_unsatisfied : []
  } catch {
    return []
  }
}

export function legalAdaptContracts(detail: KernelJobDetail | null | undefined) {
  return (detail?.artifacts || []).filter(a => a.artifact_kind === 'contract_json')
}

export function defaultOptionsForVerb(
  verb: string,
  contracts: KernelContractListItem[],
): KernelContractListItem[] {
  return contracts.filter(c => c.verb === verb && c.implemented)
}

export function overlayPickerOntoDefaults(
  current: Record<string, string[]>,
  picker: Record<string, string | undefined | null>,
): Record<string, string[]> {
  const next = { ...current }
  for (const verb of KERNEL_DEFAULT_PICKER_VERBS) {
    const id = String(picker[verb] || '').trim()
    if (id) next[verb] = [id]
  }
  return next
}

export async function reloadContractsAfterAdaptCommit(input: {
  committed: boolean
  listContracts: () => Promise<{ ok: true; contracts: KernelContractListItem[] } | { ok: false; message: string }>
}): Promise<KernelContractListItem[] | null> {
  if (!input.committed) return null
  const listed = await input.listContracts()
  return listed.ok ? listed.contracts : null
}
