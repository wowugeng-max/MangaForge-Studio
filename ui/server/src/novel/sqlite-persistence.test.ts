import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import {
  appendNovelRun,
  commitNovelChapterAcceptance,
  compactNovelStorage,
  createNovelCharacter,
  createNovelChapter,
  createNovelProject,
  createNovelReview,
  createNovelSettingEntity,
  listNovelChapters,
  listNovelProjects,
  listNovelReviews,
  listNovelRunSummaries,
  listNovelRuns,
  mergeNovelChapterRawPayload,
  mutateNovelProjectGenerationSource,
  mutateNovelProjectReferenceConfig,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelProject,
  updateNovelRun,
  upsertNovelChapterByNumber,
} from '../novel'
import { setNovelMutationTestHook } from '../novel-test-support'
import {
  workspaces,
  tempWorkspace,
  exists,
  holdSqliteWriteLock,
  spawnBarrieredChapterUpdate,
  waitForPath,
  snapshotNovelAcceptanceStore,
  snapshotNovelReferenceStore,
} from './test-utils'

afterEach(async () => {
  const { rm } = await import('fs/promises')
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
  setNovelMutationTestHook(null)
})

describe('novel sqlite persistence', () => {
  test('preserves two full-store mutations that overlap in separate Bun processes', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '跨进程整库更新' })
    const firstChapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章旧正文' })
    const secondChapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 2, title: '第二章', chapter_text: '第二章旧正文' })
    const first = await spawnBarrieredChapterUpdate(workspace, firstChapter.id, '第一章子进程新正文', 'first-update')
    const second = await spawnBarrieredChapterUpdate(workspace, secondChapter.id, '第二章子进程新正文', 'second-update')
    await Promise.all([waitForPath(first.readyPath), waitForPath(second.readyPath)])

    await writeFile(first.releasePath, 'release')
    expect(await first.child.exited).toBe(0)
    await writeFile(second.releasePath, 'release')
    expect(await second.child.exited).toBe(0)

    expect((await listNovelChapters(workspace, project.id)).map(chapter => chapter.chapter_text)).toEqual([
      '第一章子进程新正文',
      '第二章子进程新正文',
    ])
  })

  test('routes every novel mutation entry point through the workspace mutation lock', async () => {
    const { readdirSync, statSync, readFileSync } = await import('fs')
    const novelDir = import.meta.dir
    const walk = (dir: string): string[] => {
      const out: string[] = []
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) out.push(...walk(full))
        else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
      }
      return out
    }
    const files = walk(novelDir).map(file => ({ file, source: readFileSync(file, 'utf8') }))
    const source = files.map(item => item.source).join('\n')
    const mutationNames = [
      'createNovelProject', 'updateNovelProject', 'mutateNovelProjectGenerationSource',
      'createNovelWorldbuilding', 'updateNovelWorldbuilding',
      'createNovelCharacter', 'updateNovelCharacter',
      'createNovelSettingEntity', 'updateNovelSettingEntity', 'deleteNovelSettingEntity',
      'replaceNovelChapterSettingUsage', 'updateNovelChapterSettingUsage',
      'createNovelOutline', 'updateNovelOutline',
      'createNovelChapter', 'upsertNovelChapterByNumber', 'syncNovelChapterPlanByNumber',
      'appendChapterVersion', 'rollbackChapterVersion', 'updateNovelChapter',
      'mergeNovelChapterRawPayload', 'commitNovelChapterAcceptance',
      'deleteNovelChapter', 'deleteNovelOutline', 'deleteNovelProject',
      'createNovelReview', 'appendNovelRun', 'updateNovelRun', 'compactNovelStorage',
      'createNovelProjectSeedDraft', 'deleteNovelProjectSeedDraft',
    ]

    for (const name of mutationNames) {
      const file = files.find(item => item.source.includes(`export async function ${name}`))
      expect(file, name).toBeTruthy()
      const start = file!.source.indexOf(`export async function ${name}`)
      const nextExport = file!.source.indexOf('export async function ', start + 1)
      const block = file!.source.slice(start, nextExport < 0 ? file!.source.length : nextExport)
      expect(block.includes('withNovelWorkspaceMutation(activeWorkspace') || block.includes('withNovelDbWrite(activeWorkspace') || block.includes('mutateNovelStore(activeWorkspace')).toBe(true)
    }
    const sqlRows = readFileSync(join(novelDir, 'sql-rows.ts'), 'utf8')
    const transactionalMutationStart = sqlRows.indexOf('async function withNovelDbWrite')
    const transactionalMutationBlock = sqlRows.slice(transactionalMutationStart, transactionalMutationStart + 1500)
    expect(transactionalMutationStart).toBeGreaterThanOrEqual(0)
    expect(transactionalMutationBlock).toContain("db.exec('BEGIN IMMEDIATE')")
    expect(transactionalMutationBlock).not.toContain('loadStoreFromOpenDb(db)')
    expect(transactionalMutationBlock).not.toContain('replaceStoreInOpenDb(db, store)')
    expect(source).not.toContain('writeStoreUnlocked')
    expect(source).toContain('assertNovelWorkspaceMutationHeld')
    expect(source).not.toContain('async function mutateNovelStore')
  })

  test('ordinary project writes preserve both generation-source authority fields', async () => {
    const legacySource = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'current', key_id: 1, adapter_id: 'generic', agent_id: 'legacy-current' },
    }
    const chapterSource = {
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: { model_id: 217 },
      mcp: { server_id: 'current', key_id: 1, adapter_id: 'generic', agent_id: 'chapter-current' },
    }
    const staleLegacySource = {
      ...legacySource,
      mcp: { ...legacySource.mcp, agent_id: 'legacy-stale' },
    }
    const staleChapterSource = {
      ...chapterSource,
      mcp: { ...chapterSource.mcp, agent_id: 'chapter-stale' },
    }
    const operations = [
      {
        name: 'updateNovelProject',
        apply: (workspace: string, projectId: number, referenceConfig: Record<string, any>) => (
          updateNovelProject(workspace, projectId, {
            synopsis: 'ordinary update',
            reference_config: referenceConfig,
          })
        ),
      },
      {
        name: 'mutateNovelProjectReferenceConfig',
        apply: (workspace: string, projectId: number, referenceConfig: Record<string, any>) => (
          mutateNovelProjectReferenceConfig(workspace, {
            projectId,
            operation: 'ordinary-reference-mutation',
            mutate: () => ({ referenceConfig, result: true }),
          })
        ),
      },
    ]
    const scenarios = [
      {
        name: 'replacement',
        current: { prose_generation_source: legacySource, chapter_generation_source: chapterSource },
        candidate: { prose_generation_source: staleLegacySource, chapter_generation_source: staleChapterSource },
        ownsSources: true,
      },
      {
        name: 'deletion',
        current: { prose_generation_source: legacySource, chapter_generation_source: chapterSource },
        candidate: {},
        ownsSources: true,
      },
      {
        name: 'restoration',
        current: {},
        candidate: { prose_generation_source: staleLegacySource, chapter_generation_source: staleChapterSource },
        ownsSources: false,
      },
    ]

    for (const operation of operations) {
      for (const scenario of scenarios) {
        const workspace = await tempWorkspace()
        const project = await createNovelProject(workspace, {
          title: `${operation.name}-${scenario.name}`,
          reference_config: { ...scenario.current, notes: 'current' },
        })

        await operation.apply(workspace, project.id, { ...scenario.candidate, notes: 'updated' })

        const stored = (await listNovelProjects(workspace)).find(candidate => candidate.id === project.id)
        expect(stored?.reference_config?.notes).toBe('updated')
        expect(Object.prototype.hasOwnProperty.call(stored?.reference_config || {}, 'prose_generation_source'))
          .toBe(scenario.ownsSources)
        expect(Object.prototype.hasOwnProperty.call(stored?.reference_config || {}, 'chapter_generation_source'))
          .toBe(scenario.ownsSources)
        if (scenario.ownsSources) {
          expect(stored?.reference_config?.prose_generation_source).toEqual(legacySource)
          expect(stored?.reference_config?.chapter_generation_source).toEqual(chapterSource)
        }
      }
    }
  })

  test('dedicated generation-source mutation atomically replaces both authority fields', async () => {
    const workspace = await tempWorkspace()
    const originalLegacy = { version: 'prose_generation_source_v1', type: 'model' }
    const originalChapter = {
      version: 'chapter_generation_source_v1',
      active: 'model',
      model: { model_id: 217 },
    }
    const project = await createNovelProject(workspace, {
      title: '来源原子更新',
      reference_config: {
        prose_generation_source: originalLegacy,
        chapter_generation_source: originalChapter,
        notes: 'preserved',
      },
    })
    const nextLegacy = {
      version: 'prose_generation_source_v1',
      type: 'mcp',
      mcp: { server_id: 'generic', key_id: 7, adapter_id: 'generic', agent_id: 'agent-1' },
    }
    const nextChapter = {
      version: 'chapter_generation_source_v1',
      active: 'mcp',
      model: { model_id: 217 },
      mcp: { ...nextLegacy.mcp },
    }
    const fences: string[] = []

    const mutation = await mutateNovelProjectGenerationSource(workspace, {
      projectId: project.id,
      operation: 'test-atomic-source-replacement',
      chapterGenerationSource: nextChapter,
      proseGenerationSource: nextLegacy,
      assertCurrentProject: current => {
        fences.push('current')
        expect(current.reference_config).toMatchObject({
          prose_generation_source: originalLegacy,
          chapter_generation_source: originalChapter,
        })
      },
      assertMutationCanCommit: next => {
        fences.push('commit')
        expect(next.reference_config).toMatchObject({
          prose_generation_source: nextLegacy,
          chapter_generation_source: nextChapter,
          notes: 'preserved',
        })
      },
      result: 'replaced',
    })

    expect(fences).toEqual(['current', 'commit'])
    expect(mutation?.result).toBe('replaced')
    expect(mutation?.project.reference_config).toMatchObject({
      prose_generation_source: nextLegacy,
      chapter_generation_source: nextChapter,
      notes: 'preserved',
    })

    const rollbackError = new Error('reject both source fields')
    await expect(mutateNovelProjectGenerationSource(workspace, {
      projectId: project.id,
      operation: 'test-atomic-source-rollback',
      chapterGenerationSource: originalChapter,
      proseGenerationSource: originalLegacy,
      assertMutationCanCommit: next => {
        expect(next.reference_config).toMatchObject({
          prose_generation_source: originalLegacy,
          chapter_generation_source: originalChapter,
        })
        throw rollbackError
      },
      result: false,
    })).rejects.toBe(rollbackError)
    expect((await listNovelProjects(workspace)).find(candidate => candidate.id === project.id)?.reference_config)
      .toEqual(mutation?.project.reference_config)
  })

  test('fails a queued workspace mutation after the configured lock bound', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'workspace lock timeout' })
    const previousTimeout = process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS
    process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS = '50'
    let releaseFirst!: () => void
    const firstBlocked = new Promise<void>(resolve => { releaseFirst = resolve })
    let markFirstEntered!: () => void
    const firstEntered = new Promise<void>(resolve => { markFirstEntered = resolve })
    let blockedOnce = false
    setNovelMutationTestHook(async event => {
      if (event.activeWorkspace !== workspace || event.phase !== 'after_mutation_lock_acquired' || blockedOnce) return
      blockedOnce = true
      markFirstEntered()
      await firstBlocked
    })
    const firstMutation = updateNovelProject(workspace, project.id, { synopsis: '先持锁' })
    await firstEntered
    const startedAt = Date.now()
    try {
      const error = await appendNovelRun(workspace, {
        project_id: project.id,
        run_type: 'lock_timeout',
        step_name: 'queued',
        status: 'running',
      }).then(() => null, caught => caught)
      const elapsed = Date.now() - startedAt
      expect(String(error)).toContain('novel workspace mutation lock timeout after 50ms')
      expect(elapsed).toBeGreaterThanOrEqual(25)
      expect(elapsed).toBeLessThan(1000)
    } finally {
      releaseFirst()
      await firstMutation
      if (previousTimeout === undefined) delete process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS
      else process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS = previousTimeout
    }
  })

  test('waits for a bounded external SQLite writer instead of failing immediately', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'SQLite busy wait' })
    const previousTimeout = process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
    const holder = await holdSqliteWriteLock(workspace, 150)
    process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = '1000'
    const startedAt = Date.now()
    try {
      const run = await appendNovelRun(workspace, {
        project_id: project.id,
        run_type: 'busy_wait',
        step_name: 'external-lock',
        status: 'success',
      })
      expect(run.id).toBeGreaterThan(0)
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(80)
    } finally {
      if (previousTimeout === undefined) delete process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
      else process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = previousTimeout
      await holder.exited
    }
  })

  test('fails external SQLite lock contention after the configured bound', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'SQLite bounded failure' })
    const previousTimeout = process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
    const holder = await holdSqliteWriteLock(workspace, 300)
    process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = '50'
    const startedAt = Date.now()
    try {
      const error = await appendNovelRun(workspace, {
        project_id: project.id,
        run_type: 'busy_timeout',
        step_name: 'external-lock',
        status: 'running',
      }).then(() => null, caught => caught)
      const elapsed = Date.now() - startedAt
      expect(String(error)).toContain('database is locked')
      expect(elapsed).toBeGreaterThanOrEqual(25)
      expect(elapsed).toBeLessThan(1000)
    } finally {
      if (previousTimeout === undefined) delete process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
      else process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = previousTimeout
      await holder.exited
    }
  })

  test('preserves the original SQLite lock error when legacy import cannot begin', async () => {
    const workspace = await tempWorkspace()
    const timestamp = new Date().toISOString()
    await listNovelProjects(workspace)
    await writeFile(join(workspace, 'novel-store.json'), JSON.stringify({
      projects: [{ id: 1, title: '锁定的旧项目', created_at: timestamp, updated_at: timestamp }],
      chapters: [{ id: 1, project_id: 1, chapter_no: 1, title: '第一章', chapter_text: '旧正文', created_at: timestamp, updated_at: timestamp }],
    }))
    const previousTimeout = process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
    const holder = await holdSqliteWriteLock(workspace, 300)
    process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = '50'
    try {
      const error = await commitNovelChapterAcceptance(workspace, {
        chapter_id: 1,
        chapter_patch: { chapter_text: '不得写入' },
      }).then(() => null, caught => caught)
      expect(String(error)).toContain('database is locked')
      expect(String(error)).not.toContain('cannot rollback')
    } finally {
      if (previousTimeout === undefined) delete process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS
      else process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS = previousTimeout
      await holder.exited
    }
  })

  test('merges chapter raw payload keys against the latest row without losing concurrent metadata', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '最新行键级合并' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: { blueprint: '保留蓝图', acceptance_snapshot: '旧快照' },
    })
    const staleRawPayload = chapter.raw_payload
    await updateNovelChapter(workspace, chapter.id, {
      raw_payload: { ...staleRawPayload, concurrent_metadata: { owner: 'post-sync' } },
    }, { createVersion: false })

    const merged = await mergeNovelChapterRawPayload(workspace, chapter.id, {
      prose_admission: { status: 'accepted_with_warnings' },
      proseAdmission: { status: 'accepted_with_warnings' },
    })
    const reloaded = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)

    expect(merged).toEqual(reloaded?.raw_payload)
    expect(reloaded?.raw_payload).toMatchObject({
      blueprint: '保留蓝图',
      concurrent_metadata: { owner: 'post-sync' },
      prose_admission: { status: 'accepted_with_warnings' },
    })
  })

  test('repeated chapter raw payload warning merges stay flat and bounded', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '幂等 warning 回写' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: { blueprint: '保留蓝图' },
    })
    const admission = {
      status: 'accepted_with_warnings',
      post_commit_warnings: [{ stage: 'memory', message: '稍后补同步' }],
    }

    const first = await mergeNovelChapterRawPayload(workspace, chapter.id, {
      prose_admission: admission,
      proseAdmission: admission,
      raw_payload: { recursive: 'must not persist' },
      rawPayload: { recursive: 'must not persist' },
    })
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await mergeNovelChapterRawPayload(workspace, chapter.id, { prose_admission: admission, proseAdmission: admission })
    }
    const reloaded = (await listNovelChapters(workspace, project.id)).find(item => item.id === chapter.id)
    const serialized = JSON.stringify(reloaded?.raw_payload)

    expect(reloaded?.raw_payload).toEqual(first)
    expect(serialized.length).toBe(JSON.stringify(first).length)
    expect(serialized).not.toContain('raw_payload')
    expect(serialized).not.toContain('rawPayload')
  })

  test('does not create the legacy json mirror during normal writes', async () => {
    const workspace = await tempWorkspace()

    await createNovelProject(workspace, { title: '只写 SQLite' })

    expect(await exists(join(workspace, 'novel.sqlite'))).toBe(true)
    expect(await exists(join(workspace, 'novel-store.json'))).toBe(false)
  })

  test('imports legacy json only when sqlite is empty', async () => {
    const workspace = await tempWorkspace()
    const legacyStore = {
      projects: [{ id: 77, title: '旧 JSON 项目', updated_at: '2026-01-01T00:00:00.000Z' }],
      worldbuilding: [],
      characters: [],
      outlines: [],
      chapters: [],
      chapter_versions: [],
      reviews: [],
      runs: [],
      setting_entities: [],
      chapter_setting_usage: [],
    }
    await writeFile(join(workspace, 'novel-store.json'), `${JSON.stringify(legacyStore)}\n`, 'utf8')

    const projects = await listNovelProjects(workspace)
    await writeFile(join(workspace, 'novel-store.json'), `${JSON.stringify({
      ...legacyStore,
      projects: [{ id: 88, title: '不应覆盖 SQLite', updated_at: '2026-01-02T00:00:00.000Z' }],
    })}\n`, 'utf8')
    const projectsAfterJsonChange = await listNovelProjects(workspace)

    expect(projects.map(item => item.title)).toEqual(['旧 JSON 项目'])
    expect(projectsAfterJsonChange.map(item => item.title)).toEqual(['旧 JSON 项目'])
  })

  test('imports legacy json before a project-scoped direct list is the first read', async () => {
    const workspace = await tempWorkspace()
    const timestamp = '2026-01-01T00:00:00.000Z'
    await writeFile(join(workspace, 'novel-store.json'), JSON.stringify({
      projects: [{ id: 1, title: '直接读取迁移', updated_at: timestamp }],
      chapters: [{ id: 2, project_id: 1, chapter_no: 3, title: '第三章', chapter_text: '旧正文', scene_breakdown: [{ title: '旧场景' }], updated_at: timestamp }],
      reviews: [{ id: 3, project_id: 1, review_type: 'quality', status: 'warning', summary: '旧审查', issues: ['待修订'], payload: '{"score":80}', created_at: timestamp }],
      runs: [{ id: 4, project_id: 1, run_type: 'generate', step_name: 'chapter-3', status: 'success', created_at: timestamp }],
    }))

    expect(await listNovelChapters(workspace, 1)).toEqual([
      expect.objectContaining({ id: 2, chapter_no: 3, chapter_text: '旧正文', scene_breakdown: [{ title: '旧场景' }] }),
    ])
    expect(await listNovelReviews(workspace, 1)).toEqual([
      expect.objectContaining({ id: 3, issues: ['待修订'], payload: '{"score":80}' }),
    ])
    expect(await listNovelRuns(workspace, 1)).toEqual([
      expect.objectContaining({ id: 4, step_name: 'chapter-3' }),
    ])
  })

  test('appends reviews and runs through sqlite without reloading the full novel store', async () => {
    const createReviewBlock = await readFile(join(import.meta.dir, 'repos/reviews.ts'), 'utf8')
    const appendRunBlock = await readFile(join(import.meta.dir, 'repos/runs.ts'), 'utf8')
    expect(createReviewBlock).toContain('export async function createNovelReview')
    expect(createReviewBlock).toContain('INSERT INTO reviews')
    expect(createReviewBlock).not.toContain('readStore(activeWorkspace)')
    expect(createReviewBlock).not.toContain('writeStore(activeWorkspace')
    expect(appendRunBlock).toContain('export async function appendNovelRun')
    expect(appendRunBlock).toContain('INSERT INTO runs')
    expect(appendRunBlock).not.toContain('readStore(activeWorkspace)')
    expect(appendRunBlock).not.toContain('writeStore(activeWorkspace')
  })

  test('persists exact pipeline run summaries on append and recomputes them on update', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '运行摘要写入' })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'longform_production_repair',
      step_name: 'summary-semantics',
      status: 'completed',
      input_ref: JSON.stringify({ repair_tasks: { only: { status: 'open' } } }),
      output_ref: JSON.stringify({
        chapters: [{ status: 'failed' }, 'failed', { status: ' completed ' }],
        tasks: [
          { task_status: ['failed'] },
          { task_status: [], status: 'resolved' },
          { task_status: ['resolved'] },
          { task_status: { value: 'resolved' } },
          { task_status: 0, status: 'resolved' },
        ],
        repair_tasks: 'open',
      }),
    })

    expect(run).toMatchObject({
      pipeline_chapter_failure_count: 1,
      pipeline_open_task_count: 3,
      pipeline_task_count: 5,
    })

    const updated = await updateNovelRun(workspace, run.id, {
      input_ref: JSON.stringify({ tasks: [] }),
      output_ref: JSON.stringify({
        chapters: { ignored: { status: 'failed' } },
        tasks: [
          { task_status: [], status: 'resolved' },
          { task_status: ['resolved'] },
        ],
      }),
    })

    expect(updated).toMatchObject({
      pipeline_chapter_failure_count: 0,
      pipeline_open_task_count: 0,
      pipeline_task_count: 2,
    })
    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      expect(db.query(`
        SELECT pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count
        FROM runs WHERE id = ?
      `).get(run.id)).toMatchObject({
        pipeline_chapter_failure_count: 0,
        pipeline_open_task_count: 0,
        pipeline_task_count: 2,
      })
    } finally {
      db.close()
    }
  })

  test('summarizes the last completed chapter when current_index points past the chapter array', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '完成态运行摘要' })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: 'completed-group',
      status: 'completed',
      output_ref: JSON.stringify({
        current_index: 2,
        chapters: [
          { id: 10, chapter_no: 10, status: 'success' },
          {
            id: 11,
            chapter_no: 11,
            status: 'success',
            admission_status: 'accepted_with_warnings',
            quality_warnings: [{ message: '静态装饰细节偏多' }],
            story_state_status: 'pending',
            post_commit_warnings: [{ message: '记忆索引等待补同步' }],
          },
        ],
      }),
    })

    const summary = (await listNovelRunSummaries(workspace, project.id)).find(item => item.id === run.id)
    expect(summary).toMatchObject({
      chapter_id: 11,
      chapter_no: 11,
      admission_status: 'accepted_with_warnings',
      admission_warning_count: 1,
      admission_warning_preview: '静态装饰细节偏多',
      story_state_status: 'pending',
      story_state_pending: true,
      post_commit_warning_count: 1,
      post_commit_warning_preview: '记忆索引等待补同步',
    })
  })

  test('streams every legacy null pipeline summary before returning from schema ensure', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '运行摘要回填' })
    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      const insert = db.prepare(`
        INSERT INTO runs (
          project_id, run_type, step_name, status, input_ref, output_ref, created_at,
          pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count
        ) VALUES (?, 'longform_production_repair', ?, 'completed', '', ?, ?, NULL, NULL, NULL)
      `)
      for (let index = 0; index < 70; index += 1) {
        insert.run(
          project.id,
          `legacy-${index}`,
          JSON.stringify({
            chapters: [{ status: index === 69 ? 'failed' : 'completed' }],
            tasks: [{ task_status: index === 69 ? ['failed'] : ['resolved'] }],
          }),
          `2026-07-01T00:${String(index).padStart(2, '0')}:00.000Z`,
        )
      }
    } finally {
      db.close()
    }

    await listNovelRuns(workspace, project.id)

    const dbComplete = new Database(join(workspace, 'novel.sqlite'))
    try {
      const pending = dbComplete.query(`
        SELECT COUNT(*) AS count FROM runs
        WHERE pipeline_chapter_failure_count IS NULL
          OR pipeline_open_task_count IS NULL
          OR pipeline_task_count IS NULL
      `).get() as any
      const last = dbComplete.query(`
        SELECT pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count
        FROM runs WHERE step_name = 'legacy-69'
      `).get() as any
      expect(Number(pending.count)).toBe(0)
      expect(last).toMatchObject({
        pipeline_chapter_failure_count: 1,
        pipeline_open_task_count: 1,
        pipeline_task_count: 1,
      })
    } finally {
      dbComplete.close()
    }

    const source = await readFile(join(import.meta.dir, 'storage-compaction.ts'), 'utf8')
    const start = source.indexOf('function backfillNovelRunPipelineSummaries')
    const end = source.indexOf('\nexport function compactRawPayloadForStorage', start)
    const backfillBlock = source.slice(start, end)
    expect(backfillBlock).toContain('SELECT id')
    expect(backfillBlock).not.toContain('SELECT id, input_ref, output_ref')
    expect(backfillBlock).toContain('SELECT input_ref, output_ref FROM runs WHERE id = ?')
    expect(backfillBlock).not.toContain('.all(')
    expect(backfillBlock).toContain('id > ?')
  })
})
