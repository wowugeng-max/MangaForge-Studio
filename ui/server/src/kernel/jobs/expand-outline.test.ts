// ui/server/src/kernel/jobs/expand-outline.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createNovelOutline, createNovelProject, listNovelOutlines } from '../../novel'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function stubExpand(files: Record<string, { kind: string; text: string }>) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'expand-art-'))
    const artifacts = Object.entries(files).map(([rel, spec]) => {
      const full = join(dir, rel)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, spec.text)
      return { rel_path: rel, artifact_kind: spec.kind, sha256: 'h', byte_size: spec.text.length, copied_path: full }
    })
    input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts, warnings: [], lastMessage: '扩纲完成',
      spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

async function seedExpand() {
  const ws = mkdtempSync(join(tmpdir(), 'expand-job-'))
  const project = await createNovelProject(ws, { title: '书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '已有总纲' })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
    verb: 'expand_outline', model_id: 9,
  }
  return { ws, project, body }
}

describe('expand_outline jobs', () => {
  test('single succeeded candidate waits for manual commit then upserts outline', async () => {
    const { ws, project, body } = await seedExpand()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '大纲/第003章.md': { kind: 'outline_doc', text: '# 第3章 夜谈\n目标：对质。' },
      }) as any,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates[0].status).toBe('succeeded')
    const committed = await commitKernelCandidate(ws, created.jobId, detail.candidates[0].id)
    expect(committed.ok).toBe(true)
    const outlines = await listNovelOutlines(ws, project.id)
    expect(outlines.some((row: any) => String(row.title || '').includes('夜谈') || String(row.summary || '').includes('对质'))).toBe(true)
  })

  test('writing 正文/ gates REJECT_CHAPTER_TEXT and does not commit', async () => {
    const { ws, project, body } = await seedExpand()
    const before = (await listNovelOutlines(ws, project.id)).length
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '大纲/第003章.md': { kind: 'outline_doc', text: '# 第3章\n细纲' },
        '正文/第001章.md': { kind: 'chapter_text', text: '偷写的正文' },
      }) as any,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('REJECT_CHAPTER_TEXT')
    expect(detail.job.status).toBe('failed')
    expect((await listNovelOutlines(ws, project.id)).length).toBe(before)
  })

  test('no outline_doc artifact fails KIND_COUNT_BELOW_MIN', async () => {
    const { ws, body } = await seedExpand()
    const created = await createAndRunKernelJob(ws, body, {
      skipRuntimeCheck: true,
      candidateRunner: stubExpand({
        '设定/世界观.md': { kind: 'world_doc', text: '只改设定' },
      }) as any,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].error_code).toBe('KIND_COUNT_BELOW_MIN')
    expect(detail.candidates[0].status).toBe('failed')
  })
})
