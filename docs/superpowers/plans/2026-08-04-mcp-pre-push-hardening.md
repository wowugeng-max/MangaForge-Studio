# MCP Pre-Push Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining MCP chapter-chain integrity gaps, prove a complete Buda-backed chapter and manual recheck, and push only the verified `main`.

**Architecture:** Keep the chapter workflow provider-neutral and preserve its one-source-per-task authority. Confine the empty-Drive workaround to the Buda Drive compatibility branch, validate MCP responses before a stage recorder can persist success, protect retained source configuration below the route layer, and separate persisted authority identity from the effective execution identity used by receipts.

**Tech Stack:** TypeScript, Bun, Bun test, Express, React, Ant Design, SQLite (`bun:sqlite`), Streamable HTTP MCP, Git.

---

## File Structure

- `.gitignore`: machine-local MCP secrets, quarantine state, and Zhuque artifacts.
- `ui/server/src/mcp/adapters/buda-drive.ts`: Buda Drive snapshot upload and the live `api_claw_*` empty-Drive compatibility branch.
- `ui/server/src/mcp/adapters/buda-drive.test.ts`: generic differential-sync invariants plus live Buda ordered-upsert coverage.
- `ui/server/src/mcp/errors.ts`: stable public MCP contract-failure code.
- `ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts`: exhaustive provider-neutral MCP stage result validation.
- `ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts`: every response-contract member, invalid payload, and safe-error coverage.
- `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: validate Adapter output inside the recorded stage operation.
- `ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`: failed receipt persistence for invalid MCP contracts.
- `ui/server/src/novel-writing-service/generation-source/source-config.ts`: canonical retained MCP binding extraction.
- `ui/server/src/routes/mcp-routes.ts`: Key/Server reference discovery and mutation protection.
- `ui/server/src/routes/mcp-routes.test.ts`: active, inactive, legacy, malformed, and model-only reference cases.
- `ui/server/src/routes/novel-mcp-binding-routes.ts`: source mutations through the dedicated repository primitive.
- `ui/server/src/routes/novel-mcp-binding-routes.test.ts`: inactive model save and explicit activation semantics.
- `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx`: editable retained API model while MCP remains active.
- `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx`: UI availability and no-implicit-activation assertions.
- `ui/server/src/novel/repos/projects.ts`: protected generation-source fields and dedicated atomic source mutation.
- `ui/server/src/novel/sqlite-persistence.test.ts`: stale ordinary writes cannot rotate either source field.
- `ui/server/src/novel/acceptance.test.ts`: acceptance fencing and Story State merge preserve authority.
- `ui/server/src/novel-writing-service/generation-source/types.ts`: authority fingerprint in task input, execution, provenance, and receipts.
- `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`: persisted authority snapshot versus materialized effective task snapshot.
- `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`: consistent effective model provenance.
- `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`: legacy request-model fingerprints and source fencing.
- `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`: acceptance receives the authority fingerprint, not a forged/effective substitute.
- `scripts/check-buda-chapter-task-session.mjs`: live task/session/source/no-fallback/cleanup assertions.
- `scripts/check-buda-chapter-task-session.test.ts`: deterministic smoke-helper coverage.
- `docs/superpowers/verification/2026-08-04-mcp-pre-push-hardening.md`: scrubbed final verification evidence only; never credentials or raw provider payloads.

### Task 1: Ignore Local MCP Secrets and Live-Test Artifacts

**Files:**
- Modify: `.gitignore`
- Verify: `workspace/mcp-agent-quarantines.json`
- Verify: `workspace/mcp-keys.json`
- Verify: `workspace/mcp-servers.json`
- Verify: `workspace/zhuque-inputs/`
- Verify: `workspace/zhuque-reports/`

- [ ] **Step 1: Run the ignore assertion before changing the file**

```bash
test "$(git check-ignore \
  workspace/mcp-agent-quarantines.json \
  workspace/mcp-keys.json \
  workspace/mcp-servers.json \
  workspace/zhuque-inputs \
  workspace/zhuque-reports | wc -l | tr -d ' ')" = "5"
```

Expected: FAIL with exit status 1 because the five local paths are not all ignored.

- [ ] **Step 2: Add only the approved local paths**

Append this exact block to `.gitignore`:

```gitignore
# Machine-local MCP credentials, runtime quarantine state, and live-test artifacts
workspace/mcp-agent-quarantines.json
workspace/mcp-keys.json
workspace/mcp-servers.json
workspace/zhuque-inputs/
workspace/zhuque-reports/
```

Do not add `workspace/assets.json`, delete any live artifact, or implement Key encryption in this task.

- [ ] **Step 3: Verify ignore behavior and the dirty workspace**

Run:

```bash
git check-ignore -v \
  workspace/mcp-agent-quarantines.json \
  workspace/mcp-keys.json \
  workspace/mcp-servers.json \
  workspace/zhuque-inputs \
  workspace/zhuque-reports
git status --short
```

Expected: all five paths match `.gitignore`; `workspace/assets.json` remains modified and unstaged; the three MCP JSON files and two Zhuque directories no longer appear as untracked.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git diff --cached --check
git commit -m "chore(mcp): ignore local runtime secrets"
```

Expected: the commit contains only `.gitignore`.

### Task 2: Upsert an Empty Live Buda Drive Without Preflight Reads

**Files:**
- Modify: `ui/server/src/mcp/adapters/buda-drive.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-drive.ts`

- [ ] **Step 1: Replace the live-probe expectation with a failing ordered-upsert test**

Add a fixture helper and test that record exact operations:

```ts
const LIVE_PATH_ORDER = [
  '/mangaforge/writing-bible.md',
  '/mangaforge/story-state.json',
  '/mangaforge/continuity.md',
  '/mangaforge/recent-chapters.md',
  '/mangaforge/manifest.json',
] as const

test('full-upserts an empty live Buda Drive without list or pre-upsert reads', async () => {
  const snapshot = snapshotFixture()
  const remote = new Map<string, string>()
  const operations: string[] = []
  const client = {
    async callTool(name: string, args: any) {
      if (name === 'api_claw_list_api_agent_drive_files') {
        throw new Error('live list must not be called')
      }
      if (name === 'api_claw_upsert_api_agent_drive_file') {
        operations.push(`write:${args.body.path}`)
        remote.set(args.body.path, args.body.content)
        return result({ ok: true })
      }
      if (name === 'api_claw_api_agent_drive_text') {
        operations.push(`read:${args.body.filePath}`)
        return result({
          exists: remote.has(args.body.filePath),
          content: remote.get(args.body.filePath) || '',
        })
      }
      throw new Error(`unexpected tool ${name}`)
    },
  }

  const synced = await syncBudaDriveSnapshot({
    ...deadlineOptions(),
    client: client as any,
    tools: {
      listDriveFiles: 'api_claw_list_api_agent_drive_files',
      readDriveText: 'api_claw_api_agent_drive_text',
      upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
    },
    agentId: 'agent-1',
    snapshot,
  })

  expect(synced.uploaded_paths).toEqual(LIVE_PATH_ORDER)
  expect(operations).toEqual(LIVE_PATH_ORDER.flatMap(path => [`write:${path}`, `read:${path}`]))
})
```

Update the existing live retry/reconciliation tests so their live branch also expects no read before the first write. Keep the generic test named `uploads only changed files and verifies their remote text` unchanged.

- [ ] **Step 2: Run the Buda Drive tests to prove RED**

