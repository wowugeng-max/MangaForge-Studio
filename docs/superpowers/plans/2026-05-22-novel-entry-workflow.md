# Novel Entry Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the novel creation wizard into a commercial long-form launchpad and rework the novel lobby into a daily continuation entry while keeping project management available.

**Architecture:** Put readiness and next-action decisions in small pure model modules with `bun:test` coverage, then consume those models from the existing React screens. Keep backend APIs unchanged for this phase and enrich the existing `reference_config.project_seed` payload with launchpad fields.

**Tech Stack:** React 18, TypeScript, Ant Design, Vite, Bun test, existing `apiClient` Axios wrapper.

---

## File Structure

- Create `ui/web/src/components/novel-entry/launchpadModel.ts`
  - Owns launchpad field types, seed extraction, readiness scoring, risk labels, and seed payload enrichment for the creation wizard.
- Create `ui/web/src/components/novel-entry/launchpadModel.test.ts`
  - Covers manual and AI-assisted launchpad readiness, seed extraction, and first-30 plan detection.
- Modify `ui/web/src/components/NovelCreateWizard.tsx`
  - Replaces generic four-step wizard with launchpad-oriented five-step flow.
  - Adds launchpad state and uses `launchpadModel.ts` for readiness and payload enrichment.
- Create `ui/web/src/pages/novel-lobby/novelLobbyModel.ts`
  - Owns project next-action inference, governance labels, featured project selection, and compact project card metadata.
- Create `ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts`
  - Covers empty projects, seed-rich projects, draft projects, and projects with written chapters when chapter counts are present.
- Create `ui/web/src/pages/novel-lobby/NovelLobbyDashboard.tsx`
  - Renders Continue Writing and Next Governance sections above the project grid.
- Modify `ui/web/src/pages/NovelStudio.tsx`
  - Imports `NovelLobbyDashboard`, renders it before search and project list, and passes navigation handlers.
- Modify `package.json`
  - Adds a focused test script for the new entry workflow model tests.
- Modify `docs/novel-roadmap-009-progress-log.md`
  - Records the final implementation after verification.

## Task 1: Launchpad Model

**Files:**
- Create: `ui/web/src/components/novel-entry/launchpadModel.ts`
- Create: `ui/web/src/components/novel-entry/launchpadModel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `ui/web/src/components/novel-entry/launchpadModel.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildLaunchpadSeedPatch,
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  summarizeFirst30Plan,
} from './launchpadModel'

describe('launchpadModel', () => {
  test('marks a commercial long-form seed as ready across hook, first30, and longform capacity', () => {
    const seed = {
      logline: '寒门少年以阵法改写宗门秩序',
      commercial_positioning: {
        reader_promise: '看主角从杂役一路反杀宗门秩序',
        selling_points: ['阵法升级', '宗门打脸'],
      },
      protagonist: {
        identity: '外门杂役',
        goal: '夺回被抢走的阵盘',
      },
      plot_engine: {
        long_term_goal: '建立自己的阵道宗门',
        long_term_conflict: '旧宗门与上古阵盟持续围剿',
        growth_engine: '阵盘修复与阵纹解锁',
      },
      volume_outlines: [
        { title: '外门压迫', goal: '让主角进入内门视野' },
        { title: '内门夺位', goal: '夺取阵堂话语权' },
      ],
      chapter_outlines: Array.from({ length: 30 }).map((_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_goal: index < 3 ? '开篇压迫与反击' : index < 10 ? '试读爽点闭环' : '付费前蓄势',
      })),
      foreshadowing_plan: [{ name: '残缺阵盘' }, { name: '阵盟密令' }],
    }

    const fields = extractLaunchpadFieldsFromSeed(seed)
    const readiness = evaluateLaunchpadReadiness(fields, seed, 'epic')

    expect(fields.reader_promise).toBe('看主角从杂役一路反杀宗门秩序')
    expect(fields.core_selling_point).toBe('阵法升级 / 宗门打脸')
    expect(fields.mainline_goal).toBe('建立自己的阵道宗门')
    expect(readiness.sellable.ready).toBe(true)
    expect(readiness.first30.ready).toBe(true)
    expect(readiness.longform.ready).toBe(true)
    expect(readiness.risks).toEqual([])
  })

  test('reports missing hook and longform risks for a sparse epic manual project', () => {
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '',
      core_selling_point: '',
      opening_hook: '',
      first30_plan: {
        chapters_1_3: '',
        chapters_4_10: '',
        chapters_11_30: '',
      },
    }

    const readiness = evaluateLaunchpadReadiness(fields, null, 'epic')

    expect(readiness.sellable.ready).toBe(false)
    expect(readiness.first30.ready).toBe(false)
    expect(readiness.longform.ready).toBe(false)
    expect(readiness.risks).toContain('缺读者承诺')
    expect(readiness.risks).toContain('缺第一章开篇钩子')
    expect(readiness.risks).toContain('超长篇缺长线冲突引擎')
  })

  test('summarizes first 30 plan from chapter outlines when seed has enough coverage', () => {
    const seed = {
      chapter_outlines: Array.from({ length: 12 }).map((_, index) => ({
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_goal: index < 3 ? '开篇压迫' : '试读闭环',
      })),
    }

    const summary = summarizeFirst30Plan(seed)

    expect(summary.outlineCount).toBe(12)
    expect(summary.hasOpening).toBe(true)
    expect(summary.hasTrialRead).toBe(true)
    expect(summary.hasPaidBuildup).toBe(false)
    expect(summary.sample[0]).toContain('第1章')
  })

  test('builds seed patch without losing raw seed fields', () => {
    const seed = { title: '万古长夜', custom: { keep: true } }
    const fields = {
      ...createEmptyLaunchpadFields(),
      reader_promise: '看凡人改写宗门秩序',
      core_selling_point: '阵法升级',
      opening_hook: '杂役当众被夺阵盘',
      mainline_goal: '建立阵道宗门',
      first_writing_task: '完善第1章场景卡',
      first30_plan: {
        chapters_1_3: '压迫、金手指、第一次反击',
        chapters_4_10: '完成试读闭环',
        chapters_11_30: '进入付费前大危机',
      },
    }

    const patch = buildLaunchpadSeedPatch(seed, fields, ['缺长线承载'])

    expect(patch.title).toBe('万古长夜')
    expect(patch.custom.keep).toBe(true)
    expect(patch.reader_promise).toBe('看凡人改写宗门秩序')
    expect(patch.launchpad_risks).toEqual(['缺长线承载'])
    expect(patch.first30_plan.chapters_11_30).toBe('进入付费前大危机')
  })
})
```

- [ ] **Step 2: Run the model tests and verify they fail**

Run:

```bash
cd ui/web && bun test src/components/novel-entry/launchpadModel.test.ts
```

Expected: FAIL because `launchpadModel.ts` does not exist yet. If Bun reports missing exports, continue.

- [ ] **Step 3: Implement the launchpad model**

Create `ui/web/src/components/novel-entry/launchpadModel.ts`:

```ts
export interface First30PlanFields {
  chapters_1_3: string
  chapters_4_10: string
  chapters_11_30: string
}

