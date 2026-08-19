# 写本章运行时（write_chapter）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 作者「确认计划，进入初稿」/「写草稿」走内核 `write_chapter`：空章 + 有细纲 → `$story-long-write` Phase 4 → `auto_if_single` 入库。已有正文拒绝。batch / `generateChapterForGroup` 不动。

**Architecture:** 内置 `oh-story-core.story-long-write.chapter`。预检在 `validateCreateKernelJob`。多份 `chapter_text` 收敛是所有 rewrite 章主体的公共逻辑，单独任务，挂在 `run-job.ts` persist 之前（stub runner 绕过 `run-candidate` 收获）。写作区用独立 hook + `createJobByVerb`，不改 `KernelJobAction`。

**Tech Stack:** Bun + TypeScript（`ui/server`、`ui/web`，bun:test）。零新依赖。

---

## Global Constraints

- Spec：`docs/superpowers/specs/2026-08-18-write-chapter-runtime-design.md`。
- `has_prose` 口径 = `listNovelWorkspaceChapters` 的 SQL CASE：`trim(chapter_text)` 非空 **且** 不含 `【占位正文】`。**不要**调用 `listNovelChapters` 当 has_prose（那个 API 不算此字段）。`getNovelChapter` 取 `chapter_text` 后就地套同一函数。
- 细纲预检 **不要**复用 `outlineChapterNo()`（标题「第 N 章」会让总纲误过）。只用 spec 三条：章行 `outline_id`、payload.`chapter_no`、`parseChapterNoFromRelPath(kernel_rel_path)`（只传路径，不传正文）。
- **不要**把 `write` 加进 `KernelJobAction`。
- **不要**把 `oh-story-core.story-long-write.outline` 标成可执行。
- 超时保持默认 10/45。不要套开书 15/60。不要写死模型 302。
- TDD。命令：`cd ui/server && bun test <相对路径>` 或 `cd ui/web && bun test <相对路径>`。每任务一提交。不要 `git add -A`。
- 不实现 `rewrite_chapter` / `write_continue` / 410 generate-prose / 自动插章行。

## 文件结构

- Modify: `ui/server/src/kernel/verbs/templates/write_chapter.json`
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/contracts/store.test.ts`
- Modify: `ui/server/src/kernel/verbs/registry.ts`
- Modify: `ui/server/src/kernel/verbs/registry.test.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.test.ts`
- Create: `ui/server/src/kernel/projection/collapse-rewrite-chapter.ts`
- Create: `ui/server/src/kernel/projection/collapse-rewrite-chapter.test.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.test.ts`
- Create: `ui/server/src/kernel/jobs/write-chapter-precheck.ts`
- Create: `ui/server/src/kernel/jobs/write-chapter-precheck.test.ts`
- Create: `ui/server/src/kernel/jobs/write-chapter.test.ts`
- Modify: `ui/web/src/kernel/jobs/client.ts`
- Modify: `ui/web/src/kernel/jobs/client.test.ts`
- Modify: `ui/web/src/kernel/jobs/messages.ts`
- Modify: `ui/web/src/kernel/jobs/messages.test.ts`
- Create: `ui/web/src/kernel/jobs/write-brief.ts`
- Create: `ui/web/src/kernel/jobs/write-brief.test.ts`
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.ts`
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`（或当前调用其它 workspace hooks 的 React 组件）
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`
- Modify: `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`

---

### Task 1: 内置写章合同 + 模板门 + 标成已实现

**Files:**
- Modify: `ui/server/src/kernel/verbs/templates/write_chapter.json`
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/contracts/store.test.ts`
- Modify: `ui/server/src/kernel/verbs/registry.ts`
- Modify: `ui/server/src/kernel/verbs/registry.test.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.test.ts`

**Interfaces:**

`write_chapter.json` 的 `template_gates` 与 `allowed_gates` 都加上 `reject_outline_artifact`：

```json
"template_gates": ["require_chapter_file", "reject_outline_artifact"],
"allowed_gates": ["require_chapter_file", "reject_outline_artifact", "write_outside_scope"]
```

内置合同（贴进 `builtin.ts`，加入 `BUILTIN_KERNEL_CONTRACTS` 数组末尾）。不要改 `.outline` / `.open` / `.expand`：

```ts
const longWriteChapter: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.chapter',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'chapter',
  verb: 'write_chapter',
  capability: 'rewrite',
  label: '写本章',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '写第 {{chapter_no}} 章《{{chapter_title}}》。',
      '执行单章写作 Phase 4；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（本章正文）。可以更新 追踪/ 下与本章相关的记录。',
      '不要开书，不要扩纲，不要写其他章，不要修改 大纲/，不要创建其它 正文/ 文件。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_write' },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

