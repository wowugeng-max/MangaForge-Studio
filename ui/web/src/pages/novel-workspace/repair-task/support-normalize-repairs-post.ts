import type { AnyRecord } from './utils'
import {
  arrayValue,
  firstText,
  objectValue,
  text,
} from './utils'

export function normalizePostBatchQualityRepair(task: AnyRecord) {
  const raw = objectValue(task.post_batch_quality_check || task.postBatchQualityCheck)
  if (!Object.keys(raw).length && firstText(task.issue_type, task.issueType) !== 'post_batch_quality_warning') return null
  const checks = arrayValue(raw.checks)
    .map(item => objectValue(item))
    .map(item => {
      const status = firstText(item.status).toLowerCase()
      const warnCount = Number(item.warn_count ?? item.warnCount ?? 0)
      const unknownCount = Number(item.unknown_count ?? item.unknownCount ?? 0)
      const isWarning = warnCount > 0 || unknownCount > 0 || ['warn', 'warning', 'failed', 'error', 'unknown'].includes(status)
      return {
        key: firstText(item.key),
        label: firstText(item.label, item.key, '批次质检'),
        status,
        warnCount: warnCount || (isWarning ? 1 : 0),
        checkedCount: Number(item.checked_count ?? item.checkedCount ?? 0) || 0,
        summaries: arrayValue(item.summaries).map(summary => text(summary)).filter(Boolean),
        isWarning,
      }
    })
    .filter(item => item.isWarning)
  const chapterNos = arrayValue(raw.chapter_nos || raw.chapterNos)
    .map(chapterNo => Number(chapterNo))
    .filter(chapterNo => chapterNo > 0)
  const hasContent = checks.length > 0
    || firstText(raw.source)
    || firstText(raw.status)
    || firstText(task.message)
  if (!hasContent) return null
  return {
    source: firstText(raw.source),
    status: firstText(raw.status),
    chapterNos,
    averageScore: raw.average_score ?? raw.averageScore ?? null,
    revisedCount: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    checks,
  }
}

export function normalizePostDeliveryQualityRepair(task: AnyRecord) {
  const raw = objectValue(task.post_delivery_quality || task.postDeliveryQuality)
  if (!Object.keys(raw).length) return null
  const check = objectValue(
    raw.check
      || arrayValue(raw.checks).find((item: any) => {
        const status = firstText(item?.status).toLowerCase()
        const warnCount = Number(item?.warn_count ?? item?.warnCount ?? 0) || 0
        const unknownCount = Number(item?.unknown_count ?? item?.unknownCount ?? 0) || 0
        return status !== 'ok' || warnCount > 0 || unknownCount > 0
      })
      || raw.checks?.[0],
  )
  const summaries = [
    ...arrayValue(check.summaries).map(item => text(item)),
    firstText(check.summary, check.message, check.reason, check.detail, task.message),
  ].filter(Boolean)
  const acceptanceCriteria = arrayValue(task.acceptance_criteria || task.acceptanceCriteria)
    .map(item => text(item))
    .filter(Boolean)
  const checkKey = firstText(check.key, task.annotation_category, task.annotationCategory, task.issue_type, task.issueType)
  const checkLabel = firstText(check.label, checkKey, '交付后质检项')
  const hasContent = firstText(raw.source, raw.status, task.message, task.action)
    || checkKey
    || summaries.length > 0
    || acceptanceCriteria.length > 0
  if (!hasContent) return null
  return {
    source: firstText(raw.source),
    status: firstText(raw.status),
    score: raw.score ?? raw.review_score ?? raw.reviewScore ?? null,
    chapterNo: Number(raw.chapter_no ?? raw.chapterNo ?? task.chapter_no ?? task.chapterNo ?? 0) || null,
    checkKey,
    checkLabel,
    checkStatus: firstText(check.status),
    warnCount: Number(check.warn_count ?? check.warnCount ?? 0) || 0,
    unknownCount: Number(check.unknown_count ?? check.unknownCount ?? 0) || 0,
    summaries,
    action: firstText(task.action),
    acceptanceCriteria,
  }
}

