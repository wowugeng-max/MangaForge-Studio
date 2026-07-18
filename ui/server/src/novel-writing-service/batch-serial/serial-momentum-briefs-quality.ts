import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewBelongsToChapter, reviewPayloadForType, reviewTimestamp } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import { normalizeRecentFatigueBrief } from '../../novel-writing/rolling-rhythm-preflight'
import { serialChapterRangeLabel } from './serial-momentum-gap-runs'

function serialQualityRiskFromReview(review: any, chapter: any) {
  const type = String(review?.review_type || '')
  const payload = reviewPayloadForType(review, type)
  if (!reviewBelongsToChapter(review, payload, chapter)) return null
  const status = String(payload?.status || review?.status || '').toLowerCase()
  const countFrom = (...keys: string[]) => keys.reduce((max, key) => {
    const value = Number(payload?.[key])
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  const score = Number(
    payload?.score
    ?? payload?.self_check?.review?.score
    ?? payload?.selfCheck?.review?.score
    ?? payload?.readability_score
    ?? payload?.readabilityScore,
  )
  const needsRevision = Boolean(
    payload?.needs_revision
    || payload?.needsRevision
    || payload?.self_check?.review?.needs_revision
    || payload?.selfCheck?.review?.needsRevision,
  )
  const serialRiskRepairRisks = type === 'prose_quality'
    ? proseQualitySerialRiskRepairRisks(payload)
    : []
  const riskCount = (() => {
    if (type === 'prose_quality') return serialRiskRepairRisks.length || ((status === 'warn' || needsRevision || (Number.isFinite(score) && score > 0 && score < 78)) ? 1 : 0)
    if (type === 'deterministic_prose_cleanup') return countFrom('risk_count', 'riskCount')
    if (type === 'state_delta_completeness') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_blueprint_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'core_contract_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'benchmark_recall_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'style_boundary_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_loop_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'information_flow_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'expectation_threshold_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'emotional_arc_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'paragraph_hook_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'suspense_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reversal_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'showdown_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'spectator_reaction_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'payoff_setup_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'bridge_unit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'beat_cooling_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'opening_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_craft_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'punctuation_tone_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'quality_audit_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_handoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'chapter_title_uniqueness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'dialogue_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_behavior_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'asset_linkage_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'state_tracking_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'source_readiness_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'prose_meta_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'intent_confirmation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'continuity_heat_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'conflict_structure_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'upgrade_rhythm_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'target_reader_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'genre_positioning_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'female_audience_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'plot_dynamics_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'story_power_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'character_relation_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'reader_retention_sync') return countFrom('missed_count', 'missedCount', 'weak_count', 'weakCount')
    if (type === 'reader_payoff_sync') return countFrom('missed_count', 'missedCount')
    if (type === 'readability_review') return countFrom('risk_count', 'riskCount') || ((Number.isFinite(score) && score > 0 && score < 78) ? 1 : 0)
    return 0
  })()
  if (riskCount <= 0 || (status === 'ok' && serialRiskRepairRisks.length <= 0)) return null
  const labels: Record<string, string> = {
    prose_quality: '质量门禁',
    deterministic_prose_cleanup: '确定性清理',
    state_delta_completeness: '状态漏记',
    chapter_blueprint_sync: '细纲兑现',
    core_contract_sync: '核心契约',
    benchmark_recall_sync: '文风召回',
    style_boundary_sync: '文风边界',
    story_loop_sync: '故事循环',
    information_flow_sync: '信息流',
    expectation_threshold_sync: '期待阈值',
    emotional_arc_sync: '情绪弧',
    chapter_hook_sync: '章级钩子',
    paragraph_hook_sync: '段落钩子',
    suspense_sync: '悬念编排',
    reversal_sync: '反转设计',
    showdown_sync: '高潮对抗',
    spectator_reaction_sync: '围观反应',
    payoff_setup_sync: '爽点铺垫',
    bridge_unit_sync: '桥段节奏',
    beat_cooling_sync: '节奏冷却',
    opening_sync: '开篇设计',
    prose_craft_sync: '正文工艺',
    punctuation_tone_sync: '语气标点',
    quality_audit_sync: '质量诊断',
    chapter_handoff_sync: '章首承接',
    chapter_title_uniqueness_sync: '章节标题',
    dialogue_sync: '对白质量',
    character_behavior_sync: '角色行为',
    asset_linkage_sync: '资产挂钩',
    state_tracking_sync: '状态跟踪',
    source_readiness_sync: '来源就绪',
    prose_meta_sync: '正文元信息',
    intent_confirmation_sync: '意图确认',
    continuity_heat_sync: '连续性热度',
    conflict_structure_sync: '冲突结构',
    upgrade_rhythm_sync: '升级节奏',
    target_reader_sync: '目标读者',
    genre_positioning_sync: '题材定位',
    female_audience_sync: '女频长篇',
    plot_dynamics_sync: '剧情动力',
    story_power_sync: '故事力',
    character_relation_sync: '角色关系',
    reader_retention_sync: '追读留存',
    reader_payoff_sync: '读者回报',
    readability_review: '可读性',
  }
  return {
    type,
    label: serialRiskRepairRisks.length ? '近章风险修复' : labels[type] || type,
    count: riskCount,
    evidence: serialRiskRepairRisks.length
      ? uniqueBriefStrings(serialRiskRepairRisks.flatMap((item: any) => [item.fix, item.evidence, item.label]), 6).join('；')
      : compactBriefText(payload?.label || payload?.summary || payload?.message || payload?.error || ''),
  }
}

function serialQualityRiskRuns(rows: any[]) {
  const runs: any[][] = []
  let current: any[] = []
  for (const row of rows) {
    if (row.risks.length) {
      current.push(row)
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = []
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

export function buildSerialQualityRegressionBrief(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  const recent = [...asArray(chapters)]
    .filter((item: any) => Number(item?.chapter_no || item?.chapterNo || 0) > 0)
    .filter((item: any) => !chapterNo || Number(item?.chapter_no || item?.chapterNo || 0) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || a.chapterNo || 0) - Number(b.chapter_no || b.chapterNo || 0))
    .slice(-5)
  if (recent.length < 2) return null
  const riskRows = recent.map((item: any) => ({
    chapter: item,
    risks: asArray(reviews).map(review => serialQualityRiskFromReview(review, item)).filter(Boolean),
  }))
  const riskyRows = riskRows.filter(row => row.risks.length)
  const runs = serialQualityRiskRuns(riskRows)
  if (riskyRows.length < 3 && !runs.length) return null
  const longestRun = runs.sort((a, b) => b.length - a.length)[0] || riskyRows
  const rangeLabel = serialChapterRangeLabel(recent)
  const runLabel = serialChapterRangeLabel(longestRun.map(row => row.chapter))
  const riskLabels = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.label)), 8)
  const riskEvidence = uniqueBriefStrings(riskyRows.flatMap(row => row.risks.map((risk: any) => risk.evidence || `${risk.label} ${risk.count}`)), 8)
  const serialRepairRegression = riskLabels.includes('近章风险修复')
  return {
    version: 'oh_story_serial_quality_regression_v1',
    status: 'needs_attention',
    score: Math.max(0, 70 - riskyRows.length * 8 - Math.max(0, longestRun.length - 1) * 6),
    chapter_range_label: rangeLabel,
    summary: `${rangeLabel}出现连续交稿质量退化：${riskLabels.join('、')}。`,
    signals: [{
      key: 'recent_delivery_quality_regression',
      label: '连续交稿质量退化',
      status: 'warn',
      detail: `${runLabel || rangeLabel}连续出现 ${riskLabels.join('、')} 等交稿风险。`,
    }],
    fatigue_risks: uniqueBriefStrings([
      `${runLabel || rangeLabel}连续交稿质量退化：${riskLabels.join('、')}。`,
      ...riskEvidence,
    ], 8),
    next_actions: [
      '无人值守连写必须降速：下一轮优先缩小到1-2章验证，不要继续扩批。',
      ...(serialRepairRegression ? ['下一章必须优先补近章风险修复：把失败的 scene_cards.serial_risk_repairs 和 recent_fatigue_action 写成目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却的可见事件。'] : []),
      '下一章必须先修复最近章节的质量债，再推进新冲突；质量门禁、状态增量、文风召回和细纲兑现不得继续累计。',
      '恢复扩批前必须证明本章有可见回报、状态写回、章末追读和确定性清理通过。',
    ],
    conflict_variation: '降速后先换冲突来源，并把阻力写成可见行动阻拦，避免继续复制上一批弱冲突。',
    payoff_variation: '降速验证章必须交付显性回报，用收益、反制结果、关系变化或阶段结算证明质量恢复。',
    hook_variation: '章末必须留下新的、可追问的问题，并写入下一章优先事项，不能继续制造空钩子。',
    scene_freshness: '本章至少放入一个验证修复的可视化场面，用正文证据证明状态、回报和风险债务已落地。',
  }
}

