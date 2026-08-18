# 扩纲运行时（expand_outline）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `expand_outline` 成为可执行内核动词：内置合同、预检 `FOUNDATION_PRECONDITION`、收存/门/手动 commit 走现有 job API。工作台不接新按钮。

**Architecture:** 新增内置实例 `oh-story-core.story-long-write.expand`（`outlines.upsert`，禁止 `outlines.replace`）。把它加入 `IMPLEMENTED_VERBS` 与 `verb_defaults`。`validateCreateKernelJob` 在动词为 `expand_outline` 时要求账本至少一份大纲。编排复用 `createAndRunKernelJob`；`commit.mode=manual` 故单候选也进 `awaiting_selection`。不改规划工作台「未来100章」旧路径。

**Tech Stack:** Bun + TypeScript（`ui/server`，bun:test）。零新依赖。

## Global Constraints

- 动词规范：`docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md` 的 `expand_outline` 节。
- 模板已存在：`ui/server/src/kernel/verbs/templates/expand_outline.json`（`subject_type=project`，`commit_mode=manual`，`allowed_replace_bindings=false`，门 `reject_chapter_text_artifact`）。
- **不要**把未实现的 `oh-story-core.story-long-write.outline`（`outlines.replace`）标成可执行。
- 预检：`listNovelOutlines(ws, project_id).length === 0` → 400 `FOUNDATION_PRECONDITION`。不要求 `user_brief`。
- `subject_id` 必须等于 `project_id`（已有 project 主体规则）。
- 超时用默认 10/45 分钟，不要套开书 15/60。
- 不接工作台按钮、不改未来100章/滚动规划、不实现 `write_chapter`。
- TDD。测试：`cd ui/server && bun test <相对路径>`。每任务一提交。不要 `git add -A`。
- 模型用请求里的 `model_id`，不要写死 302。

## 文件结构

- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/verbs/registry.ts`（`IMPLEMENTED_VERBS`）
- Modify: `ui/server/src/kernel/verbs/defaults.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.ts`（补 `commit_mode` 校验）
- Modify: `ui/server/src/kernel/verbs/registry.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.test.ts`（现有「全部有 verb 的内置合同过模板」会自动覆盖新合同）
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.test.ts`
- Modify: `ui/server/src/kernel/jobs/domain-upsert.ts`
- Modify: `ui/server/src/kernel/jobs/domain-upsert.test.ts`
- Modify: `ui/server/src/kernel/projection/project.ts`
- Modify: `ui/server/src/kernel/projection/project.test.ts`
- Create: `ui/server/src/kernel/jobs/expand-outline.test.ts`
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`（非目标：扩纲运行时已落地）

---

### Task 1: 内置扩纲合同 + 标成已实现

**Files:**
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Modify: `ui/server/src/kernel/verbs/registry.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.ts`
- Modify: `ui/server/src/kernel/verbs/defaults.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.ts`
- Modify: `ui/server/src/kernel/verbs/registry.test.ts`
- Modify: `ui/server/src/kernel/verbs/validate-instance.test.ts`

**Interfaces:**

内置合同必须通过 `validateKernelContract` 与 `validateInstanceAgainstTemplate`。锁定字段：

```ts
const longWriteExpand: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.expand',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'expand',
  verb: 'expand_outline',
  capability: 'outline',
  label: '扩写大纲',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '扩写大纲。',
      '在现有 大纲/ 与 设定/ 上新增或修改细纲、卷纲；至少改一份 大纲/ 下的 markdown。',
      '可以更新 设定/ 世界观或角色档案。',
      '不要写正文，不要创建 正文/ 下的任何文件。',
      '不要删除或整份替换已有总纲文件名为目的；用修改或新增文件表达扩写。',
    ].join('\n'),
  },
  projection: { mounts: ['outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
    { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: false },
    { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: false },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['设定/', '大纲/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_chapter_text_artifact'],
  commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}
```

```ts
export const IMPLEMENTED_VERBS = ['open_book', 'review_chapter', 'apply_review', 'deslop_chapter', 'expand_outline'] as const

const BUILTIN_DEFAULTS: Record<string, string[]> = {
  review_chapter: ['oh-story-core.story-review.full'],
  apply_review: ['oh-story-core.story-apply.surgical'],
  deslop_chapter: ['oh-story-core.story-deslop.file'],
  open_book: ['oh-story-core.story-long-write.open'],
  expand_outline: ['oh-story-core.story-long-write.expand'],
}
```

`BUILTIN_KERNEL_CONTRACTS` 数组加入 `longWriteExpand`。不要改 `story-long-write.outline`。

- [ ] **Step 1: 写失败测试**

`registry.test.ts` 把 implemented 断言改为含 `expand_outline`：

```ts
test('implemented verbs are exactly the phase-1 set plus expand_outline', () => {
  expect([...IMPLEMENTED_VERBS].sort()).toEqual([
    'apply_review', 'deslop_chapter', 'expand_outline', 'open_book', 'review_chapter',
  ])
})
```

`validate-instance.test.ts` 追加：

```ts
test('expand instance upserts outlines and is implemented; replace outline variant stays unimplemented', () => {
  const expand = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.expand')!
  expect(resolveContractVerb(expand)).toBe('expand_outline')
  expect(validateInstanceAgainstTemplate(expand)).toEqual({ ok: true })
  expect(expand.commit.mode).toBe('manual')
  expect(expand.outputs.some(o => o.binding === 'outlines.replace')).toBe(false)
  expect(expand.invoke.prompt).toContain('扩写大纲')
  expect(expand.invoke.prompt).toContain('不要写正文')
  const legacy = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
  expect(resolveContractVerb(legacy)).toBeNull()
})

test('instance commit mode must match the template commit_mode', () => {
  const expand = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.expand')!
  const auto = { ...expand, commit: { ...expand.commit, mode: 'auto_if_single' } }
  const result = validateInstanceAgainstTemplate(auto as any)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.errors.join(' ')).toContain('commit.mode')
  const never = { ...expand, commit: { ...expand.commit, mode: 'never' } }
  expect(validateInstanceAgainstTemplate(never as any).ok).toBe(true)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts`

Expected: FAIL（无 expand 合同；IMPLEMENTED_VERBS 仍是 4 个）

- [ ] **Step 3: 最小实现**

按上面贴进 `builtin.ts` / `registry.ts` / `defaults.ts`。已有工作区的 `verb-defaults.json` 是首启时落盘的，不含 expand 键——`loadVerbDefaults` 在解析成功后必须补齐 `BUILTIN_DEFAULTS` 里缺失的键（通用写法，下一个动词不再重复这段；用户对已有键的改动保持原样）：

```ts
export function loadVerbDefaults(ws: string): Record<string, string[]> {
  const loaded = /* 现有：读文件 + sanitizeVerbDefaults；失败回 BUILTIN_DEFAULTS 拷贝 */
  for (const [verb, ids] of Object.entries(BUILTIN_DEFAULTS)) {
    if (!loaded[verb]?.length) loaded[verb] = [...ids]
  }
  return loaded
}
```

`defaults.test.ts`（已存在）追加一则：先写入一份只含 `review_chapter: ['my-pack.my-review.v1']` 的旧 defaults 文件，`loadVerbDefaults` 返回值必须补出 `expand_outline`（内置默认），且 `review_chapter` 保持用户值不被覆盖。

`validate-instance.ts` 在 domain_writes 检查后追加 commit 模式校验——模板的 `commit_mode` 此前无人执行，实例写 `auto_if_single` 就能绕开「扩纲/开书必须手动采纳」：

```ts
  if (contract.commit.mode !== template.commit_mode && contract.commit.mode !== 'never') {
    errors.push(`commit.mode ${contract.commit.mode} must be ${template.commit_mode} (or never) for verb ${verb}`)
  }
```

（对照五份带 verb 的内置合同：review/deslop/apply 为 `auto_if_single` 对 `auto_if_single`，open/expand 为 `manual` 对 `manual`，全部通过，无回归；`never` 放行是给实验合同留的更保守选项。）

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts src/kernel/verbs/defaults.test.ts src/kernel/contracts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/contracts/builtin.ts ui/server/src/kernel/verbs/registry.ts ui/server/src/kernel/verbs/defaults.ts ui/server/src/kernel/verbs/registry.test.ts ui/server/src/kernel/verbs/validate-instance.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): register expand_outline builtin contract as implemented

EOF
)"
```

---

### Task 2: 扩纲预检 FOUNDATION_PRECONDITION

**Files:**
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.test.ts`

**Interfaces:**

在 `validateCreateKernelJob` 里，`verb` 已解析且 template 校验通过之后、`hasActiveKernelJob` 之前：

```ts
import { listNovelOutlines } from '../../novel'

if (verb === 'expand_outline') {
  const outlines = await listNovelOutlines(ws, body.project_id)
  if (!Array.isArray(outlines) || outlines.length === 0) {
    return { ok: false, status: 400, code: 'FOUNDATION_PRECONDITION', message: '扩纲需要账本里已有大纲' }
  }
}
```

不要给 `rewrite_chapter` 误加默认。`CreateKernelJobError` 的 status 联合类型已含 400。

- [ ] **Step 1: 写失败测试**

`run-job.test.ts` 的 `verb-based job creation` 追加：

```ts
test('expand_outline requires an existing outline and project subject', async () => {
  const { ws, project } = await seed()
  const body = {
    project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
    verb: 'expand_outline', model_id: 9,
  }
  expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('FOUNDATION_PRECONDITION')
  const { createNovelOutline } = await import('../../novel')
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '已有总纲' })
  const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
  expect(ok.ok).toBe(true)
  if (ok.ok) expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.expand'])
  expect(((await validateCreateKernelJob(ws, {
    ...body, subject_type: 'chapter', subject_id: 1,
  }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
})
```

（若文件顶部已 `import { createNovelOutline }` 则不要动态 import。）

原测试 `unknown verb / missing default` 里 `rewrite_chapter` 仍是 `VERB_DEFAULT_MISSING`。`story-long-write.outline` 仍 `CONTRACT_NOT_IMPLEMENTED`（已有 validation 测试）。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/run-job.test.ts`

Expected: FAIL（无大纲时可能 `ok: true` 或 `VERB_DEFAULT_MISSING`，取决于 Task 1 是否已合入）

- [ ] **Step 3: 实现预检**

按上面插入 `listNovelOutlines` 判断。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/jobs/run-job.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/run-job.ts ui/server/src/kernel/jobs/run-job.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): reject expand_outline jobs without an existing outline

EOF
)"
```

---

### Task 3: 扩纲编排：手动选优、禁正文、commit upsert

**Files:**
- Create: `ui/server/src/kernel/jobs/expand-outline.test.ts`
- Modify: `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`

**行为：** stub runner 在投影后的 `projectDir` 不必真投影——与 `run-job.test.ts` 一样直接交 harvested artifacts。

- 只交 `大纲/第003章.md` → 候选 `succeeded`，job `awaiting_selection`（manual，即使只有 1 个 succeeded）。
- `commitKernelCandidate` 后 `listNovelOutlines` 含该细纲（章号 3 或标题来自 heading）。
- 交 `正文/第001章.md`（可同时交大纲）→ `REJECT_CHAPTER_TEXT`，job `failed`，commit 不得写出新大纲。
- 零 `outline_doc` → `KIND_COUNT_BELOW_MIN`，候选 `failed`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/jobs/expand-outline.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelOutline, createNovelProject, listNovelOutlines } from '../../novel'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function stubExpand(files: Record<string, { kind: string; text: string }>) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'expand-art-'))
    const artifacts = Object.entries(files).map(([rel, spec]) => {
      const full = join(dir, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, spec.text)
      return { rel_path: rel, artifact_kind: spec.kind, sha256: 'h', byte_size: spec.text.length, copied_path: full }
    })
    input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts, warnings: [], lastMessage: '扩纲完成',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

async function seedExpand() {
  const ws = mkdtempSync(join(tmpdir(), 'expand-job-'))
  const project = await createNovelProject(ws, { title: '书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '已有总纲' })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
    verb: 'expand_outline', model_id: 9,
  }
  return { ws, project, body }
}

describe('expand_outline jobs', () => {
  test('single succeeded candidate waits for manual commit then upserts outline', async () => {
    const { ws, project, body } = await seedExpand()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '大纲/第003章.md': { kind: 'outline_doc', text: '# 第3章 夜谈\n目标：对质。' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates[0].status).toBe('succeeded')
    const committed = await commitKernelCandidate(ws, created.jobId, detail.candidates[0].id)
    expect(committed.ok).toBe(true)
    const outlines = await listNovelOutlines(ws, project.id)
    expect(outlines.some((row: any) => String(row.title || '').includes('夜谈') || String(row.summary || '').includes('对质'))).toBe(true)
  })

  test('writing 正文/ gates REJECT_CHAPTER_TEXT and does not commit', async () => {
    const { ws, project, body } = await seedExpand()
    const before = (await listNovelOutlines(ws, project.id)).length
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '大纲/第003章.md': { kind: 'outline_doc', text: '# 第3章\n细纲' },
        '正文/第001章.md': { kind: 'chapter_text', text: '偷写的正文' },
      }) as any,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('REJECT_CHAPTER_TEXT')
    expect(detail.job.status).toBe('failed')
    expect((await listNovelOutlines(ws, project.id)).length).toBe(before)
  })

  test('no outline_doc artifact fails KIND_COUNT_BELOW_MIN', async () => {
    const { ws, body } = await seedExpand()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '设定/世界观.md': { kind: 'world_doc', text: '只改设定' },
      }) as any,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('KIND_COUNT_BELOW_MIN')
    expect(detail.candidates[0].status).toBe('failed')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/expand-outline.test.ts`

Expected: FAIL（模块不存在，或 job 因 verb 未实现 400）

- [ ] **Step 3: 实现**

若 Task 1–2 已合入，本任务通常 **零生产代码**：现有 `reject_chapter_text_artifact`、`kind_count`、`commit.mode=manual` → `awaiting_selection`、`outlines.upsert` 已存在。若单测红在「auto commit」，检查 `run-job.ts` 是否误用 `auto_if_single`；expand 合同必须 `manual`。

若 `REJECT_CHAPTER_TEXT` 没触发：确认 stub 的 `artifact_kind: 'chapter_text'` 或 `rel_path` 以 `正文/` 开头（门看 artifacts kind **或** `changedPaths`/`warnings`；`run-job` 传给 gates 的是 registered artifacts。`persistCandidateArtifacts` 会保留 `rel_path`。`reject_chapter_text_artifact` 认 `artifact_kind === 'chapter_text'` 或 path `正文/`）。

不要为了过测试改门语义。

动词 spec「非目标」里「不在第一期编码实现扩纲」改为：扩纲运行时已按本计划落地；写章/续写/回炉/适配仍未做。排期 4+ 行注明扩纲已有实现计划。

- [ ] **Step 4: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/jobs/expand-outline.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/gates.test.ts src/kernel/jobs/commit.test.ts src/kernel/verbs/registry.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/expand-outline.test.ts docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md
git commit -m "$(cat <<'EOF'
test(kernel): cover expand_outline harvest gates and manual commit

EOF
)"
```

若 Step 3 改了 `run-job.ts` / `gates.ts` / `builtin.ts`，把那些文件一并 add，message 改为 `feat(kernel): run expand_outline jobs to manual selection`。

---

### Task 4: 扩纲投影保真——outline 按 kernel_rel_path 回放

**Files:**
- Modify: `ui/server/src/kernel/jobs/domain-upsert.ts`
- Modify: `ui/server/src/kernel/jobs/domain-upsert.test.ts`
- Modify: `ui/server/src/kernel/projection/project.ts`
- Modify: `ui/server/src/kernel/projection/project.test.ts`

**为什么必须做：** 现网 outline 挂载只合成 `大纲/总纲.md` / `大纲/细纲.md`，不回放开书产出的原布局；而 `story-long-write` 补纲/扩纲按自家布局读 `大纲/大纲.md`、`卷纲_第X卷.md`、`细纲_第XXX章.md`。不回放，skill 会把项目当未开书重新规划、重写既有细纲，而本计划的 stub 测试全绕过投影，这个质量风险零覆盖。机制对称于 world 挂载已有的 `kernel_rel_path` 回放。

**Interfaces:**
- `upsertOutlineDoc` 的 raw_payload 增存 `kernel_full_text`（对称 `upsertWorldDoc`；现网只存 `{ kernel_rel_path, chapter_no }`）。
- outline 挂载：凡 `raw_payload.kernel_rel_path` 非空且不含 `..` 的行，按原相对路径写 `kernel_full_text || summary`；无 rel_path 的旧行维持合成 总纲/细纲 兜底（零旧行则不写合成文件）；按章卡片逻辑不变（仅 chapter 主体）。

- [ ] **Step 1: 写失败测试**

`domain-upsert.test.ts` 在 outline upsert 用例里追加断言：

```ts
    const row = db.query(`SELECT raw_payload FROM outlines WHERE id = ?`).get(outlineId) as any
    expect(JSON.parse(row.raw_payload).kernel_full_text).toContain('细纲内容')
```

`project.test.ts` 追加（seed helper 仿照本文件 world 回放用例的 `seedWorldbuilding`，直接 `INSERT INTO outlines (project_id, outline_type, title, summary, raw_payload)`）：

```ts
test('outline mount replays committed outline files by kernel_rel_path', async () => {
  const ws = makeWs()
  seedOutlineRow(ws, 1, {
    outline_type: 'chapter', title: '第3章 夜谈', summary: '截断摘要',
    raw_payload: JSON.stringify({ kernel_rel_path: '大纲/细纲_第003章.md', chapter_no: 3, kernel_full_text: '# 第3章 夜谈\n完整细纲全文' }),
  })
  seedOutlineRow(ws, 1, { outline_type: 'master', title: '旧总纲', summary: '旧行摘要', raw_payload: '{}' })
  const contract: any = { ...minimalContract(), projection: { mounts: ['outline', 'skill_tree'] } }
  const dir = mkdtempSync(join(tmpdir(), 'proj-outline-'))
  await projectKernelSubject({ workspace: ws, projectId: 1, chapterId: 0, contract, projectDir: dir, subjectType: 'project' })
  expect(readFileSync(join(dir, '大纲/细纲_第003章.md'), 'utf8')).toContain('完整细纲全文')
  expect(readFileSync(join(dir, '大纲/总纲.md'), 'utf8')).toContain('旧行摘要')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/domain-upsert.test.ts src/kernel/projection/project.test.ts`

Expected: FAIL（raw_payload 无 kernel_full_text；细纲文件未按原路径回放）

- [ ] **Step 3: 实现**

`domain-upsert.ts` 的 `upsertOutlineDoc` payload 行改为：

```ts
    const payload = JSON.stringify({ kernel_rel_path: relPath, kernel_full_text: text, ...(chapterNo === null ? {} : { chapter_no: chapterNo }) })
```

`project.ts` outline 挂载块：先按行分流，带 rel_path 的按原路径回放，旧行走原合成逻辑：

```ts
  if (mounts.includes('outline')) {
    const outlines = await listNovelOutlines(workspace, projectId)
    const legacyRows: any[] = []
    for (const row of outlines) {
      let payload: any = {}
      try { payload = JSON.parse(String((row as any).raw_payload || '{}')) } catch { payload = {} }
      const relPath = String(payload.kernel_rel_path || '')
      if (relPath && !relPath.includes('..')) {
        writeProjected(projectDir, relPath, String(payload.kernel_full_text || row.summary || ''), files)
      } else {
        legacyRows.push(row)
      }
    }
    if (legacyRows.length) {
      // 原有 master/detail 过滤与 大纲/总纲.md、大纲/细纲.md 合成逻辑，输入改为 legacyRows
    }
    // 按章卡片（大纲/第{pad}章.md）逻辑保持原样，仅 chapter 主体（既有 if (chapter) 保护不动）
  }
```

（既有 chapter 主体投影测试 seed 的行都没有 rel_path → 全走 legacy 分支，行为不变。）

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/domain-upsert.ts ui/server/src/kernel/jobs/domain-upsert.test.ts ui/server/src/kernel/projection/project.ts ui/server/src/kernel/projection/project.test.ts
git commit -m "$(cat <<'EOF'
feat(kernel): replay committed outline files by rel path for project subjects
EOF
)"
```

注意：本任务只保证「本次开书之后」的行有全文可回放（`kernel_full_text` 从本任务起写入）。此前已采纳的开书行只有 rel_path + summary——回放会用 `summary` 兜底，内容等价（现网 summary 截断阈值 4000 字符，章细纲通常远小于此）。

---

## 验收

1. `POST /api/kernel/jobs` `{ verb: 'expand_outline', subject_type: 'project', subject_id: project_id, model_id }` 在无大纲时 400 `FOUNDATION_PRECONDITION`。
2. 有大纲时 202；单候选 succeeded → `awaiting_selection`（不自动入库）。
3. commit 后 outlines 增多；写 `正文/` → `REJECT_CHAPTER_TEXT` 且领域大纲数不变。
4. `oh-story-core.story-long-write.outline` 仍 400 `CONTRACT_NOT_IMPLEMENTED`。
5. 工作台规划页源码不出现 `expand_outline` / `/kernel/jobs` 扩纲按钮（本计划禁止加）。
6. 真机（必做，记入 acceptance notes）：对已开书采纳的项目跑一次扩纲——投影目录含开书原布局（`大纲/细纲_第NNN章.md` 等）与追踪回放；skill 走补纲/扩纲而非重开书；采纳后新细纲入库、既有细纲行未被整体重写（抽查 2 行对比 summary）。

```
cd ui/server && bun test src/kernel/verbs/registry.test.ts src/kernel/verbs/validate-instance.test.ts src/kernel/verbs/defaults.test.ts src/kernel/jobs/run-job.test.ts src/kernel/jobs/expand-outline.test.ts src/kernel/jobs/commit.test.ts src/kernel/jobs/domain-upsert.test.ts src/kernel/projection/project.test.ts
```

## 明确不做

- 规划工作台按钮、未来100章改内核、`write_chapter` spec、`adapt_pack`。

## Self-Review

- 动词 spec 扩纲：必收 outline_doc、禁正文、manual、FOUNDATION、禁 replace → Task 1–3；投影保真（outline 按 rel_path 回放 + tracking 挂载）→ Task 4 与验收 6（真机必做）。
- 模板 `commit_mode` 校验补进 Task 1——此前装饰性，实例写 `auto_if_single` 可绕开手动采纳；五份带 verb 内置合同均通过，无回归。
- `verb-defaults.json` 补缺键为通用写法（遍历 `BUILTIN_DEFAULTS`），旧工作区不再 `VERB_DEFAULT_MISSING`。
- 无 TBD。合同 id 全程 `oh-story-core.story-long-write.expand`。
- `SPAWN` 与 D 计划无关；扩纲 stub 允许空 spawn（合同无 `require_spawn_evidence`）。
