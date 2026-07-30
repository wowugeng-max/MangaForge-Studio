# MCP Local Security and Store Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict MangaForge to its supported loopback deployment, prevent MCP secrets from crossing public response boundaries, and make Server/Key JSON mutations serialized and crash-safe.

**Architecture:** Put loopback validation in a small reusable HTTP policy module and use the same predicate for direct request rejection and CORS. Add a workspace-scoped re-entrant coordinator plus a fail-closed atomic JSON helper beneath both MCP stores, then expose only public Server/Key DTOs and scrub upstream failures before they reach routes, SSE, diagnostics, or receipts.

**Tech Stack:** TypeScript, Bun test runner, Express 4, `cors`, Node/Bun filesystem promises, React 18, Ant Design

---

## File Map

- Create `ui/server/src/local-http-security.ts`: loopback host validation, trusted-origin predicate, Express guard, and CORS options.
- Create `ui/server/src/local-http-security.test.ts`: direct-handler, preflight, and listen-host policy tests.
- Create `ui/server/src/mcp/workspace-coordinator.ts`: re-entrant per-workspace mutation serialization.
- Create `ui/server/src/mcp/workspace-coordinator.test.ts`: mutual exclusion and re-entry tests.
- Create `ui/server/src/mcp/atomic-json-store.ts`: fail-closed array reads and same-directory atomic replacement.
- Create `ui/server/src/mcp/secret-scrubber.ts`: recursive value/error redaction using configured secrets and credential patterns.
- Create `ui/server/src/mcp/secret-scrubber.test.ts`: Key, Header, Bearer, Cookie, and nested-payload redaction tests.
- Modify `ui/server/src/index.ts`: reject non-loopback `HOST` before startup and install the origin guard before routes.
- Modify `ui/server/src/mcp/errors.ts`: add a stable store-corruption code and preserve scrubbed error metadata.
- Modify `ui/server/src/mcp/types.ts`: add the public Server/Header DTO and overwrite-only update payload.
- Modify `ui/server/src/mcp/server-store.ts`: use fail-closed atomic storage and public Header projection/merge helpers.
- Modify `ui/server/src/mcp/key-store.ts`: use fail-closed atomic storage and serialize all read-modify-write operations.
- Modify `ui/server/src/mcp/stores.test.ts`: characterize corruption, atomic writes, concurrent IDs, and Header secrecy.
- Modify `ui/server/src/mcp/client.ts`: scrub configured secrets from mapped connection/tool errors and diagnostics.
- Modify `ui/server/src/mcp/client.test.ts`: verify upstream secret reflection cannot escape.
- Modify `ui/server/src/routes/mcp-routes.ts`: return public Server DTOs, enforce origin-change credential boundaries, and scrub route errors.
- Modify `ui/server/src/routes/mcp-routes.test.ts`: verify public DTOs, same-origin updates, cross-origin conflicts, and scrubbed failures.
- Modify `ui/web/src/api/mcp.ts`: model public Header metadata and explicit removal payloads.
- Modify `ui/web/src/pages/McpServices/mcpServicesModel.ts`: build overwrite-only Header updates.
- Modify `ui/web/src/pages/McpServices/mcpServicesModel.test.ts`: verify blank-preserve, replace, and explicit-delete semantics.
- Modify `ui/web/src/pages/McpServices/index.tsx`: never hydrate Header values; show configured state and origin-change guidance.
- Modify `ui/web/src/pages/McpServices/mcpServicesShell.test.ts`: source-contract check for masked Header UI.

### Task 1: Enforce the localhost deployment boundary

**Files:**
- Create: `ui/server/src/local-http-security.ts`
- Create: `ui/server/src/local-http-security.test.ts`
- Modify: `ui/server/src/index.ts:1-70`
- Test: `ui/server/src/local-http-security.test.ts`

- [ ] **Step 1: Write the failing loopback policy tests**

Create `local-http-security.test.ts` with direct unit coverage so importing the production server does not open a port:

