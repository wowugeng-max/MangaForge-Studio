# Architecture Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split MangaForge-Studio’s remaining novel-domain monoliths (especially `novel-writing-service` and major web workspace models/tests) into stable, extensible packages without behavior change, while preserving point-SQL performance gains.

**Architecture:** Keep public import paths stable via barrels. Move pure domain code into `novel-writing/*` and orchestration into `novel-writing-service/*`. Keep HTTP routes thin. On web, split models before UI shells. Enforce source contracts and sliced tests after each extraction.

**Tech Stack:** Bun, TypeScript, React, existing bun:test suites.

**Design spec:** `docs/superpowers/specs/2026-07-18-architecture-modularization-design.md`

**Branch:** `codex/architecture-modularization`





### Residual inventory update (2026-07-19 goal-continue XXXI)
- Split useStudioKnowledgePanelsController into source-cache (~134) + feed (~722) + compose (~364).
- Still deferred ≥1k production: provider-runtime DI (~1778), NWS view composition (~1593).
- Split scene-card-delivery-risk-apply package. Task 11 full UI write-path click smoke still open; focused build of novel-studio package green.
- Split scene-card-delivery-risk-apply into apply barrel (~14) + context (~349) + card (~979).


### Residual inventory update (2026-07-19 goal-continue XXX)
- Committed paragraph-prose-context prepare/sections package (compose ~218).
- Extracted prose-self-review-run-deterministic (~492); cleaned dead imports in methods/policy/prompts; run ~777.
- Split helpers-batch-risk-radar-compute into compute (~553) + guards (~579); shell source joins both.
- Extracted auto-repair-preflight materials leaf (~520); methods ~683.
- GenerateNode pure model leaf (~344) + component (~719).
- Still deferred ≥1k: provider-runtime (~1778 DI), NWS view (~1593 composition), knowledge panels (~1132). shared target-actions fixtures leaf; monotest a/b under soft 1k. Task11 sample green (server 85 + web 63 focused).
- Task 11 full UI write-path click smoke still open.

### Residual inventory update (2026-07-19 goal-continue XXIX)

Landed:
- `helpers-batch-risk-radar` package: thin monofile (~188) + compute (~1095) + signals (~495); package-join updated

Task 11 focused: director memory-batch + expansion-guardrails + shell.b **90 pass**

Still deferred ≥1k: provider-runtime, NWS view, paragraph-prose-context, knowledge panels, auto-repair-preflight, risk-radar-compute leaf, prose-self-review-run leaf.

### Residual inventory update (2026-07-19 goal-continue XXVIII)

Landed:
- `prose-self-review` package: methods barrel (~319) + prompts (~621) + policy (~412) + run (~1029)
- Source-contract tests package-join all 4 leaves; methods return composes runner without early `const run...` shadowing
- Soft baselines for self-review leaves; package-join fixes for specialty risks + unattended register-chapter-groups in focused tests

Task 11 focused: contracts-a + word-target-a + regression + architecture **110 pass**

Still deferred ≥1k: provider-runtime, NWS view, paragraph-prose-context, helpers-batch-risk-radar, knowledge panels, auto-repair-preflight; run leaf still ~1029.

### Residual inventory update (2026-07-19 goal-continue XXVII)

Landed:
- `llm/executor` reverse-free helpers extract: monofile **628** + `executor-helpers` **475**; soft baselines added
- monotest inventory: **0** non-shim suites ≥1000 (except target-actions-a ~1007 with only 2 huge tests)

Task 11: architecture+executor **10 pass**; expansion-guardrails **17 pass** after deep-repair binding move.
- Broader sample: server **164 pass** (architecture/core/annotations/post-delivery/executor/prose-quality-loop); web **179 pass** (shell a/b, memory-batch, expansion-guardrails, planning).
- API smoke projects/chapters **200**; vite **200**; idle server RSS **~170MB**; architecture still forbids full-store rewrite API.

Still deferred ≥1k production: provider-runtime, NWS view, prose-self-review factory, paragraph-prose-context, helpers-batch-risk-radar, knowledge panels, auto-repair-preflight. Full write-path UI click smoke still open.

### Residual inventory update (2026-07-19 goal-continue XXVI)

