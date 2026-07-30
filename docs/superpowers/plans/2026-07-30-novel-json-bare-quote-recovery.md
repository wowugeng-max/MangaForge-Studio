# Novel Structured JSON Bare-Quote Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover otherwise complete novel structured JSON when a model emits unescaped ASCII quotes inside string values, while continuing to reject truncated Story State output and safely completing the same editor-revision run 757.

**Architecture:** Keep the existing strict candidate extraction and `JSON.parse()` path first. Only after all strict attempts fail, run one JSON-shaped candidate through a small linear scanner that escapes quotes which cannot legally close the current JSON string, then require the repaired candidate to pass full `JSON.parse()` validation. Story State transport and completeness gates remain unchanged, so `max_tokens` output is still blocked even when its partial JSON becomes parseable.

**Tech Stack:** TypeScript, Bun, Bun test, SQLite, Express, existing novel route utilities and Story State service.

---

## File map

- Create `ui/server/src/routes/novel-route-utils-payload.test.ts`: focused public-contract tests for strict parsing, bare-quote recovery, and fail-closed truncation.
- Modify `ui/server/src/routes/novel-route-utils-payload.ts`: one internal bare-quote scanner and a post-strict-parse recovery pass.
- Modify `ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts`: Story State integration coverage for complete malformed JSON and `max_tokens` rejection.
- Verify only `ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts`, `ui/server/src/routes/novel-editor/revision-worker.test.ts`, `ui/server/src/novel/repos/editor-revision-runs.test.ts`, and project-config suites.
- Never stage `workspace/assets.json`, `workspace/zhuque-inputs/`, `workspace/zhuque-reports/`, or `/private/tmp` diagnostics.

### Task 1: Recover bare quotes only after strict JSON parsing fails

**Files:**
- Create: `ui/server/src/routes/novel-route-utils-payload.test.ts`
- Modify: `ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts`
- Modify: `ui/server/src/routes/novel-route-utils-payload.ts`

- [ ] **Step 1: Write focused parser tests**

Create `ui/server/src/routes/novel-route-utils-payload.test.ts` with the exact public behaviors:

```ts
import { describe, expect, test } from 'bun:test'
import { parseJsonLikePayload } from './novel-route-utils-payload'

describe('parseJsonLikePayload bare quote recovery', () => {
  test('recovers unescaped ASCII quotes inside a JSON string value', () => {
    const raw = `\`\`\`json
{
  "state_delta": {
    "timeline": [{
      "event": "楚弦触发隐藏死律",
      "source_excerpt": "他触犯了"绝对不能在非整点下车"的隐藏死律。"
    }],
    "open_questions": ["第二双脚步声属于谁"]
  }
}
\`\`\``

    expect(parseJsonLikePayload(raw)).toEqual({
      state_delta: {
        timeline: [{
          event: '楚弦触发隐藏死律',
          source_excerpt: '他触犯了"绝对不能在非整点下车"的隐藏死律。',
        }],
        open_questions: ['第二双脚步声属于谁'],
      },
    })
  })

  test('leaves valid escaped quotes and structural quotes unchanged', () => {
    const raw = '{"state_delta":{"open_questions":["他说：\\"停下\\"。"],"current_time":"子时"}}'
    expect(parseJsonLikePayload(raw)).toEqual({
      state_delta: {
        open_questions: ['他说："停下"。'],
        current_time: '子时',
      },
    })
  })

  test('keeps truncated and non-JSON text fail-closed', () => {
    expect(parseJsonLikePayload('```json\n{"state_delta":{"open_questions":["未闭合"]}\n')).toBeNull()
    expect(parseJsonLikePayload('{"state_delta":{"open_questions":["未闭合')).toBeNull()
    expect(parseJsonLikePayload('这只是一段普通模型解释，不是 JSON。')).toBeNull()
  })
})
```

- [ ] **Step 2: Write Story State integration tests**

In `ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts`, inside `describe('prepareStoryStateUpdate')`, add a shared malformed response and two tests:

```ts
const bareQuoteStoryState = `\`\`\`json
{
  "state_delta": {
    "open_questions": ["第二双脚步声属于谁"],
    "timeline": [{
      "event": "楚弦触发隐藏死律",
      "source_excerpt": "他触犯了"绝对不能在非整点下车"的隐藏死律。"
    }]
  },
  "character_updates": [],
  "setting_updates": [],
  "storyline_updates": []
}
\`\`\``

