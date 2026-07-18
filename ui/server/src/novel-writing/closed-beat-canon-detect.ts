import {
  type BeatFamilyStatus,
  type ProgressBeatFamilyId,
  type ClosedBeatRecord,
  type LiveChapterContract,
  type ZombiePressureFinding,
  type FamilyDef,
  FAMILY_DEFS,
  compact,
  asArray,
  uniqueTexts,
  chapterNoOf,
  chapterTextOf,
  proseMatchesClose,
  textHitsFamilyGoal,
  extractEvidence,
  familyDef,
} from './closed-beat-canon-shared'

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

