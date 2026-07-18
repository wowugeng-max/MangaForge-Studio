/**
 * System-level character card lifecycle:
 * - extract recurring named cast from prose
 * - auto-create missing character cards
 * - sync current_state from story-state updates
 * - detect title/name drift against established canon (e.g. 局长 秦建国 vs 赵国锋)
 */

function compactText(value: any, limit = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function uniqueTexts(values: any, limit = 24) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = compactText(raw, 80)
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

// Unique offices only. Multi-person roles (天选者/分析员) are not locked to a single name.
const ROLE_TITLES = [
  '特事局局长',
  '战略分析局局长',
  '最高战略分析局局长',
  '居委会主任',
  '业主委员会主任',
  '物业经理',
  '局长',
]

const UNIQUE_OFFICE_TITLES = new Set(ROLE_TITLES)

const GENERIC_BLOCKLIST = new Set([
  '江哲', '主角', '读者', '作者', '系统', '本章', '上一章', '下一章',
  '男人', '女人', '少年', '少女', '老人', '众人', '对方', '自己',
])

const NAME_PATTERN = /[\u4e00-\u9fff]{2,4}/

export type NamedCharacterMention = {
  name: string
  title?: string
  evidence: string
  count: number
  source: 'title_name' | 'name_title' | 'bare_name' | 'story_state'
}

export type TitleNameCanonEntry = {
  title: string
  name: string
  count: number
  evidence: string
  first_chapter_no?: number
  last_chapter_no?: number
}

export type CharacterNameDrift = {
  title: string
  canonical_name: string
  drifted_name: string
  evidence: string
  severity: 'high'
  type: 'character_name_drift'
  description: string
  fix: string
}

function chapterTextOf(chapter: any) {
  return String(chapter?.chapter_text || chapter?.chapterText || '')
}

function isPlausiblePersonName(name: string) {
  const value = compactText(name, 12)
  // Personal names are usually 2-3 Han chars; allow 4 for full names like 小林一郎.
  if (!/^[\u4e00-\u9fff]{2,4}$/.test(value)) return false
  if (GENERIC_BLOCKLIST.has(value)) return false
  if (/的|了|着|过|在|是|和|与|及|则|都|也|又|还|死|双|却|此|刻|闪|烁|声|音|颤/.test(value)) return false
  if (/第[一二三四五六七八九十百千0-9]+/.test(value)) return false
  if (/^(这个|那个|一位|一名|一个|仅存|樱花|个人|刚才|声音|此刻|正是)/.test(value)) return false
  if (/^(里|外|上|下|前|后|左|右|中)/.test(value) && value.length === 3) return false
  if (/(局|会|部|院|组|队|科)$/.test(value)) return false
  if (/特事|分析|业主|居委|物业|战略/.test(value)) return false
  return true
}

function pushMention(
  bag: Map<string, NamedCharacterMention>,
  input: { name: string; title?: string; evidence: string; source: NamedCharacterMention['source'] },
) {
  const name = compactText(input.name, 12)
  if (!isPlausiblePersonName(name)) return
  const key = name
  const prev = bag.get(key)
  if (prev) {
    prev.count += 1
    if (!prev.title && input.title) prev.title = input.title
    if (input.evidence && input.evidence.length > prev.evidence.length) prev.evidence = compactText(input.evidence, 120)
    return
  }
  bag.set(key, {
    name,
    title: input.title ? compactText(input.title, 24) : undefined,
    evidence: compactText(input.evidence, 120),
    count: 1,
    source: input.source,
  })
}

/** Deterministic named-cast extraction from Chinese web-novel prose. */
export function extractNamedCharacterMentions(text: string): NamedCharacterMention[] {
  const source = String(text || '')
  if (!source.trim()) return []
  const bag = new Map<string, NamedCharacterMention>()

  for (const title of ROLE_TITLES) {
    const titleName = new RegExp(`${title}[，,：:、\s]*([\\u4e00-\\u9fff]{2,3})`, 'g')
    let match: RegExpExecArray | null
    while ((match = titleName.exec(source))) {
      pushMention(bag, {
        name: match[1],
        title,
        evidence: source.slice(Math.max(0, match.index - 8), match.index + match[0].length + 12),
        source: 'title_name',
      })
    }
    const nameTitle = new RegExp(`([\\u4e00-\\u9fff]{2,3})${title}`, 'g')
    while ((match = nameTitle.exec(source))) {
      // Avoid "幸福里小区" + "居委会主任" false personal names when a longer title already covers the span.
      const around = source.slice(Math.max(0, match.index - 12), match.index + match[0].length + 4)
      if (ROLE_TITLES.some(longer => longer !== title && longer.endsWith(title) && around.includes(longer))) continue
      pushMention(bag, {
        name: match[1],
        title,
        evidence: source.slice(Math.max(0, match.index - 8), match.index + match[0].length + 12),
        source: 'name_title',
      })
    }
  }

  // Quoted speech address patterns: “秦建国，...” less reliable; keep title-bound primarily.
  return [...bag.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Build title -> most frequent proper name from previous written chapters. */
export function buildTitleNameCanon(chapters: any[] = []): TitleNameCanonEntry[] {
  const stats = new Map<string, Map<string, { count: number; evidence: string; first: number; last: number }>>()
  for (const chapter of asArray(chapters)) {
    const no = Number(chapter?.chapter_no || chapter?.chapterNo || 0) || 0
    const mentions = extractNamedCharacterMentions(chapterTextOf(chapter))
    for (const mention of mentions) {
      if (!mention.title || !mention.name) continue
      if (!stats.has(mention.title)) stats.set(mention.title, new Map())
      const byName = stats.get(mention.title)!
      const prev = byName.get(mention.name)
      if (!prev) {
        byName.set(mention.name, {
          count: mention.count,
          evidence: mention.evidence,
          first: no,
          last: no,
        })
      } else {
        prev.count += mention.count
        prev.last = Math.max(prev.last, no)
        if (!prev.first) prev.first = no
        if (mention.evidence) prev.evidence = mention.evidence
      }
    }
  }

  const out: TitleNameCanonEntry[] = []
  for (const [title, byName] of stats.entries()) {
    const ranked = [...byName.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    if (!ranked.length) continue
    const [name, meta] = ranked[0]
    if (!UNIQUE_OFFICE_TITLES.has(title)) continue
    // Require at least 2 observations before locking a unique office name.
    if (meta.count < 2) continue
    out.push({
      title,
      name,
      count: meta.count,
      evidence: meta.evidence,
      first_chapter_no: meta.first || undefined,
      last_chapter_no: meta.last || undefined,
    })
  }
  return out.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
}

export function detectCharacterNameDrift(input: {
  chapterText?: any
  titleNameCanon?: TitleNameCanonEntry[]
  previousChapters?: any[]
} = {}): CharacterNameDrift[] {
  const canon = input.titleNameCanon?.length
    ? input.titleNameCanon
    : buildTitleNameCanon(input.previousChapters || [])
  if (!canon.length) return []
  const text = String(input.chapterText || '')
  const mentions = extractNamedCharacterMentions(text)
  const drifts: CharacterNameDrift[] = []
  const pushDrift = (entry: TitleNameCanonEntry, driftedName: string, evidence: string) => {
    if (!driftedName || driftedName === entry.name) return
    drifts.push({
      title: entry.title,
      canonical_name: entry.name,
      drifted_name: driftedName,
      evidence: compactText(evidence, 140),
      severity: 'high',
      type: 'character_name_drift',
      description: `职位「${entry.title}」已确立为「${entry.name}」，本章却写成「${driftedName}」，属于角色专名漂移。`,
      fix: `把「${driftedName}」改回已确立姓名「${entry.name}」（${entry.title}），并同步角色卡/状态机，禁止另起同职新名。`,
    })
  }

  for (const entry of canon) {
    const sameTitle = mentions.filter(item => {
      if (!item.title) return false
      if (item.source === 'name_title' && item.count < 2) return false
      return item.title === entry.title || entry.title.endsWith(item.title) || item.title.endsWith(entry.title)
    })
    for (const mention of sameTitle) pushDrift(entry, mention.name, mention.evidence)

    // Cutaway heuristic: bureau chief actions only (avoid 主任 false positives in mixed scenes).
    if (/局长|特事局|战略分析/.test(entry.title)) {
      const actionRe = /([\u4e00-\u9fff]{2,3})(死死盯着|双手撑|揉了揉太阳穴|长舒了一口气|目光沉凝|神色恭敬|挺直了腰杆)/g
      let match: RegExpExecArray | null
      while ((match = actionRe.exec(text))) {
        const name = match[1]
        if (!isPlausiblePersonName(name) || name === entry.name) continue
        const window = text.slice(Math.max(0, match.index - 180), Math.min(text.length, match.index + match[0].length + 40))
        const inRoleContext = /局长|分析局|特事局|战略分析|控制室|监控|大夏国/.test(window)
        if (!inRoleContext) continue
        // Avoid treating other titled people in the same window as the bureau chief.
        if (new RegExp(`${name}(主任|院长|经理|护士|天选者)`).test(window)) continue
        pushDrift(entry, name, window)
      }
    }
  }
  const seen = new Set<string>()
  return drifts.filter(item => {
    const key = `${item.title}::${item.drifted_name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeRoleType(title?: string, fallback = 'supporting') {
  const value = String(title || '')
  if (/主角/.test(value)) return 'protagonist'
  if (/反派|怪谈意志|boss/i.test(value)) return 'antagonist'
  if (/局长|主任|院长|经理/.test(value)) return 'supporting'
  if (/天选者|分析员|护士|邻居/.test(value)) return 'supporting'
  return fallback
}

function mergeCurrentState(base: any, patch: any, chapterNo?: number) {
  const next = {
    ...(base && typeof base === 'object' ? base : {}),
    ...(patch && typeof patch === 'object' ? patch : {}),
  }
  if (chapterNo) next.last_seen_chapter = chapterNo
  return next
}

export type CharacterCardSyncPlan = {
  version: 'character_card_sync_v1'
  title_name_canon: TitleNameCanonEntry[]
  identity_canon: CharacterIdentityCanonEntry[]
  mentions: NamedCharacterMention[]
  name_drifts: CharacterNameDrift[]
  identity_drifts: CharacterIdentityDrift[]
  character_creates: Array<Record<string, any>>
  character_updates: Array<{ id?: number; name?: string; patch: Record<string, any> }>
  created_names: string[]
  updated_names: string[]
  skipped_names: string[]
}

/**
 * Plan auto card creation + state sync from prose mentions and story-state character_updates.
 * Never renames existing cards; name drift is reported separately for quality/revision.
 */
export function planCharacterCardSync(input: {
  projectId?: number
  chapter?: any
  existingCharacters?: any[]
  previousChapters?: any[]
  characterUpdates?: any[]
  titleNameCanon?: TitleNameCanonEntry[]
} = {}): CharacterCardSyncPlan {
  const chapter = input.chapter || {}
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0) || undefined
  const projectId = Number(input.projectId || chapter?.project_id || 0) || undefined
  const existing = asArray(input.existingCharacters)
  const existingByName = new Map(existing.map(item => [compactText(item?.name, 40), item]))
  const titleNameCanon = input.titleNameCanon?.length
    ? input.titleNameCanon
    : buildTitleNameCanon([...(input.previousChapters || []), chapter].filter(Boolean))
  const mentions = extractNamedCharacterMentions(chapterTextOf(chapter))
  const nameDrifts = detectCharacterNameDrift({
    chapterText: chapterTextOf(chapter),
    titleNameCanon,
  })
  // Sticky identity from previous chapters only; current chapter may contain drifts.
  const identityCanon = buildCharacterIdentityCanon(input.previousChapters || [])
  const identityDrifts = detectCharacterIdentityDrift({
    chapterText: chapterTextOf(chapter),
    previousChapters: input.previousChapters || [],
    identityCanon,
  })
  const identityForCreates = buildCharacterIdentityCanon([
    ...(input.previousChapters || []),
    chapter,
  ].filter(Boolean))
  const driftedNames = new Set(nameDrifts.map(item => item.drifted_name))

  // Prefer story-state updates; also seed from title-bound prose mentions.
  const updateSeed = new Map<string, any>()
  for (const update of asArray(input.characterUpdates)) {
    const name = compactText(update?.name, 40)
    if (!name) continue
    updateSeed.set(name, update)
  }
  for (const mention of mentions) {
    if (!mention.title && mention.count < 2) continue
    if (driftedNames.has(mention.name)) continue // do not auto-create drifted aliases
    if (!updateSeed.has(mention.name)) {
      updateSeed.set(mention.name, {
        name: mention.name,
        current_state: {
          title: mention.title,
          last_seen_chapter: chapterNo,
          source: 'prose_mention',
        },
        source_excerpt: mention.evidence,
        role_type: normalizeRoleType(mention.title),
        role: mention.title || 'supporting',
      })
    } else {
      const prev = updateSeed.get(mention.name)
      updateSeed.set(mention.name, {
        ...prev,
        role: prev.role || mention.title,
        role_type: prev.role_type || normalizeRoleType(mention.title),
        current_state: mergeCurrentState(prev.current_state, {
          title: mention.title || prev?.current_state?.title,
        }, chapterNo),
        source_excerpt: prev.source_excerpt || mention.evidence,
      })
    }
  }

  // Seed identity-bound cast (e.g. 樱花国天选者小林) so they get cards + locked nationality.
  for (const entry of identityForCreates) {
    const name = compactText(entry.name, 12)
    if (!name || driftedNames.has(name)) continue
    const identityState = {
      nationality: entry.nationality || '',
      role_label: entry.role_label || '',
      identity_status: entry.status || '',
      identity_locked: Boolean(entry.nationality),
      aliases: entry.aliases || [],
      last_seen_chapter: chapterNo,
      source: 'identity_canon',
    }
    if (!updateSeed.has(name)) {
      updateSeed.set(name, {
        name,
        force_create: Boolean(entry.nationality || entry.role_label),
        role: entry.role_label || 'supporting',
        role_type: normalizeRoleType(entry.role_label || '天选者'),
        current_state: identityState,
        source_excerpt: entry.evidence,
      })
    } else {
      const prev = updateSeed.get(name)
      updateSeed.set(name, {
        ...prev,
        force_create: true,
        role: prev.role || entry.role_label || 'supporting',
        current_state: mergeCurrentState(prev.current_state, identityState, chapterNo),
        source_excerpt: prev.source_excerpt || entry.evidence,
      })
    }
  }

  // Resolve canon preferred names for titles already locked.
  for (const entry of titleNameCanon) {
    if (!updateSeed.has(entry.name) && !existingByName.has(entry.name)) {
      // Ensure established cast stays on cards even if absent this chapter.
      continue
    }
  }

  const characterCreates: Array<Record<string, any>> = []
  const characterUpdates: Array<{ id?: number; name?: string; patch: Record<string, any> }> = []
  const createdNames: string[] = []
  const updatedNames: string[] = []
  const skippedNames: string[] = []
  let tempId = -1

  for (const [name, seed] of updateSeed.entries()) {
    if (driftedNames.has(name)) {
      skippedNames.push(name)
      continue
    }
    const existingChar = existingByName.get(name)
    const statePatch = mergeCurrentState(
      existingChar?.current_state,
      seed?.current_state || seed?.currentState || {},
      chapterNo,
    )
    if (seed?.source_excerpt || seed?.evidence) {
      statePatch.last_evidence = compactText(seed.source_excerpt || seed.evidence, 160)
    }
    if (existingChar) {
      characterUpdates.push({
        id: Number(existingChar.id) || undefined,
        name,
        patch: { current_state: statePatch },
      })
      updatedNames.push(name)
      continue
    }

    // Auto-create only title-bound or multi-mention cast, avoid flooding one-off nouns.
    const mention = mentions.find(item => item.name === name)
    const titled = Boolean(mention?.title && UNIQUE_OFFICE_TITLES.has(String(mention.title)))
    const cardWorthy = titled || Boolean(seed?.force_create) || Boolean(seed?.role && UNIQUE_OFFICE_TITLES.has(String(seed.role)))
    if (!cardWorthy) {
      skippedNames.push(name)
      continue
    }

    const createId = tempId--
    characterCreates.push({
      id: createId,
      project_id: projectId,
      name,
      role: compactText(seed?.role || mention?.title || 'supporting', 40),
      role_type: compactText(seed?.role_type || normalizeRoleType(mention?.title || seed?.role), 40),
      motivation: compactText(seed?.motivation || '', 120),
      goal: compactText(seed?.goal || '', 120),
      current_state: statePatch,
      raw_payload: {
        source: 'character_card_sync_auto_create',
        first_seen_chapter: chapterNo,
        title: mention?.title || seed?.role,
        evidence: compactText(seed?.source_excerpt || mention?.evidence || '', 160),
        identity: {
          nationality: statePatch?.nationality || '',
          role_label: statePatch?.role_label || '',
          status: statePatch?.identity_status || '',
          aliases: statePatch?.aliases || [],
        },
      },
    })
    characterUpdates.push({
      id: createId,
      name,
      patch: { current_state: statePatch },
    })
    createdNames.push(name)
    existingByName.set(name, { id: createId, name, current_state: statePatch })
  }

  return {
    version: 'character_card_sync_v1',
    title_name_canon: titleNameCanon,
    identity_canon: identityCanon.length ? identityCanon : identityForCreates,
    mentions,
    name_drifts: nameDrifts,
    identity_drifts: identityDrifts,
    character_creates: characterCreates,
    character_updates: characterUpdates,
    created_names: uniqueTexts(createdNames, 40),
    updated_names: uniqueTexts(updatedNames, 40),
    skipped_names: uniqueTexts(skippedNames, 40),
  }
}

export function mergeNameCanonIntoStoryState(storyState: any = {}, titleNameCanon: TitleNameCanonEntry[] = []) {
  const base = storyState && typeof storyState === 'object' ? { ...storyState } : {}
  const existing = asArray(base.title_name_canon || base.titleNameCanon)
  const byTitle = new Map<string, any>()
  for (const item of existing) {
    const title = compactText(item?.title, 40)
    const name = compactText(item?.name, 40)
    if (!title || !name) continue
    byTitle.set(title, {
      title,
      name,
      count: Number(item?.count || 1) || 1,
      evidence: compactText(item?.evidence, 160),
      first_chapter_no: item?.first_chapter_no || item?.firstChapterNo,
      last_chapter_no: item?.last_chapter_no || item?.lastChapterNo,
    })
  }
  for (const item of titleNameCanon) {
    const prev = byTitle.get(item.title)
    if (!prev || item.count >= Number(prev.count || 0)) {
      byTitle.set(item.title, { ...item })
    }
  }
  base.title_name_canon = [...byTitle.values()].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
  base.character_name_rules = uniqueTexts(
    base.title_name_canon.map((item: any) => `${item.title}=${item.name}`),
    24,
  )
  return base
}

export function buildCharacterNameDriftDirective(drifts: CharacterNameDrift[] = []) {
  if (!drifts.length) return null
  const primary = drifts[0]
  return {
    key: 'character_name_drift',
    priority: 1,
    severity: 'high' as const,
    label: `专名漂移·${primary.title}`,
    directive: compactText(primary.fix, 220),
    issue: {
      severity: 'high',
      type: 'character_name_drift',
      description: primary.description,
      evidence: primary.evidence,
      fix: primary.fix,
      source: 'character_card_sync',
    },
  }
}

// ---------------------------------------------------------------------------
// Character identity canon (nationality / faction / role label)
// Prevents drifts like 樱花国天选者小林 -> 大夏国天选者小林
// ---------------------------------------------------------------------------

const NATION_PATTERN = '大夏国|樱花国|扶桑国|神州|华夏|蓝星|美国|联邦|东瀛|日本'

const IDENTITY_NAME_BLOCKLIST = new Set([
  '隔壁', '检测', '副本', '号房', '怎么', '电视', '画面', '房间', '走廊', '通知', '规则',
  '系统', '警告', '提示', '业主', '经理', '主任', '局长', '分析', '人员', '同事',
  '刚才', '此时', '此刻', '突然', '立刻', '直接', '已经', '开始', '继续', '随后',
  '青山', // common false-positive window token unless later proven; keep if real cast appears titled
])

export type CharacterIdentityMention = {
  name: string
  full_name?: string
  nationality?: string
  role_label?: string
  status?: 'alive' | 'dead' | 'unknown'
  evidence: string
}

export type CharacterIdentityCanonEntry = {
  name: string
  aliases: string[]
  nationality?: string
  role_label?: string
  status?: 'alive' | 'dead' | 'unknown'
  evidence: string
  count: number
  first_chapter_no?: number
  last_chapter_no?: number
}

export type CharacterIdentityDrift = {
  name: string
  field: 'nationality' | 'role_label' | 'status'
  canonical_value: string
  drifted_value: string
  evidence: string
  severity: 'high'
  type: 'character_identity_drift'
  description: string
  fix: string
}

function shortNameVariants(name: string) {
  const value = compactText(name, 12)
  const out = uniqueTexts([value], 4)
  // 小林一郎 -> 小林
  if (value.length >= 3 && value.length <= 4) {
    const short2 = value.slice(0, 2)
    if (/^[\u4e00-\u9fff]{2}$/.test(short2)) out.push(short2)
  }
  return uniqueTexts(out, 6)
}

function namesMatch(a: string, b: string) {
  const left = compactText(a, 12)
  const right = compactText(b, 12)
  if (!left || !right) return false
  if (left === right) return true
  if (left.startsWith(right) || right.startsWith(left)) return true
  return shortNameVariants(left).some(item => shortNameVariants(right).includes(item))
}

/** Extract nationality/role/status bindings for named characters from prose. */
export function extractCharacterIdentityMentions(text: string): CharacterIdentityMention[] {
  const source = String(text || '')
  if (!source.trim()) return []
  const out: CharacterIdentityMention[] = []

  const push = (item: CharacterIdentityMention) => {
    const name = compactText(item.name, 12)
    const full = compactText(item.full_name, 12)
    if (!isPlausiblePersonName(name) && !isPlausiblePersonName(full)) return
    const primary = isPlausiblePersonName(name) ? name : full
    if (!primary) return
    const short = primary.length >= 3 && isPlausiblePersonName(primary.slice(0, 2)) ? primary.slice(0, 2) : primary
    if (IDENTITY_NAME_BLOCKLIST.has(short) || IDENTITY_NAME_BLOCKLIST.has(primary)) return
    // Require nationality or death status for identity lock; bare role is too noisy.
    if (!item.nationality && item.status !== 'dead') return
    out.push({
      ...item,
      name: short,
      full_name: item.full_name || (primary.length >= 3 ? primary : undefined),
      nationality: item.nationality ? compactText(item.nationality, 12) : undefined,
      role_label: item.role_label ? compactText(item.role_label, 16) : undefined,
      evidence: compactText(item.evidence, 140),
    })
  }

  // 【樱花国天选者：小林一郎。】 / 【大夏国天选者小林，已死亡。】
  const bracketRe = new RegExp(
    `【((?:${NATION_PATTERN}))(?:的)?(天选者)[：:]?\\s*([\\u4e00-\\u9fff]{2,4})([^】]{0,20})】`,
    'g',
  )
  let match: RegExpExecArray | null
  while ((match = bracketRe.exec(source))) {
    const tail = match[4] || ''
    push({
      name: match[3],
      full_name: match[3],
      nationality: match[1],
      role_label: '天选者',
      status: /已死亡|死亡|阵亡/.test(tail) ? 'dead' : 'unknown',
      evidence: match[0],
    })
  }

  // 小林，樱花国仅存的天选者 / 小林是樱花国天选者
  const apposRe = new RegExp(
    `([\\u4e00-\\u9fff]{2,4})[，,]\\s*((?:${NATION_PATTERN}))([^。\\n]{0,10}?)(天选者)`,
    'g',
  )
  while ((match = apposRe.exec(source))) {
    push({
      name: match[1],
      full_name: match[1],
      nationality: match[2],
      role_label: '天选者',
      evidence: match[0],
    })
  }

  // 樱花国天选者小林 / 樱花国的天选者小林
  const nationRoleNameRe = new RegExp(
    `((?:${NATION_PATTERN}))(?:的)?(天选者)[：:]?\\s*([\\u4e00-\\u9fff]{2,4})`,
    'g',
  )
  while ((match = nationRoleNameRe.exec(source))) {
    push({
      name: match[3],
      full_name: match[3],
      nationality: match[1],
      role_label: match[2],
      evidence: match[0],
    })
  }


  // Death notice without nation already handled; bare: 天选者小林已死亡 with prior context skipped

  // Dedupe by name+nationality+role
  const seen = new Set<string>()
  return out.filter(item => {
    const key = `${item.name}|${item.nationality || ''}|${item.role_label || ''}|${item.status || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCharacterIdentityCanon(chapters: any[] = []): CharacterIdentityCanonEntry[] {
  const entries: CharacterIdentityCanonEntry[] = []
  const ordered = asArray(chapters).slice().sort((a, b) => (
    Number(a?.chapter_no || a?.chapterNo || 0) - Number(b?.chapter_no || b?.chapterNo || 0)
  ))

  const findEntry = (name: string) => entries.find(item => (
    namesMatch(item.name, name)
    || item.aliases.some(alias => namesMatch(alias, name))
  ))

  for (const chapter of ordered) {
    const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0) || undefined
    const mentions = extractCharacterIdentityMentions(chapterTextOf(chapter))
    for (const mention of mentions) {
      if (!mention.nationality && !mention.role_label && !mention.status) continue
      // Prefer shortest stable display name (小林 over 小林一郎).
      const variants = shortNameVariants(mention.full_name || mention.name)
      const preferredName = variants.sort((a, b) => a.length - b.length)[0] || mention.name
      const prev = findEntry(mention.name) || findEntry(mention.full_name || '') || findEntry(preferredName)
      if (!prev) {
        entries.push({
          name: preferredName,
          aliases: uniqueTexts([mention.name, mention.full_name, preferredName], 6),
          nationality: mention.nationality,
          role_label: mention.role_label,
          status: mention.status && mention.status !== 'unknown' ? mention.status : undefined,
          evidence: mention.evidence,
          count: 1,
          first_chapter_no: chapterNo,
          last_chapter_no: chapterNo,
        })
        continue
      }
      // First established nationality wins (sticky canon).
      const nationality = prev.nationality || mention.nationality
      const role_label = prev.role_label || mention.role_label
      const status = mention.status === 'dead' ? 'dead' : (prev.status || (mention.status !== 'unknown' ? mention.status : undefined))
      prev.aliases = uniqueTexts([...(prev.aliases || []), mention.name, mention.full_name, preferredName], 8)
      // Keep shorter canonical name when available.
      if (preferredName.length < prev.name.length) prev.name = preferredName
      prev.nationality = nationality
      prev.role_label = role_label
      if (status && status !== 'unknown') prev.status = status
      prev.evidence = prev.evidence || mention.evidence
      prev.count += 1
      prev.last_chapter_no = chapterNo || prev.last_chapter_no
    }
  }
  return entries.filter(item => item.nationality || item.role_label)
}

export function detectCharacterIdentityDrift(input: {
  chapterText?: any
  previousChapters?: any[]
  identityCanon?: CharacterIdentityCanonEntry[]
} = {}): CharacterIdentityDrift[] {
  const text = String(input.chapterText || '')
  if (!text.trim()) return []
  const canon = input.identityCanon?.length
    ? input.identityCanon
    : buildCharacterIdentityCanon(input.previousChapters || [])
  if (!canon.length) return []

  const currentMentions = extractCharacterIdentityMentions(text)
  const drifts: CharacterIdentityDrift[] = []

  const findCanon = (name: string) => canon.find(item => (
    namesMatch(item.name, name)
    || item.aliases.some(alias => namesMatch(alias, name))
  ))

  for (const mention of currentMentions) {
    const entry = findCanon(mention.name) || findCanon(mention.full_name || '')
    if (!entry) continue

    if (entry.nationality && mention.nationality && entry.nationality !== mention.nationality) {
      drifts.push({
        name: entry.name,
        field: 'nationality',
        canonical_value: entry.nationality,
        drifted_value: mention.nationality,
        evidence: mention.evidence,
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」已确立为「${entry.nationality}」，本章却写成「${mention.nationality}」，属于身份/国籍漂移。`,
        fix: `把「${mention.nationality}…${entry.name}」改回已确立身份「${entry.nationality}${entry.role_label || ''} ${entry.aliases[0] || entry.name}」，禁止改国籍/阵营标签。`,
      })
    }

    if (entry.role_label && mention.role_label && entry.role_label !== mention.role_label
      && !entry.role_label.includes(mention.role_label) && !mention.role_label.includes(entry.role_label)) {
      drifts.push({
        name: entry.name,
        field: 'role_label',
        canonical_value: entry.role_label,
        drifted_value: mention.role_label,
        evidence: mention.evidence,
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」身份标签已确立为「${entry.role_label}」，本章却写成「${mention.role_label}」。`,
        fix: `统一为「${entry.role_label}」，保留已建立身份。`,
      })
    }
  }

  // Also catch bare wrong-nation templates that extract failed but still contain wrong pair near name.
  for (const entry of canon) {
    if (!entry.nationality) continue
    const names = uniqueTexts([entry.name, ...entry.aliases], 6)
    for (const name of names) {
      const wrongNationRe = new RegExp(`((?:${NATION_PATTERN}))([^。\\n]{0,8})(天选者)?([^。\\n]{0,6})${name}`)
      const match = text.match(wrongNationRe)
      if (!match) continue
      const nation = match[1]
      if (nation === entry.nationality) continue
      if (drifts.some(item => item.name === entry.name && item.field === 'nationality' && item.drifted_value === nation)) continue
      drifts.push({
        name: entry.name,
        field: 'nationality',
        canonical_value: entry.nationality,
        drifted_value: nation,
        evidence: compactText(match[0], 140),
        severity: 'high',
        type: 'character_identity_drift',
        description: `角色「${entry.name}」已确立为「${entry.nationality}」，本章出现「${nation}…${name}」身份漂移。`,
        fix: `将「${nation}」改回「${entry.nationality}」，保持「${entry.nationality}${entry.role_label || '天选者'}${name}」一致。`,
      })
    }
  }

  const seen = new Set<string>()
  return drifts.filter(item => {
    const key = `${item.name}|${item.field}|${item.drifted_value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCharacterIdentityDriftDirective(drifts: CharacterIdentityDrift[] = []) {
  if (!drifts.length) return null
  const primary = drifts[0]
  return {
    key: 'character_identity_drift',
    priority: 1,
    severity: 'high' as const,
    label: `身份漂移·${primary.name}`,
    directive: compactText(primary.fix, 220),
    issue: {
      severity: 'high',
      type: 'character_identity_drift',
      description: primary.description,
      evidence: primary.evidence,
      fix: primary.fix,
      source: 'character_card_sync',
    },
  }
}

export function mergeIdentityCanonIntoStoryState(
  storyState: any = {},
  identityCanon: CharacterIdentityCanonEntry[] = [],
) {
  const base = storyState && typeof storyState === 'object' ? { ...storyState } : {}
  const existing = asArray(base.character_identity_canon || base.characterIdentityCanon)
  const byName = new Map<string, any>()
  for (const item of existing) {
    const name = compactText(item?.name, 12)
    if (!name) continue
    byName.set(name, item)
  }
  for (const item of identityCanon) {
    const prev = byName.get(item.name)
    if (!prev || Number(item.count || 0) >= Number(prev.count || 0)) {
      byName.set(item.name, { ...item })
    } else if (prev && !prev.nationality && item.nationality) {
      byName.set(item.name, { ...prev, nationality: item.nationality, role_label: prev.role_label || item.role_label })
    }
  }
  base.character_identity_canon = [...byName.values()]
  base.character_identity_rules = uniqueTexts(
    base.character_identity_canon.map((item: any) => {
      const bits = [item.name, item.nationality, item.role_label, item.status].filter(Boolean)
      return bits.join('·')
    }),
    32,
  )
  return base
}