export function normalizePostDeliveryQualityClosureResult(task: AnyRecord, revisionResult: AnyRecord) {
  const target = normalizePostDeliveryQualityRepair(task)
  const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
  const qualityReview = objectValue(quality.review)
  const raw = objectValue(
    revisionResult.post_delivery_quality
      || revisionResult.postDeliveryQuality
      || quality.post_delivery_quality
      || quality.postDeliveryQuality
      || qualityReview.post_delivery_quality
      || qualityReview.postDeliveryQuality,
  )
  if (!Object.keys(raw).length) {
    return {
      cleared: false,
      residuals: ['post_delivery_quality 未返回'],
    }
  }
  const rawChecks = [
    ...arrayValue(raw.checks),
    raw.check,
  ].filter(Boolean).map(item => objectValue(item))
  if (rawChecks.length === 0) {
    return {
      cleared: false,
      residuals: ['post_delivery_quality.checks 未返回'],
    }
  }
  const targetKey = firstText(target?.checkKey)
  const targetLabel = firstText(target?.checkLabel)
  const residuals = rawChecks
    .map(check => {
      const status = firstText(check.status).toLowerCase()
      const warnCount = Number(check.warn_count ?? check.warnCount ?? 0) || 0
      const unknownCount = Number(check.unknown_count ?? check.unknownCount ?? 0) || 0
      const failCount = Number(check.fail_count ?? check.failCount ?? check.failed_count ?? check.failedCount ?? 0) || 0
      const errorCount = Number(check.error_count ?? check.errorCount ?? 0) || 0
      const badStatus = status && status !== 'ok' && status !== 'pass' && status !== 'passed'
      if (!badStatus && warnCount <= 0 && unknownCount <= 0 && failCount <= 0 && errorCount <= 0) return ''
      const label = firstText(check.label, check.key, targetLabel, targetKey, '交付后质检项')
      const summary = firstText(
        ...arrayValue(check.summaries).map(summaryItem => text(summaryItem)),
        check.summary,
        check.message,
        check.reason,
        check.detail,
        status,
      )
      const countText = [
        warnCount > 0 ? `warn ${warnCount}` : '',
        unknownCount > 0 ? `unknown ${unknownCount}` : '',
        failCount > 0 ? `fail ${failCount}` : '',
        errorCount > 0 ? `error ${errorCount}` : '',
      ].filter(Boolean).join('，')
      return `${label}${countText ? `（${countText}）` : ''}${summary ? `：${summary}` : ''}`
    })
    .filter(Boolean)
  const status = firstText(raw.status).toLowerCase()
  if (status && status !== 'ok') residuals.unshift(`post_delivery_quality.status=${status}`)
  if (!status) residuals.unshift('post_delivery_quality.status 缺失')

  return {
    cleared: residuals.length === 0,
    residuals: residuals.length > 0 ? residuals : ['仍需人工复查'],
  }
}

export function normalizePostBatchQualityClosureResult(revisionResult: AnyRecord) {
  const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
  const qualityReview = objectValue(quality.review)
  const raw = objectValue(
    revisionResult.post_batch_quality_check
      || revisionResult.postBatchQualityCheck
      || quality.post_batch_quality_check
      || quality.postBatchQualityCheck
      || qualityReview.post_batch_quality_check
      || qualityReview.postBatchQualityCheck,
  )
  if (!Object.keys(raw).length) {
    return {
      cleared: false,
      residuals: ['post_batch_quality_check 未返回'],
    }
  }

  const status = firstText(raw.status).toLowerCase()
  const rawChecks = arrayValue(raw.checks).map(item => objectValue(item))
  if (rawChecks.length === 0) {
    return {
      cleared: false,
      residuals: ['post_batch_quality_check.checks 未返回'],
    }
  }
  const residuals = rawChecks
    .map(item => {
      const checkStatus = firstText(item.status).toLowerCase()
      const warnCount = Number(item.warn_count ?? item.warnCount ?? 0) || 0
      const unknownCount = Number(item.unknown_count ?? item.unknownCount ?? 0) || 0
      const failCount = Number(item.fail_count ?? item.failCount ?? item.failed_count ?? item.failedCount ?? 0) || 0
      const errorCount = Number(item.error_count ?? item.errorCount ?? 0) || 0
      const badStatus = ['warn', 'warning', 'failed', 'fail', 'error', 'unknown'].includes(checkStatus)
      if (!badStatus && warnCount <= 0 && unknownCount <= 0 && failCount <= 0 && errorCount <= 0) return ''
      const label = firstText(item.label, item.key, '批次质检')
      const summary = firstText(
        ...arrayValue(item.summaries).map(summaryItem => text(summaryItem)),
        item.summary,
        item.message,
        item.reason,
        item.detail,
        checkStatus,
      )
      const countText = [
        warnCount > 0 ? `warn ${warnCount}` : '',
        unknownCount > 0 ? `unknown ${unknownCount}` : '',
        failCount > 0 ? `fail ${failCount}` : '',
        errorCount > 0 ? `error ${errorCount}` : '',
      ].filter(Boolean).join('，')
      return `${label}${countText ? `（${countText}）` : ''}${summary ? `：${summary}` : ''}`
    })
    .filter(Boolean)

  if (status && status !== 'ok') residuals.unshift(`post_batch_quality_check.status=${status}`)
  if (!status) residuals.unshift('post_batch_quality_check.status 缺失')

  return {
    cleared: residuals.length === 0,
    residuals: residuals.length > 0 ? residuals : ['仍需人工复查'],
  }
}

