import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
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
  getNovelProject,
  listChapterVersions,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelProjects,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  mergeNovelChapterRawPayload,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelProject,
  upsertNovelChapterByNumber,
} from './novel'
import { setNovelMutationTestHook } from './novel-test-support'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-novel-test-'))
  workspaces.push(workspace)
  return workspace
}

async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function holdSqliteWriteLock(workspace: string, holdMs: number) {
  const readyPath = join(workspace, `sqlite-lock-ready-${Date.now()}-${Math.random()}`)
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { Database } from 'bun:sqlite'
      const db = new Database(process.argv[1])
      db.exec('PRAGMA busy_timeout = 1000; BEGIN IMMEDIATE')
      await Bun.write(process.argv[2], 'ready')
      await Bun.sleep(Number(process.argv[3]))
      db.exec('COMMIT')
      db.close()
    `, join(workspace, 'novel.sqlite'), readyPath, String(holdMs)],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const deadline = Date.now() + 2000
  while (!(await exists(readyPath))) {
    if (Date.now() >= deadline) throw new Error('sqlite lock holder did not become ready')
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  return child
}

async function spawnBarrieredChapterUpdate(workspace: string, chapterId: number, chapterText: string, label: string) {
  const readyPath = join(workspace, `${label}-ready`)
  const releasePath = join(workspace, `${label}-release`)
  const novelModule = join(import.meta.dir, 'novel.ts')
  const testSupportModule = join(import.meta.dir, 'novel-test-support.ts')
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { existsSync } from 'fs'
      import { updateNovelChapter } from ${JSON.stringify(novelModule)}
      import { setNovelMutationTestHook } from ${JSON.stringify(testSupportModule)}
      setNovelMutationTestHook(async event => {
        if (event.phase !== 'before_full_store_write') return
        await Bun.write(${JSON.stringify(readyPath)}, 'ready')
        while (!existsSync(${JSON.stringify(releasePath)})) await Bun.sleep(5)
      })
      await updateNovelChapter(${JSON.stringify(workspace)}, ${chapterId}, { chapter_text: ${JSON.stringify(chapterText)} })
    `],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { child, readyPath, releasePath }
}