Run:

```bash
cd ui/server && bun test src/mcp/adapters/buda-drive.test.ts
```

Expected: FAIL because the live branch reads every target before deciding what to upload.

- [ ] **Step 3: Implement a Buda-only deterministic live upload order**

Add this constant and branch in `buda-drive.ts`:

```ts
const LIVE_BUDA_UPSERT_ORDER = [
  '/mangaforge/writing-bible.md',
  '/mangaforge/story-state.json',
  '/mangaforge/continuity.md',
  '/mangaforge/recent-chapters.md',
  '/mangaforge/manifest.json',
] as const

const liveBudaTools = tools.upsertDriveFile.startsWith('api_claw_')
  && tools.readDriveText.startsWith('api_claw_')

const changed: string[] = []
if (liveBudaTools) {
  changed.push(...LIVE_BUDA_UPSERT_ORDER)
} else {
  const listed = mcpResultData(await client.callTool(
    tools.listDriveFiles,
    buildBudaToolArguments('listDriveFiles', tools.listDriveFiles, {
      agentId,
      path: '/mangaforge',
    }),
    callOptions('read_safe'),
  ))
  const remotePaths = new Set<string>()
  for (const item of Array.isArray(listed?.files) ? listed.files : []) {
    if (item?.type === 'folder') continue
    const path = String(item?.path || item?.filePath || '')
    if (path) remotePaths.add(path)
  }
  for (const [path, content] of Object.entries(snapshot.files)) {
    if (!remotePaths.has(path)) {
      changed.push(path)
      continue
    }
    const remote = driveFileState(await client.callTool(
      tools.readDriveText,
      buildBudaToolArguments('readDriveText', tools.readDriveText, {
        agentId,
        filePath: path,
        maxBytes: 5_000_000,
      }),
      callOptions('read_safe'),
    ))
    if (!remote.exists || sha256(remote.content) !== snapshot.hashes[path]) changed.push(path)
  }
}
```

Continue using the existing mutation loop. It already supplies exact post-write read-back, ambiguous-write reconciliation, the bounded `Server not initialized` retry, manifest-last ordering, deadline propagation, and `MCP_DRIVE_SYNC_FAILED`. Do not alter the common Adapter types.

- [ ] **Step 4: Run focused and neighboring tests**

Run:

```bash
cd ui/server && bun test \
  src/mcp/adapters/buda-drive.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/mcp/adapters/buda-tool-map.test.ts
```

Expected: PASS. The generic differential test still uploads only changed/missing files; the live test records five write/read pairs and no list/preflight read.

- [ ] **Step 5: Commit**

```bash
git add \
  ui/server/src/mcp/adapters/buda-drive.ts \
  ui/server/src/mcp/adapters/buda-drive.test.ts
git diff --cached --check
git commit -m "fix(mcp): initialize empty Buda drives"
```

### Task 3: Fail Closed on Invalid MCP Stage Response Contracts

**Files:**
- Create: `ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts`
- Modify: `ui/server/src/mcp/errors.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`
- Test: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write exhaustive contract tests**

Create a table covering all eleven members:

```ts
import { describe, expect, test } from 'bun:test'
import { validateMcpStageResponse } from './stage-response-contract'
import type { ChapterStageResponseContract } from './types'

const proseContracts = [
  'draft_prose',
  'word_target_prose',
  'editor_rewrite_prose',
  'meme_polish_prose',
  'humanize_prose',
  'revision_prose',
] as const satisfies readonly ChapterStageResponseContract[]

const jsonFixtures: Record<
  Exclude<ChapterStageResponseContract, (typeof proseContracts)[number]>,
  object
> = {
  readability_json: { readability_score: 88, passed: true, issues: [], suggestions: [] },
  quality_review_json: { score: 88, publishable: true, findings: [] },
  structured_review_json: {
    continuity_checks: [{
      key: 'continuity',
      label: '连续性',
      status: 'pass',
      evidence: '人物仍在城门',
      fix: '',
      remaining_risk: '',
    }],
  },
  editor_report_json: { passed: true, issues: [], suggestions: [] },
  story_state_json: { state_delta: { current_time: '次日清晨' } },
}

describe('MCP stage response contracts', () => {
  for (const contract of proseContracts) {
    test(`accepts non-empty prose for ${contract}`, () => {
      expect(validateMcpStageResponse('revision', contract, {
        content: '第一章\n风从城门吹来。',
      }).output).toBeTruthy()
    })
  }

  for (const [contract, payload] of Object.entries(jsonFixtures) as Array<
    [ChapterStageResponseContract, object]
  >) {
    test(`accepts semantic JSON for ${contract}`, () => {
      expect(validateMcpStageResponse('quality_review', contract, {
        content: JSON.stringify(payload),
      }).output).toEqual(payload)
    })
  }

  for (const invalid of ['', '{}', '普通解释文字', '{"score":"high"}', '[]']) {
    test(`rejects invalid contract payload: ${JSON.stringify(invalid)}`, () => {
      expect(() => validateMcpStageResponse('quality_review', 'quality_review_json', {
        content: invalid,
      })).toThrow(expect.objectContaining({ code: 'MCP_STAGE_CONTRACT_INVALID' }))
    })
  }
})
```

Also add cases for JSON fences, supported prose wrappers (`chapter_text`, `prose_chapters`), missing Story State delta fields, invalid readability score/boolean, malformed structured/editor reports, arrays, Proxy/getter inputs, and an exhaustive `satisfies Record<ChapterStageResponseContract, ...>` validator map.

- [ ] **Step 2: Prove invalid output is currently accepted**

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts
```

Expected: FAIL because `stage-response-contract.ts` does not exist and invalid MCP output is not rejected before success receipt finalization.

- [ ] **Step 3: Add the stable error code and exhaustive validator**

Add `'MCP_STAGE_CONTRACT_INVALID'` to `McpErrorCode`, then implement the validator with a closed contract map:

```ts
import { types } from 'node:util'
import type { LLMResponse } from '../../llm/types'
import { McpError } from '../../mcp/errors'
import type {
  ChapterStageResponseContract,
  ChapterTaskStage,
} from './types'

type ContractValidator = (content: string) => unknown

