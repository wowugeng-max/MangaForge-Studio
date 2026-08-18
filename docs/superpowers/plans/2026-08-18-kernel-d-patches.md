# 内核 D 后置补丁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 D 三项：候选进程 `HOME` 指到 job 目录、full 审稿零 spawn 结构门 `NO_SPAWN`、旧 oh-story 三按钮阻塞路由改 410。

**Architecture:** 在 `spawnCodexRpc` 抽出 `mergeCodexRpcEnv`，会话把 `HOME=jobDir` 写入 env。新门 `require_spawn_evidence` 挂在 full 审稿合同，收存与 commit 都读 `spawn_evidence.subagent_threads`。三条 `POST /api/novel/oh-story/core/{review,deslop,apply}` 改为立即 410，不再 `createAndRunKernelJob`。

**Tech Stack:** Bun + TypeScript（`ui/server`，bun:test）。零新依赖。

## Global Constraints

- 短 spec：`docs/superpowers/specs/2026-08-18-kernel-d-patches-design.md`。内核总 spec：`docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md` v1.2。
- 不改 Codex 源码；不补 `--ignore-user-config`。
- `CODEX_HOME` 仍是 `{jobDir}/codex-home`。`HOME` 是 `{jobDir}`（候选目录），切断 `$HOME/.agents/skills` 与 `$HOME/.codex`。
- `NO_SPAWN` → 候选 `gated`（与 `SOLO_FALLBACK` 同类）。只出现在带 `require_spawn_evidence` 的合同。
- 旧三路由 410 body：`{ ok: false, code: 'ROUTE_REMOVED', error: '请改用 POST /api/kernel/jobs' }`。保留 GET `/core` 与 POST `/install`。
- TDD：先写失败测试。测试：`cd ui/server && bun test <相对路径>`。每任务一提交。不要 `git add -A`。
- 内核模型仍是工作台传入的 `model_id`，不要写死 302。
- 现有 stub 若 `spawnEvidence.subagent_threads` 为空且合同拷贝了 full 的 gates，本计划 Task 2 会让它们变红——必须给 stub 补一条 spawn，不能删门。

## 文件结构

- Modify: `ui/server/src/kernel/codex/rpc.ts`
- Modify: `ui/server/src/kernel/codex/rpc.test.ts`
- Modify: `ui/server/src/kernel/codex/session.ts`
- Modify: `ui/server/src/kernel/codex/run-candidate.ts`
- Modify: `ui/server/src/kernel/probe.ts`
- Modify: `ui/server/src/kernel/contracts/schema.ts`（`KERNEL_GATES`）
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/verbs/templates/review_chapter.json`
- Modify: `ui/server/src/kernel/jobs/gates.ts`
- Modify: `ui/server/src/kernel/jobs/gates.test.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/commit.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.compete.test.ts`
- Modify: `ui/server/src/kernel/jobs/selection.test.ts`
- Modify: `ui/server/src/kernel/jobs/acceptance.fixture.test.ts`（可选加零 spawn 用例）
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts`
- Modify: `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`

---

### Task 1: 候选进程 HOME 硬隔离

**Files:**
- Modify: `ui/server/src/kernel/codex/rpc.ts`
- Modify: `ui/server/src/kernel/codex/rpc.test.ts`
- Modify: `ui/server/src/kernel/codex/session.ts`
- Modify: `ui/server/src/kernel/codex/run-candidate.ts`
- Modify: `ui/server/src/kernel/probe.ts`

**Interfaces:**

```ts
export function mergeCodexRpcEnv(inputEnv: Record<string, string>): Record<string, string>
// 返回 { PATH: process.env.PATH || '', HOME: process.env.HOME || '', ...inputEnv }
// inputEnv.HOME 必须覆盖 process.env.HOME

// startCodexSession 增加：
isolatedHome?: string
// spawn 时 env 含 HOME: input.isolatedHome || join(input.codexHome, '..')
// extraEnv 仍后写，测试可覆盖 HOME
```

- Consumes: 现有 `spawnCodexRpc({ env })`、`startCodexSession`、`runKernelCandidate` 的 `jobDir`。
- Produces: 生产路径 `HOME === jobDir` 且 `CODEX_HOME === join(jobDir, 'codex-home')`。

- [ ] **Step 1: 写失败测试**

