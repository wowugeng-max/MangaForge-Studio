import React from 'react'
import { Popover, Tag, Typography } from 'antd'

const { Text } = Typography

function asItems(...parts: Array<React.ReactNode | React.ReactNode[] | null | undefined>) {
  const items: React.ReactNode[] = []
  const push = (value: React.ReactNode) => {
    if (value === null || value === undefined || value === false || value === true) return
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (!text) return
      // Split long joined strings into bullet-like items when they use Chinese semicolons.
      if (text.includes('；')) {
        for (const piece of text.split('；')) {
          const trimmed = piece.trim()
          if (trimmed) items.push(trimmed)
        }
        return
      }
      items.push(text)
      return
    }
    // Keep real JSX detail nodes renderable; anything else would stringify
    // into "[object Object]", so drop it instead of showing garbage.
    if (React.isValidElement(value)) items.push(value)
  }
  for (const part of parts) {
    if (Array.isArray(part)) {
      for (const item of part) push(item)
      continue
    }
    push(part)
  }
  return items
}

function DeliveryInfoChip({
  label,
  className,
  items = [],
  onActivate,
}: {
  label: React.ReactNode
  className?: string
  items?: React.ReactNode[]
  onActivate?: () => void
}) {
  const detailItems = asItems(...items)
  const hasDetails = detailItems.length > 0

  const tag = (
    <Tag
      className={`${className || ''} ${hasDetails || onActivate ? 'novel-delivery-chip-interactive' : ''}`.trim()}
      bordered={false}
      role={hasDetails || onActivate ? 'button' : undefined}
      tabIndex={hasDetails || onActivate ? 0 : undefined}
      onClick={(event) => {
        // Details chips open the popover via Ant Popover trigger=click.
        // Only direct-activate when there is no detail panel.
        if (hasDetails || !onActivate) return
        event.preventDefault()
        onActivate()
      }}
      onKeyDown={(event) => {
        if (hasDetails || !onActivate) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onActivate()
      }}
    >
      {label}
    </Tag>
  )

  if (!hasDetails) return tag

  return (
    <Popover
      trigger="click"
      placement="topLeft"
      destroyTooltipOnHide
      overlayClassName="novel-delivery-chip-popover"
      align={{ overflow: { adjustX: true, adjustY: true } }}
      content={(
        <div className="novel-delivery-chip-panel" onClick={(event) => event.stopPropagation()}>
          <div className="novel-delivery-chip-panel-head">
            <Text strong className="novel-delivery-chip-panel-title">{label}</Text>
            <Text type="secondary" className="novel-delivery-chip-panel-hint">点击标签查看 · 共 {detailItems.length} 条</Text>
          </div>
          <ul className="novel-delivery-chip-panel-list">
            {detailItems.map((item, index) => (
              <li key={typeof item === 'string' ? `${index}-${item.slice(0, 24)}` : index}>{item}</li>
            ))}
          </ul>
          {onActivate ? (
            <button type="button" className="novel-delivery-chip-panel-action" onClick={onActivate}>
              打开对应处理入口
            </button>
          ) : null}
        </div>
      )}
    >
      {tag}
    </Popover>
  )
}

