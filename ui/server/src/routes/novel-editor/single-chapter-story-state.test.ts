import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelSettingEntity,
  claimProseQualityReceipt,
  failProseQualityReceipt,
  getNovelProject,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  mutateNovelProjectReferenceConfig,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  withProseQualityReceiptLease,
} from '../../novel'
import { openDb } from '../../novel/core'
import { setNovelMutationTestHook } from '../../novel-test-support'
import { createStoryStateMachineMethods } from '../../novel-writing-service/service/story-state-machine'
import { createProseQualityReview } from './builders'
import { revisionTextHash } from './revision-candidate-admission'
import {
  applySingleChapterStoryState,
  prepareSingleChapterStoryState,
  storyStateReceiptKey,
  type SingleChapterStoryStateReceipt,
} from './single-chapter-story-state'

function parsedPayload(value: any) {
  if (value && typeof value === 'object') return value
  try {
    return JSON.parse(String(value || '{}'))
  } catch {
    return {}
  }
}

function storyStatePayload(key: string) {
  return {
    state_delta: {
      current_time: `${key}-time`,
      character_positions: { [key]: `${key}-location` },
      open_questions: [`${key}-question`],
      next_chapter_priorities: [`${key}-priority`],
      progress_summary: { notes: `${key}-complete` },
    },
    character_updates: [{ name: '李玄', current_state: { [`seen_${key}`]: true } }],
    setting_updates: [{ name: '旧印章', entity_type: 'item', state_delta: { [`state_${key}`]: true } }],
    storyline_updates: [{ name: '追查旧印章', state_delta: { [`story_${key}`]: true } }],
    discovered_assets: [{ name: `${key}新物件`, entity_type: 'item', evidence: `${key}正文证据` }],
  }
}

function executeSql(workspace: string, sql: string) {
  const db = openDb(workspace)
  try {
    db.exec(sql)
  } finally {
    db.close()
  }
}

async function childResult(child: ReturnType<typeof Bun.spawn>) {
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(exitCode, stderr).toBe(0)
  const jsonLine = stdout.trim().split('\n').reverse().find(line => line.trim().startsWith('{')) || ''
  return JSON.parse(jsonLine)
}

async function waitForFile(path: string) {
  const deadline = Date.now() + 5_000
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`)
    await Bun.sleep(5)
  }
}

function spawnBarrieredStoryRelationMaterialization(
  workspace: string,
  projectId: number,
  row: Record<string, any>,
  label: string,
) {
  const readyPath = join(workspace, `${label}-ready`)
  const releasePath = join(workspace, `${label}-release`)
  const relationModule = join(import.meta.dir, '../novel-setting-story-relations.ts')
  const testSupportModule = join(import.meta.dir, '../../novel-test-support.ts')
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { existsSync } from 'fs'
      import { materializeStoryRelations } from ${JSON.stringify(relationModule)}
      import { setNovelMutationTestHook } from ${JSON.stringify(testSupportModule)}
      let blocked = false
      setNovelMutationTestHook(async event => {
        if (blocked || event.phase !== 'before_full_store_write') return
        blocked = true
        await Bun.write(process.argv[4], 'ready')
        while (!existsSync(process.argv[5])) await Bun.sleep(5)
      })
      const result = await materializeStoryRelations(process.argv[1], Number(process.argv[2]), {
        rows: [JSON.parse(process.argv[3])],
      })
      console.log(JSON.stringify(result.summary))
    `, workspace, String(projectId), JSON.stringify(row), readyPath, releasePath],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { child, readyPath, releasePath }
}