在 `rpc.test.ts` 追加：

```ts
import { mergeCodexRpcEnv } from './rpc'

test('mergeCodexRpcEnv lets input HOME override the process home', () => {
  const env = mergeCodexRpcEnv({ HOME: '/tmp/kernel-job-home', CODEX_HOME: '/tmp/kernel-job-home/codex-home' })
  expect(env.HOME).toBe('/tmp/kernel-job-home')
  expect(env.CODEX_HOME).toBe('/tmp/kernel-job-home/codex-home')
  expect(env.HOME).not.toBe(process.env.HOME)
  expect(env.PATH).toBeTruthy()
})
```

在 `run-candidate.test.ts` 现有 fixture 用例里（已有 `FAKE_SPAWN` 的那则），断言候选目录下没有读取用户 home 的需要——改为读 `startCodexSession` 入参。更稳：在 `run-candidate.ts` 旁测 `isolatedHome`。若 `run-candidate.test.ts` 不便窥 env，只锁 `mergeCodexRpcEnv` + 源码约束：`run-candidate.ts` 调用 `startCodexSession` 必须含 `isolatedHome: jobDir`。

追加 `run-candidate.test.ts` 的 source 约束（与现网 quality panel 测试同风格，文件已在测 run-candidate）：

```ts
test('runKernelCandidate isolates HOME to the job directory', async () => {
  const source = await Bun.file(new URL('./run-candidate.ts', import.meta.url)).text()
  expect(source).toContain('isolatedHome: jobDir')
  expect(source).toContain('codexHome: join(jobDir, \'codex-home\')')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/codex/rpc.test.ts src/kernel/codex/run-candidate.test.ts`

Expected: FAIL（`mergeCodexRpcEnv` 未导出；source 不含 `isolatedHome: jobDir`）

- [ ] **Step 3: 最小实现**

`rpc.ts`：抽出并使用 `mergeCodexRpcEnv`：

```ts
export function mergeCodexRpcEnv(inputEnv: Record<string, string>): Record<string, string> {
  return { PATH: process.env.PATH || '', HOME: process.env.HOME || '', ...inputEnv }
}

// Bun.spawn 的 env: mergeCodexRpcEnv(input.env)
```

`session.ts` `startCodexSession`：

```ts
isolatedHome?: string
// ...
env: {
  CODEX_HOME: input.codexHome,
  MANGAFORGE_CODEX_KEY: input.envKey,
  HOME: input.isolatedHome || join(input.codexHome, '..'),
  ...(input.extraEnv || {}),
},
```

`run-candidate.ts` 调用处加 `isolatedHome: jobDir`。

`probe.ts` 两处 `startCodexSession` 都显式加 `isolatedHome`——`defaultRunAgentsSpawnProbe`（spawn 探针）传其探针 job 目录；握手/技能探针（另一处 `startCodexSession({ binary, projectDir: dir, codexHome: home, envKey: 'probe' })`）传 `dirname(home)`。会话层默认 `join(codexHome, '..')` 本已覆盖两处（探针 `codexHome` 就在临时目录里），显式传参是为可读与测试锁定；探针环境必须与生产一致，否则 `$HOME/.agents/skills` 仍会漏进探针的 skills/list。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/codex/rpc.test.ts src/kernel/codex/session.test.ts src/kernel/codex/run-candidate.test.ts src/kernel/probe.test.ts`

Expected: PASS（若无 `probe.test.ts` 则省略该文件）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/codex/rpc.ts ui/server/src/kernel/codex/rpc.test.ts ui/server/src/kernel/codex/session.ts ui/server/src/kernel/codex/run-candidate.ts ui/server/src/kernel/probe.ts ui/server/src/kernel/codex/run-candidate.test.ts
git commit -m "$(cat <<'EOF'
fix(kernel): point Codex subprocess HOME at the candidate job dir

EOF
)"
```

---

### Task 2: full 审稿 require_spawn_evidence → NO_SPAWN

**Files:**
- Modify: `ui/server/src/kernel/contracts/schema.ts`
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/verbs/templates/review_chapter.json`
- Modify: `ui/server/src/kernel/jobs/gates.ts`
- Modify: `ui/server/src/kernel/jobs/gates.test.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/commit.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.compete.test.ts`
- Modify: `ui/server/src/kernel/jobs/selection.test.ts`
- Modify: `ui/server/src/kernel/jobs/acceptance.fixture.test.ts`

**Interfaces:**

```ts
// gates.ts runPostHarvestGates input 增加：
spawnEvidence?: { subagent_threads: Array<{ thread_id: string; parent_thread_id: string; agent: string }>; agent_hints: string[] }

