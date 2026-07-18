import { anchorMatchScore } from './text-matching'
import { decontaminateChapterSeedFields, extractDeliveredClimaxLandings, extractPrimaryEndingHooks } from './chapter-continuity-guard'
import type { OutgoingChapterHandoff } from './chapter-handoff-basics'
import {
  detectClosedBeatsInChapter,
  shouldSuppressOpenHook,
  closedFamilyLabels,
  buildLiveChapterContract,
  sanitizeHookList,
  isFamilyClosed,
} from './closed-beat-canon'

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
    const text = compactText(raw, 180)
    if (!text || text.length < 4) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

/** Split planned outline fields into beat-sized clauses. */
export function splitPlanBeats(...parts: any[]) {
  const text = parts.map(part => compactText(part, 800)).filter(Boolean).join('。')
  if (!text) return [] as string[]
  return uniqueTexts(
    text
      .split(/[。！？!?；;\n]+/)
      .flatMap(chunk => chunk.split(/(?<=[，,])(?=[^，,]{8,})/))
      .map(item => compactText(item, 120))
      .filter(item => item.length >= 8),
    16,
  )
}

export const DELIVERED_SCORE = 52
export const OVERLAP_SCORE = 48
export const STALE_OVERLAP_RATIO = 0.45
export const STALE_MIN_OVERLAPS = 1

export const GENERIC_BEAT_NOISE = /规则规定|身份是|脸色|微笑|催促|不得|必须|否则|绝对不要/

export function isActionableBeat(beat: string) {
  const text = compactText(beat)
  if (!text || text.length < 6) return false
  if (GENERIC_BEAT_NOISE.test(text) && !/(倒|倒汤|耳光|利爪|撕碎|暴怒|敲门|开门|审讯|掌权|再盛|反杀|压制)/.test(text)) {
    return text.length >= 16
  }
  return true
}

/** Related action clusters so overshot prose can stale a differently-worded next seed. */
export const PROGRESS_CLUSTERS: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: 'dining_fight',
    patterns: [
      /倒汤|热汤|毒汤|肉汤|汤倒|浇头|淋头/,
      /爸爸|家人/,
      /暴怒|暴走|膨胀|利爪|指甲|撕碎|耳光|金属摩擦|牙齿掉了|捂着脸|能好好说话/,
    ],
  },
  {
    key: 'table_power',
    patterns: [/掌权|绝对恐惧|开饭时间|再盛|再给我盛|空碗/],
  },
  {
    key: 'neighbor_knock',
    patterns: [/十点|敲门|邻居|借东西|钥匙|借火/],
  },
  {
    key: 'wang_nainai_capture',
    patterns: [/王奶奶/, /借酱油/, /冰箱|冷冻室|拖进|拽进/],
  },
  {
    key: 'tv_parallel_death',
    patterns: [/山本武藏/, /八咫镜|雷切/, /洞穿|撕成了碎片|挑战失败/],
  },
  {
    key: 'property_enforcement',
    patterns: [/物业/, /信封/, /合规性清理|物理合规/, /业主委员会/],
  },
  {
    key: 'elevator_anomaly',
    patterns: [/电梯/, /无脸/, /负一|负二|未定义区域/],
  },
  {
    key: 'kitchen_entity',
    patterns: [/厨房木门|厨房门/, /符纸/, /婴儿啼哭|巨婴/, /毁灭级/],
  },
]