```ts
import { describe, expect, test } from 'bun:test'
import {
  assertLoopbackListenHost,
  createLocalOriginGuard,
  isTrustedLocalOrigin,
} from './local-http-security'

function responseHarness() {
  return {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
}

describe('local HTTP security', () => {
  test.each(['localhost', '127.0.0.1', '::1'])('accepts loopback listen host %s', host => {
    expect(assertLoopbackListenHost(host)).toBe(host)
  })

  test.each(['0.0.0.0', '192.168.1.20', 'mangaforge.local'])('rejects non-loopback listen host %s', host => {
    expect(() => assertLoopbackListenHost(host)).toThrow('loopback')
  })

  test.each([
    undefined,
    'http://localhost:5173',
    'https://localhost',
    'http://127.0.0.1:4173',
    'http://[::1]:8787',
  ])('trusts local or Origin-less request %s', origin => {
    expect(isTrustedLocalOrigin(origin)).toBe(true)
  })

  test.each([
    'https://evil.example',
    'http://localhost.evil.example',
    'null',
    'file://localhost/tmp/index.html',
    'not a url',
  ])('rejects hostile origin %s', origin => {
    expect(isTrustedLocalOrigin(origin)).toBe(false)
  })

  test('rejects before the downstream handler executes', () => {
    let handled = false
    const res = responseHarness()
    createLocalOriginGuard()(
      { headers: { origin: 'https://evil.example' } } as any,
      res as any,
      () => { handled = true },
    )
    expect(handled).toBe(false)
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ error_code: 'LOCAL_ORIGIN_FORBIDDEN' })
  })
}
```

- [ ] **Step 2: Run the policy test to verify RED**

Run:

```bash
cd ui/server
bun test src/local-http-security.test.ts
```

Expected: FAIL because `./local-http-security` does not exist.

- [ ] **Step 3: Implement the shared host/origin policy**

Create `local-http-security.ts`:

```ts
import type { CorsOptions } from 'cors'
import type { RequestHandler } from 'express'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function stripIpv6Brackets(value: string) {
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
}

export function isLoopbackHostname(value: string) {
  return LOOPBACK_HOSTS.has(stripIpv6Brackets(String(value || '').trim().toLowerCase()))
}

export function assertLoopbackListenHost(value: string) {
  const host = String(value || '').trim()
  if (!isLoopbackHostname(host)) {
    throw new Error('MangaForge server HOST must be loopback-only; received ' + (host || '(empty)'))
  }
  return host
}

export function isTrustedLocalOrigin(origin?: string) {
  if (origin === undefined || origin === '') return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && isLoopbackHostname(parsed.hostname)
  } catch {
    return false
  }
}

export function createLocalOriginGuard(): RequestHandler {
  return (req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
    if (isTrustedLocalOrigin(origin)) return next()
    return res.status(403).json({
      error: '仅允许本机 MangaForge 页面访问本地 API',
      detail: '仅允许本机 MangaForge 页面访问本地 API',
      error_code: 'LOCAL_ORIGIN_FORBIDDEN',
    })
  }
}

export const localCorsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(isTrustedLocalOrigin(origin) ? null : new Error('LOCAL_ORIGIN_FORBIDDEN'), Boolean(origin))
  },
}
```

- [ ] **Step 4: Wire the policy before every route**

In `index.ts`, import the policy, validate `HOST` when it is read, and replace unrestricted CORS:

```ts
import {
  assertLoopbackListenHost,
  createLocalOriginGuard,
  localCorsOptions,
} from './local-http-security'

const port = Number(process.env.PORT || 8787)
const host = assertLoopbackListenHost(process.env.HOST || 'localhost')

const app = express()
app.use(createLocalOriginGuard())
app.use(cors(localCorsOptions))
app.use(express.json({ limit: '5mb' }))
```

The origin guard must remain before JSON parsing and route registration.

Apply the same predicate before accepting a WebSocket upgrade:

```ts
listeningServer.on('upgrade', (req, socket) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
  if (!isTrustedLocalOrigin(origin)) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
    return
  }
  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname
})
```

Import `isTrustedLocalOrigin` beside the other policy exports and insert the guard before the current `pathname` declaration; the existing path/client/key/upgrade statements remain after that declaration. Add a source assertion to `local-http-security.test.ts` that `index.ts` invokes `isTrustedLocalOrigin` inside the `upgrade` handler, so a later refactor cannot bypass the browser-origin boundary.

