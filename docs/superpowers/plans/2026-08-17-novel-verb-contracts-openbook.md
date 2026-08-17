# 小说工作台动词层 + 深度孵化开书 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/superpowers/specs/2026-08-16-novel-workbench-verb-contracts-design.md`（v1.1）落地分期 1–3：动词/模板基板、`subject_type=project` 与开书产品（深度孵化）、现网三按钮收编标动词。

**Architecture:** 在已落地的内核（`ui/server/src/kernel/`）上加一层动词模板注册表：模板锁最低交付（required_kinds / 禁写 / 门 / commit_mode），合同实例带 `verb` 并对模板做机器校验；Job API 以 verb 解析默认实例；投影与 commit 打开 `project` 主体（user_brief 挂载、world 回放、三类 upsert 绑定、空章行）；前端向导删 `quick_ai`、`deep_draft` 走异步 kernel job。

**Tech Stack:** Bun + bun:sqlite + Express + zod（服务端，测试 `bun test`）；React + antd（`ui/web` 向导）。

## Global Constraints（照抄 spec，全任务生效）

- 模板放仓库内 `ui/server/src/kernel/verbs/templates/{verb}.json`，用户不能用工作区文件覆盖模板。实例仍在 `{workspace}/.mangaforge/kernel/contracts/{id}.json`，默认绑定在 `{workspace}/.mangaforge/kernel/verb-defaults.json`。
- 开书 `commit.mode=manual`：唯一 succeeded 候选也进入 `awaiting_selection`，不自动 commit。
- 深度孵化禁止调用 `/api/novel/project-seed/derive-stream`（及 fill-gaps / finalize 主路径）；内核不可用 503 `KERNEL_RUNTIME_UNAVAILABLE`，禁止回退旧 LLM。
- 内核模型走工作台选中的 Codex 内核文本模型（现网 `kernel-codex-gpt-5.6-luna` / 304）。禁止指向 302 或旧 LLM 路径。
- `user_brief` 上限 32KiB，缺失 → 400 `BRIEF_REQUIRED`；prompt 只引用 `{{user_brief_file}}`，禁止把创意正文嵌进 turn。
- 并跑主键 = verb（`VERB_MIXED`），不再用 `CAPABILITY_MIXED` 作为并跑主键。
- `KIND_COUNT_BELOW_MIN` → 候选一律 `failed`；门失败 → `gated`。
- 禁写门为路径前缀语义：`正文/`、`大纲/` 快照差异（含 write_scope 外）即 gated。
- glob 命中优先级 = 实例 `outputs` 数组顺序（现网 `snapshot.ts` 的 `outputs.find` 已是此语义，用测试锁定）。
- `outlines.replace` v1 全禁（`TEMPLATE_UNSATISFIED`）；开书/扩纲全走 upsert，不先 DELETE 全表。
- 内置 `oh-story-core.story-long-write.outline` 保持不可执行（无 verb → 不能经动词 API 创建，`implemented=false`）。
- 采纳后空章行 `chapter_text=''`（工作台 `has_prose=false`）；不插「有正文」的 chapter_versions。
- `adapt_pack`、扩纲、写章、续写、回炉：模板文件本期落地，运行时不实现（见收尾与遗留）。
- 提交适配必须遍历该 kind 的全部产物，禁止只 `find()` 第一份。
- 每任务 TDD：先写失败测试再实现；测试命令一律在 `ui/server` 目录下 `bun test <相对路径>`；每任务一个 commit。

## 现状速查（实现者需要知道的既有事实）

- 合同 schema/校验：`ui/server/src/kernel/contracts/schema.ts`（zod，`KERNEL_GATES`、`KERNEL_MOUNTS` 常量，`validateKernelContract`）。
- 内置合同：`ui/server/src/kernel/contracts/builtin.ts`（4 份 TS 对象）。加载/落盘：`contracts/store.ts`（`loadKernelContracts` 每次 seed 内置；`toView` 现按 capability 定 `implemented`）。
- Job 流程：`jobs/run-job.ts`（`validateCreateKernelJob` 在 `:43` 写死 `subject_type=chapter`、`:55` 用 `CAPABILITY_MIXED`）→ `codex/run-candidate.ts`（投影→pack 挂载→快照→codex-home→会话→skills/list 预检→turn→收回）→ `jobs/vault.ts` → `jobs/gates.ts` → `jobs/commit.ts`（`:49` 按 kind `find()` 第一份——本计划要改）。
- 投影：`projection/project.ts`（章主体，缺章即抛 `CHAPTER_NOT_FOUND`；world 挂载 `:94-97` 拼单文件——本计划升级回放）；`projection/snapshot.ts`（manifest + 收回，`outputs.find` 顺序优先；范围外 → warnings）。
- 账本：`kernel/db.ts`（四表 DDL + `listCommittedTrackingDocPaths` 回放机制）；`jobs/repo.ts`（列名白名单 patch）。领域表：`ui/server/src/novel/db.ts:83-151`。`addColumnIfMissing` 在 `novel/db.ts:17`。
- 章helpers：`novel/chapter-helpers.ts` 有 `outlineChapterNo`、`cleanChapterPlanTitle`。章行无现成 create 函数，本计划在 upsert 模块内写 SQL。
- 路由：`routes/kernel-job-routes.ts`（jobs CRUD）、`routes/kernel-routes.ts`（contracts/runtime）、`routes/novel-oh-story-core-routes.ts`（三按钮桥接，已转内核、阻塞至终态）。
- 前端向导：`ui/web/src/components/NovelCreateWizard.tsx`、`ui/web/src/components/novel-entry/create/{createWizardOptions.ts,createWizardCopy.ts,CreateModeSection.tsx,useCreateWizardController.ts}`。`CreateMode = 'manual' | 'quick_ai' | 'deep_draft'`。

## 文件结构（新增/修改总览）