function invalid(stage: ChapterTaskStage, contract: ChapterStageResponseContract): never {
  throw new McpError(
    'MCP_STAGE_CONTRACT_INVALID',
    `MCP stage ${stage} 返回结果不符合 ${contract} 契约`,
    { stage, response_contract: contract },
  )
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && !types.isProxy(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function parseJsonObject(content: string) {
  const trimmed = content.trim()
  const candidate = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() || trimmed
  const parsed = JSON.parse(candidate)
  if (!plainObject(parsed)) throw new TypeError('JSON object required')
  return parsed
}

function proseValue(content: string): unknown {
  const trimmed = content.trim()
  if (!trimmed) throw new TypeError('non-empty prose required')
  try {
    const parsed = parseJsonObject(trimmed)
    const direct = typeof parsed.chapter_text === 'string'
      ? parsed.chapter_text
      : typeof parsed.chapterText === 'string'
        ? parsed.chapterText
        : ''
    if (direct.trim()) return parsed
    const chapters = Array.isArray(parsed.prose_chapters)
      ? parsed.prose_chapters
      : Array.isArray(parsed.proseChapters)
        ? parsed.proseChapters
        : []
    if (chapters.some(item => plainObject(item)
      && String(item.chapter_text ?? item.chapterText ?? '').trim())) return parsed
    throw new TypeError('prose wrapper required')
  } catch (error) {
    if (error instanceof SyntaxError) return trimmed
    throw error
  }
}

function finiteScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function validateProse(content: string) {
  return proseValue(content)
}

function validateReadability(content: string) {
  const value = parseJsonObject(content)
  if (!finiteScore(value.readability_score ?? value.score) || typeof value.passed !== 'boolean') {
    throw new TypeError('readability verdict required')
  }
  return value
}

function validateQualityReview(content: string) {
  const value = parseJsonObject(content)
  if (!finiteScore(value.score) || typeof value.publishable !== 'boolean') {
    throw new TypeError('quality verdict required')
  }
  for (const field of ['findings', 'blocking_findings', 'advisory_findings']) {
    if (value[field] !== undefined && !Array.isArray(value[field])) {
      throw new TypeError('quality findings must be arrays')
    }
  }
  return value
}

function validateStructuredReview(content: string) {
  const value = parseJsonObject(content)
  const entries = Object.entries(value)
  if (!entries.length || !entries.some(([, field]) => Array.isArray(field))) {
    throw new TypeError('structured review arrays required')
  }
  return value
}

function validateEditorReport(content: string) {
  const value = parseJsonObject(content)
  const hasVerdict = typeof value.passed === 'boolean' || finiteScore(value.score)
  const hasReport = Array.isArray(value.issues) || Array.isArray(value.suggestions)
  if (!hasVerdict && !hasReport) throw new TypeError('editor report required')
  return value
}

function validateStoryState(content: string) {
  const value = parseJsonObject(content)
  const delta = plainObject(value.state_delta)
    ? value.state_delta
    : plainObject(value.stateDelta)
      ? value.stateDelta
      : value
  const fields = [
    'current_time', 'currentTime', 'character_positions', 'characterPositions',
    'open_questions', 'openQuestions', 'next_chapter_priorities',
    'nextChapterPriorities', 'timeline', 'progress_summary', 'progressSummary',
  ]
  if (!fields.some(field => Object.prototype.hasOwnProperty.call(delta, field))) {
    throw new TypeError('Story State delta required')
  }
  return value
}

const validators = {
  draft_prose: validateProse,
  word_target_prose: validateProse,
  editor_rewrite_prose: validateProse,
  meme_polish_prose: validateProse,
  readability_json: validateReadability,
  humanize_prose: validateProse,
  quality_review_json: validateQualityReview,
  structured_review_json: validateStructuredReview,
  revision_prose: validateProse,
  editor_report_json: validateEditorReport,
  story_state_json: validateStoryState,
} satisfies Record<ChapterStageResponseContract, ContractValidator>

export function validateMcpStageResponse(
  stage: ChapterTaskStage,
  contract: ChapterStageResponseContract,
  response: LLMResponse,
): LLMResponse {
  try {
    if (!response || typeof response !== 'object' || types.isProxy(response)) {
      return invalid(stage, contract)
    }
    const output = validators[contract](String(response.content || ''))
    return { ...response, output }
  } catch (error) {
    if (error instanceof McpError && error.code === 'MCP_STAGE_CONTRACT_INVALID') throw error
    return invalid(stage, contract)
  }
}
```

Implement `validateProse`, `validateReadability`, `validateQualityReview`, `validateStructuredReview`, `validateEditorReport`, and `validateStoryState` in the same focused file. Each must return the exact parsed value downstream already consumes; no default score, `passed`, empty report, or fallback prose may be invented.

- [ ] **Step 4: Validate inside the recorded MCP operation**

In `McpChapterTaskExecution.executeAgent`, replace the raw `parseAgentOutput` return with:

```ts
return this.recordStage(stage, { prompt, responseContract }, async () => {
  const result = await this.runRemoteStage({
    requestId: safeOutboundRequestId(
      this.scrubber,
      `${this.taskId}:${stage}:${++this.stageSequence}`,
    ),
    stage,
    responseContract,
    prompt,
  })
  return {
    ...validateMcpStageResponse(stage, responseContract, { content: result.content }),
    modelName: this.binding.model || 'MCP Auto',
  }
})
```

Validate draft prose inside its existing `recordStage('draft', ..., async () => ...)` callback before building `prose_chapters`. Do not validate the generic model source in this task and do not add model fallback.

- [ ] **Step 5: Require a failed durable receipt**

Add this focused integration assertion to `stage-receipts.test.ts` or the MCP execution section of `generation-source.test.ts`:

```ts
expect(caught).toMatchObject({ code: 'MCP_STAGE_CONTRACT_INVALID' })
const [run] = await listNovelRuns(activeWorkspace, project.id)
expect(run.status).toBe('failed')
expect(JSON.parse(run.output_ref!)).toMatchObject({
  stage: 'quality_review',
  status: 'failed',
  error_code: 'MCP_STAGE_CONTRACT_INVALID',
})
expect(modelCalls).toBe(0)
```

The test must pass invalid `{}` through an actual MCP `executeAgent` call so the validator exception occurs inside `createChapterStageRecorder`'s operation callback.

- [ ] **Step 6: Run focused and chapter-routing tests**

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel-writing-service/service/chapter-task-stage-routing.test.ts \
  src/novel-writing-service/service/chapter-task-optional-stage-rejections.test.ts
```

Expected: PASS; all eleven contracts are exhaustively covered, invalid output creates a failed receipt, and no model execution occurs.

- [ ] **Step 7: Commit**

```bash
git add \
  ui/server/src/mcp/errors.ts \
  ui/server/src/novel-writing-service/generation-source/stage-response-contract.ts \
  ui/server/src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git diff --cached --check
git commit -m "fix(mcp): enforce stage response contracts"
```

### Task 4: Protect Every Retained MCP Key and Server Reference

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`
- Modify: `ui/server/src/routes/mcp-routes.ts`
- Modify: `ui/server/src/routes/mcp-routes.test.ts`

- [ ] **Step 1: Add retained-reference cases before implementation**

Create projects covering active MCP, inactive retained MCP, legacy MCP, model-only, a different target, and malformed explicit chapter state. Assert both public listing and destructive guards call the same finder:

```ts
test('finds active, inactive retained, and legacy MCP bindings and fails closed on malformed state', async () => {
  const retained = {
    server_id: 'buda',
    key_id: key.id,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: '',
  }
  const active = await createNovelProject(workspace, {
    title: '活动 MCP',
    reference_config: {
      chapter_generation_source: {
        version: 'chapter_generation_source_v1',
        active: 'mcp',
        model: { model_id: 217 },
        mcp: retained,
      },
    },
  })
  const inactive = await createNovelProject(workspace, {
    title: '保留 MCP',
    reference_config: {
      chapter_generation_source: {
        version: 'chapter_generation_source_v1',
        active: 'model',
        model: { model_id: 217 },
        mcp: retained,
      },
    },
  })
  const legacy = await createNovelProject(workspace, {
    title: '旧 MCP',
    reference_config: {
      prose_generation_source: {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: retained,
      },
    },
  })

  expect(await findMcpProjectReferences(workspace, { keyId: key.id })).toEqual(expect.arrayContaining([
    { id: active.id, title: active.title },
    { id: inactive.id, title: inactive.title },
    { id: legacy.id, title: legacy.title },
  ]))
  expect(await findMcpProjectReferences(workspace, { keyId: key.id })).toHaveLength(3)

  await createNovelProject(workspace, {
    title: '损坏来源',
    reference_config: {
      chapter_generation_source: { version: 'chapter_generation_source_v1' },
    },
  })
  await expect(findMcpProjectReferences(workspace, { keyId: key.id }))
    .rejects.toMatchObject({ code: 'MCP_BINDING_INVALID' })
})
```

Add route assertions that `GET /api/mcp/keys` reports the same `bound_projects`, and Key disable/reassignment/delete plus Server disable/delete return `MCP_REFERENCED_RECORD_CONFLICT` for the inactive retained binding.

- [ ] **Step 2: Run the focused route tests to prove RED**

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/routes/mcp-routes.test.ts
```

Expected: FAIL because `projectMcpBinding()` reads only legacy `prose_generation_source`.

- [ ] **Step 3: Add one canonical provider-neutral extractor**

Add this function to `source-config.ts`:

```ts
export function retainedMcpProjectBinding(project: any): McpProjectBinding | null {
  const config = project?.reference_config
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  if (Object.prototype.hasOwnProperty.call(config, 'chapter_generation_source')) {
    return normalizeChapterGenerationSource(config.chapter_generation_source).mcp || null
  }
  if (Object.prototype.hasOwnProperty.call(config, 'prose_generation_source')) {
    const legacy = normalizeProseGenerationSource(config.prose_generation_source)
    return legacy.type === 'mcp' ? legacy.mcp : null
  }
  return null
}
```

The explicit chapter field is authoritative even when `active === 'model'`. If it exists but is malformed, allow the normalizer to throw; do not fall back to legacy or treat the project as unbound.

- [ ] **Step 4: Make all Key/Server public and mutation paths use it**

Replace `projectMcpBinding()` in `mcp-routes.ts`:

```ts
export const findMcpProjectReferences: FindProjectReferences = async (
  activeWorkspace,
  target,
) => {
  const projects = await listNovelProjects(activeWorkspace)
  const references: ProjectReference[] = []
  for (const project of projects) {
    const binding = retainedMcpProjectBinding(project)
    if (!binding) continue
    if (target.serverId && binding.server_id !== target.serverId) continue
    if (target.keyId && binding.key_id !== target.keyId) continue
    references.push({ id: project.id, title: project.title })
  }
  return references
}
```

Keep `GET /api/mcp/keys`, Server disable/delete, and Key disable/reassignment/delete wired to `findReferences`; do not duplicate extraction logic in a route.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts
```

Expected: PASS. Inactive retained and legacy bindings block all destructive mutations; malformed explicit state fails closed; mismatched/model-only projects remain unreferenced.

- [ ] **Step 6: Commit**

```bash
git add \
  ui/server/src/novel-writing-service/generation-source/source-config.ts \
  ui/server/src/novel-writing-service/generation-source/source-config.test.ts \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/mcp-routes.test.ts
git diff --cached --check
git commit -m "fix(mcp): protect retained project bindings"
```

### Task 5: Configure the Inactive API Model Without Activating It

**Files:**
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx`

- [ ] **Step 1: Add backend behavior coverage**

Add a test for the legacy MCP state whose retained model is empty:

```ts
test('stores an inactive model while MCP stays active and activates it only explicitly', async () => {
  const { workspace, key, first, handlers } = await fixture()
  await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/mcp`), {
    params: { id: String(first.id) },
    body: { mcp: binding(key.id) },
  })
  await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
    params: { id: String(first.id) },
    body: { active: 'mcp' },
  })

  const saved = await call(routeHandler(handlers, `PUT ${CHAPTER_SOURCE_BASE}/model`), {
    params: { id: String(first.id) },
    body: { model_id: 218 },
  })
  expect(saved.body.source).toMatchObject({
    active: 'mcp',
    model: { model_id: 218 },
    mcp: binding(key.id),
  })

  const activated = await call(routeHandler(handlers, `POST ${CHAPTER_SOURCE_BASE}/activate`), {
    params: { id: String(first.id) },
    body: { active: 'model' },
  })
  expect(activated.body.source).toMatchObject({
    active: 'model',
    model: { model_id: 218 },
    mcp: binding(key.id),
  })
  expect((await getNovelProject(workspace, first.id))?.reference_config?.chapter_generation_source)
    .toEqual(activated.body.source)
})
```

This should already pass and locks in the route's intended separate save/activate semantics.

- [ ] **Step 2: Add a failing Web control test**

Use the existing `renderToStaticMarkup`, `sourceView`, and `actionHarness` helpers to assert the inactive API selector remains enabled and saving does not activate it:

```tsx
const html = renderToStaticMarkup(React.createElement(
  module.ChapterGenerationSourceControl,
  {
    projectId: 1,
    authority: confirmedAuthorityState(sourceView('mcp')),
    modelOptions: [{ value: 218, label: '模型 218' }],
    selectedModelId: 217,
    compact: false,
    locallyBusy: false,
    beginSourceOperation: () => ({ projectId: 1, loadEpoch: 1, operationEpoch: 1 }),
    assertSourceOperationCurrent: () => {},
    onAuthorityChange: () => {},
    onSelectedModelConfirmed: () => {},
    onOpenSettings: () => {},
  },
))
expect(html).not.toContain('ant-select-disabled')

