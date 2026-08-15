export type KernelPromptVars = {
  scope_files: string
  chapter_no: string
  chapter_pad: string
  chapter_title: string
  previous_chapter_file: string
  report_path: string
  review_path: string
  skill_name: string
}

export const KERNEL_PROMPT_VARIABLES = [
  'scope_files', 'chapter_no', 'chapter_pad', 'chapter_title',
  'previous_chapter_file', 'report_path', 'review_path', 'skill_name',
] as const

const VAR_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g

export function findUnknownVariables(template: string): string[] {
  const unknown: string[] = []
  for (const match of String(template || '').matchAll(VAR_PATTERN)) {
    const name = match[1]
    if (!(KERNEL_PROMPT_VARIABLES as readonly string[]).includes(name) && !unknown.includes(name)) unknown.push(name)
  }
  return unknown
}

export function renderKernelTemplate(template: string, vars: KernelPromptVars): string {
  const unknown = findUnknownVariables(template)
  if (unknown.length) {
    throw Object.assign(new Error(`unknown template variables: ${unknown.join(', ')}`), { code: 'CONTRACT_INVALID' })
  }
  return String(template || '').replace(VAR_PATTERN, (_, name: string) => String((vars as any)[name] ?? ''))
}
