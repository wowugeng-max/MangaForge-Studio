# Skill Compiler Source Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Canvas GenerateNode's flat Skill compiler model dropdown with linked source and model selectors that expose the supplying API Key or Provider without changing the persisted compiler-model contract.

**Architecture:** Add a pure selector view-model boundary to `generate-node-model.ts` that normalizes eligible compiler models, groups them by active Key or legacy Provider source, and derives workspace-default, explicit override, and unavailable display states. Keep `GenerateNode.tsx` responsible for collecting every server-filtered active Key page, loading model/settings data, waiting for all three dependencies to settle, rendering two Ant Design selects, and translating a source change immediately into the existing `skillCompilerModelId`; no source field is stored or sent to the server.

**Tech Stack:** React 18, TypeScript, Ant Design 5 `Space.Compact`/`Select`, Bun test, existing Canvas Skill settings and model APIs.

---

### Task 1: Build the pure compiler source selector model

**Files:**
- Modify: `ui/web/src/components/nodes/generate-node-model.ts` near `normalizeGenerateNodeCompilerModelId`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts` in the existing GenerateNode Skill/compiler model tests

- [ ] **Step 1: Write failing tests for eligibility, Key labels, legacy sources, model labels, and source ordering**

Add this loader beside the existing `loadGenerateNodeReferenceApi`, then add the test to `ui/web/src/components/nodes/generateNode.test.ts`:

```ts
async function loadGenerateNodeCompilerSelectorApi() {
  return import('./generate-node-model')
}

test('groups eligible Skill compiler models by active Key and legacy source', async () => {
  const model = await loadGenerateNodeCompilerSelectorApi()
  const keys = [
    { id: 1, description: '主绘画 Key', provider: 'openai', is_active: true },
    { id: 2, description: '', provider: 'anthropic', is_active: true },
    { id: 3, description: '', provider: '', is_active: true },
  ]
  const models = [
    { id: 11, api_key_id: 1, display_name: 'Compiler A', model_name: 'compiler-a', is_favorite: false, is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 12, api_key_id: 2, display_name: '', model_name: 'compiler-b', is_favorite: true, is_active: true, health_status: 'healthy', capabilities: { chat: true, vision: true } },
    { id: 13, api_key_id: 3, display_name: 'Compiler C', model_name: 'compiler-c', is_favorite: false, is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 14, api_key_id: 99, provider: 'legacy-provider', display_name: 'Legacy', model_name: 'legacy', is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 15, display_name: 'Unbound', model_name: 'unbound', is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 16, api_key_id: 1, display_name: 'Inactive', is_active: false, capabilities: { chat: true } },
    { id: 17, api_key_id: 1, display_name: 'Disabled', is_active: true, health_status: 'disabled', capabilities: { chat: true } },
    { id: 18, api_key_id: 1, display_name: 'Image only', is_active: true, health_status: 'healthy', capabilities: { chat: false } },
  ]

  expect(models.map(model.isGenerateNodeCompilerModelEligible)).toEqual([
    true, true, true, true, true, false, false, false,
  ])

  const selector = model.buildGenerateNodeCompilerSelectorModel({
    keys,
    models,
    overrideModelId: 12,
    workspaceDefaultModelId: 11,
  })

  expect(selector.sourceOptions).toEqual([
    { value: 'workspace-default', label: '工作区默认 · 主绘画 Key' },
    { value: 'key:1', label: '主绘画 Key' },
    { value: 'key:2', label: 'anthropic' },
    { value: 'key:3', label: 'Key 3' },
    { value: 'provider:legacy-provider', label: 'legacy-provider' },
    { value: 'unbound', label: '未绑定来源' },
  ])
  expect(selector.sourceValue).toBe('key:2')
  expect(selector.modelOptions).toEqual([
    { value: 12, label: 'compiler-b · Vision' },
  ])
  expect(selector.modelValue).toBe(12)
  expect(selector.modelDisabled).toBe(false)
})
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts -t "groups eligible Skill compiler models"`

Expected: FAIL because `isGenerateNodeCompilerModelEligible` and `buildGenerateNodeCompilerSelectorModel` are not exported.

- [ ] **Step 3: Add the selector types and minimal grouping implementation**

Add the following beside `normalizeGenerateNodeCompilerModelId` in `ui/web/src/components/nodes/generate-node-model.ts`:

```ts
export type GenerateNodeCompilerKey = {
  id: unknown
  description?: unknown
  provider?: unknown
  is_active?: unknown
}

