import { describe, expect, test } from 'vitest'
import {
  HUMANIZE_POSTPROCESS_VERSION,
  acceptHumanizePostProcessCandidate,
  buildHumanizePostProcessPassPrompt,
  buildRemoveAiFlavorDirectives,
  buildZhuqueNarrativeRewriteDirectives,
  chunkTextForHumanize,
  sanitizeRemoveAiFlavorShells,
  stitchHumanizeChunks,
} from './humanize-postprocess'

describe('humanize-postprocess (true dual-pass helpers)', () => {
  test('chunk + stitch preserve paragraph boundaries', () => {
    const text = Array.from({ length: 12 }, (_, i) => `第${i + 1}段。他推开门，走廊里还亮着灯。`).join('\n\n')
    const chunks = chunkTextForHumanize(text, 80)
    expect(chunks.length).toBeGreaterThan(1)
    const stitched = stitchHumanizeChunks(chunks)
    expect(stitched).toContain('第1段')
    expect(stitched).toContain('第12段')
    expect(countLike(stitched)).toBeGreaterThan(20)
  })

  test('sanitizeRemoveAiFlavorShells strips binary contrast and cliches', () => {
    const raw = '这不是简单的事故，而是有人故意留下的痕迹。他不禁缓缓说道，嘴角微扬。真正重要的是先冷静，再行动。'
    const cleaned = sanitizeRemoveAiFlavorShells(raw)
    expect(cleaned).not.toContain('不是')
    expect(cleaned).not.toContain('不禁')
    expect(cleaned).not.toContain('缓缓说道')
    expect(cleaned).not.toContain('嘴角微扬')
    expect(cleaned).not.toContain('真正重要的是')
  })

  test('Pass A prompt includes Zhuque Z rules and remove-ai-flavor shells', () => {
    const prompt = buildHumanizePostProcessPassPrompt({
      pass: 'A',
      chunk: { id: 'c1', index: 0, text: '他推开门。' },
      totalChunks: 1,
      project: { genre: '都市' },
    })
    expect(prompt).toContain('Pass A')
    expect(prompt).toContain('Z1')
    expect(prompt).toContain('Z7')
    expect(prompt).toContain('remove-ai-flavor')
    expect(buildZhuqueNarrativeRewriteDirectives().join('\n')).toContain('多体包装')
    expect(buildRemoveAiFlavorDirectives().join('\n')).toContain('二分对照壳')
  })

  test('Pass B prompt is subtractive de-packaging not cinematic texture', () => {
    const prompt = buildHumanizePostProcessPassPrompt({
      pass: 'B',
      chunk: { id: 'c1', index: 0, text: '他推开门。' },
      totalChunks: 1,
    })
    expect(prompt).toContain('Pass B')
    expect(prompt).toMatch(/去包装|只删不增|禁止新增/)
    expect(prompt).not.toContain('Z1. 临床讲义')
  })

  test('acceptHumanizePostProcessCandidate rejects collapse and wrappers', () => {
    const before = '他推开门。\n\n“先别动。”\n\n手套上还沾着水，他本想甩锅，却先把纸角按住。走廊里有人脚步乱。'
    const ok = before.replace('按住。', '按住了。')
    const wrapped = `好的，修改如下：\n${ok}\n希望对你有帮助。`
    const collapsed = '他推开门。'
    expect(acceptHumanizePostProcessCandidate(before, ok).accepted).toBe(true)
    const wrapGate = acceptHumanizePostProcessCandidate(before, wrapped)
    // Either strip-and-accept or reject chat wrapper; never keep assistant closing.
    if (wrapGate.accepted) {
      expect(wrapGate.text).not.toContain('希望对你有帮助')
      expect(wrapGate.text).not.toContain('好的，修改如下')
    } else {
      expect(wrapGate.accepted).toBe(false)
    }
    expect(acceptHumanizePostProcessCandidate(before, collapsed).accepted).toBe(false)
  })

  test('version constant is stable', () => {
    expect(HUMANIZE_POSTPROCESS_VERSION).toContain('humanize_postprocess')
  })
})

function countLike(text: string) {
  return String(text || '').replace(/\s+/g, '').length
}

