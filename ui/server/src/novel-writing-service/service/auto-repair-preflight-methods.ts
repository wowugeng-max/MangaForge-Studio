import {
  createNovelCharacter,
  createNovelReview,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  listNovelChapters,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
} from '../../novel'
import {
  sceneBriefFromCard,
} from '../../novel-writing/scene-briefs'
import {
  buildUnattendedPreflightRepairReviewRecord,
} from '../../novel-writing/service-review-record'
import {
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  asArray,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  buildChapterBlueprintCausalChainContract,
} from '../quality/chapter-blueprint-execution'
import {
  buildMainlineDefinitionContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildChapterBlueprintBeatDensityContract,
  buildChapterBlueprintSmallOutlineContract,
  buildOutlineMethodsContract,
} from '../quality/outline-blueprint-contracts'
import {
  inferCharacterRepairTier,
  selectTierAwareCharacterRepairCandidates,
} from '../quality/paragraph-prose-context'
import {
  buildChapterPreDraftBrief,
} from '../quality/pre-draft-brief'
import {
  autoRepairSceneCardDramaticUnit,
  autoRepairSceneCardsForPreflight,
  autoRepairStateTrackingSourceReadiness,
  mergeFinalBenchmarkRecallBriefAliases,
  mergeFinalRepairPreDraftRawPayload,
  repairBenchmarkRecallSourcePathState,
} from '../quality/preflight-auto-repair'
import {
  applySourceReadinessPreflightChecks,
  buildStateTrackingContract,
  mergeFinalStateTrackingContract,
  mergeStoredStateTrackingContractAliases,
} from '../quality/state-tracking-contracts'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  buildWritePreparationBrief,
} from '../quality/write-preparation-contracts'
import {
  buildHeuristicSettingUsage,
  isAbortError,
  throwIfAborted,
} from './runtime-helpers'

import {
  runAutoRepairPreflightMaterials,
} from './auto-repair-preflight-materials'

