type ReviewRecord = {
  project_id: any
  review_type: string
  status: string
  summary: string
  issues: string[]
  payload: string
}

type DraftSyncReviewRecordInput = {
  projectId: any
  chapter: any
  sync: any
  reviewType: string
  payloadKey: string
  issuePrefix?: string
  formatIssue?: (item: any) => string
  formatIssues?: (sync: any) => string[]
}

type SpecializedDraftSyncReviewRecordInput = Pick<DraftSyncReviewRecordInput, 'projectId' | 'chapter' | 'sync'>

function syncStatus(sync: any) {
  return sync?.status === 'ok' ? 'ok' : 'warn'
}

function defaultIssueText(input: DraftSyncReviewRecordInput, item: any) {
  return `${input.issuePrefix || '同步缺口'}：${item?.label}｜${item?.evidence || item?.text || item?.expected}`
}

export function buildDraftSyncReviewRecord(input: DraftSyncReviewRecordInput): ReviewRecord {
  const sync = input.sync || {}
  const issues = input.formatIssues
    ? input.formatIssues(sync)
    : (sync.missed || []).map((item: any) => input.formatIssue ? input.formatIssue(item) : defaultIssueText(input, item))
  return {
    project_id: input.projectId,
    review_type: input.reviewType,
    status: syncStatus(sync),
    summary: `${sync.label}：${sync.summary}`,
    issues: (sync.missed || []) && issues.slice(0, 20),
    payload: JSON.stringify({
      chapter_id: input.chapter?.id,
      chapter_no: input.chapter?.chapter_no,
      [input.payloadKey]: sync,
    }),
  }
}

export function buildPlotSpecialTopicsDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'plot_special_topics_sync',
    payloadKey: 'plot_special_topics_sync',
    formatIssue: item => `特殊题材缺口：${item.label}｜${item.text || item.expected}`,
  })
}

export function buildChapterAttractionDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'chapter_attraction_review',
    payloadKey: 'chapter_attraction_review',
    formatIssues: sync => (sync.weak_dimensions || []).map((item: any) => `${item.label}｜${item.issue}`),
  })
}

export function buildSceneCardReceiptsDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'scene_card_receipts_sync',
    payloadKey: 'scene_card_receipts_sync',
    formatIssue: item => `场景回执缺口：${item.label}｜${item.text || item.evidence}`,
  })
}

export function buildDeliveryRiskReceiptsDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'delivery_risk_receipts_sync',
    payloadKey: 'delivery_risk_receipts_sync',
    formatIssue: item => `交稿回执缺口：${item.risk_item}｜${item.required_action || item.remaining_risk}`,
  })
}

export function buildStyleSampleDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'style_sample_sync',
    payloadKey: 'style_sample_sync',
    formatIssues: sync => [
      ...(sync.missed || []).map((item: any) => `风格缺口：${item.label}｜${item.text}`),
      ...(sync.copied_phrases || []).map((item: any) => `照搬风险：${item}`),
    ],
  })
}

export function buildChapterTitleUniquenessDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'chapter_title_uniqueness_sync',
    payloadKey: 'chapter_title_uniqueness_sync',
    formatIssue: item => `标题重复：第${item.chapter_no || '-'}章《${item.title || ''}》`,
  })
}

export function buildChapterHandoffDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'chapter_handoff_sync',
    payloadKey: 'chapter_handoff_sync',
    formatIssue: item => `章首承接缺口：${item.label}｜${item.text || item.expected}`,
  })
}

export function buildReaderPayoffDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'reader_payoff_sync',
    payloadKey: 'reader_payoff_sync',
    formatIssues: sync => [
      ...(sync.missed || []).map((item: any) => `未兑现：${item.text}`),
      ...(sync.debts || []).map((item: any) => `待回收：${item.text}`),
    ],
  })
}

export function buildSignatureSceneDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord | null {
  if (Number(input.sync?.planned_count || 0) <= 0) return null
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'signature_scene_sync',
    payloadKey: 'signature_scene_sync',
    formatIssue: item => `未兑现：${item.label}｜${item.text}`,
  })
}

export function buildStoryUnitDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'story_unit_sync',
    payloadKey: 'story_unit_sync',
    formatIssues: sync => [
      ...(sync.missed || []).map((item: any) => `单元漏写：${item.label}｜${item.text}`),
      ...(sync.rushed_ahead || []).map((item: any) => `单元抢跑：${item.label}｜${item.text}`),
      ...(sync.forbidden_touched || []).map((item: any) => `禁抢跑：${item.label}｜${item.text}`),
    ],
  })
}

export function buildChapterCoreDriftDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'chapter_core_drift',
    payloadKey: 'core_drift',
    formatIssues: sync => sync.drift_risks || [],
  })
}

export function buildCoreContractDraftReviewRecord(input: SpecializedDraftSyncReviewRecordInput): ReviewRecord {
  return buildDraftSyncReviewRecord({
    ...input,
    reviewType: 'core_contract_sync',
    payloadKey: 'core_contract_sync',
    formatIssue: item => `核心契约缺口：${item.label}｜${item.text || item.expected}`,
  })
}
