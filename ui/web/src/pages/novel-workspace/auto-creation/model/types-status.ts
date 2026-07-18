import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'


export type AnyRecord = Record<string, any>

export type AutoCreationDirectorStatus =
  | 'blocked'
  | 'needs_governance'
  | 'needs_acceptance'
  | 'ready'
  | 'running'

export type AutoCreationDirectorArea = 'planning' | 'writing' | 'assets' | 'quality' | 'ops'

export type AutoCreationDirectorActionKey =
  | PlanningActionKey
  | WritingCockpitActionKey
  | 'open_task_center'
  | 'open_story_assets'
  | 'review_governance_closure'
  | 'start_safe_batch_generation'
  | 'create_safe_batch_risk_repair'
  | 'create_style_sample_batch_repair'
  | 'create_recovery_evidence_governance_queue'
  | 'create_delivery_risk_repair'
  | 'create_script_room_repair'
  | 'auto_repair_blockers'
  | 'select_model'

export type AutoCreationPipelineStatus = 'done' | 'active' | 'pending' | 'blocked' | 'warning'
export type AutoCreationContractStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchGuardrailStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationBatchGuardrailSignalStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchReviewStatus = 'empty' | 'ok' | 'warn' | 'risk' | 'done'
export type AutoCreationBatchReviewItemStatus = 'success' | 'failed'
export type AutoCreationBatchRiskStatus = 'ok' | 'warn'
export type AutoCreationBatchCompletionStatus = 'empty' | 'in_progress' | 'needs_repair' | 'ready_next'
export type AutoCreationBatchCompletionMetricStatus = 'ok' | 'warn' | 'block'
export type AutoCreationBatchHandoffStatus = 'empty' | 'failed' | 'deliver_chapters' | 'repair_risks' | 'continue_batch' | 'prepare_next'
export type AutoCreationChapterLaunchGateStatus = 'ready' | 'warn' | 'blocked'
export type AutoCreationLongformCapacityStatus = 'ready' | 'caution' | 'blocked'
export type AutoCreationDeliveryRiskGateStatus = 'ok' | 'warn' | 'block'
export type AutoCreationManualTestReadinessStatus = 'ready' | 'needs_calibration' | 'blocked'
export type AutoCreationDailyBattleStepKey = 'clear_risks' | 'fuel_materials' | 'chapter_work' | 'batch_release'
export type AutoCreationRollingScriptRoomStatus = 'ready' | 'needs_attention' | 'blocked'
export type AutoCreationRollingScriptLayerKey = 'current_chapter' | 'next_10' | 'future_100' | 'current_volume' | 'book_compass'
export type AutoCreationMillionWordRunwayStatus = 'ready' | 'single_chapter' | 'blocked'
export type AutoCreationProductionLicenseStatus = 'blocked' | 'single_chapter' | 'batch_allowed'

