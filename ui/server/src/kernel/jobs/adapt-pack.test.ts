import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject } from '../../novel'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { saveUserKernelContract } from '../contracts/store'
import { registerKernelRoutes } from '../../routes/kernel-routes'
import { loadVerbDefaults } from '../verbs/defaults'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail, insertKernelJob } from './repo'
import { createAndRunKernelJob, validateCreateKernelJob } from './run-job'

function routeHarness(ws: string) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerKernelRoutes(app, { getWorkspace: () => ws })
  return handlers
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function writeSkillMd(ws: string, id: string) {
  const dir = join(ws, '.mangaforge', 'writing-skill-packs', id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), '---\nname: my-style\n---\n只改语气。\n')
}

async function seedAdapt() {
  const ws = mkdtempSync(join(tmpdir(), 'adapt-pack-'))
  const project = await createNovelProject(ws, { title: '书' })
  seedStores(ws)
  writeSkillMd(ws, 'my-style')
  const body = {
    project_id: project.id, subject_type: 'pack' as const, subject_id: 0,
    verb: 'adapt_pack', model_id: 9,
    subject_key: 'my-style', verb_params: { skill_id: 'my-style' },
  }
  return { ws, project, body }
}

describe('adapt_pack precheck', () => {
  test('rejects missing, mismatched, and illegal skill_id as VERB_PARAMS_INVALID', async () => {
    const { ws, body } = await seedAdapt()
    expect(((await validateCreateKernelJob(ws, { ...body, verb_params: {} }, { skipRuntimeCheck: true })) as any).code)
      .toBe('VERB_PARAMS_INVALID')
    expect(((await validateCreateKernelJob(ws, { ...body, subject_key: 'other-style' }, { skipRuntimeCheck: true })) as any).code)
      .toBe('VERB_PARAMS_INVALID')
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_key: 'BAD ID', verb_params: { skill_id: 'BAD ID' },
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_PARAMS_INVALID')
  })

  test('rejects builtin writing skills and oh-story-core as ADAPT_TARGET_INVALID', async () => {
    const { ws, body } = await seedAdapt()
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_key: 'fiction-humanizer-zh', verb_params: { skill_id: 'fiction-humanizer-zh' },
    }, { skipRuntimeCheck: true })) as any).code).toBe('ADAPT_TARGET_INVALID')
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_key: 'oh-story-core', verb_params: { skill_id: 'oh-story-core' },
    }, { skipRuntimeCheck: true })) as any).code).toBe('ADAPT_TARGET_INVALID')
  })

  test('rejects missing SKILL.md as SKILL_NOT_FOUND', async () => {
    const { ws, body } = await seedAdapt()
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_key: 'missing-style', verb_params: { skill_id: 'missing-style' },
    }, { skipRuntimeCheck: true })) as any).code).toBe('SKILL_NOT_FOUND')
  })

  test('rejects non-pack subject_type and nonzero subject_id as SUBJECT_TYPE_MISMATCH', async () => {
    const { ws, project, body } = await seedAdapt()
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_type: 'project',
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_id: project.id,
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })

  test('rejects project_id 0 as CONTRACT_INVALID', async () => {
    const { ws, body } = await seedAdapt()
    expect(((await validateCreateKernelJob(ws, {
      ...body, project_id: 0,
    }, { skipRuntimeCheck: true })) as any).code).toBe('CONTRACT_INVALID')
  })

  test('accepts a legal installed skill and resolves adapt-pack meta', async () => {
    const { ws, body } = await seedAdapt()
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.contracts[0].id).toBe('mangaforge.adapt-pack.meta')
    expect(ok.subjectType).toBe('pack')
  })

  test('occupies workspace-wide by subject_key, not project_id', async () => {
    const { ws, body } = await seedAdapt()
    const other = await createNovelProject(ws, { title: '另一本' })
    insertKernelJob(ws, {
      id: 'job-pack', project_id: other.id, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'attachment', subject_type: 'pack', subject_id: 0, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'adapt_pack', verb_params: '{"skill_id":"my-style"}',
      subject_key: 'my-style', brief_json: '',
    })
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('PROJECT_JOB_RUNNING')
    writeSkillMd(ws, 'other-style')
    const otherOk = await validateCreateKernelJob(ws, {
      ...body, subject_key: 'other-style', verb_params: { skill_id: 'other-style' },
    }, { skipRuntimeCheck: true })
    expect(otherOk.ok).toBe(true)
  })
})

