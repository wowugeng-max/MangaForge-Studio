# Creative Assistance Workflow Design

Date: 2026-06-12

## Purpose

The novel workspace already has an automatic creation chain: planning, chapter preparation, prose generation, review, revision, state sync, acceptance, and safe batching. That chain is good for production, but it is not enough for active author-led creation.

This phase adds a parallel **creative assistance workflow**. Its job is to help the author think, choose, expand, and revise at any creative node. It should provide useful suggestions without taking control away from the author.

The core product promise is:

- The automatic chain pushes production forward.
- The assistance chain keeps the author unstuck, inventive, and in control.

## User Need

The author may start with only a seed idea, basic worldbuilding, protagonist, supporting characters, factions, ability system, opening conflict, and perhaps a first chapter. The assistance workflow should help expand that material into richer options.

It should support:

- Evaluation and analysis of the current prose.
- Revision suggestions for the current chapter.
- Next-chapter writing ideas.
- Later-outline and volume-route suggestions.
- Foreshadowing design and payoff planning.
- Character, relationship, faction, ability, item, and setting-system suggestions.
- Dynamic suggestions from the selected chapter or selected prose.
- Optional online research and source-card style inspiration.

The workflow must feel like a creative adviser, not another auto-generation button.

## Product Principles

### Author Control

Assistance suggestions are advisory by default. They do not change prose, canon, outlines, character cards, setting entities, story state, or tasks unless the author explicitly accepts an action.

### Work Where The Author Is

The assistant should appear inside the existing novel workspace, especially the chapter writing area. It should follow the active chapter, selected prose, writing bible, story state, outlines, characters, reviews, and reference context.

### Suggestions Before Commands

The first surface should show thinking options: cards, branches, questions, risks, and possible moves. Heavy actions such as writing into canon, creating a task, or updating an entity should be secondary explicit actions.

### Creative Range

The assistant should not only judge quality. It should offer multiple directions:

- Conservative continuity-safe option.
- Stronger commercial-reader-pull option.
- More innovative or surprising option.
- Long-form setup/payoff option.

### Source-Aware Inspiration

When online research or reference material is available, the assistant should convert it into abstract writing-use cards. It must avoid copy-like transfer of names, proprietary settings, specific scenes, and wording.

## Relationship To Existing Systems

The feature should reuse existing project capability:

- `WritingCockpitPanel` for current chapter status and writing flow.
- `WorkspaceCenter` for prose editing and selected chapter work.
- Existing active chapter, selected project, worldbuilding, characters, outlines, reviews, and run records from `useNovelWorkspaceData`.
- Existing chapter context package from `GET /api/novel/chapters/:chapterId/context-package`.
- Existing quality card, prose quality, editor report, reference preview, and creative command routes where useful.
- Existing `reviews` persistence to store assistance sessions as `creative_assist` records.

It should not create a new top-level project system in V1.

## Scope

### In Scope

- Add a creative assistance model on the web side.
- Add a `CreativeAssistantPanel` inside the novel workspace.
- Add a backend route group for creative assistance.
- Support assistance modes:
  - `prose_review`
  - `next_chapter`
  - `outline_expand`
  - `foreshadowing`
  - `character_arc`
  - `system_design`
  - `research_cards`
- Build a structured prompt that includes current project and chapter context.
- Return structured suggestion cards.
- Store generated assistance output as a review record.
- Allow suggestion cards to be copied or turned into safe local intents.
- Add UI for selecting focus mode, scope, and optional author question.
- Add fallback local suggestions when the LLM call fails or no model is selected.
- Update the usage guide.

### Out Of Scope

- No new database table in V1.
- No automatic rewrite of prose from assistance cards.
- No automatic story-state sync from assistance cards.
- No automatic hot-topic crawler.
- No autonomous background assistant that spends tokens without user action.
- No guarantee that online research is always available in restricted-network environments.

## Information Architecture

### Workspace Placement

The creative assistance panel should be reachable from the chapter writing workspace and visible enough to feel always available.

Recommended placement:

- Add a compact `创作参谋` command near the writing cockpit / workspace toolbar.
- Open a right-side drawer or split panel that can stay open while editing.
- In focus writing mode, allow a compact collapsed assistant tab.

The panel should not be hidden only inside the automatic creation director because this would blur the distinction between automatic production and author-led assistance.

### Panel Layout

The panel has five areas:

1. **Context Bar**
   - Active chapter.
   - Selection state: whole chapter or selected prose.
   - Available materials: writing bible, chapter context, reviews, references.

2. **Mode Tabs**
   - `正文评析`
   - `下一章`
   - `后续大纲`
   - `伏笔`
   - `人物剧情`
   - `能力物品`
   - `联网资料`

