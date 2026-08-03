# Unified Chapter Generation Source Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each novel project one persistent API-or-MCP chapter source and route every model-driven chapter-production stage through one task-scoped source, model/binding snapshot, and provider-neutral MCP task Session.

**Architecture:** Store a versioned `chapter_generation_source` state that retains both configurations while selecting exactly one active source. A project lease freezes that state for a task; a `ChapterTaskExecution` captures the active model or MCP binding and is threaded through draft, repair, review, revision, and story-state calls. The MCP core depends only on a provider-neutral task Session port selected by `adapter_id`; Buda-specific Drive, tool, run-correlation, and cleanup behavior remains inside `BudaAdapter`. One Adapter Session is reused for all stages, the current Agent lease/quarantine/receipt safeguards remain intact, and MCP never falls back to the API source.

**Tech Stack:** TypeScript, Bun test runner, Express, React 18, Ant Design, Axios, MCP Streamable HTTP, Buda MCP adapter, SQLite-backed novel repositories.

---

## File structure and responsibility map

Server source authority and lifecycle:

- `ui/server/src/novel-writing-service/generation-source/source-config.ts`: v1 state normalization, legacy conversion, retained binding ownership, active fingerprint.
- `ui/server/src/novel-writing-service/generation-source/errors.ts`: stable chapter-source error codes independent of MCP transport errors.
- `ui/server/src/novel-writing-service/generation-source/chapter-source-lease.ts`: project-level task lease used by both API and MCP tasks.
- `ui/server/src/novel-writing-service/generation-source/types.ts`: stage, response-contract, begin-task, execution-handle, and provenance types.
- `ui/server/src/novel-writing-service/generation-source/stage-receipts.ts`: bounded stage provenance shared by API and MCP.
- `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`: API execution using one captured model ID.
- `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`: provider-neutral MCP execution using one binding, Agent lease, and lazy Adapter task Session.
- `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`: task-start resolver and exactly-once cleanup composition.
- `ui/server/src/mcp/adapters/types.ts`: provider-neutral remote chapter-task Session and Adapter ports; no Buda protocol fields.
- `ui/server/src/mcp/adapters/buda-adapter.ts`: Buda Session creation, repeated stage messages, polling, extraction, and remote cleanup.
- `ui/server/src/routes/novel-mcp-binding-routes.ts`: new chapter-source endpoints plus legacy prose-source compatibility adapters.

Server production wiring:

- `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`: constructs the shared resolver and stage executor.
- `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`: begins after pre-draft work and closes after authoritative completion.
- `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts`: sends the draft through the task execution.
- `ui/server/src/novel-writing-service/service/prose-word-target-methods.ts`: expansion and contraction stages.
- `ui/server/src/novel-writing-service/service/prose-polish-methods.ts`: commercial edit, meme polish, and readability stages.
- `ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.ts`: full and risky-segment humanization stages.
- `ui/server/src/novel-writing-service/service/prose-self-review-run.ts`: review, structured fill, and revision stages.
- `ui/server/src/novel-writing-service/service/structured-review-fill-methods.ts`: structured review completion stage.
- `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-loop.ts`: quality review/recheck and repair stages.
- `ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts`: story-state synchronization model stage.
- `ui/server/src/routes/novel-editor/builders.ts`: manual quality review execution.
- `ui/server/src/routes/novel-editor/register-quality.ts`: manual recheck and story-state task boundaries.
- `ui/server/src/routes/novel-editor/register-revision.ts`: editor-report task boundary.
- `ui/server/src/routes/novel-editor/revision-worker.ts`: one task execution across revision, post-review, and state sync.

Web state and controls:

- `ui/web/src/api/mcp.ts`: public chapter-source contracts and HTTP methods.
- `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts`: pure state/form/status helpers.
- `ui/web/src/pages/novel-workspace/useNovelWorkspaceData.ts`: authoritative project source load and selected chapter model hydration.
- `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx`: mutually exclusive top-bar source control.
- `ui/web/src/pages/novel-workspace/McpGenerationSourceStatus.tsx`: active/inactive retained MCP identity display.
- `ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx`: binding test/save without implicit activation.
- `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`: separate activation and MCP binding sections.
- `ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx`: normal and immersive control placement.
- `ui/web/src/pages/NovelProjectWorkspace.css`: active, inactive, busy, and compact visual states.

## Task 1: Introduce the versioned retained source state

**Files:**

- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`

- [ ] **Step 1: Write failing normalization, migration, retention, and fingerprint tests**

Add these cases to `source-config.test.ts`:

```ts
import {
  chapterGenerationSourceFingerprint,
  normalizeChapterGenerationSource,
  resolveChapterGenerationSource,
  toLegacyProseGenerationSource,
} from './source-config'

test('migrates missing and legacy prose source records without writing them', () => {
  expect(resolveChapterGenerationSource({ reference_config: {} })).toEqual({
    version: 'chapter_generation_source_v1',
    active: 'model',
    model: {},
  })
  expect(resolveChapterGenerationSource({
    reference_config: {
      prose_generation_source: {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: {
          server_id: 'buda', key_id: 3, adapter_id: 'buda',
          agent_id: 'agent-1', model: 'model-x',
        },
      },
    },
  })).toEqual({
    version: 'chapter_generation_source_v1',
    active: 'mcp',
    model: {},
    mcp: {
      server_id: 'buda', key_id: 3, adapter_id: 'buda',
      agent_id: 'agent-1', model: 'model-x',
    },
  })
})

test('retains inactive configurations and fingerprints only the active source', () => {
  const modelActive = normalizeChapterGenerationSource({
    version: 'chapter_generation_source_v1',
    active: 'model',
    model: { model_id: 217 },
    mcp: {
      server_id: 'buda', key_id: 3, adapter_id: 'buda',
      agent_id: 'agent-1', model: '',
    },
  })
  expect(chapterGenerationSourceFingerprint(modelActive)).toBe(
    chapterGenerationSourceFingerprint({
      ...modelActive,
      mcp: { ...modelActive.mcp!, agent_id: 'inactive-agent-change' },
    }),
  )
  expect(chapterGenerationSourceFingerprint(modelActive)).not.toBe(
    chapterGenerationSourceFingerprint({
      ...modelActive,
      model: { model_id: 218 },
    }),
  )
  expect(toLegacyProseGenerationSource(modelActive)).toEqual({
    version: 'prose_generation_source_v1', type: 'model',
  })
})

