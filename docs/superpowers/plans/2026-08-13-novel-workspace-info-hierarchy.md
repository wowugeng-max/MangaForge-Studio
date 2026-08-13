# 小说工作台信息层级重构(第 1 批)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 章节写作头部收敛为"单一主行动 + 一行状态 + 详情 popover",交付芯片与质检面板摘要化,步骤条轻量化。

**Architecture:** 渲染层贯彻既有 `chapter-workflow-presenter.ts` 的单一 `primaryAction`。新增纯函数模块 `chapter-header-status.ts` 统一推导状态行与详情项,组件只做渲染。不改后端、不改 presenter 决策逻辑。

**Tech Stack:** React + Ant Design(Dropdown/Popover/Tag)、bun test、既有 `novel-tokens.css` 变量。

**背景(现状问题定位):**
- `WorkspaceCenter.tsx:648-676` 向 `ChapterActionBar` 塞入 `statusTags`(已写/未写、材料%)、`wordCountLabel`、`saveStatusLabel`、`detailsSummary`(可写/待补/待质检/交稿),加上 presenter 阶段 Tag,同屏 6+ 个徽章。其中"已写/未写"与 presenter `phaseLabel` 语义重复。
- `workspace-center-chapter-action-bar.tsx:191-200` 内联渲染 2 个次级按钮,加 trailing 里的章长控制、显示设置、"更多"popover,按钮 5+ 个。
- `workspace-center-delivery-status-chips.tsx`(621 行)展开态平铺大量信息芯片。
- `workspace-center-quality-revision-panel.tsx` 无摘要折叠态。

---

### Task 1: 章节头状态模型 `chapter-header-status.ts`

**Files:**
- Create: `ui/web/src/pages/novel-workspace/chapter-header-status.ts`
- Test: `ui/web/src/pages/novel-workspace/chapter-header-status.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// chapter-header-status.test.ts
import { describe, expect, test } from 'bun:test'
import { buildChapterHeaderStatus } from './chapter-header-status'

describe('buildChapterHeaderStatus', () => {
  test('状态行只含阶段/字数/保存点,无重复的已写未写', () => {
    const status = buildChapterHeaderStatus({
      phase: 'written_unchecked',
      phaseLabel: '已写待复检',
      wordCount: 3204,
      wordTarget: 4000,
      saveStatus: 'saved',
    })
    expect(status.phaseLabel).toBe('已写待复检')
    expect(status.phaseTone).toBe('blue')
    expect(status.wordLabel).toBe('3,204 / 4,000 字')
    expect(status.saveDot).toBe('saved')
  })

  test('无目标字数时只显示当前字数', () => {
    const status = buildChapterHeaderStatus({ phase: 'empty', phaseLabel: '未写', wordCount: 0 })
    expect(status.wordLabel).toBe('0 字')
  })

  test('阶段色调映射', () => {
    expect(buildChapterHeaderStatus({ phase: 'ready_next', phaseLabel: 'x' }).phaseTone).toBe('green')
    expect(buildChapterHeaderStatus({ phase: 'failed_admission', phaseLabel: 'x' }).phaseTone).toBe('red')
    expect(buildChapterHeaderStatus({ phase: 'blocked_materials', phaseLabel: 'x' }).phaseTone).toBe('red')
    expect(buildChapterHeaderStatus({ phase: 'needs_revision', phaseLabel: 'x' }).phaseTone).toBe('gold')
    expect(buildChapterHeaderStatus({ phase: 'needs_state_sync', phaseLabel: 'x' }).phaseTone).toBe('gold')
  })

  test('详情项聚合材料/队列/交稿,空值不产出', () => {
    const status = buildChapterHeaderStatus({
      phase: 'empty',
      phaseLabel: '未写',
      material: { score: 72, canGenerate: false, recommendations: ['补世界观', '补人物'] },
      queue: { readyCount: 3, blockedCount: 1, draftedCount: 0 },
      delivery: { statusLabel: '需复检' },
    })
    expect(status.detailItems.map(item => item.key)).toEqual(['material', 'queue-ready', 'queue-blocked', 'delivery'])
    expect(status.detailItems[0]).toMatchObject({ label: '材料 72%', tone: 'warning', tooltip: '补世界观；补人物' })
    expect(status.detailItems[1].label).toBe('可写 3')
    expect(status.detailItems[2].label).toBe('待补 1')
    expect(status.detailItems[3].label).toBe('交稿 需复检')
  })

  test('无任何详情来源时 detailItems 为空', () => {
    expect(buildChapterHeaderStatus({ phase: 'empty', phaseLabel: '未写' }).detailItems).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd ui/web && bun test src/pages/novel-workspace/chapter-header-status.test.ts`