export function createAutoRepairChapterPreflightMethods(deps: {
  executeAgent: (...args: any[]) => any
  generateSceneCardsForChapter: (...args: any[]) => any
  buildChapterContextPackage: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const buildChapterContextPackage = deps.buildChapterContextPackage

const autoRepairChapterPreflightGaps = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, modelId?: number, options: any = {}) => {
  const persist = options.persist !== false
  const checks = Array.isArray(contextPackage?.preflight?.checks) ? contextPackage.preflight.checks : []
  const blockers = asArray(contextPackage?.preflight?.blockers)
  const warnings = asArray(contextPackage?.preflight?.warnings)
  const warningCorpus = [
    ...checks.filter((item: any) => !item.ok).map((item: any) => `${item.key || ''} ${item.label || ''} ${item.fix || ''} ${item.evidence || ''}`),
    ...blockers.map((item: any) => `${item?.key || ''} ${item?.label || ''} ${item?.fix || ''} ${item?.evidence || ''} ${item || ''}`),
    ...warnings.map((item: any) => String(item || '')),
  ].join('；')
  const missingKeys = Array.from(new Set([
    ...checks.filter((item: any) => !item.ok).map((item: any) => String(item.key || '')).filter(Boolean),
    ...blockers.map((item: any) => String(item?.key || '')).filter(Boolean),
    ...(/蓝图|细纲|target_emotion|人物出场|character_order|opening_hook|core_payoff/.test(warningCorpus) ? ['chapter_blueprint', 'source_readiness_chapter_blueprint'] : []),
    ...(/source_paths_missing|文风召回|benchmark_recall|style_sample|样章/.test(warningCorpus) ? ['benchmark_recall_source_paths', 'benchmark_recall_gate'] : []),
    ...(/追踪\/?时间线|timeline_tracking|时间线\.md/.test(warningCorpus) ? ['source_readiness_timeline_tracking'] : []),
    ...(/场景卡|scene_card|goal_obstacle/.test(warningCorpus) ? ['scene_cards', 'source_readiness_scene_card_goal_obstacle_change'] : []),
  ].filter(Boolean)))
  const repaired: any[] = []
  const errors: string[] = []
  const stagedChapterPatch: any = {}
  const stagedWorldbuildingCreates: any[] = []
  const stagedCharacterCreates: any[] = []
  const stagedSettingCreates: any[] = []
  let stagedUsageReplacement: any[] | null = null
  const stagedReviews: any[] = []
  let nextTemporaryId = -1
  const applyStagedChapterPatch = (patch: any) => {
    const rawPayload = patch?.raw_payload === undefined ? chapter.raw_payload : {
      ...(chapter.raw_payload || {}),
      ...(patch.raw_payload || {}),
    }
    Object.assign(stagedChapterPatch, patch, patch?.raw_payload === undefined ? {} : {
      raw_payload: { ...(stagedChapterPatch.raw_payload || {}), ...(patch.raw_payload || {}) },
    })
    chapter = { ...chapter, ...patch, raw_payload: rawPayload }
    return chapter
  }
  if (!missingKeys.length) return { ok: true, missing_keys: missingKeys, repaired, errors, chapter, chapter_patch: stagedChapterPatch, staged_worldbuilding_creates: stagedWorldbuildingCreates, staged_character_creates: stagedCharacterCreates, staged_setting_creates: stagedSettingCreates, staged_usage_replacement: stagedUsageReplacement, staged_reviews: stagedReviews, staged: !persist }

  const [chapters, worldbuilding, characters, outlines, settings, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, project.id),
    listNovelWorldbuilding(activeWorkspace, project.id),
    listNovelCharacters(activeWorkspace, project.id),
    listNovelOutlines(activeWorkspace, project.id),
    listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
    listNovelReviews(activeWorkspace, project.id),
  ])
  const needsChapterBlueprint = missingKeys.includes('chapter_blueprint')
    || missingKeys.includes('chapter_conflict')
    || missingKeys.includes('ending_hook')
    || missingKeys.includes('plot_points')
    || missingKeys.includes('scene_cards')
    || missingKeys.includes('source_readiness_chapter_blueprint')
    || missingKeys.includes('source_readiness_context_tracking')
    || missingKeys.includes('source_readiness_timeline_tracking')
    || missingKeys.includes('source_readiness_scene_card_goal_obstacle_change')
    || missingKeys.includes('benchmark_recall_source_paths')
    || chapter.raw_payload?.unattended_goal?.needs_agent_completion === true
  const needsSceneCards = missingKeys.includes('scene_cards')
    || missingKeys.includes('source_readiness_scene_card_goal_obstacle_change')
    || !asArray(chapter.scene_list || chapter.sceneList || chapter.scene_breakdown || chapter.sceneBreakdown).length
  const needsWorldbuilding = missingKeys.includes('worldbuilding') || worldbuilding.length === 0
  const needsCharacters = missingKeys.includes('characters') || missingKeys.includes('character_state') || missingKeys.includes('no_repeat')
  const needsSettings = missingKeys.includes('setting_workshop') || settings.length === 0

  if (needsChapterBlueprint) {
    let payload: any = {}
    if (modelId) {
      try {
        throwIfAborted(options)
        const result = await executeAgent('outline-agent', project, {
          task: [
            '任务：为无人值守章节写作补齐本章蓝图。只输出 JSON，不写正文。',
            '输出字段：title, chapter_goal, chapter_summary, conflict, ending_hook, chapter_blueprint, emotional_arc_contract, chapter_hook_contract, paragraph_hook_contract, opening_contract, suspense_contract, reversal_contract, showdown_contract, bridge_unit_contract, plot_framework_contract, style_boundary_contract, plot_dynamics_contract, story_power_contract, mainline_definition_contract, information_flow_contract, expectation_threshold_contract, story_loop_contract, prose_craft_contract, punctuation_tone_contract, quality_audit_contract, dialogue_contract, continuity_heat_contract, character_relation_contract, character_behavior_contract, asset_linkage_contract, state_tracking_contract, intent_confirmation_contract, target_reader_contract, genre_positioning_contract, core_contract_radar, female_audience_contract, upgrade_rhythm_contract, conflict_structure_contract, must_advance(array), forbidden_repeats(array), repair_summary。',
            'chapter_blueprint 必须包含 target_emotion, opening_hook, core_payoff, content_outline(cause/development/turn/climax/ending), outline_methods_contract(five_step_outline/eight_node_story_structure/sweet_cycle_stages/emotion_zigzag_stages/five_drive_checks/detail_outline_rules/similarity_guardrails/reverse_design_rules/quality_checks), small_outline_contract(steps/purpose_effect_rules/detail_rules/locator_rules/segment_cards), mainline_definition_contract(mainline_event/definition_rules/action_rules/handoff_rules/forbidden_mainline_shapes/quality_checks), causal_chain_contract(act_order/act_functions/quality_checks), plot_lines(mainline/subplot/event_line/relationship_line/logic_line), character_order, beat_sequence, beat_density_contract, cost_and_reward, ending_contract(final_state/unresolved_question/next_chapter_pull)；大纲方法合同 outline_methods_contract 必须按 oh-story outline-methods 输出五步大纲创建法、八节点故事结构、爽文五阶段小循环、情绪拉扯五折线、五项驱动检查、细纲:正文 = 1:2.5~1:3、相同金手指逻辑禁止连续使用、爽点倒推和同一套路间隔至少 3 个不同剧情类型；small_outline_contract 必须按 oh-story 小纲四步法输出分段判断、目的和效果、详写/略写、快速定位，segment_cards 每项包含 segment_no,segment,purpose,intended_effect,detail_level,quick_locator；mainline_definition_contract 必须按 oh-story 主线定义输出主线不等于升级、主线是一件事、升级是主角达成目标的行动、不是一个元素和主线完成后的承接规则；causal_chain_contract 必须按 oh-story 五幕式输出种子/生长/转折/冲刺/完成，要求不能跳步、不能乱序；beat_sequence 每项必须包含 beat_no/scene_no/action/function_tag/payoff，function_tag 必须决定展开还是带过，关键揭露/打脸/高潮/爽点必须展开，过渡/赶路/信息交代必须压缩。',
            '情绪弧合同 emotional_arc_contract 必须按 oh-story 情绪弧与 emotional-methods/plot-emotion-system 输出 arc_shape, emotion_formula, pressure_methods, payoff_types, payoff_reverse_design, payoff_tier_rules, payoff_density_rules, emotion_module_recomposition_rules, payoff_escalation_rules, progressive_confrontation_rules, meme_plot_formula_rules, reader_desire_formula_rules, scene_execution_rules, expectation_rules, safety_rules, bonding_setup_rules, emotional_tear_rules, lingering_aftertaste_rules, emotional_turning_rules, emotional_rhythm_curve_rules, genre_emotion_strategy_rules, first_impression_rules, peak_end_rules, emotion_layer_rules, reaction_structure_rules, ideological_conflict_rules, failure_mode_guards, quality_checks，明确本章如何完成平静 -> 调动 -> 释放 -> 爽、爽点倒推法（先定爽点类型 -> 再定期待点 -> 最后倒推铺垫，正文按铺垫 -> 期待升高 -> 爽点释放呈现）、场景情绪执行（每个场景标注调动/复现/释放/后反应，闭环当前期待时开启下一开环）、装逼层级（日常小装逼/核心爽点/偏离爽点）、多爽点密度（不要拉长单个爽点铺垫，800-1200 字内要有信息增量/能力展示/危机反制/关系变化/小回收）、情绪拉扯曲线（温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击；不是所有故事都走完整曲线，按本章需要截取）、题材情感策略（世情/爽文、情感/虐心、古言/复仇、悬疑/推理、年代/亲情分别匹配解气、余韵、因果报应、信息差、代际遗憾）、先入为主（前100字先给核心矛盾/主角处境/不公平异常，注意否定提前）、峰终定律（结尾情绪必须高于起点，结尾情绪强度虐≥8、爽≥7、治愈≥6，最后一击必须是动作/对话/画面）、三层情绪（角色自己的情绪、文本传递的情绪、读者实际感受分离，角色在哭不等于读者哭，必须转成读者收益）、情绪反应结构（前反应 -> 复现 -> 后反应；以小搏大 -> 士气如虹）、理念矛盾（理念之争比利益之争更能引发深层共鸣，把原则碰撞、追求和牺牲落成具体选择与代价）、情绪模块重组（戏剧性会磨损，情绪不会磨损；复用套路必须换场景/换对手/加新情绪或提高 stakes/奖励复杂度）、递进对抗（角力而非碾压、主角小胜、对手加码、最后王炸）、梗四段式（发生 -> 发展 -> 转折 -> 高潮）、读者欲望四步公式（生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿）、情绪三板斧（羁绊铺设/情感撕裂/余韵钝痛）和每 3-5 个小节的事件触发情绪转向，并让连续爽点按影响范围、揭示深度或身份落差递增。',
            '章级钩子合同 chapter_hook_contract 必须按 oh-story 章首/章尾钩子输出 opening_hook_type, ending_hook_type, hook_strength, opening_hook_rules, ending_hook_rules, forbidden_patterns, quality_checks，明确前 100-300 字和最后 300 字如何制造追读。',
            '段落级钩子合同 paragraph_hook_contract 必须按 oh-story 段落级钩子输出 micro_hook_types, hook_combinations, dialogue_escalation, spectator_layers, forbidden_patterns, quality_checks，明确本章每 3-5 段如何制造信息、风险、情绪或关系变化。',
            '开篇合同 opening_contract 必须按 oh-story 开篇检查输出 protagonist_entry, first_100_char_hook, event_density, body_anchor, five_essentials_rules, forbidden_opening_patterns, quality_checks；five_essentials_rules 必须包含开头五要诀“简单/不偏/快/爽/不平”，确保开篇不是风景/醒来/解释起手。',
            '悬念合同 suspense_contract 必须按 oh-story 悬念检查输出 suspense_type, threat, delay_plan, payoff_distance, false_alarm_guardrails, information_order_templates, suspense_strength, suspense_cycle, trigger_layers, expectation_layers, expectation_chain, multi_line_suspense_rules, reader_preknowledge_rules, information_gap_rules, trump_card_preposition_rules, foreshadowing_boundary_rules, shock_layers, quality_checks，确保威胁有代价、有延迟、有兑现路径；multi_line_suspense_rules 必须包含短弧2-3章、中弧5-8章、长弧整卷和至少两条悬念线运行；reader_preknowledge_rules 必须包含读者预知法和读者知道但主角不知道；information_gap_rules 必须包含信息差运用和信息差抹平时爽点爆发；trump_card_preposition_rules 必须包含底牌前置法、先展示主角底牌、底牌 + 即将发生的冲突；foreshadowing_boundary_rules 必须包含“伏笔不是谜语人”、短期紧张用悬念、长期线索用伏笔、信息延迟超过3章且中间无推进时提前给或删除、伏笔自然融入动作/物件/误判/环境回声。',
            '反转合同 reversal_contract 必须按 oh-story 反转检查输出 reversal_type, setup_clues, misdirection, reveal_timing, emotional_impact, cheat_guardrails, quality_checks，确保反转有铺垫、不靠天降新信息。',
            '高潮对抗合同 showdown_contract 必须按 oh-story style-combat-face / hooks-suspense / plot-frameworks 输出 payoff_release_rules, trump_card_reserve_rules, invincible_protagonist_rules, three_pressure_shock_rules, stage_chain_rules, transmission_channel_rules, shock_chain_rules, combat_design_rules, weak_over_strong_rules, counterplay_layers, emotion_rhythm_rules, revision_priorities, quality_checks；payoff_release_rules 必须包含爽点释放和“反派就要受到对应的压制”，trump_card_reserve_rules 必须包含底牌管理、手里保持2-3个未揭示底牌、每次只出1个、出牌后获得新技能/新后手/新目标，invincible_protagonist_rules 必须包含“主角登场即杀伐果断”、战力前置无敌、主角登场时一点都不能拖拉、不一击必杀时必须有明确理由，three_pressure_shock_rules 必须包含三压一爆三震、友好势力、敌方势力、中立势力、一爆碾压和三方震动，stage_chain_rules 必须包含“群众层 -> 中间层 -> 核心层”，transmission_channel_rules 必须包含“装逼前必须先铺设人际关系，否则没有传递通道”和爽点释放后改变态度/利益/声望/规则评价，shock_chain_rules 必须包含震惊分层基于自身利益和目标，combat_design_rules 必须包含“打斗是一场表演”，counterplay_layers 必须包含“预判反制”和“反预判”，emotion_rhythm_rules 必须包含“急 -> 缓 -> 急”。',
            '桥段节奏合同 bridge_unit_contract 必须按 oh-story outline-rhythm / commercial-core-methods 输出 bridge_position, bridge_unit_plan, four_chapter_roles, expectation_chain_rules, climax_duration_rules, transition_rules, fatigue_repair_rules, revision_priorities, quality_checks；four_chapter_roles 必须包含“四章一桥段”和“结尾必须让主角开始装”，expectation_chain_rules 必须包含“高潮中埋钩子”，transition_rules 必须包含“连续小期待”，fatigue_repair_rules 必须包含“连续 2 章没有目标推进”。',
            '剧情框架合同 plot_framework_contract 必须按 oh-story plot-frameworks 输出 genre_framework_route, selected_frameworks, stage_ownership(creation/outline/scene_card/prose/revision), rpg_reward_loop, faction_hand_framework, double_line_info_gap_rules, routine_variation_rules, large_structure_rules, six_act_story_rules, global_no_collapse_checks, quality_checks；必须包含题材→框架路由、RPG结构与奖励设计、框架与阵营手牌法、套路模板重复法、五不崩，并说明本章如何把题材框架落到场景卡和正文自检。',
            '文风覆盖边界合同 style_boundary_contract 必须按 oh-story style-profile-protocol 输出 style_override_rules, hard_constraints, copy_boundary_rules, conflict_resolution_rules, revision_priorities, quality_checks；hard_constraints 必须包含“硬约束永远赢”、禁用词、Gate F、万能比喻、章末预告、字数下限、剧情/状态/时间线不漂移；copy_boundary_rules 必须包含不得复制样章桥段。',
            '核心商业雷达 core_contract_radar 必须按 oh-story commercial-core-methods 输出 must_serve, no_drift, theme_unity_rules, selling_point_execution_rules, repetition_strategy_rules, commercial_rhythm_rules, goldfinger_structure_rules, launch_pressure_rules, repair_focus, checks；selling_point_execution_rules 必须包含卖点四步法、发现比告知爽十倍和开头暗示 -> 中间深化 -> 高潮爆发；repetition_strategy_rules 必须包含重复点和同一卖点至少延展 3 个角度；commercial_rhythm_rules 必须包含追踪/上下文.md、最近3章、连续 2 章没有目标推进/阻碍升级/新信息和大高潮 7-10 天；goldfinger_structure_rules 必须包含金手指可替换故事流程中的任一环节、简单一眼就懂和系统限制；launch_pressure_rules 必须包含开篇 300-500字内交代处境、危险来源和破局希望，以及优先用环境型压力开局。',
            '剧情动力合同 plot_dynamics_contract 必须按 oh-story 剧情核心方法输出 goal, obstacle, action, cost_feedback, next_expectation, drive_mode_rules, line_stagger_rules, quality_checks，确保目标→阻碍→行动→代价/反馈→新期待闭环；drive_mode_rules 必须包含事件驱动/情感驱动/混合模式选择：番茄爽文/打脸文每章给外部结果（赢、升级、对手栽），追妻/虐心/世情持续人物心结，混合模式主线事件推进并每 3-5 章插情感停顿；并让主线和支线错开节奏推进，不能同时爆完或同时空转。',
            '故事力合同 story_power_contract 必须按 oh-story 剧情核心方法输出 story_power_dimensions, chapter_power_loop, action_rules, beginning_end_rules, causal_feedback_rules, quality_checks，确保故事五维、有动作才是故事、有始有终、因果反馈和行动改变局势都能进入正文门禁。',
            '主线定义合同 mainline_definition_contract 必须按 oh-story 剧情核心方法输出 mainline_event, definition_rules, action_rules, handoff_rules, forbidden_mainline_shapes, quality_checks，确保主线不等于升级、主线是一件事、升级只是达成目标的行动。',
            '信息流合同 information_flow_contract 必须输出 scene_information_units, reveal_order, suspense_responses, transition_compression_rules, next_objective_rules, no_infodump_guardrails, quality_checks，确保信息随冲突释放，不写背景说明书；transition_compression_rules 必须包含过渡不是填充、没有信息量就删掉、纯移动/寒暄/环境描写直接跳过或压缩；next_objective_rules 必须包含每次实力/身份/资源/阶段性目标提升后立即引入新的挑战、目标、代价或更高门槛。',
            '期待阈值合同 expectation_threshold_contract 必须输出 current_expectations, payoff_or_delay_plan, next_open_loop, vacuum_guardrails, expectation_before_payoff_rules, expectation_relay_rules, three_expectation_lines, quality_checks；expectation_before_payoff_rules 必须包含期待感 > 爽点、铺垫篇幅不少于释放篇幅和延迟满足；expectation_relay_rules 必须包含期待接力法、旧期待闭环前下一开环已经运行、当一层即将满足时先铺好下一层期待、至少两条期待线并行运行；确保兑现旧期待前先种下新期待，并保持剧情期待 + 主题甜头 + 新鲜感三线并存。',
            '故事循环合同 story_loop_contract 必须输出 setup, escalation, payoff, carry_over, map_transition_rules, nested_loop_rules, quality_checks，确保本章不是孤立事件而是长线循环的一环；map_transition_rules 必须包含旧地图核心冲突阶段性解决、新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突、前5章建立代入感和期待感、保留贯穿主线、人际关系动了 -> 主角再动、避免旧线全抛和新设定一次性倒出；nested_loop_rules 必须包含“小循环 -> 中循环 -> 大循环”、小循环中必须铺垫大循环的期待，以及同一核心卖点的不同角度/不同矛盾。',
            '正文工艺合同 prose_craft_contract：正文工艺短口径，必须输出 pov_rules, expression_rules/body_detail_rules, scene_weaving_rules, subject_name_rhythm_rules, indirect_description_rules, three_camera_rules, then_what_rules, core_emotion_alignment_rules, baimiao_sensory_rules, dynamic_description_rules, shot_rhythm_rules, transition_bridge_rules, rhythm_rules, object_number_rules, section_structure_rules, section_density_rules, anti_padding_rules, concept_anchor_rules, description_limits, anti_ai_smell_rules, quality_checks；subject_name_rhythm_rules=主语与名字节奏，段首/场景切换/多人同场/视角重置点名，段中代词/省略/动作承接，避免每句报名字和指代不清；indirect_description_rules=间接描写法，正面描写只是铺垫，侧面反应才是爽点，不要直接宣布，用配角动作/围观者判断/对手失态/环境变化证明；three_camera_rules=三机位法，机位1主角近景，机位2外部反应/环境变化，机位3必要设定，设定都由冲突引出；then_what_rules=“然后呢”基点法，每一段文字接动作/发现/反应/选择/风险；core_emotion_alignment_rules=围绕核心情绪设计全部情节，情节/人设/冲突/细节服务目标读者核心情绪，宏观把控整体节奏，微观控细节；baimiao_sensory_rules=白描、两到三种感官，五感必须服务情绪；dynamic_description_rules=动态描写优于静态描写，动作和反应展现，角色行动中穿插点染；shot_rhythm_rules=镜头与分镜思维，远景/中景/近景/特写，短句、短段、密集动作；transition_bridge_rules=场景切换与转场，相似物/相似五感/相似情绪，时间跳转用动作或物件衔接，空间跳转用声音或光影衔接；section_structure_rules=一个主事件、3-5 个子事件、一个情绪变化、一条读者新获知的信息、3-5 轮对话交锋、小节结尾钩子、下一节开头快速接续和情绪跨节递进；section_density_rules=小节密度诊断；anti_padding_rules=禁止凑字数环境描写/重复情绪/内心独白总结/无意义动作；concept_anchor_rules=新名词/新设定首次出现有动作反应、对话半句或物理后果；description_limits=水分控制，删掉这段后读者会不会困惑；anti_ai_smell_rules=高危词、章末总结体、叠加式描写、心理告知和模板表达清理。',
            '语气标点合同 punctuation_tone_contract 必须输出 tone_targets, punctuation_rules, dialogue_pause_rules, forbidden_punctuation_patterns, quality_checks，确保标点服务语气和人物声线。',
            '质量诊断合同 quality_audit_contract 必须输出 audit_dimensions, chapter_purpose_rules, water_detection_rules, event_content_rules, score_thresholds, required_receipts, quality_checks；chapter_purpose_rules 必须包含每章一句话概括内容，并标注目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）；event_content_rules 必须包含事件内容比重不能小于一半、事件是价值改变的契机、设定尽量通过事件演绎而非旁白强塞，确保交稿自检可诊断结构、吸引力、目的跑偏、水文和事件含量问题。',
            '对白合同 dialogue_contract 必须按 oh-story dialogue-mastery 输出 scene_modes, voice_anchors, dialogue_goals, key_lines, relationship_moves, dialogue_execution_checklist, mode_playbooks, power_length_rules, subtext_agenda_rules, tone_context_rules, emotion_push_rules, emotion_continuity_rules, dialogue_drive_rules, information_embed_rules, information_tension_rules, voice_differentiation_rules, spectator_dialogue_rules, supporting_speaker_limit_rules, dialogue_rhythm_rules, dialogue_volume_rules, dialogue_meme_rules, dialogue_audit_rules, revision_priorities, quality_checks；dialogue_execution_checklist 必须逐场输出 scene_no, scene, mode, speaker_agendas, line_functions, emotion_flow, information_strategy, voice_differentiation, forbidden_patterns, receipt_keys，确保场景卡里的对白要求能被正文和 dialogue_checks 逐场验收；power_length_rules 必须包含“掌控者/主角亮底牌时对白 ≤ 10 字”和“被压制方对白 ≥ 20 字”；subtext_agenda_rules 必须包含“真实动机绝对不能浅显地写在台词里”，tone_context_rules 必须包含“关系 × 场合 × 目的 = 语气”，emotion_push_rules 必须包含“命令式+否定式最能激发读者情绪”，emotion_continuity_rules 必须要求每次情绪转变有事件触发，dialogue_drive_rules 必须要求对白强化期待、爽感或悬念，information_embed_rules 必须包含“用角色的语气和立场包裹信息”，information_tension_rules 必须要求通过质疑、证据和核心信息兑现形成拉扯，voice_differentiation_rules 必须包含口癖和惯用语、说话节奏、信息偏好、身份影响措辞、性格影响语气和关系阶段不同，spectator_dialogue_rules 必须包含普通人震惊、专业人士分析、特殊身份者反应、短小精悍和不代替主线，supporting_speaker_limit_rules 必须包含“同一场景配角不超过 3 个有台词”“没有功能的角色不要出场”和“配角退场要主动规划”，dialogue_rhythm_rules 必须包含连续多轮对话后需要换气、穿插动作描写、紧张段落对话短促、关键信息放对话开头或结尾，dialogue_volume_rules 必须包含读者已知信息、叙事一句话概括、突发状况替代、主角旁白平铺直叙和新人物必须安排主线戏份，dialogue_meme_rules 必须包含说不出来但意思到了、梗或骚话、强化记忆点、高潮点和不得直接复刻，dialogue_audit_rules 必须包含大量信息都必须用对话来展示、问答式的一问一答、依赖对话来推动剧情或人物变化、遮住角色名后能否区分、单次对话不超过全节 40%、自然口语交流和对话结尾能否预示接下来的节奏变化，确保对白推进剧情、增加期待或展示人设，而不是说明书。',
            '连续性热度合同 continuity_heat_contract 必须按 oh-story 连续性追踪输出 heat_states, active_expectations, watch_items, dormant_allowed, revision_priorities, quality_checks，确保 hot/warm/cold/archived 元素都有处理理由。',
            '角色关系合同 character_relation_contract 必须按 oh-story 角色关系输出 relationship_types, important_relationships, independent_goals, goal_ownership_rules, relationship_life_rules, expectation_hub_rules, buffer_zone_rules, tests_or_pressure, attitude_shifts, quality_checks，确保关系变化有类型、压力、行动、配角期待枢纽、配角攻略缓冲区和正文证据；goal_ownership_rules 必须包含主角目标必须属于自己的、不能只是帮别人实现目标、主角必须保留自己的诉求/主动选择/代价；relationship_life_rules 必须包含角色生命中有恋爱之外的内容、不是单薄的情感工具人、关系角色还要有事业/责任/资源/身份/风险/行动线；expectation_hub_rules 必须包含配角期待枢纽/人物扣、任务基地、短期和长期期待、主角解决事件后开启新一轮装逼/新任务/新剧情，以及人物下线时用更大好处转化损失厌恶；buffer_zone_rules 必须包含配角攻略缓冲区、信息差、地位差距、亲密度差距或信任程度，配角不能像 NPC 一样站着等主角触发，并在关键拐点写清配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。',
            '角色行为合同 character_behavior_contract 必须按 oh-story 角色行为输出 motivation_chain, motivation_specificity_rules, layered_tags, behavior_rules, protagonist_composure_rules, strong_association_rules, memory_anchors, supporting_role_functions, role_card_requirements, supporting_role_exit_rules, behavior_repeat_rules, character_driven_event_rules, protagonist_red_line_rules, identity_goldfinger_alignment_rules, antagonist_logic, antagonist_weight_rules, antagonist_self_story_rules, antagonist_tier_exit_rules, quality_checks，确保角色行为由动机链驱动；role_card_requirements 必须包含角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作；supporting_role_exit_rules 必须包含配角功能、与主角关系、核心特质、标志性特征、退场方式和同一场景配角不超过 3 个有台词；behavior_repeat_rules 必须包含行为重复点和不同场景重复；character_driven_event_rules 必须包含人推事件、从人物动机找方向和不要硬编剧情；protagonist_red_line_rules 必须包含圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃；identity_goldfinger_alignment_rules 必须包含社会身份、身世、金手指、性格高度统一；motivation_specificity_rules 必须包含起因必须具体、不能写“被欺负”这种模糊说法、动机必须是情感层面、不能写“要成为最强”这种空话、动机演变有铺垫；protagonist_composure_rules 必须包含升级线与主角反应线分开管理、升级提升实力但不自动改变从容反应、面对低级挑衅不被牵着走、用轻描淡写/短句/行动压制替代暴怒失态；strong_association_rules 必须包含每个重要角色至少 3 个强关联设定、强关联直接影响剧情走向/核心梗装逼爽点/人物碰撞、弱关联不喧宾夺主；antagonist_weight_rules 必须包含反派建立四要素、实力展示、动机可信、真实威胁和终极意图时机；antagonist_self_story_rules 必须包含反派也有梦想、在反派眼中他是自己故事的主人公、旧痛/创伤、优势即致命缺陷和理念冲突；antagonist_tier_exit_rules 必须包含反派层级表、篇幅与层级匹配、小反派、中等反派、大弧 Boss、最终 Boss、退场方式和最终Boss从第一章就有伏笔。',
            '资产挂钩合同 asset_linkage_contract 必须按 oh-story 资产协议输出 key_assets, linkage_plan, usage_rules, three_appearance_plan, prop_ability_expectation_rules, state_tracking, quality_checks，确保孤立资产挂到冲突、状态和回报上；prop_ability_expectation_rules 必须包含道具能力展示的8步期待模板：宝物功能强大、配角误判鸡肋、宝物恰好克制反派、他人失败、主角方案、众人不看好、鸡肋成神器和新钩子。',
            '状态跟踪合同 state_tracking_contract 必须按 oh-story state-tracking 输出 character_states, historical_causality, world_constraints, source_requirements, source_readiness, filter_rules, quality_checks，确保写正文前只保留会影响本章正确性的状态。',
            '意图确认合同 intent_confirmation_contract 必须按 oh-story workflow-daily 输出 confirmed_intent, rhythm_and_style, structure_inputs, logic_line, appearance_order, cost_and_reward, ending_handoff, quality_checks，确保正文按本章意图统一发力。',
            '目标读者合同 target_reader_contract 必须按 oh-story 自嗨判定法和 genre-readers 输出 reader_profile, reader_desires, chapter_attractions, genre_vitality_rules, platform_fit_rules, boundary_fit_rules, title_blurb_alignment_rules, immersion_plasticity_rules, goldfinger_life_fit_rules, commercial_expression_rules, validation_questions, correction_methods, quality_checks，确保本章清楚写给谁、满足什么阅读欲望、用当前目标平台样本验证题材生命力、校准平台写法、守住题材边界、做到书名简介内容三位一体、避免代入感/塑料感断裂、让金手指贴住生活/职业并给出可感知回报。',
            '题材定位合同 genre_positioning_contract 必须按 oh-story 题材定位输出 genre_label, reader_psychology, genre_formula, core_hook_rules, goldfinger_fit_rules, must_have_scenes, platform_fit_rules, micro_innovation_rules, micro_innovation_702010_rules, micro_innovation_methods, longboard_focus_rules, quality_checks，确保题材承诺和正文场景一致；micro_innovation_702010_rules 必须包含“70%来自过去经历和记忆”“20%来自当前生活状态”“10%来自时事热点话题和趋势”；micro_innovation_methods 必须包含精炼法、升级法、加料法、反套路法和组合法；longboard_focus_rules 必须包含“拉长板而非补短板”、题材长板、核心卖点背后的情绪清晰、同一卖点至少 3 个角度和不得稀释核心卖点。',
            '女频长篇合同 female_audience_contract 必须在项目为女频/女生频道/女主导向时按 oh-story female-audience-writing 输出 audience_mode, core_principles, reader_need_rules, copy_promise_rules, longform_genre_rules, romance_axis_rules, abuse_dosage_rules, platform_fit_rules, revision_priorities, quality_checks；core_principles 必须包含安全感优先、代入感优先、女主主动性、情绪即产品；reader_need_rules 必须包含被认可、被珍视、被尊重；romance_axis_rules 必须包含感情线双轴和感情升级踩在事业/成长节点；abuse_dosage_rules 必须包含每段虐后必给反转或糖，避免连续整卷只虐；platform_fit_rules 必须按番茄女生/起点女生/晋江/七猫校准安全感密度和节奏；quality_checks 必须包含货板一致。',
            '升级节奏合同 upgrade_rhythm_contract 必须按 oh-story 升级感三步法输出 upgrade_gap, upgrade_gain_plan, feedback_loop, emotion_modules, bridge_rhythm, ranking_ladder_rules, goldfinger_feedback_rules, goldfinger_simplicity_rules, goldfinger_multi_dimension_growth_rules, quality_checks，确保升级前缺口、升级后变化和即时/延迟反馈都可见；ranking_ladder_rules 必须包含“排行榜提供升级动力”、通过排行榜介绍新对手和榜单出现后要有装逼余震；goldfinger_feedback_rules 必须包含“给出金手指后必须有即时变化”、“把金手指带来变化的过程掺杂在故事里”、金手指契合主角当前职业/身份/生活困境，以及金手指不能替代全部行动链；goldfinger_simplicity_rules 必须包含“金手指简单是核心”和“一眼就懂”，并要求功能、触发条件、奖励反馈和升级规则清晰；goldfinger_multi_dimension_growth_rules 必须包含“金手指提升要有多维度”、词条、功能、品质和条件-反馈模型，避免只剩品质/数值单线提升。',
            '冲突结构合同 conflict_structure_contract 必须按 oh-story 矛盾与结构设计输出 conflict_ladder, motivation_sources, antagonist_pressure_rules, protagonist_agency_rules, event_value_changes, next_conflict_seeds, conflict_network_layers, no_exit_rules, quality_checks，确保每个主要场景都有明确阻力、胜负变化、下一冲突种子和有进无出；conflict_network_layers 必须包含 vertical_conflict, horizontal_conflict, cross_conflict, weaving_order，按定地图→定阵营→定角色编织纵向/横向/交叉三层矛盾；no_exit_rules 必须包含主角非踏入不可、死亡赌注/退出代价、黏结剂（杀人理由/工作职责/道德责任/实体场所）和对立双方无法轻易脱身。',
            '要求：蓝图必须承接上一章状态，服务长线主线；不要用“推进本章核心冲突”这类占位句。',
            JSON.stringify({
              project: { title: project.title, genre: project.genre, synopsis: project.synopsis, story_state: project.reference_config?.story_state || {} },
              chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
              recent_chapters: chapters.filter(item => item.chapter_no <= chapter.chapter_no).slice(-6).map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook, has_text: Boolean(item.chapter_text) })),
              relevant_outlines: outlines.slice(0, 80).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook, conflict_points: item.conflict_points })),
              preflight_warnings: contextPackage?.preflight?.warnings || [],
            }, null, 2).slice(0, 12000),
          ].join('\n'),
        }, {
          activeWorkspace,
          modelId: String(modelId),
          maxTokens: 6800,
          temperature: 0.35,
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
        payload = getNovelPayload(result)
      } catch (error) {
        if (isAbortError(error)) throw error
        errors.push(`章节蓝图补齐失败：${String(error).slice(0, 200)}`)
      }
    }
    const matchedOutline = outlines
      .filter(item => String(item.outline_type || '') === 'chapter')
      .find(item => String(item.title || '').includes(String(chapter.chapter_no)) || Number(item.raw_payload?.chapter_no || 0) === Number(chapter.chapter_no))
    const fallbackGoal = compactBriefText(chapter.chapter_goal || matchedOutline?.summary || project.synopsis || `第${chapter.chapter_no}章必须承接上一章状态，推进主线冲突并留下下一章追读问题。`)
    const fallbackConflict = compactBriefText(chapter.conflict || asArray(matchedOutline?.conflict_points)[0] || matchedOutline?.hook || fallbackGoal)
    const fallbackHook = compactBriefText(chapter.ending_hook || matchedOutline?.hook || `第${chapter.chapter_no}章结尾抛出新的选择、危险或信息差，迫使读者进入下一章。`)
    const nextTitle = compactBriefText(payload?.title || chapter.title || matchedOutline?.title || `第${chapter.chapter_no}章`)
    const nextGoal = compactBriefText(payload?.chapter_goal || payload?.goal || fallbackGoal)
    const nextSummary = compactBriefText(payload?.chapter_summary || payload?.summary || chapter.chapter_summary || fallbackConflict)
    const nextConflict = compactBriefText(payload?.conflict || fallbackConflict)
    const nextHook = compactBriefText(payload?.ending_hook || payload?.hook || fallbackHook)
    const payloadBlueprint = payload?.chapter_blueprint && typeof payload.chapter_blueprint === 'object' ? payload.chapter_blueprint : {}
    const payloadContentOutline = payloadBlueprint.content_outline || payloadBlueprint.contentOutline || {}
    const payloadCausalChainContract = payloadBlueprint.causal_chain_contract || payloadBlueprint.causalChainContract
    const payloadOutlineMethodsContract = payloadBlueprint.outline_methods_contract || payloadBlueprint.outlineMethodsContract
    const payloadPlotLines = payloadBlueprint.plot_lines || payloadBlueprint.plotLines || {}
    const payloadEndingContract = payloadBlueprint.ending_contract || payloadBlueprint.endingContract || {}
    const characterOrder = asArray(payloadBlueprint.character_order || payloadBlueprint.characterOrder || payload?.character_order || payload?.characterOrder)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const fallbackCharacterOrder = characters.map((item: any) => compactBriefText(item.name)).filter(Boolean).slice(0, 8)
    const beatSequence = asArray(payloadBlueprint.beat_sequence || payloadBlueprint.beatSequence)
    const repairedBeatSequence = beatSequence.length ? beatSequence : [{
      beat_no: 1,
      scene_no: 1,
      title: nextTitle,
      action: nextSummary,
      function_tag: '开篇钩子/推进/章尾承接',
      payoff: nextGoal,
    }]
    const repairedContentOutline = {
      cause: compactBriefText(payloadContentOutline.cause || nextSummary),
      development: compactBriefText(payloadContentOutline.development || nextConflict),
      turn: compactBriefText(payloadContentOutline.turn || payload?.turning_point || nextGoal),
      climax: compactBriefText(payloadContentOutline.climax || payload?.climax || nextGoal),
      ending: compactBriefText(payloadContentOutline.ending || nextHook),
    }
    const repairedPlotLines = {
      mainline: compactBriefText(payloadPlotLines.mainline || payloadPlotLines.main_line || payloadPlotLines.mainLine || nextGoal),
      subplot: compactBriefText(payloadPlotLines.subplot || ''),
      event_line: compactBriefText(payloadPlotLines.event_line || payloadPlotLines.eventLine || nextSummary),
      relationship_line: compactBriefText(payloadPlotLines.relationship_line || payloadPlotLines.relationshipLine || ''),
      logic_line: compactBriefText(payloadPlotLines.logic_line || payloadPlotLines.logicLine || [nextSummary, nextConflict, nextGoal, nextHook].filter(Boolean).join(' -> ')),
    }
    const smallOutlineScenes = repairedBeatSequence.map((beat: any, index: number) => ({
      scene_no: Number(beat.scene_no || beat.sceneNo || beat.beat_no || beat.beatNo || index + 1),
      title: compactBriefText(beat.title || `情节点${index + 1}`),
      purpose: compactBriefText(beat.action || beat.summary || beat.event || nextSummary),
      reader_payoff: compactBriefText(beat.payoff || nextGoal),
      function_tag: compactBriefText(beat.function_tag || beat.functionTag),
    }))
    const repairedChapterBlueprint = {
      version: payloadBlueprint.version || 'oh_story_chapter_blueprint_v1',
      source: payloadBlueprint.source || 'unattended_preflight_repair',
      target_emotion: compactBriefText(payloadBlueprint.target_emotion || payloadBlueprint.targetEmotion || payload?.target_emotion || '承接上一章压力，完成本章推进与章尾追读。'),
      opening_hook: compactBriefText(payloadBlueprint.opening_hook || payloadBlueprint.openingHook || payload?.opening_hook || nextConflict),
      core_payoff: compactBriefText(payloadBlueprint.core_payoff || payloadBlueprint.corePayoff || payload?.core_payoff || nextGoal),
      content_outline: repairedContentOutline,
      small_outline_contract: buildChapterBlueprintSmallOutlineContract(
        { ...contextPackage?.chapter_target, summary: nextSummary, goal: nextGoal, ending_hook: nextHook },
        smallOutlineScenes,
        repairedContentOutline,
        payloadBlueprint.small_outline_contract || payloadBlueprint.smallOutlineContract,
      ),
      mainline_definition_contract: buildMainlineDefinitionContract(project, {
        ...contextPackage,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          summary: nextSummary,
          goal: nextGoal,
          conflict: nextConflict,
          ending_hook: nextHook,
          chapter_blueprint: {
            ...payloadBlueprint,
            content_outline: repairedContentOutline,
            plot_lines: repairedPlotLines,
          },
        },
        chapter_blueprint: {
          ...payloadBlueprint,
          content_outline: repairedContentOutline,
          plot_lines: repairedPlotLines,
        },
      }, payloadBlueprint.mainline_definition_contract || payloadBlueprint.mainlineDefinitionContract || payload?.mainline_definition_contract || payload?.mainlineDefinitionContract),
      causal_chain_contract: buildChapterBlueprintCausalChainContract(repairedContentOutline, payloadCausalChainContract),
      plot_lines: repairedPlotLines,
      character_order: characterOrder.length ? characterOrder : fallbackCharacterOrder,
      beat_sequence: repairedBeatSequence,
      beat_density_contract: buildChapterBlueprintBeatDensityContract(
        resolveChapterWordTarget(project, chapter, { word_target: contextPackage?.chapter_target?.word_target || contextPackage?.chapterTarget?.wordTarget }),
        repairedBeatSequence,
        payloadBlueprint.beat_density_contract || payloadBlueprint.beatDensityContract,
      ),
      cost_and_reward: compactBriefText(payloadBlueprint.cost_and_reward || payloadBlueprint.costAndReward || payload?.cost_and_reward || `代价/压力：${nextConflict}；收益/推进：${nextGoal}`),
      ending_contract: {
        final_state: compactBriefText(payloadEndingContract.final_state || payloadEndingContract.finalState || nextHook),
        unresolved_question: compactBriefText(payloadEndingContract.unresolved_question || payloadEndingContract.unresolvedQuestion || nextHook),
        next_chapter_pull: compactBriefText(payloadEndingContract.next_chapter_pull || payloadEndingContract.nextChapterPull || nextHook),
        forbidden_resolution: asArray(payloadEndingContract.forbidden_resolution || payloadEndingContract.forbiddenResolution),
      },
      writing_intent: compactBriefText(payloadBlueprint.writing_intent || payloadBlueprint.writingIntent || `第${chapter.chapter_no}章《${nextTitle}》：${nextGoal}；章尾钩子：${nextHook}`),
      outline_methods_contract: buildOutlineMethodsContract({
        ...contextPackage,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          chapter_no: chapter.chapter_no,
          title: nextTitle,
          summary: nextSummary,
          conflict: nextConflict,
          ending_hook: nextHook,
          chapter_blueprint: {
            ...payloadBlueprint,
            content_outline: repairedContentOutline,
            plot_lines: repairedPlotLines,
          },
        },
        chapter_blueprint: {
          ...payloadBlueprint,
          content_outline: repairedContentOutline,
          plot_lines: repairedPlotLines,
        },
      }, {
        explicit: payloadOutlineMethodsContract,
        content_outline: repairedContentOutline,
        scene_cards: smallOutlineScenes,
      }),
    }
    let repairedSceneCards = needsSceneCards
      ? autoRepairSceneCardsForPreflight(chapter, {
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            chapter_no: chapter.chapter_no,
            title: nextTitle,
            goal: nextGoal,
            summary: nextSummary,
            conflict: nextConflict,
            ending_hook: nextHook,
            chapter_blueprint: repairedChapterBlueprint,
          },
        }, repairedChapterBlueprint)
      : asArray(contextPackage?.chapter_target?.scene_cards || contextPackage?.chapter_target?.sceneCards || chapter.scene_list || chapter.sceneList)
    if (needsSceneCards && modelId) {
      try {
        throwIfAborted(options)
        const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, {
          ...contextPackage,
          chapter_target: {
            ...(contextPackage?.chapter_target || {}),
            chapter_no: chapter.chapter_no,
            title: nextTitle,
            goal: nextGoal,
            summary: nextSummary,
            conflict: nextConflict,
            ending_hook: nextHook,
            chapter_blueprint: repairedChapterBlueprint,
            scene_cards: repairedSceneCards,
          },
        }, modelId, options)
        if (sceneResult.sceneCards.length) {
          repairedSceneCards = sceneResult.sceneCards.map((scene: any, index: number, cards: any[]) => autoRepairSceneCardDramaticUnit(scene, index, cards.length, chapter, {
            ...contextPackage,
            chapter_target: {
              ...(contextPackage?.chapter_target || {}),
              chapter_no: chapter.chapter_no,
              title: nextTitle,
              goal: nextGoal,
              summary: nextSummary,
              conflict: nextConflict,
              ending_hook: nextHook,
            },
          }, repairedChapterBlueprint))
        }
      } catch (error) {
        if (isAbortError(error)) throw error
        errors.push(`场景卡补齐失败，已使用确定性兜底：${String(error).slice(0, 200)}`)
      }
    }
    if (needsSceneCards) {
      repairedSceneCards = autoRepairSceneCardsForPreflight({
        ...chapter,
        scene_list: repairedSceneCards,
      }, {
        ...contextPackage,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          chapter_no: chapter.chapter_no,
          title: nextTitle,
          goal: nextGoal,
          summary: nextSummary,
          conflict: nextConflict,
          ending_hook: nextHook,
          scene_cards: repairedSceneCards,
        },
      }, repairedChapterBlueprint)
    }
    let repairedEmotionAndHookBrief = buildChapterPreDraftBrief(project, {
      ...contextPackage,
      pre_draft_brief: {
        ...(contextPackage?.pre_draft_brief || {}),
        ...(contextPackage?.preDraftBrief || {}),
        ...(chapter.raw_payload?.pre_draft_brief || {}),
        ...(chapter.raw_payload?.preDraftBrief || {}),
      },
      emotional_arc_contract: payload?.emotional_arc_contract || payload?.emotionalArcContract || contextPackage?.emotional_arc_contract,
      chapter_hook_contract: payload?.chapter_hook_contract || payload?.chapterHookContract || contextPackage?.chapter_hook_contract,
      paragraph_hook_contract: payload?.paragraph_hook_contract || payload?.paragraphHookContract || contextPackage?.paragraph_hook_contract,
      opening_contract: payload?.opening_contract || payload?.openingContract || contextPackage?.opening_contract,
      suspense_contract: payload?.suspense_contract || payload?.suspenseContract || contextPackage?.suspense_contract,
      reversal_contract: payload?.reversal_contract || payload?.reversalContract || contextPackage?.reversal_contract,
      showdown_contract: payload?.showdown_contract || payload?.showdownContract || contextPackage?.showdown_contract,
      bridge_unit_contract: payload?.bridge_unit_contract || payload?.bridgeUnitContract || contextPackage?.bridge_unit_contract,
      plot_framework_contract: payload?.plot_framework_contract || payload?.plotFrameworkContract || contextPackage?.plot_framework_contract,
      style_boundary_contract: payload?.style_boundary_contract || payload?.styleBoundaryContract || contextPackage?.style_boundary_contract,
      plot_dynamics_contract: payload?.plot_dynamics_contract || payload?.plotDynamicsContract || contextPackage?.plot_dynamics_contract,
      story_power_contract: payload?.story_power_contract || payload?.storyPowerContract || contextPackage?.story_power_contract,
      mainline_definition_contract: payload?.mainline_definition_contract || payload?.mainlineDefinitionContract || contextPackage?.mainline_definition_contract,
      information_flow_contract: payload?.information_flow_contract || payload?.informationFlowContract || contextPackage?.information_flow_contract,
      expectation_threshold_contract: payload?.expectation_threshold_contract || payload?.expectationThresholdContract || contextPackage?.expectation_threshold_contract,
      story_loop_contract: payload?.story_loop_contract || payload?.storyLoopContract || contextPackage?.story_loop_contract,
      prose_craft_contract: payload?.prose_craft_contract || payload?.proseCraftContract || contextPackage?.prose_craft_contract,
      punctuation_tone_contract: payload?.punctuation_tone_contract || payload?.punctuationToneContract || contextPackage?.punctuation_tone_contract,
      quality_audit_contract: payload?.quality_audit_contract || payload?.qualityAuditContract || contextPackage?.quality_audit_contract,
      dialogue_contract: payload?.dialogue_contract || payload?.dialogueContract || contextPackage?.dialogue_contract,
      continuity_heat_contract: payload?.continuity_heat_contract || payload?.continuityHeatContract || contextPackage?.continuity_heat_contract,
      character_relation_contract: payload?.character_relation_contract || payload?.characterRelationContract || contextPackage?.character_relation_contract,
      character_behavior_contract: payload?.character_behavior_contract || payload?.characterBehaviorContract || contextPackage?.character_behavior_contract,
      asset_linkage_contract: payload?.asset_linkage_contract || payload?.assetLinkageContract || contextPackage?.asset_linkage_contract,
      state_tracking_contract: payload?.state_tracking_contract || payload?.stateTrackingContract || contextPackage?.state_tracking_contract,
      intent_confirmation_contract: payload?.intent_confirmation_contract || payload?.intentConfirmationContract || contextPackage?.intent_confirmation_contract,
      target_reader_contract: payload?.target_reader_contract || payload?.targetReaderContract || contextPackage?.target_reader_contract,
      genre_positioning_contract: payload?.genre_positioning_contract || payload?.genrePositioningContract || contextPackage?.genre_positioning_contract,
      female_audience_contract: payload?.female_audience_contract || payload?.femaleAudienceContract || contextPackage?.female_audience_contract,
      upgrade_rhythm_contract: payload?.upgrade_rhythm_contract || payload?.upgradeRhythmContract || contextPackage?.upgrade_rhythm_contract,
      conflict_structure_contract: payload?.conflict_structure_contract || payload?.conflictStructureContract || contextPackage?.conflict_structure_contract,
      chapter_target: {
        ...(contextPackage?.chapter_target || {}),
        chapter_no: chapter.chapter_no,
        title: nextTitle,
        summary: nextSummary,
        conflict: nextConflict,
        emotional_curve: payload?.emotional_curve || payload?.emotionalCurve || repairedChapterBlueprint.target_emotion,
        ending_hook: nextHook,
        chapter_blueprint: repairedChapterBlueprint,
        emotional_arc_contract: payload?.emotional_arc_contract || payload?.emotionalArcContract || contextPackage?.chapter_target?.emotional_arc_contract,
        chapter_hook_contract: payload?.chapter_hook_contract || payload?.chapterHookContract || contextPackage?.chapter_target?.chapter_hook_contract,
        paragraph_hook_contract: payload?.paragraph_hook_contract || payload?.paragraphHookContract || contextPackage?.chapter_target?.paragraph_hook_contract,
        opening_contract: payload?.opening_contract || payload?.openingContract || contextPackage?.chapter_target?.opening_contract,
        suspense_contract: payload?.suspense_contract || payload?.suspenseContract || contextPackage?.chapter_target?.suspense_contract,
        reversal_contract: payload?.reversal_contract || payload?.reversalContract || contextPackage?.chapter_target?.reversal_contract,
        showdown_contract: payload?.showdown_contract || payload?.showdownContract || contextPackage?.chapter_target?.showdown_contract,
        bridge_unit_contract: payload?.bridge_unit_contract || payload?.bridgeUnitContract || contextPackage?.chapter_target?.bridge_unit_contract,
        plot_framework_contract: payload?.plot_framework_contract || payload?.plotFrameworkContract || contextPackage?.chapter_target?.plot_framework_contract,
        style_boundary_contract: payload?.style_boundary_contract || payload?.styleBoundaryContract || contextPackage?.chapter_target?.style_boundary_contract,
        plot_dynamics_contract: payload?.plot_dynamics_contract || payload?.plotDynamicsContract || contextPackage?.chapter_target?.plot_dynamics_contract,
        story_power_contract: payload?.story_power_contract || payload?.storyPowerContract || contextPackage?.chapter_target?.story_power_contract,
        mainline_definition_contract: payload?.mainline_definition_contract || payload?.mainlineDefinitionContract || contextPackage?.chapter_target?.mainline_definition_contract,
        information_flow_contract: payload?.information_flow_contract || payload?.informationFlowContract || contextPackage?.chapter_target?.information_flow_contract,
        expectation_threshold_contract: payload?.expectation_threshold_contract || payload?.expectationThresholdContract || contextPackage?.chapter_target?.expectation_threshold_contract,
        story_loop_contract: payload?.story_loop_contract || payload?.storyLoopContract || contextPackage?.chapter_target?.story_loop_contract,
        prose_craft_contract: payload?.prose_craft_contract || payload?.proseCraftContract || contextPackage?.chapter_target?.prose_craft_contract,
        punctuation_tone_contract: payload?.punctuation_tone_contract || payload?.punctuationToneContract || contextPackage?.chapter_target?.punctuation_tone_contract,
        quality_audit_contract: payload?.quality_audit_contract || payload?.qualityAuditContract || contextPackage?.chapter_target?.quality_audit_contract,
        dialogue_contract: payload?.dialogue_contract || payload?.dialogueContract || contextPackage?.chapter_target?.dialogue_contract,
        continuity_heat_contract: payload?.continuity_heat_contract || payload?.continuityHeatContract || contextPackage?.chapter_target?.continuity_heat_contract,
        character_relation_contract: payload?.character_relation_contract || payload?.characterRelationContract || contextPackage?.chapter_target?.character_relation_contract,
        character_behavior_contract: payload?.character_behavior_contract || payload?.characterBehaviorContract || contextPackage?.chapter_target?.character_behavior_contract,
        asset_linkage_contract: payload?.asset_linkage_contract || payload?.assetLinkageContract || contextPackage?.chapter_target?.asset_linkage_contract,
        state_tracking_contract: payload?.state_tracking_contract || payload?.stateTrackingContract || contextPackage?.chapter_target?.state_tracking_contract,
        intent_confirmation_contract: payload?.intent_confirmation_contract || payload?.intentConfirmationContract || contextPackage?.chapter_target?.intent_confirmation_contract,
        target_reader_contract: payload?.target_reader_contract || payload?.targetReaderContract || contextPackage?.chapter_target?.target_reader_contract,
        genre_positioning_contract: payload?.genre_positioning_contract || payload?.genrePositioningContract || contextPackage?.chapter_target?.genre_positioning_contract,
        female_audience_contract: payload?.female_audience_contract || payload?.femaleAudienceContract || contextPackage?.chapter_target?.female_audience_contract,
        upgrade_rhythm_contract: payload?.upgrade_rhythm_contract || payload?.upgradeRhythmContract || contextPackage?.chapter_target?.upgrade_rhythm_contract,
        conflict_structure_contract: payload?.conflict_structure_contract || payload?.conflictStructureContract || contextPackage?.chapter_target?.conflict_structure_contract,
        scene_cards: repairedSceneCards,
      },
    })
    const repairedBenchmarkRecallState = repairBenchmarkRecallSourcePathState(
      chapter,
      repairedEmotionAndHookBrief.benchmark_recall_brief,
      repairedEmotionAndHookBrief.benchmark_recall_gaps,
      repairedEmotionAndHookBrief.benchmarkRecallGaps,
    )
    const repairedBenchmarkRecallBrief = repairedBenchmarkRecallState.benchmark_recall_brief
    const repairedBenchmarkRecallGaps = repairedBenchmarkRecallState.benchmark_recall_gaps
    repairedEmotionAndHookBrief = {
      ...repairedEmotionAndHookBrief,
      scene_briefs: repairedSceneCards.map(sceneBriefFromCard),
      benchmark_recall_brief: repairedBenchmarkRecallBrief,
      benchmark_recall_gaps: repairedBenchmarkRecallGaps,
      benchmarkRecallGaps: repairedBenchmarkRecallGaps,
      state_tracking_contract: autoRepairStateTrackingSourceReadiness(repairedEmotionAndHookBrief.state_tracking_contract, chapter, {
        ...contextPackage,
        chapter_target: {
          ...(contextPackage?.chapter_target || {}),
          chapter_no: chapter.chapter_no,
          title: nextTitle,
          summary: nextSummary,
          conflict: nextConflict,
          ending_hook: nextHook,
          chapter_blueprint: repairedChapterBlueprint,
          scene_cards: repairedSceneCards,
        },
      }),
    }
    const nextChapterPatch: any = {
      title: nextTitle,
      chapter_goal: nextGoal,
      chapter_summary: nextSummary,
      conflict: nextConflict,
      ending_hook: nextHook,
      ...(needsSceneCards ? {
        scene_breakdown: repairedSceneCards,
        scene_list: repairedSceneCards,
      } : {}),
      raw_payload: {
        ...(chapter.raw_payload || {}),
        pre_draft_brief: {
          ...(chapter.raw_payload?.pre_draft_brief || {}),
          ...(chapter.raw_payload?.preDraftBrief || {}),
          confirmed_at: chapter.raw_payload?.pre_draft_brief?.confirmed_at
            || chapter.raw_payload?.preDraftBrief?.confirmed_at
            || new Date().toISOString(),
          confirmation_source: chapter.raw_payload?.pre_draft_brief?.confirmation_source
            || chapter.raw_payload?.preDraftBrief?.confirmation_source
            || 'unattended_preflight_repair',
          chapter_goal: nextGoal,
          core_conflict: nextConflict,
          ending_hook: nextHook,
          previous_handoff: repairedEmotionAndHookBrief.previous_handoff,
          reader_promise: repairedEmotionAndHookBrief.reader_promise,
          emotional_curve: repairedEmotionAndHookBrief.emotional_curve,
          key_settings: repairedEmotionAndHookBrief.key_settings,
          forbidden_content: repairedEmotionAndHookBrief.forbidden_content,
          storyline_advances: repairedEmotionAndHookBrief.storyline_advances,
          storyline_plants: repairedEmotionAndHookBrief.storyline_plants,
          storyline_payoffs: repairedEmotionAndHookBrief.storyline_payoffs,
          storyline_forbidden: repairedEmotionAndHookBrief.storyline_forbidden,
          platform_rubric: repairedEmotionAndHookBrief.platform_rubric,
          content_rubric: repairedEmotionAndHookBrief.content_rubric,
          character_arc_brief: repairedEmotionAndHookBrief.character_arc_brief,
          reader_retention_brief: repairedEmotionAndHookBrief.reader_retention_brief,
          reader_drop_risk_brief: repairedEmotionAndHookBrief.reader_drop_risk_brief,
          story_pressure_brief: repairedEmotionAndHookBrief.story_pressure_brief,
          story_drive_brief: repairedEmotionAndHookBrief.story_drive_brief,
          serial_rhythm_brief: repairedEmotionAndHookBrief.serial_rhythm_brief,
          page_turn_hook_brief: repairedEmotionAndHookBrief.page_turn_hook_brief,
          volume_climax_brief: repairedEmotionAndHookBrief.volume_climax_brief,
          recent_fatigue_brief: repairedEmotionAndHookBrief.recent_fatigue_brief,
          delivery_risk_carry_over: repairedEmotionAndHookBrief.delivery_risk_carry_over,
          reader_expectation_debt: repairedEmotionAndHookBrief.reader_expectation_debt,
          reader_expectation_ledger: repairedEmotionAndHookBrief.reader_expectation_ledger,
          innovation_brief: repairedEmotionAndHookBrief.innovation_brief,
          signature_scene_brief: repairedEmotionAndHookBrief.signature_scene_brief,
          meme_strategy: repairedEmotionAndHookBrief.meme_strategy,
          benchmark_recall_brief: repairedEmotionAndHookBrief.benchmark_recall_brief,
          benchmark_recall_gaps: repairedEmotionAndHookBrief.benchmark_recall_gaps,
          benchmarkRecallGaps: repairedEmotionAndHookBrief.benchmarkRecallGaps,
          style_sample_strategy: repairedEmotionAndHookBrief.style_sample_strategy,
          chapter_benchmark_strategy: repairedEmotionAndHookBrief.chapter_benchmark_strategy,
          first30_retention_brief: repairedEmotionAndHookBrief.first30_retention_brief,
          core_contract_radar: repairedEmotionAndHookBrief.core_contract_radar,
          longform_compass: repairedEmotionAndHookBrief.longform_compass,
          longform_battle_context: repairedEmotionAndHookBrief.longform_battle_context,
          longform_memory_capsule: repairedEmotionAndHookBrief.longform_memory_capsule,
          layered_memory_context: repairedEmotionAndHookBrief.layered_memory_context,
          next_batch_brief: repairedEmotionAndHookBrief.next_batch_brief,
          story_unit_context: repairedEmotionAndHookBrief.story_unit_context,
          scene_briefs: repairedEmotionAndHookBrief.scene_briefs,
          word_budget: repairedEmotionAndHookBrief.word_budget,
          generated_at: repairedEmotionAndHookBrief.generated_at,
          chapter_blueprint: repairedChapterBlueprint,
          emotional_arc_contract: repairedEmotionAndHookBrief.emotional_arc_contract,
          chapter_hook_contract: repairedEmotionAndHookBrief.chapter_hook_contract,
          paragraph_hook_contract: repairedEmotionAndHookBrief.paragraph_hook_contract,
          opening_contract: repairedEmotionAndHookBrief.opening_contract,
          suspense_contract: repairedEmotionAndHookBrief.suspense_contract,
          reversal_contract: repairedEmotionAndHookBrief.reversal_contract,
          showdown_contract: repairedEmotionAndHookBrief.showdown_contract,
          bridge_unit_contract: repairedEmotionAndHookBrief.bridge_unit_contract,
          plot_framework_contract: repairedEmotionAndHookBrief.plot_framework_contract,
          style_boundary_contract: repairedEmotionAndHookBrief.style_boundary_contract,
          plot_dynamics_contract: repairedEmotionAndHookBrief.plot_dynamics_contract,
          story_power_contract: repairedEmotionAndHookBrief.story_power_contract,
          mainline_definition_contract: repairedChapterBlueprint.mainline_definition_contract,
          information_flow_contract: repairedEmotionAndHookBrief.information_flow_contract,
          expectation_threshold_contract: repairedEmotionAndHookBrief.expectation_threshold_contract,
          story_loop_contract: repairedEmotionAndHookBrief.story_loop_contract,
          prose_craft_contract: repairedEmotionAndHookBrief.prose_craft_contract,
          punctuation_tone_contract: repairedEmotionAndHookBrief.punctuation_tone_contract,
          quality_audit_contract: repairedEmotionAndHookBrief.quality_audit_contract,
          dialogue_contract: repairedEmotionAndHookBrief.dialogue_contract,
          continuity_heat_contract: repairedEmotionAndHookBrief.continuity_heat_contract,
          character_relation_contract: repairedEmotionAndHookBrief.character_relation_contract,
          character_behavior_contract: repairedEmotionAndHookBrief.character_behavior_contract,
          asset_linkage_contract: repairedEmotionAndHookBrief.asset_linkage_contract,
          state_tracking_contract: repairedEmotionAndHookBrief.state_tracking_contract,
          intent_confirmation_contract: repairedEmotionAndHookBrief.intent_confirmation_contract,
          target_reader_contract: repairedEmotionAndHookBrief.target_reader_contract,
          genre_positioning_contract: repairedEmotionAndHookBrief.genre_positioning_contract,
          female_audience_contract: repairedEmotionAndHookBrief.female_audience_contract,
          upgrade_rhythm_contract: repairedEmotionAndHookBrief.upgrade_rhythm_contract,
          conflict_structure_contract: repairedEmotionAndHookBrief.conflict_structure_contract,
        },
        must_advance: [...new Set([
          ...asArray(chapter.raw_payload?.must_advance),
          ...asArray(payload?.must_advance),
          payload?.chapter_goal || payload?.goal || fallbackGoal,
        ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12),
        forbidden_repeats: [...new Set([
          ...asArray(chapter.raw_payload?.forbidden_repeats),
          ...asArray(payload?.forbidden_repeats),
        ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12),
        unattended_preflight_repaired_at: new Date().toISOString(),
        unattended_blueprint_repair_summary: payload?.repair_summary || '无人值守自动补齐章节蓝图',
      },
    }
    if (persist) {
      const updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, nextChapterPatch, { createVersion: false })
      if (updatedChapter) chapter = updatedChapter
    } else {
      applyStagedChapterPatch(nextChapterPatch)
    }
    repaired.push({ type: 'chapter_blueprint_updated', chapter_id: chapter.id, chapter_goal: nextChapterPatch.chapter_goal, ending_hook: nextChapterPatch.ending_hook })
  }

  const materialsResult = await runAutoRepairPreflightMaterials({
    activeWorkspace,
    project,
    modelId,
    options,
    persist,
    missingKeys,
    needsWorldbuilding,
    needsCharacters,
    needsSettings,
    outlines,
    reviews,
    chapters,
    contextPackage,
    repaired,
    errors,
    stagedWorldbuildingCreates,
    stagedCharacterCreates,
    stagedSettingCreates,
    stagedReviews,
    stagedChapterPatch,
    applyStagedChapterPatch,
    executeAgent,
    buildChapterContextPackage,
    chapter,
    worldbuilding,
    characters,
    settings,
    nextTemporaryId,
    stagedUsageReplacement,
  })
  chapter = materialsResult.chapter || chapter
  return materialsResult
}

  return {
    autoRepairChapterPreflightGaps,
  }
}
