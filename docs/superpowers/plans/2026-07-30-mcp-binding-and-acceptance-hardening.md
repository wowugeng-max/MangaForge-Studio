# MCP Binding and Acceptance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dedicated GenerationSource binding route the only write path, preserve tuple uniqueness under concurrency, fail closed on malformed source configuration, and prevent an in-flight MCP result from committing after its binding changes.

**Architecture:** Reuse the MCP workspace coordinator from the local-security increment and always acquire it before the existing novel mutation lock. Normalize source records and prospective Server/Key records before validating them, compute a canonical source fingerprint at generation start, then compare it inside the atomic chapter acceptance transaction while merging only intended Story State fields into the latest project configuration.

**Tech Stack:** TypeScript, Bun test runner, Express route handlers, Bun SQLite, existing novel mutation/acceptance services

---

## File Map

- Modify `ui/server/src/mcp/errors.ts`: add stable binding-changed and referenced-record error codes.
- Modify `ui/server/src/mcp/key-store.ts`: export prospective-record normalization for route checks.
- Modify `ui/server/src/mcp/workspace-coordinator.ts`: reject novel-lock-first acquisition while preserving MCP re-entry.
- Modify `ui/server/src/mcp/workspace-coordinator.test.ts`: lock-order invariant tests.
- Modify `ui/server/src/mcp/server-store.ts`: keep normalization reusable inside coordinated route mutations.
- Modify `ui/server/src/routes/mcp-routes.ts`: normalize and re-check referenced disable, reassignment, and delete operations inside the coordinator.
- Modify `ui/server/src/routes/mcp-routes.test.ts`: cover non-boolean disable, Key reassignment, and final reference checks.
- Modify `ui/server/src/novel-writing-service/generation-source/source-config.ts`: strict version/type validation, generic-write guard, and canonical fingerprint.
- Modify `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`: malformed-present source and fingerprint tests.
- Modify `ui/server/src/routes/novel-core/register.ts`: reject source writes in generic project/reference-config endpoints.
- Modify `ui/server/src/routes/novel-core-routes-a.test.ts`: cover generic create/update bypass rejection.
- Modify `ui/server/src/routes/novel-mcp-binding-routes.ts`: reload, validate, enforce uniqueness, and write while one MCP coordination scope is held.
- Modify `ui/server/src/routes/novel-mcp-binding-routes.test.ts`: deterministic concurrent tuple-binding test.
- Modify `ui/server/src/novel/types.ts`: add the expected source fingerprint to atomic acceptance input.
- Modify `ui/server/src/novel/acceptance.ts`: acquire locks in the approved order, fence binding identity, and merge current config.
- Modify `ui/server/src/novel/acceptance.test.ts`: changed-binding rejection and unrelated-config preservation tests.
- Modify `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: record the canonical binding fingerprint in bounded provenance.
- Modify `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`: verify fingerprint provenance.
- Modify `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts`: pass expected fingerprint into acceptance.
- Modify `ui/server/src/routes/novel-writing-service.storyline-sync-a-a.test.ts`: update the source contract for fenced acceptance.

### Task 1: Make present GenerationSource configuration fail closed

**Files:**
- Modify: `ui/server/src/mcp/errors.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`

- [ ] **Step 1: Write RED malformed-source and fingerprint tests**

Add:

```ts
test('defaults only when the source field is absent and rejects malformed present values', () => {
  expect(resolveProseGenerationSource({ reference_config: {} })).toEqual({
    version: 'prose_generation_source_v1',
    type: 'model',
  })
  for (const stored of [
    {},
    { type: 'model' },
    { version: 'wrong', type: 'model' },
    { version: 'prose_generation_source_v1' },
    { version: 'prose_generation_source_v1', type: 'unknown' },
    { version: 'prose_generation_source_v1', type: 'mcp', mcp: { server_id: 'buda' } },
  ]) {
    expect(() => resolveProseGenerationSource({
      reference_config: { prose_generation_source: stored },
    })).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
  }
})

