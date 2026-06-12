import { describe, expect, test } from 'bun:test'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
} from './novel-editor-routes'

describe('buildChapterQualityCard', () => {
  test('marks a chapter below the configured word target as needing expansion', () => {
    const card = buildChapterQualityCard({
      id: 7,
      chapter_no: 3,
      title: '短章测试',
      chapter_goal: '完成一次规则冲突。',
      chapter_summary: '主角破解初始规则。',
      conflict: '规则即将惩罚主角。',
      ending_hook: '门后传来第二条规则。',
      chapter_text: '字'.repeat(1483),
      scene_breakdown: [{ scene_no: 1 }, { scene_no: 2 }],
    }, {
      chapter_target: {
        word_target: {
          mode: 'standard',
          label: '标准章',
          target: 3000,
          min: 2800,
          max: 3500,
          rangeText: '2800-3500 字',
        },
      },
      preflight: {
        checks: [
          { key: 'previous_continuity', ok: true },
          { key: 'characters', ok: true },
          { key: 'character_state', ok: true },
        ],
        warnings: [],
      },
      continuity: { previous_chapter: { chapter_no: 2 } },
      story_state: { characters: [{ name: '主角' }], global: {} },
    }, [])

    const wordTargetDimension = card.dimensions.find((item: any) => item.key === 'word_target')

    expect(card.word_count).toBe(1483)
    expect(wordTargetDimension?.score).toBeLessThan(65)
    expect(wordTargetDimension?.evidence).toContain('目标 2800-3500 字')
    expect(card.must_fix.some((item: string) => item.includes('扩写'))).toBe(true)
    expect(card.next_actions.some((item: string) => item.includes('目标字数'))).toBe(true)
  })
})