3. **Author Prompt**
   - Optional short question or creative intent.
   - Example: `我想让下一章更有压迫感，但不要提前揭露幕后反派。`

4. **Suggestion Cards**
   - Each card has title, intent, reasoning, concrete writing move, risk, applies-to scope, and suggested action.
   - Cards are grouped by type: evaluation, revision, branch idea, setup, payoff, asset, system rule, research insight.

5. **Safe Actions**
   - Copy card.
   - Send to task center draft.
   - Open related editor.
   - Insert as author note.
   - Save as assistance review.

## Assistance Modes

### Prose Review

Input:

- Active chapter text or selected prose.
- Chapter outline and scene cards.
- Recent quality/editor reviews.
- Writing bible and style lock.

Output:

- Overall reading diagnosis.
- Strengths worth keeping.
- Weak points: hook, rhythm, character voice, information density, payoff, tension, continuity.
- Revision ideas with concrete prose-level direction.
- Risks if revised too aggressively.

### Next Chapter

Input:

- Current chapter ending.
- Open hooks and payoff debts.
- Future outline if present.
- Character and story state.

Output:

- Three next-chapter options:
  - Safe continuation.
  - Strong commercial pull.
  - Surprise/innovation branch.
- Opening hook ideas.
- Required conflict escalation.
- Must-payoff and must-not-reveal lists.
- Scene seed list.

### Outline Expand

Input:

- Existing outlines and future route.
- Current volume goal.
- Latest written chapters.
- Storyline board and long-form runway.

Output:

- Future 5-10 chapter direction suggestions.
- Volume-level turn options.
- Where to raise stakes.
- Where to slow down for payoff.
- Risk of drift or repetition.

### Foreshadowing

Input:

- Existing foreshadowing arcs.
- Current chapter and outline.
- Open secrets and payoff debts.
- Items, abilities, factions, and character states.

Output:

- New foreshadowing seeds.
- Payoff targets and timing.
- Misdirection ideas.
- Continuity constraints.
- Forbidden early reveals.

### Character Arc

Input:

- Characters, relationships, current states, and chapter context.
- Existing character arc sync reviews.

Output:

- Desire, flaw pressure, relationship shift, growth beat.
- Character choice options.
- Dialogue/voice suggestions.
- Relationship tension ideas.
- Arc risks.

### System Design

Input:

- Worldbuilding.
- Ability, item, faction, resource economy, setting entities.
- Genre and commercial tags.

Output:

- Ability rules.
- Item functions and costs.
- Faction conflict mechanics.
- Resource economy constraints.
- Failure cases and exploit prevention.
- Ways to turn systems into visible scenes.

### Research Cards

Input:

- Author keyword, URL, or topic.
- Current genre and project premise.

Output:

- Source summary.
- Useful factual details.
- Creative translation ideas.
- What to avoid copying.
- Fit score for this project.

If network fetch fails, the route should return a warning and still generate project-local brainstorming suggestions.

## Backend Design

### New Route File

Create `ui/server/src/routes/novel-creative-assist-routes.ts`.

Register it from `ui/server/src/routes/novel.ts`.

### Endpoint

`POST /api/novel/projects/:id/creative-assist`

Request:

```json
{
  "mode": "prose_review",
  "chapter_id": 1,
  "selected_text": "optional selected prose",
  "question": "optional author question",
  "research_query": "optional keyword or URL",
  "model_id": 123,
  "save": true
}
```

Response:

```json
{
  "ok": true,
  "assist": {
    "mode": "prose_review",
    "summary": "one sentence",
    "context_status": ["chapter_context_ready", "writing_bible_ready"],
    "cards": [
      {
        "id": "card-1",
        "type": "revision",
        "title": "Strengthen the opening pressure",
        "intent": "make the first 300 words sharper",
        "reason": "current opening explains before danger appears",
        "suggestion": "start with the rule violation consequence, then reveal why the protagonist caused it",
        "risk": "do not reveal the final dungeon rule too early",
        "applies_to": "chapter_opening",
        "action": "turn_into_revision_task"
      }
    ],
    "research_cards": [],
    "warnings": []
  },
  "review": {}
}
```

### Context Builder

The route should load:

- Project.
- Chapters.
- Active chapter.
- Worldbuilding.
- Characters.
- Outlines.
- Reviews.
- Optional chapter context package via `writingService.buildChapterContextPackage`.
- Optional reference preview via existing reference service for writing tasks.

The prompt should be mode-specific but share a common contract:

- Return JSON only.
- Provide multiple alternatives.
- Preserve canon.
- Mark uncertainty.
- Separate ideas from actions.
- Do not write full chapters unless explicitly asked.
- Do not copy research/reference material.

### Persistence