```ts
export const IMPLEMENTED_VERBS = [
  'open_book', 'review_chapter', 'apply_review', 'deslop_chapter', 'expand_outline', 'write_chapter',
] as const

const BUILTIN_DEFAULTS: Record<string, string[]> = {
  review_chapter: ['oh-story-core.story-review.full'],
  apply_review: ['oh-story-core.story-apply.surgical'],
  deslop_chapter: ['oh-story-core.story-deslop.file'],
  open_book: ['oh-story-core.story-long-write.open'],
  expand_outline: ['oh-story-core.story-long-write.expand'],
  write_chapter: ['oh-story-core.story-long-write.chapter'],
}
```

`loadVerbDefaults` 已有「补缺失键」循环，旧磁盘 defaults 会自动补 `write_chapter`。

- [ ] **Step 1: 写失败测试**

`registry.test.ts`：

```ts
test('implemented verbs are exactly the phase-1 set plus expand_outline and write_chapter', () => {
  expect([...IMPLEMENTED_VERBS].sort()).toEqual([
    'apply_review', 'deslop_chapter', 'expand_outline', 'open_book', 'review_chapter', 'write_chapter',
  ])
})
```

`validate-instance.test.ts` 追加：

```ts
test('write_chapter instance rewrites chapter text and stays implemented; outline variant stays unimplemented', () => {
  const write = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.chapter')!
  expect(resolveContractVerb(write)).toBe('write_chapter')
  expect(validateInstanceAgainstTemplate(write)).toEqual({ ok: true })
  expect(write.commit.mode).toBe('auto_if_single')
  expect(write.commit.source).toBe('oh_story_write')
  expect(write.gates).toEqual(['require_chapter_file', 'reject_outline_artifact'])
  expect(write.projection.mounts.includes('review_report')).toBe(false)
  expect(write.invoke.prompt).toContain('写第')
  expect(write.invoke.prompt).toContain('不要开书')
  const legacy = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
  expect(resolveContractVerb(legacy)).toBeNull()
})
```

`store.test.ts` 的 builtins id 列表末尾加 `'oh-story-core.story-long-write.chapter'`；断言 `verb === 'write_chapter'`。seed 文件名列表同步加 json。

`defaults.test.ts` 追加：旧文件只有 `review_chapter` 时 `loadVerbDefaults` 补出 `write_chapter`，且不覆盖用户 `review_chapter`。

`getVerbTemplate('write_chapter')!.template_gates` 含 `reject_outline_artifact`（可写在 registry 测试里）。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts src/kernel/contracts/store.test.ts src/kernel/verbs/defaults.test.ts`

Expected: FAIL（无 chapter 合同；IMPLEMENTED_VERBS 仍无 `write_chapter`）

- [ ] **Step 3: 最小实现**

按上面改 json / builtin / registry / defaults。`validateInstanceAgainstTemplate` 已校验 commit_mode 与 template_gates，新合同必须过「全部有 verb 的内置合同」。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts src/kernel/contracts/store.test.ts src/kernel/verbs/defaults.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/verbs/templates/write_chapter.json \
  ui/server/src/kernel/contracts/builtin.ts \
  ui/server/src/kernel/contracts/store.test.ts \
  ui/server/src/kernel/verbs/registry.ts \
  ui/server/src/kernel/verbs/registry.test.ts \
  ui/server/src/kernel/verbs/defaults.ts \
  ui/server/src/kernel/verbs/defaults.test.ts \
  ui/server/src/kernel/verbs/validate-instance.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): register write_chapter builtin contract as implemented

EOF
)"
```

---

### Task 2: rewrite 章主体多份 chapter_text 收敛（非写章私有）

