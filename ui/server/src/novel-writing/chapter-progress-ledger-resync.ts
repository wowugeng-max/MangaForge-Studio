import { decontaminateChapterSeedFields, extractDeliveredClimaxLandings, extractPrimaryEndingHooks } from './chapter-continuity-guard'
import {
  detectClosedBeatsInChapter,
  shouldSuppressOpenHook,
  closedFamilyLabels,
  buildLiveChapterContract,
  sanitizeHookList,
  isFamilyClosed,
} from './closed-beat-canon'
import { anchorMatchScore } from './text-matching'
import {
  compactText,
  asArray,
  uniqueTexts,
  splitPlanBeats,
  isActionableBeat,
  clusterHits,
  sharesProgressCluster,
  proseCoversBeat,
  OVERLAP_SCORE,
  resolveChapterProgressLedger,
  readChapterProgressLedger,
  detectPlanOverlap,
  isCleanProgressPhrase,
  type ChapterProgressLedger,
  type PlanOverlapReport,
} from './chapter-progress-ledger-core'

function previousLandingIsLateInterior(previousText: string) {
  const tail = String(previousText || '').slice(Math.max(0, String(previousText || '').length - 900))
  return /青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门|门内)|干瘪尸体.{0,8}吊挂/.test(tail)
}

function isStaleAgainstLateInterior(item: string) {
  const text = compactText(item)
  if (!text) return false
  // Once prose has crashed into building interior, these early drivers are no longer live forward seeds.
  if (/电梯|未定义区域|无脸/.test(text) && !/血肉王座|青铜巨门|门内/.test(text)) return true
  if (/1号楼通行证去向|通行证去向/.test(text) && !/血肉王座|青铜巨门|内部/.test(text)) return true
  if (/物业合规清场倒计时|清场倒计时/.test(text)) return true
  if (/十点邻居敲门|借火|主动开门迎敌/.test(text)) return true
  return false
}


function buildResyncedGoal(ledger: ChapterProgressLedger, originalGoal: string, overlap: PlanOverlapReport) {
  const forward = uniqueTexts([
    ...ledger.unresolved_next,
    ...ledger.overshot_into_future,
    ...overlap.remaining_plan_beats,
  ], 8).filter(isCleanProgressPhrase).slice(0, 4)
  if (!forward.length) {
    return compactText(
      '承接上一章已兑现进度，向前推进真正未解决钩子，禁止回放已关闭冲突。',
      220,
    )
  }
  const forbid = uniqueTexts(overlap.overlapping_beats.length ? overlap.overlapping_beats : ledger.forbidden_replays, 6)
    .filter(item => {
      // Only forbid truly closed replay pressures, never live forward drivers or meta negations.
      if (/不回收|主驱动|优先推进|承接上一章|1号楼通行证去向|电梯\/未定义|居委会|王奶奶/.test(item) && !/借火|清场倒计时|主动开门迎敌|倒汤|耳光|利爪/.test(item)) return false
      return /倒汤|耳光|借火|清场倒计时|主动开门迎敌|利爪|热汤淋头|爸爸暴走|邻里借贷/.test(item)
    })
    .map(item => compactText(item, 24))
    .slice(0, 3)
  const forwardText = forward.join('；')
  const forbidText = forbid.length ? `；禁止回放：${forbid.join('、')}` : ''
  return compactText(`承接上一章进度，优先推进：${forwardText}${forbidText}`, 240)
}

export type ProgressResyncResult = {
  resynced: boolean
  plan_stale: boolean
  overlap_score: number
  overlapping_beats: string[]
  chapter_goal?: string
  chapter_summary?: string
  conflict?: string
  must_advance: string[]
  forbidden_repeats: string[]
  progress_resync: {
    version: 'chapter_progress_resync_v1'
    plan_stale: boolean
    overlap_score: number
    overlapping_beats: string[]
    applied_from_chapter?: number
    source_ledger_confidence: number
    reason: string
  } | null
  target_patch: Record<string, any>
  chapter_patch: Record<string, any>
}