- 新增 `ui/server/src/kernel/verbs/`：`schema.ts`（模板 zod + 类型）、`registry.ts`（加载 templates/*.json、`IMPLEMENTED_VERBS`）、`templates/*.json`（9 份）、`infer.ts`（内置 id→verb 推断）、`validate-instance.ts`（实例对模板 8 条校验）、`defaults.ts`（verb-defaults.json 读写与 seed）。
- 新增 `ui/server/src/kernel/jobs/domain-upsert.ts`（world/character/outline upsert + 空章行）。
- 修改：`artifact-kinds.ts`、`contracts/schema.ts`、`contracts/store.ts`、`contracts/builtin.ts`、`template.ts`、`db.ts`、`jobs/repo.ts`、`jobs/gates.ts`、`jobs/commit.ts`、`jobs/run-job.ts`、`codex/run-candidate.ts`、`projection/project.ts`、`routes/kernel-job-routes.ts`、`routes/novel-oh-story-core-routes.ts`。
- 前端：上列 5 个向导文件。

---

### Task 1: 动词模板注册表（schema + 9 份模板 JSON + registry）

**Files:**
- Create: `ui/server/src/kernel/verbs/schema.ts`
- Create: `ui/server/src/kernel/verbs/registry.ts`
- Create: `ui/server/src/kernel/verbs/templates/{open_book,expand_outline,write_chapter,write_continue,review_chapter,apply_review,rewrite_chapter,deslop_chapter,adapt_pack}.json`
- Test: `ui/server/src/kernel/verbs/registry.test.ts`

**Interfaces:**
- Produces: `VerbTemplate` 类型；`loadVerbTemplates(): Map<string, VerbTemplate>`（进程内缓存）；`getVerbTemplate(verb: string): VerbTemplate | null`；`IMPLEMENTED_VERBS = ['open_book','review_chapter','apply_review','deslop_chapter'] as const`。
- Consumes: `ALL_CAPABILITIES`（`../artifact-kinds`）。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/verbs/registry.test.ts
import { describe, expect, test } from 'bun:test'
import { getVerbTemplate, IMPLEMENTED_VERBS, loadVerbTemplates } from './registry'

describe('verb template registry', () => {
  test('loads all 9 templates and validates them', () => {
    const templates = loadVerbTemplates()
    expect([...templates.keys()].sort()).toEqual([
      'adapt_pack', 'apply_review', 'deslop_chapter', 'expand_outline',
      'open_book', 'review_chapter', 'rewrite_chapter', 'write_chapter', 'write_continue',
    ])
  })
  test('open_book template locks minimum deliverables', () => {
    const t = getVerbTemplate('open_book')!
    expect(t.subject_type).toBe('project')
    expect(t.capability).toBe('outline')
    expect(t.required_kinds).toEqual([
      { kind: 'world_doc', min: 1 },
      { kind: 'character_sheet', min: 1 },
      { kind: 'outline_doc', min: 2 },
    ])
    expect(t.forbidden_required_kinds).toEqual(['chapter_text', 'review_report'])
    expect(t.forbidden_domain_writes).toEqual(['chapters', 'reviews'])
    expect(t.template_gates).toEqual(['reject_chapter_text_artifact', 'require_outline_mix'])
    expect(t.commit_mode).toBe('manual')
    expect(t.mention_policy).toBe('required')
    expect(t.allowed_replace_bindings).toBe(false)
  })
  test('apply_review keeps the 70% retention as verb-level gate', () => {
    const t = getVerbTemplate('apply_review')!
    expect(t.template_gates).toEqual(['require_chapter_file', 'require_matching_review', 'paragraph_retention_70'])
    expect(t.mention_policy).toBe('optional')
  })
  test('implemented verbs are exactly the phase-1 set', () => {
    expect([...IMPLEMENTED_VERBS].sort()).toEqual(['apply_review', 'deslop_chapter', 'open_book', 'review_chapter'])
  })
  test('unknown verb returns null', () => {
    expect(getVerbTemplate('nope')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 schema.ts**

```ts
// ui/server/src/kernel/verbs/schema.ts
import { z } from 'zod'
import { ALL_CAPABILITIES } from '../artifact-kinds'

export const VERB_IDS = [
  'open_book', 'expand_outline', 'write_chapter', 'write_continue',
  'review_chapter', 'apply_review', 'rewrite_chapter', 'deslop_chapter', 'adapt_pack',
] as const
export type VerbId = (typeof VERB_IDS)[number]

const templateSchema = z.object({
  schema_version: z.literal(1),
  verb: z.enum(VERB_IDS),
  label: z.string().min(1),
  subject_type: z.enum(['project', 'chapter', 'pack']),
  capability: z.enum(ALL_CAPABILITIES as unknown as [string, ...string[]]),
  required_kinds: z.array(z.object({ kind: z.string().min(1), min: z.number().int().min(1) })),
  optional_kinds: z.array(z.string()),
  forbidden_required_kinds: z.array(z.string()),
  allowed_domain_writes: z.array(z.string()),
  forbidden_domain_writes: z.array(z.string()),
  template_gates: z.array(z.string()),
  allowed_gates: z.array(z.string()),
  mention_policy: z.enum(['required', 'optional', 'forbidden']),
  commit_mode: z.enum(['manual', 'auto_if_single']),
  allowed_replace_bindings: z.literal(false),
})

export type VerbTemplate = z.infer<typeof templateSchema>

export function validateVerbTemplate(input: unknown): VerbTemplate {
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`verb template invalid: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  return parsed.data
}
```

- [ ] **Step 4: 写 9 份模板 JSON**

以下逐字落盘（每个文件一个 JSON 对象）。共同字段省略处无——全部写全。

`templates/open_book.json`:

```json
{
  "schema_version": 1,
  "verb": "open_book",
  "label": "深度孵化",
  "subject_type": "project",
  "capability": "outline",
  "required_kinds": [
    { "kind": "world_doc", "min": 1 },
    { "kind": "character_sheet", "min": 1 },
    { "kind": "outline_doc", "min": 2 }
  ],
  "optional_kinds": ["tracking_doc"],
  "forbidden_required_kinds": ["chapter_text", "review_report"],
  "allowed_domain_writes": ["worldbuilding", "characters", "outlines"],
  "forbidden_domain_writes": ["chapters", "reviews"],
  "template_gates": ["reject_chapter_text_artifact", "require_outline_mix"],
  "allowed_gates": ["reject_chapter_text_artifact", "require_outline_mix", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "manual",
  "allowed_replace_bindings": false
}
```

`templates/expand_outline.json`:

```json
{
  "schema_version": 1,
  "verb": "expand_outline",
  "label": "扩写大纲",
  "subject_type": "project",
  "capability": "outline",
  "required_kinds": [{ "kind": "outline_doc", "min": 1 }],
  "optional_kinds": ["world_doc", "character_sheet"],
  "forbidden_required_kinds": ["chapter_text", "review_report"],
  "allowed_domain_writes": ["worldbuilding", "characters", "outlines"],
  "forbidden_domain_writes": ["chapters", "reviews"],
  "template_gates": ["reject_chapter_text_artifact"],
  "allowed_gates": ["reject_chapter_text_artifact", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "manual",
  "allowed_replace_bindings": false
}
```

`templates/write_chapter.json`:

```json
{
  "schema_version": 1,
  "verb": "write_chapter",
  "label": "写本章",
  "subject_type": "chapter",
  "capability": "rewrite",
  "required_kinds": [{ "kind": "chapter_text", "min": 1 }],
  "optional_kinds": ["tracking_doc"],
  "forbidden_required_kinds": ["review_report"],
  "allowed_domain_writes": ["chapters", "chapter_versions"],
  "forbidden_domain_writes": ["outlines", "reviews"],
  "template_gates": ["require_chapter_file"],
  "allowed_gates": ["require_chapter_file", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "auto_if_single",
  "allowed_replace_bindings": false
}
```

`templates/write_continue.json`:

```json
{
  "schema_version": 1,
  "verb": "write_continue",
  "label": "续写",
  "subject_type": "project",
  "capability": "rewrite",
  "required_kinds": [{ "kind": "chapter_text", "min": 1 }],
  "optional_kinds": ["tracking_doc"],
  "forbidden_required_kinds": ["review_report"],
  "allowed_domain_writes": ["chapters", "chapter_versions"],
  "forbidden_domain_writes": ["outlines", "reviews"],
  "template_gates": ["require_chapter_file"],
  "allowed_gates": ["require_chapter_file", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "auto_if_single",
  "allowed_replace_bindings": false
}
```

`templates/review_chapter.json`:

```json
{
  "schema_version": 1,
  "verb": "review_chapter",
  "label": "审稿",
  "subject_type": "chapter",
  "capability": "review",
  "required_kinds": [{ "kind": "review_report", "min": 1 }],
  "optional_kinds": ["tracking_doc"],
  "forbidden_required_kinds": ["chapter_text"],
  "allowed_domain_writes": ["reviews"],
  "forbidden_domain_writes": ["chapters", "outlines"],
  "template_gates": ["require_chapter_file", "reject_chapter_text_artifact"],
  "allowed_gates": ["require_chapter_file", "reject_chapter_text_artifact", "reject_solo_fallback", "require_reviewer_agents", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "auto_if_single",
  "allowed_replace_bindings": false
}
```

`templates/apply_review.json`:

```json
{
  "schema_version": 1,
  "verb": "apply_review",
  "label": "按建议改稿",
  "subject_type": "chapter",
  "capability": "rewrite",
  "required_kinds": [{ "kind": "chapter_text", "min": 1 }],
  "optional_kinds": [],
  "forbidden_required_kinds": ["review_report"],
  "allowed_domain_writes": ["chapters", "chapter_versions", "reviews"],
  "forbidden_domain_writes": ["outlines"],
  "template_gates": ["require_chapter_file", "require_matching_review", "paragraph_retention_70"],
  "allowed_gates": ["require_chapter_file", "require_matching_review", "paragraph_retention_70", "write_outside_scope"],
  "mention_policy": "optional",
  "commit_mode": "auto_if_single",
  "allowed_replace_bindings": false
}
```

`templates/rewrite_chapter.json`:

```json
{
  "schema_version": 1,
  "verb": "rewrite_chapter",
  "label": "回炉重写",
  "subject_type": "chapter",
  "capability": "rewrite",
  "required_kinds": [{ "kind": "chapter_text", "min": 1 }],
  "optional_kinds": ["tracking_doc"],
  "forbidden_required_kinds": ["review_report"],
  "allowed_domain_writes": ["chapters", "chapter_versions"],
  "forbidden_domain_writes": ["outlines", "reviews"],
  "template_gates": ["require_chapter_file"],
  "allowed_gates": ["require_chapter_file", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "manual",
  "allowed_replace_bindings": false
}
```

`templates/deslop_chapter.json`:

```json
{
  "schema_version": 1,
  "verb": "deslop_chapter",
  "label": "去AI",
  "subject_type": "chapter",
  "capability": "rewrite",
  "required_kinds": [{ "kind": "chapter_text", "min": 1 }],
  "optional_kinds": [],
  "forbidden_required_kinds": ["review_report"],
  "allowed_domain_writes": ["chapters", "chapter_versions", "reviews"],
  "forbidden_domain_writes": ["outlines"],
  "template_gates": ["require_chapter_file", "reject_outline_artifact"],
  "allowed_gates": ["require_chapter_file", "reject_outline_artifact", "write_outside_scope"],
  "mention_policy": "required",
  "commit_mode": "auto_if_single",
  "allowed_replace_bindings": false
}
```

`templates/adapt_pack.json`:

```json
{
  "schema_version": 1,
  "verb": "adapt_pack",
  "label": "适配 skill",
  "subject_type": "pack",
  "capability": "attachment",
  "required_kinds": [{ "kind": "contract_json", "min": 1 }],
  "optional_kinds": [],
  "forbidden_required_kinds": ["chapter_text", "review_report"],
  "allowed_domain_writes": [],
  "forbidden_domain_writes": ["chapters", "reviews", "outlines", "worldbuilding", "characters"],
  "template_gates": [],
  "allowed_gates": ["write_outside_scope"],
  "mention_policy": "optional",
  "commit_mode": "manual",
  "allowed_replace_bindings": false
}
```

说明：spec 里 deslop「禁止领域 outlines、reviews」，但现网内核 deslop/apply 的 commit 不写 reviews 行（`commit.ts` 只按 outputs binding 落 `chapters.rewrite`），把 `reviews` 从 deslop/apply 的禁止名单挪到允许（apply/deslop 的 `allowed_domain_writes` 含 `reviews`）是为了不阻断将来实例登记 `reviews.oh_story_deslop` 报告归档；`forbidden_domain_writes` 保留 `outlines`，与「不得改大纲」一致。

- [ ] **Step 5: 实现 registry.ts**

```ts
// ui/server/src/kernel/verbs/registry.ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateVerbTemplate, type VerbTemplate } from './schema'

export const IMPLEMENTED_VERBS = ['open_book', 'review_chapter', 'apply_review', 'deslop_chapter'] as const

const TEMPLATES_DIR = join(import.meta.dir, 'templates')
let cache: Map<string, VerbTemplate> | null = null

export function loadVerbTemplates(): Map<string, VerbTemplate> {
  if (cache) return cache
  const map = new Map<string, VerbTemplate>()
  for (const file of readdirSync(TEMPLATES_DIR).filter(name => name.endsWith('.json')).sort()) {
    const template = validateVerbTemplate(JSON.parse(readFileSync(join(TEMPLATES_DIR, file), 'utf8')))
    if (template.verb !== file.replace(/\.json$/, '')) {
      throw new Error(`verb template filename mismatch: ${file} declares ${template.verb}`)
    }
    map.set(template.verb, template)
  }
  cache = map
  return map
}

export function getVerbTemplate(verb: string): VerbTemplate | null {
  return loadVerbTemplates().get(verb) || null
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `cd ui/server && bun test src/kernel/verbs/registry.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 7: Commit**

```bash
git add ui/server/src/kernel/verbs
git commit -m "feat(kernel): verb template registry with nine locked templates"
```

### Task 2: 新 kind 注册 + 合同 `verb` 字段 + 实例对模板校验

**Files:**
- Modify: `ui/server/src/kernel/artifact-kinds.ts`
- Modify: `ui/server/src/kernel/contracts/schema.ts`
- Modify: `ui/server/src/kernel/contracts/builtin.ts`（给三份现网合同补 verb 与模板门）
- Modify: `ui/server/src/kernel/contracts/store.ts`
- Create: `ui/server/src/kernel/verbs/infer.ts`
- Create: `ui/server/src/kernel/verbs/validate-instance.ts`
- Test: `ui/server/src/kernel/verbs/validate-instance.test.ts`；扩 `ui/server/src/kernel/contracts/store.test.ts`

**Interfaces:**
- Produces: `REGISTERED_ARTIFACT_KINDS` 增 `world_doc`、`character_sheet`、`contract_json`；`KERNEL_GATES` 增 `reject_chapter_text_artifact`、`reject_outline_artifact`、`require_outline_mix`；`KernelContract` 增可选 `verb?: string`；`resolveContractVerb(contract): string | null`（显式 verb 优先，否则查内置映射）；`BUILTIN_VERB_BY_ID: Record<string,string>`；`validateInstanceAgainstTemplate(contract): { ok: true } | { ok: false; code: 'TEMPLATE_UNSATISFIED'; errors: string[] }`；`toView` 的 `implemented` 改为 `verb 非空 && IMPLEMENTED_VERBS 包含该 verb`。
- Consumes: Task 1 的 `getVerbTemplate`、`IMPLEMENTED_VERBS`。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/verbs/validate-instance.test.ts
import { describe, expect, test } from 'bun:test'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { resolveContractVerb } from './infer'
import { validateInstanceAgainstTemplate } from './validate-instance'

const reviewFull = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!

describe('instance vs template validation', () => {
  test('builtin ids infer their verbs; legacy .outline has none', () => {
    expect(resolveContractVerb(reviewFull)).toBe('review_chapter')
    const outline = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.outline')!
    expect(resolveContractVerb(outline)).toBeNull()
  })
  test('all builtin contracts with a verb satisfy their templates', () => {
    for (const contract of BUILTIN_KERNEL_CONTRACTS) {
      if (!resolveContractVerb(contract)) continue
      expect(validateInstanceAgainstTemplate(contract)).toEqual({ ok: true })
    }
  })
  test('required kind missing a required output fails', () => {
    const bad = { ...reviewFull, outputs: reviewFull.outputs.map(o => ({ ...o, required: false })) }
    const result = validateInstanceAgainstTemplate(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TEMPLATE_UNSATISFIED')
  })
  test('forbidden required kind (chapter_text on review) fails', () => {
    const bad = {
      ...reviewFull,
      outputs: [...reviewFull.outputs, { artifact_kind: 'chapter_text', glob: '正文/*.md', binding: 'kernel_only', required: true }],
    }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('outlines.replace binding is always rejected', () => {
    const openBook = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.open')
    // Task 8 才登记 open 实例；此处用 review 改 binding 验证规则本身
    const bad = { ...reviewFull, outputs: [{ ...reviewFull.outputs[0], binding: 'outlines.replace' }] }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
    expect(openBook).toBeUndefined()
  })
  test('template gates must all appear in instance gates', () => {
    const bad = { ...reviewFull, gates: ['reject_solo_fallback'] }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('mention policy enforced', () => {
    const bad = { ...reviewFull, invoke: { ...reviewFull.invoke, mention: '' } }
    expect(validateInstanceAgainstTemplate(bad as any).ok).toBe(false)
  })
  test('project-subject verbs reject chapter-level mounts', () => {
    const bad = {
      ...reviewFull,
      id: 'x-pack.x-skill.open', pack_id: 'x-pack', skill_name: 'x-skill', variant: 'open',
      verb: 'open_book', capability: 'outline',
      invoke: { mention: '$x-skill', prompt: '开书 {{user_brief_file}}' },
      projection: { mounts: ['current_chapter', 'skill_tree'] },
      outputs: [
        { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
        { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
        { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
      ],
      gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
      commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
    }
    const result = validateInstanceAgainstTemplate(bad as any)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('current_chapter')
  })
})
```

注意：本步测试引用 `{{user_brief_file}}` 变量——`validateInstanceAgainstTemplate` 不做变量校验（那是 `validateKernelContract` 的职责，Task 5 才注册该变量），本任务测试只调 `validateInstanceAgainstTemplate`，不会触发变量白名单。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/verbs/validate-instance.test.ts`
Expected: FAIL（infer / validate-instance 不存在）

- [ ] **Step 3: 实现**

`artifact-kinds.ts` 全量替换第 1 行：

```ts
export const REGISTERED_ARTIFACT_KINDS = ['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment', 'world_doc', 'character_sheet', 'contract_json'] as const
```

`contracts/schema.ts`：`KERNEL_GATES` 常量替换为：

```ts
export const KERNEL_GATES = [
  'reject_solo_fallback', 'require_reviewer_agents', 'require_chapter_file',
  'require_matching_review', 'paragraph_retention_70', 'write_outside_scope',
  'reject_chapter_text_artifact', 'reject_outline_artifact', 'require_outline_mix',
] as const
```

`contractSchema` 对象里 `label` 行后加一行：

```ts
  verb: z.string().min(1).optional(),
```

`verbs/infer.ts`：

```ts
// ui/server/src/kernel/verbs/infer.ts
import type { KernelContract } from '../contracts/schema'

export const BUILTIN_VERB_BY_ID: Record<string, string> = {
  'oh-story-core.story-review.full': 'review_chapter',
  'oh-story-core.story-deslop.file': 'deslop_chapter',
  'oh-story-core.story-apply.surgical': 'apply_review',
  'oh-story-core.story-long-write.open': 'open_book',
}

export function resolveContractVerb(contract: Pick<KernelContract, 'id'> & { verb?: string }): string | null {
  return contract.verb || BUILTIN_VERB_BY_ID[contract.id] || null
}
```

`verbs/validate-instance.ts`：

```ts
// ui/server/src/kernel/verbs/validate-instance.ts
import type { KernelContract } from '../contracts/schema'
import { resolveContractVerb } from './infer'
import { getVerbTemplate } from './registry'

const CHAPTER_MOUNTS = ['current_chapter', 'previous_chapter', 'review_report']

export function validateInstanceAgainstTemplate(contract: KernelContract):
  | { ok: true }
  | { ok: false; code: 'TEMPLATE_UNSATISFIED'; errors: string[] } {
  const verb = resolveContractVerb(contract)
  if (!verb) return { ok: true } // 无 verb 的旧合同：不能过动词 API，但登记不因此失败
  const template = getVerbTemplate(verb)
  const errors: string[] = []
  if (!template) {
    return { ok: false, code: 'TEMPLATE_UNSATISFIED', errors: [`verb ${verb} has no template`] }
  }
  if (contract.capability !== template.capability) {
    errors.push(`capability: ${contract.capability} != template ${template.capability}`)
  }
  for (const need of template.required_kinds) {
    if (!contract.outputs.some(o => o.artifact_kind === need.kind && o.required)) {
      errors.push(`required kind ${need.kind}: no required output declares it`)
    }
  }
  for (const output of contract.outputs) {
    if (output.required && template.forbidden_required_kinds.includes(output.artifact_kind)) {
      errors.push(`kind ${output.artifact_kind} must not be required for verb ${verb}`)
    }
    if (output.binding === 'outlines.replace') {
      errors.push('binding outlines.replace is not allowed in v1')
    }
  }
  const writes = contract.commit.domain_writes
  for (const table of writes) {
    if (!template.allowed_domain_writes.includes(table) && table !== 'chapter_versions') {
      errors.push(`domain write ${table} not allowed for verb ${verb}`)
    }
    if (template.forbidden_domain_writes.includes(table)) {
      errors.push(`domain write ${table} is forbidden for verb ${verb}`)
    }
  }
  for (const gate of template.template_gates) {
    if (!contract.gates.includes(gate as any)) errors.push(`template gate ${gate} missing from instance gates`)
  }
  for (const gate of contract.gates) {
    if (!template.allowed_gates.includes(gate)) errors.push(`gate ${gate} not in allowed_gates for verb ${verb}`)
  }
  if (template.mention_policy === 'required' && !contract.invoke.mention) errors.push('mention required by template')
  if (template.mention_policy === 'forbidden' && contract.invoke.mention) errors.push('mention forbidden by template')
  if ((template.subject_type === 'project' || template.subject_type === 'pack')
    && contract.projection.mounts.some(m => CHAPTER_MOUNTS.includes(m))) {
    errors.push(`chapter-level mounts (${CHAPTER_MOUNTS.join('/')}) not allowed: current_chapter etc. require subject_type=chapter`)
  }
  if (errors.length) return { ok: false, code: 'TEMPLATE_UNSATISFIED', errors }
  return { ok: true }
}
```

说明：`chapter_versions` 随 `chapters.rewrite` 附带写入，模板 `allowed_domain_writes` 未逐一列出时不视为违规（上面显式豁免）。

`contracts/builtin.ts` 改三处 gates（补模板门，其余字段不动）：

```ts
// reviewFull:
  gates: ['reject_solo_fallback', 'require_reviewer_agents', 'require_chapter_file', 'reject_chapter_text_artifact'],
// deslopFile:
  gates: ['require_chapter_file', 'reject_outline_artifact'],
// applySurgical 已含全部模板门，不改
```

`contracts/store.ts`：`toView` 替换为 verb 判定，并在加载/保存时跑模板校验：

```ts
import { IMPLEMENTED_VERBS } from '../verbs/registry'
import { resolveContractVerb } from '../verbs/infer'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'

function toView(contract: KernelContract): KernelContractView {
  const verb = resolveContractVerb(contract)
  return {
    ...contract,
    verb: verb || undefined,
    builtin: isBuiltinKernelContractId(contract.id),
    implemented: !!verb && (IMPLEMENTED_VERBS as readonly string[]).includes(verb),
  }
}
```

`loadKernelContracts` 的 `result.ok` 分支改为：

```ts
      if (result.ok) {
        const templateCheck = validateInstanceAgainstTemplate(result.contract)
        if (templateCheck.ok) contracts.push(toView(result.contract))
        else errors.push({ file, errors: templateCheck.errors.map(e => `TEMPLATE_UNSATISFIED: ${e}`) })
      } else errors.push({ file, errors: result.errors })
```

`saveUserKernelContract` 在 `isBuiltinKernelContractId` 检查后加：

```ts
  const templateCheck = validateInstanceAgainstTemplate(result.contract)
  if (!templateCheck.ok) return { ok: false, status: 400, code: 'TEMPLATE_UNSATISFIED', errors: templateCheck.errors }
```

（返回类型的 code 联合加 `'TEMPLATE_UNSATISFIED'`。）`KernelContractView` 类型不用改——`verb` 已在 `KernelContract` 上可选。

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/verbs/validate-instance.test.ts src/kernel/contracts/`
Expected: 新测试 PASS。`store.test.ts` / `schema.test.ts` 若有断言锁旧 gates 数组或 `implemented`（`.outline` 原来就是 false，三份现网合同仍 true——verb 判定与旧 capability 判定对四份内置合同结论一致），按新 gates 数组更新断言。再跑 `bun test src/kernel/` 全绿。

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): contract verb field, new artifact kinds, template validation"
```

---

### Task 3: 门实现——前缀禁写、大纲混合、kind 份数（KIND_COUNT_BELOW_MIN=failed）

**Files:**
- Modify: `ui/server/src/kernel/jobs/gates.ts`
- Test: `ui/server/src/kernel/jobs/gates.test.ts`（追加用例）

**Interfaces:**
- Produces: `runPostHarvestGates` 返回值增 `failedStatus: 'gated' | 'failed' | null`（原 `failedCode` 保留）；三个新门 + 模板 required_kinds 份数检查（自动执行，不需实例声明）。
- Consumes: Task 1 `getVerbTemplate`、Task 2 `resolveContractVerb`；既有 `GateArtifact`、`warnings`。

- [ ] **Step 1: 写失败测试（追加到 gates.test.ts）**

```ts
import { describe, expect, test } from 'bun:test'
import { runPostHarvestGates } from './gates'

const baseOpenContract: any = {
  id: 'oh-story-core.story-long-write.open', verb: 'open_book', capability: 'outline',
  skill_name: 'story-long-write',
  gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
  outputs: [], write_scope: ['设定/', '大纲/'], commit: { mode: 'manual', domain_writes: [] },
  invoke: { mention: '$story-long-write', prompt: 'x' }, projection: { mounts: ['skill_tree'] },
}
const art = (kind: string, rel: string) => ({ rel_path: rel, artifact_kind: kind, vault_path: '' })
const okOpenArtifacts = [
  art('world_doc', '设定/世界观.md'),
  art('character_sheet', '设定/角色/楚弦.md'),
  art('outline_doc', '大纲/大纲.md'),
  art('outline_doc', '大纲/细纲_第001章.md'),
]

describe('verb gates', () => {
  const run = (artifacts: any[], warnings: any[] = [], contract = baseOpenContract) =>
    runPostHarvestGates({
      workspace: '/tmp/nowhere', projectId: 1, chapterId: 0, contract,
      artifacts, warnings, readArtifactText: () => '',
    })

  test('clean open_book harvest passes', async () => {
    const gate = await run(okOpenArtifacts)
    expect(gate.failedCode).toBeNull()
  })
  test('正文/ prefix diff outside write_scope gates the candidate', async () => {
    const gate = await run(okOpenArtifacts, [{ warning: 'write_outside_scope', rel_path: '正文/第001章_偷跑.md' }])
    expect(gate.failedCode).toBe('REJECT_CHAPTER_TEXT')
    expect(gate.failedStatus).toBe('gated')
  })
  test('chapter_text artifact gates the candidate', async () => {
    const gate = await run([...okOpenArtifacts, art('chapter_text', '设定/伪装.md')])
    expect(gate.failedCode).toBe('REJECT_CHAPTER_TEXT')
  })
  test('two 细纲 without any 总纲 fail outline mix as failed', async () => {
    const gate = await run([
      art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
      art('outline_doc', '大纲/细纲_第001章.md'), art('outline_doc', '大纲/细纲_第002章.md'),
    ])
    expect(gate.failedCode).toBe('KIND_COUNT_BELOW_MIN')
    expect(gate.failedStatus).toBe('failed')
  })
  test('required kind count below template min fails', async () => {
    const gate = await run([
      art('world_doc', '设定/世界观.md'), art('character_sheet', '设定/角色/楚弦.md'),
      art('outline_doc', '大纲/大纲.md'),
    ])
    expect(gate.failedCode).toBe('KIND_COUNT_BELOW_MIN')
    expect(gate.failedStatus).toBe('failed')
  })
  test('reject_outline_artifact fires on 大纲/ prefix', async () => {
    const deslop: any = {
      ...baseOpenContract, id: 'oh-story-core.story-deslop.file', verb: 'deslop_chapter',
      capability: 'rewrite', gates: ['reject_outline_artifact'], write_scope: ['正文/'],
    }
    const gate = await run([art('chapter_text', '正文/第002章_x.md')], [{ warning: 'write_outside_scope', rel_path: '大纲/细纲_第002章.md' }], deslop)
    expect(gate.failedCode).toBe('REJECT_OUTLINE')
    expect(gate.failedStatus).toBe('gated')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/gates.test.ts`
Expected: FAIL（新门未实现、返回值无 failedStatus）

- [ ] **Step 3: 实现 gates.ts 修改**

顶部 import 增：

```ts
import { resolveContractVerb } from '../verbs/infer'
import { getVerbTemplate } from '../verbs/registry'
```

`runPostHarvestGates` 返回类型改为 `Promise<{ results: GateResult[]; failedCode: string | null; failedStatus: 'gated' | 'failed' | null }>`。函数体在 `for (const gate of input.contract.gates)` 前加：

```ts
  const changedPaths = [
    ...input.artifacts.map(a => a.rel_path),
    ...(input.warnings || []).map(w => w.rel_path),
  ]
  const hasChapterParse = (rel: string) => /第\s*\d+\s*章/.test(rel.split('/').pop() || rel)
```

循环内、`write_outside_scope` 分支后加三个门分支：

```ts
    if (gate === 'reject_chapter_text_artifact') {
      const hit = input.artifacts.some(a => a.artifact_kind === 'chapter_text')
        || changedPaths.some(p => p.startsWith('正文/'))
      results.push(hit ? { gate, ok: false, code: 'REJECT_CHAPTER_TEXT' } : { gate, ok: true })
      continue
    }
    if (gate === 'reject_outline_artifact') {
      const hit = input.artifacts.some(a => a.artifact_kind === 'outline_doc')
        || changedPaths.some(p => p.startsWith('大纲/'))
      results.push(hit ? { gate, ok: false, code: 'REJECT_OUTLINE' } : { gate, ok: true })
      continue
    }
    if (gate === 'require_outline_mix') {
      const outlineDocs = input.artifacts.filter(a => a.artifact_kind === 'outline_doc')
      const withNo = outlineDocs.filter(a => hasChapterParse(a.rel_path)).length
      const withoutNo = outlineDocs.length - withNo
      if (withNo >= 1 && withoutNo >= 1) results.push({ gate, ok: true })
      else results.push({ gate, ok: false, code: 'KIND_COUNT_BELOW_MIN', message: `细纲 ${withNo} / 总纲 ${withoutNo}` })
      continue
    }
```

`require_chapter_file` 分支改为（review 类合同无 chapter_text 产物时回退查领域正文）：

```ts
    if (gate === 'require_chapter_file') {
      if (!chapterArtifact && input.contract.capability === 'review') {
        const chapter = await getNovelChapter(input.workspace, input.chapterId, input.projectId)
        if (String(chapter?.chapter_text || '').replace(/\s/g, '')) results.push({ gate, ok: true })
        else results.push({ gate, ok: false, code: 'CHAPTER_FILE_MISSING' })
        continue
      }
      const text = chapterArtifact ? input.readArtifactText(chapterArtifact) : ''
      if (!text.replace(/\s/g, '')) results.push({ gate, ok: false, code: 'CHAPTER_FILE_MISSING' })
      else results.push({ gate, ok: true })
      continue
    }
```

循环结束后、`const failed = ...` 前加模板份数检查（不需实例声明，凡有 verb 即执行）：

```ts
  const verb = resolveContractVerb(input.contract as any)
  const template = verb ? getVerbTemplate(verb) : null
  if (template) {
    for (const need of template.required_kinds) {
      const count = input.artifacts.filter(a => a.artifact_kind === need.kind).length
      if (count < need.min) {
        results.push({ gate: 'kind_count', ok: false, code: 'KIND_COUNT_BELOW_MIN', message: `${need.kind} ${count}/${need.min}` })
      }
    }
  }
```

结尾替换为：

```ts
  const failed = results.find(r => !r.ok)
  const failedCode = failed?.code || null
  const failedStatus: 'gated' | 'failed' | null = failedCode
    ? (failedCode === 'KIND_COUNT_BELOW_MIN' ? 'failed' : 'gated')
    : null
  return { results, failedCode, failedStatus }
```

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/jobs/gates.test.ts && bun test src/kernel/`
Expected: PASS。注意：内核既有链路（run-job/commit）暂未消费 `failedStatus`，行为不变——Task 6 接。

注意回归点：Task 2 给 `reviewFull` 加了 `require_chapter_file`，acceptance fixture（`jobs/acceptance.fixture.test.ts`）里第 2 章有正文，回退查领域正文应通过；若 fixture 里存在空正文章节的审稿用例，按门语义更新期望（`CHAPTER_FILE_MISSING`）。

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel/jobs/gates.ts ui/server/src/kernel/jobs/gates.test.ts
git commit -m "feat(kernel): prefix-based forbidden-write gates, outline mix, kind counts"
```

---

### Task 4: kernel_jobs 增列 + verb 回填 + 并发判重 + 回放查询泛化

**Files:**
- Modify: `ui/server/src/kernel/db.ts`
- Modify: `ui/server/src/kernel/jobs/repo.ts`
- Test: `ui/server/src/kernel/db.test.ts`、`ui/server/src/kernel/jobs/repo.test.ts`（追加）

**Interfaces:**
- Produces: `kernel_jobs` 新列 `verb TEXT NOT NULL DEFAULT ''`、`verb_params TEXT NOT NULL DEFAULT '{}'`、`subject_key TEXT NOT NULL DEFAULT ''`、`brief_json TEXT NOT NULL DEFAULT ''`；`KernelJobRow` 增同名四字段；`insertKernelJob` 接收它们；`hasActiveKernelJob(ws, filter: { projectId: number; verb: string; subjectId?: number }): boolean`；`listCommittedDocPaths(ws, projectId, kind): Array<{ rel_path; vault_path }>`（`listCommittedTrackingDocPaths` 变为其 `kind='tracking_doc'` 包装，签名不变）。
- Consumes: Task 2 `BUILTIN_VERB_BY_ID`（回填）。

- [ ] **Step 1: 写失败测试（追加）**

```ts
// db.test.ts 追加
import { BUILTIN_VERB_BY_ID } from './verbs/infer'
test('kernel_jobs gains verb columns and backfills from candidate contract ids', () => {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-verb-db-'))
  // 先用旧 insert 模拟历史行：直接 SQL 写一条无 verb 的 job + candidate
  const db = openKernelDb(ws)
  db.query(`INSERT INTO kernel_jobs (id, project_id, status, capability, subject_type, subject_id, verb)
            VALUES ('job-old', 1, 'committed', 'review', 'chapter', 62, '')`).run()
  db.query(`INSERT INTO kernel_candidates (id, job_id, contract_id, pack_id, pack_revision, skill_name, status)
            VALUES ('cand-old', 'job-old', 'oh-story-core.story-review.full', 'oh-story-core', 'r', 'story-review', 'committed')`).run()
  db.close()
  const reopened = openKernelDb(ws) // openKernelDb 内跑回填
  const row = reopened.query(`SELECT verb FROM kernel_jobs WHERE id = 'job-old'`).get() as any
  reopened.close()
  expect(row.verb).toBe(BUILTIN_VERB_BY_ID['oh-story-core.story-review.full'])
})

// repo.test.ts 追加
import { hasActiveKernelJob, insertKernelJob } from './repo'
test('hasActiveKernelJob dedupes per verb, chapter verbs per subject', () => {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-verb-repo-'))
  insertKernelJob(ws, {
    id: 'job-a', project_id: 3, workspace_scope: 'novel', title: '', status: 'running',
    capability: 'review', subject_type: 'chapter', subject_id: 62, model_provider_id: '', model_id: null,
    error_code: '', error_message: '', verb: 'review_chapter', verb_params: '{}', subject_key: '', brief_json: '',
  })
  expect(hasActiveKernelJob(ws, { projectId: 3, verb: 'review_chapter', subjectId: 62 })).toBe(true)
  expect(hasActiveKernelJob(ws, { projectId: 3, verb: 'review_chapter', subjectId: 63 })).toBe(false)
  expect(hasActiveKernelJob(ws, { projectId: 3, verb: 'open_book' })).toBe(false)
})
```

（两文件既有 import——`mkdtempSync`/`tmpdir`/`join`/`openKernelDb`——沿用文件顶部已有的；没有则补。）

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/db.test.ts src/kernel/jobs/repo.test.ts`
Expected: FAIL（列不存在 / 函数不存在）

- [ ] **Step 3: 实现**

`db.ts`：import 行改为 `import { addColumnIfMissing, ensureSqliteSchema, openDb } from '../novel/db'`，并加 `import { BUILTIN_VERB_BY_ID } from './verbs/infer'`。`ensureKernelSchema` 末尾（`db.exec` 之后）加：

```ts
  addColumnIfMissing(db, 'kernel_jobs', 'verb', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(db, 'kernel_jobs', 'verb_params', "TEXT NOT NULL DEFAULT '{}'")
  addColumnIfMissing(db, 'kernel_jobs', 'subject_key', "TEXT NOT NULL DEFAULT ''")
  addColumnIfMissing(db, 'kernel_jobs', 'brief_json', "TEXT NOT NULL DEFAULT ''")
  backfillKernelJobVerbs(db)
```

新函数（同文件）：

```ts
function backfillKernelJobVerbs(db: Database) {
  const rows = db.query(`
    SELECT j.id AS id, MIN(c.contract_id) AS contract_id
    FROM kernel_jobs j JOIN kernel_candidates c ON c.job_id = j.id
    WHERE j.verb = '' GROUP BY j.id
  `).all() as Array<{ id: string; contract_id: string }>
  for (const row of rows) {
    const verb = BUILTIN_VERB_BY_ID[row.contract_id]
    if (verb) db.query('UPDATE kernel_jobs SET verb = ? WHERE id = ?').run(verb, row.id)
  }
}
```

`listCommittedTrackingDocPaths` 改为：

```ts
export function listCommittedDocPaths(activeWorkspace: string, projectId: number, kind: string): Array<{ rel_path: string; vault_path: string }> {
  const db = openKernelDb(activeWorkspace)
  try {
    return db.query(`
      SELECT a.rel_path AS rel_path, a.vault_path AS vault_path
      FROM kernel_artifacts a
      JOIN kernel_commits c ON c.candidate_id = a.candidate_id
      JOIN kernel_jobs j ON j.id = c.job_id
      WHERE j.project_id = ? AND a.artifact_kind = ?
      ORDER BY c.created_at DESC
    `).all(projectId, kind) as Array<{ rel_path: string; vault_path: string }>
  } finally {
    db.close()
  }
}

export function listCommittedTrackingDocPaths(activeWorkspace: string, projectId: number) {
  return listCommittedDocPaths(activeWorkspace, projectId, 'tracking_doc')
}
```

`repo.ts`：`KernelJobRow` 增 `verb: string; verb_params: string; subject_key: string; brief_json: string`；`insertKernelJob` SQL 列与占位符补四列（`verb, verb_params, subject_key, brief_json`），`run(...)` 尾部补 `row.verb, row.verb_params, row.subject_key, row.brief_json`。新增：

```ts
export function hasActiveKernelJob(ws: string, filter: { projectId: number; verb: string; subjectId?: number }): boolean {
  const where = ['project_id = ?', 'verb = ?', "status IN ('queued','running','awaiting_selection')"]
  const values: any[] = [filter.projectId, filter.verb]
  if (filter.subjectId !== undefined) { where.push('subject_id = ?'); values.push(filter.subjectId) }
  return withDb(ws, db => !!db.query(`SELECT id FROM kernel_jobs WHERE ${where.join(' AND ')} LIMIT 1`).get(...values))
}
```

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`
Expected: PASS。既有 `insertKernelJob` 调用点（run-job.ts）会因新必填字段编译报错——本任务顺手在 run-job.ts 的 `insertKernelJob` 调用里补 `verb: '', verb_params: '{}', subject_key: '', brief_json: ''`（占位，Task 6 换真值）。

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): verb columns on kernel_jobs, backfill, per-verb dedup, doc replay query"
```

### Task 5: `subject_type=project` 投影 + `user_brief` 挂载 + world 回放

**Files:**
- Modify: `ui/server/src/kernel/template.ts`
- Modify: `ui/server/src/kernel/projection/project.ts`
- Modify: `ui/server/src/kernel/codex/run-candidate.ts`（传 subjectType / briefJson）
- Test: `ui/server/src/kernel/projection/project.test.ts`（追加）

**Interfaces:**
- Produces: `KernelPromptVars` 增 `user_brief_file: string`（变量名 `user_brief_file` 入白名单）；`ProjectKernelSubjectInput` 增 `subjectType?: 'chapter' | 'project'`（默认 `'chapter'`）与 `briefJson?: string`；`KERNEL_MOUNTS` 增 `'user_brief'`（改 `contracts/schema.ts` 常量）；`renderUserBriefMarkdown(briefJson: string): string`（导出，向导/测试复用）。
- Consumes: Task 4 `listCommittedDocPaths`。

- [ ] **Step 1: 写失败测试（追加到 project.test.ts，沿用文件里已有的 workspace/seed 辅助；若无则用与文件内其它用例相同的建库方式）**

```ts
import { renderUserBriefMarkdown } from './project'

test('project subject: no chapter required, brief.md written, chapter vars empty', async () => {
  const ws = makeWs() // 沿用本文件既有的临时工作区 helper；其内至少要有 projects 表一行 project
  const contract: any = {
    ...minimalContract(), // 沿用本文件既有最小合同构造；覆盖以下字段：
    verb: 'open_book', capability: 'outline',
    projection: { mounts: ['user_brief', 'skill_tree'] },
    invoke: { mention: '$story-long-write', prompt: '开书：{{user_brief_file}}' },
  }
  const dir = mkdtempSync(join(tmpdir(), 'proj-open-'))
  const { vars, files } = await projectKernelSubject({
    workspace: ws, projectId: 1, chapterId: 0, contract, projectDir: dir,
    subjectType: 'project',
    briefJson: JSON.stringify({ title: '试作', genre: '玄幻', idea: '一句话创意', length_target: 'long', constraints: '无' }),
  })
  expect(files).toContain('brief.md')
  expect(readFileSync(join(dir, 'brief.md'), 'utf8')).toContain('一句话创意')
  expect(vars.user_brief_file).toBe('brief.md')
  expect(vars.chapter_no).toBe('')
  expect(vars.chapter_pad).toBe('')
  expect(vars.report_path).toBe('')
})

test('world mount replays committed world_doc files by kernel_rel_path', async () => {
  const ws = makeWs()
  // 造两行 worldbuilding：一行带 kernel_rel_path，一行旧式无 rel_path
  seedWorldbuilding(ws, 1, {
    world_summary: '摘要A',
    raw_payload: JSON.stringify({ kernel_rel_path: '设定/势力/铁誓盟.md', kernel_full_text: '# 铁誓盟\n全文A' }),
  })
  seedWorldbuilding(ws, 1, { world_summary: '旧行摘要', raw_payload: '{}' })
  const contract: any = { ...minimalContract(), projection: { mounts: ['world', 'skill_tree'] } }
  const dir = mkdtempSync(join(tmpdir(), 'proj-world-'))
  await projectKernelSubject({ workspace: ws, projectId: 1, chapterId: 0, contract, projectDir: dir, subjectType: 'project' })
  expect(readFileSync(join(dir, '设定/势力/铁誓盟.md'), 'utf8')).toContain('全文A')
  expect(readFileSync(join(dir, '设定/世界观.md'), 'utf8')).toContain('旧行摘要')
})

test('renderUserBriefMarkdown renders all five fields', () => {
  const md = renderUserBriefMarkdown(JSON.stringify({ title: 'T', genre: 'G', idea: 'I', length_target: 'long', constraints: 'C' }))
  for (const s of ['T', 'G', 'I', 'long', 'C']) expect(md).toContain(s)
})
```

说明：`seedWorldbuilding`（若文件里没有）在测试文件内实现——`openKernelDb(ws)` 后直接 `INSERT INTO worldbuilding (project_id, world_summary, raw_payload) VALUES (?,?,?)`。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/projection/project.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`template.ts`：`KernelPromptVars` 增 `user_brief_file: string`；`KERNEL_PROMPT_VARIABLES` 数组尾部加 `'user_brief_file'`。

`contracts/schema.ts`：`KERNEL_MOUNTS` 数组尾部加 `'user_brief'`。

`project.ts` 修改：

```ts
export type ProjectKernelSubjectInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  projectDir: string
  subjectType?: 'chapter' | 'project'
  briefJson?: string
}

export function renderUserBriefMarkdown(briefJson: string): string {
  let brief: any = {}
  try { brief = JSON.parse(briefJson || '{}') } catch { brief = {} }
  return [
    `# 创作创意`,
    ``,
    `书名方向：${String(brief.title || '（未定）')}`,
    `题材：${String(brief.genre || '（未定）')}`,
    `体量：${String(brief.length_target || '（未定）')}`,
    ``,
    `## 创意`,
    ``,
    String(brief.idea || '（空）'),
    ``,
    `## 约束`,
    ``,
    String(brief.constraints || '无'),
    ``,
  ].join('\n')
}
```

函数体开头改为按主体分派：

```ts
  const subjectType = input.subjectType || 'chapter'
  if (mounts.includes('canvas_node')) { /* 原样保留抛错 */ }
  const chapter = subjectType === 'chapter' ? await getNovelChapter(workspace, chapterId, projectId) : null
  if (subjectType === 'chapter' && !chapter) throw Object.assign(new Error('chapter not found'), { code: 'CHAPTER_NOT_FOUND' })
  if (subjectType === 'project' && mounts.some(m => ['current_chapter', 'previous_chapter', 'review_report'].includes(m))) {
    throw Object.assign(new Error('project subject cannot mount chapter-level projections'), { code: 'CONTRACT_INVALID' })
  }
