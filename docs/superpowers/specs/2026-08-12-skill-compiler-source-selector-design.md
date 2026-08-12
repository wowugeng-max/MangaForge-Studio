# Skill Compiler Source Selector Design

**Date:** 2026-08-12

**Status:** Approved in conversation

## Context

The Canvas GenerateNode currently renders `Skill 编译模型` as one flat model
dropdown. Each option shows the model display name and optional Vision marker,
but it does not show which API Key or Provider supplies that model. Duplicate or
similarly named models are therefore difficult to distinguish.

The same node already uses a compact two-part selector for its normal execution
model: the left dropdown selects an API Key/source and the right dropdown lists
models bound to that source. The Skill compiler selector should follow this
familiar interaction while preserving its separate compiler-model semantics.

## Goals

- Replace the flat Skill compiler model dropdown with linked source and model
  dropdowns.
- Make the selected compiler model's API Key or Provider origin visible before
  and after selection.
- Preserve the workspace-default compiler option and clearly show the actual
  source/model behind that default.
- Continue offering only active, non-disabled models with
  `capabilities.chat === true`.
- Preserve Vision labels, per-node override behavior, and the existing
  `skillCompilerModelId` / `skill_compiler_model_id` data contract.
- Keep the change Canvas-only; do not modify the novel workspace.

## Non-goals

- Changing how compiler models are stored, resolved, or executed by the server.
- Adding a new Provider, Key, model, or workspace setting API.
- Adding a separate favorite-only toggle to the Skill compiler selector.
- Changing the normal GenerateNode execution model selector.
- Exposing image/video-only models that cannot perform Chat compilation.

## Chosen Approach

Render the compiler control as an Ant Design `Space.Compact` containing two
linked `Select` controls:

```text
[ API Key / source ▼ ][ compiler model ▼ ]
```

The source dropdown uses the same user-facing label precedence as the existing
GenerateNode source selector:

1. active Key `description`;
2. Key `provider`;
3. `Key <id>`.

The model dropdown contains only eligible compiler models associated with the
selected source. A model option uses `display_name`, then `model_name`, then
`模型 #<id>`, and appends ` · Vision` when `capabilities.vision === true`.

No new persisted source field is introduced. A model ID already identifies its
configured `api_key_id`; source selection is UI state derived from the selected
model or converted immediately into a concrete model selection.

## Source Identity and Legacy Models

Normal source options use stable values of the form `key:<numeric-id>`. Only
active Keys that own at least one eligible compiler model appear.

Legacy models without a resolvable active `api_key_id` remain selectable rather
than silently disappearing:

- if the model has a non-empty `provider`, it is grouped under
  `provider:<provider>` and labeled with that Provider;
- otherwise it is grouped under `unbound` and labeled `未绑定来源`.

These fallback source identities are UI-only. The selected value remains the
numeric model ID sent to the existing compiler API.

## Workspace Default Behavior

The first source option is the special value `workspace-default`.

When selected:

- `skillCompilerModelId` is set to `null` as today;
- the right model dropdown is read-only;
- the left label is `工作区默认 · <actual source>` when the configured default
  model and its source can be resolved;
- the right side shows the configured default model and its Vision marker;
- when the workspace default is null, the controls show
  `工作区默认` and `未配置`;
- when the stored default model is missing or unavailable, they show
  `工作区默认 · 来源不可用` and `模型 #<id> · 不可用`.

This preserves the semantic distinction between inheriting the workspace
setting and explicitly choosing the same model as a node override.

## Override Selection Behavior

When an explicit compiler model is selected, the source dropdown is derived
from that model's source identity and the model dropdown remains editable.

Changing from one concrete source to another immediately selects a deterministic
model under the new source:

1. the first favorite eligible model in server order;
2. otherwise the first eligible model in server order.

Changing the source to `workspace-default` clears the node override. Changing
the model within the same source updates only `skillCompilerModelId`.

If a persisted explicit model ID is no longer in the eligible model collection,
the control preserves visibility of the stale value using a synthetic
`来源不可用` source and `模型 #<id> · 不可用` model option. Selecting another
source replaces the stale override normally.

## Data Flow

GenerateNode already loads the required collections:

- `/keys/` is queried with `is_active: true`, `skip`, and `limit`; active Key
  pages are collected to completion with the server maximum page size (`1000`)
  before source derivation becomes interactive;
- `/models/` supplies all active model records;
- `/skills/settings` supplies `skill_compiler_model_id`.

The existing compiler-model filter remains authoritative. Pure selector helpers
receive the filtered compiler model list, active Key list, node override ID, and
workspace default ID, then return:

- normalized source groups and labels;
- the currently selected source identity;
- model options for that source;
- the deterministic model ID selected after a source change;
- display state for workspace-default and unavailable legacy values.

GenerateNode renders these derived values and keeps the current setter and
compile request paths unchanged.

## UI Layout

The existing `Skill 编译模型` label remains. Directly below it:

- the source select uses a fixed compact width sufficient for a Key description;
- the model select occupies the remaining width and truncates long labels;
- both controls use the existing `small` size;
- both controls remain loading/disabled until the complete Key collection,
  Skill settings, and compiler models have all settled;
- the existing missing-compiler validation message remains below the control,
  but it is not the Key-pagination loading indicator.

The design intentionally does not add a favorite button. Favorites influence
the automatic choice after a source change but do not hide non-favorite
compiler models.

## Persistence and Compatibility

No backend or stored schema changes are required:

- explicit override: persist the selected numeric model ID as today;
- workspace inheritance: persist `null`/no override as today;
- source selection: derived UI state only, not persisted;
- compile preview, Chat direct prompt generation, image/video execution, audit,
  cache keys, and locked Skill revision behavior remain unchanged.

Existing Canvas nodes load without migration. The novel workspace receives no
new selector, state, API call, or runtime dependency.

## Error and Loading Behavior

- While Keys/models/settings are loading, both compiler controls expose their
  loading state and remain disabled, so a transient incomplete Key collection
  cannot become interactive.
- The existing missing-compiler validation text remains governed by its current
  Skill settings/model conditions; it must not be presented as a Keys-loading
  message.
- If Key loading fails, the request still settles the control gate. The empty
  Key collection then deliberately falls back to legacy Provider/unbound source
  grouping instead of leaving the controls disabled forever.
- If a source has no eligible models, it is omitted from source options.
- If the workspace default is missing or unavailable, Skill preview/run remains
  blocked by the existing `missingEffectiveCompilerModel` logic.
- A stale node override stays visible as unavailable and remains blocked until
  the user chooses an available source/model or returns to a valid workspace
  default.
- Model/source UI changes do not invoke the compiler; they only affect later
  preview or run requests.

## Testing Strategy

Implementation follows RED/GREEN TDD cycles.

Pure GenerateNode model tests cover:

- paginated active-Key collection beyond the first page, stable ordering, and
  input immutability;
- source labels from Key description, Provider fallback, and Key ID fallback;
- filtering/grouping eligible models by `api_key_id`;
- legacy Provider and unbound source groups;
- workspace-default source/model display for configured, null, and unavailable
  defaults;
- explicit override source derivation;
- favorite-first then first-model fallback after source changes;
- Vision model labels;
- preservation of unavailable explicit model IDs;
- returning to workspace default yields a null override.

GenerateNode source/integration tests cover:

- `Skill 编译模型` renders a compact source select and linked model select;
- the old flat `compilerModelOptions` selector is removed;
- source change updates the model override deterministically;
- model change updates the existing compiler model ID only;
- source/model controls wait for complete Keys plus settings/models, while Key
  failure settles into the documented legacy fallback;
- the normal execution model selector remains unchanged;
- no novel-workspace path is modified.

Regression verification includes focused GenerateNode tests, broader Canvas
tests, Web production build, Server build/boundary checks, diff scope review,
and independent code review.

## Acceptance Criteria

- The Skill compiler control visibly shows both the source and model.
- Selecting a source limits the model list to that source and picks favorite
  first, then first available.
- Workspace-default inheritance remains available and exposes the default's
  actual source/model without converting it into an override.
- Duplicate model names from different sources are distinguishable.
- Existing Canvas nodes and compiler requests retain their current persisted and
  server contracts.
- The normal GenerateNode model selector and novel workspace remain unchanged.