describe('chapter delivery risk brief', () => {
  const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文' }
  const reviews = [
    {
      id: 11,
      review_type: 'chapter_core_drift',
      created_at: '2026-06-08T01:00:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        core_drift: {
          status: 'warn',
          label: '核心偏移 2',
          risk_count: 2,
          drift_risks: ['主线压力不足', '主角目标变弱'],
        },
      }),
    },
    {
      id: 12,
      review_type: 'reader_retention_sync',
      created_at: '2026-06-08T01:01:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        reader_retention_sync: {
          status: 'warn',
          label: '漏追读 2',
          missed_count: 2,
          missed: [{ label: '开篇钩子', text: '前300字没有规则危险' }],
        },
      }),
    },
    {
      id: 13,
      review_type: 'reader_payoff_sync',
      created_at: '2026-06-08T01:02:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        reader_payoff_sync: {
          status: 'warn',
          label: '回报欠账 1',
          debt_count: 1,
          missed: [{ label: '规则反制爽点', text: '李超没有真正撞上规则边界' }],
        },
      }),
    },
    {
      id: 14,
      review_type: 'innovation_sync',
      created_at: '2026-06-08T01:03:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        innovation_sync: {
          status: 'warn',
          label: '创新缺口 2',
          missed_count: 2,
          missed: [
            { label: '规则反噬角度', text: '没有写出规则判定压过蛮力的反差' },
            { label: 'IP化场面', text: '缺少可视化的十点门槛场面' },
          ],
        },
      }),
    },
    {
      id: 15,
      review_type: 'runway_sync',
      created_at: '2026-06-08T01:04:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        runway_sync: {
          status: 'warn',
          label: '航线风险 2',
          risk_count: 2,
          four_question_missed: [{ label: '读者为什么翻页', text: '门外学生说出李超的死因' }],
          reader_fuel_missed: [{ text: '规则反制爽点' }],
          redline_touched: [],
        },
      }),
    },
    {
      id: 151,
      review_type: 'signature_scene_sync',
      created_at: '2026-06-08T01:04:30.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        signature_scene_sync: {
          status: 'warn',
          label: '强场面漏写 2',
          missed_count: 2,
          missed: [
            { label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' },
            { label: '读者回报', text: '超人蛮力被规则反噬后由张智反杀诱饵' },
          ],
        },
      }),
    },
    {
      id: 16,
      review_type: 'story_unit_sync',
      created_at: '2026-06-08T01:05:00.000Z',
      payload: JSON.stringify({
        chapter_id: 7,
        story_unit_sync: {
          status: 'warn',
          label: '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1',
          missed_count: 1,
          rushed_count: 1,
          forbidden_count: 1,
          missed: [{ label: '入口钩子', text: '第7章以试炼倒计时开场。' }],
          rushed_ahead: [{ label: '后段小高潮', text: '第10章公开打脸执事。' }],
          forbidden_touched: [{ label: '禁抢跑', text: '不得提前解决内门招揽条件' }],
        },
      }),
    },
  ]

  test('aggregates post-delivery soft risks into revision directives', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, reviews)

    expect(brief.label).toBe('待修复 14')
    expect(brief.priority_label).toBe('优先补核心')
    expect(brief.items).toContain('守核心：核心偏移 2')
    expect(brief.items).toContain('补航线：航线风险 2')
    expect(brief.items).toContain('补追读：漏追读 2')
    expect(brief.items).toContain('补回报：回报欠账 1')
    expect(brief.items).toContain('补强场面：强场面漏写 2')
    expect(brief.items).toContain('补创新：创新缺口 2')
    expect(brief.items).toContain('校单元：单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')
    expect(brief.revision_directives.some((item: string) => item.includes('守住作品核心'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('百万字航线'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('标志性强场面'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('创新执行'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('剧情单元职责'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('延迟兑现'))).toBe(true)
  })

  test('prioritizes missed previous chapter handoff as an opening repair directive', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 31,
        review_type: 'reader_expectation_sync',
        created_at: '2026-06-08T03:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_expectation_sync: {
            status: 'warn',
            label: '期待欠账 1',
            missed_count: 1,
            missed: [
              {
                key: 'opening_handoff',
                label: '上一章承接',
                text: '上一章最后一幕：湿漉漉学生敲响玻璃门',
                match_scope: 'opening',
              },
            ],
          },
        }),
      },
    ])

    expect(brief.items).toContain('修开篇承接：上一章承接')
    expect(brief.priority_label).toBe('优先修开篇')
    expect(brief.revision_directives.some((item: string) => item.includes('前300字'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('上一章最后一幕'))).toBe(true)
  })

  test('turns weak opening hook score into a dedicated opening pull repair risk', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 32,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 84,
            opening_hook_score: 52,
            scene_readability_score: 82,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ])

    expect(brief.items).toContain('修开篇吸引力：开篇吸引力 52')
    expect(brief.priority_label).toBe('优先修开篇')
    expect(brief.revision_directives.some((item: string) => item.includes('前300字'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('异常、危险、欲望或反常信息'))).toBe(true)
  })

  test('turns weak ending hook score into a dedicated page-turn repair risk', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 33,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:06:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 83,
            opening_hook_score: 82,
            ending_hook_score: 55,
            scene_readability_score: 80,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ])

    expect(brief.items).toContain('修章末翻页：章末翻页 55')
    expect(brief.priority_label).toBe('优先修章末')
    expect(brief.revision_directives.some((item: string) => item.includes('最后300字'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('下一章非看不可'))).toBe(true)
  })

  test('turns weak scene readability score into a scene progression repair risk', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 34,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:07:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 82,
            opening_hook_score: 82,
            ending_hook_score: 82,
            scene_readability_score: 58,
            payoff_density_score: 80,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ])

    expect(brief.items).toContain('修场景推进：场景推进 58')
    expect(brief.priority_label).toBe('优先修场景')
    expect(brief.revision_directives.some((item: string) => item.includes('目标、阻碍、转折、回报'))).toBe(true)
  })

  test('turns weak payoff density score into a payoff-density repair risk', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 35,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:08:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 82,
            opening_hook_score: 82,
            ending_hook_score: 82,
            scene_readability_score: 82,
            payoff_density_score: 56,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ])

    expect(brief.items).toContain('补爽点密度：爽点密度 56')
    expect(brief.priority_label).toBe('优先补爽点')
    expect(brief.revision_directives.some((item: string) => item.includes('800-1200字'))).toBe(true)
  })

  test('injects delivery risks into editor report and revision prompts', () => {
    const deliveryRiskBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
    const reportPrompt = buildEditorReportPrompt({
      project: { title: '超人的规则怪谈世界' },
      contextPackage: { chapter_target: { chapter_goal: '规则边界首次显形' } },
      chapter,
      latestQuality: null,
      latestReference: null,
      deliveryRiskBrief,
    })
    const revisionPrompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter,
      report: { must_fix: ['章末钩子不足'], one_click_revision_prompt: '补章末钩子' },
      deliveryRiskBrief,
      revisionMode: 'from_report',
      userPrompt: '',
    })

    expect(reportPrompt).toContain('【交稿风险清单】')
    expect(reportPrompt).toContain('优先补核心')
    expect(reportPrompt).toContain('补航线：航线风险 2')
    expect(reportPrompt).toContain('补追读：漏追读 2')
    expect(reportPrompt).toContain('补强场面：强场面漏写 2')
    expect(revisionPrompt).toContain('不得只按普通润色处理')
    expect(revisionPrompt).toContain('守核心：核心偏移 2')
    expect(revisionPrompt).toContain('补回报：回报欠账 1')
    expect(revisionPrompt).toContain('补强场面：强场面漏写 2')
    expect(revisionPrompt).toContain('补创新：创新缺口 2')
  })

  test('builds a convergence report after revision reduces delivery risks', () => {
    const before = buildChapterDeliveryRiskBrief(chapter, reviews)
    const after = {
      ...before,
      total_count: 2,
      label: '待修复 2',
      items: ['补追读：漏追读 1', '补回报：回报欠账 1'],
    }
    const report = buildDeliveryRiskConvergenceReport({
      chapter,
      sourceReviewId: 401,
      before,
      after,
    })

    expect(report.status).toBe('improved')
    expect(report.label).toBe('风险收敛 12')
    expect(report.resolved_count).toBe(12)
    expect(report.residual_count).toBe(2)
    expect(report.next_actions).toContain('继续处理残留风险：补追读：漏追读 1；补回报：回报欠账 1')
  })
})

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

