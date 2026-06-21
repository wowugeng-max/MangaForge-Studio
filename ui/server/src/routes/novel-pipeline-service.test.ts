import { describe, expect, test } from 'bun:test'
import { buildNovelPipelineSummary } from './novel-pipeline-service'

describe('novel pipeline summary', () => {
  const fullWritingBible = {
    reader_promise: '每章都有破局爽点',
    protagonist_drive: '少年必须夺回被夺走的火种。',
    current_volume_goal: '进入大荒门',
    core_conflict: '旧规与新火的冲突',
    innovation_hook: '用符火审案，把修仙升级写成破局推理。',
    first30_plan: '前三十章完成入门、立敌、第一次公开破局。',
    longform_capacity: '以九卷大荒门派和火种谜团支撑百万字推进。',
  }
  const worldbuilding = [{ id: 1, world_summary: '大荒门以符火和旧规约束修行者。' }]
  const characters = [{ id: 1, name: '丁松言', goal: '夺回火种。' }]
  const acceptedChapter = {
    id: 11,
    project_id: 1,
    chapter_no: 1,
    title: '荒门初开',
    chapter_goal: '主角第一次破局。',
    chapter_summary: '主角入门。',
    conflict: '旧规压迫。',
    ending_hook: '荒门背后亮起血字。',
    chapter_text: '正文'.repeat(1200),
  }
  const acceptedProject = {
    id: 1,
    title: '剑烛大荒',
    synopsis: '少年入荒。',
    reference_config: {
      writing_bible: { ...fullWritingBible },
      story_state: { last_updated_chapter: 1 },
    },
  }
  const acceptedOutlines = [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }]
  const acceptedReviews = [
    {
      id: 99,
      project_id: 1,
      chapter_id: 11,
      review_type: 'prose_quality',
      status: 'completed',
      payload: JSON.stringify({ score: 86, passed: true }),
      created_at: '2026-06-21T00:00:00.000Z',
    },
    {
      id: 100,
      project_id: 1,
      chapter_id: 11,
      review_type: 'editor_report',
      status: 'completed',
      payload: JSON.stringify({ status: 'accepted', issues: [] }),
      created_at: '2026-06-21T00:01:00.000Z',
    },
  ]

  test('blocks at creation contract when the writing bible is missing', () => {
    const summary = buildNovelPipelineSummary({
      project: { id: 1, title: '剑烛大荒', synopsis: '', reference_config: {} },
      chapters: [],
      outlines: [],
      worldbuilding: [],
      characters: [],
      reviews: [],
      runs: [],
    })

    expect(summary.current_stage).toBe('creation_contract')
    expect(summary.primary_action.key).toBe('open_writing_bible')
    expect(summary.stages[0]).toMatchObject({
      key: 'creation_contract',
      status: 'blocked',
    })
    expect(summary.stages[0].checks.some(check => check.status === 'blocked')).toBe(true)
  })

  test('keeps creation contract blocked until hard contract fields are present and exposes agent steps', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: {
            reader_promise: '每章都有破局爽点',
            current_volume_goal: '进入大荒门',
            core_conflict: '旧规与新火的冲突',
          },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
        },
      ],
      outlines: [],
      worldbuilding: [],
      characters: [],
      reviews: [],
      runs: [],
    })

    const creation = summary.stages.find(stage => stage.key === 'creation_contract')

    expect(summary.current_stage).toBe('creation_contract')
    expect(summary.primary_action.key).toBe('open_writing_bible')
    expect(creation?.checks.find(check => check.key === 'protagonist_drive')?.status).toBe('blocked')
    expect(creation?.checks.find(check => check.key === 'innovation_hook')?.status).toBe('warning')
    expect(creation?.agent_steps.map(step => step.key)).toEqual([
      'writing_bible_contract',
      'market_positioning',
    ])
  })

  test('keeps planning blocked when chapter plan exists but world anchor is missing', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: { ...fullWritingBible },
          story_state: { last_updated_chapter: 0 },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
          chapter_summary: '主角入门。',
          conflict: '旧规压迫。',
          ending_hook: '荒门背后亮起血字。',
          raw_payload: { pre_draft_brief: { ready: true }, scene_cards: [{ title: '入门受阻' }] },
        },
      ],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      worldbuilding: [],
      characters,
      reviews: [],
      runs: [],
    })

    const planning = summary.stages.find(stage => stage.key === 'planning_ready')

    expect(summary.current_stage).toBe('planning_ready')
    expect(summary.primary_action.key).toBe('enter_story_planning')
    expect(planning?.checks.find(check => check.key === 'world_anchor')?.status).toBe('blocked')
  })


  test('moves to chapter writing when the contract and chapter plan are ready', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: {
            ...fullWritingBible,
          },
          story_state: { last_updated_chapter: 0 },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
          chapter_summary: '主角入门。',
          conflict: '旧规压迫。',
          ending_hook: '荒门背后亮起血字。',
          raw_payload: { pre_draft_brief: { ready: true }, scene_cards: [{ title: '入门受阻' }] },
        },
      ],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      worldbuilding,
      characters,
      reviews: [],
      runs: [],
    })

    expect(summary.current_stage).toBe('chapter_writing')
    expect(summary.primary_action.key).toBe('confirm_plan_and_write_draft')
    expect(summary.stages.find(stage => stage.key === 'chapter_writing')?.status).toBe('active')
  })

  test('moves to delivery acceptance when the next chapter has prose but lacks current quality review', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: {
            ...fullWritingBible,
          },
          story_state: { last_updated_chapter: 0 },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
          chapter_summary: '主角入门。',
          conflict: '旧规压迫。',
          ending_hook: '荒门背后亮起血字。',
          chapter_text: '正文'.repeat(1200),
        },
      ],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      worldbuilding,
      characters,
      reviews: [],
      runs: [],
    })

    expect(summary.current_stage).toBe('delivery_acceptance')
    expect(summary.primary_action.key).toBe('refresh_current_quality')
    expect(summary.stages.find(stage => stage.key === 'delivery_acceptance')?.status).toBe('active')
  })

  test('opens batch scaling after the current chapter quality and story state are accepted', () => {
    const summary = buildNovelPipelineSummary({
      project: acceptedProject,
      chapters: [acceptedChapter],
      outlines: acceptedOutlines,
      worldbuilding,
      characters,
      reviews: acceptedReviews,
      runs: [],
    })

    expect(summary.current_stage).toBe('batch_scaling')
    expect(summary.primary_action.key).toBe('start_safe_batch')
    expect(summary.stages.find(stage => stage.key === 'delivery_acceptance')?.status).toBe('done')
  })

  test('does not count longform repair runs as successful safe-batch evidence', () => {
    const summary = buildNovelPipelineSummary({
      project: acceptedProject,
      chapters: [acceptedChapter],
      outlines: acceptedOutlines,
      worldbuilding,
      characters,
      reviews: acceptedReviews,
      runs: [
        {
          id: 301,
          project_id: 1,
          run_type: 'longform_production_repair',
          step_name: 'repair',
          status: 'success',
          output_ref: JSON.stringify({ tasks: [{ task_status: 'resolved' }] }),
          created_at: '2026-06-21T01:00:00.000Z',
        },
      ],
    })

    const batch = summary.stages.find(stage => stage.key === 'batch_scaling')

    expect(summary.current_stage).toBe('batch_scaling')
    expect(summary.primary_action.key).toBe('start_safe_batch')
    expect(batch?.checks.find(check => check.key === 'batch_record')?.status).toBe('warning')
  })

  test('keeps batch scaling focused on repair when a safe-batch run has open repair tasks', () => {
    const summary = buildNovelPipelineSummary({
      project: acceptedProject,
      chapters: [acceptedChapter],
      outlines: acceptedOutlines,
      worldbuilding,
      characters,
      reviews: acceptedReviews,
      runs: [
        {
          id: 302,
          project_id: 1,
          run_type: 'batch_generate_prose',
          step_name: 'safe-batch',
          status: 'success',
          output_ref: JSON.stringify({ chapters: [{ chapter_no: 2, status: 'success' }] }),
          created_at: '2026-06-21T01:00:00.000Z',
        },
        {
          id: 303,
          project_id: 1,
          run_type: 'longform_production_repair',
          step_name: 'batch-repair',
          status: 'ready',
          output_ref: JSON.stringify({
            tasks: [
              { issue_type: 'reader_pull_missed', task_status: 'open' },
              { issue_type: 'core_drift', task_status: 'resolved' },
            ],
          }),
          created_at: '2026-06-21T01:05:00.000Z',
        },
      ],
    })

    const batch = summary.stages.find(stage => stage.key === 'batch_scaling')

    expect(summary.current_stage).toBe('batch_scaling')
    expect(summary.primary_action.key).toBe('open_longform_governance')
    expect(batch?.checks.find(check => check.key === 'repair_queue')?.status).toBe('blocked')
  })

  test('moves to serial governance when safe-batch evidence is clean and exposes governance checks', () => {
    const summary = buildNovelPipelineSummary({
      project: acceptedProject,
      chapters: [acceptedChapter],
      outlines: acceptedOutlines,
      worldbuilding,
      characters,
      reviews: [
        ...acceptedReviews,
        {
          id: 201,
          project_id: 1,
          chapter_id: 11,
          review_type: 'longform_production_repair_audit',
          status: 'completed',
          payload: JSON.stringify({ status: 'closed' }),
          created_at: '2026-06-21T01:10:00.000Z',
        },
      ],
      runs: [
        {
          id: 304,
          project_id: 1,
          run_type: 'batch_generate_prose',
          step_name: 'safe-batch',
          status: 'success',
          output_ref: JSON.stringify({ chapters: [{ chapter_no: 2, status: 'success' }] }),
          created_at: '2026-06-21T01:00:00.000Z',
        },
      ],
    })

    const governance = summary.stages.find(stage => stage.key === 'serial_governance')

    expect(summary.current_stage).toBe('serial_governance')
    expect(summary.primary_action.key).toBe('open_longform_governance')
    expect(governance?.checks.find(check => check.key === 'trend_review')?.status).toBe('pass')
    expect(governance?.checks.find(check => check.key === 'repair_queue')?.status).toBe('pass')
  })

  test('requires an editor report before a written chapter can be accepted', () => {
    const chapter = {
      id: 11,
      project_id: 1,
      chapter_no: 1,
      title: '荒门初开',
      chapter_goal: '主角第一次破局。',
      chapter_summary: '主角入门。',
      conflict: '旧规压迫。',
      ending_hook: '荒门背后亮起血字。',
      chapter_text: '正文'.repeat(1200),
    }
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: { ...fullWritingBible },
          story_state: { last_updated_chapter: 1 },
        },
      },
      chapters: [chapter],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      worldbuilding,
      characters,
      reviews: [
        {
          id: 99,
          project_id: 1,
          chapter_id: 11,
          review_type: 'prose_quality',
          status: 'completed',
          payload: JSON.stringify({ score: 86, passed: true }),
          created_at: '2026-06-21T00:00:00.000Z',
        },
      ],
      runs: [],
    })

    const delivery = summary.stages.find(stage => stage.key === 'delivery_acceptance')

    expect(summary.current_stage).toBe('delivery_acceptance')
    expect(summary.primary_action.key).toBe('create_editor_report')
    expect(delivery?.checks.find(check => check.key === 'editor_report')?.status).toBe('blocked')
  })

  test('lists the delivery acceptance agent sequence after a draft exists', () => {
    const summary = buildNovelPipelineSummary({
      project: {
        id: 1,
        title: '剑烛大荒',
        synopsis: '少年入荒。',
        reference_config: {
          writing_bible: { ...fullWritingBible },
          story_state: { last_updated_chapter: 0 },
        },
      },
      chapters: [
        {
          id: 11,
          project_id: 1,
          chapter_no: 1,
          title: '荒门初开',
          chapter_goal: '主角第一次破局。',
          chapter_summary: '主角入门。',
          conflict: '旧规压迫。',
          ending_hook: '荒门背后亮起血字。',
          chapter_text: '正文'.repeat(1200),
        },
      ],
      outlines: [{ id: 1, project_id: 1, outline_type: 'chapter', title: '荒门初开', raw_payload: { chapter_no: 1 } }],
      worldbuilding,
      characters,
      reviews: [],
      runs: [],
    })

    const delivery = summary.stages.find(stage => stage.key === 'delivery_acceptance')

    expect(delivery?.agent_steps.map(step => step.key)).toEqual([
      'prose_quality_review',
      'editor_report',
      'editor_revision',
      'story_state_sync',
    ])
    expect(delivery?.agent_steps[0]).toMatchObject({
      agent: 'prose-quality',
      action_key: 'refresh_current_quality',
    })
  })
})
