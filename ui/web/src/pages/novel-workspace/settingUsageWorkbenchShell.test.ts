import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

function source(file: string) {
  return readFileSync(join(import.meta.dir, file), 'utf8')
}

describe('setting usage workbench shell', () => {
  test('renders a chapter-first usage board before the asset type tabs', () => {
    const component = source('SettingWorkshopPanel.tsx')

    expect(component).toContain('setting-workshop-usage-board')
    expect(component).toContain('usageFilterOptions.map')
    expect(component).toContain('activeUsageFilter')
    expect(component).toContain('setActiveUsageFilter')
    expect(component).toContain('usageSummary')
    expect(component).toContain('本章相关')
    expect(component).toContain('保存本章调用')
  })

  test('renders compact scheduling cards instead of raw debug-style asset cards', () => {
    const component = source('SettingWorkshopPanel.tsx')

    expect(component).toContain('setting-workshop-asset-card')
    expect(component).toContain('setting-workshop-usage-segment')
    expect(component).toContain('setting-workshop-reveal-segment')
    expect(component).toContain('buildCompactSettingTags')
    expect(component).toContain('usageSegmentOptions')
    expect(component).toContain('revealSegmentOptions')
    expect(component).toContain('<details className="setting-workshop-state-change"')
    expect(component).not.toContain('<Card size="small" style={{ width: \'100%\' }} title={<Space size={4}><Text strong>{setting.name}</Text>')
  })

  test('keeps the usage workbench compact and long names contained', () => {
    const css = source('SettingWorkshopPanel.css')

    expect(css).toContain('.setting-workshop-usage-board')
    expect(css).toContain('.setting-workshop-filter-strip')
    expect(css).toContain('overflow-x: auto')
    expect(css).toContain('.setting-workshop-asset-card')
    expect(css).toContain('.setting-workshop-asset-name')
    expect(css).toContain('text-overflow: ellipsis')
    expect(css).toContain('.setting-workshop-asset-tags .ant-tag')
    expect(css).toContain('max-width: 100%')
    expect(css).toContain('@media (max-width: 760px)')
  })
})
