import {
  type BeatFamilyStatus,
  type ProgressBeatFamilyId,
  type ClosedBeatRecord,
  type LiveChapterContract,
  type ZombiePressureFinding,
  type FamilyDef,
  FAMILY_DEFS,
  compact,
  asArray,
  uniqueTexts,
  chapterNoOf,
  chapterTextOf,
  proseMatchesClose,
  textHitsFamilyGoal,
  extractEvidence,
  familyDef,
} from './closed-beat-canon-shared'

import {
  detectClosedBeatsInChapter,
  collectClosedBeatFamiliesFromChapters,
  isFamilyClosed,
  matchFamiliesInText,
  isZombieResidualHook,
  textDemandsClosedBeat,
} from './closed-beat-canon-detect'
import {
  sanitizeHookList,
  detectZombiePressureInChapter,
  buildLiveChapterContract,
} from './closed-beat-canon-live'

function uniqueBlocked(items: LiveChapterContract['closed_blocked']) {
  const seen = new Set<string>()
  const out: LiveChapterContract['closed_blocked'] = []
  for (const item of items) {
    const key = `${item.family}|${item.snippet}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/** Build DB patch that persists live contract and strips dead/zombie goals. */
export function buildLiveContractChapterPatch(
  chapter: any,
  options: { previousChapters?: any[]; previousChapter?: any; closedBeats?: ClosedBeatRecord[] } = {},
) {
  const contract = buildLiveChapterContract({
    chapter,
    previousChapters: options.previousChapters,
    previousChapter: options.previousChapter,
    closedBeats: options.closedBeats,
  })
  if (contract.plan_health === 'aligned' && !contract.closed_blocked.length && !contract.zombie_residuals.length) {
    return {
      changed: false,
      contract,
      patch: {} as Record<string, any>,
    }
  }

  const existingRaw = chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? { ...chapter.raw_payload } : {}
  const brief = existingRaw.pre_draft_brief && typeof existingRaw.pre_draft_brief === 'object'
    ? { ...existingRaw.pre_draft_brief }
    : {}
  const liveGoal = contract.live_goals.join('。') || contract.raw_goal
  const existingLedger = existingRaw.chapter_progress_ledger || existingRaw.chapterProgressLedger || null
  const cleanedLedger = existingLedger && typeof existingLedger === 'object'
    ? {
      ...existingLedger,
      unresolved_next: sanitizeHookList(existingLedger.unresolved_next || [], options.closedBeats || collectClosedBeatFamiliesFromChapters([
        ...(options.previousChapters || []),
        options.previousChapter,
      ].filter(Boolean)), 6),
      forbidden_replays: uniqueTexts([
        ...(asArray(existingLedger.forbidden_replays)),
        ...contract.forbidden_replays,
      ], 14),
    }
    : existingLedger

  const nextBrief = {
    ...brief,
    chapter_goal: liveGoal,
    goal: liveGoal,
    core_conflict: contract.live_conflict,
    conflict: contract.live_conflict,
    ending_hook: contract.live_ending_hook || brief.ending_hook,
    forbidden_repeats: uniqueTexts([...(asArray(brief.forbidden_repeats)), ...contract.forbidden_replays], 16),
    must_advance: contract.acceptance_goals,
    live_contract: contract,
    plan_stale: contract.plan_health !== 'aligned',
    dead_goal_stripped: contract.closed_blocked.length > 0 || contract.zombie_residuals.length > 0,
    dead_goal_stripped_at: new Date().toISOString(),
  }

  const patch = {
    chapter_goal: liveGoal,
    chapter_summary: compact(liveGoal, 220),
    conflict: contract.live_conflict,
    ending_hook: contract.live_ending_hook || chapter?.ending_hook || '',
    raw_payload: {
      ...existingRaw,
      live_contract: contract,
      forbidden_repeats: uniqueTexts([...(asArray(existingRaw.forbidden_repeats)), ...contract.forbidden_replays], 16),
      must_advance: contract.acceptance_goals,
      plan_stale: contract.plan_health !== 'aligned',
      dead_goal_stripped: contract.closed_blocked.length > 0 || contract.zombie_residuals.length > 0,
      chapter_progress_ledger: cleanedLedger,
      chapterProgressLedger: cleanedLedger,
      pre_draft_brief: nextBrief,
      preDraftBrief: nextBrief,
      chapter_goal_seed_before_dead_goal_strip: existingRaw.chapter_goal_seed_before_dead_goal_strip || chapter?.chapter_goal || null,
    },
  }

  return { changed: true, contract, patch }
}

function issueBlob(issue: any) {
  if (issue == null) return ''
  if (typeof issue === 'string') return issue
  return [
    issue.type,
    issue.severity,
    issue.description,
    issue.message,
    issue.fix,
    issue.evidence,
    issue.required_change,
    issue.acceptance_test,
  ].map(item => compact(item, 300)).filter(Boolean).join('｜')
}

/**
 * Filter QA/revision artifacts that demand replaying closed/zombie beats.
 * Also inject revisable findings when current prose still runs on zombie pressure,
 * so 复检+修订 can pull the chapter back without hand-editing.
 */
export function filterDeadGoalQualityReview(
  review: any = {},
  input: {
    chapter?: any
    previousChapters?: any[]
    previousChapter?: any
    closedBeats?: ClosedBeatRecord[]
    contract?: LiveChapterContract | null
  } = {},
) {
  const previousChapters = asArray(input.previousChapters)
  if (input.previousChapter) previousChapters.push(input.previousChapter)
  const closed = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters)
  const contract = input.contract || buildLiveChapterContract({
    chapter: input.chapter,
    previousChapters,
    closedBeats: closed,
  })
  const zombieFindings = detectZombiePressureInChapter({
    chapter: input.chapter,
    closedBeats: closed,
    previousChapters,
  })

  const baseIssues = asArray(review?.issues)
  const keptIssues: any[] = []
  const strippedIssues: any[] = []
  const planErrors: any[] = []

  for (const issue of baseIssues) {
    const blob = issueBlob(issue)
    const type = compact(issue?.type || '', 80).toLowerCase()
    const source = compact(issue?.source || '', 80).toLowerCase()
    if (type === 'plan_error_dead_goal' || type === 'zombie_pressure_replay' || source === 'closed_beat_canon') {
      keptIssues.push(issue)
      continue
    }
    const isGoalIssue = /missing_goal|target_missing|核心目标|未完成/.test(`${type} ${blob}`)
      || (/\bgoal\b|目标/.test(`${type} ${blob}`) && /未完成|补齐|开门迎敌|回放|重演|返回404|回到404|清场倒计时/.test(blob))
    if (closed.length && (
      textDemandsClosedBeat(blob, closed)
      || isZombieResidualHook(blob, closed)
      || (isGoalIssue && (matchFamiliesInText(blob, closed).length || isZombieResidualHook(blob, closed)))
    )) {
      strippedIssues.push(issue)
      const families = matchFamiliesInText(blob, closed)
      const labels = families.map(id => familyDef(id)?.label || id).join('、')
      planErrors.push({
        severity: 'medium',
        type: 'plan_error_dead_goal',
        description: `任务书/质检要求了已关闭或僵尸残留剧情：${labels || '已关闭冲突'}。应清洗任务书，禁止改正文重演。`,
        evidence: compact(labels || 'dead_goal', 120),
        fix: contract.acceptance_goals[0]
          ? `按有效目标推进：${contract.acceptance_goals[0]}`
          : '先同步进度清洗任务书，再质检',
        source: 'closed_beat_canon',
      })
      continue
    }
    keptIssues.push(issue)
  }

  const baseDirectives = asArray(review?.revision_directives || review?.revisionDirectives)
  const keptDirectives: string[] = []
  const strippedDirectives: string[] = []
  for (const item of baseDirectives) {
    const text = compact(item, 400)
    if (closed.length && (textDemandsClosedBeat(text, closed) || isZombieResidualHook(text, closed))) {
      strippedDirectives.push(text)
      continue
    }
    if (text) keptDirectives.push(text)
  }

  // Inject constructive revision pressure for zombie residual still in prose.
  for (const finding of zombieFindings) {
    keptIssues.unshift({
      severity: finding.severity,
      type: 'zombie_pressure_replay',
      description: finding.description,
      evidence: finding.evidence,
      fix: finding.fix,
      source: 'closed_beat_canon',
    })
    keptDirectives.unshift(finding.directive)
    if (contract.acceptance_goals[0]) {
      keptDirectives.push(`本章有效目标优先：${contract.acceptance_goals[0]}`)
    }
  }

  const hasHighRemaining = keptIssues.some((issue: any) => /high|critical/i.test(String(issue?.severity || '')))
  const strippedHigh = strippedIssues.some((issue: any) => /high|critical/i.test(String(issue?.severity || '')))
  let needs_revision = Boolean(review?.needs_revision)
  let score = Number(review?.score)

  if (zombieFindings.length) {
    needs_revision = true
    if (Number.isFinite(score) && score >= 78) score = Math.min(score, 76)
  } else if (strippedHigh && !hasHighRemaining && keptIssues.length === 0 && keptDirectives.length === 0) {
    needs_revision = false
  } else if (strippedHigh && !hasHighRemaining) {
    if (strippedIssues.length && keptIssues.every((issue: any) => !/high|critical/i.test(String(issue?.severity || '')))) {
      if (!keptDirectives.length && keptIssues.every((issue: any) => /low|medium/i.test(String(issue?.severity || 'medium')))) {
        const onlyLow = keptIssues.every((issue: any) => /low/i.test(String(issue?.severity || '')))
        if (onlyLow || keptIssues.length === 0) needs_revision = false
      }
    }
  }

  const issues = [
    ...keptIssues,
    ...(planErrors.length && !zombieFindings.length ? [planErrors[0]] : []),
  ].slice(0, 12)

  if (!zombieFindings.length && strippedHigh && !hasHighRemaining && Number.isFinite(score) && score < 80 && needs_revision === false) {
    score = Math.max(score, 80)
  }

  const proseIssues = issues.filter((issue: any) => {
    const type = compact(issue?.type || '')
    return type !== 'plan_error_dead_goal'
  })
  const onlyPlanErrors = !zombieFindings.length
    && proseIssues.every((issue: any) => compact(issue?.type || '') === 'plan_error_dead_goal')
    && (strippedIssues.length > 0 || planErrors.length > 0)
    && proseIssues.length === 0
  if (onlyPlanErrors) {
    needs_revision = false
    if (Number.isFinite(score) && score < 80) score = Math.max(score, 80)
  }

  return {
    ...review,
    score: Number.isFinite(score) ? score : review?.score,
    needs_revision,
    passed: needs_revision ? false : (review?.passed !== false),
    issues,
    revision_directives: uniqueTexts(keptDirectives, 8),
    live_contract: contract,
    dead_goal_filter: {
      version: 'dead_goal_filter_v2',
      stripped_issue_count: strippedIssues.length,
      stripped_directive_count: strippedDirectives.length,
      closed_families: closed.map(item => item.family),
      acceptance_goals: contract.acceptance_goals,
      zombie_findings: zombieFindings.map(item => item.key),
      stripped_issues: strippedIssues.slice(0, 6),
      stripped_directives: strippedDirectives.slice(0, 6),
    },
  }
}

export function closedFamilyLabels(closed: ClosedBeatRecord[] = []) {
  return closed.map(item => item.label)
}

export function shouldSuppressOpenHook(hint: string, closed: ClosedBeatRecord[] = []) {
  if (!hint || !closed.length) return false
  if (isZombieResidualHook(hint, closed)) return true
  if (textDemandsClosedBeat(hint, closed)) return true
  if (isFamilyClosed(closed, 'neighbor_borrow_fire') && /十点邻居敲门|借火|主动开门迎敌|404号房门外的敲门|不知死活的敲门者/.test(hint)) return true
  if (isFamilyClosed(closed, 'property_compliance') && /物业合规清场|清场倒计时|合规清场|赶在清场|五分钟后登门/.test(hint)) return true
  if (isFamilyClosed(closed, 'dining_rule_force') && /再盛汤|空碗|倒汤|耳光|利爪/.test(hint) && !/敲门|邻居|物业|王奶奶|居委会|1号楼/.test(hint)) return true
  return matchFamiliesInText(hint, closed).length > 0 && /未解决|继续|必须|倒计时|未完成/.test(hint)
}

export function listProgressBeatFamilyDefs() {
  return FAMILY_DEFS.map(item => ({ family: item.family, label: item.label }))
}

/** Build delivery-link style directives for zombie residual pressure. */
export function buildZombiePressureDeliveryDirectives(input: {
  chapter?: any
  previousChapters?: any[]
  previousChapter?: any
  closedBeats?: ClosedBeatRecord[]
} = {}) {
  const previousChapters = asArray(input.previousChapters)
  if (input.previousChapter) previousChapters.unshift(input.previousChapter)
  const closed = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters)
  return detectZombiePressureInChapter({
    chapter: input.chapter,
    closedBeats: closed,
    previousChapters,
  }).map(finding => ({
    key: finding.key,
    priority: 1,
    severity: finding.severity,
    label: finding.label,
    directive: finding.directive,
    issue: {
      severity: finding.severity,
      type: 'zombie_pressure_replay',
      description: finding.description,
      evidence: finding.evidence,
      fix: finding.fix,
      source: 'closed_beat_canon',
    },
  }))
}
