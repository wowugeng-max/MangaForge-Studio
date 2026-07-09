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

type ReceiptSyncReviewRecordInput = BaseReviewInput & {
  sync: any
  reviewType: string
  payloadKey: string
}

type PostDeliverySyncReviewRecordInput = ReceiptSyncReviewRecordInput & {
  issuePrefix?: string
  formatIssue?: (item: any) => string
  formatIssues?: (sync: any) => string[]
}

type AssetIntakeReviewRecordInput = BaseReviewInput & {
  discoveredAssets: any[]
}

type IpSceneIntakeReviewRecordInput = BaseReviewInput & {
  ipSceneCandidates: any[]
}

type StorylineSyncReviewRecordInput = BaseReviewInput & {
  storylineSync: any
}

type StoryStateReviewRecordInput = BaseReviewInput & {
  payload: any
}

function reviewStatus(sync: any) {
  return sync?.status === 'ok' ? 'ok' : 'warn'
}

function syncSummary(sync: any) {
  return `${sync?.label}：${sync?.summary}`
}

function chapterPayload(chapter: any, key: string, sync: any) {
  return JSON.stringify({
    chapter_id: chapter?.id,
    chapter_no: chapter?.chapter_no,
    [key]: sync,
  })
}

function defaultIssueText(input: PostDeliverySyncReviewRecordInput, item: any) {
  return `${input.issuePrefix || '同步缺口'}：${item?.label}｜${item?.text || item?.expected}`
}

export function buildPostDeliverySyncReviewRecord(input: PostDeliverySyncReviewRecordInput): ReviewRecord {
  const sync = input.sync || {}
  const issues = input.formatIssues
    ? input.formatIssues(sync)
    : (sync.missed || []).map((item: any) => input.formatIssue ? input.formatIssue(item) : defaultIssueText(input, item))
  return {
    project_id: input.projectId,
    review_type: input.reviewType,
    status: reviewStatus(sync),
    summary: syncSummary(sync),
    issues: issues.slice(0, 20),
    payload: chapterPayload(input.chapter, input.payloadKey, sync),
  }
}

export function buildAssetIntakeReviewRecord(input: AssetIntakeReviewRecordInput): ReviewRecord | null {
  const discoveredAssets = input.discoveredAssets || []
  if (discoveredAssets.length <= 0) return null
  return {
    project_id: input.projectId,
    review_type: 'asset_intake',
    status: 'pending',
    summary: `发现 ${discoveredAssets.length} 个新资产待确认`,
    issues: discoveredAssets.map((item: any) => `${item.entity_type}：${item.name}`),
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      discovered_assets: discoveredAssets,
      applied_asset_names: [],
    }),
  }
}

export function buildIpSceneIntakeReviewRecord(input: IpSceneIntakeReviewRecordInput): ReviewRecord | null {
  const ipSceneCandidates = input.ipSceneCandidates || []
  if (ipSceneCandidates.length <= 0) return null
  return {
    project_id: input.projectId,
    review_type: 'ip_scene_intake',
    status: 'ok',
    summary: `沉淀 ${ipSceneCandidates.length} 个 IP 场面候选`,
    issues: ipSceneCandidates.map((item: any) => item.title),
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      ip_scene_candidates: ipSceneCandidates,
    }),
  }
}

export function buildStorylineSyncReviewRecord(input: StorylineSyncReviewRecordInput): ReviewRecord {
  const storylineSync = input.storylineSync || {}
  const missed = storylineSync.missed || []
  const unplanned = storylineSync.unplanned || []
  const forbiddenTouched = storylineSync.forbidden_touched || []
  return {
    project_id: input.projectId,
    review_type: 'storyline_sync',
    status: storylineSync.status === 'warn' ? 'warn' : 'ok',
    summary: storylineSync.status === 'warn'
      ? `剧情线同步存在风险：漏推 ${missed.length}，额外推进 ${unplanned.length}，禁揭风险 ${forbiddenTouched.length}`
      : '剧情线同步完成，无明显计划偏差',
    issues: [
      ...missed.map((item: any) => `漏推：${item.name}`),
      ...unplanned.map((item: any) => `额外推进：${item.name}`),
      ...forbiddenTouched.map((item: any) => `禁揭风险：${item.name}`),
    ],
    payload: chapterPayload(input.chapter, 'storyline_sync', storylineSync),
  }
}

