/**
 * System-level continuity guard:
 * - primary ending hooks must become next-chapter opening obligations
 * - general progress / parallel-plot replay detection (not only dining fight)
 * - seed decontamination against recycled early-chapter goals
 */

export function compactText(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

export function uniqueTexts(values: any, limit = 12) {
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

export function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

export function endingHookOf(chapter: any) {
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
    key: 'building_two_seeker',
    label: '2号楼寻找者对峙',
    patterns: [
      /2号楼保安队长|红衣级怪谈.{0,12}保安队长/,
      /寻找者.{0,8}已降临|捉迷藏/,
      /找到[…·.。]{0,4}你们了|抹杀规则.{0,8}轰然降临/,
      /巨型消防斧|猩红.{0,6}眼球/,
      /通往2号楼/,
    ],
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

export function clusterByKey(key: string) {
  return CONTINUITY_CLUSTERS.find(item => item.key === key) || null
}

export function scoreClusterInZone(cluster: ContinuityCluster, zone: string) {
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
    const hookScore = scoreWithBonus(cluster, endingHook, 3)
    const tailScore = scoreWithBonus(cluster, trueTail, 1)
    const inTrueTail = scoreClusterInZone(cluster, trueTail) > 0
    const inWideTail = scoreClusterInZone(cluster, wideTail) > 0
    // Stale ending_hook metadata must not outrank the real chapter-ending zone.
    // Only keep hook-field evidence when the same cluster is still visible in the true/wide tail,
    // or when there is no usable true tail text.
    if (hookScore > 0 && (trueTail.length < 40 || inTrueTail || inWideTail)) {
      // When the hook only appears as atmospheric residue in wideTail but not trueTail,
      // heavily demote so trueTail forward climax can win.
      const adjustedHookScore = (!inTrueTail && inWideTail && trueTail.length >= 80)
        ? Math.min(hookScore, 1.5)
        : hookScore
      bump(cluster, adjustedHookScore, endingHook)
    }
    bump(cluster, tailScore, trueTail || endingHook)
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
  if (/青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门)/.test(lateSceneEvidence)
    && !/2号楼保安队长|寻找者.{0,8}已降临|抹杀规则.{0,8}轰然降临/.test(lateSceneEvidence)) {
    lateSceneCandidates.push({
      key: 'building_one_interior',
      label: '1号楼内部突入',
      score: 20,
      evidence: lateSceneEvidence,
    })
  }
  if (/2号楼保安队长|寻找者.{0,8}已降临|抹杀规则.{0,8}轰然降临|找到[…·.。]{0,4}你们了/.test(lateSceneEvidence)) {
    lateSceneCandidates.push({
      key: 'building_two_seeker',
      label: '2号楼寻找者对峙',
      score: 22,
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

export type DeliveredClimaxLanding = {
  key: string
  label: string
  evidence: string
  post_state: string
  forbidden_replays: string[]
}

export function trueEndingWindow(text: string, size = 1000) {
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

