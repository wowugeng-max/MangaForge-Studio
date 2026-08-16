// ui/server/src/kernel/jobs/acceptance.fixture.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject, getNovelChapter, listNovelReviewsByType } from '../../novel'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from '../../novel-writing/oh-story-core/store'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

const FIXTURE = join(import.meta.dir, '..', 'codex', 'fixtures', 'fake-app-server.ts')

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'accept4-'))
  const project = await createNovelProject(ws, { title: '书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '概要' })
  await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '一', chapter_text: '第一章。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '第二章。' })
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
  for (const agent of OH_STORY_REVIEWER_AGENTS) writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  // 注意：source_url / installed_at 缺失时 loadOhStoryCoreSuite 返回 null，pack_revision 会取空串
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({
    source_url: 'https://github.com/worldwonderer/oh-story-claudecode',
    revision: 'rev-1', installed_at: '2026-08-15T00:00:00.000Z',
    skills: ['story-review'], agents_version: 25,
  }))
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
  return { ws, project, ch2 }
}

describe('phase-4 acceptance over fixture engine', () => {
  test('full review job: run → gates → auto commit → reviews row with kernel ids', async () => {
    const { ws, project, ch2 } = await seed()
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: ch2.id,
      contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
    }, {
      skipRuntimeCheck: true,
      engineArgv: [process.execPath, FIXTURE],
      engineEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_SPAWN: '1',
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: none\n处理了第1章章末钩子\n继承到下一批：猫叫伏笔',
        FAKE_AGENT_MESSAGE: '完成',
      },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].status).toBe('committed')
    expect(detail.candidates[0].pack_revision).toBe('rev-1')
    expect(detail.commits.length).toBe(1)
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    const payload = JSON.parse(reviews[0].payload)
    expect(payload.kernel_job_id).toBe(created.jobId)
    expect(payload.kernel_candidate_id).toBe(detail.candidates[0].id)
    expect(payload.kernel_artifact_id).toBeTruthy()
    expect(detail.artifacts.some((a: any) => a.id === payload.kernel_artifact_id)).toBe(true)
    expect(payload.chapter_id).toBe(ch2.id)
    expect(payload.report_text).toContain('继承到下一批')
    const spawn = JSON.parse(detail.candidates[0].metadata).spawn_evidence
    expect(spawn.subagent_threads.length).toBe(1)
    expect(spawn.subagent_threads[0].agent).toBe('story-architect')
    const gateResults = JSON.parse(detail.candidates[0].gate_results)
    expect(gateResults.find((g: any) => g.gate === 'reject_solo_fallback').ok).toBe(true)
  })

  test('solo fallback report is gated and chapter/reviews untouched', async () => {
    const { ws, project, ch2 } = await seed()
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: ch2.id,
      contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
    }, {
      skipRuntimeCheck: true,
      engineArgv: [process.execPath, FIXTURE],
      engineEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: solo (agents unavailable)\n报告',
      },
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('SOLO_FALLBACK')
    expect(detail.candidates[0].status).toBe('gated')
    expect(detail.candidates[0].error_code).toBe('SOLO_FALLBACK')
    const gateResults = JSON.parse(detail.candidates[0].gate_results)
    expect(gateResults.find((g: any) => g.gate === 'reject_solo_fallback').ok).toBe(false)
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(0)
    const chapter = await getNovelChapter(ws, ch2.id, project.id)
    expect(chapter?.chapter_text).toBe('第二章。')
  })
})
