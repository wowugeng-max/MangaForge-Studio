import { compactText, parseJsonLikePayload } from '../novel-route-utils'
import { compactRunStateValue, compactWarningList, hashText, runJson, stableStringify } from './run-state'

export function buildOhStoryBatchQualityCheck(chapters: any[] = [], results: any[] = []) {
  const successful = chapters.filter((chapter: any) => ['success', 'skipped', 'written'].includes(String(chapter?.status || '')))
  const chapterNos = successful.map((chapter: any) => Number(chapter.chapter_no || 0)).filter(Boolean)
  const resultChecks = results.flatMap((result: any) => Array.isArray(result?.post_delivery_quality?.checks) ? result.post_delivery_quality.checks : [])
  const checkKeys = [
    ['title_uniqueness', '标题去重'],
    ['prose_meta', '正文元信息'],
    ['chapter_hook', '章尾钩子'],
    ['blueprint_consumption', '细纲兑现'],
    ['foreshadowing_delta', '伏笔增量'],
    ['deterministic_cleanup', '确定性清理'],
    ['story_state', '状态机更新'],
  ]
  if (resultChecks.some((check: any) => check.key === 'source_readiness')) {
    checkKeys.push(['source_readiness', '来源就绪'])
  }
  if (resultChecks.some((check: any) => check.key === 'intent_confirmation')) {
    checkKeys.push(['intent_confirmation', '意图确认'])
  }
  if (resultChecks.some((check: any) => check.key === 'benchmark_recall')) {
    checkKeys.push(['benchmark_recall', '文风召回'])
  }
  if (resultChecks.some((check: any) => check.key === 'style_sample')) {
    checkKeys.push(['style_sample', '样章/风格执行'])
  }
  if (resultChecks.some((check: any) => check.key === 'story_loop')) {
    checkKeys.push(['story_loop', '故事闭环'])
  }
  if (resultChecks.some((check: any) => check.key === 'information_flow')) {
    checkKeys.push(['information_flow', '信息流'])
  }
  if (resultChecks.some((check: any) => check.key === 'expectation_threshold')) {
    checkKeys.push(['expectation_threshold', '期待阈值'])
  }
  if (resultChecks.some((check: any) => check.key === 'emotional_arc')) {
    checkKeys.push(['emotional_arc', '情绪弧'])
  }
  if (resultChecks.some((check: any) => check.key === 'dialogue')) {
    checkKeys.push(['dialogue', '对白质量'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_behavior')) {
    checkKeys.push(['character_behavior', '角色行为'])
  }
  if (resultChecks.some((check: any) => check.key === 'scene_card_receipts')) {
    checkKeys.push(['scene_card_receipts', '场景回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'delivery_risk_receipts')) {
    checkKeys.push(['delivery_risk_receipts', '交稿回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'asset_linkage')) {
    checkKeys.push(['asset_linkage', '资产挂钩'])
  }
  if (resultChecks.some((check: any) => check.key === 'state_tracking')) {
    checkKeys.push(['state_tracking', '状态跟踪'])
  }
  if (resultChecks.some((check: any) => check.key === 'chapter_handoff')) {
    checkKeys.push(['chapter_handoff', '章首承接'])
  }
  if (resultChecks.some((check: any) => check.key === 'paragraph_hook')) {
    checkKeys.push(['paragraph_hook', '段落钩子'])
  }
  if (resultChecks.some((check: any) => check.key === 'suspense')) {
    checkKeys.push(['suspense', '悬念编排'])
  }
  if (resultChecks.some((check: any) => check.key === 'reversal')) {
    checkKeys.push(['reversal', '反转设计'])
  }
  if (resultChecks.some((check: any) => check.key === 'showdown')) {
    checkKeys.push(['showdown', '高潮对抗'])
  }
  if (resultChecks.some((check: any) => check.key === 'opening')) {
    checkKeys.push(['opening', '开篇设计'])
  }
  if (resultChecks.some((check: any) => check.key === 'bridge_unit')) {
    checkKeys.push(['bridge_unit', '桥段节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'continuity_heat')) {
    checkKeys.push(['continuity_heat', '连续性热度'])
  }
  if (resultChecks.some((check: any) => check.key === 'conflict_structure')) {
    checkKeys.push(['conflict_structure', '冲突结构'])
  }
  if (resultChecks.some((check: any) => check.key === 'upgrade_rhythm')) {
    checkKeys.push(['upgrade_rhythm', '升级节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'target_reader')) {
    checkKeys.push(['target_reader', '目标读者'])
  }
  if (resultChecks.some((check: any) => check.key === 'genre_positioning')) {
    checkKeys.push(['genre_positioning', '题材定位'])
  }
  if (resultChecks.some((check: any) => check.key === 'female_audience')) {
    checkKeys.push(['female_audience', '女频长篇'])
  }
  if (resultChecks.some((check: any) => check.key === 'plot_dynamics')) {
    checkKeys.push(['plot_dynamics', '剧情动力'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_relation')) {
    checkKeys.push(['character_relation', '角色关系'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_retention')) {
    checkKeys.push(['reader_retention', '追读留存'])
  }
  if (resultChecks.some((check: any) => check.key === 'core_contract')) {
    checkKeys.push(['core_contract', '核心契约'])
  }
  if (resultChecks.some((check: any) => check.key === 'story_drive')) {
    checkKeys.push(['story_drive', '故事驱动力'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_arc')) {
    checkKeys.push(['character_arc', '人物弧光'])
  }
  if (resultChecks.some((check: any) => check.key === 'style_boundary')) {
    checkKeys.push(['style_boundary', '风格边界'])
  }
  if (resultChecks.some((check: any) => check.key === 'innovation')) {
    checkKeys.push(['innovation', '创新执行'])
  }
  if (resultChecks.some((check: any) => check.key === 'runway')) {
    checkKeys.push(['runway', '连载航线'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_expectation')) {
    checkKeys.push(['reader_expectation', '读者期待'])
  }
  if (resultChecks.some((check: any) => check.key === 'quality_audit')) {
    checkKeys.push(['quality_audit', '质量诊断'])
  }
  if (resultChecks.some((check: any) => check.key === 'beat_cooling')) {
    checkKeys.push(['beat_cooling', '冷却节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_payoff')) {
    checkKeys.push(['reader_payoff', '读者回报'])
  }
  if (resultChecks.some((check: any) => check.key === 'prose_craft')) {
    checkKeys.push(['prose_craft', '正文工艺'])
  }
  if (resultChecks.some((check: any) => check.key === 'punctuation_tone')) {
    checkKeys.push(['punctuation_tone', '语气标点'])
  }
  if (resultChecks.some((check: any) => check.key === 'payoff_setup')) {
    checkKeys.push(['payoff_setup', '爽点铺垫'])
  }
  if (resultChecks.some((check: any) => check.key === 'spectator_reaction')) {
    checkKeys.push(['spectator_reaction', '围观反应'])
  }
  if (resultChecks.some((check: any) => check.key === 'prose_revision_receipt_sync')) {
    checkKeys.push(['prose_revision_receipt_sync', '修订回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'deslop_repair_receipt_sync')) {
    checkKeys.push(['deslop_repair_receipt_sync', '去AI味回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'quality_audit_repair_receipt_sync')) {
    checkKeys.push(['quality_audit_repair_receipt_sync', '质量回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_cascade_impact_sync')) {
    checkKeys.push(['revision_cascade_impact_sync', '级联修订'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_scope_guard_sync')) {
    checkKeys.push(['revision_scope_guard_sync', '修订幅度'])
  }
  if (resultChecks.some((check: any) => check.key === 'next_chapter_quality_plan_receipts')) {
    checkKeys.push(['next_chapter_quality_plan_receipts', '质量续航回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'status_filter_receipts')) {
    checkKeys.push(['status_filter_receipts', '状态筛选回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'write_preparation_receipts')) {
    checkKeys.push(['write_preparation_receipts', '写前准备回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_context_receipts')) {
    checkKeys.push(['revision_context_receipts', '修订上下文'])
  }
  const checks = checkKeys.map(([key, label]) => {
    const rows = resultChecks.filter((check: any) => check.key === key)
    const warnCount = rows.filter((check: any) => check.status === 'warn').length
    const unknownCount = rows.filter((check: any) => check.status === 'unknown').length
    return {
      key,
      label,
      status: warnCount > 0 ? 'warn' : rows.length > 0 && unknownCount === 0 ? 'ok' : 'unknown',
      checked_count: rows.length,
      warn_count: warnCount,
      unknown_count: unknownCount,
      summaries: rows.map((check: any) => check.summary).filter(Boolean).slice(0, 6),
    }
  })
  return {
    source: 'oh_story_step_3',
    status: checks.some(check => check.status !== 'ok') ? 'warn' : 'ok',
    completed_count: chapterNos.length,
    chapter_nos: chapterNos,
    revised_count: results.filter((result: any) => result.revised === true).length,
    average_score: results.length
      ? Math.round(results.reduce((sum: number, result: any) => sum + Number(result.score || 0), 0) / results.length)
      : null,
    checks,
    generated_at: new Date().toISOString(),
  }
}

const POST_DELIVERY_QUALITY_ISSUE_TYPES: Record<string, string> = {
  title_uniqueness: 'title_uniqueness_gap',
  prose_meta: 'prose_meta_gap',
  chapter_hook: 'chapter_hook_quality_gap',
  blueprint_consumption: 'blueprint_consumption_gap',
  foreshadowing_delta: 'foreshadowing_delta_gap',
  deterministic_cleanup: 'deterministic_cleanup_gap',
  story_state: 'story_state_update_gap',
  source_readiness: 'source_readiness_gap',
  intent_confirmation: 'intent_confirmation_gap',
  benchmark_recall: 'benchmark_recall_gap',
  style_sample: 'style_sample_gap',
  story_loop: 'story_loop_gap',
  information_flow: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  emotional_arc: 'emotional_arc_gap',
  dialogue: 'dialogue_gap',
  character_behavior: 'character_behavior_gap',
  scene_card_receipts: 'scene_card_receipts_gap',
  delivery_risk_receipts: 'delivery_risk_receipts_gap',
  asset_linkage: 'asset_linkage_gap',
  state_tracking: 'state_tracking_gap',
  chapter_handoff: 'chapter_handoff_gap',
  paragraph_hook: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  reversal: 'reversal_gap',
  showdown: 'showdown_gap',
  opening: 'opening_gap',
  bridge_unit: 'bridge_unit_gap',
  continuity_heat: 'continuity_heat_gap',
  conflict_structure: 'conflict_structure_gap',
  upgrade_rhythm: 'upgrade_rhythm_gap',
  target_reader: 'target_reader_gap',
  genre_positioning: 'genre_positioning_gap',
  female_audience: 'female_audience_gap',
  plot_dynamics: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  reader_retention: 'reader_retention_gap',
  core_contract: 'core_contract_gap',
  story_drive: 'story_drive_gap',
  character_arc: 'character_arc_gap',
  style_boundary: 'style_boundary_gap',
  innovation: 'innovation_missed',
  runway: 'runway_gap',
  reader_expectation: 'reader_expectation_debt',
  quality_audit: 'quality_audit_gap',
  beat_cooling: 'beat_cooling_gap',
  reader_payoff: 'reader_payoff_debt',
  prose_craft: 'prose_craft_gap',
  punctuation_tone: 'punctuation_tone_gap',
  payoff_setup: 'payoff_setup_gap',
  spectator_reaction: 'spectator_reaction_gap',
  prose_revision_receipt_sync: 'prose_revision_receipt_sync',
  deslop_repair_receipt_sync: 'deslop_repair_receipt_sync',
  quality_audit_repair_receipt_sync: 'quality_audit_repair_receipt_sync',
  revision_cascade_impact_sync: 'revision_cascade_impact_sync',
  revision_scope_guard_sync: 'revision_scope_guard_sync',
  next_chapter_quality_plan_receipts: 'next_chapter_quality_plan_receipts_gap',
  status_filter_receipts: 'status_filter_receipts_gap',
  write_preparation_receipts: 'write_preparation_receipts_gap',
  revision_context_receipts: 'revision_context_receipts_gap',
}