export type GenerateNodeCompilerModel = {
  id: unknown
  api_key_id?: unknown
  provider?: unknown
  display_name?: unknown
  model_name?: unknown
  is_favorite?: unknown
  is_active?: unknown
  health_status?: unknown
  capabilities?: Record<string, unknown> | null
}

export type GenerateNodeCompilerSourceValue =
  | 'workspace-default'
  | 'unavailable'
  | 'unbound'
  | `key:${number}`
  | `provider:${string}`

export type GenerateNodeCompilerSelectOption = {
  value: string | number
  label: string
}

type GenerateNodeCompilerSourceGroup = {
  value: Exclude<GenerateNodeCompilerSourceValue, 'workspace-default' | 'unavailable'>
  label: string
  models: Array<GenerateNodeCompilerModel & { id: number }>
}

export type GenerateNodeCompilerSelectorModel = {
  sourceValue: GenerateNodeCompilerSourceValue
  sourceOptions: GenerateNodeCompilerSelectOption[]
  modelValue: string | number
  modelOptions: GenerateNodeCompilerSelectOption[]
  modelDisabled: boolean
}

export function isGenerateNodeCompilerModelEligible(model: GenerateNodeCompilerModel) {
  return model.is_active !== false
    && model.health_status !== 'disabled'
    && model.capabilities?.chat === true
    && normalizeGenerateNodeCompilerModelId(model.id) !== null
}

function compilerText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getGenerateNodeCompilerModelLabel(model: GenerateNodeCompilerModel & { id: number }) {
  const name = compilerText(model.display_name) || compilerText(model.model_name) || `模型 #${model.id}`
  return `${name}${model.capabilities?.vision === true ? ' · Vision' : ''}`
}

function buildGenerateNodeCompilerSourceGroups(input: {
  keys: readonly GenerateNodeCompilerKey[]
  models: readonly GenerateNodeCompilerModel[]
}): GenerateNodeCompilerSourceGroup[] {
  const activeKeys = new Map(input.keys.filter(key => key.is_active !== false).flatMap(key => {
    const id = normalizeGenerateNodeCompilerModelId(key.id)
    return id === null ? [] : [[id, key] as const]
  }))
  const groups: GenerateNodeCompilerSourceGroup[] = []

  input.models.filter(isGenerateNodeCompilerModelEligible).forEach(rawModel => {
    const id = normalizeGenerateNodeCompilerModelId(rawModel.id)
    if (id === null) return
    const model = { ...rawModel, id }
    const keyId = normalizeGenerateNodeCompilerModelId(model.api_key_id)
    const key = keyId === null ? undefined : activeKeys.get(keyId)
    const provider = compilerText(model.provider)
    const value: GenerateNodeCompilerSourceGroup['value'] = key && keyId !== null
      ? `key:${keyId}`
      : provider
        ? `provider:${provider}`
        : 'unbound'
    const label = key && keyId !== null
      ? compilerText(key.description) || compilerText(key.provider) || `Key ${keyId}`
      : provider || '未绑定来源'
    let group = groups.find(candidate => candidate.value === value)
    if (!group) {
      group = { value, label, models: [] }
      groups.push(group)
    }
    group.models.push(model)
  })

  return groups
}
```

Then implement the initial `buildGenerateNodeCompilerSelectorModel` with the exact complete/default behavior described in Step 5 below; do not leave a partial stub between RED/GREEN runs.

- [ ] **Step 4: Add failing tests for workspace inheritance, stale IDs, and deterministic source changes**

Add these tests after the grouping test:

```ts
test('shows configured, unconfigured, and unavailable workspace compiler defaults without creating an override', async () => {
  const model = await loadGenerateNodeCompilerSelectorApi()
  const keys = [{ id: 1, description: '绘画 Key', provider: 'openai', is_active: true }]
  const models = [{ id: 11, api_key_id: 1, display_name: 'Compiler', is_active: true, health_status: 'healthy', capabilities: { chat: true, vision: true } }]

  expect(model.buildGenerateNodeCompilerSelectorModel({ keys, models, overrideModelId: null, workspaceDefaultModelId: 11 })).toMatchObject({
    sourceValue: 'workspace-default',
    sourceOptions: [{ value: 'workspace-default', label: '工作区默认 · 绘画 Key' }, { value: 'key:1', label: '绘画 Key' }],
    modelValue: 11,
    modelOptions: [{ value: 11, label: 'Compiler · Vision' }],
    modelDisabled: true,
  })
  expect(model.buildGenerateNodeCompilerSelectorModel({ keys, models, overrideModelId: null, workspaceDefaultModelId: null })).toMatchObject({
    sourceOptions: [{ value: 'workspace-default', label: '工作区默认' }, { value: 'key:1', label: '绘画 Key' }],
    modelValue: 'workspace-default-unconfigured',
    modelOptions: [{ value: 'workspace-default-unconfigured', label: '未配置' }],
    modelDisabled: true,
  })
  expect(model.buildGenerateNodeCompilerSelectorModel({ keys, models, overrideModelId: null, workspaceDefaultModelId: 99 })).toMatchObject({
    sourceOptions: [{ value: 'workspace-default', label: '工作区默认 · 来源不可用' }, { value: 'key:1', label: '绘画 Key' }],
    modelValue: 99,
    modelOptions: [{ value: 99, label: '模型 #99 · 不可用' }],
    modelDisabled: true,
  })
})

