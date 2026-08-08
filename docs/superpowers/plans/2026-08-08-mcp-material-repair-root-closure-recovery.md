# MCP Material Repair Root Closure Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Accept provider-neutral MCP material-repair JSON that is semantically complete but missing only the root object's final closing brace, while every other malformed or incomplete response remains rejected.

**Architecture:** Keep the existing strict parseJsonObject path unchanged for all contracts. Add a material-repair-only fallback that scans the exact JSON candidate, permits exactly one unmatched root object, appends one closing brace, and then re-enters the existing structural and downstream material contract validators. No Provider or Adapter identity participates in the decision.

**Tech Stack:** TypeScript, Bun 1.3.13, bun:test, existing MCP response-contract boundary, React/Vite page acceptance.

---

## File Structure

- Modify ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts: add the real missing-root regression and fail-closed cases.
- Modify ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts: add candidate extraction, the one-root scanner, and material-repair-only fallback parsing.
- Create no production file. Do not change parseJsonLikePayload, Buda Adapter code, API model routing, or other stage contracts.

### Task 1: Capture the real missing-root failure

**Files:**
- Modify: ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts:125-160
- Test: ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts

- [ ] **Step 1: Add the failing recovery tests**

Insert after the existing combined material repair acceptance test:

~~~ts
test('recovers material repair JSON missing only the root object closing brace', () => {
  const payload = {
    chapter_patch: { title: '零点档案', ending_hook: '文件里的字变成林砚自己的笔迹。' },
    worldbuilding: [{ world_summary: '零点会出现未来死亡记录。' }],
    characters: [{ name: '林砚', role_type: '主角' }],
    settings: [{ name: '异常档案文件', entity_type: 'item' }],
    chapter_setting_usage: [{ entity_name: '异常档案文件', usage_type: '必用' }],
    repair_summary: '补齐本章前置材料。',
  }
  const missingRootClosure = JSON.stringify(payload).slice(0, -1)
  const fence = String.fromCharCode(96).repeat(3)

  for (const content of [
    missingRootClosure,
    fence + 'json\n' + missingRootClosure + '\n' + fence,
  ]) {
    expect(validateMcpStageResponse('material_repair', 'material_repair_json', {
      content,
    }).output).toEqual(payload)
  }
})

test('does not apply material root recovery to other response contracts', () => {
  expectInvalid(
    'quality_review_json',
    '{"score":88,"publishable":true',
    'quality_review',
  )
})
~~~

- [ ] **Step 2: Run the focused test and verify RED**

~~~bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-response-contract.test.ts
~~~

Expected: the new material recovery test fails with MCP_STAGE_CONTRACT_INVALID; the other-contract rejection remains green.

- [ ] **Step 3: Record the RED evidence before production changes**

~~~bash
git diff -- ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts
~~~

Expected: no output. Do not weaken the test or add a Provider-specific fixture.

### Task 2: Implement the exact one-root closure fallback

**Files:**
- Modify: ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts:38-44
- Modify: ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts:387-412
- Test: ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts

- [ ] **Step 1: Extract existing candidate normalization without changing behavior**

Replace the current parseJsonObject block with:

~~~ts
function jsonObjectCandidate(content: string) {
  const trimmed = content.trim()
  const fence = String.fromCharCode(96).repeat(3)
  const fencePattern = new RegExp(
    '^' + fence + '(?:json)?\\s*([\\s\\S]*?)\\s*' + fence + '$',
    'i',
  )
  return trimmed.match(fencePattern)?.[1]?.trim() || trimmed
}

function parseJsonObject(content: string) {
  const parsed: unknown = JSON.parse(jsonObjectCandidate(content))
  if (!plainObject(parsed)) throw new TypeError('JSON object required')
  return parsed
}
~~~

- [ ] **Step 2: Add the deterministic root scanner**

Place immediately after parseJsonObject:

~~~ts
type JsonContainer = { opener: '{' | '['; index: number }

