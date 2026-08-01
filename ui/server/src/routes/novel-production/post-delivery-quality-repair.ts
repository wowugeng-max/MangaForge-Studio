import { compactText, parseJsonLikePayload } from '../novel-route-utils'
import { compactRunStateValue, compactWarningList, hashText, runJson, stableStringify } from './run-state'

export function postDeliveryQualityRepairAction(check: any = {}) {
  const key = String(check?.key || '')
  if (key === 'title_uniqueness') return '修正重复或相似章节标题，并重新运行标题去重复检。'
  if (key === 'prose_meta') return '删除正文中的上一章/本章/伏笔/读者等元叙事词，改成角色当下可感知的事件锚点。'
  if (key === 'chapter_hook') return '重修章首/章尾钩子，让最后一幕留下下一章必须处理的问题。'
  if (key === 'blueprint_consumption') return '按 chapter_blueprint 补齐未兑现的场景、因果链、代价收益和章尾承接。'
  if (key === 'foreshadowing_delta') return '补齐本章新增伏笔/回收伏笔的增量记录，并同步追踪/伏笔.md。'
  if (key === 'deterministic_cleanup') return '按确定性清理结果修正文风、格式、禁用词、标点和 AI 味残留。'
  if (key === 'story_state') return '补齐故事状态写回，更新追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md 和追踪/角色状态.md。'
  if (key === 'source_readiness') return '补齐来源就绪证据，确认上一章正文、追踪上下文、伏笔、时间线、角色状态和本章细纲已读取或刚更新。'
  if (key === 'intent_confirmation') return '补齐意图确认，明确本章情绪、节奏、模块、文风指令和新版细纲职责如何落成正文。'
  if (key === 'benchmark_recall') return '补齐文风/标杆召回证据，确认情绪模块、节奏参考、匹配章技巧和锚点片段已落成正文。'
  if (key === 'style_sample') return '补齐样章/风格执行证据，确认样章策略、对白节奏、停顿方式和禁照搬边界已落成正文。'
  if (key === 'story_loop') return '补齐故事闭环，确认本章问题、行动、代价、回报和新问题形成可追踪循环。'
  if (key === 'information_flow') return '调整信息流，确认关键信息随冲突推进分层释放，不用整段设定说明替代剧情。'
  if (key === 'expectation_threshold') return '补齐期待阈值，确认危机、代价、承诺和可期待回报在爽点前建立。'
  if (key === 'emotional_arc') return '补齐情绪弧，确认压力、选择、爆发、余波和角色反应形成可感知变化。'
  if (key === 'dialogue') return '修复对白质量，确认每段对白都有角色目标、冲突压力、潜台词和声线差异，删除只解释信息的填充对白。'
  if (key === 'character_behavior') return '修复角色行为链，确认选择和动作符合角色状态、关系压力、收益代价和当前场景约束，避免降智或无因转向。'
  if (key === 'scene_card_receipts') return '修复 scene_card_receipts，确认每个场景的 delivered 字段、场景边界和 evidence 都能在对应场景正文中定位。'
  if (key === 'delivery_risk_receipts') return '修复 delivery_risk_receipts，确认上一章/批次残留风险的 required_action 已落成开篇承接、中段事件推进、读者回报或章末钩子证据。'
  if (key === 'asset_linkage') return '补齐资产挂钩证据，确认新资产、关键道具、能力、地点或势力已和角色目标、冲突代价、后续承诺或当前卷主线发生可见关系。'
  if (key === 'state_tracking') return '补齐状态跟踪证据，确认角色状态、物品状态、时间线、伏笔状态和关键资产状态已在正文与追踪记录中闭环。'
  if (key === 'chapter_handoff') return '补齐章首承接证据，确认 previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue 已在前300字或对应场景落成正文。'
  if (key === 'paragraph_hook') return '补齐段落级钩子，确认段落之间有信息推进、情绪变化或问题牵引。'
  if (key === 'suspense') return '补齐悬念编排，确认疑问、线索、遮蔽和揭示节奏形成持续牵引。'
  if (key === 'reversal') return '补齐反转设计，确认误导、证据链、认知翻转和后果落点成立。'
  if (key === 'showdown') return '补齐高潮对抗，确认目标、阻力、反制、代价和结果逐层升级。'
  if (key === 'opening') return '修复开篇设计，确认前300字抛出冲突、异常、目标或代价压力。'
  if (key === 'bridge_unit') return '补齐桥段节奏，确认过渡桥段也有事件推进、情绪换挡或信息变化。'
  if (key === 'continuity_heat') return '补齐连续性热度，确认前文承诺、keep_alive、未兑现风险和本章推进形成追读牵引。'
  if (key === 'conflict_structure') return '补齐冲突结构，确认目标、阻力、升级、代价和结果不是平铺事件流水。'
  if (key === 'upgrade_rhythm') return '补齐升级节奏，确认能力、地位、资源或关系收益有训练/限制/代价/验证过程。'
  if (key === 'target_reader') return '补齐目标读者契约，确认本章选择服务目标读者期待，而不是作者自我解释。'
  if (key === 'genre_positioning') return '校正题材定位，确认主类型承诺、爽点/情绪钩子和市场定位落到正文事件。'
  if (key === 'female_audience') return '补齐女频长篇体验，确认女性主体选择、关系张力、情绪推进和安全感/价值感回报可见。'
  if (key === 'plot_dynamics') return '补齐剧情动力，确认角色主动目标、阻碍反馈、选择压力和下一步推动力可见。'
  if (key === 'character_relation') return '修复角色关系线，确认关系中的利益、情绪、权力或信任状态发生可追踪变化。'
  if (key === 'reader_retention') return '补齐追读留存，确认章末问题、未兑现承诺、下一章期待和读者回报焦点成立。'
  if (key === 'core_contract') return '修复核心创作契约，确认本章兑现作品核心卖点、主角承诺、题材承诺和读者回报。'
  if (key === 'story_drive') return '补齐故事驱动力，确认角色主动目标、阻碍反馈、选择代价和下一步推动力可见。'
  if (key === 'character_arc') return '补齐人物弧光，确认角色认知、能力、关系或公众形象发生可追踪变化。'
  if (key === 'style_boundary') return '修复文风边界，确认样章节奏、声线约束、禁照搬边界和当前场景基调已经落成正文。'
  if (key === 'innovation') return '补齐创新执行，确认创新点不是设定说明，而是进入角色选择、冲突策略或爽点桥段。'
  if (key === 'runway') return '补齐连载航线，确认后续三章承诺、风险、钩子和可持续推进路径成立。'
  if (key === 'reader_expectation') return '补齐读者期待，确认章首承诺、章中加压、章尾悬念和下一章期待持续维护。'
  if (key === 'quality_audit') return '按质量诊断修复水段、空洞爽点、均匀节奏、设定堆叠和低效桥段，并复检。'
  if (key === 'beat_cooling') return '补齐冷却节奏，确认连续高压后有关系、信息、情绪或世界观换挡，不让冲突疲劳。'
  if (key === 'reader_payoff') return '补齐读者回报，确认本章承诺的爽点、情绪价值、信息揭示或关系推进已落成正文证据。'
  if (key === 'prose_craft') return '按 oh-story 正文工艺修复深度限知、身体细节、疏密分配、小节结构、新概念锚点和非胶水转场，并用正文证据复检。'
  if (key === 'punctuation_tone') return '按 oh-story 确定性收尾修复语气标点、破折号、省略号、横线、双连字符和高危 AI 句式，复检到 0 个残留。'
  if (key === 'payoff_setup') return '补齐爽点/打脸/揭露前的危机、期待和代价铺垫，确认出手前读者能指认可期待的 payoff。'
  if (key === 'spectator_reaction') return '补齐在场配角的差异化反应，让立场、信息差、利益受损和情绪变化各自可见。'
  if (key === 'prose_revision_receipt_sync') return '补齐 revision_receipts，逐条对应自检问题、修订动作和 changed_evidence。'
  if (key === 'deslop_repair_receipt_sync') return '补齐 deslop_repair_receipts，逐条证明 Gate A-G 去AI味修复后的正文证据。'
  if (key === 'quality_audit_repair_receipt_sync') return '补齐 quality_audit_repair_receipts，逐条证明质量诊断缺口已经修复并引用修订后正文。'
  if (key === 'revision_cascade_impact_sync') return '补齐 revision_receipts.cascade_impacts，说明修订对后续伏笔、时间线、角色状态、资产和关系边界的影响。'
  if (key === 'revision_scope_guard_sync') return '补齐 revision_scope_guard，说明修订字数变化、允许幅度、scope_warning 和原因，避免修订越界。'
  if (key === 'next_chapter_quality_plan_receipts') return '补齐 next_chapter_quality_plan_receipts，证明上一章质量续航计划已落成正文证据。'
  if (key === 'status_filter_receipts') return '补齐 status_filter_receipts，证明状态筛选只加载/只使用会影响本章正确性的状态。'
  if (key === 'write_preparation_receipts') return '补齐 write_preparation_checks，证明来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序已落成正文证据。'
  if (key === 'revision_context_receipts') return '补齐 revision_context_receipts，确认修订前后 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界都已对照并闭环。'
  return `按 ${check?.label || key || 'Step 3'} 复检结果修复未闭环项，并重新运行交付后质检。`
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

export function buildPostDeliveryQualityRepairTasks(chapter: any = {}, postDeliveryQuality: any = {}, sourceRunId?: number) {
  const chapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? 0) || null
  return (Array.isArray(postDeliveryQuality?.checks) ? postDeliveryQuality.checks : [])
    .filter((check: any) => String(check?.status || '') !== 'ok')
    .map((check: any, index: number) => {
      const key = String(check?.key || `check_${index + 1}`)
      const issueType = POST_DELIVERY_QUALITY_ISSUE_TYPES[key] || `${key}_gap`
      const label = compactText(check?.label || key, 40)
      const summary = compactText(check?.summary || `${label}未闭环。`, 240)
      const action = postDeliveryQualityRepairAction(check)
      return {
        task_id: `post-delivery-${chapter.id || chapterNo || 'chapter'}-${issueType}-${hashText(`${key}:${summary}`)}`,
        task_type: 'repair_quality',
        source: 'unattended_post_delivery_quality',
        issue_type: issueType,
        severity: String(check?.status || '') === 'warn' ? 'high' : 'medium',
        chapter_id: chapter.id || null,
        chapter_no: chapterNo,
        title: chapterNo ? `第${chapterNo}章${label}修复` : `${label}修复`,
        message: summary,
        action,
        task_status: 'open',
        annotation_category: key,
        annotation_source: 'oh_story_step_3',
        source_run_id: sourceRunId || null,
        post_delivery_quality: {
          source: postDeliveryQuality?.source || 'oh_story_step_3',
          status: postDeliveryQuality?.status || 'warn',
          score: postDeliveryQuality?.score ?? null,
          check,
        },
        acceptance_criteria: [
          `${label}复检状态为 ok。`,
          '重新运行当前章节交付后质检后，post_delivery_quality.checks 中该项不再为 warn/unknown。',
          '正文已入库；该任务可异步修订或同步，不阻塞无人值守下一章。',
        ],
      }
    })
    .slice(0, 20)
}

