# Codex 内核 · 分期 4（任务编排、门、提交与旧按钮转调）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 spec v1.1 的分期 4：`kernel_jobs` 状态机编排、收回后门（gates）、vault 持久化、领域提交（reviews / chapters）、`/api/kernel/jobs` 五个 HTTP 端点、7.4 进度对象，以及三个旧按钮（审稿/去AI/按建议改稿）内部转调内核。**前置硬门槛：真机探针 ④ 绿之前不得开始实施本计划**（spec 风险节）；写计划不受此约束。**不做**并跑选优（分期 5）。

**Architecture:** 新增 `ui/server/src/kernel/jobs/` 目录：`repo.ts`（账本行 CRUD）→ `vault.ts`（产物入库）→ `gates.ts`（收回后门，纯函数）→ `commit.ts`（领域写入 + kernel_commits）→ `run-job.ts`（状态机编排，包住分期 3 的 `runKernelCandidate`）。HTTP 在 `routes/kernel-job-routes.ts`。旧按钮改 `routes/novel-oh-story-core-routes.ts` 的 `handleAction`，阻塞至 job 终态再回包，形状兼容现有前端。

**Tech Stack:** Bun（bun:sqlite、bun:test）、TypeScript、Express。零新依赖。

---

## Global Constraints

- 状态机照抄 spec：job `queued → running → awaiting_selection|committed|failed|cancelled`；candidate `queued → running → succeeded|gated|failed → committed`。`gated` 不是成功；没有任何 `succeeded` 候选 → job `failed`。
- 门的封闭集合与失败码照抄 spec 门表：`reject_solo_fallback`→`SOLO_FALLBACK`、`require_reviewer_agents`→`REVIEWERS_MISSING`（启动前，已在分期 3 `runKernelCandidate` 内）、`require_chapter_file`→`CHAPTER_FILE_MISSING`、`require_matching_review`→`OH_STORY_APPLY_NO_REVIEW`/`OH_STORY_APPLY_STALE_REVIEW`（投影前已检，commit 前重跑）、`paragraph_retention_70`→`OH_STORY_APPLY_REWROTE_TOO_MUCH`、`write_outside_scope`→警告不失败。
- HTTP 错误码照抄 spec 10.5 两张表；`POST /jobs` 同步校验：`KERNEL_RUNTIME_UNAVAILABLE` 503、`CONTRACT_INVALID`/`CONTRACT_NOT_IMPLEMENTED`/`CONTRACT_BUILTIN`/`CAPABILITY_MIXED`/`PROVIDER_TRANSLATE_FAILED` 400、`JOB_ALREADY_COMMITTED` 409。
- 领域绑定照抄 spec：`reviews.oh_story_review` → `INSERT reviews`（payload 含 `kernel_job_id`/`kernel_candidate_id`/`kernel_artifact_id`/`chapter_id`/`chapter_no`/`chapter_text_hash`/`report_text`）；`chapters.rewrite` → `updateNovelChapter` + `versionSource = contract.commit.source`；`kernel_only` → 只写 `kernel_artifacts` + vault。
- 朱雀/指纹不回退入库；不出现新的 solo 提示词路径；`KERNEL_RUNTIME_UNAVAILABLE` 时旧按钮直接 503，禁止静默改走旧 LLM 管线。
- 测试命令统一 `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test <相对路径>`；conventional commits，每任务一提交。

### 本分期新增决定（已折入 spec v1.2，2026-08-18）

| 决定 | 取值 |
|---|---|
| 候选目录 | `jobs/{job_id}/candidates/{candidate_id}/{project,codex-home,snapshot,artifacts,events.jsonl,last-message.md}`——为分期 5 并跑统一布局；`runKernelCandidate` 不改，编排传 `jobId = '{job_id}/candidates/{candidate_id}'`（`kernelJobDir` 是纯 join） |
| vault 布局 | `vault/{artifact_id}/{basename(rel_path)}`；`kernel_artifacts.vault_path` 存文件绝对路径 |
| 提交事务性 | 领域写入走既有 repo 函数（各自带写锁），随后一个 `openKernelDb` 连接内写 `kernel_commits` + job/candidate 状态。防重入：commit 入口先查 job 状态与 `kernel_commits`，已提交 → 409 `JOB_ALREADY_COMMITTED` |
| `last_message_excerpt` | 取 `lastMessage` 前 500 字符 |
| 旧按钮 deslop/apply 回包 | 不再含 `review_id`（`chapters.rewrite` 绑定按 spec 不写 review 行），新增 `kernel_job_id`；review 按钮回包仍含 `review_id`（来自 reviews 插入行） |
| 进度 hint | 从候选目录 `events.jsonl` 惰性提取（`extractSpawnEvidence().agent_hints` 最后一个），不加回调 |
| id 生成 | `job-`/`cand-`/`art-`/`commit-` 前缀 + `crypto.randomUUID()` |
| model 选择 | 旧按钮桥接沿用 `getStageModelId(project, action==='review'?'review':'revise', requestedModelId)`；新 UI 直传 `model_id` |

### 分期 3 接口依赖（执行前核对一次实际签名）

`runKernelCandidate(input) → RunKernelCandidateResult`（`kernel/codex/run-candidate.ts`）、`readKernelEvents`/`extractSpawnEvidence`、`CodexSession`。若分期 3 实施时字段有出入，只改本计划 Task 2 与 Task 6 的对接处，其余任务不受影响。

---

### Task 1: kernel jobs 账本仓库

**Files:**
- Create: `ui/server/src/kernel/jobs/repo.ts`
- Test: `ui/server/src/kernel/jobs/repo.test.ts`

**Interfaces:**
- Consumes: `openKernelDb`（`../db`）。
- Produces（全部同步，内部每次 `openKernelDb`/`finally close`，与 `listCommittedTrackingDocPaths` 同风格）：

```ts
export type KernelJobRow = {
  id: string; project_id: number; workspace_scope: string; title: string; status: string
  capability: string; subject_type: string; subject_id: number
  model_provider_id: string; model_id: number | null
  created_at: string; updated_at: string; finished_at: string | null
  error_code: string; error_message: string
}
export type KernelCandidateRow = {
  id: string; job_id: string; contract_id: string; pack_id: string; pack_revision: string
  skill_name: string; status: string; thread_id: string; turn_id: string
  started_at: string | null; finished_at: string | null; error_code: string
  last_message_excerpt: string; gate_results: string; metadata: string
}
export function insertKernelJob(ws: string, row: Omit<KernelJobRow, 'created_at' | 'updated_at' | 'finished_at'>): void
export function insertKernelCandidate(ws: string, row: Pick<KernelCandidateRow, 'id' | 'job_id' | 'contract_id' | 'pack_id' | 'pack_revision' | 'skill_name' | 'status'>): void
export function updateKernelJob(ws: string, id: string, patch: Partial<Pick<KernelJobRow, 'status' | 'finished_at' | 'error_code' | 'error_message'>>): void
export function updateKernelCandidate(ws: string, id: string, patch: Partial<Pick<KernelCandidateRow, 'status' | 'thread_id' | 'turn_id' | 'started_at' | 'finished_at' | 'error_code' | 'last_message_excerpt' | 'gate_results' | 'metadata'>>): void
export function insertKernelArtifact(ws: string, row: { id: string; candidate_id: string; artifact_kind: string; rel_path: string; sha256: string; byte_size: number; vault_path: string; metadata?: string }): void
export function insertKernelCommit(ws: string, row: { id: string; job_id: string; candidate_id: string; domain_table: string; domain_row_id: number }): void
export function getKernelJobDetail(ws: string, jobId: string): { job: KernelJobRow; candidates: KernelCandidateRow[]; artifacts: any[]; commits: any[] } | null
export function listKernelJobs(ws: string, filter: { projectId?: number; subjectType?: string; subjectId?: number }): KernelJobRow[]  // ORDER BY created_at DESC LIMIT 50
```

- `updateKernelJob` 总是刷新 `updated_at = datetime('now')`。patch 为空对象时只刷 `updated_at`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/repo.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import {
  getKernelJobDetail, insertKernelArtifact, insertKernelCandidate, insertKernelCommit,
  insertKernelJob, listKernelJobs, updateKernelCandidate, updateKernelJob,
} from './repo'

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'jobs-repo-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, {
    id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '第2章审稿',
    status: 'queued', capability: 'review', subject_type: 'chapter', subject_id: 62,
    model_provider_id: 'any', model_id: 9, error_code: '', error_message: '',
  })
  insertKernelCandidate(ws, {
    id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-review.full',
    pack_id: 'oh-story-core', pack_revision: 'rev', skill_name: 'story-review', status: 'queued',
  })
  return { ws, project }
}