export interface LaunchpadFields {
  reader_promise: string
  core_selling_point: string
  protagonist_situation: string
  protagonist_pressure: string
  opening_hook: string
  mainline_goal: string
  long_term_conflict: string
  growth_engine: string
  volume_direction: string
  expandable_assets: string
  future100_note: string
  first30_plan: First30PlanFields
  first_writing_task: string
}

export interface ReadinessItem {
  key: 'sellable' | 'first30' | 'longform'
  title: string
  ready: boolean
  score: number
  missing: string[]
}

export interface LaunchpadReadiness {
  sellable: ReadinessItem
  first30: ReadinessItem
  longform: ReadinessItem
  risks: string[]
  nextAction: string
}

export interface First30Summary {
  outlineCount: number
  hasOpening: boolean
  hasTrialRead: boolean
  hasPaidBuildup: boolean
  sample: string[]
}

function trimText(value: any) {
  return String(value || '').trim()
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function firstText(...values: any[]) {
  return values.map(trimText).find(Boolean) || ''
}

function joinTags(value: any) {
  return asArray(value).map(item => trimText(item?.title || item?.name || item)).filter(Boolean).slice(0, 4).join(' / ')
}

export function createEmptyLaunchpadFields(): LaunchpadFields {
  return {
    reader_promise: '',
    core_selling_point: '',
    protagonist_situation: '',
    protagonist_pressure: '',
    opening_hook: '',
    mainline_goal: '',
    long_term_conflict: '',
    growth_engine: '',
    volume_direction: '',
    expandable_assets: '',
    future100_note: '',
    first30_plan: {
      chapters_1_3: '',
      chapters_4_10: '',
      chapters_11_30: '',
    },
    first_writing_task: '',
  }
}

export function summarizeFirst30Plan(seed: any): First30Summary {
  const chapterOutlines = asArray(asObject(seed).chapter_outlines)
  const labeled = chapterOutlines
    .map((item, index) => ({
      no: Number(item?.chapter_no || item?.chapter || index + 1),
      title: firstText(item?.title, item?.chapter_title, `第${index + 1}章`),
      goal: firstText(item?.chapter_goal, item?.goal, item?.summary, item?.hook),
    }))
    .filter(item => item.no >= 1 && item.no <= 30)

  return {
    outlineCount: labeled.length,
    hasOpening: labeled.some(item => item.no >= 1 && item.no <= 3),
    hasTrialRead: labeled.some(item => item.no >= 4 && item.no <= 10),
    hasPaidBuildup: labeled.some(item => item.no >= 11 && item.no <= 30),
    sample: labeled.slice(0, 5).map(item => `第${item.no}章 ${item.title}${item.goal ? `：${item.goal}` : ''}`),
  }
}

export function extractLaunchpadFieldsFromSeed(seed: any): LaunchpadFields {
  const root = asObject(seed)
  const commercial = asObject(root.commercial_positioning)
  const protagonist = asObject(root.protagonist)
  const plotEngine = asObject(root.plot_engine)
  const worldbuilding = asObject(root.worldbuilding)
  const first30 = asObject(root.first30_plan)
  const summary = summarizeFirst30Plan(root)

  return {
    reader_promise: firstText(root.reader_promise, commercial.reader_promise, root.logline, root.synopsis),
    core_selling_point: firstText(root.core_selling_point, joinTags(commercial.selling_points), joinTags(root.commercial_tags), root.hook),
    protagonist_situation: firstText(root.protagonist_situation, protagonist.initial_situation, protagonist.identity, protagonist.background),
    protagonist_pressure: firstText(root.protagonist_pressure, protagonist.pressure, protagonist.goal, protagonist.desire),
    opening_hook: firstText(root.opening_hook, root.chapter_1_hook, root.hook, summary.sample[0]),
    mainline_goal: firstText(root.mainline_goal, plotEngine.long_term_goal, root.main_conflict),
    long_term_conflict: firstText(root.long_term_conflict, plotEngine.long_term_conflict, plotEngine.escalation_engine, root.main_conflict),
    growth_engine: firstText(root.growth_engine, plotEngine.growth_engine, plotEngine.power_system, worldbuilding.power_system),
    volume_direction: firstText(root.volume_direction, joinTags(root.volume_outlines), plotEngine.volume_direction),
    expandable_assets: firstText(root.expandable_assets, joinTags(root.characters), joinTags(root.foreshadowing_plan), worldbuilding.world_summary),
    future100_note: firstText(root.future100_note, summary.outlineCount >= 30 ? `已有前${summary.outlineCount}章细纲，可继续扩展未来100章。` : ''),
    first30_plan: {
      chapters_1_3: firstText(first30.chapters_1_3, summary.sample.filter(item => /^第[1-3]章/.test(item)).join('；')),
      chapters_4_10: firstText(first30.chapters_4_10, summary.sample.filter(item => /^第([4-9]|10)章/.test(item)).join('；')),
      chapters_11_30: firstText(first30.chapters_11_30, summary.hasPaidBuildup ? '已有11-30章细纲覆盖。' : ''),
    },
    first_writing_task: firstText(root.first_writing_task, summary.outlineCount ? '检查第1章场景卡并开始正文。' : '完善前30章启动计划。'),
  }
}

function scoreMissing(required: Array<[string, string]>) {
  const missing = required.filter(([value]) => !trimText(value)).map(([, label]) => label)
  return {
    missing,
    score: Math.max(0, required.length - missing.length),
  }
}

export function evaluateLaunchpadReadiness(fields: LaunchpadFields, seed: any, lengthTarget: string): LaunchpadReadiness {
  const first30Summary = summarizeFirst30Plan(seed)
  const sellableBase = scoreMissing([
    [fields.reader_promise, '缺读者承诺'],
    [fields.core_selling_point, '缺核心卖点'],
    [fields.opening_hook, '缺第一章开篇钩子'],
  ])
  const first30Base = scoreMissing([
    [fields.first30_plan.chapters_1_3 || (first30Summary.hasOpening ? 'seed' : ''), '缺1-3章开篇承诺'],
    [fields.first30_plan.chapters_4_10 || (first30Summary.hasTrialRead ? 'seed' : ''), '缺4-10章试读闭环'],
    [fields.first30_plan.chapters_11_30 || (first30Summary.hasPaidBuildup ? 'seed' : ''), '缺11-30章付费前蓄势'],
  ])
  const longformRequired: Array<[string, string]> = [
    [fields.mainline_goal, '缺主线目标'],
    [fields.growth_engine, '缺成长或升级机制'],
    [fields.volume_direction, '缺分卷方向'],
  ]
  if (lengthTarget === 'epic' || lengthTarget === 'long') {
    longformRequired.push([fields.long_term_conflict, lengthTarget === 'epic' ? '超长篇缺长线冲突引擎' : '缺长线冲突引擎'])
  }
  const longformBase = scoreMissing(longformRequired)

  const sellable: ReadinessItem = {
    key: 'sellable',
    title: '卖点可读',
    ready: sellableBase.missing.length === 0,
    score: sellableBase.score,
    missing: sellableBase.missing,
  }
  const first30: ReadinessItem = {
    key: 'first30',
    title: '前30章启动',
    ready: first30Base.missing.length === 0,
    score: first30Base.score,
    missing: first30Base.missing,
  }
  const longform: ReadinessItem = {
    key: 'longform',
    title: '长线承载',
    ready: longformBase.missing.length === 0,
    score: longformBase.score,
    missing: longformBase.missing,
  }
  const risks = [...sellable.missing, ...first30.missing, ...longform.missing]
  return {
    sellable,
    first30,
    longform,
    risks,
    nextAction: risks[0] || fields.first_writing_task || '进入故事规划首页。',
  }
}

export function buildLaunchpadSeedPatch(seed: any, fields: LaunchpadFields, risks: string[]) {
  return {
    ...asObject(seed),
    reader_promise: fields.reader_promise,
    core_selling_point: fields.core_selling_point,
    opening_hook: fields.opening_hook,
    protagonist_situation: fields.protagonist_situation,
    protagonist_pressure: fields.protagonist_pressure,
    mainline_goal: fields.mainline_goal,
    long_term_conflict: fields.long_term_conflict,
    growth_engine: fields.growth_engine,
    volume_direction: fields.volume_direction,
    expandable_assets: fields.expandable_assets,
    future100_note: fields.future100_note,
    first30_plan: fields.first30_plan,
    launchpad_risks: risks,
    first_writing_task: fields.first_writing_task,
  }
}
```

- [ ] **Step 4: Run launchpad tests directly**

Run:

```bash
cd ui/web && bun test src/components/novel-entry/launchpadModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add ui/web/src/components/novel-entry/launchpadModel.ts ui/web/src/components/novel-entry/launchpadModel.test.ts
git commit -m "feat: add novel launchpad model"
```

## Task 2: Commercial Launchpad Wizard

**Files:**
- Modify: `ui/web/src/components/NovelCreateWizard.tsx`
- Test: `ui/web/src/components/novel-entry/launchpadModel.test.ts`

- [ ] **Step 1: Add model imports and launchpad state**

Modify the imports in `ui/web/src/components/NovelCreateWizard.tsx`:

```ts
import {
  buildLaunchpadSeedPatch,
  createEmptyLaunchpadFields,
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  summarizeFirst30Plan,
  type LaunchpadFields,
} from './novel-entry/launchpadModel'
```

Add state after the existing `data` state:

```ts
const [launchpad, setLaunchpad] = useState<LaunchpadFields>(() => createEmptyLaunchpadFields())
```

Add helpers near `onFormChange`:

```ts
const updateLaunchpad = (patch: Partial<LaunchpadFields>) => {
  setLaunchpad(prev => ({ ...prev, ...patch }))
}

const updateFirst30Plan = (patch: Partial<LaunchpadFields['first30_plan']>) => {
  setLaunchpad(prev => ({
    ...prev,
    first30_plan: { ...prev.first30_plan, ...patch },
  }))
}

const first30Summary = summarizeFirst30Plan(seed)
const launchpadReadiness = evaluateLaunchpadReadiness(launchpad, seed, data.length_target)
```

- [ ] **Step 2: Reset and seed application behavior**

In `handleReset`, add:

```ts
setLaunchpad(createEmptyLaunchpadFields())
```

In `applySeedToForm`, after `setData`, add:

```ts
setLaunchpad(prev => ({
  ...prev,
  ...extractLaunchpadFieldsFromSeed(nextSeed),
}))
```

This preserves user edits that are not returned by the seed only when the extracted seed field is empty:

```ts
const extractedLaunchpad = extractLaunchpadFieldsFromSeed(nextSeed)
setLaunchpad(prev => ({
  ...prev,
  reader_promise: extractedLaunchpad.reader_promise || prev.reader_promise,
  core_selling_point: extractedLaunchpad.core_selling_point || prev.core_selling_point,
  protagonist_situation: extractedLaunchpad.protagonist_situation || prev.protagonist_situation,
  protagonist_pressure: extractedLaunchpad.protagonist_pressure || prev.protagonist_pressure,
  opening_hook: extractedLaunchpad.opening_hook || prev.opening_hook,
  mainline_goal: extractedLaunchpad.mainline_goal || prev.mainline_goal,
  long_term_conflict: extractedLaunchpad.long_term_conflict || prev.long_term_conflict,
  growth_engine: extractedLaunchpad.growth_engine || prev.growth_engine,
  volume_direction: extractedLaunchpad.volume_direction || prev.volume_direction,
  expandable_assets: extractedLaunchpad.expandable_assets || prev.expandable_assets,
  future100_note: extractedLaunchpad.future100_note || prev.future100_note,
  first30_plan: {
    chapters_1_3: extractedLaunchpad.first30_plan.chapters_1_3 || prev.first30_plan.chapters_1_3,
    chapters_4_10: extractedLaunchpad.first30_plan.chapters_4_10 || prev.first30_plan.chapters_4_10,
    chapters_11_30: extractedLaunchpad.first30_plan.chapters_11_30 || prev.first30_plan.chapters_11_30,
  },
  first_writing_task: extractedLaunchpad.first_writing_task || prev.first_writing_task,
}))
```

- [ ] **Step 3: Enrich create payload**

Replace the beginning of `buildCreatePayload` with:

```ts
const buildCreatePayload = (projectSeed = seed) => {
  const readiness = evaluateLaunchpadReadiness(launchpad, projectSeed, data.length_target)
  const seedWithLaunchpad = projectSeed
    ? buildLaunchpadSeedPatch(projectSeed, launchpad, readiness.risks)
    : buildLaunchpadSeedPatch({}, launchpad, readiness.risks)
  return {
    title: data.title,
    genre: data.genre || '',
    sub_genres: data.sub_genres || [],
    length_target: data.length_target || 'medium',
    target_audience: data.target_audience || '',
    style_tags: data.style_tags || [],
    commercial_tags: data.commercial_tags || [],
    synopsis: data.synopsis || launchpad.reader_promise || '',
    status: 'draft',
    reference_config: {
      project_seed: {
        ...seedWithLaunchpad,
        raw_idea: seedIdea,
        derived_at: new Date().toISOString(),
      },
      writing_bible: projectSeed?.writing_bible || {},
      commercial_positioning: {
        reader_promise: launchpad.reader_promise || projectSeed?.logline || projectSeed?.synopsis || '',
        selling_points: asStringArray(projectSeed?.commercial_positioning?.selling_points).length
          ? asStringArray(projectSeed?.commercial_positioning?.selling_points)
          : asStringArray(projectSeed?.commercial_tags),
        seed: Boolean(projectSeed),
      },
    },
    auto_materialize_seed: Boolean(projectSeed),
  }
}
```

This intentionally stores launchpad data even for manual projects so the lobby can infer "补商业钩子" or "规划可继续" without a new backend endpoint.

- [ ] **Step 4: Reframe wizard steps**

Replace the current `formItems` with:

```ts
const formItems = ['target', 'hook', 'longform', 'first30', 'confirm', 'done']
```

Replace `steps` with:

```ts
const steps = [
  { title: '创作目标', description: '题材与篇幅' },
  { title: '商业钩子', description: '承诺与开篇' },
  { title: '长线承载', description: '主线与扩展' },
  { title: '前30章', description: '追读启动' },
  { title: '确认创建', description: '预览与风险' },
  { title: '创建完成', description: '进入规划' },
]
```

Update `handleNext` creation condition from `formItems.length - 2` to the new confirm index:

```ts
if (current === formItems.length - 2) {
  await handleCreate()
  return
}
```

The existing expression already uses `formItems.length - 2`, so the main change is ensuring all render conditions use `current === 0` through `current === 5`.

- [ ] **Step 5: Replace Step 1 UI with Creative Target**

Keep the existing creation mode card and AI seed section under `current === 0`, but change the heading copy:

```tsx
<h2 style={{ margin: '0 0 4px 0' }}>新书商业长篇启动台</h2>
<p style={{ color: '#666', margin: 0 }}>先确认卖点、前30章和长线承载，再进入故事规划</p>
```

Change creation mode descriptions:

```ts
[
  { key: 'manual', title: '手动开书', desc: '先建可写项目，商业钩子和长线计划由你手动填写。' },
  { key: 'quick_ai', title: 'AI 快速开书', desc: '给作品名或一句想法，AI 整理卖点、前30章和长线骨架。' },
  { key: 'deep_draft', title: '深度孵化', desc: 'AI 先产出可编辑草稿，人工修订后再定稿创建。' },
]
```

Change `LENGTH_TARGETS` labels to emphasize serial strategy while keeping values:

```ts
const LENGTH_TARGETS = [
  { value: 'short', label: '短篇（< 20万）', description: '短篇快完结，适合试水' },
  { value: 'medium', label: '中篇（20-80万）', description: '节奏紧凑，主线明确' },
  { value: 'long', label: '长篇连载（80-300万）', description: '多卷多线，适合持续追读' },
  { value: 'epic', label: '超长篇连载（> 300万）', description: '优先检查长期冲突、升级机制和资产池' },
]
```

- [ ] **Step 6: Add Commercial Hook step**

Add this render block after the `current === 0` block:

```tsx
{current === 1 && (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Alert type="info" showIcon message="这一页回答：读者为什么点开，第一章为什么继续看。" />
    <Form.Item label="读者承诺">
      <Input.TextArea
        rows={2}
        value={launchpad.reader_promise}
        onChange={event => updateLaunchpad({ reader_promise: event.target.value })}
        placeholder="例如：看寒门少年用阵法一步步夺回修炼秩序"
      />
    </Form.Item>
    <Form.Item label="核心爽点 / 卖点">
      <Input.TextArea
        rows={2}
        value={launchpad.core_selling_point}
        onChange={event => updateLaunchpad({ core_selling_point: event.target.value })}
        placeholder="例如：低位反杀、阵法升级、宗门打脸、资源经营"
      />
    </Form.Item>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <Form.Item label="主角初始处境">
        <Input.TextArea
          rows={3}
          value={launchpad.protagonist_situation}
          onChange={event => updateLaunchpad({ protagonist_situation: event.target.value })}
          placeholder="例如：外门杂役，被执事夺走唯一阵盘"
        />
      </Form.Item>
      <Form.Item label="主角欲望 / 压力">
        <Input.TextArea
          rows={3}
          value={launchpad.protagonist_pressure}
          onChange={event => updateLaunchpad({ protagonist_pressure: event.target.value })}
          placeholder="例如：必须在试炼前修复阵盘，否则被逐出宗门"
        />
      </Form.Item>
    </div>
    <Form.Item label="第一章开篇钩子">
      <Input.TextArea
        rows={3}
        value={launchpad.opening_hook}
        onChange={event => updateLaunchpad({ opening_hook: event.target.value })}
        placeholder="第一章开场就发生什么冲突、羞辱、危机或反常事件？"
      />
    </Form.Item>
    <Form.Item name="style_tags" label="风格标签（可选，可多选）">
      <Select mode="multiple" placeholder="选择风格标签" options={STYLE_TAGS.map(t => ({ value: t, label: t }))} style={{ width: '100%' }} maxCount={5} />
    </Form.Item>
    <Form.Item name="commercial_tags" label="商业标签（可选，可多选）">
      <Select mode="multiple" placeholder="选择商业定位标签" options={COMMERCIAL_TAGS.map(t => ({ value: t, label: t }))} style={{ width: '100%' }} maxCount={3} />
    </Form.Item>
  </Space>
)}
```

- [ ] **Step 7: Add Long-Form Capacity step**

Replace the old `current === 1` style settings block with:

```tsx
{current === 2 && (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Alert type="info" showIcon message="这一页回答：这本书为什么能写长，而不是只有一个开头。" />
    <Form.Item label="主线目标">
      <Input.TextArea rows={2} value={launchpad.mainline_goal} onChange={event => updateLaunchpad({ mainline_goal: event.target.value })} placeholder="例如：主角建立自己的阵道宗门，改写旧宗门资源分配" />
    </Form.Item>
    <Form.Item label="长期冲突来源">
      <Input.TextArea rows={2} value={launchpad.long_term_conflict} onChange={event => updateLaunchpad({ long_term_conflict: event.target.value })} placeholder="例如：旧宗门、阵盟、王朝和上古禁制会持续制造压力" />
    </Form.Item>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <Form.Item label="成长 / 升级机制">
        <Input.TextArea rows={3} value={launchpad.growth_engine} onChange={event => updateLaunchpad({ growth_engine: event.target.value })} placeholder="例如：阵盘修复、阵纹解锁、资源经营、境界突破" />
      </Form.Item>
      <Form.Item label="分卷方向">
        <Input.TextArea rows={3} value={launchpad.volume_direction} onChange={event => updateLaunchpad({ volume_direction: event.target.value })} placeholder="例如：外门压迫 -> 内门夺位 -> 王朝阵战 -> 上古阵盟" />
      </Form.Item>
    </div>
    <Form.Item label="可扩展资产池">
      <Input.TextArea rows={3} value={launchpad.expandable_assets} onChange={event => updateLaunchpad({ expandable_assets: event.target.value })} placeholder="可持续扩展的世界、势力、角色、道具、秘境、产业或秘密" />
    </Form.Item>
    <Form.Item label="未来100章准备说明">
      <Input.TextArea rows={2} value={launchpad.future100_note} onChange={event => updateLaunchpad({ future100_note: event.target.value })} placeholder="已有多少章节方向，哪些阶段还需要补骨架" />
    </Form.Item>
    {seed && (
      <Space wrap>
        <Tag color="purple" bordered={false}>分卷 {seed.volume_outlines?.length || 0}</Tag>
        <Tag color="geekblue" bordered={false}>章节细纲 {seed.chapter_outlines?.length || 0}</Tag>
        <Tag color="cyan" bordered={false}>伏笔 {seed.foreshadowing_plan?.length || 0}</Tag>
        <Tag bordered={false}>人物 {seed.characters?.length || 0}</Tag>
      </Space>
    )}
  </Space>
)}
```

- [ ] **Step 8: Add First 30 Chapters step**

Add:

```tsx
{current === 3 && (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Alert type="info" showIcon message="这一页回答：前30章如何完成点击、追读和付费前蓄势。" />
    {seed && (
      <Card size="small" title="AI 种子覆盖" style={{ borderRadius: 8 }}>
        <Space wrap>
          <Tag color={first30Summary.hasOpening ? 'green' : 'gold'} bordered={false}>1-3章 {first30Summary.hasOpening ? '已有' : '待补'}</Tag>
          <Tag color={first30Summary.hasTrialRead ? 'green' : 'gold'} bordered={false}>4-10章 {first30Summary.hasTrialRead ? '已有' : '待补'}</Tag>
          <Tag color={first30Summary.hasPaidBuildup ? 'green' : 'gold'} bordered={false}>11-30章 {first30Summary.hasPaidBuildup ? '已有' : '待补'}</Tag>
          <Tag bordered={false}>细纲 {first30Summary.outlineCount}</Tag>
        </Space>
        {first30Summary.sample.length > 0 && (
          <List size="small" dataSource={first30Summary.sample} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
        )}
      </Card>
    )}
    <Form.Item label="1-3章：开篇钩子与主角承诺">
      <Input.TextArea rows={3} value={launchpad.first30_plan.chapters_1_3} onChange={event => updateFirst30Plan({ chapters_1_3: event.target.value })} placeholder="压迫、异常、金手指、第一次反击或主角承诺" />
    </Form.Item>
    <Form.Item label="4-10章：试读闭环">
      <Input.TextArea rows={3} value={launchpad.first30_plan.chapters_4_10} onChange={event => updateFirst30Plan({ chapters_4_10: event.target.value })} placeholder="小目标、连续冲突、第一次明显爽点回报" />
    </Form.Item>
    <Form.Item label="11-30章：付费前蓄势">
      <Input.TextArea rows={3} value={launchpad.first30_plan.chapters_11_30} onChange={event => updateFirst30Plan({ chapters_11_30: event.target.value })} placeholder="更大危机、长线敌人、卷目标、付费前期待" />
    </Form.Item>
    <Form.Item label="进入工作台后的第一任务">
      <Input value={launchpad.first_writing_task} onChange={event => updateLaunchpad({ first_writing_task: event.target.value })} placeholder="例如：检查第1章场景卡并开始正文" />
    </Form.Item>
  </Space>
)}
```

Add `List` to the Ant Design import if it is not already imported:

```ts
import { Alert, Button, Card, Form, Input, List, Modal, Result, Select, Space, Steps, Tag, Typography, message } from 'antd'
```

- [ ] **Step 9: Replace confirmation screen**

Change confirm render condition to `current === 4` and replace the readiness section with:

```tsx
{current === 4 && (
  <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20 }}>
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>创建预览</h3>
      <Space wrap>
        {[launchpadReadiness.sellable, launchpadReadiness.first30, launchpadReadiness.longform].map(item => (
          <Tag key={item.key} color={item.ready ? 'green' : 'gold'} bordered={false}>
            {item.title} {item.ready ? '可用' : `缺 ${item.missing.length}`}
          </Tag>
        ))}
        {seed && <Tag color="blue" bordered={false}>AI 种子已准备</Tag>}
      </Space>
      <Card size="small" title="核心承诺">
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text strong>{data.title || '-'}</Text>
          <Text>{launchpad.reader_promise || data.synopsis || '尚未填写读者承诺'}</Text>
          <Text type="secondary">{launchpad.core_selling_point || '尚未填写核心卖点'}</Text>
        </Space>
      </Card>
      <Card size="small" title="开写准备">
        <List
          size="small"
          dataSource={[
            `前30章：${launchpadReadiness.first30.ready ? '已有启动结构' : '需要补启动计划'}`,
            `长线承载：${launchpadReadiness.longform.ready ? '已有主线和扩展方向' : '需要补长线结构'}`,
            `下一步：${launchpadReadiness.nextAction}`,
          ]}
          renderItem={(item: string) => <List.Item>{item}</List.Item>}
        />
      </Card>
      {launchpadReadiness.risks.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="创建后仍需补齐"
          description={launchpadReadiness.risks.slice(0, 6).join('；')}
        />
      )}
    </Space>
  </div>
)}
```

Change done condition from `current === 3` to `current === 5`.

- [ ] **Step 10: Validate wizard**

Run:

```bash
cd ui/web && bun test src/components/novel-entry/launchpadModel.test.ts
bun run build:web
```

Expected: tests PASS and web build exits 0.

- [ ] **Step 11: Commit Task 2**

Run:

```bash
git add ui/web/src/components/NovelCreateWizard.tsx ui/web/src/components/novel-entry/launchpadModel.ts ui/web/src/components/novel-entry/launchpadModel.test.ts
git commit -m "feat: reframe novel creation as launchpad"
```

## Task 3: Novel Lobby Model

**Files:**
- Create: `ui/web/src/pages/novel-lobby/novelLobbyModel.ts`
- Create: `ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing tests**