function recoverMissingRootObjectClosure(candidate: string) {
  const firstNonWhitespace = candidate.search(/\S/)
  if (firstNonWhitespace < 0 || candidate[firstNonWhitespace] !== '{') return null

  const stack: JsonContainer[] = []
  let inString = false
  let escaped = false

  for (let index = firstNonWhitespace; index < candidate.length; index += 1) {
    const character = candidate[index]!
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
      continue
    }
    if (character === '{' || character === '[') {
      stack.push({ opener: character, index })
      continue
    }
    if (character !== '}' && character !== ']') continue
    const expected = character === '}' ? '{' : '['
    const current = stack.pop()
    if (!current || current.opener !== expected) return null
  }

  if (inString || escaped || stack.length !== 1) return null
  const [root] = stack
  if (root?.opener !== '{' || root.index !== firstNonWhitespace) return null
  try {
    const parsed: unknown = JSON.parse(candidate + '}')
    return plainObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseMaterialRepairJsonObject(content: string) {
  try {
    return parseJsonObject(content)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    const recovered = recoverMissingRootObjectClosure(jsonObjectCandidate(content))
    if (!recovered) throw error
    return recovered
  }
}
~~~

- [ ] **Step 3: Route only material repair through the fallback**

Change only the first line inside validateMaterialRepair:

~~~ts
function validateMaterialRepair(content: string) {
  const value = parseMaterialRepairJsonObject(content)
~~~

Every other validator must continue calling parseJsonObject(content).

- [ ] **Step 4: Run the focused suite and verify GREEN**

~~~bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-response-contract.test.ts
~~~

Expected: all tests pass, including raw and fenced missing-root variants.

### Task 3: Prove malformed content still fails closed

**Files:**
- Modify: ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts:145-190
- Test: ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts

- [ ] **Step 1: Add the fail-closed table**

~~~ts
test('rejects material JSON damage beyond one missing root closure', () => {
  for (const content of [
    '{"chapter_patch":{"title":"零点档案}',
    '{"chapter_patch":{"title":"零点档案\\',
    '{"worldbuilding":[{"world_summary":"零点记录"}}',
    '{"worldbuilding":[}',
    '{"chapter_patch":not-json',
    '{"chapter_patch":{}',
  ]) expectInvalid('material_repair_json', content, 'material_repair')
})
~~~

The first two leave a string open or an escape pending. The next two leave or mismatch an internal array. The fifth remains invalid after appending one brace. The last becomes valid JSON after recovery but is rejected by the existing non-empty mutation requirement.

- [ ] **Step 2: Run the focused guard suite**

~~~bash
cd ui/server && bun test src/novel-writing-service/generation-source/stage-response-contract.test.ts
~~~

Expected: all cases pass without broad JSON salvage.

- [ ] **Step 3: Run adjacent material and generation-source suites**

~~~bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/service/material-repair-contract.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts
~~~

Expected: zero failures. The downstream material mutation contract remains stricter than syntax recovery.

- [ ] **Step 4: Commit the focused red-green change**

~~~bash
git add -- \
  ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts \
  ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts
git diff --cached --check
git diff --cached --name-only
git commit -m "fix(mcp): recover material root closure"
~~~

Expected: the commit contains only the two stage-response-contract files.

### Task 4: Run complete automated verification

**Files:**
- Verify only; create no files.

- [ ] **Step 1: Run all MCP and generation-source tests**

~~~bash
cd ui/server && bun test src/mcp src/novel-writing-service/generation-source
~~~

Expected: zero failures.

- [ ] **Step 2: Run the full Server suite**

~~~bash
cd ui/server && bun test
~~~

Expected: zero failures.

- [ ] **Step 3: Run the full Web suite**

~~~bash
cd ui/web && bun test
~~~

Expected: zero failures.

- [ ] **Step 4: Run repository checks and builds**

~~~bash
bun run check
git diff --check
git status --short --branch
~~~

Expected: all commands exit 0. The two protected user files may remain modified but must not be staged.

### Task 5: Repeat the real page acceptance exactly once

**Files:**
- Verify local workspace /tmp/mangaforge-buda-acceptance-a.lWJwW2; do not modify repository configuration files.

- [ ] **Step 1: Restart the Server so the parser is loaded**

Stop only the existing Server process, start bun run dev in ui/server, and verify http://127.0.0.1:8787/api/status responds. Keep the Vite Web process.

- [ ] **Step 2: Establish the zero-write baseline**

Read project 4/chapter 4 counts for worldbuilding, characters, settings, chapter usage, chapter text length, latest material Task ID, and quarantine count. Confirm no task is running and no Agent quarantine is active.

- [ ] **Step 3: Trigger one material repair from the page**

Open http://127.0.0.1:5173/novel/workspace/4, reload after the Server restart, and click 补齐材料 once. Record the new Task suffix; do not click again while pending.

- [ ] **Step 4: Verify material success and semantic readiness**

Wait for the single terminal state. Confirm source mcp, a new Task and Session, a successful material_repair_json artifact, worldbuilding, at least one character, settings, chapter usage, increased material score, strict preflight ready, and no new quarantine.

- [ ] **Step 5: Trigger chapter production once**

From the same page click the enabled正文生成 action once. Wait for the chapter chain to finish. Confirm prose Task/Session differ from material Task/Session and the chapter has non-empty prose.

- [ ] **Step 6: Verify unique-source and protected-file invariants**

Confirm every chapter-production stage uses source mcp and no API model stage is mixed into the task.

~~~bash
git diff --cached --name-only | rg '^(ui/server/\.workspace-config\.json|workspace/assets\.json)$' && exit 1 || true
~~~

Expected: no protected path is printed.

### Task 6: Final review and authorized main push

**Files:**
- Review all accumulated MCP implementation changes; do not alter protected files.

- [ ] **Step 1: Perform spec review, then code-quality review**

Review against the approved design, earlier independent-session/material-repair specs, and the requirement that Buda remain an Adapter rather than an orchestration branch. Resolve every material issue and rerun affected tests.

- [ ] **Step 2: Re-run fresh final evidence after review fixes**

~~~bash
cd ui/server && bun test
cd ../web && bun test
cd ../.. && bun run check
git diff --check
git status --short --branch
~~~

Expected: zero failures and only intentional unstaged protected-file changes.

- [ ] **Step 3: Commit remaining reviewed MCP changes without protected files**

Stage explicit reviewed source/test paths only. Inspect git diff --cached --name-only, run git diff --cached --check, then commit. Never use git add -A or git add ..

- [ ] **Step 4: Push the authorized main branch**

~~~bash
git push origin main
~~~

Expected: push succeeds; local main matches origin/main; protected files remain local-only modifications.
