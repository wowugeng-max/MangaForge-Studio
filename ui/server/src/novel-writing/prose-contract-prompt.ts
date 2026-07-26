import {
  normalizeProseContractKey,
  PROSE_PROMPT_MAX_CHARS,
  PROSE_RISK_CONTRACT_LIMIT,
} from './prose-generation-contract'

export type ProsePromptDetailLevel = 'full' | 'compact' | 'reference'

export interface ProseRequiredPromptSection {
  key: string
  text: string | string[]
}

export interface ProseRiskPromptSection {
  key: string
  full: string | string[]
  compact: string | string[]
  reference: string | string[]
}

export interface ProsePromptDiagnostics {
  prompt_chars: number
  required_chars: number
  selected_contract_keys: string[]
  omitted_contract_keys: string[]
  section_chars: Record<string, number>
  downgrades: Array<{
    key: string
    from: ProsePromptDetailLevel
    to: ProsePromptDetailLevel
  }>
  budget_chars: number
}

export class ProseCorePromptBudgetError extends Error {
  readonly code = 'PROSE_CORE_PROMPT_BUDGET_EXCEEDED'
  readonly prompt_diagnostics: ProsePromptDiagnostics

  constructor(readonly diagnostics: ProsePromptDiagnostics) {
    super(`正文核心 prompt ${diagnostics.required_chars} 字符超过预算 ${diagnostics.budget_chars}`)
    this.name = 'ProseCorePromptBudgetError'
    this.prompt_diagnostics = diagnostics
  }
}

function sectionText(value: string | string[]) {
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join('\n')
}

function normalizeDetailLevel(value: any): ProsePromptDetailLevel {
  return value === 'full' || value === 'compact' || value === 'reference'
    ? value
    : 'reference'
}

function uniqueDirectorSelections(director: any) {
  const seen = new Set<string>()
  const rows: Array<{ key: string; level: ProsePromptDetailLevel }> = []
  for (const item of director?.selected_contracts || director?.selectedContracts || []) {
    const key = normalizeProseContractKey(item?.key)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push({
      key,
      level: normalizeDetailLevel(item?.detail_level || item?.detailLevel),
    })
    if (rows.length >= PROSE_RISK_CONTRACT_LIMIT) break
  }
  return rows
}

export function compileProseContractPrompt(input: {
  requiredSections: ProseRequiredPromptSection[]
  contractSections: ProseRiskPromptSection[]
  director: any
  maxChars?: number
}) {
  const maxChars = Number(input.maxChars || PROSE_PROMPT_MAX_CHARS)
  const requiredRows = input.requiredSections
    .map(section => ({ key: section.key, text: sectionText(section.text) }))
    .filter(row => row.text)
  const requiredPrompt = requiredRows.map(row => row.text).join('\n')
  const selectedRows = uniqueDirectorSelections(input.director)
  const selectedKeys = selectedRows.map(row => row.key)
  const registeredKeys = input.contractSections.map(section => normalizeProseContractKey(section.key))
  const diagnostics: ProsePromptDiagnostics = {
    prompt_chars: requiredPrompt.length,
    required_chars: requiredPrompt.length,
    selected_contract_keys: selectedKeys,
    omitted_contract_keys: registeredKeys.filter(key => !selectedKeys.includes(key)),
    section_chars: Object.fromEntries(requiredRows.map(row => [row.key, row.text.length])),
    downgrades: [],
    budget_chars: maxChars,
  }

  if (requiredPrompt.length > maxChars) throw new ProseCorePromptBudgetError(diagnostics)

  const sectionByKey = new Map(
    input.contractSections.map(section => [normalizeProseContractKey(section.key), section]),
  )
  const parts = requiredRows.map(row => row.text)
  let usedChars = requiredPrompt.length
  const fallbackLevels: Record<ProsePromptDetailLevel, ProsePromptDetailLevel[]> = {
    full: ['full', 'compact', 'reference'],
    compact: ['compact', 'reference'],
    reference: ['reference'],
  }

  for (const selected of selectedRows) {
    const section = sectionByKey.get(selected.key)
    let loaded = false
    if (section) {
      for (const level of fallbackLevels[selected.level]) {
        const text = sectionText(section[level])
        if (!text) continue
        const nextChars = usedChars + (parts.length ? 1 : 0) + text.length
        if (nextChars > maxChars) continue
        parts.push(text)
        usedChars = nextChars
        diagnostics.section_chars[`contract:${selected.key}:${level}`] = text.length
        if (level !== selected.level) {
          diagnostics.downgrades.push({
            key: selected.key,
            from: selected.level,
            to: level,
          })
        }
        loaded = true
        break
      }
    }
    if (!loaded && !diagnostics.omitted_contract_keys.includes(selected.key)) {
      diagnostics.omitted_contract_keys.push(selected.key)
    }
  }

  const prompt = parts.join('\n')
  diagnostics.prompt_chars = prompt.length
  diagnostics.omitted_contract_keys = Array.from(new Set(diagnostics.omitted_contract_keys))
  return { prompt, diagnostics }
}