Landed:
- binding repair: move `recoveryEvidenceDeepRepairAction` into recovery-evidence-trends-core (effects imports it; core no longer unbound)
- Batch monotest halves: **73** single-describe suites ≥1k split to a/b leaves
- Multi-describe packages split: post-delivery-sync-a, prose-quality-loop, novel-core-routes (large seed describe halved)
- Result: **0** non-shim monotest files remain ≥1000 lines under `ui/`

Task 11 sample: novel-core-routes **40 pass**; architecture+post-delivery-sync-a+prose-quality-loop earlier batch **141 pass**.

Still deferred production monofiles ≥1k: provider-runtime, NWS view, prose-self-review factory, paragraph-prose-context, helpers-batch-risk-radar, knowledge panels, auto-repair-preflight, executor. Full write-path UI click smoke still open.

### Residual inventory update (2026-07-19 goal-continue XXV)

Landed monotest halves: workspaceUiShell.b; director receipts-gates-a; prose-word-target + regression.

Task 11: shell.b+receipts **61 pass**; word-target suites **82 pass**. Production monofiles still ≥1000: provider-runtime, NWS view, prose-self-review factory, paragraph-prose-context, helpers-batch-risk-radar, knowledge panels, auto-repair-preflight, executor. Full write-path UI click smoke still open.

### Residual inventory update (2026-07-19 goal-continue XXIV)

Landed:
- monotest halves: writingCockpit planning / writingRecommendation / repairTaskRevisionPrompt main; server chapter-context handoff / pre-draft sync-audience-b / scene-cards.b
- binding repair: `serial-momentum-briefs-expectation` imports `parseJsonLikePayload` (was ReferenceError on reader expectation debt path)

Task 11 focused: server monotest batch **127 pass** after binding fix; prior XXIII web/server/API smoke still valid. Idle server RSS ~165MB. Full UI write-path click smoke still open (vite :5173 up).

Still deferred: provider-runtime DI, NWS composition root, prose-self-review factory, helpers-batch-risk-radar single builder, paragraph-prose-context, knowledge panels controller, auto-repair-preflight factory.

### Residual inventory update (2026-07-19 goal-continue XXIII)

Landed:
- monotest halves: `director-model.memory-batch-blocks` a/b; `director-model.expansion-structure` a/b; `repairTaskRevisionPrompt.contracts-open` a/b
- Prior XXII: director drawer package + handoff shared binding fix

Task 11 focused (this turn):
- web: shell a/b + director a/memory-batch/blocks/expansion **182 pass**
- server: architecture + core-routes (+seed suites in batch) **103 pass**; annotations-surface + post-delivery-sync-a **69 pass**
- contracts-open **12 pass**
- API smoke: GET /api/novel/projects **200** (2 projects); project 3 chapters **30**, prose **25**, ch1 **5910** chars
- Memory: server pid 61421 idle RSS **~165MB** (168480 KB) on :8787; architecture contracts still forbid full-store rewrite API
- Full UI write-path / create-wizard click smoke still open

Still deferred production residuals: provider-runtime DI (~1778), NWS composition root (~1593 mostly handlers), prose-self-review factory (~1496), helpers-batch-risk-radar single builder (~1278), paragraph-prose-context, useStudioKnowledgePanelsController (~1132), auto-repair-preflight factory.

### Residual inventory update (2026-07-19 goal-continue XXII)

Landed:
- Director drawer package split: barrel ~54 + core/ops/continuity/batch leaves; package-join lists all leaves
- monotest half: `director-model.memory-batch` shim → a (~837) + b (~974)
- binding repair: extract `helpers-batch-handoff-launch-shared` (`chapterHandoffDetail` / `uniqueTextItems` / `deliveryRiskStagedActions`); compass imports shared; queue keeps DI to compass without cycle

Task 11 focused: architecture contract 6 pass; director memory-batch+a 52 pass; shell a/b 92 pass; drawer/shared import smoke green.

Still deferred: provider-runtime DI, NWS composition root (~1593), prose-self-review factory, helpers-batch-risk-radar, paragraph-prose-context, useStudioKnowledgePanelsController thinning, full write-path UI smoke/memory.

### Residual inventory update (2026-07-19 goal-continue XXI)

Landed:
- `useNovelStudioController` → thin lobby shell (~90) + `useStudioKnowledgePanelsController` (~1133 knowledge/source/feed panels)
- Prior XX: acceptance desk admissionCommon collapse; delivery-risk extended-assets a/b

