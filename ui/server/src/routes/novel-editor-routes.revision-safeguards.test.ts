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
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
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
    expect(prompt).toContain('人工强制修订指令')
    expect(prompt).toContain('只改章末名单揭示。')
    expect(prompt).toContain('报告必修项')
    expect(prompt).toContain('修订后要同步下一章名单伏笔')
    expect(prompt).toContain('语言硬约束')
  })

  test('prioritizes custom revision directives without dropping report must_fix', () => {
    const prompt = buildEditorRevisionPrompt({
      project: { title: '超人的规则怪谈世界' },
      chapter: { chapter_text: '老陈看着江哲，只用纯肉身力量 and 太极暗劲就一拳轰碎了邪神意志投影。' },
      report: {
        must_fix: ['补足章末钩子'],
        one_click_revision_prompt: '补足章末钩子',
      },
      revisionMode: 'from_report',
      userPrompt: '删除正文中所有英文夹杂，统一改成自然中文。',
    })

    expect(prompt).toContain('【人工强制修订指令（最高优先级，必须先兑现）】')
    expect(prompt).toContain('删除正文中所有英文夹杂，统一改成自然中文。')
    expect(prompt).toContain('【报告必修项（仍须覆盖，不得因人工指令被整体忽略）】')
    expect(prompt).toContain('补足章末钩子')
    expect(prompt).toContain('语言硬约束')
    expect(prompt.indexOf('人工强制修订指令')).toBeLessThan(prompt.indexOf('报告必修项'))
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
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
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
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
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
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
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
      readFileSync(join(import.meta.dir, 'novel-editor/register-annotations.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-revision.ts'), 'utf8'),
      readFileSync(join(import.meta.dir, 'novel-editor/register-quality.ts'), 'utf8'),
    ].join('\n')

    expect(source).toContain('initial_patch_not_applicable')
    expect(source).toContain('shouldRetryRevisionPatch')
  })
})

