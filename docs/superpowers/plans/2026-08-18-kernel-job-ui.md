# 内核操作面（质检修订轮询 / 并跑 / 选优）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把章节「质检修订」三按钮从阻塞 HTTP 改成 `POST /api/kernel/jobs` + 1s 轮询 7.4；支持同动词多选合同、候选对比后 `commit`。开书向导已轮询，本计划不重做向导。

**Architecture:** 新增与 axios 解耦的 `kernel/jobs` 客户端和 poller。`useChapterKernelJob` 挂在工作台 shell，拥有 running / awaiting_selection 状态；质检面板只渲染进度、多选、对比、取消。后端零改（合同/job/commit 已有）。旧 `POST /novel/oh-story/core/*` 桥接保留但不被新 UI 调用。

**Tech Stack:** React 18 + antd 5 + bun:test（`ui/web`）。HTTP 走现有 `apiClient`（baseURL 已含 `/api`，路径写 `/kernel/jobs`）。

---

## Global Constraints

- 对照 spec v1.2「尚未落地 A」：`docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`。
- **禁止**再 `POST /novel/oh-story/core/{review,deslop,apply}`。创建任务必须 `POST /kernel/jobs`，202 后轮询 `GET /kernel/jobs/:id`。
- 轮询间隔 **1000ms**（spec 7.4）。开书向导仍 2000ms，本计划不改向导。
- 并跑：同一 `verb`，`contract_ids` 1..8。省略 `contract_ids` 时让后端用 `verb_defaults`。跨动词禁止。
- 取消：`POST /kernel/jobs/:id/cancel`。关全部会话是后端语义，UI 只发一次 cancel。
- 选优：job `awaiting_selection` 时展示候选；只有 `succeeded` 可 `POST /kernel/jobs/:id/commit` `{ candidate_id }`。单候选 `auto_if_single` 由后端自动 commit，UI 轮询到 `committed` 即可。
- 产物预览：`GET /kernel/artifacts/:id/content`（256KiB truncated）。
- 模型：沿用工作台 `selectedModelId`。不要写死 302。
- 错误文案沿用现网：`OH_STORY_APPLY_NO_REVIEW` / `STALE_REVIEW` →「先对本稿重新审稿」；`OH_STORY_APPLY_REWROTE_TOO_MUCH` →「这次改动太大，像整章重写。请再试一次」。
- 不改 Codex、不实现动词 4+、不改开书向导流程、不删旧桥接路由。
- TDD：先写失败测试。测试命令：`cd ui/web && bun test <相对路径>`。每任务一提交。
- 不要 `git add -A`。只 add 本任务列出的文件。

## 现状速查

- 阻塞调用：`ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx` 的 `runOhStoryCoreAction`（约 658–725 行）`apiClient.post(/novel/oh-story/core/${action})` 并 await 终态。
- 面板：`workspace-center-quality-revision-panel.tsx` 用 `runOhStoryAction` 包住 handler 的 Promise；handler 一返回就清 busy。所以 busy 必须改由父级 job 状态驱动，不能再「await 完才返回」。
- 已有「审稿中 · 12s」：`ohStoryBusySummary`；`ohStoryElapsedSec` 可选从父级传入。本计划用 `progress.elapsed_ms`。
- 接线：`workspace-area-view.tsx:368-370` → `onOhStoryReview={ohStoryReview}`。`WorkspaceCenter.tsx` 把 props 传给面板，尚未传 `ohStoryAction` / `ohStoryElapsedSec`。
- 开书轮询样例（勿复制 2s 间隔）：`useCreateWizardController.ts` 的 `pollIncubation`。
- 后端：`POST /api/kernel/jobs` 202 `{ ok, job: { id, status } }`；`GET` 返回 `{ ok, job, candidates, artifacts, progress }`；commit / cancel / artifact content 见 spec 10.2–10.4。
- 动词映射：`review` → `review_chapter`，`deslop` → `deslop_chapter`，`apply` → `apply_review`。
- 现网测试会 source-contain 旧路径：`workspace-center-quality-revision-panel.test.ts`「workspace apply action posts /novel/oh-story/core/apply」；`workspaceUiShell.test.ts` deslop/apply POST 断言。必须改这些测试，不能留双路径。

## 文件结构

- Create: `ui/web/src/kernel/jobs/types.ts`
- Create: `ui/web/src/kernel/jobs/client.ts`
- Create: `ui/web/src/kernel/jobs/client.test.ts`
- Create: `ui/web/src/kernel/jobs/poll.ts`
- Create: `ui/web/src/kernel/jobs/poll.test.ts`
- Create: `ui/web/src/kernel/jobs/messages.ts`
- Create: `ui/web/src/kernel/jobs/messages.test.ts`
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.ts`
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts`
- Create: `ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.tsx`
- Create: `ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts`
- Modify: `workspace-repair-task-handlers.tsx`（删阻塞 POST；apply 预检函数留下给 hook 用）
- Modify: `workspace-center-quality-revision-panel.tsx`（busy 来自 job；多选；取消；对比槽）
- Modify: `WorkspaceCenter.tsx`、`workspace-area-view.tsx`（接线）
- Modify: `workspace-center-quality-revision-panel.test.ts`、`workspaceUiShell.test.ts`