const calls: string[] = []
const harness = actionHarness(module, {
  initial: sourceView('mcp'),
  api: {
    saveModel: async () => {
      calls.push('saveModel')
      return sourceView('mcp', { modelId: 218 })
    },
    activate: async () => {
      calls.push('activate')
      return sourceView('model', { modelId: 218 })
    },
  },
})
await harness.actions.saveModel(218)
expect(harness.authority.source?.source.active).toBe('mcp')
expect(calls).toEqual(['saveModel'])
```

- [ ] **Step 3: Run RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx
```

Expected: FAIL because `modelDisabled` includes `active === 'mcp'` and the `<Select>` also requires `isActive`.

- [ ] **Step 4: Enable configuration while preserving inactive styling**

Change the control logic to:

```tsx
const modelDisabled = availability.disabled
const modelDisabledReason = availability.reason

<Select
  className="novel-chapter-source-model novel-workspace-model-select"
  size="small"
  value={source?.source.model.model_id}
  onChange={value => { void actions.saveModel(Number(value)) }}
  options={modelOptions}
  popupMatchSelectWidth={440}
  placeholder="选择停用路径的模型"
  disabled={modelDisabled}
/>
```

Keep the tag text `模型 API · 已停用`, the inactive CSS class, and the separate Segmented activation action. Source locked, local busy, pending mutation, and unknown authority must still disable the selector.

- [ ] **Step 5: Run server and Web coverage**

Run:

```bash
cd ui/server && bun test src/routes/novel-mcp-binding-routes.test.ts
cd ../../ui/web && bun test \
  src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx \
  src/pages/novel-workspace/chapterGenerationSourceModel.test.ts
```

Expected: PASS. Saving model 218 leaves MCP active and retained; only `/activate` changes `active`.

- [ ] **Step 6: Commit**

```bash
git add \
  ui/server/src/routes/novel-mcp-binding-routes.test.ts \
  ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx \
  ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx
git diff --cached --check
git commit -m "fix(web): configure inactive chapter model"
```

### Task 6: Make SQLite the Generation-Source Authority

**Files:**
- Modify: `ui/server/src/novel/repos/projects.ts`
- Modify: `ui/server/src/novel/sqlite-persistence.test.ts`
- Modify: `ui/server/src/novel/acceptance.test.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`

