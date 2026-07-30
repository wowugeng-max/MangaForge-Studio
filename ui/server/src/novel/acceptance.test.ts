import { afterEach, describe, expect, test } from 'bun:test'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import {
  appendNovelRun,
  commitNovelChapterAcceptance,
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
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelProject,
} from '../novel'
import { setNovelMutationTestHook } from '../novel-test-support'
import { proseGenerationSourceFingerprint } from '../novel-writing-service/generation-source/source-config'
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

  test('rejects every acceptance write when the MCP binding changed after generation started', async () => {
    const workspace = await tempWorkspace()
    const originalSource = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: { server_id: 'buda', key_id: 7, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    const project = await createNovelProject(workspace, {
      title: '绑定变更原子拒绝',
      reference_config: {
        prose_generation_source: originalSource,
        notes: '生成准备时备注',
        story_state: { open_questions: ['旧问题'] },
      },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '旧正文',
    })
    await updateNovelProject(workspace, project.id, {
      reference_config: {
        ...project.reference_config,
        prose_generation_source: {
          ...originalSource,
          mcp: { ...originalSource.mcp, agent_id: 'agent-2' },
        },
      },
    })
    const before = await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)

    const error = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '绝不能落库的新正文' },
      version_source: 'agent_execute',
      expected_prose_generation_source_fingerprint: proseGenerationSourceFingerprint(originalSource),
      next_reference_config: {
        prose_generation_source: originalSource,
        notes: '生成准备时备注',
        story_state: { open_questions: ['绝不能落库'] },
      },
      character_creates: [{ project_id: project.id, name: '绝不能落库的新角色' }],
      reviews: [{ review_type: 'prose_quality', status: 'ok', summary: '绝不能落库' }],
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'MCP_BINDING_CHANGED' })
    expect(await snapshotNovelAcceptanceStore(workspace, project.id, chapter.id)).toBe(before)
    expect((await getNovelProject(workspace, project.id))?.reference_config?.prose_generation_source)
      .toMatchObject({ mcp: { agent_id: 'agent-2' } })
  })

  test('merges prepared Story State into the latest reference config without restoring stale fields', async () => {
    const workspace = await tempWorkspace()
    const source = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: { server_id: 'buda', key_id: 7, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    const project = await createNovelProject(workspace, {
      title: '验收合并最新配置',
      reference_config: {
        prose_generation_source: source,
        notes: '准备时备注',
        unrelated: { revision: '准备时旧值' },
        story_state: { open_questions: ['旧问题'] },
      },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '旧正文',
    })
    const latestProject = await updateNovelProject(workspace, project.id, {
      reference_config: {
        prose_generation_source: source,
        notes: '验收时最新备注',
        unrelated: { revision: '验收时最新值' },
        story_state: { open_questions: ['旧问题'] },
      },
    })

    const accepted = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '验收新正文' },
      project_patch: {
        synopsis: '其他 project patch 仍可写入',
        reference_config: { notes: 'project patch 不得绕过合并' },
      },
      expected_prose_generation_source_fingerprint: proseGenerationSourceFingerprint(source),
      next_reference_config: {
        prose_generation_source: source,
        notes: '准备时备注',
        unrelated: { revision: '准备时旧值' },
        story_state: { open_questions: ['新问题'], last_updated_chapter: 1 },
      },
    })

    expect(accepted.chapter.chapter_text).toBe('验收新正文')
    expect(accepted.project.synopsis).toBe('其他 project patch 仍可写入')
    expect(accepted.project.reference_config).toEqual({
      ...latestProject!.reference_config,
      story_state: { open_questions: ['新问题'], last_updated_chapter: 1 },
    })
  })

  test('keeps acceptance compatible when no generation-source fingerprint was recorded', async () => {
    const workspace = await tempWorkspace()
    const source = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: { server_id: 'buda', key_id: 7, adapter_id: 'buda', agent_id: 'agent-1' },
    }
    const project = await createNovelProject(workspace, {
      title: '无 fingerprint 兼容验收',
      reference_config: { prose_generation_source: source },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '旧正文',
    })
    await updateNovelProject(workspace, project.id, {
      reference_config: {
        prose_generation_source: { ...source, mcp: { ...source.mcp, agent_id: 'agent-2' } },
      },
    })

    const accepted = await commitNovelChapterAcceptance(workspace, {
      chapter_id: chapter.id,
      chapter_patch: { chapter_text: '兼容验收正文' },
    })

    expect(accepted.chapter.chapter_text).toBe('兼容验收正文')
    expect(accepted.project.reference_config?.prose_generation_source)
      .toMatchObject({ mcp: { agent_id: 'agent-2' } })
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
  }, 15_000)

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
