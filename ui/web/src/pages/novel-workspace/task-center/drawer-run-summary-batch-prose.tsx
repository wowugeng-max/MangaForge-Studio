import React from 'react'
import { Tag, Typography, Card, Space } from 'antd'
import {
  parseJsonValue,
} from './chapter-group'
import type {
  RecoveryEvidenceAuditNextAction,
  RecoveryEvidenceReviewActionFeedback,
  RecoveryEvidenceReviewRefreshAnchor,
  RecoveryEvidenceReviewRow,
  RecoveryEvidenceReviewRowAction,
  SafeBatchDefaultFiveChapterLaneRedesignSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot,
  SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot,
  SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot,
  SafeBatchDefaultFiveChapterRegressionSnapshot,
  SafeBatchExpansionFeedbackSnapshot,
  SafeBatchExpansionPolicySnapshot,
  SafeBatchExpansionStructureDecisionTrendSnapshot,
  SafeBatchExpansionStructureRepairEffectivenessSnapshot,
  SafeBatchExpansionStructureValidationResultSnapshot,
  SafeBatchExpansionStructureValidationTrendSnapshot,
  SafeBatchRecoveryFocusSnapshot,
  SafeBatchRecoveryRestoreStabilityEvidenceSnapshot,
  SafeBatchRecoveryRestoreStabilityLaneSnapshot,
  SafeBatchRecoveryRoadmapNodeSnapshot,
  SafeBatchRecoveryRoadmapSnapshot,
  SafeBatchRecoveryValidationReviewCtaSnapshot,
  SafeBatchRecoveryValidationSnapshot,
  StrengthenedRepairAcceptanceTrendSnapshot,
} from './drawer-model'
import {
  BatchPlanReviewPreview,
  DeliveryRiskReviewPreview,
  NextChapterQualityPlanPreview,
  RecoveryEvidenceRegovernancePreview,
  RecoveryEvidenceReviewPreview,
  SafeBatchExpansionSegmentPreview,
  buildDefaultLaneRepairTaskTags,
  buildPostBatchQualityCheckSummary,
  buildProductionRelapseCtaExecutionSnapshot,
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRepairClosureHighlights,
  compactAuditList,
  compactChapterNos,
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeChapterNos,
  normalizeEvidenceTextList,
  recoveryEvidenceRegovernanceQueueOfTask,
  recoveryEvidenceTaskSourceMeta,
  repairTaskActionLabel,
  repairTaskIssueTag,
  repairTaskStatusTag,
  runTypeLabel,
  safeBatchRecoveryFocusMatchesTask,
  statusTag,
} from './drawer-model'

const { Text, Paragraph } = Typography
import {
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryRestoreStabilityLaneSnapshot,
  safeBatchExpansionFeedbackColor,
} from './drawer-snapshots'

