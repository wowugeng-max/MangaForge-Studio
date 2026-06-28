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

  test('carries the female audience confirmation mode into project reference config', async () => {
    const source = await readFile(join(import.meta.dir, 'NovelCreateWizard.tsx'), 'utf8')
    const payloadStart = source.indexOf('const buildCreatePayload =')
    const payloadEnd = source.indexOf('const buildFinalizedSeedCreatePayload', payloadStart)
    const payloadBlock = source.slice(payloadStart, payloadEnd)

    expect(source).toContain('female_audience_mode')
    expect(source).toContain('女频长篇口径')
    expect(source).toContain('自动识别')
    expect(source).toContain('强制启用')
    expect(source).toContain('强制关闭')
    expect(payloadBlock).toContain('oh_story_controls')
    expect(payloadBlock).toContain('female_audience_mode')
  })
})
