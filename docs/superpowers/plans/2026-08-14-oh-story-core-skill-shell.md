# oh-story 核心 Skill + 项目壳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop migrated oh-story design lectures from auto-patching chapter prose; treat fingerprint/Zhuque as reference scores; install the upstream oh-story skill suite as the core reviewer/deslop runner; keep existing contracts and the writing-skill marketplace, but do not auto-run them during this eval.

**Architecture:** Phase 0 is a behavior freeze inside current pipelines (directives, prompts, admission, humanize skip). Phase 1 adds a separate on-disk oh-story core suite and a solo runner that never goes through `compileWritingSkillPassPrompt`. Phase 2 points the director primary action at those skills instead of stuffing contracts into Flash prompts.

**Tech Stack:** TypeScript, bun:test, Express routes already used by `register-oh-story.ts`, existing `reviews` / `chapter_versions` tables, Ant Design buttons on the quality panel.

**Spec:** `docs/superpowers/specs/2026-08-14-oh-story-core-skill-shell-design.md`

**Commit policy:** This repo’s user rule wins over the skill’s “commit every task” default. Skip every Commit step unless the user explicitly asks to commit.

**Ship rule:** Phase 0 (Tasks 1–6) is independently releasable. Do not start Phase 1 until Phase 0 tests pass. Do not start Phase 2 until Phase 1 review/deslop can persist artifacts.

---

## File map

Phase 0 — modify:

- `ui/server/src/novel-writing/prose-quality-delivery-link.ts` — `conflict_structure` / `dialogue` / `opening` specialty: conflict_structure gets `excludeFromDirectives: true`
- `ui/server/src/novel-writing/prose-quality-delivery-link.test.ts`
- `ui/server/src/novel-writing/prose-generation-prompt-sections-prep.ts` — strip theory self-check / 定地图 teaching lines
- `ui/server/src/novel-writing/prose-generation-prompt-sections.test.ts`
- `ui/server/src/routes/novel-editor/builders-revision-prompts.ts` — drop theory must_fix lines
- `ui/server/src/routes/novel-editor/builders-revision-prompts.test.ts` (or nearest existing test)
- `ui/server/src/novel-writing/human-webnovel-resistance.ts` — add `selectFingerprintAdvisoryProse`
- `ui/server/src/novel-writing/human-webnovel-resistance.test.ts`
- `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts` — use advisory select; never keep a rollback
- `ui/server/src/novel-writing-service/service/prose-word-target-methods.ts` — use advisory select
- `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts` — detector failures become warnings
- `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts` — same
- `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-loop.ts` — detector does not add revision rounds
- `ui/server/src/routes/novel-editor/revision-worker.ts` — skip writing-skill humanize
- `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts` — skip writing-skill humanize
- matching tests for the skip / store / loop changes
- `docs/oh-story-adoption-progress.md` — next-queue text

Phase 1 — create:

- `ui/server/src/novel-writing/oh-story-core/types.ts`
- `ui/server/src/novel-writing/oh-story-core/store.ts`
- `ui/server/src/novel-writing/oh-story-core/store.test.ts`
- `ui/server/src/novel-writing/oh-story-core/install.ts`
- `ui/server/src/novel-writing/oh-story-core/install.test.ts`
- `ui/server/src/novel-writing/oh-story-core/compile-prompt.ts`
- `ui/server/src/novel-writing/oh-story-core/compile-prompt.test.ts`
- `ui/server/src/novel-writing/oh-story-core/runner.ts`
- `ui/server/src/novel-writing/oh-story-core/runner.test.ts`
- `ui/server/src/routes/novel-oh-story-core-routes.ts`
- `ui/server/src/routes/novel-oh-story-core-routes.test.ts`

Phase 1 — modify:

- `ui/server/src/routes/novel-commercial-ops/register-oh-story.ts` — mount core routes
- `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx` — 审稿 / 去 AI buttons + 参考分 copy
- panel tests + workspace handler wiring (smallest existing revision handler file)

Phase 2 — modify:

- `ui/server/src/routes/novel-oh-story-director.ts`
- `ui/server/src/routes/novel-oh-story-director.test.ts`

Do not touch:

