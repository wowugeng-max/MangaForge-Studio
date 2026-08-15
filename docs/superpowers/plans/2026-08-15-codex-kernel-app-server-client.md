# Codex 内核 · 分期 3（app-server 客户端）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`（v1.1）的分期 3：`codex app-server` stdio JSON-RPC 客户端、单候选跑通 `$story-review`（显式 skill item）、`events.jsonl` + spawn 证据 + `last-message.md`、探针 ③④。**不做** job 编排/门/commit/旧按钮转调/并跑选优（分期 4-5 另开计划）。

**Architecture:** 新增 `ui/server/src/kernel/codex/` 目录：`rpc.ts`（行分隔 JSON-RPC 进程客户端）→ `session.ts`（app-server 协议五方法）→ `run-candidate.ts`（组合分期 2 的投影/挂载/快照/供应商翻译，跑一个候选到收回为止）。测试全部打真进程——用仓库内置的假 app-server（bun 脚本，讲同一协议）当二进制，真 codex 的行为由部署机上的探针 ③④ 验证。

**Tech Stack:** Bun（Bun.spawn、bun:test）、TypeScript。零新依赖。

---

## Global Constraints

- 只允许调用 spec §7.2/风险节点名的方法：`initialize`（+ `initialized` 通知）、`thread/start`、`turn/start`、`turn/interrupt`、`skills/list`；被动消费 `thread/started` / `turn/started` / `item/*` / `turn/completed`。**新方法一律不得调用。**
- 不改 Codex 源码（六补丁条件之外零改动）；本分期不需要任何补丁。
- 磁盘新增物只在 `jobs/{job_id}/` 内：`events.jsonl`、`last-message.md`（spec §工作区磁盘 已声明）。
- 候选调用顺序固定（spec §7.2）：写隔离 config.toml → 拉进程（cwd=投影 `project/`，env `CODEX_HOME`、`MANGAFORGE_CODEX_KEY`，argv 带 `--ignore-user-config`）→ `initialize` + `initialized` → `thread/start`（sandbox 驼峰映射：`workspace-write`→`workspaceWrite`、`read-only`→`readOnly`；approvalPolicy=`never`）→ `skills/list` 预检（mention 非空且未发现 → `SKILL_NOT_FOUND`，不发 turn）→ `turn/start`（input = text + skill item）→ 收通知到 `turn/completed`。
- `$HOME` 硬隔离（把子进程 HOME 指向 job 目录）**本分期不启用**（spec 注明「先过探针再启用」）；env 只显式透传 `PATH`、`HOME` 与本表所列变量。
- key 值只进子进程环境变量 `MANGAFORGE_CODEX_KEY`，不落盘、不进 events.jsonl（sink 记录的是 JSON-RPC 消息，不含 env）。
- 测试命令统一 `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test <相对路径>`；conventional commits，每任务一提交。
- 新代码全在 `ui/server/src/kernel/codex/`（探针改动在 `kernel/probe.ts`，路由改动在 `routes/kernel-routes.ts`）。

### 本分期新增决定（实现后需折入 spec v1.2）

| 决定 | 取值 |
|---|---|
| 引擎级终态错误码 | `ENGINE_FAILED`（进程崩溃 / 协议错误 / turn 超时；写候选 `error_code`，HTTP 映射 500，分期 4 使用） |
| key 缺失 | `PROVIDER_TRANSLATE_FAILED`（无法构造可用供应商环境，与翻译失败同类） |
| turn 超时 | 空闲超时 120s（无任何通知即视为挂死）+ 硬上限 30min，均可注入覆盖 |
| 探针请求体 | `POST /api/kernel/runtime/probe` body 可带 `{ "model_id": number }`；缺省时 ④ 保持 `pending`（原因：④ 消耗一次真实 turn，必须显式选模型） |
| probe 结果类型 | `skills` / `agents_spawn` 从 `'pending'` 改为 `{ ok, message? } | 'pending'` |
| 合同列表 | probe ③ 失败 → 挂 `skill_tree` 的合同 `implemented=false`、`implemented_reason='SKILLS_PROBE_FAILED'`；④ 失败 → 带 `require_reviewer_agents` 门的合同 `implemented_reason='AGENTS_PROBE_FAILED'`；probe 为 `pending` 不翻转（部署前置未跑完不阻塞列表） |

### 协议形状约定（客户端宽容读取）

app-server 仍有实验字段，客户端按下表发送并宽容读取；真机一致性由探针 ③④ 把关。假 app-server fixture 是本表的可执行编码。

| 调用 | 发送 params | 读取 result |
|---|---|---|
| `initialize` | `{ clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version } }` | 忽略内容 |
| `initialized`（通知） | `{}` | — |
| `thread/start` | `{ cwd, sandbox, approvalPolicy: 'never' }` | `result.threadId ?? result.thread?.id` |
| `skills/list` | `{ cwds: [projectDir] }` | `result.skills ?? result.data ?? []`，每项取 `name` 与 `path` |
| `turn/start` | `{ threadId, input: [{ type:'text', text }, { type:'skill', name, path }?] }` | `result.turnId ?? result.turn?.id ?? ''` |
| `turn/interrupt` | `{ threadId, turnId }` | 忽略内容 |

通知读取：`turn/completed` 匹配 `params.threadId === threadId`（turnId 未知时只按 thread 匹配）；agent 消息取 `item/*` 通知中 `params.item.type ∈ {'agentMessage','agent_message'}` 的 `params.item.text`；spawn 证据取 `thread/started` 中 `params.parentThreadId ?? params.thread?.parentThreadId` 非空的事件。

---

### Task 1: 行分隔 JSON-RPC 进程客户端

**Files:**
- Create: `ui/server/src/kernel/codex/rpc.ts`
- Test: `ui/server/src/kernel/codex/rpc.test.ts`

**Interfaces:**
- Produces:
  - `type RpcEventSink = (direction: 'send' | 'recv' | 'meta', message: Record<string, any>) => void`
  - `spawnCodexRpc(input: { argv: string[]; cwd: string; env: Record<string, string>; sink?: RpcEventSink }): CodexRpcClient`
  - `CodexRpcClient = { request(method, params?, timeoutMs?): Promise<any>; notify(method, params?): void; onNotification(handler): void; waitForNotification(match, timeoutMs): Promise<{ method, params }>; kill(): void; exited: Promise<number> }`
- 行为：stdout 按行拆 JSON；带 `id` 且有 `result`/`error` → 对应 pending 请求 resolve/reject（`error` reject 为 `Error(error.message)` 附 `rpc_code`）；带 `method` 无 `id` → 通知，广播给 onNotification 与 waitForNotification；非 JSON 行 → sink 记 `meta` `{ raw }` 后忽略。所有收发都过 sink。request 默认超时 10000ms，超时 reject `Error('rpc timeout: <method>')`。`kill()` 后所有 pending reject。

- [ ] **Step 1: 写失败测试（用临时 bun 脚本当对端）**

