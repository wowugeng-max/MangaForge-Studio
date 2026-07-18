/**
 * Closed-beat canon: prevent resolved pressures from steering later chapters,
 * QA, revision, and next-chapter seeds across projects.
 *
 * L1: project/chapter closed beat families with evidence
 * L2: live chapter contract = plan - closed - zombie residual hooks
 * L3: QA/revision gate strips dead goals and can force repair of zombie residual prose
 */

export type BeatFamilyStatus = 'open' | 'closed' | 'superseded'

export type ProgressBeatFamilyId =
  | 'dining_rule_force'
  | 'neighbor_borrow_fire'
  | 'kitchen_entity_core'
  | 'wang_nainai_visit'
  | 'property_compliance'
  | 'elevator_undefined'
  | 'neighborhood_committee'
  | 'door_knock_generic'

export type ClosedBeatRecord = {
  family: ProgressBeatFamilyId
  label: string
  status: BeatFamilyStatus
  closed_at_chapter?: number
  evidence: string[]
  patterns: string[]
}

export type LiveChapterContract = {
  version: 'live_chapter_contract_v1'
  plan_health: 'aligned' | 'stale_seed' | 'dead_goal_pollution' | 'missing_live_goal'
  live_goals: string[]
  live_conflict: string
  live_ending_hook: string
  acceptance_goals: string[]
  closed_blocked: Array<{ family: ProgressBeatFamilyId | 'zombie_residual'; label: string; reason: string; snippet: string }>
  forbidden_replays: string[]
  zombie_residuals: string[]
  raw_goal: string
  raw_conflict: string
}

export type ZombiePressureFinding = {
  key: string
  family: ProgressBeatFamilyId | 'zombie_residual'
  label: string
  severity: 'high' | 'medium'
  description: string
  evidence: string
  fix: string
  directive: string
}

type FamilyDef = {
  family: ProgressBeatFamilyId
  label: string
  goalPatterns: RegExp[]
  closeAllOf?: RegExp[]
  closeAnyOf?: RegExp[]
  openPatterns?: RegExp[]
}