export function applyProgressResyncToChapterPlan(
  nextChapter: any = {},
  previousLedger: ChapterProgressLedger | null | undefined,
  options: { previousChapterNo?: number; previousChapterText?: any; force?: boolean } = {},
): ProgressResyncResult {
  const goal = compactText(nextChapter?.chapter_goal || nextChapter?.chapterGoal || nextChapter?.goal || '')
  const summary = compactText(nextChapter?.chapter_summary || nextChapter?.chapterSummary || nextChapter?.summary || '')
  const conflict = compactText(nextChapter?.conflict || '')
  const endingHook = compactText(nextChapter?.ending_hook || nextChapter?.endingHook || '')
  const existingMust = uniqueTexts(nextChapter?.must_advance || nextChapter?.mustAdvance || nextChapter?.raw_payload?.must_advance, 12)
  const existingForbidden = uniqueTexts(
    nextChapter?.forbidden_repeats
    || nextChapter?.forbiddenRepeats
    || nextChapter?.raw_payload?.forbidden_repeats
    || nextChapter?.raw_payload?.forbiddenRepeats,
    12,
  )

  const overlap = detectPlanOverlap(previousLedger, {
    goal,
    summary,
    conflict,
    ending_hook: endingHook,
    must_advance: existingMust,
  }, {
    previousChapterText: options.previousChapterText,
  })

  if (!previousLedger || (!overlap.plan_stale && !options.force)) {
    return {
      resynced: false,
      plan_stale: false,
      overlap_score: overlap.overlap_score,
      overlapping_beats: overlap.overlapping_beats,
      must_advance: existingMust,
      forbidden_repeats: existingForbidden,
      progress_resync: null,
      target_patch: {},
      chapter_patch: {},
    }
  }

  const forbidden_repeats = uniqueTexts([
    ...existingForbidden,
    ...asArray(previousLedger.forbidden_replays),
    ...overlap.overlapping_beats.map(beat => `不要回放已兑现冲突：${beat}`),
  ], 16)

  const previousClosedForHooks = detectClosedBeatsInChapter({
    chapter_text: options.previousChapterText || '',
    chapter_no: options.previousChapterNo || 0,
    raw_payload: { chapter_progress_ledger: previousLedger },
  })
  const sanitizedPreviousUnresolved = sanitizeHookList(previousLedger.unresolved_next || [], previousClosedForHooks, 8)
  const must_advance_raw = uniqueTexts([
    ...asArray(sanitizedPreviousUnresolved),
    ...asArray(previousLedger.overshot_into_future).filter(item => !/真正的掌权者|倒在了“爸爸”|倒在爸爸/.test(item) || /敲门|邻居|再盛|空碗|钥匙/.test(item)),
    ...overlap.remaining_plan_beats.filter(item => !proseCoversBeat(item, String(options.previousChapterText || ''))),
    // Keep non-overlapping existing advances.
    ...existingMust.filter(item => {
      if (overlap.overlapping_beats.some(done => anchorMatchScore(item, done).score >= OVERLAP_SCORE || sharesProgressCluster(item, done))) return false
      if (proseCoversBeat(item, String(options.previousChapterText || ''))) return false
      return true
    }),
  ], 12).filter(item => {
    if (!isCleanProgressPhrase(item)) return false
    // Final guard: no dining-fight replay once that cluster is closed.
    if (overlap.overlapping_beats.some(done => sharesProgressCluster(done, '爸爸倒汤暴怒耳光')) && clusterHits(item).includes('dining_fight') && !/敲门|邻居|再盛|空碗/.test(item)) {
      return /敲门|邻居|十点|再盛|空碗|钥匙|门外/.test(item)
    }
    return true
  })

  const previousLandingText = String(options.previousChapterText || '')
  const lateInteriorLanding = previousLandingIsLateInterior(previousLandingText)
  const sanitizedUnresolvedLive = sanitizedPreviousUnresolved.filter(item => !(lateInteriorLanding && isStaleAgainstLateInterior(item)))
  const remainingLive = overlap.remaining_plan_beats.filter(item => !(lateInteriorLanding && isStaleAgainstLateInterior(item)))
  const must_advance = (must_advance_raw.filter(item => !(lateInteriorLanding && isStaleAgainstLateInterior(item))).length
    ? must_advance_raw.filter(item => !(lateInteriorLanding && isStaleAgainstLateInterior(item)))
    : sanitizedUnresolvedLive)
  const liveLedgerForGoal: ChapterProgressLedger = {
    ...previousLedger,
    unresolved_next: sanitizedUnresolvedLive.length
      ? sanitizedUnresolvedLive
      : previousLedger.unresolved_next.filter(item => !(lateInteriorLanding && isStaleAgainstLateInterior(item))),
  }
  const liveOverlap = {
    ...overlap,
    remaining_plan_beats: remainingLive,
  }

  let nextGoal = buildResyncedGoal(liveLedgerForGoal, goal, liveOverlap)
  let nextSummary = buildResyncedGoal(liveLedgerForGoal, summary || goal, liveOverlap)
  let nextConflict = uniqueTexts([
    ...liveLedgerForGoal.unresolved_next.slice(0, 2),
    ...remainingLive.filter(item => !clusterHits(item).includes('dining_fight') || /敲门|邻居|再盛/.test(item)).slice(0, 2),
  ], 3).join('；') || compactText(`承接上一章未解决钩子，禁止重演：${overlap.overlapping_beats.slice(0, 2).join('、')}`, 180)

  // Drop recycled early-chapter seed chains when previous ending already moved on.
  const cleaned = decontaminateChapterSeedFields({
    chapter_goal: nextGoal,
    chapter_summary: nextSummary,
    conflict: nextConflict,
    must_advance,
    previousChapter: {
      chapter_text: options.previousChapterText,
      ending_hook: asArray(previousLedger.unresolved_next).join('；'),
      chapter_goal: '',
    },
  })
  if (cleaned.decontaminated || extractPrimaryEndingHooks({
    chapter_text: options.previousChapterText,
    ending_hook: asArray(previousLedger.unresolved_next).join('；'),
  }).length) {
    nextGoal = cleaned.chapter_goal || nextGoal
    nextSummary = cleaned.chapter_summary || nextSummary
    nextConflict = cleaned.conflict || nextConflict
  }

  // Strip closed beat families (e.g. 借火邻居 already refined) from next-chapter seeds.
  const previousClosed = detectClosedBeatsInChapter({
    chapter_text: options.previousChapterText || '',
    chapter_no: options.previousChapterNo || 0,
    raw_payload: { chapter_progress_ledger: previousLedger },
  })
  if (previousClosed.length) {
    const live = buildLiveChapterContract({
      chapter: {
        chapter_goal: nextGoal,
        chapter_summary: nextSummary,
        conflict: nextConflict,
        ending_hook: endingHook,
      },
      previousChapter: {
        chapter_no: options.previousChapterNo || 0,
        chapter_text: options.previousChapterText || '',
        ending_hook: asArray(previousLedger.unresolved_next).join('；'),
        raw_payload: { chapter_progress_ledger: previousLedger },
      },
      closedBeats: previousClosed,
    })
    if (live.closed_blocked.length || live.plan_health !== 'aligned') {
      nextGoal = live.live_goals.join('。') || nextGoal
      nextSummary = compactText(nextGoal, 220)
      nextConflict = live.live_conflict || nextConflict
    }
  }

  const progress_resync = {
    version: 'chapter_progress_resync_v1' as const,
    plan_stale: true,
    overlap_score: overlap.overlap_score,
    overlapping_beats: overlap.overlapping_beats,
    applied_from_chapter: options.previousChapterNo,
    source_ledger_confidence: previousLedger.confidence,
    reason: '上一章正文已兑现本章种子冲突，章纲按正文主时间线滚动前移',
  }

  const hard_rules = uniqueTexts([
    ...must_advance.slice(0, 4).map(item => `本章必须推进：${item}`),
    ...forbidden_repeats.slice(0, 6).map(item => item.startsWith('不要') || item.startsWith('禁止') ? item : `禁止回放：${item}`),
    '正文主时间线优先：不得回放上一章已兑现的高潮冲突，只能承接未解决钩子继续向前。',
  ], 12)

  const target_patch = {
    goal: nextGoal,
    chapter_goal: nextGoal,
    summary: nextSummary,
    chapter_summary: nextSummary,
    conflict: nextConflict,
    must_advance,
    forbidden_repeats,
    progress_resync,
    plan_stale: true,
    progress_resync_hard_rules: hard_rules,
  }

  const rawPayload = {
    ...(nextChapter?.raw_payload || nextChapter?.rawPayload || {}),
    must_advance,
    forbidden_repeats,
    progress_resync,
    plan_stale: true,
    chapter_goal_seed_before_resync: goal || undefined,
    chapter_summary_seed_before_resync: summary || undefined,
    conflict_seed_before_resync: conflict || undefined,
  }

  // For unwritten followers: align seeds to previous progress.
  // IMPORTANT: if previous already delivered a climax landing (e.g. crashed into building interior),
  // do NOT copy that climax paragraph as this chapter's ending_hook — that steers the model to rewrite it.
  const previousText = String(options.previousChapterText || '')
  const deliveredLandings = extractDeliveredClimaxLandings({
    chapter_text: previousText,
    ending_hook: previousText.slice(-180),
  })
  const interiorLanding = deliveredLandings.find(item => item.key === 'building_one_interior_entry') || null
  const previousTailParas = String(previousText || '')
    .split(/\n\s*\n/)
    .map(item => compactText(item, 240))
    .filter(Boolean)
  const previousTrueEnding = compactText(
    previousTailParas.slice(-1)[0]
      || previousTailParas.slice(-2).join('。')
      || previousText.slice(Math.max(0, previousText.length - 220)),
    180,
  ).replace(/^[的了在把被与和及底中与“"『「]+/, '')
  const unwritten = !compactText(nextChapter?.chapter_text || nextChapter?.chapterText || '', 8)
  const brokenEnding = Boolean(endingHook && (/^[的了在把被与和及底中与]|“轰！”|异变的特权卡/.test(endingHook) || endingHook.length > 120))
  const outlineLikeEnding = Boolean(
    endingHook
    && (
      endingHook.length > 48
      || /替罪羊|同盟|草偶|无头保安|红衣保安|假的终究是假的|膝撞|锈迹斑斑|特权卡|撞进了那片未知/.test(endingHook)
      || brokenEnding
    )
  )

  if (interiorLanding && unwritten) {
    // Force post-landing goal/conflict; forbid re-entry settlement.
    nextGoal = compactText(
      `承接上一章已完成「${interiorLanding.label}」后的门内进度，优先推进：1号楼内部/血肉王座压力；同行天选者处置；禁止回放特权卡撞门入内`,
      240,
    )
    nextSummary = compactText(nextGoal, 220)
    nextConflict = '1号楼内部/血肉王座压力；门内未知规则'
    must_advance.splice(0, must_advance.length, ...uniqueTexts([
      '1号楼内部/血肉王座压力',
      '同行天选者处置',
      '门内规则压力',
    ], 6))
    forbidden_repeats.splice(0, forbidden_repeats.length, ...uniqueTexts([
      ...interiorLanding.forbidden_replays.map(item => `不要回放：${item}`),
      '不要回放上一章已完成的青铜巨门突入结算',
      '不要回放门外清场倒计时逼入门',
      '不要回放无头保安通道围杀到进门',
    ], 16))
  }

  // When previous true-ending is a later forward hook, do not keep stale earlier seeds.
  const previousTrueHooks = extractPrimaryEndingHooks({
    chapter_text: previousText,
    ending_hook: previousTrueEnding || previousText.slice(-180),
  })
  const primaryForwardHook = previousTrueHooks[0] || null
  const seekerHook = primaryForwardHook?.key === 'building_two_seeker' ? primaryForwardHook : null
  const abyssHook = primaryForwardHook && ['deep_abyss_descent', 'true_ending_forward'].includes(primaryForwardHook.key)
    ? primaryForwardHook
    : (previousTrueHooks.find(item => ['deep_abyss_descent', 'true_ending_forward'].includes(item.key)) || null)

  if (abyssHook && unwritten && !interiorLanding) {
    nextGoal = compactText(
      `承接上一章章末「${abyssHook.label}」：${compactText(abyssHook.evidence || previousTrueEnding, 120)}；优先推进深渊/未知正主压力，禁止回退到已关闭的2号楼寻找者或门外突入线`,
      240,
    )
    nextSummary = compactText(nextGoal, 220)
    nextConflict = '地下深渊未知正主；规则压迫与存活推进'
    must_advance.splice(0, must_advance.length, ...uniqueTexts([
      '深渊/未知正主压力',
      '坠落后果与规则压迫',
      '向前突破而非回放已关闭线',
    ], 6))
    forbidden_repeats.splice(0, forbidden_repeats.length, ...uniqueTexts([
      '不要回放2号楼寻找者/保安队长抹杀对峙整段',
      '不要回放特权卡撞开青铜巨门入内',
      '不要回放无头保安通道围杀到进门',
      '不要把章末钩子回退成1号楼内部/血肉王座冷开场',
      '不要重开已关闭的中段平行线',
    ], 16))
  } else if (seekerHook && unwritten && !interiorLanding) {
    nextGoal = compactText(
      `承接上一章章末「${seekerHook.label}」：优先应对2号楼寻找者/保安队长抹杀压力与规则对峙；禁止回放门外撞门突入与已结束的中段场景`,
      240,
    )
    nextSummary = compactText(nextGoal, 220)
    nextConflict = '2号楼寻找者抹杀对峙；门内规则压力'
    must_advance.splice(0, must_advance.length, ...uniqueTexts([
      '2号楼寻找者/保安队长抹杀压力',
      '规则对峙与代价释放',
      '门内存活与下一步突破',
    ], 6))
    forbidden_repeats.splice(0, forbidden_repeats.length, ...uniqueTexts([
      '不要回放特权卡撞开青铜巨门入内',
      '不要回放无头保安通道围杀到进门',
      '不要把章末钩子回退成1号楼内部/血肉王座冷开场',
      '不要重开已关闭的中段平行线',
    ], 16))
  }

  let nextEndingHook = endingHook
  if (unwritten) {
    if (interiorLanding) {
      // Post-state seed, not a second copy of the crash climax.
      nextEndingHook = compactText(interiorLanding.post_state, 160)
    } else if (abyssHook) {
      nextEndingHook = compactText(previousTrueEnding || abyssHook.evidence, 160)
    } else if (seekerHook) {
      nextEndingHook = compactText(previousTrueEnding || seekerHook.evidence, 160)
    } else if (
      previousTrueEnding
      && (outlineLikeEnding || !endingHook || /电梯\/未定义|1号楼通行证去向|清场倒计时|1号楼内部|血肉王座|居委会|2号楼寻找者/.test(endingHook))
    ) {
      nextEndingHook = previousTrueEnding
    }
  }

  if (nextEndingHook && nextEndingHook !== endingHook) {
    rawPayload.ending_hook_seed_before_resync = endingHook || undefined
    rawPayload.pre_draft_brief = {
      ...(rawPayload.pre_draft_brief && typeof rawPayload.pre_draft_brief === 'object' ? rawPayload.pre_draft_brief : {}),
      ending_hook: nextEndingHook,
      chapter_goal: nextGoal,
      goal: nextGoal,
      core_conflict: nextConflict,
      conflict: nextConflict,
      must_advance,
      forbidden_repeats,
      confirmed_at: null,
      confirmation_source: interiorLanding ? 'progress_resync_post_climax_landing' : 'progress_resync_from_previous_ending',
      delivered_climax_landings: deliveredLandings,
    }
    rawPayload.preDraftBrief = rawPayload.pre_draft_brief
    rawPayload.delivered_climax_landings = deliveredLandings
  } else if (interiorLanding && unwritten) {
    rawPayload.pre_draft_brief = {
      ...(rawPayload.pre_draft_brief && typeof rawPayload.pre_draft_brief === 'object' ? rawPayload.pre_draft_brief : {}),
      chapter_goal: nextGoal,
      goal: nextGoal,
      core_conflict: nextConflict,
      conflict: nextConflict,
      must_advance,
      forbidden_repeats,
      ending_hook: nextEndingHook,
      confirmed_at: null,
      confirmation_source: 'progress_resync_post_climax_landing',
      delivered_climax_landings: deliveredLandings,
    }
    rawPayload.preDraftBrief = rawPayload.pre_draft_brief
  }

  // Refresh hard rules after possible post-landing rewrite.
  const finalHardRules = uniqueTexts([
    ...must_advance.slice(0, 4).map(item => `本章必须推进：${item}`),
    ...forbidden_repeats.slice(0, 6).map(item => item.startsWith('不要') || item.startsWith('禁止') ? item : `禁止回放：${item}`),
    '正文主时间线优先：不得回放上一章已兑现的高潮冲突，只能承接未解决钩子继续向前。',
    interiorLanding ? '上一章已进入1号楼门内：开篇不得回到门外再撞一次门。' : '',
  ], 14)
  rawPayload.must_advance = must_advance
  rawPayload.forbidden_repeats = forbidden_repeats
  target_patch.goal = nextGoal
  target_patch.chapter_goal = nextGoal
  target_patch.summary = nextSummary
  target_patch.chapter_summary = nextSummary
  target_patch.conflict = nextConflict
  target_patch.must_advance = must_advance
  target_patch.forbidden_repeats = forbidden_repeats
  target_patch.progress_resync_hard_rules = finalHardRules

  const chapter_patch = {
    chapter_goal: nextGoal,
    chapter_summary: nextSummary,
    conflict: nextConflict,
    ...(nextEndingHook && nextEndingHook !== endingHook ? { ending_hook: nextEndingHook } : {}),
    ...((interiorLanding || seekerHook) && unwritten ? { ending_hook: nextEndingHook } : {}),
    raw_payload: rawPayload,
  }

  return {
    resynced: true,
    plan_stale: true,
    overlap_score: overlap.overlap_score,
    overlapping_beats: overlap.overlapping_beats,
    chapter_goal: nextGoal,
    chapter_summary: nextSummary,
    conflict: nextConflict,
    must_advance,
    forbidden_repeats,
    progress_resync,
    target_patch,
    chapter_patch,
  }
}

/** Live inject resynced plan into generation context from previous chapter ledger. */
export function enrichContextWithProgressResync(contextPackage: any = {}) {
  const context = contextPackage && typeof contextPackage === 'object' ? { ...contextPackage } : {}
  const previous = context.continuity?.previous_chapter || context.continuity?.previousChapter || {}
  const ledger = readChapterProgressLedger(previous)
    || (previous?.chapter_progress_ledger ? previous.chapter_progress_ledger : null)
    || resolveChapterProgressLedger({
      chapterText: previous?.chapter_text || previous?.chapterText || previous?.ending_excerpt || '',
      endingHook: previous?.ending_hook || previous?.endingHook || '',
      plannedGoal: previous?.chapter_goal || previous?.goal || previous?.summary || '',
      plannedSummary: previous?.chapter_summary || previous?.summary || '',
      plannedConflict: previous?.conflict || '',
      plannedMustAdvance: previous?.must_advance || previous?.raw_payload?.must_advance,
      outgoingHandoff: previous?.outgoing_handoff || previous?.outgoingHandoff || null,
    })

  if (!ledger || ledger.source === 'empty') return context

  const target = {
    ...(context.chapter_target || {}),
    ...(context.chapterTarget || {}),
  }
  // Confirmed pre_draft brief often freezes stale goal/scenes; include them in overlap detection.
  const brief = context.pre_draft_brief || context.preDraftBrief || target.pre_draft_brief || {}
  const resync = applyProgressResyncToChapterPlan({
    goal: target.goal || target.chapter_goal || brief.chapter_goal || brief.goal,
    chapter_goal: target.goal || target.chapter_goal || brief.chapter_goal || brief.goal,
    summary: target.summary || target.chapter_summary || brief.chapter_summary || brief.summary,
    chapter_summary: target.summary || target.chapter_summary || brief.chapter_summary || brief.summary,
    conflict: target.conflict || brief.core_conflict || brief.conflict,
    ending_hook: target.ending_hook || target.endingHook || brief.ending_hook,
    must_advance: target.must_advance || target.mustAdvance || brief.must_advance,
    forbidden_repeats: target.forbidden_repeats || target.forbiddenRepeats || brief.forbidden_repeats,
    raw_payload: {
      must_advance: target.must_advance,
      forbidden_repeats: target.forbidden_repeats,
    },
  }, ledger, {
    previousChapterNo: Number(previous?.chapter_no || previous?.chapterNo || 0) || undefined,
    previousChapterText: previous?.chapter_text || previous?.chapterText || previous?.ending_excerpt || '',
  })

  const previousLedgerOnContinuity = {
    ...previous,
    chapter_progress_ledger: ledger,
    chapterProgressLedger: ledger,
  }

  if (!resync.resynced) {
    const softForbidden = uniqueTexts([
      ...asArray(target.forbidden_repeats),
      ...ledger.forbidden_replays.map(beat => `不要回放已兑现冲突：${beat}`),
    ], 16)
    const softMust = uniqueTexts([
      ...asArray(target.must_advance),
      ...ledger.unresolved_next,
    ], 12)
    const softTarget = {
      ...target,
      must_advance: softMust,
      forbidden_repeats: softForbidden,
      previous_progress_ledger: ledger,
    }
    return {
      ...context,
      chapter_target: softTarget,
      chapterTarget: softTarget,
      continuity: {
        ...(context.continuity || {}),
        previous_chapter: previousLedgerOnContinuity,
      },
    }
  }

  const forward = uniqueTexts([
    ...asArray(resync.must_advance),
    ...asArray(ledger.unresolved_next),
  ], 4)
  const forwardText = forward.join('；') || '承接上一章未解决钩子继续推进'
  const sceneCards = patchSceneCardsForProgressResync(
    target.scene_cards || target.sceneCards,
    {
      forwardText,
      overlapping: resync.overlapping_beats,
      forbidden: resync.forbidden_repeats,
      previousText: previous?.chapter_text || previous?.chapterText || '',
    },
  )
  const blueprint = patchBlueprintForProgressResync(
    target.chapter_blueprint || target.chapterBlueprint,
    { forwardText, goal: resync.chapter_goal || '', conflict: resync.conflict || '' },
  )
  const openingObligations = uniqueTexts([
    ...asArray(target.opening_obligations || target.openingObligations),
    `开篇先承接上一章未解决状态：${forwardText}`,
    ...asArray(resync.target_patch?.progress_resync_hard_rules),
  ], 12)

  const mergedTarget = {
    ...target,
    ...resync.target_patch,
    scene_cards: sceneCards,
    sceneCards,
    chapter_blueprint: blueprint,
    chapterBlueprint: blueprint,
    opening_obligations: openingObligations,
    openingObligations,
    previous_progress_ledger: ledger,
  }

  // Keep confirmed brief from re-freezing stale dining seeds in later merges/prompt snapshots.
  const patchedBrief = brief && typeof brief === 'object'
    ? {
      ...brief,
      chapter_goal: resync.chapter_goal,
      goal: resync.chapter_goal,
      core_conflict: resync.conflict,
      conflict: resync.conflict,
      must_advance: resync.must_advance,
      forbidden_repeats: resync.forbidden_repeats,
      progress_resync: resync.progress_resync,
      plan_stale: true,
      scene_briefs: Array.isArray(brief.scene_briefs)
        ? patchSceneCardsForProgressResync(brief.scene_briefs, {
          forwardText,
          overlapping: resync.overlapping_beats,
          forbidden: resync.forbidden_repeats,
          previousText: previous?.chapter_text || previous?.chapterText || '',
        })
        : brief.scene_briefs,
      chapter_blueprint: patchBlueprintForProgressResync(brief.chapter_blueprint || brief.chapterBlueprint, {
        forwardText,
        goal: resync.chapter_goal || '',
        conflict: resync.conflict || '',
      }),
    }
    : brief

  return {
    ...context,
    chapter_target: mergedTarget,
    chapterTarget: mergedTarget,
    pre_draft_brief: patchedBrief || context.pre_draft_brief,
    preDraftBrief: patchedBrief || context.preDraftBrief,
    continuity: {
      ...(context.continuity || {}),
      previous_chapter: previousLedgerOnContinuity,
    },
  }
}

function sceneLooksStale(scene: any, overlapping: string[], previousText: string) {
  const text = compactText([
    scene?.purpose,
    scene?.scene_purpose,
    scene?.title,
    scene?.scene_title,
    scene?.summary,
    scene?.conflict,
    scene?.beat,
  ].filter(Boolean).join('｜'), 320)
  if (!text) return false
  if (overlapping.some(beat => anchorMatchScore(text, beat).score >= OVERLAP_SCORE || sharesProgressCluster(text, beat))) return true
  if (previousText && proseCoversBeat(text, previousText) && clusterHits(text).includes('dining_fight')) return true
  return clusterHits(text).includes('dining_fight') && /利爪|耳光|热汤|暴怒|撕碎|滚了三圈|能好好说话/.test(text)
}

export function patchSceneCardsForProgressResync(
  sceneCards: any,
  options: { forwardText: string; overlapping?: string[]; forbidden?: string[]; previousText?: string } = { forwardText: '' },
) {
  const cards = asArray(sceneCards)
  if (!cards.length) return cards
  const overlapping = asArray(options.overlapping)
  const previousText = String(options.previousText || '')
  return cards.map((card: any, index: number) => {
    if (!card || typeof card !== 'object') return card
    if (!sceneLooksStale(card, overlapping, previousText) && index > 0) return card
    if (!sceneLooksStale(card, overlapping, previousText) && index === 0) {
      // still force first card to open on unresolved forward hook when plan is stale overall
      const purpose = compactText(card.purpose || card.scene_purpose || '')
      if (purpose && !proseCoversBeat(purpose, previousText) && !overlapping.some(b => sharesProgressCluster(purpose, b))) {
        return card
      }
    }
    const nextPurpose = index === 0
      ? compactText(`开篇承接上一章未解决钩子并推进：${options.forwardText}`, 180)
      : compactText(`在已兑现进度之上推进：${options.forwardText}；禁止回放已完成冲突`, 180)
    return {
      ...card,
      purpose: nextPurpose,
      scene_purpose: nextPurpose,
      title: index === 0 ? (compactText(card.title) && !sceneLooksStale(card, overlapping, previousText) ? card.title : '承接未解决死局') : card.title,
      scene_title: index === 0 ? (compactText(card.scene_title || card.title) && !sceneLooksStale(card, overlapping, previousText) ? (card.scene_title || card.title) : '承接未解决死局') : (card.scene_title || card.title),
      transition_from_previous: options.forwardText || card.transition_from_previous,
      transitionFromPrevious: options.forwardText || card.transitionFromPrevious,
    }
  })
}

export function patchBlueprintForProgressResync(
  blueprint: any,
  options: { forwardText: string; goal?: string; conflict?: string },
) {
  if (!blueprint || typeof blueprint !== 'object') {
    return {
      opening_hook: options.forwardText,
      openingHook: options.forwardText,
      writing_intent: options.goal || options.forwardText,
      core_payoff: options.conflict || options.forwardText,
    }
  }
  const opening = compactText(blueprint.opening_hook || blueprint.openingHook || '')
  const payoff = compactText(blueprint.core_payoff || blueprint.corePayoff || '')
  const staleOpen = !opening || /利爪|耳光|热汤|暴怒|撕碎|滚了三圈/.test(opening)
  const stalePayoff = !payoff || /利爪|耳光|热汤|暴怒|能好好说话/.test(payoff)
  return {
    ...blueprint,
    opening_hook: staleOpen ? options.forwardText : opening,
    openingHook: staleOpen ? options.forwardText : opening,
    writing_intent: options.goal || blueprint.writing_intent || blueprint.writingIntent,
    core_payoff: stalePayoff ? (options.conflict || options.forwardText) : payoff,
    corePayoff: stalePayoff ? (options.conflict || options.forwardText) : payoff,
  }
}

/**
 * Persist seed/meta resync for later chapters.
 * - unwritten: always allowed
 * - written: still update seed fields only (goal/summary/conflict/must/forbidden), never touch chapter_text
 */
export function buildNextChapterProgressResyncPatch(
  nextChapter: any,
  previousChapter: any,
  options: { updateWrittenSeeds?: boolean; force?: boolean } = {},
) {
  const ledger = readChapterProgressLedger(previousChapter)
    || resolveChapterProgressLedger({
      chapterText: previousChapter?.chapter_text || previousChapter?.chapterText || '',
      endingHook: previousChapter?.ending_hook || previousChapter?.endingHook || '',
      plannedGoal: previousChapter?.chapter_goal || previousChapter?.chapterGoal || '',
      plannedSummary: previousChapter?.chapter_summary || previousChapter?.chapterSummary || '',
      plannedConflict: previousChapter?.conflict || '',
      plannedMustAdvance: previousChapter?.raw_payload?.must_advance,
      outgoingHandoff: previousChapter?.raw_payload?.outgoing_handoff || previousChapter?.outgoing_handoff || null,
    })
  if (!ledger || ledger.source === 'empty') return null

  const hasProse = Boolean(compactText(nextChapter?.chapter_text || nextChapter?.chapterText || '', 20))
  if (hasProse && !options.updateWrittenSeeds) return null

  const result = applyProgressResyncToChapterPlan(nextChapter, ledger, {
    previousChapterNo: Number(previousChapter?.chapter_no || previousChapter?.chapterNo || 0) || undefined,
    previousChapterText: previousChapter?.chapter_text || previousChapter?.chapterText || '',
    force: Boolean(options.force),
  })
  if (!result.resynced) return null

  // Never include chapter_text in patch.
  const patch = { ...result.chapter_patch }
  // If written, also mark pre_draft_brief stale so rewrite does not reuse frozen dining plan.
  if (hasProse) {
    const raw = { ...(patch.raw_payload || {}) }
    const brief = nextChapter?.raw_payload?.pre_draft_brief || nextChapter?.raw_payload?.preDraftBrief
    if (brief && typeof brief === 'object') {
      raw.pre_draft_brief = {
        ...brief,
        chapter_goal: result.chapter_goal,
        goal: result.chapter_goal,
        core_conflict: result.conflict,
        conflict: result.conflict,
        must_advance: result.must_advance,
        forbidden_repeats: result.forbidden_repeats,
        plan_stale: true,
        progress_resync: result.progress_resync,
        // Drop confirmation lock so next rewrite rebuilds brief against new timeline.
        confirmed_at: null,
        confirmation_source: 'progress_resync_invalidated',
        progress_resync_invalidated_at: new Date().toISOString(),
      }
      raw.preDraftBrief = raw.pre_draft_brief
    }
    patch.raw_payload = raw
  }
  return patch
}

/** Shared helper: resync next N chapters' seeds after chapter store. */
export function collectFollowingChapterProgressResyncPatches(
  chapters: any[],
  previousChapter: any,
  options: { limit?: number; updateWrittenSeeds?: boolean; force?: boolean } = {},
) {
  const currentNo = Number(previousChapter?.chapter_no || previousChapter?.chapterNo || 0)
  if (!currentNo) return [] as Array<{ chapter_id: number; patch: Record<string, any> }>
  const limit = Math.max(1, Number(options.limit || 3))
  const following = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > currentNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(0, limit)
  const out: Array<{ chapter_id: number; patch: Record<string, any> }> = []
  for (const nextChapter of following) {
    const patch = buildNextChapterProgressResyncPatch(nextChapter, previousChapter, {
      updateWrittenSeeds: options.updateWrittenSeeds !== false,
      force: Boolean(options.force),
    })
    if (!patch || !nextChapter?.id) continue
    out.push({ chapter_id: Number(nextChapter.id), patch })
  }
  return out
}