test('rejects malformed active, model, and MCP records', () => {
  for (const value of [
    { version: 'chapter_generation_source_v1', active: 'both', model: {} },
    { version: 'chapter_generation_source_v1', active: 'model' },
    { version: 'chapter_generation_source_v1', active: 'model', model: { model_id: 1.5 } },
    { version: 'chapter_generation_source_v1', active: 'mcp', model: {} },
  ]) {
    expect(() => normalizeChapterGenerationSource(value)).toThrow()
  }
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `bun test ui/server/src/novel-writing-service/generation-source/source-config.test.ts`

Expected: FAIL because the four chapter-source exports do not exist.

- [ ] **Step 3: Implement the new contract and non-destructive legacy resolver**

Add to `source-config.ts`, retaining `normalizeMcpProjectBinding` and the credential validation functions:

```ts
export const CHAPTER_GENERATION_SOURCE_VERSION = 'chapter_generation_source_v1' as const

export type ChapterGenerationSourceState = {
  version: typeof CHAPTER_GENERATION_SOURCE_VERSION
  active: 'model' | 'mcp'
  model: { model_id?: number }
  mcp?: McpProjectBinding
}

function normalizeChapterModel(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '章节模型配置必须是对象')
  }
  const raw = (value as Record<string, unknown>).model_id
  if (raw === undefined || raw === null || raw === '') return {}
  const modelId = Number(raw)
  if (!Number.isInteger(modelId) || modelId <= 0) {
    throw new McpError('MCP_BINDING_INVALID', '章节 model_id 必须是正整数')
  }
  return { model_id: modelId }
}

export function normalizeChapterGenerationSource(value: unknown): ChapterGenerationSourceState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源配置必须是对象')
  }
  const record = value as Record<string, unknown>
  if (record.version !== CHAPTER_GENERATION_SOURCE_VERSION) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源版本缺失或不受支持')
  }
  if (record.active !== 'model' && record.active !== 'mcp') {
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源必须启用 model 或 mcp')
  }
  const state: ChapterGenerationSourceState = {
    version: CHAPTER_GENERATION_SOURCE_VERSION,
    active: record.active,
    model: normalizeChapterModel(record.model),
    ...(record.mcp === undefined ? {} : { mcp: normalizeMcpProjectBinding(record.mcp) }),
  }
  if (state.active === 'mcp' && !state.mcp) {
    throw new McpError('MCP_BINDING_INVALID', '启用 MCP 需要完整项目绑定')
  }
  return state
}

export function resolveChapterGenerationSource(project: any): ChapterGenerationSourceState {
  const config = project?.reference_config
  if (config && Object.prototype.hasOwnProperty.call(config, 'chapter_generation_source')) {
    return normalizeChapterGenerationSource(config.chapter_generation_source)
  }
  const legacy = resolveProseGenerationSource(project)
  return legacy.type === 'mcp'
    ? {
        version: CHAPTER_GENERATION_SOURCE_VERSION,
        active: 'mcp',
        model: {},
        mcp: legacy.mcp,
      }
    : { version: CHAPTER_GENERATION_SOURCE_VERSION, active: 'model', model: {} }
}

export function chapterGenerationSourceFingerprint(state: ChapterGenerationSourceState) {
  const source = normalizeChapterGenerationSource(state)
  const identity = source.active === 'model'
    ? [source.version, source.active, source.model.model_id || null]
    : [
        source.version, source.active, source.mcp!.server_id, source.mcp!.key_id,
        source.mcp!.adapter_id, source.mcp!.agent_id, source.mcp!.model,
      ]
  return `sha256:${createHash('sha256').update(JSON.stringify(identity), 'utf8').digest('hex')}`
}

export function toLegacyProseGenerationSource(state: ChapterGenerationSourceState): ProseGenerationSourceConfig {
  const source = normalizeChapterGenerationSource(state)
  return source.active === 'mcp'
    ? { version: SOURCE_VERSION, type: 'mcp', mcp: source.mcp! }
    : { ...MODEL_PROSE_GENERATION_SOURCE }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/generation-source/source-config.test.ts`

Expected: PASS with all legacy prose-source tests still green.

- [ ] **Step 5: Commit the source-state contract**

```bash
git add ui/server/src/novel-writing-service/generation-source/source-config.ts ui/server/src/novel-writing-service/generation-source/source-config.test.ts
git commit -m "feat(generation): add retained chapter source state"
```

## Task 2: Preserve inactive MCP ownership and protect dedicated fields

**Files:**

- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/source-config.test.ts`
- Modify: `ui/server/src/routes/novel-core/register.ts`
- Modify: `ui/server/src/routes/novel-core-routes-a.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

- [ ] **Step 1: Write failing tests for inactive tuple exclusivity and generic-write omission**

Add one server test that stores an inactive binding on project one and validates the same tuple for project two:

```ts
test('an inactive retained MCP tuple remains exclusive to its project', async () => {
  const first = await createNovelProject(workspace, {
    title: '项目一',
    reference_config: {
      chapter_generation_source: {
        version: 'chapter_generation_source_v1',
        active: 'model',
        model: { model_id: 217 },
        mcp: {
          server_id: 'buda', key_id: key.id, adapter_id: 'buda',
          agent_id: 'agent-1', model: '',
        },
      },
    },
  })
  const second = await createNovelProject(workspace, { title: '项目二', reference_config: {} })
  await expect(validateMcpProjectBinding(workspace, second, {
    server_id: 'buda', key_id: key.id, adapter_id: 'buda',
    agent_id: 'agent-1', model: '',
  }, { runtime: { listAgents: async () => [{ id: 'agent-1' }] } as any }))
    .rejects.toMatchObject({ code: 'MCP_BINDING_INVALID', details: { reason: 'binding_conflict' } })
  expect(first.id).not.toBe(second.id)
})
```

Extend the web omission test so both dedicated fields are removed without reading inherited properties:

```ts
const payload = buildGenericReferenceConfigWritePayload({
  notes: '保留',
  prose_generation_source: { version: 'prose_generation_source_v1', type: 'model' },
  chapter_generation_source: {
    version: 'chapter_generation_source_v1', active: 'model', model: { model_id: 217 },
  },
})
expect(payload).toEqual({ notes: '保留' })
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `bun test ui/server/src/novel-writing-service/generation-source/source-config.test.ts ui/server/src/routes/novel-core-routes-a.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: FAIL because ownership only inspects active legacy MCP and generic writes only omit the legacy field.

- [ ] **Step 3: Make retained ownership authoritative**

Replace the conflict binding lookup in `validateMcpProjectBinding` with:

```ts
const conflict = projects.find(item => {
  if (Number(item.id) === Number(project?.id)) return false
  let other: McpProjectBinding | undefined
  try {
    other = resolveChapterGenerationSource(item).mcp
  } catch {
    return false
  }
  return Boolean(other
    && other.server_id === binding.server_id
    && other.key_id === binding.key_id
    && other.adapter_id === binding.adapter_id
    && other.agent_id === binding.agent_id)
})
```

Rename the dedicated mutation guard and reject either own field:

```ts
export function assertNoGenerationSourceMutation(referenceConfig: unknown) {
  if (!referenceConfig || typeof referenceConfig !== 'object' || Array.isArray(referenceConfig)) return
  for (const field of ['prose_generation_source', 'chapter_generation_source']) {
    if (!Object.prototype.hasOwnProperty.call(referenceConfig, field)) continue
    throw new McpError(
      'MCP_BINDING_INVALID',
      `${field} 只能通过专用章节来源接口修改`,
      { reason: 'dedicated_binding_route_required', field },
    )
  }
}
```

Update all three calls in `novel-core/register.ts` to use `assertNoGenerationSourceMutation`.

- [ ] **Step 4: Omit both source fields from generic web saves**

Replace the helper body in `mcpGenerationSourceModel.ts` with:

```ts
export function buildGenericReferenceConfigWritePayload<T extends Record<string, unknown>>(
  referenceConfig: T,
): Omit<T, 'prose_generation_source' | 'chapter_generation_source'> {
  const payload = { ...referenceConfig } as Record<string, unknown>
  delete payload.prose_generation_source
  delete payload.chapter_generation_source
  return payload as Omit<T, 'prose_generation_source' | 'chapter_generation_source'>
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/generation-source/source-config.test.ts ui/server/src/routes/novel-core-routes-a.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: PASS; an inactive binding conflicts, and neither dedicated source can be overwritten through generic project/reference routes.

- [ ] **Step 6: Commit retained ownership protections**

```bash
git add ui/server/src/novel-writing-service/generation-source/source-config.ts ui/server/src/novel-writing-service/generation-source/source-config.test.ts ui/server/src/routes/novel-core/register.ts ui/server/src/routes/novel-core-routes-a.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
git commit -m "fix(generation): retain inactive MCP ownership"
```

## Task 3: Add a project-level chapter-source lease

**Files:**

- Create: `ui/server/src/novel-writing-service/generation-source/errors.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/chapter-source-lease.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/chapter-source-lease.test.ts`

- [ ] **Step 1: Write failing lease lifecycle and serialization tests**

Create `chapter-source-lease.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { ChapterSourceLeaseRegistry } from './chapter-source-lease'

describe('ChapterSourceLeaseRegistry', () => {
  test('locks one project, permits another, and releases exactly once', async () => {
    const registry = new ChapterSourceLeaseRegistry()
    const first = await registry.acquire('/workspace/a', 5, 'task-a')
    expect(registry.isActive('/workspace/a', 5)).toBe(true)
    expect(registry.isActive('/workspace/a', 6)).toBe(false)
    await expect(registry.acquire('/workspace/a', 5, 'task-b'))
      .rejects.toMatchObject({ code: 'GENERATION_SOURCE_BUSY' })
    await first.release()
    await first.release()
    expect(registry.isActive('/workspace/a', 5)).toBe(false)
  })

  test('uses canonical workspace identity for aliases', async () => {
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire('/workspace/a/../a', 5, 'task-a')
    await expect(registry.acquire('/workspace/a', 5, 'task-b'))
      .rejects.toMatchObject({ code: 'GENERATION_SOURCE_BUSY' })
    await lease.release()
  })
})
```

- [ ] **Step 2: Run the lease test and verify RED**

Run: `bun test ui/server/src/novel-writing-service/generation-source/chapter-source-lease.test.ts`

Expected: FAIL because the lease registry does not exist.

- [ ] **Step 3: Define stable source errors**

Create `errors.ts`:

```ts
export type ChapterGenerationSourceErrorCode =
  | 'GENERATION_SOURCE_BUSY'
  | 'GENERATION_SOURCE_CHANGED'
  | 'GENERATION_SOURCE_OVERRIDE_FORBIDDEN'
  | 'CHAPTER_MODEL_REQUIRED'

export class ChapterGenerationSourceError extends Error {
  readonly error_code: ChapterGenerationSourceErrorCode

  constructor(
    public readonly code: ChapterGenerationSourceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ChapterGenerationSourceError'
    this.error_code = code
  }
}

export function isChapterGenerationSourceError(error: unknown): error is ChapterGenerationSourceError {
  return error instanceof ChapterGenerationSourceError
}
```

- [ ] **Step 4: Implement the canonical project lease**

Create `chapter-source-lease.ts`:

```ts
import { canonicalFilesystemIdentity } from '../../workspace-identity'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { ChapterGenerationSourceError } from './errors'

export type ChapterSourceLease = {
  readonly taskId: string
  readonly projectId: number
  release(): Promise<void>
}

export class ChapterSourceLeaseRegistry {
  private readonly active = new Set<string>()

  private key(workspace: string, projectId: number) {
    const id = Number(projectId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('projectId must be a positive integer')
    return `${canonicalFilesystemIdentity(workspace)}\u0000${id}`
  }

  isActive(workspace: string, projectId: number) {
    return this.active.has(this.key(workspace, projectId))
  }

  acquire(workspaceInput: string, projectId: number, taskId: string): Promise<ChapterSourceLease> {
    const workspace = canonicalFilesystemIdentity(workspaceInput)
    const key = this.key(workspace, projectId)
    return withMcpWorkspaceMutation(workspace, async () => {
      if (this.active.has(key)) {
        throw new ChapterGenerationSourceError(
          'GENERATION_SOURCE_BUSY',
          '当前章节任务正在运行，结束后可切换来源',
          { project_id: projectId },
        )
      }
      this.active.add(key)
      let released: Promise<void> | undefined
      return {
        taskId,
        projectId,
        release: () => {
          if (released) return released
          released = withMcpWorkspaceMutation(workspace, async () => {
            this.active.delete(key)
          })
          return released
        },
      }
    })
  }
}
```

- [ ] **Step 5: Run the lease test and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/generation-source/chapter-source-lease.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the lease primitive**

```bash
git add ui/server/src/novel-writing-service/generation-source/errors.ts ui/server/src/novel-writing-service/generation-source/chapter-source-lease.ts ui/server/src/novel-writing-service/generation-source/chapter-source-lease.test.ts
git commit -m "feat(generation): lock chapter source per project task"
```

## Task 4: Replace source mutation with explicit chapter-source APIs

**Files:**

- Modify: `ui/server/src/routes/novel-mcp-binding-routes.ts`
- Modify: `ui/server/src/routes/novel-mcp-binding-routes.test.ts`
- Modify: `ui/server/src/routes/novel-project-control-routes.ts`
- Modify: `ui/server/src/routes/novel.ts`

- [ ] **Step 1: Write failing tests for the five new endpoints**

Extend the route harness to accept `chapterSourceLeases`, then test:

```ts
const base = '/api/novel/projects/:id/chapter-generation-source'

test('stores both configurations and activation changes only active', async () => {
  const { workspace, key, first, handlers } = await fixture()
  const modelSaved = await call(handlers.get(`PUT ${base}/model`), {
    params: { id: String(first.id) }, body: { model_id: 217 },
  })
  expect(modelSaved.body.source).toMatchObject({ active: 'model', model: { model_id: 217 } })

  const mcp = {
    server_id: 'buda', key_id: key.id, adapter_id: 'buda',
    agent_id: 'agent-1', model: '',
  }
  const bindingSaved = await call(handlers.get(`PUT ${base}/mcp`), {
    params: { id: String(first.id) }, body: { mcp },
  })
  expect(bindingSaved.body.source).toMatchObject({ active: 'model', model: { model_id: 217 }, mcp })

  const activated = await call(handlers.get(`POST ${base}/activate`), {
    params: { id: String(first.id) }, body: { active: 'mcp' },
  })
  expect(activated.body.source).toMatchObject({ active: 'mcp', model: { model_id: 217 }, mcp })
  expect((await getNovelProject(workspace, first.id))?.reference_config.chapter_generation_source)
    .toEqual(activated.body.source)
})

test('rejects every source mutation while the project lease is active', async () => {
  const { workspace, key, first, handlers, chapterSourceLeases } = await fixture()
  const completeBinding = {
    server_id: 'buda', key_id: key.id, adapter_id: 'buda',
    agent_id: 'agent-1', model: '',
  }
  const lease = await chapterSourceLeases.acquire(workspace, first.id, 'task-running')
  try {
    for (const request of [
      [`POST ${base}/activate`, { active: 'model' }],
      [`PUT ${base}/model`, { model_id: 217 }],
      [`PUT ${base}/mcp`, { mcp: completeBinding }],
    ] as const) {
      const response = await call(handlers.get(request[0]), {
        params: { id: String(first.id) }, body: request[1],
      })
      expect(response).toMatchObject({ statusCode: 409, body: { error_code: 'GENERATION_SOURCE_BUSY' } })
    }
  } finally {
    await lease.release()
  }
})
```

Also assert:

- new API activation is idempotent;
- API activation without `model.model_id` returns `CHAPTER_MODEL_REQUIRED`;
- MCP activation validates the live binding before persisting `active`;
- a failed validation that returns a definite HTTP error leaves the previous state byte-for-byte unchanged;
- MCP test and save do not activate MCP while API is active;
- old GET returns the active source as `prose_generation_source_v1`;
- old PUT `model` retains the stored MCP binding;
- old PUT `mcp` updates the binding and activates MCP;
- GET reports `locked: true` while a lease is held;
- concurrent activation/model/binding writes serialize and return only committed state;
- model-only GET and PUT work when `mcpRuntime` is absent;
- a real Bun + Express request whose complete JSON body reaches remote validation may still commit after a raw Node `http.request` client disconnects; one later authoritative GET waits the same-project mutation tail captured at GET start and returns the atomically committed source with no polling.

- [ ] **Step 2: Run the route test and verify RED**

Run: `bun test ui/server/src/routes/novel-mcp-binding-routes.test.ts`

Expected for the original five endpoint tests: FAIL because the new paths and project lease are not registered. The later body-complete disconnect characterization may be GREEN immediately on Bun/Express; record that result honestly rather than presenting it as a rollback RED.

- [ ] **Step 3: Add normalized state persistence helpers in the route module**

Use one mutation function for every write:

```ts
async function mutateChapterSource(
  activeWorkspace: string,
  project: any,
  operation: string,
  mutate: (current: ChapterGenerationSourceState) => ChapterGenerationSourceState,
) {
  if (ctx.chapterSourceLeases.isActive(activeWorkspace, project.id)) {
    throw new ChapterGenerationSourceError(
      'GENERATION_SOURCE_BUSY',
      '当前章节任务正在运行，结束后可切换来源',
    )
  }
  const current = resolveChapterGenerationSource(project)
  const source = normalizeChapterGenerationSource(mutate(current))
  const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
    projectId: project.id,
    operation,
    mutate: referenceConfig => ({
      referenceConfig: { ...referenceConfig, chapter_generation_source: source },
      result: source,
    }),
  })
  return { activeWorkspace, source, project: mutation?.project }
}
```

Inside `registerNovelMcpBindingRoutes`, build every response through one view helper so GET and successful writes have the same contract:

```ts
export type ChapterGenerationSourceView = {
  ok: true
  source: ChapterGenerationSourceState
  fingerprint: string
  locked: boolean
  display: {
    active: 'model' | 'mcp'
    model_id: number | null
    mcp: McpProjectBinding | null
  }
}

function chapterSourceView(
  activeWorkspace: string,
  project: any,
  source: ChapterGenerationSourceState,
): ChapterGenerationSourceView {
  return {
    ok: true as const,
    source,
    fingerprint: chapterGenerationSourceFingerprint(source),
    locked: ctx.chapterSourceLeases.isActive(activeWorkspace, project.id),
    display: {
      active: source.active,
      model_id: source.model.model_id || null,
      mcp: source.mcp ? {
        server_id: source.mcp.server_id,
        key_id: source.mcp.key_id,
        adapter_id: source.mcp.adapter_id,
        agent_id: source.mcp.agent_id,
        model: source.mcp.model,
      } : null,
    },
  }
}
```

All write handlers must run inside `withMcpWorkspaceMutation(activeWorkspace, ...)`, re-read the project inside that critical section, call `mutateChapterSource`, and return the committed state.

After each successful write in the route test, immediately call GET and compare the full view rather than only `body.source`:

```ts
const readBack = await call(handlers.get(`GET ${base}`), {
  params: { id: String(first.id) },
})
expect(readBack.statusCode).toBe(200)
expect(readBack.body).toEqual(activated.body)
```

Use this assertion after model save, MCP save, and activation. This locks GET and every successful mutation to the same `ChapterGenerationSourceView` contract.

- [ ] **Step 4a: Register the single-read authoritative handler**

```ts
async function readChapterSourceAuthority(req, lifecycle) {
  const workspace = captureWorkspace()
  const projectId = projectIdFromRequest(req)
  const captured = projectMutationTails.get(projectMutationKey(workspace.canonical, projectId))
  if (captured) await lifecycle.waitForUntil(captured)
  lifecycle.throwIfAborted()
  if (canonicalFilesystemIdentity(workspace.lexical) !== workspace.canonical) {
    throw generationSourceChanged('workspace_identity_changed')
  }
  const project = await ctx.getProject(workspace.canonical, projectId)
  lifecycle.throwIfAborted()
  return project ? { activeWorkspace: workspace.canonical, project } : null
}

app.get(base, safely(async (req, res, lifecycle) => {
  const resolved = await readChapterSourceAuthority(req, lifecycle)
  if (!resolved) return res.status(404).json({ error: 'project not found' })
  const source = resolveChapterGenerationSource(resolved.project)
  res.json(chapterSourceView(resolved.activeWorkspace, resolved.project, source))
}))
```

Capture only the Promise already stored for the canonical workspace/project key when GET begins. Do not append a read tail, loop, poll, or wait for another project's mutation. The captured mutation already has the bounded absolute validation deadline; GET adds no MCP deadline, but its lifecycle abort must interrupt the wait. After the wait, revalidate the workspace identity and project ID, then call `getProject` exactly once. A later same-project mutation may linearize on either side of that final read.

- [ ] **Step 4b: Register the activation handler**

```ts
app.post(`${base}/activate`, safely(async (req, res) => {
  const target = req.body?.active
  if (target !== 'model' && target !== 'mcp') {
    throw new McpError('MCP_BINDING_INVALID', 'active 必须是 model 或 mcp')
  }
  const result = await mutateActiveSource(req, target)
  res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
}))
```

`mutateActiveSource` validates the target configuration before calling `mutateChapterSource`; when the requested source already equals `current.active`, it returns the same normalized committed state.

- [ ] **Step 4c: Register positive API model persistence**

```ts
app.put(`${base}/model`, safely(async (req, res) => {
  const modelId = Number(req.body?.model_id)
  if (!Number.isInteger(modelId) || modelId <= 0) {
    throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
  }
  const result = await updateRetainedModel(req, modelId)
  res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
}))
```

- [ ] **Step 4d: Register separate MCP test and save handlers**

```ts
app.post(`${base}/mcp/test`, safely(async (req, res) => {
  const validation = await validateRequestedBinding(req)
  res.json({ ok: true, validation: publicValidation(validation) })
}))

app.put(`${base}/mcp`, safely(async (req, res) => {
  const result = await saveRetainedBinding(req)
  res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
}))
```

Map `GENERATION_SOURCE_BUSY` to 409, `CHAPTER_MODEL_REQUIRED` to 422, binding conflicts to 409, authentication failures to 401, and malformed input to 400.

- [ ] **Step 5: Keep old endpoints as translation adapters**

The legacy adapter must translate without deleting retained state:

```ts
function legacyMutation(current: ChapterGenerationSourceState, legacy: ProseGenerationSourceConfig) {
  return legacy.type === 'mcp'
    ? { ...current, active: 'mcp' as const, mcp: legacy.mcp }
    : { ...current, active: 'model' as const }
}
```

Legacy GET uses `toLegacyProseGenerationSource`. Legacy test/agent/create-agent paths continue to use the retained `state.mcp` when the active source is API.

- [ ] **Step 6: Share one registry and register model APIs without MCP runtime**

In `registerNovelRoutes` construct exactly one registry:

```ts
const chapterSourceLeases = new ChapterSourceLeaseRegistry()
```

Pass it to the writing service, project control routes, and editor routes. In `registerNovelProjectControlRoutes`, always register the source routes and pass the optional `mcpRuntime` rather than skipping the entire route package.

- [ ] **Step 7: Run route and core tests and verify GREEN**

Run: `bun test ui/server/src/routes/novel-mcp-binding-routes.test.ts ui/server/src/routes/novel-core-routes-a.test.ts`

Expected: PASS, including legacy compatibility and no-runtime model state.

The body-complete disconnect case is a characterization test for the production transport, not a rollback RED. It must use condition gates proving remote validation was entered before the Node client destroys the socket and that exactly one authority GET reached the route while validation remained closed. Before release, that GET must remain unsettled and perform no final project read. After release, the same Promise must return the committed view, and DB must match; loops and polling are forbidden. A route-harness test also proves another project is not blocked, observable GET abort exits the wait, and the successful GET performs one final committed-source read. Test deadlines may bound cleanup failure, but fixed sleeps must not decide correctness. Observable mutation `AbortSignal`, abnormal request/response close, and deadline tests continue to require rollback.

- [ ] **Step 8: Commit the API boundary**

```bash
git add ui/server/src/routes/novel-mcp-binding-routes.ts ui/server/src/routes/novel-mcp-binding-routes.test.ts ui/server/src/routes/novel-project-control-routes.ts ui/server/src/routes/novel.ts
git commit -m "feat(generation): add explicit chapter source APIs"
```

## Task 5: Define the task execution contract and API implementation

**Files:**

- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/stage-receipts.ts`
- Create: `ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/model-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

- [ ] **Step 1: Write failing execution tests for one captured API model**

Replace the old resolver-only API test with the following fixtures and tests. Keep these helpers at module scope so Task 7 reuses exactly the same begin/draft contracts:

```ts
const workspace = '/workspace/a'
const project = {
  id: 5,
  title: '统一来源测试',
  reference_config: {
    chapter_generation_source: {
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: 217 },
    },
  },
}
const chapter = { id: 12, project_id: 5, chapter_no: 1, title: '第一章' }
const contextPackage = {
  writing_bible: { voice: '克制' },
  story_state: { current_place: '北城' },
  continuity: { previous_chapter: null },
}

function beginInput(overrides: Partial<BeginChapterTaskInput> = {}): BeginChapterTaskInput {
  return {
    activeWorkspace: workspace,
    project,
    chapter,
    contextPackage,
    requestedModelId: 217,
    options: {},
    ...overrides,
  }
}

