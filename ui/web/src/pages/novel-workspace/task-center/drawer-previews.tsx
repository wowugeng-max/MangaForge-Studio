import React from 'react'
import { Button, Space, Tag, Typography } from 'antd'

/** Task-center repair-task preview blocks for drawer rows. */

import {
  buildNextChapterQualityPlanPreview,
  compactEvidenceText,
} from './drawer-model'
import type {
  RecoveryEvidenceReviewActionFeedback,
  RecoveryEvidenceReviewRow,
  RecoveryEvidenceReviewRowAction,
} from './drawer-recovery-evidence'
import {
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceReviewActionFeedbackKey,
  buildRecoveryEvidenceReviewResolvedFeedback,
  buildRecoveryEvidenceReviewRowAction,
  buildRecoveryEvidenceReviewRows,
} from './drawer-recovery-evidence'

const { Text } = Typography

function deliveryRiskEvidenceLines(task: any) {
  if (String(task?.source || '') !== 'review_annotation_risk') return []
  const payload = task.payload && typeof task.payload === 'object' ? task.payload : {}
  const rows = [
    ['漏推', payload.missed],
    ['额外推进', payload.unplanned],
    ['禁揭', payload.forbidden_touched || payload.forbiddenTouched],
    ['核心', payload.drift_risks || payload.risks],
    ['出戏', payload.meme_sense?.immersion_risks || payload.immersion_risks || payload.issues],
  ]
  return rows
    .flatMap(([label, value]: any[]) => Array.isArray(value)
      ? value.slice(0, 2).map(item => `${label}：${compactEvidenceText(item)}`)
      : [])
    .filter(Boolean)
    .slice(0, 4)
}

export function BatchPlanReviewPreview({ task }: { task: any }) {
  const batchPlanReview = task.batch_plan_review || task.batchPlanReview || null
  const planned = Array.isArray(batchPlanReview?.planned) ? batchPlanReview.planned : []
  const actualRisks = Array.isArray(batchPlanReview?.actual_risks) ? batchPlanReview.actual_risks : []
  if (!planned.length && !actualRisks.length) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #ede9fe', borderRadius: 6, background: '#faf5ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>计划/实际</Text>
        {planned.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            计划：{planned.slice(0, 2).join('；')}
          </Text>
        )}
        {actualRisks.length > 0 && (
          <Text type="danger" style={{ fontSize: 12 }}>
            实际风险：{actualRisks.slice(0, 2).join('；')}
          </Text>
        )}
      </Space>
    </div>
  )
}

export function RecoveryEvidenceReviewPreview({
  task,
  taskIndex = 0,
  currentRun = null,
  runRecords = [],
  actionFeedbackByKey = {},
  onRecoveryEvidenceReviewRowAction,
}: {
  task: any
  taskIndex?: number
  currentRun?: any | null
  runRecords?: any[]
  actionFeedbackByKey?: Record<string, RecoveryEvidenceReviewActionFeedback>
  onRecoveryEvidenceReviewRowAction?: (row: RecoveryEvidenceReviewRow, rowAction: RecoveryEvidenceReviewRowAction) => void | Promise<void>
}) {
  const recoveryEvidenceReview = task.recovery_evidence_review || task.recoveryEvidenceReview || null
  const rows = buildRecoveryEvidenceReviewRows(task)
  const summary = String(recoveryEvidenceReview?.summary || '').trim()
  if (!rows.length && !summary) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>{isSingleChapterRecoveryEvidenceTask(task) ? '单章恢复依据复盘' : '恢复依据复盘'}</Text>
        {summary && (
          <Text type="danger" style={{ fontSize: 12 }}>
            复盘结论：{summary}
          </Text>
        )}
        {rows.slice(0, 4).map((item: any, index: number) => (
          <Space key={`${item.evidence}-${index}`} direction="vertical" size={2} style={{ width: '100%' }}>
            {(() => {
              const rowAction = buildRecoveryEvidenceReviewRowAction(item)
              const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
                task,
                rowAction,
                currentRun,
                runRecords,
                localFeedback: actionFeedbackByKey[buildRecoveryEvidenceReviewActionFeedbackKey(taskIndex, item, rowAction)] || null,
              })
              return (
                <>
                  {(item.sourceLabel || item.sourceDetail || item.sourceActionLabel) && (
              <Space wrap size={[4, 2]}>
                {item.sourceLabel && <Tag color="purple" bordered={false}>来源：{item.sourceLabel}</Tag>}
                {item.sourceDetail && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.sourceLabel && item.sourceDetail.startsWith(`${item.sourceLabel} · `)
                      ? item.sourceDetail.slice(item.sourceLabel.length + 3)
                      : item.sourceDetail}
                  </Text>
                )}
                {rowAction.action && onRecoveryEvidenceReviewRowAction ? (
                  <Button
                    size="small"
                    type="link"
                    icon={rowAction.action === 'recheck_single_chapter' || rowAction.action === 'recheck_safe_batch' || rowAction.action === 'review_governance_closure' ? <ReloadOutlined /> : undefined}
                    onClick={() => { void onRecoveryEvidenceReviewRowAction?.(item, rowAction) }}
                  >
                    {rowAction.label}
                  </Button>
                ) : item.sourceActionLabel ? (
                  <Tag color="blue" bordered={false}>下一步：{item.sourceActionLabel}</Tag>
                ) : null}
              </Space>
                  )}
                  {feedback && (
                    <Space direction="vertical" size={1} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{feedback.detail}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{feedback.closureCondition}</Text>
                    </Space>
                  )}
                </>
              )
            })()}
            <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{item.evidence}</Text>
            {item.riskLabels.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>对应风险：{item.riskLabels.slice(0, 3).join('；')}</Text>
            )}
          </Space>
        ))}
      </Space>
    </div>
  )
}

