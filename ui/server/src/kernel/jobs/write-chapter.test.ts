// ui/server/src/kernel/jobs/write-chapter.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelChapter, createNovelProject, getNovelChapter } from '../../novel'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function stubRewrite(files: Record<string, { kind: string; text: string }>) {
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
      artifacts, warnings: [], lastMessage: '改写完成',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
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
