# Novel Assets Chapter Usage Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the novel setting assets page into a chapter-first usage confirmation workbench so writers can quickly confirm required, forbidden, advancing, planted, and payoff assets before drafting.

**Architecture:** Add a small pure view-model module for usage summary, filtering, and compact tag extraction. Keep existing backend APIs and `SettingWorkshopPanel` state, but render a new chapter usage board and compact asset scheduling cards from the derived model data.

**Tech Stack:** React 18, Ant Design 5, TypeScript, Bun test, Vite.

---

## File Structure

- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.ts`
  - Owns pure functions and constants for usage filters, usage summaries, setting filtering, and compact constraint/state labels.
- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts`
  - Verifies the model without rendering React.
- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts`
  - Source-level guard for the new React/CSS shell because this repo mostly uses lightweight Bun tests instead of a DOM test runner.
- Modify: `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.tsx`
  - Imports the model helpers, adds `activeUsageFilter`, replaces the old single count card, and renders compact scheduling cards.
- Modify: `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.css`
  - Adds the chapter usage board, horizontal filter strip, asset capsule layout, responsive wrapping, and long-text containment.

No server files are modified.

---

### Task 1: Add Usage Workbench Model Tests

**Files:**
- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts`
- Dependency created by Task 2: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.ts`

- [ ] **Step 1: Write the failing model test**

Create `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildCompactSettingTags,
  buildUsageSummary,
  filterSettingsForUsage,
  normalizeUsageType,
} from './settingUsageWorkbenchModel'

const settings = [
  {
    id: 1,
    entity_type: 'character',
    name: '丁松言',
    constraints_json: {
      behavior_limits: ['不得无代价使用高阶食兽能力', '不得直接知晓完整历史真相'],
      growth_limits: '能力成长必须依赖异兽残留',
    },
    state_json: {
      current_stage: '食兽感应初次触发完成',
      known_truth_ratio: 0.05,
      internal_conflict: '穿越者记忆与原生意识拉扯',
    },
  },
  { id: 2, entity_type: 'character', name: '迟正' },
  { id: 3, entity_type: 'ability', name: '食兽感应' },
  { id: 4, entity_type: 'character', name: '黑桑县路人' },
]

const usage = [
  { entity_id: 1, usage_type: 'required', required: true, allowed: true, forbidden: false, reveal_level: 'partial' },
  { entity_id: 2, usage_type: 'forbidden', required: false, allowed: false, forbidden: true, reveal_level: 'none' },
  { entity_id: 3, usage_type: 'plant', required: true, allowed: true, forbidden: false, reveal_level: 'hint' },
]

