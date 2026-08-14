export const OH_STORY_APPLY_MIN_PARAGRAPH_RETENTION = 0.7
export const OH_STORY_APPLY_RETENTION_MIN_PARAGRAPHS = 8

export function splitOhStoryParagraphs(text: string): string[] {
  return String(text || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean)
}

export function ohStoryParagraphRetention(original: string, next: string): number {
  const source = splitOhStoryParagraphs(original)
  if (source.length === 0) return 1
  const kept = new Set(splitOhStoryParagraphs(next))
  return source.filter(paragraph => kept.has(paragraph)).length / source.length
}

export function ohStoryApplyRewroteTooMuch(original: string, next: string): boolean {
  const source = splitOhStoryParagraphs(original)
  if (source.length < OH_STORY_APPLY_RETENTION_MIN_PARAGRAPHS) return false
  return ohStoryParagraphRetention(original, next) < OH_STORY_APPLY_MIN_PARAGRAPH_RETENTION
}