- `ui/server/src/skills/pack-installer.ts`
- `ui/server/src/novel-writing/writing-skills/vendor/**`
- `conflict-structure-basics.ts` check functions (keep for outline/reference scores)
- standard chapter target 4200
- writing-skill marketplace install/uninstall UI (leave in settings; just stop auto-running)

Shared constants used by later tasks (define in Task 1 / Task 7, do not rename):

```ts
export const OH_STORY_THEORY_DIRECTIVE_RE = /三层矛盾|矛盾网|冲突阶梯|有进无出|死亡赌注|压势不压人|定地图|定阵营|定角色/
export const WRITING_SKILL_HUMANIZE_DEFER_REASON = 'deferred_until_oh_story_core_eval'
export const OH_STORY_CORE_SOURCE_URL = 'https://github.com/worldwonderer/oh-story-claudecode'
export const OH_STORY_CORE_SKILL_IDS = ['story-review', 'story-deslop', 'story-long-write'] as const
```

---

## Phase 0 — 止血（可单独上线）

### Task 1: Conflict-structure findings stay visible but never become revision directives

**Files:**
- Modify: `ui/server/src/novel-writing/prose-quality-delivery-link.ts`
- Test: `ui/server/src/novel-writing/prose-quality-delivery-link.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `prose-quality-delivery-link.test.ts`:

```ts
test('keeps conflict-structure issues visible but excludes them from revision directives', () => {
  const linked = mergeProseQualityWithDeliveryRisks(
    { passed: true, score: 82, issues: [], revision_directives: [], needs_revision: false },
    {
      reviews: [
        {
          id: 9,
          review_type: 'conflict_structure_sync',
          status: 'warn',
          payload: {
            conflict_structure_sync: {
              status: 'warn',
              missed_count: 1,
              label: '冲突结构',
              summary: '三层矛盾网没有成立',
              priority_repair: '优先补三层矛盾网',
              checks: [
                {
                  key: 'conflict_network_layers',
                  label: '三层矛盾网',
                  status: 'warn',
                  delivered: false,
                  issue: '缺纵向矛盾',
                  repair_instruction: '补三层矛盾网：先定地图、定阵营、定角色',
                },
              ],
            },
          },
        },
      ],
      limit: 5,
    },
  )
  expect(linked.issues.join('｜') + JSON.stringify(linked.issues)).toMatch(/三层矛盾|冲突结构/)
  expect(linked.revision_directives.join('｜')).not.toMatch(/三层矛盾|定地图|补冲突结构/)
  expect(linked.delivery_link?.actionable_count ?? linked.revision_directives.length).toBe(0)
})
```

If `delivery_link.actionable_count` does not exist, assert only `revision_directives`. Do not invent the field in the test unless you add it in Step 3.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-delivery-link.test.ts`
Expected: FAIL because current code pushes `补冲突结构：优先补三层矛盾网` into directives.

- [ ] **Step 3: Exclude conflict_structure from directives**

In `selectPriorityDeliveryDirectives`, the specialty loop around the `conflict_structure_sync` entry, set `excludeFromDirectives: true` when `key === 'conflict_structure'`. Keep pushing the issue so the UI can still show a reference finding.

```ts
pushDirective(bag, {
  key,
  priority,
  severity: 'medium',
  label: `${label}·${row.label}`,
  directive: compactText(`补${label}：${row.fix}`, 200),
  excludeFromDirectives: key === 'conflict_structure',
  issue: {
    severity: 'medium',
    type: key,
    description: row.issue,
    fix: row.fix,
    source: type,
    ...(key === 'conflict_structure' ? { category: 'reference' } : {}),
  },
})
```

Do not change `conflictStructurePriority()` itself. Outline/quality-sync reports may still say「优先补三层矛盾网」as a reference label.

