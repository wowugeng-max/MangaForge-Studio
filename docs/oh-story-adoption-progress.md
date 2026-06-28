# oh-story 参考迁移进度台账

Last updated: 2026-06-28

Source reference set: `/private/tmp/oh-story-claudecode/skills/story-long-write/references`

本台账用于回答三件事：

- MangaForge 小说工作台已经吸收了 oh-story 哪些参考。
- 还剩哪些参考没有系统改进到流程或提示词里。
- 按当前小步、带测试、可回滚的节奏，预计还需要多久。

<!-- oh-story-progress-summary
{
  "reference_total": 38,
  "integrated": 25,
  "partial": 13,
  "todo": 0,
  "deferred": 0,
  "remaining_references": 13,
  "estimated_hours_remaining": 26.75,
  "estimated_working_days_remaining": 4.46
}
-->

## Current Snapshot

- Reference files: 38
- Integrated enough for current production use: 25
- Partially integrated, still worth mining: 13
- Not systematically reviewed yet: 0
- Deferred: 0
- Remaining references to improve: 13
- Estimated remaining effort: about 26.75 engineering hours, or 4.46 focused working days at 6 hours per day

The estimate assumes the current working pattern: one small oh-story increment at a time, with prompt or workflow changes backed by focused tests, then `test:novel-server` and `check` before push. UI progress surfacing is not included in the remaining estimate; after this ledger stabilizes, exposing it in the novel workspace should be a separate 4-6 hour slice.

## Status Meaning

- `integrated`: MangaForge already has durable prompt, workflow, deterministic check, receipt, or repair-task coverage for the reference. Future refinements are possible, but this reference is not counted as an immediate migration gap.
- `partial`: At least one meaningful slice is implemented, but important sections remain to mine or connect to prompts, receipts, diagnostics, or UI flows.
- `todo`: No systematic migration pass has been done yet, or only incidental text overlap exists.
- `deferred`: Deliberately postponed because it is not needed for the current novel-workbench direction.

## Progress Table

