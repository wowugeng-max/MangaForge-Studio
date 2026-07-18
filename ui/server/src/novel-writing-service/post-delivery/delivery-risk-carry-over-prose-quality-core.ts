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

export function appendProseQualityDeliveryRiskCarryOverRowsCore(
  riskRows: any[],
  proseQualityEntry: any,
) {
  const nextChapterPlanRisks = proseQualityNextChapterPlanRisks(proseQualityEntry.payload || {})
  if (nextChapterPlanRisks) {
    riskRows.push({
      count: nextChapterPlanRisks.count,
      item: `质量续航：下一章计划 ${nextChapterPlanRisks.count}`,
      priorityLabel: '优先执行质量续航',
      evidence: [
        ...nextChapterPlanRisks.qualityFocus,
        ...nextChapterPlanRisks.endingContractEvidence,
        ...nextChapterPlanRisks.avoidRepetition,
        ...nextChapterPlanRisks.evidenceBasis,
      ].slice(0, 8),
      openingActions: [
        ...nextChapterPlanRisks.endingContractOpeningActions,
        ...nextChapterPlanRisks.openingActions,
      ],
      middleActions: [
        ...nextChapterPlanRisks.endingContractMiddleActions,
        ...nextChapterPlanRisks.middleActions,
      ],
      endingActions: [
        ...nextChapterPlanRisks.endingContractEndingActions,
        ...nextChapterPlanRisks.endingActions,
      ],
      forbiddenRepeats: nextChapterPlanRisks.avoidRepetition,
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const receiptRisks = proseQualityRevisionReceiptRisks(proseQualityEntry.payload || {})
  if (receiptRisks.length > 0) {
    const revisionReceiptEvidence = uniqueBriefStrings(receiptRisks
      .flatMap((item: any) => [
        item.risk,
        item.evidence,
      ])
      .filter(Boolean), 8)
    const revisionReceiptRiskEvidence = revisionReceiptEvidence.find((item: string) => /证据|补证据|动机|局势|状态|下一章/i.test(item))
    riskRows.push({
      count: receiptRisks.length,
      item: `复核修订：修订残留 ${receiptRisks.length}`,
      priorityLabel: '优先复核修订',
      evidence: revisionReceiptEvidence,
      openingActions: [
        `复核修订开篇修复：前300字先承接 revision_receipts 的 remaining_risk，把上一章修订后仍悬空的问题转成当前场景目标或阻碍；${revisionReceiptEvidence[0] || '开篇先复核修订残留。'}`,
      ],
      middleActions: [
        `复核修订中段修复：中段必须补证据、动机、行动后果或局势变化，让 revision_receipts 的残留风险有可定位正文证据；${revisionReceiptRiskEvidence || revisionReceiptEvidence[0] || '中段补足修订后的正文证据。'}`,
      ],
      endingActions: [
        `复核修订章尾修复：章尾复核 remaining_risk 是否清零，并把修订后的新状态、新压力或下一章问题落到正文；${revisionReceiptRiskEvidence || revisionReceiptEvidence[0] || '章尾确认修订残留闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const revisionReceiptCheckRisks = proseQualityRevisionReceiptCheckRisks(proseQualityEntry.payload || {})
  if (revisionReceiptCheckRisks.length > 0) {
    const revisionReceiptCheckEvidence = uniqueBriefStrings(revisionReceiptCheckRisks
      .flatMap((item: any) => [
        item.action,
        item.required_action,
        item.fix,
        item.remaining_risk,
        item.changed_evidence,
        item.evidence,
      ])
      .filter(Boolean), 8)
    const revisionReceiptSegmentEvidence = revisionReceiptCheckEvidence.find((item: string) => /repair_segment|middle|中段|动作|破局|权限/i.test(item))
    const revisionReceiptChangedEvidence = revisionReceiptCheckEvidence.find((item: string) => /changed_evidence|changedEvidence|证据|回执/i.test(item))
    riskRows.push({
      count: revisionReceiptCheckRisks.length,
      item: `修订回执检查：检查缺口 ${revisionReceiptCheckRisks.length}`,
      priorityLabel: '优先复核修订',
      evidence: revisionReceiptCheckEvidence,
      openingActions: [
        `修订回执检查开篇修复：前300字先核对 revision_receipt_checks 的 required_action、applied_fix 和上一章已改内容，把缺口转成当前场景目标或阻碍；${revisionReceiptCheckEvidence[0] || '开篇先复核修订回执缺口。'}`,
      ],
      middleActions: [
        `修订回执检查中段修复：按 repair_segment/required_action 把缺口写成可定位动作、证据变化或权限变化，不能只写“已解决”；${revisionReceiptSegmentEvidence || revisionReceiptCheckEvidence[0] || '中段把修订回执落成可见事件。'}`,
      ],
      endingActions: [
        `修订回执检查章尾修复：章尾必须回填 changed_evidence 并复核 remaining_risk 是否清零，留下修订后的状态变化或下一章问题；${revisionReceiptChangedEvidence || revisionReceiptCheckEvidence[0] || '章尾确认修订回执闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const revisionContextRisks = proseQualityRevisionContextRisks(proseQualityEntry.payload || {})
  if (revisionContextRisks.length > 0) {
    const revisionContextEvidence = uniqueBriefStrings(revisionContextRisks
      .flatMap((item: any) => [item.fix, item.evidence, item.key, item.label])
      .filter(Boolean), 8)
    const revisionContextOpeningEvidence = revisionContextEvidence.find((item: string) => /开篇|归属|旧印章|同步|半枚|next_chapter_context/i.test(item))
    const revisionContextBoundaryEvidence = revisionContextEvidence.find((item: string) => /边界|角色卡|有限作证|无条件|character_cards/i.test(item))
    const revisionContextKeyEvidence = revisionContextEvidence.find((item: string) => /next_chapter_context|character_cards|timeline|foreshadowing|上下文/i.test(item))
    riskRows.push({
      count: revisionContextRisks.length,
      item: `修订上下文：上下文缺口 ${revisionContextRisks.length}`,
      priorityLabel: '优先复核修订上下文',
      evidence: revisionContextEvidence,
      openingActions: [
        `修订上下文开篇修复：前300字先同步 revision_context_receipts 指出的归属、时间线、角色状态或后续章节衔接，不能沿用修订前版本；${revisionContextOpeningEvidence || revisionContextEvidence[0] || '开篇先同步修订上下文。'}`,
      ],
      middleActions: [
        `修订上下文中段修复：中段按 evidence/fix 维持角色边界、资产归属和情节因果，把上下文差异写成可见选择或限制；${revisionContextBoundaryEvidence || revisionContextEvidence[0] || '中段把上下文修复落成行动限制。'}`,
      ],
      endingActions: [
        `修订上下文章尾修复：章尾按 revision_context_receipts 的 key 复核 next_chapter_context、character_cards 等衔接项是否闭环，并留下新状态或下一章钩子；${revisionContextKeyEvidence || revisionContextEvidence[0] || '章尾确认修订上下文闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const findings = proseQualityHighSeverityFindings(proseQualityEntry.payload || {})
  if (findings.length > 0) {
    const findingRawEvidence = uniqueBriefStrings(findings.map((item: any) => item.evidence), 8)
    const findingEvidence = uniqueBriefStrings([
      ...findings.map((item: any) => item.fix),
      ...findings.map((item: any) => item.evidence),
      ...findings.map((item: any) => [item.severity, item.category].filter(Boolean).join(' ')),
    ], 8)
    const openingFindingEvidence = findingEvidence.find((item: string) => /开篇|前300|前三百|主角|追查|验证|身份|目标|冲突/i.test(item))
    const middleFindingEvidence = findingEvidence.find((item: string) => /证据|阻拦|阻碍|行动|选择|信息|关系|追问|来历/i.test(item))
    const endingFindingEvidence = uniqueBriefStrings([...findingRawEvidence, ...findingEvidence], 8)
      .find((item: string) => /章末|章尾|突然消失|钩子|下一章|收束|压力|没有|没人/i.test(item))
    riskRows.push({
      count: findings.length,
      item: `复盘审稿：${findings[0]?.severity || '高危'}问题 ${findings.length}`,
      priorityLabel: findings.some((item: any) => item.severity === 'S1') ? '优先处理S1审稿问题' : '优先处理S2审稿问题',
      evidence: findingEvidence,
      openingActions: [
        `复盘审稿开篇修复：前300字先执行 S1/S2 finding 的 fix，把高危问题转成当前场景目标、冲突或调查动作；${openingFindingEvidence || findingEvidence[0] || '开篇先处理高危审稿问题。'}`,
      ],
      middleActions: [
        `复盘审稿中段修复：按 finding evidence 补正文证据、阻碍升级、信息变化或角色选择，不能只口头声明已修；${middleFindingEvidence || findingEvidence[0] || '中段把高危问题写成可见证据。'}`,
      ],
      endingActions: [
        `复盘审稿章尾修复：章尾复核上一章 S1/S2 evidence 不再复现，并把修复结果转成新压力、状态变化或下一章钩子；${endingFindingEvidence || findingEvidence[0] || '章尾确认高危问题不再残留。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const qualityGateFailureRisks = proseQualityGateFailureRisks(proseQualityEntry.payload || {})
  if (qualityGateFailureRisks.length > 0) {
    const hasLowQualityGateScore = qualityGateFailureRisks.some((item: any) => {
      const itemScore = Number(item?.score)
      const itemThreshold = Number(item?.threshold)
      return Number.isFinite(itemScore) && Number.isFinite(itemThreshold) && itemScore < itemThreshold
    })
    const qualityGateEvidence = uniqueBriefStrings(qualityGateFailureRisks
      .flatMap((item: any) => {
        const itemScore = Number(item?.score)
        const itemThreshold = Number(item?.threshold)
        const scoreEvidence = Number.isFinite(itemScore) && Number.isFinite(itemThreshold)
          ? itemScore < itemThreshold
            ? `质量分 ${item.score} 低于 ${item.threshold}`
            : `质量门禁评分 ${item.score}，阈值 ${item.threshold}`
          : ''
        return [
          item.fix,
          item.evidence,
          item.category,
          scoreEvidence,
        ]
      })
      .filter(Boolean), 8)
    const qualityGateOpeningEvidence = qualityGateEvidence.find((item: string) => /开篇|前300|前三百|冲突|触发|对抗|目标/i.test(item))
    const qualityGateMiddleEvidence = qualityGateEvidence.find((item: string) => /背景|证据|冲突|短周期|回报|角色选择|可见|信息变化/i.test(item))
    const qualityGateEndingEvidence = qualityGateEvidence.find((item: string) => /质量分|低于|阈值|章末|章尾|读者回报|复核/i.test(item))
    riskRows.push({
      count: qualityGateFailureRisks.length,
      item: `质量门禁：${hasLowQualityGateScore ? '低分未过' : '门禁未过'} ${qualityGateFailureRisks.length}`,
      priorityLabel: '优先修质量门禁',
      evidence: qualityGateEvidence,
      openingActions: [
        `质量门禁开篇修复：前300字先执行 prose_quality 失败项，把低分原因转成清晰冲突、可见目标或对抗触发；${qualityGateOpeningEvidence || qualityGateEvidence[0] || '开篇先补质量门禁缺口。'}`,
      ],
      middleActions: [
        `质量门禁中段修复：按失败 evidence 补短周期回报、可见角色选择、信息变化或冲突升级，不能继续背景说明和低密度推进；${qualityGateMiddleEvidence || qualityGateEvidence[0] || '中段把质量门禁缺口写成事件变化。'}`,
      ],
      endingActions: [
        `质量门禁章尾修复：章尾按质量分和阈值复核本章是否过门禁，必须给出可复核读者回报、新压力或下一章钩子；${qualityGateEndingEvidence || qualityGateEvidence[0] || '章尾确认质量门禁修复结果。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const fiveDimensionRisks = proseQualityFiveDimensionRisks(proseQualityEntry.payload || {})
  if (fiveDimensionRisks.length > 0) {
    const fiveDimensionEvidence = uniqueBriefStrings([
      ...fiveDimensionRisks.map((item: any) => item.fix),
      ...fiveDimensionRisks.map((item: any) => item.evidence),
      ...fiveDimensionRisks.map((item: any) => item.key),
      ...fiveDimensionRisks.map((item: any) => `${item.label} ${item.score}分`),
    ], 8)
    const coreDimensionEvidence = fiveDimensionEvidence.find((item: string) => /core_consistency|核心一致度|核心冲突|正面冲突|读者回报|守规救人/i.test(item))
    const surfaceDimensionEvidence = fiveDimensionEvidence.find((item: string) => /surface_rewrite|readability|表层重写度|可读性|AI 腔|解释腔|总结|句式|他知道/i.test(item))
    const logicDimensionEvidence = fiveDimensionEvidence.find((item: string) => /format_consistency|logic_coherence|格式一致度|逻辑连贯|因果|现场证据|动作反转|状态变化|线索/i.test(item))
    riskRows.push({
      count: fiveDimensionRisks.length,
      item: `质量五维：低分维度 ${fiveDimensionRisks.length}`,
      priorityLabel: fiveDimensionRisks.some((item: any) => item.strategy === 'de_ai') ? '优先修可读性' : '优先修五维质量',
      evidence: fiveDimensionEvidence,
      openingActions: [
        `质量五维开篇修复：前300字先处理 core_consistency/核心一致度低分，把核心冲突、规则压力和读者回报压回当前事件；${coreDimensionEvidence || fiveDimensionEvidence[0] || '开篇先把五维低分转成核心冲突。'}`,
      ],
      middleActions: [
        `质量五维中段修复：按 surface_rewrite/readability 低分清理总结腔、解释腔和 AI 腔，把静态说明改成动作、短对白、信息变化或关系变化；${surfaceDimensionEvidence || fiveDimensionEvidence[0] || '中段修复五维低分暴露的可读性问题。'}`,
      ],
      endingActions: [
        `质量五维章尾修复：按 logic_coherence/readability 低分检查因果、状态变化和收束方式，章尾必须用现场证据、动作反转或新压力收束；${logicDimensionEvidence || surfaceDimensionEvidence || fiveDimensionEvidence[0] || '章尾确认五维修复后的状态变化。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const deliveryRiskReceiptRisks = proseQualityDeliveryRiskReceiptRisks(proseQualityEntry.payload || {})
  if (deliveryRiskReceiptRisks.length > 0) {
    const deliveryReceiptEvidence = uniqueBriefStrings(deliveryRiskReceiptRisks
      .flatMap((item: any) => [
        item.required_action,
        item.remaining_risk,
        item.risk_item,
        item.evidence,
        item.repair_segment,
      ])
      .filter(Boolean), 8)
    const openingReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /opening_actions|开篇|章首|前300|前三百|追查|承接|目标/i.test(item))
    const middleReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /middle_actions|中段|事件推进|只写|环境|证据|改变|行动|信息|关系/i.test(item))
    const endingReceiptEvidence = deliveryReceiptEvidence.find((item: string) => /ending_actions|章末|章尾|最后300|remaining_risk|剩余|仍|未|没有|缺口|残留|新风险|钩子|余波/i.test(item))
    riskRows.push({
      count: deliveryRiskReceiptRisks.length,
      item: `复核承接：承接残留 ${deliveryRiskReceiptRisks.length}`,
      priorityLabel: '优先复核承接',
      evidence: deliveryReceiptEvidence,
      openingActions: [
        `复核承接开篇修复：前300字按 delivery_risk_receipts 的 risk_item/required_action 补可见承接，不能只声明已处理；${openingReceiptEvidence || deliveryReceiptEvidence[0] || '开篇先修未闭环承接回执。'}`,
      ],
      middleActions: [
        `复核承接中段修复：按 remaining_risk 和 repair_segment 写成中段事件推进、证据变化、角色选择或关系变化，避免继续空转；${middleReceiptEvidence || deliveryReceiptEvidence[0] || '中段把承接残留写成事件变化。'}`,
      ],
      endingActions: [
        `复核承接章尾修复：章尾复核 delivery_risk_receipts 的 remaining_risk 是否归零，并留下新风险、状态余波或下一章钩子；${endingReceiptEvidence || deliveryReceiptEvidence[0] || '章尾确认承接回执闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const serialRiskRepairRisks = proseQualitySerialRiskRepairRisks(proseQualityEntry.payload || {})
  if (serialRiskRepairRisks.length > 0) {
    const serialRiskRepairEvidence = serialRiskRepairRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.risk_type,
        item.repair_receipt,
        item.continuity_change,
        item.state_change,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: serialRiskRepairRisks.length,
      item: `近章风险修复：修复缺口 ${serialRiskRepairRisks.length}`,
      priorityLabel: '优先修近章风险',
      evidence: serialRiskRepairEvidence,
      openingActions: [
        `近章风险修复开篇修复：前300字先回应 serial_risk_repair_checks 指出的 risk_type/repair_receipt，把上一章未落成风险转成当前场景明确目标或阻碍；${serialRiskRepairEvidence[0] || '开篇先把近章风险修复落成目标推进。'}`,
      ],
      middleActions: [
        `近章风险修复中段修复：按 repair_receipt 和 continuity_change 写成目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却，必须有可见事件证据；${serialRiskRepairEvidence[0] || '中段把修复写成事件变化。'}`,
      ],
      endingActions: [
        `近章风险修复章尾修复：检查 state_change 和 remaining_risk，章尾必须给出状态变化后的新压力或下一章问题，不能只复述旧风险；${serialRiskRepairEvidence[0] || '章尾确认修复后的状态变化。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const revisionDirectiveRisks = proseQualityRevisionDirectiveRisks(proseQualityEntry.payload || {})
  if (revisionDirectiveRisks.length > 0) {
    const revisionDirectiveEvidence = uniqueBriefStrings(revisionDirectiveRisks, 8)
    const coreDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /ten_chapter_selling_point|核心卖点|能力使用|规则限制|读者回报/i.test(item))
    const compressionDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /压缩|环境描写|不推动剧情|节奏|空泛/i.test(item))
    const hookDirectiveEvidence = revisionDirectiveEvidence.find((item: string) => /章末|新期待|钩子|下一章|追读/i.test(item))
    riskRows.push({
      count: revisionDirectiveRisks.length,
      item: `修订指令：明确指令 ${revisionDirectiveRisks.length}`,
      priorityLabel: '优先执行修订指令',
      evidence: revisionDirectiveEvidence,
      openingActions: [
        `修订指令开篇修复：前300字先执行 revision_directives 中的核心卖点、能力使用、规则限制或读者回报指令，把修订目标写成当前场景压力；${coreDirectiveEvidence || revisionDirectiveEvidence[0] || '开篇先把修订指令落成可见目标。'}`,
      ],
      middleActions: [
        `修订指令中段修复：按 revision_directives 压缩不推动剧情、信息或情绪变化的环境描写，改成行动、选择、信息变化或关系变化；${compressionDirectiveEvidence || revisionDirectiveEvidence[0] || '中段用事件推进执行修订指令。'}`,
      ],
      endingActions: [
        `修订指令章尾修复：检查 revision_directives 的章末新期待、钩子或读者回报，章尾必须留下故事内新问题、代价或追读压力；${hookDirectiveEvidence || revisionDirectiveEvidence[0] || '章尾把修订指令转成下一章拉力。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const focusedRevisionModeRisks = proseQualityFocusedRevisionModeRisks(proseQualityEntry.payload || {})
  if (focusedRevisionModeRisks.length > 0) {
    const focusedRevisionEvidence = uniqueBriefStrings([
      ...focusedRevisionModeRisks.map((item: any) => item.fix),
      ...focusedRevisionModeRisks.map((item: any) => item.mode),
      ...focusedRevisionModeRisks.map((item: any) => item.label),
    ], 8)
    const actionModeEvidence = focusedRevisionEvidence.find((item: string) => /expand_action|add_consequence|repair_setting_violation|动作链|行动后果|设定/i.test(item))
    const compressionModeEvidence = focusedRevisionEvidence.find((item: string) => /cut_description|tighten_pacing|环境描写|事件密度|节奏/i.test(item))
    const hookModeEvidence = focusedRevisionEvidence.find((item: string) => /restore_hook|章末钩子|下一章推动力|钩子/i.test(item))
    riskRows.push({
      count: focusedRevisionModeRisks.length,
      item: `定向修订：修订模式 ${focusedRevisionModeRisks.length}`,
      priorityLabel: '优先执行定向修订',
      evidence: focusedRevisionEvidence,
      openingActions: [
        `定向修订开篇修复：前300字先执行 focused_revision_modes 的 expand_action/add_consequence/repair_setting_violation，把上一章问题写成动作链、代价或设定边界；${actionModeEvidence || focusedRevisionEvidence[0] || '开篇先把定向修订落成可见动作。'}`,
      ],
      middleActions: [
        `定向修订中段修复：按 cut_description/tighten_pacing 压缩不推动剧情的环境描写，提高事件密度，让每个场景都有行动、选择、信息或关系变化；${compressionModeEvidence || focusedRevisionEvidence[0] || '中段用事件推进完成定向修订。'}`,
      ],
      endingActions: [
        `定向修订章尾修复：按 restore_hook 和 remaining_risk 保留章末钩子，把修订结果转成下一章新问题、代价或追读压力；${hookModeEvidence || focusedRevisionEvidence[0] || '章尾把定向修订转成下一章拉力。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const craftMetricRisks = proseQualityCraftMetricRisks(proseQualityEntry.payload || {})
  if (craftMetricRisks.length > 0) {
    const craftMetricEvidence = uniqueBriefStrings([
      ...craftMetricRisks.map((item: any) => item.fix),
      ...craftMetricRisks.map((item: any) => item.key),
      ...craftMetricRisks.map((item: any) => item.label),
      ...craftMetricRisks.map((item: any) => item.evidence),
      ...craftMetricRisks.map((item: any) => Number.isFinite(Number(item.score)) ? `${item.key} ${item.score}，阈值 ${item.threshold}` : ''),
    ], 8)
    const actionMetricEvidence = craftMetricEvidence.find((item: string) => /action_detail_score|combat_process_score|动作细节|战斗过程/i.test(item))
    const densityMetricEvidence = craftMetricEvidence.find((item: string) => /event_density_score|description_overuse_score|事件密度|环境描写过量/i.test(item))
    const settingMetricEvidence = craftMetricEvidence.find((item: string) => /setting_consistency_score|设定一致性/i.test(item))
    riskRows.push({
      count: craftMetricRisks.length,
      item: `正文工艺指标：指标风险 ${craftMetricRisks.length}`,
      priorityLabel: '优先修正文工艺指标',
      evidence: craftMetricEvidence,
      openingActions: [
        actionMetricEvidence
          ? `正文工艺指标开篇修复：前300字先处理 action_detail_score/combat_process_score，写出起手、反应、空间变化、受伤或资源损耗、反制和结果；${actionMetricEvidence}`
          : `正文工艺指标开篇修复：前300字先把 craft_metrics 指标风险转成可见动作链或现场压力；${craftMetricEvidence[0] || '开篇先把工艺风险落成可见动作。'}`,
      ],
      middleActions: [
        densityMetricEvidence
          ? `正文工艺指标中段修复：按 event_density_score/description_overuse_score 提高事件密度，压缩不推动剧情、信息或情绪变化的环境描写；${densityMetricEvidence}`
          : `正文工艺指标中段修复：中段必须让 craft_metrics 风险变成行动、选择、信息变化或关系变化，不能停在静态解释；${craftMetricEvidence[0] || '中段用事件变化修正文工艺。'}`,
      ],
      endingActions: [
        settingMetricEvidence
          ? `正文工艺指标章尾修复：按 setting_consistency_score 检查能力代价、物品归属、规则触发和角色认知边界，章尾必须留下设定一致的后果或新压力；${settingMetricEvidence}`
          : `正文工艺指标章尾修复：章尾检查 craft_metrics 残留风险，把修复结果转成明确后果、状态变化或下一章问题；${craftMetricEvidence[0] || '章尾确认正文工艺修复后的后果。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const settingViolationRisks = proseQualitySettingViolationRisks(proseQualityEntry.payload || {})
  if (settingViolationRisks.length > 0) {
    const settingViolationEvidence = uniqueBriefStrings([
      ...settingViolationRisks.map((item: any) => item.fix),
      ...settingViolationRisks.map((item: any) => item.evidence),
      ...settingViolationRisks.map((item: any) => item.key),
      ...settingViolationRisks.map((item: any) => item.label),
    ], 8)
    const settingObjectEvidence = settingViolationEvidence.find((item: string) => /setting_violations|设定违规|设定|印章|钥匙|账本|规则|资产/i.test(item))
    const settingRuleEvidence = settingViolationEvidence.find((item: string) => /能力|代价|物品归属|归属|规则触发|触发|认知边界|半枚|残留规则/i.test(item))
    const settingBoundaryEvidence = settingViolationEvidence.find((item: string) => /禁揭|不得泄露|不能提前|封存|边界|祠堂|仍在/i.test(item))
    riskRows.push({
      count: settingViolationRisks.length,
      item: `设定违规：违规风险 ${settingViolationRisks.length}`,
      priorityLabel: '优先修设定违规',
      evidence: settingViolationEvidence,
      openingActions: [
        `设定违规开篇修复：前300字先锁定 setting_violations 的设定对象、归属和可用边界，不得把上一章违规版本当成事实；${settingObjectEvidence || settingViolationEvidence[0] || '开篇先确认设定对象和可用边界。'}`,
      ],
      middleActions: [
        `设定违规中段修复：按 fix 写清能力代价、物品归属、规则触发和角色认知边界，让修复落成行动限制或反制条件；${settingRuleEvidence || settingViolationEvidence[0] || '中段把设定修复写成规则执行。'}`,
      ],
      endingActions: [
        `设定违规章尾修复：章尾复核禁揭设定、封存状态和 remaining_risk，不能提前泄露或改写设定边界；${settingBoundaryEvidence || settingViolationEvidence[0] || '章尾确认设定边界没有漂移。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const deslopRepairReceiptRisks = proseQualityDeslopRepairReceiptRisks(proseQualityEntry.payload || {})
  if (deslopRepairReceiptRisks.length > 0) {
    const deslopRepairReceiptEvidence = uniqueBriefStrings(deslopRepairReceiptRisks
      .flatMap((item: any) => [
        item.risk,
        item.gate || item.label ? `不能复现上一章残留的 ${item.gate} ${item.label} 表达问题` : '',
        item.evidence,
      ])
      .filter(Boolean), 8)
    const deslopReceiptGateEvidence = deslopRepairReceiptEvidence.find((item: string) => /Gate|gate|AI味|总结|解释腔|升华/i.test(item))
    const deslopReceiptActionEvidence = deslopRepairReceiptEvidence.find((item: string) => /现场动作|动作|对白|承接|可见/i.test(item))
    riskRows.push({
      count: deslopRepairReceiptRisks.length,
      item: `去AI味闭环：去AI味残留 ${deslopRepairReceiptRisks.length}`,
      priorityLabel: '优先去AI味',
      evidence: deslopRepairReceiptEvidence,
      openingActions: [
        `去AI味闭环开篇修复：前300字先承接 deslop_repair_receipts 的 remaining_risk，用具体动作、短对白或现场物象替代总结升华；${deslopReceiptActionEvidence || deslopRepairReceiptEvidence[0] || '开篇先处理去AI味残留。'}`,
      ],
      middleActions: [
        `去AI味闭环中段修复：中段必须把残留表达问题改成现场动作、人物选择、信息变化或关系变化，禁止抽象解释和作者预告；${deslopReceiptActionEvidence || deslopRepairReceiptEvidence[0] || '中段用事件变化替代抽象表达。'}`,
      ],
      endingActions: [
        `去AI味闭环章尾修复：章尾按 Gate A-G 和 label 复核同类表达不再复现，用可见后果或新压力收束；${deslopReceiptGateEvidence || deslopRepairReceiptEvidence[0] || '章尾确认去AI味闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const deslopRepairCheckRisks = proseQualityDeslopRepairCheckRisks(proseQualityEntry.payload || {})
  if (deslopRepairCheckRisks.length > 0) {
    const deslopRepairCheckEvidence = uniqueBriefStrings(deslopRepairCheckRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.original_risk,
        item.rewritten_evidence,
        item.changed_evidence,
        item.receipt_synced,
      ])
      .filter(Boolean), 8)
    const deslopCheckRewriteEvidence = deslopRepairCheckEvidence.find((item: string) => /rewritten_evidence|changed_evidence|短对白|动作|水迹|门卡/i.test(item))
    const deslopCheckReceiptEvidence = deslopRepairCheckEvidence.find((item: string) => /receipt_synced=false|remaining_risk|回执|Gate/i.test(item))
    riskRows.push({
      count: deslopRepairCheckRisks.length,
      item: `去AI味检查：闭环缺口 ${deslopRepairCheckRisks.length}`,
      priorityLabel: '优先去AI味',
      evidence: deslopRepairCheckEvidence,
      openingActions: [
        `去AI味检查开篇修复：前300字先执行 deslop_repair_checks 的 fix，把 Gate 残留改成可见动作、短对白或现场物象；${deslopRepairCheckEvidence[0] || '开篇先修去AI味检查缺口。'}`,
      ],
      middleActions: [
        `去AI味检查中段修复：中段必须交付 rewritten_evidence/changed_evidence 对应的事件变化，不能用“已经去AI味”替代正文证据；${deslopCheckRewriteEvidence || deslopRepairCheckEvidence[0] || '中段补可定位改写证据。'}`,
      ],
      endingActions: [
        `去AI味检查章尾修复：章尾复核 receipt_synced=false 和 remaining_risk，确认 Gate 残留不再复现并形成新的可见后果；${deslopCheckReceiptEvidence || deslopRepairCheckEvidence[0] || '章尾确认去AI味回执同步。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const qualityAuditRepairReceiptRisks = proseQualityAuditRepairReceiptRisks(proseQualityEntry.payload || {})
  if (qualityAuditRepairReceiptRisks.length > 0) {
    const qualityAuditRepairReceiptEvidence = uniqueBriefStrings(qualityAuditRepairReceiptRisks
      .flatMap((item: any) => [
        item.risk,
        item.check_key || item.label ? `下一章必须补质量诊断残留：${[item.check_key, item.label].filter(Boolean).join(' ')}` : '',
        item.strategy,
        item.evidence,
      ])
      .filter(Boolean), 8)
    const qualityAuditRepairRiskEvidence = qualityAuditRepairReceiptEvidence.find((item: string) => /remaining_risk|新阻碍|空转|局势|推进|变化/i.test(item))
    const qualityAuditRepairKeyEvidence = qualityAuditRepairReceiptEvidence.find((item: string) => /check_key|chapter_progress|质量诊断|章节推进/i.test(item))
    riskRows.push({
      count: qualityAuditRepairReceiptRisks.length,
      item: `质量诊断闭环：质量诊断残留 ${qualityAuditRepairReceiptRisks.length}`,
      priorityLabel: '优先修质量诊断',
      evidence: qualityAuditRepairReceiptEvidence,
      openingActions: [
        `质量诊断闭环开篇修复：前300字先按 quality_audit_repair_receipts 的 check_key/label 承接上一章诊断残留，把它变成当前场景阻碍或目标；${qualityAuditRepairKeyEvidence || qualityAuditRepairReceiptEvidence[0] || '开篇先承接质量诊断残留。'}`,
      ],
      middleActions: [
        `质量诊断闭环中段修复：中段必须把 remaining_risk 写成局势变化、新阻碍、行动代价或读者可见回报，证明上一章修改没有空转；${qualityAuditRepairRiskEvidence || qualityAuditRepairReceiptEvidence[0] || '中段把质量诊断残留落成事件变化。'}`,
      ],
      endingActions: [
        `质量诊断闭环章尾修复：章尾按 check_key 复核 changed_evidence 和 remaining_risk 是否闭环，并留下新的状态变化或下一章钩子；${qualityAuditRepairKeyEvidence || qualityAuditRepairReceiptEvidence[0] || '章尾确认质量诊断闭环。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
  const platformRubricRisks = proseQualityPlatformRubricRisks(proseQualityEntry.payload || {})
  if (platformRubricRisks.length > 0) {
    const platformRubricEvidence = platformRubricRisks
      .flatMap((item: any) => [
        item.action,
        item.fix,
        item.remaining_risk,
        item.key,
        item.platform,
        item.opening_pace,
        item.payoff_density,
        item.reader_expectation,
        item.page_turn_pull,
        item.evidence,
        item.label,
      ])
      .filter(Boolean)
      .slice(0, 8)
    riskRows.push({
      count: platformRubricRisks.length,
      item: `平台适配：平台缺口 ${platformRubricRisks.length}`,
      priorityLabel: '优先修平台适配',
      evidence: platformRubricEvidence,
      openingActions: [
        `平台适配开篇修复：前300字按 platform_checks 的 opening_pace/key 执行目标平台节奏，先给现场事件、冲突或压力，不用平台说明替代正文；${platformRubricEvidence[0] || '开篇先满足平台节奏。'}`,
      ],
      middleActions: [
        `平台适配中段修复：按 payoff_density 和 reader_expectation 提供主角反击、情绪反馈、信息收益或爽点回报，避免只分析规则；${platformRubricEvidence[0] || '中段补平台需要的回报密度。'}`,
      ],
      endingActions: [
        `平台适配章尾修复：章尾按 page_turn_pull/remaining_risk 给出下一章拉力，必须是故事内新问题、新证据或新阻碍；${platformRubricEvidence[0] || '章尾补清楚翻页拉力。'}`,
      ],
      sourceReviewId: proseQualityEntry.review?.id || null,
    })
  }
}