describe('setting usage workbench model', () => {
  test('summarizes chapter usage by explicit scheduling role', () => {
    expect(buildUsageSummary(usage)).toEqual({
      configured: 3,
      required: 1,
      forbidden: 1,
      advance: 0,
      plant: 1,
      payoff: 0,
      pause: 0,
    })
  })

  test('normalizes legacy required and forbidden flags into usage roles', () => {
    expect(normalizeUsageType({ forbidden: true, usage_type: 'allowed' })).toBe('forbidden')
    expect(normalizeUsageType({ required: true, usage_type: '' })).toBe('required')
    expect(normalizeUsageType({ usage_type: 'payoff' })).toBe('payoff')
    expect(normalizeUsageType(null)).toBe('allowed')
  })

  test('filters current type settings by chapter usage role', () => {
    const usageMap = new Map(usage.map(item => [Number(item.entity_id), item]))

    expect(filterSettingsForUsage(settings, usageMap, 'character', 'configured').map(item => item.name)).toEqual(['丁松言', '迟正'])
    expect(filterSettingsForUsage(settings, usageMap, 'character', 'forbidden').map(item => item.name)).toEqual(['迟正'])
    expect(filterSettingsForUsage(settings, usageMap, 'character', 'unconfigured').map(item => item.name)).toEqual(['黑桑县路人'])
    expect(filterSettingsForUsage(settings, usageMap, 'ability', 'plant').map(item => item.name)).toEqual(['食兽感应'])
  })

  test('turns constraints and state json into compact readable tags', () => {
    const tags = buildCompactSettingTags(settings[0], 5)

    expect(tags).toEqual([
      { group: 'constraint', label: 'behavior_limits: 不得无代价使用高阶食兽能力、不得直接知晓完整历史真相' },
      { group: 'constraint', label: 'growth_limits: 能力成长必须依赖异兽残留' },
      { group: 'state', label: 'current_stage: 食兽感应初次触发完成' },
      { group: 'state', label: 'known_truth_ratio: 0.05' },
      { group: 'state', label: 'internal_conflict: 穿越者记忆与原生意识拉扯' },
    ])
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts
```

Expected: fail with an import error because `settingUsageWorkbenchModel.ts` does not exist.

- [ ] **Step 3: Commit is not needed yet**

Do not commit after the failing test alone. Task 2 adds the implementation and commits the tested model.

---

### Task 2: Implement Usage Workbench Model

**Files:**
- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts`

- [ ] **Step 1: Add the model implementation**

Create `ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.ts`:

```ts
export type SettingUsageType = 'allowed' | 'required' | 'forbidden' | 'advance' | 'plant' | 'payoff' | 'pause'

export type SettingUsageFilter = SettingUsageType | 'configured' | 'unconfigured' | 'all'

export type SettingUsageRecord = {
  entity_id?: number | string
  usage_type?: string
  required?: boolean
  allowed?: boolean
  forbidden?: boolean
  reveal_level?: string
  expected_state_change?: any
}

export type SettingAssetRecord = {
  id?: number | string
  entity_type?: string
  name?: string
  constraints_json?: Record<string, any> | null
  state_json?: Record<string, any> | null
}

export type UsageSummary = {
  configured: number
  required: number
  forbidden: number
  advance: number
  plant: number
  payoff: number
  pause: number
}

export type CompactSettingTag = {
  group: 'constraint' | 'state'
  label: string
}

export const usageFilterOptions: Array<{ key: SettingUsageFilter; label: string }> = [
  { key: 'configured', label: '本章相关' },
  { key: 'all', label: '全部' },
  { key: 'required', label: '必用' },
  { key: 'forbidden', label: '禁揭' },
  { key: 'advance', label: '推进' },
  { key: 'plant', label: '埋线' },
  { key: 'payoff', label: '回收' },
  { key: 'pause', label: '暂停' },
  { key: 'unconfigured', label: '未配置' },
]

export const usageSegmentOptions: Array<{ value: SettingUsageType; label: string }> = [
  { value: 'allowed', label: '可用' },
  { value: 'required', label: '必用' },
  { value: 'forbidden', label: '禁揭' },
  { value: 'advance', label: '推进' },
  { value: 'plant', label: '埋线' },
  { value: 'payoff', label: '回收' },
  { value: 'pause', label: '暂停' },
]

export const revealSegmentOptions = [
  { value: 'none', label: '不揭示' },
  { value: 'hint', label: '线索' },
  { value: 'partial', label: '部分' },
  { value: 'full', label: '完整' },
]

const validUsageTypes = new Set<SettingUsageType>(['allowed', 'required', 'forbidden', 'advance', 'plant', 'payoff', 'pause'])

export function normalizeUsageType(usage: SettingUsageRecord | null | undefined): SettingUsageType {
  if (!usage) return 'allowed'
  if (usage.forbidden) return 'forbidden'
  const raw = String(usage.usage_type || '').trim()
  if (validUsageTypes.has(raw as SettingUsageType)) return raw as SettingUsageType
  if (usage.required) return 'required'
  return 'allowed'
}

export function buildUsageSummary(usage: SettingUsageRecord[]): UsageSummary {
  return usage.reduce<UsageSummary>((acc, item) => {
    const type = normalizeUsageType(item)
    acc.configured += 1
    if (type === 'forbidden') acc.forbidden += 1
    else if (type === 'advance') acc.advance += 1
    else if (type === 'plant') acc.plant += 1
    else if (type === 'payoff') acc.payoff += 1
    else if (type === 'pause') acc.pause += 1
    else if (item.required || type === 'required') acc.required += 1
    return acc
  }, {
    configured: 0,
    required: 0,
    forbidden: 0,
    advance: 0,
    plant: 0,
    payoff: 0,
    pause: 0,
  })
}

export function filterSettingsForUsage(
  settings: SettingAssetRecord[],
  usageMap: Map<number, SettingUsageRecord>,
  activeType: string,
  filter: SettingUsageFilter,
) {
  return settings.filter(setting => {
    if (activeType && String(setting.entity_type || 'rule') !== activeType) return false
    const explicitUsage = usageMap.get(Number(setting.id))
    if (filter === 'all') return true
    if (filter === 'configured') return Boolean(explicitUsage)
    if (filter === 'unconfigured') return !explicitUsage
    return Boolean(explicitUsage) && normalizeUsageType(explicitUsage) === filter
  })
}

function stringifyTagValue(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item ?? '').trim()).filter(Boolean).join('、')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '').trim()
}

function objectTags(value: Record<string, any> | null | undefined, group: CompactSettingTag['group']) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value)
    .map(([key, rowValue]) => {
      const text = stringifyTagValue(rowValue)
      return text ? { group, label: `${key}: ${text}` } : null
    })
    .filter((item): item is CompactSettingTag => Boolean(item))
}

export function buildCompactSettingTags(setting: SettingAssetRecord, limit = 5): CompactSettingTag[] {
  return [
    ...objectTags(setting.constraints_json, 'constraint'),
    ...objectTags(setting.state_json, 'state'),
  ].slice(0, limit)
}
```

- [ ] **Step 2: Run the focused model test**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts
```

Expected: pass all four tests.

- [ ] **Step 3: Commit the model**

Run:

```bash
git add ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.ts ui/web/src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts
git commit -m "feat: add setting usage workbench model"
```

Expected: commit succeeds and does not include `workspace/providers.json`.

---

### Task 3: Wire the Chapter Usage Board into React

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.tsx`
- Create: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts`

- [ ] **Step 1: Write the failing shell test**

Create `ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts`:

```ts
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
    expect(component).not.toContain('<Card size="small" style={{ width: \\'100%\\' }} title={<Space size={4}><Text strong>{setting.name}</Text>')
  })
})
```

- [ ] **Step 2: Run the shell test and verify it fails**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: fail because the component has not been wired to the new model or classes.

- [ ] **Step 3: Import AntD Segmented and model helpers**

Modify the import section in `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.tsx`.

Change:

```ts
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, message, Modal, Select, Space, Tabs, Tag, Typography } from 'antd'
```

To:

```ts
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, message, Modal, Segmented, Select, Space, Tabs, Tag, Typography } from 'antd'
```

Add after the `displayValue` import:

```ts
import {
  buildCompactSettingTags,
  buildUsageSummary,
  filterSettingsForUsage,
  normalizeUsageType,
  revealSegmentOptions,
  type SettingUsageFilter,
  usageFilterOptions,
  usageSegmentOptions,
} from './settingUsageWorkbenchModel'
```

- [ ] **Step 4: Add filter state and derived model data**

Inside `SettingWorkshopPanel`, after `activeType` state, add:

```ts
const [activeUsageFilter, setActiveUsageFilter] = useState<SettingUsageFilter>('configured')
```

Replace the existing count declarations:

```ts
const requiredCount = usage.filter(item => item.required && !item.forbidden).length
const forbiddenCount = usage.filter(item => item.forbidden).length
```

With:

```ts
const usageSummary = useMemo(() => buildUsageSummary(usage), [usage])
const filteredTypeSettings = useMemo(
  () => filterSettingsForUsage(settings, usageMap, activeType, activeUsageFilter),
  [settings, usageMap, activeType, activeUsageFilter],
)
const activeUsageFilterLabel = usageFilterOptions.find(item => item.key === activeUsageFilter)?.label || '本章相关'
```

- [ ] **Step 5: Replace the old single usage count card**

In `SettingWorkshopPanel.tsx`, replace the old card that starts with:

```tsx
<Card size="small" title={activeChapter ? `本章设定调用：第${activeChapter.chapter_no}章` : '本章设定调用'}>
```

And ends with its closing `</Card>` with:

```tsx
<section className="setting-workshop-usage-board" aria-label="本章设定调用确认">
  <div className="setting-workshop-usage-board-header">
    <div className="setting-workshop-usage-board-title">
      <Text strong>{activeChapter ? `第${activeChapter.chapter_no}章 · ${activeChapter.title || activeChapter.name || '本章调用确认'}` : '本章调用确认'}</Text>
      <Text type="secondary">写正文前确认资产出现、隐藏、推进和回收。</Text>
    </div>
    <Button
      size="small"
      type="primary"
      onClick={saveUsage}
      loading={isActionLoading('save_usage')}
      disabled={disabledForAction('save_usage', !activeChapter?.id)}
    >
      保存本章调用
    </Button>
  </div>
  <div className="setting-workshop-usage-metrics">
    <Tag color="blue" bordered={false}>已配置 {usageSummary.configured}</Tag>
    <Tag color="green" bordered={false}>必用 {usageSummary.required}</Tag>
    <Tag color="red" bordered={false}>禁揭 {usageSummary.forbidden}</Tag>
    <Tag color="purple" bordered={false}>推进 {usageSummary.advance}</Tag>
    <Tag color="cyan" bordered={false}>埋线 {usageSummary.plant}</Tag>
    <Tag color="gold" bordered={false}>回收 {usageSummary.payoff}</Tag>
    <Tag bordered={false}>暂停 {usageSummary.pause}</Tag>
  </div>
  <div className="setting-workshop-filter-strip" role="list" aria-label="按本章调用状态筛选设定资产">
    {usageFilterOptions.map(option => (
      <Button
        key={option.key}
        size="small"
        type={activeUsageFilter === option.key ? 'primary' : 'default'}
        onClick={() => setActiveUsageFilter(option.key)}
      >
        {option.label}
      </Button>
    ))}
  </div>
