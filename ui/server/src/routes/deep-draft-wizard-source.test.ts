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

  test('aborts in-flight start after cancel and when the mounted wizard closes', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    const start = controller.slice(
      controller.indexOf('const startDeepDraftIncubation'),
      controller.indexOf('const loadArtifactPreview'),
    )
    expect(controller).toContain('if (!open) clearPoll()')
    expect(start.indexOf('const generation = pollGenerationRef.current')).toBeGreaterThan(start.indexOf('clearPoll()'))
    expect(start).toContain('generation !== pollGenerationRef.current')
    expect(start).toContain('!openRef.current')
    expect(start.split('await fetchJson').length - 1).toBeGreaterThanOrEqual(2)
    const afterFirstAwait = start.slice(start.indexOf('await fetchJson'))
    expect(afterFirstAwait).toContain('generation !== pollGenerationRef.current')
    expect(afterFirstAwait).toContain('!openRef.current')
  })

  test('does not start a second incubation from awaiting_selection or double-click', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    const wizard = read('NovelCreateWizard.tsx')
    const start = controller.slice(
      controller.indexOf('const startDeepDraftIncubation'),
      controller.indexOf('const loadArtifactPreview'),
    )
    const busyStart = controller.indexOf('const incubationBusy')
    const busy = controller.slice(busyStart, controller.indexOf('return {', busyStart))
    expect(start).toContain("phase === 'awaiting_selection'")
    expect(start.indexOf("incubationRef.current = { phase: 'creating' }")).toBeGreaterThan(-1)
    expect(start.indexOf("incubationRef.current = { phase: 'creating' }")).toBeLessThan(start.indexOf('await fetchJson'))
    expect(busy).toContain('awaiting_selection')
    expect(busy).toContain('adopting')
    expect(wizard).toContain('loading={incubationBusy}')
    expect(wizard).toContain('disabled={primaryDisabled || incubationBusy}')
  })

  test('poll stops on fetch errors and committed status; failed cancel is not success', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    const poll = controller.slice(
      controller.indexOf('const pollIncubation'),
      controller.indexOf('const startDeepDraftIncubation'),
    )
    const discard = controller.slice(
      controller.indexOf('const discardIncubation'),
      controller.indexOf('const handleNext'),
    )
    expect(poll).toContain('ok === false')
    expect(poll).toContain('!detail?.job')
    expect(poll).toContain("status === 'committed'")
    expect(discard).toContain('ok === false')
  })

  test('does not skip models solely by numeric database id 302', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    expect(controller).not.toContain('Number(model?.id) === 302')
    expect(controller).toContain('302.ai')
    expect(controller).toContain('kernel-codex-gpt-5.6-luna')
  })

  test('footer cancel and modal close cancel a running job then reset', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    const wizard = read('NovelCreateWizard.tsx')
    const discard = controller.slice(
      controller.indexOf('const discardIncubation'),
      controller.indexOf('const handleNext'),
    )
    const modalCancel = controller.slice(
      controller.indexOf('const handleModalCancel'),
      controller.indexOf('const steps'),
    )
    expect(discard).toContain('/cancel')
    expect(modalCancel).toContain('discardIncubation')
    expect(modalCancel).toContain('handleReset')
    expect(modalCancel).toContain('onCancel')
    expect(wizard).toContain('onCancel={handleModalCancel}')
    expect(wizard).toContain('onClick={handleModalCancel}')
  })

  test('discard is visible while incubation is creating or running', () => {
    const wizard = read('NovelCreateWizard.tsx')
    const creatingBlock = wizard.slice(
      wizard.indexOf("incubation.phase === 'creating'"),
      wizard.indexOf("incubation.phase === 'running'"),
    )
    const runningBlock = wizard.slice(
      wizard.indexOf("incubation.phase === 'running'"),
      wizard.indexOf("incubation.phase === 'failed'"),
    )
    expect(creatingBlock).toContain('丢弃')
    expect(runningBlock).toContain('丢弃')
  })

  test('retries a failed incubation on the same empty project', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    const start = controller.slice(
      controller.indexOf('const startDeepDraftIncubation'),
      controller.indexOf('const loadArtifactPreview'),
    )
    const discard = controller.slice(
      controller.indexOf('const discardIncubation'),
      controller.indexOf('const handleNext'),
    )
    const reset = controller.slice(
      controller.indexOf('const handleReset'),
      controller.indexOf('const handleModalCancel'),
    )
    expect(start).not.toContain('incubationProjectIdRef.current = null')
    expect(start).toContain('Number(incubationProjectIdRef.current)')
    expect(start.indexOf('Number(incubationProjectIdRef.current)')).toBeLessThan(start.indexOf('/api/novel/projects'))
    expect(start).toContain('/api/novel/projects')
    expect(discard).not.toContain('incubationProjectIdRef.current = null')
    expect(reset).toContain('incubationProjectIdRef.current = null')
  })
})
