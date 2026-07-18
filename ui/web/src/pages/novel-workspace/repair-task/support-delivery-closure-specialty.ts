import {
  type AnyRecord,
  firstText,
  objectValue,
} from './utils'
import {
  repairTaskIssueType,
} from './support'
import {
  normalizeDeliveryRiskContext,
  qualityContractClosurePlan,
} from './support-normalize'
import {
  deterministicProseCleanupResidualsFromQuality,
  qualityContractResidualsFromQuality,
} from './quality-contract'
import {
  sourceReadinessResidualsFromQuality,
  stateTrackingResidualsFromQuality,
} from './support-normalize-repairs'

type ClosurePlan = {
  taskStatus: string
  annotationStatus: string
  annotationKey: string
  note: string
}

/** Specialty quality-domain closure plans (source readiness through reader retention). */
import { tryBuildSpecialtyQualityClosurePlanA } from './support-delivery-closure-specialty-a'
import { tryBuildSpecialtyQualityClosurePlanB } from './support-delivery-closure-specialty-b'
import { tryBuildSpecialtyQualityClosurePlanC } from './support-delivery-closure-specialty-c'

export function tryBuildSpecialtyQualityClosurePlan(
  task: AnyRecord,
  revisionResult: AnyRecord = {},
): ClosurePlan | null {
  return (
    tryBuildSpecialtyQualityClosurePlanA(task, revisionResult)
    ?? tryBuildSpecialtyQualityClosurePlanB(task, revisionResult)
    ?? tryBuildSpecialtyQualityClosurePlanC(task, revisionResult)
  )
}