test('computes a stable canonical fingerprint from every binding identity field', () => {
  const source = normalizeProseGenerationSource({
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
  })
  expect(proseGenerationSourceFingerprint(source)).toBe(
    proseGenerationSourceFingerprint(structuredClone(source)),
  )
  expect(proseGenerationSourceFingerprint({
    ...source,
    mcp: { ...source.mcp, agent_id: 'agent-2' },
  })).not.toBe(proseGenerationSourceFingerprint(source))
})
```

Also update every existing test input to include `version: 'prose_generation_source_v1'`.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
cd ui/server
bun test src/novel-writing-service/generation-source/source-config.test.ts
```

Expected: malformed present model records are accepted today and the fingerprint export is missing.

- [ ] **Step 3: Implement strict normalization and a canonical fingerprint**

Add `MCP_BINDING_CHANGED` to `McpErrorCode`. Replace permissive source normalization with:

```ts
const SOURCE_VERSION = 'prose_generation_source_v1' as const

export function normalizeProseGenerationSource(value: unknown): ProseGenerationSourceConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源配置必须是对象')
  }
  const record = value as Record<string, unknown>
  if (record.version !== SOURCE_VERSION) {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源版本缺失或不受支持')
  }
  if (record.type === 'model') return { ...MODEL_PROSE_GENERATION_SOURCE }
  if (record.type !== 'mcp') {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源类型缺失或不受支持')
  }
  return {
    version: SOURCE_VERSION,
    type: 'mcp',
    mcp: normalizeMcpProjectBinding(record.mcp),
  }
}

export function resolveProseGenerationSource(project: any): ProseGenerationSourceConfig {
  const config = project?.reference_config
  if (!config || !Object.prototype.hasOwnProperty.call(config, 'prose_generation_source')) {
    return { ...MODEL_PROSE_GENERATION_SOURCE }
  }
  return normalizeProseGenerationSource(config.prose_generation_source)
}

export function proseGenerationSourceFingerprint(source: ProseGenerationSourceConfig) {
  return source.type === 'model'
    ? [source.version, source.type].join('\u0000')
    : [
        source.version,
        source.type,
        source.mcp.server_id,
        String(source.mcp.key_id),
        source.mcp.adapter_id,
        source.mcp.agent_id,
      ].join('\u0000')
}
```

- [ ] **Step 4: Verify strict source behavior**

Run:

```bash
cd ui/server
bun test src/novel-writing-service/generation-source/source-config.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts
```

Expected: all tests pass and only an absent field selects the model default.

- [ ] **Step 5: Commit fail-closed configuration**

```bash
git add ui/server/src/mcp/errors.ts \
  ui/server/src/novel-writing-service/generation-source/source-config.ts \
  ui/server/src/novel-writing-service/generation-source/source-config.test.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts \
  ui/server/src/routes/novel-mcp-binding-routes.test.ts
git diff --cached --check
git commit -m "fix(mcp): fail closed on malformed generation sources"
```

Expected: one commit for strict configuration semantics.

### Task 2: Reject generic project-route binding bypasses

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/server/src/routes/novel-core/register.ts`
- Modify: `ui/server/src/routes/novel-core-routes-a.test.ts`
- Test: `ui/server/src/routes/novel-core-routes-a.test.ts`

- [ ] **Step 1: Write RED generic-route bypass tests**

In the existing novel core route harness, call all three generic mutations:

```ts
const workspace = await tempDir('novel-source-route-')
const { createNovelProject, getNovelProject } = await import('../novel')
const { registerNovelCoreRoutes } = await import('./novel-core-routes')
const project = await createNovelProject(workspace, { title: '原项目', reference_config: {} })
const { app, handlers } = createRouteHarness()
registerNovelCoreRoutes(app as any, () => workspace)
const source = {
  version: 'prose_generation_source_v1',
  type: 'mcp',
  mcp: { server_id: 'buda', key_id: 1, adapter_id: 'buda', agent_id: 'agent-1' },
}

