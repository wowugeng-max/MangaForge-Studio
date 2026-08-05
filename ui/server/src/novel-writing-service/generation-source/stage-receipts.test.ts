import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, listNovelRuns } from '../../novel'
import type { NovelChapterStageArtifactRecord } from '../../novel'
import { McpError } from '../../mcp/errors'
import { validateMcpStageResponse } from './stage-response-contract'
import { createChapterStageRecorder, projectChapterTaskProvenance } from './stage-receipts'

const workspaces: string[] = []

afterEach(async () => Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true }))))

async function fixture() {
  const activeWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-stage-receipt-'))
  workspaces.push(activeWorkspace)
  const project = await createNovelProject(activeWorkspace, { title: '收据测试项目' })
  const chapter = await createNovelChapter(activeWorkspace, {
    project_id: project.id,
    chapter_no: 1,
    title: '第一章',
  })
  const provenance = {
    task_id: 'task-stage-1', project_id: project.id, chapter_id: chapter.id, source: 'model' as const,
    source_fingerprint: `sha256:${'a'.repeat(64)}`,
    authority_fingerprint: `sha256:${'c'.repeat(64)}`,
    context_version: `sha256:${'b'.repeat(64)}`,
    model_id: 217,
  }
  return { activeWorkspace, provenance }
}

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

