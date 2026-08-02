/**
 * System-level continuity guard:
 * - primary ending hooks must become next-chapter opening obligations
 * - general progress / parallel-plot replay detection (not only dining fight)
 * - seed decontamination against recycled early-chapter goals
 */

import type {
  DeliveredClimaxLanding,
} from './chapter-continuity-guard-basics'
import {
  CONTINUITY_CLUSTERS,
  asArray,
  chapterTextOf,
  clusterByKey,
  clusterHitsInText,
  compactText,
  endingHookOf,
  extractDeliveredClimaxLandings,
  extractPrimaryEndingHooks,
  trueEndingWindow,
  uniqueTexts,
} from './chapter-continuity-guard-basics'
import { freeTextEndingHookHit } from './chapter-continuity-guard-free-text'

export { decontaminateChapterSeedFields } from './chapter-continuity-guard-seed'
export { freeTextEndingHookHit }

export function buildHardOpeningObligationsFromPrevious(previousChapter: any = {}) {
  const hooks = extractPrimaryEndingHooks(previousChapter)
  const landings = extractDeliveredClimaxLandings(previousChapter)
  return uniqueTexts([
    ...landings.map(item => `开篇必须在上一章已完成「${item.label}」之后：${item.post_state}`),
    ...landings.flatMap(item => item.forbidden_replays.map(row => `禁止回放：${row}`)),
    ...hooks.map(item => item.obligation),
    ...hooks.map(item => `禁止先重播上一章中段平行戏来替代章末钩子「${item.label}」`),
    hooks.length || landings.length
      ? '上一章章末已兑现高潮不得整段重演；开篇只承接结果状态并向前推进未解决压力。'
      : '',
  ], 10)
}

export type ContinuityDirective = {
  key: string
  priority: number
  severity: 'high' | 'medium' | 'low'
  label: string
  directive: string
  issue: {
    severity: string
    type: string
    description: string
    evidence?: string
    fix?: string
    source?: string
  }
}

/** Opening misses the previous chapter's primary ending hook(s). */

/** Deterministic opening bridge when draft misses a hard primary ending hook. System-wide, not chapter-tuned. */
export function buildOpeningHandoffBridgeParagraph(previousChapter: any = {}, primary: any = {}) {
  const hook = endingHookOf(previousChapter) || compactText(primary?.evidence || '', 48)
  const key = String(primary?.key || '')
  const lead = (() => {
    const raw = compactText(hook || '', 48)
    if (!raw) return ''
    return /[。！？…]$/.test(raw) ? raw : `${raw}。`
  })()
  if (key === 'door_threshold_arrival' || /门外|脚步|门缝|敲门/.test(hook)) {
    return compactText(
      `${lead || '门外有动静。'}他没立刻出声，先把口袋里的东西按实，再伸手去摸门把，把人先看清楚。`,
      120,
    )
  }
  if (key === 'neighbor_knock' || /敲门|十点|邻居/.test(hook)) {
    return compactText(
      `${lead || '门外又响了一声。'}他走到门边，透过猫眼先看一眼，确认来人再决定开不开。`,
      120,
    )
  }
  if (key === 'elevator_anomaly' || /电梯/.test(hook)) {
    return compactText(
      `${lead || '电梯还停着。'}他先按住门边，听了一下里面的动静，再决定进不进。`,
      120,
    )
  }
  // Generic free-text / cluster fallback: surface the ending hook as first beat.
  return compactText(
    `${lead || '上一拍还没完。'}他先把这件事接住，不让它悬在半空，再往下走。`,
    120,
  )
}

export function ensureOpeningHandoffBridge(chapterText: string, previousChapter: any = {}) {
  const text = String(chapterText || '')
  if (!text.trim() || !previousChapter) {
    return { text, bridged: false as const, reason: 'empty' }
  }
  const before = assessPrimaryOpeningHookContinuity({ chapterText: text, previousChapter })
  if (!before.required || before.passed) {
    return { text, bridged: false as const, reason: 'already_ok' }
  }
  const hooks = extractPrimaryEndingHooks(previousChapter)
  const primary = hooks[0]
  if (!primary) return { text, bridged: false as const, reason: 'no_primary' }
  const bridge = buildOpeningHandoffBridgeParagraph(previousChapter, primary)
  if (!bridge) return { text, bridged: false as const, reason: 'no_bridge' }
  // Avoid double-prefix if text already starts with bridge fragment.
  const head = text.slice(0, 80)
  if (head.includes(bridge.slice(0, Math.min(12, bridge.length)))) {
    return { text, bridged: false as const, reason: 'already_prefixed' }
  }
  const next = `${bridge}\n\n${text.replace(/^\s+/, '')}`.replace(/\n{3,}/g, '\n\n')
  const after = assessPrimaryOpeningHookContinuity({ chapterText: next, previousChapter })
  if (after.passed) {
    return {
      text: next.endsWith('\n') ? next : `${next}\n`,
      bridged: true as const,
      reason: primary.key,
      bridge,
    }
  }
  return { text, bridged: false as const, reason: 'bridge_insufficient', bridge }
}