Create `ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildNovelLobbyModel } from './novelLobbyModel'

describe('buildNovelLobbyModel', () => {
  test('returns empty continuation state when there are no projects', () => {
    const model = buildNovelLobbyModel([])

    expect(model.featuredProject).toBeNull()
    expect(model.governanceCards).toEqual([])
    expect(model.projectCards).toEqual([])
  })

  test('prioritizes a seed-rich project as ready to continue planning', () => {
    const projects = [{
      id: 7,
      title: '万古长夜',
      genre: '玄幻',
      length_target: 'epic',
      status: 'draft',
      reference_config: {
        project_seed: {
          reader_promise: '看寒门少年用阵法改写宗门秩序',
          first30_plan: {
            chapters_1_3: '压迫与第一次反击',
            chapters_4_10: '试读闭环',
            chapters_11_30: '付费前大危机',
          },
          mainline_goal: '建立阵道宗门',
          long_term_conflict: '阵盟围剿',
          growth_engine: '阵盘升级',
          volume_direction: '外门到阵盟',
          first_writing_task: '检查第1章场景卡',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.project.id).toBe(7)
    expect(model.featuredProject?.nextAction).toBe('检查第1章场景卡')
    expect(model.projectCards[0].riskTags).toContain('规划可继续')
    expect(model.governanceCards[0].actionLabel).toBe('进入故事规划')
  })

  test('asks sparse draft projects to fill commercial hook first', () => {
    const projects = [{
      id: 8,
      title: '空白新书',
      status: 'draft',
      length_target: 'epic',
      reference_config: { project_seed: {} },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.nextAction).toBe('补商业钩子')
    expect(model.projectCards[0].riskTags).toContain('缺读者承诺')
    expect(model.projectCards[0].riskTags).toContain('缺前30章计划')
    expect(model.projectCards[0].riskTags).toContain('缺长线承载')
  })

  test('uses provided chapter counts to recommend continuing the next chapter', () => {
    const projects = [{
      id: 9,
      title: '已开写项目',
      status: 'active',
      length_target: 'long',
      chapter_count: 41,
      written_words: 123456,
      reference_config: {
        project_seed: {
          reader_promise: '持续升级反杀',
          first30_plan: { chapters_1_3: '开篇', chapters_4_10: '闭环', chapters_11_30: '蓄势' },
          mainline_goal: '夺回家族',
          growth_engine: '血脉升级',
          volume_direction: '家族到王朝',
        },
      },
    }]

    const model = buildNovelLobbyModel(projects)

    expect(model.featuredProject?.chapterCount).toBe(41)
    expect(model.featuredProject?.nextAction).toBe('继续第42章')
    expect(model.featuredProject?.writtenWordsLabel).toBe('12.3万字')
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd ui/web && bun test src/pages/novel-lobby/novelLobbyModel.test.ts
```

