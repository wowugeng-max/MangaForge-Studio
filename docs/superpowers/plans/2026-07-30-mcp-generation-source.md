# MCP Generation Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable MCP prose-generation source with a generic Streamable HTTP client, a Buda adapter, project-level binding, and management UI while preserving the existing MangaForge quality and memory pipeline.

**Architecture:** `GenerationSource` becomes the single draft-prose boundary: model projects delegate to the existing model generator, while MCP projects resolve an explicit Server/Key/Adapter/Agent binding and call the Buda adapter. MangaForge compiles and sends the full chapter task, owns Drive snapshots and canonical storage, and routes the returned candidate through the existing admission, revision, Story State, and Memory Palace stages.

**Tech Stack:** Bun, TypeScript, Express, React 18, Ant Design 5, `@modelcontextprotocol/client` 2.x, Bun test.

---

### Task 1: Add MCP configuration stores and safe public records

**Files:**
- Modify: `ui/server/package.json`
- Modify: `bun.lock`
- Create: `ui/server/src/mcp/types.ts`
- Create: `ui/server/src/mcp/errors.ts`
- Create: `ui/server/src/mcp/server-store.ts`
- Create: `ui/server/src/mcp/key-store.ts`
- Test: `ui/server/src/mcp/stores.test.ts`

- [ ] **Step 1: Install the official MCP client**

Run: `cd ui/server && bun add @modelcontextprotocol/client@^2.0.0`

Expected: `ui/server/package.json` contains `"@modelcontextprotocol/client": "^2.0.0"` and the root Bun lockfile is updated.

- [ ] **Step 2: Write failing store tests**

Cover built-in Buda defaults, normalization, workspace-local paths, monotonically increasing numeric key IDs, overwrite-only secret updates, and the public-key shape:

```ts
expect(normalizeMcpServer({ id: 'buda' })).toMatchObject({
  id: 'buda',
  transport: 'streamable_http',
  url: 'https://buda.im/api/mcp',
  adapter_id: 'buda',
  generation_timeout_ms: 600_000,
})
const saved = await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_secret', description: '账号一' })
expect(saved.id).toBe(1)
expect(toPublicMcpKey(saved)).toEqual(expect.objectContaining({ masked_key: 'sk_s***cret', has_key: true }))
expect(toPublicMcpKey(saved)).not.toHaveProperty('key')
```

- [ ] **Step 3: Run the tests to verify failure**

Run: `cd ui/server && bun test src/mcp/stores.test.ts`

Expected: FAIL because the MCP store modules do not exist.

- [ ] **Step 4: Implement configuration types, errors, and stores**

Define the approved records and stable errors:

```ts
export type McpServerRecord = {
  id: string
  display_name: string
  transport: 'streamable_http' | 'stdio'
  url: string
  auth_type: 'bearer' | 'none'
  adapter_id: string
  is_active: boolean
  startup_timeout_ms: number
  tool_timeout_ms: number
  generation_timeout_ms: number
  poll_initial_ms: number
  poll_max_ms: number
  enabled_tools: string[]
  custom_headers: Record<string, string>
}

export type McpKeyRecord = {
  id: number
  mcp_server_id: string
  key: string
  description: string
  is_active: boolean
  priority: number
  success_count: number
  failure_count: number
  last_checked?: string
  last_used?: string
  avg_latency?: number
}

export class McpError extends Error {
  constructor(public readonly code: McpErrorCode, message: string, public readonly details?: Record<string, unknown>) {
    super(message)
    this.name = 'McpError'
  }
}
```

