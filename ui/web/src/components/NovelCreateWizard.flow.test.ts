import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

function packageJoin(dir: string) {
  const root = join(import.meta.dir, dir)
  const files: string[] = []
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.test.ts')) {
        files.push(full)
      }
    }
  }
  walk(root)
  files.sort()
  return files.map(file => readFileSync(file, 'utf8')).join('\n')
}

describe('NovelCreateWizard deep draft flow', () => {
  test('creates a novel project after deep draft finalization succeeds', async () => {
    const monofile = readFileSync(join(import.meta.dir, 'NovelCreateWizard.tsx'), 'utf8')
    const source = [monofile, packageJoin('novel-entry')].join('\n')
    const finalizeStart = monofile.indexOf('const finalizeProjectSeed = async')
    const renderStart = monofile.indexOf('return (', finalizeStart)
    const finalizeBlock = monofile.slice(finalizeStart, renderStart)

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
    // Package-join covers create leaves; monofile retains finalize path.
    expect(source).toContain('normalizeProjectSeedForUi')
  })

  test('carries the female audience confirmation mode into project reference config', async () => {
    const monofile = readFileSync(join(import.meta.dir, 'NovelCreateWizard.tsx'), 'utf8')
    const source = [monofile, packageJoin('novel-entry')].join('\n')
    const payloadStart = source.indexOf('export function buildCreatePayload')
    const payloadEnd = source.indexOf('export function buildFinalizedSeedCreatePayload', payloadStart)
    const payloadBlock = source.slice(payloadStart, payloadEnd)

    expect(source).toContain('female_audience_mode')
    expect(source).toContain('女频长篇口径')
    expect(source).toContain('自动识别')
    expect(source).toContain('强制启用')
    expect(source).toContain('强制关闭')
    expect(payloadBlock).toContain('oh_story_controls')
    expect(payloadBlock).toContain('female_audience_mode')
    expect(monofile).toContain('buildCreatePayloadFromUtils')
  })
})
