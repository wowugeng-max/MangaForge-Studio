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
    ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run-deterministic.ts','prose-self-review-run-normalize.ts','prose-self-review-run-revision.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(serviceDir, name), 'utf8')).join('\n'),
    ['story-state-machine.ts','story-state-machine-prepare.ts','story-state-machine-update.ts'].map((name) => readFileSync(join(serviceDir, name), 'utf8')).join('\n'),
  ].join('\n')
}

describe('storyline sync b b', () => {
  test('keeps next-chapter quality plan receipt sync open when delivered evidence is not in prose', () => {
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '续航证据错位',
        chapter_text: '他把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
      },
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
              evidence: '林青禾在雨巷交出青玉簪。',
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
    expect(report.missed[0].text).toContain('无法定位')
  })

  test('keeps next-chapter quality plan receipt sync open when staged evidence lands in the wrong section', () => {
    const chapterText = [
      '林青禾刚推开门，就在第一段查到账册缺页，执事的脸色当场变了。',
      '第一幕继续压住现场目标。'.repeat(40),
      '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
      '中段继续推进追查。'.repeat(40),
      '钟声响起前，广播室名单在桌角翻开，所有人的呼吸都停了一拍。',
    ].join('')
    const report = buildNextChapterQualityPlanReceiptSyncReport(
      {
        id: 10,
        chapter_no: 10,
        title: '续航落点错位',
        chapter_text: chapterText,
      },
      {
        chapter_target: {
          delivery_risk_carry_over: {
            quality_focus: ['章首接住腰牌钩子'],
            opening_actions: ['用腰牌血迹直接引出阵堂旧案'],
            middle_actions: ['中段查到账册缺页'],
            ending_actions: ['章尾压出广播室名单'],
          },
        },
      },
      {
        review: {
          next_chapter_quality_plan_receipts: [
            {
              key: 'opening_actions',
              label: '章首腰牌承接',
              delivered: true,
              evidence: '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
            {
              key: 'middle_actions',
              label: '中段账册推进',
              delivered: true,
              evidence: '林青禾刚推开门，就在第一段查到账册缺页，执事的脸色当场变了。',
              remaining_risk: '',
            },
            {
              key: 'ending_actions',
              label: '章尾名单钩子',
              delivered: true,
              evidence: '他走到阵堂深处，才把带血腰牌翻到灯下，阵堂旧案的第三个名字露出来。',
              remaining_risk: '',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(3)
    expect(report.missed_count).toBe(3)
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('前300字')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('中段')
    expect(report.missed.map((item: any) => item.text).join('｜')).toContain('最后300字')
  })

  test('builds fallback status filter receipts from state tracking contract when model omits them', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选兜底闭环',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        review: { score: 82 },
        revision: {},
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBeGreaterThanOrEqual(2)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'character_states_1',
      'world_constraints_1',
    ]))
    expect(report.completed.find((item: any) => item.key === 'character_states_1')).toMatchObject({
      used_in_chapter: true,
    })
    expect(report.completed.find((item: any) => item.key === 'world_constraints_1')).toMatchObject({
      used_in_chapter: false,
    })
  })

  test('closes status filter receipt sync when used and excluded states are accounted for', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态筛选闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            foreshadowing_threads: ['旧印缺页'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾只递出半枚旧印，没有说出完整名单。',
                  remaining_risk: '',
                },
                {
                  key: 'world_constraint_outer_city',
                  label: '外城禁令',
                  used_in_chapter: false,
                  excluded_reason: '本章只在阵堂内审旧印，外城禁令不会影响本章正确性。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.requires_receipts).toBe(true)
    expect(report.receipt_count).toBe(2)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining(['character_state_linqinghe', 'world_constraint_outer_city']))
  })

  test('keeps status filter receipt sync open when used state evidence is generic', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态筛选伪闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  status: 'pass',
                  used_in_chapter: true,
                  evidence: '已核对。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '林青禾认知边界',
    })
    expect(report.missed[0].text).toContain('可定位正文证据')
    expect(report.missed[0].evidence).toContain('已核对')
  })

  test('keeps status filter receipt sync open when excluded state reason is generic', () => {
    const report = buildStatusFilterReceiptSyncReport(
      { id: 9, chapter_no: 9, title: '状态排除伪闭环' },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'world_constraint_outer_city',
                  label: '外城禁令',
                  status: 'ok',
                  used_in_chapter: false,
                  excluded_reason: '已核对。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '外城禁令',
    })
    expect(report.missed[0].text).toContain('具体 excluded_reason')
    expect(report.missed[0].excluded_reason).toContain('已核对')
  })

  test('keeps status filter receipt sync open when used state evidence is not in prose', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选证据错位',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'character_state_linqinghe',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾当场说出完整旧案名单。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'status_filter_receipts',
      label: '林青禾认知边界',
    })
    expect(report.missed[0].text).toContain('无法定位')
  })

  test('falls back to state tracking contract when model status receipts are stale after revision', () => {
    const report = buildStatusFilterReceiptSyncReport(
      {
        id: 9,
        chapter_no: 9,
        title: '状态筛选兜底修复',
        chapter_text: '林青禾只递出半枚旧印，没有说出完整名单。',
      },
      {
        chapter_target: {
          state_tracking_contract: {
            character_states: ['林青禾：只知道半枚旧印，不知道完整旧案名单'],
            world_constraints: ['外城禁令只影响城门场景'],
            filter_rules: ['只加载本章会写错的角色认知和伏笔前史'],
          },
        },
      },
      {
        revised: true,
        review: {
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              status_filter_receipts: [
                {
                  key: 'stale_character_state',
                  label: '林青禾认知边界',
                  used_in_chapter: true,
                  evidence: '林青禾当场说出完整旧案名单。',
                  remaining_risk: '',
                },
              ],
            },
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.fallback_generated).toBe(true)
    expect(report.missed_count).toBe(0)
    expect(report.completed.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'character_states_1',
      'world_constraints_1',
    ]))
  })

  test('warns when revision changes chapter length beyond oh-story scope guard', () => {
    const report = buildRevisionScopeGuardSyncReport(
      { id: 8, chapter_no: 8, title: '修订幅度复核' },
      {
        revised: true,
        original_text: '原'.repeat(4000),
        final_text: '改'.repeat(2400),
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toContain('修订幅度过大')
    expect(report.original_word_count).toBe(4000)
    expect(report.revised_word_count).toBe(2400)
    expect(report.delta_word_count).toBe(1600)
    expect(report.allowed_delta_word_count).toBe(1200)
    expect(report.delta_ratio).toBeGreaterThan(0.3)
    expect(report.next_actions.join('；')).toContain('30%')
    expect(report.next_actions.join('；')).toContain('800 字')
    expect(report.next_actions.join('；')).toContain('不要重写整章')
  })

  test('keeps revision scope guard open when revised text lacks auditable word counts', () => {
    const report = buildRevisionScopeGuardSyncReport(
      { id: 8, chapter_no: 8, title: '修订幅度复核' },
      {
        revised: true,
        revision_scope_guard: {
          scope_warning: '',
          reason: '已局部修订。',
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订幅度无法确认')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0]).toMatchObject({
      key: 'revision_scope_guard',
      label: '修订幅度缺少字数',
    })
    expect(report.missed[0].text).toContain('original_word_count')
    expect(report.missed[0].text).toContain('revised_word_count')
    expect(report.next_actions.join('；')).toContain('revision_scope_guard')
  })

  test('builds revision cascade impact sync from revision receipts that affect future chapters', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '把旧印章从林青禾持有改成执事收回。',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9, 10],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
                {
                  type: 'relationship',
                  target: '李玄与林青禾互信线',
                  impact: '有限作证仍成立，但不能写成无条件结盟。',
                  required_action: '保持有限作证边界。',
                },
              ],
            },
            {
              issue_index: 1,
              severity: 'S3',
              category: 'prose',
              applied_fix: '压缩解释句。',
              changed_evidence: '三句压成一句。',
              cascade_impacts: [],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订级联影响 2')
    expect(report.missed_count).toBe(2)
    expect(report.missed[0].target).toBe('旧印章归属')
    expect(report.missed[0].affected_chapters).toEqual([9, 10])
    expect(report.missed.map((item: any) => item.required_action).join('｜')).toContain('有限作证边界')
    expect(report.next_actions.join('；')).toContain('后续章节')
  })

  test('builds revision cascade impact sync from nested oh-story revision receipts', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                issue_index: 0,
                severity: 'S2',
                category: 'continuity',
                applied_fix: '把旧印章从林青禾持有改成执事收回。',
                changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                affected_chapters: [9, 10],
                cascade_impacts: [
                  {
                    type: 'foreshadowing',
                    target: '旧印章归属',
                    impact: '后续不能让林青禾直接持有旧印章。',
                    required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  },
                ],
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订级联影响 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].target).toBe('旧印章归属')
    expect(report.missed[0].affected_chapters).toEqual([9, 10])
    expect(report.missed[0].evidence).toContain('旧印章扣进袖中')
  })

  test('warns when revision cascade impacts lack changed evidence from the revised prose', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '',
              changed_evidence: '',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(1)
    expect(report.evidence_missing.map((item: any) => item.target)).toContain('旧印章归属')
    expect(report.next_actions.join('；')).toContain('changed_evidence')
  })

  test('warns when revision cascade impact evidence cannot be located in revised prose', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的旧印',
        chapter_text: '林青禾把账册推回桌边，只承认旧印章曾经被人调包。',
      },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              applied_fix: '把旧印章从林青禾持有改成执事收回。',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  type: 'foreshadowing',
                  target: '旧印章归属',
                  impact: '后续不能让林青禾直接持有旧印章。',
                  required_action: '第9章开篇改为林青禾只递出半枚印纹。',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.evidence_missing_count).toBe(0)
    expect(report.evidence_unlocated_count).toBe(1)
    expect(report.evidence_unlocated[0].target).toBe('旧印章归属')
    expect(report.evidence_unlocated[0].evidence_location_risk).toContain('无法定位到修订后正文')
    expect(report.next_actions.join('；')).toContain('无法定位')
  })

  test('records missing required fields in revision cascade impacts', () => {
    const report = buildRevisionCascadeImpactSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的旧印' },
      {
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'continuity',
              changed_evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
              affected_chapters: [9],
              cascade_impacts: [
                {
                  target: '旧印章归属',
                  evidence: '执事把旧印章扣进袖中，只留半枚印纹。',
                },
              ],
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.structure_missing_count).toBe(1)
    expect(report.structure_missing[0]).toMatchObject({
      target: '旧印章归属',
      missing_fields: ['type', 'impact', 'required_action'],
    })
    expect(report.missed[0].missing_fields).toEqual(['type', 'impact', 'required_action'])
    expect(report.next_actions.join('；')).toContain('type, target, impact, required_action, evidence/source_excerpt')
  })

  test('prose quality stores a revision_cascade_impact_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('buildRevisionCascadeImpactSyncReviewRecord({ projectId, chapter, sync: revisionCascadeImpactSync })')
    expect(reviewRecordSource).toContain("review_type: 'revision_cascade_impact_sync'")
    expect(source).toContain('buildRevisionCascadeImpactSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionCascadeImpactSync', 'revision_cascade_impact_sync']")
    expect(source).toContain('cascade_impacts 必须逐项写 type, target, impact, required_action, evidence 或 source_excerpt')
  })

  test('prose quality stores a revision_scope_guard_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain('buildRevisionScopeGuardSyncReviewRecord({ projectId, chapter, selfCheck, sync: revisionScopeGuardSync })')
    expect(reviewRecordSource).toContain("review_type: 'revision_scope_guard_sync'")
    expect(source).toContain('buildRevisionScopeGuardSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['revisionScopeGuardSync', 'revision_scope_guard_sync']")
    expect(source).toContain('revision_scope_guard')
  })

  test('prose quality stores a prose_revision_receipt_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'prose_revision_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildProseRevisionReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['proseRevisionReceiptSync', 'prose_revision_receipt_sync']")
  })

  test('prose quality stores a deslop_repair_receipt_sync review', () => {
    const source = readGenerateChapterPipelineSource()
    const postDeliverySource = readPostDeliveryStoryStateUpdateSource()
    const reviewRecordSource = readPostDeliverySyncReviewRecordSource()

    expect(source).toContain("reviewType: 'deslop_repair_receipt_sync'")
    expect(reviewRecordSource).toContain('review_type: input.reviewType')
    expect(source).toContain('buildDeslopRepairReceiptSyncReport(chapter, selfCheck)')
    expect(postDeliverySource).toContain("['deslopRepairReceiptSync', 'deslop_repair_receipt_sync']")
    expect(source).toContain('buildSkippedPostDeliveryStoryStateUpdate({')
  })

})
