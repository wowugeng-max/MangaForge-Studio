import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
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

export function genrePositioningArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countGenrePositioningSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizeGenreLabelCheck(value: any, chapterText: string) {
  const expected = compactBriefText(value)
  if (!expected) return null
  const match = anchorMatchScore(expected, chapterText)
  const text = String(chapterText || '')
  const labelSignals = countGenrePositioningSignals(text, [
    /都市|现代|职场|生活/,
    /系统|面板/,
    /逆袭|翻盘|反打|低谷/,
    /长篇|连载|追更/,
  ])
  const drift = /古风权谋|修仙秘境|玄幻宗门/.test(text) && /都市|系统|逆袭/.test(expected)
  const delivered = !drift && (match.score >= 36 || labelSignals >= 2)
  return {
    key: 'genre_label',
    label: '题材标签',
    text: expected,
    expected,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, drift ? 14 : 52),
    evidence: uniqueBriefStrings([
      ...match.matched,
      labelSignals >= 2 ? '题材标签代理信号可见' : '',
      drift ? '题材漂移到其他类型' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['题材标签没有在正文场景中兑现'],
    issue: delivered ? '' : '题材标签没有落成正文场景，或从都市系统逆袭漂移到其他类型。',
    repair_instruction: delivered ? '' : '补题材标签：把正文拉回既定题材，让类型标签在场景、能力、冲突和回报里可见。',
  }
}

export function normalizeGenrePsychologyCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countGenrePositioningSignals(chapterText, [
    /中年危机|失业|经济压力|低谷/,
    /被轻视|质疑|翻盘|补偿/,
    /掌控感|量化|可升级|可验证|可反击/,
    /尊严|认可|反证/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.35)) || signalCount >= 2
  return {
    key: 'reader_psychology',
    label: '读者心理',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 16),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '读者心理代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '读者心理没有落地到低谷、经济压力、被轻视翻盘、掌控感或尊严修复。',
    repair_instruction: delivered ? '' : '补读者心理：让压力、轻视、翻盘补偿和掌控感通过现场冲突与回报释放。',
  }
}

export function normalizeGenreFormulaCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countGenrePositioningSignals(chapterText, [
    /低谷|压迫|质疑/,
    /系统面板|面板|系统/,
    /小胜|兑现|结果|回报/,
    /新门槛|更高门槛|下一目标|新订单/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= 1 || signalCount >= 3
  return {
    key: 'genre_formula',
    label: '类型公式',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '类型公式链路可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '类型公式没有形成低谷压迫、系统触发、小胜兑现和新门槛的链路。',
    repair_instruction: delivered ? '' : '补类型公式：按低谷压迫 -> 核心机制触发 -> 小胜兑现 -> 新门槛出现重排场景。',
  }
}

export function normalizeGenreCoreHookCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countGenrePositioningSignals(chapterText, [
    /旧城设备师|设备师/,
    /隐藏工具箱/,
    /报废设备|设备故障|医院设备/,
    /新订单|订单|维修/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 32).length
  const delivered = deliveredItems >= 1 || signalCount >= 3
  return {
    key: 'core_hook_rules',
    label: '核心梗',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(16, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '核心梗代理信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 32).slice(0, 8),
    issue: delivered ? '' : '核心梗没有落成可复述场景，读者看不到本书最核心的类型承诺。',
    repair_instruction: delivered ? '' : '补核心梗：用主角身份、核心能力、现实问题和订单结果组成一句能复述的场景。',
  }
}

export function normalizeGoldfingerFitCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const text = String(chapterText || '')
  const fitSignals = countGenrePositioningSignals(text, [
    /隐藏工具箱|系统面板|金手指/,
    /维修职业|设备维修|设备师|职业/,
    /设备订单|订单|报废设备|医院设备/,
    /现实生活|生活困境|经济压力/,
  ])
  const detached = /血脉神通|天赋神通|秘境传承/.test(text)
    && (!/维修职业|设备订单|设备维修/.test(text) || /无关|脱离/.test(text))
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = !detached && (deliveredItems >= 1 || fitSignals >= 3)
  return {
    key: 'goldfinger_fit_rules',
    label: '金手指贴合',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(16, fitSignals * 18), detached ? 24 : 66),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      fitSignals >= 3 ? '金手指与职业/订单贴合' : '',
      detached ? '金手指脱离主角职业' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '金手指没有贴合主角职业、生活困境和现实任务，类型承诺容易失焦。',
    repair_instruction: delivered ? '' : '补金手指贴合：让能力解决主角职业/生活里的现实问题，并用订单或任务验证收益。',
  }
}

export function normalizeMustHaveSceneCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countGenrePositioningSignals(chapterText, [
    /系统面板|刺眼评价|任务/,
    /质疑者|压力源|客户.*质疑|协会/,
    /结果反证|用结果|反证自己/,
    /小胜|新门槛|新订单/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.4)) || signalCount >= 3
  return {
    key: 'must_have_scenes',
    label: '必备场景',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 17),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '题材必备场景可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '题材必备场景没有出现，类型承诺停在标签而不是正文桥段。',
    repair_instruction: delivered ? '' : '补必备场景：写出系统/核心机制触发、压力源在场、主角用结果反证和新门槛。',
  }
}

export function normalizePlatformFitCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countGenrePositioningSignals(chapterText, [
    /番茄|平台口味/,
    /快节奏/,
    /强回报|短周期爽点|爽点/,
    /清晰冲突|冲突/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= 1 || signalCount >= 3
  return {
    key: 'platform_fit_rules',
    label: '平台适配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '平台节奏/回报信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '平台适配没有落到快节奏、强回报、清晰冲突或短周期爽点。',
    repair_instruction: delivered ? '' : '补平台适配：按平台口味缩短回报周期，强化清晰冲突和章内小爽点。',
  }
}

export function normalizeMicroInnovationCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const boundedSignals = countGenrePositioningSignals(text, [
    /微创新.*服务|服务.*微创新/,
    /没有跑出|不跑出|模板内/,
    /只服务.*职业|服务维修职业|服务题材模板/,
    /最多\s*3\s*个|不超过\s*3\s*个/,
  ])
  const overdone = /微创新很多|创新太多|模板外|炫技|推翻模板/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = !overdone && (deliveredItems >= 1 || boundedSignals >= 1)
  return {
    key: 'micro_innovation_rules',
    label: '微创新边界',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(16, boundedSignals * 24), overdone ? 24 : 64),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      boundedSignals ? '微创新边界可见' : '',
      overdone ? '微创新越界' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '微创新没有服务类型模板，或创新过多压过题材承诺。',
    repair_instruction: delivered ? '' : '收束微创新：最多保留服务题材模板的创新点，删掉模板外炫技。',
  }
}

export function normalizeGenreLongboardFocusCheck(values: any[], chapterText: string) {
  const planned = genrePositioningArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const longboardSignals = countGenrePositioningSignals(text, [
    /拉长(?:题材)?长板|拉长板|题材长板/,
    /核心卖点|目标情绪|最高频爽点/,
    /三个角度|3\s*个角度|中年危机翻盘|系统评价吐槽|新手奖励立刻见效/,
    /没有为补短板|不为补短板|不补短板|不稀释核心卖点/,
  ])
  const noDilutionGuard = /没有为补短板|不为补短板|不补短板|不新增[^。！？!?\n]{0,18}支线|不得[^。！？!?\n]{0,18}支线/.test(text)
  const dilutionRisk = !noDilutionGuard && /为了补[^。！？!?\n]{0,18}短板|新增[^。！？!?\n]{0,18}支线|稀释核心卖点|冲淡了核心卖点/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = !dilutionRisk && (deliveredItems >= 1 || longboardSignals >= 2)
  return {
    key: 'longboard_focus_rules',
    label: '长板聚焦',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100), longboardSignals * 22) : Math.min(Math.max(18, longboardSignals * 18), dilutionRisk ? 24 : 64),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      longboardSignals >= 2 ? '题材长板与核心卖点强化信号可见' : '',
      dilutionRisk ? '存在补短板支线稀释核心卖点风险' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '正文没有优先拉题材长板，或为补短板新增支线导致核心卖点被稀释。',
    repair_instruction: delivered ? '' : '补长板聚焦：拉长题材长板和核心卖点，确认同一卖点至少 3 个展开角度，删除稀释核心卖点的补短板支线。',
  }
}