describe('review annotations delivery risk intake', () => {
  test('surfaces post-delivery soft risks as actionable chapter annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。', continuity_notes: ['规则边界已显形'] }
    const reviews = [
      {
        id: 21,
        review_type: 'chapter_core_drift',
        created_at: '2026-06-08T02:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          core_drift: {
            status: 'warn',
            label: '核心偏移 1',
            risk_count: 1,
            drift_risks: ['超人力量压过规则恐怖'],
          },
        }),
      },
      {
        id: 22,
        review_type: 'reader_retention_sync',
        created_at: '2026-06-08T02:01:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_retention_sync: {
            status: 'warn',
            label: '漏追读 1',
            missed_count: 1,
            missed: [{ label: '章末问题', text: '结尾没有抛出下一条规则' }],
          },
        }),
      },
      {
        id: 23,
        review_type: 'reader_payoff_sync',
        created_at: '2026-06-08T02:02:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_payoff_sync: {
            status: 'warn',
            label: '回报欠账 1',
            debt_count: 1,
            missed: [{ label: '规则反制', text: '没有兑现试探门槛的爽点' }],
          },
        }),
      },
      {
        id: 24,
        review_type: 'reader_expectation_sync',
        created_at: '2026-06-08T02:02:30.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_expectation_sync: {
            status: 'warn',
            label: '期待欠账 1',
            missed_count: 1,
            missed: [{ label: '章末追读', text: '湿漉漉学生敲响玻璃门' }],
          },
        }),
      },
      {
        id: 25,
        review_type: 'innovation_sync',
        created_at: '2026-06-08T02:03:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          innovation_sync: {
            status: 'warn',
            label: '创新缺口 1',
            missed_count: 1,
            missed: [{ label: '机制反差', text: '没有写出规则判定压过蛮力' }],
          },
        }),
      },
      {
        id: 26,
        review_type: 'volume_beat_sync',
        created_at: '2026-06-08T02:04:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          volume_beat_sync: {
            status: 'warn',
            label: '爆点漏兑现 1',
            missed_count: 1,
            missed: [{ label: '卷中转折', text: '没有写出警钟反转和腰牌入场' }],
          },
        }),
      },
      {
        id: 27,
        review_type: 'storyline_sync',
        created_at: '2026-06-08T02:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          storyline_sync: {
            status: 'warn',
            label: '剧情线风险 2',
            missed: [{ name: '主线', reason: '本章未推进规则来源' }],
            forbidden_touched: [{ name: '规则之源', reason: '疑似提前揭示' }],
          },
        }),
      },
      {
        id: 28,
        review_type: 'readability_review',
        created_at: '2026-06-08T02:06:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            status: 'warn',
            readability_score: 66,
            meme_sense: {
              immersion_risks: ['死亡场景玩梗过多'],
            },
          },
        }),
      },
      {
        id: 29,
        review_type: 'runway_sync',
        created_at: '2026-06-08T02:07:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          runway_sync: {
            status: 'warn',
            label: '航线风险 2',
            risk_count: 2,
            four_question_missed: [{ label: '读者为什么翻页', text: '门外学生说出李超的死因' }],
            reader_fuel_missed: [{ text: '规则反制爽点' }],
            redline_touched: [],
          },
        }),
      },
      {
        id: 291,
        review_type: 'signature_scene_sync',
        created_at: '2026-06-08T02:07:30.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          signature_scene_sync: {
            status: 'warn',
            label: '强场面漏写 1',
            missed_count: 1,
            missed: [{ label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' }],
          },
        }),
      },
      {
        id: 292,
        review_type: 'chapter_attraction_review',
        created_at: '2026-06-08T02:07:45.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_attraction_review: {
            status: 'warn',
            score: 62,
            label: '吸引力缺口 3',
            weak_count: 3,
            priority_repair: '优先修章末翻页',
            dimensions: [
              { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题' },
              { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '爽点没有写成可见反制结果' },
            ],
          },
        }),
      },
      {
        id: 294,
        review_type: 'story_drive_sync',
        created_at: '2026-06-08T02:07:48.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          story_drive_sync: {
            status: 'warn',
            score: 60,
            label: '故事力缺口 3',
            missed_count: 3,
            priority_repair: '优先补主角选择',
            missed: [
              { key: 'protagonist_choice', label: '主角选择', text: '主角当众选择用残阵反证阵图归属' },
              { key: 'choice_cost', label: '选择代价', text: '暴露阵盘裂纹，招来内门势力注意' },
              { key: 'state_change', label: '状态变化', text: '主角从被动挨压转为主动入局' },
            ],
          },
        }),
      },
      {
        id: 295,
        review_type: 'character_arc_sync',
        created_at: '2026-06-08T02:07:49.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          character_arc_sync: {
            status: 'warn',
            score: 58,
            label: '人物弧光缺口 3',
            missed_count: 3,
            priority_repair: '优先补成长节点',
            missed: [
              { key: 'desire', label: '角色欲望', text: '沈砚想保住试炼资格并证明阵图属于自己' },
              { key: 'flaw_pressure', label: '缺陷受压', text: '害怕暴露阵盘裂纹，只想继续藏拙' },
              { key: 'growth_beat', label: '成长节点', text: '第一次主动承认残阵缺陷' },
            ],
          },
        }),
      },
      {
        id: 293,
        review_type: 'style_sample_sync',
        created_at: '2026-06-08T02:07:50.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          style_sample_sync: {
            status: 'warn',
            score: 61,
            label: '风格缺口 2',
            missed_count: 2,
            copy_risk_count: 1,
            missed: [
              { key: 'narrative_rhythm', label: '叙述节奏', text: '先压迫，再拆规则，再小反打' },
              { key: 'dialogue_ratio', label: '对白比例', text: '35%-45%' },
            ],
            copied_phrases: ['这破学校连晚自习都外包给影子了'],
          },
        }),
      },
      {
        id: 30,
        review_type: 'story_unit_sync',
        created_at: '2026-06-08T02:08:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          story_unit_sync: {
            status: 'warn',
            label: '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1',
            missed: [{ label: '入口钩子', text: '第7章以试炼倒计时开场。' }],
            rushed_ahead: [{ label: '后段小高潮', text: '第10章公开打脸执事。' }],
            forbidden_touched: [{ label: '禁抢跑', text: '不得提前解决内门招揽条件' }],
          },
        }),
      },
    ]

    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], reviews).annotations
    const titles = annotations.map((item: any) => item.title)

    expect(titles).toContain('核心偏移 1')
    expect(titles).toContain('漏追读 1')
    expect(titles).toContain('回报欠账 1')
    expect(titles).toContain('期待欠账 1')
    expect(titles).toContain('创新缺口 1')
    expect(titles).toContain('爆点漏兑现 1')
    expect(titles).toContain('剧情线风险 2')
    expect(titles).toContain('可读性/网感风险 1')
    expect(titles).toContain('航线风险 2')
    expect(titles).toContain('强场面漏写 1')
    expect(titles).toContain('吸引力缺口 3')
    expect(titles).toContain('故事力缺口 3')
    expect(titles).toContain('人物弧光缺口 3')
    expect(titles).toContain('风格缺口 2')
    expect(titles).toContain('单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')
    expect(annotations.find((item: any) => item.title === '创新缺口 1')?.action).toContain('补足本章创新执行')
    expect(annotations.find((item: any) => item.title === '航线风险 2')?.category).toBe('runway')
    expect(annotations.find((item: any) => item.title === '航线风险 2')?.action).toContain('补齐百万字航线')
    expect(annotations.find((item: any) => item.title === '强场面漏写 1')?.category).toBe('signature_scene')
    expect(annotations.find((item: any) => item.title === '强场面漏写 1')?.kind).toBe('signature_scene_missed')
    expect(annotations.find((item: any) => item.title === '强场面漏写 1')?.action).toContain('补回开写任务书指定的标志性场面')
    expect(annotations.find((item: any) => item.title === '吸引力缺口 3')?.category).toBe('chapter_attraction')
    expect(annotations.find((item: any) => item.title === '吸引力缺口 3')?.kind).toBe('chapter_attraction_gap')
    expect(annotations.find((item: any) => item.title === '吸引力缺口 3')?.action).toContain('按吸引力执行器重修')
    expect(annotations.find((item: any) => item.title === '故事力缺口 3')?.category).toBe('story_drive')
    expect(annotations.find((item: any) => item.title === '故事力缺口 3')?.kind).toBe('story_drive_gap')
    expect(annotations.find((item: any) => item.title === '故事力缺口 3')?.action).toContain('补出主角主动选择')
    expect(annotations.find((item: any) => item.title === '人物弧光缺口 3')?.category).toBe('character_arc')
    expect(annotations.find((item: any) => item.title === '人物弧光缺口 3')?.kind).toBe('character_arc_gap')
    expect(annotations.find((item: any) => item.title === '人物弧光缺口 3')?.action).toContain('补出角色欲望')
    expect(annotations.find((item: any) => item.title === '风格缺口 2')?.category).toBe('style_sample')
    expect(annotations.find((item: any) => item.title === '风格缺口 2')?.kind).toBe('style_sample_gap')
    expect(annotations.find((item: any) => item.title === '风格缺口 2')?.action).toContain('按风格样章重修')
    expect(annotations.find((item: any) => item.title === '期待欠账 1')?.category).toBe('reader_expectation')
    expect(annotations.find((item: any) => item.title === '爆点漏兑现 1')?.action).toContain('补足本章卷级爆点')
    expect(annotations.find((item: any) => item.title === '剧情线风险 2')?.severity).toBe('high')
    expect(annotations.find((item: any) => item.title === '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')?.category).toBe('story_unit')
    expect(annotations.find((item: any) => item.title === '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')?.kind).toBe('story_unit_sync_risk')
    expect(annotations.find((item: any) => item.title === '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')?.action).toContain('补足当前剧情单元职责')
    expect(annotations.find((item: any) => item.title === '单元漏写 1 · 单元抢跑 1 · 禁抢跑 1')?.severity).toBe('high')
  })

  test('surfaces missed previous chapter handoff as a dedicated opening annotation', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 31,
        review_type: 'reader_expectation_sync',
        created_at: '2026-06-08T03:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_expectation_sync: {
            status: 'warn',
            label: '期待欠账 1',
            missed_count: 1,
            missed: [
              {
                key: 'opening_handoff',
                label: '上一章承接',
                text: '上一章最后一幕：湿漉漉学生敲响玻璃门',
                match_scope: 'opening',
              },
            ],
          },
        }),
      },
    ]).annotations

    const opening = annotations.find((item: any) => item.title === '开篇承接漏写 1')

    expect(opening?.category).toBe('reader_expectation')
    expect(opening?.kind).toBe('opening_handoff_debt')
    expect(opening?.message).toContain('上一章最后一幕')
    expect(opening?.action).toContain('前300-500字')
  })

  test('surfaces weak opening hook score as a dedicated repair annotation', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 32,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 84,
            opening_hook_score: 52,
            scene_readability_score: 82,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ]).annotations

    const opening = annotations.find((item: any) => item.title === '开篇吸引力弱 52')

    expect(opening?.category).toBe('readability')
    expect(opening?.kind).toBe('opening_pull_risk')
    expect(opening?.message).toContain('开篇 300 字')
    expect(opening?.action).toContain('前300字')
  })

  test('surfaces weak ending hook score as a dedicated repair annotation', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 33,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:06:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 83,
            opening_hook_score: 82,
            ending_hook_score: 55,
            scene_readability_score: 80,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ]).annotations

    const ending = annotations.find((item: any) => item.title === '章末翻页弱 55')

    expect(ending?.category).toBe('readability')
    expect(ending?.kind).toBe('ending_page_turn_risk')
    expect(ending?.message).toContain('最后 300 字')
    expect(ending?.action).toContain('最后300字')
  })

  test('surfaces weak scene readability score as a dedicated repair annotation', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 34,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:07:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 82,
            opening_hook_score: 82,
            ending_hook_score: 82,
            scene_readability_score: 58,
            payoff_density_score: 80,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ]).annotations

    const scene = annotations.find((item: any) => item.title === '场景推进弱 58')

    expect(scene?.category).toBe('readability')
    expect(scene?.kind).toBe('scene_progression_risk')
    expect(scene?.message).toContain('场景目标、阻碍、转折、回报')
    expect(scene?.action).toContain('目标、阻碍、转折、回报')
  })

  test('surfaces weak payoff density score as a dedicated repair annotation', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 35,
        review_type: 'readability_review',
        created_at: '2026-06-08T03:08:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          readability_review: {
            readability_score: 82,
            opening_hook_score: 82,
            ending_hook_score: 82,
            scene_readability_score: 82,
            payoff_density_score: 56,
            meme_sense: { intensity: '轻度', immersion_risks: [] },
            issues: [],
          },
        }),
      },
    ]).annotations

    const payoff = annotations.find((item: any) => item.title === '爽点密度弱 56')

    expect(payoff?.category).toBe('readability')
    expect(payoff?.kind).toBe('payoff_density_risk')
    expect(payoff?.message).toContain('800-1200 字')
    expect(payoff?.action).toContain('信息推进')
  })

  test('auto-resolves stale delivery risk annotations after convergence clears the chapter', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。', continuity_notes: ['规则边界已显形'] }
    const result = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 21,
        review_type: 'reader_retention_sync',
        created_at: '2026-06-08T02:01:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_retention_sync: {
            status: 'warn',
            label: '漏追读 1',
            missed_count: 1,
            missed: [{ label: '章末问题', text: '结尾没有抛出下一条规则' }],
          },
        }),
      },
      {
        id: 30,
        review_type: 'delivery_risk_convergence',
        created_at: '2026-06-08T02:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          delivery_risk_convergence: {
            status: 'cleared',
            label: '风险已清零',
            after_count: 0,
            after: { total_count: 0, items: [] },
          },
        }),
      },
    ])

    const retentionAnnotation = result.annotations.find((item: any) => item.title === '漏追读 1')
    expect(retentionAnnotation?.status).toBe('resolved')
    expect(retentionAnnotation?.resolution_note).toContain('风险已清零')
    expect(result.summary.open).toBe(0)
  })

  test('turns open delivery risk annotations into longform repair tasks without duplicating existing open tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。', continuity_notes: ['规则边界已显形'] }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 21,
        review_type: 'chapter_core_drift',
        created_at: '2026-06-08T02:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          core_drift: {
            status: 'warn',
            label: '核心偏移 1',
            risk_count: 1,
            drift_risks: ['超人力量压过规则恐怖'],
          },
        }),
      },
      {
        id: 22,
        review_type: 'reader_payoff_sync',
        created_at: '2026-06-08T02:02:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_payoff_sync: {
            status: 'warn',
            label: '回报欠账 1',
            debt_count: 1,
            missed: [{ label: '规则反制', text: '没有兑现试探门槛的爽点' }],
          },
        }),
      },
      {
        id: 23,
        review_type: 'volume_beat_sync',
        created_at: '2026-06-08T02:03:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          volume_beat_sync: {
            status: 'warn',
            label: '爆点漏兑现 1',
            missed_count: 1,
            missed: [{ label: '卷中转折', text: '没有写出警钟反转和腰牌入场' }],
          },
        }),
      },
      {
        id: 24,
        review_type: 'reader_retention_sync',
        created_at: '2026-06-08T02:04:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          reader_retention_sync: {
            status: 'warn',
            label: '漏追读 1',
            missed_count: 1,
            missed: [{ label: '章末追读', text: '没有抛出下一条规则' }],
          },
        }),
      },
      {
        id: 25,
        review_type: 'runway_sync',
        created_at: '2026-06-08T02:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          runway_sync: {
            status: 'warn',
            label: '航线风险 1',
            risk_count: 1,
            four_question_missed: [{ label: '这一章的新意在哪', text: '超人力量先被规则压制再反制' }],
            reader_fuel_missed: [],
            redline_touched: [],
          },
        }),
      },
      {
        id: 251,
        review_type: 'signature_scene_sync',
        created_at: '2026-06-08T02:05:30.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          signature_scene_sync: {
            status: 'warn',
            label: '强场面漏写 1',
            missed_count: 1,
            missed: [{ label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' }],
          },
        }),
      },
      {
        id: 26,
        review_type: 'story_unit_sync',
        created_at: '2026-06-08T02:06:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          story_unit_sync: {
            status: 'warn',
            label: '单元漏写 1 · 单元抢跑 1',
            missed: [{ label: '入口钩子', text: '第7章以试炼倒计时开场。' }],
            rushed_ahead: [{ label: '后段小高潮', text: '第10章公开打脸执事。' }],
          },
        }),
      },
    ]).annotations
    const existing = [
      {
        run_type: 'longform_production_repair',
        status: 'ready',
        output_ref: JSON.stringify({
          tasks: [
            {
              source: 'review_annotation_risk',
              annotation_key: annotations.find((item: any) => item.title === '回报欠账 1')?.key,
              task_status: 'open',
            },
          ],
        }),
      },
    ]

    const result = buildReviewAnnotationRepairTasks(annotations, existing)

    expect(result.tasks).toHaveLength(6)
    expect(result.skipped_existing).toBe(1)
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['core_drift', 'runway_sync_risk', 'story_unit_sync_risk', 'signature_scene_missed', 'volume_beat_missed', 'reader_retention_missed'])
    expect(result.tasks[0].source).toBe('review_annotation_risk')
    expect(result.tasks[0].chapter_id).toBe(7)
    expect(result.tasks[0].chapter_no).toBe(3)
    expect(result.tasks[0].title).toContain('第3章')
    expect(result.tasks[0].message).toContain('超人力量压过规则恐怖')
    expect(result.tasks[0].acceptance_criteria).toContain('修订后重新运行章节质量复检，质量分不低于78')
    expect(result.tasks[0].acceptance_criteria).toContain('交稿风险批注标记为已处理，或风险收敛复盘显示该风险清零')
    expect(result.tasks[1].annotation_category).toBe('runway')
    expect(result.tasks[1].action).toContain('百万字航线')
    expect(result.tasks[2].annotation_category).toBe('story_unit')
    expect(result.tasks[2].action).toContain('剧情单元职责')
    expect(result.tasks[3].annotation_category).toBe('signature_scene')
    expect(result.tasks[3].action).toContain('标志性场面')
    expect(result.tasks[4].annotation_category).toBe('volume_beat')
    expect(result.tasks[4].action).toContain('卷级爆点')
  })
})

describe('story state sync route source guards', () => {
  test('exposes chapter story-state sync for repair task recheck convergence', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = readFileSync(join(import.meta.dir, 'novel-editor-routes.ts'), 'utf8')

    expect(source).toContain('/api/novel/chapters/:chapterId/story-state-sync')
    expect(source).toContain('buildDeliveryRiskConvergenceReport')
    expect(source).toContain("run_type: 'story_state'")
    expect(source).toContain('delivery_risk_convergence')
  })
})
