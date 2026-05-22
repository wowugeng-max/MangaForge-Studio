# Novel Planning Workspace Design

Date: 2026-05-22

## Purpose

The novel project workspace currently exposes many powerful functions, but too many of them appear at the same level. For a long-form web novel workflow, especially a 3,000,000+ word project targeting strong subscription performance, the workspace should first answer:

> Where should this story go next?

The first screen should prioritize long-form story planning, volume control, and mainline progression. Chapter writing, quality checks, production operations, references, and delivery remain available, but they should not compete with the main planning surface.

## Primary User Priority

The project should optimize the opening workspace for:

- Long-form planning over immediate editing.
- Mainline and volume control over raw chapter directory browsing.
- Clear next creative action over broad tool discovery.
- Story health signals over operational metrics.

The user selected this priority explicitly:

- First-screen mode: long-form planning.
- Highest-priority planning content: mainline and volume progression.

## Current Functional Inventory

### Daily Writing

- Current chapter editor.
- Autosave and version history.
- Current chapter prose generation.
- Scene card generation.
- Context repair before generation.
- Chapter metadata editing.
- Chapter quality card and editor report.

### Long-Form Continuity

- Writing bible.
- Story state machine.
- Worldbuilding.
- Characters.
- Outlines.
- Volume and stage goals.
- Future 10-chapter rolling plan.
- Future 100-chapter skeleton.
- Foreshadowing, item, and relationship tracking.

### Commercial Quality

- First 30-chapter retention diagnosis.
- Book review.
- Continuity audit.
- Consistency graph.
- Mechanical QA.
- Propagation debt.
- Similarity report.
- Reference migration plan.
- Quality benchmark and version review.

### Production Operations

- Production desk.
- Chapter group generation.
- Run queue.
- Task center.
- Background worker controls.
- Cost and quality metrics.
- Long-form production trends.
- Agent audit.
- Model diagnostics.
- Approval policy.

### Reference And Delivery

- Reference project configuration.
- Reference engineering overview.
- Reference knowledge diagnosis.
- Export delivery.
- Backup snapshot.
- Full project backup package import/export.

## Information Architecture

The workspace should be organized into five work areas.

### 1. Story Planning

This is the default workspace and the project opening screen.

It contains:

- Mainline and volume control dashboard.
- Future 10-chapter rolling plan.
- Future 100-chapter skeleton.
- Outline tree.
- Long-form pressure test.
- Topic validation.

### 2. Chapter Writing

This area contains daily drafting and revision work.

It contains:

- Current chapter editor.
- Current chapter generation.
- Scene cards.
- Material diagnosis.
- Context repair and generate.
- Chapter management.
- Version history.

### 3. Story Assets

This area contains long-lived creative assets.

It contains:

- Writing bible.
- Story state machine.
- Worldbuilding.
- Characters.
- Foreshadowing, items, and relationship state.
- Creative cards center.
- Reference configuration.
- Reference engineering overview.

### 4. Quality Revision

This area contains post-writing checks and repair workflows.

It contains:

- Current chapter quality card.
- Editor report.
- Review annotations.
- Book-level continuity audit.
- Consistency graph.
- First 30-chapter retention diagnosis.
- Mechanical QA.
- Similarity detection.
- Reference migration plan.

### 5. Production Operations

This area contains low-frequency but important operational tools.

It contains:

- Production desk.
- Chapter groups.
- Task center.
- Run queue.
- Cost and quality dashboard.
- Long-form production trends.
- Agent audit.
- Model diagnostics.
- Approval policy.
- Backup, import, export, and delivery.

## Opening Screen Design

The default project screen should become a mainline progression cockpit rather than a prose editor or a tool index.

### Top Status Bar

The top bar should show the project's current strategic position:

- Current volume.
- Current stage, such as setup, escalation, payoff, or resolution.
- Current chapter.
- Written words versus target words.
- Future planning coverage, including future 10 and future 100 availability.
- Long-form health status, such as healthy, drifting, or needs planning.

The top bar should keep actions minimal:

- Refresh.
- Enter current chapter writing.

