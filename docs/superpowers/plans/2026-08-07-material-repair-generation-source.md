# Material Repair GenerationSource Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chapter material repair a source-authoritative generation call so an MCP project can repair all missing writing materials in one independent remote Agent Session, then start prose in a different Session, without changing existing model API behavior.

**Architecture:** Add `material_repair` and `material_repair_json` to the task-scoped GenerationSource contract, validate a provider-neutral combined material payload, and execute it through a dedicated MCP material-repair service before prose task creation. Reuse `commitNovelChapterAcceptance` for one atomic multi-entity commit with source and material-context fences. Keep the existing model route and model automatic-repair branch intact; only confirmed MCP authority enters the new service.

**Tech Stack:** TypeScript, Bun 1.3.x, Express, React 18, Ant Design, Bun SQLite, existing ChapterGenerationSource/MCP Adapter abstractions, Bun test, Vite.

---

## File structure

### New files

- `ui/server/src/novel/material-repair-context-version.ts` — transaction-consistent material snapshot, canonical input identity, and commit-time context fence.
- `ui/server/src/novel-writing-service/service/material-repair-contract.ts` — provider-neutral target calculation, MCP prompt, semantic validation, and acceptance mutation preparation.
- `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts` — contract allowlist, completeness, non-overwrite, and provider-neutral tests.
- `ui/server/src/novel-writing-service/service/material-repair-service.ts` — one-task/one-stage MCP orchestration, atomic commit, close semantics, and refreshed result loading.
- `ui/server/src/novel-writing-service/service/material-repair-service.test.ts` — source routing, exactly-one invocation, no fallback, close, and atomic-commit tests.

### Modified server files

- `ui/server/src/novel-writing-service/generation-source/types.ts` — add the stage and response contract literals.
- `ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts` — validate the new remote JSON envelope.
- `ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts` — RED/GREEN coverage for the envelope.
- `ui/server/src/novel/types.ts` — add the optional expected material-context fingerprint to acceptance input.
- `ui/server/src/novel/store.ts` — export the material snapshot/version functions.
- `ui/server/src/novel/acceptance.ts` — enforce the material-context fingerprint inside the existing transaction.
- `ui/server/src/novel/acceptance.test.ts` — prove stale context and partial writes are rejected atomically.
- `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts` — construct and expose the material-repair service.
- `ui/server/src/novel-writing-service/service/generate-chapter-context-scene-cards.ts` — route only MCP automatic preflight repair through the new service before prose task creation.
- `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts` — inject material repair and consume the refreshed context.
- `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.unit.test.ts` — prove material and prose tasks are sequential and distinct.
- `ui/server/src/routes/novel-chapter-context-routes.ts` — dispatch MCP projects to the combined service while leaving the existing model branch unchanged.
- `ui/server/src/routes/novel-chapter-context-routes.test.ts` — route authority and model-regression tests.
- `ui/server/src/routes/novel.ts` — wire the service into the route context.

### Modified web files

- `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts` — central source-aware invocation gate.
- `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts` — MCP-without-model, model-without-model, and unknown-authority tests.
- `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx` — pass authoritative source state into core handlers.
- `ui/web/src/pages/novel-workspace/shell/workspace-view-bind-core-handlers.ts` — bind the authority state to preflight and prose handlers.
- `ui/web/src/pages/novel-workspace/shell/workspace-preflight-handlers.tsx` — make MCP preflight repair one combined request; retain the model sequence.
- `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx` — remove unconditional model checks from MCP single, repair-and-generate, and batch paths.
- `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts` — assert source-aware bodies and no MCP model requirement.
- `ui/web/src/pages/novel-workspace/workspaceUiShell.b-a.test.ts` — guard the complete shell wiring.

## Task 1: Extend the task-scoped response contract

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts`

- [ ] **Step 1: Write failing response-contract tests**

Add a valid combined fixture and reject prose/unknown top-level fields:

```ts
const materialRepair = {
  chapter_patch: {
    chapter_goal: '在停摆前找出灰塔的校时规律',
    raw_payload: { forbidden_repeats: ['不再解释旧钟来源'] },
  },
  worldbuilding: [{ world_summary: '灰塔每天吞掉一分钟。', rules: ['回拨会留下记忆残影'] }],
  characters: [{ name: '林砚', role_type: 'protagonist', current_state: { location: '灰塔底层' } }],
  character_updates: [],
  settings: [{ entity_type: 'rule', name: '缺失的一分钟', summary: '每日零点被灰塔收走。' }],
  chapter_setting_usage: [{ entity_name: '缺失的一分钟', entity_type: 'rule', required: true }],
  repair_summary: '补齐第一章写作材料',
}

expect(validateMcpStageResponse('material_repair', 'material_repair_json', {
  content: JSON.stringify(materialRepair),
}).output).toEqual(materialRepair)

expect(() => validateMcpStageResponse('material_repair', 'material_repair_json', {
  content: JSON.stringify({ ...materialRepair, chapter_text: '不应生成正文' }),
})).toThrow(expect.objectContaining({ code: 'MCP_STAGE_CONTRACT_INVALID' }))
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-response-contract.test.ts
```

Expected: type checking or runtime test failure because `material_repair` and `material_repair_json` are unsupported.

- [ ] **Step 3: Add the stage and contract literals**

Extend the unions in `types.ts`:

```ts
export type ChapterTaskStage =
  | 'material_repair'
  | 'draft'
  | 'word_target_repair'
  | 'commercial_editor_rewrite'
  | 'meme_polish'
  | 'readability_review'
  | 'humanize'
  | 'quality_review'
  | 'quality_recheck'
  | 'structured_review_fill'
  | 'quality_repair'
  | 'manual_recheck'
  | 'editor_report'
  | 'revision'
  | 'post_revision_review'
  | 'story_state_sync'

export type ChapterStageResponseContract =
  | 'material_repair_json'
  | 'draft_prose'
  | 'word_target_prose'
  | 'editor_rewrite_prose'
  | 'meme_polish_prose'
  | 'readability_json'
  | 'humanize_prose'
  | 'quality_review_json'
  | 'structured_review_json'
  | 'revision_prose'
  | 'editor_report_json'
  | 'story_state_json'
```

- [ ] **Step 4: Add the structural validator**

In `stage-response-contract.ts`, require an exact provider-neutral envelope and at least one semantic mutation:

```ts
const MATERIAL_REPAIR_FIELDS = new Set([
  'chapter_patch',
  'worldbuilding',
  'characters',
  'character_updates',
  'settings',
  'chapter_setting_usage',
  'repair_summary',
])

