import {
  proseQualityAssetLinkageRisks,
  proseQualityBenchmarkRecallRisks,
  proseQualityBridgeUnitRisks,
  proseQualityChapterHandoffRisks,
  proseQualityChapterHookRisks,
  proseQualityCharacterBehaviorRisks,
  proseQualityCharacterRelationRisks,
  proseQualityConflictStructureRisks,
  proseQualityEmotionalArcRisks,
  proseQualityExpectationThresholdRisks,
  proseQualityFemaleAudienceRisks,
  proseQualityForeshadowingDeltaRisks,
  proseQualityGenrePositioningRisks,
  proseQualityInformationFlowRisks,
  proseQualityIntentConfirmationRisks,
  proseQualityOpeningRisks,
  proseQualityParagraphHookRisks,
  proseQualityPlotSpecialTopicsRisks,
  proseQualityProseCraftRisks,
  proseQualityProseMetaRisks,
  proseQualityPunctuationToneRisks,
  proseQualityQualityAuditRisks,
  proseQualityReversalRisks,
  proseQualityShowdownRisks,
  proseQualitySourceReadinessRisks,
  proseQualityStateTrackingRisks,
  proseQualityStoryLoopRisks,
  proseQualityStoryStateUpdateRisks,
  proseQualityStyleBoundaryRisks,
  proseQualityStyleSampleRisks,
  proseQualitySuspenseRisks,
  proseQualityTargetReaderRisks,
  proseQualityUpgradeRhythmRisks,
  proseQualityWritePreparationRisks
} from '../quality/prose-quality-risks'

/** Extended prose-quality carry-over risk rows (character/handoff/craft tail). */

