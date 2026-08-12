# Skill Compiler Authoritative Metadata Design

## Problem

The prompt compiler currently requires the language model to echo the selected
Skill name, locked revision, and Canvas mode. A valid prompt is discarded when
the model invents or reformats any of that metadata. A repair request cannot
reliably recover because the current compiler prompt does not state the exact
authoritative values.

## Design

Treat Skill identity and routing metadata as server-owned provenance:

- `skill_name` comes from the resolved `SkillManifest.name`.
- `skill_version` comes from the resolved `SkillManifest.revision`.
- `mode` comes from the validated `PromptCompileInput.mode`.
- The model continues to author `prompt`, `negative_prompt`, `parameters`,
  `references_used`, and `warnings`.

The compiler contract will tell the model the exact selected Skill name,
revision, and mode so its JSON remains understandable in logs. Parsing will not
reject a result solely because the model omitted or changed those three fields;
the returned `PromptCompileResult` will always overwrite them with the
authoritative server values. Prompt, parameter, warning, and reference safety
validation remains unchanged.

## Error Handling

Invalid JSON, missing or empty prompt text, unsafe references, unsupported
parameters, malformed warnings, and tool calls remain errors. A model-authored
mode alias or identity mismatch no longer causes the whole valid prompt to be
discarded because those values are not model authority.

## Testing

Add regression coverage proving that:

1. A result with missing or incorrect `skill_name`, `skill_version`, and `mode`
   is normalized to the resolved Skill and requested Canvas mode.
2. The model-bound compiler contract contains the exact authoritative values.
3. Existing prompt, reference, parameter, and tool-call validation continues to
   pass through the full compiler test suite.

## Scope

This is a server-side compiler fix only. It does not change the Skill selector,
installed Skill Pack format, generation-node UI, or novel workspace.
