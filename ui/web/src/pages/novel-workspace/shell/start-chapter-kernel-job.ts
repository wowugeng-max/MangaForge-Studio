import type { CreateKernelJobInput, KernelApiError } from '../../../kernel/jobs/types'
import {
  latestOhStoryReviewForChapter,
  ohStoryReviewMatchesChapterText,
  parseOhStoryReviewPayload,
} from '../oh-story-review-match'

export async function startChapterKernelJob(input: {
  flushPendingSave: () => Promise<boolean>
  createJob: (body: CreateKernelJobInput) => Promise<{ ok: true; jobId: string } | KernelApiError>
  input: CreateKernelJobInput
}): Promise<{ ok: true; jobId: string } | { ok: false; code: string; message?: string }> {
  const saved = await input.flushPendingSave()
  if (!saved) return { ok: false, code: 'SAVE_FAILED' }
  const created = await input.createJob(input.input)
  if (!created.ok) return { ok: false, code: created.code, message: created.message }
  return created
}

export function assertOhStoryApplyReady(input: {
  reviews: any[]
  chapter: any
}): { ok: true } | { ok: false; warning: '先对本稿重新审稿' } {
  const chapterId = Number(input.chapter?.id || 0)
  const latest = latestOhStoryReviewForChapter(
    (input.reviews || []).filter((item: any) => item.review_type === 'oh_story_review'),
    chapterId,
  )
  if (!latest) return { ok: false, warning: '先对本稿重新审稿' }
  const hash = String(parseOhStoryReviewPayload(latest).chapter_text_hash || '')
  if (hash && !ohStoryReviewMatchesChapterText(latest, String(input.chapter?.chapter_text || ''))) {
    return { ok: false, warning: '先对本稿重新审稿' }
  }
  return { ok: true }
}