test('preserves a stale explicit compiler model and chooses favorite-first on source changes', async () => {
  const model = await loadGenerateNodeCompilerSelectorApi()
  const keys = [
    { id: 1, description: 'Key A', is_active: true },
    { id: 2, description: 'Key B', is_active: true },
  ]
  const models = [
    { id: 11, api_key_id: 1, display_name: 'A1', is_favorite: false, is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 12, api_key_id: 1, display_name: 'A2', is_favorite: true, is_active: true, health_status: 'healthy', capabilities: { chat: true } },
    { id: 21, api_key_id: 2, display_name: 'B1', is_favorite: false, is_active: true, health_status: 'healthy', capabilities: { chat: true } },
  ]

  expect(model.buildGenerateNodeCompilerSelectorModel({ keys, models, overrideModelId: 99, workspaceDefaultModelId: 11 })).toMatchObject({
    sourceValue: 'unavailable',
    sourceOptions: [
      { value: 'workspace-default', label: '工作区默认 · Key A' },
      { value: 'key:1', label: 'Key A' },
      { value: 'key:2', label: 'Key B' },
      { value: 'unavailable', label: '来源不可用' },
    ],
    modelValue: 99,
    modelOptions: [{ value: 99, label: '模型 #99 · 不可用' }],
    modelDisabled: true,
  })
  expect(model.resolveGenerateNodeCompilerModelIdForSource({ keys, models, sourceValue: 'key:1' })).toBe(12)
  expect(model.resolveGenerateNodeCompilerModelIdForSource({ keys, models, sourceValue: 'key:2' })).toBe(21)
  expect(model.resolveGenerateNodeCompilerModelIdForSource({ keys, models, sourceValue: 'workspace-default' })).toBeNull()
})
```

- [ ] **Step 5: Run RED, then implement the complete selector derivation and source transition**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts -t "workspace compiler defaults|stale explicit compiler model"`

Expected: FAIL until default/unavailable rendering and source transition are implemented.

Add these functions below the grouping helper in `generate-node-model.ts`:

```ts
function unavailableCompilerModelOption(id: number): GenerateNodeCompilerSelectOption {
  return { value: id, label: `模型 #${id} · 不可用` }
}

export function buildGenerateNodeCompilerSelectorModel(input: {
  keys: readonly GenerateNodeCompilerKey[]
  models: readonly GenerateNodeCompilerModel[]
  overrideModelId: unknown
  workspaceDefaultModelId: unknown
}): GenerateNodeCompilerSelectorModel {
  const groups = buildGenerateNodeCompilerSourceGroups(input)
  const overrideId = normalizeGenerateNodeCompilerModelId(input.overrideModelId)
  const defaultId = normalizeGenerateNodeCompilerModelId(input.workspaceDefaultModelId)
  const defaultGroup = defaultId === null
    ? undefined
    : groups.find(group => group.models.some(model => model.id === defaultId))
  const defaultModel = defaultGroup?.models.find(model => model.id === defaultId)
  const workspaceOption = defaultId === null
    ? { value: 'workspace-default', label: '工作区默认' }
    : defaultGroup
      ? { value: 'workspace-default', label: `工作区默认 · ${defaultGroup.label}` }
      : { value: 'workspace-default', label: '工作区默认 · 来源不可用' }
  const sourceOptions: GenerateNodeCompilerSelectOption[] = [
    workspaceOption,
    ...groups.map(group => ({ value: group.value, label: group.label })),
  ]

  if (overrideId === null) {
    if (defaultId === null) {
      return {
        sourceValue: 'workspace-default',
        sourceOptions,
        modelValue: 'workspace-default-unconfigured',
        modelOptions: [{ value: 'workspace-default-unconfigured', label: '未配置' }],
        modelDisabled: true,
      }
    }
    return {
      sourceValue: 'workspace-default',
      sourceOptions,
      modelValue: defaultId,
      modelOptions: defaultModel
        ? [{ value: defaultId, label: getGenerateNodeCompilerModelLabel(defaultModel) }]
        : [unavailableCompilerModelOption(defaultId)],
      modelDisabled: true,
    }
  }

  const selectedGroup = groups.find(group => group.models.some(model => model.id === overrideId))
  if (!selectedGroup) {
    return {
      sourceValue: 'unavailable',
      sourceOptions: [...sourceOptions, { value: 'unavailable', label: '来源不可用' }],
      modelValue: overrideId,
      modelOptions: [unavailableCompilerModelOption(overrideId)],
      modelDisabled: true,
    }
  }

  return {
    sourceValue: selectedGroup.value,
    sourceOptions,
    modelValue: overrideId,
    modelOptions: selectedGroup.models.map(model => ({ value: model.id, label: getGenerateNodeCompilerModelLabel(model) })),
    modelDisabled: false,
  }
}

