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
describe('review annotations delivery risk repair tasks a', () => {
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

  test('turns emotional arc misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 52,
        review_type: 'prose_quality',
        summary: '情绪弧存在缺口',
        created_at: '2026-06-08T03:24:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              emotional_arc_checks: [
                {
                  key: 'pressure_release',
                  label: '压迫释放弧',
                  status: 'fail',
                  evidence: '开场压迫后直接解释规则，没有写出调动、反制和爽感释放。',
                  fix: '把压迫落到现场选择，用动作和对白完成反制，再给旁观反馈。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const emotionalArcAnnotation = annotations.find((item: any) => item.category === 'emotional_arc')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(emotionalArcAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '情绪弧',
      kind: 'emotional_arc_gap',
      title: '情绪弧缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(emotionalArcAnnotation?.message).toContain('没有写出调动、反制和爽感释放')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('emotional_arc_gap')
    expect(result.tasks[0].annotation_category).toBe('emotional_arc')
    expect(result.tasks[0].emotional_arc_sync.missed[0].text).toContain('调动、反制和爽感释放')
    expect(result.tasks[0].acceptance_criteria).toContain('emotional_arc_checks 复检通过，missed_count=0')
  })

  test('turns chapter hook misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 53,
        review_type: 'prose_quality',
        summary: '章级钩子存在缺口',
        created_at: '2026-06-08T03:25:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              chapter_hook_checks: [
                {
                  key: 'ending_page_turn',
                  label: '章尾翻页钩子',
                  status: 'warn',
                  evidence: '最后一幕只写封条异常，没有形成具体翻页问题或下一章压力。',
                  fix: '把封条异常落到未揭身份和立即到来的选择压力上。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const chapterHookAnnotation = annotations.find((item: any) => item.category === 'chapter_hook')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(chapterHookAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章级钩子',
      kind: 'chapter_hook_gap',
      title: '章级钩子缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(chapterHookAnnotation?.message).toContain('没有形成具体翻页问题')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('chapter_hook_gap')
    expect(result.tasks[0].annotation_category).toBe('chapter_hook')
    expect(result.tasks[0].chapter_hook_sync.missed[0].text).toContain('具体翻页问题')
    expect(result.tasks[0].acceptance_criteria).toContain('chapter_hook_checks 复检通过，missed_count=0')
  })

  test('turns paragraph hook misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 54,
        review_type: 'prose_quality',
        summary: '段落级钩子存在缺口',
        created_at: '2026-06-08T03:26:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              paragraph_hook_checks: [
                {
                  key: 'micro_hook_stall',
                  label: '段落微推进',
                  status: 'fail',
                  evidence: '连续六段只写环境和站位，没有信息、风险、情绪或关系变化。',
                  fix: '加入暗牌、倒计时或对话压迫，让每3-5段产生可见变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const paragraphHookAnnotation = annotations.find((item: any) => item.category === 'paragraph_hook')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(paragraphHookAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '段落级钩子',
      kind: 'paragraph_hook_gap',
      title: '段落级钩子缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(paragraphHookAnnotation?.message).toContain('没有信息、风险、情绪或关系变化')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('paragraph_hook_gap')
    expect(result.tasks[0].annotation_category).toBe('paragraph_hook')
    expect(result.tasks[0].paragraph_hook_sync.missed[0].text).toContain('连续六段')
    expect(result.tasks[0].acceptance_criteria).toContain('paragraph_hook_checks 复检通过，missed_count=0')
  })

  test('turns suspense misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 55,
        review_type: 'prose_quality',
        summary: '悬念编排存在缺口',
        created_at: '2026-06-08T03:27:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              suspense_checks: [
                {
                  key: 'question_misdirect_answer',
                  label: '疑问误导答案循环',
                  status: 'fail',
                  evidence: '正文只抛出封条异常，没有给可信误导、局部答案或新期待。',
                  fix: '先提出谁换封条的问题，再给假提示，章末公布一片答案并立起新问题。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const suspenseAnnotation = annotations.find((item: any) => item.category === 'suspense')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(suspenseAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '悬念编排',
      kind: 'suspense_gap',
      title: '悬念编排缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(suspenseAnnotation?.message).toContain('没有给可信误导')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('suspense_gap')
    expect(result.tasks[0].annotation_category).toBe('suspense')
    expect(result.tasks[0].suspense_sync.missed[0].text).toContain('可信误导')
    expect(result.tasks[0].acceptance_criteria).toContain('suspense_checks 复检通过，missed_count=0')
  })

  test('turns asset linkage misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 56,
        review_type: 'prose_quality',
        summary: '资产挂钩存在缺口',
        created_at: '2026-06-08T03:29:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              asset_linkage_checks: [
                {
                  key: 'isolated_assets',
                  label: '孤立资产',
                  status: 'fail',
                  evidence: '旧钥匙只被点名，没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。',
                  fix: '让旧钥匙触发暗格并带来锁死代价。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const assetAnnotation = annotations.find((item: any) => item.category === 'asset_linkage')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(assetAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '资产挂钩',
      kind: 'asset_linkage_gap',
      title: '资产挂钩缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(assetAnnotation?.message).toContain('旧钥匙只被点名')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('asset_linkage_gap')
    expect(result.tasks[0].annotation_category).toBe('asset_linkage')
    expect(result.tasks[0].asset_linkage_sync.missed[0].text).toContain('旧钥匙')
    expect(result.tasks[0].acceptance_criteria).toContain('asset_linkage_checks 复检通过，missed_count=0')
  })

  test('turns dialogue misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 57,
        review_type: 'prose_quality',
        summary: '对白质量存在缺口',
        created_at: '2026-06-08T03:31:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              dialogue_checks: [
                {
                  key: 'subtext_agenda',
                  label: '潜台词与议程',
                  status: 'fail',
                  evidence: '周薄森直接解释真实目的，整段对白像说明书，没有权力博弈或信息差。',
                  fix: '把真实目的改成借口、试探、回避和动作反应，让短句方成为权力上位。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const dialogueAnnotation = annotations.find((item: any) => item.category === 'dialogue')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(dialogueAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '对白质量',
      kind: 'dialogue_gap',
      title: '对白质量缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(dialogueAnnotation?.message).toContain('说明书')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('dialogue_gap')
    expect(result.tasks[0].annotation_category).toBe('dialogue')
    expect(result.tasks[0].dialogue_sync.missed[0].text).toContain('周薄森')
    expect(result.tasks[0].acceptance_criteria).toContain('dialogue_checks 复检通过，missed_count=0')
  })

  test('turns plot dynamics misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 58,
        review_type: 'prose_quality',
        summary: '剧情动力存在缺口',
        created_at: '2026-06-08T03:33:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              plot_dynamics_checks: [
                {
                  key: 'goal_obstacle_action_feedback',
                  label: '剧情闭环',
                  status: 'fail',
                  evidence: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
                  fix: '先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const plotAnnotation = annotations.find((item: any) => item.category === 'plot_dynamics')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(plotAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '剧情动力',
      kind: 'plot_dynamics_gap',
      title: '剧情动力缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(plotAnnotation?.message).toContain('红色阀门')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('plot_dynamics_gap')
    expect(result.tasks[0].annotation_category).toBe('plot_dynamics')
    expect(result.tasks[0].plot_dynamics_sync.missed[0].text).toContain('红色阀门')
    expect(result.tasks[0].acceptance_criteria).toContain('plot_dynamics_checks 复检通过，missed_count=0')
  })

  test('turns character relation misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 59,
        review_type: 'prose_quality',
        summary: '角色关系存在缺口',
        created_at: '2026-06-08T03:35:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              character_relation_checks: [
                {
                  key: 'goal_ownership',
                  label: '目标归属',
                  status: 'fail',
                  evidence: '主角只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
                  fix: '把旧案改成会影响主角阵盘资格的风险，让主角主动押上名额交换线索。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const relationAnnotation = annotations.find((item: any) => item.category === 'character_relation')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(relationAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '角色关系',
      kind: 'character_relation_gap',
      title: '角色关系缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(relationAnnotation?.message).toContain('帮林栖雨')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('character_relation_gap')
    expect(result.tasks[0].annotation_category).toBe('character_relation')
    expect(result.tasks[0].character_relation_sync.missed[0].text).toContain('主角只是在帮林栖雨')
    expect(result.tasks[0].acceptance_criteria).toContain('character_relation_checks 复检通过，missed_count=0')
  })

  test('turns character behavior misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 60,
        review_type: 'prose_quality',
        summary: '角色行为存在缺口',
        created_at: '2026-06-08T03:37:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              character_behavior_checks: [
                {
                  key: 'motivation_specificity',
                  label: '动机具体性',
                  status: 'fail',
                  evidence: '主角只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
                  fix: '把动机改成阵盘资格被夺的具体事件，并补主角为母亲旧约承担代价的情感理由。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const behaviorAnnotation = annotations.find((item: any) => item.category === 'character_behavior')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(behaviorAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '角色行为',
      kind: 'character_behavior_gap',
      title: '角色行为缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(behaviorAnnotation?.message).toContain('只是想变强')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('character_behavior_gap')
    expect(result.tasks[0].annotation_category).toBe('character_behavior')
    expect(result.tasks[0].character_behavior_sync.missed[0].text).toContain('主角只是想变强')
    expect(result.tasks[0].acceptance_criteria).toContain('character_behavior_checks 复检通过，missed_count=0')
  })

  test('turns conflict structure misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 61,
        review_type: 'prose_quality',
        summary: '冲突结构存在缺口',
        created_at: '2026-06-08T03:39:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              conflict_structure_checks: [
                {
                  key: 'no_exit_stakes',
                  label: '有进无出',
                  status: 'fail',
                  evidence: '主角可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
                  fix: '让内门执事封门并押上阵盘资格，必须完成账本核验才能脱身。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const conflictAnnotation = annotations.find((item: any) => item.category === 'conflict_structure')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(conflictAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '冲突结构',
      kind: 'conflict_structure_gap',
      title: '冲突结构缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(conflictAnnotation?.message).toContain('随时离开账房')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('conflict_structure_gap')
    expect(result.tasks[0].annotation_category).toBe('conflict_structure')
    expect(result.tasks[0].conflict_structure_sync.missed[0].text).toContain('主角可以随时离开账房')
    expect(result.tasks[0].acceptance_criteria).toContain('conflict_structure_checks 复检通过，missed_count=0')
  })

  test('turns opening misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 1, title: '阵师归来', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 62,
        review_type: 'prose_quality',
        summary: '开篇设计存在缺口',
        created_at: '2026-06-08T03:41:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 1,
          score: 84,
          passed: true,
          self_check: {
            review: {
              opening_checks: [
                {
                  key: 'protagonist_entry_delay',
                  label: '300字主角登场',
                  status: 'fail',
                  evidence: '开头连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
                  fix: '第一段直接让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const openingAnnotation = annotations.find((item: any) => item.category === 'opening')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(openingAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '开篇设计',
      kind: 'opening_gap',
      title: '开篇设计缺口 1',
      chapter_id: 7,
      chapter_no: 1,
    })
    expect(openingAnnotation?.message).toContain('宗门天气')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('opening_gap')
    expect(result.tasks[0].annotation_category).toBe('opening')
    expect(result.tasks[0].opening_sync.missed[0].text).toContain('主角第900字才出现')
    expect(result.tasks[0].acceptance_criteria).toContain('opening_checks 复检通过，missed_count=0')
  })

  test('turns bridge unit misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧城会审', chapter_text: '正文', ending_hook: '赤炉城供奉递来新契。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 63,
        review_type: 'prose_quality',
        summary: '桥段节奏存在缺口',
        created_at: '2026-06-08T03:42:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              bridge_unit_checks: [
                {
                  key: 'expectation_chain_break',
                  label: '连续期待',
                  status: 'fail',
                  evidence: '旧城会审兑现旧期待后直接散场，章尾没有新目标，也没有高潮中埋钩子。',
                  fix: '兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const bridgeAnnotation = annotations.find((item: any) => item.category === 'bridge_unit')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(bridgeAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '桥段节奏',
      kind: 'bridge_unit_gap',
      title: '桥段节奏缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(bridgeAnnotation?.message).toContain('直接散场')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('bridge_unit_gap')
    expect(result.tasks[0].annotation_category).toBe('bridge_unit')
    expect(result.tasks[0].bridge_unit_sync.missed[0].text).toContain('章尾没有新目标')
    expect(result.tasks[0].acceptance_criteria).toContain('bridge_unit_checks 复检通过，missed_count=0')
  })

})
