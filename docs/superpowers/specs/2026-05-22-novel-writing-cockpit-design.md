# Novel Writing Cockpit Design

Date: 2026-05-22

## Purpose

The next product step is to make the project feel closer to real long-form novel creation. The current workspace already has many strong tools, but daily use still asks the writer to know which panel to open and which operation to trigger.

The new direction is:

- The user acts as editor-in-chief and final decision maker.
- The large model acts as a creative team, not a single generic generate button.
- The default project workspace answers: what should be written today, why, and is the material ready?

This phase should reduce tool hunting and turn scattered capabilities into a daily chapter-writing loop.

## Current State

The project already contains the main building blocks:

- Novel lobby with continue-writing and governance priority.
- Planning workspace with mainline, volume, future route, and planning health.
- Production guide, production desk, context package, quality gate, version merge, memory palace, writing bible, story state, and long-form governance.
- Chapter, outline, worldbuilding, character, run history, and repair workflows.

The remaining product gap is not lack of capability. The gap is orchestration:

- The user must manually connect planning, context package, generation, review, revision, and state updates.
- The model roles are implicit. The UI does not clearly say when the model is acting as editor, planner, writer, reviewer, or operator.
- The workspace still exposes many panels before it gives the writer a single next action.

## Product Principle

Use a three-layer workspace model.

### Layer 1: Daily Writing Cockpit

This is the default entry after opening an existing project. It focuses on the next chapter and daily writing flow.

It should show:

- Current chapter target.
- Previous chapter ending.
- Current volume goal.
- Must-advance beats.
- Forbidden repeats.
- Relevant character and world state.
- Memory palace highlights.
- Material readiness.
- Primary actions: prepare context, generate draft, revise draft, confirm chapter, move to next chapter.

The cockpit should not expose every tool equally. It should surface the tools only when they are needed for the current chapter.

### Layer 2: Editor Governance

This layer is used periodically, not every writing minute.

It should answer:

- Is the current volume drifting?
- Is the protagonist growth still moving?
- Are payoffs, hooks, and reader promises still active?
- Are future 10 chapters planned?
- Are long-form capacity, character pool, and conflict ladder still healthy?
- Is the story state behind the actual written chapters?

This layer can reuse the existing planning workspace and long-form governance modules.

### Layer 3: Source And Memory System

This layer contains writing bible, memory palace, reference engineering, worldbuilding, characters, outlines, and source cache.

These should stay accessible, but they should become support systems that the cockpit automatically reads from. The user should not need to manually inspect them before every chapter unless the cockpit reports a blocking issue.

## Model Roles

The product should make model responsibility explicit.

### Chief Editor

The chief editor model decides the next meaningful writing action.

Inputs:

- Writing bible.
- Story state.
- Current volume plan.
- Recent chapters.
- Open risks from governance.
- User intent.

Outputs:

- Recommended next chapter.
- Reason for the recommendation.
- Blocking issues.
- Required preparation.
- Acceptance criteria for the next draft.

### Episode Planner

The episode planner model turns the next chapter into a usable scene plan.

Inputs:

- Chief editor recommendation.
- Current chapter outline.
- Previous chapter ending.
- Character state.
- Volume goal.
- Must-advance and forbidden-repeat lists.

Outputs:

- Chapter promise.
- Scene list.
- Conflict escalation.
- Hook placement.
- Required payoff.
- Continuity constraints.

### Draft Writer

The draft writer model only writes prose.

Inputs:

- Locked context package.
- Scene plan.
- Style lock.
- Safety and reference constraints.

Outputs:

- Chapter draft.
- Scene breakdown.
- Continuity notes.

It should not invent new long-term canon unless the context package explicitly allows it.

### Revision Editor

The revision editor model improves the draft after generation.

Inputs:

- Draft.
- Chapter acceptance criteria.
- Quality gate result.
- User notes.

Outputs:

- Revised draft.
- Change summary.
- Remaining issues.

Revision should focus on rhythm, emotion, clarity, payoff, hook strength, and voice alignment.

### Continuity Auditor

The continuity auditor model checks the draft against canon.

Inputs:

- Draft.
- Memory palace.
- Story state.
- Character state.
- Chapter outline.
- Previous chapters.

Outputs:

- Contradictions.
- Missing setup.
- Premature reveals.
- State updates required after acceptance.

### Operations Analyst

The operations analyst model evaluates serial-writing health.

Inputs:

- Chapter and volume metrics.
- Quality trend.
- Future route.
- Long-form pressure test.
- Reader promise and commercial tags.

Outputs:

- Retention risks.
- Volume drift warnings.
- Pacing issues.
- Suggested governance tasks.

## Primary Workflow

The cockpit flow should be:

1. Open project.
2. Show next recommended writing action.
3. User reviews readiness.
4. If blocked, user clicks the blocking task, such as fill current volume goal or update story state.
5. If ready, user generates or refreshes the context package.
6. User asks the episode planner to prepare the scene plan.
7. User asks the draft writer to generate chapter draft.
8. User runs continuity and quality checks.
9. User accepts, revises, or sends back for rewrite.
10. Accepted chapter updates story state, memory palace, run history, and next chapter recommendation.