</section>
```

- [ ] **Step 6: Replace asset list data source and empty state**

Inside the `Tabs` items map, replace:

```tsx
children: currentTypeSettings.length ? (
  <List
    size="small"
    dataSource={currentTypeSettings}
```

With:

```tsx
children: filteredTypeSettings.length ? (
  <List
    className="setting-workshop-asset-list"
    size="small"
    dataSource={filteredTypeSettings}
```

Replace:

```tsx
) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无设定" />,
```

With:

```tsx
) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${typeLabel(item.value)}没有命中「${activeUsageFilterLabel}」的设定`} />,
```

- [ ] **Step 7: Replace each asset card with a compact scheduling card**

In the `renderItem={(setting: any) => { ... }}` block, keep:

```tsx
const current = usageFromMap(usageMap, setting)
```

Add directly below it:

```tsx
const compactTags = buildCompactSettingTags(setting)
const usageType = normalizeUsageType(current)
```

Replace the returned `<List.Item>...</List.Item>` card body with:

```tsx
<List.Item>
  <article className={`setting-workshop-asset-card setting-workshop-asset-${usageType}`}>
    <header className="setting-workshop-asset-header">
      <div className="setting-workshop-asset-titleblock">
        <Space size={6} wrap>
          <Text strong className="setting-workshop-asset-name">{setting.name}</Text>
          <Tag bordered={false}>{typeLabel(setting.entity_type)}</Tag>
          {setting.status && <Tag bordered={false}>{setting.status === 'active' ? '启用' : setting.status === 'retired' ? '退场' : '草稿'}</Tag>}
          {setting.visibility && <Tag color={setting.visibility === 'spoiler' ? 'red' : setting.visibility === 'hidden' ? 'gold' : 'blue'} bordered={false}>{setting.visibility === 'public' ? '公开' : setting.visibility === 'hidden' ? '隐藏' : '剧透'}</Tag>}
          {setting.first_chapter_no && <Tag bordered={false}>初登 第{setting.first_chapter_no}章</Tag>}
          {setting.last_chapter_no && <Tag bordered={false}>末次 第{setting.last_chapter_no}章</Tag>}
        </Space>
        <Paragraph className="setting-workshop-asset-summary" ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
          {setting.summary || '暂无摘要'}
        </Paragraph>
      </div>
      <Space size={4} className="setting-workshop-asset-actions">
        <Button size="small" type="link" onClick={() => openEditor(setting)}>编辑</Button>
        <Button size="small" type="link" danger onClick={() => deleteSetting(setting)}>删除</Button>
      </Space>
    </header>

    <div className="setting-workshop-asset-controls">
      <div className="setting-workshop-control-row">
        <Text type="secondary">用途</Text>
        <Segmented
          className="setting-workshop-usage-segment"
          size="small"
          value={usageType}
          options={usageSegmentOptions}
          onChange={value => updateUsage(setting, { usage_type: String(value) })}
        />
      </div>
      <div className="setting-workshop-control-row">
        <Text type="secondary">揭示</Text>
        <Segmented
          className="setting-workshop-reveal-segment"
          size="small"
          value={current.reveal_level || 'none'}
          options={revealSegmentOptions}
          onChange={value => updateUsage(setting, { reveal_level: String(value) })}
        />
      </div>
    </div>

    {compactTags.length > 0 && (
      <div className="setting-workshop-asset-tags">
        {compactTags.map(tag => (
          <Tag key={`${tag.group}:${tag.label}`} color={tag.group === 'constraint' ? 'volcano' : 'geekblue'} bordered={false}>
            {tag.label}
          </Tag>
        ))}
      </div>
    )}

    <details className="setting-workshop-state-change">
      <summary>本章状态变化</summary>
      <Input.TextArea
        size="small"
        rows={2}
        placeholder="例如：断臂神纹首次灼痛；某物品转移给迟正"
        value={displayValue(current.expected_state_change || '')}
        onChange={e => updateUsage(setting, { expected_state_change: e.target.value ? { note: e.target.value } : {} })}
      />
    </details>
  </article>
</List.Item>
```