function draftRequest(overrides: Partial<ProseGenerationRequest> = {}): ProseGenerationRequest {
  return {
    requestId: 'draft-request-1',
    activeWorkspace: workspace,
    project,
    chapter,
    chapterNo: chapter.chapter_no,
    paragraphTask: '写出完整第一章。',
    promptDiagnostics: { prompt_chars: 8 },
    contextPackage,
    modelContext: { worldbuilding: [], characters: [], prevChapters: [] },
    modelId: 217,
    maxTokens: 8_000,
    temperature: 0.7,
    ...overrides,
  }
}

test('captures one API model and forces it on every stage', async () => {
  const agentCalls: any[] = []
  const draftCalls: any[] = []
  const source = new ModelGenerationSource({
    modelId: 217,
    provenance: {
      task_id: 'task-1', project_id: 5, chapter_id: 12,
      source: 'model', source_fingerprint: 'sha256:' + 'a'.repeat(64),
      context_version: 'sha256:' + 'b'.repeat(64), model_id: 217,
    },
    generateChapterProse: async (...args: any[]) => { draftCalls.push(args); return { prose_chapters: [] } },
    executeAgent: async (...args: any[]) => { agentCalls.push(args); return { content: '{}', parsed: {} } },
    recordStage: async (_stage, _request, operation) => operation(),
  })

  await source.generateDraft(draftRequest({ modelId: 999 }))
  await source.executeAgent('quality_review', 'quality_review_json', 'review-agent', project, { task: '审查' }, { modelId: '999' })
  await source.executeAgent('revision', 'revision_prose', 'prose-agent', project, { task: '修订' }, {})

  expect(draftCalls[0][3].modelId).toBe('217')
  expect(agentCalls.map(call => call[3].modelId)).toEqual(['217', '217'])
})

test('rejects request-level source override before acquiring a task', async () => {
  const chapterSourceLeases = new ChapterSourceLeaseRegistry()
  const resolver = createGenerationSourceResolver({
    chapterSourceLeases,
    readProject: async () => project,
    createModelExecution: () => { throw new Error('execution must not be created') },
  })
  await expect(resolver.beginTask(beginInput({
    options: { generation_source_override: 'model' },
  }))).rejects.toMatchObject({ code: 'GENERATION_SOURCE_OVERRIDE_FORBIDDEN' })
  expect(chapterSourceLeases.isActive(workspace, project.id)).toBe(false)
})
```

- [ ] **Step 2: Run the generation-source test and verify RED**

Run: `bun test ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

Expected: FAIL because only `generateProse` exists and the resolver has no task boundary.

- [ ] **Step 3: Replace prose-only types with the complete task contract**

Define these exact contracts in `types.ts`:

```ts
import type { ChapterGenerationSourceState } from './source-config'

export type ChapterTaskStage =
  | 'draft'
  | 'word_target_repair'
  | 'commercial_editor_rewrite'
  | 'meme_polish'
  | 'readability_review'
  | 'humanize'
  | 'quality_review'
  | 'quality_recheck'
  | 'structured_review_fill'
  | 'quality_repair'
  | 'manual_recheck'
  | 'editor_report'
  | 'revision'
  | 'post_revision_review'
  | 'story_state_sync'

export type ChapterStageResponseContract =
  | 'draft_prose'
  | 'word_target_prose'
  | 'editor_rewrite_prose'
  | 'meme_polish_prose'
  | 'readability_json'
  | 'humanize_prose'
  | 'quality_review_json'
  | 'structured_review_json'
  | 'revision_prose'
  | 'editor_report_json'
  | 'story_state_json'

export type ChapterTaskProvenance = {
  task_id: string
  project_id: number
  chapter_id: number
  source: 'model' | 'mcp'
  source_fingerprint: string
  context_version: string
  model_id?: number
  server_id?: string
  key_id?: number
  adapter_id?: string
  agent_id?: string
  model?: string
  session_id?: string
}

export const CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY = 'chapter_generation_stage_v1' as const

export type GenerationSourceReceiptAuthority =
  | typeof MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
  | typeof CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY

export type BeginChapterTaskInput = {
  activeWorkspace: string
  project: any
  chapter: any
  contextPackage: any
  requestedModelId?: number
  options?: Record<string, any>
  signal?: AbortSignal
  onProgress?: ProseGenerationRequest['onProgress']
}

export type ResolvedChapterTaskInput = BeginChapterTaskInput & {
  taskId: string
  sourceState: ChapterGenerationSourceState
  fingerprint: string
  contextVersion: string
  assertCurrent: () => Promise<void>
}

export interface ChapterTaskExecution {
  readonly taskId: string
  readonly source: 'model' | 'mcp'
  readonly modelId?: number
  readonly fingerprint: string
  readonly contextVersion: string
  provenance(): ChapterTaskProvenance
  generateDraft(request: ProseGenerationRequest): Promise<ProseGenerationResult>
  executeAgent(
    stage: ChapterTaskStage,
    responseContract: ChapterStageResponseContract,
    agentId: string,
    project: any,
    context: Record<string, any>,
    options?: Record<string, any>,
  ): Promise<any>
  assertCurrent(): Promise<void>
  close(outcome?: { status: 'success' | 'failed' | 'cancelled'; error?: unknown }): Promise<void>
}

export interface ChapterGenerationSource {
  beginTask(input: BeginChapterTaskInput): Promise<ChapterTaskExecution>
}
```

Change `ProseGenerationResult` without removing the legacy authority:

```ts
export type ProseGenerationResult = {
  prose_chapters?: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'model' | 'mcp'
  completed?: boolean
  modelName?: string
  adapter_id?: string
  agent_id?: string
  session_id?: string
  snapshot_hash?: string
  source_receipt?: Record<string, unknown> & {
    receipt_authority?: GenerationSourceReceiptAuthority
  }
  raw?: unknown
  [key: string]: any
}
```

New task executions emit only `CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY`. Historical persistence/acceptance readers keep accepting `MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY` until Task 9 completes the dual-authority migration.

- [ ] **Step 4: Add bounded shared stage receipts**

Create `stage-receipts.ts` with `createChapterStageRecorder`. It must append `run_type: 'chapter_generation_stage'`, use `step_name: stage`, store only provenance, prompt SHA-256, response contract, status, timing, and bounded transport diagnostics, and update success/failure before returning or throwing. It must never store prompt text, output prose, API keys, headers, cookies, or arbitrary error details.

The core wrapper is:

```ts
export function createChapterStageRecorder(input: {
  activeWorkspace: string
  provenance: () => ChapterTaskProvenance
  scrubError?: (error: unknown) => { code: string; message: string }
}) {
  return async function record<T>(stage: ChapterTaskStage, request: {
    prompt: string
    responseContract: ChapterStageResponseContract
  }, operation: () => Promise<T>): Promise<T> {
    const startedAt = Date.now()
    const run = await appendNovelRun(input.activeWorkspace, {
      project_id: input.provenance().project_id,
      run_type: 'chapter_generation_stage',
      step_name: stage,
      status: 'running',
      input_ref: JSON.stringify({
        ...input.provenance(),
        stage,
        response_contract: request.responseContract,
        prompt_hash: `sha256:${createHash('sha256').update(request.prompt, 'utf8').digest('hex')}`,
      }),
      output_ref: '',
    })
    try {
      const result = await operation()
      await updateNovelRun(input.activeWorkspace, run.id, {
        status: 'success',
        output_ref: JSON.stringify({
          ...input.provenance(), stage, status: 'success', elapsed_ms: Date.now() - startedAt,
        }),
      })
      return result
    } catch (error) {
      const failure = input.scrubError
        ? input.scrubError(error)
        : {
            code: String((error as any)?.code || 'CHAPTER_STAGE_FAILED').slice(0, 80),
            message: String((error as any)?.message || error)
              .replace(/Authorization:\s*[^\s,;]+/gi, 'Authorization: [REDACTED]')
              .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
              .replace(/\bsk_[A-Za-z0-9._-]+/g, '[REDACTED]')
              .slice(0, 500),
          }
      await updateNovelRun(input.activeWorkspace, run.id, {
        status: 'failed',
        error_message: failure.message,
        output_ref: JSON.stringify({
          ...input.provenance(), stage, status: 'failed', elapsed_ms: Date.now() - startedAt,
          error_code: failure.code,
        }),
      })
      throw error
    }
  }
}
```

The test must verify prompt/output/secret strings are absent from serialized run records.

- [ ] **Step 5: Implement the API execution**

`ModelGenerationSource` must store the captured positive `modelId`; override any stage-supplied `modelId`; preserve temperature, token, timeout, response mode, and signal; call `assertCurrent` immediately before accepting each result; and make `close` idempotent.

The agent method must be:

```ts
async executeAgent(
  stage: ChapterTaskStage,
  responseContract: ChapterStageResponseContract,
  agentId: string,
  project: any,
  context: Record<string, any>,
  options: Record<string, any> = {},
) {
  return this.recordStage(stage, {
    prompt: String(context.task || ''), responseContract,
  }, async () => {
    const result = await this.executeAgentPort(agentId, project, context, {
      ...options,
      modelId: String(this.modelId),
    })
    await this.assertCurrent()
    return result
  })
}
```

- [ ] **Step 6: Implement task-start resolution and cleanup composition**

Use this exact resolver dependency boundary in `create-generation-source.ts`:

```ts
export type GenerationSourceResolverInput = {
  chapterSourceLeases: ChapterSourceLeaseRegistry
  readProject: (activeWorkspace: string, projectId: number) => Promise<any>
  createModelExecution: (
    input: ResolvedChapterTaskInput & { modelId: number },
  ) => ChapterTaskExecution
  mcpSource?: {
    beginResolvedTask(input: ResolvedChapterTaskInput): Promise<ChapterTaskExecution>
  }
}
```

`beginTask` must:

1. reject an own `generation_source_override` field;
2. generate a UUID task ID;
3. acquire the project lease;
4. re-read the project and source state under the workspace mutation coordinator;
5. choose `state.model.model_id` or the legacy request model exactly once;
6. fail with `CHAPTER_MODEL_REQUIRED` when neither exists;
7. compute the context hash and active fingerprint;
8. return the API or MCP execution;
9. release the project lease if construction fails;
10. compose source cleanup before project-lease release in an idempotent `close`.

The resolver, not either source implementation, owns the project lease. It passes the frozen `sourceState`, fingerprint, context version, and `assertCurrent` closure into `createModelExecution` or `mcpSource.beginResolvedTask`. `McpGenerationSource` owns only the nested Agent lease, Session, deadline, and quarantine lifecycle.

Use this context hash helper:

```ts
export function chapterContextVersion(contextPackage: unknown) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(contextPackage ?? {}), 'utf8')
    .digest('hex')}`
}
```

- [ ] **Step 7: Run model execution and receipt tests and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts`

Expected: PASS with the same model ID on draft/review/revision, no override, bounded receipts, and one cleanup.

- [ ] **Step 8: Commit the execution core**

```bash
git add ui/server/src/novel-writing-service/generation-source/types.ts ui/server/src/novel-writing-service/generation-source/stage-receipts.ts ui/server/src/novel-writing-service/generation-source/stage-receipts.test.ts ui/server/src/novel-writing-service/generation-source/model-generation-source.ts ui/server/src/novel-writing-service/generation-source/create-generation-source.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
git commit -m "feat(generation): add task-scoped API execution"
```

## Task 6: Refactor Buda into a reusable multi-stage Session

**Files:**

- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/buda-tool-map.test.ts`

- [ ] **Step 1: Write failing tests for one Session and multiple stage messages**

Import `beforeEach` from `bun:test` and the three Buda task types plus the chapter stage/contract types as type-only imports.

Add these fixtures above the new tests. They provide the exact fake transport, task input, and stage input used by the examples:

```ts
function createMultiStageFakeClient(outputs: string[]) {
  const calls: Array<{ name: string; args: any; options: any }> = []
  const drive = new Map<string, string>()
  let sent = 0
  let completed = 0
  const response = (value: Record<string, unknown>) => ({ content: [], structuredContent: value })
  return {
    calls,
    client: {
      async listTools() {
        return toolNames.map(name => ({ name, inputSchema: { type: 'object' } }))
      },
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name.endsWith('listApiAgents')) {
          return response({ apiAgents: [{ id: 'agent-1', name: '正文 Agent' }] })
        }
        if (name.endsWith('listApiAgentDriveFiles')) {
          return response({ files: [...drive.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name.endsWith('upsertApiAgentDriveFile')) {
          drive.set(args.path, args.content)
          return response({ ok: true })
        }
        if (name.endsWith('apiAgentDriveText')) {
          return response({ content: drive.get(args.filePath) || '' })
        }
        if (name.endsWith('createApiAgentSession')) {
          return response({ session: { id: 'session-1', status: 'pending' }, run: { started: false } })
        }
        if (name.endsWith('postApiAgentSessionMessage')) {
          sent += 1
          return response({ session: { id: 'session-1' }, run: { started: true } })
        }
        if (name.endsWith('getApiAgentSession')) {
          if (completed >= sent) {
            return response({ session: { id: 'session-1', status: 'in_progress' }, run: { status: 'in_progress' }, messages: [] })
          }
          const content = outputs[completed++]
          return response({
            session: { id: 'session-1', status: 'completed' },
            run: { status: 'completed' },
            messages: [{ role: 'assistant', content }],
          })
        }
        if (name.endsWith('cancelApiAgentSessionRun')) return response({ ok: true, cancelled: true })
        throw new Error(`unexpected Buda tool: ${name}`)
      },
    },
  }
}

function taskInput(overrides: Partial<BudaChapterTaskInput> = {}): BudaChapterTaskInput {
  return {
    activeWorkspace: '/workspace/a',
    server: { ...BUDA_MCP_SERVER_TEMPLATE, poll_initial_ms: 1, poll_max_ms: 2 },
    keyId: 3,
    agentId: 'agent-1',
    taskId: 'task-1',
    project: { id: 5, title: '长篇测试' },
    chapter: { id: 12, chapter_no: 1, title: '第一章' },
    chapterNo: 1,
    drive: { writingBible: '# 写作圣经', storyState: {}, continuity: '', recentChapters: '' },
    deadline: new McpGenerationDeadline(60_000, undefined, {
      now: Date.now,
      setTimeout: () => 1,
      clearTimeout: () => {},
    }),
    ...overrides,
  }
}

let stageSequence = 0
function stageInput(
  stage: ChapterTaskStage,
  responseContract: ChapterStageResponseContract,
  prompt: string,
): BudaChapterStageInput {
  stageSequence += 1
  return { requestId: `task-1-stage-${stageSequence}`, stage, responseContract, prompt }
}
```

Reset `stageSequence = 0` in `beforeEach`. Then add the ordered multi-stage test:

```ts
test('opens one Session and runs multiple ordered chapter stages in it', async () => {
  const fake = createMultiStageFakeClient([
    '{"score":82,"issues":[]}',
    '{"prose_chapters":[{"chapter_no":12,"chapter_text":"修订正文"}]}',
    '{"character_updates":[]}',
  ])
  const session = await new BudaAdapter(fake.client as any).openChapterTask(taskInput())
  const review = await session.runStage(stageInput('quality_review', 'quality_review_json', '审查提示'))
  const revision = await session.runStage(stageInput('revision', 'revision_prose', '修订提示'))
  const state = await session.runStage(stageInput('story_state_sync', 'story_state_json', '状态提示'))
  await session.close()

  expect([review.content, revision.content, state.content]).toEqual([
    '{"score":82,"issues":[]}',
    '{"prose_chapters":[{"chapter_no":12,"chapter_text":"修订正文"}]}',
    '{"character_updates":[]}',
  ])
  expect(fake.calls.filter(call => call.name.endsWith('createApiAgentSession'))).toHaveLength(1)
  expect(fake.calls.filter(call => call.name.endsWith('postApiAgentSessionMessage'))).toHaveLength(3)
})
```

Add table-driven model forwarding assertions using the same fixtures:

```ts
for (const [label, model, expected] of [
  ['explicit', 'claude-sonnet', 'claude-sonnet'],
  ['Auto', '', undefined],
] as const) {
  test(`${label} model is consistent on Session creation and every message`, async () => {
    const fake = createMultiStageFakeClient(['{}', '{}'])
    const session = await new BudaAdapter(fake.client as any).openChapterTask(taskInput({ model }))
    await session.runStage(stageInput('quality_review', 'quality_review_json', '一'))
    await session.runStage(stageInput('story_state_sync', 'story_state_json', '二'))
    await session.close()
    const mutations = fake.calls.filter(call =>
      call.name.endsWith('createApiAgentSession') || call.name.endsWith('postApiAgentSessionMessage'))
    expect(mutations.map(call => call.args.model)).toEqual([expected, expected, expected])
  })
}
```

Retain the existing cancellation/inspection tests, but invoke them through `runStage`. Add a deferred `getApiAgentSession` gate and assert the second concurrent `runStage` has not produced a second `postApiAgentSessionMessage` before the first gate resolves; after resolving it, assert message order matches the two `requestId` values.

- [ ] **Step 2: Run the adapter test and verify RED**

Run: `bun test ui/server/src/mcp/adapters/buda-adapter.test.ts`

Expected: FAIL because `openChapterTask` and `runStage` do not exist.

- [ ] **Step 3: Define the reusable adapter port**

Add to `adapters/types.ts`:

```ts
export type BudaChapterStageInput = {
  requestId: string
  stage: ChapterTaskStage
  responseContract: ChapterStageResponseContract
  prompt: string
}

export type BudaChapterTaskInput = {
  activeWorkspace: string
  server: McpServerRecord
  keyId: number
  agentId: string
  model?: string
  taskId: string
  project: Record<string, any>
  chapter: Record<string, any>
  chapterNo: number
  drive: BudaDriveInput
  deadline: McpGenerationDeadline
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type BudaChapterStageResult = {
  content: string
  session_id: string
  snapshot_hash: string
  status: 'completed'
}

export interface BudaChapterTaskSession {
  readonly sessionId: string
  readonly snapshotHash: string
  runStage(input: BudaChapterStageInput): Promise<BudaChapterStageResult>
  close(): Promise<void>
}

export interface ProseMcpAdapter {
  readonly id: string
  listAgents(options: McpAdapterOperationOptions): Promise<McpAgentSummary[]>
  createAgent(input: { name: string; spaceId?: string; instructions?: string }, options: McpAdapterOperationOptions): Promise<McpAgentSummary>
  inspectSession(input: { agentId: string; sessionId: string }, options: McpAdapterOperationOptions): Promise<{ status: string; terminal: boolean }>
  openChapterTask(input: BudaChapterTaskInput): Promise<BudaChapterTaskSession>
  generateProse(input: BudaProseGenerationInput): Promise<BudaProseGenerationResult>
}
```

Import the chapter stage types from `novel-writing-service/generation-source/types.ts` using type-only imports.

- [ ] **Step 4: Extract stage envelope and response content**

Add these pure functions to `buda-adapter.ts`:

```ts
export function extractBudaStageContent(data: any) {
  const messages = Array.isArray(data?.messages) ? data.messages : []
  const content = String(messages
    .filter((item: any) => item?.role === 'assistant' && String(item?.content || '').trim())
    .at(-1)?.content || data?.content || data?.text || '').trim()
  if (!content) throw new McpError('MCP_TOOL_ERROR', 'Buda Session 已完成但没有返回阶段结果')
  return content
}

export function buildBudaStageEnvelope(input: BudaChapterStageInput) {
  return [
    '【MangaForge 章节任务阶段】',
    `request_id: ${input.requestId}`,
    `stage: ${input.stage}`,
    `response_contract: ${input.responseContract}`,
    '只执行当前 stage。不得自行开始下一阶段，不得用 Agent 旧记忆覆盖本次提示。',
    '严格按 response_contract 返回，不要附加流程说明。',
    '',
    input.prompt,
  ].join('\n')
}
```

Update `MANGAFORGE_BUDA_AGENT_INSTRUCTIONS` so it follows the current stage and response contract rather than assuming every message requests draft prose.

- [ ] **Step 5a: Extract Session open from the first stage**

`openChapterTask` must resolve capabilities, sync Drive once, create one Session with `startRun: false`, emit `session_created`, and return a session object without sending a stage request.

- [ ] **Step 5b: Implement one serialized `runStage` operation**

Move send, poll, terminal validation, and result extraction into the returned Session object's `runStage`. Advance the promise tail on both fulfillment and rejection so a caller can close deterministically, but reject every stage after a remote cleanup failure.

The send body must be:

```ts
await this.client.callTool(
  tools.sendSessionMessage,
  buildBudaToolArguments('sendSessionMessage', tools.sendSessionMessage, {
    agentId: input.agentId,
    sessionId: activeSessionId,
    message: buildBudaStageEnvelope(stageInput),
    mode: 'agent',
    ...(selectedModel ? { model: selectedModel } : {}),
    startRun: true,
  }),
  callOptions('mutation'),
)
```

- [ ] **Step 5c: Preserve the one-shot prose adapter**

Keep `generateProse` as a compatibility wrapper that opens a task, runs one `draft` stage, converts the result through `extractBudaProse`, and closes.

- [ ] **Step 6: Run Buda adapter and tool-map tests and verify GREEN**

Run: `bun test ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/adapters/buda-tool-map.test.ts`

Expected: PASS; one Session create, ordered repeated messages, exact model forwarding, and preserved cleanup behavior.

- [ ] **Step 7: Commit the reusable Buda Session**

```bash
git add ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/adapters/buda-tool-map.test.ts
git commit -m "feat(mcp): reuse one Buda session across chapter stages"
```

## Task 7: Implement MCP task execution, receipts, and Agent isolation

**Files:**

- Modify: `ui/server/src/mcp/adapters/types.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.ts`
- Modify: `ui/server/src/mcp/adapters/buda-adapter.test.ts`
- Modify: `ui/server/src/mcp/adapters/registry.ts`
- Modify: `ui/server/src/mcp/runtime.ts`
- Modify: `ui/server/src/mcp/runtime.test.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/create-generation-source.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`
- Modify: `ui/server/src/mcp/agent-lease.test.ts`

- [ ] **Step 1a: Write failing provider-neutral Adapter contract tests**

Rename the shared chapter-task imports and fixtures to `McpChapterStageInput`, `McpChapterTaskInput`, and `McpChapterTaskSession`. Add a fake non-Buda Adapter with `id: 'test-session-provider'` to `runtime.test.ts` and prove that `getAdapterForKey` returns it through the same registry/factory boundary without any Buda tool names or payloads. In `generation-source.test.ts`, type the multi-stage fixture only against the provider-neutral port and assert that its Adapter ID is preserved in provenance.

The shared contract in `adapters/types.ts` must use these provider-neutral names:

```ts
export type McpChapterContextSnapshot = {
  writingBible: string
  storyState: unknown
  continuity: string
  recentChapters: string
}

export type McpChapterStageInput = {
  requestId: string
  stage: ChapterTaskStage
  responseContract: ChapterStageResponseContract
  prompt: string
}

export type McpChapterTaskInput = {
  activeWorkspace: string
  server: McpServerRecord
  keyId: number
  agentId: string
  model?: string
  taskId: string
  project: Record<string, any>
  chapter: Record<string, any>
  chapterNo: number
  context: McpChapterContextSnapshot
  deadline: McpGenerationDeadline
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type McpChapterStageResult = {
  content: string
  session_id: string
  snapshot_hash: string
  status: 'completed'
}

export interface McpChapterTaskSession {
  readonly sessionId: string
  readonly snapshotHash: string
  runStage(input: McpChapterStageInput): Promise<McpChapterStageResult>
  close(): Promise<void>
}

export type McpProseGenerationInput = {
  activeWorkspace: string
  server: McpServerRecord
  keyId: number
  agentId: string
  model?: string
  requestId: string
  project: Record<string, any>
  chapter: Record<string, any>
  chapterNo: number
  paragraphTask: string
  promptDiagnostics?: unknown
  context: McpChapterContextSnapshot
  deadline: McpGenerationDeadline
  signal?: AbortSignal
  onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
}

export type McpProseGenerationResult = {
  prose_chapters: Array<{ chapter_no: number; title?: string; chapter_text: string }>
  source: 'mcp'
  adapter_id: string
  agent_id: string
  session_id: string
  snapshot_hash: string
  completed: true
  raw: { request_id: string; session_status: string }
}

export interface McpGenerationAdapter {
  readonly id: string
  listAgents(options: McpAdapterOperationOptions): Promise<McpAgentSummary[]>
  createAgent(input: { name: string; spaceId?: string; instructions?: string }, options: McpAdapterOperationOptions): Promise<McpAgentSummary>
  inspectSession(input: { agentId: string; sessionId: string }, options: McpAdapterOperationOptions): Promise<{ status: string; terminal: boolean }>
  openChapterTask(input: McpChapterTaskInput): Promise<McpChapterTaskSession>
  generateProse(input: McpProseGenerationInput): Promise<McpProseGenerationResult>
}
```

Also rename the shared one-shot compatibility inputs/results from `BudaProseGeneration*` to `McpProseGeneration*`, use `context: McpChapterContextSnapshot` instead of `drive`, and type `adapter_id` as a bounded string rather than the literal `'buda'`. This method remains only for the legacy compatibility path until Task 9 removes that call site; it must contain no provider wire fields.

`BudaAdapter` implements this contract and maps `input.context` to its private Drive synchronization. Buda run/message IDs, status projection, tool mapping, stage envelope, and cleanup correlation remain private to `buda-adapter.ts`.

- [ ] **Step 1b: Run the provider-neutral contract tests and verify RED**

Run:

```bash
bun run --cwd ui/server check
bun test ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/runtime.test.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts
```

Expected: the server check FAILS to typecheck because the shared port is still named `BudaChapterTask*`, exposes `drive`, and the runtime is typed as `ProseMcpAdapter`. Record whether the runtime tests already pass; pre-existing runtime behavior does not replace the required type-contract RED.

- [ ] **Step 1c: Implement the provider-neutral port without changing Buda wire behavior**

Rename every shared `Buda*` type and `ProseMcpAdapter` to the provider-neutral contracts above, update the runtime/registry types, and update `BudaAdapter` to consume `input.context`. Do not move Buda correlation, tool names, payload fields, or Drive paths into the shared contract. The one-shot wrapper consumes the generic compatibility input and performs Buda-specific translation internally.

Run both commands from Step 1b and require GREEN before adding MCP task execution behavior.

- [ ] **Step 1d: Write failing multi-stage MCP execution tests**

Extend the test imports with `getNovelProject`, `ChapterSourceLeaseRegistry`, and the type-only `McpChapterStageInput`, `McpChapterTaskInput`, and `McpChapterTaskSession` imports.

Keep the new test inside the existing MCP outcome describe so it can reuse `harness` and `runtimeWithAdapter`. Add this exact adapter fixture:

```ts
function multiStageTaskAdapter() {
  const openCalls: any[] = []
  const stageCalls: Array<McpChapterStageInput & { sessionId: string }> = []
  let sessionNumber = 0
  return {
    openCalls,
    stageCalls,
    adapter: {
      listAgents: async () => [{ id: 'agent-1', name: '正文 Agent' }],
      async openChapterTask(input: McpChapterTaskInput): Promise<McpChapterTaskSession> {
        openCalls.push(input)
        const sessionId = `session-${++sessionNumber}`
        return {
          sessionId,
          snapshotHash: `snapshot-${sessionNumber}`,
          async runStage(stage) {
            stageCalls.push({ ...stage, sessionId })
            const content = stage.stage === 'draft'
              ? JSON.stringify({ prose_chapters: [{ chapter_no: 1, chapter_text: 'MCP 正文' }] })
              : '{}'
            return { content, session_id: sessionId, snapshot_hash: `snapshot-${sessionNumber}`, status: 'completed' }
          },
          close: async () => {},
        }
      },
    },
  }
}
```

Then begin one MCP task, call draft/review/revision/state sync, and close:

```ts
test('uses one binding, Agent lease, model, fingerprint, and Session for the whole task', async () => {
  const fixtureData = await harness('mangaforge-mcp-multi-stage-')
  const { workspace, server, key, project: mcpProject } = fixtureData
  const fake = multiStageTaskAdapter()
  const { runtime, registry } = runtimeWithAdapter(workspace, server, key, fake.adapter)
  const chapterSourceLeases = new ChapterSourceLeaseRegistry()
  const resolver = createGenerationSourceResolver({
    chapterSourceLeases,
    readProject: getNovelProject,
    createModelExecution: () => { throw new Error('ordinary model execution created') },
    mcpSource: new McpGenerationSource(runtime as any),
  })
  const bindingTuple = { serverId: server.id, keyId: key.id, agentId: 'agent-1' }
  const mcpChapter = { ...chapter, project_id: mcpProject.id }
  const execution = await resolver.beginTask(beginInput({
    activeWorkspace: workspace,
    project: mcpProject,
    chapter: mcpChapter,
  }))
  const draft = await execution.generateDraft(draftRequest({
    activeWorkspace: workspace,
    project: mcpProject,
    chapter: mcpChapter,
  }))
  await execution.executeAgent('quality_review', 'quality_review_json', 'review-agent', mcpProject, { task: '审查' })
  await execution.executeAgent('revision', 'revision_prose', 'prose-agent', mcpProject, { task: '修订' })
  await execution.executeAgent('story_state_sync', 'story_state_json', 'review-agent', mcpProject, { task: '状态' })
  await execution.close({ status: 'success' })

  expect(fake.openCalls).toHaveLength(1)
  expect(fake.stageCalls.map(call => call.stage)).toEqual([
    'draft', 'quality_review', 'revision', 'story_state_sync',
  ])
  expect(new Set(fake.stageCalls.map(call => call.sessionId)).size).toBe(1)
  expect(draft.source_receipt).toMatchObject({
    receipt_authority: 'chapter_generation_stage_v1',
    task_id: execution.taskId,
    source: 'mcp',
    source_fingerprint: execution.fingerprint,
  })
  expect(await registry.isActive(workspace, bindingTuple)).toBe(false)
})
```

Add tests proving:

- the Session is lazy and no remote mutation occurs when a task closes before its first stage;
- a later `beginTask` creates a different task ID and Session ID;
- a remote stage failure makes zero API generator/agent calls;
- source fingerprint mismatch rejects the result before return;
- each later prompt contains MangaForge's validated prior-stage text/context rather than relying on Agent memory;
- failure and cancellation release the project lease exactly once;
- unknown send/cancel state keeps the current quarantine and blocks reuse;
- all stage receipts share task ID and fingerprint and contain no secrets.

- [ ] **Step 2: Run the generation-source test and verify RED**

Run: `bun test ui/server/src/novel-writing-service/generation-source/generation-source.test.ts`

Expected: FAIL because MCP still owns a one-shot prose call and returns its Agent lease through a hidden result property.

- [ ] **Step 3a: Move credential and scrubber snapshots into MCP task construction**

Refactor the current credential snapshot, secret scrubber, binding validation, Agent lease, deadline, receipt, quarantine, and cleanup code into `McpGenerationSource.beginResolvedTask` and an internal `McpChapterTaskExecution`.

Construct its shared stage recorder with `scrubError: error => ({ code, message: scrubber.scrubText(message).slice(0, 500) })` and update that closure after credential rotation, so reflected old or new Keys/headers cannot enter stage receipts.

- [ ] **Step 3b: Add lazy Session memoization**

`ensureSession` must:

```ts
private async ensureSession() {
  if (this.sessionPromise) return this.sessionPromise
  this.sessionPromise = this.openSession().catch(async error => {
    this.sessionPromise = undefined
    await this.failRemote(error)
    throw error
  })
  return this.sessionPromise
}
```

- [ ] **Step 3c: Open the pinned Agent Session under the workspace coordinator**

`openSession` re-reads the project under `withMcpWorkspaceMutation`, compares `chapterGenerationSourceFingerprint`, validates the pinned credentials, acquires the Agent lease, resolves the adapter, creates the deadline, and calls `adapter.openChapterTask`. The `session_created` progress event must be durably written before the adapter can send the first stage and must call `lease.stageSessionFence`.

- [ ] **Step 4: Compile MangaForge prompts and normalize MCP responses**

Use `buildAgentMessages` from `llm/executor-helpers.ts` and serialize all system/user messages into the remote stage prompt:

```ts
function compileAgentPrompt(agentId: string, project: any, context: Record<string, any>) {
  return buildAgentMessages(agentId, project, context)
    .map(message => `[${message.role.toUpperCase()}]\n${stringifyLLMMessageTextContent(message.content)}`)
    .join('\n\n')
}
```

`executeAgent` must call the shared stage recorder, send the compiled prompt to `session.runStage`, assert the fingerprint, and return an `LLMResponse` compatible object. This file must not import `buda-adapter.ts` or any `Buda*` type:

```ts
const response = {
  content: result.content,
  finish_reason: 'stop',
  modelName: this.binding.model || 'MCP Auto',
}
return { ...response, output: parseAgentOutput(response as any) }
```

`generateDraft` sends `paragraphTask` with `draft_prose`, parses the provider-neutral response contract in the generation-source layer, and returns the trusted chapter source receipt. Buda's concrete one-shot `extractBudaProse` compatibility helper must not be imported by the generation source.

- [ ] **Step 5a: Implement confirmed-terminal cleanup**

On success, confirmed terminal failure, or caller-side validation failure, clear the durable Session fence, release the Agent lease, and close the deadline. `close` may be called repeatedly but performs each operation once.

- [ ] **Step 5b: Implement ambiguous-send quarantine cleanup**

When `receipt_status` is `send_unknown` or `remote_cancel_unknown` and remote termination is not confirmed, persist the scrubbed stage/task receipt, call `lease.quarantine`, keep the durable fence if persistence is uncertain, release the in-memory lease only after quarantine succeeds, and rethrow the most safety-preserving typed error.

- [ ] **Step 6: Run MCP execution, Agent lease, and runtime tests and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/mcp/agent-lease.test.ts ui/server/src/mcp/runtime.test.ts`

Expected: PASS with the existing security, quarantine, credential rotation, and mutation-fence cases intact.

- [ ] **Step 7: Commit MCP task execution**

```bash
git add ui/server/src/mcp/adapters/types.ts ui/server/src/mcp/adapters/buda-adapter.ts ui/server/src/mcp/adapters/buda-adapter.test.ts ui/server/src/mcp/adapters/registry.ts ui/server/src/mcp/runtime.ts ui/server/src/mcp/runtime.test.ts ui/server/src/novel-writing-service/generation-source/mcp-generation-source.ts ui/server/src/novel-writing-service/generation-source/create-generation-source.ts ui/server/src/novel-writing-service/generation-source/types.ts ui/server/src/novel-writing-service/generation-source/generation-source.test.ts ui/server/src/mcp/agent-lease.test.ts
git commit -m "feat(mcp): execute complete chapter tasks through one source"
```

## Task 8: Route all chapter service stages through the execution handle

**Files:**

- Modify: `ui/server/src/novel-writing-service/generation-source/types.ts`
- Modify: `ui/server/src/novel-writing-service/service/create-novel-writing-service.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-word-target-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-word-target-methods.unit.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-polish-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-polish-methods.unit.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.unit.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/prose-self-review-run.ts`
- Modify: `ui/server/src/novel-writing-service/service/structured-review-fill-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-loop.ts`
- Modify: `ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts`
- Create: `ui/server/src/novel-writing-service/service/chapter-task-stage-routing.test.ts`

- [ ] **Step 1: Write failing behavior tests that forbid fallback while a task handle exists**

Create a task execution spy and a fallback that throws:

```ts
function stageHarness() {
  const calls: Array<{ stage: string; contract: string; agentId: string; options: any }> = []
  return {
    calls,
    execution: {
      executeAgent: async (stage: string, contract: string, agentId: string, _project: any, _context: any, options: any) => {
        calls.push({ stage, contract, agentId, options })
        return { content: '{}', parsed: {}, output: {} }
      },
    },
    fallback: async () => { throw new Error('ordinary model fallback called') },
  }
}
```

Extend each existing unit test to pass `options.chapterTaskExecution` and assert the exact mapping:

| Service call | Stage | Response contract |
|---|---|---|
| word target expansion/contraction | `word_target_repair` | `word_target_prose` |
| commercial editor | `commercial_editor_rewrite` | `editor_rewrite_prose` |
| meme polish | `meme_polish` | `meme_polish_prose` |
| readability | `readability_review` | `readability_json` |
| humanize full/segment | `humanize` | `humanize_prose` |
| self review | `quality_review` | `quality_review_json` |
| structured fill | `structured_review_fill` | `structured_review_json` |
| self revision | `quality_repair` | `revision_prose` |
| quality loop review/recheck | `quality_review` / `quality_recheck` | `quality_review_json` |
| quality loop revise | `quality_repair` | `revision_prose` |
| story state prepare | `story_state_sync` | `story_state_json` |

- [ ] **Step 2: Run service unit tests and verify RED**

Run: `bun test ui/server/src/novel-writing-service/service/prose-word-target-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-polish-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.unit.test.ts ui/server/src/novel-writing-service/service/chapter-task-stage-routing.test.ts`

Expected: FAIL because the methods still call their injected ordinary model function directly.

- [ ] **Step 3: Add one explicit stage-dispatch helper**

Add this export to `generation-source/types.ts`:

```ts
export function executeChapterStage(input: {
  execution?: Pick<ChapterTaskExecution, 'executeAgent'>
  fallback: (...args: any[]) => Promise<any>
  stage: ChapterTaskStage
  responseContract: ChapterStageResponseContract
  agentId: string
  project: any
  context: Record<string, any>
  options: Record<string, any>
}) {
  if (!input.execution) {
    return input.fallback(input.agentId, input.project, input.context, input.options)
  }
  return input.execution.executeAgent(
    input.stage,
    input.responseContract,
    input.agentId,
    input.project,
    input.context,
    input.options,
  )
}
```

In `create-novel-writing-service.ts`, expose the task start operation without exposing independent stage resolution:

```ts
const beginChapterTask = (input: BeginChapterTaskInput) => chapterGenerationSource.beginTask(input)

return {
  beginChapterTask,
  buildParagraphProseContext,
  buildChapterContextPackage,
  autoRepairChapterPreflightGaps,
  generateSceneCardsForChapter,
  prepareStoryStateUpdate,
  updateStoryStateMachine,
  getStoredOrBuiltWritingBible,
  runCommercialEditorRewrite,
  runMemePolish,
  runReadabilityReview,
  runHumanizePostProcess,
  runProseSelfReviewAndRevision,
  ensureProseMeetsWordTarget,
  generateChapterForGroup,
}
```

This fallback exists only for non-task legacy/unit callers. If an execution is present, rejection propagates unchanged and the fallback is never invoked.

- [ ] **Step 4a: Route commercial edit, meme polish, and readability**

For example, replace the commercial editor call with:

```ts
const editorResult = await executeChapterStage({
  execution: options.chapterTaskExecution,
  fallback: executeAgent,
  stage: 'commercial_editor_rewrite',
  responseContract: 'editor_rewrite_prose',
  agentId: 'prose-agent',
  project,
  context: {
    task: buildCommercialEditorRewritePrompt(project, contextPackage, chapterText, options),
    upstreamContext: contextPackage,
  },
  options: {
    activeWorkspace,
    modelId: editorModelId ? String(editorModelId) : undefined,
    maxTokens: proseMaxTokensForWordTarget(contextPackage?.chapter_target?.word_target),
    temperature: getStageTemperature(project, 'editor', 0.5),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
  },
})
```

Apply the same explicit wrapper to `runMemePolish` and `runReadabilityReview` using the mapping table.

- [ ] **Step 4b: Route word-target expansion and contraction**

Replace both `executeAgent` calls in `prose-word-target-methods.ts` with `word_target_repair` / `word_target_prose`, preserving their attempt-specific prompts and budgets.

- [ ] **Step 4c: Route full-pass and risky-segment humanization**

Replace both calls in `prose-humanize-postprocess-methods.ts` with `humanize` / `humanize_prose`; every chunk and retry remains a stage call on the same task execution.

- [ ] **Step 4d: Route self-review, structured fill, and self-revision**

Use `quality_review` / `quality_review_json`, `structured_review_fill` / `structured_review_json`, and `quality_repair` / `revision_prose` in the two review modules.

- [ ] **Step 4e: Route quality-loop review/repair and story-state prepare**

Use `quality_review` for round zero, `quality_recheck` for later rounds, `quality_repair` for revise callbacks, and `story_state_sync` for the story-state prompt. Scene-card and preflight-planning calls remain unchanged because they are outside the task boundary.

- [ ] **Step 5: Preserve stage-specific runtime settings while removing stage model selection**

Keep each call's temperature, max tokens, timeout, response mode, retries, and signal. The execution overwrites `modelId`; do not remove the legacy `getStageModelId` fallback until callers without a task handle are gone.

- [ ] **Step 6: Run service unit tests and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/service/prose-word-target-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-polish-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.unit.test.ts ui/server/src/novel-writing-service/service/chapter-task-stage-routing.test.ts`

Expected: PASS; every asserted stage reaches the handle, and the injected fallback receives zero calls.

- [ ] **Step 7: Commit leaf-stage routing**

```bash
git add ui/server/src/novel-writing-service/generation-source/types.ts ui/server/src/novel-writing-service/service/create-novel-writing-service.ts ui/server/src/novel-writing-service/service/prose-word-target-methods.ts ui/server/src/novel-writing-service/service/prose-word-target-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-polish-methods.ts ui/server/src/novel-writing-service/service/prose-polish-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.ts ui/server/src/novel-writing-service/service/prose-humanize-postprocess-methods.unit.test.ts ui/server/src/novel-writing-service/service/prose-self-review-run.ts ui/server/src/novel-writing-service/service/structured-review-fill-methods.ts ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-loop.ts ui/server/src/novel-writing-service/service/story-state-machine-prepare.ts ui/server/src/novel-writing-service/service/chapter-task-stage-routing.test.ts
git commit -m "refactor(generation): route chapter stages through task execution"
```

## Task 9: Hold one execution across the complete automatic chapter pipeline

**Files:**

- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-editor-meme-polish.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts`
- Modify: `ui/server/src/novel/acceptance.ts`
- Modify: `ui/server/src/novel/acceptance.test.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.mcp.test.ts`
- Delete: `ui/server/src/novel-writing-service/generation-source/production-lease.ts`

- [ ] **Step 1: Write failing pipeline lifetime tests**

Update `generate-chapter-draft-prose.generation-source.test.ts` to assert event order and one handle:

```ts
expect(events).toEqual([
  'pre_draft_scene_cards_completed',
  'begin:task-1',
  'stage:draft',
  'stage:word_target_repair',
  'stage:commercial_editor_rewrite',
  'stage:quality_review',
  'stage:quality_repair',
  'stage:humanize',
  'stage:story_state_sync',
  'chapter_committed',
  'close:task-1:success',
])
expect(new Set(stageCalls.map(call => call.taskId))).toEqual(new Set(['task-1']))
```

Add failure and cancellation cases asserting `close` occurs after local cleanup and before the source becomes mutable. Add an MCP-stage failure case asserting the ordinary generator and ordinary `executeAgent` both have zero calls. Add a `scene_cards_only` case asserting no task lease is acquired.

- [ ] **Step 2: Run the focused pipeline test and verify RED**

Run: `bun test ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts ui/server/src/novel/acceptance.test.ts ui/server/src/routes/novel-generation/builders.mcp.test.ts`

Expected: FAIL because the task begins inside draft-only resolution and only the MCP Agent lease survives past draft.

- [ ] **Step 3: Begin after pre-draft work and pass the handle through options**

In `generateChapterForGroup`, immediately after `contextSceneResult.earlyReturn` handling and context extraction:

```ts
const chapterTaskExecution = await chapterGenerationSource.beginTask({
  activeWorkspace,
  project,
  chapter,
  contextPackage,
  requestedModelId: preferredModelId,
  options,
  signal: options.abortSignal,
  onProgress: event => onStage(event.stage, event),
})
let taskOutcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'failed' }
const taskOptions = { ...llmControlOptions, chapterTaskExecution }
options = { ...options, chapterTaskExecution }
```

Use `taskOptions` for all covered calls. Keep pre-draft auto-repair and scene cards on their current path.

- [ ] **Step 4: Send draft through `generateDraft` and remove hidden lease transport**

Replace resolver selection and `generateProse` in `runGenerateChapterDraftProse` with:

```ts
const draftResult = await chapterTaskExecution.generateDraft({
  requestId: options.request_id || `chapter-${project.id}-${chapter.id}-${Date.now()}`,
  activeWorkspace,
  project,
  chapter,
  chapterNo: chapter.chapter_no,
  paragraphTask,
  promptDiagnostics: draftPromptDiagnostics,
  contextPackage: contextPackageWithFamily,
  modelContext,
  modelId: chapterTaskExecution.modelId,
  maxTokens: proseMaxTokensForModelFamily(wordTarget, modelFamilyStrategy),
  temperature: options.temperature,
  signal: options.abortSignal,
  onProgress: event => onStage(event.stage, event),
})
```

Remove `ProseGenerationLeaseBundle`, `attachProductionLease`, `takeProductionLease`, and every `generationLease` field. Delete `production-lease.ts` only after all references are gone.

- [ ] **Step 5: Close after authoritative store/state work on every outcome**

Use an outcome-aware boundary:

```ts
try {
  const result = await runCoveredChapterPipeline()
  taskOutcome = { status: 'success' }
  return result
} catch (error) {
  taskOutcome = {
    status: options.abortSignal?.aborted ? 'cancelled' : 'failed',
    error,
  }
  throw error
} finally {
  await chapterTaskExecution.close(taskOutcome)
}
```

The `finally` must enclose draft, all post-draft stages, validation, database commits, memory writes, and story-state preparation/application.

- [ ] **Step 6: Verify the fingerprint at authoritative acceptance**

Replace the MCP-only reader with this dual-authority migration reader:

```ts
export function acceptanceSourceFingerprintFromGenerationSource(generationSource: any) {
  const authority = generationSource?.receipt_authority
  if (authority === CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY) {
    if (generationSource?.source !== 'model' && generationSource?.source !== 'mcp') return ''
    const fingerprint = String(generationSource?.source_fingerprint || '').trim()
    return /^sha256:[0-9a-f]{64}$/.test(fingerprint) ? fingerprint : ''
  }
  if (
    authority === MCP_GENERATION_SOURCE_RECEIPT_AUTHORITY
    && generationSource?.resolved_type === 'mcp'
  ) {
    const fingerprint = String(generationSource?.binding_fingerprint || '').trim()
    return /^sha256:[0-9a-f]{64}$/.test(fingerprint) ? fingerprint : ''
  }
  return ''
}
```

Add tests for a new API receipt, a new MCP receipt, a historical MCP receipt, wrong authority, malformed hash, and a historical model-shaped receipt. The last three return an empty string. Compare `expected_chapter_generation_source_fingerprint` before draft/full store writes. Preserve legacy `expected_prose_generation_source_fingerprint` reads for historical receipts.

Persist bounded provenance in the chapter raw payload:

```ts
chapter_generation_source: {
  task_id: chapterTaskExecution.taskId,
  source: chapterTaskExecution.source,
  source_fingerprint: chapterTaskExecution.fingerprint,
  context_version: chapterTaskExecution.contextVersion,
  ...trustedDraftReceipt,
}
```

- [ ] **Step 7: Remove temporary source override from route options**

In `buildStandaloneProseServiceOptions`, reject or strip `generation_source_override` before calling the service. The resolver remains the final enforcement point. Replace the old test with:

```ts
test('does not carry a request-level source override into a chapter task', () => {
  const options = buildStandaloneProseServiceOptions(
    { generation_source_override: 'model' },
    runtime,
  )
  expect(options).not.toHaveProperty('generation_source_override')
})
```

- [ ] **Step 8: Run pipeline and acceptance tests and verify GREEN**

Run: `bun test ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts ui/server/src/novel/acceptance.test.ts ui/server/src/routes/novel-generation/builders.mcp.test.ts`

Expected: PASS with one task ID/fingerprint/model or binding throughout and no hidden production lease.

- [ ] **Step 9: Commit automatic pipeline integration**

```bash
git add ui/server/src/novel-writing-service/service/generate-chapter-for-group-methods.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts ui/server/src/novel-writing-service/service/generate-chapter-editor-meme-polish.ts ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore.ts ui/server/src/novel-writing-service/service/generate-chapter-quality-prestore-finalize.ts ui/server/src/novel-writing-service/service/generate-chapter-full-production-store.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-mode-store.ts ui/server/src/novel-writing-service/generation-source/production-lease.ts ui/server/src/novel/acceptance.ts ui/server/src/novel/acceptance.test.ts ui/server/src/routes/novel-generation/builders.ts ui/server/src/routes/novel-generation/builders.mcp.test.ts
git commit -m "feat(generation): unify automatic chapter production source"
```

## Task 10: Wrap manual quality, editor report, and story-state operations

**Files:**

- Modify: `ui/server/src/routes/novel-editor/builders.ts`
- Modify: `ui/server/src/routes/novel-editor/register-quality.ts`
- Modify: `ui/server/src/routes/novel-editor/register-revision.ts`
- Modify: `ui/server/src/routes/novel-editor/single-chapter-story-state.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.quality-card.test.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.story-state-runtime.test.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`
- Modify: `ui/server/src/routes/novel.ts`

- [ ] **Step 1: Write failing manual task boundary tests**

For manual prose quality, editor report, and story-state sync, inject `beginChapterTask` and assert:

```ts
expect(taskBegins).toHaveLength(1)
expect(stageCalls.map(call => call.stage)).toEqual(['manual_recheck'])
expect(taskCloses).toEqual([{ status: 'success' }])
expect(ordinaryAgentCalls).toBe(0)
```

For story-state sync assert `story_state_sync`; for editor report assert `editor_report`. Add provider/MCP failure and aborted request cases proving failed/cancelled close and no source fallback. Add a case where the project lease causes the source activation endpoint to return 409 while the manual operation awaits its model result.

- [ ] **Step 2: Run focused editor route tests and verify RED**

Run: `bun test ui/server/src/routes/novel-editor-routes.quality-card.test.ts ui/server/src/routes/novel-editor-routes.story-state-runtime.test.ts ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`

Expected: FAIL because manual routes call `executeNovelAgent` or story-state helpers without a task execution.

- [ ] **Step 3: Add the task factory to `EditorRoutesContext`**

Extend the context:

```ts
beginChapterTask: (input: BeginChapterTaskInput) => Promise<ChapterTaskExecution>
```

Pass `writingService.beginChapterTask` from `novel.ts`.

- [ ] **Step 4: Use a reusable outcome wrapper in editor routes**

Add a local helper:

```ts
async function withEditorChapterTask<T>(input: BeginChapterTaskInput, operation: (execution: ChapterTaskExecution) => Promise<T>) {
  const execution = await ctx.beginChapterTask(input)
  let outcome: { status: 'success' | 'failed' | 'cancelled'; error?: unknown } = { status: 'failed' }
  try {
    const value = await operation(execution)
    outcome = { status: 'success' }
    return value
  } catch (error) {
    outcome = { status: input.signal?.aborted ? 'cancelled' : 'failed', error }
    throw error
  } finally {
    await execution.close(outcome)
  }
}
```

Build the current complete context package before beginning each manual task.

- [ ] **Step 5a: Wrap manual prose-quality recheck**

`/prose-quality` executes `manual_recheck` with `quality_review_json` and passes the handle through `ProseQualityReviewOptions`.

- [ ] **Step 5b: Wrap manual editor-report generation**

`/editor-report` executes `editor_report` with `editor_report_json`, then closes only after its review record is durably written.

- [ ] **Step 5c: Wrap manual story-state synchronization**

`/story-state-sync` passes the same execution through prepare and apply as `story_state_sync`, then closes after convergence receipts are written.

- [ ] **Step 5d: Assert non-goal editor endpoints remain unchanged**

Verify `/reference-migration-plan`, annotations, version merge, similarity, and planning endpoints remain on their current paths because they are outside the approved scope.

Add `chapterTaskExecution?: ChapterTaskExecution` to `ProseQualityReviewOptions` and single-chapter story-state inputs. When supplied, those helpers use it and do not begin or resolve another task.

- [ ] **Step 6: Run focused editor route tests and verify GREEN**

Run: `bun test ui/server/src/routes/novel-editor-routes.quality-card.test.ts ui/server/src/routes/novel-editor-routes.story-state-runtime.test.ts ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`

Expected: PASS with one execution per manual request and no fallback.

- [ ] **Step 7: Commit manual task boundaries**

```bash
git add ui/server/src/routes/novel-editor/builders.ts ui/server/src/routes/novel-editor/register-quality.ts ui/server/src/routes/novel-editor/register-revision.ts ui/server/src/routes/novel-editor/single-chapter-story-state.ts ui/server/src/routes/novel-editor-routes.quality-card.test.ts ui/server/src/routes/novel-editor-routes.story-state-runtime.test.ts ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts ui/server/src/routes/novel.ts
git commit -m "feat(editor): use project chapter source for manual checks"
```

## Task 11: Keep editor revision, post-review, and state sync in one task

**Files:**

- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.test.ts`
- Modify: `ui/server/src/routes/novel-editor/editor-revision-contract.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-run-view.test.ts`

- [ ] **Step 1: Write failing worker tests for a shared execution**

Extend the worker harness with this deterministic task execution. It records the task factory, stages, and close outcome without reaching a real provider:

```ts
const taskBegins: BeginChapterTaskInput[] = []
const stageCalls: Array<{ taskId: string; stage: ChapterTaskStage }> = []
const closeCalls: Array<{ status: 'success' | 'failed' | 'cancelled'; error?: unknown }> = []

const beginChapterTask = async (input: BeginChapterTaskInput): Promise<ChapterTaskExecution> => {
  taskBegins.push(input)
  const taskId = 'revision-task-1'
  return {
    taskId,
    source: 'model',
    modelId: 217,
    fingerprint: `sha256:${'a'.repeat(64)}`,
    contextVersion: `sha256:${'b'.repeat(64)}`,
    provenance: () => ({
      task_id: taskId,
      project_id: Number(input.project.id),
      chapter_id: Number(input.chapter.id),
      source: 'model',
      source_fingerprint: `sha256:${'a'.repeat(64)}`,
      context_version: `sha256:${'b'.repeat(64)}`,
      model_id: 217,
    }),
    generateDraft: async () => { throw new Error('revision worker must not draft') },
    executeAgent: async (stage) => {
      stageCalls.push({ taskId, stage })
      if (stage === 'revision') return llmResult({ prose: candidateText })
      if (stage === 'post_revision_review') {
        return llmResult({ passed: true, score: 96, issues: [], revision_directives: [] })
      }
      return llmResult({ character_updates: [], setting_updates: [], relationship_updates: [] })
    },
    assertCurrent: async () => {},
    close: async outcome => { closeCalls.push(outcome || { status: 'success' }) },
  }
}
```

Return these arrays from `createHarness`, inject `beginChapterTask` into the worker dependencies, and make a successful revision assert:

```ts
expect(stageCalls.map(call => call.stage)).toEqual([
  'revision', 'post_revision_review', 'story_state_sync',
])
expect(new Set(stageCalls.map(call => call.taskId))).toEqual(new Set(['revision-task-1']))
expect(closeCalls).toEqual([{ status: 'success' }])
```

Add failure at candidate generation, cancellation while waiting, failure at post-quality, and state-sync failure cases. Each must close once with the correct outcome and release the project source lease. Add an MCP test proving the later manual prose-quality request starts another task and receives another Session.

- [ ] **Step 2: Run worker tests and verify RED**

Run: `bun test ui/server/src/routes/novel-editor/revision-worker.test.ts ui/server/src/routes/novel-editor/revision-run-view.test.ts`

Expected: FAIL because the worker resolves model calls independently in each phase.

- [ ] **Step 3: Build fresh canonical task context after claiming the run**

After loading the project and current chapter in `processClaim`, load current chapters, worldbuilding, characters, outlines, and reviews; build the complete context package; then begin the task with `requestedModelId: input.model_id`. Store only bounded provenance in the checkpoint:

Add the task factory plus the four context dependencies to `EditorRevisionWorkerDependencies`:

```ts
beginChapterTask: (input: BeginChapterTaskInput) => Promise<ChapterTaskExecution>
listWorldbuilding: (workspace: string, projectId: number) => Promise<any[]>
listCharacters: (workspace: string, projectId: number) => Promise<any[]>
listOutlines: (workspace: string, projectId: number) => Promise<any[]>
buildChapterContextPackage: (
  workspace: string,
  project: any,
  chapter: any,
  chapters: any[],
  worldbuilding: any[],
  characters: any[],
  outlines: any[],
  reviews: any[],
) => Promise<any>
```

Wire `beginChapterTask: ctx.beginChapterTask`, the three repository list functions, and `ctx.buildChapterContextPackage` in `createEditorRevisionWorker`. In `createHarness`, use the `beginChapterTask` fixture from Step 1 plus:

```ts
listWorldbuilding: async () => [],
listCharacters: async () => [],
listOutlines: async () => [],
buildChapterContextPackage: async (_workspace, _project, chapter) => ({
  current_chapter: { chapter_no: chapter.chapter_no, title: chapter.title },
  writing_bible: {},
  story_state: {},
  continuity: {},
}),
```

This keeps worker tests deterministic and prevents access to global workspace state.

```ts
checkpoint.chapter_generation_source = {
  task_id: execution.taskId,
  source: execution.source,
  source_fingerprint: execution.fingerprint,
  context_version: execution.contextVersion,
  ...(execution.modelId ? { model_id: execution.modelId } : {}),
}
```

Add this optional object to the checkpoint contract and public run view allowlist; never expose Key material or raw prompts.

- [ ] **Step 4a: Route revision candidate generation**

Change phase signatures to accept `chapterTaskExecution`. Candidate generation calls:

```ts
chapterTaskExecution.executeAgent(
  'revision',
  'revision_prose',
  'prose-agent',
  project,
  { task: request.prompt },
  {
    activeWorkspace,
    maxTokens: request.maxTokens,
    temperature: request.temperature,
    responseMode: 'stream',
    skipMemory: true,
    signal: controller.signal,
    timeoutMs: llmTimeoutMs,
    maxRetries: 1,
  },
)
```

- [ ] **Step 4b: Route post-revision quality**

Pass the same handle to `createQualityReview`, selecting `post_revision_review` / `quality_review_json`; do not resolve another source inside the builder.

- [ ] **Step 4c: Route revision story-state synchronization**

Pass the same handle to story-state prepare/apply with `story_state_sync` / `story_state_json`. The execution, not `input.model_id`, controls the effective model in all three worker phases.

- [ ] **Step 5: Close after worker terminalization and cancellation cleanup**

Track outcome in `processClaim`. Close after successful completion, failure checkpointing, cancellation finalization, or stop cleanup, but before the claim's project becomes source-mutable. If the worker loses its database lease before performing any source stage, still close the source execution.

- [ ] **Step 6: Run worker tests and verify GREEN**

Run: `bun test ui/server/src/routes/novel-editor/revision-worker.test.ts ui/server/src/routes/novel-editor/revision-run-view.test.ts`

Expected: PASS with one task ID across the three model phases and exactly-once close under every terminal path.

- [ ] **Step 7: Commit revision task integration**

```bash
git add ui/server/src/routes/novel-editor/revision-worker.ts ui/server/src/routes/novel-editor/revision-worker.test.ts ui/server/src/routes/novel-editor/editor-revision-contract.ts ui/server/src/routes/novel-editor/revision-run-view.ts ui/server/src/routes/novel-editor/revision-run-view.test.ts
git commit -m "feat(editor): unify revision worker generation source"
```

## Task 12: Add authoritative web source state and API methods

**Files:**

- Modify: `ui/web/src/api/mcp.ts`
- Create: `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts`
- Create: `ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/useNovelWorkspaceData.ts`
- Modify: `ui/web/src/pages/novel-workspace/useNovelWorkspaceData.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

- [ ] **Step 1: Write failing pure model and project-switch tests**

Create `chapterGenerationSourceModel.test.ts`:

```ts
test('hydrates the stored chapter model and keeps one exact active source', () => {
  const view = normalizeChapterSourceView({
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: { model_id: 217 },
      mcp: {
        server_id: 'buda', key_id: 3, adapter_id: 'buda',
        agent_id: 'agent-1', model: '',
      },
    },
    fingerprint: 'sha256:' + 'a'.repeat(64),
    locked: false,
  })
  expect(view.source.active).toBe('mcp')
  expect(view.source.model.model_id).toBe(217)
  expect(view.source.mcp?.agent_id).toBe('agent-1')
})

test('keeps confirmed state when activation receives an HTTP error', async () => {
  const confirmed = modelSourceView(217)
  const expected = httpError(409, 'GENERATION_SOURCE_BUSY')
  let reads = 0
  await expect(commitConfirmedSource({
    current: confirmed,
    request: async () => { throw expected },
    readAuthoritative: async () => {
      reads += 1
      throw new Error('GET must not run for a definite HTTP response')
    },
    assertCurrent: () => {},
  })).rejects.toBe(expected)
  expect(reads).toBe(0)
})

test('reconciles a no-response activation through authoritative GET without retrying', async () => {
  const confirmed = modelSourceView(217)
  const committed = normalizeChapterSourceView({
    ok: true,
    source: {
      version: 'chapter_generation_source_v1', active: 'mcp', model: { model_id: 217 },
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '' },
    },
    fingerprint: 'sha256:' + 'b'.repeat(64),
    locked: false,
    display: {
      active: 'mcp', model_id: 217,
      mcp: { server_id: 'buda', key_id: 3, adapter_id: 'buda', agent_id: 'agent-1', model: '' },
    },
  })
  let activationCalls = 0
  let reads = 0
  const result = await commitConfirmedSource({
    current: confirmed,
    request: async () => {
      activationCalls += 1
      throw transportError('ECONNRESET')
    },
    readAuthoritative: async () => {
      reads += 1
      return committed
    },
    assertCurrent: () => {},
  })
  expect(result).toMatchObject({ previous: confirmed, source: committed, reconciled: true })
  expect({ activationCalls, reads }).toEqual({ activationCalls: 1, reads: 1 })
})

test('enters authority unknown when the single reconciliation GET also fails', async () => {
  const confirmed = modelSourceView(217)
  const mutationError = transportError('ECONNRESET: private mutation detail')
  const readError = new Error('private authority read detail')
  let reads = 0
  const operation = commitConfirmedSource({
    current: confirmed,
    request: async () => { throw mutationError },
    readAuthoritative: async () => { reads += 1; throw readError },
    assertCurrent: () => {},
  })
  await expect(operation).rejects.toMatchObject({
    code: 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN',
    previous: confirmed,
    mutationTransportError: mutationError,
    authorityReadError: readError,
    message: '章节来源权威状态暂时无法确认',
  })
  expect(reads).toBe(1)
})

test('keeps authority unknown after a failed controlled refresh and clears it after a later successful GET', async () => {
  const previous = modelSourceView(217)
  const recovered = mcpSourceView(217)
  const unknown = authorityUnknownState(previous, authorityUnknownError(previous))
  const stillUnknown = await refreshChapterSourceAuthority({
    current: unknown,
    readAuthoritative: async () => { throw new Error('still offline') },
    assertCurrent: () => {},
  })
  expect(stillUnknown.state).toBe(unknown)
  expect(await refreshChapterSourceAuthority({
    current: stillUnknown.state,
    readAuthoritative: async () => recovered,
    assertCurrent: () => {},
  })).toEqual({
    state: confirmedAuthorityState(recovered),
    readError: null,
  })
})

test.each(['mutation_success', 'reconcile_success', 'reconcile_failure'] as const)(
  'fences late project A %s from project B', async scenario => {
    const fixture = startGuardedSourceScenario(scenario, { projectId: 1, loadEpoch: 101 })
    const projectB = {
      authority: confirmedAuthorityState(modelSourceView(301)),
      disabled: false,
      settingsOpen: false,
    }
    fixture.switchProject(2, 102, projectB)
    fixture.settleProjectA()
    await expect(fixture.operation).rejects.toBeInstanceOf(StaleChapterSourceOperationError)
    expect(fixture.ui).toEqual(projectB)
  },
)
```

`startGuardedSourceScenario` is a test fixture that runs the real `commitConfirmedSource`, asserts the captured token before every test setter/error side effect, and settles either the mutation or its reconciliation GET only after the project switch. Extend the workspace data test so a late initial source response for project A cannot overwrite project B, a mutation invalidates an earlier initial-GET token, and stored model ID wins over transient previous-project selection. Add the same pure fence case for a stale definite HTTP error: it cannot open settings or change B's error/disabled state.

- [ ] **Step 2: Run web model tests and verify RED**

Run: `bun test ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts ui/web/src/pages/novel-workspace/useNovelWorkspaceData.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: FAIL because the chapter-source web contract does not exist and the selected model is only transient.

- [ ] **Step 3: Add web contracts and API methods**

Add to `api/mcp.ts`:

```ts
export type ChapterGenerationSourceState = {
  version: 'chapter_generation_source_v1'
  active: 'model' | 'mcp'
  model: { model_id?: number }
  mcp?: { server_id: string; key_id: number; adapter_id: string; agent_id: string; model: string }
}

export type ChapterGenerationSourceView = {
  ok: true
  source: ChapterGenerationSourceState
  fingerprint: string
  locked: boolean
  display: {
    active: 'model' | 'mcp'
    model_id: number | null
    mcp: ChapterGenerationSourceState['mcp'] | null
  }
}

export const chapterSourceApi = {
  get: async (projectId: number) => (
    await apiClient.get<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source`)
  ).data,
  activate: async (projectId: number, active: 'model' | 'mcp') => (
    await apiClient.post<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/activate`, { active })
  ).data,
  saveModel: async (projectId: number, modelId: number) => (
    await apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/model`, { model_id: modelId })
  ).data,
  testMcp: async (projectId: number, mcp: NonNullable<ChapterGenerationSourceState['mcp']>) => (
    await apiClient.post<{ ok: true; validation: Record<string, unknown> }>(`/novel/projects/${projectId}/chapter-generation-source/mcp/test`, { mcp })
  ).data,
  saveMcp: async (projectId: number, mcp: NonNullable<ChapterGenerationSourceState['mcp']>) => (
    await apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/mcp`, { mcp })
  ).data,
}
```

Keep legacy `mcpApi` methods only for compatibility tests and old callers until the new UI no longer imports them.

- [ ] **Step 4: Implement pure state and error helpers**

Implement the model/MCP view fixtures used by Step 1 and make the normalizer reject every non-exact server payload:

```ts
export function normalizeChapterSourceView(value: unknown): ChapterGenerationSourceView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('章节来源响应无效')
  }
  const view = value as ChapterGenerationSourceView
  const source = view.source
  if (view.ok !== true || !source || source.version !== 'chapter_generation_source_v1') {
    throw new Error('章节来源响应版本无效')
  }
  if (source.active !== 'model' && source.active !== 'mcp') {
    throw new Error('章节来源活动状态无效')
  }
  const modelId = source.model?.model_id
  if (modelId !== undefined && (!Number.isInteger(modelId) || modelId <= 0)) {
    throw new Error('章节模型无效')
  }
  if (source.active === 'mcp' && !source.mcp) {
    throw new Error('活动 MCP 绑定缺失')
  }
  const mcp = source.mcp
  if (mcp && (
    typeof mcp.server_id !== 'string' || !mcp.server_id
    || !Number.isInteger(mcp.key_id) || mcp.key_id <= 0
    || typeof mcp.adapter_id !== 'string' || !mcp.adapter_id
    || typeof mcp.agent_id !== 'string' || !mcp.agent_id
    || typeof mcp.model !== 'string'
  )) {
    throw new Error('章节 MCP 绑定无效')
  }
  const fingerprint = String(view.fingerprint || '').trim()
  if (!/^sha256:[0-9a-f]{64}$/.test(fingerprint)) {
    throw new Error('章节来源指纹无效')
  }
  return {
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: source.active,
      model: modelId === undefined ? {} : { model_id: modelId },
      ...(mcp ? { mcp: { ...mcp } } : {}),
    },
    fingerprint,
    locked: view.locked === true,
    display: {
      active: source.active,
      model_id: modelId || null,
      mcp: mcp ? { ...mcp } : null,
    },
  }
}