```ts
// ui/server/src/kernel/codex/rpc.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnCodexRpc } from './rpc'

const PEER = `
const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1)
    if (!line.trim()) continue
    const msg = JSON.parse(line)
    if (msg.method === 'echo') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'progress', params: { n: 1 } }) + '\\n')
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { echoed: msg.params.x } }) + '\\n')
    }
    if (msg.method === 'boom') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'boom!' } }) + '\\n')
    if (msg.method === 'silent') { /* never answers */ }
    if (msg.method === 'garbage') process.stdout.write('not json at all\\n')
  }
})
`

function spawnPeer(sinkLines: Array<{ direction: string; message: any }>) {
  const dir = mkdtempSync(join(tmpdir(), 'rpc-peer-'))
  const script = join(dir, 'peer.ts')
  writeFileSync(script, PEER)
  return spawnCodexRpc({
    argv: [process.execPath, script],
    cwd: dir,
    env: {},
    sink: (direction, message) => sinkLines.push({ direction, message }),
  })
}

describe('spawnCodexRpc', () => {
  test('request resolves with result and sink records both directions', async () => {
    const lines: Array<{ direction: string; message: any }> = []
    const client = spawnPeer(lines)
    const result = await client.request('echo', { x: 42 })
    expect(result).toEqual({ echoed: 42 })
    expect(lines.some(l => l.direction === 'send' && l.message.method === 'echo')).toBe(true)
    expect(lines.some(l => l.direction === 'recv' && l.message.result?.echoed === 42)).toBe(true)
    client.kill()
  })

  test('error response rejects with message', async () => {
    const client = spawnPeer([])
    await expect(client.request('boom')).rejects.toThrow('boom!')
    client.kill()
  })

  test('notification reaches waiter; request timeout rejects', async () => {
    const client = spawnPeer([])
    const waiter = client.waitForNotification((method) => method === 'progress', 5000)
    await client.request('echo', { x: 1 })
    expect((await waiter).params).toEqual({ n: 1 })
    await expect(client.request('silent', {}, 300)).rejects.toThrow('rpc timeout')
    client.kill()
  })

  test('non-json line is recorded as meta and does not break the stream', async () => {
    const lines: Array<{ direction: string; message: any }> = []
    const client = spawnPeer(lines)
    await expect(client.request('garbage', {}, 300)).rejects.toThrow('rpc timeout')
    expect(lines.some(l => l.direction === 'meta' && String(l.message.raw).includes('not json'))).toBe(true)
    const result = await client.request('echo', { x: 2 })
    expect(result.echoed).toBe(2)
    client.kill()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/rpc.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/codex/rpc.ts
export type RpcEventSink = (direction: 'send' | 'recv' | 'meta', message: Record<string, any>) => void

export type CodexRpcClient = {
  request(method: string, params?: any, timeoutMs?: number): Promise<any>
  notify(method: string, params?: any): void
  onNotification(handler: (method: string, params: any) => void): void
  waitForNotification(match: (method: string, params: any) => boolean, timeoutMs: number): Promise<{ method: string; params: any }>
  kill(): void
  exited: Promise<number>
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

export function spawnCodexRpc(input: {
  argv: string[]
  cwd: string
  env: Record<string, string>
  sink?: RpcEventSink
}): CodexRpcClient {
  const sink = input.sink || (() => {})
  const proc = Bun.spawn(input.argv, {
    cwd: input.cwd,
    env: { PATH: process.env.PATH || '', HOME: process.env.HOME || '', ...input.env },
    stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
  })

  let nextId = 1
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  const notificationHandlers: Array<(method: string, params: any) => void> = []

  function dispatch(message: Record<string, any>) {
    sink('recv', message)
    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const entry = pending.get(Number(message.id))
      if (!entry) return
      pending.delete(Number(message.id))
      clearTimeout(entry.timer)
      if (message.error) entry.reject(Object.assign(new Error(String(message.error.message || 'rpc error')), { rpc_code: message.error.code }))
      else entry.resolve(message.result)
      return
    }
    if (typeof message.method === 'string') {
      for (const handler of [...notificationHandlers]) handler(message.method, message.params)
    }
  }

  ;(async () => {
    const decoder = new TextDecoder()
    let buffer = ''
    for await (const chunk of proc.stdout) {
      buffer += decoder.decode(chunk)
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        try {
          dispatch(JSON.parse(line))
        } catch {
          sink('meta', { raw: line })
        }
      }
    }
  })()

  function send(message: Record<string, any>) {
    sink('send', message)
    proc.stdin.write(JSON.stringify(message) + '\n')
    proc.stdin.flush()
  }

  function failAllPending(reason: string) {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer)
      entry.reject(new Error(reason))
    }
    pending.clear()
  }

  return {
    request(method, params = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
      const id = nextId++
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`rpc timeout: ${method}`))
        }, timeoutMs)
        pending.set(id, { resolve, reject, timer })
        send({ jsonrpc: '2.0', id, method, params })
      })
    },
    notify(method, params = {}) {
      send({ jsonrpc: '2.0', method, params })
    },
    onNotification(handler) {
      notificationHandlers.push(handler)
    },
    waitForNotification(match, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const at = notificationHandlers.indexOf(handler)
          if (at >= 0) notificationHandlers.splice(at, 1)
          reject(new Error('notification timeout'))
        }, timeoutMs)
        function handler(method: string, params: any) {
          if (!match(method, params)) return
          clearTimeout(timer)
          const at = notificationHandlers.indexOf(handler)
          if (at >= 0) notificationHandlers.splice(at, 1)
          resolve({ method, params })
        }
        notificationHandlers.push(handler)
      })
    },
    kill() {
      failAllPending('rpc client killed')
      proc.kill()
    },
    exited: proc.exited,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/rpc.test.ts`
Expected: PASS（4 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/rpc.ts ui/server/src/kernel/codex/rpc.test.ts
git commit -m "feat(kernel): line-delimited json-rpc stdio client for codex"
```

---

### Task 2: events.jsonl 记录器与 last-message.md

**Files:**
- Create: `ui/server/src/kernel/codex/events.ts`
- Test: `ui/server/src/kernel/codex/events.test.ts`

**Interfaces:**
- Produces:
  - `createKernelEventsRecorder(jobDir: string): { sink: RpcEventSink; path: string }` — 每条消息追加一行 `{ ts: ISO, direction, message }` 到 `{jobDir}/events.jsonl`（目录自动创建）
  - `readKernelEvents(jobDir: string): Array<{ ts: string; direction: string; message: any }>`（文件缺失返回 `[]`，坏行跳过）
  - `writeKernelLastMessage(jobDir: string, text: string): string`（写 `{jobDir}/last-message.md`，返回路径）

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/codex/events.test.ts
import { describe, expect, test } from 'bun:test'
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createKernelEventsRecorder, readKernelEvents, writeKernelLastMessage } from './events'

describe('kernel events recorder', () => {
  test('sink appends jsonl and readKernelEvents round-trips', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    const recorder = createKernelEventsRecorder(jobDir)
    recorder.sink('send', { method: 'initialize' })
    recorder.sink('recv', { id: 1, result: {} })
    const events = readKernelEvents(jobDir)
    expect(events.length).toBe(2)
    expect(events[0].direction).toBe('send')
    expect(events[0].message.method).toBe('initialize')
    expect(typeof events[0].ts).toBe('string')
  })

  test('bad line is skipped, missing file returns []', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    expect(readKernelEvents(jobDir)).toEqual([])
    const recorder = createKernelEventsRecorder(jobDir)
    recorder.sink('recv', { ok: 1 })
    appendFileSync(recorder.path, 'garbage line\n')
    recorder.sink('recv', { ok: 2 })
    expect(readKernelEvents(jobDir).map(e => e.message.ok)).toEqual([1, 2])
  })

  test('writeKernelLastMessage writes markdown', () => {
    const jobDir = mkdtempSync(join(tmpdir(), 'events-job-'))
    const path = writeKernelLastMessage(jobDir, '最终回复正文')
    expect(path.endsWith('last-message.md')).toBe(true)
    expect(readFileSync(path, 'utf8')).toBe('最终回复正文')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/events.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/codex/events.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RpcEventSink } from './rpc'

export function createKernelEventsRecorder(jobDir: string): { sink: RpcEventSink; path: string } {
  mkdirSync(jobDir, { recursive: true })
  const path = join(jobDir, 'events.jsonl')
  const sink: RpcEventSink = (direction, message) => {
    appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), direction, message }) + '\n')
  }
  return { sink, path }
}

export function readKernelEvents(jobDir: string): Array<{ ts: string; direction: string; message: any }> {
  const path = join(jobDir, 'events.jsonl')
  if (!existsSync(path)) return []
  const events: Array<{ ts: string; direction: string; message: any }> = []
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line))
    } catch {
      continue
    }
  }
  return events
}

export function writeKernelLastMessage(jobDir: string, text: string): string {
  mkdirSync(jobDir, { recursive: true })
  const path = join(jobDir, 'last-message.md')
  writeFileSync(path, String(text ?? ''))
  return path
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/events.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/events.ts ui/server/src/kernel/codex/events.test.ts
git commit -m "feat(kernel): events.jsonl recorder and last-message writer"
```

---

### Task 3: 假 app-server fixture（协议约定的可执行编码）

**Files:**
- Create: `ui/server/src/kernel/codex/fixtures/fake-app-server.ts`
- Test: `ui/server/src/kernel/codex/fixtures/fake-app-server.test.ts`

**Interfaces:**
- fixture 是独立 bun 脚本，测试用 `argv: [process.execPath, fakeAppServerPath()]` 直接当 codex 二进制。行为由环境变量驱动：
  - `FAKE_SKILLS`：JSON 数组 `[{ "name": "story-review", "path": "/abs/path" }]`，`skills/list` 返回值（缺省 `[]`）
  - `FAKE_SPAWN=1`：`turn/start` 后先发 `thread/started`（带 `parentThreadId`，agent 名 `story-architect`）
  - `FAKE_WRITE_FILE` + `FAKE_WRITE_CONTENT`：turn 期间在 **cwd** 写该相对路径文件（模拟 Codex 编辑投影）
  - `FAKE_AGENT_MESSAGE`：turn 结束前发 `item/completed`，item `{ type: 'agentMessage', text }`（缺省 `'done'`）
  - `FAKE_HANG_TURN=1`：`turn/start` 应答后不再发任何通知（测超时/interrupt）
- 协议行为（严格按本计划头部「协议形状约定」）：
  - `initialize` → `result {}`；若未收到 `initialized` 通知就来 `thread/start` → 回 error `{ code: -32002, message: 'not initialized' }`
  - `thread/start` → `result { threadId: 'fake-thread-1' }`
  - `skills/list` → `result { skills: FAKE_SKILLS }`
  - `turn/start` → `result { turnId: 'fake-turn-1' }`，随后依序通知：`turn/started`、（可选 spawn）、（可选写文件）、`item/completed`(agentMessage)、`turn/completed { threadId, turnId }`
  - `turn/interrupt` → `result {}` + `turn/completed { threadId, turnId, aborted: true }`