- [ ] **Step 8: Run the focused shell test**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: pass both shell tests.

- [ ] **Step 9: Run model and shell tests together**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: pass all tests.

- [ ] **Step 10: Commit the React wiring**

Run:

```bash
git add ui/web/src/pages/novel-workspace/SettingWorkshopPanel.tsx ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
git commit -m "feat: add chapter asset usage board"
```

Expected: commit succeeds and does not include `workspace/providers.json`.

---

### Task 4: Add Workbench Styling and Layout Guards

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.css`
- Modify: `ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts`

- [ ] **Step 1: Extend the shell test for CSS layout**

Append this test to `ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the shell test and verify it fails**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: fail because the CSS classes are not defined yet.

- [ ] **Step 3: Add CSS for the usage board and asset cards**

Append to `ui/web/src/pages/novel-workspace/SettingWorkshopPanel.css`:

```css
.setting-workshop-usage-board {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.setting-workshop-usage-board-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.setting-workshop-usage-board-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.setting-workshop-usage-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.setting-workshop-filter-strip {
  display: flex;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}

.setting-workshop-filter-strip .ant-btn {
  flex: 0 0 auto;
}

.setting-workshop-asset-list .ant-list-item {
  padding-block: 6px;
}

.setting-workshop-asset-card {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.setting-workshop-asset-required {
  border-left: 4px solid #16a34a;
}

.setting-workshop-asset-forbidden {
  border-left: 4px solid #dc2626;
}

.setting-workshop-asset-advance {
  border-left: 4px solid #7c3aed;
}

.setting-workshop-asset-plant {
  border-left: 4px solid #0891b2;
}

.setting-workshop-asset-payoff {
  border-left: 4px solid #ca8a04;
}

.setting-workshop-asset-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.setting-workshop-asset-titleblock {
  min-width: 0;
  flex: 1;
}

.setting-workshop-asset-name {
  display: inline-block;
  max-width: min(42vw, 520px);
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.setting-workshop-asset-summary.ant-typography {
  margin: 6px 0 0;
  color: #374151;
  font-size: 12px;
}

.setting-workshop-asset-actions {
  flex: 0 0 auto;
}

.setting-workshop-asset-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.setting-workshop-control-row {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.setting-workshop-control-row > .ant-typography {
  flex: 0 0 auto;
  font-size: 12px;
}

.setting-workshop-usage-segment,
.setting-workshop-reveal-segment {
  min-width: 0;
  max-width: 100%;
}

.setting-workshop-asset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  min-width: 0;
}

.setting-workshop-asset-tags .ant-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-workshop-state-change {
  margin-top: 10px;
}

.setting-workshop-state-change summary {
  cursor: pointer;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.setting-workshop-state-change .ant-input {
  margin-top: 8px;
}

@media (max-width: 760px) {
  .setting-workshop-usage-board-header,
  .setting-workshop-asset-header {
    flex-direction: column;
  }

  .setting-workshop-asset-controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .setting-workshop-asset-name {
    max-width: 72vw;
  }
}
```