```

随后所有用到 `chapter` 的分支都以 `if (chapter)` 为前提（`current_chapter` / `previous_chapter` / outline 的按章卡片 / tracking 的逐章记录文件名用 `pad`——project 主体时 outline 挂载只写 `大纲/总纲.md` 与 `大纲/细纲.md` 且仅当有大纲行，tracking 挂载省略逐章记录兜底、保留 `追踪/伏笔.md` 兜底）。`world` 挂载整块替换为：

```ts
  if (mounts.includes('world')) {
    const worlds = await listNovelWorldbuilding(workspace, projectId)
    const legacy: string[] = []
    for (const w of worlds) {
      let payload: any = {}
      try { payload = JSON.parse(String((w as any).raw_payload || '{}')) } catch { payload = {} }
      const relPath = String(payload.kernel_rel_path || '')
      if (relPath && !relPath.includes('..')) {
        writeProjected(projectDir, relPath, String(payload.kernel_full_text || w.world_summary || ''), files)
      } else if (String(w.world_summary || '').trim()) {
        legacy.push(String(w.world_summary))
      }
    }
    if (legacy.length || !files.some(f => f === '设定/世界观.md')) {
      writeProjected(projectDir, '设定/世界观.md', legacy.join('\n\n') || '（空）', files)
    }
  }
