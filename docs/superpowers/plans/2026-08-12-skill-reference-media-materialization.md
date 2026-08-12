# Skill Reference Media Materialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize Base64 and Blob image references as short workspace media URLs before Skill compilation, formal generation, or generated-image asset saving.

**Architecture:** A focused browser-side materializer owns Data/Blob fetching, image validation, upload coalescing, and per-node URL caching. GenerateNode validates canonical references first, asynchronously materializes their URLs through the existing image-upload API, and then uses the same short bindings for preview, Chat compilation, formal generation, provenance, and cache hashing. Preview re-checks its request token after upload so a stale input cannot reach the compiler, while generated-output persistence only treats Data images and image-mode Blobs as images.

**Tech Stack:** TypeScript, React, Axios, browser Blob/FormData APIs, Bun, `bun:test`

---

## File Structure

- Create `ui/web/src/components/nodes/generate-node-reference-media.ts`: pure, dependency-injected materialization and cache/coalescing logic.
- Create `ui/web/src/components/nodes/generate-node-reference-media.test.ts`: focused Data/Blob, nine-reference, deduplication, passthrough, and failure tests.
- Modify `ui/web/src/components/nodes/GenerateNode.tsx`: instantiate one materializer per node and apply it to all preview/run/save paths.
- Modify `ui/web/src/components/nodes/generateNode.test.ts`: assert wiring and generated-image asset persistence use materialized paths.

### Task 1: Reproduce and specify reference materialization

**Files:**
- Create: `ui/web/src/components/nodes/generate-node-reference-media.test.ts`

- [ ] **Step 1: Write failing tests for materialization, nine-image preservation, passthrough, coalescing, upload failure, and typed failures**

Create the test file with a one-pixel PNG Data URL and injected `fetchBlob` and `uploadImage` functions. The main assertions are:

```ts
import { describe, expect, test } from 'bun:test'
import {
  createGenerateNodeReferenceMediaMaterializer,
  GenerateNodeReferenceMediaError,
} from './generate-node-reference-media'

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

describe('GenerateNode reference media materializer', () => {
  test('materializes nine ordered image references without changing identity, roles, or lineage', async () => {
    const uploads: string[] = []
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async url => new Blob([url], { type: 'image/png' }),
      uploadImage: async (_blob, filename) => {
        uploads.push(filename)
        return `/api/assets/media/${filename}`
      },
    })
    const references = Array.from({ length: 9 }, (_, index) => ({
      type: 'image' as const,
      url: `${PIXEL}#${index + 1}`,
      reference_index: index + 1,
      reference_id: `ref-${index + 1}`,
      reference_role: index === 0 ? 'first_frame' as const : index === 8 ? 'last_frame' as const : 'character' as const,
      source_asset_ids: [index + 1, index + 101],
    }))

    const result = await materializer.materializeBindings(references)

    expect(result).toHaveLength(9)
    expect(uploads).toHaveLength(9)
    expect(result.map(item => item.url)).toEqual(Array.from({ length: 9 }, (_, index) => `/api/assets/media/reference-${index + 1}.png`))
    expect(result.map(({ url: _url, ...item }) => item)).toEqual(references.map(({ url: _url, ...item }) => item))
    expect(references[0].url).toBe(`${PIXEL}#1`)
  })

  test('passes through HTTPS and local media URLs without fetching or uploading', async () => {
    let calls = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => { calls += 1; return new Blob() },
      uploadImage: async () => { calls += 1; return '/unexpected' },
    })
    const references = [
      { type: 'image' as const, url: 'https://cdn.example/a.png', reference_index: 1, reference_id: 'a', reference_role: 'general' as const },
      { type: 'image' as const, url: '/api/assets/media/a.png', reference_index: 2, reference_id: 'b', reference_role: 'general' as const },
      { type: 'image' as const, url: '/api/files/legacy.png', reference_index: 3, reference_id: 'c', reference_role: 'general' as const },
    ]
    expect(await materializer.materializeBindings(references)).toEqual(references)
    expect(calls).toBe(0)
  })

  test('coalesces concurrent duplicate materializations and reuses the settled cache', async () => {
    let uploads = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['pixel'], { type: 'image/png' }),
      uploadImage: async () => { uploads += 1; return '/api/assets/media/shared.png' },
    })
    const binding = { type: 'image' as const, url: PIXEL, reference_index: 1, reference_id: 'same', reference_role: 'general' as const }
    const [first, second] = await Promise.all([
      materializer.materializeBindings([binding]),
      materializer.materializeBindings([binding]),
    ])
    const third = await materializer.materializeBindings([binding])
    expect(uploads).toBe(1)
    expect(first[0].url).toBe('/api/assets/media/shared.png')
    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  test('materializes a Blob URL through the same image upload path', async () => {
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async url => {
        expect(url).toBe('blob:https://mangaforge.local/reference')
        return new Blob(['pixel'], { type: 'image/webp' })
      },
      uploadImage: async (_blob, filename) => `/api/assets/media/${filename}`,
    })
    expect(await materializer.materializeUrl('blob:https://mangaforge.local/reference', 4))
      .toBe('/api/assets/media/reference-4.webp')
  })

  test('fails closed with a typed error for a non-image fetched Blob', async () => {
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['bad'], { type: 'text/plain' }),
      uploadImage: async () => '/unexpected',
    })
    const operation = materializer.materializeUrl(PIXEL, 1)
    await expect(operation).rejects.toBeInstanceOf(GenerateNodeReferenceMediaError)
    await expect(operation).rejects.toMatchObject({ code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED' })
  })

  test('propagates upload failure as a typed failure and never returns the original Data URL', async () => {
    let uploads = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['pixel'], { type: 'image/png' }),
      uploadImage: async () => {
        uploads += 1
        throw new Error('upload unavailable')
      },
    })
    const binding = { type: 'image' as const, url: PIXEL, reference_index: 1 }
    const operation = materializer.materializeBindings([binding])
    await expect(operation).rejects.toMatchObject({
      code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED',
      referenceIndex: 1,
    })
    expect(uploads).toBe(1)
    expect(binding.url).toBe(PIXEL)
  })

  test('clears a failed pending operation so a later retry can upload', async () => {
    let attempts = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['pixel'], { type: 'image/png' }),
      uploadImage: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('temporary upload failure')
        return '/api/assets/media/retried.png'
      },
    })
    await expect(materializer.materializeUrl(PIXEL, 1)).rejects.toMatchObject({
      code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED',
    })
    expect(await materializer.materializeUrl(PIXEL, 1)).toBe('/api/assets/media/retried.png')
    expect(attempts).toBe(2)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd ui/web && bun test src/components/nodes/generate-node-reference-media.test.ts
```

Expected: FAIL because `./generate-node-reference-media` does not exist.

- [ ] **Step 3: Commit the failing specification**

```bash
git add ui/web/src/components/nodes/generate-node-reference-media.test.ts
git commit -m "test: specify GenerateNode reference materialization"
```

### Task 2: Implement the focused materializer

**Files:**
- Create: `ui/web/src/components/nodes/generate-node-reference-media.ts`
- Test: `ui/web/src/components/nodes/generate-node-reference-media.test.ts`

- [ ] **Step 1: Implement the minimal dependency-injected materializer**

Create a module that exports:

```ts
export type MaterializableReferenceBinding = {
  type: string
  url?: string
  reference_index?: number
}

export class GenerateNodeReferenceMediaError extends Error {
  readonly code = 'REFERENCE_MEDIA_MATERIALIZATION_FAILED'
  readonly referenceIndex?: number
  constructor(message: string, referenceIndex?: number, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GenerateNodeReferenceMediaError'
    this.referenceIndex = referenceIndex
  }
}

