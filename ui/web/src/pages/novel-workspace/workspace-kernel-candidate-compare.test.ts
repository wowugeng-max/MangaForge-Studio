import { describe, expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KernelCandidateCompare } from './workspace-kernel-candidate-compare'

describe('KernelCandidateCompare', () => {
  test('shows adopt on succeeded candidates and disables gated ones', () => {
    const html = renderToStaticMarkup(
      React.createElement(KernelCandidateCompare, {
        detail: {
          ok: true,
          job: { id: 'job-1', status: 'awaiting_selection' },
          candidates: [
            { id: 'cand-a', contract_id: 'oh-story-core.story-review.full', status: 'succeeded', last_message_excerpt: '完整审稿摘录' },
            { id: 'cand-b', contract_id: 'user.review.fast', status: 'succeeded', last_message_excerpt: '假审稿摘录' },
            { id: 'cand-c', contract_id: 'user.review.solo', status: 'gated', error_code: 'SOLO_FALLBACK' },
          ],
          artifacts: [
            { id: 'art-a', candidate_id: 'cand-a', rel_path: '审稿/第007章.md', artifact_kind: 'review_report' },
          ],
        },
        onCommit: () => {},
        onPreview: () => {},
      }),
    )
    expect(html).toContain('完整审稿摘录')
    expect(html).toContain('假审稿摘录')
    expect(html).toContain('SOLO_FALLBACK')
    expect(html.match(/采纳/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