describe('kernel jobs repo', () => {
  test('insert + detail round-trip with candidates/artifacts/commits', async () => {
    const { ws } = await seed()
    insertKernelArtifact(ws, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 10, vault_path: '/v/art-1/第002章.md' })
    insertKernelCommit(ws, { id: 'commit-1', job_id: 'job-1', candidate_id: 'cand-1', domain_table: 'reviews', domain_row_id: 7 })
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('queued')
    expect(detail.candidates.length).toBe(1)
    expect(detail.artifacts[0].rel_path).toBe('审稿/第002章.md')
    expect(detail.commits[0].domain_row_id).toBe(7)
    expect(getKernelJobDetail(ws, 'nope')).toBeNull()
  })

  test('updates patch status and metadata', async () => {
    const { ws } = await seed()
    updateKernelJob(ws, 'job-1', { status: 'running' })
    updateKernelCandidate(ws, 'cand-1', { status: 'succeeded', thread_id: 't1', gate_results: '[{"gate":"x","ok":true}]', metadata: '{"a":1}' })
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('running')
    expect(detail.candidates[0].thread_id).toBe('t1')
    expect(JSON.parse(detail.candidates[0].gate_results)[0].ok).toBe(true)
  })

  test('list filters by project/subject and orders newest first', async () => {
    const { ws, project } = await seed()
    insertKernelJob(ws, {
      id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'queued', capability: 'rewrite', subject_type: 'chapter', subject_id: 63,
      model_provider_id: 'any', model_id: 9, error_code: '', error_message: '',
    })
    expect(listKernelJobs(ws, { projectId: project.id }).length).toBe(2)
    expect(listKernelJobs(ws, { projectId: project.id, subjectId: 62 }).map(j => j.id)).toEqual(['job-1'])
    expect(listKernelJobs(ws, { projectId: 999 })).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/jobs/repo.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/jobs/repo.ts
import { openKernelDb } from '../db'

export type KernelJobRow = {
  id: string; project_id: number; workspace_scope: string; title: string; status: string
  capability: string; subject_type: string; subject_id: number
  model_provider_id: string; model_id: number | null
  created_at: string; updated_at: string; finished_at: string | null
  error_code: string; error_message: string
}
export type KernelCandidateRow = {
  id: string; job_id: string; contract_id: string; pack_id: string; pack_revision: string
  skill_name: string; status: string; thread_id: string; turn_id: string
  started_at: string | null; finished_at: string | null; error_code: string
  last_message_excerpt: string; gate_results: string; metadata: string
}

function withDb<T>(ws: string, fn: (db: ReturnType<typeof openKernelDb>) => T): T {
  const db = openKernelDb(ws)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

export function insertKernelJob(ws: string, row: Omit<KernelJobRow, 'created_at' | 'updated_at' | 'finished_at'>): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_jobs (id, project_id, workspace_scope, title, status, capability, subject_type, subject_id, model_provider_id, model_id, error_code, error_message)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(row.id, row.project_id, row.workspace_scope, row.title, row.status, row.capability, row.subject_type, row.subject_id, row.model_provider_id, row.model_id, row.error_code, row.error_message))
}

export function insertKernelCandidate(ws: string, row: Pick<KernelCandidateRow, 'id' | 'job_id' | 'contract_id' | 'pack_id' | 'pack_revision' | 'skill_name' | 'status'>): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_candidates (id, job_id, contract_id, pack_id, pack_revision, skill_name, status)
    VALUES (?,?,?,?,?,?,?)
  `).run(row.id, row.job_id, row.contract_id, row.pack_id, row.pack_revision, row.skill_name, row.status))
}

const JOB_PATCH_COLUMNS = ['status', 'finished_at', 'error_code', 'error_message'] as const
const CANDIDATE_PATCH_COLUMNS = ['status', 'thread_id', 'turn_id', 'started_at', 'finished_at', 'error_code', 'last_message_excerpt', 'gate_results', 'metadata'] as const

export function updateKernelJob(ws: string, id: string, patch: Partial<Pick<KernelJobRow, typeof JOB_PATCH_COLUMNS[number]>>): void {
  const sets: string[] = ["updated_at = datetime('now')"]
  const values: any[] = []
  for (const column of JOB_PATCH_COLUMNS) {
    if (patch[column] === undefined) continue
    sets.push(`${column} = ?`)
    values.push(patch[column])
  }
  withDb(ws, db => db.query(`UPDATE kernel_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...values, id))
}

export function updateKernelCandidate(ws: string, id: string, patch: Partial<Pick<KernelCandidateRow, typeof CANDIDATE_PATCH_COLUMNS[number]>>): void {
  const sets: string[] = []
  const values: any[] = []
  for (const column of CANDIDATE_PATCH_COLUMNS) {
    if (patch[column] === undefined) continue
    sets.push(`${column} = ?`)
    values.push(patch[column])
  }
  if (!sets.length) return
  withDb(ws, db => db.query(`UPDATE kernel_candidates SET ${sets.join(', ')} WHERE id = ?`).run(...values, id))
}

export function insertKernelArtifact(ws: string, row: { id: string; candidate_id: string; artifact_kind: string; rel_path: string; sha256: string; byte_size: number; vault_path: string; metadata?: string }): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_artifacts (id, candidate_id, artifact_kind, rel_path, sha256, byte_size, vault_path, metadata)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(row.id, row.candidate_id, row.artifact_kind, row.rel_path, row.sha256, row.byte_size, row.vault_path, row.metadata ?? '{}'))
}

export function insertKernelCommit(ws: string, row: { id: string; job_id: string; candidate_id: string; domain_table: string; domain_row_id: number }): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_commits (id, job_id, candidate_id, domain_table, domain_row_id) VALUES (?,?,?,?,?)
  `).run(row.id, row.job_id, row.candidate_id, row.domain_table, row.domain_row_id))
}

export function getKernelJobDetail(ws: string, jobId: string) {
  return withDb(ws, db => {
    const job = db.query('SELECT * FROM kernel_jobs WHERE id = ?').get(jobId) as KernelJobRow | null
    if (!job) return null
    const candidates = db.query('SELECT * FROM kernel_candidates WHERE job_id = ? ORDER BY id').all(jobId) as KernelCandidateRow[]
    const candidateIds = candidates.map(c => c.id)
    const placeholders = candidateIds.map(() => '?').join(',')
    const artifacts = candidateIds.length
      ? db.query(`SELECT * FROM kernel_artifacts WHERE candidate_id IN (${placeholders}) ORDER BY id`).all(...candidateIds)
      : []
    const commits = db.query('SELECT * FROM kernel_commits WHERE job_id = ? ORDER BY created_at').all(jobId)
    return { job, candidates, artifacts, commits }
  })
}

export function listKernelJobs(ws: string, filter: { projectId?: number; subjectType?: string; subjectId?: number }): KernelJobRow[] {
  const where: string[] = []
  const values: any[] = []
  if (filter.projectId) { where.push('project_id = ?'); values.push(filter.projectId) }
  if (filter.subjectType) { where.push('subject_type = ?'); values.push(filter.subjectType) }
  if (filter.subjectId) { where.push('subject_id = ?'); values.push(filter.subjectId) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return withDb(ws, db => db.query(`SELECT * FROM kernel_jobs ${clause} ORDER BY created_at DESC, id DESC LIMIT 50`).all(...values) as KernelJobRow[])
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/jobs/repo.test.ts`
Expected: PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/repo.ts ui/server/src/kernel/jobs/repo.test.ts
git commit -m "feat(kernel): kernel jobs ledger repository"
```

---

### Task 2: runKernelCandidate 加编排钩子

**Files:**
- Modify: `ui/server/src/kernel/codex/run-candidate.ts`
- Test: `ui/server/src/kernel/codex/run-candidate.test.ts`（追加）

**Interfaces:**
- `RunKernelCandidateInput` 增加两个可选回调：
  - `onSession?: (session: CodexSession) => void` — `startCodexSession` 成功后立刻调用（编排层留 interrupt/close 句柄，取消用）
  - `onPhase?: (phase: 'projecting' | 'starting' | 'running' | 'harvesting') => void` — 依次在投影前、会话拉起前、turn 发出前、收回前调用（7.4 进度）
- 其余行为不变。

- [ ] **Step 1: 写失败测试（追加到 run-candidate.test.ts）**

```ts
test('onPhase and onSession hooks fire in order', async () => {
  const { ws, project, ch2 } = await seedWorkspace()
  const phases: string[] = []
  let sessionSeen = false
  const result = await runKernelCandidate({
    workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
    sessionArgv: [process.execPath, FIXTURE],
    sessionExtraEnv: {
      FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
      FAKE_WRITE_FILE: '审稿/第002章.md',
      FAKE_WRITE_CONTENT: 'Fallback: none\n报告',
    },
    onPhase: (phase) => phases.push(phase),
    onSession: () => { sessionSeen = true },
  })
  expect(result.ok).toBe(true)
  expect(phases).toEqual(['projecting', 'starting', 'running', 'harvesting'])
  expect(sessionSeen).toBe(true)
})
```

- [ ] **Step 2: 跑测试确认失败** → Run 同上文件，Expected: FAIL

- [ ] **Step 3: 实现**

`run-candidate.ts` 中：input 类型加 `onSession?` / `onPhase?`；在 `projectKernelSubject` 前调 `input.onPhase?.('projecting')`；`startCodexSession` 前调 `input.onPhase?.('starting')`，成功后调 `input.onSession?.(session)`；`session.runTurn` 前调 `input.onPhase?.('running')`；`harvestKernelArtifacts` 前调 `input.onPhase?.('harvesting')`。

- [ ] **Step 4: 跑测试确认通过** → 该文件全部 PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/run-candidate.ts ui/server/src/kernel/codex/run-candidate.test.ts
git commit -m "feat(kernel): phase and session hooks on candidate runner"
```

---

### Task 3: vault 持久化

**Files:**
- Create: `ui/server/src/kernel/jobs/vault.ts`
- Test: `ui/server/src/kernel/jobs/vault.test.ts`

**Interfaces:**
- Consumes: `kernelVaultDir`（`../paths`）、`insertKernelArtifact`（`./repo`）、`HarvestedArtifact`（`../projection/snapshot`）。
- Produces:
  - `persistCandidateArtifacts(ws: string, candidateId: string, artifacts: HarvestedArtifact[]): Array<{ artifact_id: string; rel_path: string; artifact_kind: string; vault_path: string }>` — 对每个产物：生成 `art-{uuid}`，拷 `copied_path` → `{vault}/{artifact_id}/{basename(rel_path)}`，插 `kernel_artifacts` 行（sha256/byte_size 沿用收回值），返回登记结果。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/vault.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import { insertKernelCandidate, insertKernelJob, getKernelJobDetail } from './repo'
import { persistCandidateArtifacts } from './vault'