- 导出 `fakeAppServerPath()`（同目录 `index` 式 helper 放 fixture 文件底部不行——脚本会被直接执行；改为在测试里 `join(import.meta.dir, 'fake-app-server.ts')`，不导出任何东西）

- [ ] **Step 1: 写失败测试（直接用 Task 1 的 rpc 客户端驱动 fixture）**

```ts
// ui/server/src/kernel/codex/fixtures/fake-app-server.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnCodexRpc } from '../rpc'

const FIXTURE = join(import.meta.dir, 'fake-app-server.ts')

function client(cwd: string, env: Record<string, string> = {}) {
  return spawnCodexRpc({ argv: [process.execPath, FIXTURE], cwd, env })
}

describe('fake app-server', () => {
  test('rejects thread/start before initialized notification', async () => {
    const rpc = client(mkdtempSync(join(tmpdir(), 'fake-cwd-')))
    await rpc.request('initialize', { clientInfo: { name: 'mangaforge' } })
    await expect(rpc.request('thread/start', { cwd: '/x' })).rejects.toThrow('not initialized')
    rpc.kill()
  })

  test('full happy path: thread, skills, turn with spawn + file write + agent message', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fake-cwd-'))
    const rpc = client(cwd, {
      FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: join(cwd, '.agents/skills/story-review') }]),
      FAKE_SPAWN: '1',
      FAKE_WRITE_FILE: '审稿/第002章.md',
      FAKE_WRITE_CONTENT: 'Fallback: none\n报告',
      FAKE_AGENT_MESSAGE: '审稿完成',
    })
    await rpc.request('initialize', { clientInfo: { name: 'mangaforge' } })
    rpc.notify('initialized')
    const thread = await rpc.request('thread/start', { cwd, sandbox: 'workspaceWrite', approvalPolicy: 'never' })
    expect(thread.threadId).toBe('fake-thread-1')
    const skills = await rpc.request('skills/list', { cwds: [cwd] })
    expect(skills.skills[0].name).toBe('story-review')
    const seen: string[] = []
    rpc.onNotification((method) => { seen.push(method) })
    const completed = rpc.waitForNotification((m) => m === 'turn/completed', 5000)
    const turn = await rpc.request('turn/start', { threadId: thread.threadId, input: [{ type: 'text', text: 'x' }] })
    expect(turn.turnId).toBe('fake-turn-1')
    await completed
    expect(seen).toContain('turn/started')
    expect(seen).toContain('thread/started')
    expect(seen).toContain('item/completed')
    expect(existsSync(join(cwd, '审稿/第002章.md'))).toBe(true)
    expect(readFileSync(join(cwd, '审稿/第002章.md'), 'utf8')).toContain('Fallback: none')
    rpc.kill()
  })

  test('hang mode answers turn/start but sends nothing; interrupt completes with aborted', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fake-cwd-'))
    const rpc = client(cwd, { FAKE_HANG_TURN: '1' })
    await rpc.request('initialize', {})
    rpc.notify('initialized')
    const thread = await rpc.request('thread/start', { cwd })
    const turn = await rpc.request('turn/start', { threadId: thread.threadId, input: [] })
    const completed = rpc.waitForNotification((m, p) => m === 'turn/completed' && p.aborted === true, 5000)
    await rpc.request('turn/interrupt', { threadId: thread.threadId, turnId: turn.turnId })
    await completed
    rpc.kill()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/fixtures/fake-app-server.test.ts`
Expected: FAIL（fixture 不存在）

- [ ] **Step 3: 实现 fixture**

```ts
// ui/server/src/kernel/codex/fixtures/fake-app-server.ts
// 假 codex app-server：仅供测试。协议形状 = 计划头部「协议形状约定」。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const skills = JSON.parse(process.env.FAKE_SKILLS || '[]')
let initialized = false

function send(message: Record<string, any>) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')
}
function reply(id: number, result: any) { send({ id, result }) }
function replyError(id: number, code: number, message: string) { send({ id, error: { code, message } }) }
function notifyPeer(method: string, params: Record<string, any>) { send({ method, params }) }

function handleTurnStart(id: number, params: any) {
  const threadId = String(params?.threadId || 'fake-thread-1')
  const turnId = 'fake-turn-1'
  reply(id, { turnId })
  if (process.env.FAKE_HANG_TURN === '1') return
  notifyPeer('turn/started', { threadId, turnId })
  if (process.env.FAKE_SPAWN === '1') {
    notifyPeer('thread/started', { threadId: 'fake-sub-1', parentThreadId: threadId, agent: 'story-architect' })
  }
  const relFile = process.env.FAKE_WRITE_FILE || ''
  if (relFile) {
    const target = join(process.cwd(), relFile)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, process.env.FAKE_WRITE_CONTENT || '')
  }
  notifyPeer('item/completed', { threadId, turnId, item: { type: 'agentMessage', text: process.env.FAKE_AGENT_MESSAGE || 'done' } })
  notifyPeer('turn/completed', { threadId, turnId })
}

const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk: Uint8Array) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg: any
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.method === 'initialize') reply(msg.id, {})
    else if (msg.method === 'initialized') initialized = true
    else if (msg.method === 'thread/start') {
      if (!initialized) replyError(msg.id, -32002, 'not initialized')
      else reply(msg.id, { threadId: 'fake-thread-1' })
    }
    else if (msg.method === 'skills/list') reply(msg.id, { skills })
    else if (msg.method === 'turn/start') handleTurnStart(msg.id, msg.params)
    else if (msg.method === 'turn/interrupt') {
      reply(msg.id, {})
      notifyPeer('turn/completed', { threadId: String(msg.params?.threadId || 'fake-thread-1'), turnId: String(msg.params?.turnId || 'fake-turn-1'), aborted: true })
    }
    else if (msg.id !== undefined) replyError(msg.id, -32601, `method not found: ${msg.method}`)
  }
})
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/fixtures/fake-app-server.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/fixtures/
git commit -m "test(kernel): fake app-server fixture encoding the protocol contract"
```

---

### Task 4: app-server 会话封装

**Files:**
- Create: `ui/server/src/kernel/codex/session.ts`
- Test: `ui/server/src/kernel/codex/session.test.ts`

**Interfaces:**
- Consumes: `spawnCodexRpc` / `RpcEventSink`（`./rpc`）。
- Produces:
  - `mapContractSandbox(sandbox: string): string` — `workspace-write`→`workspaceWrite`、`read-only`→`readOnly`、`danger-full-access`→`dangerFullAccess`，未知值原样返回
  - `startCodexSession(input: { binary: string; projectDir: string; codexHome: string; envKey: string; appVersion?: string; sandbox?: string; argv?: string[]; sink?: RpcEventSink }): Promise<CodexSession>` — spawn（argv 缺省 `[binary,'app-server','--ignore-user-config']`，cwd=projectDir，env `CODEX_HOME`/`MANGAFORGE_CODEX_KEY`）→ `initialize`（clientInfo.name=`mangaforge`、title=`MangaForge Studio`、version=appVersion||`dev`）→ `initialized` 通知 → `thread/start`（cwd=projectDir、sandbox 映射后、approvalPolicy=`never`）
  - `CodexSession = { threadId: string; listSkills(): Promise<Array<{ name: string; path: string }>>; runTurn(input: { text: string; skill?: { name: string; path: string }; idleTimeoutMs?: number; hardTimeoutMs?: number }): Promise<{ turnId: string; lastAgentMessage: string; completedParams: any }>; interrupt(turnId: string): Promise<void>; close(): void }`
  - `runTurn` 行为：`turn/start` input = `[{type:'text',text}]`，有 skill 时追加 `{type:'skill',name,path}`；空闲超时（缺省 120000ms，任何通知重置）或硬上限（缺省 1800000ms）到 → 尝试 `turn/interrupt` 后抛 `Error('turn timeout')` 附 `code:'ENGINE_FAILED'`；`item/*` 中 agentMessage 文本持续覆盖 `lastAgentMessage`；`turn/completed`（threadId 匹配）→ resolve
  - `close()` = kill 进程

- [ ] **Step 1: 写失败测试（对 fixture 跑）**

