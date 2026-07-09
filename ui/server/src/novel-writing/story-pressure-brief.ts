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

export function normalizeStoryPressureSignal(value: any) {
  const key = compactBriefText(value?.key || value?.field || value?.type)
  const label = compactBriefText(value?.label || value?.title || key)
  const status = compactBriefText(value?.status || value?.state, 'ok').toLowerCase()
  const detail = compactBriefText(value?.detail || value?.reason || value?.summary || value?.text)
  if (!key && !label && !detail) return null
  return {
    key: key || label,
    label: label || key || '故事压力',
    status,
    detail,
  }
}

export function normalizeStoryPressureBrief(value: any) {
  const raw = value?.story_pressure_brief
    || value?.storyPressureBrief
    || value?.story_pressure_ladder
    || value?.storyPressureLadder
    || value
    || {}
  const signals = asArray(raw.signals || raw.pressure_signals || raw.pressureSignals)
    .map((item: any) => normalizeStoryPressureSignal(item))
    .filter(Boolean)
    .slice(0, 8)
  const weakSignals = signals
    .filter((signal: any) => !['ok', 'ready', 'pass', 'passed'].includes(String(signal.status || '').toLowerCase()))
    .slice(0, 6)
  const pressureSourceRows = asArray(raw.pressure_sources || raw.pressureSources || raw.sources)
  const pressureSources = uniqueBriefStrings(
    pressureSourceRows.map((item: any) => typeof item === 'string' ? item : item?.label || item?.name || item?.summary || item?.detail),
    8,
  )
  const requiredActions = uniqueBriefStrings(raw.required_actions || raw.requiredActions || raw.next_actions || raw.nextActions || [], 8)
  const signalDetail = (key: string) => compactBriefText(signals.find((signal: any) => signal.key === key)?.detail)
  const conflictEscalationGuardrail = compactBriefText(
    raw.conflict_escalation_guardrail
    || raw.conflictEscalationGuardrail
    || signalDetail('conflict_escalation'),
  )
  const stakesGrowthGuardrail = compactBriefText(
    raw.stakes_growth_guardrail
    || raw.stakesGrowthGuardrail
    || signalDetail('stakes_growth'),
  )
  const reversalPressureGuardrail = compactBriefText(
    raw.reversal_pressure_guardrail
    || raw.reversalPressureGuardrail
    || signalDetail('reversal_pressure'),
  )
  const pressureSourceGuardrail = compactBriefText(
    raw.pressure_source_guardrail
    || raw.pressureSourceGuardrail
    || signalDetail('pressure_source'),
  )
  const status = compactBriefText(raw.status, weakSignals.length ? 'needs_attention' : (signals.length || pressureSources.length ? 'ready' : ''))
  const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : null
  const rangeLabel = compactBriefText(raw.chapter_range_label || raw.chapterRangeLabel || raw.range_label || raw.rangeLabel)
  if (!status && !pressureSources.length && !signals.length && !requiredActions.length && !conflictEscalationGuardrail && !stakesGrowthGuardrail && !reversalPressureGuardrail && !pressureSourceGuardrail) return null
  return {
    status,
    score,
    range_label: rangeLabel,
    pressure_sources: pressureSources,
    weak_signals: weakSignals,
    required_actions: requiredActions,
    pressure_source_guardrail: pressureSourceGuardrail,
    conflict_escalation_guardrail: conflictEscalationGuardrail,
    stakes_growth_guardrail: stakesGrowthGuardrail,
    reversal_pressure_guardrail: reversalPressureGuardrail,
  }
}