| Reference file | State | MangaForge evidence | Remaining improvement | ETA |
|---|---|---|---|---|
| anti-ai-writing.md | integrated | Deterministic AI-pattern scans, cleanup repair prompts, deslop receipts in `ui/server/src/routes/novel-writing-service.ts`. | Keep updating examples when new prose failure modes appear. | 0.5h |
| artifact-protocols.md | integrated | `artifact_protocol_receipts` now map oh-story standard project artifacts (`设定/关系.md`, `设定/题材定位.md`, `大纲/卷纲_第X卷.md`, `大纲/细纲_第XXX章.md`, `追踪/伏笔.md`, `追踪/时间线.md`, `追踪/角色状态.md`, `追踪/上下文.md`, `对标/{对标书名}/拆文报告.md`) into prose generation, self-review, revision, stored `oh_story_delivery_receipts`, deterministic `buildArtifactProtocolReceiptSyncReport`, post-delivery gates, and full-pipeline `story_state_update`. Focused tests cover schema gaps, locatable evidence, prompt enforcement, and top-level receipt storage. | Keep tuning required-field aliases from real project artifacts. | 0.5h |
| banned-words.md | integrated | `OH_STORY_LEVEL_ONE_BANNED_WORDS`, weak-adverb density, context-sensitive scans, and deterministic cleanup gates are implemented. | Periodically sync banned word source list. | 0.5h |
| character-basics.md | integrated | Character behavior contract now carries protagonist role-card requirements, supporting-role exit planning, behavior repeat points, character-driven event rules, protagonist red lines, and identity/goldfinger alignment into pre-draft briefs, prose prompts, self-review, revision, deterministic `buildCharacterBehaviorSyncReport`, repair carry-over, and unattended blueprint construction. Focused tests cover prompt hydration, incomplete explicit-contract backfill, post-delivery sync misses, and review/revision enforcement. | Keep tuning role-card and behavior-repeat evidence heuristics from real generated chapters. | 0.5h |
| character-design-methods.md | integrated | Character behavior contract covers motivation chains, three-layer labels, strong associations, role-card requirements, supporting-role functions/exits, antagonist logic, goldfinger/identity alignment, protagonist composure, memory anchors, and behavior diagnostics in `ui/server/src/routes/novel-writing-service.ts`. Project seed generation, seed recovery, original incubation, and seed materialization now carry `writing_bible.character_design_contract` with three-layer labels, strong/medium/weak associations, role-card schema, supporting-role function rules, antagonist self-story, goldfinger-bound protagonist design, immersion, and safety rules. | Keep tuning role-card defaults from real seed-generation misses. | 0.5h |
| character-relations.md | integrated | Character relation contract, relationship graph workflows, staged scene-card fields (`relationship_progression_plan`, `relationship_buffer_zone`, `supporting_character_action`, `attitude_shift_checkpoint`, `relationship_next_hook`), prose execution prompts, deterministic scene-card directive checks, buffer-zone post-delivery diagnostics, and repair carry-over now cover pressure, attitude shifts, 配角期待枢纽, 配角攻略缓冲区, active supporting-character action, and relationship evidence. | Keep tuning buffer-zone evidence heuristics from real chapters where relation changes are implied rather than named. | 0.5h |
| commercial-core-methods.md | integrated | Target reader, bridge unit, reader payoff, retention, expectation threshold, golden-three launch, quality audit, and core-contract radar now cover the reference's commercial method stack. `core_contract_radar` carries selling-point execution, repetition strategy, commercial rhythm, goldfinger structure, and launch-pressure rules into pre-draft briefs, prose prompts, self-review, revision, unattended blueprint construction, deterministic `buildCoreContractSyncReport`, and repair carry-over. Focused tests cover prompt hydration, post-delivery misses, and review/revision enforcement. | Keep tuning evidence heuristics for real chapters where commercial rhythm is implied rather than stated. | 0.5h |
| cross-book-recall.md | integrated | Benchmark recall brief and prose prompt carry `副对标召回摘要`, secondary benchmark budget/sorting, canonical source rules, `secondary_benchmark_boundary`, review checks, and write-preparation `source_gaps`/`must_confirm` coverage for registry and main-benchmark gaps in `ui/server/src/routes/novel-writing-service.ts`. Focused tests cover secondary benchmark contamination, budget trimming, prompt placement, and write-preparation receipts. | Keep tuning cross-book recall from real multi-benchmark projects. | 0.5h |
| dialogue-mastery.md | integrated | Dialogue contract covers voice anchors, subtext, power-length rules, spectator dialogue, rhythm, execution checklist, dialogue receipts, deterministic info-dump and interchangeable-voice diagnostics, prose prompt enforcement, self-review coverage, post-delivery sync, and repair carry-over. | Keep tuning scene-level dialogue execution checklist from real generation misses. | 0.5h |
| emotional-arc-design.md | integrated | Emotional arc contract now carries scene execution rules, reaction structures, expectation relay, arc shape, pressure, payoff density, peak-end rules, and quality checks into pre-draft briefs, prose prompts, self-review, revision, deterministic `buildEmotionalArcSyncReport`, staged scene-card fields (`emotional_arc_stage`, `reader_emotion_goal`, `reaction_structure`, `expectation_bridge`), and repair carry-over routing. Focused tests cover scene-card projection and post-delivery sync misses. | Keep tuning scene-stage evidence heuristics from real chapters where the model implies stages without labels. | 0.5h |
| emotional-methods.md | partial | Emotion module, payoff setup, emotional turn, and reader expectation checks are present in pre-draft and review flows. | Mine remaining emotion formulas into concise prompt fragments instead of broad contracts. | 1.5h |
| female-audience-writing.md | partial | Female-audience contract is conditionally requested for female or female-channel projects. | Add project-level detection and UI confirmation so this contract is active only when intended. | 1.5h |
| format-and-structure.md | partial | Prose format and metadata scans detect title, chapter marker, front matter, and engineering-word violations. | Compare all format requirements and add missing deterministic checks. | 1h |
| genre-catalog.md | integrated | Creation, recovery, original-incubation prompts, and local writing-bible materialization now inject `genre_positioning_contract.genre_catalog_contract` from an oh-story catalog route covering the main route table and quick-reference entries: 追妻火葬场、重生复仇、小三/婚恋、世情、仙侠/玄幻、死人文学、都市高武、霸总/甜宠、同人流派、脑洞文、凡人流、历史/架空历史、文娱/娱乐圈、规则怪谈、长生流、西幻/骑士文、新媒体文、搞笑文、无限流、悬疑、后悔流, plus a generic fallback. Focused tests verify routing and key checks. | Keep tuning route keywords and snippets from real seed-generation misses. | 0.5h |
| genre-core-mechanics.md | integrated | Genre positioning contract covers core hook, goldfinger fit, must-have scenes, platform fit, micro-innovation, 70/20/10 inspiration, five micro-innovation methods, long-board focus, and prose/review checks. Creation, recovery, original-incubation prompts, and local writing-bible materialization now inject `genre_positioning_contract.genre_core_mechanics_contract` with oh-story core-hook layers, per-chapter loop rules, micro-innovation boundaries, conflict-network rules, goldfinger/worldview fit, threshold escalation, career/love balance, drift checks, and genre presets for 都市高武、仙侠/玄幻、规则怪谈、脑洞文、凡人流 plus fallback validation examples. | Keep tuning mechanism presets from real seed-generation and pre-draft misses. | 0.5h |
| genre-readers.md | integrated | Target-reader contract now carries reader profile/desires plus genre vitality, platform fit, boundary fit, title/blurb/content alignment, immersion/plasticity, goldfinger-life fit, and commercial-expression rules into pre-draft briefs, prose prompts, self-review, revision, unattended blueprint construction, and deterministic `buildTargetReaderSyncReport`. Focused tests cover prompt hydration, incomplete explicit-contract backfill, post-delivery sync misses, and review/revision enforcement. | Keep tuning platform and title/blurb evidence heuristics from real generated chapters. | 0.5h |
| genre-writing-formulas.md | integrated | Next-batch workflow loads `references/genre-writing-formulas.md` on demand, and `genre_positioning_contract.genre_formula` now receives compact oh-story formula routes for the reference's formula table, including modern revenge, urban system, suspense, rebirth, palace, abuse, public-trial face-slap, and other genre structures. | Keep tuning route keywords and formula snippets from real generation misses. | 0.5h |
| hooks-chapter.md | integrated | Chapter hook contracts, ending contract checks, sudden clue detection, and hook repair carry-over are implemented. | Keep tuning thresholds based on real output. | 0.5h |
| hooks-paragraph.md | integrated | Paragraph hook checks detect stalled paragraphs and require micro-hook signals. | Keep tuning paragraph-density heuristics. | 0.5h |
| hooks-suspense.md | integrated | Suspense contract, information gap checks, false-alarm guards, and suspense repair tasks are present. | Keep collecting failure cases. | 0.5h |
| opening-design.md | integrated | Opening hook, first-50 conflict, first-100 event density, protagonist-entry, and entry-promise checks are implemented. | Keep refining per-genre opening exceptions. | 0.5h |
| outline-conflict.md | partial | Conflict structure contract covers ladders, protagonist agency, no-exit rules, and next-conflict seeds. | Tie conflict gaps earlier into outline and scene-card generation. | 1.5h |
| outline-methods.md | partial | Chapter blueprint requires five-part outline, plot lines, character order, beat sequence, and ending contract. | Map more outline-method templates to the planning workspace. | 1.5h |
| outline-rhythm.md | partial | Bridge unit, batch rhythm, beat cooling, and batch-size guardrails exist. | Add clearer rolling-plan diagnostics for rhythm fatigue before drafting. | 1.5h |
| outline-structure-theory.md | partial | Blueprint and structure progression checks cover causal chain and chapter structure. | Mine structure theory into project-level longform skeleton generation. | 2h |
| plot-core-methods.md | partial | Target reader, story drive, plot dynamics, information flow, reader payoff, and story power contracts are present. Story power now covers seed/recovery/original-incubation prompts, local writing-bible materialization, pre-draft/prose prompts, self-review, revision, deterministic `buildStoryPowerSyncReport`, story-state sync, and repair carry-over. | Continue converting remaining high-level methods such as small-outline steps, mainline definition, transitions, thresholds, suspense routes, and information-group routes into generation-time gates. | 1.25h |
| plot-emotion-system.md | partial | Payoff setup, emotional arc,爽点 setup, and craft rules are present in pre-draft and prose prompts. | Add formula-level checks for setup before payoff and recurring emotional modules. | 1.5h |
| plot-frameworks.md | partial | Showdown, suspense, conflict, and bridge-unit contracts cover major framework pieces. | Decide which frameworks belong in creation, outline, scene-card, or revision stages. | 2h |
| plot-special-topics.md | integrated | Creation, recovery, original-incubation prompts, and local writing-bible materialization inject `writing_bible.plot_special_topics_contract`; pre-draft write-preparation `creation_contract_checklist` now includes special topics; prose generation executes `chapter_target.plot_special_topics_contract`; self-review and revision prompts require `plot_special_topics_checks`; `buildPlotSpecialTopicsSyncReport` verifies goldfinger execution, genre boundary, market benchmark, urban high martial, launch checkpoint, and faction hand evidence; prose-quality risks and `plot_special_topics_sync` now carry gaps into next-chapter repair routing. Focused tests cover write-preparation surfacing, prompt enforcement, full-pipeline story-state return, and deterministic sync behavior. | Keep tuning topic-specific evidence heuristics from real generated chapters. | 0.5h |
| quality-checklist.md | integrated | Quality audit contract covers structure, purpose tags, progression, information load, event ratio, longform continuity, five-dimension scoring, selling-point expression, phase-level checklist mapping, prose prompt enforcement, self-review receipt coverage, quality gates, post-delivery sync, and repair tasks. | Keep tuning phase checklist mappings from real review misses. | 0.5h |
| reversal-toolkit.md | integrated | Reversal setup, fair misdirection, evidence-chain, final-evidence impact, time-bomb proof, and agency checks are implemented. | Keep tuning evidence-chain examples. | 0.5h |
| state-tracking.md | integrated | State tracking contract, source readiness, status-filter receipts, and source-boundary checks are implemented. | Keep expanding real-world failure examples. | 0.5h |
| style-combat-face.md | partial | Showdown contract and combat or face-slap deterministic checks cover payoff release, antagonist pressure, and agency. | Add more scene-card level combat and public payoff presets. | 1.5h |
| style-craft.md | partial | Style boundary, punctuation tone, sentence rhythm, subject-name rhythm, and section-density checks are present. | Extract craft rules into shorter prompt snippets to reduce prompt bulk. | 1h |
| style-genre-modules.md | partial | Benchmark recall and emotion/rhythm module loading rules exist. | Add model-facing fallback receipts proving module, rhythm, and matched chapter usage. | 1.5h |
| workflow-daily.md | integrated | Next-batch workflow rules cover context load, manual fallback table, next chapter numbering, title precheck, benchmark recall, formula loading, research, word count, serial writing, Phase 5 checks, and exact `追踪/上下文.md` progress-summary handoff. | Keep tuning daily workflow rules after real batch-writing failures appear. | 0.5h |
| workflow-revision.md | integrated | Revision context receipts, revision cascade, scope guard, quality-audit repair, automatic prose revision prompts, editor repair prompts, and editor one-click revision now cover oh-story workflow-revision Step 2/4/5. Editor revision injects actual previous/next chapter, outline, foreshadowing, timeline, character, setting, and relationship slices, enforces the 30%/800字 scope guard, asks for `revision_context_receipts`, `revision_scope_guard`, `revision_receipts.cascade_impacts`, and stores these receipts in the `editor_revision` payload. | Keep tuning revision context slicing from real回炉 cases. | 0.5h |
| writing-craft.md | integrated | Natural writing rules, opening density, event ratio, sensory anchor, dialogue-action rhythm, and prose cleanup gates are implemented. | Keep tuning based on generated prose regressions. | 0.5h |

## Next Priority Queue

1. `plot-core-methods.md`: convert remaining high-level methods into smaller generation-time gates.
2. `outline-structure-theory.md`: mine structure theory into project-level longform skeleton generation.
3. `outline-conflict.md`: tie conflict gaps earlier into outline and scene-card generation.
4. `outline-methods.md`: map more outline-method templates to the planning workspace.
5. `plot-frameworks.md`: decide which frameworks belong in creation, outline, scene-card, or revision stages.

## Update Rules

- Every oh-story-driven prompt, workflow, diagnostic, receipt, or UI improvement must update this file in the same commit when it changes migration status or remaining work.
- Run `bun run check:oh-story-progress` before committing changes to this file.
- A reference can move to `integrated` only when there is durable MangaForge evidence: prompt construction, workflow rule, deterministic diagnostic, structured receipt, repair task, UI flow, or test coverage.
- Estimates are planning numbers, not commitments. Recalculate after each batch of 5-8 references or any major UI integration.
