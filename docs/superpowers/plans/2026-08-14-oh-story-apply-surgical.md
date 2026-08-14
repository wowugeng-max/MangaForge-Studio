# oh-story Surgical Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop apply-from-review from rewriting the whole chapter; only apply executable review suggestions, and refuse writes that change too many paragraphs.

**Architecture:** Keep the existing apply route and `### 修订后全文` extract. Change the apply prompt contract, then compare original vs extracted paragraphs before `updateChapterText`.

**Tech Stack:** Bun, TypeScript, existing oh-story core runner / routes / web toast mapping.

---

### Task 1: Paragraph retention helper

**Files:**
- Create: `ui/server/src/novel-writing/oh-story-core/paragraph-retention.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/paragraph-retention.test.ts`

- [ ] Write failing tests for 70% retention, 8-paragraph minimum, and 2-of-10 edits passing
- [ ] Implement `splitOhStoryParagraphs`, `ohStoryParagraphRetention`, `ohStoryApplyRewroteTooMuch`

### Task 2: Apply prompt contract

**Files:**
- Modify: `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/compile-apply-prompt.test.ts`

- [ ] Assert prompt forbids 改写整章 / 通篇抛光 and keeps 修改建议 / 原样保留
- [ ] Replace the rewrite-all sentence in `compileOhStoryApplyPrompt`

### Task 3: Runner gate and error mapping

**Files:**
- Modify: `ui/server/src/novel-writing/oh-story-core/runner.ts`
- Test: `ui/server/src/novel-writing/oh-story-core/runner.test.ts`
- Modify: `ui/server/src/routes/novel-oh-story-core-routes.ts`
- Test: `ui/server/src/routes/novel-oh-story-core-routes.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-repair-task-handlers.tsx`
- Test: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] Runner refuses rewritten chapters with `OH_STORY_APPLY_REWROTE_TOO_MUCH` and does not write
- [ ] Route returns 409 with `这次改动太大，像整章重写。请再试一次`
- [ ] Web toast uses the same copy