describe('single chapter quality review', () => {
  let workspace = ''

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-single-quality-'))
  })

  afterEach(() => {
    setNovelMutationTestHook(null)
    rmSync(workspace, { recursive: true, force: true })
  })

  async function qualityFixture() {
    const project = await createNovelProject(workspace, { title: '单章质检', reference_config: {} } as any)
    const chapters = []
    for (let chapterNo = 1; chapterNo <= 3; chapterNo += 1) {
      chapters.push(await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_goal: `旧目标${chapterNo}`,
        chapter_summary: `旧摘要${chapterNo}`,
        conflict: `旧冲突${chapterNo}`,
        ending_hook: `旧钩子${chapterNo}`,
        chapter_text: `CHAPTER_${chapterNo}_PROSE 主角完成第${chapterNo}章事件。`,
      } as any))
    }
    return { project, chapters }
  }

  test('manual quality invokes one model for the explicit chapter and mutates no sibling chapter', async () => {
    const { project, chapters } = await qualityFixture()
    const before = await listNovelChapters(workspace, project.id)
    const agentCalls: any[] = []
    const contextChapterIds: number[] = []
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: async () => getNovelProject(workspace, project.id),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async (...args: any[]) => {
        agentCalls.push(args)
        return { parsed: { passed: true, score: 91, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => {
        contextChapterIds.push(Number(chapter.id))
        return { chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }
      },
    }

    await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'manual_refresh',
      current_chapter_only: true,
    })

    const after = await listNovelChapters(workspace, project.id)
    const changedIds = after
      .filter(item => JSON.stringify(item) !== JSON.stringify(before.find(previous => previous.id === item.id)))
      .map(item => item.id)
    expect(agentCalls).toHaveLength(1)
    expect(agentCalls[0][0]).toBe('review-agent')
    expect(String(agentCalls[0][2]?.task || '')).toContain('CHAPTER_2_PROSE')
    expect(contextChapterIds).toEqual([chapters[1].id])
    expect(changedIds).toEqual([chapters[1].id])
  })

  test('revision-owned quality reuses the exact chapter receipt and persists receipt fields in review and run', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getWorkspace: () => workspace,
      getProject: async () => getNovelProject(workspace, project.id),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        modelCalls += 1
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => ({ chapter_target: { chapter_id: chapter.id } }),
    }
    const options = {
      source: 'post_revision',
      source_run_id: 44,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }

    const first = await createProseQualityReview(ctx, workspace, project, chapters[1], options)
    const second = await createProseQualityReview(ctx, workspace, project, chapters[1], options)
    const reviews = await listNovelReviews(workspace, project.id)
    const runs = await listNovelRuns(workspace, project.id)
    const payload = parsedPayload(reviews.find(item => item.id === first.saved.id)?.payload)
    const runOutput = parsedPayload(runs.find(item => item.run_type === 'prose_quality')?.output_ref)

    expect(second.saved.id).toBe(first.saved.id)
    expect(modelCalls).toBe(1)
    expect(payload).toMatchObject({ chapter_id: chapters[1].id, source_run_id: 44, candidate_hash: options.candidate_hash })
    expect(runOutput).toMatchObject({
      source_run_id: 44,
      candidate_hash: options.candidate_hash,
      current_chapter_only: true,
    })
  })

  test('revision-owned quality serializes concurrent replay to one model call and review', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        modelCalls += 1
        await new Promise(resolve => setTimeout(resolve, 20))
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async (_workspace: string, _project: any, chapter: any) => ({ chapter_target: { chapter_id: chapter.id } }),
    }
    const options = {
      source: 'post_revision',
      source_run_id: 45,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }

    const [first, second] = await Promise.all([
      createProseQualityReview(ctx, workspace, project, chapters[1], options),
      createProseQualityReview(ctx, workspace, project, chapters[1], options),
    ])

    expect(first.saved.id).toBe(second.saved.id)
    expect(modelCalls).toBe(1)
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(1)
  })

  test('revision-owned quality claims one receipt across independent Bun processes', async () => {
    const { project, chapters } = await qualityFixture()
    const builderModule = join(import.meta.dir, 'builders.ts')
    const novelModule = join(import.meta.dir, '../../novel.ts')
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const childSource = `
      import { writeFileSync } from 'fs'
      import { join } from 'path'
      import { createProseQualityReview } from ${JSON.stringify(builderModule)}
      import { getNovelProject, listNovelChapters } from ${JSON.stringify(novelModule)}
      const workspace = process.argv[1]
      const projectId = Number(process.argv[2])
      const chapterId = Number(process.argv[3])
      const project = await getNovelProject(workspace, projectId)
      const chapter = (await listNovelChapters(workspace, projectId)).find(item => item.id === chapterId)
      const result = await createProseQualityReview({
        getStageModelId: () => 217,
        getStageTemperature: (_project, _stage, fallback) => fallback,
        executeAgent: async () => {
          writeFileSync(join(workspace, 'quality-model-call-' + process.pid), 'called')
          await Bun.sleep(120)
          return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
        },
        buildChapterContextPackage: async (_workspace, _project, current) => ({ chapter_target: { chapter_id: current.id } }),
      }, workspace, project, chapter, {
        source: 'post_revision',
        source_run_id: 451,
        candidate_hash: process.argv[4],
        current_chapter_only: true,
      })
      console.log(JSON.stringify({ savedId: result.saved.id, reused: result.reused }))
    `
    const args = [workspace, String(project.id), String(chapters[1].id), candidateHash]
    const children = [0, 1].map(() => Bun.spawn({
      cmd: [process.execPath, '-e', childSource, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
    }))
    const results = await Promise.all(children.map(childResult))

    expect(new Set(results.map(result => result.savedId)).size).toBe(1)
    expect(readdirSync(workspace).filter(name => name.startsWith('quality-model-call-'))).toHaveLength(1)
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(1)
    const runs = await listNovelRuns(workspace, project.id)
    expect(runs.filter(item => item.run_type === 'prose_quality')).toHaveLength(1)
    expect(runs.some(item => item.run_type === 'prose_quality_receipt')).toBe(false)
  }, 30_000)

  test('quality receipt heartbeat prevents reclaim while the model outlives its initial lease', async () => {
    const { project, chapters } = await qualityFixture()
    const receiptInput = {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4511,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
      owner: 'quality-owner-a',
      leaseMs: 120,
    }
    const claimed = await claimProseQualityReceipt(workspace, receiptInput)
    expect(claimed.state).toBe('claimed')
    let modelCalls = 0
    const running = withProseQualityReceiptLease(workspace, {
      claimRunId: claimed.run.id,
      owner: receiptInput.owner,
      leaseMs: 120,
      heartbeatMs: 30,
    }, async () => {
      modelCalls += 1
      await Bun.sleep(220)
      return 'done'
    })
    await Bun.sleep(170)
    const contender = await claimProseQualityReceipt(workspace, {
      ...receiptInput,
      owner: 'quality-owner-b',
    })

    expect(contender.state).toBe('waiting')
    expect(await running).toBe('done')
    expect(modelCalls).toBe(1)
    await failProseQualityReceipt(workspace, {
      claimRunId: claimed.run.id,
      owner: receiptInput.owner,
      error: Object.assign(new Error('test cleanup'), { code: 'TEST_CLEANUP' }),
    })
  })

  test('quality receipt ignores an in-flight heartbeat after its operation commits success', async () => {
    const { project, chapters } = await qualityFixture()
    const claimed = await claimProseQualityReceipt(workspace, {
      projectId: project.id,
      chapterId: chapters[1].id,
      chapterNo: chapters[1].chapter_no,
      sourceRunId: 4512,
      candidateHash: revisionTextHash(String(chapters[1].chapter_text || '')),
      owner: 'quality-owner-success',
      leaseMs: 120,
    })
    let heartbeatStarted!: () => void
    let releaseHeartbeat!: () => void
    let releaseOperation!: () => void
    const heartbeatStart = new Promise<void>(resolve => { heartbeatStarted = resolve })
    const heartbeatRelease = new Promise<void>(resolve => { releaseHeartbeat = resolve })
    const operationRelease = new Promise<void>(resolve => { releaseOperation = resolve })
    let blocked = false
    setNovelMutationTestHook(async event => {
      if (blocked || event.operation !== 'renew-prose-quality-receipt') return
      blocked = true
      heartbeatStarted()
      await heartbeatRelease
    })
    const running = withProseQualityReceiptLease(workspace, {
      claimRunId: claimed.run.id,
      owner: 'quality-owner-success',
      leaseMs: 120,
      heartbeatMs: 20,
    }, async () => {
      await operationRelease
      return 'committed'
    })
    await heartbeatStart
    executeSql(workspace, `UPDATE runs SET status = 'success', lease_owner = NULL, lease_expires_at = NULL WHERE id = ${Number(claimed.run.id)}`)
    releaseOperation()
    await Bun.sleep(0)
    releaseHeartbeat()

    expect(await running).toBe('committed')
    setNovelMutationTestHook(null)
  })

  test('revision-owned quality rejects an edit made while the model is reviewing', async () => {
    const { project, chapters } = await qualityFixture()
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => {
        await updateNovelChapter(workspace, chapters[1].id, { chapter_text: '正文在质检期间被用户改写。' } as any)
        return { parsed: { passed: true, score: 93, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 452,
      candidate_hash: revisionTextHash(String(chapters[1].chapter_text || '')),
      current_chapter_only: true,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'PROSE_QUALITY_CANDIDATE_STALE' })
    expect((await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')).toHaveLength(0)
    const failedRuns = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')
    expect(failedRuns).toHaveLength(1)
    expect(failedRuns[0]).toMatchObject({ status: 'failed' })
    expect(parsedPayload(failedRuns[0].output_ref)).toMatchObject({
      chapter_id: chapters[1].id,
      source_run_id: 452,
      current_chapter_only: true,
    })
  })

  test('revision-owned quality keeps one durable failed audit when the provider rejects', async () => {
    const { project, chapters } = await qualityFixture()
    const candidateHash = revisionTextHash(String(chapters[1].chapter_text || ''))
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { throw Object.assign(new Error('injected quality provider failure'), { code: 'PROVIDER_FAILED' }) },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 453,
      candidate_hash: candidateHash,
      current_chapter_only: true,
    }).then(() => null, caught => caught)
    const reviews = (await listNovelReviews(workspace, project.id)).filter(item => item.review_type === 'prose_quality')
    const runs = (await listNovelRuns(workspace, project.id)).filter(item => item.run_type === 'prose_quality')

    expect(String(error?.message || '')).toContain('injected quality provider failure')
    expect(reviews).toHaveLength(0)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ status: 'failed' })
    expect(parsedPayload(runs[0].output_ref)).toMatchObject({
      chapter_id: chapters[1].id,
      source_run_id: 453,
      candidate_hash: candidateHash,
      current_chapter_only: true,
      error_code: 'PROVIDER_FAILED',
    })
  })

  test('revision-owned quality rejects a stale candidate receipt before the model call', async () => {
    const { project, chapters } = await qualityFixture()
    let modelCalls = 0
    const ctx: any = {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      executeAgent: async () => { modelCalls += 1; return { parsed: {} } },
      buildChapterContextPackage: async () => ({}),
    }

    const error = await createProseQualityReview(ctx, workspace, project, chapters[1], {
      source: 'post_revision',
      source_run_id: 46,
      candidate_hash: revisionTextHash('older chapter candidate'),
      current_chapter_only: true,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'PROSE_QUALITY_CANDIDATE_STALE' })
    expect(modelCalls).toBe(0)
  })
})