- [ ] **Step 4: Re-run the test**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-delivery-link.test.ts`
Expected: PASS. If an older test requires `revision_directives` to match `/冲突/`, update that expectation to a remaining actionable source (handoff/progress), not conflict-structure theory.

- [ ] **Step 5: Commit only if the user asked**

---

### Task 2: Strip theory self-check from the prose conflict prompt

**Files:**
- Modify: `ui/server/src/novel-writing/prose-generation-prompt-sections-prep.ts`
- Test: `ui/server/src/novel-writing/prose-generation-prompt-sections.test.ts`

- [ ] **Step 1: Rewrite the existing assertion so the new contract is explicit**

In `prose-generation-prompt-sections.test.ts`, keep the concrete field lines, forbid teaching/self-check lines:

```ts
expect(conflictStructurePrompt).toContain('【冲突结构合同】')
expect(conflictStructurePrompt).toContain('三层矛盾：纵向=纵向压力；横向=横向阵营；交叉=交叉利益；编织=地图 -> 阵营 -> 角色')
expect(conflictStructurePrompt).toContain('冲突阶梯：言语压迫 -> 行动阻拦')
expect(conflictStructurePrompt).not.toContain('定地图→定阵营→定角色')
expect(conflictStructurePrompt).not.toContain('交稿自检必须输出 conflict_structure_checks')
expect(conflictStructurePrompt).not.toContain('三层矛盾网必须检查纵向/横向/交叉')
```

- [ ] **Step 2: Run and confirm fail**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-prompt-sections.test.ts`
Expected: FAIL on the `not.toContain` lines.

- [ ] **Step 3: Replace teaching paragraphs**

In `buildConflictStructurePromptSection`, delete these strings when present:

- `三层矛盾网：长篇冲突必须同时保留纵向矛盾...定地图→定阵营→定角色...`
- `有进无出：读者必须相信主角非踏入不可...` (the teaching paragraph, not the concrete `有进无出/黏结剂：${joinList(...)}` line)
- `交稿自检必须输出 conflict_structure_checks...三层矛盾网必须检查...`
- `硬性要求：执行 chapter_target.conflict_structure_contract；这是来自 oh-story outline-conflict 的矛盾与结构设计口径...` if it tells the model to perform outline-conflict in prose

Keep:

- `【冲突结构合同】`
- concrete lists already on the chapter target / scene card (`冲突阶梯：`, `动机来源：`, `三层矛盾：纵向=...`, `有进无出/黏结剂：${joinList(no_exit_rules)}`)
- a single operational line: `每个主要场景用场上具体阻力回答：谁或什么规则在拦主角得到他要的东西。不要把纵向矛盾/横向矛盾/三层矛盾网这些词写进正文。`

- [ ] **Step 4: Re-run**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-prompt-sections.test.ts`
Expected: PASS

---

### Task 3: Revision prompt builder drops leftover theory must_fix

**Files:**
- Modify: `ui/server/src/routes/novel-editor/builders-revision-prompts.ts`
- Test: existing builders revision prompt test file if present; otherwise create `ui/server/src/routes/novel-editor/builders-revision-prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'bun:test'
import { buildEditorRevisionPrompt } from './builders-revision-prompts'

test('drops oh-story theory must_fix lines from the revision hard-priority list', () => {
  const prompt = buildEditorRevisionPrompt({
    project: { title: '怪谈世界' },
    chapter: { chapter_text: '楚弦咽气的时候，雷达绿线扯成了死灰。' },
    report: {
      revision_strategy: 'surgical_patch',
      must_fix: ['补冲突结构：优先补三层矛盾网', '把耳光后的疼痛反应写细一点'],
      one_click_revision_prompt: '补冲突结构：优先补三层矛盾网',
    },
    revisionMode: 'from_report',
  })
  expect(prompt).toContain('把耳光后的疼痛反应写细一点')
  expect(prompt).not.toMatch(/三层矛盾|定地图|有进无出|冲突阶梯/)
})
```

If the export name is not `buildEditorRevisionPrompt`, use the actual exported function that `revision-worker` / register-revision already imports. Do not create a second builder.

- [ ] **Step 2: Run and confirm fail**

Run: `cd ui/server && bun test src/routes/novel-editor/builders-revision-prompts.test.ts`
Expected: FAIL because must_fix is copied verbatim today.

- [ ] **Step 3: Filter theory lines**

Near `mustFixLines` construction:

```ts
const OH_STORY_THEORY_DIRECTIVE_RE = /三层矛盾|矛盾网|冲突阶梯|有进无出|死亡赌注|压势不压人|定地图|定阵营|定角色/

