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

export function appendProseQualityDeliveryRiskCarryOverRowsExtendedAssetsA(
  riskRows: any[],
  proseQualityEntry: any,
) {
  const characterRelationRisks = proseQualityCharacterRelationRisks(proseQualityEntry.payload || {})
  if (characterRelationRisks.length > 0) {
    const characterRelationEvidence = characterRelationRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.relation_type,
        item.protagonist_goal,
        item.agency_choice,
        item.cost,
        item.relation_shift,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: characterRelationRisks.length,
      item: `角色关系：关系缺口 ${characterRelationRisks.length}`,
      priorityLabel: '优先修角色关系',
      evidence: characterRelationEvidence,
      openingActions: [
        `角色关系开篇修复：开篇必须执行 character_relation_checks 的 relation_type 和 protagonist_goal，让关系类型、主角自己的目标和目标归属先成立；${characterRelationEvidence[0] || '开篇先明确关系类型和主角目标。'}`,
      ],
      middleActions: [
        `角色关系中段修复：中段必须落实 agency_choice 和 cost，让主角主动选择并付出代价，不能让关系角色只递线索或发糖；${characterRelationEvidence[0] || '中段用主动选择和代价推进关系。'}`,
      ],
      endingActions: [
        `角色关系章尾修复：章尾必须兑现 relation_shift，让关系态度、信任、利益或阶段发生可见变化；${characterRelationEvidence[0] || '章尾交付关系变化。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const characterBehaviorRisks = proseQualityCharacterBehaviorRisks(proseQualityEntry.payload || {})
  if (characterBehaviorRisks.length > 0) {
    const characterBehaviorEvidence = characterBehaviorRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.character,
        item.concrete_motive,
        item.emotional_reason,
        item.trigger_change,
        item.visible_choice,
        item.cost,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: characterBehaviorRisks.length,
      item: `角色行为：人设缺口 ${characterBehaviorRisks.length}`,
      priorityLabel: '优先修角色行为',
      evidence: characterBehaviorEvidence,
      openingActions: [
        `角色行为开篇修复：开篇必须执行 character_behavior_checks 的 character、concrete_motive 和 emotional_reason，让角色、具体动机与情感理由先站住；${characterBehaviorEvidence[0] || '开篇先建立角色和具体动机。'}`,
      ],
      middleActions: [
        `角色行为中段修复：中段必须落实 trigger_change 和 visible_choice，用事件触发行为变化，并让角色做出可见选择；${characterBehaviorEvidence[0] || '中段让触发事件带出可见选择。'}`,
      ],
      endingActions: [
        `角色行为章尾修复：章尾必须兑现 cost，让角色选择承担代价，不能只做工具化动作；${characterBehaviorEvidence[0] || '章尾交付行为代价。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const assetLinkageRisks = proseQualityAssetLinkageRisks(proseQualityEntry.payload || {})
  if (assetLinkageRisks.length > 0) {
    const assetLinkageEvidence = assetLinkageRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.asset_name,
        item.asset_function,
        item.ownership,
        item.trigger_condition,
        item.limitation,
        item.consequence,
        item.story_link,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: assetLinkageRisks.length,
      item: `资产挂钩：孤立资产 ${assetLinkageRisks.length}`,
      priorityLabel: '优先修资产挂钩',
      evidence: assetLinkageEvidence,
      openingActions: [
        `资产挂钩开篇修复：开篇必须执行 asset_linkage_checks 的 asset_name、function 和 ownership，让关键资产的名称、功能和归属先可见；${assetLinkageEvidence[0] || '开篇先明确关键资产的功能和归属。'}`,
      ],
      middleActions: [
        `资产挂钩中段修复：中段必须落实 trigger_condition 和 limitation，让资产在冲突中被触发，并暴露使用限制，不能只点名设定；${assetLinkageEvidence[0] || '中段让资产触发并显示限制。'}`,
      ],
      endingActions: [
        `资产挂钩章尾修复：章尾必须兑现 consequence 和 story_link，把资产使用后果接到主线、关系线或下一条线索；${assetLinkageEvidence[0] || '章尾交付资产后果和故事连接。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const stateTrackingRisks = proseQualityStateTrackingRisks(proseQualityEntry.payload || {})
  if (stateTrackingRisks.length > 0) {
    const stateTrackingEvidence = stateTrackingRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.state_subject,
        item.state_type,
        item.previous_state,
        item.allowed_state,
        item.used_in_chapter,
        item.excluded_reason,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: stateTrackingRisks.length,
      item: `状态筛选：上下文缺口 ${stateTrackingRisks.length}`,
      priorityLabel: '优先修状态筛选',
      evidence: stateTrackingEvidence,
      openingActions: [
        `状态筛选开篇修复：开篇必须执行 state_tracking_checks 的 state_subject、state_type、previous_state 和 allowed_state，先确认可用状态边界；${stateTrackingEvidence[0] || '开篇先确认状态主体和允许状态。'}`,
      ],
      middleActions: [
        `状态筛选中段修复：中段必须落实 used_in_chapter，只按 allowed_state 使用状态，并避免把未触发状态写成事实；${stateTrackingEvidence[0] || '中段只按允许状态使用上下文。'}`,
      ],
      endingActions: [
        `状态筛选章尾修复：章尾必须交代 excluded_reason 或 remaining_risk，把被排除状态、来源边界和下一章状态交接清楚；${stateTrackingEvidence[0] || '章尾交代排除理由和状态交接。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const storyStateUpdateRisks = proseQualityStoryStateUpdateRisks(proseQualityEntry.payload || {})
  if (storyStateUpdateRisks.length > 0) {
    const storyStateEvidence = storyStateUpdateRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.source_excerpt, item.target_file, item.update_path])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: storyStateUpdateRisks.length,
      item: `状态写回：状态缺口 ${storyStateUpdateRisks.length}`,
      priorityLabel: '优先修状态写回',
      evidence: storyStateEvidence,
      openingActions: [
        `状态写回开篇修复：前300字先承接 story_state_update_checks 指出的状态变化、状态缺口或状态边界；${storyStateEvidence[0] || '先让状态变化影响当前事件。'}`,
      ],
      middleActions: [
        `状态写回中段修复：用行动后果、选择限制、关系反应或物件状态证明状态已经改变，并能写回 update_path；${storyStateEvidence[0] || '中段把状态变化写成行动后果。'}`,
      ],
      endingActions: [
        `状态写回章尾修复：章尾把状态变化转成下一章可追踪的限制、风险或目标，不得让角色/资产状态回滚；${storyStateEvidence[0] || '章尾保留状态后果。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const foreshadowingDeltaRisks = proseQualityForeshadowingDeltaRisks(proseQualityEntry.payload || {})
  if (foreshadowingDeltaRisks.length > 0) {
    const foreshadowingEvidence = foreshadowingDeltaRisks
      .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.source_excerpt, item.ledger_path, item.current_status])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: foreshadowingDeltaRisks.length,
      item: `伏笔增量：台账缺口 ${foreshadowingDeltaRisks.length}`,
      priorityLabel: '优先补伏笔增量',
      evidence: foreshadowingEvidence,
      openingActions: [
        `伏笔增量开篇修复：前300字先让 foreshadowing_delta_checks 指出的新伏笔或待推进伏笔以可见线索入场；${foreshadowingEvidence[0] || '先给可见伏笔线索。'}`,
      ],
      middleActions: [
        `伏笔增量中段修复：用行动、对话、物件状态或风险判断推进伏笔当前状态，并同步台账路径；${foreshadowingEvidence[0] || '中段推进伏笔状态。'}`,
      ],
      endingActions: [
        `伏笔增量章尾修复：把伏笔状态转成下一章问题或回收压力，不能只停留在台账说明；${foreshadowingEvidence[0] || '章尾留下伏笔新问题。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const sourceReadinessRisks = proseQualitySourceReadinessRisks(proseQualityEntry.payload || {})
  if (sourceReadinessRisks.length > 0) {
    const sourceReadinessEvidence = sourceReadinessRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.source_name,
        item.source_path,
        item.read_status,
        item.used_as_fact,
        item.chapter_evidence,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: sourceReadinessRisks.length,
      item: `来源就绪：来源缺口 ${sourceReadinessRisks.length}`,
      priorityLabel: '优先补来源就绪',
      evidence: sourceReadinessEvidence,
      openingActions: [
        `来源就绪开篇修复：前300字先处理 source_readiness_checks 指出的 missing/warn 来源，未确认来源不得被当作既定事实；${sourceReadinessEvidence[0] || '先把来源缺口写成可见取证动作。'}`,
      ],
      middleActions: [
        `来源就绪中段修复：用查证、对话、物件证据或角色认知边界证明来源状态，未就绪来源只能作为疑问、误导或待验证线索；${sourceReadinessEvidence[0] || '中段补足来源证据。'}`,
      ],
      endingActions: [
        `来源就绪章尾修复：章尾把来源确认结果转成下一章可追踪的新证据、限制或未解问题；${sourceReadinessEvidence[0] || '章尾交代来源确认后的新压力。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const writePreparationRisks = proseQualityWritePreparationRisks(proseQualityEntry.payload || {})
  if (writePreparationRisks.length > 0) {
    const creationContractRisks = writePreparationRisks.filter((item: any) => item?.is_creation_contract)
    const otherWritePreparationRisks = writePreparationRisks.filter((item: any) => !item?.is_creation_contract)
    if (creationContractRisks.length > 0) {
      const creationContractEvidence = creationContractRisks
        .flatMap((item: any) => [item.action, item.fix, item.remaining_risk, item.expected, item.delivered_evidence, item.chapter_location, item.evidence, item.label])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: creationContractRisks.length,
        item: `创作契约：执行缺口 ${creationContractRisks.length}`,
        priorityLabel: '优先修创作契约',
        evidence: creationContractEvidence,
        openingActions: [
          `创作契约开篇修复：前300字承接上一章未兑现的目标读者、题材定位、核心承诺或追读留存压力；${creationContractEvidence[0] || '先把上一章创作契约缺口变成可见目标和即时压力。'}`,
        ],
        middleActions: [
          `创作契约中段修复：用动作、对话、反制代价或信息变化兑现创作契约，不得只在旁白中说明；${creationContractEvidence[1] || creationContractEvidence[0] || '把缺口写成正文证据。'}`,
        ],
        endingActions: [
          `创作契约章尾修复：把本章修复结果转成新问题、升级压力或下一章钩子，保证追读留存继续成立；${creationContractEvidence[2] || creationContractEvidence[0] || '章末必须留下可追的下一步。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
    if (otherWritePreparationRisks.length > 0) {
      const writePreparationEvidence = otherWritePreparationRisks
        .flatMap((item: any) => [
          item.action,
          item.fix,
          item.remaining_risk,
          item.preparation_type,
          item.expected,
          item.delivered_evidence,
          item.chapter_location,
          item.evidence,
          item.label,
        ])
        .filter(Boolean)
        .slice(0, 8)
      riskRows.push({
        count: otherWritePreparationRisks.length,
        item: `写前准备：执行缺口 ${otherWritePreparationRisks.length}`,
        priorityLabel: '优先修写前准备',
        evidence: writePreparationEvidence,
        openingActions: [
          `写前准备开篇修复：前300字先把 write_preparation_checks 指出的来源缺口、资产风险、上一轮待修复或必确认项变成可见动作；${writePreparationEvidence[0] || '先把写前准备缺口落到第一场。'}`,
        ],
        middleActions: [
          `写前准备中段修复：按 preparation_type 执行 expected，补齐 delivered_evidence 和 chapter_location，不能只在旁白中声明已处理；${writePreparationEvidence[0] || '中段把准备项写成正文证据。'}`,
        ],
        endingActions: [
          `写前准备章尾修复：章尾把准备项修复结果转成读者回报、主线证据或下一章待确认项；${writePreparationEvidence[0] || '章尾交代写前准备的后续压力。'}`,
        ],
        sourceReviewId: proseQualityEntry.review?.id || null,
      })
    }
  }
  const chapterHandoffRisks = proseQualityChapterHandoffRisks(proseQualityEntry.payload || {})
  if (chapterHandoffRisks.length > 0) {
    const chapterHandoffEvidence = chapterHandoffRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.opening_obligation,
        item.continuity_action,
        item.previous_handoff,
        item.opening_evidence,
        item.location,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: chapterHandoffRisks.length,
      item: `章首承接：承接缺口 ${chapterHandoffRisks.length}`,
      priorityLabel: '优先修章首承接',
      evidence: chapterHandoffEvidence,
      openingActions: [
        `章首承接开篇修复：前300字必须兑现 chapter_handoff_checks 指出的 previous_handoff、opening_obligation 和 opening_evidence；${chapterHandoffEvidence[0] || '先把上一章章末钩子接成当前场景压力。'}`,
      ],
      middleActions: [
        `章首承接中段修复：按 continuity_action 把上一章余波转成新目标、阻碍、信息变化或角色/资产状态变化；${chapterHandoffEvidence[0] || '中段让承接事项改变当前行动。'}`,
      ],
      endingActions: [
        `章首承接章尾修复：章尾必须交代承接后的新状态、未解问题和下一章动作压力，不能让上一章钩子沉没；${chapterHandoffEvidence[0] || '章尾补清下一章交接。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const intentConfirmationRisks = proseQualityIntentConfirmationRisks(proseQualityEntry.payload || {})
  if (intentConfirmationRisks.length > 0) {
    const intentConfirmationEvidence = intentConfirmationRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.intent_field,
        item.expected_intent,
        item.delivered_evidence,
        item.blueprint_link,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: intentConfirmationRisks.length,
      item: `意图确认：执行偏移 ${intentConfirmationRisks.length}`,
      priorityLabel: '优先修意图确认',
      evidence: intentConfirmationEvidence,
      openingActions: [
        `意图确认开篇修复：前300字先把 intent_confirmation_checks 指出的章节目标、情绪目标或蓝图焦点压回当前事件；${intentConfirmationEvidence[0] || '先把章节意图写成可见目标。'}`,
      ],
      middleActions: [
        `意图确认中段修复：按 intent_field 和 expected_intent 推进场景，每场必须有 delivered_evidence，不能偏去解释无关设定；${intentConfirmationEvidence[0] || '中段让场景服务章节意图。'}`,
      ],
      endingActions: [
        `意图确认章尾修复：章尾把蓝图焦点转成下一章动作压力或问题，确保 blueprint_link 对应目标闭环；${intentConfirmationEvidence[0] || '章尾承接本章意图。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const benchmarkRecallRisks = proseQualityBenchmarkRecallRisks(proseQualityEntry.payload || {})
  if (benchmarkRecallRisks.length > 0) {
    const benchmarkRecallEvidence = benchmarkRecallRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.source_type,
        item.source_path,
        item.expected_application,
        item.delivered_evidence,
        item.gaps_preserved,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: benchmarkRecallRisks.length,
      item: `文风召回：召回缺口 ${benchmarkRecallRisks.length}`,
      priorityLabel: '优先修文风召回',
      evidence: benchmarkRecallEvidence,
      openingActions: [
        `文风召回开篇修复：前300字先执行 benchmark_recall_checks 指出的 source_type/source_path 对应技法，只学节奏、情绪模块或表达功能，不复制桥段/原句；${benchmarkRecallEvidence[0] || '开篇先把文风召回落成正文动作。'}`,
      ],
      middleActions: [
        `文风召回中段修复：按 expected_application 把节奏参照、情绪模块或匹配章技法写成压迫、停顿、爆发、冷却或反应；${benchmarkRecallEvidence[0] || '中段把召回要求变成可见技法。'}`,
      ],
      endingActions: [
        `文风召回章尾修复：检查 gaps_preserved 和 delivered_evidence，保留未完成召回缺口到下一道问题，不能用“文风接近”掩盖未执行；${benchmarkRecallEvidence[0] || '章尾保留并说明未兑现召回缺口。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
}
