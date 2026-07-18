# Architecture Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split MangaForge-Studio’s remaining novel-domain monoliths (especially `novel-writing-service` and major web workspace models/tests) into stable, extensible packages without behavior change, while preserving point-SQL performance gains.

**Architecture:** Keep public import paths stable via barrels. Move pure domain code into `novel-writing/*` and orchestration into `novel-writing-service/*`. Keep HTTP routes thin. On web, split models before UI shells. Enforce source contracts and sliced tests after each extraction.

**Tech Stack:** Bun, TypeScript, React, existing bun:test suites.

**Design spec:** `docs/superpowers/specs/2026-07-18-architecture-modularization-design.md`

**Branch:** `codex/architecture-modularization`


## Progress checkpoint (2026-07-18 late, architecture branch)

| Task | Status | Notes |
|---|---|---|
| 0 size contracts | done | hardened hard caps for completed monofiles |
| 1 writing-service scaffold | done | package + route shim |
| 2 quality/review-merge slice | done | under `novel-writing-service/quality/*` |
| 3 post-delivery sync reports | done | quality-sync-reports + carry-over prose-quality extended leaf |
| 4 context/prompt glue | done | service modules extracted |
| 5 monofile barrel-only | done | `monolith.ts` ~91 lines + public surface re-exports |
| 6 monotest split | done | `novel-writing-service.test.ts` shim-only |
| 7 editor/core routes packages | largely done | editor, core, commercial-ops, generation, planning package-split |
| 8 auto-creation model package | largely done | risk multi-leaf + director monotest 4-way split + leaf binding fixes |
| 9 cockpit + repair prompt | largely done | cockpit monotest 4-way; repair monotest 4-way; prompt multi-leaf |
| 10 shell UI split | progressed | NWS ~2.0k multi-factory; remaining large production monofiles open |
| 11 final hardening | open | monotests heavily reduced; smoke/memory still open |

Recent extracts (continued):

- 2026-07-19 night++: delta-sync storyline leaf (~1190 monofile); generate-chapter draft-sync (~1989); knowledge-base package (~590); NovelStudio panels (~1560); workspaceUiShell split. Remaining: NWS/WorkspaceCenter/StoryPlanning/ACD/builders-annotations further, Task 11 smoke/memory.


- 2026-07-19 night+: generate-chapter draft-sync leaf (~1989 monofile); knowledge-base package complete (~590); NovelStudio panels ~1560; workspaceUiShell a/b; multiple monotest halves; soft baselines lowered. - 2026-07-19 goal-continue: generate-chapter full-production-store + prestore-receipt-reviews leaves (~1766 monofile); soft baseline 1850.
- 2026-07-19 goal-continue+: generate-chapter full-production/prestore leaves (~1763); commercial-tools split into repair-queues + diagnostics composition root (~477).
- 2026-07-19 goal-continue++: generate-chapter draft-mode-store leaf (~1500 monofile); commercial diagnostics/repair leaves.
- 2026-07-19 goal-continue+++: builders-annotations prose-quality leaf (~662 monofile); generate-chapter ~1500; commercial-tools ~477.
- 2026-07-19 goal-continue++++: StoryPlanning board panels leaf (~269 monofile); builders-annotations ~663; generate-chapter ~1500; commercial-tools ~477.
- 2026-07-19 goal-continue+++++: ACD monofile barrel + director-workspace-view; StoryPlanning ~244; commercial-tools ~477; generate-chapter ~1500; builders-annotations ~663. Task 11 + NWS/WorkspaceCenter still open.
- 2026-07-19 goal: WorkspaceCenter writing-support leaf (~796 monofile); prior ACD/StoryPlanning/commercial/generate-chapter extracts. Remaining: NWS ~2.0k, generate-chapter mid-loop, Task 11.
Still open: NWS residual composition, WorkspaceCenter/StoryPlanning/ACD/builders-annotations/delta-sync further split, Task 11 full smoke/memory.


- 2026-07-19 continue: generate-chapter post-commit leaf; knowledge-base types/pure/source-cache/analyze package leaves (~1.2k monofile); NovelStudio knowledge-ui-shared; monotest splits (TaskCenter, word-target pipeline, readability review, scene-cards regression); soft baselines tightened. Task 11 still open for full smoke/memory and remaining monofiles (generate-chapter ~2.1k, NovelStudio ~2.3k, NWS ~2.0k, WorkspaceCenter/StoryPlanning/ACD/builders-annotations/delta-sync).

