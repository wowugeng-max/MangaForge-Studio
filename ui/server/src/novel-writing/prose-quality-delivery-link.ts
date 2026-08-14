/**
 * Narrow linkage: fold high-priority delivery/sync risks into prose_quality
 * issues + revision_directives so QA and revision share one actionable list.
 */

import { detectAuthorialEndingBreak } from './chapter-plan-from-prose'
import {
  collectContinuityGuardDirectives,
  detectGeneralProgressReplayDirective,
} from './chapter-continuity-guard'
import {
  buildCharacterNameDriftDirective,
  buildCharacterIdentityDriftDirective,
  buildTitleNameCanon,
  detectCharacterNameDrift,
  detectCharacterIdentityDrift,
} from './character-card-sync'
import {
  buildLiveChapterContract,
  collectClosedBeatFamiliesFromChapters,
  filterDeadGoalQualityReview,
  buildZombiePressureDeliveryDirectives,
} from './closed-beat-canon'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactText(value: any, limit = 220) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function uniqueTexts(values: any, limit = 8) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw, 280)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function reviewPayload(review: any) {
  const raw = review?.payload
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return {}
  }
}

function chapterMatchesReview(review: any, chapterId: number, chapterNo: number) {
  const payload = reviewPayload(review)
  const id = Number(payload.chapter_id || payload.chapterId || 0)
  const no = Number(payload.chapter_no || payload.chapterNo || 0)
  if (id && id === chapterId) return true
  if (no && no === chapterNo) return true
  const nested = payload.quality_audit_sync
    || payload.chapter_handoff_sync
    || payload.chapter_handoff_delta_sync
    || payload.delivery_risk_convergence
    || payload.dialogue_sync
    || payload.conflict_structure_sync
    || {}
  if (Number(nested.chapter_id || nested.chapterId || 0) === chapterId) return true
  if (Number(nested.chapter_no || nested.chapterNo || 0) === chapterNo) return true
  return false
}

function latestChapterReviews(reviews: any[], chapterId: number, chapterNo: number) {
  const matched = asArray(reviews)
    .filter((item: any) => chapterMatchesReview(item, chapterId, chapterNo))
    .sort((a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0))
  const byType = new Map<string, any>()
  for (const item of matched) {
    const type = String(item?.review_type || '')
    if (!type || byType.has(type)) continue
    byType.set(type, item)
  }
  return byType
}

export type PriorityDeliveryDirective = {
  key: string
  priority: number
  severity: 'high' | 'medium' | 'low'
  label: string
  directive: string
  /** Material/章纲-class gap: stays visible as an issue but never feeds revision_directives or forces revision. */
  excludeFromDirectives?: boolean
  issue: {
    severity: string
    type: string
    description: string
    evidence?: string
    fix?: string
    source?: string
    category?: string
  }
}

function pushDirective(
  bag: PriorityDeliveryDirective[],
  item: PriorityDeliveryDirective,
) {
  if (!item.directive || bag.some(existing => existing.key === item.key || existing.directive === item.directive)) return
  bag.push(item)
}

function extractSyncRepair(sync: any, fallbackLabel: string) {
  if (!sync || typeof sync !== 'object') return [] as Array<{ label: string; fix: string; issue: string }>
  const out: Array<{ label: string; fix: string; issue: string }> = []
  if (sync.priority_repair || sync.summary) {
    out.push({
      label: compactText(sync.label || fallbackLabel, 40),
      issue: compactText(sync.summary || sync.priority_repair || '', 160),
      fix: compactText(sync.priority_repair || sync.summary || '', 180),
    })
  }
  for (const row of asArray(sync.planned || sync.checks || sync.items || sync.missed || [])) {
    if (!row || typeof row !== 'object') continue
    const status = String(row.status || '').toLowerCase()
    const delivered = row.delivered
    if (delivered === true || status === 'ok' || status === 'pass') continue
    const fix = compactText(row.repair_instruction || row.fix || row.action || '', 180)
    const issue = compactText(row.issue || row.summary || row.label || '', 160)
    if (!fix && !issue) continue
    out.push({
      label: compactText(row.label || row.key || fallbackLabel, 40),
      issue: issue || fix,
      fix: fix || issue,
    })
  }
  return out.slice(0, 4)
}

/** Deterministic progress-replay signal from previous prose vs current prose/seed. */
export function detectProgressReplayDirective(input: {
  chapter?: any
  previousChapter?: any
} = {}): PriorityDeliveryDirective | null {
  // General continuity guard covers dining fight, parallel TV replay, capture re-open, stale seeds.
  const general = detectGeneralProgressReplayDirective(input)
  if (!general) return null
  return {
    key: general.key,
    priority: general.priority,
    severity: general.severity,
    label: general.label,
    directive: general.directive,
    issue: general.issue,
  }
}

