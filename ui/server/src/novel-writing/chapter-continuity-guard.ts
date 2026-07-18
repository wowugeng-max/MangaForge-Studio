/**
 * System-level continuity guard:
 * - primary ending hooks must become next-chapter opening obligations
 * - general progress / parallel-plot replay detection (not only dining fight)
 * - seed decontamination against recycled early-chapter goals
 */

function compactText(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function uniqueTexts(values: any, limit = 12) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw, 200)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

function endingHookOf(chapter: any) {
  return compactText(chapter?.ending_hook || chapter?.endingHook || '', 220)
}

export type ContinuityCluster = {
  key: string
  label: string
  patterns: RegExp[]
  /** Prefer this cluster when it appears in chapter tail / ending_hook */
  forward?: boolean
}

export const CONTINUITY_CLUSTERS: ContinuityCluster[] = [
  {
    key: 'dining_fight',
    label: '餐桌对决',
    patterns: [/倒汤|热汤淋头|毒汤/, /利爪|耳光|暴怒|膨胀|撕碎|能好好说话|牙齿掉了/],
  },
  {
    key: 'neighbor_knock',
    label: '十点敲门',
    patterns: [/十点/, /敲门|借火|借东西|邻居/],
    forward: true,
  },
  {
    key: 'wang_nainai_capture',
    label: '王奶奶捕获',
    patterns: [/王奶奶/, /借酱油/, /冰箱|冷冻室|拖进|拽进/],
  },
  {
    key: 'tv_parallel_death',
    label: '电视平行死亡线',
    patterns: [/山本武藏/, /八咫镜|雷切/, /洞穿|撕成了碎片|挑战失败/, /要求再盛汤/],
  },
  {
    // Require true enforcement pressure — bare "物业尸体/物业制服" must NOT win chapter-ending primacy.
    key: 'property_enforcement',
    label: '物业合规清场',
    patterns: [/清场倒计时|合规性清理|物理合规复核|五分钟内完成物理合规/, /物业.{0,8}(信封|清场|登门|执法)/, /倒计时数字|04:\d{2}|四分/],
    forward: true,
  },
  {
    key: 'elevator_anomaly',
    label: '电梯异常',
    patterns: [/电梯/, /无脸/, /负一|负二|未定义区域|楼层未定义|B-\d/],
    forward: true,
  },
  {
    key: 'kitchen_entity',
    label: '厨房实体',
    patterns: [/厨房木门|厨房门/, /符纸/, /婴儿啼哭|巨婴/, /毁灭级/],
    forward: true,
  },
  {
    key: 'building_one_interior',
    label: '1号楼内部突入',
    patterns: [/青铜巨门|1号楼.{0,6}巨门/, /血肉王座|门内大堂/, /撞进.{0,12}(黑暗|巨门|门内)/, /干瘪尸体.{0,8}吊挂|吊挂在半空/],
    forward: true,
  },
  {
    key: 'authority_fragment',
    label: '权柄碎片对峙',
    patterns: [/权柄碎片|世界权柄/, /秩序.{0,6}混乱|混乱.{0,6}秩序/, /黑色石棺|黑色蚕茧/],
    forward: true,
  },
  {
    key: 'companion_chosen',
    label: '同行天选者',
    patterns: [/阿奇姆/, /拎起.{0,8}天选者|带着.{0,8}天选者/, /你是哪个国家的/],
    forward: true,
  },
]

export function clusterHitsInText(text: string): string[] {
  const value = String(text || '')
  return CONTINUITY_CLUSTERS
    .filter(cluster => cluster.patterns.some(pattern => pattern.test(value)))
    .map(cluster => cluster.key)
}

function clusterByKey(key: string) {
  return CONTINUITY_CLUSTERS.find(item => item.key === key) || null
}

function scoreClusterInZone(cluster: ContinuityCluster, zone: string) {
  if (!zone) return 0
  let score = 0
  for (const pattern of cluster.patterns) {
    if (pattern.test(zone)) score += 1
  }
  if (cluster.forward && score > 0) score += 0.5
  return score
}

