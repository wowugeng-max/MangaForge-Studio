import { uniqueBriefStrings } from '../quality/text-utils'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import {
  proseQualityAuditRepairReceiptRisks,
  proseQualityBannedWordRisks,
  proseQualityBlueprintConsumptionRisks,
  proseQualityChapterBenchmarkRisks,
  proseQualityContentRubricRisks,
  proseQualityContinuityHeatRisks,
  proseQualityCoreContractRisks,
  proseQualityCraftMetricRisks,
  proseQualityDeliveryRiskReceiptRisks,
  proseQualityDeslopRepairCheckRisks,
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityDialogueRisks,
  proseQualityFiveDimensionRisks,
  proseQualityFocusedRevisionModeRisks,
  proseQualityGateFailureRisks,
  proseQualityHighSeverityFindings,
  proseQualityNextChapterPlanRisks,
  proseQualityPerspectiveVerdictRisks,
  proseQualityPlatformRubricRisks,
  proseQualityPlotDynamicsRisks,
  proseQualityQualitySpecialtyRisks,
  proseQualityReaderRetentionRisks,
  proseQualityRevisionContextRisks,
  proseQualityRevisionDirectiveRisks,
  proseQualityRevisionReceiptCheckRisks,
  proseQualityRevisionReceiptRisks,
  proseQualitySettingViolationRisks,
  proseQualityStructuredCheckRisks,
  proseQualityTitleUniquenessRisks,
  proseQualityWordCountRisks
} from '../quality/prose-quality-risks'

/** Append prose-quality-derived carry-over risk rows for the previous chapter. */

