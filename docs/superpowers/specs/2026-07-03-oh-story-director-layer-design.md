# oh-story Director Layer Design

## Goal

Upgrade MangaForge from "has absorbed oh-story rules" to "can stage, select, and execute oh-story rules like a production director." The system should keep the existing contracts, gates, receipts, diagnostics, and automatic repairs, but reduce the four current weak points:

- schema-heavy outputs that feel like form filling instead of creative judgment;
- oversized prompts caused by recalling too many oh-story contracts at once;
- unclear UI blockers that tell the user many things are wrong without one obvious next action;
- excessive method recall that makes models comply mechanically instead of choosing the right craft move for the current stage.

The product target is a single director layer that decides what matters now, what can wait, what can be auto-repaired, and what the user must confirm.

## Current State

The oh-story migration backlog is functionally complete. `docs/oh-story-adoption-progress.md` records 38 reference files as integrated, and existing code already maps oh-story references into project creation, writing-bible contracts, pre-draft briefs, prose prompts, deterministic checks, delivery receipts, repair carry-over, and UI summaries.

This is a real capability gain, especially for longform production. The remaining problem is no longer "missing oh-story knowledge." The problem is orchestration. Many rules exist, but the workspace often exposes them as many parallel blockers, task entries, or prompt clauses. The user then sees a noisy system instead of a decisive writing assistant.

## Product Principle

The director layer is not a new workspace page and not another button cluster. It is a decision layer behind existing creation, novel workspace, unattended writing, task center, and chapter acceptance flows.

Every stage should answer three questions:

- Can we continue?
- If not, what is the smallest required repair?
- Which oh-story contracts are relevant enough to spend prompt budget on now?

## Stages

### 1. Project Creation And Deep Incubation

Purpose: decide whether the project has enough durable production material to begin writing.

Director output:

- `stage`: `project_creation`
- `readiness`: `ready` / `needs_repair` / `needs_user_confirmation`
- `primary_action`: `enter_workspace` / `repair_project_seed` / `ask_user_confirmation`
- `material_score`: compact score for premise, reader promise, mainline, structure, role pool, world rules, and first-chapter runway
- `required_repairs`: only blocking gaps
- `deferred_repairs`: useful improvements that should not block writing

Important behavior:

- Keep rich oh-story seed contracts, but materialize only durable project artifacts.
- Stop treating every missing optional field as a blocker.
- Route ambiguous creative choices to user confirmation only when auto-fill would risk changing the project's promise.

### 2. Write-Preparation Gate

Purpose: decide whether a chapter can be written now.

Director output:

- `stage`: `pre_draft`
- `readiness`: `ready` / `auto_repairing` / `blocked`
- `primary_action`: `generate_prose` / `repair_pre_draft_materials` / `confirm_missing_choice`
- `required_sources`: compact list of source artifacts needed for this chapter
- `selected_contracts`: small list of oh-story contracts worth recalling
- `prompt_budget_plan`: what gets full detail, summary, or omission

Important behavior:

- Convert scattered preflight warnings into one blocker category: `missing_materials`, `missing_blueprint`, `missing_context`, `missing_source_evidence`, or `manual_confirmation_required`.
- Automatically repair blueprints, scene cards, character gaps, timeline/context summaries, and quality carry-over before surfacing blockers.
- If repair still fails, show one explanation and one repair action, not a long list of internal checks.

### 3. Prose Generation

Purpose: generate the current chapter using the smallest sufficient oh-story context.

Director output:

- `stage`: `drafting`
- `selected_contracts`: contract fragments selected for this chapter
- `suppressed_contracts`: valid contracts intentionally omitted from the prompt
- `execution_focus`: three to seven concrete craft instructions
- `receipt_requirements`: compact proof fields required from the model

Important behavior:

- Replace full-contract dumping with contract selection.
- Use contract fragments rather than raw JSON when the chapter only needs a craft reminder.
- Keep evidence receipts, but keep them tied to actual chapter risks.
- Never let receipt verbosity crowd out the prose task.

### 4. Post-Draft Diagnosis And Repair

Purpose: determine whether the chapter is acceptable and what must carry into the next chapter.

Director output:

- `stage`: `post_draft`
- `acceptance`: `accepted` / `accepted_with_carryover` / `needs_revision`
- `primary_action`: `continue_next_chapter` / `create_repair_task` / `run_revision`
- `blocking_findings`: findings that must be fixed before delivery
- `carryover_findings`: findings that should become next-chapter constraints
- `resolved_findings`: findings proven closed by receipts or deterministic checks

Important behavior:

- Distinguish "must revise this chapter" from "carry this risk forward."
- Collapse duplicate findings across quality audit, deslop, story power, continuity, and receipt sync.
- Keep receipt checks, but surface them as closure evidence, not as raw task noise.

### 5. Next-Chapter Quality Continuity

Purpose: ensure the next chapter starts from the previous chapter's actual ending, quality findings, and state changes.

Director output:

- `stage`: `handoff`
- `next_chapter_ready`: boolean
- `handoff_summary`: compact current time, place, unresolved action, emotional pressure, state deltas, and next expected move
- `quality_carryover`: only the risks that should affect the next chapter
- `forbidden_repeats`: repeated structures, phrases, or weak moves to avoid

Important behavior:

- Make continuity a first-class handoff, not an incidental context blob.
- Preserve the useful oh-story quality续航 idea, but reduce it to executable next-chapter actions.

