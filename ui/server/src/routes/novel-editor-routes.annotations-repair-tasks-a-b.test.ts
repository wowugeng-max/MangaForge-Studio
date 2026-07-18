import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
    'builders-annotations-prose-quality.ts',
    'builders-annotations-prose-quality-types.ts',
    'builders-annotations-prose-quality-core.ts',
    'builders-annotations-prose-quality-craft.ts',
    'builders-annotations-prose-quality-audience.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('review annotations delivery risk repair tasks a b', () => {
  test('turns emotional arc misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 52,
        review_type: 'prose_quality',
        summary: '情绪弧存在缺口',
        created_at: '2026-06-08T03:24:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              emotional_arc_checks: [
                {
                  key: 'pressure_release',
                  label: '压迫释放弧',
                  status: 'fail',
                  evidence: '开场压迫后直接解释规则，没有写出调动、反制和爽感释放。',
                  fix: '把压迫落到现场选择，用动作和对白完成反制，再给旁观反馈。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const emotionalArcAnnotation = annotations.find((item: any) => item.category === 'emotional_arc')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(emotionalArcAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '情绪弧',
      kind: 'emotional_arc_gap',
      title: '情绪弧缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(emotionalArcAnnotation?.message).toContain('没有写出调动、反制和爽感释放')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('emotional_arc_gap')
    expect(result.tasks[0].annotation_category).toBe('emotional_arc')
    expect(result.tasks[0].emotional_arc_sync.missed[0].text).toContain('调动、反制和爽感释放')
    expect(result.tasks[0].acceptance_criteria).toContain('emotional_arc_checks 复检通过，missed_count=0')
  })

  test('turns chapter hook misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 53,
        review_type: 'prose_quality',
        summary: '章级钩子存在缺口',
        created_at: '2026-06-08T03:25:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              chapter_hook_checks: [
                {
                  key: 'ending_page_turn',
                  label: '章尾翻页钩子',
                  status: 'warn',
                  evidence: '最后一幕只写封条异常，没有形成具体翻页问题或下一章压力。',
                  fix: '把封条异常落到未揭身份和立即到来的选择压力上。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const chapterHookAnnotation = annotations.find((item: any) => item.category === 'chapter_hook')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(chapterHookAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章级钩子',
      kind: 'chapter_hook_gap',
      title: '章级钩子缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(chapterHookAnnotation?.message).toContain('没有形成具体翻页问题')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('chapter_hook_gap')
    expect(result.tasks[0].annotation_category).toBe('chapter_hook')
    expect(result.tasks[0].chapter_hook_sync.missed[0].text).toContain('具体翻页问题')
    expect(result.tasks[0].acceptance_criteria).toContain('chapter_hook_checks 复检通过，missed_count=0')
  })

  test('turns paragraph hook misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 54,
        review_type: 'prose_quality',
        summary: '段落级钩子存在缺口',
        created_at: '2026-06-08T03:26:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              paragraph_hook_checks: [
                {
                  key: 'micro_hook_stall',
                  label: '段落微推进',
                  status: 'fail',
                  evidence: '连续六段只写环境和站位，没有信息、风险、情绪或关系变化。',
                  fix: '加入暗牌、倒计时或对话压迫，让每3-5段产生可见变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const paragraphHookAnnotation = annotations.find((item: any) => item.category === 'paragraph_hook')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(paragraphHookAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '段落级钩子',
      kind: 'paragraph_hook_gap',
      title: '段落级钩子缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(paragraphHookAnnotation?.message).toContain('没有信息、风险、情绪或关系变化')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('paragraph_hook_gap')
    expect(result.tasks[0].annotation_category).toBe('paragraph_hook')
    expect(result.tasks[0].paragraph_hook_sync.missed[0].text).toContain('连续六段')
    expect(result.tasks[0].acceptance_criteria).toContain('paragraph_hook_checks 复检通过，missed_count=0')
  })

  test('turns suspense misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 55,
        review_type: 'prose_quality',
        summary: '悬念编排存在缺口',
        created_at: '2026-06-08T03:27:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              suspense_checks: [
                {
                  key: 'question_misdirect_answer',
                  label: '疑问误导答案循环',
                  status: 'fail',
                  evidence: '正文只抛出封条异常，没有给可信误导、局部答案或新期待。',
                  fix: '先提出谁换封条的问题，再给假提示，章末公布一片答案并立起新问题。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const suspenseAnnotation = annotations.find((item: any) => item.category === 'suspense')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(suspenseAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '悬念编排',
      kind: 'suspense_gap',
      title: '悬念编排缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(suspenseAnnotation?.message).toContain('没有给可信误导')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('suspense_gap')
    expect(result.tasks[0].annotation_category).toBe('suspense')
    expect(result.tasks[0].suspense_sync.missed[0].text).toContain('可信误导')
    expect(result.tasks[0].acceptance_criteria).toContain('suspense_checks 复检通过，missed_count=0')
  })

  test('turns asset linkage misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 56,
        review_type: 'prose_quality',
        summary: '资产挂钩存在缺口',
        created_at: '2026-06-08T03:29:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              asset_linkage_checks: [
                {
                  key: 'isolated_assets',
                  label: '孤立资产',
                  status: 'fail',
                  evidence: '旧钥匙只被点名，没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。',
                  fix: '让旧钥匙触发暗格并带来锁死代价。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const assetAnnotation = annotations.find((item: any) => item.category === 'asset_linkage')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(assetAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '资产挂钩',
      kind: 'asset_linkage_gap',
      title: '资产挂钩缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(assetAnnotation?.message).toContain('旧钥匙只被点名')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('asset_linkage_gap')
    expect(result.tasks[0].annotation_category).toBe('asset_linkage')
    expect(result.tasks[0].asset_linkage_sync.missed[0].text).toContain('旧钥匙')
    expect(result.tasks[0].acceptance_criteria).toContain('asset_linkage_checks 复检通过，missed_count=0')
  })

  test('turns dialogue misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 57,
        review_type: 'prose_quality',
        summary: '对白质量存在缺口',
        created_at: '2026-06-08T03:31:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              dialogue_checks: [
                {
                  key: 'subtext_agenda',
                  label: '潜台词与议程',
                  status: 'fail',
                  evidence: '周薄森直接解释真实目的，整段对白像说明书，没有权力博弈或信息差。',
                  fix: '把真实目的改成借口、试探、回避和动作反应，让短句方成为权力上位。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const dialogueAnnotation = annotations.find((item: any) => item.category === 'dialogue')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(dialogueAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '对白质量',
      kind: 'dialogue_gap',
      title: '对白质量缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(dialogueAnnotation?.message).toContain('说明书')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('dialogue_gap')
    expect(result.tasks[0].annotation_category).toBe('dialogue')
    expect(result.tasks[0].dialogue_sync.missed[0].text).toContain('周薄森')
    expect(result.tasks[0].acceptance_criteria).toContain('dialogue_checks 复检通过，missed_count=0')
  })

  test('turns plot dynamics misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 58,
        review_type: 'prose_quality',
        summary: '剧情动力存在缺口',
        created_at: '2026-06-08T03:33:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              plot_dynamics_checks: [
                {
                  key: 'goal_obstacle_action_feedback',
                  label: '剧情闭环',
                  status: 'fail',
                  evidence: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
                  fix: '先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const plotAnnotation = annotations.find((item: any) => item.category === 'plot_dynamics')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(plotAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '剧情动力',
      kind: 'plot_dynamics_gap',
      title: '剧情动力缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(plotAnnotation?.message).toContain('红色阀门')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('plot_dynamics_gap')
    expect(result.tasks[0].annotation_category).toBe('plot_dynamics')
    expect(result.tasks[0].plot_dynamics_sync.missed[0].text).toContain('红色阀门')
    expect(result.tasks[0].acceptance_criteria).toContain('plot_dynamics_checks 复检通过，missed_count=0')
  })

  test('turns character relation misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 59,
        review_type: 'prose_quality',
        summary: '角色关系存在缺口',
        created_at: '2026-06-08T03:35:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              character_relation_checks: [
                {
                  key: 'goal_ownership',
                  label: '目标归属',
                  status: 'fail',
                  evidence: '主角只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
                  fix: '把旧案改成会影响主角阵盘资格的风险，让主角主动押上名额交换线索。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const relationAnnotation = annotations.find((item: any) => item.category === 'character_relation')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(relationAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '角色关系',
      kind: 'character_relation_gap',
      title: '角色关系缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(relationAnnotation?.message).toContain('帮林栖雨')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('character_relation_gap')
    expect(result.tasks[0].annotation_category).toBe('character_relation')
    expect(result.tasks[0].character_relation_sync.missed[0].text).toContain('主角只是在帮林栖雨')
    expect(result.tasks[0].acceptance_criteria).toContain('character_relation_checks 复检通过，missed_count=0')
  })

  test('turns character behavior misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 60,
        review_type: 'prose_quality',
        summary: '角色行为存在缺口',
        created_at: '2026-06-08T03:37:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              character_behavior_checks: [
                {
                  key: 'motivation_specificity',
                  label: '动机具体性',
                  status: 'fail',
                  evidence: '主角只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
                  fix: '把动机改成阵盘资格被夺的具体事件，并补主角为母亲旧约承担代价的情感理由。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const behaviorAnnotation = annotations.find((item: any) => item.category === 'character_behavior')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(behaviorAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '角色行为',
      kind: 'character_behavior_gap',
      title: '角色行为缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(behaviorAnnotation?.message).toContain('只是想变强')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('character_behavior_gap')
    expect(result.tasks[0].annotation_category).toBe('character_behavior')
    expect(result.tasks[0].character_behavior_sync.missed[0].text).toContain('主角只是想变强')
    expect(result.tasks[0].acceptance_criteria).toContain('character_behavior_checks 复检通过，missed_count=0')
  })

  test('turns conflict structure misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '第三枚封条', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 61,
        review_type: 'prose_quality',
        summary: '冲突结构存在缺口',
        created_at: '2026-06-08T03:39:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          score: 84,
          passed: true,
          self_check: {
            review: {
              conflict_structure_checks: [
                {
                  key: 'no_exit_stakes',
                  label: '有进无出',
                  status: 'fail',
                  evidence: '主角可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
                  fix: '让内门执事封门并押上阵盘资格，必须完成账本核验才能脱身。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const conflictAnnotation = annotations.find((item: any) => item.category === 'conflict_structure')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(conflictAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '冲突结构',
      kind: 'conflict_structure_gap',
      title: '冲突结构缺口 1',
      chapter_id: 7,
      chapter_no: 3,
    })
    expect(conflictAnnotation?.message).toContain('随时离开账房')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('conflict_structure_gap')
    expect(result.tasks[0].annotation_category).toBe('conflict_structure')
    expect(result.tasks[0].conflict_structure_sync.missed[0].text).toContain('主角可以随时离开账房')
    expect(result.tasks[0].acceptance_criteria).toContain('conflict_structure_checks 复检通过，missed_count=0')
  })

  test('turns opening misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 1, title: '阵师归来', chapter_text: '正文', ending_hook: '第三枚封条指向内门供词。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 62,
        review_type: 'prose_quality',
        summary: '开篇设计存在缺口',
        created_at: '2026-06-08T03:41:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 1,
          score: 84,
          passed: true,
          self_check: {
            review: {
              opening_checks: [
                {
                  key: 'protagonist_entry_delay',
                  label: '300字主角登场',
                  status: 'fail',
                  evidence: '开头连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
                  fix: '第一段直接让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const openingAnnotation = annotations.find((item: any) => item.category === 'opening')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(openingAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '开篇设计',
      kind: 'opening_gap',
      title: '开篇设计缺口 1',
      chapter_id: 7,
      chapter_no: 1,
    })
    expect(openingAnnotation?.message).toContain('宗门天气')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('opening_gap')
    expect(result.tasks[0].annotation_category).toBe('opening')
    expect(result.tasks[0].opening_sync.missed[0].text).toContain('主角第900字才出现')
    expect(result.tasks[0].acceptance_criteria).toContain('opening_checks 复检通过，missed_count=0')
  })

  test('turns bridge unit misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧城会审', chapter_text: '正文', ending_hook: '赤炉城供奉递来新契。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 63,
        review_type: 'prose_quality',
        summary: '桥段节奏存在缺口',
        created_at: '2026-06-08T03:42:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              bridge_unit_checks: [
                {
                  key: 'expectation_chain_break',
                  label: '连续期待',
                  status: 'fail',
                  evidence: '旧城会审兑现旧期待后直接散场，章尾没有新目标，也没有高潮中埋钩子。',
                  fix: '兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const bridgeAnnotation = annotations.find((item: any) => item.category === 'bridge_unit')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(bridgeAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '桥段节奏',
      kind: 'bridge_unit_gap',
      title: '桥段节奏缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(bridgeAnnotation?.message).toContain('直接散场')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('bridge_unit_gap')
    expect(result.tasks[0].annotation_category).toBe('bridge_unit')
    expect(result.tasks[0].bridge_unit_sync.missed[0].text).toContain('章尾没有新目标')
    expect(result.tasks[0].acceptance_criteria).toContain('bridge_unit_checks 复检通过，missed_count=0')
  })

})
