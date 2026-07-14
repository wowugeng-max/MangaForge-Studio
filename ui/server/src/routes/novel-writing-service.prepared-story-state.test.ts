import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createNovelWritingService } from './novel-writing-service'
import { createNovelReferenceService } from './novel-reference-service'
import {
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
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelProject,
} from '../novel'
import { buildPipelineProse, createProsePipelineHarness } from './novel-writing-service.test-support'
import { normalizeProseForStorage } from '../novel-writing/chapter-prose-storage-patch'

function acceptedQualityReviewPayload() {
  return {
    score: 88,
    publishable: true,
    dimensions: {
      continuity: 9,
      core_promise_agency: 9,
      conflict_causality: 9,
      payoff_hook: 9,
      prose_style: 9,
      fact_setting_safety: 9,
    },
    findings: [],
    next_chapter_quality_plan: {
      version: 'oh_story_next_chapter_quality_plan_v1',
      quality_focus: ['下一章继续压住当前冲突。'],
      opening_actions: ['前300字原地承接本章章末动作。'],
      middle_actions: ['中段兑现一次规则反制。'],
      ending_actions: ['章末留下可追读的新问题。'],
      avoid_repetition: ['不要重复解释本章规则。'],
      evidence_basis: ['本章已经写出当前冲突的可定位证据。'],
      ending_contract: {
        final_state: '江澈已夺下通讯器并逼近指挥频道。',
        unresolved_question: '幕后指挥者为何知道江澈旧名？',
        next_chapter_pull: '江澈将沿频道入口继续追击。',
        handoff_to_next: '从夺取通讯器后的即时追击开场。',
      },
    },
  }
}

