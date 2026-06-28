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
  "integrated": 14,
  "partial": 22,
  "todo": 2,
  "deferred": 0,
  "remaining_references": 24,
  "estimated_hours_remaining": 47,
  "estimated_working_days_remaining": 7.83
}
-->

## Current Snapshot

- Reference files: 38
- Integrated enough for current production use: 14
- Partially integrated, still worth mining: 22
- Not systematically reviewed yet: 2
- Deferred: 0
- Remaining references to improve: 24
- Estimated remaining effort: about 47 engineering hours, or 7.83 focused working days at 6 hours per day

The estimate assumes the current working pattern: one small oh-story increment at a time, with prompt or workflow changes backed by focused tests, then `test:novel-server` and `check` before push. UI progress surfacing is not included in the 47 hours; after this ledger stabilizes, exposing it in the novel workspace should be a separate 4-6 hour slice.

## Status Meaning

- `integrated`: MangaForge already has durable prompt, workflow, deterministic check, receipt, or repair-task coverage for the reference. Future refinements are possible, but this reference is not counted as an immediate migration gap.
- `partial`: At least one meaningful slice is implemented, but important sections remain to mine or connect to prompts, receipts, diagnostics, or UI flows.
- `todo`: No systematic migration pass has been done yet, or only incidental text overlap exists.
- `deferred`: Deliberately postponed because it is not needed for the current novel-workbench direction.

## Progress Table

