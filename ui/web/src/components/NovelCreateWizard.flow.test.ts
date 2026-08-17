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
  test('deep draft incubation creates an empty project then an open_book kernel job', async () => {
    const monofile = readFileSync(join(import.meta.dir, 'NovelCreateWizard.tsx'), 'utf8')
    const controller = readFileSync(join(import.meta.dir, 'novel-entry/create/useCreateWizardController.ts'), 'utf8')
    const source = [monofile, controller, packageJoin('novel-entry')].join('\n')

    expect(controller).toContain("verb: 'open_book'")
    expect(controller).toContain('/api/kernel/jobs')
    expect(controller).toContain('startDeepDraftIncubation')
    expect(controller).toContain('adoptIncubation')
    expect(controller).toContain('discardIncubation')
    expect(controller).not.toContain('createSeedPipelineActions')
    expect(controller).not.toContain('deriveProjectSeed')
    expect(monofile).not.toContain('quick_ai')
    expect(monofile).toContain('采纳')
    expect(monofile).toContain('丢弃')
    expect(source).toContain('project?.id')
    expect(monofile).toContain('useCreateWizardController')
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
    expect(source).toContain('buildCreatePayloadFromUtils')
  })
})
