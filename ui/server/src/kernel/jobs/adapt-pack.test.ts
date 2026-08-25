import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import { insertKernelJob } from './repo'
import { validateCreateKernelJob } from './run-job'

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
