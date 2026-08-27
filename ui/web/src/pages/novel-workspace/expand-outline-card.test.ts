import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(name: string) {
  return readFileSync(join(import.meta.dir, name), 'utf8')
}

describe('expand outline planning card source', () => {
  test('planning card is expand_outline and not future100_generate', () => {
    const card = source('expand-outline-card.tsx')
    expect(card).toContain('扩纲')
    expect(card).toContain('EXPAND_OUTLINE_NEED_LEDGER')
    expect(card).toContain('getArtifactContent')
    expect(card).toContain('采纳')
    expect(card).toContain('丢弃')
    expect(card).toContain('上面的「大纲扩写流程」')
    expect(card).not.toContain('下面的「大纲扩写流程」')
    expect(card).not.toContain('future100_generate')
    expect(card).not.toContain('putVerbDefaults')
  })

  test('old expand flow card still calls future100_generate not kernel jobs', () => {
    const flow = source('planning/story-planning-board-panels-expand.tsx')
    expect(flow).toContain('大纲扩写流程')
    expect(flow).toContain("actionKey: 'future100_generate'")
    expect(flow).not.toContain("verb: 'expand_outline'")
    expect(flow).not.toContain('/kernel/jobs')
  })

  test('future100 generate path stays on the old novel API', () => {
    const tools = source('shell/workspace-commercial-tools.tsx')
    const start = tools.indexOf('const generateFuture100Skeleton')
    const fn = tools.slice(start, tools.indexOf('const applyFuture100SkeletonDraft'))
    expect(fn).toContain('/future-100-skeleton/generate')
    expect(fn).not.toContain('/kernel/jobs')
    expect(fn).not.toContain('expand_outline')
  })

  test('board hosts ExpandOutlineCard next to the old flow without replacing it', () => {
    const panels = source('planning/story-planning-board-panels.tsx')
    expect(panels).toContain('StoryPlanningExpandFlowCard')
    expect(panels).toContain('ExpandOutlineCard')
    expect(panels.indexOf('StoryPlanningExpandFlowCard')).toBeLessThan(panels.indexOf('ExpandOutlineCard'))
  })

  test('writing 更多 jumps to planning and does not host expand preview', () => {
    const presenter = source('chapter-workflow-presenter.ts')
    const actionBar = source('workspace-center-chapter-action-bar.tsx')
    const center = source('WorkspaceCenter.tsx')
    const base = source('shell/use-novel-workspace-base-model.tsx')
    const types = readFileSync(join(import.meta.dir, '../../kernel/jobs/types.ts'), 'utf8')
    expect(presenter).toContain("'expand_outline'")
    expect(actionBar).toContain('onExpandOutline')
    expect(actionBar).toContain("case 'expand_outline'")
    expect(center).toContain("key === 'expand_outline'")
    expect(center).not.toContain('getArtifactContent')
    expect(base).toContain('openExpandOutlineFromWriting')
    expect(base).toContain("setWorkspaceArea('storyPlanning')")
    expect(types).toMatch(/export type KernelJobAction = 'review' \| 'deslop' \| 'apply'/)
    expect(types).not.toContain("expand_outline")
  })
})
