# Novel Entry Workflow Design

Date: 2026-05-22

## Purpose

The novel creation wizard and novel lobby should match the workflow of writing a long-form commercial web novel, not just managing project records.

The product direction for this phase is:

- New books use a commercial long-form launchpad.
- Existing books use the lobby as a daily continuation entry.
- The project list remains available, but it is no longer the primary mental model.

This supports the larger project goal: creating 3,000,000+ word novels with strong subscription potential, where early retention, long-form carrying capacity, and daily continuity matter more than broad tool discovery.

## Current State

### Novel Create Wizard

File: `ui/web/src/components/NovelCreateWizard.tsx`

The current wizard supports three creation modes:

- Manual project creation.
- Quick AI seed generation.
- Deep draft seed generation.

It already has useful seed materialization behavior: seed projects can create outlines, chapters, references, writing bible data, and foreshadowing plans. However, the user-facing steps still read like generic project metadata:

- Basic information.
- Style settings.
- Confirmation.
- Done.

This misses the real decision points for a commercial long-form novel: reader promise, opening hook, protagonist drive, first 30 chapters, and 3,000,000-word structural capacity.

### Novel Lobby

File: `ui/web/src/pages/NovelStudio.tsx`

The current lobby is primarily a project manager:

- Header actions for knowledge base, source cache, memory palace, refresh, and new project.
- Search.
- Project cards.
- Delete and enter actions.

This is useful, but it does not answer the daily writing question:

> What should I continue or fix today?

The lobby should promote continuation and governance before project administration.

## Product Direction

Use option C as the main creation direction and option B as the daily lobby direction:

- **C: Commercial long-form launchpad** for creating new books.
- **B: Writing continuation** for existing projects in the lobby.
- **A: Project manager** retained as a lower-priority list view.

## Design

### 1. New Book Creation

The wizard keeps the existing three creation modes but reframes the steps around the real writing workflow.

#### Step 1: Creative Target

Purpose: establish what kind of book is being opened.

Fields:

- Title.
- Primary genre.
- Sub-genres.
- Target audience.
- Length target.
- Creation mode.
- Optional raw idea.
- Optional model selection for AI-assisted modes.

Behavior:

- Long and epic length targets should be visually emphasized because the current product strategy prioritizes long-form serial writing.
- Manual mode remains available for users who want an empty project.
- Quick AI and deep draft modes remain available and reuse existing seed generation endpoints.

#### Step 2: Commercial Hook

Purpose: make the opening sellable before creating project data.

Fields:

- Reader promise.
- Core selling point.
- Protagonist initial situation.
- Protagonist desire or pressure.
- Opening hook for chapter 1.
- Commercial tags.
- Style tags.

Behavior:

- For AI-assisted modes, normalized seed fields should prefill these fields where possible.
- For manual mode, the fields may be optional in the first implementation, but the confirmation screen must show missing hook risk.

#### Step 3: Long-Form Capacity

Purpose: prevent a book from having only an opening premise with no long-term carrying structure.

Fields:

- Mainline goal.
- Long-term conflict engine.
- Growth or upgrade mechanism.
- Volume direction.
- Expandable asset pool, such as worlds, factions, roles, items, locations, secrets, or business systems.
- Future 100 chapter readiness note.

Behavior:

- AI seed preview should surface volume count, chapter outline count, character count, and foreshadowing count.
- If the target is epic length and long-form fields are mostly empty, show a warning on confirmation.

#### Step 4: First 30 Chapters

Purpose: align project creation with retention and paid-conversion preparation.

Sections:

- Chapters 1-3: opening hook and protagonist commitment.
- Chapters 4-10: trial-read closure and short-term payoff.
- Chapters 11-30: paid-read buildup and escalation.
- First writing task: the next concrete action after entering the workspace.

Behavior:

- If seed data contains chapter outlines, display counts and a compact sample.
- If no seed data exists, show a manual checklist and mark the project as needing first-30 planning after creation.

#### Step 5: Create And Continue

Purpose: confirm whether the project is ready to enter planning.

The confirmation summary should show:

- Sellable premise readiness.
- First 30 chapter readiness.
- Long-form capacity readiness.
- Seed materialization counts when available.
- Missing risks.
- Next action after creation.

Primary action:

- Create project and enter story planning workspace.

Secondary action:

- Create project and stay in lobby.

### 2. Existing Project Lobby

The lobby first screen should become a daily continuation entry rather than only a card grid.