export function detectOpeningHookMissDirective(input: {
  chapter?: any
  previousChapter?: any
} = {}): ContinuityDirective | null {
  const previous = input.previousChapter
  const currentText = chapterTextOf(input.chapter)
  if (!previous || !currentText) return null
  const hooks = extractPrimaryEndingHooks(previous)
  if (!hooks.length) return null

  const opening = currentText.slice(0, 1400)
  // Only the primary ending hook satisfies continuity; secondary mid-chapter clusters do not.
  const primary = hooks[0]
  const primaryCluster = clusterByKey(primary.key)
  const landings = extractDeliveredClimaxLandings(previous)
  const interiorLanded = landings.some(item => item.key === 'building_one_interior_entry')
  // After a delivered interior entry, "seeing the door again while still outside" is NOT continuity.
  const interiorContinueHit = interiorLanded && (
    /门内|大堂|血肉王座|巨大王座|吊挂|干瘪尸体|未知的黑暗中|已在1号楼/.test(opening)
    && !(/通道/.test(opening.slice(0, 400)) && /无头|保安|替罪羊|安德鲁|路易|侧门|清场倒计时/.test(opening))
    && !(/特权卡/.test(opening) && /青铜巨门/.test(opening) && /撞进|冲进/.test(opening))
  )
  const patternHit = primaryCluster
    ? primaryCluster.patterns.some(pattern => pattern.test(opening))
    : false
  // Free-text true ending (no cluster patterns): accept opening that continues ending_hook / last line.
  const freeTextHit = (!primaryCluster || primary.key === 'true_ending_forward')
    ? freeTextEndingHookHit(opening, previous, primary)
    : false
  const primaryHit = interiorLanded
    ? interiorContinueHit
    : (patternHit || freeTextHit)
  if (primaryHit) return null
  if (interiorLanded) {
    const landing = landings.find(item => item.key === 'building_one_interior_entry')!
    const directive = compactText(
      `开篇必须承接上一章已完成的「${landing.label}」之后：${landing.post_state}。禁止回放门外通道冲锋与特权卡撞门入内。`,
      220,
    )
    return {
      key: 'opening_hook_miss',
      priority: 1,
      severity: 'high',
      label: '开篇未接已入内状态',
      directive,
      issue: {
        severity: 'high',
        type: 'opening_hook_miss',
        description: '上一章已撞门进入1号楼，本章开篇仍在门外/通道回放，未承接已入内进度。',
        evidence: landing.evidence,
        fix: directive,
        source: 'chapter_continuity_guard',
      },
    }
  }

  const secondaryReplay = clusterHitsInText(opening)
    .filter(key => key !== primary.key)
  const secondaryLabel = secondaryReplay
    .map(key => clusterByKey(key)?.label || key)
    .filter(Boolean)
    .slice(0, 2)
    .join('、')

  const directive = secondaryLabel
    ? `开篇必须先承接上一章章末「${primary.label}」，禁止先重播「${secondaryLabel}」等中段/旁支场面；把章末未解决钩子写成可见动作或压力。`
    : `开篇必须先承接上一章章末「${primary.label}」：${compactText(primary.evidence, 100)}；不得另起无关主线。`

  return {
    key: 'opening_hook_miss',
    priority: 1,
    severity: 'high',
    label: `开篇未接章末·${primary.label}`,
    directive: compactText(directive, 220),
    issue: {
      severity: 'high',
      type: 'opening_hook_miss',
      description: `上一章章末主钩子是「${primary.label}」，本章开篇未承接，交接名存实亡。`,
      evidence: primary.evidence,
      fix: directive,
      source: 'chapter_continuity_guard',
    },
  }
}

function countMentions(text: string, pattern: RegExp) {
  return (String(text || '').match(new RegExp(pattern.source, 'g')) || []).length
}

