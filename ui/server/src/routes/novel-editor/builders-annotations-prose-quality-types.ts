export type ProseQualityAnnotationContext = {
  review: any
  payload: any
  items: any[]
  statuses: any
  resolveChapter: (payload: any) => any
  pushReviewIssues: (review: any, payload: any, issueList: any[], defaults?: any) => void
  pushDeliveryRiskAnnotation: (review: any, payload: any, config: any) => void
  reviewPayload: any
}
