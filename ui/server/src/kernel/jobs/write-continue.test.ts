import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  createNovelChapter,
  createNovelOutline,
  createNovelProject,
  deleteNovelChapter,
  deleteNovelOutline,
  getNovelChapter,
  updateNovelChapter,
} from '../../novel'
import { openDb, ensureSqliteSchema } from '../../novel/db'
import { chapterRelPath } from '../projection/naming'
import { getKernelJobDetail, insertKernelJob } from './repo'
import { createAndRunKernelJob, validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function stubWrite(files: Record<string, { kind: string; text: string }>, warnings: Array<{ warning: string; rel_path: string }> = []) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'write-cont-art-'))
    const artifacts = Object.entries(files).map(([rel, spec]) => {
      const full = join(dir, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, spec.text)
      return { rel_path: rel, artifact_kind: spec.kind, sha256: 'h', byte_size: spec.text.length, copied_path: full }
    })
    input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts, warnings, lastMessage: '写完',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

function trackingFiles(nos: number[]): Record<string, { kind: string; text: string }> {
  const files: Record<string, { kind: string; text: string }> = {
    '追踪/_tracking-state.json': { kind: 'tracking_doc', text: `{"last_committed_chapter":${nos[nos.length - 1]}}` },
  }
  for (const no of nos) {
    const pad = String(no).padStart(3, '0')
    files[`追踪/逐章记录/第${pad}章.md`] = { kind: 'tracking_doc', text: `# 第${pad}章\n角色状态更新` }
  }
  return files
}

function latestVersionSource(ws: string, chapterId: number): string {
  const db = openDb(ws)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`SELECT source FROM chapter_versions WHERE chapter_id = ? ORDER BY version_no DESC LIMIT 1`).get(chapterId) as any
    return String(row?.source || '')
  } finally { db.close() }
}

async function seedContinue() {
  const ws = mkdtempSync(join(tmpdir(), 'write-cont-'))
  const project = await createNovelProject(ws, { title: '书' })
  const ch1 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 1, title: '一', chapter_text: '已有正文',
  })
  const ch2 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 2, title: '二', chapter_text: '',
  })
  const ch3 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 3, title: '三', chapter_text: '',
  })
  await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲2', summary: '细',
    raw_payload: { chapter_no: 2 },
  })
  const outline3 = await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲3', summary: '细',
    raw_payload: { chapter_no: 3 },
  })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
    verb: 'write_continue', model_id: 9,
    verb_params: { from_chapter_no: 2, count: 2 },
  }
  return { ws, project, ch1, ch2, ch3, outline3, body }
}

