import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('novel generate prose route source guards', () => {
  test('declares word target before the generate-prose scene-card branch can refresh it', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    const declarationIndex = setupBlock.indexOf('let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})')
    const contextIndex = setupBlock.indexOf('let contextPackage = applyChapterWordTargetToContext(')
    const refreshIndex = setupBlock.indexOf('wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})', contextIndex + 1)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(declarationIndex).toBeGreaterThanOrEqual(0)
    expect(contextIndex).toBeGreaterThan(declarationIndex)
    expect(refreshIndex).toBeGreaterThan(contextIndex)
  })

  test('applies word target context in the standalone scene-cards route', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/scene-cards'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(routeBlock).toContain('const wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})')
    expect(routeBlock).toContain('const contextPackage = applyChapterWordTargetToContext(')
    expect(routeBlock).toContain('wordTarget,')
  })

  test('enforces chapter word target before self-review and storage', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const reviewStart = source.indexOf("markStage('review'", routeStart)
    const storeStart = source.indexOf("markStage('store'", routeStart)
    const beforeReviewBlock = source.slice(routeStart, reviewStart)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(reviewStart).toBeGreaterThan(routeStart)
    expect(storeStart).toBeGreaterThan(reviewStart)
    expect(beforeReviewBlock).toContain('ctx.ensureProseMeetsWordTarget(')
  })

  test('applies longform compass override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestLongformCompass(')
    expect(source).toContain('req.body?.longform_compass')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_compass: req.body.longform_compass }')
  })

  test('applies longform battle context override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestLongformBattleContext(')
    expect(source).toContain('req.body?.longform_battle_context')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, longform_battle_context: req.body.longform_battle_context }')
  })

  test('applies next batch brief override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestNextBatchBrief(')
    expect(source).toContain('req.body?.next_batch_brief')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, next_batch_brief: req.body.next_batch_brief }')
  })

  test('applies chapter launch gate override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestChapterLaunchGate(')
    expect(source).toContain('req.body?.chapter_launch_gate')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, chapter_launch_gate: req.body.chapter_launch_gate }')
  })

  test('applies safe batch preflight override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestBatchPreflight(')
    expect(source).toContain('req.body?.batch_preflight')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, batch_preflight: req.body.batch_preflight }')
  })

  test('applies million word runway override from generate-prose requests', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const routeEnd = source.indexOf("const prevChapters = chapters", routeStart)
    const setupBlock = source.slice(routeStart, routeEnd)

    expect(setupBlock).toContain('applyRequestMillionWordRunway(')
    expect(source).toContain('req.body?.million_word_runway')
    expect(source).toContain('chapter_target: { ...contextPackage.chapter_target, million_word_runway: req.body.million_word_runway }')
  })

  test('runs commercial editor rewrite after word-target expansion and before self-review', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const firstWordTarget = source.indexOf('const wordTargetCheck = await ctx.ensureProseMeetsWordTarget', routeStart)
    const editorStart = source.indexOf('ctx.runCommercialEditorRewrite(', routeStart)
    const reviewStart = source.indexOf("markStage('review'", routeStart)
    const contextTypeStart = source.indexOf('type GenerationRoutesContext =')
    const contextTypeEnd = source.indexOf('function buildTextDiffSummary', contextTypeStart)
    const contextTypeBlock = source.slice(contextTypeStart, contextTypeEnd)

    expect(routeStart).toBeGreaterThanOrEqual(0)
    expect(firstWordTarget).toBeGreaterThan(routeStart)
    expect(editorStart).toBeGreaterThan(firstWordTarget)
    expect(editorStart).toBeLessThan(reviewStart)
    expect(contextTypeBlock).toContain('runCommercialEditorRewrite:')
  })

  test('stores runtime diagnostics when the prose draft model returns no chapter text', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const failureStart = source.indexOf("String((result as any).error || (result as any).fallbackReason || '模型未返回正文')")
    const nextStage = source.indexOf("let selfCheck", failureStart)
    const failureBlock = source.slice(failureStart, nextStage)

    expect(failureStart).toBeGreaterThanOrEqual(0)
    expect(failureBlock).toContain('result_error')
    expect(failureBlock).toContain('runtime_selection')
    expect(failureBlock).toContain('llm_diagnostics')
  })

  test('uses plain prose fallback before failing an otherwise non-json draft response', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'")
    const draftStart = source.indexOf('const resultPayload = getNovelPayload(result)', routeStart)
    const failureStart = source.indexOf("if ((result as any).error || !chapterText)", draftStart)
    const draftBlock = source.slice(draftStart, failureStart)

    expect(draftBlock).toContain('extractPlainProseFallback(result, 800)')
    expect(draftBlock).toContain('|| plainProseFallback')
  })

  test('stores LLM diagnostics when standalone scene-card generation returns no cards', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-generation-routes.ts'), 'utf8')
    const routeStart = source.indexOf("app.post('/api/novel/chapters/:chapterId/scene-cards'")
    const routeEnd = source.indexOf("app.post('/api/novel/chapters/:chapterId/generate-prose'", routeStart)
    const routeBlock = source.slice(routeStart, routeEnd)

    expect(routeBlock).toContain('buildLLMResultDiagnostics(result.result)')
    expect(routeBlock).toContain("run_type: 'scene_cards'")
    expect(routeBlock).toContain("status: 'failed'")
  })
})
