type DurableTask = Record<string, unknown>

function durableTask(value: unknown): DurableTask {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as DurableTask
    : {}
}

function durableText(task: DurableTask, snakeKey: string, camelKey = ''): string {
  for (const key of [snakeKey, camelKey]) {
    if (!key) continue
    const value = String(task[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function hasDurablePayload(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length)
}

export function requiredEditorRevisionTaskAnnotationKey(taskValue: unknown, taskStatus: unknown): string {
  if (String(taskStatus || '').trim() !== 'resolved') return ''

  const task = durableTask(taskValue)
  const annotationKey = durableText(task, 'annotation_key', 'annotationKey')
  if (!annotationKey) return ''

  const issueType = durableText(task, 'issue_type', 'issueType')
  const source = durableText(task, 'source')
  const decisionKey = durableText(task, 'decision_key', 'decisionKey')
  const postDeliveryQuality = task.post_delivery_quality ?? task.postDeliveryQuality
  const annotationlessResolvedClosure = source === 'storyline_diff_decision'
    || Boolean(decisionKey)
    || issueType === 'recovery_evidence_mismatch'
    || issueType === 'post_batch_quality_warning'
    || hasDurablePayload(postDeliveryQuality)

  return annotationlessResolvedClosure ? '' : annotationKey
}
