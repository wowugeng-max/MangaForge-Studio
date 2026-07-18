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
describe('review annotations delivery risk repair tasks b a', () => {
  test('turns reversal misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印反证', chapter_text: '正文', ending_hook: '执事袖中的旧部印记暴露。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 64,
        review_type: 'prose_quality',
        summary: '反转设计存在缺口',
        created_at: '2026-06-08T03:43:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              reversal_checks: [
                {
                  key: 'setup_clues_missing',
                  label: '铺垫暗示',
                  status: 'fail',
                  evidence: '执事身份反转是揭示时才出现的新信息，前文没有3处公平暗示，揭示后只靠长解释说明。',
                  fix: '在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const reversalAnnotation = annotations.find((item: any) => item.category === 'reversal')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(reversalAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '反转设计',
      kind: 'reversal_gap',
      title: '反转设计缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(reversalAnnotation?.message).toContain('新信息')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('reversal_gap')
    expect(result.tasks[0].annotation_category).toBe('reversal')
    expect(result.tasks[0].reversal_sync.missed[0].text).toContain('没有3处公平暗示')
    expect(result.tasks[0].acceptance_criteria).toContain('reversal_checks 复检通过，missed_count=0')
  })

  test('turns showdown misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 65,
        review_type: 'prose_quality',
        summary: '高潮对抗存在缺口',
        created_at: '2026-06-08T03:44:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              showdown_checks: [
                {
                  key: 'payoff_release_missing',
                  label: '爽点释放',
                  status: 'fail',
                  evidence: '主角亮出旧印后执事没有受到对应压制，旁观者只统一震惊，底牌释放后没有新目标。',
                  fix: '让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const showdownAnnotation = annotations.find((item: any) => item.category === 'showdown')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(showdownAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '高潮对抗',
      kind: 'showdown_gap',
      title: '高潮对抗缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(showdownAnnotation?.message).toContain('没有受到对应压制')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('showdown_gap')
    expect(result.tasks[0].annotation_category).toBe('showdown')
    expect(result.tasks[0].showdown_sync.missed[0].text).toContain('旁观者只统一震惊')
    expect(result.tasks[0].acceptance_criteria).toContain('showdown_checks 复检通过，missed_count=0')
  })

  test('turns prose craft misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 66,
        review_type: 'prose_quality',
        summary: '正文工艺存在缺口',
        created_at: '2026-06-08T03:45:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              prose_craft_checks: [
                {
                  key: 'omniscient_crowd_camera',
                  label: '远景概括',
                  status: 'fail',
                  evidence: '高潮段连续写全场死寂、所有人震惊，没有主角深度限知，也没有身体细节或环境交互承接。',
                  fix: '改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const proseCraftAnnotation = annotations.find((item: any) => item.category === 'prose_craft')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(proseCraftAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文工艺',
      kind: 'prose_craft_gap',
      title: '正文工艺缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(proseCraftAnnotation?.message).toContain('全场死寂')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('prose_craft_gap')
    expect(result.tasks[0].annotation_category).toBe('prose_craft')
    expect(result.tasks[0].prose_craft_sync.missed[0].text).toContain('没有主角深度限知')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_craft_checks 复检通过，missed_count=0')
  })

  test('preserves scene-card directive prose craft checks as targeted repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 166,
        review_type: 'prose_quality',
        summary: '场景卡禁令执行失败',
        created_at: '2026-06-08T03:45:30.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              prose_craft_checks: [
                {
                  key: 'omniscient_crowd_camera',
                  label: '远景概括',
                  status: 'warn',
                  evidence: '高潮段仍有全场远景概括。',
                  fix: '改成主角深度限知和身体细节。',
                },
                {
                  key: 'scene_card_1_forbidden_directives',
                  label: '场景卡禁令执行',
                  status: 'fail',
                  evidence: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
                  fix: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const sceneCardDirectiveAnnotation = annotations.find((item: any) => item.kind === 'scene_card_1_forbidden_directives')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(sceneCardDirectiveAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文工艺',
      kind: 'scene_card_1_forbidden_directives',
      category: 'prose_craft',
      title: '正文工艺缺口 2',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(sceneCardDirectiveAnnotation?.message).toContain('不得用整段来历/等级解释蓝晶')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('scene_card_1_forbidden_directives')
    expect(result.tasks[0].annotation_category).toBe('prose_craft')
    expect(result.tasks[0].prose_craft_sync.key).toBe('scene_card_1_forbidden_directives')
    expect(result.tasks[0].prose_craft_sync.missed[1].fix).toContain('动作反应、对话半句、物理后果')
  })

  test('turns punctuation tone misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 67,
        review_type: 'prose_quality',
        summary: '语气标点存在缺口',
        created_at: '2026-06-08T03:46:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              punctuation_tone_checks: [
                {
                  key: 'ellipsis_dash_pause',
                  label: '硬停顿',
                  status: 'fail',
                  evidence: '执事质问连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号，角色声线和主角一样。',
                  fix: '改成执事话被审判木裂响打断，用短句和动作承接迟疑；爆发只保留一个情绪落点。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const punctuationToneAnnotation = annotations.find((item: any) => item.category === 'punctuation_tone')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(punctuationToneAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '语气标点',
      kind: 'punctuation_tone_gap',
      title: '语气标点缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(punctuationToneAnnotation?.message).toContain('你竟然')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('punctuation_tone_gap')
    expect(result.tasks[0].annotation_category).toBe('punctuation_tone')
    expect(result.tasks[0].punctuation_tone_sync.missed[0].text).toContain('爆发句乱用三个感叹号')
    expect(result.tasks[0].acceptance_criteria).toContain('punctuation_tone_checks 复检通过，missed_count=0')
  })

  test('turns content rubric misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 68,
        review_type: 'prose_quality',
        summary: '内容基准存在缺口',
        created_at: '2026-06-08T03:47:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              content_rubric_checks: [
                {
                  key: 'golden_three_questions',
                  label: '黄金三问',
                  status: 'fail',
                  evidence: '本章没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化，也缺少支持内容判断的正文证据。',
                  fix: '补旧印改变审判资格、长老席追查内库阵图的新期待，并用正文动作和对白证明变化。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const contentRubricAnnotation = annotations.find((item: any) => item.category === 'content_rubric')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(contentRubricAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '内容基准',
      kind: 'content_rubric_gap',
      title: '内容基准缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(contentRubricAnnotation?.message).toContain('为什么翻下一页')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('content_rubric_gap')
    expect(result.tasks[0].annotation_category).toBe('content_rubric')
    expect(result.tasks[0].content_rubric_sync.missed[0].text).toContain('局势没有可见变化')
    expect(result.tasks[0].acceptance_criteria).toContain('content_rubric_checks 复检通过，missed_count=0')
  })

  test('turns reader retention misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 69,
        review_type: 'prose_quality',
        summary: '追读雷达存在缺口',
        created_at: '2026-06-08T03:48:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              reader_retention_checks: [
                {
                  key: 'double_engine_hunger_missing',
                  label: '留存双引擎',
                  status: 'fail',
                  evidence: '本章有情绪爆发，但没有信息差植入问号，旧印来源和内库阵图线索一次性讲完，章尾没有追读饥饿。',
                  fix: '把旧印来源卡到章尾，只露出内库阵图半枚残印，给长老席追查的新问题和随机额外收获。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const readerRetentionAnnotation = annotations.find((item: any) => item.kind === 'reader_retention_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(readerRetentionAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '追读雷达',
      kind: 'reader_retention_gap',
      title: '追读雷达缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(readerRetentionAnnotation?.message).toContain('没有信息差植入问号')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('reader_retention_gap')
    expect(result.tasks[0].annotation_category).toBe('reader_retention')
    expect(result.tasks[0].reader_retention_check_sync.missed[0].text).toContain('章尾没有追读饥饿')
    expect(result.tasks[0].acceptance_criteria).toContain('reader_retention_checks 复检通过，missed_count=0')
  })

  test('turns target reader misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 70,
        review_type: 'prose_quality',
        summary: '目标读者存在缺口',
        created_at: '2026-06-08T03:49:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              target_reader_checks: [
                {
                  key: 'emotion_gap_missing',
                  label: '情绪缺口',
                  status: 'fail',
                  evidence: '目标读者画像只写年轻读者，缺核心痛苦、深层情结和未满足需求，本章旧印亮出后没有给尊严补偿。',
                  fix: '把被宗门轻视的核心痛苦写成审判现场压力，用旧印反证资格并给读者尊严回报。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const targetReaderAnnotation = annotations.find((item: any) => item.kind === 'target_reader_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(targetReaderAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '目标读者',
      kind: 'target_reader_gap',
      title: '目标读者缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(targetReaderAnnotation?.message).toContain('缺核心痛苦')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('target_reader_gap')
    expect(result.tasks[0].annotation_category).toBe('target_reader')
    expect(result.tasks[0].target_reader_sync.missed[0].text).toContain('没有给尊严补偿')
    expect(result.tasks[0].acceptance_criteria).toContain('target_reader_checks 复检通过，missed_count=0')
  })

  test('turns genre positioning misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 71,
        review_type: 'prose_quality',
        summary: '题材定位存在缺口',
        created_at: '2026-06-08T03:50:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              genre_positioning_checks: [
                {
                  key: 'core_hook_blurry',
                  label: '核心梗',
                  status: 'fail',
                  evidence: '本章挂阵修题材，但旧印只当普通信物使用，核心梗和阵法长板没有变成审判现场优势，书名简介承诺的阵师逆袭没有正文证据。',
                  fix: '把旧印改成阵法资格反证，围绕阵修长板扩出识阵、破阵、反制三处正文证据。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const genrePositioningAnnotation = annotations.find((item: any) => item.kind === 'genre_positioning_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(genrePositioningAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '题材定位',
      kind: 'genre_positioning_gap',
      title: '题材定位缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(genrePositioningAnnotation?.message).toContain('核心梗')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('genre_positioning_gap')
    expect(result.tasks[0].annotation_category).toBe('genre_positioning')
    expect(result.tasks[0].genre_positioning_sync.missed[0].text).toContain('书名简介承诺')
    expect(result.tasks[0].acceptance_criteria).toContain('genre_positioning_checks 复检通过，missed_count=0')
  })

  test('turns female audience misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 72,
        review_type: 'prose_quality',
        summary: '女频长篇存在缺口',
        created_at: '2026-06-08T03:51:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              female_audience_checks: [
                {
                  key: 'agency_and_security_missing',
                  label: '安全感与主动性',
                  status: 'fail',
                  evidence: '本章女主被长老安排着赢，缺少自己做决定的动作；旧印反转只打脸，没有安全感锚点、被珍视回馈和虐后反糖。',
                  fix: '改成女主主动亮出旧印并承担代价，让盟友公开站队给安全感反馈，章尾补一颗反转后的糖。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const femaleAudienceAnnotation = annotations.find((item: any) => item.kind === 'female_audience_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(femaleAudienceAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '女频长篇',
      kind: 'female_audience_gap',
      title: '女频长篇缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(femaleAudienceAnnotation?.message).toContain('被长老安排着赢')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('female_audience_gap')
    expect(result.tasks[0].annotation_category).toBe('female_audience')
    expect(result.tasks[0].female_audience_sync.missed[0].text).toContain('没有安全感锚点')
    expect(result.tasks[0].acceptance_criteria).toContain('female_audience_checks 复检通过，missed_count=0')
  })

  test('turns upgrade rhythm misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 73,
        review_type: 'prose_quality',
        summary: '升级节奏存在缺口',
        created_at: '2026-06-08T03:52:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 84,
          passed: true,
          self_check: {
            review: {
              upgrade_rhythm_checks: [
                {
                  key: 'feedback_and_threshold_missing',
                  label: '升级反馈与门槛',
                  status: 'fail',
                  evidence: '本章获得旧印后只有奖励，没有展示升级前情绪缺口、即时反馈、延迟反馈和新门槛；金手指触发条件和升级规则不清晰。',
                  fix: '补升级前被压制的情绪缺口，旧印即时改变审判资格，延迟引出更高门槛，并把金手指功能、触发、奖励和升级规则写成一眼能懂的动作反馈。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const upgradeRhythmAnnotation = annotations.find((item: any) => item.kind === 'upgrade_rhythm_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(upgradeRhythmAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '升级节奏',
      kind: 'upgrade_rhythm_gap',
      title: '升级节奏缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(upgradeRhythmAnnotation?.message).toContain('升级前情绪缺口')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('upgrade_rhythm_gap')
    expect(result.tasks[0].annotation_category).toBe('upgrade_rhythm')
    expect(result.tasks[0].upgrade_rhythm_sync.missed[0].text).toContain('即时反馈')
    expect(result.tasks[0].acceptance_criteria).toContain('upgrade_rhythm_checks 复检通过，missed_count=0')
  })

  test('turns chapter structure and progression misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 74,
        review_type: 'prose_quality',
        summary: '章节结构和推进存在缺口',
        created_at: '2026-06-08T03:53:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 81,
          passed: false,
          self_check: {
            review: {
              structure_checks: [
                {
                  key: 'missing_turning_structure',
                  label: '章节结构',
                  status: 'fail',
                  evidence: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
                  fix: '开头补具体异常，中段让旧印触发行动推进，局势从被审问变成反证成功，章尾落到新证人出现。',
                },
              ],
              progression_checks: [
                {
                  key: 'deletable_chapter',
                  label: '章节推进',
                  status: 'warn',
                  evidence: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
                  fix: '补本章不可删除的证据、选择、代价或关系变化，并压缩等待和复述段落。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const structureAnnotation = annotations.find((item: any) => item.kind === 'chapter_structure_gap')
    const progressionAnnotation = annotations.find((item: any) => item.kind === 'chapter_progression_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(structureAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章节结构',
      kind: 'chapter_structure_gap',
      title: '章节结构缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(progressionAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章节推进',
      kind: 'chapter_progression_gap',
      title: '章节推进缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['chapter_structure_gap', 'chapter_progression_gap'])
    expect(result.tasks[0].chapter_structure_sync.missed[0].text).toContain('开头没有钩子')
    expect(result.tasks[0].acceptance_criteria).toContain('structure_checks 复检通过，missed_count=0')
    expect(result.tasks[1].chapter_progression_sync.missed[0].text).toContain('删掉这章不影响理解')
    expect(result.tasks[1].acceptance_criteria).toContain('progression_checks 复检通过，missed_count=0')
  })

})