export function resolveGenerateNodeCompilerModelIdForSource(input: {
  keys: readonly GenerateNodeCompilerKey[]
  models: readonly GenerateNodeCompilerModel[]
  sourceValue: GenerateNodeCompilerSourceValue
}): number | null {
  if (input.sourceValue === 'workspace-default') return null
  const group = buildGenerateNodeCompilerSourceGroups(input).find(candidate => candidate.value === input.sourceValue)
  const preferred = group?.models.find(model => model.is_favorite) || group?.models[0]
  return preferred?.id ?? null
}
```

- [ ] **Step 6: Run the complete focused suite and commit the pure model boundary**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts`

Expected: PASS with zero failures, including the existing compiler ID normalization and Skill request tests.

Commit only the model and test files:

```bash
git add ui/web/src/components/nodes/generate-node-model.ts ui/web/src/components/nodes/generateNode.test.ts
git commit -m "feat: model Skill compiler sources"
```

### Task 2: Wire the linked source and model controls into GenerateNode

**Files:**
- Modify: `ui/web/src/components/nodes/generate-node-model.ts` near the compiler selector helpers
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx:700-705`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx:1532-1545`
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx:1932-1941`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`

- [ ] **Step 1: Write a failing source-level integration test for the compact linked controls**

Add this test in `ui/web/src/components/nodes/generateNode.test.ts`:

```ts
test('renders linked Skill compiler source and model selectors without changing the normal model selector', () => {
  const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
  const compilerStart = source.indexOf('Skill 编译模型</Text>')
  const compilerEnd = source.indexOf('hasEffectiveSkill && !effectiveSkillSelectionError', compilerStart)
  const compilerControl = source.slice(compilerStart, compilerEnd)

  expect(compilerControl).toContain('<Space.Compact block>')
  expect(compilerControl).toContain('aria-label="Skill 编译模型来源"')
  expect(compilerControl).toContain('options={compilerSelector.sourceOptions}')
  expect(compilerControl).toContain('resolveGenerateNodeCompilerModelIdForSource({')
  expect(compilerControl).toContain('aria-label="Skill 编译模型"')
  expect(compilerControl).toContain('options={compilerSelector.modelOptions}')
  expect(compilerControl).toContain('disabled={compilerSelectorLoading || compilerSelector.modelDisabled}')
  expect(source).not.toContain('const compilerModelOptions =')

  const normalSelectorStart = source.indexOf('placeholder="选择 Key"')
  const normalSelectorEnd = source.indexOf('</Space.Compact>', normalSelectorStart)
  const normalSelector = source.slice(normalSelectorStart, normalSelectorEnd)
  expect(normalSelector).toContain('options={keys.map')
  expect(normalSelector).toContain('options={selectableModels.map')
  expect(normalSelector).toContain('showOnlyFavorites')
})
```

- [ ] **Step 2: Run the focused integration test and verify RED**

Run: `cd ui/web && bun test src/components/nodes/generateNode.test.ts -t "renders linked Skill compiler source"`

Expected: FAIL because the component still renders one flat `compilerModelOptions` select.

- [ ] **Step 3: Load complete active Key sources and reuse the eligibility helper**