export function buildGenrePositioningDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /古风权谋|修仙秘境|玄幻宗门/.test(text) && /都市系统|维修订单|设备维修|旧城设备师/.test(text) === false ? {
      key: 'genre_drift',
      label: '题材漂移',
      evidence: '正文出现古风权谋/修仙秘境等类型信号，偏离都市系统逆袭承诺。',
      fix: '把场景拉回现代生活、职业订单、系统反馈和现实收益。',
    } : null,
    /没有系统面板|没有维修订单/.test(text) ? {
      key: 'missing_core_promise',
      label: '核心承诺缺失',
      evidence: '正文直接承认没有系统面板或维修订单。',
      fix: '补系统面板、维修订单和现实任务反馈。',
    } : null,
    /血脉神通|天赋神通|秘境传承/.test(text) && /维修职业|设备订单|设备维修/.test(text) === false ? {
      key: 'detached_goldfinger',
      label: '金手指脱题',
      evidence: '金手指变成血脉/秘境能力，脱离主角职业和现实任务。',
      fix: '让能力重新贴回维修职业、设备订单和生活困境。',
    } : null,
    /主要展示宏大世界观|暂时没有现实回报|没有现实回报/.test(text) ? {
      key: 'no_real_world_payoff',
      label: '缺现实回报',
      evidence: '正文停在宏大设定展示，没有给现实收益或订单回报。',
      fix: '补订单结果、客户反应、收入/授权/能力变化和下一门槛。',
    } : null,
    /挂羊头卖狗肉/.test(text) ? {
      key: 'promise_mismatch',
      label: '挂羊头卖狗肉',
      evidence: '正文显式出现题材承诺错位。',
      fix: '统一书名、简介、题材标签和正文桥段。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'genre_positioning_forbidden',
    label: '题材定位硬伤',
    text: '题材定位不得漂移、脱离核心机制、脱离主角职业或挂羊头卖狗肉。',
    expected: '题材定位不得漂移、脱离核心机制、脱离主角职业或挂羊头卖狗肉。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项题材定位确定性风险。`,
    repair_instruction: '按 oh-story 题材定位修复：统一题材标签、核心梗、金手指、必备场景和平台口味，避免挂羊头卖狗肉。',
  }
}

export function genrePositioningPriority(missed: any[]) {
  if (missed.some(item => item.key === 'genre_positioning_forbidden')) return '优先清题材硬伤'
  if (missed.some(item => item.key === 'longboard_focus_rules')) return '优先拉题材长板'
  if (missed.some(item => item.key === 'core_hook_rules')) return '优先补核心梗'
  if (missed.some(item => item.key === 'goldfinger_fit_rules')) return '优先补金手指贴合'
  if (missed.some(item => item.key === 'genre_label')) return '优先校题材标签'
  if (missed.some(item => item.key === 'genre_formula')) return '优先补类型公式'
  if (missed.some(item => item.key === 'must_have_scenes')) return '优先补必备场景'
  if (missed.some(item => item.key === 'platform_fit_rules')) return '优先补平台适配'
  if (missed.some(item => item.key === 'micro_innovation_rules')) return '优先收束微创新'
  if (missed.some(item => item.key === 'reader_psychology')) return '优先补读者心理'
  return ''
}