for (const [handler, request] of [
  [handlers.get('POST /api/novel/projects'), {
    body: { title: '绕过创建', reference_config: { prose_generation_source: source } },
  }],
  [handlers.get('PUT /api/novel/projects/:id'), {
    params: { id: String(project.id) },
    body: { reference_config: { prose_generation_source: source } },
  }],
  [handlers.get('PUT /api/novel/projects/:id/reference-config'), {
    params: { id: String(project.id) },
    body: { prose_generation_source: source },
  }],
]) {
  const response = await callRoute(handler, request)
  expect(response.statusCode).toBe(400)
  expect(response.body.error_code).toBe('MCP_BINDING_INVALID')
}
expect((await getNovelProject(workspace, project.id))?.reference_config).toEqual({})
```

- [ ] **Step 2: Run the route test to verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-core-routes-a.test.ts -t "prose generation source"
```

Expected: generic create/update routes currently accept the field.

- [ ] **Step 3: Add one reusable bypass guard**

Export from `source-config.ts`:

```ts
export function assertNoProseGenerationSourceMutation(referenceConfig: unknown) {
  if (!referenceConfig || typeof referenceConfig !== 'object' || Array.isArray(referenceConfig)) return
  if (Object.prototype.hasOwnProperty.call(referenceConfig, 'prose_generation_source')) {
    throw new McpError(
      'MCP_BINDING_INVALID',
      'prose_generation_source 只能通过专用正文来源接口修改',
      { reason: 'dedicated_binding_route_required' },
    )
  }
}
```

Call it before `createNovelProject`, before generic `updateNovelProject` when `req.body.reference_config` is present, and before the reference-config update. Map this specific error to:

```ts
return res.status(400).json({
  error: error.message,
  detail: error.message,
  error_code: error.code,
})
```

Do not silently remove the field.

- [ ] **Step 4: Verify the only-write-entry invariant**

Run:

```bash
cd ui/server
bun test src/routes/novel-core-routes-a.test.ts src/routes/novel-mcp-binding-routes.test.ts
```

Expected: generic routes reject the source field and the dedicated binding route still saves it.

- [ ] **Step 5: Commit the generic-route guard**

```bash
git add ui/server/src/novel-writing-service/generation-source/source-config.ts \
  ui/server/src/routes/novel-core/register.ts \
  ui/server/src/routes/novel-core-routes-a.test.ts
git diff --cached --check
git commit -m "fix(novel): centralize generation source mutations"
```

Expected: one small route-boundary commit.

### Task 3: Serialize binding uniqueness and referenced credential mutations