// 若 contract.gates 含 'require_spawn_evidence' 且 (spawnEvidence?.subagent_threads.length || 0) < 1
// → { gate: 'require_spawn_evidence', ok: false, code: 'NO_SPAWN' }，failedStatus gated
```

- Consumes: `extractSpawnEvidence` 的形状（已有）；`run-job.ts` 里 `result.spawnEvidence`；commit 时 `JSON.parse(candidate.metadata).spawn_evidence`。
- Produces: full 审稿零 spawn → 候选 `gated` / `NO_SPAWN`，不写 reviews。

**Stub 补 spawn（必须，否则 compete/selection 全红）：**

```ts
const SPAWN_OK = {
  subagent_threads: [{ thread_id: 's', parent_thread_id: 't', agent: 'story-architect' }],
  agent_hints: ['story-architect'],
}
```

把 `run-job.compete.test.ts` 与 `selection.test.ts` 里 `spawnEvidence: { subagent_threads: [], agent_hints: [] }` 换成 `SPAWN_OK`。`run-job.test.ts` 的 `stubRunner` 已有 spawn，保持。

- [ ] **Step 1: 写失败测试**

`gates.test.ts` 追加：

```ts
test('full review with zero spawn evidence gates NO_SPAWN', async () => {
  const { ws, project, chapter } = await seed()
  const base = {
    workspace: ws, projectId: project.id, chapterId: chapter.id, contract: reviewContract,
    artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report' }],
    warnings: [],
    readArtifactText: textReader({ '审稿/第002章.md': 'Fallback: none\n正文' }),
  }
  const none = await runPostHarvestGates({ ...base, spawnEvidence: { subagent_threads: [], agent_hints: [] } })
  expect(none.failedCode).toBe('NO_SPAWN')
  const ok = await runPostHarvestGates({
    ...base,
    spawnEvidence: { subagent_threads: [{ thread_id: 's', parent_thread_id: 't', agent: 'story-architect' }], agent_hints: ['story-architect'] },
  })
  expect(ok.failedCode).toBeNull()
})

