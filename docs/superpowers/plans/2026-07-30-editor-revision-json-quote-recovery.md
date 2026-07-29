# Editor Revision JSON Quote Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a normally completed editor-revision response with a complete JSON envelope and unescaped prose double quotes/raw newlines to pass deterministic recovery, while continuing to reject genuinely truncated or open JSON.

**Architecture:** Keep the existing fail-closed transport and candidate-admission pipeline. Improve the shared prose-field recovery so it selects the longest structurally closed `chapter_text`, then let editor revision admit that recovered payload only when transport completed normally and the top-level JSON envelope is complete. Treat an exact JSON Markdown fence as a transport wrapper, and harden prompts to reduce recurrence.

**Tech Stack:** TypeScript, Bun, Bun test, SQLite-backed MangaForge server

---

## File map

- Modify `ui/server/src/routes/novel-route-utils-payload.ts`: recover the longest structurally closed prose string even when the first accidental quote appears after 200 characters.
- Modify `ui/server/src/routes/novel-writing-service.prose-word-target-a.test.ts`: cover late unescaped ASCII quotes in the shared payload parser.
- Modify `ui/server/src/routes/novel-editor/revision-candidate-admission.ts`: classify complete malformed JSON separately from genuinely partial JSON and allow an exact JSON fence as transport wrapping.
- Modify `ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts`: cover complete malformed admission, exact fenced JSON, truncation, open strings, and missing envelope closure.
- Modify `ui/server/src/routes/novel-editor/builders-revision-prompts.ts`: add a shared JSON-format hard rule to every editor-revision prompt branch.
- Modify `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`: assert the prompt contains the JSON quoting constraints.
- Do not modify `workspace/novel.sqlite`, chapter history, `workspace/assets.json`, `workspace/zhuque-inputs/`, or `workspace/zhuque-reports/`.

### Task 1: Recover the full structurally closed chapter string

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.prose-word-target-a.test.ts:677`
- Modify: `ui/server/src/routes/novel-route-utils-payload.ts:66-112`

- [ ] **Step 1: Write a failing parser regression test**

Add this test beside the existing unescaped-ASCII-quote recovery test:

```ts
test('recovers the full closed chapter text when an unescaped ascii quote appears after 200 characters', () => {
  const prefix = '分析局的冷白灯照着每个人，所有人都在等待第三次直播。'.repeat(18)
  const suffix = '走廊尽头的灯管开始闪烁，江哲仍然没有停下脚步。'.repeat(18)
  const chapterText = `${prefix}"第三位天选者，今晚就会被选中。"${suffix}`
  const payload = getNovelPayload({
    content: `\`\`\`json\n{"chapter_text":"${chapterText}","continuity_notes":[]}\n\`\`\``,
    finish_reason: 'end_turn',
  })

  expect(prefix.replace(/\s/g, '').length).toBeGreaterThan(200)
  expect(payload.chapter_text).toBe(chapterText)
  expect(payload.prose_chapters?.[0]?.chapter_text).toBe(chapterText)
  expect(payload.recovered_from_partial_json).toBe(true)
  expect(payload.partial_json_open_string_recovered).toBe(false)
})
```

- [ ] **Step 2: Run the parser test and verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-writing-service.prose-word-target-a.test.ts -t "recovers the full closed chapter text when an unescaped ascii quote appears after 200 characters"
```

Expected: FAIL because `chapter_text` stops at the first unescaped ASCII double quote instead of matching `chapterText`.

- [ ] **Step 3: Select the longest closed/structural field unconditionally**

In `recoverPartialProseJsonPayload`, replace the threshold-gated closed/structured selection with:

```ts
let partialJsonOpenStringRecovered = false
let chapterText = pickLongestText([
  readClosedJsonStringField(candidate, 'chapter_text'),
  recoverStructuredJsonStringField(candidate, 'chapter_text'),
])
if (compactLen(chapterText) < 200) {
  const openText = readOpenJsonStringField(candidate, 'chapter_text')
  if (compactLen(openText) > compactLen(chapterText)) {
    chapterText = openText
    partialJsonOpenStringRecovered = Boolean(openText)
  }
}
```

Keep the existing 200-character minimum, title/chapter number recovery, and recovery flags unchanged.

- [ ] **Step 4: Run focused parser tests and verify GREEN**

Run:

```bash
cd ui/server
bun test src/routes/novel-writing-service.prose-word-target-a.test.ts -t "recovers.*chapter text"
```

Expected: PASS for closed truncated JSON, open truncated JSON, raw-newline JSON, early unescaped quotes, and the new late-unescaped-quote case.

- [ ] **Step 5: Commit the parser fix**

```bash
git add ui/server/src/routes/novel-route-utils-payload.ts ui/server/src/routes/novel-writing-service.prose-word-target-a.test.ts
git commit -m "fix(novel): recover complete malformed prose JSON"
```

### Task 2: Admit only complete malformed editor-revision envelopes

**Files:**
- Modify: `ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts:54-220`
- Modify: `ui/server/src/routes/novel-editor/revision-candidate-admission.ts:360-476`

