import {
  listNovelChapters,
  updateNovelChapter,
} from '../../novel'
import {
  collectPlanAlignmentPatchesAfterProseChange,
  collectProjectPlanAlignmentPatches,
} from '../../novel-writing/chapter-plan-from-prose'

export type PostCommitWarning = { stage: string; message: string }

export function createPostCommitWarningRunner(
  formatAdmissionError: (error: any, maxLength?: number) => string,
) {
  const warnings: PostCommitWarning[] = []
  const runPostCommitBestEffort = async (stage: string, task: () => any | Promise<any>) => {
    try {
      await task()
      return true
    } catch (error) {
      warnings.push({ stage, message: formatAdmissionError(error, 300) })
      return false
    }
  }
  return { warnings, runPostCommitBestEffort }
}

export function resolveReturnedAdmissionStatus(baseStatus: string, warnings: PostCommitWarning[]) {
  return warnings.length > 0 && baseStatus === 'accepted'
    ? 'accepted_with_warnings'
    : baseStatus
}

export async function applyPostCommitAdmissionWarnings(args: {
  warnings: PostCommitWarning[]
  proseAdmission: any
  returnedAdmissionStatus: string
  mergeChapterRawPayload: (...args: any[]) => any
  activeWorkspace: string
  chapterId: number
  formatAdmissionError: (error: any, maxLength?: number) => string
  chapterLike: any
}) {
  const {
    warnings,
    proseAdmission,
    returnedAdmissionStatus,
    mergeChapterRawPayload,
    activeWorkspace,
    chapterId,
    formatAdmissionError,
    chapterLike,
  } = args
  if (warnings.length === 0) return chapterLike

  const finalAdmission = {
    ...proseAdmission,
    status: returnedAdmissionStatus,
    post_commit_warnings: warnings,
  }
  let persistedRawPayload: any = null
  try {
    persistedRawPayload = await mergeChapterRawPayload(activeWorkspace, chapterId, {
      prose_admission: finalAdmission,
      proseAdmission: finalAdmission,
    })
  } catch (error) {
    warnings.push({ stage: 'admission_metadata', message: formatAdmissionError(error, 300) })
  }

  return {
    ...chapterLike,
    raw_payload: {
      ...(persistedRawPayload || chapterLike?.raw_payload || {}),
      ...(!persistedRawPayload ? {
        prose_admission: finalAdmission,
        proseAdmission: finalAdmission,
      } : {}),
    },
  }
}

export async function resyncChapterPlanAlignmentAfterProseStore(args: {
  activeWorkspace: string
  projectId: number
  chapter: any
  chapterPatch: any
  updated: any
  source: string
  includeProjectAlign?: boolean
  projectAlignSource?: string
}) {
  const {
    activeWorkspace,
    projectId,
    chapter,
    chapterPatch,
    source,
    includeProjectAlign = false,
    projectAlignSource,
  } = args
  let updated = args.updated
  const allChapters = await listNovelChapters(activeWorkspace, projectId)
  const previousForLedger = { ...chapter, ...chapterPatch, ...(updated || {}) }
  const alignment = collectPlanAlignmentPatchesAfterProseChange(allChapters, previousForLedger, {
    force: true,
    source,
    followLimit: 5,
    alignWrittenFollowers: true,
  })
  for (const item of alignment.patches) {
    const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
    if (Number(item.chapter_id) === Number(previousForLedger.id || chapter.id || updated?.id)) {
      updated = patched
    }
  }

  if (!includeProjectAlign) return updated

  const refreshed = await listNovelChapters(activeWorkspace, projectId)
  const projectAlign = collectProjectPlanAlignmentPatches(refreshed, {
    source: projectAlignSource || `${source}_project_align`,
    onlyFromChapterNo: Math.max(1, Number(chapter.chapter_no || 1) - 1),
    followLimit: 2,
  })
  for (const item of projectAlign.patches) {
    const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
    if (Number(item.chapter_id) === Number(previousForLedger.id || chapter.id || updated?.id)) {
      updated = patched
    }
  }
  return updated
}