**Files:**
- Create: `ui/server/src/kernel/projection/collapse-rewrite-chapter.ts`
- Create: `ui/server/src/kernel/projection/collapse-rewrite-chapter.test.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/write-chapter.test.ts`（本任务先写 deslop 双文件用例；写章用例在 Task 4 同文件追加）

**为什么在 run-job 而不是只在 run-candidate：** spec 写「收获后、persist 前」。`createAndRunKernelJob` 的测试用 stub `candidateRunner`，**不会**走 `harvestKernelArtifacts`。收敛必须发生在 `persistCandidateArtifacts` 之前，这样 stub 与真收获同一条路。函数做成幂等，以后 `run-candidate` 也可以再调一次，但本任务只接线 `run-job.ts`。

**Interfaces:**

```ts
export function collapseRewriteChapterArtifacts<T extends { rel_path: string; artifact_kind: string }>(input: {
  capability: string
  subjectType: string
  currentRel: string
  artifacts: T[]
}): { ok: true; artifacts: T[] } | { ok: false; code: 'OUTPUT_MISSING'; message: string } {
  if (input.capability !== 'rewrite' || input.subjectType !== 'chapter' || !input.currentRel) {
    return { ok: true, artifacts: input.artifacts }
  }
  const texts = input.artifacts.filter(a => a.artifact_kind === 'chapter_text')
  if (texts.length <= 1) return { ok: true, artifacts: input.artifacts }
  const preferred = texts.find(a => a.rel_path === input.currentRel)
  if (preferred) {
    return {
      ok: true,
      artifacts: input.artifacts.map(a => (
        a.artifact_kind === 'chapter_text' && a.rel_path !== input.currentRel
          ? { ...a, artifact_kind: 'attachment' }
          : a
      )),
    }
  }
  return {
    ok: false,
    code: 'OUTPUT_MISSING',
    message: `ambiguous chapter_text: ${texts.map(a => a.rel_path).join(', ')}`,
  }
}
```

`run-job.ts` 在 `result.ok` 之后、`persistCandidateArtifacts` 之前：

```ts
import { getNovelChapter } from '../../novel'
import { chapterRelPath } from '../projection/naming'
import { collapseRewriteChapterArtifacts } from '../projection/collapse-rewrite-chapter'

const chapterRow = await getNovelChapter(ws, body.subject_id, body.project_id)
const currentRel = chapterRow
  ? chapterRelPath(Number(chapterRow.chapter_no), String(chapterRow.title || ''))
  : ''
const collapsed = collapseRewriteChapterArtifacts({
  capability: contract.capability,
  subjectType: validated.subjectType,
  currentRel,
  artifacts: result.artifacts,
})
if (!collapsed.ok) {
  updateKernelCandidate(ws, candidateId, {
    status: 'failed',
    error_code: collapsed.code,
    last_message_excerpt: collapsed.message.slice(0, 500),
    finished_at: now,
  })
  return
}
const registered = persistCandidateArtifacts(ws, candidateId, collapsed.artifacts)
```

review 合同 capability 不是 rewrite，必须 no-op。

- [ ] **Step 1: 写失败测试**

`collapse-rewrite-chapter.test.ts`：单份 keep；两份含 `currentRel` → 另一份变 `attachment`；两份都不等于 `currentRel` → `OUTPUT_MISSING`；`capability: 'review'` 两份 chapter_text 也不动。

`write-chapter.test.ts`（本任务先只加 deslop 用例，文件可先创建 describe）：seed 章 `chapter_no: 2, title: '二', chapter_text: '旧正文'`，stub 返回：

- `正文/第002章_二.md`（kind `chapter_text`，正文 `投影这份`）
- `正文/第002章_另一标题.md`（kind `chapter_text`，正文 `不该入库`）

`verb: 'deslop_chapter'`。job `committed` 后 `getNovelChapter` 的 `chapter_text === '投影这份'`。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/projection/collapse-rewrite-chapter.test.ts src/kernel/jobs/write-chapter.test.ts`

Expected: FAIL（无模块 / deslop 可能把后一份当正文）

- [ ] **Step 3: 实现收敛并接入 run-job**

按上面。`now` 变量已在 runner 失败分支存在；成功分支在 persist 前声明 `const now = new Date().toISOString()`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/projection/collapse-rewrite-chapter.test.ts src/kernel/jobs/write-chapter.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/commit.test.ts`