- 2026-07-19 late continue: NovelStudio panels (feed/knowledge/source-cache) ~1.56k; monotest splits safe-batch/admission/word-target; knowledge-base ~1.17k; generate-chapter post-commit done. Remaining: generate-chapter ~2.1k, NWS ~2.0k, WorkspaceCenter/StoryPlanning/ACD/builders-annotations/delta-sync, workspaceUiShell contracts ~2.8k, Task 11 smoke/memory.

- 2026-07-19 night: knowledge-base fully package-split (~590 monofile + types/pure/source-cache/analyze/ingest-state/ingest-runtime); NovelStudio ~1.56k with panels; workspaceUiShell split; more monotest halves. Remaining large: generate-chapter ~2.1k, NWS ~2.0k, WorkspaceCenter/StoryPlanning/ACD/builders-annotations/delta-sync; Task 11 open.
- 2026-07-18 night+: fixed benchmark-structure leaf; NWS down to ~5.5k via commercial/incubator/diff views; monotests heavily sliced.

- 2026-07-18 late night: generate-chapter acceptance-prep leaf; more monotest slices (contracts/memory/craft/receipts/expansion); deferred-surfaces types leaf.

- 2026-07-18 night: NWS longform trends + remaining commercial diagnosis modal views extracted; commercial-result split to ops leaf; AutoCreation/StoryPlanning chrome helpers extracted; expansion/receipts/specialty monotests further sliced.
 director/repair/cockpit/pre-draft/scene-cards monotest splits; NWS diagnostics views + action routers; audience/trends leaf binding fixes; golden-three opening pattern restore.

- 2026-07-18 night: NWS commercial-tools + preflight factories; novel-editor monotest split + leaf import fix; pre-draft monotest further slices; chapter-context contracts package-join post-commit-sync-bundle.

- 2026-07-18 late night+: NWS commercial/preflight/repair factories (NWS ~3.9k); editor+pre-draft+scene-cards monotest splits; chapter-context contracts package-join post-commit-sync-bundle; soft baselines refreshed.

- Also: chapter-context regression monotest split; NWS now ~3.5k.

- 2026-07-19: NWS down to ~3507 via commercial/preflight/repair/action factories; monotests further halved (editor, pre-draft, scene-cards, regression, storyline, production, planning, director-model); delta-sync revision leaf DI + source package joins repaired; Task 11 partial regression green (200+ focused tests).

- 2026-07-19: NWS shell factories expanded further (planning/production/writing-bible/editor/run-queue/chapter-prep/diagnostics/creative + prior commercial/preflight/repair/action/chapter-prose). NWS ~2.0k lines. Shell source contracts green (92). Task 11 still open for full monofile caps + broad regression/smoke/memory.

- 2026-07-19 cont: split director-model.receipts-gates monotest into a/b + shim (previously aborted).

- 2026-07-19 cont: split provider-runtime and chapter-context monotests (core-a/b); receipts-gates split landed. Known pre-existing opening-handoff admission failures remain in chapter-context.core-a (same as pre-split monotest).

- 2026-07-19 late: NWS ~2003 via multi-factory shell extract; monotests split (receipts-gates, provider-runtime, chapter-context core, expansion-default-lane). Remaining large production monofiles: generate-chapter-for-group ~2.3k, NovelStudio/knowledge-base/WorkspaceCenter/StoryPlanning/builders-annotations/delta-sync ~1.7-2.4k. Task 11 full smoke/memory still open.

- 2026-07-19 late+: generate-chapter word-target pure helpers leaf extracted (~2245 monofile).

- 2026-07-19 night: more monotest splits (quality-wiring, scene/chapter contracts, expansion/readability, provider-runtime, receipts-gates, chapter-context core); generate-chapter pure helper leaves. NWS ~2.0k. Task 11 still open.