Expected: FAIL because `novelLobbyModel.ts` does not exist.

- [ ] **Step 3: Implement lobby model**

Create `ui/web/src/pages/novel-lobby/novelLobbyModel.ts`:

```ts
export interface NovelLobbyProjectCard {
  project: any
  chapterCount: number
  writtenWords: number
  writtenWordsLabel: string
  nextAction: string
  actionKind: 'hook' | 'first30' | 'longform' | 'write' | 'planning'
  riskTags: string[]
  statusLabel: string
}

export interface NovelLobbyGovernanceCard {
  project: any
  title: string
  description: string
  actionLabel: string
  actionKind: NovelLobbyProjectCard['actionKind']
  riskTags: string[]
}

export interface NovelLobbyModel {
  featuredProject: NovelLobbyProjectCard | null
  governanceCards: NovelLobbyGovernanceCard[]
  projectCards: NovelLobbyProjectCard[]
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function trimText(value: any) {
  return String(value || '').trim()
}

function hasText(value: any) {
  return trimText(value).length > 0
}

function getSeed(project: any) {
  return asObject(asObject(project?.reference_config).project_seed)
}

function getChapterCount(project: any) {
  return Math.max(0, Number(project?.chapter_count || project?.chapters_count || project?.chapter_total || 0))
}

function getWrittenWords(project: any) {
  return Math.max(0, Number(project?.written_words || project?.word_count || project?.total_words || 0))
}

function formatWords(words: number) {
  if (!words) return '未统计'
  if (words >= 10000) return `${(words / 10000).toFixed(words >= 100000 ? 1 : 2).replace(/\.0$/, '')}万字`
  return `${words}字`
}

function hasFirst30(seed: any) {
  const first30 = asObject(seed.first30_plan)
  return hasText(first30.chapters_1_3) && hasText(first30.chapters_4_10) && hasText(first30.chapters_11_30)
}

function hasLongform(seed: any, project: any) {
  const target = trimText(project?.length_target)
  const needsLongform = target === 'long' || target === 'epic'
  const baseReady = hasText(seed.mainline_goal) && hasText(seed.growth_engine) && hasText(seed.volume_direction)
  if (!needsLongform) return baseReady
  return baseReady && hasText(seed.long_term_conflict)
}

function buildProjectCard(project: any): NovelLobbyProjectCard {
  const seed = getSeed(project)
  const chapterCount = getChapterCount(project)
  const writtenWords = getWrittenWords(project)
  const riskTags: string[] = []
  if (!hasText(seed.reader_promise)) riskTags.push('缺读者承诺')
  if (!hasFirst30(seed)) riskTags.push('缺前30章计划')
  if (!hasLongform(seed, project)) riskTags.push('缺长线承载')

  let actionKind: NovelLobbyProjectCard['actionKind'] = 'planning'
  let nextAction = trimText(seed.first_writing_task) || '进入故事规划'
  if (!hasText(seed.reader_promise)) {
    actionKind = 'hook'
    nextAction = '补商业钩子'
  } else if (!hasFirst30(seed)) {
    actionKind = 'first30'
    nextAction = '完善前30章启动计划'
  } else if (!hasLongform(seed, project)) {
    actionKind = 'longform'
    nextAction = '补长线承载'
  } else if (chapterCount > 0) {
    actionKind = 'write'
    nextAction = `继续第${chapterCount + 1}章`
  }

  if (riskTags.length === 0) riskTags.push('规划可继续')

  return {
    project,
    chapterCount,
    writtenWords,
    writtenWordsLabel: formatWords(writtenWords),
    nextAction,
    actionKind,
    riskTags,
    statusLabel: trimText(project?.status) || 'draft',
  }
}

function scoreCard(card: NovelLobbyProjectCard) {
  const actionWeight = card.actionKind === 'write' ? 100 : card.actionKind === 'first30' ? 80 : card.actionKind === 'longform' ? 70 : card.actionKind === 'hook' ? 60 : 50
  return actionWeight + card.chapterCount
}

export function buildNovelLobbyModel(projects: any[]): NovelLobbyModel {
  const projectCards = (Array.isArray(projects) ? projects : []).map(buildProjectCard)
  const featuredProject = projectCards.length
    ? [...projectCards].sort((a, b) => scoreCard(b) - scoreCard(a))[0]
    : null
  const governanceCards = projectCards.slice(0, 6).map(card => ({
    project: card.project,
    title: card.project?.title || '未命名项目',
    description: card.riskTags.includes('规划可继续') ? '可以继续进入故事规划或开写下一章。' : card.riskTags.filter(tag => tag !== '规划可继续').slice(0, 2).join('；'),
    actionLabel: card.actionKind === 'write' ? card.nextAction : card.actionKind === 'planning' ? '进入故事规划' : card.nextAction,
    actionKind: card.actionKind,
    riskTags: card.riskTags,
  }))

  return {
    featuredProject,
    governanceCards,
    projectCards,
  }
}
```