Expected: PASS（审稿 stub 不受影响）

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/projection/collapse-rewrite-chapter.ts \
  ui/server/src/kernel/projection/collapse-rewrite-chapter.test.ts \
  ui/server/src/kernel/jobs/run-job.ts \
  ui/server/src/kernel/jobs/write-chapter.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): collapse extra rewrite chapter_text hits to attachment

EOF
)"
```

---

### Task 3: 写章预检 CHAPTER_NOT_FOUND / HAS_PROSE / OUTLINE_MISSING + brief_json

**Files:**
- Create: `ui/server/src/kernel/jobs/write-chapter-precheck.ts`
- Create: `ui/server/src/kernel/jobs/write-chapter-precheck.test.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.test.ts`

**Interfaces:**

```ts
import { parseChapterNoFromRelPath } from './domain-upsert'

export function chapterTextHasProse(text: string): boolean {
  const value = String(text || '')
  return value.trim().length > 0 && !value.includes('【占位正文】')
}

export function chapterHasMatchingOutline(
  chapter: { id?: number; outline_id?: number | null; chapter_no: number },
  outlines: Array<{ id: number; raw_payload?: any }>,
): boolean {
  const outlineId = Number(chapter.outline_id || 0)
  if (outlineId && outlines.some(row => Number(row.id) === outlineId)) return true
  const chapterNo = Number(chapter.chapter_no)
  for (const row of outlines) {
    const payload = row.raw_payload && typeof row.raw_payload === 'object' && !Array.isArray(row.raw_payload)
      ? row.raw_payload
      : {}
    if (Number(payload.chapter_no) === chapterNo) return true
    const rel = String(payload.kernel_rel_path || '')
    if (rel && parseChapterNoFromRelPath(rel) === chapterNo) return true
  }
  return false
}
```

`validateCreateKernelJob` 在 `expand_outline` 块之后、`hasActiveKernelJob` 之前：

```ts
import { getNovelChapter, listNovelOutlines } from '../../novel'
import { chapterHasMatchingOutline, chapterTextHasProse } from './write-chapter-precheck'

if (verb === 'write_chapter') {
  const chapter = await getNovelChapter(ws, body.subject_id, body.project_id)
  if (!chapter) {
    return { ok: false, status: 400, code: 'CHAPTER_NOT_FOUND', message: '找不到该章' }
  }
  if (chapterTextHasProse(String(chapter.chapter_text || ''))) {
    return { ok: false, status: 400, code: 'CHAPTER_HAS_PROSE', message: '本章已有正文，请用回炉或按建议改稿' }
  }
  const outlines = await listNovelOutlines(ws, body.project_id)
  if (!chapterHasMatchingOutline(chapter, outlines)) {
    return { ok: false, status: 400, code: 'OUTLINE_MISSING', message: '本章还没有细纲' }
  }
  if (body.user_brief) {
    briefJson = JSON.stringify(body.user_brief)
    if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
      return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
    }
  }
}
```

`briefJson` 变量在 open_book 块已声明为 `let briefJson = ''`。写章不要求 `idea`。

- [ ] **Step 1: 写失败测试**

`write-chapter-precheck.test.ts`：`'已有'` → true；`''` / `'   '` / `'【占位正文】草稿'` → false。outline：`outline_id` 命中；`raw_payload.chapter_no`；`kernel_rel_path: '大纲/细纲_第001章.md'`；标题为 `第1章 总纲` 但无 payload/rel_path → **false**。

`run-job.test.ts` 的 `verb-based job creation` 追加：

```ts
test('write_chapter requires empty chapter with matching outline', async () => {
  const { ws, project } = await seed()
  const empty = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '一', chapter_text: '' })
  const base = {
    project_id: project.id, subject_type: 'chapter' as const, subject_id: empty.id, verb: 'write_chapter', model_id: 9,
  }
  expect(((await validateCreateKernelJob(ws, { ...base, subject_id: 999999 }, { skipRuntimeCheck: true })) as any).code)
    .toBe('CHAPTER_NOT_FOUND')
  expect(((await validateCreateKernelJob(ws, base, { skipRuntimeCheck: true })) as any).code).toBe('OUTLINE_MISSING')
  await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'master', title: '第1章 总纲误导', summary: '不是细纲',
  })
  expect(((await validateCreateKernelJob(ws, base, { skipRuntimeCheck: true })) as any).code).toBe('OUTLINE_MISSING')
  const outline = await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲1', summary: '细',
    raw_payload: { chapter_no: 1, kernel_rel_path: '大纲/细纲_第001章.md' },
  })
  const ok = await validateCreateKernelJob(ws, { ...base, user_brief: { length_target: '自定义 1800 字' } }, { skipRuntimeCheck: true })
  expect(ok.ok).toBe(true)
  if (ok.ok) {
    expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.chapter'])
    expect(ok.briefJson).toContain('自定义 1800 字')
  }
  const filled = await createNovelChapter(ws, { project_id: project.id, chapter_no: 3, title: '三', chapter_text: '已有正文' })
  expect(((await validateCreateKernelJob(ws, { ...base, subject_id: filled.id }, { skipRuntimeCheck: true })) as any).code)
    .toBe('CHAPTER_HAS_PROSE')
  const placeholder = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 4, title: '四', chapter_text: '【占位正文】', outline_id: outline.id,
  })
  expect((await validateCreateKernelJob(ws, { ...base, subject_id: placeholder.id }, { skipRuntimeCheck: true })).ok).toBe(true)
})
```

（`seed()` 已有章 2 带正文；本测试自建空章。顶部已 import `createNovelOutline` / `createNovelChapter`。）

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/write-chapter-precheck.test.ts src/kernel/jobs/run-job.test.ts`

