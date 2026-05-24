# Chapter Acceptance Desk Design

Date: 2026-05-24

## Purpose

The writing cockpit now supports a pre-draft chapter planning desk. That gives the writer a clearer path from selected chapter to context package, scene plan, and draft generation. The next product gap is the post-draft loop:

> A chapter with prose is not necessarily a finished chapter.

For a long commercial web novel, especially a 3,000,000+ word project, the daily workflow needs a strict handoff gate after drafting. The system should tell the user whether the current chapter can be submitted, what must be repaired, and whether story state has been synchronized before moving to the next chapter.

This phase adds a chapter acceptance desk inside the existing writing cockpit. The user remains the editor-in-chief. The model team acts as revision editor, continuity auditor, and state synchronization assistant.

## Product Direction

The user selected strict submission gating:

- Drafting speed is not enough.
- Existing prose must pass quality, revision, and state synchronization before the chapter is considered delivered.
- The cockpit should guide the user through one next action instead of exposing scattered review tools equally.

The target daily loop becomes:

1. Select chapter.
2. Plan chapter.
3. Generate or write draft.
4. Review quality.
5. Generate editor report.
6. Revise.
7. Recheck.
8. Synchronize story state.
9. Accept chapter and move to the next chapter.

## Current State

The codebase already has the required building blocks:

- `GET /api/novel/chapters/:chapterId/quality-card`
- `POST /api/novel/chapters/:chapterId/prose-quality`
- `POST /api/novel/chapters/:chapterId/editor-report`
- `POST /api/novel/reviews/:reviewId/apply-revision`
- `GET /api/novel/projects/:id/story-state`
- `PUT /api/novel/projects/:id/story-state`
- Existing chapter version history and version merge flow.
- Existing story state synchronization during revision and full production flow.
- Existing `WritingCockpitPanel` and `writingCockpitModel`.

The gap is orchestration:

- Quality cards, prose quality reviews, editor reports, revisions, story state, and version history are separate tools.
- The cockpit currently says a prose chapter should be reviewed, but it does not describe the submission state.
- The user must infer whether the chapter is ready to move on.
- Existing story state synchronization is available, but not clearly represented as a delivery gate.

This phase should reuse existing endpoints and handlers first. A new backend aggregation endpoint or new acceptance persistence table is out of scope for the first iteration.

## Primary Workflow

The cockpit should switch between two desk modes:

- No prose: show the existing chapter planning desk.
- Has prose: show the new chapter acceptance desk.

When a chapter has prose, the acceptance desk evaluates the chapter's delivery state:

1. If there is no quality review, recommend rechecking the current version.
2. If quality is low or must-fix issues exist, recommend generating an editor report.
3. If an editor report exists with must-fix issues, recommend generating a revision.
4. If a revision exists but the current version has not been rechecked, recommend rechecking the current version.
5. If quality is acceptable but story state is behind, recommend synchronizing story state.
6. If quality is acceptable and story state is synchronized, recommend accepting the chapter and moving to the next chapter.

The key rule is:

> A prose chapter is not complete until it passes quality and continuity gates.

## UI Design

The acceptance desk is embedded in the writing cockpit. It is not a new top-level page.

Placement:

- Same cockpit area as the planning desk.
- Show the planning desk for chapters without prose.
- Show the acceptance desk for chapters with prose.
- If a prose chapter also has context or diagnostics problems, the acceptance desk still takes priority because the job has shifted from drafting to review and delivery.

The acceptance desk contains three sections.

### Submission Status

This section shows one clear status:

- `Needs quality check`: prose exists but no current quality review is available.
- `Needs revision`: quality is below threshold or must-fix issues exist.
- `Needs recheck`: a revision exists and the current version needs a fresh quality pass.
- `Needs state sync`: quality is acceptable, but story state is behind the chapter.
- `Ready to accept`: quality is acceptable and story state is synchronized.
- `Delivered`: chapter has already been accepted by inferred state.

The first implementation can infer delivered state from chapter status, review records, and story state. It does not need a new persistent acceptance table.

### Editorial Summary

This section shows the most important review facts:

- Latest quality score.
- Latest quality status.
- Up to five must-fix issues.
- Up to five optional improvements.
- Latest editor report summary.
- Latest revision summary.
- Story state sync position.

The desk should summarize. It should not embed full reports.

### Delivery Actions

The desk should expose one primary next action:

- Recheck current version.
- Generate editor report.
- Generate revision.
- Recheck after revision.
- Synchronize story state.
- Accept and move to next chapter.

Secondary actions can be compact:

- View quality card.
- View editor reports.
- Open version history.

The action naming should be explicit. For example, use "复检当前版本" instead of a vague "检查".