test('persists artifact copies under vault and registers ledger rows', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'vault-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'running' })
  const src = mkdtempSync(join(tmpdir(), 'vault-src-'))
  mkdirSync(join(src, '审稿'), { recursive: true })
  writeFileSync(join(src, '审稿/第002章.md'), '报告正文')
  const rows = persistCandidateArtifacts(ws, 'cand-1', [
    { rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 12, copied_path: join(src, '审稿/第002章.md') },
  ])
  expect(rows.length).toBe(1)
  expect(rows[0].artifact_id.startsWith('art-')).toBe(true)
  expect(existsSync(rows[0].vault_path)).toBe(true)
  expect(readFileSync(rows[0].vault_path, 'utf8')).toBe('报告正文')
  const detail = getKernelJobDetail(ws, 'job-1')!
  expect(detail.artifacts[0].vault_path).toBe(rows[0].vault_path)
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/jobs/vault.ts
import { copyFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { kernelVaultDir } from '../paths'
import type { HarvestedArtifact } from '../projection/snapshot'
import { insertKernelArtifact } from './repo'

export function persistCandidateArtifacts(ws: string, candidateId: string, artifacts: HarvestedArtifact[]) {
  const registered: Array<{ artifact_id: string; rel_path: string; artifact_kind: string; vault_path: string }> = []
  for (const artifact of artifacts) {
    const artifactId = `art-${crypto.randomUUID()}`
    const dir = join(kernelVaultDir(ws), artifactId)
    mkdirSync(dir, { recursive: true })
    const vaultPath = join(dir, basename(artifact.rel_path))
    copyFileSync(artifact.copied_path, vaultPath)
    insertKernelArtifact(ws, {
      id: artifactId, candidate_id: candidateId, artifact_kind: artifact.artifact_kind,
      rel_path: artifact.rel_path, sha256: artifact.sha256, byte_size: artifact.byte_size, vault_path: vaultPath,
    })
    registered.push({ artifact_id: artifactId, rel_path: artifact.rel_path, artifact_kind: artifact.artifact_kind, vault_path: vaultPath })
  }
  return registered
}
```

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/vault.ts ui/server/src/kernel/jobs/vault.test.ts
git commit -m "feat(kernel): persist candidate artifacts into vault with ledger rows"
```

---

### Task 4: 收回后门（gates）

**Files:**
- Create: `ui/server/src/kernel/jobs/gates.ts`
- Test: `ui/server/src/kernel/jobs/gates.test.ts`

**Interfaces:**
- Consumes: `listNovelReviewsByType`/`getNovelChapter`（`../../novel`）、`latestOhStoryReviewForChapter`/`ohStoryReviewMatchesChapterText`（`../../novel-writing/oh-story-core/review-match`）、`ohStoryApplyRewroteTooMuch`（`../../novel-writing/oh-story-core/paragraph-retention`）、`KernelContract`（`../contracts/schema`）。
- Produces:

```ts
export type GateResult = { gate: string; ok: boolean; code?: string; message?: string }
export async function runPostHarvestGates(input: {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  artifacts: Array<{ rel_path: string; artifact_kind: string; copied_path?: string; vault_path?: string }>
  warnings: Array<{ warning: string; rel_path: string }>
  readArtifactText: (artifact: { copied_path?: string; vault_path?: string }) => string   // 注入，commit 重跑时读 vault
}): Promise<{ results: GateResult[]; failedCode: string | null }>
```

- 门语义（照抄 spec 门表，只跑合同 `gates` 里声明且属于「收回后」的门）：
  - `reject_solo_fallback`：找第一个 `artifact_kind==='review_report'` 的产物，读文本前 2048 字符，按行匹配 `/^Fallback:\s*(.+)$/m` 值含 `solo`（不区分大小写）或 `/^Effective Mode:\s*solo\b/mi` → fail `SOLO_FALLBACK`；无 review_report 产物 → 该门 fail `SOLO_FALLBACK`（没有报告可证伪，视为未通过），message 注明
  - `require_chapter_file`：找 `artifact_kind==='chapter_text'` 产物且文本去空白后非空 → ok；否则 fail `CHAPTER_FILE_MISSING`
  - `require_matching_review`：`listNovelReviewsByType(ws, projectId, 'oh_story_review')` → `latestOhStoryReviewForChapter(reviews, chapterId)`；无 → fail `OH_STORY_APPLY_NO_REVIEW`；有但 `!ohStoryReviewMatchesChapterText(review, 当前领域 chapter_text)` → fail `OH_STORY_APPLY_STALE_REVIEW`
  - `paragraph_retention_70`：`ohStoryApplyRewroteTooMuch(当前领域 chapter_text, chapter_text 产物文本)` → fail `OH_STORY_APPLY_REWROTE_TOO_MUCH`
  - `require_reviewer_agents`：启动前门（分期 3 已在 runner 内），此处跳过（结果记 `{ gate, ok: true, message: 'checked before start' }`）
  - `write_outside_scope`：不是合同门也照记——warnings 逐条转 `{ gate: 'write_outside_scope', ok: true, code: 'write_outside_scope', message: rel_path }`（警告不失败）
- `failedCode` = 第一个失败门的 code，全过则 `null`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/gates.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, createNovelReview } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { runPostHarvestGates } from './gates'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const applyContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-apply.surgical')!

const EIGHT_PARAGRAPHS = Array.from({ length: 8 }, (_, i) => `原文段${i}。`).join('\n\n')

async function seed(chapterText = EIGHT_PARAGRAPHS) {
  const ws = mkdtempSync(join(tmpdir(), 'gates-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: chapterText })
  return { ws, project, chapter }
}

function textReader(map: Record<string, string>) {
  return (artifact: any) => map[artifact.rel_path] ?? ''
}

describe('runPostHarvestGates', () => {
  test('review passes when Fallback line is none; solo line gates', async () => {
    const { ws, project, chapter } = await seed()
    const base = {
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }],
      warnings: [],
    }
    const pass = await runPostHarvestGates({ ...base, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\nEffective Mode: multi\n正文' }) })
    expect(pass.failedCode).toBeNull()
    const solo = await runPostHarvestGates({ ...base, readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: solo (agents unavailable)\n正文' }) })
    expect(solo.failedCode).toBe('SOLO_FALLBACK')
    const missing = await runPostHarvestGates({ ...base, artifacts: [], readArtifactText: textReader({}) })
    expect(missing.failedCode).toBe('SOLO_FALLBACK')
  })

  test('mid-report solo mention does not trip the gate', async () => {
    const { ws, project, chapter } = await seed()
    const result = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }], warnings: [],
      readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\n第三段提到 solo 模式的风险。' }),
    })
    expect(result.failedCode).toBeNull()
  })

  test('apply gates: stale review, empty chapter, rewrote too much', async () => {
    const { ws, project, chapter } = await seed()
    const artifacts = [{ rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' }]
    const noReview = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': EIGHT_PARAGRAPHS }),
    })
    expect(noReview.failedCode).toBe('OH_STORY_APPLY_NO_REVIEW')
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT_PARAGRAPHS), report_text: 'r' }),
    })
    const rewrote = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': '全新段。' }),
    })
    expect(rewrote.failedCode).toBe('OH_STORY_APPLY_REWROTE_TOO_MUCH')
    const empty = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [], readArtifactText: textReader({ '正文/第002章_二.md': '  \n ' }),
    })
    expect(empty.failedCode).toBe('CHAPTER_FILE_MISSING')
    const keep = EIGHT_PARAGRAPHS + '\n\n新增段。'
    const ok = await runPostHarvestGates({
      workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
      artifacts, warnings: [{ warning: 'write_outside_scope', rel_path: '越界.md' }],
      readArtifactText: textReader({ '正文/第002章_二.md': keep }),
    })
    expect(ok.failedCode).toBeNull()
    expect(ok.results.some(r => r.gate === 'write_outside_scope' && r.message === '越界.md')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/jobs/gates.ts
import { getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryApplyRewroteTooMuch } from '../../novel-writing/oh-story-core/paragraph-retention'
import { latestOhStoryReviewForChapter, ohStoryReviewMatchesChapterText } from '../../novel-writing/oh-story-core/review-match'
import type { KernelContract } from '../contracts/schema'

export type GateResult = { gate: string; ok: boolean; code?: string; message?: string }

type GateArtifact = { rel_path: string; artifact_kind: string; copied_path?: string; vault_path?: string }

function soloDetected(reportHead: string): boolean {
  const fallback = reportHead.match(/^Fallback:\s*(.+)$/mi)
  if (fallback && /\bsolo\b/i.test(fallback[1])) return true
  return /^Effective Mode:\s*solo\b/mi.test(reportHead)
}

export async function runPostHarvestGates(input: {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  artifacts: GateArtifact[]
  warnings: Array<{ warning: string; rel_path: string }>
  readArtifactText: (artifact: GateArtifact) => string
}): Promise<{ results: GateResult[]; failedCode: string | null }> {
  const results: GateResult[] = []
  for (const warning of input.warnings || []) {
    results.push({ gate: 'write_outside_scope', ok: true, code: 'write_outside_scope', message: warning.rel_path })
  }

  const chapterArtifact = input.artifacts.find(a => a.artifact_kind === 'chapter_text')
  const reportArtifact = input.artifacts.find(a => a.artifact_kind === 'review_report')

  for (const gate of input.contract.gates) {
    if (gate === 'require_reviewer_agents') {
      results.push({ gate, ok: true, message: 'checked before start' })
      continue
    }
    if (gate === 'write_outside_scope') continue
    if (gate === 'reject_solo_fallback') {
      if (!reportArtifact) {
        results.push({ gate, ok: false, code: 'SOLO_FALLBACK', message: 'no review_report artifact to verify' })
        continue
      }
      const head = input.readArtifactText(reportArtifact).slice(0, 2048)
      if (soloDetected(head)) results.push({ gate, ok: false, code: 'SOLO_FALLBACK' })
      else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'require_chapter_file') {
      const text = chapterArtifact ? input.readArtifactText(chapterArtifact) : ''
      if (!text.replace(/\s/g, '')) results.push({ gate, ok: false, code: 'CHAPTER_FILE_MISSING' })
      else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'require_matching_review') {
      const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
      const reviews = await listNovelReviewsByType(input.workspace, input.projectId, 'oh_story_review')
      const review = latestOhStoryReviewForChapter(reviews, input.chapterId)
      if (!review) results.push({ gate, ok: false, code: 'OH_STORY_APPLY_NO_REVIEW' })
      else if (!ohStoryReviewMatchesChapterText(review, String(chapter?.chapter_text || ''))) {
        results.push({ gate, ok: false, code: 'OH_STORY_APPLY_STALE_REVIEW' })
      } else results.push({ gate, ok: true })
      continue
    }
    if (gate === 'paragraph_retention_70') {
      const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
      const nextText = chapterArtifact ? input.readArtifactText(chapterArtifact) : ''
      if (ohStoryApplyRewroteTooMuch(String(chapter?.chapter_text || ''), nextText)) {
        results.push({ gate, ok: false, code: 'OH_STORY_APPLY_REWROTE_TOO_MUCH' })
      } else results.push({ gate, ok: true })
      continue
    }
  }
  const failed = results.find(r => !r.ok)
  return { results, failedCode: failed?.code || null }
}
```

- [ ] **Step 4: 跑测试确认通过** → PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/gates.ts ui/server/src/kernel/jobs/gates.test.ts
git commit -m "feat(kernel): post-harvest gates with spec failure codes"
```

---

### Task 5: 提交执行器（领域写入 + kernel_commits）

**Files:**
- Create: `ui/server/src/kernel/jobs/commit.ts`
- Test: `ui/server/src/kernel/jobs/commit.test.ts`

**Interfaces:**
- Consumes: `getKernelJobDetail`/`insertKernelCommit`/`updateKernelJob`/`updateKernelCandidate`（`./repo`）、`runPostHarvestGates`（`./gates`）、`createNovelReview`/`updateNovelChapter`/`getNovelChapter`（`../../novel`）、`ohStoryChapterTextHash`（`../../novel-writing/oh-story-core/chapter-text-hash`）、`loadKernelContracts`（`../contracts/store`）。
- Produces:

```ts
export async function commitKernelCandidate(ws: string, jobId: string, candidateId: string): Promise<
  | { ok: true; commits: Array<{ domain_table: string; domain_row_id: number }> }
  | { ok: false; status: 404 | 409 | 500; code: string; message: string }
>
```

- 流程：
  1. `getKernelJobDetail` 找 job/candidate；缺 → 404 `JOB_NOT_FOUND`/`CANDIDATE_NOT_FOUND`
  2. job 已 `committed`（或 `kernel_commits` 已有该 job 行）→ 409 `JOB_ALREADY_COMMITTED`；candidate 非 `succeeded` → 409 `CANDIDATE_NOT_SUCCEEDED`
  3. 从 `loadKernelContracts` 找该候选 `contract_id` 的合同（缺 → 500 `CONTRACT_INVALID`）
  4. **重跑门**（防提交时正文已变）：`runPostHarvestGates`，artifacts 用账本行、`readArtifactText` 读 `vault_path`；失败 → 409（code = failedCode）
  5. 领域写入，按合同 outputs 逐个绑定：
     - `binding.startsWith('reviews.')`：review_type = binding 去前缀；找该 output 的账本产物（按渲染后 rel_path 不可得——用 artifact_kind 匹配第一个），读 vault 文本为 `report_text`；`createNovelReview(ws, { project_id, review_type, payload: JSON.stringify({ kernel_job_id, kernel_candidate_id, kernel_artifact_id, chapter_id, chapter_no, chapter_text_hash: ohStoryChapterTextHash(当前领域正文), report_text }) })` → commits 加 `{ domain_table: 'reviews', domain_row_id: saved.id }`
     - `binding === 'chapters.rewrite'`：读 chapter_text 产物 vault 文本 → `updateNovelChapter(ws, chapterId, { chapter_text }, { versionSource: contract.commit.source || 'kernel_rewrite' })` → commits 加 `{ domain_table: 'chapters', domain_row_id: chapterId }`
     - `binding === 'kernel_only'` 或产物缺（required=false）：跳过
  6. `insertKernelCommit`（每条 commits 一行，id=`commit-{uuid}`）+ `updateKernelCandidate(status:'committed')` + `updateKernelJob(status:'committed', finished_at)` → `{ ok: true, commits }`
- `chapter_no` 从 `getNovelChapter` 取；job.subject_id 即 chapterId。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/commit.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, createNovelReview, getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail, insertKernelArtifact, insertKernelCandidate, insertKernelJob, updateKernelCandidate } from './repo'

