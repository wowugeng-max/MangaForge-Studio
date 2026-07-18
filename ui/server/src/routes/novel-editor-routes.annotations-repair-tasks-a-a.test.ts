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
    'builders-annotations-prose-quality.ts',
    'builders-annotations-prose-quality-types.ts',
    'builders-annotations-prose-quality-core.ts',
    'builders-annotations-prose-quality-craft.ts',
    'builders-annotations-prose-quality-audience.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('review annotations delivery risk repair tasks a a', () => {
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

  test('turns prose approval blockers into the first longform repair task', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第一条规则', chapter_text: '正文', ending_hook: '门外有人敲门。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 41,
        review_type: 'prose_quality',
        created_at: '2026-06-08T02:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          approval_type: 'reference_safety_blocked',
          self_check: {
            review: {
              score: 76,
              issues: [
                { severity: 'critical', description: '参考桥段迁移过近，需要改成原创机制反制。' },
              ],
              revision_directives: ['重写规则反制过程，保留爽点但换掉相似桥段。'],
            },
          },
          safety_decision: {
            blocked: true,
            copy_hit_count: 2,
            reasons: ['门槛测试与参考样章连续三拍相似'],
          },
        }),
      },
      {
        id: 42,
        review_type: 'chapter_core_drift',
        created_at: '2026-06-08T02:01:00.000Z',
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
    ]).annotations

    const blockerAnnotation = annotations.find((item: any) => item.kind === 'approval_blocker')
    const result = buildReviewAnnotationRepairTasks(annotations, [])

    expect(blockerAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '入库阻断',
      category: 'approval_blocker',
      severity: 'high',
      title: '仿写安全阻断',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(blockerAnnotation.message).toContain('门槛测试与参考样章连续三拍相似')
    expect(result.tasks[0]).toMatchObject({
      issue_type: 'approval_blocker',
      annotation_category: 'approval_blocker',
      severity: 'high',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(result.tasks[0].title).toContain('仿写安全阻断')
    expect(result.tasks[0].action).toContain('先解除入库阻断')
    expect(result.tasks[0].acceptance_criteria).toContain('入库阻断已经解除，章节可重新进入验收或入库')
    expect(result.tasks[1].issue_type).toBe('core_drift')
  })

  test('turns scene-card receipt annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 42,
        review_type: 'prose_quality',
        summary: '场景卡回执未兑现',
        created_at: '2026-06-08T03:09:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          self_check: {
            review: {
              score: 84,
              passed: false,
              status: 'warn',
              quality_audit_checks: [
                {
                  key: 'scene_card_receipt_2_undelivered',
                  label: '场景卡回执证据复核',
                  status: 'fail',
                  scene_no: 2,
                  fields: ['目标/阻碍/状态变化', '感知锚点'],
                  evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
                  fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('scene_card_receipt_2_undelivered')
    expect(result.tasks[0].annotation_category).toBe('scene_card_receipt')
    expect(result.tasks[0].message).toContain('scene_card_receipts 标记未兑现')
    expect(result.tasks[0].action).toContain('scene_start_anchor')
    expect(result.tasks[0].acceptance_criteria).toContain('场景回执复检清零，scene_card_receipt 相关质量检查不再失败')
    expect(result.tasks[0].payload.scene_no).toBe(2)
    expect(result.tasks[0].payload.fields).toContain('感知锚点')
  })

  test('turns nested pre-draft execution receipt misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 44,
        review_type: 'prose_quality',
        summary: '写前执行回执存在缺口',
        created_at: '2026-06-08T03:12:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 86,
          passed: true,
          oh_story_delivery_receipts: {
            pre_draft_execution_receipts: {
              intent_confirmation_checks: [
                {
                  key: 'emotion_target',
                  label: '情绪目标',
                  delivered: false,
                  evidence: '正文只写了发现封条，没有从压迫转到反制。',
                  remaining_risk: '压迫后的反制情绪没有落到正文。',
                },
              ],
              benchmark_recall_checks: [
                {
                  key: 'rhythm_reference',
                  label: '节奏参照',
                  delivered: false,
                  evidence: '没有三轮压问，证据一出现就结束。',
                  remaining_risk: '文风召回里的先压后爆没有执行。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const intentAnnotation = annotations.find((item: any) => item.category === 'intent_confirmation')
    const recallAnnotation = annotations.find((item: any) => item.category === 'benchmark_recall')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(intentAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '意图确认',
      kind: 'intent_confirmation_gap',
      title: '意图确认缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(intentAnnotation?.message).toContain('压迫后的反制情绪没有落到正文')
    expect(recallAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '文风召回',
      kind: 'benchmark_recall_gap',
      title: '文风召回缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(recallAnnotation?.message).toContain('文风召回里的先压后爆没有执行')
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['intent_confirmation_gap', 'benchmark_recall_gap'])
    expect(result.tasks[0].intent_confirmation_sync.missed[0].text).toContain('压迫后的反制情绪没有落到正文')
    expect(result.tasks[1].benchmark_recall_sync.missed[0].text).toContain('文风召回里的先压后爆没有执行')
    expect(result.tasks[0].acceptance_criteria).toContain('intent_confirmation_checks 或写前执行回执复检通过，missed_count=0')
    expect(result.tasks[1].acceptance_criteria).toContain('benchmark_recall_checks 或文风召回回执复检通过，missed_count=0')
  })

  test('turns source readiness misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 45,
        review_type: 'prose_quality',
        summary: '来源就绪存在缺口',
        created_at: '2026-06-08T03:14:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              source_readiness_checks: [
                {
                  key: 'artifact_state',
                  label: '黑色钥匙状态',
                  status: 'warn',
                  evidence: '正文把黑色钥匙当成已解锁道具，但写前来源表标记为 missing。',
                  fix: '先补角色确认钥匙来源和限制，再让它参与本章反制。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const sourceAnnotation = annotations.find((item: any) => item.category === 'source_readiness')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(sourceAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '来源就绪',
      kind: 'source_readiness_gap',
      title: '来源就绪缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(sourceAnnotation?.message).toContain('黑色钥匙当成已解锁道具')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('source_readiness_gap')
    expect(result.tasks[0].annotation_category).toBe('source_readiness')
    expect(result.tasks[0].source_readiness_sync.missed[0].text).toContain('黑色钥匙当成已解锁道具')
    expect(result.tasks[0].acceptance_criteria).toContain('source_readiness_checks 复检通过，missed_count=0')
  })

  test('turns state tracking misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 46,
        review_type: 'prose_quality',
        summary: '状态跟踪存在缺口',
        created_at: '2026-06-08T03:16:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              state_tracking_checks: [
                {
                  key: 'character_state',
                  label: '周远状态',
                  status: 'warn',
                  evidence: '正文让周远直接出手，但上一章状态仍是昏迷未醒。',
                  fix: '先补周远苏醒代价和行动限制，再参与本章选择。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const stateAnnotation = annotations.find((item: any) => item.category === 'state_tracking')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(stateAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '状态跟踪',
      kind: 'state_tracking_gap',
      title: '状态跟踪缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(stateAnnotation?.message).toContain('上一章状态仍是昏迷未醒')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('state_tracking_gap')
    expect(result.tasks[0].annotation_category).toBe('state_tracking')
    expect(result.tasks[0].state_tracking_sync.missed[0].text).toContain('上一章状态仍是昏迷未醒')
    expect(result.tasks[0].acceptance_criteria).toContain('state_tracking_checks 复检通过，missed_count=0')
  })

  test('turns style boundary misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 47,
        review_type: 'prose_quality',
        summary: '风格边界存在缺口',
        created_at: '2026-06-08T03:18:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              style_boundary_checks: [
                {
                  key: 'source_copy_risk',
                  label: '参照句式过近',
                  status: 'warn',
                  evidence: '正文连续三句沿用标杆样章的句式节奏，只有名词替换。',
                  fix: '保留压迫感，但改用本章动作链和角色口吻重写。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const styleAnnotation = annotations.find((item: any) => item.category === 'style_boundary')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(styleAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '风格边界',
      kind: 'style_boundary_gap',
      title: '风格边界缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(styleAnnotation?.message).toContain('标杆样章的句式节奏')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('style_boundary_gap')
    expect(result.tasks[0].annotation_category).toBe('style_boundary')
    expect(result.tasks[0].style_boundary_sync.missed[0].text).toContain('标杆样章的句式节奏')
    expect(result.tasks[0].acceptance_criteria).toContain('style_boundary_checks 复检通过，missed_count=0')
  })

  test('turns information flow misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 48,
        review_type: 'prose_quality',
        summary: '信息流存在缺口',
        created_at: '2026-06-08T03:20:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              information_flow_checks: [
                {
                  key: 'reveal_order',
                  label: '线索揭示顺序',
                  status: 'fail',
                  evidence: '正文先解释封条真相，再让主角发现供词，导致悬念提前泄底。',
                  fix: '先写主角误判和供词异常，再用封条真相收束本场。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const flowAnnotation = annotations.find((item: any) => item.category === 'information_flow')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(flowAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '信息流',
      kind: 'information_flow_gap',
      title: '信息流缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(flowAnnotation?.message).toContain('悬念提前泄底')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('information_flow_gap')
    expect(result.tasks[0].annotation_category).toBe('information_flow')
    expect(result.tasks[0].information_flow_sync.missed[0].text).toContain('悬念提前泄底')
    expect(result.tasks[0].acceptance_criteria).toContain('information_flow_checks 复检通过，missed_count=0')
  })

  test('turns expectation threshold misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 49,
        review_type: 'prose_quality',
        summary: '期待阈值存在缺口',
        created_at: '2026-06-08T03:22:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              expectation_threshold_checks: [
                {
                  key: 'page_turn_question',
                  label: '章末追问强度',
                  status: 'warn',
                  evidence: '章末只说封条异常，没有形成读者必须点下一章的具体问题。',
                  fix: '把封条异常落到一个未揭身份、代价或选择压力上。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const expectationAnnotation = annotations.find((item: any) => item.category === 'expectation_threshold')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(expectationAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '期待阈值',
      kind: 'expectation_threshold_gap',
      title: '期待阈值缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(expectationAnnotation?.message).toContain('必须点下一章')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('expectation_threshold_gap')
    expect(result.tasks[0].annotation_category).toBe('expectation_threshold')
    expect(result.tasks[0].expectation_threshold_sync.missed[0].text).toContain('必须点下一章')
    expect(result.tasks[0].acceptance_criteria).toContain('expectation_threshold_checks 复检通过，missed_count=0')
  })

  test('turns story loop misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 50,
        review_type: 'prose_quality',
        summary: '故事闭环存在缺口',
        created_at: '2026-06-08T03:24:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              story_loop_checks: [
                {
                  key: 'setup_payoff_loop',
                  label: '设问回收闭环',
                  status: 'fail',
                  evidence: '本章开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
                  fix: '至少推进一个答案碎片，并把新问题挂到下一章钩子。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const loopAnnotation = annotations.find((item: any) => item.category === 'story_loop')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(loopAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '故事闭环',
      kind: 'story_loop_gap',
      title: '故事闭环缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(loopAnnotation?.message).toContain('没有推进答案')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('story_loop_gap')
    expect(result.tasks[0].annotation_category).toBe('story_loop')
    expect(result.tasks[0].story_loop_sync.missed[0].text).toContain('没有推进答案')
    expect(result.tasks[0].acceptance_criteria).toContain('story_loop_checks 复检通过，missed_count=0')
  })

})