When `save` is not false, store a review:

- `review_type`: `creative_assist`
- `status`: `ok` or `warn`
- `summary`: assistance summary
- `issues`: warnings and top risks
- `payload`: serialized assist result plus request metadata

This reuses existing review loading and avoids new schema work.

## Frontend Model

Create `ui/web/src/pages/novel-workspace/creativeAssistantModel.ts`.

Responsibilities:

- Normalize backend assistance payload.
- Build fallback suggestion cards from local context when there is no backend result.
- Expose mode definitions, labels, icons, and empty states.
- Determine context chips:
  - `当前章`
  - `选中文本`
  - `写作圣经`
  - `上下文包`
  - `质检`
  - `参考`
- Determine primary call-to-action text.

The model should be pure and covered by tests.

## Frontend Component

Create `ui/web/src/pages/novel-workspace/CreativeAssistantPanel.tsx`.

Responsibilities:

- Render mode tabs.
- Render author question input.
- Render research input only for `research_cards`.
- Call backend route.
- Show loading and errors.
- Render suggestion cards.
- Expose card actions.
- Stay usable in narrow layouts.

Use existing Ant Design components and existing workspace styling. Keep the panel dense and work-focused, not a marketing-style assistant page.

## Novel Workspace Integration

Modify `NovelProjectWorkspace.tsx`:

- Add creative assistant state:
  - open/closed.
  - mode.
  - loading.
  - latest result.
  - selected prose text if available.
- Pass active chapter, project, reviews, context package, selected model id, and callbacks to the panel.
- Add a `创作参谋` command near the chapter writing surface and right-side reference area.
- Refresh project modules after saved assistance only if a review was created.

The editor selection is optional in V1. If direct CodeMirror selection plumbing is too risky, the first implementation can let the user paste selected prose into the assistant prompt field. A follow-up can wire selection extraction.

## Safe Actions

V1 should implement actions that do not mutate canon automatically:

- Copy card text.
- Open task center.
- Open writing bible/editor panels.
- Save assistance review.

Mutation actions such as `write_to_character_card`, `create_foreshadowing_entity`, or `insert_into_chapter_note` should be represented as future action intents unless there is an existing safe editor route and confirmation flow.

## Error Handling

- If no chapter is selected, show project-level assistance with seed/material expansion modes.
- If no model is selected, show local fallback cards and ask the user to choose a model for AI assistance.
- If the model returns invalid JSON, parse what can be parsed and show a warning.
- If network research fails, keep the assistant usable with project-local suggestions.
- If context package loading fails, continue with direct project/chapter material.
- If save review fails, still show the generated assistance result.

## Testing Strategy

### Backend Tests

Add route/service tests for:

- Rejecting unknown assistance mode.
- Building project-level assistance when no chapter exists.
- Including chapter context when `chapter_id` is provided.
- Persisting a `creative_assist` review when `save` is true.
- Returning fallback warning when research fetch fails.

### Frontend Model Tests

Add tests for:

- Mode definitions include all required assistance modes.
- Fallback cards cover prose, next chapter, outline, foreshadowing, character arc, system design, and research modes.
- Context chips reflect chapter, selection, writing bible, context package, reviews, and references.
- Backend payload normalization creates stable card ids.

### UI Shell Tests

Update `workspaceUiShell.test.ts` to verify:

- `CreativeAssistantPanel` is imported and rendered from `NovelProjectWorkspace`.
- The workspace contains `创作参谋`.
- The panel contains all mode labels.
- Suggestion cards use stable classes.
- Assistant route `/creative-assist` is called.

### Verification Commands

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/creativeAssistantModel.test.ts src/pages/novel-workspace/workspaceUiShell.test.ts
cd ui/server && bun test src/routes/novel-creative-assist-routes.test.ts
bun run check
git diff --check
```

## Acceptance Criteria

The feature is complete when:

- The project workspace exposes a visible `创作参谋` assistance entry.
- The author can ask for current prose analysis.
- The author can ask for next-chapter ideas.
- The author can ask for future outline, foreshadowing, character/plot, system/item/faction, and research-card suggestions.
- Assistance output is structured as multiple suggestion cards.
- Suggestions are advisory and do not mutate canon without explicit action.
- Assistance can be saved as a review record.
- The UI remains usable beside the chapter writing workflow.
- Backend and frontend tests cover the new model, route, and shell integration.
- Existing automatic creation workflow remains intact.

## Self-Review

- The design keeps automatic production and author-led assistance separate.
- The first version is broad enough to cover the requested creative categories.
- The design reuses existing routes, context builders, review persistence, and workspace state.
- No new database table is required.
- Online research is supported as an optional mode with graceful fallback.
- The feature can be implemented and tested incrementally.