Store Servers in `workspace/mcp-servers.json` and keys in `workspace/mcp-keys.json`. Reads return normalized data; API callers use `toPublicMcpKey()` so raw secrets never leave the store layer.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui/server && bun test src/mcp/stores.test.ts`

Expected: PASS.

```bash
git add bun.lock ui/server/package.json ui/server/src/mcp/types.ts ui/server/src/mcp/errors.ts ui/server/src/mcp/server-store.ts ui/server/src/mcp/key-store.ts ui/server/src/mcp/stores.test.ts
git commit -m "feat(mcp): add server and key configuration stores"
```

### Task 2: Build the generic Streamable HTTP MCP client and manager

**Files:**
- Create: `ui/server/src/mcp/client.ts`
- Create: `ui/server/src/mcp/client-manager.ts`
- Test: `ui/server/src/mcp/client.test.ts`
- Test: `ui/server/src/mcp/client-manager.test.ts`

- [ ] **Step 1: Write failing client lifecycle and isolation tests**

Inject SDK factories so tests do not use the network. Verify Bearer/no-auth headers, `Connecting -> Ready -> Closed`, tool discovery, allow-list enforcement, preservation of all result fields, AbortSignal/timeout propagation, and workspace/server/key cache isolation:

```ts
const client = createMcpClient({ server, key, sdkFactory })
await client.connect()
expect(client.state).toBe('Ready')
expect(sdkFactory.transportOptions.requestInit?.headers).toMatchObject({ Authorization: 'Bearer sk_test' })
expect((await client.listTools()).map(tool => tool.name)).toEqual(['allowed'])
expect(await client.callTool('allowed', { value: 1 })).toEqual({
  content: [{ type: 'text', text: 'ok' }], structuredContent: { ok: true }, isError: false, _meta: { trace: 'x' },
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/server && bun test src/mcp/client.test.ts src/mcp/client-manager.test.ts`

Expected: FAIL because `createMcpClient` and `McpClientManager` do not exist.

- [ ] **Step 3: Implement the client wrapper**

Use the SDK directly and retain diagnostics without headers or secrets:

```ts
const transport = new StreamableHTTPClientTransport(new URL(server.url), {
  requestInit: { headers: buildMcpHeaders(server, key) },
})
const sdk = new Client({ name: 'mangaforge-studio', version: '1.0.0' })
await withTimeout(sdk.connect(transport), server.startup_timeout_ms, 'MCP_CONNECT_TIMEOUT', signal)
const listed = await withTimeout(sdk.listTools(), server.tool_timeout_ms, 'MCP_CONNECT_TIMEOUT', signal)
```

`callTool` rejects undiscovered or disallowed tools with `MCP_CAPABILITY_MISSING`, maps successful MCP `isError` responses to `MCP_TOOL_ERROR`, does not retry writes, and exposes redacted Server information/capabilities/instructions/tool schemas.

- [ ] **Step 4: Implement workspace-aware client lifecycle management**

```ts
const cacheKey = `${activeWorkspace}\u0000${server.id}\u0000${key.id}`
```

`McpClientManager.get()` creates or returns a Ready connection; `invalidate()` and `closeAll()` call transport `terminateSession()` best-effort and close the SDK client.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui/server && bun test src/mcp/client.test.ts src/mcp/client-manager.test.ts`

Expected: PASS.

```bash
git add ui/server/src/mcp/client.ts ui/server/src/mcp/client-manager.ts ui/server/src/mcp/client.test.ts ui/server/src/mcp/client-manager.test.ts
git commit -m "feat(mcp): add generic streamable HTTP client"
```

### Task 3: Implement Buda capability mapping, Drive snapshots, and Session execution

**Files:**
- Create: `ui/server/src/mcp/adapters/types.ts`
- Create: `ui/server/src/mcp/adapters/buda-tool-map.ts`
- Create: `ui/server/src/mcp/adapters/buda-drive.ts`
- Create: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Create: `ui/server/src/mcp/adapters/registry.ts`
- Test: `ui/server/src/mcp/adapters/buda-tool-map.test.ts`
- Test: `ui/server/src/mcp/adapters/buda-drive.test.ts`
- Test: `ui/server/src/mcp/adapters/buda-adapter.test.ts`

- [ ] **Step 1: Write failing Buda contract tests**

Use an in-memory fake `McpClient` to verify alias/schema resolution, Agent listing/creation, deterministic snapshot hashes, changed-file-only writes, required sync verification, full prompt preservation, Session polling, terminal-state mapping, output extraction, cancellation, and per-Agent exclusion:

```ts
expect(resolveBudaTools(discovered)).toEqual(expect.objectContaining({
  listAgents: 'apiClaw.listApiAgents',
  createSession: 'apiClaw.createApiAgentSession',
  getSession: 'apiClaw.getApiAgentSession',
}))
expect(fake.calls.find(call => call.logical === 'sendSessionMessage')?.args.content).toContain(paragraphTask)
await expect(secondConcurrentCall).rejects.toMatchObject({ code: 'MCP_AGENT_BUSY' })
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/server && bun test src/mcp/adapters/buda-tool-map.test.ts src/mcp/adapters/buda-drive.test.ts src/mcp/adapters/buda-adapter.test.ts`

Expected: FAIL because the Buda adapter modules do not exist.

- [ ] **Step 3: Implement live tool resolution and adapter registry**

Map logical operations by exact aliases first, then compatible input-schema properties. Required logical capabilities are `listAgents`, `listDriveFiles`, `upsertDriveFile`, `createSession`, `getSession`, `sendSessionMessage`, and `cancelSession`; `createAgent` is required only for the explicit create action.

```ts
export const BUDA_TOOL_ALIASES = {
  listAgents: ['apiClaw.listApiAgents', 'listApiAgents'],
  createAgent: ['apiClaw.createApiAgent', 'createApiAgent'],
  createSession: ['apiClaw.createApiAgentSession', 'createApiAgentSession'],
  getSession: ['apiClaw.getApiAgentSession', 'getApiAgentSession'],
  sendSessionMessage: ['apiClaw.postApiAgentSessionMessage', 'postApiAgentSessionMessage'],
} as const
```

- [ ] **Step 4: Implement authoritative Drive snapshots**

Build exactly these files and a manifest with SHA-256 hashes:

```ts
const snapshotFiles = {
  '/mangaforge/writing-bible.md': writingBible,
  '/mangaforge/story-state.json': stableJson(storyState),
  '/mangaforge/continuity.md': continuity,
  '/mangaforge/recent-chapters.md': recentChapters,
}
snapshotFiles['/mangaforge/manifest.json'] = stableJson(buildManifest(snapshotFiles, project, chapter))
```

Compare remote hashes, write only changes, then re-read and verify. Throw `MCP_DRIVE_SYNC_FAILED` on any mismatch; never continue with stale remote state.

- [ ] **Step 5: Implement Buda Session execution**

Acquire a keyed lock for `workspace/server/key/agent`, sync Drive, create one new Session, send one complete execution envelope plus unchanged `paragraphTask`, then poll with bounded exponential intervals. Map states exactly and normalize the final assistant output:

```ts
switch (status) {
  case 'pending':
  case 'in_progress': break
  case 'waiting_for_input': throw new McpError('MCP_INPUT_REQUIRED', 'Buda Agent 正在等待额外输入')
  case 'failed': throw new McpError('MCP_SESSION_FAILED', sessionError)
  case 'cancelled': throw new McpError('MCP_CANCELLED', 'Buda Session 已取消')
  case 'completed': return extractBudaProse(sessionResult, chapterNo)
}
```

On abort, stop polling immediately and call remote cancellation best-effort. Do not retry Session creation, message send, or Drive writes.

- [ ] **Step 6: Run tests and commit**

Run: `cd ui/server && bun test src/mcp/adapters/buda-tool-map.test.ts src/mcp/adapters/buda-drive.test.ts src/mcp/adapters/buda-adapter.test.ts`

Expected: PASS.

```bash
git add ui/server/src/mcp/adapters
git commit -m "feat(mcp): add Buda prose adapter"
```

### Task 4: Expose safe MCP configuration and diagnostics APIs

**Files:**
- Create: `ui/server/src/mcp/runtime.ts`
- Create: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/index.ts`
- Test: `ui/server/src/routes/mcp-routes.test.ts`
- Modify: `ui/server/src/server-lifecycle.test.ts`

- [ ] **Step 1: Write failing route tests**

Test Server CRUD, MCP Key CRUD with masked reads, connection diagnostics, Agent listing, explicit Agent creation, unsupported stdio validation, and manager shutdown:

```ts
const list = await request(app).get('/api/mcp/keys')
expect(list.body[0]).not.toHaveProperty('key')
expect(list.body[0]).toMatchObject({ masked_key: 'sk_t***test', has_key: true })
await request(app).post('/api/mcp/keys/1/agents').send({ name: 'MangaForge 小说正文 Agent' }).expect(200)
expect(fakeAdapter.createAgent).toHaveBeenCalledTimes(1)
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/server && bun test src/routes/mcp-routes.test.ts src/server-lifecycle.test.ts`

Expected: FAIL because the routes and MCP shutdown lifecycle are absent.

- [ ] **Step 3: Implement runtime and routes**

`createMcpRuntime(getWorkspace)` owns the `McpClientManager` and adapter registry. Routes return `McpError.code` and a redacted detail object; they never serialize a raw key, transport headers, complete prompt, or prose.

```ts
app.get('/api/mcp/keys', async (_req, res) => {
  res.json((await readMcpKeys(getWorkspace())).map(toPublicMcpKey))
})
app.get('/api/mcp/keys/:id/agents', withMcpError(async (req, res) => {
  res.json({ agents: await runtime.listAgents(Number(req.params.id)) })
}))
```

Deletion checks use an injected project-reference reader and return HTTP 409 for referenced Servers or Keys. Key update keeps the old secret when `key` is omitted and invalidates the affected cached connection when connection fields change.

- [ ] **Step 4: Register runtime and shutdown**

Create one runtime in `ui/server/src/index.ts`, register MCP routes before novel routes, inject it into `registerNovelRoutes`, and add `mcpRuntime.close()` to the shutdown coordinator.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui/server && bun test src/routes/mcp-routes.test.ts src/server-lifecycle.test.ts`

Expected: PASS.

```bash
git add ui/server/src/mcp/runtime.ts ui/server/src/routes/mcp-routes.ts ui/server/src/routes/mcp-routes.test.ts ui/server/src/index.ts ui/server/src/server-lifecycle.test.ts
git commit -m "feat(mcp): expose MCP services API"
```

### Task 5: Add validated project bindings and uniqueness guards

**Files:**
- Create: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Create: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel.ts`
- Modify: `ui/server/src/routes/novel-project-control-routes.ts`
- Test: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`

- [ ] **Step 1: Write failing config and route tests**

Verify legacy/model defaulting, complete MCP binding parsing, live validation, same-Agent uniqueness, inactive/mismatched records, and clearing back to model:

```ts
expect(resolveProseGenerationSource({ reference_config: {} })).toEqual({
  version: 'prose_generation_source_v1', type: 'model',
})
await expect(validateMcpBinding(workspace, project, binding, deps)).rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/source-config.test.ts src/routes/novel-mcp-binding-routes.test.ts`

Expected: FAIL because source configuration and routes do not exist.

- [ ] **Step 3: Implement source config normalization**

```ts
export type ProseGenerationSourceConfig =
  | { version: 'prose_generation_source_v1'; type: 'model' }
  | { version: 'prose_generation_source_v1'; type: 'mcp'; mcp: { server_id: string; key_id: number; adapter_id: string; agent_id: string } }
```

Reject partial MCP values rather than silently converting them to model.

- [ ] **Step 4: Implement project binding routes**

Add `GET`, `PUT`, `POST /test`, `GET /agents`, and explicit `POST /agents` under `/api/novel/projects/:id/prose-generation-source`. Validate the live Agent list before saving with `mutateNovelProjectReferenceConfig`, and scan all other projects to reject an identical Server/Key/Agent tuple.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/source-config.test.ts src/routes/novel-mcp-binding-routes.test.ts`

Expected: PASS.

```bash
git add ui/server/src/novel-writing-service/generation-source/source-config.ts ui/server/src/routes/novel-mcp-binding-routes.ts ui/server/src/routes/novel-mcp-binding-routes.test.ts ui/server/src/novel-writing-service/generation-source/source-config.test.ts ui/server/src/routes/novel.ts ui/server/src/routes/novel-project-control-routes.ts
git commit -m "feat(novel): add MCP prose-source binding"
```

### Task 6: Route only initial prose drafts through GenerationSource

**Files:**
- Create: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-generation/register-chapter-pipeline.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Test: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`
- Test: `ui/server/src/routes/novel-generation-routes.test.ts`

- [ ] **Step 1: Write failing dispatcher and regression tests**

Test model default behavior, MCP dispatch, explicit model override, ordinary `model_id` non-bypass, full `paragraphTask` identity, no silent fallback, source progress, AbortSignal, and provenance:

```ts
expect(await resolveGenerationSource(projectWithNoConfig, {})).toBe(modelSource)
expect(await resolveGenerationSource(mcpProject, { model_id: 9 })).toBe(mcpSource)
expect(await resolveGenerationSource(mcpProject, { generation_source_override: 'model' })).toBe(modelSource)
expect(mcpRequest.paragraphTask).toBe(compiledPrompt.prompt)
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts src/routes/novel-generation-routes.test.ts`

Expected: FAIL because draft generation still calls the model generator directly.

- [ ] **Step 3: Implement the GenerationSource contract and sources**

```ts
export interface GenerationSource {
  generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult>
}

export type ProseGenerationResult = {
  prose_chapters: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'model' | 'mcp'
  completed: boolean
  modelName?: string
  adapter_id?: string
  agent_id?: string
  session_id?: string
  snapshot_hash?: string
  raw?: unknown
}
```

The model source delegates to `generateNovelChapterProse`. The MCP source validates the binding, builds the authoritative Drive input, invokes the adapter, and never catches failures to fall back to a model.

- [ ] **Step 4: Replace only the draft call site**

Resolve the source after MangaForge compiles the paragraph task. Pass the current project/chapter/context package, exact `compiledPrompt.prompt`, diagnostics, budgets, progress, and abort signal. Retain the existing complete-transport assertion, target chapter selection, quality loops, storage, Story State, and Memory Palace calls.

Expose these progress keys in `standaloneProseServiceStageLabel`: `mcp_connect`, `mcp_capabilities`, `mcp_drive_sync`, `mcp_session_create`, `mcp_session_wait`, `mcp_extract`, `quality_pipeline`.

- [ ] **Step 5: Record bounded source provenance**

Add source metadata to `draftPromptDiagnostics` and the already-persisted chapter `raw_payload`; do not persist the full MCP tool result. Include `generation_source_override` in compact run input so an explicit temporary-model action is auditable.

- [ ] **Step 6: Run tests and commit**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/generation-source.test.ts src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts src/routes/novel-generation-routes.test.ts`

Expected: PASS with existing model route assertions unchanged.

```bash
git add ui/server/src/novel-writing-service/generation-source ui/server/src/novel-writing-service/service/create-novel-writing-service.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts ui/server/src/routes/novel-generation/builders.ts ui/server/src/routes/novel-generation/register-chapter-pipeline.ts ui/server/src/routes/novel-generation-routes.test.ts
git commit -m "feat(novel): dispatch draft prose through GenerationSource"
```

### Task 7: Add the MCP Services management UI

**Files:**
- Create: `ui/web/src/api/mcp.ts`
- Create: `ui/web/src/pages/McpServices/mcpServicesModel.ts`
- Create: `ui/web/src/pages/McpServices/mcpServicesModel.test.ts`
- Create: `ui/web/src/pages/McpServices/index.tsx`
- Modify: `ui/web/src/router.tsx`
- Modify: `ui/web/src/components/Layout.tsx`
- Test: `ui/web/src/pages/McpServices/mcpServicesShell.test.ts`

- [ ] **Step 1: Write failing UI-model tests**

Test default Buda form values, key overwrite-only payloads, masking assumptions, diagnostics summaries, and route/menu wiring:

```ts
expect(buildMcpKeyPayload({ description: '账号一', key: '' }, existing)).not.toHaveProperty('key')
expect(defaultBudaServerForm()).toMatchObject({ id: 'buda', url: 'https://buda.im/api/mcp', adapter_id: 'buda' })
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/web && bun test src/pages/McpServices/mcpServicesModel.test.ts src/pages/McpServices/mcpServicesShell.test.ts`

Expected: FAIL because the page and route are absent.

- [ ] **Step 3: Implement API and pure UI model**

Expose typed calls for Server/Key CRUD, key tests, diagnostics, Agent list, and explicit Agent creation. Never define a response type containing `key`; use `masked_key` and `has_key`.

- [ ] **Step 4: Implement the MCP Services page**

Create separate Server and account tables plus a read-only diagnostics drawer. The Buda template pre-fills the approved URL/timeouts. Agent creation appears only behind a named button and confirmation. Secret edit fields are blank and display only the masked existing value as help text.

- [ ] **Step 5: Add navigation and verify**

Run: `cd ui/web && bun test src/pages/McpServices/mcpServicesModel.test.ts src/pages/McpServices/mcpServicesShell.test.ts && bun run build`

Expected: tests PASS and Vite build succeeds.

```bash
git add ui/web/src/api/mcp.ts ui/web/src/pages/McpServices ui/web/src/router.tsx ui/web/src/components/Layout.tsx
git commit -m "feat(web): add MCP services management"
```

### Task 8: Add project-level MCP source binding UI

**Files:**
- Create: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`
- Create: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`
- Create: `ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Test: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`

- [ ] **Step 1: Write failing binding-model tests**

Test model/MCP payloads, completeness checks, disabled save state, Server-to-Key filtering, Agent uniqueness errors, and explicit temporary-model override payload:

```ts
expect(buildSourcePayload({ type: 'mcp', serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1' })).toEqual({
  source: { version: 'prose_generation_source_v1', type: 'mcp', mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent_1' } },
})
expect(buildTemporaryModelOverride()).toEqual({ generation_source_override: 'model' })
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts`

Expected: FAIL because the project binding panel does not exist.

- [ ] **Step 3: Implement the binding panel**

Load Server and public Key records, then list Agents through the project-scoped route. Allow selecting an existing Agent, testing the binding, refreshing Agents, and explicitly creating a MangaForge Agent. Show adapter, masking, active states, validation failures, and bound-project conflicts.

- [ ] **Step 4: Integrate with project settings**

Load/save editor revision settings and prose source settings independently inside the same modal. A failed MCP load blocks only the MCP section; a complete, tested MCP binding is required before its save call. Switching back to model saves the explicit model source object.

- [ ] **Step 5: Run tests and commit**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts && bun run build`

Expected: PASS and Vite build succeeds.

```bash
git add ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts
git commit -m "feat(web): bind novel projects to MCP agents"
```

### Task 9: Run focused regressions, builds, and security checks

**Files:**
- Modify only if a test exposes a defect in files changed by Tasks 1-8.

- [ ] **Step 1: Run the complete MCP and GenerationSource test set**

Run:

```bash
cd ui/server && bun test src/mcp src/routes/mcp-routes.test.ts src/routes/novel-mcp-binding-routes.test.ts src/novel-writing-service/generation-source src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run existing novel regressions**

Run: `bun run test:novel-server`

Expected: all existing novel server tests PASS, demonstrating that projects without MCP configuration keep the model path.

- [ ] **Step 3: Run UI tests and full builds**

Run:

```bash
cd ui/web && bun test src/pages/McpServices src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts
cd ../.. && bun run check
```

Expected: all tests PASS; refactor boundary check, server build, and web build succeed.

- [ ] **Step 4: Scan for secret leakage and unsafe fallback**

Run:

```bash
rg -n "res\.json\([^\n]*key|console\.(log|info|warn|error)\([^\n]*(paragraphTask|Authorization|mcp.*key)" ui/server/src/mcp ui/server/src/routes/mcp-routes.ts ui/server/src/routes/novel-mcp-binding-routes.ts
rg -n "catch[^{]*\{[^}]*generateNovelChapterProse|fallback.*model" ui/server/src/novel-writing-service/generation-source
```

Expected: no raw-secret response/logging match and no automatic model fallback match.

- [ ] **Step 5: Confirm user workspace changes are untouched and commit any final corrections**

Run: `git status --short`

Expected: `workspace/assets.json`, `workspace/zhuque-inputs/`, and `workspace/zhuque-reports/` are not staged or modified by this feature work.

```bash
git add ui/server ui/web bun.lock
git commit -m "test(mcp): verify generation source integration"
```

If there are no final corrections, do not create an empty commit. The live Buda smoke test remains manual and opt-in because it requires an `sk_` MCP API key and a dedicated test Agent; web-login credentials are not used.
