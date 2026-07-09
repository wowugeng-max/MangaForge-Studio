type FormatIssue = (issue: any) => any
type StringifyPayload = (payload: any) => string

export type ProseQualityReviewPayloadInput = {
  chapterId: any
  contextPackage: any
  editorRewrite: any
  memePolish: any
  readabilityReview: any
  selfCheck: any
  qualityGate: any
  postDraftDirectorPayload?: Record<string, any>
  productionMode: any
  configSnapshot: any
  referenceReport?: any
  safetyDecision?: any
  safetyExplanation?: any
  migrationAudit?: any
  approvalType?: any
}

export type ProseQualityReviewRecordInput = {
  projectId: any
  status: string
  summarySuffix?: string
  selfCheck: any
  formatIssue: FormatIssue
  stringifyPayload: StringifyPayload
  payload: ProseQualityReviewPayloadInput
}

function appendIfDefined(target: Record<string, any>, key: string, value: any) {
  if (value !== undefined) target[key] = value
}

export function buildProseQualityReviewPayload(input: ProseQualityReviewPayloadInput) {
  const payload: Record<string, any> = {
    chapter_id: input.chapterId,
    context_package: input.contextPackage,
    editor_rewrite: input.editorRewrite,
    meme_polish: input.memePolish,
    readability_review: input.readabilityReview,
    self_check: input.selfCheck,
  }
  appendIfDefined(payload, 'reference_report', input.referenceReport)
  appendIfDefined(payload, 'safety_decision', input.safetyDecision)
  appendIfDefined(payload, 'safety_explanation', input.safetyExplanation)
  appendIfDefined(payload, 'migration_audit', input.migrationAudit)
  payload.quality_gate = input.qualityGate
  appendIfDefined(payload, 'approval_type', input.approvalType)
  Object.assign(payload, input.postDraftDirectorPayload || {})
  payload.production_mode = input.productionMode
  payload.config_snapshot = input.configSnapshot
  return payload
}

export function buildProseQualityReviewRecord(input: ProseQualityReviewRecordInput) {
  const review = input.selfCheck?.review || {}
  const suffix = input.summarySuffix ? `，${input.summarySuffix}` : ''
  return {
    project_id: input.projectId,
    review_type: 'prose_quality',
    status: input.status,
    summary: `章节群质检评分 ${review?.score ?? '-'}${suffix}`,
    issues: Array.isArray(review?.issues) ? review.issues.map(input.formatIssue) : [],
    payload: input.stringifyPayload(buildProseQualityReviewPayload(input.payload)),
  }
}
