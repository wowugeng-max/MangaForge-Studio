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
import { appendProseQualityDeliveryRiskCarryOverRowsExtended } from './delivery-risk-carry-over-prose-quality-extended'

/** Append prose-quality-derived carry-over risk rows for the previous chapter. */
export function appendProseQualityDeliveryRiskCarryOverRows(
  riskRows: Array<{
    count: number
    item: string
    priorityLabel: string
    evidence: string[]
    sourceReviewId: any
    openingActions?: string[]
    middleActions?: string[]
    endingActions?: string[]
    forbiddenRepeats?: string[]
  }>,
  proseQualityEntry: { review?: any; payload?: any },
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
  appendProseQualityDeliveryRiskCarryOverRowsExtended(riskRows, proseQualityEntry)
}