- [ ] **Step 1: Add stale-write repository tests**

Add one table-driven test that attempts replacement, deletion, and restoration through both ordinary primitives:

```ts
test('ordinary project writes preserve both generation-source authority fields', async () => {
  const project = await createNovelProject(workspace, {
    title: '来源权威',
    reference_config: {
      prose_generation_source: legacySource,
      chapter_generation_source: chapterSource,
      notes: 'current',
    },
  })

  await updateNovelProject(workspace, project.id, {
    synopsis: 'ordinary update',
    reference_config: {
      prose_generation_source: staleLegacySource,
      chapter_generation_source: staleChapterSource,
      notes: 'updated',
    },
  })
  await mutateNovelProjectReferenceConfig(workspace, {
    projectId: project.id,
    operation: 'ordinary-reference-mutation',
    mutate: current => ({
      referenceConfig: { notes: `${current.notes}-mutated` },
      result: true,
    }),
  })

  expect((await getNovelProject(workspace, project.id))?.reference_config).toMatchObject({
    prose_generation_source: legacySource,
    chapter_generation_source: chapterSource,
    notes: 'updated-mutated',
  })
})
```

Add a dedicated-mutation test requiring both fields to change in the same SQLite transaction. Update acceptance tests that intentionally rotate a source to use the dedicated primitive.

- [ ] **Step 2: Run repository and acceptance tests to prove RED**

Run:

```bash
cd ui/server && bun test \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
```

Expected: FAIL because `updateNovelProject()` and `mutateProjectReferenceConfigRow()` accept stale source fields and no dedicated mutation exists.

- [ ] **Step 3: Preserve protected fields in every ordinary write**

Add focused helpers in `repos/projects.ts`:

```ts
const GENERATION_SOURCE_FIELDS = [
  'prose_generation_source',
  'chapter_generation_source',
] as const

function preserveGenerationSourceFields(
  current: Record<string, any>,
  candidate: Record<string, any>,
) {
  const next = { ...candidate }
  for (const field of GENERATION_SOURCE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(current, field)) next[field] = current[field]
    else delete next[field]
  }
  return next
}
```

Use it after normalizing `updateNovelProject()` data:

```ts
const normalized = normalizeProjectRecord(data, { ...current, id, updated_at: nowIso() })
const next = {
  ...current,
  ...normalized,
  reference_config: preserveGenerationSourceFields(
    current.reference_config || {},
    normalized.reference_config || {},
  ),
  updated_at: nowIso(),
}
```

Use it in `mutateProjectReferenceConfigRow()` before `updateProjectRow()`. Preservation includes absence: stale input cannot recreate a field that the current row does not own.

- [ ] **Step 4: Add the only dedicated source mutation**

Add a separate option type and primitive:

```ts
type GenerationSourceMutation<T> = {
  projectId: number
  operation: string
  signal?: AbortSignal
  chapterGenerationSource: Record<string, any>
  proseGenerationSource: Record<string, any>
  assertCurrentProject?: (current: NovelProjectRecord) => void
  assertMutationCanCommit?: (next: NovelProjectRecord) => void
  result: T
}

export async function mutateNovelProjectGenerationSource<T>(
  activeWorkspace: string,
  options: GenerationSourceMutation<T>,
): Promise<{ project: NovelProjectRecord; result: T } | null> {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(options.projectId) as any
    if (!row) return null
    const current = projectFromRow(row)
    throwIfMutationAborted(options.signal)
    options.assertCurrentProject?.(current)
    throwIfMutationAborted(options.signal)
    const next = {
      ...current,
      reference_config: {
        ...(current.reference_config || {}),
        chapter_generation_source: options.chapterGenerationSource,
        prose_generation_source: options.proseGenerationSource,
      },
      updated_at: nowIso(),
    }
    throwIfMutationAborted(options.signal)
    updateProjectRow(db, next)
    throwIfMutationAborted(options.signal)
    options.assertMutationCanCommit?.(next)
    throwIfMutationAborted(options.signal)
    return { project: next, result: options.result }
  }, options.operation)
}
```

This ordering preserves the same abort and assertion fences as the generic mutation while allowing only this primitive to replace both protected fields.

- [ ] **Step 5: Route only source coordination through the dedicated primitive**

In `mutateChapterSource`, replace the generic mutation call:

```ts
const mutation = await mutateNovelProjectGenerationSource(activeWorkspace, {
  projectId: project.id,
  operation: input.operation,
  signal: input.lifecycle.signal,
  chapterGenerationSource: phaseOne.source,
  proseGenerationSource: toLegacyProseGenerationSource(phaseOne.source),
  result: phaseOne.source,
  assertCurrentProject: currentProject => {
    input.lifecycle.throwIfAborted()
    remainingValidationBudget(validationDeadline)
    assertExactProjectSnapshot(currentProject, phaseOne)
    assertChapterSourceLeaseAvailable(activeWorkspace, currentProject.id)
  },
  assertMutationCanCommit: () => {
    input.lifecycle.throwIfAborted()
    remainingValidationBudget(validationDeadline)
  },
})
```

Generic HTTP routes must continue to reject explicit protected fields with `assertNoGenerationSourceMutation`; repository preservation is defense in depth, not a public silent-ignore policy.

- [ ] **Step 6: Update intentional source-rotation tests**

Replace setup writes that deliberately rotate source authority:

```ts
await mutateNovelProjectGenerationSource(workspace, {
  projectId: project.id,
  operation: 'test-rotate-generation-source',
  chapterGenerationSource: rotatedChapterSource,
  proseGenerationSource: toLegacyProseGenerationSource(rotatedChapterSource),
  result: true,
})
```

Do this only where the test's purpose is source-change fencing. Tests for stale ordinary writes must continue to call `updateNovelProject()` or `mutateNovelProjectReferenceConfig()`.

- [ ] **Step 7: Run the source and acceptance suites**

Run:

```bash
cd ui/server && bun test \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/routes/novel-core-routes-a.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
```

Expected: PASS. Ordinary stale writes preserve exact current presence/value; dedicated mutation atomically writes chapter authority and legacy projection; Story State acceptance keeps the captured authority fence.

- [ ] **Step 8: Commit**

```bash
git add \
  ui/server/src/novel/repos/projects.ts \
  ui/server/src/novel/sqlite-persistence.test.ts \
  ui/server/src/novel/acceptance.test.ts \
  ui/server/src/routes/novel-mcp-binding-routes.ts \
  ui/server/src/routes/novel-mcp-binding-routes.test.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
git diff --cached --check
git commit -m "fix(novel): protect generation source authority"
```

### Task 7: Separate Authority and Effective Task Fingerprints