export function RecoveryEvidenceRegovernancePreview({ task }: { task: any }) {
  const summary = buildRecoveryEvidenceRegovernanceSummary(task)
  if (!summary) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space wrap size={[4, 2]}>
          <Text strong style={{ fontSize: 12 }}>{summary.label}</Text>
          <Tag color="purple" bordered={false}>队列 {summary.taskCount}</Tag>
          {summary.actionLabels.slice(0, 3).map(label => (
            <Tag key={label} color="gold" bordered={false}>{label}</Tag>
          ))}
        </Space>
        {summary.summary && (
          <Text type="secondary" style={{ fontSize: 12 }}>{summary.summary}</Text>
        )}
      </Space>
    </div>
  )
}

export function DeliveryRiskReviewPreview({ task }: { task: any }) {
  const evidence = deliveryRiskEvidenceLines(task)
  if (!evidence.length) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #fee2e2', borderRadius: 6, background: '#fff7ed' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>风险证据</Text>
        {evidence.map(item => (
          <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
        ))}
      </Space>
    </div>
  )
}

export function NextChapterQualityPlanPreview({ task }: { task: any }) {
  const preview = buildNextChapterQualityPlanPreview(task)
  if (!preview) return null
  const rows = [
    ['质量目标', preview.qualityFocus],
    ['开篇动作', preview.openingActions],
    ['中段动作', preview.middleActions],
    ['章末动作', preview.endingActions],
    ['禁用重复', preview.avoidRepetition],
    ['证据依据', preview.evidenceBasis],
  ].filter(([, values]) => Array.isArray(values) && values.length > 0) as [string, string[]][]
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #fde68a', borderRadius: 6, background: '#fffbeb' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space wrap size={[4, 2]}>
          <Text strong style={{ fontSize: 12 }}>{preview.label}</Text>
          <Tag color="gold" bordered={false}>下一章</Tag>
        </Space>
        {preview.missingReason && (
          <Text type="danger" style={{ fontSize: 12 }}>{preview.missingReason}</Text>
        )}
        {rows.map(([label, values]) => (
          <Text key={label} type="secondary" style={{ fontSize: 12 }}>
            {label}：{values.slice(0, 3).join('；')}
          </Text>
        ))}
      </Space>
    </div>
  )
}

export function SafeBatchExpansionSegmentPreview({ task }: { task: any }) {
  const review = task.safe_batch_expansion_segment_review || task.safeBatchExpansionSegmentReview || null
  const hotspots = Array.isArray(review?.hotspots) ? review.hotspots : []
  const rollback = review?.rollback_policy || review?.rollbackPolicy || null
  if (!hotspots.length && !rollback) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>扩批热区</Text>
        {hotspots.slice(0, 3).map((hotspot: any) => (
          <Text key={`${hotspot.key}-${hotspot.chapter_nos?.join?.('-') || hotspot.label}`} type="secondary" style={{ fontSize: 12 }}>
            {hotspot.label || '热区'}：第{(hotspot.chapter_nos || hotspot.chapterNos || []).join('、')}章，风险 {hotspot.risk_count ?? hotspot.riskCount ?? 0} 项
          </Text>
        ))}
        {rollback?.summary && (
          <Text type="secondary" style={{ fontSize: 12 }}>回退：{rollback.summary}</Text>
        )}
      </Space>
    </div>
  )
}

export function repairTaskStatusTag(status?: string) {
  if (status === 'resolved') return <Tag color="green" bordered={false}>已处理</Tag>
  if (status === 'needs_review') return <Tag color="gold" bordered={false}>需复查</Tag>
  if (status === 'in_progress') return <Tag color="blue" bordered={false}>处理中</Tag>
  return <Tag bordered={false}>待处理</Tag>
}

