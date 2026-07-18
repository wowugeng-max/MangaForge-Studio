export type {
  NovelWritingRecommendedActionKey,
  NovelDeliveryActionKey,
  NovelWritingRecommendation,
  NovelWritingResponsibility,
  NovelDeliverySummaryInput,
  NovelDeliverySummary,
  NovelDraftBriefActionKey,
  NovelPreDraftBrief,
  NovelDraftBriefSummary,
} from './writing-recommendation-types'

export {
  buildNovelDraftBriefSummary,
} from './writing-recommendation-draft-brief'

export {
  buildNovelWritingRecommendation,
  buildNovelWritingResponsibility,
  buildNovelDeliverySummary,
} from './writing-recommendation-core'
