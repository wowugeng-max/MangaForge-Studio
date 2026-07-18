import { appendRepairTaskQualitySyncPromptLinesCore } from './prompt-lines-quality-core'
import { appendRepairTaskQualitySyncPromptLinesCraft } from './prompt-lines-quality-craft'
import { appendRepairTaskQualitySyncPromptLinesReceipts } from './prompt-lines-quality-receipts'
import { appendRepairTaskQualitySyncPromptLinesRepairs } from './prompt-lines-quality-repairs'

/** Append quality-sync domain sections to the repair revision prompt lines. */
export function appendRepairTaskQualitySyncPromptLines(
  lines: string[],
  ctx: Record<string, any>,
) {
  appendRepairTaskQualitySyncPromptLinesCore(lines, ctx)
  appendRepairTaskQualitySyncPromptLinesCraft(lines, ctx)
  appendRepairTaskQualitySyncPromptLinesReceipts(lines, ctx)
  appendRepairTaskQualitySyncPromptLinesRepairs(lines, ctx)
  return lines
}