Expected: FAIL（写章可能 `VERB_DEFAULT_MISSING` 若 Task 1 未合入；合入后无大纲仍 `ok: true`）

- [ ] **Step 3: 实现预检**

按上面。`rewrite_chapter` 仍 `VERB_DEFAULT_MISSING`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/jobs/write-chapter-precheck.test.ts src/kernel/jobs/run-job.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/write-chapter-precheck.ts \
  ui/server/src/kernel/jobs/write-chapter-precheck.test.ts \
  ui/server/src/kernel/jobs/run-job.ts \
  ui/server/src/kernel/jobs/run-job.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): reject write_chapter jobs without outline or with prose

EOF
)"
```

---

### Task 4: 写章 stub 收获 / 门 / auto commit

**Files:**
- Modify: `ui/server/src/kernel/jobs/write-chapter.test.ts`

**Interfaces:** 复用 expand stub 形态。空章必须先过 Task 3 预检（带 matching outline）。`auto_if_single` → job `committed`，不必再 `commitKernelCandidate`。

```ts
function stubWrite(files: Record<string, { kind: string; text: string }>, warnings: Array<{ warning: string; rel_path: string }> = []) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'write-art-'))
    const artifacts = Object.entries(files).map(([rel, spec]) => {
      const full = join(dir, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, spec.text)
      return { rel_path: rel, artifact_kind: spec.kind, sha256: 'h', byte_size: spec.text.length, copied_path: full }
    })
    input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts, warnings, lastMessage: '写完',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}
```

投影文件名：`chapterRelPath(1, '一')` → `正文/第001章_一.md`（`naming.ts` 的 `safeChapterTitle`）。

需要 `openDb` + `ensureSqliteSchema` 读 `chapter_versions.source`（novel db，不是 kernel db）：

```ts
import { openDb, ensureSqliteSchema } from '../../novel/db'
function latestVersionSource(ws: string, chapterId: number): string {
  const db = openDb(ws)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`SELECT source FROM chapter_versions WHERE chapter_id = ? ORDER BY version_no DESC LIMIT 1`).get(chapterId) as any
    return String(row?.source || '')
  } finally { db.close() }
}
```

- [ ] **Step 1: 写失败测试**

在 `write-chapter.test.ts` 追加 `describe('write_chapter jobs')`：

1. 只改 `正文/第001章_一.md` 为非空 → job `committed`，该章正文等于收获文本，`latestVersionSource === 'oh_story_write'`，另一章（seed 的章 2）正文不变。
2. 收获空文件 → `CHAPTER_FILE_MISSING`，账本仍空。
3. warnings `大纲/细纲.md` → `REJECT_OUTLINE`，正文不变。
4. 只写 `正文/第001章_新标题.md`（单份，≠ 投影名）→ 仍 committed，正文等于该文件。
5. 同时写投影名（内容 `A`）与 `正文/第001章_另一标题.md`（内容 `B`）→ committed，正文 `A`；detail.artifacts 里 `B` 的 kind 为 `attachment`。
6. 两份都不等于投影名 → 候选 `failed` `OUTPUT_MISSING`，正文仍空。
7. 同 `subject_id` 第二个 job（先插一条 `running` write_chapter job）→ 409 `PROJECT_JOB_RUNNING`；不同章可 `ok`。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/write-chapter.test.ts`