export function appendProseQualityDeliveryRiskCarryOverRowsExtendedCraft(
  riskRows: any[],
  proseQualityEntry: any,
) {
  const emotionalArcRisks = proseQualityEmotionalArcRisks(proseQualityEntry.payload || {})
  if (emotionalArcRisks.length > 0) {
    const emotionalArcEvidence = emotionalArcRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.calm_or_pressure,
        item.mobilization,
        item.counteraction,
        item.release,
        item.reader_payoff,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: emotionalArcRisks.length,
      item: `情绪弧：情绪缺口 ${emotionalArcRisks.length}`,
      priorityLabel: '优先修情绪弧',
      evidence: emotionalArcEvidence,
      openingActions: [
        `情绪弧开篇修复：开篇必须执行 emotional_arc_checks 的 calm_or_pressure 和 mobilization，让压力、期待或情绪调动先可感知；${emotionalArcEvidence[0] || '开篇先建立压力和情绪调动。'}`,
      ],
      middleActions: [
        `情绪弧中段修复：中段必须落实 counteraction 和 release，让情绪由事件触发并转成反制、释放或爽点，不只写心理说明；${emotionalArcEvidence[0] || '中段用反制和释放推进情绪弧。'}`,
      ],
      endingActions: [
        `情绪弧章尾修复：章尾必须兑现 reader_payoff，把负面情绪转成安全感、尊严感、爽点或余韵钝痛；${emotionalArcEvidence[0] || '章尾给读者明确情绪回报。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const chapterHookRisks = proseQualityChapterHookRisks(proseQualityEntry.payload || {})
  if (chapterHookRisks.length > 0) {
    const chapterHookEvidence = chapterHookRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.hook_position,
        item.trigger,
        item.reader_question,
        item.next_chapter_pressure,
        item.delivered_evidence,
        item.trigger_type,
        item.concrete_question,
        item.danger_or_choice,
        item.next_action_link,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: chapterHookRisks.length,
      item: `章级钩子：钩子缺口 ${chapterHookRisks.length}`,
      priorityLabel: '优先修章级钩子',
      evidence: chapterHookEvidence,
      openingActions: [
        `章级钩子开篇修复：前100-300字必须执行 chapter_hook_checks/chapter_hook_quality_checks 指出的 hook_position=opening、trigger 或 trigger_type，用现场异常、危险、选择或对话逼问开场；${chapterHookEvidence[0] || '开篇先给可见钩子触发。'}`,
      ],
      middleActions: [
        `章级钩子中段修复：按 reader_question、danger_or_choice 和 next_chapter_pressure 推进冲突，不得把钩子停成空悬念或口头预告；${chapterHookEvidence[0] || '中段把钩子压力变成行动选择。'}`,
      ],
      endingActions: [
        `章级钩子章尾修复：最后300字必须给 concrete_question、danger_or_choice 或 next_action_link，直接连到下一章行动压力，不能再用低风险空钩子；${chapterHookEvidence[0] || '章尾必须挂住下一章行动。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const paragraphHookRisks = proseQualityParagraphHookRisks(proseQualityEntry.payload || {})
  if (paragraphHookRisks.length > 0) {
    const paragraphHookEvidence = paragraphHookRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.paragraph_range,
        item.hook_type,
        item.micro_change,
        item.information_or_risk_delta,
        item.emotion_or_relation_delta,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: paragraphHookRisks.length,
      item: `段落级钩子：微钩子缺口 ${paragraphHookRisks.length}`,
      priorityLabel: '优先修段落级钩子',
      evidence: paragraphHookEvidence,
      openingActions: [
        `段落级钩子开篇修复：前300字就按 paragraph_hook_checks 指出的 paragraph_range/hook_type 放入可见微推进，不能连续铺环境、姿态或背景；${paragraphHookEvidence[0] || '开篇先给段落级微钩子。'}`,
      ],
      middleActions: [
        `段落级钩子中段修复：每3-5段必须产生 micro_change 或 information_or_risk_delta，用信息差、暗牌、代价、反转、打脸、异常物件或对话压迫推动正文；${paragraphHookEvidence[0] || '中段保持段落级推进。'}`,
      ],
      endingActions: [
        `段落级钩子章尾修复：把 emotion_or_relation_delta 或未解微变化收束成下一段/下一章追问，不能让连续段落停在解释和静态说明；${paragraphHookEvidence[0] || '章尾保留段落级牵引。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const suspenseRisks = proseQualitySuspenseRisks(proseQualityEntry.payload || {})
  if (suspenseRisks.length > 0) {
    const suspenseEvidence = suspenseRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.question,
        item.misdirect,
        item.partial_answer,
        item.new_expectation,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: suspenseRisks.length,
      item: `悬念编排：悬念缺口 ${suspenseRisks.length}`,
      priorityLabel: '优先修悬念编排',
      evidence: suspenseEvidence,
      openingActions: [
        `悬念编排开篇修复：前300字必须执行 suspense_checks 指出的 question 和 misdirect，提出清晰疑问并给可信提示或误导；${suspenseEvidence[0] || '开篇先建立疑问与误导。'}`,
      ],
      middleActions: [
        `悬念编排中段修复：中段必须用 partial_answer 给出可验证的部分答案，让读者看到答案路径而不是只听谜面；${suspenseEvidence[0] || '中段给出部分答案。'}`,
      ],
      endingActions: [
        `悬念编排章尾修复：最后300字必须用 new_expectation 接上新期待，当前疑问解决后还要留下新门槛或新困境；${suspenseEvidence[0] || '章尾挂住新期待。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const reversalRisks = proseQualityReversalRisks(proseQualityEntry.payload || {})
  if (reversalRisks.length > 0) {
    const reversalEvidence = reversalRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.reversal_type,
        item.fair_clues,
        item.misdirect,
        item.reveal_timing,
        item.impact_after_reveal,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: reversalRisks.length,
      item: `反转设计：反转缺口 ${reversalRisks.length}`,
      priorityLabel: '优先修反转设计',
      evidence: reversalEvidence,
      openingActions: [
        `反转设计开篇修复：开篇必须按 reversal_checks 的 fair_clues 和 misdirect 预埋公平暗示，不能等揭示时才补新信息；${reversalEvidence[0] || '开篇先埋公平暗示。'}`,
      ],
      middleActions: [
        `反转设计中段修复：中段必须控制 reversal_type 与 reveal_timing，让误导有剧情功能，揭示前至少能回看出暗示链；${reversalEvidence[0] || '中段推进反转暗示链。'}`,
      ],
      endingActions: [
        `反转设计章尾修复：揭示后必须落实 impact_after_reveal，改变局势、关系、证据或读者期待，不能只给身份解释；${reversalEvidence[0] || '章尾让反转改变局势。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const showdownRisks = proseQualityShowdownRisks(proseQualityEntry.payload || {})
  if (showdownRisks.length > 0) {
    const showdownEvidence = showdownRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.payoff_release,
        item.trump_card_used,
        item.pressure_layers,
        item.audience_reactions,
        item.consequence,
        item.next_threshold,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: showdownRisks.length,
      item: `高潮对抗：爽点缺口 ${showdownRisks.length}`,
      priorityLabel: '优先修高潮对抗',
      evidence: showdownEvidence,
      openingActions: [
        `高潮对抗开篇修复：开篇必须按 showdown_checks 的 pressure_layers 建立友方、敌方、中立方或场域压力，不能直接跳到主角出牌；${showdownEvidence[0] || '开篇先压出对抗压力。'}`,
      ],
      middleActions: [
        `高潮对抗中段修复：中段必须执行 trump_card_used 和 payoff_release，每次只出一个底牌，并让底牌产生对应压制；${showdownEvidence[0] || '中段让底牌释放爽点。'}`,
      ],
      endingActions: [
        `高潮对抗章尾修复：章尾必须落地 audience_reactions、consequence 和 next_threshold，把三方震动、结果后果和下一门槛写成可见变化；${showdownEvidence[0] || '章尾给结果和下一门槛。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const bridgeUnitRisks = proseQualityBridgeUnitRisks(proseQualityEntry.payload || {})
  if (bridgeUnitRisks.length > 0) {
    const bridgeUnitEvidence = bridgeUnitRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.bridge_position,
        item.old_expectation_payoff,
        item.new_expectation_seed,
        item.goal_progression,
        item.climax_hook,
        item.stage_handoff,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: bridgeUnitRisks.length,
      item: `桥段节奏：节奏缺口 ${bridgeUnitRisks.length}`,
      priorityLabel: '优先修桥段节奏',
      evidence: bridgeUnitEvidence,
      openingActions: [
        `桥段节奏开篇修复：开篇必须按 bridge_unit_checks 的 bridge_position 和 old_expectation_payoff 承接旧期待，不能把过渡章写成复盘；${bridgeUnitEvidence[0] || '开篇先兑现旧期待。'}`,
      ],
      middleActions: [
        `桥段节奏中段修复：中段必须执行 new_expectation_seed、goal_progression 和 climax_hook，让目标推进并在高潮中挂新期待；${bridgeUnitEvidence[0] || '中段推进新目标。'}`,
      ],
      endingActions: [
        `桥段节奏章尾修复：章尾必须落实 stage_handoff，交接下一阶段行动地点、代价或目标，不能只收束旧线；${bridgeUnitEvidence[0] || '章尾交接下一阶段。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const openingRisks = proseQualityOpeningRisks(proseQualityEntry.payload || {})
  if (openingRisks.length > 0) {
    const openingEvidence = openingRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.first_300_goal,
        item.first_1000_expectation,
        item.protagonist_entry,
        item.opening_principle,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: openingRisks.length,
      item: `开篇设计：开篇缺口 ${openingRisks.length}`,
      priorityLabel: '优先修开篇设计',
      evidence: openingEvidence,
      openingActions: [
        `开篇设计开篇修复：前300字必须修复 opening_checks 指出的主角登场、300字目标、开头五要诀或慢热说明问题；${openingEvidence[0] || '先把开篇缺口变成第一屏可见压力。'}`,
      ],
      middleActions: [
        `开篇设计中段修复：1000字内兑现 opening_checks 指出的期待点、三大基点、本文卖点或主线嫁接，不得只铺说明；${openingEvidence[0] || '中段补出可见期待点。'}`,
      ],
      endingActions: [
        `开篇设计章尾修复：章尾把开篇期待点转成下一章可追的问题、代价或升级压力；${openingEvidence[0] || '章尾延续开篇承诺。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const proseCraftRisks = proseQualityProseCraftRisks(proseQualityEntry.payload || {})
  if (proseCraftRisks.length > 0) {
    const proseCraftEvidence = proseCraftRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.pov_depth,
        item.body_detail,
        item.environment_interaction,
        item.action_stillness_balance,
        item.crowd_reaction_layering,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: proseCraftRisks.length,
      item: `正文工艺：行文缺口 ${proseCraftRisks.length}`,
      priorityLabel: '优先修正文工艺',
      evidence: proseCraftEvidence,
      openingActions: [
        `正文工艺开篇修复：开篇必须执行 prose_craft_checks 的 pov_depth 和 body_detail，用角色可见动作、身体细节和感知替代上帝视角或抽象情绪；${proseCraftEvidence[0] || '开篇先用限知镜头和身体细节落地。'}`,
      ],
      middleActions: [
        `正文工艺中段修复：中段必须落实 environment_interaction 和 action_stillness_balance，让物件、环境、动作和停顿承担剧情功能；${proseCraftEvidence[0] || '中段把环境交互和一动一静写成事件推进。'}`,
      ],
      endingActions: [
        `正文工艺章尾修复：章尾必须处理 crowd_reaction_layering 和 remaining_risk，让旁观反应分层，并避免继续用上帝视角、抽象情绪或统一震惊收尾；${proseCraftEvidence[0] || '章尾用分层反应和可见动作收束。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const punctuationToneRisks = proseQualityPunctuationToneRisks(proseQualityEntry.payload || {})
  if (punctuationToneRisks.length > 0) {
    const punctuationToneEvidence = punctuationToneRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.speaker,
        item.punctuation_issue,
        item.tone_intent,
        item.replacement,
        item.voice_difference,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: punctuationToneRisks.length,
      item: `语气标点：标点缺口 ${punctuationToneRisks.length}`,
      priorityLabel: '优先修语气标点',
      evidence: punctuationToneEvidence,
      openingActions: [
        `语气标点开篇修复：开篇对白必须执行 punctuation_tone_checks 的 speaker、punctuation_issue 和 tone_intent，先让人物声线和追问/试探/爆发意图成立；${punctuationToneEvidence[0] || '开篇先校准人物语气。'}`,
      ],
      middleActions: [
        `语气标点中段修复：中段必须按 replacement 改写标点功能，用短句、换行、动作打断或冒号落点替代省略号/破折号硬停顿；${punctuationToneEvidence[0] || '中段用功能性标点服务对话交锋。'}`,
      ],
      endingActions: [
        `语气标点章尾修复：章尾必须保留 voice_difference，并避免统一句号、统一感叹或硬停顿抹平角色声线；${punctuationToneEvidence[0] || '章尾保持声线差异。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const qualityAuditRisks = proseQualityQualityAuditRisks(proseQualityEntry.payload || {})
  if (qualityAuditRisks.length > 0) {
    const qualityAuditEvidence = qualityAuditRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.strategy,
        item.purpose_tag,
        item.density_change,
        item.conflict_bound_info,
        item.changed_evidence,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: qualityAuditRisks.length,
      item: `质量诊断：诊断缺口 ${qualityAuditRisks.length}`,
      priorityLabel: '优先修质量诊断',
      evidence: qualityAuditEvidence,
      openingActions: [
        `质量诊断开篇修复：开篇必须执行 quality_audit_checks 的 strategy 和 purpose_tag，先明确本章目的词、读者期待和不可删除变化；${qualityAuditEvidence[0] || '开篇先建立本章目的词。'}`,
      ],
      middleActions: [
        `质量诊断中段修复：中段必须落实 density_change 和 conflict_bound_info，把详略分配、事件内容比重和信息释放绑定到冲突推进；${qualityAuditEvidence[0] || '中段让信息跟冲突走。'}`,
      ],
      endingActions: [
        `质量诊断章尾修复：章尾必须交付 changed_evidence 或 remaining_risk 对应的局势变化、读者回报和下一阶段钩子，不能用摘要解释替代事件推进；${qualityAuditEvidence[0] || '章尾给可定位局势变化。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
}