Add a reusable `collectGenerateNodeActiveKeys` helper in `generate-node-model.ts`.
It requests pages in order, preserves record order and input immutability, uses
`1000` as the production default page size, filters inactive defensive input,
and stops after the first short page.

Replace the single-page Key request with complete server-filtered pagination:

```ts
collectGenerateNodeActiveKeys({
  fetchPage: async (skip, limit) => {
    const res = await apiClient.get('/keys/', {
      params: { is_active: true, skip, limit },
    })
    return Array.isArray(res.data) ? res.data : []
  },
})
  .then(activeKeys => {
    setKeys(activeKeys)
    setSelectedKey(current => current || (activeKeys[0]?.id ? Number(activeKeys[0].id) : null))
  })
  .catch(() => setKeys([]))
  .finally(() => setCompilerKeysLoaded(true))
```

The `.finally` is required: success and failure both settle the compiler-source
gate. On failure, an empty Key list intentionally yields Provider/unbound legacy
groups rather than a permanently disabled control. Preserve the ordinary
default-selected-Key behavior and catch fallback exactly as shown.

In the `/models/` load effect, replace the inline predicate only; keep the request and error/loading behavior unchanged:

```ts
apiClient.get('/models/')
  .then(res => {
    if (cancelled) return
    const models = Array.isArray(res.data) ? res.data : []
    setCompilerModels(models.filter(isGenerateNodeCompilerModelEligible))
  })
  .catch(() => { if (!cancelled) setCompilerModels([]) })
  .finally(() => { if (!cancelled) setCompilerModelsLoaded(true) })
```

Add these values to the existing named import from `./generate-node-model` at the top of `GenerateNode.tsx`:

```ts
buildGenerateNodeCompilerSelectorModel,
collectGenerateNodeActiveKeys,
isGenerateNodeCompilerModelEligible,
resolveGenerateNodeCompilerModelIdForSource,
```

The component already uses explicit named imports from `generate-node-model.ts`; do not create a second model import or move selector logic into the component.

- [ ] **Step 4: Replace the flat options array with one memoized selector view model**

Delete `workspaceCompilerModel`, `compilerModelOptions`, and the stale-option push at the current `GenerateNode.tsx:1532-1545`. Add:

```ts
const compilerSelector = useMemo(() => buildGenerateNodeCompilerSelectorModel({
  keys,
  models: compilerModels,
  overrideModelId: skillCompilerModelId,
  workspaceDefaultModelId: skillSettings?.skill_compiler_model_id ?? null,
}), [compilerModels, keys, skillCompilerModelId, skillSettings?.skill_compiler_model_id])
const compilerSelectorLoading = !compilerKeysLoaded || !skillSettingsLoaded || !compilerModelsLoaded
```

Do not add source state. `compilerSelector.sourceValue` remains derived from the numeric override and the current Key/model data. Both selects stay loading/disabled until complete Keys, Skill settings, and compiler models have settled.

- [ ] **Step 5: Render the compact selectors and map both changes to the existing model ID state**

Replace the existing single `Select` under `Skill 编译模型` with:

```tsx
<Space.Compact block>
  <Select
    aria-label="Skill 编译模型来源"
    size="small"
    value={compilerSelector.sourceValue}
    options={compilerSelector.sourceOptions}
    loading={compilerSelectorLoading}
    disabled={compilerSelectorLoading}
    onChange={value => setSkillCompilerModelId(resolveGenerateNodeCompilerModelIdForSource({
      keys,
      models: compilerModels,
      sourceValue: value,
    }))}
    style={{ width: 140 }}
  />
  <Select
    aria-label="Skill 编译模型"
    size="small"
    value={compilerSelector.modelValue}
    options={compilerSelector.modelOptions}
    loading={compilerSelectorLoading}
    disabled={compilerSelectorLoading || compilerSelector.modelDisabled}
    onChange={value => setSkillCompilerModelId(Number(value))}
    style={{ flex: 1, minWidth: 0 }}
  />
</Space.Compact>
```

Selecting `workspace-default` therefore writes `null`; selecting a concrete source writes its favorite-first model ID; selecting a model continues writing only the numeric `skillCompilerModelId` already persisted and sent by existing code.

- [ ] **Step 6: Run the focused suite and build, then commit the final Task 2 correction**

Run:

```bash
cd ui/web
bun test src/components/nodes/generateNode.test.ts
bun run build
```

Expected: both commands exit 0. The source integration test sees two linked selects; all existing Skill compile request/persistence tests still pass.

Commit only the five existing feature files:

```bash
git add docs/superpowers/specs/2026-08-12-skill-compiler-source-selector-design.md \
  docs/superpowers/plans/2026-08-12-skill-compiler-source-selector.md \
  ui/web/src/components/nodes/GenerateNode.tsx \
  ui/web/src/components/nodes/generate-node-model.ts \
  ui/web/src/components/nodes/generateNode.test.ts
git commit -m "fix: load all Skill compiler sources"
```

### Task 3: Verify the Canvas-only compatibility boundary

**Files:**
- Verify: `ui/web/src/components/nodes/generate-node-model.ts`
- Verify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Verify: `ui/web/src/components/nodes/generateNode.test.ts`
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts` for the paginated Key request contract
- Do not modify: `ui/web/src/pages/novel-workspace/**`
- Preserve unstaged: `workspace/assets.json`
- Preserve untracked: `workspace/.mangaforge/`

- [ ] **Step 1: Run focused and broader Canvas regressions**

Run:

```bash
cd ui/web
bun test src/components/nodes/generateNode.test.ts src/pages/canvasPageMigration.test.ts
bun test src/components/nodes
```

Expected: zero failures. This covers pure selector behavior, GenerateNode source wiring, Canvas migration, existing multi-reference behavior, and compiler request persistence.

- [ ] **Step 2: Run repository boundary and production build checks**

Run from the repository root:

```bash
bun run check:refactor-boundaries
bun run build:server
bun run build:web
```

Expected: all three commands exit 0. If `build:server` reports only the repository's already-documented `restored-src` missing `jszip`, `yaml`, or `zod/v4/core/json-schema.js` dependency blocker, record the exact output and do not change `restored-src` for this Canvas-only feature.

- [ ] **Step 3: Audit the final diff and protected local files**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: the range diff check exits 0; implementation changes are limited to the two GenerateNode source files, their focused and Canvas migration tests, this plan, and the approved design spec. `workspace/assets.json` remains modified but unstaged, and `workspace/.mangaforge/` remains untracked.

- [ ] **Step 4: Review the acceptance boundary before integration**

Confirm from tests and diff that:

```text
source label precedence = Key description -> Key provider -> Key ID
eligible compiler model = active && health_status !== disabled && capabilities.chat === true
active Keys = server-filtered and paginated to completion before selectors are interactive
Key load failure = settled gate with Provider/unbound legacy fallback
workspace default = null override + read-only actual model display
concrete source change = first favorite in server order, otherwise first model
legacy source = provider group or unbound group
stale explicit model = visible unavailable source/model
persisted and request contract = skillCompilerModelId / skill_compiler_model_id only
normal GenerateNode execution selector = unchanged
novel workspace = unchanged
```

Expected: every line is satisfied with no new backend endpoint, schema, favorite toggle, or source persistence field.

---

## Execution Evidence

- Pure selector model cycle: focused RED `0/9`, focused GREEN `9/9`, then the
  GenerateNode suite passed `130/130` at that stage.
- Linked UI cycle: focused RED `0/1`, focused GREEN `1/1`, then the GenerateNode
  suite passed `131/131`.
- Keys settled-gate cycle: focused RED `0/1`, focused GREEN `1/1`, then the
  GenerateNode suite passed `132/132`.
- Complete-Key pagination cycle: the four-test focused RED run passed `1/4` and
  failed `3/4` with 130 tests filtered and 33 assertions; focused GREEN passed
  `4/4` with 130 tests filtered and 46 assertions.
- Web production builds passed with only the repository's existing dynamic
  import and chunk-size warnings.

---

## Plan Self-Review

- Spec coverage: Tasks 1–2 cover source-label precedence, eligible-model filtering, Key/Provider/unbound grouping, Vision labels, workspace inheritance states, stale overrides, deterministic favorite-first selection, compact linked controls, and the unchanged numeric persistence contract. Task 3 covers Canvas-only scope, normal-selector preservation, build/regression checks, and protected local files.
- Placeholder scan: the plan contains no deferred implementation steps; every RED/GREEN change includes exact tests, implementation, commands, and expected outcomes.
- Type consistency: `collectGenerateNodeActiveKeys`, `GenerateNodeCompilerSourceValue`, `GenerateNodeCompilerSelectorModel`, `buildGenerateNodeCompilerSelectorModel`, `isGenerateNodeCompilerModelEligible`, and `resolveGenerateNodeCompilerModelIdForSource` use the same names and value shapes in tests, implementation, and component wiring.