Expected: FAIL（尚无写章编排路径或门未挂）

- [ ] **Step 3: 最小实现**

合同与预检已在前序任务。本任务通常只补测试；若 `require_chapter_file` 对 rewrite 已看收获正文，空文件应已失败。`REJECT_OUTLINE` 依赖合同 gates（Task 1）。两份非投影名依赖 Task 2。若测试红在「未 auto commit」，查 `commit.mode` 是否 `auto_if_single`。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/jobs/write-chapter.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/commit.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/write-chapter.test.ts
git commit -m "$(cat <<'EOF'
test(kernel): cover write_chapter harvest gates and auto commit

EOF
)"
```

---

### Task 5: 前端 kernel 客户端按 verb 创建 + toast

**Files:**
- Modify: `ui/web/src/kernel/jobs/client.ts`
- Modify: `ui/web/src/kernel/jobs/client.test.ts`
- Modify: `ui/web/src/kernel/jobs/messages.ts`
- Modify: `ui/web/src/kernel/jobs/messages.test.ts`
- Create: `ui/web/src/kernel/jobs/write-brief.ts`
- Create: `ui/web/src/kernel/jobs/write-brief.test.ts`

**不要**改 `KernelJobAction` 或 `CHAPTER_KERNEL_VERBS`。

**Interfaces:**

`client.ts` 的 `createKernelJobApi` 增加：

```ts
async createJobByVerb(input: {
  projectId: number
  chapterId: number
  modelId: number
  verb: string
  userBrief?: { title?: string; genre?: string; idea?: string; length_target?: string; constraints?: string }
}): Promise<{ ok: true; jobId: string } | KernelApiError> {
  const body: Record<string, unknown> = {
    project_id: input.projectId,
    subject_type: 'chapter',
    subject_id: input.chapterId,
    verb: input.verb,
    model_id: input.modelId,
  }
  if (input.userBrief && String(input.userBrief.length_target || '').trim()) {
    body.user_brief = input.userBrief
  }
  const { status, data } = await request('POST', '/kernel/jobs', body)
  const jobId = String(data?.job?.id || '')
  if (status >= 200 && status < 300 && jobId) return { ok: true, jobId }
  return fail(status, data)
}
```

`messages.ts`：

```ts
if (value === 'CHAPTER_HAS_PROSE') {
  return { kind: 'warning', text: '本章已有正文，请用回炉或按建议改稿' }
}
if (value === 'OUTLINE_MISSING') {
  return { kind: 'warning', text: '本章还没有细纲' }
}
if (value === 'CHAPTER_NOT_FOUND') {
  return { kind: 'error', text: '找不到该章' }
}
```

`write-brief.ts`：

```ts
export function writeChapterLengthTarget(payload: { word_target_mode?: string; target_word_count?: number }): string {
  if (payload.word_target_mode === 'custom' && Number(payload.target_word_count) > 0) {
    return `自定义 ${Number(payload.target_word_count)} 字`
  }
  if (payload.word_target_mode) return `word_target_mode=${payload.word_target_mode}`
  return ''
}
```

- [ ] **Step 1: 写失败测试**

`client.test.ts`：`createJobByVerb` POST body 含 `verb: 'write_chapter'`、`subject_type: 'chapter'`；有 `length_target` 才带 `user_brief`。

`messages.test.ts`：三码文案。

`write-brief.test.ts`：custom 1800；mode `auto`；空 payload。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/kernel/jobs/client.test.ts src/kernel/jobs/messages.test.ts src/kernel/jobs/write-brief.test.ts`

Expected: FAIL

- [ ] **Step 3: 最小实现**

