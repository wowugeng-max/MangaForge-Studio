import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject, listNovelRuns } from '../../novel'
import { validateMcpStageResponse } from './stage-response-contract'
import { createChapterStageRecorder, projectChapterTaskProvenance } from './stage-receipts'

const workspaces: string[] = []

afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

async function fixture() {
  const activeWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-stage-receipt-'))
  workspaces.push(activeWorkspace)
  const project = await createNovelProject(activeWorkspace, { title: '收据测试项目' })
  const provenance = {
    task_id: 'task-stage-1', project_id: project.id, chapter_id: 12, source: 'model' as const,
    source_fingerprint: `sha256:${'a'.repeat(64)}`,
    authority_fingerprint: `sha256:${'c'.repeat(64)}`,
    context_version: `sha256:${'b'.repeat(64)}`,
    model_id: 217,
  }
  return { activeWorkspace, provenance }
}

function deleteStageRuns(activeWorkspace: string) {
  const db = new Database(join(activeWorkspace, 'novel.sqlite'))
  try {
    db.run("DELETE FROM runs WHERE run_type = 'chapter_generation_stage'")
  } finally {
    db.close()
  }
}

describe('chapter generation stage receipts', () => {
  test('requires both effective and authority fingerprints in projected provenance', async () => {
    const { provenance } = await fixture()

    expect(projectChapterTaskProvenance(provenance)).toEqual(provenance)
    expect(() => projectChapterTaskProvenance({
      ...provenance,
      authority_fingerprint: undefined,
    })).toThrow('Invalid chapter task provenance')
    expect(() => projectChapterTaskProvenance({
      ...provenance,
      authority_fingerprint: 'sha256:invalid',
    })).toThrow('Invalid chapter task provenance')
  })

  test('durably fails a recorded MCP stage when response validation rejects inside the operation', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const mcpProvenance = { ...provenance, source: 'mcp' as const, model_id: undefined }
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => mcpProvenance,
    })

    const caught: any = await recordStage('quality_review', {
      prompt: '审查', responseContract: 'quality_review_json',
    }, async () => validateMcpStageResponse('quality_review', 'quality_review_json', {
      content: '{}',
    })).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_STAGE_CONTRACT_INVALID' })
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run.status).toBe('failed')
    expect(JSON.parse(run.output_ref!)).toMatchObject({
      stage: 'quality_review',
      status: 'failed',
      error_code: 'MCP_STAGE_CONTRACT_INVALID',
    })
  })

  test('stores only a prompt hash and bounded provenance instead of prompt or output', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const prompt = '机密提示 Authorization: Bearer prompt-secret sk_prompt_secret'
    const output = { prose: '机密正文', apiKey: 'sk_output_secret', cookie: 'session=output-secret' }

    expect(await recordStage('draft', { prompt, responseContract: 'draft_prose' }, async () => output)).toBe(output)

    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run).toMatchObject({ run_type: 'chapter_generation_stage', step_name: 'draft', status: 'success' })
    const input = JSON.parse(run.input_ref!)
    const receiptOutput = JSON.parse(run.output_ref!)
    expect(input).toEqual({
      receipt_authority: 'chapter_generation_stage_v1',
      ...provenance,
      stage: 'draft',
      response_contract: 'draft_prose',
      prompt_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
    })
    expect(receiptOutput).toMatchObject({
      receipt_authority: 'chapter_generation_stage_v1',
      ...provenance,
      stage: 'draft',
      status: 'success',
    })
    expect(Object.keys(receiptOutput).sort()).toEqual([
      'authority_fingerprint', 'chapter_id', 'context_version', 'elapsed_ms', 'model_id', 'project_id', 'source',
      'source_fingerprint', 'stage', 'status', 'task_id', 'receipt_authority',
    ].sort())
    const serialized = JSON.stringify(run)
    for (const secret of [prompt, '机密正文', 'prompt-secret', 'sk_prompt_secret', 'sk_output_secret', 'output-secret']) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('does not return provider success when durable receipt finalization loses the run', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const providerResult = { ok: true }

    const caught: any = await recordStage('draft', {
      prompt: '正文', responseContract: 'draft_prose',
    }, async () => {
      deleteStageRuns(activeWorkspace)
      return providerResult
    }).catch(error => error)

    expect(caught).not.toBe(providerResult)
    expect(caught).toMatchObject({
      code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
      message: 'Chapter stage receipt persistence failed',
    })
  })

  test('preserves provider and durable failure-finalization errors together', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const providerFailure = Object.assign(new Error('provider secret must remain in memory'), {
      code: 'PROVIDER_SECRET_FAILURE',
    })

    const caught: any = await recordStage('quality_review', {
      prompt: '审查', responseContract: 'quality_review_json',
    }, async () => {
      deleteStageRuns(activeWorkspace)
      throw providerFailure
    }).catch(error => error)

    expect(caught).toBeInstanceOf(AggregateError)
    expect(caught.errors[0]).toBe(providerFailure)
    expect(caught.errors[1]).toMatchObject({
      code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
      message: 'Chapter stage receipt persistence failed',
    })
    expect(Object.keys(caught)).toEqual([])
  })

  test('scrubs and bounds failure diagnostics without persisting arbitrary details', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const error = Object.assign(new Error(
      `Authorization: Bearer auth-secret; Cookie: session=cookie-secret; X-Api-Key: sk_api_secret ${'x'.repeat(800)}`,
    ), {
      code: `PROVIDER_${'C'.repeat(120)}`,
      details: { responseBody: '不得持久的详情', headers: { authorization: 'auth-secret' } },
    })

    await expect(recordStage('quality_review', {
      prompt: '审查提示', responseContract: 'quality_review_json',
    }, async () => { throw error })).rejects.toBe(error)

    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    const output = JSON.parse(run.output_ref!)
    expect(run.status).toBe('failed')
    expect(output.error_code.length).toBeLessThanOrEqual(80)
    expect(run.error_message!.length).toBeLessThanOrEqual(500)
    expect(Object.keys(output).sort()).toEqual([
      'authority_fingerprint', 'chapter_id', 'context_version', 'elapsed_ms', 'error_code', 'model_id', 'project_id',
      'source', 'source_fingerprint', 'stage', 'status', 'task_id', 'receipt_authority',
    ].sort())
    const serialized = JSON.stringify(run)
    for (const secret of ['auth-secret', 'cookie-secret', 'sk_api_secret', '不得持久的详情', 'responseBody']) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('redacts optional quality repair provider detail while preserving the thrown error', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const providerFailure = new Error('PRIVATE_THROWN_REVISION_PROVIDER_MESSAGE')

    await expect(recordStage('quality_repair', {
      prompt: '只修订当前正文', responseContract: 'revision_prose',
    }, async () => { throw providerFailure })).rejects.toBe(providerFailure)

    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run).toMatchObject({
      status: 'failed',
      error_message: 'Optional quality revision unavailable',
    })
    expect(JSON.stringify(run)).not.toContain(providerFailure.message)
  })

  test('classifies optional quality repair from the raw MCP failure before scrubber projection', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const providerFailure = new Error('PRIVATE_MCP_PROVIDER_MESSAGE')
    let scrubberInput: unknown
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({ ...provenance, source: 'mcp' as const }),
      scrubError: error => {
        scrubberInput = error
        return { code: 'MCP_STAGE_FAILED', message: providerFailure.message }
      },
    })

    const caught = await recordStage('quality_repair', {
      prompt: '只修订当前正文', responseContract: 'revision_prose',
    }, async () => { throw providerFailure }).catch(error => error)

    expect(caught).toBe(providerFailure)
    expect(scrubberInput).toBe(providerFailure)
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run).toMatchObject({
      status: 'failed',
      error_message: 'Optional quality revision unavailable',
    })
    expect(JSON.parse(run.output_ref!).error_code).toBe('MCP_STAGE_FAILED')
    expect(JSON.stringify(run)).not.toContain(providerFailure.message)
  })

  test('normalizes untrusted custom scrubber output to the same bounds', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      scrubError: () => ({
        code: `CUSTOM_${'Z'.repeat(300)}`,
        message: `Bearer custom-secret sk_custom_secret ${'m'.repeat(900)}`,
        details: { leaked: 'must-not-persist' },
      } as any),
    })

    await expect(recordStage('revision', {
      prompt: '修订', responseContract: 'revision_prose',
    }, async () => { throw new Error('provider failed') })).rejects.toThrow('provider failed')

    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    const output = JSON.parse(run.output_ref!)
    expect(output.error_code.length).toBeLessThanOrEqual(80)
    expect(run.error_message!.length).toBeLessThanOrEqual(500)
    expect(JSON.stringify(run)).not.toContain('custom-secret')
    expect(JSON.stringify(run)).not.toContain('sk_custom_secret')
    expect(JSON.stringify(run)).not.toContain('must-not-persist')
  })

  test('does not invoke accessors returned by an untrusted custom scrubber', async () => {
    const { activeWorkspace, provenance } = await fixture()
    let getterCalls = 0
    const scrubbed = Object.defineProperties({}, {
      code: { get() { getterCalls += 1; throw new Error('untrusted code getter') } },
      message: { get() { getterCalls += 1; throw new Error('untrusted message getter') } },
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      scrubError: () => scrubbed as any,
    })
    const providerError = new Error('safe provider failure')

    await expect(recordStage('manual_recheck', {
      prompt: '复检', responseContract: 'quality_review_json',
    }, async () => { throw providerError })).rejects.toBe(providerError)

    expect(getterCalls).toBe(0)
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run.status).toBe('failed')
    expect(JSON.parse(run.output_ref!).error_code).toBe('CHAPTER_STAGE_FAILED')
  })

  test('projects and bounds provenance instead of persisting excess runtime fields', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const exactTaskId = 'task-sk-ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGH'
    const untrustedProvenance = {
      ...provenance,
      task_id: exactTaskId,
      server_id: 'server-'.repeat(300),
      arbitrary_detail: 'sk_provenance_secret',
      receipt_authority: 'mcp_generation_source_v1',
    }
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => untrustedProvenance as any,
    })

    await recordStage('story_state_sync', {
      prompt: '状态', responseContract: 'story_state_json',
    }, async () => ({ ok: true }))

    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    const receiptInput = JSON.parse(run.input_ref!)
    const receiptOutput = JSON.parse(run.output_ref!)
    expect(receiptInput.task_id).toBe(exactTaskId)
    expect(receiptOutput.task_id).toBe(exactTaskId)
    expect(receiptInput.server_id.length).toBeLessThanOrEqual(512)
    expect(receiptInput).not.toHaveProperty('arbitrary_detail')
    expect(receiptInput.receipt_authority).toBe('chapter_generation_stage_v1')
    expect(receiptOutput).not.toHaveProperty('arbitrary_detail')
    expect(receiptOutput.receipt_authority).toBe('chapter_generation_stage_v1')
    expect(JSON.stringify(run)).not.toContain('sk_provenance_secret')
  })

  test('rejects oversized task identity before appending a run or invoking the operation', async () => {
    const { activeWorkspace, provenance } = await fixture()
    let operationCalls = 0
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({ ...provenance, task_id: 't'.repeat(513) }),
    })

    await expect(recordStage('draft', {
      prompt: '正文', responseContract: 'draft_prose',
    }, async () => { operationCalls += 1; return { ok: true } })).rejects.toThrow(
      'Invalid chapter task provenance',
    )

    expect(operationCalls).toBe(0)
    expect(await listNovelRuns(activeWorkspace, provenance.project_id)).toEqual([])
  })

  test('does not coerce hostile scrubber data values or leave the durable run running', async () => {
    const { activeWorkspace, provenance } = await fixture()
    let coercions = 0
    const hostileValue = {
      toString() { coercions += 1; throw new Error('hostile toString') },
    }
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      scrubError: () => ({ code: hostileValue, message: hostileValue } as any),
    })
    const providerError = new Error('original provider failure')

    await expect(recordStage('editor_report', {
      prompt: '编辑报告', responseContract: 'editor_report_json',
    }, async () => { throw providerError })).rejects.toBe(providerError)

    expect(coercions).toBe(0)
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run.status).toBe('failed')
    expect(run.error_message).toBe('Chapter stage failed')
    expect(JSON.parse(run.output_ref!).error_code).toBe('CHAPTER_STAGE_FAILED')
  })

  test('scrubs hyphenated API keys across default, custom, and provenance diagnostics', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const defaultKey = 'sk-proj-ABC123SECRET'
    const customKey = 'sk-live-LIVE123456SECRET'
    const provenanceKey = 'sk-GENERIC1234567890'
    const genericAlphabeticKey = 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGH'
    const internalHyphenKey = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
    const defaultRecorder = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
    })
    await expect(defaultRecorder('quality_recheck', {
      prompt: '复审', responseContract: 'quality_review_json',
    }, async () => { throw new Error(`provider ${defaultKey} ${genericAlphabeticKey} ${internalHyphenKey} sk-scheduler sk-scheduler-configuration transport-safe-path`) }))
      .rejects.toThrow(defaultKey)

    const customRecorder = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      scrubError: () => ({ code: 'PROVIDER_FAILED', message: `custom ${customKey} ${internalHyphenKey} retry-safe-path` }),
    })
    await expect(customRecorder('revision', {
      prompt: '修复', responseContract: 'revision_prose',
    }, async () => { throw new Error('custom failure') })).rejects.toThrow('custom failure')

    const provenanceRecorder = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({
        ...provenance,
        server_id: `provider ${provenanceKey} ${internalHyphenKey} task-step-name`,
      }),
    })
    await expect(provenanceRecorder('post_revision_review', {
      prompt: '修订后审查', responseContract: 'quality_review_json',
    }, async () => { throw new Error('provenance failure') })).rejects.toThrow('provenance failure')

    const serialized = JSON.stringify(await listNovelRuns(activeWorkspace, provenance.project_id))
    for (const secret of [defaultKey, customKey, provenanceKey, genericAlphabeticKey, internalHyphenKey]) {
      expect(serialized).not.toContain(secret)
    }
    for (const normalText of [
      'sk-scheduler', 'sk-scheduler-configuration',
      'transport-safe-path', 'retry-safe-path', 'task-step-name',
    ]) {
      expect(serialized).toContain(normalText)
    }
  })
})
