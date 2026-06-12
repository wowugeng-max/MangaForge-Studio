# Creative Assistance Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an author-led creative assistance workflow that provides structured suggestions for prose review, next chapters, outline expansion, foreshadowing, character arcs, system design, and research cards inside the existing novel workspace.

**Architecture:** Add a backend creative-assist route that reuses project/chapter/context/review data and stores assistance sessions as `creative_assist` reviews. Add a pure frontend model plus a `CreativeAssistantPanel` that renders mode tabs and suggestion cards, then integrate it into `NovelProjectWorkspace` as a visible author-controlled assistant entry.

**Tech Stack:** Bun test/build, Express routes, existing novel store/review persistence, React 18, Ant Design 5, existing `apiClient`, existing workspace CSS and source-string shell tests.

---

## File Structure

- Create `ui/server/src/routes/novel-creative-assist-routes.ts`: route registration, mode validation, context loading, fallback card generation, LLM prompt/result normalization, review persistence.
- Create `ui/server/src/routes/novel-creative-assist-routes.test.ts`: backend route/service tests with an Express app and injected fake dependencies.
- Modify `ui/server/src/routes/novel.ts`: register the creative-assist route with `getWorkspace`, `getProject`, `writingService.buildChapterContextPackage`, and reference service access.
- Create `ui/web/src/pages/novel-workspace/creativeAssistantModel.ts`: mode definitions, context chips, fallback cards, backend result normalization.
- Create `ui/web/src/pages/novel-workspace/creativeAssistantModel.test.ts`: pure model tests.
- Create `ui/web/src/pages/novel-workspace/CreativeAssistantPanel.tsx`: assistance drawer/panel UI.
- Create `ui/web/src/pages/novel-workspace/CreativeAssistantPanel.css`: scoped panel and card styling.
- Modify `ui/web/src/pages/NovelProjectWorkspace.tsx`: state, route call, open command, panel render, refresh after saved review.
- Modify `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`: source assertions for shell integration.
- Modify `docs/novel-usage-guide.md`: document how authors use `创作参谋`.

## Task 1: Backend Creative Assist Route

**Files:**
- Create: `ui/server/src/routes/novel-creative-assist-routes.test.ts`
- Create: `ui/server/src/routes/novel-creative-assist-routes.ts`
- Modify: `ui/server/src/routes/novel.ts`

- [ ] **Step 1: Write failing backend tests**

Add tests that prove unknown modes are rejected, valid modes return cards, chapter context is used, and save creates a `creative_assist` review:

```ts
import { describe, expect, test } from 'bun:test'
import { registerNovelCreativeAssistRoutes } from './novel-creative-assist-routes'

describe('novel creative assist routes', () => {
  function createRouteHarness() {
    const handlers = new Map<string, any>()
    const app = {
      post: (path: string, handler: any) => {
        handlers.set(path, handler)
        return app
      },
    }
    return { app, handlers }
  }

  async function callHandler(handler: any, body: any) {
    const res: any = {
      statusCode: 200,
      body: null,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(body: any) {
        this.body = body
        return this
      },
    }
    await handler({ params: { id: '1' }, body }, res)
    return res
  }

  function harnessWith(overrides: any = {}) {
    const { app, handlers } = createRouteHarness()
    const savedReviews: any[] = []
    registerNovelCreativeAssistRoutes(app as any, {
      getWorkspace: () => '/tmp/workspace',
      getProject: async () => ({ id: 1, title: '规则夜航', genre: '无限流', reference_config: { writing_bible: { promise: '规则压力与破局爽点' } } }),
      listChapters: async () => [{ id: 10, project_id: 1, chapter_no: 1, title: '第一夜', chapter_text: '门上的规则开始流血。', ending_hook: '第二条规则被撕掉。' }],
      listWorldbuilding: async () => [],
      listCharacters: async () => [{ id: 2, name: '林昼', role: '主角', current_state: { identity: '新手闯关者' } }],
      listOutlines: async () => [{ id: 3, title: '前十章', summary: '规则逐步升级' }],
      listReviews: async () => [],
      createReview: async (_workspace: string, record: any) => {
        savedReviews.push(record)
        return { id: savedReviews.length, ...record }
      },
      buildChapterContextPackage: async () => ({ chapter_target: { chapter_no: 1, title: '第一夜', ending_hook: '第二条规则被撕掉。' }, writing_bible: { promise: '规则压力与破局爽点' } }),
      executeNovelAgent: overrides.executeNovelAgent,
      fetchResearchText: overrides.fetchResearchText,
    })
    const handler = handlers.get('/api/novel/projects/:id/creative-assist')
    if (!handler) throw new Error('creative assist route not registered')
    return { handler, savedReviews }
  }

  test('rejects unknown mode', async () => {
    const { handler } = harnessWith()
    const res = await callHandler(handler, { mode: 'bad_mode' })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('unsupported creative assist mode')
  })

  test('returns fallback cards for next chapter assistance', async () => {
    const { handler } = harnessWith()
    const res = await callHandler(handler, { mode: 'next_chapter', chapter_id: 10, save: false })
    expect(res.statusCode).toBe(200)
    expect(res.body.assist.mode).toBe('next_chapter')
    expect(res.body.assist.cards.length).toBeGreaterThan(0)
    expect(res.body.assist.context_status).toContain('chapter_context_ready')
  })

  test('persists creative assist review when save is true', async () => {
    const { handler, savedReviews } = harnessWith()
    const res = await callHandler(handler, { mode: 'prose_review', chapter_id: 10, save: true })
    expect(res.statusCode).toBe(200)
    expect(savedReviews).toHaveLength(1)
    expect(savedReviews[0].review_type).toBe('creative_assist')
    expect(savedReviews[0].payload).toContain('"mode":"prose_review"')
  })

  test('returns research warning when URL fetch fails', async () => {
    const { handler } = harnessWith({ fetchResearchText: async () => { throw new Error('network blocked') } })
    const res = await callHandler(handler, { mode: 'research_cards', research_query: 'https://example.com', save: false })
    expect(res.statusCode).toBe(200)
    expect(res.body.assist.warnings.join(' ')).toContain('network blocked')
    expect(res.body.assist.cards.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run backend tests to verify RED**

Run:

```bash
cd ui/server && bun test src/routes/novel-creative-assist-routes.test.ts
```

Expected: fail because `novel-creative-assist-routes.ts` does not exist.

- [ ] **Step 3: Implement route and helpers**

Create the route module with:

```ts
export const CREATIVE_ASSIST_MODES = ['prose_review', 'next_chapter', 'outline_expand', 'foreshadowing', 'character_arc', 'system_design', 'research_cards'] as const

export type CreativeAssistMode = typeof CREATIVE_ASSIST_MODES[number]

export function isCreativeAssistMode(value: unknown): value is CreativeAssistMode {
  return CREATIVE_ASSIST_MODES.includes(String(value || '') as CreativeAssistMode)
}
```

Implement `registerNovelCreativeAssistRoutes(app, ctx)` so `POST /api/novel/projects/:id/creative-assist`:

```ts
const mode = String(req.body?.mode || 'prose_review')
if (!isCreativeAssistMode(mode)) return res.status(400).json({ error: `unsupported creative assist mode: ${mode}` })
```

Load project, chapters, worldbuilding, characters, outlines, reviews, optional chapter, optional context package, optional research text, and build fallback cards when no valid LLM JSON is available. Save with:

```ts
const saved = await ctx.createReview(activeWorkspace, {
  project_id: project.id,
  review_type: 'creative_assist',
  status: assist.warnings.length ? 'warn' : 'ok',
  summary: assist.summary,
  issues: assist.cards.slice(0, 6).map(card => card.risk || card.reason || card.title).filter(Boolean),
  payload: JSON.stringify({ request: { mode, chapter_id: chapter?.id || null, question, research_query: researchQuery }, assist }),
})
```

- [ ] **Step 4: Register the route**

Modify `ui/server/src/routes/novel.ts`:

```ts
import { registerNovelCreativeAssistRoutes } from './novel-creative-assist-routes'
```

Then register after `registerNovelCommercialOpsRoutes`:

```ts
registerNovelCreativeAssistRoutes(app, {
  getWorkspace,
  getProject,
  buildChapterContextPackage: writingService.buildChapterContextPackage,
})
```

The route module should use default imports from `../novel` for list/create functions when ctx does not inject them, so the registration stays small.

- [ ] **Step 5: Run backend tests to verify GREEN**

Run:

```bash
cd ui/server && bun test src/routes/novel-creative-assist-routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit backend route**