- [ ] **Step 4: Run lobby model tests**

Run:

```bash
cd ui/web && bun test src/pages/novel-lobby/novelLobbyModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add focused entry workflow test script**

Modify root `package.json` scripts by adding:

```json
"test:novel-entry": "cd ui/web && bun test src/components/novel-entry/launchpadModel.test.ts src/pages/novel-lobby/novelLobbyModel.test.ts"
```

Add this script alongside the existing `test:planning-workspace` script. Keep all existing scripts unchanged.

- [ ] **Step 6: Run combined entry tests**

Run:

```bash
bun run test:novel-entry
```

Expected: PASS for both new test files.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add ui/web/src/pages/novel-lobby/novelLobbyModel.ts ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts package.json
git commit -m "feat: add novel lobby model"
```

## Task 4: Lobby Dashboard UI

**Files:**
- Create: `ui/web/src/pages/novel-lobby/NovelLobbyDashboard.tsx`
- Modify: `ui/web/src/pages/NovelStudio.tsx`
- Test: `ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts`

- [ ] **Step 1: Create the dashboard component**

Create `ui/web/src/pages/novel-lobby/NovelLobbyDashboard.tsx`:

```tsx
import React, { useMemo } from 'react'
import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, EditOutlined, PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { buildNovelLobbyModel, type NovelLobbyProjectCard } from './novelLobbyModel'

const { Title, Text, Paragraph } = Typography

interface NovelLobbyDashboardProps {
  projects: any[]
  onOpenProject: (projectId: number) => void
  onCreateProject: () => void
}

function getActionIcon(actionKind: NovelLobbyProjectCard['actionKind']) {
  if (actionKind === 'write') return <EditOutlined />
  if (actionKind === 'planning') return <CheckCircleOutlined />
  return <ThunderboltOutlined />
}

export default function NovelLobbyDashboard({ projects, onOpenProject, onCreateProject }: NovelLobbyDashboardProps) {
  const model = useMemo(() => buildNovelLobbyModel(projects), [projects])
  const featured = model.featuredProject

  if (!featured) {
    return (
      <Card style={{ borderRadius: 12, marginBottom: 16 }} bodyStyle={{ padding: 24 }}>
        <Empty description="还没有小说项目">
          <Button type="primary" onClick={onCreateProject}>新建商业长篇</Button>
        </Empty>
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 16 }}>
      <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary">继续写作</Text>
              <Title level={4} style={{ margin: 0 }}>{featured.project.title || '未命名项目'}</Title>
              <Paragraph style={{ marginBottom: 0 }}>
                {featured.nextAction}
              </Paragraph>
              <Space wrap>
                <Tag bordered={false}>{featured.statusLabel}</Tag>
                <Tag bordered={false}>章节 {featured.chapterCount}</Tag>
                <Tag bordered={false}>{featured.writtenWordsLabel}</Tag>
                <Tag bordered={false}>{featured.project.length_target || '未设篇幅'}</Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Button type="primary" block icon={<PlayCircleOutlined />} onClick={() => onOpenProject(featured.project.id)}>
                {featured.nextAction}
              </Button>
              <Button block onClick={onCreateProject}>新建商业长篇</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="下一步治理" style={{ borderRadius: 12 }}>
        <Row gutter={12}>
          {model.governanceCards.slice(0, 3).map(card => (
            <Col xs={24} md={8} key={card.project.id} style={{ marginBottom: 12 }}>
              <Card size="small" style={{ height: '100%', borderRadius: 10 }} bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text strong>{card.title}</Text>
                <Text type="secondary" style={{ minHeight: 40 }}>{card.description}</Text>
                <Space wrap>
                  {card.riskTags.slice(0, 3).map(tag => (
                    <Tag key={tag} color={tag === '规划可继续' ? 'green' : 'gold'} bordered={false}>{tag}</Tag>
                  ))}
                </Space>
                <Button style={{ marginTop: 'auto' }} icon={getActionIcon(card.actionKind)} onClick={() => onOpenProject(card.project.id)}>
                  {card.actionLabel}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </Space>
  )
}
```

