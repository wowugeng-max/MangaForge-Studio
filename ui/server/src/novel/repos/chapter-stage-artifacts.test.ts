import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '..'
import { tempWorkspace, workspaces } from '../test-utils'
import type { NovelChapterStageArtifactIdentity } from '../types'
import {
  CHAPTER_STAGE_ARTIFACT_MAX_FIELDS,
  CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS,
  CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES,
  attachChapterStageRemoteIdentity,
  beginChapterStageArtifact,
  compactChapterTaskArtifacts,
  completeChapterStageArtifact,
  failChapterStageArtifact,
  findLatestSuccessfulChapterStageArtifact,
  findReusableChapterStageArtifact,
  invalidateChapterStageArtifactsFrom,
  serializeBoundedChapterStageArtifact,
} from './chapter-stage-artifacts'

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})

function fingerprint(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

async function fixture() {
  const workspace = await tempWorkspace()
  const project = await createNovelProject(workspace, { title: 'artifact project' })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 1,
    title: 'artifact chapter',
  })
  return { workspace, project, chapter }
}

function identity(
  fixture: Awaited<ReturnType<typeof fixture>>,
  patch: Partial<NovelChapterStageArtifactIdentity> = {},
): NovelChapterStageArtifactIdentity {
  return {
    task_id: 'task-artifact-1',
    project_id: fixture.project.id,
    chapter_id: fixture.chapter.id,
    stage: 'draft',
    input_hash: fingerprint('input-a'),
    response_contract: 'draft_prose',
    source: 'mcp',
    source_fingerprint: fingerprint('source-a'),
    authority_fingerprint: fingerprint('authority-a'),
    context_version: fingerprint('context-a'),
    server_id: 'server-a',
    key_id: 7,
    adapter_id: 'generic',
    agent_id: 'agent-a',
    model: 'model-a',
    ...patch,
  }
}

async function successfulArtifact(
  fixture: Awaited<ReturnType<typeof fixture>>,
  value: NovelChapterStageArtifactIdentity,
  output: unknown = { output: value.stage },
) {
  const running = await beginChapterStageArtifact(fixture.workspace, value)
  const payload = serializeBoundedChapterStageArtifact(output)
  return completeChapterStageArtifact(fixture.workspace, running.id, {
    output_payload: payload,
    output_hash: fingerprint(payload),
    session_id: `session-${running.id}`,
    snapshot_hash: fingerprint(`snapshot-${running.id}`),
  })
}

function rawArtifact(workspace: string, id: number) {
  const db = new Database(join(workspace, 'novel.sqlite'))
  try {
    return db.query('SELECT * FROM chapter_stage_artifacts WHERE id = ?').get(id) as any
  } finally {
    db.close()
  }
}

function artifactCount(workspace: string) {
  const db = new Database(join(workspace, 'novel.sqlite'))
  try {
    return Number((db.query('SELECT COUNT(*) AS count FROM chapter_stage_artifacts').get() as any)?.count || 0)
  } finally {
    db.close()
  }
}

