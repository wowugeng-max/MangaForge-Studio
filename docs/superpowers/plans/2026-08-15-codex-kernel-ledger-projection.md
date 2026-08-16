# Codex 内核 · 分期 1+2（账本与合同、投影与供应商翻译）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`（v1.1）的分期 1 与分期 2：内核账本表、合同注册表与校验、合同 HTTP、项目投影（库→文件）、快照收回、agents bundle 安装、供应商翻译（隔离 config.toml）、运行时探针 ①②⑤。**不接真实 Codex 会话**（那是分期 3 另一份计划）。

**Architecture:** 新增 `ui/server/src/kernel/` 目录承载全部内核网关代码，按职责拆小文件（paths / db / template / contracts / projection / providers / probe）。领域数据只通过既有 `novel/repos/*` 读；内核表加在同一 `novel.sqlite`。HTTP 沿用仓库的「register 函数 + 注入 deps」模式，测试沿用 `bun:test` + 轻量 fake Express harness。

**Tech Stack:** Bun（bun:sqlite、Bun.spawn）、TypeScript、Express、zod ^4、JSZip（既有依赖，装 agents bundle 用）。

## Global Constraints

以下取值全部照抄 spec v1.1，任何任务不得偏离：

- `contract_id` 格式 `{pack_id}.{skill_name}.{variant}`，字符集 `^[a-z0-9][a-z0-9.-]{2,127}$`。
- `schema_version` 恒为 `1`。
- capability 封闭集合：`review` / `rewrite` / `outline` / `tracking` / `prompt` / `media` / `attachment`；第一期实现 `review`、`rewrite`、`tracking`、`attachment`。
- mounts 封闭集合：`current_chapter` / `previous_chapter` / `outline` / `characters` / `world` / `tracking` / `skill_tree` / `agents` / `review_report` / `canvas_node`（`canvas_node` 校验通过但投影时拒绝）。
- gates 封闭集合：`reject_solo_fallback` / `require_reviewer_agents` / `require_chapter_file` / `require_matching_review` / `paragraph_retention_70` / `write_outside_scope`。
- `commit.mode`：`manual` | `auto_if_single` | `never`；`commit.source` 取 `oh_story_deslop` / `oh_story_apply` / `kernel_rewrite`。
- 变量白名单（prompt、glob、write_scope、ignore 通用）：`scope_files`、`chapter_no`、`chapter_pad`、`chapter_title`、`previous_chapter_file`、`report_path`、`review_path`、`skill_name`。出现未知 `{{...}}` → 校验失败。
- 磁盘布局：`{workspace}/.mangaforge/kernel/{runtime.json, probe.json, contracts/, jobs/{job_id}/{project/,codex-home/,snapshot/,artifacts/}, vault/}`。
- 章节文件名：`正文/第{NNN}章_{安全标题}.md`，三位补零；标题只留中文/字母/数字/连字符，空则 `未命名`。
- 错误码（本计划涉及的）：`KERNEL_RUNTIME_UNAVAILABLE`(503)、`CONTRACT_INVALID`(400)、`CONTRACT_BUILTIN`(400)、`PROVIDER_TRANSLATE_FAILED`(400)、`OH_STORY_APPLY_NO_REVIEW`、`OH_STORY_APPLY_STALE_REVIEW`。
- 供应商翻译：`codex_responses` → `wire_api = "responses"`；`openai_compatible` → `wire_api = "chat"` 仅当 `runtime.json.supports_chat_wire_api === true`，否则 `PROVIDER_TRANSLATE_FAILED`。key 只进环境变量 `MANGAFORGE_CODEX_KEY`（toml 里写 `env_key`），不落盘。
- 隔离 config.toml 必含：`[agents.<name>]` 四条（`description` + `config_file`）、`memories.generate_memories=false`、`memories.use_memories=false`。
- 上游 oh-story 锁定 revision `546101ee259cec1791546c1124a5ccafa56d2f04`（现装 pack.json 的值）；agents toml 在归档 `skills/story-setup/references/codex/agents/`，`agents_version` 从归档 `skills/story-setup/SKILL.md` 里 `agents_version: (\d+)` 解析（当前为 25）。
- 测试命令统一 `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test <相对路径>`；提交遵循 conventional commits。
- 所有新文件放 `ui/server/src/kernel/`（路由除外，放 `ui/server/src/routes/`）。

---

### Task 1: 内核磁盘路径与 runtime.json

**Files:**
- Create: `ui/server/src/kernel/paths.ts`
- Create: `ui/server/src/kernel/runtime.ts`
- Test: `ui/server/src/kernel/runtime.test.ts`

**Interfaces:**
- Consumes: 无（仅 node:path / node:fs）。
- Produces:
  - `kernelRoot(ws: string): string` → `{ws}/.mangaforge/kernel`
  - `kernelContractsDir(ws)`, `kernelJobsDir(ws)`, `kernelJobDir(ws, jobId)`, `kernelVaultDir(ws)`, `kernelRuntimePath(ws)`, `kernelProbePath(ws)`
  - `type KernelRuntimeInfo = { engine: string; codex_version: string; binary: string; protocol: string; supports_chat_wire_api: boolean }`
  - `loadKernelRuntime(ws: string): KernelRuntimeInfo`（文件缺失/损坏给默认值）
  - `checkKernelBinary(runtime: KernelRuntimeInfo, opts?: { runVersion?: (binary: string) => Promise<string> }): Promise<{ ok: true; version: string } | { ok: false; error_code: 'KERNEL_RUNTIME_UNAVAILABLE'; message: string }>`

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/runtime.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kernelContractsDir, kernelJobDir, kernelRoot, kernelRuntimePath } from './paths'
import { checkKernelBinary, loadKernelRuntime } from './runtime'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-ws-')) }

describe('kernel paths', () => {
  test('paths derive from workspace', () => {
    expect(kernelRoot('/ws')).toBe('/ws/.mangaforge/kernel')
    expect(kernelContractsDir('/ws')).toBe('/ws/.mangaforge/kernel/contracts')
    expect(kernelJobDir('/ws', 'j1')).toBe('/ws/.mangaforge/kernel/jobs/j1')
  })
})

