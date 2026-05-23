# Chapter Planning Desk Design

Date: 2026-05-23

## Purpose

The previous cockpit phase made the project workspace answer what should happen next, but the writing loop still needs a stronger pre-draft gate. For a long commercial web novel, the user should not jump directly from "selected chapter" to "generate prose". The system should first answer:

> Is this chapter ready to write, and what scene plan will the model follow?

This phase adds a chapter planning desk inside the existing writing cockpit. The user remains the editor-in-chief. The large model acts as the episode planning team before the draft writer is allowed to produce prose.

## Product Direction

The user selected this direction:

- Commercial long-form creation is the primary workflow.
- Existing projects enter the lobby and prioritize continue-writing and next-governance actions.
- The project list remains a lower-priority project management capability.
- The chapter planning desk should be the next improvement after the static writing cockpit.
- The planning desk should open automatically when the current chapter is not ready to write.

The goal is to reduce tool hunting. The workspace should not ask the user to know whether they need diagnostics, a context package, scene cards, or repair. It should show the current chapter readiness and the next useful action.

## Current State

The codebase already has most of the underlying capabilities:

- `GET /api/novel/chapters/:chapterId/context-package`
- `GET /api/novel/chapters/:chapterId/generation-diagnostics`
- `POST /api/novel/chapters/:chapterId/scene-cards`
- Existing chapter draft generation flow.
- Existing cockpit model and panel.
- Existing workspace center scene card display.
- Existing reference and task panels that expose context package and diagnostic information.

The product gap is orchestration and hierarchy:

- Context package, diagnostics, and scene cards are separate tools.
- The user must infer whether a chapter is ready.
- Scene planning is visible, but not clearly positioned as the required gate before drafting.
- The model's "episode planner" role is implicit.

This phase should reuse existing backend endpoints first. A new backend aggregation endpoint or new model role endpoint is out of scope unless implementation reveals a hard integration blocker.

## Primary Workflow

The target workflow is:

1. User opens an existing novel project.
2. User selects or resumes the current chapter.
3. The cockpit evaluates chapter readiness.
4. If the chapter is not ready, the chapter planning desk expands automatically.
5. The planning desk shows why the chapter is blocked or incomplete.
6. The user runs the recommended action, such as refresh context, inspect diagnostics, or generate scene cards.
7. When the plan is ready, the user reviews the chapter promise and scene cards.
8. The user confirms the plan and proceeds to draft generation or manual writing.

The key rule is:

> Drafting should be downstream of an understandable chapter plan.

## UI Design

The planning desk is embedded in the current writing cockpit. It should not become a new top-level page.

Placement:

- Show after the cockpit's continue-writing and next-governance area.
- Show before the prose editing surface.
- Keep the current workspace center and supporting panels available, but do not make them the primary path for this workflow.

Default expansion behavior:

- Expand automatically when the selected chapter lacks context, lacks scene cards, has material problems, or has generation diagnostics blockers.
- Collapse by default when the selected chapter is ready, while still showing a compact ready state.
- Allow the user to expand it manually at any time.

The planning desk contains three sections.

### Chapter Readiness

This section shows a single readable state:

- `Ready`: the chapter can enter drafting.
- `Needs context`: the context package is missing or insufficient.
- `Needs scene plan`: scene cards are missing or incomplete.
- `Blocked`: diagnostics indicate generation would likely fail or produce poor output.

It should list at most three user-facing reasons. Reasons should be concrete and action-oriented, for example:

- "No context package has been loaded for this chapter."
- "Scene cards are missing."
- "Diagnostics report missing chapter objective."

### Episode Plan

This section displays the planning facts needed before prose:

- Chapter objective.
- Previous chapter handoff.
- Core conflict.
- Emotional movement.
- Payoff or reader reward.
- Ending hook.
- Forbidden repetition or continuity constraints.

The first implementation can render existing context package fields. It does not need a full editor for these fields.

### Scene Cards

This section summarizes the current scene cards with only pre-draft essentials:

- Scene purpose.
- Conflict.
- Turn or reveal.
- Ending hook.

The controls are:

- Refresh context package or inspect diagnostics.
- Generate or refresh scene plan.
- Confirm plan and enter draft.

The primary action changes based on readiness:

- Missing context: refresh context or inspect diagnostics.
- Missing scene cards: generate scene plan.
- Blocked diagnostics: view diagnostics.
- Ready: confirm plan and enter draft.

## Frontend Model

Add a frontend-level planning desk model around existing chapter data and API results. This keeps the UI behavior testable without tying the first iteration to a new backend orchestration contract.

The model should expose:

- `contextPackageStatus`: whether context exists and is sufficient for planning.
- `scenePlanStatus`: whether usable scene cards exist.
- `plannerReadiness`: `ready`, `needs_context`, `needs_scene_plan`, or `blocked`.
- `plannerReasons`: up to three user-facing reasons.
- `recommendedPlannerAction`: the next primary action.
- `shouldAutoExpandPlanner`: whether the planning desk opens automatically.

This model should be a small, pure unit where possible. The React component should mostly render model output and invoke existing workspace handlers.

## Data Flow

The first implementation should use the existing client-side workspace state and existing handlers:

1. Load selected chapter.
2. Load or use available context package and generation diagnostics.
3. Read existing scene cards from chapter state.
4. Build planning desk status from those inputs.
5. Render the planning desk inside the cockpit.
6. Invoke existing handlers for diagnostics, scene card generation, and draft generation.

No new persistence is required for the planning confirmation in this phase. "Confirm plan and enter draft" routes the user into the existing draft action for the selected chapter. It should not create a separate persisted confirmation state.

## Error Handling

The planning desk should stay visible when an action fails.

Expected failure behavior:

- Context load failure: show a concise error and keep the next action on diagnostics or refresh.
- Scene card generation failure: show the error and keep the desk expanded.
- Diagnostics blocker: show blocker summary and link to the existing diagnostics view.
- No active chapter: show a neutral empty state instead of action buttons.

The UI should not imply that drafting is ready when required context or scene cards are missing.

## Out Of Scope

This phase will not add:

- A new top-level planning page.
- A full scene card editor.
- A new backend "episode planner" endpoint.
- A new model role routing system.
- Changes to the novel lobby or new-book creation flow unless required for integration.
- Silent automatic canon changes after plan confirmation.

## Testing

Add or extend pure model tests for:

- No active chapter.
- Missing context package.
- Insufficient context package.
- Missing scene cards.
- Diagnostics blocker.
- Ready chapter with usable context and scene cards.
- Auto-expand rules for blocked and ready states.
- Recommended action selection.

Run the related verification commands before implementation completion:

- `bun run test:writing-cockpit`
- `bun run test:planning-workspace`
- `bun run build:web`
- `git diff --check`

If visual browser testing is available, manually inspect the cockpit in the local app and confirm that the planning desk does not make the page more chaotic.

## Acceptance Criteria

The phase is complete when:

- Opening a chapter clearly shows whether it is ready to write.
- Chapters that lack context, scene cards, or diagnostics readiness automatically expose the planning desk.
- The user can see the next recommended action without hunting through multiple panels.
- Existing context package, diagnostics, and scene card capabilities are presented as one coherent episode-planning workflow.
- A ready chapter presents "confirm plan and enter draft" as the natural next step.
- Existing writing cockpit and planning workspace tests still pass.