---

### Task 1: 内核 job HTTP 客户端

**Files:**
- Create: `ui/web/src/kernel/jobs/types.ts`
- Create: `ui/web/src/kernel/jobs/client.ts`
- Test: `ui/web/src/kernel/jobs/client.test.ts`

**Interfaces:**

```ts
export type KernelJobAction = 'review' | 'deslop' | 'apply'
export const CHAPTER_KERNEL_VERBS: Record<KernelJobAction, string> = {
  review: 'review_chapter',
  deslop: 'deslop_chapter',
  apply: 'apply_review',
}

export type KernelRequest = (
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
) => Promise<{ status: number; data: any }>

export type CreateKernelJobInput = {
  projectId: number
  chapterId: number
  modelId: number
  action: KernelJobAction
  contractIds?: string[]
}

export type KernelJobProgress = {
  job_id: string
  candidate_id: string
  phase: string
  elapsed_ms: number
  hint: string
  error_code: string
}

export type KernelJobDetail = {
  ok: boolean
  job: { id: string; status: string; error_code?: string; verb?: string }
  candidates: Array<{
    id: string
    contract_id: string
    status: string
    error_code?: string
    last_message_excerpt?: string
  }>
  artifacts: Array<{
    id: string
    candidate_id: string
    rel_path: string
    artifact_kind: string
    byte_size?: number
  }>
  progress?: KernelJobProgress
}

export function createKernelJobApi(request: KernelRequest): {
  createJob(input: CreateKernelJobInput): Promise<
    | { ok: true; jobId: string }
    | { ok: false; status: number; code: string; message: string }
  >
  getJob(jobId: string): Promise<KernelJobDetail | { ok: false; status: number; code: string; message: string }>
  cancelJob(jobId: string): Promise<{ ok: true } | { ok: false; status: number; code: string }>
  commitJob(jobId: string, candidateId: string): Promise<
    | { ok: true; commits: unknown[] }
    | { ok: false; status: number; code: string; message: string }
  >
  getArtifactContent(artifactId: string): Promise<
    | { ok: true; content: string; truncated: boolean; artifact: { id: string; rel_path: string; artifact_kind: string } }
    | { ok: false; status: number; code: string }
  >
  listContracts(): Promise<{ ok: true; contracts: Array<{ id: string; label: string; verb?: string; implemented: boolean }> } | { ok: false; message: string }>
}

export function axiosKernelRequest(apiClient: { request: Function }): KernelRequest
```

`createJob` POST `/kernel/jobs` body：

```json
{
  "project_id": 3,
  "subject_type": "chapter",
  "subject_id": 11,
  "verb": "review_chapter",
  "model_id": 7
}
```

有 `contractIds` 且 length≥1 时才加 `contract_ids`。202/2xx 且 `data.job.id` 为成功。否则读 `data.code`。

`axiosKernelRequest`：`apiClient.request({ method, url: path, data: body, validateStatus: () => true })`，返回 `{ status, data }`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/web/src/kernel/jobs/client.test.ts
import { describe, expect, test } from 'bun:test'
import { CHAPTER_KERNEL_VERBS, createKernelJobApi } from './client'

function fakeRequest(handler: (method: string, path: string, body?: any) => { status: number; data: any }) {
  return async (method: 'GET' | 'POST', path: string, body?: unknown) => handler(method, path, body)
}