function dropOhStoryTheoryDirectives(lines: string[]) {
  return uniqueRevisionTexts(lines, 6).filter(line => !OH_STORY_THEORY_DIRECTIVE_RE.test(line))
}
```

Apply to `mustFixLines` and to any `revision_directives` copied into the prompt hint. Do not filter locatable lines such as `把耳光后的疼痛反应写细一点`.

- [ ] **Step 4: Re-run**

Expected: PASS

---

### Task 4: Fingerprint / Zhuque become advisory (no rollback)

**Files:**
- Modify: `ui/server/src/novel-writing/human-webnovel-resistance.ts`
- Test: `ui/server/src/novel-writing/human-webnovel-resistance.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-word-target-methods.ts`

- [ ] **Step 1: Write the advisory selector test**

```ts
test('selectFingerprintAdvisoryProse keeps the candidate even when assessment rejects', () => {
  const before = '他点了根烟，没说话。'
  const after = '命运仿佛在和他开玩笑，三亿人的退路全系在这一枚红色按钮上。'
  const gate = selectFingerprintAdvisoryProse(before, after, { stage: 'writing_skill_humanize' })
  expect(gate.text).toBe(after)
  expect(gate.accepted).toBe(false)
  expect(String(gate.reason || '')).not.toMatch(/已回退前一版正文/)
})

