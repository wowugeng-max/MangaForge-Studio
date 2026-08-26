// ui/server/src/kernel/codex/run-candidate.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject } from '../../novel'
import { ohStoryCoreAgentsDir, ohStoryCoreRoot, OH_STORY_REVIEWER_AGENTS } from '../../novel-writing/oh-story-core/store'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { runKernelCandidate } from './run-candidate'

const FIXTURE = join(import.meta.dir, 'fixtures', 'fake-app-server.ts')
const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!

async function seedWorkspace() {
  const ws = mkdtempSync(join(tmpdir(), 'run-cand-'))
  const project = await createNovelProject(ws, { title: '测试书' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '概要' })
  const ch1 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章正文。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '第二章', chapter_text: '第二章正文。' })
  const skillDir = join(ohStoryCoreRoot(ws), 'skills', 'story-review')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: story-review\n---\n')
  mkdirSync(ohStoryCoreAgentsDir(ws), { recursive: true })
  for (const agent of OH_STORY_REVIEWER_AGENTS) writeFileSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`), `name = "${agent}"\n`)
  writeFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), JSON.stringify({ revision: 'r', skills: ['story-review'], agents_version: 25 }))
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk-test', is_active: true }]))
  return { ws, project, ch1, ch2 }
}

describe('runKernelCandidate', () => {
  test('happy path: projection, session, harvest, spawn evidence, events.jsonl', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_SPAWN: '1',
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: none\n第二章审稿正文',
        FAKE_AGENT_MESSAGE: '审稿完成',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.artifacts.some(a => a.rel_path === '审稿/第002章.md' && a.artifact_kind === 'review_report')).toBe(true)
    expect(result.lastMessage).toBe('审稿完成')
    expect(result.spawnEvidence.subagent_threads.length).toBe(1)
    expect(result.spawnEvidence.subagent_threads[0].agent).toBe('story-architect')
    expect(existsSync(result.eventsPath)).toBe(true)
    expect(readFileSync(join(result.jobDir, 'last-message.md'), 'utf8')).toBe('审稿完成')
    const eventLines = readFileSync(result.eventsPath, 'utf8').trim().split('\n')
    expect(eventLines.length).toBeGreaterThan(4)
  })

  test('skill not discovered -> SKILL_NOT_FOUND, no turn sent', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: { FAKE_SKILLS: '[]' },
    })
    expect(result).toMatchObject({ ok: false, error_code: 'SKILL_NOT_FOUND' })
  })

  test('report missing but fallback last_message materializes the artifact', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_AGENT_MESSAGE: 'Fallback: none\n只在回复里的报告',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const report = result.artifacts.find(a => a.rel_path === '审稿/第002章.md')!
    expect(readFileSync(report.copied_path, 'utf8')).toContain('只在回复里的报告')
  })

  test('missing reviewer toml -> REVIEWERS_MISSING before session start', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    // agents-fallback 模板在仓库内始终可用，真实缺失场景无法构造，用注入覆盖分支：
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: { FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: 'x' }]) },
      __testForceMissingReviewers: ['story-architect'],
    } as any)
    expect(result).toMatchObject({ ok: false, error_code: 'REVIEWERS_MISSING' })
  })

  test('unknown model -> CONTRACT_INVALID; missing key -> PROVIDER_TRANSLATE_FAILED', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const noModel = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 999,
      sessionArgv: [process.execPath, FIXTURE],
    })
    expect(noModel).toMatchObject({ ok: false, error_code: 'CONTRACT_INVALID' })
    writeFileSync(join(ws, 'keys.json'), '[]')
    const noKey = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
    })
    expect(noKey).toMatchObject({ ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED' })
  })

  test('onPhase and onSession hooks fire in order', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const phases: string[] = []
    let sessionSeen = false
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, modelId: 9,
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: '.agents/skills/story-review' }]),
        FAKE_WRITE_FILE: '审稿/第002章.md',
        FAKE_WRITE_CONTENT: 'Fallback: none\n报告',
      },
      onPhase: (phase) => phases.push(phase),
      onSession: () => { sessionSeen = true },
    })
    expect(result.ok).toBe(true)
    expect(phases).toEqual(['projecting', 'starting', 'running', 'harvesting'])
    expect(sessionSeen).toBe(true)
  })

  test('runKernelCandidate isolates HOME to the job directory', async () => {
    const source = await Bun.file(new URL('./run-candidate.ts', import.meta.url)).text()
    expect(source).toContain('isolatedHome: jobDir')
    expect(source).toContain("codexHome: join(jobDir, 'codex-home')")
  })

  test('adapt_pack missing contracts/*.json returns OUTPUT_MISSING with harvested _notes', async () => {
    const { ws, project } = await seedWorkspace()
    const skillDir = join(ws, '.mangaforge', 'writing-skill-packs', 'my-style')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: my-style\n---\n只改语气。\n')
    const adaptContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'mangaforge.adapt-pack.meta')!
    const result = await runKernelCandidate({
      workspace: ws, projectId: project.id, chapterId: 0, contract: adaptContract, modelId: 9,
      subjectType: 'pack', verbParams: { skill_id: 'my-style' },
      sessionArgv: [process.execPath, FIXTURE],
      sessionExtraEnv: {
        FAKE_WRITE_FILE: 'contracts/_notes/write_chapter.md',
        FAKE_WRITE_CONTENT: '缺合同',
        FAKE_AGENT_MESSAGE: '只写了 notes',
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error_code).toBe('OUTPUT_MISSING')
    expect(result.artifacts?.some(a => a.rel_path === 'contracts/_notes/write_chapter.md')).toBe(true)
  })
})