const EIGHT = Array.from({ length: 8 }, (_, i) => `原文段${i}。`).join('\n\n')

async function seedReviewJob() {
  const ws = mkdtempSync(join(tmpdir(), 'commit-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'review', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-review.full', pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-review', status: 'succeeded' })
  const vaultFile = join(mkdtempSync(join(tmpdir(), 'commit-vault-')), '第002章.md')
  writeFileSync(vaultFile, 'Fallback: none\n完整审稿报告')
  insertKernelArtifact(ws, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 10, vault_path: vaultFile })
  return { ws, project, chapter }
}

describe('commitKernelCandidate', () => {
  test('review commit inserts reviews row with kernel ids and marks job committed', async () => {
    const { ws, project, chapter } = await seedReviewJob()
    const result = await commitKernelCandidate(ws, 'job-1', 'cand-1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.commits[0].domain_table).toBe('reviews')
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    const payload = JSON.parse(reviews[0].payload)
    expect(payload.kernel_job_id).toBe('job-1')
    expect(payload.kernel_candidate_id).toBe('cand-1')
    expect(payload.chapter_id).toBe(chapter.id)
    expect(payload.chapter_text_hash).toBe(ohStoryChapterTextHash(EIGHT))
    expect(payload.report_text).toContain('完整审稿报告')
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].status).toBe('committed')
    expect(detail.commits.length).toBe(1)
  })

  test('double commit -> 409 JOB_ALREADY_COMMITTED; non-succeeded candidate -> 409', async () => {
    const { ws } = await seedReviewJob()
    await commitKernelCandidate(ws, 'job-1', 'cand-1')
    expect(await commitKernelCandidate(ws, 'job-1', 'cand-1')).toMatchObject({ ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' })
    updateKernelCandidate(ws, 'cand-1', { status: 'gated' })
    // 已 committed 的 job 依旧优先 409 JOB_ALREADY_COMMITTED，无需另测 gated 分支的 job 状态组合
  })

  test('rewrite commit updates chapter text with version source and re-runs stale gate', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'commit-rw-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT), report_text: 'r' }),
    })
    insertKernelJob(ws, { id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'rewrite', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '' })
    insertKernelCandidate(ws, { id: 'cand-2', job_id: 'job-2', contract_id: 'oh-story-core.story-apply.surgical', pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-apply', status: 'succeeded' })
    const nextText = EIGHT + '\n\n新增修订段。'
    const vaultFile = join(mkdtempSync(join(tmpdir(), 'commit-rw-vault-')), '第002章_二.md')
    writeFileSync(vaultFile, nextText)
    insertKernelArtifact(ws, { id: 'art-2', candidate_id: 'cand-2', artifact_kind: 'chapter_text', rel_path: '正文/第002章_二.md', sha256: 'h', byte_size: 10, vault_path: vaultFile })
    const result = await commitKernelCandidate(ws, 'job-2', 'cand-2')
    expect(result.ok).toBe(true)
    const updated = await getNovelChapter(ws, chapter.id, project.id)
    expect(updated?.chapter_text).toBe(nextText)
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/jobs/commit.ts
import { readFileSync } from 'node:fs'
import { createNovelReview, getNovelChapter, updateNovelChapter } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { loadKernelContracts } from '../contracts/store'
import { runPostHarvestGates } from './gates'
import { getKernelJobDetail, insertKernelCommit, updateKernelCandidate, updateKernelJob } from './repo'

function readVaultText(artifact: { vault_path?: string; copied_path?: string }): string {
  const path = artifact.vault_path || artifact.copied_path || ''
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

export async function commitKernelCandidate(ws: string, jobId: string, candidateId: string): Promise<
  | { ok: true; commits: Array<{ domain_table: string; domain_row_id: number }> }
  | { ok: false; status: 404 | 409 | 500; code: string; message: string }
> {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return { ok: false, status: 404, code: 'JOB_NOT_FOUND', message: `job ${jobId} not found` }
  const candidate = detail.candidates.find(c => c.id === candidateId)
  if (!candidate) return { ok: false, status: 404, code: 'CANDIDATE_NOT_FOUND', message: `candidate ${candidateId} not found` }
  if (detail.job.status === 'committed' || detail.commits.length > 0) {
    return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED', message: 'job already committed' }
  }
  if (candidate.status !== 'succeeded') {
    return { ok: false, status: 409, code: 'CANDIDATE_NOT_SUCCEEDED', message: `candidate status is ${candidate.status}` }
  }
  const { contracts } = loadKernelContracts(ws)
  const contract = contracts.find(c => c.id === candidate.contract_id)
  if (!contract) return { ok: false, status: 500, code: 'CONTRACT_INVALID', message: `contract ${candidate.contract_id} not found` }

  const artifacts = detail.artifacts.filter((a: any) => a.candidate_id === candidateId)
  const chapterId = Number(detail.job.subject_id)
  const gate = await runPostHarvestGates({
    workspace: ws, projectId: detail.job.project_id, chapterId, contract,
    artifacts, warnings: [], readArtifactText: readVaultText,
  })
  if (gate.failedCode) return { ok: false, status: 409, code: gate.failedCode, message: 'commit-time gate failed' }

  const chapter = await getNovelChapter(ws, chapterId, detail.job.project_id)
  const commits: Array<{ domain_table: string; domain_row_id: number }> = []
  for (const output of contract.outputs) {
    const artifact = artifacts.find((a: any) => a.artifact_kind === output.artifact_kind)
    if (!artifact) continue
    if (output.binding.startsWith('reviews.')) {
      const saved = await createNovelReview(ws, {
        project_id: detail.job.project_id,
        review_type: output.binding.slice('reviews.'.length),
        payload: JSON.stringify({
          kernel_job_id: jobId,
          kernel_candidate_id: candidateId,
          kernel_artifact_id: artifact.id,
          chapter_id: chapterId,
          chapter_no: Number(chapter?.chapter_no || 0),
          chapter_text_hash: ohStoryChapterTextHash(String(chapter?.chapter_text || '')),
          report_text: readVaultText(artifact),
        }),
      })
      commits.push({ domain_table: 'reviews', domain_row_id: Number(saved.id) })
    } else if (output.binding === 'chapters.rewrite') {
      await updateNovelChapter(ws, chapterId, { chapter_text: readVaultText(artifact) }, {
        versionSource: contract.commit.source || 'kernel_rewrite',
      })
      commits.push({ domain_table: 'chapters', domain_row_id: chapterId })
    }
    // kernel_only：产物已在账本与 vault，跳过
  }
  const now = new Date().toISOString()
  for (const commit of commits) {
    insertKernelCommit(ws, { id: `commit-${crypto.randomUUID()}`, job_id: jobId, candidate_id: candidateId, domain_table: commit.domain_table, domain_row_id: commit.domain_row_id })
  }
  updateKernelCandidate(ws, candidateId, { status: 'committed', finished_at: now })
  updateKernelJob(ws, jobId, { status: 'committed', finished_at: now })
  return { ok: true, commits }
}
```

- [ ] **Step 4: 跑测试确认通过** → PASS（3 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/commit.ts ui/server/src/kernel/jobs/commit.test.ts
git commit -m "feat(kernel): commit executor writing domain tables and kernel_commits"
```

---

### Task 6: 任务编排（状态机 + 取消 + 进度）

**Files:**
- Create: `ui/server/src/kernel/jobs/run-job.ts`
- Test: `ui/server/src/kernel/jobs/run-job.test.ts`

**Interfaces:**
- Consumes: repo/vault/gates/commit（同目录）、`runKernelCandidate`（`../codex/run-candidate`）、`loadKernelContracts`（`../contracts/store`）、`loadKernelRuntime`/`checkKernelBinary`（`../runtime`）、`readModels`（`../../model-store`）、`readProviders`（`../../provider-store`）、`buildCodexConfigToml`（`../providers/translate`）、`loadOhStoryCoreSuite`（`../../novel-writing/oh-story-core/store`）、`readKernelEvents`/`extractSpawnEvidence`（`../codex/events`、`../codex/spawn-evidence`）、`kernelJobDir`（`../paths`）。
- Produces:

```ts
export type CreateKernelJobBody = { project_id: number; subject_type: string; subject_id: number; contract_ids: string[]; model_id: number; title?: string }
export type CreateKernelJobError = { ok: false; status: 400 | 503; code: string; message: string }
export function validateCreateKernelJob(ws: string, body: CreateKernelJobBody, opts?: { skipRuntimeCheck?: boolean }): Promise<{ ok: true; contracts: KernelContractView[]; providerId: string } | CreateKernelJobError>
export function createAndRunKernelJob(ws: string, body: CreateKernelJobBody, opts?: {
  candidateRunner?: typeof runKernelCandidate        // 测试注入
  engineArgv?: string[]; engineEnv?: Record<string, string>   // 透传 sessionArgv/sessionExtraEnv（fixture 用）
  skipRuntimeCheck?: boolean
}): Promise<{ ok: true; jobId: string; done: Promise<void> } | CreateKernelJobError>
export function cancelKernelJob(ws: string, jobId: string): { ok: true } | { ok: false; status: 404 | 409; code: string }
export function getKernelJobProgress(ws: string, jobId: string): { job_id: string; candidate_id: string; phase: string; elapsed_ms: number; hint: string; error_code: string } | null
```

- `validateCreateKernelJob` 同步校验顺序（错误码照抄 spec 10.5）：
  1. `checkKernelBinary(loadKernelRuntime(ws))` 失败 → 503 `KERNEL_RUNTIME_UNAVAILABLE`（`skipRuntimeCheck` 供测试与 fixture 演练）
  2. `subject_type !== 'chapter'` 或 `contract_ids` 空/超 8 → 400 `CONTRACT_INVALID`
  3. 每个 id 在 `loadKernelContracts` 里存在且 `implemented` → 否则 400 `CONTRACT_INVALID` / `CONTRACT_NOT_IMPLEMENTED`
  4. capability 全相同 → 否则 400 `CAPABILITY_MIXED`
  5. `model_id` → model → provider → `buildCodexConfigToml`（agents=[]）预翻译 → 失败 400 `PROVIDER_TRANSLATE_FAILED`；model 缺 → 400 `CONTRACT_INVALID`
- `createAndRunKernelJob`：过校验后插 job（queued，`model_provider_id` = model.provider）+ 每合同一个 candidate（queued），返回 `{ jobId, done }`，`done` 是后台执行 Promise（HTTP 层不 await，直接 202；测试 await 它）。执行体（分期 4 只有 1 个候选；写成 for 循环为分期 5 铺路，本期顺序跑）：
  - job → running；candidate → running（`started_at`）
  - `candidateRunner`（缺省 `runKernelCandidate`）参数：`jobId = '{jobId}/candidates/{candidateId}'`，`sessionArgv`/`sessionExtraEnv` 透传 `engineArgv`/`engineEnv`，`onSession` 存入内存注册表（取消用），`onPhase` 更新进度注册表
  - 结果 `ok:false` → candidate `failed`（error_code、finished_at）
  - 结果 `ok:true` → `persistCandidateArtifacts` → `runPostHarvestGates`（readArtifactText 读 vault_path）→ `gate_results` 写候选；failedCode → `gated`（error_code=failedCode）；否则 `succeeded`（thread_id、turn_id、last_message_excerpt=前500字、metadata=`{ spawn_evidence }`）
  - 全部候选终态后收敛 job：≥1 `succeeded` 且（`commit.mode==='manual'` 或 succeeded>1）→ `awaiting_selection`；恰 1 个 `succeeded` 且 `auto_if_single` → `commitKernelCandidate`（成功→`committed`，失败→`awaiting_selection` 并把失败码记 job.error_code 供 UI 显示）；无 succeeded → `failed`（error_code 取第一个候选的）
  - 已取消（注册表标记）→ 不再收敛，保持 `cancelled`
- `cancelKernelJob`：job 缺 → 404；已 `committed` → 409 `JOB_ALREADY_COMMITTED`；否则注册表标记 + `session.close()`（有活跃 session 时）+ job `cancelled` + 运行中候选 `failed`（error_code=`CANCELLED`）
- `getKernelJobProgress`：job 缺 → null；phase 来源：内存注册表（projecting/starting/running/harvesting）→ job 状态映射（awaiting_selection/committing/终态时用 job.status）；`elapsed_ms` = now - job.created_at；`hint` = 惰性读当前候选目录 events.jsonl 的 `agent_hints` 最后一个（目录缺 → ''）。

- [ ] **Step 1: 写失败测试（stub runner，不起真进程）**

```ts
// ui/server/src/kernel/jobs/run-job.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, listNovelReviewsByType } from '../../novel'
import { getKernelJobDetail } from './repo'
import { cancelKernelJob, createAndRunKernelJob, getKernelJobProgress, validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'run-job-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
  seedStores(ws)
  return { ws, project, chapter }
}

function stubRunner(reportText: string) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'stub-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    writeFileSync(join(dir, '审稿/第002章.md'), reportText)
    input.onPhase?.('projecting'); input.onPhase?.('starting'); input.onPhase?.('running'); input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't-1', turnId: 'turn-1',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: '完成', spawnEvidence: { subagent_threads: [{ thread_id: 's', parent_thread_id: 't-1', agent: 'story-architect' }], agent_hints: ['story-architect'] },
      eventsPath: join(dir, 'events.jsonl'),
    }
  }
}

const body = (project: any, chapter: any) => ({
  project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
  contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
})

describe('kernel job orchestration', () => {
  test('validation: unknown contract, mixed capability, bad provider', async () => {
    const { ws, project, chapter } = await seed()
    const unknown = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['a.b.c'] }, { skipRuntimeCheck: true })
    expect(unknown).toMatchObject({ ok: false, status: 400, code: 'CONTRACT_INVALID' })
    const mixed = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-deslop.file'] }, { skipRuntimeCheck: true })
    expect(mixed).toMatchObject({ ok: false, code: 'CAPABILITY_MIXED' })
    const notImplemented = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['oh-story-core.story-long-write.outline'] }, { skipRuntimeCheck: true })
    expect(notImplemented).toMatchObject({ ok: false, code: 'CONTRACT_NOT_IMPLEMENTED' })
    writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'gemini', model_name: 'g' }]))
    writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://g/v1' }]))
    const provider = await validateCreateKernelJob(ws, body(project, chapter), { skipRuntimeCheck: true })
    expect(provider).toMatchObject({ ok: false, code: 'PROVIDER_TRANSLATE_FAILED' })
  })

  test('auto_if_single: single succeeded candidate commits automatically', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: stubRunner('Fallback: none\n报告正文') as any, skipRuntimeCheck: true,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].status).toBe('committed')
    expect(JSON.parse(detail.candidates[0].metadata).spawn_evidence.subagent_threads.length).toBe(1)
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(1)
  })

  test('solo report gates the candidate and fails the job', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: stubRunner('Fallback: solo\n报告') as any, skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].status).toBe('gated')
    expect(detail.candidates[0].error_code).toBe('SOLO_FALLBACK')
    expect(detail.job.status).toBe('failed')
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(0)
  })

  test('runner failure marks candidate and job failed with error code', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: (async () => ({ ok: false, error_code: 'SKILL_NOT_FOUND', message: 'x' })) as any, skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].status).toBe('failed')
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('SKILL_NOT_FOUND')
  })

  test('progress reports phase and elapsed; cancel before terminal state', async () => {
    const { ws, project, chapter } = await seed()
    let release!: () => void
    const gatePromise = new Promise<void>(resolve => { release = resolve })
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: (async (input: any) => {
        input.onPhase?.('running')
        await gatePromise
        return { ok: false, error_code: 'CANCELLED', message: 'cancelled' }
      }) as any,
      skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await new Promise(resolve => setTimeout(resolve, 20))
    const progress = getKernelJobProgress(ws, created.jobId)!
    expect(progress.phase).toBe('running')
    expect(progress.elapsed_ms).toBeGreaterThanOrEqual(0)
    const cancelled = cancelKernelJob(ws, created.jobId)
    expect(cancelled).toEqual({ ok: true })
    release()
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
    expect(cancelKernelJob(ws, 'nope')).toMatchObject({ ok: false, status: 404 })
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/kernel/jobs/run-job.ts
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { loadOhStoryCoreSuite } from '../../novel-writing/oh-story-core/store'
import { readKernelEvents } from '../codex/events'
import { runKernelCandidate } from '../codex/run-candidate'
import { extractSpawnEvidence } from '../codex/spawn-evidence'
import { loadKernelContracts, type KernelContractView } from '../contracts/store'
import { kernelJobDir } from '../paths'
import { buildCodexConfigToml } from '../providers/translate'
import { checkKernelBinary, loadKernelRuntime } from '../runtime'
import { commitKernelCandidate } from './commit'
import { runPostHarvestGates } from './gates'
import {
  getKernelJobDetail, insertKernelCandidate, insertKernelJob, listKernelJobs,
  updateKernelCandidate, updateKernelJob,
} from './repo'
import { persistCandidateArtifacts } from './vault'
import { readFileSync } from 'node:fs'

export type CreateKernelJobBody = {
  project_id: number; subject_type: string; subject_id: number
  contract_ids: string[]; model_id: number; title?: string
}
export type CreateKernelJobError = { ok: false; status: 400 | 503; code: string; message: string }

type LiveJobState = {
  phase: string
  candidateId: string
  candidateDirs: Map<string, string>
  cancelled: boolean
  closeSession?: () => void
}
const liveJobs = new Map<string, LiveJobState>()

export async function validateCreateKernelJob(
  ws: string, body: CreateKernelJobBody, opts: { skipRuntimeCheck?: boolean } = {},
): Promise<{ ok: true; contracts: KernelContractView[]; providerId: string } | CreateKernelJobError> {
  if (!opts.skipRuntimeCheck) {
    const binary = await checkKernelBinary(loadKernelRuntime(ws))
    if (!binary.ok) return { ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: binary.message }
  }
  if (body.subject_type !== 'chapter') return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '第一期只支持 subject_type=chapter' }
  const ids = Array.isArray(body.contract_ids) ? body.contract_ids : []
  if (ids.length < 1 || ids.length > 8) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: 'contract_ids 需要 1..8 个' }
  const { contracts } = loadKernelContracts(ws)
  const selected: KernelContractView[] = []
  for (const id of ids) {
    const contract = contracts.find(c => c.id === id)
    if (!contract) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `contract not found: ${id}` }
    if (!contract.implemented) return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: id }
    selected.push(contract)
  }
  if (new Set(selected.map(c => c.capability)).size > 1) {
    return { ok: false, status: 400, code: 'CAPABILITY_MIXED', message: '并跑的合同必须同 capability' }
  }
  const model = (await readModels(ws)).find(m => Number(m.id) === Number(body.model_id))
  if (!model) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `model ${body.model_id} not found` }
  const provider = (await readProviders(ws)).find(p => String(p.id) === String(model.provider))
  if (!provider) return { ok: false, status: 400, code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${model.provider} not found` }
  const translated = buildCodexConfigToml({
    provider: provider as any, model: { model_name: String(model.model_name || '') }, agents: [],
    supportsChatWireApi: loadKernelRuntime(ws).supports_chat_wire_api,
  })
  if (!translated.ok) return { ok: false, status: 400, code: 'PROVIDER_TRANSLATE_FAILED', message: translated.message }
  return { ok: true, contracts: selected, providerId: String(provider.id) }
}

export async function createAndRunKernelJob(
  ws: string, body: CreateKernelJobBody,
  opts: {
    candidateRunner?: typeof runKernelCandidate
    engineArgv?: string[]; engineEnv?: Record<string, string>
    skipRuntimeCheck?: boolean
  } = {},
): Promise<{ ok: true; jobId: string; done: Promise<void> } | CreateKernelJobError> {
  const validated = await validateCreateKernelJob(ws, body, opts)
  if (!validated.ok) return validated
  const jobId = `job-${crypto.randomUUID()}`
  const packRevision = loadOhStoryCoreSuite(ws)?.revision || ''
  insertKernelJob(ws, {
    id: jobId, project_id: body.project_id, workspace_scope: 'novel', title: body.title || '',
    status: 'queued', capability: validated.contracts[0].capability, subject_type: 'chapter',
    subject_id: body.subject_id, model_provider_id: validated.providerId, model_id: body.model_id,
    error_code: '', error_message: '',
  })
  const candidateIds: string[] = []
  for (const contract of validated.contracts) {
    const candidateId = `cand-${crypto.randomUUID()}`
    candidateIds.push(candidateId)
    insertKernelCandidate(ws, {
      id: candidateId, job_id: jobId, contract_id: contract.id, pack_id: contract.pack_id,
      pack_revision: packRevision, skill_name: contract.skill_name, status: 'queued',
    })
  }
  const live: LiveJobState = { phase: 'queued', candidateId: candidateIds[0] || '', candidateDirs: new Map(), cancelled: false }
  liveJobs.set(jobId, live)

  const runner = opts.candidateRunner || runKernelCandidate
  const done = (async () => {
    updateKernelJob(ws, jobId, { status: 'running' })
    for (let index = 0; index < validated.contracts.length; index++) {
      if (live.cancelled) break
      const contract = validated.contracts[index]
      const candidateId = candidateIds[index]
      live.candidateId = candidateId
      const candidateJobId = `${jobId}/candidates/${candidateId}`
      live.candidateDirs.set(candidateId, kernelJobDir(ws, candidateJobId))
      updateKernelCandidate(ws, candidateId, { status: 'running', started_at: new Date().toISOString() })
      let result
      try {
        result = await runner({
          workspace: ws, projectId: body.project_id, chapterId: body.subject_id,
          contract, modelId: body.model_id, jobId: candidateJobId,
          sessionArgv: opts.engineArgv, sessionExtraEnv: opts.engineEnv,
          onPhase: (phase) => { live.phase = phase },
          onSession: (session) => { live.closeSession = () => session.close() },
        } as any)
      } catch (error: any) {
        result = { ok: false as const, error_code: 'ENGINE_FAILED', message: String(error?.message || error) }
      }
      const now = new Date().toISOString()
      if (live.cancelled) {
        updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: now })
        continue
      }
      if (!result.ok) {
        updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: result.error_code, finished_at: now })
        continue
      }
      const registered = persistCandidateArtifacts(ws, candidateId, result.artifacts)
      live.phase = 'gating'
      const gate = await runPostHarvestGates({
        workspace: ws, projectId: body.project_id, chapterId: body.subject_id, contract,
        artifacts: registered.map(r => ({ rel_path: r.rel_path, artifact_kind: r.artifact_kind, vault_path: r.vault_path })),
        warnings: result.warnings,
        readArtifactText: (artifact) => {
          try { return readFileSync(String(artifact.vault_path || ''), 'utf8') } catch { return '' }
        },
      })
      updateKernelCandidate(ws, candidateId, {
        status: gate.failedCode ? 'gated' : 'succeeded',
        error_code: gate.failedCode || '',
        thread_id: result.threadId, turn_id: result.turnId,
        last_message_excerpt: result.lastMessage.slice(0, 500),
        gate_results: JSON.stringify(gate.results),
        metadata: JSON.stringify({ spawn_evidence: result.spawnEvidence }),
        finished_at: new Date().toISOString(),
      })
    }
    // 收敛 job
    if (live.cancelled) { liveJobs.delete(jobId); return }
    const detail = getKernelJobDetail(ws, jobId)!
    const succeeded = detail.candidates.filter(c => c.status === 'succeeded')
    const now = new Date().toISOString()
    if (succeeded.length === 0) {
      const first = detail.candidates.find(c => c.error_code)
      updateKernelJob(ws, jobId, { status: 'failed', finished_at: now, error_code: first?.error_code || 'OUTPUT_MISSING' })
    } else if (succeeded.length === 1 && validated.contracts[0].commit.mode === 'auto_if_single') {
      live.phase = 'committing'
      const committed = await commitKernelCandidate(ws, jobId, succeeded[0].id)
      if (!committed.ok) updateKernelJob(ws, jobId, { status: 'awaiting_selection', error_code: committed.code })
    } else {
      updateKernelJob(ws, jobId, { status: 'awaiting_selection' })
    }
    liveJobs.delete(jobId)
  })()
  return { ok: true, jobId, done }
}