test('selectFingerprintAdvisoryProse still rejects empty candidates', () => {
  const gate = selectFingerprintAdvisoryProse('有正文', '   ')
  expect(gate.text).toBe('有正文')
  expect(gate.accepted).toBe(false)
  expect(gate.reason).toBe('empty_candidate')
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `cd ui/server && bun test src/novel-writing/human-webnovel-resistance.test.ts`
Expected: FAIL (`selectFingerprintAdvisoryProse` missing).

- [ ] **Step 3: Add the function next to `selectFingerprintSafeProse`**

```ts
export function selectFingerprintAdvisoryProse(
  beforeText: string,
  afterText: string,
  options: { contract?: FingerprintContract | null; cwd?: string; stage?: string } = {},
): { text: string; accepted: boolean; reason: string; assessment: ResistanceRevisionAssessment } {
  const before = String(beforeText || '')
  const after = String(afterText || '')
  if (!after.trim()) {
    const assessment = assessProseFingerprintContinuity(before, before, options)
    return { text: before, accepted: false, reason: 'empty_candidate', assessment }
  }
  const assessment = assessProseFingerprintContinuity(before, after, options)
  return {
    text: after,
    accepted: assessment.accepted,
    reason: assessment.accepted ? '' : (assessment.reason || 'fingerprint_reference_only'),
    assessment,
  }
}
```

Do not change `selectFingerprintSafeProse` behavior. Export the new function from the same module.

- [ ] **Step 4: Switch production call sites**

Replace `selectFingerprintSafeProse` with `selectFingerprintAdvisoryProse` in:

- `writing-skill-humanize-methods.ts` (`options.fingerprintSelect` default and the `if (!fingerprint.accepted) warnings.push` branch). After the switch, when assessment fails: still `warnings.push(reason)`, **do not** assign `currentText = passInput`. `currentText` stays `gate.text`.
- `prose-word-target-methods.ts` (every `selectFingerprintSafeProse` call)

Leave `selectFingerprintSafeProse` in tests that document the old rollback algorithm.

- [ ] **Step 5: Run both test files plus humanize unit tests**

Run:

```
cd ui/server && bun test src/novel-writing/human-webnovel-resistance.test.ts src/novel-writing-service/service/writing-skill-humanize-methods.test.ts src/novel-writing-service/service/prose-word-target-methods.ts
```

If word-target tests live beside the methods file, run that test file instead. Expected: PASS. Update any unit test that expected fingerprint rollback to keep the previous text.

---

### Task 5: Detector resistance no longer blocks store or adds quality-revise rounds

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-loop.ts`
- Test: the existing store / prestore tests that expect `PROSE_RESISTANCE_GATE_BLOCKED` or detector-driven rounds

- [ ] **Step 1: Add / flip a store test**

Find the test that expects `PROSE_RESISTANCE_GATE_BLOCKED` (search `PROSE_RESISTANCE_GATE_BLOCKED`). Change it to: a chapter with detector hard failures **stores**, and the thrown path is gone. The review/diagnostics must still record a warning whose source is detector/fingerprint.

If no such test exists, add one in `generate-chapter-full-production-store`’s nearest test file:

```ts
test('stores prose when detector resistance hard-fails and records a reference warning', async () => {
  // reuse the file’s existing harness; pass a finalText that evaluateResistanceAdmission marks hard
  // expect store to persist, not throw PROSE_RESISTANCE_GATE_BLOCKED
})
```

- [ ] **Step 2: Run and confirm fail**

Expected: current store still throws `PROSE_RESISTANCE_GATE_BLOCKED`.

- [ ] **Step 3: Demote detector failures to warnings**

In both store files, keep `evaluateResistanceAdmission(finalText)` but **do not** spread `resistanceAdmission.hard_failures` into `classifyProseAdmission`. Push each as `proseAdmissionWarning('quality', 'detector_resistance_reference', failure.message)` (or the file’s existing warning helper). Canonical / opening / shape failures stay hard.

In `generate-chapter-quality-prestore-loop.ts` set:

```ts
const resistanceNeedsRevise = false
```

Leave the comment that this is spec B: detector does not start extra revision rounds. Do not delete `evaluateHumanWebnovelResistance`; later UI still needs the score.

- [ ] **Step 4: Re-run the store / prestore tests you touched**

Expected: PASS. `classifyProseAdmission` itself may still block if a caller passes `detector_resistance` hard failures — do not change that helper’s meaning; just stop callers from passing detector items as hard.

---

### Task 6: Skip writing-skill humanize on generate + revise

**Files:**
- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts`
- Test: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Test: `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts`

- [ ] **Step 1: Write failing skip tests**

Revision worker: a test that currently expects `runWritingSkillHumanizePass` to be called must now expect it **not** to be called, and the receipt to be:

```ts
{
  version: 'writing_skill_humanize_v2',
  skipped: true,
  reason: 'deferred_until_oh_story_core_eval',
  enabled: false,
  accepted: true,
  changed: false,
  passes: [],
}
```

Post-draft finalize: same receipt, `runWritingSkillHumanizePass` mock must not run.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Skip at the two call sites**

Do **not** early-return inside `runWritingSkillHumanizePass` (unit tests of that function must keep working). At each call site, skip before calling it:

```ts
const deferredWritingSkillHumanize = {
  final_text: admitted.text, // or finalText on generate
  report: {
    version: WRITING_SKILL_HUMANIZE_VERSION,
    fiction_humanizer_mode: 'polish',
    enabled_ids: [],
    enabled: false,
    skipped: true,
    accepted: true,
    changed: false,
    warnings: [],
    reason: 'deferred_until_oh_story_core_eval',
    before_chars: count,
    after_chars: count,
    chunk_count: 0,
    passes: [],
  },
}
```

Revision: use this instead of `deps.runWritingSkillHumanizePass(...)`.  
Generate: same, then continue the existing finalize path with unchanged `finalText`.

- [ ] **Step 4: Re-run the two test files**

Expected: PASS. Update any worker test that asserted skill passes ran during editor revision.

- [ ] **Step 5: Update the adoption ledger next-queue**

In `docs/oh-story-adoption-progress.md` replace “No immediate oh-story reference gaps remain / continue integrating references” with: Phase 0 of `2026-08-14-oh-story-core-skill-shell-design.md` demotes theory gates; do not add more reference-to-prompt migrations.

If `bun run check:oh-story-progress` exists, run it and keep the HTML comment counters consistent.

---

## Phase 1 — 核心套件

### Task 7: On-disk oh-story core store

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/types.ts`
- Create: `ui/server/src/novel-writing/oh-story-core/store.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/store.test.ts`

- [ ] **Step 1: Write the failing store test**

```ts
import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadOhStoryCoreSuite, ohStoryCoreRoot } from './store'

test('loads a locked suite from workspace/.mangaforge/oh-story-core', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-'))
  const root = ohStoryCoreRoot(workspace)
  await mkdir(join(root, 'skills', 'story-review'), { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
    revision: 'abc1234',
    installed_at: '2026-08-14T00:00:00.000Z',
    skills: ['story-review', 'story-deslop', 'story-long-write'],
  }))
  await writeFile(join(root, 'skills', 'story-review', 'SKILL.md'), '---\nname: story-review\n---\n# review\n')
  const suite = loadOhStoryCoreSuite(workspace)
  expect(suite?.revision).toBe('abc1234')
  expect(suite?.skills['story-review']?.skill_markdown).toContain('# review')
})