export function modelSourceView(modelId: number): ChapterGenerationSourceView {
  return normalizeChapterSourceView({
    ok: true,
    source: {
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: modelId },
    },
    fingerprint: `sha256:${'a'.repeat(64)}`,
    locked: false,
    display: { active: 'model', model_id: modelId, mcp: null },
  })
}

```

Add focused rejection tests for a wrong version, `active: 'both'`, a fractional/zero model ID, and active MCP without a binding. Metadata enrichment may fail later, but the normalizer above always retains the stable Server/Key/Adapter/Agent/model identifiers already present in `source.mcp`.

Format `GENERATION_SOURCE_BUSY`, `CHAPTER_MODEL_REQUIRED`, and `MCP_BINDING_INVALID` without recommending fallback.

Define the authority state, operation fence, and confirmed-commit helper used by controls and tests. A definite HTTP error remains the original rejected object and performs zero authority reads. Only a no-response/transport error is reconciled:

```ts
export class ChapterSourceAuthorityUnknownError extends Error {
  readonly code = 'CHAPTER_SOURCE_AUTHORITY_UNKNOWN' as const

  constructor(
    readonly previous: ChapterGenerationSourceView,
    readonly mutationTransportError: unknown,
    readonly authorityReadError: unknown,
  ) {
    super('章节来源权威状态暂时无法确认')
    this.name = 'ChapterSourceAuthorityUnknownError'
  }
}