```

`user_brief` 挂载（在 world 块后加）：

```ts
  let userBriefFile = ''
  if (mounts.includes('user_brief')) {
    userBriefFile = 'brief.md'
    writeProjected(projectDir, userBriefFile, renderUserBriefMarkdown(String(input.briefJson || '')), files)
  }
```

`vars` 构造改为主体感知（chapter 为 null 时全部空串）：

```ts
  const vars: KernelPromptVars = {
    scope_files: chapter ? currentRel : '',
    chapter_no: chapter ? String(chapter.chapter_no) : '',
    chapter_pad: chapter ? pad : '',
    chapter_title: chapter ? String(chapter.title || '') : '',
    previous_chapter_file: previousRel,
    report_path: chapter ? `审稿/第${pad}章.md` : '',
    review_path: reviewPath,
    skill_name: contract.skill_name,
    user_brief_file: userBriefFile,
  }
```

（`pad` / `currentRel` / `previous` 的计算移入 `if (chapter)` 保护，project 主体时 `previousRel=''`。）

`codex/run-candidate.ts`：`RunKernelCandidateInput` 增 `subjectType?: 'chapter' | 'project'`、`briefJson?: string`；投影调用改为：

```ts
    ;({ vars } = await projectKernelSubject({
      workspace, projectId, chapterId, contract, projectDir,
      subjectType: input.subjectType, briefJson: input.briefJson,
    }))