```ts
// ui/server/src/kernel/codex/session.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mapContractSandbox, startCodexSession } from './session'

const FIXTURE = join(import.meta.dir, 'fixtures', 'fake-app-server.ts')

function sessionInput(cwd: string, env: Record<string, string> = {}) {
  return {
    binary: 'codex-not-used',
    projectDir: cwd,
    codexHome: mkdtempSync(join(tmpdir(), 'sess-home-')),
    envKey: 'test-key',
    argv: [process.execPath, FIXTURE],
    // fixture 读环境变量：借 argv 注入不行，改由测试直接设置 process.env 会污染并发用例，
    // 所以 session 必须把 input 里未知的额外 env 透传 —— 见实现里的 extraEnv。
    extraEnv: env,
  } as any
}

describe('codex session', () => {
  test('sandbox mapping', () => {
    expect(mapContractSandbox('workspace-write')).toBe('workspaceWrite')
    expect(mapContractSandbox('read-only')).toBe('readOnly')
    expect(mapContractSandbox('danger-full-access')).toBe('dangerFullAccess')
  })

  test('start → listSkills → runTurn returns last agent message and completed params', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const session = await startCodexSession(sessionInput(cwd, {
      FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: join(cwd, '.agents/skills/story-review') }]),
      FAKE_AGENT_MESSAGE: '最终审稿回复',
    }))
    expect(session.threadId).toBe('fake-thread-1')
    const skills = await session.listSkills()
    expect(skills[0].name).toBe('story-review')
    const turn = await session.runTurn({ text: '$story-review\n审查', skill: skills[0] })
    expect(turn.turnId).toBe('fake-turn-1')
    expect(turn.lastAgentMessage).toBe('最终审稿回复')
    session.close()
  })

  test('idle timeout interrupts hung turn with ENGINE_FAILED', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const session = await startCodexSession(sessionInput(cwd, { FAKE_HANG_TURN: '1' }))
    const started = Date.now()
    try {
      await session.runTurn({ text: 'x', idleTimeoutMs: 300, hardTimeoutMs: 5000 })
      throw new Error('should have timed out')
    } catch (error: any) {
      expect(String(error.message)).toContain('turn timeout')
      expect(error.code).toBe('ENGINE_FAILED')
    }
    expect(Date.now() - started).toBeLessThan(3000)
    session.close()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/session.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/codex/session.ts
import { spawnCodexRpc, type CodexRpcClient, type RpcEventSink } from './rpc'

const SANDBOX_MAP: Record<string, string> = {
  'workspace-write': 'workspaceWrite',
  'read-only': 'readOnly',
  'danger-full-access': 'dangerFullAccess',
}

export function mapContractSandbox(sandbox: string): string {
  return SANDBOX_MAP[sandbox] || sandbox
}

export type CodexSession = {
  threadId: string
  listSkills(): Promise<Array<{ name: string; path: string }>>
  runTurn(input: { text: string; skill?: { name: string; path: string }; idleTimeoutMs?: number; hardTimeoutMs?: number }): Promise<{ turnId: string; lastAgentMessage: string; completedParams: any }>
  interrupt(turnId: string): Promise<void>
  close(): void
}

function isAgentMessageItem(item: any): boolean {
  return item && (item.type === 'agentMessage' || item.type === 'agent_message') && typeof item.text === 'string'
}

export async function startCodexSession(input: {
  binary: string
  projectDir: string
  codexHome: string
  envKey: string
  appVersion?: string
  sandbox?: string
  argv?: string[]
  sink?: RpcEventSink
  extraEnv?: Record<string, string>
}): Promise<CodexSession> {
  const rpc: CodexRpcClient = spawnCodexRpc({
    argv: input.argv ?? [input.binary, 'app-server', '--ignore-user-config'],
    cwd: input.projectDir,
    env: { CODEX_HOME: input.codexHome, MANGAFORGE_CODEX_KEY: input.envKey, ...(input.extraEnv || {}) },
    sink: input.sink,
  })
  await rpc.request('initialize', {
    clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version: input.appVersion || 'dev' },
  })
  rpc.notify('initialized')
  const threadResult = await rpc.request('thread/start', {
    cwd: input.projectDir,
    sandbox: mapContractSandbox(input.sandbox || 'workspace-write'),
    approvalPolicy: 'never',
  })
  const threadId = String(threadResult?.threadId ?? threadResult?.thread?.id ?? '')
  if (!threadId) {
    rpc.kill()
    throw Object.assign(new Error('thread/start returned no thread id'), { code: 'ENGINE_FAILED' })
  }

  return {
    threadId,
    async listSkills() {
      const result = await rpc.request('skills/list', { cwds: [input.projectDir] })
      const rows = Array.isArray(result?.skills) ? result.skills : Array.isArray(result?.data) ? result.data : []
      return rows
        .map((row: any) => ({ name: String(row?.name || ''), path: String(row?.path || '') }))
        .filter((row: any) => row.name)
    },
    async runTurn({ text, skill, idleTimeoutMs = 120_000, hardTimeoutMs = 1_800_000 }) {
      const inputItems: any[] = [{ type: 'text', text }]
      if (skill) inputItems.push({ type: 'skill', name: skill.name, path: skill.path })
      const turnResult = await rpc.request('turn/start', { threadId, input: inputItems })
      const turnId = String(turnResult?.turnId ?? turnResult?.turn?.id ?? '')
      const hardDeadline = Date.now() + hardTimeoutMs
      let lastAgentMessage = ''
      let lastActivity = Date.now()

      const collector = (method: string, params: any) => {
        if (String(params?.threadId || '') === threadId || method.startsWith('item/')) lastActivity = Date.now()
        if (method.startsWith('item/') && isAgentMessageItem(params?.item)) lastAgentMessage = params.item.text
      }
      rpc.onNotification(collector)

      while (true) {
        const idleRemaining = lastActivity + idleTimeoutMs - Date.now()
        const hardRemaining = hardDeadline - Date.now()
        const budget = Math.min(idleRemaining, hardRemaining)
        if (budget <= 0) {
          try { await rpc.request('turn/interrupt', { threadId, turnId }, 2000) } catch { /* 进程可能已死 */ }
          throw Object.assign(new Error('turn timeout'), { code: 'ENGINE_FAILED' })
        }
        try {
          const done = await rpc.waitForNotification(
            (method, params) => method === 'turn/completed' && String(params?.threadId || '') === threadId,
            budget,
          )
          return { turnId, lastAgentMessage, completedParams: done.params }
        } catch {
          // waitForNotification 超时：回到循环重算预算（期间 collector 可能刷新过 lastActivity）
          if (lastActivity + idleTimeoutMs - Date.now() <= 0 || hardDeadline - Date.now() <= 0) {
            try { await rpc.request('turn/interrupt', { threadId, turnId }, 2000) } catch { /* 忽略 */ }
            throw Object.assign(new Error('turn timeout'), { code: 'ENGINE_FAILED' })
          }
        }
      }
    },
    async interrupt(turnId: string) {
      await rpc.request('turn/interrupt', { threadId, turnId })
    },
    close() {
      rpc.kill()
    },
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/session.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/session.ts ui/server/src/kernel/codex/session.test.ts
git commit -m "feat(kernel): codex app-server session wrapper (initialize/thread/skills/turn)"
```

---

### Task 5: spawn 证据提取

**Files:**
- Create: `ui/server/src/kernel/codex/spawn-evidence.ts`
- Test: `ui/server/src/kernel/codex/spawn-evidence.test.ts`

**Interfaces:**
- Consumes: `readKernelEvents`（`./events`）的事件数组形状。
- Produces:
  - `type SpawnEvidence = { subagent_threads: Array<{ thread_id: string; parent_thread_id: string; agent: string }>; agent_hints: string[] }`
  - `extractSpawnEvidence(events: Array<{ direction: string; message: any }>): SpawnEvidence` — 只看 `direction==='recv'` 且 `message.method==='thread/started'` 且 `parentThreadId`（或 `thread.parentThreadId`）非空的事件；`agent` 取 `params.agent ?? params.agentType ?? ''`。`agent_hints` 为去重的 agent 名 + `item/*` 通知里 `params.item.agent` 非空值（供 7.4 进度 hint 与分期 4 门比对用）

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/codex/spawn-evidence.test.ts
import { describe, expect, test } from 'bun:test'
import { extractSpawnEvidence } from './spawn-evidence'