Task 11 focused: server 115 pass (architecture+post-delivery-a+annotations-surface+core-routes); web 91 pass (CreateWizard+cockpit planning+shell a). Idle server RSS ~69MB.

API smoke (2026-07-19 XXI): GET /api/novel/projects OK; project 3 has 30 chapters, 25 with nonempty chapter_text (ch1~5910 chars). Idle RSS ~69MB. Full UI write-path / create-wizard click smoke still open.

Still deferred: provider-runtime, NWS composition root, prose-self-review factory, director drawer, helpers-batch-risk-radar, paragraph-prose-context, further panel hook thinning, full write-path UI smoke/memory.

### Residual inventory update (2026-07-19 goal-continue XX)

Landed:
- `cockpit-acceptance-desk-chapter`: collapse duplicated acceptance return arms onto `admissionCommon` (~1009 → ~586), behavior preserved
- `delivery-risk-carry-over-prose-quality-extended-assets` → a/b leaves + thin barrel
- Prior XIX: delivery-risk core/mid + core-handoff live DI bindings; package-join order-safe tests

Task 11 focused: post-delivery-sync a/b + architecture **86 pass**; writingCockpit quality/planning/target-actions **87 pass**.

Still deferred: provider-runtime, NWS composition root ~1593, prose-self-review factory, director drawer, useNovelStudioController ~1215, helpers-batch-risk-radar, paragraph-prose-context, auto-repair factory; full write-path UI smoke/memory.

### Residual inventory update (2026-07-19 goal-continue XIX)

Landed:
- `delivery-risk-carry-over-prose-quality` → core/mid + extended assets/craft barrels
- Binding repair: `core-handoff-sync-reports` export private normalizers + live DI deps into extended (fixes monofile split `export *` local-binding gap)
- Prior XVIII: CreateWizard controller + prose-quality annotations leaves

Task 11: post-delivery-sync a/b **78 pass**; 2 pre-existing source-order contract fails in story-unit package-join (`prepareStoryStateUpdate` / `chapter_patch` search), unrelated to this extract. Architecture + annotations + CreateWizard + shell batches green earlier.

Still deferred: provider-runtime DI, NWS composition root, prose-self-review factory, director drawer, useNovelStudioController feed/knowledge intertwine, single-function giants (paragraph-prose-context, helpers-batch-risk-radar), full write-path UI smoke.

Memory: server :8787 idle RSS ~69MB (earlier sample).

### Residual inventory update (2026-07-19 goal-continue XVIII)

Landed reverse-free package splits:
- `NovelCreateWizard` → `useCreateWizardController` (~653 view / ~905 controller); flow test package-joins controller
- `builders-annotations-prose-quality` → types + core/craft/audience leaves (~35 barrel); editor annotations package-joins updated
- Soft baseline: `routes/novel-editor/builders-annotations-prose-quality.ts` = 50

Task 11 focused batch: **193 pass / 0 fail** (architecture 6, annotations-surface 12, annotations-repair-a, core-routes, setting-routes, CreateWizard flow 2, workspace shell a/b).

Still open / deferred (DI or single giant function / composition root):
- `provider-runtime.ts` ~1778 (explicit DI plan; out of mechanical main path)
- `NovelProjectWorkspaceView.tsx` ~1593 composition root
- `prose-self-review-methods.ts` ~1496 factory
- `director-workspace-detail-drawer.tsx` ~1413
- `useNovelStudioController.tsx` ~1215 (knowledge/feed/source intertwined)
- single-function giants: paragraph-prose-context, helpers-batch-risk-radar, delivery-risk carry-over leaves, auto-repair factory
- Full write-path UI smoke + live memory note still open

Memory snapshot (2026-07-19 XVIII): existing server :8787 pid 61421 idle RSS ~69MB; architecture contracts still forbid full-store rewrite API; full write-path UI smoke still open.

### Residual inventory update (2026-07-19 goal-continue XVII)

Landed reverse-free splits:
- `planning-workspace-builder` → primitives/model (+ listLength import from radar)
- `cockpit-acceptance-sync-b` → intent-attraction/drive-style/retention-volume/delivery-risk
- `writing-recommendation-types` → actions/delivery/pre-draft/draft-brief
- `support-normalize-repairs-audit` → quality-deslop/revision/residuals/pre-draft-state
- `novel-setting-helpers` → shared/agent-prompts/relationship/agent-usage/state-assets

- `prose-quality-loop` → core/prompts/run
- `builders-seed-materialize` → helpers/run