export function appendProseQualityDeliveryRiskCarryOverRowsMid(
  riskRows: any[],
  proseQualityEntry: any,
) {
  const contentRubricRisks = proseQualityContentRubricRisks(proseQualityEntry.payload || {})
  if (contentRubricRisks.length > 0) {
    const contentRubricEvidence = contentRubricRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.core_selling_point,
        item.conflict_progression,
        item.chapter_change,
        item.page_turn_reason,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: contentRubricRisks.length,
      item: `内容基准：基准缺口 ${contentRubricRisks.length}`,
      priorityLabel: '优先修内容基准',
      evidence: contentRubricEvidence,
      openingActions: [
        `内容基准开篇修复：前300字先兑现 content_rubric_checks 的 core_selling_point，让当前事件立刻服务核心卖点和读者期待；${contentRubricEvidence[0] || '开篇先把核心卖点写成可见事件。'}`,
      ],
      middleActions: [
        `内容基准中段修复：按 conflict_progression 和 chapter_change 推进最小剧情循环，必须写出目标、阻碍、行动、反馈和不可删除变化；${contentRubricEvidence[0] || '中段让本章发生明确变化。'}`,
      ],
      endingActions: [
        `内容基准章尾修复：章尾必须回答 page_turn_reason，把本章改变转成下一章问题、代价或新证据，不能停在规则说明；${contentRubricEvidence[0] || '章尾给清楚翻页理由。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const titleUniquenessRisks = proseQualityTitleUniquenessRisks(proseQualityEntry.payload || {})
  if (titleUniquenessRisks.length > 0) {
    const titleUniquenessEvidence = titleUniquenessRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence, item.new_title, item.old_title])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: titleUniquenessRisks.length,
      item: `章节标题：标题缺口 ${titleUniquenessRisks.length}`,
      priorityLabel: '优先修章节标题',
      evidence: titleUniquenessEvidence,
      openingActions: [
        `章节标题开篇修复：前300字先用 old_title/new_title 对照，把新标题承诺写成差异化画面、核心事件或关键资产，不能沿用旧标题气质；${titleUniquenessEvidence[0] || '开篇先兑现新标题承诺。'}`,
      ],
      middleActions: [
        `章节标题中段修复：按 new_title 同步本章主事件、冲突转折和标题关键词，确保正文中段能证明新标题不是只改显示名；${titleUniquenessEvidence[0] || '中段让新标题对应真实事件。'}`,
      ],
      endingActions: [
        `章节标题章尾修复：检查大纲标题、文件名和正文标题行是否同步，章尾继续承接新标题的钩子或关键资产，不回到旧标题问题；${titleUniquenessEvidence[0] || '章尾同步并承接标题承诺。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const blueprintConsumptionRisks = proseQualityBlueprintConsumptionRisks(proseQualityEntry.payload || {})
  if (blueprintConsumptionRisks.length > 0) {
    const blueprintConsumptionEvidence = blueprintConsumptionRisks
      .flatMap((item: any) => [item.action, item.fix, item.missing_gap, item.delivered_evidence, item.remaining_risk])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: blueprintConsumptionRisks.length,
      item: `细纲兑现：执行缺口 ${blueprintConsumptionRisks.length}`,
      priorityLabel: '优先补细纲兑现',
      evidence: blueprintConsumptionEvidence,
      openingActions: [
        `细纲兑现开篇修复：前300字先执行 blueprint_consumption_checks 的 blueprint_field/expected，把漏掉的细纲字段变成当前场景目标、阻碍或必须兑现的动作；${blueprintConsumptionEvidence[0] || '开篇先把细纲缺口落成事件目标。'}`,
      ],
      middleActions: [
        `细纲兑现中段修复：按 expected 和 missing_gap 补齐行动、代价、收益、信息变化或关系变化，不能只写结果或概括已完成；${blueprintConsumptionEvidence[0] || '中段补齐细纲执行证据。'}`,
      ],
      endingActions: [
        `细纲兑现章尾修复：检查 remaining_risk，把未兑现的章尾承接、代价余波或下一章压力写成故事内钩子；${blueprintConsumptionEvidence[0] || '章尾补细纲承接。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const wordCountRisks = proseQualityWordCountRisks(proseQualityEntry.payload || {})
  if (wordCountRisks.length > 0) {
    const wordCountEvidence = wordCountRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: wordCountRisks.length,
      item: `字数执行：扩写缺口 ${wordCountRisks.length}`,
      priorityLabel: '优先补字数执行',
      evidence: wordCountEvidence,
      openingActions: [
        `字数执行开篇修复：前300字先按 word_count_checks 的 current_count/target_count/min_required_count 判断缺口，用一个可见事件或明确阻碍打开扩写，不靠说明和环境水文；${wordCountEvidence[0] || '开篇先把字数缺口变成事件压力。'}`,
      ],
      middleActions: [
        `字数执行中段修复：按 target_count 补足动作过程、选择代价、对话交锋、信息变化和场景反馈，每段扩写都必须推动剧情或情绪变化；${wordCountEvidence[0] || '中段用功能内容补字数。'}`,
      ],
      endingActions: [
        `字数执行章尾修复：检查 min_required_count 和 remaining_risk，章尾补钩子铺垫、代价余波或下一章动作压力，不得用重复情绪/内心独白凑字；${wordCountEvidence[0] || '章尾补功能性钩子而不是凑字。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const bannedWordRisks = proseQualityBannedWordRisks(proseQualityEntry.payload || {})
  if (bannedWordRisks.length > 0) {
    const bannedWordEvidence = bannedWordRisks
      .flatMap((item: any) => [item.action, item.fix, item.replacement, item.remaining_risk, item.evidence])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: bannedWordRisks.length,
      item: `禁用词：硬禁缺口 ${bannedWordRisks.length}`,
      priorityLabel: '优先修禁用词',
      evidence: bannedWordEvidence,
      openingActions: [
        `禁用词开篇修复：前300字先执行 banned_words_checks 的 matched_word/location 扫描，标题行以外不得复现硬禁词或模板表达；${bannedWordEvidence[0] || '开篇先清掉硬禁词。'}`,
      ],
      middleActions: [
        `禁用词中段修复：按 replacement 把禁用词改成角色动作、物件反馈、短对白或现场反应，不用抽象升华和模板句；${bannedWordEvidence[0] || '中段用具体动作替换禁用词。'}`,
      ],
      endingActions: [
        `禁用词章尾修复：检查 remaining_risk，章尾不能复现命中词、作者预告或总结升华，要用故事内动作/新证据/新阻碍收束；${bannedWordEvidence[0] || '章尾继续清理硬禁残留。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const chapterBenchmarkRisks = proseQualityChapterBenchmarkRisks(proseQualityEntry.payload || {})
  if (chapterBenchmarkRisks.length > 0) {
    const chapterBenchmarkEvidence = chapterBenchmarkRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.delivered_evidence, item.originality_guard])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: chapterBenchmarkRisks.length,
      item: `章节基准：基准缺口 ${chapterBenchmarkRisks.length}`,
      priorityLabel: '优先补章节基准',
      evidence: chapterBenchmarkEvidence,
      openingActions: [
        `章节基准开篇修复：前300字先执行 chapter_benchmark_checks 的 benchmark_dimension，提取对标章的节奏/场面/情绪功能，不复制桥段或原句；${chapterBenchmarkEvidence[0] || '开篇先把章节基准落成当前事件。'}`,
      ],
      middleActions: [
        `章节基准中段修复：按 expected_method 把对标方法改成本书目标、阻碍、升级、反转或回报，必须有 delivered_evidence 可定位；${chapterBenchmarkEvidence[0] || '中段用本书事件执行对标方法。'}`,
      ],
      endingActions: [
        `章节基准章尾修复：检查 originality_guard 和 remaining_risk，章尾只保留功能性回收和下一层问题，不得复刻对标章桥段/原句/专有设定；${chapterBenchmarkEvidence[0] || '章尾守住原创边界。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const longformRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
    snakeField: 'longform_checks',
    camelField: 'longformChecks',
    actionPrefix: 'longform_checks',
    fallbackLabel: '长篇专项',
    detailFields: [
      ['recent_5_chapter_progress', 'recent5ChapterProgress'],
      ['payoff_interval', 'payoffInterval'],
      ['stage_goal_shift', 'stageGoalShift'],
      ['next_stage_pull', 'nextStagePull'],
      ['context_layer', 'contextLayer'],
    ],
  })
  if (longformRisks.length > 0) {
    const longformEvidence = uniqueBriefStrings(longformRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean), 8)
    const longformOpeningEvidence = longformEvidence.find((item: string) => /recent_5_chapter_progress|最近5章|主线|stage_goal_shift|阶段目标/i.test(item))
    const longformMiddleEvidence = longformEvidence.find((item: string) => /payoff_interval|爽点|回报|context_layer|当前场景/i.test(item))
    const longformEndingEvidence = longformEvidence.find((item: string) => /next_stage_pull|下一阶段|牵引|下一章|航点/i.test(item))
    riskRows.push({
      count: longformRisks.length,
      item: `长篇专项：长线缺口 ${longformRisks.length}`,
      priorityLabel: '优先补长篇专项',
      evidence: longformEvidence,
      openingActions: [
        `长篇专项开篇修复：前300字先处理 longform_checks 的 recent_5_chapter_progress/stage_goal_shift，把最近5章停滞改成当前章明确航点或阶段目标推进；${longformOpeningEvidence || longformEvidence[0] || '开篇先把长线目标压回当前章。'}`,
      ],
      middleActions: [
        `长篇专项中段修复：中段必须按 payoff_interval/context_layer 给阶段爽点、上下文层进入场景和不可删除变化，不能继续原地解释；${longformMiddleEvidence || longformEvidence[0] || '中段补长线回报和场景推进。'}`,
      ],
      endingActions: [
        `长篇专项章尾修复：章尾按 next_stage_pull 留下下一阶段入口、新代价或新航点，证明长线推进已经换挡；${longformEndingEvidence || longformEvidence[0] || '章尾给下一阶段牵引。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const innovationRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
    snakeField: 'innovation_checks',
    camelField: 'innovationChecks',
    actionPrefix: 'innovation_checks',
    fallbackLabel: '创新执行',
    detailFields: [
      ['innovation_type', 'innovationType'],
      ['differentiating_mechanism', 'differentiatingMechanism'],
      ['visualized_scene', 'visualizedScene'],
      ['reader_retellable_hook', 'readerRetellableHook'],
      ['long_term_fit', 'longTermFit'],
    ],
  })
  if (innovationRisks.length > 0) {
    const innovationEvidence = uniqueBriefStrings(innovationRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean), 8)
    const innovationMechanismEvidence = innovationEvidence.find((item: string) => /innovation_type|differentiating_mechanism|创新|机制|反差|差异/i.test(item))
    const innovationVisualEvidence = innovationEvidence.find((item: string) => /visualized_scene|reader_retellable_hook|可视|可复述|场面/i.test(item))
    const innovationFitEvidence = innovationEvidence.find((item: string) => /long_term_fit|长期|下一章|牵引|后续/i.test(item))
    riskRows.push({
      count: innovationRisks.length,
      item: `创新：创新缺口 ${innovationRisks.length}`,
      priorityLabel: '优先补创新',
      evidence: innovationEvidence,
      openingActions: [
        `创新开篇修复：前300字先执行 innovation_checks 的 innovation_type/differentiating_mechanism，把创新点写成可见规则、异常或选择压力；${innovationMechanismEvidence || innovationEvidence[0] || '开篇先亮出创新机制。'}`,
      ],
      middleActions: [
        `创新中段修复：中段必须交付 visualized_scene/reader_retellable_hook，让创新点参与行动、反制、场面或读者可复述回报；${innovationVisualEvidence || innovationEvidence[0] || '中段把创新点变成可复述场面。'}`,
      ],
      endingActions: [
        `创新章尾修复：章尾按 long_term_fit 复核创新点是否能继续服务长线，并抛出由创新机制带来的下一章问题；${innovationFitEvidence || innovationEvidence[0] || '章尾让创新机制继续拉动后续。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const chapterAttractionRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
    snakeField: 'chapter_attraction_checks',
    camelField: 'chapterAttractionChecks',
    actionPrefix: 'chapter_attraction_checks',
    fallbackLabel: '吸引力缺口',
    detailFields: [
      ['attraction_dimension', 'attractionDimension'],
      ['opening_hook', 'openingHook'],
      ['scene_goal_obstacle_turn_reward', 'sceneGoalObstacleTurnReward'],
      ['payoff_density', 'payoffDensity'],
      ['ending_page_turn', 'endingPageTurn'],
      ['spreadable_scene', 'spreadableScene'],
    ],
  })
  if (chapterAttractionRisks.length > 0) {
    const chapterAttractionEvidence = uniqueBriefStrings(chapterAttractionRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean), 8)
    const attractionOpeningEvidence = chapterAttractionEvidence.find((item: string) => /opening_hook|开篇|开头|第一幕|触发/i.test(item))
    const attractionMiddleEvidence = chapterAttractionEvidence.find((item: string) => /scene_goal_obstacle_turn_reward|payoff_density|目标|阻碍|回报|密度/i.test(item))
    const attractionEndingEvidence = chapterAttractionEvidence.find((item: string) => /ending_page_turn|章末|翻页|下一章|spreadable_scene|传播/i.test(item))
    riskRows.push({
      count: chapterAttractionRisks.length,
      item: `修吸引力：吸引力缺口 ${chapterAttractionRisks.length}`,
      priorityLabel: '优先修章节吸引力',
      evidence: chapterAttractionEvidence,
      openingActions: [
        `吸引力开篇修复：前300字先执行 chapter_attraction_checks 的 opening_hook/attraction_dimension，让异常、目标或矛盾直接出现；${attractionOpeningEvidence || chapterAttractionEvidence[0] || '开篇先补章节吸引力。'}`,
      ],
      middleActions: [
        `吸引力中段修复：中段必须落实 scene_goal_obstacle_turn_reward/payoff_density，把目标、阻碍、转折、回报写成连锁事件；${attractionMiddleEvidence || chapterAttractionEvidence[0] || '中段用目标阻碍回报补吸引力。'}`,
      ],
      endingActions: [
        `吸引力章尾修复：章尾按 ending_page_turn/spreadable_scene 留下可复述强画面、翻页问题或下一章行动方向；${attractionEndingEvidence || chapterAttractionEvidence[0] || '章尾补足翻页拉力。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const storyDriveRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
    snakeField: 'story_drive_checks',
    camelField: 'storyDriveChecks',
    actionPrefix: 'story_drive_checks',
    fallbackLabel: '故事驱动',
    detailFields: [
      ['protagonist_choice', 'protagonistChoice'],
      ['obstacle'],
      ['cost'],
      ['state_change', 'stateChange'],
      ['next_causality', 'nextCausality'],
    ],
  })
  if (storyDriveRisks.length > 0) {
    const storyDriveEvidence = uniqueBriefStrings(storyDriveRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean), 8)
    const storyDriveOpeningEvidence = storyDriveEvidence.find((item: string) => /protagonist_choice|主角|主动|选择|目标/i.test(item))
    const storyDriveMiddleEvidence = storyDriveEvidence.find((item: string) => /obstacle|cost|阻碍|代价|暴露|选择代价/i.test(item))
    const storyDriveEndingEvidence = storyDriveEvidence.find((item: string) => /state_change|next_causality|状态变化|因果|下一步|明日/i.test(item))
    riskRows.push({
      count: storyDriveRisks.length,
      item: `故事力：驱动缺口 ${storyDriveRisks.length}`,
      priorityLabel: '优先补故事力',
      evidence: storyDriveEvidence,
      openingActions: [
        `故事力开篇修复：前300字先执行 story_drive_checks 的 protagonist_choice，让主角带着明确选择、目标或主动押注进入场景；${storyDriveOpeningEvidence || storyDriveEvidence[0] || '开篇先让主角主动选择。'}`,
      ],
      middleActions: [
        `故事力中段修复：中段必须落实 obstacle/cost，把阻碍、选择代价、资源损耗或关系代价写成可见事件；${storyDriveMiddleEvidence || storyDriveEvidence[0] || '中段把故事驱动写成阻碍和代价。'}`,
      ],
      endingActions: [
        `故事力章尾修复：章尾按 state_change/next_causality 给出状态变化和下一步因果，不能只停在局势说明；${storyDriveEndingEvidence || storyDriveEvidence[0] || '章尾交付状态变化和下一步因果。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const characterArcRisks = proseQualityStructuredCheckRisks(proseQualityEntry.payload || {}, {
    snakeField: 'character_arc_checks',
    camelField: 'characterArcChecks',
    actionPrefix: 'character_arc_checks',
    fallbackLabel: '人物弧光',
    detailFields: [
      ['character'],
      ['desire'],
      ['flaw_pressure', 'flawPressure'],
      ['relationship_change', 'relationshipChange'],
      ['growth_beat', 'growthBeat'],
      ['voice_anchor', 'voiceAnchor'],
    ],
  })
  if (characterArcRisks.length > 0) {
    const characterArcEvidence = uniqueBriefStrings(characterArcRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence])
      .filter(Boolean), 8)
    const characterArcOpeningEvidence = characterArcEvidence.find((item: string) => /character|desire|人物|欲望|资格|目标/i.test(item))
    const characterArcMiddleEvidence = characterArcEvidence.find((item: string) => /flaw_pressure|relationship_change|缺陷|关系变化|求证|压力/i.test(item))
    const characterArcEndingEvidence = characterArcEvidence.find((item: string) => /growth_beat|voice_anchor|成长|口吻|短句|承认/i.test(item))
    riskRows.push({
      count: characterArcRisks.length,
      item: `人物弧光：弧光缺口 ${characterArcRisks.length}`,
      priorityLabel: '优先补人物弧光',
      evidence: characterArcEvidence,
      openingActions: [
        `人物弧光开篇修复：前300字先执行 character_arc_checks 的 character/desire，让人物欲望和本章目标进入当前压力；${characterArcOpeningEvidence || characterArcEvidence[0] || '开篇先让人物欲望显形。'}`,
      ],
      middleActions: [
        `人物弧光中段修复：中段必须落实 flaw_pressure/relationship_change，把缺陷受压、关系变化或主动求证写成可见互动；${characterArcMiddleEvidence || characterArcEvidence[0] || '中段把弧光写成关系和缺陷压力。'}`,
      ],
      endingActions: [
        `人物弧光章尾修复：章尾按 growth_beat/voice_anchor 交付成长节点和口吻锚点，让变化留在动作或对白里；${characterArcEndingEvidence || characterArcEvidence[0] || '章尾交付成长节点和声音变化。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const qualitySpecialtyRisks = proseQualityQualitySpecialtyRisks(proseQualityEntry.payload || {})
  if (qualitySpecialtyRisks.length > 0) {
    const qualitySpecialtyEvidence = uniqueBriefStrings([
      ...qualitySpecialtyRisks.map((item: any) => item.action),
      ...qualitySpecialtyRisks.map((item: any) => item.evidence),
      ...qualitySpecialtyRisks.map((item: any) => item.label),
    ].filter(Boolean), 8)
    const qualitySpecialtyOpeningEvidence = qualitySpecialtyEvidence.find((item: string) => /structure_checks|opening_hook|开篇|开头|第一幕/i.test(item))
    const qualitySpecialtyMiddleEvidence = qualitySpecialtyEvidence.find((item: string) => /progression_checks|non_deletable_change|不可删除|关系|主线状态|中段/i.test(item))
    const qualitySpecialtyEndingEvidence = qualitySpecialtyEvidence.find((item: string) => /information_checks|new_concept_count|信息|概念|章尾|延后/i.test(item))
    riskRows.push({
      count: qualitySpecialtyRisks.length,
      item: `质量专项：结构推进信息缺口 ${qualitySpecialtyRisks.length}`,
      priorityLabel: '优先修质量专项',
      evidence: qualitySpecialtyEvidence,
      openingActions: [
        `质量专项开篇修复：前300字先处理 structure_checks/opening_hook，把目标触发、异常或冲突放到第一幕，不再复述背景；${qualitySpecialtyOpeningEvidence || qualitySpecialtyEvidence[0] || '开篇先补结构缺口。'}`,
      ],
      middleActions: [
        `质量专项中段修复：中段必须执行 progression_checks/non_deletable_change，让关系、主线状态、资源或目标发生不可删除变化；${qualitySpecialtyMiddleEvidence || qualitySpecialtyEvidence[0] || '中段补不可删除变化。'}`,
      ],
      endingActions: [
        `质量专项章尾修复：章尾按 information_checks/new_concept_count 控制信息负载，只保留必要信息点，并把剩余概念转成动作延后或下一章问题；${qualitySpecialtyEndingEvidence || qualitySpecialtyEvidence[0] || '章尾控制信息负载并留下问题。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const coreContractRisks = proseQualityCoreContractRisks(proseQualityEntry.payload || {})
  if (coreContractRisks.length > 0) {
    const coreContractEvidence = coreContractRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.evidence, item.core_promise, item.mainline_service, item.rule_judgement, item.ending_question])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: coreContractRisks.length,
      item: `创作契约：核心承诺缺口 ${coreContractRisks.length}`,
      priorityLabel: '优先修创作契约',
      evidence: coreContractEvidence,
      openingActions: [
        `创作契约开篇修复：前300字先把 core_contract_checks 指出的核心承诺、核心冲突或漂移红线压回当前事件；${coreContractEvidence[0] || '先让核心承诺进入开篇压力。'}`,
      ],
      middleActions: [
        `创作契约中段修复：用规则判定、角色选择、反制代价或读者回报兑现核心承诺；${coreContractEvidence[0] || '把核心承诺写成中段胜负变化。'}`,
      ],
      endingActions: [
        `创作契约章尾修复：章尾必须把核心承诺转成下一章新问题、升级压力或追读钩子；${coreContractEvidence[0] || '章尾继续服务核心承诺。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const readerRetentionRisks = proseQualityReaderRetentionRisks(proseQualityEntry.payload || {})
  if (readerRetentionRisks.length > 0) {
    const readerRetentionEvidence = readerRetentionRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.retention_engine,
        item.emotional_payoff,
        item.information_hunger,
        item.page_turn_question,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: readerRetentionRisks.length,
      item: `创作契约：追读留存缺口 ${readerRetentionRisks.length}`,
      priorityLabel: '优先修创作契约',
      evidence: readerRetentionEvidence,
      openingActions: [
        `创作契约开篇修复：前300字必须执行 reader_retention_checks 的 retention_engine，让读者立刻知道本章还有未解压力；${readerRetentionEvidence[0] || '先把追读留存缺口变成开篇触发。'}`,
      ],
      middleActions: [
        `创作契约中段修复：用 emotional_payoff 和 information_hunger 补足行动、奖励、奖励随机性或沉没投入；${readerRetentionEvidence[0] || '把追读留存写成中段事件推进。'}`,
      ],
      endingActions: [
        `创作契约章尾修复：最后300字必须用 page_turn_question、信息差、剥洋葱、危险升级或新问题形成下一章拉力；${readerRetentionEvidence[1] || readerRetentionEvidence[0] || '章尾必须留下可追读的问题。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const perspectiveVerdictRisks = proseQualityPerspectiveVerdictRisks(proseQualityEntry.payload || {})
  if (perspectiveVerdictRisks.length > 0) {
    const perspectiveVerdictEvidence = uniqueBriefStrings(perspectiveVerdictRisks
      .flatMap((item: any) => [
        ...item.evidence,
        `${item.reviewer} ${item.verdict}`,
      ])
      .filter(Boolean), 8)
    const perspectiveOpeningEvidence = perspectiveVerdictEvidence.find((item: string) => /开篇|对上|目标|名单|身份|追查/i.test(item))
    const perspectiveMiddleEvidence = perspectiveVerdictEvidence.find((item: string) => /隔物|验证|动作|证据|规则|触碰|统一/i.test(item))
    const perspectiveEndingEvidence = perspectiveVerdictEvidence.find((item: string) => /章末|钩子|下一章|结构|CONCERNS|REJECT/i.test(item))
    riskRows.push({
      count: perspectiveVerdictRisks.length,
      item: `多视角审查：视角风险 ${perspectiveVerdictRisks.length}`,
      priorityLabel: '优先处理多视角审查',
      evidence: perspectiveVerdictEvidence,
      openingActions: [
        `多视角审查开篇修复：前300字先处理 perspective_verdicts 的 CONCERNS/REJECT，把结构、设定或一致性意见转成当前场景目标；${perspectiveOpeningEvidence || perspectiveVerdictEvidence[0] || '开篇先处理多视角审查风险。'}`,
      ],
      middleActions: [
        `多视角审查中段修复：中段必须按 findings/recommendations 写出验证动作、规则约束、证据变化或角色选择，不能只口头解释；${perspectiveMiddleEvidence || perspectiveVerdictEvidence[0] || '中段把多视角意见落成可见事件。'}`,
      ],
      endingActions: [
        `多视角审查章尾修复：章尾复核 REJECT/CONCERNS 是否闭环，并把结构钩子、一致性后果或下一章目标写成新压力；${perspectiveEndingEvidence || perspectiveVerdictEvidence[0] || '章尾确认多视角审查闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const deslopRisks = proseQualityDeslopRisks(proseQualityEntry.payload || {})
  if (deslopRisks.length > 0) {
    const hasDeslopDiagnostics = deslopRisks.some((item: any) => item.diagnostic)
    const deslopEvidence = uniqueBriefStrings(deslopRisks
      .flatMap((item: any) => [
        item.fix,
        item.evidence,
        `${/^gate/i.test(String(item.gate || '')) ? item.gate : `Gate ${item.gate}`} ${item.pattern}`,
      ])
      .filter(Boolean), 8)
    const deslopRewriteEvidence = deslopEvidence.find((item: string) => /水迹|倒流|逼问|遮掩|短对白|可见|直接写/i.test(item))
    const deslopGateEvidence = deslopEvidence.find((item: string) => /Gate A|Gate B|不是A|禁用词|模板|否定铺垫/i.test(item))
    const deslopEndingEvidence = deslopEvidence.find((item: string) => /Gate G|Gate E|解释腔|对话|上帝视角|作者预告|悬念|名单缺页/i.test(item))
    riskRows.push({
      count: deslopRisks.length,
      item: `去AI味：${hasDeslopDiagnostics ? '门禁摘要' : '门禁缺口'} ${deslopRisks.length}`,
      priorityLabel: '优先去AI味',
      evidence: deslopEvidence,
      openingActions: [
        `去AI味门禁开篇修复：前300字先处理 deslop_checks/deslop_gate_diagnostics 的 fail/warn Gate，把模板表达改成现场物象、动作或短对白；${deslopRewriteEvidence || deslopEvidence[0] || '开篇先处理去AI味门禁缺口。'}`,
      ],
      middleActions: [
        `去AI味门禁中段修复：按 Gate A-G 的 fix 改写 AI 味模式，让每个修复都落成事件推进、信息变化或人物交锋；${deslopGateEvidence || deslopRewriteEvidence || deslopEvidence[0] || '中段用可见事件替代模板表达。'}`,
      ],
      endingActions: [
        `去AI味门禁章尾修复：章尾复核 Gate E、Gate G 等对话腔、解释腔、上帝视角和作者预告不再复现，用故事内悬念或后果收束；${deslopEndingEvidence || deslopEvidence[0] || '章尾确认去AI味门禁闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const dialogueRisks = proseQualityDialogueRisks(proseQualityEntry.payload || {})
  if (dialogueRisks.length > 0) {
    const dialogueEvidence = dialogueRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.speaker,
        item.agenda,
        item.subtext,
        item.power_shift,
        item.information_delta,
        item.character_voice,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: dialogueRisks.length,
      item: `修对白：对白缺口 ${dialogueRisks.length}`,
      priorityLabel: '优先修对白',
      evidence: dialogueEvidence,
      openingActions: [
        `对白开篇修复：开篇必须执行 dialogue_checks 的 speaker、agenda 和 character_voice，让说话人、真实诉求和声线先分清；${dialogueEvidence[0] || '开篇先锁定对白双方和各自诉求。'}`,
      ],
      middleActions: [
        `对白中段修复：中段必须落实 subtext 和 power_shift，让潜台词推动权力变化，不能让角色轮流解释剧情；${dialogueEvidence[0] || '中段用潜台词推动权力变化。'}`,
      ],
      endingActions: [
        `对白章尾修复：章尾必须给出 information_delta 或声线差异带来的新压力，把对白转成信息增量、关系变化或下一步行动；${dialogueEvidence[0] || '章尾用对白交付信息增量。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const plotDynamicsRisks = proseQualityPlotDynamicsRisks(proseQualityEntry.payload || {})
  if (plotDynamicsRisks.length > 0) {
    const plotDynamicsEvidence = plotDynamicsRisks
      .flatMap((item: any) => [
        item.action_directive,
        item.fix,
        item.remaining_risk,
        item.goal,
        item.obstacle,
        item.action,
        item.cost_or_feedback,
        item.new_expectation,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: plotDynamicsRisks.length,
      item: `修剧情动力：动力缺口 ${plotDynamicsRisks.length}`,
      priorityLabel: '优先修剧情动力',
      evidence: plotDynamicsEvidence,
      openingActions: [
        `剧情动力开篇修复：开篇必须执行 plot_dynamics_checks 的 goal 和 obstacle，让本章目标与阻碍先成立；${plotDynamicsEvidence[0] || '开篇先立目标和阻碍。'}`,
      ],
      middleActions: [
        `剧情动力中段修复：中段必须落实 action 和 cost_or_feedback，让主角行动产生代价、反馈或非可删变化；${plotDynamicsEvidence[0] || '中段用行动和反馈推进。'}`,
      ],
      endingActions: [
        `剧情动力章尾修复：章尾必须抬出 new_expectation，把本章行动结果转成下一步期待，不能原地发现线索；${plotDynamicsEvidence[0] || '章尾给出新的行动期待。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const continuityHeatRisks = proseQualityContinuityHeatRisks(proseQualityEntry.payload || {})
  if (continuityHeatRisks.length > 0) {
    const continuityHeatEvidence = continuityHeatRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.heat_state,
        item.hot_progress,
        item.warm_keepalive,
        item.cold_warmup,
        item.archived_boundary,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: continuityHeatRisks.length,
      item: `连续性热度：热度缺口 ${continuityHeatRisks.length}`,
      priorityLabel: '优先修连续性热度',
      evidence: continuityHeatEvidence,
      openingActions: [
        `连续性热度开篇修复：开篇必须执行 continuity_heat_checks 的 heat_state 和 hot_progress，先标清 hot/warm/cold/archived 状态，并推进 hot 元素；${continuityHeatEvidence[0] || '开篇先标清热度状态并推进热线。'}`,
      ],
      middleActions: [
        `连续性热度中段修复：中段必须落实 warm_keepalive 和 cold_warmup，让 warm 元素有效触达、cold 元素回收前先升温；${continuityHeatEvidence[0] || '中段保温温线并预热冷线。'}`,
      ],
      endingActions: [
        `连续性热度章尾修复：章尾必须兑现 archived_boundary，并把本章热度变化交接到下一章，避免误激活已休眠线；${continuityHeatEvidence[0] || '章尾说明归档边界和下一步热度。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
}