**Files:**
- Modify: `ui/server/src/mcp/key-store.ts`
- Modify: `ui/server/src/mcp/workspace-coordinator.ts`
- Modify: `ui/server/src/mcp/workspace-coordinator.test.ts`
- Modify: `ui/server/src/novel/lock.ts`
- Modify: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/routes/mcp-routes.test.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`

- [ ] **Step 1: Write RED concurrent bind and prospective-record tests**

Return `runtime` from the existing `fixture()` helper, then add:

```ts
test('allows only one of two concurrent projects to bind the same tuple', async () => {
  const { workspace, key, first, second, handlers, runtime } = await fixture()
  let arrivals = 0
  let release!: () => void
  const bothArrived = new Promise<void>(resolve => { release = resolve })
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  runtime.listAgents = async () => {
    arrivals += 1
    if (arrivals === 1) fallbackTimer = setTimeout(release, 0)
    if (arrivals === 2) release()
    await bothArrived
    return [{ id: 'agent-1', name: '正文 Agent' }]
  }
  const path = '/api/novel/projects/:id/prose-generation-source'
  const saveHandler = handlers.get(`PUT ${path}`)
  const source = {
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: { server_id: 'buda', key_id: key.id, adapter_id: 'buda', agent_id: 'agent-1' },
  }
  const [firstResult, secondResult] = await Promise.all([
    call(saveHandler, { params: { id: String(first.id) }, body: { source } }),
    call(saveHandler, { params: { id: String(second.id) }, body: { source } }),
  ])
  expect([firstResult.statusCode, secondResult.statusCode].sort()).toEqual([200, 409])
  const bound = (await listNovelProjects(workspace))
    .filter(project => project.reference_config?.prose_generation_source?.type === 'mcp')
  expect(bound).toHaveLength(1)
  if (fallbackTimer) clearTimeout(fallbackTimer)
})
```

Add a lock-order test:

```ts
test('allows MCP-to-novel nesting and rejects novel-to-MCP inversion', async () => {
  const workspace = '/workspace/lock-order'
  await expect(withMcpWorkspaceMutation(workspace, () =>
    withNovelWorkspaceMutation(workspace, async () => 'ok'),
  )).resolves.toBe('ok')
  await expect(withNovelWorkspaceMutation(workspace, () =>
    withMcpWorkspaceMutation(workspace, async () => 'invalid'),
  )).rejects.toThrow('MCP coordinator must be acquired before novel mutation lock')
})
```

Add this referenced-record case to `mcp-routes.test.ts`:

```ts
test('normalizes prospective records before referenced mutation checks', async () => {
  const workspace = await temporaryWorkspace()
  const otherServer = {
    ...BUDA_MCP_SERVER_TEMPLATE,
    id: 'buda-other',
    display_name: 'Buda Other',
  }
  await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE, otherServer])
  const referenced = await createMcpKey(workspace, {
    mcp_server_id: 'buda',
    key: 'sk_referenced',
    description: '被引用',
  })
  const unrelated = await createMcpKey(workspace, {
    mcp_server_id: 'buda',
    key: 'sk_unrelated',
    description: '未引用',
  })
  const { app, handlers } = createRouteHarness()
  registerMcpRoutes(app, () => workspace, {
    invalidateKey: async () => {},
    invalidateServer: async () => {},
  } as any, {
    findProjectReferences: async (_activeWorkspace, target) => (
      target.keyId === referenced.id || target.serverId === 'buda'
        ? [{ id: 9, title: '绑定小说' }]
        : []
    ),
  })

  const disabledKey = await call(handlers.get('PUT /api/mcp/keys/:id'), {
    params: { id: String(referenced.id) },
    body: { is_active: 'false' },
  })
  const movedKey = await call(handlers.get('PUT /api/mcp/keys/:id'), {
    params: { id: String(referenced.id) },
    body: { mcp_server_id: 'buda-other' },
  })
  const deletedKey = await call(handlers.get('DELETE /api/mcp/keys/:id'), {
    params: { id: String(referenced.id) },
  })
  const disabledServer = await call(handlers.get('PUT /api/mcp/servers/:id'), {
    params: { id: 'buda' },
    body: { is_active: 'false' },
  })
  expect([disabledKey, movedKey, deletedKey, disabledServer].map(item => item.statusCode))
    .toEqual([409, 409, 409, 409])

  const updated = await call(handlers.get('PUT /api/mcp/keys/:id'), {
    params: { id: String(unrelated.id) },
    body: { description: '仍可修改' },
  })
  const deleted = await call(handlers.get('DELETE /api/mcp/keys/:id'), {
    params: { id: String(unrelated.id) },
  })
  expect([updated.statusCode, deleted.statusCode]).toEqual([200, 200])
})
```

- [ ] **Step 2: Run both route suites to verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-mcp-binding-routes.test.ts src/routes/mcp-routes.test.ts
```

Expected: at least the barriered bind can produce two successes, and string-form disable/reassignment can bypass current checks.

- [ ] **Step 3: Move the complete binding save under the MCP coordinator**

Export from `novel/lock.ts`:

```ts
export function isNovelWorkspaceMutationHeld(activeWorkspace: string) {
  return Boolean(novelMutationContext.getStore()?.has(novelMutationKey(activeWorkspace)))
}
```

In `withMcpWorkspaceMutation`, retain the current re-entry return first, then enforce the order before acquiring a new MCP lock:

```ts
const active = held.getStore()
if (active?.has(key)) return mutation()
if (isNovelWorkspaceMutationHeld(activeWorkspace)) {
  throw new Error('MCP coordinator must be acquired before novel mutation lock')
}
const release = await acquire(key)
```

In the dedicated `PUT` handler:

```ts
const saved = await withMcpWorkspaceMutation(activeWorkspace, async () => {
  const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
  if (!project) return null
  const source = normalizeProseGenerationSource(req.body?.source || req.body)
  let validation: Awaited<ReturnType<typeof validateMcpProjectBinding>> | null = null
  if (source.type === 'mcp') {
    validation = await validateMcpProjectBinding(activeWorkspace, project, source.mcp, {
      runtime: ctx.mcpRuntime,
      signal: req.signal,
    })
  }
  const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
    projectId: project.id,
    operation: 'update-prose-generation-source',
    mutate: current => ({
      referenceConfig: { ...current, prose_generation_source: source },
      result: source,
    }),
  })
  return { source, validation, mutation }
})
```

The lock order is now coordinator first, novel mutation lock second. Keep `validateMcpProjectBinding` uniqueness scanning inside this scope; do not cache the earlier project list.

- [ ] **Step 4: Normalize prospective Key/Server records before final reference checks**

Export `normalizeMcpKey`. In Key update, while `withMcpWorkspaceMutation` is held:

```ts
const previous = (await readMcpKeys(activeWorkspace)).find(item => item.id === id)
if (!previous) return res.status(404).json({ error: 'MCP Key 不存在' })
const prospective = normalizeMcpKey({
  ...previous,
  ...(req.body || {}),
  id,
  key: !String(req.body?.key || '').trim() ? previous.key : req.body.key,
  mcp_server_id: req.body?.mcp_server_id ?? previous.mcp_server_id,
})
const references = await findReferences(activeWorkspace, { keyId: id })
if (references.length && (
  prospective.is_active === false
  || prospective.mcp_server_id !== previous.mcp_server_id
)) {
  return res.status(409).json({
    error: '该 MCP Key 仍被小说项目引用',
    error_code: 'MCP_REFERENCED_RECORD_CONFLICT',
    references,
  })
}
```

Use equivalent normalized, in-lock checks for Server disable and both delete handlers. Remove `allow_referenced_disable` as a bypass for referenced records. A credential must first be unbound through the dedicated project route.

- [ ] **Step 5: Verify concurrency and reference integrity**

Run:

```bash
cd ui/server
bun test \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/routes/mcp-routes.test.ts \
  src/mcp/stores.test.ts
```

Expected: exactly one concurrent bind succeeds; every referenced destructive mutation returns 409; unrelated mutations pass.

- [ ] **Step 6: Commit binding/reference serialization**

```bash
git add ui/server/src/mcp/key-store.ts \
  ui/server/src/mcp/workspace-coordinator.ts \
  ui/server/src/mcp/workspace-coordinator.test.ts \
  ui/server/src/novel/lock.ts \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/mcp-routes.test.ts \
  ui/server/src/routes/novel-mcp-binding-routes.ts \
  ui/server/src/routes/novel-mcp-binding-routes.test.ts \
  ui/server/src/novel-writing-service/generation-source/source-config.ts
git diff --cached --check
git commit -m "fix(mcp): serialize bindings and referenced mutations"
```

Expected: one commit preserving coordinator-before-novel lock order.

### Task 4: Fence atomic acceptance by the generation-start binding

**Files:**
- Modify: `ui/server/src/novel/types.ts`
- Modify: `ui/server/src/novel/acceptance.ts`
- Modify: `ui/server/src/novel/acceptance.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts`
- Modify: `ui/server/src/routes/novel-writing-service.storyline-sync-a-a.test.ts`

- [ ] **Step 1: Write RED atomic fence and merge tests**

Add to `acceptance.test.ts`:

Add `updateNovelProject` to its `../novel` import and import `proseGenerationSourceFingerprint` from `../novel-writing-service/generation-source/source-config`.