describe('kernel runtime', () => {
  test('missing runtime.json falls back to defaults', () => {
    const runtime = loadKernelRuntime(tempWs())
    expect(runtime).toEqual({
      engine: 'codex-app-server',
      codex_version: '',
      binary: 'codex',
      protocol: 'app-server-stdio',
      supports_chat_wire_api: false,
    })
  })

  test('runtime.json overrides defaults', () => {
    const ws = tempWs()
    mkdirSync(kernelRoot(ws), { recursive: true })
    writeFileSync(kernelRuntimePath(ws), JSON.stringify({ codex_version: '0.99.0', supports_chat_wire_api: true }))
    const runtime = loadKernelRuntime(ws)
    expect(runtime.codex_version).toBe('0.99.0')
    expect(runtime.supports_chat_wire_api).toBe(true)
  })

  test('binary missing -> KERNEL_RUNTIME_UNAVAILABLE', async () => {
    const result = await checkKernelBinary(loadKernelRuntime(tempWs()), {
      runVersion: async () => { throw new Error('ENOENT') },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error_code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('version mismatch -> KERNEL_RUNTIME_UNAVAILABLE, match -> ok', async () => {
    const runtime = { ...loadKernelRuntime(tempWs()), codex_version: '0.99.0' }
    const bad = await checkKernelBinary(runtime, { runVersion: async () => 'codex-cli 0.98.0' })
    expect(bad.ok).toBe(false)
    const good = await checkKernelBinary(runtime, { runVersion: async () => 'codex-cli 0.99.0' })
    expect(good.ok).toBe(true)
    if (good.ok) expect(good.version).toBe('0.99.0')
  })

  test('empty codex_version pins nothing, any binary version passes', async () => {
    const result = await checkKernelBinary(loadKernelRuntime(tempWs()), { runVersion: async () => 'codex-cli 1.2.3' })
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/runtime.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 最小实现**

```ts
// ui/server/src/kernel/paths.ts
import { join } from 'node:path'

export function kernelRoot(activeWorkspace: string) { return join(activeWorkspace, '.mangaforge', 'kernel') }
export function kernelContractsDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'contracts') }
export function kernelJobsDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'jobs') }
export function kernelJobDir(activeWorkspace: string, jobId: string) { return join(kernelJobsDir(activeWorkspace), jobId) }
export function kernelVaultDir(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'vault') }
export function kernelRuntimePath(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'runtime.json') }
export function kernelProbePath(activeWorkspace: string) { return join(kernelRoot(activeWorkspace), 'probe.json') }
```

```ts
// ui/server/src/kernel/runtime.ts
import { readFileSync } from 'node:fs'
import { kernelRuntimePath } from './paths'

export type KernelRuntimeInfo = {
  engine: string
  codex_version: string
  binary: string
  protocol: string
  supports_chat_wire_api: boolean
}

const RUNTIME_DEFAULTS: KernelRuntimeInfo = {
  engine: 'codex-app-server',
  codex_version: '',
  binary: 'codex',
  protocol: 'app-server-stdio',
  supports_chat_wire_api: false,
}

export function loadKernelRuntime(activeWorkspace: string): KernelRuntimeInfo {
  try {
    const raw = JSON.parse(readFileSync(kernelRuntimePath(activeWorkspace), 'utf8'))
    return {
      engine: String(raw?.engine || RUNTIME_DEFAULTS.engine),
      codex_version: String(raw?.codex_version || ''),
      binary: String(raw?.binary || RUNTIME_DEFAULTS.binary),
      protocol: String(raw?.protocol || RUNTIME_DEFAULTS.protocol),
      supports_chat_wire_api: raw?.supports_chat_wire_api === true,
    }
  } catch {
    return { ...RUNTIME_DEFAULTS }
  }
}

async function defaultRunVersion(binary: string): Promise<string> {
  const proc = Bun.spawn([binary, '--version'], { stdout: 'pipe', stderr: 'pipe' })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code !== 0) throw new Error(`${binary} --version exited ${code}`)
  return out.trim()
}

export async function checkKernelBinary(
  runtime: KernelRuntimeInfo,
  opts: { runVersion?: (binary: string) => Promise<string> } = {},
): Promise<{ ok: true; version: string } | { ok: false; error_code: 'KERNEL_RUNTIME_UNAVAILABLE'; message: string }> {
  const runVersion = opts.runVersion || defaultRunVersion
  let output = ''
  try {
    output = await runVersion(runtime.binary)
  } catch (error: any) {
    return { ok: false, error_code: 'KERNEL_RUNTIME_UNAVAILABLE', message: `codex binary not available: ${String(error?.message || error)}` }
  }
  const version = (output.match(/(\d+\.\d+\.\S+)/) || [])[1] || output.trim()
  if (runtime.codex_version && version !== runtime.codex_version) {
    return { ok: false, error_code: 'KERNEL_RUNTIME_UNAVAILABLE', message: `codex version ${version} != pinned ${runtime.codex_version}` }
  }
  return { ok: true, version }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/runtime.test.ts`
Expected: PASS（6 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/paths.ts ui/server/src/kernel/runtime.ts ui/server/src/kernel/runtime.test.ts
git commit -m "feat(kernel): add kernel disk paths and runtime.json loader"
```

---

### Task 2: 内核账本表

**Files:**
- Create: `ui/server/src/kernel/db.ts`
- Test: `ui/server/src/kernel/db.test.ts`

**Interfaces:**
- Consumes: `openDb`（`../novel/db`）、`ensureSqliteSchema`（`../novel/db`）。
- Produces:
  - `ensureKernelSchema(db: Database): void`
  - `openKernelDb(activeWorkspace: string): Database`（openDb → ensureSqliteSchema → ensureKernelSchema）
  - `listCommittedTrackingDocPaths(activeWorkspace: string, projectId: number): Array<{ rel_path: string; vault_path: string }>`（查 `kernel_artifacts` join `kernel_commits`/`kernel_jobs`，kind=`tracking_doc`；分期 2 时恒为空数组，投影任务据此写最小模板）

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/db.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listCommittedTrackingDocPaths, openKernelDb } from './db'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-db-')) }

describe('kernel db', () => {
  test('openKernelDb creates the four kernel tables', () => {
    const db = openKernelDb(tempWs())
    const names = (db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name)
    for (const table of ['kernel_jobs', 'kernel_candidates', 'kernel_artifacts', 'kernel_commits']) {
      expect(names).toContain(table)
    }
    const candidateCols = (db.query('PRAGMA table_info(kernel_candidates)').all() as any[]).map(c => c.name)
    expect(candidateCols).toContain('metadata')
    db.close()
  })

  test('kernel job insert honors defaults and cascade delete', () => {
    const ws = tempWs()
    const db = openKernelDb(ws)
    db.exec("INSERT INTO projects (id, title) VALUES (3, 't')")
    db.exec("INSERT INTO kernel_jobs (id, project_id, status, capability, subject_type, subject_id) VALUES ('j1', 3, 'queued', 'review', 'chapter', 62)")
    db.exec("INSERT INTO kernel_candidates (id, job_id, contract_id, pack_id, pack_revision, skill_name, status) VALUES ('c1', 'j1', 'a.b.c', 'a', 'rev', 'b', 'queued')")
    db.exec("DELETE FROM kernel_jobs WHERE id='j1'")
    expect((db.query('SELECT COUNT(*) AS n FROM kernel_candidates').get() as any).n).toBe(0)
    db.close()
  })

  test('listCommittedTrackingDocPaths returns [] when nothing committed', () => {
    const ws = tempWs()
    openKernelDb(ws).close()
    expect(listCommittedTrackingDocPaths(ws, 3)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/db.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现（DDL 逐字照抄 spec v1.1）**

```ts
// ui/server/src/kernel/db.ts
import type { Database } from 'bun:sqlite'
import { ensureSqliteSchema, openDb } from '../novel/db'

export function ensureKernelSchema(db: Database) {
  db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS kernel_jobs (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  workspace_scope TEXT NOT NULL DEFAULT 'novel',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  capability TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  model_provider_id TEXT NOT NULL DEFAULT '',
  model_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_revision TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  status TEXT NOT NULL,
  thread_id TEXT DEFAULT '',
  turn_id TEXT DEFAULT '',
  started_at TEXT DEFAULT NULL,
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  last_message_excerpt TEXT DEFAULT '',
  gate_results TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_artifacts (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  vault_path TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_commits (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  domain_table TEXT NOT NULL,
  domain_row_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);
`)
}

export function openKernelDb(activeWorkspace: string): Database {
  const db = openDb(activeWorkspace)
  ensureSqliteSchema(db)
  ensureKernelSchema(db)
  return db
}

export function listCommittedTrackingDocPaths(activeWorkspace: string, projectId: number): Array<{ rel_path: string; vault_path: string }> {
  const db = openKernelDb(activeWorkspace)
  try {
    return db.query(`
      SELECT a.rel_path AS rel_path, a.vault_path AS vault_path
      FROM kernel_artifacts a
      JOIN kernel_commits c ON c.candidate_id = a.candidate_id
      JOIN kernel_jobs j ON j.id = c.job_id
      WHERE j.project_id = ? AND a.artifact_kind = 'tracking_doc'
      ORDER BY c.created_at DESC
    `).all(projectId) as Array<{ rel_path: string; vault_path: string }>
  } finally {
    db.close()
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/db.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/db.ts ui/server/src/kernel/db.test.ts
git commit -m "feat(kernel): add kernel ledger tables (jobs/candidates/artifacts/commits)"
```

---

### Task 3: 变量模板与 artifact_kind 注册表

**Files:**
- Create: `ui/server/src/kernel/template.ts`
- Create: `ui/server/src/kernel/artifact-kinds.ts`
- Test: `ui/server/src/kernel/template.test.ts`

**Interfaces:**
- Produces:
  - `type KernelPromptVars = { scope_files: string; chapter_no: string; chapter_pad: string; chapter_title: string; previous_chapter_file: string; report_path: string; review_path: string; skill_name: string }`
  - `KERNEL_PROMPT_VARIABLES: readonly string[]`（8 个白名单名）
  - `findUnknownVariables(template: string): string[]`
  - `renderKernelTemplate(template: string, vars: KernelPromptVars): string`（未知变量抛 `Error`，code `CONTRACT_INVALID`）
  - `REGISTERED_ARTIFACT_KINDS: readonly string[]` = `['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment']`（测试锁定名单）
  - `IMPLEMENTED_CAPABILITIES: readonly string[]` = `['review', 'rewrite', 'tracking', 'attachment']`
  - `ALL_CAPABILITIES: readonly string[]` = `['review', 'rewrite', 'outline', 'tracking', 'prompt', 'media', 'attachment']`

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/template.test.ts
import { describe, expect, test } from 'bun:test'
import { IMPLEMENTED_CAPABILITIES, REGISTERED_ARTIFACT_KINDS } from './artifact-kinds'
import { findUnknownVariables, renderKernelTemplate, type KernelPromptVars } from './template'

const vars: KernelPromptVars = {
  scope_files: '正文/第062章_违背规则的绝对防御.md',
  chapter_no: '62',
  chapter_pad: '062',
  chapter_title: '违背规则的绝对防御',
  previous_chapter_file: '正文/第061章_上一章.md',
  report_path: '审稿/第062章.md',
  review_path: '审稿/第062章.md',
  skill_name: 'story-review',
}

describe('kernel template', () => {
  test('renders whitelisted variables', () => {
    expect(renderKernelTemplate('审稿/第{{chapter_pad}}章.md', vars)).toBe('审稿/第062章.md')
    expect(renderKernelTemplate('范围：{{scope_files}}，上一章：{{previous_chapter_file}}', vars))
      .toBe('范围：正文/第062章_违背规则的绝对防御.md，上一章：正文/第061章_上一章.md')
  })

  test('unknown variable is reported and throws on render', () => {
    expect(findUnknownVariables('x {{chapter_pad}} y {{bogus_var}}')).toEqual(['bogus_var'])
    expect(() => renderKernelTemplate('{{bogus_var}}', vars)).toThrow(/bogus_var/)
  })

  test('artifact kind registry is locked', () => {
    expect([...REGISTERED_ARTIFACT_KINDS]).toEqual(['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment'])
    expect([...IMPLEMENTED_CAPABILITIES]).toEqual(['review', 'rewrite', 'tracking', 'attachment'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/template.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/template.ts
export type KernelPromptVars = {
  scope_files: string
  chapter_no: string
  chapter_pad: string
  chapter_title: string
  previous_chapter_file: string
  report_path: string
  review_path: string
  skill_name: string
}

export const KERNEL_PROMPT_VARIABLES = [
  'scope_files', 'chapter_no', 'chapter_pad', 'chapter_title',
  'previous_chapter_file', 'report_path', 'review_path', 'skill_name',
] as const

const VAR_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g

export function findUnknownVariables(template: string): string[] {
  const unknown: string[] = []
  for (const match of String(template || '').matchAll(VAR_PATTERN)) {
    const name = match[1]
    if (!(KERNEL_PROMPT_VARIABLES as readonly string[]).includes(name) && !unknown.includes(name)) unknown.push(name)
  }
  return unknown
}

export function renderKernelTemplate(template: string, vars: KernelPromptVars): string {
  const unknown = findUnknownVariables(template)
  if (unknown.length) {
    throw Object.assign(new Error(`unknown template variables: ${unknown.join(', ')}`), { code: 'CONTRACT_INVALID' })
  }
  return String(template || '').replace(VAR_PATTERN, (_, name: string) => String((vars as any)[name] ?? ''))
}
```

```ts
// ui/server/src/kernel/artifact-kinds.ts
export const REGISTERED_ARTIFACT_KINDS = ['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment'] as const
export const IMPLEMENTED_CAPABILITIES = ['review', 'rewrite', 'tracking', 'attachment'] as const
export const ALL_CAPABILITIES = ['review', 'rewrite', 'outline', 'tracking', 'prompt', 'media', 'attachment'] as const
export type KernelCapability = (typeof ALL_CAPABILITIES)[number]
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/template.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/template.ts ui/server/src/kernel/artifact-kinds.ts ui/server/src/kernel/template.test.ts
git commit -m "feat(kernel): add prompt variable whitelist and artifact-kind registry"
```

---

### Task 4: 合同 zod 校验

**Files:**
- Create: `ui/server/src/kernel/contracts/schema.ts`
- Test: `ui/server/src/kernel/contracts/schema.test.ts`

**Interfaces:**
- Consumes: `findUnknownVariables`（`../template`）、`REGISTERED_ARTIFACT_KINDS` / `ALL_CAPABILITIES`（`../artifact-kinds`）。
- Produces:
  - `type KernelContract`（zod 推导：字段与 spec 合同 JSON 一致；`ignore?: string[]`、`commit.source?: string`、`invoke.mention: string`（可空串）、`outputs[].fallback?: 'last_message'`）
  - `validateKernelContract(input: unknown): { ok: true; contract: KernelContract } | { ok: false; errors: string[] }`
  - 校验规则：id 字符集/格式且 `id === pack_id + '.' + skill_name + '.' + variant`；`mention` 为空串或 `'$' + skill_name`；capability ∈ ALL_CAPABILITIES；mounts ∈ 封闭集合；gates ∈ 封闭集合；artifact_kind ∈ REGISTERED_ARTIFACT_KINDS；prompt/glob/write_scope/ignore 无未知变量；`schema_version === 1`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/contracts/schema.test.ts
import { describe, expect, test } from 'bun:test'
import { validateKernelContract } from './schema'

function baseContract() {
  return {
    schema_version: 1,
    id: 'oh-story-core.story-review.full',
    pack_id: 'oh-story-core',
    skill_name: 'story-review',
    variant: 'full',
    capability: 'review',
    label: 'oh-story 完整审稿',
    invoke: { mention: '$story-review', prompt: '报告写到 {{report_path}}' },
    projection: { mounts: ['current_chapter', 'outline'] },
    outputs: [{ artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', fallback: 'last_message', binding: 'reviews.oh_story_review', required: true }],
    write_scope: ['审稿/'],
    ignore: ['.story-review/'],
    gates: ['reject_solo_fallback'],
    commit: { mode: 'auto_if_single', domain_writes: ['reviews'] },
    sandbox: 'workspace-write',
    approval: 'never',
  }
}

describe('kernel contract schema', () => {
  test('valid contract passes and returns typed contract', () => {
    const result = validateKernelContract(baseContract())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.contract.id).toBe('oh-story-core.story-review.full')
  })

  test('id must equal pack_id.skill_name.variant', () => {
    const bad = { ...baseContract(), id: 'oh-story-core.other.full' }
    const result = validateKernelContract(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('id')
  })

  test('id charset enforced', () => {
    const bad = { ...baseContract(), id: 'Bad_ID.story-review.full', pack_id: 'Bad_ID' }
    expect(validateKernelContract(bad).ok).toBe(false)
  })

  test('mention must be $skill_name or empty', () => {
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '$wrong-name', prompt: 'x' } }).ok).toBe(false)
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '', prompt: 'x' } }).ok).toBe(true)
  })

  test('unknown template variable in prompt or glob fails', () => {
    expect(validateKernelContract({ ...baseContract(), invoke: { mention: '$story-review', prompt: '{{nope}}' } }).ok).toBe(false)
    const badGlob = baseContract()
    badGlob.outputs[0].glob = '审稿/{{nope}}.md'
    expect(validateKernelContract(badGlob).ok).toBe(false)
  })

  test('unregistered artifact_kind fails', () => {
    const bad = baseContract()
    ;(bad.outputs[0] as any).artifact_kind = 'mystery'
    expect(validateKernelContract(bad).ok).toBe(false)
  })

  test('unknown gate or mount fails', () => {
    expect(validateKernelContract({ ...baseContract(), gates: ['not_a_gate'] }).ok).toBe(false)
    expect(validateKernelContract({ ...baseContract(), projection: { mounts: ['not_a_mount'] } }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/contracts/schema.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/contracts/schema.ts
import { z } from 'zod'
import { ALL_CAPABILITIES, REGISTERED_ARTIFACT_KINDS } from '../artifact-kinds'
import { findUnknownVariables } from '../template'

export const KERNEL_MOUNTS = [
  'current_chapter', 'previous_chapter', 'outline', 'characters', 'world',
  'tracking', 'skill_tree', 'agents', 'review_report', 'canvas_node',
] as const

export const KERNEL_GATES = [
  'reject_solo_fallback', 'require_reviewer_agents', 'require_chapter_file',
  'require_matching_review', 'paragraph_retention_70', 'write_outside_scope',
] as const

const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{2,127}$/

const outputSchema = z.object({
  artifact_kind: z.enum(REGISTERED_ARTIFACT_KINDS as unknown as [string, ...string[]]),
  glob: z.string().min(1),
  fallback: z.literal('last_message').optional(),
  binding: z.string().min(1),
  required: z.boolean(),
})

const contractSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().regex(CONTRACT_ID_PATTERN),
  pack_id: z.string().min(1),
  skill_name: z.string().min(1),
  variant: z.string().min(1),
  capability: z.enum(ALL_CAPABILITIES as unknown as [string, ...string[]]),
  label: z.string().min(1),
  invoke: z.object({ mention: z.string(), prompt: z.string().min(1) }),
  projection: z.object({ mounts: z.array(z.enum(KERNEL_MOUNTS)).min(1) }),
  outputs: z.array(outputSchema).min(1),
  write_scope: z.array(z.string().min(1)),
  ignore: z.array(z.string().min(1)).optional(),
  gates: z.array(z.enum(KERNEL_GATES)),
  commit: z.object({
    mode: z.enum(['manual', 'auto_if_single', 'never']),
    domain_writes: z.array(z.string()),
    source: z.string().optional(),
  }),
  sandbox: z.enum(['workspace-write', 'read-only']),
  approval: z.literal('never'),
})

export type KernelContract = z.infer<typeof contractSchema>

export function validateKernelContract(input: unknown):
  | { ok: true; contract: KernelContract }
  | { ok: false; errors: string[] } {
  const parsed = contractSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) }
  }
  const contract = parsed.data
  const errors: string[] = []
  if (contract.id !== `${contract.pack_id}.${contract.skill_name}.${contract.variant}`) {
    errors.push('id: must equal pack_id.skill_name.variant')
  }
  if (contract.invoke.mention !== '' && contract.invoke.mention !== `$${contract.skill_name}`) {
    errors.push('invoke.mention: must be empty or $skill_name')
  }
  const templates = [
    contract.invoke.prompt,
    ...contract.outputs.map(output => output.glob),
    ...contract.write_scope,
    ...(contract.ignore || []),
  ]
  for (const template of templates) {
    const unknown = findUnknownVariables(template)
    if (unknown.length) errors.push(`template: unknown variables ${unknown.join(', ')} in "${template}"`)
  }
  if (errors.length) return { ok: false, errors }
  return { ok: true, contract }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/contracts/schema.test.ts`
Expected: PASS（7 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/contracts/schema.ts ui/server/src/kernel/contracts/schema.test.ts
git commit -m "feat(kernel): add contract zod schema and validation rules"
```

---

### Task 5: 内置合同与磁盘注册表

**Files:**
- Create: `ui/server/src/kernel/contracts/builtin.ts`
- Create: `ui/server/src/kernel/contracts/store.ts`
- Test: `ui/server/src/kernel/contracts/store.test.ts`

**Interfaces:**
- Consumes: `validateKernelContract` / `KernelContract`（`./schema`）、`kernelContractsDir`（`../paths`）、`IMPLEMENTED_CAPABILITIES`（`../artifact-kinds`）。
- Produces:
  - `BUILTIN_KERNEL_CONTRACTS: KernelContract[]`（四份：review.full / deslop.file / apply.surgical / long-write.outline）
  - `isBuiltinKernelContractId(id: string): boolean`
  - `seedBuiltinKernelContracts(ws: string): void`（写 `{contracts}/{id}.json`，内置总是覆写为当前仓库版本）
  - `type KernelContractView = KernelContract & { builtin: boolean; implemented: boolean }`
  - `loadKernelContracts(ws: string): { contracts: KernelContractView[]; errors: Array<{ file: string; errors: string[] }> }`（先 seed 再读全目录；校验失败的用户合同进 errors 不进 contracts）
  - `saveUserKernelContract(ws: string, input: unknown): { ok: true; contract: KernelContractView } | { ok: false; status: 400; code: 'CONTRACT_INVALID' | 'CONTRACT_BUILTIN'; errors?: string[] }`
  - `deleteUserKernelContract(ws: string, id: string): { ok: true } | { ok: false; status: 400 | 404; code: string }`
  - `implemented` 规则：`IMPLEMENTED_CAPABILITIES.includes(capability)`。

- [ ] **Step 1: 写内置合同（完整字面量）**

```ts
// ui/server/src/kernel/contracts/builtin.ts
import type { KernelContract } from './schema'

const reviewFull: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-review.full',
  pack_id: 'oh-story-core',
  skill_name: 'story-review',
  variant: 'full',
  capability: 'review',
  label: 'oh-story 完整审稿',
  invoke: {
    mention: '$story-review',
    prompt: [
      '审查范围：{{scope_files}}',
      '模式：full',
      '上一章：{{previous_chapter_file}}',
      '若大纲与正文进度不齐：在报告标 S2，写清先改大纲还是先改后文。',
      '不要改本章正文。',
      '报告写到 {{report_path}}',
      '若 Fallback 到 solo：必须在报告第一行写明原因。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'previous_chapter', 'outline', 'characters', 'world', 'tracking', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', fallback: 'last_message', binding: 'reviews.oh_story_review', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['审稿/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_solo_fallback', 'require_reviewer_agents'],
  commit: { mode: 'auto_if_single', domain_writes: ['reviews'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

const deslopFile: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-deslop.file',
  pack_id: 'oh-story-core',
  skill_name: 'story-deslop',
  variant: 'file',
  capability: 'rewrite',
  label: 'oh-story 去AI（文件模式）',
  invoke: {
    mention: '$story-deslop',
    prompt: [
      '目标文件：{{scope_files}}',
      '文件模式：直接编辑目标文件完成去AI润色；按 SKILL.md 的检测、定级与 Gate 流程执行，必要时运行 skill 自带脚本。',
      '不要把润色结果只写在回复里，必须写回目标文件。',
      '不要修改 追踪/ 与 大纲/。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
  ],
  write_scope: ['正文/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_deslop' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const applySurgical: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-apply.surgical',
  pack_id: 'oh-story-core',
  skill_name: 'story-apply',
  variant: 'surgical',
  capability: 'rewrite',
  label: '按建议改稿（外科手术式）',
  invoke: {
    mention: '',
    prompt: [
      '按 改稿/指令.md 执行外科手术式修改：只落实审稿报告中的可执行「修改建议」，禁止整章重写、禁止风格通篇抛光。',
      '审稿报告：{{review_path}}',
      '目标文件：{{scope_files}}',
      '直接编辑目标文件。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'previous_chapter', 'review_report', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
  ],
  write_scope: ['正文/'],
  ignore: ['.story-review/'],
  gates: ['require_matching_review', 'paragraph_retention_70', 'require_chapter_file'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_apply' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteOutline: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.outline',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'outline',
  capability: 'outline',
  label: 'oh-story 长篇细纲（未实现）',
  invoke: { mention: '$story-long-write', prompt: '细纲工作流：{{scope_files}}（第一期不执行）' },
  projection: { mounts: ['outline', 'skill_tree'] },
  outputs: [
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.replace', required: true },
  ],
  write_scope: ['大纲/'],
  gates: [],
  commit: { mode: 'manual', domain_writes: ['outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

export const BUILTIN_KERNEL_CONTRACTS: KernelContract[] = [reviewFull, deslopFile, applySurgical, longWriteOutline]

export function isBuiltinKernelContractId(id: string): boolean {
  return BUILTIN_KERNEL_CONTRACTS.some(contract => contract.id === id)
}
```

- [ ] **Step 2: 写失败测试**

```ts
// ui/server/src/kernel/contracts/store.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BUILTIN_KERNEL_CONTRACTS } from './builtin'
import { validateKernelContract } from './schema'
import { deleteUserKernelContract, loadKernelContracts, saveUserKernelContract, seedBuiltinKernelContracts } from './store'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-contracts-')) }

describe('builtin contracts', () => {
  test('all four builtins pass validation', () => {
    for (const contract of BUILTIN_KERNEL_CONTRACTS) {
      const result = validateKernelContract(contract)
      expect(result.ok).toBe(true)
    }
    expect(BUILTIN_KERNEL_CONTRACTS.map(c => c.id)).toEqual([
      'oh-story-core.story-review.full',
      'oh-story-core.story-deslop.file',
      'oh-story-core.story-apply.surgical',
      'oh-story-core.story-long-write.outline',
    ])
  })
})

describe('contract store', () => {
  test('seed writes builtin files, load returns views with implemented flags', () => {
    const ws = tempWs()
    seedBuiltinKernelContracts(ws)
    expect(readdirSync(join(ws, '.mangaforge', 'kernel', 'contracts')).sort()).toEqual([
      'oh-story-core.story-apply.surgical.json',
      'oh-story-core.story-deslop.file.json',
      'oh-story-core.story-long-write.outline.json',
      'oh-story-core.story-review.full.json',
    ])
    const { contracts, errors } = loadKernelContracts(ws)
    expect(errors).toEqual([])
    const review = contracts.find(c => c.id === 'oh-story-core.story-review.full')!
    expect(review.builtin).toBe(true)
    expect(review.implemented).toBe(true)
    const outline = contracts.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(outline.implemented).toBe(false)
  })

  test('user contract with same artifact kind installs without code change (扩展 8.1)', () => {
    const ws = tempWs()
    const fake = {
      ...BUILTIN_KERNEL_CONTRACTS[0],
      id: 'fake-pack.fake-review.full',
      pack_id: 'fake-pack',
      skill_name: 'fake-review',
      variant: 'full',
      invoke: { mention: '$fake-review', prompt: '报告写到 {{report_path}}' },
      outputs: [{ artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', binding: 'reviews.kernel_review', required: true }],
    }
    const saved = saveUserKernelContract(ws, fake)
    expect(saved.ok).toBe(true)
    const { contracts } = loadKernelContracts(ws)
    expect(contracts.some(c => c.id === 'fake-pack.fake-review.full' && !c.builtin && c.implemented)).toBe(true)
  })

  test('overwriting builtin id -> CONTRACT_BUILTIN; invalid json -> CONTRACT_INVALID', () => {
    const ws = tempWs()
    const clash = saveUserKernelContract(ws, BUILTIN_KERNEL_CONTRACTS[0])
    expect(clash.ok).toBe(false)
    if (!clash.ok) expect(clash.code).toBe('CONTRACT_BUILTIN')
    const invalid = saveUserKernelContract(ws, { schema_version: 1, id: 'x' })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.code).toBe('CONTRACT_INVALID')
  })

  test('delete rejects builtin, removes user contract', () => {
    const ws = tempWs()
    seedBuiltinKernelContracts(ws)
    expect(deleteUserKernelContract(ws, 'oh-story-core.story-review.full')).toEqual({ ok: false, status: 400, code: 'CONTRACT_BUILTIN' })
    expect(deleteUserKernelContract(ws, 'nope.nope.nope')).toEqual({ ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' })
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/contracts/store.test.ts`
Expected: FAIL

- [ ] **Step 4: 实现 store**

```ts
// ui/server/src/kernel/contracts/store.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { IMPLEMENTED_CAPABILITIES } from '../artifact-kinds'
import { kernelContractsDir } from '../paths'
import { BUILTIN_KERNEL_CONTRACTS, isBuiltinKernelContractId } from './builtin'
import { validateKernelContract, type KernelContract } from './schema'

export type KernelContractView = KernelContract & { builtin: boolean; implemented: boolean }

function toView(contract: KernelContract): KernelContractView {
  return {
    ...contract,
    builtin: isBuiltinKernelContractId(contract.id),
    implemented: (IMPLEMENTED_CAPABILITIES as readonly string[]).includes(contract.capability),
  }
}

export function seedBuiltinKernelContracts(activeWorkspace: string) {
  const dir = kernelContractsDir(activeWorkspace)
  mkdirSync(dir, { recursive: true })
  for (const contract of BUILTIN_KERNEL_CONTRACTS) {
    writeFileSync(join(dir, `${contract.id}.json`), JSON.stringify(contract, null, 2))
  }
}

export function loadKernelContracts(activeWorkspace: string): {
  contracts: KernelContractView[]
  errors: Array<{ file: string; errors: string[] }>
} {
  seedBuiltinKernelContracts(activeWorkspace)
  const dir = kernelContractsDir(activeWorkspace)
  const contracts: KernelContractView[] = []
  const errors: Array<{ file: string; errors: string[] }> = []
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'))
      const result = validateKernelContract(parsed)
      if (result.ok) contracts.push(toView(result.contract))
      else errors.push({ file, errors: result.errors })
    } catch (error: any) {
      errors.push({ file, errors: [String(error?.message || error)] })
    }
  }
  return { contracts, errors }
}

export function saveUserKernelContract(activeWorkspace: string, input: unknown):
  | { ok: true; contract: KernelContractView }
  | { ok: false; status: 400; code: 'CONTRACT_INVALID' | 'CONTRACT_BUILTIN'; errors?: string[] } {
  const result = validateKernelContract(input)
  if (!result.ok) return { ok: false, status: 400, code: 'CONTRACT_INVALID', errors: result.errors }
  if (isBuiltinKernelContractId(result.contract.id)) return { ok: false, status: 400, code: 'CONTRACT_BUILTIN' }
  const dir = kernelContractsDir(activeWorkspace)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${result.contract.id}.json`), JSON.stringify(result.contract, null, 2))
  return { ok: true, contract: toView(result.contract) }
}

export function deleteUserKernelContract(activeWorkspace: string, id: string):
  | { ok: true }
  | { ok: false; status: 400 | 404; code: string } {
  if (isBuiltinKernelContractId(id)) return { ok: false, status: 400, code: 'CONTRACT_BUILTIN' }
  const path = join(kernelContractsDir(activeWorkspace), `${id}.json`)
  if (!existsSync(path)) return { ok: false, status: 404, code: 'CONTRACT_NOT_FOUND' }
  rmSync(path)
  return { ok: true }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/contracts/store.test.ts`
Expected: PASS（5 个）——其中「fake review 合同只加 JSON 即可用」即 spec 验收第 6 条的锁定测试。

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/kernel/contracts/builtin.ts ui/server/src/kernel/contracts/store.ts ui/server/src/kernel/contracts/store.test.ts
git commit -m "feat(kernel): add builtin contracts and disk contract registry"
```

---

### Task 6: 合同 HTTP 路由与接线

**Files:**
- Create: `ui/server/src/routes/kernel-routes.ts`
- Modify: `ui/server/src/index.ts:35` 附近（import）与 `ui/server/src/index.ts:147` 附近（`registerNovelRoutes` 调用之后）
- Test: `ui/server/src/routes/kernel-routes.test.ts`

**Interfaces:**
- Consumes: `loadKernelContracts` / `saveUserKernelContract` / `deleteUserKernelContract`（`../kernel/contracts/store`）、`loadKernelRuntime` / `checkKernelBinary`（`../kernel/runtime`）、Task 12 之后再挂探针（本任务先留 runtime 状态查询）。
- Produces:
  - `registerKernelRoutes(app: Express, deps: { getWorkspace: () => string })`
  - `GET /api/kernel/contracts` → `{ ok: true, runtime: { available: boolean; version?: string; message?: string }, contracts: [...], errors: [...] }`
  - `POST /api/kernel/contracts` → 200 `{ ok, contract }` / 400 `{ error, code }`
  - `DELETE /api/kernel/contracts/:id` → `{ ok: true }` / 400 / 404

- [ ] **Step 1: 写失败测试（沿用仓库 routeHarness 风格）**

```ts
// ui/server/src/routes/kernel-routes.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerKernelRoutes } from './kernel-routes'

function routeHarness(ws: string) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerKernelRoutes(app, { getWorkspace: () => ws })
  return handlers
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

describe('kernel contract routes', () => {
  test('GET /api/kernel/contracts lists builtins with runtime state', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const res = await callRoute(handlers.get('GET /api/kernel/contracts'))
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.contracts.length).toBe(4)
    expect(typeof res.body.runtime.available).toBe('boolean')
  })

  test('POST rejects builtin override with 400 CONTRACT_BUILTIN', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const list = await callRoute(handlers.get('GET /api/kernel/contracts'))
    const res = await callRoute(handlers.get('POST /api/kernel/contracts'), { body: list.body.contracts[0] })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('CONTRACT_BUILTIN')
  })

  test('POST invalid body -> 400 CONTRACT_INVALID', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const res = await callRoute(handlers.get('POST /api/kernel/contracts'), { body: { schema_version: 1 } })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('CONTRACT_INVALID')
  })

  test('DELETE builtin -> 400, unknown -> 404', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const builtin = await callRoute(handlers.get('DELETE /api/kernel/contracts/:id'), { params: { id: 'oh-story-core.story-review.full' } })
    expect(builtin.statusCode).toBe(400)
    const missing = await callRoute(handlers.get('DELETE /api/kernel/contracts/:id'), { params: { id: 'a.b.c' } })
    expect(missing.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/routes/kernel-routes.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现路由**

```ts
// ui/server/src/routes/kernel-routes.ts
import type { Express } from 'express'
import { deleteUserKernelContract, loadKernelContracts, saveUserKernelContract } from '../kernel/contracts/store'
import { checkKernelBinary, loadKernelRuntime } from '../kernel/runtime'

export type KernelRoutesDeps = { getWorkspace: () => string }

export function registerKernelRoutes(app: Express, deps: KernelRoutesDeps) {
  app.get('/api/kernel/contracts', async (_req, res) => {
    try {
      const workspace = deps.getWorkspace()
      const runtime = loadKernelRuntime(workspace)
      const binary = await checkKernelBinary(runtime)
      const { contracts, errors } = loadKernelContracts(workspace)
      res.json({
        ok: true,
        runtime: binary.ok
          ? { available: true, version: binary.version, supports_chat_wire_api: runtime.supports_chat_wire_api }
          : { available: false, message: binary.message, supports_chat_wire_api: runtime.supports_chat_wire_api },
        contracts: contracts.map(({ builtin, implemented, id, label, capability, ...rest }) => ({ id, label, capability, builtin, implemented, ...rest })),
        errors,
      })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.post('/api/kernel/contracts', (req, res) => {
    const result = saveUserKernelContract(deps.getWorkspace(), req.body)
    if (!result.ok) return res.status(result.status).json({ error: 'contract rejected', code: result.code, details: result.errors || [] })
    res.json({ ok: true, contract: result.contract })
  })

  app.delete('/api/kernel/contracts/:id', (req, res) => {
    const result = deleteUserKernelContract(deps.getWorkspace(), String(req.params?.id || ''))
    if (!result.ok) return res.status(result.status).json({ error: 'contract not deletable', code: result.code })
    res.json({ ok: true })
  })
}
```

- [ ] **Step 4: 接线到服务入口**

在 `ui/server/src/index.ts` 中（import 区加一行，`registerNovelRoutes(app, getWorkspace, { mcpRuntime })` 调用之后加一行）：

```ts
import { registerKernelRoutes } from './routes/kernel-routes'
// ... registerNovelRoutes(...) 之后：
registerKernelRoutes(app, { getWorkspace })
```

- [ ] **Step 5: 跑测试 + 构建检查**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/routes/kernel-routes.test.ts && bun run check`
Expected: 测试 PASS（4 个）；`bun run check` 构建成功

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/routes/kernel-routes.ts ui/server/src/routes/kernel-routes.test.ts ui/server/src/index.ts
git commit -m "feat(kernel): expose contract registry over /api/kernel/contracts"
```

> 至此分期 1 完成：表、磁盘、校验、HTTP 读合同，未接 Codex。

---

### Task 7: 投影命名规则

**Files:**
- Create: `ui/server/src/kernel/projection/naming.ts`
- Test: `ui/server/src/kernel/projection/naming.test.ts`

**Interfaces:**
- Produces:
  - `padChapterNo(no: number): string`（三位补零，>999 原样十进制）
  - `safeChapterTitle(title: string): string`（只留 `一-鿿`、字母、数字、连字符；清洗后为空 → `未命名`）
  - `chapterFileName(no: number, title: string): string` → `第{NNN}章_{安全标题}.md`
  - `chapterRelPath(no: number, title: string): string` → `正文/` + chapterFileName

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/projection/naming.test.ts
import { describe, expect, test } from 'bun:test'
import { chapterFileName, chapterRelPath, padChapterNo, safeChapterTitle } from './naming'

describe('projection naming', () => {
  test('pads chapter number to three digits', () => {
    expect(padChapterNo(2)).toBe('002')
    expect(padChapterNo(62)).toBe('062')
    expect(padChapterNo(1024)).toBe('1024')
  })

  test('sanitizes title to 中文/字母/数字/连字符', () => {
    expect(safeChapterTitle('违背规则的绝对防御')).toBe('违背规则的绝对防御')
    expect(safeChapterTitle('Hello, world! 第2章')).toBe('Helloworld第2章')
    expect(safeChapterTitle('a-b_c/d')).toBe('a-bcd')
    expect(safeChapterTitle('！？。')).toBe('未命名')
    expect(safeChapterTitle('')).toBe('未命名')
  })

  test('composes chapter file name and rel path', () => {
    expect(chapterFileName(62, '违背规则的绝对防御')).toBe('第062章_违背规则的绝对防御.md')
    expect(chapterRelPath(62, '违背规则的绝对防御')).toBe('正文/第062章_违背规则的绝对防御.md')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/naming.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/projection/naming.ts
export function padChapterNo(no: number): string {
  return String(Math.max(0, Math.trunc(no))).padStart(3, '0')
}

export function safeChapterTitle(title: string): string {
  const kept = String(title || '').replace(/[^一-鿿A-Za-z0-9-]/g, '')
  return kept || '未命名'
}

export function chapterFileName(no: number, title: string): string {
  return `第${padChapterNo(no)}章_${safeChapterTitle(title)}.md`
}

export function chapterRelPath(no: number, title: string): string {
  return `正文/${chapterFileName(no, title)}`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/naming.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/projection/naming.ts ui/server/src/kernel/projection/naming.test.ts
git commit -m "feat(kernel): add chapter projection naming rules"
```

---

### Task 8: 领域投影（库 → 文件）

**Files:**
- Create: `ui/server/src/kernel/projection/project.ts`
- Test: `ui/server/src/kernel/projection/project.test.ts`

**Interfaces:**
- Consumes:
  - `getNovelProject(ws, id)`、`getNovelChapter(ws, chapterId, projectId)`、`listNovelChapters(ws, projectId)`、`listNovelOutlines(ws, projectId)`、`listNovelCharacters(ws, projectId)`、`listNovelWorldbuilding(ws, projectId)`、`listNovelReviewsByType(ws, projectId, type)`（全部来自 `../../novel`）
  - `latestOhStoryReviewForChapter(reviews, chapterId)`、`ohStoryReviewMatchesChapterText(review, text)`、`parseOhStoryReviewPayload(review)`（`../../novel-writing/oh-story-core/review-match`）
  - `listCommittedTrackingDocPaths`（`../db`）、`chapterRelPath` / `padChapterNo`（`./naming`）、`renderKernelTemplate` / `KernelPromptVars`（`../template`）、`KernelContract`（`../contracts/schema`）
- Produces:
  - `projectKernelSubject(input: { workspace: string; projectId: number; chapterId: number; contract: KernelContract; projectDir: string }): Promise<{ vars: KernelPromptVars; files: string[] }>`
  - 抛错：`{ code: 'CHAPTER_NOT_FOUND' }`；review_report 挂载且无匹配审稿 → `{ code: 'OH_STORY_APPLY_NO_REVIEW' }`；有审稿但哈希不匹配 → `{ code: 'OH_STORY_APPLY_STALE_REVIEW' }`；mounts 含 `canvas_node` → `{ code: 'CONTRACT_NOT_IMPLEMENTED' }`
  - 挂载行为（spec 6.1）：`current_chapter` 写 `正文/…`；`previous_chapter` 无上一章则不写、var 为空串；`outline` 写 `大纲/总纲.md`（outline_type=master）、`大纲/细纲.md`（其余 outlines）、`大纲/第{NNN}章.md`（当前/上一章的 chapter_goal、chapter_summary、conflict、ending_hook）；`characters` 写 `设定/角色/{safe(name)}.md`；`world` 写 `设定/世界观.md`；`tracking` 从 `listCommittedTrackingDocPaths` 拷贝，空则写 `追踪/伏笔.md` 与 `追踪/逐章记录/第{NNN}章.md` 最小模板（标题 + `开放项：无`）；`review_report` 写 `审稿/第{NNN}章.md`，capability=rewrite 时另写 `改稿/指令.md`（外科手术规则头 + 报告全文）；`skill_tree` / `agents` 由 Task 10 处理，本函数跳过。

- [ ] **Step 1: 写失败测试（种子数据走 novel repos 真函数）**

```ts
// ui/server/src/kernel/projection/project.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createNovelChapter, createNovelCharacter, createNovelOutline, createNovelProject,
  createNovelReview, createNovelWorldbuilding,
} from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { projectKernelSubject } from './project'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const applyContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-apply.surgical')!

async function seedWorkspace() {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
  const project = await createNovelProject(ws, { title: '怪谈世界' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '主角以超人身份进入怪谈世界。' })
  await createNovelCharacter(ws, { project_id: project.id, name: '楚弦', role: '主角', motivation: '活下去' })
  await createNovelWorldbuilding(ws, { project_id: project.id, world_summary: '规则怪谈世界观。' })
  const ch1 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章正文。\n\n猫叫了一声。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '违背规则的绝对防御', chapter_text: '第二章正文段一。\n\n段二。', chapter_goal: '立防御规则', ending_hook: '枯手伸来' })
  return { ws, project, ch1, ch2 }
}

describe('projectKernelSubject', () => {
  test('review contract projects chapter/outline/characters/world/tracking and fills vars', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars, files } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, projectDir })
    expect(vars.chapter_pad).toBe('002')
    expect(vars.chapter_title).toBe('违背规则的绝对防御')
    expect(vars.scope_files).toBe('正文/第002章_违背规则的绝对防御.md')
    expect(vars.previous_chapter_file).toBe('正文/第001章_第一章.md')
    expect(vars.report_path).toBe('审稿/第002章.md')
    expect(readFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), 'utf8')).toContain('第二章正文段一。')
    expect(existsSync(join(projectDir, '正文/第001章_第一章.md'))).toBe(true)
    expect(readFileSync(join(projectDir, '大纲/总纲.md'), 'utf8')).toContain('主角以超人身份')
    expect(readFileSync(join(projectDir, '大纲/第002章.md'), 'utf8')).toContain('立防御规则')
    expect(existsSync(join(projectDir, '设定/角色/楚弦.md'))).toBe(true)
    expect(existsSync(join(projectDir, '设定/世界观.md'))).toBe(true)
    expect(readFileSync(join(projectDir, '追踪/伏笔.md'), 'utf8')).toContain('开放项：无')
    expect(files.length).toBeGreaterThan(5)
  })

  test('chapter 1 has no previous chapter file and empty var', async () => {
    const { ws, project, ch1 } = await seedWorkspace()
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch1.id, contract: reviewContract, projectDir })
    expect(vars.previous_chapter_file).toBe('')
  })

  test('apply contract without review -> OH_STORY_APPLY_NO_REVIEW; stale hash -> OH_STORY_APPLY_STALE_REVIEW', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const dirA = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    await expect(projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir: dirA }))
      .rejects.toMatchObject({ code: 'OH_STORY_APPLY_NO_REVIEW' })
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: ch2.id, chapter_no: 2, chapter_text_hash: 'stale-hash', report_text: '## 修改建议\n- 改一处' }),
    })
    await expect(projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir: dirA }))
      .rejects.toMatchObject({ code: 'OH_STORY_APPLY_STALE_REVIEW' })
  })

  test('apply contract with matching review writes 审稿 + 改稿/指令.md and review_path var', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({
        chapter_id: ch2.id, chapter_no: 2,
        chapter_text_hash: ohStoryChapterTextHash('第二章正文段一。\n\n段二。'),
        report_text: '## 修改建议\n- 段二补动机',
      }),
    })
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir })
    expect(vars.review_path).toBe('审稿/第002章.md')
    expect(readFileSync(join(projectDir, '审稿/第002章.md'), 'utf8')).toContain('段二补动机')
    const instruction = readFileSync(join(projectDir, '改稿/指令.md'), 'utf8')
    expect(instruction).toContain('禁止整章重写')
    expect(instruction).toContain('段二补动机')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/project.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/projection/project.ts
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  getNovelChapter, listNovelChapters, listNovelCharacters, listNovelOutlines,
  listNovelReviewsByType, listNovelWorldbuilding,
} from '../../novel'
import {
  latestOhStoryReviewForChapter, ohStoryReviewMatchesChapterText, parseOhStoryReviewPayload,
} from '../../novel-writing/oh-story-core/review-match'
import type { KernelContract } from '../contracts/schema'
import { listCommittedTrackingDocPaths } from '../db'
import type { KernelPromptVars } from '../template'
import { chapterRelPath, padChapterNo, safeChapterTitle } from './naming'

export type ProjectKernelSubjectInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  projectDir: string
}

function writeProjected(projectDir: string, relPath: string, content: string, files: string[]) {
  const target = join(projectDir, relPath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  files.push(relPath)
}

const SURGICAL_HEADER = [
  '# 改稿指令',
  '',
  '只落实下方审稿报告中的可执行「修改建议」。',
  '禁止整章重写、禁止风格通篇抛光、禁止改动与建议无关的段落。',
  '',
  '---',
  '',
].join('\n')

export async function projectKernelSubject(input: ProjectKernelSubjectInput): Promise<{ vars: KernelPromptVars; files: string[] }> {
  const { workspace, projectId, chapterId, contract, projectDir } = input
  const mounts = contract.projection.mounts
  if (mounts.includes('canvas_node')) {
    throw Object.assign(new Error('canvas_node projection is not implemented'), { code: 'CONTRACT_NOT_IMPLEMENTED' })
  }
  const chapter = await getNovelChapter(workspace, chapterId, projectId)
  if (!chapter) throw Object.assign(new Error('chapter not found'), { code: 'CHAPTER_NOT_FOUND' })

  const files: string[] = []
  const pad = padChapterNo(Number(chapter.chapter_no))
  const currentRel = chapterRelPath(Number(chapter.chapter_no), String(chapter.title || ''))
  let previousRel = ''
  const chapters = await listNovelChapters(workspace, projectId)
  const previous = chapters
    .filter((item: any) => Number(item.chapter_no) < Number(chapter.chapter_no))
    .sort((a: any, b: any) => Number(b.chapter_no) - Number(a.chapter_no))[0]

  if (mounts.includes('current_chapter')) {
    writeProjected(projectDir, currentRel, String(chapter.chapter_text || ''), files)
  }
  if (mounts.includes('previous_chapter') && previous) {
    previousRel = chapterRelPath(Number(previous.chapter_no), String(previous.title || ''))
    writeProjected(projectDir, previousRel, String(previous.chapter_text || ''), files)
  }
  if (mounts.includes('outline')) {
    const outlines = await listNovelOutlines(workspace, projectId)
    const master = outlines.filter((o: any) => String(o.outline_type || 'master') === 'master')
    const detail = outlines.filter((o: any) => String(o.outline_type || 'master') !== 'master')
    const renderOutline = (rows: any[]) => rows.map(o => `# ${o.title}\n\n${String(o.summary || '')}`.trim()).join('\n\n---\n\n') || '（空）'
    writeProjected(projectDir, '大纲/总纲.md', renderOutline(master), files)
    writeProjected(projectDir, '大纲/细纲.md', renderOutline(detail), files)
    const chapterCard = (row: any) => [
      `# 第${padChapterNo(Number(row.chapter_no))}章 ${String(row.title || '')}`,
      `目标：${String(row.chapter_goal || '')}`,
      `概要：${String(row.chapter_summary || '')}`,
      `冲突：${String(row.conflict || '')}`,
      `章末钩子：${String(row.ending_hook || '')}`,
    ].join('\n')
    writeProjected(projectDir, `大纲/第${pad}章.md`, chapterCard(chapter), files)
    if (previous) writeProjected(projectDir, `大纲/第${padChapterNo(Number(previous.chapter_no))}章.md`, chapterCard(previous), files)
  }
  if (mounts.includes('characters')) {
    for (const character of await listNovelCharacters(workspace, projectId)) {
      const body = [
        `# ${character.name}`,
        `定位：${String(character.role || '')}`,
        `动机：${String(character.motivation || '')}`,
        `目标：${String(character.goal || '')}`,
        `背景：${String(character.backstory || '')}`,
      ].join('\n')
      writeProjected(projectDir, `设定/角色/${safeChapterTitle(String(character.name || ''))}.md`, body, files)
    }
  }
  if (mounts.includes('world')) {
    const worlds = await listNovelWorldbuilding(workspace, projectId)
    const body = worlds.map((w: any) => String(w.world_summary || '')).filter(Boolean).join('\n\n') || '（空）'
    writeProjected(projectDir, '设定/世界观.md', body, files)
  }
  if (mounts.includes('tracking')) {
    const docs = listCommittedTrackingDocPaths(workspace, projectId)
    if (docs.length) {
      for (const doc of docs) {
        const target = join(projectDir, doc.rel_path)
        if (existsSync(doc.vault_path) && !existsSync(target)) {
          mkdirSync(dirname(target), { recursive: true })
          copyFileSync(doc.vault_path, target)
          files.push(doc.rel_path)
        }
      }
    }
    if (!files.some(f => f === '追踪/伏笔.md')) {
      writeProjected(projectDir, '追踪/伏笔.md', '# 伏笔\n\n开放项：无\n', files)
    }
    if (!files.some(f => f.startsWith('追踪/逐章记录/'))) {
      writeProjected(projectDir, `追踪/逐章记录/第${pad}章.md`, `# 第${pad}章 逐章记录\n\n开放项：无\n`, files)
    }
  }

  let reviewPath = ''
  if (mounts.includes('review_report')) {
    const reviews = await listNovelReviewsByType(workspace, projectId, 'oh_story_review')
    const review = latestOhStoryReviewForChapter(reviews, chapterId)
    if (!review) throw Object.assign(new Error('先对本稿重新审稿'), { code: 'OH_STORY_APPLY_NO_REVIEW' })
    if (!ohStoryReviewMatchesChapterText(review, String(chapter.chapter_text || ''))) {
      throw Object.assign(new Error('先对本稿重新审稿'), { code: 'OH_STORY_APPLY_STALE_REVIEW' })
    }
    const reportText = String(parseOhStoryReviewPayload(review).report_text || '')
    reviewPath = `审稿/第${pad}章.md`
    writeProjected(projectDir, reviewPath, reportText, files)
    if (contract.capability === 'rewrite') {
      writeProjected(projectDir, '改稿/指令.md', SURGICAL_HEADER + reportText, files)
    }
  }

  const vars: KernelPromptVars = {
    scope_files: currentRel,
    chapter_no: String(chapter.chapter_no),
    chapter_pad: pad,
    chapter_title: String(chapter.title || ''),
    previous_chapter_file: previousRel,
    report_path: `审稿/第${pad}章.md`,
    review_path: reviewPath,
    skill_name: contract.skill_name,
  }
  return { vars, files }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/project.test.ts`
Expected: PASS（4 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/projection/project.ts ui/server/src/kernel/projection/project.test.ts
git commit -m "feat(kernel): project novel subject from sqlite into job dir"
```

---

### Task 9: agents bundle —— 安装管线扩展与仓库兜底模板

**Files:**
- Create: `ui/server/src/kernel/agents-fallback/story-architect.toml`（从锁定归档拷贝）
- Create: `ui/server/src/kernel/agents-fallback/character-designer.toml`
- Create: `ui/server/src/kernel/agents-fallback/narrative-writer.toml`
- Create: `ui/server/src/kernel/agents-fallback/consistency-checker.toml`
- Modify: `ui/server/src/novel-writing/oh-story-core/install.ts`（`installOhStoryCoreSuite` 内、写 pack.json 之前）
- Modify: `ui/server/src/novel-writing/oh-story-core/store.ts`（`loadOhStoryCoreSuite` 读出 agents 信息）
- Test: `ui/server/src/novel-writing/oh-story-core/install.agents.test.ts`

**Interfaces:**
- Produces:
  - 安装后磁盘：`{ws}/.mangaforge/oh-story-core/agents/codex/{4}.toml`、`{ws}/.mangaforge/oh-story-core/agent-references/**`（来自归档 `skills/story-setup/references/agent-references/`）、pack.json 增加 `"agents": ["story-architect", ...]` 与 `"agents_version": 25`
  - `ohStoryCoreAgentsDir(workspace: string): string`（store.ts 导出，= `{root}/agents/codex`）
  - `ohStoryCoreAgentReferencesDir(workspace: string): string`
  - `OH_STORY_REVIEWER_AGENTS: readonly string[]` = `['story-architect', 'character-designer', 'narrative-writer', 'consistency-checker']`（store.ts 导出）
  - `loadOhStoryCoreSuite` 返回值增加 `agents_version?: number`
- 归档内路径事实（锁定 revision `546101ee…`）：agents toml 在 `skills/story-setup/references/codex/agents/`；`agents_version` 用正则 `/agents_version:\s*(\d+)/` 解析 `skills/story-setup/SKILL.md`。归档 zip 的 entry 前缀是 `oh-story-claudecode-{revision}/`，复用 install.ts 既有的 entry 遍历与安全解压逻辑（`archiveEntryType`、大小上限常量）。

- [ ] **Step 1: 落库兜底模板（shell，一次性）**

```bash
cd /tmp && curl -sL -o ohstory-agents.zip "https://codeload.github.com/worldwonderer/oh-story-claudecode/zip/546101ee259cec1791546c1124a5ccafa56d2f04" && unzip -o -q ohstory-agents.zip 'oh-story-claudecode-*/skills/story-setup/references/codex/agents/*'
mkdir -p /Users/ruiyaosong/MangaForge-Studio/ui/server/src/kernel/agents-fallback
for name in story-architect character-designer narrative-writer consistency-checker; do
  cp "/tmp/oh-story-claudecode-546101ee259cec1791546c1124a5ccafa56d2f04/skills/story-setup/references/codex/agents/$name.toml" "/Users/ruiyaosong/MangaForge-Studio/ui/server/src/kernel/agents-fallback/$name.toml"
done
ls /Users/ruiyaosong/MangaForge-Studio/ui/server/src/kernel/agents-fallback/
```

Expected: 列出四个 toml；每个文件含 `name = `、`description = `、`developer_instructions = ` 字段（人工抽查一个）。

- [ ] **Step 2: 写失败测试**

```ts
// ui/server/src/novel-writing/oh-story-core/install.agents.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { installOhStoryCoreSuite } from './install'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from './store'

async function fakeArchive(): Promise<Uint8Array> {
  const zip = new JSZip()
  const root = 'oh-story-claudecode-546101ee259cec1791546c1124a5ccafa56d2f04'
  for (const skill of ['story-review', 'story-deslop', 'story-long-write']) {
    zip.file(`${root}/skills/${skill}/SKILL.md`, `---\nname: ${skill}\n---\n# ${skill}`)
  }
  zip.file(`${root}/skills/story-setup/SKILL.md`, '# setup\n\nagents_version: 25\n')
  for (const agent of ['story-architect', 'character-designer', 'narrative-writer', 'consistency-checker']) {
    zip.file(`${root}/skills/story-setup/references/codex/agents/${agent}.toml`, `name = "${agent}"\ndescription = """d"""\ndeveloper_instructions = """i"""\n`)
  }
  zip.file(`${root}/skills/story-setup/references/agent-references/anti-ai-writing.md`, '# ref')
  return await zip.generateAsync({ type: 'uint8array' })
}

describe('install agents bundle', () => {
  test('install extracts reviewer toml, agent references and agents_version', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'ohstory-install-'))
    const bytes = await fakeArchive()
    await installOhStoryCoreSuite(ws, {
      fetchImpl: (async () => new Response(bytes.buffer as ArrayBuffer, { status: 200 })) as any,
    })
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      expect(existsSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`))).toBe(true)
    }
    expect(existsSync(join(ohStoryCoreRoot(ws), 'agent-references', 'anti-ai-writing.md'))).toBe(true)
    const pack = JSON.parse(readFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), 'utf8'))
    expect(pack.agents_version).toBe(25)
    expect(pack.agents).toEqual([...OH_STORY_REVIEWER_AGENTS])
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/oh-story-core/install.agents.test.ts`
Expected: FAIL（`ohStoryCoreAgentsDir` / `OH_STORY_REVIEWER_AGENTS` 不存在，或 pack.json 无 agents 字段）

- [ ] **Step 4: 实现**

`store.ts` 增加（放在 `ohStoryCoreRoot` 之后）：

```ts
export const OH_STORY_REVIEWER_AGENTS = ['story-architect', 'character-designer', 'narrative-writer', 'consistency-checker'] as const

export function ohStoryCoreAgentsDir(workspace: string) {
  return join(ohStoryCoreRoot(workspace), 'agents', 'codex')
}

export function ohStoryCoreAgentReferencesDir(workspace: string) {
  return join(ohStoryCoreRoot(workspace), 'agent-references')
}
```

`install.ts` 在解包循环里追加两类 entry 的提取（跟既有 skills 提取同层实现；路径判断用归档去前缀后的名字）：

```ts
// 归档内路径常量（与 skills 提取逻辑并列）：
const SETUP_CODEX_AGENTS_PREFIX = 'skills/story-setup/references/codex/agents/'
const SETUP_AGENT_REFERENCES_PREFIX = 'skills/story-setup/references/agent-references/'
const SETUP_SKILL_MD = 'skills/story-setup/SKILL.md'

// 循环内：name 为去掉 zip 根前缀后的相对路径，bytes 为该 entry 内容
if (name.startsWith(SETUP_CODEX_AGENTS_PREFIX) && name.endsWith('.toml')) {
  const agentFile = name.slice(SETUP_CODEX_AGENTS_PREFIX.length)
  const agentName = agentFile.replace(/\.toml$/, '')
  if ((OH_STORY_REVIEWER_AGENTS as readonly string[]).includes(agentName)) {
    const target = join(ohStoryCoreAgentsDir(workspace), agentFile)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, bytes)
    installedAgents.push(agentName)
  }
}
if (name.startsWith(SETUP_AGENT_REFERENCES_PREFIX) && !name.endsWith('/')) {
  const target = join(ohStoryCoreAgentReferencesDir(workspace), name.slice(SETUP_AGENT_REFERENCES_PREFIX.length))
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, bytes)
}
if (name === SETUP_SKILL_MD) {
  const match = new TextDecoder().decode(bytes).match(/agents_version:\s*(\d+)/)
  if (match) agentsVersion = Number(match[1])
}
```

pack.json 写出处追加字段：`agents: [...OH_STORY_REVIEWER_AGENTS].filter(name => installedAgents.includes(name))`（保持语义序，与测试期望一致）、`agents_version: agentsVersion ?? 0`。`loadOhStoryCoreSuite` 读 pack.json 时透传 `agents_version`（缺省 undefined）。变量 `installedAgents: string[]` 与 `agentsVersion: number | undefined` 在函数开头声明。落地时按 install.ts 实际的解压循环变量名对齐（entry 名、字节获取方式以现有代码为准，安全检查——路径穿越、大小上限——复用现有实现，不得绕过）。

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/novel-writing/oh-story-core/install.agents.test.ts src/novel-writing/oh-story-core/`
Expected: 新测试 PASS，且既有 install/store 测试全部仍 PASS

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/kernel/agents-fallback/ ui/server/src/novel-writing/oh-story-core/install.ts ui/server/src/novel-writing/oh-story-core/store.ts ui/server/src/novel-writing/oh-story-core/install.agents.test.ts
git commit -m "feat(oh-story): install codex reviewer agents bundle and agent references"
```

---

### Task 10: Pack 挂载（skill_tree 符号链接 + agents 部署）

**Files:**
- Create: `ui/server/src/kernel/projection/pack-mounts.ts`
- Test: `ui/server/src/kernel/projection/pack-mounts.test.ts`

**Interfaces:**
- Consumes: `ohStoryCoreRoot` / `ohStoryCoreAgentsDir` / `ohStoryCoreAgentReferencesDir` / `OH_STORY_REVIEWER_AGENTS` / `loadOhStoryCoreSuite`（`../../novel-writing/oh-story-core/store`）。
- Produces:
  - `deployKernelPackMounts(input: { workspace: string; projectDir: string; skillName: string; mounts: readonly string[] }): { skillPath: string | null; missingReviewers: string[]; deployedAgents: string[] }`
  - `skill_tree`：`{projectDir}/.agents/skills/{skillName}` → symlink 到 `{ws}/.mangaforge/oh-story-core/skills/{skillName}`；skill 目录不存在 → `skillPath: null`
  - `agents`：拷贝 `agents/codex/*.toml`（缺的用 `kernel/agents-fallback/*.toml` 兜底）到 `{projectDir}/.codex/agents/`；写 `.story-deployed`（`agents_version: {n}`、`target_cli: codex`、`resolver_strategy: kernel-projection`、`references_dir: .codex/skills/story-setup/references/agent-references`）；agent-references 拷到 `{projectDir}/.codex/skills/story-setup/references/agent-references/`；四个 reviewer 缺任一（pack 与 fallback 都没有）→ 出现在 `missingReviewers`

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/projection/pack-mounts.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from '../../novel-writing/oh-story-core/store'
import { deployKernelPackMounts } from './pack-mounts'

function seedPack(ws: string, opts: { agents?: readonly string[] } = {}) {
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({ revision: 'r', skills: ['story-review'], agents_version: 25 }))
  for (const agent of opts.agents ?? OH_STORY_REVIEWER_AGENTS) {
    mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
    writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  }
}

describe('deployKernelPackMounts', () => {
  test('symlinks skill and deploys four reviewer toml + .story-deployed', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    seedPack(ws)
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['skill_tree', 'agents'] })
    expect(result.missingReviewers).toEqual([])
    const link = join(projectDir, '.agents', 'skills', 'story-review')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readlinkSync(link)).toBe(join(ohStoryCoreRoot(ws), 'skills', 'story-review'))
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      expect(existsSync(join(projectDir, '.codex', 'agents', `${agent}.toml`))).toBe(true)
    }
    const sentinel = readFileSync(join(projectDir, '.story-deployed'), 'utf8')
    expect(sentinel).toContain('agents_version: 25')
    expect(sentinel).toContain('target_cli: codex')
  })

  test('pack missing toml falls back to repo templates', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    seedPack(ws, { agents: ['story-architect'] })
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['agents'] })
    expect(result.missingReviewers).toEqual([])
    const fallbackToml = readFileSync(join(projectDir, '.codex', 'agents', 'narrative-writer.toml'), 'utf8')
    expect(fallbackToml).toContain('name = "narrative-writer"')
  })

  test('missing skill dir reports null skillPath', () => {
    const ws = mkdtempSync(join(tmpdir(), 'pack-mounts-'))
    const projectDir = mkdtempSync(join(tmpdir(), 'pack-mounts-dir-'))
    const result = deployKernelPackMounts({ workspace: ws, projectDir, skillName: 'story-review', mounts: ['skill_tree'] })
    expect(result.skillPath).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/pack-mounts.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/projection/pack-mounts.ts
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentReferencesDir, ohStoryCoreAgentsDir, ohStoryCoreRoot,
} from '../../novel-writing/oh-story-core/store'

const FALLBACK_AGENTS_DIR = join(import.meta.dir, '..', 'agents-fallback')

export type DeployKernelPackMountsInput = {
  workspace: string
  projectDir: string
  skillName: string
  mounts: readonly string[]
}

function packAgentsVersion(workspace: string): number {
  try {
    const pack = JSON.parse(readFileSync(join(ohStoryCoreRoot(workspace), 'pack.json'), 'utf8'))
    return Number(pack?.agents_version) || 0
  } catch {
    return 0
  }
}

export function deployKernelPackMounts(input: DeployKernelPackMountsInput): {
  skillPath: string | null
  missingReviewers: string[]
  deployedAgents: string[]
} {
  const { workspace, projectDir, skillName, mounts } = input
  let skillPath: string | null = null
  const missingReviewers: string[] = []
  const deployedAgents: string[] = []

  if (mounts.includes('skill_tree') && skillName) {
    const source = join(ohStoryCoreRoot(workspace), 'skills', skillName)
    if (existsSync(join(source, 'SKILL.md'))) {
      const link = join(projectDir, '.agents', 'skills', skillName)
      mkdirSync(dirname(link), { recursive: true })
      if (!existsSync(link)) symlinkSync(source, link)
      skillPath = link
    }
  }

  if (mounts.includes('agents')) {
    const targetDir = join(projectDir, '.codex', 'agents')
    mkdirSync(targetDir, { recursive: true })
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      const fromPack = join(ohStoryCoreAgentsDir(workspace), `${agent}.toml`)
      const fromFallback = join(FALLBACK_AGENTS_DIR, `${agent}.toml`)
      const source = existsSync(fromPack) ? fromPack : existsSync(fromFallback) ? fromFallback : null
      if (!source) { missingReviewers.push(agent); continue }
      copyFileSync(source, join(targetDir, `${agent}.toml`))
      deployedAgents.push(agent)
    }
    const referencesSource = ohStoryCoreAgentReferencesDir(workspace)
    if (existsSync(referencesSource)) {
      cpSync(referencesSource, join(projectDir, '.codex', 'skills', 'story-setup', 'references', 'agent-references'), { recursive: true })
    }
    writeFileSync(join(projectDir, '.story-deployed'), [
      `agents_version: ${packAgentsVersion(workspace)}`,
      'target_cli: codex',
      'resolver_strategy: kernel-projection',
      'references_dir: .codex/skills/story-setup/references/agent-references',
      '',
    ].join('\n'))
  }

  return { skillPath, missingReviewers, deployedAgents }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/pack-mounts.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/projection/pack-mounts.ts ui/server/src/kernel/projection/pack-mounts.test.ts
git commit -m "feat(kernel): deploy skill symlink and codex reviewer agents into projection"
```

---

### Task 11: 快照与收回

**Files:**
- Create: `ui/server/src/kernel/projection/snapshot.ts`
- Test: `ui/server/src/kernel/projection/snapshot.test.ts`

**Interfaces:**
- Consumes: `renderKernelTemplate` / `KernelPromptVars`（`../template`）、`KernelContract`（`../contracts/schema`）。
- Produces:
  - `writeKernelSnapshot(projectDir: string, snapshotDir: string): Record<string, string>`（递归遍历普通文件，算 sha256，写 `snapshot/manifest.json` 并返回；跳过符号链接目录 `.agents/`）
  - `type HarvestedArtifact = { rel_path: string; artifact_kind: string; sha256: string; byte_size: number; copied_path: string }`
  - `harvestKernelArtifacts(input: { projectDir: string; artifactsDir: string; manifest: Record<string, string>; contract: KernelContract; vars: KernelPromptVars }): { artifacts: HarvestedArtifact[]; warnings: Array<{ warning: 'write_outside_scope'; rel_path: string }>; missingRequired: string[] }`
  - 规则（spec 6.2）：只看「相对 manifest 新增或哈希变化」的文件；`ignore` 前缀 → 跳过；`write_scope` 外 → warning 不收；范围内匹配 output glob（渲染变量后，`*` 通配单段）→ 按 kind 收；范围内未匹配 → `attachment`；`required` 的 output 没有任何命中（含「章文件存在但未变化」的情况）→ 进 `missingRequired`（glob 渲染后字符串）。收取时把文件拷到 `artifactsDir/{rel_path}`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/projection/snapshot.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import type { KernelPromptVars } from '../template'
import { harvestKernelArtifacts, writeKernelSnapshot } from './snapshot'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const deslopContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-deslop.file')!

const vars: KernelPromptVars = {
  scope_files: '正文/第002章_违背规则的绝对防御.md',
  chapter_no: '2', chapter_pad: '002', chapter_title: '违背规则的绝对防御',
  previous_chapter_file: '', report_path: '审稿/第002章.md', review_path: '', skill_name: 'story-review',
}

function seedProject() {
  const projectDir = mkdtempSync(join(tmpdir(), 'harvest-proj-'))
  mkdirSync(join(projectDir, '正文'), { recursive: true })
  writeFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), '原文段一。\n\n段二。')
  return projectDir
}

describe('snapshot & harvest', () => {
  test('review run collects report as review_report, tracking as tracking_doc, scope violations warn', () => {
    const projectDir = seedProject()
    const snapshotDir = mkdtempSync(join(tmpdir(), 'harvest-snap-'))
    const manifest = writeKernelSnapshot(projectDir, snapshotDir)
    mkdirSync(join(projectDir, '审稿'), { recursive: true })
    writeFileSync(join(projectDir, '审稿/第002章.md'), 'Fallback: none\n报告正文')
    mkdirSync(join(projectDir, '追踪/逐章记录'), { recursive: true })
    writeFileSync(join(projectDir, '追踪/逐章记录/第002章.md'), '# 记录')
    mkdirSync(join(projectDir, '.story-review'), { recursive: true })
    writeFileSync(join(projectDir, '.story-review/state.md'), 'state')
    writeFileSync(join(projectDir, '越界.md'), 'x')
    const artifactsDir = mkdtempSync(join(tmpdir(), 'harvest-art-'))
    const result = harvestKernelArtifacts({ projectDir, artifactsDir, manifest, contract: reviewContract, vars })
    const kinds = Object.fromEntries(result.artifacts.map(a => [a.rel_path, a.artifact_kind]))
    expect(kinds['审稿/第002章.md']).toBe('review_report')
    expect(kinds['追踪/逐章记录/第002章.md']).toBe('tracking_doc')
    expect(result.artifacts.some(a => a.rel_path.startsWith('.story-review/'))).toBe(false)
    expect(result.warnings).toEqual([{ warning: 'write_outside_scope', rel_path: '越界.md' }])
    expect(result.missingRequired).toEqual([])
  })

  test('required report missing -> missingRequired lists rendered glob', () => {
    const projectDir = seedProject()
    const manifest = writeKernelSnapshot(projectDir, mkdtempSync(join(tmpdir(), 'harvest-snap-')))
    const result = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: reviewContract, vars })
    expect(result.missingRequired).toEqual(['审稿/第002章.md'])
  })

  test('rewrite run with unchanged chapter file -> missingRequired (防空跑入库)', () => {
    const projectDir = seedProject()
    const manifest = writeKernelSnapshot(projectDir, mkdtempSync(join(tmpdir(), 'harvest-snap-')))
    const untouched = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: deslopContract, vars })
    expect(untouched.missingRequired).toEqual(['正文/第002章_*.md'])
    writeFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), '润色后段一。\n\n段二。')
    const changed = harvestKernelArtifacts({ projectDir, artifactsDir: mkdtempSync(join(tmpdir(), 'harvest-art-')), manifest, contract: deslopContract, vars })
    expect(changed.missingRequired).toEqual([])
    expect(changed.artifacts[0].artifact_kind).toBe('chapter_text')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/snapshot.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/projection/snapshot.ts
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, lstatSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { KernelContract } from '../contracts/schema'
import { renderKernelTemplate, type KernelPromptVars } from '../template'

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function walkFiles(root: string, dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = lstatSync(full)
    if (stats.isSymbolicLink()) continue
    if (stats.isDirectory()) walkFiles(root, full, out)
    else if (stats.isFile()) out.push(relative(root, full))
  }
}

export function writeKernelSnapshot(projectDir: string, snapshotDir: string): Record<string, string> {
  const relPaths: string[] = []
  walkFiles(projectDir, projectDir, relPaths)
  const manifest: Record<string, string> = {}
  for (const relPath of relPaths.sort()) {
    manifest[relPath] = sha256(readFileSync(join(projectDir, relPath)))
  }
  mkdirSync(snapshotDir, { recursive: true })
  writeFileSync(join(snapshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '(?:.+/)?')
    .replace(/\*\*/g, '.+')
    .replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

export type HarvestedArtifact = {
  rel_path: string
  artifact_kind: string
  sha256: string
  byte_size: number
  copied_path: string
}

export function harvestKernelArtifacts(input: {
  projectDir: string
  artifactsDir: string
  manifest: Record<string, string>
  contract: KernelContract
  vars: KernelPromptVars
}): {
  artifacts: HarvestedArtifact[]
  warnings: Array<{ warning: 'write_outside_scope'; rel_path: string }>
  missingRequired: string[]
} {
  const { projectDir, artifactsDir, manifest, contract, vars } = input
  const writeScope = contract.write_scope.map(prefix => renderKernelTemplate(prefix, vars))
  const ignore = (contract.ignore || []).map(prefix => renderKernelTemplate(prefix, vars))
  const outputs = contract.outputs.map(output => ({
    ...output,
    renderedGlob: renderKernelTemplate(output.glob, vars),
    pattern: globToRegExp(renderKernelTemplate(output.glob, vars)),
    hits: 0,
  }))

  const relPaths: string[] = []
  walkFiles(projectDir, projectDir, relPaths)

  const artifacts: HarvestedArtifact[] = []
  const warnings: Array<{ warning: 'write_outside_scope'; rel_path: string }> = []

  for (const relPath of relPaths.sort()) {
    const bytes = readFileSync(join(projectDir, relPath))
    const digest = sha256(bytes)
    if (manifest[relPath] === digest) continue
    if (ignore.some(prefix => relPath.startsWith(prefix))) continue
    if (!writeScope.some(prefix => relPath.startsWith(prefix))) {
      warnings.push({ warning: 'write_outside_scope', rel_path: relPath })
      continue
    }
    const output = outputs.find(candidate => candidate.pattern.test(relPath))
    if (output) output.hits += 1
    const copied = join(artifactsDir, relPath)
    mkdirSync(dirname(copied), { recursive: true })
    copyFileSync(join(projectDir, relPath), copied)
    artifacts.push({
      rel_path: relPath,
      artifact_kind: output ? output.artifact_kind : 'attachment',
      sha256: digest,
      byte_size: bytes.byteLength,
      copied_path: copied,
    })
  }

  const missingRequired = outputs.filter(output => output.required && output.hits === 0).map(output => output.renderedGlob)
  return { artifacts, warnings, missingRequired }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/projection/snapshot.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/projection/snapshot.ts ui/server/src/kernel/projection/snapshot.test.ts
git commit -m "feat(kernel): snapshot manifest and artifact harvest with scope rules"
```

---

### Task 12: 供应商翻译（隔离 config.toml）

**Files:**
- Create: `ui/server/src/kernel/providers/translate.ts`
- Test: `ui/server/src/kernel/providers/translate.test.ts`

**Interfaces:**
- Consumes: `readProviders`（`../../provider-store`）、`readModels`（`../../model-store`）、`ProviderRecord` / `ModelRecord` 类型（同文件）。
- Produces:
  - `buildCodexConfigToml(input: { provider: { id: string; api_format: string; default_base_url: string; custom_headers?: Record<string, string> }; model: { model_name: string }; agents: Array<{ name: string; configFile: string }>; supportsChatWireApi: boolean }): { ok: true; toml: string } | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED'; message: string }`
  - `writeCodexHome(input: { workspace: string; jobDir: string; modelId: number; agents: Array<{ name: string; configFile: string }>; supportsChatWireApi: boolean }): Promise<{ ok: true; configPath: string; providerId: string } | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED' | 'CONTRACT_INVALID'; message: string }>`（查 model→provider，生成并写 `{jobDir}/codex-home/config.toml`）
  - toml 固定包含：`model`、`model_provider`、`[model_providers.{id}]`（`name`/`base_url`/`env_key = "MANGAFORGE_CODEX_KEY"`/`wire_api`/可选 `[model_providers.{id}.http_headers]`）、每个 agent 一段 `[agents.{name}]`（`description`/`config_file`）、`[memories]` 两个 false。key 值不写入。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/providers/translate.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildCodexConfigToml, writeCodexHome } from './translate'

const agents = [
  { name: 'story-architect', configFile: '/proj/.codex/agents/story-architect.toml' },
  { name: 'consistency-checker', configFile: '/proj/.codex/agents/consistency-checker.toml' },
]

describe('buildCodexConfigToml', () => {
  test('codex_responses -> wire_api responses with headers, agents, memories off', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'jun', api_format: 'codex_responses', default_base_url: 'https://muyuan.do/v1', custom_headers: { 'User-Agent': 'Codex Desktop/0.142.0' } },
      model: { model_name: 'gpt-5.2' },
      agents, supportsChatWireApi: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.toml).toContain('model = "gpt-5.2"')
    expect(result.toml).toContain('model_provider = "jun"')
    expect(result.toml).toContain('wire_api = "responses"')
    expect(result.toml).toContain('env_key = "MANGAFORGE_CODEX_KEY"')
    expect(result.toml).toContain('[model_providers.jun.http_headers]')
    expect(result.toml).toContain('"User-Agent" = "Codex Desktop/0.142.0"')
    expect(result.toml).toContain('[agents.story-architect]')
    expect(result.toml).toContain('config_file = "/proj/.codex/agents/story-architect.toml"')
    expect(result.toml).toContain('generate_memories = false')
    expect(result.toml).toContain('use_memories = false')
  })

  test('openai_compatible without chat support -> PROVIDER_TRANSLATE_FAILED', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://goai.example/v1' },
      model: { model_name: 'gemini-3.5-flash' }, agents, supportsChatWireApi: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error_code).toBe('PROVIDER_TRANSLATE_FAILED')
  })

  test('openai_compatible with pinned chat support -> wire_api chat', () => {
    const result = buildCodexConfigToml({
      provider: { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://goai.example/v1' },
      model: { model_name: 'gemini-3.5-flash' }, agents, supportsChatWireApi: true,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.toml).toContain('wire_api = "chat"')
  })
})

describe('writeCodexHome', () => {
  test('resolves model->provider from workspace stores and writes config.toml', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'translate-ws-'))
    writeFileSync(join(ws, 'providers.json'), JSON.stringify([
      { id: 'any', display_name: 'anyrouter', service_type: 'llm', api_format: 'codex_responses', auth_type: 'bearer', response_mode: 'stream', supported_modalities: ['chat'], default_base_url: 'https://anyrouter.top/v1', is_active: true, icon: '', endpoints: {}, custom_headers: {} },
    ]))
    writeFileSync(join(ws, 'models.json'), JSON.stringify([
      { id: 217, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2', capabilities: { chat: true }, health_status: 'healthy' },
    ]))
    const jobDir = mkdtempSync(join(tmpdir(), 'translate-job-'))
    const result = await writeCodexHome({ workspace: ws, jobDir, modelId: 217, agents, supportsChatWireApi: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.providerId).toBe('any')
    expect(existsSync(result.configPath)).toBe(true)
    expect(readFileSync(result.configPath, 'utf8')).toContain('model_provider = "any"')
  })

  test('unknown model id -> CONTRACT_INVALID error shape', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'translate-ws-'))
    writeFileSync(join(ws, 'providers.json'), '[]')
    writeFileSync(join(ws, 'models.json'), '[]')
    const result = await writeCodexHome({ workspace: ws, jobDir: mkdtempSync(join(tmpdir(), 'translate-job-')), modelId: 999, agents: [], supportsChatWireApi: false })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/providers/translate.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/providers/translate.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'

const ENV_KEY_NAME = 'MANGAFORGE_CODEX_KEY'

function tomlString(value: string): string {
  return JSON.stringify(String(value ?? ''))
}

export function buildCodexConfigToml(input: {
  provider: { id: string; api_format: string; default_base_url: string; custom_headers?: Record<string, string> }
  model: { model_name: string }
  agents: Array<{ name: string; configFile: string }>
  supportsChatWireApi: boolean
}): { ok: true; toml: string } | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED'; message: string } {
  const { provider, model, agents, supportsChatWireApi } = input
  let wireApi: 'responses' | 'chat'
  if (provider.api_format === 'codex_responses') wireApi = 'responses'
  else if (provider.api_format === 'openai_compatible') {
    if (!supportsChatWireApi) {
      return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${provider.id} needs wire_api="chat" but the pinned codex release does not support it` }
    }
    wireApi = 'chat'
  } else {
    return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `unsupported api_format: ${provider.api_format}` }
  }

  const lines: string[] = [
    `model = ${tomlString(model.model_name)}`,
    `model_provider = ${tomlString(provider.id)}`,
    '',
    `[model_providers.${provider.id}]`,
    `name = ${tomlString(provider.id)}`,
    `base_url = ${tomlString(provider.default_base_url)}`,
    `env_key = ${tomlString(ENV_KEY_NAME)}`,
    `wire_api = ${tomlString(wireApi)}`,
  ]
  const headers = Object.entries(provider.custom_headers || {})
  if (headers.length) {
    lines.push('', `[model_providers.${provider.id}.http_headers]`)
    for (const [key, value] of headers) lines.push(`${tomlString(key)} = ${tomlString(value)}`)
  }
  for (const agent of input.agents) {
    lines.push('', `[agents.${agent.name}]`, `description = ${tomlString(`oh-story reviewer role ${agent.name}`)}`, `config_file = ${tomlString(agent.configFile)}`)
  }
  lines.push('', '[memories]', 'generate_memories = false', 'use_memories = false', '')
  return { ok: true, toml: lines.join('\n') }
}

export async function writeCodexHome(input: {
  workspace: string
  jobDir: string
  modelId: number
  agents: Array<{ name: string; configFile: string }>
  supportsChatWireApi: boolean
}): Promise<
  | { ok: true; configPath: string; providerId: string }
  | { ok: false; error_code: 'PROVIDER_TRANSLATE_FAILED' | 'CONTRACT_INVALID'; message: string }
> {
  const models = await readModels(input.workspace)
  const model = models.find((item: any) => Number(item.id) === Number(input.modelId))
  if (!model) return { ok: false, error_code: 'CONTRACT_INVALID', message: `model ${input.modelId} not found` }
  const providers = await readProviders(input.workspace)
  const provider = providers.find((item: any) => String(item.id) === String((model as any).provider))
  if (!provider) return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${(model as any).provider} not found` }
  const built = buildCodexConfigToml({
    provider: provider as any,
    model: { model_name: String((model as any).model_name || '') },
    agents: input.agents,
    supportsChatWireApi: input.supportsChatWireApi,
  })
  if (!built.ok) return built
  const homeDir = join(input.jobDir, 'codex-home')
  mkdirSync(homeDir, { recursive: true })
  const configPath = join(homeDir, 'config.toml')
  writeFileSync(configPath, built.toml)
  return { ok: true, configPath, providerId: String((provider as any).id) }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/providers/translate.test.ts`
Expected: PASS（5 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/providers/translate.ts ui/server/src/kernel/providers/translate.test.ts
git commit -m "feat(kernel): translate providers.json into isolated codex config.toml"
```

---

### Task 13: 运行时探针 ①②⑤ 与探针路由

**Files:**
- Create: `ui/server/src/kernel/probe.ts`
- Modify: `ui/server/src/routes/kernel-routes.ts`（追加两个路由）
- Test: `ui/server/src/kernel/probe.test.ts`
- Test: `ui/server/src/routes/kernel-routes.test.ts`（追加两个用例）

**Interfaces:**
- Consumes: `loadKernelRuntime` / `checkKernelBinary`（`./runtime`）、`buildCodexConfigToml`（`./providers/translate`）、`readProviders` / `readModels`、`kernelProbePath`（`./paths`）。
- Produces:
  - `type KernelProbeResult = { checked_at: string; binary: { ok: boolean; version?: string; message?: string }; handshake: { ok: boolean; message?: string }; providers: Record<string, { ok: boolean; error_code?: string }>; skills: 'pending'; agents_spawn: 'pending' }`（③④ 固定 `pending`，分期 3 实现）
  - `runKernelProbe(ws: string, opts?: { runVersion?: (binary: string) => Promise<string>; runHandshake?: (binary: string) => Promise<void>; now?: () => string }): Promise<KernelProbeResult>`（结果写 `probe.json` 并返回；binary 失败则 handshake 直接标失败不再尝试）
  - 默认 `runHandshake`：`Bun.spawn([binary, 'app-server'])`，向 stdin 写一行 `{"id":0,"method":"initialize","params":{"clientInfo":{"name":"mangaforge","title":"MangaForge Studio","version":"probe"}}}`，8 秒内在 stdout 读到含 `"id":0` 的一行即成功，随后杀进程。
  - `loadKernelProbe(ws: string): KernelProbeResult | null`
  - 路由：`POST /api/kernel/runtime/probe` → 200 `{ ok: true, probe }`；`GET /api/kernel/runtime` → `{ ok: true, runtime: { available, version?, message?, supports_chat_wire_api }, probe: KernelProbeResult | null }`

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/probe.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kernelProbePath } from './paths'
import { loadKernelProbe, runKernelProbe } from './probe'

function seedProviders(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([
    { id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} },
    { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://g/v1', custom_headers: {} },
  ]))
  writeFileSync(join(ws, 'models.json'), '[]')
}

describe('kernel probe', () => {
  test('binary missing marks binary+handshake failed but still evaluates providers', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
    seedProviders(ws)
    const probe = await runKernelProbe(ws, {
      runVersion: async () => { throw new Error('ENOENT') },
      now: () => '2026-08-15T00:00:00Z',
    })
    expect(probe.binary.ok).toBe(false)
    expect(probe.handshake.ok).toBe(false)
    expect(probe.providers['any'].ok).toBe(true)
    expect(probe.providers['gemini']).toEqual({ ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED' })
    expect(probe.skills).toBe('pending')
    expect(probe.agents_spawn).toBe('pending')
    expect(existsSync(kernelProbePath(ws))).toBe(true)
    expect(loadKernelProbe(ws)?.checked_at).toBe('2026-08-15T00:00:00Z')
  })

  test('healthy binary and handshake pass ①②', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
    seedProviders(ws)
    const probe = await runKernelProbe(ws, {
      runVersion: async () => 'codex-cli 1.0.0',
      runHandshake: async () => {},
    })
    expect(probe.binary).toEqual({ ok: true, version: '1.0.0' })
    expect(probe.handshake.ok).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/probe.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 probe**

```ts
// ui/server/src/kernel/probe.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readProviders } from '../provider-store'
import { kernelProbePath } from './paths'
import { buildCodexConfigToml } from './providers/translate'
import { checkKernelBinary, loadKernelRuntime } from './runtime'

export type KernelProbeResult = {
  checked_at: string
  binary: { ok: boolean; version?: string; message?: string }
  handshake: { ok: boolean; message?: string }
  providers: Record<string, { ok: boolean; error_code?: string }>
  skills: 'pending'
  agents_spawn: 'pending'
}

async function defaultRunHandshake(binary: string): Promise<void> {
  const proc = Bun.spawn([binary, 'app-server'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' })
  const request = JSON.stringify({
    id: 0,
    method: 'initialize',
    params: { clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version: 'probe' } },
  }) + '\n'
  proc.stdin.write(request)
  proc.stdin.flush()
  const reader = proc.stdout.getReader()
  const deadline = Date.now() + 8000
  let buffer = ''
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += new TextDecoder().decode(value)
      if (buffer.split('\n').some(line => line.includes('"id":0') || line.includes('"id": 0'))) return
    }
    throw new Error('no initialize response before timeout')
  } finally {
    proc.kill()
  }
}

export async function runKernelProbe(
  activeWorkspace: string,
  opts: {
    runVersion?: (binary: string) => Promise<string>
    runHandshake?: (binary: string) => Promise<void>
    now?: () => string
  } = {},
): Promise<KernelProbeResult> {
  const runtime = loadKernelRuntime(activeWorkspace)
  const binary = await checkKernelBinary(runtime, { runVersion: opts.runVersion })
  const result: KernelProbeResult = {
    checked_at: (opts.now || (() => new Date().toISOString()))(),
    binary: binary.ok ? { ok: true, version: binary.version } : { ok: false, message: binary.message },
    handshake: { ok: false },
    providers: {},
    skills: 'pending',
    agents_spawn: 'pending',
  }
  if (binary.ok) {
    try {
      await (opts.runHandshake || defaultRunHandshake)(runtime.binary)
      result.handshake = { ok: true }
    } catch (error: any) {
      result.handshake = { ok: false, message: String(error?.message || error) }
    }
  } else {
    result.handshake = { ok: false, message: 'binary unavailable' }
  }
  for (const provider of await readProviders(activeWorkspace)) {
    const built = buildCodexConfigToml({
      provider: provider as any,
      model: { model_name: 'probe' },
      agents: [],
      supportsChatWireApi: runtime.supports_chat_wire_api,
    })
    result.providers[String((provider as any).id)] = built.ok ? { ok: true } : { ok: false, error_code: built.error_code }
  }
  mkdirSync(dirname(kernelProbePath(activeWorkspace)), { recursive: true })
  writeFileSync(kernelProbePath(activeWorkspace), JSON.stringify(result, null, 2))
  return result
}

export function loadKernelProbe(activeWorkspace: string): KernelProbeResult | null {
  try {
    return JSON.parse(readFileSync(kernelProbePath(activeWorkspace), 'utf8'))
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 路由追加（kernel-routes.ts 内）与测试**

`registerKernelRoutes` 追加：

```ts
app.post('/api/kernel/runtime/probe', async (_req, res) => {
  try {
    res.json({ ok: true, probe: await runKernelProbe(deps.getWorkspace()) })
  } catch (error: any) {
    res.status(500).json({ error: String(error?.message || error) })
  }
})

app.get('/api/kernel/runtime', async (_req, res) => {
  const workspace = deps.getWorkspace()
  const runtime = loadKernelRuntime(workspace)
  const binary = await checkKernelBinary(runtime)
  res.json({
    ok: true,
    runtime: binary.ok
      ? { available: true, version: binary.version, supports_chat_wire_api: runtime.supports_chat_wire_api }
      : { available: false, message: binary.message, supports_chat_wire_api: runtime.supports_chat_wire_api },
    probe: loadKernelProbe(workspace),
  })
})
```

（import 区追加 `import { loadKernelProbe, runKernelProbe } from '../kernel/probe'`。）

`kernel-routes.test.ts` 追加：

```ts
test('GET /api/kernel/runtime reports availability and null probe initially', async () => {
  const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
  const res = await callRoute(handlers.get('GET /api/kernel/runtime'))
  expect(res.statusCode).toBe(200)
  expect(res.body.ok).toBe(true)
  expect(res.body.probe).toBeNull()
})

test('POST /api/kernel/runtime/probe writes and returns probe result', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-routes-'))
  writeFileSync(join(ws, 'providers.json'), '[]')
  const handlers = routeHarness(ws)
  const res = await callRoute(handlers.get('POST /api/kernel/runtime/probe'))
  expect(res.statusCode).toBe(200)
  expect(res.body.probe.skills).toBe('pending')
})
```

（该测试文件顶部需补 `import { writeFileSync } from 'node:fs'`。本机没有 codex 二进制，probe 会得到 `binary.ok=false` —— 这正是预期行为，断言只看结构。）

- [ ] **Step 5: 跑全部内核测试 + 构建**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/ src/routes/kernel-routes.test.ts && bun run check`
Expected: 全部 PASS；构建成功

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/kernel/probe.ts ui/server/src/kernel/probe.test.ts ui/server/src/routes/kernel-routes.ts ui/server/src/routes/kernel-routes.test.ts
git commit -m "feat(kernel): runtime probe (binary/handshake/provider translation) with routes"
```

---

### Task 14: 分期 2 验收 —— 项目 3 第 2 章落盘演练脚本

**Files:**
- Create: `ui/server/src/kernel/dry-run.ts`
- Test: 无新增单测（组合既有已测模块）；验收=人工检查输出

**Interfaces:**
- Consumes: `loadKernelContracts`（`./contracts/store`）、`projectKernelSubject`（`./projection/project`）、`deployKernelPackMounts`（`./projection/pack-mounts`）、`writeKernelSnapshot`（`./projection/snapshot`）、`writeCodexHome`（`./providers/translate`）、`renderKernelTemplate`（`./template`）、`kernelJobDir`（`./paths`）、`loadKernelRuntime`（`./runtime`）。
- Produces: `bun src/kernel/dry-run.ts --workspace <ws> --project 3 --chapter 62 --contract oh-story-core.story-review.full --model 217` 生成 `jobs/dryrun-{时间戳}/`：`project/`（全部挂载）、`snapshot/manifest.json`、`codex-home/config.toml`、`prompt.txt`（mention + 渲染后 prompt），并打印各文件清单与 missingReviewers。

- [ ] **Step 1: 实现脚本**

```ts
// ui/server/src/kernel/dry-run.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadKernelContracts } from './contracts/store'
import { kernelJobDir } from './paths'
import { deployKernelPackMounts } from './projection/pack-mounts'
import { projectKernelSubject } from './projection/project'
import { writeKernelSnapshot } from './projection/snapshot'
import { writeCodexHome } from './providers/translate'
import { loadKernelRuntime } from './runtime'
import { renderKernelTemplate } from './template'

function arg(name: string, fallback = ''): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? String(process.argv[index + 1] || '') : fallback
}

const workspace = arg('workspace', '/Users/ruiyaosong/MangaForge-Studio/workspace')
const projectId = Number(arg('project', '3'))
const chapterId = Number(arg('chapter', '62'))
const contractId = arg('contract', 'oh-story-core.story-review.full')
const modelId = Number(arg('model', '0'))

const { contracts } = loadKernelContracts(workspace)
const contract = contracts.find(item => item.id === contractId)
if (!contract) {
  console.error(`contract not found: ${contractId}`)
  process.exit(1)
}

const jobDir = kernelJobDir(workspace, `dryrun-${Date.now()}`)
const projectDir = join(jobDir, 'project')
mkdirSync(projectDir, { recursive: true })

const { vars, files } = await projectKernelSubject({ workspace, projectId, chapterId, contract, projectDir })
const packResult = deployKernelPackMounts({ workspace, projectDir, skillName: contract.skill_name, mounts: contract.projection.mounts })
writeKernelSnapshot(projectDir, join(jobDir, 'snapshot'))

const prompt = `${contract.invoke.mention}\n${renderKernelTemplate(contract.invoke.prompt, vars)}`.trim()
writeFileSync(join(jobDir, 'prompt.txt'), prompt)

if (modelId) {
  const runtime = loadKernelRuntime(workspace)
  const home = await writeCodexHome({
    workspace, jobDir, modelId,
    agents: packResult.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  console.log('codex-home:', home)
}

console.log('job dir:', jobDir)
console.log('projected files:', files.length)
for (const file of files) console.log('  -', file)
console.log('skill symlink:', packResult.skillPath)
console.log('missing reviewers:', packResult.missingReviewers)
```

- [ ] **Step 2: 重装套件拿 agents bundle，再跑演练**

```bash
curl -s -X POST http://localhost:3001/api/novel/oh-story/core/install || echo '（服务未启动则改为下一行离线方式）'
```

服务未启动时，直接用一次性脚本调用 `installOhStoryCoreSuite`：

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun -e "import('./src/novel-writing/oh-story-core/install').then(m => m.installOhStoryCoreSuite('/Users/ruiyaosong/MangaForge-Studio/workspace')).then(() => console.log('installed'))"
```

然后：

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun src/kernel/dry-run.ts --project 3 --chapter 62 --contract oh-story-core.story-review.full --model 217
```

Expected（人工核对，即 spec 分期 2 验收「隔离 CODEX_HOME 可人工打开检查」）：
- `project/正文/第002章_违背规则的绝对防御.md` 与 `正文/第001章_*.md` 内容为真实章节
- `大纲/`、`设定/角色/`、`设定/世界观.md`、`追踪/伏笔.md` 齐全
- `.codex/agents/` 四个 toml、`.story-deployed` 含 `agents_version: 25`、`.agents/skills/story-review` 为符号链接
- `prompt.txt` 首行 `$story-review`，变量已渲染、无 `{{`
- `missing reviewers: []`
- model 217 是 `gemini`（openai_compatible）→ `codex-home` 输出 `PROVIDER_TRANSLATE_FAILED`（锁定版未标 chat 支持，**预期失败**）；换 `--model` 为任一 `codex_responses` 供应商（`any` / `jun` / `free`）下的模型 id 再跑 → `codex-home/config.toml` 生成，含 `[agents.story-architect]` 等四段与 `[memories]`

- [ ] **Step 3: 跑全量内核相关测试收尾**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test src/kernel/ src/routes/kernel-routes.test.ts src/novel-writing/oh-story-core/ && bun run check`
Expected: 全部 PASS；构建成功

- [ ] **Step 4: Commit**

```bash
git add ui/server/src/kernel/dry-run.ts
git commit -m "feat(kernel): add projection dry-run script for phase-2 acceptance"
```

---

## 收尾与遗留

- 分期 1 验收：Task 6 完成即达成（表、磁盘、校验、HTTP 读合同，不接 Codex）。
- 分期 2 验收：Task 14 的人工核对清单 + 探针 ①②⑤（① 在本机为红——codex 未安装，属部署前置；⑤ 对 `codex_responses` 供应商必须绿）。
- 明确不做（后续计划）：app-server 会话客户端、events.jsonl、探针 ③④、kernel_jobs 编排/门/commit/竞选、旧按钮转调（spec 分期 3-5）。`skills`/`agents_spawn` 字段已在 probe.json 里占位为 `pending`。
- 锁定版本决策（`runtime.json` 的 `codex_version` 与 `supports_chat_wire_api`）是分期 3 前的人工前置：装好 codex 后跑 `POST /api/kernel/runtime/probe`，按结果回填。