describe('single chapter Story State', () => {
  let workspace = ''

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-single-story-state-'))
  })

  afterEach(() => {
    setNovelMutationTestHook(null)
    rmSync(workspace, { recursive: true, force: true })
  })

  async function storyFixture(chapterCount = 3, execute?: (...args: any[]) => Promise<any>) {
    const project = await createNovelProject(workspace, {
      title: '精确状态同步',
      genre: '悬疑',
      reference_config: { story_state: { character_positions: { seed: 'start' }, open_questions: ['seed'] } },
    } as any)
    const chapters = []
    for (let chapterNo = 1; chapterNo <= chapterCount; chapterNo += 1) {
      chapters.push(await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_text: `CHAPTER_${chapterNo}_TEXT 事情继续。`,
      } as any))
    }
    const character = await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '李玄',
      current_state: { seed: true },
    } as any)
    const item = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'item',
      name: '旧印章',
      state_json: { seed: true },
    } as any)
    const storyline = await createNovelSettingEntity(workspace, {
      project_id: project.id,
      entity_type: 'mainline',
      name: '追查旧印章',
      state_json: { seed: true },
    } as any)
    for (const chapter of chapters.slice(0, 2)) {
      await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [
        { entity_id: item.id, actual_state_change: { seed: true } },
        { entity_id: storyline.id, actual_state_change: { seed: true } },
      ])
    }
    const modelCalls: any[] = []
    let followerRefreshCalls = 0
    let projectReadCalls = 0
    let storyStateUpdateCalls = 0
    const executeAgent = async (...args: any[]) => {
      modelCalls.push(args)
      return execute
        ? execute(...args)
        : { parsed: storyStatePayload(`chapter_${String(args[2]?.task || '').match(/CHAPTER_(\d+)_TEXT/)?.[1] || 'unknown'}`), finish_reason: 'stop' }
    }
    const methods = createStoryStateMachineMethods({
      executeAgent,
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => { followerRefreshCalls += 1 },
    })
    const contextChapterIds: number[] = []
    const ctx: any = {
      getProject: async (_activeWorkspace: string, id: number) => {
        projectReadCalls += 1
        return getNovelProject(workspace, id)
      },
      buildChapterContextPackage: async (_activeWorkspace: string, _project: any, chapter: any) => {
        contextChapterIds.push(Number(chapter.id))
        return { chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no } }
      },
      executeAgent,
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      updateStoryStateMachine: (...args: any[]) => {
        storyStateUpdateCalls += 1
        return (methods.updateStoryStateMachine as any)(...args)
      },
    }
    return {
      project,
      chapters,
      character,
      item,
      storyline,
      ctx,
      modelCalls,
      contextChapterIds,
      followerRefreshCalls: () => followerRefreshCalls,
      projectReadCalls: () => projectReadCalls,
      storyStateUpdateCalls: () => storyStateUpdateCalls,
    }
  }

  function receipt(chapterId: number, hash = `candidate-${chapterId}`, runId: number | null = 44): SingleChapterStoryStateReceipt {
    return { source_run_id: runId, candidate_hash: hash, chapter_id: chapterId }
  }

  test('generic project reference mutation uses the named operation contract', async () => {
    const project = await createNovelProject(workspace, { title: '事务引用配置', reference_config: { seed: true } } as any)
    const mutation = await mutateNovelProjectReferenceConfig(workspace, {
      projectId: project.id,
      operation: 'test-story-state-reference-mutation',
      mutate: currentConfig => ({
        referenceConfig: { ...currentConfig, applied: true },
        result: 'applied',
      }),
    })

    expect(mutation?.result).toBe('applied')
    expect(mutation?.project.reference_config).toMatchObject({ seed: true, applied: true })
  })

  test('rejects a receipt bound to a different chapter before prepare or apply', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const mismatchedReceipt = receipt(fixture.chapters[1].id, 'wrong-chapter')

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: mismatchedReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: mismatchedReceipt,
      prepared: {},
    }).then(() => null, caught => caught)
    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt chapter does not match target chapter')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('requires strict numeric chapter identity in a receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const stringChapterReceipt = { ...receipt(target.id), chapter_id: String(target.id) } as any

    const error = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: stringChapterReceipt,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('rejects a non-canonical candidate hash before prepare or apply', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const emptyHashReceipt = receipt(target.id, ' candidate-with-padding ')

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: emptyHashReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: emptyHashReceipt,
      prepared: {},
    }).then(() => null, caught => caught)
    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt candidate hash must be a non-empty canonical string')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('requires a null or positive integer source run id in a receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const invalidRunReceipt = receipt(target.id, 'invalid-run', 0)

    const prepareError = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: invalidRunReceipt,
    }).then(() => null, caught => caught)
    const applyError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: invalidRunReceipt,
      prepared: {},
    }).then(() => null, caught => caught)

    expect(prepareError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(applyError).toMatchObject({ code: 'INVALID_STORY_STATE_RECEIPT' })
    expect(String(prepareError?.message || '')).toContain('receipt source run id must be null or a positive integer')
    expect(fixture.projectReadCalls()).toBe(0)
    expect(fixture.modelCalls).toHaveLength(0)
  })

  test('30 chapter prepare/apply invokes one model for chapter 1, writes no follower, and replays idempotently', async () => {
    const fixture = await storyFixture(30)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')))
    const followerBefore = (await listNovelChapters(workspace, fixture.project.id)).slice(1)

    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    expect(preparedResult.reused).toBe(false)
    expect(preparedResult.prepared).not.toBeNull()
    expect(fixture.modelCalls).toHaveLength(1)
    expect(fixture.storyStateUpdateCalls()).toBe(0)

    const first = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    const projectAfterFirst = await getNovelProject(workspace, fixture.project.id)
    const reviewCountAfterFirst = (await listNovelReviews(workspace, fixture.project.id)).length
    const contextBuildCountAfterFirst = fixture.contextChapterIds.length
    const replayPrepared = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const second = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: replayPrepared.prepared,
    })
    const projectAfterSecond = await getNovelProject(workspace, fixture.project.id)
    const followerAfter = (await listNovelChapters(workspace, fixture.project.id)).slice(1)
    const reviewsAfter = await listNovelReviews(workspace, fixture.project.id)
    const derivedKeys = reviewsAfter.map(item => parsedPayload(item.payload).derived_key).filter(Boolean)

    expect(first.reused).toBe(false)
    expect(fixture.storyStateUpdateCalls()).toBe(1)
    expect(replayPrepared).toMatchObject({ reused: true, prepared: null })
    expect(second.reused).toBe(true)
    expect(fixture.contextChapterIds).toHaveLength(contextBuildCountAfterFirst)
    expect(projectAfterSecond?.reference_config).toEqual(projectAfterFirst?.reference_config)
    expect(reviewsAfter).toHaveLength(reviewCountAfterFirst)
    expect(new Set(derivedKeys).size).toBe(derivedKeys.length)
    expect(followerAfter.map(item => item.raw_payload)).toEqual(followerBefore.map(item => item.raw_payload))
    expect(fixture.followerRefreshCalls()).toBe(0)
    expect(fixture.contextChapterIds.every(id => id === target.id)).toBe(true)
  }, 30_000)

  test('aborting after prepare and before apply performs zero Story State writes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')))
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const snapshot = async () => ({
      project: (await getNovelProject(workspace, fixture.project.id))?.reference_config,
      characters: (await listNovelCharacters(workspace, fixture.project.id)).map(item => item.current_state),
      settings: (await listNovelSettingEntities(workspace, fixture.project.id)).map(item => item.state_json),
      chapter: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id)?.raw_payload,
      reviews: await listNovelReviews(workspace, fixture.project.id),
    })
    const before = await snapshot()
    const controller = new AbortController()
    controller.abort()

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
      signal: controller.signal,
    }).then(() => null, caught => caught)

    expect(error).not.toBeNull()
    expect(await snapshot()).toEqual(before)
  })

  test('concurrent apply rebases two prepared deltas and retains both receipt keys', async () => {
    const fixture = await storyFixture(3)
    const firstReceipt = receipt(fixture.chapters[0].id, revisionTextHash(String(fixture.chapters[0].chapter_text || '')), 51)
    const secondReceipt = receipt(fixture.chapters[1].id, revisionTextHash(String(fixture.chapters[1].chapter_text || '')), 52)
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[0].id,
        receipt: firstReceipt,
      }),
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[1].id,
        receipt: secondReceipt,
      }),
    ])

    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[0].id,
        receipt: firstReceipt,
        prepared: firstPrepared.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: fixture.chapters[1].id,
        receipt: secondReceipt,
        prepared: secondPrepared.prepared,
      }),
    ])

    const stored = await getNovelProject(workspace, fixture.project.id)
    const storedCharacter = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)
    const storedSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const storedItem = storedSettings.find(item => item.id === fixture.item.id)
    const storedStoryline = storedSettings.find(item => item.id === fixture.storyline.id)
    expect(stored?.reference_config?.story_state?.character_positions).toMatchObject({
      chapter_1: 'chapter_1-location',
      chapter_2: 'chapter_2-location',
    })
    expect(storedCharacter?.current_state).toMatchObject({ seen_chapter_1: true, seen_chapter_2: true })
    expect(storedItem?.state_json).toMatchObject({ state_chapter_1: true, state_chapter_2: true })
    expect(storedStoryline?.state_json).toMatchObject({ story_chapter_1: true, story_chapter_2: true })
    expect(Object.keys(stored?.reference_config?.story_state_sync_receipts || {})).toEqual(expect.arrayContaining([
      storyStateReceiptKey(firstReceipt),
      storyStateReceiptKey(secondReceipt),
    ]))
  }, 30_000)

  test('concurrent exact applies upsert one shared relationship entity', async () => {
    const fixture = await storyFixture(3, async (...args: any[]) => {
      const key = `relation_${String(args[2]?.task || '').match(/CHAPTER_(\d+)_TEXT/)?.[1] || 'unknown'}`
      const payload = storyStatePayload(key)
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const targets = fixture.chapters.slice(0, 2)
    const receipts = targets.map((target, index) => receipt(
      target.id,
      revisionTextHash(String(target.chapter_text || '')),
      520 + index,
    ))
    const prepared = await Promise.all(targets.map((target, index) => prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipts[index],
    })))

    await Promise.all(targets.map((target, index) => applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipts[index],
      prepared: prepared[index].prepared,
    })))

    const relationships = (await listNovelSettingEntities(workspace, fixture.project.id))
      .filter(item => item.entity_type === 'relationship')
    expect(relationships).toHaveLength(1)
  }, 30_000)

  test('relationship pair upsert is unique across independent Bun processes', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    const row = {
      party_a: '李玄',
      party_b: '顾舟',
      current_status: '结盟追查旧印章',
      story_relation_type: '联盟',
    }
    const first = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, row, 'same-pair-first')
    const second = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, row, 'same-pair-second')
    await Promise.all([waitForFile(first.readyPath), waitForFile(second.readyPath)])
    writeFileSync(first.releasePath, 'release')
    writeFileSync(second.releasePath, 'release')
    await Promise.all([childResult(first.child), childResult(second.child)])

    const relationships = (await listNovelSettingEntities(workspace, fixture.project.id))
      .filter(item => item.entity_type === 'relationship')
    expect(relationships).toHaveLength(1)
  }, 30_000)

  test('relationship materialization merges transaction-current character relationships across processes', async () => {
    const fixture = await storyFixture(1)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '顾舟' } as any)
    await createNovelCharacter(workspace, { project_id: fixture.project.id, name: '林青禾' } as any)
    const first = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, {
      party_a: '李玄',
      party_b: '顾舟',
      current_status: '结盟追查旧印章',
      story_relation_type: '联盟',
    }, 'different-pair-first')
    const second = spawnBarrieredStoryRelationMaterialization(workspace, fixture.project.id, {
      party_a: '李玄',
      party_b: '林青禾',
      current_status: '有限互信并交换线索',
      story_relation_type: '联盟',
    }, 'different-pair-second')
    await Promise.all([waitForFile(first.readyPath), waitForFile(second.readyPath)])
    writeFileSync(first.releasePath, 'release')
    writeFileSync(second.releasePath, 'release')
    await Promise.all([childResult(first.child), childResult(second.child)])

    const stored = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.name === '李玄')
    const targets = (stored?.relationships || []).map((item: any) => String(item?.name || item?.target || item))
    expect(targets).toEqual(expect.arrayContaining(['顾舟', '林青禾']))
  }, 30_000)

  test('concurrent receipts merge nested state into the same chapter entity and usage rows', async () => {
    let prepareCalls = 0
    const fixture = await storyFixture(3, async () => {
      prepareCalls += 1
      const key = `receipt_${prepareCalls}`
      const payload = storyStatePayload(key)
      payload.character_updates[0].current_state.nested = { [key]: true }
      payload.setting_updates[0].state_delta.nested = { [key]: true }
      payload.storyline_updates[0].state_delta.nested = { [key]: true }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const candidateHash = revisionTextHash(String(target.chapter_text || ''))
    const firstReceipt = receipt(target.id, candidateHash, 53)
    const secondReceipt = receipt(target.id, candidateHash, 54)
    const [firstPrepared, secondPrepared] = await Promise.all([
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: firstReceipt,
      }),
      prepareSingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: secondReceipt,
      }),
    ])

    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: firstReceipt,
        prepared: firstPrepared.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: secondReceipt,
        prepared: secondPrepared.prepared,
      }),
    ])

    const stored = await getNovelProject(workspace, fixture.project.id)
    const storedCharacter = (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)
    const storedSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const storedItem = storedSettings.find(item => item.id === fixture.item.id)
    const storedStoryline = storedSettings.find(item => item.id === fixture.storyline.id)
    const storedUsage = await listNovelChapterSettingUsage(workspace, fixture.project.id, target.id)
    const itemUsage = storedUsage.find(item => item.entity_id === fixture.item.id)
    const storylineUsage = storedUsage.find(item => item.entity_id === fixture.storyline.id)

    expect(stored?.reference_config?.story_state?.character_positions).toMatchObject({
      receipt_1: 'receipt_1-location',
      receipt_2: 'receipt_2-location',
    })
    expect(storedCharacter?.current_state).toMatchObject({ seen_receipt_1: true, seen_receipt_2: true })
    expect(storedItem?.state_json).toMatchObject({ state_receipt_1: true, state_receipt_2: true })
    expect(storedStoryline?.state_json).toMatchObject({ story_receipt_1: true, story_receipt_2: true })
    expect(itemUsage?.actual_state_change).toMatchObject({ state_receipt_1: true, state_receipt_2: true })
    expect(storylineUsage?.actual_state_change).toMatchObject({ story_receipt_1: true, story_receipt_2: true })
    expect(storedCharacter?.current_state?.nested).toMatchObject({ receipt_1: true, receipt_2: true })
    expect(storedItem?.state_json?.nested).toMatchObject({ receipt_1: true, receipt_2: true })
    expect(storedStoryline?.state_json?.nested).toMatchObject({ receipt_1: true, receipt_2: true })
    expect(itemUsage?.actual_state_change?.nested).toMatchObject({ receipt_1: true, receipt_2: true })
    expect(storylineUsage?.actual_state_change?.nested).toMatchObject({ receipt_1: true, receipt_2: true })
  }, 30_000)

  test('resumes state-applied derived materialization without another model call', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 61)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const updateStoryStateMachine = fixture.ctx.updateStoryStateMachine
    let failDerivedReview = true
    fixture.ctx.updateStoryStateMachine = (...args: any[]) => updateStoryStateMachine(
      ...args.slice(0, 6),
      {
        ...(args[6] || {}),
        saveDerivedReview: failDerivedReview
          ? async () => { throw new Error('simulated derived review failure') }
          : undefined,
      },
    )
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('simulated derived review failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(stateApplied?.prepared_for_recovery?.receipt_binding).toBeUndefined()
    expect(fixture.modelCalls).toHaveLength(1)

    failDerivedReview = false
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const recoveredApply = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(recoveredPrepare.reused).toBe(true)
    expect(recoveredPrepare.prepared).toBeTruthy()
    expect(recoveredPrepare.prepared?.receipt_binding).toMatchObject({ key: receiptKey })
    expect(recoveredApply.reused).toBe(true)
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(completed?.prepared_for_recovery).toBeUndefined()
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('keeps exact receipt state-applied when relation materialization fails and recovers without another model call', async () => {
    const fixture = await storyFixture(3, async () => {
      const payload = storyStatePayload('relation_failure')
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 62)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_exact_story_relation_insert
      BEFORE INSERT ON setting_entities WHEN NEW.entity_type = 'relationship'
      BEGIN SELECT RAISE(ABORT, 'injected relation materialization failure'); END;
    `)

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('injected relation materialization failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(fixture.modelCalls).toHaveLength(1)

    executeSql(workspace, 'DROP TRIGGER fail_exact_story_relation_insert')
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('concurrent recovery creates each receipt-derived review once', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 621)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const updateStoryStateMachine = fixture.ctx.updateStoryStateMachine
    let failFirstReview = true
    fixture.ctx.updateStoryStateMachine = (...args: any[]) => updateStoryStateMachine(
      ...args.slice(0, 6),
      {
        ...(args[6] || {}),
        saveDerivedReview: failFirstReview
          ? async () => { throw new Error('pause receipt at state-applied') }
          : undefined,
      },
    )
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).catch(() => null)

    failFirstReview = false
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await Promise.all([
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: recoveredPrepare.prepared,
      }),
      applySingleChapterStoryState(fixture.ctx, {
        workspace,
        projectId: fixture.project.id,
        chapterId: target.id,
        receipt: exactReceipt,
        prepared: recoveredPrepare.prepared,
      }),
    ])
    const receiptReviews = (await listNovelReviews(workspace, fixture.project.id))
      .filter(item => parsedPayload(item.payload).story_state_receipt_key === receiptKey)
    const derivedKeys = receiptReviews.map(item => parsedPayload(item.payload).derived_key)

    expect(receiptReviews.length).toBeGreaterThan(0)
    expect(new Set(derivedKeys).size).toBe(derivedKeys.length)
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('keeps exact receipt state-applied when chapter raw-payload write fails and recovers without another model call', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 63)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_exact_story_state_raw_payload
      BEFORE UPDATE ON chapters WHEN OLD.id = ${target.id}
      BEGIN SELECT RAISE(ABORT, 'injected story state raw payload failure'); END;
    `)

    const firstError = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    const stateApplied = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(String(firstError?.message || '')).toContain('injected story state raw payload failure')
    expect(stateApplied).toMatchObject({ status: 'state_applied', chapter_id: target.id })
    expect(stateApplied?.prepared_for_recovery).toBeTruthy()
    expect(fixture.modelCalls).toHaveLength(1)

    executeSql(workspace, 'DROP TRIGGER fail_exact_story_state_raw_payload')
    const recoveredPrepare = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: recoveredPrepare.prepared,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(completed).toMatchObject({ status: 'completed', chapter_id: target.id })
    expect(fixture.modelCalls).toHaveLength(1)
  }, 30_000)

  test('non-exact Story State keeps relation and chapter raw-payload writes best-effort', async () => {
    const fixture = await storyFixture(3, async () => {
      const payload = storyStatePayload('non_exact_failure')
      payload.state_delta.character_relationships = { '李玄-顾舟': '结盟追查旧印章' }
      return { parsed: payload, finish_reason: 'stop' }
    })
    const target = fixture.chapters[0]
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 64),
    })
    executeSql(workspace, `
      CREATE TRIGGER fail_non_exact_story_relation_insert
      BEFORE INSERT ON setting_entities WHEN NEW.entity_type = 'relationship'
      BEGIN SELECT RAISE(ABORT, 'injected non-exact relation failure'); END;
      CREATE TRIGGER fail_non_exact_story_state_raw_payload
      BEFORE UPDATE ON chapters WHEN OLD.id = ${target.id}
      BEGIN SELECT RAISE(ABORT, 'injected non-exact raw payload failure'); END;
    `)

    const result = await fixture.ctx.updateStoryStateMachine(
      workspace,
      fixture.project,
      target,
      { chapter_target: { chapter_id: target.id, chapter_no: target.chapter_no } },
      String(target.chapter_text || ''),
      undefined,
      { prepared: preparedResult.prepared },
    )

    expect(result.story_relation_materialize_error).toContain('injected non-exact relation failure')
  }, 30_000)

  test('completed replay returns the compact durable receipt payload', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 65)
    const receiptKey = storyStateReceiptKey(exactReceipt)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const first = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    const replay = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: null,
    })
    const completed = (await getNovelProject(workspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]

    expect(completed?.prepared_for_recovery).toBeUndefined()
    expect(completed?.payload).toEqual(first.update)
    expect(replay).toMatchObject({ reused: true, update: first.update })
  }, 30_000)

  test('prepare binds the prepared delta to its receipt and apply rejects another valid receipt', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const candidateHash = revisionTextHash(String(target.chapter_text || ''))
    const preparedReceipt = receipt(target.id, candidateHash, 66)
    const otherReceipt = receipt(target.id, candidateHash, 67)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: preparedReceipt,
    })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: otherReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)

    expect(preparedResult.prepared?.receipt_binding).toMatchObject({ key: storyStateReceiptKey(preparedReceipt) })
    expect(error).toMatchObject({ code: 'STORY_STATE_PREPARED_RECEIPT_MISMATCH' })
  })

  test('apply rejects a prepared delta after the chapter candidate changes', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 68)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    await updateNovelChapter(workspace, target.id, { chapter_text: `${target.chapter_text} NEW_REVISION` }, { createVersion: false })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_CANDIDATE_STALE' })
  })

  test('apply revalidates the candidate inside the project receipt transaction', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 681)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const beforeProject = await getNovelProject(workspace, fixture.project.id)
    const beforeCharacters = await listNovelCharacters(workspace, fixture.project.id)
    const beforeSettings = await listNovelSettingEntities(workspace, fixture.project.id)
    const beforeReviews = await listNovelReviews(workspace, fixture.project.id)
    let injected = false
    setNovelMutationTestHook(event => {
      if (injected || event.operation !== 'apply-exact-story-state') return
      injected = true
      executeSql(workspace, `UPDATE chapters SET chapter_text = 'EDITED_DURING_APPLY' WHERE id = ${Number(target.id)}`)
    })

    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    }).then(() => null, caught => caught)
    setNovelMutationTestHook(null)
    const afterProject = await getNovelProject(workspace, fixture.project.id)

    expect(injected).toBe(true)
    expect(error).toMatchObject({ code: 'STORY_STATE_CANDIDATE_STALE' })
    expect(afterProject?.reference_config).toEqual(beforeProject?.reference_config)
    expect(await listNovelCharacters(workspace, fixture.project.id)).toEqual(beforeCharacters)
    expect(await listNovelSettingEntities(workspace, fixture.project.id)).toEqual(beforeSettings)
    expect(await listNovelReviews(workspace, fixture.project.id)).toEqual(beforeReviews)
  })

  test('apply requires prepared state when no completed receipt exists', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const error = await applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 69),
      prepared: null,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'STORY_STATE_PREPARED_REQUIRED' })
  })

  test('exact prepare disables application-level retry for truncated model output', async () => {
    const fixture = await storyFixture(3, async () => ({ parsed: { state_delta: {} }, finish_reason: 'length' }))
    const target = fixture.chapters[0]
    const result = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: receipt(target.id, revisionTextHash(String(target.chapter_text || ''))),
    })

    expect(result.prepared?.hard_failures).toContainEqual(expect.objectContaining({ key: 'story_state_transport_incomplete' }))
    expect(fixture.modelCalls).toHaveLength(1)
  })

  test('replay keeps character, setting, usage, raw payload, relation and asset-derived reviews idempotent', async () => {
    const fixture = await storyFixture(3)
    const target = fixture.chapters[0]
    const exactReceipt = receipt(target.id, revisionTextHash(String(target.chapter_text || '')), 77)
    const preparedResult = await prepareSingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
    })
    const apply = () => applySingleChapterStoryState(fixture.ctx, {
      workspace,
      projectId: fixture.project.id,
      chapterId: target.id,
      receipt: exactReceipt,
      prepared: preparedResult.prepared,
    })
    await apply()
    const semanticSnapshot = async () => ({
      character: (await listNovelCharacters(workspace, fixture.project.id)).find(item => item.id === fixture.character.id)?.current_state,
      settings: (await listNovelSettingEntities(workspace, fixture.project.id)).map(item => ({ id: item.id, state: item.state_json })),
      usages: (await listNovelChapterSettingUsage(workspace, fixture.project.id, target.id)).map(item => ({ entity_id: item.entity_id, state: item.actual_state_change })),
      raw: (await listNovelChapters(workspace, fixture.project.id)).find(item => item.id === target.id)?.raw_payload,
      reviews: (await listNovelReviews(workspace, fixture.project.id)).map(item => ({ type: item.review_type, key: parsedPayload(item.payload).derived_key })),
    })
    const once = await semanticSnapshot()
    await apply()
    const twice = await semanticSnapshot()

    expect(twice).toEqual(once)
    expect(twice.reviews.some(item => item.type === 'asset_intake')).toBe(true)
    expect(twice.raw?.prose_admission?.story_state_status).toBe('synced')
  }, 30_000)
})
