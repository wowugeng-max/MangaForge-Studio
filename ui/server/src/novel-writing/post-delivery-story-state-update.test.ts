import { describe, expect, test } from 'bun:test'
import {
  buildPostDeliveryStoryStateUpdate,
  buildSkippedPostDeliveryStoryStateUpdate,
} from './post-delivery-story-state-update'

describe('post-delivery story-state update helpers', () => {
  test('builds the full pipeline story-state update with post-delivery sync reports', () => {
    const update = buildPostDeliveryStoryStateUpdate(
      {
        merged: true,
        timeline_delta_sync: { status: 'ok' },
        chapter_handoff_delta_sync: { status: 'warn' },
      },
      {
        proseRevisionReceiptSync: { requires_receipts: true },
        deterministicProseCleanup: { risk_count: 2 },
        artifactProtocolReceiptSync: { status: 'ok' },
        dialogueSync: { label: '对白 OK' },
        readerPayoffSync: { missed: [] },
        coreContractSync: { status: 'warn' },
      },
    )

    expect(update).toMatchObject({
      merged: true,
      timeline_delta_sync: { status: 'ok' },
      chapter_handoff_delta_sync: { status: 'warn' },
      prose_revision_receipt_sync: { requires_receipts: true },
      deterministic_prose_cleanup: { risk_count: 2 },
      artifact_protocol_receipts_sync: { status: 'ok' },
      dialogue_sync: { label: '对白 OK' },
      reader_payoff_sync: { missed: [] },
      core_contract_sync: { status: 'warn' },
    })
  })

  test('builds skipped story-state update for draft-only quality gate returns', () => {
    const update = buildSkippedPostDeliveryStoryStateUpdate({
      proseRevisionReceiptSync: { status: 'warn' },
      deslopRepairReceiptSync: { status: 'ok' },
      writePreparationReceiptSync: { requires_receipts: true },
      deterministicProseCleanup: { label: '确定性清理残留' },
      coreDrift: { status: 'warn' },
      coreContractSync: { status: 'ok' },
    })

    expect(update).toMatchObject({
      skipped: true,
      prose_revision_receipt_sync: { status: 'warn' },
      deslop_repair_receipt_sync: { status: 'ok' },
      write_preparation_receipts_sync: { requires_receipts: true },
      deterministic_prose_cleanup: { label: '确定性清理残留' },
      core_drift: { status: 'warn' },
      core_contract_sync: { status: 'ok' },
    })
  })
})