```ts
test('guards WebSocket upgrades with the same local-origin predicate', () => {
  const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')
  const upgrade = source.slice(
    source.indexOf("listeningServer.on('upgrade'"),
    source.indexOf('void backgroundServices.start'),
  )
  expect(upgrade).toContain('isTrustedLocalOrigin(origin)')
  expect(upgrade.indexOf('isTrustedLocalOrigin(origin)')).toBeLessThan(
    upgrade.indexOf("pathname.startsWith('/api/ws/')"),
  )
})
```

Add `readFileSync` from `node:fs` and `join` from `node:path` to the test imports.

- [ ] **Step 5: Verify GREEN and compile the server entry**

Run:

```bash
cd ui/server
bun test src/local-http-security.test.ts
bun run build
```

Expected: all local HTTP security tests pass and the Bun bundle exits 0.

- [ ] **Step 6: Commit the deployment boundary**

```bash
git add ui/server/src/local-http-security.ts \
  ui/server/src/local-http-security.test.ts \
  ui/server/src/index.ts
git diff --cached --check
git commit -m "fix(server): enforce loopback-only HTTP access"
```

Expected: one commit containing only the loopback host/origin boundary.

### Task 2: Add the workspace mutation coordinator and fail-closed atomic JSON helper

**Files:**
- Create: `ui/server/src/mcp/workspace-coordinator.ts`
- Create: `ui/server/src/mcp/workspace-coordinator.test.ts`
- Create: `ui/server/src/mcp/atomic-json-store.ts`
- Modify: `ui/server/src/mcp/errors.ts:1-35`
- Modify: `ui/server/src/mcp/key-store.ts:1-110`
- Modify: `ui/server/src/mcp/server-store.ts:1-100`
- Modify: `ui/server/src/mcp/stores.test.ts`

- [ ] **Step 1: Write RED coordinator and store durability tests**

Add tests that hold the first mutation open, start a second mutation, and assert the second has not entered. Extend `stores.test.ts` with:

```ts
import { writeFile } from 'fs/promises'
import { McpError } from './errors'
import { upsertMcpServer } from './server-store'

test('serializes concurrent key allocation without duplicate IDs or lost records', async () => {
  const workspace = await temporaryWorkspace()
  const created = await Promise.all(Array.from({ length: 20 }, (_, index) => createMcpKey(workspace, {
    mcp_server_id: 'buda',
    key: 'sk_concurrent_' + index,
    description: '账号' + index,
  })))
  expect(new Set(created.map(item => item.id)).size).toBe(20)
  expect(await readMcpKeys(workspace)).toHaveLength(20)
})

test('reports corrupt JSON and never replaces it with an empty collection', async () => {
  const workspace = await temporaryWorkspace()
  const path = join(workspace, 'mcp-keys.json')
  await writeFile(path, '{broken', 'utf8')

  await expect(readMcpKeys(workspace)).rejects.toMatchObject({
    code: 'MCP_STORE_CORRUPT',
  } satisfies Partial<McpError>)
  await expect(createMcpKey(workspace, {
    mcp_server_id: 'buda',
    key: 'sk_must_not_write',
    description: '不得覆盖',
  })).rejects.toMatchObject({ code: 'MCP_STORE_CORRUPT' })
  expect(await readFile(path, 'utf8')).toBe('{broken')
})

test('preserves all concurrent server upserts', async () => {
  const workspace = await temporaryWorkspace()
  await Promise.all(Array.from({ length: 12 }, (_, index) => upsertMcpServer(workspace, {
    ...BUDA_MCP_SERVER_TEMPLATE,
    id: 'server-' + index,
    display_name: 'Server ' + index,
  })))
  expect(await readMcpServers(workspace)).toHaveLength(12)
})
```

Create `workspace-coordinator.test.ts` with one mutual-exclusion test and one nested re-entry test using `withMcpWorkspaceMutation`.

- [ ] **Step 2: Run the focused tests to verify RED**

Run:

```bash
cd ui/server
bun test src/mcp/workspace-coordinator.test.ts src/mcp/stores.test.ts
```

Expected: FAIL because the coordinator is missing and current stores lose concurrent mutations or treat corrupt JSON as empty.

- [ ] **Step 3: Implement a re-entrant workspace coordinator**

Create `workspace-coordinator.ts`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
import { resolve } from 'node:path'

type Waiter = {
  resolve(release: () => void): void
}

type WorkspaceLock = {
  locked: boolean
  waiters: Waiter[]
}

