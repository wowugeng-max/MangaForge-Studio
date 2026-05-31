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
})
