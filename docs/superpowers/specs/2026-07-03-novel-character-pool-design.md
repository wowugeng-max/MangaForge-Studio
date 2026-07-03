# Novel Character Pool Design

## Goal

Make character design rich enough for longform novel production without adding another confusing workspace entry point. Project creation, deep incubation, and unattended writing preflight should produce and maintain a layered character pool that includes major supporting characters, secondary supporting characters, functional cameo roles, primary antagonists, arc antagonists, minor antagonists, and faction agents.

## Current Problem

The current seed flow mainly asks for `protagonist`, `antagonist`, and a flat `characters` array. The oh-story character design contract has useful rules for tags, strong associations, supporting roles, and antagonist logic, but it does not require a complete layered pool.

During unattended preflight repair, character candidates are also limited to the first six new roles. That makes new projects likely to reach chapter writing with only the protagonist, one antagonist, and a few vague supporting roles. Later checks then complain about missing character cards, weak relation lines, or missing antagonist pressure, but the system has not created the underlying role network.

## Design

### Character Pool Contract

Extend the character design contract so creation and recovery prompts require a layered pool:

- `protagonist`: core viewpoint or drive character.
- `primary_supporting`: major supporting characters with recurring relationship, resource, or emotional functions.
- `secondary_supporting`: recurring but narrower characters that serve subplots, world texture, or pressure transfer.
- `cameo_supporting`: functional cameo or walk-on roles, such as witness, vendor, guard, informant, classmate, clerk, or minor victim.
- `antagonist_primary`: current long-arc or core antagonist.
- `antagonist_arc`: stage or volume antagonists.
- `antagonist_minor`: small antagonists, local blockers, bullies, corrupt agents, or one-episode opposition.
- `faction_agent`: executors of organizations, clans, companies, sects, schools, agencies, or rule systems.

Each generated role should include:

- `name`
- `role_type`
- `tier`
- `narrative_function`
- `goal`
- `motivation`
- `conflict`
- `relationship_to_protagonist`
- `first_appearance_chapter`
- `active_range`
- `voice_anchor`
- `signature_action`
- `secret_or_pressure`
- `exit_or_turning_point`
- `role_card`
- `layered_tags`
- `strong_associations`

Antagonist roles must also include `antagonist_logic`, describing what the antagonist wants, why they believe they are justified, what advantage they hold, what flaw will later expose them, and how they pressure the protagonist.

### Seed Normalization And Materialization

Normalize both flat `characters` and any future grouped role arrays into one deduplicated character list before materialization. Preserve existing model output, but enrich each character with role metadata when present.

When creating a project from a seed:

- Save every deduplicated role into the existing `characters` table.
- Keep the role tier and design fields in `raw_payload` even if the current table has no dedicated columns.
- Ensure `reference_config.story_state.characters` receives the same role tier, relationship, active range, and current state hints.
- Materialize character-like setting assets where the seed already provides setting entities, but do not create a second parallel character system.

### Unattended Preflight Repair

Update the automatic character repair prompt to ask for missing roles by tier rather than generic characters. It should return only missing or underdeveloped roles and avoid rewriting existing names.

The creation limit should become tier-aware instead of `slice(0, 6)`. The repair should prefer a balanced pool:

- always keep protagonist and core antagonist coverage;
- add several primary supporting roles when absent;
- add secondary and cameo roles only as needed for the current chapter or early chapter range;
- add antagonist minor and faction agent roles when pressure sources are thin;
- skip roles whose names already exist.

This keeps the automatic flow useful while avoiding a huge role dump.

### UI

Do not add a new feature entrance. Reuse the existing project incubation preview and role list.

The incubation confirmation modal should group preview tags by tier or role type instead of showing only the first twelve flat characters. The role list can continue using the current editor, with richer data visible through existing raw payload or future detail panels.

### Error Handling

If the model returns a flat array, accept it and infer tier from `role_type`, `identity`, or `supporting_function`.

If names are missing or duplicate, skip invalid rows instead of blocking project creation.

If a project is short-form, allow smaller pool sizes. Long and epic projects should require broader role coverage because they need recurring pressure, relationship hubs, and faction layers.

## Testing

Use TDD for implementation:

- Add a core route test that `buildProjectSeedPrompt` requires layered character pool tiers and antagonist logic.
- Add a recovery/finalization prompt test that thin seeds are expanded with the same tier requirements.
- Add a materialization test that grouped and flat seed roles are deduplicated and saved into project characters with tier metadata preserved in `raw_payload`.
- Add a writing-service test that unattended character repair asks for layered missing roles and no longer blindly truncates to six candidates.
- Add a UI-focused static test only if the project already has an established pattern for this modal; otherwise keep UI verification manual and scoped.

## Out Of Scope

This change does not add a separate role-design page, a new task-center entry, or a second character database. It also does not auto-create hundreds of background characters. The goal is a practical, tiered role pool that supports chapter writing without making the workspace noisier.