- [ ] **Step 2: Integrate dashboard into NovelStudio**

In `ui/web/src/pages/NovelStudio.tsx`, add import:

```ts
import NovelLobbyDashboard from './novel-lobby/NovelLobbyDashboard'
```

Add the dashboard before the "项目检索" card:

```tsx
<NovelLobbyDashboard
  projects={projects}
  onOpenProject={(projectId) => navigate(`/novel/workspace/${projectId}`)}
  onCreateProject={() => setWizardOpen(true)}
/>
```

Keep the existing search card and project grid after this dashboard.

- [ ] **Step 3: Adjust lobby title and primary button text**

In the header area of `NovelStudio.tsx`, change:

```tsx
<Title level={3} style={{ margin: 0 }}>小说项目大厅</Title>
<Text type="secondary">先选项目，再进入单项目工作台继续写作。</Text>
```

to:

```tsx
<Title level={3} style={{ margin: 0 }}>小说创作大厅</Title>
<Text type="secondary">优先继续写作和处理治理提醒，项目列表用于管理所有作品。</Text>
```

Change the primary button text:

```tsx
新建商业长篇
```

- [ ] **Step 4: Improve project card status signals**

Import the model in `NovelStudio.tsx`:

```ts
import { buildNovelLobbyModel } from './novel-lobby/novelLobbyModel'
```