| Reference file | State | MangaForge evidence | Remaining improvement | ETA |
|---|---|---|---|---|
| anti-ai-writing.md | integrated | Deterministic AI-pattern scans, cleanup repair prompts, deslop receipts in `ui/server/src/routes/novel-writing-service.ts`. | Keep updating examples when new prose failure modes appear. | 0.5h |
| artifact-protocols.md | partial | Structured receipts and delivery artifacts exist around `oh_story_delivery_receipts`, revision receipts, and source-readiness checks. | Compare artifact protocol naming and required fields against MangaForge receipts, then close schema gaps. | 1.5h |
| banned-words.md | integrated | `OH_STORY_LEVEL_ONE_BANNED_WORDS`, weak-adverb density, context-sensitive scans, and deterministic cleanup gates are implemented. | Periodically sync banned word source list. | 0.5h |
| character-basics.md | partial | Character state, behavior, and continuity checks exist in chapter contracts and post-delivery syncs. | Extract missing character-basics rules into pre-draft character constraints and revision checks. | 1.5h |
| character-design-methods.md | partial | Character behavior contract covers motivation chains, strong associations, antagonist logic, and composure. | Mine remaining design methods for project creation and role-card generation prompts. | 2h |
| character-relations.md | partial | Character relation contract and relationship graph workflows cover pressure, attitude shifts, and relationship evidence. | Add clearer relation progression diagnostics before prose, not only after review. | 1.5h |
| commercial-core-methods.md | partial | Target reader, bridge unit, reader payoff, retention, and longform guardrails exist across pre-draft and quality contracts. | Convert more commercial-core heuristics into creation-time and batch-planning gates. | 2h |
| cross-book-recall.md | integrated | Benchmark recall brief and prose prompt carry `副对标召回摘要`, secondary benchmark budget/sorting, canonical source rules, `secondary_benchmark_boundary`, review checks, and write-preparation `source_gaps`/`must_confirm` coverage for registry and main-benchmark gaps in `ui/server/src/routes/novel-writing-service.ts`. Focused tests cover secondary benchmark contamination, budget trimming, prompt placement, and write-preparation receipts. | Keep tuning cross-book recall from real multi-benchmark projects. | 0.5h |
| dialogue-mastery.md | integrated | Dialogue contract covers voice anchors, subtext, power-length rules, spectator dialogue, rhythm, execution checklist, dialogue receipts, deterministic info-dump and interchangeable-voice diagnostics, prose prompt enforcement, self-review coverage, post-delivery sync, and repair carry-over. | Keep tuning scene-level dialogue execution checklist from real generation misses. | 0.5h |
| emotional-arc-design.md | partial | Emotional arc contract covers arc shape, pressure, payoff density, peak-end rules, and quality checks. | Connect emotion-arc findings more directly to scene-card generation and repair-task routing. | 1.5h |
| emotional-methods.md | partial | Emotion module, payoff setup, emotional turn, and reader expectation checks are present in pre-draft and review flows. | Mine remaining emotion formulas into concise prompt fragments instead of broad contracts. | 1.5h |
| female-audience-writing.md | partial | Female-audience contract is conditionally requested for female or female-channel projects. | Add project-level detection and UI confirmation so this contract is active only when intended. | 1.5h |
| format-and-structure.md | partial | Prose format and metadata scans detect title, chapter marker, front matter, and engineering-word violations. | Compare all format requirements and add missing deterministic checks. | 1h |
| genre-catalog.md | todo | Genre labels exist, but catalog-level guidance has not been mapped. | Build a genre catalog mapping for seed creation, target reader, and must-have scenes. | 2.5h |
| genre-core-mechanics.md | partial | Genre positioning contract covers core hook, goldfinger fit, must-have scenes, platform fit, and micro-innovation. | Add genre-specific mechanism presets and validation examples. | 2h |
| genre-readers.md | partial | Target-reader contract and reader expectation checks cover reader profile and desires. | Expand reader profiles into selectable or inferred workbench signals. | 1.5h |
| genre-writing-formulas.md | integrated | Next-batch workflow loads `references/genre-writing-formulas.md` on demand, and `genre_positioning_contract.genre_formula` now receives compact oh-story formula routes for the reference's formula table, including modern revenge, urban system, suspense, rebirth, palace, abuse, public-trial face-slap, and other genre structures. | Keep tuning route keywords and formula snippets from real generation misses. | 0.5h |
| hooks-chapter.md | integrated | Chapter hook contracts, ending contract checks, sudden clue detection, and hook repair carry-over are implemented. | Keep tuning thresholds based on real output. | 0.5h |
| hooks-paragraph.md | integrated | Paragraph hook checks detect stalled paragraphs and require micro-hook signals. | Keep tuning paragraph-density heuristics. | 0.5h |
| hooks-suspense.md | integrated | Suspense contract, information gap checks, false-alarm guards, and suspense repair tasks are present. | Keep collecting failure cases. | 0.5h |
| opening-design.md | integrated | Opening hook, first-50 conflict, first-100 event density, protagonist-entry, and entry-promise checks are implemented. | Keep refining per-genre opening exceptions. | 0.5h |
| outline-conflict.md | partial | Conflict structure contract covers ladders, protagonist agency, no-exit rules, and next-conflict seeds. | Tie conflict gaps earlier into outline and scene-card generation. | 1.5h |
| outline-methods.md | partial | Chapter blueprint requires five-part outline, plot lines, character order, beat sequence, and ending contract. | Map more outline-method templates to the planning workspace. | 1.5h |
| outline-rhythm.md | partial | Bridge unit, batch rhythm, beat cooling, and batch-size guardrails exist. | Add clearer rolling-plan diagnostics for rhythm fatigue before drafting. | 1.5h |
| outline-structure-theory.md | partial | Blueprint and structure progression checks cover causal chain and chapter structure. | Mine structure theory into project-level longform skeleton generation. | 2h |
| plot-core-methods.md | partial | Target reader, story drive, plot dynamics, information flow, and reader payoff contracts are present. | Convert remaining high-level methods into smaller generation-time gates. | 2h |
| plot-emotion-system.md | partial | Payoff setup, emotional arc,爽点 setup, and craft rules are present in pre-draft and prose prompts. | Add formula-level checks for setup before payoff and recurring emotional modules. | 1.5h |
| plot-frameworks.md | partial | Showdown, suspense, conflict, and bridge-unit contracts cover major framework pieces. | Decide which frameworks belong in creation, outline, scene-card, or revision stages. | 2h |
| plot-special-topics.md | todo | No systematic migration pass found. | Review special topics and route them to genre-specific or optional contracts. | 2.5h |
| quality-checklist.md | integrated | Quality audit contract covers structure, purpose tags, progression, information load, event ratio, longform continuity, five-dimension scoring, selling-point expression, phase-level checklist mapping, prose prompt enforcement, self-review receipt coverage, quality gates, post-delivery sync, and repair tasks. | Keep tuning phase checklist mappings from real review misses. | 0.5h |
| reversal-toolkit.md | integrated | Reversal setup, fair misdirection, evidence-chain, final-evidence impact, time-bomb proof, and agency checks are implemented. | Keep tuning evidence-chain examples. | 0.5h |
| state-tracking.md | integrated | State tracking contract, source readiness, status-filter receipts, and source-boundary checks are implemented. | Keep expanding real-world failure examples. | 0.5h |
| style-combat-face.md | partial | Showdown contract and combat or face-slap deterministic checks cover payoff release, antagonist pressure, and agency. | Add more scene-card level combat and public payoff presets. | 1.5h |
| style-craft.md | partial | Style boundary, punctuation tone, sentence rhythm, subject-name rhythm, and section-density checks are present. | Extract craft rules into shorter prompt snippets to reduce prompt bulk. | 1h |
| style-genre-modules.md | partial | Benchmark recall and emotion/rhythm module loading rules exist. | Add model-facing fallback receipts proving module, rhythm, and matched chapter usage. | 1.5h |
| workflow-daily.md | integrated | Next-batch workflow rules cover context load, manual fallback table, next chapter numbering, title precheck, benchmark recall, formula loading, research, word count, serial writing, Phase 5 checks, and exact `追踪/上下文.md` progress-summary handoff. | Keep tuning daily workflow rules after real batch-writing failures appear. | 0.5h |
| workflow-revision.md | partial | Revision context receipts, revision cascade, scope guard, quality-audit repair, and editor repair prompts exist. | Compare workflow-revision step order against MangaForge editor flow and fill missing handoff receipts. | 2h |
| writing-craft.md | integrated | Natural writing rules, opening density, event ratio, sensory anchor, dialogue-action rhythm, and prose cleanup gates are implemented. | Keep tuning based on generated prose regressions. | 0.5h |

## Next Priority Queue

1. `workflow-revision.md`: compare revision step order against MangaForge editor flow and fill missing handoff receipts.
2. `genre-catalog.md`: build a genre catalog mapping for seed creation, target reader, and must-have scenes.
3. `genre-core-mechanics.md`: add genre-specific mechanism presets and validation examples.
4. `plot-special-topics.md`: review special topics and route them to genre-specific or optional contracts.
5. `artifact-protocols.md`: compare artifact protocol naming and required fields against MangaForge receipts, then close schema gaps.

## Update Rules

- Every oh-story-driven prompt, workflow, diagnostic, receipt, or UI improvement must update this file in the same commit when it changes migration status or remaining work.
- Run `bun run check:oh-story-progress` before committing changes to this file.
- A reference can move to `integrated` only when there is durable MangaForge evidence: prompt construction, workflow rule, deterministic diagnostic, structured receipt, repair task, UI flow, or test coverage.
- Estimates are planning numbers, not commitments. Recalculate after each batch of 5-8 references or any major UI integration.