Task 11 focused batch: **277 pass / 0 fail** (+ prose-quality-loop 38 pass) (architecture, setting-routes, planning a/b, shell a/b, writingRecommendation, TaskCenter, CreateWizard, character-card, closed-beat).

Still open:
- DI/single-function/composition roots: provider-runtime, NWS view, prose-self-review factory, detail drawer, CreateWizard, paragraph-prose-context, batch-risk-radar, delivery-risk carry-over, auto-repair, studio controller, cockpit-acceptance-desk-chapter
- Full write-path UI smoke


### Residual inventory update (2026-07-19 goal-continue XVI)

Additional reverse-free web splits:
- writing-cockpit `types` → core/acceptance/workflow
- `planning-workspace-builder-signals` → reader/volume/fatigue/pressure/story-unit
- task-center `drawer-model` → tags + helpers basics/quality/repair/batch

Focused regressions green (TaskCenter core/safe-batch, workspace shell).

### Residual inventory update (2026-07-19 goal-continue XV)

Landed reverse-free package splits + cross-leaf binding repairs:
- `task-center/drawer-snapshots` → lane/structure/policy (+ package-join)
- `character-card-sync` → shared/name/identity
- `quality-sync-reports-extended-arcs` → emotional-character/attraction-innovation/story-unit-volume/runway
- `chapter-plan-from-prose` → core/patches
- `craft-tension-contracts` → deps + emotional/chapter-hook/paragraph-hook/suspense/reversal/showdown/bridge
- `audience-quality-contracts` → deps + info-expectation/concept-scans/quality-audit/story-loop/target-reader/genre/female
- Binding repairs: closed-beat `uniqueBlocked`/`shouldSuppressOpenHook`, progress-ledger `isCleanProgressPhrase`, plot-opening opening consts

Task 11 focused regression: **211 pass / 0 fail** (architecture, character-card, closed-beat, progress-ledger, chapter-plan, pre-draft sync-core/audience, TaskCenter safe-batch a/b, workspace shell a/b, CreateWizard flow).

Still open / deferred (DI or single giant function / composition root):
- `provider-runtime.ts` ~1778 (explicit DI plan; out of mechanical main path)
- `NovelProjectWorkspaceView.tsx` ~1593 composition root
- `prose-self-review-methods.ts` ~1496 factory
- `director-workspace-detail-drawer.tsx` ~1413
- `NovelCreateWizard.tsx` ~1381 (partially thinned)
- single-function giants: paragraph-prose-context, helpers-batch-risk-radar, builders-annotations-prose-quality, delivery-risk carry-over, auto-repair factory, llm executor
- `useNovelStudioController.tsx` ~1215
- Full write-path UI smoke + live memory note still open

Memory snapshot (2026-07-19): existing server on :8787 pid 61421 RSS ~43MB idle (no write-path load in this sample). Architecture contracts still forbid full-store rewrite API.

### Residual inventory update (2026-07-19 goal-continue XIII–XIV)

Landed reverse-free splits + leaf binding fixes:
- `serial-momentum-briefs` → core/quality/expectation (+ `normalizedMatchText` import fix)
- `prose-generation-prompt-sections` → shared/prep/hooks/craft/governance
- `chapter-progress-ledger` → core/resync
- `cockpit-acceptance-desk-builders` → story-state/hidden/chapter
- `pre-draft-brief` → bind/build/merge
- Create wizard: restore missing leaf exports; extract `createWizardPayloadUtils`
- `memory-longform-contracts-brief`: import `OH_STORY_NEXT_BATCH_WORKFLOW_RULES` from battle leaf
- Soft baselines tightened for new barrels; focused pre-draft/sync-core + shell + architecture green

Additional landed (XIV): quality-sync craft bridge/prose/punctuation; scene-card-delivery-risk bind/actions; memory-service types/runtime/agent; closed-beat-canon shared/detect/live/gates; chapter-blueprint-execution basics/checks/scans.

### Task 11 progress (2026-07-19 goal-continue)

Focused regression green: **261 tests / 0 fail** across architecture contracts, run/setting/bible routes, serial-momentum, readability pipeline-a, pre-draft sync-core-a, prompt-sections, workspace shell a/b, CreateWizard flow, cockpit planning, TaskCenter safe-batch-a.