export function selectPriorityDeliveryDirectives(input: {
  reviews?: any[]
  chapter?: any
  previousChapter?: any
  limit?: number
} = {}): PriorityDeliveryDirective[] {
  const chapterId = Number(input.chapter?.id || 0)
  const chapterNo = Number(input.chapter?.chapter_no || input.chapter?.chapterNo || 0)
  const byType = latestChapterReviews(input.reviews || [], chapterId, chapterNo)
  const bag: PriorityDeliveryDirective[] = []

  const progress = detectProgressReplayDirective({
    chapter: input.chapter,
    previousChapter: input.previousChapter,
  })
  if (progress) pushDirective(bag, progress)

  for (const item of collectContinuityGuardDirectives({
    chapter: input.chapter,
    previousChapter: input.previousChapter,
  })) {
    // progress_replay already added above; still allow opening_hook_miss etc.
    if (item.key === 'progress_replay' && progress) continue
    pushDirective(bag, {
      key: item.key,
      priority: item.priority,
      severity: item.severity,
      label: item.label,
      directive: item.directive,
      issue: item.issue,
    })
  }

  // Established title/name drift (e.g. 局长 秦建国 -> 赵国锋) is a high-priority continuity defect.
  const previousChapters = asArray(input.previousChapters || input.previous_chapters)
  if (input.previousChapter) previousChapters.unshift(input.previousChapter)
  const titleNameCanon = asArray(input.titleNameCanon || input.title_name_canon).length
    ? asArray(input.titleNameCanon || input.title_name_canon)
    : buildTitleNameCanon(previousChapters)
  const nameDrifts = detectCharacterNameDrift({
    chapterText: input.chapter?.chapter_text || input.chapter?.chapterText,
    titleNameCanon,
    previousChapters,
  })
  const nameDriftDirective = buildCharacterNameDriftDirective(nameDrifts)
  if (nameDriftDirective) {
    pushDirective(bag, nameDriftDirective)
  }

  const identityDrifts = detectCharacterIdentityDrift({
    chapterText: input.chapter?.chapter_text || input.chapter?.chapterText,
    previousChapters,
  })
  const identityDriftDirective = buildCharacterIdentityDriftDirective(identityDrifts)
  if (identityDriftDirective) {
    pushDirective(bag, identityDriftDirective)
  }

  // Zombie residual pressure still running in current prose (cleanup countdown / anonymous knock).
  for (const item of buildZombiePressureDeliveryDirectives({
    chapter: input.chapter,
    previousChapters,
    previousChapter: input.previousChapter,
  })) {
    pushDirective(bag, item)
  }

  // Dead goals in stored task book: force plan repair, never prose replay.
  const closedBeats = collectClosedBeatFamiliesFromChapters(previousChapters)
  if (closedBeats.length) {
    const contract = buildLiveChapterContract({
      chapter: input.chapter,
      previousChapters,
      closedBeats,
    })
    if (contract.closed_blocked.length) {
      pushDirective(bag, {
        key: 'dead_goal_plan_error',
        priority: 2,
        severity: 'medium',
        label: '任务书死目标',
        directive: compactText(
          `任务书含已关闭冲突（${contract.closed_blocked.map(item => item.label).join('、')}）。禁止改正文重演；先按有效目标推进：${(contract.acceptance_goals[0] || '承接未解决钩子')}。`,
          220,
        ),
        issue: {
          severity: 'medium',
          type: 'plan_error_dead_goal',
          description: compactText(
            `任务书仍要求已关闭剧情：${contract.closed_blocked.map(item => item.label).join('、')}`,
            180,
          ),
          fix: compactText(
            `清洗任务书/同步进度；验收仅使用：${contract.acceptance_goals.join('；') || '上一章未解决钩子'}`,
            200,
          ),
          source: 'closed_beat_canon',
        },
      })
    }
  }

  const endingBreak = detectAuthorialEndingBreak(String(input.chapter?.chapter_text || input.chapter?.chapterText || ''))
  if (endingBreak) {
    pushDirective(bag, {
      key: endingBreak.key,
      priority: 1,
      severity: 'high',
      label: endingBreak.label,
      directive: endingBreak.directive,
      issue: {
        severity: 'high',
        type: endingBreak.key,
        description: endingBreak.description,
        evidence: endingBreak.evidence,
        fix: endingBreak.directive,
        source: 'prose_ending_scan',
      },
    })
  }

  // Continuity high-pri already covers primary open/replay; keep handoff chips sparse so quality still fits.
  const continuityHeavy = bag.some(item => item.priority <= 1)
  const handoffLimit = continuityHeavy ? 1 : 3

  const handoffDelta = reviewPayload(byType.get('chapter_handoff_delta_sync')).chapter_handoff_delta_sync
    || reviewPayload(byType.get('chapter_handoff_delta_sync'))
  if (handoffDelta && (handoffDelta.status === 'warn' || handoffDelta.status === 'fail' || Number(handoffDelta.missed_count || 0) > 0)) {
    let added = 0
    for (const row of extractSyncRepair(handoffDelta, '章末交接')) {
      if (added >= handoffLimit) break
      pushDirective(bag, {
        key: `handoff_delta:${row.label}`,
        priority: 2,
        severity: 'high',
        label: `章末交接·${row.label}`,
        directive: compactText(`补章末交接：${row.fix}`, 200),
        issue: {
          severity: 'high',
          type: 'chapter_handoff_delta',
          description: row.issue || row.fix,
          fix: row.fix,
          source: 'chapter_handoff_delta_sync',
        },
      })
      added += 1
    }
  }

  const handoff = reviewPayload(byType.get('chapter_handoff_sync')).chapter_handoff_sync
    || reviewPayload(byType.get('chapter_handoff_sync'))
  if (handoff && (handoff.status === 'warn' || handoff.status === 'fail' || Number(handoff.missed_count || 0) > 0)) {
    let added = 0
    for (const row of extractSyncRepair(handoff, '章首承接')) {
      if (added >= handoffLimit) break
      pushDirective(bag, {
        key: `handoff:${row.label}`,
        priority: 2,
        severity: 'high',
        label: `章首承接·${row.label}`,
        directive: compactText(`补章首承接：${row.fix}`, 200),
        issue: {
          severity: 'high',
          type: 'chapter_handoff',
          description: row.issue || row.fix,
          fix: row.fix,
          source: 'chapter_handoff_sync',
        },
      })
      added += 1
    }
  }

  const qualityAudit = reviewPayload(byType.get('quality_audit_sync')).quality_audit_sync
    || reviewPayload(byType.get('quality_audit_sync'))
  if (qualityAudit && (qualityAudit.status === 'warn' || qualityAudit.status === 'fail' || Number(qualityAudit.missed_count || 0) > 0)) {
    const priority = compactText(qualityAudit.priority_repair || qualityAudit.summary || '优先清质量硬伤', 120)
    // quality_audit gaps are checklist-vs-generation-receipt audits: prose revision can
    // never produce those receipts, so keep them visible as material hints only.
    const materialFix = (fix: string) => compactText(`材料/章纲缺口，修订正文无法补齐；用「一键补材料」或补章纲处理：${fix}`, 240)
    pushDirective(bag, {
      key: 'quality_audit',
      priority: 3,
      severity: 'medium',
      label: compactText(qualityAudit.label || '质量诊断', 40),
      directive: compactText(`按质量诊断修复：${priority}`, 200),
      excludeFromDirectives: true,
      issue: {
        severity: 'medium',
        type: 'quality_audit',
        category: 'material',
        description: compactText(qualityAudit.summary || priority, 180),
        fix: materialFix(priority),
        source: 'quality_audit_sync',
      },
    })
    for (const row of extractSyncRepair(qualityAudit, '质量诊断').slice(0, 2)) {
      pushDirective(bag, {
        key: `quality_audit:${row.label}`,
        priority: 3,
        severity: 'medium',
        label: `质量诊断·${row.label}`,
        directive: compactText(row.fix, 200),
        excludeFromDirectives: true,
        issue: {
          severity: 'medium',
          type: 'quality_audit_item',
          category: 'material',
          description: row.issue,
          fix: materialFix(row.fix),
          source: 'quality_audit_sync',
        },
      })
    }
  }

  const convergence = reviewPayload(byType.get('delivery_risk_convergence')).delivery_risk_convergence
    || reviewPayload(byType.get('delivery_risk_convergence'))
  if (convergence && (Number(convergence.residual_count || convergence.remaining || 0) > 0 || convergence.status === 'warn')) {
    const nextAction = compactText(convergence.next_action || convergence.nextAction || convergence.summary || '', 180)
    if (nextAction) {
      pushDirective(bag, {
        key: 'delivery_risk_convergence',
        priority: 4,
        severity: 'medium',
        label: compactText(convergence.label || '交付风险收敛', 40),
        directive: compactText(`收敛交付风险：${nextAction}`, 200),
        issue: {
          severity: 'medium',
          type: 'delivery_risk_convergence',
          description: compactText(convergence.summary || nextAction, 180),
          fix: nextAction,
          source: 'delivery_risk_convergence',
        },
      })
    }
  }

  // One structural specialty at most, if still room.
  for (const [type, key, label, priority] of [
    ['conflict_structure_sync', 'conflict_structure', '冲突结构', 5],
    ['dialogue_sync', 'dialogue', '对白硬伤', 5],
    ['opening_sync', 'opening', '开篇设计', 5],
  ] as const) {
    const payload = reviewPayload(byType.get(type))
    const sync = payload[type] || payload[`${type.replace(/_sync$/, '')}_sync`] || payload
    if (!sync || typeof sync !== 'object') continue
    if (!(sync.status === 'warn' || sync.status === 'fail' || Number(sync.missed_count || 0) > 0)) continue
    const row = extractSyncRepair(sync, label)[0]
    if (!row) continue
    pushDirective(bag, {
      key,
      priority,
      severity: 'medium',
      label: `${label}·${row.label}`,
      directive: compactText(`补${label}：${row.fix}`, 200),
      issue: {
        severity: 'medium',
        type: key,
        description: row.issue,
        fix: row.fix,
        source: type,
      },
    })
    break
  }

  return bag
    .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))
    .slice(0, Math.max(1, Number(input.limit || 5)))
}

