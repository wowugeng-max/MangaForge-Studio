function asArray(value: any) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function joinList(value: any, separator = '；') {
  return asArray(value).filter(Boolean).join(separator)
}

function compactPromptText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniquePromptStrings(values: any, limit = 6) {
  const seen = new Set<string>()
  return asArray(values)
    .map((item: any) => compactPromptText(item))
    .filter((item: string) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, limit)
}

const OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS = [
  'pov_rules',
  'expression_rules/body_detail_rules',
  'scene_weaving_rules',
  'subject_name_rhythm_rules',
  'indirect_description_rules',
  'three_camera_rules',
  'then_what_rules',
  'core_emotion_alignment_rules',
  'baimiao_sensory_rules',
  'dynamic_description_rules',
  'shot_rhythm_rules',
  'transition_bridge_rules',
  'rhythm_rules',
  'object_number_rules',
  'section_structure_rules',
  'section_density_rules',
  'anti_padding_rules',
  'concept_anchor_rules',
  'description_limits',
  'anti_ai_smell_rules',
  'quality_checks',
]

function compactProseCraftItems(values: any, limit = 2) {
  return asArray(values)
    .map((item: any) => compactPromptText(item))
    .filter(Boolean)
    .slice(0, limit)
    .join('；')
}

function formatProseCraftPromptSnippet(contract: any = {}) {
  const sceneAnchors = compactProseCraftItems(contract.scene_anchors || contract.sceneAnchors, 6)
  const qualityChecks = compactProseCraftItems(contract.quality_checks || contract.qualityChecks, 4)
  return [
    '硬性要求：执行 chapter_target.prose_craft_contract；这是来自 oh-story writing-craft/style-craft 的正文工艺短口径，正文必须用可见动作、身体细节、感官锚点、物件/数字和镜头节奏交付情绪。',
    '写作四要点：深度限知；身体细节替代情绪词；三维度揉进（发生/感知/身体反应）；一动一静控制节奏，关键道具和具体数字必须承担剧情或情绪功能。',
    '字段口径：subject_name_rhythm_rules=主语与名字节奏，段首、场景切换、多人同场、视角重置点名，同一动作链/同一段内部段中用代词/省略流动，优先用“他/她”、动作承接或省略主语，不要连续多句都以同一角色名开头，避免每句报名字和指代不清；indirect_description_rules=间接描写法，正面描写只是铺垫，侧面反应才是爽点，不要直接宣布，用配角动作/围观者判断/对手失态/环境变化证明。',
    '镜头口径：three_camera_rules=三机位法，机位1贴主角近景动作/表情/身体感受，机位2给外部反应或环境反馈，机位3只补冲突触发的必要设定；shot_rhythm_rules=镜头与分镜思维，远景/中景/近景/特写按信息、关系、风险和情绪变化切换，冲突用短句、短段、密集动作。',
    '推进口径：then_what_rules=“然后呢”基点法，每段信息点后立刻接动作、发现、反应、选择、风险或新疑问；core_emotion_alignment_rules=核心情绪对齐，情节、人设、冲突和每个细节都服务本章情绪目标、读者回报或全书核心情绪。',
    '画面口径：baimiao_sensory_rules=白描/五感，用最少的字写准信息和情绪，关键场景两到三种感官且必须服务情绪、动作、规则或危险；dynamic_description_rules=动态描写优于静态描写，人物用动作和反应展现，环境在角色行动中穿插点染。',
    '转场与小节：transition_bridge_rules=场景切换与转场，用相似物/相似五感/相似情绪，时间跳转靠动作或物件，空间跳转靠声音或光影；section_structure_rules=小节内部结构，一个主事件 + 3-5 个子事件 + 一个情绪变化 + 一条读者新获知的信息 + 必要 3-5 轮对话交锋，小节结尾留一个钩子，下一节开头快速接续，情绪跨节递进。',
    '控水与新概念：section_density_rules=小节密度诊断，偏短不得加环境描写，先查子事件三维度，再补身体动作、感官细节、对话交锋、阻碍/反应/发现/递进或 2-3 句简短回忆；concept_anchor_rules=新概念锚点，新名词/新设定/新道具首次出现必须有动作反应、对话半句或物理后果；description_limits=水分控制，删掉这段后读者不会困惑的环境、心理、旁白、回忆和重复信息必须删除或压缩。',
    '去AI味：anti_ai_smell_rules=扫描高危词、章末总结体、叠加式描写和心理告知；仿佛/犹如/一丝/一抹/深吸一口气/眼中闪过/嘴角勾起等模板表达高频出现时改成动作、物件、对话或白描。',
    `字段清单：${OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS.join(', ')}；交稿自检必须输出 prose_craft_checks，并用正文证据检查深度限知、身体细节、三维度揉进、间接描写/侧面反应、三机位、然后呢、核心情绪、白描五感、动态描写、镜头转场、小节结构、新概念锚点、水分控制和去AI味。`,
    sceneAnchors ? `本章工艺锚点：${sceneAnchors}` : '',
    qualityChecks ? `prose_craft_checks 摘录：${qualityChecks}` : '',
  ].filter(Boolean)
}

function formatQualityAuditPhaseChecklist(items: any[] = []) {
  return asArray(items)
    .map((item: any) => {
      const phase = compactPromptText(item?.phase)
      const receipts = uniquePromptStrings(item?.receipt_keys || item?.receiptKeys || [], 6)
      if (!phase || !receipts.length) return ''
      return `${phase} -> ${receipts.join('/')}`
    })
    .filter(Boolean)
    .join('；')
}

function formatDialogueExecutionChecklist(items: any) {
  return asArray(items)
    .map((item: any) => [
      `场景${item.scene_no ?? item.sceneNo ?? ''} ${compactPromptText(item.scene)}`.trim(),
      item.mode ? `mode=${item.mode}` : '',
      asArray(item.speaker_agendas || item.speakerAgendas).length ? `speaker_agendas=${joinList(item.speaker_agendas || item.speakerAgendas, '/')}` : '',
      asArray(item.line_functions || item.lineFunctions).length ? `line_functions=${joinList(item.line_functions || item.lineFunctions, '/')}` : '',
      asArray(item.emotion_flow || item.emotionFlow).length ? `emotion_flow=${joinList(item.emotion_flow || item.emotionFlow, '/')}` : '',
      asArray(item.information_strategy || item.informationStrategy).length ? `information_strategy=${joinList(item.information_strategy || item.informationStrategy, '/')}` : '',
      asArray(item.voice_differentiation || item.voiceDifferentiation).length ? `voice_differentiation=${joinList(item.voice_differentiation || item.voiceDifferentiation, '/')}` : '',
      asArray(item.forbidden_patterns || item.forbiddenPatterns).length ? `forbidden=${joinList(item.forbidden_patterns || item.forbiddenPatterns, '/')}` : '',
      asArray(item.receipt_keys || item.receiptKeys).length ? `receipt_keys=${joinList(item.receipt_keys || item.receiptKeys, ',')}` : '',
    ].filter(Boolean).join('｜'))
    .filter(Boolean)
    .join('；')
}

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
    conflictStructureContract ? '硬性要求：执行 chapter_target.conflict_structure_contract；这是来自 oh-story outline-conflict 的矛盾与结构设计口径，正文必须让冲突成立、升级、有胜负结果，并让阻力真实阻止主角得到目标。' : '',
    conflictStructureContract ? '执行方式：每个主要场景都要回答“谁/什么规则在阻止主角得到他想要的东西”；冲突必须从言语/规则压迫推进到行动阻拦、激烈对抗或决定胜负；结尾必须留下下一冲突种子。' : '',
    conflictStructureContract ? '有进无出：读者必须相信主角非踏入不可；本章要明确死亡赌注/退出代价，并用杀人理由、工作职责、道德责任或实体场所作为黏结剂，让对立双方都无法轻易脱身。' : '',
    conflictStructureContract?.conflict_network_layers ? '三层矛盾网：长篇冲突必须同时保留纵向矛盾、横向矛盾、交叉矛盾；按定地图→定阵营→定角色编织，解决一层时牵动另一层。' : '',
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
    conflictStructureContract ? '交稿自检必须输出 conflict_structure_checks，并用正文证据检查有人阻止主角得到目标、有进无出/死亡赌注/黏结剂、言语->行动->激烈对抗->决定胜负、压势不压人、主角主动破局、明确结果、矛盾网、三层矛盾网和下一冲突种子；矛盾网要求同一时刻保持2-3条矛盾线，线与线之间有因果/利益冲突/信息差，解决一条后必须激活或加深另一条；三层矛盾网必须检查纵向/横向/交叉矛盾是否同时运作。' : '',
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