按上面。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/kernel/jobs/client.test.ts src/kernel/jobs/messages.test.ts src/kernel/jobs/write-brief.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/kernel/jobs/client.ts ui/web/src/kernel/jobs/client.test.ts \
  ui/web/src/kernel/jobs/messages.ts ui/web/src/kernel/jobs/messages.test.ts \
  ui/web/src/kernel/jobs/write-brief.ts ui/web/src/kernel/jobs/write-brief.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add kernel createJobByVerb and write_chapter toasts

EOF
)"
```

---

### Task 6: 写作区 hook + 作者入口改道

**Files:**
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.ts`
- Create: `ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts`
- Modify: 调用 `createChapterProseHandlers` 的 React 组件（`use-novel-workspace-base-model.tsx` 或 `workspace-view-bind-core-handlers.ts` 的调用方）。**hook 只能放在 React 组件里**，与 `useChapterAutosave` 同层，不要放进非组件的 bind 函数。

**Interfaces:**

`use-chapter-write-job.ts` 的 reducer 与质检类似，但 **没有** `action: KernelJobAction`、**没有** `commit`：

```ts
export type ChapterWriteJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

export function reduceChapterWriteProgress(prev: ChapterWriteJobState, detail: KernelJobDetail): ChapterWriteJobState {
  const jobId = String(detail.job?.id || (prev.phase === 'idle' ? '' : prev.jobId) || '')
  const elapsedSec = Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000)
  const hint = String(detail.progress?.hint || '')
  const status = String(detail.job?.status || '')
  if (status === 'committed' || status === 'cancelled') return { phase: 'idle' }
  if (status === 'failed' || status === 'awaiting_selection') {
    return { phase: 'failed', jobId, errorCode: String(detail.job?.error_code || (status === 'awaiting_selection' ? 'AWAITING_SELECTION' : 'ENGINE_FAILED')) }
  }
  return { phase: 'running', jobId, hint, elapsedSec }
}
```

`start(chapterId: number)`：`flushPendingSave` → `api.createJobByVerb({ projectId, chapterId, modelId, verb: 'write_chapter', userBrief: lengthTarget ? { length_target } : undefined })` → `pollKernelJob`（1s）。`committed` → `loadProjectModules` + success toast「本章初稿已写入」。`awaiting_selection` → toast `error_code`（或 `AWAITING_SELECTION`），**不要** `commitJob`。同步 400 走 `kernelJobUserMessage`。`cancel` 只 cancel 当前写章 jobId。

`generateCurrentChapterProse`：**删除**对该函数体内的 `fetch(.../generate-prose?stream=1)`。改为：

```ts
await deps.startKernelWriteChapter(Number(targetChapter.id))
```

`ChapterProseHandlerDeps` 增加必填 `startKernelWriteChapter: (chapterId: number) => Promise<void>`。保留 `setGeneratingProse`：在调用 start 前后由 hook 的 `running` 或 handler 自己 `setGeneratingProse(true/false)`。不要再 `setStreamingText` 拼 chunk。`setStreamingProgress` 可用 hook hint；没有 hint 时写「正在写本章…」。

**禁止**改 `workspace-production-handlers.tsx` / `workspace-run-queue-handlers.tsx` / 同一文件里的 batch `fetch generate-prose` 循环。

Grep 定位 hook 挂载点：`useChapterAutosave` 所在组件。把 `writeJob.start` 传入 `startKernelWriteChapter`。`writingSkillsPayload` 不要进 brief。

```ts
const length = writeChapterLengthTarget(chapterWordTargetPayload())
// createJobByVerb userBrief: length ? { length_target: length } : undefined
```

- [ ] **Step 1: 写失败测试**

`use-chapter-write-job.test.ts`：`reduceChapterWriteProgress` running elapsed；failed；awaiting_selection → failed 且不保持 selection。

`workspace-chapter-prose-handlers.test.ts` 追加：`startKernelWriteChapter` 被 `generateCurrentChapterProse` 调用一次，参数为 `activeChapter.id`；`globalThis.fetch` 不被调用。原依赖 `fetch` generate-prose 的 **单章** 测试改为断言 kernel；batch 测试仍可打 `/novel/chapters/${ch.id}/generate-prose`。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/use-chapter-write-job.test.ts src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts`

Expected: FAIL

- [ ] **Step 3: 实现 hook 与改道**

按上面。`confirm_plan_and_write_draft` / `write_draft` 已经调用 `generateCurrentChapterProse`，改 handler 内部即可覆盖两条动作。`repairContextAndGenerateCurrentChapter` 若成功后调用 `generateCurrentChapterProse`，一并走内核（仍是作者写本章）。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/web && bun test src/pages/novel-workspace/shell/use-chapter-write-job.test.ts src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts src/kernel/jobs/`