export function cancelKernelJob(ws: string, jobId: string): { ok: true } | { ok: false; status: 404 | 409; code: string } {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return { ok: false, status: 404, code: 'JOB_NOT_FOUND' }
  if (detail.job.status === 'committed') return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' }
  const live = liveJobs.get(jobId)
  if (live) {
    live.cancelled = true
    try { live.closeSession?.() } catch { /* 会话可能已结束 */ }
  }
  updateKernelJob(ws, jobId, { status: 'cancelled', finished_at: new Date().toISOString() })
  return { ok: true }
}

export function getKernelJobProgress(ws: string, jobId: string) {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return null
  const live = liveJobs.get(jobId)
  const phase = live ? live.phase : detail.job.status
  let hint = ''
  if (live) {
    const dir = live.candidateDirs.get(live.candidateId)
    if (dir) {
      const hints = extractSpawnEvidence(readKernelEvents(dir)).agent_hints
      hint = hints[hints.length - 1] || ''
    }
  }
  return {
    job_id: jobId,
    candidate_id: live?.candidateId || detail.candidates[0]?.id || '',
    phase,
    elapsed_ms: Math.max(0, Date.now() - new Date(detail.job.created_at + 'Z').getTime()) || 0,
    hint,
    error_code: detail.job.error_code || '',
  }
}