```ts
test('rejects an MCP candidate when its project binding changed before acceptance', async () => {
  const workspace = await tempWorkspace()
  const original = {
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: { server_id: 'buda', key_id: 1, adapter_id: 'buda', agent_id: 'agent-1' },
  } as const
  const project = await createNovelProject(workspace, {
    title: '绑定围栏',
    reference_config: { prose_generation_source: original, notes: '当前备注' },
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 1,
    title: '第一章',
    chapter_text: '旧正文',
  })
  await updateNovelProject(workspace, project.id, {
    reference_config: {
      ...project.reference_config,
      prose_generation_source: {
        ...original,
        mcp: { ...original.mcp, agent_id: 'agent-2' },
      },
    },
  } as any)

  await expect(commitNovelChapterAcceptance(workspace, {
    chapter_id: chapter.id,
    chapter_patch: { chapter_text: '不得入库的新正文' },
    expected_prose_generation_source_fingerprint: proseGenerationSourceFingerprint(original),
    next_reference_config: {
      ...project.reference_config,
      story_state: { open_questions: ['旧请求的问题'] },
    },
  })).rejects.toMatchObject({ code: 'MCP_BINDING_CHANGED' })

  expect((await listNovelChapters(workspace, project.id))[0]?.chapter_text).toBe('旧正文')
  expect((await getNovelProject(workspace, project.id))?.reference_config?.prose_generation_source?.mcp.agent_id).toBe('agent-2')
})

test('merges prepared Story State into the latest unrelated reference config', async () => {
  const workspace = await tempWorkspace()
  const source = {
    version: 'prose_generation_source_v1',
    type: 'mcp',
    mcp: { server_id: 'buda', key_id: 1, adapter_id: 'buda', agent_id: 'agent-1' },
  } as const
  const project = await createNovelProject(workspace, {
    title: '配置合并',
    reference_config: {
      prose_generation_source: source,
      notes: '准备时备注',
      story_state: { open_questions: ['旧问题'] },
    },
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 1,
    title: '第一章',
    chapter_text: '旧正文',
  })
  await updateNovelProject(workspace, project.id, {
    reference_config: {
      ...project.reference_config,
      notes: '验收时最新备注',
    },
  } as any)

  const accepted = await commitNovelChapterAcceptance(workspace, {
    chapter_id: chapter.id,
    chapter_patch: { chapter_text: '新正文' },
    expected_prose_generation_source_fingerprint: proseGenerationSourceFingerprint(source),
    next_reference_config: {
      ...project.reference_config,
      notes: '准备时备注',
      story_state: { open_questions: ['新问题'], last_updated_chapter: 1 },
    },
  })

  expect(accepted.project.reference_config).toMatchObject({
    prose_generation_source: source,
    notes: '验收时最新备注',
    story_state: { open_questions: ['新问题'], last_updated_chapter: 1 },
  })
})
```

- [ ] **Step 2: Run the acceptance tests to verify RED**

Run:

```bash
cd ui/server
bun test src/novel/acceptance.test.ts -t "binding changed|latest unrelated reference config"
```

Expected: the input type/fence is absent and current acceptance replaces the whole `reference_config` snapshot.

- [ ] **Step 3: Add the expected fingerprint to acceptance input and bounded provenance**

In `NovelChapterAcceptanceInput`:

```ts
expected_prose_generation_source_fingerprint?: string
```

In `McpGenerationSource`, compute once:

```ts
const bindingFingerprint = proseGenerationSourceFingerprint(source)
const baseProvenance = {
  server_id: binding.server_id,
  key_id: binding.key_id,
  adapter_id: binding.adapter_id,
  agent_id: binding.agent_id,
  binding_fingerprint: bindingFingerprint,
}
```

Assert in `generation-source.test.ts` that `source_receipt.binding_fingerprint` exists and contains no Key value or prose.

- [ ] **Step 4: Acquire locks in order and compare inside the SQLite acceptance transaction**

Wrap `commitNovelChapterAcceptance`:

```ts
export async function commitNovelChapterAcceptance(
  activeWorkspace: string,
  input: NovelChapterAcceptanceInput,
) {
  return withMcpWorkspaceMutation(activeWorkspace, () => withNovelWorkspaceMutation(
    activeWorkspace,
    async () => {
```

Keep the transaction statements from `await importLegacyNovelStoreIfNeeded(activeWorkspace)` through the current `finally` block inside that callback. Replace the current callback close with:

```ts
    },
    'acceptance',
  ))
}
```

After loading `currentProject` and before mutating `store`:

```ts
if (input.expected_prose_generation_source_fingerprint) {
  const currentSource = resolveProseGenerationSource(currentProject)
  const currentFingerprint = proseGenerationSourceFingerprint(currentSource)
  if (currentFingerprint !== input.expected_prose_generation_source_fingerprint) {
    throw new McpError(
      'MCP_BINDING_CHANGED',
      '项目正文来源已在生成期间变更；旧请求结果不会入库',
      { reason: 'binding_changed' },
    )
  }
}
```