function artifactRecord(
  patch: Partial<NovelChapterStageArtifactRecord> = {},
): NovelChapterStageArtifactRecord {
  const output_payload = patch.output_payload ?? JSON.stringify({ output: 'cached' })
  return {
    id: 41,
    task_id: 'task-stage-1',
    project_id: 1,
    chapter_id: 1,
    stage: 'quality_review',
    attempt: 2,
    status: 'success',
    input_hash: `sha256:${'d'.repeat(64)}`,
    output_hash: sha256(output_payload),
    response_contract: 'quality_review_json',
    output_payload,
    source: 'model',
    source_fingerprint: `sha256:${'a'.repeat(64)}`,
    authority_fingerprint: `sha256:${'c'.repeat(64)}`,
    context_version: `sha256:${'b'.repeat(64)}`,
    server_id: null,
    key_id: null,
    adapter_id: null,
    agent_id: null,
    model: null,
    session_id: null,
    snapshot_hash: null,
    error_code: '',
    created_at: '2026-08-05T00:00:00.000Z',
    updated_at: '2026-08-05T00:00:00.000Z',
    ...patch,
  }
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
  test('returns an exact successful artifact and appends a bounded cache-hit Run without calling the provider', async () => {
    const { activeWorkspace, provenance } = await fixture()
    let providerCalls = 0
    let observedIdentity: any
    const reusable = artifactRecord({
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      output_payload: JSON.stringify({ output: 'cached' }),
    })
    reusable.output_hash = sha256(reusable.output_payload)
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({ ...provenance, session_id: 'unrelated-active-session' }),
      artifacts: {
        findReusable: async (_workspace: string, identity: any) => {
          observedIdentity = identity
          return { ...reusable, input_hash: identity.input_hash }
        },
      },
    } as any)

    const result = await recordStage('quality_review', {
      prompt: 'same prompt', responseContract: 'quality_review_json',
    }, async () => { providerCalls += 1; return { output: 'remote' } })

    expect(result).toEqual({ output: 'cached' })
    expect(providerCalls).toBe(0)
    expect(observedIdentity).toEqual({
      task_id: provenance.task_id,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      stage: 'quality_review',
      input_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      response_contract: 'quality_review_json',
      source: 'model',
      source_fingerprint: provenance.source_fingerprint,
      authority_fingerprint: provenance.authority_fingerprint,
      context_version: provenance.context_version,
      server_id: null,
      key_id: null,
      adapter_id: null,
      agent_id: null,
      model: null,
    })
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run).toMatchObject({ status: 'success', step_name: 'quality_review' })
    expect(JSON.parse(run.output_ref!)).toEqual({
      receipt_authority: 'chapter_generation_stage_v1',
      ...provenance,
      stage: 'quality_review',
      status: 'success',
      attempt: 2,
      artifact_id: 41,
      input_hash: observedIdentity.input_hash,
      output_hash: reusable.output_hash,
      response_contract: 'quality_review_json',
      cache_hit: true,
      elapsed_ms: expect.any(Number),
    })
  })

  test('orders cache misses as artifact running, validated output, artifact success, then Run success', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const events: string[] = []
    const running = artifactRecord({
      id: 51,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      attempt: 1,
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      artifacts: {
        findReusable: async () => null,
        findLatestSuccessful: async () => null,
        begin: async (_workspace: string, identity: any) => {
          events.push('artifact_running')
          return { ...running, ...identity }
        },
        complete: async (_workspace: string, _id: number, output: any) => {
          events.push('artifact_success')
          return { ...running, status: 'success', ...output }
        },
      },
    } as any)

    const result = await recordStage('draft', {
      prompt: 'prompt', responseContract: 'draft_prose',
    }, async () => {
      events.push('validated')
      return { prose_chapters: [{ chapter_no: 1, chapter_text: '正文' }] }
    })
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    if (run.status === 'success') events.push('run_success')

    expect(result).toEqual({ prose_chapters: [{ chapter_no: 1, chapter_text: '正文' }] })
    expect(events).toEqual(['artifact_running', 'validated', 'artifact_success', 'run_success'])
  })

  test('marks uncertain MCP mutations ambiguous with only the bounded code', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const failures: any[] = []
    const running = artifactRecord({
      id: 61,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({ ...provenance, source: 'mcp' as const }),
      artifacts: {
        findReusable: async () => null,
        findLatestSuccessful: async () => null,
        begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
        fail: async (...args: any[]) => { failures.push(args); return running },
      },
    } as any)
    const providerError = Object.assign(new Error('PRIVATE_REMOTE_BODY'), { code: 'MCP_SEND_UNKNOWN' })

    await expect(recordStage('revision', {
      prompt: '修订', responseContract: 'revision_prose',
    }, async () => { throw providerError })).rejects.toBe(providerError)

    expect(failures).toEqual([[activeWorkspace, running.id, 'ambiguous', 'MCP_SEND_UNKNOWN']])
    expect(JSON.stringify(failures)).not.toContain('PRIVATE_REMOTE_BODY')
  })

  test('invalidates every mismatched identity anchor before beginning the replacement attempt', async () => {
    const mismatchFields = [
      'project_id', 'chapter_id', 'input_hash', 'response_contract', 'source',
      'source_fingerprint', 'authority_fingerprint', 'context_version',
      'server_id', 'key_id', 'adapter_id', 'agent_id', 'model',
    ] as const
    for (const [mismatchIndex, mismatchField] of mismatchFields.entries()) {
      const { activeWorkspace, provenance } = await fixture()
      const events: string[] = []
      let exactIdentity: any
      const running = artifactRecord({
        id: 70,
        project_id: provenance.project_id,
        chapter_id: provenance.chapter_id,
        status: 'running',
        output_payload: '',
        output_hash: '',
      })
      const recordStage = createChapterStageRecorder({
        activeWorkspace,
        provenance: () => provenance,
        artifacts: {
          findReusable: async (_workspace: string, identity: any) => {
            exactIdentity = identity
            return null
          },
          findLatestSuccessful: async () => artifactRecord({
            ...exactIdentity,
            id: 69,
            status: mismatchIndex % 2 === 0 ? 'success' : 'compacted',
            [mismatchField]: mismatchField === 'key_id'
              ? 999
              : mismatchField === 'project_id' || mismatchField === 'chapter_id'
                ? 999
                : mismatchField === 'source'
                  ? 'mcp'
                  : mismatchField === 'response_contract'
                    ? 'revision_prose'
                    : mismatchField.endsWith('fingerprint') || mismatchField === 'input_hash'
                      ? `sha256:${'f'.repeat(64)}`
                      : `different-${mismatchField}`,
          }),
          invalidateFrom: async (_workspace: string, id: number) => {
            events.push(`invalidate:${id}`)
            return 2
          },
          begin: async (_workspace: string, identity: any) => {
            events.push('begin')
            return { ...running, ...identity }
          },
          complete: async (_workspace: string, _id: number, output: any) => ({
            ...running,
            ...exactIdentity,
            ...output,
            status: 'success',
          }),
        },
      } as any)

      await recordStage('quality_review', {
        prompt: 'identity prompt', responseContract: 'quality_review_json',
      }, async () => ({ score: 88 }))

      expect(events, mismatchField).toEqual(['invalidate:69', 'begin'])
    }
  })

  test('hashes the exact canonical input identity and maps MCP artifact provenance fields', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const prompt = 'canonical prompt'
    const mcpProvenance = {
      ...provenance,
      source: 'mcp' as const,
      server_id: 'server-1',
      key_id: 7,
      adapter_id: 'adapter-1',
      agent_id: 'agent-1',
      model: 'model-1',
    }
    let observed: any
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => mcpProvenance,
      artifacts: {
        findReusable: async (_workspace: string, identity: any) => {
          observed = identity
          return artifactRecord({
            ...identity,
            id: 81,
            attempt: 3,
            output_payload: JSON.stringify({ output: 'cached' }),
          })
        },
      },
    } as any)

    await recordStage('revision', {
      prompt, responseContract: 'revision_prose',
    }, async () => { throw new Error('cache hit must skip callback') })

    const expectedInputIdentity = {
      task_id: mcpProvenance.task_id,
      project_id: mcpProvenance.project_id,
      chapter_id: mcpProvenance.chapter_id,
      stage: 'revision',
      prompt_hash: sha256(prompt),
      response_contract: 'revision_prose',
      source: 'mcp',
      source_fingerprint: mcpProvenance.source_fingerprint,
      authority_fingerprint: mcpProvenance.authority_fingerprint,
      context_version: mcpProvenance.context_version,
    }
    expect(observed).toEqual({
      task_id: mcpProvenance.task_id,
      project_id: mcpProvenance.project_id,
      chapter_id: mcpProvenance.chapter_id,
      stage: 'revision',
      input_hash: sha256(JSON.stringify(expectedInputIdentity)),
      response_contract: 'revision_prose',
      source: 'mcp',
      source_fingerprint: mcpProvenance.source_fingerprint,
      authority_fingerprint: mcpProvenance.authority_fingerprint,
      context_version: mcpProvenance.context_version,
      server_id: 'server-1',
      key_id: 7,
      adapter_id: 'adapter-1',
      agent_id: 'agent-1',
      model: 'model-1',
    })
  })

  test('attaches the artifact remote identity before resolving the running Run fence', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const events: string[] = []
    const attachStarted = Promise.withResolvers<void>()
    const releaseAttach = Promise.withResolvers<void>()
    const running = artifactRecord({
      id: 91,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => ({ ...provenance, source: 'mcp' as const }),
      artifacts: {
        findReusable: async () => null,
        findLatestSuccessful: async () => null,
        begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
        attachRemoteIdentity: async () => {
          events.push('artifact_attach_start')
          attachStarted.resolve()
          const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
          expect(run.output_ref).toBe('')
          await releaseAttach.promise
          events.push('artifact_attach_done')
          return { ...running, session_id: 'session-1', snapshot_hash: 'snapshot-1' }
        },
        complete: async (_workspace: string, _id: number, output: any) => ({
          ...running, status: 'success', ...output,
        }),
      },
    } as any)
    const stage = recordStage('draft', {
      prompt: 'draft', responseContract: 'draft_prose',
    }, async context => {
      await context.attachRemoteIdentity({ session_id: 'session-1', snapshot_hash: 'snapshot-1' })
      events.push('provider_poll')
      return { prose_chapters: [] }
    })

    await attachStarted.promise
    expect(events).toEqual(['artifact_attach_start'])
    releaseAttach.resolve()
    await stage

    expect(events).toEqual(['artifact_attach_start', 'artifact_attach_done', 'provider_poll'])
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(JSON.parse(run.output_ref!)).not.toHaveProperty('snapshot_hash')
  })

  test('blocks provider continuation when remote identity persistence fails', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const storageFailure = new Error('artifact storage offline')
    let providerPolls = 0
    const failures: any[] = []
    const running = artifactRecord({
      id: 101,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      artifacts: {
        findReusable: async () => null,
        findLatestSuccessful: async () => null,
        begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
        attachRemoteIdentity: async () => { throw storageFailure },
        fail: async (...args: any[]) => { failures.push(args); return running },
      },
    } as any)

    const caught: any = await recordStage('draft', {
      prompt: 'draft', responseContract: 'draft_prose',
    }, async context => {
      await context.attachRemoteIdentity({ session_id: 'session-1', snapshot_hash: 'snapshot-1' })
      providerPolls += 1
      return { prose_chapters: [] }
    }).catch(error => error)

    expect(caught).toMatchObject({ code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED' })
    expect(Object.prototype.propertyIsEnumerable.call(caught, 'cause')).toBe(false)
    expect(providerPolls).toBe(0)
    expect(failures[0]?.slice(1)).toEqual([running.id, 'failed', 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED'])
  })

  test('maps remote-cancel-unknown evidence to ambiguous and ordinary failures to failed', async () => {
    for (const variant of [
      { receipt: 'remote_cancel_unknown', expected: 'ambiguous' },
      { receipt: 'cancel_confirmed', expected: 'failed' },
    ] as const) {
      const { activeWorkspace, provenance } = await fixture()
      const failures: any[] = []
      const running = artifactRecord({
        id: 111,
        project_id: provenance.project_id,
        chapter_id: provenance.chapter_id,
        status: 'running',
        output_payload: '',
        output_hash: '',
      })
      const recordStage = createChapterStageRecorder({
        activeWorkspace,
        provenance: () => provenance,
        artifacts: {
          findReusable: async () => null,
          findLatestSuccessful: async () => null,
          begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
          fail: async (...args: any[]) => { failures.push(args); return running },
        },
      } as any)
      const providerFailure = Object.assign(new Error('PRIVATE_REMOTE_CANCEL_TEXT'), {
        code: 'MCP_SESSION_FAILED',
        details: { receipt_status: variant.receipt, remote: 'PRIVATE_REMOTE_DETAIL' },
      })

      await expect(recordStage('revision', {
        prompt: 'revision', responseContract: 'revision_prose',
      }, async () => { throw providerFailure })).rejects.toBe(providerFailure)

      expect(failures[0]?.slice(1)).toEqual([running.id, variant.expected, 'MCP_SESSION_FAILED'])
      expect(JSON.stringify(failures)).not.toContain('PRIVATE_REMOTE')
    }
  })

  test.each([
    ['direct', { receipt_status: 'send_unknown' }],
    ['nested', { details: { receipt_status: 'send_unknown', cause_code: 'MCP_SEND_UNKNOWN' } }],
  ] as const)(
    'keeps %s send-unknown evidence ambiguous when quarantine persistence changes the outer code',
    async (_location, evidence) => {
      const { activeWorkspace, provenance } = await fixture()
      const failures: any[] = []
      const running = artifactRecord({
        id: 112,
        project_id: provenance.project_id,
        chapter_id: provenance.chapter_id,
        status: 'running',
        output_payload: '',
        output_hash: '',
      })
      const recordStage = createChapterStageRecorder({
        activeWorkspace,
        provenance: () => provenance,
        artifacts: {
          findReusable: async () => null,
          findLatestSuccessful: async () => null,
          begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
          fail: async (...args: any[]) => { failures.push(args); return running },
        },
      } as any)
      const persistenceFailure = Object.assign(
        new McpError('MCP_STORE_IO_FAILED', 'quarantine write failed'),
        evidence,
      )

      await expect(recordStage('draft', {
        prompt: 'draft', responseContract: 'draft_prose',
      }, async () => { throw persistenceFailure })).rejects.toBe(persistenceFailure)

      expect(failures[0]?.slice(1)).toEqual([
        running.id, 'ambiguous', 'MCP_STORE_IO_FAILED',
      ])
      expect(JSON.stringify(failures)).not.toContain('quarantine write failed')
    },
  )

  test('does not announce Run success when artifact completion persistence fails', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const storageFailure = new Error('complete artifact failed')
    const running = artifactRecord({
      id: 121,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      artifacts: {
        findReusable: async () => null,
        findLatestSuccessful: async () => null,
        begin: async (_workspace: string, identity: any) => ({ ...running, ...identity }),
        complete: async () => { throw storageFailure },
      },
    } as any)

    const caught: any = await recordStage('draft', {
      prompt: 'draft', responseContract: 'draft_prose',
    }, async () => ({ prose_chapters: [] })).catch(error => error)

    expect(caught).toMatchObject({ code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED' })
    expect(caught.cause).toBe(storageFailure)
    expect(Object.prototype.propertyIsEnumerable.call(caught, 'cause')).toBe(false)
    const [run] = await listNovelRuns(activeWorkspace, provenance.project_id)
    expect(run.status).toBe('running')
    expect(run.output_ref).toBe('')
  })

  test('treats a corrupted exact artifact payload as a cache miss and executes a new attempt', async () => {
    const { activeWorkspace, provenance } = await fixture()
    let providerCalls = 0
    const recordStage = createChapterStageRecorder({ activeWorkspace, provenance: () => provenance })
    const execute = () => recordStage('quality_review', {
      prompt: 'same review prompt', responseContract: 'quality_review_json',
    }, async () => ({ output: `remote-${++providerCalls}` }))

    expect(await execute()).toEqual({ output: 'remote-1' })
    const db = new Database(join(activeWorkspace, 'novel.sqlite'))
    try {
      db.run(`
        UPDATE chapter_stage_artifacts
        SET output_payload = '{"corrupted":'
        WHERE task_id = ? AND stage = 'quality_review' AND status = 'success'
      `, provenance.task_id)
    } finally {
      db.close()
    }

    expect(await execute()).toEqual({ output: 'remote-2' })
    expect(providerCalls).toBe(2)
  })

  test('uses compacted artifacts only as mismatch history and never as reusable payloads', async () => {
    const { activeWorkspace, provenance } = await fixture()
    const events: string[] = []
    let exactIdentity: any
    const running = artifactRecord({
      id: 131,
      project_id: provenance.project_id,
      chapter_id: provenance.chapter_id,
      status: 'running',
      output_payload: '',
      output_hash: '',
    })
    const recordStage = createChapterStageRecorder({
      activeWorkspace,
      provenance: () => provenance,
      artifacts: {
        findReusable: async (_workspace: string, identity: any) => {
          exactIdentity = identity
          return null
        },
        findLatestSuccessful: async () => artifactRecord({
          ...exactIdentity,
          id: 130,
          status: 'compacted',
          output_payload: '',
          output_hash: `sha256:${'0'.repeat(64)}`,
        }),
        invalidateFrom: async () => { events.push('invalidated'); return 0 },
        begin: async (_workspace: string, identity: any) => {
          events.push('begin')
          return { ...running, ...identity }
        },
        complete: async (_workspace: string, _id: number, output: any) => ({
          ...running, ...exactIdentity, ...output, status: 'success',
        }),
      },
    } as any)

    expect(await recordStage('quality_review', {
      prompt: 'same review prompt', responseContract: 'quality_review_json',
    }, async () => ({ output: 'fresh' }))).toEqual({ output: 'fresh' })

    expect(events).toEqual(['begin'])
  })

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
      input_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      artifact_id: expect.any(Number),
      attempt: 1,
    })
    expect(receiptOutput).toMatchObject({
      receipt_authority: 'chapter_generation_stage_v1',
      ...provenance,
      stage: 'draft',
      status: 'success',
    })
    expect(Object.keys(receiptOutput).sort()).toEqual([
      'artifact_id', 'attempt', 'authority_fingerprint', 'cache_hit', 'chapter_id', 'context_version', 'elapsed_ms',
      'input_hash', 'model_id', 'output_hash', 'project_id', 'receipt_authority', 'response_contract', 'source',
      'source_fingerprint', 'stage', 'status', 'task_id',
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

  test('returns a stable receipt error with a non-enumerable storage cause when failure persistence is lost', async () => {
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

    expect(caught).toMatchObject({
      code: 'CHAPTER_STAGE_RECEIPT_PERSIST_FAILED',
      message: 'Chapter stage receipt persistence failed',
    })
    expect(caught).not.toBe(providerFailure)
    expect(Object.prototype.propertyIsEnumerable.call(caught, 'cause')).toBe(false)
    expect(caught.cause).toBeDefined()
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
      'artifact_id', 'attempt', 'authority_fingerprint', 'chapter_id', 'context_version', 'elapsed_ms', 'error_code',
      'input_hash', 'model_id', 'project_id', 'receipt_authority', 'response_contract', 'source',
      'source_fingerprint', 'stage', 'status', 'task_id',
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