test('returns null when the suite is missing', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'oh-story-core-missing-'))
  expect(loadOhStoryCoreSuite(workspace)).toBeNull()
})
```

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement store**

```ts
export const OH_STORY_CORE_SOURCE_URL = 'https://github.com/worldwonderer/oh-story-claudecode'
export const OH_STORY_CORE_SKILL_IDS = ['story-review', 'story-deslop', 'story-long-write'] as const

export function ohStoryCoreRoot(workspace: string) {
  return join(workspace, '.mangaforge', 'oh-story-core')
}
```

`loadOhStoryCoreSuite` reads `pack.json` + each `skills/{id}/SKILL.md` and optional `skills/{id}/references/*.md` (markdown only, skip `scripts/`). Missing suite → `null`. Refuse path escape (`..`, symlink) using `validateSkillPackArchiveEntry` / existing path-safety helpers.

- [ ] **Step 4: Re-run store tests**

Expected: PASS

---

### Task 8: Install and lock upstream oh-story

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/install.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/install.test.ts`

Reuse GitHub URL / HEAD / zip download helpers from `ui/server/src/novel-writing/writing-skills/install-github.ts` by importing shared URL/download functions if they are already exported; if they are not exported, copy the smallest fetch+zip slice rather than importing the writing-skill installer body (do not register oh-story into the writing-skill catalog).

Bounds (locked here, not TBD):

```ts
export const MAX_OH_STORY_CORE_ARCHIVE_BYTES = 64 * 1024 * 1024
export const MAX_OH_STORY_CORE_EXTRACTED_BYTES = 16 * 1024 * 1024
```

Extract only zip entries under `skills/story-review/`, `skills/story-deslop/`, `skills/story-long-write/` whose basename is `SKILL.md` or that live in `references/` and end with `.md`. Skip `scripts/`, `tests/`, `demo/`. Atomic write: temp dir + rename over `{workspace}/.mangaforge/oh-story-core`.

- [ ] **Step 1: Write a zip-fixture install test** (build a tiny in-memory zip with the three skill folders; do not hit the network)

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement `installOhStoryCoreSuite(workspace)`** — hardcoded source URL, lock HEAD sha into `pack.json`

- [ ] **Step 4: Re-run install tests**

Same-revision reinstall is idempotent. Different revision replaces the directory.

---

### Task 9: Compile oh-story prompts without the fiction rewrite contract

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/compile-prompt.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/compile-prompt.test.ts`

- [ ] **Step 1: Failing tests**

```ts
test('review prompt includes SKILL.md and forbids the humanize rewrite contract', () => {
  const prompt = compileOhStoryCorePrompt({
    skillId: 'story-review',
    skillMarkdown: '# Novel Review\n找出问题。',
    references: [{ file: 'quality-checklist.md', text: '开头有钩子' }],
    chapterText: '楚弦咽气的时候。',
    projectTitle: '怪谈世界',
  })
  expect(prompt).toContain('# Novel Review')
  expect(prompt).toContain('开头有钩子')
  expect(prompt).toContain('楚弦咽气的时候。')
  expect(prompt).toMatch(/solo/)
  expect(prompt).not.toContain('只输出改写后正文')
  expect(prompt).not.toContain('补三层矛盾网')
})

test('deslop prompt includes SKILL.md and does not inject outline-conflict lectures', () => {
  const prompt = compileOhStoryCorePrompt({
    skillId: 'story-deslop',
    skillMarkdown: '# Deslop\n能删先删。',
    references: [],
    chapterText: '命运仿佛在和他开玩笑。',
    projectTitle: '怪谈世界',
  })
  expect(prompt).toContain('能删先删')
  expect(prompt).not.toContain('【总合同】')
  expect(prompt).not.toContain('定地图→定阵营→定角色')
})
```

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement compile**

Allowed operational adapter (only this, no craft lectures):

```
【执行模式】solo。不要 spawn 子 agent，不要读写 .novel/。
项目：{title}
技能：{skillId}
审稿（story-review）：只输出审稿报告，不要改章节正文。
去AI（story-deslop）：按本 SKILL.md 的输出要求工作。
【SKILL.md】
...
【参考 · file】
...
【原文】
...
```

Do not import `SHARED_FICTION_CONTRACT` from `compile-pass-prompt.ts`.

- [ ] **Step 4: Re-run**

Expected: PASS

---

### Task 10: Runner — review persists, deslop writes a new chapter version

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/runner.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/runner.test.ts`

The runner receives injected deps: `executeAgent`, `loadSuite`, `saveReview`, `updateChapterText`. It does not import writing-skill humanize.

- [ ] **Step 1: Failing tests**

```ts
test('story-review saves a review and does not call updateChapterText', async () => {
  const saves: any[] = []
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '楚弦咽气的时候。' },
    action: 'review',
    executeAgent: async () => ({ content: '## 编辑审稿\n开篇力：70' }),
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-review': { skill_markdown: '# review', references: [] } },
    }),
    saveReview: async (row) => { saves.push(row); return { id: 1 } },
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(saves[0].review_type).toBe('oh_story_review')
  expect(saves[0].payload.skill_id).toBe('story-review')
  expect(updates).toEqual([])
  expect(result.changed).toBe(false)
})

test('story-deslop updates chapter text from the model body', async () => {
  const updates: any[] = []
  const result = await runOhStoryCoreAction({
    workspace: '/tmp/ws',
    project: { id: 3, title: '怪谈世界' },
    chapter: { id: 61, chapter_no: 1, chapter_text: '命运仿佛在和他开玩笑。' },
    action: 'deslop',
    executeAgent: async () => ({ content: '他点了根烟，没说话。' }),
    loadSuite: () => ({
      revision: 'abc',
      skills: { 'story-deslop': { skill_markdown: '# deslop', references: [] } },
    }),
    saveReview: async () => ({ id: 2 }),
    updateChapterText: async (row) => { updates.push(row) },
  })
  expect(updates[0].chapter_text).toBe('他点了根烟，没说话。')
  expect(result.changed).toBe(true)
})
```

Missing suite → throw an error with code `OH_STORY_CORE_NOT_INSTALLED`.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement runner**

`action: 'review' | 'deslop'`. Map to skill id. Compile prompt. Call `executeAgent` with a JSON/text contract that matches existing `executeAgent` usage in revision (do not add a new `ChapterTaskStage` unless one already fits; reuse `humanize` stage only for deslop transport if required, `review` / existing review agent for review). Persist:

- review: `review_type: 'oh_story_review'`, payload includes `skill_id`, `revision`, `report_text`, `fingerprint_reference` optional
- deslop: write `chapter_text`, insert `chapter_versions` row `source: 'oh_story_deslop'`, plus a review/receipt `oh_story_deslop`

Do not call `selectFingerprintSafeProse`. Optional: attach `selectFingerprintAdvisoryProse` result on the receipt as reference only.

- [ ] **Step 4: Re-run runner tests**

Expected: PASS

---

### Task 11: HTTP API for install / status / review / deslop

**Files:**
- Create: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Test: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- Modify: `ui/server/src/routes/novel-commercial-ops/register-oh-story.ts`

Routes (workspace-scoped like other novel routes):

- `GET /api/novel/oh-story/core` → `{ ok, installed, revision, skills }`
- `POST /api/novel/oh-story/core/install` → install/lock, `{ ok, revision }`
- `POST /api/novel/oh-story/core/review` body `{ project_id, chapter_id }` → runner review
- `POST /api/novel/oh-story/core/deslop` body `{ project_id, chapter_id }` → runner deslop

- [ ] **Step 1: Route tests with mocked runner/install** (no network)

- [ ] **Step 2: Fail, then register in `registerNovelCommercialOpsOhStoryRoutes`**

- [ ] **Step 3: Re-run route tests**

404/400 codes: `OH_STORY_CORE_NOT_INSTALLED`, `CHAPTER_NOT_FOUND`. Do not add analyze/scan/cover here.

---

### Task 12: Quality panel actions + reference-score copy

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspace-center-quality-revision-panel.test.ts`
- Modify: the existing revision handler module that already calls `applyRevision` (likely `shell/workspace-repair-task-handlers.tsx` or the quality panel’s props). Add `onOhStoryReview` / `onOhStoryDeslop` props rather than a new page.

- [ ] **Step 1: Panel test**

```ts
expect(html).toContain('oh-story 审稿')
expect(html).toContain('oh-story 去AI')
expect(html).toContain('参考，不自动改稿')
```

Keep the existing「一键修订」button. It now only sends filtered must_fix (Phase 0). Do not remove it in this task.

- [ ] **Step 2: Fail, then add two small buttons + the reference caption under the score pills**

Wire fetch:

- `POST /api/novel/oh-story/core/review`
- `POST /api/novel/oh-story/core/deslop`

On `OH_STORY_CORE_NOT_INSTALLED`, call install once then retry, or show「先安装 oh-story 核心套件」that POSTs `/core/install`. Reuse the workspace’s existing message/toast helper.

- [ ] **Step 3: Re-run panel tests**

If install from settings is cleaner than auto-install-on-first-click, put a one-line install action in `ProjectSettingsModal` next to writing skills, labeled「安装 oh-story 核心套件」, not inside the writing-skill catalog list.

---

## Phase 2 — 导演改调度

### Task 13: Director primary action points at oh-story skills

**Files:**
- Modify: `ui/server/src/routes/novel-oh-story-director.ts`
- Test: `ui/server/src/routes/novel-oh-story-director.test.ts`

- [ ] **Step 1: Flip / add tests**

Post-draft director:

- `quality_revision_required` from deslop/fingerprint/conflict-structure must **not** be `blocking: true` solely because fingerprint or `conflict_network_layers` missed.
- `primary_action` for “chapter exists, quality noisy” is `run_oh_story_review` or `run_oh_story_deslop`, not `auto_repair_quality_revision`.

Keep `quality_revision_required` as a category for locatable craft receipts if tests already depend on the string; only change `blocking` and `primary_action`.

- [ ] **Step 2: Run and confirm fail**

- [ ] **Step 3: Implement**

When attaching detector / conflict-structure findings, set `blocking: false` and label them reference. Default prompt-budget lists: put outline-conflict / genre-core-mechanics / 三层矛盾网 keys in `omit` unless `primary_action` is a design-skill run (out of scope for the first B eval; leave design action unimplemented rather than half-wired).

- [ ] **Step 4: Re-run director tests**

Expected: PASS. Update any test that required a blocking quality revision for conflict-structure.

---

## Manual verification (after Tasks 1–13)

Use project 3 / chapter 61 (or the current first written chapter):

1. Open 质检修订: score / 冲突结构 can still show; caption says 参考，不自动改稿.
2. Click 一键修订: run `must_fix` / prompt must not contain「补三层矛盾网」. `writing_skill_humanize.reason` is `deferred_until_oh_story_core_eval` or the field is skipped.
3. Install core suite; 审稿 creates `oh_story_review` and does not change `chapter_text`.
4. 去AI writes a new version `source: 'oh_story_deslop'`. Fingerprint may worsen; text is not rolled back.
5. Compare Zhuque 人工率 to run 931 as an observation only.

If step 4–5 still sit near 0% human, stop and discuss spec C. Do not “fix” by re-enabling theory must_fix.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| conflict_structure not in must_fix / directives | 1, 3 |
| strip theory self-check from prose prompt | 2 |
| fingerprint/Zhuque reference only, no rollback, no store block, no auto-revise | 4, 5 |
| writing-skill humanize skipped on generate + revise | 6 |
| keep contracts / marketplace / 4200 | 1 keeps checks; 6 skips run; no target change |
| oh-story core disk suite, not writing-skill catalog | 7, 8 |
| raw SKILL.md compile, no fiction contract | 9 |
| review report / deslop new version | 10, 11 |
| UI 审稿 / 去AI + 参考分 copy | 12 |
| director schedules skills, omit design lectures | 13 |
| ledger no longer says “integrate more references” | 6 |
| C not implemented | no task |
| humanizer mount point deferred | 6 skip only |

**Placeholders:** none. Install bounds are 64 MiB / 16 MiB. Skill ids and routes are named.

**Types:** `OH_STORY_CORE_SKILL_IDS`, `WRITING_SKILL_HUMANIZE_DEFER_REASON`, `selectFingerprintAdvisoryProse`, `runOhStoryCoreAction({ action: 'review' \| 'deslop' })` are used consistently.
