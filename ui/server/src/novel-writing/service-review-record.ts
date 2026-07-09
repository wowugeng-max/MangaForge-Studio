type ReviewRecord = {
  project_id: any
  review_type: string
  status: string
  summary: string
  issues: any[]
  payload: string
}

type BaseReviewInput = {
  projectId: any
  chapter: any
}

export function buildUnattendedPreflightRepairReviewRecord(input: BaseReviewInput & {
  missingKeys: any[]
  repaired: any[]
  errors: any[]
}): ReviewRecord {
  const repaired = input.repaired || []
  const errors = input.errors || []
  return {
    project_id: input.projectId,
    review_type: 'unattended_preflight_repair',
    status: errors.length ? 'warn' : 'ok',
    summary: `无人值守前置材料自动补齐 ${repaired.length} 项`,
    issues: errors,
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      missing_keys: input.missingKeys || [],
      repaired,
      errors,
    }),
  }
}

export function buildReadabilityReviewRecord(input: BaseReviewInput & {
  readabilityReview: any
  memePolish: any
  memeIntensityFallback: any
  formatIssue: (issue: any) => string
}): ReviewRecord {
  const readabilityReview = input.readabilityReview || {}
  return {
    project_id: input.projectId,
    review_type: 'readability_review',
    status: Number(readabilityReview.readability_score || 0) >= 78 ? 'ok' : 'warn',
    summary: `可读性 ${readabilityReview.readability_score || '-'}，网感${readabilityReview?.meme_sense?.intensity || input.memeIntensityFallback || '无'}`,
    issues: Array.isArray(readabilityReview?.issues) ? readabilityReview.issues.map(input.formatIssue) : [],
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      readability_review: readabilityReview,
      meme_polish: input.memePolish,
    }),
  }
}

export function buildSettingConsistencyReviewRecord(input: BaseReviewInput & {
  contextPackage: any
  selfCheck: any
}): ReviewRecord | null {
  const settingViolations = Array.isArray(input.selfCheck?.review?.setting_violations) ? input.selfCheck.review.setting_violations : []
  if (!input.contextPackage?.setting_context?.chapter_usage?.length && settingViolations.length <= 0) return null
  return {
    project_id: input.projectId,
    review_type: 'setting_consistency',
    status: settingViolations.length > 0 ? 'warn' : 'ok',
    summary: settingViolations.length > 0 ? `设定一致性发现 ${settingViolations.length} 项风险` : '设定一致性随章节质检通过',
    issues: settingViolations.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue.setting_name || issue.type || '设定风险'}`),
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      source: 'prose_quality_self_check',
      setting_context: input.contextPackage.setting_context,
      setting_violations: settingViolations,
      craft_metrics: input.selfCheck?.review?.craft_metrics || {},
    }),
  }
}