## Frontend Model

Add a frontend-level `chapterAcceptanceDesk` model around existing chapter data and review records.

The model should expose:

- `visible`: whether the desk should render.
- `acceptanceStatus`: `hidden`, `needs_quality_check`, `needs_revision`, `needs_recheck`, `needs_state_sync`, `ready_to_accept`, or `delivered`.
- `statusLabel`: user-facing label.
- `acceptanceReasons`: up to three user-facing reasons.
- `qualityScore`: latest available quality score, if any.
- `qualityStatus`: latest quality review status, if any.
- `mustFix`: top must-fix issues.
- `optionalImprovements`: top optional improvements.
- `latestEditorReportSummary`: short report summary.
- `latestRevisionSummary`: short revision summary.
- `storyStateSynced`: whether story state is synchronized through this chapter.
- `recommendedAcceptanceAction`: next primary action.
- `shouldAutoExpandAcceptance`: whether the desk should open by default.

The model should be pure and testable, following the existing `writingCockpitModel` pattern.

## Data Flow

The first implementation should use existing workspace state and handlers:

1. Load selected chapter and review records through the existing workspace data hook.
2. Build `chapterAcceptanceDesk` from the active or target chapter, relevant reviews, and project story state.
3. Render the acceptance desk in `WritingCockpitPanel` when `visible` is true.
4. Invoke existing handlers for quality card, prose quality refresh, editor report creation, revision application, story state editor/sync, version history, and next chapter selection.

Review selection rules:

- The latest `prose_quality` review for the chapter is the quality source.
- The latest `editor_report` review for the chapter is the editor report source.
- The latest `editor_revision` review for the chapter is the revision source.
- A review belongs to a chapter when its payload includes the matching `chapter_id`.
- If no review payload is parseable, ignore that review for this desk rather than failing the cockpit.

## Behavior Rules

### No Prose

If the chapter has no prose, `chapterAcceptanceDesk.visible` is false. The cockpit continues to show the planning desk.

### Needs Quality Check

If prose exists but there is no quality review for the chapter, the primary action is `refresh_current_quality`.

### Needs Revision

If the latest quality score is below the threshold or the latest quality review has high-severity issues, the primary action is `create_editor_report`.

The first threshold should follow existing project conventions:

- Score below 78 means revision is required.
- Any must-fix issue means revision is required.

### Needs Recheck

If a revision exists after the latest quality review, the primary action is `refresh_current_quality`.

This avoids treating a revised chapter as accepted without rechecking the current text.

### Needs State Sync

If quality is acceptable but story state is behind the current chapter number, the primary action is `sync_story_state`.

The first implementation may route this to the existing story state editor if there is no safe existing automatic endpoint for single-chapter sync.

### Ready To Accept

If quality is acceptable and story state is synchronized through the current chapter, the primary action is `accept_chapter_and_continue`.

This action should move the user to the next unwritten or next planned chapter. It should not silently write new canon.

## Error Handling

The acceptance desk should remain visible when actions fail.

Expected behavior:

- Quality refresh failure: show the existing error message and keep primary action on quality refresh.
- Editor report failure: show the existing error message and keep primary action on editor report.
- Revision failure: show the existing error message and keep primary action on revision.
- Story state sync/editor failure: show the existing error message and keep primary action on story state sync.
- No next chapter after acceptance: keep the current chapter selected and show that the current chapter is ready.

## Out Of Scope

This phase will not add:

- A new top-level acceptance page.
- A new backend acceptance aggregation endpoint.
- A new persistent chapter acceptance table.
- A new production pipeline mode.
- A full report editor.
- Automatic silent canon updates after acceptance.
- Batch chapter acceptance.

## Testing

Add or extend pure model tests for:

- No prose hides the acceptance desk.
- Prose with no quality review needs quality check.
- Low score needs revision.
- Must-fix issues need revision.
- Editor report with must-fix issues recommends revision.
- Revision after quality review needs recheck.
- Quality pass with stale story state needs state sync.
- Quality pass with synchronized story state is ready to accept.
- Accepted prose chapter does not route back to draft generation.

Run the related verification commands before implementation completion:

- `bun run test:writing-cockpit`
- `bun run test:planning-workspace`
- `bun run build:web`
- `git diff --check`

## Acceptance Criteria

The phase is complete when:

- A prose chapter shows an acceptance desk instead of the planning desk.
- The cockpit clearly tells the user whether the chapter can be submitted.
- The user sees one primary next action for the chapter's delivery state.
- Quality, editor report, revision, recheck, state sync, and next chapter navigation are represented as one coherent workflow.
- The implementation reuses existing backend capabilities.
- Existing writing cockpit and planning workspace tests still pass.