export function mergeProseQualityWithDeliveryRisks(
  review: any = {},
  input: {
    reviews?: any[]
    chapter?: any
    previousChapter?: any
    previousChapters?: any[]
    titleNameCanon?: any[]
    limit?: number
  } = {},
) {
  const baseIssues = asArray(review?.issues).map((item: any) => {
    if (item && typeof item === 'object') return item
    return { severity: 'medium', type: 'model', description: compactText(item, 200) }
  })
  const baseDirectives = uniqueTexts(review?.revision_directives || review?.revisionDirectives, 8)
  const selected = selectPriorityDeliveryDirectives({
    reviews: input.reviews,
    chapter: input.chapter,
    previousChapter: input.previousChapter,
    previousChapters: input.previousChapters,
    titleNameCanon: input.titleNameCanon,
    limit: input.limit ?? 5,
  })

  const linkedIssues = selected.map(item => item.issue)
  // Material-class findings (e.g. quality_audit receipts) stay in issues but must not
  // feed revision directives or force a prose revision loop that can never close them.
  const actionable = selected.filter(item => !item.excludeFromDirectives)
  const linkedDirectives = actionable.map(item => item.directive)
  const issues = [...linkedIssues, ...baseIssues].slice(0, 12)
  const revision_directives = uniqueTexts([...linkedDirectives, ...baseDirectives], 8)

  const hasHigh = actionable.some(item => item.severity === 'high') || issues.some((item: any) => /high|critical/.test(String(item?.severity || '')))
  const scoreRaw = Number(review?.score)
  const score = Number.isFinite(scoreRaw) ? scoreRaw : 80
  // Empty model advice + open delivery risks => do not pretend "all good".
  const emptyModelAdvice = baseDirectives.length === 0 && baseIssues.length === 0
  const forceRevision = actionable.length > 0 && (hasHigh || emptyModelAdvice || Boolean(review?.needs_revision))
  const adjustedScore = forceRevision && emptyModelAdvice && score >= 78
    ? Math.min(score, hasHigh ? 72 : 76)
    : score
  const passed = forceRevision ? false : review?.passed !== false
  const needs_revision = forceRevision || Boolean(review?.needs_revision) || adjustedScore < 78 || passed === false

  const merged = {
    ...review,
    passed: needs_revision ? false : passed,
    score: adjustedScore,
    needs_revision,
    issues,
    revision_directives,
    delivery_link: {
      version: 'prose_quality_delivery_link_v1',
      // Downstream revision builders read selected[].directive/key to build must_fix
      // and structural-rewrite decisions, so material-class entries must not appear here.
      selected: actionable.map(item => ({
        key: item.key,
        priority: item.priority,
        severity: item.severity,
        label: item.label,
        directive: item.directive,
      })),
      source_count: selected.length,
      material_count: selected.length - actionable.length,
      model_issue_count: baseIssues.length,
      model_directive_count: baseDirectives.length,
    },
  }

  // Drop model QA items that demand replaying already-closed beats (e.g. reopen 借火邻居).
  const previousForFilter = asArray(input.previousChapters || input.previous_chapters)
  if (input.previousChapter) previousForFilter.unshift(input.previousChapter)
  return filterDeadGoalQualityReview(merged, {
    chapter: input.chapter,
    previousChapters: previousForFilter,
    previousChapter: input.previousChapter,
  })
}