/** Extract primary forward hooks from previous chapter ending zone. */
export function extractPrimaryEndingHooks(previousChapter: any = {}) {
  const text = chapterTextOf(previousChapter)
  const endingHook = endingHookOf(previousChapter)
  // Tight true-ending window: mid-chapter parallel scenes must not become primary hooks.
  const trueTail = compactText(text.slice(Math.max(0, text.length - 420)), 420)
  const wideTail = compactText(text.slice(Math.max(0, text.length - 900)), 900)
  const body = text.slice(0, Math.max(0, text.length - 420))
  if (!endingHook && !trueTail && !wideTail) {
    return [] as Array<{ key: string; label: string; evidence: string; obligation: string }>
  }

  const scoreWithBonus = (cluster: ContinuityCluster, zone: string, bonus = 0) => {
    const base = scoreClusterInZone(cluster, zone)
    if (base <= 0) return 0
    return base + bonus + (cluster.forward ? 1 : 0)
  }

  const byKey = new Map<string, { cluster: ContinuityCluster; score: number; evidence: string }>()
  const bump = (cluster: ContinuityCluster, score: number, evidence: string) => {
    if (score <= 0) return
    const prev = byKey.get(cluster.key)
    if (!prev || score > prev.score) {
      byKey.set(cluster.key, { cluster, score, evidence: compactText(evidence, 160) })
    }
  }

  for (const cluster of CONTINUITY_CLUSTERS) {
    bump(cluster, scoreWithBonus(cluster, endingHook, 3), endingHook)
    bump(cluster, scoreWithBonus(cluster, trueTail, 1), trueTail || endingHook)
  }

  // Demote mid-body-only non-forward clusters even if they barely appear near the end of short chapters.
  for (const [key, row] of [...byKey.entries()]) {
    if (row.cluster.forward) continue
    const inHook = scoreClusterInZone(row.cluster, endingHook) > 0
    const inTrueTail = scoreClusterInZone(row.cluster, trueTail) > 0
    const inBody = scoreClusterInZone(row.cluster, body) > 0
    if (!inHook && inBody && !inTrueTail) byKey.delete(key)
    if (!inHook && inBody && inTrueTail && scoreClusterInZone(row.cluster, trueTail) < 2) byKey.delete(key)
  }

  let ranked = [...byKey.values()].sort((a, b) => b.score - a.score || a.cluster.key.localeCompare(b.cluster.key))

  // When a clear forward primary exists (from ending_hook or true tail), drop non-forward mid scenes.
  const hasForwardPrimary = ranked.some(item => item.cluster.forward && (
    scoreClusterInZone(item.cluster, endingHook) > 0 || scoreClusterInZone(item.cluster, trueTail) > 0
  ))
  if (hasForwardPrimary) {
    ranked = ranked.filter(item => item.cluster.forward || scoreClusterInZone(item.cluster, endingHook) > 0)
  }

  // Fallback for chapters without any cluster hit in the tight window.
  if (!ranked.length) {
    for (const cluster of CONTINUITY_CLUSTERS) {
      bump(cluster, scoreWithBonus(cluster, `${endingHook}。${wideTail}`, 0), endingHook || wideTail)
    }
    ranked = [...byKey.values()].sort((a, b) => b.score - a.score || a.cluster.key.localeCompare(b.cluster.key))
    const forwardOnly = ranked.filter(item => item.cluster.forward)
    if (forwardOnly.length) ranked = forwardOnly
  }

  // Prefer concrete late-scene primary when residual early labels still score on incidental words.
  const lateSceneEvidence = compactText(trueTail || endingHook || wideTail, 180)
  const lateSceneCandidates: Array<{ key: string; label: string; score: number; evidence: string }> = []
  if (/青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门)/.test(lateSceneEvidence)) {
    lateSceneCandidates.push({
      key: 'building_one_interior',
      label: '1号楼内部突入',
      score: 20,
      evidence: lateSceneEvidence,
    })
  }
  if (/权柄碎片|黑色石棺|黑色蚕茧/.test(lateSceneEvidence) && !/青铜巨门|血肉王座/.test(lateSceneEvidence)) {
    lateSceneCandidates.push({
      key: 'authority_fragment',
      label: '权柄碎片对峙',
      score: 16,
      evidence: lateSceneEvidence,
    })
  }
  if (/阿奇姆|带着.{0,8}天选者|拎起.{0,8}/.test(lateSceneEvidence) && /青铜巨门|血肉王座|门内/.test(lateSceneEvidence)) {
    lateSceneCandidates.push({
      key: 'companion_chosen',
      label: '同行天选者',
      score: 12,
      evidence: lateSceneEvidence,
    })
  }

  if (lateSceneCandidates.length) {
    const mappedLate = lateSceneCandidates
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        cluster: {
          key: item.key,
          label: item.label,
          patterns: [] as RegExp[],
          forward: true,
        },
        score: item.score,
        evidence: item.evidence,
      }))
    // Drop residual property/elevator primacy if late interior/authority scene clearly owns the true tail.
    ranked = [
      ...mappedLate,
      ...ranked.filter(item => !['property_enforcement', 'elevator_anomaly'].includes(item.cluster.key)
        || scoreClusterInZone(item.cluster, trueTail) >= 2),
    ]
    // unique by key, keep highest score
    const uniq = new Map<string, typeof ranked[0]>()
    for (const row of ranked) {
      const prev = uniq.get(row.cluster.key)
      if (!prev || row.score > prev.score) uniq.set(row.cluster.key, row)
    }
    ranked = [...uniq.values()].sort((a, b) => b.score - a.score)
  }

  // Residual property label without true enforcement pressure in true tail is never primary.
  ranked = ranked.filter(item => {
    if (item.cluster.key !== 'property_enforcement') return true
    const zone = `${endingHook}。${trueTail}`
    return /清场倒计时|合规性清理|物理合规|五分钟|倒计时|信封/.test(zone)
  })

  return ranked.slice(0, 3).map(item => {
    const evidence = item.evidence || compactText(endingHook || trueTail || wideTail, 160)
    return {
      key: item.cluster.key,
      label: item.cluster.label,
      evidence,
      obligation: compactText(`开篇前300-600字必须先承接上一章章末「${item.cluster.label}」：${evidence}`, 200),
    }
  })
}

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
  const primaryHit = interiorLanded
    ? interiorContinueHit
    : primaryCluster
      ? primaryCluster.patterns.some(pattern => pattern.test(opening))
      : false
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

