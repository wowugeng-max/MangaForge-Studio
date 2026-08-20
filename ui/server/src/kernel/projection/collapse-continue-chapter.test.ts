import { describe, expect, test } from 'bun:test'
import { collapseContinueChapterArtifacts } from './collapse-continue-chapter'

describe('collapseContinueChapterArtifacts', () => {
  test('demotes out-of-window chapter_text to attachment', () => {
    const result = collapseContinueChapterArtifacts({
      windowNos: [2, 3],
      projectedRel: {
        2: '正文/第002章_二.md',
        3: '正文/第003章_三.md',
      },
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第003章_三.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第004章_四.md', artifact_kind: 'chapter_text' },
        { rel_path: '追踪/进度.md', artifact_kind: 'tracking_doc' },
      ],
    })
    expect(result).toEqual({
      ok: true,
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第003章_三.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第004章_四.md', artifact_kind: 'attachment' },
        { rel_path: '追踪/进度.md', artifact_kind: 'tracking_doc' },
      ],
    })
  })

  test('fails OUTPUT_MISSING when a window chapter has no chapter_text', () => {
    const result = collapseContinueChapterArtifacts({
      windowNos: [2, 3],
      projectedRel: {
        2: '正文/第002章_二.md',
        3: '正文/第003章_三.md',
      },
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OUTPUT_MISSING')
    expect(result.message).toBe('missing chapter_text for 第3章')
  })

  test('keeps projectedRel and demotes the extra same-chapter title', () => {
    const result = collapseContinueChapterArtifacts({
      windowNos: [2, 3],
      projectedRel: {
        2: '正文/第002章_二.md',
        3: '正文/第003章_三.md',
      },
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第002章_另一标题.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第003章_三.md', artifact_kind: 'chapter_text' },
      ],
    })
    expect(result).toEqual({
      ok: true,
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第002章_另一标题.md', artifact_kind: 'attachment' },
        { rel_path: '正文/第003章_三.md', artifact_kind: 'chapter_text' },
      ],
    })
  })
})