```bash
git add ui/server/src/routes/novel-creative-assist-routes.ts ui/server/src/routes/novel-creative-assist-routes.test.ts ui/server/src/routes/novel.ts
git commit -m "feat: add novel creative assist route"
```

## Task 2: Frontend Creative Assistant Model

**Files:**
- Create: `ui/web/src/pages/novel-workspace/creativeAssistantModel.test.ts`
- Create: `ui/web/src/pages/novel-workspace/creativeAssistantModel.ts`

- [ ] **Step 1: Write failing model tests**

```ts
import { describe, expect, test } from 'bun:test'
import {
  CREATIVE_ASSISTANT_MODES,
  buildCreativeAssistantContextChips,
  buildCreativeAssistantFallbackCards,
  normalizeCreativeAssistPayload,
} from './creativeAssistantModel'

describe('creativeAssistantModel', () => {
  test('defines all author assistance modes', () => {
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.key)).toEqual([
      'prose_review',
      'next_chapter',
      'outline_expand',
      'foreshadowing',
      'character_arc',
      'system_design',
      'research_cards',
    ])
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('正文评析')
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('联网资料')
  })

  test('builds fallback cards for every mode', () => {
    for (const mode of CREATIVE_ASSISTANT_MODES) {
      const cards = buildCreativeAssistantFallbackCards(mode.key, {
        project: { title: '规则夜航', reference_config: { writing_bible: { promise: '规则压力' } } },
        activeChapter: { chapter_no: 1, title: '第一夜', chapter_text: '门上的规则开始流血。', ending_hook: '第二条规则被撕掉。' },
        characters: [{ name: '林昼' }],
        outlines: [{ title: '前十章' }],
        reviews: [],
      })
      expect(cards.length).toBeGreaterThan(0)
      expect(cards[0].id).toContain(mode.key)
    }
  })

  test('builds context chips from workspace state', () => {
    const chips = buildCreativeAssistantContextChips({
      activeChapter: { id: 1 },
      selectedText: '一段正文',
      project: { reference_config: { writing_bible: { promise: '承诺' }, references: [{ project_title: '样本' }] } },
      contextPackage: { ok: true },
      reviews: [{ review_type: 'prose_quality' }],
    })
    expect(chips.map(chip => chip.label)).toEqual(['当前章', '选中文本', '写作圣经', '上下文包', '质检', '参考'])
  })

  test('normalizes backend cards with stable ids', () => {
    const normalized = normalizeCreativeAssistPayload({
      mode: 'prose_review',
      summary: '可加强开篇',
      cards: [{ title: '加强规则压力', suggestion: '先写违规后果' }],
    })
    expect(normalized.cards[0].id).toBe('prose_review-card-1')
    expect(normalized.cards[0].action).toBe('copy')
  })
})
```

- [ ] **Step 2: Run model tests to verify RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/creativeAssistantModel.test.ts
```

Expected: fail because `creativeAssistantModel.ts` does not exist.

- [ ] **Step 3: Implement model**

Create exported types:

```ts
export type CreativeAssistantModeKey = 'prose_review' | 'next_chapter' | 'outline_expand' | 'foreshadowing' | 'character_arc' | 'system_design' | 'research_cards'

