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

export function buildTitleUniquenessPromptSection(titleUniquenessReport: any, duplicateTitleRows: any[] = []) {
  return [
    titleUniquenessReport?.status === 'warn' ? '【章节标题去重】' : '',
    titleUniquenessReport?.status === 'warn' ? '硬性要求：按 oh-story Step 2.1 标题预检处理。当前标题与既有章节重复；输出 JSON 的 title 必须改成不重复的新标题，按本章核心事件、冲突转折、关键资产或章尾钩子命名，不得继续使用重复标题，并同步章节标题；同步细纲标题与正文文件名。' : '',
    titleUniquenessReport?.status === 'warn' && duplicateTitleRows.length ? `已占用标题：${duplicateTitleRows.join('；')}` : '',
    titleUniquenessReport?.status === 'warn' && titleUniquenessReport?.fix ? `改名依据：${titleUniquenessReport.fix}` : '',
  ]
}

export function buildWritePreparationPromptSection(writePreparationBrief: any) {
  const rollingRhythmPreflight = writePreparationBrief?.rolling_rhythm_preflight
  return [
    writePreparationBrief ? '【写前准备卡】' : '',
    writePreparationBrief ? '硬性要求：必须先确认来源就绪、资产关系、章节蓝图和读者回报；如果准备卡标记 needs_context，正文必须优先修复这些准备缺口，不能把未就绪来源写成既定事实。' : '',
    writePreparationBrief?.readiness_status ? `准备状态：${writePreparationBrief.readiness_status}` : '',
    writePreparationBrief?.source_gaps?.length ? `来源缺口：${joinList(writePreparationBrief.source_gaps)}` : '',
    writePreparationBrief?.asset_risks?.length ? `关系图风险：${joinList(writePreparationBrief.asset_risks)}` : '',
    writePreparationBrief?.delivery_risk_actions?.length ? `上一轮待修复：${joinList(writePreparationBrief.delivery_risk_actions)}` : '',
    writePreparationBrief?.delivery_risk_actions?.length ? '上一轮待修复硬性落点：开篇动作必须在前300字形成正文证据；中段动作必须落成中段事件推进、证据变化或角色选择；章末动作必须在最后300字形成追读钩子、状态余波或新风险。不得只在旁白中声明已处理。' : '',
    rollingRhythmPreflight ? `滚动节奏预检 rolling_rhythm_preflight：${rollingRhythmPreflight.principle || '拉期待速度 > 断期待速度'}；状态=${rollingRhythmPreflight.status || 'needs_attention'}` : '',
    rollingRhythmPreflight?.expectation_vacuum_risks?.length ? `期待真空风险：${joinList(rollingRhythmPreflight.expectation_vacuum_risks)}` : '',
    rollingRhythmPreflight?.expectation_first_aid?.length ? `期待真空期急救：${joinList(rollingRhythmPreflight.expectation_first_aid)}` : '',
    rollingRhythmPreflight?.selling_point_drift_risks?.length ? `卖点偏移风险：${joinList(rollingRhythmPreflight.selling_point_drift_risks)}` : '',
    rollingRhythmPreflight?.repetition_boundary_risks?.length ? `重复边界风险：${joinList(rollingRhythmPreflight.repetition_boundary_risks)}` : '',
    rollingRhythmPreflight?.next_actions?.length ? `滚动节奏动作：${joinList(rollingRhythmPreflight.next_actions)}` : '',
    writePreparationBrief?.creation_contract_checklist?.length ? `创作契约清单 creation_contract_checklist：${joinList(writePreparationBrief.creation_contract_checklist)}` : '',
    writePreparationBrief?.blueprint_focus?.length ? `蓝图焦点：${joinList(writePreparationBrief.blueprint_focus)}` : '',
    writePreparationBrief?.reader_payoff_focus?.length ? `读者回报焦点：${joinList(writePreparationBrief.reader_payoff_focus)}` : '',
    writePreparationBrief?.must_confirm?.length ? `写前必确认：${joinList(writePreparationBrief.must_confirm)}` : '',
    writePreparationBrief?.execution_order?.length ? `执行顺序：${joinList(writePreparationBrief.execution_order)}` : '',
    writePreparationBrief ? '写前准备回执：最终 JSON 必须在 oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks 中逐项说明来源缺口、文风召回缺口和副对标边界、资产风险、上一轮待修复、滚动节奏预检 rolling_rhythm_preflight、创作契约清单 creation_contract_checklist、蓝图焦点和读者回报是否已在 chapter_text 中兑现；每项包含 key,label,delivered,evidence,remaining_risk，evidence 必须引用正文可定位动作、对话或信息变化。' : '',
    '',
  ]
}

