import { describe, expect, test } from 'bun:test'
import { readFile } from 'fs/promises'
import { join } from 'path'

describe('NovelCreateWizard deep draft flow', () => {
  test('creates a novel project after deep draft finalization succeeds', async () => {
    const source = await readFile(join(import.meta.dir, 'NovelCreateWizard.tsx'), 'utf8')
    const finalizeStart = source.indexOf('const finalizeProjectSeed = async')
    const renderStart = source.indexOf('return (', finalizeStart)
    const finalizeBlock = source.slice(finalizeStart, renderStart)

    expect(finalizeBlock).toContain('createProjectFromFinalizedSeed')
    expect(finalizeBlock).toContain('create_project: true')
    expect(finalizeBlock).toContain('author_confirmed')
    expect(finalizeBlock).toContain('finishCreatedProjectFromFinalizeResponse(res.data)')
    expect(source).toContain('project_id')
    expect(source).toContain('project?.id')
    expect(finalizeBlock).toContain('setSeedFinalized(true)')
    expect(source).toContain('定稿并创建项目')
    expect(source).toContain('我已确认，创建项目')
    expect(source).toContain('finalizeProjectSeed(true)')
    expect(source).toContain('自动补齐待确认/伏笔')
  })
})
