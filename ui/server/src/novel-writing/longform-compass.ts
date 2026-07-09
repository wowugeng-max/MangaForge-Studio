function asArray(value: any) {
  if (Array.isArray(value)) return value
  return value === undefined || value === null || value === '' ? [] : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

const LONGFORM_COMPASS_AXIS_LABELS: Record<string, string> = {
  reader_promise: '读者承诺',
  protagonist_drive: '主角长期欲望',
  core_conflict: '核心矛盾',
  world_hook: '世界奇点',
  innovation_hook: '创新卖点',
  payoff_loop: '长期爽点循环',
  ending_direction: '结局方向',
}

export function normalizeLongformCompassAxis(item: any) {
  const key = compactBriefText(item?.key)
  const value = compactBriefText(item?.value || item?.summary || item?.detail)
  if (!key || !value) return null
  return {
    key,
    label: compactBriefText(item?.label, LONGFORM_COMPASS_AXIS_LABELS[key] || key),
    value,
    locked: item?.locked !== false,
  }
}

export function normalizeLongformCompass(value: any) {
  const raw = value?.compass || value?.longform_compass || value?.longformCompass || value || {}
  const directAxes = asArray(raw.axes).map(normalizeLongformCompassAxis).filter(Boolean)
  const fieldAxes = [
    ['reader_promise', raw.reader_promise || raw.readerPromise],
    ['protagonist_drive', raw.protagonist_drive || raw.protagonistDrive],
    ['core_conflict', raw.core_conflict || raw.coreConflict],
    ['world_hook', raw.world_hook || raw.worldHook],
    ['innovation_hook', raw.innovation_hook || raw.innovationHook],
    ['payoff_loop', raw.payoff_loop || raw.payoffLoop],
    ['ending_direction', raw.ending_direction || raw.endingDirection],
  ].map(([key, axisValue]) => normalizeLongformCompassAxis({ key, value: axisValue })).filter(Boolean)
  const axes = directAxes.length ? directAxes : fieldAxes
  const immutableRules = Array.from(new Set([
    ...asArray(raw.immutable_rules),
    ...asArray(raw.immutableRules),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const flexibleZones = Array.from(new Set([
    ...asArray(raw.flexible_zones),
    ...asArray(raw.flexibleZones),
  ].map(item => compactBriefText(item)).filter(Boolean))).slice(0, 8)
  const readerPromise = compactBriefText(raw.reader_promise || raw.readerPromise || axes.find((axis: any) => axis.key === 'reader_promise')?.value)
  if (!readerPromise && !axes.length && !immutableRules.length && !flexibleZones.length) return null

  return {
    reader_promise: readerPromise,
    axes,
    immutable_rules: immutableRules,
    flexible_zones: flexibleZones,
  }
}

export function longformCompassFromContext(contextPackage: any = {}, preDraftBrief: any = null, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = preDraftBrief
    || contextPackage?.pre_draft_brief
    || contextPackage?.preDraftBrief
    || target?.pre_draft_brief
    || target?.preDraftBrief
    || chapter?.raw_payload?.pre_draft_brief
    || chapter?.raw_payload?.preDraftBrief
    || {}
  return target.longform_compass
    || target.longformCompass
    || brief.longform_compass
    || brief.longformCompass
    || contextPackage?.longform_compass
    || contextPackage?.longformCompass
    || chapter?.raw_payload?.longform_compass
    || chapter?.raw_payload?.longformCompass
    || null
}