Add after `stats`:

```ts
const lobbyModel = useMemo(() => buildNovelLobbyModel(projects), [projects])
const projectCardById = useMemo(() => new Map(lobbyModel.projectCards.map(card => [card.project.id, card])), [lobbyModel.projectCards])
```

Inside the existing project card render, add after the genre text:

```tsx
{projectCardById.get(project.id) && (
  <Space wrap size={4}>
    {projectCardById.get(project.id)!.riskTags.slice(0, 3).map(tag => (
      <Tag key={tag} color={tag === '规划可继续' ? 'green' : 'gold'} bordered={false}>{tag}</Tag>
    ))}
  </Space>
)}
```

Change the bottom secondary text:

```tsx
<Text type="secondary" style={{ fontSize: 12 }}>{projectCardById.get(project.id)?.nextAction || '点击进入工作台'}</Text>
```

- [ ] **Step 5: Validate lobby UI**

Run:

```bash
cd ui/web && bun test src/pages/novel-lobby/novelLobbyModel.test.ts
bun run build:web
```

Expected: tests PASS and web build exits 0.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add ui/web/src/pages/NovelStudio.tsx ui/web/src/pages/novel-lobby/NovelLobbyDashboard.tsx ui/web/src/pages/novel-lobby/novelLobbyModel.ts ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts
git commit -m "feat: add novel lobby continuation dashboard"
```

## Task 5: Final Verification And Progress Log

**Files:**
- Modify: `docs/novel-roadmap-009-progress-log.md`

- [ ] **Step 1: Run full verification**

Run:

```bash
bun run test:novel-entry
bun run build:web
bun run build:server
bun run smoke:novel:local
git diff --check
```

Expected:

- `test:novel-entry` exits 0.
- `build:web` exits 0.
- `build:server` exits 0.
- `smoke:novel:local` exits 0 and includes `"ok": true`.
- `git diff --check` exits 0.

- [ ] **Step 2: Update progress log**

Append this section to `docs/novel-roadmap-009-progress-log.md` before `## 记录原则`:

```md
## 2026-05-22 - 新书启动台与创作大厅

- 将新建小说引导从通用项目信息改为商业长篇启动台，覆盖创作目标、商业钩子、长线承载、前30章启动计划和创建风险确认。
- 新增创建启动台模型，统一处理 AI 种子字段提取、前30章覆盖摘要、长线承载风险和创建 payload 扩展。
- 将小说大厅第一屏改为继续写作与下一步治理优先，项目列表保留为管理层。
- 新增大厅模型，基于现有项目和项目种子推断下一步动作、治理标签和项目卡状态。

### 验证结果
- `bun run test:novel-entry` 已通过
- `bun run build:web` 已通过
- `bun run build:server` 已通过
- `bun run smoke:novel:local` 已通过
- `git diff --check` 已通过
```

- [ ] **Step 3: Commit progress log**

Run:

```bash
git add docs/novel-roadmap-009-progress-log.md package.json ui/web/src/components/NovelCreateWizard.tsx ui/web/src/components/novel-entry/launchpadModel.ts ui/web/src/components/novel-entry/launchpadModel.test.ts ui/web/src/pages/NovelStudio.tsx ui/web/src/pages/novel-lobby/NovelLobbyDashboard.tsx ui/web/src/pages/novel-lobby/novelLobbyModel.ts ui/web/src/pages/novel-lobby/novelLobbyModel.test.ts
git commit -m "docs: record novel entry workflow update"
```

- [ ] **Step 4: Final status**

Run:

```bash
git status --branch --short
```

Expected: branch is ahead by the implementation commits and has no unstaged or untracked source changes except ignored `.superpowers/`.

## Self-Review

Spec coverage:

- New commercial long-form launchpad: covered by Tasks 1 and 2.
- Launchpad fields stored in `reference_config.project_seed`: covered by Task 2 Step 3.
- AI seed prefill behavior: covered by Task 1 tests and Task 2 Step 2.
- Confirmation readiness and missing risks: covered by Task 1 tests and Task 2 Step 9.
- Continue Writing section: covered by Task 4.
- Next Governance section: covered by Task 4.
- Project list lowered but retained: covered by Task 4 Steps 2-4.
- No backend summary endpoint in this phase: maintained by all tasks.

Type consistency:

- `LaunchpadFields`, `First30PlanFields`, and readiness types are defined in Task 1 and imported in Task 2.
- `NovelLobbyProjectCard` and action kinds are defined in Task 3 and imported in Task 4.
- Test script names match `package.json` additions.

Verification coverage:

- Pure model tests cover the decision logic.
- `build:web` covers React and TypeScript integration.
- `build:server` confirms frontend payload changes did not require server compilation changes.
- `smoke:novel:local` confirms existing project creation and novel workflow behavior still works.