function longestSharedSubstringLength(a: string, b: string, minLen = 36) {
  const left = String(a || '').replace(/\s+/g, '')
  const right = String(b || '').replace(/\s+/g, '')
  if (!left || !right) return 0
  // Bounded DP on tails to keep cost low.
  const A = left.slice(-1400)
  const B = right.slice(0, 2800)
  let best = 0
  let prev = new Array(B.length + 1).fill(0)
  for (let i = 1; i <= A.length; i++) {
    const curr = new Array(B.length + 1).fill(0)
    for (let j = 1; j <= B.length; j++) {
      if (A[i - 1] === B[j - 1]) {
        curr[j] = prev[j - 1] + 1
        if (curr[j] > best) best = curr[j]
      }
    }
    prev = curr
    // Early exit if already extreme overlap
    if (best >= 160) return best
  }
  return best >= minLen ? best : best
}

function currentReplaysInteriorEntry(currentText: string, previousText: string) {
  const curr = String(currentText || '')
  const prevTail = trueEndingWindow(previousText, 1100)
  const currHead = curr.slice(0, 1800)
  const currTail = trueEndingWindow(curr, 900)
  const outsideHead = /通道|无头|保安|替罪羊|安德鲁|路易|侧门|缓缓闭合|清场倒计时|三分钟内/.test(currHead)
  const reEntryTail = (
    (/特权卡|黑金|青铜巨门/.test(currTail) && /撞进|冲进|蛮横地/.test(currTail) && /(黑暗|门内|王座|大堂)/.test(currTail))
    || /蛮横地撞进了那片未知的黑暗之中/.test(curr)
  )
  const shared = longestSharedSubstringLength(prevTail, curr, 40)
  const sharedCrash = shared >= 72 && /青铜巨门|特权卡|撞进|未知的黑暗|王座/.test(prevTail)
  const opensOutsideAfterEntry = outsideHead && !/已在门内|门内大堂|血肉王座就在|吊挂在半空的.{0,6}尸体/.test(currHead.slice(0, 500))
  return {
    replay: Boolean(reEntryTail && (outsideHead || sharedCrash)) || sharedCrash || (opensOutsideAfterEntry && reEntryTail),
    shared,
    outsideHead,
    reEntryTail,
  }
}

/** Hard continuity: previous climax landing re-performed as this chapter's main path. */
export function detectDeliveredClimaxReplayDirective(input: {
  chapter?: any
  previousChapter?: any
} = {}): ContinuityDirective | null {
  const previous = input.previousChapter
  const previousText = chapterTextOf(previous)
  const currentText = chapterTextOf(input.chapter)
  if (!previousText || !currentText) return null
  const landings = extractDeliveredClimaxLandings(previous)
  if (!landings.length) return null

  for (const landing of landings) {
    if (landing.key === 'building_one_interior_entry') {
      const hit = currentReplaysInteriorEntry(currentText, previousText)
      if (!hit.replay) continue
      const directive = compactText(
        `上一章已完成「${landing.label}」并进入门内；本章禁止回放特权卡撞门/门外清场冲锋入内。开篇必须直接落在门内状态（${landing.post_state}），只推进门内新冲突。`,
        240,
      )
      return {
        key: 'progress_replay',
        priority: 1,
        severity: 'high',
        label: '章末高潮回放',
        directive,
        issue: {
          severity: 'high',
          type: 'progress_replay',
          description: '上一章章末已完成的突入/结算高潮在本章被整段或同构重演，造成明显重复割裂。',
          evidence: compactText(`landing=${landing.key}; shared=${hit.shared}; outside=${hit.outsideHead}; reentry=${hit.reEntryTail}; ${landing.evidence}`, 200),
          fix: directive,
          source: 'chapter_continuity_guard',
        },
      }
    }
  }
  return null
}