export function mergeRecentFatigueBriefs(...briefs: any[]) {
  const normalized = briefs
    .map(brief => brief ? normalizeRecentFatigueBrief(brief) : null)
    .filter(Boolean)
  if (!normalized.length) return null
  if (normalized.length === 1) return normalized[0]
  const warningBriefs = normalized.filter((brief: any) => String(brief.status || '').toLowerCase() !== 'ready')
  const source = warningBriefs[0] || normalized[0]
  return {
    status: warningBriefs.length ? 'needs_attention' : 'ready',
    score: Math.min(...normalized.map((brief: any) => Number.isFinite(Number(brief.score)) ? Number(brief.score) : 100)),
    chapter_range_label: uniqueBriefStrings(normalized.map((brief: any) => brief.chapter_range_label), 3).join('；'),
    summary: uniqueBriefStrings(normalized.map((brief: any) => brief.summary), 3).join('；'),
    fatigue_risks: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.fatigue_risks), 12),
    next_actions: uniqueBriefStrings(normalized.flatMap((brief: any) => brief.next_actions), 12),
    signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    risk_signals: (() => {
      const seen = new Set<string>()
      const rows: any[] = []
      for (const signal of normalized.flatMap((brief: any) => asArray(brief.risk_signals || brief.signals))) {
        const key = compactBriefText(signal?.key || signal?.label || signal?.detail)
        if (!key || seen.has(key)) continue
        seen.add(key)
        rows.push(signal)
      }
      return rows.slice(0, 12)
    })(),
    conflict_variation: source.conflict_variation,
    payoff_variation: source.payoff_variation,
    hook_variation: source.hook_variation,
    scene_freshness: source.scene_freshness,
  }
}

