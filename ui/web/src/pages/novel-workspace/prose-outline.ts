/** 章内大纲:按空行分段,取段首片段作为导航条目。 */

export type ProseOutlineEntry = {
  index: number
  from: number
  label: string
}

const LABEL_MAX_CHARS = 12

export function buildProseOutline(text: string): ProseOutlineEntry[] {
  if (!text || !text.trim()) return []

  const entries: ProseOutlineEntry[] = []
  const lines = text.split('\n')
  let offset = 0
  let inParagraph = false

  for (const line of lines) {
    const isBlank = line.trim() === ''
    if (!isBlank && !inParagraph) {
      const leading = line.length - line.trimStart().length
      const firstLine = line.trim().replace(/^[“"'「『]/, '')
      entries.push({
        index: entries.length + 1,
        from: offset + leading,
        label: firstLine.slice(0, LABEL_MAX_CHARS),
      })
    }
    inParagraph = !isBlank
    offset += line.length + 1
  }

  return entries
}
