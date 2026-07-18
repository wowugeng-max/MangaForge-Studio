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

describe('applySurgicalRevisionPatch', () => {
  test('applies deletion replacements returned by revision patches', () => {
    const originalText = '他心里有一种说不清道不明的感觉。\n\n门外传来脚步声。'

    const result = applySurgicalRevisionPatch(originalText, {
      revision_mode: 'patch',
      replacements: [
        { find: '他心里有一种说不清道不明的感觉。\n\n', replace: '' },
      ],
      revision_summary: '删除抽象重复描写。',
    })

    expect(result.chapterText).toBe('门外传来脚步声。')
    expect(result.applied).toHaveLength(1)
    expect(result.applied[0]).toMatchObject({ type: 'replacement' })
    expect(result.unapplied).toEqual([])
  })

  test('matches replacement anchors across whitespace differences', () => {
    const originalText = '丁松言醒来的时候，嘴里全是石灰和木屑的味道。他撑着地面坐起来，指尖按进泥里。'

    const result = applySurgicalRevisionPatch(originalText, {
      revision_mode: 'patch',
      replacements: [
        {
          find: '丁松言醒来的时候，嘴里全是石灰和木屑的味道。\n\n他撑着地面坐起来，指尖按进泥里。',
          replace: '丁松言醒来时，嘴里全是石灰和木屑的味道。他撑着地面坐起，指尖按进泥里。',
        },
      ],
    })

    expect(result.chapterText).toBe('丁松言醒来时，嘴里全是石灰和木屑的味道。他撑着地面坐起，指尖按进泥里。')
    expect(result.applied[0]).toMatchObject({ type: 'replacement', match: 'normalized_whitespace' })
    expect(result.unapplied).toEqual([])
  })
})

