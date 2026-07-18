import {
  asArray,
  joinList,
  compactPromptText,
  uniquePromptStrings,
  compactProseCraftItems,
  formatProseCraftPromptSnippet,
  formatQualityAuditPhaseChecklist,
  formatDialogueExecutionChecklist,
  OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS,
} from './prose-generation-prompt-sections-shared'

export function buildBenchmarkRecallPromptSection(benchmarkRecallBrief: any) {
  return [
    benchmarkRecallBrief ? '【文风召回简报】' : '',
    benchmarkRecallBrief ? '硬性要求：执行 chapter_target.benchmark_recall_brief；这是来自 oh-story workflow-daily Step 2.3 的模块/节奏/文风召回结果，正文必须把选中的情绪模块、节奏参照、文风摘要和匹配章技法转成可见写法。' : '',
    benchmarkRecallBrief ? '执行方式：selected_emotion_module 进入情绪目标；rhythm_reference 决定蓄势、爆发、冷却和章尾承接；matched_chapter_techniques 只作为抽象技法，不得复制对标章节桥段、设定、角色名或原句；gaps 必须如实保留并在写作中规避。' : '',
    benchmarkRecallBrief?.selected_emotion_module ? `selected_emotion_module：${benchmarkRecallBrief.selected_emotion_module}` : '',
    benchmarkRecallBrief?.rhythm_reference ? `rhythm_reference：${benchmarkRecallBrief.rhythm_reference}` : '',
    benchmarkRecallBrief?.style_profile_summary ? `style_profile_summary：${benchmarkRecallBrief.style_profile_summary}` : '',
    benchmarkRecallBrief?.matched_chapter ? `matched_chapter：${benchmarkRecallBrief.matched_chapter}` : '',
    benchmarkRecallBrief?.matched_chapter_techniques?.length ? `matched_chapter_techniques：${joinList(benchmarkRecallBrief.matched_chapter_techniques)}` : '',
    benchmarkRecallBrief?.style_directives?.length ? `style_directives：${joinList(benchmarkRecallBrief.style_directives)}` : '',
    benchmarkRecallBrief?.style_profile_path ? `style_profile_path：${benchmarkRecallBrief.style_profile_path}` : '',
    benchmarkRecallBrief?.module_source_path ? `module_source_path：${benchmarkRecallBrief.module_source_path}` : '',
    benchmarkRecallBrief?.rhythm_source_path ? `rhythm_source_path：${benchmarkRecallBrief.rhythm_source_path}` : '',
    benchmarkRecallBrief?.matched_chapter_summary_path ? `matched_chapter_summary_path：${benchmarkRecallBrief.matched_chapter_summary_path}` : '',
    benchmarkRecallBrief?.matched_chapter_deep_dive_path ? `matched_chapter_deep_dive_path：${benchmarkRecallBrief.matched_chapter_deep_dive_path}` : '',
    benchmarkRecallBrief?.fallback_deep_dive_path ? `fallback_deep_dive_path：${benchmarkRecallBrief.fallback_deep_dive_path}` : '',
    benchmarkRecallBrief?.source_paths?.length ? `source_paths：${joinList(benchmarkRecallBrief.source_paths)}` : '',
    benchmarkRecallBrief?.anchor_excerpts?.length ? '原文锚点片段：只用于学习句长、停顿、潜台词和信息释放手法；不得复制锚点原句、桥段、设定、角色名或专名。' : '',
    benchmarkRecallBrief?.anchor_excerpts?.length ? benchmarkRecallBrief.anchor_excerpts.map((excerpt: string, index: number) => `锚点${index + 1}：${excerpt}`).join('\n') : '',
    benchmarkRecallBrief?.canonical_source_rules?.length ? `canonical_source_rules：${joinList(benchmarkRecallBrief.canonical_source_rules)}` : '',
    benchmarkRecallBrief?.fallback_receipt_requirements?.length ? `fallback_receipt_requirements：${joinList(benchmarkRecallBrief.fallback_receipt_requirements)}` : '',
    benchmarkRecallBrief?.secondary_benchmark_recall_summary?.length ? '副对标召回摘要：' : '',
    benchmarkRecallBrief?.secondary_benchmark_recall_summary?.length ? JSON.stringify(benchmarkRecallBrief.secondary_benchmark_recall_summary, null, 2).slice(0, 2000) : '',
    benchmarkRecallBrief?.secondary_benchmark_boundary_rules?.length ? `secondary_benchmark_boundary：${joinList(benchmarkRecallBrief.secondary_benchmark_boundary_rules)}` : '',
    benchmarkRecallBrief?.gaps?.length ? `gaps：${joinList(benchmarkRecallBrief.gaps)}` : '',
    benchmarkRecallBrief?.gaps?.some((gap: any) => /matched_deep_dive_missing|同章深度拆解缺失/i.test(String(gap || ''))) ? 'fallback说明：同章深度拆解缺失，已回退黄金三章/文风技巧；正文只能采用抽象节奏和技法，不得假装读过完整同章深度拆解。' : '',
    benchmarkRecallBrief?.authority_rules?.length ? `benchmark_authority_rules：${joinList(benchmarkRecallBrief.authority_rules)}` : '',
    benchmarkRecallBrief?.conflict_resolution ? `conflict_resolution：${benchmarkRecallBrief.conflict_resolution}` : '',
    benchmarkRecallBrief?.quality_checks?.length ? `benchmark_recall_checks：${joinList(benchmarkRecallBrief.quality_checks)}` : '',
    benchmarkRecallBrief ? JSON.stringify(benchmarkRecallBrief, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStyleBoundaryPromptSection(styleBoundaryContract: any) {
  return [
    styleBoundaryContract ? '【文风覆盖边界合同】' : '',
    styleBoundaryContract ? '硬性要求：执行 chapter_target.style_boundary_contract；文风只覆盖表达层，硬约束永远赢。样章、对标章或文风画像不能覆盖禁用词、Gate F 章末禁升华、万能比喻、章末预告、字数下限、剧情事实、状态和时间线。' : '',
    styleBoundaryContract ? '执行方式：可调整句长、段落、停顿、对白比例和情绪转折；不得复制样章桥段、专有设定、角色名、核心梗、原句、口癖和独特比喻；如果文风要求与 Gate B/Gate D/标点习惯冲突，只在不破坏硬门禁时采用。' : '',
    styleBoundaryContract?.style_override_rules?.length ? `可覆盖项：${joinList(styleBoundaryContract.style_override_rules)}` : '',
    styleBoundaryContract?.hard_constraints?.length ? `硬约束：${joinList(styleBoundaryContract.hard_constraints)}` : '',
    styleBoundaryContract?.copy_boundary_rules?.length ? `不可模仿边界：${joinList(styleBoundaryContract.copy_boundary_rules)}` : '',
    styleBoundaryContract?.quality_checks?.length ? `style_boundary_checks：${joinList(styleBoundaryContract.quality_checks)}` : '',
    styleBoundaryContract ? '交稿自检必须输出 style_boundary_checks，并用正文证据检查文风覆盖边界、硬约束永远赢、Gate F、禁用词、万能比喻、字数下限和不得复制样章桥段。' : '',
    styleBoundaryContract ? JSON.stringify(styleBoundaryContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildInformationFlowPromptSection(informationFlowContract: any) {
  return [
    informationFlowContract ? '【信息团与场景衔接合同】' : '',
    informationFlowContract ? '硬性要求：执行 chapter_target.information_flow_contract；这是来自 oh-story plot-core-methods 的信息团和场景衔接口径，正文每个场景必须交付一个可概括的信息单元，并让信息团之间递进。' : '',
    informationFlowContract ? '执行方式：每个信息团必须能一句话概括；前一个场景留下悬念，后一个场景回应、验证、反转或升级；过渡不是填充，没有信息量就删掉；无关背景、纯移动、纯寒暄和无信息量过渡必须删掉或改成证据。' : '',
    informationFlowContract ? '过渡压缩：纯移动、寒暄、环境描写没有信息量时直接跳过或压缩；过场要么交付信息、风险、情绪余波或下一步目标，要么只用一句话带过。' : '',
    informationFlowContract ? '提升后下一目标：每次实力、身份、资源或阶段性目标提升后，必须立即引入新的挑战、目标、代价或更高门槛；不能只写“事情进入下一阶段”。' : '',
    informationFlowContract?.information_units?.length ? `信息团：${joinList(informationFlowContract.information_units)}` : '',
    informationFlowContract?.progression_chain?.length ? `递进链：${joinList(informationFlowContract.progression_chain)}` : '',
    informationFlowContract?.transition_rules?.length ? `衔接规则：${joinList(informationFlowContract.transition_rules)}` : '',
    informationFlowContract?.transition_compression_rules?.length ? `过渡压缩：${joinList(informationFlowContract.transition_compression_rules)}` : '',
    informationFlowContract?.next_objective_rules?.length ? `提升后下一目标：${joinList(informationFlowContract.next_objective_rules)}` : '',
    informationFlowContract?.water_risk_guards?.length ? `水章防线：${joinList(informationFlowContract.water_risk_guards)}` : '',
    informationFlowContract?.quality_checks?.length ? `质量检查：${joinList(informationFlowContract.quality_checks)}` : '',
    informationFlowContract ? '交稿自检必须输出 information_flow_checks，并用正文证据检查信息团可概括、场景递进、悬念回应、过渡压缩、情绪衔接、提升后下一目标和无关信息团清理。' : '',
    informationFlowContract ? JSON.stringify(informationFlowContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildExpectationThresholdPromptSection(expectationThresholdContract: any) {
  return [
    expectationThresholdContract ? '【期待门槛合同】' : '',
    expectationThresholdContract ? '硬性要求：执行 chapter_target.expectation_threshold_contract；这是来自 oh-story plot-core-methods / commercial-core-methods 的设门槛与期待管理口径，正文必须用系统性条件拉长目标，并保持两长一短与剧情期待 + 主题甜头 + 新鲜感同时在线。' : '',
    expectationThresholdContract ? '执行方式：短期期待只保留一个当前单元明确目标；中长期期待用远期目标、悬念、组织、人物或世界观秘密保温；门槛要围绕核心卖点分批提出，每跨越一个门槛就立刻设立下一个。' : '',
    expectationThresholdContract?.short_expectation ? `短期期待：${expectationThresholdContract.short_expectation}` : '',
    expectationThresholdContract?.medium_expectations?.length ? `中期期待：${joinList(expectationThresholdContract.medium_expectations)}` : '',
    expectationThresholdContract?.long_expectations?.length ? `长期期待：${joinList(expectationThresholdContract.long_expectations)}` : '',
    expectationThresholdContract?.thresholds?.length ? `门槛条件：${joinList(expectationThresholdContract.thresholds)}` : '',
    expectationThresholdContract?.dynamic_thresholds?.length ? `动态门槛：${joinList(expectationThresholdContract.dynamic_thresholds)}` : '',
    expectationThresholdContract?.nested_units?.length ? `单元嵌套：${joinList(expectationThresholdContract.nested_units)}` : '',
    expectationThresholdContract?.expectation_before_payoff_rules?.length ? `期待铺垫：${joinList(expectationThresholdContract.expectation_before_payoff_rules)}` : '',
    expectationThresholdContract?.expectation_relay_rules?.length ? `期待接力法：${joinList(expectationThresholdContract.expectation_relay_rules)}` : '',
    expectationThresholdContract?.quality_checks?.length ? `质量检查：${joinList(expectationThresholdContract.quality_checks)}` : '',
    expectationThresholdContract ? '交稿自检必须输出 expectation_threshold_checks，并用正文证据检查两长一短、剧情期待 + 主题甜头 + 新鲜感、期待感 > 爽点 / 铺垫不少于释放、期待接力法、门槛拆分、分批提出、动态加码、低密度期待点和下一单元预埋。' : '',
    expectationThresholdContract ? JSON.stringify(expectationThresholdContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildDeliveryRiskCarryOverPromptSection(deliveryRiskCarryOver: any) {
  return [
    deliveryRiskCarryOver ? '【上一章交稿风险承接】' : '',
    deliveryRiskCarryOver ? '硬性要求：执行 chapter_target.delivery_risk_carry_over；这些是上一章交稿后仍未完全解决的软风险，本章必须把它们转成开篇承接、场景推进、读者回报、创新落点或章末钩子，不得只在旁白中声明已经处理。' : '',
    deliveryRiskCarryOver?.source_chapter_no ? `风险来源：第${deliveryRiskCarryOver.source_chapter_no}章` : '',
    deliveryRiskCarryOver?.label ? `风险总览：${deliveryRiskCarryOver.label}` : '',
    deliveryRiskCarryOver?.priority_label ? `优先级：${deliveryRiskCarryOver.priority_label}` : '',
    deliveryRiskCarryOver?.items?.length ? `风险项：${joinList(deliveryRiskCarryOver.items)}` : '',
    deliveryRiskCarryOver?.required_actions?.length ? `承接动作：${joinList(deliveryRiskCarryOver.required_actions)}` : '',
    deliveryRiskCarryOver?.opening_actions?.length ? `开篇动作：${joinList(deliveryRiskCarryOver.opening_actions)}` : '',
    deliveryRiskCarryOver?.middle_actions?.length ? `中段动作：${joinList(deliveryRiskCarryOver.middle_actions)}` : '',
    deliveryRiskCarryOver?.ending_actions?.length ? `章末动作：${joinList(deliveryRiskCarryOver.ending_actions)}` : '',
    deliveryRiskCarryOver?.forbidden_repeats?.length ? `禁用重复：${joinList(deliveryRiskCarryOver.forbidden_repeats)}` : '',
    deliveryRiskCarryOver ? JSON.stringify(deliveryRiskCarryOver, null, 2).slice(0, 3000) : '',
    '',
  ]
}

export function buildBenchmarkRecallReceiptPromptSection(benchmarkRecallBrief: any) {
  return [
    benchmarkRecallBrief ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks 必须逐项覆盖 chapter_target.benchmark_recall_brief 中的 selected_emotion_module、rhythm_reference、style_profile_summary、matched_chapter_techniques、style_directives、anchor_excerpts、canonical_source_rules、fallback_receipt_requirements、gaps 和 quality_checks；每项包含 key,label,delivered,evidence,remaining_risk，未完成时 delivered=false 并写明下一章需要承接的文风召回缺口；如果存在 fallback_receipt_requirements，必须额外输出 fallback_usage_receipts 对应的 module_usage_receipt、rhythm_usage_receipt、matched_chapter_usage_receipt，字段必须包含 source_type/source_path/expected_application/delivered_evidence/gaps_preserved；anchor_excerpts 只能证明句长、停顿、潜台词和信息释放手法被抽象学习，evidence 不得复述锚点原句；不得复制对标桥段、设定、角色名或原句。' : '',
  ]
}

export function buildLongformCompassPromptSection(longformCompass: any) {
  return [
    longformCompass ? '【长篇作品罗盘】' : '',
    longformCompass ? '硬性要求：不可漂移项必须遵守；可调整区只能服务本章目标、当前卷目标和读者承诺，不得把扩展写成核心改道。' : '',
    longformCompass ? JSON.stringify(longformCompass, null, 2).slice(0, 4000) : '',
    '',
  ]
}

export function buildLongformBattleContextPromptSection(longformBattleContext: any) {
  return [
    longformBattleContext ? '【长篇作战承接】' : '',
    longformBattleContext ? '硬性要求：执行 chapter_target.longform_battle_context；risk_lanes 是本章必须修复或承接的长篇生产风险，必须写成可见事件、冲突推进、读者回报、剧情线动作或章末钩子，不得只在旁白里声明已经解决。' : '',
    longformBattleContext ? JSON.stringify(longformBattleContext, null, 2).slice(0, 4000) : '',
    '',
  ]
}

export function buildChapterLaunchGatePromptSection(chapterLaunchGate: any) {
  return [
    chapterLaunchGate ? '【本章开写门禁】' : '',
    chapterLaunchGate ? '硬性要求：本章必须逐条落实读者承诺、章节目标、核心冲突、主线服务、读者回报和章末钩子；不得把门禁中的 warn/block 项绕过去写。' : '',
    chapterLaunchGate ? JSON.stringify(chapterLaunchGate, null, 2).slice(0, 4000) : '',
    '',
  ]
}

export function buildGovernanceRecheckPromptSection(governanceRecheckMemory: any) {
  return [
    governanceRecheckMemory ? '【治理复查承接】' : '',
    governanceRecheckMemory ? '硬性要求：执行 chapter_target.governance_recheck_memory；这是上一轮日终复查沉淀到本章的恢复依据。evidence 必须继续写成正文可见的冲突推进、对白执行、读者回报或剧情线动作；watch_items 必须在本章保持观察，不得因为只写单章就丢失。' : '',
    governanceRecheckMemory?.source_run_id ? `来源审计：#${governanceRecheckMemory.source_run_id}` : '',
    governanceRecheckMemory?.summary ? `复查摘要：${governanceRecheckMemory.summary}` : '',
    governanceRecheckMemory?.evidence?.length ? `修后证据：${joinList(governanceRecheckMemory.evidence)}` : '',
    governanceRecheckMemory?.failed_evidence?.length ? `当前失效依据：${joinList(governanceRecheckMemory.failed_evidence)}` : '',
    governanceRecheckMemory?.watch_items?.length ? `仍需观察：${joinList(governanceRecheckMemory.watch_items)}` : '',
    governanceRecheckMemory ? JSON.stringify(governanceRecheckMemory, null, 2).slice(0, 3000) : '',
    '',
  ]
}

export function buildCoreContractRadarPromptSection(coreContractRadar: any) {
  return [
    coreContractRadar ? '【核心契约】' : '',
    coreContractRadar ? '硬性要求：执行 chapter_target.core_contract_radar；must_serve 是本章必须服务的全书承诺、核心冲突、创新卖点和读者回报；no_drift 是不得漂移的红线；theme_unity_rules 是主题统一规则，要求全书核心情绪一以贯之，小情绪服从大情绪；selling_point_execution_rules 必须按卖点四步法和发现比告知爽十倍执行；repetition_strategy_rules 必须守重复策略；commercial_rhythm_rules 必须做节奏自检；goldfinger_structure_rules 必须校准金手指结构；launch_pressure_rules 必须守开篇压力；repair_focus 必须写成可见事件、选择、代价、规则判定、主线推进或章末问题。' : '',
    coreContractRadar ? `必须服务：${joinList(coreContractRadar.must_serve) || '按长篇罗盘与本章任务书执行'}` : '',
    coreContractRadar ? `不得漂移：${joinList(coreContractRadar.no_drift) || '不得改写全书核心承诺、主角驱动和长期方向'}` : '',
    coreContractRadar?.theme_unity_rules?.length ? `主题统一：${joinList(coreContractRadar.theme_unity_rules)}` : '',
    coreContractRadar?.selling_point_execution_rules?.length ? `卖点四步法：${joinList(coreContractRadar.selling_point_execution_rules)}` : '',
    coreContractRadar?.repetition_strategy_rules?.length ? `重复策略：${joinList(coreContractRadar.repetition_strategy_rules)}` : '',
    coreContractRadar?.commercial_rhythm_rules?.length ? `节奏自检：${joinList(coreContractRadar.commercial_rhythm_rules)}` : '',
    coreContractRadar?.goldfinger_structure_rules?.length ? `金手指结构：${joinList(coreContractRadar.goldfinger_structure_rules)}` : '',
    coreContractRadar?.launch_pressure_rules?.length ? `开篇压力：${joinList(coreContractRadar.launch_pressure_rules)}` : '',
    coreContractRadar?.repair_focus?.length ? `优先修正：${joinList(coreContractRadar.repair_focus)}` : '',
    coreContractRadar ? JSON.stringify(coreContractRadar, null, 2).slice(0, 4000) : '',
    '',
  ]
}