describe('createKernelJobApi', () => {
  test('createJob posts verb-mapped kernel job and returns 202 job id', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 202, data: { ok: true, job: { id: 'job-1', status: 'queued' } } }
    }))
    const result = await api.createJob({ projectId: 3, chapterId: 11, modelId: 7, action: 'review' })
    expect(result).toEqual({ ok: true, jobId: 'job-1' })
    expect(seen[0]).toEqual({
      method: 'POST',
      path: '/kernel/jobs',
      body: {
        project_id: 3,
        subject_type: 'chapter',
        subject_id: 11,
        verb: CHAPTER_KERNEL_VERBS.review,
        model_id: 7,
      },
    })
  })

  test('createJob includes contract_ids only when provided', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((_m, _p, body) => {
      seen.push(body)
      return { status: 202, data: { ok: true, job: { id: 'job-2', status: 'queued' } } }
    }))
    await api.createJob({
      projectId: 3, chapterId: 11, modelId: 7, action: 'deslop',
      contractIds: ['oh-story-core.story-deslop.file', 'user.deslop.alt'],
    })
    expect(seen[0].contract_ids).toEqual(['oh-story-core.story-deslop.file', 'user.deslop.alt'])
    expect(seen[0].verb).toBe('deslop_chapter')
  })

  test('createJob maps 503 KERNEL_RUNTIME_UNAVAILABLE', async () => {
    const api = createKernelJobApi(fakeRequest(() => ({
      status: 503,
      data: { code: 'KERNEL_RUNTIME_UNAVAILABLE', error: 'no codex' },
    })))
    const result = await api.createJob({ projectId: 3, chapterId: 11, modelId: 7, action: 'apply' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('getJob / cancel / commit / artifact / contracts hit the spec paths', async () => {
    const seen: string[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push(`${method} ${path}`)
      if (path === '/kernel/jobs/job-9') return { status: 200, data: { ok: true, job: { id: 'job-9', status: 'running' }, candidates: [], artifacts: [], progress: { elapsed_ms: 12000, phase: 'running', hint: 'story-architect', job_id: 'job-9', candidate_id: 'cand-1', error_code: '' } } }
      if (path.endsWith('/cancel')) return { status: 200, data: { ok: true } }
      if (path.endsWith('/commit')) {
        expect(body).toEqual({ candidate_id: 'cand-1' })
        return { status: 200, data: { ok: true, commits: [] } }
      }
      if (path.startsWith('/kernel/artifacts/')) return { status: 200, data: { ok: true, content: 'hi', truncated: false, artifact: { id: 'art-1', rel_path: '审稿/第001章.md', artifact_kind: 'review_report' } } }
      if (path === '/kernel/contracts') return { status: 200, data: { ok: true, contracts: [{ id: 'oh-story-core.story-review.full', label: '完整审稿', verb: 'review_chapter', implemented: true }] } }
      return { status: 404, data: { code: 'JOB_NOT_FOUND' } }
    }))
    await api.getJob('job-9')
    await api.cancelJob('job-9')
    await api.commitJob('job-9', 'cand-1')
    await api.getArtifactContent('art-1')
    await api.listContracts()
    expect(seen).toEqual([
      'GET /kernel/jobs/job-9',
      'POST /kernel/jobs/job-9/cancel',
      'POST /kernel/jobs/job-9/commit',
      'GET /kernel/artifacts/art-1/content',
      'GET /kernel/contracts',
    ])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/kernel/jobs/client.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 最小实现**

实现 `types.ts` + `client.ts`。`createJob` 在 `contractIds?.length` 为真时才放 `contract_ids`。失败时 `code = data.code || 'UNKNOWN'`，`message = data.error || data.message || ''`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/kernel/jobs/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/kernel/jobs/types.ts ui/web/src/kernel/jobs/client.ts ui/web/src/kernel/jobs/client.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add kernel job HTTP client for chapter UI

EOF
)"
```

---

### Task 2: 1s 轮询与错误文案

**Files:**
- Create: `ui/web/src/kernel/jobs/poll.ts`
- Create: `ui/web/src/kernel/jobs/messages.ts`
- Test: `ui/web/src/kernel/jobs/poll.test.ts`
- Test: `ui/web/src/kernel/jobs/messages.test.ts`

**Interfaces:**

```ts
export const KERNEL_JOB_POLL_MS = 1000
export const KERNEL_JOB_TERMINAL = ['committed', 'failed', 'cancelled', 'awaiting_selection'] as const
export function isKernelJobTerminal(status: string): boolean

export async function pollKernelJob(input: {
  getJob: (jobId: string) => ReturnType<ReturnType<typeof createKernelJobApi>['getJob']>
  jobId: string
  intervalMs?: number
  signal?: AbortSignal
  delay?: (ms: number) => Promise<void>
  onProgress?: (detail: KernelJobDetail) => void
}): Promise<KernelJobDetail>
```

`pollKernelJob`：立刻 get 一次；若 `ok` 且 `job.status` 终态则返回该 detail；否则 `onProgress`，`delay(intervalMs || 1000)`，再 get。`signal.aborted` 时 throw `DOMException('Aborted','AbortError')` 或带 `name='AbortError'` 的 Error。get 失败且非终态：继续轮询（与向导「网络抖动不立刻 failed」一致），除非 signal abort。

```ts
export function kernelJobUserMessage(code: string): { kind: 'warning' | 'error' | 'info'; text: string } | null
```

| code | kind | text |
|---|---|---|
| `OH_STORY_APPLY_NO_REVIEW` / `OH_STORY_APPLY_STALE_REVIEW` | warning | 先对本稿重新审稿 |
| `OH_STORY_APPLY_REWROTE_TOO_MUCH` | warning | 这次改动太大，像整章重写。请再试一次 |
| `KERNEL_RUNTIME_UNAVAILABLE` | error | 内核不可用，装好 Codex 后再试 |
| `CANCELLED` | info | 已取消 |
| `PROJECT_JOB_RUNNING` | warning | 同项目同动词任务未结束 |
| 其它非空 code | error | 用 code 本身（调用方还可拼 `失败`） |
| 空 | null | |

- [ ] **Step 1: 写失败测试**

```ts
// ui/web/src/kernel/jobs/poll.test.ts
import { describe, expect, test } from 'bun:test'
import { KERNEL_JOB_POLL_MS, pollKernelJob } from './poll'
import type { KernelJobDetail } from './types'

function detail(status: string, extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: 'job-1', status },
    candidates: extra.candidates || [],
    artifacts: extra.artifacts || [],
    progress: { job_id: 'job-1', candidate_id: 'c1', phase: status, elapsed_ms: 4000, hint: 'story-architect', error_code: '' },
    ...extra,
  }
}

describe('pollKernelJob', () => {
  test('returns when status becomes awaiting_selection and delays 1s between polls', async () => {
    const statuses = ['running', 'running', 'awaiting_selection']
    const delays: number[] = []
    const progressPhases: string[] = []
    const result = await pollKernelJob({
      jobId: 'job-1',
      getJob: async () => detail(statuses.shift() || 'awaiting_selection'),
      delay: async (ms) => { delays.push(ms) },
      onProgress: (d) => progressPhases.push(d.job.status),
    })
    expect(result.job.status).toBe('awaiting_selection')
    expect(delays).toEqual([KERNEL_JOB_POLL_MS, KERNEL_JOB_POLL_MS])
    expect(progressPhases[0]).toBe('running')
  })

  test('stops on committed without treating it as error', async () => {
    const result = await pollKernelJob({
      jobId: 'job-1',
      getJob: async () => detail('committed'),
      delay: async () => { throw new Error('should not delay') },
    })
    expect(result.job.status).toBe('committed')
  })

  test('aborts between polls', async () => {
    const controller = new AbortController()
    let n = 0
    await expect(pollKernelJob({
      jobId: 'job-1',
      signal: controller.signal,
      getJob: async () => {
        n += 1
        if (n === 1) return detail('running')
        return detail('running')
      },
      delay: async () => { controller.abort() },
    })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
```

```ts
// ui/web/src/kernel/jobs/messages.test.ts
import { describe, expect, test } from 'bun:test'
import { kernelJobUserMessage } from './messages'

describe('kernelJobUserMessage', () => {
  test('maps apply gates to the live warning copy', () => {
    expect(kernelJobUserMessage('OH_STORY_APPLY_NO_REVIEW')).toEqual({ kind: 'warning', text: '先对本稿重新审稿' })
    expect(kernelJobUserMessage('OH_STORY_APPLY_REWROTE_TOO_MUCH')).toEqual({
      kind: 'warning',
      text: '这次改动太大，像整章重写。请再试一次',
    })
  })
  test('maps runtime unavailable', () => {
    expect(kernelJobUserMessage('KERNEL_RUNTIME_UNAVAILABLE')?.kind).toBe('error')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/kernel/jobs/poll.test.ts src/kernel/jobs/messages.test.ts`
Expected: FAIL

- [ ] **Step 3: 最小实现**

`poll.ts` / `messages.ts` 如上表。终态集合必须含 `awaiting_selection`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/kernel/jobs/poll.test.ts src/kernel/jobs/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/kernel/jobs/poll.ts ui/web/src/kernel/jobs/poll.test.ts ui/web/src/kernel/jobs/messages.ts ui/web/src/kernel/jobs/messages.test.ts
git commit -m "$(cat <<'EOF'
feat(web): poll kernel jobs every second and map gate copy

EOF
)"
```

---

### Task 3: 创建任务不再阻塞；apply 预检留下

**Files:**
- Create: `ui/web/src/pages/novel-workspace/shell/start-chapter-kernel-job.ts`
- Test: `ui/web/src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`

**行为：**

`startChapterKernelJob({ api, input, flushPendingSave })`：先 `flushPendingSave()`，false 则 `{ ok:false, code:'SAVE_FAILED' }`；再 `api.createJob(input)`。不 poll。

从 handlers 抽出 apply 预检：

```ts
export function assertOhStoryApplyReady(input: {
  reviews: any[]
  chapter: any
}): { ok: true } | { ok: false; warning: '先对本稿重新审稿' }
```

逻辑保持现网：无 matching review 或 hash 不匹配（hash 有值时才比）→ warning。hash 未水合仍允许发任务（现网 `workspaceUiShell` apply 测试）。

`createRepairTaskHandlers` 的 `ohStoryReview/Deslop/Apply` **删除**对 `/novel/oh-story/core/*` 的调用。本任务后它们可以暂留为调用 `startChapterKernelJob` 的薄封装（仍不 poll），供旧测试迁移；Task 4 的 hook 才是产品入口。若薄封装仍 `setProseQualityLoading(true)` 包住 createJob，createJob 必须在 202 后立刻结束，不得 await poll。

`workspaceUiShell.test.ts`：

- deslop 断言改为 `POST` body 等价于 kernel job（通过 spy `startChapterKernelJob` 或 mock `apiClient.request`）。推荐：handlers 改用 `deps.apiClient.request`，测试 mock request。
- 最省事且不引入双 HTTP 栈：handlers 的 oh-story 三方法改为调用 `startChapterKernelJob`，测试改 mock 注入的 `createKernelJobApi` 太重。改为：**handlers 不再导出 ohStory***，测试改为测 `start-chapter-kernel-job.test.ts` + `assertOhStoryApplyReady`。删除 `workspaceUiShell.test.ts` 里「deslop posts … /novel/oh-story/core/deslop」和 apply 两则 POST 路径断言；quality-revision-panel.test 的 source-contain `/novel/oh-story/core/${action}` 改为断言 `start-chapter-kernel-job.ts` 含 `/kernel/jobs` 且 handlers **不含** `/novel/oh-story/core/${action}`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/web/src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { assertOhStoryApplyReady, startChapterKernelJob } from './start-chapter-kernel-job'

describe('startChapterKernelJob', () => {
  test('flushes save then creates a kernel job without waiting for terminal status', async () => {
    const createJob = mock(async () => ({ ok: true as const, jobId: 'job-9' }))
    const flushPendingSave = mock(async () => true)
    const result = await startChapterKernelJob({
      flushPendingSave,
      createJob,
      input: { projectId: 3, chapterId: 11, modelId: 7, action: 'review' },
    })
    expect(flushPendingSave).toHaveBeenCalledTimes(1)
    expect(createJob).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, jobId: 'job-9' })
  })

  test('does not create a job when save fails', async () => {
    const createJob = mock(async () => ({ ok: true as const, jobId: 'job-9' }))
    const result = await startChapterKernelJob({
      flushPendingSave: async () => false,
      createJob,
      input: { projectId: 3, chapterId: 11, modelId: 7, action: 'deslop' },
    })
    expect(result.ok).toBe(false)
    expect(createJob).not.toHaveBeenCalled()
  })
})

describe('assertOhStoryApplyReady', () => {
  test('warns when there is no review', () => {
    const result = assertOhStoryApplyReady({ reviews: [], chapter: { id: 11, chapter_text: '正文' } })
    expect(result.ok).toBe(false)
  })
  test('allows apply when review exists but hash is not hydrated', () => {
    const result = assertOhStoryApplyReady({
      reviews: [{ review_type: 'oh_story_review', payload: { chapter_id: 11 } }],
      chapter: { id: 11, chapter_text: '楚弦咽气的时候。' },
    })
    expect(result.ok).toBe(true)
  })
})
```

同步改 quality panel source 测试（会红，因为 handlers 还在旧路径——本任务 Step 3 一起改）。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 + 拆掉阻塞路径**

实现 `start-chapter-kernel-job.ts`（`assertOhStoryApplyReady` 复用 `latestOhStoryReviewForChapter` / `ohStoryReviewMatchesChapterText` / `parseOhStoryReviewPayload`，与 handlers 现逻辑一致）。

handlers：删除 `runOhStoryCoreAction` 函数体里的 `/novel/oh-story/core/` POST。`ohStoryReview` 等改为调用 `startChapterKernelJob`（注入 `createKernelJobApi(axiosKernelRequest(apiClient)).createJob`）。**不要** `await poll`。成功时不要 `message.success('…完成')`（那是 poll 到 committed 之后的事，Task 4）。create 失败用 `kernelJobUserMessage`。apply 先 `assertOhStoryApplyReady`。

更新：

- `workspaceUiShell.test.ts` 三则 oh-story POST 测试 → 断言 `apiClient.request` 或 post `/kernel/jobs`（按你实际注入）。若 handlers 改走 `apiClient.post('/kernel/jobs', body)`，把 fixture 的 `apiPost` 期望路径改成 `/kernel/jobs`，body 含 `verb` / `subject_type:'chapter'`。
- `workspace-center-quality-revision-panel.test.ts` source 测试：handlers 文本 **不得**含 `` `/novel/oh-story/core/${action}` ``；`start-chapter-kernel-job.ts` 或 handlers **必须**含 `/kernel/jobs`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/shell/start-chapter-kernel-job.ts ui/web/src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
git commit -m "$(cat <<'EOF'
fix(web): start chapter kernel jobs without blocking HTTP

EOF
)"
```

---

### Task 4: Hook 轮询进度 + 取消；面板 busy 改由 job 驱动

**Files:**
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.ts`
- Test: `ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts`
- Modify: `workspace-center-quality-revision-panel.tsx`
- Modify: `WorkspaceCenter.tsx`
- Modify: `workspace-area-view.tsx`
- Modify: `workspace-center-quality-revision-panel.test.ts`

**Hook 状态：**

```ts
export type ChapterKernelJobState =
  | { phase: 'idle' }
  | { phase: 'running'; action: KernelJobAction; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'awaiting_selection'; action: KernelJobAction; jobId: string; detail: KernelJobDetail }
  | { phase: 'failed'; action: KernelJobAction; jobId: string | null; errorCode: string }

export function useChapterKernelJob(deps: {
  api: ReturnType<typeof createKernelJobApi>
  projectId: number
  chapterId: number
  modelId: number
  reviews: any[]
  chapter: any
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  notify: { success: Function; warning: Function; error: Function; info: Function }
}): {
  state: ChapterKernelJobState
  selectedContractIds: Record<KernelJobAction, string[]>
  setSelectedContractIds: (action: KernelJobAction, ids: string[]) => void
  start: (action: KernelJobAction) => Promise<void>
  cancel: () => Promise<void>
  commit: (candidateId: string) => Promise<void>
  loadArtifact: (artifactId: string) => Promise<{ content: string; truncated: boolean } | null>
}
```

`start`：若 `state.phase==='running'` return；apply 先 assert；`startChapterKernelJob`；失败 toast；成功则 poll（`onProgress` 更新 elapsedSec = round(progress.elapsed_ms/1000)、hint）；终态：

- `committed` → `loadProjectModules` + `message.success`（审稿/去AI/改稿完成）+ idle
- `awaiting_selection` → 进入该 phase（Task 5/6 用）
- `failed` / `cancelled` → `kernelJobUserMessage(job.error_code)` toast + failed/idle
- AbortError → 不报失败

`cancel`：abort poll + `api.cancelJob`。

面板：

- 新增 props：`kernelJobAction`、`kernelJobElapsedSec`、`kernelJobHint`、`onCancelKernelJob`。
- `busyAction = kernelJobAction ?? localOhStoryAction` 但 **产品路径只信 kernelJobAction**（父级 running 时传入）。点击后 `onOhStoryReview` 应几乎立刻返回；busy 靠父级 `phase==='running'`。
- running 时显示 `ohStoryBusySummary` + 可选 hint；增加小按钮「取消」调用 `onCancelKernelJob`。
- 把 `ohStoryAction` / `ohStoryElapsedSec` 继续作为别名，避免旧测试崩：测试可继续传 `ohStoryAction='deslop'`。

`WorkspaceCenter` 把新 props 透传。`workspace-area-view` 调 hook（`apiClient` + `axiosKernelRequest`），把 `start('review')` 等传给面板。

Hook 测试用纯函数抽出 `reduceChapterKernelProgress(prev, detail): ChapterKernelJobState`（避免 jsdom）：running detail → running；awaiting_selection → 该相；committed → idle 标记。单测这个 reducer + start 编排可用假 api。

- [ ] **Step 1: 写失败测试**（reducer + 面板取消按钮）

```ts
// ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts
import { describe, expect, test } from 'bun:test'
import { reduceChapterKernelProgress } from './use-chapter-kernel-job'

describe('reduceChapterKernelProgress', () => {
  test('keeps running elapsed from progress.elapsed_ms', () => {
    const next = reduceChapterKernelProgress(
      { phase: 'running', action: 'review', jobId: 'job-1', hint: '', elapsedSec: 0 },
      { ok: true, job: { id: 'job-1', status: 'running' }, candidates: [], artifacts: [], progress: { job_id: 'job-1', candidate_id: 'c', phase: 'running', elapsed_ms: 12000, hint: 'story-architect', error_code: '' } },
    )
    expect(next).toEqual({
      phase: 'running', action: 'review', jobId: 'job-1', hint: 'story-architect', elapsedSec: 12,
    })
  })
  test('switches to awaiting_selection', () => {
    const next = reduceChapterKernelProgress(
      { phase: 'running', action: 'review', jobId: 'job-1', hint: '', elapsedSec: 8 },
      { ok: true, job: { id: 'job-1', status: 'awaiting_selection' }, candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }], artifacts: [], progress: { job_id: 'job-1', candidate_id: 'cand-1', phase: 'awaiting_selection', elapsed_ms: 8000, hint: '', error_code: '' } },
    )
    expect(next.phase).toBe('awaiting_selection')
  })
})
```

面板测试追加：传入 `onCancelKernelJob` 且 `ohStoryAction='review'` 时 HTML 含「取消」。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
Expected: reducer 模块缺失 FAIL；取消按钮断言 FAIL

- [ ] **Step 3: 实现 hook + 接线 + 面板取消**

导出 `reduceChapterKernelProgress`。Hook 内部 poll 用它。面板 running 时渲染取消。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.ts ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx ui/web/src/pages/novel-workspace/shell/workspace-area-view.tsx ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
git commit -m "$(cat <<'EOF'
feat(web): poll chapter kernel jobs and allow cancel from the quality panel

EOF
)"
```

---

### Task 5: 同动词合同多选（≤8）

**Files:**
- Modify: `workspace-center-quality-revision-panel.tsx`
- Modify: `use-chapter-kernel-job.ts`（start 时带 selectedContractIds）
- Modify: `workspace-center-quality-revision-panel.test.ts`

**行为：**

- 面板打开时父级已 `listContracts()`（hook 在 mount 拉一次）。
- 每个按钮旁（或面板 body）按当前 action 列出 `implemented && verb===CHAPTER_KERNEL_VERBS[action]` 的合同 checkbox。
- 默认选中该 verb 列表里 id 等于内置默认的那一项：review=`oh-story-core.story-review.full`，deslop=`oh-story-core.story-deslop.file`，apply=`oh-story-core.story-apply.surgical`。无匹配则选第一项。
- 勾选超过 8 个：忽略或 disable 其余。
- 只选默认一项：`start` **不传** `contractIds`（走 verb_defaults）。
- 选了 2+ 或选了非默认：传 `contractIds`。
- 跨 verb 的合同不会出现在该按钮列表里。

面板 props：

```ts
kernelContracts?: Array<{ id: string; label: string; verb?: string; implemented: boolean }>
kernelSelectedContractIds?: string[]
onKernelSelectedContractIdsChange?: (action: KernelJobAction, ids: string[]) => void
```

因为三个按钮 verb 不同，selected ids 按 action 分桶（hook 里 `Record<KernelJobAction, string[]>`）。UI 可在 body 用「并跑合同」一节，随最近一次要跑的 action 切换；更简单：三个按钮各自一个 Dropdown。用 Dropdown+Checkbox 以免撑破 summary。

测试：renderPanel 传入两个 review 合同，HTML 含两份 label；勾选逻辑用抽出的纯函数测：

```ts
export function contractsForAction(contracts, action): typeof contracts
export function resolveContractIdsForCreate(selected: string[], defaultId: string): string[] | undefined
```

`resolveContractIdsForCreate(['oh-story-core.story-review.full'], 'oh-story-core.story-review.full')` → `undefined`。  
`resolveContractIdsForCreate(['a','b'], 'a')` → `['a','b']`（截断 8）。

- [ ] **Step 1: 写失败测试**

把 `contractsForAction` / `resolveContractIdsForCreate` 放在 `ui/web/src/kernel/jobs/contracts-for-action.ts`（面板与 hook 共用）。

```ts
// ui/web/src/kernel/jobs/contracts-for-action.test.ts
import { describe, expect, test } from 'bun:test'
import { contractsForAction, resolveContractIdsForCreate } from './contracts-for-action'

const contracts = [
  { id: 'oh-story-core.story-review.full', label: '完整审稿', verb: 'review_chapter', implemented: true },
  { id: 'user.review.fast', label: '假审稿', verb: 'review_chapter', implemented: true },
  { id: 'oh-story-core.story-deslop.file', label: '去AI', verb: 'deslop_chapter', implemented: true },
  { id: 'pending.review', label: '未实现', verb: 'review_chapter', implemented: false },
]

describe('contractsForAction', () => {
  test('lists implemented contracts for the same verb only', () => {
    expect(contractsForAction(contracts, 'review').map(c => c.id)).toEqual([
      'oh-story-core.story-review.full',
      'user.review.fast',
    ])
  })
})

describe('resolveContractIdsForCreate', () => {
  test('omits contract_ids when only the default is selected', () => {
    expect(resolveContractIdsForCreate(['oh-story-core.story-review.full'], 'oh-story-core.story-review.full')).toBeUndefined()
  })
  test('sends up to 8 ids when competing', () => {
    expect(resolveContractIdsForCreate(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(resolveContractIdsForCreate(Array.from({ length: 9 }, (_, i) => `c${i}`), 'c0')).toHaveLength(8)
  })
})
```

面板测试：`renderPanel(7, null, { kernelContracts: contracts, kernelSelectedContractIds: ['oh-story-core.story-review.full'] })` HTML 含「完整审稿」和「假审稿」，不含「去AI」。

- [ ] **Step 2: bun test 确认 FAIL**

Run: `cd ui/web && bun test src/kernel/jobs/contracts-for-action.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
Expected: FAIL（模块不存在 / 面板无合同名）

- [ ] **Step 3: 实现 picker 纯函数 + 面板 Dropdown + hook 把 ids 传进 start**
- [ ] **Step 4: bun test PASS**
- [ ] **Step 5: Commit**

```bash
git add ui/web/src/kernel/jobs/contracts-for-action.ts ui/web/src/kernel/jobs/contracts-for-action.test.ts ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.ts ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts
git commit -m "$(cat <<'EOF'
feat(web): let chapter kernel jobs select up to 8 same-verb contracts

EOF
)"
```

---

### Task 6: 选优对比 + 只读预览 + commit

**Files:**
- Create: `ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts`
- Modify: `workspace-center-quality-revision-panel.tsx`（`awaiting_selection` 时渲染 compare）
- Modify: `use-chapter-kernel-job.ts`（commit / loadArtifact）

**UI：**

`KernelCandidateCompare` 输入 `detail: KernelJobDetail`、`onPreview(artifactId)`、`preview`、`onCommit(candidateId)`、`committing`。

- 每个候选一行：`contract_id`、`status`、`error_code`、`last_message_excerpt`（≤200 字）。
- `succeeded` 显示「采纳」按钮；`gated`/`failed` 禁用并标码。
- 点候选展开其 artifacts；点文件调用 `onPreview`，预览 `<pre>`，truncated 时注明。
- 采纳成功后由 hook `loadProjectModules` 并把 state 置 idle（commit 后 job committed）。
- commit 409 `OH_STORY_APPLY_REWROTE_TOO_MUCH` 等走 `kernelJobUserMessage`。

单候选 awaiting_selection（开书才是 manual；章级 auto_if_single 通常不会进这——但并跑 succeeded>1 会进）：必须人选。不要在 UI 里自动 commit。

- [ ] **Step 1: 写失败测试**

```ts
// ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts
import { describe, expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KernelCandidateCompare } from './workspace-kernel-candidate-compare'

function buttonMarkup(html: string, label: string) {
  const match = html.match(new RegExp(`<button[^>]*>${label}</button>`))
  return match?.[0] || ''
}

describe('KernelCandidateCompare', () => {
  test('shows adopt on succeeded candidates and disables gated ones', () => {
    const html = renderToStaticMarkup(
      React.createElement(KernelCandidateCompare, {
        detail: {
          ok: true,
          job: { id: 'job-1', status: 'awaiting_selection' },
          candidates: [
            { id: 'cand-a', contract_id: 'oh-story-core.story-review.full', status: 'succeeded', last_message_excerpt: '完整审稿摘录' },
            { id: 'cand-b', contract_id: 'user.review.fast', status: 'succeeded', last_message_excerpt: '假审稿摘录' },
            { id: 'cand-c', contract_id: 'user.review.solo', status: 'gated', error_code: 'SOLO_FALLBACK' },
          ],
          artifacts: [
            { id: 'art-a', candidate_id: 'cand-a', rel_path: '审稿/第007章.md', artifact_kind: 'review_report' },
          ],
        },
        onCommit: () => {},
        onPreview: () => {},
      }),
    )
    expect(html).toContain('完整审稿摘录')
    expect(html).toContain('假审稿摘录')
    expect(html).toContain('SOLO_FALLBACK')
    expect(html.match(/采纳/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: bun test FAIL**

Run: `cd ui/web && bun test src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 compare + 接到面板（`state.phase==='awaiting_selection'`）+ hook.commit / loadArtifact**
- [ ] **Step 4: bun test PASS**

Run: `cd ui/web && bun test src/kernel/jobs src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.tsx ui/web/src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx ui/web/src/pages/novel-workspace/shell/use-chapter-kernel-job.ts
git commit -m "$(cat <<'EOF'
feat(web): compare kernel candidates before commit

EOF
)"
```

---

## 验收（本计划做完）

1. 点「oh-story 审稿」立刻返回；Network 里 create 是 202，随后每秒 GET `/kernel/jobs/:id`，不再有挂十几分钟的 `/novel/oh-story/core/review`。
2. 面板显示「审稿中 · Ns」且 hint 来自 7.4；可取消。
3. 两个 review 合同并跑 → `awaiting_selection` → 对比 excerpt/正文 → 采纳一份 → 领域只多一份审稿。
4. 改稿过大仍是现网 warning 文案，正文不换。
5. `cd ui/web && bun test src/kernel/jobs src/pages/novel-workspace/shell/start-chapter-kernel-job.test.ts src/pages/novel-workspace/shell/use-chapter-kernel-job.test.ts src/pages/novel-workspace/workspace-kernel-candidate-compare.test.ts src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts` 全绿。

## 明确不做

- 开书向导重写 / 把向导间隔改 1s
- 删旧 oh-story 桥接路由（排期 D）
- 动词 4+、分期 6、spawn 结构门、`$HOME` 硬隔离
- WebSocket
- verb_defaults 管理 UI

## Self-Review

- Spec A 四行：轮询+取消 = T3/T4；多选 = T5；对比 commit = T6；产物预览 = T6 `getArtifactContent`。
- 无 TBD/「类似 Task N」。
- 类型名全程 `KernelJobDetail` / `KernelJobAction` / `ChapterKernelJobState`。
- `CHAPTER_KERNEL_VERBS` 在 T1 定义，T3–T5 使用。
- `KERNEL_JOB_POLL_MS = 1000` 在 T2 定义，poll 测试锁定。
