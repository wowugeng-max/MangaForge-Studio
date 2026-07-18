import type { AnyRecord } from './utils'
import {
  approvalBlockerNeedsNextChapterQualityPlan,
} from './support'

export function appendRepairTaskQualitySyncPromptLinesRepairs(lines: string[], ctx: Record<string, any>) {
  const {
    approvalBlocker,
    deslopRepairReceiptRepair,
    proseRevisionReceiptSyncRepair,
    qualityAuditRepair,
    qualityAuditRepairReceiptRepair,
    revisionCascadeImpactRepair,
    revisionContextReceiptRepair,
    revisionScopeGuardRepair,
    sceneCardDirectiveRepair,
    sceneCardReceiptRepair,
  } = ctx

  if (approvalBlocker) {
    lines.push(
      '【入库阻断修复】',
      `阻断类型：${approvalBlocker.label}`,
      approvalBlocker.scoreLabel ? `阻断评分：${approvalBlocker.scoreLabel}` : '',
      approvalBlocker.copyHitCount !== null ? `相似命中：${approvalBlocker.copyHitCount}` : '',
      approvalBlocker.detail ? `阻断详情：${approvalBlocker.detail}` : '',
      approvalBlocker.reasons.length > 0 ? `阻断原因：${approvalBlocker.reasons.join('；')}` : '',
      '修订要求：必须先解除入库阻断，再处理普通质量润色；如果是仿写安全阻断，保留本章功能、爽点和信息增量，但重写具体桥段、动作顺序、机制表达、场景调度和关键措辞。',
      '不得照搬参考桥段、原句、专名、连续事件节奏或标志性场面；不得只替换名词或扩写说明来规避相似。',
      '修订后必须重新运行正文质检和入库门禁，确认 approval_blocker 消失、质量门禁通过，再关闭任务。',
    )
    if (approvalBlockerNeedsNextChapterQualityPlan(approvalBlocker)) {
      lines.push(
        '【下一章质量续航计划修复】',
        '本次阻断来自 next_chapter_quality_plan 缺失或不完整；修订结果必须补齐 next_chapter_quality_plan，不能只改正文。',
        'next_chapter_quality_plan 必须包含 version、quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition、evidence_basis。',
        'quality_focus 写下一章最该守住的质量目标；opening_actions 写前300字动作；middle_actions 写中段冲突/信息/状态变化；ending_actions 写最后300字追读钩子或承接余波。',
        'avoid_repetition 写下一章禁止复现的表达、结构或收尾套路；evidence_basis 写计划来自本章哪些正文证据、质检问题、回执残留或 oh-story 清单。',
        '同时把同一份计划写入 oh_story_delivery_receipts.next_chapter_quality_plan，确保下一章 pre-draft 能继承。',
      )
    }
  }
  if (sceneCardDirectiveRepair) {
    lines.push(
      '【场景卡执行禁令闭环】',
      sceneCardDirectiveRepair.sourceLabel ? `风险来源：${sceneCardDirectiveRepair.sourceLabel}` : '',
      sceneCardDirectiveRepair.severity ? `严重级别：${sceneCardDirectiveRepair.severity}` : '',
      sceneCardDirectiveRepair.issueType ? `执行问题：${sceneCardDirectiveRepair.issueType}` : '',
      sceneCardDirectiveRepair.sceneNo > 0 ? `目标场景：场景${sceneCardDirectiveRepair.sceneNo}` : '',
      sceneCardDirectiveRepair.conceptAnchorRules.length > 0 ? `新概念锚点规则：${sceneCardDirectiveRepair.conceptAnchorRules.join('；')}` : '',
      sceneCardDirectiveRepair.proseCraftDirectives.length > 0 ? `正文工艺禁令：${sceneCardDirectiveRepair.proseCraftDirectives.join('；')}` : '',
      sceneCardDirectiveRepair.evidence ? `违规证据：${sceneCardDirectiveRepair.evidence}` : '',
      sceneCardDirectiveRepair.fix ? `原始修法：${sceneCardDirectiveRepair.fix}` : '',
      '修订要求：只能修对应场景的场景卡执行缺口；把未兑现的 dialogue_goals、style_directives、benchmark_recall_directives、concept_anchor_rules 或 prose_craft_directives 改成正文可见的动作链、对白交锋、感知锚点、物理后果、证据判断变化或局势反馈。',
      '新概念首次出现要求：必须用动作反应、对白半句、物理后果或证据判断变化锚定；不得补设定小百科、等级表、来历段或作者式解释。',
      '禁令修复要求：如果原问题是 forbidden_directives，先删除违反禁令的说明书式科普、整段来历、原理解释、等级解释或总结旁白，再用角色当下可感知的事件替换。',
      '回执要求：修订后 scene_card_receipts 必须补齐 dialogue_goals_delivered、style_directives_delivered、benchmark_recall_directives_delivered、concept_anchor_rules_delivered、prose_craft_directives_delivered，并让 evidence 引用修订后对应场景正文。',
      '关闭口径：重新运行正文自检后，scene_card_*_execution_directives / scene_card_*_forbidden_directives 必须为 pass/ok，remaining_risk 为空。',
    )
  }
  if (sceneCardReceiptRepair) {
    lines.push(
      '【场景卡回执闭环】',
      sceneCardReceiptRepair.sourceLabel ? `风险来源：${sceneCardReceiptRepair.sourceLabel}` : '',
      sceneCardReceiptRepair.severity ? `严重级别：${sceneCardReceiptRepair.severity}` : '',
      sceneCardReceiptRepair.issueType ? `回执问题：${sceneCardReceiptRepair.issueType}` : '',
      sceneCardReceiptRepair.sceneNo > 0 ? `目标场景：场景${sceneCardReceiptRepair.sceneNo}` : '',
      sceneCardReceiptRepair.fields.length > 0 ? `失败字段：${sceneCardReceiptRepair.fields.join('、')}` : '',
      sceneCardReceiptRepair.evidence ? `回执证据：${sceneCardReceiptRepair.evidence}` : '',
      sceneCardReceiptRepair.fix ? `原始修法：${sceneCardReceiptRepair.fix}` : '',
      '修订要求：只能修对应场景，把失败字段补成正文可见的目标推进、阻碍变化、动作链、感知锚点、风险修复或必要对白，不得顺手改其他场景事实。',
      '回执重写：修订后必须重写该场景 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自修订后对应场景正文。',
      '证据要求：scene_card_receipts.evidence 必须引用修订后对应场景中的动作、对话、信息变化、关系变化或物品状态变化，不得借用其他场景，不得只写“已完成”。',
      '关闭口径：重新运行正文自检后，scene_card_receipt 相关检查必须为 ok；原 delivered=false 的字段必须变成 delivered=true 且 evidence 能在对应场景定位。',
    )
  }
  if (deslopRepairReceiptRepair) {
    lines.push(
      '【去AI味修复回执闭环】',
      deslopRepairReceiptRepair.sourceLabel ? `风险来源：${deslopRepairReceiptRepair.sourceLabel}` : '',
      deslopRepairReceiptRepair.severity ? `严重级别：${deslopRepairReceiptRepair.severity}` : '',
      deslopRepairReceiptRepair.issueType ? `去AI味问题：${deslopRepairReceiptRepair.issueType}` : '',
      deslopRepairReceiptRepair.message ? `回执缺口：${deslopRepairReceiptRepair.message}` : '',
      deslopRepairReceiptRepair.action ? `原始修法：${deslopRepairReceiptRepair.action}` : '',
      ...deslopRepairReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...deslopRepairReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：只补仍未闭环的去AI味门禁风险；如果正文仍有 AI 腔、解释腔、连续主语、总结体或句式套路，先小范围修正文，再补对应回执，不要改变剧情、人设、设定和因果。',
      '回执要求：修订结果必须输出 deslop_repair_receipts；每条回执要逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项。',
      '证据要求：deslop_repair_receipts.changed_evidence 必须引用修订后正文中的具体句子、动作、对白、语序变化或语气变化，不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，deslop_repair_receipt_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (revisionCascadeImpactRepair) {
    lines.push(
      '【修订级联影响闭环】',
      revisionCascadeImpactRepair.sourceLabel ? `风险来源：${revisionCascadeImpactRepair.sourceLabel}` : '',
      revisionCascadeImpactRepair.severity ? `严重级别：${revisionCascadeImpactRepair.severity}` : '',
      revisionCascadeImpactRepair.issueType ? `级联问题：${revisionCascadeImpactRepair.issueType}` : '',
      revisionCascadeImpactRepair.message ? `级联缺口：${revisionCascadeImpactRepair.message}` : '',
      revisionCascadeImpactRepair.action ? `原始修法：${revisionCascadeImpactRepair.action}` : '',
      ...revisionCascadeImpactRepair.missed.map(item => `影响项：${item}`),
      ...revisionCascadeImpactRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：不要只改当前章表面文字；必须复核 revision_receipts.cascade_impacts，把本章修订后的伏笔、时间线、角色状态、资产归属和关系边界转成后续章节可执行动作。',
      '证据要求：每条 cascade_impacts 必须补齐 evidence/source_excerpt，引用修订后正文中支撑正史变更的原句或场景变化。',
      '后续同步：如果受影响章节已经存在，先修正对应章节或形成明确修复任务；如果还未写入，必须写入下一章/后续章的 pre-draft carry-over。',
      '关闭口径：重新运行正文自检后，revision_cascade_impact_sync 必须为 ok，missed_count=0，后续章节不再沿用旧状态。',
    )
  }
  if (revisionContextReceiptRepair) {
    lines.push(
      '【修订上下文回执闭环】',
      revisionContextReceiptRepair.sourceLabel ? `风险来源：${revisionContextReceiptRepair.sourceLabel}` : '',
      revisionContextReceiptRepair.severity ? `严重级别：${revisionContextReceiptRepair.severity}` : '',
      revisionContextReceiptRepair.issueType ? `上下文问题：${revisionContextReceiptRepair.issueType}` : '',
      revisionContextReceiptRepair.message ? `上下文缺口：${revisionContextReceiptRepair.message}` : '',
      revisionContextReceiptRepair.action ? `原始修法：${revisionContextReceiptRepair.action}` : '',
      ...revisionContextReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...revisionContextReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：先按 workflow-revision 重新核对修订前后的上下文，再小范围修正文或补后续承接；不能假设已经一致。',
      '覆盖范围：revision_context_receipts 必须逐项覆盖 previous_chapter、current_chapter、next_chapter 或下一章细纲、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界。',
      '回执字段：每条 revision_context_receipts 必须包含 key、label、status、evidence、fix、source_excerpt；无法确认某个来源时 status 写 warn/fail，并写清本章或下一章如何兜住。',
      '证据要求：source_excerpt/evidence 必须引用修订后正文、上一章、下一章细纲、伏笔台账、角色卡、时间线或设定上下文中可定位的原句/条目，不得只写“已核对”。',
      '关闭口径：重新运行正文自检后，revision_context_receipts_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (revisionScopeGuardRepair) {
    lines.push(
      '【修订幅度守恒】',
      revisionScopeGuardRepair.sourceLabel ? `风险来源：${revisionScopeGuardRepair.sourceLabel}` : '',
      revisionScopeGuardRepair.severity ? `严重级别：${revisionScopeGuardRepair.severity}` : '',
      revisionScopeGuardRepair.issueType ? `幅度问题：${revisionScopeGuardRepair.issueType}` : '',
      revisionScopeGuardRepair.message ? `幅度缺口：${revisionScopeGuardRepair.message}` : '',
      revisionScopeGuardRepair.action ? `原始修法：${revisionScopeGuardRepair.action}` : '',
      ...revisionScopeGuardRepair.missed.map(item => `缺口项：${item}`),
      ...revisionScopeGuardRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复，避免把润色扩大成新剧情。',
      '幅度标准：修订前后字数差异必须回到 max(原文 30%, 800 字) 警戒线内，除非 revision_scope_guard.scope_warning 给出可审计理由。',
      '保护内容：不得为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折；不得无证据新增支线、设定、关系或时间线。',
      '关闭口径：重新运行正文自检后，revision_scope_guard_sync 必须为 ok，missed_count=0。',
    )
  }
  if (proseRevisionReceiptSyncRepair) {
    lines.push(
      '【修订回执同步闭环】',
      proseRevisionReceiptSyncRepair.sourceLabel ? `风险来源：${proseRevisionReceiptSyncRepair.sourceLabel}` : '',
      proseRevisionReceiptSyncRepair.severity ? `严重级别：${proseRevisionReceiptSyncRepair.severity}` : '',
      proseRevisionReceiptSyncRepair.issueType ? `修订问题：${proseRevisionReceiptSyncRepair.issueType}` : '',
      proseRevisionReceiptSyncRepair.message ? `回执缺口：${proseRevisionReceiptSyncRepair.message}` : '',
      proseRevisionReceiptSyncRepair.action ? `原始修法：${proseRevisionReceiptSyncRepair.action}` : '',
      ...proseRevisionReceiptSyncRepair.missed.map(item => `缺口项：${item}`),
      ...proseRevisionReceiptSyncRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：先对齐自检 issues、delivery_risk_receipts 和确定性检查缺口，再小范围修正文；不得只补普通润色回执，也不得用一条汇总回执覆盖多条风险。',
      '回执要求：修订结果必须输出 revision_receipts；每条缺失回执都要逐条写 required_action、repair_segment、applied_fix 和 changed_evidence。',
      '证据要求：changed_evidence 必须引用修订后正文中的具体动作、对白、场景后果、状态写回或章末追读证据；不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，prose_revision_receipt_sync 必须为 ok，missed_count=0。',
    )
  }
  if (qualityAuditRepairReceiptRepair) {
    lines.push(
      '【质量诊断修复回执闭环】',
      qualityAuditRepairReceiptRepair.sourceLabel ? `风险来源：${qualityAuditRepairReceiptRepair.sourceLabel}` : '',
      qualityAuditRepairReceiptRepair.severity ? `严重级别：${qualityAuditRepairReceiptRepair.severity}` : '',
      qualityAuditRepairReceiptRepair.issueType ? `质量问题：${qualityAuditRepairReceiptRepair.issueType}` : '',
      qualityAuditRepairReceiptRepair.message ? `回执缺口：${qualityAuditRepairReceiptRepair.message}` : '',
      qualityAuditRepairReceiptRepair.action ? `原始修法：${qualityAuditRepairReceiptRepair.action}` : '',
      ...qualityAuditRepairReceiptRepair.missed.map(item => `缺口项：${item}`),
      ...qualityAuditRepairReceiptRepair.nextActions.map(item => `闭环动作：${item}`),
      '修订要求：只补仍未闭环的质量诊断风险；如果正文确实还没改到位，先小范围修正文，再补对应回执，不要重写整章。',
      '回执要求：修订结果必须输出 quality_audit_repair_receipts；每条回执要逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项。',
      '证据要求：quality_audit_repair_receipts.changed_evidence 必须引用修订后正文中的具体句子、动作、对白、信息变化或局势变化，不得只写“已修复”。',
      '关闭口径：重新运行正文自检后，quality_audit_repair_receipt_sync 必须为 ok，missed_count=0，且每条 remaining_risk 为空。',
    )
  }
  if (qualityAuditRepair) {
    lines.push(
      '【质量诊断修复】',
      qualityAuditRepair.sourceLabel ? `风险来源：${qualityAuditRepair.sourceLabel}` : '',
      qualityAuditRepair.severity ? `严重级别：${qualityAuditRepair.severity}` : '',
      qualityAuditRepair.issueType ? `质量问题：${qualityAuditRepair.issueType}` : '',
      qualityAuditRepair.message ? `诊断证据：${qualityAuditRepair.message}` : '',
      qualityAuditRepair.action ? `原始修法：${qualityAuditRepair.action}` : '',
      qualityAuditRepair.strategy ? `指定策略：${qualityAuditRepair.strategy}` : '',
      ...qualityAuditRepair.checks.map(item => `检查项：${item}`),
      '修订要求：先补本章一句话概括，再按场景目的词重排详略；爽点/打脸/高潮/卖点/关键揭露/反转必须展开危机或期待铺垫、出手过程、对话交锋、配角反应和结果余波。',
      '水文处理：过渡、赶路、信息交代、时间跳转压成 1-2 句；删除不改变理解的环境描写、空泛总结、机械说明和重复心理活动。',
      '信息流要求：信息跟冲突走，卖点必须用剧情、动作、对白和反应隐性展示，不得直接告知“本章很爽/读者会喜欢/这是核心卖点”。',
      '五维评分修复：根据最低维度选择 rewrite/compress/de_ai/polish；修完必须保留本章主线职责，不新增未确认设定，不提前揭示后续禁揭信息。',
      '输出要求：必须返回 quality_audit_checks，不能只写自然语言质量诊断已修复。',
      'quality_audit_checks 每项必须包含 key, label, status, strategy, purpose_tag, density_change, conflict_bound_info, changed_evidence, fix, remaining_risk。',
      '爽点/打脸/高潮未展开、过渡水文未压缩或 changed_evidence 缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，quality_audit_checks 中本任务相关 fail/warn 必须清零，并在 revision_receipts 或修订说明中写明处理证据。',
    )
  }
}