- [ ] **Step 4: Run the shell test**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: pass all shell tests.

- [ ] **Step 5: Commit the styling**

Run:

```bash
git add ui/web/src/pages/novel-workspace/SettingWorkshopPanel.css ui/web/src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
git commit -m "style: refine chapter asset usage workbench"
```

Expected: commit succeeds and does not include `workspace/providers.json`.

---

### Task 5: Verify Build and Browser Layout

**Files:**
- No source files expected unless verification finds a bug.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchModel.test.ts src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run the existing writing cockpit regression tests**

Run:

```bash
bun run test:writing-cockpit
```

Expected: existing novel workspace tests pass. If an unrelated pre-existing test fails, capture the exact failing test and continue only after confirming it is unrelated.

- [ ] **Step 3: Run the web build**

Run:

```bash
bun run build:web
```

Expected: Vite build completes without TypeScript or bundling errors.

- [ ] **Step 4: Start or reuse local dev servers for visual verification**

If no dev servers are already running, start backend:

```bash
PORT=18787 HOST=127.0.0.1 bun ui/server/src/index.ts
```

Start frontend:

```bash
cd ui/web && VITE_API_BASE_URL=http://127.0.0.1:18787/api bun run dev --host 127.0.0.1 --port 5174
```

Expected: frontend serves at `http://127.0.0.1:5174`.

