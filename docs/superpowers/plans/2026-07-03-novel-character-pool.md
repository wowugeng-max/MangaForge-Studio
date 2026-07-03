# Novel Character Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich novel project character design so creation, deep incubation, and unattended writing preflight maintain a tiered character pool with supporting roles and antagonist layers.

**Architecture:** Extend the existing oh-story character design contract and seed flow instead of adding a new workspace entry. Normalize grouped and flat seed roles into the existing `characters` table, preserve tier metadata in `raw_payload`, and make unattended preflight repair create missing roles with tier-aware limits. The UI only groups the existing incubation preview.

**Tech Stack:** TypeScript, Bun test runner, Express route helpers, React/Ant Design workspace UI.

---

### Task 1: Contract And Seed Prompt Coverage

**Files:**
- Modify: `ui/server/src/routes/novel-character-design-contract.ts`
- Modify: `ui/server/src/routes/novel-core-routes.ts`
- Test: `ui/server/src/routes/novel-core-routes.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that assert project creation prompts require the new layered role pool and antagonist logic:

```ts
test('project seed prompt requires layered supporting and antagonist character pools', async () => {
  const { buildProjectSeedPrompt } = await import('./novel-core-routes')

  const prompt = buildProjectSeedPrompt('都市高武，底层学生靠碎片化金手指升级打怪挣钱', '拳证星河', 'epic')

  expect(prompt).toContain('primary_supporting')
  expect(prompt).toContain('secondary_supporting')
  expect(prompt).toContain('cameo_supporting')
  expect(prompt).toContain('antagonist_primary')
  expect(prompt).toContain('antagonist_arc')
  expect(prompt).toContain('antagonist_minor')
  expect(prompt).toContain('faction_agent')
  expect(prompt).toContain('antagonist_logic')
  expect(prompt).toContain('relationship_to_protagonist')
  expect(prompt).toContain('first_appearance_chapter')
})

