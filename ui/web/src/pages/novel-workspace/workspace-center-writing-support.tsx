import React from 'react'
import { Input, Modal, Space, Typography } from 'antd'
import { DeslopGateDiagnosticsPanel } from './workspace-center-chrome'
import { WorkspaceWritingQueueStrip } from './workspace-center-writing-queue-strip'
import { WorkspaceDeliveryStatusStrip } from './workspace-center-delivery-status-strip'
import { WorkspaceChapterHandoffStrip } from './workspace-center-chapter-handoff-strip'
import { WorkspaceDraftBriefStrip } from './workspace-center-draft-brief-strip'

const { Text } = Typography

export function WorkspaceCenterWritingSupport(props: Record<string, any>) {
  const {
    blueprintEditorError,
    blueprintEditorOpen,
    blueprintEditorText,
    chapterHandoffDesk,
    currentQueueItem,
    deliveryActionLoading,
    deliveryNeedsStorySync,
    deliveryNextStepText,
    deliveryQualityDetail,
    deliveryQualityPending,
    deliveryStoryDetail,
    deliverySummary,
    draftBriefActionLoading,
    draftBriefSummary,
    generatingProse,
    generationTargetWordCount,
    ipSceneIntakeTooltip,
    onDeliveryAction,
    onDisableStyleSamples,
    onLockStyleSamples,
    onOpenStoryAssets,
    onRepairDeslopGate,
    onRepairWritingQueuePlanBatch,
    onReplaceStyleSamples,
    onSavePreDraftBrief,
    openChapterBlueprintEditor,
    preDraftBriefLoading,
    queueFocus,
    runDraftBriefAction,
    saveChapterBlueprintEditor,
    selectWritingQueueChapter,
    setBlueprintEditorError,
    setBlueprintEditorOpen,
    setBlueprintEditorText,
    styleSampleActionDisabled,
    styleSampleActionLoading,
    writingQueue,
  } = props

  return (
    <>
      <WorkspaceWritingQueueStrip
        currentQueueItem={currentQueueItem}
        deliverySummary={deliverySummary}
        onRepairWritingQueuePlanBatch={onRepairWritingQueuePlanBatch}
        queueFocus={queueFocus}
        selectWritingQueueChapter={selectWritingQueueChapter}
        writingQueue={writingQueue}
      />
      <WorkspaceDeliveryStatusStrip
        deliveryActionLoading={deliveryActionLoading}
        deliveryNeedsStorySync={deliveryNeedsStorySync}
        deliveryNextStepText={deliveryNextStepText}
        deliveryQualityDetail={deliveryQualityDetail}
        deliveryQualityPending={deliveryQualityPending}
        deliveryStoryDetail={deliveryStoryDetail}
        deliverySummary={deliverySummary}
        ipSceneIntakeTooltip={ipSceneIntakeTooltip}
        onDeliveryAction={onDeliveryAction}
        onOpenStoryAssets={onOpenStoryAssets}
      />
      <DeslopGateDiagnosticsPanel
        diagnostics={deliverySummary?.deslopGateDiagnostics}
        onRepairDeslopGate={onRepairDeslopGate}
        repairLoading={deliveryActionLoading}
      />
      <WorkspaceChapterHandoffStrip
        chapterHandoffDesk={chapterHandoffDesk}
        deliveryActionLoading={deliveryActionLoading}
        onDeliveryAction={onDeliveryAction}
      />
      <WorkspaceDraftBriefStrip
        draftBriefActionLoading={draftBriefActionLoading}
        draftBriefSummary={draftBriefSummary}
        generatingProse={generatingProse}
        generationTargetWordCount={generationTargetWordCount}
        onDisableStyleSamples={onDisableStyleSamples}
        onLockStyleSamples={onLockStyleSamples}
        onReplaceStyleSamples={onReplaceStyleSamples}
        onSavePreDraftBrief={onSavePreDraftBrief}
        openChapterBlueprintEditor={openChapterBlueprintEditor}
        preDraftBriefLoading={preDraftBriefLoading}
        runDraftBriefAction={runDraftBriefAction}
        styleSampleActionDisabled={styleSampleActionDisabled}
        styleSampleActionLoading={styleSampleActionLoading}
      />
        <Modal
          title="编辑章节蓝图合同"
          open={blueprintEditorOpen}
          width={860}
          okText="保存蓝图"
          cancelText="取消"
          confirmLoading={Boolean(preDraftBriefLoading)}
          onOk={saveChapterBlueprintEditor}
          onCancel={() => setBlueprintEditorOpen(false)}
          destroyOnClose
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Input.TextArea
              value={blueprintEditorText}
              onChange={(event) => {
                setBlueprintEditorText(event.target.value)
                if (blueprintEditorError) setBlueprintEditorError('')
              }}
              autoSize={{ minRows: 16, maxRows: 26 }}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12 }}
            />
            {blueprintEditorError && <Text type="danger">{blueprintEditorError}</Text>}
          </Space>
        </Modal>
  </>
  )
}