Expected: FAIL(模块不存在)

- [ ] **Step 3: 最小实现**

```ts
// chapter-header-status.ts
/** 章节头部状态行与详情 popover 的纯推导模型,渲染层不做任何判断。 */
import type { ChapterWorkflowPhase } from './chapter-workflow-presenter'

export type ChapterHeaderStatusInput = {
  phase: ChapterWorkflowPhase
  phaseLabel: string
  wordCount?: number
  wordTarget?: number
  saveStatus?: 'saved' | 'saving' | 'error' | null
  material?: { score?: number | null; canGenerate?: boolean; recommendations?: string[] } | null
  queue?: { readyCount?: number; blockedCount?: number; draftedCount?: number } | null
  delivery?: { statusLabel?: string } | null
}

export type ChapterHeaderDetailItem = {
  key: string
  label: string
  tooltip?: string
  tone?: 'ok' | 'warning' | 'danger' | 'neutral'
}

export type ChapterHeaderStatus = {
  phaseLabel: string
  phaseTone: 'green' | 'red' | 'gold' | 'blue'
  wordLabel: string
  saveDot: 'saved' | 'saving' | 'error' | null
  detailItems: ChapterHeaderDetailItem[]
}

const PHASE_TONES: Record<ChapterWorkflowPhase, ChapterHeaderStatus['phaseTone']> = {
  empty: 'blue',
  blocked_materials: 'red',
  writing: 'blue',
  written_unchecked: 'blue',
  needs_revision: 'gold',
  needs_state_sync: 'gold',
  ready_next: 'green',
  failed_admission: 'red',
}

function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

function materialTone(input: NonNullable<ChapterHeaderStatusInput['material']>): ChapterHeaderDetailItem['tone'] {
  if (input.canGenerate) return 'ok'
  return Number(input.score || 0) >= 65 ? 'warning' : 'danger'
}

export function buildChapterHeaderStatus(input: ChapterHeaderStatusInput): ChapterHeaderStatus {
  const wordCount = Math.max(0, Number(input.wordCount || 0))
  const wordTarget = Number(input.wordTarget || 0)
  const wordLabel = wordTarget > 0
    ? `${formatCount(wordCount)} / ${formatCount(wordTarget)} 字`
    : `${formatCount(wordCount)} 字`

  const detailItems: ChapterHeaderDetailItem[] = []
  if (input.material && input.material.score != null) {
    detailItems.push({
      key: 'material',
      label: `材料 ${input.material.score}%`,
      tone: materialTone(input.material),
      tooltip: (input.material.recommendations || []).slice(0, 4).join('；') || undefined,
    })
  }
  const queue = input.queue
  if (queue) {
    if (Number(queue.readyCount || 0) > 0) detailItems.push({ key: 'queue-ready', label: `可写 ${queue.readyCount}`, tone: 'ok' })
    if (Number(queue.blockedCount || 0) > 0) detailItems.push({ key: 'queue-blocked', label: `待补 ${queue.blockedCount}`, tone: 'warning' })
    if (Number(queue.draftedCount || 0) > 0) detailItems.push({ key: 'queue-drafted', label: `待质检 ${queue.draftedCount}`, tone: 'neutral' })
  }
  if (input.delivery?.statusLabel) {
    detailItems.push({ key: 'delivery', label: `交稿 ${input.delivery.statusLabel}`, tone: 'neutral' })
  }

  return {
    phaseLabel: input.phaseLabel,
    phaseTone: PHASE_TONES[input.phase] ?? 'blue',
    wordLabel,
    saveDot: input.saveStatus ?? null,
    detailItems,
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd ui/web && bun test src/pages/novel-workspace/chapter-header-status.test.ts`
Expected: PASS(5 tests)

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/chapter-header-status.ts ui/web/src/pages/novel-workspace/chapter-header-status.test.ts
git commit -m "feat(novel-ui): add chapter header status model"
```

---

### Task 2: ChapterActionBar 收敛为单主行动 + 状态行 + 详情 popover

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-chapter-action-bar.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`(如有断言旧结构则同步更新)