export function buildStoryStateReviewRecord(input: StoryStateReviewRecordInput): ReviewRecord {
  return {
    project_id: input.projectId,
    review_type: 'story_state',
    status: 'ok',
    summary: `故事状态已更新至第${input.chapter?.chapter_no}章`,
    issues: [],
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      ...(input.payload || {}),
    }),
  }
}

export function buildReceiptSyncReviewRecord(input: ReceiptSyncReviewRecordInput): ReviewRecord | null {
  const sync = input.sync || {}
  if (Number(sync.receipt_count || 0) <= 0 && Number(sync.missed_count || 0) <= 0) return null
  return {
    project_id: input.projectId,
    review_type: input.reviewType,
    status: reviewStatus(sync),
    summary: syncSummary(sync),
    issues: (sync.missed || []).map((item: any) => `${item.label}：${item.text}`).slice(0, 20),
    payload: chapterPayload(input.chapter, input.payloadKey, sync),
  }
}

export function buildRevisionCascadeImpactSyncReviewRecord(input: BaseReviewInput & { sync: any }): ReviewRecord | null {
  const sync = input.sync || {}
  if (Number(sync.missed_count || 0) <= 0) return null
  return {
    project_id: input.projectId,
    review_type: 'revision_cascade_impact_sync',
    status: reviewStatus(sync),
    summary: syncSummary(sync),
    issues: (sync.missed || []).map((item: any) => `${item.target}：${item.text}`).slice(0, 20),
    payload: chapterPayload(input.chapter, 'revision_cascade_impact_sync', sync),
  }
}

export function buildRevisionScopeGuardSyncReviewRecord(input: BaseReviewInput & { selfCheck: any, sync: any }): ReviewRecord | null {
  const sync = input.sync || {}
  if (!input.selfCheck?.revised && Number(sync.missed_count || 0) <= 0) return null
  return {
    project_id: input.projectId,
    review_type: 'revision_scope_guard_sync',
    status: reviewStatus(sync),
    summary: syncSummary(sync),
    issues: (sync.missed || []).map((item: any) => `${item.label}：${item.text}`).slice(0, 20),
    payload: chapterPayload(input.chapter, 'revision_scope_guard_sync', sync),
  }
}

export function buildDeterministicProseCleanupReviewRecord(input: BaseReviewInput & {
  deterministicProseCleanup: any
  formatNormalization: any
  punctuationNormalization: any
  deslopTermNormalization?: any
  cleanupRepairFormatNormalization?: any
  cleanupRepairPunctuationNormalization?: any
  cleanupRepairDeslopTermNormalization?: any
}): ReviewRecord | null {
  const cleanup = input.deterministicProseCleanup || {}
  if (
    Number(cleanup.risk_count || 0) <= 0
    && !input.formatNormalization?.changed
    && !input.punctuationNormalization?.changed
    && !input.deslopTermNormalization?.changed
    && !input.cleanupRepairFormatNormalization?.changed
    && !input.cleanupRepairPunctuationNormalization?.changed
    && !input.cleanupRepairDeslopTermNormalization?.changed
  ) {
    return null
  }
  return {
    project_id: input.projectId,
    review_type: 'deterministic_prose_cleanup',
    status: reviewStatus(cleanup),
    summary: syncSummary(cleanup),
    issues: (cleanup.required_actions || []).slice(0, 20),
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      deterministic_prose_cleanup: cleanup,
      deterministic_format_normalization: input.formatNormalization,
      deterministic_punctuation_normalization: input.punctuationNormalization,
      deterministic_deslop_term_normalization: input.deslopTermNormalization,
      deterministic_cleanup_repair_format_normalization: input.cleanupRepairFormatNormalization,
      deterministic_cleanup_repair_punctuation_normalization: input.cleanupRepairPunctuationNormalization,
      deterministic_cleanup_repair_deslop_term_normalization: input.cleanupRepairDeslopTermNormalization,
    }),
  }
}