**Files:**
- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-receipts.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`

- [ ] **Step 1: Add legacy model fingerprint tests**

Add a resolver test that begins two tasks from the same persisted `model: {}` state:

```ts
test('fingerprints the effective legacy request model while fencing persisted authority', async () => {
  const persisted = {
    version: 'chapter_generation_source_v1' as const,
    active: 'model' as const,
    model: {},
  }
  const first = await resolver.beginTask(beginInput({ requestedModelId: 217 }))
  const firstAuthority = first.authorityFingerprint
  const firstFingerprint = first.fingerprint
  const firstProvenance = first.provenance()
  await first.close()
  const second = await resolver.beginTask(beginInput({ requestedModelId: 218 }))

  expect(firstProvenance.model_id).toBe(217)
  expect(second.modelId).toBe(218)
  expect(firstFingerprint).not.toBe(second.fingerprint)
  expect(firstAuthority).toBe(second.authorityFingerprint)
  expect(firstProvenance).toMatchObject({
    model_id: 217,
    source_fingerprint: firstFingerprint,
    authority_fingerprint: firstAuthority,
  })
  expect(second.provenance()).toMatchObject({
    model_id: 218,
    source_fingerprint: second.fingerprint,
    authority_fingerprint: second.authorityFingerprint,
  })
  await second.close()
})
```

Also add explicit assertions that changing the persisted source makes `assertCurrent()` reject and that configured model/MCP tasks have equal effective and authority fingerprints.

- [ ] **Step 2: Add receipt and acceptance RED cases**

Require stage input/output receipts to store both hashes and make acceptance consume `authority_fingerprint`:

```ts
expect(JSON.parse(run.output_ref!)).toMatchObject({
  source_fingerprint: execution.fingerprint,
  authority_fingerprint: execution.authorityFingerprint,
  model_id: 217,
})
expect(capturedAcceptance.expected_chapter_generation_source_fingerprint)
  .toBe(execution.authorityFingerprint)
```

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
```

Expected: FAIL because one `fingerprint` currently represents both identities and ignores the request-level model.

- [ ] **Step 3: Extend task and receipt types**

Add the persisted hash explicitly:

```ts
export type ChapterTaskProvenance = {
  task_id: string
  project_id: number
  chapter_id: number
  source: 'model' | 'mcp'
  source_fingerprint: string
  authority_fingerprint: string
  context_version: string
  // existing optional provider fields remain
}

export type ResolvedChapterTaskInput = BeginChapterTaskInput & {
  taskId: string
  sourceState: ChapterGenerationSourceState
  authorityFingerprint: string
  fingerprint: string
  contextVersion: string
  assertCurrent: () => Promise<void>
}

export interface ChapterTaskExecution {
  readonly taskId: string
  readonly source: 'model' | 'mcp'
  readonly modelId?: number
  readonly authorityFingerprint: string
  readonly fingerprint: string
  // existing methods remain
}
```

Update `projectChapterTaskProvenance()` to require and validate both `sha256:` values. Both running and terminal receipt projections must include `authority_fingerprint`.

- [ ] **Step 4: Materialize the effective immutable source before execution**

In `create-generation-source.ts`, retain the persisted identity and derive the effective one:

```ts
const authoritySourceState = freezeSourceState(resolveChapterGenerationSource(currentProject))
const authorityFingerprint = chapterGenerationSourceFingerprint(authoritySourceState)

let sourceState = authoritySourceState
let modelId: number | undefined
if (authoritySourceState.active === 'model') {
  modelId = positiveModelId(authoritySourceState.model.model_id)
    ?? positiveModelId(beginInput.requestedModelId)
  if (modelId === undefined) {
    throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
  }
  sourceState = freezeSourceState({
    ...authoritySourceState,
    model: { model_id: modelId },
  })
}
const fingerprint = chapterGenerationSourceFingerprint(sourceState)
```

Build `resolved` with `authorityFingerprint` and the effective `sourceState`. Capture `authorityFingerprint` in `assertCurrent()`:

```ts
if (currentFingerprint !== authorityFingerprint) throw activeSourceChanged()
```

For configured model and MCP states, the materialized source is unchanged and both fingerprints are equal.

- [ ] **Step 5: Propagate both identities consistently**

In `wrapExecution`, `ModelGenerationSource`, and `McpChapterTaskExecution`:

```ts
readonly authorityFingerprint = input.authorityFingerprint
readonly fingerprint = input.fingerprint
```

Build provenance in `create-novel-writing-service.ts` and MCP provenance with:

```ts
source_fingerprint: input.fingerprint,
authority_fingerprint: input.authorityFingerprint,
```

Keep `model_id` equal to the effective materialized `sourceState.model.model_id`. Never compute receipt identity from the request object after task construction.

- [ ] **Step 6: Use authority identity only for acceptance fencing**

Update the extraction helper:

```ts
export function acceptanceChapterGenerationSourceFingerprintFromGenerationSource(
  generationSource: any,
) {
  if (
    generationSource?.receipt_authority !== CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY
    || (generationSource?.source !== 'model' && generationSource?.source !== 'mcp')
  ) return ''
  const authority = typeof generationSource?.authority_fingerprint === 'string'
    ? generationSource.authority_fingerprint.trim()
    : ''
  if (/^sha256:[0-9a-f]{64}$/.test(authority)) return authority
  const compatibility = typeof generationSource?.source_fingerprint === 'string'
    ? generationSource.source_fingerprint.trim()
    : ''
  return /^sha256:[0-9a-f]{64}$/.test(compatibility) ? compatibility : ''
}
```

The compatibility branch reads historical receipts only. Every new task-scoped receipt must contain both hashes.

- [ ] **Step 7: Run focused and full generation-source tests**

Run:

```bash
cd ui/server && bun test \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts \
  src/novel/acceptance.test.ts
```

Expected: PASS. Request models 217/218 have different effective fingerprints, the same persisted authority fingerprint, matching receipt `model_id`, and unchanged acceptance fencing.

- [ ] **Step 8: Commit**

```bash
git add \
  ui/server/src/novel-writing-service/generation-source/types.ts \
  ui/server/src/novel-writing-service/generation-source/create-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/model-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts \
  ui/server/src/novel-writing-service/generation-source/stage-receipts.ts \
  ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts \
  ui/server/src/novel-writing-service/generation-source/generation-source.test.ts \
  ui/server/src/novel-writing-service/service/create-novel-writing-service.ts \
  ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
git diff --cached --check
git commit -m "fix(novel): fingerprint effective chapter models"
```

### Task 8: Harden the Buda Chapter Task/Session Smoke Check

**Files:**
- Modify: `scripts/check-buda-chapter-task-session.mjs`
- Modify: `scripts/check-buda-chapter-task-session.test.ts`

- [ ] **Step 1: Add failing projection and invariant tests**

Extend receipt fixtures with `authority_fingerprint`, `server_id`, `key_id`, `adapter_id`, `agent_id`, and `model`, then add:

```ts
test('requires one provider identity and both fingerprints for the automatic chain', () => {
  const receipts = [
    receipt('draft'),
    receipt('quality_review'),
    receipt('quality_repair'),
    receipt('story_state_sync'),
  ]
  expect(assertOneTaskSession(receipts)).toMatchObject({
    source_fingerprint: fingerprint,
    authority_fingerprint: fingerprint,
    server_id: 'buda',
    key_id: 7,
    adapter_id: 'buda',
    agent_id: 'agent-1',
    model: 'MCP Auto',
  })

  expect(() => assertOneTaskSession([
    receipt('draft'),
    receipt('story_state_sync', { key_id: 8 }),
  ])).toThrow('invalid chapter task receipts')
})

test('requires released project source and no unresolved quarantine', () => {
  expect(projectSourceAuthority(sourceView({ locked: false }))).toMatchObject({
    locked: false,
    fingerprint,
  })
  expect(() => projectSourceAuthority(sourceView({ locked: true })))
    .toThrow('chapter source remains locked')
  expect(projectQuarantineList([])).toEqual([])
  expect(() => projectQuarantineList([quarantineFixture]))
    .toThrow('unresolved MCP quarantine remains')
})
```