Still open: full write-path UI smoke + memory note; residual composition roots and DI-heavy monofiles (`provider-runtime`, audience/craft, NWS view, studio controller, giant single-function leaves).

Still open for Task 11:
- Residual composition roots (`NovelProjectWorkspaceView`, `useNovelStudioController`, `provider-runtime`, audience/craft monofiles)
- Full write-path UI smoke / memory notes

### Residual inventory (2026-07-19 end of goal-continue arc)

Still large / DI-heavy (defer mechanical split):
- `provider-runtime.ts` ~1778
- `craft-tension-contracts.ts` / `audience-quality-contracts.ts` ~1.5–1.6k
- `NovelProjectWorkspaceView.tsx` ~1593 composition root
- `prose-self-review-methods.ts` ~1496 factory
- `director-workspace-detail-drawer.tsx` ~1413
- `NovelCreateWizard.tsx` ~1381 (partially thinned)
- single-function giants: `paragraph-prose-context`, `helpers-batch-risk-radar`, `builders-annotations-prose-quality`, delivery-risk carry-over, auto-repair factory, llm executor

Landed this arc (selection): serial-momentum-briefs, prose-generation-prompt-sections, chapter-progress-ledger, cockpit acceptance desk, pre-draft-brief, create wizard export restore + payload utils, quality-sync craft, scene-card-delivery-risk, memory-service, closed-beat-canon, chapter-blueprint-execution, state-tracking-contracts, novel-generation/planning register, character-asset, audience risks, plot-opening, delta receipts.

Task 11: focused **261** tests green earlier; architecture + pre-draft sync-core + prompt sections + CreateWizard green after latest leaf fixes. Full write-path UI smoke/memory still open.

### Residual inventory (still above ~1k, 2026-07-19)

Keep reverse-free only; do not mechanical-split packages that share private helpers/constants (audience/craft/audit lesson).

- `NovelProjectWorkspaceView.tsx` ~1764 (composition + workspaceViewDeps)
- `useNovelStudioController.tsx` ~1256
- `repair-task/prompt-lines-quality.ts` ~1805
- domain quality/post-delivery/auto-creation helpers still >1k (list via `find ... | wc -l`)
- Task11: focused 173+ tests green; server boot RSS ~111MB; full write-path UI smoke still open


## Progress checkpoint (2026-07-19 architecture continuation)

| Area | Status | Notes |
|---|---|---|
| writing-service monofile barrel | done | ~91 lines |
| writing monotest shim | done | shim-only |
| editor/core route packages | done | builders thinned; seed multi-leaf; editor delivery/revision leaves |
| generate-chapter composition | largely done | ~703 under soft baseline 750 |
| Web shell packages | advanced | NWS UI-state + view-props builders; cockpit/planning/writing-support/studio splits |
| Focused regression | green | 211+ modularization-related tests this arc; shell 92 green |
| Task 11 smoke/memory | partial | server boot on :8787; idle RSS ~111MB; full write-path UI smoke still open |
| Residual >1k | open | NWS view ~1764 composition; domain quality/post-delivery leaves; NovelStudio controller ~1256 |


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
| 10 shell UI split | largely done | NWS/ACD/deferred barrels; ACD view ~383 + detail drawer; NWS view residual ~2.0k |
| 11 final hardening | progressed | architecture contracts + focused novel/web suites green; pre-existing opening-handoff runtime fails; live smoke still manual |

Recent extracts (continued):

- 2026-07-19: writingRecommendationModelSource package-join; ACD/generate-chapter/writingRecommendation extracts landed. Design success: writing monofile barrel 91; generate-chapter 703; ACD view 383; writingRecommendation barrel 21. Open: NWS view residual ~2003, Task11 manual smoke/memory.

- 2026-07-19 goal-continue: generate-chapter context/scene + draft leaves (~703); ACD view derived+detail-drawer (~383 view); writingRecommendationModel package-split (types/draft-brief/core + barrel). Soft baseline generate-chapter 750. Task11 focused suites green; manual smoke/memory still open. NWS view residual ~2.0k composition root remains.

- 2026-07-19 goal: generate-chapter context/scene-cards + draft-prose leaves (~703 monofile, soft baseline 750); package-joins updated. Remaining: NWS view residual, WorkspaceCenter residual, Task 11 live smoke.

