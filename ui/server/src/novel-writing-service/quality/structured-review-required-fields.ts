import { STRUCTURED_REVIEW_REQUIRED_FIELDS_CORE } from './structured-review-required-fields-core'
import { STRUCTURED_REVIEW_REQUIRED_FIELDS_EXTENDED } from './structured-review-required-fields-extended'

export const STRUCTURED_REVIEW_REQUIRED_FIELDS: Record<string, string[]> = {
  ...STRUCTURED_REVIEW_REQUIRED_FIELDS_CORE,
  ...STRUCTURED_REVIEW_REQUIRED_FIELDS_EXTENDED,
}
