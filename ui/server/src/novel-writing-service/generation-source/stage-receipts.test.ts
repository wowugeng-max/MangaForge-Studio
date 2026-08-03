import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject, listNovelRuns } from '../../novel'
import { createChapterStageRecorder } from './stage-receipts'

const workspaces: string[] = []

afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

async function fixture() {
  const activeWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-stage-receipt-'))
  workspaces.push(activeWorkspace)
  const project = await createNovelProject(activeWorkspace, { title: '收据测试项目' })
  const provenance = {
    task_id: 'task-stage-1', project_id: project.id, chapter_id: 12, source: 'model' as const,
    source_fingerprint: `sha256:${'a'.repeat(64)}`,
    context_version: `sha256:${'b'.repeat(64)}`,
    model_id: 217,
  }
  return { activeWorkspace, provenance }
}

describe('chapter generation stage receipts', () => {
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
      ...provenance,
      stage: 'draft',
      response_contract: 'draft_prose',
      prompt_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
    })
    expect(receiptOutput).toMatchObject({ ...provenance, stage: 'draft', status: 'success' })
    expect(Object.keys(receiptOutput).sort()).toEqual([
      'chapter_id', 'context_version', 'elapsed_ms', 'model_id', 'project_id', 'source',
      'source_fingerprint', 'stage', 'status', 'task_id',
    ].sort())
    const serialized = JSON.stringify(run)
    for (const secret of [prompt, '机密正文', 'prompt-secret', 'sk_prompt_secret', 'sk_output_secret', 'output-secret']) {
      expect(serialized).not.toContain(secret)
    }
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
      'chapter_id', 'context_version', 'elapsed_ms', 'error_code', 'model_id', 'project_id',
      'source', 'source_fingerprint', 'stage', 'status', 'task_id',
    ].sort())
    const serialized = JSON.stringify(run)
    for (const secret of ['auth-secret', 'cookie-secret', 'sk_api_secret', '不得持久的详情', 'responseBody']) {
      expect(serialized).not.toContain(secret)
    }
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
    const untrustedProvenance = {
      ...provenance,
      task_id: 'task-'.repeat(300),
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
    expect(receiptInput.task_id.length).toBeLessThanOrEqual(512)
    expect(receiptInput.server_id.length).toBeLessThanOrEqual(512)
    expect(receiptInput).not.toHaveProperty('arbitrary_detail')
    expect(receiptInput).not.toHaveProperty('receipt_authority')
    expect(receiptOutput).not.toHaveProperty('arbitrary_detail')
    expect(receiptOutput).not.toHaveProperty('receipt_authority')
    expect(JSON.stringify(run)).not.toContain('sk_provenance_secret')
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
})
