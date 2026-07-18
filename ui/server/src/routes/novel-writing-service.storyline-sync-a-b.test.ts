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
    readFileSync(join(serviceDir, 'generate-chapter-acceptance-prep.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-full-production-store.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'generate-chapter-draft-mode-store.ts'), 'utf8'),
    ['prose-self-review-methods.ts','prose-self-review-prompts.ts','prose-self-review-policy.ts','prose-self-review-run.ts'].map((name) => readFileSync(join(serviceDir, name), 'utf8')).join('\n'),
    readFileSync(join(serviceDir, 'story-state-machine.ts'), 'utf8'),
    readFileSync(join(serviceDir, 'story-state-helpers.ts'), 'utf8'),
  ].join('\n')
}

describe('storyline sync a b', () => {
  test('builds chapter handoff delta sync from ending hook and next chapter state only', () => {
    const contextPackage = {
      chapter_target: {
        ending_hook: '第二个证人说出旧案当晚还有第三个人。',
        page_turn_hook_brief: {
          next_chapter_pull: '第三个人的名字会改变旧案归属。',
        },
        scene_cards: [
          { scene_no: 2, title: '证词裂口', ending_hook_seed: '第三个人藏在缺页背面。' },
        ],
      },
    }
    const okReport = buildChapterHandoffDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      contextPackage,
      {
        open_questions: ['旧案当晚的第三个人是谁'],
        next_chapter_priorities: ['第三个人的名字会改变旧案归属'],
      },
    )
    const warnReport = buildChapterHandoffDeltaSyncReport(
      { id: 8, chapter_no: 8, title: '第二个证人' },
      contextPackage,
      {
        open_questions: [],
        next_chapter_priorities: [],
      },
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章末交接 OK')
    expect(okReport.planned_count).toBeGreaterThanOrEqual(2)
    expect(okReport.recorded_count).toBe(2)
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(warnReport.next_actions.join('；')).toContain('只补本章章末交接')
  })

  test('reads raw camelCase chapter handoff delta brief after delivery', () => {
    const chapter = {
      id: 8,
      chapter_no: 8,
      title: '第二个证人',
      raw_payload: {
        preDraftBrief: {
          endingHook: '第二个证人说出旧案当晚还有第三个人。',
          pageTurnHookBrief: {
            nextChapterPull: '第三个人的名字会改变旧案归属。',
          },
        },
      },
    }
    const report = buildChapterHandoffDeltaSyncReport(
      chapter,
      {},
      {
        open_questions: ['旧案当晚的第三个人是谁'],
        next_chapter_priorities: ['第三个人的名字会改变旧案归属'],
      },
    )

    expect(report.status).toBe('ok')
    expect(report.label).toBe('章末交接 OK')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(report.missed_count).toBe(0)
  })

  test('reads camelCase chapterTarget handoff delta from runtime context', () => {
    const contextPackage = {
      chapterTarget: {
        endingHook: '旧案当晚的第三个人把缺页藏进禁库门牌。',
        pageTurnHookBrief: {
          nextChapterPull: '下一章必须追查禁库门牌是谁留下的。',
        },
      },
    }
    const report = buildChapterHandoffDeltaSyncReport(
      { id: 9, chapter_no: 9, title: '禁库门牌' },
      contextPackage,
      {
        openQuestions: ['旧案当晚的第三个人为什么把缺页藏进禁库门牌'],
        nextChapterPriorities: ['下一章必须追查禁库门牌是谁留下的'],
      },
    )

    expect(report.status).toBe('ok')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['章末追读', '下一章拉力']))
    expect(report.missed_count).toBe(0)
  })

  test('story state sync persists a chapter_handoff_delta_sync review', () => {
    const source = readGenerateChapterPipelineSource()

    expect(source).toContain("reviewType: 'chapter_handoff_delta_sync'")
    expect(source).toContain('buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDelta)')
    expect(source).toContain('payload.chapter_handoff_delta_sync = chapterHandoffDeltaSync')
  })

  test('builds prose revision receipt sync from post-revision residual risks only', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        review: {
          score: 82,
          issues: [
            { severity: 'S2', category: 'prose', evidence: '他心中泛起复杂情绪', fix: '改成动作和对白' },
          ],
        },
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'prose',
              original_evidence: '他心中泛起复杂情绪',
              applied_fix: '补了握紧账册和逼问对白',
              changed_evidence: '他把账册按在案上，问林青禾还敢不敢作证。',
              remaining_risk: '仍有抽象心理描写，没有改成动作和对白。',
            },
            {
              issue_index: 1,
              severity: 'S3',
              category: 'pacing',
              original_evidence: '解释偏长',
              applied_fix: '压缩说明',
              changed_evidence: '三句压成一句。',
              remaining_risk: '无',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('抽象心理描写')
    expect(report.missed[0].evidence).toContain('他把账册按在案上')
    expect(report.next_actions.join('；')).toContain('只补修订后仍残留')
  })

  test('merges multi-pass revision artifacts instead of dropping earlier quality repair receipts', () => {
    const merged = mergeProseRevisionArtifacts({
      revision_receipts: [
        {
          issue_index: 1,
          applied_fix: '修复承接风险',
          changed_evidence: '江哲把清算倒计时压进最后三十息。',
        },
      ],
      oh_story_delivery_receipts: {
        delivery_risk_receipts: [
          {
            risk_item: '质量续航',
            required_action: '维持冲突压力与章尾翻页',
            delivered: true,
            evidence: '清算倒计时：三十息。',
            remaining_risk: '',
          },
        ],
      },
    }, {
      deslop_repair_receipts: [
        {
          gate: 'A',
          changed_evidence: '枪身符文倒卷，勒住追索者食指。',
          remaining_risk: '',
        },
      ],
      oh_story_delivery_receipts: {
        deslop_repair_receipts: [
          {
            gate: 'A',
            changed_evidence: '枪身符文倒卷，勒住追索者食指。',
            remaining_risk: '',
          },
        ],
      },
    })

    expect(merged.revision_receipts).toHaveLength(1)
    expect(merged.deslop_repair_receipts).toHaveLength(1)
    expect(merged.oh_story_delivery_receipts.delivery_risk_receipts).toHaveLength(1)
    expect(merged.oh_story_delivery_receipts.deslop_repair_receipts).toHaveLength(1)
  })

  test('warns when prose was revised but revision receipts are missing', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          score: 82,
          issues: [
            { severity: 'S2', category: 'prose', evidence: '他心中泛起复杂情绪', fix: '改成动作和对白' },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('修订回执未生成')
    expect(report.missed[0].text).toContain('无法确认修订是否逐条闭环')
    expect(report.next_actions.join('；')).toContain('revision_receipts')
  })

  test('warns when failed delivery risk receipts are not matched by revision receipts', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          revision_receipts: [
            {
              issue_index: 0,
              severity: 'S2',
              category: 'prose',
              original_evidence: '解释偏长',
              applied_fix: '压缩说明',
              changed_evidence: '三句压成一句。',
              remaining_risk: '无',
            },
          ],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].category).toBe('delivery_risk_receipt')
    expect(report.missed[0].text).toContain('缺少对应交稿风险修订回执')
    expect(report.missed[0].text).toContain('章末把带血腰牌')
    expect(report.missed[0].evidence).toContain('最后300字没有形成追读钩子')
    expect(report.next_actions.join('；')).toContain('delivery_risk_receipts')
    expect(report.next_actions.join('；')).toContain('changed_evidence')
  })

  test('uses stored oh-story revision receipts to close delivery risk receipt sync', () => {
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的裂缝',
        raw_payload: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].changed_evidence).toContain('带血腰牌')
  })

  test('uses nested revision oh-story receipts to close delivery risk receipt sync before storage', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的裂缝' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                changed_evidence: '带血腰牌翻到背面，刻着阵堂旧案当夜的第三个名字。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('ok')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
    expect(report.completed[0].changed_evidence).toContain('带血腰牌')
  })

  test('keeps prose revision receipt sync open when a matched receipt omits changed evidence', () => {
    const report = buildProseRevisionReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '修订后的缺证据闭环' },
      {
        revised: true,
        review: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              repair_segment: 'ending_actions',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '把腰牌血迹变成阵堂旧案的新问题。',
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
    expect(report.missed[0].evidence).toContain('把腰牌血迹变成阵堂旧案的新问题')
  })

  test('keeps prose revision receipt sync open when changed evidence lands outside repair segment', () => {
    const middleEvidence = '中段证据：带血腰牌被夹在账册里翻出，林青禾当场改口。'
    const chapterText = [
      '开篇只写掌柜关门和主角复盘旧案。'.padEnd(320, '开'),
      middleEvidence,
      '章末只写众人沉默退场，没有新的追读钩子。'.padStart(320, '末'),
    ].join('')
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的错位证据',
        chapter_text: chapterText,
      },
      {
        revised: true,
        revision: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                applied_fix: '补了腰牌血迹和旧案名字。',
                changed_evidence: middleEvidence,
                remaining_risk: '',
              },
            ],
          },
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('最后300字')
    expect(report.missed[0].evidence).toContain('带血腰牌被夹在账册里')
  })

  test('keeps residual risks from stored oh-story revision receipts open', () => {
    const report = buildProseRevisionReceiptSyncReport(
      {
        id: 8,
        chapter_no: 8,
        title: '修订后的裂缝',
        raw_payload: {
          oh_story_delivery_receipts: {
            revision_receipts: [
              {
                severity: 'S2',
                category: 'prose',
                applied_fix: '补了一句追问。',
                changed_evidence: '他追问腰牌从哪里来。',
                remaining_risk: '追问没有造成行动后果，章末仍然停在解释。',
              },
            ],
          },
        },
      },
      {
        revised: true,
        review: { score: 82 },
        revision: {
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('修订回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('追问没有造成行动后果')
  })

  test('warns when deslop repair ran but deslop repair receipts are missing', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的裂缝' },
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
          scene_breakdown: [],
          continuity_notes: [],
        },
      },
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('去AI味修复回执未生成')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].label).toBe('去AI味修复回执未生成')
    expect(report.missed[0].text).toContain('无法确认 Gate A-G 是否逐项闭环')
    expect(report.missed[0].evidence).toContain('Gate F')
    expect(report.next_actions.join('；')).toContain('deslop_repair_receipts')
  })

  test('uses nested oh-story deslop repair receipts to close deslop repair sync', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的闭环' },
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

    expect(report.status).toBe('ok')
    expect(report.label).toBe('去AI味修复回执 OK')
    expect(report.receipt_count).toBe(1)
    expect(report.missed_count).toBe(0)
  })

  test('keeps deslop repair receipt sync open when keyed receipt omits changed evidence', () => {
    const report = buildDeslopRepairReceiptSyncReport(
      { id: 8, chapter_no: 8, title: '去AI味后的键名伪闭环' },
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
    expect(report.label).toBe('去AI味修复回执残留 1')
    expect(report.missed_count).toBe(1)
    expect(report.missed[0].text).toContain('缺少 changed_evidence')
  })

})