/** Parallel-plot / closed-conflict replay beyond dining-fight special case. */
export function detectGeneralProgressReplayDirective(input: {
  chapter?: any
  previousChapter?: any
} = {}): ContinuityDirective | null {
  const previousText = chapterTextOf(input.previousChapter)
  const currentText = chapterTextOf(input.chapter)
  const currentSeed = [
    input.chapter?.chapter_goal,
    input.chapter?.chapter_summary,
    input.chapter?.conflict,
    ...(asArray(input.chapter?.raw_payload?.must_advance)),
  ].map(item => compactText(item, 180)).filter(Boolean).join('｜')
  if (!previousText || !currentText) return null

  // 0) Delivered climax landing replay (e.g. already crashed into building interior).
  const climaxReplay = detectDeliveredClimaxReplayDirective(input)
  if (climaxReplay) return climaxReplay

  const prevTail = previousText.slice(Math.max(0, previousText.length - 1000))
  const currHead = currentText.slice(0, 2200)
  const primaryHooks = extractPrimaryEndingHooks(input.previousChapter)
  const primaryKeys = new Set(primaryHooks.map(item => item.key))

  // 1) Dining fight classic
  const prevClosedDining = /掌权|倒.{0,4}汤|毒汤|热汤|痛苦|哀嚎|崩溃/.test(previousText)
    && /十点|敲门|邻居|再盛|空碗|厨房/.test(previousText)
  const currReplaysDining = /利爪|耳光|暴怒|膨胀|撕碎|能好好说话|热汤淋头/.test(currHead)
    || /利爪|耳光|热汤|暴怒/.test(currentSeed)
  if (prevClosedDining && currReplaysDining) {
    const directive = /敲门|邻居|十点/.test(prevTail)
      ? '禁止回放上一章已兑现的餐桌对决（倒汤/利爪/耳光/能好好说话）；开篇承接十点敲门与厨房/再盛汤双死局，向前推进未解决钩子。'
      : '禁止回放上一章已兑现冲突；按上一章正文实际进度滚动本章目标，只推进未解决钩子。'
    return {
      key: 'progress_replay',
      priority: 1,
      severity: 'high',
      label: '进度回放',
      directive,
      issue: {
        severity: 'high',
        type: 'progress_replay',
        description: '上一章正文已超写并兑现部分高潮，本章仍回放同一冲突，造成重复割裂。',
        evidence: 'dining_fight closed in previous, replayed in current',
        fix: directive,
        source: 'chapter_continuity_guard',
      },
    }
  }

  // 2) TV parallel death fully reopened while property/other ending hook should lead
  const prevTv = countMentions(previousText, /山本武藏/) >= 1
    || /洞穿|撕成了碎片|挑战失败|八咫镜/.test(previousText)
  const currTvOpen = (
    countMentions(currHead, /山本武藏/) >= 1
    || /八咫镜|洞穿了山本|撕成了碎片|挑战失败|要求再盛汤/.test(currHead)
  ) && (
    currHead.indexOf('山本') >= 0 && currHead.indexOf('山本') < 1200
    || currHead.indexOf('八咫镜') >= 0 && currHead.indexOf('八咫镜') < 900
    || /挑战失败|撕成了碎片|要求再盛汤/.test(currHead.slice(0, 900))
  )
  // Full replay = TV is the opening main stage, not a one-line residual.
  const currTvReplay = currTvOpen && (
    countMentions(currHead.slice(0, 900), /山本|八咫镜|挑战失败|撕成了碎片|要求再盛汤/) >= 2
    || /山本武藏/.test(currHead.slice(0, 400))
  )
  const primaryLead = primaryHooks[0]
  const primaryIsNotTv = Boolean(primaryLead && primaryLead.key !== 'tv_parallel_death')
  if (prevTv && currTvReplay && primaryIsNotTv) {
    const lead = primaryHooks[0]?.label || '上一章章末钩子'
    const directive = `禁止把上一章已开演的电视平行死亡线当本章开篇主戏重播；开篇先推进「${lead}」，平行对照最多一句带过。`
    return {
      key: 'progress_replay',
      priority: 1,
      severity: 'high',
      label: '平行戏回放',
      directive,
      issue: {
        severity: 'high',
        type: 'progress_replay',
        description: '上一章已开演的平行对照戏在本章开篇被完整重播，掩盖了真正的章末钩子。',
        evidence: `previous_tv + current_open_tv; primary=${primaryHooks.map(i => i.key).join(',')}`,
        fix: directive,
        source: 'chapter_continuity_guard',
      },
    }
  }

  // 3) Same capture climax re-performed at length (e.g. 王奶奶拖进门 already ended previous)
  const prevClosedCapture = /拖进|拽进/.test(prevTail) && /关上了|关了门|防盗铁门/.test(prevTail) && /王奶奶/.test(prevTail)
  const currReopensCapture = /拖死狗|硬生生拽进|拖进了404|拽进了404/.test(currHead)
    && /王奶奶/.test(currHead)
    && currHead.slice(0, 500).length > 200
  if (prevClosedCapture && currReopensCapture) {
    const directive = '上一章已完成“拖入房内并关门”；本章开篇只保留一句承接，立即进入新冲突（审讯/封印/新钩子），禁止整段重演拖拽关门。'
    return {
      key: 'progress_replay',
      priority: 1,
      severity: 'high',
      label: '动作高潮回放',
      directive,
      issue: {
        severity: 'high',
        type: 'progress_replay',
        description: '上一章结尾已完成的捕获/关门动作在本章开篇被整段重演。',
        evidence: 'wang_nainai capture closed in previous tail, reopened in current head',
        fix: directive,
        source: 'chapter_continuity_guard',
      },
    }
  }

  // 4) Seed still commands long-closed early motifs while prose moved on
  const seedHits = clusterHitsInText(currentSeed)
  const prevDelivered = new Set(clusterHitsInText(previousText))
  const polluted = seedHits.filter(key => {
    if (!prevDelivered.has(key) && !/dining_fight|neighbor_knock|wang_nainai_capture|kitchen_entity/.test(key)) return false
    // seed insists on early motifs while current prose head already elsewhere
    const cluster = clusterByKey(key)
    if (!cluster) return false
    const seedHas = cluster.patterns.some(p => p.test(currentSeed))
    const headHas = cluster.patterns.some(p => p.test(currHead))
    const primaryForward = primaryHooks.some(h => h.key === key)
    return seedHas && !headHas && !primaryForward && (key === 'dining_fight' || key === 'neighbor_knock' || key === 'kitchen_entity')
  })
  if (polluted.length && primaryHooks.length) {
    const directive = `本章任务书仍残留已过期冲突（${polluted.map(k => clusterByKey(k)?.label || k).join('、')}）；按上一章章末「${primaryHooks[0].label}」重写开篇与目标，禁止回放过期种子。`
    return {
      key: 'progress_replay',
      priority: 1,
      severity: 'high',
      label: '过期种子回放',
      directive: compactText(directive, 220),
      issue: {
        severity: 'high',
        type: 'progress_replay',
        description: '任务书/种子仍要求已过期冲突，和上一章正文进度脱节。',
        evidence: `polluted=${polluted.join(',')} primary=${primaryHooks[0].key}`,
        fix: directive,
        source: 'chapter_continuity_guard',
      },
    }
  }

  return null
}