const locks = new Map<string, WorkspaceLock>()
const held = new AsyncLocalStorage<Set<string>>()

function keyForWorkspace(activeWorkspace: string) {
  return resolve(activeWorkspace)
}

async function acquire(key: string) {
  let lock = locks.get(key)
  if (!lock) {
    lock = { locked: false, waiters: [] }
    locks.set(key, lock)
  }
  const release = () => {
    const next = lock!.waiters.shift()
    if (next) return next.resolve(release)
    lock!.locked = false
    locks.delete(key)
  }
  if (!lock.locked) {
    lock.locked = true
    return release
  }
  return new Promise<() => void>(resolveRelease => {
    lock!.waiters.push({ resolve: resolveRelease })
  })
}

export async function withMcpWorkspaceMutation<T>(
  activeWorkspace: string,
  mutation: () => Promise<T>,
): Promise<T> {
  const key = keyForWorkspace(activeWorkspace)
  const active = held.getStore()
  if (active?.has(key)) return mutation()
  const release = await acquire(key)
  const next = new Set(active || [])
  next.add(key)
  try {
    return await held.run(next, mutation)
  } finally {
    release()
  }
}

export function assertMcpWorkspaceMutationHeld(activeWorkspace: string) {
  if (!held.getStore()?.has(keyForWorkspace(activeWorkspace))) {
    throw new Error('MCP workspace mutation coordinator is not held')
  }
}
```

- [ ] **Step 4: Implement fail-closed same-directory atomic JSON replacement**

Add `MCP_STORE_CORRUPT` and `MCP_STORE_IO_FAILED` to `McpErrorCode`. Create `atomic-json-store.ts`:

```ts
import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'
import { McpError } from './errors'

export async function readJsonArrayFailClosed(path: string): Promise<unknown[]> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return []
    throw new McpError('MCP_STORE_IO_FAILED', '读取 MCP 配置失败：' + basename(path))
  }
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('top-level value is not an array')
    return parsed
  } catch {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP 配置文件损坏：' + basename(path))
  }
}

export async function writeJsonArrayAtomic(path: string, value: unknown[]) {
  const temporary = join(dirname(path), '.' + basename(path) + '.' + process.pid + '.' + randomUUID() + '.tmp')
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' })
    await rename(temporary, path)
  } catch {
    await rm(temporary, { force: true }).catch(() => {})
    throw new McpError('MCP_STORE_IO_FAILED', '写入 MCP 配置失败：' + basename(path))
  }
}
```

- [ ] **Step 5: Route both stores through the helper and coordinator**

Replace each broad `try/catch` reader with `readJsonArrayFailClosed`. Wrap every read-modify-write method (`createMcpKey`, `updateMcpKey`, `deleteMcpKey`, `upsertMcpServer`, `deleteMcpServer`) in:

```ts
export function createMcpKey(
  activeWorkspace: string,
  input: Partial<McpKeyRecord> & Pick<McpKeyRecord, 'mcp_server_id' | 'key'>,
) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const keys = await readMcpKeys(activeWorkspace)
    const nextId = keys.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1
    const record = normalizeMcpKey({ ...input, id: nextId })
    await writeMcpKeysUnlocked(activeWorkspace, [...keys, record])
    return record
  })
})
```

Make `writeMcpKeys` and `writeMcpServers` assert the coordinator only when called by a mutation, while keeping explicit fixture seeding possible through an exported `replaceMcpKeys`/`replaceMcpServers` wrapper that acquires it:

```ts
async function writeMcpKeysUnlocked(activeWorkspace: string, keys: McpKeyRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpKeysPath(activeWorkspace), keys.map(normalizeMcpKey))
}

export function writeMcpKeys(activeWorkspace: string, keys: McpKeyRecord[]) {
  return withMcpWorkspaceMutation(activeWorkspace, () => writeMcpKeysUnlocked(activeWorkspace, keys))
}
```

Use the same pattern for Servers. This makes all exported writes safe and allows a later binding mutation to call them re-entrantly.

- [ ] **Step 6: Verify store durability**

Run:

```bash
cd ui/server
bun test src/mcp/workspace-coordinator.test.ts src/mcp/stores.test.ts src/mcp/runtime.test.ts
```

Expected: all tests pass; corrupt files remain byte-for-byte unchanged and concurrent IDs are unique.

- [ ] **Step 7: Commit the coordinator and stores**

```bash
git add ui/server/src/mcp/workspace-coordinator.ts \
  ui/server/src/mcp/workspace-coordinator.test.ts \
  ui/server/src/mcp/atomic-json-store.ts \
  ui/server/src/mcp/errors.ts \
  ui/server/src/mcp/key-store.ts \
  ui/server/src/mcp/server-store.ts \
  ui/server/src/mcp/stores.test.ts