test('recovers a complete Story State payload containing bare prose quotes', async () => {
  const prepared = await createService({ content: bareQuoteStoryState, finish_reason: 'stop' })
    .prepareStoryStateUpdate(
      workspace,
      { id: 99, reference_config: { story_state: {} } },
      { id: 20, chapter_no: 20 },
      {},
      '楚弦触发隐藏死律，章末传来第二双脚步声。',
    )

  expect(prepared.state_delta.open_questions).toEqual(['第二双脚步声属于谁'])
  expect(prepared.state_delta.timeline[0].source_excerpt)
    .toBe('他触犯了"绝对不能在非整点下车"的隐藏死律。')
  expect(prepared.hard_failures.some((item: any) => item.key === 'story_state_invalid_payload')).toBe(false)
  expect(prepared.hard_failures.some((item: any) => item.key === 'story_state_transport_incomplete')).toBe(false)
})

test('still blocks a repaired Story State payload when transport hit max tokens', async () => {
  const prepared = await createService({ content: bareQuoteStoryState, finish_reason: 'max_tokens' })
    .prepareStoryStateUpdate(
      workspace,
      { id: 100, reference_config: { story_state: {} } },
      { id: 21, chapter_no: 21 },
      {},
      '楚弦触发隐藏死律，章末传来第二双脚步声。',
    )

  expect(prepared.state_delta.open_questions).toEqual(['第二双脚步声属于谁'])
  expect(prepared.hard_failures).toContainEqual(expect.objectContaining({
    key: 'story_state_transport_incomplete',
  }))
})
```

- [ ] **Step 3: Verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-route-utils-payload.test.ts src/routes/novel-writing-service.prepared-story-state.test.ts
```

Expected: the valid and fail-closed controls pass, while the bare-quote parser and Story State recovery assertions fail because `parseJsonLikePayload()` currently returns `null` for the malformed complete envelope.

- [ ] **Step 4: Implement the minimal scanner**

Add this internal helper above `parseJsonLikePayload()` in `ui/server/src/routes/novel-route-utils-payload.ts`:

```ts
function repairBareQuotesInJsonStrings(value: string): string {
  const text = String(value || '').trim()
  if (!text || !['{', '['].includes(text[0]) || !text.includes('"')) return ''

  let repaired = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (!inString) {
      repaired += char
      if (char === '"') inString = true
      continue
    }
    if (escaped) {
      repaired += char
      escaped = false
      continue
    }
    if (char === '\\') {
      repaired += char
      escaped = true
      continue
    }
    if (char !== '"') {
      repaired += char
      continue
    }

    let lookahead = index + 1
    while (lookahead < text.length && /\s/.test(text[lookahead])) lookahead += 1
    const next = text[lookahead] || ''
    if (!next || [':', ',', '}', ']'].includes(next)) {
      repaired += char
      inString = false
    } else {
      repaired += '\\"'
    }
  }

  if (inString || escaped || repaired === text) return ''
  return repaired
}
```

After the existing strict candidate loop, add one repair loop before `return null`:

```ts
  for (const candidate of candidates) {
    const repaired = repairBareQuotesInJsonStrings(candidate)
    if (!repaired) continue
    try {
      return JSON.parse(repaired)
    } catch {
      // Quote repair never makes an otherwise incomplete envelope admissible.
    }
  }
```

Do not export the scanner, add dependencies, repair braces, or change `getNovelPayload()` fallback behavior.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
cd ui/server
bun test src/routes/novel-route-utils-payload.test.ts src/routes/novel-writing-service.prepared-story-state.test.ts
```

Expected: all tests pass, including complete bare-quote recovery and `max_tokens` rejection.

- [ ] **Step 6: Verify exact Story State call boundaries**

Run:

```bash
cd ui/server
bun test src/routes/novel-editor/single-chapter-story-state.test.ts \
  -t "exact prepare disables application-level retry|exact prepare forwards the configured Story State output budget"
```

Expected: both tests pass; one model call remains, the configured token budget is forwarded, and automatic application retry remains disabled.

- [ ] **Step 7: Commit the parser fix**

Run:

```bash
git add \
  ui/server/src/routes/novel-route-utils-payload.ts \
  ui/server/src/routes/novel-route-utils-payload.test.ts \
  ui/server/src/routes/novel-writing-service.prepared-story-state.test.ts
git diff --cached --check
git commit -m "fix(novel): recover bare quotes in structured JSON"
```

Expected: exactly the three Task 1 files are committed. User workspace data remains unstaged.

### Task 2: Full regression and independent review

**Files:**
- Verify only; no production edits unless review finds a concrete defect and a new RED test is added first.

- [ ] **Step 1: Run the complete focused server suite**

```bash
cd ui/server
bun test \
  src/routes/novel-route-utils-payload.test.ts \
  src/novel/editor-revision-runtime-config.test.ts \
  src/routes/novel-project-config-routes.test.ts \
  src/novel/repos/editor-revision-runs.test.ts \
  src/routes/novel-writing-service.prepared-story-state.test.ts \
  src/routes/novel-editor/single-chapter-story-state.test.ts \
  src/routes/novel-editor/revision-worker.test.ts