function validateMaterialRepair(content: string) {
  const value = parseJsonObject(content)
  const keys = Object.keys(value)
  if (keys.some(key => !MATERIAL_REPAIR_FIELDS.has(key))) {
    throw new TypeError('material repair contains unsupported fields')
  }
  const chapterPatch = ownDataValue(value, 'chapter_patch')
  if (chapterPatch !== undefined && !plainObject(chapterPatch)) {
    throw new TypeError('material repair chapter patch must be an object')
  }
  let mutationCount = chapterPatch && Object.keys(chapterPatch).length ? 1 : 0
  for (const field of ['worldbuilding', 'characters', 'character_updates', 'settings', 'chapter_setting_usage']) {
    const collection = ownDataValue(value, field)
    if (collection !== undefined && (!Array.isArray(collection) || !collection.every(plainObject))) {
      throw new TypeError(`material repair ${field} must be an object array`)
    }
    mutationCount += Array.isArray(collection) ? collection.length : 0
  }
  const summary = ownDataValue(value, 'repair_summary')
  if (summary !== undefined && typeof summary !== 'string') {
    throw new TypeError('material repair summary must be a string')
  }
  if (mutationCount === 0) throw new TypeError('material repair mutation required')
  return value
}

const validators = {
  material_repair_json: validateMaterialRepair,
  draft_prose: validateProse,
  word_target_prose: validateProse,
  editor_rewrite_prose: validateProse,
  meme_polish_prose: validateProse,
  readability_json: validateReadability,
  humanize_prose: validateProse,
  quality_review_json: validateQualityReview,
  structured_review_json: validateStructuredReview,
  revision_prose: validateProse,
  editor_report_json: validateEditorReport,
  story_state_json: validateStoryState,
} satisfies Record<ChapterStageResponseContract, ContractValidator>
```

- [ ] **Step 5: Run contract and receipt tests**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-response-contract.test.ts src/novel-writing-service/generation-source/stage-receipts.test.ts
```

Expected: PASS, 0 failures. Existing response contracts remain unchanged.

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/novel-writing-service/generation-source/types.ts ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts
git commit -m "feat(mcp): add material repair stage contract"
```

## Task 2: Build the provider-neutral material repair contract

**Files:**
- Create: `ui/server/src/novel-writing-service/service/material-repair-contract.ts`
- Create: `ui/server/src/novel-writing-service/service/material-repair-contract.test.ts`

- [ ] **Step 1: Write failing target and normalization tests**

Cover these exact behaviors:

```ts
test('maps all missing preflight families into one target set', () => {
  expect(resolveMaterialRepairTargets({
    preflight: {
      checks: [
        { key: 'worldbuilding', ok: false },
        { key: 'characters', ok: false },
        { key: 'character_state', ok: false },
        { key: 'setting_workshop', ok: false },
        { key: 'chapter_setting_usage', ok: false },
        { key: 'chapter_blueprint', ok: false },
      ],
    },
  })).toEqual(new Set([
    'chapter_patch', 'worldbuilding', 'characters', 'character_updates',
    'settings', 'chapter_setting_usage',
  ]))
})

test('rejects a response that does not cover every requested target', () => {
  expect(() => prepareMcpMaterialRepairMutation({
    targets: new Set(['worldbuilding', 'characters']),
    payload: { characters: [{ name: '林砚' }], repair_summary: '只补了角色' },
    existing: { characterNames: new Set(), settingKeys: new Set() },
  })).toThrow(expect.objectContaining({ code: 'MATERIAL_REPAIR_INCOMPLETE' }))
})