git diff --cached --check
git commit -m "fix(mcp): serialize and atomically persist config stores"
```

Expected: one commit with no route or UI changes.

### Task 3: Add public Server DTOs and overwrite-only Header updates

**Files:**
- Modify: `ui/server/src/mcp/types.ts`
- Modify: `ui/server/src/mcp/server-store.ts`
- Modify: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/routes/mcp-routes.test.ts`
- Modify: `ui/web/src/api/mcp.ts`
- Modify: `ui/web/src/pages/McpServices/mcpServicesModel.ts`
- Modify: `ui/web/src/pages/McpServices/mcpServicesModel.test.ts`
- Modify: `ui/web/src/pages/McpServices/index.tsx`
- Modify: `ui/web/src/pages/McpServices/mcpServicesShell.test.ts`

- [ ] **Step 1: Write RED public DTO and origin-bound credential tests**

Extend the backend tests with these assertions:

```ts
test('never returns raw custom Header values', async () => {
  const workspace = await temporaryWorkspace()
  await writeMcpServers(workspace, [{
    ...BUDA_MCP_SERVER_TEMPLATE,
    custom_headers: { 'X-Space': 'private-space', Cookie: 'session=private' },
  }])
  const { app, handlers } = createRouteHarness()
  registerMcpRoutes(app, () => workspace, {} as any)

  const response = await call(handlers.get('GET /api/mcp/servers'))
  expect(response.body[0].custom_headers).toEqual([
    { name: 'Cookie', configured: true },
    { name: 'X-Space', configured: true },
  ])
  expect(JSON.stringify(response.body)).not.toContain('private-space')
  expect(JSON.stringify(response.body)).not.toContain('session=private')
})

test('allows same-origin URL edits and rejects cross-origin edits while a Key exists', async () => {
  const workspace = await temporaryWorkspace()
  await writeMcpServers(workspace, [BUDA_MCP_SERVER_TEMPLATE])
  await createMcpKey(workspace, { mcp_server_id: 'buda', key: 'sk_origin_bound', description: '账号' })
  const { app, handlers } = createRouteHarness()
  registerMcpRoutes(app, () => workspace, { invalidateServer: async () => {} } as any)

  const sameOrigin = await call(handlers.get('PUT /api/mcp/servers/:id'), {
    params: { id: 'buda' },
    body: { url: 'https://buda.im/api/mcp/v2' },
  })
  expect(sameOrigin.statusCode).toBe(200)

  const changedOrigin = await call(handlers.get('PUT /api/mcp/servers/:id'), {
    params: { id: 'buda' },
    body: { url: 'https://attacker.example/mcp' },
  })
  expect(changedOrigin.statusCode).toBe(409)
  expect(changedOrigin.body.error_code).toBe('MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL')
})
```

Extend the UI model test with an existing public Server whose headers are configured. Assert a blank value produces no overwrite, a nonblank value produces a replacement, and a removed row appears in `remove_custom_headers`.

Add a backend helper test:

```ts
expect(mergeMcpCustomHeaders(
  { 'X-Keep': 'old', 'X-Replace': 'old', 'X-Remove': 'old' },
  { 'X-Keep': '   ', 'X-Replace': 'new' },
  ['X-Remove'],
)).toEqual({
  'X-Keep': 'old',
  'X-Replace': 'new',
})
```

- [ ] **Step 2: Run backend and frontend tests to verify RED**

Run:

```bash
cd ui/server
bun test src/routes/mcp-routes.test.ts src/mcp/stores.test.ts
cd ../web
bun test src/pages/McpServices
```

Expected: FAIL because Server routes still return `Record<string,string>` and the UI cannot express explicit removal.

- [ ] **Step 3: Define and project the public Server shape**

Add to `mcp/types.ts`:

```ts
export type PublicMcpHeader = {
  name: string
  configured: boolean
}

export type PublicMcpServerRecord = Omit<McpServerRecord, 'custom_headers'> & {
  custom_headers: PublicMcpHeader[]
}

export type McpServerUpdateInput = Partial<Omit<McpServerRecord, 'id' | 'custom_headers'>> & {
  custom_headers?: Record<string, string>
  remove_custom_headers?: string[]
}
```

Add deterministic projection and merge helpers to `server-store.ts`:

```ts
export function toPublicMcpServer(record: McpServerRecord): PublicMcpServerRecord {
  const { custom_headers, ...safe } = record
  return {
    ...safe,
    custom_headers: Object.keys(custom_headers)
      .sort((left, right) => left.localeCompare(right))
      .map(name => ({ name, configured: Boolean(custom_headers[name]) })),
  }
}

export function mergeMcpCustomHeaders(
  previous: Record<string, string>,
  replacements: unknown,
  removals: unknown,
) {
  const next = { ...previous }
  for (const name of Array.isArray(removals) ? removals.map(String) : []) delete next[name]
  if (replacements && typeof replacements === 'object' && !Array.isArray(replacements)) {
    for (const [rawName, rawValue] of Object.entries(replacements)) {
      const name = rawName.trim()
      const value = String(rawValue ?? '').trim()
      if (name && value) next[name] = value
    }
  }
  return next
}
```

- [ ] **Step 4: Apply origin and public-DTO rules inside one coordinated mutation**

In Server create/update/delete handlers, wrap the final read/check/write section in `withMcpWorkspaceMutation`. For updates:

```ts
const result = await withMcpWorkspaceMutation(activeWorkspace, async () => {
  const previous = (await readMcpServers(activeWorkspace)).find(item => item.id === String(req.params.id))
  if (!previous) return null
  const server = requireHttpServer({
    ...previous,
    ...(req.body || {}),
    id: previous.id,
    custom_headers: mergeMcpCustomHeaders(
      previous.custom_headers,
      req.body?.custom_headers,
      req.body?.remove_custom_headers,
    ),
  })
  const previousOrigin = new URL(previous.url).origin
  const nextOrigin = new URL(server.url).origin
  if (previousOrigin !== nextOrigin) {
    const hasCredential = (await readMcpKeys(activeWorkspace))
      .some(key => key.mcp_server_id === previous.id)
    if (hasCredential) {
      throw new McpError(
        'MCP_BINDING_INVALID',
        '该 Server 已配置凭据；更换来源站点必须新建 Server 或移除后重新配置凭据',
        { reason: 'server_origin_changed' },
      )
    }
  }
  await upsertMcpServer(activeWorkspace, server)
  return server
})
```

Map `reason === 'server_origin_changed'` to HTTP 409 and public `error_code: 'MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL'`. Return `toPublicMcpServer` from list/create/update; never serialize the internal Server record.

- [ ] **Step 5: Update the web DTO and payload builder**

In `ui/web/src/api/mcp.ts`, replace `custom_headers: Record<string,string>` with:

```ts
custom_headers: Array<{ name: string; configured: boolean }>
```

Add a request type containing `custom_headers?: Record<string,string>` and `remove_custom_headers?: string[]`. Change `buildMcpServerPayload` to accept the existing Server:

```ts
export function buildMcpServerPayload(values: Record<string, any>, existing?: McpServerRecord) {
  const { custom_headers_list, enabled_tools_text, ...record } = values
  const rows = Array.isArray(custom_headers_list) ? custom_headers_list : []
  const customHeaders = Object.fromEntries(rows
    .map((item: any) => [String(item?.name || '').trim(), String(item?.value || '').trim()])
    .filter(([name, value]: [string, string]) => name && value))
  const currentNames = new Set(rows.map((item: any) => String(item?.name || '').trim()).filter(Boolean))
  const removeCustomHeaders = (existing?.custom_headers || [])
    .map(item => item.name)
    .filter(name => !currentNames.has(name))
  return {
    ...record,
    enabled_tools: String(enabled_tools_text || '').split(/\r?\n|,/).map(item => item.trim()).filter(Boolean),
    custom_headers: customHeaders,
    remove_custom_headers: removeCustomHeaders,
  }
}
```