```

Expected: 0 failures.

- [ ] **Step 2: Run the web setting test and both builds**

```bash
cd ui/web
bun test src/pages/novel-workspace/ProjectSettingsModal.test.ts
cd ../..
bun run build:server
bun run build:web
```

Expected: the web test passes and both builds exit 0. Existing Vite chunk-size warnings are non-blocking.

- [ ] **Step 3: Run repository hygiene checks**

```bash
git diff --check
git status --short --branch
```

Expected: no code whitespace errors; only user-owned `workspace/assets.json` and `workspace/zhuque-*` remain outside commits.

- [ ] **Step 4: Complete spec and code-quality reviews**

Review the parser commit against:

- strict parsing always runs first;
- repair only handles JSON-shaped candidates and only inserts backslashes before non-structural quotes;
- repaired output must pass full `JSON.parse()`;
- truncated and non-JSON responses remain rejected;
- Story State `max_tokens`, model routing, one-call rule, retry disabling, and deterministic-fallback disabling remain intact.

Expected: no Critical or Important findings before live recovery. Any blocking finding returns to Task 1 with a new failing test.

### Task 3: Recover the same live run 757 with a 32000-token project budget

**Files:**
- Verify live SQLite/API state only.
- Temporary evidence may be written under `/private/tmp`; never under the repository.

- [ ] **Step 1: Record a fresh live safety snapshot**

Before any API mutation, record:

- run 757 project/chapter/model identity and failed Story State checkpoint;
- chapter 61 text SHA-256, length, `updated_at`, version count, and revision commit marker;
- run-linked review count and IDs;
- all 29 follower chapter fingerprints `id:chapter_no:updated_at:length:sha256`.

Require run 757 to remain failed/continuable at `sync_current_story_state`, model ID 36, candidate hash `c95ad16c4fb21c4545a5ee393b9fd5f9a660dd1faf95d00ee85d426c268b93d5`, prose and post-quality completed, and no active lease. Stop if any precondition differs.

- [ ] **Step 2: Start the verified current backend**

Resolve port 8787 exactly, stop only a verified stale MangaForge Bun listener if present, and start the current HEAD on `127.0.0.1:8787`. Because the local sandbox may isolate loopback sockets, use the approved host execution path for the server and local `curl` calls when required.

Confirm the config endpoint returns HTTP 200 before continuing.

- [ ] **Step 3: Set only the project Story State budget**

PUT:

```json
{
  "config": {
    "story_state_max_tokens": 32000
  }
}
```

Require the response config to equal:

```json
{
  "timeout_seconds": 600,
  "story_state_max_tokens": 32000
}
```

Do not replace sibling `reference_config` fields.

- [ ] **Step 4: Continue run 757 exactly once**

POST `/api/novel/editor-revisions/757/retry` with `{ "project_id": 3 }`.

Require HTTP 200, `action: "continue"`, run ID 757, phase `sync_current_story_state`, completed post-quality, null cleared Story State receipt, and no newly created revision run.

- [ ] **Step 5: Monitor by condition**

Poll the run/checkpoint every 15–30 seconds without another retry. Require:

- checkpoint runtime config token snapshot 32000;
- selected model ID 36 and `claude-sonnet-4-6 / cliproxyapi` in backend evidence;
- no transition into prose generation, admission, persistence, or post-quality;
- terminal completion or a durable failed state.

If the model returns `finish_reason: max_tokens`, retain the failed state and report the project setting as still insufficient. Do not accept or apply the payload. If transport is complete but `story_state_invalid_payload` remains, stop for new evidence instead of adding another heuristic.

- [ ] **Step 6: Verify live safety invariants**

After the terminal state, compare against Step 1:

- chapter 61 text SHA, length, `updated_at`, version count, and commit marker unchanged;
- run-linked editor revision and prose-quality review count unchanged;
- all 29 follower fingerprints unchanged;
- no new editor-revision run or commit;
- if completed, Story State receipt bound to run 757, chapter 61, and the exact candidate hash.

- [ ] **Step 7: Final repository audit**

```bash
git status --short --branch
git diff --check
git log --oneline origin/main..HEAD
```

Expected: design, plans, implementation, and tests are committed; temporary diagnostic files remain outside the repository; user workspace data remains unstaged. Do not push until the user requests it.
