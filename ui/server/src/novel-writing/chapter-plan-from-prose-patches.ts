import {
  collectFollowingChapterProgressResyncPatches,
} from './chapter-progress-ledger'
import {
  buildLiveContractChapterPatch,
  collectClosedBeatFamiliesFromChapters,
} from './closed-beat-canon'
import {
  asArray,
  compactText,
  isCleanPlanPhrase,
  normalizePlanPunctuation,
  rebuildChapterPlanFromAcceptedProse,
} from './chapter-plan-from-prose-core'

export function buildCurrentChapterPlanAlignment(
  allChapters: any[] = [],
  changedChapter: any = {},
  options: { force?: boolean; source?: string } = {},
) {
  const force = options.force !== false
  const source = options.source || 'post_prose_change'
  const orderedEarly = asArray(allChapters)
    .slice()
    .sort((a: any, b: any) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const changedNo = Number(changedChapter?.chapter_no || 0) || 0
  const previousForRebuild = orderedEarly.filter((item: any) => {
    const no = Number(item?.chapter_no || 0)
    return no > 0 && no < changedNo && Boolean(String(item?.chapter_text || item?.chapterText || '').trim())
  })
  const current = rebuildChapterPlanFromAcceptedProse(changedChapter, {
    force,
    source,
    previousChapters: previousForRebuild,
  })
  let alignedChapter = {
    ...changedChapter,
    ...current.chapter_patch,
    raw_payload: {
      ...(changedChapter?.raw_payload || {}),
      ...(current.chapter_patch?.raw_payload || {}),
    },
  }

  // Apply live-contract cleanup using previous written chapters as closed canon.
  const ordered = asArray(allChapters)
    .slice()
    .sort((a: any, b: any) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const currentNo = Number(alignedChapter?.chapter_no || changedChapter?.chapter_no || 0) || 0
  const previousWritten = ordered.filter((item: any) => {
    const no = Number(item?.chapter_no || 0)
    const hasProse = Boolean(String(item?.chapter_text || item?.chapterText || '').trim())
    return no > 0 && no < currentNo && hasProse
  })
  const closedHistory = collectClosedBeatFamiliesFromChapters(previousWritten)
  const live = buildLiveContractChapterPatch(alignedChapter, {
    previousChapters: previousWritten,
    closedBeats: closedHistory,
  })
  if (live.changed) {
    // Written chapters: keep prose-aligned label goals if they are already clean.
    // Live contract should strip dead/zombie seeds, not replace delivered arc with next-seed language.
    const hasProse = Boolean(String(alignedChapter?.chapter_text || alignedChapter?.chapterText || '').trim())
    const proseGoal = compactText(current.chapter_patch?.chapter_goal || '', 220)
    const liveGoal = compactText(live.patch?.chapter_goal || '', 220)
    const proseGoalClean = proseGoal
      && !/十点邻居敲门借火|主动开门迎敌|清场倒计时|章末留下/.test(proseGoal)
      && proseGoal.split(/[。；;]/).filter(Boolean).every(part => isCleanPlanPhrase(part) || /^本章兑现：|^章末未解：/.test(part))
    const liveLooksForwardOnly = /下一章主驱动|承接上一章真正未解决|禁止回放已关闭/.test(liveGoal)
      && !/本章兑现：/.test(liveGoal)
    const preferProseGoal = hasProse && proseGoalClean && liveLooksForwardOnly

    const mergedPatch = preferProseGoal
      ? {
          ...live.patch,
          chapter_goal: proseGoal,
          chapter_summary: compactText(proseGoal, 220),
          conflict: compactText(current.chapter_patch?.conflict || live.patch?.conflict || '', 180),
          ending_hook: normalizePlanPunctuation(current.chapter_patch?.ending_hook || live.patch?.ending_hook || '', 180),
          raw_payload: {
            ...(live.patch.raw_payload || {}),
            plan_prefer_prose_delivered_goal: true,
            pre_draft_brief: {
              ...((live.patch.raw_payload || {}).pre_draft_brief || {}),
              chapter_goal: proseGoal,
              goal: proseGoal,
              core_conflict: compactText(current.chapter_patch?.conflict || live.patch?.conflict || '', 180),
              conflict: compactText(current.chapter_patch?.conflict || live.patch?.conflict || '', 180),
            },
          },
        }
      : live.patch

    alignedChapter = {
      ...alignedChapter,
      ...mergedPatch,
      raw_payload: {
        ...(alignedChapter.raw_payload || {}),
        ...(mergedPatch.raw_payload || {}),
      },
    }
    // merge live into current patch surface
    current.chapter_patch = {
      ...(current.chapter_patch || {}),
      ...mergedPatch,
      raw_payload: {
        ...(current.chapter_patch?.raw_payload || {}),
        ...(mergedPatch.raw_payload || {}),
      },
    }
    current.rebuilt = true
    current.reason = `${current.reason || 'rebuilt'}+live_contract${preferProseGoal ? '+prefer_prose_goal' : ''}`
  }

  return {
    chapter_id: Number(changedChapter.id),
    chapter_no: Number(alignedChapter.chapter_no || 0),
    patch: current.chapter_patch || {},
    rebuilt: Boolean(current.rebuilt),
    reason: String(current.reason || ''),
    mismatch: current.mismatch,
    plan_alignment: current.plan_alignment,
    alignedChapter,
  }
}

export function collectPlanAlignmentPatchesAfterProseChange(
  allChapters: any[] = [],
  changedChapter: any = {},
  options: { force?: boolean; source?: string; followLimit?: number; alignWrittenFollowers?: boolean } = {},
) {
  const force = options.force !== false
  const source = options.source || 'post_prose_change'
  const followLimit = Math.max(1, Number(options.followLimit ?? 5) || 5)
  const alignWrittenFollowers = options.alignWrittenFollowers !== false
  const currentAlignment = buildCurrentChapterPlanAlignment(allChapters, changedChapter, { force, source })
  const current = {
    rebuilt: currentAlignment.rebuilt,
    reason: currentAlignment.reason,
    mismatch: currentAlignment.mismatch,
    chapter_patch: currentAlignment.patch,
    plan_alignment: currentAlignment.plan_alignment,
  }
  const alignedChapter = currentAlignment.alignedChapter
  const ordered = asArray(allChapters)
    .slice()
    .sort((a: any, b: any) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const currentNo = Number(alignedChapter?.chapter_no || changedChapter?.chapter_no || 0) || 0
  const previousWritten = ordered.filter((item: any) => {
    const no = Number(item?.chapter_no || 0)
    const hasProse = Boolean(String(item?.chapter_text || item?.chapterText || '').trim())
    return no > 0 && no < currentNo && hasProse
  })
  const closedHistory = collectClosedBeatFamiliesFromChapters(previousWritten)

  const patches: Array<{ chapter_id: number; chapter_no?: number; patch: Record<string, any>; kind: string }> = []
  if (current.rebuilt || Object.keys(current.chapter_patch || {}).length) {
    const id = Number(changedChapter?.id || alignedChapter?.id || 0)
    if (id) {
      patches.push({
        chapter_id: id,
        chapter_no: currentNo || undefined,
        patch: current.chapter_patch,
        kind: 'current_plan_from_prose',
      })
    }
  }

  // Progress-resync unwritten/next seeds from the aligned current chapter.
  const following = collectFollowingChapterProgressResyncPatches(
    ordered,
    alignedChapter,
    {
      limit: followLimit,
      // Do not let earlier chapters' resync overwrite later written chapters' prose-aligned plans.
      updateWrittenSeeds: alignWrittenFollowers,
      force: Boolean(current.rebuilt || force),
    },
  )
  const touched = new Set<number>()
  for (const item of following) {
    const chapterNo = Number(
      ordered.find((ch: any) => Number(ch?.id) === Number(item.chapter_id))?.chapter_no || 0,
    ) || undefined
    patches.push({
      chapter_id: item.chapter_id,
      chapter_no: chapterNo,
      patch: item.patch,
      kind: 'following_progress_resync',
    })
    touched.add(Number(item.chapter_id))
  }

  // Written followers: rebuild from their own prose + strip dead goals against history through current.
  if (alignWrittenFollowers && currentNo) {
    const followers = ordered
      .filter((item: any) => Number(item?.chapter_no || 0) > currentNo)
      .slice(0, followLimit)
    let history = [...previousWritten, alignedChapter]
    for (const follower of followers) {
      const fid = Number(follower?.id || 0)
      const fno = Number(follower?.chapter_no || 0)
      const ftext = String(follower?.chapter_text || follower?.chapterText || '').trim()
      if (!fid) continue
      if (!ftext) {
        // unwritten: already handled by following resync; optionally live-strip residual seeds
        const closed = collectClosedBeatFamiliesFromChapters(history)
        const liveNext = buildLiveContractChapterPatch(follower, {
          previousChapters: history,
          closedBeats: closed,
        })
        if (liveNext.changed) {
          const existing = patches.find(item => Number(item.chapter_id) === fid)
          if (existing) {
            existing.patch = {
              ...existing.patch,
              ...liveNext.patch,
              raw_payload: {
                ...(existing.patch?.raw_payload || {}),
                ...(liveNext.patch.raw_payload || {}),
              },
            }
            existing.kind = 'following_progress_resync+live_contract'
          } else {
            patches.push({
              chapter_id: fid,
              chapter_no: fno || undefined,
              patch: liveNext.patch,
              kind: 'following_live_contract',
            })
          }
        }
        continue
      }

      const rebuilt = rebuildChapterPlanFromAcceptedProse(follower, {
        force: true,
        source: `${source}:follower_align`,
        previousChapters: history,
      })
      let nextChapter = {
        ...follower,
        ...rebuilt.chapter_patch,
        raw_payload: {
          ...(follower?.raw_payload || {}),
          ...(rebuilt.chapter_patch?.raw_payload || {}),
        },
      }
      const closed = collectClosedBeatFamiliesFromChapters(history)
      const liveFollow = buildLiveContractChapterPatch(nextChapter, {
        previousChapters: history,
        closedBeats: closed,
      })
      if (liveFollow.changed) {
        nextChapter = {
          ...nextChapter,
          ...liveFollow.patch,
          raw_payload: {
            ...(nextChapter.raw_payload || {}),
            ...(liveFollow.patch.raw_payload || {}),
          },
        }
      }
      const patch = {
        ...(rebuilt.chapter_patch || {}),
        ...(liveFollow.changed ? liveFollow.patch : {}),
        raw_payload: {
          ...(rebuilt.chapter_patch?.raw_payload || {}),
          ...(liveFollow.changed ? liveFollow.patch.raw_payload : {}),
          plan_auto_aligned_at: new Date().toISOString(),
          plan_auto_aligned_source: source,
        },
      }
      // If already touched by following resync, replace with stronger prose rebuild.
      const existingIdx = patches.findIndex(item => Number(item.chapter_id) === fid)
      if (existingIdx >= 0) {
        patches[existingIdx] = {
          chapter_id: fid,
          chapter_no: fno || undefined,
          patch,
          kind: 'following_written_plan_from_prose',
        }
      } else {
        patches.push({
          chapter_id: fid,
          chapter_no: fno || undefined,
          patch,
          kind: 'following_written_plan_from_prose',
        })
      }
      history = [...history, nextChapter]
    }
  }

  return {
    current,
    alignedChapter,
    patches,
    following_count: patches.filter(item => item.kind !== 'current_plan_from_prose').length,
    closed_families: closedHistory.map(item => item.family),
  }
}

/**
 * Full-project catch-up: for every written chapter, ensure task-book matches prose
 * and cascade live seeds forward. Safe: never rewrites chapter_text.
 */
export function collectProjectPlanAlignmentPatches(
  allChapters: any[] = [],
  options: { source?: string; followLimit?: number; onlyFromChapterNo?: number } = {},
) {
  const ordered = asArray(allChapters)
    .slice()
    .sort((a: any, b: any) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
  const written = ordered.filter((item: any) => String(item?.chapter_text || item?.chapterText || '').trim())
  const minNo = Number(options.onlyFromChapterNo || 0) || 0
  const targets = written.filter((item: any) => Number(item?.chapter_no || 0) >= minNo)
  const byId = new Map<number, { chapter_id: number; chapter_no?: number; patch: Record<string, any>; kind: string }>()

  for (const chapter of targets) {
    const bag = collectPlanAlignmentPatchesAfterProseChange(ordered, chapter, {
      force: true,
      source: options.source || 'project_plan_align',
      followLimit: options.followLimit ?? 2,
      alignWrittenFollowers: false,
    })
    for (const item of bag.patches) {
      // later chapters overwrite earlier patches for same id (more up-to-date history)
      byId.set(Number(item.chapter_id), item)
    }
    // keep ordered list fresh for subsequent iterations
    for (const item of bag.patches) {
      const idx = ordered.findIndex((ch: any) => Number(ch?.id) === Number(item.chapter_id))
      if (idx >= 0) {
        ordered[idx] = {
          ...ordered[idx],
          ...item.patch,
          raw_payload: {
            ...(ordered[idx]?.raw_payload || {}),
            ...(item.patch?.raw_payload || {}),
          },
        }
      }
    }
  }

  // Final pass: live-contract strip all chapters against cumulative closed canon.
  const closedAll = collectClosedBeatFamiliesFromChapters(ordered.filter((item: any) => String(item?.chapter_text || '').trim()))
  for (const chapter of ordered) {
    const id = Number(chapter?.id || 0)
    if (!id) continue
    const previous = ordered.filter((item: any) => Number(item?.chapter_no || 0) < Number(chapter?.chapter_no || 0))
    const live = buildLiveContractChapterPatch(chapter, {
      previousChapters: previous,
      closedBeats: collectClosedBeatFamiliesFromChapters(previous.filter((item: any) => String(item?.chapter_text || '').trim())),
    })
    if (!live.changed) continue
    const prevPatch = byId.get(id)
    byId.set(id, {
      chapter_id: id,
      chapter_no: Number(chapter?.chapter_no || 0) || undefined,
      patch: {
        ...(prevPatch?.patch || {}),
        ...live.patch,
        raw_payload: {
          ...(prevPatch?.patch?.raw_payload || {}),
          ...(live.patch.raw_payload || {}),
          project_plan_aligned_at: new Date().toISOString(),
        },
      },
      kind: prevPatch ? `${prevPatch.kind}+live_contract` : 'project_live_contract',
    })
  }

  const patches = [...byId.values()].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  return {
    version: 'project_plan_align_v1',
    patches,
    patch_count: patches.length,
    closed_families: closedAll.map(item => item.family),
    written_count: written.length,
  }
}