**行为规格:**
1. 动作区只渲染 1 个主按钮(既有 `presenter.primaryAction`)+ 1 个 `Dropdown`(菜单项 = `presenter.secondaryActions` 全量 + 调用方通过新 prop `extraMenuItems` 注入的项)。删除 `secondaryActions.slice(0, 2)` 的内联按钮渲染(现 191-200 行)。
2. 组件新增 props:`headerStatus: ChapterHeaderStatus`(Task 1 类型)、`extraMenuItems?: MenuProps['items']`;删除 props:`statusTags`、`wordCountLabel`、`saveStatusLabel`、`detailsSummary`。
3. 标签行替换为状态行:`阶段 pill(headerStatus.phaseTone/phaseLabel) + wordLabel 文本 + saveDot 小圆点(saved 绿/saving 灰脉冲/error 红,Tooltip 显示文案)`。
4. `headerStatus.detailItems` 非空时,状态行尾部渲染"详情"文字按钮,点击弹 `Popover`,内部逐行列出 detailItems(tone 映射 Tag 颜色:ok→green/warning→gold/danger→red/neutral→default)。原 `detailsOpen/onToggleDetails` 的"展开详情"辅助面板开关保留,但移入 Dropdown 菜单(菜单项"展开辅助面板/收起辅助面板")。
5. `trailing` prop 保留(沉浸模式"辅助"按钮仍从调用方注入)。

- [ ] **Step 1: 改组件**(按上述规格改 `workspace-center-chapter-action-bar.tsx`;Dropdown 用 antd `Dropdown` + `MenuProps`,菜单项点击复用现有 `run(key)` 分发)
- [ ] **Step 2: 类型检查定位所有调用点报错**

Run: `cd ui/web && bunx tsc --noEmit 2>&1 | grep -E 'chapter-action-bar|WorkspaceCenter'`
Expected: `WorkspaceCenter.tsx` 报缺失/多余 props(Task 3 修复);无其他文件报错

- [ ] **Step 3: 更新/运行 UI shell 测试**

Run: `cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`
Expected: PASS(如断言了 statusTags 结构,改为断言 headerStatus 渲染)

- [ ] **Step 4: Commit**(与 Task 3 一起提交,见 Task 3 Step 5)

---

### Task 3: WorkspaceCenter 调用点接入新模型

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx:636-720`(ChapterActionBar 调用点)

**行为规格:**
1. 用 `buildChapterHeaderStatus` 组装 `headerStatus`:`phase/phaseLabel` 取自 `chapterWorkflow`;`wordCount` = `chapterWordCount(activeChapter)`;`wordTarget` = 现章长预设推导的目标字数(既有 `renderWordTargetControl` 的数据源);`saveStatus` = 既有 `saveStatus`;`material` = `materialScore`;`queue` = `writingQueue`;`delivery` = `deliverySummary`。
2. 删除传入的 `statusTags`、`wordCountLabel`、`saveStatusLabel`、`detailsSummary`。
3. `extraMenuItems` 注入:章长预设(原 `renderWordTargetControl`,改为子菜单或菜单内嵌控件)、显示设置(原 `EditorDisplayControls` 入口)、原 `secondaryActionMenu` popover 里的项(合并去重,presenter 已含的动作不重复)。删除 trailing 里的"更多"Popover 与 `EditorDisplayControls`、`renderWordTargetControl`;trailing 仅保留沉浸模式"辅助"。
4. "已写/未写" statusTag 直接删除(与 phaseLabel 重复)。

- [ ] **Step 1: 按规格改调用点**
- [ ] **Step 2: 类型检查通过**

Run: `cd ui/web && bunx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: 相关测试全绿**

Run: `cd ui/web && bun test src/pages/novel-workspace/chapter-workflow-presenter.test.ts src/pages/novel-workspace/chapter-header-status.test.ts src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`
Expected: PASS

- [ ] **Step 4: 构建验证**

Run: `bun run build:web`(项目根目录)
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspace-center-chapter-action-bar.tsx ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts
git commit -m "feat(novel-ui): converge chapter header to single primary action"
```

---

### Task 4: 交付状态芯片收敛为摘要 + popover

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-delivery-status-chips.tsx`
- Modify: 其调用点(`rg "WorkspaceDeliveryStatusChips" ui/web/src` 确认)

