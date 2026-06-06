import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('commercial writing workspace UI shell', () => {
  test('uses command-oriented controls in the central writing toolbar', () => {
    const component = source('WorkspaceCenter.tsx')
    const css = source('WorkspaceCenter.css')

    expect(component).toContain('novel-editor-stagebar')
    expect(component).toContain('novel-editor-command-pill')
    expect(component).toContain('novel-editor-icon-command')
    expect(component).toContain('novel-word-preset')
    expect(component).toContain('NOVEL_WRITING_DESK_COLLAPSED_KEY')
    expect(component).toContain('setWritingDeskCollapsed')
    expect(component).toContain('novel-editor-toolbar-collapsed')
    expect(component).toContain('novel-editor-collapsed-summary')
    expect(component).toContain('novel-editor-toolbar-meta')
    expect(component).toContain('novel-editor-toolbar-actions')
    expect(component).toContain('novel-editor-toolbar-recommendation')
    expect(css).toContain('.novel-editor-command-pill')
    expect(css).toContain('.novel-editor-stage')
    expect(css).toContain('.novel-editor-toolbar-meta')
    expect(css).toContain('.novel-editor-toolbar-actions')
    expect(css).toContain('.novel-editor-toolbar-recommendation')
    expect(css).toContain('grid-template-columns')
    expect(css).toContain('.novel-editor-toolbar-collapsed')
    expect(css).toContain('.novel-editor-toolbar-collapsed .novel-editor-recommendation-hint')
    expect(css).toContain('display: none')
    expect(css).toContain('.novel-editor-collapsed-actions')
    expect(css).toContain('flex-shrink: 0')
  })

  test('uses a production guide command system instead of stacked block buttons', () => {
    const component = source('ProductionGuidePanel.tsx')
    const css = source('ProductionGuidePanel.css')

    expect(component).toContain("import './ProductionGuidePanel.css'")
    expect(component).toContain('production-guide-primary-command')
    expect(component).toContain('production-guide-secondary-command')
    expect(component).toContain('production-guide-step-status')
    expect(component).not.toContain('block\\n                      type={step.status')
    expect(css).toContain('.production-guide-secondary-command')
    expect(css).toContain('.production-guide-step-active')
  })

  test('separates the writing cockpit from delivery and collapsed workspace bars', () => {
    const component = source('WritingCockpitPanel.tsx')
    const css = source('WritingCockpitPanel.css')

    expect(component).toContain("import './WritingCockpitPanel.css'")
    expect(component).toContain('writing-cockpit-card-expanded')
    expect(component).toContain('writing-cockpit-card-collapsed')
    expect(component).toContain('writing-cockpit-subdesk')
    expect(component).toContain('writing-cockpit-command-grid')
    expect(css).toContain('.writing-cockpit-card-expanded')
    expect(css).toContain('.writing-cockpit-subdesk')
    expect(css).toContain('.writing-cockpit-card-collapsed')
  })

  test('uses a reference nav rail with compact revision chips', () => {
    const component = source('ReferencePanel.tsx')
    const css = source('ReferencePanel.css')

    expect(component).toContain("import './ReferencePanel.css'")
    expect(component).toContain('novel-reference-nav-rail')
    expect(component).toContain('novel-reference-nav-item')
    expect(component).toContain('novel-reference-revision-chip')
    expect(css).toContain('.novel-reference-nav-item')
    expect(css).toContain('.novel-reference-revision-chip')
  })

  test('shows storyline workshop types and draft brief storyline section', () => {
    const settingPanel = source('SettingWorkshopPanel.tsx')
    const workspaceCenter = source('WorkspaceCenter.tsx')
    const workspaceCss = source('WorkspaceCenter.css')

    expect(settingPanel).toContain("value: 'mainline'")
    expect(settingPanel).toContain("label: '主线'")
    expect(settingPanel).toContain("value: 'subplot'")
    expect(settingPanel).toContain("value: 'character_arc'")
    expect(settingPanel).toContain("value: 'relationship_arc'")
    expect(settingPanel).toContain("value: 'faction_arc'")
    expect(settingPanel).toContain("value: 'foreshadowing_arc'")
    expect(settingPanel).toContain("value: 'advance'")
    expect(settingPanel).toContain("value: 'payoff'")
    expect(settingPanel).toContain('/storylines/suggest')
    expect(settingPanel).toContain('匹配剧情线')
    expect(workspaceCenter).toContain('剧情线推进')
    expect(workspaceCenter).toContain('必推')
    expect(workspaceCenter).toContain('埋线')
    expect(workspaceCenter).toContain('回收')
    expect(workspaceCenter).toContain('禁用')
    expect(workspaceCss).toContain('.novel-draft-brief-storylines')
  })

  test('shows storyline sync status in the delivery strip', () => {
    const workspaceCenter = source('WorkspaceCenter.tsx')
    const workspaceCss = source('WorkspaceCenter.css')

    expect(workspaceCenter).toContain('storylineSync')
    expect(workspaceCenter).toContain('novel-delivery-storyline-tag')
    expect(workspaceCss).toContain('.novel-delivery-storyline-tag')
    expect(workspaceCss).toContain('.novel-delivery-storyline-tag-warn')
  })

  test('shows discovered asset intake in delivery strip and setting workshop', () => {
    const workspaceCenter = source('WorkspaceCenter.tsx')
    const workspaceCss = source('WorkspaceCenter.css')
    const settingPanel = source('SettingWorkshopPanel.tsx')
    const projectWorkspace = readFileSync(join(import.meta.dir, '../NovelProjectWorkspace.tsx'), 'utf8')

    expect(workspaceCenter).toContain('assetIntake')
    expect(workspaceCenter).toContain('novel-delivery-asset-tag')
    expect(workspaceCenter).toContain('onOpenStoryAssets')
    expect(workspaceCss).toContain('.novel-delivery-asset-tag')
    expect(settingPanel).toContain('新资产候选')
    expect(settingPanel).toContain('focusDiscoveredAssetsToken')
    expect(settingPanel).toContain('setting-workshop-model-command')
    expect(settingPanel).toContain('actionLoadingKey')
    expect(settingPanel).toContain('isActionLoading')
    expect(settingPanel).toContain('/discovered-assets/apply')
    expect(settingPanel).toContain('selectedDiscoveredAssetKeys')
    expect(settingPanel).not.toContain('loading={saving}')
    expect(projectWorkspace).toContain('设定资产')
    expect(projectWorkspace).toContain('StoryAssetsWorkspace')
    expect(projectWorkspace).toContain('focusDiscoveredAssetsToken')
  })

  test('shows readability and restrained meme strategy in writing workflow', () => {
    const workspaceCenter = source('WorkspaceCenter.tsx')
    const workspaceCss = source('WorkspaceCenter.css')
    const projectWorkspace = readFileSync(join(import.meta.dir, '../NovelProjectWorkspace.tsx'), 'utf8')

    expect(workspaceCenter).toContain('readabilityReview')
    expect(workspaceCenter).toContain('novel-delivery-readability-tag')
    expect(workspaceCenter).toContain('本章网感策略')
    expect(workspaceCenter).toContain('novel-draft-brief-meme')
    expect(workspaceCss).toContain('.novel-delivery-readability-tag')
    expect(workspaceCss).toContain('.novel-draft-brief-meme')
    expect(projectWorkspace).toContain('网感素材池')
    expect(projectWorkspace).toContain('meme_bank')
  })

  test('shows first30 retention curve as a story planning workflow', () => {
    const planningWorkspace = source('StoryPlanningWorkspace.tsx')
    const planningModel = source('planningWorkspaceModel.ts')
    const projectWorkspace = readFileSync(join(import.meta.dir, '../NovelProjectWorkspace.tsx'), 'utf8')

    expect(planningWorkspace).toContain('前30章留存曲线')
    expect(planningWorkspace).toContain('novel-first30-retention-card')
    expect(planningWorkspace).toContain('运行前30章诊断')
    expect(planningWorkspace).toContain('生成修复任务')
    expect(planningWorkspace).toContain('开篇三章')
    expect(planningWorkspace).toContain('试读十章')
    expect(planningWorkspace).toContain('付费前蓄势')
    expect(planningModel).toContain('first30Retention')
    expect(planningModel).toContain('run_first30_retention')
    expect(planningModel).toContain('create_first30_repair')
    expect(projectWorkspace).toContain('run_first30_retention')
    expect(projectWorkspace).toContain('create_first30_repair')
  })

  test('shows storyline board as a story planning workflow', () => {
    const planningWorkspace = source('StoryPlanningWorkspace.tsx')
    const planningModel = source('planningWorkspaceModel.ts')
    const projectWorkspace = readFileSync(join(import.meta.dir, '../NovelProjectWorkspace.tsx'), 'utf8')

    expect(planningWorkspace).toContain('剧情线看板')
    expect(planningWorkspace).toContain('novel-storyline-board-card')
    expect(planningWorkspace).toContain('逾期未推')
    expect(planningWorkspace).toContain('回收债务')
    expect(planningWorkspace).toContain('影响留存')
    expect(planningModel).toContain('storylineBoard')
    expect(planningModel).toContain('settingEntities')
    expect(projectWorkspace).toContain('projectSettings')
  })
})
