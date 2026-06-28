# Novel Asset Relationship Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first working asset relationship graph to the novel setting assets workspace, backed by a reusable server-side graph model and surfaced in the UI with asset details and diagnostics.

**Architecture:** The server builds a derived graph from existing `setting_entities`, `characters`, `chapters`, and `chapter_setting_usage`. The UI requests that graph and renders it with ReactFlow, keeping persistence unchanged for this first slice.

**Tech Stack:** Bun, TypeScript, Express routes, React, Ant Design, ReactFlow, existing novel store helpers.

---

## File Structure

- Create `ui/server/src/routes/novel-setting-relationship-graph.ts`
  - Pure graph builder and diagnostic logic.
- Modify `ui/server/src/routes/novel-setting-routes.ts`
  - Register `GET /api/novel/projects/:id/settings/relationship-graph`.
- Create `ui/server/src/routes/novel-setting-relationship-graph.test.ts`
  - Unit tests for relation inference and diagnostics.
- Create `ui/web/src/pages/novel-workspace/SettingAssetGraphPanel.tsx`
  - Fetches and renders the graph, selected asset details, and diagnostics.
- Create `ui/web/src/pages/novel-workspace/SettingAssetGraphPanel.css`
  - Layout for compact graph + details panel.
- Create `ui/web/src/pages/novel-workspace/settingAssetGraphShell.test.ts`
  - Source-level UI guard for the graph panel integration.
- Modify `ui/web/src/pages/novel-workspace/StoryAssetsWorkspace.tsx`
  - Insert the graph panel above `SettingWorkshopPanel`.

## Task 1: Server Graph Model

**Files:**
- Create: `ui/server/src/routes/novel-setting-relationship-graph.ts`
- Test: `ui/server/src/routes/novel-setting-relationship-graph.test.ts`

- [ ] **Step 1: Write failing tests for inferred character-centered relations**

Add tests that build settings for a protagonist, ability, realm, faction, storyline, and chapter usage. Assert:

- protagonist node contains `age`, `realm`, `abilities`, `faction`
- graph has edges `has_ability`, `in_realm`, `member_of`, `in_storyline`, `used_in_chapter`
- usage edge carries `start_chapter_no`

Run: `cd ui/server && bun test src/routes/novel-setting-relationship-graph.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement minimal graph builder**

Export:

```ts
export type SettingRelationshipGraphInput = {
  settings: any[]
  characters?: any[]
  chapters?: any[]
  usage?: any[]
}