This check occurs after `BEGIN IMMEDIATE`, so chapter, version, review, entity, and Story State writes all roll back together.

- [ ] **Step 5: Merge only intended acceptance fields into current config**

Add:

```ts
export function mergeAcceptanceReferenceConfig(
  current: Record<string, any> = {},
  prepared?: Record<string, any>,
) {
  if (!prepared) return current
  const next = { ...current }
  if (Object.prototype.hasOwnProperty.call(prepared, 'story_state')) {
    next.story_state = prepared.story_state
  }
  return next
}
```

Build the project patch with:

```ts
const projectPatch = {
  ...(input.project_patch || {}),
  ...(input.next_reference_config === undefined ? {} : {
    reference_config: mergeAcceptanceReferenceConfig(
      currentProject.reference_config || {},
      input.next_reference_config,
    ),
  }),
}
```

The current `prose_generation_source` and unrelated fields can no longer be restored from a generation-start snapshot.

- [ ] **Step 6: Pass the fingerprint from draft provenance to acceptance**

In `generate-chapter-full-production-store.ts`:

```ts
const expectedSourceFingerprint = String(
  draftPromptDiagnostics?.generation_source?.binding_fingerprint || '',
)
```

Insert this property immediately after `chapter_patch: chapterPatch` in the current `commitNovelChapterAcceptance` object:

```ts
...(expectedSourceFingerprint ? {
  expected_prose_generation_source_fingerprint: expectedSourceFingerprint,
} : {}),
```

Import `McpError` and preserve the fence error in the acceptance catch before the generic atomic-admission wrapper:

```ts
} catch (error) {
  if (isAbortError(error)) throw error
  if (error instanceof McpError && error.code === 'MCP_BINDING_CHANGED') throw error
  throw markBlockedInvalidError(error, {
    code: 'atomic_acceptance_failed',
    source: 'atomic',
    message: '章节原子验收失败，未写入任何业务数据。',
  })
}
```

Update the source-contract assertion to look for `expected_prose_generation_source_fingerprint` and `binding_fingerprint` instead of requiring a wholesale `next_reference_config` replacement.

- [ ] **Step 7: Verify acceptance fencing and production wiring**

Run:

```bash
cd ui/server
bun test \
  src/novel/acceptance.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-writing-service.storyline-sync-a-a.test.ts
```

Expected: changed bindings reject atomically; same-binding acceptance preserves the newest unrelated config while applying Story State.

- [ ] **Step 8: Commit the acceptance fence**

```bash
git add ui/server/src/novel/types.ts \
  ui/server/src/novel/acceptance.ts \
  ui/server/src/novel/acceptance.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts \
  ui/server/src/routes/novel-writing-service.storyline-sync-a-a.test.ts
git diff --cached --check
git commit -m "fix(mcp): fence acceptance by generation binding"
```

Expected: one atomic acceptance commit.

### Task 5: Verify the independently releasable binding/acceptance increment

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run focused binding and acceptance suites**

```bash
cd ui/server
bun test \
  src/mcp/stores.test.ts \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel/acceptance.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts
```

Expected: all focused tests pass with 0 failures.

- [ ] **Step 2: Run the repaired novel server suite**

Run from the worktree root:

```bash
bun run test:novel-server
```

Expected: 188 pass and 0 fail before newly added tests are counted separately.

- [ ] **Step 3: Build and run hygiene checks**

```bash
bun run build:server
git diff --check
if git diff --name-only main...HEAD | rg -q '^workspace/(assets\.json|zhuque-inputs/|zhuque-reports/)'; then
  echo 'unexpected workspace user-data change'
  exit 1
fi
if git diff main...HEAD --unified=0 | rg -q '^\+.*sk_[A-Za-z0-9_-]{20,}'; then
  echo 'possible credential found in branch additions'
  exit 1
fi
git status --short
```

Expected: build and checks exit 0; protected user data and real credentials are absent; worktree is clean.