const FAMILY_DEFS: FamilyDef[] = [
  {
    family: 'dining_rule_force',
    label: '餐桌/毒汤规则压迫与反制',
    goalPatterns: [
      /倒汤|热汤|毒汤|空碗|再盛|喝汤|家庭公约|不能拒绝家人|利爪|耳光|爸爸.*暴|暴.*爸爸|餐桌掌权/,
    ],
    closeAnyOf: [
      /倒.{0,8}汤.*?(爸爸|家人)|将整碗汤倒/,
      /耳光.*?(爸爸|地上滚)|掌权者|能好好说话/,
      /爸爸利爪|利爪\/暴走|餐桌掌权/,
    ],
    openPatterns: [/再盛|空碗|开饭时间还没结束/],
  },
  {
    family: 'neighbor_borrow_fire',
    label: '十点借火邻居冲突',
    goalPatterns: [
      /十点.*?(邻居|借火)|邻居.*?(借火|借东西)|主动开门迎敌|反制邻居|炼化规则核心|邻里借贷|来借东西了/,
      /开门迎敌|借火.*邻居|邻居.*开门|不知死活的敲门者|404号房门外的敲门/,
    ],
    closeAnyOf: [
      /炼化.*?(邻居|邻里借贷|规则核心)|吞噬并炼化.*?(邻居|邻里|规则核心)/,
      /半死不活的?[“"]?邻居|邻居仅存的复眼|把邻居.*?当成汤|邻居和厨房.*?炖/,
      /邻里借贷规则核心|反制邻居并炼化/,
      /您已吞噬并炼化.{0,40}邻里/,
    ],
    openPatterns: [/十点.*敲门|邻居.*借火|借火|主动开门迎敌|十点邻居敲门/],
  },
  {
    family: 'kitchen_entity_core',
    label: '厨房巨婴/规则核心',
    goalPatterns: [/厨房实体|巨婴|规则核心|厨房木门|符纸|婴儿啼哭|毁灭级/],
    closeAnyOf: [
      /404号房深层规则核心|规则核心具现体|巨婴.{0,20}(炼化|熔炼|吞噬)/,
      /厨房.*?怪物.*?汤|两名强大怪异本源炼化/,
    ],
    openPatterns: [/厨房实体被血腥味唤醒|厨房木门|符纸/],
  },
  {
    family: 'wang_nainai_visit',
    label: '王奶奶登场线',
    goalPatterns: [/王奶奶|借酱油/],
    closeAnyOf: [/王奶奶.{0,40}(冰箱|冷冻室|捕获|拖进|拽进|关进)|把王奶奶.{0,20}(塞|扔|丢|关)/],
    openPatterns: [/王奶奶|借酱油/],
  },
  {
    family: 'property_compliance',
    label: '物业合规清场（第一波）',
    goalPatterns: [
      /物业|合规性清理|物理合规|清场倒计时|合规清场|合规执法|五分钟后登门|赶在清场|清场倒计时归零|物业经理/,
    ],
    // Wave-1 property door cleanup is closed once the enforcers are physically destroyed.
    closeAnyOf: [
      // Intention ("先教教物业") is NOT close; require physical resolution of wave-1 enforcers.
      /合规执法棍.{0,24}(粉碎|捏成|捏碎)|捏成了粉碎/,
      /三个物业诡异.{0,20}(轰碎|粉碎)|物业经理.{0,40}(轰碎|粉碎|捏)|保安.{0,20}(轰碎|粉碎)/,
      /被生生轰碎成虚无|物理握力下.{0,20}粉碎/,
      /教教你们什么叫真正的[“']?物理合规[“']?。?.{0,80}(轰碎|粉碎|捏)/,
    ],
    openPatterns: [
      /物业合规清场|清场倒计时|合规清场|合规性清理|五分钟后登门|赶在清场|清场倒计时归零|物业经理登门/,
    ],
  },
  {
    family: 'elevator_undefined',
    label: '电梯/未定义区域',
    goalPatterns: [/电梯|无脸|未定义区域|负一|负二/],
    closeAnyOf: [/电梯.{0,20}无脸.{0,30}(解决|炼化|粉碎|离开)|未定义区域.{0,20}(脱离|离开|破解)/],
    openPatterns: [/电梯|无脸|未定义区域/],
  },
  {
    family: 'neighborhood_committee',
    label: '居委会/业主会议',
    goalPatterns: [/居委会|业主会|神秘会议|顾主任|抹杀规则/],
    closeAnyOf: [
      /1号楼通行证|递出了?.{0,12}通行证|五百枚|保护费/,
      /顾主任.{0,30}(败|逃|死|炼化|粉碎|乞求|高抬贵手)/,
    ],
    openPatterns: [/居委会|业主会|顾主任/],
  },
]

function compact(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function uniqueTexts(values: any, limit = 16) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compact(raw, 200)
    if (!text || text.length < 2) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function chapterNoOf(chapter: any) {
  return Number(chapter?.chapter_no || chapter?.chapterNo || 0) || 0
}

function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

function proseMatchesClose(def: FamilyDef, prose: string) {
  if (!prose) return false
  if (def.closeAnyOf?.some(pattern => pattern.test(prose))) return true
  if (def.closeAllOf?.length && def.closeAllOf.every(pattern => pattern.test(prose))) return true
  return false
}

function textHitsFamilyGoal(def: FamilyDef, text: string) {
  if (!text) return false
  return def.goalPatterns.some(pattern => pattern.test(text))
}

function extractEvidence(prose: string, patterns: RegExp[], limit = 2) {
  const out: string[] = []
  for (const pattern of patterns) {
    const match = prose.match(pattern)
    if (match?.[0]) out.push(compact(match[0], 120))
    if (out.length >= limit) break
  }
  return uniqueTexts(out, limit)
}

function familyDef(family: ProgressBeatFamilyId) {
  return FAMILY_DEFS.find(item => item.family === family) || null
}

/** Detect closed families from a single chapter's prose (+ optional delivered labels). */
export function detectClosedBeatsInChapter(chapter: any = {}): ClosedBeatRecord[] {
  const prose = chapterTextOf(chapter)
  const no = chapterNoOf(chapter)
  const deliveredBlob = [
    ...asArray(chapter?.raw_payload?.chapter_progress_ledger?.delivered_beats),
    ...asArray(chapter?.raw_payload?.chapterProgressLedger?.delivered_beats),
    ...asArray(chapter?.chapter_progress_ledger?.delivered_beats),
  ].join('。')
  const corpus = `${prose}\n${deliveredBlob}`
  if (!compact(corpus, 20)) return []

  const out: ClosedBeatRecord[] = []
  for (const def of FAMILY_DEFS) {
    if (!proseMatchesClose(def, corpus)) continue
    out.push({
      family: def.family,
      label: def.label,
      status: 'closed',
      closed_at_chapter: no || undefined,
      evidence: extractEvidence(corpus, [...(def.closeAnyOf || []), ...(def.closeAllOf || [])]),
      patterns: def.goalPatterns.map(item => item.source).slice(0, 4),
    })
  }
  return out
}

/** Merge closed beats across chapters; closed is sticky. */
export function collectClosedBeatFamiliesFromChapters(chapters: any[] = []): ClosedBeatRecord[] {
  const byFamily = new Map<ProgressBeatFamilyId, ClosedBeatRecord>()
  const ordered = asArray(chapters)
    .slice()
    .sort((a, b) => chapterNoOf(a) - chapterNoOf(b))

  for (const chapter of ordered) {
    for (const beat of detectClosedBeatsInChapter(chapter)) {
      const prev = byFamily.get(beat.family)
      if (!prev || prev.status !== 'closed') {
        byFamily.set(beat.family, beat)
        continue
      }
      byFamily.set(beat.family, {
        ...prev,
        evidence: uniqueTexts([...(prev.evidence || []), ...(beat.evidence || [])], 6),
        closed_at_chapter: Math.min(
          Number(prev.closed_at_chapter || beat.closed_at_chapter || 0) || 0,
          Number(beat.closed_at_chapter || prev.closed_at_chapter || 0) || 0,
        ) || prev.closed_at_chapter || beat.closed_at_chapter,
      })
    }
  }
  return Array.from(byFamily.values()).filter(item => item.status === 'closed')
}

export function isFamilyClosed(closed: ClosedBeatRecord[] | null | undefined, family: ProgressBeatFamilyId) {
  return asArray(closed).some(item => item?.family === family && item?.status === 'closed')
}

export function matchFamiliesInText(text: string, closedOnly?: ClosedBeatRecord[] | null): ProgressBeatFamilyId[] {
  const value = compact(text, 800)
  if (!value) return []
  const out: ProgressBeatFamilyId[] = []
  for (const def of FAMILY_DEFS) {
    if (closedOnly && !isFamilyClosed(closedOnly, def.family)) continue
    if (textHitsFamilyGoal(def, value) || def.openPatterns?.some(pattern => pattern.test(value))) {
      out.push(def.family)
    }
  }
  return out
}

/**
 * Residual hooks that keep recycled closed pressure alive under new wording.
 * Generic across projects: countdown/cleanup after wave-1 resolved, door-knock
 * after neighbor arc closed without a newly named live threat, etc.
 */
export function isZombieResidualHook(text: string, closed: ClosedBeatRecord[] = []) {
  if (!closed.length) return false
  const value = compact(text, 800)
  if (!value) return false

  if (isFamilyClosed(closed, 'neighbor_borrow_fire')) {
    if (/借火|主动开门迎敌|十点邻居敲门|邻里借贷|反制邻居并炼化/.test(value)) return true
    // Anonymous residual knock / reopen-404 pressure after neighbor arc closed.
    if (/(404.{0,8}门外|门外).{0,12}敲门|不知死活的敲门者|十点整.{0,8}邻居敲门/.test(value)) {
      // Allow only when a still-open named antagonist owns the knock.
      if (/王奶奶/.test(value) && !isFamilyClosed(closed, 'wang_nainai_visit')) return false
      if (/物业经理|物业客服/.test(value) && !isFamilyClosed(closed, 'property_compliance')) return false
      return true
    }
    if (/(亲手)?拧开404|赶回404|返回404|回到404/.test(value) && /门|敲门|迎敌|清场/.test(value)) return true
  }

  if (isFamilyClosed(closed, 'property_compliance')) {
    if (/清场倒计时|合规清场|合规性清理|五分钟后登门|赶在清场|清场倒计时归零|生命税|物业合规清场倒计时/.test(value)) {
      return true
    }
    if (/物业经理/.test(value) && /(登门|清场|清理|砸门|合规执法)/.test(value) && !/(轰碎|粉碎|已解决|已打爆)/.test(value)) {
      return true
    }
  }

  if (isFamilyClosed(closed, 'dining_rule_force')) {
    if (/倒汤反制|爸爸利爪|耳光压制|再盛一碗毒汤/.test(value)) return true
  }

  if (isFamilyClosed(closed, 'kitchen_entity_core')) {
    if (/厨房实体被血腥味唤醒|再炼化巨婴|规则核心破局/.test(value) && /未完成|必须|继续|再次/.test(value)) return true
  }

  return false
}

/** True if text demands completion/replay of a closed family beat. */
export function textDemandsClosedBeat(text: string, closed: ClosedBeatRecord[] = []) {
  if (!closed.length) return false
  const value = compact(text, 800)
  if (!value) return false

  if (isZombieResidualHook(value, closed)) {
    // Goal-like or hook-like language around zombie residual = demand.
    if (/未完成|核心目标|本章目标|必须|补齐|赶在|倒计时|回放|重演|章末|亲手|拧开|开门迎敌|MISSING|target_missing|推进|优先/i.test(value)
      || /敲门|清场|借火|迎敌|404/.test(value)) {
      return true
    }
  }

  if (isFamilyClosed(closed, 'neighbor_borrow_fire')) {
    if (/主动开门迎敌|开门迎敌|借火邻居|十点.{0,6}借火|迎战.{0,12}邻居/.test(value)) return true
    if (/(返回|回到)\s*404/.test(value) && /(开门|门把手|防盗门|迎敌|借火|邻居|敲门)/.test(value)) return true
    if (/(返回|回到)\s*404/.test(value) && /(瞬移|高速移动|超级速度|不再耽搁|防御结界)/.test(value)) return true
  }

  if (isFamilyClosed(closed, 'property_compliance')) {
    if (/清场倒计时|赶在清场|合规清场|五分钟.{0,8}清场|完成.{0,8}清场/.test(value)) return true
  }

  const hits = matchFamiliesInText(value, closed)
  if (!hits.length) return false
  const goalish = /未完成|核心目标|本章目标|必须完成|补齐.{0,8}目标|主动开门迎敌|开门迎敌|回放|重演|完成目标|MISSING_GOAL|target_missing|未完成本章|去迎|迎战.{0,12}邻居|拉开.{0,8}房门|倒计时归零/i.test(value)
  return goalish
}

function stripClausesMatchingClosed(text: string, closed: ClosedBeatRecord[]) {
  const source = compact(text, 1200)
  if (!source || !closed.length) return source
  const parts = source
    .split(/[。！？!?；;\n]+/)
    .map(item => compact(item, 240))
    .filter(Boolean)
  const kept = parts.filter(part => {
    if (isZombieResidualHook(part, closed) || textDemandsClosedBeat(part, closed)) return false
    const families = matchFamiliesInText(part, closed)
    if (!families.length) return true
    // Keep only if it clearly introduces a still-open named pressure.
    const openNamed = (
      (/王奶奶|借酱油/.test(part) && !isFamilyClosed(closed, 'wang_nainai_visit'))
      || (/居委会|顾主任|通行证|诡币|1号楼/.test(part) && !isFamilyClosed(closed, 'neighborhood_committee'))
      || (/电梯|未定义/.test(part) && !isFamilyClosed(closed, 'elevator_undefined'))
    )
    return openNamed && part.length > 12
  })
  return kept.join('。')
}

/** Sanitize unresolved/forward hooks against closed canon. */
export function sanitizeHookList(hooks: any[] = [], closed: ClosedBeatRecord[] = [], limit = 8) {
  return uniqueTexts(hooks, limit * 2)
    .filter(item => !shouldSuppressOpenHook(item, closed) && !isZombieResidualHook(item, closed) && !textDemandsClosedBeat(item, closed))
    .filter(item => compact(item).length >= 6)
    .slice(0, limit)
}

function forwardGoalsFromPrevious(previousChapter: any, closed: ClosedBeatRecord[]) {
  const raw = previousChapter?.raw_payload || previousChapter?.rawPayload || {}
  const ledger = raw.chapter_progress_ledger || raw.chapterProgressLedger || previousChapter?.chapter_progress_ledger
  const candidates = uniqueTexts([
    ...asArray(ledger?.unresolved_next),
    previousChapter?.ending_hook,
    previousChapter?.endingHook,
    raw.outgoing_handoff?.unresolved_action,
    raw.outgoingHandoff?.unresolved_action,
  ], 10)
  return sanitizeHookList(candidates, closed, 4)
}

function proseDerivedDeliveredGoals(currentProse: string, closed: ClosedBeatRecord[]) {
  if (!currentProse) return [] as string[]
  const out: string[] = []
  // Written-chapter goals should describe delivered arc, not next-seed language.
  if (/青铜巨门|血肉王座|门内大堂/.test(currentProse)) out.push('1号楼内部/血肉王座')
  if (/阿奇姆|带着.{0,8}天选者/.test(currentProse)) out.push('同行天选者线')
  if (/权柄碎片|黑色石棺|黑色蚕茧/.test(currentProse)) out.push('权柄碎片对峙')
  if (/1号楼|通行证/.test(currentProse)) out.push('1号楼通行证/入口推进')
  if (/居委会|顾主任|负二|会议|抹杀|通行证|诡币/.test(currentProse)) {
    if (!isFamilyClosed(closed, 'neighborhood_committee') || /通行证|诡币|1号楼/.test(currentProse)) {
      out.push('居委会/地下对峙')
    }
  }
  if (/电梯|未定义/.test(currentProse)) out.push('电梯/未定义区域压力')
  if (/王奶奶/.test(currentProse) && !isFamilyClosed(closed, 'wang_nainai_visit')) out.push('王奶奶线')
  if (/物业|合规执法|物理合规/.test(currentProse) && !isFamilyClosed(closed, 'property_compliance')) {
    out.push('物业合规冲突')
  } else if (/物业|合规执法|物理合规/.test(currentProse) && isFamilyClosed(closed, 'property_compliance')) {
    // still acknowledge delivered smash without reopening countdown
    if (/轰碎|粉碎|执法棍/.test(currentProse)) out.push('物业第一波清场已打爆')
  }
  if (/符纸|巨婴|规则核心|厨房木门/.test(currentProse)) out.push('厨房实体/规则核心')
  if (/(邻居|借火|十点).{0,20}(炼化|吞噬|半死不活)/.test(currentProse) || /邻里借贷规则核心/.test(currentProse)) {
    out.push('邻居借火线已兑现')
  }
  if (/倒汤|耳光|利爪|掌权|热汤|毒汤/.test(currentProse)) out.push('餐桌规则压迫')
  return uniqueTexts(out, 4)
}

function proseDerivedForwardGoals(currentProse: string, closed: ClosedBeatRecord[]) {
  if (!currentProse) return [] as string[]
  const out: string[] = []
  // Highest-priority latest spoils first — for unwritten next-seed only.
  if (/青铜巨门|血肉王座|门内大堂|撞进.{0,12}(黑暗|巨门)/.test(currentProse)) {
    out.push('承接1号楼内部突入，优先推进血肉王座/门内未知压力，禁止回跳电梯或清场倒计时')
  }
  if (/阿奇姆|带着.{0,8}天选者|拎起.{0,8}/.test(currentProse)) {
    out.push('处置同行天选者并转化为本章可用筹码')
  }
  if (/权柄碎片|黑色石棺|黑色蚕茧/.test(currentProse) && !/血肉王座|青铜巨门/.test(currentProse.slice(-900))) {
    out.push('推进权柄碎片对峙，不回放已关闭的404清场/借火')
  }
  if (/1号楼|通行证/.test(currentProse) && !/青铜巨门|血肉王座|撞进/.test(currentProse.slice(-900))) {
    out.push('以1号楼通行证/入口为下一章主驱动，不回收已关闭的404清场/匿名敲门')
  }
  if (/居委会|顾主任|负二|会议|抹杀|通行证|诡币/.test(currentProse)) {
    if (!isFamilyClosed(closed, 'neighborhood_committee') || /通行证|诡币|1号楼/.test(currentProse)) {
      out.push('巩固居委会/地下对峙成果，转向1号楼真正未解压力，禁止回放已关闭清场/借火敲门')
    }
  }
  if (/电梯|未定义/.test(currentProse) && !isFamilyClosed(closed, 'elevator_undefined')) {
    out.push('推进电梯/未定义区域压力')
  }
  if (/王奶奶/.test(currentProse) && !isFamilyClosed(closed, 'wang_nainai_visit')) {
    out.push('承接王奶奶线，禁止重演借火邻居闭环')
  }
  // Never re-open property wave-1 as main goal once closed.
  if (/物业|合规/.test(currentProse) && !isFamilyClosed(closed, 'property_compliance')) {
    out.push('推进仍未解决的物业/规则压力（非已打爆的第一波清场倒计时）')
  }
  return uniqueTexts(out, 4)
}

/**
 * Detect zombie residual pressure still active in current chapter prose/ending.
 * Used by QA to open revisable findings (not just ignore dead task-book goals).
 */
export function detectZombiePressureInChapter(input: {
  chapter?: any
  closedBeats?: ClosedBeatRecord[]
  previousChapters?: any[]
} = {}): ZombiePressureFinding[] {
  const chapter = input.chapter || {}
  const previousChapters = asArray(input.previousChapters)
  const closed = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters)
  if (!closed.length) return []

  const prose = chapterTextOf(chapter)
  const ending = compact(chapter?.ending_hook || chapter?.endingHook || '', 400)
  const tail = compact(prose.slice(-1200), 1200)
  const corpus = `${tail}。${ending}`
  const findings: ZombiePressureFinding[] = []

  if (isFamilyClosed(closed, 'property_compliance') && /清场倒计时|赶在清场|合规清场|清场倒计时归零|合规性清理/.test(corpus)) {
    findings.push({
      key: 'zombie_property_cleanup',
      family: 'property_compliance',
      label: '僵尸清场倒计时',
      severity: 'high',
      description: '正文/章末仍把已解决的物业第一波「合规清场倒计时」当作未解主压力。',
      evidence: compact((corpus.match(/[^。]{0,20}(清场倒计时|赶在清场|合规清场|清场倒计时归零)[^。]{0,40}/) || [''])[0], 160),
      fix: '删除或改写清场倒计时驱动；若需压力，改用本章真正未关闭冲突（如居委会反转后的1号楼去向）。',
      directive: '修订：去掉已解决的物业清场倒计时压迫，禁止用「赶在清场归零前」驱动章末；改为兑现本章 live 成果并指向仍开放的下一钩子。',
    })
  }

  if (isFamilyClosed(closed, 'neighbor_borrow_fire')
    && (/(404.{0,8}门外|门外).{0,12}敲门|不知死活的敲门者|亲手拧开404|赶回404.{0,12}门/.test(corpus))) {
    const namedOpen = (/王奶奶/.test(corpus) && !isFamilyClosed(closed, 'wang_nainai_visit'))
      || (/物业经理/.test(corpus) && !isFamilyClosed(closed, 'property_compliance'))
    if (!namedOpen) {
      findings.push({
        key: 'zombie_door_knock',
        family: 'neighbor_borrow_fire',
        label: '僵尸敲门钩子',
        severity: 'high',
        description: '正文/章末仍在追已关闭的借火/匿名404敲门线，把它写成必须回去开门的主钩子。',
        evidence: compact((corpus.match(/[^。]{0,20}(敲门|敲门者|拧开404|404号房的大门)[^。]{0,40}/) || [''])[0], 160),
        fix: '删除「回404看匿名敲门者」主收束；章末改为本章真实增量（战利品/地位变化/下一地图入口）。',
        directive: '修订：禁止以已关闭的匿名404敲门/回房开门作为章末主驱动；保留本章新成果，改指向真正未解压力（如1号楼通行证去向）。',
      })
    }
  }

  if (isFamilyClosed(closed, 'neighbor_borrow_fire') && /借火|主动开门迎敌|反制邻居并炼化/.test(corpus)
    && /未完成|必须|继续|再次|核心目标/.test(corpus)) {
    findings.push({
      key: 'zombie_borrow_fire_goal',
      family: 'neighbor_borrow_fire',
      label: '僵尸借火目标',
      severity: 'high',
      description: '正文或计划仍要求完成已炼化的借火邻居冲突。',
      evidence: '借火/主动开门迎敌',
      fix: '从任务书与正文删去该目标。',
      directive: '修订：删除借火邻居/主动开门迎敌回放，不重演已炼化冲突。',
    })
  }

  return findings.slice(0, 4)
}

export function buildLiveChapterContract(input: {
  chapter?: any
  previousChapters?: any[]
  previousChapter?: any
  closedBeats?: ClosedBeatRecord[]
} = {}): LiveChapterContract {
  const chapter = input.chapter || {}
  const previousChapters = asArray(input.previousChapters)
  if (input.previousChapter) previousChapters.push(input.previousChapter)
  // Closed canon from previous chapters only for plan health of "current seed".
  // Current prose may still contain zombie residuals to be revised, but should not
  // re-open already closed families.
  const closedFromHistory = input.closedBeats?.length
    ? input.closedBeats
    : collectClosedBeatFamiliesFromChapters(previousChapters.filter(Boolean))
  const closed = closedFromHistory

  const rawGoal = compact(chapter?.chapter_goal || chapter?.chapterGoal || chapter?.goal || chapter?.raw_payload?.pre_draft_brief?.chapter_goal || '', 500)
  const rawConflict = compact(chapter?.conflict || chapter?.raw_payload?.pre_draft_brief?.core_conflict || '', 400)
  const rawEnding = compact(chapter?.ending_hook || chapter?.endingHook || '', 400)
  const rawSummary = compact(chapter?.chapter_summary || chapter?.chapterSummary || '', 400)

  const blocked: LiveChapterContract['closed_blocked'] = []
  for (const beat of closed) {
    const def = familyDef(beat.family)
    if (!def) continue
    for (const snippet of [rawGoal, rawConflict, rawSummary, rawEnding]) {
      if (snippet && (textHitsFamilyGoal(def, snippet) || isZombieResidualHook(snippet, [beat]))) {
        blocked.push({
          family: beat.family,
          label: beat.label,
          reason: `已在第${beat.closed_at_chapter || '?'}章关闭，不得再作为本章验收目标`,
          snippet: compact(snippet, 120),
        })
        break
      }
    }
  }

  const zombieResiduals = uniqueTexts([rawGoal, rawConflict, rawSummary, rawEnding]
    .filter(item => isZombieResidualHook(item, closed)), 6)
  for (const snippet of zombieResiduals) {
    if (blocked.some(item => item.snippet === compact(snippet, 120))) continue
    blocked.push({
      family: 'zombie_residual',
      label: '僵尸残留钩子',
      reason: '沿用已关闭压力的改写说法（清场倒计时/匿名敲门等），不得再验收',
      snippet: compact(snippet, 120),
    })
  }

  let liveGoalText = stripClausesMatchingClosed(rawGoal, closed)
  let liveConflict = stripClausesMatchingClosed(rawConflict, closed)
  let liveEnding = stripClausesMatchingClosed(rawEnding, closed)
  const currentProse = chapterTextOf(chapter)

  const isActionableGoalClause = (item: string) => {
    const text = compact(item, 160)
    if (text.length < 6) return false
    if (isZombieResidualHook(text, closed) || textDemandsClosedBeat(text, closed)) return false
    if (/^本章兑现：|^章末未解：|^章末落在：|^推进|^承接上一章|^以.+为下一章主驱动/.test(text)) return text.length >= 8
    if (/\/|线$|压力$|冲突$|对峙$|推进$|压迫$|核心$|已兑现$|已打爆$|去向$/.test(text) && text.length <= 36) return true
    if (text.length < 8) return false
    // Drop raw narrative prose mistaken as task-book goals (common in distant outline seeds).
    if (/深吸一口气|猛地握拳|伸出右手|一把抓住|淡淡说道|膝撞|锈迹斑斑的大门|五指猛地一抓|吓得尿裤子/.test(text)) return false
    if (text.length > 42 && !/推进|对峙|承接|本章|通行证|居委会|电梯|禁止|主驱动|兑现|优先|冲突|钩子/.test(text)) return false
    if (/^的|那|这|在|间|座|面上|哲那|连|刻已/.test(text) && text.length < 36) return false
    if (/超级感官|变得更加|仿佛带着|更加急促|能量波动并无异常|按照小区管理条例/.test(text) && !/推进|对峙|反制|解决|通行证|1号楼/.test(text)) return false
    if (/章末留下|十点邻居敲门借火|主动开门迎敌/.test(text)) return false
    if (/，\s*。|。\s*，/.test(text)) return false
    // Drop raw prose excerpts mistaken as goals.
    if (/[“"][^“"]{8,}[”']/.test(text) && /笑|惨叫|扔向|微微仰头|大喊|主任|假的终究/.test(text)) return false
    if (/说|道|喊|问/.test(text) && text.length < 24) return false
    return true
  }

  const seedLooksLikeProseNarration = Boolean(
    liveGoalText
    && (
      liveGoalText.length > 48
      || /深吸一口气|猛地握拳|伸出右手|一把抓住|淡淡说道|膝撞|锈迹斑斑|五指猛地/.test(liveGoalText)
    )
    && !/本章兑现|下一章主驱动|优先推进|承接上一章进度/.test(liveGoalText)
  )
  const seedPolluted = Boolean(
    blocked.length
    || zombieResiduals.length
    || !liveGoalText
    || !isActionableGoalClause(liveGoalText)
    || matchFamiliesInText(liveGoalText, closed).length
    || isZombieResidualHook(liveGoalText, closed)
    || seedLooksLikeProseNarration,
  )

  if (seedPolluted) {
    const previous = previousChapters.sort((a, b) => chapterNoOf(b) - chapterNoOf(a))[0]
    const forward = forwardGoalsFromPrevious(previous, closed).filter(isActionableGoalClause)
    if (currentProse) {
      // Written chapter: summarize delivered live arcs, not next-seed "主驱动" language.
      const delivered = uniqueTexts([
        ...proseDerivedDeliveredGoals(currentProse, closed),
        ...stripClausesMatchingClosed(rawGoal, closed).split(/[。；;]/).map(item => compact(item, 160)),
      ], 4).filter(isActionableGoalClause)
      const cleanedDelivered = delivered.map(item => String(item).replace(/^本章兑现：/, '')).filter(Boolean)
      liveGoalText = cleanedDelivered.length
        ? `本章兑现：${cleanedDelivered.join('；')}`
        : '本章已按正文兑现进度，禁止回放已关闭冲突'
      if (!liveConflict || !isActionableGoalClause(liveConflict)) {
        liveConflict = delivered.slice(0, 3).join('；') || liveGoalText
      }
      if (!liveEnding || isZombieResidualHook(liveEnding, closed) || textDemandsClosedBeat(liveEnding, closed) || !isActionableGoalClause(liveEnding)) {
        liveEnding = delivered.slice(-1)[0]
          || (/1号楼|通行证/.test(currentProse) ? '章末落在：1号楼通行证/入口推进' : '')
          || liveGoalText
      }
    } else {
      // Walk back to the nearest written previous chapter for forward pressure.
      const previousWritten = previousChapters
        .slice()
        .sort((a, b) => chapterNoOf(b) - chapterNoOf(a))
        .find(item => String(item?.chapter_text || item?.chapterText || '').trim())
        || previous
      const forwardFromWritten = forwardGoalsFromPrevious(previousWritten, closed).filter(isActionableGoalClause)
      const proseForward = uniqueTexts([
        ...proseDerivedForwardGoals(String(previousWritten?.chapter_text || previousWritten?.chapterText || ''), closed),
        ...forwardFromWritten,
        ...forward,
      ], 4).filter(isActionableGoalClause)
      liveGoalText = proseForward.join('。')
        || '承接上一章真正未解决压力继续推进，禁止回放已关闭冲突与僵尸钩子'
      if (!liveConflict || !isActionableGoalClause(liveConflict) || /承接上一章进度，$/.test(liveConflict)) {
        liveConflict = uniqueTexts(proseForward, 3).join('；') || liveGoalText
      }
      if (!liveEnding || isZombieResidualHook(liveEnding, closed) || textDemandsClosedBeat(liveEnding, closed) || !isActionableGoalClause(liveEnding)) {
        liveEnding = proseForward[0] || liveGoalText
      }
    }
  }

  liveConflict = stripClausesMatchingClosed(liveConflict, closed) || liveGoalText
  liveEnding = stripClausesMatchingClosed(liveEnding, closed) || liveEnding

  const liveGoals = uniqueTexts(
    liveGoalText.split(/[。；;]/).map(item => compact(item, 160).replace(/^推进/, '').replace(/^本章兑现：/, '')).filter(isActionableGoalClause),
    6,
  ).map((item, idx) => (currentProse && idx === 0 && !/^本章兑现：/.test(item) ? `本章兑现：${item}` : item))
  const acceptance_goals = liveGoals.filter(goal => !textDemandsClosedBeat(goal, closed) && !isZombieResidualHook(goal, closed))

  const forbidden_replays = uniqueTexts([
    ...closed.map(item => `不要回放已关闭冲突：${item.label}`),
    ...closed.flatMap(item => item.evidence.map(ev => `已兑现：${ev}`)),
    isFamilyClosed(closed, 'property_compliance') ? '不要再写物业第一波清场倒计时未解决' : '',
    isFamilyClosed(closed, 'neighbor_borrow_fire') ? '不要再写匿名404敲门逼回去开门' : '',
  ], 14)

  let plan_health: LiveChapterContract['plan_health'] = 'aligned'
  if (blocked.length || zombieResiduals.length) plan_health = 'dead_goal_pollution'
  else if (!acceptance_goals.length) plan_health = 'missing_live_goal'
  else if (/十点邻居敲门借火|主动开门迎敌|清场倒计时|反制邻居并炼化/.test(rawGoal)
    && !/十点邻居敲门借火|主动开门迎敌|清场倒计时/.test(liveGoalText)) {
    plan_health = 'stale_seed'
  }

  return {
    version: 'live_chapter_contract_v1',
    plan_health,
    live_goals: acceptance_goals.length ? acceptance_goals : liveGoals,
    live_conflict: liveConflict,
    live_ending_hook: liveEnding,
    acceptance_goals: acceptance_goals.length ? acceptance_goals : liveGoals,
    closed_blocked: uniqueBlocked(blocked),
    forbidden_replays,
    zombie_residuals: zombieResiduals,
    raw_goal: rawGoal,
    raw_conflict: rawConflict,
  }
}

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