export function BatchProseRunSummary({ run }: { run: any }) {
  const input = parseJsonValue(run.input_ref) || {}
  const output = parseJsonValue(run.output_ref) || {}
  const batchPreflight = input.batch_preflight || input.batchPreflight || null
  const productionRelapseCtaExecution = buildProductionRelapseCtaExecutionSnapshot(batchPreflight || input)
  const expansionPolicy = buildSafeBatchExpansionPolicySnapshot(batchPreflight)
  const recoveryEvidenceProfile = buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight)
  const recoveryEvidence = [
    ...(Array.isArray(batchPreflight?.recovery_evidence) ? batchPreflight.recovery_evidence : []),
    ...(Array.isArray(batchPreflight?.recoveryEvidence) ? batchPreflight.recoveryEvidence : []),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const failedChapters = chapters.filter((chapter: any) => chapter.status === 'failed')
  const successChapters = chapters.filter((chapter: any) => chapter.status === 'success')
  const avgScore = successChapters
    .map((chapter: any) => Number(chapter.score))
    .filter((score: number) => Number.isFinite(score))
  const scoreText = avgScore.length > 0
    ? Math.round(avgScore.reduce((sum: number, score: number) => sum + score, 0) / avgScore.length)
    : null
  const expansionFeedback = expansionPolicy?.expansionFeedback || null
  const expansionFeedbackChapterText = expansionFeedback?.latestChapterNos.length
    ? `第${expansionFeedback.latestChapterNos.join('、')}章`
    : ''
  const expansionStructureTrend = expansionFeedback?.structureValidationTrend || null
  const expansionStructureFailureReason = expansionStructureTrend?.failureReasons?.[0] || null
  const expansionStructureEffectiveness = expansionFeedback?.structureRepairEffectiveness || null
  const defaultRecoveryVerdictRelapseEffectiveness = expansionStructureEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend || null
  const expansionStructureDecisionTrend = expansionFeedback?.structureDecisionTrend || null
  const expansionStructureDecisionRequirement = expansionStructureDecisionTrend?.topFailedRequirement || null
  const defaultLaneRedesign = expansionStructureDecisionTrend?.defaultFiveChapterLaneRedesign || null
  const defaultLaneMissedRequirements = defaultLaneRedesign?.missedRequirements || []
  const defaultFiveChapterRegression = expansionFeedback?.defaultFiveChapterRegression || null
  const defaultRecoveryVerdictRelapse = expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse || null
  const defaultLaneTemplateStability = expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile || null
  const defaultLaneTemplateStabilityTop = defaultLaneTemplateStability?.topFailedRequirement
    || defaultLaneTemplateStability?.requirements.find(requirement => requirement.failedCount > 0)
    || null
  const defaultLaneTemplateVersion = defaultLaneTemplateStability?.latestTemplateVersionProfile || null
  const recoveryRestoreStability = expansionFeedback?.recoveryRestoreStabilityEvidence || null
  const recoveryRestoreStabilityLane = expansionPolicy?.recoveryRestoreStabilityLane
    || buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
      input.default_five_chapter_lane
        || input.defaultFiveChapterLane
        || input.recovery_restore_stability_evidence
        || input.recoveryRestoreStabilityEvidence,
      recoveryRestoreStability,
    )
  const recoveryRestoreReview = recoveryRestoreStabilityLane || recoveryRestoreStability
  const recoveryRestoreBatchText = recoveryRestoreReview?.restoreChapterNos.length
    ? `恢复批 ${compactChapterNos(recoveryRestoreReview.restoreChapterNos)}`
    : ''
  const recoveryRestoreValidationText = recoveryRestoreReview?.validationChapterNos.length
    ? `验证 ${compactChapterNos(recoveryRestoreReview.validationChapterNos)}`
    : ''
  const recoveryRestoreDecisionLabel = recoveryRestoreStabilityLane?.label
    || (recoveryRestoreStability && recoveryRestoreStability.stablePassStreak >= 2 ? '默认5章档位' : '继续观察 1-2 批')
  const recoveryRestoreSummary = recoveryRestoreStabilityLane?.summary
    || recoveryRestoreStability?.summary
    || '恢复 5 章后的稳定观察已沉淀，可继续作为扩批默认档位依据。'
  const defaultRegressionBatchText = defaultFiveChapterRegression?.defaultBatchChapterNos.length
    ? `失效批 ${compactChapterNos(defaultFiveChapterRegression.defaultBatchChapterNos)}`
    : ''
  const defaultRegressionRestoreText = defaultFiveChapterRegression?.restoreChapterNos.length
    ? `默认依据 ${compactChapterNos(defaultFiveChapterRegression.restoreChapterNos)}`
    : ''
  const defaultRegressionValidationText = defaultFiveChapterRegression?.validationChapterNos.length
    ? `前置验证 ${compactChapterNos(defaultFiveChapterRegression.validationChapterNos)}`
    : ''
  const recoveryRoadmap = expansionPolicy?.recoveryRoadmap || null
  const recoveryValidation = expansionPolicy?.recoveryValidation || null
  const defaultRecoveryVerdict = recoveryValidation?.defaultFiveChapterRecoveryVerdict || null
  const defaultLaneTemplateVerdict = recoveryValidation?.defaultFiveChapterLaneTemplateVerdict || null
  const defaultLaneTemplateProductionRelapse = defaultLaneTemplateVerdict?.productionRelapseVerdict || null
  const defaultLaneTemplateVersionProductionRelapse = defaultLaneTemplateVersion?.latestProductionRelapseVerdict || null

  return (
    <Card size="small" title="批量生成摘要">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>总计 {output.total ?? chapters.length} 章</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? successChapters.length} 章</Tag>
          <Tag color={failedChapters.length > 0 ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failedChapters.length} 章</Tag>
          {output.canceled && <Tag color="default" bordered={false}>已停止</Tag>}
          {Number(output.skipped || 0) > 0 && <Tag bordered={false}>未处理 {output.skipped} 章</Tag>}
          {scoreText !== null && <Tag color={scoreText >= 78 ? 'green' : 'gold'} bordered={false}>平均质检 {scoreText} 分</Tag>}
          <Tag bordered={false}>耗时 {run.duration_ms ? `${Math.round(Number(run.duration_ms) / 1000)}s` : '-'}</Tag>
        </Space>
        {productionRelapseCtaExecution?.visible && (
          <div style={{ padding: 8, border: '1px solid #c7d2fe', borderRadius: 6, background: '#eef2ff' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Tag color="purple" bordered={false}>{productionRelapseCtaExecution.label}</Tag>
                {productionRelapseCtaExecution.templateVersionId && (
                  <Tag bordered={false}>{productionRelapseCtaExecution.templateVersionId}</Tag>
                )}
                {productionRelapseCtaExecution.targetChapterCount > 0 && (
                  <Tag bordered={false}>目标 {productionRelapseCtaExecution.targetChapterCount} 章</Tag>
                )}
                {productionRelapseCtaExecution.clearedFailureReasons.slice(0, 3).map(reason => (
                  <Tag key={`cta-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                ))}
                {productionRelapseCtaExecution.remainingFailureReasons.slice(0, 3).map(reason => (
                  <Tag key={`cta-remaining-${reason}`} color="gold" bordered={false}>{reason}待修</Tag>
                ))}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{productionRelapseCtaExecution.summary}</Text>
            </Space>
          </div>
        )}
        {expansionPolicy?.visible && (
          <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{expansionPolicy.label}</Text>
                <Tag color={expansionPolicy.status === 'expanded' ? 'green' : 'blue'} bordered={false}>
                  目标 {expansionPolicy.targetChapterCount} 章
                </Tag>
                <Tag bordered={false}>连续 {expansionPolicy.passStreak}/{expansionPolicy.requiredPassStreak}</Tag>
                <Tag bordered={false}>通过 {expansionPolicy.acceptedBatchCount}</Tag>
                <Tag bordered={false}>未过 {expansionPolicy.failedBatchCount}</Tag>
              </Space>
              {recoveryRoadmap?.visible && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={recoveryRoadmap.currentTargetChapterCount >= 5 ? 'green' : recoveryRoadmap.currentTargetChapterCount <= 1 ? 'red' : 'blue'} bordered={false}>
                      {recoveryRoadmap.currentLaneLabel || `目标 ${recoveryRoadmap.currentTargetChapterCount} 章`}
                    </Tag>
                    {recoveryRoadmap.nextRepairLayer && (
                      <Tag color={recoveryRoadmap.nextRepairLayer.status === 'warn' ? 'gold' : 'default'} bordered={false}>
                        下一层 {recoveryRoadmap.nextRepairLayer.actionLabel || recoveryRoadmap.nextRepairLayer.label}
                      </Tag>
                    )}
                    {recoveryRoadmap.routeNodes.slice(0, 5).map(node => (
                      <Tag
                        key={node.key}
                        color={node.status === 'ok' ? 'green' : node.status === 'warn' ? 'gold' : 'default'}
                        bordered={false}
                      >
                        {node.label}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{recoveryRoadmap.currentReason}</Text>
                </Space>
              )}
              {recoveryValidation?.visible && (
                <div style={{ padding: 8, border: `1px solid ${recoveryValidation.status === 'passed' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 6, background: recoveryValidation.status === 'passed' ? '#f0fdf4' : '#fffdf3' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'gold'} bordered={false}>{recoveryValidation.label}</Tag>
                      {recoveryValidation.validationChapterNos.length > 0 && (
                        <Tag bordered={false}>第{recoveryValidation.validationChapterNos.join('、')}章</Tag>
                      )}
                      <Tag bordered={false}>风险 {recoveryValidation.riskCount}</Tag>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'blue'} bordered={false}>
                        下一步 {recoveryValidation.nextActionLabel}
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryValidation.summary}</Text>
                    {defaultRecoveryVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultRecoveryVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultRecoveryVerdict.label}
                          </Tag>
                          {defaultRecoveryVerdict.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`cleared-${reason}`} color="green" bordered={false}>{reason}已清零</Tag>
                          ))}
                          {defaultRecoveryVerdict.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`remaining-${reason}`} color="gold" bordered={false}>{reason}未清零</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultRecoveryVerdict.summary}</Text>
                      </Space>
                    )}
                    {defaultLaneTemplateVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.label}
                          </Tag>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.status === 'passed' ? '四项模板全过' : `缺项 ${defaultLaneTemplateVerdict.missingCount}`}
                          </Tag>
                          {defaultLaneTemplateVerdict.status === 'passed' && defaultLaneTemplateVerdict.requirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-pass-${requirement.key || requirement.label}`} color="green" bordered={false}>
                              {requirement.label}通过
                            </Tag>
                          ))}
                          {defaultLaneTemplateVerdict.missingRequirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-missing-${requirement.key || requirement.label}`} color="gold" bordered={false}>
                              {compactChapterNos(requirement.chapterNos)}缺{requirement.label}
                            </Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse && (
                            <Tag color={defaultLaneTemplateProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                              {defaultLaneTemplateProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                            </Tag>
                          )}
                          {defaultLaneTemplateProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateVerdict.summary}</Text>
                        {defaultLaneTemplateProductionRelapse?.summary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateProductionRelapse.summary}</Text>
                        )}
                      </Space>
                    )}
                  </Space>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>{expansionPolicy.summary}</Text>
              {expansionFeedback && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={safeBatchExpansionFeedbackColor(expansionFeedback.status)} bordered={false}>
                      {expansionFeedback.label}
                    </Tag>
                    {expansionFeedback.targetChapterCount > 0 && (
                      <Tag bordered={false}>反馈目标 {expansionFeedback.targetChapterCount} 章</Tag>
                    )}
                    {expansionFeedbackChapterText && (
                      <Tag bordered={false}>{expansionFeedbackChapterText}</Tag>
                    )}
                    {expansionFeedback.stablePassStreak > 0 && (
                      <Tag color="green" bordered={false}>稳定连过 {expansionFeedback.stablePassStreak}</Tag>
                    )}
                    {expansionFeedback.recentExpandedBatchCount > 1 && (
                      <Tag bordered={false}>观察 {expansionFeedback.recentExpandedBatchCount} 批</Tag>
                    )}
                    {expansionFeedback.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {expansionFeedback.repeatedHotspotSegment.label}复发 {expansionFeedback.repeatedHotspotSegment.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.visible && (
                      <Tag color={expansionStructureTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        验证通过率 {expansionStructureTrend.passRate}%
                      </Tag>
                    )}
                    {expansionStructureFailureReason && (
                      <Tag color="gold" bordered={false}>
                        失败主因 {expansionStructureFailureReason.label}{expansionStructureFailureReason.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.recurrenceAfterRestore.visible && (
                      <Tag color="gold" bordered={false}>
                        复发间隔 {expansionStructureTrend.recurrenceAfterRestore.intervalBatchCount}批
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag color={expansionStructureEffectiveness.status === 'ok' ? 'green' : 'gold'} bordered={false}>
                        {expansionStructureEffectiveness.status === 'ok' ? '结构修复有效' : '结构修复待观察'}
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag bordered={false}>
                        主因 {expansionStructureEffectiveness.baselineFailureReasonCount}{'->'}{expansionStructureEffectiveness.currentFailureReasonCount}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapseEffectiveness && (
                      <Tag color="gold" bordered={false}>
                        恢复判定连续失效 {defaultRecoveryVerdictRelapseEffectiveness.repeatedRelapseCount}
                      </Tag>
                    )}
                    {expansionStructureDecisionTrend?.visible && (
                      <Tag color={expansionStructureDecisionTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        结构决策{expansionStructureDecisionTrend.status === 'warn' ? '待补齐' : '已落地'}
                      </Tag>
                    )}
                    {expansionStructureDecisionRequirement && (
                      <Tag color="gold" bordered={false}>
                        漏项 {expansionStructureDecisionRequirement.label}{expansionStructureDecisionRequirement.count}
                      </Tag>
                    )}
                    {defaultLaneRedesign && (
                      <Tag color="gold" bordered={false}>默认档位模板漏项</Tag>
                    )}
                    {defaultLaneMissedRequirements.slice(0, 4).map(requirement => (
                      <Tag key={`default-lane-missed-${requirement.key}`} color="gold" bordered={false}>
                        缺{requirement.label}
                      </Tag>
                    ))}
                    {defaultLaneTemplateStability && (
                      <Tag color={defaultLaneTemplateStability.status === 'ready' ? 'green' : defaultLaneTemplateStability.status === 'redesign' || defaultLaneTemplateStability.status === 'relapsed' ? 'gold' : 'blue'} bordered={false}>
                        {defaultLaneTemplateStability.label}
                      </Tag>
                    )}
                    {defaultLaneTemplateStability && (
                      <Tag bordered={false}>
                        模板连过 {defaultLaneTemplateStability.passStreak}/{defaultLaneTemplateStability.requiredPassStreak}
                      </Tag>
                    )}
                    {defaultLaneTemplateStabilityTop && (
                      <Tag color="gold" bordered={false}>
                        {defaultLaneTemplateStabilityTop.label}失败 {defaultLaneTemplateStabilityTop.failedCount}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersion && (
                      <Tag color={defaultLaneTemplateVersion.status === 'ready' ? 'green' : defaultLaneTemplateVersion.status === 'relapsed' || defaultLaneTemplateVersion.status === 'redesign' ? 'gold' : 'blue'} bordered={false}>
                        模板版本连过 {defaultLaneTemplateVersion.passStreak || 0}/{defaultLaneTemplateVersion.requiredPassStreak || defaultLaneTemplateStability?.requiredPassStreak || 0}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse && (
                      <Tag color={defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                        {defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                    ))}
                    {defaultLaneTemplateVersionProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                    ))}
                    {recoveryRestoreReview && (
                      <Tag color="green" bordered={false}>长期扩批稳定证据</Tag>
                    )}
                    {recoveryRestoreStabilityLane && (
                      <Tag color="blue" bordered={false}>批次复盘筛选</Tag>
                    )}
                    {recoveryRestoreReview && (
                      <Tag color={recoveryRestoreStabilityLane?.defaultFiveChapterReady ? 'green' : undefined} bordered={false}>
                        {recoveryRestoreDecisionLabel}
                      </Tag>
                    )}
                    {defaultFiveChapterRegression && (
                      <Tag color="gold" bordered={false}>默认档位回退原因</Tag>
                    )}
                    {defaultFiveChapterRegression?.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {defaultFiveChapterRegression.repeatedHotspotSegment.label}复发
                      </Tag>
                    )}
                    {defaultFiveChapterRegression?.templateVersionId && (
                      <Tag color="gold" bordered={false}>
                        模板版本 {defaultFiveChapterRegression.templateVersionId}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapse && (
                      <Tag color="gold" bordered={false}>恢复判定失效</Tag>
                    )}
                    {defaultRecoveryVerdictRelapse?.relapsedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`relapse-${reason}`} color="gold" bordered={false}>{reason}复发</Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{expansionFeedback.summary}</Text>
                  {defaultLaneTemplateStability && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateStability.summary}</Text>
                  )}
                  {defaultRecoveryVerdictRelapse && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRecoveryVerdictRelapse.validationChapterNos.length > 0 && (
                          <Tag bordered={false}>清零验证 {compactChapterNos(defaultRecoveryVerdictRelapse.validationChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.relapseBatchChapterNos.length > 0 && (
                          <Tag color="gold" bordered={false}>复发批 {compactChapterNos(defaultRecoveryVerdictRelapse.relapseBatchChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.repeatedHotspotSegment && (
                          <Tag color="gold" bordered={false}>{defaultRecoveryVerdictRelapse.repeatedHotspotSegment.label}风险 {defaultRecoveryVerdictRelapse.repeatedHotspotSegment.riskCount}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultRecoveryVerdictRelapse.summary || '恢复判定失效，需要回到 3 章验证批重新证明核心、回报和追读稳定。'}
                      </Text>
                    </Space>
                  )}
                  {defaultFiveChapterRegression && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRegressionBatchText && <Tag color="gold" bordered={false}>{defaultRegressionBatchText}</Tag>}
                        {defaultRegressionRestoreText && <Tag bordered={false}>{defaultRegressionRestoreText}</Tag>}
                        {defaultRegressionValidationText && <Tag bordered={false}>{defaultRegressionValidationText}</Tag>}
                        <Tag color="green" bordered={false}>
                          原稳定 {defaultFiveChapterRegression.stablePassStreak}/{defaultFiveChapterRegression.requiredStablePassStreak}
                        </Tag>
                        {defaultFiveChapterRegression.failureReasons.slice(0, 3).map(reason => (
                          <Tag key={reason} color="gold" bordered={false}>{reason}</Tag>
                        ))}
                        {defaultFiveChapterRegression.templateVersionFailedRequirements.slice(0, 3).map(requirement => (
                          <Tag key={`template-version-${requirement.key || requirement.failureReason}`} color="gold" bordered={false}>
                            {requirement.label || requirement.failureReason}
                          </Tag>
                        ))}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultFiveChapterRegression.summary || '默认 5 章档位出现复发，需要回到 3 章验证批或扩批结构修复层。'}
                      </Text>
                    </Space>
                  )}
                  {recoveryRestoreReview && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {recoveryRestoreStabilityLane && (
                          <Tag color="blue" bordered={false}>{recoveryRestoreStabilityLane.taskCenterFilterLabel}</Tag>
                        )}
                        {recoveryRestoreBatchText && <Tag bordered={false}>{recoveryRestoreBatchText}</Tag>}
                        {recoveryRestoreValidationText && <Tag bordered={false}>{recoveryRestoreValidationText}</Tag>}
                        {recoveryRestoreStabilityLane ? (
                          <Tag color="green" bordered={false}>
                            稳定连过 {recoveryRestoreStabilityLane.stablePassStreak}/{recoveryRestoreStabilityLane.requiredStablePassStreak}
                          </Tag>
                        ) : (
                          <Tag color="green" bordered={false}>稳定连过 {recoveryRestoreReview.stablePassStreak}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {recoveryRestoreSummary}
                      </Text>
                    </Space>
                  )}
                  {expansionStructureTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureTrend.summary}</Text>
                  )}
                  {expansionStructureEffectiveness?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureEffectiveness.summary}</Text>
                  )}
                  {expansionStructureDecisionTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureDecisionTrend.summary}</Text>
                  )}
                  {defaultLaneRedesign && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {defaultLaneRedesign.summary}
                      {defaultLaneRedesign.relapseCount > 0 ? ` 连续失效 ${defaultLaneRedesign.relapseCount} 次。` : ''}
                      {defaultLaneRedesign.repeatedFailureReasons.length ? ` 同维复发：${defaultLaneRedesign.repeatedFailureReasons.join('、')}。` : ''}
                    </Text>
                  )}
                </Space>
              )}
            </Space>
          </div>
        )}
        {recoveryEvidence.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 12 }}>恢复放行依据</Text>
              <Space wrap size={[4, 4]}>
                {Array.from(new Set(recoveryEvidence)).slice(0, 8).map(item => (
                  <Tag key={item} color="green" bordered={false}>{item}</Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {recoveryEvidenceProfile?.visible && (
          <div style={{ padding: 8, border: '1px solid #fde68a', borderRadius: 6, background: '#fffdf3' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.label}</Text>
                <Tag color={recoveryEvidenceProfile.status === 'warn' ? 'gold' : 'green'} bordered={false}>反复来源 {recoveryEvidenceProfile.repeatSourceCount}</Tag>
                <Tag bordered={false}>失效 {recoveryEvidenceProfile.totalFailureCount} 次</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.summary}</Text>
              {recoveryEvidenceProfile.strengthenedAcceptanceTrend?.visible && (
                <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.label}</Text>
                      <Tag color={recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        {recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? '回到单章' : `连过 ${recoveryEvidenceProfile.strengthenedAcceptanceTrend.passStreak} 批`}
                      </Tag>
                      <Tag bordered={false}>通过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.acceptedBatchCount}</Tag>
                      <Tag bordered={false}>未过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.failedBatchCount}</Tag>
                      {recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel && (
                        <Tag bordered={false}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel}</Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.summary}</Text>
                    <Space wrap size={[4, 4]}>
                      <Tag bordered={false}>核心 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.core.failedCount}</Tag>
                      <Tag bordered={false}>回报 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.payoff.failedCount}</Tag>
                      <Tag bordered={false}>拉力 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.readerPull.failedCount}</Tag>
                    </Space>
                    {recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        依据：{recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.join('；')}
                      </Text>
                    )}
                  </Space>
                </div>
              )}
              {recoveryEvidenceProfile.sources.slice(0, 3).map(source => (
                <Space key={source.source} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={source.releaseFailureCount >= 2 ? 'gold' : 'default'} bordered={false}>{source.label}</Tag>
                    <Tag bordered={false}>{source.trendLabel}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>深层修复方向：{source.deepRepairDirection}</Text>
                  {source.deepRepairEffect.status !== 'none' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      深修结果：{source.deepRepairEffect.label}，{source.deepRepairEffect.summary}
                    </Text>
                  )}
                  {source.deepRepairEffect.strengthenedClosure.status !== 'not_required' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      强化复检：{source.deepRepairEffect.strengthenedClosure.label}，{source.deepRepairEffect.strengthenedClosure.summary}
                    </Text>
                  )}
                </Space>
              ))}
            </Space>
          </div>
        )}
        {chapters.length > 0 && (
          <Space wrap size={[4, 4]}>
            {chapters.slice(0, 80).map((chapter: any) => (
              <Tag
                key={`${chapter.chapter_no}-${chapter.id || chapter.title}`}
                color={chapter.status === 'success' ? (Number(chapter.score || 0) >= 78 ? 'green' : 'gold') : 'red'}
                bordered={false}
              >
                第{chapter.chapter_no}章
                {chapter.status === 'success' ? ` ${chapter.score ?? '-'}分${chapter.revised ? ' 修订' : ''}` : ' 失败'}
              </Tag>
            ))}
            {chapters.length > 80 && <Tag bordered={false}>另有 {chapters.length - 80} 章</Tag>}
          </Space>
        )}
        {failedChapters.length > 0 && (
          <Card size="small" title="失败章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {failedChapters.slice(0, 12).map((chapter: any) => (
                <Paragraph key={`${chapter.chapter_no}-${chapter.id || chapter.title}`} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                  第{chapter.chapter_no}章《{chapter.title || '未命名'}》：{chapter.error || '生成失败'}
                </Paragraph>
              ))}
              {failedChapters.length > 12 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {failedChapters.length - 12} 个失败章节，可查看下方原始输出。</Text>}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}