describe('chapter stage artifacts', () => {
  test('accepts material repair identities', async () => {
    const current = await fixture()

    await expect(beginChapterStageArtifact(current.workspace, identity(current, {
      stage: 'material_repair',
      response_contract: 'material_repair_json',
    }))).resolves.toMatchObject({
      stage: 'material_repair',
      response_contract: 'material_repair_json',
    })
  })

  test('allocates unique attempts transactionally and enforces chapter project scope', async () => {
    const current = await fixture()
    const attempts = await Promise.all(Array.from({ length: 8 }, () => (
      beginChapterStageArtifact(current.workspace, identity(current))
    )))
    expect(attempts.map(item => item.attempt).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])

    const otherProject = await createNovelProject(current.workspace, { title: 'other project' })
    await expect(beginChapterStageArtifact(current.workspace, identity(current, {
      project_id: otherProject.id,
    }))).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_SCOPE_INVALID' })
    await expect(beginChapterStageArtifact(current.workspace, identity(current, {
      task_id: 'x'.repeat(513),
    }))).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })
    await expect(beginChapterStageArtifact(current.workspace, identity(current, {
      input_hash: `sha256:${'A'.repeat(64)}`,
    }))).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })
  })

  test('projects identity from own data fields without invoking accessors, inherited values, or Proxy traps', async () => {
    const current = await fixture()
    const base = identity(current)
    let getterCalls = 0
    const accessor = { ...base }
    Object.defineProperty(accessor, 'task_id', {
      enumerable: true,
      get() {
        getterCalls += 1
        return base.task_id
      },
    })
    await expect(beginChapterStageArtifact(current.workspace, accessor as any))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })
    expect(getterCalls).toBe(0)

    const inherited = Object.create(base)
    await expect(beginChapterStageArtifact(current.workspace, inherited))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })

    let proxyTraps = 0
    const proxy = new Proxy(base, {
      get() {
        proxyTraps += 1
        throw new Error('identity Proxy trap must not run')
      },
    })
    await expect(beginChapterStageArtifact(current.workspace, proxy))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })
    expect(proxyTraps).toBe(0)
    expect(artifactCount(current.workspace)).toBe(0)
  })

  test('reuses only success with every complete identity field matching exactly', async () => {
    const current = await fixture()
    const exactIdentity = identity(current)
    const running = await beginChapterStageArtifact(current.workspace, exactIdentity)
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity)).toBeNull()
    const payload = serializeBoundedChapterStageArtifact({ output: 'validated prose' })
    const success = await completeChapterStageArtifact(current.workspace, running.id, {
      output_payload: payload,
      output_hash: fingerprint(payload),
      session_id: 'session-a',
      snapshot_hash: fingerprint('snapshot-a'),
    })
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity))
      .toMatchObject({ id: success.id, status: 'success', output_payload: payload })

    const alternateChapter = await createNovelChapter(current.workspace, {
      project_id: current.project.id,
      chapter_no: 2,
      title: 'alternate chapter',
    })
    const mismatches: Partial<NovelChapterStageArtifactIdentity>[] = [
      { task_id: 'task-artifact-other' },
      { project_id: current.project.id + 999 },
      { chapter_id: alternateChapter.id },
      { stage: 'quality_review' },
      { input_hash: fingerprint('input-b') },
      { response_contract: 'quality_review_json' },
      { source: 'model' },
      { source_fingerprint: fingerprint('source-b') },
      { authority_fingerprint: fingerprint('authority-b') },
      { context_version: fingerprint('context-b') },
      { server_id: 'server-b' },
      { key_id: 8 },
      { adapter_id: 'buda' },
      { agent_id: 'agent-b' },
      { model: 'model-b' },
    ]
    for (const mismatch of mismatches) {
      expect(await findReusableChapterStageArtifact(current.workspace, identity(current, mismatch)), JSON.stringify(mismatch)).toBeNull()
    }
  })

  test('rejects mismatched completion hashes and fails closed on corrupted stored output', async () => {
    const current = await fixture()
    const exactIdentity = identity(current)
    const running = await beginChapterStageArtifact(current.workspace, exactIdentity)
    const payload = serializeBoundedChapterStageArtifact({ output: 'validated' })
    await expect(completeChapterStageArtifact(current.workspace, running.id, {
      output_payload: payload,
      output_hash: fingerprint('different'),
      session_id: 'session-a',
      snapshot_hash: fingerprint('snapshot-a'),
    })).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_HASH_MISMATCH' })
    const success = await completeChapterStageArtifact(current.workspace, running.id, {
      output_payload: payload,
      output_hash: fingerprint(payload),
      session_id: 'session-a',
      snapshot_hash: fingerprint('snapshot-a'),
    })

    let db = new Database(join(current.workspace, 'novel.sqlite'))
    db.query('UPDATE chapter_stage_artifacts SET output_hash = ? WHERE id = ?').run(fingerprint('corrupt'), success.id)
    db.close()
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity)).toBeNull()

    db = new Database(join(current.workspace, 'novel.sqlite'))
    db.query('UPDATE chapter_stage_artifacts SET output_hash = ?, output_payload = ? WHERE id = ?')
      .run(fingerprint(payload), '{"output":"tampered"}', success.id)
    db.close()
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity)).toBeNull()
  })

  test('persists remote identity once and rejects invalid status transitions', async () => {
    const current = await fixture()
    const running = await beginChapterStageArtifact(current.workspace, identity(current))
    const attached = await attachChapterStageRemoteIdentity(current.workspace, running.id, {
      session_id: 'session-a',
      snapshot_hash: fingerprint('snapshot-a'),
    })
    expect(attached).toMatchObject({ status: 'running', session_id: 'session-a' })
    await expect(attachChapterStageRemoteIdentity(current.workspace, running.id, {
      session_id: 'session-b',
      snapshot_hash: fingerprint('snapshot-b'),
    })).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_INVALID_TRANSITION' })

    const failed = await failChapterStageArtifact(
      current.workspace,
      running.id,
      'ambiguous',
      'mcp_send_unknown',
    )
    expect(failed).toMatchObject({ status: 'ambiguous', error_code: 'MCP_SEND_UNKNOWN' })
    expect(failed.error_code.length).toBeLessThanOrEqual(80)
    expect(JSON.stringify(failed)).not.toContain('PRIVATE_REMOTE_BODY')
    await expect(failChapterStageArtifact(current.workspace, running.id, 'failed', 'PRIVATE_REMOTE_BODY leaked'))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_INVALID_TRANSITION' })
    await expect(completeChapterStageArtifact(current.workspace, running.id, {
      output_payload: '{}',
      output_hash: fingerprint('{}'),
      session_id: 'session-a',
      snapshot_hash: fingerprint('snapshot-a'),
    })).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_INVALID_TRANSITION' })

    const oversized = await beginChapterStageArtifact(current.workspace, identity(current, { stage: 'quality_review' }))
    await expect(attachChapterStageRemoteIdentity(current.workspace, oversized.id, {
      session_id: 's'.repeat(513),
      snapshot_hash: fingerprint('snapshot'),
    })).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID' })
  })

  test('projects completion data without invoking accessors, inherited values, or Proxy traps', async () => {
    const current = await fixture()
    const payload = serializeBoundedChapterStageArtifact({ output: 'safe' })
    const base = {
      output_payload: payload,
      output_hash: fingerprint(payload),
      session_id: 'session-a',
      snapshot_hash: 'neutral-snapshot-1',
    }
    let getterCalls = 0
    const accessor = { ...base }
    Object.defineProperty(accessor, 'output_payload', {
      enumerable: true,
      get() {
        getterCalls += 1
        return payload
      },
    })
    const accessorArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(completeChapterStageArtifact(current.workspace, accessorArtifact.id, accessor as any))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID' })
    expect(getterCalls).toBe(0)
    expect(rawArtifact(current.workspace, accessorArtifact.id).status).toBe('running')

    const inheritedArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(completeChapterStageArtifact(current.workspace, inheritedArtifact.id, Object.create(base)))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID' })
    expect(rawArtifact(current.workspace, inheritedArtifact.id).status).toBe('running')

    let proxyTraps = 0
    const proxy = new Proxy(base, {
      get() {
        proxyTraps += 1
        throw new Error('completion Proxy trap must not run')
      },
    })
    const proxyArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(completeChapterStageArtifact(current.workspace, proxyArtifact.id, proxy as any))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_PAYLOAD_INVALID' })
    expect(proxyTraps).toBe(0)
    expect(rawArtifact(current.workspace, proxyArtifact.id).status).toBe('running')
  })

  test('projects remote identity without invoking accessors, inherited values, or Proxy traps', async () => {
    const current = await fixture()
    const base = { session_id: 'session-a', snapshot_hash: 'neutral-snapshot-1' }
    let getterCalls = 0
    const accessor = { ...base }
    Object.defineProperty(accessor, 'session_id', {
      enumerable: true,
      get() {
        getterCalls += 1
        return base.session_id
      },
    })
    const accessorArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(attachChapterStageRemoteIdentity(current.workspace, accessorArtifact.id, accessor))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID' })
    expect(getterCalls).toBe(0)
    expect(rawArtifact(current.workspace, accessorArtifact.id)).toMatchObject({
      status: 'running', session_id: null, snapshot_hash: null,
    })

    const inheritedArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(attachChapterStageRemoteIdentity(current.workspace, inheritedArtifact.id, Object.create(base)))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID' })
    expect(rawArtifact(current.workspace, inheritedArtifact.id)).toMatchObject({
      status: 'running', session_id: null, snapshot_hash: null,
    })

    let proxyTraps = 0
    const proxy = new Proxy(base, {
      get() {
        proxyTraps += 1
        throw new Error('remote identity Proxy trap must not run')
      },
    })
    const proxyArtifact = await beginChapterStageArtifact(current.workspace, identity(current))
    await expect(attachChapterStageRemoteIdentity(current.workspace, proxyArtifact.id, proxy))
      .rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID' })
    expect(proxyTraps).toBe(0)
    expect(rawArtifact(current.workspace, proxyArtifact.id)).toMatchObject({
      status: 'running', session_id: null, snapshot_hash: null,
    })
  })

  test('accepts and preserves bounded opaque upstream provenance and remote identities', async () => {
    const current = await fixture()
    const upstream = identity(current, {
      server_id: ' Server / East #1 ',
      adapter_id: 'Generic Adapter (v2)',
      agent_id: 'Author Agent [primary]',
      model: 'MCP Auto',
    })
    const running = await beginChapterStageArtifact(current.workspace, upstream)
    expect(running).toMatchObject({
      server_id: ' Server / East #1 ',
      adapter_id: 'Generic Adapter (v2)',
      agent_id: 'Author Agent [primary]',
      model: 'MCP Auto',
    })
    const attached = await attachChapterStageRemoteIdentity(current.workspace, running.id, {
      session_id: ' Session / opaque #1 ',
      snapshot_hash: 'neutral-snapshot-1',
    })
    expect(attached).toMatchObject({
      session_id: ' Session / opaque #1 ',
      snapshot_hash: 'neutral-snapshot-1',
    })
    const payload = serializeBoundedChapterStageArtifact({ output: 'compatible' })
    const completed = await completeChapterStageArtifact(current.workspace, running.id, {
      output_payload: payload,
      output_hash: fingerprint(payload),
      session_id: ' Session / opaque #1 ',
      snapshot_hash: 'neutral-snapshot-1',
    })
    expect(completed.model).toBe('MCP Auto')
    expect(await findReusableChapterStageArtifact(current.workspace, upstream)).toMatchObject({ id: completed.id })

    const boundary = await beginChapterStageArtifact(current.workspace, identity(current, {
      stage: 'quality_review',
      response_contract: 'quality_review_json',
      model: 'm'.repeat(160),
    }))
    await expect(attachChapterStageRemoteIdentity(current.workspace, boundary.id, {
      session_id: 's'.repeat(160),
      snapshot_hash: 'n'.repeat(161),
    })).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_REMOTE_IDENTITY_INVALID' })
    await expect(beginChapterStageArtifact(current.workspace, identity(current, {
      stage: 'quality_repair',
      response_contract: 'revision_prose',
      model: 'm'.repeat(161),
    }))).rejects.toMatchObject({ code: 'CHAPTER_STAGE_ARTIFACT_IDENTITY_INVALID' })
  })

  test('stores only a bounded sanitized failure code', async () => {
    const current = await fixture()
    const first = await beginChapterStageArtifact(current.workspace, identity(current))
    const failed = await failChapterStageArtifact(current.workspace, first.id, 'failed', `A${'B'.repeat(120)}`)
    expect(failed.error_code).toHaveLength(80)
    expect(failed.error_code).toMatch(/^[A-Z0-9_.:-]+$/)

    const second = await beginChapterStageArtifact(current.workspace, identity(current))
    const fallback = await failChapterStageArtifact(current.workspace, second.id, 'failed', 'PRIVATE REMOTE BODY token=secret')
    expect(fallback.error_code).toBe('CHAPTER_STAGE_FAILED')
    expect(JSON.stringify(fallback)).not.toContain('secret')

    const oversized = await beginChapterStageArtifact(current.workspace, identity(current))
    const veryLarge = `${'A'.repeat(1_000_000)}!PRIVATE_REMOTE_BODY`
    const bounded = await failChapterStageArtifact(current.workspace, oversized.id, 'failed', veryLarge)
    expect(bounded.error_code).toBe('A'.repeat(80))
    expect(bounded.error_code).not.toContain('PRIVATE_REMOTE_BODY')
  })

  test('invalidates the anchor and later observed successes without hard-coded stage ordering', async () => {
    const current = await fixture()
    const first = await successfulArtifact(current, identity(current, { stage: 'quality_review', response_contract: 'quality_review_json' }))
    const anchor = await successfulArtifact(current, identity(current, { stage: 'draft' }))
    const later = await successfulArtifact(current, identity(current, { stage: 'word_target_repair', response_contract: 'word_target_prose' }))
    expect(await invalidateChapterStageArtifactsFrom(current.workspace, anchor.id)).toBe(2)
    expect(rawArtifact(current.workspace, first.id).status).toBe('success')
    expect(rawArtifact(current.workspace, anchor.id).status).toBe('invalidated')
    expect(rawArtifact(current.workspace, later.id).status).toBe('invalidated')
  })

  test('compacts only explicit successful task artifacts and never reuses cleared payloads', async () => {
    const current = await fixture()
    const exactIdentity = identity(current)
    const success = await successfulArtifact(current, exactIdentity)
    const running = await beginChapterStageArtifact(current.workspace, identity(current, { stage: 'quality_review', response_contract: 'quality_review_json' }))
    const failed = await beginChapterStageArtifact(current.workspace, identity(current, { stage: 'quality_repair', response_contract: 'revision_prose' }))
    await failChapterStageArtifact(current.workspace, failed.id, 'failed', 'PROVIDER_FAILED')

    expect(rawArtifact(current.workspace, success.id)).toMatchObject({ status: 'success' })
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity)).not.toBeNull()
    expect(await compactChapterTaskArtifacts(current.workspace, exactIdentity.task_id)).toBe(1)
    expect(rawArtifact(current.workspace, success.id)).toMatchObject({ status: 'compacted', output_payload: '' })
    expect(rawArtifact(current.workspace, running.id)).toMatchObject({ status: 'running' })
    expect(rawArtifact(current.workspace, failed.id)).toMatchObject({ status: 'failed' })
    expect(await findReusableChapterStageArtifact(current.workspace, exactIdentity)).toBeNull()
    expect(await findLatestSuccessfulChapterStageArtifact(current.workspace, exactIdentity.task_id, exactIdentity.stage))
      .toMatchObject({ id: success.id, status: 'compacted', output_hash: success.output_hash })
  })

  test('serializes plain data defensively within exact structural and UTF-8 bounds', () => {
    expect(serializeBoundedChapterStageArtifact({ z: 1, a: ['正文', true, null] }))
      .toBe('{"z":1,"a":["正文",true,null]}')
    const fixedOverhead = Buffer.byteLength('{"a":"","b":""}', 'utf8')
    const a = 'x'.repeat(CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS)
    const b = 'x'.repeat(CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES - fixedOverhead - a.length)
    const boundary = serializeBoundedChapterStageArtifact({ a, b })
    expect(Buffer.byteLength(boundary, 'utf8')).toBe(CHAPTER_STAGE_ARTIFACT_PAYLOAD_BYTES)
    expect(() => serializeBoundedChapterStageArtifact({ a, b: `${b}x` }))
      .toThrow('Chapter stage artifact payload exceeds byte limit')
    expect(() => serializeBoundedChapterStageArtifact({ a: 'é'.repeat(600_000), b: 'é'.repeat(500_000) }))
      .toThrow('Chapter stage artifact payload exceeds byte limit')
    expect(() => serializeBoundedChapterStageArtifact('x'.repeat(CHAPTER_STAGE_ARTIFACT_MAX_STRING_CHARS + 1)))
      .toThrow('Chapter stage artifact string exceeds character limit')
    expect(() => serializeBoundedChapterStageArtifact(Array(CHAPTER_STAGE_ARTIFACT_MAX_FIELDS + 1).fill(0)))
      .toThrow('Chapter stage artifact field limit exceeded')
  })

  test('omits undefined object properties like JSON.stringify (streamed provider results)', () => {
    // 回归:grok 等流式接口无 usage 块时,聚合结果带 raw.usage = undefined,
    // 曾导致修订阶段在 LLM 成功后因序列化被拒而整体失败。
    expect(serializeBoundedChapterStageArtifact({
      content: '修订稿',
      raw: { content: '修订稿', usage: undefined, stream_chunks_tail: [] },
      usage: { input_tokens: undefined, output_tokens: 5, total_tokens: 5 },
      finish_reason: 'stop',
    })).toBe(JSON.stringify({
      content: '修订稿',
      raw: { content: '修订稿', stream_chunks_tail: [] },
      usage: { output_tokens: 5, total_tokens: 5 },
      finish_reason: 'stop',
    }))
    // 数组元素与顶层 undefined 仍然拒绝
    expect(() => serializeBoundedChapterStageArtifact({ items: [undefined] })).toThrow('Chapter stage artifact value is not supported')
    expect(() => serializeBoundedChapterStageArtifact(undefined)).toThrow('Chapter stage artifact value is not supported')
    // 函数属性仍然拒绝(编程错误信号,不静默丢弃)
    expect(() => serializeBoundedChapterStageArtifact({ callback: () => 1 })).toThrow('Chapter stage artifact value is not supported')
  })

  test('rejects proxies, accessors, cycles, excessive depth, non-finite and unsupported values', () => {
    let proxyTrapRan = false
    const proxy = new Proxy({}, {
      ownKeys() {
        proxyTrapRan = true
        throw new Error('proxy trap must not run')
      },
    })
    expect(() => serializeBoundedChapterStageArtifact(proxy)).toThrow('Chapter stage artifact proxy is not supported')
    expect(proxyTrapRan).toBe(false)

    const accessor = {}
    Object.defineProperty(accessor, 'private', {
      enumerable: true,
      get() { throw new Error('getter must not run') },
    })
    expect(() => serializeBoundedChapterStageArtifact(accessor)).toThrow('Chapter stage artifact accessors are not supported')
    const cycle: any = {}
    cycle.self = cycle
    expect(() => serializeBoundedChapterStageArtifact(cycle)).toThrow('Chapter stage artifact cycle is not supported')

    let nested: any = 'leaf'
    for (let index = 0; index < 33; index += 1) nested = { nested }
    expect(() => serializeBoundedChapterStageArtifact(nested)).toThrow('Chapter stage artifact depth limit exceeded')
    for (const unsupported of [undefined, () => 1, Symbol('value'), 1n, Number.NaN, Infinity, new Date()]) {
      expect(() => serializeBoundedChapterStageArtifact(unsupported)).toThrow()
    }
  })
})
