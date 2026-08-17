import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WEB = join(import.meta.dir, '../../..', 'web/src/components')
const read = (rel: string) => readFileSync(join(WEB, rel), 'utf8')

describe('deep-draft wizard source contract', () => {
  test('quick_ai is fully removed from the create wizard', () => {
    for (const rel of [
      'NovelCreateWizard.tsx',
      'novel-entry/create/createWizardOptions.ts',
      'novel-entry/create/createWizardCopy.ts',
      'novel-entry/create/CreateModeSection.tsx',
      'novel-entry/create/useCreateWizardController.ts',
    ]) expect(read(rel)).not.toContain('quick_ai')
  })
  test('deep_draft path does not call the seed pipeline', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    expect(controller).not.toContain('derive-stream')
    expect(controller).not.toContain('deriveProjectSeed')
    expect(controller).not.toContain('fill-gaps')
    expect(controller).not.toContain('project-seed/finalize')
  })
  test('deep_draft creates an open_book kernel job and polls it', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    expect(controller).toContain("verb: 'open_book'")
    expect(controller).toContain('/api/kernel/jobs')
  })
})
