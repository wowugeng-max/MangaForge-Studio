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

export function appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsB(
  riskRows: any[],
  proseQualityEntry: any,
) {
  const styleBoundaryRisks = proseQualityStyleBoundaryRisks(proseQualityEntry.payload || {})
  if (styleBoundaryRisks.length > 0) {
    const styleBoundaryEvidence = styleBoundaryRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.reference_risk,
        item.rewritten_with_local_action,
        item.voice_anchor,
        item.copied_phrase_removed,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: styleBoundaryRisks.length,
      item: `文风边界：边界缺口 ${styleBoundaryRisks.length}`,
      priorityLabel: '优先修文风边界',
      evidence: styleBoundaryEvidence,
      openingActions: [
        `文风边界开篇修复：前300字先执行 style_boundary_checks 指出的 reference_risk 清理，硬约束永远赢，不能让样章/副对标口吻覆盖本书事实和角色声音；${styleBoundaryEvidence[0] || '开篇先守住文风边界。'}`,
      ],
      middleActions: [
        `文风边界中段修复：按 rewritten_with_local_action 和 voice_anchor 把借鉴内容改成本书动作、证据、代价和人物口吻，不复制桥段、原句或万能比喻；${styleBoundaryEvidence[0] || '中段用本书动作替代样章痕迹。'}`,
      ],
      endingActions: [
        `文风边界章尾修复：检查 copied_phrase_removed 和 remaining_risk，章尾不得出现 Gate F 升华、作者预告或副对标口吻收束；${styleBoundaryEvidence[0] || '章尾继续守住不可复制边界。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const styleSampleRisks = proseQualityStyleSampleRisks(proseQualityEntry.payload || {})
  if (styleSampleRisks.length > 0) {
    const styleSampleEvidence = styleSampleRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.style_dimension,
        item.source_technique,
        item.adapted_evidence,
        item.copied_phrase_rewritten,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: styleSampleRisks.length,
      item: `样章策略：策略缺口 ${styleSampleRisks.length}`,
      priorityLabel: '优先修样章策略',
      evidence: styleSampleEvidence,
      openingActions: [
        `样章策略开篇修复：前300字按 style_sample_checks 指出的 style_dimension/source_technique 取技法功能，不照搬样章桥段、原句或比喻；${styleSampleEvidence[0] || '开篇先把样章策略改成本书动作。'}`,
      ],
      middleActions: [
        `样章策略中段修复：按 adapted_evidence 把样章技法转成本书资产、冲突动作、对话节奏或反应层次，必须看得见改写后的正文证据；${styleSampleEvidence[0] || '中段让样章技法本土化。'}`,
      ],
      endingActions: [
        `样章策略章尾修复：检查 copied_phrase_rewritten 和 remaining_risk，章尾不得保留样章原句、桥段模板或不适用场景；${styleSampleEvidence[0] || '章尾继续清理样章复制痕迹。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const proseMetaRisks = proseQualityProseMetaRisks(proseQualityEntry.payload || {})
  if (proseMetaRisks.length > 0) {
    const proseMetaEvidence = proseMetaRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.matched_term,
        item.location,
        item.replacement,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: proseMetaRisks.length,
      item: `正文元信息：工程词泄露 ${proseMetaRisks.length}`,
      priorityLabel: '优先修工程词',
      evidence: proseMetaEvidence,
      openingActions: [
        `正文元信息开篇修复：前300字先清理 prose_meta_checks 指出的 matched_term/location，标题行以外不得出现上一章、本章、伏笔、细纲、读者等工程词；${proseMetaEvidence[0] || '开篇先把工程词改成现场事件锚点。'}`,
      ],
      middleActions: [
        `正文元信息中段修复：按 replacement 把工程词改成角色当下能感知的动作、物件、时间差或对话信息，不用作者视角解释；${proseMetaEvidence[0] || '中段继续用角色感知替代元叙述。'}`,
      ],
      endingActions: [
        `正文元信息章尾修复：检查 remaining_risk，章尾不能用“本章/下一章/读者/伏笔”等工程词收束，只能用故事内新证据或问题翻页；${proseMetaEvidence[0] || '章尾用故事内问题替代工程词。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const informationFlowRisks = proseQualityInformationFlowRisks(proseQualityEntry.payload || {})
  if (informationFlowRisks.length > 0) {
    const informationFlowEvidence = informationFlowRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.reveal_order,
        item.withheld_question,
        item.action_bound_release,
        item.conflict_or_cost,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: informationFlowRisks.length,
      item: `信息团衔接：信息缺口 ${informationFlowRisks.length}`,
      priorityLabel: '优先修信息团衔接',
      evidence: informationFlowEvidence,
      openingActions: [
        `信息团衔接开篇修复：前300字先回应 information_flow_checks 指出的 withheld_question 或上一场悬念，不得用无关背景/纯过渡开场；${informationFlowEvidence[0] || '先把信息缺口接成动作。'}`,
      ],
      middleActions: [
        `信息团衔接中段修复：按 reveal_order 和 action_bound_release 释放信息，每个信息团必须绑定动作、冲突或代价，纯移动/寒暄/环境描写要压缩；${informationFlowEvidence[0] || '中段按动作释放信息。'}`,
      ],
      endingActions: [
        `信息团衔接章尾修复：章尾把已释放信息转成下一章明确问题、代价或新证据，不能把信息流停在解释段；${informationFlowEvidence[0] || '章尾延续信息问题。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const expectationThresholdRisks = proseQualityExpectationThresholdRisks(proseQualityEntry.payload || {})
  if (expectationThresholdRisks.length > 0) {
    const expectationThresholdEvidence = expectationThresholdRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.reader_question,
        item.stakes,
        item.choice_pressure,
        item.payoff_promise,
        item.next_chapter_pull,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: expectationThresholdRisks.length,
      item: `期待门槛：门槛缺口 ${expectationThresholdRisks.length}`,
      priorityLabel: '优先修期待门槛',
      evidence: expectationThresholdEvidence,
      openingActions: [
        `期待门槛开篇修复：前300字先提出 expectation_threshold_checks 指出的 reader_question 或新门槛，不得先发放爽点/答案；${expectationThresholdEvidence[0] || '开篇先把期待门槛立住。'}`,
      ],
      middleActions: [
        `期待门槛中段修复：按 stakes 和 choice_pressure 把目标拆成条件、选择或代价，爽点释放前必须先让门槛升级；${expectationThresholdEvidence[0] || '中段用选择压力拉高期待。'}`,
      ],
      endingActions: [
        `期待门槛章尾修复：用 next_chapter_pull 或 payoff_promise 把已释放信息转成下一道门槛，不能让本章爽点后期待归零；${expectationThresholdEvidence[0] || '章尾必须挂住下一道期待。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const targetReaderRisks = proseQualityTargetReaderRisks(proseQualityEntry.payload || {})
  if (targetReaderRisks.length > 0) {
    const targetReaderEvidence = targetReaderRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.target_reader_profile,
        item.reader_desire,
        item.emotion_gap,
        item.chapter_hit,
        item.platform_taste,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: targetReaderRisks.length,
      item: `创作契约：目标读者缺口 ${targetReaderRisks.length}`,
      priorityLabel: '优先修创作契约',
      evidence: targetReaderEvidence,
      openingActions: [
        `创作契约开篇修复：前300字必须执行 target_reader_checks 的 target_reader_profile 和 emotion_gap，让目标读者立刻看到本章承诺的压力、欲望或回报；${targetReaderEvidence[0] || '先把目标读者缺口变成可见开篇压力。'}`,
      ],
      middleActions: [
        `创作契约中段修复：用 reader_desire 和 platform_taste 指向的动作、选择、对话或反制结果兑现目标读者想看的核心爽点；${targetReaderEvidence[0] || '把目标读者想看的内容写成正文证据。'}`,
      ],
      endingActions: [
        `创作契约章尾修复：把 chapter_hit 和目标读者回报转成下一章仍想追的更高问题或新代价；${targetReaderEvidence[1] || targetReaderEvidence[0] || '章尾继续抬高目标读者期待。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const genrePositioningRisks = proseQualityGenrePositioningRisks(proseQualityEntry.payload || {})
  if (genrePositioningRisks.length > 0) {
    const genrePositioningEvidence = genrePositioningRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.genre_tag,
        item.core_hook,
        item.type_formula,
        item.genre_strength,
        item.book_title_blurb_alignment,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: genrePositioningRisks.length,
      item: `创作契约：题材定位缺口 ${genrePositioningRisks.length}`,
      priorityLabel: '优先修创作契约',
      evidence: genrePositioningEvidence,
      openingActions: [
        `创作契约开篇修复：前300字先把 genre_positioning_checks 的 genre_tag、core_hook 或 book_title_blurb_alignment 压回正文第一屏；${genrePositioningEvidence[0] || '先让题材长板进入开篇事件。'}`,
      ],
      middleActions: [
        `创作契约中段修复：用 type_formula、题材长板、金手指贴合或必备场景兑现题材定位；${genrePositioningEvidence[0] || '把题材定位写成中段事件推进。'}`,
      ],
      endingActions: [
        `创作契约章尾修复：章尾钩子必须继续服务 genre_strength 和题材长板，不能转成无关支线；${genrePositioningEvidence[1] || genrePositioningEvidence[0] || '章尾继续强化题材定位。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const plotSpecialTopicsRisks = proseQualityPlotSpecialTopicsRisks(proseQualityEntry.payload || {})
  if (plotSpecialTopicsRisks.length > 0) {
    const plotSpecialTopicsEvidence = plotSpecialTopicsRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        ...(item.matched_topics || []),
        item.goldfinger_execution,
        item.genre_boundary_execution,
        item.market_benchmark_execution,
        item.urban_high_martial_execution,
        item.launch_checkpoint_execution,
        item.faction_hand_execution,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: plotSpecialTopicsRisks.length,
      item: `创作契约：特殊题材缺口 ${plotSpecialTopicsRisks.length}`,
      priorityLabel: '优先修特殊题材',
      evidence: plotSpecialTopicsEvidence,
      openingActions: [
        `特殊题材开篇修复：前300字必须执行 plot_special_topics_checks 指出的 matched_topics，把金手指、题材边界、三万字卡点或阵营手牌缺口转成当前场景目标/压力；${plotSpecialTopicsEvidence[0] || '先把特殊题材缺口变成开篇可见压力。'}`,
      ],
      middleActions: [
        `特殊题材中段修复：用金手指反馈、题材边界内的核心期待、都市高武钱/资源/资格目标或阵营逐级出牌推进事件，不能只解释规则；${plotSpecialTopicsEvidence[0] || '把特殊题材规则写成中段事件结果。'}`,
      ],
      endingActions: [
        `特殊题材章尾修复：章尾必须回扣三万字卡点、阶段目标、阵营手牌或金手指下一反馈，形成下一章追读压力；${plotSpecialTopicsEvidence[1] || plotSpecialTopicsEvidence[0] || '章尾继续强化特殊题材承诺。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const femaleAudienceRisks = proseQualityFemaleAudienceRisks(proseQualityEntry.payload || {})
  if (femaleAudienceRisks.length > 0) {
    const femaleAudienceEvidence = femaleAudienceRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.security_anchor,
        item.reader_identification,
        item.heroine_agency,
        item.relationship_axis,
        item.post_abuse_payoff,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: femaleAudienceRisks.length,
      item: `女频长篇：女频缺口 ${femaleAudienceRisks.length}`,
      priorityLabel: '优先修女频长篇',
      evidence: femaleAudienceEvidence,
      openingActions: [
        `女频长篇开篇修复：前300字必须执行 female_audience_checks 的 security_anchor 和 reader_identification，让读者先看到安全感、代入感或尊严感；${femaleAudienceEvidence[0] || '开篇先给女主可感知的安全锚点。'}`,
      ],
      middleActions: [
        `女频长篇中段修复：中段必须落实 heroine_agency 和 relationship_axis，让关键选择、行动推进和关系变化由女主自己完成；${femaleAudienceEvidence[0] || '中段让女主主动做决定。'}`,
      ],
      endingActions: [
        `女频长篇章尾修复：章尾必须兑现 post_abuse_payoff，压迫后给反转、糖、安全感或尊严回报，不能连续只虐；${femaleAudienceEvidence[0] || '章尾给压迫后的回报。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const upgradeRhythmRisks = proseQualityUpgradeRhythmRisks(proseQualityEntry.payload || {})
  if (upgradeRhythmRisks.length > 0) {
    const upgradeRhythmEvidence = upgradeRhythmRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.before_after_contrast,
        item.instant_feedback,
        item.delayed_feedback,
        item.new_threshold,
        item.cheat_rule,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: upgradeRhythmRisks.length,
      item: `升级节奏：升级缺口 ${upgradeRhythmRisks.length}`,
      priorityLabel: '优先修升级节奏',
      evidence: upgradeRhythmEvidence,
      openingActions: [
        `升级节奏开篇修复：开篇必须执行 upgrade_rhythm_checks 的 before_after_contrast 和 cheat_rule，让升级前状态、规则代价或限制先可见；${upgradeRhythmEvidence[0] || '开篇先建立升级前后对比。'}`,
      ],
      middleActions: [
        `升级节奏中段修复：中段必须落实 instant_feedback 和 delayed_feedback，让能力、资源或身份变化产生即时反馈与延迟代价；${upgradeRhythmEvidence[0] || '中段写出升级反馈和代价。'}`,
      ],
      endingActions: [
        `升级节奏章尾修复：章尾必须抬出 new_threshold，把升级回报转成下一阶段门槛，不能停在系统提示；${upgradeRhythmEvidence[0] || '章尾给出新门槛。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const conflictStructureRisks = proseQualityConflictStructureRisks(proseQualityEntry.payload || {})
  if (conflictStructureRisks.length > 0) {
    const conflictStructureEvidence = conflictStructureRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.blocker,
        item.no_exit_condition,
        item.stakes_or_exit_cost,
        item.action_block,
        item.win_loss_result,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: conflictStructureRisks.length,
      item: `冲突结构：冲突缺口 ${conflictStructureRisks.length}`,
      priorityLabel: '优先修冲突结构',
      evidence: conflictStructureEvidence,
      openingActions: [
        `冲突结构开篇修复：开篇必须执行 conflict_structure_checks 的 blocker、no_exit_condition 和 stakes_or_exit_cost，让阻止者、无法退出条件和退出代价先压到现场；${conflictStructureEvidence[0] || '开篇先建立阻止者和有进无出的代价。'}`,
      ],
      middleActions: [
        `冲突结构中段修复：中段必须落实 action_block，让阻止者从口头压力升级为行动阻拦，并逼主角主动破局；${conflictStructureEvidence[0] || '中段把冲突写成行动阻拦。'}`,
      ],
      endingActions: [
        `冲突结构章尾修复：章尾必须兑现 win_loss_result，并把胜负结果转成下一冲突种子，不能停在嘴炮或胜负不明；${conflictStructureEvidence[0] || '章尾给出明确胜负和下一冲突种子。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const storyLoopRisks = proseQualityStoryLoopRisks(proseQualityEntry.payload || {})
  if (storyLoopRisks.length > 0) {
    const storyLoopEvidence = storyLoopRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.setup_question,
        item.obstacle,
        item.choice,
        item.cost,
        item.payoff_or_answer_fragment,
        item.new_question,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: storyLoopRisks.length,
      item: `故事循环：循环缺口 ${storyLoopRisks.length}`,
      priorityLabel: '优先修故事循环',
      evidence: storyLoopEvidence,
      openingActions: [
        `故事循环开篇修复：开篇必须执行 story_loop_checks 的 setup_question 和 obstacle，先把本轮循环问题与阻碍摆到现场；${storyLoopEvidence[0] || '开篇先抛出本轮循环问题和阻碍。'}`,
      ],
      middleActions: [
        `故事循环中段修复：中段必须落实 choice 和 cost，让主角做选择并付出代价，不能只介绍新设定；${storyLoopEvidence[0] || '中段用选择和代价推进循环。'}`,
      ],
      endingActions: [
        `故事循环章尾修复：章尾必须兑现 payoff_or_answer_fragment 并抛出 new_question，把本轮回收转成下一轮燃料；${storyLoopEvidence[0] || '章尾给部分答案并抛出新问题。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
}