export function buildPostDeliveryQualityRepairFingerprint(sourceRun: any, chapter: any = {}, postDeliveryQuality: any = {}) {
  const tasks = buildPostDeliveryQualityRepairTasks(chapter, postDeliveryQuality, sourceRun?.id)
    .map((task: any) => {
      const check = task.post_delivery_quality?.check || {}
      return {
        issue_type: task.issue_type,
        severity: task.severity,
        message: task.message,
        action: task.action,
        annotation_category: task.annotation_category,
        acceptance_criteria: task.acceptance_criteria,
        check: {
          key: String(check.key || ''),
          label: compactText(check.label || '', 80),
          status: String(check.status || 'unknown'),
          summary: compactText(check.summary || '', 240),
          missed_count: Number(check.missed_count ?? check.missedCount ?? 0) || 0,
          evidence: compactRunStateValue(check.evidence || check.evidences || []),
          next_actions: compactRunStateValue(check.next_actions || check.nextActions || []),
          details: compactRunStateValue(check),
        },
      }
    })
    .sort((left: any, right: any) => stableStringify(left).localeCompare(stableStringify(right)))
  const warnings = compactWarningList(chapter.warnings)
    .map((warning: any) => typeof warning === 'string'
      ? { source: '', code: '', message: warning, details: null }
      : {
          source: String(warning?.source || ''),
          code: String(warning?.code || ''),
          message: compactText(warning?.message || warning?.summary || warning?.error || warning?.detail || '', 240),
          details: compactRunStateValue(warning?.details || warning?.detail || warning),
        })
    .sort((left: any, right: any) => stableStringify(left).localeCompare(stableStringify(right)))
  return `post-delivery-${hashText({
    source_run_id: Number(sourceRun?.id || 0) || null,
    chapter_id: Number(chapter.id || chapter.chapter_id || chapter.chapterId || 0) || null,
    chapter_no: Number(chapter.chapter_no ?? chapter.chapterNo ?? 0) || null,
    tasks,
    warnings,
  })}`
}