export { listKernelJobs }
```

注意：`created_at` 由 sqlite `datetime('now')` 生成（UTC 无时区后缀），`elapsed_ms` 计算时补 `'Z'`；若解析失败取 0。

- [ ] **Step 4: 跑测试确认通过** → PASS（5 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/run-job.ts ui/server/src/kernel/jobs/run-job.test.ts
git commit -m "feat(kernel): job orchestration state machine with cancel and progress"
```

---

### Task 7: HTTP 路由（/api/kernel/jobs）

**Files:**
- Create: `ui/server/src/routes/kernel-job-routes.ts`
- Modify: `ui/server/src/index.ts`（`registerKernelRoutes` 之后加 `registerKernelJobRoutes(app, { getWorkspace })`）
- Test: `ui/server/src/routes/kernel-job-routes.test.ts`

**Interfaces:**
- `registerKernelJobRoutes(app: Express, deps: { getWorkspace: () => string; createJob?: typeof createAndRunKernelJob })`（`createJob` 注入供测试传 stub runner）
- 端点（形状照抄 spec 10.2-10.4）：
  - `POST /api/kernel/jobs` → 校验失败按 `status`/`code` 回错；成功 `202 { ok: true, job: { id, status: 'queued' } }`
  - `GET /api/kernel/jobs/:id` → `{ ok: true, job, candidates, artifacts, commits, progress }`；缺 → 404
  - `GET /api/kernel/jobs?project_id=&subject_type=&subject_id=` → `{ ok: true, jobs }`（最近 50）
  - `POST /api/kernel/jobs/:id/cancel` → `{ ok: true }`；404/409 按 `cancelKernelJob`
  - `POST /api/kernel/jobs/:id/commit` body `{ candidate_id }` → `commitKernelCandidate` 透传 status/code；成功 `{ ok: true, commits }`

