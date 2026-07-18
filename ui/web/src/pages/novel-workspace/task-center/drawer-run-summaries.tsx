import React from 'react'
import { Tag, Typography } from 'antd'
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

export function ChapterPipelineRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const steps = Array.isArray(output.steps) ? output.steps : []
  return (
    <Card size="small" title="章节流水线">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>第{output.chapter_no || '-'}章</Tag>
          <Tag bordered={false}>当前：{output.current_step || '-'}</Tag>
          {output.can_resume_from && <Tag color="green" bordered={false}>可从 {output.can_resume_from} 继续</Tag>}
          {output.confirmed_scene_cards === false && <Tag color="gold" bordered={false}>等待场景卡确认</Tag>}
        </Space>
        {steps.length > 0 && (
          <Space wrap size={[4, 4]}>
            {steps.map((step: any) => (
              <Tag key={step.key} color={step.status === 'success' ? 'green' : step.status === 'failed' ? 'red' : step.status === 'needs_confirmation' ? 'gold' : step.status === 'ready' ? 'blue' : 'default'} bordered={false}>
                {step.label || step.key} · {step.status}
              </Tag>
            ))}
          </Space>
        )}
        {Array.isArray(output.context_package?.preflight?.warnings) && output.context_package.preflight.warnings.length > 0 && (
          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
            上下文缺口：{output.context_package.preflight.warnings.join('；')}
          </Paragraph>
        )}
      </Space>
    </Card>
  )
}