function userWriteChapterContract() {
  return {
    schema_version: 1,
    id: 'my-style.write-chapter.v1',
    pack_id: 'my-style',
    skill_name: 'write-chapter',
    variant: 'v1',
    verb: 'write_chapter',
    capability: 'rewrite',
    label: '风格写章',
    invoke: { mention: '$write-chapter', prompt: '写第 {{chapter_no}} 章。只改 {{scope_files}}。' },
    projection: { mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'user_brief'] },
    outputs: [{ artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true }],
    write_scope: ['正文/'],
    ignore: ['.story-review/'],
    gates: ['require_chapter_file', 'reject_outline_artifact'],
    commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'user_write' },
    sandbox: 'workspace-write',
    approval: 'never',
  }
}

function stubWrite(files: Record<string, { kind: string; text: string }>, warnings: Array<{ warning: string; rel_path: string }> = []) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'adapt-pack-art-'))
    const artifacts = Object.entries(files).map(([rel, spec]) => {
      const full = join(dir, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, spec.text)
      return { rel_path: rel, artifact_kind: spec.kind, sha256: 'h', byte_size: spec.text.length, copied_path: full }
    })
    input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts, warnings, lastMessage: '适配完',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

function candidateMeta(detail: NonNullable<ReturnType<typeof getKernelJobDetail>>) {
  return JSON.parse(detail.candidates[0].metadata || '{}')
}

describe('adapt_pack harvest', () => {
  test('one valid json awaits selection as contract_json and leaves write_chapter defaults', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'attachment', text: JSON.stringify(userWriteChapterContract()) },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates[0].status).toBe('succeeded')
    expect(detail.artifacts.some((a: any) => a.artifact_kind === 'contract_json')).toBe(true)
    expect(detail.commits).toEqual([])
    const defaults = JSON.parse(readFileSync(join(ws, '.mangaforge/kernel/verb-defaults.json'), 'utf8'))
    expect(defaults.write_chapter).toEqual(['oh-story-core.story-long-write.chapter'])
    const meta = candidateMeta(detail)
    expect(meta.spawn_evidence).toEqual({ subagent_threads: [], agent_hints: [] })
    expect(Array.isArray(meta.adapt_unsatisfied)).toBe(true)
    expect(meta.adapt_unsatisfied).toEqual([])
  })

  test('valid plus invalid json keeps one contract_json and records adapt_unsatisfied', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'contract_json', text: JSON.stringify(userWriteChapterContract()) },
        'contracts/rewrite_chapter.json': { kind: 'contract_json', text: '{not json}' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.artifacts.filter((a: any) => a.artifact_kind === 'contract_json')).toHaveLength(1)
    const meta = candidateMeta(detail)
    expect(meta.adapt_unsatisfied.length).toBeGreaterThan(0)
    expect(meta.adapt_unsatisfied.some((item: any) => item.rel_path === 'contracts/rewrite_chapter.json')).toBe(true)
  })

  test('only invalid json fails ADAPT_NO_VALID_CONTRACT not KIND_COUNT_BELOW_MIN', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'contract_json', text: '{not json}' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('ADAPT_NO_VALID_CONTRACT')
    expect(detail.candidates[0].status).toBe('failed')
    expect(detail.candidates[0].error_code).toBe('ADAPT_NO_VALID_CONTRACT')
    expect(detail.candidates[0].error_code).not.toBe('KIND_COUNT_BELOW_MIN')
    expect(candidateMeta(detail).adapt_unsatisfied.length).toBeGreaterThan(0)
  })

  test('zero files fails ADAPT_NO_VALID_CONTRACT not KIND_COUNT_BELOW_MIN', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({}) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('ADAPT_NO_VALID_CONTRACT')
    expect(detail.candidates[0].error_code).toBe('ADAPT_NO_VALID_CONTRACT')
    expect(detail.candidates[0].error_code).not.toBe('KIND_COUNT_BELOW_MIN')
    expect(candidateMeta(detail).adapt_unsatisfied.length).toBeGreaterThan(0)
  })

  test('builtin write_chapter id yields no contract_json', async () => {
    const { ws, body } = await seedAdapt()
    const builtin = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-long-write.chapter')!
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'contract_json', text: JSON.stringify(builtin) },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.artifacts.some((a: any) => a.artifact_kind === 'contract_json')).toBe(false)
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('ADAPT_NO_VALID_CONTRACT')
    expect(candidateMeta(detail).adapt_unsatisfied.some((item: any) => item.errors.includes('CONTRACT_BUILTIN'))).toBe(true)
  })
})