**行为规格:**
1. `WorkspaceDeliveryStatusChips` 增加 `mode?: 'summary' | 'full'`(默认 `'full'`,保持向后兼容)。
2. `summary` 模式:只渲染 1 个芯片 `交稿 {deliverySummary.statusLabel} · {异常项数}项需关注`,tone 取最严重项;点击弹 Popover,内容复用现有 full 渲染(把现有 JSX 抽成内部 `DeliveryChipsBody` 组件,summary/full 共用)。
3. 写作中心默认视图调用处改为 `mode="summary"`;辅助面板/详情区维持 full。

- [ ] **Step 1: 抽 `DeliveryChipsBody`,加 summary 模式**
- [ ] **Step 2: 调用点切换 + `bunx tsc --noEmit` 通过**
- [ ] **Step 3: `bun run build:web` 通过**
- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspace-center-delivery-status-chips.tsx ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx
git commit -m "feat(novel-ui): collapse delivery status chips to summary chip"
```

---

### Task 5: 质检修订面板摘要折叠态

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`(`WorkspaceCenterQualityRevisionPanel`,262 行起)
- Test: `ui/web/src/pages/novel-workspace/quality-revision-summary.test.ts`(新建,测纯推导)

**行为规格:**
1. 新增纯函数 `buildQualityRevisionSummary(report, revisionTask)` → `{ scoreLabel, issueCount, staleWarning: boolean, primaryActionLabel }`,放在同文件顶部导出。
2. 面板默认折叠:单行显示 `分数 · N 个问题 · [主修复动作按钮] · (过期警示图标,如 staleWarning)`,行尾"展开"切换到现有完整内容。折叠状态存 localStorage key `novel_quality_panel_collapsed`,默认折叠。
3. 当 presenter `panelToOpen === 'quality'` 被触发(用户点"查看问题"等)时自动展开——通过既有打开质检面板的回调将 collapsed 置 false。

- [ ] **Step 1: 写 `buildQualityRevisionSummary` 失败测试**(有报告有问题 / 无报告 / 报告过期三个用例,断言 scoreLabel、issueCount、staleWarning)
- [ ] **Step 2: 实现纯函数,测试通过**

Run: `cd ui/web && bun test src/pages/novel-workspace/quality-revision-summary.test.ts`
Expected: PASS

- [ ] **Step 3: 面板加折叠态渲染 + localStorage 持久化**
- [ ] **Step 4: `bunx tsc --noEmit` + `bun run build:web` 通过**
- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx ui/web/src/pages/novel-workspace/quality-revision-summary.test.ts
git commit -m "feat(novel-ui): collapsed summary state for quality revision panel"
```

---

### Task 6: 工作流步骤条轻量化

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-chapter-action-bar.tsx:236-250`(steps 渲染)
- Modify: `ui/web/src/pages/novel-workspace/WorkspaceCenter.css`(`.chapter-action-bar-step*` 段)

**行为规格:**
1. 步骤条视觉降权:字号降至 11px、去背景块,已完成项用 `✓` 前缀淡绿、当前项加下划线强调、未到达项 45% 透明度。整条高度 ≤ 20px。
2. markup 不变(仍是 5 个 `div.chapter-action-bar-step`),只调 class 内样式,保持既有 title tooltip。

- [ ] **Step 1: 调整 CSS**
- [ ] **Step 2: `bun run build:web` 通过**
- [ ] **Step 3: Commit**

```bash
git add ui/web/src/pages/novel-workspace/WorkspaceCenter.css ui/web/src/pages/novel-workspace/workspace-center-chapter-action-bar.tsx
git commit -m "style(novel-ui): lighten chapter workflow step strip"
```

---

## 验收核对(对照 spec)

- [ ] 默认视图章节头可点击元素 ≤ 5:主按钮、次级 Dropdown、详情 popover 入口、步骤条(展示性)、(沉浸模式)辅助按钮。
- [ ] 任意阶段主按钮文案 = presenter `primaryAction.label`(由 presenter 单测保障,渲染层无覆写)。
- [ ] `bun run build:web` 通过;`ui/web` novel-workspace 相关测试全绿。