- 2026-07-19 end-of-session checkpoint: NWS ~2003 with planning/production/writing-bible/editor/run-queue/prep/diagnostics/creative/chapter-prose/preflight/repair/action/commercial factories. generate-chapter pure helper leaves. Large monotests mostly halved (remaining outliers mainly workspaceUiShell source contracts + a few ~1.8-1.9k suites). Task 11 incomplete.

Still open: NWS ~3.4k (commercial/preflight/repair/action/chapter-prose factories done; stepGenerateProse and more remain); generate-chapter-for-group ~2.3k; WorkspaceCenter/ACD/StoryPlanning/builders-annotations ~1.7-1.9k; some monotests still >1.5k; Task 11 full smoke/memory not finished.



---

## Baseline inventory (2026-07-18)

| Priority | Path | Lines (approx) |
|---:|---|---:|
| P0 | `ui/server/src/routes/novel-writing-service.ts` | 48512 |
| P0 | `ui/server/src/routes/novel-writing-service.test.ts` | 62495 |
| P0 | `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts` | 16892 |
| P0 | `.../autoCreationDirectorModel.test.ts` | 17843 |
| P1 | `.../writingCockpitModel.ts` / `.test.ts` | 6372 / 7075 |
| P1 | `.../repairTaskRevisionPrompt.ts` / `.test.ts` | 7816 / 11211 |
| P1 | `ui/web/src/pages/NovelProjectWorkspace.tsx` | 7879 |
| P1 | `.../TaskCenterDrawer.tsx` / `.test.ts` | 6200 / 4267 |
| P2 | `ui/server/src/routes/novel-editor-routes.ts` | 5307 |
| P2 | `ui/server/src/routes/novel-core-routes.ts` | 3911 |
| P2 | `.../planningWorkspaceModel.ts` / related | 4404+ |

Already healthy reference pattern:
- `ui/server/src/novel/` SQL repos package
- `ui/server/src/novel-writing/*` domain modules

---

## File map (target)

### Server writing

| Path | Responsibility |
|---|---|
| `ui/server/src/novel-writing-service/index.ts` | Public barrel (compat with old import path) |
| `ui/server/src/novel-writing-service/types.ts` | Shared orchestrator types |
| `ui/server/src/novel-writing-service/quality/*` | quality scan glue, review merge, receipt gates |
| `ui/server/src/novel-writing-service/context/*` | context compile / contract section builders still in orchestrator |
| `ui/server/src/novel-writing-service/post-delivery/*` | story-state/handoff/sync reports |
| `ui/server/src/novel-writing-service/revision/*` | revision artifact merges |
| `ui/server/src/novel-writing-service/batch-serial/*` | serial/batch briefs |
| `ui/server/src/routes/novel-writing-service.ts` | Temporary re-export shim → delete when callers migrated |
| `ui/server/src/novel-writing-service/**/*.test.ts` | Sliced tests |

### Server routes packages

| Path | Responsibility |
|---|---|
| `ui/server/src/routes/novel-editor/*` | editor route handlers split by resource |
| `ui/server/src/routes/novel-core/*` | project/core route handlers |
| `ui/server/src/routes/novel-editor-routes.ts` | register/barrel only |

### Web

| Path | Responsibility |
|---|---|
| `ui/web/src/pages/novel-workspace/auto-creation/model/*` | director model slices |
| `ui/web/src/pages/novel-workspace/writing-cockpit/model/*` | cockpit model slices |
| `ui/web/src/pages/novel-workspace/planning/model/*` | planning model slices |
| `ui/web/src/pages/novel-workspace/shell/*` | workspace shell sections |
| `ui/web/src/pages/novel-workspace/task-center/*` | task center UI/model |

---

### Task 0: Branch hygiene + size contracts

**Files:**
- Create: `ui/server/src/architecture-modularization-contract.test.ts`
- Create/Modify: docs already added

- [ ] **Step 1: Confirm branch**

```bash
git checkout codex/architecture-modularization
git status -sb
```

- [ ] **Step 2: Add failing/locking size contracts for P0 files**

Create `ui/server/src/architecture-modularization-contract.test.ts` that:
1. Records current P0 paths exist
2. Asserts production novel package still forbids `mutateNovelStore`
3. Provides helper to measure line counts (baseline snapshot)

Initial assertions can lock “no growth beyond baseline + small epsilon” for monofiles during extraction, then later tighten to hard caps.

