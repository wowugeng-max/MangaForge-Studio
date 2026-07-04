import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as bibleRoutes from './novel-project-bible-routes'

const {
  buildStyleSampleCandidatesFromChapters,
  buildStyleSampleEffectivenessReport,
  normalizeGeneratedWritingBible,
} = bibleRoutes

describe('writing bible style sample candidates', () => {
  test('normalizes generated writing bible into creation contract fields', () => {
    const writingBible = normalizeGeneratedWritingBible(
      {
        title: '剑烛大荒',
        genre: '仙侠',
        synopsis: '少年用符火审案破局。',
        target_audience: '男频',
        length_target: 'epic',
        style_tags: [],
        reference_config: {},
      },
      {
        promise: '每章都有符火破局爽点。',
        mainline: {
          protagonist_drive: '主角必须夺回被夺走的火种。',
          core_conflict: '旧规与新火的冲突。',
          longform_capacity: '九卷大荒门派和火种谜团支撑百万字推进。',
        },
        volume_plan: [{ goal: '进入大荒门并建立第一阶段规则优势。' }],
        commercial_positioning: {
          selling_points: ['符火审案'],
          retention_strategy: '前三十章完成入门、立敌、第一次公开破局。',
        },
      },
      {},
    )

    expect(writingBible.reader_promise).toContain('符火破局')
    expect(writingBible.protagonist_drive).toContain('火种')
    expect(writingBible.core_conflict).toContain('旧规')
    expect(writingBible.current_volume_goal).toContain('大荒门')
    expect(writingBible.innovation_hook).toContain('符火审案')
    expect(writingBible.first30_plan).toContain('前三十章')
    expect(writingBible.longform_capacity).toContain('百万字')
  })

  test('extracts abstract style sample candidates from high-score chapters without source prose', () => {
    const chapters = [
      {
        id: 1,
        chapter_no: 8,
        title: '雨夜反打',
        chapter_goal: '主角在雨夜反制王府暗卫。',
        chapter_summary: '先压迫，再用规则和道具反打。',
        conflict: '王府暗卫围堵，主角必须保住线索。',
        ending_hook: '黑伞下露出第二枚令牌。',
        chapter_text: '雨声压下来。“你们来晚了。”主角抬伞，黑伞一合，照妖镜的光断在巷口。暗卫脸色骤变。令牌落地，第二道纹路亮起。',
      },
      {
        id: 2,
        chapter_no: 9,
        title: '过场解释',
        chapter_goal: '解释背景。',
        chapter_text: '背景介绍。'.repeat(40),
      },
    ]
    const reviews = [
      { chapter_id: 1, review_type: 'prose_quality', created_at: '2026-06-01T00:00:00.000Z', payload: JSON.stringify({ self_check: { review: { score: 91 } } }) },
      { chapter_id: 2, review_type: 'prose_quality', created_at: '2026-06-01T00:00:00.000Z', payload: JSON.stringify({ self_check: { review: { score: 72 } } }) },
    ]

    const candidates = buildStyleSampleCandidatesFromChapters(chapters, reviews, { min_score: 86 })

    expect(candidates).toHaveLength(1)
    expect(candidates[0].sample_key).toContain('高分章8')
    expect(candidates[0].scene_function).toContain('雨夜')
    expect(candidates[0].abstract_usage).toContain('只学习')
    expect(candidates[0].unsafe_direct_phrases).toContain('原句不能照搬')
    expect(candidates[0].applicable_scenes).toEqual(expect.arrayContaining(['高压反打', '章末追读钩子']))
    expect(candidates[0].avoid_scenes).toEqual(expect.arrayContaining(['纯背景说明', '低压日常过场']))
    expect(candidates[0].source_chapter_no).toBe(8)
    expect(candidates[0].source_chapter_id).toBe(1)
    expect(candidates[0].source_quality_score).toBe(91)
    expect(candidates[0].sample_text).toBeUndefined()
    expect(candidates[0].source_excerpt).toBeUndefined()
  })

  test('exposes a writing bible style sample candidate endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/writing-bible/style-sample-candidates'")
    expect(source).toContain('buildStyleSampleCandidatesFromChapters(')
    expect(source).toContain("step_name: 'style_sample_candidates'")
  })

  test('exposes a writing bible style sample effectiveness endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.get('/api/novel/projects/:id/writing-bible/style-sample-effectiveness'")
    expect(source).toContain('buildStyleSampleEffectivenessReport(')
    expect(source).toContain('style_sample_effectiveness')
  })

  test('aggregates style sample effectiveness from chapter briefs and style sync reviews', () => {
    const styleSampleBank = [
      {
        sample_key: '规则危机反打',
        applicable_scenes: ['高压反打', '规则压迫'],
        avoid_scenes: ['纯背景说明'],
      },
      {
        sample_key: '对白信息差',
        applicable_scenes: ['对白交锋'],
        avoid_scenes: ['纯动作无信息差'],
      },
    ]
    const chapters = [
      {
        id: 101,
        chapter_no: 12,
        title: '规则压迫',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '规则危机反打' }],
            },
          },
        },
      },
      {
        id: 102,
        chapter_no: 13,
        title: '暗室试探',
        raw_payload: {
          pre_draft_brief: {
            style_sample_strategy: {
              samples: [{ sample_key: '规则危机反打' }, { sample_key: '对白信息差' }],
            },
          },
        },
      },
    ]
    const reviews = [
      {
        chapter_id: 101,
        review_type: 'prose_quality',
        created_at: '2026-06-01T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 88 } } }),
      },
      {
        chapter_id: 102,
        review_type: 'prose_quality',
        created_at: '2026-06-02T00:00:00.000Z',
        payload: JSON.stringify({ self_check: { review: { score: 76 } } }),
      },
      {
        chapter_id: 101,
        review_type: 'style_sample_sync',
        created_at: '2026-06-01T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 92,
            planned: [{ sample_key: '规则危机反打', label: '叙述节奏' }],
            delivered: [{ sample_key: '规则危机反打', label: '叙述节奏' }],
            missed: [],
            copied_phrases: [],
          },
        }),
      },
      {
        chapter_id: 102,
        review_type: 'style_sample_sync',
        created_at: '2026-06-02T00:01:00.000Z',
        payload: JSON.stringify({
          style_sample_sync: {
            score: 63,
            planned: [
              { sample_key: '规则危机反打', label: '句式密度' },
              { sample_key: '对白信息差', label: '对白比例' },
            ],
            delivered: [{ sample_key: '对白信息差', label: '对白比例' }],
            missed: [{ sample_key: '规则危机反打', label: '句式密度' }],
            copied_phrases: ['原句不能照搬'],
          },
        }),
      },
    ]

    const report = buildStyleSampleEffectivenessReport(styleSampleBank, chapters, reviews)

    expect(report.total_samples).toBe(2)
    expect(report.used_sample_count).toBe(2)
    expect(report.risky_sample_count).toBe(1)
    expect(report.samples.map((item: any) => item.sample_key)).toEqual(['规则危机反打', '对白信息差'])
    expect(report.samples[0]).toMatchObject({
      sample_key: '规则危机反打',
      usage_count: 2,
      average_style_score: 78,
      average_quality_score: 82,
      planned_count: 2,
      delivered_count: 1,
      missed_count: 1,
      copy_risk_count: 1,
      hit_rate: 50,
      risk_label: '需复盘',
    })
    expect(report.samples[0].missed_labels).toEqual(['句式密度'])
    expect(report.samples[0].copied_phrases).toEqual(['原句不能照搬'])
    expect(report.samples[0].adjustment_suggestion).toMatchObject({
      action: 'tighten_copy_guard',
      label: '补禁抄短语',
    })
    expect(report.samples[0].adjustment_suggestion.detail).toContain('句式密度')
    expect(report.samples[0].adjustment_suggestion.detail).toContain('原句不能照搬')
    expect(report.samples[0].chapter_refs).toEqual([
      { chapter_id: 101, chapter_no: 12, title: '规则压迫' },
      { chapter_id: 102, chapter_no: 13, title: '暗室试探' },
    ])
    expect(report.samples[1]).toMatchObject({
      sample_key: '对白信息差',
      usage_count: 1,
      average_style_score: 63,
      average_quality_score: 76,
      planned_count: 1,
      delivered_count: 1,
      missed_count: 0,
      copy_risk_count: 0,
      hit_rate: 100,
      risk_label: '表现稳定',
    })
    expect(report.samples[1].adjustment_suggestion).toMatchObject({
      action: 'keep',
      label: '保留策略',
    })
  })

  test('builds a reviewable JSON patch for style sample adjustment suggestions', () => {
    const buildStyleSampleAdjustmentPatch = (bibleRoutes as any).buildStyleSampleAdjustmentPatch
    const applyStyleSampleAdjustmentPatch = (bibleRoutes as any).applyStyleSampleAdjustmentPatch

    expect(buildStyleSampleAdjustmentPatch).toBeFunction()
    expect(applyStyleSampleAdjustmentPatch).toBeFunction()

    const sample = {
      sample_key: '规则危机反打',
      abstract_usage: '只学习压迫反打节奏。',
      unsafe_direct_phrases: ['旧禁抄'],
      applicable_scenes: ['高压反打', '规则压迫', '危机压迫'],
      avoid_scenes: ['纯背景说明'],
    }
    const reportItem = {
      sample_key: '规则危机反打',
      risk_label: '需复盘',
      hit_rate: 50,
      missed_labels: ['句式密度'],
      copied_phrases: ['原句不能照搬'],
      adjustment_suggestion: { action: 'tighten_copy_guard', label: '补禁抄短语' },
    }

    const patch = buildStyleSampleAdjustmentPatch(sample, reportItem)

    expect(patch).toMatchObject({
      sample_key: '规则危机反打',
      action: 'tighten_copy_guard',
      label: '补禁抄短语',
      changed: true,
    })
    expect(patch.operations).toContainEqual({
      op: 'add_unique',
      path: '/unsafe_direct_phrases',
      value: '原句不能照搬',
    })
    expect(patch.updated_sample.unsafe_direct_phrases).toEqual(['旧禁抄', '原句不能照搬'])
    expect(patch.updated_sample.abstract_usage).toContain('句式密度')
    expect(patch.patch_json).toContain('"unsafe_direct_phrases"')

    const result = applyStyleSampleAdjustmentPatch([sample], reportItem)
    expect(result.changed).toBe(true)
    expect(result.style_sample_bank[0].unsafe_direct_phrases).toEqual(['旧禁抄', '原句不能照搬'])

    const appliedAgain = applyStyleSampleAdjustmentPatch(result.style_sample_bank, reportItem)
    expect(appliedAgain.style_sample_bank[0].unsafe_direct_phrases).toEqual(['旧禁抄', '原句不能照搬'])
  })

  test('builds a batch patch for all risky style samples only', () => {
    const applyStyleSampleAdjustmentBatch = (bibleRoutes as any).applyStyleSampleAdjustmentBatch

    expect(applyStyleSampleAdjustmentBatch).toBeFunction()

    const styleSampleBank = [
      { sample_key: '规则危机反打', abstract_usage: '只学反打节奏。', unsafe_direct_phrases: [] },
      { sample_key: '对白信息差', abstract_usage: '只学对白节奏。', unsafe_direct_phrases: [] },
      { sample_key: '稳定章末钩子', abstract_usage: '保留策略。', unsafe_direct_phrases: [] },
    ]
    const report = {
      samples: [
        {
          sample_key: '规则危机反打',
          risk_label: '需复盘',
          missed_labels: ['句式密度'],
          copied_phrases: ['原句不能照搬'],
          adjustment_suggestion: { action: 'tighten_copy_guard', label: '补禁抄短语' },
        },
        {
          sample_key: '对白信息差',
          risk_label: '需复盘',
          missed_labels: ['对白比例'],
          copied_phrases: [],
          adjustment_suggestion: { action: 'revise_strategy', label: '改策略描述' },
        },
        {
          sample_key: '稳定章末钩子',
          risk_label: '表现稳定',
          adjustment_suggestion: { action: 'keep', label: '保留策略' },
        },
      ],
    }

    const batch = applyStyleSampleAdjustmentBatch(styleSampleBank, report)

    expect(batch).toMatchObject({
      changed: true,
      total_patch_count: 2,
      changed_count: 2,
      skipped_count: 1,
    })
    expect(batch.patches.map((patch: any) => patch.sample_key)).toEqual(['规则危机反打', '对白信息差'])
    expect(batch.style_sample_bank[0].unsafe_direct_phrases).toEqual(['原句不能照搬'])
    expect(batch.style_sample_bank[1].narrative_rhythm).toContain('对白比例')
    expect(batch.style_sample_bank[2].abstract_usage).toBe('保留策略。')
    expect(batch.patch_json).toContain('"patches"')
  })

  test('records style sample patch history and restores the latest patch snapshot', () => {
    const buildStyleSamplePatchHistoryEntry = (bibleRoutes as any).buildStyleSamplePatchHistoryEntry
    const undoLatestStyleSamplePatchHistory = (bibleRoutes as any).undoLatestStyleSamplePatchHistory

    expect(buildStyleSamplePatchHistoryEntry).toBeFunction()
    expect(undoLatestStyleSamplePatchHistory).toBeFunction()

    const beforeBank = [{ sample_key: '规则危机反打', unsafe_direct_phrases: [] }]
    const afterBank = [{ sample_key: '规则危机反打', unsafe_direct_phrases: ['原句不能照搬'] }]
    const entry = buildStyleSamplePatchHistoryEntry(beforeBank, afterBank, {
      mode: 'batch',
      patches: [{ sample_key: '规则危机反打', changed: true }],
      changed_count: 1,
      applied_at: '2026-06-12T00:00:00.000Z',
    })

    expect(entry).toMatchObject({
      mode: 'batch',
      sample_keys: ['规则危机反打'],
      changed_count: 1,
      undone: false,
    })
    expect(entry.patch_id).toContain('style-sample-patch-')
    expect(entry.before_style_sample_bank).toEqual(beforeBank)
    expect(entry.after_style_sample_bank).toEqual(afterBank)

    const restored = undoLatestStyleSamplePatchHistory({
      promise: '核心承诺不变',
      style_sample_bank: afterBank,
      style_sample_patch_history: [entry],
    }, '2026-06-12T00:10:00.000Z')

    expect(restored.changed).toBe(true)
    expect(restored.writing_bible.promise).toBe('核心承诺不变')
    expect(restored.writing_bible.style_sample_bank).toEqual(beforeBank)
    expect(restored.writing_bible.style_sample_patch_history[0]).toMatchObject({
      patch_id: entry.patch_id,
      undone: true,
      undone_at: '2026-06-12T00:10:00.000Z',
    })
  })

  test('reviews patched style samples against the next task book selection', () => {
    const buildStyleSamplePatchPostApplyReview = (bibleRoutes as any).buildStyleSamplePatchPostApplyReview

    expect(buildStyleSamplePatchPostApplyReview).toBeFunction()

    const review = buildStyleSamplePatchPostApplyReview({
      samples: [
        {
          sample_key: '旧高压反打样章',
          usage_count: 5,
          hit_rate: 40,
          missed_count: 6,
          copy_risk_count: 1,
          risk_label: '需复盘',
        },
        {
          sample_key: '稳定规则反打样章',
          usage_count: 6,
          hit_rate: 100,
          missed_count: 0,
          copy_risk_count: 0,
          risk_label: '表现稳定',
        },
      ],
    }, {
      patched_sample_keys: ['旧高压反打样章'],
      next_style_sample_strategy: {
        samples: [{ sample_key: '稳定规则反打样章' }],
      },
    })

    expect(review).toMatchObject({
      status: 'watch',
      patched_sample_keys: ['旧高压反打样章'],
      still_risky_sample_keys: ['旧高压反打样章'],
      next_task_selected_sample_keys: ['稳定规则反打样章'],
      next_task_selects_repatched_risky_sample: false,
    })
    expect(review.next_actions.join('；')).toContain('下一章任务书未继续选择低命中样章')

    const unsafeReview = buildStyleSamplePatchPostApplyReview({
      samples: [
        {
          sample_key: '旧高压反打样章',
          usage_count: 5,
          hit_rate: 40,
          missed_count: 6,
          copy_risk_count: 1,
          risk_label: '需复盘',
        },
      ],
    }, {
      patched_sample_keys: ['旧高压反打样章'],
      next_style_sample_strategy: {
        samples: [{ sample_key: '旧高压反打样章' }],
      },
    })

    expect(unsafeReview).toMatchObject({
      status: 'warn',
      next_task_selects_repatched_risky_sample: true,
      recommended_repair_action: {
        action: 'replace',
        label: '换样章并重审任务书',
        requires_task_book_reconfirm: true,
      },
    })
    expect(unsafeReview.next_actions.join('；')).toContain('换一组')
  })

  test('exposes a confirmed style sample adjustment patch endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustment'")
    expect(source).toContain('dry_run')
    expect(source).toContain('style_sample_patch')
    expect(source).toContain("step_name: 'style_sample_adjustment'")
  })

  test('exposes a confirmed batch style sample adjustment endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments'")
    expect(source).toContain('style_sample_patch_batch')
    expect(source).toContain("step_name: 'style_sample_adjustment_batch'")
  })

  test('exposes a style sample adjustment undo endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments/undo'")
    expect(source).toContain('undoLatestStyleSamplePatchHistory')
    expect(source).toContain("step_name: 'style_sample_adjustment_undo'")
  })

  test('exposes a style sample patch post-apply review endpoint', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).toContain("app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments/post-apply-review'")
    expect(source).toContain('buildStyleSamplePatchPostApplyReview')
    expect(source).toContain("step_name: 'style_sample_adjustment_post_apply_review'")
    expect(source).toContain('style_sample_patch_review')
  })

  test('uses safe json when hashing generated writing bible output', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-project-bible-routes.ts'), 'utf8')

    expect(source).not.toContain('stableTextHash(JSON.stringify(writingBible))')
  })
})