export function WorkspaceDeliveryStatusChips(props: Record<string, any>) {
  const { deliverySummary, ipSceneIntakeTooltip, onOpenStoryAssets } = props

  const characterPov = deliverySummary.characterPov
  return (
    <div className="novel-delivery-status-chips">
      {characterPov?.visible && (
        <DeliveryInfoChip
          className={`novel-delivery-pov-tag novel-delivery-pov-tag-${characterPov.status || 'ok'}`}
          label={characterPov.statusLabel || `视角 · ${characterPov.primaryPov || '未定'}`}
          items={[
            characterPov.primaryPov ? `主视角：${characterPov.primaryPov}` : '',
            characterPov.multiPovLocked ? '多视角：默认锁定主视角' : '',
            ...(characterPov.allowedSecondaryPovs || []).map((name: string) => `授权次视角：${name}`),
            ...(characterPov.secondaryCutPreview || []),
            ...(characterPov.assetFirewallPreview || []),
            ...(characterPov.dialogueFilterPreview || []),
            ...(characterPov.scenePreview || []),
            ...(characterPov.violations || []),
            ...(characterPov.knowledgePreview || []),
          ]}
        />
      )}
      {deliverySummary.deliveryRiskQueue && (
        <DeliveryInfoChip
          className="novel-delivery-risk-tag novel-delivery-risk-tag-warn"
          label={`${deliverySummary.deliveryRiskQueue.label} · ${deliverySummary.deliveryRiskQueue.priorityLabel}`}
          items={deliverySummary.deliveryRiskQueue.items || []}
        />
      )}

      {deliverySummary.deliveryRiskConvergence && (
        <DeliveryInfoChip
          className={`novel-delivery-convergence-tag novel-delivery-convergence-tag-${deliverySummary.deliveryRiskConvergence.status}`}
          label={deliverySummary.deliveryRiskConvergence.label}
          items={[
            deliverySummary.deliveryRiskConvergence.nextAction,
            deliverySummary.deliveryRiskConvergence.label,
          ]}
        />
      )}

      {deliverySummary.storylineSync && (
        <DeliveryInfoChip
          className={`novel-delivery-storyline-tag novel-delivery-storyline-tag-${deliverySummary.storylineSync.status}`}
          label={deliverySummary.storylineSync.label}
          items={[
            deliverySummary.storylineSync.detail,
            deliverySummary.storylineSync.summary,
            ...(deliverySummary.storylineSync.evidence || []),
          ]}
        />
      )}

      {deliverySummary.storyUnitSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-story-unit-tag novel-delivery-story-unit-tag-${deliverySummary.storyUnitSync.status}`}
            label={deliverySummary.storyUnitSync.scoreLabel}
            items={[
              deliverySummary.storyUnitSync.label,
              deliverySummary.storyUnitSync.summary,
              ...(deliverySummary.storyUnitSync.evidence || []),
            ]}
          />
          {deliverySummary.storyUnitSync.riskCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-story-unit-tag novel-delivery-story-unit-tag-warn"
              label={deliverySummary.storyUnitSync.label}
              items={[
                `风险 ${deliverySummary.storyUnitSync.riskCount}`,
                ...(deliverySummary.storyUnitSync.evidence || []),
              ]}
            />
          )}
        </>
      )}

      {deliverySummary.assetIntake && deliverySummary.assetIntake.pendingCount > 0 && (
        <DeliveryInfoChip
          className="novel-delivery-asset-tag novel-delivery-asset-tag-clickable"
          label={deliverySummary.assetIntake.label}
          items={[
            '打开设定资产页，确认正文中新出现的人物、物品、能力、势力、地点或伏笔',
            `待确认 ${deliverySummary.assetIntake.pendingCount} 项`,
          ]}
          onActivate={() => onOpenStoryAssets?.('discoveredAssets')}
        />
      )}

      {deliverySummary.ipSceneIntake && (
        <DeliveryInfoChip
          className="novel-delivery-ip-scene-tag"
          label={deliverySummary.ipSceneIntake.label}
          items={[ipSceneIntakeTooltip, ...(deliverySummary.ipSceneIntake.candidates || []).map((item: any) => item?.title || item?.summary).filter(Boolean)]}
        />
      )}

      {deliverySummary.signatureSceneSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-${deliverySummary.signatureSceneSync.status}`}
            label={deliverySummary.signatureSceneSync.scoreLabel}
            items={[deliverySummary.signatureSceneSync.label, ...(deliverySummary.signatureSceneSync.evidence || [])]}
          />
          {deliverySummary.signatureSceneSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-warn"
              label={deliverySummary.signatureSceneSync.label}
              items={[`漏写 ${deliverySummary.signatureSceneSync.missedCount}`, ...(deliverySummary.signatureSceneSync.evidence || [])]}
            />
          )}
        </>
      )}

      {deliverySummary.coreDrift && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-core-drift-tag novel-delivery-core-drift-tag-${deliverySummary.coreDrift.status}`}
            label={deliverySummary.coreDrift.scoreLabel}
            items={[deliverySummary.coreDrift.label, ...(deliverySummary.coreDrift.evidence || [])]}
          />
          {deliverySummary.coreDrift.riskCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-core-drift-tag novel-delivery-core-drift-tag-warn"
              label={deliverySummary.coreDrift.label}
              items={[`风险 ${deliverySummary.coreDrift.riskCount}`, ...(deliverySummary.coreDrift.evidence || [])]}
            />
          )}
        </>
      )}

      {deliverySummary.runwaySync && (
        <DeliveryInfoChip
          className={`novel-delivery-runway-tag novel-delivery-runway-tag-${deliverySummary.runwaySync.status}`}
          label={deliverySummary.runwaySync.scoreLabel || deliverySummary.runwaySync.label}
          items={[
            deliverySummary.runwaySync.label,
            ...(deliverySummary.runwaySync.evidence || []),
            ...(deliverySummary.runwaySync.nextActions || []),
          ]}
        />
      )}

      {deliverySummary.readerExpectationSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-expectation-tag novel-delivery-expectation-tag-${deliverySummary.readerExpectationSync.status}`}
            label={deliverySummary.readerExpectationSync.scoreLabel}
            items={[deliverySummary.readerExpectationSync.label, ...(deliverySummary.readerExpectationSync.evidence || [])]}
          />
          {deliverySummary.readerExpectationSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-expectation-tag novel-delivery-expectation-tag-warn"
              label={deliverySummary.readerExpectationSync.label}
              items={[`漏兑 ${deliverySummary.readerExpectationSync.missedCount}`, ...(deliverySummary.readerExpectationSync.evidence || [])]}
            />
          )}
        </>
      )}

      {!deliverySummary.readerExpectationSync && deliverySummary.readerPayoffSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-payoff-tag novel-delivery-payoff-tag-${deliverySummary.readerPayoffSync.status}`}
            label={deliverySummary.readerPayoffSync.scoreLabel}
            items={[deliverySummary.readerPayoffSync.label, ...(deliverySummary.readerPayoffSync.evidence || [])]}
          />
          {deliverySummary.readerPayoffSync.debtCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-payoff-tag novel-delivery-payoff-tag-warn"
              label={deliverySummary.readerPayoffSync.label}
              items={[`债务 ${deliverySummary.readerPayoffSync.debtCount}`, ...(deliverySummary.readerPayoffSync.evidence || [])]}
            />
          )}
        </>
      )}

      {!deliverySummary.readerExpectationSync && deliverySummary.readerRetentionSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-retention-tag novel-delivery-retention-tag-${deliverySummary.readerRetentionSync.status}`}
            label={deliverySummary.readerRetentionSync.scoreLabel}
            items={[deliverySummary.readerRetentionSync.label, ...(deliverySummary.readerRetentionSync.evidence || [])]}
          />
          {deliverySummary.readerRetentionSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-retention-tag novel-delivery-retention-tag-warn"
              label={deliverySummary.readerRetentionSync.label}
              items={[`漏项 ${deliverySummary.readerRetentionSync.missedCount}`, ...(deliverySummary.readerRetentionSync.evidence || [])]}
            />
          )}
        </>
      )}

      {deliverySummary.chapterAttraction && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-attraction-tag novel-delivery-attraction-tag-${deliverySummary.chapterAttraction.status}`}
            label={deliverySummary.chapterAttraction.scoreLabel}
            items={[deliverySummary.chapterAttraction.label, ...(deliverySummary.chapterAttraction.evidence || [])]}
          />
          {deliverySummary.chapterAttraction.weakCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-attraction-tag novel-delivery-attraction-tag-warn"
              label={deliverySummary.chapterAttraction.priorityLabel || deliverySummary.chapterAttraction.label}
              items={[
                deliverySummary.chapterAttraction.priorityLabel,
                deliverySummary.chapterAttraction.label,
                ...(deliverySummary.chapterAttraction.evidence || []),
              ]}
            />
          )}
        </>
      )}

      {deliverySummary.storyDriveSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-story-drive-tag novel-delivery-story-drive-tag-${deliverySummary.storyDriveSync.status}`}
            label={deliverySummary.storyDriveSync.scoreLabel}
            items={[deliverySummary.storyDriveSync.label, ...(deliverySummary.storyDriveSync.evidence || [])]}
          />
          {deliverySummary.storyDriveSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-story-drive-tag novel-delivery-story-drive-tag-warn"
              label={deliverySummary.storyDriveSync.priorityLabel || deliverySummary.storyDriveSync.label}
              items={[
                deliverySummary.storyDriveSync.priorityLabel,
                deliverySummary.storyDriveSync.label,
                ...(deliverySummary.storyDriveSync.evidence || []),
              ]}
            />
          )}
        </>
      )}

      {deliverySummary.characterArcSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-character-arc-tag novel-delivery-character-arc-tag-${deliverySummary.characterArcSync.status}`}
            label={deliverySummary.characterArcSync.scoreLabel}
            items={[deliverySummary.characterArcSync.label, ...(deliverySummary.characterArcSync.evidence || [])]}
          />
          {deliverySummary.characterArcSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-character-arc-tag novel-delivery-character-arc-tag-warn"
              label={deliverySummary.characterArcSync.priorityLabel || deliverySummary.characterArcSync.label}
              items={[
                deliverySummary.characterArcSync.priorityLabel,
                deliverySummary.characterArcSync.label,
                ...(deliverySummary.characterArcSync.evidence || []),
              ]}
            />
          )}
        </>
      )}

      {deliverySummary.chapterBenchmarkSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-benchmark-tag novel-delivery-benchmark-tag-${deliverySummary.chapterBenchmarkSync.status}`}
            label={deliverySummary.chapterBenchmarkSync.scoreLabel}
            items={[deliverySummary.chapterBenchmarkSync.label, ...(deliverySummary.chapterBenchmarkSync.evidence || [])]}
          />
          {deliverySummary.chapterBenchmarkSync.missedCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-benchmark-tag novel-delivery-benchmark-tag-warn"
              label={deliverySummary.chapterBenchmarkSync.label}
              items={[`漏项 ${deliverySummary.chapterBenchmarkSync.missedCount}`, ...(deliverySummary.chapterBenchmarkSync.evidence || [])]}
            />
          )}
        </>
      )}

      {deliverySummary.styleSampleSync && (
        <>
          <DeliveryInfoChip
            className={`novel-delivery-style-sample-tag novel-delivery-style-sample-tag-${deliverySummary.styleSampleSync.status}`}
            label={deliverySummary.styleSampleSync.scoreLabel}
            items={[deliverySummary.styleSampleSync.label, ...(deliverySummary.styleSampleSync.evidence || [])]}
          />
          {(deliverySummary.styleSampleSync.missedCount > 0 || deliverySummary.styleSampleSync.copyRiskCount > 0) && (
            <DeliveryInfoChip
              className="novel-delivery-style-sample-tag novel-delivery-style-sample-tag-warn"
              label={deliverySummary.styleSampleSync.copyRiskCount > 0
                ? `照搬风险 ${deliverySummary.styleSampleSync.copyRiskCount}`
                : deliverySummary.styleSampleSync.label}
              items={[
                deliverySummary.styleSampleSync.label,
                deliverySummary.styleSampleSync.copyRiskCount > 0 ? `照搬风险 ${deliverySummary.styleSampleSync.copyRiskCount}` : '',
                ...(deliverySummary.styleSampleSync.evidence || []),
              ]}
            />
          )}
        </>
      )}

      {deliverySummary.innovationSync && (
        <DeliveryInfoChip
          className={`novel-delivery-innovation-tag novel-delivery-innovation-tag-${deliverySummary.innovationSync.status}`}
          label={deliverySummary.innovationSync.scoreLabel || deliverySummary.innovationSync.label}
          items={[
            deliverySummary.innovationSync.label,
            ...(deliverySummary.innovationSync.evidence || []),
            ...(deliverySummary.innovationSync.nextActions || []),
          ]}
        />
      )}

      {deliverySummary.volumeBeatSync && (
        <DeliveryInfoChip
          className={`novel-delivery-volume-beat-tag novel-delivery-volume-beat-tag-${deliverySummary.volumeBeatSync.status}`}
          label={deliverySummary.volumeBeatSync.scoreLabel || deliverySummary.volumeBeatSync.label}
          items={[
            deliverySummary.volumeBeatSync.label,
            ...(deliverySummary.volumeBeatSync.evidence || []),
            ...(deliverySummary.volumeBeatSync.nextActions || []),
          ]}
        />
      )}

      {deliverySummary.qualityAuditSync && (
        <DeliveryInfoChip
          className={`novel-delivery-quality-sync-tag novel-delivery-quality-sync-tag-${deliverySummary.qualityAuditSync.status}`}
          label={`诊断承接 · ${deliverySummary.qualityAuditSync.label}`}
          items={[
            ...(deliverySummary.qualityAuditSync.evidence || []).map((item: string) => `证据：${item}`),
            ...(deliverySummary.qualityAuditSync.nextActions || []).map((item: string) => `动作：${item}`),
          ]}
        />
      )}

      {deliverySummary.qualityAuditRepairReceiptSync && (
        <DeliveryInfoChip
          className={`novel-delivery-quality-repair-receipt-tag novel-delivery-quality-repair-receipt-tag-${deliverySummary.qualityAuditRepairReceiptSync.status}`}
          label={`质量回执 · ${deliverySummary.qualityAuditRepairReceiptSync.label}`}
          items={[
            ...(deliverySummary.qualityAuditRepairReceiptSync.evidence || []).map((item: string) => `证据：${item}`),
            ...(deliverySummary.qualityAuditRepairReceiptSync.nextActions || []).map((item: string) => `动作：${item}`),
          ]}
        />
      )}

      {deliverySummary.blueprintReceipt && (
        <DeliveryInfoChip
          className={`novel-delivery-blueprint-tag novel-delivery-blueprint-tag-${deliverySummary.blueprintReceipt.status}`}
          label={deliverySummary.blueprintReceipt.scoreLabel || deliverySummary.blueprintReceipt.label}
          items={[
            deliverySummary.blueprintReceipt.label,
            (deliverySummary.blueprintReceipt.missed || []).length ? `缺口：${deliverySummary.blueprintReceipt.missed.join('、')}` : '',
            ...(deliverySummary.blueprintReceipt.evidence || []).map((item: string) => `证据：${item}`),
          ]}
        />
      )}

      {deliverySummary.revisionReceipt && (
        <DeliveryInfoChip
          className={`novel-delivery-revision-tag novel-delivery-revision-tag-${deliverySummary.revisionReceipt.status}`}
          label={deliverySummary.revisionReceipt.scoreLabel || deliverySummary.revisionReceipt.label}
          items={[
            deliverySummary.revisionReceipt.label,
            (deliverySummary.revisionReceipt.risks || []).length ? `残余：${deliverySummary.revisionReceipt.risks.join('、')}` : '',
            ...(deliverySummary.revisionReceipt.evidence || []).map((item: string) => `修后证据：${item}`),
          ]}
        />
      )}

      {deliverySummary.deliveryRiskReceipt && (
        <DeliveryInfoChip
          className={`novel-delivery-risk-receipt-tag novel-delivery-risk-receipt-tag-${deliverySummary.deliveryRiskReceipt.status}`}
          label={deliverySummary.deliveryRiskReceipt.scoreLabel || deliverySummary.deliveryRiskReceipt.label}
          items={[
            deliverySummary.deliveryRiskReceipt.label,
            (deliverySummary.deliveryRiskReceipt.risks || []).length ? `残余：${deliverySummary.deliveryRiskReceipt.risks.join('、')}` : '',
            ...(deliverySummary.deliveryRiskReceipt.evidence || []).map((item: string) => `承接证据：${item}`),
          ]}
        />
      )}

      {deliverySummary.sceneCardReceipt && (
        <DeliveryInfoChip
          className={`novel-delivery-scene-card-receipt-tag novel-delivery-scene-card-receipt-tag-${deliverySummary.sceneCardReceipt.status}`}
          label={deliverySummary.sceneCardReceipt.label}
          items={[
            (deliverySummary.sceneCardReceipt.scenes || []).length ? `场景：${deliverySummary.sceneCardReceipt.scenes.join('、')}` : '',
            (deliverySummary.sceneCardReceipt.fields || []).length ? `字段：${deliverySummary.sceneCardReceipt.fields.join('、')}` : '',
            ...(deliverySummary.sceneCardReceipt.evidence || []).map((item: string) => `证据：${item}`),
          ]}
        />
      )}

      {deliverySummary.qualityAudit && (
        <DeliveryInfoChip
          className={`novel-delivery-quality-audit-tag novel-delivery-quality-audit-tag-${deliverySummary.qualityAudit.status}`}
          label={deliverySummary.qualityAudit.label}
          items={[
            (deliverySummary.qualityAudit.checks || []).length ? `检查：${deliverySummary.qualityAudit.checks.join('、')}` : '',
            ...(deliverySummary.qualityAudit.evidence || []).map((item: string) => `证据：${item}`),
            (deliverySummary.qualityAudit.fixes || []).length ? `修法：${deliverySummary.qualityAudit.fixes.join('；')}` : '',
            (deliverySummary.qualityAudit.strategies || []).length ? `策略：${deliverySummary.qualityAudit.strategies.join('、')}` : '',
          ]}
        />
      )}

      {deliverySummary.first30RetentionRecheck && (
        <DeliveryInfoChip
          className={`novel-delivery-first30-tag novel-delivery-first30-tag-${deliverySummary.first30RetentionRecheck.status}`}
          label={deliverySummary.first30RetentionRecheck.label}
          items={[deliverySummary.first30RetentionRecheck.reason, ...(deliverySummary.first30RetentionRecheck.evidence || [])]}
        />
      )}

      {deliverySummary.deslopGateDiagnostics && (
        <DeliveryInfoChip
          className={`novel-delivery-deslop-tag novel-delivery-deslop-tag-${deliverySummary.deslopGateDiagnostics.status}`}
          label={deliverySummary.deslopGateDiagnostics.label}
          items={[
            deliverySummary.deslopGateDiagnostics.summary,
            ...(deliverySummary.deslopGateDiagnostics.evidence || []),
            ...(deliverySummary.deslopGateDiagnostics.nextActions || []),
          ]}
        />
      )}

      {deliverySummary.chapterHandoffSync && (
        <DeliveryInfoChip
          className={`novel-delivery-handoff-sync-tag novel-delivery-handoff-sync-tag-${deliverySummary.chapterHandoffSync.status}`}
          label={`章首承接 · ${deliverySummary.chapterHandoffSync.label}`}
          items={[
            ...(deliverySummary.chapterHandoffSync.evidence || []).map((item: string) => `证据：${item}`),
            ...(deliverySummary.chapterHandoffSync.nextActions || []).map((item: string) => `动作：${item}`),
            deliverySummary.chapterHandoffSync.label,
          ]}
        />
      )}

      {deliverySummary.chapterHandoffDeltaSync && (
        <DeliveryInfoChip
          className={`novel-delivery-handoff-delta-tag novel-delivery-handoff-delta-tag-${deliverySummary.chapterHandoffDeltaSync.status}`}
          label={`章末交接 · ${deliverySummary.chapterHandoffDeltaSync.label}`}
          items={[
            ...(deliverySummary.chapterHandoffDeltaSync.evidence || []).map((item: string) => `证据：${item}`),
            ...(deliverySummary.chapterHandoffDeltaSync.nextActions || []).map((item: string) => `动作：${item}`),
            deliverySummary.chapterHandoffDeltaSync.label,
          ]}
        />
      )}

      {deliverySummary.writePreparation && (
        <DeliveryInfoChip
          className={`novel-delivery-write-preparation-tag novel-delivery-write-preparation-tag-${deliverySummary.writePreparation.status}`}
          label={`写前准备 · ${deliverySummary.writePreparation.label}`}
          items={[
            ...(deliverySummary.writePreparation.evidence || []).map((item: string) => `证据：${item}`),
            ...(deliverySummary.writePreparation.nextActions || []).map((item: string) => `动作：${item}`),
            deliverySummary.writePreparation.label,
          ]}
        />
      )}

      {deliverySummary.approvalBlocker && (
        <DeliveryInfoChip
          className={`novel-delivery-approval-blocker-tag novel-delivery-approval-blocker-tag-${deliverySummary.approvalBlocker.status}`}
          label={`${deliverySummary.approvalBlocker.scoreLabel} · ${deliverySummary.approvalBlocker.label}`}
          items={[
            deliverySummary.approvalBlocker.detail,
            ...(deliverySummary.approvalBlocker.reasons || []).map((item: string) => `原因：${item}`),
            deliverySummary.approvalBlocker.label,
          ]}
        />
      )}

      {deliverySummary.platformRubric && (
        <DeliveryInfoChip
          className={`novel-delivery-platform-tag novel-delivery-platform-tag-${deliverySummary.platformRubric.status}`}
          label={deliverySummary.platformRubric.scoreLabel}
          items={[
            ...(deliverySummary.platformRubric.missed || []).map((item: string) => `未达标：${item}`),
            ...(deliverySummary.platformRubric.evidence || []).map((item: string) => `证据：${item}`),
            deliverySummary.platformRubric.rubricSource ? `来源：${deliverySummary.platformRubric.rubricSource}` : '',
            deliverySummary.platformRubric.label,
          ]}
        />
      )}

      {deliverySummary.readabilityReview && (
        <>
          <DeliveryInfoChip
            className="novel-delivery-readability-tag"
            label={deliverySummary.readabilityReview.scoreLabel}
            items={[deliverySummary.readabilityReview.scoreLabel, deliverySummary.readabilityReview.memeLabel]}
          />
          <DeliveryInfoChip
            className="novel-delivery-readability-tag"
            label={deliverySummary.readabilityReview.memeLabel}
            items={[deliverySummary.readabilityReview.memeLabel]}
          />
          {deliverySummary.readabilityReview.riskCount > 0 && (
            <DeliveryInfoChip
              className="novel-delivery-readability-tag novel-delivery-readability-tag-warn"
              label={deliverySummary.readabilityReview.riskLabel}
              items={[
                deliverySummary.readabilityReview.riskLabel,
                ...(deliverySummary.readabilityReview.aiSmellTactics || []).map((item: string) => `去AI味建议：${item}`),
              ]}
            />
          )}
        </>
      )}
    </div>
  )
}