- 2026-07-19 Task11 partial: architecture contracts green; chapter-context contracts/handoff green (opening-handoff runtime failures pre-existing); storyline a/b green after delta-sync leaf binding fix; workspaceUiShell a/b 92 pass. Monofile sizes: generate-chapter ~982, delta-sync ~210, NWS barrel 2 / view ~2003, deferred-surfaces barrel 2, WorkspaceCenter ~793. Memory: module load of generate-chapter + delta-sync remains stable in bun tests (no full-store rewrite path). Remaining optional residual composition (NWS view handler wiring, WorkspaceCenter toolbar) and full smoke against live app UI.

- 2026-07-19 goal: delta-sync receipt builders leaf (~208 monofile + receipts/storyline/revision); generate-chapter mid-pipeline earlier.

- 2026-07-19 goal: deferred-surfaces barrel + view leaf; generate-chapter mid-pipeline editor-meme-polish + quality-prestore leaves (~982 monofile, soft baseline 1050); package-join contracts updated. Remaining: NWS view residual, WorkspaceCenter residual, delta-sync further, Task 11 smoke/memory.

- 2026-07-19 night++: delta-sync storyline leaf (~1190 monofile); generate-chapter draft-sync (~1989); knowledge-base package (~590); NovelStudio panels (~1560); workspaceUiShell split. Remaining: NWS/WorkspaceCenter/StoryPlanning/ACD/builders-annotations further, Task 11 smoke/memory.


- 2026-07-19 night+: generate-chapter draft-sync leaf (~1989 monofile); knowledge-base package complete (~590); NovelStudio panels ~1560; workspaceUiShell a/b; multiple monotest halves; soft baselines lowered. - 2026-07-19 goal-continue: generate-chapter full-production-store + prestore-receipt-reviews leaves (~1766 monofile); soft baseline 1850.
- 2026-07-19 goal-continue+: generate-chapter full-production/prestore leaves (~1763); commercial-tools split into repair-queues + diagnostics composition root (~477).
- 2026-07-19 goal-continue++: generate-chapter draft-mode-store leaf (~1500 monofile); commercial diagnostics/repair leaves.
- 2026-07-19 goal-continue+++: builders-annotations prose-quality leaf (~662 monofile); generate-chapter ~1500; commercial-tools ~477.
- 2026-07-19 goal-continue++++: StoryPlanning board panels leaf (~269 monofile); builders-annotations ~663; generate-chapter ~1500; commercial-tools ~477.
- 2026-07-19 goal-continue+++++: ACD monofile barrel + director-workspace-view; StoryPlanning ~244; commercial-tools ~477; generate-chapter ~1500; builders-annotations ~663. Task 11 + NWS/WorkspaceCenter still open.
- 2026-07-19 goal: WorkspaceCenter writing-support leaf (~796 monofile); prior ACD/StoryPlanning/commercial/generate-chapter extracts. Remaining: NWS ~2.0k, generate-chapter mid-loop, Task 11.
- 2026-07-19 goal: NWS barrel + NovelProjectWorkspaceView (~1 line monofile); WorkspaceCenter ~793; generate-chapter ~1500. Task 11 still open.
- 2026-07-19 architecture continuation: NWS UI-state hook; WritingCockpitPanel package leaves; story-planning board ops/audience/story; WorkspaceCenter writing-support strip leaves; novel-core builders seed outline helpers/model/normalize; novel-editor delivery-risk + revision-prompt leaves + builders-json; shell suites 92 green; core+architecture+shell+writingRecommendation 185 green; editor delivery/revision/quality green. builders-seed multi-leaf done. Remaining large residuals: NovelProjectWorkspaceView ~1.84k composition root, various quality/post-delivery leaves >1k, Task11 full smoke/memory still open.
- 2026-07-19 cont3: quality-sync-reports-benchmark blueprint/style/hooks; prose-quality-risks receipts/gates/specialty; NWS view-props leaves.

- 2026-07-19 Task11 partial: modularization-focused batch 281 pass (architecture+core+editor delivery/revision/quality+storyline sync+shell a/b+writingRecommendation). Server boot smoke: `bun src/index.ts` listens on :8787; idle RSS ~111MB after mempalace init. Full UI write-path/manual memory under load still open. Remaining large residuals: NWS view composition root ~1843, quality/post-delivery domain leaves >1k, delivery-status strip ~557.
- 2026-07-19 cont2: NovelStudio controller hook (~698 page / ~1256 hook); broad modularization batch 281 green earlier; live smoke still blocked (server not running).
- 2026-07-19 cont: builders-seed recovery/materialize/fill leaves; NWS repair handlers into factory (~1843 view); seed package fully multi-leaf.

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