export class StaleChapterSourceOperationError extends Error {}

export type ChapterSourceAuthorityState =
  | { source: ChapterGenerationSourceView | null; authorityUnknown: false; reconciliationRequired: false; diagnostic: null }
  | { source: ChapterGenerationSourceView; authorityUnknown: true; reconciliationRequired: true; diagnostic: ChapterSourceAuthorityUnknownError }

export function confirmedAuthorityState(source: ChapterGenerationSourceView | null): ChapterSourceAuthorityState {
  return { source, authorityUnknown: false, reconciliationRequired: false, diagnostic: null }
}

export function authorityUnknownState(
  previous: ChapterGenerationSourceView,
  diagnostic: ChapterSourceAuthorityUnknownError,
): ChapterSourceAuthorityState {
  return { source: previous, authorityUnknown: true, reconciliationRequired: true, diagnostic }
}

export type ChapterSourceOperationToken = Readonly<{
  projectId: number
  loadEpoch: number
  operationEpoch: number
}>

export function createChapterSourceOperationFence() {
  let projectId = 0
  let loadEpoch = 0
  let operationEpoch = 0
  let mounted = true
  const rejectStale = () => { throw new StaleChapterSourceOperationError() }
  return {
    enterProject(nextProjectId: number, nextLoadEpoch: number) {
      mounted = true
      projectId = nextProjectId
      loadEpoch = nextLoadEpoch
      operationEpoch += 1
    },
    begin(nextProjectId: number, nextLoadEpoch: number): ChapterSourceOperationToken {
      if (!mounted || nextProjectId !== projectId || nextLoadEpoch !== loadEpoch) rejectStale()
      operationEpoch += 1
      return Object.freeze({ projectId, loadEpoch, operationEpoch })
    },
    assertCurrent(token: ChapterSourceOperationToken) {
      if (!mounted || token.projectId !== projectId || token.loadEpoch !== loadEpoch
        || token.operationEpoch !== operationEpoch) rejectStale()
    },
    unmount() { mounted = false; operationEpoch += 1 },
  }
}

