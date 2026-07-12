# Key Monitor Opt-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make automatic Key health probing disabled by default while preserving explicit opt-in and all manual Key/model test endpoints.

**Architecture:** Keep probing and scheduling behavior inside `key-monitor.ts`, but add one pure environment-value parser used by the server entrypoint. The server passes `enabled:false` unless `KEY_MONITOR_ENABLED` is explicitly the string `true`, so no startup or hourly provider request occurs by default.

**Tech Stack:** Bun, TypeScript, Bun test, Express server bootstrap.

---

### Task 1: Make automatic Key monitoring explicitly opt-in

**Files:**
- Modify: `ui/server/src/key-monitor.ts`
- Modify: `ui/server/src/key-monitor.test.ts`
- Modify: `ui/server/src/index.ts`

- [ ] **Step 1: Write failing tests for the opt-in contract**

Update the imports in `ui/server/src/key-monitor.test.ts` and replace the existing source-only startup assertion with behavior tests:

```ts
import { checkKeysOnce, keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'

test('automatic key monitoring is disabled unless explicitly enabled', () => {
  expect(keyMonitorEnabledFromEnv(undefined)).toBe(false)
  expect(keyMonitorEnabledFromEnv('')).toBe(false)
  expect(keyMonitorEnabledFromEnv('false')).toBe(false)
  expect(keyMonitorEnabledFromEnv('1')).toBe(false)
  expect(keyMonitorEnabledFromEnv('true')).toBe(true)
  expect(keyMonitorEnabledFromEnv('TRUE')).toBe(true)
  expect(keyMonitorEnabledFromEnv(' true ')).toBe(true)
})

test('server startup uses the explicit opt-in parser', () => {
  const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')

  expect(source).toContain("import { keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'")
  expect(source).toContain('enabled: keyMonitorEnabledFromEnv(process.env.KEY_MONITOR_ENABLED)')
  expect(source).not.toContain("process.env.KEY_MONITOR_ENABLED || 'true'")
})
```

Add a scheduling regression using a temporary workspace with an active stale Key and a fetch counter:

```ts
test('disabled automatic monitoring never probes immediately or on its interval', async () => {
  const workspace = await tempWorkspace()
  await writeFile(join(workspace, 'providers.json'), JSON.stringify([{ id: 'openai', api_format: 'openai_compatible', auth_type: 'bearer', default_base_url: 'https://gateway.example/v1', is_active: true }]))
  await writeFile(join(workspace, 'keys.json'), JSON.stringify([{ id: 1, provider: 'openai', key: 'must-not-run', is_active: true, last_checked: '' }]))
  await writeFile(join(workspace, 'models.json'), '[]')
  const previousFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return new Response('{}', { status: 200 })
  }) as any

  try {
    const monitor = startKeyMonitor(() => workspace, { enabled: false, intervalMs: 1, runImmediately: true })
    await new Promise(resolve => setTimeout(resolve, 20))
    monitor.stop()
    expect(monitor.started).toBe(false)
    expect(calls).toBe(0)
  } finally {
    globalThis.fetch = previousFetch
  }
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
bun test ui/server/src/key-monitor.test.ts
```

Expected: the suite fails because `keyMonitorEnabledFromEnv` is not exported and `index.ts` still defaults `KEY_MONITOR_ENABLED` to true.

- [ ] **Step 3: Implement the minimal opt-in parser**

Add to `ui/server/src/key-monitor.ts`:

```ts
export function keyMonitorEnabledFromEnv(value: string | undefined) {
  return String(value || '').trim().toLowerCase() === 'true'
}
```

Update `ui/server/src/index.ts`:

```ts
import { keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'
```

and:

```ts
keyMonitor = startKeyMonitor(getWorkspace, {
  enabled: keyMonitorEnabledFromEnv(process.env.KEY_MONITOR_ENABLED),
  intervalMs: Number(process.env.KEY_MONITOR_INTERVAL_MS || 60 * 60 * 1000),
  onError: error => console.warn('Key monitor error:', String(error).slice(0, 240)),
})
```

Do not change `checkKeysOnce()`, `probeKeyWithBestAvailableMethod()`, or manual API routes.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test ui/server/src/key-monitor.test.ts ui/server/src/routes/keys.test.ts ui/server/src/routes/models.test.ts
```

Expected: all tests pass, including existing real-probe-shape tests for explicitly invoked checks.

- [ ] **Step 5: Verify server build and diff**

Run:

```bash
bun run build:server
git diff --check
```

Expected: both commands exit 0. Confirm `workspace/providers.json`, `workspace/keys.json`, and `workspace/models.json` were not staged or modified by tests.

- [ ] **Step 6: Commit the implementation**

```bash
git add ui/server/src/key-monitor.ts ui/server/src/key-monitor.test.ts ui/server/src/index.ts docs/superpowers/plans/2026-07-12-key-monitor-opt-in-implementation.md
git commit -m "fix(server): make key monitoring opt-in"
```
