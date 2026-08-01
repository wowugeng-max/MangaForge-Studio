# MCP Source Visibility and Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each novel project's active MCP prose executor visible in the writing workspace and optionally route Buda generation through a user-configured model identifier.

**Architecture:** Extend the existing versioned MCP project binding with an optional normalized `model`, include it in binding fingerprints, and pass it unchanged through `McpGenerationSource` to both Buda Session calls. Add a focused top-bar status component that reads existing MCP APIs and opens the single project-settings editor; keep `Auto` backward compatible by omitting `model` from remote calls.

**Tech Stack:** TypeScript, Bun test, React 18, Ant Design 5, existing MCP GenerationSource and Buda adapter.

---

### Task 1: Extend the project binding and web form contracts

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/web/src/api/mcp.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`

- [ ] **Step 1: Write failing server normalization and fingerprint tests**

Add cases proving an old binding normalizes with `model: ''`, whitespace is trimmed, a 161-character model is rejected, and changing `model` changes `proseGenerationSourceFingerprint`:

```ts
expect(normalizeProseGenerationSource({
  version: 'prose_generation_source_v1',
  type: 'mcp',
  mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1' },
})).toMatchObject({ type: 'mcp', mcp: { model: '' } })

expect(normalizeProseGenerationSource({
  version: 'prose_generation_source_v1',
  type: 'mcp',
  mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '  model-x  ' },
})).toMatchObject({ type: 'mcp', mcp: { model: 'model-x' } })

expect(() => normalizeMcpProjectBinding({
  server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: 'x'.repeat(161),
})).toThrow(expect.objectContaining({ code: 'MCP_BINDING_INVALID' }))
```

- [ ] **Step 2: Run the server test and verify RED**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/source-config.test.ts`

Expected: FAIL because normalized bindings do not contain `model` and fingerprints ignore it.

- [ ] **Step 3: Implement the server binding field**

Add `model: string` to `McpProjectBinding`. Normalize with a 160-character limit and include it in the opaque identity:

```ts
const model = String(value?.model ?? '').trim()
if (model.length > 160) {
  throw new McpError('MCP_BINDING_INVALID', 'MCP model 最多 160 个字符')
}
const binding = {
  server_id: String(value?.server_id ?? value?.serverId ?? '').trim(),
  key_id: Number(value?.key_id ?? value?.keyId ?? 0),
  adapter_id: String(value?.adapter_id ?? value?.adapterId ?? '').trim(),
  agent_id: String(value?.agent_id ?? value?.agentId ?? '').trim(),
  model,
}
```

Exclude `model` from the required-field scan while including it as the final `proseGenerationSourceFingerprint` identity element.

- [ ] **Step 4: Run the server test and verify GREEN**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/source-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing web form contract tests**

Update the form expectations so old saved data hydrates to `model: ''`, an explicit value is trimmed into the payload, and model changes invalidate a tested fingerprint:

```ts
expect(sourceFormFromConfig({
  type: 'mcp',
  mcp: { server_id: 'buda', key_id: 8, adapter_id: 'buda', agent_id: 'agent-x' },
})).toMatchObject({ model: '' })

expect(buildSourcePayload({
  type: 'mcp', serverId: 'buda', keyId: 3, adapterId: 'buda', agentId: 'agent_1', model: '  model-x  ',
})).toMatchObject({ source: { type: 'mcp', mcp: { model: 'model-x' } } })

expect(bindingFingerprint({ ...form, model: 'model-y' })).not.toBe(bindingFingerprint({ ...form, model: 'model-x' }))
```

- [ ] **Step 6: Run the web test and verify RED**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: FAIL because `GenerationSourceForm` and the API type do not expose `model`.

- [ ] **Step 7: Implement the web contract**

Add optional `model?: string` to `GenerationSourceForm`, optional `model?: string` to the MCP API binding type, return `model: ''` from default hydration, trim the model in `buildSourcePayload`, and append normalized `model` to `bindingFingerprint`.

- [ ] **Step 8: Run both contract tests and commit**

Run: `cd ui/server && bun test src/novel-writing-service/generation-source/source-config.test.ts && cd ../web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: both test files PASS.

```bash
git add ui/server/src/novel-writing-service/generation-source/source-config.ts ui/server/src/novel-writing-service/generation-source/source-config.test.ts ui/web/src/api/mcp.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
git commit -m "feat(mcp): add project model routing config"
```

### Task 2: Pass the configured model to Buda

**Files:**
- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`