describe('write_continue precheck', () => {
  test('rejects invalid from_chapter_no', async () => {
    const { ws, body } = await seedContinue()
    expect(((await validateCreateKernelJob(ws, {
      ...body, verb_params: { from_chapter_no: 0, count: 2 },
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_PARAMS_INVALID')
    expect(((await validateCreateKernelJob(ws, {
      ...body, verb_params: { count: 2 },
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_PARAMS_INVALID')
  })

  test('rejects chapter subject_type', async () => {
    const { ws, body, ch2 } = await seedContinue()
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_type: 'chapter', subject_id: ch2.id,
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })

  test('rejects missing window chapter', async () => {
    const { ws, body, ch3 } = await seedContinue()
    await deleteNovelChapter(ws, ch3.id)
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NOT_FOUND')
  })

  test('rejects window chapter that already has prose', async () => {
    const { ws, body, ch3 } = await seedContinue()
    await updateNovelChapter(ws, ch3.id, { chapter_text: '已有正文' })
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_HAS_PROSE')
  })

  test('rejects window chapter without matching outline', async () => {
    const { ws, body, outline3 } = await seedContinue()
    await deleteNovelOutline(ws, outline3.id)
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('OUTLINE_MISSING')
  })

  test('allows placeholder or blank chapter 2 and returns normalized verbParamsJson', async () => {
    const { ws, body, ch2 } = await seedContinue()
    await updateNovelChapter(ws, ch2.id, { chapter_text: '【占位正文】' })
    const placeholder = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(placeholder.ok).toBe(true)
    await updateNovelChapter(ws, ch2.id, { chapter_text: '   ' })
    const blank = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(blank.ok).toBe(true)
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.verbParamsJson).toContain('"count":2')
  })
})

describe('write_continue jobs', () => {
  test('projected window chapter_text auto-commits with oh_story_continue and leaves chapter 1', async () => {
    const { ws, project, ch1, ch2, ch3, body } = await seedContinue()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '续写章2' },
        [chapterRelPath(3, '三')]: { kind: 'chapter_text', text: '续写章3' },
        ...trackingFiles([2, 3]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const meta = JSON.parse(detail.candidates[0].metadata || '{}')
    expect(Object.prototype.hasOwnProperty.call(meta, 'adapt_unsatisfied')).toBe(false)
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('续写章2')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('续写章3')
    expect(latestVersionSource(ws, ch2.id)).toBe('oh_story_continue')
    expect(latestVersionSource(ws, ch3.id)).toBe('oh_story_continue')
    expect((await getNovelChapter(ws, ch1.id, project.id))?.chapter_text).toBe('已有正文')
  })

  test('only chapter 2 harvest fails and leaves window empty', async () => {
    const { ws, project, ch2, ch3, body } = await seedContinue()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '只有章2' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(['CHAPTER_FILE_MISSING', 'OUTPUT_MISSING']).toContain(detail.candidates[0].error_code)
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('')
  })

  test('empty harvest fails CHAPTER_FILE_MISSING', async () => {
    const { ws, project, ch2, ch3, body } = await seedContinue()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '  \n ' },
        [chapterRelPath(3, '三')]: { kind: 'chapter_text', text: '  \n ' },
        ...trackingFiles([2, 3]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('CHAPTER_FILE_MISSING')
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('')
  })

  test('outline warning REJECT_OUTLINE and does not write prose', async () => {
    const { ws, project, ch2, ch3, body } = await seedContinue()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '不该入库' },
        [chapterRelPath(3, '三')]: { kind: 'chapter_text', text: '不该入库' },
        ...trackingFiles([2, 3]),
      }, [{ warning: 'write_outside_scope', rel_path: '大纲/细纲.md' }]) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('REJECT_OUTLINE')
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('')
  })

  test('out-of-window chapter_text stays attachment and does not rewrite chapter 4', async () => {
    const { ws, project, ch2, ch3, body } = await seedContinue()
    const ch4 = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 4, title: '四', chapter_text: '第四章旧正文',
    })
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '续写章2' },
        [chapterRelPath(3, '三')]: { kind: 'chapter_text', text: '续写章3' },
        '正文/第004章_x.md': { kind: 'chapter_text', text: '不该入库章4' },
        ...trackingFiles([2, 3]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('续写章2')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('续写章3')
    expect((await getNovelChapter(ws, ch4.id, project.id))?.chapter_text).toBe('第四章旧正文')
    const extra = (detail.artifacts as any[]).find(a => a.rel_path === '正文/第004章_x.md')
    expect(extra?.artifact_kind).toBe('attachment')
  })

  test('window prose with only chapter 2 tracking fails TRACKING_MISSING', async () => {
    const { ws, project, ch2, ch3, body } = await seedContinue()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(2, '二')]: { kind: 'chapter_text', text: '续写章2' },
        [chapterRelPath(3, '三')]: { kind: 'chapter_text', text: '续写章3' },
        ...trackingFiles([2]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('TRACKING_MISSING')
    expect((await getNovelChapter(ws, ch2.id, project.id))?.chapter_text).toBe('')
    expect((await getNovelChapter(ws, ch3.id, project.id))?.chapter_text).toBe('')
  })

  test('same project write_continue is PROJECT_JOB_RUNNING; write_chapter outside window is ok', async () => {
    const { ws, project, body } = await seedContinue()
    insertKernelJob(ws, {
      id: 'job-run', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'rewrite', subject_type: 'project', subject_id: project.id, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'write_continue', verb_params: '{"from_chapter_no":2,"count":2}', subject_key: '', brief_json: '',
    })
    const same = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(same.ok).toBe(false)
    if (!same.ok) {
      expect(same.status).toBe(409)
      expect(same.code).toBe('PROJECT_JOB_RUNNING')
    }
    const other = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 4, title: '四', chapter_text: '',
    })
    await createNovelOutline(ws, {
      project_id: project.id, outline_type: 'chapter', title: '细纲4', summary: '细',
      raw_payload: { chapter_no: 4 },
    })
    const different = await validateCreateKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: other.id,
      verb: 'write_chapter', model_id: 9,
    }, { skipRuntimeCheck: true })
    expect(different.ok).toBe(true)
  })
})