```

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`
Expected: PASS。既有 chapter 主体投影测试不需改动（world 单文件兜底仍在，旧行为保留）。所有既有合同没有 `{{user_brief_file}}`，变量白名单扩展向后兼容。

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): project-subject projection, user_brief mount, world replay by rel_path"
```

---

### Task 6: upsert 收存适配 + commit 重写（遍历全部产物、空章行、manual 语义、failedStatus 消费）

**Files:**
- Create: `ui/server/src/kernel/jobs/domain-upsert.ts`
- Modify: `ui/server/src/kernel/jobs/commit.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`（消费 `failedStatus`）
- Test: `ui/server/src/kernel/jobs/domain-upsert.test.ts`、`ui/server/src/kernel/jobs/commit.test.ts`（追加）

**Interfaces:**
- Produces: `upsertWorldDoc(ws, projectId, relPath, text): number`（返回 worldbuilding 行 id）；`upsertCharacterSheet(ws, projectId, relPath, text): number`；`upsertOutlineDoc(ws, projectId, relPath, text): { outlineId: number; chapterNo: number | null }`；`ensureEmptyChapterRow(ws, projectId, chapterNo, title, outlineId): number | null`（已存在该章号返回 null，不覆盖）；`parseChapterNoFromRelPath(relPath): number | null`。commit 遍历所有 kind 产物并支持 `worldbuilding.upsert` / `characters.upsert` / `outlines.upsert` 绑定。
- Consumes: `openKernelDb`（Task 4 后含新列）；`cleanChapterPlanTitle`、`outlineChapterNo`（`novel/chapter-helpers.ts`）；Task 3 `failedStatus`。

- [ ] **Step 1: 写 domain-upsert 失败测试**

```ts
// ui/server/src/kernel/jobs/domain-upsert.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openKernelDb } from '../db'
import {
  ensureEmptyChapterRow, parseChapterNoFromRelPath,
  upsertCharacterSheet, upsertOutlineDoc, upsertWorldDoc,
} from './domain-upsert'

function makeWs(): string {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-upsert-'))
  const db = openKernelDb(ws)
  db.query(`INSERT INTO projects (id, title) VALUES (1, '试作')`).run()
  db.close()
  return ws
}

