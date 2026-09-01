// ui/server/src/kernel/jobs/write-chapter.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject, getNovelChapter } from '../../novel'
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
    const dir = mkdtempSync(join(tmpdir(), 'write-art-'))
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

function stubRewrite(files: Record<string, { kind: string; text: string }>) {
  return stubWrite(files)
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

async function seedWrite() {
  const ws = mkdtempSync(join(tmpdir(), 'write-ch-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter2 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 2, title: '二', chapter_text: '旧正文',
  })
  const empty = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 1, title: '一', chapter_text: '',
  })
  await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲1', summary: '细',
    raw_payload: { chapter_no: 1, kernel_rel_path: '大纲/细纲_第001章.md' },
  })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'chapter' as const, subject_id: empty.id,
    verb: 'write_chapter', model_id: 9,
  }
  return { ws, project, chapter2, empty, body }
}

describe('write_chapter / rewrite chapter_text collapse', () => {
  test('deslop keeps currentRel chapter_text and ignores the extra hit', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'write-ch-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 2, title: '二', chapter_text: '旧正文',
    })
    seedStores(ws)
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      verb: 'deslop_chapter', model_id: 9,
    }, {
      skipRuntimeCheck: true,
      candidateRunner: stubRewrite({
        '正文/第002章_二.md': { kind: 'chapter_text', text: '投影这份' },
        '正文/第002章_另一标题.md': { kind: 'chapter_text', text: '不该入库' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const updated = await getNovelChapter(ws, chapter.id, project.id)
    expect(updated?.chapter_text).toBe('投影这份')
  })
})

describe('write_chapter jobs', () => {
  test('projected chapter_text auto-commits with oh_story_write and leaves other chapters', async () => {
    const { ws, project, chapter2, empty, body } = await seedWrite()
    const rel = chapterRelPath(1, '一')
    expect(rel).toBe('正文/第001章_一.md')
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [rel]: { kind: 'chapter_text', text: '初稿正文' },
        ...trackingFiles([1]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('初稿正文')
    expect(latestVersionSource(ws, empty.id)).toBe('oh_story_write')
    const other = await getNovelChapter(ws, chapter2.id, project.id)
    expect(other?.chapter_text).toBe('旧正文')
  })

  test('chapter_text without tracking json fails TRACKING_MISSING and leaves ledger empty', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(1, '一')]: { kind: 'chapter_text', text: '初稿正文' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('TRACKING_MISSING')
    expect(detail.job.status).toBe('failed')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('')
  })

  test('empty harvest fails CHAPTER_FILE_MISSING and leaves ledger empty', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(1, '一')]: { kind: 'chapter_text', text: '  \n ' },
        ...trackingFiles([1]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('CHAPTER_FILE_MISSING')
    expect(detail.job.status).toBe('failed')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('')
    expect(latestVersionSource(ws, empty.id)).toBe('')
  })

  test('outline warning REJECT_OUTLINE and does not write prose', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [chapterRelPath(1, '一')]: { kind: 'chapter_text', text: '不该入库' },
        ...trackingFiles([1]),
      }, [{ warning: 'write_outside_scope', rel_path: '大纲/细纲.md' }]) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('REJECT_OUTLINE')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('')
  })

  test('single non-projected chapter_text still auto-commits', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        '正文/第001章_新标题.md': { kind: 'chapter_text', text: '新标题这份' },
        ...trackingFiles([1]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('新标题这份')
  })

  test('projected chapter_text wins and extra hit becomes attachment', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const rel = chapterRelPath(1, '一')
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        [rel]: { kind: 'chapter_text', text: 'A' },
        '正文/第001章_另一标题.md': { kind: 'chapter_text', text: 'B' },
        ...trackingFiles([1]),
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('A')
    const extra = (detail.artifacts as any[]).find(a => a.rel_path === '正文/第001章_另一标题.md')
    expect(extra?.artifact_kind).toBe('attachment')
  })

  test('two non-projected chapter_text files fail OUTPUT_MISSING', async () => {
    const { ws, project, empty, body } = await seedWrite()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubWrite({
        '正文/第001章_甲.md': { kind: 'chapter_text', text: '甲' },
        '正文/第001章_乙.md': { kind: 'chapter_text', text: '乙' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].status).toBe('failed')
    expect(detail.candidates[0].error_code).toBe('OUTPUT_MISSING')
    const updated = await getNovelChapter(ws, empty.id, project.id)
    expect(updated?.chapter_text).toBe('')
  })

  test('same subject_id is PROJECT_JOB_RUNNING; different chapter is ok', async () => {
    const { ws, project, empty, body } = await seedWrite()
    insertKernelJob(ws, {
      id: 'job-run', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'rewrite', subject_type: 'chapter', subject_id: empty.id, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'write_chapter', verb_params: '{}', subject_key: '', brief_json: '',
    })
    const same = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(same.ok).toBe(false)
    if (!same.ok) {
      expect(same.status).toBe(409)
      expect(same.code).toBe('PROJECT_JOB_RUNNING')
    }
    const other = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 4, title: '四', chapter_text: '【占位正文】',
    })
    await createNovelOutline(ws, {
      project_id: project.id, outline_type: 'chapter', title: '细纲4', summary: '细',
      raw_payload: { chapter_no: 4, kernel_rel_path: '大纲/细纲_第004章.md' },
    })
    const different = await validateCreateKernelJob(ws, {
      ...body, subject_id: other.id,
    }, { skipRuntimeCheck: true })
    expect(different.ok).toBe(true)
  })
})
