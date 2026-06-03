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
    expect(css).toContain('.novel-editor-command-pill')
    expect(css).toContain('.novel-editor-stage')
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
})