- 2026-07-19 goal-continue XII: novel-project-bible helpers extract; prior XI setting helpers + memory-longform. Focused bible/setting tests green. Remaining: NWS view ~1593 composition, useNovelStudioController ~1215, NovelCreateWizard ~1449, provider-runtime DI, craft/audience monofiles, full write-path smoke/memory.

- 2026-07-19 goal-continue XI: memory-longform contracts memory/battle/brief; novel-setting helpers extract (~408 route register). Focused setting/serial/writing unit tests green. Remaining: NWS view ~1593, useNovelStudioController ~1215, NovelCreateWizard ~1449, provider-runtime DI, craft/audience monofiles, full write-path smoke/memory.

- 2026-07-19 goal-continue X: serial-momentum-chapter-states shared/core/extended; prior IX risk delivery/governance splits. Focused Task11 233+ and serial-momentum/readability joins green. Remaining: NWS view ~1593, useNovelStudioController ~1215, NovelCreateWizard ~1449, provider-runtime DI, craft/audience monofiles, full write-path smoke/memory.

- 2026-07-19 goal-continue IX: risk-recovery-governance core/reviews; risk-delivery core/recovery-queue; prior VIII desk/studio derived. Focused director receipts tests green. Remaining: NWS view ~1593 composition, useNovelStudioController ~1215, NovelCreateWizard ~1449, provider-runtime DI, craft/audience monofiles, full write-path smoke/memory.

- 2026-07-19 goal-continue VIII: cockpit-acceptance-desk utils/builders; studio-controller-derived filters/lobby; prior VII recovery/NWS derived. Focused Task11 172+ green. Remaining: NWS view ~1593 composition root, useNovelStudioController ~1215 (feed/knowledge still intertwined), NovelCreateWizard ~1449, provider-runtime DI, full write-path smoke/memory.

- 2026-07-19 goal-continue VII: NWS derived-state leaf; helpers-safe-batch-recovery core/decision/default-lane/structure; create-wizard options/seed utils; cockpit basics/acceptance already in VI. Task11 focused batches green. Remaining: NWS view ~1593 composition, useNovelStudioController ~1256, NovelCreateWizard ~1449, provider-runtime reverse-free DI, full write-path smoke/memory.

- 2026-07-19 goal-continue VI: NWS style-sample/writing-queue/editor-report handler factories + runRollingPlan export/wiring; task-center drawer-run-summaries component package + recovery-evidence snapshot leaf; cockpit-basics core/receipts/plans; cockpit-acceptance sync-a/b. Focused Task11 243+ green. Remaining: NWS view ~1644, useNovelStudioController ~1256, NovelCreateWizard ~1568, provider-runtime ~1778 (no mechanical DI), helpers-safe-batch-recovery cycles, full write-path smoke. Also: NovelCreateWizard options+seed utils (~1450), cockpit-basics/acceptance barrels, task-center run-summary package.

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

- 2026-07-19 goal-continue: prompt-lines-quality package (core/craft-a/b/receipts/repairs); novel-production run-state + post-delivery leaves (monofile ~637); support-normalize-repairs batch/post/scene/audit; quality-contract evidence/fields/checks; specialty closure A/B/C; risk issue catalog leaf + explicit re-import. Task11 modularization batch green (architecture+core+editor delivery/revision/quality+production behavior+shell+repair prompt+writingRecommendation). provider-runtime mechanical split aborted (private helper DI incomplete). Remaining: NWS view composition ~1764, useNovelStudioController ~1256, audience/craft monofiles (no mechanical private-const splits), provider-runtime reverse-free DI plan, Task11 full UI write-path smoke/memory under load.
- 2026-07-19 goal-continue II: risk-and-governance → issue-catalog + shared + review-signals (mono ~732). Server boot smoke :8787 idle RSS ~107MB. Task11 focused batch green. Still open: NWS view ~1764 composition, useNovelStudioController ~1256, provider-runtime reverse-free DI, full write-path UI smoke.
- 2026-07-19 goal-continue III: deferred-surfaces split core/ops/outline (view ~43). Task11 shell 92 green. Remaining large: NWS view ~1764, useNovelStudioController ~1256, provider-runtime ~1778, NovelCreateWizard ~1568.

