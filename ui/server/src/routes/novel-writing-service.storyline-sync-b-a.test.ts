import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildAssetStateDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildDeslopRepairReceiptSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildNextChapterQualityPlanReceiptSyncReport,
  buildProseRevisionReceiptSyncReport,
  buildQualityAuditRepairReceiptSyncReport,
  buildRelationshipDeltaSyncReport,
  buildRevisionCascadeImpactSyncReport,
  buildRevisionScopeGuardSyncReport,
  buildStateDeltaCompletenessReport,
  buildStatusFilterReceiptSyncReport,
  buildStorylineSyncReport,
  buildTimelineDeltaSyncReport,
  mergeProseRevisionArtifacts,
} from '../novel-writing-service'
import {
  buildRevisionCascadeImpactSyncReviewRecord,
  buildRevisionScopeGuardSyncReviewRecord,
  buildStorylineSyncReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'
import { buildSkippedPostDeliveryStoryStateUpdate } from '../novel-writing/post-delivery-story-state-update'

const readPostDeliveryStoryStateUpdateSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-story-state-update.ts'), 'utf8')
const readPostDeliverySyncReviewRecordSource = () => readFileSync(join(import.meta.dir, '../novel-writing/post-delivery-sync-review-record.ts'), 'utf8')

const readGenerateChapterPipelineSource = () => {
  const serviceDir = join(import.meta.dir, '../novel-writing-service/service')
  return [
    readFileSync(join(serviceDir, 'generate-chapter-for-group-methods.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-context-scene-cards.ts'), 'utf8'), readFileSync(join(serviceDir, 'generate-chapter-draft-prose.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-editor-meme-polish.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore-loop.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-quality-prestore-finalize.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-prestore-receipt-reviews.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-acceptance-prep.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-full-production-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-draft-mode-store.ts'), 'utf8'),
    ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(serviceDir, name), 'utf8')).join('\n'),
    readFileSync(join(serviceDir, 'story-state-machine.ts'), 'utf8'),
  ].join('\n')
}

describe('storyline sync b a', () => {
  test('keeps deslop repair receipt sync open when changed evidence is generic', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的指代伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                applied_fix: '改成城门失守的可见动作。',
                changed_evidence: '见修订稿。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('见修订稿')
  })

  test('keeps deslop repair receipt sync open when changed evidence is not in revised prose', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '去AI味后的虚构证据',
        chapter_text: '城门方向只剩冷灰，主角把旧账册塞回袖中，转身去追报信人。',
      },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          deslop_checks: [
            {
              gate: 'Gate F',
              pattern: '章末总结升华',
              status: 'fail',
              evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
              fix: '改成可见动作、代价和未解压力。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            deslop_repair_receipts: [
              {
                gate: 'Gate F',
                label: '章末总结升华',
                original_evidence: '这一刻，他终于明白真正的成长不是赢，而是学会承担。',
                applied_fix: '改成城门失守的可见动作。',
                changed_evidence: '城门方向的火把忽然断成两截，他把腰牌压进掌心。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('无法定位到修订后正文')
    expect(report.missed[0].evidence).toContain('城门方向的火把')
  })

  test('warns when quality audit repair ran but quality audit repair receipts are missing', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的裂缝' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('质量诊断修复回执未生成')
    expect(report.missed[0].text).toContain('无法确认质量诊断缺口是否逐项闭环')
    expect(report.missed[0].evidence).toContain('章节推进')
    expect(report.next_actions.join('；')).toContain('quality_audit_repair_receipts')
  })

  test('uses nested oh-story quality audit repair receipts to close quality audit repair sync', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '守军听完旧证后立刻改了城门换防令。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('质量诊断修复回执 OK')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
  })

  test('keeps quality audit repair receipt sync open when changed evidence is not in revised prose', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '诊断修复后的虚构证据',
        chapter_text: '旧证被摊在桌上，守军没有立刻表态，只让主角明日再来。',
      },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '守军听完旧证后立刻改了城门换防令。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('无法定位到修订后正文')
    expect(report.missed[0].evidence).toContain('守军听完旧证')
  })

  test('keeps quality audit repair receipt sync open when changed evidence is generic', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已修复')
  })

  test('keeps quality audit repair receipt sync open when changed evidence only says it was adjusted', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的调整伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已经调整。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已经调整')
  })

  test('keeps quality audit repair receipt sync open when changed evidence only says it was supplemented', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的补充伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '已经补充。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('已经补充')
  })

  test('keeps quality audit repair receipt sync open when changed evidence points vaguely to revised prose', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的指代伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                changed_evidence: '详见修订后正文。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('changed_evidence 证据泛化')
    expect(report.missed[0].evidence).toContain('详见修订后正文')
  })

  test('keeps quality audit repair receipt sync open when changed evidence is missing', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的缺证据闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                check_key: 'chapter_progress',
                label: '章节推进',
                original_evidence: '删掉这章不影响理解，旧证没有改变局势。',
                applied_fix: '让旧证触发守军换防。',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
    expect(report.missed[0].evidence).toContain('让旧证触发守军换防')
  })

  test('keeps quality audit repair receipt sync open when keyed receipt omits changed evidence', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的键名伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                key: 'chapter_progress',
                label: '章节推进',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

  test('keeps quality audit repair receipt sync open when labeled receipt omits changed evidence', () => {
    const report = buildQualityAuditRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '诊断修复后的标签伪闭环' },
      {
        revised: true,
        review: {
          score: 82,
          needs_revision: true,
          quality_audit_checks: [
            {
              key: 'chapter_progress',
              label: '章节推进',
              status: 'fail',
              evidence: '删掉这章不影响理解，旧证没有改变局势。',
              fix: '补局势变化，让旧证逼出新目标。',
              strategy: 'rewrite',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            quality_audit_repair_receipts: [
              {
                label: '章节推进',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('质量诊断修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

  test('warns when next-chapter quality plan debt lacks receipts', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航未闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: { score: 82 },
        revision: {},
      },
    )

    expect(report.status).toBe('warn')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(0)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].key).toBe('next_chapter_quality_plan_receipts')
    expect(report.next_actions.join('；')).toContain('next_chapter_quality_plan_receipts')
  })

  test('closes next-chapter quality plan receipt sync when receipts are delivered', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              delivered: true,
              evidence: '他把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].evidence).toContain('带血腰牌')
  })

  test('keeps next-chapter quality plan receipt sync open when delivered receipts lack evidence', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航证据缺失' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首承接',
              delivered: true,
              evidence: '',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '章首承接',
    })
    expect(report.missed[0].text).toContain('缺少 evidence')
    expect(report.next_actions.join('；')).toContain('evidence')
  })

  test('keeps next-chapter quality plan receipt sync open when delivered evidence is generic', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '续航伪闭环' },
      {
        chapter_target: {
          delivery_risk_carry_over: [
            {
              quality_focus: '章首必须承接上一章追读钩子',
              opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
              avoid_repetition: ['不要再写众人沉默'],
            },
          ],
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首承接',
              status: 'pass',
              delivered: true,
              evidence: '已完成。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '章首承接',
    })
    expect(report.missed[0].text).toContain('可定位正文证据')
    expect(report.missed[0].evidence).toContain('已完成')
  })

})