export function isCleanProgressPhrase(value: any) {
  const text = compactText(value, 160)
  if (!text || text.length < 6 || text.length > 48) return false
  if (/^[的了在把被从与和及间座面上哲那这连刻已“"]/.test(text)) return false
  if (/分析员|弹幕|系统提示|按照小区管理条例|能量波动并无异常|超级感官|手心里全是冷汗/.test(text)) return false
  if (/[“”].{6,}[“”]/.test(text) && /说|道|喊|问|惨叫|笑/.test(text)) return false
  if (/，\s*。|。\s*，/.test(text)) return false
  if (/说|道|喊|问/.test(text) && text.length < 22) return false
  if (/章末留下|十点邻居敲门借火|主动开门迎敌|假的终究是假的|膝撞|保安队长/.test(text) && !/禁止|不要|已关闭/.test(text)) return false
  // Reject recursive meta wrappers used as atomic beats.
  if (/^承接上一章|^优先推进：|^禁止回放：/.test(text)) return false
  // Prefer label-like or short actionable hooks.
  if (/\/|线$|压力$|冲突$|对峙$|推进$|压迫$|核心$|倒计时$|去向$|未解$|已兑现$|已打爆$|敲门$/.test(text)) return true
  if (/推进|巩固|转向|1号楼|通行证|居委会|电梯|物业|王奶奶/.test(text) && text.length <= 36) return true
  return false
}

export function clusterHits(text: string) {
  const value = String(text || '')
  return PROGRESS_CLUSTERS.filter(cluster => cluster.patterns.some(pattern => pattern.test(value))).map(cluster => cluster.key)
}

export function sharesProgressCluster(a: string, b: string) {
  const left = new Set(clusterHits(a))
  const right = clusterHits(b)
  return right.some(key => left.has(key))
}

export function proseCoversBeat(beat: string, previousText: string) {
  if (!previousText || !beat) return false
  if (anchorMatchScore(beat, previousText).score >= 40) return true
  // dining fight seed vs pour-soup overshoot: require dad/family + one combat/soup signal in prose
  const dining = clusterHits(beat).includes('dining_fight')
  if (dining) {
    const soup = /倒汤|热汤|毒汤|肉汤|汤倒|浇|淋头|端起汤碗/.test(previousText)
    const dad = /爸爸|家人/.test(previousText)
    const combat = /暴怒|暴走|膨胀|利爪|指甲|撕碎|耳光|金属摩擦|咆哮|愤怒|溶解|溃烂|掌权|能好好说话/.test(previousText)
    if (soup && dad && combat) return true
    if (soup && dad && /倒|浇|淋/.test(beat)) return true
  }
  // neighbor knock already opened
  if (clusterHits(beat).includes('neighbor_knock') && /十点|敲门|邻居|借东西/.test(previousText)) return true
  if (clusterHits(beat).includes('table_power') && /掌权|再盛|空碗|开饭时间/.test(previousText)) return true
  return false
}

export function beatDelivered(beat: string, chapterText: string) {
  const score = anchorMatchScore(beat, chapterText).score
  return { delivered: score >= DELIVERED_SCORE, score }
}

export function extractTailBeats(chapterText: string, endingHook: string, outgoing?: OutgoingChapterHandoff | null) {
  const tail = compactText(chapterText.slice(Math.max(0, chapterText.length - 900)), 900)
  const candidates = uniqueTexts([
    outgoing?.unresolved_action,
    endingHook,
    ...splitPlanBeats(tail),
  ], 10)
  // Prefer unresolved outgoing action first.
  return uniqueTexts([
    outgoing?.unresolved_action,
    ...candidates.filter(item => item !== compactText(outgoing?.unresolved_action)),
  ], 8)
}

export function extractOvershotBeats(input: {
  chapterText: string
  plannedBeats: string[]
  plannedEnding: string
  outgoing?: OutgoingChapterHandoff | null
}) {
  const text = String(input.chapterText || '')
  if (!text) return [] as string[]
  const plannedJoined = input.plannedBeats.join('｜')
  const plannedEnding = compactText(input.plannedEnding)
  const tail = text.slice(Math.max(0, text.length - 1200))
  const markers = [
    /(?:掌权者|真正的掌权|绝对恐惧|再给我盛|开饭时间还没结束)/,
    /(?:晚上十点|十点整|敲门声|门外的[“"]?邻居|来借东西了)/,
    /(?:钥匙插入锁孔|拧动的声音)/,
    /(?:反手一记耳光|抽得在地上滚|牙齿掉了)/,
    /(?:不闪不避|利爪抓在|金属摩擦)/,
  ]
  const found: string[] = []
  for (const marker of markers) {
    const match = tail.match(new RegExp(`.{0,18}${marker.source}.{0,28}`, 'u'))
    if (!match) continue
    const beat = compactText(match[0], 80)
    if (!beat) continue
    // Overshot if not already the planned ending and not fully covered by seed plan wording.
    const inPlan = plannedEnding && anchorMatchScore(beat, plannedEnding).score >= 70
    const covered = input.plannedBeats.some(planBeat => anchorMatchScore(beat, planBeat).score >= 70)
      || (plannedJoined && anchorMatchScore(beat, plannedJoined).score >= 72)
    if (!inPlan && !covered) found.push(beat)
  }
  if (input.outgoing?.hook_tail_divergence && input.outgoing.unresolved_action) {
    found.push(compactText(input.outgoing.unresolved_action, 120))
  }
  return uniqueTexts(found, 8)
}

export type ChapterProgressLedger = {
  version: 'chapter_progress_ledger_v1'
  delivered_beats: string[]
  unresolved_next: string[]
  overshot_into_future: string[]
  forbidden_replays: string[]
  planned_beats: string[]
  confidence: number
  source: 'prose_and_plan' | 'outgoing_only' | 'empty'
}

export function resolveChapterProgressLedger(input: {
  chapterText?: any
  endingHook?: any
  plannedGoal?: any
  plannedSummary?: any
  plannedConflict?: any
  plannedMustAdvance?: any
  outgoingHandoff?: OutgoingChapterHandoff | null
} = {}): ChapterProgressLedger {
  const chapterText = String(input.chapterText || '')
  const plannedBeats = splitPlanBeats(
    input.plannedGoal,
    input.plannedSummary,
    input.plannedConflict,
    ...asArray(input.plannedMustAdvance),
    input.endingHook,
  )
  const outgoing = input.outgoingHandoff || null

  if (!chapterText && !outgoing?.unresolved_action) {
    return {
      version: 'chapter_progress_ledger_v1',
      delivered_beats: [],
      unresolved_next: [],
      overshot_into_future: [],
      forbidden_replays: [],
      planned_beats: plannedBeats,
      confidence: 0,
      source: 'empty',
    }
  }

  const delivered_beats = uniqueTexts(
    plannedBeats.filter(beat => isActionableBeat(beat) && beatDelivered(beat, chapterText).delivered),
    12,
  )

  // Closed payoffs already finished in prose (do not put open hooks here).
  const closedFamilies = detectClosedBeatsInChapter({
    chapter_text: chapterText,
    chapter_no: 0,
    raw_payload: { chapter_progress_ledger: { delivered_beats: plannedBeats } },
  })
  const closedActionHints = uniqueTexts([
    /倒.{0,6}汤|将整碗汤倒/.test(chapterText) ? '倒汤反制' : '',
    /耳光|抽得在地上滚|牙齿掉了/.test(chapterText) ? '耳光压制爸爸' : '',
    /利爪|指甲变长|撕碎|身体.{0,6}膨胀/.test(chapterText) ? '爸爸利爪/暴走冲突' : '',
    /掌权者|绝对恐惧|能好好说话了吗/.test(chapterText) ? '餐桌掌权' : '',
    /王奶奶/.test(chapterText) && /冰箱|冷冻/.test(chapterText) ? '王奶奶捕获/冷藏' : '',
    /山本武藏/.test(chapterText) && /洞穿|撕成|挑战失败|死亡|惨状/.test(chapterText) ? '电视平行死亡线已开演' : '',
    ...closedFamilyLabels(closedFamilies),
    ...closedFamilies.flatMap(item => item.evidence.slice(0, 1)),
  ].filter(Boolean), 12)
  // Open hooks that still belong to the next chapter timeline.
  // Prefer true-ending window so residual mid-arc nouns do not recycle as next seeds.
  const trueTail = chapterText.slice(Math.max(0, chapterText.length - 900))
  const lateInterior = /青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门|门内)|干瘪尸体.{0,8}吊挂/.test(trueTail)
  const lateAuthority = /权柄碎片|黑色石棺|黑色蚕茧|秩序.{0,6}混乱/.test(trueTail)
  const lateCompanion = /阿奇姆|带着.{0,8}天选者|拎起.{0,8}(瘫软|天选)/.test(trueTail)
  const openActionHints = uniqueTexts([
    // Latest landing first.
    lateInterior ? '1号楼内部/血肉王座压力' : '',
    lateCompanion ? '同行天选者处置' : '',
    lateAuthority && !lateInterior ? '权柄碎片对峙未解' : '',
    /再给我盛|再盛一碗|开饭时间还没结束/.test(chapterText) ? '要求再盛汤' : '',
    // Only surface borrow-fire knock if that family is not already closed in this prose.
    (!isFamilyClosed(closedFamilies, 'neighbor_borrow_fire')
      && /十点|敲门|邻居.*借|来借东西了|借火/.test(chapterText)
      && !/半死不活|炼化|邻里借贷规则核心/.test(chapterText)
      && !lateInterior) ? '十点邻居敲门' : '',
    // Property wave-1 countdown only if still a true ending pressure, not residual 物业尸体 mentions.
    (!isFamilyClosed(closedFamilies, 'property_compliance')
      && !lateInterior
      && /清场倒计时|合规性清理|物理合规|五分钟内/.test(trueTail)
      && /物业|信封|清场|执法/.test(trueTail)
      && !/轰碎成虚无|合规执法棍.{0,12}粉碎|三个物业诡异/.test(chapterText))
      ? '物业合规清场倒计时' : '',
    // Elevator/pass only if still the active ending zone (not already crashed past into building interior).
    (!lateInterior && /电梯|无脸|负一|负二|未定义区域/.test(trueTail)) ? '电梯/未定义区域压力' : '',
    (!lateInterior && /1号楼通行证|通行证|诡币/.test(trueTail) && !/撞进|青铜巨门|血肉王座/.test(trueTail))
      ? '1号楼通行证去向'
      : '',
    lateInterior ? '1号楼内部突入后的未知黑暗' : '',
    /厨房木门|符纸|婴儿|毁灭级/.test(trueTail)
      && !isFamilyClosed(closedFamilies, 'kitchen_entity_core')
      && !lateInterior
      ? '厨房实体未解' : '',
    /王奶奶|借酱油/.test(trueTail)
      && !isFamilyClosed(closedFamilies, 'wang_nainai_visit')
      && !lateInterior
      ? '王奶奶压力未解' : '',
  ].filter(Boolean), 10)

  const mergedDelivered = uniqueTexts([...delivered_beats, ...closedActionHints], 14)

  const overshot_into_future = extractOvershotBeats({
    chapterText,
    plannedBeats,
    plannedEnding: String(input.endingHook || ''),
    outgoing,
  })

  const tailCandidates = extractTailBeats(chapterText, String(input.endingHook || ''), outgoing)
    .filter(item => !mergedDelivered.some(done => anchorMatchScore(item, done).score >= 78))
  const forwardLooking = uniqueTexts([
    outgoing?.unresolved_action,
    ...openActionHints,
    ...overshot_into_future,
    ...tailCandidates.filter(item => /敲门|邻居|十点|再盛|空碗|钥匙|门外|借东西|下一|尚未|未完|未解|青铜|王座|权柄|天选|黑暗|巨门/.test(item)),
    ...tailCandidates.slice(0, 2),
  ], 8)
  const hasForwardHook = forwardLooking.some(item => /敲门|邻居|十点|再盛|钥匙|空碗|青铜|王座|权柄|1号楼内部|同行天选/.test(item))
  const unresolved_next = sanitizeHookList(
    forwardLooking.filter(item => {
      if (shouldSuppressOpenHook(item, closedFamilies)) return false
      if (!hasForwardHook) return true
      // Prefer forward hooks; drop closed dining payoffs / seed endings once we already overshot.
      if (clusterHits(item).includes('dining_fight') && !/敲门|邻居|十点|再盛|空碗|钥匙/.test(item)) return false
      if (/突然将整碗汤倒|倒在了“爸爸”的头上|倒在爸爸/.test(item)) return false
      if (/真正的掌权者/.test(item) && forwardLooking.some(other => /敲门|邻居|十点/.test(other))) return false
      // Closed borrow-fire / property wave-1 must not remain as unresolved hooks.
      if (isFamilyClosed(closedFamilies, 'neighbor_borrow_fire') && /十点邻居敲门|借火|主动开门迎敌|不知死活的敲门者|404号房门外的敲门/.test(item)) return false
      if (isFamilyClosed(closedFamilies, 'property_compliance') && /物业合规清场|清场倒计时|赶在清场|合规清场/.test(item)) return false
      return true
    }),
    closedFamilies,
    8,
  ).filter(isCleanProgressPhrase)
    .filter(item => {
      // Drop long system-announcement shards when we already have cleaner late labels.
      if (/三分钟内|强行抹杀|系统提示|警告：|所有没能进入/.test(item)) return false
      return true
    })
    .slice(0, 6)

  const forbidden_replays = uniqueTexts([
    ...closedActionHints,
    ...mergedDelivered.filter(beat => /倒|汤|耳光|利爪|暴怒|掌权|撕碎|热汤|暴走|膨胀/.test(beat) && !/敲门|邻居|十点|再盛|空碗|钥匙/.test(beat)),
    ...mergedDelivered.filter(isActionableBeat).slice(0, 6),
  ], 12).filter(beat => !/敲门|邻居|十点|再盛|空碗|钥匙|来借东西/.test(beat))

  const confidence = chapterText
    ? Math.min(96, 40 + mergedDelivered.length * 8 + (outgoing ? 8 : 0) + (overshot_into_future.length ? 6 : 0))
    : outgoing
      ? 36
      : 0

  return {
    version: 'chapter_progress_ledger_v1',
    delivered_beats: mergedDelivered,
    unresolved_next,
    overshot_into_future,
    forbidden_replays,
    planned_beats: plannedBeats,
    confidence,
    source: chapterText ? 'prose_and_plan' : 'outgoing_only',
  }
}

export function readChapterProgressLedger(chapter: any): ChapterProgressLedger | null {
  const raw = chapter?.raw_payload || chapter?.rawPayload || {}
  const stored = raw.chapter_progress_ledger || raw.chapterProgressLedger || chapter?.chapter_progress_ledger
  if (stored?.version === 'chapter_progress_ledger_v1' && Array.isArray(stored.delivered_beats)) {
    return {
      version: 'chapter_progress_ledger_v1',
      delivered_beats: uniqueTexts(stored.delivered_beats, 14),
      unresolved_next: uniqueTexts(stored.unresolved_next, 8),
      overshot_into_future: uniqueTexts(stored.overshot_into_future, 8),
      forbidden_replays: uniqueTexts(stored.forbidden_replays, 12),
      planned_beats: uniqueTexts(stored.planned_beats, 16),
      confidence: Number(stored.confidence || 0) || 0,
      source: stored.source || 'prose_and_plan',
    }
  }
  const chapterText = chapter?.chapter_text || chapter?.chapterText || ''
  if (!chapterText && !raw.outgoing_handoff && !raw.outgoingHandoff) return null
  return resolveChapterProgressLedger({
    chapterText,
    endingHook: chapter?.ending_hook || chapter?.endingHook || '',
    plannedGoal: chapter?.chapter_goal || chapter?.chapterGoal || chapter?.goal || '',
    plannedSummary: chapter?.chapter_summary || chapter?.chapterSummary || chapter?.summary || '',
    plannedConflict: chapter?.conflict || '',
    plannedMustAdvance: raw.must_advance || raw.mustAdvance,
    outgoingHandoff: raw.outgoing_handoff || raw.outgoingHandoff || null,
  })
}

export type PlanOverlapReport = {
  plan_stale: boolean
  overlap_score: number
  overlapping_beats: string[]
  remaining_plan_beats: string[]
}

export function detectPlanOverlap(
  ledger: ChapterProgressLedger | null | undefined,
  nextChapterPlan: {
    goal?: any
    summary?: any
    conflict?: any
    ending_hook?: any
    endingHook?: any
    must_advance?: any
    mustAdvance?: any
  } = {},
  options: { previousChapterText?: any } = {},
): PlanOverlapReport {
  if (!ledger || (!ledger.delivered_beats.length && !ledger.forbidden_replays.length && !options.previousChapterText)) {
    return { plan_stale: false, overlap_score: 0, overlapping_beats: [], remaining_plan_beats: [] }
  }
  const nextBeats = splitPlanBeats(
    nextChapterPlan.goal,
    nextChapterPlan.summary,
    nextChapterPlan.conflict,
    nextChapterPlan.ending_hook || nextChapterPlan.endingHook,
    ...asArray(nextChapterPlan.must_advance || nextChapterPlan.mustAdvance),
  )
  if (!nextBeats.length) {
    return { plan_stale: false, overlap_score: 0, overlapping_beats: [], remaining_plan_beats: [] }
  }

  const deliveredPool = uniqueTexts([
    ...ledger.delivered_beats,
    ...ledger.forbidden_replays,
    ...ledger.overshot_into_future,
  ], 20)
  const previousText = String(options.previousChapterText || '')

  const directOverlaps = nextBeats.filter(beat => {
    if (!isActionableBeat(beat)) return false
    const againstDelivered = deliveredPool.some(done => {
      const a = anchorMatchScore(beat, done).score
      const b = anchorMatchScore(done, beat).score
      return Math.max(a, b) >= OVERLAP_SCORE || sharesProgressCluster(beat, done)
    })
    if (againstDelivered) return true
    if (previousText && proseCoversBeat(beat, previousText)) return true
    return false
  })

  // If a cluster is already covered, pull in sibling next-seed beats from the same closed cluster.
  const coveredClusters = new Set(directOverlaps.flatMap(beat => clusterHits(beat)))
  if (previousText) {
    for (const key of clusterHits(previousText + '｜' + deliveredPool.join('｜'))) coveredClusters.add(key)
  }
  const overlapping_beats = nextBeats.filter(beat => {
    if (directOverlaps.includes(beat)) return true
    if (!isActionableBeat(beat)) return false
    return clusterHits(beat).some(key => coveredClusters.has(key) && key === 'dining_fight')
  })

  const remaining_plan_beats = nextBeats.filter(beat => {
    if (overlapping_beats.includes(beat) || proseCoversBeat(beat, previousText)) return false
    // Drop weak aftermath fragments once dining fight cluster is closed.
    if (coveredClusters.has('dining_fight') && /剥夺身份|哭得|两百斤|瑟瑟发抖|能好好说话|牙齿掉了/.test(beat)) return false
    if (coveredClusters.has('dining_fight') && clusterHits(beat).includes('dining_fight') && !/敲门|邻居|再盛|空碗/.test(beat)) return false
    return true
  })
  const actionableCount = Math.max(1, nextBeats.filter(isActionableBeat).length || nextBeats.length)
  const overlap_score = Math.round((overlapping_beats.length / actionableCount) * 100)
  const plan_stale = overlapping_beats.length >= STALE_MIN_OVERLAPS
    && (
      overlap_score >= Math.round(STALE_OVERLAP_RATIO * 100)
      || overlapping_beats.length >= 2
      || (overlapping_beats.length >= 1 && ledger.overshot_into_future.length > 0)
      || (overlapping_beats.length >= 1 && coveredClusters.has('dining_fight'))
    )

  return { plan_stale, overlap_score, overlapping_beats, remaining_plan_beats }
}