Model selection and low-frequency configuration can remain accessible, but they should not dominate the first-screen visual hierarchy.

### Mainline And Volume Panel

This is the largest central area on the opening screen.

It should show:

- Whole-book reader promise.
- Current volume goal.
- Current stage conflict.
- Stage-level payoff model.
- Previous key turn.
- Next key turn.
- Whether the current chapter serves the current volume goal.
- Main risks, such as stalled mainline, unclear target, weak motivation, or missing turn.

This panel should answer whether the story is still moving in the intended long-form direction.

### Future 10-Chapter Route

This should appear below the mainline and volume panel.

Each chapter row should show only planning-critical information:

- Chapter number and title.
- Chapter task.
- Mainline progression.
- Emotion or payoff.
- Ending hook.
- Risk tags.

Selecting a row should open the chapter writing area with that chapter's planning context already in focus.

### Volume Structure Tree

The first screen should show a higher-level structure than the full outline tree:

- Volume.
- Stage.
- Key turn.
- Chapter range.
- Current position.

The complete outline tree remains available as a secondary action, but it should not take over the opening screen.

### Planning Health Sidebar

The right sidebar should show only issues that affect future writing:

- Mainline progression is weak.
- Volume goal is missing.
- Foreshadowing lacks recovery plan.
- Character growth line is stalled.
- Future 10 chapters are missing chapter tasks.
- Writing bible lacks important fields.
- Story state is stale.

Each issue should have a direct action, such as:

- Complete volume goal.
- Generate future 10 chapters.
- Check character line.
- Open story assets.
- Update story state.

### Chapter Directory

The chapter directory remains available, but it should be demoted from creative guidance to navigation.

It should focus on:

- Selecting chapters.
- Creating chapters.
- Showing written/unwritten state.
- Jumping into the chapter writing area.

It should not carry the main planning responsibility.

### Low-Frequency Planning Entrances

The following should be folded under secondary planning actions:

- Future 100-chapter skeleton.
- 3,000,000-word long-form pressure test.
- Topic validation.
- Genre template library.
- Reference knowledge diagnosis.

## First-Screen Primary Actions

The planning screen should expose only three primary actions:

- Update rolling plan.
- Complete current volume planning.
- Enter current chapter writing.

All other actions should be placed in the five work areas.

## Expected User Flow

1. User opens a novel project.
2. The workspace shows the current volume, stage, chapter, future planning coverage, and long-form health.
3. User checks whether the mainline and current volume are still coherent.
4. User reviews the future 10-chapter route.
5. If planning is weak, user completes current volume planning or updates the rolling plan.
6. If planning is acceptable, user enters the current chapter writing area.
7. After drafting, user uses quality revision or production operations only when needed.

## Design Constraints

- The first screen must not become another button grid.
- Tool names should be grouped by creative intent, not backend capability.
- The opening screen should prefer status, direction, and next action over raw controls.
- The editor must stay one click away.
- Existing production, reference, quality, and delivery tools should remain accessible.
- The design should reuse existing project data and routes where possible.
- This design is a planning and IA change; implementation should be staged separately.

## Out Of Scope For This Spec

- Changing backend generation logic.
- Removing existing tools.
- Redesigning the project lobby.
- Changing data schemas unless implementation later proves a small derived field is necessary.
- Implementing visual polish before the IA and workflow are validated.

## Implementation Notes For Later Planning

Potential implementation units:

- Add a story planning workspace mode to `NovelProjectWorkspace`.
- Extract the current top workflow menus into five work areas.
- Build a mainline and volume planning panel from writing bible, outlines, chapters, and story state.
- Build a future 10-chapter route panel using rolling plan and outline data.
- Replace the right reference panel's default role with planning health when in Story Planning.
- Keep current editor and production surfaces reachable without deleting existing functionality.

These are notes only. A separate implementation plan should be written after this design is reviewed and approved.

## Self-Review

- No known placeholder fields remain.
- The scope is limited to workspace information architecture and first-screen planning design.
- Existing functionality is preserved and regrouped rather than removed.
- The design consistently prioritizes mainline and volume planning over immediate chapter editing.