Add cases for missing/mismatched authority hashes, model-source receipts after the baseline, non-empty accepted prose, Story State chapter advancement, and new manual task/session with the same source/provider identity.

- [ ] **Step 2: Run RED**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: FAIL because the smoke projection currently keeps only task/session/source fingerprint and does not verify quarantine, final locks, provider identity, or post-run prose/Story State.

- [ ] **Step 3: Project the complete safe receipt identity**

Update `projectAssertionReceipt()`:

```js
const authorityFingerprint = boundedString(
  ownDataValue(value, 'authority_fingerprint'),
  SHA256_FINGERPRINT,
)
const serverId = boundedString(ownDataValue(value, 'server_id'), OPAQUE_ID)
const keyId = positiveSafeInteger(ownDataValue(value, 'key_id'))
const adapterId = boundedString(ownDataValue(value, 'adapter_id'), OPAQUE_ID)
const agentId = boundedString(ownDataValue(value, 'agent_id'), OPAQUE_ID)
const model = boundedLabel(ownDataValue(value, 'model'), 160)
if (!taskId || !stage || source !== 'mcp' || !sourceFingerprint
  || !authorityFingerprint || !sessionId || !serverId || !keyId
  || !adapterId || !agentId || !model) {
  throw safeError(errorMessage, 'INVALID_RECEIPTS')
}
return {
  task_id: taskId,
  stage,
  source_fingerprint: sourceFingerprint,
  authority_fingerprint: authorityFingerprint,
  session_id: sessionId,
  server_id: serverId,
  key_id: keyId,
  adapter_id: adapterId,
  agent_id: agentId,
  model,
}
```

Update `assertOneTaskSession()` to compare every returned field. Extend `projectStageReceipt()` to merge and project these safe fields from the input/output refs. Do not project prompts, prose, raw output, Server URL, headers, or Key material.

- [ ] **Step 4: Add source, chapter, Story State, and quarantine assertions**

Make authority reads reject a residual project lease:

```js
const locked = ownDataValue(value, 'locked')
if (locked !== false) {
  throw safeError('chapter source remains locked', 'CHAPTER_SOURCE_LOCKED')
}
return {
  fingerprint,
  locked,
  server_id: boundedString(ownDataValue(binding, 'server_id'), OPAQUE_ID),
  key_id: positiveSafeInteger(ownDataValue(binding, 'key_id')),
  adapter_id: boundedString(ownDataValue(binding, 'adapter_id'), OPAQUE_ID),
  agent_id: boundedString(ownDataValue(binding, 'agent_id'), OPAQUE_ID),
  model: boundedLabel(ownDataValue(binding, 'model'), 160) || 'MCP Auto',
}
```

Add bounded public projections:

```js
export function projectQuarantineList(value) {
  if (!Array.isArray(value) || types.isProxy(value)) {
    throw safeError('invalid quarantine list', 'INVALID_QUARANTINES')
  }
  if (value.length) {
    throw safeError('unresolved MCP quarantine remains', 'MCP_QUARANTINE_REMAINS')
  }
  return []
}

function projectStoryState(project, expectedChapterNo) {
  const referenceConfig = ownDataValue(project, 'reference_config')
  const storyState = ownDataValue(referenceConfig, 'story_state')
  const lastUpdated = positiveSafeInteger(ownDataValue(storyState, 'last_updated_chapter'))
  if (!lastUpdated || lastUpdated < expectedChapterNo) {
    throw safeError('Story State did not advance', 'STORY_STATE_NOT_ADVANCED')
  }
  return { last_updated_chapter: lastUpdated }
}
```

Use exact public response shapes observed in existing route tests; keep hostile-object checks and bounded response parsing intact.

- [ ] **Step 5: Strengthen `main()` terminal checks**

After automatic completion:

```js
const acceptedChapter = projectChapter(await requestJson(
  options.baseUrl,
  `/api/novel/chapters/${options.chapterId}?project_id=${options.projectId}`,
  undefined,
  deadline,
), options.projectId, options.chapterId)
if (!acceptedChapter.has_prose) {
  throw safeError('accepted chapter has no prose', 'CHAPTER_PROSE_EMPTY')
}
```

After the manual recheck:

```js
const finalAuthority = projectSourceAuthority(await requestJson(
  options.baseUrl,
  `/api/novel/projects/${options.projectId}/chapter-generation-source`,
  undefined,
  deadline,
))
if (finalAuthority.fingerprint !== authority.fingerprint) {
  throw safeError('chapter source changed during smoke', 'SOURCE_CHANGED_DURING_SMOKE')
}
projectQuarantineList(await requestJson(
  options.baseUrl,
  '/api/mcp/quarantines',
  undefined,
  deadline,
))
```

Read the project and verify Story State at the generated chapter number. Require every post-baseline chapter-stage receipt to be MCP; a model receipt or malformed receipt must fail the run. Check automatic and manual provider identity against the captured source authority. Because the manual action successfully reacquires the Agent and the final source is unlocked with no quarantine, both project and remote Agent lifecycle paths have terminal evidence.

Use this exact project read before building the safe summary:

```js
const finalProject = await requestJson(
  options.baseUrl,
  `/api/novel/projects/${options.projectId}`,
  undefined,
  deadline,
)
const storyState = projectStoryState(finalProject, acceptedChapter.chapter_no)
```

- [ ] **Step 6: Keep final output safe and useful**

Return only:

```js
{
  ok: true,
  project_id: options.projectId,
  chapter_id: options.chapterId,
  chapter_has_prose: true,
  story_state_last_updated_chapter: storyState.last_updated_chapter,
  source_fingerprint: maskFingerprint(authority.fingerprint),
  automatic: {
    run_id: automatic.run_id,
    stages: automaticStages,
    session: maskSessionId(automaticSession.session_id),
  },
  manual: {
    stages: manualStages,
    session: maskSessionId(manualSession.session_id),
  },
  tasks_different: true,
  sessions_different: true,
  source_locked: false,
  quarantines: 0,
}
```

Do not display Server headers, raw Agent/Session IDs, full fingerprints, credentials, remote output, prompts, or prose.

- [ ] **Step 7: Run the deterministic smoke tests**

Run:

```bash
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: PASS, including hostile/malformed public response tests and exact safe error diagnostics.

- [ ] **Step 8: Commit**

```bash
git add \
  scripts/check-buda-chapter-task-session.mjs \
  scripts/check-buda-chapter-task-session.test.ts
git diff --cached --check
git commit -m "test(mcp): harden Buda chapter smoke"
```

### Task 9: Run Full Automated Verification and Live Buda Acceptance

**Files:**
- Create after success: `docs/superpowers/verification/2026-08-04-mcp-pre-push-hardening.md`
- Runtime-only, never stage: `workspace/mcp-agent-quarantines.json`
- Runtime-only, never stage: `workspace/mcp-keys.json`
- Runtime-only, never stage: `workspace/mcp-servers.json`
- Runtime-only, never stage: `workspace/assets.json`
- Runtime-only, never stage: `workspace/zhuque-inputs/`
- Runtime-only, never stage: `workspace/zhuque-reports/`

- [ ] **Step 1: Run all focused MCP/source tests from a fresh process**

Run:

```bash
cd ui/server && bun test \
  src/mcp/adapters/buda-drive.test.ts \
  src/mcp/adapters/buda-adapter.test.ts \
  src/novel-writing-service/generation-source/source-config.test.ts \
  src/novel-writing-service/generation-source/stage-response-contract.test.ts \
  src/novel-writing-service/generation-source/stage-receipts.test.ts \
  src/novel-writing-service/generation-source/generation-source.test.ts \
  src/routes/mcp-routes.test.ts \
  src/routes/novel-mcp-binding-routes.test.ts \
  src/novel/sqlite-persistence.test.ts \
  src/novel/acceptance.test.ts \
  src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts
cd ../../
bun test scripts/check-buda-chapter-task-session.test.ts
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run complete server and Web suites**

Run:

```bash
cd ui/server && bun test
cd ../web && bun test
```

Expected: both complete suites PASS. Treat unhandled rejections, hung workers, or skipped tests introduced by this change as failures.

- [ ] **Step 3: Run production builds and repository checks**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
bun run check:refactor-boundaries
bun run build:server
bun run build:web
```

Expected: all three commands exit 0.

- [ ] **Step 4: Start the local server without exposing credentials**

Use a dedicated terminal from the repository root:

```bash
bun run dev:server
```

Expected: the server becomes available on its configured loopback URL. Do not pass an account, password, Key, Cookie, or authorization header on the command line; the already configured ignored MCP stores supply the test binding.

- [ ] **Step 5: Confirm the live target is safe to mutate**

Using read-only project/chapter endpoints, confirm:

```text
project_id = 6
chapter_id = 129
chapter.project_id = 6
chapter.chapter_text is empty
chapter generation source active = mcp
chapter generation source adapter_id = buda
chapter generation source locked = false
```

Expected: all conditions hold. If chapter 129 already contains prose, stop the live run and investigate; do not erase accepted prose merely to reuse the target.

- [ ] **Step 6: Execute the real automatic chapter and manual recheck**

Run with the actual loopback port:

```bash
cd ui/server
bun run smoke:buda:chapter-source -- \
  --base-url http://127.0.0.1:8787 \
  --project-id 6 \
  --chapter-id 129 \
  --timeout-ms 1800000 \
  --poll-interval-ms 1000
```

Expected safe JSON:

```json
{
  "ok": true,
  "project_id": 6,
  "chapter_id": 129,
  "chapter_has_prose": true,
  "tasks_different": true,
  "sessions_different": true,
  "source_locked": false,
  "quarantines": 0
}
```

The output must also list automatic `draft`, at least one quality/review/repair stage, and `story_state_sync`; manual stages must belong to a new task/Session with the same source/provider fingerprint. The script fails if any post-baseline stage uses the model source.

- [ ] **Step 7: Re-run full verification after live workspace mutation**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio/ui/server && bun test
cd ../web && bun test
cd /Users/ruiyaosong/MangaForge-Studio
bun run build:server
bun run build:web
```

Expected: PASS. The live novel and Story State changes remain runtime data and are not staged.

- [ ] **Step 8: Record scrubbed evidence**

Create `docs/superpowers/verification/2026-08-04-mcp-pre-push-hardening.md` with this structure and actual command totals/timestamps:

```md
# MCP Pre-Push Hardening Verification

- Date/time (Asia/Shanghai): 2026-08-04 ...
- Focused server tests: PASS (...)
- Complete server tests: PASS (...)
- Complete Web tests: PASS (...)
- Server build: PASS
- Web build: PASS
- Live target: project 6 / chapter 129
- Accepted prose: non-empty
- Automatic chain: one task / one masked Session / one masked source fingerprint
- Automatic stages: draft, ..., story_state_sync
- Manual recheck: new task / new masked Session / same masked source fingerprint
- Model fallback calls: 0
- Remaining quarantines: 0
- Project source locked after terminal cleanup: false
```

Record only masked values printed by the smoke script. Do not copy credentials, full Session IDs/fingerprints, provider headers, raw MCP payloads, prompts, or prose.

- [ ] **Step 9: Commit verification evidence**

```bash
git add docs/superpowers/verification/2026-08-04-mcp-pre-push-hardening.md
git diff --cached --check
git commit -m "docs(mcp): record live chapter verification"
```

Expected: the commit contains only the scrubbed verification document.

### Task 10: Final Review, Remote Drift Gate, and Push

**Files:**
- Review: all commits after the captured `origin/main` base
- Preserve unstaged: `workspace/assets.json`
- Never stage: all ignored MCP and Zhuque runtime paths

- [ ] **Step 1: Run the final automated gate once more**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git diff --check origin/main...HEAD
bun run check
cd ui/server && bun test
cd ../web && bun test
```

Expected: all commands PASS from the exact HEAD intended for push.

- [ ] **Step 2: Review the complete change range**

Run:

```bash
cd /Users/ruiyaosong/MangaForge-Studio
git log --oneline --decorate origin/main..HEAD
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- \
  .gitignore \
  ui/server/src/mcp \
  ui/server/src/novel \
  ui/server/src/novel-writing-service/generation-source \
  ui/server/src/routes/mcp-routes.ts \
  ui/server/src/routes/novel-mcp-binding-routes.ts \
  ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx \
  scripts/check-buda-chapter-task-session.mjs \
  docs/superpowers
```

Expected: no unresolved Critical or Important review findings; Buda-specific names remain confined to the Buda Adapter/Drive implementation, template, tests, and explicitly Buda-named smoke tool.

- [ ] **Step 3: Audit the index and local-only paths**

Run:

```bash
git status --short
git diff --cached --name-only
git ls-files \
  workspace/mcp-agent-quarantines.json \
  workspace/mcp-keys.json \
  workspace/mcp-servers.json \
  workspace/zhuque-inputs \
  workspace/zhuque-reports
git diff --cached | rg -n \
  'Authorization: Bearer|Cookie: session=|\"key\"\s*:'
```

Expected: `workspace/assets.json` remains unstaged; `git ls-files` and the credential scan print nothing; the index is empty after all intended commits.

- [ ] **Step 4: Fetch and compare the remote base**

Capture before fetch:

```bash
REMOTE_BEFORE="$(git rev-parse origin/main)"
git fetch origin main
REMOTE_AFTER="$(git rev-parse origin/main)"
test "$REMOTE_BEFORE" = "$REMOTE_AFTER"
git merge-base --is-ancestor origin/main HEAD
```

Expected: all commands exit 0. If the remote changed, stop before pushing and reconcile the new commits through a non-destructive review/rebase workflow.

- [ ] **Step 5: Push the verified local `main`**

Run:

```bash
git push origin main
```

Expected: push succeeds without force.

- [ ] **Step 6: Verify the remote points at the tested commit**

Run:

```bash
LOCAL_HEAD="$(git rev-parse HEAD)"
git fetch origin main
test "$(git rev-parse origin/main)" = "$LOCAL_HEAD"
git status --short --branch
```

Expected: `main` is no longer ahead of `origin/main`; only the user's preserved `workspace/assets.json` modification may remain visible.

## Final Requirement Map

- Empty live Buda Drive, manifest last, exact read-back, retry/reconciliation: Task 2.
- Provider-neutral fail-closed stage contracts and failed receipts: Task 3.
- Active/inactive/legacy retained Key/Server protection: Task 4.
- Editable inactive API model and explicit activation: Task 5.
- SQLite protected fields and dedicated atomic source mutation: Task 6.
- Effective versus authority fingerprint provenance and fencing: Task 7.
- Prose, quality/repair, Story State, no fallback, no quarantine, and cleanup evidence: Tasks 8-9.
- Secret hygiene, full verification, drift review, and non-force push: Tasks 1, 9, and 10.