async function waitForPath(path: string) {
  const deadline = Date.now() + 3000
  while (!(await exists(path))) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`)
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

async function snapshotNovelAcceptanceStore(workspace: string, projectId: number, chapterId: number) {
  return JSON.stringify({
    project: await getNovelProject(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
    versions: await listChapterVersions(workspace, chapterId),
    characters: await listNovelCharacters(workspace, projectId),
    settings: await listNovelSettingEntities(workspace, projectId),
    usage: await listNovelChapterSettingUsage(workspace, projectId, chapterId),
    reviews: await listNovelReviews(workspace, projectId),
  })
}

async function snapshotNovelReferenceStore(workspace: string, projectIds: number[], chapterIds: number[]) {
  const [chapters, versions, characters, settings, usage, reviews, worldbuilding] = await Promise.all([
    Promise.all(projectIds.map(projectId => listNovelChapters(workspace, projectId))),
    Promise.all(chapterIds.map(chapterId => listChapterVersions(workspace, chapterId))),
    Promise.all(projectIds.map(projectId => listNovelCharacters(workspace, projectId))),
    Promise.all(projectIds.map(projectId => listNovelSettingEntities(workspace, projectId))),
    Promise.all(projectIds.flatMap(projectId => chapterIds.map(chapterId => listNovelChapterSettingUsage(workspace, projectId, chapterId)))),
    Promise.all(projectIds.map(projectId => listNovelReviews(workspace, projectId))),
    Promise.all(projectIds.map(projectId => listNovelWorldbuilding(workspace, projectId))),
  ])
  return JSON.stringify({
    projects: await listNovelProjects(workspace),
    chapters,
    versions,
    characters,
    settings,
    usage,
    reviews,
    worldbuilding,
  })
}

afterEach(async () => {
  setNovelMutationTestHook(null)
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
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
    const source = await readFile(join(import.meta.dir, 'novel.ts'), 'utf8')
    const mutationNames = [
      'createNovelProject', 'updateNovelProject',
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
      const start = source.indexOf(`export async function ${name}`)
      const nextExport = source.indexOf('export async function ', start + 1)
      const block = source.slice(start, nextExport < 0 ? source.length : nextExport)
      expect(start).toBeGreaterThanOrEqual(0)
      expect(block.includes('withNovelWorkspaceMutation(activeWorkspace') || block.includes('mutateNovelStore(activeWorkspace')).toBe(true)
    }
    const transactionalMutationStart = source.indexOf('async function mutateNovelStore')
    const transactionalMutationEnd = source.indexOf('function normalizeReferenceConfig', transactionalMutationStart)
    const transactionalMutationBlock = source.slice(transactionalMutationStart, transactionalMutationEnd)
    expect(transactionalMutationBlock).toContain("db.exec('BEGIN IMMEDIATE')")
    expect(transactionalMutationBlock).toContain('const store = loadStoreFromOpenDb(db)')
    expect(transactionalMutationBlock).toContain('replaceStoreInOpenDb(db, store)')
    expect(source).not.toContain('writeStoreUnlocked')
    expect(source).toContain('assertNovelWorkspaceMutationHeld(activeWorkspace)')
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
    const source = await readFile(join(import.meta.dir, 'novel.ts'), 'utf8')
    const createReviewStart = source.indexOf('export async function createNovelReview')
    const createReviewEnd = source.indexOf('export async function listNovelRuns', createReviewStart)
    const createReviewBlock = source.slice(createReviewStart, createReviewEnd)
    const appendRunStart = source.indexOf('export async function appendNovelRun')
    const appendRunEnd = source.indexOf('export async function updateNovelRun', appendRunStart)
    const appendRunBlock = source.slice(appendRunStart, appendRunEnd)

    expect(createReviewStart).toBeGreaterThanOrEqual(0)
    expect(createReviewEnd).toBeGreaterThan(createReviewStart)
    expect(appendRunStart).toBeGreaterThanOrEqual(0)
    expect(appendRunEnd).toBeGreaterThan(appendRunStart)
    expect(createReviewBlock).toContain('INSERT INTO reviews')
    expect(createReviewBlock).not.toContain('readStore(activeWorkspace)')
    expect(createReviewBlock).not.toContain('writeStore(activeWorkspace')
    expect(appendRunBlock).toContain('INSERT INTO runs')
    expect(appendRunBlock).not.toContain('readStore(activeWorkspace)')
    expect(appendRunBlock).not.toContain('writeStore(activeWorkspace')
  })
})

describe('commitNovelChapterAcceptance', () => {
  test('serializes an older chapter update across a newer acceptance without losing either write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '跨 mutator 并发验收' })
    const firstChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '第一章旧正文',
    })
    const secondChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二章',
      chapter_text: '第二章旧正文',
    })
    let releaseOlderWrite!: () => void
    const olderWriteBlocked = new Promise<void>(resolve => { releaseOlderWrite = resolve })
    let markOlderSnapshotRead!: () => void
    const olderSnapshotRead = new Promise<void>(resolve => { markOlderSnapshotRead = resolve })
    let blockedOnce = false
    setNovelMutationTestHook(async event => {
      if (event.activeWorkspace !== workspace || event.phase !== 'before_full_store_write' || blockedOnce) return
      blockedOnce = true
      markOlderSnapshotRead()
      await olderWriteBlocked
    })

    const olderUpdate = updateNovelChapter(workspace, firstChapter.id, { chapter_text: '第一章人工新正文' })
    await olderSnapshotRead
    const acceptance = commitNovelChapterAcceptance(workspace, {
      chapter_id: secondChapter.id,
      chapter_patch: { chapter_text: '第二章验收新正文' },
      reviews: [{ review_type: 'prose_quality', summary: '第二章验收记录' }],
    })
    let acceptanceSettled = false
    void acceptance.finally(() => { acceptanceSettled = true })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(acceptanceSettled).toBe(false)
    releaseOlderWrite()
    const [updated, accepted] = await Promise.all([olderUpdate, acceptance])

    expect(updated?.chapter_text).toBe('第一章人工新正文')
    expect(accepted.chapter.chapter_text).toBe('第二章验收新正文')
    expect((await listNovelChapters(workspace, project.id)).map(chapter => chapter.chapter_text)).toEqual([
      '第一章人工新正文',
      '第二章验收新正文',
    ])
    expect((await listNovelReviews(workspace, project.id)).map(review => review.summary)).toEqual(['第二章验收记录'])
  })

  test('queues a second acceptance behind a real first-acceptance barrier', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '真实并发双验收' })
    const firstChapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章旧正文' })
    const secondChapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 2, title: '第二章', chapter_text: '第二章旧正文' })
    let releaseFirst!: () => void
    const firstBlocked = new Promise<void>(resolve => { releaseFirst = resolve })
    let markFirstEntered!: () => void
    const firstEntered = new Promise<void>(resolve => { markFirstEntered = resolve })
    let blockedOnce = false
    setNovelMutationTestHook(async event => {
      if (event.activeWorkspace !== workspace || event.phase !== 'after_mutation_lock_acquired' || event.operation !== 'acceptance' || blockedOnce) return
      blockedOnce = true
      markFirstEntered()
      await firstBlocked
    })

    const firstAcceptance = commitNovelChapterAcceptance(workspace, {
      chapter_id: firstChapter.id,
      chapter_patch: { chapter_text: '第一章新正文' },
      reviews: [{ review_type: 'prose_quality', summary: '第一章验收' }],
    })
    await firstEntered
    let secondSettled = false
    const secondAcceptance = commitNovelChapterAcceptance(workspace, {
      chapter_id: secondChapter.id,
      chapter_patch: { chapter_text: '第二章新正文' },
      reviews: [{ review_type: 'prose_quality', summary: '第二章验收' }],
    }).finally(() => { secondSettled = true })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(secondSettled).toBe(false)
    releaseFirst()
    await Promise.all([firstAcceptance, secondAcceptance])

    expect((await listNovelChapters(workspace, project.id)).map(chapter => chapter.chapter_text)).toEqual(['第一章新正文', '第二章新正文'])
    expect((await listNovelReviews(workspace, project.id)).map(review => review.summary).sort()).toEqual(['第一章验收', '第二章验收'])
  })

  test('queues appendNovelRun behind an acceptance and preserves both records', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '验收与运行记录串行' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    let releaseAcceptance!: () => void
    const acceptanceBlocked = new Promise<void>(resolve => { releaseAcceptance = resolve })
    let markAcceptanceEntered!: () => void
    const acceptanceEntered = new Promise<void>(resolve => { markAcceptanceEntered = resolve })
    let blockedOnce = false
    setNovelMutationTestHook(async event => {
      if (event.activeWorkspace !== workspace || event.phase !== 'after_mutation_lock_acquired' || event.operation !== 'acceptance' || blockedOnce) return
      blockedOnce = true
      markAcceptanceEntered()
      await acceptanceBlocked
    })

    const acceptance = commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '验收正文' },
      reviews: [{ review_type: 'prose_quality', summary: '验收记录' }],
    })
    await acceptanceEntered
    let appendSettled = false
    const append = appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1-post-sync',
      status: 'success',
    }).finally(() => { appendSettled = true })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(appendSettled).toBe(false)
    releaseAcceptance()
    await Promise.all([acceptance, append])

    expect((await listNovelChapters(workspace, project.id))[0]?.chapter_text).toBe('验收正文')
    expect((await listNovelReviews(workspace, project.id))[0]?.summary).toBe('验收记录')
    expect((await listNovelRuns(workspace, project.id))[0]?.step_name).toBe('chapter-1-post-sync')
  })

  test('imports a legacy JSON store before the first acceptance transaction', async () => {
    const workspace = await tempWorkspace()
    const timestamp = new Date().toISOString()
    await writeFile(join(workspace, 'novel-store.json'), JSON.stringify({
      projects: [{ id: 1, title: '旧 JSON 验收', reference_config: {}, status: 'draft', created_at: timestamp, updated_at: timestamp }],
      worldbuilding: [],
      characters: [],
      outlines: [],
      chapters: [{ id: 1, project_id: 1, chapter_no: 1, title: '第一章', chapter_text: '旧 JSON 正文', status: 'draft', created_at: timestamp, updated_at: timestamp }],
      chapter_versions: [],
      reviews: [],
      runs: [],
      setting_entities: [],
      chapter_setting_usage: [],
    }))

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: 1,
      chapter_patch: { chapter_text: '迁移后验收正文' },
      reviews: [{ review_type: 'prose_quality', summary: '迁移验收' }],
    })

    expect((await listNovelChapters(workspace, 1))[0]?.chapter_text).toBe('迁移后验收正文')
    expect((await listNovelReviews(workspace, 1))[0]?.summary).toBe('迁移验收')
    expect(await exists(join(workspace, 'novel.sqlite'))).toBe(true)
  })

  test('preserves both chapter acceptances when they start concurrently', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '并发章节验收' })
    const firstChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '第一章旧正文',
    })
    const secondChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二章',
      chapter_text: '第二章旧正文',
    })
    const existingReview = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'existing',
      summary: '显式 review ID 保留',
    })
    const db = new Database(join(workspace, 'novel.sqlite'))
    db.query('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,source,created_at) VALUES (?,?,?,?,?,?,?)').run(
      700,
      firstChapter.id,
      project.id,
      99,
      '显式 version ID 保留',
      'manual_edit',
      new Date().toISOString(),
    )
    db.close()

    await Promise.all([
      commitNovelChapterAcceptance(workspace, {
        chapter_id: firstChapter.id,
        chapter_patch: { chapter_text: '第一章新正文' },
        version_source: 'agent_execute',
        reviews: [{ id: 1, review_type: 'prose_quality', summary: '第一章验收' } as any],
      }),
      commitNovelChapterAcceptance(workspace, {
        chapter_id: secondChapter.id,
        chapter_patch: { chapter_text: '第二章新正文' },
        version_source: 'agent_execute',
        reviews: [{ id: 1, review_type: 'prose_quality', summary: '第二章验收' } as any],
      }),
    ])

    const chapters = await listNovelChapters(workspace, project.id)
    const versions = [
      ...(await listChapterVersions(workspace, firstChapter.id)),
      ...(await listChapterVersions(workspace, secondChapter.id)),
    ]
    const reviews = await listNovelReviews(workspace, project.id)
    const acceptanceVersions = versions.filter(version => version.source === 'agent_execute')
    const acceptanceReviews = reviews.filter(review => review.review_type === 'prose_quality')
    expect(chapters.map(chapter => chapter.chapter_text)).toEqual(['第一章新正文', '第二章新正文'])
    expect(acceptanceVersions.map(version => version.chapter_text).sort()).toEqual(['第一章旧正文', '第二章旧正文'])
    expect(versions.find(version => version.id === 700)?.chapter_text).toBe('显式 version ID 保留')
    expect(new Set(versions.map(version => version.id)).size).toBe(3)
    expect(acceptanceReviews.map(review => review.summary).sort()).toEqual(['第一章验收', '第二章验收'])
    expect(reviews.find(review => review.id === existingReview.id)?.summary).toBe('显式 review ID 保留')
    expect(new Set(reviews.map(review => review.id)).size).toBe(3)
  })

  test('does not lose a run appended after acceptance starts', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '验收期间运行记录' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '旧正文',
    })

    const acceptance = commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '新正文' },
    })
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1-post-sync',
      status: 'success',
    })
    await acceptance

    expect(await listNovelRuns(workspace, project.id)).toEqual([
      expect.objectContaining({ id: run.id, step_name: 'chapter-1-post-sync' }),
    ])
  })

  test('keeps a concurrently rejected acceptance free of partial writes', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '并发验收回滚' })
    const validChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '第一章旧正文',
    })
    const invalidChapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二章',
      chapter_text: '第二章旧正文',
    })

    const [validResult, invalidResult] = await Promise.allSettled([
      commitNovelChapterAcceptance(workspace, {
        chapter_id: validChapter.id,
        chapter_patch: { chapter_text: '第一章新正文' },
        reviews: [{ review_type: 'prose_quality', summary: '有效验收' }],
      }),
      commitNovelChapterAcceptance(workspace, {
        chapter_id: invalidChapter.id,
        chapter_patch: { chapter_text: '第二章不得写入' },
        character_creates: [{ project_id: project.id, name: '' }],
        reviews: [{ review_type: 'prose_quality', summary: '不得写入' }],
      }),
    ])

    expect(validResult.status).toBe('fulfilled')
    expect(invalidResult.status).toBe('rejected')
    expect((await listNovelChapters(workspace, project.id)).map(chapter => chapter.chapter_text)).toEqual([
      '第一章新正文',
      '第二章旧正文',
    ])
    expect(await listChapterVersions(workspace, invalidChapter.id)).toEqual([])
    expect(await listNovelCharacters(workspace, project.id)).toEqual([])
    expect((await listNovelReviews(workspace, project.id)).map(review => review.summary)).toEqual(['有效验收'])
  })

  test('atomically stores prose, a version, and reviews while omitting all Story State patches', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, {
      title: '待同步状态原子接收',
      reference_config: { story_state: { open_questions: ['保持旧状态'] } },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '旧门',
      chapter_text: '旧正文',
    })

    const accepted = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '新正文', raw_payload: { prose_admission: { story_state_status: 'pending' } } },
      version_source: 'agent_execute',
      reviews: [{ review_type: 'prose_quality', status: 'warn', summary: '正文已收，状态待同步' }],
    })

    expect(accepted.chapter.chapter_text).toBe('新正文')
    expect(accepted.project.reference_config).toEqual(project.reference_config)
    expect(accepted.project.updated_at).toBe(project.updated_at)
    expect(await listChapterVersions(workspace, chapter.id)).toEqual([
      expect.objectContaining({ chapter_text: '旧正文', source: 'agent_execute' }),
    ])
    expect(await listNovelReviews(workspace, project.id)).toEqual([
      expect.objectContaining({ review_type: 'prose_quality', status: 'warn' }),
    ])
  })

  test('atomically stores accepted prose, old version, story state, entity changes, usage, and reviews', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, {
      title: '原子接收测试',
      reference_config: { story_state: { open_questions: ['旧问题'] } },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 3,
      title: '门前',
      chapter_text: '旧正文',
      scene_breakdown: [{ title: '旧场景' }],
      continuity_notes: ['旧连续性'],
    })
    const character = await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '李玄',
      current_state: { injured: false },
    } as any)
    const setting = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'item',
      name: '旧印章',
      state_json: { owner: '林青禾' },
    } as any)
    const [usage] = await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [{
      entity_id: setting.id,
      actual_state_change: { seen: false },
    }])

    const accepted = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: {
        chapter_text: '新正文',
        scene_breakdown: [{ title: '新场景' }],
        continuity_notes: ['新连续性'],
      },
      version_source: 'agent_execute',
      next_reference_config: { story_state: { open_questions: ['新问题'], last_updated_chapter: 3 } },
      character_updates: [{ id: character.id, patch: { current_state: { injured: true, last_seen_chapter: 3 } } }],
      setting_updates: [{ entity_id: setting.id, patch: { state_json: { owner: '李玄', last_seen_chapter: 3 } } }],
      usage_updates: [{ id: usage.id, patch: { actual_state_change: { seen: true, transferred: true } } }],
      reviews: [{ review_type: 'prose_quality', status: 'ok', summary: '最终门禁通过' }],
    })

    const [storedCharacter] = await listNovelCharacters(workspace, project.id)
    const [storedSetting] = await listNovelSettingEntities(workspace, project.id)
    const [storedUsage] = await listNovelChapterSettingUsage(workspace, project.id, chapter.id)
    const [version] = await listChapterVersions(workspace, chapter.id)
    const [review] = await listNovelReviews(workspace, project.id)

    expect(accepted.chapter.chapter_text).toBe('新正文')
    expect(accepted.project.reference_config?.story_state).toMatchObject({ open_questions: ['新问题'], last_updated_chapter: 3 })
    expect(storedCharacter.current_state).toEqual({ injured: true, last_seen_chapter: 3 })
    expect(storedSetting.state_json).toEqual({ owner: '李玄', last_seen_chapter: 3 })
    expect(storedUsage.actual_state_change).toEqual({ seen: true, transferred: true })
    expect(version).toMatchObject({
      version_no: 1,
      chapter_text: '旧正文',
      scene_breakdown: [{ title: '旧场景' }],
      continuity_notes: ['旧连续性'],
      source: 'agent_execute',
    })
    expect(review).toMatchObject({ review_type: 'prose_quality', status: 'ok', summary: '最终门禁通过' })
  })

  test('validates every referenced update before writing any business data', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, {
      title: '原子回滚测试',
      reference_config: { story_state: { open_questions: ['保持不变'] } },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 4,
      title: '门后',
      chapter_text: '保持旧正文',
    })
    const character = await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '李玄',
      current_state: { injured: false },
    } as any)
    const before = JSON.stringify({
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      versions: await listChapterVersions(workspace, chapter.id),
      characters: await listNovelCharacters(workspace, project.id),
      settings: await listNovelSettingEntities(workspace, project.id),
      usage: await listNovelChapterSettingUsage(workspace, project.id, chapter.id),
      reviews: await listNovelReviews(workspace, project.id),
    })

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '绝不能落库的新正文' },
      version_source: 'agent_execute',
      next_reference_config: { story_state: { open_questions: ['绝不能落库'] } },
      character_updates: [{ id: character.id, patch: { current_state: { injured: true } } }],
      setting_updates: [{ entity_id: 999999, patch: { state_json: { invalid: true } } }],
      reviews: [{ review_type: 'prose_quality', status: 'ok', summary: '绝不能落库' }],
    }).then(() => null, caught => caught)
    const after = JSON.stringify({
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      versions: await listChapterVersions(workspace, chapter.id),
      characters: await listNovelCharacters(workspace, project.id),
      settings: await listNovelSettingEntities(workspace, project.id),
      usage: await listNovelChapterSettingUsage(workspace, project.id, chapter.id),
      reviews: await listNovelReviews(workspace, project.id),
    })

    expect(String(error)).toContain('setting')
    expect(after).toBe(before)
  })

  test('rejects an ambiguous character update name before any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'ambiguous character update' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    await createNovelCharacter(workspace, { project_id: project.id, name: '同名角色', role_type: 'supporting' } as any)
    await createNovelCharacter(workspace, { project_id: project.id, name: '同名角色', role_type: 'antagonist' } as any)
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      character_updates: [{ name: '同名角色', patch: { current_state: { invalid: true } } }],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('ambiguous')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('rejects inconsistent character id and name before any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'inconsistent character update' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    await createNovelCharacter(workspace, { project_id: project.id, name: '角色甲' } as any)
    const characterB = await createNovelCharacter(workspace, { project_id: project.id, name: '角色乙' } as any)
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      character_updates: [{ id: characterB.id, name: '角色甲', patch: { current_state: { invalid: true } } }],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('inconsistent')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('keeps unique name, existing id, and staged character id updates valid', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'valid character references' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
    const namedCharacter = await createNovelCharacter(workspace, { project_id: project.id, name: '唯一姓名' } as any)
    const idCharacter = await createNovelCharacter(workspace, { project_id: project.id, name: '仅 ID 角色' } as any)

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      character_creates: [{ id: -1, project_id: project.id, name: '暂存角色' }],
      character_updates: [
        { name: namedCharacter.name, patch: { current_state: { resolved_by: 'name' } } },
        { id: idCharacter.id, patch: { current_state: { resolved_by: 'id' } } },
        { id: -1, patch: { current_state: { resolved_by: 'temporary_id' } } },
      ],
    })

    const characters = await listNovelCharacters(workspace, project.id)
    expect(characters.find(character => character.id === namedCharacter.id)?.current_state).toEqual({ resolved_by: 'name' })
    expect(characters.find(character => character.id === idCharacter.id)?.current_state).toEqual({ resolved_by: 'id' })
    expect(characters.find(character => character.name === '暂存角色')?.current_state).toEqual({ resolved_by: 'temporary_id' })
  })

  test('rejects immutable acceptance reference rewrites before any write', async () => {
    const scenarioNames = [
      'chapter id',
      'chapter project_id',
      'project id',
      'character id',
      'character project_id',
      'setting id',
      'setting project_id',
      'usage id',
      'usage project_id',
      'usage chapter_id',
      'usage entity_id',
    ]
    const results: Array<{ name: string; rejected: boolean; unchanged: boolean }> = []

    for (const name of scenarioNames) {
      const workspace = await tempWorkspace()
      const project = await createNovelProject(workspace, { title: `immutable ${name}` })
      const otherProject = await createNovelProject(workspace, { title: `other ${name}` })
      const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
      const otherChapter = await createNovelChapter(workspace, { project_id: otherProject.id, chapter_no: 1, title: '另一章' })
      const character = await createNovelCharacter(workspace, { project_id: project.id, name: '角色甲' } as any)
      const otherCharacter = await createNovelCharacter(workspace, { project_id: otherProject.id, name: '角色乙' } as any)
      const setting = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '设定甲' } as any)
      const secondSetting = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'rule', name: '设定乙' } as any)
      const otherSetting = await createNovelSettingEntity(workspace, { project_id: otherProject.id, entity_type: 'item', name: '设定丙' } as any)
      const [usage, secondUsage] = await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [
        { entity_id: setting.id },
        { entity_id: secondSetting.id },
      ])
      const before = await snapshotNovelReferenceStore(workspace, [project.id, otherProject.id], [chapter.id, otherChapter.id])
      const input: any = {
        chapter_id: chapter.id,
        chapter_patch: { chapter_text: '不得写入' },
      }
      if (name === 'chapter id') input.chapter_patch.id = otherChapter.id
      if (name === 'chapter project_id') input.chapter_patch.project_id = otherProject.id
      if (name === 'project id') input.project_patch = { id: otherProject.id }
      if (name === 'character id') input.character_updates = [{ id: character.id, patch: { id: otherCharacter.id } }]
      if (name === 'character project_id') input.character_updates = [{ id: character.id, patch: { project_id: otherProject.id } }]
      if (name === 'setting id') input.setting_updates = [{ entity_id: setting.id, patch: { id: otherSetting.id } }]
      if (name === 'setting project_id') input.setting_updates = [{ entity_id: setting.id, patch: { project_id: otherProject.id } }]
      if (name === 'usage id') input.usage_updates = [{ id: usage.id, patch: { id: secondUsage.id } }]
      if (name === 'usage project_id') input.usage_updates = [{ id: usage.id, patch: { project_id: otherProject.id } }]
      if (name === 'usage chapter_id') input.usage_updates = [{ id: usage.id, patch: { chapter_id: otherChapter.id } }]
      if (name === 'usage entity_id') input.usage_updates = [{ id: usage.id, patch: { entity_id: otherSetting.id } }]

      const error = await commitNovelChapterAcceptance(workspace, input).then(() => null, caught => caught)
      results.push({
        name,
        rejected: String(error).includes('immutable'),
        unchanged: await snapshotNovelReferenceStore(workspace, [project.id, otherProject.id], [chapter.id, otherChapter.id]) === before,
      })
    }

    expect(results).toEqual(scenarioNames.map(name => ({ name, rejected: true, unchanged: true })))
  })

  test('allocates review ids without overwriting an explicit conflicting id', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'review id allocation' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
    const existingReview = await createNovelReview(workspace, { project_id: project.id, review_type: 'existing', summary: '保留' })

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      reviews: [{ id: existingReview.id, project_id: project.id, review_type: 'new', summary: '新增' } as any],
    })

    const reviews = await listNovelReviews(workspace, project.id)
    expect(reviews).toHaveLength(2)
    expect(reviews.find(review => review.id === existingReview.id)?.summary).toBe('保留')
    expect(new Set(reviews.map(review => review.id)).size).toBe(2)
  })

  test('allocates unique ids after explicit staged create ids before the atomic write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '暂存 ID 映射测试' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      worldbuilding_creates: [
        { id: 1, project_id: project.id, world_summary: '显式 ID 世界观' },
        { project_id: project.id, world_summary: '自动 ID 世界观' },
      ],
    })

    expect((await listNovelWorldbuilding(workspace, project.id)).map(item => item.id).sort((a, b) => a - b)).toEqual([1, 2])
  })

  test('applies usage updates to replacement records backed by staged setting ids', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '暂存 usage 更新' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      setting_creates: [{ id: -1, project_id: project.id, entity_type: 'item', name: '临时印章' }],
      chapter_setting_usage_replacement: [{ entity_id: -1, actual_state_change: { staged: true } }],
      usage_updates: [{ entity_id: -1, patch: { actual_state_change: { owner: '李玄' } } }],
    })

    const [usage] = await listNovelChapterSettingUsage(workspace, project.id, chapter.id)
    expect(usage.actual_state_change).toEqual({ staged: true, owner: '李玄' })
  })

  test('merges usage updates into replacement records instead of overwritten old usage', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '替换 usage 更新' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
    const setting = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '旧印章' } as any)
    await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [{ entity_id: setting.id, actual_state_change: { old: true } }])

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      chapter_setting_usage_replacement: [{ entity_id: setting.id, actual_state_change: { replacement: true } }],
      usage_updates: [{ entity_id: setting.id, patch: { actual_state_change: { prepared: true } } }],
    })

    const [usage] = await listNovelChapterSettingUsage(workspace, project.id, chapter.id)
    expect(usage.actual_state_change).toEqual({ replacement: true, prepared: true })
  })

  test('rejects usage updates missing from the final replacement set without any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '无效 replacement 引用' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    const setting = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '旧印章' } as any)
    const before = JSON.stringify({
      chapters: await listNovelChapters(workspace, project.id),
      settings: await listNovelSettingEntities(workspace, project.id),
      usage: await listNovelChapterSettingUsage(workspace, project.id, chapter.id),
      versions: await listChapterVersions(workspace, chapter.id),
    })

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      chapter_setting_usage_replacement: [{ entity_id: setting.id }],
      usage_updates: [{ entity_id: 999999, patch: { actual_state_change: { invalid: true } } }],
    }).then(() => null, caught => caught)
    const after = JSON.stringify({
      chapters: await listNovelChapters(workspace, project.id),
      settings: await listNovelSettingEntities(workspace, project.id),
      usage: await listNovelChapterSettingUsage(workspace, project.id, chapter.id),
      versions: await listChapterVersions(workspace, chapter.id),
    })

    expect(String(error)).toContain('usage update reference')
    expect(after).toBe(before)
  })

  test('rejects a stale usage id that points at another entity after replacement without any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'replacement stale usage id' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    const settingA = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '印章甲' } as any)
    const settingB = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '印章乙' } as any)
    const [oldUsageA] = await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [
      { entity_id: settingA.id },
      { entity_id: settingB.id },
    ])
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      chapter_setting_usage_replacement: [
        { entity_id: settingB.id },
        { entity_id: settingA.id },
      ],
      usage_updates: [{ id: oldUsageA.id, entity_id: settingA.id, patch: { actual_state_change: { invalid: true } } }],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('usage update reference')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('rejects an ambiguous setting update name before any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'ambiguous setting update' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '同名设定' } as any)
    await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'rule', name: '同名设定' } as any)
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      setting_updates: [{ name: '同名设定', patch: { state_json: { invalid: true } } }],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('ambiguous')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('rejects an ambiguous usage replacement name before any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'ambiguous usage replacement' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '同名设定' } as any)
    await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'rule', name: '同名设定' } as any)
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      chapter_setting_usage_replacement: [{ entity_name: '同名设定' } as any],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('ambiguous')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('rejects an ambiguous usage update name before any write', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'ambiguous usage update' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '旧正文' })
    const item = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '同名设定' } as any)
    const rule = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'rule', name: '同名设定' } as any)
    await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [{ entity_id: item.id }, { entity_id: rule.id }])
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '不得写入' },
      usage_updates: [{ name: '同名设定', patch: { actual_state_change: { invalid: true } } }],
    }).then(() => null, caught => caught)

    expect(String(error)).toContain('ambiguous')
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
  })

  test('resolves explicit setting types consistently across updates and replacement usage', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: 'typed setting references' })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 1, title: '第一章' })
    const item = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '同名设定' } as any)
    const rule = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'rule', name: '同名设定' } as any)

    await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '正文' },
      setting_updates: [{ name: '同名设定', entity_type: 'item', patch: { state_json: { owner: '李玄' } } }],
      chapter_setting_usage_replacement: [
        { entity_name: '同名设定', entity_type: 'item' } as any,
        { entity_name: '同名设定', entity_type: 'rule' } as any,
      ],
      usage_updates: [{ name: '同名设定', entity_type: 'rule', patch: { actual_state_change: { triggered: true } } }],
    })

    const settings = await listNovelSettingEntities(workspace, project.id)
    const usage = await listNovelChapterSettingUsage(workspace, project.id, chapter.id)
    expect(settings.find(setting => setting.id === item.id)?.state_json).toEqual({ owner: '李玄' })
    expect(settings.find(setting => setting.id === rule.id)?.state_json).toEqual({})
    expect(usage.find(record => record.entity_id === rule.id)?.actual_state_change).toEqual({ triggered: true })
    expect(usage.find(record => record.entity_id === item.id)?.actual_state_change).toEqual({})
  })
})

describe('novel diagnostic payload compaction', () => {
  test('caps oversized run refs and review payloads before persistence', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '日志压缩测试' })
    const hugeText = '上下文'.repeat(40000)

    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1',
      status: 'success',
      input_ref: hugeText,
      output_ref: JSON.stringify({ context_package: { hugeText }, final_text: '正文' }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      summary: '诊断摘要',
      payload: JSON.stringify({ context_package: { hugeText }, issues: [] }),
    })

    const [run] = await listNovelRuns(workspace, project.id)
    const [review] = await listNovelReviews(workspace, project.id)

    expect(run.input_ref.length).toBeLessThan(70000)
    expect(run.output_ref.length).toBeLessThan(70000)
    expect(review.payload?.length || 0).toBeLessThan(70000)
    expect(run.input_ref).toContain('"truncated":true')
    expect(run.output_ref).toContain('"omitted":true')
    expect(review.payload).toContain('"omitted":true')
    expect(run.output_ref).not.toContain(hugeText)
    expect(review.payload).not.toContain(hugeText)
  })

  test('keeps prose quality review payload readable after compaction', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '质检摘要压缩测试' })
    const hugeFinding = '这一项质检问题需要保留为可读摘要，但不能把整段模型诊断都塞进数据库。'.repeat(2000)

    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节自检评分 72',
      payload: JSON.stringify({
        chapter_id: 9,
        chapter_updated_at: '2026-07-05T01:00:00.000Z',
        content_hash: 'abcdef1234567890',
        source: 'manual_refresh',
        context_package: {
          preflight: {
            ready: false,
            warnings: ['上下文缺口：追踪/时间线缺失', hugeFinding],
            checks: [
              { key: 'timeline_tracking', label: '追踪/时间线', ok: false, severity: 'medium', fix: hugeFinding },
            ],
          },
          chapter_target: {
            id: 9,
            chapter_no: 9,
            title: '第九章',
            scene_cards: [{ title: '巨量场景', purpose: hugeFinding }],
          },
          continuity: {
            previous_chapter: { chapter_no: 8, title: '第八章', ending_hook: hugeFinding },
          },
        },
        self_check: {
          final_text: '正文全文'.repeat(30000),
          revised: false,
          review: {
            passed: false,
            score: 72,
            needs_revision: true,
            craft_metrics: {
              action_detail_score: 41,
              event_density_score: 52,
              description_overuse_score: 88,
            },
            focused_revision_modes: ['expand_action', 'tighten_pacing', 'add_consequence'],
            revision_directives: [hugeFinding, '补足主角动作选择。'],
            issues: Array.from({ length: 10 }, (_, index) => ({
              severity: index < 2 ? 'high' : 'medium',
              type: `issue_${index}`,
              message: hugeFinding,
              fix: hugeFinding,
            })),
            platform_checks: Array.from({ length: 12 }, (_, index) => ({ key: `platform_${index}`, label: hugeFinding, status: 'warn', evidence: hugeFinding })),
            content_rubric_checks: Array.from({ length: 12 }, (_, index) => ({ key: `rubric_${index}`, label: hugeFinding, status: 'warn', fix: hugeFinding })),
          },
        },
        pipeline: [{ key: 'review', label: '章节级自检', status: 'failed', detail: hugeFinding }],
      }),
    })

    const [review] = await listNovelReviews(workspace, project.id)
    const payload = JSON.parse(String(review.payload || '{}'))
    const payloadText = JSON.stringify(payload)

    expect(payload.truncated).toBeUndefined()
    expect(payloadText.length).toBeLessThan(60000)
    expect(payloadText).not.toContain(hugeFinding.slice(0, 2000))
    expect(payload.chapter_id).toBe(9)
    expect(payload.context_package.chapter_target.chapter_no).toBe(9)
    expect(payload.context_package.chapter_target.title).toBe('第九章')
    expect(payload.context_package.preflight.ready).toBe(false)
    expect(payload.context_package.preflight.warnings[0]).toContain('上下文缺口')
    expect(payload.self_check.review.score).toBe(72)
    expect(payload.self_check.review.issues[0].severity).toBe('high')
    expect(payload.self_check.review.revision_directives[1]).toBe('补足主角动作选择。')
    expect(payload.self_check.final_text).toEqual({ omitted: true, reason: 'storage_compaction' })
    expect(payload.pipeline[0]).toMatchObject({ key: 'review', label: '章节级自检', status: 'failed' })
  })

  test('keeps unrecoverable prose quality preview payloads intact', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '历史质检预览保护测试' })
    const compactedPreview = {
      truncated: true,
      reason: 'storage_compaction',
      original_chars: 143327,
      preview: '{"chapter_id":6,"context_package":{"summary":{"chapter_title":"小镇追索"}',
    }

    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节自检评分 80',
      payload: JSON.stringify(compactedPreview),
    })

    const [review] = await listNovelReviews(workspace, project.id)
    const payload = JSON.parse(String(review.payload || '{}'))

    expect(payload).toMatchObject(compactedPreview)
    expect(payload.self_check).toBeUndefined()
    expect(payload.context_package).toBeUndefined()
  })

  test('compacts existing oversized sqlite payload columns without loading the full store', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '历史清理测试' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: { keep: '章节蓝图', context_package: { hugeText: '旧上下文'.repeat(50000) } },
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1',
      status: 'success',
      output_ref: '旧输出'.repeat(50000),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      payload: '旧诊断'.repeat(50000),
    })

    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      db.query('UPDATE runs SET output_ref=?').run('历史 run'.repeat(50000))
      db.query('UPDATE reviews SET payload=?').run('历史 review'.repeat(50000))
      db.query('UPDATE chapters SET raw_payload=? WHERE id=?').run(JSON.stringify({
        keep: '章节蓝图',
        context_package: { hugeText: '历史上下文'.repeat(50000) },
      }), chapter.id)
    } finally {
      db.close()
    }

    const result = await compactNovelStorage(workspace)
    const dbAfter = new Database(join(workspace, 'novel.sqlite'))
    try {
      const lengths = dbAfter.query(`
        SELECT
          (SELECT length(output_ref) FROM runs LIMIT 1) AS run_bytes,
          (SELECT length(payload) FROM reviews LIMIT 1) AS review_bytes,
          (SELECT length(raw_payload) FROM chapters WHERE id=? LIMIT 1) AS chapter_bytes
      `).get(chapter.id) as any
      const chapterPayload = JSON.parse(String((dbAfter.query('SELECT raw_payload FROM chapters WHERE id=?').get(chapter.id) as any).raw_payload || '{}'))

      expect(result.compacted).toBeGreaterThanOrEqual(3)
      expect(lengths.run_bytes).toBeLessThan(70000)
      expect(lengths.review_bytes).toBeLessThan(70000)
      expect(lengths.chapter_bytes).toBeLessThan(70000)
      expect(chapterPayload.keep).toBe('章节蓝图')
      expect(chapterPayload.context_package).toMatchObject({ omitted: true, reason: 'storage_compaction' })
    } finally {
      dbAfter.close()
    }
  })

  test('does not persist nested raw payload or chapter text copies inside chapter raw payload', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '章节原始载荷去重测试' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '正文内容'.repeat(1000),
      raw_payload: {
        blueprint: '保留蓝图',
        raw_payload: { nested: '不应该继续嵌套' },
      },
    })

    const updated = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二章',
      raw_payload: {
        previous: chapter.raw_payload,
        chapter_text: '正文副本'.repeat(1000),
      },
    })
    const chapters = await listNovelChapters(workspace, project.id)
    const second = chapters.find(item => item.id === updated.id)!

    expect(second.raw_payload.previous.blueprint).toBe('保留蓝图')
    expect(second.raw_payload.raw_payload).toBeUndefined()
    expect(second.raw_payload.previous.raw_payload).toBeUndefined()
    expect(second.raw_payload.chapter_text).toEqual({ omitted: true, reason: 'storage_compaction' })
    expect(JSON.stringify(second.raw_payload).length).toBeLessThan(5000)
  })

  test('compacts repeated scene diagnostics inside chapter raw payload', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '场景诊断压缩测试' })
    const mediumDiagnostic = '上一章交付风险必须在本章承接。'.repeat(6000)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        blueprint: '保留蓝图',
        scene_breakdown: [
          {
            scene_no: 1,
            title: '目标入场',
            purpose: mediumDiagnostic,
            conflict: mediumDiagnostic,
            change: mediumDiagnostic,
            purpose_tags: Array.from({ length: 18 }, (_, index) => `${index}-${mediumDiagnostic}`),
          },
        ],
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '生成场景',
            purpose: mediumDiagnostic,
            conflict: mediumDiagnostic,
          },
        ],
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const rawText = JSON.stringify(chapter.raw_payload)

    expect(chapter.raw_payload.blueprint).toBe('保留蓝图')
    expect(rawText.length).toBeLessThan(20000)
    expect(rawText).not.toContain(mediumDiagnostic.slice(0, 2000))
    expect(chapter.raw_payload.scene_breakdown[0].title).toBe('目标入场')
    expect(chapter.raw_payload.scene_breakdown[0].purpose.length).toBeLessThan(500)
    expect(chapter.raw_payload.scene_breakdown[0].purpose_tags.length).toBeLessThanOrEqual(6)
  })

  test('compacts oversized pre draft brief contracts while preserving writing cues', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前准备压缩测试' })
    const hugeContract = '合同细则必须在正文中逐项兑现。'.repeat(30000)
    const hugeSceneText = '场景目标、阻碍、变化需要持续跟踪。'.repeat(8000)

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          chapter_goal: '确认主角进入禁区的代价',
          reader_promise: '本章兑现一次明确的冒险回报',
          core_conflict: '主角必须在救人和保密之间选择',
          emotional_curve: '紧张 -> 侥幸 -> 代价显现',
          chapter_blueprint: {
            target_emotion: hugeContract,
            opening_hook: '禁区钟声提前响起',
            core_payoff: hugeContract,
            content_outline: [hugeContract, hugeContract, hugeContract],
          },
          next_chapter_quality_plan: { quality_focus: hugeContract },
          write_preparation_brief: { checklist: [hugeContract, hugeContract] },
          style_sample_strategy: { sample: hugeContract },
          chapter_benchmark_strategy: { benchmark: hugeContract },
          scene_briefs: [
            {
              scene_no: 1,
              title: '禁区入口',
              purpose: hugeSceneText,
              obstacle: hugeSceneText,
              change: hugeSceneText,
            },
          ],
          character_behavior_contract: { rules: hugeContract, evidence: hugeContract },
          plot_framework_contract: { rules: hugeContract, evidence: hugeContract },
          plot_dynamics_contract: { rules: hugeContract, evidence: hugeContract },
          target_reader_contract: { rules: hugeContract, evidence: hugeContract },
          dialogue_contract: { rules: hugeContract, evidence: hugeContract },
          continuity_heat_contract: { rules: hugeContract, evidence: hugeContract },
          asset_linkage_contract: { rules: hugeContract, evidence: hugeContract },
          information_flow_contract: { rules: hugeContract, evidence: hugeContract },
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const rawText = JSON.stringify(chapter.raw_payload)
    const brief = chapter.raw_payload.pre_draft_brief

    expect(rawText.length).toBeLessThan(30000)
    expect(rawText).not.toContain(hugeContract.slice(0, 2000))
    expect(rawText).not.toContain(hugeSceneText.slice(0, 2000))
    expect(brief.chapter_goal).toBe('确认主角进入禁区的代价')
    expect(brief.reader_promise).toBe('本章兑现一次明确的冒险回报')
    expect(brief.core_conflict).toBe('主角必须在救人和保密之间选择')
    expect(brief.scene_briefs[0].title).toBe('禁区入口')
    expect(brief.scene_briefs[0].purpose.length).toBeLessThan(500)
    expect(brief.character_behavior_contract).toMatchObject({ omitted: true, reason: 'storage_compaction' })
  })

  test('preserves confirmation metadata while compacting oversized pre draft briefs', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前确认元数据压缩测试' })
    const confirmedAt = '2026-07-11T01:00:00.000Z'
    const updatedAt = '2026-07-11T01:01:00.000Z'
    const oversizedContracts = Object.fromEntries(
      Array.from({ length: 44 }, (_, index) => [
        `extended_${index}_contract`,
        { rules: `第 ${index + 1} 份写前合同必须保留执行摘要。`.repeat(200) },
      ]),
    )

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          ...oversizedContracts,
          confirmed_at: confirmedAt,
          confirmation_source: 'manual_author_confirmation',
          updated_at: updatedAt,
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const brief = chapter.raw_payload.pre_draft_brief

    expect(brief.confirmed_at).toBe(confirmedAt)
    expect(brief.confirmation_source).toBe('manual_author_confirmation')
    expect(brief.updated_at).toBe(updatedAt)
  })

  test('preserves state tracking source readiness rows while compacting pre draft briefs', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前来源就绪压缩测试' })
    const standardSourceRows = [
      'chapter_blueprint',
      'previous_chapter',
      'context_tracking',
      'serial_story_state',
      'timeline_tracking',
      'delivery_risk_carry_over',
      'character_state',
      'foreshadowing_history',
      'world_constraints',
    ].map(key => ({ key, status: 'ready', evidence: `${key} 已读取` }))
    const customMissingRow = {
      key: 'custom_editorial_source',
      status: 'missing',
      evidence: '编辑自定义来源尚未补齐',
    }
    const sourceRows = [...standardSourceRows, customMissingRow]
    const hugeDiagnostic = '写前压缩仍需保留关键来源就绪行。'.repeat(30000)

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          chapter_goal: hugeDiagnostic,
          state_tracking_contract: {
            source_readiness: sourceRows,
            sourceReadiness: sourceRows,
            unrelated_rows: sourceRows,
          },
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const brief = chapter.raw_payload.pre_draft_brief
    const stateTracking = brief.state_tracking_contract

    expect(stateTracking.source_readiness).toHaveLength(10)
    expect(stateTracking.source_readiness.at(-1)).toMatchObject(customMissingRow)
    expect(stateTracking.sourceReadiness).toHaveLength(10)
    expect(stateTracking.sourceReadiness.at(-1)).toMatchObject(customMissingRow)
    expect(stateTracking.unrelated_rows).toHaveLength(9)
    expect(stateTracking.unrelated_rows.at(-1)).toMatchObject({
      omitted: true,
      reason: 'storage_compaction',
      truncated: true,
      original_count: 2,
    })
    expect(JSON.stringify(chapter.raw_payload)).not.toContain(hugeDiagnostic.slice(0, 2000))
  })
})

describe('upsertNovelChapterByNumber', () => {
  test('updates generated outline fields for an existing chapter number without duplicating or clearing prose', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '大纲重复生成测试' })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '旧第1章',
      chapter_summary: '旧摘要',
      chapter_text: '已经写好的正文',
      scene_breakdown: [{ title: '旧场景' }],
    })

    const updated = await upsertNovelChapterByNumber(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '新第1章',
      chapter_summary: '新摘要',
      scene_breakdown: [{ title: '新场景' }],
    })
    const created = await upsertNovelChapterByNumber(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第2章',
      chapter_summary: '第二章摘要',
    })

    const chapters = await listNovelChapters(workspace, project.id)

    expect(updated.id).toBe(chapters[0].id)
    expect(created.chapter_no).toBe(2)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('新第1章')
    expect(chapters[0].chapter_summary).toBe('新摘要')
    expect(chapters[0].chapter_text).toBe('已经写好的正文')
    expect(chapters[0].scene_breakdown).toEqual([{ title: '新场景' }])
  })
})

describe('novel persistence json safety', () => {
  test('sanitizes circular chapter planning payloads before persistence', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '循环载荷测试' })
    const scene: any = { title: '循环场景' }
    scene.self = scene

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '循环章节',
      scene_breakdown: [scene],
      raw_payload: { source: 'test', scene },
    })

    const chapters = await listNovelChapters(workspace, project.id)

    expect(chapters[0].scene_breakdown[0]).toMatchObject({
      title: '循环场景',
      self: '[Circular]',
    })
    expect(chapters[0].raw_payload.scene.self).toBe('[Circular]')
  })
})
