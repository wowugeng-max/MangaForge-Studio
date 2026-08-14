# Writing Skill Humanize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable writing-skill registry and one combined LLM rewrite pass after existing humanize, so novel prose can use fiction-humanizer-zh / remove-ai-flavor / humanizer-zh without mixing into the canvas skill installer.

**Architecture:** Pure resolve/compile/accept functions in `ui/server/src/novel-writing/writing-skills/`. One optional LLM runner after humanize in `runPostDraftHumanizeAndOpeningHandoff`. Project defaults live in `reference_config.writing_skills.enabled`; generation may override; revision reads project defaults only. Failed pass falls back to previous prose.

**Tech Stack:** TypeScript, bun:test / vitest, Express project-config routes, Ant Design switches.

---

### Task 1: Registry and enabled-skill resolution

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/types.ts`
- Create: `ui/server/src/novel-writing/writing-skills/registry.ts`
- Create: `ui/server/src/novel-writing/writing-skills/resolve-enabled.ts`
- Test: `ui/server/src/novel-writing/writing-skills/resolve-enabled.test.ts`

- [ ] Write failing tests for defaults, project merge, generation override, unknown ids, all-off
- [ ] Implement catalog + `resolveWritingSkillsEnabled`
- [ ] Verify tests pass

### Task 2: Combined prompt + candidate gates

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.ts`
- Create: `ui/server/src/novel-writing/writing-skills/accept-candidate.ts`
- Test: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.test.ts`
- Test: `ui/server/src/novel-writing/writing-skills/accept-candidate.test.ts`

- [ ] Prompt includes only enabled skill rules; humanizer-zh adds fiction safety; empty ids → empty prompt
- [ ] Candidate gate rejects collapse, author-soul leak (when humanizer-zh on), continuity/fingerprint failure
- [ ] Implement and verify

### Task 3: LLM pass + post-draft wiring

**Files:**
- Create: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts`
- Modify: `generate-chapter-post-draft-finalize.ts`
- Modify: `create-novel-writing-service.ts`, `generate-chapter-for-group-methods.ts`
- Modify: `standaloneProseServiceStageLabel` in `builders.ts`

- [ ] Skip when all off or runner missing
- [ ] On success replace text; on throw keep previous prose (unless chapterTaskExecution)
- [ ] Progress stage `writing_skill_humanize`

### Task 4: Project config + revision defaults

**Files:**
- Modify: `novel-project-config-routes.ts` (+ test)
- Modify: `builders-revision-prompts.ts` (+ revision safeguards test)

- [ ] GET/PUT `/api/novel/projects/:id/writing-skills-config`
- [x] Revision prompt injects compiled directives from project defaults only
- [x] Revision worker runs the writing-skill pass after admission and before persist; failure keeps admitted prose

### Task 5: UI toggles

**Files:**
- Modify: `ProjectSettingsModal.tsx` (+ test)
- Modify: workspace generation payload + word-target row control

- [ ] Project settings three independent switches
- [ ] Generation bar override sent as `writing_skills.enabled`