- [ ] **Step 3: Run contract**

```bash
cd ui/server && bun test src/architecture-modularization-contract.test.ts src/novel/mutation-contract.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-07-18-architecture-modularization-design.md \
  docs/superpowers/plans/2026-07-18-architecture-modularization.md \
  ui/server/src/architecture-modularization-contract.test.ts
git commit -m "docs(architecture): add modularization design, plan, and size contracts"
```

---

### Task 1: Scaffold `novel-writing-service/` package with zero behavior change

**Files:**
- Create: `ui/server/src/novel-writing-service/index.ts`
- Create: `ui/server/src/novel-writing-service/types.ts` (if types are extractable cleanly)
- Modify: `ui/server/src/routes/novel-writing-service.ts` → re-export from package once move starts
- Test: existing `novel-writing-service.quality-wiring.test.ts` + a tiny import smoke

- [ ] **Step 1: Create package folder and barrel**

```bash
mkdir -p ui/server/src/novel-writing-service/{quality,context,post-delivery,revision,batch-serial}
```

- [ ] **Step 2: First move pure leaf helpers (behavior-preserving)**

Move a small, already-exported leaf group first, recommended:
- review check helpers: `hasFailingReviewChecks`, `hasReviewChecksNeedingRepair`
- deterministic word count guard
- formatAdmissionError

Place under `novel-writing-service/quality/` or existing `novel-writing/` if purely domain.

- [ ] **Step 3: Keep old path working**

`ui/server/src/routes/novel-writing-service.ts` must still export the same names (re-export).

- [ ] **Step 4: Verify**

