# MCP Source Visibility and Model Routing Design

Date: 2026-08-01
Status: approved
Scope: expose the bound prose source in the novel workspace and add optional Buda model routing

## Problem

MangaForge can bind a novel project to an MCP Server, account key, adapter, and remote Agent, but the binding is only visible under `更多 → 项目设置 → 正文生成来源`. The main writing workspace still shows the ordinary model selector without an equally visible MCP source indicator, so a user cannot immediately tell which executor will produce the next chapter.

Buda's live MCP schemas accept an optional string `model` on both Session creation and Session message submission. Buda does not expose a tool that lists the account's available models, and the field has no public enum. MangaForge currently neither stores nor sends this value, so generation uses Buda's automatic or Agent-default model.

## Decisions

- Keep `GenerationSource` and the existing project-level MCP binding as the authority for draft-prose routing.
- Add an optional `model` field to the MCP project binding. A missing or blank value means `Auto` and is omitted from Buda calls.
- Pass the same nonblank model value to both Buda Session creation and Session message submission.
- Do not invent or hard-code a Buda model catalog. The settings UI offers `Auto` plus a free-text Buda model identifier.
- Make the active prose source visible in the novel workspace top bar.
- The MCP status control opens project settings, so configuration continues to have one editing surface.
- Preserve existing bindings without migration. Their normalized model is blank and their effective behavior remains `Auto`.
- Keep MangaForge responsible for prompts, context, memory snapshots, quality gates, retries, acceptance, and canonical storage. Model selection changes only the remote Buda executor.

## Alternatives considered

### Keep model selection implicit

This preserves the smallest configuration surface, but users cannot reproduce a run against a chosen Buda model and the main workspace remains ambiguous. It does not address either reported problem.

### Fetch a live Buda model list

This would be preferable if Buda exposed a stable model-list MCP tool. The current 44-tool schema does not include one, so implementing this would require scraping or maintaining an unreliable catalog.

### Auto plus a manual model identifier

This is the selected approach. It matches Buda's actual string schema, remains forward-compatible with account-specific model access, and defaults safely to the behavior already verified in live generation.

## Data contract

The existing configuration remains version `prose_generation_source_v1`:

```json
{
  "version": "prose_generation_source_v1",
  "type": "mcp",
  "mcp": {
    "server_id": "buda",
    "key_id": 3,
    "adapter_id": "buda",
    "agent_id": "agent_xxx",
    "model": ""
  }
}
```

`model` is optional on persisted historical records and normalized to a trimmed string. Blank means `Auto`. A nonblank model participates in the generation-source fingerprint so changing it invalidates an earlier binding test and prevents an in-flight run from silently continuing with a different executor configuration.

The model identifier is not a credential. It may appear in source summaries and generation provenance, but it must still be length-bounded and treated as untrusted external configuration.

## Server flow

1. The dedicated project binding route normalizes and saves the optional model.
2. Binding validation continues to verify Server, Key, Adapter, Agent visibility, and Agent exclusivity. It cannot pre-validate the model because Buda exposes no model catalog.
3. `McpGenerationSource` copies the normalized model into `BudaProseGenerationInput`.
4. `BudaAdapter` omits the field for `Auto`; otherwise it supplies the same model to `createSession` and `sendSessionMessage`.
5. If Buda rejects an unavailable identifier, the existing typed MCP failure path reports the remote error. MangaForge does not silently retry with `Auto` or a different model.

## Workspace UI

The top bar displays one source control near the existing executor controls:

- model source: `模型 API`;
- MCP source: `Buda MCP · <Agent name> · Auto` or `Buda MCP · <Agent name> · <model>`;
- unresolved metadata: fall back to stable IDs rather than hiding the binding;
- load or health failure: keep the MCP identity visible and mark the status unavailable.

The control is available in normal and immersive writing modes. Clicking it opens the existing project settings modal; no second save path is introduced.

The settings panel adds a model field below the Agent selector:

- an explicit `Auto（Buda / Agent 默认）` state;
- a free-text identifier for account-supported models;
- explanatory copy that MangaForge cannot enumerate Buda models and an invalid value will be rejected by Buda during generation.

Saving or testing includes the selected model. Editing the model clears the prior successful test fingerprint, just like changing the account or Agent.

## Error handling

- Failure to load display metadata must not change the stored binding or generation behavior.
- A malformed or excessively long model identifier is rejected by local normalization.
- Buda model rejection surfaces through the current MCP error and run-receipt paths.
- There is no automatic fallback from a chosen Buda model to `Auto` or to a model Provider.

## Testing

- Server configuration tests cover backward-compatible normalization, trimming, length validation, and fingerprint changes.
- Buda adapter tests prove `Auto` omits `model` and a configured model is passed to both live tool calls.
- MCP generation-source tests prove the binding model reaches the adapter and provenance without exposing credentials.
- Web model tests cover hydrate/build/fingerprint behavior for `Auto` and explicit identifiers.
- Workspace UI tests cover the persistent source control, settings navigation, and the manual model field.
- Existing MCP tests, web tests, server tests, and production builds remain required before completion.

## Out of scope

- Discovering or synchronizing a Buda model catalog.
- Per-chapter ad hoc Buda model overrides.
- Changing non-prose stages from the current Provider model strategy.
- Key encryption, remote Agent deletion, or replacing MangaForge memory with Buda memory.