export function isGenerateNodeMaterializableImageUrl(value: unknown) {
  return typeof value === 'string' && (/^data:image\//i.test(value) || /^blob:/i.test(value))
}

function extensionForMime(mime: string) {
  const normalized = mime.toLowerCase()
  if (normalized === 'image/jpeg') return 'jpg'
  if (normalized === 'image/webp') return 'webp'
  if (normalized === 'image/gif') return 'gif'
  return 'png'
}

export function createGenerateNodeReferenceMediaMaterializer(deps: {
  fetchBlob: (url: string) => Promise<Blob>
  uploadImage: (blob: Blob, filename: string) => Promise<string>
}) {
  const cache = new Map<string, string>()
  const pending = new Map<string, Promise<string>>()

  const materializeUrl = async (url: string, referenceIndex?: number): Promise<string> => {
    if (!isGenerateNodeMaterializableImageUrl(url)) return url
    const cached = cache.get(url)
    if (cached) return cached
    const existing = pending.get(url)
    if (existing) return existing
    const operation = Promise.resolve().then(async () => {
      try {
        const blob = await deps.fetchBlob(url)
        if (!blob.type.toLowerCase().startsWith('image/')) {
          throw new Error(`Reference media must be an image, received ${blob.type || 'unknown'}`)
        }
        const filename = `reference-${referenceIndex || 1}.${extensionForMime(blob.type)}`
        const result = await deps.uploadImage(blob, filename)
        if (!/^\/api\/assets\/media\//.test(result)) throw new Error('Image upload did not return a short workspace media URL')
        cache.set(url, result)
        return result
      } catch (error) {
        if (error instanceof GenerateNodeReferenceMediaError) throw error
        throw new GenerateNodeReferenceMediaError(`Unable to materialize reference image ${referenceIndex || ''}`.trim(), referenceIndex, { cause: error })
      }
    })
    pending.set(url, operation)
    void operation.then(
      () => { if (pending.get(url) === operation) pending.delete(url) },
      () => { if (pending.get(url) === operation) pending.delete(url) },
    )
    return operation
  }

  const materializeBindings = async <T extends MaterializableReferenceBinding>(bindings: readonly T[]): Promise<T[]> => (
    Promise.all(bindings.map(async binding => {
      if (binding.type !== 'image' || !binding.url) return { ...binding }
      const url = await materializeUrl(binding.url, binding.reference_index)
      return { ...binding, url }
    }))
  )

  return { materializeUrl, materializeBindings }
}
```

- [ ] **Step 2: Run the focused suite and verify GREEN**

Run:

```bash
cd ui/web && bun test src/components/nodes/generate-node-reference-media.test.ts
```

Expected: 7 tests pass with zero failures.

- [ ] **Step 3: Commit the materializer**

```bash
git add ui/web/src/components/nodes/generate-node-reference-media.ts
git commit -m "feat: materialize GenerateNode reference images"
```

### Task 3: Wire preview, Chat run, formal generation, and asset saving

**Files:**
- Modify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Modify: `ui/web/src/components/nodes/generateNode.test.ts`

- [ ] **Step 1: Add failing wiring and asset-persistence assertions**

Extend `generateNode.test.ts` to require one materializer instance and its use before all three request paths and saving:

```ts
test('materializes reference images before preview, Chat compilation, formal generation, and image asset saving', () => {
  const source = readFileSync(join(import.meta.dir, 'GenerateNode.tsx'), 'utf8')
  expect(source).toContain('createGenerateNodeReferenceMediaMaterializer')
  expect(source).toContain('referenceMediaMaterializerRef')
  expect(source).toContain('materializeExecutionReferenceBindings')
  expect(source).toContain('GenerateNodeReferenceMediaError')
  expect(source.match(/await materializeExecutionReferenceBindings\(/g)?.length).toBe(3)
  expect(source).toContain('await materializeGeneratedImageContent(String(result.content))')

  const previewSource = source.slice(source.indexOf('const handleSkillPreview ='), source.indexOf('const buildPayload ='))
  expect(previewSource.indexOf('await materializeExecutionReferenceBindings(')).toBeLessThan(previewSource.indexOf('compileSkillPreview(buildGenerateNodeSkillCompileRequest({'))
  expect(previewSource.indexOf('skillPreviewRequestTrackerRef.current.isCurrent')).toBeLessThan(previewSource.indexOf('compileSkillPreview(buildGenerateNodeSkillCompileRequest({'))

  const runSource = source.slice(source.indexOf('const handleRun = async () => {'), source.indexOf('useEffect(() => {', source.indexOf('const handleRun = async () => {')))
  const chatStart = runSource.indexOf('if (isChatSkillCompileOnly) {')
  const formalStart = runSource.indexOf('if (!selectedKey || !selectedModel)')
  const chatSource = runSource.slice(chatStart, formalStart)
  const formalSource = runSource.slice(formalStart)
  expect(chatSource.indexOf('await materializeExecutionReferenceBindings(')).toBeLessThan(chatSource.indexOf('runGenerateNodeChatSkillCompilation({'))
  expect(formalSource.indexOf('await materializeExecutionReferenceBindings(')).toBeLessThan(formalSource.indexOf("url: '/generate'"))

  const saveSource = source.slice(source.indexOf('const handleSaveToAsset ='), source.indexOf('const commitReferenceBindings ='))
  expect(saveSource.indexOf('await materializeGeneratedImageContent(String(result.content))')).toBeLessThan(saveSource.indexOf("apiClient.post('/assets/'"))
})

test('stores a materialized image path without retaining Base64 in the asset payload', () => {
  const payload = buildGenerateNodeAssetPayload({
    resultContent: '/api/assets/media/materialized.png',
    mode: 'text_to_image',
    prompt: 'materialized',
    selectedModel: 'image-model',
    provider: 'provider',
    selectedRolePrompt: 'director',
    params: {},
    temperature: 0.7,
    aspectRatio: '1:1',
    ratioSize: '1024*1024',
  })
  expect(payload.file_path).toBe('/api/assets/media/materialized.png')
  expect(payload.data).toMatchObject({
    content: '/api/assets/media/materialized.png',
    file_path: '/api/assets/media/materialized.png',
    url: '/api/assets/media/materialized.png',
  })
  expect(payload.thumbnail).toBe('/api/assets/media/materialized.png')
  expect(JSON.stringify(payload)).not.toContain('data:image')
})
```

- [ ] **Step 2: Run the focused wiring tests and verify RED**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts -t "materializes reference images|stores a materialized image path"
```

Expected: the source-wiring test fails because GenerateNode has no materializer integration.

- [ ] **Step 3: Instantiate one browser-backed materializer per GenerateNode**

Import the new helper. Create one stable ref whose dependencies:

```ts
fetchBlob: async url => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Reference image fetch failed: ${response.status}`)
  return await response.blob()
},
uploadImage: async (blob, filename) => {
  const formData = new FormData()
  formData.append('file', blob, filename)
  const response = await apiClient.post('/assets/upload/image', formData)
  const filePath = String(response.data?.file_path || '')
  if (!filePath) throw new Error('Image upload returned no file_path')
  return normalizeGenerateNodeImageUrl(buildAssetMediaUrl(filePath))
},
```

Create the ref once inside `GenerateNodeImpl` and add the two typed helpers:

```ts
const referenceMediaMaterializerRef = useRef<ReturnType<typeof createGenerateNodeReferenceMediaMaterializer> | null>(null)
if (referenceMediaMaterializerRef.current === null) {
  referenceMediaMaterializerRef.current = createGenerateNodeReferenceMediaMaterializer({
    fetchBlob: async url => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Reference image fetch failed: ${response.status}`)
      return await response.blob()
    },
    uploadImage: async (blob, filename) => {
      const formData = new FormData()
      formData.append('file', blob, filename)
      const response = await apiClient.post('/assets/upload/image', formData)
      const filePath = String(response.data?.file_path || '')
      if (!filePath) throw new Error('Image upload returned no file_path')
      return normalizeGenerateNodeImageUrl(buildAssetMediaUrl(filePath))
    },
  })
}

const materializeExecutionReferenceBindings = async (
  bindings: readonly GenerateNodeReferenceBinding[],
): Promise<GenerateNodeReferenceBinding[]> => (
  await referenceMediaMaterializerRef.current!.materializeBindings(bindings)
)

const materializeGeneratedImageContent = async (content: string) => {
  const isDataImage = /^data:image\//i.test(content)
  const isImageOutputBlob = (mode === 'text_to_image' || mode === 'image_to_image') && /^blob:/i.test(content)
  if (!isDataImage && !isImageOutputBlob) return content
  return await referenceMediaMaterializerRef.current!.materializeUrl(content)
}
```

- [ ] **Step 4: Materialize all request paths and use the short bindings as run provenance**

In `handleSkillPreview`, replace the current preparation/compile sequence with this ordering. The tracker starts before the upload, stale input is rejected before transport, and the short bindings feed both the request and audit:

```ts
const previewAssets = prepareReferenceBindingsForExecution()
if (previewAssets === null) return
const previewRequest = skillPreviewRequestTrackerRef.current.start(compileInputFingerprint)
setSkillPreviewLoading(true)
setSkillPreviewError(null)
try {
  const materializedPreviewAssets = await materializeExecutionReferenceBindings(previewAssets)
  if (!skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) return
  const res = await compileSkillPreview(buildGenerateNodeSkillCompileRequest({
    skillName: effectiveSkillName,
    packId: effectiveSkillPackId,
    revision: effectiveSkillRevision,
    prompt,
    mode: effectiveSkillCompileMode as GenerateNodeSkillTargetMode,
    references: materializedPreviewAssets,
    nodeParams: skillNodeParams(),
    arguments: effectiveSkillArguments,
    compilerModelId: effectiveCompilerModelId,
  }))
  if (!skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) return
  const audit = normalizeGenerateNodeSkillCompileAudit({
    response: res.data,
    executionReferences: materializedPreviewAssets,
    packSource: effectiveSkill?.sourceUrl,
    compilerModelId: effectiveCompilerModelId,
  })
  setCompiledPrompt(audit.compiledPrompt)
  setCompiledNegativePrompt(audit.compiledNegativePrompt)
  setCompiledReferences(audit.compiledReferences)
  setCompiledReferenceBindings(audit.compiledReferenceBindings)
  setReferenceModeHint(audit.referenceModeHint)
  setCompiledInputHash(audit.compiledInputHash)
  setCompileWarnings(audit.compileWarnings)
  setSkillPackSource(audit.skillPackSource)
  setCompilerModelId(audit.compilerModelId)
  setSkillPreviewResult(audit.skillPreviewResult)
  setSkillPreviewCached(audit.skillPreviewCached)
  setSkillCompileEnabled(true)
  message.success(res.data.cached ? '已复用 Skill 编译缓存' : 'Skill 提示词编译完成')
} catch (error: any) {
  if (!skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) return
  const body = (error?.response?.data || {}) as Partial<CanvasSkillApiError>
  const mediaError = error instanceof GenerateNodeReferenceMediaError ? error : null
  setSkillPreviewError({
    error_code: mediaError?.code || String(body.error_code || 'SKILL_COMPILE_FAILED'),
    detail: mediaError?.message || String(body.detail || body.error || error?.message || 'Skill 编译失败'),
  })
  if (mediaError) message.error(`${mediaError.code}: ${mediaError.message}`)
} finally {
  if (skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) {
    setSkillPreviewLoading(false)
  }
}
```

In the Chat-only branch of `handleRun`, replace the current binding preparation with:

```ts
const executableReferenceBindings = prepareReferenceBindingsForExecution()
if (executableReferenceBindings === null) return
let executionReferenceBindings: GenerateNodeReferenceBinding[]
try {
  executionReferenceBindings = buildGenerateNodeCanonicalReferenceBindings(
    await materializeExecutionReferenceBindings(executableReferenceBindings),
  )
} catch (error) {
  setNodeStatus(id, 'error')
  message.error(formatGenerateNodeReferenceMediaError(error))
  return
}
const runToken = generateRunTrackerRef.current.start(executionReferenceBindings)
```

Keep passing `executionReferenceBindings` to the existing run tracker, `buildGenerateNodeSkillCompileRequest.references`, and `runGenerateNodeChatSkillCompilation.executionReferences`.

In formal generation, use the same preparation block before starting the run token:

```ts
const executableReferenceBindings = prepareReferenceBindingsForExecution()
if (executableReferenceBindings === null) return
let executionReferenceBindings: GenerateNodeReferenceBinding[]
try {
  executionReferenceBindings = buildGenerateNodeCanonicalReferenceBindings(
    await materializeExecutionReferenceBindings(executableReferenceBindings),
  )
} catch (error) {
  setNodeStatus(id, 'error')
  message.error(formatGenerateNodeReferenceMediaError(error))
  return
}
const runToken = generateRunTrackerRef.current.start(executionReferenceBindings)
```

Pass those materialized bindings to the existing `buildPayload(executionReferenceBindings)` call so provider requests, frozen result provenance, and source lineage use the same ordered URLs.

Import `GenerateNodeReferenceMediaError`. Add this formatter next to `generateNodeReferenceValidationFromError`, use it in both run branches, and return before compiler/generation transport:

```ts
function formatGenerateNodeReferenceMediaError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error || '参考图片落盘失败')
  return error instanceof GenerateNodeReferenceMediaError
    ? `${error.code}: ${detail}`
    : `REFERENCE_MEDIA_MATERIALIZATION_FAILED: ${detail}`
}
```

and do not call the compiler or generation endpoint.

- [ ] **Step 5: Materialize Base64 generated images before asset creation**

In `handleSaveToAsset`, compute the persisted content before the asset POST:

```ts
const persistedResultContent = await materializeGeneratedImageContent(String(result.content))
```

inside the existing `try`, then pass `persistedResultContent` to `buildGenerateNodeAssetPayload`. Non-image and already-short output values pass through unchanged.

Replace the current parameterless save `catch` block with this detailed failure message:

```ts
} catch (error) {
  const detail = error instanceof GenerateNodeReferenceMediaError
    ? `${error.code}: ${error.message}`
    : error instanceof Error ? error.message : String(error || '')
  message.error(detail ? `入库失败: ${detail}` : '入库失败')
}
```

- [ ] **Step 6: Run GenerateNode tests and verify GREEN**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts src/components/nodes/generate-node-reference-media.test.ts
```

Expected: both suites pass with zero failures.

- [ ] **Step 7: Commit the integration**

```bash
git add ui/web/src/components/nodes/GenerateNode.tsx ui/web/src/components/nodes/generateNode.test.ts
git commit -m "fix: materialize Skill reference media before requests"
```

### Task 4: Verify Canvas Skill integration and builds

**Files:**
- Verify: `ui/web/src/components/nodes/generate-node-reference-media.ts`
- Verify: `ui/web/src/components/nodes/GenerateNode.tsx`
- Verify: `ui/server/src/routes/skills.ts`

- [ ] **Step 1: Run the complete GenerateNode suite**

Run:

```bash
cd ui/web && bun test src/components/nodes/generateNode.test.ts
```

Expected: all GenerateNode tests pass with zero failures.

- [ ] **Step 2: Run Skill server and route suites to confirm request limits and compiler behavior remain intact**

Run:

```bash
cd ui/server && bun test src/skills src/routes/skills.test.ts src/routes/generate.test.ts src/routes/assets-media.test.ts
```

Expected: all suites pass with zero failures; the 64 KiB Skill URL limit remains unchanged.

- [ ] **Step 3: Build both applications**

Run:

```bash
bun run build:server
bun run build:web
```

Expected: both commands exit with status 0.

- [ ] **Step 4: Check repository scope and protected user files**

Run:

```bash
git diff --check
git status --short
git diff --name-only origin/main..HEAD
```

Expected: only the design, plan, new materializer/test, GenerateNode, and GenerateNode test files belong to this change. `workspace/assets.json` remains an unstaged user modification and `workspace/.mangaforge/` remains untracked.