- [ ] **Step 5: Browser-check the setting assets page**

Open the novel workspace and go to `设定资产`. Verify:

- The top app navigation still shows `任务中心`.
- The first visible setting assets section is the chapter usage board.
- `本章相关` is selected by default.
- Clicking `禁揭` and `未配置` changes the displayed asset list without saving.
- Long asset names truncate inside the card instead of pushing the layout horizontally.
- Constraint and state data appears as compact tags, with `本章状态变化` collapsed.

- [ ] **Step 6: Fix any layout bugs found during browser verification**

If visual verification finds overflow or broken spacing, adjust only `SettingWorkshopPanel.css`, rerun:

```bash
cd ui/web && bun test src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
bun run build:web
```

Expected: tests and build pass after the CSS fix.

- [ ] **Step 7: Commit verification fixes if any were needed**

If Step 6 changed CSS, run:

```bash
git add ui/web/src/pages/novel-workspace/SettingWorkshopPanel.css
git commit -m "fix: contain chapter asset workbench layout"
```

Expected: commit succeeds and does not include `workspace/providers.json`.

---

## Self-Review

- Spec coverage: Task 1 and Task 2 cover usage summary, filtering, `未配置`, and compact tags. Task 3 covers the chapter-first board, scheduling controls, reveal controls, and collapsed state-change input. Task 4 covers compact layout and long-text containment. Task 5 covers tests, build, and browser verification.
- Backend scope: no task changes server routes or persistence schemas.
- Existing behavior preservation: the plan keeps `updateUsage`, `saveUsage`, `openEditor`, `deleteSetting`, discovered assets, and pending state updates in the existing component.
- Type consistency: the shared filter type is `SettingUsageFilter`; usage roles use `SettingUsageType`; component state uses the exported filter type.
- Placeholder scan: no step depends on an undefined file, undefined function, or unspecified command.