test('apply contract ignores missing spawn evidence', async () => {
  const { ws, project, chapter } = await seed()
  await createNovelReview(ws, {
    project_id: project.id, review_type: 'oh_story_review',
    payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT_PARAGRAPHS), report_text: 'r' }),
  })
  const keep = EIGHT_PARAGRAPHS + '\n\n新增段。'
  const result = await runPostHarvestGates({
    workspace: ws, projectId: project.id, chapterId: chapter.id, contract: applyContract,
    artifacts: [{ rel_path: '正文/第002章_二.md', artifact_kind: 'chapter_text' }],
    warnings: [],
    spawnEvidence: { subagent_threads: [], agent_hints: [] },
    readArtifactText: textReader({ '正文/第002章_二.md': keep }),
  })
  expect(result.failedCode).toBeNull()
})
```

`acceptance.fixture.test.ts` 追加（fixture 已支持不设 `FAKE_SPAWN`）：

```ts
test('full review without spawn is gated NO_SPAWN and does not insert reviews', async () => {
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
      FAKE_WRITE_CONTENT: 'Fallback: none\n无 spawn 的报告',
      FAKE_AGENT_MESSAGE: '完成',
    },
  })
  if (!created.ok) throw new Error('create failed')
  await created.done
  const detail = getKernelJobDetail(ws, created.jobId)!
  expect(detail.candidates[0].error_code).toBe('NO_SPAWN')
  expect(detail.candidates[0].status).toBe('gated')
  expect(detail.job.status).toBe('failed')
  expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(0)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/gates.test.ts src/kernel/jobs/acceptance.fixture.test.ts`

Expected: FAIL（`NO_SPAWN` 未出现；零 spawn fixture 仍可能 committed）

- [ ] **Step 3: 实现门 + 接线 + 修 stub**

1. `KERNEL_GATES` 加入 `'require_spawn_evidence'`。
2. `review_chapter.json` 的 `allowed_gates` 加入 `require_spawn_evidence`。
3. `oh-story-core.story-review.full` 的 `gates` 在 `reject_solo_fallback` 之后加入 `require_spawn_evidence`。
4. `runPostHarvestGates` 处理该门；`run-job.ts` 传入 `spawnEvidence: result.spawnEvidence`。
5. `commit.ts`：

```ts
let spawnEvidence = { subagent_threads: [] as any[], agent_hints: [] as string[] }
try {
  const meta = JSON.parse(candidate.metadata || '{}')
  if (meta.spawn_evidence) spawnEvidence = meta.spawn_evidence
} catch { /* 缺 metadata 视为零 spawn */ }
// runPostHarvestGates({ ..., spawnEvidence })
```

6. compete / selection stub 换成 `SPAWN_OK`。

门循环里 `require_spawn_evidence` 放在 `reject_solo_fallback` 之后，solo 报告仍以 `SOLO_FALLBACK` 为先（若两者都失败，取 `results` 里第一个 `!ok`——因此 **把 require_spawn_evidence 写在 reject_solo_fallback 后面**，solo 用例保持 `SOLO_FALLBACK`）。零 spawn 且 `Fallback: none` 时只有 NO_SPAWN。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/jobs/gates.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/run-job.compete.test.ts src/kernel/jobs/selection.test.ts src/kernel/jobs/acceptance.fixture.test.ts src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/contracts/schema.ts ui/server/src/kernel/contracts/builtin.ts ui/server/src/kernel/verbs/templates/review_chapter.json ui/server/src/kernel/jobs/gates.ts ui/server/src/kernel/jobs/gates.test.ts ui/server/src/kernel/jobs/run-job.ts ui/server/src/kernel/jobs/commit.ts ui/server/src/kernel/jobs/run-job.compete.test.ts ui/server/src/kernel/jobs/selection.test.ts ui/server/src/kernel/jobs/acceptance.fixture.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): gate full reviews with no spawn evidence as NO_SPAWN

EOF
)"
```

---

