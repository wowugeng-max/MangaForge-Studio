# Buda Standard MCP Handshake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete Buda initialized-notification suppression so Buda and every other Streamable HTTP MCP service use the standard handshake and can sustain consecutive tool calls.

**Architecture:** Keep `GenericMcpClient`, the bounded fetch, the Client manager, the Buda Adapter, and GenerationSource unchanged. Narrow the production change to Transport construction: always instantiate the SDK `StreamableHTTPClientTransport`; prove the change with a protocol-level fake endpoint that rejects tool traffic until `notifications/initialized` arrives, then complete two consecutive Agent-list tool calls.

**Tech Stack:** TypeScript, Bun 1.3, Bun test, `@modelcontextprotocol/client`, React/Vite dev UI, in-app Browser, SQLite-backed novel workspace.

---

## File map

- Modify `ui/server/src/mcp/client.test.ts`: replace the obsolete Buda handshake expectation with the standard handshake and consecutive-call regression.
- Modify `ui/server/src/mcp/client.ts`: delete the Buda-only Transport subclass and conditional factory branch.
- Create no production modules and change no Adapter, Runtime, GenerationSource, Web, or database schema files.
- Use `docs/superpowers/specs/2026-08-08-buda-standard-mcp-handshake-design.md` as the authority for scope and acceptance.

### Task 1: Lock the current Buda handshake regression with a failing test

**Files:**
- Modify: `ui/server/src/mcp/client.test.ts:390-445`
- Test: `ui/server/src/mcp/client.test.ts`

- [ ] **Step 1: Replace the obsolete Buda compatibility test with the desired standard protocol contract**

Replace `connects to Buda without sending the initialized notification its MCP endpoint rejects` with this test:

```ts
test('uses the standard initialized handshake for consecutive Buda tool calls', async () => {
  const methods: string[] = []
  let initialized = false
  const notInitialized = () => Response.json({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32000, message: 'Server not initialized' },
  }, { status: 400 })
  const budaFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const message = JSON.parse(String(init?.body || '{}'))
    methods.push(String(message.method || ''))
    if (message.method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'Buda MCP', version: '0.1.0' },
        },
      }, { headers: { 'Mcp-Session-Id': 'buda-session' } })
    }
    if (message.method === 'notifications/initialized') {
      initialized = true
      return new Response(null, { status: 202 })
    }
    if (message.method === 'tools/list') {
      if (!initialized) return notInitialized()
      return Response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: { tools: [{ name: 'api_claw_list_api_agents', inputSchema: { type: 'object' } }] },
      })
    }
    if (message.method === 'tools/call') {
      if (!initialized) return notInitialized()
      return Response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: { content: [{ type: 'text', text: 'ok' }], isError: false },
      })
    }
    throw new Error(`unexpected MCP method: ${message.method}`)
  }
  const client = createMcpClient({
    server: BUDA_MCP_SERVER_TEMPLATE,
    key,
    fetch: budaFetch as typeof fetch,
  })

  await client.connect()
  await client.callTool('api_claw_list_api_agents', {}, { operation: 'read_safe' })
  await client.callTool('api_claw_list_api_agents', {}, { operation: 'read_safe' })

  expect((client as any).transport?.constructor).toBe(StreamableHTTPClientTransport)
  expect(methods.filter(Boolean)).toEqual([
    'initialize',
    'notifications/initialized',
    'tools/list',
    'tools/call',
    'tools/call',
  ])
  await client.close()
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/client.test.ts -t "standard initialized handshake"
```

Expected: FAIL because the Buda-only Transport suppresses `notifications/initialized`, so tool discovery remains uninitialized or the expected method sequence is missing the notification.

### Task 2: Remove the obsolete Buda Transport special case

**Files:**
- Modify: `ui/server/src/mcp/client.ts:1-45`
- Test: `ui/server/src/mcp/client.test.ts`

- [ ] **Step 1: Delete the Buda-only initialized-notification suppression**

Change the SDK import from:

```ts
import {
  Client,
  isInitializedNotification,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type FetchLike,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/client'
```

to:

```ts
import {
  Client,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type FetchLike,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/client'
```

Delete `BudaStreamableHTTPClientTransport`. Replace the factory with:

```ts
const defaultSdkFactory: McpSdkFactory = {
  createClient: () => new Client({ name: 'mangaforge-studio', version: '1.0.0' }),
  createTransport: (url, options) => new StreamableHTTPClientTransport(url, options),
}
```

Do not change `buildMcpHeaders`, bounded response handling, error projection, Adapter registration, or stability classification.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/client.test.ts -t "standard initialized handshake"
```

Expected: PASS; the test observes the initialized notification and both tool calls succeed.

- [ ] **Step 3: Run the complete MCP Client test file**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp/client.test.ts
```

Expected: all tests pass with zero failures; provider-neutral standard handshake, exact not-ready evidence, response budgets, cancellation, and secret scrubbing remain green.