- [ ] **Step 1: Write a failing Buda adapter model-routing test**

Generate once with `model: 'model-x'` and once with `model: ''`. Assert the explicit value reaches both tool operations and Auto omits it:

```ts
const explicit = createFakeClient()
await new BudaAdapter(explicit.client as any).generateProse(generationInput({ model: 'model-x' }))
expect(explicit.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args.model).toBe('model-x')
expect(explicit.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))?.args.model).toBe('model-x')

const automatic = createFakeClient()
await new BudaAdapter(automatic.client as any).generateProse(generationInput({ model: '' }))
expect(automatic.calls.find(call => call.name.endsWith('createApiAgentSession'))?.args).not.toHaveProperty('model')
expect(automatic.calls.find(call => call.name.endsWith('postApiAgentSessionMessage'))?.args).not.toHaveProperty('model')
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run: `cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts`

Expected: FAIL because `BudaAdapter.generateProse` does not use `input.model`.

- [ ] **Step 3: Implement adapter model forwarding**

Add `model?: string` to `BudaProseGenerationInput`. Build one conditional argument and spread it into both calls:

```ts
const selectedModel = String(input.model || '').trim()
const modelArguments = selectedModel ? { model: selectedModel } : {}
```

Pass `...modelArguments` to both `buildBudaToolArguments('createSession', ...)` and `buildBudaToolArguments('sendSessionMessage', ...)`. The existing Buda tool-map already places `model` in live API Claw request bodies.

- [ ] **Step 4: Run the adapter test and verify GREEN**

Run: `cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Write a failing GenerationSource propagation test**

In the existing draft GenerationSource integration fixture, save an MCP binding with `model: 'model-x'` and assert the fake adapter receives it in `generateProse(input)`.

- [ ] **Step 6: Run the GenerationSource test and verify RED**

Run: `cd ui/server && bun test src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`

Expected: FAIL because `McpGenerationSource` does not copy `binding.model` into the adapter input.

- [ ] **Step 7: Implement GenerationSource propagation and bounded provenance**

Pass `model: binding.model` to `resolved.adapter.generateProse`. Add `model: binding.model || 'Auto'` to scrubbed MCP run provenance so a run states its effective Buda selection without exposing credentials.

- [ ] **Step 8: Run server MCP tests and commit**

Run: `cd ui/server && bun test src/mcp/adapters/buda-adapter.test.ts src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`

Expected: both test files PASS.

```bash
git add ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
git commit -m "feat(mcp): route configured model to Buda"
```

### Task 3: Add the settings field and persistent workspace source status

**Files:**
- Create: `ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.ts`
- Create: `ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts`
- Create: `ui/web/src/pages/novel-workspace/McpGenerationSourceStatus.tsx`
- Modify: `ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css`

- [ ] **Step 1: Write failing pure summary-model tests**

Define expected summaries for model, loaded MCP, and metadata failure:

```ts
expect(buildMcpSourceStatus({ source: { version: 'prose_generation_source_v1', type: 'model' } }))
  .toMatchObject({ label: '模型 API', kind: 'model' })

expect(buildMcpSourceStatus({
  source: { version: 'prose_generation_source_v1', type: 'mcp', mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '' } },
  servers: [{ id: 'buda', display_name: 'Buda' } as any],
  keys: [{ id: 3, description: '测试账号', masked_key: 'sk_***', is_active: true } as any],
  agents: [{ id: 'agent-1', name: '正文 Agent' }],
})).toEqual(expect.objectContaining({
  kind: 'mcp',
  label: 'Buda MCP · 正文 Agent · Auto',
  detail: expect.stringContaining('测试账号 · sk_***'),
}))
```

When `loadFailed` is true, retain a label based on stable binding IDs and set `available: false`.