export function ReleaseRepairRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const relatedRuns = Array.isArray(output.related_runs) ? output.related_runs : []
  return (
    <Card size="small" title="发布修复队列">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={output.release_audit?.can_release ? 'green' : 'red'} bordered={false}>
            发布评分 {output.release_audit?.score ?? '-'}
          </Tag>
          <Tag color="blue" bordered={false}>修复任务 {tasks.length}</Tag>
          <Tag bordered={false}>子任务 {relatedRuns.length}</Tag>
          <Tag color={(output.release_audit?.blocker_count || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {output.release_audit?.blocker_count || 0}</Tag>
          <Tag color={(output.release_audit?.warning_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>警告 {output.release_audit?.warning_count || 0}</Tag>
        </Space>
        {tasks.length > 0 && (
          <List
            size="small"
            dataSource={tasks}
            renderItem={(task: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    <Tag color={task.priority === 'high' ? 'red' : 'gold'} bordered={false}>{task.priority || 'medium'}</Tag>
                    <Text>{task.title}</Text>
                    <Tag bordered={false}>{task.count || 0} 项</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {task.action}{task.chapter_nos?.length ? ` · 章节：${task.chapter_nos.slice(0, 20).join('、')}` : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
        {relatedRuns.length > 0 && (
          <Space wrap>
            {relatedRuns.map((item: any) => (
              <Tag key={`${item.run_type}-${item.run_id}`} color="blue" bordered={false}>
                子任务 #{item.run_id} · {runTypeLabel(item.run_type)}
              </Tag>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  )
}

export function RepairTaskRunSummary({
  run,
  runRecords = [],
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onRecheckStyleSampleTaskBooks,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
  onRefresh,
}: {
  run: any
  runRecords?: any[]
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onRecheckStyleSampleTaskBooks?: (items: any[]) => void
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
  onRefresh?: () => void | Promise<void>
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const audit = output.audit_summary || null
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number | null>(null)
  const [focusedTaskSource, setFocusedTaskSource] = useState<string>('')
  const [recoveryEvidenceActionFeedbackByKey, setRecoveryEvidenceActionFeedbackByKey] = useState<Record<string, RecoveryEvidenceReviewActionFeedback>>({})
  const [recoveryEvidenceRefreshAnchor, setRecoveryEvidenceRefreshAnchor] = useState<RecoveryEvidenceReviewRefreshAnchor | null>(null)
  const high = tasks.filter((task: any) => task.severity === 'high').length
  const medium = tasks.filter((task: any) => task.severity === 'medium').length
  const resolved = tasks.filter((task: any) => task.task_status === 'resolved').length
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review').length
  const closureHighlights = buildRepairClosureHighlights(tasks, audit)
  const recoveryEvidenceAudit = buildRecoveryEvidenceAuditView(audit, tasks)
  const sourceTaskForRecoveryEvidenceRow = (focusSource: string) => {
    const group = recoveryEvidenceAudit?.sourceGroups.find(item => item.source === focusSource)
    const taskIndex = group?.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
      ?? group?.taskIndexes[0]
      ?? null
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : null,
    }
  }
  useEffect(() => {
    if (!safeBatchRecoveryFocus) return
    const taskIndex = tasks.findIndex((task: any) => safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task))
    if (taskIndex < 0) return
    setFocusedTaskSource('')
    setFocusedTaskIndex(taskIndex)
  }, [run?.id, safeBatchRecoveryFocus?.layerKey, safeBatchRecoveryFocus?.issueType, safeBatchRecoveryFocus?.source])
  const sourceTaskForRecoveryEvidenceAuditAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const groupedTask = sourceTaskForRecoveryEvidenceRow(nextAction.source)
    const taskIndex = nextAction.taskIndex ?? groupedTask.taskIndex
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : groupedTask.task,
    }
  }
  const recoveryEvidenceAuditNextActionDisabled = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    if (nextAction.action === 'revision') return !sourceTask.task || !onStartRepairTaskRevision
    if (nextAction.action === 'recheck_single_chapter') return !sourceTask.task || !onRecheckRepairTask
    if (nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') return !onGenerateRepairAuditSummary
    return false
  }
  const handleRecoveryEvidenceAuditNextAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    setFocusedTaskSource(nextAction.source)
    setFocusedTaskIndex(sourceTask.taskIndex)
    if (nextAction.action === 'revision' && sourceTask.task && onStartRepairTaskRevision) {
      onStartRepairTaskRevision(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if (nextAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
      onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if ((nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') && onGenerateRepairAuditSummary) {
      onGenerateRepairAuditSummary(run)
    }
  }
  const focusRecoveryEvidenceAnchor = (anchor: RecoveryEvidenceReviewRefreshAnchor) => {
    setFocusedTaskSource(anchor.focusSource)
    setFocusedTaskIndex(anchor.sourceTaskIndex ?? anchor.taskIndex)
  }
  const runRecoveryEvidenceActionWithRefresh = async (
    actionFeedback: RecoveryEvidenceReviewActionFeedback,
    refreshAnchor: RecoveryEvidenceReviewRefreshAnchor,
    action: () => void | Promise<void>,
  ) => {
    setRecoveryEvidenceRefreshAnchor(refreshAnchor)
    focusRecoveryEvidenceAnchor(refreshAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => ({ ...prev, [refreshAnchor.feedbackKey]: actionFeedback }))
    await Promise.resolve(action())
    if (onRefresh) await Promise.resolve(onRefresh())
    const refreshedAnchor = { ...refreshAnchor, refreshedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
    setRecoveryEvidenceRefreshAnchor(refreshedAnchor)
    focusRecoveryEvidenceAnchor(refreshedAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => {
      const refreshedFeedback = buildRecoveryEvidenceReviewRefreshFeedback(prev[refreshAnchor.feedbackKey] || actionFeedback, refreshedAnchor)
      return refreshedFeedback ? { ...prev, [refreshAnchor.feedbackKey]: refreshedFeedback } : prev
    })
  }
  const handleRecoveryEvidenceReviewRowAction = async (
    task: any,
    taskIndex: number,
    row: RecoveryEvidenceReviewRow,
    rowAction: RecoveryEvidenceReviewRowAction,
  ) => {
    const triggeredAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const actionFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, triggeredAt)
    const runActionOptions = { keepTaskCenterOpen: true }
    if (rowAction.focusSource) {
      const sourceTask = sourceTaskForRecoveryEvidenceRow(rowAction.focusSource)
      const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
        taskIndex,
        row,
        rowAction,
        sourceTaskIndex: sourceTask.taskIndex,
        refreshedAt: triggeredAt,
      })
      if (rowAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0, runActionOptions))
      }
      if (rowAction.action === 'recheck_safe_batch' && onGenerateRepairAuditSummary) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      }
      return
    }
    const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex,
      row,
      rowAction,
      sourceTaskIndex: taskIndex,
      refreshedAt: triggeredAt,
    })
    if (rowAction.action === 'review_governance_closure' && onGenerateRepairAuditSummary) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      return
    }
    if (rowAction.action === 'execute_typed_repair' && onExecuteTypedRepairTask) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onExecuteTypedRepairTask(task, run, taskIndex, runActionOptions))
    }
  }
  const title = run.run_type === 'first30_retention_repair'
    ? '前30章留存修复任务'
    : run.run_type === 'longform_production_repair'
      ? output.report?.source === 'auto_creation_safe_batch_risk'
        ? '安全连写风险修复任务'
        : output.report?.source === 'review_annotation_risk'
          ? '交稿风险修复任务'
          : output.report?.source === 'rolling_script_room'
            ? '百章剧本室修复任务'
            : output.report?.source === 'reader_trial_review'
              ? '读者试读修复任务'
              : output.report?.source === 'recovery_evidence_governance_queue'
                ? '恢复依据治理队列'
                : '长线生产修复任务'
      : '机械质检修复任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>任务 {tasks.length}</Tag>
          <Tag color={high ? 'red' : 'default'} bordered={false}>高危 {high}</Tag>
          <Tag color={medium ? 'gold' : 'default'} bordered={false}>中危 {medium}</Tag>
          <Tag color={resolved ? 'green' : 'default'} bordered={false}>已处理 {resolved}</Tag>
          <Tag color={needsReview ? 'gold' : 'default'} bordered={false}>需复查 {needsReview}</Tag>
          {output.report?.score !== undefined && <Tag bordered={false}>诊断分 {output.report.score}</Tag>}
          {output.report?.weak_count !== undefined && <Tag bordered={false}>薄弱章节 {output.report.weak_count}</Tag>}
          {output.report?.status && <Tag bordered={false}>{output.report.status}</Tag>}
          {run.run_type === 'longform_production_repair' && onGenerateRepairAuditSummary && (
            <Button size="small" type="primary" onClick={() => onGenerateRepairAuditSummary(run)}>生成审计摘要</Button>
          )}
        </Space>
        {audit && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
                <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
                <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
              </Space>
              {(audit.conclusion || []).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
              <Space wrap size={[4, 4]}>
                {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>
                    {key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}
                  </Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {closureHighlights.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>风险闭环记录</Text>
                <Tag color="green" bordered={false}>已清 {closureHighlights.reduce((sum, item) => sum + item.count, 0)}</Tag>
              </Space>
              {closureHighlights.map(item => (
                <Space key={item.key} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={item.color} bordered={false}>{item.label}</Tag>
                    <Tag color="green" bordered={false}>{item.count}</Tag>
                    {item.chapterNos.length > 0 && <Tag bordered={false}>第{item.chapterNos.slice(0, 6).join('、')}章</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                </Space>
              ))}
            </Space>
          </div>
        )}
        {recoveryEvidenceAudit && (
          <div style={{ padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.label}</Text>
                <Tag color={recoveryEvidenceAudit.status === 'closed' ? 'green' : 'gold'} bordered={false}>
                  {recoveryEvidenceAudit.status === 'closed' ? '已闭环' : '需跟进'}
                </Tag>
                <Tag bordered={false}>已确认 {recoveryEvidenceAudit.resolved}/{recoveryEvidenceAudit.total}</Tag>
                {recoveryEvidenceAudit.sourceRunId && <Tag bordered={false}>来源 #{recoveryEvidenceAudit.sourceRunId}</Tag>}
                {recoveryEvidenceAudit.memoryLabel && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.memoryLabel}</Tag>}
                {recoveryEvidenceAudit.sourceSummary && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.sourceSummary}</Tag>}
              </Space>
              {recoveryEvidenceAudit.nextAction && (
                <Space wrap size={[4, 4]} style={{ padding: 6, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
                  <Tag color="gold" bordered={false}>下一步</Tag>
                  <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.label}</Text>
                  {recoveryEvidenceAudit.nextAction.sourceLabel && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.sourceLabel}</Text>
                  )}
                  {recoveryEvidenceAudit.nextAction.residualEvidence.length > 0 && (
                    <Text type="danger" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.residualEvidence.join('；')}</Text>
                  )}
                  <Button
                    size="small"
                    type="primary"
                    icon={['recheck_single_chapter', 'recheck_safe_batch', 'review_governance_closure'].includes(recoveryEvidenceAudit.nextAction.action) ? <ReloadOutlined /> : undefined}
                    disabled={recoveryEvidenceAuditNextActionDisabled(recoveryEvidenceAudit.nextAction)}
                    onClick={() => handleRecoveryEvidenceAuditNextAction(recoveryEvidenceAudit.nextAction!)}
                  >
                    {recoveryEvidenceAudit.nextAction.label}
                  </Button>
                </Space>
              )}
              {recoveryEvidenceAudit.sourceGroups.length > 0 && (
                <Space wrap size={[4, 4]}>
                  <Text strong style={{ fontSize: 12 }}>按来源定位</Text>
                  {recoveryEvidenceAudit.sourceGroups.map(group => {
                    const sourceTaskIndex = group.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
                      ?? group.taskIndexes[0]
                      ?? null
                    const sourceTask = sourceTaskIndex !== null ? tasks[sourceTaskIndex] : null
                    return (
                      <Space key={group.source} size={[2, 2]} wrap>
                        <Button
                          size="small"
                          type={focusedTaskSource === group.source ? 'primary' : 'default'}
                          onClick={() => {
                            setFocusedTaskSource(group.source)
                            setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                          }}
                        >
                          {group.label} {group.count}
                        </Button>
                        {group.recheckAction === 'single_chapter_governance_recheck' && sourceTask && onRecheckRepairTask && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onRecheckRepairTask?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        {group.recheckAction === 'safe_batch_recovery_recheck' && onGenerateRepairAuditSummary && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                              onGenerateRepairAuditSummary?.(run)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        <Tag color={group.resultStatus === 'closed' ? 'green' : group.resultStatus === 'needs_followup' ? 'gold' : 'default'} bordered={false}>
                          {group.resultLabel}
                        </Tag>
                        <Tag color={group.productionBlockStatus === 'cleared' ? 'green' : group.productionBlockStatus === 'blocked' ? 'red' : 'default'} bordered={false}>
                          {group.productionBlockLabel}
                        </Tag>
                        <Text type={group.productionBlockStatus === 'blocked' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                          {group.productionBlockDetail}
                        </Text>
                        {group.latestSummary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{group.latestSummary}</Text>
                        )}
                        {group.residualEvidence.length > 0 && (
                          <Text type="danger" style={{ fontSize: 12 }}>残留依据：{group.residualEvidence.join('；')}</Text>
                        )}
                        {group.residualAction === 'revision' && sourceTask && onStartRepairTaskRevision && (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onStartRepairTaskRevision?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                        {group.residualAction === 'focus_task' && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
              {recoveryEvidenceAudit.memorySummary && (
                <Text type="secondary" style={{ fontSize: 12 }}>治理记忆：{recoveryEvidenceAudit.memorySummary}</Text>
              )}
              {recoveryEvidenceAudit.failedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{recoveryEvidenceAudit.failedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.repairedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>修后证据：{recoveryEvidenceAudit.repairedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.watchItems.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>仍需观察：{recoveryEvidenceAudit.watchItems.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.relatedTasks.length > 0 && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12 }}>关联批次修复任务</Text>
                  {recoveryEvidenceAudit.relatedTasks.map((task, index) => {
                    const sourceTask = task.taskIndex !== null ? tasks[task.taskIndex] : null
                    const chapterId = task.chapterId || Number(sourceTask?.chapter_id || sourceTask?.chapterId || 0) || null
                    return (
                      <Space key={`${task.chapterNo || 'task'}-${index}`} wrap size={[4, 2]}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.chapterNo ? `第${task.chapterNo}章 ` : ''}{task.title}{task.status ? ` · ${task.status}` : ''}{task.summary ? ` · ${task.summary}` : ''}
                        </Text>
                        {task.taskIndex !== null && (
                          <Button size="small" type="link" onClick={() => {
                            setFocusedTaskSource('')
                            setFocusedTaskIndex(task.taskIndex)
                          }}>定位任务</Button>
                        )}
                        {chapterId && onSelectChapter && (
                          <Button size="small" type="link" onClick={() => onSelectChapter(chapterId)}>打开章节</Button>
                        )}
                        {sourceTask && onStartRepairTaskRevision && (
                          <Button size="small" type="link" onClick={() => onStartRepairTaskRevision(sourceTask, run, task.taskIndex ?? index)}>生成修订稿</Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </Space>
          </div>
        )}
        {Array.isArray(output.recommendations) && output.recommendations.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 12 }}>处理建议</Text>
              {output.recommendations.slice(0, 4).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
            </Space>
          </div>
        )}
        {output.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{output.report.summary}</Text>}
        {safeBatchRecoveryFocus && (
          <Alert
            type="info"
            showIcon
            message={`路线图聚焦：${safeBatchRecoveryFocus.actionLabel || safeBatchRecoveryFocus.layerLabel}`}
            description={safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '按安全连写恢复路线图定位下一层修复任务。'}
          />
        )}
        <List
          size="small"
          dataSource={tasks.slice(0, 40)}
          locale={{ emptyText: '暂无修复任务' }}
          renderItem={(task: any, taskIndex: number) => {
            const sourceFocused = Boolean(focusedTaskSource && recoveryEvidenceTaskSourceMeta(task).source === focusedTaskSource)
            const regovernanceQueue = recoveryEvidenceRegovernanceQueueOfTask(task)
            const regovernanceSummary = buildRecoveryEvidenceRegovernanceSummary(task)
            const refreshAnchorFocused = Boolean(
              recoveryEvidenceRefreshAnchor
              && (recoveryEvidenceRefreshAnchor.taskIndex === taskIndex || recoveryEvidenceRefreshAnchor.sourceTaskIndex === taskIndex),
            )
            const roadmapFocused = safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
            const defaultLaneTags = buildDefaultLaneRepairTaskTags(task)
            const focused = focusedTaskIndex === taskIndex || sourceFocused || refreshAnchorFocused || roadmapFocused
            return (
              <List.Item
                style={focused ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
              actions={[
                regovernanceQueue && regovernanceSummary && onCreateRecoveryEvidenceGovernanceQueue && task.task_status !== 'resolved' ? (
                  <Button
                    key="regovernance"
                    size="small"
                    type="primary"
                    onClick={() => onCreateRecoveryEvidenceGovernanceQueue({
                      recoveryEvidenceGovernanceQueue: regovernanceQueue,
                      sourceTask: task,
                      sourceRunId: run?.id,
                      sourceTaskIndex: taskIndex,
                    }, run, taskIndex, { keepTaskCenterOpen: true })}
                  >
                    {regovernanceSummary.actionLabel}
                  </Button>
                ) : null,
                repairTaskActionLabel(task) && onExecuteTypedRepairTask && task.task_status !== 'resolved' ? <Button key="typed" size="small" type="primary" onClick={() => onExecuteTypedRepairTask(task, run, taskIndex)}>{repairTaskActionLabel(task)}</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'resolved' ? <Button key="resolved" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'resolved', taskIndex)}>已处理</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'needs_review' ? <Button key="review" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'needs_review', taskIndex)}>需复查</Button> : null,
                task.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(task.chapter_id))}>定位</Button> : null,
                task.chapter_id && onOpenChapterEditor ? <Button key="edit" size="small" type="link" onClick={() => onOpenChapterEditor(Number(task.chapter_id))}>手动编辑</Button> : null,
                task.chapter_id && onStartRepairTaskRevision ? <Button key="revise" size="small" type="link" onClick={() => onStartRepairTaskRevision(task, run, taskIndex)}>生成修订稿</Button> : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={(
                  <Space wrap>
                    <Tag color={task.severity === 'high' ? 'red' : task.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{task.severity || 'task'}</Tag>
                    {repairTaskIssueTag(task)}
                    {defaultLaneTags.map(tag => (
                      <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                    ))}
                    {repairTaskStatusTag(task.task_status)}
                    <Text>{task.chapter_no ? `第${task.chapter_no}章 ` : ''}{task.title || task.message}</Text>
                    {task.segment && <Tag bordered={false}>{task.segment}</Tag>}
                  </Space>
                )}
                description={(
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">{task.message}</Text>
                    <Text>{task.action}</Text>
                    {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>验收：{task.acceptance_criteria.slice(0, 2).join('；')}</Text>
                    )}
                    <BatchPlanReviewPreview task={task} />
                    <RecoveryEvidenceReviewPreview
                      task={task}
                      taskIndex={taskIndex}
                      currentRun={run}
                      runRecords={runRecords}
                      actionFeedbackByKey={recoveryEvidenceActionFeedbackByKey}
                      onRecoveryEvidenceReviewRowAction={(row, rowAction) => handleRecoveryEvidenceReviewRowAction(task, taskIndex, row, rowAction)}
                    />
                    <RecoveryEvidenceRegovernancePreview task={task} />
                    <SafeBatchExpansionSegmentPreview task={task} />
                    <NextChapterQualityPlanPreview task={task} />
                    <DeliveryRiskReviewPreview task={task} />
                  </Space>
                )}
              />
            </List.Item>
            )
          }}
        />
      </Space>
    </Card>
  )
}

export function ReleaseBatchRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const results = Array.isArray(output.results) ? output.results : []
  const failed = results.filter((item: any) => item.status === 'failed')
  const title = run.run_type === 'release_similarity_batch' ? '发布相似度批量任务' : '发布质检批量任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          {statusTag(run.status)}
          <Tag color="blue" bordered={false}>已处理 {output.processed || results.length || 0}</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? results.length - failed.length}</Tag>
          <Tag color={failed.length ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failed.length}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{output.phase || run.step_name || '-'}</Text>
        {results.length > 0 && (
          <List
            size="small"
            dataSource={results.slice(0, 30)}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    {statusTag(item.status)}
                    <Text>第{item.chapter_no}章</Text>
                    {typeof item.score === 'number' && <Tag color={item.score >= 78 ? 'green' : 'gold'} bordered={false}>质量 {item.score}</Tag>}
                    {typeof item.risk === 'number' && <Tag color={item.risk <= 35 ? 'green' : 'gold'} bordered={false}>风险 {item.risk}</Tag>}
                    {item.review_id && <Tag bordered={false}>报告 #{item.review_id}</Tag>}
                  </Space>
                  {item.error && <Text type="danger" style={{ fontSize: 12 }}>{item.error}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  )
}

export function ChapterGroupRunSummary({
  run,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
}: {
  run: any
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const postBatchQuality = buildPostBatchQualityCheckSummary(run)
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const success = chapters.filter((item: any) => item.status === 'success').length
  const failed = chapters.filter((item: any) => item.status === 'failed').length
  const skipped = chapters.filter((item: any) => item.status === 'skipped' || item.status === 'written').length
  const total = chapters.length
  const percent = total ? Math.round(((success + skipped) / total) * 100) : 0
  const stageColor = (status?: string) => (
    status === 'success' ? 'green'
      : status === 'failed' ? 'red'
        : status === 'running' ? 'blue'
          : status === 'warn' ? 'gold'
            : status === 'skipped' ? 'default'
              : 'default'
  )
  return (
    <Card size="small" title="章节群执行">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>进度 {success + skipped}/{total}</Tag>
          <Tag color="green" bordered={false}>成功 {success}</Tag>
          <Tag color={failed ? 'red' : 'default'} bordered={false}>失败 {failed}</Tag>
          <Tag bordered={false}>跳过 {skipped}</Tag>
          <Tag bordered={false}>当前 {output.current_index ?? 0}</Tag>
        </Space>
        <Progress percent={percent} size="small" />
        {output.phase && <Text type="secondary" style={{ fontSize: 12 }}>{output.phase}</Text>}
        {postBatchQuality?.visible && (
          <Card size="small" title={postBatchQuality.title} styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Tag color={postBatchQuality.statusColor} bordered={false}>{postBatchQuality.statusLabel}</Tag>
                <Tag bordered={false}>{postBatchQuality.chapterText}</Tag>
                <Tag bordered={false}>完成 {postBatchQuality.completedCount} 章</Tag>
                {postBatchQuality.averageScore !== null && (
                  <Tag color={postBatchQuality.averageScore >= 78 ? 'green' : 'gold'} bordered={false}>平均 {postBatchQuality.averageScore} 分</Tag>
                )}
                {postBatchQuality.revisedCount > 0 && <Tag color="blue" bordered={false}>已修订 {postBatchQuality.revisedCount}</Tag>}
                {postBatchQuality.warningCount > 0 && <Tag color="gold" bordered={false}>复核项 {postBatchQuality.warningCount}</Tag>}
                {postBatchQuality.source && <Tag bordered={false}>{postBatchQuality.source}</Tag>}
              </Space>
              {postBatchQuality.checks.length > 0 && (
                <Space wrap size={[4, 4]}>
                  {postBatchQuality.checks.map((check: any) => (
                    <Tag key={`post-batch-quality-${check.key}`} color={check.statusColor} bordered={false}>
                      {check.label}{check.warningCount > 0 ? ` ${check.warningCount}` : ''}
                    </Tag>
                  ))}
                </Space>
              )}
              {postBatchQuality.checks.some((check: any) => check.summaries.length > 0) && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  {postBatchQuality.checks.filter((check: any) => check.summaries.length > 0).slice(0, 3).map((check: any) => (
                    <Text key={`post-batch-quality-summary-${check.key}`} type="secondary" style={{ fontSize: 12 }}>
                      {check.label}：{check.summaries.slice(0, 2).join('；')}
                    </Text>
                  ))}
                </Space>
              )}
            </Space>
          </Card>
        )}
        <Space wrap size={[4, 4]}>
          {chapters.slice(0, 80).map((chapter: any) => (
            <Tag
              key={`${chapter.id || chapter.chapter_no}-${chapter.status}`}
              color={chapter.status === 'success' ? 'green' : chapter.status === 'failed' ? 'red' : chapter.status === 'running' ? 'blue' : chapter.status === 'skipped' ? 'default' : 'gold'}
              bordered={false}
            >
              第{chapter.chapter_no}章 · {chapter.status || 'pending'}{chapter.score ? ` · ${chapter.score}分` : ''}
            </Tag>
          ))}
        </Space>
        {chapters.some((chapter: any) => Array.isArray(chapter.stages) && chapter.stages.length > 0) && (
          <Card size="small" title="章节流水线阶段" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {chapters.slice(0, 12).map((chapter: any) => {
                const stages = Array.isArray(chapter.stages) ? chapter.stages : []
                if (!stages.length) return null
                return (
                  <div key={`stages-${chapter.id || chapter.chapter_no}`} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                    <Text strong style={{ fontSize: 12 }}>第{chapter.chapter_no}章</Text>
                    <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                      {stages.map((stage: any) => (
                        <Tag key={`${chapter.id || chapter.chapter_no}-${stage.key}`} color={stageColor(stage.status)} bordered={false}>
                          {stage.label || stage.key}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )
              })}
            </Space>
          </Card>
        )}
        {output.last_error && (
          <Paragraph type="danger" style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>
            第{output.last_error.chapter_no}章失败：{output.last_error.error}
          </Paragraph>
        )}
        {chapters.some((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)) && (
          <Card size="small" title="可操作章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {chapters.filter((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)).slice(0, 10).map((chapter: any) => {
                const actionState = chapterGroupActionState(chapter)
                return (
                  <Space key={`action-${chapter.id || chapter.chapter_no}`} style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space direction="vertical" size={2}>
                      <Text style={{ fontSize: 12 }}>第{chapter.chapter_no}章 · {chapter.error || chapter.approval_stage || chapter.status}</Text>
                      {actionState.blockedByApprovalBlocker && <Text type="secondary" style={{ fontSize: 12 }}>{actionState.actionHint}</Text>}
                    </Space>
                    <Space>
                      {actionState.canApprove && onApproveChapterGroup && <Button size="small" type="link" onClick={() => onApproveChapterGroup(run, chapter)}>确认</Button>}
                      {actionState.canRetry && onRetryChapterGroup && <Button size="small" type="link" onClick={() => onRetryChapterGroup(run, chapter)}>重试</Button>}
                      {actionState.canSkip && onSkipChapterGroup && <Button size="small" type="link" danger onClick={() => onSkipChapterGroup(run, chapter)}>跳过</Button>}
                    </Space>
                  </Space>
                )
              })}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}