export function buildChapterBlueprintPromptSection(options: {
  chapterBlueprint: any
  beatDensityContract?: any
  smallOutlineContract?: any
  outlineMethodsContract?: any
  mainlineDefinitionContract?: any
  beatDensityFallbackRule?: string
}) {
  const {
    chapterBlueprint,
    beatDensityContract,
    smallOutlineContract,
    outlineMethodsContract,
    mainlineDefinitionContract,
    beatDensityFallbackRule = '',
  } = options
  const causalChainContract = chapterBlueprint?.causal_chain_contract
  const fiveStepOutline = outlineMethodsContract?.five_step_outline
  const eightNodeStoryStructure = outlineMethodsContract?.eight_node_story_structure
  return [
    chapterBlueprint ? '【章节蓝图合同】' : '',
    chapterBlueprint ? '硬性要求：必须先执行 chapter_target.chapter_blueprint，再展开正文。它是本章写作合同，优先级高于散落的材料摘要；正文必须按目标情绪、开篇钩子、核心回报、五段式内容概括、多线推进、人物出场顺序、情节点功能标签、代价/收益和章尾承接来组织。' : '',
    causalChainContract ? '五幕式因果链：按种子 -> 生长 -> 转折 -> 冲刺 -> 完成组织本章；开局埋因，发展让果变下一因，转折必须让冲突性质质变，行动进入白热化，结局收束并埋下一因。不能跳步、不能乱序。' : '',
    causalChainContract?.act_functions ? `五幕功能：${Object.values(causalChainContract.act_functions).filter(Boolean).join('；')}` : '',
    causalChainContract?.quality_checks?.length ? `五幕检查：${joinList(causalChainContract.quality_checks)}` : '',
    beatDensityContract ? `情节点密度：${beatDensityContract.rule || beatDensityFallbackRule}` : '',
    beatDensityContract ? `密度预算：本章目标 ${beatDensityContract.target_word_count || '?'} 字，建议 ${beatDensityContract.min_beat_count || '?'}-${beatDensityContract.max_beat_count || '?'} 个情节点，目标 ${beatDensityContract.target_beat_count || '?'} 个；当前蓝图 ${beatDensityContract.current_beat_count || 0} 个，缺口 ${beatDensityContract.density_gap || 0} 个。` : '',
    beatDensityContract?.execution_rules?.length ? `密度执行规则：${joinList(beatDensityContract.execution_rules)}` : '',
    smallOutlineContract ? '小纲四步法：执行 chapter_target.chapter_blueprint.small_outline_contract，先分段判断，再标注目的和效果，再按详写/略写分配篇幅，最后用 quick_locator 快速定位正文证据。' : '',
    smallOutlineContract?.steps?.length ? `小纲步骤：${joinList(smallOutlineContract.steps)}` : '',
    smallOutlineContract?.purpose_effect_rules?.length ? `目的和效果规则：${joinList(smallOutlineContract.purpose_effect_rules)}` : '',
    smallOutlineContract?.detail_rules?.length ? `详写/略写规则：${joinList(smallOutlineContract.detail_rules)}` : '',
    smallOutlineContract?.locator_rules?.length ? `快速定位规则：${joinList(smallOutlineContract.locator_rules)}` : '',
    outlineMethodsContract ? '【大纲方法合同】' : '',
    outlineMethodsContract ? '硬性要求：执行 chapter_target.chapter_blueprint.outline_methods_contract；先用五步大纲创建法校验本章位置，再用八节点故事结构、爽文五阶段小循环、情绪拉扯五折线和五项驱动检查组织正文，最后用相似度防重复和倒推规则检查是否换了冲突、金手指用法、情绪收益和章尾形态。' : '',
    outlineMethodsContract?.method_route?.length ? `大纲方法路线：${joinList(outlineMethodsContract.method_route)}` : '',
    fiveStepOutline?.steps?.length ? `五步大纲创建法：${joinList(fiveStepOutline.steps)}` : '',
    fiveStepOutline?.story_lines?.length ? `八条故事线预埋：${joinList(fiveStepOutline.story_lines)}` : '',
    fiveStepOutline?.opening_sequence?.length ? `开局阶段序列：${joinList(fiveStepOutline.opening_sequence, ' -> ')}` : '',
    fiveStepOutline?.ending_rules?.length ? `结尾规则：${joinList(fiveStepOutline.ending_rules)}` : '',
    eightNodeStoryStructure?.selected_node ? `八节点故事结构：本章角色=${eightNodeStoryStructure.selected_node}` : '',
    eightNodeStoryStructure?.nodes?.length ? `八节点序列：${joinList(eightNodeStoryStructure.nodes)}` : '',
    eightNodeStoryStructure?.payoff_rhythm?.length ? `回报节奏：${joinList(eightNodeStoryStructure.payoff_rhythm)}` : '',
    outlineMethodsContract?.sweet_cycle_stages?.length ? `爽文五阶段小循环：${joinList(outlineMethodsContract.sweet_cycle_stages)}` : '',
    outlineMethodsContract?.emotion_zigzag_stages?.length ? `情绪拉扯五折线：${joinList(outlineMethodsContract.emotion_zigzag_stages)}` : '',
    outlineMethodsContract?.five_drive_checks?.length ? `五项驱动检查：${joinList(outlineMethodsContract.five_drive_checks)}` : '',
    outlineMethodsContract?.detail_outline_rules?.length ? `细纲规则：${joinList(outlineMethodsContract.detail_outline_rules)}` : '',
    outlineMethodsContract?.similarity_guardrails?.length ? `相似度防重复：${joinList(outlineMethodsContract.similarity_guardrails)}` : '',
    outlineMethodsContract?.reverse_design_rules?.length ? `倒推设计：${joinList(outlineMethodsContract.reverse_design_rules)}` : '',
    outlineMethodsContract?.quality_checks?.length ? `大纲方法检查：${joinList(outlineMethodsContract.quality_checks)}` : '',
    outlineMethodsContract ? '交稿自检必须输出 outline_methods_checks，逐项说明五步大纲、八节点、小循环、情绪五折线、五项驱动、详略比例和相似度防重复是否在 chapter_text 中兑现；证据必须引用正文动作、对话、信息变化或章尾钩子。' : '',
    mainlineDefinitionContract ? '【主线定义合同】' : '',
    mainlineDefinitionContract ? '硬性要求：执行 chapter_target.chapter_blueprint.mainline_definition_contract；主线不等于升级，主线是一件事，不是一个元素，升级是主角达成目标的行动。' : '',
    mainlineDefinitionContract?.mainline_event ? `本章主线事件 mainline_event：${mainlineDefinitionContract.mainline_event}` : '',
    mainlineDefinitionContract?.action_role ? `升级/金手指/地图/资源角色：${mainlineDefinitionContract.action_role}` : '',
    mainlineDefinitionContract?.definition_rules?.length ? `主线定义规则：${joinList(mainlineDefinitionContract.definition_rules)}` : '',
    mainlineDefinitionContract?.action_rules?.length ? `行动规则：${joinList(mainlineDefinitionContract.action_rules)}` : '',
    mainlineDefinitionContract?.handoff_rules?.length ? `承接规则：${joinList(mainlineDefinitionContract.handoff_rules)}` : '',
    mainlineDefinitionContract?.quality_checks?.length ? `主线检查：${joinList(mainlineDefinitionContract.quality_checks)}` : '',
    chapterBlueprint ? 'beat_sequence.function_tag 决定每个情节点展开或带过：关键揭露/打脸/高潮/爽点必须展开；过渡/赶路/信息交代必须压缩。' : '',
    chapterBlueprint ? '执行方式：爽点/高潮出手前必须铺出可指认的危机或期待；装逼、打脸、揭露或反证章必须写出在场角色的差异化反应；过场点带过，卖点/回报点展开，不得均匀注水。' : '',
    chapterBlueprint ? JSON.stringify(chapterBlueprint, null, 2).slice(0, 5000) : '',
    '',
  ]
}