test('project seed recovery prompt keeps layered character pool requirements', async () => {
  const { buildProjectSeedRecoveryPrompt } = await import('./novel-core-routes')

  const prompt = buildProjectSeedRecoveryPrompt(
    { title: '拳证星河', characters: [{ name: '周凛', role_type: 'protagonist' }] },
    { missing_fields: ['characters'] },
    '都市高武，底层学生靠碎片化金手指升级打怪挣钱',
    '拳证星河',
    'long',
  )

  expect(prompt).toContain('角色池分层')
  expect(prompt).toContain('primary_supporting')
  expect(prompt).toContain('antagonist_minor')
  expect(prompt).toContain('faction_agent')
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "layered.*character|recovery prompt keeps layered"
```

Expected: FAIL because the current prompts do not mention every layered tier.

- [ ] **Step 3: Implement contract fields**

Update `buildOhStoryCharacterDesignContract` to return:

```ts
character_pool_tiers: [
  { role_type: 'protagonist', minimum: 1, function: '核心视角/驱动角色' },
  { role_type: 'primary_supporting', minimum: 3, function: '主要配角，承担关系、资源、情绪或任务基地功能' },
  { role_type: 'secondary_supporting', minimum: 4, function: '次要配角，承接支线、世界纹理和压力传递' },
  { role_type: 'cameo_supporting', minimum: 4, function: '龙套/功能配角，只在具体事件中提供证据、阻碍、信息或反应' },
  { role_type: 'antagonist_primary', minimum: 1, function: '核心反派/长线敌意来源' },
  { role_type: 'antagonist_arc', minimum: 2, function: '阶段反派/分卷对手' },
  { role_type: 'antagonist_minor', minimum: 4, function: '小反派、局部阻碍者、反派配角' },
  { role_type: 'faction_agent', minimum: 3, function: '势力执行者，代表组织规则和资源压迫' },
]
```

Also add `role_pool_schema`, `antagonist_logic_schema`, and quality checks requiring `tier`, `narrative_function`, `relationship_to_protagonist`, `first_appearance_chapter`, `active_range`, `voice_anchor`, `signature_action`, `secret_or_pressure`, and `exit_or_turning_point`.

Update `buildProjectSeedPrompt`, `buildProjectSeedRecoveryPrompt`, and `buildFinalizeProjectSeedPrompt` output instructions to accept grouped role arrays and require the same schema.

- [ ] **Step 4: Run tests to verify pass**

Run the same Bun command from Step 2. Expected: PASS.

### Task 2: Seed Character Normalization And Materialization

**Files:**
- Modify: `ui/server/src/routes/novel-core-routes.ts`
- Test: `ui/server/src/routes/novel-core-routes.test.ts`

- [ ] **Step 1: Write failing test**

Add a test that exercises `buildMaterializedSeedCharacters` through an exported helper:

```ts
test('normalizes grouped layered seed roles into deduplicated materialized characters', async () => {
  const { buildMaterializedSeedCharactersForTest } = await import('./novel-core-routes')

  const characters = buildMaterializedSeedCharactersForTest({
    protagonist: { name: '周凛', goal: '保住妹妹手术费' },
    character_pool: {
      primary_supporting: [{ name: '林澈', goal: '查清黑钱来源', relationship_to_protagonist: '互相利用' }],
      antagonist_minor: [{ name: '赵衡', antagonist_logic: { belief: '资源只配给强者' } }],
      faction_agent: [{ name: '巡考员甲', narrative_function: '执行联考规则压迫' }],
    },
    characters: [{ name: '林澈', role_type: 'primary_supporting', motivation: '避免被家族牺牲' }],
  })

  expect(characters.map((item: any) => item.name)).toEqual(['林澈', '赵衡', '巡考员甲', '周凛'])
  expect(characters.find((item: any) => item.name === '林澈')).toMatchObject({
    role_type: 'primary_supporting',
    tier: 'primary_supporting',
    relationship_to_protagonist: '互相利用',
    motivation: '避免被家族牺牲',
  })
  expect(characters.find((item: any) => item.name === '赵衡')?.raw_role_group || '').toBe('antagonist_minor')
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "grouped layered seed roles"
```

Expected: FAIL because the helper does not exist and grouped role arrays are ignored.

- [ ] **Step 3: Implement grouped role normalization**

Add a role tier constant, a function that extracts arrays from `character_pool`, `role_pool`, `characters_by_tier`, and top-level tier arrays, and merge them before protagonist/antagonist fallback. Export `buildMaterializedSeedCharactersForTest` as a test-only wrapper around the internal helper.

The merge rule is: first non-empty name wins position, later duplicate rows enrich missing fields without replacing explicit earlier values.

- [ ] **Step 4: Run test to verify pass**

Run the same Bun command from Step 2. Expected: PASS.

### Task 3: Unattended Preflight Character Repair

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Test: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Write failing tests**

Add static source tests near the existing unattended repair tests:

```ts
test('unattended character repair asks for layered missing role pools', () => {
  const source = readFileSync(new URL('./novel-writing-service.ts', import.meta.url), 'utf8')
  const block = source.slice(source.indexOf('任务：为无人值守章节写作自动补齐前置材料'), source.indexOf('const existingNames = new Set', source.indexOf('任务：为无人值守章节写作自动补齐前置材料')))

  expect(block).toContain('primary_supporting')
  expect(block).toContain('secondary_supporting')
  expect(block).toContain('cameo_supporting')
  expect(block).toContain('antagonist_minor')
  expect(block).toContain('faction_agent')
  expect(block).toContain('antagonist_logic')
})

test('unattended character repair uses tier-aware candidate limits instead of first six', () => {
  const source = readFileSync(new URL('./novel-writing-service.ts', import.meta.url), 'utf8')

  expect(source).toContain('selectTierAwareCharacterRepairCandidates')
  expect(source).not.toContain('characterCandidates.slice(0, 6)')
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "unattended character repair"
```

Expected: FAIL because the prompt is generic and the code still uses `slice(0, 6)`.

- [ ] **Step 3: Implement tier-aware repair**

Add `selectTierAwareCharacterRepairCandidates(candidates, existingCharacters)` in `novel-writing-service.ts`. It should:

- dedupe by name;
- infer tier from `tier`, `role_type`, `role`, `identity`, and `supporting_function`;
- include up to 2 `primary_supporting`, 3 `secondary_supporting`, 3 `cameo_supporting`, 2 `antagonist_minor`, 2 `antagonist_arc`, and 2 `faction_agent`;
- keep total additions under 12;
- prefer characters whose tier is missing or underrepresented in existing characters.

Update the repair prompt to ask for `characters` with `role_type`, `tier`, `narrative_function`, `relationship_to_protagonist`, `voice_anchor`, `signature_action`, `secret_or_pressure`, `exit_or_turning_point`, and `antagonist_logic` for antagonist roles.

- [ ] **Step 4: Run tests to verify pass**

Run the same Bun command from Step 2. Expected: PASS.

### Task 4: Incubation Preview Grouping

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Add grouped display helper**

Add a local helper near the incubation modal logic:

```ts
const groupIncubationCharacters = (items: any[] = []) => {
  const groups = new Map<string, any[]>()
  for (const item of items) {
    const key = String(item?.tier || item?.role_type || item?.role || '未分层')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries()).map(([tier, rows]) => ({ tier, rows: rows.slice(0, 10) }))
}
```

- [ ] **Step 2: Replace flat preview**

Replace the `payload.characters.slice(0, 12)` preview with grouped rows so users can see major supporting roles, minor supporting roles, cameo roles, and antagonist roles without adding another entrance.

- [ ] **Step 3: Manual verification**

Start the UI if needed and confirm the modal still renders when `payload.characters` is flat, grouped by role type, or missing.

### Task 5: Verification And Commit

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused tests**

```bash
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "layered.*character|recovery prompt keeps layered|grouped layered seed roles"
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "unattended character repair"
```

- [ ] **Step 2: Run project checks**

```bash
bun run check
git diff --check
```

- [ ] **Step 3: Review diff**

```bash
git diff -- ui/server/src/routes/novel-character-design-contract.ts ui/server/src/routes/novel-core-routes.ts ui/server/src/routes/novel-core-routes.test.ts ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts ui/web/src/pages/NovelProjectWorkspace.tsx docs/superpowers/plans/2026-07-03-novel-character-pool.md
```

- [ ] **Step 4: Stage only this work**

```bash
git add docs/superpowers/plans/2026-07-03-novel-character-pool.md ui/server/src/routes/novel-character-design-contract.ts ui/server/src/routes/novel-core-routes.ts ui/server/src/routes/novel-core-routes.test.ts ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts ui/web/src/pages/NovelProjectWorkspace.tsx
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: enrich novel character pools"
```
