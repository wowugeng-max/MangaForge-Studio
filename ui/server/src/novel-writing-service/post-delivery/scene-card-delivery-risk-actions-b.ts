import { asArray } from '../../routes/novel-route-utils'
import { styleFingerprintSceneDirective } from '../../novel-writing/style-fingerprint'
import { sceneCardMentionsConcept } from '../../novel-writing/scene-card-readiness'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskItemText,
  deliveryRiskCarryOversFromContext,
} from './delivery-risk-core'

type AnyFn = (...args: any[]) => any

let explicitNewConceptNames: AnyFn = (_contextPackage: any = {}) => []


export function deliveryRiskProseRevisionReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订回执|prose_revision_receipt|revision_receipts|revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|delivered=false|remaining_risk|证据泛化|修订残留|可验证的现场证据|修订后仍/i.test(item)), 8)
}

export function deliveryRiskRevisionReceiptCheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|重做破局过程|现场动作|可定位动作|证据变化/i.test(item)), 8)
}

export function deliveryRiskDeliveryReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复核承接|delivery_risk_receipts|delivered=false|risk_item|required_action|remaining_risk|承接风险|上一章.{0,12}风险|交稿风险/i.test(item)), 8)
}

export function deliveryRiskRevisionScopeGuardActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订幅度|revision_scope_guard|allowed_delta_word_count|scope_warning|局部补证据|不能新增支线|替换核心梗|删除伏笔|删除.*钩子|角色特征|保留项|不得大幅/i.test(item)), 8)
}

export function deliveryRiskRevisionDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_directives|revisionDirectives|修订指令|明确指令|directive/i.test(item)), 8)
}

export function deliveryRiskFocusedRevisionModeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /focused_revision_modes|focusedRevisionModes|expand_action|cut_description|tighten_pacing|add_consequence|restore_hook|repair_setting_violation|定向修订|修订模式/i.test(item)), 8)
}

export function deliveryRiskCraftMetricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /craft_metrics|craftMetrics|action_detail_score|description_overuse_score|event_density_score|combat_process_score|setting_consistency_score|正文工艺指标|动作细节|环境描写过量|事件密度|战斗过程|设定一致性/i.test(item)), 8)
}

export function deliveryRiskFiveDimensionScoreActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /five_dimension_scores|fiveDimensionScores|core_consistency|surface_rewrite|format_consistency|readability|logic_coherence|质量五维|五维评分|核心一致度|表层重写度|格式一致度|可读性|逻辑连贯/i.test(item)), 8)
}

export function deliveryRiskQualitySpecialtyActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /structure_checks|structureChecks|progression_checks|progressionChecks|information_checks|informationChecks|opening_hook|middle_progression|situation_change|ending_page_turn|non_deletable_change|mainline_shift|relationship_or_state_change|compressed_water|new_concept_count|action_bound_info|conflict_release|reader_first_scene|章节结构|章节推进|信息传递|信息负载/i.test(item)), 8)
}

export function deliveryRiskPlatformContentRubricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /platform_checks|platformChecks|content_rubric_checks|contentRubricChecks|opening_pace|payoff_density|reader_expectation|page_turn_pull|core_selling_point|conflict_progression|chapter_change|page_turn_reason|平台检查|内容基准|平台适配|黄金三问/i.test(item)), 8)
}

export function deliveryRiskDeterministicCleanupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /确定性清理|deterministic_prose_cleanup|硬扫残留|Gate\s*[A-G]|禁用词|模板表达|AI签名|去AI味|抽象总结|动作反应|prose format|format violations/i.test(item)), 8)
}

export function deliveryRiskBannedWordActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /banned_words_checks|bannedWordsChecks|matched_word|matchedWord|remaining_risk|remainingRisk|replacement|禁用词|硬禁词|禁用表达|模板表达|AI签名|万能抽象|此时此刻|命运齿轮/i.test(item)), 8)
}

export function deliveryRiskDeslopRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /去AI回执|deslop_repair_receipts|deslop_repair|changed_evidence|Gate\s*[A-G]|模板表达|AI味|去AI味|抽象总结|动作反应|短对白|解释腔/i.test(item)), 8)
}

export function deliveryRiskReadabilityActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /可读性|readability_review|readability_score|梗感|meme_sense|长句|句子切短|短句|动作和对白|解释腔|复述爽点|能复述|高密场景/i.test(item)), 8)
}

export function deliveryRiskGovernanceRecheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /治理复查|governance_recheck|恢复依据|failed_evidence|watch_items|继续观察|节奏恢复|样章策略|可见冲突推进|修后证据/i.test(item)), 8)
}

export function deliveryRiskChapterTitleActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修标题|章节标题|chapter_title_uniqueness|标题重复|标题承诺|标题差异化|标题卖点|标题回收|标题.*正文|正文.*标题/i.test(item)), 8)
}

export function deliveryRiskQualityGateActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量门禁|prose_quality|复盘审稿|质量五维|低分未过|平台适配|内容基准|S1\s*问题|S2\s*问题|清晰冲突|短周期回报|可见角色选择/i.test(item)), 8)
}

export function deliveryRiskQualityAuditRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量修复回执|quality_audit_repair_receipts|quality_audit_repair|quality_audit_checks|事件内容比重|changed_evidence|remaining_risk|短周期回报|现场冲突|信息变化|可定位事件/i.test(item)), 8)
}

export function deliveryRiskQualityPlanReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复检质量续航|质量续航回执|质量续航计划|next_chapter_quality_plan_receipts|next_chapter_quality_plan|quality_focus|evidence_basis|avoid_repetition/i.test(item)), 8)
}

export function deliveryRiskSerialRiskRepairActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /近章风险修复|serial_risk_repair|serial_risk_repair_checks|scene_cards\.serial_risk_repairs|recent_fatigue_action|目标推进|阻碍升级|新信息|关系\/世界调剂|冲突冷却/i.test(item)), 8)
}

export function deliveryRiskSceneCardReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /场景回执|场景卡回执|scene_card_receipts|scene_card_receipt|scene_start_anchor|scene_end_anchor|goal_obstacle_change_delivered|purpose_tag_delivered|serial_risk_repairs_delivered|required_beats_delivered|action_beats_delivered|场景边界|证据跨场景|scene_goal|state_delta/i.test(item)), 8)
}

export function deliveryRiskPerspectiveReviewActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /多视角审查|perspective_review|perspective_verdict|reviewer|CONCERNS|REJECT|商业编辑|读者视角|审查视角|现场阻碍|可复述读者回报/i.test(item)), 8)
}

export function deliveryRiskTargetReaderActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /目标读者|target_reader|读者欲望|本章吸引点|规则反制|现场行动|可感知回报|平台口味|自嗨判定/i.test(item)), 8)
}

export function deliveryRiskConflictStructureActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /冲突结构|conflict_structure|真实阻止|阻止者|有进无出|行动阻拦|胜负变化|明确胜负|压力源|阻碍升级|矛盾网|下一冲突种子/i.test(item)), 8)
}

export function deliveryRiskGenrePositioningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /题材定位|genre_positioning|品类卖点|题材承诺|类型承诺|卖点偏移|不能偏成|赛博修仙|门派规则|法器交易/i.test(item)), 8)
}

export function deliveryRiskUpgradeRhythmActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /升级节奏|upgrade_rhythm|小目标升级|资源增量|能力反馈|新门槛|升级压力|升级闭环|阶段升级|成长反馈/i.test(item)), 8)
}

export function deliveryRiskContinuityHeatActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /连续性热度|continuity_heat|爆点余温|旧热度|新压力|高热未解|热度承接|热度断档|上一章爆点|章末留高热/i.test(item)), 8)
}

export function deliveryRiskSourceReadinessActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /来源就绪|source_readiness|来源依据|资料来源|信息来源|缺口必须先写入|不能靠正文临时编|旧印编号|禁库权限|证词/i.test(item)), 8)
}

export function deliveryRiskWritePreparationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /写前准备|write_preparation|write_preparation_checks|source_gaps|asset_risks|blueprint_focus|reader_payoff_focus|must_confirm|creation_contract_checklist|执行缺口|准备卡/i.test(item)), 8)
}

export function deliveryRiskIntentConfirmationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /意图确认|intent_confirmation|本章目标|服务本章目标|目标推进|验证目标|不能偏去|偏离章节意图|章节意图/i.test(item)), 8)
}

export function deliveryRiskChapterBlueprintActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节细纲|chapter_blueprint|blueprint_consumption|blueprint_field|missing_gap|细纲兑现|细纲顺序|beat sequence|线索确认|行动受阻|付出代价|小胜奖励|不能跳过代价|只给奖励/i.test(item)), 8)
}

export function deliveryRiskBlueprintConsumptionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /blueprint_consumption_checks|blueprint_consumption|blueprint_field|missing_gap|delivered_evidence|细纲兑现|正文只给结果|只给结果没有代价|可见事件|章尾承接/i.test(item)), 8)
}

export function deliveryRiskCoreContractActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /核心契约|core_contract|创作契约|核心承诺|核心冲突|不得漂移|漂移红线|核心卖点|核心爽点|读者回报/i.test(item)), 8)
}

export function deliveryRiskFemaleAudienceActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /女频长篇|female_audience|女性视角|关系张力|情感选择|安全感|尊严感|情绪价值|关系推进|关系变化/i.test(item)), 8)
}

export function deliveryRiskChapterBenchmarkActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节基准|chapter_benchmark|对标章节|节奏基准|结构基准|开局压迫|三段升级|章尾回收|只学节奏/i.test(item)), 8)
}

export function deliveryRiskRunwayActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /航线|runway|longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|长线方向|长线目标|主线终点|主线推进|支线.{0,12}带偏|新航点|黑塔许可|阶段目标|下一阶段牵引/i.test(item)), 8)
}

export function deliveryRiskLongformActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|最近5章|最近五章|爽点间隔|阶段目标|阶段换挡|下一阶段牵引|上下文层断裂/i.test(item)), 8)
}

export function deliveryRiskSignatureSceneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /招牌场面|signature_scene|名场面|强画面|可传播动作|读者记忆点|视觉爽点|高光场面|场面记忆点/i.test(item)), 8)
}

export function deliveryRiskStoryUnitActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /剧情单元|story_unit|目标建立|阻碍升级|代价选择|结果回收|单元闭合|未闭合部分|下一章承接/i.test(item)), 8)
}

export function deliveryRiskChapterHandoffActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => !/补章末交接|chapter_handoff_delta|章末交接/i.test(item) && /章首承接|chapter_handoff(?!_delta)|上一章.{0,16}余波|角色状态|未解债务|转成新目标|开篇承接/i.test(item)), 8)
}

export function deliveryRiskOpeningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /开篇设计|opening_sync|前50字|前100字|第一段|异常|冲突|对话逼问|不能慢写环境|慢热开头/i.test(item)), 8)
}

export function deliveryRiskParagraphHookActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /段落钩子|paragraph_hook|段落级推进|段尾|新动作|新问题|反应差异|连续三段平铺|小节钩子/i.test(item)), 8)
}

export function deliveryRiskProseMetaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /正文元信息|prose_meta|章节标题说明|创作提示|作者备注|本章将|元叙述|角色当场感知/i.test(item)), 8)
}

export function deliveryRiskPunctuationToneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /语气标点|punctuation_tone|感叹号|破折号|省略号|动作打断|情绪压迫|信息转折|假高能|连续堆叠/i.test(item)), 8)
}

export function deliveryRiskStyleBoundaryActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风边界|style_boundary|风格样本|style_sample|冷静短句|动作后果|不能复制样本|复制样本文句|叙述视角|限知/i.test(item)), 8)
}

export function deliveryRiskStyleSampleReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /样章策略回执|style_sample_checks|style_sample_strategy|样章策略缺口|叙述节奏|对白比例|角色口吻|情绪转折|抽象表达策略|不得复制样章|复制样章桥段|复制样章.*原句/i.test(item)), 8)
}

export function deliveryRiskPayoffSetupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /爽点铺垫|payoff_setup|payoff|打脸.{0,12}铺|先铺|对手施压|规则限制|主角暗手|突然给证据爽点/i.test(item)), 8)
}

export function deliveryRiskSpectatorReactionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /围观反应|spectator_reaction|旁观者|分层震惊|专家读懂|对手失声|观众反应|反应分层/i.test(item)), 8)
}

export function deliveryRiskForeshadowingDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /伏笔增量|foreshadowing_delta|新伏笔|可见线索|伏笔入场|章尾.{0,12}问题|半枚纹路|缺编号/i.test(item)), 8)
}

export function deliveryRiskConceptAnchorActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /新概念|新名词|新设定|新道具|首次出现|动作反应|物理后果|作用锚点|concept_anchor|零信息生词|整段来历|等级说明/i.test(item)), 8)
}

export * from './scene-card-delivery-risk-apply'
