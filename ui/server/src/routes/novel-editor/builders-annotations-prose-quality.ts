import {
  appendProseQualityAudienceAnnotations,
} from './builders-annotations-prose-quality-audience'
import {
  appendProseQualityCoreAnnotations,
} from './builders-annotations-prose-quality-core'
import {
  appendProseQualityCraftAnnotations,
} from './builders-annotations-prose-quality-craft'

export type { ProseQualityAnnotationContext } from './builders-annotations-prose-quality-types'

export function appendProseQualityReviewAnnotations(args: {
  review: any
  payload: any
  items: any[]
  statuses: any
  resolveChapter: (payload: any) => any
  pushReviewIssues: (review: any, payload: any, issueList: any[], defaults?: any) => void
  pushDeliveryRiskAnnotation: (review: any, payload: any, config: any) => void
}) {
  const { review, payload } = args
  if (review.review_type !== 'prose_quality') return
  const reviewPayload = payload.self_check?.review || payload.review || {}
  const ctx = { ...args, reviewPayload }
  appendProseQualityCoreAnnotations(ctx)
  appendProseQualityCraftAnnotations(ctx)
  appendProseQualityAudienceAnnotations(ctx)
}

export {
  appendProseQualityAudienceAnnotations,
  appendProseQualityCoreAnnotations,
  appendProseQualityCraftAnnotations,
}
