# Longform Serial Cockpit V1 Design

Date: 2026-06-11

## Purpose

The novel workspace already has many advanced long-form creation capabilities: core contract checks, chapter handoff, storylines, story-unit governance, reader expectation reviews, first-30-chapter retention, readability reviews, innovation checks, asset intake, batch guardrails, and repair tasks.

The next product gap is not another isolated model check. The gap is daily orchestration.

For a 3,000,000 to 10,000,000 word serial novel, the writer should be able to open the workspace and know within a few seconds:

- What must be done today.
- Whether the current chapter is ready to write, revise, or accept.
- Whether the story core is drifting.
- Whether reader-pull, story drive, innovation, and serial safety are healthy.
- Whether batch generation is blocked, limited to one chapter, or safe for a small range.

This phase upgrades the existing `AutoCreationDirectorWorkspace` into a simpler longform serial cockpit. It should make the existing capability feel like a real AI creation pipeline rather than a feature showcase.

## Product Principle

The cockpit should behave like a working commercial serial desk:

- One visible next action.
- Few primary buttons.
- Clear production order.
- Strong distinction between AI-calling actions and navigation actions.
- Detailed evidence available on demand, but collapsed by default.

The user remains the final editor. The system can recommend, draft, review, and repair, but it should not silently advance canon or bypass quality gates.

## External Context

Recent network-fiction and AI-writing trends reinforce the same direction:

- Long-form AI writing quality is increasingly evaluated across story coherence, character consistency, readability, plot progression, and reader engagement, not just local prose quality.
- Commercial web-fiction success depends on repeated reader return: opening hook, chapter promise, payoff rhythm, cliffhanger, novelty, and stable long-term direction.
- IP conversion paths such as short drama, comics, and derivative media reward memorable scenes, clear hooks, and strong character/setting assets.

The cockpit therefore prioritizes `core stability + story drive + reader pull + innovation/IP scene + serial safety`.

## Scope

### In Scope

- Refactor the first screen of `AutoCreationDirectorWorkspace`.
- Reuse existing data from `autoCreationDirectorModel`.
- Add a compact `Longform Serial Cockpit` model layer if useful, derived from existing model fields.
- Make `todayCommandDeck` the dominant first-screen unit.
- Add a clearly named `万订五项护栏` summary using existing evidence.
- Add a compact current-chapter production chain:
  - Chapter handoff.
  - Pre-draft brief.
  - Draft.
  - Quality revision.
  - Story-state sync.
  - Delivery acceptance.
- Add a compact batch-writing license summary:
  - Blocked.
  - Single chapter only.
  - Batch allowed.
- Add a `待处理风险` cluster that summarizes open delivery risks, storyline risks, expectation debts, retention recheck, new asset intake, and batch repair needs.
- Improve button states:
  - AI/model-call buttons are visually distinct.
  - Only the clicked action shows loading.
  - Other actions are disabled or muted while a model call is running.
- Keep detailed panels available under an expanded evidence drawer.
- Update tests around the model and shell rendering.
- Update `docs/novel-usage-guide.md` after implementation.

### Out Of Scope

- No new database tables.
- No new backend long-running generation chain.
- No change to Claude/AnyRouter provider debugging.
- No automatic external hot-meme crawling.
- No new independent top-level workspace page.
- No hard gate that claims a novel is guaranteed to reach 10,000 average subscriptions.

## Target User Flow

1. User opens the novel workspace.
2. The cockpit shows one primary command, such as:
   - `先清交稿风险`
   - `补长线材料`
   - `生成开写任务书`
   - `生成初稿`
   - `修订当前章`
   - `同步故事状态`
   - `放行下一批`
3. The user sees five quality guardrails at the top:
   - Core stability.
   - Story drive.
   - Reader pull.
   - Innovation/IP scene.
   - Serial safety.
4. The user sees the current chapter's production chain and current active step.
5. The user sees the batch license:
   - Do not continue.
   - Write one chapter only.
   - Safe to generate a small batch.
6. If risk exists, the user opens `待处理风险` and jumps to the correct repair area.
7. Detailed modules remain available in the evidence drawer.

## Information Architecture

### First Screen

The first screen should contain four primary areas.

#### 1. Daily Command

This is the dominant top unit.

It shows:

- Production mode.
- Current step.
- One primary action.
- Short reason list.
- Batch release summary.
- AI-call indicator if the action calls a model.

It should use `todayCommandDeck.action` as the primary action source.

#### 2. Five Subscription Guardrails

The guardrails convert scattered checks into a business-readable summary:

- `核心不偏移`: derived from core contract, longform compass, core drift delivery risks, and runway red lines.
- `故事驱动力`: derived from story-drive review, current chapter launch gate, protagonist choice/obstacle/cost/state-change risks, and story-unit execution.
- `读者追读`: derived from reader expectation, reader payoff, first-30 retention, ending-hook readiness, and chapter attraction review.
- `创新/IP场面`: derived from innovation review, signature-scene review, style/sample risks, and volume beat budget.
- `连载安全`: derived from canon sync, storyline sync, asset intake, batch guardrail, production license, and delivery risk gate.

Each guardrail has:

- Status: `ok`, `warn`, or `block`.
- Label.
- One-line detail.
- Optional count.
- Action target.

No new backend data is required for V1. The model can derive these from existing fields.

#### 3. Current Chapter Chain

This is a compact horizontal or vertical sequence:

- `交接`
- `任务书`
- `初稿`
- `质检`
- `状态同步`
- `交稿`

Each step shows:

- Done/current/warn/block/pending state.
- One-line reason.
- Action target.

The current step can be inferred from:

- `writing.chapterHandoff`.
- `writing.preDraftBrief`.
- chapter prose existence.
- quality/review status.
- story-state sync status.
- `chapterAcceptanceDesk.readyToAccept` and delivery risk state.

#### 4. Risk Queue

The first screen should not show every risk panel. It should show one compact risk cluster:

- `待修复 N`
- `剧情线 N`
- `期待欠账 N`
- `留存需复诊`
- `新资产 N`
- `批次风险 N`

Clicking the cluster opens the task center, quality workspace, story assets, or planning workspace depending on the source.

### Evidence Drawer

Existing detailed sections should remain, but default to collapsed:

- AI longform creation pipeline.
- Longform battle desk.
- Serial production rail.
- Production license.
- Daily battle plan.
- Million-word runway.
- Chapter launch gate.
- Rolling script room.
- Batch guardrail and batch review.

This avoids deleting existing functionality while making the normal workflow simpler.

## Model Design

### New Derived Types

Implementation can either extend the existing model directly or introduce nested derived structures:

```ts
interface AutoCreationSerialCockpit {
  command: AutoCreationTodayCommandDeck
  guardrails: AutoCreationSerialGuardrail[]
  chapterChain: AutoCreationChapterChainStep[]
  batchLicense: AutoCreationProductionLicense
  riskQueue: AutoCreationRiskQueueItem[]
}
```

V1 should prefer a derived nested structure if it keeps `AutoCreationDirectorWorkspace.tsx` simpler.

### Data Sources

The cockpit should derive from existing model structures:

- `todayCommandDeck`
- `productionLicense`
- `dailyBattlePlan`
- `chapterLaunchGate`
- `deliveryRiskGate`
- `batchGuardrail`
- `batchReviewQueue`
- `longformBattleDesk`
- `longformCompass`
- `millionWordRunway`
- `writing.chapterAcceptanceDesk`
- `writing.chapterHandoff`
- `writing.preDraftBrief`
- `planning.first30Retention`
- `planning.storylineBoard`

If a source is missing, the cockpit should degrade gracefully:

- Use `pending` status.
- Explain the missing material.
- Point the action to the closest existing setup step.

## UI Design

### Layout

The top of `AutoCreationDirectorWorkspace` should become:

1. Compact project status hero.
2. Daily command panel.
3. Five guardrails row.
4. Current chapter chain.
5. Batch license + risk queue.
6. Collapsed evidence drawer.

The current large hero can remain, but it should become quieter and smaller. The user's attention should land on the command panel.

### Visual Language

- Cards should be compact, with clear status color and restrained borders.
- Do not create nested card stacks.
- Use icons for status and actions where appropriate.
- Keep text dense but readable.
- Avoid long rectangular button rows.
- AI/model actions use a stronger accent and an icon.
- Navigation or local actions use neutral styling.

### Loading Behavior

The existing `loadingActionKey` pattern should continue:

- Only the matching button enters loading state.
- Other buttons are disabled or visually muted.
- The button's key should be stable and specific enough to avoid multiple unrelated buttons spinning together.

## Error Handling

- If the cockpit cannot derive a guardrail, show `待补材料` instead of hiding it.
- If no target chapter exists, the cockpit should show a clear action to create or plan chapters.
- If batch generation is blocked, show the most important reason and link to the repair path.
- If stale story state is detected, production license should not imply safe batch generation.
- If risk counts disagree across sources, prefer the more conservative status.

## Testing Strategy

### Model Tests

Add or update tests in `autoCreationDirectorModel.test.ts`:

- Builds five guardrails from existing signals.
- Blocks or warns when delivery risk, chapter launch gate, or story-state sync is unhealthy.
- Produces a current chapter chain with the correct current step.
- Produces a risk queue from delivery risks, storyline risks, expectation debts, first-30 stale state, asset intake, and batch risks.
- Degrades gracefully when optional planning/writing sources are missing.

### UI Tests

Add or update tests in `workspaceUiShell.test.ts` and component-oriented tests if present:

- Renders `今日唯一动作`.
- Renders `万订五项护栏`.
- Renders the current chapter chain labels.
- Renders batch license state.
- Renders compact risk queue.
- Keeps detailed evidence behind `展开详细依据`.
- Distinguishes AI-call buttons from non-model actions through existing class names.

### Regression

After implementation:

- `bun run test:writing-cockpit`
- Relevant targeted tests if the script is too broad.
- `bun run check`
- `git diff --check`

## Acceptance Criteria

V1 is complete when:

- The first screen of the automatic creation workspace clearly shows one next action.
- The five guardrails are visible without opening a detail panel.
- The current chapter production chain is visible and has one current step.
- Batch writing permission is visible and explains whether batch generation is blocked, single-chapter only, or allowed.
- Open risks are summarized into a compact queue with direct actions.
- Existing detailed panels are still accessible under a collapsed evidence drawer.
- No new database table or backend generation pipeline is required.
- Tests cover the model derivation and visible shell labels.

## Implementation Notes

- Keep the first implementation conservative. The goal is orchestration clarity, not another heavy AI feature.
- Reuse existing status helpers where possible.
- If the current `AutoCreationDirectorWorkspace.tsx` grows too hard to scan, extract small presentational components in the same folder:
  - `SerialCockpitGuardrails`
  - `SerialCockpitChapterChain`
  - `SerialCockpitRiskQueue`
- Keep the CSS scoped under `auto-director-*` classes.
- Do not include `workspace/providers.json` in any commit.

## Self-Review

- No open-ended requirements remain.
- The scope is focused on the automatic creation workspace first screen.
- The design does not require new persistence or new backend routes.
- The UI goal is simpler operation, not broader feature exposure.
- The testing scope maps to the visible user-facing changes and derived model behavior.
