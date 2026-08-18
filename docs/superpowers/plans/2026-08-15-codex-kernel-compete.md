# Codex 内核 · 分期 5（并跑选优）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 spec v1.1 分期 5：同一 `capability` 的多合同（≤8）并行跑，job 进入 `awaiting_selection`，`POST /jobs/:id/commit` 选优提交只让一份进领域表；顺带补分期 4 遗留的孤儿 job 恢复与终态目录清理。验收对应 spec 验收 5、6。

**Architecture:** 全部改动收在 `ui/server/src/kernel/jobs/run-job.ts`（顺序 for 循环 → 并行执行 + 多会话取消 + 进度取最忙候选）与两个新测试文件。选优提交零新代码——分期 4 的 `commitKernelCandidate` 已实现 spec 10.4 全部语义（重跑门、防重复提交）。

**Tech Stack:** 同分期 4。零新依赖。

**前置：** 分期 4 计划（`2026-08-15-codex-kernel-jobs-and-bridge.md`）全部任务已完成、测试全绿。

---

## Global Constraints

- `contract_ids` 1..8、同 capability（分期 4 的 `validateCreateKernelJob` 已校验，本期不改）。
- 收敛规则照抄 spec 状态机：≥1 `succeeded` 且（`manual` 或 succeeded>1）→ `awaiting_selection`；恰 1 `succeeded` 且 `auto_if_single` → 自动 commit；无 `succeeded` → `failed`。**多候选时即使全部同合同 `auto_if_single`，succeeded>1 就必须等选**。
- 提交后其余 `succeeded` 候选保持 `succeeded`（不改状态）——账本可追溯谁没被选。
- 测试命令与提交规范同分期 4。

### 本分期新增决定（已折入 spec v1.2，2026-08-18）

| 决定 | 取值 |
|---|---|
| 并行度 | `contract_ids` 全量并行（≤8，无节流；每候选独立投影目录与 codex 进程，机器扛不住由用户少选合同） |
| 多候选进度 | 7.4 对象仍单 `candidate_id`：取第一个仍在运行（非终态）候选；全终态取第一个候选 |
| 取消 | 取消关闭**所有**活跃会话；运行中候选全部 `failed(CANCELLED)` |
| 孤儿恢复 | 服务启动时 `recoverOrphanKernelJobs(ws)`：`status IN ('queued','running')` 的 job → `failed(ENGINE_FAILED, '进程重启导致任务中断')`，其未终态候选同码标 `failed` |
| 终态清理 | job 到终态且产物已入 vault 后删候选目录下 `project/` 与 `codex-home/`；保留 `events.jsonl`、`snapshot/`、`artifacts/`（spec 磁盘节要求 events 与 artifacts 至少活到账本行删除） |

---

### Task 1: 并行执行与多会话取消

**Files:**
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Test: `ui/server/src/kernel/jobs/run-job.compete.test.ts`