export function buildPlatformRubricPromptSection(platformRubric: any) {
  return [
    platformRubric ? '【平台审查基准】' : '',
    platformRubric ? '硬性要求：执行 chapter_target.platform_rubric；这是来自 oh-story story-review 的平台化审查口径，写正文时必须按目标平台优先级组织开篇、节奏、回报和章末拉力。' : '',
    platformRubric?.platform ? `Rubric: ${platformRubric.platform}` : '',
    platformRubric?.source ? `Rubric Source: ${platformRubric.source}` : '',
    platformRubric?.label ? `目标平台：${platformRubric.label}` : '',
    platformRubric?.checks?.length ? `平台检查项：${joinList(platformRubric.checks)}` : '',
    platformRubric?.revision_priorities?.length ? `修订优先级：${joinList(platformRubric.revision_priorities)}` : '',
    platformRubric ? JSON.stringify(platformRubric, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildContentRubricPromptSection(contentRubric: any) {
  return [
    contentRubric ? '【通用网文质量基准】' : '',
    contentRubric ? '硬性要求：执行 chapter_target.content_rubric；这是来自 oh-story story-review 的通用内容审查口径，写正文时必须让核心卖点、冲突推进、情绪曲线、剧情循环、角色动机、设定一致性和文字自然度落到正文证据。' : '',
    contentRubric?.source ? `Rubric Source: ${contentRubric.source}` : '',
    contentRubric?.label ? `内容基准：${contentRubric.label}` : '',
    contentRubric?.checks?.length ? `内容检查项：${joinList(contentRubric.checks)}` : '',
    contentRubric?.golden_questions?.length ? `黄金三问：${joinList(contentRubric.golden_questions)}` : '',
    contentRubric?.revision_priorities?.length ? `修订优先级：${joinList(contentRubric.revision_priorities)}` : '',
    contentRubric ? '交稿自检必须输出 content_rubric_checks，并用正文证据回答黄金三问。' : '',
    contentRubric ? JSON.stringify(contentRubric, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildTargetReaderPromptSection(targetReaderContract: any) {
  return [
    targetReaderContract ? '【目标读者合同】' : '',
    targetReaderContract ? '硬性要求：执行 chapter_target.target_reader_contract；这是来自 oh-story plot-core-methods 的自嗨判定法，正文必须清楚写给谁、满足目标读者想看的内容，并让本章卖点落到读者可感知的场景。' : '',
    targetReaderContract ? '执行方式：如果“我这书写给谁看 / 目标读者想看什么 / 本书本章给了什么”三问任一答不清，必须调整场景、冲突、信息释放或回报方式，不得用作者自嗨设定替代读者收益；同时按情绪缺口分析，把核心痛苦、深层情结、高频情绪关键词和未满足需求写成角色当下压力与读者回报。' : '',
    targetReaderContract?.reader_profile ? `目标读者画像：${targetReaderContract.reader_profile}` : '',
    targetReaderContract?.reader_desires?.length ? `读者想看：${joinList(targetReaderContract.reader_desires)}` : '',
    targetReaderContract?.emotional_gap_analysis?.length ? `情绪缺口：${joinList(targetReaderContract.emotional_gap_analysis)}` : '',
    targetReaderContract?.chapter_attractions?.length ? `本章命中点：${joinList(targetReaderContract.chapter_attractions)}` : '',
    targetReaderContract?.genre_vitality_rules?.length ? `题材生命力：${joinList(targetReaderContract.genre_vitality_rules)}` : '',
    targetReaderContract?.platform_fit_rules?.length ? `平台适配：${joinList(targetReaderContract.platform_fit_rules)}` : '',
    targetReaderContract?.boundary_fit_rules?.length ? `题材边界：${joinList(targetReaderContract.boundary_fit_rules)}` : '',
    targetReaderContract?.title_blurb_alignment_rules?.length ? `书名简介一致：${joinList(targetReaderContract.title_blurb_alignment_rules)}` : '',
    targetReaderContract?.immersion_plasticity_rules?.length ? `代入感/塑料感：${joinList(targetReaderContract.immersion_plasticity_rules)}` : '',
    targetReaderContract?.goldfinger_life_fit_rules?.length ? `金手指生活关联：${joinList(targetReaderContract.goldfinger_life_fit_rules)}` : '',
    targetReaderContract?.commercial_expression_rules?.length ? `商业表达：${joinList(targetReaderContract.commercial_expression_rules)}` : '',
    targetReaderContract?.validation_questions?.length ? `自嗨判定三问：${joinList(targetReaderContract.validation_questions)}` : '',
    targetReaderContract?.correction_methods?.length ? `纠偏方法：${joinList(targetReaderContract.correction_methods)}` : '',
    targetReaderContract?.quality_checks?.length ? `质量检查：${joinList(targetReaderContract.quality_checks)}` : '',
    targetReaderContract ? '交稿自检必须输出 target_reader_checks，并用正文证据检查目标读者画像、读者渴望、情绪缺口、本章命中点、题材生命力、目标平台样本、题材边界、书名简介内容三位一体、代入感/塑料感、金手指生活关联、商业表达和自嗨风险。' : '',
    targetReaderContract ? JSON.stringify(targetReaderContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildReaderContractProgressionPromptSection(readerContractProgression: any) {
  if (!readerContractProgression) return []
  return [
    '【读者契约 + 终局储备】',
    '硬性要求：执行 reader_contract_progression / ending_reserve；禁止提前打光终局底牌与升级台阶，主角须保有因果权与结算权，单章可放开爽感密度。',
    readerContractProgression.reader_promise ? `读者契约：${readerContractProgression.reader_promise}` : '',
    readerContractProgression.current_risk?.level ? `当前风险：${readerContractProgression.current_risk.level}` : '',
    readerContractProgression.ending_reserve?.capacity_check?.note ? `台阶容量：${readerContractProgression.ending_reserve.capacity_check.note}` : '',
    readerContractProgression.quality_checks?.length ? `检查：${joinList(readerContractProgression.quality_checks)}` : '',
    JSON.stringify(readerContractProgression, null, 2).slice(0, 2200),
    '',
  ]
}

export function buildGenreProseCardPromptSection(genreProseCardContract: any) {
  const card = genreProseCardContract?.card
  if (!card) return []
  return [
    '【题材散文卡】',
    `硬性要求：执行题材散文卡《${card.title}》：${card.core}；冲突按 ${card.conflict_engine}；禁止 ${card.forbidden_drift}`,
    `主线目标：${card.main_goal || ''}`,
    `爽点定位：${card.payoff_focus || ''}`,
    `正文落点：${card.prose_landing || ''}`,
    genreProseCardContract.quality_checks?.length ? `检查：${joinList(genreProseCardContract.quality_checks)}` : '',
    '',
  ]
}

export function buildGenrePositioningPromptSection(genrePositioningContract: any) {
  return [
    genrePositioningContract ? '【题材定位合同】' : '',
    genrePositioningContract ? '硬性要求：执行 chapter_target.genre_positioning_contract；这是来自 oh-story 题材/读者/核心机制定位口径，正文必须让题材标签、读者心理、核心梗、金手指、必备场景、题材长板和平台口味保持同一承诺。' : '',
    genrePositioningContract ? '执行方式：先确认本章是否交付类型文公式，再写场景；如果题材标签、核心梗、主角处境或金手指反馈错位，必须调整冲突、奖励、场景功能或章末钩子，禁止挂羊头卖狗肉；同时拉长板而非补短板，优先强化题材长板、核心卖点、目标情绪和最高频爽点，不得新增稀释核心卖点的旁枝支线。' : '',
    genrePositioningContract?.genre_label ? `题材标签：${genrePositioningContract.genre_label}` : '',
    genrePositioningContract?.reader_psychology?.length ? `读者心理：${joinList(genrePositioningContract.reader_psychology)}` : '',
    genrePositioningContract?.genre_formula?.length ? `题材公式：${joinList(genrePositioningContract.genre_formula)}` : '',
    genrePositioningContract?.core_hook_rules?.length ? `核心梗规则：${joinList(genrePositioningContract.core_hook_rules)}` : '',
    genrePositioningContract?.goldfinger_fit_rules?.length ? `金手指贴合：${joinList(genrePositioningContract.goldfinger_fit_rules)}` : '',
    genrePositioningContract?.micro_innovation_rules?.length ? `微创新边界：${joinList(genrePositioningContract.micro_innovation_rules)}` : '',
    genrePositioningContract?.micro_innovation_702010_rules?.length ? `70/20/10元素法则：${joinList(genrePositioningContract.micro_innovation_702010_rules)}` : '',
    genrePositioningContract?.micro_innovation_methods?.length ? `五种微创新手法：${joinList(genrePositioningContract.micro_innovation_methods)}` : '',
    genrePositioningContract?.longboard_focus_rules?.length ? `长板聚焦：${joinList(genrePositioningContract.longboard_focus_rules)}` : '',
    genrePositioningContract?.must_have_scenes?.length ? `必备场景：${joinList(genrePositioningContract.must_have_scenes)}` : '',
    genrePositioningContract?.platform_fit_rules?.length ? `平台/题材适配：${joinList(genrePositioningContract.platform_fit_rules)}` : '',
    genrePositioningContract?.quality_checks?.length ? `genre_positioning_checks：${joinList(genrePositioningContract.quality_checks)}` : '',
    genrePositioningContract ? '交稿自检必须输出 genre_positioning_checks，并用正文证据检查题材标签、核心梗、类型公式、金手指贴合、必备场景、微创新边界、70/20/10元素法则、五种微创新手法、长板聚焦和书名简介内容三位一体。' : '',
    genrePositioningContract ? JSON.stringify(genrePositioningContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildPlotSpecialTopicsPromptSection(plotSpecialTopicsContract: any) {
  return [
    plotSpecialTopicsContract ? '【特殊题材操作合同】' : '',
    plotSpecialTopicsContract ? '硬性要求：执行 chapter_target.plot_special_topics_contract；这是来自 oh-story plot-special-topics 的特殊题材操作口径，正文必须把命中的金手指、题材边界、扫榜对标、都市高武、三万字卡点、阵营手牌等规则写成可见事件。' : '',
    plotSpecialTopicsContract ? '执行方式：只启用 matched_topics 命中的专题，但质量检查全局执行；金手指要拆成可循环行动机制，题材边界不能越界创新，三万字卡点要倒推阶段目标，阵营手牌要按实力和立场逐级出牌。' : '',
    plotSpecialTopicsContract?.matched_topics?.length ? `matched_topics：${joinList(plotSpecialTopicsContract.matched_topics)}` : '',
    plotSpecialTopicsContract?.goldfinger_design_rules?.length ? `goldfinger_execution：${joinList(plotSpecialTopicsContract.goldfinger_design_rules)}` : '',
    plotSpecialTopicsContract?.genre_boundary_rules?.length ? `genre_boundary_execution：${joinList(plotSpecialTopicsContract.genre_boundary_rules)}` : '',
    plotSpecialTopicsContract?.market_benchmark_rules?.length ? `market_benchmark_execution：${joinList(plotSpecialTopicsContract.market_benchmark_rules)}` : '',
    plotSpecialTopicsContract?.urban_high_martial_rules?.length ? `urban_high_martial_execution：${joinList(plotSpecialTopicsContract.urban_high_martial_rules)}` : '',
    plotSpecialTopicsContract?.launch_checkpoint_rules?.length ? `launch_checkpoint_execution：${joinList(plotSpecialTopicsContract.launch_checkpoint_rules)}` : '',
    plotSpecialTopicsContract?.faction_hand_rules?.length ? `faction_hand_execution：${joinList(plotSpecialTopicsContract.faction_hand_rules)}` : '',
    plotSpecialTopicsContract?.quality_checks?.length ? `plot_special_topics_checks：${joinList(plotSpecialTopicsContract.quality_checks)}` : '',
    plotSpecialTopicsContract ? '交稿自检必须输出 plot_special_topics_checks，并用正文证据检查 matched_topics、goldfinger_execution、genre_boundary_execution、market_benchmark_execution、urban_high_martial_execution、launch_checkpoint_execution 和 faction_hand_execution。' : '',
    plotSpecialTopicsContract ? JSON.stringify(plotSpecialTopicsContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildFemaleAudiencePromptSection(femaleAudienceContract: any) {
  return [
    femaleAudienceContract ? '【女频长篇合同】' : '',
    femaleAudienceContract ? '硬性要求：执行 chapter_target.female_audience_contract；这是来自 oh-story female-audience-writing 的女频长篇口径，正文必须让安全感、代入感、女主主动性和主情绪产品落到场景行动中。' : '',
    femaleAudienceContract ? '执行方式：先确认女主是否自己做决定、是否有安全感锚点、感情线双轴是否踩到事业/成长节点、虐后是否给反转或糖、书名简介正文是否货板一致。' : '',
    femaleAudienceContract?.core_principles?.length ? `女频核心原则：${joinList(femaleAudienceContract.core_principles)}` : '',
    femaleAudienceContract?.reader_need_rules?.length ? `深层需求：${joinList(femaleAudienceContract.reader_need_rules)}` : '',
    femaleAudienceContract?.copy_promise_rules?.length ? `文案/正文承诺：${joinList(femaleAudienceContract.copy_promise_rules)}` : '',
    femaleAudienceContract?.longform_genre_rules?.length ? `长线题材规则：${joinList(femaleAudienceContract.longform_genre_rules)}` : '',
    femaleAudienceContract?.romance_axis_rules?.length ? `感情线双轴：${joinList(femaleAudienceContract.romance_axis_rules)}` : '',
    femaleAudienceContract?.abuse_dosage_rules?.length ? `虐戏剂量：${joinList(femaleAudienceContract.abuse_dosage_rules)}` : '',
    femaleAudienceContract?.platform_fit_rules?.length ? `女频平台对位：${joinList(femaleAudienceContract.platform_fit_rules)}` : '',
    femaleAudienceContract?.quality_checks?.length ? `female_audience_checks：${joinList(femaleAudienceContract.quality_checks)}` : '',
    femaleAudienceContract ? '交稿自检必须输出 female_audience_checks，并用正文证据检查安全感、代入感、女主主动性、主情绪、感情线双轴、虐戏剂量、平台对位和货板一致。' : '',
    femaleAudienceContract ? JSON.stringify(femaleAudienceContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildUpgradeRhythmPromptSection(upgradeRhythmContract: any) {
  return [
    upgradeRhythmContract ? '【升级节奏合同】' : '',
    upgradeRhythmContract ? '硬性要求：执行 chapter_target.upgrade_rhythm_contract；这是来自 oh-story outline-rhythm / commercial-core-methods 的升级感三步法与桥段节奏口径，正文必须让起点、终点、情绪缺口、即时反馈、延迟反馈和升级后变化可见。' : '',
    upgradeRhythmContract ? '执行方式：升级前先铺待遇差距、资源难度或被轻视；升级中给行动反馈；升级后展示以前做不到的能力/地位/资源/关系变化，并立刻引入更大危机、新门槛或下一目标。' : '',
    upgradeRhythmContract ? '金手指演进：核心作用可发展但不能突然换赛道；只能增加新的使用方式、联动系统或应用场景，不能彻底抛弃原核心作用；升华到世界/天道/规则层级前必须有伏笔。' : '',
    upgradeRhythmContract ? '金手指 + 矛盾：金手指必须刚好解决当前矛盾；太强会一键清场变无聊，太弱会让读者焦虑；解决当前矛盾后必须暴露更大矛盾、更高门槛或下一目标。' : '',
    upgradeRhythmContract ? '金手指反馈法：给出金手指后必须有即时变化；把金手指带来变化的过程掺杂在故事里，用动作、判断、物件变化、角色反应或局势变化展示反馈；金手指可以替换故事流程中的一个环节，但不能替代全部行动链。' : '',
    upgradeRhythmContract ? '金手指简单是核心：功能、触发条件、奖励反馈和升级规则必须一眼就懂；本章只展示一种核心用法，不能写成说明书、规则树或万能外挂。' : '',
    upgradeRhythmContract ? '金手指多维成长：不要只写品质/数值/等级提升；至少让词条、功能、品质、熟练度或条件-反馈中的两条线同步变化，条件升级后可解锁新功能、子能力或新的应用场景。' : '',
    upgradeRhythmContract ? '排行榜/榜单：如果本章出现排名、榜单或位阶参照，必须让它提供升级动力、介绍新对手，并产生装逼余震；排名提升后要让读者期待下一名次、下一碰撞或后续资源变化，不能只写一个名次数字。' : '',
    upgradeRhythmContract?.upgrade_gap?.length ? `升级前缺口：${joinList(upgradeRhythmContract.upgrade_gap)}` : '',
    upgradeRhythmContract?.upgrade_gain_plan?.length ? `升级后变化：${joinList(upgradeRhythmContract.upgrade_gain_plan)}` : '',
    upgradeRhythmContract?.feedback_loop?.length ? `反馈循环：${joinList(upgradeRhythmContract.feedback_loop)}` : '',
    upgradeRhythmContract?.emotion_modules?.length ? `情绪模块：${joinList(upgradeRhythmContract.emotion_modules)}` : '',
    upgradeRhythmContract?.bridge_rhythm?.length ? `桥段节奏：${joinList(upgradeRhythmContract.bridge_rhythm)}` : '',
    upgradeRhythmContract?.goldfinger_conflict_balance_rules?.length ? `金手指矛盾匹配：${joinList(upgradeRhythmContract.goldfinger_conflict_balance_rules)}` : '',
    upgradeRhythmContract?.goldfinger_feedback_rules?.length ? `金手指反馈法：${joinList(upgradeRhythmContract.goldfinger_feedback_rules)}` : '',
    upgradeRhythmContract?.goldfinger_simplicity_rules?.length ? `金手指简单清晰：${joinList(upgradeRhythmContract.goldfinger_simplicity_rules)}` : '',
    upgradeRhythmContract?.goldfinger_multi_dimension_growth_rules?.length ? `金手指多维成长：${joinList(upgradeRhythmContract.goldfinger_multi_dimension_growth_rules)}` : '',
    upgradeRhythmContract?.ranking_ladder_rules?.length ? `榜单升级动力：${joinList(upgradeRhythmContract.ranking_ladder_rules)}` : '',
    upgradeRhythmContract?.quality_checks?.length ? `upgrade_rhythm_checks：${joinList(upgradeRhythmContract.quality_checks)}` : '',
    upgradeRhythmContract ? '交稿自检必须输出 upgrade_rhythm_checks，并用正文证据检查升级感三步法、升级前后铺垫、即时反馈、延迟反馈、桥段功能位、升级速度、新危机/新门槛、金手指演进、金手指反馈法、金手指简单清晰、金手指多维成长和榜单升级动力。' : '',
    upgradeRhythmContract ? JSON.stringify(upgradeRhythmContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildConflictStructurePromptSection(conflictStructureContract: any) {
  return [
    conflictStructureContract ? '【冲突结构合同】' : '',
    conflictStructureContract ? '每个主要场景用场上具体阻力回答：谁或什么规则在拦主角得到他要的东西。不要把纵向矛盾/横向矛盾/三层矛盾网这些词写进正文。' : '',
    conflictStructureContract?.conflict_ladder?.length ? `冲突阶梯：${joinList(conflictStructureContract.conflict_ladder)}` : '',
    conflictStructureContract?.motivation_sources?.length ? `动机来源：${joinList(conflictStructureContract.motivation_sources)}` : '',
    conflictStructureContract?.antagonist_pressure_rules?.length ? `对抗规则：${joinList(conflictStructureContract.antagonist_pressure_rules)}` : '',
    conflictStructureContract?.protagonist_agency_rules?.length ? `主角行动力：${joinList(conflictStructureContract.protagonist_agency_rules)}` : '',
    conflictStructureContract?.event_value_changes?.length ? `价值变化：${joinList(conflictStructureContract.event_value_changes)}` : '',
    conflictStructureContract?.next_conflict_seeds?.length ? `下一冲突种子：${joinList(conflictStructureContract.next_conflict_seeds)}` : '',
    conflictStructureContract?.conflict_network_layers ? `三层矛盾：纵向=${conflictStructureContract.conflict_network_layers.vertical_conflict || ''}；横向=${conflictStructureContract.conflict_network_layers.horizontal_conflict || ''}；交叉=${conflictStructureContract.conflict_network_layers.cross_conflict || ''}；编织=${joinList(asArray(conflictStructureContract.conflict_network_layers.weaving_order), ' -> ')}` : '',
    conflictStructureContract?.conflict_web ? `矛盾网：活跃线=${joinList(asArray(conflictStructureContract.conflict_web.active_lines), '、')}；关联规则=${joinList(conflictStructureContract.conflict_web.link_rules)}；激活规则=${joinList(conflictStructureContract.conflict_web.activation_rules)}` : '',
    conflictStructureContract?.no_exit_rules?.length ? `有进无出/黏结剂：${joinList(conflictStructureContract.no_exit_rules)}` : '',
    conflictStructureContract?.quality_checks?.length ? `conflict_structure_checks：${joinList(conflictStructureContract.quality_checks)}` : '',
    conflictStructureContract ? JSON.stringify(conflictStructureContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStoryLoopPromptSection(storyLoopContract: any) {
  return [
    storyLoopContract ? '【故事循环合同】' : '',
    storyLoopContract ? '硬性要求：执行 chapter_target.story_loop_contract；这是来自 oh-story plot-core-methods 的卡文对策与剧情循环口径，正文必须让题材 + 金手指 + 主角身份统一成可持续循环模式。' : '',
    storyLoopContract ? '执行方式：本章必须推进一次循环，明确循环燃料、行动反馈和下一轮燃料；地图资源闭环、地位环境同步和换地图吸引力不能被正文写丢。' : '',
    storyLoopContract ? '换地图承接：换地图/换阶段时，旧地图核心冲突先阶段性解决；新地图必须有新环境、新角色、新规则、新目标、新冲突；前5章快速建立代入感和期待，保留贯穿主线，不一刀切抛弃旧角色，不一次性倒完新设定；必须做到人际关系先行：人际关系动了 -> 主角再动。' : '',
    storyLoopContract ? '循环嵌套：按小循环 -> 中循环 -> 大循环组织长篇推进；本章小循环必须铺垫大循环的期待，同一核心卖点的不同角度/不同矛盾要持续推进，不能只反复用同一个梗换对象。' : '',
    storyLoopContract?.loop_formula ? `循环公式：${storyLoopContract.loop_formula}` : '',
    storyLoopContract?.core_elements?.length ? `核心三要素：${joinList(storyLoopContract.core_elements)}` : '',
    storyLoopContract?.loop_mode ? `循环模式：${storyLoopContract.loop_mode}` : '',
    storyLoopContract?.loop_fuel ? `循环燃料：${storyLoopContract.loop_fuel}` : '',
    storyLoopContract?.loop_steps?.length ? `循环步骤：${joinList(storyLoopContract.loop_steps, ' -> ')}` : '',
    storyLoopContract?.map_resource_loop?.length ? `地图资源闭环：${joinList(storyLoopContract.map_resource_loop)}` : '',
    storyLoopContract?.escalation_rules?.length ? `升级/换地图规则：${joinList(storyLoopContract.escalation_rules)}` : '',
    storyLoopContract?.map_transition_rules?.length ? `换地图承接：${joinList(storyLoopContract.map_transition_rules)}` : '',
    storyLoopContract?.nested_loop_rules?.length ? `循环嵌套规则：${joinList(storyLoopContract.nested_loop_rules)}` : '',
    storyLoopContract?.quality_checks?.length ? `质量检查：${joinList(storyLoopContract.quality_checks)}` : '',
    storyLoopContract ? '交稿自检必须输出 story_loop_checks，并用正文证据检查循环模式、循环燃料、反馈与下一轮燃料、地图资源闭环、地位环境同步、换地图承接和循环嵌套期待。' : '',
    storyLoopContract ? JSON.stringify(storyLoopContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