- [ ] **Step 6: Render configured Header rows without raw values**

When opening an existing Server, hydrate:

```tsx
custom_headers_list: (server.custom_headers || []).map(header => ({
  name: header.name,
  value: '',
  configured: header.configured,
})),
```

Use `name` instead of `key` in the form. Show `已配置；留空保持不变` for configured rows, keep explicit row deletion, and pass `editingServer || undefined` to `buildMcpServerPayload`. Add an Alert stating that changing scheme/host/port requires a new Server or credential recreation.

Export and test this UI error mapper from `mcpServicesModel.ts`, then use it in the page’s `failureMessage` helper:

```ts
export function formatMcpServiceFailure(payload: any, fallback: string) {
  const code = String(payload?.error_code || '')
  if (code === 'MCP_STORE_CORRUPT') {
    return 'MCP 配置文件已损坏；系统没有覆盖原文件。请先备份并修复该文件。'
  }
  if (code === 'MCP_STORE_IO_FAILED') {
    return 'MCP 配置文件无法读写；请检查工作区权限和磁盘状态。'
  }
  if (code === 'MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL') {
    return '该 Server 已有凭据，不能直接更换来源站点；请新建 Server 或先解除项目绑定并重配凭据。'
  }
  if (code === 'MCP_REFERENCED_RECORD_CONFLICT') {
    return '该配置仍被小说项目引用；请先在项目正文来源中解除绑定。'
  }
  return String(payload?.error || payload?.detail || fallback)
}
```

- [ ] **Step 7: Verify public DTO and UI semantics**

Run:

```bash
cd ui/server
bun test src/routes/mcp-routes.test.ts src/mcp/stores.test.ts
cd ../web
bun test src/pages/McpServices
```

Expected: all focused tests pass and serialized Server responses contain Header names/configured flags only.

- [ ] **Step 8: Commit the public Server boundary**

```bash
git add ui/server/src/mcp/types.ts \
  ui/server/src/mcp/server-store.ts \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/mcp-routes.test.ts \
  ui/web/src/api/mcp.ts \
  ui/web/src/pages/McpServices/mcpServicesModel.ts \
  ui/web/src/pages/McpServices/mcpServicesModel.test.ts \
  ui/web/src/pages/McpServices/index.tsx \
  ui/web/src/pages/McpServices/mcpServicesShell.test.ts
git diff --cached --check
git commit -m "fix(mcp): hide headers and bind credentials to server origins"
```

Expected: one backend/UI boundary commit.

### Task 4: Scrub secrets from errors, diagnostics, progress, and receipts

**Files:**
- Create: `ui/server/src/mcp/secret-scrubber.ts`
- Create: `ui/server/src/mcp/secret-scrubber.test.ts`
- Modify: `ui/server/src/mcp/client.ts`
- Modify: `ui/server/src/mcp/client.test.ts`
- Modify: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/routes/mcp-routes.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.mcp.test.ts`

- [ ] **Step 1: Write RED recursive scrubbing and reflected-error tests**

Create tests with synthetic values only:

```ts
const reflectedKey = 'sk_' + 'test_reflected_secret'
const scrubber = createMcpSecretScrubber({
  keys: [reflectedKey],
  headerValues: ['private-space-token', 'session=private-cookie'],
})
const output = scrubber.scrubValue({
  error: `Authorization: Bearer ${reflectedKey}`,
  nested: ['X-Space=private-space-token', 'Cookie: session=private-cookie'],
  safe: 'agent-1',
})
expect(JSON.stringify(output)).not.toContain(reflectedKey)
expect(JSON.stringify(output)).not.toContain('private-space-token')
expect(JSON.stringify(output)).not.toContain('private-cookie')
expect(output).toMatchObject({ safe: 'agent-1' })
```

In `client.test.ts`, make the fake SDK throw an error containing the Key and Header value and assert the caught `McpError` contains neither. In route and GenerationSource tests, inject a reflected error and assert JSON response, progress event, `error_message`, and `output_ref` are clean.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
cd ui/server
bun test \
  src/mcp/secret-scrubber.test.ts \
  src/mcp/client.test.ts \
  src/routes/mcp-routes.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts
```

Expected: FAIL because reflected Key/Header values still appear in mapped errors or durable receipts.

- [ ] **Step 3: Implement the central recursive scrubber**