export function buildSettingRelationshipGraph(input: SettingRelationshipGraphInput): SettingRelationshipGraph
```

The implementation should:

- create one node per setting
- merge matching character-card fields into character setting metadata
- create chapter nodes only when referenced by usage or related chapter ids
- infer edges from explicit ids, name fields, and usage
- dedupe edges by `source,target,relation_type`

- [ ] **Step 3: Verify model test passes**

Run: `cd ui/server && bun test src/routes/novel-setting-relationship-graph.test.ts`

Expected: PASS.

- [ ] **Step 4: Add diagnostics tests**

Add tests for:

- ability without owner creates `missing_owner`
- setting with dangling `related_entity_ids` creates `dangling_relation`
- key asset with no non-chapter edges creates `isolated_key_asset`

Run the same test command and verify it fails before implementation.

- [ ] **Step 5: Implement diagnostics**

Add diagnostics and summary counters:

- `isolated_key_asset_count`
- `missing_owner_count`
- `missing_start_chapter_count`

- [ ] **Step 6: Verify diagnostics pass**

Run: `cd ui/server && bun test src/routes/novel-setting-relationship-graph.test.ts`

Expected: PASS.

## Task 2: Relationship Graph API

**Files:**
- Modify: `ui/server/src/routes/novel-setting-routes.ts`
- Test: `ui/server/src/routes/novel-setting-routes.test.ts`

- [ ] **Step 1: Write failing route guard test**

Extend the existing setting routes test to assert the route source contains:

- `/settings/relationship-graph`
- `buildSettingRelationshipGraph`
- `listNovelChapterSettingUsage`
- `listNovelCharacters`
- `listNovelChapters`

Run: `cd ui/server && bun test src/routes/novel-setting-routes.test.ts`

Expected: FAIL because the route is not registered.

- [ ] **Step 2: Register route**

Import `buildSettingRelationshipGraph`. In `registerNovelSettingRoutes`, before `/api/novel/projects/:id/settings`, add:

```ts
app.get('/api/novel/projects/:id/settings/relationship-graph', async (req, res) => {
  const activeWorkspace = ctx.getWorkspace()
  const projectId = Number(req.params.id)
  const project = await ctx.getProject(activeWorkspace, projectId)
  if (!project) return res.status(404).json({ error: 'project not found' })
  const [settings, characters, chapters, usage] = await Promise.all([
    listNovelSettingEntities(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelChapters(activeWorkspace, projectId),
    listNovelChapterSettingUsage(activeWorkspace, projectId),
  ])
  res.json(buildSettingRelationshipGraph({ settings, characters, chapters, usage }))
})
```

- [ ] **Step 3: Verify route tests**

Run: `cd ui/server && bun test src/routes/novel-setting-routes.test.ts src/routes/novel-setting-relationship-graph.test.ts`

Expected: PASS.

## Task 3: Asset Graph UI Panel

**Files:**
- Create: `ui/web/src/pages/novel-workspace/SettingAssetGraphPanel.tsx`
- Create: `ui/web/src/pages/novel-workspace/SettingAssetGraphPanel.css`
- Create: `ui/web/src/pages/novel-workspace/settingAssetGraphShell.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/StoryAssetsWorkspace.tsx`

- [ ] **Step 1: Write failing shell test**

Add a source guard that asserts:

- `StoryAssetsWorkspace.tsx` imports `SettingAssetGraphPanel`
- `StoryAssetsWorkspace.tsx` renders `<SettingAssetGraphPanel`
- panel source uses `/settings/relationship-graph`
- panel source uses `ReactFlow`
- panel source contains `资产关系图谱`, `关系诊断`, `年龄`, `境界`, `能力`, `势力`, `剧情线`

Run: `cd ui/web && bun test src/pages/novel-workspace/settingAssetGraphShell.test.ts`

Expected: FAIL because the panel does not exist.

- [ ] **Step 2: Implement panel**

The panel should:

- fetch `/novel/projects/${projectId}/settings/relationship-graph`
- render summary tags
- render ReactFlow graph when nodes exist
- allow dragging nodes
- set selected node on click
- show selected node metadata and connected relations
- show diagnostics list
- show empty state when no nodes exist

- [ ] **Step 3: Insert panel into story assets workspace**

Render the panel above `SettingWorkshopPanel`, after stats.

- [ ] **Step 4: Verify shell test**

Run: `cd ui/web && bun test src/pages/novel-workspace/settingAssetGraphShell.test.ts`

Expected: PASS.

## Task 4: Integrated Verification

**Files:**
- Existing tests and build scripts.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
cd ui/server && bun test src/routes/novel-setting-relationship-graph.test.ts src/routes/novel-setting-routes.test.ts
cd ui/web && bun test src/pages/novel-workspace/settingAssetGraphShell.test.ts src/pages/novel-workspace/settingUsageWorkbenchShell.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run existing writing cockpit suite**

Run: `bun run test:writing-cockpit`

Expected: PASS.

- [ ] **Step 3: Build web**

Run: `bun run build:web`

Expected: PASS with only existing chunk-size warnings.

- [ ] **Step 4: Browser verify**

Start local backend and frontend. Open `/novel/workspace/6`, click `设定资产`, and verify:

- `资产关系图谱` is visible.
- graph has at least one node for current project settings.
- diagnostics are visible or show an empty state.
- `任务中心` remains visible.
- no body horizontal overflow.

- [ ] **Step 5: Commit**

Stage only relationship graph source/docs/tests, not `workspace/providers.json`.

Commit message:

```bash
git commit -m "feat: add novel asset relationship graph"
```