export function buildEmotionalArcPromptSection(emotionalArcContract: any) {
  return [
    emotionalArcContract ? '【情绪弧合同】' : '',
    emotionalArcContract ? '硬性要求：执行 chapter_target.emotional_arc_contract；这是来自 oh-story emotional-arc-design / plot-emotion-system 的情绪调动口径，正文必须让读者情绪经历平静 -> 调动 -> 释放 -> 爽，而不是只把事件写正确。' : '',
    emotionalArcContract ? '执行方式：先拉起压力、期待或“不该如此”，再用主角行动、信息揭示、态度转变或收获完成释放；闭环一个期待时必须同时开启下一期待，避免断期待。情绪三板斧也必须落地：羁绊铺设、情感撕裂、余韵钝痛都要有正文证据。' : '',
    emotionalArcContract ? '情绪拉扯曲线：可参考温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击，但不是所有故事都走完整曲线；按题材、章节阶段和目标读者截取有效段落。' : '',
    emotionalArcContract ? '题材情感策略：世情/爽文要快反弹和解气，情感/虐心要高羁绊密度和余韵，古言/复仇要因果报应，悬疑/推理要信息差，年代/亲情要代际冲突和温暖遗憾。' : '',
    emotionalArcContract ? '爽点倒推法：章纲先确定用什么方式让读者满足（爽点类型），再设计如何拉起期待（期待点），最后设计如何铺垫；正文呈现时按铺垫 -> 期待升高 -> 爽点释放回收。' : '',
    emotionalArcContract ? '装逼层级：日常小装逼只在大爽点间隙维持耐心；核心爽点必须切在主线目标上；偏离主线去别处装逼属于偏离爽点，必须删除或改成主线推进。' : '',
    emotionalArcContract ? '多爽点密度：不要拉长单个爽点的铺垫，而是多想几个爽点；每 800-1200 字至少交付一次信息增量、能力展示、危机反制、关系变化或小回收。' : '',
    emotionalArcContract ? '情绪模块重组：戏剧性会磨损，情绪不会磨损；同一种爽感可以重复，但不能重复同一个戏剧单元。复用套路时必须换场景、换对手、加新情绪或提高 stakes/奖励复杂度。' : '',
    emotionalArcContract ? '先入为主/第一印象：前100字必须让读者知道核心矛盾、主角处境或本章最重要的不公平/异常；先呈现的信息影响力更大，否定提前会放大否定感，信息顺序必须服务本章情绪判断。' : '',
    emotionalArcContract ? '峰终定律/结尾情绪强度：章尾情绪必须高于起点；按题材检查结尾情绪强度，虐≥8、爽≥7、治愈≥6；最后一击必须落成具体动作、对话或画面，禁止总结/反思/作者预告。' : '',
    emotionalArcContract ? '三层情绪：每个关键场景必须分清角色自己的情绪、文本传递的情绪、读者实际感受；角色在哭不等于读者要哭，角色屈辱/压迫/恐惧要转成读者的爽前蓄力、安全感、尊严感、期待感或余韵。' : '',
    emotionalArcContract ? '情绪反应结构：虐/悲壮/遗憾场景按前反应 -> 复现 -> 后反应执行；热血/逆袭场景按以小搏大执行，铺弱者之苦、强者到来、弱势方被救、士气如虹。' : '',
    emotionalArcContract ? '理念矛盾：关键场景不要只写利益争夺；把公平/权威、理想/现实、规则/人心等原则碰撞落成具体选择、代价、追求和牺牲。' : '',
    emotionalArcContract ? '递进对抗：主角与反派是角力而非碾压；每次小角力主角稍占上风，对手继续加码，最后主角王炸一锤定音。' : '',
    emotionalArcContract ? '梗四段式：以梗构建剧情必须完成发生 -> 发展 -> 转折 -> 高潮；用梗作为高潮点倒推剧情，不得从前提直接跳到高潮。' : '',
    emotionalArcContract ? '读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿；先让读者生出“不该如此”，再给希望/潜在解法，中段写行动和代价，最后兑现阶段回报并抛出新困境。' : '',
    emotionalArcContract?.emotion_formula ? `情绪公式：${emotionalArcContract.emotion_formula}` : '',
    emotionalArcContract?.arc_shape ? `弧线类型：${emotionalArcContract.arc_shape}` : '',
    emotionalArcContract?.scene_emotion_steps?.length ? `场景情绪步骤：${joinList(emotionalArcContract.scene_emotion_steps)}` : '',
    emotionalArcContract?.pressure_methods?.length ? `中段加压：${joinList(emotionalArcContract.pressure_methods)}` : '',
    emotionalArcContract?.payoff_types?.length ? `爽点类型：${joinList(emotionalArcContract.payoff_types)}` : '',
    emotionalArcContract?.payoff_reverse_design ? `爽点倒推法：${JSON.stringify(emotionalArcContract.payoff_reverse_design, null, 2).slice(0, 1200)}` : '',
    emotionalArcContract?.payoff_tier_rules?.length ? `装逼层级：${joinList(emotionalArcContract.payoff_tier_rules)}` : '',
    emotionalArcContract?.payoff_density_rules?.length ? `多爽点密度：${joinList(emotionalArcContract.payoff_density_rules)}` : '',
    emotionalArcContract?.emotion_module_recomposition_rules?.length ? `情绪模块重组：${joinList(emotionalArcContract.emotion_module_recomposition_rules)}` : '',
    emotionalArcContract?.payoff_escalation_rules?.length ? `爽点递增对比：${joinList(emotionalArcContract.payoff_escalation_rules)}` : '',
    emotionalArcContract?.scene_execution_rules?.length ? `场景情绪执行：${joinList(emotionalArcContract.scene_execution_rules)}` : '',
    emotionalArcContract?.expectation_rules?.length ? `期待规则：${joinList(emotionalArcContract.expectation_rules)}` : '',
    emotionalArcContract?.safety_rules?.length ? `安全规则：${joinList(emotionalArcContract.safety_rules)}` : '',
    emotionalArcContract?.bonding_setup_rules?.length ? `羁绊铺设：${joinList(emotionalArcContract.bonding_setup_rules)}` : '',
    emotionalArcContract?.emotional_tear_rules?.length ? `情感撕裂：${joinList(emotionalArcContract.emotional_tear_rules)}` : '',
    emotionalArcContract?.lingering_aftertaste_rules?.length ? `余韵钝痛：${joinList(emotionalArcContract.lingering_aftertaste_rules)}` : '',
    emotionalArcContract?.emotional_turning_rules?.length ? `情绪转向：${joinList(emotionalArcContract.emotional_turning_rules)}` : '',
    emotionalArcContract?.emotional_rhythm_curve_rules?.length ? `情绪拉扯曲线：${joinList(emotionalArcContract.emotional_rhythm_curve_rules)}` : '',
    emotionalArcContract?.genre_emotion_strategy_rules?.length ? `题材情感策略：${joinList(emotionalArcContract.genre_emotion_strategy_rules)}` : '',
    emotionalArcContract?.first_impression_rules?.length ? `先入为主/第一印象：${joinList(emotionalArcContract.first_impression_rules)}` : '',
    emotionalArcContract?.peak_end_rules?.length ? `峰终定律/结尾情绪强度：${joinList(emotionalArcContract.peak_end_rules)}` : '',
    emotionalArcContract?.emotion_layer_rules?.length ? `三层情绪：${joinList(emotionalArcContract.emotion_layer_rules)}` : '',
    emotionalArcContract?.reaction_structure_rules?.length ? `情绪反应结构：${joinList(emotionalArcContract.reaction_structure_rules)}` : '',
    emotionalArcContract?.ideological_conflict_rules?.length ? `理念矛盾：${joinList(emotionalArcContract.ideological_conflict_rules)}` : '',
    emotionalArcContract?.failure_mode_guards?.length ? `情绪失败模式防线：${joinList(emotionalArcContract.failure_mode_guards)}` : '',
    emotionalArcContract?.progressive_confrontation_rules?.length ? `递进对抗：${joinList(emotionalArcContract.progressive_confrontation_rules)}` : '',
    emotionalArcContract?.meme_plot_formula_rules?.length ? `梗四段式：${joinList(emotionalArcContract.meme_plot_formula_rules)}` : '',
    emotionalArcContract?.reader_desire_formula_rules?.length ? `读者欲望四步公式：${joinList(emotionalArcContract.reader_desire_formula_rules)}` : '',
    emotionalArcContract?.quality_checks?.length ? `质量检查：${joinList(emotionalArcContract.quality_checks)}` : '',
    emotionalArcContract ? '交稿自检必须输出 emotional_arc_checks，并用正文证据检查调动/释放、弧线类型、场景情绪执行（每个场景标注调动/复现/释放/后反应）、情绪三板斧（羁绊铺设/情感撕裂/余韵钝痛）、情绪拉扯曲线、题材情感策略、每 3-5 个小节情绪转向、先入为主/第一印象、峰终定律/结尾情绪强度、三层情绪（角色自己的情绪/文本传递的情绪/读者实际感受）、情绪反应结构（前反应/复现/后反应/以小搏大/士气如虹）、闭环期待后的下一开环、理念矛盾/理念之争/追求和牺牲、情绪模块重组（换场景/换对手/加新情绪/stakes）、爽点递增对比（影响范围、揭示深度、身份落差）、递进对抗（角力而非碾压/对手加码/最后王炸）、梗四段式（发生/发展/转折/高潮）、读者欲望四步公式（生产诉求/给予希望/努力解决/得偿所愿）、断期待禁止、下行情节安全感和情绪外化。' : '',
    emotionalArcContract ? JSON.stringify(emotionalArcContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildChapterHookPromptSection(chapterHookContract: any) {
  return [
    chapterHookContract ? '【章级钩子合同】' : '',
    chapterHookContract ? '硬性要求：执行 chapter_target.chapter_hook_contract；这是来自 oh-story hooks-chapter 的章首/章尾钩子口径，正文必须选对章首 7 式和章尾 13 式，并让钩子强度匹配章节阶段。' : '',
    chapterHookContract ? '执行方式：前 100 字必须落地开篇钩子；最后约 100 字必须落地翻页钩子；钩子要由现场动作、对话、新信息、危险、选择或反应触发，不得用作者预告或空泛总结替代。' : '',
    chapterHookContract?.opening_hook_type ? `章首钩子类型：${chapterHookContract.opening_hook_type}` : '',
    chapterHookContract?.ending_hook_type ? `章尾钩子类型：${chapterHookContract.ending_hook_type}` : '',
    chapterHookContract?.hook_strength ? `钩子强度：${chapterHookContract.hook_strength}` : '',
    chapterHookContract?.opening_hook_rules?.length ? `章首规则：${joinList(chapterHookContract.opening_hook_rules)}` : '',
    chapterHookContract?.ending_hook_rules?.length ? `章尾规则：${joinList(chapterHookContract.ending_hook_rules)}` : '',
    chapterHookContract?.forbidden_patterns?.length ? `钩子禁忌：${joinList(chapterHookContract.forbidden_patterns)}` : '',
    chapterHookContract?.quality_checks?.length ? `质量检查：${joinList(chapterHookContract.quality_checks)}` : '',
    chapterHookContract ? '交稿自检必须输出 chapter_hook_checks 和 chapter_hook_quality_checks，并用正文证据检查前100字钩子、章尾翻页钩子、强度匹配、兑现路径、假悬念/机械降神/低风险钩、同类型连用风险，以及 chapter_hook_contract.quality_checks 中要求的章首/章尾现场触发和下一章行动压力。' : '',
    chapterHookContract ? JSON.stringify(chapterHookContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildParagraphHookPromptSection(paragraphHookContract: any) {
  return [
    paragraphHookContract ? '【段落级钩子合同】' : '',
    paragraphHookContract ? '硬性要求：执行 chapter_target.paragraph_hook_contract；这是来自 oh-story hooks-paragraph 的段落级钩子口径，正文必须让每 3-5 段出现可指认的微钩子，并让段落持续产生信息、风险、情绪或关系变化。' : '',
    paragraphHookContract ? '执行方式：段落级钩子 11 种必须按场景选择；关键冲突优先使用钩子组合；对话冲突必须有五级递进；公开反打、揭露、压迫或反证场景必须写出围观者质量层级。' : '',
    paragraphHookContract?.micro_hook_types?.length ? `段落级钩子 11 种/本章优先：${joinList(paragraphHookContract.micro_hook_types)}` : '',
    paragraphHookContract?.hook_combinations?.length ? `钩子组合：${joinList(paragraphHookContract.hook_combinations)}` : '',
    paragraphHookContract?.dialogue_escalation?.length ? `对话递进：${joinList(paragraphHookContract.dialogue_escalation)}` : '',
    paragraphHookContract?.spectator_layers?.length ? `围观者质量层级：${joinList(paragraphHookContract.spectator_layers)}` : '',
    paragraphHookContract?.unfair_injury_hooks?.length ? `不公平伤害：${joinList(paragraphHookContract.unfair_injury_hooks)}` : '',
    paragraphHookContract?.forbidden_patterns?.length ? `段落钩子禁忌：${joinList(paragraphHookContract.forbidden_patterns)}` : '',
    paragraphHookContract?.quality_checks?.length ? `paragraph_hook_checks：${joinList(paragraphHookContract.quality_checks)}` : '',
    paragraphHookContract ? '交稿自检必须输出 paragraph_hook_checks，并用正文证据检查段落级钩子 11 种、钩子组合、对话情绪五级递进、围观者质量层级、不公平伤害和假悬念/低风险钩。' : '',
    paragraphHookContract ? JSON.stringify(paragraphHookContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildSuspensePromptSection(suspenseContract: any) {
  return [
    suspenseContract ? '【悬念编排合同】' : '',
    suspenseContract ? '硬性要求：执行 chapter_target.suspense_contract；这是来自 oh-story hooks-suspense 的悬念编排口径，正文必须把疑问、提示、误导、答案、期待接力和震惊反应排成可追踪链条。' : '',
    suspenseContract ? '执行方式：按四种悬念信息顺序模板选择本章结构；悬念强度5级必须匹配章节定位；前30%种、中50%养、末20%收或延迟引爆；章末必须保留至少一个未解问题或未达成期待，并让至少两条期待线继续运行。' : '',
    suspenseContract ? '信息差与预知：执行读者预知法、信息差运用和底牌前置法；让读者知道但主角不知道的倒计时持续推进，先展示底牌再安排冲突，并在信息差抹平时形成爽点爆发。' : '',
    suspenseContract ? '多线悬念：短弧2-3章、中弧5-8章、长弧整卷要至少保留两条运行；当前疑问兑现前先铺下一开环，不能让悬念线一次性清空。' : '',
    suspenseContract ? '伏笔不是谜语人：短期紧张用悬念，长期线索用伏笔；信息延迟超过3章且中间无推进时必须提前给或删掉。伏笔要自然藏进动作、物件、误判、环境回声或角色习惯，正文不要直接写“这是伏笔”。' : '',
    suspenseContract?.information_order_templates?.length ? `四种悬念信息顺序模板/本章优先：${joinList(suspenseContract.information_order_templates)}` : '',
    suspenseContract?.suspense_strength ? `悬念强度5级：${suspenseContract.suspense_strength}` : '',
    suspenseContract?.suspense_cycle?.length ? `种养收节奏：${joinList(suspenseContract.suspense_cycle)}` : '',
    suspenseContract?.trigger_layers?.length ? `触发型分层钩子：${joinList(suspenseContract.trigger_layers)}` : '',
    suspenseContract?.expectation_layers?.length ? `期待接力：${joinList(suspenseContract.expectation_layers)}` : '',
    suspenseContract?.expectation_chain ? `期待链：活跃线=${joinList(asArray(suspenseContract.expectation_chain.active_lines), '、')}；承接规则=${joinList(suspenseContract.expectation_chain.carry_rules)}；下一开环=${joinList(suspenseContract.expectation_chain.next_open_loop)}` : '',
    suspenseContract?.multi_line_suspense_rules?.length ? `多线悬念：${joinList(suspenseContract.multi_line_suspense_rules)}` : '',
    suspenseContract?.reader_preknowledge_rules?.length ? `读者预知法：${joinList(suspenseContract.reader_preknowledge_rules)}` : '',
    suspenseContract?.information_gap_rules?.length ? `信息差运用：${joinList(suspenseContract.information_gap_rules)}` : '',
    suspenseContract?.trump_card_preposition_rules?.length ? `底牌前置法：${joinList(suspenseContract.trump_card_preposition_rules)}` : '',
    suspenseContract?.foreshadowing_boundary_rules?.length ? `悬念伏笔边界：${joinList(suspenseContract.foreshadowing_boundary_rules)}` : '',
    suspenseContract?.shock_layers?.length ? `震惊分层：${joinList(suspenseContract.shock_layers)}` : '',
    suspenseContract?.forbidden_patterns?.length ? `悬念禁忌：${joinList(suspenseContract.forbidden_patterns)}` : '',
    suspenseContract?.quality_checks?.length ? `suspense_checks：${joinList(suspenseContract.quality_checks)}` : '',
    suspenseContract ? '交稿自检必须输出 suspense_checks，并用正文证据检查悬念等级、信息顺序、期待链、多线悬念、读者预知法、信息差运用、底牌前置法、种养收、悬念伏笔边界、角色反应、震惊分层、信息差兑现和麻烦不能消失。' : '',
    suspenseContract ? JSON.stringify(suspenseContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildReversalPromptSection(reversalContract: any) {
  return [
    reversalContract ? '【反转设计合同】' : '',
    reversalContract ? '硬性要求：执行 chapter_target.reversal_contract；这是来自 oh-story reversal-toolkit 的反转设计口径，正文必须让反转有类型、有铺垫、有公平误导、有自然揭示和揭示后的影响。' : '',
    reversalContract ? '执行方式：反转类型必须明确；至少3处暗示要提前落在行为、物件、证据、时间线或反常选择里；误导技巧不能欺骗读者；揭示要短而狠，揭示后必须改变局势、关系或读者情绪。' : '',
    reversalContract?.reversal_types?.length ? `反转类型：${joinList(reversalContract.reversal_types)}` : '',
    reversalContract?.setup_requirements?.length ? `铺垫要求：${joinList(reversalContract.setup_requirements)}` : '',
    reversalContract?.setup_plan?.length ? `本章铺垫/揭示计划：${joinList(reversalContract.setup_plan)}` : '',
    reversalContract?.misdirection_methods?.length ? `误导技巧：${joinList(reversalContract.misdirection_methods)}` : '',
    reversalContract?.timing_rules?.length ? `反转时机：${joinList(reversalContract.timing_rules)}` : '',
    reversalContract?.face_slap_rhythm?.length ? `打脸节奏：${joinList(reversalContract.face_slap_rhythm)}` : '',
    reversalContract?.forbidden_patterns?.length ? `反转禁忌：${joinList(reversalContract.forbidden_patterns)}` : '',
    reversalContract?.quality_checks?.length ? `reversal_checks：${joinList(reversalContract.quality_checks)}` : '',
    reversalContract ? '交稿自检必须输出 reversal_checks，并用正文证据检查3处暗示、公平误导、反转类型、揭示时机、非作弊性、情绪冲击、揭示后影响和打脸节奏。' : '',
    reversalContract ? JSON.stringify(reversalContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildShowdownPromptSection(showdownContract: any) {
  return [
    showdownContract ? '【高潮对抗合同】' : '',
    showdownContract ? '硬性要求：执行 chapter_target.showdown_contract；这是来自 oh-story style-combat-face / hooks-suspense / plot-frameworks 的爽点、装逼打脸、底牌管理、无敌文主角、三压一爆三震、战斗智斗和强敌三层破局口径，正文必须让爽点释放、未揭示底牌、主角不拖拉、三方铺压、舞台层级、传递通道、震惊分层、以弱胜强逻辑、三层破局和情绪节奏全部可见。' : '',
    showdownContract ? '执行方式：该爽就爽，底牌释放后反派必须受到对应压制；但每次只出1个底牌，不得一次性摊空所有后手，出牌后要留下2-3个未揭示底牌，并补新技能、新后手、新目标或更高门槛；无敌文主角登场不能拖拉，要用杀伐果断 + 战力前置无敌建立“主角登场就会强势解决”的期待，不一击必杀时必须给明确理由；三压一爆三震要求爆发前先写友好势力觉得主角是大佬、敌方势力两次不服并逼主角上、中立势力观望或加压，爆发后分别写友方、敌方、中立方的不同震动；装逼打脸要先铺舞台和人际/利益传递通道，再按群众层 -> 中间层 -> 核心层传递震惊，也允许核心层反向传回群众层形成闭环；打斗是一场表演，必须服务爽点；以弱胜强必须靠信息差、环境利用或心理博弈；强敌压迫时必须写出预判反制和反预判：反派出A，主角早准备B克制A，反派针对A时，主角利用A作陷阱引入预设B；节奏按急 -> 缓 -> 急释放。' : '',
    showdownContract?.payoff_release_rules?.length ? `爽点释放：${joinList(showdownContract.payoff_release_rules)}` : '',
    showdownContract?.trump_card_reserve_rules?.length ? `底牌管理：${joinList(showdownContract.trump_card_reserve_rules)}` : '',
    showdownContract?.invincible_protagonist_rules?.length ? `无敌文主角：${joinList(showdownContract.invincible_protagonist_rules)}` : '',
    showdownContract?.three_pressure_shock_rules?.length ? `三压一爆三震：${joinList(showdownContract.three_pressure_shock_rules)}` : '',
    showdownContract?.stage_chain_rules?.length ? `舞台层级：${joinList(showdownContract.stage_chain_rules)}` : '',
    showdownContract?.transmission_channel_rules?.length ? `传递通道：${joinList(showdownContract.transmission_channel_rules)}` : '',
    showdownContract?.shock_chain_rules?.length ? `震惊分层：${joinList(showdownContract.shock_chain_rules)}` : '',
    showdownContract?.combat_design_rules?.length ? `战斗/智斗设计：${joinList(showdownContract.combat_design_rules)}` : '',
    showdownContract?.weak_over_strong_rules?.length ? `以弱胜强逻辑：${joinList(showdownContract.weak_over_strong_rules)}` : '',
    showdownContract?.counterplay_layers?.length ? `三层破局：${joinList(showdownContract.counterplay_layers)}` : '',
    showdownContract?.emotion_rhythm_rules?.length ? `情绪节奏：${joinList(showdownContract.emotion_rhythm_rules)}` : '',
    showdownContract?.quality_checks?.length ? `showdown_checks：${joinList(showdownContract.quality_checks)}` : '',
    showdownContract ? '交稿自检必须输出 showdown_checks，并用正文证据检查爽点到位、底牌管理、无敌文主角不拖拉、三压一爆三震、主角不委屈、舞台够大、传递通道、震惊分层、战斗服务爽点、以弱胜强逻辑、三层破局和装逼闭环。' : '',
    showdownContract ? JSON.stringify(showdownContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildBridgeUnitPromptSection(bridgeUnitContract: any) {
  return [
    bridgeUnitContract ? '【桥段节奏合同】' : '',
    bridgeUnitContract ? '硬性要求：执行 chapter_target.bridge_unit_contract；这是来自 oh-story outline-rhythm / commercial-core-methods 的四章一桥段与连续期待口径，正文必须让桥段位置、目标推进、期待接力、高潮时长和阶段衔接全部可见。' : '',
    bridgeUnitContract ? '执行方式：先确认本章属于四章一桥段的哪一位；兑现旧期待前先挂新期待；高潮中埋钩子、尾巴给目标或连续小期待至少命中一项；连续 2 章没有目标推进时提高冲突密度，连续 2 章只爆点时补承接余波。' : '',
    bridgeUnitContract?.bridge_position ? `桥段位置：${bridgeUnitContract.bridge_position}` : '',
    bridgeUnitContract?.bridge_unit_plan?.length ? `桥段计划：${joinList(bridgeUnitContract.bridge_unit_plan)}` : '',
    bridgeUnitContract?.four_chapter_roles?.length ? `四章一桥段：${joinList(bridgeUnitContract.four_chapter_roles)}` : '',
    bridgeUnitContract?.expectation_chain_rules?.length ? `连续期待：${joinList(bridgeUnitContract.expectation_chain_rules)}` : '',
    bridgeUnitContract?.climax_duration_rules?.length ? `高潮时长：${joinList(bridgeUnitContract.climax_duration_rules)}` : '',
    bridgeUnitContract?.transition_rules?.length ? `阶段衔接：${joinList(bridgeUnitContract.transition_rules)}` : '',
    bridgeUnitContract?.fatigue_repair_rules?.length ? `疲劳修复：${joinList(bridgeUnitContract.fatigue_repair_rules)}` : '',
    bridgeUnitContract?.quality_checks?.length ? `bridge_unit_checks：${joinList(bridgeUnitContract.quality_checks)}` : '',
    bridgeUnitContract ? '交稿自检必须输出 bridge_unit_checks，并用正文证据检查四章一桥段位置、连续期待、目标推进、高潮时长、阶段衔接和疲劳修复。' : '',
    bridgeUnitContract ? JSON.stringify(bridgeUnitContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildPlotFrameworkPromptSection(plotFrameworkContract: any) {
  return [
    plotFrameworkContract ? '【剧情框架合同】' : '',
    plotFrameworkContract ? '硬性要求：执行 chapter_target.plot_framework_contract；这是来自 oh-story plot-frameworks 的题材→框架路由、单段剧情结构模板、RPG结构与奖励设计、框架与阵营手牌法、双线法与信息差、套路模板重复法和剧情流五不崩口径，正文必须按本章题材框架组织事件，而不是只堆场景。' : '',
    plotFrameworkContract ? '执行方式：先按 genre_framework_route 判断本章 core_loop；每个场景至少承担一个 selected_frameworks 中的功能。系统/升级文按任务→奖励→兑换→新任务推进；打脸/群像按主角阵营、敌人阵营、观众阵营轮流出牌；重复套路必须换场景、人物、情绪或奖励；章尾要完成收获清点并铺下一段，不能让目标、卖点、社会关系、上层地位或成长停摆。' : '',
    plotFrameworkContract?.genre_framework_route ? `题材→框架路由：题材=${plotFrameworkContract.genre_framework_route.genre_hint || '未标注'}；核心循环=${plotFrameworkContract.genre_framework_route.core_loop || '目标→阻碍→行动→反馈→新目标'}；主框架=${plotFrameworkContract.genre_framework_route.primary_framework || '核心梗与细化法'}；辅助框架=${joinList(asArray(plotFrameworkContract.genre_framework_route.auxiliary_frameworks), '、') || '故事本质与六幕结构'}；原因=${plotFrameworkContract.genre_framework_route.routing_reason || '按当前题材和章节目标选择框架。'}` : '',
    plotFrameworkContract?.selected_frameworks?.length ? `选用框架：${joinList(plotFrameworkContract.selected_frameworks)}` : '',
    plotFrameworkContract?.stage_ownership ? `阶段归属：创建=${joinList(asArray(plotFrameworkContract.stage_ownership.creation))}；大纲=${joinList(asArray(plotFrameworkContract.stage_ownership.outline))}；场景卡=${joinList(asArray(plotFrameworkContract.stage_ownership.scene_card))}；正文=${joinList(asArray(plotFrameworkContract.stage_ownership.prose))}；修订=${joinList(asArray(plotFrameworkContract.stage_ownership.revision))}` : '',
    plotFrameworkContract?.rpg_reward_loop ? `RPG奖励循环：${plotFrameworkContract.rpg_reward_loop.loop || ''}；奖励点=${joinList(asArray(plotFrameworkContract.rpg_reward_loop.reward_points))}；规则=${joinList(asArray(plotFrameworkContract.rpg_reward_loop.rules))}` : '',
    plotFrameworkContract?.faction_hand_framework ? `阵营手牌：阵营=${joinList(asArray(plotFrameworkContract.faction_hand_framework.factions), '、')}；规则=${joinList(asArray(plotFrameworkContract.faction_hand_framework.rules))}；手牌=${JSON.stringify(plotFrameworkContract.faction_hand_framework.cards || {}).slice(0, 1200)}` : '',
    plotFrameworkContract?.double_line_info_gap_rules?.length ? `双线信息差：${joinList(plotFrameworkContract.double_line_info_gap_rules)}` : '',
    plotFrameworkContract?.routine_variation_rules?.length ? `套路模板重复法：${joinList(plotFrameworkContract.routine_variation_rules)}` : '',
    plotFrameworkContract?.large_structure_rules?.length ? `大结构/单段结构：${joinList(plotFrameworkContract.large_structure_rules)}` : '',
    plotFrameworkContract?.six_act_story_rules?.length ? `六幕故事规则：${joinList(plotFrameworkContract.six_act_story_rules)}` : '',
    plotFrameworkContract?.global_no_collapse_checks?.length ? `五不崩：${joinList(plotFrameworkContract.global_no_collapse_checks)}` : '',
    plotFrameworkContract?.quality_checks?.length ? `plot_framework_checks：${joinList(plotFrameworkContract.quality_checks)}` : '',
    plotFrameworkContract ? '交稿自检必须输出 plot_framework_checks，并用正文证据检查题材→框架路由、核心循环、RPG奖励反馈、阵营手牌出牌、双线信息差、套路变体、段落闭环、章尾收获与铺垫，以及五不崩。' : '',
    plotFrameworkContract ? JSON.stringify(plotFrameworkContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildOpeningPromptSection(openingContract: any) {
  return [
    openingContract ? '【开篇设计合同】' : '',
    openingContract ? '硬性要求：执行 chapter_target.opening_contract；这是来自 oh-story opening-design 的新书开篇口径，前3章必须尽快让主角、危机/优势、爽点或期待点和三大基点进入正文。' : '',
    openingContract ? '执行方式：300 字内主角登场；1000 字内出现爽点或期待点；三大基点（人设基点、切入点基点、金手指基点）要能在前3章追踪；开头五要诀必须执行简单/不偏/快/爽/不平；背景、世界观和角色信息必须分批塞进冲突。' : '',
    openingContract?.activation_scope ? `适用范围：${openingContract.activation_scope}` : '',
    openingContract?.hook_type ? `开篇噱头类型：${openingContract.hook_type}` : '',
    openingContract?.opening_strategy ? `开篇策略：${openingContract.opening_strategy}` : '',
    openingContract?.mainline_graft ? `主线嫁接：${openingContract.mainline_graft}` : '',
    openingContract?.first_5_chapter_promise?.length ? `前5章承诺：${joinList(openingContract.first_5_chapter_promise)}` : '',
    openingContract?.threshold_ladder?.length ? `门槛阶梯：${joinList(openingContract.threshold_ladder)}` : '',
    openingContract?.required_beats?.length ? `必达指标：${joinList(openingContract.required_beats)}` : '',
    openingContract?.foundation_points?.length ? `三大基点：${joinList(openingContract.foundation_points)}` : '',
    openingContract?.opening_plan?.length ? `本章开篇计划：${joinList(openingContract.opening_plan)}` : '',
    openingContract?.five_essentials_rules?.length ? `开头五要诀：${joinList(openingContract.five_essentials_rules)}` : '',
    openingContract?.information_priority?.length ? `信息释放顺序：${joinList(openingContract.information_priority)}` : '',
    openingContract?.forbidden_patterns?.length ? `开篇禁忌：${joinList(openingContract.forbidden_patterns)}` : '',
    openingContract?.quality_checks?.length ? `opening_checks：${joinList(openingContract.quality_checks)}` : '',
    openingContract ? '交稿自检必须输出 opening_checks，并用正文证据检查300字主角登场、1000字期待点、三大基点、开头五要诀、第一章目标与卖点、禁忌开头和信息分批释放。' : '',
    openingContract ? JSON.stringify(openingContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildProseCraftPromptSection(proseCraftContract: any) {
  return [
    proseCraftContract ? '【正文工艺合同】' : '',
    ...(proseCraftContract ? formatProseCraftPromptSnippet(proseCraftContract) : []),
    '',
  ]
}

export function buildPunctuationTonePromptSection(punctuationToneContract: any) {
  return [
    punctuationToneContract ? '【语气标点谱系合同】' : '',
    punctuationToneContract ? '硬性要求：执行 chapter_target.punctuation_tone_contract；这是来自 oh-story writing-craft/format-and-structure 的语气标点谱系，标点服务语气、人物声线和情绪节奏，不能通篇句号化，也不能随机堆砌问号/感叹号。' : '',
    punctuationToneContract ? '执行方式：先判断每句功能，再选择句号、逗号、问号、少量感叹号、冒号、换行或动作 beat；犹豫、未尽、打断和拖长不得使用省略号或破折号。' : '',
    punctuationToneContract?.tone_punctuation_map?.length ? `语气标点谱系：${joinList(punctuationToneContract.tone_punctuation_map)}` : '',
    punctuationToneContract?.scene_tone_plan?.length ? `本章场景标点计划：${joinList(punctuationToneContract.scene_tone_plan)}` : '',
    punctuationToneContract?.forbidden_marks?.length ? `禁用/慎用标点：${joinList(punctuationToneContract.forbidden_marks)}` : '',
    punctuationToneContract?.quality_checks?.length ? `punctuation_tone_checks：${joinList(punctuationToneContract.quality_checks)}` : '',
    punctuationToneContract ? '交稿自检必须输出 punctuation_tone_checks，并用正文证据检查通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点是否匹配人物声线。' : '',
    punctuationToneContract ? JSON.stringify(punctuationToneContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildQualityAuditPromptSection(qualityAuditContract: any) {
  return [
    qualityAuditContract ? '【质量诊断合同】' : '',
    qualityAuditContract ? '硬性要求：执行 chapter_target.quality_audit_contract；这是来自 oh-story quality-checklist / commercial-core-methods 的写前目的锁定与写后诊断口径，正文必须经得起章节结构、章纲目的词、推进、水文、信息传递、长篇连续性和五维评分检查。' : '',
    qualityAuditContract ? '执行方式：写正文前先用一句话锁定本章内容和目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）；写正文时让每个场景有目标、阻碍和变化，并按目的词分配详略；交稿自检必须按五维评分标准定位最低分维度，再选择 rewrite/compress/de_ai/polish 之一作为修订策略。' : '',
    qualityAuditContract ? '事件驱动硬线：正文章节必须由事件组成，事件内容比重不能小于一半；事件是价值改变的契机；设定尽量通过事件演绎，而非旁白强塞。' : '',
    qualityAuditContract?.structure_checks?.length ? `章节结构检查：${joinList(qualityAuditContract.structure_checks)}` : '',
    qualityAuditContract?.chapter_purpose_rules?.length ? `章纲目的词：${joinList(qualityAuditContract.chapter_purpose_rules)}` : '',
    qualityAuditContract?.progression_checks?.length ? `章节推进/水文检测：${joinList(qualityAuditContract.progression_checks)}` : '',
    qualityAuditContract?.information_checks?.length ? `信息传递检查：${joinList(qualityAuditContract.information_checks)}` : '',
    qualityAuditContract?.event_content_rules?.length ? `事件内容比重：${joinList(qualityAuditContract.event_content_rules)}` : '',
    qualityAuditContract?.longform_checks?.length ? `长篇专项检查：${joinList(qualityAuditContract.longform_checks)}` : '',
    qualityAuditContract?.five_dimension_rubric?.length ? `五维评分标准：${joinList(qualityAuditContract.five_dimension_rubric)}` : '',
    qualityAuditContract?.selling_point_expression_rules?.length ? `卖点表达：${joinList(qualityAuditContract.selling_point_expression_rules)}` : '',
    qualityAuditContract?.chapter_focus?.length ? `本章诊断重点：${joinList(qualityAuditContract.chapter_focus)}` : '',
    qualityAuditContract?.phase_checklist?.length ? `阶段质量清单：${formatQualityAuditPhaseChecklist(qualityAuditContract.phase_checklist)}` : '',
    qualityAuditContract?.revision_strategies?.length ? `精修策略：${joinList(qualityAuditContract.revision_strategies)}` : '',
    qualityAuditContract?.quality_checks?.length ? `quality_audit_checks：${joinList(qualityAuditContract.quality_checks)}` : '',
    qualityAuditContract ? '交稿自检必须输出 quality_audit_checks，并用正文证据检查开头钩子、中段推进、局势变化、章尾翻页、章纲目的词、水文检测、信息跟冲突走、最近5章进展、五维评分和精修策略。' : '',
    qualityAuditContract ? JSON.stringify(qualityAuditContract, null, 2).slice(0, 3000) : '',
    '',
  ]
}

export function buildDialoguePromptSection(dialogueContract: any) {
  return [
    dialogueContract ? '【对话质量合同】' : '',
    dialogueContract ? '硬性要求：执行 chapter_target.dialogue_contract；这是来自 oh-story dialogue-mastery 的对白设计口径，写对白时必须让每句承担推进剧情、增加期待或展示人设，并落实角色议程、潜台词和声线差异。' : '',
    dialogueContract ? '执行方式：对话长度 = 权力地位；掌控者短句冷静，被动者话多且情绪化；信息展示必须用角色语气和立场包裹，不得写说明书式对话。' : '',
    dialogueContract?.scene_modes?.length ? `对话模式：${joinList(dialogueContract.scene_modes)}` : '',
    dialogueContract?.voice_anchors?.length ? `声线锚点：${joinList(dialogueContract.voice_anchors)}` : '',
    dialogueContract?.dialogue_goals?.length ? `对白目标：${joinList(dialogueContract.dialogue_goals)}` : '',
    dialogueContract?.key_lines?.length ? `关键台词：${joinList(dialogueContract.key_lines)}` : '',
    dialogueContract?.dialogue_execution_checklist?.length ? `对话执行清单：${formatDialogueExecutionChecklist(dialogueContract.dialogue_execution_checklist)}` : '',
    dialogueContract?.mode_playbooks?.length ? `对白模式剧本：${joinList(dialogueContract.mode_playbooks)}` : '',
    dialogueContract?.power_length_rules?.length ? `权力长度规则：${joinList(dialogueContract.power_length_rules)}` : '',
    dialogueContract?.subtext_agenda_rules?.length ? `潜台词与议程：${joinList(dialogueContract.subtext_agenda_rules)}` : '',
    dialogueContract?.tone_context_rules?.length ? `语气场合规则：${joinList(dialogueContract.tone_context_rules)}` : '',
    dialogueContract?.emotion_push_rules?.length ? `情绪推动规则：${joinList(dialogueContract.emotion_push_rules)}` : '',
    dialogueContract?.emotion_continuity_rules?.length ? `情绪连续规则：${joinList(dialogueContract.emotion_continuity_rules)}` : '',
    dialogueContract?.dialogue_drive_rules?.length ? `对话驱动力规则：${joinList(dialogueContract.dialogue_drive_rules)}` : '',
    dialogueContract?.information_embed_rules?.length ? `信息嵌入规则：${joinList(dialogueContract.information_embed_rules)}` : '',
    dialogueContract?.information_tension_rules?.length ? `信息拉扯规则：${joinList(dialogueContract.information_tension_rules)}` : '',
    dialogueContract?.voice_differentiation_rules?.length ? `人物语言差异化：${joinList(dialogueContract.voice_differentiation_rules)}` : '',
    dialogueContract?.spectator_dialogue_rules?.length ? `弹幕/群众对话：${joinList(dialogueContract.spectator_dialogue_rules)}` : '',
    dialogueContract?.supporting_speaker_limit_rules?.length ? `配角台词人数：${joinList(dialogueContract.supporting_speaker_limit_rules)}` : '',
    dialogueContract?.dialogue_rhythm_rules?.length ? `对话节奏/呼吸感：${joinList(dialogueContract.dialogue_rhythm_rules)}` : '',
    dialogueContract?.dialogue_volume_rules?.length ? `对话篇幅控制：${joinList(dialogueContract.dialogue_volume_rules)}` : '',
    dialogueContract?.dialogue_meme_rules?.length ? `梗式对白：${joinList(dialogueContract.dialogue_meme_rules)}` : '',
    dialogueContract?.dialogue_audit_rules?.length ? `对话质量审计：${joinList(dialogueContract.dialogue_audit_rules)}` : '',
    dialogueContract?.quality_checks?.length ? `质量检查：${joinList(dialogueContract.quality_checks)}` : '',
    dialogueContract ? '交稿自检必须输出 dialogue_checks，并用正文证据检查潜台词、议程、声线差异、信息嵌入、权力博弈和对话质量审计；如果存在 dialogue_execution_checklist，必须按对话执行清单逐场覆盖 dialogue_checks，检查每场 mode、speaker_agendas、line_functions、emotion_flow、information_strategy、voice_differentiation 和 forbidden_patterns 是否落成正文证据。' : '',
    dialogueContract ? JSON.stringify(dialogueContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildPlotDynamicsPromptSection(plotDynamicsContract: any) {
  return [
    plotDynamicsContract ? '【剧情动力合同】' : '',
    plotDynamicsContract ? '硬性要求：执行 chapter_target.plot_dynamics_contract；这是来自 oh-story plot-core-methods 的剧情推进口径，正文必须形成目标、阻碍、行动、代价/反馈、新期待的最小循环。' : '',
    plotDynamicsContract ? '高潮执行方式：蓄能 → 假胜 → 崩解 → 交叉死磕 → 悬置收尾；必须先给希望再击碎，让反转有情绪落差。' : '',
    plotDynamicsContract ? '驱动方式：番茄爽文/打脸文按事件驱动，每章给一个外部结果（赢、升级、对手栽）；追妻/虐心/世情按情感驱动，人物心结必须持续悬着；混合模式主线用事件往前推，每 3-5 章插情感停顿。' : '',
    plotDynamicsContract?.plot_loop?.length ? `剧情循环：${joinList(plotDynamicsContract.plot_loop)}` : '',
    plotDynamicsContract?.climax_formula?.length ? `高潮公式：${joinList(plotDynamicsContract.climax_formula, ' → ')}` : '',
    plotDynamicsContract?.ab_outline?.length ? `A/B节奏：${joinList(plotDynamicsContract.ab_outline)}` : '',
    plotDynamicsContract?.drive_mode_rules?.length ? `驱动方式：${joinList(plotDynamicsContract.drive_mode_rules)}` : '',
    plotDynamicsContract?.line_stagger_rules?.length ? `多线错峰：${joinList(plotDynamicsContract.line_stagger_rules)}` : '',
    plotDynamicsContract?.quality_checks?.length ? `质量检查：${joinList(plotDynamicsContract.quality_checks)}` : '',
    plotDynamicsContract ? '交稿自检必须输出 plot_dynamics_checks，并用正文证据检查最小剧情循环、假胜崩解、代价反馈、A/B情绪交替、驱动方式、多线错峰和悬置收尾。' : '',
    plotDynamicsContract ? JSON.stringify(plotDynamicsContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStoryPowerPromptSection(storyPowerContract: any) {
  return [
    storyPowerContract ? '【故事力合同】' : '',
    storyPowerContract ? '硬性要求：执行 chapter_target.story_power_contract；这是来自 oh-story plot-core-methods 的故事力门禁，正文必须同时具备故事五维、有动作才是故事、有始有终和因果反馈。' : '',
    storyPowerContract ? '执行方式：每个关键场景必须让角色用行动改变局势；开场目标或异常必须在章末形成状态变化；上一场结果必须成为下一场原因，不能只并列摆放事件。' : '',
    storyPowerContract?.story_power_dimensions?.length ? `故事五维：${joinList(storyPowerContract.story_power_dimensions)}` : '',
    storyPowerContract?.chapter_power_loop?.length ? `本章故事力循环：${joinList(storyPowerContract.chapter_power_loop)}` : '',
    storyPowerContract?.action_rules?.length ? `有动作才是故事：${joinList(storyPowerContract.action_rules)}` : '',
    storyPowerContract?.beginning_end_rules?.length ? `有始有终：${joinList(storyPowerContract.beginning_end_rules)}` : '',
    storyPowerContract?.causal_feedback_rules?.length ? `因果反馈：${joinList(storyPowerContract.causal_feedback_rules)}` : '',
    storyPowerContract?.quality_checks?.length ? `质量检查：${joinList(storyPowerContract.quality_checks)}` : '',
    storyPowerContract ? '交稿自检必须输出 story_power_checks，并用正文证据检查故事五维、行动改变局势、开场到章末状态变化、因果反馈和场景之间的结果接结果。' : '',
    storyPowerContract ? JSON.stringify(storyPowerContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildContinuityHeatPromptSection(continuityHeatContract: any) {
  return [
    continuityHeatContract ? '【连续性热度合同】' : '',
    continuityHeatContract ? '硬性要求：执行 chapter_target.continuity_heat_contract；这是来自 oh-story plot-core-methods 的连续性追踪口径，正文必须管理 hot/warm/cold/archived 元素，避免重要角色、伏笔、支线和关系线断温或突然回收。' : '',
    continuityHeatContract ? '有效触达标准：必须推进事件、施加压力、改变关系、造成真实后果或解释合理休眠；只提名字、空回忆和随机 callback 不算触达。' : '',
    continuityHeatContract?.heat_states?.length ? `热度状态：${joinList(continuityHeatContract.heat_states)}` : '',
    continuityHeatContract?.active_expectations?.length ? `当前 hot/warm 期待：${joinList(continuityHeatContract.active_expectations)}` : '',
    continuityHeatContract?.watch_items?.length ? `需要追踪：${joinList(continuityHeatContract.watch_items)}` : '',
    continuityHeatContract?.dormant_allowed?.length ? `允许休眠：${joinList(continuityHeatContract.dormant_allowed)}` : '',
    continuityHeatContract?.quality_checks?.length ? `质量检查：${joinList(continuityHeatContract.quality_checks)}` : '',
    continuityHeatContract ? '交稿自检必须输出 continuity_heat_checks，并用正文证据检查 hot 元素推进、warm 元素保温、cold 元素升温、archived 元素不误激活和合理休眠说明。' : '',
    continuityHeatContract ? JSON.stringify(continuityHeatContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildCharacterRelationPromptSection(characterRelationContract: any) {
  return [
    characterRelationContract ? '【角色关系合同】' : '',
    characterRelationContract ? '硬性要求：执行 chapter_target.character_relation_contract；这是来自 oh-story character-relations / character-design-methods 的关系线口径，正文必须让重要关系有类型、功能、考验、态度变化、主角独立目标、恋爱之外的行动线和配角期待枢纽。' : '',
    characterRelationContract ? '执行方式：关系类型明确；主角不能只是帮别人实现目标；角色不止恋爱，不能只是单薄的情感工具人；配角不能站桩等触发；配角期待枢纽/人物扣必须把一个关键配角写成任务基地，同时承载短期和长期期待，并在主角解决事件后开启新一轮装逼、新任务或新剧情；关系变化必须写成选择、行动、代价、误解、作证、背叛、牺牲、保护、压迫或态度转向。' : '',
    characterRelationContract ? '目标归属：主角目标必须属于自己的，关系线可以互助，但主角必须保留自己的诉求、主动选择和代价，不能只是在帮别人实现目标。' : '',
    characterRelationContract ? '角色不止恋爱：角色生命中必须有恋爱之外的内容，重要关系可以提供情绪价值，但角色还要保留事业、责任、资源、身份、家族、风险或行动线。' : '',
    characterRelationContract ? '配角期待枢纽：选一个配角做任务基地，一个人物同时承载多个短期和长期期待；主角每次解决事件装完逼后回到该人物处开始新一轮装逼；人物下线时必须带来更大好处，用歪打误撞收获更多转化损失厌恶。' : '',
    characterRelationContract ? '配角攻略缓冲区：配角不能像 NPC 一样站着等主角触发；必须保留信息差、地位差距、亲密度差距或信任程度，并在关键拐点写出配角从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。' : '',
    characterRelationContract?.relationship_types?.length ? `关系类型：${joinList(characterRelationContract.relationship_types)}` : '',
    characterRelationContract?.important_relationships?.length ? `重要关系：${joinList(characterRelationContract.important_relationships)}` : '',
    characterRelationContract?.independent_goals?.length ? `独立目标：${joinList(characterRelationContract.independent_goals)}` : '',
    characterRelationContract?.goal_ownership_rules?.length ? `目标归属：${joinList(characterRelationContract.goal_ownership_rules)}` : '',
    characterRelationContract?.relationship_life_rules?.length ? `角色不止恋爱：${joinList(characterRelationContract.relationship_life_rules)}` : '',
    characterRelationContract?.expectation_hub_rules?.length ? `配角期待枢纽：${joinList(characterRelationContract.expectation_hub_rules)}` : '',
    characterRelationContract?.buffer_zone_rules?.length ? `配角攻略缓冲区：${joinList(characterRelationContract.buffer_zone_rules)}` : '',
    characterRelationContract?.tests_or_pressure?.length ? `考验/压力：${joinList(characterRelationContract.tests_or_pressure)}` : '',
    characterRelationContract?.attitude_shifts?.length ? `态度变化：${joinList(characterRelationContract.attitude_shifts)}` : '',
    characterRelationContract?.quality_checks?.length ? `质量检查：${joinList(characterRelationContract.quality_checks)}` : '',
    characterRelationContract ? '交稿自检必须输出 character_relation_checks，并用正文证据检查关系类型、关系弧线、主角目标独立性、目标归属、角色不止恋爱、配角期待枢纽、配角攻略缓冲区、配角主动行动、态度变化和阶段匹配。' : '',
    characterRelationContract ? JSON.stringify(characterRelationContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildCharacterBehaviorPromptSection(characterBehaviorContract: any) {
  return [
    characterBehaviorContract ? '【角色行为合同】' : '',
    characterBehaviorContract ? '硬性要求：执行 chapter_target.character_behavior_contract；这是来自 oh-story character-basics / character-design-methods 的角色行为口径，正文必须让角色行为由动机链驱动，并用行动、对话和反应展示人设。' : '',
    characterBehaviorContract ? '动机具体性：起因必须具体，不能写成“被欺负/被针对”这种模糊说法；动机必须是情感层面的，不能只写“要成为最强/想变强”；动机演变必须有触发事件或代价铺垫。' : '',
    characterBehaviorContract ? '执行方式：主角行为三必须（可理解、可共鸣、可接受）；三层标签反差（身份标签、表现标签、内核标签）必须落到行为对比；展示优于告知；每个有台词配角必须有功能；反派不能降智送赢。' : '',
    characterBehaviorContract ? '主角逼格反应：升级线与主角反应线分开管理；升级只提升实力/能力，不自动改变主角从容反应。面对低级挑衅时，主角不能被牵着走，必须用轻描淡写、短句反锁、行动压制或旁观者反应放大爽点，禁止暴怒、面红耳赤、歇斯底里式反击。' : '',
    characterBehaviorContract ? '人设强关联：每个重要角色至少 3 个强关联设定，直接影响剧情走向、核心梗装逼爽点或人物碰撞；外貌、爱好、身高体重只能做弱关联记忆点，不能喧宾夺主。' : '',
    characterBehaviorContract ? '角色卡必备项：主角卡必须覆盖角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作；核心动机要是情感驱动，弱点必须能造成选择压力或犯错。' : '',
    characterBehaviorContract ? '配角退场规划：配角卡必须覆盖角色功能、与主角关系、核心特质、标志性特征、退场方式；同一场景配角不超过 3 个有台词，无功能角色合并为旁观反应、动作或叙事概括。' : '',
    characterBehaviorContract ? '行为重复点：抓住一个读者喜欢的人物行为特质，在不同场景重复；行为、语言、思维必须围绕人设展开，为了剧情需要违背人设时先改剧情。' : '',
    characterBehaviorContract ? '人推事件：情节要从人物性格、动机和选择自然推出；卡文时从人物动机找方向，不要让外部事件硬砸或作者硬编剧情。' : '',
    characterBehaviorContract ? '主角红线：不得写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃；压势不压人，不能让读者看不起主角。' : '',
    characterBehaviorContract ? '身份/金手指对齐：社会身份、身世、金手指、性格必须与世界基调统一；显性金手指贴合职业/身份/生活困境，隐性金手指落在性格优势。' : '',
    characterBehaviorContract ? '反派分量：执行反派建立四要素（实力展示、动机可信、真实威胁、终极意图时机）；反派弱则主角赢没意义，真实目的不要开场说尽，反派长处要照出主角弱点。' : '',
    characterBehaviorContract ? '反派自我叙事：执行“反派也有梦想”，在反派眼中他是自己故事的主人公；补旧痛/创伤、让人恨不起来的侧面和理念冲突，优势本身也要成为致命缺陷。' : '',
    characterBehaviorContract ? '反派层级：按反派层级表匹配篇幅、功能和退场；小反派干脆利落，中等反派正面击败有爽感，大弧 Boss 有仪式感终战，最终 Boss 必须从第一章就有伏笔。' : '',
    characterBehaviorContract?.motivation_chain?.length ? `动机链：${joinList(characterBehaviorContract.motivation_chain)}` : '',
    characterBehaviorContract?.motivation_specificity_rules?.length ? `动机具体性：${joinList(characterBehaviorContract.motivation_specificity_rules)}` : '',
    characterBehaviorContract?.layered_tags?.length ? `三层标签反差：${joinList(characterBehaviorContract.layered_tags)}` : '',
    characterBehaviorContract?.behavior_rules?.length ? `行为规则：${joinList(characterBehaviorContract.behavior_rules)}` : '',
    characterBehaviorContract?.protagonist_composure_rules?.length ? `主角逼格反应：${joinList(characterBehaviorContract.protagonist_composure_rules)}` : '',
    characterBehaviorContract?.strong_association_rules?.length ? `人设强关联：${joinList(characterBehaviorContract.strong_association_rules)}` : '',
    characterBehaviorContract?.memory_anchors?.length ? `记忆锚点：${joinList(characterBehaviorContract.memory_anchors)}` : '',
    characterBehaviorContract?.supporting_role_functions?.length ? `配角功能：${joinList(characterBehaviorContract.supporting_role_functions)}` : '',
    characterBehaviorContract?.role_card_requirements?.length ? `角色卡必备项：${joinList(characterBehaviorContract.role_card_requirements)}` : '',
    characterBehaviorContract?.supporting_role_exit_rules?.length ? `配角退场规划：${joinList(characterBehaviorContract.supporting_role_exit_rules)}` : '',
    characterBehaviorContract?.behavior_repeat_rules?.length ? `行为重复点：${joinList(characterBehaviorContract.behavior_repeat_rules)}` : '',
    characterBehaviorContract?.character_driven_event_rules?.length ? `人推事件：${joinList(characterBehaviorContract.character_driven_event_rules)}` : '',
    characterBehaviorContract?.protagonist_red_line_rules?.length ? `主角红线：${joinList(characterBehaviorContract.protagonist_red_line_rules)}` : '',
    characterBehaviorContract?.identity_goldfinger_alignment_rules?.length ? `身份/金手指对齐：${joinList(characterBehaviorContract.identity_goldfinger_alignment_rules)}` : '',
    characterBehaviorContract?.antagonist_logic?.length ? `反派逻辑：${joinList(characterBehaviorContract.antagonist_logic)}` : '',
    characterBehaviorContract?.antagonist_weight_rules?.length ? `反派分量：${joinList(characterBehaviorContract.antagonist_weight_rules)}` : '',
    characterBehaviorContract?.antagonist_self_story_rules?.length ? `反派自我叙事：${joinList(characterBehaviorContract.antagonist_self_story_rules)}` : '',
    characterBehaviorContract?.antagonist_tier_exit_rules?.length ? `反派层级退场：${joinList(characterBehaviorContract.antagonist_tier_exit_rules)}` : '',
    characterBehaviorContract?.quality_checks?.length ? `character_behavior_checks：${joinList(characterBehaviorContract.quality_checks)}` : '',
    characterBehaviorContract ? '交稿自检必须输出 character_behavior_checks，并用正文证据检查主角行为三必须、动机链、动机具体性、三层标签反差、展示优于告知、主角逼格反应、记忆锚点、配角功能、角色卡必备项、配角退场规划、行为重复点、人推事件、主角红线、身份/金手指对齐、反派内在逻辑、反派分量、反派自我叙事和反派层级退场。' : '',
    characterBehaviorContract ? JSON.stringify(characterBehaviorContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildAssetLinkagePromptSection(assetLinkageContract: any, assetRelationshipGraphRisks: any[] = []) {
  return [
    assetLinkageContract ? '【资产挂钩合同】' : '',
    assetLinkageContract ? '硬性要求：执行 chapter_target.asset_linkage_contract；这是来自 oh-story artifact-protocols / state-tracking / writing-craft 的资产使用口径，正文必须让关键资产摆脱孤立名词状态。' : '',
    assetLinkageContract ? '执行方式：每个关键资产都要绑定功能、归属、触发条件、限制、后果；设定信息必须跟着冲突走；贯穿物件按三次出现规则建立意义、制造转折、兑现情绪或证据冲击；关键资产破局时按道具能力展示的8步期待模板拉期待。' : '',
    assetLinkageContract?.key_assets?.length ? `关键资产：${joinList(assetLinkageContract.key_assets)}` : '',
    assetLinkageContract?.linkage_plan?.length ? `挂钩计划：${joinList(assetLinkageContract.linkage_plan)}` : '',
    assetLinkageContract?.usage_rules?.length ? `使用规则：${joinList(assetLinkageContract.usage_rules)}` : '',
    assetLinkageContract?.state_tracking?.length ? `状态追踪：${joinList(assetLinkageContract.state_tracking)}` : '',
    assetLinkageContract?.three_appearance_plan?.length ? `三次出现：${joinList(assetLinkageContract.three_appearance_plan)}` : '',
    assetLinkageContract?.prop_ability_expectation_rules?.length ? `道具能力展示：${joinList(assetLinkageContract.prop_ability_expectation_rules)}` : '',
    assetLinkageContract?.forbidden_boundaries?.length ? `禁揭边界：${joinList(assetLinkageContract.forbidden_boundaries)}` : '',
    assetRelationshipGraphRisks.length ? `关系图风险：${joinList(assetRelationshipGraphRisks)}。不得让这些资产继续孤立、缺归属或悬空引用，必须把它们写成目标、冲突、回报、状态变化或章尾钩子的现场功能。` : '',
    assetLinkageContract?.quality_checks?.length ? `asset_linkage_checks：${joinList(assetLinkageContract.quality_checks)}` : '',
    assetLinkageContract ? '交稿自检必须输出 asset_linkage_checks，并用正文证据检查孤立资产、功能链、状态变化、信息跟冲突走、贯穿道具三次出现、道具能力展示的8步期待模板、禁揭/知识边界和新概念负载。' : '',
    assetLinkageContract ? JSON.stringify(assetLinkageContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStateTrackingPromptSection(stateTrackingContract: any) {
  return [
    stateTrackingContract ? '【状态筛选合同】' : '',
    stateTrackingContract ? '硬性要求：执行 chapter_target.state_tracking_contract；这是来自 oh-story state-tracking / workflow-daily Step 2.2 的本节速记口径，写正文前必须只加载/只使用会影响本章正确性的状态，也就是“如果不知道这个，本章会写错”的信息。' : '',
    stateTrackingContract ? '执行方式：本节速记必须分成角色状态、相关伏笔/前史、世界约束；角色状态不得漂移，上一章钩子和待回收伏笔必须接住，世界规则/地点/能力限制必须影响行动选择。' : '',
    stateTrackingContract ? '来源边界：source_requirements 的“已加载”只承认本轮 workflow 内实际读取或刚更新的本章细纲、上一章正文/尾段、追踪/上下文、追踪/伏笔、追踪/时间线、追踪/角色状态或对应角色设定；不得用未标明来源的聊天记忆替代。' : '',
    stateTrackingContract?.source_readiness?.length ? `来源就绪表：${JSON.stringify(stateTrackingContract.source_readiness).slice(0, 1800)}` : '',
    stateTrackingContract?.character_states?.length ? `角色状态：${joinList(stateTrackingContract.character_states)}` : '',
    stateTrackingContract?.historical_causality?.length ? `相关伏笔/前史：${joinList(stateTrackingContract.historical_causality)}` : '',
    stateTrackingContract?.world_constraints?.length ? `世界约束：${joinList(stateTrackingContract.world_constraints)}` : '',
    stateTrackingContract?.filter_rules?.length ? `筛选规则：${joinList(stateTrackingContract.filter_rules)}` : '',
    stateTrackingContract?.source_requirements?.length ? `来源要求：${joinList(stateTrackingContract.source_requirements)}` : '',
    stateTrackingContract?.quality_checks?.length ? `state_tracking_checks：${joinList(stateTrackingContract.quality_checks)}` : '',
    stateTrackingContract ? '交稿自检必须输出 state_tracking_checks，并用正文证据检查本节速记、角色状态、相关伏笔/前史、世界约束、来源边界和上下文不过载。' : '',
    stateTrackingContract ? JSON.stringify(stateTrackingContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildIntentConfirmationPromptSection(intentConfirmationContract: any) {
  return [
    intentConfirmationContract ? '【意图确认合同】' : '',
    intentConfirmationContract ? '硬性要求：执行 chapter_target.intent_confirmation_contract；这是来自 oh-story workflow-daily Step 2.4 的意图确认口径，正文必须按情绪+节奏+模块+文风指令统一发力。' : '',
    intentConfirmationContract ? '执行方式：内容概括决定起承转合；情节安排决定主线/辅线/事件线/感情线/逻辑线取舍；人物关系和出场顺序决定镜头进入顺序；代价/收益决定爽点落点；结尾设定和钩子决定章尾承接。' : '',
    intentConfirmationContract?.confirmed_intent ? `确认意图：${intentConfirmationContract.confirmed_intent}` : '',
    intentConfirmationContract?.rhythm_and_style?.length ? `情绪+节奏+模块+文风指令：${joinList(intentConfirmationContract.rhythm_and_style)}` : '',
    intentConfirmationContract?.structure_inputs?.length ? `结构输入：${joinList(intentConfirmationContract.structure_inputs)}` : '',
    intentConfirmationContract?.execution_focus?.length ? `执行重点：${joinList(intentConfirmationContract.execution_focus)}` : '',
    intentConfirmationContract?.dialogue_tone_baseline?.length ? `对白基调约束：${joinList(intentConfirmationContract.dialogue_tone_baseline)}` : '',
    intentConfirmationContract?.quality_checks?.length ? `intent_confirmation_checks：${joinList(intentConfirmationContract.quality_checks)}` : '',
    intentConfirmationContract ? '交稿自检必须输出 intent_confirmation_checks，并用正文证据检查情绪目标、节奏爆发、结构输入、信息差反应、代价/收益、章尾承接和文风召回边界。' : '',
    intentConfirmationContract ? JSON.stringify(intentConfirmationContract, null, 2).slice(0, 2500) : '',
    '',
  ]
}

export function buildStateTrackingReceiptPromptSection(stateTrackingContract: any) {
  return [
    stateTrackingContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts 必须逐项覆盖【状态筛选合同】中的角色状态、相关伏笔/前史、世界约束、filter_rules 和 source_requirements；每项包含 key,label,used_in_chapter,evidence,excluded_reason,remaining_risk，证明只加载/只使用会影响本章正确性的状态，未使用的信息必须写明为何不会导致本章写错。' : '',
    stateTrackingContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.source_readiness_checks 必须逐项覆盖【来源就绪表】；每项包含 key,label,status(pass|warn|fail),evidence,fix，证明 ready 来源已在正文可见承接，missing/warn 来源没有被当作既定事实使用。' : '',
  ]
}

export function buildIntentConfirmationReceiptPromptSection(intentConfirmationContract: any) {
  return [
    intentConfirmationContract ? '输出附加要求：oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks 必须逐项覆盖 chapter_target.intent_confirmation_contract 中的 confirmed_intent、rhythm_and_style、structure_inputs、dialogue_tone_baseline、logic_line、appearance_order、cost_and_reward、ending_handoff 和 quality_checks；每项包含 key,label,delivered,evidence,remaining_risk，未完成时 delivered=false 并写明下一章需要承接的意图偏移。' : '',
  ]
}

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
