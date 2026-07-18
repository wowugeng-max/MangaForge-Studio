import { appendRepairTaskQualitySyncPromptLinesCraftA } from './prompt-lines-quality-craft-a'
import { appendRepairTaskQualitySyncPromptLinesCraftB } from './prompt-lines-quality-craft-b'

export function appendRepairTaskQualitySyncPromptLinesCraft(lines: string[], ctx: Record<string, any>) {
  appendRepairTaskQualitySyncPromptLinesCraftA(lines, ctx)
  appendRepairTaskQualitySyncPromptLinesCraftB(lines, ctx)
}