**Interfaces:**
- `LiveJobState` 改：`closeSession?: () => void` → `closeSessions: Map<string, () => void>`（candidateId → close）；`candidateId` 语义改为「进度候选」，由 `getKernelJobProgress` 动态挑第一个非终态候选。
- 执行体：`for` 顺序循环改为每候选一个 async 任务 + `Promise.allSettled`；每个任务内部逻辑与分期 4 单候选完全一致（running → runner → vault → gates → succeeded/gated/failed），`onPhase` 写入 per-candidate phase map `live.phases: Map<string, string>`。
- `cancelKernelJob`：遍历 `closeSessions` 全部调用；运行中候选批量 `failed(CANCELLED)`。
- `getKernelJobProgress`：`phase` 取第一个非终态候选的 phase（无 → job.status）；`candidate_id` 同源。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/run-job.compete.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../../novel'
import { saveUserKernelContract } from '../contracts/store'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { getKernelJobDetail } from './repo'
import { cancelKernelJob, createAndRunKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

// 与内置 review.full 同 capability 的用户合同（“假审稿”，spec 验收 6 的载体）
function fakeReviewContract() {
  const base = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
  return { ...base, id: 'oh-story-core.story-review.fast', variant: 'fast', label: '假审稿（并跑对照）' }
}

function stubRunner(reportByContract: Record<string, string>) {
  const started: string[] = []
  const runner = async (input: any) => {
    started.push(input.contract.id)
    await new Promise(resolve => setTimeout(resolve, 30))
    const dir = mkdtempSync(join(tmpdir(), 'compete-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    const text = reportByContract[input.contract.id] ?? 'Fallback: none\n默认报告'
    writeFileSync(join(dir, '审稿/第002章.md'), text)
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: text, spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
  return { runner, started }
}

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'compete-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
  seedStores(ws)
  const saved = saveUserKernelContract(ws, fakeReviewContract())
  if (!saved.ok) throw new Error('seed contract failed')
  return { ws, project, chapter }
}

describe('compete execution', () => {
  test('two same-capability contracts run in parallel and job awaits selection', async () => {
    const { ws, project, chapter } = await seed()
    const { runner, started } = stubRunner({})
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    expect(started.sort()).toEqual(['oh-story-core.story-review.fast', 'oh-story-core.story-review.full'])
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates.map(c => c.status)).toEqual(['succeeded', 'succeeded'])
  })

  test('one gated + one succeeded still auto-commits the single succeeded (auto_if_single)', async () => {
    const { ws, project, chapter } = await seed()
    const { runner } = stubRunner({ 'oh-story-core.story-review.fast': 'Fallback: solo\n报告' })
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const statuses = detail.candidates.map(c => c.status).sort()
    expect(statuses).toEqual(['committed', 'gated'])
  })

  test('cancel closes every active session and fails running candidates', async () => {
    const { ws, project, chapter } = await seed()
    const closed: string[] = []
    let releaseAll!: () => void
    const gate = new Promise<void>(resolve => { releaseAll = resolve })
    const runner = async (input: any) => {
      input.onSession?.({ close: () => closed.push(input.contract.id) })
      await gate
      return { ok: false, error_code: 'CANCELLED', message: 'x' }
    }
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(cancelKernelJob(ws, created.jobId)).toEqual({ ok: true })
    releaseAll()
    await created.done
    expect(closed.length).toBe(2)
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
    expect(detail.candidates.every(c => c.status === 'failed' && c.error_code === 'CANCELLED')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败** → Run: `bun test src/kernel/jobs/run-job.compete.test.ts`，Expected: FAIL（顺序执行下 `auto_if_single` 恰-1-succeeded 分支行为一致，但 cancel 只关一个会话、started 顺序断言等会暴露差异；以实际失败为准）

- [ ] **Step 3: 实现**

`run-job.ts` 执行体改为：

```ts
const runOne = async (index: number) => {
  const contract = validated.contracts[index]
  const candidateId = candidateIds[index]
  const candidateJobId = `${jobId}/candidates/${candidateId}`
  live.candidateDirs.set(candidateId, kernelJobDir(ws, candidateJobId))
  updateKernelCandidate(ws, candidateId, { status: 'running', started_at: new Date().toISOString() })
  let result
  try {
    result = await runner({
      workspace: ws, projectId: body.project_id, chapterId: body.subject_id,
      contract, modelId: body.model_id, jobId: candidateJobId,
      sessionArgv: opts.engineArgv, sessionExtraEnv: opts.engineEnv,
      onPhase: (phase: string) => { live.phases.set(candidateId, phase) },
      onSession: (session: { close: () => void }) => { live.closeSessions.set(candidateId, () => session.close()) },
    } as any)
  } catch (error: any) {
    result = { ok: false as const, error_code: 'ENGINE_FAILED', message: String(error?.message || error) }
  }
  live.closeSessions.delete(candidateId)
  const now = new Date().toISOString()
  if (live.cancelled) { updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: now }); return }
  if (!result.ok) { updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: result.error_code, finished_at: now }); return }
  const registered = persistCandidateArtifacts(ws, candidateId, result.artifacts)
  live.phases.set(candidateId, 'gating')
  const gate = await runPostHarvestGates({ /* 同分期 4，逐字保留 */ })
  updateKernelCandidate(ws, candidateId, { /* 同分期 4，逐字保留 */ })
}
await Promise.allSettled(validated.contracts.map((_, index) => runOne(index)))
```

`LiveJobState`：`phase: string` 换成 `phases: Map<string, string>`；`closeSession?` 换成 `closeSessions: Map<string, () => void>`。`cancelKernelJob` 里 `for (const close of live.closeSessions.values()) try { close() } catch {}`，并对所有 `status IN ('queued','running')` 候选批量 `failed(CANCELLED)`（加 repo 辅助或循环 `updateKernelCandidate`）。`getKernelJobProgress`：

```ts
const running = detail.candidates.find(c => !['succeeded', 'gated', 'failed', 'committed'].includes(c.status))
const candidateId = running?.id || detail.candidates[0]?.id || ''
const phase = live?.phases.get(candidateId) || (live ? 'running' : detail.job.status)
```

收敛段与分期 4 相同（succeeded 计数已天然覆盖多候选）；注意 `auto_if_single` 判断用「被选合同里第一个 succeeded 候选对应合同」的 `commit.mode`（同 capability 合同 mode 可能不同——取 succeeded 那个候选的合同）。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/jobs/`
Expected: compete 3 个 PASS，分期 4 既有 jobs 测试全部仍 PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/run-job.ts ui/server/src/kernel/jobs/run-job.compete.test.ts
git commit -m "feat(kernel): parallel candidate execution with multi-session cancel"
```

---

### Task 2: 选优提交与「假审稿合同零改代码」验收

**Files:**
- Test: `ui/server/src/kernel/jobs/selection.test.ts`（纯测试任务，锁 spec 验收 5、6）

- [ ] **Step 1: 写测试（应直接通过——它锁行为，不引入新代码；若失败说明分期 4/5 有缺陷，先修）**

```ts
// ui/server/src/kernel/jobs/selection.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, listNovelReviewsByType } from '../../novel'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { saveUserKernelContract } from '../contracts/store'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

// seedStores / fakeReviewContract / stubRunner 与 run-job.compete.test.ts 相同，此处内联同一份实现
function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function fakeReviewContract() {
  const base = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
  return { ...base, id: 'oh-story-core.story-review.fast', variant: 'fast', label: '假审稿' }
}

function stubRunner() {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'sel-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    writeFileSync(join(dir, '审稿/第002章.md'), `Fallback: none\n来自 ${input.contract.id} 的报告`)
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: '', spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

describe('selection commit (spec acceptance 5 & 6)', () => {
  test('two succeeded candidates: committing one writes exactly one domain row; second commit 409', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'sel-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    seedStores(ws)
    expect(saveUserKernelContract(ws, fakeReviewContract()).ok).toBe(true)  // 验收 6：只加 JSON，无网关改动
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: stubRunner() as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    const fastCandidate = detail.candidates.find(c => c.contract_id === 'oh-story-core.story-review.fast')!
    const committed = await commitKernelCandidate(ws, created.jobId, fastCandidate.id)
    expect(committed.ok).toBe(true)
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    expect(reviews.length).toBe(1)  // 只有一份进领域表（验收 5）
    expect(JSON.parse(reviews[0].payload).report_text).toContain('story-review.fast')
    const other = detail.candidates.find(c => c.id !== fastCandidate.id)!
    const again = await commitKernelCandidate(ws, created.jobId, other.id)
    expect(again).toMatchObject({ ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' })
    const after = getKernelJobDetail(ws, created.jobId)!
    expect(after.candidates.find(c => c.id === other.id)!.status).toBe('succeeded')  // 未选候选留档
  })
})
```

- [ ] **Step 2: 跑测试** → Run: `bun test src/kernel/jobs/selection.test.ts`，Expected: PASS（失败则修分期 4/5 实现，不改断言）

- [ ] **Step 3: Commit**

```bash
git add ui/server/src/kernel/jobs/selection.test.ts
git commit -m "test(kernel): lock selection commit and json-only contract extension"
```

---

### Task 3: 孤儿 job 恢复与终态目录清理

**Files:**
- Modify: `ui/server/src/kernel/jobs/run-job.ts`（追加两个导出）
- Modify: `ui/server/src/index.ts`（启动时对当前工作区调一次 `recoverOrphanKernelJobs`；放在 `registerKernelJobRoutes` 同处）
- Test: `ui/server/src/kernel/jobs/recovery.test.ts`

**Interfaces:**
- `recoverOrphanKernelJobs(ws: string): number` — 把 `kernel_jobs.status IN ('queued','running')` 且不在 `liveJobs` 注册表里的 job 标 `failed(ENGINE_FAILED, '进程重启导致任务中断')`，其 `status IN ('queued','running')` 候选同码标 `failed`；返回恢复数量。
- `cleanupKernelJobDirs(ws: string, jobId: string): void` — 对该 job 每个候选目录删 `project/` 与 `codex-home/`（`rmSync(recursive, force)`），保留 `events.jsonl`、`snapshot/`、`artifacts/`；编排收敛段与 `cancelKernelJob` 在 job 到终态后调用。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/recovery.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import { kernelJobDir } from '../paths'
import { getKernelJobDetail, insertKernelCandidate, insertKernelJob } from './repo'
import { cleanupKernelJobDirs, recoverOrphanKernelJobs } from './run-job'

test('orphan running job is failed with ENGINE_FAILED on recovery', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'recover-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'running' })
  expect(recoverOrphanKernelJobs(ws)).toBe(1)
  const detail = getKernelJobDetail(ws, 'job-1')!
  expect(detail.job.status).toBe('failed')
  expect(detail.job.error_code).toBe('ENGINE_FAILED')
  expect(detail.candidates[0].status).toBe('failed')
  expect(recoverOrphanKernelJobs(ws)).toBe(0)
})

test('cleanup removes project and codex-home but keeps events and artifacts', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'cleanup-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-2', job_id: 'job-2', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'committed' })
  const dir = kernelJobDir(ws, 'job-2/candidates/cand-2')
  for (const sub of ['project', 'codex-home', 'snapshot', 'artifacts']) mkdirSync(join(dir, sub), { recursive: true })
  writeFileSync(join(dir, 'project', 'x.md'), 'x')
  writeFileSync(join(dir, 'events.jsonl'), '{}')
  cleanupKernelJobDirs(ws, 'job-2')
  expect(existsSync(join(dir, 'project'))).toBe(false)
  expect(existsSync(join(dir, 'codex-home'))).toBe(false)
  expect(existsSync(join(dir, 'events.jsonl'))).toBe(true)
  expect(existsSync(join(dir, 'snapshot'))).toBe(true)
  expect(existsSync(join(dir, 'artifacts'))).toBe(true)
})
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现**

```ts
// run-job.ts 追加
import { rmSync } from 'node:fs'
import { join as joinPath } from 'node:path'

export function recoverOrphanKernelJobs(ws: string): number {
  // listKernelJobsByStatuses 是本任务加到 repo.ts 的不受限查询（LIMIT 50 的 listKernelJobs 会漏旧孤儿）：
  // SELECT * FROM kernel_jobs WHERE status IN (...)，实现风格与 listKernelJobs 相同
  const orphans = listKernelJobsByStatuses(ws, ['queued', 'running']).filter(job => !liveJobs.has(job.id))
  const now = new Date().toISOString()
  for (const job of orphans) {
    updateKernelJob(ws, job.id, { status: 'failed', finished_at: now, error_code: 'ENGINE_FAILED', error_message: '进程重启导致任务中断' })
    const detail = getKernelJobDetail(ws, job.id)
    for (const candidate of detail?.candidates || []) {
      if (['queued', 'running'].includes(candidate.status)) {
        updateKernelCandidate(ws, candidate.id, { status: 'failed', error_code: 'ENGINE_FAILED', finished_at: now })
      }
    }
  }
  return orphans.length
}

export function cleanupKernelJobDirs(ws: string, jobId: string): void {
  const detail = getKernelJobDetail(ws, jobId)
  for (const candidate of detail?.candidates || []) {
    const dir = kernelJobDir(ws, `${jobId}/candidates/${candidate.id}`)
    for (const sub of ['project', 'codex-home']) {
      rmSync(joinPath(dir, sub), { recursive: true, force: true })
    }
  }
}
```

编排收敛段末尾（`liveJobs.delete(jobId)` 前）与 `cancelKernelJob` 成功路径末尾各加 `cleanupKernelJobDirs(ws, jobId)`。`index.ts` 启动处对当前工作区调一次 `recoverOrphanKernelJobs(getWorkspace())`（try/catch 包裹，失败只 console.warn 不阻断启动）。

注意：`listKernelJobs` LIMIT 50 —— 恢复用不受限查询，`recoverOrphanKernelJobs` 内改用直接 SQL：`SELECT * FROM kernel_jobs WHERE status IN ('queued','running')`（在 repo.ts 加 `listKernelJobsByStatuses(ws, statuses: string[])`，同风格实现，测试随本任务）。

- [ ] **Step 4: 跑测试确认通过 + 全量收尾**

Run: `cd /Users/ruiyaosong/MangaForge-Studio/.worktrees/codex-kernel-ledger-projection/ui/server && bun test src/kernel/ src/routes/`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/run-job.ts ui/server/src/kernel/jobs/repo.ts ui/server/src/kernel/jobs/recovery.test.ts ui/server/src/kernel/jobs/repo.test.ts ui/server/src/index.ts
git commit -m "feat(kernel): orphan job recovery and terminal job dir cleanup"
```

---

### Task 4: 真机验收清单（人工）

- [ ] 装好 codex、探针全绿后：项目 3 第 2 章同时勾选 `story-review.full` + 一份用户「假审稿」合同（同 capability）→ `POST /api/kernel/jobs` 202 → 轮询进度 → `awaiting_selection` → UI/curl 选优 `POST /jobs/:id/commit` → 领域 `reviews` 只多一行；另一候选仍 `succeeded` 可查产物。
- [ ] 取消并跑中的 job → 所有 codex 子进程退出（`ps` 无残留）、job `cancelled`、无领域写入。
- [ ] 重启 ui/server → 之前 running 的 job 变 `failed(ENGINE_FAILED)`；终态 job 的候选目录无 `project/`/`codex-home/` 残留，`events.jsonl` 仍在。

---

## 收尾与遗留

- 分期 5 完成后整个 spec v1.1 的 1-5 期闭环；剩余：分期 6（outline / 画布 prompt 合同）**须另开 brainstorm + spec**（当前 spec 明确列为非目标，无设计可依），不得直接写实现计划。
- spec v1.2 已汇总折入：见 `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`。并跑主键以 **verb** 为准（不是本计划写作时的 capability）。
- UI 侧（另排）：选优界面、进度轮询接入 7.4、合同多选入口。本计划只交付后端语义。
