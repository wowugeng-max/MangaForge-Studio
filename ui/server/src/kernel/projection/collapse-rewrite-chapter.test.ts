import { describe, expect, test } from 'bun:test'
import { collapseRewriteChapterArtifacts } from './collapse-rewrite-chapter'

describe('collapseRewriteChapterArtifacts', () => {
  test('keeps a single chapter_text unchanged', () => {
    const artifacts = [
      { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
      { rel_path: '审稿/第002章.md', artifact_kind: 'review_report' },
    ]
    const result = collapseRewriteChapterArtifacts({
      capability: 'rewrite',
      subjectType: 'chapter',
      currentRel: '正文/第002章_二.md',
      artifacts,
    })
    expect(result).toEqual({ ok: true, artifacts })
  })

  test('demotes extra chapter_text to attachment when currentRel matches', () => {
    const artifacts = [
      { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
      { rel_path: '正文/第002章_另一标题.md', artifact_kind: 'chapter_text' },
    ]
    const result = collapseRewriteChapterArtifacts({
      capability: 'rewrite',
      subjectType: 'chapter',
      currentRel: '正文/第002章_二.md',
      artifacts,
    })
    expect(result).toEqual({
      ok: true,
      artifacts: [
        { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第002章_另一标题.md', artifact_kind: 'attachment' },
      ],
    })
  })

  test('fails OUTPUT_MISSING when no chapter_text equals currentRel', () => {
    const result = collapseRewriteChapterArtifacts({
      capability: 'rewrite',
      subjectType: 'chapter',
      currentRel: '正文/第002章_二.md',
      artifacts: [
        { rel_path: '正文/第002章_甲.md', artifact_kind: 'chapter_text' },
        { rel_path: '正文/第002章_乙.md', artifact_kind: 'chapter_text' },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OUTPUT_MISSING')
    expect(result.message).toBe('ambiguous chapter_text: 正文/第002章_甲.md, 正文/第002章_乙.md')
  })

  test('review capability with two chapter_text files is a no-op', () => {
    const artifacts = [
      { rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' },
      { rel_path: '正文/第002章_另一标题.md', artifact_kind: 'chapter_text' },
    ]
    const result = collapseRewriteChapterArtifacts({
      capability: 'review',
      subjectType: 'chapter',
      currentRel: '正文/第002章_二.md',
      artifacts,
    })
    expect(result).toEqual({ ok: true, artifacts })
  })
})