#### Section 1: Continue Writing

Purpose: help the author immediately resume the most relevant book.

Content:

- One featured project.
- Current chapter count.
- Estimated written words when available.
- Length target.
- Current creative stage inferred from available project and chapter data.
- Next action label.

Initial inference rules:

- No chapters: "完善前30章启动计划".
- Has chapter outlines but no chapter text: "生成或撰写第1章".
- Has written chapters: "继续下一章".
- Has draft project without strong seed data: "补商业钩子".

Actions:

- Continue writing.
- Open story planning.
- Open project governance or task center when risk is present.

#### Section 2: Next Governance

Purpose: show what most needs attention before the writer continues scaling the book.

Content:

- Small project-level action cards.
- Each card has one priority action, not a full dashboard.

Initial risk labels:

- "缺前30章计划".
- "缺长线承载".
- "缺读者承诺".
- "已有待复查任务" when this is available from existing data.
- "规划可继续".

First implementation should stay mostly frontend-derived and avoid adding a new backend summary endpoint.

#### Section 3: Project List

Purpose: retain project management without making it the main workflow.

Changes:

- Keep search.
- Keep enter and delete.
- Add compact status signals:
  - Chapter count when loaded or estimated.
  - Length target.
  - Creation mode or seed presence.
  - Risk tags.
  - Next action.

The grid remains useful for browsing, but it appears after continuation and governance.

## Data Flow

### Creation Wizard

Reuse current endpoints:

- `POST /api/novel/project-seed/derive`
- `POST /api/novel/project-seed/finalize`
- `POST /api/novel/projects`
- `POST /api/novel/projects/auto-create`

The create payload should continue storing project seed data in `reference_config.project_seed`. The implementation may enrich the seed with new launchpad fields:

- `reader_promise`
- `core_selling_point`
- `opening_hook`
- `protagonist_pressure`
- `mainline_goal`
- `long_term_conflict`
- `growth_engine`
- `volume_direction`
- `first30_plan`
- `launchpad_risks`
- `first_writing_task`

### Lobby

Use existing project list data first:

- `GET /api/novel/projects`

For first implementation, derive lightweight status from project fields and `reference_config.project_seed`.

The design intentionally does not require a new backend health-summary endpoint in this phase. A later phase can add one to aggregate chapter counts, latest run state, first-30 diagnosis, and long-form governance.

## UI Principles

- Prioritize the user's next writing action over tool discovery.
- Keep the creation wizard practical: it should help open a usable book, not ask for exhaustive lore.
- Do not hide manual creation.
- Do not make the lobby a dense analytics dashboard.
- Use compact risk tags and one recommended action per project.
- Avoid adding another large, unrelated refactor to `NovelStudio.tsx`; extract focused helper functions or subcomponents when the implementation touches repeated logic.

## Implementation Scope

In scope for this phase:

- Reframe `NovelCreateWizard.tsx` steps and labels.
- Add launchpad fields to the wizard state and create payload.
- Update seed application so AI seed output pre-fills launchpad fields when available.
- Change the confirmation screen to show readiness and missing risks.
- Add a continuation section to `NovelStudio.tsx`.
- Add a next-governance section to `NovelStudio.tsx`.
- Keep the project grid but lower its visual priority.
- Add focused tests for pure readiness/next-action helpers if those helpers are extracted.

Out of scope for this phase:

- New backend project health summary endpoint.
- Full project analytics in the lobby.
- Reworking the single-project workspace.
- Replacing the existing seed generation backend prompt.
- Persisted user dashboard customization.

## Testing

Verification should include:

- Web build: `bun run build:web`.
- Server build if payload or shared typing assumptions change: `bun run build:server`.
- Novel smoke if create payload or seed materialization behavior changes: `bun run smoke:novel:local`.
- Pure helper tests if new helper modules are added.
- `git diff --check`.

Manual UI checks should cover:

- Manual project creation.
- Quick AI seed creation path.
- Deep draft seed path.
- Lobby with zero projects.
- Lobby with one project.
- Lobby with multiple projects and search.

## Follow-Up Phase

The next phase can introduce a backend lobby summary endpoint:

- Project chapter count.
- Word count.
- latest run status.
- First-30 diagnosis status.
- Long-form governance summary.
- Pending review tasks.
- Recommended next action.

That API should be added only after the frontend flow proves useful, because the first phase can already improve the writing workflow without expanding backend scope.