- [ ] **Step 4: Commit the protocol fix without protected workspace files**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git add ui/server/src/mcp/client.ts ui/server/src/mcp/client.test.ts
git diff --cached --name-only
git commit -m "fix(mcp): use standard Buda handshake"
```

Expected staged paths are exactly `ui/server/src/mcp/client.ts` and `ui/server/src/mcp/client.test.ts`; neither `ui/server/.workspace-config.json` nor `workspace/assets.json` is staged.

### Task 3: Verify the complete MCP and GenerationSource boundary

**Files:**
- Test only: `ui/server/src/mcp/**`
- Test only: `ui/server/src/novel-writing-service/generation-source/**`
- Test only: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`

- [ ] **Step 1: Run all MCP tests**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/mcp
```

Expected: zero failures across Client, manager, Runtime, Adapter, Drive, stability, lease, store, and secret-scrubbing tests.

- [ ] **Step 2: Run GenerationSource and binding regressions**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test src/novel-writing-service/generation-source \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts
```

Expected: zero failures; model and MCP remain exclusive project sources, and MCP binding/source leases remain enforced.

- [ ] **Step 3: Confirm the production diff is provider-neutral and bounded**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git show --stat --oneline HEAD
git show --format= -- ui/server/src/mcp/client.ts ui/server/src/mcp/client.test.ts
rg -n 'BudaStreamableHTTPClientTransport|isInitializedNotification' ui/server/src/mcp
git status --short
```

Expected: the removed Transport identifiers have zero matches; only the two protected user files remain unstaged.

### Task 4: Resume two-account real page acceptance

**Files:**
- Runtime data only: active temporary workspace selected by `ui/server/.workspace-config.json`
- No credential, remote body, or generated prose files may be committed.

- [ ] **Step 1: Restart the dev processes from the current commit**

Stop only the existing MangaForge server and Vite dev processes, then run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run dev:server
bun run dev:web -- --host 127.0.0.1
```

Expected: server listens on `8787`, Vite listens on `127.0.0.1:5173`, and both use the current commit.

- [ ] **Step 2: Finish the first MCP project binding from the UI**

Using the in-app Browser only:

1. Open the new novel project already created during acceptance.
2. Open project settings, choose the configured Buda Server, choose the first authorized MCP account, and select its existing remote novel Agent.
3. Save the binding without enabling MCP, then switch the chapter source from API to MCP.
4. Verify the top bar shows MCP enabled, API disabled, the selected account/Agent identity in masked form, and no active API model requirement.

Expected: project source endpoint and refreshed page both show `source_type=mcp`; no source fallback occurs.

- [ ] **Step 3: Generate the first project's missing materials and prose from the UI**

1. Create or open chapter 1.
2. Click the page action that automatically fills missing chapter materials; do not pre-seed data through direct API calls.
3. Wait for the material task to reach a terminal success state.
4. Refresh and verify worldbuilding, at least two character cards, setting-workshop content, chapter usage, Story State/preflight, and material score.
5. Verify strict preflight is ready, then click Generate Prose.
6. Wait for the prose task to reach terminal success and verify chapter text appears.
7. Record only project ID, local material/prose task IDs, `mcp` source, material counts/score, terminal statuses, and masked Session suffixes.

Expected: material and prose task IDs differ; their remote Sessions differ; quarantine count does not increase.

- [ ] **Step 4: Create and execute a second UI project with the second account**

Repeat Steps 2-3 for a different new novel project and the second authorized MCP account, using its existing remote Agent. Do not reuse the first project's local binding or source state.

Expected: both accounts independently complete material repair and chapter prose generation through MCP with distinct material/prose Sessions.

- [ ] **Step 5: Fail closed on uncertain remote mutations**

If any create/update/session action returns an unknown result:

1. Stop retries immediately.
2. Read the local authoritative project, run/task, artifact, and quarantine state.
3. Use existing reconciliation only when the stored receipt proves the remote outcome.
4. Retry only after the authoritative state proves no mutation was committed.

Expected: no duplicate remote Session, no blind replay, and no quarantine record is silently cleared.

### Task 5: Full verification and push main

**Files:**
- Verify entire repository.
- Push committed code and docs only.

- [ ] **Step 1: Stop acceptance dev processes**

Send normal termination to the exact server and Vite sessions started in Task 4. Confirm ports `8787` and `5173` no longer have those processes listening.

- [ ] **Step 2: Run full Server tests**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server
bun test
```

Expected: zero failures.

- [ ] **Step 3: Run full Web tests**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/web
bun test
```

Expected: zero failures.

- [ ] **Step 4: Run repository checks and inspect Git state**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check
git status --short --branch
git diff --cached --name-only
```

Expected: check exits 0; index is empty; the only unstaged paths are `ui/server/.workspace-config.json` and `workspace/assets.json`.

- [ ] **Step 5: Push main**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git push origin main
```

Expected: `origin/main` advances through the design and implementation commits. Final reporting contains bounded acceptance evidence only, with no accounts, passwords, Keys, complete Agent/Session IDs, remote error bodies, prompts, or generated prose.
