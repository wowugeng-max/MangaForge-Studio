// ui/server/src/kernel/jobs/gates.ts
import { getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryApplyRewroteTooMuch } from '../../novel-writing/oh-story-core/paragraph-retention'
import { latestOhStoryReviewForChapter, ohStoryReviewMatchesChapterText } from '../../novel-writing/oh-story-core/review-match'
import type { KernelContract } from '../contracts/schema'
import { resolveContractVerb } from '../verbs/infer'
import { getVerbTemplate } from '../verbs/registry'

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
}): Promise<{ results: GateResult[]; failedCode: string | null; failedStatus: 'gated' | 'failed' | null }> {
  const results: GateResult[] = []
  for (const warning of input.warnings || []) {
    results.push({ gate: 'write_outside_scope', ok: true, code: 'write_outside_scope', message: warning.rel_path })
  }

  const chapterArtifact = input.artifacts.find(a => a.artifact_kind === 'chapter_text')
  const reportArtifact = input.artifacts.find(a => a.artifact_kind === 'review_report')
  const changedPaths = [
    ...input.artifacts.map(a => a.rel_path),
    ...(input.warnings || []).map(w => w.rel_path),
  ]
  const hasChapterParse = (artifact: GateArtifact) => {
    const name = artifact.rel_path.split('/').pop() || artifact.rel_path
    if (/第\s*\d+\s*章/.test(name)) return true
    const text = input.readArtifactText(artifact)
    const heading = String(text || '').match(/^#+\s*(.+)$/m)?.[1] || ''
    return /第\s*\d+\s*章/.test(heading) || /第\s*\d+\s*章/.test(text)
  }

  for (const gate of input.contract.gates) {
    if (gate === 'require_reviewer_agents') {
      results.push({ gate, ok: true, message: 'checked before start' })
      continue
    }
    if (gate === 'write_outside_scope') continue
    if (gate === 'reject_chapter_text_artifact') {
      const hit = input.artifacts.some(a => a.artifact_kind === 'chapter_text')
        || changedPaths.some(p => p.startsWith('正文/'))
      results.push(hit ? { gate, ok: false, code: 'REJECT_CHAPTER_TEXT' } : { gate, ok: true })
      continue
    }
    if (gate === 'reject_outline_artifact') {
      const hit = input.artifacts.some(a => a.artifact_kind === 'outline_doc')
        || changedPaths.some(p => p.startsWith('大纲/'))
      results.push(hit ? { gate, ok: false, code: 'REJECT_OUTLINE' } : { gate, ok: true })
      continue
    }
    if (gate === 'require_outline_mix') {
      const outlineDocs = input.artifacts.filter(a => a.artifact_kind === 'outline_doc')
      const withNo = outlineDocs.filter(a => hasChapterParse(a)).length
      const withoutNo = outlineDocs.length - withNo
      if (withNo >= 1 && withoutNo >= 1) results.push({ gate, ok: true })
      else results.push({ gate, ok: false, code: 'KIND_COUNT_BELOW_MIN', message: `细纲 ${withNo} / 总纲 ${withoutNo}` })
      continue
    }
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
  const verb = resolveContractVerb(input.contract as any)
  const template = verb ? getVerbTemplate(verb) : null
  if (template) {
    for (const need of template.required_kinds) {
      const count = input.artifacts.filter(a => a.artifact_kind === need.kind).length
      if (count < need.min) {
        results.push({ gate: 'kind_count', ok: false, code: 'KIND_COUNT_BELOW_MIN', message: `${need.kind} ${count}/${need.min}` })
      }
    }
  }
  const failed = results.find(r => !r.ok)
  const failedCode = failed?.code || null
  const failedStatus: 'gated' | 'failed' | null = failedCode
    ? (failedCode === 'KIND_COUNT_BELOW_MIN' ? 'failed' : 'gated')
    : null
  return { results, failedCode, failedStatus }
}