/** Collect continuity directives for quality/revision linkage. */
export function collectContinuityGuardDirectives(input: {
  chapter?: any
  previousChapter?: any
} = {}): ContinuityDirective[] {
  const out: ContinuityDirective[] = []
  const replay = detectGeneralProgressReplayDirective(input)
  if (replay) out.push(replay)
  const openingMiss = detectOpeningHookMissDirective(input)
  if (openingMiss) out.push(openingMiss)
  // de-dupe by key
  const seen = new Set<string>()
  return out.filter(item => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

/** Whether initial opening should hard-fail admission for missing primary ending hook. */
export function assessPrimaryOpeningHookContinuity(input: {
  chapterText?: any
  previousChapter?: any
} = {}) {
  const previousChapter = input.previousChapter
  const chapterText = input.chapterText
  // Hard-fail delivered climax landing replays first.
  const climaxReplay = detectDeliveredClimaxReplayDirective({
    chapter: { chapter_text: chapterText },
    previousChapter,
  })
  if (climaxReplay) {
    return {
      required: true,
      passed: false,
      directive: climaxReplay,
      failure: {
        code: 'progress_climax_replay',
        source: 'chapter_continuity_guard',
        message: '正文回放上一章已完成的章末高潮，已阻止重复结算入库。',
        details: {
          directive: climaxReplay.directive,
          issue: climaxReplay.issue,
        },
      },
    }
  }

  const hooks = extractPrimaryEndingHooks(previousChapter)
  const landings = extractDeliveredClimaxLandings(previousChapter)
  const hard = landings.length > 0 || hooks.some(item => [
    'property_enforcement',
    'neighbor_knock',
    'door_threshold_arrival',
    'kitchen_entity',
    'elevator_anomaly',
    'building_one_interior',
    'building_two_seeker',
    'deep_abyss_descent',
    'true_ending_forward',
    'authority_fragment',
    'companion_chosen',
  ].includes(item.key))

  const directive = detectOpeningHookMissDirective({
    chapter: { chapter_text: chapterText },
    previousChapter,
  })
  if (!directive) {
    // Hard primary class already owns continuity for this arc beat.
    // Report required=true so callers do not re-run brittle fragment gates.
    if (hard) {
      return { required: true, passed: true, failure: null, directive: null }
    }
    return { required: false, passed: true, failure: null, directive: null }
  }
  // Only hard-require when previous ending has a clear forward hook cluster or delivered landing.
  if (!hard) {
    return { required: false, passed: true, failure: null, directive }
  }
  return {
    required: true,
    passed: false,
    directive,
    failure: {
      code: 'opening_primary_hook_miss',
      source: 'chapter_continuity_guard',
      message: '正文开篇未承接上一章章末主钩子，已阻止断章式进度漂移入库。',
      details: {
        primary_hooks: hooks,
        delivered_landings: landings,
        directive: directive.directive,
      },
    },
  }
}
