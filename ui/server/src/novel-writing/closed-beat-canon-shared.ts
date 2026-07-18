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

export type FamilyDef = {
  family: ProgressBeatFamilyId
  label: string
  goalPatterns: RegExp[]
  closeAllOf?: RegExp[]
  closeAnyOf?: RegExp[]
  openPatterns?: RegExp[]
}

export const FAMILY_DEFS: FamilyDef[] = [
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

export function compact(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

export function uniqueTexts(values: any, limit = 16) {
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

export function chapterNoOf(chapter: any) {
  return Number(chapter?.chapter_no || chapter?.chapterNo || 0) || 0
}

export function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

export function proseMatchesClose(def: FamilyDef, prose: string) {
  if (!prose) return false
  if (def.closeAnyOf?.some(pattern => pattern.test(prose))) return true
  if (def.closeAllOf?.length && def.closeAllOf.every(pattern => pattern.test(prose))) return true
  return false
}

export function textHitsFamilyGoal(def: FamilyDef, text: string) {
  if (!text) return false
  return def.goalPatterns.some(pattern => pattern.test(text))
}

export function extractEvidence(prose: string, patterns: RegExp[], limit = 2) {
  const out: string[] = []
  for (const pattern of patterns) {
    const match = prose.match(pattern)
    if (match?.[0]) out.push(compact(match[0], 120))
    if (out.length >= limit) break
  }
  return uniqueTexts(out, limit)
}

export function familyDef(family: ProgressBeatFamilyId) {
  return FAMILY_DEFS.find(item => item.family === family) || null
}

/** Detect closed families from a single chapter's prose (+ optional delivered labels). */

export function uniqueBlocked(items: LiveChapterContract['closed_blocked']) {
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

