import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('storyline diff decision audit payload', () => {
  test('normalizes an accept-as-plan decision into an auditable review payload', () => {
    const review = buildStorylineDiffDecisionReviewPayload({
      decision_key: 'storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。',
      decision: 'accept_as_plan',
      chapter_no: 7,
      chapter_id: 70,
      entity_id: 202,
      entity_name: '残缺阵盘伏笔',
      entity_type: 'foreshadowing_arc',
      risk_type: 'unplanned',
      risk_label: '额外推进',
      summary: '正文提前让阵盘指向宗门旧案。',
      evidence: '阵盘缺口发热，宗门旧案第一次被点明。',
      note: '保留这个更强的伏笔推进，后续大纲接住。',
    }, new Date('2026-06-11T08:00:00.000Z'))

    expect(review.review_type).toBe('storyline_diff_decision')
    expect(review.status).toBe('ok')
    expect(review.summary).toContain('接受为新计划')
    expect(review.summary).toContain('残缺阵盘伏笔')
    expect(review.issues).toEqual([])
    const payload = JSON.parse(review.payload)
    expect(payload.decision_key).toBe('storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。')
    expect(payload.decision).toBe('accept_as_plan')
    expect(payload.decision_label).toBe('接受为新计划')
    expect(payload.chapter_no).toBe(7)
    expect(payload.chapter_id).toBe(70)
    expect(payload.entity_id).toBe(202)
    expect(payload.entity_name).toBe('残缺阵盘伏笔')
    expect(payload.entity_type).toBe('foreshadowing_arc')
    expect(payload.risk_type).toBe('unplanned')
    expect(payload.risk_label).toBe('额外推进')
    expect(payload.summary).toBe('正文提前让阵盘指向宗门旧案。')
    expect(payload.evidence).toBe('阵盘缺口发热，宗门旧案第一次被点明。')
    expect(payload.note).toBe('保留这个更强的伏笔推进，后续大纲接住。')
    expect(payload.source).toBe('storyline_diff_decision')
    expect(payload.decided_at).toBe('2026-06-11T08:00:00.000Z')
  })

  test('keeps revise-prose decisions as warn records with a repair issue', () => {
    const review = buildStorylineDiffDecisionReviewPayload({
      decision_key: 'storyline_diff:7:201:missed:执事压迫升级没有兑现。',
      decision: 'revise_prose',
      chapter_no: 7,
      entity_name: '外门压迫主线',
      risk_type: 'missed',
      risk_label: '漏推',
      summary: '执事压迫升级没有兑现。',
      evidence: '计划要求执事逼迫，但正文只写了修炼。',
    }, new Date('2026-06-11T08:00:00.000Z'))

    expect(review.status).toBe('warn')
    expect(review.summary).toContain('回修正文')
    expect(review.issues).toContain('第7章 执事压迫升级没有兑现。')
  })

  test('rejects unsupported storyline diff decisions', () => {
    expect(() => buildStorylineDiffDecisionReviewPayload({
      decision_key: 'storyline_diff:7:202:unplanned:x',
      decision: 'delete_storyline',
      summary: '不能直接删除剧情线。',
    })).toThrow('unsupported storyline diff decision')
  })

  test('turns actionable storyline decisions into repair and plan-sync tasks', () => {
    const reviews = [
      {
        id: 501,
        review_type: 'storyline_diff_decision',
        status: 'warn',
        created_at: '2026-06-11T08:00:00.000Z',
        payload: JSON.stringify({
          source: 'storyline_diff_decision',
          decision_key: 'storyline_diff:7:201:missed:执事压迫升级没有兑现。',
          decision: 'revise_prose',
          decision_label: '回修正文',
          chapter_no: 7,
          chapter_id: 70,
          entity_id: 201,
          entity_name: '外门压迫主线',
          entity_type: 'mainline',
          risk_type: 'missed',
          risk_label: '漏推',
          summary: '执事压迫升级没有兑现。',
          evidence: '计划要求执事逼迫，但正文只写了修炼。',
        }),
      },
      {
        id: 502,
        review_type: 'storyline_diff_decision',
        status: 'ok',
        created_at: '2026-06-11T08:01:00.000Z',
        payload: JSON.stringify({
          source: 'storyline_diff_decision',
          decision_key: 'storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。',
          decision: 'accept_as_plan',
          decision_label: '接受为新计划',
          chapter_no: 7,
          chapter_id: 70,
          entity_id: 202,
          entity_name: '残缺阵盘伏笔',
          entity_type: 'foreshadowing_arc',
          risk_type: 'unplanned',
          risk_label: '额外推进',
          summary: '正文提前让阵盘指向宗门旧案。',
          evidence: '阵盘缺口发热，宗门旧案第一次被点明。',
        }),
      },
      {
        id: 503,
        review_type: 'storyline_diff_decision',
        status: 'ok',
        created_at: '2026-06-11T08:02:00.000Z',
        payload: JSON.stringify({
          source: 'storyline_diff_decision',
          decision_key: 'storyline_diff:7:202:forbidden_touched:误判。',
          decision: 'false_positive',
          decision_label: '标记误判',
          chapter_no: 7,
          entity_name: '残缺阵盘伏笔',
          risk_type: 'forbidden_touched',
          summary: '误判。',
        }),
      },
    ]
    const existing = [
      {
        run_type: 'longform_production_repair',
        output_ref: JSON.stringify({
          tasks: [
            {
              source: 'storyline_diff_decision',
              decision_key: 'storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。',
              task_status: 'open',
            },
          ],
        }),
      },
    ]

    const result = buildStorylineDiffDecisionRepairTasks(reviews, existing)

    expect(result.total_candidates).toBe(2)
    expect(result.skipped_existing).toBe(1)
    expect(result.skipped_ignored).toBe(1)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].source).toBe('storyline_diff_decision')
    expect(result.tasks[0].task_type).toBe('repair_quality')
    expect(result.tasks[0].issue_type).toBe('storyline_diff_revise_prose')
    expect(result.tasks[0].chapter_id).toBe(70)
    expect(result.tasks[0].chapter_no).toBe(7)
    expect(result.tasks[0].title).toContain('外门压迫主线')
    expect(result.tasks[0].message).toContain('执事压迫升级没有兑现')
    expect(result.tasks[0].action).toContain('回修正文')
    expect(result.tasks[0].acceptance_criteria).toContain('修订后重新运行剧情线同步复盘，确认漏推或禁揭风险清零')
    expect(result.tasks[0].decision_key).toBe('storyline_diff:7:201:missed:执事压迫升级没有兑现。')
    expect(result.tasks[0].payload.evidence).toContain('计划要求执事逼迫')
  })
})