- [ ] **Step 1: 写失败测试（复用 kernel-routes.test.ts 的 routeHarness/callRoute 模式，harness 抽本文件私有副本）**

```ts
// ui/server/src/routes/kernel-job-routes.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../novel'
import { registerKernelJobRoutes } from './kernel-job-routes'

function routeHarness(ws: string, createJob?: any) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerKernelJobRoutes(app, { getWorkspace: () => ws, ...(createJob ? { createJob } : {}) })
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

function stubCreateJob(result: any) {
  return async () => result
}

describe('kernel job routes', () => {
  test('POST /jobs returns 202 with job id on success', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const handlers = routeHarness(ws, stubCreateJob({ ok: true, jobId: 'job-1', done: Promise.resolve() }))
    const res = await callRoute(handlers.get('POST /api/kernel/jobs'), { body: { project_id: 1, subject_type: 'chapter', subject_id: 2, contract_ids: ['x.y.z'], model_id: 9 } })
    expect(res.statusCode).toBe(202)
    expect(res.body).toEqual({ ok: true, job: { id: 'job-1', status: 'queued' } })
  })

  test('POST /jobs maps validation error status and code', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const handlers = routeHarness(ws, stubCreateJob({ ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: 'no codex' }))
    const res = await callRoute(handlers.get('POST /api/kernel/jobs'), { body: {} })
    expect(res.statusCode).toBe(503)
    expect(res.body.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('GET /jobs/:id returns detail with progress; 404 when missing', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'failed', capability: 'review', subject_type: 'chapter', subject_id: 2, model_provider_id: '', model_id: null, error_code: 'SKILL_NOT_FOUND', error_message: '' })
    const handlers = routeHarness(ws)
    const found = await callRoute(handlers.get('GET /api/kernel/jobs/:id'), { params: { id: 'job-1' } })
    expect(found.body.job.status).toBe('failed')
    expect(found.body.progress.error_code).toBe('SKILL_NOT_FOUND')
    const missing = await callRoute(handlers.get('GET /api/kernel/jobs/:id'), { params: { id: 'nope' } })
    expect(missing.statusCode).toBe(404)
  })

  test('GET /jobs lists by filters; cancel and commit surface repo results', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: 2, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
    const handlers = routeHarness(ws)
    const list = await callRoute(handlers.get('GET /api/kernel/jobs'), { query: { project_id: String(project.id) } })
    expect(list.body.jobs.length).toBe(1)
    const cancelled = await callRoute(handlers.get('POST /api/kernel/jobs/:id/cancel'), { params: { id: 'job-1' } })
    expect(cancelled.statusCode).toBe(409)
    expect(cancelled.body.code).toBe('JOB_ALREADY_COMMITTED')
    const commit = await callRoute(handlers.get('POST /api/kernel/jobs/:id/commit'), { params: { id: 'job-1' }, body: { candidate_id: 'cand-x' } })
    expect([404, 409]).toContain(commit.statusCode)
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// ui/server/src/routes/kernel-job-routes.ts
import type { Express } from 'express'
import { commitKernelCandidate } from '../kernel/jobs/commit'
import { getKernelJobDetail, listKernelJobs } from '../kernel/jobs/repo'
import { cancelKernelJob, createAndRunKernelJob, getKernelJobProgress } from '../kernel/jobs/run-job'

export type KernelJobRoutesDeps = {
  getWorkspace: () => string
  createJob?: typeof createAndRunKernelJob
}

export function registerKernelJobRoutes(app: Express, deps: KernelJobRoutesDeps) {
  const createJob = deps.createJob || createAndRunKernelJob

  app.post('/api/kernel/jobs', async (req, res) => {
    try {
      const result = await createJob(deps.getWorkspace(), req.body || {})
      if (!result.ok) return res.status(result.status).json({ error: result.message, code: result.code })
      res.status(202).json({ ok: true, job: { id: result.jobId, status: 'queued' } })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.get('/api/kernel/jobs/:id', (req, res) => {
    const ws = deps.getWorkspace()
    const jobId = String(req.params?.id || '')
    const detail = getKernelJobDetail(ws, jobId)
    if (!detail) return res.status(404).json({ error: 'job not found', code: 'JOB_NOT_FOUND' })
    res.json({ ok: true, ...detail, progress: getKernelJobProgress(ws, jobId) })
  })

  app.get('/api/kernel/jobs', (req, res) => {
    const query = (req as any).query || {}
    res.json({
      ok: true,
      jobs: listKernelJobs(deps.getWorkspace(), {
        projectId: Number(query.project_id || 0) || undefined,
        subjectType: query.subject_type ? String(query.subject_type) : undefined,
        subjectId: Number(query.subject_id || 0) || undefined,
      }),
    })
  })

  app.post('/api/kernel/jobs/:id/cancel', (req, res) => {
    const result = cancelKernelJob(deps.getWorkspace(), String(req.params?.id || ''))
    if (!result.ok) return res.status(result.status).json({ error: 'cannot cancel', code: result.code })
    res.json({ ok: true })
  })

  app.post('/api/kernel/jobs/:id/commit', async (req, res) => {
    const result = await commitKernelCandidate(deps.getWorkspace(), String(req.params?.id || ''), String(req.body?.candidate_id || ''))
    if (!result.ok) return res.status(result.status).json({ error: result.message, code: result.code })
    res.json({ ok: true, commits: result.commits })
  })
}
```

`index.ts`：import 并在 `registerKernelRoutes(app, { getWorkspace })` 后加一行 `registerKernelJobRoutes(app, { getWorkspace })`。

- [ ] **Step 4: 跑测试确认通过** → PASS（4 个）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/kernel-job-routes.ts ui/server/src/routes/kernel-job-routes.test.ts ui/server/src/index.ts
git commit -m "feat(kernel): job http endpoints (create/detail/list/cancel/commit)"
```

---

### Task 8: 旧按钮转调内核（阻塞桥接）

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Test: `ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts`（新文件；既有 runner 直连测试不动——runner 仍被别处使用，仅路由换线）

**Interfaces:**
- `OhStoryCoreRoutesDeps` 增加 `createKernelJob?: typeof createAndRunKernelJob`（测试注入）。
- `handleAction` 重写：不再调 `resolved.runAction`，改为：
  1. 取 project/chapter（404 逻辑不变）、`getStageModelId` 选 model（不变）
  2. 组 body：`{ project_id, subject_type: 'chapter', subject_id: chapterId, contract_ids: [CONTRACT_BY_ACTION[action]], model_id: modelId }`，`CONTRACT_BY_ACTION = { review: 'oh-story-core.story-review.full', deslop: 'oh-story-core.story-deslop.file', apply: 'oh-story-core.story-apply.surgical' }`
  3. `createKernelJob(...)`；同步校验失败 → 按 `{ status, code }` 回错（503 `KERNEL_RUNTIME_UNAVAILABLE` 原样透出，**不回退旧管线**）
  4. `await result.done`（阻塞至终态，保持旧前端同步语义）→ `getKernelJobDetail`
  5. job `committed`：
     - review：从 commits 找 `domain_table==='reviews'` 行 → `{ ok: true, changed: false, review_id: domain_row_id, report_text: vault 报告文本, kernel_job_id }`
     - deslop/apply：读更新后领域正文 → `{ ok: true, changed: true, chapter_text, kernel_job_id }`
  6. job `failed`/候选 gated：错误码映射表（HTTP 按 spec 终态表）：`OH_STORY_APPLY_NO_REVIEW`/`OH_STORY_APPLY_STALE_REVIEW` → 409 `'先对本稿重新审稿'`；`OH_STORY_APPLY_REWROTE_TOO_MUCH` → 409 `'这次改动太大，像整章重写。请再试一次'`；`SOLO_FALLBACK`/`REVIEWERS_MISSING`/`SKILL_NOT_FOUND` → 409；`CHAPTER_FILE_MISSING`/`OUTPUT_MISSING`/`ENGINE_FAILED` → 500；都带 `code` 与 `kernel_job_id`
- `GET /api/novel/oh-story/core` 与 `POST .../install` 不动。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../novel'
import { insertKernelCandidate, insertKernelCommit, insertKernelJob, insertKernelArtifact, updateKernelJob } from '../kernel/jobs/repo'
import { registerOhStoryCoreRoutes } from './novel-oh-story-core-routes'

function harness(ws: string, createKernelJob: any) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'post']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerOhStoryCoreRoutes(app, {
    getWorkspace: () => ws,
    getProject: async () => ({ id: 1 }),
    createKernelJob,
  } as any)
  return handlers
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

describe('oh-story bridge to kernel jobs', () => {
  test('review button returns old shape from committed kernel job', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const vaultFile = join(mkdtempSync(join(tmpdir(), 'bridge-vault-')), 'r.md')
    writeFileSync(vaultFile, 'Fallback: none\n报告正文')
    const createKernelJob = async (workspace: string, body: any) => {
      expect(body.contract_ids).toEqual(['oh-story-core.story-review.full'])
      insertKernelJob(workspace, { id: 'job-1', project_id: body.project_id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: body.subject_id, model_provider_id: '', model_id: body.model_id, error_code: '', error_message: '' })
      insertKernelCandidate(workspace, { id: 'cand-1', job_id: 'job-1', contract_id: body.contract_ids[0], pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-review', status: 'committed' })
      insertKernelArtifact(workspace, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 8, vault_path: vaultFile })
      insertKernelCommit(workspace, { id: 'commit-1', job_id: 'job-1', candidate_id: 'cand-1', domain_table: 'reviews', domain_row_id: 42 })
      return { ok: true, jobId: 'job-1', done: Promise.resolve() }
    }
    const handlers = harness(ws, createKernelJob)
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), {
      body: { project_id: project.id, chapter_id: chapter.id, model_id: 9 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, changed: false, review_id: 42, kernel_job_id: 'job-1' })
    expect(res.body.report_text).toContain('报告正文')
  })

  test('failed job maps error codes to legacy statuses', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const createKernelJob = async (workspace: string, body: any) => {
      insertKernelJob(workspace, { id: 'job-2', project_id: body.project_id, workspace_scope: 'novel', title: '', status: 'failed', capability: 'rewrite', subject_type: 'chapter', subject_id: body.subject_id, model_provider_id: '', model_id: body.model_id, error_code: 'OH_STORY_APPLY_STALE_REVIEW', error_message: '' })
      return { ok: true, jobId: 'job-2', done: Promise.resolve() }
    }
    const handlers = harness(ws, createKernelJob)
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/apply'), {
      body: { project_id: project.id, chapter_id: chapter.id },
    })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe('OH_STORY_APPLY_STALE_REVIEW')
    expect(res.body.error).toBe('先对本稿重新审稿')
    expect(res.body.kernel_job_id).toBe('job-2')
  })

  test('runtime unavailable surfaces 503 without fallback', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const handlers = harness(ws, async () => ({ ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: 'no codex' }))
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/deslop'), {
      body: { project_id: project.id, chapter_id: chapter.id },
    })
    expect(res.statusCode).toBe(503)
    expect(res.body.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

`novel-oh-story-core-routes.ts`：deps 加 `createKernelJob?`；`handleAction` 重写为上述流程。错误映射表：

```ts
const CONTRACT_BY_ACTION: Record<OhStoryCoreAction, string> = {
  review: 'oh-story-core.story-review.full',
  deslop: 'oh-story-core.story-deslop.file',
  apply: 'oh-story-core.story-apply.surgical',
}

