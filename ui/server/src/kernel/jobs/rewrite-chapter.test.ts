import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelChapter, createNovelProject, getNovelChapter } from '../../novel'
import { openDb, ensureSqliteSchema } from '../../novel/db'
import { chapterRelPath } from '../projection/naming'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail, insertKernelJob } from './repo'
import { createAndRunKernelJob, validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function stubRewrite(files: Record<string, { kind: string; text: string }>, warnings: Array<{ warning: string; rel_path: string }> = []) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'rewrite-art-'))
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

function latestVersionSource(ws: string, chapterId: number): string {
  const db = openDb(ws)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`SELECT source FROM chapter_versions WHERE chapter_id = ? ORDER BY version_no DESC LIMIT 1`).get(chapterId) as any
    return String(row?.source || '')
  } finally { db.close() }
}

async function seedRewrite() {
  const ws = mkdtempSync(join(tmpdir(), 'rewrite-ch-'))
  const project = await createNovelProject(ws, { title: '书' })
  const filled = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 1, title: '一', chapter_text: '旧稿正文',
  })
  const other = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 2, title: '二', chapter_text: '另一章旧稿',
  })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'chapter' as const, subject_id: filled.id,
    verb: 'rewrite_chapter', model_id: 9,
  }
  return { ws, project, filled, other, body }
}

describe('rewrite_chapter precheck', () => {
  test('rejects missing chapter, empty, placeholder; allows prose without outline', async () => {
    const { ws, project, body } = await seedRewrite()
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: 999999 }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NOT_FOUND')
    const empty = await createNovelChapter(ws, { project_id: project.id, chapter_no: 3, title: '三', chapter_text: '' })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: empty.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const blank = await createNovelChapter(ws, { project_id: project.id, chapter_no: 4, title: '四', chapter_text: '   ' })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: blank.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const placeholder = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 5, title: '五', chapter_text: '【占位正文】',
    })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: placeholder.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const ok = await validateCreateKernelJob(ws, { ...body, user_brief: { length_target: '自定义 1800 字' } }, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.rewrite'])
      expect(ok.briefJson).toContain('自定义 1800 字')
    }
  })
})

describe('rewrite_chapter jobs', () => {
  test('projected harvest awaits selection then manual commit writes oh_story_rewrite', async () => {
    const { ws, project, filled, other, body } = await seedRewrite()
    const rel = chapterRelPath(1, '一')
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubRewrite({ [rel]: { kind: 'chapter_text', text: '回炉新稿' } }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates[0].status).toBe('succeeded')
    const meta = JSON.parse(detail.candidates[0].metadata || '{}')
    expect(Object.prototype.hasOwnProperty.call(meta, 'adapt_unsatisfied')).toBe(false)
    expect((await getNovelChapter(ws, filled.id, project.id))?.chapter_text).toBe('旧稿正文')
    expect(latestVersionSource(ws, filled.id)).not.toBe('oh_story_rewrite')
    const committed = await commitKernelCandidate(ws, created.jobId, detail.candidates[0].id)
    expect(committed.ok).toBe(true)
    expect(getKernelJobDetail(ws, created.jobId)!.job.status).toBe('committed')
    expect((await getNovelChapter(ws, filled.id, project.id))?.chapter_text).toBe('回炉新稿')
    expect(latestVersionSource(ws, filled.id)).toBe('oh_story_rewrite')
    expect((await getNovelChapter(ws, other.id, project.id))?.chapter_text).toBe('另一章旧稿')
  })

  test('empty harvest fails CHAPTER_FILE_MISSING and leaves ledger unchanged', async () => {
    const { ws, project, filled, body } = await seedRewrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubRewrite({
        [chapterRelPath(1, '一')]: { kind: 'chapter_text', text: '  \n ' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('CHAPTER_FILE_MISSING')
    expect(detail.job.status).toBe('failed')
    expect((await getNovelChapter(ws, filled.id, project.id))?.chapter_text).toBe('旧稿正文')
  })

  test('outline warning REJECT_OUTLINE and does not rewrite prose', async () => {
    const { ws, project, filled, body } = await seedRewrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubRewrite({
        [chapterRelPath(1, '一')]: { kind: 'chapter_text', text: '不该入库' },
      }, [{ warning: 'write_outside_scope', rel_path: '大纲/细纲.md' }]) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('REJECT_OUTLINE')
    expect((await getNovelChapter(ws, filled.id, project.id))?.chapter_text).toBe('旧稿正文')
  })

  test('same subject_id is PROJECT_JOB_RUNNING; different chapter is ok', async () => {
    for (const status of ['running', 'awaiting_selection'] as const) {
      const { ws, project, filled, other, body } = await seedRewrite()
      insertKernelJob(ws, {
        id: `job-${status}`, project_id: project.id, workspace_scope: 'novel', title: '', status,
        capability: 'rewrite', subject_type: 'chapter', subject_id: filled.id, model_provider_id: '', model_id: null,
        error_code: '', error_message: '', verb: 'rewrite_chapter', verb_params: '{}', subject_key: '', brief_json: '',
      })
      const same = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
      expect(same.ok).toBe(false)
      if (!same.ok) {
        expect(same.status).toBe(409)
        expect(same.code).toBe('PROJECT_JOB_RUNNING')
      }
      const different = await validateCreateKernelJob(ws, {
        ...body, subject_id: other.id,
      }, { skipRuntimeCheck: true })
      expect(different.ok).toBe(true)
    }
  })
})
