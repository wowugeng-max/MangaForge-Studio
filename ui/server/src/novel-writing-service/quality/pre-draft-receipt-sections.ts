export function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function preDraftExecutionReceiptSections(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const receiptSources = uniqueObjectReferences([
    review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts,
    selfCheck?.oh_story_delivery_receipts || selfCheck?.ohStoryDeliveryReceipts,
    payload?.oh_story_delivery_receipts || payload?.ohStoryDeliveryReceipts,
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    payload?.pre_draft_execution_receipts || payload?.preDraftExecutionReceipts,
    ...receiptSources.map((source) => source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts),
  ])
}
