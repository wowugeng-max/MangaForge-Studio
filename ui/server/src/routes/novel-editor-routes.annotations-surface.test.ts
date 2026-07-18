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
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('review annotations delivery risk surface', () => {
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

  test('surfaces scene-card receipt audit failures as delivery risk annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const result = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 36,
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
    ])

    const receipt = result.annotations.find((item: any) => item.category === 'scene_card_receipt')

    expect(receipt?.title).toBe('场景回执缺口 1')
    expect(receipt?.kind).toBe('scene_card_receipt_2_undelivered')
    expect(receipt?.severity).toBe('high')
    expect(receipt?.chapter_id).toBe(7)
    expect(receipt?.chapter_no).toBe(3)
    expect(receipt?.message).toContain('scene_card_receipts 标记未兑现')
    expect(receipt?.action).toContain('scene_start_anchor')
    expect(receipt?.action).toContain('scene_end_anchor')
    expect(receipt?.payload.scene_no).toBe(2)
    expect(receipt?.payload.fields).toEqual(['目标/阻碍/状态变化', '感知锚点'])
  })

  test('surfaces generic quality audit failures as delivery risk annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const result = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 37,
        review_type: 'prose_quality',
        summary: '目的词详略失衡',
        created_at: '2026-06-08T03:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          self_check: {
            review: {
              score: 82,
              passed: false,
              status: 'warn',
              quality_audit_checks: [
                {
                  key: 'purpose_tag_density_gap',
                  label: '目的词详略分配',
                  status: 'fail',
                  evidence: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
                  fix: '按目的词重排详略：爽点/打脸展开出手过程，过渡压缩到1-2句。',
                  strategy: 'rewrite',
                },
              ],
            },
          },
        }),
      },
    ])

    const audit = result.annotations.find((item: any) => item.category === 'quality_audit')

    expect(audit?.title).toBe('质量诊断缺口 1')
    expect(audit?.kind).toBe('purpose_tag_density_gap')
    expect(audit?.severity).toBe('high')
    expect(audit?.chapter_id).toBe(7)
    expect(audit?.chapter_no).toBe(3)
    expect(audit?.message).toContain('爽点场景只用一句摘要带过')
    expect(audit?.action).toContain('目的词')
    expect(audit?.action).toContain('水文')
    expect(audit?.payload.checks[0].strategy).toBe('rewrite')
  })

  test('surfaces quality audit repair receipt sync gaps as delivery risk annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const result = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 38,
        review_type: 'quality_audit_repair_receipt_sync',
        summary: '质量诊断修复回执缺口',
        created_at: '2026-06-08T03:11:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          quality_audit_repair_receipt_sync: {
            status: 'warn',
            label: '质量诊断修复回执缺口 1',
            summary: '质量诊断修复执行后，仍有 1 项缺口没有形成回执证据。',
            missed_count: 1,
            receipt_count: 2,
            missed: [
              { label: '目的词详略分配', text: 'original_evidence 有问题，但 changed_evidence 为空。' },
            ],
            next_actions: ['重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。'],
          },
        }),
      },
    ])

    const receipt = result.annotations.find((item: any) => item.category === 'quality_audit_repair_receipt')

    expect(receipt?.title).toBe('质量诊断修复回执缺口 1')
    expect(receipt?.kind).toBe('quality_audit_repair_receipt')
    expect(receipt?.severity).toBe('high')
    expect(receipt?.chapter_id).toBe(7)
    expect(receipt?.chapter_no).toBe(3)
    expect(receipt?.source_label).toBe('质量回执')
    expect(receipt?.message).toContain('changed_evidence 为空')
    expect(receipt?.action).toContain('quality_audit_repair_receipts.changed_evidence')
    expect(receipt?.payload.missed[0].label).toBe('目的词详略分配')
  })

  test('surfaces deslop repair receipt sync gaps as delivery risk annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const result = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 39,
        review_type: 'deslop_repair_receipt_sync',
        summary: '去AI味修复回执残留',
        created_at: '2026-06-08T03:12:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          deslop_repair_receipt_sync: {
            status: 'warn',
            label: '去AI味修复回执残留 1',
            summary: '去AI味修复后仍有 1 项残留风险需要继续处理。',
            missed_count: 1,
            receipt_count: 2,
            missed: [
              { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
            ],
            next_actions: ['重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。'],
          },
        }),
      },
    ])

    const receipt = result.annotations.find((item: any) => item.category === 'deslop_repair_receipt')

    expect(receipt?.title).toBe('去AI味修复回执残留 1')
    expect(receipt?.kind).toBe('deslop_repair_receipt')
    expect(receipt?.severity).toBe('high')
    expect(receipt?.chapter_id).toBe(7)
    expect(receipt?.chapter_no).toBe(3)
    expect(receipt?.source_label).toBe('去AI味回执')
    expect(receipt?.message).toContain('连续主语问题')
    expect(receipt?.action).toContain('deslop_repair_receipts.changed_evidence')
    expect(receipt?.payload.missed[0].label).toBe('Gate B 句式套路')
  })

  test('surfaces revision cascade and scope guard sync gaps as delivery risk annotations', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const result = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 40,
        review_type: 'revision_cascade_impact_sync',
        summary: '修订级联影响',
        created_at: '2026-06-08T03:13:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          revision_cascade_impact_sync: {
            status: 'warn',
            label: '修订级联影响 2',
            summary: '本章修订产生 2 项会影响后续章节的同步义务。',
            missed_count: 2,
            missed: [
              { target: '令牌背面血字', text: '令牌状态改变会影响第8章开篇交接。', required_action: '下一章先同步令牌新状态。' },
            ],
            next_actions: ['下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界。'],
          },
        }),
      },
      {
        id: 41,
        review_type: 'revision_scope_guard_sync',
        summary: '修订幅度过大',
        created_at: '2026-06-08T03:14:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          revision_scope_guard_sync: {
            status: 'warn',
            label: '修订幅度过大 1200',
            summary: '修订前后字数差异 1200 字，超过警戒线 800 字。',
            missed_count: 1,
            missed: [
              { label: '修订幅度过大', text: '修订扩写 1200 字，超过允许差异 800 字。' },
            ],
            next_actions: ['下一轮修订不要重写整章；只按自检证据和修订回执残留做局部修复。'],
          },
        }),
      },
    ])

    const cascade = result.annotations.find((item: any) => item.category === 'revision_cascade_impact')
    const scope = result.annotations.find((item: any) => item.category === 'revision_scope_guard')

    expect(cascade?.title).toBe('修订级联影响 2')
    expect(cascade?.source_label).toBe('级联修订')
    expect(cascade?.message).toContain('令牌状态改变')
    expect(cascade?.action).toContain('cascade_impacts')
    expect(scope?.title).toBe('修订幅度过大 1200')
    expect(scope?.source_label).toBe('修订幅度')
    expect(scope?.message).toContain('修订扩写 1200 字')
    expect(scope?.action).toContain('不要重写整章')
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
})