### Task 3: 旧阻塞桥接 410

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts`
- Modify: `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`

**Interfaces:**

```ts
function goneOhStoryCoreAction(_req: any, res: any) {
  return res.status(410).json({
    ok: false,
    code: 'ROUTE_REMOVED',
    error: '请改用 POST /api/kernel/jobs',
  })
}
```

三条 POST 都绑这个 handler。删除 `handleAction` / `createAndRunKernelJob` 调用。`resolveDeps` 可不再包含 `runAction`。仍导出 `readOhStoryCoreAgentResult`（现网测试在用）。

- [ ] **Step 1: 写失败测试**

改 `novel-oh-story-core-routes.test.ts`：

- `POST review returns CHAPTER_NOT_FOUND...` → 改为：

```ts
test('POST review/deslop/apply return 410 ROUTE_REMOVED without creating a job', async () => {
  const { handlers } = routeHarness({
    createKernelJob: async () => { throw new Error('should not create job') },
  })
  for (const path of [
    'POST /api/novel/oh-story/core/review',
    'POST /api/novel/oh-story/core/deslop',
    'POST /api/novel/oh-story/core/apply',
  ]) {
    const res = await callRoute(handlers.get(path), chapterBody)
    expect(res.statusCode).toBe(410)
    expect(res.body).toEqual({
      ok: false,
      code: 'ROUTE_REMOVED',
      error: '请改用 POST /api/kernel/jobs',
    })
  }
})
```

- 注册列表测试仍包含这三条 POST（仍注册，只是 410）。

改 `bridge.test.ts`：三则「阻塞回包」测试改为同一 410 断言；删除对 `insertKernelJob` / committed 形状的依赖。保留一则确认 `createKernelJob` 不被调用：

```ts
test('legacy core action routes are gone and do not start kernel jobs', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
  let created = 0
  const handlers = harness(ws, async () => { created += 1; return { ok: true, jobId: 'x', done: Promise.resolve() } })
  const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), {
    body: { project_id: 1, chapter_id: 1, model_id: 9 },
  })
  expect(res.statusCode).toBe(410)
  expect(res.body.code).toBe('ROUTE_REMOVED')
  expect(created).toBe(0)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/routes/novel-oh-story-core-routes.test.ts src/routes/novel-oh-story-core-routes.bridge.test.ts`

Expected: FAIL（现网仍 200/404）

- [ ] **Step 3: 实现 410**

`registerOhStoryCoreRoutes` 末尾三条 POST 换 `goneOhStoryCoreAction`。删掉 `handleAction` 及其专用 import（`createAndRunKernelJob`、`getKernelJobDetail`、`readFileSync`、`getStageModelId`、`runOhStoryCoreAction` 等若不再引用则删除）。保留 GET 与 install。

`commercial-ops-routes.test.ts` 的路径列表 **不必改**（三条 POST 仍注册）。

折入内核 spec v1.2：

- 分期 4 行改为「阻塞桥接已 410」。
- D 列表：`$HOME` / spawn 门 / 桥接 三项标已落地（本任务全部完成后）。
- 10.5 同步表加 `ROUTE_REMOVED` 410；终态表加 `NO_SPAWN` 409。
- 7.2 spawn 句改为「full 审稿 `require_spawn_evidence`，零 spawn → `NO_SPAWN` gated」。
- 「硬隔离 `$HOME` 仍未启用」改为已启用。

折入动词 spec（`2026-08-16-novel-workbench-verb-contracts-design.md`）：

- 「Job API 与数据流」里「现网三按钮路由第一期仍可阻塞至终态（兼容现前端）；新 UI / 深度孵化必须异步」改为「旧三按钮路由已 410 `ROUTE_REMOVED`（D 补丁）；全部流量走 `POST /api/kernel/jobs` 异步轮询」。
- 「与现网合同」里「旧路由 `POST /api/novel/oh-story/core/{review,deslop,apply}` 继续转调内核，内部补 `verb`。现网验收行为不变」改为「旧路由已由 D 补丁下线为 410（短 spec 第 3 节）；三动词入口为 `POST /api/kernel/jobs`，verb 见上表」。
- 实现分期表「3 收编现网」验收「现网三按钮行为不变」追加注：「（该验收在 D 补丁前有效；此后三按钮走 kernel jobs 路径，旧路由 410）」。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/routes/novel-oh-story-core-routes.test.ts src/routes/novel-oh-story-core-routes.bridge.test.ts src/routes/novel-commercial-ops-routes.test.ts src/kernel/jobs/run-job.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-oh-story-core-routes.ts ui/server/src/routes/novel-oh-story-core-routes.test.ts ui/server/src/routes/novel-oh-story-core-routes.bridge.test.ts docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md
git commit -m "$(cat <<'EOF'
fix(kernel): retire blocking oh-story core action routes with 410

EOF
)"
```

---

## 验收

1. `mergeCodexRpcEnv({ HOME: '/job' }).HOME === '/job'`。
2. `run-candidate.ts` 含 `isolatedHome: jobDir`。
3. full 审稿 fixture 不设 `FAKE_SPAWN` → `NO_SPAWN` gated，reviews 表空。
4. full 审稿 fixture `FAKE_SPAWN=1` 仍 committed。
5. `POST /api/novel/oh-story/core/review` → 410 `ROUTE_REMOVED`，不建 job。
6. `GET /api/novel/oh-story/core` 与 install 仍 200。
7. 真机一次 full 审稿（四 reviewer 已部署、探针 ④ 绿）：正常 spawn 不误 gated，候选 `metadata.spawn_evidence.subagent_threads` 非空；结果记入 acceptance notes。误 gated 时按短 spec 回滚路径摘门并排查事件形状。

```
cd ui/server && bun test src/kernel/codex/rpc.test.ts src/kernel/codex/session.test.ts src/kernel/codex/run-candidate.test.ts src/kernel/jobs/gates.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/run-job.compete.test.ts src/kernel/jobs/selection.test.ts src/kernel/jobs/acceptance.fixture.test.ts src/routes/novel-oh-story-core-routes.test.ts src/routes/novel-oh-story-core-routes.bridge.test.ts src/routes/novel-commercial-ops-routes.test.ts
```

## 明确不做

- 工作台按钮、动词 4+、画布、删 GET/install、改 Codex、`$HOME` 容器化。

## Self-Review

- Spec D 三项各有 Task 1/2/3。
- 无 TBD。`SPAWN_OK` / `NO_SPAWN` / `ROUTE_REMOVED` / `isolatedHome` 名称前后一致。
- compete/selection 空 spawn stub 已写明必须改。