describe('adapt_pack commit', () => {
  test('persists accepted contract_json without changing write_chapter defaults', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'attachment', text: JSON.stringify(userWriteChapterContract()) },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const harvested = getKernelJobDetail(ws, created.jobId)!
    expect(harvested.job.status).toBe('awaiting_selection')
    const result = await commitKernelCandidate(ws, created.jobId, harvested.candidates[0].id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.commits[0].domain_table).toBe('kernel_contracts')
    expect(existsSync(join(ws, '.mangaforge/kernel/contracts/my-style.write-chapter.v1.json'))).toBe(true)
    expect(loadVerbDefaults(ws).write_chapter).toEqual(['oh-story-core.story-long-write.chapter'])
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.commits[0].domain_table).toBe('kernel_contracts')
    expect(await commitKernelCandidate(ws, created.jobId, harvested.candidates[0].id)).toMatchObject({
      ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED',
    })
  })

  test('mixed harvest commit writes only the valid contract file', async () => {
    const { ws, body } = await seedAdapt()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        'contracts/write_chapter.json': { kind: 'contract_json', text: JSON.stringify(userWriteChapterContract()) },
        'contracts/rewrite_chapter.json': { kind: 'contract_json', text: '{not json}' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const harvested = getKernelJobDetail(ws, created.jobId)!
    const result = await commitKernelCandidate(ws, created.jobId, harvested.candidates[0].id)
    expect(result.ok).toBe(true)
    expect(existsSync(join(ws, '.mangaforge/kernel/contracts/my-style.write-chapter.v1.json'))).toBe(true)
    const userFiles = readdirSync(join(ws, '.mangaforge/kernel/contracts')).filter(name => name.startsWith('my-style.'))
    expect(userFiles).toEqual(['my-style.write-chapter.v1.json'])
  })
})

describe('adapt_pack verb-defaults binding', () => {
  test('PUT write_chapter default is resolved by validateCreateKernelJob without contract_ids', async () => {
    const { ws, project } = await seedAdapt()
    expect(saveUserKernelContract(ws, userWriteChapterContract()).ok).toBe(true)
    const handlers = routeHarness(ws)
    const put = await callRoute(handlers.get('PUT /api/kernel/verb-defaults'), {
      body: { write_chapter: ['my-style.write-chapter.v1'] },
    })
    expect(put.statusCode).toBe(200)
    expect(put.body.defaults.write_chapter).toEqual(['my-style.write-chapter.v1'])
    const chapter = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 1, title: '一', chapter_text: '',
    })
    await createNovelOutline(ws, {
      project_id: project.id, outline_type: 'chapter', title: '细纲1', summary: '细',
      raw_payload: { chapter_no: 1, kernel_rel_path: '大纲/细纲_第001章.md' },
    })
    const ok = await validateCreateKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      verb: 'write_chapter', model_id: 9,
    }, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.contracts[0].id).toBe('my-style.write-chapter.v1')
  })

  test('PUT adapt_pack user write-chapter id -> 400 CONTRACT_INVALID', async () => {
    const { ws } = await seedAdapt()
    expect(saveUserKernelContract(ws, userWriteChapterContract()).ok).toBe(true)
    const handlers = routeHarness(ws)
    const res = await callRoute(handlers.get('PUT /api/kernel/verb-defaults'), {
      body: { adapt_pack: ['my-style.write-chapter.v1'] },
    })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('CONTRACT_INVALID')
  })
})