## Director Model

The director layer should produce one normalized object for every major novel workflow response:

```json
{
  "stage": "pre_draft",
  "readiness": "ready",
  "primary_action": {
    "key": "generate_prose",
    "label": "生成正文",
    "mode": "automatic"
  },
  "blocking_summary": "",
  "required_repairs": [],
  "deferred_repairs": [],
  "selected_contracts": [
    {
      "key": "story_power",
      "reason": "本章目标/阻碍/动作/反馈需要落地",
      "detail_level": "compact"
    }
  ],
  "prompt_budget_plan": {
    "full": ["chapter_blueprint", "last_chapter_ending"],
    "compact": ["story_power", "character_state", "quality_carryover"],
    "omit": ["longform_structure_contract"]
  },
  "evidence": [
    {
      "key": "chapter_blueprint",
      "status": "ready",
      "source": "chapter.raw_payload.chapter_blueprint"
    }
  ]
}
```

The object is a product contract, not necessarily a database table on day one. It can first be built from existing run payloads and returned in API responses.

## UI Contract

The user should see one main production status, not a pile of competing cards.

Required UI behavior:

- one visible top-level status: `可继续`, `正在自动补齐`, `需要确认`, or `需要修复`;
- one primary button mapped from `primary_action`;
- an expandable "为什么" section for evidence and deferred repairs;
- task center entries grouped by director stage and labelled `自动` or `手工`;
- task entries show start time, end time, status, source stage, and whether they block progress.

The UI should not introduce a new "oh-story director" page. It should make the existing novel workspace calmer.

## Prompt Budget Policy

The director layer should reduce prompt size by ranking context before model calls.

Budget tiers:

- `full`: exact text or full structured object needed for correctness, such as current chapter blueprint, last chapter ending, and unresolved action.
- `compact`: summarized contract or state needed for style or craft direction.
- `reference`: name-only or short reminder, used when the method is relevant but not central.
- `omit`: valid oh-story method deliberately excluded from this call.

Selection rules:

- Project creation can use broad contracts because it creates durable artifacts.
- Prose generation should use only the contracts that affect the current chapter.
- Repair prompts should use only the failed checks and the minimum source evidence needed to fix them.
- UI summaries should never mirror raw model JSON when a compact status can guide the user.

## Automatic Repair Policy

Automatic repair should run before the user sees a blocker when the repair is local and low-risk.

Auto-repair candidates:

- missing chapter blueprint fields derived from existing outline;
- missing scene cards derived from chapter summary and conflict;
- missing role pool entries that do not alter the premise;
- missing timeline/context summaries derived from stored chapters;
- missing quality carry-over summaries derived from previous reviews.

User confirmation required:

- changing the core promise, target reader, genre route, protagonist goal, mainline, or ending direction;
- adding a relationship, antagonist, or faction that changes the story's central conflict;
- replacing an existing chapter title or major outline direction.

## Success Criteria

The director layer is working when:

- a newly created project shows one clear readiness state before writing;
- a chapter with missing repairable materials can run "补齐并继续" without the user hunting for separate buttons;
- unresolved blockers are grouped under one reason and one next action;
- prose prompts include fewer full oh-story contracts while preserving chapter correctness;
- task center records show automatic/manual source, start time, end time, status, and blocking status;
- post-draft results distinguish revision blockers from next-chapter carry-over;
- the user can explain what to click next without reading raw diagnostic payloads.

## Testing Strategy

Server tests:

- director readiness for project seed with complete, auto-repairable, and user-confirmation gaps;
- contract selection avoids full oh-story prompt recall when only compact fragments are needed;
- pre-draft blockers collapse into the canonical blocker categories;
- automatic repair policy does not change core promise fields;
- post-draft diagnosis separates blocking revision findings from carry-over findings.

Web model tests:

- workspace shell shows one top-level status and one primary action;
- task center groups tasks by director stage and labels automatic/manual tasks;
- deferred repairs are hidden behind an expandable detail rather than competing with the main action;
- acceptance desk displays accepted, accepted-with-carryover, and needs-revision states distinctly.

Regression tests:

- existing oh-story contracts still flow into creation and materialization;
- existing delivery receipts are preserved for audit;
- existing unattended workflow can still generate a chapter after auto-repair.

## Out Of Scope

- Do not migrate or rewrite the full novel workspace.
- Do not remove existing oh-story contracts.
- Do not add another visible feature entrance.
- Do not require a new database schema before a response-level director object proves useful.
- Do not solve every real-output quality issue in this slice; this slice builds the orchestration layer that makes those issues easier to target.

## Implementation Slices

1. Director core model: normalize stage, readiness, primary action, blocker categories, selected contracts, prompt budget plan, and evidence.
2. Pre-draft director integration: collapse existing preflight warnings and auto-repair outcomes into the director object.
3. Prompt budget integration: use selected contracts to build compact prose prompts.
4. Task center cleanup: group tasks by director stage and expose automatic/manual/start/end/blocking metadata.
5. Workspace status simplification: show one production status and one primary action.
6. Post-draft director integration: separate revision blockers from next-chapter carry-over.

## Design Decision

Use the director layer approach rather than prompt compression alone. Prompt compression would reduce context length, but it would not fix unclear UI blockers or method over-recall. A full workflow rewrite would be cleaner in theory but too risky for the current working system. The director layer lets MangaForge keep the oh-story investment while making it feel like one decisive production assistant.