Expected: PASS。再 grep：`generateCurrentChapterProse` 函数体（不是 batch 循环）不得含 `generate-prose`。

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.ts \
  ui/web/src/pages/novel-workspace/shell/use-chapter-write-job.test.ts \
  ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.tsx \
  ui/web/src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts \
  ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx
git commit -m "$(cat <<'EOF'
feat(web): route author write-draft through write_chapter kernel jobs

EOF
)"
```

若实际改了 bind 文件而不是 base-model，只 add 实际改动的文件，不要 `git add -A`。

---

### Task 7: 纸面折入动词 spec / 内核 spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`
- Modify: `docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md`

- [ ] **Step 1: 改纸面**

动词 spec「与现网合同」把写章从「以后」拆出一行：`write_chapter` / `oh-story-core.story-long-write.chapter`（作者入口；`auto_if_single`）。错误表加 `CHAPTER_HAS_PROSE`、`CHAPTER_NOT_FOUND`。`write_chapter` 节补：已有正文 400；`reject_outline_artifact` 为模板门。无 verb 推断表加 `.chapter` → `write_chapter`。4+ 排期：写章运行时已落地（本计划），续写/回炉仍另开。

内核 spec 排期 C：`write_chapter` 已按 `2026-08-19-write-chapter-runtime` 落地；未做续写/回炉/适配。`executeNovelAgent` 行：作者写本章走 `write_chapter`；batch 仍旧 API。

- [ ] **Step 2: 确认没有残留「写章仍 CONTRACT_NOT_IMPLEMENTED」作为现行事实**（v1.2 历史条目可保留并标注已被覆盖，像扩纲 v1.3 那样）。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md \
  docs/superpowers/specs/2026-08-15-codex-kernel-vault-design.md
git commit -m "$(cat <<'EOF'
docs(kernel): record write_chapter runtime as landed

EOF
)"
```

本任务在代码绿了之后做。不要在 Task 1 刚登记合同时就写「已落地」。

---

### Task 8: 真机验收（模型 304）

**不打过期 8787。** 用当前 `ui/server` 源码或当前工作台。项目 **7** 第 **1** 章（开书空章 + 细纲）。

- [ ] **Step 1:** 确认第 1 章 `has_prose=false` 且有细纲。
- [ ] **Step 2:** 工作台对该章点「确认计划，进入初稿」或等价 `write_draft`。`POST /api/kernel/jobs` body.`verb === 'write_chapter'`，`model_id === 304`。
- [ ] **Step 3:** job `committed`；账本该章非空；`has_prose=true`。
- [ ] **Step 4:** 再点一次 → 400 `CHAPTER_HAS_PROSE`，正文不被覆盖。
- [ ] **Step 5:** 笔记写到 `docs/superpowers/plans/2026-08-19-write-chapter-runtime-acceptance-notes.md`（只记真实 job id）。不要 `git add -A`。笔记提交可另做，或与用户确认后再 commit。

---

## 验收命令（实现结束后）

```bash
cd ui/server && bun test \
  src/kernel/verbs/registry.test.ts \
  src/kernel/verbs/validate-instance.test.ts \
  src/kernel/verbs/defaults.test.ts \
  src/kernel/contracts/store.test.ts \
  src/kernel/jobs/run-job.test.ts \
  src/kernel/jobs/write-chapter.test.ts \
  src/kernel/jobs/write-chapter-precheck.test.ts \
  src/kernel/projection/collapse-rewrite-chapter.test.ts \
  src/kernel/jobs/commit.test.ts

cd ui/web && bun test \
  src/kernel/jobs/client.test.ts \
  src/kernel/jobs/messages.test.ts \
  src/kernel/jobs/write-brief.test.ts \
  src/pages/novel-workspace/shell/use-chapter-write-job.test.ts \
  src/pages/novel-workspace/shell/workspace-chapter-prose-handlers.test.ts
```

Expected: 全 PASS，0 fail。