- [ ] **Step 1: Write failing admission tests**

Add helpers near `completePatchResult`:

```ts
function malformedFencedResult(chapterText: string, options: {
  finishReason?: string
  closeEnvelope?: boolean
  closeString?: boolean
} = {}) {
  const finishReason = options.finishReason || 'end_turn'
  const json = options.closeString === false
    ? `{"chapter_text":"${chapterText}`
    : `{"chapter_text":"${chapterText}","continuity_notes":[]${options.closeEnvelope === false ? '' : '}'}`
  return {
    finish_reason: finishReason,
    content: `\`\`\`json\n${json}\n\`\`\``,
  }
}
```

Add these tests:

```ts
test('admits a normally completed full JSON envelope recovered from unescaped prose quotes', () => {
  const sourceText = `${'甲'.repeat(1199)}。`
  const candidate = `${'乙段推进。'.repeat(100)}"现在行动。"${'丙段推进。'.repeat(100)}`
  const admission = admitRevisionCandidate({
    sourceText,
    result: malformedFencedResult(candidate),
  })

  expect(admission.chapterText).toBe(candidate)
  expect(admission.diagnostics).toMatchObject({ complete_malformed_json_recovered: true })
})

test('admits an exact JSON Markdown fence around an otherwise valid payload', () => {
  const sourceText = `${'甲'.repeat(1199)}。`
  const candidate = `${'乙'.repeat(899)}。`
  const result = {
    finish_reason: 'end_turn',
    content: `\`\`\`json\n${JSON.stringify({ chapter_text: candidate })}\n\`\`\``,
  }

  expect(admitRevisionCandidate({ sourceText, result }).chapterText).toBe(candidate)
})

test('still rejects truncated, open-string, and unclosed malformed JSON recovery', () => {
  const sourceText = `${'甲'.repeat(1199)}。`
  const candidate = `${'乙段推进。'.repeat(100)}"现在行动。"${'丙段推进。'.repeat(100)}`
  const openCandidate = `${'开放字符串仍在推进。'.repeat(100)}尚未结束`

  expect(captureAdmissionError(sourceText, malformedFencedResult(candidate, {
    finishReason: 'max_tokens',
  })).code).toBe('PROSE_REVISION_TRUNCATED')
  expect(captureAdmissionError(sourceText, malformedFencedResult(openCandidate, {
    closeString: false,
    closeEnvelope: false,
  })).code).toBe('REVISION_PARTIAL_JSON_RECOVERY')
  expect(captureAdmissionError(sourceText, malformedFencedResult(candidate, {
    closeEnvelope: false,
  })).code).toBe('REVISION_PARTIAL_JSON_RECOVERY')
})
```

- [ ] **Step 2: Run the admission tests and verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-editor/revision-candidate-admission.test.ts
```

Expected: FAIL because complete malformed recovery is still rejected and exact fenced JSON is still classified as a wrapper.

- [ ] **Step 3: Add exact-envelope classification helpers**

Add these helpers before `assertNoRevisionWrapper`:

```ts
function unwrapExactJsonFence(rawText: string) {
  const raw = String(rawText || '').trim()
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(raw)
  return {
    text: String(match?.[1] ?? raw).trim(),
    exactJsonFence: Boolean(match),
  }
}

function isCompleteMalformedRevisionEnvelope(result: any, payload: any) {
  if (payload?.recovered_from_partial_json !== true) return false
  if (payload?.partial_json_open_string_recovered === true) return false
  const envelope = unwrapExactJsonFence(extractLLMText(result)).text
  return envelope.startsWith('{') && envelope.endsWith('}')
}
```

- [ ] **Step 4: Keep partial recovery fail-closed except for complete envelopes**

Replace the current recovery rejection in `admitRevisionCandidate` with:

```ts
const payload = getNovelPayload(input.result)
const completeMalformedJsonRecovered = isCompleteMalformedRevisionEnvelope(input.result, payload)
if (payload.partial_json_open_string_recovered
  || (payload.recovered_from_partial_json && !completeMalformedJsonRecovered)) {
  throw admissionError('REVISION_PARTIAL_JSON_RECOVERY', '修订结果来自不完整 JSON 恢复')
}
```

Add the classification to the existing diagnostics object:

```ts
const diagnostics = {
  source_char_count: sourceCharCount,
  candidate_char_count: candidateCharCount,
  minimum_char_count: minimumCharCount,
  maximum_char_count: maximumCharCount,
  complete_malformed_json_recovered: completeMalformedJsonRecovered,
  ...patchDiagnostics,
}
```

- [ ] **Step 5: Allow only an exact JSON transport fence**

Update `assertNoRevisionWrapper` to unwrap an exact JSON fence before inspecting raw wrappers:

```ts
function assertNoRevisionWrapper(chapterText: string, rawText: string) {
  const prose = String(chapterText || '').trim()
  const raw = String(rawText || '').trim()
  const rawEnvelope = unwrapExactJsonFence(raw)
  const leadingChatWrapper = /^(?:以下(?:是|为)?(?:修订稿|修订结果)|(?:修订稿|修订结果)(?:如下所示|如下)?)/
  const codeFence = /```/
  const unexpectedRawFence = codeFence.test(raw) && !rawEnvelope.exactJsonFence
  const jsonProseShell = (/^\{[\s\S]*\}$/.test(prose) || /^\[[\s\S]*\]$/.test(prose))
  if (codeFence.test(prose)
    || unexpectedRawFence
    || leadingChatWrapper.test(prose)
    || leadingChatWrapper.test(rawEnvelope.text)
    || jsonProseShell) {
    throw admissionError('REVISION_OUTPUT_WRAPPER', '修订候选包含代码块、聊天说明或 JSON 正文外壳')
  }
}
```

- [ ] **Step 6: Run admission tests and verify GREEN**

Run:

```bash
cd ui/server
bun test src/routes/novel-editor/revision-candidate-admission.test.ts
```

Expected: all tests PASS; genuine partial JSON remains blocked.

- [ ] **Step 7: Commit admission behavior**

```bash
git add ui/server/src/routes/novel-editor/revision-candidate-admission.ts ui/server/src/routes/novel-editor/revision-candidate-admission.test.ts
git commit -m "fix(novel): admit complete malformed revision JSON"
```

### Task 3: Harden editor-revision JSON prompts

**Files:**
- Modify: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts:360-520`
- Modify: `ui/server/src/routes/novel-editor/builders-revision-prompts.ts:120-360`

- [ ] **Step 1: Write a failing prompt-contract test**

Extend `asks editor revision to follow workflow-revision context and output receipts` with:

```ts
expect(prompt).toContain('JSON 格式硬约束')
expect(prompt).toContain('可直接 JSON.parse')
expect(prompt).toContain('中文引号')
expect(prompt).toContain('英文双引号')
expect(prompt).toContain('必须转义')
```

Also extend `builds a compact retry prompt for truncated revision output` with the same assertions so both normal and compact prompt paths stay covered.

- [ ] **Step 2: Run the prompt tests and verify RED**

Run:

```bash
cd ui/server
bun test src/routes/novel-editor-routes.revision-safeguards.test.ts -t "editor revision|compact retry prompt"
```

Expected: FAIL because the shared JSON-format hard rule does not exist.

- [ ] **Step 3: Add and inject the shared JSON hard rule**

Add beside `REVISION_LANGUAGE_HARD_RULE`:

```ts
const REVISION_JSON_OUTPUT_HARD_RULE = 'JSON 格式硬约束：只输出一个可直接 JSON.parse 的 JSON object，不要输出 Markdown 代码围栏或解释；正文对白优先使用中文引号“”；若必须使用英文双引号，必须按 JSON 规则转义。'
```

Insert `REVISION_JSON_OUTPUT_HARD_RULE` into all five prompt arrays:

1. `buildEditorRevisionPrompt` opening-structural branch;
2. `buildEditorRevisionPrompt` structural-rewrite branch;
3. `buildEditorRevisionPrompt` ordinary patch branch;
4. `buildCompactEditorRevisionPrompt` opening-structural branch;
5. `buildCompactEditorRevisionPrompt` ordinary compact-patch branch.

Place it immediately after `REVISION_LANGUAGE_HARD_RULE` where present, or immediately after the task/project header in compact branches.

- [ ] **Step 4: Run prompt tests and verify GREEN**

Run:

```bash
cd ui/server
bun test src/routes/novel-editor-routes.revision-safeguards.test.ts
```

Expected: all revision safeguard tests PASS.

- [ ] **Step 5: Commit prompt hardening**

```bash
git add ui/server/src/routes/novel-editor/builders-revision-prompts.ts ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts
git commit -m "fix(novel): harden editor revision JSON prompts"
```

### Task 4: Verify the complete fix without touching chapter data

**Files:**
- Verify only; no database or chapter edits.

- [ ] **Step 1: Run the focused regression batch**

Run:

```bash
cd ui/server
bun test \
  src/routes/novel-writing-service.prose-word-target-a.test.ts \
  src/routes/novel-editor/revision-candidate-admission.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts
```

Expected: zero failures.

- [ ] **Step 2: Run editor worker and route regression tests**

Run:

```bash
cd ui/server
bun test \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor-routes.surgical-revision.test.ts \
  src/routes/novel-editor-routes.quality-card.test.ts
```

Expected: zero failures and no regression in persisted candidate or retry behavior.

- [ ] **Step 3: Build both applications**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run build:server
bun run build:web
```

Expected: both commands exit 0.

- [ ] **Step 4: Confirm only intended files changed**

Run:

```bash
git status --short
git diff --check
git log --oneline -5
```

Expected: only the known user-owned workspace files remain uncommitted; implementation files are committed. `workspace/novel.sqlite` is unchanged.

- [ ] **Step 5: Hand off the manual retest**

Ask the user to finish their manual version rollback, restart the service on the new commit, and submit one first-chapter revision. Monitor the new `editor_revision` run and verify that either:

- complete malformed JSON is admitted and the full candidate passes the existing length gate; or
- a genuine truncation is rejected without changing chapter text or creating a chapter version.
