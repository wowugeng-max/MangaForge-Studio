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

  test('carries prose approval blockers into editor repair prompts', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 21,
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
            score: 42,
            copy_hit_count: 2,
            reasons: ['门槛测试与参考样章连续三拍相似'],
          },
        }),
      },
    ])
    const revisionPrompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter,
      report: { must_fix: [], one_click_revision_prompt: '' },
      deliveryRiskBrief: brief,
      revisionMode: 'from_report',
      userPrompt: '',
    })

    expect(brief.priority_label).toBe('优先处理入库阻断')
    expect(brief.items[0]).toContain('处理入库阻断：仿写安全阻断')
    expect(brief.approval_blocker).toMatchObject({
      type: 'reference_safety_blocked',
      label: '仿写安全阻断',
      score_label: '入库阻断 76',
      copy_hit_count: 2,
    })
    expect(brief.approval_blocker.reasons).toContain('门槛测试与参考样章连续三拍相似')
    expect(brief.revision_directives[0]).toContain('必须优先处理入库阻断')
    expect(revisionPrompt).toContain('仿写安全阻断')
    expect(revisionPrompt).toContain('门槛测试与参考样章连续三拍相似')
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

  test('carries quality audit repair receipt gaps into editor delivery risk brief', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 36,
        review_type: 'quality_audit_repair_receipt_sync',
        created_at: '2026-06-08T03:09:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
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

    expect(brief.items).toContain('复核质量回执：质量诊断修复回执缺口 1')
    expect(brief.priority_label).toBe('优先补质量回执')
    expect(brief.revision_directives.some((item: string) => item.includes('quality_audit_repair_receipts.changed_evidence'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('quality_audit_checks'))).toBe(true)
    expect(brief.risks[0].evidence.missed[0].text).toContain('changed_evidence 为空')
  })

  test('carries deslop repair receipt gaps into editor delivery risk brief', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 37,
        review_type: 'deslop_repair_receipt_sync',
        created_at: '2026-06-08T03:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
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

    expect(brief.items).toContain('复核去AI味回执：去AI味修复回执残留 1')
    expect(brief.priority_label).toBe('优先去AI味回执')
    expect(brief.revision_directives.some((item: string) => item.includes('deslop_repair_receipts.changed_evidence'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('Gate A-G'))).toBe(true)
    expect(brief.risks[0].evidence.missed[0].text).toContain('连续主语问题')
  })

  test('carries revision cascade and scope guard gaps into editor delivery risk brief', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 38,
        review_type: 'revision_cascade_impact_sync',
        created_at: '2026-06-08T03:11:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          revision_cascade_impact_sync: {
            status: 'warn',
            label: '修订级联影响 2',
            summary: '本章修订产生 2 项会影响后续章节的同步义务。',
            missed_count: 2,
            evidence_missing_count: 1,
            missed: [
              { target: '令牌背面血字', text: '令牌状态改变会影响第8章开篇交接。', required_action: '下一章先同步令牌新状态。' },
              { target: '旧执事关系', text: '执事态度从敌对变成观察。', required_action: '后续章节不得继续按纯敌对处理。' },
            ],
            next_actions: ['下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界。'],
          },
        }),
      },
      {
        id: 39,
        review_type: 'revision_scope_guard_sync',
        created_at: '2026-06-08T03:12:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
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

    expect(brief.items).toContain('级联修订：修订级联影响 2')
    expect(brief.items).toContain('稳修订幅度：修订幅度过大 1200')
    expect(brief.priority_label).toBe('优先级联修订')
    expect(brief.revision_directives.some((item: string) => item.includes('cascade_impacts'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('不要重写整章'))).toBe(true)
  })

  test('carries prose revision receipt sync misses into editor delivery risk brief', () => {
    const brief = buildChapterDeliveryRiskBrief(chapter, [
      {
        id: 40,
        review_type: 'prose_revision_receipt_sync',
        created_at: '2026-06-08T03:13:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          prose_revision_receipt_sync: {
            status: 'warn',
            label: '修订回执残留 1',
            summary: 'delivery_risk_receipts 有失败项，但 revision_receipts 没有对应修订证据。',
            missed_count: 1,
            missed: [
              {
                category: 'delivery_risk_receipt',
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                text: '最后300字没有形成追读钩子。',
              },
            ],
            next_actions: [
              '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
            ],
          },
        }),
      },
    ])

    expect(brief.items).toContain('复核修订回执：修订回执残留 1')
    expect(brief.priority_label).toBe('优先修订回执')
    expect(brief.revision_directives.some((item: string) => item.includes('delivery_risk_receipts 对应的 revision_receipts'))).toBe(true)
    expect(brief.revision_directives.some((item: string) => item.includes('required_action、repair_segment、applied_fix 和 changed_evidence'))).toBe(true)
    expect(brief.risks[0].evidence.missed[0].repair_segment).toBe('ending_actions')
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

  test('serializes circular context packages in editor report and revision prompts', () => {
    const contextPackage: any = {
      chapter_target: { chapter_goal: '规则边界首次显形' },
      continuity: { previous_chapter: '上一章结尾：门牌裂开。' },
    }
    contextPackage.self = contextPackage
    contextPackage.chapter_outline = contextPackage

    const reportPrompt = buildEditorReportPrompt({
      project: { title: '循环测试' },
      contextPackage,
      chapter: { chapter_text: '正文' },
      latestQuality: null,
      latestReference: null,
    })
    const revisionPrompt = buildEditorRevisionPrompt({
      project: { title: '循环测试' },
      chapter: { chapter_no: 2, title: '第二章', chapter_text: '正文' },
      contextPackage,
      report: { must_fix: ['补衔接'] },
      revisionMode: 'from_report',
      userPrompt: '',
    })

    expect(reportPrompt).toContain('[Circular]')
    expect(revisionPrompt).toContain('[Circular]')
    expect(revisionPrompt).toContain('上一章结尾')
  })

  test('uses safe json for editor payloads that include context packages', () => {
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).not.toContain('payload: JSON.stringify({ chapter_id: chapter.id, report, context_package')
    expect(source).not.toContain('payload: JSON.stringify({ chapter_id: chapter.id, plan, context_package')
    expect(source).not.toContain('JSON.stringify(contextPackage, null, 2).slice(0, 7000)')
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