export type DeliveredClimaxLanding = {
  key: string
  label: string
  evidence: string
  post_state: string
  forbidden_replays: string[]
}

function trueEndingWindow(text: string, size = 1000) {
  const value = String(text || '')
  return value.slice(Math.max(0, value.length - size))
}

/** Detect climaxes already fully delivered in previous chapter that must not be re-performed. */
export function extractDeliveredClimaxLandings(previousChapter: any = {}): DeliveredClimaxLanding[] {
  const text = chapterTextOf(previousChapter)
  if (!text.trim()) return []
  const tail = trueEndingWindow(text, 1100)
  const out: DeliveredClimaxLanding[] = []

  const enteredBuildingInterior = (
    (/撞进|冲进|闯入|踏入|化作一道.{0,8}(雷霆|流光)/.test(tail) && /未知的黑暗|门内|大堂|青铜巨门|1号楼/.test(tail))
    || (/青铜巨门|特权卡|黑金/.test(tail) && /撞进|冲进|蛮横地/.test(tail) && /(门内|大堂|王座|黑暗之中)/.test(tail))
  )
  if (enteredBuildingInterior) {
    out.push({
      key: 'building_one_interior_entry',
      label: '1号楼撞门突入',
      evidence: compactText(tail.slice(-220), 180),
      post_state: '已进入1号楼门内大堂，面对吊尸与血肉王座，继续向前推进门内压力',
      forbidden_replays: [
        '特权卡撞开青铜巨门入内',
        '从通道/门外再次冲向1号楼入口结算',
        '清场倒计时逼入门的整段重演',
        '无头保安门外围杀到进门的整段重演',
      ],
    })
  }

  // Generic: previous true-ending paragraph is a completed irreversible entry/escape/kill settlement.
  if (/彻底|已经|终于/.test(tail) && /死亡|撕碎|炼化|关闭|封死|撞进|冲进/.test(tail) && tail.length > 80) {
    // only add generic if no more specific landing already captured similar evidence
    if (!out.some(item => item.key === 'building_one_interior_entry')) {
      // skip overly generic for now to avoid false positives
    }
  }

  return out
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

/**
 * Drop recycled early-chapter seed fragments that conflict with previous ending hooks.
 */
export function decontaminateChapterSeedFields(input: {
  chapter_goal?: any
  chapter_summary?: any
  conflict?: any
  ending_hook?: any
  must_advance?: any
  previousChapter?: any
} = {}) {
  const previous = input.previousChapter
  const primary = extractPrimaryEndingHooks(previous)
  const primaryKeys = new Set(primary.map(item => item.key))
  const stalePatterns = [
    /十点邻居敲门借火/,
    /妈妈空碗\/厨房规则压迫/,
    /江哲主动开门迎敌/,
    /反制邻居并炼化规则核心破局/,
    /厨房实体被血腥味唤醒/,
    /爸爸利爪|耳光|能好好说话/,
  ]
  const shouldStrip = (text: string) => {
    const value = compactText(text, 400)
    if (!value) return false
    if (!stalePatterns.some(pattern => pattern.test(value))) return false
    // If previous ending already moved to property/elevator/etc, strip early recycled chains.
    if (primaryKeys.has('property_enforcement') || primaryKeys.has('elevator_anomaly') || primaryKeys.has('wang_nainai_capture')) {
      return true
    }
    // If seed is almost pure early chain and previous prose no longer about kitchen open, strip.
    if (primary.length && !primaryKeys.has('neighbor_knock') && !primaryKeys.has('kitchen_entity')) return true
    return false
  }

  const cleanField = (value: any, fallback = '') => {
    const text = compactText(value, 260)
    if (!text) return compactText(fallback, 240)
    if (!shouldStrip(text)) return text
    if (primary[0]) {
      return compactText(`承接上一章进度，优先推进：${primary.map(item => item.label).join('；')}；${primary[0].evidence}`, 240)
    }
    return compactText(fallback || text, 240)
  }

  const goal = cleanField(input.chapter_goal, primary[0]?.obligation || '')
  const summary = cleanField(input.chapter_summary, goal)
  const conflict = cleanField(input.conflict, primary.map(item => item.label).join('；'))
  const ending_hook = compactText(input.ending_hook, 200)
  const must_advance = uniqueTexts([
    ...primary.map(item => item.label),
    ...asArray(input.must_advance).map(item => compactText(item, 120)).filter(item => item && !shouldStrip(item)),
  ], 8)

  return {
    chapter_goal: goal,
    chapter_summary: summary,
    conflict,
    ending_hook,
    must_advance,
    decontaminated: shouldStrip(String(input.chapter_goal || '')) || shouldStrip(String(input.chapter_summary || '')),
    primary_hooks: primary,
  }
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

  const directive = detectOpeningHookMissDirective({
    chapter: { chapter_text: chapterText },
    previousChapter,
  })
  if (!directive) {
    return { required: false, passed: true, failure: null, directive: null }
  }
  // Only hard-require when previous ending has a clear forward hook cluster or delivered landing.
  const hooks = extractPrimaryEndingHooks(previousChapter)
  const landings = extractDeliveredClimaxLandings(previousChapter)
  const hard = landings.length > 0 || hooks.some(item => [
    'property_enforcement',
    'neighbor_knock',
    'kitchen_entity',
    'elevator_anomaly',
    'building_one_interior',
    'authority_fragment',
    'companion_chosen',
  ].includes(item.key))
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