test('does not turn empty remote fields into overwrites', () => {
  const prepared = prepareMcpMaterialRepairMutation({
    targets: new Set(['character_updates']),
    payload: {
      character_updates: [{ name: '林砚', current_state: { location: '灰塔底层' }, goal: '' }],
      repair_summary: '更新状态',
    },
    existing: { characterNames: new Set(['林砚']), settingKeys: new Set() },
  })
  expect(prepared.acceptance.character_updates).toEqual([{
    name: '林砚',
    patch: { current_state: { location: '灰塔底层' } },
  }])
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Define the exact types and target mapping**

Create `material-repair-contract.ts` with exported types and a mapping that groups aliases into six canonical mutation targets:

```ts
import type { NovelChapterAcceptanceInput } from '../../novel'

export type MaterialRepairTarget =
  | 'chapter_patch'
  | 'worldbuilding'
  | 'characters'
  | 'character_updates'
  | 'settings'
  | 'chapter_setting_usage'

const TARGETS_BY_CHECK: Record<string, readonly MaterialRepairTarget[]> = {
  chapter_blueprint: ['chapter_patch'],
  chapter_conflict: ['chapter_patch'],
  ending_hook: ['chapter_patch'],
  plot_points: ['chapter_patch'],
  scene_cards: ['chapter_patch'],
  no_repeat: ['chapter_patch'],
  source_readiness_chapter_blueprint: ['chapter_patch'],
  source_readiness_context_tracking: ['chapter_patch'],
  source_readiness_timeline_tracking: ['chapter_patch'],
  source_readiness_scene_card_goal_obstacle_change: ['chapter_patch'],
  benchmark_recall_source_paths: ['chapter_patch'],
  benchmark_recall_gate: ['chapter_patch'],
  worldbuilding: ['worldbuilding'],
  characters: ['characters'],
  character_state: ['character_updates'],
  setting_workshop: ['settings'],
  chapter_setting_usage: ['chapter_setting_usage'],
}

export function resolveMaterialRepairTargets(contextPackage: any, requestedKeys?: string[]) {
  const failed = Array.isArray(contextPackage?.preflight?.checks)
    ? contextPackage.preflight.checks.filter((check: any) => check?.ok !== true).map((check: any) => String(check?.key || ''))
    : []
  const keys = requestedKeys?.length ? requestedKeys : failed
  return new Set(keys.flatMap(key => TARGETS_BY_CHECK[key] || []))
}
```

- [ ] **Step 4: Add the self-contained prompt builder**

The prompt must contain the requested targets, authoritative context, exact JSON envelope, no-prose instruction, and no remote-memory authority:

```ts
export function buildMaterialRepairTask(input: {
  targets: Set<MaterialRepairTarget>
  project: any
  chapter: any
  contextPackage: any
  chapters: any[]
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  reviews: any[]
  settings: any[]
  chapterSettingUsage: any[]
}) {
  return [
    '任务：一次性补齐本章写作前置材料。只输出 JSON，不生成正文。',
    'MangaForge 本次请求中的项目材料是权威上下文；不得用远端历史覆盖。',
    `必须补齐的分区：${JSON.stringify([...input.targets])}`,
    '仅允许输出 chapter_patch, worldbuilding, characters, character_updates, settings, chapter_setting_usage, repair_summary。',
    'chapter_setting_usage 使用已有 entity_id，或使用本次 settings 中唯一的 entity_name + entity_type。',
    '已有材料默认只读；不得用空字符串、空数组或空对象覆盖已有内容。',
    '【项目与写作圣经】', JSON.stringify({ project: input.project, writing_bible: input.contextPackage?.writing_bible || {} }),
    '【本章与严格检查】', JSON.stringify({ chapter: input.chapter, preflight: input.contextPackage?.preflight || {} }),
    '【Story State 与连续性】', JSON.stringify({ story_state: input.contextPackage?.story_state || {}, recent_chapters: input.chapters.slice(-5) }),
    '【已有世界观、角色、大纲、设定和调用】', JSON.stringify({
      worldbuilding: input.worldbuilding,
      characters: input.characters,
      outlines: input.outlines,
      reviews: input.reviews.slice(-20),
      settings: input.settings,
      chapter_setting_usage: input.chapterSettingUsage,
    }),
  ].join('\n')
}
```

Apply the existing bounded prompt conventions before passing it to GenerationSource; retain the fields needed for consistency and cap arrays/text by the same limits used in chapter context construction.

- [ ] **Step 5: Add semantic validation and acceptance preparation**

Implement `prepareMcpMaterialRepairMutation()` so it:

- rejects non-requested sections;
- requires a meaningful result for every requested section;
- permits `chapter_patch` only for `title`, `chapter_goal`, `chapter_summary`, `conflict`, `ending_hook`, `scene_breakdown`, `scene_list`, and allowed `raw_payload` preparation fields such as chapter blueprint, write-preparation brief, source readiness, `must_advance`, and `forbidden_repeats`;
- converts character updates to `{ name, patch }`;
- converts settings and usages to the existing acceptance shapes;
- strips undefined/empty overwrite fields recursively;
- rejects duplicate character names and duplicate `entity_type + name` setting keys;
- rejects `chapter_text`, project/source mutation fields, IDs belonging to other projects, and unresolved usage references;
- returns `{ acceptance, applied }` without performing I/O.

The return type must be explicit:

```ts
export type PreparedMaterialRepair = {
  acceptance: Pick<NovelChapterAcceptanceInput,
    | 'chapter_patch'
    | 'worldbuilding_creates'
    | 'character_creates'
    | 'character_updates'
    | 'setting_creates'
    | 'chapter_setting_usage_replacement'
    | 'reviews'
  >
  applied: Array<{ type: string; name?: string; count?: number }>
  summary: string
}

export function materialRepairExistingIdentity(input: {
  characters: Array<{ name?: string }>
  settings: Array<{ entity_type?: string; name?: string }>
}) {
  return {
    characterNames: new Set(input.characters.map(item => String(item.name || '').trim()).filter(Boolean)),
    settingKeys: new Set(input.settings.map(item => `${String(item.entity_type || 'rule').trim()}\u0000${String(item.name || '').trim()}`)),
  }
}
```

- [ ] **Step 6: Run the focused tests**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/material-repair-contract.test.ts
```

Expected: PASS, 0 failures, including an assertion that the implementation source contains no `buda` identifier.

- [ ] **Step 7: Commit**

```bash
git add ui/server/src/novel-writing-service/service/material-repair-contract.ts ui/server/src/novel-writing-service/service/material-repair-contract.test.ts
git commit -m "feat(novel): define combined material repair contract"
```

## Task 3: Add the transaction-time material context fence

**Files:**
- Create: `ui/server/src/novel/material-repair-context-version.ts`
- Modify: `ui/server/src/novel/types.ts`
- Modify: `ui/server/src/novel/store.ts`
- Modify: `ui/server/src/novel/acceptance.ts`
- Test: `ui/server/src/novel/acceptance.test.ts`

- [ ] **Step 1: Write failing stale-context and rollback tests**

Add a test that captures a version, changes a character, then attempts a multi-entity acceptance:

```ts
const expected = (await loadNovelMaterialRepairSnapshot(workspace, project.id, chapter.id)).contextVersion
await updateNovelCharacter(workspace, character.id, {
  current_state: { location: '已被其他请求改到钟楼顶层' },
})

await expect(commitNovelChapterAcceptance(workspace, {
  chapter_id: chapter.id,
  chapter_patch: { ending_hook: '灰塔开始倒转。' },
  expected_material_repair_context_version: expected,
  character_creates: [{ name: '不应入库的角色' }],
  setting_creates: [{ entity_type: 'rule', name: '不应入库的规则' }],
})).rejects.toMatchObject({ code: 'MATERIAL_REPAIR_CONTEXT_CHANGED' })

const snapshot = await snapshotNovelProject(workspace, project.id, chapter.id)
expect(snapshot.characters.some(item => item.name === '不应入库的角色')).toBe(false)
expect(snapshot.settings.some(item => item.name === '不应入库的规则')).toBe(false)
expect(snapshot.chapter.ending_hook).not.toBe('灰塔开始倒转。')
```

Also add a success test that commits chapter, worldbuilding, characters, settings, and usage together when the version is current.

- [ ] **Step 2: Run the acceptance test and verify RED**

Run:

```bash
cd ui/server && bun test src/novel/acceptance.test.ts
```

Expected: FAIL because the context version reader and acceptance field are missing.

- [ ] **Step 3: Implement canonical snapshot identity**

Create `material-repair-context-version.ts`. Read and map all prompt-authoritative persisted inputs in one SQLite read transaction, order them by stable IDs, and hash the same rows returned to the caller:

```ts
import { createHash } from 'node:crypto'
import type { Database } from 'bun:sqlite'
import { ensureSqliteSchema, openDb } from './db'
import { ensureLegacyNovelStoreImportedForRead } from './legacy-import'
import {
  chapterFromRow,
  chapterSettingUsageFromRow,
  characterFromRow,
  outlineFromRow,
  projectFromRow,
  reviewFromRow,
  settingEntityFromRow,
  worldbuildingFromRow,
} from './row-mappers'

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`
}

function materialRepairRowsFromDb(db: Database, projectId: number, chapterId: number) {
  const ordered = (table: string, where: string, values: number[]) =>
    db.query(`SELECT * FROM ${table} WHERE ${where} ORDER BY id`).all(...values)
  return {
    targetChapterId: chapterId,
    projectRow: db.query('SELECT * FROM projects WHERE id = ?').get(projectId),
    chapterRows: ordered('chapters', 'project_id = ?', [projectId]),
    worldRows: ordered('worldbuilding', 'project_id = ?', [projectId]),
    characterRows: ordered('characters', 'project_id = ?', [projectId]),
    outlineRows: ordered('outlines', 'project_id = ?', [projectId]),
    reviewRows: ordered('reviews', 'project_id = ?', [projectId]),
    settingRows: ordered('setting_entities', 'project_id = ?', [projectId]),
    usageRows: ordered('chapter_setting_usage', 'project_id = ?', [projectId]),
  }
}

export function materialRepairContextVersionFromDb(db: Database, projectId: number, chapterId: number) {
  return sha256(materialRepairRowsFromDb(db, projectId, chapterId))
}

export async function loadNovelMaterialRepairSnapshot(workspace: string, projectId: number, chapterId: number) {
  await ensureLegacyNovelStoreImportedForRead(workspace)
  const db = openDb(workspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN')
    const rows = materialRepairRowsFromDb(db, projectId, chapterId)
    const { projectRow, chapterRows, worldRows, characterRows, outlineRows, reviewRows, settingRows, usageRows } = rows as any
    const chapterRow = chapterRows.find(row => Number(row.id) === chapterId)
    if (!projectRow || !chapterRow) throw Object.assign(new Error('material repair scope not found'), { code: 'MATERIAL_REPAIR_SCOPE_NOT_FOUND' })
    const contextVersion = sha256(rows)
    db.exec('COMMIT')
    committed = true
    const chapters = chapterRows.map(chapterFromRow)
    return {
      project: projectFromRow(projectRow),
      chapter: chapters.find(chapter => chapter.id === chapterId)!,
      chapters,
      worldbuilding: worldRows.map(worldbuildingFromRow),
      characters: characterRows.map(characterFromRow),
      outlines: outlineRows.map(outlineFromRow),
      reviews: reviewRows.map(reviewFromRow),
      settings: settingRows.map(settingEntityFromRow),
      projectSettingUsage: usageRows.map(chapterSettingUsageFromRow),
      chapterSettingUsage: usageRows.map(chapterSettingUsageFromRow).filter(usage => usage.chapter_id === chapterId),
      contextVersion,
    }
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* read transaction may already be closed */ }
    }
    throw error
  } finally {
    db.close()
  }
}

export type NovelMaterialRepairSnapshot = Awaited<ReturnType<typeof loadNovelMaterialRepairSnapshot>>
```

Use the existing JSON sanitization/canonical ordering helper if raw SQLite values expose non-JSON numeric types; the output must match `/^sha256:[0-9a-f]{64}$/`.

Export the new module from `store.ts`:

```ts
export * from './material-repair-context-version'
```

- [ ] **Step 4: Add the optional acceptance fence**

Extend `NovelChapterAcceptanceInput`:

```ts
expected_material_repair_context_version?: string
```

Inside `commitNovelChapterAcceptance()`, after loading `currentProject` and `currentChapter` but before cloning or mutating the store, compare within the same `BEGIN IMMEDIATE` transaction:

```ts
const expectedMaterialContextVersion = String(
  input.expected_material_repair_context_version || '',
).trim()
if (expectedMaterialContextVersion) {
  const currentMaterialContextVersion = materialRepairContextVersionFromDb(
    db,
    currentProject.id,
    currentChapter.id,
  )
  if (currentMaterialContextVersion !== expectedMaterialContextVersion) {
    throw Object.assign(new Error('材料上下文已变化，请基于最新材料重试'), {
      code: 'MATERIAL_REPAIR_CONTEXT_CHANGED',
      error_code: 'MATERIAL_REPAIR_CONTEXT_CHANGED',
    })
  }
}
```

Omission must preserve every existing acceptance call exactly.

- [ ] **Step 5: Run acceptance and persistence tests**

Run:

```bash
cd ui/server && bun test src/novel/acceptance.test.ts src/novel/sqlite-persistence.test.ts
```

Expected: PASS, 0 failures. Stale context produces zero writes.

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/novel/material-repair-context-version.ts ui/server/src/novel/types.ts ui/server/src/novel/store.ts ui/server/src/novel/acceptance.ts ui/server/src/novel/acceptance.test.ts
git commit -m "feat(novel): fence atomic material repair commits"
```

## Task 4: Implement one-session MCP material repair orchestration

**Files:**
- Create: `ui/server/src/novel-writing-service/service/material-repair-service.ts`
- Create: `ui/server/src/novel-writing-service/service/material-repair-service.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`

- [ ] **Step 1: Write failing orchestration tests**

Create a dependency-injected harness. Its task execution spy must count `executeAgent`, record stage/contract, expose distinct `taskId`, and count `close` outcomes.

```ts
test('repairs every target with one MCP stage call and one task', async () => {
  const harness = createMaterialRepairHarness({ active: 'mcp' })
  const result = await harness.service.repairChapterMaterials({
    activeWorkspace: harness.workspace,
    projectId: harness.project.id,
    chapterId: harness.chapter.id,
  })

  expect(harness.beginCalls).toHaveLength(1)
  expect(harness.stageCalls.map(call => [call.stage, call.contract])).toEqual([
    ['material_repair', 'material_repair_json'],
  ])
  expect(harness.commitCalls).toHaveLength(1)
  expect(harness.closeCalls).toEqual([{ status: 'success' }])
  expect(result.source).toBe('mcp')
})

test('never calls model fallback after MCP failure', async () => {
  const rejection = Object.assign(new Error('remote rejected'), { code: 'MCP_SESSION_FAILED' })
  const harness = createMaterialRepairHarness({ active: 'mcp', stageFailure: rejection })
  await expect(harness.service.repairChapterMaterials({
    activeWorkspace: harness.workspace,
    projectId: harness.project.id,
    chapterId: harness.chapter.id,
  })).rejects.toBe(rejection)
  expect(harness.modelCalls).toBe(0)
  expect(harness.commitCalls).toHaveLength(0)
  expect(harness.closeCalls[0]?.status).toBe('failed')
})
```

Add cases for no missing targets (`skipped: true` and no task), invalid output (no commit), aborted signal (`cancelled` close), commit failure (propagated, no second remote call), and refreshed strict preflight returned after success.

- [ ] **Step 2: Run the new service test and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/material-repair-service.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service boundary**

Export a factory with injectable I/O and no Adapter-specific dependency:

```ts
export type MaterialRepairRequest = {
  activeWorkspace: string
  projectId: number
  chapterId: number
  repairKeys?: string[]
  signal?: AbortSignal
}

function materialRepairError(code: string, message: string) {
  return Object.assign(new Error(message), { code, error_code: code })
}

export function createMaterialRepairService(deps: {
  beginChapterTask: (input: any) => Promise<ChapterTaskExecution>
  buildChapterContextPackage: (...input: any[]) => Promise<any>
  commitAcceptance: typeof commitNovelChapterAcceptance
  loadSnapshot: typeof loadNovelMaterialRepairSnapshot
}) {
  return {
    async repairChapterMaterials(input: MaterialRepairRequest) {
      const loaded = await deps.loadSnapshot(input.activeWorkspace, input.projectId, input.chapterId)
      const project = loaded.project
      const source = resolveChapterGenerationSource(project)
      if (source.active !== 'mcp') {
        throw materialRepairError('MATERIAL_REPAIR_MODEL_PATH_REQUIRED', '模型材料补齐必须使用现有模型路径')
      }
      const contextPackage = await deps.buildChapterContextPackage(
        input.activeWorkspace,
        project,
        loaded.chapter,
        loaded.chapters,
        loaded.worldbuilding,
        loaded.characters,
        loaded.outlines,
        loaded.reviews,
      )
      const targets = resolveMaterialRepairTargets(contextPackage, input.repairKeys)
      if (!targets.size) return { ok: true, skipped: true, applied: [], source: 'mcp', context_package: contextPackage }

      const execution = await deps.beginChapterTask({
        activeWorkspace: input.activeWorkspace,
        project,
        chapter: loaded.chapter,
        contextPackage,
        signal: input.signal,
        options: { material_repair: true },
      })
      let outcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'failed' }
      try {
        const stageResult = await execution.executeAgent(
          'material_repair',
          'material_repair_json',
          'outline-agent',
          project,
          { task: buildMaterialRepairTask({ ...loaded, project, contextPackage, targets }) },
          { activeWorkspace: input.activeWorkspace, signal: input.signal },
        )
        const prepared = prepareMcpMaterialRepairMutation({
          targets,
          payload: stageResult.output ?? stageResult.parsed,
          existing: materialRepairExistingIdentity(loaded),
        })
        await execution.assertCurrent()
        await deps.commitAcceptance(input.activeWorkspace, {
          chapter_id: loaded.chapter.id,
          expected_chapter_generation_source_fingerprint: execution.authorityFingerprint,
          expected_material_repair_context_version: loaded.contextVersion,
          ...prepared.acceptance,
        })
        outcome = { status: 'success' }
        const refreshed = await deps.loadSnapshot(input.activeWorkspace, input.projectId, input.chapterId)
        const refreshedContext = await deps.buildChapterContextPackage(
          input.activeWorkspace,
          project,
          refreshed.chapter,
          refreshed.chapters,
          refreshed.worldbuilding,
          refreshed.characters,
          refreshed.outlines,
          refreshed.reviews,
        )
        return materialRepairResponse(prepared, refreshed, refreshedContext, execution.provenance())
      } catch (error) {
        outcome = { status: input.signal?.aborted ? 'cancelled' : 'failed', error }
        throw error
      } finally {
        await execution.close(outcome)
      }
    },
  }
}
```

`materialRepairResponse()` must return the exact internal/API shape consumed by both the route and automatic production without exposing remote identity:

```ts
function materialRepairResponse(
  prepared: PreparedMaterialRepair,
  refreshed: NovelMaterialRepairSnapshot,
  contextPackage: any,
  provenance: ChapterTaskProvenance,
) {
  return {
    ok: true,
    skipped: false,
    source: 'mcp' as const,
    task_id: provenance.task_id,
    source_fingerprint: provenance.source_fingerprint,
    context_version: provenance.context_version,
    applied: prepared.applied,
    summary: prepared.summary,
    chapter: refreshed.chapter,
    chapters: refreshed.chapters,
    worldbuilding: refreshed.worldbuilding,
    characters: refreshed.characters,
    settings: refreshed.settings,
    chapter_setting_usage: refreshed.chapterSettingUsage,
    project_setting_usage: refreshed.projectSettingUsage,
    context_package: contextPackage,
    preflight: contextPackage.preflight,
  }
}
```

Complete Agent IDs, Session IDs, Key IDs, Keys, headers, prompts, and remote error bodies remain only in their existing bounded server-side receipt paths; this response must not include them.

Use only the transaction-consistent snapshot returned by `loadNovelMaterialRepairSnapshot`. Do not accept `generation_source_override`; do not pass `requestedModelId` for MCP.

- [ ] **Step 4: Wire the service into `createNovelWritingService()`**

Construct the service after `beginChapterTask` exists, using existing repositories and `commitNovelChapterAcceptance`, then expose:

```ts
const materialRepairService = createMaterialRepairService({
  beginChapterTask,
  buildChapterContextPackage: buildChapterContextPackageFromModule,
  commitAcceptance: commitNovelChapterAcceptance,
  loadSnapshot: loadNovelMaterialRepairSnapshot,
})

return {
  beginChapterTask,
  repairChapterMaterials: materialRepairService.repairChapterMaterials,
  buildParagraphProseContext,
  buildChapterContextPackage,
  autoRepairChapterPreflightGaps,
  generateSceneCardsForChapter,
  prepareStoryStateUpdate,
  updateStoryStateMachine,
  getStoredOrBuiltWritingBible,
  runCommercialEditorRewrite,
  runMemePolish,
  runReadabilityReview,
  runHumanizePostProcess,
  runProseSelfReviewAndRevision,
  ensureProseMeetsWordTarget,
  generateChapterForGroup,
}
```

- [ ] **Step 5: Run service and GenerationSource tests**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/material-repair-service.test.ts src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: PASS, 0 failures. The MCP invocation records one `material_repair` stage artifact and one stage Session identity.

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/novel-writing-service/service/material-repair-service.ts ui/server/src/novel-writing-service/service/material-repair-service.test.ts ui/server/src/novel-writing-service/service/create-novel-writing-service.ts
git commit -m "feat(mcp): execute material repair in one session"
```

## Task 5: Route manual MCP repair without changing the model API path

**Files:**
- Modify: `ui/server/src/routes/novel-chapter-context-routes.ts`
- Modify: `ui/server/src/routes/novel-chapter-context-routes.test.ts`
- Modify: `ui/server/src/routes/novel.ts`

- [ ] **Step 1: Write failing route dispatch tests**

Add two tests:

```ts
test('dispatches an MCP project without model_id to combined material repair', async () => {
  const repairCalls: any[] = []
  const project = mcpProjectFixture()
  const { app, handlers } = createRouteHarness()
  registerNovelChapterContextRoutes(app as any, {
    getWorkspace: () => 'workspace',
    getProject: async () => project,
    buildChapterContextPackage: async () => readyContextFixture(),
    repairChapterMaterials: async input => {
      repairCalls.push(input)
      return { ok: true, source: 'mcp', applied: [{ type: 'worldbuilding_created' }] }
    },
  })
  const response = await callRoute(
    handlers.get('POST /api/novel/chapters/:chapterId/auto-repair-context'),
    { params: { chapterId: '9' }, query: {}, body: { project_id: 5 } },
  )
  expect(response.statusCode).toBe(200)
  expect(repairCalls).toEqual([{ activeWorkspace: 'workspace', projectId: 5, chapterId: 9, repairKeys: undefined }])
})

test('keeps the model route model_id requirement and never dispatches MCP repair', async () => {
  const source = readFileSync(join(import.meta.dir, 'novel-chapter-context-routes.ts'), 'utf8')
  expect(source).toContain("if (resolveChapterGenerationSource(project).active === 'mcp')")
  expect(source).toContain("const modelId = req.body?.model_id ? String(req.body.model_id) : ''")
  expect(source).toContain("executeNovelAgent('outline-agent'")
  expect(source).toContain('fallbackForbiddenRepeats')
})
```

The second test freezes the current model behavior while the existing database tests continue exercising its outputs.

- [ ] **Step 2: Run the route test and verify RED**

Run:

```bash
cd ui/server && bun test src/routes/novel-chapter-context-routes.test.ts
```

Expected: FAIL because route context has no combined repair method and no authority dispatch.

- [ ] **Step 3: Add the MCP-only early branch**

Extend `ChapterContextRoutesContext` with:

```ts
repairChapterMaterials: (input: {
  activeWorkspace: string
  projectId: number
  chapterId: number
  repairKeys?: string[]
  signal?: AbortSignal
}) => Promise<any>
```

After loading the project and before the existing model material loaders, add:

```ts
if (resolveChapterGenerationSource(project).active === 'mcp') {
  const repairKeys = Array.isArray(req.body?.repair_keys)
    ? req.body.repair_keys.map((key: unknown) => String(key || '').trim()).filter(Boolean)
    : undefined
  const result = await ctx.repairChapterMaterials({
    activeWorkspace,
    projectId,
    chapterId,
    repairKeys,
  })
  return res.json({
    ...result,
    material_score: buildMaterialScore(result.context_package),
  })
}
```

Do not edit the statements from the existing `Promise.all` through the existing model `res.json()` except for indentation needed by the early return. This preserves model prompts, fallback, writes, warnings, and response fields.

Map known GenerationSource/material errors in the catch block to bounded `{ error, error_code }`; keep the existing 500 behavior for unknown errors.

- [ ] **Step 4: Wire the route context**

In `novel.ts`:

```ts
registerNovelChapterContextRoutes(app, {
  getWorkspace,
  getProject,
  buildChapterContextPackage: writingService.buildChapterContextPackage,
  repairChapterMaterials: writingService.repairChapterMaterials,
})
```

- [ ] **Step 5: Run route and model regression tests**

Run:

```bash
cd ui/server && bun test src/routes/novel-chapter-context-routes.test.ts src/routes/novel-writing-service.chapter-context.core-a.test.ts src/routes/novel-setting-routes.test.ts
```

Expected: PASS, 0 failures. Model route assertions and setting APIs remain green.

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/routes/novel-chapter-context-routes.ts ui/server/src/routes/novel-chapter-context-routes.test.ts ui/server/src/routes/novel.ts
git commit -m "feat(mcp): route manual material repair by project source"
```

## Task 6: Run automatic MCP repair before creating the prose task

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-context-scene-cards.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`
- Test: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.unit.test.ts`
- Test: `ui/server/src/routes/novel-writing-service.chapter-context.core-a.test.ts`

- [ ] **Step 1: Write failing task-order tests**

Inject distinct executions and assert ordering:

```ts
expect(events).toEqual([
  'material:begin',
  'material:material_repair',
  'material:commit',
  'material:close:success',
  'context:reload',
  'prose:begin',
  'prose:draft',
  'prose:close:success',
])
expect(materialSessionId).not.toBe(proseSessionId)
```

Add a model fixture and assert its existing `autoRepairChapterPreflightGaps(..., persist: false)` path is still called while `repairChapterMaterials` is not.

- [ ] **Step 2: Run focused production tests and verify RED**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/generate-chapter-for-group-methods.unit.test.ts src/routes/novel-writing-service.chapter-context.core-a.test.ts
```

Expected: FAIL because automatic repair still runs before GenerationSource creation without an MCP invocation.

- [ ] **Step 3: Inject the new service into production methods**

Add `repairChapterMaterials` to the dependency objects passed from `createNovelWritingService()` into `createGenerateChapterForGroupMethods()` and then into `runGenerateChapterContextAndSceneCards()`.

- [ ] **Step 4: Split only the MCP automatic branch**

In the existing `preflightNeedsMaterialRepair` block:

```ts
const activeGenerationSource = resolveChapterGenerationSource(project).active
if (preflightNeedsMaterialRepair && options.auto_repair_missing_material === true) {
  await onStage('material_repair', {
    status: 'running',
    warnings: contextPackage.preflight.warnings || [],
    blockers: contextPackage.preflight.blockers || [],
  })
  if (activeGenerationSource === 'mcp') {
    const repaired = await repairChapterMaterials({
      activeWorkspace,
      projectId,
      chapterId: chapter.id,
      signal: options.abortSignal,
    })
    chapter = repaired.chapter
    chapters = repaired.chapters
    worldbuilding = repaired.worldbuilding
    characters = repaired.characters
    settings = repaired.settings
    chapterSettingUsage = repaired.chapter_setting_usage
    projectSettingUsage = repaired.project_setting_usage
    contextPackage = repaired.context_package
    stagedPreflightRepair = null
  } else {
    const repairResult = await autoRepairChapterPreflightGaps(
      activeWorkspace,
      project,
      chapter,
      contextPackage,
      preferredModelId,
      { ...llmControlOptions, persist: false },
    )
    stagedPreflightRepair = repairResult
    chapter = repairResult.chapter || chapter
    chapters = chapters.map(item => item.id === chapter.id ? chapter : item)
    worldbuilding = repairResult.worldbuilding || worldbuilding
    characters = repairResult.characters || characters
    settings = repairResult.settings || settings
    chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage
  }
  projectSettingUsage = [
    ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
    ...chapterSettingUsage,
  ]
  wordTarget = resolveChapterWordTarget(project, chapter, options)
  const repairedContextPackage = applyChapterWordTargetToContext(
    activeGenerationSource === 'mcp' ? contextPackage : await buildGenerationContext(),
    wordTarget,
  )
  preparedGeneration = prepareProseGenerationContract(repairedContextPackage, options)
  contextPackage = preparedGeneration.contextPackage
  generationContract = preparedGeneration.contract
  strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
  await onStage('material_repair', {
    status: contextPackage.preflight.ready === true && strictPreflightReadiness.ready ? 'success' : 'warn',
    remaining_warnings: contextPackage.preflight.warnings || [],
    remaining_blockers: contextPackage.preflight.blockers || [],
  })
}
```

Retain the existing repaired write-preparation/launch-gate normalization in the model branch. For MCP, the refreshed context is authoritative and must pass `enforcePreparedGate(false)` before `generationSourceResolver.beginTask()` is called later in `generateChapterForGroupMethods.ts`.

- [ ] **Step 5: Run production and independent-session tests**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/service/generate-chapter-for-group-methods.unit.test.ts src/routes/novel-writing-service.chapter-context.core-a.test.ts src/novel-writing-service/service/chapter-task-stage-routing.test.ts src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: PASS, 0 failures. MCP event order shows material close before prose begin; model fixtures retain the old repair path.

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/novel-writing-service/service/generate-chapter-context-scene-cards.ts ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts ui/server/src/novel-writing-service/service/create-novel-writing-service.ts ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.unit.test.ts ui/server/src/routes/novel-writing-service.chapter-context.core-a.test.ts
git commit -m "feat(mcp): repair materials before prose task"
```

## Task 7: Make the workspace source-aware

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts`
- Test: `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-view-bind-core-handlers.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-preflight-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx`
- Test: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts`
- Test: `ui/web/src/pages/novel-workspace/workspaceUiShell.b-a.test.ts`

- [ ] **Step 1: Write failing source-gate tests**

Add a pure gate test:

```ts
expect(resolveChapterInvocationGate(confirmedAuthorityState(mcpSourceView()), undefined)).toEqual({
  allowed: true,
  active: 'mcp',
  modelId: undefined,
  sourceLabel: 'MCP',
})
expect(resolveChapterInvocationGate(confirmedAuthorityState(modelSourceView()), undefined)).toEqual({
  allowed: false,
  active: 'model',
  modelId: undefined,
  sourceLabel: '大模型 API',
  message: '请先选择写作模型',
})
expect(resolveChapterInvocationGate(authorityUnknownFixture(), 12).allowed).toBe(false)
```

Add handler source assertions that MCP repair sends one request with `repair_keys` and omits `model_id`, while the model branch still calls the three existing endpoints with `model_id`.

- [ ] **Step 2: Run web tests and verify RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/chapterGenerationSourceModel.test.ts src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts src/pages/novel-workspace/workspaceUiShell.b-a.test.ts
```

Expected: FAIL because handlers still require `selectedModelId` unconditionally and do not receive authority state.

- [ ] **Step 3: Add the pure authority gate**

In `chapterGenerationSourceModel.ts`:

```ts
export function resolveChapterInvocationGate(
  authority: ChapterSourceAuthorityState,
  selectedModelId?: number,
) {
  if (authority.authorityUnknown || !authority.source) {
    return {
      allowed: false as const,
      active: null,
      modelId: undefined,
      sourceLabel: '章节来源',
      message: '章节来源权威状态暂时无法确认',
    }
  }
  if (authority.source.source.active === 'mcp') {
    return {
      allowed: true as const,
      active: 'mcp' as const,
      modelId: undefined,
      sourceLabel: 'MCP',
    }
  }
  const modelId = Number(selectedModelId || 0) || undefined
  return modelId
    ? { allowed: true as const, active: 'model' as const, modelId, sourceLabel: '大模型 API' }
    : { allowed: false as const, active: 'model' as const, modelId: undefined, sourceLabel: '大模型 API', message: '请先选择写作模型' }
}
```

- [ ] **Step 4: Pass authority into handlers**

Add `chapterGenerationSourceAuthority` to the object passed by `use-novel-workspace-base-model.tsx`, destructure it in `workspace-view-bind-core-handlers.ts`, and pass it to both `createPreflightHandlers()` and `createChapterProseHandlers()`.

- [ ] **Step 5: Split preflight repair by authoritative source**

At the start of `repairGenerationPreflightGaps()`:

```ts
const gate = resolveChapterInvocationGate(chapterGenerationSourceAuthority, selectedModelId)
if (!gate.allowed) return message.warning(gate.message)
```

After calculating the existing missing keys, add:

```ts
if (gate.active === 'mcp') {
  const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
    project_id: projectId,
    repair_keys: [...missingKeys],
  })
  await loadProjectModules()
  options.closeModal?.()
  const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
  message.success({
    content: applied.length ? `已通过 MCP 自动补齐 ${applied.length} 项材料` : '材料已刷新',
    key: messageKey,
    duration: 3,
  })
  options.continueAfterRepair?.()
  return
}
```

Leave the existing character/setting/usage model endpoint sequence below this branch, using `gate.modelId` in the same `model_id` fields.

- [ ] **Step 6: Replace unconditional prose model checks**

In `generateCurrentChapterProse`, `repairContextAndGenerateCurrentChapter`, and `stepGenerateProse`, resolve the gate and warn only when it is blocked. Build request bodies with:

```ts
const generationSourcePayload = gate.active === 'model'
  ? { model_id: gate.modelId }
  : {}

body: JSON.stringify({
  project_id: projectId,
  ...generationSourcePayload,
  ...chapterWordTargetPayload(),
  prompt: `请生成第 ${targetChapter.chapter_no} 章《${displayValue(targetChapter.title)}》完整正文`,
  payload: ctx,
  allow_incomplete: Boolean(options.allowIncomplete),
  force_scene_cards: Boolean(options.forceSceneCards),
})
```

The repair-and-generate MCP body must likewise omit `model_id`. The model branch retains the same numeric value and messages. Do not alter editor, planning, commercial, or chapter-production-external handlers in this task.

After the repair response and `loadProjectModules()` complete, continue with strict admission rather than the current bypass:

```ts
await generateCurrentChapterProse({
  allowIncomplete: false,
  forceSceneCards: true,
  targetChapterId,
})
```

Add a handler assertion that `repairContextAndGenerateCurrentChapter` never resumes with `allowIncomplete: true`.

- [ ] **Step 7: Run focused web tests and build**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/chapterGenerationSourceModel.test.ts src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts src/pages/novel-workspace/workspaceUiShell.b-a.test.ts
cd ui/web && bun run build
```

Expected: tests PASS, build succeeds, MCP payloads contain no `model_id`, and model payloads remain unchanged.

- [ ] **Step 8: Commit**

```bash
git add ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx ui/web/src/pages/novel-workspace/shell/workspace-view-bind-core-handlers.ts ui/web/src/pages/novel-workspace/shell/workspace-preflight-handlers.tsx ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts ui/web/src/pages/novel-workspace/workspaceUiShell.b-a.test.ts
git commit -m "fix(web): gate chapter actions by active source"
```

## Task 8: Run regression gates and audit the diff

**Files:**
- Modify only files required by failures proven in this task.

- [ ] **Step 1: Run all GenerationSource and MCP tests**

Run:

```bash
cd ui/server && bun test src/novel-writing-service/generation-source src/mcp
```

Expected: PASS, 0 failures. Generic non-Buda MCP behavior remains green.

- [ ] **Step 2: Run the full server suite**

Run:

```bash
cd ui/server && bun test
```

Expected: PASS, 0 failures. Existing model API, setting, prose, review, revision, Story State, persistence, and route tests all remain green.

- [ ] **Step 3: Run the full web suite**

Run:

```bash
cd ui/web && bun test
```

Expected: PASS, 0 failures.

- [ ] **Step 4: Run repository build gates**

Run:

```bash
bun run check
```

Expected: refactor-boundary check, server build, and web build all succeed.

- [ ] **Step 5: Audit provider neutrality and API preservation**

Run:

```bash
rg -n "buda|Buda" ui/server/src/novel-writing-service/service/material-repair-contract.ts ui/server/src/novel-writing-service/service/material-repair-service.ts
git diff c90f96cd -- ui/server/src/routes/novel-chapter-context-routes.ts
git status --short
```

Expected:

- the first command has no output;
- the route diff shows one MCP early branch while the existing model block retains its prompt, `executeNovelAgent`, local fallback, warning, and response logic;
- only intentional implementation/test files plus the user's existing `ui/server/.workspace-config.json` and `workspace/assets.json` changes are present;
- neither user-owned file is staged.

If a regression gate fails, return to the task that owns that file, add a failing regression test there, and repeat that task's exact test and commit steps. Do not create an unscoped cleanup commit. Never stage `ui/server/.workspace-config.json` or `workspace/assets.json`.

## Task 9: Perform two-account browser acceptance and push `main`

**Files:**
- No source changes expected.
- Runtime-only local files remain unstaged.

- [ ] **Step 1: Start fresh server and web processes**

Run in separate terminals:

```bash
bun run dev:server
```

```bash
bun run dev:web
```

Expected: server listens on `http://localhost:8787`; web listens on `http://127.0.0.1:5173` or the Vite-reported local URL.

- [ ] **Step 2: Validate the first test account entirely from the page**

Using the in-app browser and the already authorized test account:

1. Open or create a fresh MCP-bound novel project.
2. Confirm the page shows MCP as the active unique source and no API model is selected.
3. Open chapter 1 and click “补齐材料”.
4. Wait for the page operation to finish; do not seed materials through direct API calls.
5. Verify the page refreshes worldbuilding, at least two character cards, setting workshop entries, chapter setting usages, Story State/preflight, and material score.
6. Verify strict preflight reports ready.
7. Click page “生成正文” and wait for the chapter text to appear.
8. Record only bounded evidence: project ID, local task IDs, source type, counts, scores, terminal statuses, and redacted Session suffixes.

Expected: repair succeeds without `selectedModelId`; prose succeeds; the material stage has one Session receipt and prose has a different Session receipt; source is MCP throughout; quarantine count does not increase.

- [ ] **Step 3: Validate the second test account independently**

Repeat the same page-only flow with the second authorized account and a different fresh project. Do not reuse the first account's Agent, binding, remote Session, or project material.

Expected: the same results independently confirm the generic flow. No Buda-specific branch is needed in the project/service code.

- [ ] **Step 4: Reconcile ambiguous outcomes before retrying**

If the UI reports an uncertain mutation:

1. Stop retrying the button.
2. Reload authoritative local run, artifact, project, material, and quarantine state.
3. Read the bounded remote terminal state through the existing reconciliation path.
4. Retry only when the existing receipt rules prove the previous mutation was not committed.

Expected: no duplicate remote Agent Session is created for an ambiguous material mutation.

- [ ] **Step 5: Stop services and rerun final gates**

Terminate the two dev processes, then run:

```bash
cd ui/server && bun test
cd ../web && bun test
cd ../.. && bun run check
git status --short
git diff --cached --name-only
```

Expected: all tests/builds pass; cached diff contains no credential/config/runtime files; `ui/server/.workspace-config.json` and `workspace/assets.json` remain unstaged user changes.

- [ ] **Step 6: Push the verified branch**

Run:

```bash
git push origin main
```

Expected: push succeeds and `git status -sb` shows `main` aligned with `origin/main` apart from the two known unstaged user files.

Do not include test account addresses, passwords, MCP Keys, custom headers, complete Agent IDs, complete Session IDs, remote full errors, or generated prose in commits or the final acceptance report.