export async function commitConfirmedSource(input: {
  current: ChapterGenerationSourceView
  request: () => Promise<ChapterGenerationSourceView>
  readAuthoritative: () => Promise<ChapterGenerationSourceView>
  assertCurrent: () => void
}) {
  try {
    const source = await input.request()
    input.assertCurrent()
    return { previous: input.current, source, reconciled: false }
  } catch (error) {
    if (!isNoResponseTransportError(error)) {
      input.assertCurrent()
      throw error
    }
    input.assertCurrent()
    let source: ChapterGenerationSourceView
    try {
      source = await input.readAuthoritative()
    } catch (authorityReadError) {
      input.assertCurrent()
      throw new ChapterSourceAuthorityUnknownError(
        input.current,
        error,
        authorityReadError,
      )
    }
    input.assertCurrent()
    return { previous: input.current, source, reconciled: true }
  }
}

export async function refreshChapterSourceAuthority(input: {
  current: ChapterSourceAuthorityState
  readAuthoritative: () => Promise<ChapterGenerationSourceView>
  assertCurrent: () => void
}) {
  try {
    const source = await input.readAuthoritative()
    input.assertCurrent()
    return { state: confirmedAuthorityState(source), readError: null }
  } catch (readError) {
    input.assertCurrent()
    return { state: input.current, readError }
  }
}
```

`isNoResponseTransportError` must reject classification when any HTTP response/status is present. Reconciliation performs exactly one GET and never repeats the mutation automatically. The server-side authority handler waits the same-project mutation tail captured at GET start and performs one final read, so the client must not poll. If the GET fails, catch `ChapterSourceAuthorityUnknownError`, assert the token once more at the setter boundary, and store `authorityUnknownState(error.previous, error)`. Its two underlying causes are diagnostic-only: UI formatters use the fixed public message `章节来源权威状态暂时无法确认，请重新获取`, never stringify, serialize, or interpolate those causes.

While `authorityUnknown` is true, activation, model save, MCP test/save, and every binding mutation must reject before issuing a request. `refreshChapterSourceAuthority` is invoked only by one explicit refresh action or one existing controlled workspace refresh. It performs one GET per invocation; a failed read returns the same unknown state without scheduling another read, while a successful read is the only transition that clears `authorityUnknown` and `reconciliationRequired`.

All mutation callers create a token before calling `activate`, `saveModel`, or `saveMcp`, pass its assertion to both helpers, and assert it again immediately before any React setter, notification, error formatter, or `onOpenSettings` call. A stale operation is silently discarded. The same fence instance is shared with the initial chapter-source GET, so the ordinary workspace `loadEpoch` protects all module loads while `operationEpoch` orders initial source load, mutations, reconciliation, and explicit authority refresh within that project.

Remove `buildTemporaryModelOverride` and its test. Change the MCP form payload builder to return `{ mcp }`, never an active source record.

- [ ] **Step 5: Load source with project modules and hydrate the selected chapter model**

Create one `ChapterSourceOperationFence` in `useNovelWorkspaceData.ts` and share it with all chapter-source controls. The existing workspace `loadEpoch` remains the outer fence for every project module. Immediately when a new project load starts—and before clearing the previous source—call `enterProject(projectId, loadEpoch)`, then call `begin(projectId, loadEpoch)` for the initial chapter-source GET. Add that GET to the existing abort-protected `Promise.all`.

After the initial GET resolves, require both the existing workspace epoch check and `chapterSourceFence.assertCurrent(sourceToken)` before committing `confirmedAuthorityState(source)`. A later activation, model save, MCP save, reconciliation GET, or controlled authority refresh calls `begin` again and therefore invalidates that initial token. Project switch changes `loadEpoch` and calls `enterProject` before any new request; unmount calls `unmount`. Do not use a separate mutation counter that can remain valid after the workspace load epoch changes.

Set `selectedModelId` from `authority.source?.source.model.model_id` when present; otherwise use `resolveSelectedWorkspaceModelId` for legacy projects. Reset the authority state and selected model on project switch only after invalidating the old token. Return guarded callbacks that capture the current project/load pair rather than letting UI components invent epochs:

```ts
chapterGenerationSourceAuthority,
setChapterGenerationSourceAuthority,
beginChapterSourceOperation,
assertChapterSourceOperationCurrent,
selectedModelId,
setSelectedModelId,
```

`beginChapterSourceOperation()` returns a token containing the selected `projectId`, current `loadEpoch`, and new `operationEpoch`. `assertChapterSourceOperationCurrent(token)` checks all three fields. Every setter exposed to Task 13 remains caller-guarded: the caller must assert immediately before committing source/unknown state, selected model, notification state, or settings visibility.

- [ ] **Step 6: Run web model tests and verify GREEN**

Run: `bun test ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts ui/web/src/pages/novel-workspace/useNovelWorkspaceData.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts`

Expected: PASS with authoritative project-switch behavior, shared initial-load/mutation epoch fencing, authority-unknown recovery, and no temporary override helper.

- [ ] **Step 7: Commit web source state**

```bash
git add ui/web/src/api/mcp.ts ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.ts ui/web/src/pages/novel-workspace/chapterGenerationSourceModel.test.ts ui/web/src/pages/novel-workspace/useNovelWorkspaceData.ts ui/web/src/pages/novel-workspace/useNovelWorkspaceData.test.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceModel.test.ts
git commit -m "feat(web): load authoritative chapter source state"
```

## Task 13: Build the mutually exclusive top-bar and settings UI

**Files:**

- Create: `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx`
- Create: `ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx`
- Modify: `ui/web/src/pages/novel-workspace/McpGenerationSourceStatus.tsx`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/workspace-view-props-topbar.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.css`

- [ ] **Step 1: Write failing rendering and interaction tests**

Cover these exact states in `ChapterGenerationSourceControl.test.tsx`:

- API active: API segment selected, model enabled, retained MCP detail gray and marked `已停用`.
- MCP active: MCP segment selected, model visible/disabled with the tooltip `章节生产链当前由 MCP Agent 执行`.
- busy: source segments, model, test/save, and binding controls disabled with `当前章节任务正在运行，结束后可切换来源`.
- pending activation: no optimistic active-segment change before the response.
- definite HTTP activation failure: confirmed source remains displayed, and only an explicit incomplete-MCP error requests opening settings.
- activation transport failure with no HTTP response: keep the control pending while one authoritative GET runs, then display the GET result without automatically retrying activation.
- reconciliation GET failure: keep the last-known source visible with `章节来源权威状态暂时无法确认，请重新获取`, set `authorityUnknown`/`reconciliationRequired`, and disable activation, model, MCP test/save, and binding controls.
- controlled recovery: one click on `重新获取` performs one GET; failure schedules no loop and remains disabled, while success replaces the source and re-enables controls subject to ordinary busy/lock state.
- project fencing: late project A mutation success, HTTP-error side effects, reconciliation success, and reconciliation failure cannot change project B's source, selected model, disabled/unknown state, notification, or settings visibility.
- normal mode: both retained configuration details visible.
- immersive mode: compact segment and only active detail visible.
- partial metadata failure: stable server/key/agent/model identifiers remain visible.