- [ ] **Step 2: Run the summary-model test and verify RED**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts`

Expected: FAIL because the status model does not exist.

- [ ] **Step 3: Implement the pure status model**

Export `buildMcpSourceStatus(input)` returning `{ kind, label, detail, available }`. Resolve friendly Server, account, and Agent names when metadata exists; fall back to IDs; render blank model as `Auto`; never include an unmasked key.

- [ ] **Step 4: Run the summary-model test and verify GREEN**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing UI wiring tests**

Extend `ProjectSettingsModal.test.ts` source assertions to require:

```ts
expect(panel).toContain('Buda 模型')
expect(panel).toContain('Auto（Buda / Agent 默认）')
expect(panel).toContain('placeholder="例如：账号支持的模型标识"')
expect(topbar).toContain('<McpGenerationSourceStatus')
expect(topbar).toContain('onOpenSettings={() => setProjectSettingsOpen(true)}')
expect(modal).toContain('onGenerationSourceSaved')
```

- [ ] **Step 6: Run the UI wiring test and verify RED**

Run: `cd ui/web && bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts`

Expected: FAIL because neither the status component nor model editor is wired.

- [ ] **Step 7: Add the model editor and save notification**

Add `onSaved?: () => void` to `McpGenerationSourcePanel`; invoke it after a successful source save. Add an Ant Design `Input` bound to `form.model` with an `Auto（Buda / Agent 默认）` affordance and explanatory text that Buda exposes no model-list tool. Thread `onGenerationSourceSaved?: () => void` through `ProjectSettingsModal`.

- [ ] **Step 8: Add the focused top-bar status component**

`McpGenerationSourceStatus` receives `projectId`, `initialSource`, `refreshKey`, and `onOpenSettings`. It initializes from `selectedProject.reference_config.prose_generation_source`, then loads `getProjectSource`, `listServers`, `listKeys`, and the selected account's Agent list. Render a compact clickable Ant Design `Tag` or small `Button` with a tooltip; on failure retain the binding identity and show an unavailable status.

Wire it outside the `!isImmersiveShell` block so it remains visible in both workspace modes. Increment a local `sourceRefreshKey` after settings saves and use compact CSS with ellipsis to protect the top-bar layout.

- [ ] **Step 9: Run web tests and build, then commit**

Run: `cd ui/web && bun test src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts && bun run build`

Expected: all tests PASS and Vite build exits 0.

```bash
git add ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts ui/web/src/pages/novel-workspace/McpGenerationSourceStatus.tsx ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx ui/web/src/pages/NovelProjectWorkspace.css
git commit -m "feat(mcp): surface project prose source in workspace"
```

### Task 4: Regression verification and integration

**Files:**
- Verify only; fix only files already in scope if a regression is found.

- [ ] **Step 1: Run the complete MCP-focused server suite**

Run: `cd ui/server && bun test src/mcp src/novel-writing-service/generation-source src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts src/routes/novel-mcp-binding-routes.test.ts`

Expected: all MCP-focused server tests PASS.

- [ ] **Step 2: Run the MCP-focused web suite**

Run: `cd ui/web && bun test src/pages/mcp-services/mcpServicesModel.test.ts src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts`

Expected: all MCP-focused web tests PASS.

- [ ] **Step 3: Build both applications**

Run: `bun run build:server && bun run build:web`

Expected: both builds exit 0.

- [ ] **Step 4: Inspect the final diff and local-data boundary**

Run: `git status --short && git diff HEAD~3 --check && git diff HEAD~3 --stat`

Expected: no whitespace errors; local `workspace/mcp-*.json`, `workspace/assets.json`, and Zhuque test artifacts remain untracked or unstaged and are absent from commits.

- [ ] **Step 5: Request code review and resolve findings**

Review against `docs/superpowers/specs/2026-08-01-mcp-source-visibility-and-model-routing-design.md`. Fix every Critical or Important issue with a new failing regression test, rerun the affected suite, and commit only scoped source/test changes.

- [ ] **Step 6: Run fresh final verification**

Run: `cd ui/server && bun test src/mcp src/novel-writing-service/generation-source src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts src/routes/novel-mcp-binding-routes.test.ts && cd ../web && bun test src/pages/mcp-services/mcpServicesModel.test.ts src/pages/novel-workspace/mcpGenerationSourceModel.test.ts src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts src/pages/novel-workspace/ProjectSettingsModal.test.ts && cd ../.. && bun run build:server && bun run build:web`

Expected: all selected tests PASS and both builds exit 0.

- [ ] **Step 7: Push the confirmed main branch**

Run: `git push origin main`

Expected: the remote `main` advances to the verified implementation commit; no local credential or workspace test-data file is included.
