import { firstCompactText } from './story-drive-basics'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

export function normalizeVolumeClimaxBeat(value: any, index: number) {
  const raw = typeof value === 'object' && value ? value : { label: value }
  const label = firstCompactText(raw.label, raw.title, raw.name, raw.summary, raw.detail, `爆点${index + 1}`)
  const detail = firstCompactText(raw.detail, raw.description, raw.summary, raw.promise, raw.payoff)
  const type = firstCompactText(raw.type, raw.beat_type, raw.beatType, raw.kind)
  if (!label && !detail && !type) return null
  return {
    chapter_no: Number(raw.chapter_no || raw.chapterNo || raw.chapter || 0) || null,
    type,
    label,
    detail,
  }
}

export function sortNearbyVolumeBeats(beats: any[], chapterNo: number) {
  return beats
    .map((beat, index) => ({ beat, index }))
    .sort((left, right) => {
      const leftNo = Number(left.beat.chapter_no || 0)
      const rightNo = Number(right.beat.chapter_no || 0)
      if (chapterNo && leftNo === chapterNo && rightNo !== chapterNo) return -1
      if (chapterNo && rightNo === chapterNo && leftNo !== chapterNo) return 1
      if (chapterNo && leftNo && rightNo) return Math.abs(leftNo - chapterNo) - Math.abs(rightNo - chapterNo)
      return left.index - right.index
    })
    .map(item => item.beat)
}

export function normalizeVolumeClimaxBrief(value: any, target: any = {}, volumeBeatBudget: any = {}) {
  const explicit = value?.volume_climax_brief
    || value?.volumeClimaxBrief
    || value?.volume_beat_brief
    || value?.volumeBeatBrief
    || target?.volume_climax_brief
    || target?.volumeClimaxBrief
    || target?.volume_beat_brief
    || target?.volumeBeatBrief
    || {}
  const budget = value?.volume_beat_budget
    || value?.volumeBeatBudget
    || volumeBeatBudget?.volume_beat_budget
    || volumeBeatBudget?.volumeBeatBudget
    || volumeBeatBudget
    || {}
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || explicit?.chapter_no || explicit?.chapterNo || 0)
  const explicitBeats = asArray(explicit?.nearby_beats || explicit?.nearbyBeats)
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const budgetBeats = asArray(budget?.beats || budget?.volume_beats || budget?.volumeBeats || budget?.climax_beats || budget?.climaxBeats)
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const nearbyBeats = (explicitBeats.length ? explicitBeats : sortNearbyVolumeBeats(budgetBeats, chapterNo)).slice(0, 6)
  const currentBeat = nearbyBeats.find((beat: any) => chapterNo && Number(beat.chapter_no || 0) === chapterNo) || nearbyBeats[0] || null
  const requiredBeats = uniqueBriefStrings(
    explicit?.required_beats
    || explicit?.requiredBeats
    || explicit?.beats_required
    || explicit?.beatsRequired
    || [],
    8,
  )
  const forbiddenPayoff = uniqueBriefStrings(
    explicit?.forbidden_payoff
    || explicit?.forbiddenPayoff
    || explicit?.forbidden_payoffs
    || explicit?.forbiddenPayoffs
    || explicit?.forbidden_resolution
    || explicit?.forbiddenResolution
    || [],
    8,
  )
  const nextActions = uniqueBriefStrings(
    explicit?.next_actions
    || explicit?.nextActions
    || budget?.next_actions
    || budget?.nextActions
    || [],
    8,
  )
  const currentChapterRole = firstCompactText(
    explicit?.current_chapter_role,
    explicit?.currentChapterRole,
    explicit?.chapter_role,
    explicit?.chapterRole,
    explicit?.role,
    currentBeat ? `${currentBeat.type ? `${currentBeat.type}：` : ''}${currentBeat.label}${currentBeat.detail ? `，${currentBeat.detail}` : ''}` : '',
    budget?.summary,
  )
  const volumeGoal = firstCompactText(
    explicit?.volume_goal,
    explicit?.volumeGoal,
    budget?.volume_goal,
    budget?.volumeGoal,
    budget?.goal,
    budget?.summary,
  )
  const climaxPromise = firstCompactText(
    explicit?.climax_promise,
    explicit?.climaxPromise,
    explicit?.reader_payoff,
    explicit?.readerPayoff,
    explicit?.payoff,
    currentBeat?.detail,
  )
  if (!currentChapterRole && !volumeGoal && !climaxPromise && !requiredBeats.length && !forbiddenPayoff.length && !nearbyBeats.length && !nextActions.length) return null
  return {
    status: compactBriefText(explicit?.status || budget?.status, 'ready'),
    current_volume_title: firstCompactText(explicit?.current_volume_title, explicit?.currentVolumeTitle, budget?.current_volume_title, budget?.currentVolumeTitle, budget?.volume_title, budget?.volumeTitle),
    chapter_range: firstCompactText(explicit?.chapter_range, explicit?.chapterRange, budget?.chapter_range, budget?.chapterRange),
    current_chapter_role: currentChapterRole,
    volume_goal: volumeGoal,
    climax_promise: climaxPromise,
    required_beats: requiredBeats,
    forbidden_payoff: forbiddenPayoff,
    nearby_beats: nearbyBeats,
    next_actions: nextActions,
  }
}
