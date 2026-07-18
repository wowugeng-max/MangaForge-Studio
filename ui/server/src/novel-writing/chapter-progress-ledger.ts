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

const DELIVERED_SCORE = 52
const OVERLAP_SCORE = 48
const STALE_OVERLAP_RATIO = 0.45
const STALE_MIN_OVERLAPS = 1

const GENERIC_BEAT_NOISE = /规则规定|身份是|脸色|微笑|催促|不得|必须|否则|绝对不要/

function isActionableBeat(beat: string) {
  const text = compactText(beat)
  if (!text || text.length < 6) return false
  if (GENERIC_BEAT_NOISE.test(text) && !/(倒|倒汤|耳光|利爪|撕碎|暴怒|敲门|开门|审讯|掌权|再盛|反杀|压制)/.test(text)) {
    return text.length >= 16
  }
  return true
}

/** Related action clusters so overshot prose can stale a differently-worded next seed. */
const PROGRESS_CLUSTERS: Array<{ key: string; patterns: RegExp[] }> = [
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

function clusterHits(text: string) {
  const value = String(text || '')
  return PROGRESS_CLUSTERS.filter(cluster => cluster.patterns.some(pattern => pattern.test(value))).map(cluster => cluster.key)
}

function sharesProgressCluster(a: string, b: string) {
  const left = new Set(clusterHits(a))
  const right = clusterHits(b)
  return right.some(key => left.has(key))
}

function proseCoversBeat(beat: string, previousText: string) {
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

function beatDelivered(beat: string, chapterText: string) {
  const score = anchorMatchScore(beat, chapterText).score
  return { delivered: score >= DELIVERED_SCORE, score }
}

function extractTailBeats(chapterText: string, endingHook: string, outgoing?: OutgoingChapterHandoff | null) {
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

function extractOvershotBeats(input: {
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

function isCleanProgressPhrase(value: any) {
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

  let nextEndingHook = endingHook
  if (unwritten) {
    if (interiorLanding) {
      // Post-state seed, not a second copy of the crash climax.
      nextEndingHook = compactText(interiorLanding.post_state, 160)
    } else if (
      previousTrueEnding
      && (outlineLikeEnding || !endingHook || /电梯\/未定义|1号楼通行证去向|清场倒计时/.test(endingHook))
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
    ...(interiorLanding && unwritten ? { ending_hook: nextEndingHook } : {}),
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