describe('prepareStoryStateUpdate', () => {
  let workspace = ''
  let previous: string | undefined
  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mangaforge-prepared-state-'))
    previous = process.env.MEMPALACE_DIR
    process.env.MEMPALACE_DIR = workspace
  })
  afterEach(() => {
    if (previous === undefined) delete process.env.MEMPALACE_DIR
    else process.env.MEMPALACE_DIR = previous
    rmSync(workspace, { recursive: true, force: true })
  })

  const createService = (result: any) => createNovelWritingService({
    getProject: async () => null,
    production: {
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    } as any,
    reference: {} as any,
    runtime: { executeAgent: async () => result },
  })

  test('returns a normalized prepared update without persistence', async () => {
    let memoryCalls = 0
    const project = await createNovelProject(workspace, { title: '准备阶段边界', reference_config: { story_state: { open_questions: ['旧问题'] } } })
    const chapter = await createNovelChapter(workspace, { project_id: project.id, chapter_no: 12, title: '门后' })
    const character = await createNovelCharacter(workspace, { project_id: project.id, name: '李玄', current_state: { injured: false } } as any)
    const setting = await createNovelSettingEntity(workspace, { project_id: project.id, entity_type: 'item', name: '旧印章', state_json: { intact: true } } as any)
    await replaceNovelChapterSettingUsage(workspace, project.id, chapter.id, [{ entity_id: setting.id, actual_state_change: { seen: false } }])
    await createNovelReview(workspace, { project_id: project.id, review_type: 'seed', status: 'ok', payload: { seed: true } } as any)
    const before = {
      project: (await getNovelProject(workspace, project.id))?.reference_config,
      character: (await listNovelCharacters(workspace, project.id)).find(item => item.id === character.id)?.current_state,
      setting: (await listNovelSettingEntities(workspace, project.id)).find(item => item.id === setting.id)?.state_json,
      usage: (await listNovelChapterSettingUsage(workspace, project.id, chapter.id))[0]?.actual_state_change,
      reviews: await listNovelReviews(workspace, project.id),
    }
    const service = createNovelWritingService({
      getProject: async () => project,
      production: { getStageModelId: () => 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
      reference: {} as any,
      runtime: {
        storeChapterProseMemory: async () => { memoryCalls += 1 },
        executeAgent: async () => ({
          parsed: {
            stateDelta: { openQuestions: ['门后的人是谁'] },
            characterUpdates: [{ name: '李玄', currentState: { injured: true } }],
            settingUpdates: [],
            storylineUpdates: [],
          },
          finish_reason: 'stop',
        }),
      },
    })
    const prepared = await service.prepareStoryStateUpdate(workspace, project, chapter, {}, '李玄推开了门。')
    const after = {
      project: (await getNovelProject(workspace, project.id))?.reference_config,
      character: (await listNovelCharacters(workspace, project.id)).find(item => item.id === character.id)?.current_state,
      setting: (await listNovelSettingEntities(workspace, project.id)).find(item => item.id === setting.id)?.state_json,
      usage: (await listNovelChapterSettingUsage(workspace, project.id, chapter.id))[0]?.actual_state_change,
      reviews: await listNovelReviews(workspace, project.id),
    }

    expect(prepared.state_delta.open_questions).toEqual(['门后的人是谁'])
    expect(prepared.character_updates).toHaveLength(1)
    expect(prepared.next_reference_config.story_state.last_updated_chapter).toBe(12)
    expect(prepared.payload.character_state_delta_sync).toBe(prepared.sync_reports.character_state_delta_sync)
    expect(JSON.stringify(after)).toBe(JSON.stringify(before))
    expect(memoryCalls).toBe(0)
  })

  test('fails closed on incomplete transport before any commit wrapper is called', async () => {
    const service = createService({ parsed: { state_delta: {} }, finish_reason: 'length' })
    const prepared = await service.prepareStoryStateUpdate(workspace, {
      id: 92, reference_config: { story_state: {} },
    }, { id: 13, chapter_no: 13, title: '断流' }, {}, '文本')

    expect(prepared.hard_failures).toContainEqual(expect.objectContaining({ key: 'story_state_transport_incomplete' }))
  })

  test('detects nested rejected finish reasons and non-null incomplete details', async () => {
    for (const result of [
      { parsed: { state_delta: { open_questions: ['x'] } }, raw: { choices: [{ finish_reason: 'max_tokens' }] } },
      { parsed: { state_delta: { open_questions: ['x'] } }, raw: { response: { incomplete_details: {} } } },
      { parsed: { state_delta: { open_questions: ['x'] } }, raw: { finish_reason: 'tool_calls' } },
    ]) {
      const prepared = await createService(result).prepareStoryStateUpdate(workspace, { id: 93, reference_config: { story_state: {} } }, { id: 14, chapter_no: 14 }, {}, '文本')
      expect(prepared.hard_failures).toContainEqual(expect.objectContaining({ key: 'story_state_transport_incomplete' }))
    }
  })

  test('promotes prose-visible relationship and asset omissions to a prepared hard failure', async () => {
    const prepared = await createService({ parsed: {
      state_delta: { current_time: '子时' },
      character_updates: [], setting_updates: [], storyline_updates: [], discovered_assets: [],
    }, finish_reason: 'stop' }).prepareStoryStateUpdate(
      workspace,
      { id: 95, reference_config: { story_state: {} } },
      { id: 16, chapter_no: 16 },
      {},
      '旧印章被李玄夺走。李玄与林青禾从盟友变成敌人。',
    )

    expect(prepared.sync_reports.state_delta_completeness.missed_count).toBeGreaterThan(0)
    expect(prepared.hard_failures).toContainEqual(expect.objectContaining({ key: 'state_delta_completeness' }))
  })

  test('keeps vague questions, names, and ordinary room movement advisory', async () => {
    for (const prose of ['门后的人是谁？', '他在纸上看见一个名字。', '李玄离开椅子，进入浴室洗手。']) {
      const prepared = await createService({ parsed: { state_delta: { current_time: '子时' } }, finish_reason: 'stop' })
        .prepareStoryStateUpdate(workspace, { id: 96, reference_config: { story_state: {} } }, { id: 17, chapter_no: 17 }, {}, prose)
      expect(prepared.hard_failures.some((item: any) => item.key === 'state_delta_completeness')).toBe(false)
    }
  })

  test('does not cross-contaminate a recorded injury into a vague handoff question', async () => {
    const prepared = await createService({ parsed: {
      state_delta: { current_time: '子时' },
      character_updates: [{ name: '李玄', current_state: { injured: true } }],
    }, finish_reason: 'stop' }).prepareStoryStateUpdate(
      workspace,
      { id: 97, reference_config: { story_state: {} } },
      { id: 18, chapter_no: 18 },
      {},
      '李玄受伤后，随口问了一句：你是谁？',
    )

    expect(prepared.sync_reports.state_delta_completeness.missed.map((item: any) => item.key)).toContain('foreshadowing_or_handoff')
    expect(prepared.sync_reports.state_delta_completeness.blocking_missed).toEqual([])
    expect(prepared.hard_failures.some((item: any) => item.key === 'state_delta_completeness')).toBe(false)
  })

  test('blocks independent high-confidence character, location, and chapter-tail changes', async () => {
    const cases = [
      { prose: '李玄受伤倒地。', key: 'character_state' },
      { prose: '李玄离开临江城。', key: 'timeline' },
      { prose: '章末他决定下一章必须追查谁。', key: 'foreshadowing_or_handoff' },
    ]
    for (const item of cases) {
      const prepared = await createService({ parsed: { state_delta: { progress_summary: '本章已完成' } }, finish_reason: 'stop' })
        .prepareStoryStateUpdate(workspace, { id: 98, reference_config: { story_state: {} } }, { id: 19, chapter_no: 19 }, {}, item.prose)
      expect(prepared.sync_reports.state_delta_completeness.blocking_missed).toContainEqual(expect.objectContaining({ key: item.key }))
      expect(prepared.hard_failures).toContainEqual(expect.objectContaining({ key: 'state_delta_completeness' }))
    }
  })

  test('prepared hard failure prevents wrapper writes and reuses the single agent call', async () => {
    let calls = 0
    const service = createNovelWritingService({
      getProject: async () => null,
      production: { getStageModelId: () => 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
      reference: {} as any,
      runtime: { executeAgent: async () => { calls += 1; return { parsed: { state_delta: {} }, finish_reason: 'stop' } } },
    })
    const project = { id: 94, reference_config: { story_state: {} } }
    const chapter = { id: 15, chapter_no: 15 }
    const prepared = await service.prepareStoryStateUpdate(workspace, project, chapter, {}, '文本')
    const error = await service.updateStoryStateMachine(workspace, project, chapter, {}, '文本', 217, { prepared }).then(() => null, (caught: any) => caught)

    expect(error?.code).toBe('STORY_STATE_PREPARE_BLOCKED')
    expect(calls).toBe(1)
  })

  test('stores prose with pending Story State when completeness preparation fails', async () => {
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: buildPipelineProse('旧印章被李玄夺走。李玄与林青禾从盟友变成敌人。', '主动夺下追捕通讯器，迫使封锁队改变阵型'),
      storyStatePayload: { state_delta: { current_time: '子时' }, character_updates: [], setting_updates: [], storyline_updates: [] },
    })
    harness.project.reference_config.story_state = { open_questions: ['旧状态问题仍可读'] }
    await updateNovelProject(harness.workspace, harness.project.id, { reference_config: harness.project.reference_config } as any)
    const snapshot = async () => ({
      project: await getNovelProject(harness.workspace, harness.project.id),
      chapter: (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })
    const before = await snapshot()
    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      quality_threshold: 78,
      approvals: { quality_gate: { approved: true } },
    })
    const after = await snapshot()

    expect(result).toMatchObject({
      admission_status: 'accepted_with_warnings',
      story_state_status: 'pending',
      story_state_warning: expect.any(Object),
    })
    expect(result.quality_warnings).toContainEqual(expect.objectContaining({ source: 'story_state', code: 'state_delta_completeness' }))
    expect(harness.modelCalls.story_state).toBe(1)
    expect(after.project?.reference_config).toEqual(before.project?.reference_config)
    expect(after.characters).toEqual(before.characters)
    expect(after.settings).toEqual(before.settings)
    expect(after.usage).toEqual(before.usage)
    expect(after.chapter?.chapter_text).not.toBe(before.chapter?.chapter_text)
    expect(after.versions.length).toBeGreaterThan(before.versions.length)
    expect(after.reviews.length).toBeGreaterThan(before.reviews.length)
    expect(harness.storeCalls).toBe(1)
    expect(harness.commitOrder).toEqual(['commit', 'memory'])
    expect(harness.memoryTexts).toEqual([after.chapter?.chapter_text])

    const nextChapter = await createNovelChapter(harness.workspace, {
      project_id: harness.project.id,
      chapter_no: 11,
      title: '继续追击',
    })
    const storedProject = await getNovelProject(harness.workspace, harness.project.id)
    const generationContext = await harness.service.buildChapterContextPackage(
      harness.workspace,
      storedProject,
      nextChapter,
      await listNovelChapters(harness.workspace, harness.project.id),
      await listNovelWorldbuilding(harness.workspace, harness.project.id),
      await listNovelCharacters(harness.workspace, harness.project.id),
      [],
      await listNovelReviews(harness.workspace, harness.project.id),
      { settingEntities: await listNovelSettingEntities(harness.workspace, harness.project.id) },
    )
    expect(JSON.stringify(generationContext)).toContain('旧状态问题仍可读')
    expect(JSON.stringify(generationContext)).toContain('主动夺下追捕通讯器')
  })

  test('stores prose as pending for invalid and thrown Story State preparation', async () => {
    for (const storyStatePayload of [
      { state_delta: {} },
      new Proxy({}, { get: () => { throw new Error('story state payload getter failed') } }),
    ]) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText: buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击'),
        qualityGateEnabled: false,
        reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
        storyStatePayload,
      })
      const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
        model_id: 217,
        target_word_count: 1000,
      })

      expect(result.story_state_status).toBe('pending')
      expect(result.admission_status).toBe('accepted_with_warnings')
      expect(harness.modelCalls.story_state).toBe(1)
      expect(harness.commitOrder).toEqual(['commit', 'memory'])
    }
  })

  test('redacts pending Story State errors in both the update payload and admission warning', async () => {
    const secretError = 'https://state.example/sync?api_key=STATE_QUERY Bearer STATE_BEARER token=STATE_TOKEN'
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击'),
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      storyStateError: new Error(secretError),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
    })

    expect(result.story_state_status).toBe('pending')
    expect(result.story_state_update?.error).toBe(result.story_state_warning?.error)
    expect(result.story_state_update?.error).toContain('[REDACTED_URL]')
    for (const sentinel of ['state.example', 'STATE_QUERY', 'STATE_BEARER', 'STATE_TOKEN']) {
      expect(result.story_state_update?.error).not.toContain(sentinel)
      expect(result.story_state_warning?.error).not.toContain(sentinel)
    }
  })

  test('marks atomic acceptance validation failure blocked_invalid and rolls back before Memory', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵的包围线被迫后撤。', '主动夺下通讯器并推进追击')
    const chapterUsage: any[] = []
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      referenceService: createNovelReferenceService(),
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      contextPackageOverride: {
        setting_context: {
          auto_matched: true,
          chapter_usage: chapterUsage,
        },
      },
      storyStatePayload: {
        state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
      },
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'item',
      name: '重复验收实体',
      state_json: {},
    } as any)
    chapterUsage.push(
      { entity_id: setting.id, usage_type: 'required', required: true },
      { entity_id: setting.id, usage_type: 'allowed', allowed: true },
    )
    const before = JSON.stringify({
      project: await getNovelProject(harness.workspace, harness.project.id),
      chapters: await listNovelChapters(harness.workspace, harness.project.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })

    const outcome = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
    }).then((result: any) => ({ result, error: null }), (error: any) => ({ result: null, error }))
    const error = outcome.error
    const after = JSON.stringify({
      project: await getNovelProject(harness.workspace, harness.project.id),
      chapters: await listNovelChapters(harness.workspace, harness.project.id),
      versions: await listChapterVersions(harness.workspace, harness.chapter.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      reviews: await listNovelReviews(harness.workspace, harness.project.id),
    })

    expect(outcome.result).toBeNull()
    expect(error?.admission_status).toBe('blocked_invalid')
    expect(error?.admission_failure).toMatchObject({ code: 'atomic_acceptance_failed', source: 'atomic' })
    expect(after).toBe(before)
    expect((await listNovelReviews(harness.workspace, harness.project.id)).filter(item => item.review_type === 'reference_report')).toEqual([])
    expect(harness.memoryTexts).toEqual([])
  })

  test('accepted production atomically commits prepared state before memory without a second story-state call', async () => {
    const finalText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const expectedText = normalizeProseForStorage(finalText)
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      storyStatePayload: {
        state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
        character_updates: [{ name: '江澈', current_state: { location: '指挥频道入口' } }],
        setting_updates: [],
        storyline_updates: [],
      },
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      auto_repair_quality_gate: true,
    })
    const storedProject = await getNovelProject(harness.workspace, harness.project.id)
    const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const storedCharacter = (await listNovelCharacters(harness.workspace, harness.project.id)).find(item => item.name === '江澈')

    expect(result.chapter?.chapter_text).toBe(expectedText)
    expect(storedChapter?.chapter_text).toBe(expectedText)
    expect(storedProject?.reference_config?.story_state).toMatchObject({
      open_questions: ['幕后指挥者为何知道江澈旧名'],
      last_updated_chapter: harness.chapter.chapter_no,
    })
    expect(storedCharacter?.current_state).toMatchObject({ location: '指挥频道入口', last_seen_chapter: harness.chapter.chapter_no })
    expect(harness.modelCalls.story_state).toBe(1)
    expect(harness.commitOrder).toEqual(['commit', 'memory'])
  })

  test('accepts a prepared setting state change when the chapter has no matching usage', async () => {
    const finalText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      storyStatePayload: {
        state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
        character_updates: [],
        setting_updates: [{
          name: '未调用印章',
          entity_type: 'item',
          state_delta: { owner: '江澈' },
          actual_state_change: { owner: '江澈' },
        }],
        storyline_updates: [],
      },
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'item',
      name: '未调用印章',
      state_json: { owner: '无人' },
    } as any)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      auto_repair_quality_gate: true,
    })
    const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const storedSetting = (await listNovelSettingEntities(harness.workspace, harness.project.id)).find(item => item.id === setting.id)
    const storedUsage = await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id)
    const storedProject = await getNovelProject(harness.workspace, harness.project.id)
    const storedReviews = await listNovelReviews(harness.workspace, harness.project.id)

    expect(result.chapter?.chapter_text).toBe(storedChapter?.chapter_text)
    expect(storedSetting?.state_json).toMatchObject({ owner: '江澈', last_seen_chapter: harness.chapter.chapter_no })
    expect(storedProject?.reference_config?.story_state?.last_updated_chapter).toBe(harness.chapter.chapter_no)
    expect(storedReviews.length).toBeGreaterThan(0)
    expect(storedUsage).toEqual([])
    expect(harness.commitOrder).toEqual(['commit', 'memory'])
  })

  test('merges a prepared setting state change into an existing chapter usage', async () => {
    const finalText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      storyStatePayload: {
        state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
        character_updates: [],
        setting_updates: [{
          name: '已调用印章',
          entity_type: 'item',
          state_delta: { owner: '江澈' },
          actual_state_change: { owner: '江澈' },
        }],
        storyline_updates: [],
      },
    })
    const setting = await createNovelSettingEntity(harness.workspace, {
      project_id: harness.project.id,
      entity_type: 'item',
      name: '已调用印章',
      state_json: { owner: '无人' },
    } as any)
    await replaceNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id, [{
      entity_id: setting.id,
      actual_state_change: { seen: true },
    }])

    await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      auto_repair_quality_gate: true,
    })
    const storedUsage = await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id)

    expect(storedUsage).toHaveLength(1)
    expect(storedUsage[0].entity_id).toBe(setting.id)
    expect(storedUsage[0].actual_state_change).toEqual({ seen: true, owner: '江澈' })
  })

  test('keeps accepted production successful when post-commit hooks, stages, or sync work fail', async () => {
    const finalText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    for (const failure of ['after_commit_hook', 'story_state_stage', 'post_commit_sync']) {
      const harness = await createProsePipelineHarness(createNovelWritingService, {
        draftText: finalText,
        qualityGateEnabled: false,
        reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
        storyStatePayload: {
          state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
          character_updates: [],
          setting_updates: [],
          storyline_updates: [],
        },
        ...(failure === 'after_commit_hook' ? { afterCommitError: new Error('after commit hook failed') } : {}),
        ...(failure === 'post_commit_sync' ? { postCommitSyncError: new Error('post commit sync failed') } : {}),
      })
      const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
        model_id: 217,
        target_word_count: 1000,
        quality_threshold: 78,
        auto_repair_quality_gate: true,
        ...(failure === 'story_state_stage' ? {
          onStage: async (stage: string, payload: any) => {
            if (stage === 'story_state' && payload?.status === 'success') throw new Error('story state stage failed')
          },
        } : {}),
      })
      const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)

      expect(storedChapter?.chapter_text).toBe(result.chapter?.chapter_text)
      expect(storedChapter?.raw_payload?.prose_admission).toMatchObject({
        status: 'accepted_with_warnings',
        post_commit_warnings: [expect.objectContaining({ stage: failure })],
      })
      expect(result.chapter?.raw_payload?.prose_admission).toEqual(storedChapter?.raw_payload?.prose_admission)
      expect(harness.commitOrder).toEqual(['commit', 'memory'])
      expect(result.post_commit_warnings).toContainEqual(expect.objectContaining({ stage: failure }))
    }
  })

  test('atomically accepts staged chapter and worldbuilding repair with prose and story state', async () => {
    const finalText = buildPipelineProse(
      '江澈踏碎路面，飞石逼退第一排追兵，铁门前终于露出缺口。',
      '借自己制造的盲区夺下通讯器，继续迫使追捕队后撤',
    )
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      contextPackageOverride: {
        preflight: {
          ready: true,
          strict_ready: false,
          checks: [
            { key: 'chapter_blueprint', ok: false, severity: 'high' },
            { key: 'worldbuilding', ok: false, severity: 'high' },
          ],
          warnings: ['章节蓝图与世界观需 staged repair'],
          blockers: [],
        },
      },
      repairedContextPackageOverride: {
        preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
      },
      requireStagedContextCandidates: true,
      storyStatePayload: {
        state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] },
        character_updates: [],
        setting_updates: [{
          name: '江澈',
          entity_type: 'character',
          state_delta: { location: '指挥频道入口' },
          actual_state_change: { location: '指挥频道入口' },
        }],
        storyline_updates: [],
      },
    })
    const beforeWorldbuilding = await listNovelWorldbuilding(harness.workspace, harness.project.id)
    const beforeSettings = await listNovelSettingEntities(harness.workspace, harness.project.id)

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      quality_threshold: 78,
      auto_repair_quality_gate: true,
      auto_repair_missing_material: true,
      allow_incomplete: true,
    })
    const storedChapter = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
    const storedWorldbuilding = await listNovelWorldbuilding(harness.workspace, harness.project.id)
    const storedSettings = await listNovelSettingEntities(harness.workspace, harness.project.id)
    const storedUsage = await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id)
    const storedProject = await getNovelProject(harness.workspace, harness.project.id)
    const stagedCharacterSetting = storedSettings.find(setting => setting.name === '江澈' && setting.entity_type === 'character')
    const stagedCharacterUsage = storedUsage.find(usage => usage.entity_id === stagedCharacterSetting?.id)

    expect(result.chapter?.chapter_text).toBe(storedChapter?.chapter_text)
    expect(storedChapter?.raw_payload?.unattended_blueprint_repair_summary).toBeTruthy()
    expect(storedWorldbuilding).toHaveLength(beforeWorldbuilding.length + 1)
    expect(storedSettings.length).toBeGreaterThan(beforeSettings.length)
    expect(storedUsage.length).toBeGreaterThan(0)
    expect(storedUsage.every(usage => storedSettings.some(setting => setting.id === usage.entity_id))).toBe(true)
    expect(stagedCharacterSetting?.state_json).toMatchObject({ location: '指挥频道入口' })
    expect(stagedCharacterUsage?.actual_state_change).toMatchObject({ location: '指挥频道入口' })
    expect(harness.contextInputs[1].settings.some((setting: any) => setting.id < 0)).toBe(true)
    expect(harness.contextInputs[1].chapterSettingUsage.some((usage: any) => usage.entity_id < 0)).toBe(true)
    expect(harness.contextInputs[1]).toMatchObject({
      settings: expect.arrayContaining([expect.objectContaining({ id: expect.any(Number) })]),
      chapterSettingUsage: expect.arrayContaining([expect.objectContaining({ entity_id: expect.any(Number) })]),
    })
    expect(storedProject?.reference_config?.story_state?.last_updated_chapter).toBe(harness.chapter.chapter_no)
    expect(harness.commitOrder).toEqual(['commit', 'memory'])
  })

  test('pending Story State commits only prose, version, and safe reviews when preflight staged mutations exist', async () => {
    const finalText = buildPipelineProse('江澈撞开铁门，追兵被迫后撤。', '主动夺下通讯器并推进追击')
    const harness = await createProsePipelineHarness(createNovelWritingService, {
      draftText: finalText,
      qualityGateEnabled: false,
      reviewPayloads: Array.from({ length: 4 }, acceptedQualityReviewPayload),
      contextPackageOverride: {
        preflight: {
          ready: true,
          strict_ready: false,
          checks: [{ key: 'chapter_blueprint', ok: false, severity: 'high' }, { key: 'worldbuilding', ok: false, severity: 'high' }],
          warnings: ['需要 staged repair'],
          blockers: [],
        },
      },
      repairedContextPackageOverride: { preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] } },
      requireStagedContextCandidates: true,
      storyStatePayload: { state_delta: {} },
    })
    const before = JSON.stringify({
      project: await getNovelProject(harness.workspace, harness.project.id),
      worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
    })

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      target_word_count: 1000,
      auto_repair_missing_material: true,
      allow_incomplete: true,
    })
    const after = JSON.stringify({
      project: await getNovelProject(harness.workspace, harness.project.id),
      worldbuilding: await listNovelWorldbuilding(harness.workspace, harness.project.id),
      characters: await listNovelCharacters(harness.workspace, harness.project.id),
      settings: await listNovelSettingEntities(harness.workspace, harness.project.id),
      usage: await listNovelChapterSettingUsage(harness.workspace, harness.project.id, harness.chapter.id),
    })

    expect(result.story_state_status).toBe('pending')
    expect(after).toBe(before)
    expect((await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)?.chapter_text).toBe(normalizeProseForStorage(finalText))
    expect(await listChapterVersions(harness.workspace, harness.chapter.id)).toEqual([
      expect.objectContaining({ source: expect.any(String) }),
    ])
    expect((await listNovelReviews(harness.workspace, harness.project.id)).some(review => review.review_type === 'unattended_preflight_repair')).toBe(false)
  })

  test('manual story-state update applies soft planned-delta misses and deterministic fallback unblocks invalid payload', async () => {
    const project = await createNovelProject(workspace, {
      title: '状态机回退测试',
      genre: '仙侠',
      status: 'draft',
      reference_config: { story_state: { last_updated_chapter: 10, open_questions: ['旧问题'] } },
    } as any)
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 11,
      title: '山路截杀',
      chapter_goal: '第一场移动战',
      chapter_summary: '江哲离开熟悉地点',
      ending_hook: '截杀者带着主角熟悉却变形的知识。',
      chapter_text: '江哲冲出山路，截杀者的刀光贴着耳际掠过。',
      status: 'draft',
    } as any)

    // soft miss only: valid state_delta but missing planned character change
    const softPrepared: any = {
      state_delta: {
        open_questions: ['下一章追查截杀者'],
        next_chapter_priorities: ['接住山路截杀的钩子'],
        progress_summary: { notes: '第11章已完成' },
      },
      next_reference_config: {
        ...(project.reference_config || {}),
        story_state: {
          ...(project.reference_config?.story_state || {}),
          open_questions: ['下一章追查截杀者'],
          next_chapter_priorities: ['接住山路截杀的钩子'],
          progress_summary: { notes: '第11章已完成' },
          last_updated_chapter: 11,
        },
      },
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: {
        character_state_delta_sync: { missed: [{ name: '江哲', text: '主角' }], planned_count: 1, recorded_count: 0 },
        asset_state_delta_sync: { missed: [], planned_count: 0, recorded_count: 0 },
        chapter_handoff_delta_sync: { missed: [], planned_count: 0, recorded_count: 0 },
        timeline_delta_sync: { missed: [], planned_count: 0, recorded_count: 0 },
        state_delta_completeness: { planned_count: 0, missed_count: 0, missed: [], blocking_missed: [] },
      },
      hard_failures: [{
        key: 'character_state_delta_sync',
        message: '本章计划的关键状态变化未记录：character_state_delta_sync',
        source: 'story_state',
        details: [{ name: '江哲', text: '主角' }],
      }],
      payload: {
        state_delta: {
          open_questions: ['下一章追查截杀者'],
          next_chapter_priorities: ['接住山路截杀的钩子'],
          progress_summary: { notes: '第11章已完成' },
        },
      },
    }
    const softService = createService({ parsed: softPrepared.payload, finish_reason: 'stop' })
    const softPayload = await softService.updateStoryStateMachine(
      workspace,
      project,
      chapter,
      { chapter_target: { state_tracking_contract: { character_states: [{ name: '江哲', text: '主角' }] } } },
      String(chapter.chapter_text || ''),
      217,
      { prepared: softPrepared },
    )
    expect(softPayload.story_state_applied_with_warnings).toBe(true)
    expect(softPayload.soft_hard_failures?.length).toBeGreaterThan(0)
    let fresh = await getNovelProject(workspace, project.id)
    expect(Number(fresh?.reference_config?.story_state?.last_updated_chapter || 0)).toBe(11)

    // invalid payload: update path retries then falls back deterministically
    let calls = 0
    const fallbackService = createNovelWritingService({
      getProject: async () => null,
      production: { getStageModelId: () => 217, getStageTemperature: (_p: any, _s: string, f: number) => f } as any,
      reference: {} as any,
      runtime: {
        executeAgent: async () => {
          calls += 1
          return { parsed: { state_delta: {} }, finish_reason: 'stop' }
        },
      },
    })
    await updateNovelProject(workspace, project.id, {
      reference_config: { story_state: { last_updated_chapter: 10, open_questions: ['旧问题'] } },
    } as any)
    const latestProject = await getNovelProject(workspace, project.id)
    const payload = await fallbackService.updateStoryStateMachine(
      workspace,
      latestProject,
      chapter,
      {},
      String(chapter.chapter_text || ''),
      217,
    )
    expect(calls).toBe(2)
    expect(payload.story_state_deterministic_fallback).toBe(true)
    fresh = await getNovelProject(workspace, project.id)
    expect(Number(fresh?.reference_config?.story_state?.last_updated_chapter || 0)).toBe(11)
    expect(Array.isArray(fresh?.reference_config?.story_state?.open_questions)).toBe(true)
    expect(String(fresh?.reference_config?.story_state?.open_questions?.[0] || '')).toContain('截杀者')
  })

})