- 2026-07-19 goal-continue IV: quality-sync-reports-benchmark-audit domain leaves; helpers-next-batch-brief basics/lane/core/style/recovery; quality-sync-reports-extended target/genre/story/info leaves; serial-momentum patterns+chapter-states barrel; commercial-ops builders shared+domain leaves. Focused Task11 suites green. Remaining: NWS view ~1764, useNovelStudioController ~1256, provider-runtime ~1778, NovelCreateWizard ~1568, craft/audience monofiles (no mechanical private-const splits), full write-path smoke. Also: NovelCreateWizard options+seed utils (~1450), cockpit-basics/acceptance barrels, task-center run-summary package.
- 2026-07-19 goal-continue V: helpers-command runway/gates/actions; NWS version/scene/delete/storyline factories (view ~1699). commercial-ops builders shared fix. Task11 focused batch green. Remaining: NWS composition still ~1.7k, useNovelStudioController ~1256, provider-runtime ~1778, NovelCreateWizard ~1568, full smoke.

- 2026-07-19 goal-continue XXXIII: provider-runtime reverse-free support leaf landed (network/select/execute in monofile ~505; helpers/poll/body in support ~1394) — call graph closed (effectiveApiFormat/routeConfigForProvider/fallbackEndpoint/endpointForProvider co-located). NWS handler bind leaves: workspace-view-bind-core-handlers (~763) + workspace-view-bind-action-handlers (~133); view ~1370 composition root. provider-runtime tests 62 green; architecture contracts green. Remaining: NWS further props/recommendation extract, useNovelStudioController, NovelCreateWizard, craft/audience monofiles, Task 11 full write-path smoke/memory.

- 2026-07-19 goal-continue XXXIV: provider-runtime endpoint leaf (route/poll ~251) under support (~1152) + monofile execute (~509); no circular re-export (entry imports support+endpoint). NWS view TDZ fix (writingRecommendation/cockpitPrimaryActionOverride before workspaceViewDeps) + cockpit primary override leaf. provider-runtime 62 + architecture contracts green. Remaining: support further body/stream split, NWS deps bag, craft/audience monofiles, Task11 write-path smoke/memory.

- 2026-07-19 goal-continue XXXV: provider-runtime stream leaf (~317: read/parse payload) under support (~854) + endpoint (~251) + monofile (~510). Acyclic entry imports. provider-runtime 62 green.

- 2026-07-19 goal-continue XXXVI: NWS workspaceViewDeps spreads core/action handler bags (~1252 composition root); structured-review-fields barrel (~71) + required-fields leaf (~770) with export-const marker for package-join contracts. Focused architecture+provider-runtime sample+chapter-context contracts green.

- 2026-07-19 goal-continue XXXVII: intent-benchmark-recall leaf (~611) + contracts (~230); continuity-heat-contracts leaf (~284) + dialogue contracts (~457). Pre-existing contracts-b-a failures (write-prep receipt debt symbol, asset_linkage riskCarryOver empty) not introduced by this split. Focused architecture+core-b-1+contracts-a-b green.

- 2026-07-19 goal-continue XXXVIII: prompts monofile → barrel + prompts-core (~355) / prompts-prose (~392) / prompts-misc (~226); prompts.test 10 green.

- 2026-07-19 goal-continue XXXIX: adapter-support leaf (~803 pure helpers) + adapter classes (~210); adapter tests 29 green. Residual composition roots: NWS view ~1252, useCreateWizardController ~905, SettingWorkshopPanel ~888; provider-runtime package already leafed.

- 2026-07-19 goal-continue XL: scene-card apply-card → thin orchestrator (~144) + phase-a/b (~500 each); NWS domain-models + chapter-loads hooks (view ~1116); create-wizard deep-draft actions factory (~194, controller ~829); package-join fixes for continuity-heat memory capsule + intent-benchmark local imports. scene-cards a/b + architecture contracts green.

- 2026-07-19 goal-continue XLI: create-wizard seed pipeline leaf (~313 apply/derive/fill/finalize) + controller ~673; deep-draft actions already ~194; flow tests package-join updated (2 pass).

- 2026-07-19 goal-continue XLII: SettingWorkshop helpers leaf (~110) + panel ~793; create-wizard seed pipeline already landed. settingUsageWorkbenchShell 1 pre-existing fail (NovelProjectWorkspace barrel path for projectSettings).