describe('editor revision route safeguards', () => {
  test('detects max-token truncated revision output before reporting missing patches', () => {
    expect(isRevisionOutputTruncated({
      finish_reason: 'max_tokens',
      usage: { output_tokens: 2600 },
      raw: { stop_reason: 'max_tokens' },
    })).toBe(true)
  })

  test('requests enough output tokens for long local revision patches', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('REVISION_MAX_TOKENS')
    expect(source).not.toContain('maxTokens: 2600')
  })

  test('tells the revision model to keep patch anchors compact and allow deletions', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '旧段落。\n\n下一段。' },
      report: { must_fix: ['删除重复抽象描写'] },
      revisionMode: 'from_report',
      userPrompt: '',
    })

    expect(prompt).toContain('find/anchor 控制在')
    expect(prompt).toContain('replace 允许为空字符串')
  })

  test('asks editor revision to follow workflow-revision context and output receipts', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: {
        chapter_no: 12,
        title: '门后名单',
        chapter_text: '林青禾按住门牌。\n\n周远把名单推到灯下。',
      },
      report: { must_fix: ['修订后要同步下一章名单伏笔'] },
      deliveryRiskBrief: { revision_directives: ['下一章必须承接名单归属变化'] },
      revisionMode: 'from_report',
      userPrompt: '只改章末名单揭示。',
    })

    expect(prompt).toContain('workflow-revision')
    expect(prompt).toContain('Step 2')
    expect(prompt).toContain('previous_chapter')
    expect(prompt).toContain('next_chapter')
    expect(prompt).toContain('foreshadowing')
    expect(prompt).toContain('character_cards')
    expect(prompt).toContain('timeline')
    expect(prompt).toContain('setting_context')
    expect(prompt).toContain('正文元信息扫描')
    expect(prompt).toContain('禁用词扫描')
    expect(prompt).toContain('原文长度')
    expect(prompt).toContain('30%')
    expect(prompt).toContain('800 字')
    expect(prompt).toContain('revision_context_receipts')
    expect(prompt).toContain('revision_scope_guard')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('cascade_impacts')
    expect(prompt).toContain('affected_chapters')
  })

  test('injects actual workflow-revision context slices into editor revision prompt', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: {
        chapter_no: 12,
        title: '门后名单',
        chapter_text: '林青禾按住门牌。\n\n周远把名单推到灯下。',
      },
      contextPackage: {
        continuity: {
          previous_chapter: '第11章尾：水迹名单第一次出现，周远没有拿到原件。',
          next_chapter: '第13章开篇：名单归属决定广播室门禁。',
        },
        chapter_outline: '细纲_第12章：章末只揭示名单半页，不提前公开全部姓名。',
        foreshadowing_context: ['名单背面的红线是后续伏笔。'],
        story_state: {
          characters: [
            { name: '林青禾', state: '怀疑周远隐瞒名单来源' },
            { name: '周远', state: '暂时持有名单复印件' },
          ],
          timeline: ['门牌翻面后，名单才能被灯照出红线。'],
        },
        setting_context: {
          required: ['广播室门禁', '名单红线'],
          forbidden: ['提前公布名单全名'],
        },
      },
      report: { must_fix: ['修订后要同步下一章名单伏笔'] },
      deliveryRiskBrief: { revision_directives: ['下一章必须承接名单归属变化'] },
      revisionMode: 'from_report',
      userPrompt: '只改章末名单揭示。',
    })

    expect(prompt).toContain('【workflow-revision 上下文包】')
    expect(prompt).toContain('第11章尾')
    expect(prompt).toContain('第13章开篇')
    expect(prompt).toContain('细纲_第12章')
    expect(prompt).toContain('名单背面的红线')
    expect(prompt).toContain('林青禾')
    expect(prompt).toContain('周远')
    expect(prompt).toContain('门牌翻面后')
    expect(prompt).toContain('广播室门禁')
    expect(prompt).toContain('提前公布名单全名')
  })

  test('builds context package before applying editor revision', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')
    const routeStart = source.indexOf("app.post('/api/novel/reviews/:reviewId/apply-revision'")
    const routeBlock = source.slice(routeStart, source.indexOf("app.post('/api/novel/chapters/:chapterId/quality-card'", routeStart))

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('listNovelWorldbuilding')
    expect(routeBlock).toContain('listNovelCharacters')
    expect(routeBlock).toContain('listNovelOutlines')
    expect(routeBlock).toContain('ctx.buildChapterContextPackage')
    expect(routeBlock).toContain('contextPackage')
  })

  test('persists editor workflow revision receipts for handoff tracking', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')
    const saveStart = source.indexOf("review_type: 'editor_revision'")
    const saveBlock = source.slice(saveStart, source.indexOf('})', saveStart))

    expect(saveStart).toBeGreaterThanOrEqual(0)
    expect(saveBlock).toContain('revision_context_receipts')
    expect(saveBlock).toContain('revision_receipts')
    expect(saveBlock).toContain('revision_scope_guard')
    expect(saveBlock).toContain('cascade_impacts')
  })

  test('builds a compact retry prompt for truncated revision output', () => {
    const prompt = buildCompactEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '第一段。\n\n第二段。\n\n第三段。' },
      report: { must_fix: ['删掉重复抽象描写'] },
      deliveryRiskBrief: { revision_directives: ['削减抽象描写'] },
      revisionMode: 'from_report',
      userPrompt: '',
      previousOutputPreview: '{"replacements":[{"find":"超长未闭合',
    })

    expect(prompt).toContain('上一次修订输出被截断')
    expect(prompt).toContain('最多 6 条 replacements')
    expect(prompt).toContain('不要输出 Markdown')
    expect(prompt).toContain('禁止输出 chapter_text')
    expect(prompt).toContain('find 控制在 20-160 字')
    expect(prompt).toContain('replace 控制在 0-900 字')
  })

  test('routes truncated revision output through a compact retry before returning failure', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('buildCompactEditorRevisionPrompt')
    expect(source).toContain('retryResult')
    expect(source).toContain('revision_retry')
  })

  test('routes anchor-miss revision output through a compact retry before returning failure', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('initial_patch_not_applicable')
    expect(source).toContain('shouldRetryRevisionPatch')
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

  test('turns reversal misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印反证', chapter_text: '正文', ending_hook: '执事袖中的旧部印记暴露。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 64,
        review_type: 'prose_quality',
        summary: '反转设计存在缺口',
        created_at: '2026-06-08T03:43:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              reversal_checks: [
                {
                  key: 'setup_clues_missing',
                  label: '铺垫暗示',
                  status: 'fail',
                  evidence: '执事身份反转是揭示时才出现的新信息，前文没有3处公平暗示，揭示后只靠长解释说明。',
                  fix: '在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const reversalAnnotation = annotations.find((item: any) => item.category === 'reversal')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(reversalAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '反转设计',
      kind: 'reversal_gap',
      title: '反转设计缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(reversalAnnotation?.message).toContain('新信息')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('reversal_gap')
    expect(result.tasks[0].annotation_category).toBe('reversal')
    expect(result.tasks[0].reversal_sync.missed[0].text).toContain('没有3处公平暗示')
    expect(result.tasks[0].acceptance_criteria).toContain('reversal_checks 复检通过，missed_count=0')
  })

  test('turns showdown misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 65,
        review_type: 'prose_quality',
        summary: '高潮对抗存在缺口',
        created_at: '2026-06-08T03:44:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              showdown_checks: [
                {
                  key: 'payoff_release_missing',
                  label: '爽点释放',
                  status: 'fail',
                  evidence: '主角亮出旧印后执事没有受到对应压制，旁观者只统一震惊，底牌释放后没有新目标。',
                  fix: '让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const showdownAnnotation = annotations.find((item: any) => item.category === 'showdown')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(showdownAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '高潮对抗',
      kind: 'showdown_gap',
      title: '高潮对抗缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(showdownAnnotation?.message).toContain('没有受到对应压制')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('showdown_gap')
    expect(result.tasks[0].annotation_category).toBe('showdown')
    expect(result.tasks[0].showdown_sync.missed[0].text).toContain('旁观者只统一震惊')
    expect(result.tasks[0].acceptance_criteria).toContain('showdown_checks 复检通过，missed_count=0')
  })

  test('turns prose craft misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 66,
        review_type: 'prose_quality',
        summary: '正文工艺存在缺口',
        created_at: '2026-06-08T03:45:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              prose_craft_checks: [
                {
                  key: 'omniscient_crowd_camera',
                  label: '远景概括',
                  status: 'fail',
                  evidence: '高潮段连续写全场死寂、所有人震惊，没有主角深度限知，也没有身体细节或环境交互承接。',
                  fix: '改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const proseCraftAnnotation = annotations.find((item: any) => item.category === 'prose_craft')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(proseCraftAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文工艺',
      kind: 'prose_craft_gap',
      title: '正文工艺缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(proseCraftAnnotation?.message).toContain('全场死寂')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('prose_craft_gap')
    expect(result.tasks[0].annotation_category).toBe('prose_craft')
    expect(result.tasks[0].prose_craft_sync.missed[0].text).toContain('没有主角深度限知')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_craft_checks 复检通过，missed_count=0')
  })

  test('preserves scene-card directive prose craft checks as targeted repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 166,
        review_type: 'prose_quality',
        summary: '场景卡禁令执行失败',
        created_at: '2026-06-08T03:45:30.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              prose_craft_checks: [
                {
                  key: 'omniscient_crowd_camera',
                  label: '远景概括',
                  status: 'warn',
                  evidence: '高潮段仍有全场远景概括。',
                  fix: '改成主角深度限知和身体细节。',
                },
                {
                  key: 'scene_card_1_forbidden_directives',
                  label: '场景卡禁令执行',
                  status: 'fail',
                  evidence: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
                  fix: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const sceneCardDirectiveAnnotation = annotations.find((item: any) => item.kind === 'scene_card_1_forbidden_directives')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(sceneCardDirectiveAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文工艺',
      kind: 'scene_card_1_forbidden_directives',
      category: 'prose_craft',
      title: '正文工艺缺口 2',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(sceneCardDirectiveAnnotation?.message).toContain('不得用整段来历/等级解释蓝晶')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('scene_card_1_forbidden_directives')
    expect(result.tasks[0].annotation_category).toBe('prose_craft')
    expect(result.tasks[0].prose_craft_sync.key).toBe('scene_card_1_forbidden_directives')
    expect(result.tasks[0].prose_craft_sync.missed[1].fix).toContain('动作反应、对话半句、物理后果')
  })

  test('turns punctuation tone misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 67,
        review_type: 'prose_quality',
        summary: '语气标点存在缺口',
        created_at: '2026-06-08T03:46:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              punctuation_tone_checks: [
                {
                  key: 'ellipsis_dash_pause',
                  label: '硬停顿',
                  status: 'fail',
                  evidence: '执事质问连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号，角色声线和主角一样。',
                  fix: '改成执事话被审判木裂响打断，用短句和动作承接迟疑；爆发只保留一个情绪落点。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const punctuationToneAnnotation = annotations.find((item: any) => item.category === 'punctuation_tone')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(punctuationToneAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '语气标点',
      kind: 'punctuation_tone_gap',
      title: '语气标点缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(punctuationToneAnnotation?.message).toContain('你竟然')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('punctuation_tone_gap')
    expect(result.tasks[0].annotation_category).toBe('punctuation_tone')
    expect(result.tasks[0].punctuation_tone_sync.missed[0].text).toContain('爆发句乱用三个感叹号')
    expect(result.tasks[0].acceptance_criteria).toContain('punctuation_tone_checks 复检通过，missed_count=0')
  })

  test('turns content rubric misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 68,
        review_type: 'prose_quality',
        summary: '内容基准存在缺口',
        created_at: '2026-06-08T03:47:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              content_rubric_checks: [
                {
                  key: 'golden_three_questions',
                  label: '黄金三问',
                  status: 'fail',
                  evidence: '本章没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化，也缺少支持内容判断的正文证据。',
                  fix: '补旧印改变审判资格、长老席追查内库阵图的新期待，并用正文动作和对白证明变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const contentRubricAnnotation = annotations.find((item: any) => item.category === 'content_rubric')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(contentRubricAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '内容基准',
      kind: 'content_rubric_gap',
      title: '内容基准缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(contentRubricAnnotation?.message).toContain('为什么翻下一页')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('content_rubric_gap')
    expect(result.tasks[0].annotation_category).toBe('content_rubric')
    expect(result.tasks[0].content_rubric_sync.missed[0].text).toContain('局势没有可见变化')
    expect(result.tasks[0].acceptance_criteria).toContain('content_rubric_checks 复检通过，missed_count=0')
  })

  test('turns reader retention misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 69,
        review_type: 'prose_quality',
        summary: '追读雷达存在缺口',
        created_at: '2026-06-08T03:48:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              reader_retention_checks: [
                {
                  key: 'double_engine_hunger_missing',
                  label: '留存双引擎',
                  status: 'fail',
                  evidence: '本章有情绪爆发，但没有信息差植入问号，旧印来源和内库阵图线索一次性讲完，章尾没有追读饥饿。',
                  fix: '把旧印来源卡到章尾，只露出内库阵图半枚残印，给长老席追查的新问题和随机额外收获。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const readerRetentionAnnotation = annotations.find((item: any) => item.kind === 'reader_retention_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(readerRetentionAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '追读雷达',
      kind: 'reader_retention_gap',
      title: '追读雷达缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(readerRetentionAnnotation?.message).toContain('没有信息差植入问号')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('reader_retention_gap')
    expect(result.tasks[0].annotation_category).toBe('reader_retention')
    expect(result.tasks[0].reader_retention_check_sync.missed[0].text).toContain('章尾没有追读饥饿')
    expect(result.tasks[0].acceptance_criteria).toContain('reader_retention_checks 复检通过，missed_count=0')
  })

  test('turns target reader misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 70,
        review_type: 'prose_quality',
        summary: '目标读者存在缺口',
        created_at: '2026-06-08T03:49:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              target_reader_checks: [
                {
                  key: 'emotion_gap_missing',
                  label: '情绪缺口',
                  status: 'fail',
                  evidence: '目标读者画像只写年轻读者，缺核心痛苦、深层情结和未满足需求，本章旧印亮出后没有给尊严补偿。',
                  fix: '把被宗门轻视的核心痛苦写成审判现场压力，用旧印反证资格并给读者尊严回报。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const targetReaderAnnotation = annotations.find((item: any) => item.kind === 'target_reader_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(targetReaderAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '目标读者',
      kind: 'target_reader_gap',
      title: '目标读者缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(targetReaderAnnotation?.message).toContain('缺核心痛苦')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('target_reader_gap')
    expect(result.tasks[0].annotation_category).toBe('target_reader')
    expect(result.tasks[0].target_reader_sync.missed[0].text).toContain('没有给尊严补偿')
    expect(result.tasks[0].acceptance_criteria).toContain('target_reader_checks 复检通过，missed_count=0')
  })

  test('turns genre positioning misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 71,
        review_type: 'prose_quality',
        summary: '题材定位存在缺口',
        created_at: '2026-06-08T03:50:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              genre_positioning_checks: [
                {
                  key: 'core_hook_blurry',
                  label: '核心梗',
                  status: 'fail',
                  evidence: '本章挂阵修题材，但旧印只当普通信物使用，核心梗和阵法长板没有变成审判现场优势，书名简介承诺的阵师逆袭没有正文证据。',
                  fix: '把旧印改成阵法资格反证，围绕阵修长板扩出识阵、破阵、反制三处正文证据。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const genrePositioningAnnotation = annotations.find((item: any) => item.kind === 'genre_positioning_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(genrePositioningAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '题材定位',
      kind: 'genre_positioning_gap',
      title: '题材定位缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(genrePositioningAnnotation?.message).toContain('核心梗')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('genre_positioning_gap')
    expect(result.tasks[0].annotation_category).toBe('genre_positioning')
    expect(result.tasks[0].genre_positioning_sync.missed[0].text).toContain('书名简介承诺')
    expect(result.tasks[0].acceptance_criteria).toContain('genre_positioning_checks 复检通过，missed_count=0')
  })

  test('turns female audience misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 72,
        review_type: 'prose_quality',
        summary: '女频长篇存在缺口',
        created_at: '2026-06-08T03:51:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              female_audience_checks: [
                {
                  key: 'agency_and_security_missing',
                  label: '安全感与主动性',
                  status: 'fail',
                  evidence: '本章女主被长老安排着赢，缺少自己做决定的动作；旧印反转只打脸，没有安全感锚点、被珍视回馈和虐后反糖。',
                  fix: '改成女主主动亮出旧印并承担代价，让盟友公开站队给安全感反馈，章尾补一颗反转后的糖。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const femaleAudienceAnnotation = annotations.find((item: any) => item.kind === 'female_audience_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(femaleAudienceAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '女频长篇',
      kind: 'female_audience_gap',
      title: '女频长篇缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(femaleAudienceAnnotation?.message).toContain('被长老安排着赢')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('female_audience_gap')
    expect(result.tasks[0].annotation_category).toBe('female_audience')
    expect(result.tasks[0].female_audience_sync.missed[0].text).toContain('没有安全感锚点')
    expect(result.tasks[0].acceptance_criteria).toContain('female_audience_checks 复检通过，missed_count=0')
  })

  test('turns upgrade rhythm misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 73,
        review_type: 'prose_quality',
        summary: '升级节奏存在缺口',
        created_at: '2026-06-08T03:52:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              upgrade_rhythm_checks: [
                {
                  key: 'feedback_and_threshold_missing',
                  label: '升级反馈与门槛',
                  status: 'fail',
                  evidence: '本章获得旧印后只有奖励，没有展示升级前情绪缺口、即时反馈、延迟反馈和新门槛；金手指触发条件和升级规则不清晰。',
                  fix: '补升级前被压制的情绪缺口，旧印即时改变审判资格，延迟引出更高门槛，并把金手指功能、触发、奖励和升级规则写成一眼能懂的动作反馈。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const upgradeRhythmAnnotation = annotations.find((item: any) => item.kind === 'upgrade_rhythm_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(upgradeRhythmAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '升级节奏',
      kind: 'upgrade_rhythm_gap',
      title: '升级节奏缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(upgradeRhythmAnnotation?.message).toContain('升级前情绪缺口')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('upgrade_rhythm_gap')
    expect(result.tasks[0].annotation_category).toBe('upgrade_rhythm')
    expect(result.tasks[0].upgrade_rhythm_sync.missed[0].text).toContain('即时反馈')
    expect(result.tasks[0].acceptance_criteria).toContain('upgrade_rhythm_checks 复检通过，missed_count=0')
  })

  test('turns chapter structure and progression misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 74,
        review_type: 'prose_quality',
        summary: '章节结构和推进存在缺口',
        created_at: '2026-06-08T03:53:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 81,
          passed: false,
          self_check: {
            review: {
              structure_checks: [
                {
                  key: 'missing_turning_structure',
                  label: '章节结构',
                  status: 'fail',
                  evidence: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
                  fix: '开头补具体异常，中段让旧印触发行动推进，局势从被审问变成反证成功，章尾落到新证人出现。',
                },
              ],
              progression_checks: [
                {
                  key: 'deletable_chapter',
                  label: '章节推进',
                  status: 'warn',
                  evidence: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
                  fix: '补本章不可删除的证据、选择、代价或关系变化，并压缩等待和复述段落。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const structureAnnotation = annotations.find((item: any) => item.kind === 'chapter_structure_gap')
    const progressionAnnotation = annotations.find((item: any) => item.kind === 'chapter_progression_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(structureAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章节结构',
      kind: 'chapter_structure_gap',
      title: '章节结构缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(progressionAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章节推进',
      kind: 'chapter_progression_gap',
      title: '章节推进缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['chapter_structure_gap', 'chapter_progression_gap'])
    expect(result.tasks[0].chapter_structure_sync.missed[0].text).toContain('开头没有钩子')
    expect(result.tasks[0].acceptance_criteria).toContain('structure_checks 复检通过，missed_count=0')
    expect(result.tasks[1].chapter_progression_sync.missed[0].text).toContain('删掉这章不影响理解')
    expect(result.tasks[1].acceptance_criteria).toContain('progression_checks 复检通过，missed_count=0')
  })

  test('turns information load and longform misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 75,
        review_type: 'prose_quality',
        summary: '信息负载和长篇连续性存在缺口',
        created_at: '2026-06-08T03:54:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 80,
          passed: false,
          self_check: {
            review: {
              information_checks: [
                {
                  key: 'concept_overload',
                  label: '信息负载',
                  status: 'fail',
                  evidence: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走，读者还没看到动作就被设定淹没。',
                  fix: '压缩新概念到三个以内，把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
                },
              ],
              longform_checks: [
                {
                  key: 'recent_progress_stalled',
                  label: '长篇连续性',
                  status: 'warn',
                  evidence: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长，读者看不到阶段目标推进。',
                  fix: '补最近5章的阶段位移、爽点间隔和下一阶段目标，让本章承接前文并推动后续。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const informationAnnotation = annotations.find((item: any) => item.kind === 'information_load_gap')
    const longformAnnotation = annotations.find((item: any) => item.kind === 'longform_continuity_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(informationAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '信息负载',
      kind: 'information_load_gap',
      title: '信息负载缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(longformAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '长篇连续性',
      kind: 'longform_continuity_gap',
      title: '长篇连续性缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['information_load_gap', 'longform_continuity_gap'])
    expect(result.tasks[0].information_load_sync.missed[0].text).toContain('信息没有跟着冲突走')
    expect(result.tasks[0].acceptance_criteria).toContain('information_checks 复检通过，missed_count=0')
    expect(result.tasks[1].longform_continuity_sync.missed[0].text).toContain('最近5章')
    expect(result.tasks[1].acceptance_criteria).toContain('longform_checks 复检通过，missed_count=0')
  })

  test('turns core contract and continuity heat misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '广播室名单', chapter_text: '正文', ending_hook: '广播来源忽然改写。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 76,
        review_type: 'prose_quality',
        summary: '核心契约和连续性热度存在缺口',
        created_at: '2026-06-08T03:58:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 79,
          passed: false,
          self_check: {
            review: {
              core_contract_checks: [
                {
                  key: 'theme_unity_rules',
                  label: '核心契约',
                  status: 'fail',
                  evidence: '本章追逐支线宝物，主角没有服务规则反制的核心承诺，小情绪没有服从全书核心情绪，章尾也没有回到主线问题。',
                  fix: '把支线宝物改成规则判定证据，让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
                },
              ],
              continuity_heat_checks: [
                {
                  key: 'cold_recall_without_warmup',
                  label: '连续性热度',
                  status: 'warn',
                  evidence: '旧印作为 hot 元素本章只提名字没有推进，盟友关系 warm 元素断温，cold 伏笔突然回收前没有升温。',
                  fix: '让旧印触发新证据推进，补盟友站队或质疑保持关系热度，cold 回收前先给一处可见升温。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const coreContractAnnotation = annotations.find((item: any) => item.kind === 'core_contract_gap')
    const continuityHeatAnnotation = annotations.find((item: any) => item.kind === 'continuity_heat_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(coreContractAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '核心契约',
      kind: 'core_contract_gap',
      title: '核心契约缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(continuityHeatAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '连续性热度',
      kind: 'continuity_heat_gap',
      title: '连续性热度缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['core_contract_gap', 'continuity_heat_gap'])
    expect(result.tasks[0].core_contract_check_sync.missed[0].text).toContain('核心承诺')
    expect(result.tasks[0].acceptance_criteria).toContain('core_contract_checks 复检通过，missed_count=0')
    expect(result.tasks[1].continuity_heat_sync.missed[0].text).toContain('cold 伏笔突然回收前没有升温')
    expect(result.tasks[1].acceptance_criteria).toContain('continuity_heat_checks 复检通过，missed_count=0')
  })

  test('turns revision receipt and deslop repair misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '重修广播室', chapter_text: '正文', ending_hook: '广播声重新响起。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 77,
        review_type: 'prose_quality',
        summary: '修订回执和去AI味修复回执存在缺口',
        created_at: '2026-06-08T04:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 78,
          passed: false,
          self_check: {
            review: {
              revision_receipt_checks: [
                {
                  key: 'prose_revision_receipt_sync',
                  label: '修订回执未闭环',
                  status: 'fail',
                  evidence: 'delivery_risk_receipts 要求修正文首钩子，但 revision_receipts 没有给 changed_evidence。',
                  fix: '重新输出 revision_receipts，逐条写清 required_action、repair_segment、applied_fix 和 changed_evidence。',
                },
              ],
              deslop_repair_checks: [
                {
                  key: 'deslop_repair_receipt_sync',
                  label: '去AI味修复回执未闭环',
                  status: 'warn',
                  evidence: 'Gate E 模板化对白仍残留，但 deslop_repair_receipts 没有引用修订后正文证据。',
                  fix: '重修 Gate E 对话腔调，并在 deslop_repair_receipts.changed_evidence 中引用修订后对白。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const revisionReceiptAnnotation = annotations.find((item: any) => item.kind === 'revision_receipt_gap')
    const deslopRepairAnnotation = annotations.find((item: any) => item.kind === 'deslop_repair_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(revisionReceiptAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '修订回执',
      kind: 'revision_receipt_gap',
      title: '修订回执缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(deslopRepairAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '去AI味修复',
      kind: 'deslop_repair_gap',
      title: '去AI味修复缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['revision_receipt_gap', 'deslop_repair_gap'])
    expect(result.tasks[0].revision_receipt_check_sync.missed[0].text).toContain('changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('revision_receipt_checks 复检通过，missed_count=0')
    expect(result.tasks[1].deslop_repair_check_sync.missed[0].text).toContain('Gate E')
    expect(result.tasks[1].acceptance_criteria).toContain('deslop_repair_checks 复检通过，missed_count=0')
  })

  test('turns prose meta and serial risk repair misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '连更复检', chapter_text: '正文', ending_hook: '下一场危机压到门口。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 78,
        review_type: 'prose_quality',
        summary: '正文元叙事和连续风险修复存在缺口',
        created_at: '2026-06-08T04:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 77,
          passed: false,
          self_check: {
            review: {
              prose_meta_checks: [
                {
                  key: 'meta_narration_leak',
                  label: '正文元叙事',
                  status: 'fail',
                  evidence: '正文出现“这一章主要用来铺垫后续反转”这类作者说明，破坏读者沉浸。',
                  fix: '删除作者说明，把铺垫改成角色当场看到的证据、误判或行动后果。',
                },
              ],
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_unrepaired',
                  label: '连续风险修复',
                  status: 'warn',
                  evidence: '安全批量标记场景承接风险，但修订稿没有补 scene_serial_risk_repair_receipt。',
                  fix: '补齐连续生产风险修复回执，并把场景承接变化落到正文证据。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const proseMetaAnnotation = annotations.find((item: any) => item.kind === 'prose_meta_gap')
    const serialRiskAnnotation = annotations.find((item: any) => item.kind === 'serial_risk_repair_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(proseMetaAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文元叙事',
      kind: 'prose_meta_gap',
      title: '正文元叙事缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(serialRiskAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '连续风险修复',
      kind: 'serial_risk_repair_gap',
      title: '连续风险修复缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['prose_meta_gap', 'serial_risk_repair_gap'])
    expect(result.tasks[0].prose_meta_sync.missed[0].text).toContain('作者说明')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_meta_checks 复检通过，missed_count=0')
    expect(result.tasks[1].serial_risk_repair_sync.missed[0].text).toContain('场景承接风险')
    expect(result.tasks[1].acceptance_criteria).toContain('serial_risk_repair_checks 复检通过，missed_count=0')
  })

  test('turns chapter hook quality misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '连更复检', chapter_text: '正文', ending_hook: '下一场危机压到门口。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 79,
        review_type: 'prose_quality',
        summary: '章钩质量存在缺口',
        created_at: '2026-06-08T04:20:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 77,
          passed: false,
          self_check: {
            review: {
              chapter_hook_quality_checks: [
                {
                  key: 'ending_hook_weak_pull',
                  label: '章钩质量',
                  status: 'warn',
                  evidence: '章尾只写“新的麻烦来了”，没有具体问题、危险、选择或下一章行动压力。',
                  fix: '把章尾改成可追读的具体未解问题，并和下一章行动直接相连。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const hookQualityAnnotation = annotations.find((item: any) => item.kind === 'chapter_hook_quality_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(hookQualityAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章钩质量',
      kind: 'chapter_hook_quality_gap',
      title: '章钩质量缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['chapter_hook_quality_gap'])
    expect(result.tasks[0].chapter_hook_quality_sync.missed[0].text).toContain('章尾只写')
    expect(result.tasks[0].acceptance_criteria).toContain('chapter_hook_quality_checks 复检通过，missed_count=0')
  })

  test('turns generic quality audit annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 43,
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
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('purpose_tag_density_gap')
    expect(result.tasks[0].annotation_category).toBe('quality_audit')
    expect(result.tasks[0].message).toContain('爽点场景只用一句摘要带过')
    expect(result.tasks[0].action).toContain('目的词')
    expect(result.tasks[0].action).toContain('五维评分')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_checks 里的 fail/warn 项已清零')
    expect(result.tasks[0].payload.checks[0].fix).toContain('爽点/打脸展开')
  })

  test('turns quality audit repair receipt annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 44,
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
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('quality_audit_repair_receipt')
    expect(result.tasks[0].annotation_category).toBe('quality_audit_repair_receipt')
    expect(result.tasks[0].source_label).toBe('质量回执')
    expect(result.tasks[0].message).toContain('changed_evidence 为空')
    expect(result.tasks[0].action).toContain('quality_audit_repair_receipts.changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_repair_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_repair_receipts.changed_evidence 能在修订后正文定位')
    expect(result.tasks[0].payload.missed[0].text).toContain('changed_evidence 为空')
  })

  test('turns deslop repair receipt annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 45,
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
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('deslop_repair_receipt')
    expect(result.tasks[0].annotation_category).toBe('deslop_repair_receipt')
    expect(result.tasks[0].source_label).toBe('去AI味回执')
    expect(result.tasks[0].message).toContain('连续主语问题')
    expect(result.tasks[0].action).toContain('deslop_repair_receipts.changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('deslop_repair_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('deslop_repair_receipts.changed_evidence 能在修订后正文定位')
    expect(result.tasks[0].payload.missed[0].text).toContain('连续主语问题')
  })

  test('turns revision cascade and scope guard annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 46,
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
        id: 47,
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
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks.map((task: any) => task.issue_type)).toEqual([
      'revision_cascade_impact',
      'revision_scope_guard',
    ])
    expect(result.tasks[0].acceptance_criteria).toContain('revision_cascade_impact_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('后续章节已同步修订后的伏笔、时间线、角色状态、资产归属或关系边界')
    expect(result.tasks[1].acceptance_criteria).toContain('revision_scope_guard_sync 复检通过，missed_count=0')
    expect(result.tasks[1].acceptance_criteria).toContain('修订前后字数差异回到 max(原文 30%, 800 字) 警戒线内')
  })

  test('turns prose revision receipt sync misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 48,
        review_type: 'prose_revision_receipt_sync',
        summary: '修订回执残留',
        created_at: '2026-06-08T03:15:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
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
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('prose_revision_receipt_sync')
    expect(result.tasks[0].annotation_category).toBe('prose_revision_receipt')
    expect(result.tasks[0].source_label).toBe('修订回执')
    expect(result.tasks[0].message).toContain('最后300字没有形成追读钩子')
    expect(result.tasks[0].action).toContain('delivery_risk_receipts 对应的 revision_receipts')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_revision_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('revision_receipts 逐条对应 delivery_risk_receipts 的失败项')
    expect(result.tasks[0].payload.missed[0].repair_segment).toBe('ending_actions')
  })

  test('turns single-chapter governance recheck misses into recovery evidence repair tasks', () => {
    const chapter = { id: 42, chapter_no: 42, title: '旧证重审', chapter_text: '正文', ending_hook: '旧账本出现第二个签名。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 31,
        review_type: 'governance_recheck_sync',
        created_at: '2026-06-13T08:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 42,
          chapter_no: 42,
          governance_recheck_sync: {
            status: 'warn',
            label: '恢复依据缺口 2',
            missed_count: 2,
            failed_evidence: ['第42章对白交锋已补回样章节奏'],
            watch_items: ['下一章继续观察样章策略命中率'],
            summary: '单章交稿未继承治理复查记忆。',
          },
        }),
      },
    ]).annotations

    const recoveryAnnotation = annotations.find((item: any) => item.kind === 'recovery_evidence_mismatch')
    const result = buildReviewAnnotationRepairTasks(annotations, [])

    expect(recoveryAnnotation?.category).toBe('recovery_evidence')
    expect(recoveryAnnotation?.title).toBe('恢复依据缺口 2')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toEqual(expect.objectContaining({
      issue_type: 'recovery_evidence_mismatch',
      annotation_category: 'recovery_evidence',
      chapter_id: 42,
      chapter_no: 42,
    }))
    expect(result.tasks[0].message).toContain('第42章对白交锋已补回样章节奏')
    expect(result.tasks[0].action).toContain('治理复查记忆')
    expect(result.tasks[0].recovery_evidence_review.failed_evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(result.tasks[0].recovery_evidence_review.watch_items).toContain('下一章继续观察样章策略命中率')
  })
})

describe('story state sync route source guards', () => {
  test('exposes chapter story-state sync for repair task recheck convergence', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const source = [
      editorBuildersSource(),
      readFileSync(join(import.meta.dir, 'novel-editor/register.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('/api/novel/chapters/:chapterId/story-state-sync')
    expect(source).toContain('buildDeliveryRiskConvergenceReport')
    expect(source).toContain("run_type: 'story_state'")
    expect(source).toContain('delivery_risk_convergence')
  })
})