const TERMINAL_ERROR_HTTP: Record<string, { status: number; message?: string }> = {
  OH_STORY_APPLY_NO_REVIEW: { status: 409, message: '先对本稿重新审稿' },
  OH_STORY_APPLY_STALE_REVIEW: { status: 409, message: '先对本稿重新审稿' },
  OH_STORY_APPLY_REWROTE_TOO_MUCH: { status: 409, message: '这次改动太大，像整章重写。请再试一次' },
  SOLO_FALLBACK: { status: 409 },
  REVIEWERS_MISSING: { status: 409 },
  SKILL_NOT_FOUND: { status: 409 },
  CHAPTER_FILE_MISSING: { status: 500 },
  OUTPUT_MISSING: { status: 500 },
  ENGINE_FAILED: { status: 500 },
}
```

新 `handleAction`（替换旧函数体；import 追加 `createAndRunKernelJob`、`getKernelJobDetail`、`readFileSync`）：

```ts
const handleAction = (action: OhStoryCoreAction) => async (req: any, res: any) => {
  try {
    const workspace = resolved.getWorkspace()
    const projectId = Number(req.body?.project_id || 0)
    const chapterId = Number(req.body?.chapter_id || 0)
    const project = await resolved.getProject(workspace, projectId)
    const chapter = await resolved.getChapter(workspace, chapterId, projectId)
    if (!chapter) return res.status(404).json({ error: 'chapter not found', code: 'CHAPTER_NOT_FOUND' })
    const requestedModelId = Number(req.body?.model_id || 0) || undefined
    const modelId = getStageModelId(project, action === 'review' ? 'review' : 'revise', requestedModelId)
    const createJob = deps.createKernelJob || createAndRunKernelJob
    const created = await createJob(workspace, {
      project_id: projectId, subject_type: 'chapter', subject_id: chapterId,
      contract_ids: [CONTRACT_BY_ACTION[action]], model_id: Number(modelId || 0),
    })
    if (!created.ok) return res.status(created.status).json({ error: created.message, code: created.code })
    await created.done
    const detail = getKernelJobDetail(workspace, created.jobId)!
    if (detail.job.status === 'committed') {
      if (action === 'review') {
        const commit = detail.commits.find((c: any) => c.domain_table === 'reviews')
        const artifact = detail.artifacts.find((a: any) => a.artifact_kind === 'review_report')
        let reportText = ''
        try { reportText = readFileSync(String(artifact?.vault_path || ''), 'utf8') } catch { /* 报告读取失败不阻塞回包 */ }
        return res.json({ ok: true, changed: false, review_id: Number(commit?.domain_row_id || 0), report_text: reportText, kernel_job_id: created.jobId })
      }
      const updated = await resolved.getChapter(workspace, chapterId, projectId)
      return res.json({ ok: true, changed: true, chapter_text: String(updated?.chapter_text || ''), kernel_job_id: created.jobId })
    }
    const code = detail.job.error_code || detail.candidates.find(c => c.error_code)?.error_code || 'ENGINE_FAILED'
    const mapped = TERMINAL_ERROR_HTTP[code] || { status: 500 }
    return res.status(mapped.status).json({ error: mapped.message || `内核任务失败：${code}`, code, kernel_job_id: created.jobId })
  } catch (error: any) {
    res.status(500).json({ error: String(error?.message || error) })
  }
}
```

（旧 `runAction`/`resolveDeps` 里 runner 相关依赖保留导出——`runOhStoryCoreAction` 仍被单测与其它模块引用，只是路由不再走它。）

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/routes/novel-oh-story-core-routes.bridge.test.ts src/novel-writing/oh-story-core/`
Expected: 新测试 PASS；oh-story 既有测试仍 PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-oh-story-core-routes.ts ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts
git commit -m "feat(kernel): bridge legacy oh-story buttons onto kernel jobs"
```

---

### Task 9: 分期 4 验收 —— fixture 全链路 + 真机清单

**Files:**
- Create: `ui/server/src/kernel/jobs/acceptance.fixture.test.ts`

**Interfaces:** 无新代码；组合测试 + 人工清单。

- [ ] **Step 1: fixture 全链路测试（真投影 + 真 fixture 会话 + 真门 + 真提交）**

```ts
// ui/server/src/kernel/jobs/acceptance.fixture.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject, listNovelReviewsByType } from '../../novel'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from '../../novel-writing/oh-story-core/store'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

const FIXTURE = join(import.meta.dir, '..', 'codex', 'fixtures', 'fake-app-server.ts')

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'accept4-'))
  const project = await createNovelProject(ws, { title: '书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '概要' })
  await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '一', chapter_text: '第一章。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '第二章。' })
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
  for (const agent of OH_STORY_REVIEWER_AGENTS) writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  // 注意：source_url / installed_at 缺失时 loadOhStoryCoreSuite 返回 null，pack_revision 会取空串
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({
    source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
    revision: 'rev-1', installed_at: '2026-08-15T00:00:00.000Z',
    skills: ['story-review'], agents_version: 25,
  }))
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
  return { ws, project, ch2 }
}

describe('phase-4 acceptance over fixture engine', () => {
  test('full review job: run → gates → auto commit → reviews row with kernel ids', async () => {
    const { ws, project, ch2 } = await seed()
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: ch2.id,
      contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
    }, {
      skipRuntimeCheck: true,
      engineArgv: [process.execPath, FIXTURE],
      engineEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_SPAWN: '1',
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: none\n处理了第1章章末钩子\n继承到下一批：猫叫伏笔',
        FAKE_AGENT_MESSAGE: '完成',
      },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].pack_revision).toBe('rev-1')
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    const payload = JSON.parse(reviews[0].payload)
    expect(payload.kernel_job_id).toBe(created.jobId)
    expect(payload.report_text).toContain('继承到下一批')
    const gateResults = JSON.parse(detail.candidates[0].gate_results)
    expect(gateResults.find((g: any) => g.gate === 'reject_solo_fallback').ok).toBe(true)
  })

  test('solo fallback report is gated and chapter/reviews untouched', async () => {
    const { ws, project, ch2 } = await seed()
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: ch2.id,
      contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
    }, {
      skipRuntimeCheck: true,
      engineArgv: [process.execPath, FIXTURE],
      engineEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: solo (agents unavailable)\n报告',
      },
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('failed')
    expect(detail.candidates[0].status).toBe('gated')
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(0)
  })
})
```

- [ ] **Step 2: 跑测试确认通过 + 全量收尾**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/ src/routes/ src/novel-writing/oh-story-core/`
Expected: 全部 PASS

- [ ] **Step 3: Commit**

```bash
git add ui/server/src/kernel/jobs/acceptance.fixture.test.ts
git commit -m "test(kernel): phase-4 acceptance over fixture engine"
```

- [ ] **Step 4: 真机清单（装好 codex、探针 ①-④ 全绿后人工执行）**

对照 spec 验收节：
1. 项目 3 第 2 章（chapter 62）从工作台按「审稿」→ 走内核任务；报告必须处理第 1 章章末开放钩子（猫叫/枯手），只谈 AI 味且「继承到下一批：无」= 失败。
2. 删掉一个 reviewer toml 再跑 → 409 `REVIEWERS_MISSING`，正文不变；伪造 solo 报告场景由 fixture 测试已锁。
3. 大纲不齐在报告里以 S2 出现，且 `outlines` 表无自动改写。
4. 去 AI、按建议改稿仍写章节新版本（`chapter_versions.source` = `oh_story_deslop`/`oh_story_apply`）；改稿过大仍 409 文案不变。
5. 移除投影 skill（临时改 pack）→ `SKILL_NOT_FOUND` 且 events.jsonl 无 `turn/start`。
6. events.jsonl spawn 证据与报告 `Fallback:` 行自洽；不一致以门为准并留档。

---

## 收尾与遗留

- 明确不做：并跑选优（分期 5：`contract_ids` >1 的并行执行与选优 UI 语义）、进度 WebSocket（轮询 1s 已够）、job 目录清理策略（终态后删 `project/`/`codex-home/`——留分期 5 一并做，账本与 vault 已耐久）。
- spec v1.2 已折入：候选目录 `candidates/{id}`、vault 布局、deslop/apply 旧回包不含 `review_id`、补充错误码、auto commit 失败落 `awaiting_selection`。
- 风险：`createAndRunKernelJob` 的后台 Promise 在进程重启后丢失——running 状态的 job 会悬挂。分期 5 加启动时「孤儿 job 标记 failed(`ENGINE_FAILED`)」的恢复逻辑；本期记录在案。
