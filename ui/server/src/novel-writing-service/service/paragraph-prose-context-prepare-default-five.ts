/** Default five-chapter lane template fields derived from next-batch brief. */
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  chapterNosBrief,
} from '../quality/memory-longform-contracts'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'

export function prepareDefaultFiveChapterLaneFields(nextBatchBrief: any) {
  const expansionStructureDecision = nextBatchBrief?.expansion_structure_decision || null
  const defaultFiveChapterLaneRedesign = expansionStructureDecision?.default_five_chapter_lane_redesign || null
  const expansionStructureVerification = nextBatchBrief?.expansion_structure_verification || null
  const defaultFiveChapterRegression = expansionStructureVerification?.default_five_chapter_regression || null
  const defaultFiveChapterLaneTemplate = expansionStructureVerification?.default_five_chapter_lane_template || null
  const defaultFiveChapterLaneTemplateRequirementLabels = asArray(defaultFiveChapterLaneTemplate?.requirements)
    .map((item: any) => compactBriefText(item?.label || item?.key))
    .filter(Boolean)
  const defaultFiveChapterLaneTemplateRepairSummaries = asArray(defaultFiveChapterLaneTemplate?.repaired_missing_requirements)
    .map((item: any) => {
      const label = compactBriefText(item?.label || item?.key || '模板要求')
      const chapters = chapterNosBrief(item?.chapter_nos || item?.chapterNos)
      return label ? `${chapters ? `${chapters}缺` : '缺'}${label}` : ''
    })
    .filter(Boolean)
  const defaultFiveChapterLaneTemplateRepairActions = uniqueBriefStrings(
    defaultFiveChapterLaneTemplate?.repair_actions || defaultFiveChapterLaneTemplate?.repairActions || [],
    8,
  )
  const defaultFiveChapterLaneTemplateRedesignSource = compactBriefText(
    defaultFiveChapterLaneTemplate?.redesign_source || defaultFiveChapterLaneTemplate?.redesignSource,
  )
  const defaultFiveChapterLaneTemplateTopFailed = defaultFiveChapterLaneTemplate?.top_failed_requirement
    || defaultFiveChapterLaneTemplate?.topFailedRequirement
    || null
  const defaultFiveChapterLaneTemplateRedesignLines = asArray(
    defaultFiveChapterLaneTemplate?.redesigned_templates || defaultFiveChapterLaneTemplate?.redesignedTemplates,
  )
    .map((item: any) => {
      const label = compactBriefText(item?.label || item?.key || '模板项')
      const template = compactBriefText(item?.template || item?.rewrite || item?.instruction || item?.text || item?.detail)
      return label && template ? `${label}：${template}` : ''
    })
    .filter(Boolean)
  const defaultFiveChapterLaneTemplateValidationStandard = uniqueBriefStrings(
    defaultFiveChapterLaneTemplate?.validation_standard || defaultFiveChapterLaneTemplate?.validationStandard || [],
    8,
  )
  const defaultFiveChapterLaneTemplateRequiredReceipts = uniqueBriefStrings(
    defaultFiveChapterLaneTemplate?.required_receipts || defaultFiveChapterLaneTemplate?.requiredReceipts || [],
    8,
  )
  const defaultFiveChapterLaneTemplateVersionId = compactBriefText(
    defaultFiveChapterLaneTemplate?.template_version_id
    || defaultFiveChapterLaneTemplate?.templateVersionId
    || defaultFiveChapterLaneTemplate?.template_version?.id
    || defaultFiveChapterLaneTemplate?.templateVersion?.id,
  )
  const defaultFiveChapterLaneTemplateProductionRelapseCount = Number(
    defaultFiveChapterLaneTemplate?.production_relapse_count
    ?? defaultFiveChapterLaneTemplate?.productionRelapseCount
    ?? 0,
  )
  const defaultFiveChapterLaneTemplateProductionRelapseReview = defaultFiveChapterLaneTemplate?.production_relapse_review
    || defaultFiveChapterLaneTemplate?.productionRelapseReview
    || null
  const defaultFiveChapterLaneTemplateProductionRelapseChapterNos = chapterNosBrief(
    defaultFiveChapterLaneTemplateProductionRelapseReview?.default_batch_chapter_nos
    || defaultFiveChapterLaneTemplateProductionRelapseReview?.defaultBatchChapterNos
    || [],
  )
  const defaultFiveChapterLaneTemplateProductionRelapseRestoreNos = chapterNosBrief(
    defaultFiveChapterLaneTemplateProductionRelapseReview?.restore_chapter_nos
    || defaultFiveChapterLaneTemplateProductionRelapseReview?.restoreChapterNos
    || [],
  )
  const defaultFiveChapterLaneTemplateProductionRelapseValidationNos = chapterNosBrief(
    defaultFiveChapterLaneTemplateProductionRelapseReview?.validation_chapter_nos
    || defaultFiveChapterLaneTemplateProductionRelapseReview?.validationChapterNos
    || [],
  )
  const defaultFiveChapterLaneTemplateProductionFailureReasons = uniqueBriefStrings(
    defaultFiveChapterLaneTemplateProductionRelapseReview?.failure_reasons
    || defaultFiveChapterLaneTemplateProductionRelapseReview?.failureReasons
    || [],
    8,
  )
  const defaultFiveChapterLaneTemplateProductionFailedRequirements = asArray(
    defaultFiveChapterLaneTemplateProductionRelapseReview?.failed_requirements
    || defaultFiveChapterLaneTemplateProductionRelapseReview?.failedRequirements
    || defaultFiveChapterLaneTemplate?.failed_requirements
    || defaultFiveChapterLaneTemplate?.failedRequirements,
  )
    .map((item: any) => {
      const label = compactBriefText(item?.label || item?.key || '模板缺项')
      const reason = compactBriefText(item?.failure_reason || item?.failureReason || item?.reason)
      return label && reason ? `${label}/${reason}` : label || reason
    })
    .filter(Boolean)
    .slice(0, 8)
  return {
    expansionStructureDecision,
    defaultFiveChapterLaneRedesign,
    expansionStructureVerification,
    defaultFiveChapterRegression,
    defaultFiveChapterLaneTemplate,
    defaultFiveChapterLaneTemplateRequirementLabels,
    defaultFiveChapterLaneTemplateRepairSummaries,
    defaultFiveChapterLaneTemplateRepairActions,
    defaultFiveChapterLaneTemplateRedesignSource,
    defaultFiveChapterLaneTemplateTopFailed,
    defaultFiveChapterLaneTemplateRedesignLines,
    defaultFiveChapterLaneTemplateValidationStandard,
    defaultFiveChapterLaneTemplateRequiredReceipts,
    defaultFiveChapterLaneTemplateVersionId,
    defaultFiveChapterLaneTemplateProductionRelapseCount,
    defaultFiveChapterLaneTemplateProductionRelapseReview,
    defaultFiveChapterLaneTemplateProductionRelapseChapterNos,
    defaultFiveChapterLaneTemplateProductionRelapseRestoreNos,
    defaultFiveChapterLaneTemplateProductionRelapseValidationNos,
    defaultFiveChapterLaneTemplateProductionFailureReasons,
    defaultFiveChapterLaneTemplateProductionFailedRequirements,
  }
}