describe('domain upserts', () => {
  test('parseChapterNoFromRelPath', () => {
    expect(parseChapterNoFromRelPath('大纲/细纲_第003章.md')).toBe(3)
    expect(parseChapterNoFromRelPath('大纲/卷纲_第1卷.md')).toBeNull()
    expect(parseChapterNoFromRelPath('大纲/大纲.md')).toBeNull()
  })
  test('world upsert keyed by kernel_rel_path, second call updates in place', () => {
    const ws = makeWs()
    const id1 = upsertWorldDoc(ws, 1, '设定/势力/铁誓盟.md', '全文A')
    const id2 = upsertWorldDoc(ws, 1, '设定/势力/铁誓盟.md', '全文B')
    expect(id2).toBe(id1)
    const db = openKernelDb(ws)
    const rows = db.query(`SELECT world_summary, raw_payload FROM worldbuilding WHERE project_id = 1`).all() as any[]
    db.close()
    expect(rows.length).toBe(1)
    expect(JSON.parse(rows[0].raw_payload).kernel_full_text).toBe('全文B')
  })
  test('character upsert keyed by filename stem as name', () => {
    const ws = makeWs()
    upsertCharacterSheet(ws, 1, '设定/角色/楚弦.md', '# 楚弦\n档案1')
    upsertCharacterSheet(ws, 1, '设定/角色/楚弦.md', '# 楚弦\n档案2')
    const db = openKernelDb(ws)
    const rows = db.query(`SELECT name, backstory FROM characters WHERE project_id = 1`).all() as any[]
    db.close()
    expect(rows.length).toBe(1)
    expect(rows[0].name).toBe('楚弦')
    expect(rows[0].backstory).toContain('档案2')
  })
  test('outline upsert: chapter-parsable becomes outline_type=chapter; empty chapter row created once', () => {
    const ws = makeWs()
    const { outlineId, chapterNo } = upsertOutlineDoc(ws, 1, '大纲/细纲_第001章.md', '# 第001章 初入怪谈\n细纲内容')
    expect(chapterNo).toBe(1)
    const created = ensureEmptyChapterRow(ws, 1, 1, '初入怪谈', outlineId)
    expect(created).toBeGreaterThan(0)
    expect(ensureEmptyChapterRow(ws, 1, 1, '初入怪谈', outlineId)).toBeNull()
    const db = openKernelDb(ws)
    const outline = db.query(`SELECT outline_type FROM outlines WHERE id = ?`).get(outlineId) as any
    const chapter = db.query(`SELECT chapter_text, outline_id, title FROM chapters WHERE project_id = 1 AND chapter_no = 1`).get() as any
    db.close()
    expect(outline.outline_type).toBe('chapter')
    expect(chapter.chapter_text).toBe('')
    expect(chapter.outline_id).toBe(outlineId)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/jobs/domain-upsert.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 domain-upsert.ts**

```ts
// ui/server/src/kernel/jobs/domain-upsert.ts
import { cleanChapterPlanTitle } from '../../novel/chapter-helpers'
import { openKernelDb } from '../db'

const SUMMARY_MAX = 4000

export function parseChapterNoFromRelPath(relPath: string): number | null {
  const name = relPath.split('/').pop() || relPath
  const match = name.match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : null
}

function firstHeading(text: string): string {
  const match = String(text || '').match(/^#+\s*(.+)$/m)
  return match ? match[1].trim() : ''
}

function withDb<T>(ws: string, fn: (db: ReturnType<typeof openKernelDb>) => T): T {
  const db = openKernelDb(ws)
  try { return fn(db) } finally { db.close() }
}

export function upsertWorldDoc(ws: string, projectId: number, relPath: string, text: string): number {
  return withDb(ws, db => {
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, kernel_full_text: text })
    const existing = db.query(`
      SELECT id FROM worldbuilding WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    if (existing) {
      db.query(`UPDATE worldbuilding SET world_summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(summary, payload, existing.id)
      return Number(existing.id)
    }
    db.query(`INSERT INTO worldbuilding (project_id, world_summary, raw_payload) VALUES (?,?,?)`)
      .run(projectId, summary, payload)
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}

export function upsertCharacterSheet(ws: string, projectId: number, relPath: string, text: string): number {
  return withDb(ws, db => {
    const stem = (relPath.split('/').pop() || '').replace(/\.md$/i, '')
    const name = stem || firstHeading(text) || '未命名'
    const payload = JSON.stringify({ kernel_rel_path: relPath })
    const existing = db.query(`SELECT id FROM characters WHERE project_id = ? AND name = ?`).get(projectId, name) as any
    if (existing) {
      db.query(`UPDATE characters SET backstory = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(text, payload, existing.id)
      return Number(existing.id)
    }
    db.query(`INSERT INTO characters (project_id, name, backstory, raw_payload) VALUES (?,?,?,?)`)
      .run(projectId, name, text, payload)
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}

export function upsertOutlineDoc(ws: string, projectId: number, relPath: string, text: string): { outlineId: number; chapterNo: number | null } {
  return withDb(ws, db => {
    const chapterNo = parseChapterNoFromRelPath(relPath)
    const outlineType = chapterNo === null ? 'master' : 'chapter'
    const title = firstHeading(text) || (relPath.split('/').pop() || relPath).replace(/\.md$/i, '')
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, ...(chapterNo === null ? {} : { chapter_no: chapterNo }) })
    const byPath = db.query(`
      SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    const byChapter = !byPath && chapterNo !== null
      ? db.query(`SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.chapter_no') = ?`).get(projectId, chapterNo) as any
      : null
    const byTitle = !byPath && !byChapter
      ? db.query(`SELECT id FROM outlines WHERE project_id = ? AND title = ?`).get(projectId, title) as any
      : null
    const existing = byPath || byChapter || byTitle
    if (existing) {
      db.query(`UPDATE outlines SET outline_type = ?, title = ?, summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(outlineType, title, summary, payload, existing.id)
      return { outlineId: Number(existing.id), chapterNo }
    }
    db.query(`INSERT INTO outlines (project_id, outline_type, title, summary, raw_payload) VALUES (?,?,?,?,?)`)
      .run(projectId, outlineType, title, summary, payload)
    return { outlineId: Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id), chapterNo }
  })
}

export function ensureEmptyChapterRow(ws: string, projectId: number, chapterNo: number, title: string, outlineId: number): number | null {
  return withDb(ws, db => {
    const existing = db.query(`SELECT id FROM chapters WHERE project_id = ? AND chapter_no = ?`).get(projectId, chapterNo) as any
    if (existing) return null
    db.query(`INSERT INTO chapters (project_id, outline_id, chapter_no, title, chapter_text) VALUES (?,?,?,?, '')`)
      .run(projectId, outlineId, chapterNo, cleanChapterPlanTitle(chapterNo, title))
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}
```

（`cleanChapterPlanTitle(chapterNo, title)` 的实参顺序以 `novel/chapter-helpers.ts:13` 实际签名为准——该函数已存在，勿重写。）

- [ ] **Step 4: 写 commit 失败测试（追加到 commit.test.ts）**

```ts
test('open_book commit upserts every artifact and creates empty chapter rows', async () => {
  // 用本文件既有 harness 造 job：subject_type=project、verb=open_book、commit.mode=manual 的合同，
  // 候选 succeeded，artifacts 含：
  //   world_doc 设定/世界观.md、world_doc 设定/势力/铁誓盟.md、
  //   character_sheet 设定/角色/楚弦.md、character_sheet 设定/角色/沈疏影.md、
  //   outline_doc 大纲/大纲.md、outline_doc 大纲/细纲_第001章.md、outline_doc 大纲/细纲_第002章.md
  // （vault 文件真实写盘，内容任意非空）
  const result = await commitKernelCandidate(ws, jobId, candidateId)
  expect(result.ok).toBe(true)
  const db = openKernelDb(ws)
  const worlds = db.query(`SELECT COUNT(*) AS n FROM worldbuilding WHERE project_id = ?`).get(projectId) as any
  const chars = db.query(`SELECT COUNT(*) AS n FROM characters WHERE project_id = ?`).get(projectId) as any
  const outlines = db.query(`SELECT COUNT(*) AS n FROM outlines WHERE project_id = ?`).get(projectId) as any
  const chapters = db.query(`SELECT chapter_no, chapter_text FROM chapters WHERE project_id = ? ORDER BY chapter_no`).all(projectId) as any[]
  db.close()
  expect(worlds.n).toBe(2)      // 不是 find() 第一份
  expect(chars.n).toBe(2)
  expect(outlines.n).toBe(3)
  expect(chapters.map(c => c.chapter_no)).toEqual([1, 2])
  expect(chapters.every(c => c.chapter_text === '')).toBe(true)
})
```

（harness：本文件既有测试已有「插 job/candidate/artifact 行 + vault 临时文件」的构造方式，照抄其模式；合同经 `saveUserKernelContract` 或直接写入 contracts 目录，`verb: 'open_book'`、outputs 四条按 Task 8 的实例形状。）

- [ ] **Step 5: 实现 commit.ts 重写**

`commitKernelCandidate` 中 `for (const output of contract.outputs)` 循环整体替换：

```ts
  const isProjectSubject = detail.job.subject_type === 'project'
  const chapter = isProjectSubject ? null : await getNovelChapter(ws, chapterId, detail.job.project_id)
  const commits: Array<{ domain_table: string; domain_row_id: number }> = []
  const outlineRows: Array<{ outlineId: number; chapterNo: number | null; title: string }> = []
  for (const output of contract.outputs) {
    const matched = artifacts.filter((a: any) => a.artifact_kind === output.artifact_kind)
    for (const artifact of matched) {
      const text = readVaultText(artifact)
      if (output.binding.startsWith('reviews.')) {
        if (!text.trim()) return { ok: false, status: 500, code: 'OUTPUT_MISSING', message: 'review report vault is empty or unreadable' }
        const saved = await createNovelReview(ws, { /* 原有 payload 构造原样保留 */ })
        commits.push({ domain_table: 'reviews', domain_row_id: Number(saved.id) })
      } else if (output.binding === 'chapters.rewrite') {
        await updateNovelChapter(ws, chapterId, { chapter_text: text }, {
          versionSource: String(contract.commit.source || 'kernel_rewrite') as any,
        })
        commits.push({ domain_table: 'chapters', domain_row_id: chapterId })
      } else if (output.binding === 'worldbuilding.upsert') {
        const id = upsertWorldDoc(ws, detail.job.project_id, String(artifact.rel_path), text)
        commits.push({ domain_table: 'worldbuilding', domain_row_id: id })
      } else if (output.binding === 'characters.upsert') {
        const id = upsertCharacterSheet(ws, detail.job.project_id, String(artifact.rel_path), text)
        commits.push({ domain_table: 'characters', domain_row_id: id })
      } else if (output.binding === 'outlines.upsert') {
        const row = upsertOutlineDoc(ws, detail.job.project_id, String(artifact.rel_path), text)
        outlineRows.push({ ...row, title: firstHeadingOf(text) })
        commits.push({ domain_table: 'outlines', domain_row_id: row.outlineId })
      }
      // kernel_only：跳过
    }
  }
  for (const row of outlineRows) {
    if (row.chapterNo === null) continue
    const chapterId2 = ensureEmptyChapterRow(ws, detail.job.project_id, row.chapterNo, row.title, row.outlineId)
    if (chapterId2) commits.push({ domain_table: 'chapters', domain_row_id: chapterId2 })
  }
```

顶部 import `upsertWorldDoc, upsertCharacterSheet, upsertOutlineDoc, ensureEmptyChapterRow`（`./domain-upsert`）；加本地 `firstHeadingOf`（与 domain-upsert 的 `firstHeading` 相同一行正则，或从 domain-upsert 导出复用——导出复用，改 domain-upsert 把 `firstHeading` 导出为 `firstHeadingOf`）。原 `reviews.*` 分支里 `chapter_no`/`chapter_text_hash` 引用 `chapter`——project 主体不会有 `reviews.*` 绑定（模板禁止），保留原实现但其位于 `matched` 循环内。gates 调用处消费新返回值不变（commit 前重跑门已存在）。

`run-job.ts` 两处消费 `failedStatus`：候选终态写入改为

```ts
          updateKernelCandidate(ws, candidateId, {
            status: gate.failedCode ? (gate.failedStatus === 'failed' ? 'failed' : 'gated') : 'succeeded',
            ...
```

（其余字段不动。）

- [ ] **Step 6: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`
Expected: PASS（含既有 commit/acceptance 用例——单章/单报告路径行为等价：`filter` 命中一份时与旧 `find` 相同）。

- [ ] **Step 7: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): upsert bindings, empty chapter rows, iterate all artifacts on commit"
```

---

### Task 7: Job API 动词化（verb 解析、默认实例、预检、并发判重、project 主体贯通）

**Files:**
- Create: `ui/server/src/kernel/verbs/defaults.ts`
- Modify: `ui/server/src/kernel/jobs/run-job.ts`
- Test: `ui/server/src/kernel/verbs/defaults.test.ts`、`ui/server/src/kernel/jobs/run-job.test.ts`（追加）

**Interfaces:**
- Produces: `CreateKernelJobBody` 增 `verb?: string; verb_params?: Record<string, unknown>; user_brief?: { title?: string; genre?: string; idea?: string; length_target?: string; constraints?: string }`，`contract_ids` 变为可选；`loadVerbDefaults(ws): Record<string, string[]>`（缺文件时 seed 内置默认并写盘）；`saveVerbDefaults(ws, defaults): void`。错误码：`VERB_UNKNOWN`、`VERB_DEFAULT_MISSING`、`VERB_MIXED`、`SUBJECT_TYPE_MISMATCH`、`BRIEF_REQUIRED`、`PROJECT_JOB_RUNNING`（HTTP 见 spec 错误码表；`PROJECT_JOB_RUNNING` 为 409，`CreateKernelJobError.status` 联合加 `409`）。
- Consumes: Task 1 registry、Task 2 infer/store、Task 4 `hasActiveKernelJob` + 新列、Task 5 `subjectType/briefJson` 贯通。

- [ ] **Step 1: 写 defaults 失败测试**

```ts
// ui/server/src/kernel/verbs/defaults.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadVerbDefaults, saveVerbDefaults } from './defaults'

describe('verb defaults', () => {
  test('seeds builtin defaults on first load and persists them', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-'))
    const defaults = loadVerbDefaults(ws)
    expect(defaults.review_chapter).toEqual(['oh-story-core.story-review.full'])
    expect(defaults.apply_review).toEqual(['oh-story-core.story-apply.surgical'])
    expect(defaults.deslop_chapter).toEqual(['oh-story-core.story-deslop.file'])
    expect(defaults.open_book).toEqual(['oh-story-core.story-long-write.open'])
    const onDisk = JSON.parse(readFileSync(join(ws, '.mangaforge/kernel/verb-defaults.json'), 'utf8'))
    expect(onDisk.open_book).toEqual(['oh-story-core.story-long-write.open'])
  })
  test('user edits survive reload (seed does not overwrite)', () => {
    const ws = mkdtempSync(join(tmpdir(), 'verb-defaults-2-'))
    loadVerbDefaults(ws)
    saveVerbDefaults(ws, { ...loadVerbDefaults(ws), review_chapter: ['my-pack.my-review.v1'] })
    expect(loadVerbDefaults(ws).review_chapter).toEqual(['my-pack.my-review.v1'])
  })
})
```

- [ ] **Step 2: 实现 defaults.ts**

```ts
// ui/server/src/kernel/verbs/defaults.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { kernelRootDir } from '../paths'

const BUILTIN_DEFAULTS: Record<string, string[]> = {
  review_chapter: ['oh-story-core.story-review.full'],
  apply_review: ['oh-story-core.story-apply.surgical'],
  deslop_chapter: ['oh-story-core.story-deslop.file'],
  open_book: ['oh-story-core.story-long-write.open'],
}

function defaultsPath(ws: string): string {
  return join(kernelRootDir(ws), 'verb-defaults.json')
}

export function loadVerbDefaults(ws: string): Record<string, string[]> {
  const path = defaultsPath(ws)
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(BUILTIN_DEFAULTS, null, 2))
    return { ...BUILTIN_DEFAULTS }
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return typeof parsed === 'object' && parsed ? parsed : { ...BUILTIN_DEFAULTS }
  } catch {
    return { ...BUILTIN_DEFAULTS }
  }
}

export function saveVerbDefaults(ws: string, defaults: Record<string, string[]>): void {
  const path = defaultsPath(ws)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(defaults, null, 2))
}
```

（`kernelRootDir` 若 `kernel/paths.ts` 里名字不同——以该文件实际导出的「`.mangaforge/kernel` 根目录」函数为准，`kernelContractsDir` 的父目录即是。）

Run: `cd ui/server && bun test src/kernel/verbs/defaults.test.ts` → PASS

- [ ] **Step 3: 写 run-job 动词化失败测试（追加到 run-job.test.ts，沿用文件既有 harness——工作区/合同/假 runner 构造照抄现有用例）**

```ts
describe('verb-based job creation', () => {
  test('verb only resolves default instances', async () => {
    // harness：seed 内置合同 + 模型/供应商 + skipRuntimeCheck，同现有用例
    const result = await validateCreateKernelJob(ws, {
      project_id: 3, subject_type: 'chapter', subject_id: 62, verb: 'review_chapter', model_id: 217,
    } as any, { skipRuntimeCheck: true })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.contracts.map(c => c.id)).toEqual(['oh-story-core.story-review.full'])
  })
  test('unknown verb / missing default / mixed verbs / subject mismatch', async () => {
    const base = { project_id: 3, subject_type: 'chapter', subject_id: 62, model_id: 217 }
    expect(((await validateCreateKernelJob(ws, { ...base, verb: 'nope' } as any, { skipRuntimeCheck: true })) as any).code).toBe('VERB_UNKNOWN')
    expect(((await validateCreateKernelJob(ws, { ...base, verb: 'rewrite_chapter' } as any, { skipRuntimeCheck: true })) as any).code).toBe('VERB_DEFAULT_MISSING')
    expect(((await validateCreateKernelJob(ws, {
      ...base, verb: 'review_chapter',
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-deslop.file'],
    } as any, { skipRuntimeCheck: true })) as any).code).toBe('VERB_MIXED')
    expect(((await validateCreateKernelJob(ws, {
      ...base, subject_type: 'project', subject_id: 3, verb: 'review_chapter',
    } as any, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })
  test('open_book requires brief and project_id==subject_id; dedupes per verb', async () => {
    const body: any = { project_id: 3, subject_type: 'project', subject_id: 3, verb: 'open_book', model_id: 217 }
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('BRIEF_REQUIRED')
    body.user_brief = { idea: '一句话创意' }
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    // 插一条 running 的 open_book job 后再验
    insertKernelJob(ws, { id: 'job-run', project_id: 3, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'outline', subject_type: 'project', subject_id: 3, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'open_book', verb_params: '{}', subject_key: '', brief_json: '' })
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('PROJECT_JOB_RUNNING')
  })
  test('legacy body without verb still works via inference', async () => {
    const result = await validateCreateKernelJob(ws, {
      project_id: 3, subject_type: 'chapter', subject_id: 62, model_id: 217,
      contract_ids: ['oh-story-core.story-review.full'],
    } as any, { skipRuntimeCheck: true })
    expect(result.ok).toBe(true)
  })
})
```

（open_book 用例依赖 Task 8 的 `.open` 内置实例——先写测试，Task 8 前本组 open_book 用例预期 `VERB_DEFAULT_MISSING` 之外的失败；执行顺序上按本计划任务序，Task 8 完成后本用例才全绿。为避免中间态红灯：本任务先给 open_book 用例加 `test.todo` 标记，Task 8 的 Step 里改回 `test`。）

- [ ] **Step 4: 实现 run-job.ts 动词化**

`CreateKernelJobBody` 替换：

```ts
export type CreateKernelJobBody = {
  project_id: number; subject_type: string; subject_id: number
  contract_ids?: string[]; model_id: number; title?: string
  verb?: string
  verb_params?: Record<string, unknown>
  user_brief?: { title?: string; genre?: string; idea?: string; length_target?: string; constraints?: string }
}
export type CreateKernelJobError = { ok: false; status: 400 | 409 | 503; code: string; message: string }
```

`validateCreateKernelJob` 主体替换（运行时检查与模型/供应商翻译段保留原实现，其余按下）：

```ts
  // 1) 选合同：显式 ids 或 verb 默认
  const { contracts } = loadKernelContracts(ws)
  const ids = Array.isArray(body.contract_ids) && body.contract_ids.length
    ? body.contract_ids
    : null
  let verb = String(body.verb || '')
  if (!ids && !verb) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '需要 verb 或 contract_ids' }
  if (verb && !getVerbTemplate(verb)) return { ok: false, status: 400, code: 'VERB_UNKNOWN', message: `未知动词 ${verb}` }
  const resolvedIds = ids || (loadVerbDefaults(ws)[verb] || [])
  if (!resolvedIds.length) return { ok: false, status: 400, code: 'VERB_DEFAULT_MISSING', message: `动词 ${verb} 无默认实例` }
  if (resolvedIds.length > 8) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: 'contract_ids 需要 1..8 个' }
  const selected: KernelContractView[] = []
  for (const id of resolvedIds) {
    const contract = contracts.find(c => c.id === id)
    if (!contract) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `contract not found: ${id}` }
    if (!contract.implemented) return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: id }
    selected.push(contract)
  }
  // 2) 动词一致性（并跑主键 = verb）
  const verbs = new Set(selected.map(c => resolveContractVerb(c) || ''))
  if (verbs.has('')) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '合同缺 verb 且无法推断' }
  if (verbs.size > 1) return { ok: false, status: 400, code: 'VERB_MIXED', message: '并跑的合同必须同动词' }
  verb = [...verbs][0]
  const template = getVerbTemplate(verb)!
  // 3) 主体检查
  if (body.subject_type !== template.subject_type) {
    return { ok: false, status: 400, code: 'SUBJECT_TYPE_MISMATCH', message: `动词 ${verb} 主体是 ${template.subject_type}` }
  }
  if (template.subject_type === 'pack') {
    return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: 'adapt_pack 第一期不执行' }
  }
  if (template.subject_type === 'project' && Number(body.subject_id) !== Number(body.project_id)) {
    return { ok: false, status: 400, code: 'SUBJECT_TYPE_MISMATCH', message: 'project 主体要求 subject_id == project_id' }
  }
  // 4) open_book 预检：brief 必填且 ≤32KiB
  let briefJson = ''
  if (verb === 'open_book') {
    const brief = body.user_brief
    if (!brief || !String(brief.idea || '').trim()) {
      return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '深度孵化需要创作创意' }
    }
    briefJson = JSON.stringify(brief)
    if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
      return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
    }
  }
  // 5) 并发判重：project 级按 project+verb，章级按 project+verb+subject
  const dedupe = template.subject_type === 'project'
    ? { projectId: body.project_id, verb }
    : { projectId: body.project_id, verb, subjectId: body.subject_id }
  if (hasActiveKernelJob(ws, dedupe)) {
    return { ok: false, status: 409, code: 'PROJECT_JOB_RUNNING', message: '同项目同动词任务未结束' }
  }
```

返回值加 `verb`、`briefJson`、`template`（类型：`{ ok: true; contracts: KernelContractView[]; providerId: string; verb: string; briefJson: string; subjectType: 'chapter' | 'project' }`）。`createAndRunKernelJob` 相应改：`insertKernelJob` 写 `subject_type: validated.subjectType, verb: validated.verb, verb_params: JSON.stringify(body.verb_params || {}), subject_key: '', brief_json: validated.briefJson`；runner 调用传 `subjectType: validated.subjectType, briefJson: validated.briefJson`（`run-candidate` 已在 Task 5 接收）。auto-commit 判定改为 `succeededContract?.commit.mode === 'auto_if_single'`——`open_book` 实例 `commit.mode='manual'`，唯一 succeeded 也进 `awaiting_selection`（现网逻辑已如此，勿动 else 分支）。

- [ ] **Step 5: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`
Expected: PASS（open_book 组暂 todo）。既有 run-job 用例传 `contract_ids` 无 verb——推断路径兼容。

- [ ] **Step 6: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): verb-resolved job creation, defaults file, per-verb dedup, briefs"
```

### Task 8: 开书内置实例 `oh-story-core.story-long-write.open`

**Files:**
- Modify: `ui/server/src/kernel/contracts/builtin.ts`
- Test: `ui/server/src/kernel/contracts/builtin-open.test.ts`（新建）；恢复 Task 7 的 `test.todo`
- Modify: `ui/server/src/kernel/projection/snapshot.test.ts`（追加 glob 优先级锁定用例）

**Interfaces:**
- Produces: 内置合同 `oh-story-core.story-long-write.open`（`verb: 'open_book'`）；`BUILTIN_KERNEL_CONTRACTS` 变 5 份。
- Consumes: Task 2 校验链（该实例必须过 `validateInstanceAgainstTemplate`）。

- [ ] **Step 1: 写失败测试**

```ts
// ui/server/src/kernel/contracts/builtin-open.test.ts
import { describe, expect, test } from 'bun:test'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'
import { validateKernelContract } from './schema'
import { BUILTIN_KERNEL_CONTRACTS } from './builtin'

const open = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.open')!

describe('builtin open_book instance', () => {
  test('exists, passes schema and template validation', () => {
    expect(open).toBeTruthy()
    expect(validateKernelContract(open).ok).toBe(true)
    expect(validateInstanceAgainstTemplate(open)).toEqual({ ok: true })
  })
  test('prompt locks open-book intent and forbids prose', () => {
    expect(open.invoke.mention).toBe('$story-long-write')
    expect(open.invoke.prompt).toContain('帮我开书')
    expect(open.invoke.prompt).toContain('不要写正文')
    expect(open.invoke.prompt).toContain('{{user_brief_file}}')
  })
  test('outputs order puts narrow character glob before wide world glob', () => {
    const kinds = open.outputs.map(o => o.artifact_kind)
    expect(kinds.indexOf('character_sheet')).toBeLessThan(kinds.indexOf('world_doc'))
  })
  test('manual commit, no 正文 in write_scope', () => {
    expect(open.commit.mode).toBe('manual')
    expect(open.write_scope.some(p => p.startsWith('正文'))).toBe(false)
  })
})
```

`snapshot.test.ts` 追加（锁定 outputs 顺序 = 命中优先级）：

```ts
test('glob priority follows outputs order: 角色 file is character_sheet, not world_doc', () => {
  // 用本文件既有 harness：manifest 为空快照，projectDir 写入 设定/角色/楚弦.md 与 设定/世界观.md
  const contract: any = {
    ...harnessContract(),
    write_scope: ['设定/'],
    outputs: [
      { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
      { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
    ],
  }
  const result = harvestKernelArtifacts({ projectDir, artifactsDir, manifest: {}, contract, vars: harnessVars() })
  const byPath = Object.fromEntries(result.artifacts.map(a => [a.rel_path, a.artifact_kind]))
  expect(byPath['设定/角色/楚弦.md']).toBe('character_sheet')
  expect(byPath['设定/世界观.md']).toBe('world_doc')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd ui/server && bun test src/kernel/contracts/builtin-open.test.ts`
Expected: FAIL（实例不存在）

- [ ] **Step 3: 实现——builtin.ts 增加实例并注册**

```ts
const longWriteOpen: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.open',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'open',
  verb: 'open_book',
  capability: 'outline',
  label: '深度孵化（oh-story 开书）',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '帮我开书。',
      '创作创意见 {{user_brief_file}}，以它为唯一选题输入。',
      '执行开书流程 Phase 1→2→3：题材定位与核心设定写入 设定/，卷纲与首批章节细纲写入 大纲/。',
      '默认停在细纲交付：不要写正文，不要创建 正文/ 目录下的任何文件，不要进入单章写作。',
      '至少交付：一份总纲或卷纲、一份章细纲、一份世界观文件、一份角色档案。',
    ].join('\n'),
  },
  projection: { mounts: ['user_brief', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
    { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['设定/', '大纲/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
  commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

export const BUILTIN_KERNEL_CONTRACTS: KernelContract[] = [reviewFull, deslopFile, applySurgical, longWriteOutline, longWriteOpen]
```

（`KernelContract` 类型经 Task 2 已含 `verb?`。收存顺序注意：`character_sheet` 窄 glob 在前、`world_doc` 宽 glob 在后——`snapshot.ts` 的 `outputs.find` 按数组序取第一条命中。）

同时把 Task 7 中 open_book 的 `test.todo` 改回 `test`。

- [ ] **Step 4: 跑测试确认通过 + 回归**

Run: `cd ui/server && bun test src/kernel/`
Expected: 全绿（含 Task 7 恢复的 open_book 用例、store 测试的内置文件数断言——若锁了 4 份改成 5 份）。

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/kernel
git commit -m "feat(kernel): builtin open_book instance for story-long-write"
```

---

### Task 9: 产物内容只读接口（向导预览用）

**Files:**
- Modify: `ui/server/src/kernel/jobs/repo.ts`（`getKernelArtifact`）
- Modify: `ui/server/src/routes/kernel-job-routes.ts`
- Test: `ui/server/src/routes/kernel-job-routes.test.ts`（追加；若无此文件则新建，harness 仿照 `routes/kernel-routes.test.ts` 的 Map 收集路由模式）

**Interfaces:**
- Produces: `GET /api/kernel/artifacts/:id/content` → `{ ok: true, artifact: { id, rel_path, artifact_kind, byte_size }, content: string }`；产物超过 256KiB 时 `content` 截断到 256KiB 且响应带 `truncated: true`；不存在 → 404 `ARTIFACT_NOT_FOUND`。`getKernelArtifact(ws, id): { id; candidate_id; artifact_kind; rel_path; sha256; byte_size; vault_path; metadata } | null`。
- Consumes: `kernel_artifacts` 表。

- [ ] **Step 1: 写失败测试**

```ts
test('artifact content endpoint reads vault file and 404s on unknown id', async () => {
  // harness：直接 insertKernelArtifact 一行，vault_path 指向临时文件（写入 '# 世界观\n正文'）
  const ok = await callRoute(handlers.get('GET /api/kernel/artifacts/:id/content'), { params: { id: artifactId } })
  expect(ok.status).toBe(200)
  expect(ok.body.content).toContain('世界观')
  const missing = await callRoute(handlers.get('GET /api/kernel/artifacts/:id/content'), { params: { id: 'art-nope' } })
  expect(missing.status).toBe(404)
  expect(missing.body.code).toBe('ARTIFACT_NOT_FOUND')
})
```

- [ ] **Step 2: 实现**

`repo.ts` 加：

```ts
export function getKernelArtifact(ws: string, id: string) {
  return withDb(ws, db => db.query('SELECT * FROM kernel_artifacts WHERE id = ?').get(id) as any | null)
}
```

`kernel-job-routes.ts` 加路由（import `getKernelArtifact`、`readFileSync`）：

```ts
  app.get('/api/kernel/artifacts/:id/content', (req, res) => {
    const artifact = getKernelArtifact(deps.getWorkspace(), String(req.params?.id || ''))
    if (!artifact) return res.status(404).json({ error: 'artifact not found', code: 'ARTIFACT_NOT_FOUND' })
    let content = ''
    try { content = readFileSync(String(artifact.vault_path), 'utf8') } catch { content = '' }
    const LIMIT = 256 * 1024
    const truncated = content.length > LIMIT
    res.json({
      ok: true,
      artifact: { id: artifact.id, rel_path: artifact.rel_path, artifact_kind: artifact.artifact_kind, byte_size: artifact.byte_size },
      content: truncated ? content.slice(0, LIMIT) : content,
      truncated,
    })
  })
```

- [ ] **Step 3: 跑测试 + Commit**

Run: `cd ui/server && bun test src/routes/kernel-job-routes.test.ts`
Expected: PASS

```bash
git add ui/server/src/kernel/jobs/repo.ts ui/server/src/routes
git commit -m "feat(kernel): read-only artifact content endpoint for selection preview"
```

---

### Task 10: 向导改造——删 `quick_ai`，`deep_draft` 走异步 kernel job

**Files:**
- Modify: `ui/web/src/components/novel-entry/create/createWizardOptions.ts`（`CreateMode` 收窄）
- Modify: `ui/web/src/components/novel-entry/create/createWizardCopy.ts`（删 quick_ai 文案，deep_draft 文案改「深度孵化」描述）
- Modify: `ui/web/src/components/novel-entry/create/CreateModeSection.tsx`（`MODE_ORDER` 两项、栅格改 2 列）
- Modify: `ui/web/src/components/novel-entry/create/useCreateWizardController.ts`（deep_draft 分支重写）
- Modify: `ui/web/src/components/NovelCreateWizard.tsx`（删 quick_ai 引用、deep_draft 渲染孵化进度/预览/采纳）
- Test: `ui/server/src/routes/deep-draft-wizard-source.test.ts`（新建，静态源码断言）

**Interfaces:**
- Consumes: `POST /api/novel/projects`（现有建项 API）、`POST /api/kernel/jobs`（Task 7 body：`{ verb: 'open_book', project_id, subject_type: 'project', subject_id, model_id, user_brief }`）、`GET /api/kernel/jobs/:id`（轮询 `progress.phase` / `job.status` / `artifacts`）、`GET /api/kernel/artifacts/:id/content`（Task 9）、`POST /api/kernel/jobs/:id/commit`、`POST /api/kernel/jobs/:id/cancel`。
- Produces: 前端 `startDeepDraftIncubation()`（建项 → 创建 job → 轮询）、`adoptIncubation(candidateId)`、`discardIncubation()`；不再引用 `deriveProjectSeed` / seed 审阅 / fill-gaps / foundation。

前端无既有测试基建，验收以「静态源码断言 + Task 12 真机」双轨。

- [ ] **Step 1: 写静态源码断言（失败）**

```ts
// ui/server/src/routes/deep-draft-wizard-source.test.ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WEB = join(import.meta.dir, '../../../..', 'web/src/components')
const read = (rel: string) => readFileSync(join(WEB, rel), 'utf8')

describe('deep-draft wizard source contract', () => {
  test('quick_ai is fully removed from the create wizard', () => {
    for (const rel of [
      'NovelCreateWizard.tsx',
      'novel-entry/create/createWizardOptions.ts',
      'novel-entry/create/createWizardCopy.ts',
      'novel-entry/create/CreateModeSection.tsx',
      'novel-entry/create/useCreateWizardController.ts',
    ]) expect(read(rel)).not.toContain('quick_ai')
  })
  test('deep_draft path does not call the seed pipeline', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    expect(controller).not.toContain('derive-stream')
    expect(controller).not.toContain('deriveProjectSeed')
    expect(controller).not.toContain('fill-gaps')
    expect(controller).not.toContain('project-seed/finalize')
  })
  test('deep_draft creates an open_book kernel job and polls it', () => {
    const controller = read('novel-entry/create/useCreateWizardController.ts')
    expect(controller).toContain("verb: 'open_book'")
    expect(controller).toContain('/api/kernel/jobs')
  })
})
```

（`WEB` 路径按测试文件位置解析到 `ui/web/src/components`；跑一次确认路径能读到文件再继续。）

- [ ] **Step 2: 前端改造**

1. `createWizardOptions.ts` 末行改 `export type CreateMode = 'manual' | 'deep_draft'`。
2. `createWizardCopy.ts` 删 `quick_ai` 条目；`deep_draft` 文案改 `{ title: '深度孵化', hint: 'oh-story 开书：设定+大纲+细纲，停在细纲，人工采纳' }`。
3. `CreateModeSection.tsx`：`MODE_ORDER` 改 `['manual', 'deep_draft']`，`gridTemplateColumns` 改 `repeat(2, minmax(0, 1fr))`。
4. `useCreateWizardController.ts`：删除所有 `createMode === 'quick_ai'` 分支与 seed 派生副作用（第 174 行起的 deep_draft seed effect、第 225/243/269-281 行的 seed/foundation 判定、`deriveProjectSeed` 导入与返回值）；新增孵化状态机：

```ts
type IncubationState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'running'; jobId: string; hint: string; elapsedMs: number }
  | { phase: 'awaiting_selection'; jobId: string; candidateId: string; artifacts: Array<{ id: string; rel_path: string; artifact_kind: string }> }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

async function startDeepDraftIncubation() {
  setIncubation({ phase: 'creating' })
  const project = await fetchJson('/api/novel/projects', { method: 'POST', body: JSON.stringify(projectFormPayload()) })
  const job = await fetchJson('/api/kernel/jobs', {
    method: 'POST',
    body: JSON.stringify({
      verb: 'open_book',
      project_id: project.project.id,
      subject_type: 'project',
      subject_id: project.project.id,
      model_id: selectedKernelModelId, // 工作台当前选中的 Codex 内核文本模型（现网 304）
      user_brief: { title: form.title, genre: form.genre, idea: form.idea, length_target: form.lengthTarget, constraints: form.constraints },
    }),
  })
  if (!job.ok) { setIncubation({ phase: 'failed', jobId: null, errorCode: job.code || 'UNKNOWN' }); return }
  pollIncubation(job.job.id)
}
```

轮询 `GET /api/kernel/jobs/:id` 每 2s：`status==='awaiting_selection'` → 取 succeeded 候选与 artifacts 进预览态；`failed`/`cancelled` → failed 态展示 `error_code`；采纳 `POST /:id/commit {candidate_id}` 成功后跳转项目工作台；丢弃调 `/:id/cancel`（或直接离开，空项目保留）。预览项点击拉 `GET /api/kernel/artifacts/:id/content` 折叠展示，只读。

5. `NovelCreateWizard.tsx`：删两处 `quick_ai` 引用（`showAutoCreate` 传 `false` 或删属性、第 639 行禁用条件删该分支）；`deep_draft` 提交按钮接 `startDeepDraftIncubation`，渲染孵化进度（`phase` + `hint` + 已用时）、`awaiting_selection` 的文件清单（按 `artifact_kind` 分组：世界观/角色/大纲）与「采纳 / 丢弃」按钮。

具体 JSX 结构由实现者按该文件既有 antd 风格（`Card`/`Steps`）落地；接口调用与状态机以上面为准，不得引入 seed 相关组件。

- [ ] **Step 3: 验证**

Run: `cd ui/server && bun test src/routes/deep-draft-wizard-source.test.ts`
Expected: PASS

Run: `cd ui/web && bun run build`（或该目录 package.json 的 build/typecheck 脚本）
Expected: 编译通过，无 quick_ai 残留引用报错。

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/components ui/server/src/routes/deep-draft-wizard-source.test.ts
git commit -m "feat(web): deep-draft wizard runs open_book kernel job, quick_ai removed"
```

---

### Task 11: 收编现网——三按钮桥接补 verb（分期 3）

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Test: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`（追加断言；既有验收行为用例保持不动）

**Interfaces:**
- Consumes: Task 7 `CreateKernelJobBody.verb`。
- Produces: 桥接创建的 job 带 `verb`（review→`review_chapter`、deslop→`deslop_chapter`、apply→`apply_review`）；响应形状与现网一致。

- [ ] **Step 1: 写失败断言（追加）**

```ts
test('bridge tags kernel jobs with the workbench verb', async () => {
  // 沿用本文件既有桥接 harness（假 runner），跑一次 review 动作后：
  const db = openKernelDb(ws)
  const row = db.query(`SELECT verb FROM kernel_jobs ORDER BY created_at DESC LIMIT 1`).get() as any
  db.close()
  expect(row.verb).toBe('review_chapter')
})
```

- [ ] **Step 2: 实现**

`novel-oh-story-core-routes.ts` 里构造 `createAndRunKernelJob` body 处（`handleAction` 内）加映射：

```ts
const ACTION_VERB: Record<OhStoryCoreAction, string> = {
  review: 'review_chapter', deslop: 'deslop_chapter', apply: 'apply_review',
}
// body 增字段：
  verb: ACTION_VERB[action],
```

（合同 id 推断本就能得出同名 verb——显式带上是为了让账本 `kernel_jobs.verb` 与动词 API 同源，且桥接不依赖推断表。）

- [ ] **Step 3: 验证 + Commit**

Run: `cd ui/server && bun test src/routes/novel-oh-story-core-routes.test.ts src/kernel/jobs/acceptance.fixture.test.ts`
Expected: PASS——现网三按钮行为不变（分期 3 验收）。

```bash
git add ui/server/src/routes
git commit -m "feat(novel): oh-story bridge tags kernel jobs with verbs"
```

---

### Task 12: 真机验收（开书产品，分期 2 收口）

**Files:** 无代码；产出 `docs/superpowers/plans/2026-08-17-openbook-acceptance-notes.md`（记录执行结果）

前置：本机已装锁定版 codex，`POST /api/kernel/runtime/probe` ①-④ 绿（探针见内核 spec；④ spawn 对开书非必须但需记录现状）。

- [ ] **Step 1: 准备**——工作台选中内核模型 `kernel-codex-gpt-5.6-luna`（model_id 304，禁 302）；确认 `GET /api/kernel/contracts` 里 `oh-story-core.story-long-write.open` `implemented: true`。
- [ ] **Step 2: 深度孵化全流程**——创建向导：确认只有「手动开书 / 深度孵化」两项；填创意提交；观察 202 + 轮询进度（不阻塞单条 HTTP）；等待 `awaiting_selection`。
- [ ] **Step 3: 验收断言**——① vault 产物含 ≥1 世界观、≥1 角色、≥2 大纲（至少一份细纲 + 一份总纲/卷纲）；② 无 `正文/` 产物、无 chapter_text kind；③ 领域表此刻未写入（manual：`worldbuilding/characters/outlines` 计数为 0）；④ 采纳后工作台可见世界观、角色、大纲与空章列表（`has_prose=false`）；⑤ 网络面板无 `/novel/project-seed/derive-stream` 调用；⑥ 取消/丢弃路径：重开一次孵化后取消，空项目保留、领域表不写。
- [ ] **Step 4: 记录**——把每条断言的实际结果（含 job id、error_code、耗时）写进 notes 文件；失败项回到对应任务修复后重跑。
- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-08-17-openbook-acceptance-notes.md
git commit -m "docs: open_book real-run acceptance notes"
```

---

## 收尾与遗留（不在本计划内，按 spec 分期 4+ 另开计划）

- `expand_outline` / `write_chapter` / `write_continue` / `rewrite_chapter` / `adapt_pack` 的运行时与预检（`FOUNDATION_PRECONDITION`、`OUTLINE_MISSING`、`verb_params` 消费、`subject_key` 使用）：模板与错误码位已留，`IMPLEMENTED_VERBS` 未含即 `CONTRACT_NOT_IMPLEMENTED`。替换 `generateChapterForGroup` 必须另开 spec。
- 动词/默认实例管理 UI（`verb_defaults` 编辑）；`adapt_pack` 元合同投影与 `ADAPT_NO_VALID_CONTRACT`。
- 旧 seed API（derive/fill-gaps/finalize）的最终下线决策——本计划只切断 deep_draft 调用，API 暂留。
- 开书后 `选题决策.md` 与扫榜流程的关系（spec 明确不占用该文件名）。

## Self-Review 记录

- 覆盖检查：spec「测试·基板」全部条目对应 Task 1-7（校验矩阵 T1/T2、project 投影 T5、假收存 T3、commit 多份 upsert/空章行/二次 409 T6、并发判重 T4/T7、world 回放 T5）；「测试·开书产品」对应 T8/T10/T12；「测试·收编现网」对应 T11。glob 优先级锁定在 T8。`KIND_COUNT_BELOW_MIN=failed` 在 T3。
- 已知偏离（有意）：deslop/apply 模板把 `reviews` 从禁止挪到允许，理由写在 Task 1 Step 4 说明——与现网内核 commit 实际行为一致，且为报告归档留门；如需严格按 spec 原文，删去两处 `allowed_domain_writes` 里的 `reviews` 并同步说明。
- 类型一致性：`failedStatus` 由 T3 产、T6 消费；`verb` 列由 T4 产、T7 写真值、T11 断言；`subjectType/briefJson` 由 T5 产、T7 传；`listCommittedDocPaths` 由 T4 产、T5 消费；`getVerbTemplate/IMPLEMENTED_VERBS` 由 T1 产、T2/T3/T7 消费。

