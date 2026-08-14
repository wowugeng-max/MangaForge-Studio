import { countProseChars } from '../word-target'

export const WRITING_SKILL_CHUNK_THRESHOLD = 12000
export const WRITING_SKILL_CHUNK_TARGET = 7000
export const WRITING_SKILL_CHUNK_MAX = 8000
export const WRITING_SKILL_CHUNK_MIN = 4000

const BLANK_LINE_BOUNDARY = /\n(?:[ \t]*\n)+/
const SCENE_BREAK_LINE = /^(?:※|\*\s*\*\s*\*|---|——|\*\*\*)$/

export type WritingSkillChunk = {
  index: number
  total: number
  text: string
}

function splitWritingSkillParagraphs(source: string): string[] {
  const normalized = source.replace(/\r/g, '')
  const sections = normalized.split(BLANK_LINE_BOUNDARY)
  const paras: string[] = []
  for (const section of sections) {
    if (!section) continue
    const lines = section.split('\n')
    let buf: string[] = []
    const flushBuf = () => {
      if (!buf.length) return
      paras.push(buf.join('\n'))
      buf = []
    }
    for (const line of lines) {
      const trimmed = line.trim()
      if (SCENE_BREAK_LINE.test(trimmed)) {
        flushBuf()
        paras.push(trimmed)
        continue
      }
      buf.push(line)
    }
    flushBuf()
  }
  return paras.filter(p => p.length > 0)
}

function joinParagraphs(paras: string[]): string {
  return paras.join('\n\n')
}

function rebalanceTinyTail(packed: string[]): string[] {
  if (packed.length <= 1) return packed

  const lastIdx = packed.length - 1
  const lastChars = countProseChars(packed[lastIdx])
  if (lastChars >= WRITING_SKILL_CHUNK_MIN) return packed

  const prevIdx = lastIdx - 1
  const prevParas = splitWritingSkillParagraphs(packed[prevIdx])
  const tailParas = splitWritingSkillParagraphs(packed[lastIdx])
  const mergedParas = [...prevParas, ...tailParas]
  const mergedChars = countProseChars(joinParagraphs(mergedParas))

  if (mergedChars <= WRITING_SKILL_CHUNK_MAX) {
    packed[prevIdx] = joinParagraphs(mergedParas)
    packed.pop()
    return rebalanceTinyTail(packed)
  }

  if (prevParas.length > 1) {
    for (let k = 1; k < prevParas.length; k++) {
      const nextPrev = prevParas.slice(0, prevParas.length - k)
      const nextTail = [...prevParas.slice(prevParas.length - k), ...tailParas]
      const prevAfter = countProseChars(joinParagraphs(nextPrev))
      const tailAfter = countProseChars(joinParagraphs(nextTail))
      if (
        prevAfter >= WRITING_SKILL_CHUNK_MIN
        && tailAfter >= WRITING_SKILL_CHUNK_MIN
        && tailAfter <= WRITING_SKILL_CHUNK_MAX
      ) {
        packed[prevIdx] = joinParagraphs(nextPrev)
        packed[lastIdx] = joinParagraphs(nextTail)
        return rebalanceTinyTail(packed)
      }
    }
    return packed
  }

  return packed
}

export function chunkWritingSkillChapter(text: string): WritingSkillChunk[] {
  const source = String(text || '')
  if (countProseChars(source) <= WRITING_SKILL_CHUNK_THRESHOLD) {
    return [{ index: 0, total: 1, text: source }]
  }
  const paras = splitWritingSkillParagraphs(source)
  const packed: string[] = []
  let buf: string[] = []
  let bufChars = 0
  const flush = () => {
    if (!buf.length) return
    packed.push(joinParagraphs(buf))
    buf = []
    bufChars = 0
  }
  for (const para of paras) {
    const chars = countProseChars(para)
    if (bufChars > 0 && bufChars + chars > WRITING_SKILL_CHUNK_MAX) flush()
    if (chars > WRITING_SKILL_CHUNK_MAX) {
      flush()
      packed.push(para)
      continue
    }
    buf.push(para)
    bufChars += chars
    if (bufChars >= WRITING_SKILL_CHUNK_TARGET) flush()
  }
  flush()
  const balanced = rebalanceTinyTail(packed)
  return balanced.map((item, index) => ({ index, total: balanced.length, text: item }))
}
