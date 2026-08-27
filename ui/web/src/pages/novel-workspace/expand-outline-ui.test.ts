import { describe, expect, test } from 'bun:test'
import { kernelJobUserMessage } from '../../kernel/jobs/messages'
import type { KernelJobDetail } from '../../kernel/jobs/types'
import {
  EXPAND_OUTLINE_NEED_LEDGER,
  expandOutlineCancelVisible,
  expandOutlineCommitSuccessText,
  expandOutlineCreateFailureText,
  expandOutlineHasLedger,
  expandOutlinePreviewRows,
  loadExpandOutlinePreviews,
  openExpandOutlineFromWriting,
} from './expand-outline-ui'

function detail(artifacts: KernelJobDetail['artifacts']): KernelJobDetail {
  return {
    ok: true,
    job: { id: 'job-1', status: 'awaiting_selection' },
    candidates: [{ id: 'cand-1', contract_id: 'oh-story-core.story-long-write.expand', status: 'succeeded' }],
    artifacts,
  }
}

describe('expand-outline-ui', () => {
  test('disabled copy matches FOUNDATION_PRECONDITION', () => {
    expect(EXPAND_OUTLINE_NEED_LEDGER).toBe('扩纲需要账本里已有大纲')
    expect(kernelJobUserMessage('FOUNDATION_PRECONDITION')?.text).toBe(EXPAND_OUTLINE_NEED_LEDGER)
  })

  test('local 409 copy does not change the global PROJECT_JOB_RUNNING toast', () => {
    expect(expandOutlineCreateFailureText('PROJECT_JOB_RUNNING')).toBe('该项目扩纲未结束')
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')).toEqual({
      kind: 'warning',
      text: '同项目同动词任务未结束',
    })
  })

  test('has ledger when outlines array is non-empty', () => {
    expect(expandOutlineHasLedger([])).toBe(false)
    expect(expandOutlineHasLedger(undefined)).toBe(false)
    expect(expandOutlineHasLedger([{ id: 1 }])).toBe(true)
  })

  test('cancel is visible only while running with a job id', () => {
    expect(expandOutlineCancelVisible({ phase: 'idle' })).toBe(false)
    expect(expandOutlineCancelVisible({ phase: 'running', jobId: '' })).toBe(false)
    expect(expandOutlineCancelVisible({ phase: 'running', jobId: 'job-1' })).toBe(true)
    expect(expandOutlineCancelVisible({ phase: 'awaiting_selection', jobId: 'job-1' })).toBe(false)
  })

  test('preview rows keep only outline_doc', () => {
    const rows = expandOutlinePreviewRows(detail([
      { id: 'a1', candidate_id: 'cand-1', rel_path: '大纲/第001章.md', artifact_kind: 'outline_doc' },
      { id: 'a2', candidate_id: 'cand-1', rel_path: 'contracts/note.md', artifact_kind: 'attachment' },
      { id: 'a3', candidate_id: 'cand-1', rel_path: '正文/第001章.md', artifact_kind: 'chapter_text' },
    ]))
    expect(rows).toEqual([
      { id: 'a1', candidate_id: 'cand-1', rel_path: '大纲/第001章.md', artifact_kind: 'outline_doc' },
    ])
  })

  test('loadExpandOutlinePreviews fetches content for each outline row', async () => {
    const previews = await loadExpandOutlinePreviews(
      [{ id: 'a1', rel_path: '大纲/第001章.md' }],
      async (id) => {
        expect(id).toBe('a1')
        return { ok: true as const, content: '# 细纲', truncated: false }
      },
    )
    expect(previews).toEqual([
      { id: 'a1', rel_path: '大纲/第001章.md', content: '# 细纲', truncated: false },
    ])
  })

  test('writing entry jumps to planning and skips start when already previewing or running', () => {
    const seen: string[] = []
    openExpandOutlineFromWriting({
      phase: 'awaiting_selection',
      setWorkspaceArea: (area) => seen.push(area),
      start: () => seen.push('start'),
    })
    expect(seen).toEqual(['storyPlanning'])

    seen.length = 0
    openExpandOutlineFromWriting({
      phase: 'running',
      setWorkspaceArea: (area) => seen.push(area),
      start: () => seen.push('start'),
    })
    expect(seen).toEqual(['storyPlanning'])

    seen.length = 0
    openExpandOutlineFromWriting({
      phase: 'idle',
      setWorkspaceArea: (area) => seen.push(area),
      start: () => seen.push('start'),
    })
    expect(seen).toEqual(['storyPlanning', 'start'])
  })

  test('commit success copy says outlines changed and prose did not', () => {
    expect(expandOutlineCommitSuccessText()).toBe('已写入大纲，正文未改')
  })
})
