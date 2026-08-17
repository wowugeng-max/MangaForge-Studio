// ui/server/src/kernel/jobs/gates.ts
import { getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryApplyRewroteTooMuch } from '../../novel-writing/oh-story-core/paragraph-retention'
import { latestOhStoryReviewForChapter, ohStoryReviewMatchesChapterText } from '../../novel-writing/oh-story-core/review-match'
import type { KernelContract } from '../contracts/schema'

export type GateResult = { gate: string; ok: boolean; code?: string; message?: string }

type GateArtifact = { rel_path: string; artifact_kind: string; copied_path?: string; vault_path?: string }

function soloDetected(reportHead: string): boolean {
  const fallback = reportHead.match(/^Fallback:\s*(.+)$/mi)
  if (fallback && /\bsolo\b/i.test(fallback[1])) return true
  return /^Effective Mode:\s*solo\b/mi.test(reportHead)
}

export async function runPostHarvestGates(input: {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  artifacts: GateArtifact[]
  warnings: Array<{ warning: string; rel_path: string }>
  readArtifactText: (artifact: GateArtifact) => string
}): Promise<{ results: GateResult[]; failedCode: string | null }> {
  const results: GateResult[] = []
  for (const warning of input.warnings || []) {
    results.push({ gate: 'write_outside_scope', ok: true, code: 'write_outside_scope', message: warning.rel_path })
  }

  const chapterArtifact = input.artifacts.find(a => a.artifact_kind === 'chapter_text')
  const reportArtifact = input.artifacts.find(a => a.artifact_kind === 'review_report')

  for (const gate of input.contract.gates) {
    if (gate === 'require_reviewer_agents') {
      results.push({ gate, ok: true, message: 'checked before start' })
      continue
    }
    if (gate === 'write_outside_scope') continue
    if (gate === 'reject_solo_fallback') {
      if (!reportArtifact) {
        results.push({ gate, ok: false, code: 'SOLO_FALLBACK', message: 'no review_report artifact to verify' })
        continue
      }
      const head = input.readArtifactText(reportArtifact).slice(0, 2048)
      if (soloDetected(head)) results.push({ gate, ok: false, code: 'SOLO_FALLBACK' })
      else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'require_chapter_file') {
      if (!chapterArtifact && input.contract.capability === 'review') {
        const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
        if (String(chapter?.chapter_text || '').replace(/\s/g, '')) results.push({ gate, ok: true })
        else results.push({ gate, ok: false, code: 'CHAPTER_FILE_MISSING' })
        continue
      }
      const text = chapterArtifact ? input.readArtifactText(chapterArtifact) : ''
      if (!text.replace(/\s/g, '')) results.push({ gate, ok: false, code: 'CHAPTER_FILE_MISSING' })
      else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'require_matching_review') {
      const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
      const reviews = await listNovelReviewsByType(input.workspace, input.projectId, 'oh_story_review')
      const review = latestOhStoryReviewForChapter(reviews, input.chapterId)
      if (!review) results.push({ gate, ok: false, code: 'OH_STORY_APPLY_NO_REVIEW' })
      else if (!ohStoryReviewMatchesChapterText(review, String(chapter?.chapter_text || ''))) {
        results.push({ gate, ok: false, code: 'OH_STORY_APPLY_STALE_REVIEW' })
      } else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'paragraph_retention_70') {
      const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
      const nextText = chapterArtifact ? input.readArtifactText(chapterArtifact) : ''
      if (!nextText.replace(/\s/g, '')) {
        results.push({ gate, ok: true })
        continue
      }
      if (ohStoryApplyRewroteTooMuch(String(chapter?.chapter_text || ''), nextText)) {
        results.push({ gate, ok: false, code: 'OH_STORY_APPLY_REWROTE_TOO_MUCH' })
      } else results.push({ gate, ok: true })
      continue
    }
  }
  const failed = results.find(r => !r.ok)
  return { results, failedCode: failed?.code || null }
}