The user remains in control at each gate. The model can recommend and draft, but it should not silently advance canon.

## UI Design

### Default Workspace Top

The top of the project workspace should lead with a compact writing status band:

- Project title.
- Current chapter.
- Current volume.
- Written words.
- Model role currently active.
- Next recommended action.

Primary button:

- If blocked: resolve the most important blocker.
- If ready: generate next chapter draft.
- If draft exists: review and revise.
- If accepted: move to next chapter.

### Writing Cockpit Panel

The cockpit panel should have five sections.

#### 1. Next Chapter

Shows:

- Chapter number and title.
- Chapter goal.
- Previous ending.
- Expected ending hook.
- Why this chapter matters.

#### 2. Readiness

Shows checks as pass, warning, or blocker:

- Writing bible present.
- Current volume goal present.
- Chapter outline present.
- Context package fresh.
- Story state aligned with latest accepted chapter.
- Memory palace available.
- Required characters and setting entities resolved.
- No known continuity blockers.

#### 3. Model Team

Shows role-based actions:

- Ask chief editor.
- Build scene plan.
- Write draft.
- Review draft.
- Fix continuity.
- Update canon.

Only the next recommended role should be visually primary.

#### 4. Draft Pipeline

Shows current draft state:

- No draft.
- Draft generated.
- Review failed.
- Revision ready.
- Accepted.

It should link to version detail and merge tools, but not make them the first thing the user sees.

#### 5. Canon Update

Shows what will be written back after acceptance:

- Story state changes.
- Memory palace facts.
- Character position changes.
- Foreshadowing status changes.
- Volume progress changes.

## Data Flow

### New Pure Model

Add a frontend model for the cockpit.

Inputs:

- Project.
- Chapters.
- Outlines.
- Writing bible.
- Story state.
- Memory palace summary.
- Production dashboard.
- Quality trends.
- Active runs.

Outputs:

- Current chapter candidate.
- Readiness checks.
- Recommended role.
- Primary action.
- Visible warnings.
- Canon update preview.

This keeps UI rendering separate from workflow reasoning and makes the cockpit testable.

### Backend Aggregation

Add or reuse an endpoint that returns a cockpit payload for one project.

It should aggregate:

- Project and writing aggregates.
- Current unwritten or active chapter.
- Previous written chapter.
- Current volume outline.
- Writing bible summary.
- Story state summary.
- Memory palace project summary.
- Production and quality status.
- Active run status.

The endpoint should avoid generating content. It only prepares state for the UI and model-role actions.

### Model Role Calls

Existing generation endpoints can remain, but the UI should call them through role-labeled actions.

The first implementation can map roles to existing capabilities:

- Chief editor -> planning health and governance summary.
- Episode planner -> context package plus chapter outline/scenes.
- Draft writer -> existing chapter prose generation.
- Revision editor -> existing revision/version merge.
- Continuity auditor -> existing quality gate, continuity checks, memory verification.
- Operations analyst -> existing production dashboard, long-form governance, quality trends.

## Error Handling

The cockpit should distinguish:

- Blocking material gaps: the user must fill or generate missing planning data.
- Generation failures: retry, inspect run, or change model.
- Continuity failures: revise draft or update story state.
- Stale data: refresh cockpit payload.
- Memory palace unavailable: allow writing, but show reduced continuity confidence.

Errors should be attached to the next action, not shown as generic stack traces.

## Testing

Add focused tests for:

- Cockpit model chooses an unwritten planned chapter before creating new future chapters.
- Cockpit model prioritizes blockers before draft generation.
- Ready chapter selects draft writer as primary role.
- Existing draft selects review or revision role.
- Accepted chapter selects canon update or next chapter.
- Memory palace absence downgrades confidence without blocking draft generation.

Backend tests should cover:

- Cockpit payload returns previous chapter, current candidate, volume summary, and memory summary.
- Deleted projects do not appear in memory-backed cockpit payloads.
- Empty projects return launchpad/planning actions instead of write actions.

## Rollout

Implement in three increments.

### Increment 1: Cockpit Model And Static UI

Add the pure frontend model and a cockpit panel in the project workspace. Use existing loaded data first. No new model generation behavior is required.

Goal: the user can open a project and see the next writing action and blockers.

### Increment 2: Cockpit Payload Endpoint

Move aggregation into a backend endpoint so the cockpit can rely on a consistent project state.

Goal: the UI no longer needs to manually infer all writing state from scattered panels.

### Increment 3: Role-Based Model Actions

Wire role buttons to existing generation, review, revision, and governance endpoints.

Goal: the user experiences the model as a creative team with clear responsibility and handoffs.

## Non-Goals

This phase should not:

- Redesign the entire workspace navigation.
- Remove existing advanced tools.
- Build a fully autonomous publish pipeline.
- Let the model silently accept canon changes.
- Force all users into automatic writing.

The goal is to make daily writing coherent while preserving manual control.

## Success Criteria

The design succeeds when:

- Opening a project immediately answers what to do next.
- The user can generate and revise a chapter without hunting across unrelated panels.
- The model's current role is visible and understandable.
- Missing materials are shown as concrete blockers.
- Accepted drafts update canon intentionally.
- Advanced tools remain available but no longer dominate daily writing.