export function repairRunFingerprint(run: any = {}) {
  const output = parseJsonLikePayload(run.output_ref) || {}
  const input = parseJsonLikePayload(run.input_ref) || {}
  return String(output.repair_fingerprint || output.repairFingerprint || output.report?.repair_fingerprint || input.repair_fingerprint || input.repairFingerprint || '')
}

export async function appendPostDeliveryQualityRepairRun(
  appendRun: (workspace: string, data: any) => Promise<any>,
  activeWorkspace: string,
  projectId: number,
  sourceRun: any,
  chapter: any,
  postDeliveryQuality: any,
  repairFingerprint: string,
  existingRuns: any[] = [],
) {
  const tasks = buildPostDeliveryQualityRepairTasks(chapter, postDeliveryQuality, sourceRun?.id)
  if (!tasks.length) return null
  const existingRun = existingRuns.find(run => run?.run_type === 'longform_production_repair' && repairRunFingerprint(run) === repairFingerprint)
  if (existingRun) return { ...existingRun, repair_fingerprint: repairFingerprint, reused: true }
  const chapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? 0) || null
  return appendRun(activeWorkspace, {
    project_id: projectId,
    run_type: 'longform_production_repair',
    step_name: `post-delivery-quality-repair-${chapterNo || chapter.id || 'chapter'}-${tasks.length}`,
    status: 'ready',
    input_ref: JSON.stringify({
      source: 'unattended_post_delivery_quality',
      source_run_id: sourceRun?.id || null,
      chapter_id: chapter.id || null,
      chapter_no: chapterNo,
      repair_fingerprint: repairFingerprint,
    }),
    output_ref: runJson({
      repair_fingerprint: repairFingerprint,
      report: {
        source: 'unattended_post_delivery_quality',
        status: 'needs_repair',
        summary: `第${chapterNo || '?'}章 oh-story Step 3 交付后质检未闭环，已生成 ${tasks.length} 项修复任务。`,
        chapter_id: chapter.id || null,
        chapter_no: chapterNo,
        repair_fingerprint: repairFingerprint,
        checks: postDeliveryQuality?.checks || [],
      },
      tasks,
      source_run_id: sourceRun?.id || null,
    }),
  })
}
