import {
  asArray,
  chapterTextOf,
  compactText,
  isPlausiblePersonName,
  ROLE_TITLES,
  UNIQUE_OFFICE_TITLES,
  uniqueTexts,
} from './character-card-sync-shared'
import { buildPovCharacterStatePatch } from './character-pov'

import {
  buildCharacterIdentityCanon,
  detectCharacterIdentityDrift,
} from './character-card-sync-identity'


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

  // Attach POV knowledge residue for named cast already in seed / existing cards.
  const chapterTextForPov = chapterTextOf(chapter)
  for (const [name, seed] of updateSeed.entries()) {
    const existingChar = existingByName.get(name)
    const povPatch = buildPovCharacterStatePatch({
      chapterText: chapterTextForPov,
      povCharacter: name,
      chapterNo,
      existingState: existingChar?.current_state || seed?.current_state || {},
    })
    if (!povPatch || Object.keys(povPatch).length <= 1) continue
    updateSeed.set(name, {
      ...seed,
      current_state: mergeCurrentState(seed?.current_state || existingChar?.current_state || {}, povPatch, chapterNo),
    })
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