describe('extractSpawnEvidence', () => {
  test('collects subagent threads and agent hints, ignores main thread and sends', () => {
    const events = [
      { direction: 'send', message: { method: 'thread/started', params: { threadId: 'x', parentThreadId: 'main' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { threadId: 'main' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { threadId: 'sub-1', parentThreadId: 'main', agent: 'story-architect' } } },
      { direction: 'recv', message: { method: 'thread/started', params: { thread: { id: 'sub-2', parentThreadId: 'main' } } } },
      { direction: 'recv', message: { method: 'item/completed', params: { item: { type: 'agentMessage', text: 'x', agent: 'narrative-writer' } } } },
    ]
    const evidence = extractSpawnEvidence(events as any)
    expect(evidence.subagent_threads).toEqual([
      { thread_id: 'sub-1', parent_thread_id: 'main', agent: 'story-architect' },
      { thread_id: 'sub-2', parent_thread_id: 'main', agent: '' },
    ])
    expect(evidence.agent_hints).toEqual(['story-architect', 'narrative-writer'])
  })

  test('empty events -> empty evidence', () => {
    expect(extractSpawnEvidence([])).toEqual({ subagent_threads: [], agent_hints: [] })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/spawn-evidence.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/codex/spawn-evidence.ts
export type SpawnEvidence = {
  subagent_threads: Array<{ thread_id: string; parent_thread_id: string; agent: string }>
  agent_hints: string[]
}

export function extractSpawnEvidence(events: Array<{ direction: string; message: any }>): SpawnEvidence {
  const subagentThreads: SpawnEvidence['subagent_threads'] = []
  const agentHints: string[] = []
  const pushHint = (name: unknown) => {
    const hint = String(name || '')
    if (hint && !agentHints.includes(hint)) agentHints.push(hint)
  }
  for (const event of events || []) {
    if (event?.direction !== 'recv') continue
    const method = String(event?.message?.method || '')
    const params = event?.message?.params || {}
    if (method === 'thread/started') {
      const parent = String(params.parentThreadId ?? params.thread?.parentThreadId ?? '')
      if (!parent) continue
      const threadId = String(params.threadId ?? params.thread?.id ?? '')
      const agent = String(params.agent ?? params.agentType ?? '')
      subagentThreads.push({ thread_id: threadId, parent_thread_id: parent, agent })
      pushHint(agent)
    }
    if (method.startsWith('item/')) pushHint(params?.item?.agent)
  }
  return { subagent_threads: subagentThreads, agent_hints: agentHints }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/spawn-evidence.test.ts`
Expected: PASS（2 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/spawn-evidence.ts ui/server/src/kernel/codex/spawn-evidence.test.ts
git commit -m "feat(kernel): extract subagent spawn evidence from app-server events"
```

---

### Task 6: 单候选运行器（投影 → 会话 → 收回，一条龙）

**Files:**
- Create: `ui/server/src/kernel/codex/run-candidate.ts`
- Test: `ui/server/src/kernel/codex/run-candidate.test.ts`

**Interfaces:**
- Consumes: `projectKernelSubject`（`../projection/project`）、`deployKernelPackMounts`（`../projection/pack-mounts`）、`writeKernelSnapshot` / `harvestKernelArtifacts`（`../projection/snapshot`）、`writeCodexHome`（`../providers/translate`）、`loadKernelRuntime`（`../runtime`）、`kernelJobDir`（`../paths`）、`renderKernelTemplate`（`../template`）、`startCodexSession`（`./session`）、`createKernelEventsRecorder` / `readKernelEvents` / `writeKernelLastMessage`（`./events`）、`extractSpawnEvidence`（`./spawn-evidence`）、`readModels`（`../../model-store`）、`readKeys`（`../../key-store`）。
- Produces:

```ts
export type RunKernelCandidateInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  modelId: number
  jobId?: string                    // 缺省 `cand-${Date.now()}`
  idleTimeoutMs?: number
  hardTimeoutMs?: number
  sessionArgv?: string[]            // 测试注入 fixture
  sessionExtraEnv?: Record<string, string>
}
export type RunKernelCandidateResult =
  | { ok: true; jobDir: string; projectDir: string; threadId: string; turnId: string
      artifacts: HarvestedArtifact[]; warnings: Array<{ warning: string; rel_path: string }>
      lastMessage: string; spawnEvidence: SpawnEvidence; eventsPath: string }
  | { ok: false; error_code: string; message: string; jobDir?: string }
```

- 顺序与失败码（都是「终态」结果，不 throw）：
  1. `runtime` 不含二进制检查（分期 4 编排时做 `checkKernelBinary`；本函数信任传入 argv 或系统 codex）
  2. `projectKernelSubject` 抛错 → 捕获映射 `{ ok:false, error_code: err.code || 'ENGINE_FAILED' }`（覆盖 `CHAPTER_NOT_FOUND` / `OH_STORY_APPLY_NO_REVIEW` / `OH_STORY_APPLY_STALE_REVIEW` / `CONTRACT_NOT_IMPLEMENTED`）
  3. `deployKernelPackMounts`；合同 gates 含 `require_reviewer_agents` 且 `missingReviewers.length>0` → `REVIEWERS_MISSING`（不启动）
  4. `writeKernelSnapshot`
  5. key 解析：`readModels` 找 model → `readKeys` 找 `model.api_key_id` → `key.key` 非空；model 缺 → `CONTRACT_INVALID`；key 缺 → `PROVIDER_TRANSLATE_FAILED`
  6. `writeCodexHome`（agents = deployedAgents，configFile 指向投影内 `.codex/agents/*.toml`）；失败原样透传 error_code
  7. `startCodexSession`（sink=events recorder；sandbox=contract.sandbox）；异常 → `ENGINE_FAILED`
  8. mention 非空 → `listSkills` 找 `contract.skill_name`；未发现 → `SKILL_NOT_FOUND`（不发 turn）
  9. `runTurn`：text = `contract.invoke.mention + '\n' + renderKernelTemplate(contract.invoke.prompt, vars)`（mention 空则只有渲染 prompt），skill item 用 skills/list 返回的投影内路径；超时/崩溃 → `ENGINE_FAILED`
  10. `writeKernelLastMessage`；`harvestKernelArtifacts`；`missingRequired` 非空时执行 last_message 兜底（见下）；仍缺 → `OUTPUT_MISSING`
  11. `extractSpawnEvidence(readKernelEvents(jobDir))`；finally 里 `session.close()`
- last_message 兜底（spec 6.2 规则 3）：对每个 `required && fallback==='last_message'` 且其渲染 glob 在 `missingRequired` 里的 output：若 `lastMessage` 非空且渲染 glob 不含 `*`，把 `lastMessage` 写入 `artifactsDir/{渲染 glob}` 并补一条 artifact（`sha256`/`byte_size` 按内容算；`HarvestedArtifact` 无 metadata 字段，来源信息由分期 4 写入候选 `metadata` 时标注），从 missingRequired 移除。

- [ ] **Step 1: 写失败测试（真投影 + fixture 会话，端到端）**

```ts
// ui/server/src/kernel/codex/run-candidate.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject } from '../../novel'
import { ohStoryCoreAgentsDir, ohStoryCoreRoot, OH_STORY_REVIEWER_AGENTS } from '../../novel-writing/oh-story-core/store'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { runKernelCandidate } from './run-candidate'

const FIXTURE = join(import.meta.dir, 'fixtures', 'fake-app-server.ts')
const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!

async function seedWorkspace() {
  const ws = mkdtempSync(join(tmpdir(), 'run-cand-'))
  const project = await createNovelProject(ws, { title: '测试书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '概要' })
  const ch1 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章正文。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '第二章', chapter_text: '第二章正文。' })
  // 装 pack：skill + 四个 reviewer toml + pack.json
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
  for (const agent of OH_STORY_REVIEWER_AGENTS) writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({ revision: 'r', skills: ['story-review'], agents_version: 25 }))
  // 供应商 + 模型 + key
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk-test', is_active: true }]))
  return { ws, project, ch1, ch2 }
}

describe('runKernelCandidate', () => {
  test('happy path: projection, session, harvest, spawn evidence, events.jsonl', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_SPAWN: '1',
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: none\n第二章审稿正文',
        FAKE_AGENT_MESSAGE: '审稿完成',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.artifacts.some(a => a.rel_path === '审稿/第002章.md' && a.artifact_kind === 'review_report')).toBe(true)
    expect(result.lastMessage).toBe('审稿完成')
    expect(result.spawnEvidence.subagent_threads.length).toBe(1)
    expect(result.spawnEvidence.subagent_threads[0].agent).toBe('story-architect')
    expect(existsSync(result.eventsPath)).toBe(true)
    expect(readFileSync(join(result.jobDir, 'last-message.md'), 'utf8')).toBe('审稿完成')
    const eventLines = readFileSync(result.eventsPath, 'utf8').trim().split('\n')
    expect(eventLines.length).toBeGreaterThan(4)
  })

  test('skill not discovered -> SKILL_NOT_FOUND, no turn sent', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: { FAKE_SKILLS: '[]' },
    })
    expect(result).toMatchObject({ ok: false, error_code: 'SKILL_NOT_FOUND' })
  })

  test('report missing but fallback last_message materializes the artifact', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_AGENT_MESSAGE: 'Fallback: none\n只在回复里的报告',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const report = result.artifacts.find(a => a.rel_path === '审稿/第002章.md')!
    expect(readFileSync(report.copied_path, 'utf8')).toContain('只在回复里的报告')
  })

  test('missing reviewer toml -> REVIEWERS_MISSING before session start', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const { rmSync } = await import('node:fs')
    for (const agent of OH_STORY_REVIEWER_AGENTS) rmSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`))
    // 同时让仓库兜底失效不可行（fixture 在仓库里），改为断言 deployed 后仍缺才失败:
    // agents-fallback 存在时不会缺 —— 所以这里直接断言 happy path 不受影响，
    // REVIEWERS_MISSING 分支用注入覆盖:
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: { FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: 'x' }]) },
      __testForceMissingReviewers: ['story-architect'],
    } as any)
    expect(result).toMatchObject({ ok: false, error_code: 'REVIEWERS_MISSING' })
  })

  test('unknown model -> CONTRACT_INVALID; missing key -> PROVIDER_TRANSLATE_FAILED', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const noModel = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 999,
      sessionArgv: [process.execPath, FIXTURE],
    })
    expect(noModel).toMatchObject({ ok: false, error_code: 'CONTRACT_INVALID' })
    writeFileSync(join(ws, 'keys.json'), '[]')
    const noKey = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
    })
    expect(noKey).toMatchObject({ ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED' })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/run-candidate.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/codex/run-candidate.ts
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import type { KernelContract } from '../contracts/schema'
import { kernelJobDir } from '../paths'
import { deployKernelPackMounts } from '../projection/pack-mounts'
import { projectKernelSubject } from '../projection/project'
import { harvestKernelArtifacts, writeKernelSnapshot, type HarvestedArtifact } from '../projection/snapshot'
import { writeCodexHome } from '../providers/translate'
import { loadKernelRuntime } from '../runtime'
import { renderKernelTemplate } from '../template'
import { createKernelEventsRecorder, readKernelEvents, writeKernelLastMessage } from './events'
import { startCodexSession, type CodexSession } from './session'
import { extractSpawnEvidence, type SpawnEvidence } from './spawn-evidence'

export type RunKernelCandidateInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  modelId: number
  jobId?: string
  idleTimeoutMs?: number
  hardTimeoutMs?: number
  sessionArgv?: string[]
  sessionExtraEnv?: Record<string, string>
}

export type RunKernelCandidateResult =
  | {
      ok: true
      jobDir: string
      projectDir: string
      threadId: string
      turnId: string
      artifacts: HarvestedArtifact[]
      warnings: Array<{ warning: string; rel_path: string }>
      lastMessage: string
      spawnEvidence: SpawnEvidence
      eventsPath: string
    }
  | { ok: false; error_code: string; message: string; jobDir?: string }

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export async function runKernelCandidate(input: RunKernelCandidateInput): Promise<RunKernelCandidateResult> {
  const { workspace, projectId, chapterId, contract, modelId } = input
  const jobId = input.jobId || `cand-${Date.now()}`
  const jobDir = kernelJobDir(workspace, jobId)
  const projectDir = join(jobDir, 'project')
  const artifactsDir = join(jobDir, 'artifacts')
  mkdirSync(projectDir, { recursive: true })

  // 1. 投影
  let vars
  try {
    ;({ vars } = await projectKernelSubject({ workspace, projectId, chapterId, contract, projectDir }))
  } catch (error: any) {
    return { ok: false, error_code: String(error?.code || 'ENGINE_FAILED'), message: String(error?.message || error), jobDir }
  }

  // 2. Pack 挂载 + reviewer 前提门
  const mounts = deployKernelPackMounts({ workspace, projectDir, skillName: contract.skill_name, mounts: contract.projection.mounts })
  const missingReviewers = (input as any).__testForceMissingReviewers || mounts.missingReviewers
  if (contract.gates.includes('require_reviewer_agents') && missingReviewers.length > 0) {
    return { ok: false, error_code: 'REVIEWERS_MISSING', message: `缺少 reviewer：${missingReviewers.join(', ')}`, jobDir }
  }

  // 3. 快照
  const manifest = writeKernelSnapshot(projectDir, join(jobDir, 'snapshot'))

  // 4. key 解析 + 隔离 CODEX_HOME
  const models = await readModels(workspace)
  const model = models.find(item => Number(item.id) === Number(modelId))
  if (!model) return { ok: false, error_code: 'CONTRACT_INVALID', message: `model ${modelId} not found`, jobDir }
  const keys = await readKeys(workspace)
  const key = keys.find(item => Number(item.id) === Number(model.api_key_id))
  if (!key?.key) return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `api key ${model.api_key_id} not found or empty`, jobDir }
  const home = await writeCodexHome({
    workspace, jobDir, modelId,
    agents: mounts.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: loadKernelRuntime(workspace).supports_chat_wire_api,
  })
  if (!home.ok) return { ok: false, error_code: home.error_code, message: home.message, jobDir }

  // 5. 会话
  const recorder = createKernelEventsRecorder(jobDir)
  const runtime = loadKernelRuntime(workspace)
  let session: CodexSession
  try {
    session = await startCodexSession({
      binary: runtime.binary,
      projectDir,
      codexHome: join(jobDir, 'codex-home'),
      envKey: key.key,
      sandbox: contract.sandbox,
      argv: input.sessionArgv,
      extraEnv: input.sessionExtraEnv,
      sink: recorder.sink,
    })
  } catch (error: any) {
    return { ok: false, error_code: 'ENGINE_FAILED', message: String(error?.message || error), jobDir }
  }

  try {
    // 6. skills/list 预检
    let skillItem: { name: string; path: string } | undefined
    if (contract.invoke.mention) {
      const skills = await session.listSkills()
      skillItem = skills.find(skill => skill.name === contract.skill_name)
      if (!skillItem) {
        return { ok: false, error_code: 'SKILL_NOT_FOUND', message: `skills/list 未发现 ${contract.skill_name}`, jobDir }
      }
      if (!isAbsolute(skillItem.path)) skillItem = { ...skillItem, path: join(projectDir, skillItem.path) }
    }

    // 7. turn
    const prompt = renderKernelTemplate(contract.invoke.prompt, vars)
    const text = contract.invoke.mention ? `${contract.invoke.mention}\n${prompt}` : prompt
    let turn
    try {
      turn = await session.runTurn({
        text,
        skill: skillItem,
        idleTimeoutMs: input.idleTimeoutMs,
        hardTimeoutMs: input.hardTimeoutMs,
      })
    } catch (error: any) {
      return { ok: false, error_code: String(error?.code || 'ENGINE_FAILED'), message: String(error?.message || error), jobDir }
    }
    writeKernelLastMessage(jobDir, turn.lastAgentMessage)

    // 8. 收回 + last_message 兜底
    const harvest = harvestKernelArtifacts({ projectDir, artifactsDir, manifest, contract, vars })
    const artifacts = [...harvest.artifacts]
    let missingRequired = [...harvest.missingRequired]
    for (const output of contract.outputs) {
      if (!output.required || output.fallback !== 'last_message') continue
      const rendered = renderKernelTemplate(output.glob, vars)
      if (!missingRequired.includes(rendered) || rendered.includes('*') || !turn.lastAgentMessage) continue
      const copied = join(artifactsDir, rendered)
      mkdirSync(dirname(copied), { recursive: true })
      writeFileSync(copied, turn.lastAgentMessage)
      artifacts.push({
        rel_path: rendered,
        artifact_kind: output.artifact_kind,
        sha256: sha256Hex(turn.lastAgentMessage),
        byte_size: Buffer.byteLength(turn.lastAgentMessage, 'utf8'),
        copied_path: copied,
      })
      missingRequired = missingRequired.filter(glob => glob !== rendered)
    }
    if (missingRequired.length > 0) {
      return { ok: false, error_code: 'OUTPUT_MISSING', message: `缺少约定产物：${missingRequired.join(', ')}`, jobDir }
    }

    return {
      ok: true,
      jobDir,
      projectDir,
      threadId: session.threadId,
      turnId: turn.turnId,
      artifacts,
      warnings: harvest.warnings,
      lastMessage: turn.lastAgentMessage,
      spawnEvidence: extractSpawnEvidence(readKernelEvents(jobDir)),
      eventsPath: recorder.path,
    }
  } finally {
    session.close()
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/codex/run-candidate.test.ts`
Expected: PASS（5 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/run-candidate.ts ui/server/src/kernel/codex/run-candidate.test.ts
git commit -m "feat(kernel): single-candidate runner from projection to harvest"
```

---

### Task 7: 探针 ③（skills/list 发现）与 ④（agents spawn）

**Files:**
- Modify: `ui/server/src/kernel/probe.ts`
- Test: `ui/server/src/kernel/probe.test.ts`（追加用例；已有 2 个用例的 `skills`/`agents_spawn` 断言从 `'pending'` 改为宽松断言，见 Step 1）

**Interfaces:**
- 类型变化：`KernelProbeResult` 的 `skills` / `agents_spawn` 从 `'pending'` 改为 `KernelProbeStage = { ok: boolean; message?: string } | 'pending'`
- `runKernelProbe(ws, opts)` 新增 opts：`modelId?: number`、`runSkillsProbe?: () => Promise<{ ok: boolean; message?: string }>`、`runAgentsSpawnProbe?: () => Promise<{ ok: boolean; message?: string }>`
- 执行规则：binary 或 handshake 失败 → ③④ 都保持 `'pending'`（前置未过，不误报红）；binary+handshake 过 → 跑 ③；③ 过且 `modelId` 提供 → 跑 ④，否则 ④ `'pending'`
- 默认 ③ 实现 `defaultRunSkillsProbe(ws, runtime)`：临时目录 → `deployKernelPackMounts`（mounts=['skill_tree']，skillName='story-review'）；`skillPath===null` → `{ ok:false, message:'oh-story pack 未安装' }`；否则找第一个 `api_format==='codex_responses'` 且 `is_active` 的 provider 写临时 CODEX_HOME（`buildCodexConfigToml`，model_name='probe'，无 provider → `{ ok:false, message:'无 codex_responses 供应商' }`）→ `startCodexSession`（envKey='probe'）→ `listSkills()` 含 `story-review` 即 `{ ok:true }`；finally close
- 默认 ④ 实现 `defaultRunAgentsSpawnProbe(ws, runtime, modelId)`：临时目录 → mounts=['agents']（missingReviewers 非空 → fail）→ `writeCodexHome`（真 model + `readKeys` 的真 key；key 缺 → fail）→ session → `runTurn({ text: '请让 consistency-checker 子代理只回复 OK，然后立即结束本回合。', idleTimeoutMs: 60000, hardTimeoutMs: 120000 })` → `extractSpawnEvidence(readKernelEvents(临时 jobDir))` 有 ≥1 条 subagent thread 即 `{ ok:true }`，否则 `{ ok:false, message:'未观察到 subagent thread' }`
- 路由：`POST /api/kernel/runtime/probe` 读 `req.body?.model_id` 传给 `runKernelProbe`

- [ ] **Step 1: 更新既有断言 + 写失败测试**

既有两个用例中 `expect(probe.skills).toBe('pending')` / `expect(probe.agents_spawn).toBe('pending')` 保留——第一个用例 binary 失败，③④ 应仍为 `'pending'`，语义不变。追加：

```ts
// 追加到 ui/server/src/kernel/probe.test.ts
test('healthy binary runs skills probe; agents probe pending without model', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
  seedProviders(ws)
  const probe = await runKernelProbe(ws, {
    runVersion: async () => 'codex-cli 1.0.0',
    runHandshake: async () => {},
    runSkillsProbe: async () => ({ ok: true }),
  })
  expect(probe.skills).toEqual({ ok: true })
  expect(probe.agents_spawn).toBe('pending')
})

test('skills probe pass + modelId runs agents spawn probe', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
  seedProviders(ws)
  const probe = await runKernelProbe(ws, {
    runVersion: async () => 'codex-cli 1.0.0',
    runHandshake: async () => {},
    modelId: 9,
    runSkillsProbe: async () => ({ ok: true }),
    runAgentsSpawnProbe: async () => ({ ok: false, message: '未观察到 subagent thread' }),
  })
  expect(probe.agents_spawn).toEqual({ ok: false, message: '未观察到 subagent thread' })
})

test('skills probe failure keeps agents probe pending', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
  seedProviders(ws)
  const probe = await runKernelProbe(ws, {
    runVersion: async () => 'codex-cli 1.0.0',
    runHandshake: async () => {},
    modelId: 9,
    runSkillsProbe: async () => ({ ok: false, message: 'pack 未安装' }),
    runAgentsSpawnProbe: async () => ({ ok: true }),
  })
  expect(probe.skills).toEqual({ ok: false, message: 'pack 未安装' })
  expect(probe.agents_spawn).toBe('pending')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/probe.test.ts`
Expected: FAIL（新 opts 不存在 / skills 仍恒为 'pending'）

- [ ] **Step 3: 实现**

`probe.ts` 修改点（其余保持）：

```ts
export type KernelProbeStage = { ok: boolean; message?: string } | 'pending'

export type KernelProbeResult = {
  checked_at: string
  binary: { ok: boolean; version?: string; message?: string }
  handshake: { ok: boolean; message?: string }
  providers: Record<string, { ok: boolean; error_code?: string }>
  skills: KernelProbeStage
  agents_spawn: KernelProbeStage
}
```

`runKernelProbe` opts 增加 `modelId?/runSkillsProbe?/runAgentsSpawnProbe?`；在 handshake 判定之后：

```ts
if (result.binary.ok && result.handshake.ok) {
  const skillsProbe = opts.runSkillsProbe || (() => defaultRunSkillsProbe(activeWorkspace, runtime))
  try {
    result.skills = await skillsProbe()
  } catch (error: any) {
    result.skills = { ok: false, message: String(error?.message || error) }
  }
  if (typeof result.skills === 'object' && result.skills.ok && opts.modelId) {
    const agentsProbe = opts.runAgentsSpawnProbe || (() => defaultRunAgentsSpawnProbe(activeWorkspace, runtime, opts.modelId!))
    try {
      result.agents_spawn = await agentsProbe()
    } catch (error: any) {
      result.agents_spawn = { ok: false, message: String(error?.message || error) }
    }
  }
}
```

默认实现（同文件，import 追加 `mkdtempSync`（node:fs）、`tmpdir`（node:os）、`join`（node:path）、`deployKernelPackMounts`（../projection/pack-mounts…相对 probe.ts 为 `./projection/pack-mounts`）、`buildCodexConfigToml` / `writeCodexHome`（`./providers/translate`）、`startCodexSession`（`./codex/session`）、`createKernelEventsRecorder` / `readKernelEvents`（`./codex/events`）、`extractSpawnEvidence`（`./codex/spawn-evidence`）、`readKeys`（`../key-store`）、`readModels`（`../model-store`）、`type KernelRuntimeInfo`（`./runtime`））：

```ts
async function defaultRunSkillsProbe(ws: string, runtime: KernelRuntimeInfo): Promise<{ ok: boolean; message?: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'kernel-probe3-'))
  const mounts = deployKernelPackMounts({ workspace: ws, projectDir: dir, skillName: 'story-review', mounts: ['skill_tree'] })
  if (!mounts.skillPath) return { ok: false, message: 'oh-story pack 未安装' }
  const provider = (await readProviders(ws)).find(p => p.api_format === 'codex_responses' && p.is_active !== false)
  if (!provider) return { ok: false, message: '无 codex_responses 供应商' }
  const built = buildCodexConfigToml({
    provider: provider as any, model: { model_name: 'probe' }, agents: [],
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  if (!built.ok) return { ok: false, message: built.message }
  const home = join(dir, 'codex-home')
  mkdirSync(home, { recursive: true })
  writeFileSync(join(home, 'config.toml'), built.toml)
  const session = await startCodexSession({ binary: runtime.binary, projectDir: dir, codexHome: home, envKey: 'probe' })
  try {
    const skills = await session.listSkills()
    return skills.some(skill => skill.name === 'story-review')
      ? { ok: true }
      : { ok: false, message: 'skills/list 未发现投影 skill' }
  } finally {
    session.close()
  }
}

async function defaultRunAgentsSpawnProbe(ws: string, runtime: KernelRuntimeInfo, modelId: number): Promise<{ ok: boolean; message?: string }> {
  const jobDir = mkdtempSync(join(tmpdir(), 'kernel-probe4-'))
  const projectDir = join(jobDir, 'project')
  mkdirSync(projectDir, { recursive: true })
  const mounts = deployKernelPackMounts({ workspace: ws, projectDir, skillName: '', mounts: ['agents'] })
  if (mounts.missingReviewers.length) return { ok: false, message: `缺 reviewer：${mounts.missingReviewers.join(', ')}` }
  const model = (await readModels(ws)).find(m => Number(m.id) === Number(modelId))
  if (!model) return { ok: false, message: `model ${modelId} not found` }
  const key = (await readKeys(ws)).find(k => Number(k.id) === Number(model.api_key_id))
  if (!key?.key) return { ok: false, message: 'api key 缺失' }
  const home = await writeCodexHome({
    workspace: ws, jobDir, modelId,
    agents: mounts.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  if (!home.ok) return { ok: false, message: home.message }
  const recorder = createKernelEventsRecorder(jobDir)
  const session = await startCodexSession({
    binary: runtime.binary, projectDir, codexHome: join(jobDir, 'codex-home'), envKey: key.key, sink: recorder.sink,
  })
  try {
    await session.runTurn({ text: '请让 consistency-checker 子代理只回复 OK，然后立即结束本回合。', idleTimeoutMs: 60_000, hardTimeoutMs: 120_000 })
    const evidence = extractSpawnEvidence(readKernelEvents(jobDir))
    return evidence.subagent_threads.length > 0
      ? { ok: true }
      : { ok: false, message: '未观察到 subagent thread' }
  } finally {
    session.close()
  }
}
```

路由（`kernel-routes.ts` 的 probe POST）：

```ts
app.post('/api/kernel/runtime/probe', async (req, res) => {
  try {
    const modelId = Number((req as any).body?.model_id || 0) || undefined
    res.json({ ok: true, probe: await runKernelProbe(deps.getWorkspace(), { modelId }) })
  } catch (error: any) {
    res.status(500).json({ error: String(error?.message || error) })
  }
})
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/probe.test.ts src/routes/kernel-routes.test.ts`
Expected: PASS（既有 + 新 3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/probe.ts ui/server/src/kernel/probe.test.ts ui/server/src/routes/kernel-routes.ts
git commit -m "feat(kernel): skills discovery and agents spawn probes (3/4)"
```

---

### Task 8: 合同列表按探针结果标注 implemented

**Files:**
- Modify: `ui/server/src/routes/kernel-routes.ts`（GET /api/kernel/contracts）
- Test: `ui/server/src/routes/kernel-routes.test.ts`（追加）

**Interfaces:**
- GET 返回的每个合同视图增加可选 `implemented_reason?: string`；规则：
  - `implemented === false`（capability 未实现）→ `implemented_reason = 'CAPABILITY_PENDING'`
  - probe 存在且 `probe.skills` 为 `{ ok:false }` 且合同 mounts 含 `skill_tree` → `implemented = false`、`implemented_reason = 'SKILLS_PROBE_FAILED'`
  - probe 存在且 `probe.agents_spawn` 为 `{ ok:false }` 且合同 gates 含 `require_reviewer_agents` → `implemented = false`、`implemented_reason = 'AGENTS_PROBE_FAILED'`
  - probe 为 `null` 或对应项为 `'pending'` → 不翻转

- [ ] **Step 1: 写失败测试（追加到 kernel-routes.test.ts）**

```ts
test('GET contracts flips implemented when probe skills failed', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-routes-'))
  const probe = {
    checked_at: 'x', binary: { ok: true }, handshake: { ok: true }, providers: {},
    skills: { ok: false, message: 'pack 未安装' }, agents_spawn: 'pending',
  }
  const { mkdirSync } = await import('node:fs')
  mkdirSync(join(ws, '.mangaforge', 'kernel'), { recursive: true })
  writeFileSync(join(ws, '.mangaforge', 'kernel', 'probe.json'), JSON.stringify(probe))
  const handlers = routeHarness(ws)
  const res = await callRoute(handlers.get('GET /api/kernel/contracts'))
  const review = res.body.contracts.find((c: any) => c.id === 'oh-story-core.story-review.full')
  expect(review.implemented).toBe(false)
  expect(review.implemented_reason).toBe('SKILLS_PROBE_FAILED')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/routes/kernel-routes.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现（GET 处理器内，contracts map 前）**

```ts
const probe = loadKernelProbe(workspace)
const annotate = (view: any) => {
  let implemented = view.implemented
  let reason: string | undefined = implemented ? undefined : 'CAPABILITY_PENDING'
  if (probe && typeof probe.skills === 'object' && !probe.skills.ok && view.projection.mounts.includes('skill_tree')) {
    implemented = false; reason = 'SKILLS_PROBE_FAILED'
  }
  if (probe && typeof probe.agents_spawn === 'object' && !probe.agents_spawn.ok && view.gates.includes('require_reviewer_agents')) {
    implemented = false; reason = 'AGENTS_PROBE_FAILED'
  }
  return { ...view, implemented, ...(reason ? { implemented_reason: reason } : {}) }
}
// contracts: contracts.map(view => annotate({ id, label, capability, builtin, implemented, ...rest 展开同现状 }))
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/routes/kernel-routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/kernel-routes.ts ui/server/src/routes/kernel-routes.test.ts
git commit -m "feat(kernel): annotate contract implemented flag from probe results"
```

---

### Task 9: 分期 3 验收 —— 候选演练 CLI 与真机清单

**Files:**
- Create: `ui/server/src/kernel/candidate-dry-run.ts`
- Modify: `docs/superpowers/plans/2026-08-15-codex-kernel-app-server-client.md`（本文件底部勾选验收清单）

**Interfaces:**
- `bun src/kernel/candidate-dry-run.ts --workspace <ws> --project 3 --chapter 62 --contract oh-story-core.story-review.full --model <id> [--fake]`
- `--fake`：用 fixture 当二进制（`sessionArgv`），并注入 `FAKE_SKILLS`/`FAKE_SPAWN`/`FAKE_WRITE_FILE` 演示全链路 —— 本机无 codex 时的验收方式
- 输出：job 目录、产物清单（kind + rel_path）、lastMessage 前 200 字、spawn 证据、events.jsonl 行数

- [ ] **Step 1: 实现脚本**

```ts
// ui/server/src/kernel/candidate-dry-run.ts
import { join } from 'node:path'
import { loadKernelContracts } from './contracts/store'
import { runKernelCandidate } from './codex/run-candidate'
import { padChapterNo } from './projection/naming'
import { getNovelChapter } from '../novel'

function arg(name: string, fallback = ''): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? String(process.argv[index + 1] || '') : fallback
}

const workspace = arg('workspace', '/Users/ruiyaosong/MangaForge-Studio/workspace')
const projectId = Number(arg('project', '3'))
const chapterId = Number(arg('chapter', '62'))
const contractId = arg('contract', 'oh-story-core.story-review.full')
const modelId = Number(arg('model', '0'))
const fake = process.argv.includes('--fake')

const { contracts } = loadKernelContracts(workspace)
const contract = contracts.find(item => item.id === contractId)
if (!contract) {
  console.error(`contract not found: ${contractId}`)
  process.exit(1)
}

const chapter = await getNovelChapter(workspace, chapterId, projectId)
const pad = padChapterNo(Number(chapter?.chapter_no || 0))
const fixture = join(import.meta.dir, 'codex', 'fixtures', 'fake-app-server.ts')

const result = await runKernelCandidate({
  workspace, projectId, chapterId, contract, modelId,
  ...(fake ? {
    sessionArgv: [process.execPath, fixture],
    sessionExtraEnv: {
      FAKE_SKILLS: JSON.stringify([{ name: contract.skill_name, path: `.agents/skills/${contract.skill_name}` }]),
      FAKE_SPAWN: '1',
      FAKE_WRITE_FILE: `审稿/第${pad}章.md`,
      FAKE_WRITE_CONTENT: 'Fallback: none\n（fixture 演练报告）',
      FAKE_AGENT_MESSAGE: 'fixture 演练完成',
    },
  } : {}),
})

if (!result.ok) {
  console.error('candidate failed:', result.error_code, result.message)
  console.error('job dir:', result.jobDir)
  process.exit(1)
}
console.log('job dir:', result.jobDir)
console.log('thread/turn:', result.threadId, result.turnId)
console.log('artifacts:')
for (const artifact of result.artifacts) console.log(`  - [${artifact.artifact_kind}] ${artifact.rel_path}`)
console.log('warnings:', result.warnings)
console.log('last message:', result.lastMessage.slice(0, 200))
console.log('spawn evidence:', JSON.stringify(result.spawnEvidence))
console.log('events lines:', (await Bun.file(result.eventsPath).text()).trim().split('\n').length)
```

- [ ] **Step 2: fixture 演练（本机验收）**

```bash
cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun src/kernel/candidate-dry-run.ts --project 3 --chapter 62 --model 217 --fake
```

Expected（fixture 模式下 model 217 是 gemini/openai_compatible → `PROVIDER_TRANSLATE_FAILED` 是**预期失败**；改跑一个假 codex_responses 模型验证 happy path：先在临时工作区跑，或临时在 `workspace/models.json` 加 `codex_responses` 供应商下的模型再还原）。人工核对：
- `jobs/cand-*/project/` 投影齐全，`审稿/第002章.md` 由 fixture 写入并被收为 `review_report`
- `events.jsonl` 含 `initialize`→`initialized`→`thread/start`→`skills/list`→`turn/start`→`turn/completed` 全链路
- `spawn evidence` 含 `story-architect` 子线程
- `last-message.md` 存在

- [ ] **Step 3: 跑全量内核测试收尾**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/ src/routes/kernel-routes.test.ts src/novel-writing/oh-story-core/`
Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add ui/server/src/kernel/candidate-dry-run.ts
git commit -m "feat(kernel): candidate dry-run cli for phase-3 acceptance"
```

- [ ] **Step 5: 真机清单（装好 codex 后人工执行，不阻塞本分期合并）**

1. 安装锁定版 codex；`POST /api/kernel/runtime/probe`（不带 model_id）→ ①②③ 绿。
2. 回填 `workspace/.mangaforge/kernel/runtime.json` 的 `codex_version`（探针返回的版本）。
3. 选一个 `codex_responses` 供应商下的模型 id，`POST /api/kernel/runtime/probe` body `{"model_id": <id>}` → ④ 绿。
4. `bun src/kernel/candidate-dry-run.ts --project 3 --chapter 62 --model <id>`（不带 `--fake`）→ 真审稿报告收为 `review_report`，`events.jsonl` 有真 spawn 证据，与报告 `Fallback:` 行自洽。
5. ④ 不绿之前不进分期 4（spec 风险节的硬门槛）。

---

## 收尾与遗留

- 分期 3 验收 = Task 9 fixture 演练 + 真机清单第 1-4 条（真机部分依赖 codex 安装，属部署前置）。
- 明确不做（分期 4-5 计划再排）：`POST /api/kernel/jobs` 编排、门执行（`reject_solo_fallback` 等收回后门）、commit/选优、进度轮询接口（7.4）、旧按钮阻塞桥接、并跑。`run-candidate.ts` 已把「一个候选」封成纯函数，分期 4 的 job 编排在它外面包状态机即可。
- spec v1.2 待折入：`ENGINE_FAILED` 终态码、key 缺失归 `PROVIDER_TRANSLATE_FAILED`、probe body `model_id`、probe 结果类型、`implemented_reason` 字段。
- 风险复述：真 app-server 字段名可能与「协议形状约定」有出入——客户端已宽容读取（`threadId ?? thread.id` 等），仍有出入时只改 `session.ts` 的读取处与 fixture，不改协议方法集。