export type CreativeAssistCard = {
  id: string
  type: string
  title: string
  intent: string
  reason: string
  suggestion: string
  risk: string
  applies_to: string
  action: string
}
```

Implement:

```ts
export const CREATIVE_ASSISTANT_MODES = [
  { key: 'prose_review', label: '正文评析' },
  { key: 'next_chapter', label: '下一章' },
  { key: 'outline_expand', label: '后续大纲' },
  { key: 'foreshadowing', label: '伏笔' },
  { key: 'character_arc', label: '人物剧情' },
  { key: 'system_design', label: '能力物品' },
  { key: 'research_cards', label: '联网资料' },
] as const
```

Add concrete fallback card templates for each mode. Use project/chapter values where present and default to author-safe wording when missing.

- [ ] **Step 4: Run model tests to verify GREEN**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/creativeAssistantModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit frontend model**

```bash
git add ui/web/src/pages/novel-workspace/creativeAssistantModel.ts ui/web/src/pages/novel-workspace/creativeAssistantModel.test.ts
git commit -m "feat: add creative assistant model"
```

## Task 3: Creative Assistant Panel UI

**Files:**
- Create: `ui/web/src/pages/novel-workspace/CreativeAssistantPanel.tsx`
- Create: `ui/web/src/pages/novel-workspace/CreativeAssistantPanel.css`
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] **Step 1: Write failing UI shell assertions**

Append a test:

```ts
test('shows the creative assistant panel shell', () => {
  const projectWorkspace = source('../NovelProjectWorkspace.tsx')
  const panel = source('CreativeAssistantPanel.tsx')
  const css = source('CreativeAssistantPanel.css')

  expect(projectWorkspace).toContain('CreativeAssistantPanel')
  expect(projectWorkspace).toContain('创作参谋')
  expect(projectWorkspace).toContain('/creative-assist')
  expect(panel).toContain('正文评析')
  expect(panel).toContain('下一章')
  expect(panel).toContain('后续大纲')
  expect(panel).toContain('伏笔')
  expect(panel).toContain('人物剧情')
  expect(panel).toContain('能力物品')
  expect(panel).toContain('联网资料')
  expect(panel).toContain('creative-assistant-card')
  expect(css).toContain('.creative-assistant-panel')
  expect(css).toContain('.creative-assistant-card')
})
```

- [ ] **Step 2: Run shell test to verify RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: fail because `CreativeAssistantPanel.tsx` and CSS do not exist.

- [ ] **Step 3: Implement panel component**

The component props should be:

```ts
export type CreativeAssistantPanelProps = {
  open: boolean
  loading: boolean
  mode: CreativeAssistantModeKey
  result: CreativeAssistResult | null
  project: any
  activeChapter: any
  selectedText: string
  contextPackage: any
  reviews: any[]
  error?: string
  onClose: () => void
  onModeChange: (mode: CreativeAssistantModeKey) => void
  onRun: (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => void
  onCopyCard: (card: CreativeAssistCard) => void
}
```

Render an Ant Design `Drawer` with class `creative-assistant-panel`, mode buttons, context chips, question input, conditional research input, run button, warnings, and card list.

- [ ] **Step 4: Add CSS**

Add scoped classes:

```css
.creative-assistant-panel .ant-drawer-body {
  padding: 14px;
}

.creative-assistant-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
```

Use restrained colors and stable dimensions for card actions.

- [ ] **Step 5: Run shell test to verify panel GREEN**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: may still fail until workspace integration happens in Task 4; panel source checks should pass.

- [ ] **Step 6: Commit panel shell**

```bash
git add ui/web/src/pages/novel-workspace/CreativeAssistantPanel.tsx ui/web/src/pages/novel-workspace/CreativeAssistantPanel.css ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
git commit -m "feat: add creative assistant panel shell"
```

## Task 4: Novel Workspace Integration

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] **Step 1: Extend failing shell assertions for integration**

In the same shell test, assert:

```ts
expect(projectWorkspace).toContain('creativeAssistantOpen')
expect(projectWorkspace).toContain('runCreativeAssistant')
expect(projectWorkspace).toContain('setCreativeAssistantOpen(true)')
expect(projectWorkspace).toContain('apiClient.post(`/novel/projects/${projectId}/creative-assist`')
expect(projectWorkspace).toContain('onCopyCard')
```

- [ ] **Step 2: Run shell test to verify RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: fail because workspace integration is not present.

- [ ] **Step 3: Import panel and model types**

Modify imports:

```ts
import { CreativeAssistantPanel } from './novel-workspace/CreativeAssistantPanel'
import type { CreativeAssistCard, CreativeAssistResult, CreativeAssistantModeKey } from './novel-workspace/creativeAssistantModel'
import { normalizeCreativeAssistPayload } from './novel-workspace/creativeAssistantModel'
```

- [ ] **Step 4: Add workspace state and runner**

Add state:

```ts
const [creativeAssistantOpen, setCreativeAssistantOpen] = useState(false)
const [creativeAssistantMode, setCreativeAssistantMode] = useState<CreativeAssistantModeKey>('prose_review')
const [creativeAssistantLoading, setCreativeAssistantLoading] = useState(false)
const [creativeAssistantResult, setCreativeAssistantResult] = useState<CreativeAssistResult | null>(null)
const [creativeAssistantError, setCreativeAssistantError] = useState('')
const [creativeAssistantSelectedText, setCreativeAssistantSelectedText] = useState('')
```

Add runner:

```ts
const runCreativeAssistant = async (input: { mode: CreativeAssistantModeKey; question: string; researchQuery: string }) => {
  setCreativeAssistantLoading(true)
  setCreativeAssistantError('')
  try {
    const res = await apiClient.post(`/novel/projects/${projectId}/creative-assist`, {
      mode: input.mode,
      chapter_id: activeChapter?.id,
      selected_text: creativeAssistantSelectedText,
      question: input.question,
      research_query: input.researchQuery,
      model_id: selectedModelId,
      save: true,
    })
    setCreativeAssistantResult(normalizeCreativeAssistPayload(res.data?.assist || res.data))
    if (res.data?.review) await loadProjectModules()
  } catch (error: any) {
    setCreativeAssistantError(error?.response?.data?.error || error?.message || '创作参谋调用失败')
  } finally {
    setCreativeAssistantLoading(false)
  }
}
```

- [ ] **Step 5: Add visible command and panel render**

Add a `创作参谋` button near the workspace command area or main workspace shell:

```tsx
<Button icon={<BulbOutlined />} onClick={() => setCreativeAssistantOpen(true)}>创作参谋</Button>
```

Render:

```tsx
<CreativeAssistantPanel
  open={creativeAssistantOpen}
  loading={creativeAssistantLoading}
  mode={creativeAssistantMode}
  result={creativeAssistantResult}
  project={selectedProject}
  activeChapter={activeChapter}
  selectedText={creativeAssistantSelectedText}
  contextPackage={activeContextPackageData}
  reviews={reviews}
  error={creativeAssistantError}
  onClose={() => setCreativeAssistantOpen(false)}
  onModeChange={setCreativeAssistantMode}
  onRun={runCreativeAssistant}
  onCopyCard={(card: CreativeAssistCard) => navigator.clipboard?.writeText([card.title, card.suggestion, card.risk].filter(Boolean).join('\n'))}
/>
```

- [ ] **Step 6: Run frontend tests**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/creativeAssistantModel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit workspace integration**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
git commit -m "feat: integrate creative assistant workspace"
```

## Task 5: Usage Guide And Full Verification

**Files:**
- Modify: `docs/novel-usage-guide.md`

- [ ] **Step 1: Add usage guide section**

Add a section near the current workspace flow:

```md
### 创作参谋

`创作参谋` 是自动链路之外的主动创作辅助入口。它不会自动改正文、改设定或推进正史，而是根据当前章节、选中文本、写作圣经、故事状态、角色、大纲、质检记录和参考资料生成建议卡。

推荐用法：

- 写不动当前章时，用 `正文评析` 找节奏、钩子、人物声音和回报缺口。
- 准备下一章时，用 `下一章` 获取安全续写、强追读和创新分支三类方向。
- 卡后续路线时，用 `后续大纲` 生成未来 5-10 章的推进建议。
- 需要长期钩子时，用 `伏笔` 设计埋线、误导和回收时机。
- 角色或关系变平时，用 `人物剧情` 补选择、缺陷受压、成长节点和关系转折。
- 能力、物品、势力或规则体系不稳时，用 `能力物品` 生成规则、代价、限制和可视化场面。
- 需要题材资料时，用 `联网资料` 把关键词或 URL 转成资料卡；网络不可用时，系统会降级为本地创意建议。
```

- [ ] **Step 2: Run targeted tests**

Run:

```bash
cd ui/server && bun test src/routes/novel-creative-assist-routes.test.ts
cd ui/web && bun test src/pages/novel-workspace/creativeAssistantModel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run build verification**

Run:

```bash
bun run check
```

Expected: server and web builds complete successfully.

- [ ] **Step 4: Run diff check**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Final commit**

```bash
git add docs/novel-usage-guide.md
git commit -m "docs: explain creative assistant workflow"
```

## Self-Review

- Spec coverage: every in-scope requirement maps to a task: backend route and persistence in Task 1, frontend model in Task 2, UI panel in Task 3, workspace entry in Task 4, usage guide and verification in Task 5.
- Placeholder scan: no task uses undefined future work as a required implementation step.
- Type consistency: frontend mode key names match backend mode key names exactly.
- Scope check: V1 avoids new tables and avoids automatic canon mutation while still covering all requested creative suggestion categories.