Create `secret-scrubber.ts`:

```ts
const SENSITIVE_FIELD = /^(authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|token|secret)$/i
const GENERIC_PATTERNS = [
  /\bBearer\s+[^\s,;]+/gi,
  /\bsk_[A-Za-z0-9_-]{8,}\b/g,
  /\b(authorization|proxy-authorization|cookie)\s*[:=]\s*[^\r\n,;]+/gi,
]

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createMcpSecretScrubber(input: {
  keys?: string[]
  headerValues?: string[]
} = {}) {
  const secrets = [...(input.keys || []), ...(input.headerValues || [])]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  const scrubText = (value: unknown) => {
    let text = String(value ?? '')
    for (const secret of secrets) text = text.replace(new RegExp(escaped(secret), 'g'), '[REDACTED]')
    for (const pattern of GENERIC_PATTERNS) text = text.replace(pattern, '[REDACTED]')
    return text
  }
  const scrubValue = (value: unknown, seen = new WeakSet<object>()): any => {
    if (typeof value === 'string') return scrubText(value)
    if (value === null || value === undefined || typeof value !== 'object') return value
    if (seen.has(value as object)) return '[Circular]'
    seen.add(value as object)
    if (Array.isArray(value)) return value.map(item => scrubValue(item, seen))
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_FIELD.test(key) ? '[REDACTED]' : scrubValue(item, seen),
    ]))
  }
  return { scrubText, scrubValue }
}
```

- [ ] **Step 4: Apply the scrubber at every MCP egress**

In `GenericMcpClient`, create a scrubber from `key.key` and `Object.values(server.custom_headers)` and use `scrubText` before constructing every mapped `McpError`. Scrub `content` placed into error details and the object returned from `diagnostics()`.

In MCP route wrappers, build a scrubber from submitted `key`/`custom_headers` plus stored records when readable; scrub both known `McpError` messages/details and unknown failures before `res.json`. If a store is corrupt, retain the stable `MCP_STORE_CORRUPT` message without attempting to replace the store.

In `McpGenerationSource`, scrub `onProgress.detail`, `errorReceipt`, `output_ref`, and `error_message` with the selected Key/Header scrubber obtained from the resolved credential. In `buildStandaloneProseServiceErrorPayload`, recursively scrub the bounded MCP error fields before SSE serialization; terminal residual prose remains governed by the existing `blocked_invalid` rule.

- [ ] **Step 5: Verify every tested egress is clean**

Run:

```bash
cd ui/server
bun test \
  src/mcp/secret-scrubber.test.ts \
  src/mcp/client.test.ts \
  src/routes/mcp-routes.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts
```

Expected: all tests pass and each synthetic secret is absent from serialized values.

- [ ] **Step 6: Commit centralized redaction**

```bash
git add ui/server/src/mcp/secret-scrubber.ts \
  ui/server/src/mcp/secret-scrubber.test.ts \
  ui/server/src/mcp/client.ts \
  ui/server/src/mcp/client.test.ts \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/mcp-routes.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts \
  ui/server/src/routes/novel-generation/builders.ts \
  ui/server/src/routes/novel-generation/builders.mcp.test.ts
git diff --cached --check
git commit -m "fix(mcp): scrub secrets from public and durable errors"
```

Expected: one redaction commit with synthetic test credentials only.

### Task 5: Verify the independently releasable security/store increment

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run focused MCP backend tests**

```bash
cd ui/server
bun test \
  src/local-http-security.test.ts \
  src/mcp/workspace-coordinator.test.ts \
  src/mcp/secret-scrubber.test.ts \
  src/mcp/stores.test.ts \
  src/mcp/client.test.ts \
  src/mcp/runtime.test.ts \
  src/routes/mcp-routes.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts
```

Expected: all focused tests pass with 0 failures.

- [ ] **Step 2: Run the MCP frontend tests and production builds**

```bash
cd ui/web
bun test src/pages/McpServices
bun run build
cd ../server
bun run build
```

Expected: tests and both builds exit 0. Existing Vite dynamic-import and chunk-size warnings are allowed.

- [ ] **Step 3: Run repository hygiene checks**

Run from the worktree root:

```bash
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

Expected: all checks exit 0, protected workspace paths are absent, no real credential pattern is present, and the worktree is clean.