```bash
cd ui/server && bun test src/routes/novel-writing-service.quality-wiring.test.ts src/architecture-modularization-contract.test.ts
```

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(writing-service): scaffold package and extract first leaf helpers"
```

---

### Task 2: Extract quality-gate / review-merge slice

**Files:**
- Create: `ui/server/src/novel-writing-service/quality/review-merge.ts`
- Create: `ui/server/src/novel-writing-service/quality/receipt-gates.ts`
- Modify: monofile imports
- Test: extract matching tests from monotest when practical; otherwise keep monotest green

Target symbols (starting set):
- `mergeQualityRecheckReviewWithStructuredEvidence`
- `mergeStructuredReviewFillPayload`
- `mergePostDeliveryReceiptSyncIntoQualityGateReview`
- `applyDeterministicWordCountIssueGuard`
- related private helpers only used by these

- [ ] **Step 1: Copy helpers with identical implementation**
- [ ] **Step 2: Re-export from package index and monofile shim**
- [ ] **Step 3: Run focused tests**

```bash
cd ui/server && bun test src/routes/novel-writing-service.quality-wiring.test.ts src/novel-writing/prose-quality-loop.test.ts
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(writing-service): extract quality review merge and receipt gates"
```

---

### Task 3: Extract post-delivery sync reports

**Files:**
- Create: `ui/server/src/novel-writing-service/post-delivery/*`
- Move `build*SyncReport` family and handoff/story-state report builders still stuck in monofile

- [ ] **Step 1: Inventory exports matching `SyncReport|Handoff|StoryState`**
- [ ] **Step 2: Move pure builders first**
- [ ] **Step 3: Verify no circular import with `novel-writing/*`**
- [ ] **Step 4: Test + commit**

```bash
cd ui/server && bun test src/novel-writing/post-delivery-story-state-update.test.ts src/routes/novel-writing-service.quality-wiring.test.ts
git commit -m "refactor(writing-service): extract post-delivery sync report builders"
```

---

### Task 4: Extract context/prompt compile glue

**Files:**
- Create: `ui/server/src/novel-writing-service/context/*`
- Prefer delegating to existing `novel-writing/prose-generation-prompt-sections.ts` etc.

Target:
- `compileParagraphProseContext`
- `prepareProseGenerationContract`
- `scanProseForQualityLoop` glue (if still wrapper-only)

- [ ] **Step 1: Move wrappers only; do not rewrite prompt text**
- [ ] **Step 2: Run prompt/quality tests**

```bash
cd ui/server && bun test src/novel-writing/prose-generation-prompt-sections.test.ts src/novel-writing/prose-quality-loop.test.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(writing-service): extract prose context and generation contract glue"
```

---

### Task 5: Extract revision + batch/serial leftovers, shrink monofile to barrel

**Files:**
- `novel-writing-service/revision/*`
- `novel-writing-service/batch-serial/*`
- Convert `routes/novel-writing-service.ts` into pure re-export

- [ ] **Step 1: Move remaining exported functions in dependency order**
- [ ] **Step 2: Ensure monofile < 100 lines or deleted after updating imports**
- [ ] **Step 3: Broad writing-service smoke**

```bash
cd ui/server && bun test src/novel-writing src/routes/novel-writing-service.quality-wiring.test.ts src/novel/mutation-contract.test.ts
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(writing-service): finish package extraction and barrel-only route path"
```

---

### Task 6: Split `novel-writing-service.test.ts` monotest

**Files:**
- Create sliced tests under `ui/server/src/novel-writing-service/` and/or domain folders
- Replace monotest with shim importing slices (short-term) or delete after path updates

Method:
1. Parse top-level `describe(...)` names and line ranges
2. Move one describe group per commit when possible
3. Shared fixtures → `novel-writing-service/test-utils.ts`

Priority describe groups:
- quality / admission / handoff / story-state / generation contract / revision

- [ ] **Step 1: Generate describe inventory script output into `/tmp` or docs note**
- [ ] **Step 2: Move first 1–2 describe groups + keep shim green**
- [ ] **Step 3: Continue until monotest is shim-only**
- [ ] **Step 4: Commit per group or per day-sized batch**

```bash
cd ui/server && bun test src/novel-writing-service src/routes/novel-writing-service.test.ts
```

Expected: pass; monotest lines trend to ~tens.

---

### Task 7: Split large server route modules

Order:
1. `novel-editor-routes.ts`
2. `novel-core-routes.ts`
3. `novel-generation-routes.ts` / `novel-planning-routes.ts` / `novel-commercial-ops-routes.ts` as capacity allows

Pattern:
- `routes/novel-editor/index.ts` register
- `routes/novel-editor/<resource>.ts` handlers
- keep `routes/novel-editor-routes.ts` as re-export for compatibility

- [ ] **Step 1: Editor routes package scaffold**
- [ ] **Step 2: Move handlers without logic change**
- [ ] **Step 3: Run**

```bash
cd ui/server && bun test src/routes/novel-editor-routes.test.ts src/routes/novel-core-routes.test.ts
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(routes): package-split novel editor and core routes"
```

---

### Task 8: Web auto-creation model package

**Files:**
- Create: `ui/web/src/pages/novel-workspace/auto-creation/model/*`
- Move from `autoCreationDirectorModel.ts`
- Split tests accordingly

Suggested slices:
- types/status enums
- selectors
- pipeline/guardrail builders
- action planning
- barrel `index.ts` re-exporting previous public names

- [ ] **Step 1: Create model package barrel with re-exports**
- [ ] **Step 2: Extract types first**
- [ ] **Step 3: Extract pure selectors/builders**
- [ ] **Step 4: Move tests by describe**
- [ ] **Step 5: Verify**

```bash
cd ui/web && bun test src/pages/novel-workspace/autoCreationDirectorModel.test.ts
# or new package test path once moved
```

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(web): split autoCreationDirectorModel into package"
```

---

### Task 9: Web writing cockpit + repair prompt packages

**Files:**
- `writing-cockpit/model/*`
- `repair-task/*` or `writing-cockpit/repair/*`
- corresponding tests

- [ ] **Step 1: writingCockpitModel split (types → selectors → builders)**
- [ ] **Step 2: repairTaskRevisionPrompt split**
- [ ] **Step 3: tests sliced + green**
- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): split writing cockpit model and repair prompt modules"
```

---

### Task 10: Web shell UI split (NovelProjectWorkspace / TaskCenter / panels)

**Files:**
- `shell/*`, `task-center/*`, panel subcomponents

Rules:
- No behavior change
- Pass props explicitly; avoid new global stores unless already present
- Keep page entry files as composition roots

- [ ] **Step 1: Extract presentational sections first**
- [ ] **Step 2: Extract hooks/state islands second**
- [ ] **Step 3: Run workspace UI tests**

```bash
cd ui/web && bun test src/pages/novel-workspace/workspaceUiShell.test.ts src/pages/novel-workspace/TaskCenterDrawer.test.ts
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): split workspace shell and task center UI modules"
```

---

### Task 11: Final hardening and acceptance

- [ ] **Step 1: Tighten size contracts to hard caps for completed areas**
- [ ] **Step 2: Run broad regression**

```bash
cd ui/server && bun test src/novel src/novel-writing src/novel-writing-service src/routes/novel-writing-service.quality-wiring.test.ts src/routes/novel-core-routes.test.ts src/routes/novel-generation-routes.test.ts
cd ui/web && bun test src/pages/novel-workspace
```

- [ ] **Step 3: Manual smoke**
  - open project
  - load written chapter prose
  - generate/write one chapter path
  - open task center / writing cockpit
  - create-wizard open only (no need full create)

- [ ] **Step 4: Memory check**
  - write chapter stays near idle band (no multi-hundred MB rewrite spike)

- [ ] **Step 5: Final commit + PR notes**

```bash
git commit -m "refactor(architecture): complete modularization phase hardening"
```

---

## Implementation notes for agents

1. **Move first, clean later.** No prompt/rule rewrites in extraction commits.  
2. Prefer existing `novel-writing/*` modules; do not duplicate them inside `novel-writing-service`.  
3. If a helper is pure domain, put it in `novel-writing/`. If it orchestrates many domains, put it in `novel-writing-service/`.  
4. Keep `export *` barrels temporary; explicit exports are better when a package stabilizes.  
5. For 60k test files, use describe-range extraction scripts; never hand-split blindly without inventory.  
6. Do not commit `workspace/providers.json`.  
7. Commit frequently; one domain slice per commit when possible.  
8. If blocked by circular deps, introduce `types.ts` and invert imports rather than merging files again.

---

## Phase exit checklist

### Phase B/C (server writing) done when
- [ ] monofile orchestrator is barrel-only or removed
- [ ] monotest is shim-only or removed
- [ ] quality/post-delivery/context tests pass independently

### Phase D done when
- [ ] editor/core routes packages exist and old paths re-export

### Phase E done when
- [ ] auto-creation + writing cockpit models are packages under hard caps

### Branch done when
- [ ] success criteria in design doc checked
- [ ] smoke + memory notes recorded in PR/plan status

---

## Suggested first execution command block

```bash
git checkout codex/architecture-modularization
cd ui/server && bun test src/novel/mutation-contract.test.ts src/novel/sqlite-persistence.test.ts
# then implement Task 0 contracts and Task 1 scaffold
```

## Progress log (agent)

- 2026-07-18 late: drawer-recovery-evidence; support-delivery-closure-specialty; serial-momentum-states-extended

- 2026-07-18 night: delivery-risk-carry-over prose-quality leaf; prompt-lines-quality; NWS workspace-area-view extract; source contracts package-join for NWS monofile reads

- 2026-07-18 evening: prompt-lines, planning boards/desks, drawer-safe-batch, serial-momentum gap-runs, NWS commercial-result + serial-pipeline extracts; verification ~422 pass focused suite
- 2026-07-18: drawer-safe-batch, repair prompt-lines, planning boards leaves extracted
- 2026-07-18: serial-momentum gap-runs leaf extracted (~2554 + ~693); planning builder desks leaf (~2979 + ~861); NWS shell editor-fields + story-state helper; source contracts updated


- 2026-07-18: writing-service package scaffolded; quality leaf helpers extracted
- 2026-07-18: review-fill / revision-artifacts / missing-checks / context-contract / prose-expansion extracted
- 2026-07-18: batch-serial serial-momentum (~4.2k) extracted
- 2026-07-18: post-delivery asset-banks extracted
- monofile size trend: 48512 → ~42050 lines

- 2026-07-18 late: chapter-context monotest 5-way split; unattended source-contract package join.

- 2026-07-18 late+: prose-word-target + readability-meme monotest splits; serial-momentum/quality-sync leaf import repairs.

- 2026-07-18 cont: post-commit-sync-bundle; scene-card-delivery-risk-apply leaf; builders-annotations-delivery-risk; NWS first30/style-sample views; generate-chapter ~2.4k.