Add these interaction tests, and run the first test for activation, model save, and MCP save entry points:

```tsx
test.each(['activate', 'saveModel', 'saveMcp'] as const)(
  '%s disables on unknown authority and recovers only through one explicit GET',
  async mutation => {
    const previous = modelSourceView(217)
    const recovered = modelSourceView(301)
    mockAmbiguousMutation(mutation)
    chapterSourceApi.get.mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce(recovered)
    renderSourceHarness({ projectId: 1, authority: confirmedAuthorityState(previous) })

    await triggerMutation(mutation)
    expect(await screen.findByText('章节来源权威状态暂时无法确认，请重新获取')).toBeVisible()
    expect(screen.queryByText(/private/)).not.toBeInTheDocument()
    expectLastKnownSource(previous)
    expectEverySourceMutationDisabled()
    expect(chapterSourceApi.get).toHaveBeenCalledTimes(1)
    await flushPromises()
    expect(chapterSourceApi.get).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: '重新获取' }))
    await waitFor(() => expectAuthoritativeSource(recovered))
    expectEverySourceMutationEnabledExceptOrdinaryInactiveOrLockedControls()
    expect(chapterSourceApi[mutation]).toHaveBeenCalledTimes(1)
    expect(chapterSourceApi.get).toHaveBeenCalledTimes(2)
  },
)

test.each([
  'mutation_success', 'http_error', 'reconcile_success', 'reconcile_failure',
] as const)('discards late project A %s after switching to B', async scenario => {
  const harness = renderProjectRaceHarness(scenario, { projectId: 1, source: modelSourceView(217) })
  await harness.startA()
  harness.switchProject({ projectId: 2, source: modelSourceView(301) })
  await harness.settleA()
  expectProjectBSourceAndControlsUnchanged(301)
  expect(harness.openSettings).not.toHaveBeenCalled()
  expect(screen.queryByText('章节来源权威状态暂时无法确认，请重新获取')).not.toBeInTheDocument()
})
```

The race harness is a test fixture, not a production shortcut. `reconcile_success` and `reconcile_failure` both reject the mutation as transport-ambiguous, wait until the A-scoped GET is pending, switch to B, and only then settle that GET. All scenarios use real controlled props/rerender and assert source, selected model, disabled/unknown state, notifications, and settings callbacks together.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `bun test ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`

Expected: FAIL because the top bar still has an independent model select and MCP status button.

- [ ] **Step 3: Implement the controlled top-bar component**

The component receives the authority state and the shared operation fence:

```ts
export type ChapterGenerationSourceControlProps = {
  projectId: number
  authority: ChapterSourceAuthorityState
  modelOptions: Array<{ value: number; label: React.ReactNode }>
  selectedModelId?: number
  compact: boolean
  locallyBusy: boolean
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  onSelectedModelConfirmed: (modelId: number) => void
  onOpenSettings: () => void
}
```

Use an Ant Design `Segmented` or button group with only `model` and `mcp`. At the start of activation, capture `const operationProjectId = projectId` and `const token = beginSourceOperation()`. Call `commitConfirmedSource` with `chapterSourceApi.activate(operationProjectId, active)`, one `chapterSourceApi.get(operationProjectId)`, and `assertCurrent: () => assertSourceOperationCurrent(token)`. After the helper returns, assert the token again immediately before `onAuthorityChange(confirmedAuthorityState(result.source))` or `onSelectedModelConfirmed`. Do not restore the previous source blindly and do not retry activation.

Handle each rejected class explicitly:

- `StaleChapterSourceOperationError`: discard without notification, setter, disabled-state change, or settings callback.
- `ChapterSourceAuthorityUnknownError`: assert the token at the setter boundary, store `authorityUnknownState(error.previous, error)`, and show only `章节来源权威状态暂时无法确认，请重新获取`.
- definite HTTP error: assert the token before formatting or notifying; retain the confirmed authority state, and call `onOpenSettings` only for the current token's explicit incomplete/invalid MCP code.

Render `重新获取` only for `authority.authorityUnknown`. Its click captures a new token and calls `refreshChapterSourceAuthority` with exactly one `chapterSourceApi.get(operationProjectId)`. Assert before storing the returned state. A failed refresh keeps the same unknown state and does not trigger a `useEffect`, timer, mutation replay, or another GET; a successful refresh replaces the source and clears the warning.

Model selection and MCP binding save use the identical project/token capture, confirmed-commit, reconciliation, and setter-side assertion. Model selection calls `saveModel` before committing the visible value. `authority.source?.locked || locallyBusy || pending || authority.authorityUnknown` disables all activation, model, MCP test/save, and binding controls, including during the one reconciliation GET. The refresh button is the only source action left available in authority-unknown state.

- [ ] **Step 4: Make MCP status controlled by authoritative source**

Remove its independent source fetch. It may load optional server/key/agent display metadata, but `source.active`, retained identifiers, and fallback labels always come from the controlled chapter-source state. Add an `active` prop and render `已启用` or `已停用`.

- [ ] **Step 5: Separate activation from MCP binding in project settings**

At the top of `ProjectSettingsModal`, render `当前章节来源` using the same two-state control. Below a divider render `MCP 绑定配置`. In `McpGenerationSourcePanel`:

- remove the model/MCP source radio;
- always show Server, account, Adapter, Agent, and Buda model;
- test through `/mcp/test`;
- save through `/mcp`;
- display `保存绑定不会启用 MCP；章节来源需单独切换`;
- keep the tested fingerprint requirement;
- disable all controls when `authority.source?.locked`, `authority.authorityUnknown`, or a guarded source operation is pending;
- capture the same `operationProjectId` and operation token for save, run `saveMcp` through `commitConfirmedSource`, and assert current before authority/error/settings setters;
- on reconciliation GET failure, store authority unknown and leave only `重新获取` available; never repeat `saveMcp` automatically;
- call `onSaved(returnedSource)` only after the token assertion and without activating MCP.

- [ ] **Step 6: Wire authority state, the project fence, and local task busy status through the shell**

Pass authority state, its setter, and `beginChapterSourceOperation`/`assertChapterSourceOperationCurrent` from `useNovelWorkspaceData` through the base model, ready runtime, top-bar prop builder, and project-settings path. The top bar and MCP panel must share the same fence instance; separate component-local counters do not protect cross-surface races. Derive `locallyBusy` from `generatingProse` plus active `editor_revision`, manual quality, and story-state tasks. Server 409 remains authoritative if local task data is stale.

Replace the standalone select and status in `workspace-topbar.tsx` with:

```tsx
<ChapterGenerationSourceControl
  projectId={Number(selectedProject?.id || 0)}
  authority={chapterGenerationSourceAuthority}
  modelOptions={modelOptions}
  selectedModelId={selectedModelId}
  compact={isImmersiveShell}
  locallyBusy={chapterSourceLocallyBusy}
  beginSourceOperation={beginChapterSourceOperation}
  assertSourceOperationCurrent={assertChapterSourceOperationCurrent}
  onAuthorityChange={setChapterGenerationSourceAuthority}
  onSelectedModelConfirmed={setSelectedModelId}
  onOpenSettings={() => setProjectSettingsOpen(true)}
/>
```

Project switch must invalidate the old project/load token before closing or opening settings and before resetting pending/unknown UI state. Each async branch still asserts its captured token immediately before calling the callbacks above, so a late A result cannot change project B even though React props have already rerendered.

- [ ] **Step 7: Add active/inactive/busy/compact styles**

In `NovelProjectWorkspace.css`, add focused classes:

```css
.novel-chapter-source-control { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.novel-chapter-source-detail.is-active { opacity: 1; }
.novel-chapter-source-detail.is-inactive { opacity: .52; filter: grayscale(.35); }
.novel-chapter-source-control.is-busy { cursor: not-allowed; }
.novel-chapter-source-control.is-compact .novel-chapter-source-detail.is-inactive { display: none; }
.novel-chapter-source-model { width: 220px; }
```

Preserve current responsive top-bar truncation rules and the existing 440-pixel model dropdown width.

- [ ] **Step 8: Run UI tests and verify GREEN**

Run: `bun test ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts`

Expected: PASS for API/MCP mutual exclusion, retained inactive display, busy/authority-unknown locks, confirmed transitions, single-GET reconciliation and controlled recovery without mutation retry, project/epoch race isolation, and immersive mode.

- [ ] **Step 9: Commit the UI**

```bash
git add ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.tsx ui/web/src/pages/novel-workspace/ChapterGenerationSourceControl.test.tsx ui/web/src/pages/novel-workspace/McpGenerationSourceStatus.tsx ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.ts ui/web/src/pages/novel-workspace/mcpGenerationSourceStatusModel.test.ts ui/web/src/pages/novel-workspace/McpGenerationSourcePanel.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts ui/web/src/pages/novel-workspace/shell/workspace-topbar.tsx ui/web/src/pages/novel-workspace/shell/workspace-view-props-topbar.ts ui/web/src/pages/novel-workspace/shell/build-novel-workspace-ready-runtime.tsx ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx ui/web/src/pages/novel-workspace/workspaceUiShell.a-a.test.ts ui/web/src/pages/NovelProjectWorkspace.css
git commit -m "feat(web): add exclusive chapter source switching"
```

## Task 14: Run regression, build, and real Buda multi-stage acceptance

**Files:**

- Create: `scripts/check-buda-chapter-task-session.mjs`
- Create: `scripts/check-buda-chapter-task-session.test.ts`
- Modify: `ui/server/package.json`

- [ ] **Step 1: Write a failing contract test for the opt-in acceptance script**

The test imports pure receipt assertions from the script and verifies:

```ts
expect(assertOneTaskSession([
  { task_id: 'task-1', stage: 'draft', source_fingerprint: fingerprint, session_id: 'session-1' },
  { task_id: 'task-1', stage: 'quality_review', source_fingerprint: fingerprint, session_id: 'session-1' },
  { task_id: 'task-1', stage: 'story_state_sync', source_fingerprint: fingerprint, session_id: 'session-1' },
])).toEqual({ task_id: 'task-1', source_fingerprint: fingerprint, session_id: 'session-1' })

expect(() => assertNewTaskSession('session-1', [
  { task_id: 'task-2', stage: 'manual_recheck', source_fingerprint: fingerprint, session_id: 'session-1' },
])).toThrow('manual task reused the previous Session')
```

- [ ] **Step 2: Run the script test and verify RED**

Run: `bun test scripts/check-buda-chapter-task-session.test.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement the opt-in real acceptance script**

Export the pure assertions used by the contract test:

```js
export function assertOneTaskSession(receipts) {
  if (!Array.isArray(receipts) || receipts.length === 0) throw new Error('chapter task has no stage receipts')
  const first = receipts[0]
  for (const receipt of receipts) {
    if (!receipt.task_id || receipt.task_id !== first.task_id) throw new Error('chapter task changed task_id')
    if (!receipt.source_fingerprint || receipt.source_fingerprint !== first.source_fingerprint) {
      throw new Error('chapter task changed source fingerprint')
    }
    if (!receipt.session_id || receipt.session_id !== first.session_id) throw new Error('chapter task changed Session')
    if (receipt.source !== undefined && receipt.source !== 'mcp') throw new Error('chapter task crossed to model source')
  }
  return {
    task_id: first.task_id,
    source_fingerprint: first.source_fingerprint,
    session_id: first.session_id,
  }
}

export function assertNewTaskSession(previousSessionId, receipts) {
  const current = assertOneTaskSession(receipts)
  if (current.session_id === previousSessionId) throw new Error('manual task reused the previous Session')
  return current
}
```

The script must accept `--base-url`, `--project-id`, and `--chapter-id`; never accept or print a raw Key. It must:

1. GET the confirmed source and require active MCP;
2. trigger one full chapter production request;
3. poll its run to a terminal state;
4. read bounded `chapter_generation_stage` receipts;
5. assert draft, at least one review/repair stage, and story-state use one task ID/fingerprint/Session;
6. trigger one manual prose-quality request;
7. assert its task ID and Session differ;
8. fail if any stage receipt reports source `model`;
9. print only project/chapter/run IDs, stage names, masked fingerprint prefixes, and pass/fail.

Add package script:

```json
"smoke:buda:chapter-source": "node ../../scripts/check-buda-chapter-task-session.mjs"
```

- [ ] **Step 4: Run all focused server suites**

Run:

```bash
bun test ui/server/src/novel-writing-service/generation-source ui/server/src/mcp ui/server/src/routes/novel-mcp-binding-routes.test.ts ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.generation-source.test.ts ui/server/src/routes/novel-editor/revision-worker.test.ts ui/server/src/routes/novel-editor/single-chapter-story-state.test.ts
```

Expected: 0 failures.

- [ ] **Step 5: Run the complete server test suite**

Run: `bun test ui/server/src`

Expected: 0 failures. Pay particular attention to chapter-context, word-target, quality-loop, editor-revision, story-state, MCP security, lease, quarantine, and receipt suites.

- [ ] **Step 6: Run the complete web test suite**

Run: `bun test ui/web/src`

Expected: 0 failures.

- [ ] **Step 7: Build both applications**

Run: `bun run --cwd ui/server build`

Expected: exit 0 and `/private/tmp/mangaforge-server-check.js` produced.

Run: `bun run --cwd ui/web build`

Expected: exit 0 and Vite production build completes without TypeScript errors.

- [ ] **Step 8: Scan for forbidden bypasses and placeholders**

Run:

```bash
rg -n "generation_source_override|createGenerationSourceResolver\(.*resolve|takeProductionLease|attachProductionLease" ui/server/src ui/web/src
```

Expected: no production matches. Historical migration names and explicit tests may mention `prose_generation_source_v1`; no new UI code may call the old source write endpoint.

Run:

```bash
rg -n "executeNovelAgent\(" ui/server/src/novel-writing-service/service ui/server/src/routes/novel-editor
```

Expected: only non-chapter planning/safety/annotation paths and declared fallback injection points remain; every covered call site uses `ChapterTaskExecution`.

- [ ] **Step 9: Run a real Buda chapter and later manual recheck**

With the already configured local test account, Server, Key, Agent, and project binding, run:

```bash
bun run --cwd ui/server smoke:buda:chapter-source -- --base-url http://localhost:3000 --project-id "$MANGAFORGE_BUDA_TEST_PROJECT_ID" --chapter-id "$MANGAFORGE_BUDA_TEST_CHAPTER_ID"
```

Expected: PASS showing one Session for the automatic multi-stage task, a different Session for the later manual recheck, one source fingerprint per task, and no model-source stage. The command must not print credentials or raw prompts/prose.

- [ ] **Step 10: Verify the worktree contains no local test data in the commit set**

Run: `git status --short`

Expected: implementation files are staged or clean; these local paths remain unstaged and uncommitted:

```text
workspace/assets.json
workspace/mcp-agent-quarantines.json
workspace/mcp-keys.json
workspace/mcp-servers.json
workspace/zhuque-inputs/
workspace/zhuque-reports/
```

- [ ] **Step 11: Commit verification tooling**

```bash
git add scripts/check-buda-chapter-task-session.mjs scripts/check-buda-chapter-task-session.test.ts ui/server/package.json
git commit -m "test(generation): verify unified Buda chapter sessions"
```

- [ ] **Step 12: Record final acceptance evidence**

In the implementation handoff, report focused/full test counts, both build results, the real Buda run IDs, the masked fingerprint prefixes, automatic/manual Session inequality, and confirmation that no workspace credential/test-data files were committed.
